/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Pause, Play, Plus, Sun, Users, Vote, X } from 'lucide-react';

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
      question: 'Solar Storm incoming. What should SOL BASE prioritize?',
      options: ['Bunker Crew in Shelter (-96% Rad)', 'Build Kilopower Backup (10 kW)'],
    });
  };

  const castVote = (option: string) => {
    if (!activeRoomCode) return;
    socket?.emit('room:vote_cast', { code: activeRoomCode, option });
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-[#07080d]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Co-op Mission Control and Classroom Teacher View"
      data-testid="coop-classroom-modal"
    >
      <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-2xl max-w-lg w-full p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1a1e28] border border-[#eef0f5]/[0.08]">
              <Users className="w-4 h-4 text-[#a3a9b8]" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-xs font-mono text-[#7a8296] block">
                Teamwork & STEM classroom
              </span>
              <h3 className="text-lg font-medium text-[#eef0f5] font-display">
                Co-op crew room & teacher controls
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Co-op and Classroom Modal"
            className="p-2 rounded-lg bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5] transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Role & Callsign */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-mono text-[#7a8296]">Crew callsign</span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#11141c] border border-[#eef0f5]/[0.12] text-xs text-[#eef0f5] focus:outline-none focus:border-[#38bdf8]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-mono text-[#7a8296]">Crew role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#11141c] border border-[#eef0f5]/[0.12] text-xs text-[#eef0f5] focus:outline-none focus:border-[#38bdf8]"
            >
              <option value="Power Chief">Power Chief</option>
              <option value="Life Support Lead">Life Support Lead</option>
              <option value="Botanist">Botanist</option>
              <option value="Radiation Officer">Radiation Officer</option>
            </select>
          </label>
        </div>

        {!activeRoomCode ? (
          <div className="space-y-3 bg-[#11141c] border border-[#eef0f5]/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#a3a9b8] font-medium">
                Start a 2–4 student crew room
              </span>
              <label className="flex items-center gap-2 text-xs font-mono text-[#e5a93b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherMode}
                  onChange={(e) => setTeacherMode(e.target.checked)}
                />
                Teacher host
              </label>
            </div>
            <button
              type="button"
              onClick={createRoom}
              className="w-full py-2.5 px-3 bg-[#eef0f5] hover:bg-white text-[#07080d] font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>Create 6-letter room code</span>
            </button>

            <div className="flex items-center gap-2 pt-3 border-t border-[#eef0f5]/[0.08]">
              <input
                type="text"
                placeholder="Enter 6-letter code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0b0d14] border border-[#eef0f5]/[0.12] text-xs font-mono text-[#eef0f5] placeholder:text-[#7a8296] focus:outline-none focus:border-[#38bdf8]"
              />
              <button
                type="button"
                onClick={joinRoom}
                className="px-4 py-2 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/[0.12] text-[#eef0f5] text-xs font-medium rounded-lg transition-colors duration-150 cursor-pointer"
              >
                Join crew
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-[#11141c] border border-[#eef0f5]/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#7a8296]">Room code</span>
              <span className="text-base font-mono font-medium text-[#38bdf8] tracking-widest tabular-nums">
                {activeRoomCode}
              </span>
            </div>

            <div className="space-y-1.5">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs bg-[#0b0d14] border border-[#eef0f5]/[0.06] px-3 py-2 rounded-lg"
                >
                  <span className="font-medium text-[#eef0f5]">{m.name}</span>
                  <span className="font-mono text-[#a3a9b8] text-[11px]">{m.role}</span>
                </div>
              ))}
            </div>

            {activeVote ? (
              <div className="bg-[#0b0d14] border border-[#e5a93b]/30 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-[#e5a93b]">{activeVote.question}</div>
                {activeVote.options.map((opt) => {
                  const count = Object.values(activeVote.votes).filter((v) => v === opt).length;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => castVote(opt)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#11141c] hover:bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-xs text-[#eef0f5] transition-colors duration-150 cursor-pointer"
                    >
                      <span>{opt}</span>
                      <span className="font-mono text-[#38bdf8] tabular-nums">{count} votes</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={startTeamVote}
                className="w-full py-2.5 px-3 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/[0.12] text-[#e5a93b] text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer"
              >
                <Vote className="w-4 h-4" strokeWidth={1.5} />
                <span>Call team trade-off vote</span>
              </button>
            )}

            {teacherMode && (
              <div className="pt-3 border-t border-[#eef0f5]/[0.08] grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => socket?.emit('room:teacher_control', { code: activeRoomCode, action: 'pause' })}
                  className="px-2 py-2 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/[0.08] text-xs text-[#eef0f5] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Pause</span>
                </button>
                <button
                  type="button"
                  onClick={() => socket?.emit('room:teacher_control', { code: activeRoomCode, action: 'resume' })}
                  className="px-2 py-2 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/[0.08] text-xs text-[#4cc38a] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Resume</span>
                </button>
                <button
                  type="button"
                  onClick={() => socket?.emit('room:teacher_control', { code: activeRoomCode, action: 'flare_drill' })}
                  className="px-2 py-2 bg-[#e5a93b]/15 hover:bg-[#e5a93b]/25 border border-[#e5a93b]/40 text-xs text-[#e5a93b] font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Flare drill</span>
                </button>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="text-xs font-mono text-[#e5484d] bg-[#e5484d]/[0.08] border border-[#e5484d]/30 rounded-lg p-3">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};
