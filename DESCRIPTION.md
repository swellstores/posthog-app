# PostHog for Swell

See what your customers buy, pay and cancel, right in PostHog. The app sends your store's orders, payments, refunds and subscription changes to your PostHog project as they happen. Events come from Swell, not from the shopper's browser, so ad blockers can't lose them, and every event is tied to the customer who made it.

Works with **PostHog Cloud (US and EU)** and **self-hosted PostHog**.

## Every order, in PostHog

- **Order Completed** when a customer places an order, with totals, discount, coupon, currency and the products bought.
- **Order Cancelled** when an order is cancelled.
- **Order Delivered** when an order is delivered (off by default).

The customer's name and email are kept up to date on their PostHog profile.

## Revenue you can trust

- **Payment Completed** for every successful charge, for orders and subscriptions alike.
- **Order Refunded** for every refund, partial ones included, with negative revenue.

Gift card and store credit payments are not counted as revenue.

To see revenue in **PostHog Revenue analytics**, add **Payment Completed** and **Order Refunded** as revenue events, with `revenue` as the revenue property and `currency` as the currency property. Amounts are in the currency's smallest unit, for example cents.

## Subscriptions, start to churn

- **Subscription Started**, including trials.
- **Subscription Renewed** for every new billing period.
- **Subscription Payment Failed**.
- **Subscription Cancelled**, with the reason when one is given.
- **Subscription Paused** and **Subscription Resumed** (off by default).

## Set up in a minute

1. In PostHog, open **Project settings** and copy the **Project API key** (it starts with `phc_`).
2. In Swell, open **Apps → PostHog → Settings**, paste the key and pick your region: US Cloud, EU Cloud, or your own address for self-hosted PostHog.
3. Save, then press **Send test event**. A **Swell Test Event** appears in PostHog under **Activity**.
4. Choose the events to send under **Orders**, **Revenue** and **Subscriptions**.

## Good to know

- Only events from the moment the app is installed are sent. Past orders are not imported.
- Event names follow PostHog's e-commerce spec.
