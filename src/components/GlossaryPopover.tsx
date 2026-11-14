/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
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
        className="inline-flex items-center gap-1 underline decoration-dotted decoration-[#38bdf8]/60 underline-offset-2 text-[#38bdf8] hover:text-[#eef0f5] cursor-pointer font-normal transition-colors duration-150"
      >
        <span>{label || entry.term}</span>
        <HelpCircle className="w-3.5 h-3.5 text-[#7a8296] shrink-0" strokeWidth={1.5} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Definition of ${entry.term}`}
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 sm:absolute sm:bottom-full sm:left-0 sm:translate-x-0 sm:mb-2 w-72 bg-[#11141c] border border-[#eef0f5]/10 rounded-xl p-3 z-50 pointer-events-auto text-left space-y-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-mono text-[#7a8296] block">
                Space term definition
              </span>
              <h4 className="text-xs font-medium text-[#eef0f5] mt-0.5">{entry.term}</h4>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={`Close ${entry.term} explanation`}
              className="text-[#7a8296] hover:text-[#eef0f5] p-1 rounded-md hover:bg-[#1a1e28] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <p className="text-xs text-[#38bdf8] font-medium leading-snug">{entry.short}</p>
          <p className="text-xs text-[#a3a9b8] leading-relaxed">{entry.detail}</p>
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
      className="fixed inset-0 z-50 pointer-events-auto bg-[#07080d]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Space Terms Dictionary"
    >
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-2xl w-full max-h-[82vh] flex flex-col">
        <div className="p-4 border-b border-[#eef0f5]/[0.08] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-[#7a8296] block">
              Junior astronaut field guide
            </span>
            <h3 className="text-lg font-medium text-[#eef0f5] font-display mt-0.5">
              Space terms glossary
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close space terms dictionary"
            className="h-8 px-3 rounded-lg bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-sans inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Close</span>
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map(([key, item]) => (
            <div
              key={key}
              className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-1.5"
            >
              <h4 className="text-xs font-medium text-[#38bdf8]">{item.term}</h4>
              <p className="text-xs text-[#eef0f5] font-medium leading-snug">{item.short}</p>
              <p className="text-xs text-[#a3a9b8] leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
