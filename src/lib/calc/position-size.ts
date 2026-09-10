import { isUsableNumber, round2, safeDiv } from './num';

/**
 * Position sizing.
 *
 * The competitor makes you arrive already knowing your quantity. Traders
 * normally work the other way round: "I am willing to lose ₹2,000 on this
 * idea — how many shares is that?" These helpers solve in both directions.
 */

/** How many units risk `riskAmount` when each unit can lose `riskPerUnit`. */
export function quantityForRisk(
  riskAmount: number,
  riskPerUnit: number,
  options: { whole?: boolean } = {},
): number | null {
  if (!isUsableNumber(riskAmount) || !isUsableNumber(riskPerUnit)) return null;
  if (riskAmount <= 0 || riskPerUnit <= 0) return null;

  const raw = riskAmount / riskPerUnit;
  // Equity trades in whole shares, and rounding down keeps you inside your limit.
  return options.whole === false ? round2(raw) : Math.floor(raw);
}

/** Money at risk when `riskPercent` of `capital` is on the line. */
export function riskAmountFromCapital(capital: number, riskPercent: number): number | null {
  if (!isUsableNumber(capital) || !isUsableNumber(riskPercent)) return null;
  if (capital <= 0 || riskPercent <= 0) return null;
  return round2((capital * riskPercent) / 100);
}

/** Money at risk for a given quantity. */
export function riskForQuantity(quantity: number, riskPerUnit: number): number | null {
  if (!isUsableNumber(quantity) || !isUsableNumber(riskPerUnit)) return null;
  return round2(quantity * riskPerUnit);
}

/** Cash needed to take the position, ignoring any intraday leverage. */
export function capitalRequired(entry: number, quantity: number): number | null {
  if (!isUsableNumber(entry) || !isUsableNumber(quantity)) return null;
  return round2(entry * quantity);
}

/** Express a risk amount as a share of account capital, as a fraction of 1. */
export function riskAsFractionOfCapital(riskAmount: number, capital: number): number | null {
  if (!isUsableNumber(riskAmount) || !isUsableNumber(capital) || capital <= 0) return null;
  return safeDiv(riskAmount, capital);
}
