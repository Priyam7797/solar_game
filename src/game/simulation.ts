/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ColonyResources,
  CommsMessageInTransit,
  CrewState,
  DifficultyId,
  EnvironmentalConditions,
  GameEvent,
  GamePhase,
  GameState,
  GardenState,
  LogCategory,
  MissionLogEntry,
  MissionMilestone,
  ModuleTypeId,
  PlacedModule,
  PlanetId,
  PriorityBoardState,
  PriorityTask,
  ScenarioId,
  ScheduledCrisisEvent,
  TimeCompressionConfig,
} from '../types/game';
import { MODULE_CATALOG, SCENARIOS } from './modulesData';
import { RESEARCH_TECHS, TechId } from './researchData';
import { DONKI_CATALOG, evaluateSolarFlareRisk, isHighSolarFlareRisk } from './spaceWeatherData';
import { evaluateUnlockedBadges } from './badgesData';
import {
  getNasaReferenceForCrisis,
  getNasaReferenceForModule,
  getNasaReferenceForRover,
  getNasaReferenceForTech,
} from './debriefData';
import resourcesConfig from '../data/resources.json';
import sitesConfig from '../data/sites.json';
import cropsConfig from '../data/crops.json';
import puzzlesConfig from '../data/puzzles.json';

// Constants grounded in NASA baselines (documented in src/data/resources.json)
export const SOL_SECONDS_GAMEPLAY = 60;
export const DEFAULT_TIME_COMPRESSION_RATIO = 86400 / SOL_SECONDS_GAMEPLAY; // 1440x
export const SESSION_LENGTH_PRESETS = [30, 60, 180] as const;
export const O2_PER_CREW_SOL_KG = resourcesConfig.coreMeters[1].o2PerCrewSolKg ?? 0.84;
export const WATER_PER_CREW_SOL_L = resourcesConfig.coreMeters[1].waterPerCrewSolL ?? 2.5;
export const WATER_RECYCLING_EFFICIENCY = resourcesConfig.coreMeters[1].baseRecyclingEfficiency ?? 0.95;
export const FOOD_PER_CREW_SOL_KG = resourcesConfig.coreMeters[2].foodPerCrewSolKg ?? 0.8;
export const MAX_SAFE_RAD_DOSE_MSV = resourcesConfig.safetyMeter.maxSafeCrewDoseMsv ?? 250;

export function calculateTimeCompression(
  missionDays: number,
  targetSessionMinutes: number
): TimeCompressionConfig {
  const safeDays = Math.max(1, missionDays);
  const safeSessionMinutes = Math.max(1, targetSessionMinutes);
  const totalInGameSeconds = safeDays * 24 * 3600;
  const targetSessionSeconds = safeSessionMinutes * 60;
  const ratio = totalInGameSeconds / targetSessionSeconds;

  return {
    missionDays: safeDays,
    targetSessionMinutes: safeSessionMinutes,
    ratio,
    inGameSecondsPerRealSecond: ratio,
    inGameHoursPerRealSecond: ratio / 3600,
    inGameMinutesPerRealSecond: ratio / 60,
    secondsPerInGameDay: 86400 / ratio,
  };
}

export function formatRealSecondRate(
  config: TimeCompressionConfig,
  speedMultiplier = 1
): string {
  const hoursPerSec = config.inGameHoursPerRealSecond * speedMultiplier;
  if (hoursPerSec >= 1) {
    return `${Number(hoursPerSec.toFixed(1))} in-game h`;
  }
  const minsPerSec = config.inGameMinutesPerRealSecond * speedMultiplier;
  if (minsPerSec >= 1) {
    return `${Number(minsPerSec.toFixed(1))} in-game min`;
  }
  return `${Math.round(config.inGameSecondsPerRealSecond * speedMultiplier)} in-game s`;
}

export function formatInGameDayDuration(
  config: TimeCompressionConfig,
  speedMultiplier = 1
): string {
  const secPerDay = config.secondsPerInGameDay / speedMultiplier;
  if (secPerDay < 60) {
    return `${Number(secPerDay.toFixed(1))} s`;
  }
  return `${Number((secPerDay / 60).toFixed(1))} min`;
}

export function formatSolTimeString(solNumber: number, solTime: number): string {
  const hours = Math.floor(solTime * 24).toString().padStart(2, '0');
  const mins = Math.floor((solTime * 24 * 60) % 60).toString().padStart(2, '0');
  return `Sol ${solNumber} · ${hours}:${mins}`;
}

let _logCounter = 0;
export function createLogEntry(
  sol: number,
  solTime: number,
  text: string,
  category: LogCategory,
  type: 'info' | 'warning' | 'danger' | 'success'
): MissionLogEntry {
  _logCounter++;
  return {
    id: `log_${Date.now()}_${_logCounter}`,
    sol,
    timeString: formatSolTimeString(sol, solTime),
    category,
    text,
    type,
  };
}

function buildPriorityTasksForSol(solNumber: number, planet: PlanetId): PriorityTask[] {
  const bank: PriorityTask[][] = [
    [
      {
        id: 'pt_air_filter',
        title: 'Check O₂ & Water Recycler Pressure',
        detail: 'Sensors show slight pump vibration inside the ECLSS scrubber.',
        recommendedRank: 1,
        plannerReason: 'Life Support is #1! Astronauts survive only minutes without O₂.',
      },
      {
        id: 'pt_solar_dust',
        title: planet === 'moon' ? 'Brush Abrasive Lunar Dust Off Panels' : 'Clear Martian Dust Film From Arrays',
        detail: 'Solar output dipped 8% overnight due to surface dust.',
        recommendedRank: 2,
        plannerReason: 'Power keeps life support and shields running, making it #2.',
      },
      {
        id: 'pt_led_tune',
        title: 'Tune Greenhouse LED Timer',
        detail: 'Adjust red/blue plant lights for faster lettuce growth.',
        recommendedRank: 3,
        plannerReason: 'Food optimization is valuable long-term, so it ranks #3 behind immediate O₂ and Power.',
      },
    ],
    [
      {
        id: 'pt_flare_shield',
        title: 'Inspect Storm Shelter Water Walls',
        detail: 'Confirm emergency radiation shelter valves are pressurized before flares.',
        recommendedRank: 1,
        plannerReason: 'Radiation protection must be ready BEFORE a solar flare arrives (#1).',
      },
      {
        id: 'pt_comms_align',
        title: 'Re-aim Deep Space Comms Dish',
        detail: 'Boost early-warning telemetry from NASA DONKI satellites.',
        recommendedRank: 2,
        plannerReason: 'Forecast lead time buys extra hours to prepare (#2).',
      },
      {
        id: 'pt_rover_tires',
        title: 'Sweep Rover Garage Wheel Hubs',
        detail: 'Clear grit from rover wheel motors before next science drive.',
        recommendedRank: 3,
        plannerReason: 'Routine rover upkeep can wait until safety and comms are secured (#3).',
      },
    ],
  ];
  return bank[(solNumber - 1) % bank.length];
}

function buildUpcomingCrises(
  scenarioId: ScenarioId,
  planet: PlanetId,
  seed: number,
  dataMode: 'ARCHIVED' | 'LIVE'
): ScheduledCrisisEvent[] {
  const flr1 = DONKI_CATALOG.high_ar3664;
  const flr2 = DONKI_CATALOG.high_ar3842;

  const events: ScheduledCrisisEvent[] = [];
  if (scenarioId === 'solar_storm') {
    events.push(
      {
        id: 'crisis_flare_sol2',
        puzzleType: 'solar_flare',
        title: 'X-Class Solar Flare (DONKI AR 3664)',
        triggerSol: 2,
        warningLeadSols: 1.5,
        donkiEventId: flr1.donkiEventId,
        donkiDate: flr1.date,
        donkiClass: flr1.flareClass,
        sourceBadge: dataMode,
        resolved: false,
      },
      {
        id: 'crisis_leak_sol5',
        puzzleType: 'micrometeoroid_leak',
        title: 'Micrometeoroid Hull Leak',
        triggerSol: 5,
        warningLeadSols: 1.0,
        sourceBadge: dataMode,
        resolved: false,
      }
    );
  } else if (scenarioId === 'martian_dust' || planet === 'mars') {
    events.push(
      {
        id: 'crisis_dust_sol3',
        puzzleType: 'dust_storm',
        title: 'Regional Martian Dust Wall',
        triggerSol: 3,
        warningLeadSols: 1.5,
        sourceBadge: dataMode,
        resolved: false,
      },
      {
        id: 'crisis_flare_sol6',
        puzzleType: 'solar_flare',
        title: 'DONKI Proton Surge (AR 3842)',
        triggerSol: 6,
        warningLeadSols: 2.0,
        donkiEventId: flr2.donkiEventId,
        donkiDate: flr2.date,
        donkiClass: flr2.flareClass,
        sourceBadge: dataMode,
        resolved: false,
      },
      {
        id: 'crisis_crop_sol9',
        puzzleType: 'crop_problem',
        title: 'Greenhouse Root Hydration Alert',
        triggerSol: 9,
        warningLeadSols: 1.0,
        sourceBadge: dataMode,
        resolved: false,
      }
    );
  } else {
    const offset = seed % 2;
    events.push(
      {
        id: 'crisis_power_sol3',
        puzzleType: 'power_failure',
        title: 'Solar Bus Load Spike',
        triggerSol: 3 + offset,
        warningLeadSols: 1.2,
        sourceBadge: dataMode,
        resolved: false,
      },
      {
        id: 'crisis_flare_sol6',
        puzzleType: 'solar_flare',
        title: 'NASA DONKI Solar Flare Watch',
        triggerSol: 6,
        warningLeadSols: 2.0,
        donkiEventId: flr1.donkiEventId,
        donkiDate: flr1.date,
        donkiClass: flr1.flareClass,
        sourceBadge: dataMode,
        resolved: false,
      },
      {
        id: 'crisis_recycler_sol9',
        puzzleType: 'recycler_jam',
        title: 'ECLSS Water Filter Jam',
        triggerSol: 9,
        warningLeadSols: 1.5,
        sourceBadge: dataMode,
        resolved: false,
      }
    );
  }

  return events;
}

