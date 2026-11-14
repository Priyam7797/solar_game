/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Dna,
  FlaskConical,
  HelpCircle,
  Lock,
  Moon,
  Pause,
  Play,
  ScrollText,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  CostCardSpec,
  GameState,
  GardenState,
  ModuleCategory,
  ModuleTypeId,
} from '../types/game';
import { MODULE_CATALOG } from '../game/modulesData';
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
  green: 'border-[#eef0f5]/[0.08] bg-[#0b0d14]',
  yellow: 'border-[#e5a93b]/40 bg-[#0b0d14]',
  red: 'border-[#e5484d]/55 bg-[#0b0d14]',
};

const meterBadgeClass: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-[#4cc38a]/10 text-[#4cc38a] border-[#4cc38a]/25',
  yellow: 'bg-[#e5a93b]/15 text-[#e5a93b] border-[#e5a93b]/35',
  red: 'bg-[#e5484d]/15 text-[#e5484d] border-[#e5484d]/40',
};

const meterBarClass: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-[#4cc38a]',
  yellow: 'bg-[#e5a93b]',
  red: 'bg-[#e5484d]',
};

const meterDotClass: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-[#4cc38a]',
  yellow: 'bg-[#e5a93b]',
  red: 'bg-[#e5484d]',
};

const METER_READABLE_LABELS: Record<CoreMeterDisplay['id'], string> = {
  power: 'Power',
  life_support: 'Life support',
  food: 'Food',
  shield: 'Shield',
};

