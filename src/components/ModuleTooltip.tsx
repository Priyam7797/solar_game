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

export const ModuleTooltip: React.FC<ModuleTooltipProps> = ({ module, className = '' }) => {
  if (!module) return null;

  return (
    <div
      role="tooltip"
      className={`pointer-events-none bg-[#11141c] border border-[#eef0f5]/10 rounded-xl p-3 w-80 text-left space-y-2 z-50 text-[#eef0f5] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#eef0f5]/[0.08] pb-2">
        <div>
          <span className="text-xs font-mono text-[#7a8296] capitalize block">
            {module.category.replace('_', ' ')} specification
          </span>
          <h4 className="text-sm font-medium text-[#eef0f5] font-display">{module.name}</h4>
        </div>
        <div className="text-xs font-mono text-[#a3a9b8] bg-[#0b0d14] px-2 py-1 rounded-md border border-[#eef0f5]/[0.08] tabular-nums">
          {module.buildCost.regolithKg}R · {module.buildCost.metalKg}M
        </div>
      </div>

      <p className="text-xs text-[#a3a9b8] leading-snug font-sans">
        {module.description}
      </p>

      <div className="grid grid-cols-2 gap-2 bg-[#0b0d14] p-2.5 rounded-lg border border-[#eef0f5]/[0.08] text-xs font-mono tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-[#7a8296]">Power</span>
          <span
            className={
              module.powerNetKw > 0
                ? 'text-[#4cc38a]'
                : module.powerNetKw < 0
                ? 'text-[#e5484d]'
                : 'text-[#7a8296]'
            }
          >
            {module.powerNetKw > 0 ? `+${module.powerNetKw}` : module.powerNetKw} kW
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7a8296]">Oxygen</span>
          <span className={module.oxygenRateKg > 0 ? 'text-[#38bdf8]' : 'text-[#7a8296]'}>
            {module.oxygenRateKg > 0 ? `+${module.oxygenRateKg} kg/sol` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7a8296]">Water</span>
          <span
            className={
              module.waterRateL > 0
                ? 'text-[#38bdf8]'
                : module.waterRateL < 0
                ? 'text-[#e5484d]'
                : 'text-[#7a8296]'
            }
          >
            {module.waterRateL > 0
              ? `+${module.waterRateL} L/sol`
              : module.waterRateL < 0
              ? `${module.waterRateL} L/sol`
              : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7a8296]">Food</span>
          <span className={module.foodRateKg > 0 ? 'text-[#4cc38a]' : 'text-[#7a8296]'}>
            {module.foodRateKg > 0 ? `+${module.foodRateKg} kg/sol` : '—'}
          </span>
        </div>

        {module.radiationReductionPct > 0 && (
          <div className="col-span-2 flex items-center justify-between pt-1.5 border-t border-[#eef0f5]/[0.08]">
            <span className="text-[#7a8296]">Radiation shield</span>
            <span className="text-[#e5a93b]">
              -{module.radiationReductionPct}% ({module.shieldingRadiusM}m)
            </span>
          </div>
        )}

        {module.crewCapacity > 0 && (
          <div className="col-span-2 flex items-center justify-between">
            <span className="text-[#7a8296]">Crew quarters</span>
            <span className="text-[#38bdf8]">+{module.crewCapacity} astronauts</span>
          </div>
        )}
      </div>

      <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-lg p-2.5">
        <span className="text-xs font-mono text-[#7a8296] block mb-0.5">
          Engineering trade-off
        </span>
        <p className="text-xs text-[#a3a9b8] leading-snug">{module.stemConcept}</p>
      </div>
    </div>
  );
};
