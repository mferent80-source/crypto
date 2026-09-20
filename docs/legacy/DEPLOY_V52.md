# v52 · VERDICT CENTER PRO · Deployment

v52 requires **no new API key, provider or Cloudflare binding** beyond the optional v51 providers.

Deploy it the same way as v51.

## PWA

Service-worker cache:

`crypto-radar-v52`

The `/api/*` network-only rule is retained.

## First validation after deploy

1. Confirm the visible badge:

   `v52 · VERDICT CENTER PRO · AUDITED`

2. Hard reload or fully reopen the installed PWA.

3. Run a normal analysis.

4. On the Dashboard locate:

   `Verdict Center · Full Module Consensus`

5. Verify the top KPIs:

   - Directional agreement
   - Weighted module consensus
   - Bullish modules
   - Bearish modules
   - Neutral modules
   - Blockers
   - Module coverage
   - Weighted conviction

6. Verify the five family summaries:

   - Technical
   - Models
   - Flow
   - Context
   - Risk / execution

7. Verify the four module groups:

   - Bullish
   - Bearish
   - Neutral / unavailable
   - Blockers / warnings

8. Scroll through the full module table.

9. If optional v51 providers are not configured, verify their modules appear as neutral/unavailable and reduce coverage rather than becoming bearish.

10. If an important event is near enough to produce an Economic Calendar `BLACKOUT`, verify:

   - Economic Calendar appears in Blockers
   - the existing Master Verdict can become `WAIT`

11. If a Paper portfolio is loaded, verify Portfolio v3 and Stress appear in the Risk / execution family.

12. Open **Local Data & Reports** and verify:

   `Verdict Center snapshots`

   increases after new archived decision snapshots.

13. Generate a research report and confirm Verdict Center snapshot count / average agreement are included.

## Scanner

Unchanged:

- coin universe = Pionex
- technical candles = Binance
- Pionex fallback = LIVE / SAVED / SNAPSHOT

## Important interpretation

Do not read module agreement as a probability of profit.

Several technical modules share the same price/volume inputs.

The Verdict Center is an explainability and consensus surface around the existing decision engine.
