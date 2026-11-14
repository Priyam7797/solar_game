/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Dna, Globe, Sun, X } from 'lucide-react';
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
            ? `Live NASA DONKI /${ep} feed active (${data.fetchedDateRange}). Latest: ${first.flareClass} (${first.activeRegion}) on ${first.date}.`
            : `NASA DONKI /${ep} (${data.note || 'archived fallback'}) — showing archived ${ep} data: ${first.flareClass}.`
        );
      }
    } catch {
      setLiveStatus(`Could not reach /api/donki?endpoint=${ep} — showing bundled archived NASA DONKI data.`);
    } finally {
      setIsCheckingLive(false);
    }
  };

  const siteCfg = sitesJson.sites[state.planet];

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-[#07080d]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Data Sources and Astronaut Health Cards"
      data-testid="data-sources-modal"
    >
      <div className="bg-[#11141c] border border-[#eef0f5]/10 rounded-2xl max-w-3xl w-full max-h-[86vh] flex flex-col">
        <div className="p-4 border-b border-[#eef0f5]/[0.08] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-[#7a8296] block">
              NASA open data · Sources &amp; science
            </span>
            <h3 className="text-lg font-medium text-[#eef0f5] font-display mt-0.5">
              Astronaut Health Cards (OSDR) &amp; Space Weather (DONKI)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Data and Sources"
            className="h-8 px-3 rounded-lg bg-[#1a1e28] hover:bg-[#1a1e28]/80 border border-[#eef0f5]/10 text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-sans inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Close</span>
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[#eef0f5]/[0.08]">
          {[
            { id: 'health' as const, label: 'OSDR Health Cards (10)', Icon: Dna },
            { id: 'donki' as const, label: 'DONKI Solar Weather', Icon: Sun },
            { id: 'sites' as const, label: 'Moon / Mars Real vs Game', Icon: Globe },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`h-8 px-3 rounded-lg text-xs font-sans font-medium inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer ${
                tab === id
                  ? 'bg-[#1a1e28] border border-[#38bdf8]/60 text-[#eef0f5]'
                  : 'bg-[#0b0d14] text-[#a3a9b8] border border-[#eef0f5]/[0.08] hover:text-[#eef0f5]'
              }`}
            >
              <Icon className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {tab === 'health' && (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`h-7 px-2.5 rounded-md text-xs font-mono cursor-pointer border transition-colors duration-150 ${
                      categoryFilter === cat
                        ? 'bg-[#1a1e28] border-[#38bdf8]/60 text-[#eef0f5]'
                        : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#7a8296] hover:text-[#eef0f5]'
                    }`}
                  >
                    {cat === 'ALL' ? 'All' : cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-[#38bdf8]">
                        {card.category} · {card.osdrId}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#1a1e28] text-[#a3a9b8]">
                        {card.badge}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-[#eef0f5]">{card.title}</h4>
                    <p className="text-xs text-[#a3a9b8] leading-snug">{card.finding}</p>
                    <div className="text-xs font-mono text-[#4cc38a] bg-[#11141c] border border-[#4cc38a]/25 rounded-lg p-2.5">
                      In game: {card.gameplayLink}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'donki' && (
            <div className="space-y-3" data-testid="donki-tab-panel">
              <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#eef0f5]">
                      NASA DONKI Space Weather API (11 Streams)
                    </span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-md border ${
                        state.environment.solarFlareTelemetry.sourceBadge === 'LIVE'
                          ? 'bg-[#4cc38a]/15 text-[#4cc38a] border-[#4cc38a]/35'
                          : 'bg-[#e5a93b]/15 text-[#e5a93b] border-[#e5a93b]/35'
                      }`}
                    >
                      {state.environment.solarFlareTelemetry.sourceBadge}
                    </span>
                  </div>
                  <p className="text-xs text-[#a3a9b8] mt-1 leading-relaxed">
                    Explore all 11 real NASA DONKI feeds (FLR, CME, CMEAnalysis, SEP, GST, IPS, MPC, RBE, HSS, WSA+Enlil, Notifications). Sync live or inspect archived datasets safely.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCheckingLive}
                  onClick={() => checkLiveDonki(selectedEndpoint)}
                  data-testid="sync-donki-live-btn"
                  className="h-9 px-3.5 bg-[#eef0f5] hover:bg-white text-[#07080d] text-xs font-mono font-medium rounded-lg cursor-pointer shrink-0 transition-colors duration-150"
                >
                  {isCheckingLive ? `Syncing /${selectedEndpoint}` : `Sync live /${selectedEndpoint}`}
                </button>
              </div>

              {/* 11 Official NASA DONKI Endpoint Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="donki-endpoint-grid">
                {DONKI_ENDPOINTS.map((ep) => {
                  const active = ep.id === selectedEndpoint;
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => selectEndpoint(ep.id)}
                      data-testid={`donki-endpoint-${ep.id}`}
                      className={`text-left p-2.5 rounded-lg border transition-colors duration-150 cursor-pointer ${
                        active
                          ? 'bg-[#1a1e28] border-[#38bdf8]/60 text-[#eef0f5]'
                          : 'bg-[#0b0d14] border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:border-[#eef0f5]/15'
                      }`}
                    >
                      <div className="text-xs font-mono font-medium text-[#38bdf8]">{ep.id}</div>
                      <div className="text-xs text-[#a3a9b8] truncate mt-0.5">{ep.impactArea}</div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Endpoint Details */}
              <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium text-[#eef0f5]">{selectedSpec.name}</span>
                  <span className="text-xs font-mono text-[#38bdf8]">{selectedSpec.nasaPath}</span>
                </div>
                <p className="text-xs text-[#a3a9b8] leading-snug">{selectedSpec.kidDescription}</p>
                <div className="text-xs font-mono text-[#7a8296] truncate">
                  Query: ?{selectedSpec.exampleQuery}
                </div>
              </div>

              {liveStatus && (
                <div
                  data-testid="donki-sync-status"
                  className="text-xs font-mono text-[#eef0f5] bg-[#0b0d14] border border-[#38bdf8]/40 rounded-lg p-3"
                >
                  {liveStatus}
                </div>
              )}

              <div className="space-y-2">
                {displayedDonkiEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono flex-wrap tabular-nums">
                      <span className="text-[#e5a93b] font-medium">
                        {ev.flareClass} · {ev.activeRegion} · {ev.date}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[#1a1e28] text-[#a3a9b8]">
                        {ev.sourceBadge} · {ev.protonFluxPfu} pfu · Kp {ev.kpIndex}
                      </span>
                    </div>
                    <p className="text-xs text-[#eef0f5]">{ev.summary}</p>
                    <p className="text-xs text-[#38bdf8] font-mono">Planner note: {ev.realPlannerNote}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'sites' && (
            <div className="space-y-3">
              <div className="bg-[#0b0d14] border border-[#eef0f5]/[0.08] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-[#eef0f5]">{siteCfg.name}</h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#1a1e28] text-[#38bdf8]">
                    {siteCfg.dataSourceBadge}
                  </span>
                </div>
                <p className="text-xs text-[#a3a9b8] leading-relaxed">{siteCfg.realVsSimplifiedNote}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono pt-1 tabular-nums">
                  <div className="bg-[#11141c] border border-[#eef0f5]/[0.08] p-2.5 rounded-lg">
                    <span className="text-[#7a8296] text-xs block">Source</span>
                    <span className="text-[#eef0f5]">{siteCfg.dataSourceName}</span>
                  </div>
                  <div className="bg-[#11141c] border border-[#eef0f5]/[0.08] p-2.5 rounded-lg">
                    <span className="text-[#7a8296] text-xs block">Comms delay</span>
                    <span className="text-[#e5a93b]">{siteCfg.commsDelayLabel}</span>
                  </div>
                  <div className="bg-[#11141c] border border-[#eef0f5]/[0.08] p-2.5 rounded-lg">
                    <span className="text-[#7a8296] text-xs block">Surface rad</span>
                    <span className="text-[#38bdf8]">{siteCfg.ambientRadiationMsvDay} mSv/day</span>
                  </div>
                </div>
                <div className="text-xs text-[#7a8296] pt-1">
                  Imagery &amp; terrain credit: {siteCfg.imageCredit}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
