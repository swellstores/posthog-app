import { compact } from './object';
import type { Person } from './types';

/** Id of the record the event is about. */
export function eventRecordId(req: SwellRequest): string | undefined {
  const id = req.data.id ?? req.data.$event?.data?.id;
  return typeof id === 'string' && id ? id : undefined;
}

/** Loads the current record; null when it was deleted since the event fired. */
export async function fetchRecord<T>(
  req: SwellRequest,
  collection: string,
  id: string,
  query: Record<string, unknown> = {},
): Promise<T | null> {
  try {
    const record = await req.swell.get(`${collection}/{id}`, { ...query, id });
    return (record ?? null) as T | null;
  } catch (error) {
    if ((error as { status?: number } | null)?.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Person properties for PostHog `$set`; empty when the account is gone. */
export async function fetchPerson(req: SwellRequest, accountId: string): Promise<Person> {
  const account = await fetchRecord<{ email?: string | null; name?: string | null }>(
    req,
    '/accounts',
    accountId,
    { fields: 'email,name' },
  );
  return compact({ email: account?.email, name: account?.name }) as Person;
}
