import type { ChargeContext, ChargeLine, ChargeResult } from '../types';
import { round2 } from '../num';
import { computeBrokerage, getBroker, resolveBrokerageRule, resolveDpCharge } from './brokers';
import { STATUTORY_RATES } from './rates';

export { BROKERS, DEFAULT_BROKER_ID, getBroker, type Broker, type BrokerageRule } from './brokers';
export {
  EXCHANGES,
  RATES_VERIFIED_LABEL,
  RATES_VERIFIED_ON,
  SEGMENTS,
  STATUTORY_RATES,
} from './rates';

/** Money is rounded to paise per line so the displayed breakdown always sums to the displayed total. */

/**
 * Estimate every charge on one complete round trip.
 *
 * Both legs are priced independently because brokerage is levied per executed
 * order and several statutory charges apply to only one side of the trade:
 * intraday STT hits the sell leg alone, stamp duty the buy leg alone. The
 * caller decides which leg is the entry — for a long the entry is the buy, for
 * a short the entry is the sell.
 */
export function computeCharges(context: ChargeContext): ChargeResult {
  const { segment, exchange, buyValue, sellValue, custom } = context;
  const broker = getBroker(context.brokerId);
  const rule = resolveBrokerageRule(broker, segment, custom);
  const turnover = buyValue + sellValue;

  const lines: ChargeLine[] = [];

  // --- Brokerage: charged per executed order, so priced per leg. ---
  const brokerage = round2(computeBrokerage(rule, buyValue) + computeBrokerage(rule, sellValue));
  lines.push({
    id: 'brokerage',
    label: 'Brokerage',
    amount: brokerage,
    note: 'Both legs, one executed order each',
  });

  // --- STT: delivery on both legs, intraday on the sell leg only. ---
  const sttRates = STATUTORY_RATES.stt[segment];
  const stt = round2(buyValue * sttRates.buy + sellValue * sttRates.sell);
  lines.push({
    id: 'stt',
    label: 'STT',
    amount: stt,
    note: segment === 'equity-delivery' ? '0.1% on buy and sell' : '0.025% on the sell leg only',
  });

  // --- Exchange transaction charges, including the NSE IPFT levy. ---
  const transactionRate = STATUTORY_RATES.transaction[exchange] + STATUTORY_RATES.ipft[exchange];
  const transaction = round2(turnover * transactionRate);
  lines.push({
    id: 'transaction',
    label: 'Exchange transaction charges',
    amount: transaction,
    note: exchange === 'NSE' ? '0.00307% of turnover, incl. IPFT' : '0.00375% of turnover',
  });

  // --- SEBI turnover fee. ---
  const sebi = round2(turnover * STATUTORY_RATES.sebi);
  lines.push({
    id: 'sebi',
    label: 'SEBI charges',
    amount: sebi,
    note: '₹10 per crore of turnover',
  });

  // --- DP charge: delivery sells only, flat per scrip regardless of quantity. ---
  const dpPerScrip = resolveDpCharge(broker, custom);
  const scrips = context.scrips ?? 1;
  const dp = segment === 'equity-delivery' && sellValue > 0 ? round2(dpPerScrip * scrips) : 0;
  if (dp > 0) {
    lines.push({
      id: 'dp',
      label: 'DP charges',
      amount: dp,
      note: broker.dpChargeIncludesGst
        ? 'Per scrip on the sell, GST included'
        : 'Per scrip on the sell, plus GST',
    });
  }

  // --- GST: on brokerage, transaction, SEBI and DP. Never on STT or stamp duty. ---
  const gstBase = brokerage + transaction + sebi + (broker.dpChargeIncludesGst ? 0 : dp);
  const gst = round2(gstBase * STATUTORY_RATES.gst);
  lines.push({
    id: 'gst',
    label: 'GST',
    amount: gst,
    note: '18% on brokerage, transaction, SEBI and DP charges',
  });

  // --- Stamp duty: buy leg only. ---
  const stampDuty = round2(buyValue * STATUTORY_RATES.stampDuty[segment]);
  lines.push({
    id: 'stamp-duty',
    label: 'Stamp duty',
    amount: stampDuty,
    note:
      segment === 'equity-delivery' ? '0.015% on the buy leg only' : '0.003% on the buy leg only',
  });

  const total = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  return { lines, total };
}

/**
 * Turnover of each leg for a round trip, given which way round the trade runs.
 * A long buys at entry and sells at exit; a short does the reverse.
 */
export function legValues(
  direction: 'long' | 'short',
  entry: number,
  exit: number,
  quantity: number,
): { buyValue: number; sellValue: number } {
  const entryValue = entry * quantity;
  const exitValue = exit * quantity;
  return direction === 'long'
    ? { buyValue: entryValue, sellValue: exitValue }
    : { buyValue: exitValue, sellValue: entryValue };
}
