/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  calculateSolarFlux,
  calculateShieldingFactor,
  simulateTick,
  placeModule,
  upgradeModuleRegolith,
  cleanSolarPanels,
  orderCrewStormShelter,
  calculateTimeCompression,
  formatRealSecondRate,
  formatInGameDayDuration,
  updateTimeCompression,
} from './simulation';

test('calculateSolarFlux produces 0 during night hours and peaks at noon', () => {
  // Midnight on Moon (0.0 solTime) -> 0
  const nightFlux = calculateSolarFlux('moon', 0.0, 0, 0);
  assert.equal(nightFlux, 0);

  // Deep night at 0.15 -> 0
  assert.equal(calculateSolarFlux('moon', 0.15, 0, 0), 0);

  // Peak noon on Moon (0.50 solTime) -> should be 1.0 (100%)
  const moonNoonFlux = calculateSolarFlux('moon', 0.5, 0, 0);
  assert.ok(moonNoonFlux > 0.95, `Expected moon noon flux to be ~1.0, got ${moonNoonFlux}`);

  // Mars at noon has lower flux due to 1.52 AU solar distance (~0.55 base)
  const marsNoonFlux = calculateSolarFlux('mars', 0.5, 0, 0);
  assert.ok(marsNoonFlux < moonNoonFlux, 'Mars solar flux should be lower than Moon due to distance');
  assert.ok(marsNoonFlux > 0.45 && marsNoonFlux < 0.65, `Mars noon flux should be ~0.55, got ${marsNoonFlux}`);

  // Martian dust storm reduces solar flux significantly
  const dustyMarsFlux = calculateSolarFlux('mars', 0.5, 0.8, 0);
  assert.ok(dustyMarsFlux < marsNoonFlux * 0.4, 'Intense dust storm should attenuate solar flux by >60%');
});

test('calculateShieldingFactor reflects structural regolith overburden and storm shelter', () => {
  const state = createInitialState('lunar_night');

  // Baseline habitat has modest shielding (~0.25)
  const baseShield = calculateShieldingFactor(state.modules, false);
  assert.ok(baseShield >= 0.2 && baseShield <= 0.35, `Base shield should be ~0.25, got ${baseShield}`);

  // Sintering 1-meter regolith increases shielding to ~0.9
  const reinforcedModules = state.modules.map(m =>
    m.typeId === 'command_hab' ? { ...m, regolithShieldInstalled: true } : m
  );
  const reinforcedShield = calculateShieldingFactor(reinforcedModules, false);
  assert.ok(reinforcedShield >= 0.8, `Reinforced shield should exceed 0.8, got ${reinforcedShield}`);

  // In storm shelter, shielding reaches 96%
  const shelterShield = calculateShieldingFactor(state.modules, true);
  assert.equal(shelterShield, 0.96);
});

test('simulateTick advances time and handles energy storage', () => {
  const state = createInitialState('lunar_night');
  state.phase = 'playing';

  const initialStored = state.resources.batteryStoredKwh;
  // Simulate 10 seconds of time
  const updated = simulateTick(state, 10);

  assert.ok(updated.environment.solTime > state.environment.solTime, 'Sol time should advance');
  assert.ok(updated.resources.powerCurrentKw > 0, 'Should generate power');
  assert.ok(typeof updated.resources.batteryStoredKwh === 'number', 'Battery kWh should be tracked');
  assert.ok(typeof updated.resources.netPowerKw === 'number', 'netPowerKw should be tracked');
  assert.ok(typeof updated.resources.netOxygenKgPerSol === 'number', 'netOxygenKgPerSol should be tracked');
  assert.ok(typeof updated.resources.netFoodKgPerSol === 'number', 'netFoodKgPerSol should be tracked');
});

test('Oxygen and water recycling mechanics sustain crew metabolism', () => {
  const state = createInitialState('lunar_night');
  state.phase = 'playing';
  state.environment.solTime = 0.5; // Noon, full power

  const initialO2 = state.resources.oxygenKg;
  // With active ECLSS producing 4kg/sol and 4 crew consuming 4 * 0.84 = 3.36kg/sol,
  // net O2 should remain positive or stable
  const after5Sec = simulateTick(state, 5);
  assert.ok(after5Sec.resources.oxygenKg >= initialO2 - 0.5, 'O2 should be maintained by ECLSS');
});

