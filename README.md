# PostHog for Swell

A Swell integration app that sends a store's orders, payments, refunds and subscription changes to the merchant's PostHog project through the [PostHog Capture API](https://posthog.com/docs/api/capture). The merchant-facing description shown in the Swell App Marketplace is [DESCRIPTION.md](DESCRIPTION.md); this file is for developers.

Design decisions and the platform facts behind them are in the spec, `.claude/superpowers/specs/2026-10-06-posthog-app-design.md` (kept in git, never pushed with the app).

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

- One worker (`posthog-capture`) subscribes to all 11 events; each event's logic is a small mapper in `functions/lib/events/`.
- `distinct_id` is the Swell account id. Every event also carries `$set: { email, name }`, `swell_store_id` and `$geoip_disable: true` (requests come from a Cloudflare worker, so PostHog would geolocate every customer to its data centre).
- `uuid` and `timestamp` come from the Swell event id, so a retried delivery lands at the original time and PostHog drops the duplicate.
- Revenue is only on **Payment Completed** (+) and **Order Refunded** (−), in the currency's minor unit. Gift card and store credit payments, and refunds of them, are skipped: they are not new money.
- `posthog-test` is an action function behind the **Send test event** button. It checks the key with PostHog's `/flags` endpoint (401 = unknown key) before sending a `Swell Test Event`.

### Events

| Swell event | PostHog event | On by default | Notes |
|---|---|---|---|
| `order.submitted` | Order Completed | yes | totals, coupon, products |
| `order.canceled` | Order Cancelled | yes | |
| `order.delivered` | Order Delivered | no | |
| `payment.succeeded` | Payment Completed | yes | `revenue`; skips `account` / `giftcard` methods |
| `payment.refund.succeeded` | Order Refunded | yes | negative `revenue`; customer from the parent payment when the refund has none |
| `subscription.created` | Subscription Started | yes | skips drafts |
| `subscription.paid` | Subscription Renewed | yes | skips the first payment, made through the subscription's own order |
| `subscription.payment_failed` | Subscription Payment Failed | yes | |
| `subscription.canceled` | Subscription Cancelled | yes | `cancel_reason` |
| `subscription.paused` | Subscription Paused | no | |
| `subscription.resumed` | Subscription Resumed | no | |

Adding an event: write a definition in `functions/lib/events/`, add it to `EVENT_DEFINITIONS`, add the Swell event to `model.events` in `functions/posthog-capture.ts`, and add its toggle to the settings file named by its `settingsGroup`. `test/unit/registry.test.ts` and `test/unit/settings-files.test.ts` fail until all four agree.

### Error handling

| Situation | Behaviour |
|---|---|
| No key, invalid custom URL, or event turned off | return quietly (nothing to retry) |
| Network error, timeout, PostHog 5xx or 429, Swell API error other than 404 | throw, so Swell retries the delivery |
| Other PostHog 4xx (e.g. bad key) | log with `console.error` and return |
| Record deleted since the event | skip |

Swell auto-disables an event function only after ~4 days of failures **with no success**, and a marketplace merchant cannot re-enable it, so merchant-side configuration errors must never throw.

### Settings

| File | Group | Fields |
|---|---|---|
| `settings/connection.json` | `connection` | `api_key`, `host` (`us` / `eu` / `custom`), `custom_host`, the **Send test event** button |
| `settings/orders.json` | `orders` | `<key>_enabled` toggles |
| `settings/revenue.json` | `revenue` | |
| `settings/subscriptions.json` | `subscriptions` | |

Installed apps start with empty settings values, so an unset toggle means the registry default (`defaultEnabled`), never "off".

## Development

```bash
npm install
npm test            # Vitest on the Workers runtime
npm run typecheck
```

Functions run on Cloudflare Workers: no Node APIs, no environment variables; configuration comes only from `req.swell.settings()`.

### Deploying to a test store

```bash
swell app push                  # everything not matched by .gitignore
swell inspect functions --app=.
swell inspect settings app.posthog
```

Things that bit us (details in the spec, §6):

- `swell app push` uploads every file not in `.gitignore`, dotfiles included. `.claude/` and `.superpowers/` are gitignored for that reason; their files are tracked with `git add -f`.
- All settings files collapse into one platform record. Removing a settings file deletes the whole record, and pushing several settings files at once can drop groups. Push settings files one at a time and check `swell inspect settings app.posthog`.
- In a settings file, a first top-level `toggle` is shown in the section header, so each toggle sits in its own `field_row`. `boolean` with `ui: "toggle"` loses its `default` in the form.
- Push `assets/` after `images` is in `swell.json`, or the screenshots are not bound (`swell app push assets --force` fixes it).

### Watching events on a store

`swell app dev` is not needed: push, then trigger events with `swell api` on the store's test environment and read the worker logs:

```bash
swell api get '/:logs?limit=50&where[app_id]=<app record id>'
```

(`swell logs` fails on the test environment with "Environment `test` not allowed".) The handler logs `[posthog] Sent "<event>"` or `[posthog] PostHog rejected …`. PostHog's Activity view can lag several minutes; PostHog's SQL editor shows events sooner.

## Marketplace listing

| What | Where |
|---|---|
| Listing text | `DESCRIPTION.md` (the platform reads it into `full_description`; the field in `swell.json` is ignored) |
| Short description | `description` in `swell.json` (≤ 70 characters) |
| Icon | `assets/icon.png` |
| Screenshots | `assets/images/*.png` (3200 × 1800), listed in `swell.json` `images`; the listing shows four |

The screenshots are rendered from HTML in `.superpowers/listing/` (not pushed with the app):

```bash
PLAYWRIGHT=<path to a playwright package> node .superpowers/listing/render.mjs
```

To release, the platform requires `name`, `description`, an icon and at least one bound image:

```bash
swell app version 1.0.0 -m "First release" -y
swell app release 1.0.0
```
