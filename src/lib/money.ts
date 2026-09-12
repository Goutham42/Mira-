/**
 * Money helpers.
 *
 * Every amount in this system is an integer in the currency's minor unit
 * (paise, cents). Floats are never used for money — not in the database, not
 * in transit, not in calculations. Formatting to a decimal string happens only
 * at the display boundary.
 */

export type Money = { amount: number; currency: string };

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'CLP']);

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
}

/** "1299.50" or 1299.5 -> 129950 minor units. Throws on unparseable input. */
export function toMinorUnits(major: string | number, currency: string): number {
  const value = typeof major === 'string' ? Number(major.replace(/,/g, '')) : major;
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot convert "${major}" to minor units`);
  }
  return Math.round(value * minorUnitFactor(currency));
}

export function toMajorUnits(minor: number, currency: string): number {
  return minor / minorUnitFactor(currency);
}

export function formatMoney(
  minor: number,
  currency: string,
  locale = 'en-IN',
  options: Intl.NumberFormatOptions = {},
): string {
  const fractionDigits = minorUnitFactor(currency) === 1 ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    ...options,
  }).format(toMajorUnits(minor, currency));
}

/**
 * Apply a percentage expressed in basis points (500 = 5.00%).
 * Rounds half-up on the minor unit, which is what tax authorities expect.
 */
export function applyBasisPoints(minor: number, bps: number): number {
  return Math.round((minor * bps) / 10_000);
}

/** Percentage discount, floored so we never over-discount by a rounding unit. */
export function percentOf(minor: number, percent: number): number {
  return Math.floor((minor * percent) / 100);
}

export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function calculateDiscountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
