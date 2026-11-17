# I-888 (partea nevăzută a lumânării) + regula bilanțului hotărârilor — regulile, scrise 17.11.2026 ~12:40 (RO)

Scrise ÎNAINTEA oricărei lumânări de 1 minut aduse pentru măsurătoare și înainte de orice hotărâre judecată pe regula VERS_HOT 3.
Ce se adaugă după rezultat stă într-o secțiune separată, „După rezultat”, cu ora. Nimic de mai jos nu se schimbă după ce văd cifre.

## A. I-888 — cât greșește motorul care merge prin lumânare pe 4 puncte

**Ipoteza (mecanismul).** `GridProba.simuleaza` trece prin fiecare lumânare pe drumul O→L→H→C (verde) sau O→H→L→C (roșie). Prețul adevărat
face, în aceeași lumânare, mai multe dus-întorsuri; fiecare dus-întors peste o celulă e o grilă încasată pe care motorul n-o vede. Deci motorul
dă un rezultat mai MIC decât prețul adevărat, cu atât mai mic cu cât lumânarea e mai mare față de pasul grilei. G2 (15.11) a estimat partea
asta din mers la întâmplare (~0,4 puncte la 3 zile); aici se măsoară pe lumânări de 1 minut.

**Unde contează pe pagină.** Lumânări de 15 minute: Simulatorul, Monte Carlo (drumurile sunt lumânări de 15 minute), „Ce fac cu botul ăsta?”.
Lumânări de 1 oră: proba fișei (verdictul PORNEȘTE cere media pe test peste zero și t ≥ 1,65).

**Datele.** Binance USDT-M perpetual, lumânări de 1 minut, fereastra [2026-10-18 00:00 UTC, 2026-11-17 00:00 UTC) = 30 de zile.
Universul: perpetuele Pionex din primele 100 după volum (lista de azi), cu pereche pe Binance (BAZĂUSDT, 1000BAZĂUSDT…); din ele 40 trase la
sorți cu mulberry32(20261117), în ordinea tragerii (toate, dacă sunt sub 40). O monedă cu sub 95% din minute e scoasă și numită.
Lumânările de 5 minute, 15 minute și 1 oră se ADUNĂ din cele de 1 minut (aceleași date) ⇒ diferența ține doar de instrument.

**Gridurile.** Pentru fiecare monedă și fereastră, 27 de griduri `GridCalcul.construieste({ pret: deschiderea ferestrei, lat, pas, dir })`:
lat ∈ {6%, 12%, 24%}, pas ∈ {0,3%, 0,6%, 1,2%}, dir ∈ {long, neutru, short}; levierul și stopul cum le dă `construieste` (cum le probează
fișa). Funding 0 (e același pe orice lumânare; scos ca să rămână doar instrumentul). Ferestrele: H ∈ {1, 3, 7} zile, fără suprapunere, de la
începutul celor 30 de zile (30, 10 și 4 ferestre).

**Mărimea.** Δ_X = net(lumânări X) − net(1 minut), pe același grid și aceeași fereastră, în puncte procentuale din sumă, X ∈ {5m, 15m, 1h}.
Media pe cele 27 de griduri ⇒ pe (monedă, fereastră); media pe monede ⇒ pe fereastră (zi de pornire); media și t pe ferestre (unitatea =
fereastra, nu moneda: monedele din aceeași perioadă nu sunt dovezi separate). Pe zi = ÷ H. Se raportează și pe pas (0,3 / 0,6 / 1,2%).

**Verdictul (H = 1 și H = 3, fiecare din 15m și 1h):**
- „contează” dacă |media Δ pe zi| ≥ 0,10 puncte ȘI |t| ≥ 3 (un efect mecanic trebuie să se vadă limpede);
- „cifrele stau” dacă intervalul de 95% al mediei pe zi e întreg sub 0,10 puncte în valoare absolută;
- altfel „neclar” ⇒ încă 30 de zile de date (o singură dată), apoi aceeași regulă.
- 1 minut ca adevăr: dacă |Δ_5m| > 0,5·|Δ_15m| (la H = 3), 1 minutul nu s-a așezat și cifrele sunt limita de jos a părții nevăzute (se spune).

