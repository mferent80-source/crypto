# Pachetul 3 — O singură voce (I-474, I-473, I-479, I-472) — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** aceeași recomandare (a Consilierului) pe Tablou, pe pagina alerts de pe telefon și pe Discord; când se schimbă verdictul, se spune DE CE; motivele de același nivel se ordonează după banii MĂSURAȚI; „am făcut / n-am făcut” lângă acțiune, cu socoteala după 30 de decizii.

**Architecture:** `Consiliu` primește ordonarea după bani (I-479) și `Consiliu.deCe(inainte, acum)` (I-473) — pur. Colectorul alcătuiește Consilierul la fiecare tură, pe aceleași intrări pe care le are (semaforul, „Acum, concret” cu lumânările de 15M, socoteala, banii la margine) și (a) pune în poză `niv / motive / sfat` din Consilier — **pagina alerts îl arată fără nicio schimbare în premarket_scanner**; (b) la o schimbare de nivel ținută 2 ture, o alertă cu acțiunea, banii și „de ce” (Discord pe ATENȚIE / IEȘI; întoarcerea la ȚINE doar în Radar); alerta semaforului „s-iesi” trece doar în Radar (altfel două voci pe Discord); (c) KV `cons:<bot>` cu verdictul de acum, cel de dinainte și „de ce”. Tabloul arată „🔁 schimbat acum X: din … — de ce”. I-472: butoane lângă „Ce aș face eu” → KV `decizii:<bot>`; colectorul le judecă la 24 h din istoricul botului → KV `decizii-socoteala`.

**Spec:** `docs/superpowers/specs/2026-10-01-consiliere-personalizata-design.md` — „Pachetul 3”.

## Global Constraints
- Consilierul din colector NU are sfaturile și consilierul de pagină (cer date doar de pagină) — le spune Tabloul; nivelul vine din semafor + cartelele „Acum, concret” + socoteală, deci poate fi mai blând decât al Tabloului doar când un sfat de pagină (ex. marginea istorică) e singurul motiv. Se spune în comentariu și în README.
- Ordinea motivelor: lichidarea, planul, opritorul și stopul rămân primele (siguranța nu se negociază); restul de același nivel după `bani` din socoteală, DOAR de la 10 cazuri judecate; altfel lista fixă de azi.
- Alerta de schimbare: doar după 2 ture la rând cu același nivel nou (anti-pâlpâire); o dată pe schimbare; „de ce” = motivele apărute / dispărute.
- Deciziile: judecate la 24 h pe totalul botului (din `ist:<bot>`; botul închis înainte = rezultatul final); socoteala „urmat vs neurmat” arătată de la 30 de decizii judecate (sub: „încă N din 30”) — e o comparație, nu o dovadă (cine urmează și cine nu nu sunt situații la întâmplare).
- Versiuni: `v100.50` (BUILD_INFO + badge „v100.50 · O SINGURĂ VOCE”, package.json, index.html ×4, sw.js CACHE, versiune.js), colector `v101.29`. Proba `scripts/proba-v10050.mjs`. Fără schimbări în premarket_scanner.

## Review Focus
1. Bot fără fișă încă (semaforul „asteapta”) ⇒ în poză `niv` null (pagina: „FĂRĂ DATE”), fără alertă.
2. Nivelul care pâlpâie ATENȚIE↔ȚINE la fiecare tură ⇒ nicio alertă (cere 2 ture la rând).
3. Discord: nu două mesaje pentru același IEȘI (semaforul + Consilierul).
4. Decizie dată de două ori pe același verdict ⇒ se păstrează ultima, nu se numără dublu.
5. Botul închis înainte de 24 h ⇒ decizia se judecă pe rezultatul final, nu rămâne nejudecată.

### Task 1: `Consiliu` — ordinea după bani (I-479) + `deCe` (I-473)
- [ ] Teste (picând): (a) două motive „atentie” — `margine` (socoteala: 15 judecate, bani −20) și `trend` (12 judecate, bani +50) ⇒ `trend` înaintea lui `margine`; (b) cu `lichidare` „iesi” și `stop` „atentie” prezente, rămân primele indiferent de bani; (c) sub 10 judecate ⇒ ordinea fixă de azi; (d) `deCe({nivel:"tine",motive:[]}, {nivel:"atentie",motive:[{cod:"stop",titlu:"Stopul e peste plan"}]})` ⇒ text cu „din 🟢 Ține în 🟡 Atenție” și „+ Stopul e peste plan”; motiv dispărut ⇒ „− …”; același nivel și aceleași coduri ⇒ null.
- [ ] Implementare în `public/lib/consiliu.js`: `var FIX = {opreste:1, lichidare:1, plan:1, stop:1}`; comparatorul: `rang[nivel]`, apoi `FIX` înaintea celorlalte (între ele `prio`), apoi pentru ceilalți: `baniMasurati(cod)` = `soc[SOC[cod]||cod]` cu `judecate >= 10` ? `bani` : null — ambele măsurate ⇒ bani descrescător; altfel `prio`. `deCe(a, b)`: `{text, plus:[titluri], minus:[titluri]}` sau null.
- [ ] `node scripts/proba-v10050.mjs` → toate; `npm test` verde; commit local.

