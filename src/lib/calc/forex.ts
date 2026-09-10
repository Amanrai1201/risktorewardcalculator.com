import type { ChargeLine, ChargeResult, NetResult, TradeSetup } from './types';
import { isUsableNumber, round2, roundTo, safeDiv } from './num';
import { computeGross } from './risk-reward';

/**
 * Forex support.
 *
 * Results are reported in USD. Only pairs where one side is USD are offered,
 * because those convert to USD without a second exchange rate. Crosses such as
 * EUR/GBP would need an extra rate input, and the pair registry below is
 * structured so adding them later is a data change, not a rewrite.
 */

export interface ForexPair {
  id: string;
  label: string;
  base: string;
  quote: string;
  /** Price movement of one pip. */
  pipSize: number;
  /** Decimal places a quote is normally shown to. */
  priceDecimals: number;
  /** A realistic price, used only to prefill the form. */
  samplePrice: number;
}

export const FOREX_PAIRS: ForexPair[] = [
  {
    id: 'EURUSD',
    label: 'EUR/USD',
    base: 'EUR',
    quote: 'USD',
    pipSize: 0.0001,
    priceDecimals: 5,
    samplePrice: 1.085,
  },
  {
    id: 'GBPUSD',
    label: 'GBP/USD',
    base: 'GBP',
    quote: 'USD',
    pipSize: 0.0001,
    priceDecimals: 5,
    samplePrice: 1.268,
  },
  {
    id: 'AUDUSD',
    label: 'AUD/USD',
    base: 'AUD',
    quote: 'USD',
    pipSize: 0.0001,
    priceDecimals: 5,
    samplePrice: 0.658,
  },
  {
    id: 'NZDUSD',
    label: 'NZD/USD',
    base: 'NZD',
    quote: 'USD',
    pipSize: 0.0001,
    priceDecimals: 5,
    samplePrice: 0.602,
  },
  {
    id: 'USDJPY',
    label: 'USD/JPY',
    base: 'USD',
    quote: 'JPY',
    pipSize: 0.01,
    priceDecimals: 3,
    samplePrice: 151.4,
  },
  {
    id: 'USDCHF',
    label: 'USD/CHF',
    base: 'USD',
    quote: 'CHF',
    pipSize: 0.0001,
    priceDecimals: 5,
    samplePrice: 0.884,
  },
  {
    id: 'USDCAD',
    label: 'USD/CAD',
    base: 'USD',
    quote: 'CAD',
    pipSize: 0.0001,
    priceDecimals: 5,
    samplePrice: 1.362,
  },
];

export const DEFAULT_PAIR_ID = 'EURUSD';

const PAIR_INDEX = new Map(FOREX_PAIRS.map((pair) => [pair.id, pair]));

export function getPair(id: string): ForexPair {
  return PAIR_INDEX.get(id) ?? PAIR_INDEX.get(DEFAULT_PAIR_ID)!;
}

export type LotType = 'standard' | 'mini' | 'micro' | 'units';

export const LOT_SIZES: Record<Exclude<LotType, 'units'>, number> = {
  standard: 100_000,
  mini: 10_000,
  micro: 1_000,
};

export const LOT_LABELS: Record<LotType, string> = {
  standard: 'Standard lots (100,000)',
  mini: 'Mini lots (10,000)',
  micro: 'Micro lots (1,000)',
  units: 'Units',
};

/** Convert a lot count into base-currency units. */
export function unitsFromLots(lots: number, lotType: LotType): number | null {
  if (!isUsableNumber(lots) || lots <= 0) return null;
  if (lotType === 'units') return lots;
  return lots * LOT_SIZES[lotType];
}

/** Convert a price distance into pips. */
export function pipsFromPrice(priceDistance: number, pair: ForexPair): number | null {
  if (!isUsableNumber(priceDistance)) return null;
  return roundTo(Math.abs(priceDistance) / pair.pipSize, 1);
}

/** Convert a pip count into a price distance. */
export function priceFromPips(pips: number, pair: ForexPair): number | null {
  if (!isUsableNumber(pips)) return null;
  return pips * pair.pipSize;
}

