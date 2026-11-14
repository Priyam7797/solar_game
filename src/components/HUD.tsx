/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  CostCardSpec,
  GameState,
  GardenState,
  ModuleCategory,
  ModuleTypeId,
} from '../types/game';
import { MODULE_CATALOG, SCENARIOS } from '../game/modulesData';
import {
  CoreMeterDisplay,
  SESSION_LENGTH_PRESETS,
  calculateTimeCompression,
  formatInGameDayDuration,
  formatRealSecondRate,
  getCoreMetersSummary,
} from '../game/simulation';
import { sound } from '../game/audio';
import {
  CriticalResourceNotification,
  MonitoredResourceId,
  ResourcePulseColor,
  detectCriticalResourceNotifications,
  getOxygenAndWaterStatuses,
  getResourcePulseClass,
} from '../game/resourceAlerts';
import { MissionLogPanel } from './MissionLogPanel';
import { ResearchTreeModal } from './ResearchTreeModal';
import { TechId } from '../game/researchData';
import { SolarFlareHazardOverlay } from './SolarFlareHazardOverlay';
import { DonkiFlareRecord, isHighSolarFlareRisk } from '../game/spaceWeatherData';
import { GlossaryModal, GlossaryTerm } from './GlossaryPopover';
import { CostCardModal } from './CostCardModal';
import { AriaGuideBar } from './AriaGuideBar';
import { CrisisPuzzleModal } from './CrisisPuzzleModal';
import { GardenGuideModal } from './GardenGuideModal';
import { PriorityBoardModal } from './PriorityBoardModal';
import { DataSourcesModal } from './DataSourcesModal';
import { CoopClassroomModal } from './CoopClassroomModal';
import { MissionDebrief } from './MissionDebrief';

interface HUDProps {
  state: GameState;
  pendingCostCard: CostCardSpec | null;
  onConfirmCostCard: () => void;
  onCancelCostCard: () => void;
  onOpenModuleCostCard: (typeId: ModuleTypeId) => void;
  onOpenRoverCostCard: () => void;
  onSetTimeSpeed: (speed: 1 | 2 | 5 | 10) => void;
  onUpdateTimeCompression: (targetSessionMinutes: number, missionDaysOverride?: number) => void;
  onTogglePause: () => void;
  onToggleAudio: () => void;
  onToggleAriaVoice: () => void;
  onAskMissionControl: () => void;
  onStartPlacement: (typeId: ModuleTypeId | null) => void;
  activePlacementType: ModuleTypeId | null;
  onSelectModule: (instanceId: string | null) => void;
  onToggleModuleActive: (instanceId: string) => void;
  onUpgradeRegolith: (instanceId: string) => void;
  onCleanPanels: () => void;
  onOrderBunker: (inShelter: boolean) => void;
  onResolveCrisis: (crisisId: string, solved: boolean) => void;
  onUpdateGarden: (patch: Partial<GardenState>) => void;
  onSubmitPriority: (orderedIds: string[]) => void;
  onApplyLiveDonki: (rec: DonkiFlareRecord | null, sourceBadge: 'LIVE' | 'ARCHIVED') => void;
  onTriggerTeacherFlareDrill: () => void;
  isMissionLogOpen: boolean;
  onToggleMissionLog: () => void;
  isResearchTreeOpen: boolean;
  onToggleResearchTree: () => void;
  onUnlockTech: (techId: TechId) => void;
  tutorialActiveStepId?: string | null;
  onRestartTutorial?: () => void;
}

const meterBorderClass: Record<'green' | 'yellow' | 'red', string> = {
  green: 'border-emerald-500/40 bg-emerald-950/20',
  yellow: 'border-amber-500/50 bg-amber-950/25',
  red: 'border-rose-500/70 bg-rose-950/35',
};

const meterBadgeClass: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  yellow: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  red: 'bg-rose-500/25 text-rose-200 border-rose-500/50',
};

const meterBarClass: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  red: 'bg-rose-500',
};

const meterDotClass: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400 animate-pulse',
  red: 'bg-rose-400 animate-ping',
};