function toSentenceStatus(label: string): string {
  const lower = label.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const CATEGORY_LABELS: Record<ModuleCategory | 'all', string> = {
  all: 'All',
  power: 'Power',
  life_support: 'Life support',
  food: 'Food',
  shield: 'Shield',
  resource: 'Resource',
  command: 'Command',
  research: 'Research',
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

  const dockModuleIds = (Object.keys(MODULE_CATALOG) as ModuleTypeId[]).filter((id) => {
    const def = MODULE_CATALOG[id];
    const showInDock = def.inBuildDock || id === 'science_lab' || id === 'fusion_reactor';
    if (!showInDock) return false;
    return activeCategory === 'all' || def.category === activeCategory;
  });

  const nextUpcomingEvents = state.upcomingEvents.filter((e) => !e.resolved).slice(0, 2);

  const renderStatusIcon = (status: ResourcePulseColor) => {
    if (status === 'green') return <Check className="w-3 h-3 shrink-0" strokeWidth={1.5} />;
    if (status === 'yellow') return <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={1.5} />;
    return <AlertOctagon className="w-3 h-3 shrink-0" strokeWidth={1.5} />;
  };

  const renderCoreMeterCard = (m: CoreMeterDisplay, extra?: React.ReactNode) => {
    const isMonitored = m.id === 'power' || m.id === 'life_support' || m.id === 'food';
    const pulseClass = isMonitored ? getResourcePulseClass(m.status) : '';

    return (
      <div
        key={m.id}
        data-testid={`core-meter-${m.id}`}
        data-resource-status={m.status}
        className={`rounded-xl border p-3 space-y-2 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${meterBorderClass[m.status]} ${pulseClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${meterDotClass[m.status]}`}
            />
            <span className="text-xs font-sans font-medium text-[#eef0f5] truncate">
              {METER_READABLE_LABELS[m.id]}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono shrink-0 ${meterBadgeClass[m.status]}`}
          >
            {renderStatusIcon(m.status)}
            <span>{toSentenceStatus(m.statusLabel)}</span>
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2 text-xs font-mono">
          <span className="text-[#eef0f5] font-medium tabular-nums truncate">{m.amountText}</span>
          <span className="text-[#a3a9b8] tabular-nums shrink-0">{m.changePerSolText}</span>
        </div>

        <div className="w-full bg-[#1a1e28] h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${meterBarClass[m.status]}`}
            style={{ width: `${Math.max(4, Math.min(100, m.pct))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-[#7a8296]">
          <span>Remaining</span>
          <span className="text-[#eef0f5] tabular-nums">{m.solsRemainingText}</span>
        </div>
        {extra}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 select-none">
      {/* 1. TOP PERIMETER BAR */}
      <div className="relative z-10 flex items-start justify-between gap-3 flex-wrap xl:flex-nowrap">
        {/* Top-Left: Site Cycle, Sols, DONKI Telemetry & Upcoming Events */}
        <div className="pointer-events-auto bg-[#11141c]/95 border border-[#eef0f5]/[0.08] rounded-xl px-3 py-2.5 shrink-0 space-y-1.5 max-w-xs">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                state.planet === 'moon' ? 'bg-[#a3a9b8]' : 'bg-[#e5a93b]'
              }`}
              aria-hidden="true"
            />
            <span className="text-xs font-medium font-sans text-[#eef0f5]">
              {state.planet === 'moon' ? 'Moon · Shackleton Crater' : 'Mars · Jezero Crater'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#a3a9b8] font-mono whitespace-nowrap tabular-nums">
            <span className="text-[#38bdf8] font-medium">
              <GlossaryTerm termKey="sol" label={`Sol ${state.environment.solNumber}/${state.targetSols}`} />
            </span>
            <span className="text-[#7a8296]">·</span>
            <span className="inline-flex items-center gap-1">
              {isDaytime ? (
                <Sun className="w-3.5 h-3.5 text-[#a3a9b8]" strokeWidth={1.5} />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#a3a9b8]" strokeWidth={1.5} />
              )}
              <span>
                {state.planet === 'moon' && state.environment.isLunarNightCycle
                  ? `Lunar night (${state.environment.lunarPhaseDay}/28)`
                  : isDaytime
                  ? 'Daylight'
                  : 'Night'}
              </span>
            </span>
            <span className="text-[#7a8296]">·</span>
            <span>{Math.round(state.environment.ambientTemperatureC)}°C</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono tabular-nums whitespace-nowrap">
            <span className="text-[#7a8296]">DONKI SWx</span>
            <span
              className={
                flareTelemetry.riskLevel === 'critical'
                  ? 'text-[#e5484d]'
                  : flareTelemetry.riskLevel === 'high'
                  ? 'text-[#e5a93b]'
                  : 'text-[#4cc38a]'
              }
            >
              {flareTelemetry.flareClass} ({flareTelemetry.riskLevel})
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-[#1a1e28] text-[#a3a9b8] text-xs">
              {flareTelemetry.sourceBadge === 'LIVE' ? 'Live' : 'Archived'}
            </span>
          </div>

          {nextUpcomingEvents.length > 0 && (
            <div className="pt-1.5 border-t border-[#eef0f5]/[0.08] flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono text-[#7a8296]">Upcoming</span>
              {nextUpcomingEvents.map((ev) => (
                <span
                  key={ev.id}
                  className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#0b0d14] border border-[#eef0f5]/[0.08] text-[#e5a93b] tabular-nums"
                >
                  Sol {ev.triggerSol}: {ev.title.split('(')[0].trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top-Center: Simulation Speed (1x-10x) & Academy Tool Bar */}
        <div className="pointer-events-auto relative flex flex-col items-center gap-2 shrink-0">
          <div
            data-tutorial-target="time-controls"
            className="bg-[#11141c]/95 border border-[#eef0f5]/[0.08] rounded-xl p-1.5 flex items-center gap-1 whitespace-nowrap"
          >
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={state.paused ? 'Resume simulation' : 'Pause simulation'}
              className={`h-8 px-3 text-xs font-sans font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${
                state.paused
                  ? 'bg-[#eef0f5] text-[#07080d]'
                  : 'text-[#eef0f5] hover:bg-[#1a1e28]'
              }`}
            >
              {state.paused ? (
                <>
                  <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Pause</span>
                </>
              )}
            </button>

            <div className="w-px h-4 bg-[#eef0f5]/10 mx-1" />

            {([1, 2, 5, 10] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onSetTimeSpeed(spd)}
                className={`h-8 px-2.5 text-xs font-mono rounded-lg transition-colors duration-150 cursor-pointer tabular-nums ${
                  state.timeSpeed === spd && !state.paused
                    ? 'bg-[#1a1e28] border border-[#38bdf8]/60 text-[#38bdf8] font-medium'
                    : 'text-[#a3a9b8] hover:text-[#eef0f5] hover:bg-[#1a1e28]/60 border border-transparent'
                }`}
              >
                {spd}x
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsCompressionOpen((prev) => !prev)}
              aria-label="Configure Time Compression Ratio"
              className={`h-8 px-2.5 text-xs font-mono rounded-lg inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer tabular-nums ${
                isCompressionOpen
                  ? 'bg-[#1a1e28] border border-[#38bdf8]/60 text-[#eef0f5]'
                  : 'text-[#a3a9b8] hover:text-[#eef0f5] hover:bg-[#1a1e28]/60 border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>{effectiveRatio}×</span>
            </button>

            <div className="w-px h-4 bg-[#eef0f5]/10 mx-1" />

            <button
              type="button"
              onClick={onToggleMissionLog}
              aria-label={isMissionLogOpen ? 'Close Mission Log' : 'Open Mission Log'}
              className={`h-8 px-2.5 text-xs font-sans font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer tabular-nums ${
                isMissionLogOpen
                  ? 'bg-[#1a1e28] border border-[#38bdf8]/60 text-[#eef0f5]'
                  : 'text-[#a3a9b8] hover:text-[#eef0f5] hover:bg-[#1a1e28]/60 border border-transparent'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>Log</span>
              <span className="font-mono text-[#7a8296]">({state.eventLog.length})</span>
            </button>

            <button
              type="button"
              onClick={onToggleResearchTree}
              aria-label={isResearchTreeOpen ? 'Close Research Tree' : 'Open Research Tree'}
              className={`h-8 px-2.5 text-xs font-sans font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer tabular-nums ${
                isResearchTreeOpen
                  ? 'bg-[#1a1e28] border border-[#38bdf8]/60 text-[#eef0f5]'
                  : 'text-[#a3a9b8] hover:text-[#eef0f5] hover:bg-[#1a1e28]/60 border border-transparent'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>R&amp;D</span>
              <span className="font-mono text-[#7a8296]">({Math.floor(state.resources.sciencePoints)})</span>
            </button>

            <button
              type="button"
              onClick={onToggleAudio}
              aria-label={state.audioMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="h-8 w-8 inline-flex items-center justify-center text-[#a3a9b8] hover:text-[#eef0f5] rounded-lg hover:bg-[#1a1e28]/60 cursor-pointer transition-colors duration-150"
            >
              {state.audioMuted ? (
                <VolumeX className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Volume2 className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Second Compact Row: Academy Tools */}
          <div className="bg-[#11141c]/95 border border-[#eef0f5]/[0.08] rounded-xl p-1 flex items-center gap-1 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setIsPriorityOpen(true)}
              data-testid="open-priority-btn"
              className="h-8 px-2.5 text-xs font-sans font-medium rounded-lg bg-[#0b0d14] border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-[#eef0f5] inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>Priority board</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  state.priorityBoard.completedForSol ? 'bg-[#4cc38a]' : 'bg-[#e5a93b]'
                }`}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => setIsGardenOpen(true)}
              data-testid="open-garden-btn"
              className="h-8 px-2.5 text-xs font-sans font-medium rounded-lg bg-[#0b0d14] border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-[#a3a9b8] hover:text-[#eef0f5] inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
            >
              <Sprout className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>Garden guide</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDataSourcesOpen(true)}
              data-testid="open-sources-btn"
              className="h-8 px-2.5 text-xs font-sans font-medium rounded-lg bg-[#0b0d14] border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-[#a3a9b8] hover:text-[#eef0f5] inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
            >
              <Dna className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>Health &amp; NASA sources</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDebriefOpen(true)}
              data-testid="open-debrief-btn"
              className="h-8 px-2.5 text-xs font-sans font-medium rounded-lg bg-[#0b0d14] border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-[#a3a9b8] hover:text-[#eef0f5] inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 tabular-nums"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>Debrief</span>
              <span className="font-mono text-[#7a8296]">({state.decisionTimeline.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCoopOpen(true)}
              data-testid="open-coop-btn"
              className="h-8 px-2.5 text-xs font-sans font-medium rounded-lg bg-[#0b0d14] border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-[#a3a9b8] hover:text-[#eef0f5] inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
            >
              <Users className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>Co-op</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGlossaryOpen(true)}
              data-testid="open-glossary-btn"
              className="h-8 px-2.5 text-xs font-sans font-medium rounded-lg bg-[#0b0d14] border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-[#a3a9b8] hover:text-[#eef0f5] inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>Terms</span>
            </button>

            {onRestartTutorial && (
              <button
                type="button"
                onClick={onRestartTutorial}
                aria-label="Replay 60-second mission tutorial"
                className="h-8 px-2.5 text-xs font-mono rounded-lg bg-[#0b0d14] border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] hover:border-[#eef0f5]/15 text-[#38bdf8] cursor-pointer transition-colors duration-150 tabular-nums"
              >
                60s guide
              </button>
            )}
          </div>

          {isCompressionOpen && (
            <div className="absolute top-full mt-2 w-[400px] bg-[#11141c] border border-[#eef0f5]/10 rounded-xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-[#eef0f5] font-sans">
                  Time compression calculator
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCompressionOpen(false)}
                  aria-label="Close Time Compression Panel"
                  className="text-[#7a8296] hover:text-[#eef0f5] p-1 rounded-md hover:bg-[#1a1e28] cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="text-xs font-mono bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-lg p-2.5 text-[#a3a9b8] tabular-nums">
                ratio = ({state.targetSols} days × 86,400s) / {compression.targetSessionMinutes * 60}s ={' '}
                <span className="text-[#38bdf8] font-medium">{Math.round(compression.ratio)}×</span>
              </div>
              <div className="space-y-1.5">
                {SESSION_LENGTH_PRESETS.map((mins) => {
                  const row = calculateTimeCompression(state.targetSols, mins);
                  const isCurrent = compression.targetSessionMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onUpdateTimeCompression(mins)}
                      className={`w-full flex items-center justify-between text-xs font-mono px-3 py-2 rounded-lg border cursor-pointer tabular-nums transition-colors duration-150 ${
                        isCurrent
                          ? 'bg-[#1a1e28] border-[#38bdf8]/60 text-[#eef0f5]'
                          : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5]'
                      }`}
                    >
                      <span>{mins === 180 ? '3 h' : `${mins} min`}</span>
                      <span className="text-[#38bdf8]">{Math.round(row.ratio)}×</span>
                      <span>1s = {formatRealSecondRate(row)}</span>
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
          className={`pointer-events-auto bg-[#11141c]/95 border rounded-xl px-3 py-2.5 flex items-center gap-3 shrink-0 transition-colors duration-150 ${
            flareTelemetry.riskLevel === 'critical'
              ? 'border-[#e5484d]/60'
              : highFlareRisk
              ? 'border-[#e5a93b]/50'
              : 'border-[#eef0f5]/[0.08]'
          }`}
        >
          <div>
            <div className="text-xs font-sans text-[#7a8296]">Crew health</div>
            <div className="text-xs font-mono font-medium text-[#eef0f5] tabular-nums">
              {Math.round(state.crew.healthPct)}% ({state.crew.healthy}/{state.crew.total})
            </div>
          </div>

          <div className="w-px h-7 bg-[#eef0f5]/10" />

          <div>
            <div className="text-xs font-sans text-[#7a8296]">
              <GlossaryTerm termKey="radiation dose" label="Shield / Dose" />
            </div>
            <div className="text-xs font-mono font-medium text-[#38bdf8] tabular-nums">
              {coreMeters.shield.pct}% shield
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOrderBunker(!state.crew.inStormShelter)}
            className={`h-8 px-3 text-xs font-sans font-medium rounded-lg border inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
              state.crew.inStormShelter
                ? 'bg-[#eef0f5] text-[#07080d] border-[#eef0f5]'
                : 'bg-[#1a1e28] text-[#eef0f5] border-[#eef0f5]/10 hover:border-[#38bdf8]/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>{state.crew.inStormShelter ? 'Bunkered' : 'Bunker crew'}</span>
          </button>
        </div>
      </div>

      {/* 2. CHAIN REACTION BANNER */}
      <div className="relative z-10 self-center pointer-events-auto max-w-xl w-full space-y-2 my-1">
        {state.chainReactionActive && state.chainReactionMessage && (
          <div
            data-testid="chain-reaction-banner"
            className="bg-[#11141c] border border-[#e5484d]/60 rounded-xl p-3 text-xs text-[#eef0f5] flex items-center gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-[#e5484d] shrink-0" strokeWidth={1.5} />
            <div>
              <span className="font-mono font-medium text-[#e5484d] mr-2">
                Chain reaction:
              </span>
              <span className="text-[#eef0f5]">{state.chainReactionMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM AREA: 3+1 CORE METERS (LEFT), ARIA + BUILD DOCK (CENTER), INSPECTOR (RIGHT) */}
      <div className="relative z-10 flex items-end justify-between gap-3">
        {/* Bottom-Left: 3 Core Resources + 1 Safety Meter */}
        <div
          data-tutorial-target="telemetry-bar"
          className="pointer-events-auto bg-[#11141c]/95 border border-[#eef0f5]/[0.08] rounded-2xl p-3 w-72 space-y-2 shrink-0"
        >
          <div className="flex items-center justify-between text-xs font-mono text-[#7a8296] px-1">
            <span className="font-sans text-[#a3a9b8]">Outpost vitals</span>
            <span className="text-[#eef0f5] tabular-nums">
              {Math.round(state.resources.regolithMinedKg)}R · {Math.round(state.resources.metalKg)}M
            </span>
          </div>

          {renderCoreMeterCard(coreMeters.power)}

          {renderCoreMeterCard(
            coreMeters.life_support,
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsLifeSupportExpanded((p) => !p)}
                  aria-expanded={isLifeSupportExpanded}
                  data-testid="toggle-life-support-breakdown"
                  className="text-left text-xs font-mono text-[#38bdf8] hover:text-[#eef0f5] inline-flex items-center gap-1 cursor-pointer transition-colors duration-150"
                >
                  {isLifeSupportExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  <span>{isLifeSupportExpanded ? 'Hide O₂ & H₂O' : 'Split O₂ & H₂O'}</span>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    data-testid="o2-status-pill"
                    data-resource-status={oxygenStatus}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs font-mono ${meterBadgeClass[oxygenStatus]} ${getResourcePulseClass(oxygenStatus)}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meterDotClass[oxygenStatus]}`} />
                    O₂
                  </span>
                  <span
                    data-testid="h2o-status-pill"
                    data-resource-status={waterStatus}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs font-mono ${meterBadgeClass[waterStatus]} ${getResourcePulseClass(waterStatus)}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meterDotClass[waterStatus]}`} />
                    H₂O
                  </span>
                </div>
              </div>
              {isLifeSupportExpanded && (
                <div
                  data-testid="life-support-breakdown"
                  className="bg-[#11141c] border border-[#eef0f5]/[0.08] rounded-lg p-2 space-y-1.5 text-xs font-mono tabular-nums"
                >
                  <div
                    data-testid="o2-meter-row"
                    data-resource-status={oxygenStatus}
                    className={`flex justify-between items-center rounded-md border px-2 py-1 ${meterBorderClass[oxygenStatus]} ${getResourcePulseClass(oxygenStatus)}`}
                  >
                    <span className="text-[#a3a9b8]">Oxygen (O₂)</span>
                    <span className="text-[#eef0f5]">
                      {Math.round(state.resources.oxygenKg)} kg ({state.resources.netOxygenKgPerSol >= 0 ? '+' : ''}
                      {state.resources.netOxygenKgPerSol}/sol)
                    </span>
                  </div>
                  <div
                    data-testid="h2o-meter-row"
                    data-resource-status={waterStatus}
                    className={`flex justify-between items-center rounded-md border px-2 py-1 ${meterBorderClass[waterStatus]} ${getResourcePulseClass(waterStatus)}`}
                  >
                    <span className="text-[#a3a9b8]">Water (H₂O)</span>
                    <span className="text-[#eef0f5]">
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
            <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-lg px-3 py-1.5 text-xs text-[#a3a9b8]">
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
              className="h-8 px-3 bg-[#11141c]/95 border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] text-xs font-sans font-medium text-[#a3a9b8] hover:text-[#eef0f5] rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
            >
              {isDockCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              <span>{isDockCollapsed ? 'Expand build dock' : 'Hide build dock'}</span>
            </button>

            <button
              type="button"
              onClick={onCleanPanels}
              onMouseEnter={() => setGenericTooltip('Clean dust off Solar Panels (-4 kWh battery)')}
              onMouseLeave={() => setGenericTooltip(null)}
              className="h-8 px-3 bg-[#11141c]/95 border border-[#eef0f5]/[0.08] hover:bg-[#1a1e28] text-xs font-sans font-medium text-[#eef0f5] rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
              <span>Shake panel dust</span>
            </button>

            <button
              type="button"
              onClick={onOpenRoverCostCard}
              data-testid="rover-trip-btn"
              className="h-8 px-3 bg-[#1a1e28] border border-[#e5a93b]/40 hover:border-[#e5a93b]/70 text-xs font-sans font-medium text-[#eef0f5] rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
            >
              <Car className="w-3.5 h-3.5 text-[#e5a93b]" strokeWidth={1.5} />
              <span>Rover trip (cost card)</span>
            </button>
          </div>

          {!isDockCollapsed && (
            <div className="w-full bg-[#11141c]/95 border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {(['all', 'power', 'life_support', 'food', 'shield', 'resource', 'command', 'research'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`h-7 px-2.5 text-xs font-sans rounded-md shrink-0 cursor-pointer transition-colors duration-150 ${
                        activeCategory === cat
                          ? 'bg-[#1a1e28] border border-[#38bdf8]/60 text-[#eef0f5] font-medium'
                          : 'text-[#7a8296] hover:text-[#eef0f5] hover:bg-[#1a1e28]/60 border border-transparent'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
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
                      className={`text-left p-2.5 rounded-lg border transition-colors duration-150 cursor-pointer ${
                        isPlacing
                          ? 'bg-[#1a1e28] border-[#38bdf8]/70 text-[#eef0f5]'
                          : isTechLocked
                          ? 'bg-[#0b0d14] border-[#eef0f5]/[0.06] text-[#7a8296] hover:border-[#eef0f5]/15'
                          : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] hover:bg-[#1a1e28]/70 hover:border-[#eef0f5]/15 text-[#eef0f5]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-medium truncate text-[#eef0f5]">
                          {mod.name}
                        </span>
                        {isTechLocked && (
                          <Lock className="w-3.5 h-3.5 text-[#7a8296] shrink-0" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono mt-1.5 text-[#7a8296] tabular-nums">
                        <span className={mod.powerNetKw >= 0 ? 'text-[#4cc38a]' : 'text-[#e5a93b]'}>
                          {mod.powerNetKw >= 0 ? `+${mod.powerNetKw}` : mod.powerNetKw} kW
                        </span>
                        <span>{mod.buildTimeSols} Sol</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activePlacementType && (
                <div className="bg-[#0b0d14] border border-[#38bdf8]/50 rounded-lg px-3 py-2 text-xs text-[#eef0f5] flex items-center justify-between gap-2">
                  <span>
                    Tap open Moon or Mars ground tile to place{' '}
                    <span className="font-medium text-[#38bdf8]">
                      {MODULE_CATALOG[activePlacementType].name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onStartPlacement(null)}
                    className="text-[#a3a9b8] hover:text-[#eef0f5] font-mono px-2 py-0.5 rounded-md bg-[#1a1e28] border border-[#eef0f5]/10 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Cancel</span>
                    <kbd className="text-[#7a8296]">Esc</kbd>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom-Right: Selected Module Inspector */}
        {selectedModule && selectedDef && (
          <div className="pointer-events-auto bg-[#11141c]/95 border border-[#eef0f5]/[0.08] rounded-xl p-3 w-72 space-y-2.5 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-[#7a8296] capitalize block">
                  {selectedDef.category.replace('_', ' ')} module
                </span>
                <h3 className="text-sm font-medium text-[#eef0f5]">{selectedDef.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectModule(null)}
                className="text-[#7a8296] hover:text-[#eef0f5] p-1 rounded-md hover:bg-[#1a1e28] cursor-pointer"
                aria-label="Close inspector"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {(selectedModule.buildProgressPct ?? 100) < 100 && (
              <div className="bg-[#0b0d14] border border-[#e5a93b]/40 rounded-lg p-2 text-xs font-mono text-[#e5a93b] flex items-center gap-2 tabular-nums">
                <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span>Under construction: {Math.round(selectedModule.buildProgressPct ?? 0)}%</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-mono bg-[#0b0d14] border border-[#eef0f5]/[0.08] p-2.5 rounded-lg">
              <span className="text-[#a3a9b8]">Module switch</span>
              <button
                type="button"
                onClick={() => onToggleModuleActive(selectedModule.instanceId)}
                className={`px-2 py-0.5 rounded-md font-medium border cursor-pointer transition-colors duration-150 ${
                  selectedModule.active
                    ? 'bg-[#4cc38a]/15 text-[#4cc38a] border-[#4cc38a]/35'
                    : 'bg-[#e5484d]/15 text-[#e5484d] border-[#e5484d]/35'
                }`}
              >
                {selectedModule.active ? 'Online' : 'Power off'}
              </button>
            </div>

            <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-lg p-2.5 space-y-1">
              <span className="text-xs font-mono text-[#7a8296] block">
                Trade-off lesson
              </span>
              <p className="text-xs text-[#a3a9b8] leading-snug">{selectedDef.stemConcept}</p>
            </div>

            {selectedDef.category === 'command' && (
              <div>
                {selectedModule.regolithShieldInstalled ? (
                  <div className="text-xs font-mono text-[#4cc38a] bg-[#0b0d14] border border-[#4cc38a]/35 rounded-lg p-2.5 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>
                      1m sintered <GlossaryTerm termKey="regolith" label="Regolith" /> roof active
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpgradeRegolith(selectedModule.instanceId)}
                    className="w-full h-9 px-3 bg-[#eef0f5] hover:bg-white text-[#07080d] font-medium text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-150"
                  >
                    <span>Sinter 1m regolith roof</span>
                    <span className="font-mono text-xs tabular-nums">200R · 25 kWh</span>
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
