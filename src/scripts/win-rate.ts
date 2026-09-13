/**
 * Controller for the win rate calculator.
 *
 * The engine in `src/lib/calc/win-rate.ts` does the arithmetic; this file only
 * reads the form, hands the numbers over, and writes the answers into the
 * `[data-field]` hooks the components rendered.
 */

import { WIN_RATE_DEFAULTS } from '../lib/calc/defaults';
import { parseNumeric } from '../lib/calc/num';
import type { CurrencyCode } from '../lib/calc/types';
import { computeWinRate, describeWinRate } from '../lib/calc/win-rate';
import {
  currencySymbol,
  formatNumber,
  formatPercent,
  formatRatio,
  formatSignedMoney,
  formatSignedR,
} from '../lib/format';
import { VERDICT_CHIP_CLASSES, winRateMargin, winRateSummary } from '../lib/notes';
import { pickOption, readUrlState, writeUrlState } from '../lib/url-state';

const form = document.querySelector<HTMLFormElement>('#wr-form');
if (form) start(form);

function start(root: HTMLFormElement): void {
  const CURRENCIES = ['INR', 'USD'] as const;

  /** Numeric inputs, by query-string key. The key is also the input's `name`. */
  const NUMERIC_KEYS = ['w', 'l', 'be', 'aw', 'al'] as const;

  /** The three that must be whole, non-negative counts. */
  const COUNT_KEYS = ['w', 'l', 'be'] as const;

  const EM_DASH = '—';

  /** Figures that must be cleared together when the sample is not calculable. */
  const FIGURE_FIELDS = [
    'winRate',
    'breakEvenWinRate',
    'expectancyMoney',
    'totalTrades',
    'netResult',
    'rewardToRisk',
    'breakEvenRatio',
    'lossRate',
    'winRateOfAll',
  ];

  // --- DOM lookups, resolved once -------------------------------------------

  /**
   * Every write target, cached by name. A name can appear more than once — the
   * win rate shows in the lead tile, the track and the mobile strip — so one
   * write updates all of them.
   */
  const fields = new Map<string, HTMLElement[]>();
  for (const node of root.querySelectorAll<HTMLElement>('[data-field]')) {
    const key = node.dataset.field;
    if (!key) continue;
    const existing = fields.get(key);
    if (existing) existing.push(node);
    else fields.set(key, [node]);
  }

  const breakEvenBar = root.querySelector<HTMLElement>('[data-bar="breakeven"]');
  const winRateMarker = root.querySelector<HTMLElement>('[data-marker="winrate"]');
  const verdictBadge = root.querySelector<HTMLElement>('[data-verdict-badge]');

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

  interface State {
    currency: CurrencyCode;
    wins: number | null;
    losses: number | null;
    breakEven: number | null;
    averageWin: number | null;
    averageLoss: number | null;
  }

  function readState(): State {
    return {
      currency: pickOption(radioValue('c'), CURRENCIES, WIN_RATE_DEFAULTS.currency),
      wins: numValue('w'),
      losses: numValue('l'),
      breakEven: numValue('be'),
      averageWin: numValue('aw'),
      averageLoss: numValue('al'),
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

  const TONE_CLASSES = ['text-gain', 'text-loss', 'text-ink-muted', 'text-ink'];

  function paintTone(key: string, value: number | null): void {
    const tone =
      value == null || value === 0 ? 'text-ink-muted' : value > 0 ? 'text-gain' : 'text-loss';
    for (const node of fields.get(key) ?? []) {
      node.classList.remove(...TONE_CLASSES);
      node.classList.add(tone);
    }
  }

  /** The break-even threshold on the track, with the sample's own rate marked. */
  function setTrack(breakEven: number | null, winRate: number | null): void {
    const percent = (value: number | null) =>
      value == null ? 0 : Math.min(Math.max(value, 0), 1) * 100;

    if (breakEvenBar) breakEvenBar.style.width = `${percent(breakEven).toFixed(1)}%`;
    if (winRateMarker) winRateMarker.style.left = `${percent(winRate).toFixed(1)}%`;
  }

  const MARGIN_CLASSES = ['text-gain', 'text-loss', 'text-ink-muted', 'text-ink-subtle'];

  function paintMargin(margin: { text: string; tone: string }): void {
    write('marginLabel', margin.text);
    for (const node of fields.get('marginLabel') ?? []) {
      node.classList.remove(...MARGIN_CLASSES);
      node.classList.add(margin.tone);
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

  // --- Validation ----------------------------------------------------------

  /**
   * Input policing rather than trade validation: `computeWinRate` clamps and
   * floors whatever it is given, and a silently corrected figure is worse than
   * a message saying what was wrong.
   */
  function collectIssues(state: State): Map<string, string> {
    const issues = new Map<string, string>();

    for (const key of COUNT_KEYS) {
      const value = numValue(key);
      if (value == null) continue;
      if (value < 0) issues.set(key, 'A count cannot be negative.');
      else if (!Number.isInteger(value)) issues.set(key, 'Whole trades only.');
    }

    if (state.averageWin != null && state.averageWin < 0) {
      issues.set('aw', 'Enter the average win as a positive number.');
    }
    if (state.averageLoss != null && state.averageLoss < 0) {
      issues.set('al', 'Enter the average loss as a positive number.');
    }

    return issues;
  }

  function paintIssues(issues: Map<string, string>): void {
    for (const key of NUMERIC_KEYS) {
      const input = textInput(key);
      if (!input) continue;

      const message = issues.get(key);
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
  }

  // --- The main pass -------------------------------------------------------

  function render(): void {
    const state = readState();
    const currency = state.currency;

    write('currencyPrefix', currencySymbol(currency));

    const issues = collectIssues(state);
    paintIssues(issues);

    if (issues.size > 0) {
      for (const key of FIGURE_FIELDS) write(key, EM_DASH);
      write('expectancyR', `(${EM_DASH})`);
      write('winRateHint', 'of decided trades');
      write('summary', 'Fix the highlighted fields to see your result.');
      write('verdictText', 'Fix the highlighted fields to see your result.');
      paintVerdict('fair', EM_DASH);
      paintMargin({ text: EM_DASH, tone: 'text-ink-subtle' });
      paintTone('expectancyMoney', null);
      paintTone('netResult', null);
      setTrack(null, null);
      reveal('losingWarning', false);
      return;
    }

    const wins = state.wins ?? 0;
    const losses = state.losses ?? 0;

    const result = computeWinRate({
      wins,
      losses,
      breakEven: state.breakEven ?? 0,
      averageWin: state.averageWin,
      averageLoss: state.averageLoss,
    });

    const verdict = describeWinRate(result);

    write('winRate', formatPercent(result.winRate));
    write('winRateHint', `${formatNumber(wins)} of ${formatNumber(wins + losses)} decided trades`);
    write('breakEvenWinRate', formatPercent(result.breakEvenWinRate));
    write('lossRate', formatPercent(result.lossRate));
    write('winRateOfAll', formatPercent(result.winRateOfAll));

    write('expectancyMoney', formatSignedMoney(result.expectancy, currency));
    paintTone('expectancyMoney', result.expectancy);
    write('expectancyR', `(${formatSignedR(result.expectancyInR)})`);

    write('totalTrades', formatNumber(result.totalTrades));
    write('netResult', formatSignedMoney(result.netResult, currency));
    paintTone('netResult', result.netResult);

    write('rewardToRisk', formatRatio(result.rewardToRisk));
    write('breakEvenRatio', formatRatio(result.breakEvenRatio));

    write('summary', winRateSummary(result, currency));
    write('verdictText', verdict.text);
    paintVerdict(verdict.tone, verdict.label);
    paintMargin(winRateMargin(result));

    setTrack(result.breakEvenWinRate, result.winRate);
    reveal('losingWarning', result.expectancyInR != null && result.expectancyInR < 0);
  }

  // --- URL state -----------------------------------------------------------

  function syncUrl(): void {
    writeUrlState({
      c: readState().currency,
      w: rawValue('w'),
      l: rawValue('l'),
      be: rawValue('be'),
      aw: rawValue('aw'),
      al: rawValue('al'),
    });
  }

  function restoreFromUrl(): void {
    const params = readUrlState();
    if (Object.keys(params).length === 0) return;

    setRadio('c', pickOption(params.c, CURRENCIES, WIN_RATE_DEFAULTS.currency));

    for (const key of NUMERIC_KEYS) {
      const raw = params[key];
      if (raw != null && parseNumeric(raw) != null) setText(key, raw);
    }
  }

  // --- Events --------------------------------------------------------------

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

  /** Plain-text summary of the current result, for pasting into a journal. */
  function resultAsText(): string {
    const state = readState();

    return [
      'Win rate — risktorewardcalculator.com',
      `${rawValue('w')} wins · ${rawValue('l')} losses · ${rawValue('be')} break-even`,
      `Win rate ${textOf('winRate')} against a break-even rate of ${textOf('breakEvenWinRate')} — ${textOf('marginLabel')}`,
      `Average win ${rawValue('aw')} · Average loss ${rawValue('al')} · Realised ${textOf('rewardToRisk')}`,
      `Expectancy ${textOf('expectancyMoney')} ${textOf('expectancyR')} per trade`,
      `Across ${textOf('totalTrades')} trades that is ${textOf('netResult')}`,
      `Figures in ${state.currency}.`,
      window.location.href,
    ].join('\n');
  }

  function reset(): void {
    setRadio('c', WIN_RATE_DEFAULTS.currency);
    setText('w', WIN_RATE_DEFAULTS.wins);
    setText('l', WIN_RATE_DEFAULTS.losses);
    setText('be', WIN_RATE_DEFAULTS.breakEven);
    setText('aw', WIN_RATE_DEFAULTS.averageWin);
    setText('al', WIN_RATE_DEFAULTS.averageLoss);

    writeUrlState({});
    render();
    announce('Reset to the worked example.');
    textInput('w')?.focus();
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
    }
  }

  // --- Start ---------------------------------------------------------------

  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  // There is nothing to submit — results are live — so Enter must not reload.
  root.addEventListener('submit', (event) => event.preventDefault());

  restoreFromUrl();
  render();
}
