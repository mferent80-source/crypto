# „Contează acum” + curba stopului — plan (Radar v100.313 / colector v101.171)

> Execuție: nativ (regula lui: lucrez direct; un singur agent Opus doar la revizia finală). Pași cu `- [ ]`.

**Goal:** sfaturile care pun bani în joc azi ies în față (blocul „CONTEAZĂ ACUM”, Acasă), iar stopul botului primește cifra măsurată „atins într-o zi în ~N din 100”.

**Architecture:** curba simetrică rulantă (21 de perechi Binance perp, 1h, ultimele 30 de zile, ATR 14) o face colectorul o dată la 6 ore ⇒ KV `curbaStop` (cheie proprie: `prob:<bot>` are plafon 16.384); `prob:<bot>` primește doar `atr1h`. Pagina calculează șansa cu prețul viu (`CurbaStop.pentruStop`) și alege rândurile (`Conteaza.alege`) din `tbStare.sfaturiLista` (are `cod`) + rândurile roșii din listă.

**Tech:** module pure în `public/lib` (încărcate și de colector prin `incarca`), probe `node` cu `vm`, paritate cu Python.

**Spec:** macheta aprobată de el pe 08.11 (`scratchpad\macheta\MACHETA-*.png`) + `pine-scripts\LIQUIDITY-SWEEP-LAB\_proba-lsl-2026-11-08\CURBA-STOP-VARIANTE-2026-11-08.md` (R30s = singura variantă bună: ECE 24 h 0,022, 72 h 0,053; 7 zile NU).

## Constrângeri globale
- Se arată doar 24 h și „~” la 3 zile (72 h). 7 zile NU.
- Text: „N din 100”, N între 1 și 99; o zecimală la procente; prețurile cu `fmtP`/`pret` existente; „direcția nu se știe” spus pe față.
- Nimic pierdut: lista „Ce ai de făcut acum” rămâne întreagă; cele urcate primesc „↑ e și sus”; butoanele de copiere rămân la vedere.
- Prag: stopul intră în bloc de la 30 din 100 într-o zi; roșu de la 50.
- Cel mult 3 rânduri, după banii în joc: critic (pericol critic / alertă roșie) → stop ≥ 50 → pericol atenție → margine → stop 30–50 → zero.
- Versiuni: index.html (exact 4), sw.js CACHE + APP_SHELL, functions/_shared/versiune.js, BUILD_INFO.json, package.json; colector v101.171.
- Fără date (curba lipsă, ATR lipsă, cifre > 3 h): nicio cifră, nu se inventează.

## Review Focus
1. Bot SHORT: stopul e deasupra prețului ⇒ distanța în sus; test în Task 1.
2. Stopul dincolo de preț (deja trecut) sau stop inexistent ⇒ `pentruStop` = null, blocul fără rândul stopului; test în Task 1.
3. Curba veche (> 36 h) ⇒ fără cifră; test în Task 1.
4. Niciun rând calificat ⇒ blocul ascuns (nu gol); test în Task 2.
5. Reluarea Monte Carlo arată botul OPRIT ⇒ fără „stopul atins 100%”; test în Task 5.

---

### Task 1: `public/lib/curba-stop.js` (pur) + paritate cu Python
**Produces:** `CurbaStop.D` (0,25…15, pas 0,25) · `atr14(bare)→nr|null` (RMA, ca ta.atr) · `curba(seturi, acum, {zile=30, pas=4, H=[24,72]})→{la,zile,perechi,d,p24,p72,n24,n72}` (porniri din 4 în 4 de la bara 13, fereastra i+1…i+H încheiată în ultimele `zile`, excursia jos ȘI sus în ATR, supraviețuirea pe `d`) · `sansa(c,H,d)` (interpolare liniară; sub prima = prima; peste ultima = ultima) · `pentruStop({curba,atr,pret,stop,dir,acum})→{d,p24,p72,mut20,dMut20}|null` (null: lipsă, stop pe partea greșită, curba > 36 h) · `valida(c)→bool`.
- [ ] fixture Python (`export_curba_js.py` în proba LSL): 3 perechi × ultimele 1.000 de bare din cache ⇒ `scripts/date/curba-stop-fixtura.json` cu bare + p24/p72 așteptate.
- [ ] proba `scripts/proba-v100313.mjs` (roșie întâi): paritate ≤ 1e-12; `sansa` la 1,88 pe curba STX ≈ 0,54; long/short; stop trecut ⇒ null; curba veche ⇒ null; `mut20` dă `sansa(…)≈0,20`.
- [ ] implementare ⇒ verde.

