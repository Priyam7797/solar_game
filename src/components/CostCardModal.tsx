/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Clock, X } from 'lucide-react';
import { CostCardSpec, GameState } from '../types/game';

interface CostCardModalProps {
  card: CostCardSpec | null;
  state: GameState;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CostCardModal: React.FC<CostCardModalProps> = ({
  card,
  state,
  onConfirm,
  onCancel,
}) => {
  if (!card) return null;

  const missingRegolith =
    card.regolithCost !== undefined && state.resources.regolithMinedKg < card.regolithCost;
  const missingMetal =
    card.metalCost !== undefined && state.resources.metalKg < card.metalCost;
  const missingBattery =
    card.batteryCost !== undefined && state.resources.batteryStoredKwh < card.batteryCost;
  const missingO2 =
    card.oxygenCost !== undefined && state.resources.oxygenKg < card.oxygenCost + 4;
  const blocked = missingRegolith || missingMetal || missingBattery || missingO2;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-[#07080d]/80 flex items-center justify-center p-4"
      role="dialog"
      aria-label={`Cost Card for ${card.title}`}
      data-testid="cost-card-modal"
    >
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-[#7a8296] block">
              Engineering trade-off · Cost card
            </span>
            <h3 className="text-lg font-medium text-[#eef0f5] font-display mt-1">{card.title}</h3>
            <p className="text-xs text-[#a3a9b8] mt-1">{card.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel Cost Card"
            className="text-[#7a8296] hover:text-[#eef0f5] p-1.5 rounded-lg hover:bg-[#1a1e28] cursor-pointer transition-colors duration-150"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#4cc38a]">
              <ArrowUp className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>What you gain</span>
            </div>
            <p className="text-xs text-[#eef0f5] leading-relaxed font-sans">{card.gain}</p>
          </div>

          <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#e5a93b]">
              <ArrowDown className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>What you pay</span>
            </div>
            <p className="text-xs text-[#eef0f5] leading-relaxed font-sans">{card.pay}</p>
            {card.buildTimeSols !== undefined && (
              <div className="text-xs font-mono text-[#a3a9b8] pt-1 flex items-center gap-1.5 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
                <span>Build time: {card.buildTimeSols} Sols</span>
              </div>
            )}
          </div>

          <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#e5484d]">
              <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>What it might risk later</span>
            </div>
            <p className="text-xs text-[#eef0f5] leading-relaxed font-sans">{card.risk}</p>
          </div>
        </div>

        {blocked && (
          <div className="text-xs font-mono text-[#e5484d] bg-[#0b0d14] border border-[#e5484d]/40 rounded-lg p-3 space-y-1 tabular-nums">
            {missingMetal && <div>Insufficient Metal Alloy ({Math.round(state.resources.metalKg)} / {card.metalCost} kg)</div>}
            {missingRegolith && <div>Insufficient Regolith ({Math.round(state.resources.regolithMinedKg)} / {card.regolithCost} kg)</div>}
            {missingBattery && <div>Battery too low ({Math.round(state.resources.batteryStoredKwh)} / {card.batteryCost} kWh)</div>}
            {missingO2 && <div>Keep extra O₂ reserve before EVA trips</div>}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-sans font-medium rounded-lg cursor-pointer transition-colors duration-150"
          >
            Think again
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={onConfirm}
            data-testid="confirm-cost-card-btn"
            className={`flex-1 h-9 px-4 text-xs font-sans font-medium rounded-lg transition-colors duration-150 inline-flex items-center justify-center gap-2 ${
              blocked
                ? 'bg-[#1a1e28] text-[#7a8296] cursor-not-allowed'
                : 'bg-[#eef0f5] hover:bg-white text-[#07080d] cursor-pointer'
            }`}
          >
            <span>Confirm trade-off</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
