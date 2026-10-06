# Carnetul fișei — „fișa are dreptate?” (I-561) · design

Data: 2026-10-06 · Aprobat de el în chat: „Fișa are dreptate?” (ce judecă), „Istoric + înainte” (de unde vin cazurile), „Da, așa” (designul).

## Ce a cerut el (cuvintele lui și alegerile din chat)
- „continuă” după propunerea carnetului (I-561) = da.
- Întâi: **fișa are dreptate?** — nu Consilierul, nu becurile (Consilierul are deja „urmat / neurmat”).
- Cazurile: **re-joc pe istoric** (verdict imediat) **+ înainte** (colectorul notează oferta zilnic; ofertele lui din fișă).
- Pagina în „Zilnic” + un rând sub fișă.

## Presupuneri (ale mele — se corectează dacă el spune altfel)
- Fereastra de judecată = fereastra probei fișei: `FEREASTRA_ZILE = 3` zile; istoricul fișei = `ZILE = 30` zile (grid-plan.js).
- Rezultatul unei variante = `GridProba.simuleaza(...).net` (fracție din sumă, după comisioane; deschisul la prețul de la capăt), ca în `GridPlan.proba`.
- Re-jocul pornește o dată pe zi (nu la 6 h) — 3 zile de fereastră ⇒ pornirile din aceeași monedă se suprapun oricum; bootstrap-ul pe monede ține cont de asta.
- Ambele direcții (long și short) pe fiecare pornire — direcția e o altă decizie, nu a fișei.
- Validation Lab rămâne neatins în „Laborator vechi”; carnetul e o pagină nouă `carnet` (nimic șters).

## Cele 3 întrebări (afirmații pe care fișa le face deja)
1. **Alegerea** (`GridPlan.alege` → `cine` ta/mea, fără `asteapta`, fără `mea.egalaCuTa`): varianta aleasă a ieșit mai bine decât cealaltă, pe aceeași fereastră? Perechi: `{r: net(ales), ales:true}` și `{r: net(celălalt), ales:false}` ⇒ `RiscLuna.verdict(l, x=>x.ales, {cheie:"simbol", timp:"t", min:30, reps, seed})`.
2. **„Aș aștepta”** (`alege(...).asteapta`): pornirea variantei pe care ar fi ales-o (`cine`) a ieșit mai prost când fișa zicea „aștept” decât când nu? `{r: net(cine), asteapta}` ⇒ `RiscLuna.verdict(l, x=>x.asteapta, …)` (CU = a zis „aștept”; „dovedit-rau” = fișa are dreptate să aștepte).
3. **Calibrarea stopului**: `proba.stop / proba.n` promis vs stopul venit după, pe 3 coșuri (< 30%, 30–50%, > 50%): n, promis mediu, venit. Fără „dovedit” (e o potrivire, nu un efect); sub 30 într-un coș ⇒ „puține”.
4. (doar înainte) **„Pornește / aștept / nu”** (verdictul fișei, `oferta.verdict`) — depinde de semafor, nu se poate re-juca: se numără ofertele judecate; sub 30 ⇒ „prea puține încă”.

Regula verdictului = cea a riscului tău (RiscLuna.verdict): dovedit = IC 99% (bootstrap pe monede) fără zero + același semn în ambele jumătăți de timp; IC 95% singur = la limită; altfel nedovedit; sub 30 pe o parte = prea puține.

## Fără privit în viitor (garda)
- Re-jocul, la pornirea `s`: fișa (`GridPlan.variante`) primește DOAR `b15.slice(s − 30 zile, s)`, prețul = `b15[s].o`, mișcarea pe zi din aceleași bare. Simularea începe la `s`.
- Proba: stric barele de după `s` (le înmulțesc cu 3) ⇒ `rec`, `ta`, `mea` (banda, grile, levier, proba) rămân identice; doar `net` se schimbă.

## Datele
- **Re-joc**: în laboratorul de noapte (`scripts/lib/tura-laborator.mjs`), pe barele pe care le aduce deja (60 de zile × 15M, top 20 + monedele boților) ⇒ cazurile.
- **Înainte**: laboratorul notează la fiecare rulare oferta de azi pe fiecare monedă (long + short) în `data/carnet-oferte.json` (local, păstrat 120 de zile); ofertele lui vin din KV `ferestre` (fișa salvează de acum și `grile`; cele vechi fără grile ⇒ „nejudecabile”, numărate). O ofertă se judecă după 3 zile, pe barele de după `t`.
- **Raportul** (`Carnet.raport`) ⇒ POST `/api/istoric-bot?action=carnet` (KV `carnet`, ≤ 256 KB, cere `la`) ⇒ pagina și rândul de sub fișă îl citesc cu GET.

## Unități
- `lib/carnet.js` (IIFE, `globalThis.Carnet`, pur): `rejoc(b15, o)`, `judecaOferta(of, b15)`, `simVarianta(b15, s, v, dir)`, `intrebari(cazuri, o)`, `calibrare(cazuri)`, `raport(...)`, textele (`textAlegere`, `textAsteapta`, `textCalibrare`, `textVerdictFisa`, `randSubFisa`).
- `lib/carnet-ecran.js`: `carnetHtml(r)` pur + `carnetPorneste()` (GET, o încercare pe minut).
- colector: laboratorul cheamă `Carnet.rejoc` + notează / judecă ofertele + trimite raportul.
- server: `action=carnet` GET/POST.
- pagina: secțiunea `carnet`, butonul „Carnetul fișei” în Zilnic; rândul sub fișă.

## Erori
- Fără raport: pagina spune „Carnetul se face noaptea, în laborator; încă nu e.” Raport vechi (> 36 h): se spune vârsta.
- O monedă care pică în re-joc: se sare, se numără („N monede fără re-joc”), nu oprește laboratorul.
- Timpul re-jocului se măsoară; peste 5 minute ⇒ pas de 2 zile (se spune în raport).

## Testele
- Proba `proba-v100117.mjs`, roșie întâi: re-joc pe bare construite cu rezultat știut; garda „fără viitor”; perechile întrebării 1; verdictul pe date amestecate (permutare ⇒ nu „dovedit”); calibrarea pe coșuri; ofertele vechi fără grile; serverul `carnet`; pagina în fake DOM (garzi-v746 ecran-vm); garda textelor (grup `carnet`, STRICT).
