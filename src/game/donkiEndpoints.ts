/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SolarFlareRiskLevel } from '../types/game';
import type { DonkiFlareRecord } from './spaceWeatherData';

export type DonkiEndpointId =
  | 'FLR'
  | 'CME'
  | 'CMEAnalysis'
  | 'GST'
  | 'IPS'
  | 'SEP'
  | 'MPC'
  | 'RBE'
  | 'HSS'
  | 'WSAEnlilSimulations'
  | 'notifications';

export interface DonkiEndpointSpec {
  id: DonkiEndpointId;
  name: string;
  shortLabel: string;
  impactArea: string;
  kidDescription: string;
  nasaPath: string;
  exampleQuery: string;
}

export const DONKI_ENDPOINTS: DonkiEndpointSpec[] = [
  {
    id: 'FLR',
    name: 'Solar Flare (FLR)',
    shortLabel: 'FLR · Flares',
    impactArea: 'Sudden X-ray & UV flash',
    kidDescription:
      'Tracks bright explosions on the Sun (C, M, and X-class flares) that arrive at the Moon and Mars in minutes at light speed.',
    nasaPath: 'https://api.nasa.gov/DONKI/FLR',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&api_key=DEMO_KEY',
  },
  {
    id: 'CME',
    name: 'Coronal Mass Ejection (CME)',
    shortLabel: 'CME · Plasma Cloud',
    impactArea: 'Giant solar plasma wave',
    kidDescription:
      'Tracks huge bubbles of solar gas hurled into space after a flare—warning crews hours or days before radiation clouds arrive.',
    nasaPath: 'https://api.nasa.gov/DONKI/CME',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&api_key=DEMO_KEY',
  },
  {
    id: 'CMEAnalysis',
    name: 'CME Analysis',
    shortLabel: 'CMEAnalysis · Speed/Cone',
    impactArea: 'Exact speed & Earth/Moon/Mars aim',
    kidDescription:
      'Measures each plasma cloud’s exact speed (km/s) and cone angle so NASA knows whether it will strike Earth, the Moon, or Mars.',
    nasaPath: 'https://api.nasa.gov/DONKI/CMEAnalysis',
    exampleQuery:
      'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&mostAccurateOnly=true&speed=500&halfAngle=30&catalog=ALL&api_key=DEMO_KEY',
  },
  {
    id: 'SEP',
    name: 'Solar Energetic Particle (SEP)',
    shortLabel: 'SEP · Proton Storm',
    impactArea: 'Direct crew radiation hazard',
    kidDescription:
      'Measures super-fast solar protons (in pfu) that pass right through thin spacesuits and force astronauts into storm shelters.',
    nasaPath: 'https://api.nasa.gov/DONKI/SEP',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&api_key=DEMO_KEY',
  },
  {
    id: 'GST',
    name: 'Geomagnetic Storm (GST)',
    shortLabel: 'GST · Kp Index',
    impactArea: 'Earth link & aurora storm',
    kidDescription:
      'Tracks the Kp magnetic storm scale (0–9). High Kp storms disrupt Mission Control radio relays and Earth-orbit satellites.',
    nasaPath: 'https://api.nasa.gov/DONKI/GST',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&api_key=DEMO_KEY',
  },
  {
    id: 'IPS',
    name: 'Interplanetary Shock (IPS)',
    shortLabel: 'IPS · Shockwave',
    impactArea: 'Deep-space shock front',
    kidDescription:
      'Spots fast shockwaves racing through the solar wind as they pass space weather satellites heading toward the Moon and Mars.',
    nasaPath: 'https://api.nasa.gov/DONKI/IPS',
    exampleQuery:
      'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&location=ALL&catalog=ALL&api_key=DEMO_KEY',
  },
  {
    id: 'MPC',
    name: 'Magnetopause Crossing (MPC)',
    shortLabel: 'MPC · Shield Squeeze',
    impactArea: 'Magnetic shield compression',
    kidDescription:
      'Detects when solar wind pushes Earth’s protective magnetic shield inward—exposing high-altitude relays to raw space weather.',
    nasaPath: 'https://api.nasa.gov/DONKI/MPC',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&api_key=DEMO_KEY',
  },
  {
    id: 'RBE',
    name: 'Radiation Belt Enhancement (RBE)',
    shortLabel: 'RBE · Electron Belts',
    impactArea: 'Transit spacecraft electronics',
    kidDescription:
      'Watches surges of high-energy electrons in space radiation belts that Artemis crews must cross on their trip to the Moon.',
    nasaPath: 'https://api.nasa.gov/DONKI/RBE',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&api_key=DEMO_KEY',
  },
  {
    id: 'HSS',
    name: 'High Speed Stream (HSS)',
    shortLabel: 'HSS · Solar Wind',
    impactArea: 'Fast coronal-hole wind (>600 km/s)',
    kidDescription:
      'Tracks fast streams of solar wind escaping sunspot holes, charging lunar dust electrically and buffeting Mars’s thin air.',
    nasaPath: 'https://api.nasa.gov/DONKI/HSS',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&api_key=DEMO_KEY',
  },
  {
    id: 'WSAEnlilSimulations',
    name: 'WSA+Enlil Simulation',
    shortLabel: 'WSA+Enlil · Forecast Model',
    impactArea: 'Predicted arrival time (Moon & Mars)',
    kidDescription:
      'NASA’s 3D physics forecast model predicting exactly when a solar storm cloud will hit Earth, the Moon, or Mars rovers.',
    nasaPath: 'https://api.nasa.gov/DONKI/WSAEnlilSimulations',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&api_key=DEMO_KEY',
  },
  {
    id: 'notifications',
    name: 'DONKI Notifications',
    shortLabel: 'Notifications · Bulletins',
    impactArea: 'Human forecaster alerts',
    kidDescription:
      'Official text bulletins written by NASA’s Moon to Mars Space Weather Analysis Office telling flight directors what action to take.',
    nasaPath: 'https://api.nasa.gov/DONKI/notifications',
    exampleQuery: 'startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&type=all&api_key=DEMO_KEY',
  },
];

