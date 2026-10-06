import { handleEvent } from './lib/capture-event';

export const config: SwellConfig = {
  description: 'Send store events to PostHog',
  model: {
    events: [
      'order.submitted',
      'order.canceled',
      'order.delivered',
      'payment.succeeded',
      'payment.refund.succeeded',
      'subscription.created',
      'subscription.paid',
      'subscription.payment_failed',
      'subscription.canceled',
      'subscription.paused',
      'subscription.resumed',
    ],
  },
};

export default async function (req: SwellRequest) {
  await handleEvent(req);
}
