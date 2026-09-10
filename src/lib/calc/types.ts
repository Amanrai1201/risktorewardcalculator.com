/**
 * Shared vocabulary for every calculator.
 *
 * Nothing in `src/lib/calc` touches the DOM or Astro. The engine is pure so it
 * can be unit-tested and reused by any future UI.
 */

export type Direction = 'long' | 'short';

/** A tradeable market. Adding one means adding an id here plus a registry entry. */
export type MarketId = 'equity-india' | 'forex';

export type Exchange = 'NSE' | 'BSE';

/** Indian equity product types. */
export type SegmentId = 'equity-intraday' | 'equity-delivery';

export type CurrencyCode = 'INR' | 'USD';

/** Which side of the market a leg of the round trip sits on. */
export type Side = 'buy' | 'sell';

/**
 * A trade expressed in raw units, independent of market.
 * `quantity` is shares for equity and base-currency units for forex.
 */
export interface TradeSetup {
  direction: Direction;
  entry: number;
  stop: number;
  target: number;
  quantity: number;
}

/** Gross (pre-charge) outcome of a trade setup. */
export interface GrossResult {
  direction: Direction;
  entry: number;
  stop: number;
  target: number;
  quantity: number;
  /** Absolute price distance from entry to stop. */
  riskPerUnit: number;
  /** Absolute price distance from entry to target. */
  rewardPerUnit: number;
  /** Money at risk if the stop is hit, before charges. Always positive. */
  grossRisk: number;
  /** Money made if the target is hit, before charges. Always positive. */
  grossReward: number;
  /** Reward divided by risk, i.e. the `n` in `1 : n`. Null when risk is zero. */
  ratio: number | null;
  /** Fraction of trades that must win to break even at this ratio. 0–1. */
  breakEvenWinRate: number | null;
  /** Turnover of the entry leg. */
  entryValue: number;
  /** Turnover of the exit leg if the stop is hit. */
  stopValue: number;
  /** Turnover of the exit leg if the target is hit. */
  targetValue: number;
}

/** A validation finding tied to a specific input. */
export interface FieldIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/** One itemised cost in the charge breakdown. */
export interface ChargeLine {
  id: string;
  label: string;
  amount: number;
  /** Shown as small print beneath the label. */
  note?: string;
}

export interface ChargeResult {
  lines: ChargeLine[];
  total: number;
}

/** Everything the charge engine needs about one round trip. */
export interface ChargeContext {
  brokerId: string;
  segment: SegmentId;
  exchange: Exchange;
  /** Turnover of the buy leg (entry for a long, exit for a short). */
  buyValue: number;
  /** Turnover of the sell leg (exit for a long, entry for a short). */
  sellValue: number;
  /** Distinct scrips held overnight, for delivery DP charges. */
  scrips?: number;
  /** Overrides for the "Custom broker" preset. */
  custom?: CustomBrokerOverrides;
}

export interface CustomBrokerOverrides {
  /** Brokerage as a percent of turnover, e.g. 0.03 for 0.03%. */
  percent?: number;
  /** Maximum brokerage per executed order. */
  cap?: number | null;
  /** Flat brokerage per executed order; when set, `percent` is ignored. */
  flat?: number | null;
  /** DP charge per scrip on a delivery sell. */
  dpCharge?: number;
}

/** Net (post-charge) outcome, the headline of the primary calculator. */
export interface NetResult {
  gross: GrossResult;
  chargesAtTarget: ChargeResult;
  chargesAtStop: ChargeResult;
  /** Gross reward less the charges incurred on the winning round trip. */
  netReward: number;
  /** Gross risk plus the charges incurred on the losing round trip. */
  netRisk: number;
  netRatio: number | null;
  netBreakEvenWinRate: number | null;
  /** True when estimated charges swallow the entire target profit. */
  chargesExceedReward: boolean;
}
