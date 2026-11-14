import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDonkiUpstreamUrl,
  DONKI_ENDPOINTS,
  getArchivedSamplesForEndpoint,
  isValidDonkiEndpoint,
  normalizeDonkiApiResponse,
} from './donkiEndpoints';

test('DONKI_ENDPOINTS includes all 11 official NASA DONKI endpoints', () => {
  const expectedIds = [
    'FLR',
    'CME',
    'CMEAnalysis',
    'SEP',
    'GST',
    'IPS',
    'MPC',
    'RBE',
    'HSS',
    'WSAEnlilSimulations',
    'notifications',
  ];
  assert.equal(DONKI_ENDPOINTS.length, 11);
  for (const id of expectedIds) {
    assert.equal(isValidDonkiEndpoint(id), true, `Expected ${id} to be registered`);
    assert.ok(getArchivedSamplesForEndpoint(id as typeof DONKI_ENDPOINTS[number]['id']).length >= 1);
  }
  assert.equal(isValidDonkiEndpoint('INVALID'), false);
});

test('buildDonkiUpstreamUrl constructs exact NASA DONKI query parameters per endpoint', () => {
  const flrUrl = buildDonkiUpstreamUrl('FLR', '2024-05-01', '2024-05-15', 'DEMO_KEY');
  assert.equal(
    flrUrl,
    'https://api.nasa.gov/DONKI/FLR?startDate=2024-05-01&endDate=2024-05-15&api_key=DEMO_KEY'
  );

  const cmeaUrl = buildDonkiUpstreamUrl('CMEAnalysis', '2016-09-01', '2016-09-30', 'DEMO_KEY');
  assert.ok(cmeaUrl.includes('/DONKI/CMEAnalysis?'));
  assert.ok(cmeaUrl.includes('mostAccurateOnly=true&speed=500&halfAngle=30&catalog=ALL'));

  const ipsUrl = buildDonkiUpstreamUrl('IPS', '2024-05-01', '2024-05-15', 'DEMO_KEY');
  assert.ok(ipsUrl.includes('location=ALL&catalog=ALL'));

  const notifUrl = buildDonkiUpstreamUrl('notifications', '2014-05-01', '2014-05-08', 'DEMO_KEY');
  assert.ok(notifUrl.includes('type=all'));
});

test('normalizeDonkiApiResponse handles all 11 NASA DONKI schemas cleanly', () => {
  const flr = normalizeDonkiApiResponse('FLR', [
    { flrID: '2024-05-14T16:51:00-FLR-001', classType: 'X8.7', activeRegionNum: 3664, beginTime: '2024-05-14T16:51Z' },
  ]);
  assert.equal(flr[0].flareClass, 'X8.7');
  assert.equal(flr[0].activeRegion, 'AR 3664');
  assert.equal(flr[0].riskLevel, 'critical');

  const cme = normalizeDonkiApiResponse('CME', [
    { activityID: '2024-05-10-CME-1', startTime: '2024-05-10T06:54Z', cmeAnalyses: [{ speed: 1620, halfAngle: 52 }] },
  ]);
  assert.equal(cme[0].cmeSpeedKmS, 1620);
  assert.equal(cme[0].riskLevel, 'critical');

  const gst = normalizeDonkiApiResponse('GST', [
    { gstID: '2024-05-10-GST-1', startTime: '2024-05-10T17:00Z', allKpIndex: [{ kpIndex: 8 }, { kpIndex: 9 }] },
  ]);
  assert.equal(gst[0].kpIndex, 9);
  assert.equal(gst[0].riskLevel, 'critical');

  const enlil = normalizeDonkiApiResponse('WSAEnlilSimulations', [
    {
      simulationID: 'ENLIL-1',
      modelCompletionTime: '2024-05-10T11:30Z',
      kp_180: 7,
      impactList: [{ location: 'Mars', arrivalTime: '2024-05-13T04:00Z' }],
    },
  ]);
  assert.ok(enlil[0].summary.includes('Mars'));
  assert.equal(enlil[0].riskLevel, 'high');

  const notif = normalizeDonkiApiResponse('notifications', [
    {
      messageID: '20240514-AL-001',
      messageType: 'SEP',
      messageIssueTime: '2024-05-14T18:00Z',
      messageBody: 'X8.7 flare from AR 3664 expected to boost proton flux.',
    },
  ]);
  assert.equal(notif[0].eventType, 'SEP');
  assert.equal(notif[0].riskLevel, 'high');

  for (const ep of ['CMEAnalysis', 'SEP', 'IPS', 'MPC', 'RBE', 'HSS'] as const) {
    const res = normalizeDonkiApiResponse(ep, [{ eventTime: '2024-05-12T12:00Z', speed: 900 }]);
    assert.equal(res.length, 1);
    assert.equal(res[0].sourceBadge, 'LIVE');
  }
});