export const DONKI_ENDPOINT_MAP: Record<DonkiEndpointId, DonkiEndpointSpec> =
  Object.fromEntries(DONKI_ENDPOINTS.map((e) => [e.id, e])) as Record<
    DonkiEndpointId,
    DonkiEndpointSpec
  >;

export function isValidDonkiEndpoint(value: unknown): value is DonkiEndpointId {
  return typeof value === 'string' && value in DONKI_ENDPOINT_MAP;
}

/**
 * Builds the exact official api.nasa.gov/DONKI/* request URL for any of the 11 DONKI feeds.
 */
export function buildDonkiUpstreamUrl(
  endpoint: DonkiEndpointId,
  startDate: string,
  endDate: string,
  apiKey: string
): string {
  const key = encodeURIComponent(apiKey || 'DEMO_KEY');
  const start = encodeURIComponent(startDate);
  const end = encodeURIComponent(endDate);

  switch (endpoint) {
    case 'CMEAnalysis':
      return `https://api.nasa.gov/DONKI/CMEAnalysis?startDate=${start}&endDate=${end}&mostAccurateOnly=true&speed=500&halfAngle=30&catalog=ALL&api_key=${key}`;
    case 'IPS':
      return `https://api.nasa.gov/DONKI/IPS?startDate=${start}&endDate=${end}&location=ALL&catalog=ALL&api_key=${key}`;
    case 'notifications':
      return `https://api.nasa.gov/DONKI/notifications?startDate=${start}&endDate=${end}&type=all&api_key=${key}`;
    default:
      return `https://api.nasa.gov/DONKI/${endpoint}?startDate=${start}&endDate=${end}&api_key=${key}`;
  }
}

export function classifyRiskFromFlareClass(classType: string): {
  riskLevel: SolarFlareRiskLevel;
  riskScorePct: number;
  protonFluxPfu: number;
} {
  const upper = (classType || 'C1.0').toUpperCase();
  if (upper.startsWith('X')) {
    const mag = parseFloat(upper.slice(1)) || 1.0;
    return mag >= 5
      ? {
          riskLevel: 'critical',
          riskScorePct: 95,
          protonFluxPfu: Math.round(mag * 220),
        }
      : {
          riskLevel: 'high',
          riskScorePct: Math.min(92, Math.round(74 + mag * 4)),
          protonFluxPfu: Math.round(90 + mag * 35),
        };
  }
  if (upper.startsWith('M')) {
    return { riskLevel: 'elevated', riskScorePct: 56, protonFluxPfu: 16 };
  }
  return { riskLevel: 'nominal', riskScorePct: 24, protonFluxPfu: 2 };
}

