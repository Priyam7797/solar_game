/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ModuleTypeId } from '../types/game';
import { MODULE_CATALOG } from '../game/modulesData';
import {
  TUTORIAL_DURATION_SEC,
  TUTORIAL_STEPS,
  TutorialState,
} from '../game/tutorialData';

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface TutorialOverlayProps {
  tutorialState: TutorialState;
  activePlacementType: ModuleTypeId | null;
  isPaused: boolean;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSelectStep: (stepIndex: number) => void;
  onSkip: () => void;
}

const CARD_WIDTH = 368;
const CARD_FALLBACK_HEIGHT = 276;
const SPOTLIGHT_PAD = 8;

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  tutorialState,
  activePlacementType,
  isPaused,
  onNextStep,
  onPrevStep,
  onSelectStep,
  onSkip,
}) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number>(CARD_FALLBACK_HEIGHT);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const step = TUTORIAL_STEPS[tutorialState.currentStepIndex] || TUTORIAL_STEPS[0];

  const measureTarget = useCallback(() => {
    if (typeof window === 'undefined') return;
    setViewport({ w: window.innerWidth, h: window.innerHeight });

    const el = document.querySelector(`[data-tutorial-target="${step.targetId}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
    });
    if (cardRef.current) {
      const ch = cardRef.current.getBoundingClientRect().height;
      if (ch > 0) setCardHeight(ch);
    }
  }, [step.targetId]);

  useEffect(() => {
    if (!tutorialState.active) return;

    measureTarget();
    window.addEventListener('resize', measureTarget);
    const interval = window.setInterval(measureTarget, 250);

    let observer: ResizeObserver | null = null;
    const el = document.querySelector(`[data-tutorial-target="${step.targetId}"]`);
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measureTarget);
      observer.observe(el);
    }

    return () => {
      window.removeEventListener('resize', measureTarget);
      window.clearInterval(interval);
      if (observer) observer.disconnect();
    };
  }, [tutorialState.active, step.targetId, measureTarget]);

  if (!tutorialState.active) {
    return null;
  }

  const remainingSec = Math.max(
    0,
    Math.ceil(TUTORIAL_DURATION_SEC - tutorialState.elapsedSec)
  );
  const overallProgressPct = Math.min(
    100,
    Math.round((tutorialState.elapsedSec / TUTORIAL_DURATION_SEC) * 100)
  );
  const isFirstStep = tutorialState.currentStepIndex === 0;
  const isLastStep = tutorialState.currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Compute safe card position adjacent to highlighted element
  const cardWidth = Math.min(CARD_WIDTH, viewport.w - 32);
  let cardLeft = Math.round((viewport.w - cardWidth) / 2);
  let cardTop = Math.round((viewport.h - cardHeight) / 2);

  // If user is actively placing a module during the module placement step,
  // tuck the tutorial card into the top-left corner so the 3D outpost grid is unobstructed.
  const isPlacingInTutorial =
    step.id === 'module_placement' && activePlacementType !== null;

  if (isPlacingInTutorial) {
    cardLeft = 16;
    cardTop = 104;
  } else if (targetRect) {
    const aboveGap = 28; // Leaves clear room for the Step Focus badge above the spotlight border
    const belowGap = 16;
    if (step.targetId === 'telemetry-bar') {
      if (viewport.w >= 1024 && targetRect.right + cardWidth + 32 < viewport.w) {
        cardLeft = targetRect.right + 20;
        cardTop = Math.max(120, Math.min(viewport.h - cardHeight - 24, targetRect.top));
      } else {
        cardLeft = Math.max(16, Math.min(viewport.w - cardWidth - 16, targetRect.left));
        cardTop = Math.max(16, targetRect.top - cardHeight - aboveGap);
      }
    } else if (step.targetId === 'build-dock') {
      cardLeft = Math.max(
        16,
        Math.min(
          viewport.w - cardWidth - 16,
          targetRect.left + targetRect.width / 2 - cardWidth / 2
        )
      );
      cardTop = Math.max(88, targetRect.top - cardHeight - aboveGap);
    } else if (step.targetId === 'time-controls') {
      cardLeft = Math.max(
        16,
        Math.min(
          viewport.w - cardWidth - 16,
          targetRect.left + targetRect.width / 2 - cardWidth / 2
        )
      );
      cardTop = Math.min(viewport.h - cardHeight - 16, targetRect.bottom + belowGap);
    } else if (step.targetId === 'crew-rad-bar') {
      cardLeft = Math.max(16, Math.min(viewport.w - cardWidth - 16, targetRect.right - cardWidth));
      cardTop = Math.min(viewport.h - cardHeight - 16, targetRect.bottom + belowGap);
    }
  }

  const spotlightX = targetRect ? Math.max(0, targetRect.left - SPOTLIGHT_PAD) : 0;
  const spotlightY = targetRect ? Math.max(0, targetRect.top - SPOTLIGHT_PAD) : 0;
  const spotlightW = targetRect ? targetRect.width + SPOTLIGHT_PAD * 2 : 0;
  const spotlightH = targetRect ? targetRect.height + SPOTLIGHT_PAD * 2 : 0;

  return (
    <div
      data-testid="tutorial-overlay"
      role="region"
      aria-label="First Mission 60-Second Tutorial"
      className="fixed inset-0 z-30 pointer-events-none"
    >
      {/* 1. Non-blocking SVG Spotlight Cutout Backdrop */}
      {targetRect && (
        <>
          <svg
            className="fixed inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <mask id="tutorial-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={spotlightX}
                  y={spotlightY}
                  width={spotlightW}
                  height={spotlightH}
                  rx="14"
                  ry="14"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(2, 6, 23, 0.48)"
              mask="url(#tutorial-spotlight-mask)"
            />
          </svg>

          {/* Animated Glowing Spotlight Border around Target HUD Element */}
          <div
            data-testid="tutorial-spotlight-ring"
            style={{
              top: spotlightY,
              left: spotlightX,
              width: spotlightW,
              height: spotlightH,
            }}
            className="fixed pointer-events-none rounded-2xl border-2 border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.5)] transition-all duration-300"
          >
            <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-cyan-400 text-slate-950 font-mono font-bold text-[10px] rounded uppercase tracking-wider shadow">
              Step {step.stepNumber} Focus
            </span>
          </div>
        </>
      )}

      {/* 2. Interactive Commander Guide Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-label={`Tutorial Step ${step.stepNumber}: ${step.title}`}
        style={{
          top: cardTop,
          left: cardLeft,
          width: cardWidth,
        }}
        className="fixed pointer-events-auto bg-slate-950/95 border border-cyan-500/70 rounded-xl p-4 shadow-2xl space-y-2.5 transition-all duration-300"
      >
        {/* Top Row: Step & 60s Countdown Timer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              {step.badge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="tutorial-timer"
              className="text-[11px] font-mono font-bold text-amber-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded tabular-nums"
            >
              {isPaused ? 'PAUSED' : `${remainingSec}s / 60s`}
            </span>
            <button
              onClick={onSkip}
              aria-label="Skip mission tutorial"
              className="text-xs font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              Skip
            </button>
          </div>
        </div>

        {/* 60-Second Orientation Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-200"
            style={{ width: `${overallProgressPct}%` }}
          />
        </div>

        {/* Step Title & Explanation */}
        <div>
          <h3 className="text-sm font-bold text-white font-display">
            {step.stepNumber}. {step.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mt-1 font-sans">
            {step.description}
          </p>
        </div>

        {/* Live Action Feedback Box */}
        {step.id === 'module_placement' && tutorialState.modulesPlacedDuringTutorial > 0 ? (
          <div className="text-xs font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 rounded-lg px-2.5 py-1.5">
            ✓ Module deployed! Great job expanding the outpost.
          </div>
        ) : isPlacingInTutorial && activePlacementType ? (
          <div className="text-xs font-mono text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-lg px-2.5 py-1.5">
            Placing {MODULE_CATALOG[activePlacementType]?.name}: Click an open tile on the 3D surface!
          </div>
        ) : (
          <div className="text-[11px] font-mono text-cyan-200 bg-cyan-950/40 border border-cyan-500/30 rounded-lg px-2.5 py-1.5">
            Try it: {step.actionPrompt}
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-1">
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectStep(idx)}
                aria-label={`Go to tutorial step ${s.stepNumber}: ${s.title}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === tutorialState.currentStepIndex
                    ? 'w-5 bg-cyan-400'
                    : idx < tutorialState.currentStepIndex
                    ? 'w-2 bg-emerald-400 hover:bg-emerald-300'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPrevStep}
              disabled={isFirstStep}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors ${
                isFirstStep
                  ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
            >
              ← Back
            </button>
            <button
              onClick={onNextStep}
              className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer"
            >
              {isLastStep ? 'Finish Guide ✓' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
