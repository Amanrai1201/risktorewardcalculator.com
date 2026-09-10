/**
 * Calculator state in the URL.
 *
 * Keeping the inputs in the query string makes every result shareable and
 * deep-linkable, and it doubles as the share feature — there is no separate
 * "save" concept to maintain. The pure encode/decode pair is browser-free so it
 * can be tested; the two thin wrappers below are the only parts that touch
 * `location` and `history`.
 */

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