export function getMissionMilestones(state: GameState): MissionMilestone[] {
  const scenarioDef = SCENARIOS[state.scenario];
  const targetSols = state.targetSols || scenarioDef.targetSols;
  const hasNuclear = state.modules.some((m) => m.typeId === 'kilopower_rtg' && m.active);
  const hasRegolithShield = state.modules.some((m) => m.regolithShieldInstalled);
  const hasGreenhouse = state.modules.some((m) => m.typeId === 'aeroponic_greenhouse' && m.active);
  const hasDrill = state.modules.some((m) => m.typeId === 'ice_drill' && m.active);
  const o2Surplus = state.resources.netOxygenKgPerSol > 0.05;
  const solProgress = state.environment.solNumber >= targetSols;
  const hasFusionUnlocked = state.unlockedTechIds.includes('tech_compact_fusion');
  const techCount = state.unlockedTechIds.length;

  return [
    {
      id: 'target_sols',
      title: `Survive ${targetSols} Sols Benchmark`,
      description: `Progress: Sol ${state.environment.solNumber} of ${targetSols}`,
      completed: solProgress,
      category: 'survival',
    },
    {
      id: 'power_resilience',
      title: 'Deploy Kilopower Backup Baseline',
      description: 'Provides 10 kW weather- & night-independent electricity',
      completed: hasNuclear,
      category: 'power',
    },
    {
      id: 'unlock_fusion',
      title: 'Achieve Compact Fusion Power',
      description: 'Research magnetic confinement fusion for +45 kW clean energy',
      completed: hasFusionUnlocked,
      category: 'research',
    },
    {
      id: 'advanced_research',
      title: 'Unlock 3 Advanced Technologies',
      description: `Researched ${techCount} of 3 technologies`,
      completed: techCount >= 3,
      category: 'research',
    },
    {
      id: 'regolith_shield',
      title: 'Sinter 1m Regolith Radiation Shield',
      description: '3D-baked local soil cuts radiation dose by 65–80%',
      completed: hasRegolithShield,
      category: 'shield',
    },
    {
      id: 'o2_surplus',
      title: 'Attain Closed-Loop O₂ Surplus',
      description: 'ECLSS & Greenhouse producing more O₂ than crew uses',
      completed: o2Surplus,
      category: 'life_support',
    },
    {
      id: 'ice_drill',
      title: 'Tap Water Ice Reserves',
      description: 'Extract polar or permafrost water ice',
      completed: hasDrill || state.roverTripsCompleted >= 1,
      category: 'life_support',
    },
    {
      id: 'food_production',
      title: 'Establish Greenhouse Food Production',
      description: 'Grow fresh veggies before 90-day starting rations run dry',
      completed: hasGreenhouse,
      category: 'food',
    },
  ];
}

export interface CoreMeterDisplay {
  id: 'power' | 'life_support' | 'food' | 'shield';
  label: string;
  amountText: string;
  pct: number;
  changePerSolText: string;
  rateNumeric: number;
  solsRemainingText: string;
  status: 'green' | 'yellow' | 'red';
  statusIcon: '✓' | '▲' | '⚠';
  statusLabel: string;
}

/**
 * Computes the 3 Core Resources + 1 Safety Meter summary for HUD cards.
 */
export function getCoreMetersSummary(state: GameState): Record<'power' | 'life_support' | 'food' | 'shield', CoreMeterDisplay> {
  const res = state.resources;
  const batteryPct = Math.round((res.batteryStoredKwh / Math.max(1, res.batteryCapacityKwh)) * 100);
  const netKw = res.netPowerKw;

  // Power sols remaining
  let powerSolsText = 'Steady';
  if (netKw < -0.1) {
    const hoursLeft = res.batteryStoredKwh / Math.abs(netKw);
    const solsLeft = hoursLeft / 24;
    powerSolsText = solsLeft < 1 ? `${Math.max(0.1, solsLeft).toFixed(1)} sols` : `${Math.round(solsLeft)} sols`;
  }
  const powerStatus: 'green' | 'yellow' | 'red' =
    batteryPct <= 15 || (netKw < -2 && batteryPct < 35)
      ? 'red'
      : batteryPct <= 35 || netKw < 0
      ? 'yellow'
      : 'green';

  // Combined Life Support (O2 + Water)
  const o2Pct = (res.oxygenKg / Math.max(1, res.oxygenMaxKg)) * 100;
  const waterPct = (res.waterLiters / Math.max(1, res.waterMaxLiters)) * 100;
  const lifeSupportPct = Math.round((o2Pct + waterPct) / 2);

  const o2DaysLeft =
    res.netOxygenKgPerSol < -0.05 ? res.oxygenKg / Math.abs(res.netOxygenKgPerSol) : Infinity;
  const waterDaysLeft =
    res.netWaterLitersPerSol < -0.05 ? res.waterLiters / Math.abs(res.netWaterLitersPerSol) : Infinity;
  const minLifeDays = Math.min(o2DaysLeft, waterDaysLeft);
  const lifeSolsText = Number.isFinite(minLifeDays)
    ? `${Math.max(1, Math.round(minLifeDays))} sols`
    : 'Self-Sustaining';

  const minLifePct = Math.min(o2Pct, waterPct);
  const lifeNetRate = (res.netOxygenKgPerSol + res.netWaterLitersPerSol * 0.3) / 2;
  const lifeStatus: 'green' | 'yellow' | 'red' =
    minLifePct <= 22 || lifeSupportPct <= 22 || minLifeDays <= 4
      ? 'red'
      : minLifePct <= 45 || lifeSupportPct <= 45 || minLifeDays <= 10
      ? 'yellow'
      : 'green';

  // Food (Stored ~90d rations + Fresh greenhouse crops)
  const dailyFoodNeedKg = Math.max(0.4, state.crew.total * FOOD_PER_CREW_SOL_KG);
  const storedFoodDays = res.foodRations;
  const freshDays = res.freshCropsKg / dailyFoodNeedKg;
  const totalFoodDays = Math.round(storedFoodDays + freshDays);
  const foodPct = Math.min(100, Math.round((totalFoodDays / 90) * 100));
  const netFoodMealsPerSol = res.netFoodKgPerSol / FOOD_PER_CREW_SOL_KG;
  const foodStatus: 'green' | 'yellow' | 'red' =
    totalFoodDays <= 12 ? 'red' : totalFoodDays <= 30 ? 'yellow' : 'green';

  // Safety Meter: Shield %
  const shieldFactor = calculateShieldingFactor(
    state.modules,
    state.crew.inStormShelter,
    state.unlockedTechIds
  );
  const shieldPct = Math.round(shieldFactor * 100);
  const isFlare = isHighSolarFlareRisk(state.environment.solarFlareTelemetry);
  const shieldStatus: 'green' | 'yellow' | 'red' =
    (isFlare && shieldPct < 60) || shieldPct < 25
      ? 'red'
      : (isFlare && shieldPct < 85) || shieldPct < 45
      ? 'yellow'
      : 'green';

  const iconFor = (s: 'green' | 'yellow' | 'red'): '✓' | '▲' | '⚠' =>
    s === 'green' ? '✓' : s === 'yellow' ? '▲' : '⚠';
  const labelFor = (s: 'green' | 'yellow' | 'red'): string =>
    s === 'green' ? 'SAFE' : s === 'yellow' ? 'WATCH' : 'LOW';

  return {
    power: {
      id: 'power',
      label: 'POWER',
      amountText: `${batteryPct}% (${Math.round(res.batteryStoredKwh)} kWh)`,
      pct: batteryPct,
      changePerSolText: `${netKw >= 0 ? `+${netKw.toFixed(1)}` : netKw.toFixed(1)} kW`,
      rateNumeric: netKw,
      solsRemainingText: powerSolsText,
      status: powerStatus,
      statusIcon: iconFor(powerStatus),
      statusLabel: labelFor(powerStatus),
    },
    life_support: {
      id: 'life_support',
      label: 'LIFE SUPPORT',
      amountText: `${lifeSupportPct}% (O₂ + H₂O)`,
      pct: lifeSupportPct,
      changePerSolText: `${lifeNetRate >= 0 ? `+${lifeNetRate.toFixed(1)}` : lifeNetRate.toFixed(1)}/sol`,
      rateNumeric: lifeNetRate,
      solsRemainingText: lifeSolsText,
      status: lifeStatus,
      statusIcon: iconFor(lifeStatus),
      statusLabel: labelFor(lifeStatus),
    },
    food: {
      id: 'food',
      label: 'FOOD',
      amountText: `${totalFoodDays} days (${Math.round(res.freshCropsKg)} kg fresh)`,
      pct: foodPct,
      changePerSolText: `${netFoodMealsPerSol >= 0 ? `+${netFoodMealsPerSol.toFixed(1)}` : netFoodMealsPerSol.toFixed(1)} d/sol`,
      rateNumeric: netFoodMealsPerSol,
      solsRemainingText: netFoodMealsPerSol >= 0 ? 'Growing' : `${totalFoodDays} sols`,
      status: foodStatus,
      statusIcon: iconFor(foodStatus),
      statusLabel: labelFor(foodStatus),
    },
    shield: {
      id: 'shield',
      label: 'SHIELD',
      amountText: `${shieldPct}% ${state.crew.inStormShelter ? '(SHELTER)' : ''}`,
      pct: shieldPct,
      changePerSolText: isFlare ? 'STORM WATCH' : 'STEADY',
      rateNumeric: 0,
      solsRemainingText: state.crew.inStormShelter ? '96% Safe' : 'Active Hull',
      status: shieldStatus,
      statusIcon: iconFor(shieldStatus),
      statusLabel: labelFor(shieldStatus),
    },
  };
}

/**
 * Creates the starting state for any mission, honoring SOL BASE Section 4:
 * 1 habitat, 1 small solar array, 1 basic water/oxygen recycler, 1 battery, 1 small storm shelter, ~90 days food rations.
 */
