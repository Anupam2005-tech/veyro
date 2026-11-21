interface ConfirmedBalance {
  readonly confirmedUnpaidAmount: number;
  readonly isUnderActiveDispute: boolean;
}

export function hasBookingBlockingBalance(balances: readonly ConfirmedBalance[]): boolean {
  return balances.some(({ confirmedUnpaidAmount, isUnderActiveDispute }) => {
    if (!Number.isFinite(confirmedUnpaidAmount) || confirmedUnpaidAmount < 0 ||
        typeof isUnderActiveDispute !== 'boolean') {
      throw new RangeError('Invalid confirmed balance facts');
    }
    return confirmedUnpaidAmount > 0 && !isUnderActiveDispute;
  });
}
