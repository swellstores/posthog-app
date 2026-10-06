import { compact } from '../object';
import { eventRecordId, fetchRecord } from '../swell';
import type { EventDefinition, EventKey, Properties } from '../types';

interface SwellSubscription {
  id: string;
  account_id: string;
  /** The order that created the subscription and paid its first period. */
  order_id?: string | null;
  draft?: boolean | null;
  plan_id?: string | null;
  plan_name?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  variant_name?: string | null;
  price?: number | null;
  recurring_total?: number | null;
  currency?: string | null;
  interval?: string | null;
  interval_count?: number | null;
  trial?: boolean | null;
  cancel_reason?: string | null;
}

/** No `revenue`: subscription charges are counted by Payment Completed. */
export function subscriptionProperties(subscription: SwellSubscription): Properties {
  return compact({
    subscription_id: subscription.id,
    plan_id: subscription.plan_id,
    plan: subscription.plan_name,
    product_id: subscription.product_id,
    product: subscription.product_name,
    variant: subscription.variant_name,
    price: subscription.price,
    recurring_total: subscription.recurring_total,
    currency: subscription.currency,
    interval: subscription.interval,
    interval_count: subscription.interval_count,
    trial: Boolean(subscription.trial),
  });
}

/** The first `subscription.paid` comes from the initial order: a purchase, not a renewal. */
export function isInitialPayment(subscription: SwellSubscription, req: SwellRequest): boolean {
  const payingOrderId = req.data.$event?.data?.order_id;
  return Boolean(payingOrderId) && payingOrderId === subscription.order_id;
}

function defineSubscriptionEvent(options: {
  key: EventKey;
  swellEvent: string;
  defaultName: string;
  defaultEnabled: boolean;
  skip?: (subscription: SwellSubscription, req: SwellRequest) => boolean;
  extra?: (subscription: SwellSubscription) => Properties;
}): EventDefinition {
  const { skip, extra, ...definition } = options;
  return {
    ...definition,
    async map(req) {
      const id = eventRecordId(req);
      const subscription = id ? await fetchRecord<SwellSubscription>(req, '/subscriptions', id) : null;
      if (!subscription || skip?.(subscription, req)) {
        return null;
      }
      return {
        distinctId: subscription.account_id,
        properties: { ...subscriptionProperties(subscription), ...extra?.(subscription) },
      };
    },
  };
}

export const subscriptionStarted = defineSubscriptionEvent({
  key: 'subscription_started',
  swellEvent: 'subscription.created',
  defaultName: 'Subscription Started',
  defaultEnabled: true,
  skip: (subscription) => subscription.draft === true,
});

export const subscriptionRenewed = defineSubscriptionEvent({
  key: 'subscription_renewed',
  swellEvent: 'subscription.paid',
  defaultName: 'Subscription Renewed',
  defaultEnabled: true,
  skip: isInitialPayment,
});

export const subscriptionPaymentFailed = defineSubscriptionEvent({
  key: 'subscription_payment_failed',
  swellEvent: 'subscription.payment_failed',
  defaultName: 'Subscription Payment Failed',
  defaultEnabled: true,
});

export const subscriptionCancelled = defineSubscriptionEvent({
  key: 'subscription_cancelled',
  swellEvent: 'subscription.canceled',
  defaultName: 'Subscription Cancelled',
  defaultEnabled: true,
  extra: (subscription) => compact({ cancel_reason: subscription.cancel_reason }),
});

export const subscriptionPaused = defineSubscriptionEvent({
  key: 'subscription_paused',
  swellEvent: 'subscription.paused',
  defaultName: 'Subscription Paused',
  defaultEnabled: false,
});

export const subscriptionResumed = defineSubscriptionEvent({
  key: 'subscription_resumed',
  swellEvent: 'subscription.resumed',
  defaultName: 'Subscription Resumed',
  defaultEnabled: false,
});
