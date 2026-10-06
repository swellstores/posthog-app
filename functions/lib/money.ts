const DEFAULT_DIGITS = 2;

/** Number of minor-unit digits of an ISO 4217 currency (USD 2, JPY 0, KWD 3). */
export function currencyDigits(currency: string | null | undefined): number {
  if (!currency) {
    return DEFAULT_DIGITS;
  }
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? DEFAULT_DIGITS
    );
  } catch {
    return DEFAULT_DIGITS;
  }
}

/** Swell amounts are in major units; PostHog revenue analytics expects minor units. */
export function toMinorUnits(
  amount: number | null | undefined,
  currency: string | null | undefined,
): number {
  return Math.round((amount ?? 0) * 10 ** currencyDigits(currency));
}
