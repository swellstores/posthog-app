import { toMinorUnits } from '../money';
import { compact } from '../object';
import { eventRecordId, fetchRecord } from '../swell';
import type { EventDefinition } from '../types';
import { NON_REVENUE_METHODS } from './payment-completed';

interface SwellRefund {
  id: string;
  parent_id: string;
  /** Not always set on the refund record; the parent payment always has it. */
  account_id?: string | null;
  /** Method of the refunded payment, e.g. `card` or `account`. */
  method?: string | null;
  amount?: number | null;
  currency?: string | null;
  success?: boolean | null;
  order_id?: string | null;
  subscription_id?: string | null;
  reason?: string | null;
}

/** One event per refund (partial ones too), unlike `order.refunded`, which fires only on a full refund. */
export const orderRefunded: EventDefinition = {
  key: 'order_refunded',
  settingsGroup: 'revenue',
  swellEvent: 'payment.refund.succeeded',
  defaultName: 'Order Refunded',
  defaultEnabled: true,
  async map(req) {
    const id = eventRecordId(req);
    const refund = id ? await fetchRecord<SwellRefund>(req, '/payments:refunds', id) : null;
    // Refunding a charge that was never counted as revenue must not subtract any.
    if (!refund || refund.success !== true || NON_REVENUE_METHODS.has(refund.method ?? '')) {
      return null;
    }
    const accountId =
      refund.account_id ||
      (await fetchRecord<{ account_id?: string | null }>(req, '/payments', refund.parent_id))
        ?.account_id;
    if (!accountId) {
      return null;
    }
    return {
      distinctId: accountId,
      properties: compact({
        revenue: -toMinorUnits(refund.amount, refund.currency),
        currency: refund.currency,
        order_id: refund.order_id,
        subscription_id: refund.subscription_id,
        refund_id: refund.id,
        payment_id: refund.parent_id,
        reason: refund.reason,
      }),
    };
  },
};
