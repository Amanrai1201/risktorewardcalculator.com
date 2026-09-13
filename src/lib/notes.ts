/**
 * Copy that has to be identical in the server render and in the controller.
 *
 * Keeping these sentences in one place means the disclaimer shown before
 * JavaScript runs and the one written after it cannot drift apart.
 */

import type { CurrencyCode, NetResult } from './calc/types';
import { describeRatio } from './calc/risk-reward';
import { describeWinRate, type WinRateResult } from './calc/win-rate';
import type {
  AverageDownPlan,
  CurrentPositionSummary,
  StockAverageResult,
} from './calc/stock-average';
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatPrice,
  formatRatio,
  formatSignedMoney,
} from './format';

export function equityChargeNote(brokerName: string, verifiedLabel: string): string {
  return `Estimated using ${brokerName}'s published rates, last checked ${verifiedLabel}. Your actual charges depend on your broker's current rate card, the exchange, the scrip group, how many orders fill and whether you hold overnight.`;
}

export const FOREX_CHARGE_NOTE =
  'Estimated from the spread and commission you entered. Real costs also move with liquidity, slippage and — if you hold a position overnight — swap or financing charges.';

/** Chip colours per tone, so the server render and the controller cannot drift apart. */
export const VERDICT_CHIP_CLASSES = {
  good: 'bg-gain-wash text-gain',
  fair: 'bg-surface-2 text-ink-muted',
  poor: 'bg-loss-wash text-loss',
} as const;

/** The verdict tone for a ratio. A setup that cannot be priced yet reads as neutral. */
export function verdictTone(ratio: number | null): keyof typeof VERDICT_CHIP_CLASSES {
  return describeRatio(ratio).tone;
}

/** One word for the verdict badge, carrying the same judgement as the summary sentence. */
export function verdictWord(ratio: number | null): string {
  return describeRatio(ratio).label;
}

/** One sentence carrying the whole answer, for screen readers and for skimming. */
export function resultSummary(result: NetResult, currency: CurrencyCode): string {
  const verdict = describeRatio(result.netRatio);
  return `Net risk to reward ${formatRatio(result.netRatio)} — net profit ${formatMoney(
    result.netReward,
    currency,
  )} against a net loss of ${formatMoney(result.netRisk, currency)}. ${verdict.text}`;
}

/** The same one-sentence answer for the win rate calculator. */
export function winRateSummary(result: WinRateResult, currency: CurrencyCode): string {
  const verdict = describeWinRate(result);

  if (result.winRate == null) return verdict.text;

  const opening = `Win rate ${formatPercent(result.winRate)} across ${formatNumber(
    result.totalTrades,
  )} trades.`;

  // Without the averages there is no expectancy to quote, so the useful figure
  // is the reward-to-risk this win rate demands.
  if (result.expectancy == null) {
    return result.breakEvenRatio == null
      ? `${opening} ${verdict.text}`
      : `${opening} Breaking even at that rate needs a reward-to-risk of ${formatRatio(
          result.breakEvenRatio,
        )}. ${verdict.text}`;
  }

  return `${opening} At a realised ${formatRatio(
    result.rewardToRisk,
  )} that is worth ${formatSignedMoney(result.expectancy, currency)} a trade, against a break-even rate of ${formatPercent(
    result.breakEvenWinRate,
  )}. ${verdict.text}`;
}

/** The same one-sentence answer for the stock average calculator. */
export function stockAverageSummary(
  result: StockAverageResult,
  position: CurrentPositionSummary,
  plan: AverageDownPlan,
  currency: CurrencyCode,
): string {
  if (result.averagePrice == null) {
    return 'Enter a buy price and a quantity to see your average price.';
  }

  const parts = [
    `Average price ${formatPrice(result.averagePrice, currency)} across ${formatNumber(
      result.totalQuantity,
    )} shares, ${formatMoney(result.totalInvested, currency)} invested.`,
  ];

  if (position.unrealised != null) {
    parts.push(
      `At the current price the holding is worth ${formatMoney(
        position.marketValue,
        currency,
      )}, ${position.unrealised < 0 ? 'down' : 'up'} ${formatMoney(
        Math.abs(position.unrealised),
        currency,
      )} (${formatPercent(position.unrealisedFraction)}).`,
    );
  }

  if (plan.impossibleReason) parts.push(plan.impossibleReason);
  else if (plan.quantityNeeded != null) {
    parts.push(
      `Reaching your target average takes ${formatNumber(
        plan.quantityNeeded,
      )} more shares, costing ${formatMoney(plan.investmentNeeded, currency)}.`,
    );
  }

  return parts.join(' ');
}

/**
 * How far a sample sits above or below the win rate it needs, and the colour
 * that carries the same judgement.
 *
 * The margin is the figure the win rate calculator exists to produce — the rate
 * on its own is only half the sentence — so it is written once here.
 */
export function winRateMargin(result: WinRateResult): { text: string; tone: string } {
  if (result.winRate == null || result.breakEvenWinRate == null) {
    return {
      text: 'Add your average win and loss to see the rate you need.',
      tone: 'text-ink-subtle',
    };
  }

  const margin = result.winRate - result.breakEvenWinRate;

  // Below a tenth of a point the two rates round to the same percentage, and
  // "0.0% above break-even" reads like a bug rather than a result.
  if (Math.abs(margin) < 0.0005)
    return { text: 'Sitting exactly at break-even', tone: 'text-ink-muted' };

  return margin > 0
    ? { text: `${formatPercent(margin)} above break-even`, tone: 'text-gain' }
    : { text: `${formatPercent(-margin)} below break-even`, tone: 'text-loss' };
}

/** The verdict chip for a holding, judged on the unrealised gain or loss. */
export function positionVerdict(unrealised: number | null): {
  tone: keyof typeof VERDICT_CHIP_CLASSES;
  label: string;
} {
  if (unrealised == null) return { tone: 'fair', label: '—' };
  if (unrealised > 0) return { tone: 'good', label: 'In profit' };
  if (unrealised < 0) return { tone: 'poor', label: 'Underwater' };
  return { tone: 'fair', label: 'Flat' };
}
