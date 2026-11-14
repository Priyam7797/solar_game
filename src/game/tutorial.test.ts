/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTORIAL_DURATION_SEC,
  TUTORIAL_STEPS,
  advanceTutorialTick,
  createTutorialState,
  getTutorialStepForTime,
  goToTutorialStep,
  recordTutorialModulePlacement,
  restartTutorial,
  skipTutorial,
} from './tutorialData';

test('getTutorialStepForTime maps 0-60s across 4 orientation steps', () => {
  assert.equal(getTutorialStepForTime(0), 0);
  assert.equal(getTutorialStepForTime(14.9), 0);
  assert.equal(getTutorialStepForTime(15), 1);
  assert.equal(getTutorialStepForTime(29.9), 1);
  assert.equal(getTutorialStepForTime(30), 2);
  assert.equal(getTutorialStepForTime(44.9), 2);
  assert.equal(getTutorialStepForTime(45), 3);
  assert.equal(getTutorialStepForTime(59.9), 3);
});

test('advanceTutorialTick progresses through 60s and pauses when simulation is paused', () => {
  let state = createTutorialState(true);
  assert.equal(state.active, true);
  assert.equal(state.currentStepIndex, 0);

  // Paused ticks must not advance elapsedSec
  const pausedState = advanceTutorialTick(state, 5, true);
  assert.equal(pausedState.elapsedSec, 0);

  // Active ticks advance step automatically at 15s, 30s, 45s
  state = advanceTutorialTick(state, 16, false);
  assert.equal(state.currentStepIndex, 1);
  assert.equal(TUTORIAL_STEPS[state.currentStepIndex].targetId, 'build-dock');

  state = advanceTutorialTick(state, 15, false); // 31s
  assert.equal(state.currentStepIndex, 2);
  assert.equal(TUTORIAL_STEPS[state.currentStepIndex].targetId, 'time-controls');

  state = advanceTutorialTick(state, 15, false); // 46s
  assert.equal(state.currentStepIndex, 3);
  assert.equal(TUTORIAL_STEPS[state.currentStepIndex].targetId, 'crew-rad-bar');

  // Advancing past 60s completes and closes tutorial
  state = advanceTutorialTick(state, 14, false); // 60s
  assert.equal(state.active, false);
  assert.equal(state.completed, true);
  assert.equal(state.elapsedSec, TUTORIAL_DURATION_SEC);
});

test('manual navigation, skip, restart, and module placement tracking work cleanly', () => {
  let state = createTutorialState(true);

  // Jump forward & backward
  state = goToTutorialStep(state, 2);
  assert.equal(state.currentStepIndex, 2);
  assert.equal(state.elapsedSec, TUTORIAL_STEPS[2].startSec);

  state = goToTutorialStep(state, 1);
  assert.equal(state.currentStepIndex, 1);
  assert.equal(state.elapsedSec, TUTORIAL_STEPS[1].startSec);

  // Record module placement during tutorial
  state = recordTutorialModulePlacement(state);
  assert.equal(state.modulesPlacedDuringTutorial, 1);

  // Skip marks completed and inactive
  state = skipTutorial(state);
  assert.equal(state.active, false);
  assert.equal(state.completed, true);

  // Restart resets to step 0 and 0s
  state = restartTutorial(state);
  assert.equal(state.active, true);
  assert.equal(state.completed, false);
  assert.equal(state.elapsedSec, 0);
  assert.equal(state.currentStepIndex, 0);
  assert.equal(state.modulesPlacedDuringTutorial, 0);
});
