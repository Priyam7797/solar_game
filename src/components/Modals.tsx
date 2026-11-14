/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { GameState } from '../types/game';
import { SCENARIOS } from '../game/modulesData';
import { MissionDebrief } from './MissionDebrief';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToTitle,
}) => {
  return (
    <div className="absolute inset-0 bg-[#07080d]/80 z-30 flex items-center justify-center p-4">
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-sm w-full p-6 space-y-5 text-center">
        <div>
          <span className="text-xs font-mono text-[#7a8296] block">
            Mission suspended
          </span>
          <h2 className="text-2xl font-medium text-[#eef0f5] font-display mt-1">Simulation paused</h2>
        </div>

        <p className="text-xs text-[#a3a9b8] leading-relaxed">
          Review Cost Cards, Life Support, or Research while simulation time is held. Resume when the crew is ready.
        </p>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onResume}
            className="w-full h-10 px-4 bg-[#eef0f5] hover:bg-white text-[#07080d] font-medium text-sm rounded-lg transition-colors duration-150 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Resume mission</span>
            <kbd className="text-xs font-mono bg-[#07080d]/10 border border-[#07080d]/15 px-1.5 py-0.5 rounded-md">
              Esc
            </kbd>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full h-9 px-4 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#eef0f5] font-medium text-xs rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Restart current mission
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full h-8 px-4 text-[#a3a9b8] hover:text-[#eef0f5] text-xs transition-colors duration-150 cursor-pointer"
          >
            Return to site selection
          </button>
        </div>
      </div>
    </div>
  );
};

interface OutcomeModalProps {
  state: GameState;
  onPlayAgain: () => void;
  onReturnToTitle: () => void;
  onOpenDebrief?: () => void;
}

