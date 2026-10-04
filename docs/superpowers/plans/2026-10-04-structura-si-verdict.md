# Structură și verdict (I-517…I-526) — planul-registru

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, regula lui: lucrez direct). Registrul stă în fișierul ăsta
> (secțiunea „Registru” de la coadă) și în memorie după fiecare sarcină. Codul întreg al fiecărei sarcini e în `scripts/proba-v10092.mjs`
> (testele, scrise ÎNAINTE) și în diff-urile commit-urilor; aici stau hotărârile, ordinea și contractele dintre sarcini.

**Goal:** cele 10 propuneri din `premarket_scanner/docs/ideas/backlog.md` (I-517…I-526, `b92b1aef`), aprobate de el cu „fă tot” (04.10):
structura paginilor (Tablou, fișă, Trading 212, Acasă) și verdictul (Consiliu, semafor, dimineață), fără să schimbe semaforul decât
gardat de verdictul Busolei (I-523).

**Architecture:** un singur producător pentru Busola (`Busola.cartela`), folosit de fișă, Tablou, Acasă și de rezumatul de dimineață;
restructurările de ecran se fac prin post-procesare a HTML-ului existent (grupuri, pliere, file), nu prin rescrierea concatenărilor
din `app.js`; verdictul primește intrări noi (`busola`, `regimRadar`) în `SemnaleBot.semafor` și `Consiliu.alcatuieste`, cu texte
sub gărzile STRICT („semafor”, „consiliu”, „acasa”, „alerte”/raport).

**Tech Stack:** JavaScript (ES5 în `public/lib`, ESM în colector/probe), Node 24, probele proiectului.

**Spec:** mini-specurile I-517…I-526 din backlog (Problema / Soluția / Impact / Riscuri / Fișiere).

## Global Constraints
- Versiunea paginii v100.92 (BUILD_INFO, versiune.js, package.json 100.92.0, sw.js `crypto-radar-v100-92`, index.html ×4); colectorul v101.62.
- `npm test && git commit && git push` — niciodată `;`; fără `git pull` în `crypto`; nimic din `data/` în git.
- Textele: românește, cu diacritice; gărzile STRICT fără abateri (`node scripts/garda-texte.mjs`); motiv ≤ 60, faCe ≤ 110 la persoana I, deCe ≤ 160, rândurile Consiliului ≤ 110, raport ≤ 160.
- `app.js` e CRLF — editat doar prin script cu ancore o singură dată; niciun `//` lipit la mijlocul rândului.
- Fiecare test văzut ROȘU înainte de cod; proba nouă `scripts/proba-v10092.mjs`; probele vechi rămân verzi (sau se actualizează cu hotărâre scrisă).

## Review Focus
1. Pagina fără rezumat Busola (încărcare picată) — cartela, Consiliul și semaforul nu aruncă și nu inventează stări.
2. Rezumatul Busolei fără `perp.bilant` sau cu „prea puține” — semaforul NU primește motivul (I-523), Consiliul tace.
3. Fișa pe telefon cu secțiunile pliate — „Setările de pus în Pionex” rămân deschise; pe PC nimic pliat; verdictul lipicios nu acoperă conținutul.
4. Trading 212 fără idei (prima tură) — filele arată 0 și textele goale de până acum; butonul de pe Acasă deschide fila „Idei”.
5. Rândul-verdict de dimineață când lipsesc ideile sau boții — rândul se scurtează, nu scrie „undefined” sau „0 din 0”.

