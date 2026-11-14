/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Backpack,
  Car,
  Check,
  ClipboardCheck,
  Compass,
  FileText,
  Globe,
  Printer,
  Satellite,
  Scale,
  ScrollText,
  Shield,
  Sprout,
  X,
} from 'lucide-react';
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
    label: 'Module build',
    badgeClass: 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30',
    dotClass: 'bg-[#38bdf8]',
  },
  shield: {
    label: 'Rad shield',
    badgeClass: 'bg-[#e5a93b]/10 text-[#e5a93b] border-[#e5a93b]/30',
    dotClass: 'bg-[#e5a93b]',
  },
  expedition: {
    label: 'Rover trip',
    badgeClass: 'bg-[#4cc38a]/10 text-[#4cc38a] border-[#4cc38a]/30',
    dotClass: 'bg-[#4cc38a]',
  },
  crisis: {
    label: 'Crisis response',
    badgeClass: 'bg-[#e5484d]/10 text-[#e5484d] border-[#e5484d]/30',
    dotClass: 'bg-[#e5484d]',
  },
  research: {
    label: 'R&D unlock',
    badgeClass: 'bg-[#a3a9b8]/10 text-[#eef0f5] border-[#eef0f5]/20',
    dotClass: 'bg-[#eef0f5]',
  },
  maintenance: {
    label: 'Maintenance',
    badgeClass: 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30',
    dotClass: 'bg-[#38bdf8]',
  },
  priority: {
    label: 'Priority plan',
    badgeClass: 'bg-[#e5a93b]/10 text-[#e5a93b] border-[#e5a93b]/30',
    dotClass: 'bg-[#e5a93b]',
  },
};

function renderBadgeIcon(badgeId: string) {
  switch (badgeId) {
    case 'badge_tradeoff_thinker':
      return <Scale className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />;
    case 'badge_storm_guardian':
      return <Shield className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />;
    case 'badge_space_botanist':
      return <Sprout className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />;
    case 'badge_mission_planner':
      return <ClipboardCheck className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />;
    case 'badge_rover_explorer':
      return <Car className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />;
    default:
      return <Globe className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />;
  }
}

