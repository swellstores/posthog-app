import { describe, expect, it } from 'vitest';
import { currencyDigits, toMinorUnits } from '../../functions/lib/money';

describe('currencyDigits', () => {
  it('uses the ISO 4217 minor unit of the currency', () => {
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('JPY')).toBe(0);
    expect(currencyDigits('KWD')).toBe(3);
  });

  it('falls back to 2 digits for a missing or malformed currency', () => {
    expect(currencyDigits(undefined)).toBe(2);
    expect(currencyDigits(null)).toBe(2);
    expect(currencyDigits('')).toBe(2);
    expect(currencyDigits('dollars')).toBe(2);
  });
});

describe('toMinorUnits', () => {
  it('converts major units to minor units', () => {
    expect(toMinorUnits(19.99, 'USD')).toBe(1999);
    expect(toMinorUnits(500, 'JPY')).toBe(500);
    expect(toMinorUnits(1.234, 'KWD')).toBe(1234);
  });

  it('rounds away floating point noise', () => {
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30);
  });

  it('treats a missing amount as zero', () => {
    expect(toMinorUnits(undefined, 'USD')).toBe(0);
    expect(toMinorUnits(null, 'USD')).toBe(0);
  });

  it('uses 2 digits when the currency is missing, never NaN', () => {
    expect(toMinorUnits(12, undefined)).toBe(1200);
    expect(toMinorUnits(12, 'dollars')).toBe(1200);
  });
});
