# v45 · SCANNER RECOVERY · Deployment

No new API key or Cloudflare binding is required.

Deploy v45 exactly like v44.

## What changed

The previous scanner could still fail before reaching Binance because it needed a live/saved Pionex universe first.

v45 removes that blocker.

The scanner now uses this universe priority:

1. Pionex live
2. saved Pionex universe
3. embedded Pionex fallback snapshot

Technical analysis always uses Binance candles.

## First test

1. Deploy the ZIP.
2. Hard reload/reopen the installed PWA.
3. Confirm badge:
   `v45 · SCANNER RECOVERY · AUDITED`
4. Open Scanner.
5. You should see one of:
   - `PIONEX LIVE`
   - `PIONEX SAVED`
   - `PIONEX SNAPSHOT 2026-09-20`
6. Press **Scanează coinurile Pionex**.
7. Even while Pionex shows cooldown, scanning should begin with Binance data.
8. FAST should process the available Pionex fallback coins instead of stopping at the Pionex cooldown message.

## Expected behavior during Pionex failure

You may still see Pionex cooldown in Health because the Pionex service itself is unavailable.

That no longer means the scanner must stop.

The scanner uses the Pionex universe fallback and Binance technical data.