test('placeModule checks resources and updates grid layout', () => {
  const state = createInitialState('sandbox');

  // Try placing a battery bank at an empty grid location
  const res = placeModule(state, 'battery_bank', 4, 4);
  assert.equal(res.success, true);
  assert.ok(res.state.modules.some(m => m.gridX === 4 && m.gridZ === 4));
  assert.ok(res.state.resources.regolithMinedKg < state.resources.regolithMinedKg);

  // Placing at an already occupied position fails
  const clashRes = placeModule(res.state, 'solar_array', 4, 4);
  assert.equal(clashRes.success, false);
  assert.match(clashRes.reason || '', /occupied/i);
});

test('upgradeModuleRegolith applies 3D sintered shield', () => {
  const state = createInitialState('lunar_night');
  state.resources.regolithMinedKg = 500;
  state.resources.batteryStoredKwh = 100;

  const cmdMod = state.modules.find(m => m.typeId === 'command_hab')!;
  assert.equal(cmdMod.regolithShieldInstalled, false);

  const upgradeResult = upgradeModuleRegolith(state, cmdMod.instanceId);
  assert.equal(upgradeResult.success, true);

  const updatedCmd = upgradeResult.state.modules.find(m => m.instanceId === cmdMod.instanceId)!;
  assert.equal(updatedCmd.regolithShieldInstalled, true);
});

test('orderCrewStormShelter and cleanSolarPanels execute cleanly', () => {
  const state = createInitialState('martian_dust');

  // Bunker crew
  const bunkered = orderCrewStormShelter(state, true);
  assert.equal(bunkered.crew.inStormShelter, true);

  // Clean solar panels
  const cleaned = cleanSolarPanels(bunkered);
  const dirtySolar = cleaned.modules.find(m => m.typeId === 'solar_array' && m.dustCoveragePct > 0);
  assert.equal(dirtySolar, undefined);
});

test('mission log tracks events and milestones evaluate dynamically', async () => {
  const { getMissionMilestones } = await import('./simulation');
  const state = createInitialState('sandbox');

  // Verify initial log has entries
  assert.ok(state.eventLog.length >= 2, 'Initial state should have welcome & objective log entries');
  assert.ok(state.eventLog.some(e => e.category === 'objective'), 'Initial log should include an objective entry');
  assert.ok(state.eventLog.some(e => e.category === 'system'), 'Initial log should include system entries');
  assert.ok(state.eventLog[0].timeString.includes('Sol 1'));

  // Initial milestones evaluation
  const milestones = getMissionMilestones(state);
  assert.ok(milestones.length >= 6, 'Should generate 6 engineering milestones');
  const rtgMilestone = milestones.find(m => m.id === 'power_resilience');
  assert.equal(rtgMilestone?.completed, false);

  // Place a kilopower RTG
  const placed = placeModule(state, 'kilopower_rtg', 3, 3);
  assert.equal(placed.success, true);

  // Log should now record the upgrade/placement
  const topLog = placed.state.eventLog[0];
  assert.equal(topLog.category, 'upgrade');
  assert.match(topLog.text, /Kilopower/i);

  // Re-eval milestones
  const updatedMilestones = getMissionMilestones(placed.state);
  const updatedRtg = updatedMilestones.find(m => m.id === 'power_resilience');
  assert.equal(updatedRtg?.completed, true);
});

