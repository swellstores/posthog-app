import { describe, expect, it, vi } from 'vitest';
import { orderRefunded } from '../../functions/lib/events/order-refunded';
import { paymentCompleted } from '../../functions/lib/events/payment-completed';
import { createMockRequest } from '../helpers/mock-request';

const PAYMENT = {
  id: '69e262a618bb0dddf3679904',
  account_id: '69494f501ad1b7313b97083d',
  method: 'card',
  amount: 19.99,
  currency: 'USD',
  success: true,
  order_id: '69e262a618bb0dddf36798c9',
  invoice_id: null,
  subscription_id: null,
};

const REFUND = {
  id: '69e262c118bb0dddf3679b21',
  parent_id: PAYMENT.id,
  account_id: PAYMENT.account_id,
  amount: 4,
  currency: 'EUR',
  success: true,
  order_id: PAYMENT.order_id,
  subscription_id: null,
  reason: null,
};

function requestFor(path: string, record: unknown) {
  const get = vi.fn(async (url: string) => {
    if (url === path) return record;
    throw new Error(`unexpected GET ${url}`);
  });
  const id = (record as { id?: string } | null)?.id ?? 'gone';
  return { req: createMockRequest({ data: { id }, swell: { get } }), get };
}

describe('paymentCompleted', () => {
  it('declares its Swell event and defaults', () => {
    expect([paymentCompleted.key, paymentCompleted.swellEvent, paymentCompleted.defaultName, paymentCompleted.defaultEnabled]).toEqual(
      ['payment_completed', 'payment.succeeded', 'Payment Completed', true],
    );
  });

  it('carries revenue in minor units', async () => {
    const { req, get } = requestFor('/payments/{id}', PAYMENT);

    await expect(paymentCompleted.map(req)).resolves.toEqual({
      distinctId: PAYMENT.account_id,
      properties: {
        revenue: 1999,
        currency: 'USD',
        order_id: PAYMENT.order_id,
        payment_id: PAYMENT.id,
        payment_method: 'card',
      },
    });
    expect(get).toHaveBeenCalledWith('/payments/{id}', { id: PAYMENT.id });
  });

  it('uses the currency minor unit', async () => {
    const mapped = await paymentCompleted.map(requestFor('/payments/{id}', { ...PAYMENT, amount: 500, currency: 'JPY' }).req);
    expect(mapped?.properties.revenue).toBe(500);
  });

  it('links subscription payments', async () => {
    const mapped = await paymentCompleted.map(
      requestFor('/payments/{id}', { ...PAYMENT, order_id: null, invoice_id: 'inv_1', subscription_id: 'sub_1' }).req,
    );
    expect(mapped?.properties).toMatchObject({ invoice_id: 'inv_1', subscription_id: 'sub_1' });
    expect(mapped?.properties).not.toHaveProperty('order_id');
  });

  it('skips gift card and store credit payments, which are not new money', async () => {
    await expect(paymentCompleted.map(requestFor('/payments/{id}', { ...PAYMENT, method: 'giftcard' }).req)).resolves.toBeNull();
    await expect(paymentCompleted.map(requestFor('/payments/{id}', { ...PAYMENT, method: 'account' }).req)).resolves.toBeNull();
  });

  it('skips payments that did not succeed or were deleted', async () => {
    await expect(paymentCompleted.map(requestFor('/payments/{id}', { ...PAYMENT, success: false }).req)).resolves.toBeNull();
    await expect(paymentCompleted.map(requestFor('/payments/{id}', null).req)).resolves.toBeNull();
  });
});

describe('orderRefunded', () => {
  it('declares its Swell event and defaults', () => {
    expect([orderRefunded.key, orderRefunded.swellEvent, orderRefunded.defaultName, orderRefunded.defaultEnabled]).toEqual(
      ['order_refunded', 'payment.refund.succeeded', 'Order Refunded', true],
    );
  });

  it('carries negative revenue for the refunded amount', async () => {
    const { req, get } = requestFor('/payments:refunds/{id}', REFUND);

    await expect(orderRefunded.map(req)).resolves.toEqual({
      distinctId: REFUND.account_id,
      properties: {
        revenue: -400,
        currency: 'EUR',
        order_id: REFUND.order_id,
        refund_id: REFUND.id,
        payment_id: PAYMENT.id,
      },
    });
    expect(get).toHaveBeenCalledWith('/payments:refunds/{id}', { id: REFUND.id });
  });

  it('takes the customer from the parent payment when the refund has none', async () => {
    const records: Record<string, unknown> = {
      '/payments:refunds/{id}': { ...REFUND, account_id: null },
      '/payments/{id}': PAYMENT,
    };
    const get = vi.fn(async (url: string) => {
      if (url in records) return records[url];
      throw new Error(`unexpected GET ${url}`);
    });
    const req = createMockRequest({ data: { id: REFUND.id, parent_id: PAYMENT.id }, swell: { get } });

    const mapped = await orderRefunded.map(req);

    expect(mapped?.distinctId).toBe(PAYMENT.account_id);
    expect(get).toHaveBeenCalledWith('/payments/{id}', { id: PAYMENT.id });
  });

  it('includes the refund reason when given', async () => {
    const mapped = await orderRefunded.map(requestFor('/payments:refunds/{id}', { ...REFUND, reason: 'damaged' }).req);
    expect(mapped?.properties.reason).toBe('damaged');
  });

  it('skips refunds that did not succeed or were deleted', async () => {
    await expect(orderRefunded.map(requestFor('/payments:refunds/{id}', { ...REFUND, success: false }).req)).resolves.toBeNull();
    await expect(orderRefunded.map(requestFor('/payments:refunds/{id}', null).req)).resolves.toBeNull();
  });
});
