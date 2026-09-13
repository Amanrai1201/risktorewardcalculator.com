/**
 * Calculator state in the URL.
 *
 * Keeping the inputs in the query string makes every result shareable and
 * deep-linkable, and it doubles as the share feature — there is no separate
 * "save" concept to maintain. The pure encode/decode pair is browser-free so it
 * can be tested; the two thin wrappers below are the only parts that touch
 * `location` and `history`.
 */

import { parseNumeric } from './calc/num';

export type StateValue = string | number | null | undefined;

/** Serialise state to a query string, dropping anything empty. */
export function encodeState(state: Record<string, StateValue>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(state)) {
    if (value == null || value === '') continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    params.set(key, String(value));
  }

  return params.toString();
}

/** Read a query string into a plain record of raw strings. */
export function decodeState(search: string): Record<string, string> {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const state: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    if (value !== '') state[key] = value;
  }

  return state;
}

/**
 * Pick a value that must be one of a known set.
 * Anything unrecognised falls back, so a hand-edited URL cannot break the form.
 */
export function pickOption<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** One purchase row of the stock average calculator. */
export interface LotPair {
  price: number | null;
  quantity: number | null;
}

/**
 * The purchase rows as a single parameter, `price x quantity` per row:
 * `150x200,120x300`.
 *
 * One key rather than `p1`/`q1`/`p2`/`q2` keeps a shared link short and stable
 * however many rows are added or removed. Parsed numbers are encoded rather
 * than the raw field text, because a quantity typed as `1,20,000` would
 * otherwise collide with the row separator.
 */
export function encodeLots(lots: LotPair[]): string {
  const rows: string[] = [];

  for (const lot of lots) {
    if (lot.price == null && lot.quantity == null) continue;
    rows.push(`${lot.price ?? ''}x${lot.quantity ?? ''}`);
  }

  return rows.join(',');
}

/** Read the rows back, skipping anything that is not a pair of numbers. */
export function decodeLots(raw: string | undefined): { price: number; quantity: number }[] {
  if (!raw) return [];

  const lots: { price: number; quantity: number }[] = [];

  for (const row of raw.split(',')) {
    const [price, quantity] = row.split('x').map((part) => parseNumeric(part));
    if (price == null || quantity == null) continue;
    lots.push({ price, quantity });
  }

  return lots;
}

/** Current query state, or an empty record outside the browser. */
export function readUrlState(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return decodeState(window.location.search);
}

/**
 * Replace the query string without adding a history entry, so typing in the
 * form does not fill up the back button.
 */
export function writeUrlState(state: Record<string, StateValue>): void {
  if (typeof window === 'undefined') return;

  const query = encodeState(state);
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', next);
}

/** Absolute URL for the current state, for the copy-link button. */
export function shareUrl(state: Record<string, StateValue>): string {
  if (typeof window === 'undefined') return '';
  const query = encodeState(state);
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
}