**Dacă „contează” (la 15m sau la 1h): reparația C1, una singură, fixată acum.** O corecție în motor pentru dus-întorsurile nevăzute: în
fiecare lumânare, după drumul pe 4 puncte, se adaugă câștigul a k̂ dus-întorsuri pe celulele din [L, H] ale lumânării, fără să schimbe
poziția (un dus-întors lasă poziția cum era): k̂ = a · (R / pas)^b, R = (H − L) / L-ul lumânării, câștigul unui dus-întors = cel al grilei
(pas − 2 comisioane maker, pe mărimea celulei). Parametrii (a, b) separat pentru 15m și 1h (4 numere), potriviți prin cele mai mici pătrate pe
Δ-ul rulărilor pe monedele de CALIBRARE (pozițiile pare din ordinea tragerii) și judecați pe cele de PROBĂ (pozițiile impare), nevăzute de
potrivire. C1 intră în motor doar dacă, pe monedele de probă, la H = 1 și H = 3, pentru 15m și 1h: |media Δ rămasă pe zi| ≤ 0,05 puncte,
partea nevăzută scade cu cel puțin 50%, și pe nicio clasă de pas Δ rămas nu trece de 0,10 puncte în cealaltă parte.
- Dacă C1 intră: VERS_HOT 4 (bilanțul o ia de la zero — o regulă nouă repornește numărătoarea), iar H0 al fișei (`scripts/sim-h0-v100269.mjs`)
  se reface: PORNEȘTE sub mers aleator ≤ 5% la fiecare H; dacă nu ține, C1 nu intră.
- Dacă C1 nu trece: motorul rămâne; pe pagină se scrie, cinstit, partea nevăzută măsurată (Simulator și fișă), iar reperul fără direcție
  (varianta a doua din backlog) rămâne propunere separată.

**Încercări.** O măsurătoare (A) + o reparație (C1, 4 parametri, pe monede nevăzute). Nimic altceva nu se încearcă pe aceleași date.

## B. Regula bilanțului „Ce fac cu botul ăsta?” — verdictul și urmarea

**Ce se judecă (ca acum, `raportHotarari`).** Hotărârile regulii de acum (nota.v = VERS_HOT) în care tabelul a zis altceva decât „îl țin”,
judecate pe barele reale după 7 zile: d = rezultatul acțiunii − rezultatul ținerii (USDT), pe ferestre fără suprapunere pe bot și pe fel.
Unitatea = ziua calendaristică (media d pe zi: hotărârile din aceeași zi au aceeași piață).

**Când se judecă.** De DOUĂ ori, nu mai des: la primele 30 de zile cu hotărâri „altceva” judecate și la primele 60. Fiecare privire folosește
exact primele 30 / 60 de zile în ordinea timpului (verdictul nu se mișcă după aceea).

**Pragul** (⚠ revizuit mai jos, înainte de date: Johnson, 2,5)**.** t = media / (abaterea / √n) pe zile; verdict dacă |t| ≥ 2,36 (două priviri ⇒ ~5% verdict fals în total, nu ~8% cu 1,96 de două
ori — mărimea probată prin simulare sub H0, cu cozi groase, ÎNAINTE să intre în cod).
- t ≤ −2,36 ⇒ „sfaturile «altceva» au pierdut față de ținere” ⇒ URMAREA: tabelul nu mai recomandă singur altceva decât „îl ține” (rândurile
  și cifrele rămân; rândul de sus spune „aș face X, dar bilanțul…: îl țin”), iar Discordul nu mai anunță acțiuni „altceva” ale tabelului.
  Planul tău (minus / plus pus de tine) rămâne: e regula ta, nu sfatul tabelului.
- t ≥ +2,36 ⇒ „sfaturile «altceva» au bătut ținerea” ⇒ nimic nu se schimbă; se spune.
- altfel ⇒ „n-am aflat” (la 30: aștept 60; la 60: rămâne „n-am aflat”, fără urmare).

**Repornirea.** O regulă nouă (VERS_HOT nou) repornește numărătoarea și privirile.
**„Îl țin”.** Se raportează (ținerea față de închidere), fără verdict și fără urmare.
**Cât durează.** Cu 1–3 boți și tabelul zicând de obicei „îl țin”, 30 de zile cu „altceva” judecate pot însemna luni. Se spune pe pagină.

