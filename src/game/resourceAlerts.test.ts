import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, getCoreMetersSummary } from './simulation';
import {
  detectCriticalResourceNotifications,
  getOxygenAndWaterStatuses,
  getResourcePulseClass,
} from './resourceAlerts';

test('getResourcePulseClass returns color-coded green, yellow, and red pulse classes', () => {
  assert.equal(getResourcePulseClass('green'), 'animate-resource-pulse-green');
  assert.equal(getResourcePulseClass('yellow'), 'animate-resource-pulse-yellow');
  assert.equal(getResourcePulseClass('red'), 'animate-resource-pulse-red');
});

test('getOxygenAndWaterStatuses distinguishes oxygen vs water depletion accurately', () => {
  const base = createInitialState('solar_storm', 'moon');
  const nominal = getOxygenAndWaterStatuses(base);
  assert.equal(nominal.oxygenStatus, 'green');
  assert.equal(nominal.waterStatus, 'green');

  const lowO2State = {
    ...base,
    resources: {
      ...base.resources,
      oxygenKg: 10,
      oxygenMaxKg: 100,
    },
  };
  const o2Check = getOxygenAndWaterStatuses(lowO2State);
  assert.equal(o2Check.oxygenStatus, 'red');
  assert.equal(o2Check.waterStatus, 'green');
  assert.equal(getCoreMetersSummary(lowO2State).life_support.status, 'red');

  const warnWaterState = {
    ...base,
    resources: {
      ...base.resources,
      waterLiters: 120,
      waterMaxLiters: 350,
    },
  };
  const waterCheck = getOxygenAndWaterStatuses(warnWaterState);
  assert.equal(waterCheck.waterStatus, 'yellow');
});

test('detectCriticalResourceNotifications triggers once on transition to red for Power, Life Support, and Food', () => {
  const base = createInitialState('solar_storm', 'moon');
  const prevGreen = {
    power: 'green' as const,
    life_support: 'yellow' as const,
    food: 'green' as const,
  };

  // Drop battery to critical, oxygen to critical, food to critical
  const criticalState = {
    ...base,
    resources: {
      ...base.resources,
      batteryStoredKwh: 10,
      batteryCapacityKwh: 120,
      oxygenKg: 5,
      oxygenMaxKg: 100,
      waterLiters: 20,
      waterMaxLiters: 350,
      foodRations: 8,
      freshCropsKg: 0,
    },
  };

  const meters = getCoreMetersSummary(criticalState);
  assert.equal(meters.power.status, 'red');
  assert.equal(meters.life_support.status, 'red');
  assert.equal(meters.food.status, 'red');

  const alerts = detectCriticalResourceNotifications(prevGreen, meters, criticalState);
  assert.equal(alerts.length, 3);
  assert.deepEqual(
    alerts.map((a) => a.id),
    ['power', 'life_support', 'food']
  );
  assert.ok(alerts[0].speechText.includes('Power'));
  assert.ok(alerts[1].speechText.includes('Oxygen'));
  assert.ok(alerts[2].speechText.includes('Food'));

  // Calling again while already red should NOT re-fire duplicate alerts
  const duplicateCheck = detectCriticalResourceNotifications(
    { power: 'red', life_support: 'red', food: 'red' },
    meters,
    criticalState
  );
  assert.equal(duplicateCheck.length, 0);
});
