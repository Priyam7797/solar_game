/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Shield, X } from 'lucide-react';
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
      {/* Subtle Peripheral Hazard Edge */}
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-solar-hazard"
        style={{
          background: isCritical
            ? 'radial-gradient(ellipse at center, transparent 68%, rgba(229, 72, 77, 0.16) 100%)'
            : 'radial-gradient(ellipse at center, transparent 72%, rgba(229, 169, 59, 0.10) 100%)',
        }}
      />

      {/* Interactive Hazard Indicator & DONKI Telemetry Popover */}
      <div
        className={`pointer-events-auto fixed flex flex-col gap-2 transition-[top,right,left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          shiftLeftForTutorial
            ? 'top-28 left-4 items-start'
            : 'top-24 right-4 items-end'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsDetailsOpen((prev) => !prev)}
          aria-expanded={isDetailsOpen}
          aria-label={`Solar flare hazard warning: ${telemetry.riskLevel.toUpperCase()} ${telemetry.flareClass} from ${telemetry.activeRegion}`}
          data-testid="solar-flare-hazard-badge"
          className={`h-8 flex items-center gap-2 px-3 rounded-lg border text-xs font-mono cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] bg-[#11141c]/95 ${
            isCritical
              ? 'border-[#e5484d]/60 text-[#eef0f5] hover:bg-[#1a1e28]'
              : 'border-[#e5a93b]/50 text-[#eef0f5] hover:bg-[#1a1e28]'
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${isCritical ? 'text-[#e5484d]' : 'text-[#e5a93b]'}`}
            strokeWidth={1.5}
          />
          <span className="font-medium">
            {isCritical ? 'SPE storm: Critical' : 'Flare risk: High'}
          </span>
          <span className="text-[#a3a9b8] tabular-nums">
            {telemetry.flareClass} · {telemetry.activeRegion}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-xs tabular-nums ${
              isCritical ? 'bg-[#e5484d]/15 text-[#e5484d]' : 'bg-[#e5a93b]/15 text-[#e5a93b]'
            }`}
          >
            {telemetry.protonFluxPfu} pfu
          </span>
          {isDetailsOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
          )}
        </button>

        {isDetailsOpen && (
          <div
            role="region"
            aria-label="NASA DONKI Solar Flare Telemetry"
            className="w-80 bg-[#11141c]/95 border border-[#eef0f5]/10 rounded-xl p-4 space-y-3 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={`text-xs font-mono font-medium block ${
                    isCritical ? 'text-[#e5484d]' : 'text-[#e5a93b]'
                  }`}
                >
                  NASA DONKI space weather telemetry
                </span>
                <div className="text-xs font-mono text-[#7a8296] mt-0.5 tabular-nums">
                  Event {telemetry.donkiEventId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close solar flare telemetry details"
                className="text-[#7a8296] hover:text-[#eef0f5] p-1 rounded-md hover:bg-[#1a1e28] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-[#a3a9b8]">Flare risk index</span>
                <span className={`font-medium tabular-nums ${isCritical ? 'text-[#e5484d]' : 'text-[#e5a93b]'}`}>
                  {telemetry.riskScorePct}% ({telemetry.riskLevel})
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1a1e28] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-300 ${isCritical ? 'bg-[#e5484d]' : 'bg-[#e5a93b]'}`}
                  style={{ width: `${telemetry.riskScorePct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-lg p-3 tabular-nums">
              <div>
                <span className="text-[#7a8296] block text-xs">GOES class</span>
                <span className="text-[#eef0f5] font-medium">{telemetry.flareClass}</span>
              </div>
              <div>
                <span className="text-[#7a8296] block text-xs">Sunspot region</span>
                <span className="text-[#eef0f5] font-medium">{telemetry.activeRegion}</span>
              </div>
              <div>
                <span className="text-[#7a8296] block text-xs">Proton flux</span>
                <span className="text-[#e5a93b] font-medium">{telemetry.protonFluxPfu} pfu</span>
              </div>
              <div>
                <span className="text-[#7a8296] block text-xs">CME / ETA</span>
                <span className="text-[#38bdf8] font-medium">
                  {telemetry.cmeSpeedKmS} km/s ·{' '}
                  {telemetry.etaHours === 0
                    ? 'Now'
                    : telemetry.etaHours !== null
                    ? `${telemetry.etaHours}h`
                    : '—'}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#a3a9b8] leading-relaxed font-sans">
              {telemetry.advisory}
            </p>

            <button
              type="button"
              onClick={() => onOrderBunker(!crewInShelter)}
              className={`w-full h-9 px-3 rounded-lg font-sans font-medium text-xs transition-colors duration-150 inline-flex items-center justify-center gap-2 cursor-pointer ${
                crewInShelter
                  ? 'bg-[#1a1e28] border border-[#4cc38a]/50 text-[#4cc38a] hover:bg-[#1a1e28]/80'
                  : 'bg-[#eef0f5] hover:bg-white text-[#07080d]'
              }`}
            >
              {crewInShelter ? (
                <>
                  <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>Crew sheltered (-96% rad) · Recall crew</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>Bunker crew in shelter (-96% rad)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