test('research tree system: science accumulation, prerequisite validation, and tech perks', async () => {
  const { unlockTechnology } = await import('./simulation');
  let state = createInitialState('sandbox');
  state.phase = 'playing';

  // 1. Initial science balance check
  assert.ok(state.resources.sciencePoints >= 30, 'Should start with baseline science points');
  assert.equal(state.unlockedTechIds.length, 0, 'No techs should be unlocked initially');

  // 2. Science points accumulate over time
  const initialScience = state.resources.sciencePoints;
  const ticked = simulateTick(state, 5); // 5 seconds
  assert.ok(ticked.resources.sciencePoints > initialScience, 'Science points should accumulate during simulation ticks');

  // 3. Placing fusion reactor before tech research fails
  const prematureFusion = placeModule(state, 'fusion_reactor', 4, 4);
  assert.equal(prematureFusion.success, false, 'Placing fusion reactor without tech unlock must fail');
  assert.match(prematureFusion.reason || '', /locked technology|compact fusion/i);

  // 4. Attempting to unlock tier 3 fusion directly without prerequisites fails
  state.resources.sciencePoints = 500; // Give plenty of SP
  const skipPrereqs = unlockTechnology(state, 'tech_compact_fusion');
  assert.equal(skipPrereqs.success, false, 'Skipping prerequisites must fail');
  assert.match(skipPrereqs.reason || '', /prerequisite/i);

  // 5. Researching Tier 1 Precision Aeroponic Hydroponics (Cost: 45 SP)
  const initialSP = state.resources.sciencePoints;
  const unlockRes1 = unlockTechnology(state, 'tech_efficient_hydroponics');
  assert.equal(unlockRes1.success, true);
  assert.equal(unlockRes1.state.resources.sciencePoints, initialSP - 45);
  assert.ok(unlockRes1.state.unlockedTechIds.includes('tech_efficient_hydroponics'));
  assert.equal(unlockRes1.state.eventLog[0].category, 'research');

  // 6. Test technological perk: Hydroponic food boost
  state = unlockRes1.state;
  // Place greenhouse
  state.resources.metalKg = 500;
  state.resources.regolithMinedKg = 500;
  const ghPlaced = placeModule(state, 'aeroponic_greenhouse', 3, 3);
  assert.equal(ghPlaced.success, true);

  // 7. Research full chain to Compact Fusion
  state = ghPlaced.state;
  state = unlockTechnology(state, 'tech_closed_eclss').state;
  state = unlockTechnology(state, 'tech_perovskite_tandem').state;
  state = unlockTechnology(state, 'tech_advanced_radiators').state;
  const fusionUnlock = unlockTechnology(state, 'tech_compact_fusion');
  assert.equal(fusionUnlock.success, true);
  assert.ok(fusionUnlock.state.unlockedTechIds.includes('tech_compact_fusion'));

  // 8. Now placing fusion reactor succeeds!
  state = fusionUnlock.state;
  state.resources.metalKg = 1000;
  state.resources.regolithMinedKg = 1000;
  const fusionPlaced = placeModule(state, 'fusion_reactor', 4, 4);
  assert.equal(fusionPlaced.success, true, 'Placing fusion reactor after research must succeed');

  // 9. Fusion generates clean power during night
  state = fusionPlaced.state;
  state.environment.solTime = 0.05; // Midnight
  const nightTick = simulateTick(state, 1);
  assert.ok(nightTick.resources.powerCurrentKw >= 45, 'Fusion generator must produce >= 45 kW during night');
});

test('time compression ratio calculation matches formula (mission_days * 86400) / target_session_seconds', () => {
  // 6-month (180-day) mission in 30-min (1800s) session -> 8640x -> 1 real s = 2.4 in-game h, 1 Sol = 10 s
  const comp30 = calculateTimeCompression(180, 30);
  assert.equal(comp30.ratio, 8640);
  assert.equal(comp30.inGameHoursPerRealSecond, 2.4);
  assert.equal(comp30.secondsPerInGameDay, 10);
  assert.equal(formatRealSecondRate(comp30), '2.4 in-game h');
  assert.equal(formatInGameDayDuration(comp30), '10 s');

  // 6-month (180-day) mission in 60-min (3600s) session -> 4320x -> 1 real s = 1.2 in-game h, 1 Sol = 20 s
  const comp60 = calculateTimeCompression(180, 60);
  assert.equal(comp60.ratio, 4320);
  assert.equal(comp60.inGameHoursPerRealSecond, 1.2);
  assert.equal(comp60.secondsPerInGameDay, 20);
  assert.equal(formatRealSecondRate(comp60), '1.2 in-game h');
  assert.equal(formatInGameDayDuration(comp60), '20 s');

  // 6-month (180-day) mission in 3h (180 min / 10800s) session -> 1440x -> 1 real s = 24 in-game min, 1 Sol = 60 s
  const comp180 = calculateTimeCompression(180, 180);
  assert.equal(comp180.ratio, 1440);
  assert.equal(comp180.inGameMinutesPerRealSecond, 24);
  assert.equal(comp180.secondsPerInGameDay, 60);
  assert.equal(formatRealSecondRate(comp180), '24 in-game min');
  assert.equal(formatInGameDayDuration(comp180), '1 min');
});

