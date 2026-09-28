# AUDIT SEVER — Crypto Radar v98.1 · 28.09.2026, 06:10–06:35

Cerere: „fă audit la crypto”. Metoda: **probă pe datele reale + drumul omului până la buton**, nu recitire de cod.
Nimic din cod nu a fost atins; raportul e singurul fișier scris. Auditul anterior: `AUDIT-SEVER-CLAUDE-2026-09-22.md`.

## Ce am probat (cu cifre)

| proba | rezultat |
|---|---|
| `npm test` (toate suitele din `package.json`) | verde, exit 0 |
| `scripts/proba-ecran-tablou.mjs` (Chrome real, Tabloul botului) | verde, exit 0, niciun Chrome rămas pornit |
| 36 de rute `/api/*` chemate din `app.js` + `lib/`, cu token, pe serverul local | 33 răspund cu date; 3 spun cinstit că nu-s configurate (`push`, `monitor`, `history`) |
| toate cele **47 de ecrane** (`[data-nav]`) deschise în Chrome real, 1920 px | **0 excepții JS, 0 erori de consolă, 1 cerere picată** (știrile GDELT pentru JTO, 502 timeout) |
| telefon 390 px: Acasă, Tablou, T212, Scan, Alerte | nicio depășire laterală reală (elementele „peste margine” sunt sertarul de meniu ascuns) |
| pagina Trading 212 din Radar, drumul omului | pozițiile apar în 0,5 s, 19 cereri T212 toate 200 (cache-ul serverului) |
| versiuni | live `crypto-wuy.pages.dev` = local = `v98.1`, `sw.js` `crypto-radar-v98-1`, `package.json` 98.1.0 — toate bat |
| poza de pe worker-ul Paznicului (cu cheia de citire) | 1,5 min veche, tura 437, 7 poziții T212, botul JTO, 9 simboluri îmbogățite, `radarUrl` null (tunelul e oprit — corect) |
| worker `paznic-radar` | cron `*/10` la loc; `/poza` fără cheie ⇒ 401; `tt-proxy` fără cron (cum am lăsat 27.09); `radar-monitor` nu există (corect, e cod mort) |
| depozitul `mferent80-source/crypto` (PUBLIC) | 277 fișiere; zero secrete (doar webhook-uri false în probe); `.dev.vars*`, `data/`, `.wrangler/` ignorate |
| CSP servit local | `script-src 'self'`, `frame-ancestors 'none'` — la fel ca în producție |
| jurnalul colectorului `data/colector.log` (26–28.09) | vezi constatările 1, 3, 7 |
| memoria proceselor Radarului | 2,2 GB (workerd 987 + 705 MB, wrangler 345 MB, colector 106 MB), stabilă în 20 de minute |

Procese găsite: serverul 8788 (wrangler + 2 workerd), colectorul PID 21380, panoul robotului `PAZNIC-CRYPTO`. **Tunelul cloudflared NU rulează** (mort de la repornirea PC-ului, 27.09 19:03).

---

## 🔴 CRITIC

Niciunul găsit. Nimic nu pune bani în pericol direct: aplicația e doar-citire (zero rute de ordine), secretele nu au ieșit, alertele pleacă, cifrele coincid între ecrane (Tablou și pagina T212 arată același „29.074 lei · deschise −1.623 lei” în același minut).

## 🟡 SERIOS

### 1. Colectorul se calcă singur pe picioare la Trading 212 — 88 de „a limitat cererile” în 36 de ore
- 27.09: 61 de linii; 28.09 până la 06:11: 26. Pe ture: **planuri 36 · poza 33 · frâna 19**. În 13 secunde distincte au picat câte două ture deodată (ex. `18:28:42.220 planuri` + `18:28:42.497 frana`).
- Cauza: trei ture (poza la 2 min, planurile la 5 min, frâna) cer `pozitii`/`cont` în aceeași secundă; `functions/api/t212.js` are cache (30–60 s) dar **nicio coalescere a cererilor în zbor** — trei chemători paraleli = trei cereri la T212 înainte să se umple cache-ul; T212 permite 1 la 5 s pe portofoliu și 1 la 30 s pe `account/info`.
- Efect: tura de planuri (opritoarele tale −15 % de la maxim) sare o dată din trei; poza păstrează pozițiile vechi (chip-ul „pozițiile de la HH:MM” acoperă asta). Se vindecă singur la tura următoare, dar în piață o alertă de opritor poate întârzia 5–10 min.
- Reparație: în `t212.js` o hartă de promisiuni în zbor pe cheie (cine vine al doilea așteaptă răspunsul primului) + turele colectorului serializate pe T212. Ora de lucru, cu test.