export function createInitialState(
  scenarioId: ScenarioId,
  planetOverride?: PlanetId,
  options?: {
    targetSessionMinutes?: number;
    missionDays?: number;
    difficulty?: DifficultyId;
    seed?: number;
    dataMode?: 'ARCHIVED' | 'LIVE';
  }
): GameState {
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.lunar_night;
  const planet = planetOverride || scenario.planet;
  const difficulty: DifficultyId = options?.difficulty || 'astronaut';
  const seed = options?.seed ?? 4201;
  const dataMode: 'ARCHIVED' | 'LIVE' = options?.dataMode || 'ARCHIVED';
  const targetSols = options?.missionDays ?? scenario.targetSols;
  const defaultSessionMin = scenarioId === 'six_month_endurance' ? 30 : Math.min(30, targetSols);
  const targetSessionMinutes = options?.targetSessionMinutes ?? defaultSessionMin;
  const timeCompression = calculateTimeCompression(targetSols, targetSessionMinutes);

  const metalMult = difficulty === 'cadet' ? 1.25 : difficulty === 'commander' ? 0.85 : 1.0;

  // Starting Outpost left by earlier astronauts (Section 4)
  const initialModules: PlacedModule[] = [
    {
      instanceId: 'mod_cmd_0',
      typeId: 'command_hab',
      gridX: 0,
      gridZ: 0,
      healthPct: 100,
      active: true,
      dustCoveragePct: 0,
      regolithShieldInstalled: false,
      efficiencyPct: 100,
      buildProgressPct: 100,
    },
    {
      instanceId: 'mod_life_0',
      typeId: 'life_support_moxie',
      gridX: 0,
      gridZ: 2,
      healthPct: 100,
      active: true,
      dustCoveragePct: 0,
      regolithShieldInstalled: false,
      efficiencyPct: 100,
      buildProgressPct: 100,
    },
    {
      instanceId: 'mod_solar_0',
      typeId: 'solar_array',
      gridX: -3,
      gridZ: 1,
      healthPct: 100,
      active: true,
      dustCoveragePct: 5,
      regolithShieldInstalled: false,
      efficiencyPct: 100,
      buildProgressPct: 100,
    },
    {
      instanceId: 'mod_battery_0',
      typeId: 'battery_bank',
      gridX: -1,
      gridZ: -2,
      healthPct: 100,
      active: true,
      dustCoveragePct: 0,
      regolithShieldInstalled: false,
      efficiencyPct: 100,
      buildProgressPct: 100,
    },
    {
      instanceId: 'mod_shelter_0',
      typeId: 'storm_shelter',
      gridX: 2,
      gridZ: -2,
      healthPct: 100,
      active: true,
      dustCoveragePct: 0,
      regolithShieldInstalled: false,
      efficiencyPct: 100,
      buildProgressPct: 100,
    },
  ];

  // Scenario extras
  if (scenarioId === 'lunar_night' || scenarioId === 'six_month_endurance') {
    initialModules.push({
      instanceId: 'mod_solar_1',
      typeId: 'solar_array',
      gridX: -3,
      gridZ: -1,
      healthPct: 100,
      active: true,
      dustCoveragePct: 5,
      regolithShieldInstalled: false,
      efficiencyPct: 100,
      buildProgressPct: 100,
    });
  } else if (scenarioId === 'martian_dust') {
    initialModules.push({
      instanceId: 'mod_comms_0',
      typeId: 'comms_antenna',
      gridX: 3,
      gridZ: 1,
      healthPct: 100,
      active: true,
      dustCoveragePct: 0,
      regolithShieldInstalled: false,
      efficiencyPct: 100,
      buildProgressPct: 100,
    });
  }

  const initialCrew: CrewState = {
    total: scenario.initialCrew,
    healthy: scenario.initialCrew,
    radiationDoseMsv: 5,
    healthPct: 100,
    moralePct: 90,
    inStormShelter: false,
  };

  const initialResources: ColonyResources = {
    powerCurrentKw: 18,
    powerRequiredKw: 9.8,
    batteryStoredKwh: resourcesConfig.coreMeters[0].initialBatteryKwh ?? 120,
    batteryCapacityKwh: 120,
    oxygenKg: resourcesConfig.coreMeters[1].initialOxygenKg ?? 90,
    oxygenMaxKg: resourcesConfig.coreMeters[1].oxygenMaxKg ?? 150,
    waterLiters: resourcesConfig.coreMeters[1].initialWaterLiters ?? 160,
    waterMaxLiters: resourcesConfig.coreMeters[1].waterMaxLiters ?? 250,
    foodRations: resourcesConfig.coreMeters[2].initialRationsDays ?? 90, // ~90 days non-renewable rations
    freshCropsKg: 4,
    metalKg: Math.round(420 * metalMult),
    regolithMinedKg: Math.round(520 * metalMult),
    sciencePoints: scenarioId === 'sandbox' ? 80 : 30,
    netPowerKw: 8.2,
    netOxygenKgPerSol: 0.64,
    netWaterLitersPerSol: -1.5,
    netFoodKgPerSol: -3.2,
    netSciencePerSol: 2.0,
  };

  const startSolTime = scenarioId === 'lunar_night' ? 0.5 : 0.35;
  const initialFlareTelemetry = evaluateSolarFlareRisk(scenarioId, 1, startSolTime, false, 0, dataMode);
  const siteCfg = sitesConfig.sites[planet];

  const initialEnv: EnvironmentalConditions = {
    planet,
    solTime: startSolTime,
    solNumber: 1,
    solarFluxPct: 100,
    ambientTemperatureC: planet === 'moon' ? siteCfg.tempDayC : siteCfg.tempNightC + 25,
    ambientRadiationMsvDay: siteCfg.ambientRadiationMsvDay,
    dustStormIntensity: scenarioId === 'martian_dust' ? 0.35 : 0,
    solarFlareActive: false,
    solarFlareTimeRemainingSec: 0,
    solarFlareTelemetry: initialFlareTelemetry,
    lunarPhaseDay: 1,
    isLunarNightCycle: false,
  };

  const initialLogs: MissionLogEntry[] = [
    createLogEntry(
      1,
      startSolTime,
      `Time Compression: ${Math.round(timeCompression.ratio)}× (${targetSessionMinutes} min session · 1s = ${formatRealSecondRate(timeCompression)}).`,
      'system',
      'info'
    ),
    createLogEntry(1, startSolTime, `Arrived at ${siteCfg.name} (${difficulty.toUpperCase()} difficulty).`, 'system', 'info'),
    createLogEntry(1, startSolTime, `Starting stock: 90 days food rations, basic Solar + Battery + O₂/H₂O Recycler + Shelter.`, 'objective', 'info'),
  ];

  if (isHighSolarFlareRisk(initialFlareTelemetry)) {
    initialLogs.unshift(
      createLogEntry(
        1,
        startSolTime,
        `SOLAR FLARE ALERT (${initialFlareTelemetry.flareClass} · ${initialFlareTelemetry.activeRegion}): ${initialFlareTelemetry.advisory}`,
        'hazard',
        'warning'
      )
    );
  }

  const ariaGreeting =
    planet === 'moon'
      ? `Welcome Commander! I'm ARIA. Here at Shackleton Crater we face 14 sunlit sols followed by 14 freezing dark sols — plus sharp lunar dust. Every build has a Cost Card, so watch what you gain, pay, and risk!`
      : `Welcome Commander! I'm ARIA. Jezero Crater has 24h 39m sols, dust storms, and a 3–22 minute Earth signal delay! Since replies arrive late, your crew must make smart trade-offs on the spot.`;

  return {
    phase: 'title',
    scenario: scenarioId,
    planet,
    difficulty,
    seed,
    dataMode,
    targetSols,
    solsElapsed: 0,
    timeSpeed: 1,
    timeCompression,
    paused: false,
    resources: initialResources,
    crew: initialCrew,
    environment: initialEnv,
    modules: initialModules,
    selectedModuleId: 'mod_cmd_0',
    activeEvents: [],
    eventLog: initialLogs,
    unlockedTechIds: [],
    upcomingEvents: buildUpcomingCrises(scenarioId, planet, seed, dataMode),
    activeCrisis: null,
    garden: {
      selectedCrop: 'lettuce',
      ledCycle: '16h-red-blue',
      wateringMode: 'aeroponic-mist',
      compostEnabled: true,
      cropHealthPct: 95,
      harvestReadySol: 4,
    },
    priorityBoard: {
      solNumber: 1,
      completedForSol: false,
      tasks: buildPriorityTasksForSol(1, planet),
    },
    decisionTimeline: [],
    unlockedBadges: [],
    commsTransit: null,
    roverTripsCompleted: 0,
    puzzlesSolvedCount: 0,
    chainReactionActive: false,
    chainReactionMessage: null,
    ariaMessage: ariaGreeting,
    ariaVoiceEnabled: false,
    stats: {
      solsSurvived: 0,
      solarPowerGeneratedKwh: 0,
      nuclearPowerGeneratedKwh: 0,
      waterRecycledLiters: 0,
      oxygenProducedKg: 0,
      foodHarvestedKg: 0,
      maxDoseMsv: 5,
      efficiencyRating: 100,
    },
    audioMuted: false,
  };
}

export function calculateSolarFlux(
  planet: PlanetId,
  solTime: number,
  dustStormIntensity: number,
  dustCoveragePct: number
): number {
  if (solTime < 0.25 || solTime > 0.75) {
    return 0;
  }
  const normalizedSunAngle = Math.sin((solTime - 0.25) * 2 * Math.PI);
  if (normalizedSunAngle <= 0) return 0;

  const planetaryBase = planet === 'moon' ? 1.0 : 0.55;
  const dustFactor = Math.max(0.1, 1 - dustStormIntensity * 0.85);
  const panelCleaningFactor = Math.max(0.2, 1 - (dustCoveragePct / 100) * 0.75);

  return Math.max(0, normalizedSunAngle * planetaryBase * dustFactor * panelCleaningFactor);
}

export function calculateShieldingFactor(
  modules: PlacedModule[],
  inStormShelter: boolean,
  unlockedTechIds: string[] = []
): number {
  if (inStormShelter) {
    return 0.96;
  }

  const habs = modules.filter((m) => m.typeId === 'command_hab' && m.active);
  if (habs.length === 0) return 0.1;

  const basaltBoost = unlockedTechIds.includes('tech_sintered_basalt') ? 0.8 : 0.65;
  const hasSinterer = modules.some(
    (m) => m.typeId === 'regolith_sinterer' && m.active && (m.buildProgressPct ?? 100) >= 100
  );

  let totalShield = 0;
  for (const hab of habs) {
    let shield = 0.25;
    if (hab.regolithShieldInstalled) {
      shield += basaltBoost;
    } else if (hasSinterer) {
      shield += 0.25;
    }
    totalShield += shield;
  }

  return Math.min(0.95, totalShield / habs.length);
}

/**
 * Pure simulation tick function. Advances sol time, sol-time construction,
 * linked power/life-support/food/shield systems, Mars light-time comms transit,
 * and auto-stops fast-forward whenever a scheduled crisis arrives.
 */
