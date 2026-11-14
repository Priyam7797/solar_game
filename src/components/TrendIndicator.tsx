/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type TrendDirection = 'up' | 'down' | 'stable';

export interface TrendIndicatorProps {
  trend?: TrendDirection;
  rate?: number;
  threshold?: number;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * TrendIndicator renders small SVG arrows (up, down, stable) to indicate
 * whether a resource is increasing, decreasing, or balanced on the current tick.
 */
export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend: explicitTrend,
  rate,
  threshold = 0.05,
  label,
  className = '',
  size = 'sm',
}) => {
  // Determine trend either from explicit prop or calculated from rate
  let direction: TrendDirection = explicitTrend || 'stable';
  if (explicitTrend === undefined && rate !== undefined) {
    if (rate > threshold) {
      direction = 'up';
    } else if (rate < -threshold) {
      direction = 'down';
    } else {
      direction = 'stable';
    }
  }

  const iconSizeClass = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums ${className}`}
      title={label || `Trend: ${direction}${rate !== undefined ? ` (${rate >= 0 ? `+${rate}` : rate})` : ''}`}
      aria-label={`Trend: ${direction}`}
    >
      {direction === 'up' && (
        <svg
          className={`${iconSizeClass} text-emerald-400 shrink-0`}
          viewBox="0 0 16 16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Crisp upward arrow */}
          <path d="M8 2.5l4.5 5.5H9.5V13h-3V8H3.5L8 2.5z" />
        </svg>
      )}

      {direction === 'down' && (
        <svg
          className={`${iconSizeClass} text-rose-400 shrink-0`}
          viewBox="0 0 16 16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Crisp downward arrow */}
          <path d="M8 13.5l-4.5-5.5H6.5V3h3v5h3L8 13.5z" />
        </svg>
      )}

      {direction === 'stable' && (
        <svg
          className={`${iconSizeClass} text-slate-400 shrink-0`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Clean horizontal equilibrium mark */}
          <path d="M4 8h8" />
        </svg>
      )}

      {label && <span className="text-slate-400 text-[9px]">{label}</span>}
    </span>
  );
};
