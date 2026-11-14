/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
    <div className="absolute inset-0 bg-slate-950/80 z-30 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            MISSION SUSPENDED
          </span>
          <h2 className="text-2xl font-bold text-white font-display mt-1">Simulation Paused</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Take your time checking Cost Cards, Life Support, or Research. Press Resume whenever your crew is ready!
        </p>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-lg transition-colors cursor-pointer"
          >
            Resume Mission [Esc]
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Restart Current Mission
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          >
            Return to Site Selection
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
      className="absolute inset-0 bg-slate-950/85 z-30 flex items-center justify-center p-4"
      data-testid="victory-modal"
    >
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
        <div className="text-center">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold block">
            MISSION DEBRIEF · OUTPOST COMPLETE
          </span>
          <h2 className="text-2xl font-bold text-white font-display mt-0.5">
            Congratulations Commander — Crew Thrived!
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Completed {state.targetSols || scenario.targetSols} Sols at {state.planet === 'moon' ? 'Shackleton Crater, Moon' : 'Jezero Crater, Mars'} ({state.difficulty} difficulty).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">SOLS</div>
            <div className="text-base font-bold text-white tabular-nums">{state.environment.solNumber}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">FRESH FOOD</div>
            <div className="text-base font-bold text-emerald-400 tabular-nums">
              {Math.round(state.stats.foodHarvestedKg)} kg
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">WATER SAVED</div>
            <div className="text-base font-bold text-sky-400 tabular-nums">
              {Math.round(state.stats.waterRecycledLiters)} L
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">CREW DOSE</div>
            <div className="text-base font-bold text-cyan-400 tabular-nums">
              {Math.round(state.stats.maxDoseMsv)} mSv
            </div>
          </div>
        </div>

        {onOpenDebrief ? (
          <button
            type="button"
            onClick={onOpenDebrief}
            data-testid="reopen-debrief-btn"
            className="w-full py-2.5 px-4 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/60 text-cyan-200 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            📊 Open Mission Debrief &amp; Take-Home Report ({state.decisionTimeline.length} Decisions)
          </button>
        ) : (
          <MissionDebrief
            state={state}
            mode="embedded"
            realPlannerAnswerOverride="NASA mission planners balance backup nuclear power (Kilopower), closed-loop water recycling, and Storm Shelters so solar storms or dust storms never catch the crew off guard."
            tryNextTipOverride="Try Mars or Commander difficulty next to master 3–22 minute Earth radio delays and tighter resource buffers!"
          />
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg transition-colors cursor-pointer"
          >
            Play Again / Next Mission
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors cursor-pointer"
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
  let failureCause = 'Life Support Recovery Triggered';
  let stemAdvice =
    'Build backup Kilopower or Battery Banks early so Oxygen recycling never stops during nights or dust storms.';
  let tryNext = 'Check the Chain-Reaction alert early and build a Greenhouse before stored food rations shrink!';

  if (state.resources.oxygenKg <= 0.5) {
    failureCause = 'Low Oxygen Reserve';
    stemAdvice =
      'When batteries hit 0%, water electrolysis shuts off and stops making O₂! Keep Power green first.';
    tryNext = 'Add a Battery Bank or Kilopower Backup before expanding heavy modules.';
  } else if (state.resources.waterLiters <= 0.5) {
    failureCause = 'Low Water Reserve';
    stemAdvice =
      'Even 95% water recycling needs ice refills or fewer heavy consumers when Greenhouse water demand grows.';
    tryNext = 'Follow the Garden Guide (Aeroponic Mist uses 95% less water) and send Rover ice trips!';
  } else if (state.crew.radiationDoseMsv > 260) {
    failureCause = 'Radiation Safety Limit Exceeded';
    stemAdvice =
      'Real NASA crews shelter behind water walls or sintered regolith domes as soon as DONKI spots a solar flare.';
    tryNext = 'Hit BUNKER CREW as soon as the Flare Risk indicator turns amber/red!';
  }

  return (
    <div
      className="absolute inset-0 bg-slate-950/85 z-30 flex items-center justify-center p-4"
      data-testid="gameover-modal"
    >
      <div className="bg-slate-900 border border-amber-500/60 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
        <div className="text-center">
          <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-semibold block">
            MISSION DEBRIEF · CREW EVACUATED SAFELY
          </span>
          <h2 className="text-2xl font-bold text-white font-display mt-0.5">
            Training Setback: {failureCause}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Your astronauts returned safely to orbit after {state.environment.solNumber} Sols — let’s see what NASA planners recommend!
          </p>
        </div>

        {onOpenDebrief ? (
          <button
            type="button"
            onClick={onOpenDebrief}
            data-testid="reopen-debrief-btn"
            className="w-full py-2.5 px-4 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/60 text-cyan-200 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            📊 Open Mission Debrief &amp; Take-Home Report ({state.decisionTimeline.length} Decisions)
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
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg transition-colors cursor-pointer"
          >
            Try Again With New Plan
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Site Selection
          </button>
        </div>
      </div>
    </div>
  );
};
