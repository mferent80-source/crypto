# Proba pierderii: „închid botul când ajunge la −5% din sumă” — pre-înregistrare

Scrisă pe 22.11.2026, înainte de a citi vreun drum de bot pentru regula asta (am văzut doar arhiva boților închiși: rezultatul final al fiecăruia).

## De ce

Din arhiva lui (1.985 de boți futures grid închiși în 2026, net −5.938,5 USDT):

- un bot pe plus aduce în medie +3,2% din sumă, unul pe minus pierde −7,0%; îi trebuie 68,5% pe plus, are 57,8%;
- câștigul mediu rămâne ~3% oricât stă botul; pierderea medie crește cu vârsta: −11,2% la boții ajunși la 1 h, −14,3% la 4 h, −26,8% la 24 h;
- boții ajunși la 4 h (22% din boți) fac 64% din toată pierderea.

Tabelul ăsta e o descriere. Nu spune ce ar fi ieșit dacă închidea mai devreme: un bot terminat pe plus poate să fi fost întâi adânc pe minus.

## Ipoteza

Rezultatul boților lui vine din poziție, nu din grile (analiza din 20.11). Când totalul botului a ajuns la −5% din suma pusă, prețul a mers deja
mult contra poziției; grilele aduc prea puțin ca să acopere, deci a ține botul înseamnă a aștepta întoarcerea prețului. Ipoteza: **în medie, închis
acolo ar fi ieșit mai bine decât cum a ieșit**. Mecanismul e al lui, nu al pieței: pierderile sunt lăsate să crească (efectul de dispoziție), câștigurile
se iau la ~3%.

Ipoteza poate fi falsă: boții întorși de la −5% pe plus există, iar închiderea îi face pe toți pierderi sigure.

## Regula pusă la probă (una singură)

Botul se consideră închis **prima oară când totalul lui e la −5% din suma pusă sau sub** (totalul și suma din punctul acela al drumului; drumul are un
punct pe minut). Se ia totalul din punctul acela, nu −5% fix: dacă prețul a sărit, pierderea e cea de acolo.

De ce 5%: e pragul de „pierdere mare” folosit de casă de la v100.113 (`MARE = −0,05` în `risc-luna.js`, „pierderi peste 5%” pe pagina „Riscul tău”).
Nu e ales după rezultate și nu se încearcă alte praguri.

## Unitatea și măsura

- Unitatea: botul închis (long, short sau neutru) cu drumul întreg de la pornire.
- Măsura: `d = cum a ieșit − (totalul la prag − comisionul de închidere)`, în % din suma pusă. Comisionul: suma × levierul × 0,05% (marginea de sus).
  `d` sub zero = închiderea la prag ar fi fost mai bună.
- Media lui `d` pe episoade, cu interval prin reeșantionare pe **zile** (10.000 de trageri, sămânță fixă): boții din aceeași zi merg împreună.

## Pragurile și verdictul

- Sub **60 de episoade pe 20 de zile** se arată doar numărătoarea. Media nu se arată pe parcurs.
- Verdictul se **îngheață o singură dată**, la prima tură cu pragul atins și toți boții citiți. Ce vine după se numără, dar nu-l schimbă.
- E a doua regulă de ieșire pusă la probă (prima: „stop la margine”, 21.11). Intervalul ei e de **99%**, nu de 95% (de ce: simularea de mai jos).
- „închiderea” = capătul de sus al intervalului sub zero; „lăsatul” = capătul de jos peste zero; altfel „n-am aflat”.

## Ce nu intră

- Botul fără drum, cu drumul început la peste 15 minute după pornire (boții ținuți peste 7 zile), cu un gol de peste 5 minute chiar înaintea
  pragului, sau pornit direct sub prag.
- Boții închiși cu mai mult de două zile înainte de 22.11.2026 (drumurile se țin după închidere abia din 21.11).

## Ce nu poate spune

- Nimic despre alte praguri (3%, 10%) sau despre o regulă pe timp.
- Nimic despre un stop pus în Pionex (alunecarea lui poate fi alta decât punctul de pe drum).
- Nimic despre ce ar fi făcut el cu banii după închidere (un bot nou imediat schimbă socoteala).
- E pe boții pe care i-a ales el, cum i-a ales: nu e o regulă pentru orice bot.

## Simularea sub H0 (înainte de date)

`scripts/sim-h0-v100377-pierdere.mjs`: episoade cu diferența adevărată zero, cu piață comună în zi (corelația 0 / 0,3 / 0,6), la 60–240 de episoade pe
20–60 de zile, și cu diferențe cu coadă grea într-o parte (câteva pierderi foarte mari). Rezultatele rulării sunt scrise la capătul scriptului.

