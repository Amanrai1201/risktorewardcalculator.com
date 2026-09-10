import { describe, expect, it } from 'vitest';
import { computeWinRate } from '../win-rate';

describe('computeWinRate', () => {
  // 100 trades, 40 winners at ₹300, 60 losers at ₹100.
  const result = computeWinRate({ wins: 40, losses: 60, averageWin: 300, averageLoss: 100 });

  it('counts the sample', () => {
    expect(result.totalTrades).toBe(100);
  });

  it('reports the win and loss rates as fractions of 1', () => {
    expect(result.winRate).toBeCloseTo(0.4, 10);
    expect(result.lossRate).toBeCloseTo(0.6, 10);
  });

  it('derives the realised reward-to-risk from the averages', () => {
    expect(result.rewardToRisk).toBeCloseTo(3, 10);
  });

  it('reports expectancy in money per trade', () => {
    // 0.4 × 300 − 0.6 × 100 = ₹60
    expect(result.expectancy).toBe(60);
  });

  it('reports expectancy in R multiples', () => {
    // 0.4 × 3 − 0.6 = +0.6R
    expect(result.expectancyInR).toBe(0.6);
  });

  it('reports the ratio needed to break even at this win rate', () => {
    // (1 − 0.4) / 0.4 = 1.5
    expect(result.breakEvenRatio).toBeCloseTo(1.5, 10);
  });

  it('reports the win rate needed to break even at this ratio', () => {
    // 1 / (1 + 3) = 25%
    expect(result.breakEvenWinRate).toBeCloseTo(0.25, 10);
  });

  it('totals the money the sample made', () => {
    // 40 × 300 − 60 × 100 = ₹6,000
    expect(result.netResult).toBe(6_000);
  });

  it('is losing money when the win rate sits below the break-even rate', () => {
    // 20% winners at 1:3 needs 25%, so expectancy must be negative.
    const losing = computeWinRate({ wins: 20, losses: 80, averageWin: 300, averageLoss: 100 });
    expect(losing.expectancyInR!).toBeLessThan(0);
    expect(losing.netResult).toBe(-2_000);
  });

  it('excludes break-even trades from the win rate but counts them in the total', () => {
    const withScratches = computeWinRate({ wins: 40, losses: 60, breakEven: 10 });
    expect(withScratches.totalTrades).toBe(110);
    // Still 40 of 100 decided trades.
    expect(withScratches.winRate).toBeCloseTo(0.4, 10);
    expect(withScratches.winRateOfAll).toBeCloseTo(40 / 110, 10);
  });

  it('omits money figures when the averages are not supplied', () => {
    const rateOnly = computeWinRate({ wins: 40, losses: 60 });
    expect(rateOnly.winRate).toBeCloseTo(0.4, 10);
    expect(rateOnly.rewardToRisk).toBeNull();
    expect(rateOnly.expectancy).toBeNull();
    expect(rateOnly.netResult).toBeNull();
  });

  it('returns null rather than NaN on an empty sample', () => {
    const empty = computeWinRate({ wins: 0, losses: 0 });
    expect(empty.totalTrades).toBe(0);
    expect(empty.winRate).toBeNull();
    expect(empty.breakEvenRatio).toBeNull();
  });

  it('has no break-even ratio when every trade wins', () => {
    // Nothing to make up for, so the question is meaningless rather than zero.
    const perfect = computeWinRate({ wins: 10, losses: 0 });
    expect(perfect.winRate).toBe(1);
    expect(perfect.breakEvenRatio).toBeNull();
  });
});
