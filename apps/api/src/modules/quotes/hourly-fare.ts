interface FareRateSnapshot {
  readonly pricing_mode: 'HOURLY' | 'PER_KM';
  readonly hourlyRateInr: number;
}

interface BaseFare {
  baseFareInr: number;
  displayBaseFareInr: number;
}

function calculateBaseFare(rate: FareRateSnapshot, elapsed: number, unitsPerHour: number): BaseFare {
  if (rate.pricing_mode !== 'HOURLY') {
    throw new RangeError('Only HOURLY pricing is active in Release 1');
  }
  if (!Number.isFinite(rate.hourlyRateInr) || rate.hourlyRateInr < 0 || rate.hourlyRateInr > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Hourly rate must be a finite non-negative INR amount within the safe numeric range');
  }

  const baseFareInr = (rate.hourlyRateInr * elapsed) / unitsPerHour;
  if (!Number.isFinite(baseFareInr) || baseFareInr > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Base fare exceeds the safe numeric range');
  }

  return { baseFareInr, displayBaseFareInr: Math.round(baseFareInr) };
}

export function estimateHourlyBaseFare(rate: FareRateSnapshot, estimatedRouteMinutes: number): BaseFare {
  if (!Number.isFinite(estimatedRouteMinutes) || estimatedRouteMinutes < 0) {
    throw new RangeError('Estimated route minutes must be finite and non-negative');
  }

  return calculateBaseFare(rate, estimatedRouteMinutes, 60);
}

export function calculateFinalHourlyBaseFare(rate: FareRateSnapshot, startedAt: Date, endedAt: Date): BaseFare {
  const elapsedMs = endedAt.getTime() - startedAt.getTime();
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) {
    throw new RangeError('Verified trip timestamps must describe a valid non-negative duration');
  }

  return calculateBaseFare(rate, elapsedMs, 3_600_000);
}