### Task 2: colectorul alcătuiește Consilierul — poza, alerta de schimbare, KV `cons:<bot>`
- [ ] Teste (picând): funcție pură nouă `Consiliu.pentruPoza(c)` → `{niv, motive:[titluri ≤6], sfat}` (`asteapta` ⇒ `niv: null`); funcție pură `Consiliu.schimbare(stare, c, acum)` → `{stare nouă, alerta | null}`: prima tură cu nivel nou ⇒ doar `asteaptaConfirmare`; a doua la rând ⇒ alertă `{nivel: critic|atentie|info, titlu, mesaj, doarRadar}` (doarRadar la întoarcerea în ȚINE); pâlpâire (nou, vechi, nou) ⇒ nicio alertă; `asteapta` ⇒ nimic. Static: colectorul încarcă `consiliu.js`, cheamă `Consiliu.alcatuieste` și `pentruPoza`, trimite `action=cons`; în `alerte.js` cheia „s-iesi” are `doarRadar: true`.
- [ ] Implementare: în `semnaleBot(b)` (colector.mjs, după `x.semafor`): `x.concret = SemnaleBot.acumConcret({bot:b, fisa:f, zero:TabloExtra.dacaInchizi(b), costuri:x.costuri, plan:ctx.plan, pragMargine, pragStop, acum, cifre:(pr)=>TabloExtra.cifreActiuni(b,{protectie:pr,b15:GridCalcul.bare(r15)})})`; `x.cons = Consiliu.alcatuieste({sm:x.semafor, concret:x.concret, socoteala:socotealaUltima, laJos:TabloExtra.totalCuGridLa(b, b.gridJos), opritor, btc: x.btc && x.btc.text})`. La construirea pozei, botul primește `semafor` → înlocuit cu `cons` prin `Consiliu.pentruPoza` (poza.mjs: `semaforBot` acceptă și forma Consilierului). Starea `_cons` în `stareAlerte[b.id]` (scrisă atomic, ca acum). POST `action=cons` `{bot, acum, inainte, schimbatLa, deCe}`.
- [ ] Ruta `cons` (GET/POST) în `istoric-bot.js`, cu test pe KV fals.
- [ ] `node scripts/proba-v10050.mjs`; `COLECTOR_DOAR_INCARCA=1`; `npm test`; commit local.

### Task 3: Tabloul — „de ce s-a schimbat” (I-473) + „am făcut / n-am făcut” (I-472)
- [ ] Teste (picând): rutele `decizie` (POST `{bot, t, nivel, titlu, faCe, urmat}` ⇒ `decizii:<bot>`, cel mult o decizie pe verdict — a doua o înlocuiește; GET) și `decizii-socoteala`; funcție pură `Consiliu.judecaDecizii(decizii, istoric, final, acum)` ⇒ `r` = totalul la 24 h − totalul de atunci (sau final − atunci dacă botul s-a închis), null dacă n-a trecut ziua; `Consiliu.socotealaDecizii(lista)` ⇒ `{urmat:{n, median}, neurmat:{n, median}, text}` (sub 30: „încă N din 30”); static: `tbConsHtml` are `tbConsDeCe` și butoanele `tbDecizie(true|false)`.
- [ ] Implementare: în `tbConsHtml`, sub titlu: `🔁 schimbat acum X min: din <eticheta veche> — <deCe>` (din `tbCons`, adus din `action=cons` la 2 min); lângă „Ce aș face eu”: două butoane mici „✅ am făcut” / „✋ n-am făcut” (aria-label, ținte ≥ 44 px pe telefon) → POST `decizie` cu totalul de acum; după apăsare, textul „notat: am făcut (14:05)”. Rândul socotelii deciziilor sub ele. Colectorul: `turaDecizii` o dată pe oră — botii activi + închișii din ultimele 7 zile cu `decizii:<id>`, judecă, scrie înapoi, adună în `decizii-socoteala`.
- [ ] `frontend-design`: butoanele în sistemul existent (`.actionGhost` mic), fără culori noi; stările „notat” și „eroare”.
- [ ] `node scripts/proba-v10050.mjs`; `npm test`; commit local.

### Task 4: versiunea, ecranul, revizia, livrarea
- [ ] v100.50 / colector v101.29; `npm test`; ecran Tablou + Grid; repornirea colectorului (o dată) și probă: poza are `niv/sfat` din Consilier, `cons:<bot>` în KV; poze la 1920/390; revizia finală (agent Opus nou); reparațiile cu test; `npm test && git push`; memo.
