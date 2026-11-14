/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameState } from '../types/game';
import { RESEARCH_TECHS, TECH_ORDER, TechCategory, TechDefinition, TechId } from '../game/researchData';

interface ResearchTreeModalProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onUnlockTech: (techId: TechId) => void;
}

const CATEGORY_COLORS: Record<TechCategory, { bg: string; text: string; border: string }> = {
  agriculture: { bg: 'bg-emerald-950/70', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  energy: { bg: 'bg-amber-950/70', text: 'text-amber-400', border: 'border-amber-500/40' },
  engineering: { bg: 'bg-blue-950/70', text: 'text-blue-400', border: 'border-blue-500/40' },
  life_support: { bg: 'bg-cyan-950/70', text: 'text-cyan-400', border: 'border-cyan-500/40' },
};

export const ResearchTreeModal: React.FC<ResearchTreeModalProps> = ({
  state,
  isOpen,
  onClose,
  onUnlockTech,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<TechId>('tech_efficient_hydroponics');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<TechCategory | 'all'>('all');

  if (!isOpen) return null;

  const currentPoints = state.resources.sciencePoints;
  const netRate = state.resources.netSciencePerSol;
  const unlockedCount = state.unlockedTechIds.length;
  const totalTechs = TECH_ORDER.length;

  const selectedTech: TechDefinition = RESEARCH_TECHS[selectedTechId] || RESEARCH_TECHS.tech_efficient_hydroponics;
  const isSelectedUnlocked = state.unlockedTechIds.includes(selectedTech.id);
  const prereqsMet = selectedTech.prerequisites.every((prereqId) => state.unlockedTechIds.includes(prereqId));
  const canAfford = currentPoints >= selectedTech.costScience;
  const canResearch = !isSelectedUnlocked && prereqsMet && canAfford;

  // Filtered techs for tree columns
  const tier1Techs = TECH_ORDER.filter((id) => RESEARCH_TECHS[id].tier === 1);
  const tier2Techs = TECH_ORDER.filter((id) => RESEARCH_TECHS[id].tier === 2);
  const tier3Techs = TECH_ORDER.filter((id) => RESEARCH_TECHS[id].tier === 3);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="research-tree-title"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-none animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xl shadow-inner shadow-cyan-500/30">
              🔬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">
                  NASA STEM R&D LABS
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {unlockedCount} / {totalTechs} UNLOCKED
                </span>
              </div>
              <h2 id="research-tree-title" className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
                Exoplanet Technology & Science Tree
              </h2>
            </div>
          </div>

          {/* Science Points Balance Badge */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-amber-500/40 shadow-sm flex items-center gap-2.5">
              <span className="text-xl">🧪</span>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-amber-400 uppercase font-semibold">
                  Science Reserve
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-amber-300 tabular-nums leading-none">
                  {Math.floor(currentPoints)} <span className="text-xs font-normal text-amber-400/80">SP</span>
                  <span className="ml-2 text-xs font-mono text-emerald-400 font-normal">
                    (+{netRate.toFixed(1)}/sol)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Research Tree"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-950/80 overflow-x-auto text-xs">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-1">
            Focus Discipline:
          </span>
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all ${
              activeCategoryFilter === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            All Fields
          </button>
          <button
            onClick={() => setActiveCategoryFilter('agriculture')}
            className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeCategoryFilter === 'agriculture'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-900/50'
            }`}
          >
            <span>🌱</span> Agriculture & Food
          </button>
          <button
            onClick={() => setActiveCategoryFilter('energy')}
            className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeCategoryFilter === 'energy'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-900/50'
            }`}
          >
            <span>⚡</span> Energy & Fusion
          </button>
          <button
            onClick={() => setActiveCategoryFilter('engineering')}
            className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeCategoryFilter === 'engineering'
                ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-blue-400 hover:bg-slate-800 border border-blue-900/50'
            }`}
          >
            <span>🛡️</span> Regolith & Shielding
          </button>
          <button
            onClick={() => setActiveCategoryFilter('life_support')}
            className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeCategoryFilter === 'life_support'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-cyan-400 hover:bg-slate-800 border border-cyan-900/50'
            }`}
          >
            <span>🫁</span> Closed-Loop ECLSS
          </button>
        </div>

        {/* Main Content Area: Tech Tree Columns + Inspector Sidebar */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
          {/* Tech Tree Map: 3 Progressive Tiers */}
          <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-5 overflow-y-auto space-y-6">
            {/* Pedagogical Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 flex items-start gap-3 text-xs text-slate-300">
              <span className="text-lg">💡</span>
              <div>
                <span className="font-bold text-cyan-300">NASA Mission Insight: </span>
                Research labs let astronauts study extraterrestrial biology, materials, and physics. Each discovery unlocks new life-saving technologies to beat harsh lunar nights, radiation storms, and water shortages.
              </div>
            </div>

            {/* Tier 1: Core Foundations */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-slate-400">
                  TIER 1 · BASELINE SYSTEMS
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {tier1Techs.map((techId) => {
                  const tech = RESEARCH_TECHS[techId];
                  const isUnlocked = state.unlockedTechIds.includes(techId);
                  const isSelected = selectedTechId === techId;
                  const isMatch = activeCategoryFilter === 'all' || tech.category === activeCategoryFilter;

                  return (
                    <button
                      key={techId}
                      onClick={() => setSelectedTechId(techId)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-slate-850'
                          : isUnlocked
                          ? 'border-emerald-600/50 bg-emerald-950/20 hover:border-emerald-500/70'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      } ${!isMatch ? 'opacity-40' : ''}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{tech.icon}</span>
                          {isUnlocked ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              ✓ RESEARCHED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {tech.costScience} SP
                            </span>
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-white font-display leading-snug">
                          {tech.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {tech.stemBenefit}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tree Branch Connector Graphic */}
            <div className="flex items-center justify-center my-1 text-slate-700 text-xs font-mono">
              <span className="px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                ↓ Requires Tier 1 Foundations ↓
              </span>
            </div>

            {/* Tier 2: Advanced Closed Loops */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-slate-400">
                  TIER 2 · ADVANCED CLOSED LOOPS
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {tier2Techs.map((techId) => {
                  const tech = RESEARCH_TECHS[techId];
                  const isUnlocked = state.unlockedTechIds.includes(techId);
                  const isSelected = selectedTechId === techId;
                  const prereqsSatisfied = tech.prerequisites.every((pid) => state.unlockedTechIds.includes(pid));
                  const isMatch = activeCategoryFilter === 'all' || tech.category === activeCategoryFilter;

                  return (
                    <button
                      key={techId}
                      onClick={() => setSelectedTechId(techId)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-slate-850'
                          : isUnlocked
                          ? 'border-emerald-600/50 bg-emerald-950/20 hover:border-emerald-500/70'
                          : !prereqsSatisfied
                          ? 'border-slate-850 bg-slate-950/60 text-slate-500 hover:border-slate-800'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      } ${!isMatch ? 'opacity-40' : ''}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{tech.icon}</span>
                          {isUnlocked ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              ✓ RESEARCHED
                            </span>
                          ) : !prereqsSatisfied ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                              🔒 LOCKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {tech.costScience} SP
                            </span>
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-white font-display leading-snug">
                          {tech.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {tech.stemBenefit}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tree Branch Connector Graphic */}
            <div className="flex items-center justify-center my-1 text-slate-700 text-xs font-mono">
              <span className="px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                ↓ Requires Tier 2 Breakthroughs ↓
              </span>
            </div>

            {/* Tier 3: Frontier Breakthroughs */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-purple-300">
                  TIER 3 · FRONTIER BREAKTHROUGHS
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {tier3Techs.map((techId) => {
                  const tech = RESEARCH_TECHS[techId];
                  const isUnlocked = state.unlockedTechIds.includes(techId);
                  const isSelected = selectedTechId === techId;
                  const prereqsSatisfied = tech.prerequisites.every((pid) => state.unlockedTechIds.includes(pid));
                  const isMatch = activeCategoryFilter === 'all' || tech.category === activeCategoryFilter;

                  return (
                    <button
                      key={techId}
                      onClick={() => setSelectedTechId(techId)}
                      className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-purple-400 ring-2 ring-purple-400/30 bg-purple-950/30'
                          : isUnlocked
                          ? 'border-emerald-500/60 bg-emerald-950/20 hover:border-emerald-400'
                          : !prereqsSatisfied
                          ? 'border-slate-850 bg-slate-950/60 opacity-60'
                          : 'border-purple-900/60 bg-purple-950/20 hover:border-purple-700'
                      } ${!isMatch ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="text-3xl p-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
                          {tech.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-purple-900/50 text-purple-300 border border-purple-800">
                              FLAGSHIP TECHNOLOGY
                            </span>
                            <span className="text-xs text-amber-400 font-mono font-bold">
                              {tech.costScience} SP
                            </span>
                          </div>
                          <h5 className="font-bold text-base text-white font-display">
                            {tech.title}
                          </h5>
                          <p className="text-xs text-purple-200/80 mt-0.5">
                            {tech.stemBenefit}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 self-start sm:self-center">
                        {isUnlocked ? (
                          <span className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            ✓ UNLOCKED
                          </span>
                        ) : !prereqsSatisfied ? (
                          <span className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1.5">
                            🔒 PREREQUISITES REQUIRED
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            READY TO RESEARCH
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Technology Details & Research Action Panel */}
          <div className="lg:col-span-5 xl:col-span-4 p-5 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              {/* Badge & Title */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase border ${
                      CATEGORY_COLORS[selectedTech.category].bg
                    } ${CATEGORY_COLORS[selectedTech.category].text} ${CATEGORY_COLORS[selectedTech.category].border}`}
                  >
                    {selectedTech.category.replace('_', ' ')} · TIER {selectedTech.tier}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-300">
                    COST: {selectedTech.costScience} SP
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTech.icon}</span>
                  <h3 className="text-lg font-bold text-white font-display">
                    {selectedTech.title}
                  </h3>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-3 rounded-xl border bg-slate-950/80 border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Research Status
                </div>
                {isSelectedUnlocked ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ACTIVATED & OPERATIONAL
                  </div>
                ) : !prereqsMet ? (
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    LOCKED · Missing Prerequisites
                  </div>
                ) : canAfford ? (
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    AVAILABLE FOR RESEARCH
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    INSUFFICIENT SCIENCE POINTS ({Math.floor(currentPoints)} / {selectedTech.costScience})
                  </div>
                )}
              </div>

              {/* Engineering Impact / Perk */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold mb-1">
                  ⚡ Outpost System Benefit
                </div>
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-100 font-medium leading-relaxed">
                  {selectedTech.stemBenefit}
                </div>
              </div>

              {/* Pedagogical Description */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">
                  🔬 Technological Mechanism
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedTech.description}
                </p>
              </div>

              {/* Real NASA Context / Historical Precedent */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-1">
                  🚀 Real NASA Science Precedent
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed italic bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/40">
                  "{selectedTech.historicalContext}"
                </p>
              </div>

              {/* Prerequisites Checklist */}
              {selectedTech.prerequisites.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                    Required Prerequisite Technologies:
                  </div>
                  <div className="space-y-1.5">
                    {selectedTech.prerequisites.map((pid) => {
                      const pTech = RESEARCH_TECHS[pid];
                      const isPUnlocked = state.unlockedTechIds.includes(pid);
                      return (
                        <div
                          key={pid}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono border ${
                            isPUnlocked
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-rose-300'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{pTech.icon}</span>
                            <span>{pTech.title}</span>
                          </span>
                          <span>{isPUnlocked ? '✓ UNLOCKED' : '🔒 REQUIRED'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button at bottom */}
            <div className="pt-5 mt-4 border-t border-slate-800">
              {isSelectedUnlocked ? (
                <div className="w-full py-3 px-4 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-center font-bold text-sm text-emerald-300 flex items-center justify-center gap-2">
                  <span>✓</span> TECHNOLOGY FULLY RESEARCHED
                </div>
              ) : (
                <button
                  onClick={() => onUnlockTech(selectedTech.id)}
                  disabled={!canResearch}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                    canResearch
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display shadow-cyan-500/25 active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <span>🧪</span>
                  <span>
                    RESEARCH TECHNOLOGY ({selectedTech.costScience} SP)
                  </span>
                </button>
              )}
              <div className="text-center mt-2 text-[10px] font-mono text-slate-500">
                Generate Science Points over time with Astrobiology & Physics Labs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
