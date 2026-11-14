/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModuleTypeId } from '../types/game';

export type TechId =
  | 'tech_efficient_hydroponics'
  | 'tech_perovskite_tandem'
  | 'tech_sintered_basalt'
  | 'tech_closed_eclss'
  | 'tech_subsurface_melt'
  | 'tech_advanced_radiators'
  | 'tech_compact_fusion';

export type TechCategory = 'agriculture' | 'energy' | 'engineering' | 'life_support';

export interface TechDefinition {
  id: TechId;
  title: string;
  category: TechCategory;
  costScience: number;
  prerequisites: TechId[];
  description: string;
  stemBenefit: string;
  historicalContext: string;
  icon: string;
  tier: 1 | 2 | 3;
  unlocksModuleId?: ModuleTypeId;
}

export const RESEARCH_TECHS: Record<TechId, TechDefinition> = {
  tech_efficient_hydroponics: {
    id: 'tech_efficient_hydroponics',
    title: 'Precision Aeroponic Hydroponics',
    category: 'agriculture',
    costScience: 45,
    prerequisites: [],
    tier: 1,
    icon: '🌱',
    description: 'Acoustic ultrasonic root misting with dynamic LED photoperiods tailored for dwarf wheat & spirulina microalgae.',
    stemBenefit: '+50% fresh food yield per greenhouse and reduces crop water consumption by 30%.',
    historicalContext: 'NASA tests on the ISS Veggie and APH systems proved mist aeroponics uses 95% less water than terrestrial soil.',
  },

  tech_perovskite_tandem: {
    id: 'tech_perovskite_tandem',
    title: 'Perovskite-Silicon Tandem Cells',
    category: 'energy',
    costScience: 55,
    prerequisites: [],
    tier: 1,
    icon: '⚡',
    description: 'Dual-bandgap photovoltaic cells combining perovskite thin-films with silicon wafers, plus electrodynamic dust-shield coatings.',
    stemBenefit: '+35% solar array power generation and cuts Martian dust fouling rate by 50%.',
    historicalContext: 'Tandem cells push theoretical photovoltaic efficiency from Shockley-Queisser ~29% past 34% by absorbing broader spectrum wavelengths.',
  },

  tech_sintered_basalt: {
    id: 'tech_sintered_basalt',
    title: 'Reinforced Basalt Microwave Sintering',
    category: 'engineering',
    costScience: 50,
    prerequisites: [],
    tier: 1,
    icon: '🛡️',
    description: 'Tunable 2.45 GHz magnetron microwave heating fuses iron-rich lunar and Martian regolith into interlocking vitreous basalt pavers.',
    stemBenefit: 'Increases regolith shielding radiation reduction from 65% to 80% and cuts sinter upgrade cost by 25%.',
    historicalContext: 'ESA and NASA tests demonstrated microwave sintering requires no imported binders or water, utilizing native iron oxide susceptors.',
  },

  tech_closed_eclss: {
    id: 'tech_closed_eclss',
    title: 'Bosch Closed-Loop CO₂ Reduction',
    category: 'life_support',
    costScience: 90,
    prerequisites: ['tech_efficient_hydroponics'],
    tier: 2,
    icon: '🫁',
    description: 'High-temperature iron-catalyzed Bosch reaction (CO₂ + 2H₂ → C(s) + 2H₂O) achieves complete 98.5% closed-loop metabolic oxygen loop closure.',
    stemBenefit: '+50% ECLSS oxygen production and increases water recycling efficiency from 95% to 98.5%.',
    historicalContext: 'Standard Sabatier vents methane into space losing hydrogen; the Bosch cycle deposits solid graphite and recovers 100% of exhaled hydrogen.',
  },

  tech_subsurface_melt: {
    id: 'tech_subsurface_melt',
    title: 'Cryo-Thermal Rodriguez Well Probes',
    category: 'engineering',
    costScience: 80,
    prerequisites: ['tech_sintered_basalt'],
    tier: 2,
    icon: '⛏️',
    description: 'Deep subsurface thermal sublimation heated probes that melt subterranean permafrost lenses without requiring open surface strip mining.',
    stemBenefit: '+60% water extraction yield from Subsurface Ice Extractors (14 L/sol → 22.4 L/sol).',
    historicalContext: 'Originally pioneered for Antarctic research stations (Rodriguez Wells), thermal melting prevents water freezing in sub-zero polar vacuums.',
  },

  tech_advanced_radiators: {
    id: 'tech_advanced_radiators',
    title: 'Graphene Thermal Heat Radiators',
    category: 'energy',
    costScience: 75,
    prerequisites: ['tech_perovskite_tandem'],
    tier: 2,
    icon: '❄️',
    description: 'Ultra-thin oriented graphene and carbon nanotube composite radiator louvers with high infrared emissivity (ε > 0.94).',
    stemBenefit: 'Provides necessary thermal rejection infrastructure to support high-density megawatt fusion reactors.',
    historicalContext: 'Radiating waste heat into space is one of the hardest thermodynamic hurdles in vacuum (governed by Stefan-Boltzmann Stefan law).',
  },

  tech_compact_fusion: {
    id: 'tech_compact_fusion',
    title: 'Compact Magnetic Confinement Fusion',
    category: 'energy',
    costScience: 160,
    prerequisites: ['tech_closed_eclss', 'tech_advanced_radiators'],
    tier: 3,
    icon: '⚛️',
    description: 'High-Temperature Superconducting (REBCO) magnetic coils confining deuterium & lunar Helium-3 plasma for continuous net-positive clean power.',
    stemBenefit: 'Unlocks the **Compact Fusion Generator**! Produces +45.0 kW continuous baseline power, solving the 14-day lunar night and dust storms.',
    historicalContext: 'Helium-3 is virtually absent on Earth due to our magnetosphere, but abundant in the lunar regolith, deposited by billions of years of solar wind.',
    unlocksModuleId: 'fusion_reactor',
  },
};

export const TECH_ORDER: TechId[] = [
  'tech_efficient_hydroponics',
  'tech_perovskite_tandem',
  'tech_sintered_basalt',
  'tech_closed_eclss',
  'tech_subsurface_melt',
  'tech_advanced_radiators',
  'tech_compact_fusion',
];