### Task 2: `public/lib/conteaza.js` (pur) + `sfaturi.js` (`pctZero` pe sfatul „zero”)
**Consumes:** `CurbaStop.pentruStop` · sfaturile (`cod` pericol/margine/zero, `ton`, `titlu`, `text`, `faCe`, `copiaza`) · rândurile din listă (`c`, `depasit`) · șansele (`Probabilitati.randuri`: `cod` iese-jos-24/iese-sus-24, `p`).
**Produces:** `Conteaza.alege({stop, sfaturi, lista, sanse, bot})→[{cheie,ton:'rosu'|'galben',nr,nrSub,titlu,sub,faCe,copiaza}]` (≤ 3) · `Conteaza.html(l, esc)` (fără `<section>`; butonul `gridCopiaza(this.value)` ca în listă) · `Conteaza.acasa(l, nume)→{titlu,text}|null` (doar stopul sau un roșu) · `Conteaza.titluriSus(l)` (pentru „↑ e și sus”).
- [ ] teste: STX (stop 0,54 + margine 0,82 + zero +1,0) ⇒ exact 3, ordinea stop/margine/zero, tonuri roșu/galben/galben, textele din machetă; stop 0,25 ⇒ fără stop; nimic calificat ⇒ []; critic din listă ⇒ primul; „nimic urgent” ⇒ []; escape pe titlu cu `<`.
- [ ] implementare ⇒ verde.

### Task 3: server + colector
- [ ] proba: rută GET `action=curbaStop` (KV `curbaStop`), POST validat (d crescător ≤ 200, p în [0,1], aceeași lungime, n ≥ 0) ⇒ 400 pe stricat; `turaCurbaStop` cu Binance fals ⇒ POST + disc, o dată la 6 h, refuz sub 10 perechi; `turaProbabilitati` pune `rez.atr1h`.
- [ ] `scripts/lib/tura-curba-stop.mjs` (`SIMBOLURI` = cele 21, `/fapi/v1/klines?interval=1h&limit=1000`), colectorul: `incarca("curba-stop.js","CurbaStop")`, tura în bucla grea, `data/curba-stop.json`, v101.171.

### Task 4: pagina — blocul, rândul stopului, drumul, Acasă
- [ ] proba (vm pe app.js / grafic-bot / asezare-paznic / acasa-ecran): `#ctAcum` în index.html după `#pzVerdict` (order 12, toată lățimea), `tbRenderConteaza` ascunde blocul gol; `tbSansePt` adaugă `stop-24`; `GraficBot` SANSE `stop` ⇒ „24 h: ~54%” pe rândul „stopul tău”; drumul: eticheta stopului cu `pzDrumSansa`; Acasă `acCtLinie` doar cu stop ≥ 30 sau roșu.
- [ ] implementare + CSS (desktop + ≤ 600 px) + `tbCurbaPt` (30 min) + redesen la sosire.

### Task 5: Monte Carlo cinstit
- [ ] proba: `tbMcScurtHtml(sc, {oprit:true})` și rândul principal (GridSim) nu mai scriu „stopul atins 100%” când `rez.acum.oprit`; spun „reluarea nu se potrivește cu Pionex … cifra măsurată e sus, în «Contează acum»”.

### Task 6: versiuni, mutații, suita, telefon, poze, revizie, commit
- [ ] versiunile (lista de sus), `test:v100313` în `test`, `scripts/date/mutatii-v100313.json` (≥ 12: pragul 0,30, roșu 0,50, ordinea, simetria, interpolarea, 36 h, short, plafonul, ascunderea, OPRIT, cheia KV, `atr1h`).
- [ ] suita separată, proba de telefon, poze pe VPS cu fișierele puse peste (1440 / 412 / 768 / 2560), revizia Opus pe diff, un commit ⇒ îl întreb ⇒ livrare detașată ⇒ VPS.
