/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScenarioId, SolarFlareRiskLevel, SolarFlareTelemetry } from '../types/game';
import donkiJson from '../data/donkiEvents.json';

export interface DonkiFlareRecord {
  id: string;
  donkiEventId: string;
  eventType: string;
  date: string;
  flareClass: string;
  activeRegion: string;
  cmeSpeedKmS: number;
  protonFluxPfu: number;
  kpIndex: number;
  riskLevel: SolarFlareRiskLevel;
  baseRiskScorePct: number;
  sourceBadge: 'LIVE' | 'ARCHIVED';
  summary: string;
  realPlannerNote: string;
}

export const DONKI_ARCHIVE_EVENTS: DonkiFlareRecord[] = donkiJson.events as DonkiFlareRecord[];

export const DONKI_CATALOG: Record<'quiet' | 'elevated' | 'high_ar3664' | 'high_ar3842' | 'critical_spe', DonkiFlareRecord> = {
  quiet: DONKI_ARCHIVE_EVENTS[0],
  elevated: DONKI_ARCHIVE_EVENTS[1],
  high_ar3664: DONKI_ARCHIVE_EVENTS[2],
  high_ar3842: DONKI_ARCHIVE_EVENTS[3],
  critical_spe: DONKI_ARCHIVE_EVENTS[4],
};

export const HIGH_FLARE_RISK_THRESHOLD_PCT = 70;

export function isHighSolarFlareRisk(telemetry?: SolarFlareTelemetry | null): boolean {
  if (!telemetry) return false;
  return telemetry.riskLevel === 'high' || telemetry.riskLevel === 'critical';
}

/**
 * Evaluates NASA DONKI solar flare telemetry and risk level for the current simulation tick.
 * Supports optional live NASA DONKI overrides fetched via /api/donki.
 */
