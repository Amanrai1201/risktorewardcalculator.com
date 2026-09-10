import type { Exchange, SegmentId } from '../types';

/**
 * Statutory charge rates for Indian equity trading.
 *
 * This is the single place to edit when SEBI, the exchanges or the Finance Act
 * change a rate. Everything downstream reads from here.
 *
 * Verified 2026-09-10 against the published charge sheets of Zerodha
 * (zerodha.com/charges), Upstox (upstox.com/brokerage-charges) and Angel One
 * (angelone.in/pricing). All three agreed on every figure below.
 */
export const RATES_VERIFIED_ON = '2026-09-10';

/** Human-readable date for the UI. */
export const RATES_VERIFIED_LABEL = '10 September 2026';

/** All rates are fractions of turnover unless the name says otherwise. */
export const STATUTORY_RATES = {
  /** Securities Transaction Tax. */
  stt: {
    /** 0.1% on both the buy and the sell leg. */
    'equity-delivery': { buy: 0.001, sell: 0.001 },
    /** 0.025% on the sell leg only. */
    'equity-intraday': { buy: 0, sell: 0.00025 },
  } satisfies Record<SegmentId, { buy: number; sell: number }>,

  /** Exchange transaction charges, applied to both legs. */
  transaction: {
    NSE: 0.0000307, // 0.00307%
    BSE: 0.0000375, // 0.00375%, common equity groups
  } satisfies Record<Exchange, number>,

  /** SEBI turnover fee: Rs 10 per crore, both legs. */
  sebi: 0.000001,

  /** NSE Investor Protection Fund Trust levy: Rs 0.01 per crore, both legs. */
  ipft: {
    NSE: 0.000000001,
    BSE: 0,
  } satisfies Record<Exchange, number>,

  /** Stamp duty, buy leg only. */
  stampDuty: {
    'equity-delivery': 0.00015, // 0.015%, capped at Rs 1500 per crore
    'equity-intraday': 0.00003, // 0.003%, capped at Rs 300 per crore
  } satisfies Record<SegmentId, number>,

  /** GST on brokerage + transaction + SEBI + IPFT + DP charges. Never on STT or stamp duty. */
  gst: 0.18,
} as const;

/** Display metadata for the two Indian equity products. */
export const SEGMENTS: Record<
  SegmentId,
  { label: string; shortLabel: string; description: string }
> = {
  'equity-intraday': {
    label: 'Equity Intraday',
    shortLabel: 'Intraday',
    description: 'Bought and sold the same day. No delivery, so no DP charges.',
  },
  'equity-delivery': {
    label: 'Equity Delivery',
    shortLabel: 'Delivery',
    description: 'Shares held overnight in your demat account. STT applies to both legs.',
  },
};

export const EXCHANGES: Record<Exchange, { label: string }> = {
  NSE: { label: 'NSE' },
  BSE: { label: 'BSE' },
};