export function simulateTick(state: GameState, dtSec: number): GameState {
  if (state.phase !== 'playing' || state.paused) {
    return state;
  }

  const ratio = state.timeCompression?.ratio || DEFAULT_TIME_COMPRESSION_RATIO;
  const solDurationSec = 86400 / ratio;
  const compressionScale = ratio / DEFAULT_TIME_COMPRESSION_RATIO;
  const effectiveDt = dtSec * state.timeSpeed;
  const solFractionDelta = effectiveDt / solDurationSec;

  const diffMult =
    state.difficulty === 'cadet' ? 0.75 : state.difficulty === 'commander' ? 1.25 : 1.0;

  const nextEnv = { ...state.environment };
  const nextRes = { ...state.resources };
  const nextCrew = { ...state.crew };
  const nextModules = state.modules.map((m) => ({ ...m }));
  const nextStats = { ...state.stats };
  let nextEvents = [...state.activeEvents];
  const nextLogs = [...state.eventLog];
  let nextUpcoming = state.upcomingEvents.map((e) => ({ ...e }));
  let nextActiveCrisis = state.activeCrisis;
  let nextPaused: boolean = state.paused;
  let nextSpeed = state.timeSpeed;
  let nextAria = state.ariaMessage;
  let nextPriority = state.priorityBoard;
  const nextGarden = { ...state.garden };

  // 1. Advance Sol Time & Lunar Day/Night 14-day Cycle
  nextEnv.solTime += solFractionDelta;
  let crossedNewSol = false;
  if (nextEnv.solTime >= 1.0) {
    nextEnv.solTime -= 1.0;
    nextEnv.solNumber += 1;
    nextStats.solsSurvived += 1;
    crossedNewSol = true;

    if (nextEnv.planet === 'moon') {
      const lunarDay = ((nextEnv.solNumber - 1) % 28) + 1;
      nextEnv.lunarPhaseDay = lunarDay;
      nextEnv.isLunarNightCycle = lunarDay > 14;
    }

    nextLogs.unshift(
      createLogEntry(
        nextEnv.solNumber,
        nextEnv.solTime,
        `Sol ${nextEnv.solNumber} began. Outside temperature: ${Math.round(nextEnv.ambientTemperatureC)}°C`,
        'system',
        'info'
      )
    );

    // Refresh daily Priority Board
    nextPriority = {
      ...nextPriority,
      solNumber: nextEnv.solNumber,
      completedForSol: false,
      tasks: buildPriorityTasksForSol(nextEnv.solNumber, nextEnv.planet),
    };
  }

  // Advance Sol-time Construction Progress
  for (const mod of nextModules) {
    if ((mod.buildProgressPct ?? 100) < 100) {
      const totalBuildSols = Math.max(0.1, mod.buildTimeTotalSols ?? MODULE_CATALOG[mod.typeId]?.buildTimeSols ?? 0.5);
      mod.buildProgressPct = Math.min(100, (mod.buildProgressPct ?? 0) + (solFractionDelta / totalBuildSols) * 100);
      if (mod.buildProgressPct >= 100) {
        nextLogs.unshift(
          createLogEntry(
            nextEnv.solNumber,
            nextEnv.solTime,
            `Construction complete: ${MODULE_CATALOG[mod.typeId]?.name || mod.typeId} is now ONLINE!`,
            'upgrade',
            'success'
          )
        );
      }
    }
  }

  // 2. Solar Flux, Temperature, & Site Dust
  const sunElevation = Math.sin((nextEnv.solTime - 0.25) * 2 * Math.PI);
  const isExtendedLunarNight = nextEnv.planet === 'moon' && nextEnv.isLunarNightCycle === true;

  if (nextEnv.planet === 'moon') {
    nextEnv.ambientTemperatureC = !isExtendedLunarNight && sunElevation > 0 ? 30 + sunElevation * 90 : -165;
  } else {
    nextEnv.ambientTemperatureC = sunElevation > 0 ? -40 + sunElevation * 45 : -82;
  }

  const hasHydroponics = state.unlockedTechIds.includes('tech_efficient_hydroponics');
  const hasPerovskite = state.unlockedTechIds.includes('tech_perovskite_tandem');
  const hasClosedEclss = state.unlockedTechIds.includes('tech_closed_eclss');
  const hasSubsurfaceMelt = state.unlockedTechIds.includes('tech_subsurface_melt');

  const activeDustCleaner = nextModules.some(
    (m) => m.typeId === 'dust_mitigator' && m.active && (m.buildProgressPct ?? 100) >= 100
  );
  const dustReduction = activeDustCleaner ? 0.35 : 1.0;

  // Abrasive lunar dust wears equipment steadily; Martian dust surges during storms
  const baseDustRate = nextEnv.planet === 'moon' ? 2.2 : nextEnv.dustStormIntensity > 0 ? 7.0 * nextEnv.dustStormIntensity : 0.8;
  const techDustMod = hasPerovskite ? 0.5 : 1.0;
  for (const mod of nextModules) {
    if (mod.typeId === 'solar_array' && (mod.buildProgressPct ?? 100) >= 100) {
      mod.dustCoveragePct = Math.min(92, mod.dustCoveragePct + solFractionDelta * baseDustRate * dustReduction * techDustMod);
    }
  }

  // 3. Power Generation & Consumption
  let totalPowerGenKw = 0;
  let totalPowerReqKw = 0;
  let solarGenKw = 0;
  let nuclearGenKw = 0;

  let batteryCap = 40;
  for (const mod of nextModules) {
    if (mod.typeId === 'battery_bank' && mod.active && (mod.buildProgressPct ?? 100) >= 100) {
      batteryCap += 80;
    }
  }
  nextRes.batteryCapacityKwh = batteryCap;

  for (const mod of nextModules) {
    if (!mod.active || (mod.buildProgressPct ?? 100) < 100) continue;
    const def = MODULE_CATALOG[mod.typeId];
    if (!def) continue;

    if (mod.typeId === 'solar_array') {
      const flux = isExtendedLunarNight
        ? 0
        : calculateSolarFlux(nextEnv.planet, nextEnv.solTime, nextEnv.dustStormIntensity, mod.dustCoveragePct);
      const solarBoost = hasPerovskite ? 1.35 : 1.0;
      const output = def.powerNetKw * flux * solarBoost * (mod.efficiencyPct / 100);
      solarGenKw += output;
      totalPowerGenKw += output;
    } else if (mod.typeId === 'kilopower_rtg' || mod.typeId === 'fusion_reactor') {
      const output = def.powerNetKw * (mod.efficiencyPct / 100);
      nuclearGenKw += output;
      totalPowerGenKw += output;
    } else if (def.powerNetKw < 0) {
      totalPowerReqKw += Math.abs(def.powerNetKw);
    }
  }

  nextRes.powerCurrentKw = Math.round(totalPowerGenKw * 10) / 10;
  nextRes.powerRequiredKw = Math.round(totalPowerReqKw * 10) / 10;

  const netPowerKw = totalPowerGenKw - totalPowerReqKw;
  const energySliceKwh = (netPowerKw * effectiveDt * compressionScale) / 3600;

  let brownout = false;
  if (energySliceKwh >= 0) {
    nextRes.batteryStoredKwh = Math.min(
      nextRes.batteryCapacityKwh,
      nextRes.batteryStoredKwh + energySliceKwh * 0.92
    );
  } else {
    const requiredKwh = Math.abs(energySliceKwh);
    if (nextRes.batteryStoredKwh >= requiredKwh) {
      nextRes.batteryStoredKwh -= requiredKwh;
    } else {
      nextRes.batteryStoredKwh = 0;
      brownout = true;
    }
  }

  const batteryPctNow = (nextRes.batteryStoredKwh / Math.max(1, nextRes.batteryCapacityKwh)) * 100;
  const lowPowerPenalty = brownout ? 0.25 : batteryPctNow < 15 && netPowerKw < 0 ? 0.65 : 1.0;
  const chainReactionActive = lowPowerPenalty < 1.0;
  const chainReactionMessage = chainReactionActive
    ? brownout
      ? 'POWER CHAIN REACTION: Battery empty! Life support recycling stalled and Greenhouse grow lights offline.'
      : 'LOW POWER WARNING: Battery below 15% — Life Support & Greenhouse running at reduced power.'
    : null;

  nextStats.solarPowerGeneratedKwh += (solarGenKw * effectiveDt * compressionScale) / 3600;
  nextStats.nuclearPowerGeneratedKwh += (nuclearGenKw * effectiveDt * compressionScale) / 3600;

  // 4. Life Support: Oxygen & Water
  const activeEclss = nextModules.filter(
    (m) => m.typeId === 'life_support_moxie' && m.active && !brownout && (m.buildProgressPct ?? 100) >= 100
  );
  const activeGreenhouses = nextModules.filter(
    (m) => m.typeId === 'aeroponic_greenhouse' && m.active && !brownout && (m.buildProgressPct ?? 100) >= 100
  );
  const activeDrills = nextModules.filter(
    (m) => m.typeId === 'ice_drill' && m.active && !brownout && (m.buildProgressPct ?? 100) >= 100
  );
  const activeLabs = nextModules.filter(
    (m) => (m.typeId === 'science_lab' || m.typeId === 'rover_garage' || m.typeId === 'comms_antenna') && m.active && !brownout && (m.buildProgressPct ?? 100) >= 100
  );

  const o2ConsumptionSol = nextCrew.total * O2_PER_CREW_SOL_KG * diffMult;
  let o2ProductionSol = 0;
  const eclssO2Multiplier = (hasClosedEclss ? 1.5 : 1.0) * lowPowerPenalty;
  for (const eclss of activeEclss) {
    o2ProductionSol += MODULE_CATALOG.life_support_moxie.oxygenRateKg * eclssO2Multiplier * (eclss.efficiencyPct / 100);
  }
  for (const gh of activeGreenhouses) {
    o2ProductionSol += MODULE_CATALOG.aeroponic_greenhouse.oxygenRateKg * lowPowerPenalty * (gh.efficiencyPct / 100);
  }

  const netO2Sol = o2ProductionSol - o2ConsumptionSol;
  nextRes.oxygenKg = Math.max(0, Math.min(nextRes.oxygenMaxKg, nextRes.oxygenKg + netO2Sol * solFractionDelta));
  nextStats.oxygenProducedKg += Math.max(0, o2ProductionSol * solFractionDelta);

  const rawWaterConsumptionSol = nextCrew.total * WATER_PER_CREW_SOL_L * diffMult;
  const baseRecycleRate = hasClosedEclss ? 0.985 : WATER_RECYCLING_EFFICIENCY;
  const waterRecycleRate = activeEclss.length > 0 ? baseRecycleRate * (brownout ? 0.4 : 1) : 0;
  const netCrewWaterLossSol = rawWaterConsumptionSol * (1 - waterRecycleRate);
  nextStats.waterRecycledLiters += rawWaterConsumptionSol * waterRecycleRate * solFractionDelta;

  const greenhouseWaterPerUnit = hasHydroponics ? 2.1 : Math.abs(MODULE_CATALOG.aeroponic_greenhouse.waterRateL);
  const greenhouseWaterSol = activeGreenhouses.length * greenhouseWaterPerUnit;
  const labWaterSol = activeLabs.filter((m) => m.typeId === 'science_lab').length * 0.5;

  let drillWaterSol = 0;
  const drillMultiplier = hasSubsurfaceMelt ? 1.6 : 1.0;
  for (const drill of activeDrills) {
    drillWaterSol += MODULE_CATALOG.ice_drill.waterRateL * drillMultiplier * (drill.efficiencyPct / 100);
  }

  const netWaterSol = drillWaterSol - (netCrewWaterLossSol + greenhouseWaterSol + labWaterSol);
  nextRes.waterLiters = Math.max(0, Math.min(nextRes.waterMaxLiters, nextRes.waterLiters + netWaterSol * solFractionDelta));

  // 5. Food & Garden Guide Crop Multiplier
  const followsGardenGuide =
    nextGarden.ledCycle === '16h-red-blue' &&
    nextGarden.wateringMode === 'aeroponic-mist' &&
    nextGarden.compostEnabled;
  const gardenBonus = followsGardenGuide ? 1.35 : nextGarden.wateringMode === 'flood-soil' ? 0.55 : 0.85;
  if (activeGreenhouses.length > 0) {
    nextGarden.cropHealthPct = Math.max(
      25,
      Math.min(100, nextGarden.cropHealthPct + (followsGardenGuide ? 4 : -6) * solFractionDelta)
    );
  }

  let foodProdSol = 0;
  const foodMultiplier = (hasHydroponics ? 1.5 : 1.0) * gardenBonus * lowPowerPenalty;
  for (const gh of activeGreenhouses) {
    if (nextRes.waterLiters > 5) {
      foodProdSol += MODULE_CATALOG.aeroponic_greenhouse.foodRateKg * foodMultiplier * (gh.efficiencyPct / 100);
    }
  }
  nextRes.freshCropsKg += foodProdSol * solFractionDelta;
  nextStats.foodHarvestedKg += foodProdSol * solFractionDelta;

  const foodNeededSol = nextCrew.total * FOOD_PER_CREW_SOL_KG;
  const foodNeededSlice = foodNeededSol * solFractionDelta;

  if (nextRes.freshCropsKg >= foodNeededSlice) {
    nextRes.freshCropsKg -= foodNeededSlice;
    nextCrew.moralePct = Math.min(100, nextCrew.moralePct + 0.5 * solFractionDelta);
  } else {
    const remainder = foodNeededSlice - nextRes.freshCropsKg;
    nextRes.freshCropsKg = 0;
    const rationsConsumed = remainder / FOOD_PER_CREW_SOL_KG;
    nextRes.foodRations = Math.max(0, nextRes.foodRations - rationsConsumed);
    nextCrew.moralePct = Math.max(20, nextCrew.moralePct - 0.15 * solFractionDelta);
  }

  // 6. Science Points Generation
  let scienceSol = 2.0;
  for (const mod of activeLabs) {
    scienceSol += (MODULE_CATALOG[mod.typeId].scienceRatePerSol || 0) * (mod.efficiencyPct / 100);
  }
  if (nextCrew.healthPct < 40) scienceSol *= 0.5;
  nextRes.sciencePoints = Math.max(0, nextRes.sciencePoints + scienceSol * solFractionDelta);

  nextRes.netPowerKw = Math.round(netPowerKw * 10) / 10;
  nextRes.netOxygenKgPerSol = Math.round(netO2Sol * 100) / 100;
  nextRes.netWaterLitersPerSol = Math.round(netWaterSol * 100) / 100;
  nextRes.netFoodKgPerSol = Math.round((foodProdSol - foodNeededSol) * 100) / 100;
  nextRes.netSciencePerSol = Math.round(scienceSol * 10) / 10;

  // 7. Radiation & DONKI Solar Flare Telemetry
  const prevRiskLevel = state.environment.solarFlareTelemetry?.riskLevel ?? 'nominal';
  nextEnv.solarFlareTelemetry = evaluateSolarFlareRisk(
    state.scenario,
    nextEnv.solNumber,
    nextEnv.solTime,
    nextEnv.solarFlareActive,
    nextEnv.solarFlareTimeRemainingSec,
    state.dataMode
  );

  if (prevRiskLevel !== 'high' && nextEnv.solarFlareTelemetry.riskLevel === 'high') {
    nextLogs.unshift(
      createLogEntry(
        nextEnv.solNumber,
        nextEnv.solTime,
        `HIGH SOLAR FLARE RISK (${nextEnv.solarFlareTelemetry.flareClass} · ${nextEnv.solarFlareTelemetry.activeRegion}): ${nextEnv.solarFlareTelemetry.protonFluxPfu} pfu detected via NASA DONKI data.`,
        'hazard',
        'warning'
      )
    );
    nextAria = `ARIA Alert: NASA DONKI detected a ${nextEnv.solarFlareTelemetry.flareClass} solar flare! Check Shield & Bunker Crew before proton waves spike.`;
  }

  const baseRadDaily = nextEnv.ambientRadiationMsvDay * diffMult;
  const stormMultiplier = nextEnv.solarFlareActive
    ? 40
    : nextEnv.solarFlareTelemetry.riskLevel === 'high'
    ? 1.8
    : 1;
  const grossRadDaily = baseRadDaily * stormMultiplier;

  const shieldingFactor = calculateShieldingFactor(nextModules, nextCrew.inStormShelter, state.unlockedTechIds);
  const netDailyDose = grossRadDaily * (1 - shieldingFactor);
  nextCrew.radiationDoseMsv += netDailyDose * solFractionDelta;
  nextStats.maxDoseMsv = Math.max(nextStats.maxDoseMsv, nextCrew.radiationDoseMsv);

  // Health & Non-punishing Status Alerts
  let healthDeltaPct = 0;
  if (nextRes.oxygenKg <= 0.5) {
    healthDeltaPct -= 24 * solFractionDelta;
    if (!nextEvents.some((e) => e.id === 'hypoxia_alert')) {
      nextEvents.push({
        id: 'hypoxia_alert',
        title: 'LIFE SUPPORT LOW: Oxygen Reserve Critical',
        description: 'Cabin O₂ is empty! Restore Power or check the Water & O₂ Recycler.',
        type: 'danger',
        stemTip: 'ECLSS water electrolysis stops whenever battery charge drops to zero.',
        actionRequired: 'Restore grid power or shed heavy loads.',
      });
      nextLogs.unshift(
        createLogEntry(nextEnv.solNumber, nextEnv.solTime, 'SHORTAGE: Cabin Oxygen depleted!', 'shortage', 'danger')
      );
    }
  } else {
    nextEvents = nextEvents.filter((e) => e.id !== 'hypoxia_alert');
  }

  if (nextRes.waterLiters <= 0.5) {
    healthDeltaPct -= 12 * solFractionDelta;
    if (!nextEvents.some((e) => e.id === 'water_shortage')) {
      nextEvents.push({
        id: 'water_shortage',
        title: 'LIFE SUPPORT LOW: Water Reserve Empty',
        description: 'Potable water tank depleted! Launch a Rover ice trip or check ECLSS recycling.',
        type: 'danger',
        stemTip: 'Recycling 95–98% of cabin water stretches every liter across long missions.',
      });
    }
  } else {
    nextEvents = nextEvents.filter((e) => e.id !== 'water_shortage');
  }

  if (nextRes.foodRations <= 0.1 && nextRes.freshCropsKg <= 0.1) {
    healthDeltaPct -= 6 * solFractionDelta;
  }

  if (brownout) {
    if (!nextEvents.some((e) => e.id === 'brownout_alert')) {
      nextEvents.push({
        id: 'brownout_alert',
        title: 'CHAIN REACTION: Grid Brownout',
        description: 'Battery drained! Life Support & Greenhouse dimmed until solar or backup power recovers.',
        type: 'warning',
        stemTip: 'Solar arrays make 0 kW at night. Kilopower RTG or Battery Banks prevent brownouts.',
      });
    }
  } else {
    nextEvents = nextEvents.filter((e) => e.id !== 'brownout_alert');
  }

  if (nextCrew.radiationDoseMsv > MAX_SAFE_RAD_DOSE_MSV) {
    const excess = nextCrew.radiationDoseMsv - MAX_SAFE_RAD_DOSE_MSV;
    healthDeltaPct -= (excess / 100) * 4 * solFractionDelta;
  }

  if (
    nextRes.oxygenKg > 10 &&
    nextRes.waterLiters > 20 &&
    (nextRes.foodRations > 5 || nextRes.freshCropsKg > 5) &&
    !brownout
  ) {
    healthDeltaPct += 2.5 * solFractionDelta;
  }
  nextCrew.healthPct = Math.max(0, Math.min(100, nextCrew.healthPct + healthDeltaPct));

  // 8. Solar Flare Progression (Scenario 3)
  if (nextEnv.solarFlareActive) {
    nextEnv.solarFlareTimeRemainingSec -= effectiveDt * compressionScale;
    if (nextEnv.solarFlareTimeRemainingSec <= 0) {
      nextEnv.solarFlareActive = false;
      nextEnv.solarFlareTelemetry = evaluateSolarFlareRisk(state.scenario, nextEnv.solNumber, nextEnv.solTime, false, 0, state.dataMode);
      nextLogs.unshift(
        createLogEntry(nextEnv.solNumber, nextEnv.solTime, 'Solar flare proton wave passed. Radiation returned to baseline.', 'hazard', 'info')
      );
      nextEvents = nextEvents.filter((e) => e.id !== 'solar_flare');
    }
  } else if (state.scenario === 'solar_storm' && nextEnv.solNumber === 2 && nextEnv.solTime > 0.4 && nextEnv.solarFlareTimeRemainingSec === 0) {
    nextEnv.solarFlareActive = true;
    nextEnv.solarFlareTimeRemainingSec = 75;
    nextEnv.solarFlareTelemetry = evaluateSolarFlareRisk(state.scenario, nextEnv.solNumber, nextEnv.solTime, true, 75, state.dataMode);
    nextEvents.push({
      id: 'solar_flare',
      title: 'DANGER: Solar Particle Event (SPE)',
      description: 'High-energy protons detected! Shelter crew or boost regolith shielding.',
      type: 'danger',
      stemTip: 'Water walls and 1m sintered regolith block fast solar protons.',
      actionRequired: 'Bunker crew in Storm Shelter!',
    });
    nextLogs.unshift(
      createLogEntry(nextEnv.solNumber, nextEnv.solTime, 'SOLAR PARTICLE EVENT: Coronal Mass Ejection wave arriving!', 'hazard', 'danger')
    );
  }

  // 9. Earth–Mars / Earth–Moon Comms "Message in Transit" Countdown
  let nextComms = state.commsTransit ? { ...state.commsTransit } : null;
  if (nextComms && !nextComms.delivered) {
    nextComms.remainingSec = Math.max(0, nextComms.remainingSec - dtSec);
    if (nextComms.remainingSec <= 0) {
      nextComms.delivered = true;
      nextAria = nextComms.reply;
      nextLogs.unshift(
        createLogEntry(nextEnv.solNumber, nextEnv.solTime, `Mission Control reply arrived (${nextComms.realLightTimeLabel}): "${nextComms.reply}"`, 'system', 'info')
      );
    }
  }

  // 10. Auto-Stop Time-Lapse on Scheduled Crisis Arrival (Section 7)
  if (!nextActiveCrisis && crossedNewSol) {
    const dueCrisis = nextUpcoming.find((c) => !c.resolved && nextEnv.solNumber >= c.triggerSol);
    if (dueCrisis) {
      nextActiveCrisis = { ...dueCrisis };
      nextPaused = true;
      nextSpeed = 1;
      nextAria = `CRISIS ARRIVED: ${dueCrisis.title}! Fast-forward auto-paused so you can solve the emergency puzzle.`;
      nextLogs.unshift(
        createLogEntry(
          nextEnv.solNumber,
          nextEnv.solTime,
          `CRISIS AUTO-STOP: ${dueCrisis.title} (${dueCrisis.donkiClass ? `${dueCrisis.donkiClass} · ${dueCrisis.sourceBadge}` : 'System Alert'}).`,
          'hazard',
          'danger'
        )
      );
    }
  }

  // 11. Victory / Recovery Check
  const scenarioDef = SCENARIOS[state.scenario];
  const targetSols = state.targetSols || scenarioDef.targetSols;
  let nextPhase: GamePhase = state.phase;

  if (nextCrew.healthPct <= 0) {
    nextPhase = 'gameover';
    nextLogs.unshift(
      createLogEntry(nextEnv.solNumber, nextEnv.solTime, 'Outpost evacuated safely for medical recovery — review your Mission Debrief!', 'shortage', 'danger')
    );
  } else if (nextEnv.solNumber >= targetSols && nextCrew.healthPct > 35) {
    nextPhase = 'victory';
    nextLogs.unshift(
      createLogEntry(nextEnv.solNumber, nextEnv.solTime, `MISSION COMPLETE! Sol ${targetSols} reached safely.`, 'objective', 'success')
    );
  }

  const nextState: GameState = {
    ...state,
    phase: nextPhase,
    paused: nextPaused,
    timeSpeed: nextSpeed,
    environment: nextEnv,
    resources: nextRes,
    crew: nextCrew,
    modules: nextModules,
    stats: nextStats,
    activeEvents: nextEvents,
    eventLog: nextLogs.slice(0, 100),
    upcomingEvents: nextUpcoming,
    activeCrisis: nextActiveCrisis,
    garden: nextGarden,
    priorityBoard: nextPriority,
    commsTransit: nextComms,
    chainReactionActive,
    chainReactionMessage,
    ariaMessage: nextAria,
  };

  nextState.unlockedBadges = evaluateUnlockedBadges(nextState);
  return nextState;
}

