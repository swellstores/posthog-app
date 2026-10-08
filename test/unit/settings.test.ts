import { describe, expect, it } from 'vitest';
import { isEventEnabled, readConnection } from '../../functions/lib/settings';

describe('readConnection', () => {
  it('is null on a fresh install', () => {
    expect(readConnection(undefined)).toBeNull();
    expect(readConnection(null)).toBeNull();
    expect(readConnection({})).toBeNull();
    expect(readConnection({ connection: {} })).toBeNull();
  });

  it('defaults to US Cloud', () => {
    expect(readConnection({ connection: { api_key: 'phc_abc' } })).toEqual({
      apiKey: 'phc_abc',
      host: 'https://us.i.posthog.com',
    });
  });

  it('resolves EU Cloud', () => {
    expect(readConnection({ connection: { api_key: 'phc_abc', host: 'eu' } })?.host).toBe(
      'https://eu.i.posthog.com',
    );
  });

  it('uses a custom host without surrounding spaces or trailing slashes', () => {
    expect(
      readConnection({
        connection: { api_key: 'phc_abc', host: 'custom', custom_host: ' https://ph.example.com// ' },
      }),
    ).toEqual({ apiKey: 'phc_abc', host: 'https://ph.example.com' });
  });

  it('trims a pasted key', () => {
    expect(readConnection({ connection: { api_key: '  phc_abc\n' } })?.apiKey).toBe('phc_abc');
  });

  it('is null when custom is chosen without a URL', () => {
    expect(readConnection({ connection: { api_key: 'phc_abc', host: 'custom' } })).toBeNull();
    expect(
      readConnection({ connection: { api_key: 'phc_abc', host: 'custom', custom_host: '   ' } }),
    ).toBeNull();
  });

  it('falls back to US Cloud for an unknown host value', () => {
    expect(readConnection({ connection: { api_key: 'phc_abc', host: 'mars' } })?.host).toBe(
      'https://us.i.posthog.com',
    );
  });
});

describe('isEventEnabled', () => {
  const onByDefault = { key: 'order_completed', defaultEnabled: true };
  const offByDefault = { key: 'order_delivered', defaultEnabled: false };

  it('uses the registry default when nothing is saved', () => {
    expect(isEventEnabled(undefined, onByDefault)).toBe(true);
    expect(isEventEnabled({}, offByDefault)).toBe(false);
  });

  it('respects a saved toggle in both directions', () => {
    expect(isEventEnabled({ events: { order_completed_enabled: false } }, onByDefault)).toBe(false);
    expect(isEventEnabled({ events: { order_delivered_enabled: true } }, offByDefault)).toBe(true);
  });
});