export function evaluateSolarFlareRisk(
  scenario: ScenarioId,
  solNumber: number,
  solTime: number,
  solarFlareActive: boolean,
  solarFlareTimeRemainingSec: number,
  dataMode: 'ARCHIVED' | 'LIVE' = 'ARCHIVED',
  liveOverride?: DonkiFlareRecord | null
): SolarFlareTelemetry {
  if (solarFlareActive) {
    const rec = liveOverride && liveOverride.riskLevel === 'critical' ? liveOverride : DONKI_CATALOG.critical_spe;
    return {
      riskLevel: 'critical',
      riskScorePct: rec.baseRiskScorePct,
      flareClass: rec.flareClass,
      protonFluxPfu: rec.protonFluxPfu,
      activeRegion: rec.activeRegion,
      donkiEventId: rec.donkiEventId,
      donkiDate: rec.date,
      sourceBadge: liveOverride ? liveOverride.sourceBadge : dataMode,
      cmeSpeedKmS: rec.cmeSpeedKmS,
      etaHours: 0,
      advisory: `CME proton storm underway (${Math.ceil(solarFlareTimeRemainingSec)}s)! Keep crew in Storm Shelter (-96% Rad).`,
    };
  }

  if (dataMode === 'LIVE' && liveOverride) {
    return {
      riskLevel: liveOverride.riskLevel,
      riskScorePct: liveOverride.baseRiskScorePct,
      flareClass: liveOverride.flareClass,
      protonFluxPfu: liveOverride.protonFluxPfu,
      activeRegion: liveOverride.activeRegion,
      donkiEventId: liveOverride.donkiEventId,
      donkiDate: liveOverride.date,
      sourceBadge: liveOverride.sourceBadge,
      cmeSpeedKmS: liveOverride.cmeSpeedKmS,
      etaHours: isHighSolarFlareRisk({
        riskLevel: liveOverride.riskLevel,
      } as SolarFlareTelemetry)
        ? 8
        : null,
      advisory: liveOverride.summary,
    };
  }

  // Solar Storm scenario opens with an active X-class DONKI warning before Sol 2 proton arrival
  if (scenario === 'solar_storm') {
    const progressToImpact = (solNumber - 1) + solTime;
    if (progressToImpact < 1.4) {
      const rec = DONKI_CATALOG.high_ar3664;
      const ratioToImpact = Math.max(0, Math.min(1, progressToImpact / 1.4));
      const riskScorePct = Math.round(78 + ratioToImpact * 16);
      const etaHours = Math.max(1, Math.round((1.4 - progressToImpact) * 24));
      const protonFluxPfu = Math.round(rec.protonFluxPfu + ratioToImpact * 180);
      return {
        riskLevel: 'high',
        riskScorePct,
        flareClass: rec.flareClass,
        protonFluxPfu,
        activeRegion: rec.activeRegion,
        donkiEventId: rec.donkiEventId,
        donkiDate: rec.date,
        sourceBadge: 'ARCHIVED',
        cmeSpeedKmS: rec.cmeSpeedKmS,
        etaHours,
        advisory: `High solar flare risk from ${rec.activeRegion} (${rec.flareClass}). Proton wave ETA ~${etaHours}h — sinter regolith roof or ready Storm Shelter!`,
      };
    }

    if (solNumber === 7 && solTime >= 0.25 && solTime <= 0.75) {
      const rec = DONKI_CATALOG.high_ar3842;
      return {
        riskLevel: 'high',
        riskScorePct: rec.baseRiskScorePct,
        flareClass: rec.flareClass,
        protonFluxPfu: rec.protonFluxPfu,
        activeRegion: rec.activeRegion,
        donkiEventId: rec.donkiEventId,
        donkiDate: rec.date,
        sourceBadge: 'ARCHIVED',
        cmeSpeedKmS: rec.cmeSpeedKmS,
        etaHours: 6,
        advisory: rec.summary,
      };
    }

    const postStormRec = solNumber <= 3 ? DONKI_CATALOG.elevated : DONKI_CATALOG.quiet;
    const postLevel: SolarFlareRiskLevel = solNumber <= 3 ? 'elevated' : 'nominal';
    return {
      riskLevel: postLevel,
      riskScorePct: postStormRec.baseRiskScorePct,
      flareClass: postStormRec.flareClass,
      protonFluxPfu: postStormRec.protonFluxPfu,
      activeRegion: postStormRec.activeRegion,
      donkiEventId: postStormRec.donkiEventId,
      donkiDate: postStormRec.date,
      sourceBadge: 'ARCHIVED',
      cmeSpeedKmS: postStormRec.cmeSpeedKmS,
      etaHours: null,
      advisory: postStormRec.summary,
    };
  }

  // Standard missions follow deterministic DONKI solar activity windows
  if (solNumber >= 3 && solNumber % 6 === 3 && solTime >= 0.25 && solTime <= 0.85) {
    const rec = DONKI_CATALOG.high_ar3842;
    const waveBoost = Math.round(Math.sin(((solTime - 0.25) / 0.6) * Math.PI) * 10);
    return {
      riskLevel: 'high',
      riskScorePct: Math.min(92, rec.baseRiskScorePct + waveBoost),
      flareClass: rec.flareClass,
      protonFluxPfu: rec.protonFluxPfu + waveBoost * 4,
      activeRegion: rec.activeRegion,
      donkiEventId: rec.donkiEventId,
      donkiDate: rec.date,
      sourceBadge: 'ARCHIVED',
      cmeSpeedKmS: rec.cmeSpeedKmS,
      etaHours: Math.max(1, Math.round((0.85 - solTime) * 16)),
      advisory: `High solar flare risk detected by NASA DONKI (${rec.flareClass}, ${rec.activeRegion}). Monitor Shield & Rad Dose.`,
    };
  }

  if (solNumber % 2 === 0 && solTime >= 0.35 && solTime <= 0.70) {
    const rec = DONKI_CATALOG.elevated;
    return {
      riskLevel: 'elevated',
      riskScorePct: rec.baseRiskScorePct,
      flareClass: rec.flareClass,
      protonFluxPfu: rec.protonFluxPfu,
      activeRegion: rec.activeRegion,
      donkiEventId: rec.donkiEventId,
      donkiDate: rec.date,
      sourceBadge: 'ARCHIVED',
      cmeSpeedKmS: rec.cmeSpeedKmS,
      etaHours: null,
      advisory: rec.summary,
    };
  }

  const quietRec = DONKI_CATALOG.quiet;
  return {
    riskLevel: 'nominal',
    riskScorePct: quietRec.baseRiskScorePct,
    flareClass: quietRec.flareClass,
    protonFluxPfu: quietRec.protonFluxPfu,
    activeRegion: quietRec.activeRegion,
    donkiEventId: quietRec.donkiEventId,
    donkiDate: quietRec.date,
    sourceBadge: 'ARCHIVED',
    cmeSpeedKmS: quietRec.cmeSpeedKmS,
    etaHours: null,
    advisory: quietRec.summary,
  };
}