## Ordinea și contractele
| # | Idee | Produce | Consumă |
|---|------|---------|---------|
| 1 | I-518 + I-524 | `Busola.cartela(rez, simbol, acum, {kv, pret, prop})` → `{eticheta, interval, rand}`; `Busola.comparaInterval(fisa, jos, sus)` → `{raport, text}`; `Busola.htmlCartela(c, esc)`; `randFisa(…, prop)` cu `comparatie` | eticheta, randFisa, bilantText, liniaBoti (v100.91) |
| 2 | I-517 | `tbGrup(titlu)`; grupurile Azi / Dacă închizi acum / Contextul în `tbDeseneazaExtra`; `tbBusolaLinie` desenează `htmlCartela` | 1 |
| 3 | I-519 | `grPliabil(titlu)`, `grPliazaPeTelefon(box)` după `box.innerHTML=h`; `.grVerdict` lipicios cu `--grSus` măsurat | — |
| 4 | I-520 | `t212File(file, aleasa)` → HTML cu 3 butoane + 3 panouri; `t212FilaAlege(k)`; `t212IdeiRender` împarte în idei / revenire / socoteală | — |
| 5 | I-521 | `acasaCumpar` pe 3 coloane (`.acCumparCol`), a 3-a = `acasaCumpar2Corp` | — |
| 6 | I-525 | `tbSugestiiCorp`: dunga „g” și textul roșu când istoricul lui pe monedă e pe minus (≥ 3 boți) | — |
| 7 | I-522 | `Consiliu.alcatuieste({…, busola:{stare}, regimRadar:{miscare}})` → `c.busolaVsRadar` (≤ 110) + desen `🧭` | 1 (pazaStare) |
| 8 | I-523 | `SemnaleBot.semafor({…, busola:{stare, bilant}})` → componenta `cod:"busola"` DOAR la miscare + „dovedit” | 1 (pazaStare, bilant) |
| 9 | I-526 | `scripts/lib/dimineata-titlu.mjs` `titlu({boti, reveniri, eticheta, deIesit})`; `out.liniiIntai`; `tura-dimineata` le pune întâi | — |
| 10 | versiuni, garda, revizia Opus, poze 1920/390, push | | toate |

