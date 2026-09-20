# v40 · MODEL GOVERNANCE · Deployment

v40 adds no new API keys, providers, Cloudflare bindings or external services.

You can deploy it exactly like v39.

## Existing optional configuration can remain unchanged

- `TWELVE_DATA_API_KEY`
- `COINGECKO_API_KEY`
- Pionex read-only secrets
- D1 history binding
- Push/VAPID bindings
- Cloud Monitor Worker

None of those are required for the new v40 governance logic itself.

## After deployment

1. Run normal analysis.
2. Build a sufficient resolved journal.
3. Open **Research ML**.
4. Train the existing temporal shadow model if desired.
5. Press **Train governed ensemble**.
6. Review:
   - Global ML,
   - current-regime ML,
   - monotonic calibration,
   - hierarchical reliability,
   - governed ensemble.
7. Run **Drift Monitor**.
8. Inspect **Current Decision Waterfall**.

The governed ensemble remains research-only. It does not alter the base engine automatically.

## No API work required now

Because the current priority is finishing local intelligence before provider setup, v40 deliberately adds no new network dependency.
