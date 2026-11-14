/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DecisionCategory,
  DecisionTimelineItem,
  GameState,
  ModuleTypeId,
  NasaDataReference,
  PlanetId,
  ScheduledCrisisEvent,
} from '../types/game';
import donkiJson from '../data/donkiEvents.json';
import osdrJson from '../data/osdrHealthCards.json';
import puzzlesJson from '../data/puzzles.json';
import sitesJson from '../data/sites.json';
import { RESEARCH_TECHS, TechId } from './researchData';

export interface CrisisNasaLink {
  crisis: ScheduledCrisisEvent;
  status: 'solved' | 'active' | 'upcoming';
  nasaRef: NasaDataReference;
  realPlannerAction: string;
}

export interface DebriefCostLedger {
  totalDecisions: number;
  metalSpentKg: number;
  regolithSpentKg: number;
  batterySpentKwh: number;
  oxygenSpentKg: number;
  scienceSpent: number;
  crisesResolved: number;
  crisesTotal: number;
  roverTrips: number;
}

export interface DebriefInsight {
  id: string;
  title: string;
  status: 'strong' | 'caution' | 'tip';
  message: string;
}

export interface EnrichedDebriefSummary {
  decisions: DecisionTimelineItem[];
  crisisLinks: CrisisNasaLink[];
  ledger: DebriefCostLedger;
  insights: DebriefInsight[];
  tryNextTip: string;
  realPlannerAnswer: string;
}

function findOsdrCard(id: string) {
  return osdrJson.cards.find((c) => c.id === id) || osdrJson.cards[0];
}

function findDonkiEvent(donkiEventId?: string) {
  if (!donkiEventId) return donkiJson.events[2];
  return (
    donkiJson.events.find((e) => e.donkiEventId === donkiEventId) ||
    donkiJson.events[2]
  );
}

/**
 * Links any out-of-world Crisis event to the authentic NASA dataset
 * (DONKI, OSDR, ISS Veggie, ISS ECLSS, Mars MEDA/InSight) that inspired it.
 */
