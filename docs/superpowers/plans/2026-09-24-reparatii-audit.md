# Plan — reparațiile auditului sever din 24.09 (v74.5 → v74.6)

Cererea: „REPARĂ TOT" — toate constatările auditului sever din 24.09
pe Crypto Radar v74.5. Nu e spec separat: **auditul E specul** (constatările de mai
jos, cu dovezile lor). Pionex rămâne STRICT READ-ONLY — nicio rută nouă care scrie.

## Global Constraints

- Aplicația citește contul REAL al lui (boți grid futures Pionex). Orice cifră de bani
  LIPSĂ se afișează „—" / `null`, NICIODATĂ `0`. Capcana dovedită: `Number(null)===0`,
  `+null===0`, `Number.isFinite(+null)===true`, `x||0`, `nr(a)??nr(b)` cu `nr(null)=0`.
  `"0"` trimis de Pionex pe un câmp de lichidare înseamnă „nu există" (garda `>0` rămâne).
- Fiecare reparație începe cu proba care PICĂ pe codul vechi (TDD), apoi codul. Probele se
  adaugă în scripturile existente ale domeniului sau în scripturi noi `scripts/*-v746.mjs`.
  După fiecare reparație: **strică-o intenționat** și arată că proba pică, apoi restaurează.
- Stilul codului: cel din jur (JS minificat pe un rând în `app.js`, nume românești în codul
  nou din v72+). Comentarii puține, în română, fără diacritice în `.bat`.
- NU atinge versiunea (package.json, BUILD_INFO, sw.js CACHE, badge) — o face controlorul
  la final. Excepție: Task 3 face `APP_VERSION` să NU mai fie hardcodat (vezi acolo).
- ⚠️ În comentarii HTML nu pune NICIODATĂ accent grav (backtick) — a omorât alt soft de 4 ori.
- `.bat` se salvează cu CRLF. Pe Windows: `python`, nu `python3`; procese oprite cu
  `taskkill /PID x /T /F`. Porturi INTERZISE: 8787, 8788, 8791 (servere ale lui).
- Fiecare task lucrează DOAR pe fișierele listate la el (task-urile rulează în paralel, în
  worktree-uri separate). Dacă ai nevoie de altceva, scrie în raport, nu edita.

### Contractul rutei `/api/bot-orders` (produs de Task 1, consumat de Task 2 și Task 3)

Pe fiecare bot, pe lângă câmpurile existente:
- `nr(v)`: `null`/`undefined`/`""`/nenumeric → `null`; `"0"` → `0`.
- `profitRealizatBrut` = `totalRealizedProfit` (fără comisioane/finanțare — dovedit:
  `usdtInvestment + totalRealizedProfit + totalFee + totalFundingFee = marginBalance`, exact).
- `profitNet` = profitul REALIZAT NET = `marginBalance − investit` dacă ambele există, altfel
  `totalRealizedProfit + totalFee + totalFundingFee` dacă toate trei există, altfel `null`.
- `pnlNerealizat` = `|position| × (pretCurent − positionOpenPrice)` × (+1 long, −1 short);
  la neutru: semnul lui `position` așa cum vine, plus `pnlNerealizatSigur:false`.
  Orice termen lipsă → `null`.
- `echitate` = `marginBalance + pnlNerealizat`; `profitTotal` = `echitate − investit`
  (null dacă lipsește ceva).
- `pretLichidare`: lichidarea relevantă; `distantaLichidarePct`: distanța SEMNATĂ cea mai mică
  dintre părțile existente (`>0`): jos = `(pret−jos)/pret×100`, sus = `(sus−pret)/pret×100`;
  negativă = depășită. `lichidarePartea`: `"jos"|"sus"|null`. `lichidareDepasita`: bool.
  Fără preț → `distantaLichidarePct:null` + `motivFaraDistanta:"fara-pret"`.
- `sumar`: orice total cu un termen `null` devine `null`, cu `probleme.sumarIncomplet:[câmpuri]`.
- Răspuns Pionex fără `result===true` sau fără `Array.isArray(data.results)` → **502** cu
  `{error, motiv}`; lista goală e validă DOAR la `result:true` + `results:[]`.

