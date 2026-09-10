import { describe, expect, it } from 'vitest';
import {
  computeForexCosts,
  computeForexNet,
  getPair,
  pipValueUsd,
  pipsFromPrice,
  priceFromPips,
  unitsFromLots,
  usdFromPriceDistance,
} from '../forex';

const EURUSD = getPair('EURUSD');
const USDJPY = getPair('USDJPY');

describe('lot conversion', () => {
  it('converts standard, mini and micro lots to units', () => {
    expect(unitsFromLots(1, 'standard')).toBe(100_000);
    expect(unitsFromLots(2.5, 'mini')).toBe(25_000);
    expect(unitsFromLots(3, 'micro')).toBe(3_000);
  });

  it('passes raw units through', () => {
    expect(unitsFromLots(7_500, 'units')).toBe(7_500);
  });

  it('rejects non-positive lot counts', () => {
    expect(unitsFromLots(0, 'standard')).toBeNull();
  });
});

describe('pip conversion', () => {
  it('converts a price distance to pips on a five-decimal pair', () => {
    expect(pipsFromPrice(0.005, EURUSD)).toBe(50);
  });

  it('uses the two-decimal pip on a JPY pair', () => {
    expect(pipsFromPrice(0.5, USDJPY)).toBe(50);
  });

  it('round-trips pips back to a price distance', () => {
    expect(priceFromPips(50, EURUSD)).toBeCloseTo(0.005, 10);
    expect(priceFromPips(50, USDJPY)).toBeCloseTo(0.5, 10);
  });
});

describe('pipValueUsd', () => {
  it('is $10 a pip on a standard lot of a USD-quoted pair', () => {
    expect(pipValueUsd(EURUSD, 100_000, 1.085)).toBe(10);
  });

  it('is $1 a pip on a micro lot', () => {
    expect(pipValueUsd(EURUSD, 1_000, 1.085)).toBeCloseTo(0.1, 10);
  });

  it('converts back through the rate on a USD-based pair', () => {
    // 0.01 × 100,000 = ¥1,000, divided by 151.40 = $6.6050
    expect(pipValueUsd(USDJPY, 100_000, 151.4)).toBe(6.61);
  });
});

describe('usdFromPriceDistance', () => {
  it('reads straight off the quote currency when it is USD', () => {
    // 50 pips on one standard lot of EUR/USD is $500
    expect(usdFromPriceDistance(0.005, 100_000, EURUSD, 1.09)).toBe(500);
  });

  it('converts at the exit rate when USD is the base currency', () => {
    // 0.5 × 100,000 = ¥50,000, divided by 151.90 = $329.16
    expect(usdFromPriceDistance(0.5, 100_000, USDJPY, 151.9)).toBe(329.16);
  });
});

describe('computeForexCosts', () => {
  it('prices the spread at the pip value', () => {
    const costs = computeForexCosts(EURUSD, 100_000, 1.085, { spreadPips: 1.2 });
    // 1.2 pips × $10 = $12
    expect(costs.total).toBe(12);
  });

  it('prices commission per standard lot', () => {
    const costs = computeForexCosts(EURUSD, 50_000, 1.085, { commissionPerLot: 7 });
    // Half a standard lot × $7 = $3.50
    expect(costs.total).toBe(3.5);
  });

  it('reports nothing when no costs are supplied', () => {
    const costs = computeForexCosts(EURUSD, 100_000, 1.085);
    expect(costs.lines).toEqual([]);
    expect(costs.total).toBe(0);
  });
});

describe('computeForexNet', () => {
  // Long EUR/USD, one standard lot: entry 1.0850, stop 1.0800, target 1.0950.
  const net = computeForexNet(
    { direction: 'long', entry: 1.085, stop: 1.08, target: 1.095, quantity: 100_000 },
    EURUSD,
    { spreadPips: 1, commissionPerLot: 6 },
  );

  it('reports gross risk and reward in USD', () => {
    // 50 pips risk = $500 · 100 pips reward = $1,000
    expect(net.gross.grossRisk).toBe(500);
    expect(net.gross.grossReward).toBe(1_000);
  });

  it('keeps the gross ratio at 1:2', () => {
    expect(net.gross.ratio).toBeCloseTo(2, 10);
  });

  it('subtracts spread and commission from the reward', () => {
    // $10 spread + $6 commission = $16
    expect(net.chargesAtTarget.total).toBe(16);
    expect(net.netReward).toBe(984);
  });

  it('adds costs to the risk', () => {
    expect(net.netRisk).toBe(516);
  });

  it('leaves the net ratio below the gross ratio', () => {
    expect(net.netRatio!).toBeCloseTo(984 / 516, 10);
    expect(net.netRatio!).toBeLessThan(2);
  });
});
