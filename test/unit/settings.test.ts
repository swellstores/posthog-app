import { describe, expect, it } from 'vitest';
import { readConnection, resolveEvent } from '../../functions/lib/settings';

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

describe('resolveEvent', () => {
  const onByDefault = { key: 'order_completed', defaultName: 'Order Completed', defaultEnabled: true };
  const offByDefault = { key: 'order_delivered', defaultName: 'Order Delivered', defaultEnabled: false };

  it('uses registry defaults when nothing is saved', () => {
    expect(resolveEvent(undefined, onByDefault)).toEqual({ enabled: true, name: 'Order Completed' });
    expect(resolveEvent({}, offByDefault)).toEqual({ enabled: false, name: 'Order Delivered' });
  });

  it('respects a saved toggle in both directions', () => {
    expect(resolveEvent({ events: { order_completed_enabled: false } }, onByDefault).enabled).toBe(false);
    expect(resolveEvent({ events: { order_delivered_enabled: true } }, offByDefault).enabled).toBe(true);
  });

  it('uses a custom name, trimmed, while renaming is on', () => {
    expect(
      resolveEvent({ events: { custom_names: true, order_completed_name: '  purchase  ' } }, onByDefault).name,
    ).toBe('purchase');
  });

  it('ignores saved names while renaming is off', () => {
    expect(resolveEvent({ events: { order_completed_name: 'purchase' } }, onByDefault).name).toBe(
      'Order Completed',
    );
    expect(
      resolveEvent({ events: { custom_names: false, order_completed_name: 'purchase' } }, onByDefault).name,
    ).toBe('Order Completed');
  });

  it('falls back to the default name for an empty name', () => {
    expect(
      resolveEvent({ events: { custom_names: true, order_completed_name: '   ' } }, onByDefault).name,
    ).toBe('Order Completed');
  });
});