test('simulateTick advances sols proportionally to configured time compression ratio', () => {
  let state = createInitialState('six_month_endurance', 'moon', { targetSessionMinutes: 30 });
  state.phase = 'playing';
  assert.equal(state.targetSols, 180);
  assert.equal(state.timeCompression.ratio, 8640);
  assert.equal(state.timeCompression.secondsPerInGameDay, 10);

  // At 8640x (10s per Sol), 10 seconds should advance exactly 1 full Sol
  const after10s = simulateTick(state, 10);
  assert.equal(after10s.environment.solNumber, 2);
  assert.equal(after10s.stats.solsSurvived, 1);

  // Switching to 60 min (4320x -> 20s per Sol) halves the rate of Sol progression
  const slowerState = updateTimeCompression(state, 60);
  assert.equal(slowerState.timeCompression.ratio, 4320);
  const after10sSlow = simulateTick(slowerState, 10);
  // Started at 0.35 + 0.5 = 0.85, still Sol 1
  assert.equal(after10sSlow.environment.solNumber, 1);
  assert.ok(Math.abs(after10sSlow.environment.solTime - 0.85) < 1e-6);
});

test('DONKI solar flare telemetry detects high risk in solar_storm and triggers hazard log on transition', async () => {
  const { evaluateSolarFlareRisk, isHighSolarFlareRisk } = await import('./spaceWeatherData');

  // Nominal baseline at start of lunar_night
  const lunarState = createInitialState('lunar_night');
  assert.equal(lunarState.environment.solarFlareTelemetry.riskLevel, 'nominal');
  assert.equal(isHighSolarFlareRisk(lunarState.environment.solarFlareTelemetry), false);

  // Solar Storm scenario opens with high risk X-class warning from AR 3664
  const stormState = createInitialState('solar_storm');
  assert.equal(stormState.environment.solarFlareTelemetry.riskLevel, 'high');
  assert.equal(isHighSolarFlareRisk(stormState.environment.solarFlareTelemetry), true);
  assert.ok(stormState.environment.solarFlareTelemetry.riskScorePct >= 70);
  assert.ok(stormState.eventLog.some((e) => e.category === 'hazard'));

  // Active SPE turns risk level to critical
  const activeSpec = evaluateSolarFlareRisk('solar_storm', 2, 0.45, true, 60);
  assert.equal(activeSpec.riskLevel, 'critical');
  assert.equal(isHighSolarFlareRisk(activeSpec), true);
  assert.ok(activeSpec.protonFluxPfu >= 1000);

  // Transition into Sol 3 high-risk window in standard mission logs a hazard warning
  let std = createInitialState('lunar_night');
  std.phase = 'playing';
  std.environment.solNumber = 3;
  std.environment.solTime = 0.35;
  const ticked = simulateTick(std, 0.1);
  assert.equal(ticked.environment.solarFlareTelemetry.riskLevel, 'high');
  assert.ok(
    ticked.eventLog.some((e) => e.category === 'hazard' && /HIGH SOLAR FLARE RISK/i.test(e.text)),
    'Transitioning to high solar flare risk must record a hazard log entry'
  );
});

