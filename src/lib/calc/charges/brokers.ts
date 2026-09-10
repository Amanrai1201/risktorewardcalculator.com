import type { CustomBrokerOverrides, SegmentId } from '../types';

/**
 * How a broker charges for one executed order.
 *
 * `flat` wins when set. Otherwise brokerage is `value * percent`, capped at
 * `cap` and floored at `min`.
 */
export interface BrokerageRule {
  /** Fraction of turnover, e.g. 0.0003 for 0.03%. Zero means free. */
  percent: number;
  /** Maximum per executed order, or null for uncapped. */
  cap: number | null;
  /** Minimum per executed order. */
  min: number;
  /** Flat fee per executed order. When set, `percent`, `cap` and `min` are ignored. */
  flat: number | null;
}

export interface Broker {
  id: string;
  name: string;
  brokerage: Record<SegmentId, BrokerageRule>;
  /** DP charge per scrip on the sell leg of a delivery trade. */
  dpCharge: number;
  /** True when `dpCharge` is quoted GST-inclusive, so GST must not be added again. */
  dpChargeIncludesGst: boolean;
  /** Short summary shown beneath the broker selector. */
  summary: string;
  /** Published charge sheet the figures came from. */
  sourceUrl?: string;
  /** The one preset whose numbers the user supplies. */
  isCustom?: boolean;
}

const FREE: BrokerageRule = { percent: 0, cap: null, min: 0, flat: null };

/**
 * Broker registry. Adding a broker is a single entry here — no other file
 * changes. Rates verified 2026-09-10 from each broker's published charge sheet.
 */
export const BROKERS: Broker[] = [
  {
    id: 'zerodha',
    name: 'Zerodha',
    brokerage: {
      'equity-delivery': FREE,
      'equity-intraday': { percent: 0.0003, cap: 20, min: 0, flat: null },
    },
    dpCharge: 15.34,
    dpChargeIncludesGst: true,
    summary: 'Free delivery. Intraday at 0.03% or ₹20 per order, whichever is lower.',
    sourceUrl: 'https://zerodha.com/charges/',
  },
  {
    id: 'upstox',
    name: 'Upstox',
    brokerage: {
      'equity-delivery': { percent: 0, cap: null, min: 0, flat: 20 },
      'equity-intraday': { percent: 0.001, cap: 20, min: 0, flat: null },
    },
    dpCharge: 20,
    dpChargeIncludesGst: false,
    summary: '₹20 per order on delivery. Intraday at 0.1% or ₹20 per order, whichever is lower.',
    sourceUrl: 'https://upstox.com/brokerage-charges/',
  },
  {
    id: 'angel-one',
    name: 'Angel One',
    brokerage: {
      'equity-delivery': { percent: 0.001, cap: 20, min: 5, flat: null },
      'equity-intraday': { percent: 0.001, cap: 20, min: 5, flat: null },
    },
    dpCharge: 20,
    dpChargeIncludesGst: false,
    summary:
      '0.1% or ₹20 per order, whichever is lower, with a ₹5 minimum. Excludes introductory offers.',
    sourceUrl: 'https://www.angelone.in/pricing',
  },
  {
    id: 'statutory-only',
    name: 'Statutory charges only',
    brokerage: {
      'equity-delivery': FREE,
      'equity-intraday': FREE,
    },
    dpCharge: 0,
    dpChargeIncludesGst: true,
    summary:
      'No brokerage and no DP charge — shows the unavoidable taxes and exchange fees on their own.',
  },
  {
    id: 'custom',
    name: 'Other broker (enter your own)',
    brokerage: {
      'equity-delivery': { percent: 0.0003, cap: 20, min: 0, flat: null },
      'equity-intraday': { percent: 0.0003, cap: 20, min: 0, flat: null },
    },
    dpCharge: 0,
    dpChargeIncludesGst: false,
    summary: 'Enter your own brokerage rate, per-order cap and DP charge.',
    isCustom: true,
  },
];

export const DEFAULT_BROKER_ID = 'zerodha';

const BROKER_INDEX = new Map(BROKERS.map((broker) => [broker.id, broker]));

export function getBroker(id: string): Broker {
  return BROKER_INDEX.get(id) ?? BROKER_INDEX.get(DEFAULT_BROKER_ID)!;
}

/**
 * Resolve the brokerage rule for a segment, folding in user overrides when the
 * "Other broker" preset is selected.
 */
export function resolveBrokerageRule(
  broker: Broker,
  segment: SegmentId,
  custom?: CustomBrokerOverrides,
): BrokerageRule {
  const base = broker.brokerage[segment];
  if (!broker.isCustom || !custom) return base;

  return {
    // `percent` arrives from the UI as a percentage, not a fraction.
    percent: custom.percent != null ? custom.percent / 100 : base.percent,
    cap: custom.cap !== undefined ? custom.cap : base.cap,
    min: base.min,
    flat: custom.flat !== undefined ? custom.flat : base.flat,
  };
}

export function resolveDpCharge(broker: Broker, custom?: CustomBrokerOverrides): number {
  if (broker.isCustom && custom?.dpCharge != null) return custom.dpCharge;
  return broker.dpCharge;
}

/** Brokerage payable on one executed order of `value` turnover. */
export function computeBrokerage(rule: BrokerageRule, value: number): number {
  if (value <= 0) return 0;
  if (rule.flat != null) return rule.flat;
  if (rule.percent <= 0) return 0;

  const raw = value * rule.percent;
  const capped = rule.cap != null ? Math.min(raw, rule.cap) : raw;
  return Math.max(capped, rule.min);
}
