/**
 * Copy that has to be identical in the server render and in the controller.
 *
 * Keeping these sentences in one place means the disclaimer shown before
 * JavaScript runs and the one written after it cannot drift apart.
 */

import type { CurrencyCode, NetResult } from './calc/types';
import { describeRatio } from './calc/risk-reward';
import { formatMoney, formatRatio } from './format';

export function equityChargeNote(brokerName: string, verifiedLabel: string): string {
  return `Estimated using ${brokerName}'s published rates, last checked ${verifiedLabel}. Your actual charges depend on your broker's current rate card, the exchange, the scrip group, how many orders fill and whether you hold overnight.`;
}

export const FOREX_CHARGE_NOTE =
  'Estimated from the spread and commission you entered. Real costs also move with liquidity, slippage and — if you hold a position overnight — swap or financing charges.';

/** One sentence carrying the whole answer, for screen readers and for skimming. */
export function resultSummary(result: NetResult, currency: CurrencyCode): string {
  const verdict = describeRatio(result.netRatio);
  return `Net risk to reward ${formatRatio(result.netRatio)} — net profit ${formatMoney(
    result.netReward,
    currency,
  )} against a net loss of ${formatMoney(result.netRisk, currency)}. ${verdict.text}`;
}
