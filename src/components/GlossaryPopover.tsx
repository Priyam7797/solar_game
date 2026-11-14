/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import glossaryJson from '../data/glossary.json';

export type GlossaryKey = keyof typeof glossaryJson.terms;

interface GlossaryTermProps {
  termKey: GlossaryKey;
  label?: string;
  className?: string;
}

export const GlossaryTerm: React.FC<GlossaryTermProps> = ({
  termKey,
  label,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const entry = glossaryJson.terms[termKey];
  if (!entry) return <span>{label || termKey}</span>;

  return (
    <span className={`inline-flex items-center relative ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-label={`What does ${entry.term} mean?`}
        className="inline-flex items-center gap-1 underline decoration-dotted decoration-cyan-400/70 underline-offset-2 text-cyan-300 hover:text-cyan-200 cursor-pointer font-medium"
      >
        <span>{label || entry.term}</span>
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-[9px] font-mono font-bold text-cyan-300">
          ?
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Definition of ${entry.term}`}
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 sm:absolute sm:bottom-full sm:left-0 sm:translate-x-0 sm:mb-2 w-72 bg-slate-950 border border-cyan-500/70 rounded-xl p-3 shadow-2xl z-50 pointer-events-auto text-left space-y-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                WHAT DOES THIS MEAN?
              </span>
              <h4 className="text-xs font-bold text-white">{entry.term}</h4>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={`Close ${entry.term} explanation`}
              className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-cyan-100 font-medium leading-snug">{entry.short}</p>
          <p className="text-[11px] text-slate-300 leading-relaxed">{entry.detail}</p>
        </div>
      )}
    </span>
  );
};

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const entries = Object.entries(glossaryJson.terms) as [
    GlossaryKey,
    (typeof glossaryJson.terms)[GlossaryKey]
  ][];

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Space Terms Dictionary"
    >
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-2xl w-full max-h-[82vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
              JUNIOR ASTRONAUT FIELD GUIDE
            </span>
            <h3 className="text-lg font-bold text-white font-display">
              What Does This Mean? Space Terms
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close space terms dictionary"
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map(([key, item]) => (
            <div
              key={key}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1"
            >
              <h4 className="text-xs font-bold text-cyan-300">{item.term}</h4>
              <p className="text-xs text-white font-medium leading-snug">{item.short}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
