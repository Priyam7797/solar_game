import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanSolarPanels,
  createInitialState,
  launchRoverExpedition,
  placeModule,
  resolveCrisisPuzzle,
  submitPriorityBoard,
  unlockTechnology,
  upgradeModuleRegolith,
} from './simulation';
import {
  buildEnrichedDebriefSummary,
  getNasaReferenceForCrisis,
} from './debriefData';
import {
  buildMissionDebriefPdfBytes,
  formatMissionDebriefTextReport,
  getDebriefReportFilename,
} from './debriefReport';
import { ScheduledCrisisEvent } from '../types/game';

test('getNasaReferenceForCrisis maps every crisis type to real NASA datasets', () => {
  const crisisTypes: ScheduledCrisisEvent['puzzleType'][] = [
    'solar_flare',
    'dust_storm',
    'power_failure',
    'micrometeoroid_leak',
    'recycler_jam',
    'crop_problem',
  ];

  for (const puzzleType of crisisTypes) {
    const ref = getNasaReferenceForCrisis(
      {
        id: `test_${puzzleType}`,
        puzzleType,
        title: `Test ${puzzleType}`,
        triggerSol: 3,
        warningLeadSols: 1,
        donkiEventId: puzzleType === 'solar_flare' ? '2024-05-14T16:51:00-FLR-001' : undefined,
        donkiClass: puzzleType === 'solar_flare' ? 'X8.7' : undefined,
        sourceBadge: 'ARCHIVED',
        resolved: false,
      },
      'ARCHIVED'
    );

    assert.ok(ref.sourceProgram.startsWith('NASA'));
    assert.ok(ref.recordId.length > 0);
    assert.ok(ref.summary.length > 20);
    assert.ok(ref.plannerTakeaway.length > 15);
    assert.equal(ref.sourceBadge, 'ARCHIVED');

    if (puzzleType === 'solar_flare') {
      assert.ok(ref.donkiMetrics);
      assert.equal(ref.donkiMetrics.flareClass, 'X8.7');
      assert.equal(ref.donkiMetrics.activeRegion, 'AR 3664');
      assert.equal(ref.donkiMetrics.protonFluxPfu, 145);
      assert.equal(ref.donkiMetrics.cmeSpeedKmS, 1620);
      assert.equal(ref.donkiMetrics.kpIndex, 7);
    }
  }
});

test('decisionTimeline records enriched costs and NASA data across actions and debrief summarizes ledger', () => {
  let state = createInitialState('martian_dust', 'mars');
  state = { ...state, phase: 'playing', paused: false };

  // 1. Place Greenhouse module
  const buildRes = placeModule(state, 'aeroponic_greenhouse', 4, 4, { useBuildTime: true });
  assert.equal(buildRes.success, true);
  state = buildRes.state;

  // 2. Launch Rover trip
  const roverRes = launchRoverExpedition(state);
  assert.equal(roverRes.success, true);
  state = roverRes.state;

  // 3. Upgrade Command Hub with sintered regolith roof
  const roofRes = upgradeModuleRegolith(state, 'mod_cmd_0');
  assert.equal(roofRes.success, true);
  state = roofRes.state;

  // 4. Clean Solar Panels
  state = cleanSolarPanels(state);

  // 5. Unlock Hydroponics Research
  const techRes = unlockTechnology(state, 'tech_efficient_hydroponics');
  assert.equal(techRes.success, true);
  state = techRes.state;

  // 6. Submit Daily Priority Board
  state = submitPriorityBoard(
    state,
    state.priorityBoard.tasks.map((t) => t.id)
  );

  // 7. Trigger and resolve scheduled Sol 3 crisis
  const crisis = state.upcomingEvents[0];
  state = { ...state, activeCrisis: crisis, paused: true };
  state = resolveCrisisPuzzle(state, crisis.id, true);

  assert.equal(state.decisionTimeline.length, 7);

  const summary = buildEnrichedDebriefSummary(state);
  assert.equal(summary.ledger.totalDecisions, 7);
  assert.ok(summary.ledger.metalSpentKg >= 165);
  assert.ok(summary.ledger.regolithSpentKg >= 280);
  assert.ok(summary.ledger.batterySpentKwh >= 47);
  assert.ok(summary.ledger.oxygenSpentKg >= 8);
  assert.ok(summary.ledger.scienceSpent >= 25);
  assert.equal(summary.ledger.crisesResolved, 1);

  for (const decision of summary.decisions) {
    assert.ok(decision.costSummary.length > 0);
    assert.ok(decision.nasaRef, `Expected NASA ref on decision ${decision.action}`);
    assert.ok(decision.nasaRef.recordId.length > 0);
  }

  assert.ok(summary.crisisLinks.length >= 2);
  assert.equal(summary.crisisLinks[0].status, 'solved');
  assert.ok(summary.insights.length === 3);
});

test('formatMissionDebriefTextReport and buildMissionDebriefPdfBytes generate take-home student reports', () => {
  let state = createInitialState('solar_storm', 'moon');
  state = { ...state, phase: 'playing', paused: false };

  const buildRes = placeModule(state, 'aeroponic_greenhouse', 4, 4, { useBuildTime: true });
  assert.equal(buildRes.success, true);
  state = buildRes.state;

  const crisis = state.upcomingEvents[0];
  state = { ...state, activeCrisis: crisis, paused: true };
  state = resolveCrisisPuzzle(state, crisis.id, true);

  assert.equal(getDebriefReportFilename(state, 'pdf'), 'sol-base-moon-sol-1-debrief.pdf');
  assert.equal(getDebriefReportFilename(state, 'txt'), 'sol-base-moon-sol-1-debrief.txt');

  const txt = formatMissionDebriefTextReport(state, 'Cadet Maya');
  assert.ok(txt.includes('Cadet Maya'));
  assert.ok(txt.includes('Moon - Shackleton Crater'));
  assert.ok(txt.includes('Built Greenhouse'));
  assert.ok(txt.includes('X-Class Solar Flare'));
  assert.ok(txt.includes('NASA DONKI'));
  assert.ok(txt.includes('EDUCATIONAL PERFORMANCE INSIGHTS'));

  const pdfBytes = buildMissionDebriefPdfBytes(state, 'Cadet Maya');
  const pdfText = new TextDecoder().decode(pdfBytes);
  assert.ok(pdfText.startsWith('%PDF-1.4\n'));
  assert.ok(pdfText.includes('/Type /Catalog'));
  assert.ok(pdfText.includes('/BaseFont /Helvetica-Bold'));
  assert.ok(pdfText.includes('Cadet Maya'));
  assert.ok(pdfText.includes('xref'));
  assert.ok(pdfText.trim().endsWith('%%EOF'));
});
