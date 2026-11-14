/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 sm:p-8 z-20">
      <div className="flex-1 flex flex-col md:flex-row md:items-start md:justify-between gap-6 min-h-0">
        {/* Top-Left Header: SOL BASE + Moon/Mars Academy Intro */}
        <div className="pointer-events-auto max-w-lg space-y-3">
          <div className="flex items-center gap-3">
            <svg
              className="w-11 h-11 text-cyan-400 shrink-0"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
              <path d="M20 6L25 15H15L20 6Z" fill="#38bdf8" />
              <circle cx="20" cy="24" r="5" fill="#f43f5e" />
              <ellipse cx="20" cy="24" rx="12" ry="4" stroke="#e0f2fe" strokeWidth="1.5" transform="rotate(-20 20 24)" />
            </svg>
            <div>
              <span className="text-[11px] font-mono tracking-widest text-cyan-400 font-semibold uppercase block">
                JUNIOR ASTRONAUT MISSION TRAINER · NASA OPEN DATA
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
                SOL BASE
              </h1>
              <span className="text-xs font-mono text-amber-300 font-semibold">
                Moon &amp; Mars Outpost Trainer (Grades 3–6)
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed font-sans max-w-md">
            You’re the new Outpost Commander! Manage <strong className="text-white">Power</strong>,{' '}
            <strong className="text-white">Life Support</strong>, <strong className="text-white">Food</strong>, and{' '}
            <strong className="text-white">Solar Flare Shields</strong>. Every choice has a real trade-off—and ARIA is here to help!
          </p>

          {/* Site Info Preview Card */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 max-w-md space-y-1.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{activeSite.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                Earth Delay: {activeSite.commsDelayLabel}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">{activeSite.dustNote}</p>
            <div className="text-[10px] font-mono text-slate-400">
              Credit: {activeSite.imageCredit}
            </div>
          </div>

          {/* Quick Pre-Flight Academy Links */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenSources}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-xs font-mono text-cyan-300 cursor-pointer"
            >
              🧬 Health Cards &amp; Data Sources
            </button>
            <button
              type="button"
              onClick={onOpenGlossary}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-xs font-mono text-amber-300 cursor-pointer"
            >
              ❓ What Does This Mean?
            </button>
            <button
              type="button"
              onClick={onOpenCoop}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-emerald-400 text-xs font-mono text-emerald-300 cursor-pointer"
            >
              🤝 Co-op / Classroom
            </button>
          </div>
        </div>

        {/* Right Deck: Moon/Mars + Difficulty + Data Mode + Scenarios */}
        <div className="pointer-events-auto w-full max-w-md max-h-[calc(100vh-5.5rem)] overflow-y-auto bg-slate-900/92 border border-slate-700/80 rounded-xl p-4 shadow-2xl space-y-3">
          {/* Site Comparison Tabs */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              1. Pick Landing Site
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectPlanet('moon')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                  selectedPlanet === 'moon'
                    ? 'bg-slate-800 text-cyan-300 border-cyan-500 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-slate-300 inline-block shrink-0" />
                <div>
                  <div className="font-bold text-white">Moon</div>
                  <div className="text-[10px] text-slate-400 font-normal">14d Night · ~1.3s Radio</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectPlanet('mars')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                  selectedPlanet === 'mars'
                    ? 'bg-slate-800 text-amber-300 border-amber-500 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-amber-600 inline-block shrink-0" />
                <div>
                  <div className="font-bold text-white">Mars</div>
                  <div className="text-[10px] text-slate-400 font-normal">Dust Storms · 3–22m Delay</div>
                </div>
              </button>
            </div>
          </div>

          {/* Difficulty & NASA Space Weather Mode */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
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
                    className={`py-1.5 text-[11px] font-mono rounded-md border cursor-pointer ${
                      selectedDifficulty === id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                NASA DONKI Feed
              </span>
              <div className="grid grid-cols-2 gap-1">
                {(['ARCHIVED', 'LIVE'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onSelectDataMode(mode)}
                    className={`py-1.5 text-[11px] font-mono rounded-md border cursor-pointer ${
                      selectedDataMode === mode
                        ? mode === 'LIVE'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                          : 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mission Scenarios */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              3. Pick Training Mission
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {(Object.keys(SCENARIOS) as ScenarioId[]).map((scenId) => {
                const sc = SCENARIOS[scenId];
                const isSelected = selectedScenario === scenId;
                return (
                  <button
                    key={scenId}
                    type="button"
                    onClick={() => onSelectScenario(scenId)}
                    className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400/80 text-white'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{sc.title}</span>
                      <span className="text-[10px] font-mono text-cyan-400 tabular-nums shrink-0">
                        {sc.targetSols} Sols
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {sc.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Compression */}
          <div className="bg-slate-950/85 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Target Session &amp; Time Compression
              </span>
              <span
                data-testid="title-compression-ratio"
                className="text-xs font-mono font-bold text-amber-300 tabular-nums"
              >
                {Math.round(compression.ratio)}×
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {SESSION_LENGTH_PRESETS.map((mins) => {
                const active = selectedTargetSessionMinutes === mins;
                const label = mins === 180 ? '3 h' : `${mins} min`;
                const presetComp = calculateTimeCompression(currentScenario.targetSols, mins);
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onSelectTargetSessionMinutes(mins)}
                    className={`px-2 py-1 rounded-md border text-center transition-all cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">{label}</div>
                    <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {Math.round(presetComp.ratio)}×
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-mono text-slate-300 flex items-center justify-between tabular-nums">
              <span>1 real s = {formatRealSecondRate(compression)}</span>
              <span>1 Sol = {formatInGameDayDuration(compression)} ({targetSessionSeconds}s)</span>
            </div>
          </div>

          {/* Primary Start CTA Button */}
          <button
            type="button"
            data-start="true"
            onClick={onStartGame}
            className="w-full py-3 px-5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>LAUNCH TO {selectedPlanet === 'moon' ? 'SHACKLETON CRATER' : 'JEZERO CRATER'}</span>
            <span className="text-xs font-mono bg-cyan-600/40 text-slate-950 px-1.5 py-0.5 rounded font-normal">
              Space
            </span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 font-mono tracking-wide pt-2">
        Left-Drag Orbit Camera · Right-Drag Pan · Scroll Zoom · Click Module for Cost Card · Space Start / Pause
      </div>
    </div>
  );
};