### 2. „Azi” la simbolurile tale minte în afara orelor de bursă
- `scripts/lib/yahoo-extra.mjs:27` pune `prev = închiderea penultimă` orbește; pozițiile T212 folosesc `prevClose(bare, acum)` (ultima sesiune încheiată, ziua New York) — `colector.mjs:535` vs `:559`.
- Dovadă din poza de acum: **INTC `pret 123 · prev 127,39` ⇒ „Azi −3,45 %”** (e mișcarea de vineri), în timp ce **NWSA `pret 28,49 · prev 28,49` ⇒ 0,0 %**. Două tabele, două definiții, pe același ecran, duminică seara.
- Același `prev` intră și în alerta „mișcare > 2×ATR”: sâmbătă ar putea anunța a doua oară mișcarea de vineri (cheia de dedupe e pe zi).
- Reparație: `prev: prevClose(bare, Date.now())` și la simboluri (I-459 s-a făcut doar la poziții). 15 minute + test.

### 3. KV-ul gratuit al Paznicului: ~864 din 1.000 de scrieri pe zi
- `cadentaPoza` dă 2 min **oricând e un bot activ** — iar un bot grid e activ și noaptea ⇒ 720 de poze/zi (azi: 95 în 3 h 11 min, exact cadența). Plus bătaia separată la 10 min (`turaPaznic`) = 144. Comentariul din `poza.mjs` socotea „2 min × 16 h + noaptea la 5 min”, ipoteză care nu ține cu un bot pornit.
- Dacă se depășește: `KV.put` refuză, poza nu mai urcă, Paznicul te anunță după 30 min că „colectorul tace” deși el trăiește. Un al doilea colector (alt PC) sau probele mele de azi consumă din aceeași cotă.
- Reparație: scoate bătaia separată cât poza curge (`verifica()` citește deja `la` din poză) ⇒ 720/zi; sau poza la 3 min noaptea. Și cheia rămasă `poza:la` din KV (de dinainte de revizie) se poate șterge.

### 4. „Cumpărare de insider” anunțată pentru o tranzacție de acum 6 săptămâni
- `scripts/lib/poza.mjs:132` — verdictul „devine” bull când **starea anterioară lipsește** (prima îmbogățire a simbolului). Așa a plecat pe Discord 27.09 19:40 „INTC: cumpărare de insider” pentru cumpărarea CEO-ului din **11.08** (105 k acțiuni la 95 $; prețul e 123 $ acum). Informația nu era nouă atunci.
- Reparație: fără stare anterioară nu e știre; și tranzacția să fie din ultimele ~30 de zile.

### 5. Pagina Health minte în ambele direcții
- `/api/provider-health` spune **DEGRADED la COINGECKO** („refuză cererile de pe Cloudflare”) și **la TWELVE DATA** („modulul de acțiuni e oprit”) — dar de acasă `crypto_global` răspunde 200 cu date reale și acțiunile vin de la Yahoo (`/api/stocks` zice `provider: YAHOO, configured: true`). Verificarea probează existența cheii, nu apelul.
- În același timp **FAIL la D1**, DEGRADED la KV și PUSH — de la 22.09 încoace, în fiecare zi, fără plan să se lege. Un perete de roșu în care o cădere adevărată nu s-ar mai vedea. Același strat mort se vede și în ecranele „Cloud Monitor” (D1 NOT CONFIGURED), „Context Intelligence” (4 × not configured), `/api/monitor` („MONITOR_WORKER_URL not configured”), `workers/radar-monitor.js` + `wrangler.monitor.toml`.
- Hotărârea e a ta: (a) legi `--d1 DB` local (o opțiune în lansator + `db/schema.sql`) și cheile pe care le vrei, sau (b) scoți stratul (D1/push/monitor/Cloud Monitor/Local Data) și Health rămâne cu ce chiar folosești. Până atunci, măcar rândurile CoinGecko/Twelve Data să probeze apelul real.

