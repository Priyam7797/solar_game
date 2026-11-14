/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, Leaf, Satellite, Sprout, Sun, Droplets, Wheat, X } from 'lucide-react';
import { GameState, GardenCropId, GardenState } from '../types/game';
import cropsJson from '../data/crops.json';

interface GardenGuideModalProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onUpdateGarden: (patch: Partial<GardenState>) => void;
}

function renderCropIcon(cropId: string, className = 'w-4 h-4 text-[#a3a9b8]') {
  switch (cropId) {
    case 'lettuce':
      return <Leaf className={className} strokeWidth={1.5} />;
    case 'radish':
      return <Sprout className={className} strokeWidth={1.5} />;
    case 'potato':
      return <Wheat className={className} strokeWidth={1.5} />;
    case 'beans':
    default:
      return <Sprout className={className} strokeWidth={1.5} />;
  }
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
      className="fixed inset-0 z-50 pointer-events-auto bg-[#07080d]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Space Garden Guide"
      data-testid="garden-guide-modal"
    >
      <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-2xl max-w-2xl w-full max-h-[86vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#eef0f5]/[0.08] bg-[#11141c] flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-[#7a8296] block">
              Greenhouse botany · NASA Veggie system
            </span>
            <h3 className="text-lg font-medium text-[#eef0f5] font-display mt-0.5">
              Astronaut garden guide & crops
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Garden Guide"
            className="p-2 rounded-lg bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5] transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* 4 Space Crops Selector */}
          <div>
            <div className="text-xs font-mono text-[#7a8296] mb-2">
              1. Pick active greenhouse crop
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {cropsJson.crops.map((crop) => {
                const selected = garden.selectedCrop === crop.id;
                return (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => onUpdateGarden({ selectedCrop: crop.id as GardenCropId })}
                    className={`p-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer ${
                      selected
                        ? 'bg-[#4cc38a]/[0.08] border-[#4cc38a]/50 text-[#eef0f5]'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:bg-[#1a1e28]'
                    }`}
                  >
                    <div>{renderCropIcon(crop.id, `w-4 h-4 ${selected ? 'text-[#4cc38a]' : 'text-[#a3a9b8]'}`)}</div>
                    <div className="text-xs font-medium text-[#eef0f5] mt-2">{crop.name}</div>
                    <div className="text-[11px] font-mono text-[#4cc38a] mt-1 tabular-nums">
                      {crop.growthSols} sols · +{crop.yieldKg} kg
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Environment & Crop Health */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#11141c] border border-[#eef0f5]/[0.08] rounded-xl p-4 space-y-3">
              <div className="text-xs font-mono text-[#a3a9b8]">2. Environment settings</div>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#7a8296] mb-1.5">
                  <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>LED light cycle</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['16h-red-blue', '16h R+B'],
                      ['24h-white', '24h White'],
                      ['8h-low', '8h Low'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdateGarden({ ledCycle: id })}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-mono transition-colors duration-150 cursor-pointer ${
                        garden.ledCycle === id
                          ? 'bg-[#38bdf8]/15 border-[#38bdf8]/50 text-[#eef0f5] font-medium'
                          : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#7a8296] hover:text-[#eef0f5]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#7a8296] mb-1.5">
                  <Droplets className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Watering mode</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['aeroponic-mist', 'Mist (-95%)'],
                      ['dry-save', 'Dry save'],
                      ['flood-soil', 'Flood'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdateGarden({ wateringMode: id })}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-mono transition-colors duration-150 cursor-pointer ${
                        garden.wateringMode === id
                          ? 'bg-[#4cc38a]/15 border-[#4cc38a]/50 text-[#eef0f5] font-medium'
                          : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#7a8296] hover:text-[#eef0f5]'
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
                className={`w-full py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer ${
                  garden.compostEnabled
                    ? 'bg-[#4cc38a]/15 border-[#4cc38a]/40 text-[#4cc38a]'
                    : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5]'
                }`}
              >
                {garden.compostEnabled && <Check className="w-3.5 h-3.5" strokeWidth={1.5} />}
                <span>
                  {garden.compostEnabled ? 'Bio-compost nutrient recycling on' : 'Enable bio-compost recycling'}
                </span>
              </button>
            </div>

            {/* Crop Health Card */}
            <div className="bg-[#11141c] border border-[#eef0f5]/[0.08] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[#eef0f5]">
                  {renderCropIcon(activeCrop.id, 'w-4 h-4 text-[#4cc38a]')}
                  <span>{activeCrop.name}</span>
                </div>
                <span className="text-xs font-mono font-medium text-[#eef0f5] tabular-nums">
                  Health {Math.round(garden.cropHealthPct)}%
                </span>
              </div>

              <p className="text-xs text-[#a3a9b8] leading-relaxed">
                {activeCrop.nasaFact}
              </p>

              <div
                className={`rounded-lg p-3 text-xs border leading-relaxed ${
                  isOptimal
                    ? 'bg-[#4cc38a]/[0.08] border-[#4cc38a]/30 text-[#4cc38a]'
                    : 'bg-[#e5a93b]/[0.08] border-[#e5a93b]/30 text-[#e5a93b]'
                }`}
              >
                {isOptimal
                  ? 'Optimal NASA Garden parameters active: +35% harvest speed and steady root oxygen.'
                  : 'Set 16h R+B LEDs, Mist watering, and Bio-compost to prevent root hypoxia in low gravity.'}
              </div>
            </div>
          </div>

          {/* NASA Veggie Fact */}
          <div className="bg-[#11141c] border border-[#eef0f5]/[0.08] rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#38bdf8] mb-1.5">
              <Satellite className="w-4 h-4" strokeWidth={1.5} />
              <span>NASA Veggie program note</span>
            </div>
            <p className="text-xs text-[#a3a9b8] leading-relaxed">{cropsJson.nasaVeggieFact}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
