export const HOSTS = {
  us: 'https://us.i.posthog.com',
  eu: 'https://eu.i.posthog.com',
} as const;

export interface Connection {
  apiKey: string;
  /** Base URL without a trailing slash. */
  host: string;
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
 * Installed apps start with empty settings values, so an unset toggle means
 * the registry default, never "off".
 */
export function isEventEnabled(
  settings: SwellSettings | null | undefined,
  definition: { key: string; settingsGroup: string; defaultEnabled: boolean },
): boolean {
  const enabled = settings?.[definition.settingsGroup]?.[`${definition.key}_enabled`];
  return typeof enabled === 'boolean' ? enabled : definition.defaultEnabled;
}