export const VictoryModal: React.FC<OutcomeModalProps> = ({
  state,
  onPlayAgain,
  onReturnToTitle,
  onOpenDebrief,
}) => {
  const scenario = SCENARIOS[state.scenario];

  return (
    <div
      className="absolute inset-0 bg-[#07080d]/85 z-30 flex items-center justify-center p-4"
      data-testid="victory-modal"
    >
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-2xl w-full p-6 space-y-4">
        <div className="text-center">
          <span className="text-xs font-mono text-[#4cc38a] block">
            Mission debrief · Outpost complete
          </span>
          <h2 className="text-2xl font-medium text-[#eef0f5] font-display mt-1">
            Outpost operations completed
          </h2>
          <p className="text-xs text-[#a3a9b8] mt-1">
            Completed {state.targetSols || scenario.targetSols} Sols at {state.planet === 'moon' ? 'Shackleton Crater, Moon' : 'Jezero Crater, Mars'} ({state.difficulty} difficulty).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0b0d14] p-3 rounded-xl border border-[#eef0f5]/[0.08] text-center">
          <div>
            <div className="text-xs font-mono text-[#7a8296]">Sols</div>
            <div className="text-base font-medium text-[#eef0f5] tabular-nums">{state.environment.solNumber}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-[#7a8296]">Fresh food</div>
            <div className="text-base font-medium text-[#4cc38a] tabular-nums">
              {Math.round(state.stats.foodHarvestedKg)} kg
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-[#7a8296]">Water saved</div>
            <div className="text-base font-medium text-[#38bdf8] tabular-nums">
              {Math.round(state.stats.waterRecycledLiters)} L
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-[#7a8296]">Crew dose</div>
            <div className="text-base font-medium text-[#eef0f5] tabular-nums">
              {Math.round(state.stats.maxDoseMsv)} mSv
            </div>
          </div>
        </div>

        {onOpenDebrief ? (
          <button
            type="button"
            onClick={onOpenDebrief}
            data-testid="reopen-debrief-btn"
            className="w-full h-10 px-4 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#38bdf8]/40 text-[#eef0f5] font-mono text-xs rounded-lg inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer tabular-nums"
          >
            <BarChart3 className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.5} />
            <span>Open mission debrief &amp; take-home report ({state.decisionTimeline.length} decisions)</span>
          </button>
        ) : (
          <MissionDebrief
            state={state}
            mode="embedded"
            realPlannerAnswerOverride="NASA mission planners balance backup nuclear power (Kilopower), closed-loop water recycling, and Storm Shelters so solar storms or dust storms do not threaten the crew."
            tryNextTipOverride="Try Mars or Commander difficulty next to manage 3 to 22 minute Earth radio delays and tighter resource buffers."
          />
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 h-10 px-4 bg-[#eef0f5] hover:bg-white text-[#07080d] font-medium text-sm rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Play again / Next mission
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="h-10 px-4 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] font-medium text-xs rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Switch Moon / Mars
          </button>
        </div>
      </div>
    </div>
  );
};

export const GameOverModal: React.FC<OutcomeModalProps> = ({
  state,
  onPlayAgain,
  onReturnToTitle,
  onOpenDebrief,
}) => {
  let failureCause = 'Life support recovery triggered';
  let stemAdvice =
    'Build backup Kilopower or Battery Banks early so Oxygen recycling stays steady during nights or dust storms.';
  let tryNext = 'Respond to Chain-Reaction warnings early and build a Greenhouse before stored food rations run low.';

  if (state.resources.oxygenKg <= 0.5) {
    failureCause = 'Low Oxygen reserve';
    stemAdvice =
      'When batteries hit 0%, water electrolysis shuts off and stops making O₂. Keep Power positive first.';
    tryNext = 'Add a Battery Bank or Kilopower Backup before expanding heavy modules.';
  } else if (state.resources.waterLiters <= 0.5) {
    failureCause = 'Low Water reserve';
    stemAdvice =
      'Even 95% water recycling needs ice refills or fewer heavy consumers when Greenhouse water demand grows.';
    tryNext = 'Use Aeroponic Mist in the Garden Guide (95% less water) and send Rover ice trips.';
  } else if (state.crew.radiationDoseMsv > 260) {
    failureCause = 'Radiation safety limit exceeded';
    stemAdvice =
      'Real NASA crews shelter behind water walls or sintered regolith domes as soon as DONKI detects a solar flare.';
    tryNext = 'Select Bunker Crew as soon as the flare risk badge turns amber or red.';
  }

  return (
    <div
      className="absolute inset-0 bg-[#07080d]/85 z-30 flex items-center justify-center p-4"
      data-testid="gameover-modal"
    >
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-2xl w-full p-6 space-y-4">
        <div className="text-center">
          <span className="text-xs font-mono text-[#e5a93b] block">
            Mission debrief · Crew evacuated safely
          </span>
          <h2 className="text-2xl font-medium text-[#eef0f5] font-display mt-1">
            Training setback: {failureCause}
          </h2>
          <p className="text-xs text-[#a3a9b8] mt-1 tabular-nums">
            Astronauts returned safely to orbit after {state.environment.solNumber} Sols. Review NASA planner guidance below.
          </p>
        </div>

        {onOpenDebrief ? (
          <button
            type="button"
            onClick={onOpenDebrief}
            data-testid="reopen-debrief-btn"
            className="w-full h-10 px-4 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#38bdf8]/40 text-[#eef0f5] font-mono text-xs rounded-lg inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer tabular-nums"
          >
            <BarChart3 className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.5} />
            <span>Open mission debrief &amp; take-home report ({state.decisionTimeline.length} decisions)</span>
          </button>
        ) : (
          <MissionDebrief
            state={state}
            mode="embedded"
            realPlannerAnswerOverride={stemAdvice}
            tryNextTipOverride={tryNext}
          />
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 h-10 px-4 bg-[#eef0f5] hover:bg-white text-[#07080d] font-medium text-sm rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Try again with new plan
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="h-10 px-4 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] font-medium text-xs rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Site selection
          </button>
        </div>
      </div>
    </div>
  );
};
