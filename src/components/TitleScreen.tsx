/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Dna, HelpCircle, Users } from 'lucide-react';
import { DifficultyId, PlanetId, ScenarioId } from '../types/game';
import { SCENARIOS } from '../game/modulesData';
import {
  SESSION_LENGTH_PRESETS,
  calculateTimeCompression,
  formatInGameDayDuration,
  formatRealSecondRate,
} from '../game/simulation';
import sitesJson from '../data/sites.json';

interface TitleScreenProps {
  selectedScenario: ScenarioId;
  selectedPlanet: PlanetId;
  selectedDifficulty: DifficultyId;
  selectedDataMode: 'ARCHIVED' | 'LIVE';
  selectedTargetSessionMinutes: number;
  onSelectScenario: (id: ScenarioId) => void;
  onSelectPlanet: (planet: PlanetId) => void;
  onSelectDifficulty: (diff: DifficultyId) => void;
  onSelectDataMode: (mode: 'ARCHIVED' | 'LIVE') => void;
  onSelectTargetSessionMinutes: (minutes: number) => void;
  onOpenSources: () => void;
  onOpenCoop: () => void;
  onOpenGlossary: () => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedScenario,
  selectedPlanet,
  selectedDifficulty,
  selectedDataMode,
  selectedTargetSessionMinutes,
  onSelectScenario,
  onSelectPlanet,
  onSelectDifficulty,
  onSelectDataMode,
  onSelectTargetSessionMinutes,
  onOpenSources,
  onOpenCoop,
  onOpenGlossary,
  onStartGame,
}) => {
  const currentScenario = SCENARIOS[selectedScenario];
  const compression = calculateTimeCompression(
    currentScenario.targetSols,
    selectedTargetSessionMinutes
  );
  const targetSessionSeconds = selectedTargetSessionMinutes * 60;
  const activeSite = sitesJson.sites[selectedPlanet];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-20">
      <div className="flex-1 flex flex-col md:flex-row md:items-start md:justify-between gap-6 min-h-0">
        {/* Top-Left Header: SOL BASE Wordmark + Site Overview */}
        <div className="pointer-events-auto max-w-md space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {/* Flat monochrome telemetry emblem */}
              <div className="w-10 h-10 rounded-xl bg-[#11141c]/95 border border-[#eef0f5]/10 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-[#eef0f5]"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="2.5" fill="#38bdf8" />
                  <ellipse
                    cx="12"
                    cy="12"
                    rx="11"
                    ry="3.5"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeOpacity="0.65"
                    transform="rotate(-24 12 12)"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" aria-hidden="true" />
                  <span className="text-xs font-mono text-[#7a8296] tabular-nums">
                    Grades 3–6 Outpost Trainer · NASA Open Data
                  </span>
                </div>
                <h1 className="text-4xl font-semibold tracking-[-0.02em] text-[#eef0f5] font-display leading-none mt-1">
                  SOL BASE
                </h1>
              </div>
            </div>

            <p className="text-sm text-[#a3a9b8] leading-relaxed font-sans pt-1">
              Manage <span className="text-[#eef0f5] font-medium">Power</span>,{' '}
              <span className="text-[#eef0f5] font-medium">Life Support</span>,{' '}
              <span className="text-[#eef0f5] font-medium">Food</span>, and{' '}
              <span className="text-[#eef0f5] font-medium">Solar Flare Shields</span> across lunar nights and Martian dust storms. Every decision uses a live trade-off card with ARIA guidance.
            </p>
          </div>

          {/* Site Info Preview Card */}
          <div className="bg-[#11141c]/95 border border-[#eef0f5]/[0.08] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#eef0f5]">{activeSite.name}</span>
              <span className="text-xs font-mono text-[#7a8296] tabular-nums">
                Earth delay: {activeSite.commsDelayLabel}
              </span>
            </div>
            <p className="text-xs text-[#a3a9b8] leading-relaxed">{activeSite.dustNote}</p>
            <div className="text-xs font-mono text-[#7a8296]">
              Credit: {activeSite.imageCredit}
            </div>
          </div>

          {/* Pre-Flight Academy Links */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenSources}
              className="h-8 px-3 rounded-lg bg-[#11141c]/95 border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-xs font-sans font-medium text-[#a3a9b8] hover:text-[#eef0f5] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
            >
              <Dna className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />
              <span>Health Cards &amp; Data Sources</span>
            </button>
            <button
              type="button"
              onClick={onOpenGlossary}
              className="h-8 px-3 rounded-lg bg-[#11141c]/95 border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-xs font-sans font-medium text-[#a3a9b8] hover:text-[#eef0f5] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
            >
              <HelpCircle className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />
              <span>What Does This Mean?</span>
            </button>
            <button
              type="button"
              onClick={onOpenCoop}
              className="h-8 px-3 rounded-lg bg-[#11141c]/95 border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-xs font-sans font-medium text-[#a3a9b8] hover:text-[#eef0f5] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
            >
              <Users className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />
              <span>Co-op / Classroom</span>
            </button>
          </div>
        </div>

        {/* Right Mission Setup Card: Site, Difficulty, DONKI Feed, Scenario & Time Compression */}
        <div className="pointer-events-auto w-full max-w-md max-h-[calc(100vh-88px)] overflow-y-auto bg-[#11141c]/95 border border-[#eef0f5]/[0.08] rounded-2xl p-4 space-y-4">
          {/* 1. Landing Site */}
          <div className="space-y-2">
            <span className="text-xs font-sans text-[#7a8296] block">
              1. Pick landing site
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectPlanet('moon')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60 ${
                  selectedPlanet === 'moon'
                    ? 'bg-[#1a1e28] border-[#38bdf8]/60 shadow-[inset_0_1px_0_rgba(238,240,245,0.08)]'
                    : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] hover:bg-[#1a1e28]/60'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#a3a9b8] shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#eef0f5]">Moon</div>
                  <div className="text-xs text-[#7a8296] truncate">14d Night · ~1.3s Radio</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectPlanet('mars')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60 ${
                  selectedPlanet === 'mars'
                    ? 'bg-[#1a1e28] border-[#38bdf8]/60 shadow-[inset_0_1px_0_rgba(238,240,245,0.08)]'
                    : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] hover:bg-[#1a1e28]/60'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#e5a93b] shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#eef0f5]">Mars</div>
                  <div className="text-xs text-[#7a8296] truncate">Dust Storms · 3–22m Delay</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Difficulty & NASA Space Weather Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <span className="text-xs font-sans text-[#7a8296] block">
                2. Difficulty
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    ['cadet', 'Cadet'],
                    ['astronaut', 'Astro'],
                    ['commander', 'Cmdr'],
                  ] as const
                ).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectDifficulty(id)}
                    className={`h-8 text-xs font-mono rounded-lg border cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      selectedDifficulty === id
                        ? 'bg-[#1a1e28] border-[#38bdf8]/60 text-[#eef0f5] font-medium'
                        : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#7a8296] hover:text-[#eef0f5]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-sans text-[#7a8296] block">
                NASA DONKI feed
              </span>
              <div className="grid grid-cols-2 gap-1">
                {(['ARCHIVED', 'LIVE'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onSelectDataMode(mode)}
                    className={`h-8 text-xs font-mono rounded-lg border cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      selectedDataMode === mode
                        ? mode === 'LIVE'
                          ? 'bg-[#1a1e28] border-[#4cc38a]/60 text-[#4cc38a] font-medium'
                          : 'bg-[#1a1e28] border-[#e5a93b]/50 text-[#e5a93b] font-medium'
                        : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#7a8296] hover:text-[#eef0f5]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Mission Scenarios */}
          <div className="space-y-2">
            <span className="text-xs font-sans text-[#7a8296] block">
              3. Pick training mission
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {(Object.keys(SCENARIOS) as ScenarioId[]).map((scenId) => {
                const sc = SCENARIOS[scenId];
                const isSelected = selectedScenario === scenId;
                return (
                  <button
                    key={scenId}
                    type="button"
                    onClick={() => onSelectScenario(scenId)}
                    className={`w-full text-left p-3 rounded-xl border cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isSelected
                        ? 'bg-[#1a1e28] border-[#38bdf8]/60 text-[#eef0f5] shadow-[inset_0_1px_0_rgba(238,240,245,0.08)]'
                        : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:bg-[#1a1e28]/60 hover:text-[#eef0f5]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#eef0f5] truncate">{sc.title}</span>
                      <span className="text-xs font-mono text-[#38bdf8] tabular-nums shrink-0">
                        {sc.targetSols} Sols
                      </span>
                    </div>
                    <div className="text-xs text-[#7a8296] line-clamp-1 mt-1">
                      {sc.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Compression */}
          <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-[#a3a9b8]">
                Target session &amp; time compression
              </span>
              <span
                data-testid="title-compression-ratio"
                className="text-xs font-mono font-medium text-[#38bdf8] tabular-nums"
              >
                {Math.round(compression.ratio)}×
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {SESSION_LENGTH_PRESETS.map((mins) => {
                const active = selectedTargetSessionMinutes === mins;
                const label = mins === 180 ? '3 h' : `${mins} min`;
                const presetComp = calculateTimeCompression(currentScenario.targetSols, mins);
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onSelectTargetSessionMinutes(mins)}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      active
                        ? 'bg-[#1a1e28] border-[#38bdf8]/60 text-[#eef0f5]'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#7a8296] hover:text-[#eef0f5]'
                    }`}
                  >
                    <div className="text-xs font-mono font-medium">{label}</div>
                    <div className="text-xs font-mono text-[#7a8296] tabular-nums">
                      {Math.round(presetComp.ratio)}×
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono text-[#7a8296] flex items-center justify-between tabular-nums">
              <span>1 real s = {formatRealSecondRate(compression)}</span>
              <span>1 Sol = {formatInGameDayDuration(compression)} ({targetSessionSeconds}s)</span>
            </div>
          </div>

          {/* Primary Start CTA Button: Ink dark-theme off-white primary control */}
          <button
            type="button"
            data-start="true"
            onClick={onStartGame}
            className="w-full h-11 px-4 rounded-xl bg-[#eef0f5] hover:bg-white text-[#07080d] font-medium text-sm transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
          >
            <span>Launch to {selectedPlanet === 'moon' ? 'Shackleton Crater' : 'Jezero Crater'}</span>
            <kbd className="text-xs font-mono bg-[#07080d]/10 border border-[#07080d]/15 text-[#07080d] px-2 py-0.5 rounded-md font-normal">
              Space
            </kbd>
          </button>
        </div>
      </div>

      {/* Bottom Camera & Control Bar on legible Ink surface */}
      <div className="flex justify-center pt-2">
        <div className="pointer-events-auto inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-[#11141c]/90 border border-[#eef0f5]/[0.08] text-xs font-mono text-[#a3a9b8]">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
            <span>Controls</span>
          </span>
          <span className="text-[#7a8296]">·</span>
          <span>Left-drag orbit</span>
          <span>·</span>
          <span>Right-drag pan</span>
          <span>·</span>
          <span>Scroll zoom</span>
          <span>·</span>
          <span>Click module for Cost Card</span>
          <span>·</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#1a1e28] border border-[#eef0f5]/10 text-[#eef0f5]">
            Space
          </kbd>
          <span>start or pause</span>
        </div>
      </div>
    </div>
  );
};
