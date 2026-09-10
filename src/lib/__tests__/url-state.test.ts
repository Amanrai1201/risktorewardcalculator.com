import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, pickOption } from '../url-state';

describe('encodeState', () => {
  it('serialises the fields that hold a value', () => {
    expect(encodeState({ d: 'long', e: 100, sl: 95, tp: 115, q: 500 })).toBe(
      'd=long&e=100&sl=95&tp=115&q=500',
    );
  });

  it('drops empty, null and non-finite values', () => {
    expect(encodeState({ d: 'long', e: null, sl: '', tp: undefined, q: Number.NaN })).toBe(
      'd=long',
    );
  });

  it('produces an empty string for empty state', () => {
    expect(encodeState({})).toBe('');
  });
});

describe('decodeState', () => {
  it('reads a query string with or without the leading question mark', () => {
    expect(decodeState('?d=short&e=250')).toEqual({ d: 'short', e: '250' });
    expect(decodeState('d=short&e=250')).toEqual({ d: 'short', e: '250' });
  });

  it('ignores keys with no value', () => {
    expect(decodeState('?d=long&e=')).toEqual({ d: 'long' });
  });

  it('round-trips through encodeState', () => {
    const state = { d: 'long', e: '100', sl: '95' };
    expect(decodeState(encodeState(state))).toEqual(state);
  });
});

describe('pickOption', () => {
  const directions = ['long', 'short'] as const;

  it('accepts a known option', () => {
    expect(pickOption('short', directions, 'long')).toBe('short');
  });

  it('falls back when the URL has been hand-edited', () => {
    expect(pickOption('sideways', directions, 'long')).toBe('long');
    expect(pickOption(undefined, directions, 'long')).toBe('long');
  });
});
