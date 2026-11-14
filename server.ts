/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import {
  buildDonkiUpstreamUrl,
  type DonkiEndpointId,
  getArchivedSamplesForEndpoint,
  isValidDonkiEndpoint,
  normalizeDonkiApiResponse,
} from './src/game/donkiEndpoints.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const envPort = Number(process.env.PORT);
  if (Number.isFinite(envPort) && envPort > 0 && envPort !== 8080) {
    return envPort;
  }
  return 3000;
}

const PORT = resolvePort();
const IS_PROD = process.env.NODE_ENV === 'production';

interface DonkiCacheEntry {
  fetchedAt: number;
  mode: 'LIVE' | 'ARCHIVED';
  source: 'LIVE' | 'ARCHIVED';
  endpoint: DonkiEndpointId;
  fetchedDateRange: string;
  upstreamUrl: string;
  events: unknown[];
  note: string;
}

const donkiCache = new Map<string, DonkiCacheEntry>();
const DONKI_TTL_MS = 15 * 60 * 1000; // 15-minute cache to respect NASA DEMO_KEY rate limits

function loadArchivedDonki(endpoint: DonkiEndpointId = 'FLR'): DonkiCacheEntry {
  const upstreamUrl = `https://api.nasa.gov/DONKI/${endpoint}`;
  if (endpoint === 'FLR') {
    try {
      const raw = fs.readFileSync(path.join(__dirname, 'src/data/donkiEvents.json'), 'utf8');
      const parsed = JSON.parse(raw);
      return {
        fetchedAt: Date.now(),
        mode: 'ARCHIVED',
        source: 'ARCHIVED',
        endpoint,
        fetchedDateRange: '2024 Solar Cycle 25 Archive',
        upstreamUrl,
        events: Array.isArray(parsed.events) ? parsed.events : getArchivedSamplesForEndpoint('FLR'),
        note: 'Served from bundled real NASA DONKI historical archive.',
      };
    } catch {
      // fall through to built-in archived sample
    }
  }
  return {
    fetchedAt: Date.now(),
    mode: 'ARCHIVED',
    source: 'ARCHIVED',
    endpoint,
    fetchedDateRange: '2024 Solar Cycle 25 Archive',
    upstreamUrl,
    events: getArchivedSamplesForEndpoint(endpoint),
    note: `Served from bundled real NASA DONKI ${endpoint} historical archive.`,
  };
}

// Co-op & Classroom Room State (in-memory server-authoritative store)
interface RoomMember {
  socketId: string;
  name: string;
  role: 'Commander' | 'Engineer' | 'Botanist' | 'Life-Support Officer' | 'Teacher';
  lastDecision?: string;
}

interface ActiveVote {
  id: string;
  title: string;
  options: string[];
  votes: Record<string, string>;
}

interface CoopRoom {
  code: string;
  site: 'moon' | 'mars';
  difficulty: 'cadet' | 'astronaut' | 'commander';
  seed: number;
  paused: boolean;
  members: RoomMember[];
  decisionLog: Array<{ memberName: string; role: string; action: string; sol: number; timestamp: string }>;
  activeVote: ActiveVote | null;
}

