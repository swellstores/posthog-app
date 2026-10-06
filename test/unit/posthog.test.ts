import { describe, expect, it, vi } from 'vitest';
import { capture, checkApiKey, type CaptureEvent, type FetchLike } from '../../functions/lib/posthog';

const connection = { apiKey: 'phc_test', host: 'https://us.i.posthog.com' };
const event: CaptureEvent = {
  event: 'Order Completed',
  distinct_id: 'acc_1',
  properties: { order_id: 'ord_1' },
  timestamp: '2026-10-06T00:00:00.000Z',
  uuid: '00000000-0000-8000-8000-000000000000',
};

function respond(status: number, body = '{}') {
  return vi.fn<FetchLike>(async () => new Response(body, { status }));
}

describe('capture', () => {
  it('posts the event with the project key to the capture endpoint', async () => {
    const fetchImpl = respond(200, '{"status":1}');

    await expect(capture(connection, event, fetchImpl)).resolves.toEqual({ ok: true });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://us.i.posthog.com/i/v0/e/');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ api_key: 'phc_test', ...event });
  });

  it('throws on 5xx so Swell retries the delivery', async () => {
    await expect(capture(connection, event, respond(503, 'unavailable'))).rejects.toThrow('503');
  });

  it('throws on 429 so Swell retries the delivery', async () => {
    await expect(capture(connection, event, respond(429))).rejects.toThrow('429');
  });

  it('throws when the network fails', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(capture(connection, event, fetchImpl)).rejects.toThrow(
      'PostHog request failed: fetch failed',
    );
  });

  it('returns other 4xx responses without throwing', async () => {
    await expect(capture(connection, event, respond(401, 'invalid key'))).resolves.toEqual({
      ok: false,
      status: 401,
      body: 'invalid key',
    });
  });
});

describe('checkApiKey', () => {
  it('asks the flags endpoint with the project key', async () => {
    const fetchImpl = respond(200);

    await expect(checkApiKey(connection, fetchImpl)).resolves.toBe('valid');

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://us.i.posthog.com/flags?v=2');
    expect(JSON.parse(init?.body as string)).toMatchObject({ api_key: 'phc_test' });
  });

  it('reports an invalid key on 401', async () => {
    await expect(checkApiKey(connection, respond(401))).resolves.toBe('invalid');
  });

  it('reports unknown on other failures', async () => {
    await expect(checkApiKey(connection, respond(500))).resolves.toBe('unknown');
    const offline = vi.fn<FetchLike>(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(checkApiKey(connection, offline)).resolves.toBe('unknown');
  });
});
