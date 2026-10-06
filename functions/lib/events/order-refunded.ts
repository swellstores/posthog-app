import { toMinorUnits } from '../money';
import { compact } from '../object';
import { eventRecordId, fetchRecord } from '../swell';
import type { EventDefinition } from '../types';

interface SwellRefund {
  id: string;
  parent_id: string;
  account_id: string;
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
  swellEvent: 'payment.refund.succeeded',
  defaultName: 'Order Refunded',
  defaultEnabled: true,
  async map(req) {
    const id = eventRecordId(req);
    const refund = id ? await fetchRecord<SwellRefund>(req, '/payments:refunds', id) : null;
    if (!refund || refund.success !== true) {
      return null;
    }
    return {
      distinctId: refund.account_id,
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