export function placeModule(
  state: GameState,
  typeId: ModuleTypeId,
  gridX: number,
  gridZ: number,
  options?: { useBuildTime?: boolean }
): { success: boolean; state: GameState; reason?: string } {
  const def = MODULE_CATALOG[typeId];
  if (!def) {
    return { success: false, state, reason: 'Unknown module type.' };
  }

  if (def.requiredTechId && !state.unlockedTechIds.includes(def.requiredTechId)) {
    const techDef = RESEARCH_TECHS[def.requiredTechId as TechId];
    return {
      success: false,
      state,
      reason: `Locked Technology: Requires "${techDef ? techDef.title : def.requiredTechId}" in Research [R].`,
    };
  }

  const existing = state.modules.find((m) => m.gridX === gridX && m.gridZ === gridZ);
  if (existing) {
    return { success: false, state, reason: 'Grid sector already occupied.' };
  }

  if (state.resources.regolithMinedKg < def.buildCost.regolithKg) {
    return {
      success: false,
      state,
      reason: `Need ${def.buildCost.regolithKg} kg regolith (have ${Math.round(state.resources.regolithMinedKg)} kg).`,
    };
  }
  if (state.resources.metalKg < def.buildCost.metalKg) {
    return {
      success: false,
      state,
      reason: `Need ${def.buildCost.metalKg} kg metal alloy (have ${Math.round(state.resources.metalKg)} kg).`,
    };
  }

  const newInstanceId = `mod_${typeId}_${Date.now()}`;
  const useBuildTime = options?.useBuildTime === true;
  const newModule: PlacedModule = {
    instanceId: newInstanceId,
    typeId,
    gridX,
    gridZ,
    healthPct: 100,
    active: true,
    dustCoveragePct: 0,
    regolithShieldInstalled: false,
    efficiencyPct: 100,
    buildProgressPct: useBuildTime ? 0 : 100,
    buildTimeTotalSols: def.buildTimeSols,
  };

  const nextRes = {
    ...state.resources,
    regolithMinedKg: state.resources.regolithMinedKg - def.buildCost.regolithKg,
    metalKg: state.resources.metalKg - def.buildCost.metalKg,
    batteryStoredKwh: Math.max(0, state.resources.batteryStoredKwh - (useBuildTime ? def.buildCost.powerKwh : 0)),
  };

  const nextModules = [...state.modules, newModule];
  const nextLogs = [
    createLogEntry(
      state.environment.solNumber,
      state.environment.solTime,
      useBuildTime
        ? `Started building ${def.name} (${def.buildTimeSols} Sols build time).`
        : `Constructed ${def.name} at (${gridX}, ${gridZ}).`,
      'upgrade',
      'info'
    ),
    ...state.eventLog,
  ].slice(0, 100);

  const nextDecisions = [
    {
      id: `dec_${Date.now()}`,
      sol: state.environment.solNumber,
      solTimeLabel: formatSolTimeString(state.environment.solNumber, state.environment.solTime),
      category: 'build' as const,
      action: `Built ${def.name}`,
      costSummary: `${def.buildCost.metalKg} kg Metal, ${def.buildCost.regolithKg} kg Regolith, ${def.powerNetKw < 0 ? `${def.powerNetKw} kW/sol` : `+${def.powerNetKw} kW`}`,
      costBreakdown: [
        `${def.buildCost.metalKg} kg Metal`,
        `${def.buildCost.regolithKg} kg Regolith`,
        ...(useBuildTime && def.buildCost.powerKwh > 0 ? [`-${def.buildCost.powerKwh} kWh Battery`] : []),
        `${def.powerNetKw < 0 ? `${def.powerNetKw} kW/sol` : `+${def.powerNetKw} kW`}`,
      ],
      outcomeNote: def.gainSummary,
      tradeOffRisk: def.riskSummary,
      nasaRef: getNasaReferenceForModule(typeId, state.planet, state.dataMode),
    },
    ...state.decisionTimeline,
  ].slice(0, 40);

  const nextState: GameState = {
    ...state,
    resources: nextRes,
    modules: nextModules,
    selectedModuleId: newInstanceId,
    eventLog: nextLogs,
    decisionTimeline: nextDecisions,
    ariaMessage: `ARIA: ${def.name} ${useBuildTime ? `construction started (${def.buildTimeSols} Sols)` : 'deployed'}! Trade-off note: ${def.riskSummary}`,
  };
  nextState.unlockedBadges = evaluateUnlockedBadges(nextState);

  return { success: true, state: nextState };
}

