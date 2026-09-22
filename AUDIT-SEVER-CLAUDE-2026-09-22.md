# AUDIT SEVER — Crypto Radar v71 · 22.09.2026

**Obiect:** `mferent80-source/crypto` @ `b142dd1` (exact commit-ul care e live pe
`https://crypto-wuy.pages.dev`).
**Metodă:** nu recitire de cod — apeluri HTTP reale (local + producție), pagina
deschisă într-un Chrome adevărat prin CDP, 77 de butoane apăsate unul câte unul,
starea reală a contului Cloudflare citită cu `wrangler`.

---

## 🔴 CRITIC

### 1. Jurnalul Pionex v71 — funcția-vedetă a versiunii — e MORT

Frontendul cheamă două acțiuni care **nu există pe server**:

| cerut de `app.js` | știut de `functions/api/pionex-account.js` |
|---|---|
| `action=fills` | ❌ |
| `action=orders` | ❌ |
| — | ✅ `status`, `balances`, `openOrders` |

`v71FetchHistory("fills", symbol)` și `v71FetchHistory("orders", symbol)` →
`/api/pionex-account?action=fills…` → **HTTP 400 `Unsupported read-only action`**.

Dovadă, apeluri reale pe funcția adevărată:

```
status       -> {"configured":true,"readOnly":true,"tradingExposed":false}  [200]
balances     -> {"error":"Pionex private API: Invalid apikey"}              [502]  ← ajunge la Pionex
openOrders   -> {"error":"Pionex private API: key not found"}               [502]  ← ajunge la Pionex
fills        -> {"error":"Unsupported read-only action"}                    [400]  ← NU EXISTĂ
orders       -> {"error":"Unsupported read-only action"}                    [400]  ← NU EXISTĂ
```

`getJSON` aruncă pe orice răspuns non-2xx, iar apelul e într-un `Promise.all`,
deci sincronizarea moare la **prima** fereastră, nu după cele 13. Ce vede omul:

- `v71ReconState` → **`SYNC ERROR`**
- `v71SyncNote` → **`Sync failed: Unsupported read-only action`**

`RECONCILED` nu poate apărea niciodată. Backfill-ul de 365 de zile, potrivirea
FIFO pe lot, conversia taxelor bază/cotație — tot lanțul e cod care nu se
execută nicio dată.

**Reparația:** de adăugat pe server `fills` și `orders` peste
`/api/v1/trade/fillsByOrderId` / `/api/v1/trade/allOrders`, cu `startTime`,
`endTime`, `limit` trecute prin semnătură. Semnătura existentă e corectă — se
refolosește `privateGet` ca atare.

### 2. Poarta de livrare nu s-a închis niciodată: 22 din 24 de probe lipsesc

`npm test` înlănțuie 19 suite + audit. **Din 24 de scripturi chemate,
22 nu există în repo.** Există doar `v54`–`v57`; codul cheamă `v69`/`v71`.

```
> node scripts/syntax-v69.mjs
Error: Cannot find module 'C:\Users\Cimin\crypto\scripts\syntax-v69.mjs'
```

Deci `npm run deploy` (care are `predeploy: npm test`) **nu poate rula**.
Livrarea se face prin integrarea Git a Cloudflare Pages, care nu cheamă `npm test`.
Badge-ul `AUDITED` din `BUILD_INFO.json` și rândurile `V71_PIONEX_JOURNAL_PASS` /
`V71_STATIC_AUDIT_PASS` din `AUDIT_V71.md` nu sunt susținute de nimic executabil.

### 3. Ruta `/api/provider-health` nu există — și eșecul e tăcut

`app.js` o cheamă (`runProviderHealthV62`), dar nu există
`functions/api/provider-health.js`. `_routes.json` trimite `/api/*` la Functions,
nu găsește nimic, și Cloudflare **întoarce `index.html` cu HTTP 200**.
`JSON.parse` pe HTML crapă, `catch` prinde, și:

