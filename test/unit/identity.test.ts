import { describe, expect, it } from 'vitest';
import { eventUuid, timestampFromObjectId } from '../../functions/lib/identity';

const EVENT_ID = '6abfc4116e598735b533befa';

describe('eventUuid', () => {
  it('returns the same uuid for the same Swell event, so retries deduplicate', async () => {
    expect(await eventUuid(EVENT_ID)).toBe(await eventUuid(EVENT_ID));
  });

  it('returns different uuids for different events', async () => {
    expect(await eventUuid(EVENT_ID)).not.toBe(await eventUuid('6abfc4116e598735b533befb'));
  });

  it('formats an RFC 9562 version 8 uuid', async () => {
    expect(await eventUuid(EVENT_ID)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('timestampFromObjectId', () => {
  it('reads the creation second embedded in an ObjectId', () => {
    expect(timestampFromObjectId(EVENT_ID)).toBe(new Date(0x6abfc411 * 1000).toISOString());
  });

  it('returns null for ids that are not ObjectIds', () => {
    expect(timestampFromObjectId('evt_123')).toBeNull();
    expect(timestampFromObjectId('')).toBeNull();
  });
});
