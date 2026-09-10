import { describe, expect, it } from 'vitest';
import { computeCharges, legValues } from '../charges/index';

/**
 * Expected values below are computed by hand from the published rate sheets so
 * the test is an independent check, not a restatement of the implementation.
 */

describe('legValues', () => {
  it('puts the entry on the buy side for a long', () => {
    expect(legValues('long', 100, 115, 500)).toEqual({ buyValue: 50_000, sellValue: 57_500 });
  });

  it('puts the entry on the sell side for a short', () => {
    expect(legValues('short', 100, 90, 500)).toEqual({ buyValue: 45_000, sellValue: 50_000 });
  });
});

describe('equity intraday charges — Zerodha, NSE', () => {
  // Long, entry 100, quantity 500, exit at the 115 target.
  // buy 50,000 · sell 57,500 · turnover 107,500
  const result = computeCharges({
    brokerId: 'zerodha',
    segment: 'equity-intraday',
    exchange: 'NSE',
    buyValue: 50_000,
    sellValue: 57_500,
  });

  const line = (id: string) => result.lines.find((l) => l.id === id)!.amount;

  it('charges brokerage per leg, capped at ₹20 each', () => {
    // 50,000 × 0.03% = 15.00 · 57,500 × 0.03% = 17.25
    expect(line('brokerage')).toBe(32.25);
  });

  it('applies STT to the sell leg only', () => {
    // 57,500 × 0.025% = 14.375
    expect(line('stt')).toBe(14.38);
  });

  it('applies exchange transaction charges to total turnover', () => {
    // 107,500 × 0.0030701% = 3.3004
    expect(line('transaction')).toBe(3.3);
  });

  it('applies the SEBI turnover fee to total turnover', () => {
    // 107,500 × ₹10/crore = 0.1075
    expect(line('sebi')).toBe(0.11);
  });

  it('levies GST on brokerage, transaction and SEBI but not on STT', () => {
    // (32.25 + 3.30 + 0.11) × 18% = 6.4188
    expect(line('gst')).toBe(6.42);
  });

  it('applies stamp duty to the buy leg only', () => {
    // 50,000 × 0.003% = 1.50
    expect(line('stamp-duty')).toBe(1.5);
  });

  it('charges no DP fee on intraday', () => {
    expect(result.lines.some((l) => l.id === 'dp')).toBe(false);
  });

  it('totals the rounded lines exactly', () => {
    expect(
      line('brokerage') +
        line('stt') +
        line('transaction') +
        line('sebi') +
        line('gst') +
        line('stamp-duty'),
    ).toBeCloseTo(result.total, 10);
    expect(result.total).toBe(57.96);
  });
});

describe('equity delivery charges — Zerodha, NSE', () => {
  // Long, entry 100, quantity 100, exit at the 110 target.
  const result = computeCharges({
    brokerId: 'zerodha',
    segment: 'equity-delivery',
    exchange: 'NSE',
    buyValue: 10_000,
    sellValue: 11_000,
  });
  const line = (id: string) => result.lines.find((l) => l.id === id)!.amount;

  it('charges no brokerage', () => {
    expect(line('brokerage')).toBe(0);
  });

  it('applies STT to both legs at 0.1%', () => {
    // 10,000 × 0.1% + 11,000 × 0.1% = 21
    expect(line('stt')).toBe(21);
  });

  it('adds a DP charge on the sell', () => {
    expect(line('dp')).toBe(15.34);
  });

  it('excludes a GST-inclusive DP charge from the GST base', () => {
    // Zerodha quotes ₹15.34 inclusive of GST, so only (0.64 + 0.02) is taxed.
    expect(line('gst')).toBe(0.12);
  });

  it('uses the delivery stamp-duty rate', () => {
    // 10,000 × 0.015% = 1.50
    expect(line('stamp-duty')).toBe(1.5);
  });

  it('totals correctly', () => {
    expect(result.total).toBe(38.62);
  });
});

