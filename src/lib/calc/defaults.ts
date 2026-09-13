import type { CurrencyCode, Direction, Exchange, MarketId, SegmentId } from './types';
import { getPair, type LotType } from './forex';
import type { PurchaseLot } from './stock-average';

/**
 * Starting values for every calculator.
 *
 * Each form ships filled in with a worked example rather than empty. The page
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

export interface WinRateState {
  currency: CurrencyCode;
  wins: number;
  losses: number;
  breakEven: number;
  averageWin: number;
  averageLoss: number;
}

/**
 * A sample that makes the calculator's point on sight: 40 winners in 100 looks
 * like a failing strategy until the ₹300 average win against the ₹100 average
 * loss puts expectancy at +₹60 a trade.
 */
export const WIN_RATE_DEFAULTS: WinRateState = {
  currency: 'INR',
  wins: 40,
  losses: 60,
  breakEven: 0,
  averageWin: 300,
  averageLoss: 100,
};

export interface StockAverageState {
  currency: CurrencyCode;
  lots: PurchaseLot[];
  currentPrice: number;
  buyAtPrice: number;
  targetAverage: number;
}

/**
 * Two unequal buys, so the average lands at ₹132 rather than the ₹135 midpoint
 * — the weighting is the thing people come here to check.
 */
export const STOCK_AVERAGE_DEFAULTS: StockAverageState = {
  currency: 'INR',
  lots: [
    { price: 150, quantity: 200 },
    { price: 120, quantity: 300 },
  ],
  currentPrice: 126,
  buyAtPrice: 110,
  targetAverage: 126,
};