test('SOL BASE 3+1 core meters, ~90d starting rations, and Sol-time construction', async () => {
  const { getCoreMetersSummary } = await import('./simulation');
  let state = createInitialState('lunar_night', 'moon', { targetSessionMinutes: 30 });
  state.phase = 'playing';

  // Starting colony includes 90 days rations and 3+1 core meter summary
  assert.equal(state.resources.foodRations, 90);
  const meters = getCoreMetersSummary(state);
  assert.equal(meters.power.id, 'power');
  assert.equal(meters.life_support.id, 'life_support');
  assert.equal(meters.food.id, 'food');
  assert.equal(meters.shield.id, 'shield');
  assert.ok(['✓', '▲', '⚠'].includes(meters.power.statusIcon));

  // Build with Sol-time construction starts at 0% and completes across ticks
  const buildRes = placeModule(state, 'dust_mitigator', 4, -2, { useBuildTime: true });
  assert.equal(buildRes.success, true);
  const builtMod = buildRes.state.modules.find((m) => m.typeId === 'dust_mitigator')!;
  assert.equal(builtMod.buildProgressPct, 0);

  // Advance full Sol via simulation tick
  const afterSol = simulateTick(buildRes.state, state.timeCompression.secondsPerInGameDay);
  const completedMod = afterSol.modules.find((m) => m.typeId === 'dust_mitigator')!;
  assert.equal(completedMod.buildProgressPct, 100);
});

test('SOL BASE crisis auto-stop, puzzle recovery, Rover Cost Card trip, Mars comms, Garden Guide & Priority Board', async () => {
  const {
    launchRoverExpedition,
    sendMissionControlMessage,
    resolveCrisisPuzzle,
    updateGardenSettings,
    submitPriorityBoard,
  } = await import('./simulation');

  let marsState = createInitialState('martian_dust', 'mars', { targetSessionMinutes: 30 });
  marsState.phase = 'playing';

  // Mars Message in Transit simulates 3-22 min light-time delay
  const commsSent = sendMissionControlMessage(marsState, 'Check storm forecast');
  assert.ok(commsSent.commsTransit);
  assert.equal(commsSent.commsTransit?.delivered, false);
  assert.ok(commsSent.commsTransit!.remainingSec > 2);

  // Tick 7 seconds delivers reply cleanly
  const commsDelivered = simulateTick(commsSent, 7);
  assert.equal(commsDelivered.commsTransit?.delivered, true);

  // Rover expedition spends O2 + battery and rewards resources + badge
  const prevO2 = commsDelivered.resources.oxygenKg;
  const roverRes = launchRoverExpedition(commsDelivered);
  assert.equal(roverRes.success, true);
  assert.ok(roverRes.state.resources.oxygenKg < prevO2);
  assert.equal(roverRes.state.roverTripsCompleted, 1);
  assert.ok(roverRes.state.unlockedBadges.includes('badge_rover_explorer'));

  // Advance into crisis arrival Sol 3 -> auto-pauses and triggers activeCrisis
  let beforeCrisis = { ...roverRes.state };
  beforeCrisis.environment.solNumber = 2;
  beforeCrisis.environment.solTime = 0.99;
  const atCrisis = simulateTick(beforeCrisis, beforeCrisis.timeCompression.secondsPerInGameDay * 0.05);
  assert.ok(atCrisis.activeCrisis !== null, 'Scheduled crisis must trigger at triggerSol');
  assert.equal(atCrisis.paused, true, 'Time-lapse must auto-stop on crisis arrival');

  // Solving crisis unpauses and awards +15 SP
  const spBefore = atCrisis.resources.sciencePoints;
  const solvedState = resolveCrisisPuzzle(atCrisis, atCrisis.activeCrisis!.id, true);
  assert.equal(solvedState.activeCrisis, null);
  assert.equal(solvedState.paused, false);
  assert.equal(solvedState.resources.sciencePoints, spBefore + 15);
  assert.ok(solvedState.unlockedBadges.includes('badge_storm_guardian'));

  // Garden Guide & Priority Board update state + award badges
  const gardened = updateGardenSettings(solvedState, {
    selectedCrop: 'radish',
    ledCycle: '16h-red-blue',
    wateringMode: 'aeroponic-mist',
    compostEnabled: true,
  });
  assert.equal(gardened.garden.selectedCrop, 'radish');

  const taskIdsByRank = [...gardened.priorityBoard.tasks]
    .sort((a, b) => a.recommendedRank - b.recommendedRank)
    .map((t) => t.id);
  const prioritized = submitPriorityBoard(gardened, taskIdsByRank);
  assert.equal(prioritized.priorityBoard.completedForSol, true);
  assert.equal(prioritized.priorityBoard.lastScore, 3);
  assert.ok(prioritized.unlockedBadges.includes('badge_mission_planner'));
});

