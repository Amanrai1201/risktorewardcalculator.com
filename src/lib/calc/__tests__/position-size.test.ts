import { describe, expect, it } from 'vitest';
import {
  capitalRequired,
  quantityForRisk,
  riskAmountFromCapital,
  riskAsFractionOfCapital,
  riskForQuantity,
} from '../position-size';

describe('quantityForRisk', () => {
  it('divides the risk budget by the risk per unit', () => {
    // ₹2,000 at risk, ₹5 a share = 400 shares.
    expect(quantityForRisk(2_000, 5)).toBe(400);
  });

  it('rounds down so the position never exceeds the budget', () => {
    // 2,000 / 7 = 285.71 shares; 286 would risk more than ₹2,000.
    expect(quantityForRisk(2_000, 7)).toBe(285);
  });

  it('allows fractional sizing for instruments that trade in fractions', () => {
    expect(quantityForRisk(2_000, 7, { whole: false })).toBe(285.71);
  });

  it('refuses to size a trade with no stop distance', () => {
    expect(quantityForRisk(2_000, 0)).toBeNull();
    expect(quantityForRisk(0, 5)).toBeNull();
  });
});

describe('riskAmountFromCapital', () => {
  it('turns a percentage of capital into money', () => {
    // 1% of ₹2,00,000 = ₹2,000.
    expect(riskAmountFromCapital(200_000, 1)).toBe(2_000);
  });

  it('handles fractional risk percentages', () => {
    expect(riskAmountFromCapital(200_000, 0.5)).toBe(1_000);
  });

  it('is empty until both fields are filled', () => {
    expect(riskAmountFromCapital(0, 1)).toBeNull();
    expect(riskAmountFromCapital(200_000, 0)).toBeNull();
  });
});

describe('riskForQuantity', () => {
  it('multiplies out the risk for a chosen quantity', () => {
    expect(riskForQuantity(400, 5)).toBe(2_000);
  });

  it('round-trips against quantityForRisk', () => {
    const quantity = quantityForRisk(2_000, 5)!;
    expect(riskForQuantity(quantity, 5)).toBe(2_000);
  });
});

describe('capitalRequired', () => {
  it('reports the cash the position needs at entry', () => {
    expect(capitalRequired(100, 400)).toBe(40_000);
  });
});

describe('riskAsFractionOfCapital', () => {
  it('expresses the risk as a share of the account', () => {
    expect(riskAsFractionOfCapital(2_000, 200_000)).toBeCloseTo(0.01, 10);
  });

  it('has no answer without capital', () => {
    expect(riskAsFractionOfCapital(2_000, 0)).toBeNull();
  });
});
