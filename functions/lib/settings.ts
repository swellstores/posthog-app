export const HOSTS = {
  us: 'https://us.i.posthog.com',
  eu: 'https://eu.i.posthog.com',
} as const;

export interface Connection {
  apiKey: string;
  /** Base URL without a trailing slash. */
  host: string;
}

export interface EventToggle {
  enabled: boolean;
  name: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Returns null until the merchant has entered a key (and a URL, for a custom host). */
export function readConnection(settings: SwellSettings | null | undefined): Connection | null {
  const connection = settings?.connection ?? {};
  const apiKey = text(connection.api_key);
  const choice = text(connection.host) || 'us';
  const host = (
    choice === 'custom' ? text(connection.custom_host) : HOSTS[choice as keyof typeof HOSTS] ?? HOSTS.us
  ).replace(/\/+$/, '');

  if (!apiKey || !host) {
    return null;
  }
  return { apiKey, host };
}

/**
 * Installed apps start with empty settings values, so an unset toggle or name
 * means the registry default, never "off". Saved names apply only while
 * "Rename events" is on: the form hides them otherwise.
 */
export function resolveEvent(
  settings: SwellSettings | null | undefined,
  definition: { key: string; defaultName: string; defaultEnabled: boolean },
): EventToggle {
  const events = settings?.events ?? {};
  const enabled = events[`${definition.key}_enabled`];
  const customName = events.custom_names === true ? text(events[`${definition.key}_name`]) : '';
  return {
    enabled: typeof enabled === 'boolean' ? enabled : definition.defaultEnabled,
    name: customName || definition.defaultName,
  };
}