export function getNasaReferenceForCrisis(
  crisis: ScheduledCrisisEvent,
  dataMode: 'ARCHIVED' | 'LIVE' = 'ARCHIVED'
): NasaDataReference {
  const badge = crisis.sourceBadge || dataMode;
  const puzCfg = (
    puzzlesJson.puzzles as Record<
      string,
      { realPlannerAction: string; title: string }
    >
  )[crisis.puzzleType];

  if (crisis.puzzleType === 'solar_flare') {
    const donki = findDonkiEvent(crisis.donkiEventId);
    const osdrRad = findOsdrCard('osdr_card_8');
    const flareClass = crisis.donkiClass || donki.flareClass;
    return {
      sourceProgram: 'NASA DONKI',
      recordId: `${crisis.donkiEventId || donki.donkiEventId}`,
      title: `${flareClass} Solar Flare (${donki.activeRegion}) & ${osdrRad.osdrId}`,
      dateOrStudy: `${crisis.donkiDate || donki.date} · ${donki.protonFluxPfu} pfu · ${donki.cmeSpeedKmS} km/s`,
      summary: `${donki.summary} (${osdrRad.finding})`,
      plannerTakeaway: donki.realPlannerNote || puzCfg?.realPlannerAction || '',
      sourceBadge: badge,
      url: 'https://api.nasa.gov/DONKI/',
      donkiMetrics: {
        eventType: donki.eventType,
        flareClass,
        activeRegion: donki.activeRegion,
        protonFluxPfu: donki.protonFluxPfu,
        cmeSpeedKmS: donki.cmeSpeedKmS,
        kpIndex: donki.kpIndex,
      },
    };
  }

  if (crisis.puzzleType === 'dust_storm') {
    const marsSite = sitesJson.sites.mars;
    return {
      sourceProgram: 'NASA Artemis / Mars',
      recordId: 'Mars MEDA / InSight Solar Dust Log',
      title: 'Martian Regional Dust Wall & Solar Flux Drop',
      dateOrStudy: `${marsSite.dataSourceName} · Surface dust opacity`,
      summary:
        'Martian global and regional dust storms scatter sunlight and coat solar panels—like the 2018 Mars dust storm that ended Opportunity and dimmed NASA InSight’s solar arrays.',
      plannerTakeaway:
        puzCfg?.realPlannerAction ||
        'Shed non-essential grow lights first and rely on batteries or Kilopower backup to keep Life Support fans running.',
      sourceBadge: 'ARCHIVED',
      url: 'https://science.nasa.gov/mars/',
    };
  }

  if (crisis.puzzleType === 'power_failure') {
    const osdrSleep = findOsdrCard('osdr_card_9');
    return {
      sourceProgram: 'NASA Artemis / Mars',
      recordId: `KRUSTY Kilopower & ${osdrSleep.osdrId}`,
      title: 'Lunar Night Grid Brownout & Sequential Load Recovery',
      dateOrStudy: 'NASA Glenn Kilopower Test & Artemis Base Camp Studies',
      summary:
        'At Shackleton Crater, 14-day lunar nights make solar arrays produce 0 kW. Tripping heavy mining drills on weak batteries triggers cascading life-support brownouts.',
      plannerTakeaway:
        puzCfg?.realPlannerAction ||
        'Mission Control brings critical Life Support and Battery Tie breakers online before restarting heavy drills.',
      sourceBadge: 'ARCHIVED',
      url: 'https://www.nasa.gov/directorates/spacetech/kilopower/',
    };
  }

  if (crisis.puzzleType === 'micrometeoroid_leak') {
    const osdrShield = findOsdrCard('osdr_card_1');
    return {
      sourceProgram: 'NASA OSDR',
      recordId: `ISS MMOD Shielding & ${osdrShield.osdrId}`,
      title: 'Micrometeoroid Hull Impact & Rapid Pressure Isolation',
      dateOrStudy: 'ISS Orbital Debris & Habitation Pressure Protocols',
      summary:
        'Tiny hypervelocity space rocks strike habitats faster than bullets. Thin metal shells require Whipple shields or sintered regolith layers to absorb impacts and protect cabin air.',
      plannerTakeaway:
        puzCfg?.realPlannerAction ||
        'Isolate module hatches immediately, locate leaks ultrasonically, and apply epoxy/Kapton pressure patches.',
      sourceBadge: 'ARCHIVED',
      url: osdrShield.url,
    };
  }

  if (crisis.puzzleType === 'recycler_jam') {
    const osdrWater = findOsdrCard('osdr_card_10');
    return {
      sourceProgram: 'NASA ECLSS',
      recordId: osdrWater.osdrId,
      title: 'ISS Closed-Loop Water & Air Filter Maintenance',
      dateOrStudy: osdrWater.sourceName,
      summary: osdrWater.finding,
      plannerTakeaway:
        puzCfg?.realPlannerAction ||
        'Bypass clogged filter cartridges to the backup loop so astronauts never lose clean drinking water or oxygen.',
      sourceBadge: 'ARCHIVED',
      url: osdrWater.url,
    };
  }

  // crop_problem
  const osdrVeggie = findOsdrCard('osdr_card_6');
  const osdrRoot = findOsdrCard('osdr_card_7');
  return {
    sourceProgram: 'NASA ISS Veggie',
    recordId: `${osdrVeggie.osdrId} + ${osdrRoot.osdrId}`,
    title: 'ISS Veggie Red/Blue LEDs & Microgravity Root Hydration',
    dateOrStudy: '2015 ISS Outredgeous Lettuce & Root Hypoxia Studies',
    summary: `${osdrVeggie.finding} ${osdrRoot.finding}`,
    plannerTakeaway:
      puzCfg?.realPlannerAction ||
      'Switch to 16h Red+Blue LEDs and Aeroponic Mist so space-grown roots keep vital air pockets.',
    sourceBadge: 'ARCHIVED',
    url: osdrVeggie.url,
  };
}

