/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState } from '../types/game';
import type { CoreMeterDisplay } from './simulation';

export type ResourcePulseColor = 'green' | 'yellow' | 'red';
export type MonitoredResourceId = 'power' | 'life_support' | 'food';

export interface CriticalResourceNotification {
  id: MonitoredResourceId;
  label: string;
  bannerText: string;
  speechText: string;
}

export interface OxygenWaterStatuses {
  oxygenStatus: ResourcePulseColor;
  waterStatus: ResourcePulseColor;
}

/**
 * Returns the CSS pulse animation class matching green/yellow/red resource severity.
 */
export function getResourcePulseClass(status: ResourcePulseColor): string {
  switch (status) {
    case 'red':
      return 'animate-resource-pulse-red';
    case 'yellow':
      return 'animate-resource-pulse-yellow';
    default:
      return 'animate-resource-pulse-green';
  }
}

/**
 * Computes individual Oxygen (O₂) and Water (H₂O) status colors so players
 * can spot which life-support consumable is running low inside the combined meter.
 */
export function getOxygenAndWaterStatuses(state: GameState): OxygenWaterStatuses {
  const res = state.resources;
  const o2Pct = (res.oxygenKg / Math.max(1, res.oxygenMaxKg)) * 100;
  const waterPct = (res.waterLiters / Math.max(1, res.waterMaxLiters)) * 100;

  const o2DaysLeft =
    res.netOxygenKgPerSol < -0.05 ? res.oxygenKg / Math.abs(res.netOxygenKgPerSol) : Infinity;
  const waterDaysLeft =
    res.netWaterLitersPerSol < -0.05 ? res.waterLiters / Math.abs(res.netWaterLitersPerSol) : Infinity;

  const oxygenStatus: ResourcePulseColor =
    o2Pct <= 22 || o2DaysLeft <= 4
      ? 'red'
      : o2Pct <= 45 || o2DaysLeft <= 10
      ? 'yellow'
      : 'green';

  const waterStatus: ResourcePulseColor =
    waterPct <= 22 || waterDaysLeft <= 4
      ? 'red'
      : waterPct <= 45 || waterDaysLeft <= 10
      ? 'yellow'
      : 'green';

  return { oxygenStatus, waterStatus };
}

/**
 * Detects transitions into critical ('red') state for Power, Oxygen/Water (Life Support),
 * and Food, generating brief ARIA voice & caption notifications without repeating every frame.
 */
export function detectCriticalResourceNotifications(
  prevStatuses: Partial<Record<MonitoredResourceId, ResourcePulseColor>>,
  nextMeters: Record<'power' | 'life_support' | 'food' | 'shield', CoreMeterDisplay>,
  state: GameState
): CriticalResourceNotification[] {
  const notifications: CriticalResourceNotification[] = [];
  const monitored: MonitoredResourceId[] = ['power', 'life_support', 'food'];

  for (const id of monitored) {
    const nextStatus = nextMeters[id].status;
    const prevStatus = prevStatuses[id];

    if (nextStatus === 'red' && prevStatus !== 'red') {
      if (id === 'power') {
        notifications.push({
          id: 'power',
          label: 'Power critical',
          bannerText: `Power at ${nextMeters.power.pct}% — shed heavy loads or add Solar or Kilopower backup.`,
          speechText: 'ARIA alert: Power is critical. Check battery reserves and shed heavy loads.',
        });
      } else if (id === 'life_support') {
        const { oxygenStatus, waterStatus } = getOxygenAndWaterStatuses(state);
        const detail =
          oxygenStatus === 'red' && waterStatus === 'red'
            ? 'Oxygen and Water are critically low.'
            : oxygenStatus === 'red'
            ? 'Oxygen reserve is critically low.'
            : waterStatus === 'red'
            ? 'Water reserve is critically low.'
            : 'Life Support reserves are critically low.';
        notifications.push({
          id: 'life_support',
          label: 'O₂ / Water critical',
          bannerText: `${detail} Check grid power and the Recycler.`,
          speechText: `ARIA alert: ${detail} Check life support power right away.`,
        });
      } else if (id === 'food') {
        notifications.push({
          id: 'food',
          label: 'Food critical',
          bannerText: `Rations critically low (${nextMeters.food.amountText}) — check the Greenhouse.`,
          speechText: 'ARIA alert: Food rations are critically low. Check your greenhouse.',
        });
      }
    }
  }

  return notifications;
}
