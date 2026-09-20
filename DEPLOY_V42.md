# v42 · PORTFOLIO INTELLIGENCE · Deployment

v42 adds **no new API key, provider, database, Worker or Cloudflare binding**.

Deploy it the same way as v41.

## PWA

The service-worker cache is now:

`crypto-radar-v42`

The v41 security fix remains intact:

`/api/*` is network-only.

## First test

1. Deploy v42 and reload until the badge shows:
   `v42 · PORTFOLIO INTELLIGENCE · AUDITED`
2. Open **Paper Trading** and keep or create at least two filled Paper positions.
3. Open **Portfolio Intelligence**.
4. Press **Refresh risk**.
5. Verify:
   - Historical VaR / CVaR,
   - Parametric VaR,
   - Component VaR table,
   - Marginal VaR per $1k,
   - correlation clusters,
   - Paper risk budgets.
6. Run an active LONG/SHORT analysis.
7. Press **Assess current setup** to calculate candidate incremental portfolio risk.
8. Review Strategy Families after the journal contains enough resolved segments.

## Paper risk budgets

Defaults are deliberately local and editable:
- Total initial risk: 4%
- Market: 3%
- Regime: 2.5%
- Correlation cluster: 2%
- Single-symbol committed exposure: 30%

Press **Save budgets** after changing them.

These limits only govern the Paper simulator.

## No API work required

v42 uses the same existing historical candle functions already present in the application. It adds no external integration.