/**
 * Returns real NASA inspiration for placed modules, shelter orders, or rover expeditions.
 */
export function getNasaReferenceForModule(
  typeId: ModuleTypeId,
  planet: PlanetId,
  dataMode: 'ARCHIVED' | 'LIVE' = 'ARCHIVED'
): NasaDataReference {
  if (typeId === 'aeroponic_greenhouse') {
    const card = findOsdrCard('osdr_card_6');
    return {
      sourceProgram: 'NASA ISS Veggie',
      recordId: card.osdrId,
      title: card.title,
      dateOrStudy: card.sourceName,
      summary: card.finding,
      plannerTakeaway: card.gameplayLink,
      sourceBadge: 'ARCHIVED',
      url: card.url,
    };
  }

  if (typeId === 'storm_shelter' || typeId === 'regolith_sinterer') {
    const card = findOsdrCard('osdr_card_1');
    return {
      sourceProgram: 'NASA OSDR',
      recordId: card.osdrId,
      title: card.title,
      dateOrStudy: card.sourceName,
      summary: card.finding,
      plannerTakeaway: card.gameplayLink,
      sourceBadge: 'ARCHIVED',
      url: card.url,
    };
  }

  if (typeId === 'life_support_moxie') {
    const card = findOsdrCard('osdr_card_10');
    return {
      sourceProgram: 'NASA ECLSS',
      recordId: planet === 'mars' ? `Mars MOXIE + ${card.osdrId}` : `ISS ECLSS + ${card.osdrId}`,
      title: planet === 'mars' ? 'Perseverance MOXIE & 98% Water Recovery' : card.title,
      dateOrStudy: 'NASA Mars 2020 MOXIE & ISS ECLSS',
      summary:
        planet === 'mars'
          ? 'NASA’s MOXIE experiment aboard Perseverance actually made breathable oxygen right out of Mars’s thin CO₂ air!'
          : card.finding,
      plannerTakeaway: 'Keep backup battery available so oxygen electrolysis never halts overnight.',
      sourceBadge: 'ARCHIVED',
      url: card.url,
    };
  }

  if (typeId === 'kilopower_rtg' || typeId === 'fusion_reactor' || typeId === 'battery_bank' || typeId === 'solar_array') {
    const card = findOsdrCard('osdr_card_9');
    return {
      sourceProgram: 'NASA Artemis / Mars',
      recordId: typeId === 'kilopower_rtg' ? 'NASA KRUSTY Kilopower' : `Artemis Surface Power · ${card.osdrId}`,
      title: 'Continuous Surface Power Through Dark Nights & Dust',
      dateOrStudy: sitesJson.sites[planet].dataSourceName,
      summary:
        planet === 'moon'
          ? 'Shackleton Crater spends 14 straight Earth days in darkness (-165°C). Mixing solar arrays, batteries, and fission reactors keeps life support alive.'
          : 'Martian dust weakens sunlight across 24h 39m sols, making reliable storage and nuclear backups vital.',
      plannerTakeaway: card.gameplayLink,
      sourceBadge: dataMode,
    };
  }

  return {
    sourceProgram: 'NASA Artemis / Mars',
    recordId: planet === 'moon' ? 'Artemis Shackleton Crater' : 'Mars Perseverance Jezero',
    title: `${sitesJson.sites[planet].name} Operations`,
    dateOrStudy: sitesJson.sites[planet].dataSourceName,
    summary: sitesJson.sites[planet].realVsSimplifiedNote,
    plannerTakeaway: 'Every module added increases outpost capability—and adds ongoing power or water trade-offs.',
    sourceBadge: 'ARCHIVED',
  };
}

