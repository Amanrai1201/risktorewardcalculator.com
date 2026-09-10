import type { CurrencyCode } from './calc/types';

/**
 * All user-facing number formatting.
 *
 * Everything goes through `Intl` rather than hand-rolled string work, so
 * grouping and currency symbols follow the locale instead of being hardcoded.
 * Formatter construction is the expensive part, so instances are cached.
 */

const LOCALES: Record<CurrencyCode, string> = {
  // en-IN gives the lakh/crore grouping Indian traders expect.
  INR: 'en-IN',
  USD: 'en-US',
};

const cache = new Map<string, Intl.NumberFormat>();

function formatter(key: string, build: () => Intl.NumberFormat): Intl.NumberFormat {
  let existing = cache.get(key);
  if (!existing) {
    existing = build();
    cache.set(key, existing);
  }
  return existing;
}

export function currencySymbol(currency: CurrencyCode): string {
  return currency === 'INR' ? '₹' : '$';
}

/** Money, with the currency symbol and two decimals. */
export function formatMoney(
  value: number | null | undefined,
  currency: CurrencyCode = 'INR',
  options: { decimals?: number } = {},
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const decimals = options.decimals ?? 2;
  const key = `money:${currency}:${decimals}`;
  return formatter(
    key,
    () =>
      new Intl.NumberFormat(LOCALES[currency], {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
  ).format(value);
}

/**
 * Money with an explicit sign, for figures whose direction matters.
 * Losses are shown with a true minus sign, never a hyphen.
 */
export function formatSignedMoney(
  value: number | null | undefined,
  currency: CurrencyCode = 'INR',
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const magnitude = formatMoney(Math.abs(value), currency);
  if (value > 0) return `+${magnitude}`;
  if (value < 0) return `−${magnitude}`;
  return magnitude;
}

/** A plain number with grouping. */
export function formatNumber(
  value: number | null | undefined,
  currency: CurrencyCode = 'INR',
  options: { decimals?: number; maxDecimals?: number } = {},
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const min = options.decimals ?? 0;
  const max = options.maxDecimals ?? Math.max(min, 2);
  const key = `number:${currency}:${min}:${max}`;
  return formatter(
    key,
    () =>
      new Intl.NumberFormat(LOCALES[currency], {
        minimumFractionDigits: min,
        maximumFractionDigits: max,
      }),
  ).format(value);
}

/** A fraction of 1 rendered as a percentage. */
export function formatPercent(
  value: number | null | undefined,
  options: { decimals?: number } = {},
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const decimals = options.decimals ?? 1;
  const key = `percent:${decimals}`;
  return formatter(
    key,
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
  ).format(value);
}

/** A price, shown to the precision the instrument trades at. */
export function formatPrice(
  value: number | null | undefined,
  currency: CurrencyCode = 'INR',
  decimals = 2,
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatNumber(value, currency, { decimals, maxDecimals: decimals });
}

/**
 * A reward-to-risk ratio in its conventional `1 : n` form.
 * The spacing uses non-breaking spaces so the ratio never wraps mid-figure.
 */
export function formatRatio(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio) || ratio < 0) return '—';
  const n = formatNumber(ratio, 'INR', { decimals: 2, maxDecimals: 2 });
  return `1 : ${n}`;
}

/** Ratio without the leading `1 :`, for tight spaces. */
export function formatRatioShort(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio) || ratio < 0) return '—';
  return `${formatNumber(ratio, 'INR', { decimals: 2, maxDecimals: 2 })}R`;
}

/** Pips, to one decimal place. */
export function formatPips(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${formatNumber(value, 'USD', { decimals: 1, maxDecimals: 1 })} pips`;
}
