/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Bot, MessageSquare, Radio, Volume2, X } from 'lucide-react';
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
      className={`pointer-events-auto bg-[#11141c]/95 border rounded-xl p-3 flex flex-col gap-2 max-w-4xl mx-auto w-full transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        criticalNotice ? 'border-[#e5484d]/70' : 'border-[#eef0f5]/[0.08]'
      }`}
    >
      {criticalNotice && (
        <div
          role="alert"
          data-testid="aria-critical-notification"
          className="bg-[#1a1e28] border border-[#e5484d]/60 rounded-lg p-2 flex items-center justify-between gap-2 animate-resource-pulse-red"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#e5484d]/15 border border-[#e5484d]/40 text-xs font-mono text-[#e5484d] shrink-0">
              <Volume2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span>ARIA voice alert · {criticalNotice.label}</span>
            </span>
            <p className="text-xs font-sans font-medium text-[#eef0f5] leading-snug">
              {criticalNotice.bannerText}
            </p>
          </div>
          {onDismissCriticalNotice && (
            <button
              type="button"
              onClick={onDismissCriticalNotice}
              aria-label="Dismiss ARIA critical resource alert"
              className="text-[#a3a9b8] hover:text-[#eef0f5] p-1 rounded-md hover:bg-[#11141c] cursor-pointer shrink-0 transition-colors duration-150"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-lg bg-[#1a1e28] border border-[#eef0f5]/10 flex items-center justify-center shrink-0 text-[#38bdf8]"
          >
            <Bot className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-medium text-[#38bdf8]">
                ARIA crew guide
              </span>
              <span className="text-[#7a8296] text-xs">·</span>
              <GlossaryTerm
                termKey="light-time delay"
                label={state.planet === 'moon' ? 'Earth link: ~1.3s' : 'Earth link: 3–22 min delay'}
                className="text-xs font-mono"
              />
            </div>
            <p className="text-xs text-[#a3a9b8] leading-snug line-clamp-2 font-sans mt-1">
              {state.ariaMessage}
            </p>

            {transit && !transit.delivered && (
              <div
                data-testid="comms-transit-bar"
                className="mt-2 bg-[#0b0d14] border border-[#e5a93b]/40 rounded-lg px-2.5 py-1.5 space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-mono text-[#e5a93b]">
                  <span className="inline-flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                    <span>Signal in transit to Earth ({transit.realLightTimeLabel})</span>
                  </span>
                  <span className="tabular-nums">{transit.remainingSec.toFixed(1)}s left</span>
                </div>
                <div className="w-full h-1.5 bg-[#1a1e28] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#e5a93b] transition-[transform,opacity] duration-150"
                    style={{ width: `${transitPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAskMissionControl}
            disabled={Boolean(transit && !transit.delivered)}
            data-testid="ask-mission-control-btn"
            className={`h-8 px-3 text-xs font-sans font-medium rounded-lg border transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] inline-flex items-center gap-2 whitespace-nowrap ${
              transit && !transit.delivered
                ? 'bg-[#0b0d14] border-[#eef0f5]/[0.06] text-[#7a8296] cursor-wait'
                : 'bg-[#1a1e28] border-[#eef0f5]/10 text-[#eef0f5] hover:border-[#38bdf8]/50 cursor-pointer'
            }`}
          >
            <Radio className="w-4 h-4 shrink-0 text-[#38bdf8]" strokeWidth={1.5} />
            <span>Ask Mission Control</span>
          </button>

          <button
            type="button"
            onClick={onToggleVoice}
            aria-pressed={state.ariaVoiceEnabled}
            aria-label={state.ariaVoiceEnabled ? 'Turn off ARIA voice' : 'Turn on ARIA voice'}
            className={`h-8 px-3 text-xs font-sans font-medium rounded-lg border transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] inline-flex items-center gap-2 cursor-pointer ${
              state.ariaVoiceEnabled
                ? 'bg-[#1a1e28] border-[#4cc38a]/50 text-[#4cc38a]'
                : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5]'
            }`}
          >
            {state.ariaVoiceEnabled ? (
              <>
                <Volume2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>Voice on</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 shrink-0 text-[#7a8296]" strokeWidth={1.5} />
                <span>Captions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