const rooms = new Map<string, CoopRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: { origin: '*' },
    path: '/socket.io',
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: IS_PROD ? 'production' : 'development' });
  });

  // Server-side NASA DONKI Proxy supporting all 11 official DONKI endpoints with Caching & ARCHIVED Fallback
  app.get('/api/donki', async (req, res) => {
    const rawEndpoint = req.query.endpoint;
    const endpoint: DonkiEndpointId = isValidDonkiEndpoint(rawEndpoint) ? rawEndpoint : 'FLR';
    const requestedLive = req.query.live === '1' || req.query.live === 'true';

    if (!requestedLive) {
      return res.json(loadArchivedDonki(endpoint));
    }

    const cacheKey = `live_${endpoint}`;
    const cached = donkiCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < DONKI_TTL_MS) {
      return res.json(cached);
    }

    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const endDate = new Date();
    const lookbackDays = endpoint === 'FLR' ? 14 : 30;
    const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const startStr = fmt(startDate);
    const endStr = fmt(endDate);
    const upstreamUrl = buildDonkiUpstreamUrl(endpoint, startStr, endStr, apiKey);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const upstream = await fetch(upstreamUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (upstream.status === 429 || !upstream.ok) {
        const fallback = loadArchivedDonki(endpoint);
        fallback.note = `NASA DONKI ${endpoint} rate-limit/HTTP ${upstream.status}; safely fell back to ARCHIVED real data.`;
        return res.json(fallback);
      }

      const data = await upstream.json();
      const mapped = normalizeDonkiApiResponse(endpoint, data, 'LIVE');
      if (mapped.length === 0) {
        const fallback = loadArchivedDonki(endpoint);
        fallback.note = `No recent live ${endpoint} events in ${startStr}–${endStr}; showing ARCHIVED real NASA DONKI sample.`;
        return res.json(fallback);
      }

      const entry: DonkiCacheEntry = {
        fetchedAt: Date.now(),
        mode: 'LIVE',
        source: 'LIVE',
        endpoint,
        fetchedDateRange: `${startStr} to ${endStr}`,
        upstreamUrl: upstreamUrl.replace(encodeURIComponent(apiKey), 'DEMO_KEY'),
        events: mapped,
        note: `Live space weather fetched from NASA DONKI /${endpoint}.`,
      };
      donkiCache.set(cacheKey, entry);
      return res.json(entry);
    } catch {
      const fallback = loadArchivedDonki(endpoint);
      fallback.note = `Live NASA DONKI /${endpoint} unavailable right now; safely fell back to ARCHIVED real data.`;
      return res.json(fallback);
    }
  });

  // Socket.IO Co-op & Classroom Handler
  io.on('connection', (socket) => {
    socket.on('room:create', (payload: { name: string; role: RoomMember['role']; site: 'moon' | 'mars'; difficulty: 'cadet' | 'astronaut' | 'commander' }, cb) => {
      const code = generateRoomCode();
      const room: CoopRoom = {
        code,
        site: payload?.site || 'moon',
        difficulty: payload?.difficulty || 'astronaut',
        seed: Math.floor(Math.random() * 100000),
        paused: false,
        members: [{ socketId: socket.id, name: payload?.name || 'Commander 1', role: payload?.role || 'Commander' }],
        decisionLog: [],
        activeVote: null,
      };
      rooms.set(code, room);
      socket.join(code);
      if (typeof cb === 'function') cb({ ok: true, room });
      io.to(code).emit('room:update', room);
    });

    socket.on('room:join', (payload: { code: string; name: string; role: RoomMember['role'] }, cb) => {
      const code = String(payload?.code || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        if (typeof cb === 'function') cb({ ok: false, error: `Room "${code}" not found.` });
        return;
      }
      room.members = room.members.filter((m) => m.socketId !== socket.id);
      room.members.push({
        socketId: socket.id,
        name: payload?.name || `Cadet ${room.members.length + 1}`,
        role: payload?.role || 'Engineer',
      });
      socket.join(code);
      if (typeof cb === 'function') cb({ ok: true, room });
      io.to(code).emit('room:update', room);
    });

    socket.on('room:decision', (payload: { code: string; action: string; sol: number }) => {
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room) return;
      const member = room.members.find((m) => m.socketId === socket.id);
      if (!member) return;
      member.lastDecision = payload.action;
      room.decisionLog.unshift({
        memberName: member.name,
        role: member.role,
        action: payload.action,
        sol: payload.sol,
        timestamp: new Date().toLocaleTimeString(),
      });
      room.decisionLog = room.decisionLog.slice(0, 40);
      io.to(room.code).emit('room:update', room);
    });

    socket.on('room:vote_start', (payload: { code: string; title: string; options: string[] }) => {
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room) return;
      room.activeVote = {
        id: `vote_${Date.now()}`,
        title: payload.title,
        options: payload.options,
        votes: {},
      };
      io.to(room.code).emit('room:update', room);
    });

    socket.on('room:vote_cast', (payload: { code: string; option: string }) => {
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room || !room.activeVote) return;
      room.activeVote.votes[socket.id] = payload.option;
      io.to(room.code).emit('room:update', room);
    });

    socket.on('room:teacher_control', (payload: { code: string; paused?: boolean; site?: 'moon' | 'mars'; difficulty?: 'cadet' | 'astronaut' | 'commander' }) => {
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room) return;
      if (typeof payload.paused === 'boolean') room.paused = payload.paused;
      if (payload.site) room.site = payload.site;
      if (payload.difficulty) room.difficulty = payload.difficulty;
      io.to(room.code).emit('room:update', room);
      io.to(room.code).emit('room:control', payload);
    });

    socket.on('disconnect', () => {
      for (const [code, room] of rooms.entries()) {
        const before = room.members.length;
        room.members = room.members.filter((m) => m.socketId !== socket.id);
        if (room.members.length !== before) {
          if (room.members.length === 0) {
            rooms.delete(code);
          } else {
            io.to(code).emit('room:update', room);
          }
        }
      }
    });
  });

  let viteServer: { close: () => Promise<void> } | null = null;

  if (IS_PROD) {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    viteServer = vite;
    app.use(vite.middlewares);
  }

  server.on('error', (err) => {
    console.error('SOL BASE server error:', err);
    process.exit(1);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SOL BASE server listening on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    const forceExit = setTimeout(() => process.exit(0), 500);
    forceExit.unref();
    try {
      server.closeAllConnections?.();
      if (viteServer) await viteServer.close();
      io.close();
      server.close(() => process.exit(0));
    } catch {
      process.exit(0);
    }
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start SOL BASE server:', err);
  process.exit(1);
});
