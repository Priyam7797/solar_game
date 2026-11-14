/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TUTORIAL_DURATION_SEC = 60;
export const TUTORIAL_STORAGE_KEY = 'aethel_first_mission_tutorial_completed_v1';

export type TutorialTargetId =
  | 'telemetry-bar'
  | 'build-dock'
  | 'time-controls'
  | 'crew-rad-bar';

export interface TutorialStep {
  id: string;
  stepNumber: number;
  startSec: number;
  endSec: number;
  targetId: TutorialTargetId;
  badge: string;
  title: string;
  description: string;
  actionPrompt: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'resource_bar',
    stepNumber: 1,
    startSec: 0,
    endSec: 15,
    targetId: 'telemetry-bar',
    badge: '0s – 15s · Core meters',
    title: 'Watch your 3 core resources and shield',
    description:
      'Keep an eye on Power, Life support (tap to split Oxygen & Water), Food (~90 days of rations plus greenhouse crops), and Shield. Every meter shows sols remaining and a color-independent status icon.',
    actionPrompt: 'Click Life support to inspect Oxygen vs. Water',
  },
  {
    id: 'module_placement',
    stepNumber: 2,
    startSec: 15,
    endSec: 30,
    targetId: 'build-dock',
    badge: '15s – 30s · Cost cards & building',
    title: 'Read cost cards before building',
    description:
      'Every build involves a trade-off. Select any module card below to review its Gain, Pay, and Risk card, then place it on open Moon or Mars ground.',
    actionPrompt: 'Select a build module below to inspect its cost card',
  },
  {
    id: 'mission_controls',
    stepNumber: 3,
    startSec: 30,
    endSec: 45,
    targetId: 'time-controls',
    badge: '30s – 45s · Time-lapse & tools',
    title: 'Fast-forward (1x–10x) & crew tools',
    description:
      'Use 1x, 2x, 5x, or 10x fast-forward — simulation auto-pauses when any Crisis arrives. Also check Priority Board, Garden Guide, Research [R], Log [L], and Data & Sources.',
    actionPrompt: 'Speed up time or open today’s Priority Board',
  },
  {
    id: 'crew_radiation',
    stepNumber: 4,
    startSec: 45,
    endSec: 60,
    targetId: 'crew-rad-bar',
    badge: '45s – 60s · Solar storm safety',
    title: 'Protect your crew from solar flares',
    description:
      'NASA DONKI alerts warn you before solar particle waves hit. Use Bunker crew during flares or sinter a 1 m regolith roof over your Habitat.',
    actionPrompt: 'You are ready to command SOL BASE',
  },
];

export interface TutorialState {
  active: boolean;
  completed: boolean;
  elapsedSec: number;
  currentStepIndex: number;
  modulesPlacedDuringTutorial: number;
}

export function createTutorialState(autoStart: boolean): TutorialState {
  return {
    active: autoStart,
    completed: false,
    elapsedSec: 0,
    currentStepIndex: 0,
    modulesPlacedDuringTutorial: 0,
  };
}

export function getTutorialStepForTime(elapsedSec: number): number {
  const clamped = Math.max(0, elapsedSec);
  for (let i = TUTORIAL_STEPS.length - 1; i >= 0; i--) {
    if (clamped >= TUTORIAL_STEPS[i].startSec) {
      return i;
    }
  }
  return 0;
}

export function advanceTutorialTick(
  state: TutorialState,
  dtSec: number,
  isPaused: boolean
): TutorialState {
  if (!state.active || isPaused || dtSec <= 0) {
    return state;
  }

  const nextElapsed = state.elapsedSec + dtSec;
  if (nextElapsed >= TUTORIAL_DURATION_SEC) {
    return {
      ...state,
      active: false,
      completed: true,
      elapsedSec: TUTORIAL_DURATION_SEC,
      currentStepIndex: TUTORIAL_STEPS.length - 1,
    };
  }

  const nextStepIndex = getTutorialStepForTime(nextElapsed);
  return {
    ...state,
    elapsedSec: nextElapsed,
    currentStepIndex: nextStepIndex,
  };
}

export function goToTutorialStep(
  state: TutorialState,
  stepIndex: number
): TutorialState {
  const clampedIndex = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, stepIndex));
  const step = TUTORIAL_STEPS[clampedIndex];
  return {
    ...state,
    active: true,
    completed: false,
    elapsedSec: step.startSec,
    currentStepIndex: clampedIndex,
  };
}

export function skipTutorial(state: TutorialState): TutorialState {
  return {
    ...state,
    active: false,
    completed: true,
  };
}

export function restartTutorial(state: TutorialState): TutorialState {
  return {
    ...state,
    active: true,
    completed: false,
    elapsedSec: 0,
    currentStepIndex: 0,
    modulesPlacedDuringTutorial: 0,
  };
}

export function recordTutorialModulePlacement(state: TutorialState): TutorialState {
  if (!state.active) return state;
  return {
    ...state,
    modulesPlacedDuringTutorial: state.modulesPlacedDuringTutorial + 1,
  };
}

export function hasCompletedFirstMissionTutorial(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markFirstMissionTutorialCompleted(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
}