export function getNasaReferenceForRover(
  highFlareRisk: boolean,
  planet: PlanetId,
  donkiEventId: string,
  dataMode: 'ARCHIVED' | 'LIVE'
): NasaDataReference {
  if (highFlareRisk) {
    const donki = findDonkiEvent(donkiEventId);
    return {
      sourceProgram: 'NASA DONKI',
      recordId: donki.donkiEventId,
      title: `EVA Solar Radiation Exposure (${donki.flareClass})`,
      dateOrStudy: `${donki.date} · ${donki.activeRegion}`,
      summary:
        'Going outside in thin spacesuits during a DONKI solar flare watch exposes astronauts to fast solar protons.',
      plannerTakeaway: donki.realPlannerNote,
      sourceBadge: dataMode,
      url: 'https://api.nasa.gov/DONKI/',
      donkiMetrics: {
        eventType: donki.eventType,
        flareClass: donki.flareClass,
        activeRegion: donki.activeRegion,
        protonFluxPfu: donki.protonFluxPfu,
        cmeSpeedKmS: donki.cmeSpeedKmS,
        kpIndex: donki.kpIndex,
      },
    };
  }
  return {
    sourceProgram: 'NASA Artemis / Mars',
    recordId: planet === 'moon' ? 'NASA VIPER & Artemis Geology' : 'Mars Perseverance Sample Caching',
    title: 'In-Situ Resource Prospecting (Water Ice & Regolith)',
    dateOrStudy: sitesJson.sites[planet].dataSourceName,
    summary:
      'Astronauts and rovers harvest local water ice and regolith so rockets do not have to haul heavy dirt and water from Earth.',
    plannerTakeaway: 'Schedule rover sorties during calm solar weather to save spacesuit O₂ and avoid radiation spikes.',
    sourceBadge: 'ARCHIVED',
  };
}

export function getNasaReferenceForTech(techId: TechId): NasaDataReference {
  const tech = RESEARCH_TECHS[techId];
  return {
    sourceProgram: 'NASA OSDR',
    recordId: tech ? tech.id.toUpperCase() : 'NASA STEM R&D',
    title: tech ? tech.title : 'Space Technology Breakthrough',
    dateOrStudy: 'NASA Open Science & Technology Roadmaps',
    summary: tech ? tech.historicalContext : 'Real NASA engineering research improves crew sustainability.',
    plannerTakeaway: tech ? tech.stemBenefit : 'Invest Science Points early to shrink long-term survival costs.',
    sourceBadge: 'ARCHIVED',
  };
}

function inferCategoryFromAction(item: DecisionTimelineItem): DecisionCategory {
  if (item.category) return item.category;
  const a = item.action.toLowerCase();
  if (a.includes('built')) return 'build';
  if (a.includes('shelter') || a.includes('regolith')) return 'shield';
  if (a.includes('rover')) return 'expedition';
  if (a.includes('research')) return 'research';
  if (a.includes('priority')) return 'priority';
  if (a.includes('dust') || a.includes('clean')) return 'maintenance';
  return 'crisis';
}

function parseCostMetrics(costSummary: string): {
  metal: number;
  regolith: number;
  battery: number;
  oxygen: number;
  science: number;
} {
  const matchNum = (regex: RegExp) => {
    const m = costSummary.match(regex);
    return m ? Number(m[1]) : 0;
  };
  return {
    metal: matchNum(/(\d+)\s*kg\s*Metal/i),
    regolith: matchNum(/(\d+)\s*kg\s*Regolith/i),
    battery: matchNum(/(\d+)\s*kWh/i),
    oxygen: matchNum(/(\d+)\s*kg\s*O₂/i),
    science: matchNum(/-\s*(\d+)\s*SP/i),
  };
}

/**
 * Builds the complete Mission Debrief dataset from current GameState:
 * enriched decision timeline, crisis->NASA links, cost ledger, and educational insights.
 */
