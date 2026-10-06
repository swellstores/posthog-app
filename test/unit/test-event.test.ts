import { describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '../../functions/lib/posthog';
import { sendTestEvent } from '../../functions/lib/test-event';
import { createMockRequest } from '../helpers/mock-request';

const CONFIGURED = { connection: { api_key: 'phc_test', host: 'eu' } };

function requestWith(settings: unknown) {
  return createMockRequest({ store: { id: 'store_test' }, swell: { settings: vi.fn(async () => settings) } });
}

function posthog(flagsStatus: number, captureStatus = 200) {
  return vi.fn<FetchLike>(async (url) =>
    url.includes('/flags')
      ? new Response('{}', { status: flagsStatus })
      : new Response(captureStatus === 200 ? '{"status":1}' : 'bad request', { status: captureStatus }),
  );
}

describe('sendTestEvent', () => {
  it('asks for the key when the app is not configured', async () => {
    const fetchImpl = posthog(200);
    const result = await sendTestEvent(requestWith({}), fetchImpl);
    expect(result.message).toContain('Enter your PostHog project API key');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports a key PostHog rejects without sending', async () => {
    const fetchImpl = posthog(401);
    const result = await sendTestEvent(requestWith(CONFIGURED), fetchImpl);
    expect(result.message).toContain('rejected this project API key');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('sends a test event to the configured host', async () => {
    const fetchImpl = posthog(200);
    const result = await sendTestEvent(requestWith(CONFIGURED), fetchImpl);

    expect(result.message).toContain('Test event sent');
    const [url, init] = fetchImpl.mock.calls[1];
    expect(url).toBe('https://eu.i.posthog.com/i/v0/e/');
    expect(JSON.parse(init?.body as string)).toMatchObject({
      api_key: 'phc_test',
      event: 'Swell Test Event',
      distinct_id: 'swell-test-store_test',
      properties: { swell_store_id: 'store_test' },
    });
  });

  it('still sends when the key check is inconclusive', async () => {
    const result = await sendTestEvent(requestWith(CONFIGURED), posthog(500));
    expect(result.message).toContain('Test event sent');
  });

  it('reports a rejected test event', async () => {
    const result = await sendTestEvent(requestWith(CONFIGURED), posthog(200, 400));
    expect(result.message).toContain('(400)');
  });

  it('reports an unreachable host instead of failing', async () => {
    const offline = vi.fn<FetchLike>(async () => {
      throw new TypeError('fetch failed');
    });
    const result = await sendTestEvent(requestWith(CONFIGURED), offline);
    expect(result.message).toContain('Could not reach PostHog at https://eu.i.posthog.com');
  });
});
