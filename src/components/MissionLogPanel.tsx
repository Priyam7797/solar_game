/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameState, LogCategory, MissionLogEntry } from '../types/game';
import { getMissionMilestones } from '../game/simulation';

interface MissionLogPanelProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
}

export const MissionLogPanel: React.FC<MissionLogPanelProps> = ({
  state,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'objectives'>('log');
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>('all');

  if (!isOpen) return null;

  const milestones = getMissionMilestones(state);
  const completedMilestones = milestones.filter((m) => m.completed).length;

  const filteredLogs = state.eventLog.filter((entry) => {
    if (categoryFilter === 'all') return true;
    return entry.category === categoryFilter;
  });

  return (
    <div
      role="dialog"
      aria-label="Mission Log and Objectives"
      className="absolute inset-y-0 right-0 w-full sm:w-96 bg-slate-950 border-l border-slate-800 shadow-2xl z-40 flex flex-col pointer-events-auto backdrop-blur-none animate-in slide-in-from-right duration-200"
    >
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-bold">
              FLIGHT RECORDER TELEMETRY
            </span>
          </div>
          <h3 className="text-base font-bold text-white font-display mt-0.5">
            Mission Log & Objectives
          </h3>
        </div>

        <button
          onClick={onClose}
          aria-label="Close Mission Log"
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Tabs */}
      <div className="grid grid-cols-2 p-2 gap-1 bg-slate-900 border-b border-slate-800 text-xs font-mono">
        <button
          onClick={() => setActiveTab('log')}
          className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'log'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>CHRONOLOGICAL LOG</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-slate-300 tabular-nums">
            {state.eventLog.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('objectives')}
          className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'objectives'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>OBJECTIVES</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-emerald-400 tabular-nums">
            {completedMilestones}/{milestones.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Chronological Event Log */}
      {activeTab === 'log' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Category Filter Pills */}
          <div className="p-2.5 border-b border-slate-800/80 flex items-center gap-1 overflow-x-auto">
            {(['all', 'shortage', 'upgrade', 'hazard', 'objective', 'system'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-colors whitespace-nowrap capitalize cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>

          {/* Log Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                No events recorded in this category.
              </div>
            ) : (
              filteredLogs.map((entry) => {
                const isShortage = entry.category === 'shortage';
                const isUpgrade = entry.category === 'upgrade';
                const isHazard = entry.category === 'hazard';
                const isObjective = entry.category === 'objective';

                return (
                  <div
                    key={entry.id}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isShortage
                        ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        : isUpgrade
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : isHazard
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : isObjective
                        ? 'bg-yellow-950/25 border-yellow-500/40 text-yellow-100'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span className="font-semibold tracking-wider text-slate-300">
                        {entry.timeString}
                      </span>
                      <span
                        className={`uppercase font-bold text-[9px] px-1.5 py-0.5 rounded ${
                          isShortage
                            ? 'bg-rose-500/20 text-rose-300'
                            : isUpgrade
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isHazard
                            ? 'bg-amber-500/20 text-amber-300'
                            : isObjective
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {entry.category}
                      </span>
                    </div>

                    <p className="text-xs leading-snug font-sans text-slate-100 font-medium">
                      {entry.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Mission Objectives & Milestones */}
      {activeTab === 'objectives' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 mb-2">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">
              Engineering Progression
            </span>
            <div className="flex items-center justify-between text-xs font-mono mt-1 text-slate-300">
              <span>Milestones Achieved:</span>
              <span className="text-emerald-400 font-bold tabular-nums">
                {completedMilestones} / {milestones.length}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${Math.round((completedMilestones / milestones.length) * 100)}%` }}
              />
            </div>
          </div>

          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`p-3 rounded-xl border transition-all text-left ${
                milestone.completed
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                  : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        milestone.completed ? 'text-emerald-400 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {milestone.completed ? '✓' : '○'}
                    </span>
                    <h4
                      className={`text-xs font-bold font-sans ${
                        milestone.completed ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {milestone.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-4 leading-snug">
                    {milestone.description}
                  </p>
                </div>

                <span
                  className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                    milestone.completed
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {milestone.completed ? 'COMPLETE' : 'IN PROGRESS'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 text-center">
        Press [L] or [Esc] to toggle Mission Log Panel
      </div>
    </div>
  );
};
