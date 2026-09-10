import { isUsableNumber, round2, roundTo, safeDiv } from './num';

/**
 * Win rate calculator.
 *
 * A win rate on its own says very little — 80% winners at 1:0.5 loses money
 * while 35% winners at 1:3 makes it. So this returns the win rate alongside the
 * expectancy and the ratio you would need to break even at that win rate.
 */

export interface WinRateInput {
  wins: number;
  losses: number;
  /** Optional break-even trades, excluded from the win rate denominator's outcome split. */
  breakEven?: number;
  /** Average money made on a winner. */
  averageWin?: number | null;
  /** Average money lost on a loser, entered as a positive number. */
  averageLoss?: number | null;
}

export interface WinRateResult {
  totalTrades: number;
  /** Wins as a fraction of decided trades, 0–1. */
  winRate: number | null;
  lossRate: number | null;
  /** Wins as a fraction of every trade including break-even ones. */
  winRateOfAll: number | null;
  /** Average win divided by average loss, i.e. the realised reward-to-risk. */
  rewardToRisk: number | null;
  /** Expected money per trade. */
  expectancy: number | null;
  /** Expectancy expressed in R multiples. */
  expectancyInR: number | null;
  /** Reward-to-risk needed to break even at this win rate. */
  breakEvenRatio: number | null;
  /** Win rate needed to break even at the realised reward-to-risk. */
  breakEvenWinRate: number | null;
  /** Total money the sample made or lost. */
  netResult: number | null;
}

export function computeWinRate(input: WinRateInput): WinRateResult {
  const wins = Math.max(0, Math.floor(input.wins || 0));
  const losses = Math.max(0, Math.floor(input.losses || 0));
  const breakEven = Math.max(0, Math.floor(input.breakEven || 0));

  const decided = wins + losses;
  const totalTrades = decided + breakEven;

  const winRate = safeDiv(wins, decided);
  const lossRate = safeDiv(losses, decided);
  const winRateOfAll = safeDiv(wins, totalTrades);

  const averageWin =
    isUsableNumber(input.averageWin) && input.averageWin > 0 ? input.averageWin : null;
  const averageLoss =
    isUsableNumber(input.averageLoss) && input.averageLoss > 0 ? input.averageLoss : null;

  const rewardToRisk =
    averageWin != null && averageLoss != null ? safeDiv(averageWin, averageLoss) : null;

  const expectancy =
    winRate != null && averageWin != null && averageLoss != null
      ? round2(winRate * averageWin - (1 - winRate) * averageLoss)
      : null;

  const expectancyR =
    winRate != null && rewardToRisk != null
      ? roundTo(winRate * rewardToRisk - (1 - winRate), 3)
      : null;

  // The reward-to-risk that makes expectancy exactly zero at this win rate.
  const breakEvenRatio =
    winRate != null && winRate > 0 && winRate < 1 ? safeDiv(1 - winRate, winRate) : null;

  const breakEvenWinRate = rewardToRisk != null ? safeDiv(1, 1 + rewardToRisk) : null;

  const netResult =
    averageWin != null && averageLoss != null
      ? round2(wins * averageWin - losses * averageLoss)
      : null;

  return {
    totalTrades,
    winRate,
    lossRate,
    winRateOfAll,
    rewardToRisk,
    expectancy,
    expectancyInR: expectancyR,
    breakEvenRatio,
    breakEvenWinRate,
    netResult,
  };
}
