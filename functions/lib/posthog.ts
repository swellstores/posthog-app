import type { Connection } from './settings';

/** Leaves room for the Swell API calls inside the 10 s function limit. */
export const CAPTURE_TIMEOUT_MS = 5000;

export interface CaptureEvent {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp: string;
  uuid: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type CaptureResult = { ok: true } | { ok: false; status: number; body: string };

export type KeyCheck = 'valid' | 'invalid' | 'unknown';

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

function postJson(url: string, body: unknown, fetchImpl: FetchLike): Promise<Response> {
  return fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
  });
}

/**
 * Sends one event. Transient failures throw so Swell retries the delivery;
 * other 4xx responses are returned, because a retry cannot fix them and
 * sustained failures would auto-disable the function.
 */
export async function capture(
  connection: Connection,
  event: CaptureEvent,
  fetchImpl: FetchLike = defaultFetch,
): Promise<CaptureResult> {
  let response: Response;
  try {
    response = await postJson(
      `${connection.host}/i/v0/e/`,
      { api_key: connection.apiKey, ...event },
      fetchImpl,
    );
  } catch (error) {
    throw new SwellError(
      `PostHog request failed: ${error instanceof Error ? error.message : String(error)}`,
      { status: 502 },
    );
  }

  if (response.ok) {
    return { ok: true };
  }

  const body = (await response.text()).slice(0, 500);
  if (response.status >= 500 || response.status === 429) {
    throw new SwellError(`PostHog responded ${response.status}: ${body}`, { status: 502 });
  }
  return { ok: false, status: response.status, body };
}

/** The capture endpoint accepts unknown keys silently; the flags endpoint rejects them. */
export async function checkApiKey(
  connection: Connection,
  fetchImpl: FetchLike = defaultFetch,
): Promise<KeyCheck> {
  try {
    const response = await postJson(
      `${connection.host}/flags?v=2`,
      { api_key: connection.apiKey, distinct_id: 'swell-key-check' },
      fetchImpl,
    );
    if (response.ok) {
      return 'valid';
    }
    return response.status === 401 ? 'invalid' : 'unknown';
  } catch {
    return 'unknown';
  }
}