export function toggleModule(state: GameState, instanceId: string): GameState {
  const nextModules = state.modules.map((m) =>
    m.instanceId === instanceId ? { ...m, active: !m.active } : m
  );
  return { ...state, modules: nextModules };
}

export function upgradeModuleRegolith(
  state: GameState,
  instanceId: string
): { success: boolean; state: GameState; reason?: string } {
  const mod = state.modules.find((m) => m.instanceId === instanceId);
  if (!mod) return { success: false, state, reason: 'Module not found.' };
  if (mod.regolithShieldInstalled) return { success: false, state, reason: 'Already shielded.' };

  const regolithCost = state.unlockedTechIds.includes('tech_sintered_basalt') ? 150 : 200;
  const powerCost = 25;

  if (state.resources.regolithMinedKg < regolithCost) {
    return { success: false, state, reason: `Need ${regolithCost} kg regolith.` };
  }
  if (state.resources.batteryStoredKwh < powerCost) {
    return { success: false, state, reason: `Need ${powerCost} kWh battery.` };
  }

  const nextRes = {
    ...state.resources,
    regolithMinedKg: state.resources.regolithMinedKg - regolithCost,
    batteryStoredKwh: state.resources.batteryStoredKwh - powerCost,
  };

  const nextModules = state.modules.map((m) =>
    m.instanceId === instanceId ? { ...m, regolithShieldInstalled: true } : m
  );

  const nextLogs = [
    createLogEntry(
      state.environment.solNumber,
      state.environment.solTime,
      `Sintered 1m regolith shield over ${MODULE_CATALOG[mod.typeId]?.name || 'module'} (+Shielding, -25 kWh battery).`,
      'upgrade',
      'success'
    ),
    ...state.eventLog,
  ].slice(0, 100);

  const nextDecisions = [
    {
      id: `dec_${Date.now()}`,
      sol: state.environment.solNumber,
      solTimeLabel: formatSolTimeString(state.environment.solNumber, state.environment.solTime),
      category: 'shield' as const,
      action: 'Sintered 1m Regolith Roof',
      costSummary: `-${regolithCost} kg Regolith, -${powerCost} kWh Battery`,
      costBreakdown: [`-${regolithCost} kg Regolith`, `-${powerCost} kWh Battery`],
      outcomeNote: 'Blocked 65–80% solar flare radiation at the cost of tonight’s battery reserve.',
      tradeOffRisk: 'Lower overnight battery buffer requires extra power discipline.',
      nasaRef: getNasaReferenceForModule('regolith_sinterer', state.planet, state.dataMode),
    },
    ...state.decisionTimeline,
  ].slice(0, 40);

  return {
    success: true,
    state: {
      ...state,
      resources: nextRes,
      modules: nextModules,
      eventLog: nextLogs,
      decisionTimeline: nextDecisions,
    },
  };
}

