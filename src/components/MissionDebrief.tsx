/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { DecisionCategory, GameState, NasaDataReference } from '../types/game';
import { buildEnrichedDebriefSummary } from '../game/debriefData';
import {
  buildMissionDebriefPdfBytes,
  formatMissionDebriefTextReport,
  getDebriefReportFilename,
} from '../game/debriefReport';
import { LEARNING_BADGES } from '../game/badgesData';
import { SCENARIOS } from '../game/modulesData';

interface MissionDebriefProps {
  state: GameState;
  mode?: 'modal' | 'embedded';
  isOpen?: boolean;
  onClose?: () => void;
  realPlannerAnswerOverride?: string;
  tryNextTipOverride?: string;
}

type DebriefTab = 'timeline' | 'crises' | 'lessons';
type TimelineFilter = 'all' | 'crisis' | 'build_shield' | 'ops';

const CATEGORY_META: Record<
  DecisionCategory,
  { label: string; badgeClass: string; dotClass: string }
> = {
  build: {
    label: 'MODULE BUILD',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    dotClass: 'bg-cyan-400',
  },
  shield: {
    label: 'RAD SHIELD',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    dotClass: 'bg-amber-400',
  },
  expedition: {
    label: 'ROVER TRIP',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-400',
  },
  crisis: {
    label: 'CRISIS RESPONSE',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    dotClass: 'bg-rose-400',
  },
  research: {
    label: 'R&D UNLOCK',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    dotClass: 'bg-purple-400',
  },
  maintenance: {
    label: 'MAINTENANCE',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    dotClass: 'bg-sky-400',
  },
  priority: {
    label: 'PRIORITY PLAN',
    badgeClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
    dotClass: 'bg-yellow-400',
  },
};

