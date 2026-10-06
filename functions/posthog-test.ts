import { sendTestEvent } from './lib/test-event';

export const config: SwellConfig = {
  description: 'Send a test event to PostHog',
  action: true,
};

export default async function (req: SwellRequest) {
  return sendTestEvent(req);
}
