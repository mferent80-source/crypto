# v100.356 — calibrarea tabelului „Ce fac”, a doua încercare de îndreptare a lumânării (C2) și fișa față de reperul fără direcție

17.11.2026, Radar v100.356. Cerut: „ce crezi că mai merită făcut?” ⇒ I-892 … I-895 în listă ⇒ el: „fă tot”. Fiecare regulă de mai jos e scrisă
ÎNAINTE de datele pe care se judecă; ce se schimbă după ce am văzut ceva e scris ca revizie, cu ora și motivul.

## I-893 — calibrarea tabelului „Ce fac cu botul ăsta?” (scris ~17:30, înainte de orice notă judecată: primele judecăți la 7 zile vin pe 23.11)

**Întrebarea.** Cifra pe care tabelul o dă pentru «îl țin» pe 7 zile (media pe 800 de drumuri, de acum încolo, închis la capăt) se potrivește,
fără abatere, cu ce face «îl țin» pe barele reale în cele 7 zile de după?

**Ce NU măsoară (corectură față de mini-spec-ul din listă).** În listă am scris că I-893 ar fi „proba pe viu a lui I-888”. Nu este: și cifra
prezisă, și cea judecată pe barele reale trec prin același motor pe lumânări de 15 minute, deci partea nevăzută a lumânării se scade din
amândouă. I-893 măsoară drumurile: dacă luna trecută, trasă în blocuri, prezice fără abatere săptămâna care vine.

**Unitatea.** O notă judecată (`y7.val.tine` există), pe regula de acum (`nota.v === VERS_HOT`), cu cifra prezisă a lui «îl țin» în notă
(`actiuni[tine].media`), pe orice sfat (și «îl țin», și «altceva», și închiderile planului: cifra lui «îl țin» e prezisă la fel în toate).
Pe fiecare bot, cel mult o notă la 7 zile (prima; ferestrele nu se suprapun). Eroarea, în procente din suma botului (`nota.st.suma`):
e = 100 × (val.tine − media prezisă) / suma.

**Seria.** Pe fiecare zi (ziua notei), media erorilor din ziua aceea. Doar zile ÎNCHISE (nicio notă mai veche nu mai așteaptă judecata),
adăugate o singură dată, în ordinea timpului, în registrul colectorului (`data/hot-bilant.json`, câmpul `cal`) — ca la regula B.

**Verdictul.** Aceeași regulă ca bilanțul (probată sub H0 pe 7 forme, rulată din nou azi: fals 2,3–5,0%): t-ul lui Hall pe primele 30 de zile,
apoi pe primele 60; |t| ≥ 2,6 ⇒ verdict, scris o dată și înghețat. t ≥ 2,6 ⇒ „tabelul socotește «îl țin» prea jos” (pe barele reale a ieșit
mai bine decât a prezis ⇒ tabelul înclină spre închidere); t ≤ −2,6 ⇒ „prea sus”. Altfel la 30 „n-am aflat, mai judec la 60”, la 60
„n-am găsit o abatere” — care NU înseamnă „cifrele sunt bune” (puterea, de mai jos, e mică pe unele forme).

**Puterea (aceeași rulare).** La o abatere de jumătate de sigma: 88–100% pe formele simetrice și pe asimetria „pierde rar mult”, 58% pe
lognormal, 11% pe „pierde des puțin, câștigă rar mult”. Cu un singur bot, 30 de zile cu note = ~30 de săptămâni.

**Urmarea.** Niciuna automată: verdictul se spune (pagina, sub bilanț; Discord o dată, ca la I-894). O schimbare a motorului după el ar fi
o regulă nouă, cu probă nouă.

**Alături, fără verdict.** Media erorii și intervalul ei pe zile (același calcul ca la bilanț), ca text.

## I-895 — partea nevăzută re-măsurată lunar (fără regulă de verdict: e o măsurătoare descriptivă)

Aceeași măsurătoare A din I-888 (aceeași regulă de tragere: mulberry32(20261117) pe primele 100 de perpetue Pionex cu pereche Binance, 40 de
monede, 27 de griduri, H = 1 / 3 / 7), pe ultimele 30 de zile UTC încheiate, o dată la 30 de zile, noaptea pe VPS. Cifrele paginii se scot exact
ca pe 17.11: zi1 / zi3 / zi7 = −Δ pe zi la H = 1 / 3 / 7, pasMic = −Δ pe zi la H = 1 și pasul de 0,3%, pe 15 minute și pe o oră. Probat cap-coadă
azi: pe fereastra lui I-888 scoate exact cifrele de pe pagină (amprenta datelor 00e0d45f10351f45). Sub 30 de monede cu minutele întregi ⇒ nimic
scris. Pagina ia doar o măsurătoare întreagă și plauzibilă (0 ≤ cifră < 10).

## I-890 — a doua încercare de îndreptare (C2), pe o fereastră NOUĂ (scris ~17:40 - ora corectată la revizie, era trecută greșit „~17:45”; pus în depozit la 17:40, aducerea a pornit după - înainte de a aduce vreo lumânare din fereastra ei)

