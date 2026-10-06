import { describe, expect, it } from 'vitest';
import { EVENT_DEFINITIONS, findDefinition, normalizeEventType } from '../../functions/lib/events';
import { config } from '../../functions/posthog-capture';

describe('event registry', () => {
  it('has unique keys and Swell events', () => {
    const keys = EVENT_DEFINITIONS.map((d) => d.key);
    const events = EVENT_DEFINITIONS.map((d) => d.swellEvent);
    expect(new Set(keys).size).toBe(11);
    expect(new Set(events).size).toBe(11);
  });

  it('matches the events the capture function subscribes to', () => {
    const subscribed = (config as unknown as { model: { events: string[] } }).model.events;
    expect([...subscribed].sort()).toEqual(EVENT_DEFINITIONS.map((d) => d.swellEvent).sort());
  });

  it('keeps only delivered, paused and resumed off by default', () => {
    expect(EVENT_DEFINITIONS.filter((d) => !d.defaultEnabled).map((d) => d.key).sort()).toEqual([
      'order_delivered',
      'subscription_paused',
      'subscription_resumed',
    ]);
  });

  it('finds definitions by plain or collection-prefixed event type', () => {
    expect(normalizeEventType('orders/order.submitted')).toBe('order.submitted');
    expect(findDefinition('order.submitted')?.key).toBe('order_completed');
    expect(findDefinition('payments:refunds/payment.refund.succeeded')?.key).toBe('order_refunded');
    expect(findDefinition('order.updated')).toBeUndefined();
    expect(findDefinition(undefined)).toBeUndefined();
  });
});
