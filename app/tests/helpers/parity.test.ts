import { describe, expect, it } from 'vitest';
import { missingNumbers, numberTokens } from './parity';

describe('parity helper', () => {
  it('parses euro, percent and decimal figures; skips ids and small integers', () => {
    expect(numberTokens('Y3 €1 704K and €1,204,000 · 75% · 13.0 FTE · A017 · step 2 · v18.9')).toEqual([1704000, 1204000, 75, 13]);
  });
  it('matches within display rounding and reports what is missing', () => {
    expect(missingNumbers('Savings €892K, ROI 713%, 6.8 FTE', '€891,555 · 713 % · 6.8')).toEqual([]);
    expect(missingNumbers('Savings €892K, payback 12 months', '€891,555')).toEqual([12]);
    expect(missingNumbers('x 40', 'y', [40])).toEqual([]);
  });
});
