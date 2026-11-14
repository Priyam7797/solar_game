/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
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

  const cardWidth = Math.min(CARD_WIDTH, viewport.w - 32);
  let cardLeft = Math.round((viewport.w - cardWidth) / 2);
  let cardTop = Math.round((viewport.h - cardHeight) / 2);

  const isPlacingInTutorial =
    step.id === 'module_placement' && activePlacementType !== null;

  if (isPlacingInTutorial) {
    cardLeft = 16;
    cardTop = 104;
  } else if (targetRect) {
    const aboveGap = 28;
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
              fill="rgba(7, 8, 13, 0.56)"
              mask="url(#tutorial-spotlight-mask)"
            />
          </svg>

          <div
            data-testid="tutorial-spotlight-ring"
            style={{
              top: spotlightY,
              left: spotlightX,
              width: spotlightW,
              height: spotlightH,
            }}
            className="fixed pointer-events-none rounded-2xl border border-[#38bdf8]/80 transition-[top,left,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <span className="absolute -top-3 left-3 px-2 py-0.5 bg-[#11141c] border border-[#38bdf8]/60 text-[#eef0f5] font-mono text-xs rounded-md">
              Step {step.stepNumber} focus
            </span>
          </div>
        </>
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-label={`Tutorial Step ${step.stepNumber}: ${step.title}`}
        style={{
          top: cardTop,
          left: cardLeft,
          width: cardWidth,
        }}
        className="fixed pointer-events-auto bg-[#11141c]/95 border border-[#eef0f5]/10 rounded-xl p-4 space-y-3 transition-[top,left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" aria-hidden="true" />
            <span className="text-xs font-mono text-[#7a8296]">
              {step.badge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="tutorial-timer"
              className="text-xs font-mono text-[#eef0f5] bg-[#0b0d14] border border-[#eef0f5]/[0.08] px-2 py-0.5 rounded-md tabular-nums"
            >
              {isPaused ? 'Paused' : `${remainingSec}s / 60s`}
            </span>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip mission tutorial"
              className="text-xs font-sans text-[#a3a9b8] hover:text-[#eef0f5] px-2 py-1 rounded-md hover:bg-[#1a1e28] cursor-pointer transition-colors duration-150"
            >
              Skip
            </button>
          </div>
        </div>

        <div className="w-full bg-[#1a1e28] h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#38bdf8] transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${overallProgressPct}%` }}
          />
        </div>

        <div>
          <h3 className="text-base font-medium text-[#eef0f5] font-display">
            {step.stepNumber}. {step.title}
          </h3>
          <p className="text-xs text-[#a3a9b8] leading-relaxed mt-1 font-sans">
            {step.description}
          </p>
        </div>

        {step.id === 'module_placement' && tutorialState.modulesPlacedDuringTutorial > 0 ? (
          <div className="text-xs font-mono text-[#4cc38a] bg-[#0b0d14] border border-[#4cc38a]/40 rounded-lg p-2.5 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>Module deployed and operational</span>
          </div>
        ) : isPlacingInTutorial && activePlacementType ? (
          <div className="text-xs font-mono text-[#e5a93b] bg-[#0b0d14] border border-[#e5a93b]/40 rounded-lg p-2.5">
            Placing {MODULE_CATALOG[activePlacementType]?.name}: Click an open tile on the 3D surface.
          </div>
        ) : (
          <div className="text-xs font-mono text-[#a3a9b8] bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-lg p-2.5">
            Try it: {step.actionPrompt}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectStep(idx)}
                aria-label={`Go to tutorial step ${s.stepNumber}: ${s.title}`}
                className={`h-2 rounded-full transition-[width,background-color] duration-150 cursor-pointer ${
                  idx === tutorialState.currentStepIndex
                    ? 'w-5 bg-[#38bdf8]'
                    : idx < tutorialState.currentStepIndex
                    ? 'w-2 bg-[#4cc38a]'
                    : 'w-2 bg-[#1a1e28] border border-[#eef0f5]/15'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevStep}
              disabled={isFirstStep}
              className={`h-8 px-3 text-xs font-sans font-medium rounded-lg border inline-flex items-center gap-1.5 transition-colors duration-150 ${
                isFirstStep
                  ? 'border-[#eef0f5]/[0.06] text-[#7a8296] cursor-not-allowed'
                  : 'border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] hover:bg-[#1a1e28] cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={onNextStep}
              className="h-8 px-3 text-xs font-sans font-medium rounded-lg bg-[#eef0f5] hover:bg-white text-[#07080d] inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            >
              <span>{isLastStep ? 'Finish guide' : 'Next'}</span>
              {isLastStep ? (
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
