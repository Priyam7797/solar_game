/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState } from '../types/game';
import { buildEnrichedDebriefSummary } from './debriefData';
import { getCoreMetersSummary } from './simulation';
import { LEARNING_BADGES } from './badgesData';
import { SCENARIOS } from './modulesData';

/**
 * Normalizes Unicode symbols (subscripts, arrows, emojis) to crisp ASCII
 * for plain-text logs and standard Type1 PDF WinAnsi rendering.
 */
export function sanitizeReportText(input: string): string {
  return input
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/[—–]/g, '-')
    .replace(/·/g, '|')
    .replace(/→/g, '->')
    .replace(/×/g, 'x')
    .replace(/°/g, ' deg ')
    .replace(/[✓✔]/g, '[OK]')
    .replace(/▲/g, '[*]')
    .replace(/⚠/g, '[!]')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function getDebriefReportFilename(state: GameState, ext: 'txt' | 'pdf'): string {
  const site = state.planet === 'moon' ? 'moon' : 'mars';
  const sol = state.environment.solNumber;
  return `sol-base-${site}-sol-${sol}-debrief.${ext}`;
}

export function formatMissionDebriefTextReport(
  state: GameState,
  commanderName = 'Junior Astronaut Trainee'
): string {
  const debrief = buildEnrichedDebriefSummary(state);
  const meters = getCoreMetersSummary(state);
  const scenario = SCENARIOS[state.scenario];
  const siteLabel =
    state.planet === 'moon'
      ? 'Moon - Shackleton Crater (Lunar South Pole)'
      : 'Mars - Jezero Crater';
  const earnedBadges = LEARNING_BADGES.filter((b) => state.unlockedBadges.includes(b.id));
  const cleanName = sanitizeReportText(commanderName || 'Junior Astronaut Trainee') || 'Junior Astronaut Trainee';

  const statusLine =
    state.phase === 'victory'
      ? 'MISSION COMPLETE - Crew Thrived!'
      : state.phase === 'gameover'
      ? 'MISSION SETBACK - Crew Evacuated Safely'
      : `IN-PROGRESS FLIGHT REVIEW (Sol ${state.environment.solNumber} of ${state.targetSols})`;

  const lines: string[] = [
    '========================================================================',
    'SOL BASE: MOON & MARS OUTPOST TRAINER - STUDENT MISSION DEBRIEF REPORT',
    '========================================================================',
    `Commander:      ${cleanName}`,
    `Landing Site:   ${siteLabel}`,
    `Mission Brief:  ${sanitizeReportText(scenario?.title || state.scenario)} (${state.difficulty.toUpperCase()})`,
    `Mission Status: ${statusLine}`,
    `Data Mode:      ${state.environment.solarFlareTelemetry.sourceBadge} NASA Space Weather`,
    '',
    '------------------------------------------------------------------------',
    '1. OUTPOST HEALTH & 3+1 CORE VITALS SUMMARY',
    '------------------------------------------------------------------------',
    `- Power Grid:     ${sanitizeReportText(meters.power.amountText)} | ${sanitizeReportText(meters.power.changePerSolText)} | Status: ${meters.power.statusLabel}`,
    `- Life Support:   ${sanitizeReportText(meters.life_support.amountText)} | ${sanitizeReportText(meters.life_support.solsRemainingText)} | Status: ${meters.life_support.statusLabel}`,
    `- Food Supply:    ${sanitizeReportText(meters.food.amountText)} | ${Math.round(state.stats.foodHarvestedKg)} kg fresh grown | Status: ${meters.food.statusLabel}`,
    `- Shielding:      ${sanitizeReportText(meters.shield.amountText)} | Peak Crew Dose: ${Math.round(state.stats.maxDoseMsv)} mSv (Safe Limit: 250 mSv)`,
    `- Crew Health:    ${Math.round(state.crew.healthPct)}% (${state.crew.healthy}/${state.crew.total} crew)`,
    '',
    '------------------------------------------------------------------------',
    '2. TOTAL RESOURCES TRADED (NO FREE CHOICES LEDGER)',
    '------------------------------------------------------------------------',
    `- Recorded Decisions: ${debrief.ledger.totalDecisions}`,
    `- Metal Alloy Traded: ${debrief.ledger.metalSpentKg} kg`,
    `- Regolith Used:      ${debrief.ledger.regolithSpentKg} kg`,
    `- Battery Spent:      ${debrief.ledger.batterySpentKwh} kWh`,
    `- Oxygen Spent (EVA): ${debrief.ledger.oxygenSpentKg} kg O2`,
    `- Science Invested:   ${debrief.ledger.scienceSpent} SP`,
    `- Crises Handled:     ${debrief.ledger.crisesResolved} of ${debrief.ledger.crisesTotal}`,
    '',
    '------------------------------------------------------------------------',
    '3. COMMAND DECISION TIMELINE & REAL NASA LINKS',
    '------------------------------------------------------------------------',
  ];

  const chronological = [...debrief.decisions].reverse();
  if (chronological.length === 0) {
    lines.push('No major construction, rover, or crisis decisions recorded yet.');
  } else {
    chronological.forEach((d, idx) => {
      lines.push(
        `${idx + 1}. [${sanitizeReportText(d.solTimeLabel || `Sol ${d.sol}`)}] ${sanitizeReportText(d.action)}`
      );
      lines.push(`   Cost Paid:  ${sanitizeReportText(d.costSummary)}`);
      lines.push(`   Outcome:    ${sanitizeReportText(d.outcomeNote)}`);
      if (d.tradeOffRisk) {
        lines.push(`   Trade-Off:  ${sanitizeReportText(d.tradeOffRisk)}`);
      }
      if (d.nasaRef) {
        lines.push(
          `   NASA Data:  ${sanitizeReportText(d.nasaRef.sourceProgram)} (${sanitizeReportText(d.nasaRef.recordId)}) [${d.nasaRef.sourceBadge}] - ${sanitizeReportText(d.nasaRef.title)}`
        );
      }
    });
  }

  lines.push('');
  lines.push('------------------------------------------------------------------------');
  lines.push('4. MISSION CRISES & REAL-WORLD NASA DATA SOURCES');
  lines.push('------------------------------------------------------------------------');
  debrief.crisisLinks.forEach(({ crisis, status, nasaRef }) => {
    lines.push(
      `* Sol ${crisis.triggerSol}: ${sanitizeReportText(crisis.title)} [${status.toUpperCase()}]`
    );
    lines.push(
      `  Source: ${sanitizeReportText(nasaRef.sourceProgram)} | ${sanitizeReportText(nasaRef.recordId)} (${nasaRef.sourceBadge})`
    );
    lines.push(`  Science: ${sanitizeReportText(nasaRef.summary)}`);
    lines.push(`  Planner: ${sanitizeReportText(nasaRef.plannerTakeaway)}`);
  });

  lines.push('');
  lines.push('------------------------------------------------------------------------');
  lines.push('5. EDUCATIONAL PERFORMANCE INSIGHTS & ACADEMY BADGES');
  lines.push('------------------------------------------------------------------------');
  debrief.insights.forEach((ins) => {
    lines.push(`* ${sanitizeReportText(ins.title)}: ${sanitizeReportText(ins.message)}`);
  });
  lines.push('');
  lines.push(`What Would a Real NASA Mission Planner Do?`);
  lines.push(`  ${sanitizeReportText(debrief.realPlannerAnswer)}`);
  lines.push(`Try This Next Time:`);
  lines.push(`  ${sanitizeReportText(debrief.tryNextTip)}`);
  lines.push('');
  lines.push(
    `Academy Badges Earned (${earnedBadges.length}/${LEARNING_BADGES.length}): ${
      earnedBadges.length > 0
        ? earnedBadges.map((b) => sanitizeReportText(b.title)).join(', ')
        : 'None unlocked yet - keep exploring!'
    }`
  );
  lines.push('');
  lines.push('NASA Open Data Credit: NASA DONKI (api.nasa.gov/DONKI), NASA OSDR, ISS Veggie,');
  lines.push('NASA Kilopower, Mars Perseverance MEDA, and Artemis Shackleton Imagery.');
  lines.push('========================================================================');

  return lines.join('\n');
}

