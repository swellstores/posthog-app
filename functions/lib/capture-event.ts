import { findDefinition, normalizeEventType } from './events';
import { eventUuid, timestampFromObjectId } from './identity';
import { capture, type FetchLike } from './posthog';
import { isEventEnabled, readConnection } from './settings';
import { fetchPerson } from './swell';

export type HandleOutcome =
  | 'sent'
  | 'rejected'
  | 'skipped:unknown-event'
  | 'skipped:not-configured'
  | 'skipped:disabled'
  | 'skipped:filtered';

/** Turns one Swell model event into one PostHog event. */
export async function handleEvent(req: SwellRequest, fetchImpl?: FetchLike): Promise<HandleOutcome> {
  const eventType = normalizeEventType(req.data.$event?.type);
  const definition = findDefinition(eventType);
  if (!definition) {
    console.warn(`[posthog] Unsupported event type "${eventType}"`);
    return 'skipped:unknown-event';
  }

  const settings = await req.swell.settings();
  const connection = readConnection(settings);
  if (!connection) {
    return 'skipped:not-configured';
  }

  if (!isEventEnabled(settings, definition)) {
    return 'skipped:disabled';
  }
  const name = definition.defaultName;

  const mapped = await definition.map(req);
  if (!mapped?.distinctId) {
    return 'skipped:filtered';
  }

  const person = await fetchPerson(req, mapped.distinctId);
  const eventId = req.data.$event?.id;
  const result = await capture(
    connection,
    {
      event: name,
      distinct_id: mapped.distinctId,
      properties: { ...mapped.properties, $set: person, swell_store_id: req.store.id },
      timestamp: (eventId && timestampFromObjectId(eventId)) || new Date().toISOString(),
      uuid: eventId ? await eventUuid(eventId) : crypto.randomUUID(),
    },
    fetchImpl,
  );

  // Explicit comparison: without `strict`, `!result.ok` does not narrow the union.
  if (result.ok === false) {
    console.error(`[posthog] PostHog rejected "${name}" (${result.status}): ${result.body}`);
    return 'rejected';
  }
  console.log(`[posthog] Sent "${name}" for ${mapped.distinctId}`);
  return 'sent';
}
