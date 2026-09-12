import { describe, expect, it } from 'vitest';

import {
  applyBasisPoints,
  calculateDiscountPercent,
  formatMoney,
  minorUnitFactor,
  percentOf,
  toMajorUnits,
  toMinorUnits,
} from '@/lib/money';

/**
 * Money is the part of an e-commerce system where a rounding mistake becomes a
 * refund. These tests pin the conversion and rounding rules.
 */
describe('minor unit conversion', () => {
  it('converts decimal strings without floating point drift', () => {
    expect(toMinorUnits('2499.50', 'INR')).toBe(249_950);
    expect(toMinorUnits('0.10', 'INR')).toBe(10);
    // 19.99 * 100 is 1998.9999... in IEEE 754; rounding must save us.
    expect(toMinorUnits(19.99, 'USD')).toBe(1_999);
    expect(toMinorUnits('1,299', 'INR')).toBe(129_900);
  });

  it('respects zero-decimal currencies', () => {
    expect(minorUnitFactor('JPY')).toBe(1);
    expect(toMinorUnits('1200', 'JPY')).toBe(1_200);
    expect(toMajorUnits(1_200, 'JPY')).toBe(1_200);
  });

  it('rejects values that are not numbers', () => {
    expect(() => toMinorUnits('abc', 'INR')).toThrow();
  });
});

describe('percentages', () => {
  it('floors percentage discounts so we never over-discount', () => {
    // 10% of 1999 is 199.9 minor units.
    expect(percentOf(1_999, 10)).toBe(199);
  });

  it('rounds basis-point tax half-up', () => {
    // 5% of 1990 is 99.5 → 100.
    expect(applyBasisPoints(1_990, 500)).toBe(100);
    expect(applyBasisPoints(100_000, 500)).toBe(5_000);
    expect(applyBasisPoints(100_000, 0)).toBe(0);
  });
});

describe('compare-at pricing', () => {
  it('reports a discount only when the compare-at price is genuinely higher', () => {
    expect(calculateDiscountPercent(4_499, 5_999)).toBe(25);
    expect(calculateDiscountPercent(4_499, 4_499)).toBeNull();
    expect(calculateDiscountPercent(4_499, 3_000)).toBeNull();
    expect(calculateDiscountPercent(4_499, null)).toBeNull();
  });
});

describe('formatting', () => {
  it('renders minor units as a currency string', () => {
    // Non-breaking spaces vary by ICU build, so assert on the parts.
    const formatted = formatMoney(249_950, 'INR', 'en-IN');
    expect(formatted).toContain('2,499.50');
    expect(formatted).toContain('₹');
  });
});