**Prima variantă, schimbată înainte de date (22.11.2026):** scrisesem un interval de 97,5% (0,05 împărțit la cele două reguli de ieșire puse la
probă) și așteptarea „verdict fals în cel mult ~2,5% din seturi”. Simularea a dat **2,3–6,0%**, cel mai des la 20–30 de zile și cu coadă grea:
reeșantionarea pe puține zile iese prea îngustă. Am trecut la intervalul de **99%** și am rulat simularea din nou (cifrele de mai jos). Nu citisem
niciun drum de bot când am făcut schimbarea.

Rezultatele cu intervalul de 99% (22.11.2026, 300 de seturi pe rând):

- H0: verdict fals în 0,3–3,7% din seturi; 5,0% într-un singur scenariu (20 de zile, coadă grea, fără corelație în zi), aproape tot „lăsatul” fals.
- H1 (închiderea chiar mai bună cu 3% din sumă): „închiderea” în 17,0% / 19,7% / 49,3% din seturi, la ~80 / 90 / 240 de episoade.
- **Limită:** puterea e mică. La prag, o îmbunătățire adevărată de 3% din sumă rămâne „n-am aflat” în patru cazuri din cinci. Un „n-am aflat” nu
  înseamnă „nu ajută”.

## Ce NU se face

- Nu se schimbă pragul, măsura sau numărul de episoade după ce vin datele. Orice schimbare se scrie aici, cu dată, înainte de a fi aplicată.
- Verdictul nu mută niciun stop și nu închide niciun bot: e o propoziție pe pagina Probe.

## Amendament (22.11.2026, ~13:20, înainte de orice drum citit): a doua regulă la probă

De azi e la probă și „închid după 4 ore pe minus” (`2026-11-22-v100377-proba-timpului.md`), pe aceiași boți. Regula de aici NU se schimbă: simularea
pentru două reguli (`scripts/sim-h0-v100377-doua-reguli.mjs`) dă verdict fals la măcar una din două în 0,3–3,7% din seturi cu intervalul de 99% la
fiecare, sub pragul de ~5% hotărât dinainte. Verdictele celor două probe nu sunt două dovezi independente (o parte din boți au episod în amândouă).

## Amendamentul din 22.11.2026, 16:32 (după auditul independent; înainte de orice drum citit pentru verdict)

Un audit independent al codului și al documentelor (două revizii, doar în citire) a găsit greșeli. Le îndrept aici, înainte ca proba să pornească pe
viu (colectorul v101.210 nu e încă livrat). Ce era scris mai sus rămâne, ca istorie.

1. **Intervalul trece la 99,5%, la amândouă regulile.** Simularea pentru două reguli pe care mă sprijineam era greșită: regula a doua avea ~0,7 episoade
   pe zi, deci în scenariile de 60 de zile nu-și atingea pragul și nu putea da niciun verdict, iar nicio regulă nu era oprită la primul prag, cum face
   tura. „0,3–3,7%” nu măsura familia. Refăcută (`scripts/sim-h0-v100377-doua-reguli.mjs`, a doua variantă, 600 de seturi pe scenariu): cu 99% la fiecare,
   verdict fals la măcar una din două în 2,3–6,8% din seturi cu zile independente și 7,7–10,2% cu zile legate între ele; cu 99,5%: 1,5–3,7% și 5,7–7,5%.
   Regula scrisă dinainte („peste ~5% ⇒ 99,5%”) se aplică: `COADA_PIERDERE = COADA_TIMP = 0,0025`.
2. **Ce rămâne nesigur:** dacă zilele vecine sunt legate (un bot ținut trei zile trăiește aceeași piață ca unul pornit a doua zi), familia e în jur de
   6–7,5% chiar și cu 99,5%. Legătura e o presupunere a simulării, nemăsurată pe boții lui.
3. **Puterea e și mai mică:** cu 99,5%, o îmbunătățire adevărată de 3% din sumă se vede la primul prag în aproximativ 9–11% din cazuri. „N-am aflat” e
   răspunsul cel mai probabil chiar dacă regula ajută.
4. **Înghețarea verdictului.** Tura nu face nimic când arhiva boților vine pe jumătate (înainte putea îngheța verdictul cu boți necitiți). Verdictul
   înghețat se ține și în KV: dacă starea colectorului se pierde, se ia de acolo, iar serverul nu înlocuiește un verdict deja înghețat cu altul.
5. **Botul închis chiar la clipa regulii** (la cel mult 5 minute de punctul ei) e aceeași faptă: diferența lui e zero. Pentru ceilalți, comisionul
   închiderii închipuite e socotit pe poziția MAXIMĂ (suma × levierul × 0,05%), nu pe cea din clipa aceea (drumul nu o poartă): trage diferența spre
   „lăsatul” cu cel mult 0,05% × levierul din sumă (0,15% la 3×).