**De ce o a doua încercare, și de ce pe date noi.** C1 (k̂ = a·(R/pas)^b) a picat pe probă cu un tipar: la pasul de 0,3% îndreaptă prea puțin
(rămâne pe minus), la 1,2% prea mult (trece pe plus) - lărgimea lumânării și pasul cer exponenți diferiți. Forma C2 e aleasă DUPĂ ce am văzut
tiparul lui C1 pe fereastra 18.10–17.11, deci nu se potrivește și nu se judecă pe fereastra aceea. Este a doua încercare pe aceeași întrebare
(numărătoarea: C1, C2); dacă pică și C2, nu urmează o a treia pe aceleași date.

**Forma.** k̂ = a · R^b · pas^(−c) dus-întorsuri nevăzute pe lumânare (R = H/L − 1, pasul grilei la prețul lumânării), înmulțit cu partea
lumânării care cade în grid - același cârlig din motor (opt.nevazut), cu un al treilea parametru c (fără c ⇒ C1, neschimbat).

**Datele.** Fereastra 18.09.2026 00:00 – 18.10.2026 00:00 UTC (30 de zile, nevăzută până acum), lumânări de 1 minut Binance USDT-M. Monedele:
aceeași regulă de univers (primele 100 de perpetue Pionex cu pereche Binance, lista de azi), 40 trase cu mulberry32(**20261118**) - altă tragere
decât la I-888. 27 de griduri (aceleași), H = 1 / 3 / 7, același motor.

**Potrivirea.** Pe pozițiile pare ale tragerii (calibrare): grila b ∈ {0,5; 1; 1,5; 2; 2,5; 3} × c ∈ {0,5; 1; 1,5; 2; 2,5; 3}; pentru fiecare pereche,
a din cele mai mici pătrate (câștigul e liniar în a), apoi perechea cu eroarea cea mai mică. Separat pentru 15 minute și pentru o oră.

**Judecata (pe pozițiile impare, neatinse la potrivire), aceleași trei condiții ca la C1, pe H = 1 și H = 3, pe 15 minute și pe o oră:**
|Δ rămas pe zi| ≤ 0,05; Δ scade cu cel puțin 50%; nicio clasă de pas nu trece de 0,10 în partea cealaltă. C2 TRECE doar dacă toate patru
celulele trec.

**Urmarea, scrisă acum.** Trece ⇒ C2 intră în motor pe 15 minute (Simulator, Monte Carlo, „Ce fac”) și pe o oră (fișa), VERS_HOT 4 (bilanțul și
calibrarea pornesc de la zero), textul părții nevăzute se schimbă în „îndreptată”, iar H0-ul fișei se reface înainte de livrare. Pică ⇒ motorul
rămâne, pagina spune în continuare diferența; I-890 se închide.

## I-891 — fișa Grid judecată față de reperul fără direcție (scris ~17:43 - ora corectată la revizie, era trecută greșit „~18:00”; pus în depozit la 17:43, codul și poarta după - înainte de cod și de orice rulare)

**Mecanismul.** Pe un preț fără nicio direcție, un grid adevărat pierde în medie doar costurile (comisioanele și funding-ul). Motorul, care
merge pe 4 puncte pe lumânare, arată acolo un minus mai mare: costurile plus partea nevăzută (I-888). Fișa cere „media pe zilele de test peste
zero” pe lumânări de o oră, deci ștacheta ei reală e „bate costurile plus ~0,5–1% pe zi”: respinge și griduri care, în realitate, ar ieși pe plus.

**Corectură față de mini-spec-ul din listă.** „Față de reper în loc de zero” ar scădea și costurile (reperul le plătește și el), deci ar trece
și griduri care pierd din comisioane. Reperul care scoate DOAR partea nevăzută este reperul **fără comisioanele de tranzacționare** (funding-ul
rămâne cost real): pe un preț fără direcție, un grid adevărat iese la zero înainte de comisioane, iar motorul arată −partea nevăzută.

**Regula.** Pentru setarea afișată, pe fiecare fereastră de test (aceleași ferestre ca azi): d = rezultatul net al ferestrei − rezultatul ÎNAINTE
de comisioane al aceleiași setări pe aceleași lumânări, fiecare întoarsă pe dos cu probabilitatea 1/2 (în logaritm, cu tot cu fitile; ca reperul
lui G2) și lipite cap la cap de la prețul de pornire; două trageri (mulberry32 cu sămânță fixă pe fereastră), media lor. „Media pe zilele de test
peste zero” devine „media lui d peste zero”, iar cerința t ≥ 1,65 pe ferestrele care nu se suprapun (proba pe o oră) se socotește pe d. Restul
verdictului rămâne neschimbat (mediana pe istoric și pe test, lichidările, ferestrele minime, mișcarea mare, poziția, zilele).

**Poarta, înainte de a schimba verdictul.** Simularea de mărime a fișei (scripts/sim-h0-v100269.mjs: mers aleator pe pași de 1 minut, deci cu
partea nevăzută în lumânări; 120 de monede, volatilitate constantă și grupată): PORNEȘTE cu regula nouă ≤ 5% la fiecare H (1, 2, 3, pe barele
fișei de azi) și cel mult +2 puncte față de regula de azi, rulată pe aceleași monede. Altfel regula nu intră și fișa rămâne cum e.