/**
 * Value of one pip in USD for a position of `units`.
 *
 * When USD is the quote currency the pip is already denominated in USD. When USD
 * is the base currency the pip is worth `pipSize * units` of the quote currency,
 * which is converted back at the prevailing rate.
 */
export function pipValueUsd(pair: ForexPair, units: number, referencePrice: number): number | null {
  if (!isUsableNumber(units) || units <= 0) return null;

  const quoteValue = pair.pipSize * units;
  if (pair.quote === 'USD') return round2(quoteValue);

  if (pair.base === 'USD') {
    const converted = safeDiv(quoteValue, referencePrice);
    return converted == null ? null : round2(converted);
  }

  // A cross pair would need a separate USD rate; none are offered yet.
  return null;
}

/**
 * Convert a price move into USD profit or loss.
 * `exitPrice` is the rate used for conversion on USD-based pairs.
 */
export function usdFromPriceDistance(
  priceDistance: number,
  units: number,
  pair: ForexPair,
  exitPrice: number,
): number | null {
  if (!isUsableNumber(priceDistance) || !isUsableNumber(units)) return null;

  const quoteAmount = Math.abs(priceDistance) * units;
  if (pair.quote === 'USD') return round2(quoteAmount);

  if (pair.base === 'USD') {
    const converted = safeDiv(quoteAmount, exitPrice);
    return converted == null ? null : round2(converted);
  }

  return null;
}

export interface ForexCostOptions {
  /** Spread in pips, paid once on entry. */
  spreadPips?: number;
  /** Commission in USD per standard lot for the full round turn. */
  commissionPerLot?: number;
}

/**
 * Estimated trading costs on a forex round trip, shaped like the equity charge
 * result so the UI renders both with one component.
 */
export function computeForexCosts(
  pair: ForexPair,
  units: number,
  referencePrice: number,
  options: ForexCostOptions = {},
): ChargeResult {
  const lines: ChargeLine[] = [];

  const spreadPips = options.spreadPips ?? 0;
  if (spreadPips > 0) {
    const pipValue = pipValueUsd(pair, units, referencePrice) ?? 0;
    lines.push({
      id: 'spread',
      label: 'Spread',
      amount: round2(spreadPips * pipValue),
      note: `${spreadPips} pip${spreadPips === 1 ? '' : 's'} on entry`,
    });
  }

  const commissionPerLot = options.commissionPerLot ?? 0;
  if (commissionPerLot > 0) {
    lines.push({
      id: 'commission',
      label: 'Commission',
      amount: round2((units / LOT_SIZES.standard) * commissionPerLot),
      note: `$${commissionPerLot} per standard lot, round turn`,
    });
  }

  const total = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  return { lines, total };
}

/**
 * Full forex outcome in USD, including spread and commission, in the same shape
 * as the equity net result.
 */
export function computeForexNet(
  setup: TradeSetup,
  pair: ForexPair,
  options: ForexCostOptions = {},
): NetResult {
  const base = computeGross(setup);

  const grossReward =
    usdFromPriceDistance(base.rewardPerUnit, setup.quantity, pair, setup.target) ?? 0;
  const grossRisk = usdFromPriceDistance(base.riskPerUnit, setup.quantity, pair, setup.stop) ?? 0;

  // Restate the gross block in USD; the ratio itself is unaffected by currency.
  const gross = {
    ...base,
    grossReward,
    grossRisk,
    breakEvenWinRate: safeDiv(grossRisk, grossRisk + grossReward),
  };

  const chargesAtTarget = computeForexCosts(pair, setup.quantity, setup.target, options);
  const chargesAtStop = computeForexCosts(pair, setup.quantity, setup.stop, options);

  const netReward = round2(grossReward - chargesAtTarget.total);
  const netRisk = round2(grossRisk + chargesAtStop.total);

  return {
    gross,
    chargesAtTarget,
    chargesAtStop,
    netReward,
    netRisk,
    netRatio: netReward > 0 ? safeDiv(netReward, netRisk) : null,
    netBreakEvenWinRate: netReward > 0 ? safeDiv(netRisk, netRisk + netReward) : null,
    chargesExceedReward: netReward <= 0,
  };
}