describe('leg awareness on a short', () => {
  // Intraday short: sell at the 100 entry, buy back at the 90 target.
  const result = computeCharges({
    brokerId: 'zerodha',
    segment: 'equity-intraday',
    exchange: 'NSE',
    ...legValues('short', 100, 90, 500),
  });
  const line = (id: string) => result.lines.find((l) => l.id === id)!.amount;

  it('taxes the entry, because on a short the entry is the sell leg', () => {
    // 50,000 × 0.025% = 12.50, not 45,000 × 0.025% = 11.25
    expect(line('stt')).toBe(12.5);
  });

  it('stamps the exit, because on a short the exit is the buy leg', () => {
    // 45,000 × 0.003% = 1.35, not 50,000 × 0.003% = 1.50
    expect(line('stamp-duty')).toBe(1.35);
  });
});

describe('broker-specific brokerage rules', () => {
  it('applies a flat per-order fee for Upstox delivery', () => {
    const result = computeCharges({
      brokerId: 'upstox',
      segment: 'equity-delivery',
      exchange: 'NSE',
      buyValue: 10_000,
      sellValue: 11_000,
    });
    // ₹20 per executed order × 2 legs
    expect(result.lines.find((l) => l.id === 'brokerage')!.amount).toBe(40);
  });

  it('adds GST on top of a GST-exclusive DP charge', () => {
    const result = computeCharges({
      brokerId: 'upstox',
      segment: 'equity-delivery',
      exchange: 'NSE',
      buyValue: 10_000,
      sellValue: 11_000,
    });
    const line = (id: string) => result.lines.find((l) => l.id === id)!.amount;
    // (40 brokerage + 0.64 transaction + 0.02 SEBI + 20 DP) × 18% = 10.9188
    expect(line('dp')).toBe(20);
    expect(line('gst')).toBe(10.92);
  });

  it('honours Angel One’s ₹5 minimum on small orders', () => {
    const result = computeCharges({
      brokerId: 'angel-one',
      segment: 'equity-intraday',
      exchange: 'NSE',
      buyValue: 1_000,
      sellValue: 1_000,
    });
    // 1,000 × 0.1% = ₹1, floored to the ₹5 minimum, on both legs.
    expect(result.lines.find((l) => l.id === 'brokerage')!.amount).toBe(10);
  });

  it('caps Angel One brokerage at ₹20 per order', () => {
    const result = computeCharges({
      brokerId: 'angel-one',
      segment: 'equity-intraday',
      exchange: 'NSE',
      buyValue: 100_000,
      sellValue: 100_000,
    });
    // 100,000 × 0.1% = ₹100, capped to ₹20, on both legs.
    expect(result.lines.find((l) => l.id === 'brokerage')!.amount).toBe(40);
  });

  it('charges nothing but statutory levies for the statutory-only preset', () => {
    const result = computeCharges({
      brokerId: 'statutory-only',
      segment: 'equity-delivery',
      exchange: 'NSE',
      buyValue: 10_000,
      sellValue: 11_000,
    });
    expect(result.lines.find((l) => l.id === 'brokerage')!.amount).toBe(0);
    expect(result.lines.some((l) => l.id === 'dp')).toBe(false);
  });

  it('uses BSE transaction rates when BSE is selected', () => {
    const bse = computeCharges({
      brokerId: 'statutory-only',
      segment: 'equity-intraday',
      exchange: 'BSE',
      buyValue: 100_000,
      sellValue: 100_000,
    });
    // 200,000 × 0.00375% = 7.50
    expect(bse.lines.find((l) => l.id === 'transaction')!.amount).toBe(7.5);
  });

  it('accepts custom broker overrides', () => {
    const result = computeCharges({
      brokerId: 'custom',
      segment: 'equity-delivery',
      exchange: 'NSE',
      buyValue: 10_000,
      sellValue: 11_000,
      custom: { percent: 0.5, cap: null, flat: null, dpCharge: 18 },
    });
    const line = (id: string) => result.lines.find((l) => l.id === id)!.amount;
    // 0.5% uncapped: 10,000 → ₹50 and 11,000 → ₹55
    expect(line('brokerage')).toBe(105);
    expect(line('dp')).toBe(18);
  });
});
