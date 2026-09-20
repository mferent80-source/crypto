# v43 · PIONEX RESILIENCE · SEVERE AUDIT

## Why this hotfix exists
The observed message `Pionex rate-limit cooldown · 35s` means a Pionex HTTP 429 had already been received and the browser was still inside the protective cooldown window. The countdown itself is protective behavior; the target of v43 is to reduce how often a 429 is reached and to avoid losing a scan when it happens.

## v43 changes

### Client request budget
- Minimum start spacing raised from 320 ms to 700 ms.
- Endpoint-weight awareness:
  - `common/symbols` is treated as weight 5.
  - current ticker / kline / trades / depth routes are treated as weight 1.
- Requests remain serialized.
- Health now shows pacing and recent 429 strike count.

### Escalating 429 backoff
- First 429: at least 75 seconds.
- Second consecutive strike: at least 120 seconds.
- Further consecutive strikes: up to 300 seconds.
- Server `Retry-After` is honored when it is longer.
- Successful traffic gradually reduces the strike count.

### Scanner pause / resume
- A 429 no longer cancels the active scanner.
- The scanner waits for cooldown, keeps already completed results, then retries the interrupted symbol once.
- Background Pionex microstructure and live polling pause while the scanner is active.
- Partial scanner results are not cleared by the rate-limit error path.

### Reduced background REST pressure
- Pionex primary-source live ticker polling reduced from 10 s to 30 s.
- Microstructure Auto interval reduced from 15 s to 30 s.
- Microstructure auto-load is skipped while scanner is active.

### Longer safe caches
Client:
- symbol metadata: 30 minutes.
- ticker universe: 30 seconds.
- universe ranking: 120 seconds.
- klines:
  - 15m: 30 s,
  - 1h: 60 s,
  - 4h: 120 s,
  - 1d: 300 s.
- trades / depth: 5 s.

Cloudflare success cache:
- symbols: 1 hour.
- tickers: 30 s.
- klines: 45 / 90 / 180 / 300 s by interval.
- trades / depth: 5 s.

### Backend protection
- Cloudflare Pionex gate is now endpoint-weight aware.
- Weight-5 symbol metadata reserves a longer spacing window.
- After an upstream 429, the current Worker isolate blocks further Pionex requests for at least 75 seconds rather than repeatedly hitting the banned upstream.
- Only successful Pionex responses enter Cache API.

## Severe audit
- frontend-check.js: syntax PASS
- market-check.mjs: syntax PASS
- stocks-check.mjs: syntax PASS
- intel-check.mjs: syntax PASS
- history-check.mjs: syntax PASS
- monitor-proxy-check.mjs: syntax PASS
- account-check.mjs: syntax PASS
- push-check.mjs: syntax PASS
- monitor-worker-check.mjs: syntax PASS
- sw-check.js: syntax PASS
- UI parity v42→v43: PASS · lost IDs 0 · total IDs 806
- Function parity v42→v43: PASS · lost functions 0 · total named functions 459
- onclick handlers resolved: PASS (81 refs)
- Client weighted pacing + non-destructive cooldown + scanner auto-resume: PASS
- Backend weighted gate + isolate cooldown + expanded success cache: PASS
- Service Worker `/api/*` network-only bypass retained: PASS
- PIONEX_CLIENT_RESILIENCE_PASS
- PIONEX_BACKEND_COOLDOWN_PASS

## Remaining limitation
Cloudflare can run multiple isolates/POPs and Pionex applies its public REST limit by IP. A module-scope queue cannot globally coordinate every Cloudflare isolate. v43 substantially reduces request pressure and repeated-ban behavior, but it cannot mathematically guarantee that Pionex will never return 429 from shared edge egress.
