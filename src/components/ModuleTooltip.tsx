/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ModuleDefinition } from '../types/game';

interface ModuleTooltipProps {
  module: ModuleDefinition | null;
  className?: string;
}

/**
 * Hover-based tooltip explaining the resource production/consumption trade-offs,
 * operational costs, and real-world STEM physical concepts before placing a module.
 */
export const ModuleTooltip: React.FC<ModuleTooltipProps> = ({ module, className = '' }) => {
  if (!module) return null;

  return (
    <div
      role="tooltip"
      className={`pointer-events-none bg-slate-900/98 border border-cyan-500/60 rounded-xl p-3 shadow-2xl w-80 text-left space-y-2 z-50 text-slate-100 animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {/* Title & Category Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold block">
            {module.category.replace('_', ' ')} SPECIFICATION
          </span>
          <h4 className="text-xs font-bold text-white font-display">{module.name}</h4>
        </div>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          COST: {module.buildCost.regolithKg}R · {module.buildCost.metalKg}M
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-300 leading-snug font-sans">
        {module.description}
      </p>

      {/* Resource Trade-Offs Matrix */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 text-[10px] font-mono">
        {/* Power Trade-off */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Power:</span>
          <span
            className={`font-bold tabular-nums ${
              module.powerNetKw > 0
                ? 'text-emerald-400'
                : module.powerNetKw < 0
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {module.powerNetKw > 0 ? `+${module.powerNetKw}` : module.powerNetKw} kW
          </span>
        </div>

        {/* Oxygen Trade-off */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Oxygen:</span>
          <span
            className={`font-bold tabular-nums ${
              module.oxygenRateKg > 0 ? 'text-sky-300' : 'text-slate-500'
            }`}
          >
            {module.oxygenRateKg > 0 ? `+${module.oxygenRateKg} kg/sol` : '—'}
          </span>
        </div>

        {/* Water Trade-off */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Water:</span>
          <span
            className={`font-bold tabular-nums ${
              module.waterRateL > 0
                ? 'text-blue-400'
                : module.waterRateL < 0
                ? 'text-rose-400'
                : 'text-slate-500'
            }`}
          >
            {module.waterRateL > 0
              ? `+${module.waterRateL} L/sol`
              : module.waterRateL < 0
              ? `${module.waterRateL} L/sol`
              : '—'}
          </span>
        </div>

        {/* Food Yield */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Food:</span>
          <span
            className={`font-bold tabular-nums ${
              module.foodRateKg > 0 ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {module.foodRateKg > 0 ? `+${module.foodRateKg} kg/sol` : '—'}
          </span>
        </div>

        {/* Radiation Shielding */}
        {module.radiationReductionPct > 0 && (
          <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-slate-400">Radiation Shield:</span>
            <span className="text-amber-400 font-bold tabular-nums">
              -{module.radiationReductionPct}% Rads ({module.shieldingRadiusM}m radius)
            </span>
          </div>
        )}

        {/* Crew Capacity */}
        {module.crewCapacity > 0 && (
          <div className="col-span-2 flex items-center justify-between">
            <span className="text-slate-400">Crew Quarters:</span>
            <span className="text-cyan-300 font-bold tabular-nums">
              +{module.crewCapacity} Astronauts
            </span>
          </div>
        )}
      </div>

      {/* STEM Engineering Trade-Off Insight */}
      <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-2">
        <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-300 font-bold block mb-0.5">
          Engineering Trade-Off
        </span>
        <p className="text-[10px] text-slate-300 leading-snug">
          {module.stemConcept}
        </p>
      </div>
    </div>
  );
};
