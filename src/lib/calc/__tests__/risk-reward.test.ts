import { describe, expect, it } from 'vitest';
import {
  computeGross,
  computeNet,
  expectancyInR,
  isComplete,
  requiredWinRate,
  validateTradeSetup,
} from '../risk-reward';

describe('computeGross', () => {
  const long = computeGross({
    direction: 'long',
    entry: 100,
    stop: 95,
    target: 115,
    quantity: 500,
  });

  it('measures risk and reward per unit', () => {
    expect(long.riskPerUnit).toBe(5);
    expect(long.rewardPerUnit).toBe(15);
  });

  it('scales risk and reward by quantity', () => {
    expect(long.grossRisk).toBe(2_500);
    expect(long.grossReward).toBe(7_500);
  });

  it('reports the ratio as reward over risk', () => {
    expect(long.ratio).toBe(3);
  });

  it('derives the break-even win rate from the ratio', () => {
    // 2,500 / (2,500 + 7,500) = 25%
    expect(long.breakEvenWinRate).toBeCloseTo(0.25, 10);
  });

  it('handles a short symmetrically', () => {
    const short = computeGross({
      direction: 'short',
      entry: 100,
      stop: 105,
      target: 85,
      quantity: 500,
    });
    expect(short.riskPerUnit).toBe(5);
    expect(short.rewardPerUnit).toBe(15);
    expect(short.grossRisk).toBe(2_500);
    expect(short.grossReward).toBe(7_500);
    expect(short.ratio).toBe(3);
  });

  it('returns null rather than Infinity when the stop equals the entry', () => {
    const flat = computeGross({
      direction: 'long',
      entry: 100,
      stop: 100,
      target: 110,
      quantity: 10,
    });
    expect(flat.ratio).toBeNull();
  });
});

describe('computeNet', () => {
  // Zerodha, NSE intraday long: entry 100, stop 95, target 115, 500 shares.
  const net = computeNet(
    { direction: 'long', entry: 100, stop: 95, target: 115, quantity: 500 },
    { brokerId: 'zerodha', segment: 'equity-intraday', exchange: 'NSE' },
  );

  it('prices the winning and losing exits separately', () => {
    // Turnover differs, so the two charge totals must differ.
    expect(net.chargesAtTarget.total).toBe(57.96);
    expect(net.chargesAtStop.total).toBe(51.54);
  });

  it('subtracts charges from the reward', () => {
    expect(net.netReward).toBe(7_500 - 57.96);
  });

  it('adds charges to the risk, deepening the loss', () => {
    expect(net.netRisk).toBe(2_500 + 51.54);
  });

  it('reports a net ratio worse than the gross ratio', () => {
    expect(net.gross.ratio).toBe(3);
    expect(net.netRatio!).toBeCloseTo(7_442.04 / 2_551.54, 10);
    expect(net.netRatio!).toBeLessThan(net.gross.ratio!);
  });

  it('raises the break-even win rate once charges are counted', () => {
    expect(net.netBreakEvenWinRate!).toBeGreaterThan(net.gross.breakEvenWinRate!);
    expect(net.netBreakEvenWinRate!).toBeCloseTo(2_551.54 / (2_551.54 + 7_442.04), 10);
  });

  it('flags a setup whose profit cannot cover its charges', () => {
    // A one-share scalp for two paise cannot pay for its own DP charge.
    const doomed = computeNet(
      { direction: 'long', entry: 100, stop: 99.98, target: 100.02, quantity: 1 },
      { brokerId: 'upstox', segment: 'equity-delivery', exchange: 'NSE' },
    );
    expect(doomed.chargesExceedReward).toBe(true);
    expect(doomed.netReward).toBeLessThan(0);
    expect(doomed.netRatio).toBeNull();
  });
});

describe('requiredWinRate', () => {
  it('needs half your trades at 1:1', () => {
    expect(requiredWinRate(1)).toBeCloseTo(0.5, 10);
  });

  it('needs a third of your trades at 1:2', () => {
    expect(requiredWinRate(2)).toBeCloseTo(1 / 3, 10);
  });

  it('needs a quarter of your trades at 1:3', () => {
    expect(requiredWinRate(3)).toBeCloseTo(0.25, 10);
  });
});

describe('expectancyInR', () => {
  it('is zero at the break-even win rate', () => {
    expect(expectancyInR(2, 1 / 3)).toBeCloseTo(0, 10);
  });

  it('is positive above it', () => {
    // 0.5 × 2 − 0.5 = +0.5R per trade
    expect(expectancyInR(2, 0.5)).toBeCloseTo(0.5, 10);
  });

  it('is negative below it', () => {
    expect(expectancyInR(2, 0.2)).toBeCloseTo(-0.4, 10);
  });
});

describe('validateTradeSetup', () => {
  const base = { entry: 100, stop: 95, target: 115, quantity: 10 };

  it('accepts a well-formed long', () => {
    expect(validateTradeSetup({ direction: 'long', ...base })).toEqual([]);
  });

  it('rejects a long whose stop is above the entry', () => {
    const issues = validateTradeSetup({ direction: 'long', ...base, stop: 105 });
    expect(issues.map((i) => i.field)).toContain('stop');
  });

  it('rejects a long whose target is below the entry', () => {
    const issues = validateTradeSetup({ direction: 'long', ...base, target: 90 });
    expect(issues.map((i) => i.field)).toContain('target');
  });

  it('accepts a well-formed short', () => {
    expect(
      validateTradeSetup({ direction: 'short', entry: 100, stop: 105, target: 85, quantity: 10 }),
    ).toEqual([]);
  });

  it('rejects a short whose stop is below the entry', () => {
    const issues = validateTradeSetup({ direction: 'short', ...base, stop: 95, target: 85 });
    expect(issues.map((i) => i.field)).toContain('stop');
  });

  it('rejects shorting a delivery trade', () => {
    const issues = validateTradeSetup({
      direction: 'short',
      entry: 100,
      stop: 105,
      target: 85,
      quantity: 10,
      segment: 'equity-delivery',
    });
    expect(issues.map((i) => i.field)).toContain('segment');
  });

  it('stays silent on empty fields so it does not nag mid-typing', () => {
    expect(
      validateTradeSetup({
        direction: 'long',
        entry: null,
        stop: null,
        target: null,
        quantity: null,
      }),
    ).toEqual([]);
  });

  it('rejects zero and negative values', () => {
    const issues = validateTradeSetup({
      direction: 'long',
      entry: 0,
      stop: -5,
      target: 0,
      quantity: 0,
    });
    expect(issues.map((i) => i.field).sort()).toEqual(['entry', 'quantity', 'stop', 'target']);
  });
});

describe('isComplete', () => {
  it('is false while a field is missing', () => {
    expect(
      isComplete({ direction: 'long', entry: 100, stop: 95, target: null, quantity: 10 }),
    ).toBe(false);
  });

  it('is true once every field holds a positive number', () => {
    expect(isComplete({ direction: 'long', entry: 100, stop: 95, target: 115, quantity: 10 })).toBe(
      true,
    );
  });
});
