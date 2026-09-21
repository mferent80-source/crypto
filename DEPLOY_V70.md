# v70 · Pionex Auto Journal & Reconciliation Pro

v70 extends the audited v69 package with a read-only Pionex transaction journal.

## Cloudflare configuration

- Keep `APP_API_TOKEN` configured for protected API routes.
- Configure `PIONEX_API_KEY` and `PIONEX_API_SECRET` as server-side secrets.
- The Pionex key used for account synchronization should have read permission only.
- Do not grant withdrawal permission. Trading permission is not needed for v70 journal sync.

## Journal behavior

- `orders` and `fills` are fetched server-side for the current Pionex spot symbol.
- Fill IDs are deduplicated and BUY/SELL fills are reconciled FIFO into closed trades.
- Fees returned by Pionex are included in net P&L. Spot funding is recorded as zero.
- Orders found in the app live-execution ledger are labeled `RADAR`; all others are `MANUAL`.
- Unmatched sells remain reconciliation exceptions instead of invented trades.
- Synchronization never creates, changes, closes, or cancels an exchange order.

## Verification

Run `npm test`. Success includes `V70_PIONEX_JOURNAL_PASS` and `V70_STATIC_AUDIT_PASS`.
