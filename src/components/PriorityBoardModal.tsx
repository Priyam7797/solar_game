/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { GameState } from '../types/game';

interface PriorityBoardModalProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRanking: (orderedIds: string[]) => void;
}

export const PriorityBoardModal: React.FC<PriorityBoardModalProps> = ({
  state,
  isOpen,
  onClose,
  onSubmitRanking,
}) => {
  const { priorityBoard } = state;
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    priorityBoard.tasks.map((t) => t.id)
  );

  useEffect(() => {
    setOrderedIds(priorityBoard.tasks.map((t) => t.id));
  }, [priorityBoard.solNumber, priorityBoard.tasks]);

  if (!isOpen) return null;

  const moveItem = (index: number, delta: -1 | 1) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= orderedIds.length) return;
    const copy = [...orderedIds];
    const [removed] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, removed);
    setOrderedIds(copy);
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Daily Priority Board"
      data-testid="priority-board-modal"
    >
      <div className="bg-slate-900 border border-amber-500/60 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold block">
              SOL {priorityBoard.solNumber} · MISSION PLANNER TRAINING
            </span>
            <h3 className="text-lg font-bold text-white font-display">Daily Priority Board</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Rank today’s 3 tasks from #1 (Most Urgent) to #3 (Can Wait), then compare with NASA flight directors!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Priority Board"
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {orderedIds.map((id, idx) => {
            const task = priorityBoard.tasks.find((t) => t.id === id);
            if (!task) return null;
            return (
              <div
                key={id}
                className="bg-slate-950/85 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">{task.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{task.detail}</div>
                    {priorityBoard.completedForSol && (
                      <div className="text-[11px] text-emerald-300 font-mono mt-1">
                        NASA Rank #{task.recommendedRank}: {task.plannerReason}
                      </div>
                    )}
                  </div>
                </div>

                {!priorityBoard.completedForSol && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, -1)}
                      aria-label={`Move ${task.title} higher`}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white disabled:opacity-30 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === orderedIds.length - 1}
                      onClick={() => moveItem(idx, 1)}
                      aria-label={`Move ${task.title} lower`}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white disabled:opacity-30 cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {priorityBoard.completedForSol && priorityBoard.lastFeedback && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-100">
            <span className="font-mono font-bold text-emerald-300 block text-[10px] mb-0.5">
              NASA MISSION CONTROL COMPARISON ({priorityBoard.lastScore}/3 EXACT)
            </span>
            {priorityBoard.lastFeedback}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg cursor-pointer"
          >
            Close
          </button>
          {!priorityBoard.completedForSol && (
            <button
              type="button"
              onClick={() => onSubmitRanking(orderedIds)}
              data-testid="submit-priority-btn"
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono rounded-lg cursor-pointer"
            >
              Lock Today’s Priorities (+Science) →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