function riskFromSpeed(speedKmS: number): {
  riskLevel: SolarFlareRiskLevel;
  riskScorePct: number;
  kpIndex: number;
} {
  if (speedKmS >= 1500) return { riskLevel: 'critical', riskScorePct: 92, kpIndex: 8 };
  if (speedKmS >= 1000) return { riskLevel: 'high', riskScorePct: 78, kpIndex: 6 };
  if (speedKmS >= 650) return { riskLevel: 'elevated', riskScorePct: 55, kpIndex: 4 };
  return { riskLevel: 'nominal', riskScorePct: 28, kpIndex: 2 };
}

function riskFromKp(kp: number): {
  riskLevel: SolarFlareRiskLevel;
  riskScorePct: number;
} {
  if (kp >= 8) return { riskLevel: 'critical', riskScorePct: 94 };
  if (kp >= 6) return { riskLevel: 'high', riskScorePct: 76 };
  if (kp >= 5) return { riskLevel: 'elevated', riskScorePct: 54 };
  return { riskLevel: 'nominal', riskScorePct: 25 };
}

function safeDateSlice(raw: unknown): string {
  const s = String(raw || '');
  return s.length >= 10 ? s.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

/**
 * Normalizes raw JSON arrays returned by any of NASA's 11 DONKI endpoints
 * into the simulation's unified DonkiFlareRecord shape.
 */
export function normalizeDonkiApiResponse(
  endpoint: DonkiEndpointId,
  rawData: unknown,
  sourceBadge: 'LIVE' | 'ARCHIVED' = 'LIVE'
): DonkiFlareRecord[] {
  if (!Array.isArray(rawData)) return [];

  const sliced = rawData.slice(-8).reverse();

  return sliced.map((entry, idx) => {
    const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;

    if (endpoint === 'FLR') {
      const classType = String(item.classType || 'C2.0');
      const activeRegion = item.activeRegionNum ? `AR ${item.activeRegionNum}` : 'Solar Limb';
      const beginTime = String(item.beginTime || new Date().toISOString());
      const date = safeDateSlice(beginTime);
      const cls = classifyRiskFromFlareClass(classType);
      return {
        id: `donki_flr_${idx}_${date}`,
        donkiEventId: String(item.flrID || `${date}-FLR-${idx}`),
        eventType: 'FLR',
        date,
        flareClass: classType,
        activeRegion,
        cmeSpeedKmS: cls.riskLevel === 'high' || cls.riskLevel === 'critical' ? 1250 : 520,
        protonFluxPfu: cls.protonFluxPfu,
        kpIndex: cls.riskLevel === 'high' || cls.riskLevel === 'critical' ? 6 : 3,
        riskLevel: cls.riskLevel,
        baseRiskScorePct: cls.riskScorePct,
        sourceBadge,
        summary: `NASA DONKI Solar Flare (${classType}) observed from ${activeRegion} on ${date}.`,
        realPlannerNote: 'Check radiation shelter status and monitor follow-on CME/SEP alerts.',
      };
    }

    if (endpoint === 'CME' || endpoint === 'CMEAnalysis') {
      const analyses = Array.isArray(item.cmeAnalyses)
        ? (item.cmeAnalyses as Record<string, unknown>[])
        : [];
      const firstAnalysis = analyses[0] || item;
      const speed = Math.round(Number(firstAnalysis.speed || item.speed || 620));
      const halfAngle = Math.round(Number(firstAnalysis.halfAngle || item.halfAngle || 30));
      const timeRaw = item.startTime || item.time21_5 || new Date().toISOString();
      const date = safeDateSlice(timeRaw);
      const cls = riskFromSpeed(speed);
      const activeRegion = item.activeRegionNum ? `AR ${item.activeRegionNum}` : 'Corona';
      return {
        id: `donki_${endpoint.toLowerCase()}_${idx}_${date}`,
        donkiEventId: String(item.activityID || item.associatedCMEID || `${date}-${endpoint}-${idx}`),
        eventType: endpoint,
        date,
        flareClass: `CME ${speed} km/s`,
        activeRegion,
        cmeSpeedKmS: speed,
        protonFluxPfu: speed >= 1200 ? 120 : speed >= 800 ? 25 : 4,
        kpIndex: cls.kpIndex,
        riskLevel: cls.riskLevel,
        baseRiskScorePct: cls.riskScorePct,
        sourceBadge,
        summary: `Coronal Mass Ejection (${speed} km/s, ${halfAngle}° half-angle) tracked from ${activeRegion}.`,
        realPlannerNote:
          speed >= 1000
            ? 'Fast CME (>1000 km/s) can trigger high-dose proton storms—prepare regolith shelter and battery reserve.'
            : 'Moderate plasma wave; monitor WSA+Enlil simulation for Moon/Mars arrival timing.',
      };
    }

    if (endpoint === 'SEP') {
      const date = safeDateSlice(item.eventTime);
      const instruments = Array.isArray(item.instruments)
        ? (item.instruments as Array<{ displayName?: string }>)
            .map((i) => i.displayName)
            .filter(Boolean)
            .join(', ')
        : 'GOES Particle Sensor';
      return {
        id: `donki_sep_${idx}_${date}`,
        donkiEventId: String(item.sepID || `${date}-SEP-${idx}`),
        eventType: 'SEP',
        date,
        flareClass: 'SEP Proton Event',
        activeRegion: instruments || 'GOES Proton',
        cmeSpeedKmS: 1400,
        protonFluxPfu: 145,
        kpIndex: 6,
        riskLevel: 'high',
        baseRiskScorePct: 84,
        sourceBadge,
        summary: `Solar Energetic Particle wave detected (${instruments})—fast protons elevate unshielded EVA dose.`,
        realPlannerNote: 'Suspend outdoor EVA/rover trips and shelter crew inside water/regolith shielded modules.',
      };
    }

    if (endpoint === 'GST') {
      const date = safeDateSlice(item.startTime);
      const kpList = Array.isArray(item.allKpIndex)
        ? (item.allKpIndex as Array<{ kpIndex?: number }>)
        : [];
      const maxKp = kpList.reduce((m, k) => Math.max(m, Number(k.kpIndex || 0)), 5);
      const cls = riskFromKp(maxKp);
      return {
        id: `donki_gst_${idx}_${date}`,
        donkiEventId: String(item.gstID || `${date}-GST-${idx}`),
        eventType: 'GST',
        date,
        flareClass: `G${Math.max(1, Math.min(5, Math.round(maxKp - 4)))} (Kp ${maxKp})`,
        activeRegion: 'Planetary Field',
        cmeSpeedKmS: maxKp >= 7 ? 1200 : 720,
        protonFluxPfu: maxKp >= 7 ? 45 : 8,
        kpIndex: maxKp,
        riskLevel: cls.riskLevel,
        baseRiskScorePct: cls.riskScorePct,
        sourceBadge,
        summary: `Geomagnetic Storm reached Kp ${maxKp} on ${date}, stressing Earth-relay communications.`,
        realPlannerNote: 'Expect noisy radio relays; rely on buffered local flight checklists during peak Kp.',
      };
    }

    if (endpoint === 'IPS') {
      const date = safeDateSlice(item.eventTime);
      const location = String(item.location || 'Earth');
      return {
        id: `donki_ips_${idx}_${date}`,
        donkiEventId: String(item.activityID || `${date}-IPS-${idx}`),
        eventType: 'IPS',
        date,
        flareClass: `Shock @ ${location}`,
        activeRegion: location,
        cmeSpeedKmS: 920,
        protonFluxPfu: 18,
        kpIndex: 5,
        riskLevel: 'elevated',
        baseRiskScorePct: 58,
        sourceBadge,
        summary: `Interplanetary Shockwave recorded passing ${location} by NASA space weather monitors.`,
        realPlannerNote: 'Interplanetary shocks compress plasma ahead of CMEs; top up batteries before storm arrival.',
      };
    }

    if (endpoint === 'MPC') {
      const date = safeDateSlice(item.eventTime);
      return {
        id: `donki_mpc_${idx}_${date}`,
        donkiEventId: String(item.mpcID || `${date}-MPC-${idx}`),
        eventType: 'MPC',
        date,
        flareClass: 'Shield Compression',
        activeRegion: 'Magnetopause',
        cmeSpeedKmS: 860,
        protonFluxPfu: 14,
        kpIndex: 5,
        riskLevel: 'elevated',
        baseRiskScorePct: 52,
        sourceBadge,
        summary: `Strong solar wind pushed Earth's magnetopause inward past geosynchronous relay satellites.`,
        realPlannerNote: 'Verify deep-space communications dishes and backup battery telemetry.',
      };
    }

    if (endpoint === 'RBE') {
      const date = safeDateSlice(item.eventTime);
      return {
        id: `donki_rbe_${idx}_${date}`,
        donkiEventId: String(item.rbeID || `${date}-RBE-${idx}`),
        eventType: 'RBE',
        date,
        flareClass: 'Electron Surge',
        activeRegion: 'Radiation Belts',
        cmeSpeedKmS: 780,
        protonFluxPfu: 12,
        kpIndex: 4,
        riskLevel: 'elevated',
        baseRiskScorePct: 48,
        sourceBadge,
        summary: `Radiation Belt Enhancement boosted energetic electrons along cislunar transit corridors.`,
        realPlannerNote: 'Check electronics shielding and schedule resupply capsules outside peak belt surges.',
      };
    }

    if (endpoint === 'HSS') {
      const date = safeDateSlice(item.eventTime);
      return {
        id: `donki_hss_${idx}_${date}`,
        donkiEventId: String(item.hssID || `${date}-HSS-${idx}`),
        eventType: 'HSS',
        date,
        flareClass: 'Fast Wind Stream',
        activeRegion: 'Coronal Hole',
        cmeSpeedKmS: 710,
        protonFluxPfu: 6,
        kpIndex: 4,
        riskLevel: 'elevated',
        baseRiskScorePct: 44,
        sourceBadge,
        summary: `High Speed Solar Wind Stream sweeping across inner solar system, charging fine surface dust.`,
        realPlannerNote: 'Inspect solar panels for static lunar dust buildup and keep O₂ scrubbers clear.',
      };
    }

    if (endpoint === 'WSAEnlilSimulations') {
      const date = safeDateSlice(item.modelCompletionTime || item.estimatedShockArrivalTime);
      const impactList = Array.isArray(item.impactList)
        ? (item.impactList as Array<{ location?: string; arrivalTime?: string; isGlancingBlow?: boolean }>)
        : [];
      const firstImpact = impactList[0];
      const targetStr = firstImpact?.location
        ? `${firstImpact.location} (${safeDateSlice(firstImpact.arrivalTime)})`
        : 'Inner Solar System';
      const kp180 = Number(item.kp_180 || item.kp_90 || 4);
      const cls = riskFromKp(kp180);
      return {
        id: `donki_enlil_${idx}_${date}`,
        donkiEventId: String(item.simulationID || `${date}-ENLIL-${idx}`),
        eventType: 'WSA+Enlil',
        date,
        flareClass: `Forecast Kp ${kp180}`,
        activeRegion: targetStr,
        cmeSpeedKmS: kp180 >= 6 ? 1180 : 680,
        protonFluxPfu: kp180 >= 6 ? 60 : 8,
        kpIndex: kp180,
        riskLevel: cls.riskLevel,
        baseRiskScorePct: cls.riskScorePct,
        sourceBadge,
        summary: `WSA+Enlil 3D solar wind simulation forecasts impact on ${targetStr}.`,
        realPlannerNote: 'Use forecast arrival countdown to sinter regolith and charge habitat batteries ahead of time.',
      };
    }

    // notifications
    const date = safeDateSlice(item.messageIssueTime);
    const msgType = String(item.messageType || 'Space Weather');
    const rawBody = String(item.messageBody || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 175);
    const isSevere = /X\d|SEP|G4|G5|S3|shock/i.test(rawBody + msgType);
    return {
      id: `donki_notif_${idx}_${date}`,
      donkiEventId: String(item.messageID || `${date}-MSG-${idx}`),
      eventType: msgType,
      date,
      flareClass: msgType,
      activeRegion: 'M2M Space Weather Office',
      cmeSpeedKmS: isSevere ? 1280 : 540,
      protonFluxPfu: isSevere ? 95 : 4,
      kpIndex: isSevere ? 6 : 3,
      riskLevel: isSevere ? 'high' : 'elevated',
      baseRiskScorePct: isSevere ? 78 : 45,
      sourceBadge,
      summary: rawBody || `Official NASA Moon to Mars Space Weather bulletin (${msgType}).`,
      realPlannerNote: 'NASA forecasters publish DONKI notifications so Artemis & Mars crews have clear guidance.',
    };
  });
}

/**
 * Provides authentic ARCHIVED samples per endpoint when NASA's live API is unavailable or rate-limited.
 */
export function getArchivedSamplesForEndpoint(endpoint: DonkiEndpointId): DonkiFlareRecord[] {
  const archiveByEndpoint: Record<DonkiEndpointId, DonkiFlareRecord[]> = {
    FLR: [
      {
        id: 'arch_flr_1',
        donkiEventId: '2024-05-14T16:51:00-FLR-001',
        eventType: 'FLR',
        date: '2024-05-14',
        flareClass: 'X8.7',
        activeRegion: 'AR 3664',
        cmeSpeedKmS: 1620,
        protonFluxPfu: 145,
        kpIndex: 7,
        riskLevel: 'high',
        baseRiskScorePct: 84,
        sourceBadge: 'ARCHIVED',
        summary: 'Real May 2024 X8.7 solar flare from Sunspot AR 3664 recorded by GOES/SDO.',
        realPlannerNote: 'Halt outdoor EVAs and confirm storm shelter batteries are charged.',
      },
    ],
    CME: [
      {
        id: 'arch_cme_1',
        donkiEventId: '2024-05-10T06:54:00-CME-001',
        eventType: 'CME',
        date: '2024-05-10',
        flareClass: 'CME 1750 km/s',
        activeRegion: 'AR 3664',
        cmeSpeedKmS: 1750,
        protonFluxPfu: 180,
        kpIndex: 9,
        riskLevel: 'critical',
        baseRiskScorePct: 95,
        sourceBadge: 'ARCHIVED',
        summary: 'Halo CME racing outward at 1,750 km/s that produced the historic May 2024 G5 storm.',
        realPlannerNote: 'Fast Earth/Moon/Mars-directed halo CMEs give crews ~18–36 hours to sinter extra shielding.',
      },
    ],
    CMEAnalysis: [
      {
        id: 'arch_cmea_1',
        donkiEventId: '2024-05-11T01:23:00-CMEAnalysis-001',
        eventType: 'CMEAnalysis',
        date: '2024-05-11',
        flareClass: 'CME 1620 km/s',
        activeRegion: 'AR 3664',
        cmeSpeedKmS: 1620,
        protonFluxPfu: 145,
        kpIndex: 8,
        riskLevel: 'critical',
        baseRiskScorePct: 92,
        sourceBadge: 'ARCHIVED',
        summary: 'SOHO/STEREO triangulation measured 1,620 km/s speed and 52° half-angle cone sweeping Earth/Moon.',
        realPlannerNote: 'Cone angle analysis tells flight directors whether a storm will hit head-on or miss.',
      },
    ],
    SEP: [
      {
        id: 'arch_sep_1',
        donkiEventId: '2024-05-11T01:23:00-SEP-001',
        eventType: 'SEP',
        date: '2024-05-11',
        flareClass: 'S3 Proton Storm',
        activeRegion: 'AR 3664',
        cmeSpeedKmS: 1950,
        protonFluxPfu: 1480,
        kpIndex: 9,
        riskLevel: 'critical',
        baseRiskScorePct: 98,
        sourceBadge: 'ARCHIVED',
        summary: 'Severe Solar Energetic Particle surge (1,480 pfu) exceeding NASA EVA safety thresholds.',
        realPlannerNote: 'Crew must remain inside water-lined Storm Shelter until proton flux drops below 10 pfu.',
      },
    ],
    GST: [
      {
        id: 'arch_gst_1',
        donkiEventId: '2024-05-10T17:00:00-GST-001',
        eventType: 'GST',
        date: '2024-05-10',
        flareClass: 'G5 (Kp 9)',
        activeRegion: 'Planetary Field',
        cmeSpeedKmS: 1750,
        protonFluxPfu: 120,
        kpIndex: 9,
        riskLevel: 'critical',
        baseRiskScorePct: 94,
        sourceBadge: 'ARCHIVED',
        summary: 'Extreme Kp 9 Geomagnetic Storm triggered worldwide auroras and satellite drag shifts.',
        realPlannerNote: 'Check relay link health and prepare buffered offline operations during Kp 7–9 storms.',
      },
    ],
    IPS: [
      {
        id: 'arch_ips_1',
        donkiEventId: '2024-05-10T16:37:00-IPS-001',
        eventType: 'IPS',
        date: '2024-05-10',
        flareClass: 'Shock @ DSCOVR/L1',
        activeRegion: 'Sun-Earth L1',
        cmeSpeedKmS: 1050,
        protonFluxPfu: 38,
        kpIndex: 7,
        riskLevel: 'high',
        baseRiskScorePct: 76,
        sourceBadge: 'ARCHIVED',
        summary: 'Sharp Interplanetary Shock passed NASA DSCOVR spacecraft at L1 ~30 minutes before storm impact.',
        realPlannerNote: 'L1 shock alerts are the final 30-minute siren before high-energy plasma reaches lunar orbit.',
      },
    ],
    MPC: [
      {
        id: 'arch_mpc_1',
        donkiEventId: '2024-05-10T18:10:00-MPC-001',
        eventType: 'MPC',
        date: '2024-05-10',
        flareClass: 'Shield Compression',
        activeRegion: 'Magnetopause',
        cmeSpeedKmS: 980,
        protonFluxPfu: 22,
        kpIndex: 7,
        riskLevel: 'high',
        baseRiskScorePct: 72,
        sourceBadge: 'ARCHIVED',
        summary: 'Solar wind ram pressure compressed Earth’s magnetopause inside geosynchronous comms orbit.',
        realPlannerNote: 'Switch high-gain outpost dishes to error-correcting telemetry packets.',
      },
    ],
    RBE: [
      {
        id: 'arch_rbe_1',
        donkiEventId: '2024-05-12T04:00:00-RBE-001',
        eventType: 'RBE',
        date: '2024-05-12',
        flareClass: 'Electron Belt Surge',
        activeRegion: 'Van Allen Belts',
        cmeSpeedKmS: 820,
        protonFluxPfu: 16,
        kpIndex: 6,
        riskLevel: 'elevated',
        baseRiskScorePct: 58,
        sourceBadge: 'ARCHIVED',
        summary: 'Energetic electron flux surged across outer radiation belts after the May CME passage.',
        realPlannerNote: 'Inspect habitat flight computer error logs and keep surge breakers closed.',
      },
    ],
    HSS: [
      {
        id: 'arch_hss_1',
        donkiEventId: '2024-03-22T09:15:00-HSS-001',
        eventType: 'HSS',
        date: '2024-03-22',
        flareClass: '740 km/s Wind',
        activeRegion: 'Coronal Hole',
        cmeSpeedKmS: 740,
        protonFluxPfu: 5,
        kpIndex: 5,
        riskLevel: 'elevated',
        baseRiskScorePct: 50,
        sourceBadge: 'ARCHIVED',
        summary: 'Fast coronal-hole wind stream (740 km/s) charged fine lunar regolith dust.',
        realPlannerNote: 'Schedule a solar panel dust cleaning before output dips below habitat load.',
      },
    ],
    WSAEnlilSimulations: [
      {
        id: 'arch_enlil_1',
        donkiEventId: '2024-05-10T11:30:00-ENLIL-001',
        eventType: 'WSA+Enlil',
        date: '2024-05-10',
        flareClass: 'Forecast Kp 8',
        activeRegion: 'Moon & Mars Track',
        cmeSpeedKmS: 1520,
        protonFluxPfu: 110,
        kpIndex: 8,
        riskLevel: 'high',
        baseRiskScorePct: 86,
        sourceBadge: 'ARCHIVED',
        summary: 'WSA+Enlil 3D MHD model predicted stacked CME arrival hitting Earth/Moon & glancing Mars.',
        realPlannerNote: 'Use Enlil lead time to top up battery banks and sinter regolith roofs.',
      },
    ],
    notifications: [
      {
        id: 'arch_notif_1',
        donkiEventId: '20240514-AL-002',
        eventType: 'SEP / FLR Bulletin',
        date: '2024-05-14',
        flareClass: 'X8.7 Watch',
        activeRegion: 'M2M Space Weather Office',
        cmeSpeedKmS: 1620,
        protonFluxPfu: 145,
        kpIndex: 7,
        riskLevel: 'high',
        baseRiskScorePct: 84,
        sourceBadge: 'ARCHIVED',
        summary:
          'M2M Bulletin: Strong X8.7 solar flare observed from Region 3664. Elevated proton flux expected across inner solar system.',
        realPlannerNote: 'Mission Control reads M2M DONKI bulletins twice per shift to plan EVAs safely.',
      },
    ],
  };

  return archiveByEndpoint[endpoint] || archiveByEndpoint.FLR;
}
