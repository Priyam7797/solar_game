/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Circle, X } from 'lucide-react';
import { GameState, LogCategory } from '../types/game';
import { getMissionMilestones } from '../game/simulation';

interface MissionLogPanelProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<LogCategory | 'all', string> = {
  all: 'All',
  shortage: 'Shortage',
  upgrade: 'Upgrade',
  hazard: 'Hazard',
  objective: 'Objective',
  research: 'Research',
  system: 'System',
};

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
      className="absolute inset-y-0 right-0 w-full sm:w-96 bg-[#0b0d14] border-l border-[#eef0f5]/[0.08] z-40 flex flex-col pointer-events-auto"
    >
      {/* Top Header */}
      <div className="p-4 border-b border-[#eef0f5]/[0.08] flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            <span className="text-xs font-mono text-[#7a8296]">
              Flight recorder telemetry
            </span>
          </div>
          <h3 className="text-base font-medium text-[#eef0f5] font-display mt-0.5">
            Mission log & objectives
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Mission Log"
          className="p-2 text-[#a3a9b8] hover:text-[#eef0f5] rounded-lg hover:bg-[#1a1e28] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Main Tabs */}
      <div className="grid grid-cols-2 p-2 gap-2 bg-[#11141c] border-b border-[#eef0f5]/[0.08] text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={`py-2 px-3 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'log'
              ? 'bg-[#1a1e28] text-[#eef0f5] border border-[#eef0f5]/[0.12]'
              : 'text-[#a3a9b8] hover:text-[#eef0f5] border border-transparent'
          }`}
        >
          <span>Chronological log</span>
          <span className="text-[11px] font-mono text-[#7a8296] tabular-nums">
            {state.eventLog.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('objectives')}
          className={`py-2 px-3 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'objectives'
              ? 'bg-[#1a1e28] text-[#eef0f5] border border-[#eef0f5]/[0.12]'
              : 'text-[#a3a9b8] hover:text-[#eef0f5] border border-transparent'
          }`}
        >
          <span>Objectives</span>
          <span className="text-[11px] font-mono text-[#4cc38a] tabular-nums">
            {completedMilestones}/{milestones.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Chronological Event Log */}
      {activeTab === 'log' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Category Filters */}
          <div className="p-3 border-b border-[#eef0f5]/[0.08] flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'shortage', 'upgrade', 'hazard', 'objective', 'system'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#eef0f5] text-[#07080d] font-medium'
                    : 'text-[#a3a9b8] hover:text-[#eef0f5] hover:bg-[#1a1e28]'
                }`}
              >
                {CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>

          {/* Log Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-[#7a8296] font-mono text-xs">
                No events recorded in this category
              </div>
            ) : (
              filteredLogs.map((entry) => {
                const isShortage = entry.category === 'shortage';
                const isUpgrade = entry.category === 'upgrade';
                const isHazard = entry.category === 'hazard';
                const isObjective = entry.category === 'objective';

                const badgeClass = isShortage
                  ? 'text-[#e5484d]'
                  : isUpgrade
                  ? 'text-[#4cc38a]'
                  : isHazard
                  ? 'text-[#e5a93b]'
                  : isObjective
                  ? 'text-[#38bdf8]'
                  : 'text-[#7a8296]';

                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-xl border text-left transition-colors duration-150 ${
                      isShortage
                        ? 'bg-[#e5484d]/[0.08] border-[#e5484d]/25'
                        : isUpgrade
                        ? 'bg-[#4cc38a]/[0.06] border-[#4cc38a]/25'
                        : isHazard
                        ? 'bg-[#e5a93b]/[0.08] border-[#e5a93b]/25'
                        : isObjective
                        ? 'bg-[#38bdf8]/[0.08] border-[#38bdf8]/25'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#7a8296] mb-1">
                      <span className="tabular-nums text-[#a3a9b8]">{entry.timeString}</span>
                      <span className={badgeClass}>{CATEGORY_LABEL[entry.category]}</span>
                    </div>

                    <p className="text-xs leading-relaxed text-[#eef0f5] font-normal">
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
          <div className="bg-[#11141c] p-4 rounded-xl border border-[#eef0f5]/[0.08]">
            <span className="text-xs font-mono text-[#7a8296] block">
              Engineering progression
            </span>
            <div className="flex items-center justify-between text-xs mt-1.5 text-[#a3a9b8]">
              <span>Milestones achieved</span>
              <span className="text-[#4cc38a] font-mono font-medium tabular-nums">
                {completedMilestones} / {milestones.length}
              </span>
            </div>
            <div className="w-full bg-[#1a1e28] h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-[#4cc38a] transition-[width] duration-300"
                style={{ width: `${Math.round((completedMilestones / milestones.length) * 100)}%` }}
              />
            </div>
          </div>

          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`p-3 rounded-xl border text-left transition-colors duration-150 ${
                milestone.completed
                  ? 'bg-[#4cc38a]/[0.06] border-[#4cc38a]/25'
                  : 'bg-[#11141c] border-[#eef0f5]/[0.08]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {milestone.completed ? (
                      <Check className="w-4 h-4 text-[#4cc38a]" strokeWidth={1.5} />
                    ) : (
                      <Circle className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4
                      className={`text-xs font-medium ${
                        milestone.completed ? 'text-[#eef0f5]' : 'text-[#a3a9b8]'
                      }`}
                    >
                      {milestone.title}
                    </h4>
                    <p className="text-xs text-[#7a8296] leading-snug">
                      {milestone.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-mono shrink-0 ${
                    milestone.completed ? 'text-[#4cc38a]' : 'text-[#7a8296]'
                  }`}
                >
                  {milestone.completed ? 'Complete' : 'Active'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 border-t border-[#eef0f5]/[0.08] text-xs text-[#7a8296] flex items-center justify-center gap-2">
        <span>Toggle panel</span>
        <kbd className="px-1.5 py-0.5 rounded bg-[#1a1e28] border border-[#eef0f5]/[0.12] font-mono text-[11px] text-[#a3a9b8]">
          L
        </kbd>
        <kbd className="px-1.5 py-0.5 rounded bg-[#1a1e28] border border-[#eef0f5]/[0.12] font-mono text-[11px] text-[#a3a9b8]">
          Esc
        </kbd>
      </div>
    </div>
  );
};
