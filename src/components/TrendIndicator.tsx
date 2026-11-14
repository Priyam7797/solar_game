/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

export type TrendDirection = 'up' | 'down' | 'stable';

export interface TrendIndicatorProps {
  trend?: TrendDirection;
  rate?: number;
  threshold?: number;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend: explicitTrend,
  rate,
  threshold = 0.05,
  label,
  className = '',
  size = 'sm',
}) => {
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

  const iconSizeClass = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${className}`}
      title={label || `Trend: ${direction}${rate !== undefined ? ` (${rate >= 0 ? `+${rate}` : rate})` : ''}`}
      aria-label={`Trend: ${direction}`}
    >
      {direction === 'up' && (
        <ArrowUp className={`${iconSizeClass} text-[#4cc38a] shrink-0`} strokeWidth={1.5} />
      )}
      {direction === 'down' && (
        <ArrowDown className={`${iconSizeClass} text-[#e5484d] shrink-0`} strokeWidth={1.5} />
      )}
      {direction === 'stable' && (
        <Minus className={`${iconSizeClass} text-[#7a8296] shrink-0`} strokeWidth={1.5} />
      )}
      {label && <span className="text-[#7a8296] text-xs">{label}</span>}
    </span>
  );
};
