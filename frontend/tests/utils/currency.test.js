import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../src/utils/currency';

describe('formatCurrency', () => {
  it('always returns a string ending with " RSD"', () => {
    expect(formatCurrency(0)).toMatch(/ RSD$/);
    expect(formatCurrency(100)).toMatch(/ RSD$/);
    expect(formatCurrency(-50)).toMatch(/ RSD$/);
  });

  it('formats zero as "0,00 RSD"', () => {
    expect(formatCurrency(0)).toBe('0,00 RSD');
  });

  it('formats a small positive integer with 2 decimal places', () => {
    expect(formatCurrency(5)).toBe('5,00 RSD');
  });

  it('formats a negative number', () => {
    expect(formatCurrency(-100)).toBe('-100,00 RSD');
  });

  it('treats non-numeric string as 0', () => {
    expect(formatCurrency('abc')).toBe('0,00 RSD');
  });

  it('treats null as 0', () => {
    expect(formatCurrency(null)).toBe('0,00 RSD');
  });

  it('treats undefined as 0', () => {
    expect(formatCurrency(undefined)).toBe('0,00 RSD');
  });

  it('parses a numeric string', () => {
    expect(formatCurrency('5')).toBe('5,00 RSD');
  });

  it('formats with 0 decimal places when decimals=0', () => {
    expect(formatCurrency(5, 0)).toBe('5 RSD');
  });

  it('applies thousands separator for large numbers', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('RSD');
    expect(result).toContain('500');
  });

  it('uses 2 decimal places by default', () => {
    const result = formatCurrency(7);
    expect(result).toMatch(/,\d{2} RSD$/);
  });
});
