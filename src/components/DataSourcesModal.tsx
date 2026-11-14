/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameState } from '../types/game';
import osdrJson from '../data/osdrHealthCards.json';
import sitesJson from '../data/sites.json';
import { DONKI_ARCHIVE_EVENTS, DonkiFlareRecord } from '../game/spaceWeatherData';
import {
  DONKI_ENDPOINTS,
  DONKI_ENDPOINT_MAP,
  DonkiEndpointId,
  getArchivedSamplesForEndpoint,
} from '../game/donkiEndpoints';

interface DataSourcesModalProps {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onApplyLiveDonki?: (record: DonkiFlareRecord | null, sourceBadge: 'LIVE' | 'ARCHIVED') => void;
}

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({
  state,
  isOpen,
  onClose,
  onApplyLiveDonki,
}) => {
  const [tab, setTab] = useState<'health' | 'donki' | 'sites'>('health');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedEndpoint, setSelectedEndpoint] = useState<DonkiEndpointId>('FLR');
  const [endpointEvents, setEndpointEvents] = useState<DonkiFlareRecord[] | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [isCheckingLive, setIsCheckingLive] = useState(false);

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(osdrJson.cards.map((c) => c.category)))];
  const filteredCards = osdrJson.cards.filter(
    (c) => categoryFilter === 'ALL' || c.category === categoryFilter
  );

  const selectedSpec = DONKI_ENDPOINT_MAP[selectedEndpoint];
  const displayedDonkiEvents =
    endpointEvents ||
    (selectedEndpoint === 'FLR'
      ? DONKI_ARCHIVE_EVENTS
      : getArchivedSamplesForEndpoint(selectedEndpoint));

  const selectEndpoint = (ep: DonkiEndpointId) => {
    setSelectedEndpoint(ep);
    setEndpointEvents(null);
    setLiveStatus(null);
  };

  const checkLiveDonki = async (ep: DonkiEndpointId = selectedEndpoint) => {
    setIsCheckingLive(true);
    setLiveStatus(null);
    try {
      const resp = await fetch(`/api/donki?live=1&endpoint=${encodeURIComponent(ep)}`);
      const data = await resp.json();
      const events = Array.isArray(data?.events) ? (data.events as DonkiFlareRecord[]) : [];
      const badge: 'LIVE' | 'ARCHIVED' =
        data?.mode === 'LIVE' || data?.source === 'LIVE' ? 'LIVE' : 'ARCHIVED';
      if (events.length > 0) {
        setEndpointEvents(events);
        const first = events[0];
        onApplyLiveDonki?.(first, badge);
        setLiveStatus(
          badge === 'LIVE'
            ? `LIVE NASA DONKI /${ep} feed active (${data.fetchedDateRange})! Latest: ${first.flareClass} (${first.activeRegion}) on ${first.date}.`
            : `NASA DONKI /${ep} (${data.note || 'fallback'}) — showing authentic ARCHIVED ${ep} data: ${first.flareClass}.`
        );
      }
    } catch {
      setLiveStatus(`Could not reach /api/donki?endpoint=${ep} — showing bundled ARCHIVED NASA DONKI data.`);
    } finally {
      setIsCheckingLive(false);
    }
  };

  const siteCfg = sitesJson.sites[state.planet];

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Data Sources and Astronaut Health Cards"
      data-testid="data-sources-modal"
    >
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-3xl w-full max-h-[86vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
              REAL NASA OPEN DATA · DATA & SOURCES
            </span>
            <h3 className="text-lg font-bold text-white font-display">
              Astronaut Health Cards (OSDR) & Space Weather (DONKI)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Data and Sources"
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pt-3 flex items-center gap-2 border-b border-slate-800 pb-2.5">
          {[
            ['health', '🧬 OSDR Health Cards (10)'],
            ['donki', '☀️ DONKI Solar Weather'],
            ['sites', '🌕 Moon / Mars Real vs Game'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as 'health' | 'donki' | 'sites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                tab === id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {tab === 'health' && (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-950 border border-slate-800 text-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-slate-950/85 border border-slate-800 rounded-xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                        {card.category} · {card.osdrId}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {card.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white">{card.title}</h4>
                    <p className="text-xs text-slate-300 leading-snug">{card.finding}</p>
                    <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/35 border border-emerald-500/25 rounded p-2">
                      In Game: {card.gameplayLink}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'donki' && (
            <div className="space-y-3" data-testid="donki-tab-panel">
              <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">
                      NASA DONKI Space Weather API (11 Streams)
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        state.environment.solarFlareTelemetry.sourceBadge === 'LIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {state.environment.solarFlareTelemetry.sourceBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Explore all 11 real NASA DONKI feeds (FLR, CME, CMEAnalysis, SEP, GST, IPS, MPC, RBE, HSS, WSA+Enlil, Notifications). Sync live or inspect archived datasets safely.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCheckingLive}
                  onClick={() => checkLiveDonki(selectedEndpoint)}
                  data-testid="sync-donki-live-btn"
                  className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold rounded-lg cursor-pointer shrink-0"
                >
                  {isCheckingLive ? `Syncing /${selectedEndpoint}…` : `Sync Live /${selectedEndpoint}`}
                </button>
              </div>

              {/* 11 Official NASA DONKI Endpoint Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="donki-endpoint-grid">
                {DONKI_ENDPOINTS.map((ep) => {
                  const active = ep.id === selectedEndpoint;
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => selectEndpoint(ep.id)}
                      data-testid={`donki-endpoint-${ep.id}`}
                      className={`text-left px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold text-cyan-300">{ep.id}</div>
                      <div className="text-[10px] text-slate-300 truncate">{ep.impactArea}</div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Endpoint Details */}
              <div className="bg-cyan-950/25 border border-cyan-500/35 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">{selectedSpec.name}</span>
                  <span className="text-[10px] font-mono text-cyan-300">{selectedSpec.nasaPath}</span>
                </div>
                <p className="text-xs text-slate-200 leading-snug">{selectedSpec.kidDescription}</p>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  NASA Query: ?{selectedSpec.exampleQuery}
                </div>
              </div>

              {liveStatus && (
                <div
                  data-testid="donki-sync-status"
                  className="text-xs font-mono text-cyan-200 bg-cyan-950/50 border border-cyan-500/40 rounded-lg p-2.5"
                >
                  {liveStatus}
                </div>
              )}

              <div className="space-y-2">
                {displayedDonkiEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono flex-wrap">
                      <span className="text-amber-300 font-bold">
                        {ev.flareClass} · {ev.activeRegion} · {ev.date}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {ev.sourceBadge} · {ev.protonFluxPfu} pfu · Kp {ev.kpIndex}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">{ev.summary}</p>
                    <p className="text-[11px] text-cyan-300 font-mono">Planner Note: {ev.realPlannerNote}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'sites' && (
            <div className="space-y-3">
              <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{siteCfg.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {siteCfg.dataSourceBadge}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{siteCfg.realVsSimplifiedNote}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">Source</span>
                    <span className="text-white">{siteCfg.dataSourceName}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">Comms Delay</span>
                    <span className="text-amber-300">{siteCfg.commsDelayLabel}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">Surface Rad</span>
                    <span className="text-cyan-300">{siteCfg.ambientRadiationMsvDay} mSv/day</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Imagery & Terrain Credit: {siteCfg.imageCredit}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