### 6. Serverul de dezvoltare ține 376 MB de urme pe disc și crește
- `.wrangler/state/v3/observability/…/*.sqlite` **225 MB** + `cache/default` **153 MB**, din 22.09 ⇒ ~60 MB/zi; KV-ul propriu-zis (istoricul) e doar 2,2 MB. Sunt urmele locale ale lui wrangler și cache-ul API, nu date de-ale tale.
- Reparație: lansatoarele să șteargă `observability/` și `cache/default` la pornire (cât serverul e oprit); nu există opțiune de oprit urmele în `pages dev`.

### 7. Tabloul arată „ȚINE — nimic nu cere o mișcare” cât încă socotește
- 06:24, ecranul lui de zi cu zi: cartela verdictului **ȚINE · „Nimic nu cere o mișcare acum”** cu „calculez fișa de azi…” dedesubt, iar la două ecrane mai jos, în „Ce ai de făcut”: **„Mută gridul — prețul stă la marginea de jos (9,6 % din interval)”**. Șase minute mai târziu, pe telefon, verdictul era **ATENȚIE** cu același motiv (6,1 %).
- Pragul e același (`semnale-bot.js:32`, `poz < 0.1`); problema e starea de așteptare prezentată ca verdict definitiv. Reparație: cât nu-s lumânările, cartela spune „calculez…”, nu ȚINE.

### 8. Lansatorul telefonului nu oprește tunelul vechi (proiectul următor, cum ai zis)
- `PORNESTE-SI-PE-TELEFON.bat` șterge PID-urile vechi la pornire („nu se mai opresc”), deci un cloudflared rămas dintr-o fereastră închisă brutal supraviețuiește și pornește al doilea tunel. Nici `PORNESTE-CRYPTO-RADAR.bat` (`:INCHIDVECHI`) nu-l oprește. Acum tunelul e mort de la repornirea PC-ului, iar de pe telefon nu ajungi la Radar; butoanele „Deschide în Radar” din pagina `alerts` lipsesc corect (`radarUrl` null).
- De făcut când ești acasă și lansatoarele sunt închise (nu se editează un .bat care rulează).

## 🔵 DE CURĂȚAT / DE ȘTIUT

9. **Numere cu 16 zecimale în alerte** (Discord + Radar): „Gridul propus acum: 0.5474728091781905 – 0.6297907862327145” (`public/lib/alerte.js:107`), „maximul de după cumpărare (30.690000534057617)” (`actiuni-semnale.js:372`).
10. **60 de mesaje pe Discord în 27.09** — 10 × „VVV: pereche încheiată”, 6 × JTO, 6 × „grilă atinsă”, 5 × „Mediul boților”. E ce ai cerut pe 26.09; dacă obosește, „pereche încheiată” se poate strânge într-un rezumat pe oră.
11. „BTC a intrat în mișcare” de două ori în 32 de minute (05:02 și 05:34, 1,8× apoi 1,7×) — re-aprindere la fiecare trecere de prag.
12. `/api/market?type=health` raportează `version: "v56"` (`market.js:65`) — lansatoarele se uită doar la `service`, deci nu strică, dar minte.
13. **11 funcții scrise și nechemate** în `app.js`: aceleași 10 din 22.09 (`awaitPionexReady`, `markAlertsRead`, `marketLabelSymbol`, `paperEntryFillFraction`, `paperExit`, `portfolioReturnsSeries`, `safeUiToken`, `trainRegimeModels`, `v65BiasScore`, `v66Pf`) + `tbCadentaMs`.
14. `app.js` a ajuns la **893 KB** (721 KB pe 22.09, +24 %); `index.html` 250 KB. Bibliotecile noi sunt frumos separate în `public/lib/` (27 de fișiere), monolitul vechi rămâne.
15. **75 de fișiere din era ChatGPT** în rădăcină (`AUDIT_V54…V71`, `DEPLOY_V57…V71`, `FINAL_TEST_RESULTS_*`, `PARITY_*`, `FILE_MANIFEST_*`) — de mutat în `docs/arhiva/`.
16. Știrile GDELT (`/api/intel?action=news`) pică cu timeout de acasă pentru orice simbol ⇒ cutia de știri din Decision Core e goală. Furnizor extern, nu cod.
17. Memoria: serverul de dezvoltare ține **1,7 GB în două procese workerd** + 345 MB wrangler; măsurat de două ori la 20 de minute, stabil (987 → 1.038 → 987 MB). Nu e scurgere, dar `wrangler pages dev` nu e gândit să meargă 24/7 — dacă PC-ul geme, el e primul de repornit.
18. Alertele din Radar sunt plafonate la 100 (cea mai veche 25.09) — corect ca listă, doar să știi că „ultimele 7 zile” înseamnă de fapt „ultimele 100”.