**Revizia regulii B — 17.11.2026 ~13:05, tot ÎNAINTEA oricărei hotărâri judecate (VERS_HOT 3 are zero judecăți).** Simularea de mărime
promisă mai sus (`h0-bilant.mjs`: 40.000 de serii pe formă, privirile la 30 și 60, media adevărată 0) a arătat că t-ul simplu cu 2,36 dă
„au bătut ținerea” FALS în 10,2% (asimetric: câștigă des puțin, pierde rar mult) și 12,3% (lognormal întors) — peste 5%. Regula devine:
**t-ul lui Johnson (1978, ca la G2: îndreaptă asimetria) și |t_J| ≥ 2,5.** Sub H0: total 2,9% (normal), 4,6% (t3), 4,7% (asimetric),
4,8% (lognormal întors), 5,7% (t2, cozi foarte groase); partea care schimbă ceva, „au pierdut”, ≤ 2,8%. Puterea, când sfaturile pierd o
jumătate de abatere pe zi: 89–100%. Restul regulii B rămâne cum e scris.

## C. I-889 — fără reguli statistice (curățenie): regula de formă a acțiunilor tokenizate și pe pagină, nu doar în colector.

## După rezultat — A (17.11.2026 ~14:05, RO)

Rulat exact cum e scris: 40 din 40 de monede (niciuna sub 95% din minute), amprenta datelor `00e0d45f10351f45`, 91 s de socotit, 0 lichidări pe
1 minut. Δ = lumânarea mare − 1 minut, în puncte procentuale din sumă PE ZI (media pe ferestre; în paranteză intervalul de 95% și t):

| | 5 minute | 15 minute | 1 oră |
|---|---|---|---|
| H = 1 (30 de ferestre) | −0,190 (−0,220…−0,161; t −13,1) | **−0,462** (−0,529…−0,394; t −14,0) ⇒ **contează** | **−0,982** (−1,096…−0,867; t −17,6) ⇒ **contează** |
| H = 3 (10) | −0,093 (t −11,4) | **−0,226** (−0,268…−0,183; t −12,0) ⇒ **contează** | **−0,485** (−0,542…−0,429; t −19,4) ⇒ **contează** |
| H = 7 (4, doar raportat) | −0,046 | −0,111 | −0,261 |

Pe pas (H = 1, 15 minute): 0,3% −0,788 · 0,6% −0,427 · 1,2% −0,170; (1 oră): −1,456 · −1,017 · −0,471. 1 minutul ca adevăr: |Δ5m| ÷ |Δ15m|
la H = 3 = 0,41 ≤ 0,5 ⇒ s-a așezat (după regulă). Semnul și forma sunt cele din ipoteză: motorul vede MAI PUȚIN, cu atât mai puțin cu cât lumânarea
e mai mare față de pas. Pe fereastră Δ nu crește proporțional cu H (H = 1: −0,46; H = 3: −0,68; H = 7: −0,78 la 15 minute) - botul iese pe
stop / din grid și partea nevăzută se oprește odată cu el.

**Ce înseamnă.** Cifrele Simulatorului / Monte Carlo / „Ce fac cu botul ăsta?” (15 minute) sunt sub adevăr cu ~0,2–0,5% din sumă pe zi la
gridurile de aici, iar proba fișei (1 oră) cu ~0,5–1%. Fișa cere „media pe test peste zero”: ștacheta ei a fost, de fapt, „bate costurile plus
~0,5–1% pe zi”. După regulă urmează C1 (o singură reparație, calibrare pe pozițiile pare, probă pe impare).

**Detaliul potrivirii C1 (fixat acum, înainte de potrivire).** Câștigul corecției e liniar în a: pentru fiecare b dintr-o grilă (0,5; 0,6; … 3,0)
S_b = [net(a = ε, b) − net(a = 0)] ÷ ε cu ε = 0,05 pe fiecare rulare de calibrare; a*(b) = −Σ Δ·S_b ÷ Σ S_b² (cele mai mici pătrate prin origine);
b = cel cu suma pătratelor cea mai mică. Apoi pe monedele de PROBĂ rulările se refac cu motorul corectat (nu aproximarea liniară) și se judecă după
regula scrisă. f = partea din lumânare care cade în grid (o lumânare în afara gridului nu poate face dus-întorsuri).
## După rezultat — C1 (17.11.2026 ~14:25, RO): PICĂ ⇒ motorul rămâne

Potrivit pe cele 20 de monede de calibrare (23.760 de rulări pe instrument): 15 minute a = 0,01393, b = 2,6; 1 oră a = 0,02364, b = 2,5.
Judecat pe cele 20 de PROBĂ cu motorul corectat:

