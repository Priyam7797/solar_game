/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface CoopMember {
  id: string;
  name: string;
  role: string;
}

interface CoopClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerTeacherFlareDrill?: () => void;
  onToggleTeacherPause?: (paused: boolean) => void;
}

export const CoopClassroomModal: React.FC<CoopClassroomModalProps> = ({
  isOpen,
  onClose,
  onTriggerTeacherFlareDrill,
  onToggleTeacherPause,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerName, setPlayerName] = useState('Commander Kid');
  const [role, setRole] = useState('Power Chief');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [members, setMembers] = useState<CoopMember[]>([]);
  const [activeVote, setActiveVote] = useState<{
    question: string;
    options: string[];
    votes: Record<string, string>;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [teacherMode, setTeacherMode] = useState(false);

  useEffect(() => {
    if (!isOpen || socket) return;
    const s = io({ transports: ['websocket', 'polling'] });
    s.on('room:state', (payload) => {
      if (payload?.code) {
        setActiveRoomCode(payload.code);
        setMembers(payload.members || []);
        setActiveVote(payload.activeVote || null);
      }
    });
    s.on('teacher:event', (payload) => {
      if (payload?.action === 'pause') onToggleTeacherPause?.(true);
      if (payload?.action === 'resume') onToggleTeacherPause?.(false);
      if (payload?.action === 'flare_drill') onTriggerTeacherFlareDrill?.();
    });
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [isOpen, onToggleTeacherPause, onTriggerTeacherFlareDrill]);

  if (!isOpen) return null;

  const createRoom = () => {
    setErrorMsg(null);
    socket?.emit(
      'room:create',
      { playerName, role, isTeacher: teacherMode },
      (res: { ok: boolean; code?: string; error?: string }) => {
        if (res?.ok && res.code) {
          setActiveRoomCode(res.code);
        } else {
          setErrorMsg(res?.error || 'Could not create crew room.');
        }
      }
    );
  };

  const joinRoom = () => {
    setErrorMsg(null);
    const cleaned = roomCodeInput.trim().toUpperCase();
    if (!cleaned) {
      setErrorMsg('Enter a 6-letter room code first.');
      return;
    }
    socket?.emit(
      'room:join',
      { code: cleaned, playerName, role },
      (res: { ok: boolean; code?: string; error?: string }) => {
        if (res?.ok && res.code) {
          setActiveRoomCode(res.code);
        } else {
          setErrorMsg(res?.error || 'Room not found.');
        }
      }
    );
  };

  const startTeamVote = () => {
    if (!activeRoomCode) return;
    socket?.emit('room:vote_start', {
      code: activeRoomCode,
      question: 'Solar Storm incoming! What should SOL BASE do next?',
      options: ['Bunker Crew in Shelter (-96% Rad)', 'Build Kilopower Backup (10 kW)'],
    });
  };

  const castVote = (option: string) => {
    if (!activeRoomCode) return;
    socket?.emit('room:vote_cast', { code: activeRoomCode, option });
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Co-op Mission Control and Classroom Teacher View"
      data-testid="coop-classroom-modal"
    >
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
              TEAMWORK & STEM CLASSROOM
            </span>
            <h3 className="text-lg font-bold text-white font-display">
              Co-op Crew Room & Teacher Mode
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Co-op and Classroom Modal"
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Role & Callsign */}
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Crew Callsign</span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Crew Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            >
              <option value="Power Chief">⚡ Power Chief</option>
              <option value="Life Support Lead">💧 Life Support Lead</option>
              <option value="Botanist">🌱 Botanist</option>
              <option value="Radiation Officer">🛡️ Radiation Officer</option>
            </select>
          </label>
        </div>

        {!activeRoomCode ? (
          <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-semibold">Start a 2–4 Student Crew Room</span>
              <label className="flex items-center gap-1.5 text-xs font-mono text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherMode}
                  onChange={(e) => setTeacherMode(e.target.checked)}
                />
                Teacher Host
              </label>
            </div>
            <button
              type="button"
              onClick={createRoom}
              className="w-full py-2 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono rounded-lg cursor-pointer"
            >
              + Create 6-Letter Room Code
            </button>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <input
                type="text"
                placeholder="Enter 6-letter code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white uppercase"
              />
              <button
                type="button"
                onClick={joinRoom}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold rounded-lg cursor-pointer"
              >
                Join Crew
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">ROOM CODE:</span>
              <span className="text-base font-mono font-bold text-cyan-300 tracking-widest">
                {activeRoomCode}
              </span>
            </div>

            <div className="space-y-1">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded-lg"
                >
                  <span className="font-semibold text-white">{m.name}</span>
                  <span className="font-mono text-cyan-300 text-[11px]">{m.role}</span>
                </div>
              ))}
            </div>

            {activeVote ? (
              <div className="bg-slate-900 border border-amber-500/40 rounded-lg p-2.5 space-y-2">
                <div className="text-xs font-bold text-amber-200">{activeVote.question}</div>
                {activeVote.options.map((opt) => {
                  const count = Object.values(activeVote.votes).filter((v) => v === opt).length;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => castVote(opt)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-white cursor-pointer"
                    >
                      <span>{opt}</span>
                      <span className="font-mono text-cyan-300 font-bold">{count} votes</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={startTeamVote}
                className="w-full py-2 px-3 bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-mono font-bold rounded-lg cursor-pointer"
              >
                🗳️ Call Team Trade-Off Vote
              </button>
            )}

            {teacherMode && (
              <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => socket?.emit('room:teacher_control', { code: activeRoomCode, action: 'pause' })}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-white rounded cursor-pointer"
                >
                  ⏸ Pause Class
                </button>
                <button
                  type="button"
                  onClick={() => socket?.emit('room:teacher_control', { code: activeRoomCode, action: 'resume' })}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-emerald-300 rounded cursor-pointer"
                >
                  ▶ Resume Class
                </button>
                <button
                  type="button"
                  onClick={() => socket?.emit('room:teacher_control', { code: activeRoomCode, action: 'flare_drill' })}
                  className="px-2 py-1.5 bg-amber-600 hover:bg-amber-500 text-[11px] font-mono text-slate-950 font-bold rounded cursor-pointer"
                >
                  ☀️ Trigger Flare
                </button>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="text-xs font-mono text-rose-300 bg-rose-950/60 border border-rose-500/50 rounded-lg p-2">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};