6. **Ce NU poate spune, în plus:**
   - Lipsesc boții ținuți peste 7 zile și cei încă deschiși la clipa înghețării: tocmai cei lăsați cel mai mult, unde pierderea medie e cea mai mare.
     Fără ei, proba e împinsă spre „lăsatul a fost mai bun” / „n-am aflat”; un asemenea verdict e mai slab decât pare.
   - Odată cu proba pornește alerta „a trecut de 4 ore și e pe minus”, care îi cere o hotărâre exact în clipa judecată. Dacă îl face să închidă mai des
     acolo, boții aceia intră cu diferența zero și proba măsoară tot mai puțin „ce ar fi fost dacă”.
7. **Ce am văzut din date până acum:** pe 22.11, ~16:00, tura a fost rulată pe uscat pe arhiva vie (doar citire, nimic trimis). M-am uitat DOAR la
   numărătoare și la forma datelor: 5 boți închiși de la 20.11, câte 2 episoade pe fiecare regulă. Diferențele și mediile nu le-am afișat și nu le-am
   văzut. Hotărârile de mai sus vin din simulare și din citirea codului, nu din rezultatele boților.

## Amendamentul al doilea — 22.11.2026, 18:21

Scris după revizia independentă a reparațiilor (`RAPORT-C-reparatii.md`), înainte de orice drum citit pentru verdict.

1. **Botul închis la clipa regulii** (din primul amendament) se strânge: „aceeași faptă” înseamnă același timp și aceiași bani — botul închis la
   cel mult 5 minute de punctul regulii ȘI la cel mult un comision de închidere de totalul din acel punct. De ce: doar cu timpul, un bot atins de
   stop sau lichidat la câteva minute după prag ieșea cu diferența zero. Dispăreau tocmai căderile repezi, unde închiderea la prag ar fi contat,
   iar proba era trasă spre „n-am aflat”.
2. **Boții cu drumul necitit.** Un drum pe care serverul nu-l poate citi (valoare stricată în KV) nu mai ține proba deschisă la nesfârșit. După
   `MAX_CITIRI` = 24 de ture cu răspunsul „necitit”, botul iese din probă ca „necitit”, numărat pe pagina Probe. Cu mai mult de `MAX_NECITITI` = 3
   asemenea boți verdictul NU se îngheață. Cererile la care serverul nu răspunde deloc nu se numără aici: ele doar opresc tura.
3. **Arhiva „venită”** = listă nevidă, cu data ei, citită din KV și întreagă. Un răspuns cu lista goală nu mai trece drept arhivă; altfel
   verdictul se putea îngheța pe ultimii 10 boți, cu restul necitiți.
4. **Ce am văzut din date între timp:** tura a fost rulată încă o dată pe uscat (22.11, ~17:20), doar citire și doar numărătoarea: 5 boți judecați,
   câte 2 episoade pe fiecare regulă, niciun verdict. Diferențele și mediile nu le-am afișat și nu le-am văzut.

## Amendamentul al treilea — 22.11.2026, 19:21

Scris după a doua trecere a revizorului independent (`RAPORT-D-valul-doi.md`), înainte de orice drum citit pentru verdict.

1. **Boții „necitiți” se reîncearcă.** În amendamentul al doilea un bot trecut „necitit” nu mai era cerut niciodată; cu mai mult de `MAX_NECITITI` = 3
   verdictul rămânea ținut pe loc pentru totdeauna, și după ce KV-ul era reparat. Acum fiecare bot „necitit” se cere din nou o dată la 24 de ore
   (`REINCEARCA_NECITIT_MS`) și revine în probă, cu episodul lui, când drumul se citește. Pagina Probe spune câți sunt și că peste 3 țin verdictul.
2. Pragurile, regula episodului și intervalul nu se schimbă.
3. **Ce am văzut din date între timp:** tura rulată pe uscat a treia oară (22.11, ~18:56), doar numărătoarea: aceiași 5 boți judecați, câte 2 episoade
   pe fiecare regulă, 0 necitiți, niciun verdict.

## Notă — 22.11.2026, 20:46 (pagina Probe arată boții porniți)

La cererea lui („fa idei”), pagina Probe spune lângă regulă câți boți porniți sunt chiar acum în clipa regulii și câți bani înseamnă (un fapt, fără
sfat; aceleași praguri ca episodul). Regula, pragurile și intervalul nu se schimbă. Ca și alerta de 4 ore, rândul îi poate schimba purtarea: dacă
închide mai des acolo, boții aceia intră cu diferența zero și proba măsoară tot mai puțin „ce ar fi fost dacă”.
