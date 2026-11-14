/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlanetId = 'moon' | 'mars';

export type DifficultyId = 'cadet' | 'astronaut' | 'commander';

export type ModuleCategory =
  | 'command'
  | 'life_support'
  | 'power'
  | 'food'
  | 'shield'
  | 'resource'
  | 'research';

export type ModuleTypeId =
  | 'command_hab'
  | 'life_support_moxie'
  | 'solar_array'
  | 'kilopower_rtg'
  | 'battery_bank'
  | 'aeroponic_greenhouse'
  | 'ice_drill'
  | 'regolith_sinterer'
  | 'radiator_loop'
  | 'storm_shelter'
  | 'science_lab'
  | 'fusion_reactor'
  | 'dust_mitigator'
  | 'comms_antenna'
  | 'rover_garage';

export interface ModuleDefinition {
  id: ModuleTypeId;
  name: string;
  category: ModuleCategory;
  description: string;
  stemConcept: string;
  gainSummary: string;
  paySummary: string;
  riskSummary: string;
  buildTimeSols: number;
  inBuildDock?: boolean;
  powerNetKw: number; // positive = generates, negative = consumes
  waterRateL: number;
  oxygenRateKg: number;
  foodRateKg: number;
  shieldingRadiusM: number;
  radiationReductionPct: number;
  crewCapacity: number;
  scienceRatePerSol?: number;
  requiredTechId?: string;
  buildCost: {
    regolithKg: number;
    powerKwh: number;
    metalKg: number;
  };
}

export interface PlacedModule {
  instanceId: string;
  typeId: ModuleTypeId;
  gridX: number;
  gridZ: number;
  healthPct: number;
  active: boolean;
  dustCoveragePct: number;
  regolithShieldInstalled: boolean;
  efficiencyPct: number;
  buildProgressPct?: number; // 0-100; undefined or 100 means operational
  buildTimeTotalSols?: number;
}

export interface CrewState {
  total: number;
  healthy: number;
  radiationDoseMsv: number; // internal/hidden cumulative mSv (safe threshold: < 250 mSv)
  healthPct: number;
  moralePct: number;
  inStormShelter: boolean;
}

export interface ColonyResources {
  powerCurrentKw: number;
  powerRequiredKw: number;
  batteryStoredKwh: number;
  batteryCapacityKwh: number;
  oxygenKg: number;
  oxygenMaxKg: number;
  waterLiters: number;
  waterMaxLiters: number;
  foodRations: number; // stored emergency days/meals (~90 days at start, non-renewable)
  freshCropsKg: number; // fresh greenhouse produce
  metalKg: number;
  regolithMinedKg: number;
  sciencePoints: number;
  netPowerKw: number;
  netOxygenKgPerSol: number;
  netWaterLitersPerSol: number;
  netFoodKgPerSol: number;
  netSciencePerSol: number;
}

export type SolarFlareRiskLevel = 'nominal' | 'elevated' | 'high' | 'critical';

export interface SolarFlareTelemetry {
  riskLevel: SolarFlareRiskLevel;
  riskScorePct: number;
  flareClass: string;
  protonFluxPfu: number;
  activeRegion: string;
  donkiEventId: string;
  donkiDate: string;
  sourceBadge: 'LIVE' | 'ARCHIVED';
  cmeSpeedKmS: number;
  etaHours: number | null;
  advisory: string;
}

export interface EnvironmentalConditions {
  planet: PlanetId;
  solTime: number; // 0.0 to 1.0
  solNumber: number;
  solarFluxPct: number;
  ambientTemperatureC: number;
  ambientRadiationMsvDay: number;
  dustStormIntensity: number; // 0 = clear, 1 = severe
  solarFlareActive: boolean;
  solarFlareTimeRemainingSec: number;
  solarFlareTelemetry: SolarFlareTelemetry;
  lunarPhaseDay?: number; // 1..28 on Moon (1-14 sunlit, 15-28 lunar night)
  isLunarNightCycle?: boolean;
}

export type ScenarioId =
  | 'lunar_night'
  | 'martian_dust'
  | 'solar_storm'
  | 'six_month_endurance'
  | 'sandbox';

export interface TimeCompressionConfig {
  missionDays: number;
  targetSessionMinutes: number;
  ratio: number;
  inGameSecondsPerRealSecond: number;
  inGameHoursPerRealSecond: number;
  inGameMinutesPerRealSecond: number;
  secondsPerInGameDay: number;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  subtitle: string;
  planet: PlanetId;
  targetSols: number;
  description: string;
  learningGoal: string;
  initialCrew: number;
  targetCrew: number;
}

export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  timeRemainingSec?: number;
  stemTip: string;
  actionRequired?: string;
}

export type LogCategory =
  | 'system'
  | 'upgrade'
  | 'shortage'
  | 'hazard'
  | 'objective'
  | 'research';