---

## ✅ CE E BINE (verificat, nu presupus)

- **Zero excepții JS pe 47 de ecrane**, zero erori de consolă, o singură cerere picată (externă).
- **Zero secrete în depozitul public**, în arbore și în tipare (`.dev.vars*`, `data/`, `.wrangler/` ignorate); worker-ul răspunde 401 fără cheie; CORS doar pe suită și localhost.
- **Read-only e real**: `tradingExposed: false`, nicio rută de ordine.
- **`escapeHtml` e folosit consecvent** unde am căutat: 148 de ori în `app.js`, 61 în `t212-ecran.js`, 35 în `acasa-ecran.js`; titlurile de știri trec prin el (`app.js:5657`). CSP-ul strict ar bloca oricum un script injectat.
- **Cifrele coincid între ecrane**: Tablou și pagina T212 dau același sold și aceeași pierdere pe deschise în același minut; poza de pe worker are aceleași 7 poziții și același bot ca serverul local.
- **Alertele ajung**: 10 pe Discord azi până la 06:11 (AVGO/APLD −15 % din plan, JTO pe zero, BTC în mișcare, „LINIȘTE/MIȘCARE”), 100 în lista din Radar, aceleași ca pe Discord.
- **Poza curge la 2 minute**, cu insideri/rezultate/analiști reali de la Yahoo (cache 6 h în `data/poza-ext.json`), iar când T212 refuză, poza păstrează pozițiile vechi și spune ora lor.
- **Copiile de siguranță** ale KV-ului se fac zilnic la 03:00 (`data/copii/kv-<zi>`, 4 zile, păstrare 14).
- Versiunile bat peste tot; Pages a publicat v98.1 din push.

## ❓ CE NU S-A PROBAT — citește secțiunea asta

1. Am **deschis** cele 47 de ecrane, nu am **apăsat butoanele din ele** (289 de butoane în `index.html`; pe Tablou le acoperă proba de ecran, pe restul nu).
2. Telefonul: doar emulare la 390 px, nu un telefon real; tunelul e oprit, deci drumul de pe telefon (tunel + token) nu s-a putut proba.
3. **Matematica semnalelor** (semafor, ATR, FIFO, „zero”, lichidare) — am verificat că rulează și că aceleași cifre apar în mai multe locuri, nu că socotesc corect.
4. Din cele 205 `innerHTML` din `app.js` am verificat un eșantion, nu toate.
5. `test:ecran-grid` nu l-am rulat.
6. Discord: am citit jurnalul, nu canalul.
7. Cotele KV din contul Cloudflare nu se citesc prin API cu tokenul lui wrangler (GraphQL: „Authentication error”); cifra de 864/zi e socotită din cod și jurnal.
8. Live-ul `crypto-wuy.pages.dev`: doar badge + `sw.js`; funcțiile de acolo oricum nu ajung la burse (hotărât 22.09: rulare locală).

## Ordinea reparațiilor, dacă vrei

1. Coalescerea cererilor T212 + turele serializate (#1) — cel mai mare zgomot și singura care atinge alertele de opritor.
2. `prev` la simboluri (#2) — 15 minute, un test.
3. Bătaia separată scoasă cât poza curge (#3).
4. Insider „nou” doar cu stare anterioară (#4).
5. Health să probeze apelul real la CoinGecko/Yahoo + hotărârea ta pe stratul D1/push/monitor (#5).
6. Lansatoarele: curățenia `.wrangler/state` la pornire (#6) + tunelul vechi oprit (#8) — împreună, când ești acasă.
7. Cosmeticele (#7, #9–#15) într-o singură versiune.
