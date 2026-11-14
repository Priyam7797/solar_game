/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 pointer-events-auto bg-[#07080d]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Daily Priority Board"
      data-testid="priority-board-modal"
    >
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-lg w-full p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-[#7a8296] block tabular-nums">
              Sol {priorityBoard.solNumber} · Mission planner training
            </span>
            <h3 className="text-lg font-medium text-[#eef0f5] font-display mt-0.5">
              Daily priority board
            </h3>
            <p className="text-xs text-[#a3a9b8] mt-1">
              Rank today’s three tasks from #1 (most urgent) to #3 (can wait), then compare with NASA flight directors.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Priority Board"
            className="p-1.5 rounded-lg bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-2">
          {orderedIds.map((id, idx) => {
            const task = priorityBoard.tasks.find((t) => t.id === id);
            if (!task) return null;
            return (
              <div
                key={id}
                className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#1a1e28] border border-[#eef0f5]/10 text-[#38bdf8] font-mono text-xs flex items-center justify-center shrink-0 tabular-nums">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#eef0f5]">{task.title}</div>
                    <div className="text-xs text-[#7a8296] mt-0.5">{task.detail}</div>
                    {priorityBoard.completedForSol && (
                      <div className="text-xs text-[#4cc38a] font-mono mt-1.5">
                        NASA rank #{task.recommendedRank}: {task.plannerReason}
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
                      className="w-7 h-6 rounded-md bg-[#1a1e28] border border-[#eef0f5]/10 text-[#eef0f5] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === orderedIds.length - 1}
                      onClick={() => moveItem(idx, 1)}
                      aria-label={`Move ${task.title} lower`}
                      className="w-7 h-6 rounded-md bg-[#1a1e28] border border-[#eef0f5]/10 text-[#eef0f5] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {priorityBoard.completedForSol && priorityBoard.lastFeedback && (
          <div className="bg-[#0b0d14] border border-[#4cc38a]/40 rounded-xl p-3 text-xs text-[#eef0f5] space-y-1">
            <span className="font-mono text-[#4cc38a] block text-xs tabular-nums">
              NASA Mission Control comparison ({priorityBoard.lastScore}/3 exact)
            </span>
            <p className="text-[#a3a9b8]">{priorityBoard.lastFeedback}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-sans font-medium rounded-lg cursor-pointer transition-colors duration-150"
          >
            Close
          </button>
          {!priorityBoard.completedForSol && (
            <button
              type="button"
              onClick={() => onSubmitRanking(orderedIds)}
              data-testid="submit-priority-btn"
              className="flex-1 h-9 px-4 bg-[#eef0f5] hover:bg-white text-[#07080d] font-medium text-xs font-sans rounded-lg cursor-pointer transition-colors duration-150"
            >
              Lock today’s priorities (+Science)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
