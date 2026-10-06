import { describe, expect, it, vi } from 'vitest';
import {
  subscriptionCancelled,
  subscriptionPaused,
  subscriptionPaymentFailed,
  subscriptionRenewed,
  subscriptionResumed,
  subscriptionStarted,
} from '../../functions/lib/events/subscription';
import { createMockRequest } from '../helpers/mock-request';

const SUBSCRIPTION = {
  id: '69e60d4877b97e59f3ca8e7b',
  account_id: '69494f501ad1b7313b97083d',
  order_id: '69e60d4477b97e59f3ca8d15',
  draft: null,
  plan_id: '68da6459d0272f1848ec1669',
  plan_name: 'Monthly',
  product_id: '68da648515e9174fc3ac1b4e',
  product_name: 'Physical subs',
  variant_name: 'Red',
  price: 10,
  recurring_total: 10,
  currency: 'EUR',
  interval: 'monthly',
  interval_count: 1,
  trial: false,
  cancel_reason: null,
};

const EXPECTED_PROPERTIES = {
  subscription_id: SUBSCRIPTION.id,
  plan_id: SUBSCRIPTION.plan_id,
  plan: 'Monthly',
  product_id: SUBSCRIPTION.product_id,
  product: 'Physical subs',
  variant: 'Red',
  price: 10,
  recurring_total: 10,
  currency: 'EUR',
  interval: 'monthly',
  interval_count: 1,
  trial: false,
};

function requestFor(subscription: unknown, eventData: Record<string, unknown> = {}) {
  const get = vi.fn(async (url: string) => {
    if (url === '/subscriptions/{id}') return subscription;
    throw new Error(`unexpected GET ${url}`);
  });
  return createMockRequest({
    data: {
      id: SUBSCRIPTION.id,
      $event: { id: '69e60d4977b97e59f3ca8f00', type: 'subscription.paid', model: 'subscriptions', data: eventData },
    },
    swell: { get },
  });
}

describe('subscription events', () => {
  it('declare their Swell events and defaults', () => {
    const definitions = [subscriptionStarted, subscriptionRenewed, subscriptionPaymentFailed, subscriptionCancelled, subscriptionPaused, subscriptionResumed];
    expect(definitions.map((d) => [d.key, d.swellEvent, d.defaultName, d.defaultEnabled])).toEqual([
      ['subscription_started', 'subscription.created', 'Subscription Started', true],
      ['subscription_renewed', 'subscription.paid', 'Subscription Renewed', true],
      ['subscription_payment_failed', 'subscription.payment_failed', 'Subscription Payment Failed', true],
      ['subscription_cancelled', 'subscription.canceled', 'Subscription Cancelled', true],
      ['subscription_paused', 'subscription.paused', 'Subscription Paused', false],
      ['subscription_resumed', 'subscription.resumed', 'Subscription Resumed', false],
    ]);
  });

  it('maps a started subscription to plan properties without revenue', async () => {
    await expect(subscriptionStarted.map(requestFor(SUBSCRIPTION))).resolves.toEqual({
      distinctId: SUBSCRIPTION.account_id,
      properties: EXPECTED_PROPERTIES,
    });
  });

  it('skips draft subscriptions', async () => {
    await expect(subscriptionStarted.map(requestFor({ ...SUBSCRIPTION, draft: true }))).resolves.toBeNull();
  });

  it('does not count the first payment, made through the initial order, as a renewal', async () => {
    await expect(
      subscriptionRenewed.map(requestFor(SUBSCRIPTION, { id: SUBSCRIPTION.id, order_id: SUBSCRIPTION.order_id })),
    ).resolves.toBeNull();
  });

  it('counts later payments as renewals', async () => {
    const byInvoice = await subscriptionRenewed.map(requestFor(SUBSCRIPTION, { id: SUBSCRIPTION.id }));
    expect(byInvoice?.properties).toEqual(EXPECTED_PROPERTIES);

    const byRenewalOrder = await subscriptionRenewed.map(
      requestFor(SUBSCRIPTION, { id: SUBSCRIPTION.id, order_id: 'renewal_order' }),
    );
    expect(byRenewalOrder).not.toBeNull();
  });

  it('adds the cancel reason to cancellations', async () => {
    const mapped = await subscriptionCancelled.map(requestFor({ ...SUBSCRIPTION, cancel_reason: 'too expensive' }));
    expect(mapped?.properties).toEqual({ ...EXPECTED_PROPERTIES, cancel_reason: 'too expensive' });
  });

  it('maps failed payments, pauses and resumes with the shared properties', async () => {
    for (const definition of [subscriptionPaymentFailed, subscriptionPaused, subscriptionResumed]) {
      await expect(definition.map(requestFor(SUBSCRIPTION))).resolves.toEqual({
        distinctId: SUBSCRIPTION.account_id,
        properties: EXPECTED_PROPERTIES,
      });
    }
  });

  it('skips a subscription that was deleted', async () => {
    await expect(subscriptionCancelled.map(requestFor(null))).resolves.toBeNull();
  });
});