export const HUD: React.FC<HUDProps> = ({
  state,
  pendingCostCard,
  onConfirmCostCard,
  onCancelCostCard,
  onOpenModuleCostCard,
  onOpenRoverCostCard,
  onSetTimeSpeed,
  onUpdateTimeCompression,
  onTogglePause,
  onToggleAudio,
  onToggleAriaVoice,
  onAskMissionControl,
  onStartPlacement,
  activePlacementType,
  onSelectModule,
  onToggleModuleActive,
  onUpgradeRegolith,
  onCleanPanels,
  onOrderBunker,
  onResolveCrisis,
  onUpdateGarden,
  onSubmitPriority,
  onApplyLiveDonki,
  onTriggerTeacherFlareDrill,
  isMissionLogOpen,
  onToggleMissionLog,
  isResearchTreeOpen,
  onToggleResearchTree,
  onUnlockTech,
  tutorialActiveStepId,
  onRestartTutorial,
}) => {
  const [activeCategory, setActiveCategory] = useState<ModuleCategory | 'all'>('all');
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isCompressionOpen, setIsCompressionOpen] = useState(false);
  const [isLifeSupportExpanded, setIsLifeSupportExpanded] = useState(false);
  const [isGardenOpen, setIsGardenOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isCoopOpen, setIsCoopOpen] = useState(false);
  const [isDebriefOpen, setIsDebriefOpen] = useState(false);
  const [genericTooltip, setGenericTooltip] = useState<string | null>(null);
  const [criticalNotice, setCriticalNotice] = useState<CriticalResourceNotification | null>(null);
  const prevResourceStatusesRef = useRef<Partial<Record<MonitoredResourceId, ResourcePulseColor>>>({});

  useEffect(() => {
    if (tutorialActiveStepId === 'module_placement') {
      setIsDockCollapsed(false);
    }
  }, [tutorialActiveStepId]);

  const selectedModule = state.modules.find((m) => m.instanceId === state.selectedModuleId);
  const selectedDef = selectedModule ? MODULE_CATALOG[selectedModule.typeId] : null;
  const compression = state.timeCompression;
  const effectiveRatio = Math.round(compression.ratio * state.timeSpeed);

  const solTime = state.environment.solTime;
  const isDaytime =
    !(state.planet === 'moon' && state.environment.isLunarNightCycle) &&
    solTime >= 0.25 &&
    solTime <= 0.75;

  const coreMeters = getCoreMetersSummary(state);
  const { oxygenStatus, waterStatus } = getOxygenAndWaterStatuses(state);
  const flareTelemetry = state.environment.solarFlareTelemetry;
  const highFlareRisk = isHighSolarFlareRisk(flareTelemetry);

  useEffect(() => {
    if (state.phase !== 'playing') {
      prevResourceStatusesRef.current = {};
      setCriticalNotice(null);
      return;
    }

    const alerts = detectCriticalResourceNotifications(
      prevResourceStatusesRef.current,
      coreMeters,
      state
    );

    prevResourceStatusesRef.current = {
      power: coreMeters.power.status,
      life_support: coreMeters.life_support.status,
      food: coreMeters.food.status,
    };

    if (alerts.length > 0) {
      setCriticalNotice(alerts[0]);
      sound.playAlarm();
    }
  }, [
    state.phase,
    coreMeters.power.status,
    coreMeters.life_support.status,
    coreMeters.food.status,
    oxygenStatus,
    waterStatus,
  ]);

  useEffect(() => {
    if (!criticalNotice) return;
    const timer = window.setTimeout(() => {
      setCriticalNotice(null);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [criticalNotice]);

  // Build dock shows 10 core items + unlocked Science Lab/Fusion when researched
  const dockModuleIds = (Object.keys(MODULE_CATALOG) as ModuleTypeId[]).filter((id) => {
    const def = MODULE_CATALOG[id];
    const showInDock = def.inBuildDock || id === 'science_lab' || id === 'fusion_reactor';
    if (!showInDock) return false;
    return activeCategory === 'all' || def.category === activeCategory;
  });

  const nextUpcomingEvents = state.upcomingEvents.filter((e) => !e.resolved).slice(0, 2);

  const renderCoreMeterCard = (m: CoreMeterDisplay, extra?: React.ReactNode) => {
    const isMonitored = m.id === 'power' || m.id === 'life_support' || m.id === 'food';
    const pulseClass = isMonitored ? getResourcePulseClass(m.status) : '';

    return (
      <div
        key={m.id}
        data-testid={`core-meter-${m.id}`}
        data-resource-status={m.status}
        className={`rounded-xl border p-2.5 space-y-1.5 transition-colors ${meterBorderClass[m.status]} ${pulseClass}`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full shrink-0 ${meterDotClass[m.status]}`}
            />
            <span className="text-[11px] font-mono font-bold text-white tracking-wide truncate">
              {m.label}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold shrink-0 ${meterBadgeClass[m.status]}`}
          >
            <span aria-hidden="true">{m.statusIcon}</span>
            <span>{m.statusLabel}</span>
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-1 text-xs font-mono">
          <span className="text-slate-100 font-bold tabular-nums truncate">{m.amountText}</span>
          <span className="text-[10px] text-cyan-300 tabular-nums shrink-0">{m.changePerSolText}</span>
        </div>

        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${meterBarClass[m.status]}`}
            style={{ width: `${Math.max(4, Math.min(100, m.pct))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
          <span>Remaining:</span>
          <span className="font-semibold text-white tabular-nums">{m.solsRemainingText}</span>
        </div>
        {extra}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* 1. TOP PERIMETER BAR */}
      <div className="relative z-10 flex items-start justify-between gap-2.5 flex-wrap xl:flex-nowrap">
        {/* Top-Left: Site Cycle, Sols, Weather & Upcoming Event Timeline */}
        <div className="pointer-events-auto bg-slate-900/92 border border-slate-800 rounded-xl px-3 py-2 shadow-lg shrink-0 space-y-1 max-w-xs">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                state.planet === 'moon' ? 'bg-slate-300' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-bold font-mono tracking-wider text-white uppercase">
              {state.planet === 'moon' ? 'MOON · SHACKLETON CRATER' : 'MARS · JEZERO CRATER'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono whitespace-nowrap">
            <span className="text-cyan-400 font-bold text-xs tabular-nums">
              <GlossaryTerm termKey="sol" label={`SOL ${state.environment.solNumber}/${state.targetSols}`} />
            </span>
            <span>·</span>
            <span>
              {state.planet === 'moon' && state.environment.isLunarNightCycle
                ? `🌑 LUNAR NIGHT (${state.environment.lunarPhaseDay}/28)`
                : isDaytime
                ? '☀️ DAYLIGHT'
                : '🌑 NIGHT'}
            </span>
            <span>·</span>
            <span className="tabular-nums">{Math.round(state.environment.ambientTemperatureC)}°C</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono tabular-nums whitespace-nowrap">
            <span className="text-slate-400">DONKI SWx:</span>
            <span
              className={`font-bold uppercase ${
                flareTelemetry.riskLevel === 'critical'
                  ? 'text-rose-400'
                  : flareTelemetry.riskLevel === 'high'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {flareTelemetry.flareClass} ({flareTelemetry.riskLevel})
            </span>
            <span className="px-1 py-0.2 rounded bg-slate-800 text-amber-300 font-bold text-[9px]">
              {flareTelemetry.sourceBadge}
            </span>
          </div>

          {nextUpcomingEvents.length > 0 && (
            <div className="pt-1 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono text-slate-400 uppercase">UPCOMING:</span>
              {nextUpcomingEvents.map((ev) => (
                <span
                  key={ev.id}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-200"
                >
                  Sol {ev.triggerSol}: {ev.title.split('(')[0].trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top-Center: Simulation Speed (1x-10x) & Academy Tool Bar */}
        <div className="pointer-events-auto relative flex flex-col items-center gap-1.5 shrink-0">
          <div
            data-tutorial-target="time-controls"
            className="bg-slate-900/92 border border-slate-800 rounded-xl p-1.5 shadow-lg flex items-center gap-1 whitespace-nowrap"
          >
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={state.paused ? 'Resume simulation' : 'Pause simulation'}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer ${
                state.paused
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {state.paused ? '▶ RESUME' : '❚❚ PAUSE'}
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

            {([1, 2, 5, 10] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onSetTimeSpeed(spd)}
                className={`px-2 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                  state.timeSpeed === spd && !state.paused
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {spd}x
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsCompressionOpen((prev) => !prev)}
              aria-label="Configure Time Compression Ratio"
              className={`px-2 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer tabular-nums ${
                isCompressionOpen
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-cyan-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              ⏱ {effectiveRatio}×
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

            <button
              type="button"
              onClick={onToggleMissionLog}
              aria-label={isMissionLogOpen ? 'Close Mission Log' : 'Open Mission Log'}
              className={`px-2 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                isMissionLogOpen
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              📜 LOG ({state.eventLog.length})
            </button>

            <button
              type="button"
              onClick={onToggleResearchTree}
              aria-label={isResearchTreeOpen ? 'Close Research Tree' : 'Open Research Tree'}
              className={`px-2 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                isResearchTreeOpen
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-amber-300 hover:bg-slate-800'
              }`}
            >
              🔬 R&amp;D ({Math.floor(state.resources.sciencePoints)})
            </button>

            <button
              type="button"
              onClick={onToggleAudio}
              aria-label={state.audioMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="px-2 py-1 text-xs font-mono text-slate-300 hover:text-white rounded-md hover:bg-slate-800 cursor-pointer"
            >
              {state.audioMuted ? '🔇' : '🔊'}
            </button>
          </div>

          {/* Second Compact Row: Priority Board, Garden Guide, Health & Data Sources, Co-op, Space Terms */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 shadow flex items-center gap-1.5 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setIsPriorityOpen(true)}
              data-testid="open-priority-btn"
              className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-950 border border-slate-700 hover:border-amber-400 text-amber-300 cursor-pointer"
            >
              📋 Priority Board {state.priorityBoard.completedForSol ? '✓' : '!'}
            </button>
            <button
              type="button"
              onClick={() => setIsGardenOpen(true)}
              data-testid="open-garden-btn"
              className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-950 border border-slate-700 hover:border-emerald-400 text-emerald-300 cursor-pointer"
            >
              🌱 Garden Guide
            </button>
            <button
              type="button"
              onClick={() => setIsDataSourcesOpen(true)}
              data-testid="open-sources-btn"
              className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-950 border border-slate-700 hover:border-cyan-400 text-cyan-300 cursor-pointer"
            >
              🧬 Health &amp; NASA Sources
            </button>
            <button
              type="button"
              onClick={() => setIsDebriefOpen(true)}
              data-testid="open-debrief-btn"
              className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-950 border border-slate-700 hover:border-cyan-400 text-cyan-200 cursor-pointer"
            >
              📊 Debrief ({state.decisionTimeline.length})
            </button>
            <button
              type="button"
              onClick={() => setIsCoopOpen(true)}
              data-testid="open-coop-btn"
              className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-200 cursor-pointer"
            >
              🤝 Co-op
            </button>
            <button
              type="button"
              onClick={() => setIsGlossaryOpen(true)}
              data-testid="open-glossary-btn"
              className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-200 cursor-pointer"
            >
              ❓ Terms
            </button>
            {onRestartTutorial && (
              <button
                type="button"
                onClick={onRestartTutorial}
                aria-label="Replay 60-second mission tutorial"
                className="px-2 py-1 text-[11px] font-mono rounded-lg bg-slate-950 border border-slate-700 hover:border-cyan-400 text-cyan-300 cursor-pointer"
              >
                60s Guide
              </button>
            )}
          </div>

          {isCompressionOpen && (
            <div className="absolute top-full mt-2 w-[25rem] bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl z-50 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white font-mono">
                  Time Compression Calculator
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCompressionOpen(false)}
                  aria-label="Close Time Compression Panel"
                  className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="text-[10px] font-mono bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 tabular-nums">
                ratio = ({state.targetSols} days × 86,400s) / {compression.targetSessionMinutes * 60}s ={' '}
                <span className="text-amber-300 font-bold">{Math.round(compression.ratio)}×</span>
              </div>
              <div className="space-y-1">
                {SESSION_LENGTH_PRESETS.map((mins) => {
                  const row = calculateTimeCompression(state.targetSols, mins);
                  const isCurrent = compression.targetSessionMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onUpdateTimeCompression(mins)}
                      className={`w-full flex items-center justify-between text-xs font-mono px-2.5 py-1.5 rounded-lg cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500/20 border border-cyan-400 text-white font-bold'
                          : 'bg-slate-900 border border-transparent text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{mins === 180 ? '3 h' : `${mins} min`}</span>
                      <span className="text-amber-300">{Math.round(row.ratio)}×</span>
                      <span className="text-cyan-300">1s = {formatRealSecondRate(row)}</span>
                      <span>1 Sol = {formatInGameDayDuration(row)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Crew Vitals & Storm Shelter Button */}
        <div
          data-tutorial-target="crew-rad-bar"
          className={`pointer-events-auto bg-slate-900/92 border rounded-xl px-3 py-2 shadow-lg flex items-center gap-3 shrink-0 transition-colors ${
            flareTelemetry.riskLevel === 'critical'
              ? 'border-rose-500/80'
              : highFlareRisk
              ? 'border-amber-500/75'
              : 'border-slate-800'
          }`}
        >
          <div>
            <div className="text-[10px] font-mono text-slate-400">CREW HEALTH</div>
            <div className="text-xs font-mono font-bold text-white tabular-nums">
              {Math.round(state.crew.healthPct)}% ({state.crew.healthy}/{state.crew.total})
            </div>
          </div>

          <div className="w-[1px] h-7 bg-slate-800" />

          <div>
            <div className="text-[10px] font-mono text-slate-400">
              <GlossaryTerm termKey="radiation dose" label="SHIELD / DOSE" />
            </div>
            <div className="text-xs font-mono font-bold text-cyan-300 tabular-nums">
              {coreMeters.shield.pct}% Shield
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOrderBunker(!state.crew.inStormShelter)}
            className={`px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              state.crew.inStormShelter
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400'
            }`}
          >
            {state.crew.inStormShelter ? '🛡️ BUNKERED' : 'BUNKER CREW'}
          </button>
        </div>
      </div>

      {/* 2. CHAIN REACTION OR ACTIVE HAZARD BANNER */}
      <div className="relative z-10 self-center pointer-events-auto max-w-xl w-full space-y-1.5 my-1">
        {state.chainReactionActive && state.chainReactionMessage && (
          <div
            data-testid="chain-reaction-banner"
            className="bg-rose-950/95 border border-rose-500 rounded-xl px-3.5 py-2 text-xs text-rose-100 shadow-xl flex items-center gap-2"
          >
            <span className="text-base">⚠️</span>
            <div>
              <strong className="font-mono text-rose-300 uppercase mr-1">CHAIN REACTION:</strong>
              {state.chainReactionMessage}
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM AREA: 3+1 CORE METERS (LEFT), ARIA + BUILD DOCK (CENTER), INSPECTOR (RIGHT) */}
      <div className="relative z-10 flex items-end justify-between gap-3">
        {/* Bottom-Left: 3 Core Resources + 1 Safety Meter */}
        <div
          data-tutorial-target="telemetry-bar"
          className="pointer-events-auto bg-slate-900/92 border border-slate-800 rounded-xl p-3 shadow-xl w-72 space-y-2 shrink-0"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <span>OUTPOST 3+1 VITALS</span>
            <span className="text-slate-200">
              {Math.round(state.resources.regolithMinedKg)}R · {Math.round(state.resources.metalKg)}M
            </span>
          </div>

          {renderCoreMeterCard(coreMeters.power)}

          {renderCoreMeterCard(
            coreMeters.life_support,
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsLifeSupportExpanded((p) => !p)}
                  aria-expanded={isLifeSupportExpanded}
                  data-testid="toggle-life-support-breakdown"
                  className="text-left text-[10px] font-mono text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                >
                  {isLifeSupportExpanded ? '▴ Hide O₂ & Water split' : '▾ Tap for O₂ & Water split'}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    data-testid="o2-status-pill"
                    data-resource-status={oxygenStatus}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${meterBadgeClass[oxygenStatus]} ${getResourcePulseClass(oxygenStatus)}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meterDotClass[oxygenStatus]}`} />
                    O₂
                  </span>
                  <span
                    data-testid="h2o-status-pill"
                    data-resource-status={waterStatus}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${meterBadgeClass[waterStatus]} ${getResourcePulseClass(waterStatus)}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meterDotClass[waterStatus]}`} />
                    H₂O
                  </span>
                </div>
              </div>
              {isLifeSupportExpanded && (
                <div
                  data-testid="life-support-breakdown"
                  className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 space-y-1.5 text-[10px] font-mono tabular-nums"
                >
                  <div
                    data-testid="o2-meter-row"
                    data-resource-status={oxygenStatus}
                    className={`flex justify-between items-center rounded border px-1.5 py-1 ${meterBorderClass[oxygenStatus]} ${getResourcePulseClass(oxygenStatus)}`}
                  >
                    <span className="text-sky-200 font-semibold">Oxygen (O₂):</span>
                    <span className="text-white">
                      {Math.round(state.resources.oxygenKg)} kg ({state.resources.netOxygenKgPerSol >= 0 ? '+' : ''}
                      {state.resources.netOxygenKgPerSol}/sol)
                    </span>
                  </div>
                  <div
                    data-testid="h2o-meter-row"
                    data-resource-status={waterStatus}
                    className={`flex justify-between items-center rounded border px-1.5 py-1 ${meterBorderClass[waterStatus]} ${getResourcePulseClass(waterStatus)}`}
                  >
                    <span className="text-blue-200 font-semibold">Water (H₂O):</span>
                    <span className="text-white">
                      {Math.round(state.resources.waterLiters)} L ({state.resources.netWaterLitersPerSol >= 0 ? '+' : ''}
                      {state.resources.netWaterLitersPerSol}/sol)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {renderCoreMeterCard(coreMeters.food)}
          {renderCoreMeterCard(coreMeters.shield)}
        </div>

        {/* Bottom-Center: ARIA Guide + Build Dock */}
        <div
          data-tutorial-target="build-dock"
          className="pointer-events-auto flex flex-col items-center max-w-2xl w-full relative space-y-2"
        >
          {genericTooltip && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-200 shadow-xl">
              {genericTooltip}
            </div>
          )}

          <AriaGuideBar
            state={state}
            onToggleVoice={onToggleAriaVoice}
            onAskMissionControl={onAskMissionControl}
            criticalNotice={criticalNotice}
            onDismissCriticalNotice={() => setCriticalNotice(null)}
          />

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setIsDockCollapsed(!isDockCollapsed)}
              className="px-3 py-1 bg-slate-900/92 border border-slate-700 hover:border-slate-500 text-xs font-mono text-slate-200 rounded-lg cursor-pointer shadow"
            >
              {isDockCollapsed ? '▲ EXPAND BUILD DOCK' : '▼ HIDE BUILD DOCK'}
            </button>

            <button
              type="button"
              onClick={onCleanPanels}
              onMouseEnter={() => setGenericTooltip('Clean dust off Solar Panels (-4 kWh battery)')}
              onMouseLeave={() => setGenericTooltip(null)}
              className="px-3 py-1 bg-slate-900/92 border border-slate-700 hover:border-cyan-400 text-xs font-mono text-cyan-300 rounded-lg cursor-pointer shadow"
            >
              ✨ SHAKE PANEL DUST
            </button>

            <button
              type="button"
              onClick={onOpenRoverCostCard}
              data-testid="rover-trip-btn"
              className="px-3 py-1 bg-amber-500/20 border border-amber-400/70 hover:bg-amber-500/30 text-xs font-mono font-bold text-amber-200 rounded-lg cursor-pointer shadow"
            >
              🚗 ROVER TRIP (COST CARD)
            </button>
          </div>

          {!isDockCollapsed && (
            <div className="w-full bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 shadow-2xl space-y-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {(['all', 'power', 'life_support', 'food', 'shield', 'resource', 'command', 'research'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded-md capitalize shrink-0 cursor-pointer ${
                        activeCategory === cat
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {dockModuleIds.map((id) => {
                  const mod = MODULE_CATALOG[id];
                  const isPlacing = activePlacementType === id;
                  const isTechLocked = !!(
                    mod.requiredTechId && !state.unlockedTechIds.includes(mod.requiredTechId)
                  );
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (isTechLocked) {
                          onToggleResearchTree();
                        } else if (isPlacing) {
                          onStartPlacement(null);
                        } else {
                          onOpenModuleCostCard(id);
                        }
                      }}
                      aria-label={`Inspect Cost Card for ${mod.name}`}
                      className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                        isPlacing
                          ? 'bg-cyan-950 border-cyan-400 text-white ring-1 ring-cyan-400'
                          : isTechLocked
                          ? 'bg-purple-950/35 border-purple-700/60 text-purple-200'
                          : 'bg-slate-950/75 border-slate-800 hover:border-cyan-400 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold truncate text-white">{mod.name}</span>
                        {isTechLocked && <span className="text-[10px]">🔒</span>}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-slate-400">
                        <span className={mod.powerNetKw >= 0 ? 'text-emerald-400' : 'text-amber-300'}>
                          {mod.powerNetKw >= 0 ? `+${mod.powerNetKw}` : mod.powerNetKw} kW
                        </span>
                        <span>{mod.buildTimeSols} Sol</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activePlacementType && (
                <div className="bg-cyan-950/60 border border-cyan-500/50 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 flex items-center justify-between">
                  <span>
                    Tap open Moon/Mars ground tile to place{' '}
                    <strong>{MODULE_CATALOG[activePlacementType].name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onStartPlacement(null)}
                    className="text-slate-300 hover:text-white font-mono px-2 py-0.5 rounded bg-slate-900 cursor-pointer"
                  >
                    Cancel [Esc]
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom-Right: Selected Module Inspector */}
        {selectedModule && selectedDef && (
          <div className="pointer-events-auto bg-slate-900/92 border border-slate-800 rounded-xl p-3 shadow-xl w-72 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  {selectedDef.category.replace('_', ' ')} MODULE
                </span>
                <h3 className="text-sm font-bold text-white">{selectedDef.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectModule(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
                aria-label="Close inspector"
              >
                ✕
              </button>
            </div>

            {(selectedModule.buildProgressPct ?? 100) < 100 && (
              <div className="bg-amber-950/50 border border-amber-500/40 rounded-lg p-2 text-xs font-mono text-amber-200">
                ⏱ Under Construction: {Math.round(selectedModule.buildProgressPct ?? 0)}%
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-mono bg-slate-950/70 p-2 rounded-lg">
              <span>Module Switch:</span>
              <button
                type="button"
                onClick={() => onToggleModuleActive(selectedModule.instanceId)}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  selectedModule.active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {selectedModule.active ? 'ONLINE' : 'POWER OFF'}
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                Trade-Off Lesson
              </span>
              <p className="text-[11px] text-slate-300 leading-snug">{selectedDef.stemConcept}</p>
            </div>

            {selectedDef.category === 'command' && (
              <div>
                {selectedModule.regolithShieldInstalled ? (
                  <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2">
                    ✓ 1m Sintered <GlossaryTerm termKey="regolith" label="Regolith" /> Roof Active
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpgradeRegolith(selectedModule.instanceId)}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-between cursor-pointer"
                  >
                    <span>Sinter 1m Regolith Roof</span>
                    <span className="font-mono text-[10px]">200R · 25 kWh</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS & DRAWERS */}
      <MissionLogPanel state={state} isOpen={isMissionLogOpen} onClose={onToggleMissionLog} />
      <ResearchTreeModal
        state={state}
        isOpen={isResearchTreeOpen}
        onClose={onToggleResearchTree}
        onUnlockTech={onUnlockTech}
      />
      <CostCardModal
        card={pendingCostCard}
        state={state}
        onConfirm={onConfirmCostCard}
        onCancel={onCancelCostCard}
      />
      <CrisisPuzzleModal crisis={state.activeCrisis} onResolve={onResolveCrisis} />
      <GardenGuideModal
        state={state}
        isOpen={isGardenOpen}
        onClose={() => setIsGardenOpen(false)}
        onUpdateGarden={onUpdateGarden}
      />
      <PriorityBoardModal
        state={state}
        isOpen={isPriorityOpen}
        onClose={() => setIsPriorityOpen(false)}
        onSubmitRanking={onSubmitPriority}
      />
      <DataSourcesModal
        state={state}
        isOpen={isDataSourcesOpen}
        onClose={() => setIsDataSourcesOpen(false)}
        onApplyLiveDonki={onApplyLiveDonki}
      />
      <CoopClassroomModal
        isOpen={isCoopOpen}
        onClose={() => setIsCoopOpen(false)}
        onTriggerTeacherFlareDrill={onTriggerTeacherFlareDrill}
        onToggleTeacherPause={(p) => {
          if (p !== state.paused) onTogglePause();
        }}
      />
      <MissionDebrief
        state={state}
        mode="modal"
        isOpen={isDebriefOpen}
        onClose={() => setIsDebriefOpen(false)}
      />
      <GlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />

      {flareTelemetry && !state.activeCrisis && (
        <SolarFlareHazardOverlay
          telemetry={flareTelemetry}
          crewInShelter={state.crew.inStormShelter}
          onOrderBunker={onOrderBunker}
          tutorialActiveStepId={tutorialActiveStepId}
        />
      )}
    </div>
  );
};