function wrapLine(text: string, maxChars: number): string[] {
  const clean = sanitizeReportText(text);
  if (!clean) return [''];
  const words = clean.split(' ');
  const out: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += ' ' + w;
    } else {
      out.push(current);
      current = w;
    }
  }
  if (current) out.push(current);
  return out;
}

function escapePdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

interface PdfLine {
  text: string;
  bold?: boolean;
  size?: number;
  spaceAfter?: number;
}

/**
 * Pure TypeScript multi-page PDF 1.4 generator so students can download a clean
 * printable Mission Debrief PDF directly in any browser/iframe without popups.
 */
export function buildMissionDebriefPdfBytes(
  state: GameState,
  commanderName = 'Junior Astronaut Trainee'
): Uint8Array {
  const rawReport = formatMissionDebriefTextReport(state, commanderName);
  const rawLines = rawReport.split('\n');

  const formattedLines: PdfLine[] = [];
  for (const line of rawLines) {
    if (line.startsWith('====') || line.startsWith('----')) {
      continue;
    }
    if (
      line.startsWith('SOL BASE:') ||
      /^\d+\.\s+[A-Z0-9\s&+()/,-]+$/.test(line.trim())
    ) {
      const wrapped = wrapLine(line, 68);
      wrapped.forEach((w, idx) =>
        formattedLines.push({
          text: w,
          bold: true,
          size: line.startsWith('SOL BASE:') ? 13 : 11,
          spaceAfter: idx === wrapped.length - 1 ? 6 : 2,
        })
      );
    } else if (line.trim() === '') {
      formattedLines.push({ text: '', size: 9, spaceAfter: 4 });
    } else {
      const isHighlight = /^\d+\.\s+\[/.test(line) || line.startsWith('* ');
      const wrapped = wrapLine(line, 86);
      wrapped.forEach((w, idx) =>
        formattedLines.push({
          text: w,
          bold: isHighlight && idx === 0,
          size: 9.5,
          spaceAfter: idx === wrapped.length - 1 ? 3 : 1.5,
        })
      );
    }
  }

  // Paginate onto US Letter (612 x 792 pt)
  const pages: string[] = [];
  const startY = 742;
  const minY = 56;
  let y = startY;
  let streamLines: string[] = [];

  const flushPage = (pageNum: number) => {
    streamLines.push(
      `BT /F1 8 Tf 48 32 Td (SOL BASE: Moon & Mars Outpost Trainer - Student Take-Home Report | Page ${pageNum}) Tj ET`
    );
    pages.push(streamLines.join('\n'));
    streamLines = [];
    y = startY;
  };

  for (const item of formattedLines) {
    const size = item.size ?? 9.5;
    const lineHeight = size + 3.5;
    if (y - lineHeight < minY) {
      flushPage(pages.length + 1);
    }
    if (item.text) {
      const font = item.bold ? '/F2' : '/F1';
      streamLines.push(
        `BT ${font} ${size} Tf 48 ${y.toFixed(1)} Td (${escapePdfString(item.text)}) Tj ET`
      );
    }
    y -= lineHeight + (item.spaceAfter ?? 2);
  }
  if (streamLines.length > 0 || pages.length === 0) {
    flushPage(pages.length + 1);
  }

  // Assemble PDF objects
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [0]; // object 0 is free
  let bytePos = 0;

  const pushStr = (str: string) => {
    const bytes = encoder.encode(str);
    parts.push(bytes);
    bytePos += bytes.length;
  };

  pushStr('%PDF-1.4\n');

  const totalPages = pages.length;
  // Object layout:
  // 1: Catalog
  // 2: Pages
  // 3: Font F1 (Helvetica)
  // 4: Font F2 (Helvetica-Bold)
  // For each page i (0..totalPages-1):
  //   pageObj = 5 + i*2
  //   contentObj = 6 + i*2

  const pageRefs = Array.from({ length: totalPages }, (_, i) => `${5 + i * 2} 0 R`).join(' ');

  const addObj = (id: number, body: string) => {
    offsets[id] = bytePos;
    pushStr(`${id} 0 obj\n${body}\nendobj\n`);
  };

  addObj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  addObj(2, `<< /Type /Pages /Kids [ ${pageRefs} ] /Count ${totalPages} >>`);
  addObj(3, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  addObj(4, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  pages.forEach((streamBody, i) => {
    const pageObjId = 5 + i * 2;
    const contentObjId = 6 + i * 2;
    const streamLen = encoder.encode(streamBody).length;
    addObj(
      pageObjId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );
    addObj(
      contentObjId,
      `<< /Length ${streamLen} >>\nstream\n${streamBody}\nendstream`
    );
  });

  const xrefPos = bytePos;
  const objCount = 5 + totalPages * 2;
  pushStr(`xref\n0 ${objCount}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id < objCount; id++) {
    const offStr = String(offsets[id]).padStart(10, '0');
    pushStr(`${offStr} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  );

  const out = new Uint8Array(bytePos);
  let cursor = 0;
  for (const chunk of parts) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}
