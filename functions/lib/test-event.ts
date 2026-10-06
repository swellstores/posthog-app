import { capture, checkApiKey, type FetchLike } from './posthog';
import { readConnection } from './settings';

export const TEST_EVENT_NAME = 'Swell Test Event';

/** Backs the "Send test event" button; always answers with a message for the dashboard. */
export async function sendTestEvent(req: SwellRequest, fetchImpl?: FetchLike): Promise<{ message: string }> {
  const connection = readConnection(await req.swell.settings());
  if (!connection) {
    return { message: 'Enter your PostHog project API key, save the settings, then send the test event.' };
  }

  if ((await checkApiKey(connection, fetchImpl)) === 'invalid') {
    return {
      message:
        'PostHog rejected this project API key. Copy it from PostHog → Project settings → Project API key.',
    };
  }

  try {
    const result = await capture(
      connection,
      {
        event: TEST_EVENT_NAME,
        distinct_id: `swell-test-${req.store.id}`,
        properties: { swell_store_id: req.store.id },
        timestamp: new Date().toISOString(),
        uuid: crypto.randomUUID(),
      },
      fetchImpl,
    );
    // Explicit comparison: without `strict`, `!result.ok` does not narrow the union.
    if (result.ok === false) {
      return { message: `PostHog rejected the test event (${result.status}): ${result.body}` };
    }
  } catch (error) {
    return {
      message: `Could not reach PostHog at ${connection.host}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return { message: 'Test event sent. Open PostHog → Activity to see it.' };
}
