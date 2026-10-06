import { toMinorUnits } from '../money';
import { compact } from '../object';
import { eventRecordId, fetchRecord } from '../swell';
import type { EventDefinition } from '../types';

/** Money already counted elsewhere: a gift card when it was bought, store credit when it was earned. */
export const NON_REVENUE_METHODS: ReadonlySet<string> = new Set(['account', 'giftcard']);

interface SwellPayment {
  id: string;
  account_id: string;
  method: string;
  amount?: number | null;
  currency?: string | null;
  success?: boolean | null;
  order_id?: string | null;
  invoice_id?: string | null;
  subscription_id?: string | null;
}

/** Every charge is exactly one payment, whatever it pays for, so revenue never double counts. */
export const paymentCompleted: EventDefinition = {
  key: 'payment_completed',
  swellEvent: 'payment.succeeded',
  defaultName: 'Payment Completed',
  defaultEnabled: true,
  async map(req) {
    const id = eventRecordId(req);
    const payment = id ? await fetchRecord<SwellPayment>(req, '/payments', id) : null;
    if (!payment || payment.success !== true || NON_REVENUE_METHODS.has(payment.method)) {
      return null;
    }
    return {
      distinctId: payment.account_id,
      properties: compact({
        revenue: toMinorUnits(payment.amount, payment.currency),
        currency: payment.currency,
        order_id: payment.order_id,
        invoice_id: payment.invoice_id,
        subscription_id: payment.subscription_id,
        payment_id: payment.id,
        payment_method: payment.method,
      }),
    };
  },
};