export function cleanSolarPanels(state: GameState): GameState {
  const nextModules = state.modules.map((m) =>
    m.typeId === 'solar_array' ? { ...m, dustCoveragePct: 0 } : m
  );

  const batteryCost = Math.min(state.resources.batteryStoredKwh, 4);
  const nextRes = {
    ...state.resources,
    batteryStoredKwh: Math.max(0, state.resources.batteryStoredKwh - batteryCost),
  };

  const nextLogs = [
    createLogEntry(
      state.environment.solNumber,
      state.environment.solTime,
      'Solar panel dust cleaned (-4 kWh shaker power, arrays restored to 100%).',
      'system',
      'info'
    ),
    ...state.eventLog,
  ].slice(0, 100);

  const nextDecisions = [
    {
      id: `dec_${Date.now()}`,
      sol: state.environment.solNumber,
      solTimeLabel: formatSolTimeString(state.environment.solNumber, state.environment.solTime),
      category: 'maintenance' as const,
      action: 'Cleaned Solar Panel Dust',
      costSummary: `-${Math.round(batteryCost)} kWh Battery`,
      costBreakdown: [`-${Math.round(batteryCost)} kWh Battery`],
      outcomeNote: 'Electrostatic dust shakers restored solar arrays to 100% sunlight efficiency.',
      tradeOffRisk: 'Spent immediate battery charge to boost daytime solar charging.',
      nasaRef: getNasaReferenceForModule('solar_array', state.planet, state.dataMode),
    },
    ...state.decisionTimeline,
  ].slice(0, 40);

  return {
    ...state,
    resources: nextRes,
    modules: nextModules,
    eventLog: nextLogs,
    decisionTimeline: nextDecisions,
  };
}

export function orderCrewStormShelter(state: GameState, inShelter: boolean): GameState {
  const nextCrew = {
    ...state.crew,
    inStormShelter: inShelter,
  };

  const nextLogs = [
    createLogEntry(
      state.environment.solNumber,
      state.environment.solTime,
      inShelter
        ? 'EMERGENCY: Crew bunkered in Storm Shelter (96% Shielding).'
        : 'Crew returned to primary Habitat.',
      'hazard',
      inShelter ? 'warning' : 'info'
    ),
    ...state.eventLog,
  ].slice(0, 100);

  const nextDecisions = inShelter
    ? [
        {
          id: `dec_${Date.now()}`,
          sol: state.environment.solNumber,
          solTimeLabel: formatSolTimeString(state.environment.solNumber, state.environment.solTime),
          category: 'shield' as const,
          action: 'Bunkered Crew in Storm Shelter',
          costSummary: 'Paused outdoor rover & surface tasks',
          costBreakdown: ['Paused EVA & Rover Ops'],
          outcomeNote: '96% radiation blocking protected crew dose during solar storm.',
          tradeOffRisk: 'Outdoor ice, metal, and science expeditions paused while sheltered.',
          nasaRef: getNasaReferenceForModule('storm_shelter', state.planet, state.dataMode),
        },
        ...state.decisionTimeline,
      ].slice(0, 40)
    : state.decisionTimeline;

  return {
    ...state,
    crew: nextCrew,
    eventLog: nextLogs,
    decisionTimeline: nextDecisions,
  };
}

/**
 * Rover Expedition (Cost Card Action): Spends Oxygen + Battery to gain Metal, Regolith, Ice, and Science.
 */
export function launchRoverExpedition(state: GameState): { success: boolean; state: GameState; reason?: string } {
  const o2Cost = 8;
  const batteryCost = 18;
  if (state.crew.inStormShelter) {
    return { success: false, state, reason: 'Crew is safely bunkered inside Storm Shelter!' };
  }
  if (state.resources.oxygenKg < o2Cost + 5) {
    return { success: false, state, reason: 'Oxygen reserve too low for EVA rover suits.' };
  }
  if (state.resources.batteryStoredKwh < batteryCost) {
    return { success: false, state, reason: `Need ${batteryCost} kWh battery charge for the rover.` };
  }

  const flareExposurePenalty = isHighSolarFlareRisk(state.environment.solarFlareTelemetry) ? 14 : 2;
  const nextRes = {
    ...state.resources,
    oxygenKg: state.resources.oxygenKg - o2Cost,
    batteryStoredKwh: state.resources.batteryStoredKwh - batteryCost,
    metalKg: state.resources.metalKg + 95,
    regolithMinedKg: state.resources.regolithMinedKg + 130,
    waterLiters: Math.min(state.resources.waterMaxLiters, state.resources.waterLiters + 22),
    sciencePoints: state.resources.sciencePoints + 16,
  };

  const nextCrew = {
    ...state.crew,
    radiationDoseMsv: state.crew.radiationDoseMsv + flareExposurePenalty,
  };

  const nextLogs = [
    createLogEntry(
      state.environment.solNumber,
      state.environment.solTime,
      `Rover trip complete: +95 kg Metal, +130 kg Regolith, +22 L Ice, +16 SP (-8 kg O₂, -18 kWh${flareExposurePenalty > 5 ? ', +14 mSv flare dose!' : ''}).`,
      'research',
      flareExposurePenalty > 5 ? 'warning' : 'success'
    ),
    ...state.eventLog,
  ].slice(0, 100);

  const nextDecisions = [
    {
      id: `dec_${Date.now()}`,
      sol: state.environment.solNumber,
      solTimeLabel: formatSolTimeString(state.environment.solNumber, state.environment.solTime),
      category: 'expedition' as const,
      action: 'Launched Rover Field Trip',
      costSummary: `-8 kg O₂, -18 kWh Battery${flareExposurePenalty > 5 ? ', +14 mSv dose' : ''}`,
      costBreakdown: [
        '-8 kg O₂',
        '-18 kWh Battery',
        ...(flareExposurePenalty > 5 ? ['+14 mSv Flare Dose'] : ['+2 mSv Cosmic Dose']),
      ],
      outcomeNote:
        flareExposurePenalty > 5
          ? 'Collected +95 kg Metal, +130 kg Regolith, +22 L Ice, +16 SP during high solar flare risk.'
          : 'Collected +95 kg Metal, +130 kg Regolith, +22 L Ice, +16 SP.',
      tradeOffRisk:
        flareExposurePenalty > 5
          ? 'High DONKI flare risk irradiated outdoor astronauts!'
          : 'Consumed breathable cabin O₂ and battery charge.',
      nasaRef: getNasaReferenceForRover(
        flareExposurePenalty > 5,
        state.planet,
        state.environment.solarFlareTelemetry.donkiEventId,
        state.dataMode
      ),
    },
    ...state.decisionTimeline,
  ].slice(0, 40);

  const nextState: GameState = {
    ...state,
    resources: nextRes,
    crew: nextCrew,
    roverTripsCompleted: state.roverTripsCompleted + 1,
    eventLog: nextLogs,
    decisionTimeline: nextDecisions,
    ariaMessage:
      flareExposurePenalty > 5
        ? 'Rover returned with ice & metal, but solar flare radiation grazed the crew (+14 mSv)! Check Shield status.'
        : 'Rover expedition succeeded! +95 kg Metal, +130 kg Regolith, +22 L Ice water, and +16 Science.',
  };
  nextState.unlockedBadges = evaluateUnlockedBadges(nextState);
  return { success: true, state: nextState };
}

/**
 * Initiates a Mission Control radio check demonstrating Moon (1.3s) vs Mars (3-22 min) light-time delay.
 */
export function sendMissionControlMessage(state: GameState, prompt: string): GameState {
  const isMars = state.planet === 'mars';
  const delaySec = isMars ? 6 : 1.3; // Visual transit time (Mars animated 6s representing ~11 min one-way light delay)
  const lightLabel = isMars ? '11 min light-time (animated)' : '1.3 sec light-time';

  const adviceReply = isMars
    ? state.resources.batteryStoredKwh < 40
      ? 'Mission Control (Delayed): Dust cuts Mars solar! Protect Life Support fans first and build Kilopower Backup.'
      : 'Mission Control (Delayed): Remember — Mars replies arrive minutes late, so keep extra battery and water buffers!'
    : 'Mission Control (Moon Live Link): Lunar link is 1.3s! Watch the 14-day night horizon and clean sharp regolith dust.';

  const transit: CommsMessageInTransit = {
    id: `msg_${Date.now()}`,
    prompt,
    reply: adviceReply,
    totalDelaySec: delaySec,
    remainingSec: delaySec,
    realLightTimeLabel: lightLabel,
    delivered: false,
  };

  return {
    ...state,
    commsTransit: transit,
    ariaMessage: isMars
      ? 'Message beamed toward Earth! On Mars it takes 3–22 minutes each way — watch the Signal in Transit indicator.'
      : 'Signal beamed to Houston! Moon radio bounces back in ~1.3 seconds.',
  };
}

/**
 * Resolves an interactive crisis puzzle with encouraging recovery (never punishing).
 */
