import type {
  CustomBrokerOverrides,
  Direction,
  Exchange,
  FieldIssue,
  GrossResult,
  NetResult,
  SegmentId,
  TradeSetup,
} from './types';
import { isUsableNumber, round2, safeDiv } from './num';
import { computeCharges, legValues } from './charges';

/**
 * The core risk-to-reward engine.
 *
 * Everything here is market-agnostic: prices and quantities are plain numbers.
 * Indian equity charges and forex pip conversion are layered on top by callers.
 */

/** Gross, pre-charge outcome of a trade setup. */
export function computeGross(setup: TradeSetup): GrossResult {
  const { direction, entry, stop, target, quantity } = setup;

  const riskPerUnit = Math.abs(entry - stop);
  const rewardPerUnit = Math.abs(target - entry);
  const grossRisk = round2(riskPerUnit * quantity);
  const grossReward = round2(rewardPerUnit * quantity);

  const ratio = safeDiv(rewardPerUnit, riskPerUnit);
  const breakEvenWinRate = safeDiv(grossRisk, grossRisk + grossReward);

  return {
    direction,
    entry,
    stop,
    target,
    quantity,
    riskPerUnit,
    rewardPerUnit,
    grossRisk,
    grossReward,
    ratio,
    breakEvenWinRate,
    entryValue: round2(entry * quantity),
    stopValue: round2(stop * quantity),
    targetValue: round2(target * quantity),
  };
}

export interface ChargeOptions {
  brokerId: string;
  segment: SegmentId;
  exchange: Exchange;
  scrips?: number;
  custom?: CustomBrokerOverrides;
}

/**
 * Gross outcome plus the charges that actually apply, producing net risk, net
 * reward and a net risk-to-reward ratio.
 *
 * Charges are computed twice, because turnover — and therefore cost — differs
 * between the winning exit and the losing exit. Charges reduce the profit on a
 * win and deepen the loss on a stop-out, so the true ratio is always worse than
 * the gross one.
 */
export function computeNet(setup: TradeSetup, options: ChargeOptions): NetResult {
  const gross = computeGross(setup);

  const atTarget = legValues(setup.direction, setup.entry, setup.target, setup.quantity);
  const atStop = legValues(setup.direction, setup.entry, setup.stop, setup.quantity);

  const chargesAtTarget = computeCharges({
    brokerId: options.brokerId,
    segment: options.segment,
    exchange: options.exchange,
    scrips: options.scrips,
    custom: options.custom,
    ...atTarget,
  });

  const chargesAtStop = computeCharges({
    brokerId: options.brokerId,
    segment: options.segment,
    exchange: options.exchange,
    scrips: options.scrips,
    custom: options.custom,
    ...atStop,
  });

  const netReward = round2(gross.grossReward - chargesAtTarget.total);
  const netRisk = round2(gross.grossRisk + chargesAtStop.total);

  const netRatio = netReward > 0 ? safeDiv(netReward, netRisk) : null;
  const netBreakEvenWinRate = netReward > 0 ? safeDiv(netRisk, netRisk + netReward) : null;

  return {
    gross,
    chargesAtTarget,
    chargesAtStop,
    netReward,
    netRisk,
    netRatio,
    netBreakEvenWinRate,
    chargesExceedReward: netReward <= 0,
  };
}

/**
 * The win rate needed to break even at a given reward-to-risk ratio.
 * At 1:2 you need to win one trade in three.
 */
export function requiredWinRate(ratio: number): number | null {
  if (!isUsableNumber(ratio) || ratio < 0) return null;
  return safeDiv(1, 1 + ratio);
}

/**
 * Expected return per trade in R multiples, where 1R is the money risked.
 * A positive number means the setup makes money over a long run of trades.
 */
export function expectancyInR(ratio: number, winRate: number): number | null {
  if (!isUsableNumber(ratio) || !isUsableNumber(winRate)) return null;
  return winRate * ratio - (1 - winRate);
}