```js
providerScore = required.length ? 100*ok/required.length : 0   // → 0, mereu
combined = Math.round(.55*providerScore + .45*local.score)     // → jumătate din scor, mereu
state = error ? 'DEGRADED' : …                                 // → DEGRADED, mereu
```

„Provider & Data Integrity Center" e blocat pe **DEGRADED** cu 55% din scor
fixat la zero. Iar `liveReadiness` are poartă **tare** pe sănătatea providerilor
⇒ **Live Readiness nu poate trece niciodată**, oricât de bune ar fi datele.

### 4. Nicio bază D1 în cont — tot stratul de istoric e mort în producție

```
$ wrangler d1 list
[]
```

`env.DB` nu e legat nicăieri. Consecințe măsurate:

- `/api/history?action=scanner_run` → **503** (apăsând „Decision Center" și „50 bars")
- `/api/history?action=snapshot`, `?action=signal` → **503** (apăsând „Analizează piața")
- nu se salvează nicio rulare, niciun snapshot, niciun semnal, niciun eveniment
- `reservePionexGlobal()` face `if(!env?.DB?.prepare) return 0` ⇒ **poarta globală
  de rată către Pionex e mută**; rămâne doar cea per-izolat (vezi #8)

---

## 🟠 MARE

### 5. 23 din 26 de variabile de mediu nelegate

Codul cere 26. Configurate: **3** (`APP_API_TOKEN`, `PIONEX_API_KEY`,
`PIONEX_API_SECRET`). Confirmat **în producție**, nu local:

```
/api/intel?action=config   -> {"coingeckoKey":false,"twelveData":false,…}
/api/stocks?action=config  -> {"configured":false,"provider":"TWELVE_DATA",…}
```

⇒ „Context Intelligence" dă **403** la `crypto_global` (CoinGecko respinge IP-uri
de datacenter fără cheie). Modulul de acțiuni e mort. La fel `COINGLASS_API_KEY`,
`TRADING_ECONOMICS_API_KEY`, `WHALE_ALERT_API_KEY`.

### 6. Push / alerte moarte în producție

```
/api/push?action=config -> {"configured":false,"publicKey":null,
                            "subscriptionStore":false,"deliverySenderConfigured":false}
```

Lipsesc `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
`PUSH_SUBSCRIPTIONS`. Tot codul de notificări din `sw.js` (`push`,
`notificationclick`) nu se poate declanșa. Butonul „Alerts 0" arată 0 pentru că
nu există canal, nu pentru că e liniște — *paza jurnalului, nu a listei*.

### 7. Worker-ul `radar-monitor` nu e desfășurat

`https://radar-monitor.mferent80.workers.dev` → **404**. `workers/radar-monitor.js`,
`wrangler.monitor.toml`, `scripts/configure-monitor.mjs` și `npm run monitor:deploy`
sunt lemn mort. `MONITOR_WORKER_URL`, `MONITOR_TOKEN`, `MONITOR_CRYPTO`,
`MONITOR_STOCKS` nelegate.

### 8. Limitarea de rată Pionex e iluzorie

Fără KV `API_RATE_LIMIT` (în cont e doar `MASURAT`, de la Busola), `rateLimit()`
cade pe `localBuckets`, un `Map` în memoria izolatului. La fel `pionexNextAt` și
`pionexBlockedUntil` din `market.js` — variabile de modul. În Workers **fiecare
izolat are memoria lui** și izolații se nasc și mor des ⇒ atât limita per-IP cât
și cooldown-ul de 75 s după un 429 de la Pionex **se pierd între cereri**.
Cu D1 lipsă (#4), nu mai rămâne nicio poartă reală.

---

## 🟡 MEDIU

### 9. Zece funcții scrise și niciodată chemate

`awaitPionexReady`, `markAlertsRead`, `marketLabelSymbol`, `paperEntryFillFraction`,
`paperExit`, `portfolioReturnsSeries`, `safeUiToken`, `trainRegimeModels`,
`v65BiasScore`, `v66Pf` — fiecare apare **exact o dată** în `app.js` (definiția)
și zero ori în `index.html`. `paperExit` și `trainRegimeModels` sună a funcții
care ar trebui să facă ceva.

### 10. Un singur fișier de 721 KB

`app.js` 721 KB · `index.html` 219 KB · `app.css` 93 KB · 967 de funcții.
Orice schimbare rescrie tot; niciun modul nu poate fi probat separat.

### 11. Documentația afirmă ce nu s-a întâmplat

`DEPLOY_V71.md` pasul 5: *„Synchronize one coin and verify its symbol appears in
the journal note"* — pas care **nu putea trece**, dat fiind #1. Dacă ar fi fost
executat o dată, bug-ul cădea imediat. La fel pașii 6 și 7.

---

## ✅ CE E BINE (verificat, nu presupus)

- **Zero excepții JS, zero erori de consolă** la încărcare, în Chrome real.
- **Zero chei comise** — nici în arbore, nici în cele 56 de commit-uri.
- **Semnătura Pionex e corectă** față de spec: `HMAC-SHA256(secret, "GET"+path+"?"+query_sortat_ASCII)`,
  hex, anteturile `PIONEX-KEY` / `PIONEX-SIGNATURE`, `timestamp` în ms. Dovedit
  indirect: Pionex răspunde `Invalid apikey`, adică a **citit** semnătura.
- **Read-only e real:** zero rute de `submit` / `close` / `cancel`; `tradingExposed:false`.
- **CSP strict** (`script-src 'self'`) și **0 scripturi inline, 0 handlere `on*=`** — se potrivesc.
- **`sw.js` corect:** `/api/*` e network-only, deci nu se servesc niciodată
  răspunsuri de cont sau de piață din cache.
- **Scannerul crypto merge** — Binance răspunde cu CORS direct în browser
  (`data-api.binance.vision`, `api1/api2.binance.com`), independent de proxy.
- **Zero id-uri cerute de JS și inexistente în HTML**, zero butoane cu handler lipsă,
  zero accente grave în comentarii HTML.
- **Versiunile se potrivesc** peste tot: `BUILD_INFO v71` = `package.json 71.0.0`
  = cache `crypto-radar-v71` = badge din pagină.

---

## ❓ CE NU S-A PROBAT — citește secțiunea asta

1. **Nu am `APP_API_TOKEN`-ul de producție.** Tot ce e autentificat l-am probat
   **local**, cu chei Pionex false. Rutele publice și `?action=config` le-am
   probat pe producție.
2. **Nu am probat cu chei Pionex reale.** `balances` și `openOrders` ajung la
   Pionex și primesc `Invalid apikey` de la cheia mea falsă — asta dovedește că
   drumul merge, **nu** că datele tale se întorc corect. Poate fi încă o problemă
   de listă albă de IP (cheile Pionex se pot lega de IP, iar Cloudflare iese pe
   IP-uri care se schimbă).
3. **Am apăsat 77 de butoane din 261.** Restul de 184 stau în panouri neafișate
   (tab-uri neintrate). Nu știu ce fac.
4. **Zero probe pe telefon.**
5. **Zero probe pe offline / reinstalarea PWA.**
6. **N-am verificat matematica** celor „12 + 13 engines" (FIFO, calibrare,
   Monte Carlo, atribuire). Am verificat că se cheamă, nu că socotesc corect.

---

## Ordinea reparațiilor, dacă vrei să meargă

1. `fills` + `orders` pe server (#1) — fără asta v71 nu-și face treaba de v71.
2. `functions/api/provider-health.js` (#3) — altfel Live Readiness e zidită.
3. O bază D1 + `db/schema.sql` + legătura `DB` (#4) — altfel nu se ține minte nimic.
4. Sincronizează `package.json` cu scripturile care chiar există (#2) — sau scrie-le.
5. KV `API_RATE_LIMIT` (#8) înainte de orice folosire serioasă a Pionex.
6. Cheile de date (#5) și VAPID (#6), după cum îți trebuie modulele.
