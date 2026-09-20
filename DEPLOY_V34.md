# v34 Cloudflare Setup

## Base deployment
Keep the existing Pages settings:
- Framework preset: None
- Build command: blank
- Output directory: `public`
- Functions directory: `functions`

## Pionex account — read only
Create Cloudflare environment secrets:
- `PIONEX_API_KEY`
- `PIONEX_API_SECRET`

The API key should have **Enable reading** only. v34 exposes only balance and open-order reads.

## Push subscriptions
Create:
- Environment variable/secret `VAPID_PUBLIC_KEY`
- Cloudflare KV namespace binding named `PUSH_SUBSCRIPTIONS`

This enables browser PushSubscription registration and storage.

## Closed-app push delivery
The service worker can receive and display Web Push messages, but an always-on/scheduled server process must still:
1. monitor the market,
2. decide an alert condition has fired,
3. send encrypted Web Push payloads to stored subscriptions.

The app reports `SUBSCRIBED · SENDER NEEDED` until that delivery layer is configured.
