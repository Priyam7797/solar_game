/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CloudRain,
  Droplets,
  Sun,
} from 'lucide-react';
import { ScheduledCrisisEvent } from '../types/game';
import puzzlesConfig from '../data/puzzles.json';

interface CrisisPuzzleModalProps {
  crisis: ScheduledCrisisEvent | null;
  onResolve: (crisisId: string, solved: boolean) => void;
}

export const CrisisPuzzleModal: React.FC<CrisisPuzzleModalProps> = ({ crisis, onResolve }) => {
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [shieldNorth, setShieldNorth] = useState(25);
  const [shieldCore, setShieldCore] = useState(25);
  const [shieldHab, setShieldHab] = useState(25);

  const [kwLife, setKwLife] = useState(4);
  const [kwHeat, setKwHeat] = useState(2);
  const [kwLights, setKwLights] = useState(6);

  const [breakers, setBreakers] = useState({
    mainBus: false,
    batteryTie: false,
    heavyDrills: true,
    lifeSupport: false,
  });

  const [leaksPatched, setLeaksPatched] = useState<number[]>([]);
  const [pipeAngles, setPipeAngles] = useState([90, 180, 90, 270]);
  const [cropLed, setCropLed] = useState<'red-blue' | 'dim-yellow'>('dim-yellow');
  const [cropWater, setCropWater] = useState<'mist' | 'flood'>('flood');

  useEffect(() => {
    setAttempts(0);
    setShowHint(false);
    setStatusMessage(null);
    setShieldNorth(25);
    setShieldCore(25);
    setShieldHab(25);
    setKwLife(4);
    setKwHeat(2);
    setKwLights(6);
    setBreakers({ mainBus: false, batteryTie: false, heavyDrills: true, lifeSupport: false });
    setLeaksPatched([]);
    setPipeAngles([90, 180, 90, 270]);
    setCropLed('dim-yellow');
    setCropWater('flood');
  }, [crisis?.id]);

  if (!crisis) return null;

  const puzCfg = (
    puzzlesConfig.puzzles as Record<
      string,
      {
        title: string;
        durationSec: number;
        intro: string;
        hint: string;
        realPlannerAction: string;
      }
    >
  )[crisis.puzzleType];

  const handleFailAttempt = (reason: string) => {
    setAttempts(attempts + 1);
    setShowHint(true);
    setStatusMessage(`${reason} Check the ARIA hint below and try again.`);
  };

  const checkSolution = () => {
    if (crisis.puzzleType === 'solar_flare') {
      const total = shieldNorth + shieldCore + shieldHab;
      if (total > 100) {
        handleFailAttempt(`Total power allocated is ${total}% (limit 100%).`);
        return;
      }
      if (shieldNorth >= 40 && shieldCore >= 30 && shieldHab >= 25) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Shield sectors need North ≥ 40%, Core ≥ 30%, and Hab ≥ 25%.');
      }
      return;
    }

    if (crisis.puzzleType === 'dust_storm') {
      const total = kwLife + kwHeat + kwLights;
      if (total > 12) {
        handleFailAttempt(`Allocated ${total} kW, above the 12 kW dust-dimmed supply.`);
        return;
      }
      if (kwLife >= 6 && kwHeat >= 4) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Life Support requires ≥ 6 kW and Heating requires ≥ 4 kW before grow lights.');
      }
      return;
    }

    if (crisis.puzzleType === 'power_failure') {
      if (breakers.heavyDrills) {
        handleFailAttempt('Heavy Drills triggered a power surge. Switch Heavy Drills off first.');
        return;
      }
      if (breakers.mainBus && breakers.batteryTie && breakers.lifeSupport) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Turn on Main Bus, Battery Tie, and Life Support together.');
      }
      return;
    }

    if (crisis.puzzleType === 'micrometeoroid_leak') {
      if (leaksPatched.length >= 3) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt(`Only ${leaksPatched.length} of 3 hull breaches sealed.`);
      }
      return;
    }

    if (crisis.puzzleType === 'recycler_jam') {
      if (pipeAngles.every((deg) => deg % 360 === 0)) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Rotate every pipe valve until it points right at 0°.');
      }
      return;
    }

    if (crisis.puzzleType === 'crop_problem') {
      if (cropLed === 'red-blue' && cropWater === 'mist') {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Flooding drowns roots in low gravity. Select Aeroponic Mist and Red + Blue LEDs.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-[#07080d]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label={`Emergency Puzzle: ${crisis.title}`}
      data-testid="crisis-puzzle-modal"
    >
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-lg w-full p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono bg-[#e5a93b]/15 text-[#e5a93b] border border-[#e5a93b]/35 px-2 py-0.5 rounded-md tabular-nums">
                Sol {crisis.triggerSol} emergency drill
              </span>
              {crisis.donkiClass && (
                <span className="text-xs font-mono bg-[#e5484d]/15 text-[#e5484d] px-2 py-0.5 rounded-md border border-[#e5484d]/35">
                  DONKI {crisis.donkiClass} · {crisis.sourceBadge}
                </span>
              )}
            </div>
            <h3 className="text-lg font-medium text-[#eef0f5] font-display mt-2">
              {puzCfg?.title || crisis.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowHint(true)}
            className="h-8 px-3 text-xs font-sans font-medium rounded-lg bg-[#1a1e28] border border-[#eef0f5]/10 hover:border-[#38bdf8]/60 text-[#eef0f5] inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors duration-150"
          >
            <Bot className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.5} />
            <span>ARIA hint</span>
          </button>
        </div>

        <p className="text-xs text-[#a3a9b8] leading-relaxed">{puzCfg?.intro}</p>

        {/* Interactive Puzzle Body */}
        <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-4 space-y-3">
          {crisis.puzzleType === 'solar_flare' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#a3a9b8]">Shield budget used</span>
                <span
                  className={`font-medium tabular-nums ${
                    shieldNorth + shieldCore + shieldHab > 100 ? 'text-[#e5484d]' : 'text-[#4cc38a]'
                  }`}
                >
                  {shieldNorth + shieldCore + shieldHab}% / 100% max
                </span>
              </div>
              {[
                { label: 'North solar array shield (target ≥ 40%)', val: shieldNorth, set: setShieldNorth },
                { label: 'Core reactor shield (target ≥ 30%)', val: shieldCore, set: setShieldCore },
                { label: 'Habitat dome shield (target ≥ 25%)', val: shieldHab, set: setShieldHab },
              ].map((row) => (
                <label key={row.label} className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-[#eef0f5] tabular-nums">
                    <span className="font-sans text-[#a3a9b8]">{row.label}</span>
                    <span className="text-[#38bdf8]">{row.val}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={row.val}
                    onChange={(e) => row.set(Number(e.target.value))}
                    className="w-full accent-[#38bdf8]"
                  />
                </label>
              ))}
            </div>
          )}

          {crisis.puzzleType === 'dust_storm' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#a3a9b8]">Emergency power allocated</span>
                <span
                  className={`font-medium tabular-nums ${
                    kwLife + kwHeat + kwLights > 12 ? 'text-[#e5484d]' : 'text-[#4cc38a]'
                  }`}
                >
                  {kwLife + kwHeat + kwLights} / 12 kW
                </span>
              </div>
              {[
                { label: 'Life support O₂ & H₂O (needs ≥ 6 kW)', val: kwLife, set: setKwLife },
                { label: 'Habitat thermal heaters (needs ≥ 4 kW)', val: kwHeat, set: setKwHeat },
                { label: 'Greenhouse lamps (non-critical)', val: kwLights, set: setKwLights },
              ].map((row) => (
                <label key={row.label} className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-[#eef0f5] tabular-nums">
                    <span className="font-sans text-[#a3a9b8]">{row.label}</span>
                    <span className="text-[#e5a93b]">{row.val} kW</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={row.val}
                    onChange={(e) => row.set(Number(e.target.value))}
                    className="w-full accent-[#38bdf8]"
                  />
                </label>
              ))}
            </div>
          )}

          {crisis.puzzleType === 'power_failure' && (
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  ['mainBus', 'Main power bus'],
                  ['batteryTie', 'Battery tie breaker'],
                  ['heavyDrills', 'Heavy drills (surge load)'],
                  ['lifeSupport', 'Life support (O₂ + H₂O)'],
                ] as const
              ).map(([key, label]) => {
                const isOn = breakers[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBreakers((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`p-3 rounded-lg border text-left transition-colors duration-150 cursor-pointer ${
                      isOn
                        ? key === 'heavyDrills'
                          ? 'bg-[#1a1e28] border-[#e5484d]/60 text-[#eef0f5]'
                          : 'bg-[#1a1e28] border-[#4cc38a]/50 text-[#eef0f5]'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#7a8296]'
                    }`}
                  >
                    <div
                      className={`text-xs font-mono ${
                        isOn
                          ? key === 'heavyDrills'
                            ? 'text-[#e5484d]'
                            : 'text-[#4cc38a]'
                          : 'text-[#7a8296]'
                      }`}
                    >
                      {isOn ? 'On' : 'Off'}
                    </div>
                    <div className="text-xs font-medium mt-1">{label}</div>
                  </button>
                );
              })}
            </div>
          )}

          {crisis.puzzleType === 'micrometeoroid_leak' && (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((tile) => {
                const isLeak = tile === 1 || tile === 3 || tile === 5;
                const patched = leaksPatched.includes(tile);
                return (
                  <button
                    key={tile}
                    type="button"
                    onClick={() => {
                      if (isLeak && !patched) setLeaksPatched((prev) => [...prev, tile]);
                    }}
                    className={`h-14 px-2 rounded-lg border font-mono text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 ${
                      !isLeak
                        ? 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#7a8296]'
                        : patched
                        ? 'bg-[#1a1e28] border-[#4cc38a]/50 text-[#4cc38a]'
                        : 'bg-[#1a1e28] border-[#e5484d]/60 text-[#e5484d]'
                    }`}
                  >
                    {!isLeak ? (
                      <>
                        <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Hull nominal</span>
                      </>
                    ) : patched ? (
                      <>
                        <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Sealed</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Tap breach</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {crisis.puzzleType === 'recycler_jam' && (
            <div className="grid grid-cols-4 gap-2">
              {pipeAngles.map((deg, idx) => {
                const aligned = deg % 360 === 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setPipeAngles((prev) => prev.map((d, i) => (i === idx ? (d + 90) % 360 : d)))
                    }
                    className={`py-4 rounded-lg border text-center cursor-pointer transition-colors duration-150 ${
                      aligned
                        ? 'bg-[#1a1e28] border-[#38bdf8]/60 text-[#38bdf8]'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#a3a9b8]'
                    }`}
                  >
                    <div
                      className="inline-flex items-center justify-center transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ transform: `rotate(${deg}deg)` }}
                    >
                      <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="text-xs font-mono mt-1.5 tabular-nums">
                      Valve {idx + 1} ({deg}°)
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {crisis.puzzleType === 'crop_problem' && (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-sans text-[#a3a9b8] mb-1.5">1. Pick grow light spectrum</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCropLed('red-blue')}
                    className={`p-3 rounded-lg border text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors duration-150 ${
                      cropLed === 'red-blue'
                        ? 'bg-[#1a1e28] border-[#4cc38a]/50 text-[#eef0f5]'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#7a8296]'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-[#38bdf8] shrink-0" strokeWidth={1.5} />
                    <span>16h Red + Blue LEDs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropLed('dim-yellow')}
                    className={`p-3 rounded-lg border text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors duration-150 ${
                      cropLed === 'dim-yellow'
                        ? 'bg-[#1a1e28] border-[#e5a93b]/50 text-[#eef0f5]'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#7a8296]'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-[#e5a93b] shrink-0" strokeWidth={1.5} />
                    <span>Dim yellow bulbs</span>
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs font-sans text-[#a3a9b8] mb-1.5">2. Pick watering method</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCropWater('mist')}
                    className={`p-3 rounded-lg border text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors duration-150 ${
                      cropWater === 'mist'
                        ? 'bg-[#1a1e28] border-[#4cc38a]/50 text-[#eef0f5]'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#7a8296]'
                    }`}
                  >
                    <CloudRain className="w-4 h-4 text-[#4cc38a] shrink-0" strokeWidth={1.5} />
                    <span>Aeroponic root mist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropWater('flood')}
                    className={`p-3 rounded-lg border text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors duration-150 ${
                      cropWater === 'flood'
                        ? 'bg-[#1a1e28] border-[#e5484d]/50 text-[#eef0f5]'
                        : 'bg-[#11141c] border-[#eef0f5]/[0.08] text-[#7a8296]'
                    }`}
                  >
                    <Droplets className="w-4 h-4 text-[#e5484d] shrink-0" strokeWidth={1.5} />
                    <span>Heavy soil flooding</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="text-xs font-mono text-[#e5a93b] bg-[#0b0d14] border border-[#e5a93b]/40 rounded-lg p-3">
            {statusMessage}
          </div>
        )}

        {showHint && (
          <div className="text-xs text-[#eef0f5] bg-[#0b0d14] border border-[#38bdf8]/40 rounded-lg p-3 space-y-1">
            <span className="font-mono text-[#38bdf8] block text-xs">
              ARIA engineering hint
            </span>
            <p className="text-[#a3a9b8]">{puzCfg?.hint}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onResolve(crisis.id, false)}
            className="h-9 px-4 bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-sans font-medium rounded-lg cursor-pointer transition-colors duration-150"
          >
            Run backup &amp; recover
          </button>
          <button
            type="button"
            onClick={checkSolution}
            data-testid="solve-crisis-btn"
            className="flex-1 h-9 px-4 bg-[#eef0f5] hover:bg-white text-[#07080d] font-medium text-xs font-sans rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150"
          >
            <Check className="w-4 h-4" strokeWidth={1.5} />
            <span>Apply fix &amp; continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