## Registru
- Pre-flight: 1 → 2/7/8 pe `pazaStare`/`eticheta` (semnături neschimbate din v100.91); 9 e independent; nimic contradictoriu.
- Lotul A (sarcinile 1–3: I-518, I-524, I-517, I-519): proba-v10092 (A) 6 teste văzute ROȘII (funcțiile lipseau), apoi 6/6 verzi; probele vechi atinse verzi (busola 21/21, v10090 14/14 după hotărârea de mai jos, v10091, v10085-ecran, v10071, v10082).
- Ruling (I-524): textul comparației poartă faptul din I-505 cu scopul lui („al ei a pierdut cel mai puțin, pe spot”), nu „pe 4h, cel mai larg a pierdut cel mai puțin” — Busola a măsurat pe spot, boții lui sunt pe futures (memoria: I-505 nu măsoară boții lui) — costă, dacă greșesc, o paranteză de reformulat.
- Ruling (I-519): „sub 600 px” = pragul existent al fișei `@media (max-width:600px)`, nu un prag nou de 599 — un singur prag pe fișă; plierea se face în JS (`matchMedia`) pe același prag, iar înălțimea barei lipite se MĂSOARĂ (`grSusMasoara`), nu se presupune.
- Ruling (I-518): proba-v10090 (5) accepta doar literalul `Busola.eticheta(…)` pe Tablou — acum acceptă și `Busola.cartela(…,{kv:…})` (aceeași cheie Pionex, același KV); intenția testului rămâne.
- Lotul A: complete — commit `bbb3db0` (local, nepublicat), suita întreagă verde (`npm test` exit 0, 70 de PASS; ieșirea în scratchpad/suita-A.txt).
- Lotul B (sarcinile 4–6: I-525, I-520, I-521): proba-v10092 (B) 4 teste văzute ROȘII, apoi 10/10; probele vechi v10082 / v10085-ecran actualizate la noua formă (mai jos), v10089 / v10071 / v10090 / v10091 verzi.
- Lotul B: complete — commit `35e315a` (local), suita întreagă verde (`npm test` exit 0; scratchpad/suita-B.txt).
- Loturile C + D (sarcinile 7–9: I-522, I-523, I-526): proba-v10092 (C/D) 7 teste văzute ROȘII, apoi 17/17; garda STRICT fără abateri (situații noi: semafor.busola, consiliu.busolaVsRadar ×2, dimineata.titlu ×3); v10090 (5) și v10091 (4) lărgite (importul cu `cheiaBot`, versiunea `v101.6x`).
- Sarcina 10 (versiuni): complete — commit `80a854e` (local), suita verde (`exit=0`, 70 PASS) ÎNAINTE de commit.
- Pozele 1920/390 (scratchpad/poze-92): coloanele Acasă 3×513 px / Tablou 3×503 px (una sub 980), verdictul lipicios la 64 px (PC) / 164 px (telefon, bara 156 măsurată) și după 700 px derulate, secțiunile pliate doar pe telefon, „Setările de pus în Pionex” deschise, filele T212 comută + localStorage, fără undefined/NaN, consola curată pe PC. Defecte găsite: (1) pe telefon apăsarea pe o secțiune pliată NU deschide — `v54ActionArg` nu acceptă `this` (eroare în consolă) ⇒ cheia secțiunii ca text + `data-gr-sect`; (2) butoanele filelor ies ca bare pe toată lățimea (`.tbIntBtn` e stilat doar sub `#tabloubot`/`#gridset`/`.t212Graf`) ⇒ `.t212File .tbIntBtn`. Amândouă prin test (RED→GREEN) în pasul de reparații.
- Reparațiile de după poze: proba-v10092 2 teste văzute ROȘII (grPliereComuta(k) + data-gr-sect; `.t212File .tbIntBtn`), apoi 18/18; pozele refăcute (scratchpad/poze-92b): pe 390 „🚦 Poarta de pornire ⇒ deschis”, consola curată; la 1920 filele ca bandă compactă cu fila activă evidențiată. Revizia Opus (requesting-code-review, promptul scratchpad/revizie-92-prompt.md, baza b4b5fda, arborele de lucru inclus) lansată în fundal înaintea commit-ului reparațiilor (conținut identic).
- Reparațiile de după poze: complete — commit `4021e35` (local), suita verde (`exit=0`, 70 PASS) ÎNAINTE de commit. Ramura locală: b4b5fda → bbb3db0 (A) → 35e315a (B) → 25d92e0 (C+D) → 80a854e (versiuni) → 4021e35 (reparații); nimic pușat încă.
- Revizia Opus (agent opus, 26 min, 110 unelte): 0 critice, 8 importante, 12 minore, 12 „declined to judge”. Regradate după efectul asupra lui și reparate într-UN pas, fiecare cu test văzut ROȘU (proba-v10092 F, 8 teste + 4 aserțiuni vechi ajustate):
  - Imp. 1 (I-523 calca „mișcarea e cu botul”) ⇒ `sf !== "cu"` pe componenta Busolei; Imp. 2 (al doilea mesaj pe Discord) ⇒ `CHEI.busola = ["busola-miscare"]` + `activ["busola-miscare"]` din `_busola`; Imp. 3 (candidați galbeni vs liste roșii) ⇒ `tbIstoricRosu(x)` comun, ROȘU în toate listele (Ruling: specul voia roșu, „în toate listele la fel”; candidații își schimbă culoarea de la galben la roșu pe aceeași condiție); Imp. 4 (I-522 „mediana” greșit — specul greșea; regimul fișei = percentila 75, 4h SAU 24h) ⇒ „(4h/24h față de obișnuit)”, 109 semne; Imp. 5 (I-526 „nimic de ieșit” fără T212 citit) ⇒ `t212Citit`, `deIesit: null` când nu; + minora 5 regradată Importantă (boții din rezumat vechi în „Azi:”) ⇒ `boti: liniaVeche ? [] : lBoti`, titlul în afara try-ului bot-orders; Imp. 6 (caseta lipicioasă prea înaltă pe telefon) ⇒ sub 600 px caseta ține eticheta + primul motiv, lista motivelor sub ea (`.grListaJos`), nelipicioasă; Imp. 7 (plierea ascunde FAPTE) ⇒ Ruling: regula lui din 25.09 bate specul — „🚦 Poarta de pornire” rămâne deschisă (planul, „Verifică poarta”, frâna contului), iar secțiunea pliată care conține `.tbWarn`/`.bad` poartă „⚠” în titlu; Imp. 8 (I-518 parțial) ⇒ Ruling (I-518): un singur producător de DATE (`eticheta`/`randFisa`/`liniaBoti`, împachetate în `cartela` pentru Tablou); fișa își ține fraza întreagă (`randGrid`, mai bogată: cifra pe episod), portofoliul și dimineața folosesc direct `liniaBoti` — aceleași funcții, nu copii; `cartela.rand` rămâne pentru Acasă/Busola (livrarea 2). Costă, dacă greșesc: trei formulări ale „nemăsurat” (notat ca minor).
  - Minore reparate pentru că erau ieftine și ale mele: 9 (I-524 marginea „cam la fel” pe cifra rotunjită), 10 (comentariul importului lipit pe alt rând), 12a (`||`-ul care anula verificarea ordinii în testul (A)).
