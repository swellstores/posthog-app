export type EventKey =
  | 'order_completed'
  | 'order_cancelled'
  | 'order_delivered'
  | 'payment_completed'
  | 'order_refunded'
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_payment_failed'
  | 'subscription_cancelled'
  | 'subscription_paused'
  | 'subscription_resumed';

export type SettingsGroup = 'orders' | 'revenue' | 'subscriptions';

export type Properties = Record<string, unknown>;

export interface MappedEvent {
  /** Swell account id of the customer. */
  distinctId: string;
  properties: Properties;
}

export interface EventDefinition {
  /** Prefix of the `<key>_enabled` settings field. */
  key: EventKey;
  /** Settings file (`settings/<group>.json`) that holds the event's toggle. */
  settingsGroup: SettingsGroup;
  /** Swell event type, as listed in the capture function's `model.events`. */
  swellEvent: string;
  defaultName: string;
  defaultEnabled: boolean;
  /** Loads the record and builds the event, or returns null to skip it. */
  map(req: SwellRequest): Promise<MappedEvent | null>;
}

export interface Person {
  email?: string;
  name?: string;
}
