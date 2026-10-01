# Griduri înguste, cu profit rapid, pe monedele sugerate — design

**Data:** 01.10.2026 · **Cerut de el:** „vreau să adăugăm și griduri mai înguste, nu așa largi cum le dai tu acum, înguste cu profit rapid pe coinuri sugerate pe direcție”. Ales de el: **durata o aleg eu pe istoric** (6 / 12 / 24 h); **apare în idei și în fișă**; designul (abordarea A) aprobat cu „da”.

## De ce ies largi azi
Fișa (`GridProba.fisa`, H = 2 zile) alege lățimea din percentilele 60/75/90 ale mișcării pe 2 zile — ca prețul să stea în grid ~2 zile ⇒ intervale de ~8–15 %. Un grid îngust e un interval pe care prețul îl străbate de multe ori în câteva ore: multe perechi, profit rapid, dar iese mai des din interval și comisionul cântărește mai mult pe fiecare treaptă.

## Ce construim (abordarea A — același motor)
Același simulator (`GridProba.simuleaza`: comision maker 0,02 % pe grile, taker 0,05 % la pornire/închidere/stop, linia fără ordin a Pionex, stopul din afara intervalului, lichidarea) — o a doua căutare, „îngustă”. Nimic nou de crezut pe cuvânt: aceeași socoteală ca la gridul de acum.

### 1. Modulul — `GridProba.ingust(b15, o)` (pur, în `public/lib/grid-proba.js`)
- **Intrare:** bare de 15 minute (cronologic), `o = {dir, pret, suma, levier}`; `dir` = direcția pieței (vezi 2), una singură.
- **Duratele probate:** H ∈ {6 h, 12 h, 24 h} (`H` în zile: 0,25 / 0,5 / 1).
- **Lățimile:** percentilele **30 / 45 / 60** ale mișcării (max−min)/deschidere pe ferestre de H (aceeași funcție `latimi`), calculate DOAR pe partea de antrenare.
- **Pașii:** aceiași candidați ca acum (`pasi`), de la pasul minim **0,30 %** (la 0,04 % comision dus-întors pe grilă, sub atât câștigul pe pereche se topește).
- **Ieșirea:** stopul (puțin în afara intervalului, ca acum) sau **capătul duratei** — închidere la piață (taker). Rezultatul fiecărei ferestre = net după TOATE comisioanele, inclusiv poziția închisă la final.
- **Alegerea (fără privit în viitor):** istoricul se taie în **antrenare = primele 2/3** și **test = ultima 1/3**. Pe antrenare se alege celula (H, lățime, pas) cu scorul de PLATOU de acum (celula și vecinele ei bune, nu una norocoasă). Pe test se raportează doar ce a făcut celula aleasă.
- **Ferestrele independente:** pornirile sunt la 6 h (`PAS_FERESTRE`); la H = 12 h / 24 h ferestrele se suprapun ⇒ `nIndep = n × 6 h / H`.
- **Când se PROPUNE:** pe test, **cel puțin 30 de ferestre independente**, **mediana netă > 0** și **marginea de jos Wilson 95 % a „% ferestre pe plus” > 50 %**. Altfel: `propus: false` cu motivul („pe X, gridul îngust n-a ieșit pe plus pe ultimele N zile, după comisioane — rămâi la cel lat” / „prea puține ferestre independente pe 24 h”).
- **Ieșire:** `{propus, motiv, dir, H, setare (construieste: jos, sus, linii = grile+1, levier, levierSigur, lichidare, stop, profitGrila), antren: stat, test: {n, nIndep, mediana, pePlus, ic, celMaiRau, perechiZi}, laZile}`.

### 2. Direcția („pe direcție”)
Doar direcția pe care o dă piața pentru monedă — trendul pe 4 h + 1 zi (aceeași regulă ca fișa/Direcția pieței): în sus ⇒ long, în jos ⇒ short, lateral ⇒ neutru. **În mișcare mare (regimul „mișcare” al clasamentului) ⇒ nimic** („gata liniștea — nu porni îngust”). Nu se probează direcția contrară pieței.

### 3. Cine calculează (o singură sursă)
- **Colectorul**, la fiecare 6 h, doar pentru monedele sugerate (`Idei.ideiBoti`, cel mult 5): aduce **60 de zile** de 15 minute (12 pagini Pionex, o dată la 6 h pe monedă, cu pauze ca acum), rulează `GridProba.ingust` și scrie rezultatul în KV-ul local (`ingust:<SIMBOL>`, ruta `istoric-bot?action=ingust`). Pe 60 de zile, testul are ~20 de zile ⇒ ~80 ferestre de 6 h, ~40 de 12 h, ~20 de 24 h (24 h nu va trece pragul de 30 — se spune, nu se ascunde).
- **Pagina** citește rezultatul colectorului. Pentru o monedă care nu e sugerată, fișa îl calculează pe loc pe cele ~31 de zile pe care le are deja și scrie „pe 31 de zile — mai puține ferestre”.

### 4. Unde se vede
- **„💡 Pe ce aș porni un bot acum” (ideile de boți)**: sub fiecare monedă sugerată, un rând **„⚡ grid îngust”**: direcția, intervalul (jos–sus, %), liniile de scris în Pionex (N+1), durata, perechi pe zi, și pe partea de test: mediana, % ferestre pe plus, cel mai rău, câte ferestre independente. Dacă nu trece: motivul, pe scurt. Butonul existent duce în fișă.
- **„Grid: ce setez?” (fișa)**: lângă varianta de acum, un bloc **„⚡ Varianta îngustă”** cu tot ce se scrie în Pionex (jos, sus, linii, levier — cel sigur, stop jos/sus) + **„închide-l după H dacă n-a atins stopul”** + cifrele de pe test. Avertizează, nu înlocuiește: verdictul fișei și varianta de acum rămân neschimbate.

### 5. Ce NU se schimbă
Gridul de acum și verdictul fișei, clasamentul, alertele, Pionex (doar citire), cota KV de pe Cloudflare (totul în KV-ul local), partea de acțiuni.

### 6. Riscuri spuse pe față
- Gridurile înguste ies mai des din interval; pe istoricul lui, LIGHTER (30.09, −59) a arătat cât costă un stop. Proba poate spune „nu merită pe nicio monedă azi” — și atunci asta se arată.
- Cifrele de pe test sunt ce s-a întâmplat, nu o promisiune; pe ~20 de zile de test, o săptămână neobișnuită schimbă mult.
- Comisionul real poate fi mai mare decât 0,02 % pe unele monede (taker la umpleri rapide) — proba folosește 0,02 % pe grile și 0,05 % la pornire/închidere, ca fișa de acum.

## Cum se probează
- Proba nouă `scripts/proba-v10058.mjs`, scrisă ÎNTÂI și văzută picând: (a) alegerea folosește doar antrenarea (schimbarea barelor de test nu schimbă celula aleasă); (b) pe bare în tendință puternică ⇒ nepropus; pe oscilație curată în interval ⇒ propus, cu net pozitiv după comisioane; (c) `nIndep` corect la 12 h / 24 h; (d) mișcare ⇒ nimic; (e) ruta păstrează rezultatul; (f) pagina îl arată.
- Rulat și pe datele reale ale monedelor sugerate de azi (ieșirea arătată lui, nu un test).
- Poze la 1920 și 390 px (idei + fișă), proba de ecran a gridului, revizie Opus la final.
- Versiunea paginii v100.58, colectorul v101.38.