- Pasul de reparații verificat pe poze (scratchpad/poze-92c, 390): „🚦 Poarta de pornire [fix]” (deschisă), restul pliate și se deschid la apăsare („Ce spune istoricul tău ⇒ deschis”), caseta lipicioasă 124 px (eticheta + primul motiv; azi BTC are un singur motiv, lista de sub casetă apare doar cu ≥ 2), consola curată, 0 px defilare. Suita G a picat la v10087 (1) (harness fără `tbIstoricRosu`) ⇒ completat; suita H în curs (commit doar la `exit=0`).
- Final: Ruling (declined 1–4, 12): I-517 în același bloc, I-525 ≥ 3, I-522 doar pe pagină, I-523 în socoteală doar ca motiv principal, cele 2 minore amânate dinainte — rămân cum sunt (hotărâri deja scrise mai sus).
- Final: Ruling (declined 5): bilanțul pazei judecă notări `perp4h`, deci pentru monedele din harta spot „dovedit” vine din altă populație — de pus sesiunii Busolei (cimin-eb), nu se schimbă nimic în Radar.
- Final: Ruling (declined 6): „o singură zecimală” e regula DatorieTrack/rapoarte; Radarul scrie 2–3 zecimale peste tot — „−0,17 pp” rămâne.
- Final: Ruling (declined 7–8): filele fără număr la prima tură (nimic inventat) și rândul Radar-vs-Busola indiferent de bilanț — cum cere I-522 — rămân.
- Final: Ruling (declined 9–11): tăierea Discord la 2000, cache-ul vechi `busola.js`, „altă voce” la granița de 4,5 h — cazuri de margine dinainte, neatinse.
- Final: minor (deferred): blocul probabilităților („Ce s-a întâmplat în trecut…”) nu se pliază pe telefon (desenat după pliere, `<h4>` fără `.tbBlocCap`).
- Final: minor (deferred): plierea — săgețile/cursorul în afara `@media` (landscape arată „▸” cu secțiunea deschisă); `--grSus` măsurat doar la desen (rotire ⇒ vechi până la 5 min); Enter/Space nu pliază, lipsește `aria-expanded`; cheia `grPliere` după titlu („Proba pe ultimele N zile” își schimbă cifra).
- Final: minor (deferred): `SOC`/`PRIO` fără `busola` (fără cip de încredere, ordonat ultimul); în semafor componenta stă înaintea ia-profit/muta/costuri/btc/aglomerare.
- Final: minor (deferred): „agitație dovedită” sugerează agitația dovedită, nu efectul; pe Discord `mic()` o face „busola: …” — alternativă „Busola: după agitație gridul pierde −0,17 pp pe episod”.
- Final: minor (deferred): coloana a treia de pe Acasă duce doar la T212 (monedele sunt pe Tablou); la eroare scrie „aștept listele” la nesfârșit.
- Final: minor (deferred): fila „Socoteala sfaturilor” la cerere picată scrie un motiv inventat; `role="tablist"` fără `role="tab"`.
- Final: minor (deferred): CSS mort după trecerea pe grid (`columns:2`, `column-span:all`); „Fără bot citit.” într-o treime (`grid-column:1/-1`).
- Final: minor (deferred): I-524 fără situație în gardă (~93 semne); `acasaCumpar2`/`.acCumpar2` nedesenate de nimeni (probele v10085/v10089 testează un rând nevăzut).
- Final: minor (deferred): probele — I-523 testat și cu regim (reparat în F), I-525 comparat cu candidații (reparat în F), literalul I-522 copiat din spec (acum din codul regimului), `stare: "nemasurat"` în garda-alerte e o stare pe care producătorul n-o emite.
- Final: minor (deferred): pe telefon bara de sus (156 px) + verdictul lipicios (124 px) ocupă ~o treime din ecran la derulare — cum a cerut specul (verdict + motive la vedere); dacă i se pare mult, varianta compactă (doar eticheta la derulare) e un pas mic.
- Final: minor (deferred): capul secțiunilor pliate are `role="button"` + `tabindex`, dar dispatch-ul delegat ascultă doar click — Enter/Space de la tastatură nu pliază (telefonul n-are tastatură; pe PC nimic nu e pliat).
- Final: minor (deferred): 15 px de defilare orizontală la 1920 pe ecranele cu bară verticală (`main`/`.mainArea`/`header.topStatus` late cât fereastra, 1920 vs 1905) — e dinainte de v100.92 (și pe Acasă, neatins; pe `gridset` fără bară e 0), nu intră în lotul ăsta.
- Final: minor (deferred): pe Acasă cartela arată „aștept ideile” câteva zeci de secunde după încărcare — ideile sunt ultimul pas din `pas(…)` (după regimurile boților); ruta răspunde 200; ordinea e dinainte.
- ⚠️ Greșeala mea (C+D): commit-ul `25d92e0` s-a făcut pe o suită ROȘIE — `suita-C.txt` avea `exit=1` (proba-v10086 (9) verifică literal importul `paza-boti`, acum cu `cheiaBot`), iar lanțul meu `grep … && git commit` a trecut pentru că grep-ul găsise rândul `exit=…`, nu pentru că era 0. Reparat cu: aserțiunea lărgită + suita rulată DIN NOU verde ÎNAINTE de commit-ul următor; de acum condiția e `grep -q "exit=0"`.
- Ruling (I-523): intrarea semaforului e `Busola.pentruVerdict` — null când rezumatul e vechi (> 4,5 h) sau moneda nu e urmărită: un verdict nu se sprijină pe o măsurătoare veche (regula pazei); cifra e `perp.bilant.dif` (mișcare − oricând, pe date noi) în pp; componenta se pune DUPĂ „mișcare” (Radar), deci intră în socoteală pe cod „busola” doar când e primul motiv — ipoteza se judecă acolo; azi verdictul e „prea puține” ⇒ componenta e adormită.
- Ruling (I-522): rândul se arată doar pe pagină (tbConsHtml), nu pe Discord/poză — specul cere „în Consiliu, un rând”, iar poza nu desenează nici `altaVoce`; textul fără „nu greșeală” (108 ≤ 110 cu „— orizonturi diferite”; cu tot specul ar fi ~140).
- Ruling (I-526): rândul-verdict îl alcătuiește colectorul (`dimineata-titlu.mjs`, `out.liniiIntai`) și `tura-dimineata` îl pune primul; `Consilier.rezumatDimineata` rămâne neatins (specul îl listează doar ca fișier atins); fără bot-orders (cererea picată) nu e rând-verdict — nimic inventat.
- Ruling (I-525): pragul e ≥ 3 boți (regula candidaților, „aceeași regulă … în toate listele la fel”), nu „≥ 5” din titlul mini-specului — specul se contrazice, iar impactul cerut e consecvența între liste; costă, dacă greșesc, o cifră într-o condiție.
- Ruling (I-521): rândul vechi `acasaCumpar2Corp` rămâne (format identic, din `acasaCumpar2Parti`) ca probele v10085/v10089 să nu-și piardă intenția; cartela nouă e `acasaCumpar` pe 3 coloane; proba v10082 (2) și v10085-ecran (8) își schimbă aserțiunile de FORMAT (aceleași fapte) — garda „acasa” n-avea situații pe cartelă (riscul din spec nu s-a adeverit).
- Ruling (I-520): a treia filă e „Socoteala sfaturilor” (fără număr), cum cere specul; fila fără conținut (prima tură) arată textul gol de până acum; alegerea filei nu redesenează panoul (nu pierde ce scrie el în „Urmăresc și”).
- Ruling (I-517): grupurile sunt 3 coloane în ACELAȘI bloc (`#tbAcum` grid, 1 coloană sub 980 px), nu 3 blocuri separate — titlul blocului rămâne cel din `index.html`, nimic nu se mută din loc.
