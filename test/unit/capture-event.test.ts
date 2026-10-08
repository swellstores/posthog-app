import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleEvent } from '../../functions/lib/capture-event';
import { eventUuid } from '../../functions/lib/identity';
import type { FetchLike } from '../../functions/lib/posthog';
import { createMockRequest } from '../helpers/mock-request';

const EVENT_ID = '6abfc4126e598735b533bf00';
const ORDER = {
  id: '6abfc4116e598735b533befa',
  number: '100089',
  account_id: '6abf974f6e598735b5335fd2',
  currency: 'USD',
  grand_total: 12,
  items: [],
};
const ACCOUNT = { id: ORDER.account_id, email: 'ivan@example.com', name: 'Ivan Petrov' };
const CONFIGURED = { connection: { api_key: 'phc_test' } };

function setup(options: { settings?: unknown; type?: string; account?: unknown; status?: number } = {}) {
  const get = vi.fn(async (url: string) => {
    if (url === '/orders/{id}') return ORDER;
    if (url === '/accounts/{id}') {
      if (options.account === null) throw new SwellError('Not found', { status: 404 });
      return options.account ?? ACCOUNT;
    }
    throw new Error(`unexpected GET ${url}`);
  });
  const settings = vi.fn(async () => (options.settings === undefined ? CONFIGURED : options.settings));
  const fetchImpl = vi.fn<FetchLike>(async () => new Response('{"status":1}', { status: options.status ?? 200 }));
  const req = createMockRequest({
    data: { id: ORDER.id, $event: { id: EVENT_ID, type: options.type ?? 'order.submitted', model: 'orders', data: {} } },
    store: { id: 'store_test' },
    swell: { get, settings },
  });
  const sentBody = () => JSON.parse(fetchImpl.mock.calls[0][1]?.body as string);
  return { req, get, fetchImpl, sentBody };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleEvent', () => {
  it('sends the mapped event with person, store and identity', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { req, fetchImpl, sentBody } = setup();

    await expect(handleEvent(req, fetchImpl)).resolves.toBe('sent');

    expect(fetchImpl.mock.calls[0][0]).toBe('https://us.i.posthog.com/i/v0/e/');
    expect(sentBody()).toEqual({
      api_key: 'phc_test',
      event: 'Order Completed',
      distinct_id: ORDER.account_id,
      properties: {
        order_id: ORDER.id,
        order_number: '100089',
        total: 12,
        currency: 'USD',
        guest: false,
        products: [],
        $set: { email: 'ivan@example.com', name: 'Ivan Petrov' },
        swell_store_id: 'store_test',
      },
      timestamp: new Date(0x6abfc412 * 1000).toISOString(),
      uuid: await eventUuid(EVENT_ID),
    });
  });

  it('always uses the default event name, ignoring names saved by older versions', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { req, fetchImpl, sentBody } = setup({
      settings: { ...CONFIGURED, events: { order_completed_name: 'purchase' } },
    });
    await handleEvent(req, fetchImpl);
    expect(sentBody().event).toBe('Order Completed');
  });

  it('sends the same uuid when Swell retries the same event', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const first = setup();
    const second = setup();
    await handleEvent(first.req, first.fetchImpl);
    await handleEvent(second.req, second.fetchImpl);
    expect(first.sentBody().uuid).toBe(second.sentBody().uuid);
  });

  it('skips silently until the app is configured', async () => {
    for (const settings of [{}, null, { connection: { api_key: '' } }]) {
      const { req, get, fetchImpl } = setup({ settings });
      await expect(handleEvent(req, fetchImpl)).resolves.toBe('skipped:not-configured');
      expect(get).not.toHaveBeenCalled();
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it('skips events the merchant turned off', async () => {
    const { req, fetchImpl } = setup({ settings: { ...CONFIGURED, orders: { order_completed_enabled: false } } });
    await expect(handleEvent(req, fetchImpl)).resolves.toBe('skipped:disabled');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('skips event types it does not know', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { req, fetchImpl } = setup({ type: 'order.updated' });
    await expect(handleEvent(req, fetchImpl)).resolves.toBe('skipped:unknown-event');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('still sends the event when the account was deleted', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { req, fetchImpl, sentBody } = setup({ account: null });
    await expect(handleEvent(req, fetchImpl)).resolves.toBe('sent');
    expect(sentBody().properties.$set).toEqual({});
  });

  it('logs and returns when PostHog rejects the event', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { req, fetchImpl } = setup({ status: 401 });
    await expect(handleEvent(req, fetchImpl)).resolves.toBe('rejected');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('401'));
  });

  it('throws when PostHog is down so Swell retries', async () => {
    const { req, fetchImpl } = setup({ status: 503 });
    await expect(handleEvent(req, fetchImpl)).rejects.toThrow('503');
  });
});
