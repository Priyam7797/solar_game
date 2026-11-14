/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameState, GardenCropId, GardenState } from '../types/game';
import cropsJson from '../data/crops.json';

interface GardenGuideModalProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onUpdateGarden: (patch: Partial<GardenState>) => void;
}

export const GardenGuideModal: React.FC<GardenGuideModalProps> = ({
  state,
  isOpen,
  onClose,
  onUpdateGarden,
}) => {
  if (!isOpen) return null;

  const { garden } = state;
  const activeCrop = cropsJson.crops.find((c) => c.id === garden.selectedCrop) || cropsJson.crops[0];
  const isOptimal =
    garden.ledCycle === '16h-red-blue' &&
    garden.wateringMode === 'aeroponic-mist' &&
    garden.compostEnabled;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Space Garden Guide"
      data-testid="garden-guide-modal"
    >
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-2xl w-full max-h-[86vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
              GREENHOUSE BOTANY · NASA VEGGIE EDITION
            </span>
            <h3 className="text-lg font-bold text-white font-display">
              Astronaut Garden Guide & Food Crops
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Garden Guide"
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {/* 4 Space Crops Selector */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              1. Pick Active Greenhouse Crop
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cropsJson.crops.map((crop) => {
                const selected = garden.selectedCrop === crop.id;
                return (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => onUpdateGarden({ selectedCrop: crop.id as GardenCropId })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? 'bg-emerald-950/60 border-emerald-400 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xl">{crop.icon}</div>
                    <div className="text-xs font-bold mt-1">{crop.name}</div>
                    <div className="text-[10px] font-mono text-emerald-300 mt-0.5 tabular-nums">
                      {crop.growthSols} sols · +{crop.yieldKg} kg
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crop Illustrated Care & Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                2. Environment Settings
              </div>

              <div>
                <div className="text-[11px] text-slate-300 font-mono mb-1">LED Light Cycle</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['16h-red-blue', '16h Red+Blue'],
                      ['24h-white', '24h White'],
                      ['8h-low', '8h Low'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdateGarden({ ledCycle: id })}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-mono cursor-pointer ${
                        garden.ledCycle === id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 font-mono mb-1">Watering Mode</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['aeroponic-mist', 'Mist (-95% H₂O)'],
                      ['dry-save', 'Dry Save'],
                      ['flood-soil', 'Flood Water'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdateGarden({ wateringMode: id })}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-mono cursor-pointer ${
                        garden.wateringMode === id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUpdateGarden({ compostEnabled: !garden.compostEnabled })}
                className={`w-full py-2 px-3 rounded-lg border text-xs font-mono font-bold cursor-pointer ${
                  garden.compostEnabled
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {garden.compostEnabled ? '✓ Bio-Compost Nutrient Recycling ON' : 'Enable Bio-Compost Recycling'}
              </button>
            </div>

            {/* Illustrated Root & Canopy Health Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Crop Status: {activeCrop.icon} {activeCrop.name}
                </span>
                <span className="text-xs font-mono font-bold text-white tabular-nums">
                  Health {Math.round(garden.cropHealthPct)}%
                </span>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed">
                {activeCrop.nasaFact}
              </div>

              <div
                className={`rounded-lg p-2.5 text-xs font-mono border ${
                  isOptimal
                    ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                }`}
              >
                {isOptimal
                  ? '✓ NASA Garden Guide Active: +35% harvest speed & healthy root oxygen!'
                  : 'Tip: Set 16h Red+Blue LEDs + Aeroponic Mist + Bio-Compost to prevent root hypoxia in low gravity.'}
              </div>
            </div>
          </div>

          {/* Real NASA Fact Box */}
          <div className="bg-cyan-950/35 border border-cyan-500/35 rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold block mb-1">
              🛰️ REAL NASA VEGGIE FACT
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">{cropsJson.nasaVeggieFact}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