const NasaLinkBox: React.FC<{ nasaRef: NasaDataReference; compact?: boolean }> = ({
  nasaRef,
  compact = false,
}) => (
  <div className="bg-cyan-950/30 border border-cyan-500/35 rounded-lg p-2.5 space-y-1">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
        🛰️ REAL NASA DATA · {nasaRef.sourceProgram} ({nasaRef.recordId})
      </span>
      <span
        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
          nasaRef.sourceBadge === 'LIVE'
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-slate-900 text-amber-300 border-slate-700'
        }`}
      >
        {nasaRef.sourceBadge}
      </span>
    </div>
    <div className="text-xs font-semibold text-white">{nasaRef.title}</div>
    <div className="text-[10px] font-mono text-slate-400">{nasaRef.dateOrStudy}</div>
    {nasaRef.donkiMetrics && (
      <div
        data-testid="donki-metrics-grid"
        className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 font-mono tabular-nums"
      >
        <div className="bg-slate-950/85 border border-cyan-500/25 rounded px-2 py-1">
          <div className="text-[9px] text-slate-400 uppercase">GOES CLASS</div>
          <div className="text-[11px] font-bold text-rose-300">
            {nasaRef.donkiMetrics.flareClass} ({nasaRef.donkiMetrics.eventType})
          </div>
        </div>
        <div className="bg-slate-950/85 border border-cyan-500/25 rounded px-2 py-1">
          <div className="text-[9px] text-slate-400 uppercase">SUNSPOT REGION</div>
          <div className="text-[11px] font-bold text-amber-200">
            {nasaRef.donkiMetrics.activeRegion}
          </div>
        </div>
        <div className="bg-slate-950/85 border border-cyan-500/25 rounded px-2 py-1">
          <div className="text-[9px] text-slate-400 uppercase">PROTON FLUX</div>
          <div className="text-[11px] font-bold text-cyan-200">
            {nasaRef.donkiMetrics.protonFluxPfu} pfu
          </div>
        </div>
        <div className="bg-slate-950/85 border border-cyan-500/25 rounded px-2 py-1">
          <div className="text-[9px] text-slate-400 uppercase">CME · Kp INDEX</div>
          <div className="text-[11px] font-bold text-emerald-200">
            {nasaRef.donkiMetrics.cmeSpeedKmS} km/s · Kp {nasaRef.donkiMetrics.kpIndex}
          </div>
        </div>
      </div>
    )}
    {!compact && (
      <p className="text-[11px] text-slate-200 leading-snug">{nasaRef.summary}</p>
    )}
    <div className="text-[11px] text-emerald-200 pt-1 border-t border-cyan-500/20">
      <strong className="font-mono text-[10px] uppercase text-emerald-300 mr-1">
        Real Planner Lesson:
      </strong>
      {nasaRef.plannerTakeaway}
    </div>
  </div>
);

export const MissionDebrief: React.FC<MissionDebriefProps> = ({
  state,
  mode = 'modal',
  isOpen = true,
  onClose,
  realPlannerAnswerOverride,
  tryNextTipOverride,
}) => {
  const [activeTab, setActiveTab] = useState<DebriefTab>('timeline');
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [sortOrder, setSortOrder] = useState<'chronological' | 'newest'>('chronological');
  const [commanderName, setCommanderName] = useState<string>('Junior Astronaut');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const debrief = useMemo(() => buildEnrichedDebriefSummary(state), [state]);
  const printableReportText = useMemo(
    () =>
      mode === 'modal' && !isOpen
        ? ''
        : formatMissionDebriefTextReport(state, commanderName),
    [mode, isOpen, state, commanderName]
  );

  if (mode === 'modal' && !isOpen) return null;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadTxt = () => {
    const text = formatMissionDebriefTextReport(state, commanderName);
    const filename = getDebriefReportFilename(state, 'txt');
    triggerDownload(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
    setExportFeedback(`Downloaded ${filename}`);
  };

  const handleDownloadPdf = () => {
    const bytes = buildMissionDebriefPdfBytes(state, commanderName);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const filename = getDebriefReportFilename(state, 'pdf');
    triggerDownload(new Blob([copy], { type: 'application/pdf' }), filename);
    setExportFeedback(`Downloaded ${filename}`);
  };

  const handlePrintReport = () => {
    setExportFeedback('Prepared printable classroom summary!');
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const filteredDecisions = debrief.decisions.filter((item) => {
    const cat = item.category || 'build';
    if (filter === 'crisis') return cat === 'crisis';
    if (filter === 'build_shield') return cat === 'build' || cat === 'shield';
    if (filter === 'ops')
      return cat === 'expedition' || cat === 'research' || cat === 'maintenance' || cat === 'priority';
    return true;
  });

  const orderedDecisions =
    sortOrder === 'chronological' ? [...filteredDecisions].reverse() : filteredDecisions;

  const earnedBadges = LEARNING_BADGES.filter((b) => state.unlockedBadges.includes(b.id));
  const realPlannerAnswer = realPlannerAnswerOverride || debrief.realPlannerAnswer;
  const tryNextTip = tryNextTipOverride || debrief.tryNextTip;

  const content = (
    <div className="space-y-3" data-testid="mission-debrief-content">
      {/* Take-Home Student Report Export Bar */}
      <div className="bg-slate-950/90 border border-cyan-500/35 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0" aria-hidden="true">🎒</span>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
              TAKE-HOME REPORT
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <label htmlFor="debrief-commander-name" className="sr-only">
                Student or Commander Name for Report
              </label>
              <input
                id="debrief-commander-name"
                type="text"
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                placeholder="Commander Name"
                maxLength={32}
                data-testid="debrief-commander-input"
                className="px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs text-white w-40 focus:outline-none focus:border-cyan-400"
              />
              {exportFeedback && (
                <span
                  data-testid="report-export-feedback"
                  className="text-[10px] font-mono text-emerald-300 truncate"
                >
                  ✓ {exportFeedback}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            data-testid="download-pdf-report-btn"
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-mono font-bold cursor-pointer transition-colors"
          >
            📄 Download PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadTxt}
            data-testid="download-txt-report-btn"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-[11px] font-mono font-semibold cursor-pointer transition-colors"
          >
            📝 Download .TXT
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            data-testid="print-report-btn"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 text-[11px] font-mono font-semibold cursor-pointer transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Hidden Printable Classroom Sheet (shown only during window.print()) */}
      <div className="hidden print-report-sheet" aria-hidden="true">
        <div className="border-b-2 border-slate-900 pb-2 mb-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-600">
            SOL BASE: MOON &amp; MARS OUTPOST TRAINER · STUDENT REPORT
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {commanderName || 'Junior Astronaut'} — {SCENARIOS[state.scenario]?.title || state.scenario}
          </h1>
          <div className="text-xs font-mono text-slate-700">
            Site: {state.planet === 'moon' ? 'Shackleton Crater, Moon' : 'Jezero Crater, Mars'} · Sol{' '}
            {state.environment.solNumber}/{state.targetSols} · Difficulty: {state.difficulty.toUpperCase()}
          </div>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-900">
          {printableReportText}
        </pre>
      </div>
      {/* Resource Cost Ledger Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 text-center font-mono tabular-nums">
        <div className="bg-slate-900/70 rounded-lg p-1.5 border border-slate-800/80">
          <div className="text-[9px] text-slate-400 uppercase">DECISIONS</div>
          <div className="text-sm font-bold text-white">{debrief.ledger.totalDecisions}</div>
        </div>
        <div className="bg-slate-900/70 rounded-lg p-1.5 border border-slate-800/80">
          <div className="text-[9px] text-slate-400 uppercase">METAL TRADED</div>
          <div className="text-sm font-bold text-cyan-300">{debrief.ledger.metalSpentKg} kg</div>
        </div>
        <div className="bg-slate-900/70 rounded-lg p-1.5 border border-slate-800/80">
          <div className="text-[9px] text-slate-400 uppercase">REGOLITH USED</div>
          <div className="text-sm font-bold text-amber-300">{debrief.ledger.regolithSpentKg} kg</div>
        </div>
        <div className="bg-slate-900/70 rounded-lg p-1.5 border border-slate-800/80">
          <div className="text-[9px] text-slate-400 uppercase">BATTERY / O₂ SPENT</div>
          <div className="text-xs font-bold text-emerald-300 mt-0.5">
            {debrief.ledger.batterySpentKwh} kWh · {debrief.ledger.oxygenSpentKg} kg O₂
          </div>
        </div>
        <div className="bg-slate-900/70 rounded-lg p-1.5 border border-slate-800/80 col-span-2 sm:col-span-1">
          <div className="text-[9px] text-slate-400 uppercase">CRISES HANDLED</div>
          <div className="text-sm font-bold text-rose-300">
            {debrief.ledger.crisesResolved} / {debrief.ledger.crisesTotal}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-800 pb-2">
        {(
          [
            ['timeline', `📜 Decision Timeline (${debrief.decisions.length})`],
            ['crises', `🛰️ Crises → NASA Data (${debrief.crisisLinks.length})`],
            ['lessons', `🏅 STEM Lessons & Badges (${earnedBadges.length}/${LEARNING_BADGES.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            data-testid={`debrief-tab-${id}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              activeTab === id
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: DECISION TIMELINE + COSTS + NASA DATA */}
      {activeTab === 'timeline' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  ['all', 'All Decisions'],
                  ['crisis', 'Crises'],
                  ['build_shield', 'Builds & Shields'],
                  ['ops', 'Rovers & R&D'],
                ] as const
              ).map(([fid, flabel]) => (
                <button
                  key={fid}
                  type="button"
                  onClick={() => setFilter(fid)}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono cursor-pointer border ${
                    filter === fid
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {flabel}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === 'chronological' ? 'newest' : 'chronological'))
              }
              className="px-2 py-1 rounded-md text-[11px] font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-600 cursor-pointer"
            >
              {sortOrder === 'chronological' ? 'Order: Sol 1 → Now' : 'Order: Newest First'}
            </button>
          </div>

          {orderedDecisions.length === 0 ? (
            <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-4 text-center space-y-2">
              <div className="text-xs font-mono text-cyan-300 font-bold">
                NO DECISIONS RECORDED IN THIS VIEW YET
              </div>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Every time you inspect a Cost Card to place a module, launch a Rover trip, sinter regolith shielding, solve a crisis, or unlock R&amp;D, it is logged here with its exact cost and real NASA inspiration!
              </p>
            </div>
          ) : (
            <div className="relative pl-5 space-y-3">
              <div
                aria-hidden="true"
                className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-800"
              />
              {orderedDecisions.map((item, idx) => {
                const cat = item.category || 'build';
                const meta = CATEGORY_META[cat];
                const stepNum =
                  sortOrder === 'chronological' ? idx + 1 : orderedDecisions.length - idx;
                return (
                  <div
                    key={item.id}
                    data-testid="debrief-timeline-entry"
                    className="relative bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[18px] top-4 w-2.5 h-2.5 rounded-sm border border-slate-950 ${meta.dotClass}`}
                    />

                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            data-testid="debrief-step-badge"
                            className="text-[10px] font-mono font-bold text-slate-950 bg-cyan-400 px-1.5 py-0.5 rounded tabular-nums"
                          >
                            STEP {stepNum}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded">
                            {item.solTimeLabel || `Sol ${item.sol}`}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{item.action}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-mono uppercase text-amber-400 block">
                          COST PAID
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-200 tabular-nums">
                          {item.costSummary}
                        </span>
                      </div>
                    </div>

                    {item.costBreakdown && item.costBreakdown.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.costBreakdown.map((chip, cIdx) => (
                          <span
                            key={`${item.id}_c_${cIdx}`}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/35 text-amber-200 tabular-nums"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-slate-200 leading-snug">
                      <strong className="text-emerald-300 font-mono text-[10px] uppercase mr-1">
                        Outcome:
                      </strong>
                      {item.outcomeNote}
                    </div>

                    {item.tradeOffRisk && (
                      <div className="text-[11px] text-slate-300 leading-snug">
                        <strong className="text-rose-300 font-mono text-[10px] uppercase mr-1">
                          Trade-Off:
                        </strong>
                        {item.tradeOffRisk}
                      </div>
                    )}

                    {item.nasaRef && <NasaLinkBox nasaRef={item.nasaRef} compact />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CRISIS -> REAL NASA DATA MAPPING */}
      {activeTab === 'crises' && (
        <div className="space-y-3" data-testid="debrief-crises-view">
          <p className="text-xs text-slate-300 leading-relaxed">
            Every emergency crisis in SOL BASE is modeled after real spaceflight hazards tracked by NASA’s{' '}
            <strong className="text-cyan-300">DONKI Space Weather</strong>,{' '}
            <strong className="text-cyan-300">OSDR Astronaut Health</strong>, and{' '}
            <strong className="text-cyan-300">Mars/ISS Mission Operations</strong>:
          </p>

          {debrief.crisisLinks.map(({ crisis, status, nasaRef }) => (
            <div
              key={crisis.id}
              data-testid="debrief-crisis-card"
              className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-300">
                    SOL {crisis.triggerSol}
                  </span>
                  <h4 className="text-sm font-bold text-white">{crisis.title}</h4>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                    status === 'solved'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : status === 'active'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {status === 'solved'
                    ? '✓ RESOLVED IN MISSION'
                    : status === 'active'
                    ? '⚠ ACTIVE NOW'
                    : 'UPCOMING FORECAST'}
                </span>
              </div>

              <NasaLinkBox nasaRef={nasaRef} />
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: EDUCATIONAL REFLECTIONS, PLANNER ANSWER & LEARNING BADGES */}
      {activeTab === 'lessons' && (
        <div className="space-y-3" data-testid="debrief-lessons-view">
          {/* Mission Trade-Off Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {debrief.insights.map((ins) => (
              <div
                key={ins.id}
                className={`rounded-xl border p-3 space-y-1 ${
                  ins.status === 'strong'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : ins.status === 'caution'
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-cyan-950/30 border-cyan-500/40'
                }`}
              >
                <div className="text-xs font-bold text-white">{ins.title}</div>
                <p className="text-[11px] text-slate-200 leading-snug">{ins.message}</p>
              </div>
            ))}
          </div>

          {/* What Would a Real Mission Planner Do? */}
          <div className="bg-cyan-950/35 border border-cyan-500/35 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                🧭 WHAT WOULD A REAL NASA MISSION PLANNER DO?
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">
                {state.environment.solarFlareTelemetry.sourceBadge} ·{' '}
                {state.environment.solarFlareTelemetry.flareClass}
              </span>
            </div>
            <p className="text-xs text-emerald-200 leading-relaxed">{realPlannerAnswer}</p>
            <p className="text-xs text-amber-200 leading-relaxed pt-1 border-t border-cyan-500/20">
              <strong>Try this next time:</strong> {tryNextTip}
            </p>
          </div>

          {/* Learning Badges Earned */}
          <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
              🏅 JUNIOR ASTRONAUT ACADEMY BADGES ({earnedBadges.length}/{LEARNING_BADGES.length})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {LEARNING_BADGES.map((b) => {
                const unlocked = state.unlockedBadges.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`p-2 rounded-lg border text-left ${
                      unlocked
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-65'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      {b.icon} {b.title}
                    </div>
                    <div className="text-[10px] leading-tight mt-0.5">{b.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (mode === 'embedded') {
    return <div className="max-h-[48vh] overflow-y-auto pr-1">{content}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Mission Debrief and Decision Timeline"
      data-testid="mission-debrief-modal"
    >
      <div className="bg-slate-900 border border-cyan-500/55 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
              SOL {state.environment.solNumber}/{state.targetSols} · FLIGHT REVIEW &amp; NASA DATA LINKS
            </span>
            <h3 className="text-lg font-bold text-white font-display">
              Mission Debrief: Decisions, Costs &amp; Real NASA Science
            </h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Mission Debrief"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
            >
              Close ✕
            </button>
          )}
        </div>

        <div className="p-4 overflow-y-auto">{content}</div>
      </div>
    </div>
  );
};
