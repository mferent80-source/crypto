# v71 · PIONEX JOURNAL CORRECTNESS & SECURITY HOTFIX · FINAL AUDIT

## Verdict

**Research/Paper + Pionex read-only journal release.** The package contains no Pionex order submission, close or cancellation route.

## Remediations completed

- removed `functions/api/live-orders.js`;
- removed v68/v69 live-order and capital-ramp controls from the UI and runtime;
- removed live-order server tables from the deployment schema;
- isolated journal storage and FIFO lot matching per symbol;
- changed fill deduplication to `symbol + fillId`;
- converts quote/USDT fees directly and base-asset fees at fill price;
- unknown fee currencies produce `REVIEW_FEE`, never a fabricated net P&L;
- backfills 365 days in 30-day windows, recursively splitting full 100-row windows;
- caps backfill work and marks truncated history explicitly;
- computes missing-order reconciliation only when both histories are complete;
- includes V71 journal records in Local Data retention, counters and research bundle;
- updated V71 metadata, PWA cache and release labels;
- added adversarial cross-symbol, compound-deduplication and fee-conversion tests.

## Required gates

```text
V71_UI_PARITY_PASS ... intentional_live_removal=1
V71_PIONEX_JOURNAL_PASS cross_symbol=blocked ... unresolved_fee=review
V71_STATIC_AUDIT_PASS 13 security + journal-correctness invariants
V71_FINDINGS_MATRIX_PASS total=17 fixed=17 open=0
```

All inherited V69 research/Paper/runtime tests also pass.

## Boundaries

- This build does not place, close or cancel exchange orders.
- Only a Pionex API key with read permission should be configured. Trading and withdrawal permissions are unnecessary and must remain disabled.
- `365d complete` means complete within the requested 365-day window and the implemented request budget, not lifetime account history.
- A 100-row response that cannot be split further is marked truncated and the journal is not labeled reconciled.
- Fees in an asset other than the symbol base or quote currency remain unresolved until an auditable conversion source exists.
- Production Pionex response formats, Cloudflare bindings and actual account history still require post-deploy validation.

## Release decision

V71 fixes the critical findings from `SEVERE_AUDIT_V70.md` that apply to the read-only application. It is suitable for controlled read-only production validation, but profitability is not proven and no real-money execution capability is included.
