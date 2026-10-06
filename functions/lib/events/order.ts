import { compact } from '../object';
import { eventRecordId, fetchRecord } from '../swell';
import type { EventDefinition, EventKey, Properties } from '../types';

interface SwellOrderItem {
  product_id?: string | null;
  variant_id?: string | null;
  product_name?: string | null;
  variant_name?: string | null;
  price?: number | null;
  quantity?: number | null;
}

interface SwellOrder {
  id: string;
  number?: string | null;
  account_id: string;
  guest?: boolean | null;
  currency?: string | null;
  grand_total?: number | null;
  sub_total?: number | null;
  shipment_total?: number | null;
  tax_total?: number | null;
  discount_total?: number | null;
  coupon_code?: string | null;
  items?: SwellOrderItem[] | null;
}

/** PostHog e-commerce spec properties. No `revenue`: revenue comes from payments. */
export function orderProperties(order: SwellOrder): Properties {
  return compact({
    order_id: order.id,
    order_number: order.number,
    total: order.grand_total,
    subtotal: order.sub_total,
    shipping: order.shipment_total,
    tax: order.tax_total,
    discount: order.discount_total,
    coupon: order.coupon_code,
    currency: order.currency,
    guest: Boolean(order.guest),
    products: (order.items ?? []).map((item) =>
      compact({
        product_id: item.product_id,
        variant_id: item.variant_id,
        name: item.product_name,
        variant: item.variant_name,
        price: item.price,
        quantity: item.quantity,
      }),
    ),
  });
}

function defineOrderEvent(options: {
  key: EventKey;
  swellEvent: string;
  defaultName: string;
  defaultEnabled: boolean;
  properties: (order: SwellOrder) => Properties;
}): EventDefinition {
  const { properties, ...definition } = options;
  return {
    ...definition,
    async map(req) {
      const id = eventRecordId(req);
      const order = id ? await fetchRecord<SwellOrder>(req, '/orders', id) : null;
      if (!order) {
        return null;
      }
      return { distinctId: order.account_id, properties: properties(order) };
    },
  };
}

export const orderCompleted = defineOrderEvent({
  key: 'order_completed',
  swellEvent: 'order.submitted',
  defaultName: 'Order Completed',
  defaultEnabled: true,
  properties: orderProperties,
});

export const orderCancelled = defineOrderEvent({
  key: 'order_cancelled',
  swellEvent: 'order.canceled',
  defaultName: 'Order Cancelled',
  defaultEnabled: true,
  properties: orderProperties,
});

export const orderDelivered = defineOrderEvent({
  key: 'order_delivered',
  swellEvent: 'order.delivered',
  defaultName: 'Order Delivered',
  defaultEnabled: false,
  properties: (order) => compact({ order_id: order.id, order_number: order.number }),
});