export function resolveCrisisPuzzle(
  state: GameState,
  crisisId: string,
  solved: boolean
): GameState {
  const crisis = state.activeCrisis;
  if (!crisis || crisis.id !== crisisId) return state;

  const puzCfg = (puzzlesConfig.puzzles as Record<string, { realPlannerAction: string; setbackMessage: string }>)[
    crisis.puzzleType
  ];

  const nextUpcoming = state.upcomingEvents.map((e) =>
    e.id === crisisId ? { ...e, resolved: true } : e
  );

  const nextRes = { ...state.resources };
  const nextCrew = { ...state.crew };

  if (solved) {
    nextRes.sciencePoints += 15;
    nextCrew.moralePct = Math.min(100, nextCrew.moralePct + 8);
  } else {
    // Non-punishing setback + recovery lesson
    if (crisis.puzzleType === 'solar_flare') {
      nextCrew.radiationDoseMsv += 14;
    } else if (crisis.puzzleType === 'dust_storm' || crisis.puzzleType === 'power_failure') {
      nextRes.batteryStoredKwh = Math.max(10, nextRes.batteryStoredKwh - 15);
    } else if (crisis.puzzleType === 'micrometeoroid_leak') {
      nextRes.oxygenKg = Math.max(12, nextRes.oxygenKg - 12);
    } else if (crisis.puzzleType === 'recycler_jam') {
      nextRes.waterLiters = Math.max(20, nextRes.waterLiters - 18);
    } else if (crisis.puzzleType === 'crop_problem') {
      nextRes.freshCropsKg = Math.max(0, nextRes.freshCropsKg - 2);
    }
  }

  const nextLogs = [
    createLogEntry(
      state.environment.solNumber,
      state.environment.solTime,
      solved
        ? `CRISIS SOLVED: ${crisis.title}! Crew morale boosted (+15 SP).`
        : `CRISIS RECOVERED WITH SETBACK: ${puzCfg?.setbackMessage || 'Crew stabilized systems.'}`,
      'hazard',
      solved ? 'success' : 'warning'
    ),
    ...state.eventLog,
  ].slice(0, 100);

  const crisisSetbackCost =
    crisis.puzzleType === 'solar_flare'
      ? '+14 mSv Dose'
      : crisis.puzzleType === 'dust_storm' || crisis.puzzleType === 'power_failure'
      ? '-15 kWh Battery'
      : crisis.puzzleType === 'micrometeoroid_leak'
      ? '-12 kg O₂'
      : crisis.puzzleType === 'recycler_jam'
      ? '-18 L Water'
      : '-2 kg Crops';

  const nextDecisions = [
    {
      id: `dec_${Date.now()}`,
      sol: state.environment.solNumber,
      solTimeLabel: formatSolTimeString(state.environment.solNumber, state.environment.solTime),
      category: 'crisis' as const,
      action: `${crisis.title} (${solved ? 'Solved' : 'Recovered'})`,
      costSummary: solved ? '0 resource loss (+15 SP reward)' : `${crisisSetbackCost} setback`,
      costBreakdown: solved ? ['0 Damage', '+15 Science Points'] : [crisisSetbackCost],
      outcomeNote: puzCfg?.realPlannerAction || 'Followed NASA emergency checklist.',
      tradeOffRisk: solved
        ? 'Solved emergency drill before system failure cascaded.'
        : puzCfg?.setbackMessage || 'Used backup recovery loop with minor resource setback.',
      nasaRef: getNasaReferenceForCrisis(crisis, state.dataMode),
    },
    ...state.decisionTimeline,
  ].slice(0, 40);

  const nextState: GameState = {
    ...state,
    activeCrisis: null,
    paused: false,
    resources: nextRes,
    crew: nextCrew,
    upcomingEvents: nextUpcoming,
    puzzlesSolvedCount: state.puzzlesSolvedCount + (solved ? 1 : 0),
    eventLog: nextLogs,
    decisionTimeline: nextDecisions,
    ariaMessage: solved
      ? `Great work Commander! Real NASA note: ${puzCfg?.realPlannerAction}`
      : `${puzCfg?.setbackMessage} Real NASA note: ${puzCfg?.realPlannerAction}`,
  };
  nextState.unlockedBadges = evaluateUnlockedBadges(nextState);
  return nextState;
}

export function updateGardenSettings(state: GameState, patch: Partial<GardenState>): GameState {
  const nextGarden = { ...state.garden, ...patch };
  const cropCfg = cropsConfig.crops.find((c) => c.id === nextGarden.selectedCrop);
  const optimal =
    nextGarden.ledCycle === '16h-red-blue' &&
    nextGarden.wateringMode === 'aeroponic-mist' &&
    nextGarden.compostEnabled;

  const nextState: GameState = {
    ...state,
    garden: nextGarden,
    ariaMessage: optimal
      ? `Garden Guide: ${cropCfg?.name || 'Crops'} set to NASA Veggie optimal 16h Red+Blue LEDs & Aeroponic Mist (+35% yield)!`
      : nextGarden.wateringMode === 'flood-soil'
      ? 'Garden Warning: Flooding roots in low gravity blocks oxygen! Switch to Aeroponic Mist.'
      : `Garden updated: Growing ${cropCfg?.name || nextGarden.selectedCrop}. Follow NASA Veggie tips for bonus food!`,
  };
  nextState.unlockedBadges = evaluateUnlockedBadges(nextState);
  return nextState;
}

export function submitPriorityBoard(state: GameState, orderedIds: string[]): GameState {
  const tasks = state.priorityBoard.tasks;
  let score = 0;
  orderedIds.forEach((id, idx) => {
    const t = tasks.find((task) => task.id === id);
    if (t && t.recommendedRank === idx + 1) score++;
  });

  const feedback =
    score === 3
      ? 'Spot-on NASA Mission Control ranking! Life support & safety first, power/comms second, optimization third.'
      : 'Good try! Real NASA planners always protect breathable Air & Radiation Safety (#1) before Power/Comms (#2) and Crop/Rover tweaks (#3).';

  const nextRes = {
    ...state.resources,
    sciencePoints: state.resources.sciencePoints + (score === 3 ? 12 : 5),
  };

  const nextState: GameState = {
    ...state,
    resources: nextRes,
    priorityBoard: {
      ...state.priorityBoard,
      completedForSol: true,
      lastScore: score,
      lastFeedback: feedback,
    },
    eventLog: [
      createLogEntry(
        state.environment.solNumber,
        state.environment.solTime,
        `Priority Board (${score}/3 match): +${score === 3 ? 12 : 5} SP. ${feedback}`,
        'objective',
        score === 3 ? 'success' : 'info'
      ),
      ...state.eventLog,
    ].slice(0, 100),
    decisionTimeline: [
      {
        id: `dec_${Date.now()}`,
        sol: state.environment.solNumber,
        solTimeLabel: formatSolTimeString(state.environment.solNumber, state.environment.solTime),
        category: 'priority' as const,
        action: `Daily Priority Board (${score}/3 NASA match)`,
        costSummary: 'Crew time allocated (+' + (score === 3 ? 12 : 5) + ' SP)',
        costBreakdown: [`+${score === 3 ? 12 : 5} SP`],
        outcomeNote: feedback,
        tradeOffRisk: 'Prioritizing O₂/Radiation before secondary tasks avoids mission cascades.',
        nasaRef: {
          sourceProgram: 'NASA Artemis / Mars' as const,
          recordId: `SOL-${state.environment.solNumber} Flight Plan`,
          title: 'NASA Flight Director Triage Order',
          dateOrStudy: 'ISS & Artemis Daily Operations',
          summary:
            'Flight directors rank immediate crew survival (O₂ & radiation shelter) #1, power/comms #2, and long-term crop or maintenance tasks #3.',
          plannerTakeaway: feedback,
          sourceBadge: 'ARCHIVED' as const,
        },
      },
      ...state.decisionTimeline,
    ].slice(0, 40),
    ariaMessage: feedback,
  };
  nextState.unlockedBadges = evaluateUnlockedBadges(nextState);
  return nextState;
}

export function unlockTechnology(
  state: GameState,
  techId: TechId
): { success: boolean; state: GameState; reason?: string } {
  const tech = RESEARCH_TECHS[techId];
  if (!tech) return { success: false, state, reason: 'Unknown technology node.' };
  if (state.unlockedTechIds.includes(techId)) return { success: false, state, reason: 'Already researched.' };

  for (const prereqId of tech.prerequisites) {
    if (!state.unlockedTechIds.includes(prereqId)) {
      const prereqDef = RESEARCH_TECHS[prereqId];
      return { success: false, state, reason: `Requires prerequisite: ${prereqDef ? prereqDef.title : prereqId}.` };
    }
  }

  if (state.resources.sciencePoints < tech.costScience) {
    return {
      success: false,
      state,
      reason: `Need ${tech.costScience} SP (have ${Math.floor(state.resources.sciencePoints)} SP).`,
    };
  }

  const nextRes = {
    ...state.resources,
    sciencePoints: state.resources.sciencePoints - tech.costScience,
  };

  const nextUnlocked = [...state.unlockedTechIds, techId];
  const nextLogs = [
    createLogEntry(
      state.environment.solNumber,
      state.environment.solTime,
      `Researched [${tech.title}]: ${tech.stemBenefit}`,
      'research',
      'success'
    ),
    ...state.eventLog,
  ].slice(0, 100);

  const nextDecisions = [
    {
      id: `dec_${Date.now()}`,
      sol: state.environment.solNumber,
      solTimeLabel: formatSolTimeString(state.environment.solNumber, state.environment.solTime),
      category: 'research' as const,
      action: `Researched ${tech.title}`,
      costSummary: `-${tech.costScience} SP`,
      costBreakdown: [`-${tech.costScience} SP`],
      outcomeNote: tech.stemBenefit,
      tradeOffRisk: 'Spent Science Points that could have funded another research branch.',
      nasaRef: getNasaReferenceForTech(techId),
    },
    ...state.decisionTimeline,
  ].slice(0, 40);

  return {
    success: true,
    state: {
      ...state,
      resources: nextRes,
      unlockedTechIds: nextUnlocked,
      eventLog: nextLogs,
      decisionTimeline: nextDecisions,
    },
  };
}

export function updateTimeCompression(
  state: GameState,
  targetSessionMinutes: number,
  missionDaysOverride?: number
): GameState {
  const missionDays = missionDaysOverride ?? state.targetSols;
  const nextCompression = calculateTimeCompression(missionDays, targetSessionMinutes);
  const nextLogs = [
    createLogEntry(
      state.environment.solNumber,
      state.environment.solTime,
      `Time Compression set to ${Math.round(nextCompression.ratio)}× (${targetSessionMinutes} min target for ${missionDays} Sols).`,
      'system',
      'info'
    ),
    ...state.eventLog,
  ].slice(0, 100);

  return {
    ...state,
    targetSols: missionDays,
    timeCompression: nextCompression,
    eventLog: nextLogs,
  };
}
