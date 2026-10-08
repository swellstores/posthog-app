# PostHog for Swell

See what your customers buy, pay and cancel, right in PostHog. The app sends your store's orders, payments, refunds and subscription changes to your PostHog project as they happen. Events come from Swell itself, not from the shopper's browser, so ad blockers and closed tabs can't lose them, and every event is tied to the customer who made it.

Works with **PostHog Cloud (US and EU)** and **self-hosted PostHog**.

## Every order, in PostHog

- **Order Completed** when a customer places an order, with the order number, totals, discount, coupon, currency and the products bought.
- **Order Cancelled** when an order is cancelled.
- **Order Delivered** when every item of an order is delivered (off by default).

Each event is linked to the customer's Swell account, and the customer's name and email are kept up to date on their PostHog profile, so you can build funnels, cohorts and retention around real purchases.

## Revenue you can trust

- **Payment Completed** for every successful charge, whether it pays for an order, an invoice or a subscription renewal.
- **Order Refunded** for every refund, partial ones included, with negative revenue.

Every charge is counted exactly once, so a subscription bought in an order is never counted twice. Payments with a gift card or store credit are left out, because that money was already counted when the gift card was bought or the credit was earned.

To see revenue in **PostHog Revenue analytics**, add **Payment Completed** and **Order Refunded** as revenue events, with `revenue` as the revenue property and `currency` as the currency property. Amounts are sent in the currency's smallest unit, for example cents.

## Subscriptions, start to churn

- **Subscription Started**, including trials.
- **Subscription Renewed** for every new billing period.
- **Subscription Payment Failed**, an early sign of churn.
- **Subscription Cancelled**, with the reason when one is given.
- **Subscription Paused** and **Subscription Resumed** (off by default).

Each event carries the plan, product, price and billing interval.

## Set up in a minute

1. In PostHog, open **Project settings** and copy the **Project API key** (it starts with `phc_`). This key can only send events; it cannot read your PostHog data.
2. In Swell, open **Apps → PostHog → Settings**, paste the key and pick your PostHog region: US Cloud, EU Cloud, or your own address for self-hosted PostHog or a proxy.
3. Save, then press **Send test event**. A **Swell Test Event** appears in PostHog under **Activity**.
4. Turn on the events you want under **Orders**, **Revenue** and **Subscriptions**.

## Good to know

- Events are sent from the moment the app is installed. Past orders and subscriptions are not imported.
- Event names follow PostHog's e-commerce spec, so they work with PostHog's templates out of the box. To combine them with events named differently elsewhere, use PostHog **Actions**.
- Every event includes `swell_store_id`, so you can tell stores apart if several send to one PostHog project.
- Locations aren't added to events: they are sent from Swell's servers, whose location says nothing about your customers.
- If PostHog is briefly unavailable, Swell retries the event later, and PostHog keeps a single copy of it.
