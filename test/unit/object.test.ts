import { describe, expect, it } from 'vitest';
import { compact } from '../../functions/lib/object';

describe('compact', () => {
  it('drops null and undefined values', () => {
    expect(compact({ a: 1, b: null, c: undefined })).toEqual({ a: 1 });
  });

  it('keeps falsy values that carry meaning', () => {
    expect(compact({ zero: 0, no: false, empty: '' })).toEqual({ zero: 0, no: false, empty: '' });
  });
});