**Ce nu se măsoară.** Puterea (cât de des zice PORNEȘTE pe un grid care chiar câștigă) - n-am date cu un avantaj știut; se spune pe pagină
doar ce s-a probat.

### După rezultat — poarta I-891 (~17:50)

sim-h0-v100269, 120 de monede pe fiecare, regula de azi (Radar v100.355) față de cea nouă, pe aceleași monede — PORNEȘTE pe date fără avantaj:

| | volatilitate constantă: azi ⇒ nou | agitație grupată: azi ⇒ nou |
|---|---|---|
| H = 1, barele fișei (1 oră) | 1,7% ⇒ 3,3% | 0,0% ⇒ 0,0% |
| H = 2, barele fișei (1 oră) | 1,7% ⇒ 0,8% | 0,0% ⇒ 0,0% |
| H = 3, barele fișei (1 oră) | 0,8% ⇒ 0,8% | 0,0% ⇒ 0,0% |
| H = 1, ruta de rezervă (15 minute, fără barele de o oră) | 21,7% ⇒ 24,2% | 20,0% ⇒ 20,0% |

Pe barele fișei (o oră) poarta TRECE: toate ≤ 5%, cel mult +1,6 puncte. Pe ruta de rezervă de 15 minute (care NU era în poartă: „pe barele
fișei de azi”) regula ar fi urcat cu 2,5 puncte un PORNEȘTE fals deja mare ⇒ reperul intră DOAR pe barele de o oră; pe 15 minute fișa rămâne
cum era (rerulat: 21,7%, ca azi). Restrângerea e spre prudență, nu lărgește nimic din ce s-a probat. Ruta de 15 minute la H = 1 rămâne o
problemă veche, separată (I-891 nu o atinge).

### Revizia independentă (Opus, ~18:00) și poarta refăcută — I-891 PICĂ

Revizia a găsit că, atunci când fișa PROPUNE gridul des, verdictul se refăcea pe statistica lui fără reper - deci prima poartă a rulat pe o
implementare incompletă a regulii (regula spune „pentru setarea afișată”). Cu gridul des inclus, poarta rerulată (aceleași 120 de monede):

| PORNEȘTE pe date fără avantaj, barele fișei (1 oră) | constantă: azi ⇒ nou | grupată: azi ⇒ nou |
|---|---|---|
| H = 1 | 1,7% ⇒ 4,2% (+2,5) | 0,0% ⇒ 1,7% |
| H = 2 | 1,7% ⇒ 4,2% (+2,5) | 0,0% ⇒ 0,8% |
| H = 3 | 0,8% ⇒ 2,5% | 0,0% ⇒ 4,2% (+4,2) |

Toate sub 5%, dar de trei ori peste „cel mult +2 puncte” ⇒ după regula scrisă dinainte, **I-891 PICĂ: fișa rămâne cum era**. Nu caut o variantă
care să treacă (de pildă „fără gridul des”) - ar fi potrivirea regulii după rezultat. Funcțiile reperului (reperTest, intoarceLumanari) rămân
în motor doar ca unealtă de cercetare; fișa nu le cheamă.

## După rezultat — C2 (I-890, ~18:02)

Fereastra 18.09–18.10.2026, sămânța 20261118, amprenta datelor f173b02c73966a75; 20 de monede la potrivire (pare), 20 la probă (impare).
Potrivirea: 15 minute a = 0,000866, b = 2,5, c = 3; o oră a = 0,000257, b = 2, c = 3 (c a ieșit la marginea grilei scrise; nu se lărgește după).

| pe PROBĂ, Δ pe zi | fără C2 ⇒ cu C2 | pe pas 0,3 / 0,6 / 1,2% | |
|---|---|---|---|
| H = 1 · 15 minute | −0,573 ⇒ −0,072 | −0,149 / −0,089 / +0,023 | PICĂ (rămas > 0,05) |
| H = 1 · o oră | −1,222 ⇒ −0,231 | −0,129 / −0,403 / −0,162 | PICĂ (rămas > 0,05) |
| H = 3 · 15 minute | −0,258 ⇒ −0,020 | −0,065 / −0,019 / +0,023 | trece |
| H = 3 · o oră | −0,556 ⇒ −0,054 | −0,013 / −0,128 / −0,020 | PICĂ (rămas > 0,05) |

**C2 PICĂ ⇒ motorul rămâne, VERS_HOT rămâne 3, I-890 se închide** (a doua încercare din două; nu urmează o a treia pe aceleași date).
Ce se vede totuși, pe date NOI (altă lună, alte monede): partea nevăzută iese din nou, de aceeași mărime și cu același semn (15 minute,
H = 1: −0,57 pe zi față de −0,47 la I-888; o oră: −1,22 față de −0,98) - măsurătoarea I-888 se repetă pe o fereastră nevăzută.
