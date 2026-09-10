import type { Direction, Exchange, MarketId, SegmentId } from './types';
import { getPair, type LotType } from './forex';

/**
 * Starting values for the risk-to-reward calculator.
 *
 * The form ships filled in with a worked example rather than empty. The page
 * then renders a complete, correct result server-side — it is useful before any
 * JavaScript runs, and a visitor can see what the tool does before typing.
 */
export interface RiskRewardState {
  market: MarketId;
  direction: Direction;
  segment: SegmentId;
  exchange: Exchange;
  brokerId: string;
  entry: number;
  stop: number;
  target: number;
  quantity: number;
  /** Forex */
  pairId: string;
  lotType: LotType;
  lots: number;
  spreadPips: number;
  commissionPerLot: number;
  /** Position-size helper */
  capital: number;
  riskPercent: number;
  /** Optional inputs */
  winRatePercent: number;
  customPercent: number;
  customCap: number;
  customDp: number;
}

export const RR_DEFAULTS: RiskRewardState = {
  market: 'equity-india',
  direction: 'long',
  segment: 'equity-intraday',
  exchange: 'NSE',
  brokerId: 'zerodha',
  entry: 100,
  stop: 95,
  target: 115,
  quantity: 500,
  pairId: 'EURUSD',
  lotType: 'standard',
  lots: 1,
  spreadPips: 1,
  commissionPerLot: 0,
  capital: 200000,
  riskPercent: 1,
  winRatePercent: 40,
  customPercent: 0.03,
  customCap: 20,
  customDp: 0,
};

/**
 * Sensible prices for a forex pair: a 50-pip stop and a 100-pip target either
 * side of a realistic quote.
 */
export function forexPrices(
  pairId: string,
  direction: Direction,
): { entry: number; stop: number; target: number } {
  const pair = getPair(pairId);
  const decimals = pair.priceDecimals;
  const round = (value: number) => Number(value.toFixed(decimals));
  const entry = pair.samplePrice;
  const stopDistance = 50 * pair.pipSize;
  const targetDistance = 100 * pair.pipSize;

  return direction === 'long'
    ? { entry, stop: round(entry - stopDistance), target: round(entry + targetDistance) }
    : { entry, stop: round(entry + stopDistance), target: round(entry - targetDistance) };
}

/** Equity prices for the worked example, flipped for a short. */
export function equityPrices(direction: Direction): {
  entry: number;
  stop: number;
  target: number;
} {
  return direction === 'long'
    ? { entry: 100, stop: 95, target: 115 }
    : { entry: 100, stop: 105, target: 85 };
}
