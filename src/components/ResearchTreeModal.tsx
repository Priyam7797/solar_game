/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Atom,
  Check,
  Compass,
  FlaskConical,
  Lightbulb,
  Lock,
  Pickaxe,
  Shield,
  Snowflake,
  Sprout,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { GameState } from '../types/game';
import { RESEARCH_TECHS, TECH_ORDER, TechCategory, TechDefinition, TechId } from '../game/researchData';

interface ResearchTreeModalProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onUnlockTech: (techId: TechId) => void;
}

const CATEGORY_LABEL: Record<TechCategory, string> = {
  agriculture: 'Agriculture & food',
  energy: 'Energy & fusion',
  engineering: 'Regolith & shielding',
  life_support: 'Closed-loop ECLSS',
};

function renderTechIcon(techId: TechId, className = 'w-4 h-4 text-[#a3a9b8]') {
  switch (techId) {
    case 'tech_efficient_hydroponics':
      return <Sprout className={className} strokeWidth={1.5} />;
    case 'tech_perovskite_tandem':
      return <Zap className={className} strokeWidth={1.5} />;
    case 'tech_sintered_basalt':
      return <Shield className={className} strokeWidth={1.5} />;
    case 'tech_closed_eclss':
      return <Wind className={className} strokeWidth={1.5} />;
    case 'tech_subsurface_melt':
      return <Pickaxe className={className} strokeWidth={1.5} />;
    case 'tech_advanced_radiators':
      return <Snowflake className={className} strokeWidth={1.5} />;
    case 'tech_compact_fusion':
      return <Atom className={className} strokeWidth={1.5} />;
  }
}

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

  const tier1Techs = TECH_ORDER.filter((id) => RESEARCH_TECHS[id].tier === 1);
  const tier2Techs = TECH_ORDER.filter((id) => RESEARCH_TECHS[id].tier === 2);
  const tier3Techs = TECH_ORDER.filter((id) => RESEARCH_TECHS[id].tier === 3);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="research-tree-title"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 sm:p-6 bg-[#07080d]/85"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-2xl flex flex-col overflow-hidden text-[#eef0f5] font-sans">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-[#eef0f5]/[0.08] bg-[#11141c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a1e28] border border-[#eef0f5]/[0.08] flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-[#a3a9b8]" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#7a8296]">NASA STEM research lab</span>
                <span className="text-xs font-mono text-[#a3a9b8] tabular-nums">
                  {unlockedCount} / {totalTechs} unlocked
                </span>
              </div>
              <h2 id="research-tree-title" className="text-lg font-medium text-[#eef0f5] font-display">
                Exoplanet technology & science tree
              </h2>
            </div>
          </div>

          {/* Science Reserve + Close */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-[#1a1e28] border border-[#eef0f5]/[0.08] flex items-center gap-3">
              <FlaskConical className="w-4 h-4 text-[#e5a93b]" strokeWidth={1.5} />
              <div>
                <div className="text-[11px] font-mono text-[#7a8296]">Science reserve</div>
                <div className="text-sm font-mono font-medium text-[#eef0f5] tabular-nums leading-tight">
                  {Math.floor(currentPoints)} SP
                  <span className="ml-2 text-xs text-[#4cc38a]">+{netRate.toFixed(1)}/sol</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Research Tree"
              className="p-2 text-[#a3a9b8] hover:text-[#eef0f5] rounded-lg hover:bg-[#1a1e28] border border-[#eef0f5]/[0.08] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Discipline Filter Bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#eef0f5]/[0.08] bg-[#0b0d14] overflow-x-auto text-xs">
          <span className="text-xs text-[#7a8296] mr-1">Discipline</span>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer ${
              activeCategoryFilter === 'all'
                ? 'bg-[#eef0f5] text-[#07080d] font-medium'
                : 'bg-[#11141c] text-[#a3a9b8] hover:text-[#eef0f5] border border-[#eef0f5]/[0.08]'
            }`}
          >
            All fields
          </button>
          {(
            [
              ['agriculture', Sprout],
              ['energy', Zap],
              ['engineering', Shield],
              ['life_support', Wind],
            ] as const
          ).map(([cat, Icon]) => {
            const active = activeCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'bg-[#1a1e28] text-[#eef0f5] font-medium border border-[#38bdf8]/40'
                    : 'bg-[#11141c] text-[#a3a9b8] hover:text-[#eef0f5] border border-[#eef0f5]/[0.08]'
                }`}
              >
                <Icon className="w-4 h-4 text-[#a3a9b8]" strokeWidth={1.5} />
                <span>{CATEGORY_LABEL[cat]}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
          {/* Tech Tree Tiers */}
          <div className="lg:col-span-7 xl:col-span-8 p-5 overflow-y-auto space-y-6">
            {/* Insight Note */}
            <div className="p-4 rounded-xl bg-[#11141c] border border-[#eef0f5]/[0.08] flex items-start gap-3 text-xs text-[#a3a9b8]">
              <Lightbulb className="w-4 h-4 text-[#7a8296] mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="leading-relaxed">
                Research labs study extraterrestrial biology, materials, and physics to unlock closed-loop systems for lunar nights, solar storms, and water recovery.
              </p>
            </div>

            {/* Tier 1 */}
            <div>
              <h4 className="text-xs font-mono text-[#7a8296] mb-3">Tier 1 · Baseline systems</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {tier1Techs.map((techId) => {
                  const tech = RESEARCH_TECHS[techId];
                  const isUnlocked = state.unlockedTechIds.includes(techId);
                  const isSelected = selectedTechId === techId;
                  const isMatch = activeCategoryFilter === 'all' || tech.category === activeCategoryFilter;

                  return (
                    <button
                      key={techId}
                      type="button"
                      onClick={() => setSelectedTechId(techId)}
                      className={`text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#38bdf8]/60 bg-[#1a1e28]'
                          : isUnlocked
                          ? 'border-[#4cc38a]/30 bg-[#4cc38a]/[0.06] hover:border-[#4cc38a]/50'
                          : 'border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28]'
                      } ${!isMatch ? 'opacity-40' : ''}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          {renderTechIcon(techId, 'w-4 h-4 text-[#a3a9b8]')}
                          {isUnlocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#4cc38a]">
                              <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                              Researched
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-[#e5a93b] tabular-nums">
                              {tech.costScience} SP
                            </span>
                          )}
                        </div>
                        <h5 className="font-medium text-sm text-[#eef0f5] font-display leading-snug">
                          {tech.title}
                        </h5>
                        <p className="text-xs text-[#7a8296] mt-1 line-clamp-2 leading-relaxed">
                          {tech.stemBenefit}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Connector Divider */}
            <div className="flex items-center gap-3 text-xs font-mono text-[#7a8296]">
              <div className="flex-1 h-px bg-[#eef0f5]/[0.08]" />
              <span>Requires tier 1 foundations</span>
              <div className="flex-1 h-px bg-[#eef0f5]/[0.08]" />
            </div>

            {/* Tier 2 */}
            <div>
              <h4 className="text-xs font-mono text-[#7a8296] mb-3">Tier 2 · Advanced closed loops</h4>
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
                      type="button"
                      onClick={() => setSelectedTechId(techId)}
                      className={`text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#38bdf8]/60 bg-[#1a1e28]'
                          : isUnlocked
                          ? 'border-[#4cc38a]/30 bg-[#4cc38a]/[0.06] hover:border-[#4cc38a]/50'
                          : !prereqsSatisfied
                          ? 'border-[#eef0f5]/[0.06] bg-[#0b0d14] text-[#7a8296] hover:border-[#eef0f5]/[0.12]'
                          : 'border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28]'
                      } ${!isMatch ? 'opacity-40' : ''}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          {renderTechIcon(techId, 'w-4 h-4 text-[#a3a9b8]')}
                          {isUnlocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#4cc38a]">
                              <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                              Researched
                            </span>
                          ) : !prereqsSatisfied ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#7a8296]">
                              <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                              Locked
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-[#e5a93b] tabular-nums">
                              {tech.costScience} SP
                            </span>
                          )}
                        </div>
                        <h5 className="font-medium text-sm text-[#eef0f5] font-display leading-snug">
                          {tech.title}
                        </h5>
                        <p className="text-xs text-[#7a8296] mt-1 line-clamp-2 leading-relaxed">
                          {tech.stemBenefit}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Connector Divider */}
            <div className="flex items-center gap-3 text-xs font-mono text-[#7a8296]">
              <div className="flex-1 h-px bg-[#eef0f5]/[0.08]" />
              <span>Requires tier 2 breakthroughs</span>
              <div className="flex-1 h-px bg-[#eef0f5]/[0.08]" />
            </div>

            {/* Tier 3 */}
            <div>
              <h4 className="text-xs font-mono text-[#38bdf8] mb-3">Tier 3 · Frontier breakthroughs</h4>
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
                      type="button"
                      onClick={() => setSelectedTechId(techId)}
                      className={`text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-[#38bdf8]/60 bg-[#1a1e28]'
                          : isUnlocked
                          ? 'border-[#4cc38a]/35 bg-[#4cc38a]/[0.06] hover:border-[#4cc38a]/50'
                          : !prereqsSatisfied
                          ? 'border-[#eef0f5]/[0.06] bg-[#0b0d14] opacity-70'
                          : 'border-[#eef0f5]/[0.12] bg-[#11141c] hover:bg-[#1a1e28]'
                      } ${!isMatch ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-[#1a1e28] border border-[#eef0f5]/[0.08] shrink-0">
                          {renderTechIcon(techId, 'w-4 h-4 text-[#38bdf8]')}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[11px] font-mono text-[#38bdf8]">Flagship technology</span>
                            <span className="text-xs text-[#e5a93b] font-mono tabular-nums">
                              {tech.costScience} SP
                            </span>
                          </div>
                          <h5 className="font-medium text-base text-[#eef0f5] font-display">
                            {tech.title}
                          </h5>
                          <p className="text-xs text-[#a3a9b8] mt-1 leading-relaxed">
                            {tech.stemBenefit}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 self-start sm:self-center">
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/30">
                            <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                            Unlocked
                          </span>
                        ) : !prereqsSatisfied ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-[#1a1e28] text-[#7a8296] border border-[#eef0f5]/[0.08]">
                            <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                            Prerequisites required
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[#e5a93b]/15 text-[#e5a93b] border border-[#e5a93b]/30">
                            Ready to research
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Inspector Panel */}
          <div className="lg:col-span-5 xl:col-span-4 p-5 border-t lg:border-t-0 lg:border-l border-[#eef0f5]/[0.08] bg-[#11141c] flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#7a8296]">
                    {CATEGORY_LABEL[selectedTech.category]} · Tier {selectedTech.tier}
                  </span>
                  <span className="text-xs font-mono text-[#e5a93b] tabular-nums">
                    Cost: {selectedTech.costScience} SP
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#1a1e28] border border-[#eef0f5]/[0.08]">
                    {renderTechIcon(selectedTech.id, 'w-4 h-4 text-[#eef0f5]')}
                  </div>
                  <h3 className="text-lg font-medium text-[#eef0f5] font-display leading-snug">
                    {selectedTech.title}
                  </h3>
                </div>
              </div>

              {/* Status */}
              <div className="p-3 rounded-xl border bg-[#0b0d14] border-[#eef0f5]/[0.08]">
                <div className="text-[11px] font-mono text-[#7a8296] mb-1">Research status</div>
                {isSelectedUnlocked ? (
                  <div className="flex items-center gap-2 text-[#4cc38a] font-medium text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                    Activated and operational
                  </div>
                ) : !prereqsMet ? (
                  <div className="flex items-center gap-2 text-[#e5484d] font-medium text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5484d]" />
                    Locked · Missing prerequisites
                  </div>
                ) : canAfford ? (
                  <div className="flex items-center gap-2 text-[#38bdf8] font-medium text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                    Available for research
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[#e5a93b] font-medium text-xs tabular-nums">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5a93b]" />
                    Insufficient Science Points ({Math.floor(currentPoints)} / {selectedTech.costScience})
                  </div>
                )}
              </div>

              {/* System Benefit */}
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#38bdf8] mb-1.5">
                  <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Outpost system benefit</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0b0d14] border border-[#eef0f5]/[0.08] text-xs text-[#eef0f5] leading-relaxed">
                  {selectedTech.stemBenefit}
                </div>
              </div>

              {/* Mechanism */}
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#a3a9b8] mb-1.5">
                  <FlaskConical className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Technological mechanism</span>
                </div>
                <p className="text-xs text-[#a3a9b8] leading-relaxed">
                  {selectedTech.description}
                </p>
              </div>

              {/* NASA Precedent */}
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#a3a9b8] mb-1.5">
                  <Compass className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>NASA science precedent</span>
                </div>
                <p className="text-xs text-[#a3a9b8] leading-relaxed bg-[#0b0d14] p-3 rounded-xl border border-[#eef0f5]/[0.08]">
                  {selectedTech.historicalContext}
                </p>
              </div>

              {/* Prerequisites */}
              {selectedTech.prerequisites.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-[#7a8296] mb-1.5">
                    Required prerequisite technologies
                  </div>
                  <div className="space-y-1.5">
                    {selectedTech.prerequisites.map((pid) => {
                      const pTech = RESEARCH_TECHS[pid];
                      const isPUnlocked = state.unlockedTechIds.includes(pid);
                      return (
                        <div
                          key={pid}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                            isPUnlocked
                              ? 'bg-[#4cc38a]/[0.08] border-[#4cc38a]/25 text-[#4cc38a]'
                              : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#e5484d]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {renderTechIcon(pid, 'w-3.5 h-3.5')}
                            <span className="text-[#eef0f5]">{pTech.title}</span>
                          </span>
                          <span className="font-mono text-[11px]">
                            {isPUnlocked ? 'Unlocked' : 'Required'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action CTA */}
            <div className="pt-4 mt-4 border-t border-[#eef0f5]/[0.08]">
              {isSelectedUnlocked ? (
                <div className="w-full py-3 px-4 rounded-xl bg-[#4cc38a]/15 border border-[#4cc38a]/30 text-center font-medium text-xs text-[#4cc38a] flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" strokeWidth={1.5} />
                  <span>Technology researched</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onUnlockTech(selectedTech.id)}
                  disabled={!canResearch}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer tabular-nums ${
                    canResearch
                      ? 'bg-[#eef0f5] hover:bg-white text-[#07080d] font-display active:scale-[0.99]'
                      : 'bg-[#1a1e28] text-[#7a8296] cursor-not-allowed border border-[#eef0f5]/[0.08]'
                  }`}
                >
                  <FlaskConical className="w-4 h-4" strokeWidth={1.5} />
                  <span>Research technology ({selectedTech.costScience} SP)</span>
                </button>
              )}
              <div className="text-center mt-2 text-xs text-[#7a8296]">
                Generate Science Points with Astrobiology & Physics Labs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
