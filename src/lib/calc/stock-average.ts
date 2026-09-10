import { isUsableNumber, round2, roundTo, safeDiv } from './num';

/**
 * Stock average calculator.
 *
 * Works out the weighted average buy price across any number of purchases, then
 * answers the question people actually open this tool for: "how many more shares
 * do I need to buy to bring my average down to X?"
 */

export interface PurchaseLot {
  price: number;
  quantity: number;
}

export interface StockAverageResult {
  totalQuantity: number;
  totalInvested: number;
  averagePrice: number | null;
  /** Number of lots that contributed to the result. */
  lotsUsed: number;
}

export function computeStockAverage(lots: PurchaseLot[]): StockAverageResult {
  let totalQuantity = 0;
  let totalInvested = 0;
  let lotsUsed = 0;

  for (const lot of lots) {
    if (!isUsableNumber(lot.price) || !isUsableNumber(lot.quantity)) continue;
    if (lot.price <= 0 || lot.quantity <= 0) continue;
    totalQuantity += lot.quantity;
    totalInvested += lot.price * lot.quantity;
    lotsUsed += 1;
  }

  return {
    totalQuantity: roundTo(totalQuantity, 4),
    totalInvested: round2(totalInvested),
    averagePrice: totalQuantity > 0 ? roundTo(totalInvested / totalQuantity, 4) : null,
    lotsUsed,
  };
}

export interface CurrentPositionSummary {
  /** Unrealised gain or loss at the market price. */
  unrealised: number | null;
  /** Unrealised gain or loss as a fraction of the amount invested. */
  unrealisedFraction: number | null;
  /** Market value of the holding. */
  marketValue: number | null;
}

export function summarisePosition(
  result: StockAverageResult,
  currentPrice: number | null,
): CurrentPositionSummary {
  if (
    !isUsableNumber(currentPrice) ||
    currentPrice <= 0 ||
    result.averagePrice == null ||
    result.totalQuantity <= 0
  ) {
    return { unrealised: null, unrealisedFraction: null, marketValue: null };
  }

  const marketValue = round2(currentPrice * result.totalQuantity);
  const unrealised = round2(marketValue - result.totalInvested);

  return {
    marketValue,
    unrealised,
    unrealisedFraction: safeDiv(unrealised, result.totalInvested),
  };
}

export interface AverageDownPlan {
  /** Shares to buy at `atPrice` to reach `targetAverage`. */
  quantityNeeded: number | null;
  /** Cash that purchase requires. */
  investmentNeeded: number | null;
  /** Why the target cannot be reached, when it cannot. */
  impossibleReason: string | null;
}

/**
 * How many more shares at `atPrice` bring the weighted average to `targetAverage`.
 *
 * Solving `(invested + q·atPrice) / (qty + q) = target` for `q` gives
 * `q = (invested − target·qty) / (target − atPrice)`.
 *
 * The arithmetic deliberately uses the raw invested total rather than the
 * rounded average price: rounding the average first can push an exact answer a
 * whisker over a whole share and cost the trader a share they do not need.
 */
export function planToReachAverage(
  result: StockAverageResult,
  atPrice: number | null,
  targetAverage: number | null,
): AverageDownPlan {
  const empty: AverageDownPlan = {
    quantityNeeded: null,
    investmentNeeded: null,
    impossibleReason: null,
  };

  if (
    result.averagePrice == null ||
    result.totalQuantity <= 0 ||
    !isUsableNumber(atPrice) ||
    !isUsableNumber(targetAverage) ||
    atPrice <= 0 ||
    targetAverage <= 0
  ) {
    return empty;
  }

  const current = result.totalInvested / result.totalQuantity;

  if (roundTo(targetAverage, 4) === roundTo(current, 4)) {
    return { ...empty, impossibleReason: 'Your average is already at that price.' };
  }

  const buyingDown = targetAverage < current;

  // Buying above your average can only raise it, and buying below can only lower it.
  if (buyingDown && atPrice >= targetAverage) {
    return {
      ...empty,
      impossibleReason: `To average down to ${targetAverage}, you have to buy below ${targetAverage}. At ${atPrice} no quantity gets you there.`,
    };
  }
  if (!buyingDown && atPrice <= targetAverage) {
    return {
      ...empty,
      impossibleReason: `To raise your average to ${targetAverage}, you have to buy above ${targetAverage}.`,
    };
  }

  const quantity =
    (result.totalInvested - targetAverage * result.totalQuantity) / (targetAverage - atPrice);
  if (!Number.isFinite(quantity) || quantity <= 0) return empty;

  // Round away floating-point dust before rounding up to a whole share.
  const quantityNeeded = Math.ceil(roundTo(quantity, 6));
  return {
    quantityNeeded,
    investmentNeeded: round2(quantityNeeded * atPrice),
    impossibleReason: null,
  };
}