/** Expected money per trade at a given win rate, using net risk and reward. */
export function expectancyInMoney(
  netReward: number,
  netRisk: number,
  winRate: number,
): number | null {
  if (!isUsableNumber(netReward) || !isUsableNumber(netRisk) || !isUsableNumber(winRate)) {
    return null;
  }
  return round2(winRate * netReward - (1 - winRate) * netRisk);
}

/** A plain-language verdict on a ratio, used for the result summary. */
export function describeRatio(ratio: number | null): {
  tone: 'good' | 'fair' | 'poor';
  text: string;
} {
  if (ratio == null) {
    return { tone: 'fair', text: 'Enter a stop loss and a target to see your ratio.' };
  }
  if (ratio >= 3) {
    return {
      tone: 'good',
      text: 'Strong. You can be wrong most of the time and still come out ahead.',
    };
  }
  if (ratio >= 2) {
    return {
      tone: 'good',
      text: 'Healthy. Winning one trade in three keeps you at break-even.',
    };
  }
  if (ratio >= 1) {
    return {
      tone: 'fair',
      text: 'Workable, but you need to win more than half your trades to profit.',
    };
  }
  return {
    tone: 'poor',
    text: 'You are risking more than you stand to make, so most of your trades have to win.',
  };
}

export interface ValidationInput {
  direction: Direction;
  entry: number | null;
  stop: number | null;
  target: number | null;
  quantity: number | null;
  segment?: SegmentId;
}

/**
 * Validate a setup, returning one issue per problem field.
 *
 * Messages name the fix rather than restating the rule, and empty fields are
 * silent so the form does not shout at someone who is still typing.
 */
export function validateTradeSetup(input: ValidationInput): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const { direction, entry, stop, target, quantity, segment } = input;

  if (entry != null && entry <= 0) {
    issues.push({
      field: 'entry',
      message: 'Entry price must be more than zero.',
      severity: 'error',
    });
  }
  if (stop != null && stop <= 0) {
    issues.push({ field: 'stop', message: 'Stop loss must be more than zero.', severity: 'error' });
  }
  if (target != null && target <= 0) {
    issues.push({ field: 'target', message: 'Target must be more than zero.', severity: 'error' });
  }
  if (quantity != null && quantity <= 0) {
    issues.push({
      field: 'quantity',
      message: 'Quantity must be at least one unit.',
      severity: 'error',
    });
  }

  const pricesUsable = entry != null && entry > 0;

  if (pricesUsable && stop != null && stop > 0) {
    if (direction === 'long' && stop >= entry) {
      issues.push({
        field: 'stop',
        message: 'On a long trade the stop sits below your entry. Lower it below ' + entry + '.',
        severity: 'error',
      });
    }
    if (direction === 'short' && stop <= entry) {
      issues.push({
        field: 'stop',
        message: 'On a short trade the stop sits above your entry. Raise it above ' + entry + '.',
        severity: 'error',
      });
    }
  }

  if (pricesUsable && target != null && target > 0) {
    if (direction === 'long' && target <= entry) {
      issues.push({
        field: 'target',
        message: 'On a long trade the target sits above your entry. Raise it above ' + entry + '.',
        severity: 'error',
      });
    }
    if (direction === 'short' && target >= entry) {
      issues.push({
        field: 'target',
        message: 'On a short trade the target sits below your entry. Lower it below ' + entry + '.',
        severity: 'error',
      });
    }
  }

  // Indian equity cannot be sold short for delivery — you would have nothing to deliver.
  if (direction === 'short' && segment === 'equity-delivery') {
    issues.push({
      field: 'segment',
      message: 'Delivery trades cannot be sold short. Switch to Intraday to short a stock.',
      severity: 'error',
    });
  }

  return issues;
}

/** True when a setup has everything needed to calculate. */
export function isComplete(input: ValidationInput): input is ValidationInput & TradeSetup {
  return (
    isUsableNumber(input.entry) &&
    isUsableNumber(input.stop) &&
    isUsableNumber(input.target) &&
    isUsableNumber(input.quantity) &&
    input.entry > 0 &&
    input.stop > 0 &&
    input.target > 0 &&
    input.quantity > 0
  );
}
