# v19 · LEVELS & FLOW · TESTED

## Added in this build
- Support / Resistance Ladder window with Pivot, S1/S2/S3, R1/R2/R3.
- Breakout-above and breakdown-below trigger thresholds.
- Nearest active zone and level bias summary.
- Money Flow Window with MFI, CMF, OBV direction, OI, longs vs shorts and funding/crowding context.
- Futures context is auto-refreshed after each successful analysis and reused inside the dashboard flow window.
- CMF indicator added to the quant engine.
- Level ladder calculation added on a rolling 50-candle structure range.

## Verification
- Frontend JavaScript syntax: PASS.
- Backend JavaScript syntax: PASS.
- New DOM IDs: PASS.
- Runtime smoke test: PASS.
- Runtime sample: `{"score":63.2,"cmf":0.036,"pivot":150.163,"r1":152.35,"signal":"WAIT","tp1":152.674}`.

Futures sources can still be unavailable depending on provider/network restrictions. Core spot analysis remains isolated and functional.
