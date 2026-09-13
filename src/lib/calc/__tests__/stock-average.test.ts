import { describe, expect, it } from 'vitest';
import {
  averageAfterPlan,
  computeStockAverage,
  planToReachAverage,
  summarisePosition,
} from '../stock-average';

describe('computeStockAverage', () => {
  // 10 shares at ₹100 and 20 at ₹90.
  const result = computeStockAverage([
    { price: 100, quantity: 10 },
    { price: 90, quantity: 20 },
  ]);

  it('adds up the quantity and the money invested', () => {
    expect(result.totalQuantity).toBe(30);
    expect(result.totalInvested).toBe(2_800);
  });

  it('weights the average by quantity, not by lot count', () => {
    // 2,800 / 30 = 93.3333, not the unweighted 95.
    expect(result.averagePrice).toBe(93.3333);
  });

  it('counts the lots that contributed', () => {
    expect(result.lotsUsed).toBe(2);
  });

  it('ignores blank and invalid rows so partly filled forms still work', () => {
    const partial = computeStockAverage([
      { price: 100, quantity: 10 },
      { price: 0, quantity: 5 },
      { price: 50, quantity: -2 },
      { price: Number.NaN, quantity: 10 },
    ]);
    expect(partial.lotsUsed).toBe(1);
    expect(partial.totalQuantity).toBe(10);
    expect(partial.averagePrice).toBe(100);
  });

  it('has no average before anything is entered', () => {
    const empty = computeStockAverage([]);
    expect(empty.averagePrice).toBeNull();
    expect(empty.totalQuantity).toBe(0);
  });
});

describe('summarisePosition', () => {
  const result = computeStockAverage([
    { price: 100, quantity: 10 },
    { price: 90, quantity: 20 },
  ]);

  it('values the holding and the unrealised gain at the market price', () => {
    const summary = summarisePosition(result, 95);
    // 95 × 30 = 2,850 against 2,800 invested.
    expect(summary.marketValue).toBe(2_850);
    expect(summary.unrealised).toBe(50);
    expect(summary.unrealisedFraction).toBeCloseTo(50 / 2_800, 10);
  });

  it('reports a loss below the average', () => {
    const summary = summarisePosition(result, 85);
    expect(summary.unrealised).toBe(-250);
  });

  it('stays empty until a market price is entered', () => {
    const summary = summarisePosition(result, null);
    expect(summary.marketValue).toBeNull();
    expect(summary.unrealised).toBeNull();
  });
});

describe('planToReachAverage', () => {
  const result = computeStockAverage([
    { price: 100, quantity: 10 },
    { price: 90, quantity: 20 },
  ]);

  it('solves for the shares needed to reach a lower average', () => {
    // (2,800 − 90 × 30) / (90 − 80) = exactly 10 shares at ₹80.
    const plan = planToReachAverage(result, 80, 90);
    expect(plan.quantityNeeded).toBe(10);
    expect(plan.investmentNeeded).toBe(800);
    expect(plan.impossibleReason).toBeNull();
  });

  it('rounds up, because a fractional share cannot be bought', () => {
    const plan = planToReachAverage(result, 85, 91);
    // (2,800 − 91 × 30) / (91 − 85) = 11.67 shares, so 12 are needed.
    expect(plan.quantityNeeded).toBe(12);
    expect(plan.investmentNeeded).toBe(1_020);
  });

  it('explains why averaging down above the target cannot work', () => {
    const plan = planToReachAverage(result, 92, 90);
    expect(plan.quantityNeeded).toBeNull();
    expect(plan.impossibleReason).toContain('90');
  });

  it('explains why raising an average below the target cannot work', () => {
    const plan = planToReachAverage(result, 94, 95);
    expect(plan.quantityNeeded).toBeNull();
    expect(plan.impossibleReason).not.toBeNull();
  });

  it('solves upwards when the target is above the current average', () => {
    // (2,800 − 95 × 30) / (95 − 100) = exactly 10 shares at ₹100.
    const plan = planToReachAverage(result, 100, 95);
    expect(plan.quantityNeeded).toBe(10);
  });

  it('does not charge an extra share for rounding dust in the average', () => {
    // 93.3333… is not exactly representable; the answer here is a whole 10.
    expect(result.averagePrice).toBe(93.3333);
    expect(planToReachAverage(result, 80, 90).quantityNeeded).toBe(10);
  });

  it('says nothing to do when the average is already there', () => {
    const plan = planToReachAverage(result, 80, 93.3333);
    expect(plan.quantityNeeded).toBeNull();
    expect(plan.impossibleReason).toContain('already');
  });

  it('stays empty with no holding to average', () => {
    const plan = planToReachAverage(computeStockAverage([]), 80, 90);
    expect(plan.quantityNeeded).toBeNull();
    expect(plan.impossibleReason).toBeNull();
  });
});

describe('averageAfterPlan', () => {
  const result = computeStockAverage([
    { price: 100, quantity: 10 },
    { price: 90, quantity: 20 },
  ]);

  it('lands exactly on the target when the quantity divides evenly', () => {
    const plan = planToReachAverage(result, 80, 90);
    expect(averageAfterPlan(result, plan, 80)).toMatchObject({
      totalQuantity: 40,
      totalInvested: 3_600,
      averagePrice: 90,
    });
  });

  it('lands just under the target when the quantity was rounded up', () => {
    // 11.67 shares rounded to 12 buys slightly more than the target needs.
    const plan = planToReachAverage(result, 85, 91);
    const after = averageAfterPlan(result, plan, 85)!;
    expect(after.averagePrice).toBeLessThan(91);
    expect(after.averagePrice).toBeCloseTo(90.95, 2);
  });

  it('has nothing to report without a plan to follow', () => {
    const impossible = planToReachAverage(result, 92, 90);
    expect(averageAfterPlan(result, impossible, 92)).toBeNull();
  });
});