const NasaLinkBox: React.FC<{ nasaRef: NasaDataReference; compact?: boolean }> = ({
  nasaRef,
  compact = false,
}) => (
  <div className="bg-[#11141c] border border-[#eef0f5]/[0.08] rounded-lg p-3 space-y-1.5">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <span className="text-xs font-mono text-[#38bdf8] inline-flex items-center gap-1.5">
        <Satellite className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
        <span>Real NASA data · {nasaRef.sourceProgram} ({nasaRef.recordId})</span>
      </span>
      <span
        className={`text-xs font-mono px-2 py-0.5 rounded-md border ${
          nasaRef.sourceBadge === 'LIVE'
            ? 'bg-[#4cc38a]/15 text-[#4cc38a] border-[#4cc38a]/35'
            : 'bg-[#1a1e28] text-[#e5a93b] border-[#eef0f5]/[0.08]'
        }`}
      >
        {nasaRef.sourceBadge === 'LIVE' ? 'Live' : 'Archived'}
      </span>
    </div>
    <div className="text-xs font-medium text-[#eef0f5]">{nasaRef.title}</div>
    <div className="text-xs font-mono text-[#7a8296]">{nasaRef.dateOrStudy}</div>
    {nasaRef.donkiMetrics && (
      <div
        data-testid="donki-metrics-grid"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono tabular-nums"
      >
        <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-md px-2.5 py-1.5">
          <div className="text-xs text-[#7a8296]">GOES class</div>
          <div className="text-xs font-medium text-[#e5484d]">
            {nasaRef.donkiMetrics.flareClass} ({nasaRef.donkiMetrics.eventType})
          </div>
        </div>
        <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-md px-2.5 py-1.5">
          <div className="text-xs text-[#7a8296]">Sunspot region</div>
          <div className="text-xs font-medium text-[#e5a93b]">
            {nasaRef.donkiMetrics.activeRegion}
          </div>
        </div>
        <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-md px-2.5 py-1.5">
          <div className="text-xs text-[#7a8296]">Proton flux</div>
          <div className="text-xs font-medium text-[#38bdf8]">
            {nasaRef.donkiMetrics.protonFluxPfu} pfu
          </div>
        </div>
        <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-md px-2.5 py-1.5">
          <div className="text-xs text-[#7a8296]">CME · Kp index</div>
          <div className="text-xs font-medium text-[#4cc38a]">
            {nasaRef.donkiMetrics.cmeSpeedKmS} km/s · Kp {nasaRef.donkiMetrics.kpIndex}
          </div>
        </div>
      </div>
    )}
    {!compact && (
      <p className="text-xs text-[#a3a9b8] leading-snug">{nasaRef.summary}</p>
    )}
    <div className="text-xs text-[#a3a9b8] pt-1.5 border-t border-[#eef0f5]/[0.08]">
      <span className="font-mono text-[#4cc38a] mr-1.5">
        Real planner lesson:
      </span>
      <span>{nasaRef.plannerTakeaway}</span>
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
    setExportFeedback('Prepared printable classroom summary');
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
      <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Backpack className="w-4 h-4 text-[#7a8296] shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <div className="text-xs font-mono text-[#7a8296]">
              Take-home student report
            </div>
            <div className="flex items-center gap-2 mt-1">
              <label htmlFor="debrief-commander-name" className="sr-only">
                Student or Commander Name for Report
              </label>
              <input
                id="debrief-commander-name"
                type="text"
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                placeholder="Commander name"
                maxLength={32}
                data-testid="debrief-commander-input"
                className="h-8 px-2.5 rounded-lg bg-[#1a1e28] border border-[#eef0f5]/10 text-xs text-[#eef0f5] w-44 focus:outline-none focus:border-[#38bdf8]/60"
              />
              {exportFeedback && (
                <span
                  data-testid="report-export-feedback"
                  className="text-xs font-mono text-[#4cc38a] inline-flex items-center gap-1 truncate"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  <span>{exportFeedback}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            data-testid="download-pdf-report-btn"
            className="h-8 px-3 rounded-lg bg-[#eef0f5] hover:bg-white text-[#07080d] text-xs font-sans font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadTxt}
            data-testid="download-txt-report-btn"
            className="h-8 px-3 rounded-lg bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#eef0f5] text-xs font-sans font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
          >
            <ScrollText className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
            <span>Download .TXT</span>
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            data-testid="print-report-btn"
            className="h-8 px-3 rounded-lg bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-sans font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
          >
            <Printer className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Hidden Printable Classroom Sheet */}
      <div className="hidden print-report-sheet" aria-hidden="true">
        <div className="border-b-2 border-slate-900 pb-2 mb-3">
          <div className="text-xs font-mono text-slate-600">
            SOL BASE: Moon &amp; Mars Outpost Trainer · Student Report
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            {commanderName || 'Junior Astronaut'} — {SCENARIOS[state.scenario]?.title || state.scenario}
          </h1>
          <div className="text-xs font-mono text-slate-700">
            Site: {state.planet === 'moon' ? 'Shackleton Crater, Moon' : 'Jezero Crater, Mars'} · Sol{' '}
            {state.environment.solNumber}/{state.targetSols} · Difficulty: {state.difficulty}
          </div>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-900">
          {printableReportText}
        </pre>
      </div>

      {/* Resource Cost Ledger Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-2.5 text-center font-mono tabular-nums">
        <div className="bg-[#11141c] rounded-lg p-2 border border-[#eef0f5]/[0.08]">
          <div className="text-xs text-[#7a8296]">Decisions</div>
          <div className="text-sm font-medium text-[#eef0f5] mt-0.5">{debrief.ledger.totalDecisions}</div>
        </div>
        <div className="bg-[#11141c] rounded-lg p-2 border border-[#eef0f5]/[0.08]">
          <div className="text-xs text-[#7a8296]">Metal traded</div>
          <div className="text-sm font-medium text-[#38bdf8] mt-0.5">{debrief.ledger.metalSpentKg} kg</div>
        </div>
        <div className="bg-[#11141c] rounded-lg p-2 border border-[#eef0f5]/[0.08]">
          <div className="text-xs text-[#7a8296]">Regolith used</div>
          <div className="text-sm font-medium text-[#e5a93b] mt-0.5">{debrief.ledger.regolithSpentKg} kg</div>
        </div>
        <div className="bg-[#11141c] rounded-lg p-2 border border-[#eef0f5]/[0.08]">
          <div className="text-xs text-[#7a8296]">Battery / O₂</div>
          <div className="text-xs font-medium text-[#4cc38a] mt-1">
            {debrief.ledger.batterySpentKwh} kWh · {debrief.ledger.oxygenSpentKg} kg O₂
          </div>
        </div>
        <div className="bg-[#11141c] rounded-lg p-2 border border-[#eef0f5]/[0.08] col-span-2 sm:col-span-1">
          <div className="text-xs text-[#7a8296]">Crises handled</div>
          <div className="text-sm font-medium text-[#e5484d] mt-0.5">
            {debrief.ledger.crisesResolved} / {debrief.ledger.crisesTotal}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-[#eef0f5]/[0.08] pb-2.5">
        {(
          [
            { id: 'timeline' as const, label: `Decision timeline (${debrief.decisions.length})`, Icon: ScrollText },
            { id: 'crises' as const, label: `Crises & NASA data (${debrief.crisisLinks.length})`, Icon: Satellite },
            { id: 'lessons' as const, label: `STEM lessons & badges (${earnedBadges.length}/${LEARNING_BADGES.length})`, Icon: Award },
          ]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            data-testid={`debrief-tab-${id}`}
            className={`h-8 px-3 rounded-lg text-xs font-sans font-medium inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer tabular-nums ${
              activeTab === id
                ? 'bg-[#1a1e28] border border-[#38bdf8]/60 text-[#eef0f5]'
                : 'bg-[#0b0d14] border border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: DECISION TIMELINE + COSTS + NASA DATA */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  ['all', 'All decisions'],
                  ['crisis', 'Crises'],
                  ['build_shield', 'Builds & shields'],
                  ['ops', 'Rovers & R&D'],
                ] as const
              ).map(([fid, flabel]) => (
                <button
                  key={fid}
                  type="button"
                  onClick={() => setFilter(fid)}
                  className={`h-7 px-2.5 rounded-md text-xs font-sans cursor-pointer border transition-colors duration-150 ${
                    filter === fid
                      ? 'bg-[#1a1e28] border-[#38bdf8]/60 text-[#eef0f5] font-medium'
                      : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#7a8296] hover:text-[#eef0f5]'
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
              className="h-7 px-2.5 rounded-md text-xs font-mono bg-[#0b0d14] border border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5] cursor-pointer"
            >
              {sortOrder === 'chronological' ? 'Order: Sol 1 to now' : 'Order: Newest first'}
            </button>
          </div>

          {orderedDecisions.length === 0 ? (
            <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-4 text-center space-y-2">
              <div className="text-xs font-mono text-[#38bdf8]">
                No decisions recorded in this view yet
              </div>
              <p className="text-xs text-[#a3a9b8] max-w-md mx-auto leading-relaxed">
                Every time you inspect a Cost Card to place a module, launch a Rover trip, sinter regolith shielding, solve a crisis, or unlock R&amp;D, it is logged here with its exact cost and NASA reference.
              </p>
            </div>
          ) : (
            <div className="relative pl-5 space-y-3">
              <div
                aria-hidden="true"
                className="absolute left-[7px] top-2 bottom-2 w-px bg-[#eef0f5]/10"
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
                    className="relative bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-2"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[18px] top-4 w-2 h-2 rounded-full ${meta.dotClass}`}
                    />

                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            data-testid="debrief-step-badge"
                            className="text-xs font-mono font-medium text-[#07080d] bg-[#eef0f5] px-2 py-0.5 rounded-md tabular-nums"
                          >
                            Step {stepNum}
                          </span>
                          <span className="text-xs font-mono text-[#38bdf8] bg-[#1a1e28] border border-[#eef0f5]/[0.08] px-2 py-0.5 rounded-md">
                            {item.solTimeLabel || `Sol ${item.sol}`}
                          </span>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded-md border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-[#eef0f5] mt-1.5">{item.action}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono text-[#7a8296] block">
                          Cost paid
                        </span>
                        <span className="text-xs font-mono text-[#e5a93b] tabular-nums">
                          {item.costSummary}
                        </span>
                      </div>
                    </div>

                    {item.costBreakdown && item.costBreakdown.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.costBreakdown.map((chip, cIdx) => (
                          <span
                            key={`${item.id}_c_${cIdx}`}
                            className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-[#e5a93b] tabular-nums"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-[#eef0f5] leading-snug">
                      <span className="text-[#4cc38a] font-mono mr-1.5">
                        Outcome:
                      </span>
                      <span>{item.outcomeNote}</span>
                    </div>

                    {item.tradeOffRisk && (
                      <div className="text-xs text-[#a3a9b8] leading-snug">
                        <span className="text-[#e5484d] font-mono mr-1.5">
                          Trade-off:
                        </span>
                        <span>{item.tradeOffRisk}</span>
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
          <p className="text-xs text-[#a3a9b8] leading-relaxed">
            Every emergency crisis in SOL BASE is modeled after real spaceflight hazards tracked by NASA’s{' '}
            <span className="text-[#38bdf8] font-medium">DONKI Space Weather</span>,{' '}
            <span className="text-[#38bdf8] font-medium">OSDR Astronaut Health</span>, and{' '}
            <span className="text-[#38bdf8] font-medium">Mars/ISS Mission Operations</span>.
          </p>

          {debrief.crisisLinks.map(({ crisis, status, nasaRef }) => (
            <div
              key={crisis.id}
              data-testid="debrief-crisis-card"
              className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#e5a93b] tabular-nums">
                    Sol {crisis.triggerSol}
                  </span>
                  <h4 className="text-sm font-medium text-[#eef0f5]">{crisis.title}</h4>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 ${
                    status === 'solved'
                      ? 'bg-[#4cc38a]/15 text-[#4cc38a] border-[#4cc38a]/35'
                      : status === 'active'
                      ? 'bg-[#e5484d]/15 text-[#e5484d] border-[#e5484d]/35'
                      : 'bg-[#1a1e28] text-[#a3a9b8] border-[#eef0f5]/[0.08]'
                  }`}
                >
                  {status === 'solved' ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Resolved in mission</span>
                    </>
                  ) : status === 'active' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Active now</span>
                    </>
                  ) : (
                    <span>Upcoming forecast</span>
                  )}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {debrief.insights.map((ins) => (
              <div
                key={ins.id}
                className={`rounded-xl border p-3 space-y-1 bg-[#0b0d14] ${
                  ins.status === 'strong'
                    ? 'border-[#4cc38a]/35'
                    : ins.status === 'caution'
                    ? 'border-[#e5a93b]/35'
                    : 'border-[#eef0f5]/[0.08]'
                }`}
              >
                <div className="text-xs font-medium text-[#eef0f5]">{ins.title}</div>
                <p className="text-xs text-[#a3a9b8] leading-snug">{ins.message}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-[#38bdf8] inline-flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span>Real NASA mission planner strategy</span>
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#1a1e28] text-[#e5a93b] border border-[#eef0f5]/[0.08]">
                {state.environment.solarFlareTelemetry.sourceBadge} ·{' '}
                {state.environment.solarFlareTelemetry.flareClass}
              </span>
            </div>
            <p className="text-xs text-[#4cc38a] leading-relaxed">{realPlannerAnswer}</p>
            <p className="text-xs text-[#e5a93b] leading-relaxed pt-2 border-t border-[#eef0f5]/[0.08]">
              <span className="font-medium">Try next time:</span> {tryNextTip}
            </p>
          </div>

          <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-2.5">
            <div className="text-xs font-mono text-[#a3a9b8] inline-flex items-center gap-1.5 tabular-nums">
              <Award className="w-4 h-4 text-[#e5a93b]" strokeWidth={1.5} />
              <span>Junior astronaut badges ({earnedBadges.length}/{LEARNING_BADGES.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LEARNING_BADGES.map((b) => {
                const unlocked = state.unlockedBadges.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`p-2.5 rounded-lg border text-left ${
                      unlocked
                        ? 'bg-[#11141c] border-[#4cc38a]/40 text-[#eef0f5]'
                        : 'bg-[#07080d] border-[#eef0f5]/[0.06] text-[#7a8296] opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      {renderBadgeIcon(b.id)}
                      <span>{b.title}</span>
                    </div>
                    <div className="text-xs leading-tight mt-1 text-[#a3a9b8]">{b.description}</div>
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
      className="fixed inset-0 z-50 pointer-events-auto bg-[#07080d]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Mission Debrief and Decision Timeline"
      data-testid="mission-debrief-modal"
    >
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col">
        <div className="p-4 border-b border-[#eef0f5]/[0.08] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-[#7a8296] block tabular-nums">
              Sol {state.environment.solNumber}/{state.targetSols} · Flight review &amp; NASA data links
            </span>
            <h3 className="text-lg font-medium text-[#eef0f5] font-display mt-0.5">
              Mission debrief: Decisions, costs &amp; NASA science
            </h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Mission Debrief"
              className="h-8 px-3 rounded-lg bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-sans inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Close</span>
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="p-4 overflow-y-auto">{content}</div>
      </div>
    </div>
  );
};
