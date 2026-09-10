/**
 * Controller for the risk-to-reward calculator.
 *
 * The engine in `src/lib/calc` does the arithmetic; this file only reads the
 * form, hands the numbers over, and writes the answers into the `[data-field]`
 * hooks the components rendered. Nothing here knows a charge rate.
 */

import { BROKERS, EXCHANGES, RATES_VERIFIED_LABEL, SEGMENTS, getBroker } from '../lib/calc/charges';
import { RR_DEFAULTS, equityPrices, forexPrices } from '../lib/calc/defaults';
import {
  FOREX_PAIRS,
  LOT_SIZES,
  getPair,
  pipValueUsd,
  pipsFromPrice,
  unitsFromLots,
  computeForexNet,
  type ForexPair,
  type LotType,
} from '../lib/calc/forex';
import { parseNumeric, roundTo, safeDiv } from '../lib/calc/num';
import { quantityForRisk, riskAmountFromCapital } from '../lib/calc/position-size';
import {
  computeNet,
  expectancyInMoney,
  expectancyInR,
  isComplete,
  validateTradeSetup,
} from '../lib/calc/risk-reward';
import type {
  CurrencyCode,
  CustomBrokerOverrides,
  Direction,
  Exchange,
  FieldIssue,
  MarketId,
  NetResult,
  SegmentId,
} from '../lib/calc/types';
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatPips,
  formatRatio,
  formatRatioShort,
} from '../lib/format';
import { FOREX_CHARGE_NOTE, equityChargeNote, resultSummary } from '../lib/notes';
import { pickOption, readUrlState, writeUrlState } from '../lib/url-state';

const form = document.querySelector<HTMLFormElement>('#rr-form');
if (form) start(form);

