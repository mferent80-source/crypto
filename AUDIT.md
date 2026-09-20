# v17 · SIGNAL LAB · TESTED

## Added
- Separate LONG and SHORT confidence scores.
- WAIT gate requiring minimum signal strength plus minimum separation between LONG and SHORT.
- Entry zone, stop, TP1, TP2 and TP3.
- R:R map: 1.0R / 1.8R / 2.8R.
- ATR + structure based stop/target construction.
- Local signal journal stored in browser storage.
- Duplicate-signal guard.
- Historical signal evaluation using OHLC candles after each signal timestamp.
- Ambiguous-candle handling when stop and target are touched in the same candle.
- Signal performance dashboard: resolved count, win rate, average R and R-based profit factor.
- CSV journal export.

## Validation
- Frontend JavaScript syntax: PASS.
- Backend JavaScript syntax: PASS.
- New DOM IDs: PASS.
- Signal-engine runtime smoke test: PASS.
- Runtime sample: `{"long":75.4,"short":27.6,"dir":"LONG","entry":141.2118,"stop":138.9021,"tp3":147.6787}`.

The journal is for technical research / paper tracking. Results exclude fees, slippage and actual execution quality.
