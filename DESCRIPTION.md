Send your store's orders, payments, refunds and subscription changes to PostHog as they happen, and see what customers buy, pay and cancel next to the rest of their activity. Events come from Swell, not the shopper's browser, so ad blockers can't drop them, and each one is tied to the customer's PostHog profile.

Connect a PostHog project with its project API key, pick US Cloud, EU Cloud or your own PostHog address, and choose the events to send. The app works with PostHog Cloud and self-hosted PostHog.

- **Every order, in PostHog.** Order Completed when a customer places an order, with the totals, discount, coupon, currency and products bought. Order Cancelled too, and Order Delivered if you turn it on.
- **Revenue you can trust.** Payment Completed for every successful charge, for orders and subscriptions alike, and Order Refunded with negative revenue for every refund, partial ones included. Gift card and store credit payments aren't counted.
- **Ready for revenue analytics.** Add Payment Completed and Order Refunded as revenue events in PostHog, with revenue in cents and its currency.
- **Subscriptions, start to churn.** Subscription Started, Renewed, Payment Failed and Cancelled with the reason, plus Paused and Resumed if you turn them on.
- **Each event once.** A delivery that Swell retries keeps its event ID, so PostHog drops the duplicate.
- **You choose what's sent.** Turn each event on or off in the app settings.

Setup takes a minute. In PostHog, copy the project API key from Project settings. Paste it in the app settings, pick your region and save, then choose Send test event: a Swell Test Event appears in PostHog under Activity. Events are sent from then on, and past orders aren't imported.
