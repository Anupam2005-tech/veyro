const assert = require('node:assert/strict');
const { test } = require('node:test');
const { estimateHourlyBaseFare, calculateFinalHourlyBaseFare } = require('../dist/modules/quotes/hourly-fare.js');

const rate = Object.freeze({ pricing_mode: 'HOURLY', hourlyRateInr: 300 });
const start = new Date('2026-11-21T07:00:00Z');

test('estimates actual route minutes and rounds only the display fare', () => {
  assert.deepEqual(estimateHourlyBaseFare(rate, 1.5), { baseFareInr: 7.5, displayBaseFareInr: 8 });
  assert.deepEqual(estimateHourlyBaseFare(rate, 60), { baseFareInr: 300, displayBaseFareInr: 300 });
});

test('uses frozen hourly rate and elapsed OTP time without billing blocks', () => {
  const end = new Date(start.getTime() + 90_000);
  assert.deepEqual(calculateFinalHourlyBaseFare(rate, start, end), { baseFareInr: 7.5, displayBaseFareInr: 8 });
});

test('rounds an exact half-rupee up for estimates and elapsed trip time', () => {
  const midpointRate = { ...rate, hourlyRateInr: 15 };
  const minutes = 246;
  const end = new Date(start.getTime() + minutes * 60_000);
  const expected = { baseFareInr: 61.5, displayBaseFareInr: 62 };
  assert.deepEqual(estimateHourlyBaseFare(midpointRate, minutes), expected);
  assert.deepEqual(calculateFinalHourlyBaseFare(midpointRate, start, end), expected);
});

test('allows zero rate or duration without a minimum fare', () => {
  const zeroFare = { baseFareInr: 0, displayBaseFareInr: 0 };
  assert.deepEqual(estimateHourlyBaseFare(rate, 0), zeroFare);
  assert.deepEqual(calculateFinalHourlyBaseFare(rate, start, start), zeroFare);
  assert.deepEqual(estimateHourlyBaseFare({ ...rate, hourlyRateInr: 0 }, 15), zeroFare);
});

test('rejects PER_KM, invalid inputs and amounts outside the safe range', () => {
  assert.throws(() => estimateHourlyBaseFare({ ...rate, pricing_mode: 'PER_KM' }, 10), /Only HOURLY/);
  for (const invalid of [-1, Infinity, NaN]) {
    assert.throws(() => estimateHourlyBaseFare(rate, invalid), /Estimated route minutes/);
    assert.throws(() => estimateHourlyBaseFare({ ...rate, hourlyRateInr: invalid }, 10), /Hourly rate/);
  }
  assert.throws(() => calculateFinalHourlyBaseFare(rate, new Date(NaN), start), /Verified trip timestamps/);
  assert.throws(() => calculateFinalHourlyBaseFare(rate, new Date(start.getTime() + 1), start), /Verified trip timestamps/);
  assert.throws(() => estimateHourlyBaseFare({ ...rate, hourlyRateInr: Number.MAX_SAFE_INTEGER }, 120), /safe numeric range/);
});
