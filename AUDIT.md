# v31 · FULL PWA · SEVERE AUDIT

## Added
- Full installable PWA packaging.
- 192×192, 512×512 and maskable 512×512 app icons.
- Standalone manifest with app shortcuts for Scanner and Signals.
- Android/Chromium install prompt handling via `beforeinstallprompt`.
- Fallback install guidance for browsers where the prompt is not directly exposed.
- Apple mobile-web-app metadata and home-screen icon.
- Offline application shell and dedicated offline fallback page.
- Network-first navigation so deployments prefer the newest app shell.
- Cache-first static assets with background refresh.
- Service-worker cache versioning and automatic old-cache cleanup.
- Update detection with an in-app “new version available” banner.
- `SKIP_WAITING` update flow and automatic reload after the new service worker takes control.
- Deep-link support for `?panel=scan` and `?panel=signals`.
- PWA install/browser state exposed in Health.
- All v30 Pionex-native engine, scanner, validation and microstructure functionality retained.

## Severe audit
- frontend-check.js: syntax PASS
- backend-check.mjs: syntax PASS
- sw-check.js: syntax PASS
- UI parity v30→v31: PASS · lost IDs 0 · total IDs 452
- Function parity v30→v31: PASS · lost functions 0 · total functions 230
- onclick handlers resolved: PASS (48 refs)
- PWA install/update DOM: PASS
- Manifest + icon assets: PASS
- PWA icon dimensions: PASS
- Service worker install/activate/update/offline flow: PASS
- v30 provider-consistent engine retained: PASS
- PWA_RUNTIME_PASS
- Full bootstrap with DOM/PWA/provider stubs: PASS
- Package structure: PASS

## Limitations
- Live market analysis still requires internet access; offline mode preserves the app shell, not live exchange data.
- Browser install UX varies by platform; Android/Chromium supports the richest install prompt.
- Closed-app push alerts still require server-side push infrastructure and are not implied by PWA installation alone.