export function buildEnrichedDebriefSummary(state: GameState): EnrichedDebriefSummary {
  const decisions: DecisionTimelineItem[] = state.decisionTimeline.map((item) => {
    const category = inferCategoryFromAction(item);
    let nasaRef = item.nasaRef;

    if (!nasaRef) {
      if (category === 'expedition') {
        nasaRef = getNasaReferenceForRover(
          item.outcomeNote.toLowerCase().includes('flare'),
          state.planet,
          state.environment.solarFlareTelemetry.donkiEventId,
          state.dataMode
        );
      } else if (category === 'shield') {
        const card = findOsdrCard('osdr_card_1');
        nasaRef = {
          sourceProgram: 'NASA OSDR',
          recordId: card.osdrId,
          title: card.title,
          dateOrStudy: card.sourceName,
          summary: card.finding,
          plannerTakeaway: card.gameplayLink,
          sourceBadge: 'ARCHIVED',
          url: card.url,
        };
      } else if (category === 'crisis') {
        const matchingCrisis = state.upcomingEvents.find((ev) =>
          item.action.toLowerCase().includes(ev.title.toLowerCase().split('(')[0].trim())
        );
        if (matchingCrisis) {
          nasaRef = getNasaReferenceForCrisis(matchingCrisis, state.dataMode);
        }
      }
    }

    return {
      ...item,
      category,
      nasaRef,
    };
  });

  const crisisLinks: CrisisNasaLink[] = state.upcomingEvents.map((crisis) => {
    const isActive = state.activeCrisis?.id === crisis.id;
    const status: 'solved' | 'active' | 'upcoming' = crisis.resolved
      ? 'solved'
      : isActive
      ? 'active'
      : 'upcoming';
    const puzCfg = (
      puzzlesJson.puzzles as Record<string, { realPlannerAction: string }>
    )[crisis.puzzleType];
    return {
      crisis,
      status,
      nasaRef: getNasaReferenceForCrisis(crisis, state.dataMode),
      realPlannerAction: puzCfg?.realPlannerAction || 'Follow NASA mission checklists.',
    };
  });

  // Also include active crisis if it was teacher-triggered and not in upcomingEvents
  if (
    state.activeCrisis &&
    !crisisLinks.some((c) => c.crisis.id === state.activeCrisis?.id)
  ) {
    const puzCfg = (
      puzzlesJson.puzzles as Record<string, { realPlannerAction: string }>
    )[state.activeCrisis.puzzleType];
    crisisLinks.unshift({
      crisis: state.activeCrisis,
      status: 'active',
      nasaRef: getNasaReferenceForCrisis(state.activeCrisis, state.dataMode),
      realPlannerAction: puzCfg?.realPlannerAction || 'Follow NASA emergency checklist.',
    });
  }

  let metalSpentKg = 0;
  let regolithSpentKg = 0;
  let batterySpentKwh = 0;
  let oxygenSpentKg = 0;
  let scienceSpent = 0;

  for (const d of decisions) {
    const parsed = parseCostMetrics(d.costSummary);
    metalSpentKg += parsed.metal;
    regolithSpentKg += parsed.regolith;
    batterySpentKwh += parsed.battery;
    oxygenSpentKg += parsed.oxygen;
    scienceSpent += parsed.science;
  }

  const ledger: DebriefCostLedger = {
    totalDecisions: decisions.length,
    metalSpentKg,
    regolithSpentKg,
    batterySpentKwh,
    oxygenSpentKg,
    scienceSpent,
    crisesResolved: state.upcomingEvents.filter((e) => e.resolved).length,
    crisesTotal: state.upcomingEvents.length,
    roverTrips: state.roverTripsCompleted,
  };

  // Educational reflections tailored to mission choices
  const insights: DebriefInsight[] = [];
  const hasKilopower = state.modules.some((m) => m.typeId === 'kilopower_rtg');
  const hasGreenhouse = state.modules.some((m) => m.typeId === 'aeroponic_greenhouse');
  const hasRegolithRoof = state.modules.some((m) => m.regolithShieldInstalled);

  insights.push(
    hasKilopower
      ? {
          id: 'ins_power',
          title: 'Day/Night Power Trade-Off Mastered',
          status: 'strong',
          message:
            'You paired solar arrays with Kilopower nuclear backup—keeping Oxygen and Water recycling running even during dust storms or darkness.',
        }
      : {
          id: 'ins_power',
          title: 'Solar-Only Vulnerability',
          status: 'caution',
          message:
            'Without Kilopower or extra Battery Banks, darkness or dust storms cut solar output and risk a power-to-oxygen chain reaction.',
        }
  );

  insights.push(
    hasGreenhouse
      ? {
          id: 'ins_food',
          title: 'Fresh Veggie Independence',
          status: 'strong',
          message: `Your Greenhouse harvested ${Math.round(state.stats.foodHarvestedKg)} kg of fresh produce—stretching your 90-day starting rations while helping produce O₂!`,
        }
      : {
          id: 'ins_food',
          title: 'Food Rations Countdown',
          status: 'tip',
          message:
            'Starting rations (~90 days) are non-renewable. Building a Greenhouse early lets astronauts grow fresh lettuce, potatoes, and beans—at the cost of extra water and LED power.',
        }
  );

  insights.push(
    state.stats.maxDoseMsv < 120 || hasRegolithRoof
      ? {
          id: 'ins_rad',
          title: 'Radiation Safety Discipline',
          status: 'strong',
          message: `Peak crew exposure stayed at ${Math.round(state.stats.maxDoseMsv)} mSv (well under the 250 mSv NASA career limit) using Storm Shelters and/or regolith shielding.`,
        }
      : {
          id: 'ins_rad',
          title: 'Solar Flare Dose Rising',
          status: 'caution',
          message: `Peak dose reached ${Math.round(state.stats.maxDoseMsv)} mSv. Sintering 1m of regolith or bunkering early when DONKI alerts turn amber keeps astronauts safe.`,
        }
  );

  let realPlannerAnswer =
    'NASA mission planners balance backup nuclear power (Kilopower), closed-loop water recycling, and Storm Shelters so solar storms or dust storms never catch the crew off guard.';
  let tryNextTip =
    state.planet === 'moon'
      ? 'Try Mars (Jezero Crater) next to navigate 3–22 minute Earth radio delays and Martian dust walls!'
      : 'Try Commander difficulty or the 6-Month Endurance mission to test multi-system closed-loop engineering!';

  if (state.phase === 'gameover') {
    if (state.resources.oxygenKg <= 0.5) {
      realPlannerAnswer =
        'When batteries hit 0%, water electrolysis shuts off and stops making O₂! Real flight directors protect Life Support power before mining or grow lights.';
      tryNextTip = 'Build a Battery Bank or Kilopower Backup before adding heavy power-draining modules.';
    } else if (state.resources.waterLiters <= 0.5) {
      realPlannerAnswer =
        'Even 95% water recycling slowly loses moisture. NASA crews pair ECLSS filters with polar ice drilling or rover ice expeditions.';
      tryNextTip = 'Use Aeroponic Mist in the Garden Guide (-95% water) and launch Rover ice trips early!';
    } else if (state.crew.radiationDoseMsv > 250) {
      realPlannerAnswer =
        'NASA’s Space Radiation Analysis Group monitors DONKI flares continuously and moves crews into water-lined storm shelters immediately.';
      tryNextTip = 'Press BUNKER CREW as soon as the Flare Risk indicator turns amber or red!';
    }
  }

  return {
    decisions,
    crisisLinks,
    ledger,
    insights,
    tryNextTip,
    realPlannerAnswer,
  };
}
