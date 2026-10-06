import type { EventDefinition } from '../types';
import { orderCancelled, orderCompleted, orderDelivered } from './order';
import { orderRefunded } from './order-refunded';
import { paymentCompleted } from './payment-completed';
import {
  subscriptionCancelled,
  subscriptionPaused,
  subscriptionPaymentFailed,
  subscriptionRenewed,
  subscriptionResumed,
  subscriptionStarted,
} from './subscription';

/** Order matches the settings form. Keep in sync with `posthog-capture.ts` `model.events`. */
export const EVENT_DEFINITIONS: readonly EventDefinition[] = [
  orderCompleted,
  orderCancelled,
  orderDelivered,
  paymentCompleted,
  orderRefunded,
  subscriptionStarted,
  subscriptionRenewed,
  subscriptionPaymentFailed,
  subscriptionCancelled,
  subscriptionPaused,
  subscriptionResumed,
];

/** Swell may prefix the type with its collection, e.g. `orders/order.submitted`. */
export function normalizeEventType(type: string | undefined): string {
  return (type ?? '').split('/').pop() ?? '';
}

export function findDefinition(type: string | undefined): EventDefinition | undefined {
  const eventType = normalizeEventType(type);
  return EVENT_DEFINITIONS.find((definition) => definition.swellEvent === eventType);
}
