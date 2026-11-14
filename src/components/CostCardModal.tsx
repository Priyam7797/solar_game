/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
      className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/80 flex items-center justify-center p-4"
      role="dialog"
      aria-label={`Cost Card for ${card.title}`}
      data-testid="cost-card-modal"
    >
      <div className="bg-slate-900 border border-cyan-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold block">
              ENGINEERING TRADE-OFF · COST CARD
            </span>
            <h3 className="text-lg font-bold text-white font-display mt-0.5">{card.title}</h3>
            <p className="text-xs text-slate-400">{card.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel Cost Card"
            className="text-slate-400 hover:text-white px-2 py-1 text-xs font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* GAIN / PAY / RISK cards */}
        <div className="space-y-2.5">
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
              ▲ WHAT YOU GAIN
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed font-sans">{card.gain}</p>
          </div>

          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-0.5">
              ▼ WHAT YOU PAY
            </div>
            <p className="text-xs text-amber-100 leading-relaxed font-sans">{card.pay}</p>
            {card.buildTimeSols !== undefined && (
              <div className="text-[11px] font-mono text-amber-300 mt-1">
                ⏱ Build Time: {card.buildTimeSols} Sols
              </div>
            )}
          </div>

          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-0.5">
              ⚠ WHAT IT MIGHT RISK LATER
            </div>
            <p className="text-xs text-rose-100 leading-relaxed font-sans">{card.risk}</p>
          </div>
        </div>

        {blocked && (
          <div className="text-xs font-mono text-rose-300 bg-rose-950/60 border border-rose-500/50 rounded-lg p-2.5">
            {missingMetal && <div>• Not enough Metal Alloy ({Math.round(state.resources.metalKg)} / {card.metalCost} kg)</div>}
            {missingRegolith && <div>• Not enough Regolith ({Math.round(state.resources.regolithMinedKg)} / {card.regolithCost} kg)</div>}
            {missingBattery && <div>• Battery too low ({Math.round(state.resources.batteryStoredKwh)} / {card.batteryCost} kWh)</div>}
            {missingO2 && <div>• Keep extra O₂ reserve before EVA trips!</div>}
          </div>
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg cursor-pointer"
          >
            Think Again
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={onConfirm}
            data-testid="confirm-cost-card-btn"
            className={`flex-1 py-2.5 px-4 text-xs font-mono font-bold rounded-lg transition-colors ${
              blocked
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer'
            }`}
          >
            Confirm Trade-Off →
          </button>
        </div>
      </div>
    </div>
  );
};