function start(root: HTMLFormElement): void {
  const MARKETS = ['equity-india', 'forex'] as const;
  const DIRECTIONS = ['long', 'short'] as const;
  const LOT_TYPES = ['standard', 'mini', 'micro', 'units'] as const;
  const SEGMENT_IDS = Object.keys(SEGMENTS) as SegmentId[];
  const EXCHANGE_IDS = Object.keys(EXCHANGES) as Exchange[];
  const BROKER_IDS = BROKERS.map((broker) => broker.id);
  const PAIR_IDS = FOREX_PAIRS.map((pair) => pair.id);

  /** Numeric inputs, by query-string key. The key is also the input's `name`. */
  const NUMERIC_KEYS = [
    'e',
    'sl',
    'tp',
    'q',
    'lots',
    'sp',
    'cm',
    'cap',
    'rp',
    'wr',
    'bp',
    'bc',
    'bd',
  ] as const;

  /** Validation fields that have an input to attach an inline error to. */
  const ERROR_INPUTS = ['e', 'sl', 'tp', 'q', 'lots'] as const;

  const EM_DASH = '—';

  /** Figures that must be cleared together when the setup is not calculable. */
  const FIGURE_FIELDS = [
    'netRatio',
    'netBreakEven',
    'grossReward',
    'chargesAtTarget',
    'netReward',
    'grossRisk',
    'chargesAtStop',
    'netRisk',
    'riskPerUnit',
    'rewardPerUnit',
    'entryValue',
    'chargeDrag',
    'expectancyMoney',
    'expectancyR',
    'totalAtTarget',
    'totalAtStop',
    'suggestedQuantity',
  ];

  // --- DOM lookups, resolved once -------------------------------------------

  /**
   * Every write target, cached by name. A name can appear more than once — the
   * net ratio shows in both the results panel and the mobile summary strip — so
   * one write updates all of them.
   */
  const fields = new Map<string, HTMLElement[]>();
  for (const node of root.querySelectorAll<HTMLElement>('[data-field]')) {
    const key = node.dataset.field;
    if (!key) continue;
    const existing = fields.get(key);
    if (existing) existing.push(node);
    else fields.set(key, [node]);
  }

  const marketBlocks = Array.from(root.querySelectorAll<HTMLElement>('[data-market]'));
  const customBrokerBlocks = Array.from(
    root.querySelectorAll<HTMLElement>('[data-broker="custom"]'),
  );
  const chargesBody = root.querySelector<HTMLElement>('[data-charges-body]');
  const riskBar = root.querySelector<HTMLElement>('[data-bar="risk"]');
  const rewardBar = root.querySelector<HTMLElement>('[data-bar="reward"]');

  let statusTimer: number | undefined;
  /** Last suggested position size, so the "Use this size" button need not recompute it. */
  let suggestedUnits: number | null = null;

  // --- Reading the form -----------------------------------------------------

  const textInput = (name: string) =>
    root.querySelector<HTMLInputElement>(`input[name="${name}"]:not([type="radio"])`);
  const selectInput = (name: string) =>
    root.querySelector<HTMLSelectElement>(`select[name="${name}"]`);

  const rawValue = (name: string) => textInput(name)?.value ?? '';
  const numValue = (name: string) => parseNumeric(rawValue(name));
  const radioValue = (name: string) =>
    root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value;

  function setText(name: string, value: string | number): void {
    const input = textInput(name);
    if (input) input.value = String(value);
  }

  function setRadio(name: string, value: string): void {
    const input = root.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  function setSelect(name: string, value: string): void {
    const select = selectInput(name);
    if (select) select.value = value;
  }

  interface State {
    market: MarketId;
    direction: Direction;
    segment: SegmentId;
    exchange: Exchange;
    brokerId: string;
    entry: number | null;
    stop: number | null;
    target: number | null;
    quantity: number | null;
    pairId: string;
    lotType: LotType;
    lots: number | null;
    spreadPips: number | null;
    commissionPerLot: number | null;
    capital: number | null;
    riskPercent: number | null;
    winRatePercent: number | null;
    customPercent: number | null;
    customCap: number | null;
    customDp: number | null;
  }

  function readState(): State {
    return {
      market: pickOption(radioValue('m'), MARKETS, RR_DEFAULTS.market),
      direction: pickOption(radioValue('d'), DIRECTIONS, RR_DEFAULTS.direction),
      segment: pickOption(radioValue('seg'), SEGMENT_IDS, RR_DEFAULTS.segment),
      exchange: pickOption(radioValue('x'), EXCHANGE_IDS, RR_DEFAULTS.exchange),
      brokerId: pickOption(selectInput('b')?.value, BROKER_IDS, RR_DEFAULTS.brokerId),
      entry: numValue('e'),
      stop: numValue('sl'),
      target: numValue('tp'),
      quantity: numValue('q'),
      pairId: pickOption(selectInput('pair')?.value, PAIR_IDS, RR_DEFAULTS.pairId),
      lotType: pickOption(selectInput('lot')?.value, LOT_TYPES, RR_DEFAULTS.lotType),
      lots: numValue('lots'),
      spreadPips: numValue('sp'),
      commissionPerLot: numValue('cm'),
      capital: numValue('cap'),
      riskPercent: numValue('rp'),
      winRatePercent: numValue('wr'),
      customPercent: numValue('bp'),
      customCap: numValue('bc'),
      customDp: numValue('bd'),
    };
  }

  // --- Writing to the page --------------------------------------------------

  function write(key: string, value: string): void {
    const nodes = fields.get(key);
    if (!nodes) return;
    for (const node of nodes) {
      if (node.textContent !== value) node.textContent = value;
    }
  }

  function reveal(key: string, visible: boolean): void {
    for (const node of fields.get(key) ?? []) node.hidden = !visible;
  }

  const TONE_CLASSES = ['text-gain', 'text-loss', 'text-ink-muted'];

  function paintTone(key: string, value: number | null): void {
    const tone =
      value == null || value === 0 ? 'text-ink-muted' : value > 0 ? 'text-gain' : 'text-loss';
    for (const node of fields.get(key) ?? []) {
      node.classList.remove(...TONE_CLASSES);
      node.classList.add(tone);
    }
  }

  function setBar(riskShare: number | null): void {
    const share = riskShare == null ? 0.5 : Math.min(Math.max(riskShare, 0), 1);
    if (riskBar) riskBar.style.width = `${(share * 100).toFixed(1)}%`;
    if (rewardBar) rewardBar.style.width = `${((1 - share) * 100).toFixed(1)}%`;
  }

  function announce(message: string): void {
    write('actionStatus', message);
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => write('actionStatus', ''), 4000);
  }

  // --- Validation ----------------------------------------------------------

  /**
   * Attach each issue to its input as an inline error, and collect anything that
   * has no input of its own into the summary callout.
   */
  function paintIssues(issues: FieldIssue[], isForex: boolean): void {
    const quantityKey = isForex ? 'lots' : 'q';
    const messages = new Map<string, string>();
    const orphans: string[] = [];

    for (const issue of issues) {
      const key =
        issue.field === 'entry'
          ? 'e'
          : issue.field === 'stop'
            ? 'sl'
            : issue.field === 'target'
              ? 'tp'
              : issue.field === 'quantity'
                ? quantityKey
                : null;

      if (key == null) orphans.push(issue.message);
      else if (!messages.has(key)) messages.set(key, issue.message);
    }

    for (const key of ERROR_INPUTS) {
      const input = textInput(key);
      if (!input) continue;
      const message = messages.get(key);
      const error = document.getElementById(`${input.id}-error`);

      if (message) {
        input.setAttribute('aria-invalid', 'true');
        if (error) {
          error.textContent = message;
          error.hidden = false;
        }
      } else {
        input.removeAttribute('aria-invalid');
        if (error) {
          error.textContent = '';
          error.hidden = true;
        }
      }
    }

    const list = fields.get('issuesList')?.[0];
    if (list) {
      list.replaceChildren(
        ...orphans.map((message) => {
          const item = document.createElement('li');
          item.textContent = message;
          return item;
        }),
      );
    }
    reveal('issues', orphans.length > 0);
  }

  // --- Charges table -------------------------------------------------------

  function chargeRow(label: string, note: string | undefined, target: string, stop: string) {
    const row = document.createElement('tr');
    row.className = 'border-b border-hairline last:border-0';

    const head = document.createElement('th');
    head.scope = 'row';
    head.className = 'px-1 py-2 text-left font-normal';

    const name = document.createElement('span');
    name.className = 'text-ink';
    name.textContent = label;
    head.append(name);

    if (note) {
      const small = document.createElement('span');
      small.className = 'block text-caption text-ink-subtle';
      small.textContent = note;
      head.append(small);
    }

    const targetCell = document.createElement('td');
    targetCell.className = 'figures px-1 py-2 text-right text-ink';
    targetCell.textContent = target;

    const stopCell = document.createElement('td');
    stopCell.className = 'figures px-1 py-2 text-right text-ink';
    stopCell.textContent = stop;

    row.append(head, targetCell, stopCell);
    return row;
  }

  function emptyChargeRow(message: string) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.className = 'px-1 py-2 text-ink-subtle';
    cell.textContent = message;
    row.append(cell);
    return row;
  }

  function paintCharges(result: NetResult, currency: CurrencyCode, isForex: boolean): void {
    if (!chargesBody) return;

    const atStop = new Map(result.chargesAtStop.lines.map((line) => [line.id, line.amount]));
    const rows = result.chargesAtTarget.lines.map((line) =>
      chargeRow(
        line.label,
        line.note,
        formatMoney(line.amount, currency),
        formatMoney(atStop.get(line.id) ?? 0, currency),
      ),
    );

    chargesBody.replaceChildren(
      ...(rows.length > 0
        ? rows
        : [
            emptyChargeRow(
              isForex
                ? 'No spread or commission entered, so this estimate assumes a cost-free round trip.'
                : 'No charges apply to this setup.',
            ),
          ]),
    );

    write('totalAtTarget', formatMoney(result.chargesAtTarget.total, currency));
    write('totalAtStop', formatMoney(result.chargesAtStop.total, currency));
  }

  // --- Market and broker visibility ----------------------------------------

  function applyMarket(market: MarketId, pair: ForexPair): void {
    for (const block of marketBlocks) block.hidden = block.dataset.market !== market;

    write(
      'priceUnitHint',
      market === 'forex'
        ? `${pair.label} quotes to ${pair.priceDecimals} decimals. One pip is ${pair.pipSize}.`
        : 'Prices in ₹ per share.',
    );
    write('capitalPrefix', market === 'forex' ? '$' : '₹');
  }

  function applyBroker(brokerId: string): void {
    const broker = getBroker(brokerId);
    for (const block of customBrokerBlocks) block.hidden = !broker.isCustom;
    write('brokerSummary', broker.summary);
  }

  function customOverrides(state: State): CustomBrokerOverrides | undefined {
    if (!getBroker(state.brokerId).isCustom) return undefined;
    return {
      percent: state.customPercent ?? 0,
      // An empty cap field means "no cap", which is not the same as a cap of zero.
      cap: rawValue('bc').trim() === '' ? null : state.customCap,
      dpCharge: state.customDp ?? 0,
    };
  }

  // --- Prefilling prices ---------------------------------------------------

  function fillPrices(market: MarketId, direction: Direction, pairId: string): void {
    const prices = market === 'forex' ? forexPrices(pairId, direction) : equityPrices(direction);
    setText('e', prices.entry);
    setText('sl', prices.stop);
    setText('tp', prices.target);
  }

  /**
   * Flipping long/short turns a valid setup upside down. Swapping the stop and
   * the target keeps the trade the visitor described rather than throwing two
   * validation errors at them.
   */
  function swapStopAndTarget(direction: Direction): void {
    const entry = numValue('e');
    const stop = numValue('sl');
    const target = numValue('tp');
    if (entry == null || stop == null || target == null) return;

    const wrongWayRound =
      direction === 'long' ? stop > entry && target < entry : stop < entry && target > entry;
    if (!wrongWayRound) return;

    const stopRaw = rawValue('sl');
    setText('sl', rawValue('tp'));
    setText('tp', stopRaw);
  }

  // --- The main pass -------------------------------------------------------

  function render(): void {
    const state = readState();
    const isForex = state.market === 'forex';
    const currency: CurrencyCode = isForex ? 'USD' : 'INR';
    const pair = getPair(state.pairId);

    write('segmentHint', SEGMENTS[state.segment].description);

    // Forex is sized in lots; equity in shares.
    const quantity = isForex
      ? state.lots != null
        ? unitsFromLots(state.lots, state.lotType)
        : null
      : state.quantity;

    const setup = {
      direction: state.direction,
      entry: state.entry,
      stop: state.stop,
      target: state.target,
      quantity,
      segment: isForex ? undefined : state.segment,
    };

    const issues = validateTradeSetup(setup);
    paintIssues(issues, isForex);

    const blocked = issues.some((issue) => issue.severity === 'error');
    const result =
      !blocked && isComplete(setup)
        ? isForex
          ? computeForexNet(setup, pair, {
              spreadPips: state.spreadPips ?? 0,
              commissionPerLot: state.commissionPerLot ?? 0,
            })
          : computeNet(setup, {
              brokerId: state.brokerId,
              segment: state.segment,
              exchange: state.exchange,
              custom: customOverrides(state),
            })
        : null;

    paintUnitLabels(isForex);
    paintChargeNote(state, isForex);
    paintPositionHelper(state, result, currency, isForex);

    if (!result) {
      for (const key of FIGURE_FIELDS) write(key, EM_DASH);
      write('grossRatio', `Gross ${EM_DASH}`);
      write(
        'summary',
        blocked
          ? 'Fix the highlighted fields to see your result.'
          : 'Enter an entry price, a stop loss, a target and a position size to see your result.',
      );
      paintTone('expectancyMoney', null);
      setBar(null);
      reveal('chargesWarning', false);
      if (chargesBody) {
        chargesBody.replaceChildren(emptyChargeRow('Charges appear once the setup is complete.'));
      }
      return;
    }

    const { gross } = result;

    write('netRatio', formatRatio(result.netRatio));
    write('grossRatio', `Gross ${formatRatio(gross.ratio)}`);
    write('netBreakEven', formatPercent(result.netBreakEvenWinRate));

    write('grossReward', formatMoney(gross.grossReward, currency));
    write('chargesAtTarget', `−${formatMoney(result.chargesAtTarget.total, currency)}`);
    write('netReward', formatMoney(result.netReward, currency));

    write('grossRisk', formatMoney(gross.grossRisk, currency));
    write('chargesAtStop', `+${formatMoney(result.chargesAtStop.total, currency)}`);
    write('netRisk', formatMoney(result.netRisk, currency));

    if (isForex) {
      write('riskPerUnit', formatPips(pipsFromPrice(gross.riskPerUnit, pair)));
      write('rewardPerUnit', formatPips(pipsFromPrice(gross.rewardPerUnit, pair)));
      write('entryValue', formatMoney(pipValueUsd(pair, gross.quantity, gross.entry), currency));
    } else {
      write('riskPerUnit', formatMoney(gross.riskPerUnit, currency));
      write('rewardPerUnit', formatMoney(gross.rewardPerUnit, currency));
      write('entryValue', formatMoney(gross.entryValue, currency, { decimals: 0 }));
    }

    write(
      'chargeDrag',
      formatPercent(safeDiv(result.chargesAtTarget.total, gross.grossReward), { decimals: 2 }),
    );

    write('summary', resultSummary(result, currency));
    for (const node of fields.get('summary') ?? []) {
      node.dataset.verdict =
        result.netRatio == null
          ? 'poor'
          : result.netRatio >= 2
            ? 'good'
            : result.netRatio >= 1
              ? 'fair'
              : 'poor';
    }

    const spread = result.netRisk + Math.max(result.netReward, 0);
    setBar(spread > 0 ? result.netRisk / spread : null);

    const winFraction = (state.winRatePercent ?? 0) / 100;
    const money = expectancyInMoney(result.netReward, result.netRisk, winFraction);
    const inR = result.netRatio != null ? expectancyInR(result.netRatio, winFraction) : null;
    write('expectancyMoney', formatMoney(money, currency));
    paintTone('expectancyMoney', money);
    write(
      'expectancyR',
      inR == null
        ? `(${EM_DASH})`
        : `(${inR > 0 ? '+' : inR < 0 ? '−' : ''}${formatRatioShort(Math.abs(inR))})`,
    );

    paintCharges(result, currency, isForex);
    reveal('chargesWarning', result.chargesExceedReward);
  }

  function paintUnitLabels(isForex: boolean): void {
    write('riskPerUnitLabel', isForex ? 'Risk in pips' : 'Risk per share');
    write('rewardPerUnitLabel', isForex ? 'Reward in pips' : 'Reward per share');
    write('notionalLabel', isForex ? 'Value of one pip' : 'Position value');
    write('chargeDragLabel', isForex ? 'Costs vs gross profit' : 'Charges vs gross profit');
    write('suggestedUnitLabel', isForex ? 'units' : 'shares');
  }

  function paintChargeNote(state: State, isForex: boolean): void {
    if (isForex) {
      write('chargeSource', FOREX_CHARGE_NOTE);
      reveal('chargeSourceLink', false);
      return;
    }

    const broker = getBroker(state.brokerId);
    write('chargeSource', equityChargeNote(broker.name, RATES_VERIFIED_LABEL));

    const link = fields.get('chargeSourceLink')?.[0] as HTMLAnchorElement | undefined;
    if (link) {
      if (broker.sourceUrl) link.href = broker.sourceUrl;
      link.hidden = !broker.sourceUrl;
    }
  }

  /**
   * The position-size helper answers "how many can I buy?" from the money the
   * visitor is willing to lose. Risk per unit comes from the computed result, so
   * it is right for both markets without a second currency conversion.
   */
  function paintPositionHelper(
    state: State,
    result: NetResult | null,
    currency: CurrencyCode,
    isForex: boolean,
  ): void {
    const budget =
      state.capital != null && state.riskPercent != null
        ? riskAmountFromCapital(state.capital, state.riskPercent)
        : null;
    write('riskBudget', formatMoney(budget, currency, { decimals: 0 }));

    const riskPerUnit = result ? safeDiv(result.gross.grossRisk, result.gross.quantity) : null;
    const units =
      budget != null && riskPerUnit != null ? quantityForRisk(budget, riskPerUnit) : null;

    if (units == null) {
      write('suggestedQuantity', EM_DASH);
      suggestedUnits = null;
      return;
    }

    suggestedUnits = units;
    write('suggestedQuantity', formatNumber(units, currency));
    if (isForex) {
      const lotSize = state.lotType === 'units' ? 1 : LOT_SIZES[state.lotType];
      write(
        'suggestedUnitLabel',
        `units (${formatNumber(roundTo(units / lotSize, 2), currency, { maxDecimals: 2 })} lots)`,
      );
    }
  }

  // --- URL state -----------------------------------------------------------

  function syncUrl(): void {
    const state = readState();
    const isForex = state.market === 'forex';
    const broker = getBroker(state.brokerId);

    writeUrlState({
      m: state.market,
      d: state.direction,
      e: rawValue('e'),
      sl: rawValue('sl'),
      tp: rawValue('tp'),
      wr: rawValue('wr'),
      ...(isForex
        ? {
            pair: state.pairId,
            lot: state.lotType,
            lots: rawValue('lots'),
            sp: rawValue('sp'),
            cm: rawValue('cm'),
          }
        : {
            seg: state.segment,
            x: state.exchange,
            b: state.brokerId,
            q: rawValue('q'),
            ...(broker.isCustom
              ? { bp: rawValue('bp'), bc: rawValue('bc'), bd: rawValue('bd') }
              : {}),
          }),
    });
  }

  function restoreFromUrl(): void {
    const params = readUrlState();
    if (Object.keys(params).length === 0) return;

    setRadio('m', pickOption(params.m, MARKETS, RR_DEFAULTS.market));
    setRadio('d', pickOption(params.d, DIRECTIONS, RR_DEFAULTS.direction));
    setRadio('seg', pickOption(params.seg, SEGMENT_IDS, RR_DEFAULTS.segment));
    setRadio('x', pickOption(params.x, EXCHANGE_IDS, RR_DEFAULTS.exchange));
    setSelect('b', pickOption(params.b, BROKER_IDS, RR_DEFAULTS.brokerId));
    setSelect('pair', pickOption(params.pair, PAIR_IDS, RR_DEFAULTS.pairId));
    setSelect('lot', pickOption(params.lot, LOT_TYPES, RR_DEFAULTS.lotType));

    for (const key of NUMERIC_KEYS) {
      const raw = params[key];
      if (raw != null && parseNumeric(raw) != null) setText(key, raw);
    }

    // A shared forex link that carries no prices should still open on forex prices.
    const state = readState();
    if (state.market === 'forex' && params.e == null) {
      fillPrices('forex', state.direction, state.pairId);
    }
  }

  // --- Events --------------------------------------------------------------

  function onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    const name = target?.name;

    if (name === 'm') {
      const state = readState();
      applyMarket(state.market, getPair(state.pairId));
      applyBroker(state.brokerId);
      fillPrices(state.market, state.direction, state.pairId);
    } else if (name === 'pair') {
      const state = readState();
      applyMarket(state.market, getPair(state.pairId));
      fillPrices('forex', state.direction, state.pairId);
    } else if (name === 'd') {
      swapStopAndTarget(readState().direction);
    } else if (name === 'b') {
      applyBroker(readState().brokerId);
    }

    render();
    syncUrl();
  }

  async function copyToClipboard(text: string, done: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      announce(done);
    } catch {
      announce('Copying was blocked. Select the figures and copy them manually.');
    }
  }

  /** Plain-text summary of the current result, for pasting into a journal. */
  function resultAsText(): string {
    const state = readState();
    const isForex = state.market === 'forex';
    const currency: CurrencyCode = isForex ? 'USD' : 'INR';

    const context = isForex
      ? [state.direction === 'long' ? 'Long' : 'Short', getPair(state.pairId).label, 'Forex']
      : [
          state.direction === 'long' ? 'Long' : 'Short',
          SEGMENTS[state.segment].label,
          state.exchange,
          getBroker(state.brokerId).name,
        ];

    const size = isForex
      ? state.lotType === 'units'
        ? `${rawValue('lots')} units`
        : `${rawValue('lots')} ${state.lotType} lot(s)`
      : `${rawValue('q')} shares`;

    const unsigned = (key: string) => textOf(key).replace(/^[−+-]/, '');

    return [
      'Risk : Reward — risktorewardcalculator.com',
      context.join(' · '),
      `Entry ${rawValue('e')} · Stop ${rawValue('sl')} · Target ${rawValue('tp')} · ${size}`,
      `Net risk : reward ${textOf('netRatio')} (gross ${textOf('grossRatio').replace('Gross ', '')})`,
      `If target hits — gross ${textOf('grossReward')}, charges ${unsigned('chargesAtTarget')}, net ${textOf('netReward')}`,
      `If stop hits — gross ${textOf('grossRisk')}, charges ${unsigned('chargesAtStop')}, net ${textOf('netRisk')}`,
      `Break-even win rate ${textOf('netBreakEven')}`,
      `Charges are estimates. Figures in ${currency}.`,
      window.location.href,
    ].join('\n');
  }

  function textOf(key: string): string {
    return fields.get(key)?.[0]?.textContent?.trim() ?? EM_DASH;
  }

  function reset(): void {
    setRadio('m', RR_DEFAULTS.market);
    setRadio('d', RR_DEFAULTS.direction);
    setRadio('seg', RR_DEFAULTS.segment);
    setRadio('x', RR_DEFAULTS.exchange);
    setSelect('b', RR_DEFAULTS.brokerId);
    setSelect('pair', RR_DEFAULTS.pairId);
    setSelect('lot', RR_DEFAULTS.lotType);

    setText('e', RR_DEFAULTS.entry);
    setText('sl', RR_DEFAULTS.stop);
    setText('tp', RR_DEFAULTS.target);
    setText('q', RR_DEFAULTS.quantity);
    setText('lots', RR_DEFAULTS.lots);
    setText('sp', RR_DEFAULTS.spreadPips);
    setText('cm', RR_DEFAULTS.commissionPerLot);
    setText('cap', RR_DEFAULTS.capital);
    setText('rp', RR_DEFAULTS.riskPercent);
    setText('wr', RR_DEFAULTS.winRatePercent);
    setText('bp', RR_DEFAULTS.customPercent);
    setText('bc', RR_DEFAULTS.customCap);
    setText('bd', RR_DEFAULTS.customDp);

    applyMarket(RR_DEFAULTS.market, getPair(RR_DEFAULTS.pairId));
    applyBroker(RR_DEFAULTS.brokerId);
    writeUrlState({});
    render();
    announce('Reset to the worked example.');
    textInput('e')?.focus();
  }

  function onClick(event: Event): void {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!trigger) return;

    switch (trigger.dataset.action) {
      case 'copy-result':
        void copyToClipboard(resultAsText(), 'Result copied to the clipboard.');
        break;
      case 'copy-link':
        // The address bar is only synced on input, so make sure it is current first.
        syncUrl();
        void copyToClipboard(window.location.href, 'Link copied to the clipboard.');
        break;
      case 'reset':
        reset();
        break;
      case 'apply-quantity': {
        if (suggestedUnits == null) {
          announce('Enter your capital, risk percentage and a stop loss first.');
          break;
        }
        const state = readState();
        if (state.market === 'forex') {
          const lotSize = state.lotType === 'units' ? 1 : LOT_SIZES[state.lotType];
          setText('lots', roundTo(suggestedUnits / lotSize, 2));
        } else {
          setText('q', suggestedUnits);
        }
        render();
        syncUrl();
        announce('Position size applied.');
        break;
      }
    }
  }

  // --- Start ---------------------------------------------------------------

  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  // There is nothing to submit — results are live — so Enter must not reload.
  root.addEventListener('submit', (event) => event.preventDefault());

  restoreFromUrl();
  const initial = readState();
  applyMarket(initial.market, getPair(initial.pairId));
  applyBroker(initial.brokerId);
  render();
}
