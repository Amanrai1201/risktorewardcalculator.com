/**
 * Controller for the stock average calculator.
 *
 * The engine in `src/lib/calc/stock-average.ts` does the arithmetic; this file
 * reads the purchase rows, keeps them in sync with the URL, and writes the
 * answers into the `[data-field]` hooks the components rendered.
 */

import { STOCK_AVERAGE_DEFAULTS } from '../lib/calc/defaults';
import { parseNumeric } from '../lib/calc/num';
import {
  averageAfterPlan,
  computeStockAverage,
  planToReachAverage,
  summarisePosition,
  type PurchaseLot,
} from '../lib/calc/stock-average';
import type { CurrencyCode } from '../lib/calc/types';
import {
  currencySymbol,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPrice,
  formatSignedMoney,
} from '../lib/format';
import { positionVerdict, stockAverageSummary, VERDICT_CHIP_CLASSES } from '../lib/notes';
import { decodeLots, encodeLots, pickOption, readUrlState, writeUrlState } from '../lib/url-state';

const form = document.querySelector<HTMLFormElement>('#sa-form');
if (form) start(form);

function start(root: HTMLFormElement): void {
  const CURRENCIES = ['INR', 'USD'] as const;

  /** The single-value inputs, by query-string key. The key is also the `name`. */
  const PRICE_KEYS = ['cp', 'bp', 'ta'] as const;

  const EM_DASH = '—';

  /** Figures that must be cleared together when the position is not calculable. */
  const FIGURE_FIELDS = [
    'averagePrice',
    'totalInvested',
    'marketValue',
    'unrealisedMoney',
    'quantityNeeded',
    'investmentNeeded',
    'newAveragePrice',
  ];

  // --- DOM lookups ----------------------------------------------------------

  const lotList = root.querySelector<HTMLElement>('[data-lot-list]');
  const lotTemplate = root.querySelector<HTMLTemplateElement>('[data-lot-template]');
  const addButton = root.querySelector<HTMLButtonElement>('[data-action="add-lot"]');
  const verdictBadge = root.querySelector<HTMLElement>('[data-verdict-badge]');

  /**
   * Every write target, cached by name. Rebuilt whenever a row is added or
   * removed, because each row brings its own currency prefix with it.
   */
  let fields = new Map<string, HTMLElement[]>();

  function indexFields(): void {
    fields = new Map();
    for (const node of root.querySelectorAll<HTMLElement>('[data-field]')) {
      const key = node.dataset.field;
      if (!key) continue;
      const existing = fields.get(key);
      if (existing) existing.push(node);
      else fields.set(key, [node]);
    }
  }

  let statusTimer: number | undefined;

  // --- Reading the form -----------------------------------------------------

  const textInput = (name: string) =>
    root.querySelector<HTMLInputElement>(`input[name="${name}"]:not([type="radio"])`);

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

  /** Rows in document order. The `<template>` row is not in the DOM, so it is never matched. */
  const lotRows = () => [...root.querySelectorAll<HTMLElement>('[data-lot-row]')];

  const priceInput = (row: HTMLElement) =>
    row.querySelector<HTMLInputElement>('input[data-lot-price]');
  const quantityInput = (row: HTMLElement) =>
    row.querySelector<HTMLInputElement>('input[data-lot-qty]');

  interface LotEntry {
    price: number | null;
    quantity: number | null;
  }

  function readLots(): LotEntry[] {
    return lotRows().map((row) => ({
      price: parseNumeric(priceInput(row)?.value ?? ''),
      quantity: parseNumeric(quantityInput(row)?.value ?? ''),
    }));
  }

  const isComplete = (lot: LotEntry): lot is PurchaseLot =>
    lot.price != null && lot.quantity != null;

  interface State {
    currency: CurrencyCode;
    lots: LotEntry[];
    currentPrice: number | null;
    buyAtPrice: number | null;
    targetAverage: number | null;
  }

  function readState(): State {
    return {
      currency: pickOption(radioValue('c'), CURRENCIES, STOCK_AVERAGE_DEFAULTS.currency),
      lots: readLots(),
      currentPrice: numValue('cp'),
      buyAtPrice: numValue('bp'),
      targetAverage: numValue('ta'),
    };
  }

  // --- Rows -----------------------------------------------------------------

  /**
   * Labels are renumbered rather than tied to an id, so a row can be inserted or
   * dropped anywhere without leaving a screen reader counting the wrong rows.
   */
  function renumberRows(): void {
    const rows = lotRows();

    rows.forEach((row, index) => {
      const position = index + 1;
      priceInput(row)?.setAttribute('aria-label', `Buy price, purchase ${position}`);
      quantityInput(row)?.setAttribute('aria-label', `Quantity, purchase ${position}`);

      const remove = row.querySelector<HTMLButtonElement>('[data-action="remove-lot"]');
      if (remove) {
        remove.setAttribute('aria-label', `Remove purchase ${position}`);
        // Removing the last row would leave nothing to average.
        remove.disabled = rows.length <= 1;
      }
    });
  }

  function appendRow(): HTMLElement | null {
    if (!lotList || !lotTemplate) return null;

    const row = lotTemplate.content.firstElementChild?.cloneNode(true);
    if (!(row instanceof HTMLElement)) return null;

    lotList.append(row);
    return row;
  }

  function addLot(): void {
    const row = appendRow();
    if (!row) return;

    renumberRows();
    indexFields();
    render();
    syncUrl();
    priceInput(row)?.focus();
  }

  function removeLot(trigger: HTMLElement): void {
    const row = trigger.closest<HTMLElement>('[data-lot-row]');
    const rows = lotRows();
    if (!row || rows.length <= 1) return;

    const index = rows.indexOf(row);
    row.remove();
    renumberRows();
    indexFields();
    render();
    syncUrl();

    // Focus lands on the row that took its place, or on the one above it.
    const remaining = lotRows();
    const next = remaining[Math.min(index, remaining.length - 1)];
    const target = next?.querySelector<HTMLButtonElement>('[data-action="remove-lot"]');
    if (target && !target.disabled) target.focus();
    else addButton?.focus();
  }

  /** Replace the rows wholesale, used when a shared link carries its own purchases. */
  function setLots(lots: LotEntry[]): void {
    const wanted = Math.max(lots.length, 1);

    let rows = lotRows();
    while (rows.length > wanted) {
      rows.pop()?.remove();
    }
    while (rows.length < wanted) {
      const row = appendRow();
      if (!row) break;
      rows.push(row);
    }

    rows.forEach((row, index) => {
      const lot = lots[index];
      const price = priceInput(row);
      const quantity = quantityInput(row);
      if (price) price.value = lot?.price == null ? '' : String(lot.price);
      if (quantity) quantity.value = lot?.quantity == null ? '' : String(lot.quantity);
    });

    renumberRows();
    indexFields();
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

  const TONE_CLASSES = ['text-gain', 'text-loss', 'text-ink-muted', 'text-ink'];

  function paintTone(key: string, value: number | null): void {
    const tone =
      value == null || value === 0 ? 'text-ink-muted' : value > 0 ? 'text-gain' : 'text-loss';
    for (const node of fields.get(key) ?? []) {
      node.classList.remove(...TONE_CLASSES);
      node.classList.add(tone);
    }
  }

  const VERDICT_CLASSES = Object.values(VERDICT_CHIP_CLASSES).flatMap((value) => value.split(' '));

  function paintVerdict(tone: keyof typeof VERDICT_CHIP_CLASSES, label: string): void {
    write('verdictLabel', label);

    for (const node of fields.get('summary') ?? []) node.dataset.verdict = tone;

    if (verdictBadge) {
      verdictBadge.classList.remove(...VERDICT_CLASSES);
      verdictBadge.classList.add(...VERDICT_CHIP_CLASSES[tone].split(' '));
      verdictBadge.dataset.verdict = tone;
    }
  }

  function announce(message: string): void {
    write('actionStatus', message);
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => write('actionStatus', ''), 4000);
  }

  // --- Validation -----------------------------------------------------------

  interface Issues {
    /** Keyed by the single-value input's name. */
    byField: Map<string, string>;
    /** The one message shown under the purchase rows. */
    lots: string | null;
    /** Row inputs to mark, so the reader can see which row is at fault. */
    invalidInputs: HTMLInputElement[];
  }

  function collectIssues(state: State): Issues {
    const byField = new Map<string, string>();
    const invalidInputs: HTMLInputElement[] = [];
    let lots: string | null = null;

    for (const key of PRICE_KEYS) {
      const value = numValue(key);
      if (value != null && value <= 0) byField.set(key, 'Enter a price above zero.');
    }

    lotRows().forEach((row, index) => {
      const lot = state.lots[index];
      if (!lot) return;

      const price = priceInput(row);
      const quantity = quantityInput(row);

      // A row left entirely blank is simply not counted — nothing to report.
      if (lot.price == null && lot.quantity == null) return;

      if (lot.price == null || lot.quantity == null) {
        lots ??= 'Every purchase needs both a price and a quantity.';
        if (lot.price == null && price) invalidInputs.push(price);
        if (lot.quantity == null && quantity) invalidInputs.push(quantity);
        return;
      }

      if (lot.price <= 0 || lot.quantity <= 0) {
        lots ??= 'Prices and quantities have to be above zero.';
        if (lot.price <= 0 && price) invalidInputs.push(price);
        if (lot.quantity <= 0 && quantity) invalidInputs.push(quantity);
      }
    });

    return { byField, lots, invalidInputs };
  }

  function paintIssues(issues: Issues): void {
    for (const key of PRICE_KEYS) {
      const input = textInput(key);
      if (!input) continue;

      const message = issues.byField.get(key);
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

    const flagged = new Set(issues.invalidInputs);
    for (const row of lotRows()) {
      for (const input of [priceInput(row), quantityInput(row)]) {
        if (!input) continue;
        if (flagged.has(input)) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      }
    }

    write('lotError', issues.lots ?? '');
    reveal('lotError', issues.lots != null);
  }

  // --- The main pass --------------------------------------------------------

  function render(): void {
    const state = readState();
    const currency = state.currency;

    write('currencyPrefix', currencySymbol(currency));
    write('lotsUsed', String(state.lots.filter(isComplete).length));

    const issues = collectIssues(state);
    paintIssues(issues);

    const blocked = issues.byField.size > 0 || issues.lots != null;

    if (blocked) {
      for (const key of FIGURE_FIELDS) write(key, EM_DASH);
      write('unrealisedPercent', `(${EM_DASH})`);
      write('sharesHint', '');
      write('buyAtHint', '');
      write('newQuantityHint', '');
      write('summary', 'Fix the highlighted fields to see your result.');
      paintVerdict('fair', EM_DASH);
      paintTone('unrealisedMoney', null);
      paintTone('unrealisedPercent', null);
      reveal('planIssue', false);
      return;
    }

    const result = computeStockAverage(state.lots.filter(isComplete));
    const position = summarisePosition(result, state.currentPrice);
    const plan = planToReachAverage(result, state.buyAtPrice, state.targetAverage);
    const after = averageAfterPlan(result, plan, state.buyAtPrice);
    const verdict = positionVerdict(position.unrealised);

    write('averagePrice', formatPrice(result.averagePrice, currency));
    write('totalInvested', formatMoney(result.totalInvested, currency));
    write('sharesHint', `${formatNumber(result.totalQuantity)} shares held`);

    write('marketValue', formatMoney(position.marketValue, currency));
    write('unrealisedMoney', formatSignedMoney(position.unrealised, currency));
    write('unrealisedPercent', `(${formatPercent(position.unrealisedFraction)})`);
    paintTone('unrealisedMoney', position.unrealised);
    paintTone('unrealisedPercent', position.unrealised);

    write('quantityNeeded', formatNumber(plan.quantityNeeded));
    write('investmentNeeded', formatMoney(plan.investmentNeeded, currency));
    write(
      'buyAtHint',
      state.buyAtPrice == null ? '' : `at ${formatPrice(state.buyAtPrice, currency)}`,
    );
    write('newAveragePrice', formatPrice(after?.averagePrice ?? null, currency));
    write(
      'newQuantityHint',
      after == null ? '' : `across ${formatNumber(after.totalQuantity)} shares`,
    );

    write('planIssueText', plan.impossibleReason ?? '');
    reveal('planIssue', plan.impossibleReason != null);

    write('summary', stockAverageSummary(result, position, plan, currency));
    paintVerdict(verdict.tone, verdict.label);
  }

  // --- URL state ------------------------------------------------------------

  function syncUrl(): void {
    const state = readState();

    writeUrlState({
      c: state.currency,
      p: encodeLots(state.lots),
      cp: rawValue('cp'),
      bp: rawValue('bp'),
      ta: rawValue('ta'),
    });
  }

  function restoreFromUrl(): void {
    const params = readUrlState();
    if (Object.keys(params).length === 0) return;

    setRadio('c', pickOption(params.c, CURRENCIES, STOCK_AVERAGE_DEFAULTS.currency));

    const lots = decodeLots(params.p);
    if (lots.length > 0) setLots(lots);

    for (const key of PRICE_KEYS) {
      const raw = params[key];
      if (raw != null && parseNumeric(raw) != null) setText(key, raw);
    }
  }

  // --- Events ---------------------------------------------------------------

  function onInput(): void {
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

  function textOf(key: string): string {
    return fields.get(key)?.[0]?.textContent?.trim() ?? EM_DASH;
  }

  /** Plain-text summary of the current position, for pasting into a journal. */
  function resultAsText(): string {
    const state = readState();
    const counted = state.lots.filter(isComplete);

    const lines = [
      'Stock average — risktorewardcalculator.com',
      ...counted.map(
        (lot, index) =>
          `Buy ${index + 1}: ${formatNumber(lot.quantity)} @ ${formatPrice(lot.price, state.currency)}`,
      ),
      `Average buy price ${textOf('averagePrice')} — ${textOf('sharesHint')}, ${textOf('totalInvested')} invested`,
    ];

    if (state.currentPrice != null) {
      lines.push(
        `At ${formatPrice(state.currentPrice, state.currency)} the holding is worth ${textOf('marketValue')}, ${textOf('unrealisedMoney')} ${textOf('unrealisedPercent')}`,
      );
    }

    const plan = textOf('quantityNeeded');
    if (plan !== EM_DASH) {
      lines.push(
        `To average to ${rawValue('ta')}: buy ${plan} more at ${rawValue('bp')} for ${textOf('investmentNeeded')}, landing at ${textOf('newAveragePrice')}`,
      );
    }

    lines.push(window.location.href);
    return lines.join('\n');
  }

  function reset(): void {
    setRadio('c', STOCK_AVERAGE_DEFAULTS.currency);
    setLots(STOCK_AVERAGE_DEFAULTS.lots);
    setText('cp', STOCK_AVERAGE_DEFAULTS.currentPrice);
    setText('bp', STOCK_AVERAGE_DEFAULTS.buyAtPrice);
    setText('ta', STOCK_AVERAGE_DEFAULTS.targetAverage);

    writeUrlState({});
    render();
    announce('Reset to the worked example.');
    priceInput(lotRows()[0])?.focus();
  }

  function onClick(event: Event): void {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!trigger) return;

    switch (trigger.dataset.action) {
      case 'add-lot':
        addLot();
        break;
      case 'remove-lot':
        removeLot(trigger);
        break;
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
    }
  }

  // --- Start ----------------------------------------------------------------

  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  // There is nothing to submit — results are live — so Enter must not reload.
  root.addEventListener('submit', (event) => event.preventDefault());

  indexFields();
  restoreFromUrl();
  renumberRows();
  render();
}
