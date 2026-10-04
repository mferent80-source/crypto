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
- Ruling (I-525): pragul e ≥ 3 boți (regula candidaților, „aceeași regulă … în toate listele la fel”), nu „≥ 5” din titlul mini-specului — specul se contrazice, iar impactul cerut e consecvența între liste; costă, dacă greșesc, o cifră într-o condiție.
- Ruling (I-521): rândul vechi `acasaCumpar2Corp` rămâne (format identic, din `acasaCumpar2Parti`) ca probele v10085/v10089 să nu-și piardă intenția; cartela nouă e `acasaCumpar` pe 3 coloane; proba v10082 (2) și v10085-ecran (8) își schimbă aserțiunile de FORMAT (aceleași fapte) — garda „acasa” n-avea situații pe cartelă (riscul din spec nu s-a adeverit).
- Ruling (I-520): a treia filă e „Socoteala sfaturilor” (fără număr), cum cere specul; fila fără conținut (prima tură) arată textul gol de până acum; alegerea filei nu redesenează panoul (nu pierde ce scrie el în „Urmăresc și”).
- Ruling (I-517): grupurile sunt 3 coloane în ACELAȘI bloc (`#tbAcum` grid, 1 coloană sub 980 px), nu 3 blocuri separate — titlul blocului rămâne cel din `index.html`, nimic nu se mută din loc.
