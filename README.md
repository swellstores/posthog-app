# PostHog for Swell

Sends a Swell store's orders, payments, refunds and subscription changes to the merchant's PostHog project through the [PostHog Capture API](https://posthog.com/docs/api/capture).

## How it works

```
Swell model event ──► functions/posthog-capture.ts
                        └─ lib/capture-event.ts  handleEvent()
                             1. lib/events/index.ts   find the definition for $event.type
                             2. lib/settings.ts       key, host, is the event on?
                             3. definition.map(req)   load the record, build properties (or skip)
                             4. lib/swell.ts          customer email + name for $set
                             5. lib/posthog.ts        POST {host}/i/v0/e/
```

- `distinct_id` is the Swell account id. Every event carries `$set: { email, name }`, `swell_store_id` and `$geoip_disable: true`.
- `uuid` and `timestamp` come from the Swell event id, so a retried delivery is deduplicated by PostHog.
- Revenue is only on **Payment Completed** (+) and **Order Refunded** (−), in the currency's minor unit. Gift card and store credit payments, and their refunds, are skipped.
- `functions/posthog-test.ts` backs the **Send test event** button.

### Events

| Swell event | PostHog event | On by default | Notes |
|---|---|---|---|
| `order.submitted` | Order Completed | yes | totals, coupon, products |
| `order.canceled` | Order Cancelled | yes | |
| `order.delivered` | Order Delivered | no | |
| `payment.succeeded` | Payment Completed | yes | `revenue` |
| `payment.refund.succeeded` | Order Refunded | yes | negative `revenue` |
| `subscription.created` | Subscription Started | yes | skips drafts |
| `subscription.paid` | Subscription Renewed | yes | skips the first payment, made through the subscription's order |
| `subscription.payment_failed` | Subscription Payment Failed | yes | |
| `subscription.canceled` | Subscription Cancelled | yes | `cancel_reason` |
| `subscription.paused` | Subscription Paused | no | |
| `subscription.resumed` | Subscription Resumed | no | |

To add an event: add a definition in `functions/lib/events/` and to `EVENT_DEFINITIONS`, the Swell event to `model.events` in `functions/posthog-capture.ts`, and a toggle to the settings file named by its `settingsGroup`. `test/unit/registry.test.ts` and `test/unit/settings-files.test.ts` check that they agree.

### Error handling

| Situation | Behaviour |
|---|---|
| No key, invalid custom URL, or event turned off | return |
| Network error, timeout, PostHog 5xx or 429, Swell API error other than 404 | throw, so Swell retries |
| Other PostHog 4xx | log and return |
| Record deleted since the event | skip |

### Settings

| File | Fields |
|---|---|
| `settings/connection.json` | `api_key`, `host` (`us` / `eu` / `custom`), `custom_host`, **Send test event** |
| `settings/orders.json`, `revenue.json`, `subscriptions.json` | `<key>_enabled` toggles |

An unset toggle means the registry default (`defaultEnabled`).

## Development

```bash
npm install
npm test
npm run typecheck
swell app push
```

Function logs on a store's test environment:

```bash
swell api get '/:logs?limit=50&where[app_id]=<app record id>'
```

## Marketplace listing

| What | Where |
|---|---|
| Listing text | `DESCRIPTION.md` |
| Short description | `description` in `swell.json` (≤ 70 characters) |
| Icon | `assets/icon.png` |
| Screenshots | `assets/images/*.png` (3200 × 1800), listed in `images` in `swell.json` |

```bash
swell app version 1.0.0 -m "First release" -y
swell app release 1.0.0
```
