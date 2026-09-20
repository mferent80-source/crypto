# v32 · RESILIENCE HOTFIX · SEVERE AUDIT

## Fix for HTTP 502
- Main spot analysis defaults back to the known-stable direct Binance browser architecture.
- Pionex remains available as an explicit native source.
- Pionex Top 100 scanner remains Pionex-only.
- Selecting a coin in the Pionex scanner no longer silently forces the main engine to Pionex.
- Pionex direct + Cloudflare fallback failures are now reported with their real diagnostic detail.
- Cloudflare Pionex fallback no longer returns a raw HTTP 502 to the frontend; it returns a structured application-level failure.
- Pionex upstream proxy requests send richer request headers.
- Health now includes a dedicated Pionex API connectivity diagnostic.
- If Pionex is unavailable, Binance analysis remains usable instead of the whole main analysis failing.
- Full v31 PWA install/update/offline functionality is retained.

## Severe audit
- frontend-check.js: syntax PASS
- backend-check.mjs: syntax PASS
- sw-check.js: syntax PASS
- UI parity v31→v32: PASS · lost IDs 0 · total IDs 453
- Function parity v31→v32: PASS · lost functions 0 · total functions 231
- onclick handlers resolved: PASS (48 refs)
- v32 resilience DOM: PASS
- Stable-default provider configuration: PASS
- Pionex 502 soft-failure path: PASS
- Pionex-only scanner isolation: PASS
- Scanner selection no forced Pionex analysis: PASS
- HTTP_DIAGNOSTIC_PASS
- Pionex upstream request headers: PASS
- PWA package retained: PASS
- Full bootstrap with PWA/provider stubs: PASS
- Package structure: PASS

## Root-cause note
Pionex's current official API documentation still lists symbols, tickers, klines, trades and depth as public endpoints. Therefore a raw 502 from the app is treated as a network/proxy/upstream-reachability failure rather than an intentional endpoint removal. Live deployment is still required to see the exact upstream detail for the user's network/Cloudflare POP.