## Task 1: Serverul (`functions/**`, `workers/**`, `wrangler.monitor.toml`, `scripts/bot-orders-v72.mjs`, `scripts/*-v746.mjs` noi pentru server)

Constatări de reparat:
1. `bot-orders.js:44` `d?.data?.results||[]` → validare de formă, 502 (contract). Proba din
   `bot-orders-v72.mjs` care CERE „data.orders → 0 boți" se inversează: acum cere 502.
2. `nr()` (`:21`) + rezerva moartă `:98` (`usdtInvestment`→`initUsdtInvestment`) + `sumar`
   (`:156` `t+(b[camp]||0)`) → contract. Fixtură nouă cu câmpuri `null`, `""`, lipsă.
3. Câmpurile de bani din contract (`profitRealizatBrut`, `profitNet` real, `pnlNerealizat`,
   `echitate`, `profitTotal`). Probă pe identitatea de mai sus cu cifre inventate.
4. Lichidarea (`:71-72`): contract (ambele părți, semnată, depășită, fără preț). Avertisment
   la depășit („lichidarea DEPĂȘITĂ") și la <15% pe partea corectă.
5. Avertismentul „comisioanele mănâncă mai mult decât câștigă botul" (`:84-85`): se aprinde
   doar la `|comisioane| > gridProfitBrut`; când `profitNet<0` și `gridProfitBrut>0` din alt
   motiv, mesaj nou care spune cauza: „grid +X, comisioane −Y, restul −Z din poziție/finanțare".
6. `fetch` fără timeout: `AbortSignal.timeout(8000)` pe TOATE fetch-urile către furnizori
   (`pionex-account.js`, `market.js`, `bot-orders.js`, `intel.js`, `external-intel.js`,
   `stocks.js`, `history.js` dacă are). Probă: fetch agățat → a doua cerere NU se blochează.
7. `bot-orders` folosește aceeași poartă de ritm ca `pionex-account` (cheile sunt aceleași) și
   păstrează `retryAfter` la 429.
8. `_shared/auth.js`: limită pe încercările GREȘITE (cheie `auth-fail:<IP>`, 10/min → 429)
   ÎNAINTE de verificarea tokenului. Probă: 11 greșite → 429.
9. `market.js` `type=futures`: cere autentificare (verifică în `public/app.js` — read-only —
   că aplicația trimite tokenul la acel apel; dacă nu, scrie în raport pentru Task 3).
   `type=health` poate rămâne public (doar da/nu).
10. `pionex-account` `balances`: cere `Array.isArray(data?.data?.balances)`, altfel 502.
11. `limit` nenumeric în `market.js` (klines/trades/depth) → valoarea implicită, nu `NaN`.
12. `external-intel.js:105`: paginarea `next` acceptată doar pe gazda așteptată.
13. `intel.js:75` `catch{}` gol → motivul trece în răspuns (`motivFallback`).
    `stocks.js:68` `close??price??0` → `null`.
14. `provider-health.js:41-43`: Pionex nu mai e „CONFIGURED/read-only" doar pe existența
    variabilelor — face o citire reală `bot/orders` (limit 1, prin poarta de ritm) și raportează
    `ok` / `cheie invalidă` / `fără Bot reading` / `429`; eticheta nu mai afirmă „read-only".
15. CoinGecko 403 „add a descriptive User-Agent": header `user-agent: CryptoRadar/74 (+read-only)`
    pe cererile CoinGecko de pe server.
16. `functions/api/[[catchall]].js`: orice `/api/*` inexistent → 404 JSON `{error:"NO_ROUTE"}`
    (azi întoarce index.html cu 200).
17. `workers/radar-monitor.js:201`: `MONITOR_TOKEN` comparat în timp constant (ca `auth.js`);
    la `env.DB` lipsă, răspuns/log clar în loc de throw înghițit în `waitUntil`.
18. `scripts/bot-orders-v72.mjs`: fixtura cu cifrele REALE ale lui (repo PUBLIC!) → cifre
    inventate, aceeași formă. Nicio altă fixtură cu cifre reale în fișierele tale.

## Task 2: Tabloul botului (`public/lib/tablou-bot.js`, `scripts/tablou-bot-v73.mjs`)

1. **🔴 Ordinea din `verdict()`**: azi FARA_BOT → vârstă → lumânări → istoric → lichidare lipsă
   → poziție lipsă → marginStatus → riskStatus → lich<8 → lich<15. Noua ordine: FARA_BOT →
   bot oprit/închis (verdict nou `OPRIT` „Botul e oprit", nu „Merge") → marginStatus/riskStatus
   periculoase → lichidare <8% sau DEPĂȘITĂ → lichidare <15% → abia apoi treptele NEDOVEDIT
   (vârstă/lumânări/istoric) → restul. Regula: **roșul nu se ascunde niciodată în spatele lui
   „Nu știu încă"**; NEDOVEDIT oprește doar verdictele verzi/de ritm. Proba de la
   `tablou-bot-v73.mjs:~640` care fixează ordinea veche se RESCRIE pe noua regulă, plus probe:
   bot 60 min + lich 4,6% → OPRESTE; istoric 1 min + LIQUIDATING → OPRESTE; 30 lumânări +
   lich 4,6% → OPRESTE; lichidare lipsă + marginStatus LIQUIDATING → OPRESTE; CLOSED → OPRIT.
2. Lichidarea (`:161-171`): calculează ambele părți (`estimateLiquidationPriceDown`/`Up`,
   doar `>0`), ia distanța SEMNATĂ cea mai mică; long cu Jos=`"0"` și Sus>0 → folosește Sus.
   Probe: neutru cu ambele (Sus la 3,85%) → OPRESTE; short cu Jos `"0"` rămâne corect.
3. Ritmul perechilor (`:190-209`): împarte la durata REALĂ dintre capete; dacă între capete e
   o gaură (>5 min fără mostre) → NECUNOSCUT. Când mostrele nu ajung, folosește
   `buOrderData.trx24h` (perechi în 24h, dat de Pionex) ca sursă, marcată „din Pionex 24h".
4. Unitățile măsurilor: fiecare măsură întoarsă poartă `unitate` (`"%"`, `"×"`, `"USDT"`...)
   și valoarea deja în unitatea afișată (comisionul ca procent, nu fracție). Task 3 afișează
   `unitate`; tu doar o produci și o probezi.
5. Semnalează în raport orice alt loc din `tablou-bot.js` unde lipsa devine 0.
6. Mesajele de eroare din `tablou-bot.js` (~`:418`): azi la 401 scrie „Cheile Pionex nu sunt
   puse… pornește din nou .bat". Nou: 401 `AUTH_REQUIRED`/`AUTH_INVALID` → „Pune parola în
   Setări (butonul ⚙)"; 403 permisiune → „Bifează «Bot reading» la cheia Pionex"; eroare de
   rețea (`TypeError`/„Failed to fetch") → „Serverul de acasă e oprit — pornește
   PORNESTE-CRYPTO-RADAR.bat"; cheile lipsă pe server (503/`NOT_CONFIGURED`) → mesajul cu .bat.
   Probe pe fiecare ramură.

## Task 3: Ecranul (`public/app.js`, `public/index.html`, `public/app.css`, `public/sw.js` (NU `CACHE`), `public/manifest.webmanifest`, `public/research-worker.js`, `scripts/proba-ecran-tablou.mjs`, `scripts/jurnal-fifo-v746.mjs` nou)

A. Panoul de boți și Tabloul:
1. `botiBan` (`app.js:4368`) și rândul listei (~4404): `v==null` → „—" ÎNAINTE de `+v`;
   „lichidare la" cu semn/parte din `lichidarePartea` (sus/jos), „DEPĂȘITĂ" cu roșu când
   `lichidareDepasita`; „nu pot socoti (fără preț)" la `motivFaraDistanta`.
2. Banii, după contract: în listă și pe Tablou — „Realizat net" (`profitNet`), „Nerealizat
   (poziție)" (`pnlNerealizat`), „Total" (`profitTotal`), plus investit și prețul de lichidare
   absolut. Eticheta „NET" doar pe cifra netă. Pe Tablou: și avertismentele serverului
   (`avertismente`), inclusiv „opritorul pe pierdere e setat dar STINS".
3. Tabelul de măsuri: afișează `unitate` din Task 2 (și ține cont că comisionul vine deja în %).
4. Mesajele de eroare (`tablou-bot.js:418` e al Task 2 — mesajul îl face `app.js`? verifică;
   dacă textul e în `tablou-bot.js`, scrie în raport exact ce trebuie schimbat acolo):
   401 AUTH_REQUIRED/AUTH_INVALID → „Pune parola în Setări" + buton spre Setări; 403
   permisiune → „Bifează «Bot reading» la cheia Pionex"; eroare de rețea („Failed to fetch")
   → „Serverul de acasă e oprit — pornește PORNESTE-CRYPTO-RADAR.bat". La prima deschidere
   fără parolă, aplicația spune unde se pune parola.
5. Starea „2 ACTIVI · 0 AVERTISMENTE" nu mai minte când `probleme` are ceva (ex. 429 pe prețuri).
B. Versiunea și service worker-ul:
6. `APP_VERSION="v71"` (`app.js:709`) → citit dintr-o singură sursă: `<meta name="app-version"
   content="v74.5">` în `index.html` (controlorul o urcă la final). Badge-ul din antet
   (`index.html:72` „v71 · … · AUDITED") → versiunea reală, fără „AUDITED"; valoarea implicită
   `v66` (`index.html:~1186`) și descrierea din manifest „v71" → corecte.
7. `sw.js`: `app.js` și `lib/*` NU mai sunt cache-first (HTML nou peste JS vechi): fie
   network-first ca `index.html`, fie `skipWaiting` + `clients.claim` la instalare. Alege
   network-first cu fallback din cache. `/api/*` rămâne network-only. Nu atinge `CACHE`.
C. Semnale și jurnal:
8. kNN „Hist ↑ X%" (`app.js:3690-3712`, `:4013-4017`): banda de zgomot alături de procent;
   fără culoare BULLISH/BEARISH cât e în bandă; eticheta „nedovedit"; ponderea lui în scorul
   LONG/SHORT → 0 (s-a măsurat: 48,8% direcție pe mers aleator).
9. Bara în formare (`app.js:3127`, `:3454`, `:3999`): semnalele și `autoLogResearchSetup`
   folosesc doar bare ÎNCHISE; prețul viu rămâne pentru afișare.
10. Porțile „SMALL LIVE READY" (`app.js:598-616`): pe limita de jos a IC 95% > 0 (există
    `bootstrapOos`/`ci95` în worker), nu pe media punctuală.
11. FIFO (`app.js:4346`): taxă în moneda de bază la BUY → `remaining = qty − fee` (fără
    lot-fantomă); fill fără timestamp → `unmatched` cu motiv, nu `Date.now()`; `feeCoin`
    lipsă → acoperire `UNRESOLVED`, nu „USDT". Sync-ul jurnalului: pauză ~1,1 s între cereri.
    Probe noi în `scripts/jurnal-fifo-v746.mjs` (extrag `v71BuildTrades`/`v71FeeUsd` din
    `app.js` cu `new Function`, cazuri numerice cunoscute: FIFO vs LIFO, taxă în bază).
D. Restul ecranului:
12. Telefon (390×844): coloana de bani vizibilă fără scroll lateral (rândul se rupe pe două
    linii); `#vcModuleTable` (980px) într-un container cu scroll propriu → pagina nu mai
    curge lateral; chip-urile din antet nu se suprapun; bannerul „Instalează" se poate închide
    (ține minte în localStorage cu try/catch).
13. `/api/push?action=config` cerut o singură dată la pornire (azi de 4 ori).
14. Health „Overall FAIL 46/100" înainte de orice analiză → „NEÎNCERCAT", iar watchdog-ul nu
    intră în SAFE MODE HARD pentru asta.
15. Scanner: „fallback FRESH · 4d old" → vechimea decide eticheta (STALE); „Stop scan"
    dispare la 100/100; monedele care nu sunt pe Binance se sar (fără 6 erori CORS fiecare);
    sortarea „Strength" sortează după Strength.
16. Distanța până la lichidare e față de ultimul preț, nu de prețul de marcaj → notă mică pe
    ecran („față de ultimul preț").
17. `scripts/proba-ecran-tablou.mjs:695`: ștergerea profilului Chrome — reîncercări și mesaj
    vizibil dacă eșuează (nu `catch{}` gol); fixturile cu cifre REALE ale lui → inventate.
    Proba de ecran se actualizează pentru câmpurile noi (Realizat net / Nerealizat / Total /
    „—" la lipsă / DEPĂȘITĂ) și pentru noile mesaje de eroare.

## Task 4: Gărzile, livrarea, lansatoarele (`package.json` (NU `version`), `scripts/syntax-v71.mjs`, `scripts/security-v57.mjs`, scripturi noi `scripts/garzi-v746.mjs`, `PORNESTE-CRYPTO-RADAR.bat`, `PORNESTE-SI-PE-TELEFON.bat`, `public/_headers`, `BUILD_INFO.json` (NU `version`/`badge`), `.gitignore`)

1. `npm test` include proba de token GREȘIT: leagă `security-v57.mjs` (dacă rulează curat pe
   codul actual; dacă cere lucruri moarte, extrage partea de auth într-o probă nouă) + o probă
   generică pe TOATE modulele `functions/api/*.js`: fără token și cu token greșit, fiecare
   `onRequest*` care nu e public (lista publică: market health, push config, intel config,
   external-intel config, stocks config, provider-health? — verifică în cod) → 401.
   ⚠️ Task 1 face `market?type=futures` să CEARĂ autentificare — nu-l pune în lista publică.
   Proba ta rulează pe codul lui Task 1 abia după îmbinare; scrie-o pe starea de după.
2. `npm test` prinde un `app.js` care moare la încărcare: include `test:ecran` în `npm test`
   (verifică că rulează singur, cu Chrome, pe un port liber ≠ 8787/8788/8791) SAU o probă
   `vm` care încarcă `app.js` cu un DOM minimal. Măsoară: `throw` pe linia 1 → PICĂ.
3. Probă statică pe `sw.js`: `/api/` network-only, `APP_SHELL` conține `/app.js` și
   `/lib/tablou-bot.js`, `app.js`/`lib` nu cache-first (Task 3 le face network-first).
4. Probă de sincronizare a versiunii: `package.json` = `BUILD_INFO.version` = `sw.js CACHE` =
   badge-ul din `index.html` = `<meta name="app-version">` (Task 3 îl adaugă) = descrierea din
   manifest (dacă conține versiune). Scrie-o așa încât să treacă după ce controlorul urcă toate.
5. `syntax-v71.mjs` verifică și `public/lib/*.js` și `functions/**/*.js`.
6. `deploy`: `"wrangler pages deploy public --project-name crypto"` (fără al doilea `npm test`;
   `predeploy` rulează singur). `engines.node` → `">=22"`.
7. `BUILD_INFO.gate`: cifrele (verificări, scenarii) generate din rulare, nu scrise de mână —
   un script `scripts/numara-probe.mjs` sau câmp scos; alege simplu.
8. Lansatoarele: (a) înainte de pornire, verifică portul 8788 (`Get-NetTCPConnection`); dacă e
   ocupat de ALTCEVA decât un wrangler/workerd pornit din acest folder, mesaj clar și ieșire —
   NU omorî procese străine; la oprire, doar PID-urile proprii. (b) Proba de pornire nu
   acceptă orice 200 de pe 8788 — verifică un răspuns specific aplicației (ex.
   `/api/market?type=health` cu JSON). (c) Browserul se deschide doar după ce proba trece.
   (d) `Read-Host -AsSecureString` pentru secret (convertit corect la text la scriere).
   (e) `wrangler` fixat pe o versiune exactă (`npm view wrangler@4 version` → ultima 4.x).
   (f) `cloudflared`: dacă e descărcat, verifică sha256 față de valoarea publicată în
   release-ul GitHub, altfel oprește cu mesaj. (g) `wrangler pages dev` pornit cu
   `--ip 127.0.0.1` în lansatorul LOCAL (telefonul merge prin tunel, care se leagă la local).
   Păstrează CRLF (verifică cu `file`). NU rula lansatoarele cu chei; probează părțile noi
   izolat (PowerShell-ul extras) și scrie cum.
9. `public/_headers`: `connect-src` pe listă albă — domeniile pe care `app.js` și
   `research-worker.js` le cheamă direct (grep `https://` în ele) + `'self'`; fără `https:` gol.
   `Access-Control-Allow-Origin: *` pe HTML → scos.
10. `.gitignore` acoperă `.dev.vars*` și profilurile de probă.
