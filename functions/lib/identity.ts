const OBJECT_ID = /^[0-9a-f]{24}$/i;

/**
 * Deterministic event uuid: a Swell retry of the same event yields the same uuid,
 * and PostHog drops the duplicate.
 */
export async function eventUuid(eventId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`posthog:${eventId}`),
  );
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80; // version 8 (custom hash)
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 9562 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Swell event ids are ObjectIds; their first 4 bytes are the creation time in seconds. */
export function timestampFromObjectId(id: string): string | null {
  if (!OBJECT_ID.test(id)) {
    return null;
  }
  return new Date(parseInt(id.slice(0, 8), 16) * 1000).toISOString();
}
