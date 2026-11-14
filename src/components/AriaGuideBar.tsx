/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { GameState } from '../types/game';
import { GlossaryTerm } from './GlossaryPopover';
import { CriticalResourceNotification } from '../game/resourceAlerts';

interface AriaGuideBarProps {
  state: GameState;
  onToggleVoice: () => void;
  onAskMissionControl: () => void;
  criticalNotice?: CriticalResourceNotification | null;
  onDismissCriticalNotice?: () => void;
}

export const AriaGuideBar: React.FC<AriaGuideBarProps> = ({
  state,
  onToggleVoice,
  onAskMissionControl,
  criticalNotice,
  onDismissCriticalNotice,
}) => {
  // Optional browser Web Speech API narration when player turns voice ON
  useEffect(() => {
    if (!state.ariaVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(state.ariaMessage);
      utter.rate = 1.02;
      utter.pitch = 1.08;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis restrictions in headless browsers
    }
  }, [state.ariaMessage, state.ariaVoiceEnabled]);

  // Automatic brief ARIA voice notification when Power, Oxygen/Water, or Food enters critical state
  useEffect(() => {
    if (
      !criticalNotice ||
      state.audioMuted ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(criticalNotice.speechText);
      utter.rate = 1.06;
      utter.pitch = 1.1;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis restrictions in headless browsers
    }
  }, [criticalNotice, state.audioMuted]);

  const transit = state.commsTransit;
  const transitPct =
    transit && transit.totalDelaySec > 0
      ? Math.min(100, Math.round(((transit.totalDelaySec - transit.remainingSec) / transit.totalDelaySec) * 100))
      : 100;

  return (
    <div
      data-testid="aria-guide-bar"
      className={`pointer-events-auto bg-slate-900/92 border rounded-xl px-3.5 py-2 shadow-xl flex flex-col gap-2 max-w-4xl mx-auto w-full transition-colors ${
        criticalNotice ? 'border-rose-500/80' : 'border-cyan-500/40'
      }`}
    >
      {criticalNotice && (
        <div
          role="alert"
          data-testid="aria-critical-notification"
          className="bg-rose-950/90 border border-rose-500/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 animate-resource-pulse-red"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/25 border border-rose-400/60 text-[10px] font-mono font-bold text-rose-200 shrink-0">
              <span aria-hidden="true">🔊</span>
              <span>ARIA VOICE ALERT · {criticalNotice.label}</span>
            </span>
            <p className="text-[11px] font-sans font-semibold text-rose-100 leading-snug">
              {criticalNotice.bannerText}
            </p>
          </div>
          {onDismissCriticalNotice && (
            <button
              type="button"
              onClick={onDismissCriticalNotice}
              aria-label="Dismiss ARIA critical resource alert"
              className="text-rose-200 hover:text-white text-xs font-mono px-1 cursor-pointer shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          {/* Friendly Robot Mascot Badge */}
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/70 flex items-center justify-center shrink-0 text-sm"
          >
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                ARIA CREW GUIDE
              </span>
              <GlossaryTerm
                termKey="light-time delay"
                label={state.planet === 'moon' ? 'Earth Link: ~1.3s' : 'Earth Link: 3–22 min delay'}
                className="text-[10px] font-mono"
              />
            </div>
            <p className="text-xs text-slate-200 leading-snug line-clamp-2 font-sans mt-0.5">
              {state.ariaMessage}
            </p>

            {transit && !transit.delivered && (
              <div
                data-testid="comms-transit-bar"
                className="mt-1.5 bg-slate-950/90 border border-amber-500/50 rounded-lg px-2.5 py-1 space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-300">
                  <span>📡 SIGNAL IN TRANSIT TO EARTH ({transit.realLightTimeLabel})</span>
                  <span className="tabular-nums">{transit.remainingSec.toFixed(1)}s left</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-150"
                    style={{ width: `${transitPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onAskMissionControl}
          disabled={Boolean(transit && !transit.delivered)}
          data-testid="ask-mission-control-btn"
          className={`px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-colors whitespace-nowrap ${
            transit && !transit.delivered
              ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait'
              : 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200 hover:bg-cyan-500/25 cursor-pointer'
          }`}
        >
          📡 Ask Mission Control
        </button>

        <button
          type="button"
          onClick={onToggleVoice}
          aria-pressed={state.ariaVoiceEnabled}
          aria-label={state.ariaVoiceEnabled ? 'Turn off ARIA voice' : 'Turn on ARIA voice'}
          className={`px-2 py-1.5 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
            state.ariaVoiceEnabled
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          {state.ariaVoiceEnabled ? '🔊 Voice ON' : '💬 Captions'}
        </button>
      </div>
      </div>
    </div>
  );
};