export interface MissionLogEntry {
  id: string;
  sol: number;
  timeString: string;
  category: LogCategory;
  text: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

export interface MissionMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'power' | 'life_support' | 'shield' | 'food' | 'survival' | 'research';
}

export type CrisisPuzzleType =
  | 'solar_flare'
  | 'dust_storm'
  | 'power_failure'
  | 'micrometeoroid_leak'
  | 'recycler_jam'
  | 'crop_problem';

export interface ScheduledCrisisEvent {
  id: string;
  puzzleType: CrisisPuzzleType;
  title: string;
  triggerSol: number;
  warningLeadSols: number;
  donkiEventId?: string;
  donkiDate?: string;
  donkiClass?: string;
  sourceBadge: 'LIVE' | 'ARCHIVED';
  resolved: boolean;
}

export type GardenCropId = 'lettuce' | 'radish' | 'potato' | 'beans';

export interface GardenState {
  selectedCrop: GardenCropId;
  ledCycle: '16h-red-blue' | '24h-white' | '8h-low';
  wateringMode: 'aeroponic-mist' | 'flood-soil' | 'dry-save';
  compostEnabled: boolean;
  cropHealthPct: number;
  harvestReadySol: number;
}

export interface PriorityTask {
  id: string;
  title: string;
  detail: string;
  recommendedRank: number;
  plannerReason: string;
}

export interface PriorityBoardState {
  solNumber: number;
  completedForSol: boolean;
  tasks: PriorityTask[];
  lastScore?: number;
  lastFeedback?: string;
}

export type DecisionCategory =
  | 'build'
  | 'shield'
  | 'expedition'
  | 'crisis'
  | 'research'
  | 'maintenance'
  | 'priority';

export interface DonkiMetrics {
  eventType: string;
  flareClass: string;
  activeRegion: string;
  protonFluxPfu: number;
  cmeSpeedKmS: number;
  kpIndex: number;
}

export interface NasaDataReference {
  sourceProgram:
    | 'NASA DONKI'
    | 'NASA OSDR'
    | 'NASA Artemis / Mars'
    | 'NASA ISS Veggie'
    | 'NASA ECLSS';
  recordId: string;
  title: string;
  dateOrStudy: string;
  summary: string;
  plannerTakeaway: string;
  sourceBadge: 'LIVE' | 'ARCHIVED';
  url?: string;
  donkiMetrics?: DonkiMetrics;
}

export interface DecisionTimelineItem {
  id: string;
  sol: number;
  solTimeLabel?: string;
  category?: DecisionCategory;
  action: string;
  costSummary: string;
  costBreakdown?: string[];
  outcomeNote: string;
  tradeOffRisk?: string;
  nasaRef?: NasaDataReference;
}

export interface CommsMessageInTransit {
  id: string;
  prompt: string;
  reply: string;
  totalDelaySec: number;
  remainingSec: number;
  realLightTimeLabel: string;
  delivered: boolean;
}

export interface CostCardSpec {
  id: string;
  title: string;
  subtitle: string;
  gain: string;
  pay: string;
  risk: string;
  buildTimeSols?: number;
  regolithCost?: number;
  metalCost?: number;
  batteryCost?: number;
  oxygenCost?: number;
}

export interface GameState {
  phase: GamePhase;
  scenario: ScenarioId;
  planet: PlanetId;
  difficulty: DifficultyId;
  seed: number;
  dataMode: 'ARCHIVED' | 'LIVE';
  targetSols: number;
  solsElapsed: number;
  timeSpeed: 1 | 2 | 5 | 10;
  timeCompression: TimeCompressionConfig;
  paused: boolean;
  resources: ColonyResources;
  crew: CrewState;
  environment: EnvironmentalConditions;
  modules: PlacedModule[];
  selectedModuleId: string | null;
  activeEvents: GameEvent[];
  eventLog: MissionLogEntry[];
  unlockedTechIds: string[];
  upcomingEvents: ScheduledCrisisEvent[];
  activeCrisis: ScheduledCrisisEvent | null;
  garden: GardenState;
  priorityBoard: PriorityBoardState;
  decisionTimeline: DecisionTimelineItem[];
  unlockedBadges: string[];
  commsTransit: CommsMessageInTransit | null;
  roverTripsCompleted: number;
  puzzlesSolvedCount: number;
  chainReactionActive: boolean;
  chainReactionMessage: string | null;
  ariaMessage: string;
  ariaVoiceEnabled: boolean;
  stats: {
    solsSurvived: number;
    solarPowerGeneratedKwh: number;
    nuclearPowerGeneratedKwh: number;
    waterRecycledLiters: number;
    oxygenProducedKg: number;
    foodHarvestedKg: number;
    maxDoseMsv: number;
    efficiencyRating: number;
  };
  audioMuted: boolean;
}