| pe probă, Δ pe zi | fără C1 | cu C1 (95%) | pe pas 0,3 / 0,6 / 1,2% | regula |
|---|---|---|---|---|
| H = 1 · 15 min | −0,474 | +0,057 (+0,013…+0,101) | −0,079 / +0,069 / **+0,181** | PICĂ (rămas > 0,05; pasul 1,2% peste 0,10 în cealaltă parte) |
| H = 1 · 1 oră | −1,010 | −0,081 (−0,142…−0,019) | **−0,297** / −0,150 / **+0,204** | PICĂ (rămas > 0,05; 1,2% peste 0,10) |
| H = 3 · 15 min | −0,233 | +0,041 (−0,007…+0,089) | −0,025 / +0,053 / +0,094 | trece |
| H = 3 · 1 oră | −0,502 | −0,007 (−0,057…+0,043) | −0,123 / −0,036 / **+0,137** | PICĂ (1,2% peste 0,10) |

**Ce s-a văzut.** Media scade cu 80–99%, dar forma e greșită: un singur exponent pe R ÷ pas nu poate prinde și cât de mult contează lumânarea,
și cât de mult contează pasul - corectează prea puțin la pasul mic și prea mult la pasul mare (pe gridurile rare ar fi arătat câștig care nu
există). După regulă: **C1 nu intră; motorul rămâne; partea nevăzută se scrie pe pagină**. Cârligul `opt.nevazut` rămâne în motor, nefolosit de
pagină (îl folosește doar acest script). O formă cu doi exponenți (R și pas separat) NU se încearcă pe aceleași date - ar fi căutare, nu probă:
merge în backlog, de potrivit pe datele de aici și de judecat pe o fereastră NOUĂ.

**Ce se scrie pe pagină (o singură sursă, `GridProba.NEVAZUT`):** pe lumânări de 15 minute (Simulator, Monte Carlo, „Ce fac cu botul ăsta?”)
motorul vede cu ~0,2–0,5% din sumă pe zi mai puțin decât pe lumânări de 1 minut (mai mult la pasul mic: ~0,8% pe zi la 0,3%); proba fișei, pe
lumânări de 1 oră, cu ~0,5–1% pe zi. Urmări: (1) cifrele gridului sunt prudente; (2) în „Ce fac cu botul ăsta?” „îl țin” și setările care țin
botul pornit sunt socotite prea jos față de „îl închid acum” (care nu are lumânări) ⇒ tabelul înclină spre închidere - se spune lângă tabel;
(3) fișa: „media pe test peste zero” e o ștachetă mai înaltă decât pare.
## Revizia a doua a regulii B — 17.11.2026 ~16:00 (RO), după revizia independentă, tot ÎNAINTEA oricărei hotărâri judecate

1. **Testul: t-ul lui Hall (1992) cu |t_H| ≥ 2,6**, în locul lui Johnson cu 2,5. Revizia a arătat, iar simularea a confirmat, că pe forma
   „pierde des puțin, câștigă rar mult” (cea mai probabilă pentru „îl închid”: pierde venitul grilelor, ocolește rar o prăbușire) Johnson își
   pierde puterea - 4% la o pierdere reală de 0,5 abateri pe zi -, pentru că îndreptarea lui nu e monotonă. Hall e transformarea monotonă a
   aceleiași îndreptări. Sub H0 (40.000 de serii pe formă, 7 forme): verdict fals total 2,3% (normal), 3,9% (t3), 4,6% (asimetric), 4,5%
   (oglindit), 4,6% (lognormal), 4,8% (lognormal întors), 5,0% (t2); „au pierdut” fals ≤ 4,2% (nu ≤ 2,8%, cum scria prima revizie: forma
   oglindită lipsea). Puterea la o pierdere de 0,5 abateri pe zi: 88–100% pe formele simetrice și cu coadă în jos, 58% pe lognormal, **11% pe
   forma oglindită** - pe ea 30–60 de zile aproape nu pot dovedi o pierdere (o coadă rară în sus nu se poate exclude din puține zile); verdictul
   cel mai probabil e „n-am aflat”, și se spune pe pagină.
2. **Registrul.** Jurnalul hotărârilor se taie la 300 de intrări, deci „primele 30 de zile” ar fi alunecat. Zilele „altceva” judecate se țin
   într-un registru al colectorului (`data/hot-bilant.json` + `.bak`), adăugate o singură dată, în ordinea timpului, doar zilele ÎNCHISE (nicio
   notă mai veche nu mai așteaptă judecata). Verdictul final se scrie o dată și rămâne. VERS_HOT nou ⇒ registrul o ia de la zero.
3. **Planul tău.** Închiderile cerute de plan sunt judecate (cu fereastra lor de 7 zile), dar nu intră în verdict: sunt regula ta, nu sfatul
   tabelului. Se spun separat în bilanț.