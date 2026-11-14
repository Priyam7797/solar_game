/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SolarFlareTelemetry } from '../types/game';
import { isHighSolarFlareRisk } from '../game/spaceWeatherData';

interface SolarFlareHazardOverlayProps {
  telemetry: SolarFlareTelemetry;
  crewInShelter: boolean;
  onOrderBunker: (inShelter: boolean) => void;
  tutorialActiveStepId?: string | null;
}

export const SolarFlareHazardOverlay: React.FC<SolarFlareHazardOverlayProps> = ({
  telemetry,
  crewInShelter,
  onOrderBunker,
  tutorialActiveStepId,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (!isHighSolarFlareRisk(telemetry)) {
    return null;
  }

  const isCritical = telemetry.riskLevel === 'critical';
  const shiftLeftForTutorial = tutorialActiveStepId === 'crew_radiation';

  return (
    <div
      data-testid="solar-flare-hazard-overlay"
      data-risk-level={telemetry.riskLevel}
      className="fixed inset-0 z-20 pointer-events-none select-none"
    >
      {/* 1. Subtle Peripheral Hazard Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-solar-hazard"
        style={{
          background: isCritical
            ? 'radial-gradient(ellipse at center, transparent 62%, rgba(244, 63, 94, 0.22) 100%)'
            : 'radial-gradient(ellipse at center, transparent 66%, rgba(245, 158, 11, 0.15) 100%)',
        }}
      />

      {/* 2. Subtle Aerospace Corner Reticles */}
      <div
        aria-hidden="true"
        className={`absolute inset-2.5 border rounded-2xl transition-colors duration-500 ${
          isCritical ? 'border-rose-500/30' : 'border-amber-500/20'
        }`}
      >
        <span
          className={`absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 rounded-tl-xl ${
            isCritical ? 'border-rose-400/75' : 'border-amber-400/65'
          }`}
        />
        <span
          className={`absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 rounded-tr-xl ${
            isCritical ? 'border-rose-400/75' : 'border-amber-400/65'
          }`}
        />
        <span
          className={`absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 rounded-bl-xl ${
            isCritical ? 'border-rose-400/75' : 'border-amber-400/65'
          }`}
        />
        <span
          className={`absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 rounded-br-xl ${
            isCritical ? 'border-rose-400/75' : 'border-amber-400/65'
          }`}
        />
      </div>

      {/* 3. Subtle Interactive Hazard Indicator & Expandable DONKI Telemetry Panel */}
      <div
        className={`pointer-events-auto fixed flex flex-col gap-2 transition-all duration-300 ${
          shiftLeftForTutorial
            ? 'top-[7.5rem] left-3 sm:left-5 items-start'
            : 'top-[5.25rem] right-3 sm:right-5 items-end'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsDetailsOpen((prev) => !prev)}
          aria-expanded={isDetailsOpen}
          aria-label={`Solar flare hazard warning: ${telemetry.riskLevel.toUpperCase()} ${telemetry.flareClass} from ${telemetry.activeRegion}`}
          data-testid="solar-flare-hazard-badge"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-lg text-xs font-mono cursor-pointer transition-colors ${
            isCritical
              ? 'bg-rose-950/92 border-rose-500/75 text-rose-100 hover:bg-rose-900/95'
              : 'bg-amber-950/90 border-amber-500/65 text-amber-100 hover:bg-amber-900/95'
          }`}
        >
          {/* Solar Flare Hazard SVG */}
          <svg
            className={`w-4 h-4 shrink-0 ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>

          <span className="font-bold tracking-wider uppercase">
            {isCritical ? 'SPE STORM: CRITICAL' : 'FLARE RISK: HIGH'}
          </span>

          <span className="text-[11px] opacity-85 tabular-nums">
            {telemetry.flareClass} · {telemetry.activeRegion}
          </span>

          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
              isCritical ? 'bg-rose-500/25 text-rose-200' : 'bg-amber-500/25 text-amber-200'
            }`}
          >
            {telemetry.protonFluxPfu} pfu
          </span>

          <span className="text-[10px] opacity-75">{isDetailsOpen ? '▴' : '▾'}</span>
        </button>

        {isDetailsOpen && (
          <div
            role="region"
            aria-label="NASA DONKI Solar Flare Telemetry"
            className={`w-80 rounded-xl border p-3 shadow-2xl space-y-2.5 text-xs ${
              isCritical
                ? 'bg-slate-950/95 border-rose-500/70 text-rose-100'
                : 'bg-slate-950/95 border-amber-500/60 text-amber-50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider font-bold block ${
                    isCritical ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  NASA DONKI Space Weather Alert
                </span>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  ID: {telemetry.donkiEventId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close solar flare telemetry details"
                className="text-slate-400 hover:text-white px-1 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Risk Index Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Flare Risk Index</span>
                <span className={`font-bold tabular-nums ${isCritical ? 'text-rose-400' : 'text-amber-300'}`}>
                  {telemetry.riskScorePct}% ({telemetry.riskLevel.toUpperCase()})
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${isCritical ? 'bg-rose-500' : 'bg-amber-400'}`}
                  style={{ width: `${telemetry.riskScorePct}%` }}
                />
              </div>
            </div>

            {/* Key Telemetry Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-slate-900/90 border border-slate-800 rounded-lg p-2 tabular-nums">
              <div>
                <span className="text-slate-400 block text-[10px]">GOES Class</span>
                <span className="text-white font-bold">{telemetry.flareClass}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Sunspot Region</span>
                <span className="text-white font-bold">{telemetry.activeRegion}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Proton Flux</span>
                <span className="text-amber-300 font-bold">{telemetry.protonFluxPfu} pfu</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CME Speed / ETA</span>
                <span className="text-cyan-300 font-bold">
                  {telemetry.cmeSpeedKmS} km/s ·{' '}
                  {telemetry.etaHours === 0
                    ? 'NOW'
                    : telemetry.etaHours !== null
                    ? `${telemetry.etaHours}h`
                    : '—'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {telemetry.advisory}
            </p>

            {/* Quick Protection Action */}
            <button
              type="button"
              onClick={() => onOrderBunker(!crewInShelter)}
              className={`w-full py-1.5 px-3 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer ${
                crewInShelter
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                  : isCritical
                  ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {crewInShelter
                ? '✓ Crew Sheltered (-96% Rad) · Recall Crew'
                : '🛡️ Bunker Crew in Storm Shelter (-96% Rad)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
