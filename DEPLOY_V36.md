# v36 · Deployment Notes

v36 introduces no new mandatory API secrets beyond v35.

Keep any existing optional configuration:
- `TWELVE_DATA_API_KEY` for US Stocks.
- `PIONEX_API_KEY` / `PIONEX_API_SECRET` for Pionex read-only account access.
- `VAPID_PUBLIC_KEY` + `PUSH_SUBSCRIPTIONS` KV for PWA PushSubscription storage.

The new Robustness, Strategy Lifecycle and Paper Portfolio Risk modules run in the application using the existing market-data routes.

After deployment:
1. Run analysis on a symbol.
2. Open Robustness Lab and run a perturbation test.
3. Add one or more Paper positions.
4. Open Portfolio Risk and refresh.
5. Check Strategy Lifecycle before interpreting any promoted/retired segment.

No live-order endpoint was added.
