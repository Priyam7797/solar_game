/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState } from '../types/game';

export interface LearningBadge {
  id: string;
  title: string;
  icon: string;
  description: string;
  check: (state: GameState) => boolean;
}

export const LEARNING_BADGES: LearningBadge[] = [
  {
    id: 'badge_tradeoff_thinker',
    title: 'Trade-Off Thinker',
    icon: '⚖️',
    description: 'Reviewed Cost Cards and completed 3+ intentional base decisions.',
    check: (s) => s.decisionTimeline.length >= 3,
  },
  {
    id: 'badge_storm_guardian',
    title: 'Storm Guardian',
    icon: '🛡️',
    description: 'Protected crew under 100 mSv dose or solved a crisis puzzle.',
    check: (s) => s.puzzlesSolvedCount >= 1 || s.stats.maxDoseMsv < 60,
  },
  {
    id: 'badge_space_botanist',
    title: 'Space Botanist',
    icon: '🌱',
    description: 'Configured NASA Veggie settings in the Garden Guide & built a Greenhouse.',
    check: (s) =>
      s.modules.some((m) => m.typeId === 'aeroponic_greenhouse' && m.active) &&
      s.garden.ledCycle === '16h-red-blue' &&
      s.garden.wateringMode === 'aeroponic-mist',
  },
  {
    id: 'badge_mission_planner',
    title: 'Mission Planner',
    icon: '📋',
    description: 'Completed the Daily Priority Board with strong planner ranking.',
    check: (s) => s.priorityBoard.completedForSol || (s.priorityBoard.lastScore ?? 0) >= 2,
  },
  {
    id: 'badge_rover_explorer',
    title: 'ISRU Explorer',
    icon: '🛞',
    description: 'Completed a Rover Research Trip balancing Oxygen & Battery costs.',
    check: (s) => s.roverTripsCompleted >= 1,
  },
  {
    id: 'badge_mars_pioneer',
    title: 'Red Planet Navigator',
    icon: '🔴',
    description: 'Managed an outpost on Mars despite light-time comms delay.',
    check: (s) => s.planet === 'mars' && s.environment.solNumber >= 2,
  },
];

export function evaluateUnlockedBadges(state: GameState): string[] {
  const next = new Set(state.unlockedBadges || []);
  for (const badge of LEARNING_BADGES) {
    if (badge.check(state)) {
      next.add(badge.id);
    }
  }
  return Array.from(next);
}
