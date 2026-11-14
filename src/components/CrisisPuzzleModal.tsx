/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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

  // Puzzle 1: solar_flare (shield sector allocation summing <= 100 and meeting min thresholds 40, 30, 25)
  const [shieldNorth, setShieldNorth] = useState(25);
  const [shieldCore, setShieldCore] = useState(25);
  const [shieldHab, setShieldHab] = useState(25);

  // Puzzle 2: dust_storm (emergency kW allocation: 12 kW budget -> O2 >= 6, Heat >= 4, Lights <= 2)
  const [kwLife, setKwLife] = useState(4);
  const [kwHeat, setKwHeat] = useState(2);
  const [kwLights, setKwLights] = useState(6);

  // Puzzle 3: power_failure (circuit breaker toggles)
  const [breakers, setBreakers] = useState({
    mainBus: false,
    batteryTie: false,
    heavyDrills: true,
    lifeSupport: false,
  });

  // Puzzle 4: micrometeoroid_leak (3 breach spots)
  const [leaksPatched, setLeaksPatched] = useState<number[]>([]);

  // Puzzle 5: recycler_jam (4 pipe valves in degrees; solved when all = 0 or aligned)
  const [pipeAngles, setPipeAngles] = useState([90, 180, 90, 270]);

  // Puzzle 6: crop_problem (Garden rules choices)
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
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setShowHint(true);
    setStatusMessage(`${reason} Check ARIA’s hint below and try again!`);
  };

  const checkSolution = () => {
    if (crisis.puzzleType === 'solar_flare') {
      const total = shieldNorth + shieldCore + shieldHab;
      if (total > 100) {
        handleFailAttempt(`Total power used is ${total}% (max 100%)!`);
        return;
      }
      if (shieldNorth >= 40 && shieldCore >= 30 && shieldHab >= 25) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Shield sectors need North ≥ 40%, Core ≥ 30%, Hab ≥ 25%.');
      }
      return;
    }

    if (crisis.puzzleType === 'dust_storm') {
      const total = kwLife + kwHeat + kwLights;
      if (total > 12) {
        handleFailAttempt(`You assigned ${total} kW, but the dust-dimmed array only makes 12 kW!`);
        return;
      }
      if (kwLife >= 6 && kwHeat >= 4) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Life Support needs ≥ 6 kW and Heating needs ≥ 4 kW before grow lights!');
      }
      return;
    }

    if (crisis.puzzleType === 'power_failure') {
      if (breakers.heavyDrills) {
        handleFailAttempt('Heavy Drills caused another surge! Turn Heavy Drills OFF first.');
        return;
      }
      if (breakers.mainBus && breakers.batteryTie && breakers.lifeSupport) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Switch ON Main Bus, Battery Tie, and Life Support together.');
      }
      return;
    }

    if (crisis.puzzleType === 'micrometeoroid_leak') {
      if (leaksPatched.length >= 3) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt(`Only ${leaksPatched.length} of 3 hull breaches sealed!`);
      }
      return;
    }

    if (crisis.puzzleType === 'recycler_jam') {
      if (pipeAngles.every((deg) => deg % 360 === 0)) {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Some valves are still sideways — rotate each pipe until it points RIGHT (0°)!');
      }
      return;
    }

    if (crisis.puzzleType === 'crop_problem') {
      if (cropLed === 'red-blue' && cropWater === 'mist') {
        onResolve(crisis.id, true);
      } else {
        handleFailAttempt('Flooding drowns roots in low gravity — try Aeroponic Mist + Red/Blue LEDs!');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/90 flex items-center justify-center p-4"
      role="dialog"
      aria-label={`Emergency Puzzle: ${crisis.title}`}
      data-testid="crisis-puzzle-modal"
    >
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                SOL {crisis.triggerSol} EMERGENCY DRILL
              </span>
              {crisis.donkiClass && (
                <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">
                  DONKI {crisis.donkiClass} · {crisis.sourceBadge}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white font-display mt-1">
              {puzCfg?.title || crisis.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowHint(true)}
            className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/25 cursor-pointer shrink-0"
          >
            🤖 ARIA Hint
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">{puzCfg?.intro}</p>

        {/* Interactive Puzzle Body */}
        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-4 space-y-3">
          {crisis.puzzleType === 'solar_flare' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Shield Budget Used:</span>
                <span
                  className={`font-bold tabular-nums ${
                    shieldNorth + shieldCore + shieldHab > 100 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {shieldNorth + shieldCore + shieldHab}% / 100% max
                </span>
              </div>
              {[
                { label: 'North Solar Array Shield (Target ≥ 40%)', val: shieldNorth, set: setShieldNorth },
                { label: 'Core Reactor Shield (Target ≥ 30%)', val: shieldCore, set: setShieldCore },
                { label: 'Habitat Dome Shield (Target ≥ 25%)', val: shieldHab, set: setShieldHab },
              ].map((row) => (
                <label key={row.label} className="block space-y-1">
                  <div className="flex justify-between text-xs font-mono text-slate-200">
                    <span>{row.label}</span>
                    <span className="text-cyan-300 font-bold">{row.val}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={row.val}
                    onChange={(e) => row.set(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </label>
              ))}
            </div>
          )}

          {crisis.puzzleType === 'dust_storm' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Emergency Power Allocated:</span>
                <span
                  className={`font-bold tabular-nums ${
                    kwLife + kwHeat + kwLights > 12 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {kwLife + kwHeat + kwLights} / 12 kW
                </span>
              </div>
              {[
                { label: 'Life Support O₂ & H₂O (Needs ≥ 6 kW)', val: kwLife, set: setKwLife },
                { label: 'Habitat Thermal Heaters (Needs ≥ 4 kW)', val: kwHeat, set: setKwHeat },
                { label: 'Greenhouse Bright Lamps (Non-critical)', val: kwLights, set: setKwLights },
              ].map((row) => (
                <label key={row.label} className="block space-y-1">
                  <div className="flex justify-between text-xs font-mono text-slate-200">
                    <span>{row.label}</span>
                    <span className="text-amber-300 font-bold">{row.val} kW</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={row.val}
                    onChange={(e) => row.set(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </label>
              ))}
            </div>
          )}

          {crisis.puzzleType === 'power_failure' && (
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  ['mainBus', 'Main Power Bus'],
                  ['batteryTie', 'Battery Tie Breaker'],
                  ['heavyDrills', 'Heavy Drills (Surge Load!)'],
                  ['lifeSupport', 'Life Support (O₂ + H₂O)'],
                ] as const
              ).map(([key, label]) => {
                const isOn = breakers[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBreakers((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isOn
                        ? key === 'heavyDrills'
                          ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                          : 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase">{isOn ? 'ON' : 'OFF'}</div>
                    <div className="text-xs font-bold mt-0.5">{label}</div>
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
                    className={`py-4 rounded-xl border font-mono text-xs font-bold cursor-pointer ${
                      !isLeak
                        ? 'bg-slate-900 border-slate-800 text-slate-500'
                        : patched
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-rose-950/70 border-rose-500 text-rose-200 animate-pulse'
                    }`}
                  >
                    {!isLeak ? '✓ HULL OK' : patched ? '✓ SEALED' : '⚠ LEAK — TAP!'}
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
                    className={`py-4 rounded-xl border text-center cursor-pointer transition-colors ${
                      aligned
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div
                      className="text-xl font-bold inline-block transition-transform"
                      style={{ transform: `rotate(${deg}deg)` }}
                    >
                      ➜
                    </div>
                    <div className="text-[10px] font-mono mt-1">
                      Valve {idx + 1} ({deg}°)
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {crisis.puzzleType === 'crop_problem' && (
            <div className="space-y-2.5">
              <div>
                <div className="text-xs font-mono text-slate-300 mb-1">1. Pick Grow Light Spectrum:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCropLed('red-blue')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      cropLed === 'red-blue'
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    🔴🔵 16h Red + Blue LEDs
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropLed('dim-yellow')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      cropLed === 'dim-yellow'
                        ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    🟡 Dim Yellow Bulbs
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-slate-300 mb-1">2. Pick Watering Method:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCropWater('mist')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      cropWater === 'mist'
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    💨 Aeroponic Root Mist
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropWater('flood')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      cropWater === 'flood'
                        ? 'bg-rose-950/60 border-rose-400 text-rose-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    🌊 Heavy Soil Flooding
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="text-xs font-mono text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-lg p-2.5">
            {statusMessage}
          </div>
        )}

        {showHint && (
          <div className="text-xs text-cyan-100 bg-cyan-950/50 border border-cyan-500/40 rounded-lg p-3">
            <span className="font-mono font-bold text-cyan-300 block text-[10px] mb-0.5">
              🤖 ARIA ENGINEERING HINT
            </span>
            {puzCfg?.hint}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onResolve(crisis.id, false)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg cursor-pointer"
          >
            Run Backup & Recover
          </button>
          <button
            type="button"
            onClick={checkSolution}
            data-testid="solve-crisis-btn"
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono rounded-lg cursor-pointer"
          >
            Apply Fix & Continue ✓
          </button>
        </div>
      </div>
    </div>
  );
};
