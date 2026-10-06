import { describe, expect, it, vi } from 'vitest';
import { orderCancelled, orderCompleted, orderDelivered } from '../../functions/lib/events/order';
import { createMockRequest } from '../helpers/mock-request';

const ORDER = {
  id: '6abfc4116e598735b533befa',
  number: '100089',
  account_id: '6abf974f6e598735b5335fd2',
  guest: true,
  currency: 'USD',
  grand_total: 12,
  sub_total: 7,
  shipment_total: 5,
  tax_total: 0,
  discount_total: 0,
  coupon_code: null,
  items: [
    {
      product_id: '68d13d0e299569b211ad963e',
      product_name: 'Physical',
      variant_id: null,
      variant_name: null,
      price: 7,
      quantity: 1,
    },
  ],
};

function requestFor(order: unknown) {
  const get = vi.fn(async (url: string) => {
    if (url === '/orders/{id}') {
      if (order === undefined) throw new SwellError('Not found', { status: 404 });
      return order;
    }
    throw new Error(`unexpected GET ${url}`);
  });
  const req = createMockRequest({
    data: {
      id: ORDER.id,
      $event: { id: '6abfc4126e598735b533bf00', type: 'order.submitted', model: 'orders', data: {} },
    },
    swell: { get },
  });
  return { req, get };
}

describe('order events', () => {
  it('declare their Swell events and defaults', () => {
    expect([orderCompleted, orderCancelled, orderDelivered].map((d) => [d.key, d.swellEvent, d.defaultName, d.defaultEnabled])).toEqual([
      ['order_completed', 'order.submitted', 'Order Completed', true],
      ['order_cancelled', 'order.canceled', 'Order Cancelled', true],
      ['order_delivered', 'order.delivered', 'Order Delivered', false],
    ]);
  });

  it('maps a completed order to e-commerce properties without revenue', async () => {
    const { req, get } = requestFor(ORDER);

    await expect(orderCompleted.map(req)).resolves.toEqual({
      distinctId: '6abf974f6e598735b5335fd2',
      properties: {
        order_id: '6abfc4116e598735b533befa',
        order_number: '100089',
        total: 12,
        subtotal: 7,
        shipping: 5,
        tax: 0,
        discount: 0,
        currency: 'USD',
        guest: true,
        products: [{ product_id: '68d13d0e299569b211ad963e', name: 'Physical', price: 7, quantity: 1 }],
      },
    });
    expect(get).toHaveBeenCalledWith('/orders/{id}', { id: ORDER.id });
  });

  it('maps a cancelled order with the same properties', async () => {
    const mapped = await orderCancelled.map(requestFor(ORDER).req);
    expect(mapped?.properties).toMatchObject({ order_id: ORDER.id, total: 12 });
    expect(mapped?.properties).not.toHaveProperty('revenue');
  });

  it('maps a delivered order to its identifiers only', async () => {
    await expect(orderDelivered.map(requestFor(ORDER).req)).resolves.toEqual({
      distinctId: ORDER.account_id,
      properties: { order_id: ORDER.id, order_number: '100089' },
    });
  });

  it('keeps products compact when items lost their names', async () => {
    const order = { ...ORDER, coupon_code: 'BLACKFRIDAY', items: [{ product_id: 'p1', product_name: null, variant_id: 'v1', variant_name: 'Red', price: 5, quantity: 2 }] };
    const mapped = await orderCompleted.map(requestFor(order).req);
    expect(mapped?.properties.coupon).toBe('BLACKFRIDAY');
    expect(mapped?.properties.products).toEqual([{ product_id: 'p1', variant_id: 'v1', variant: 'Red', price: 5, quantity: 2 }]);
  });

  it('sends an empty products list for an order without items', async () => {
    const mapped = await orderCompleted.map(requestFor({ ...ORDER, items: null }).req);
    expect(mapped?.properties.products).toEqual([]);
  });

  it('skips an order that was deleted', async () => {
    await expect(orderCompleted.map(requestFor(undefined).req)).resolves.toBeNull();
  });
});
