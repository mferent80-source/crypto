# Proba prospectivă „✋ 3 pierderi la rând = gata ziua” (pre-înregistrare, 18.11.2026)

Scrisă pe 18.11.2026, ÎNAINTE de codul care judecă (`scripts/lib/tura-trei-la-rand.mjs`) și înainte să existe vreo zi din datele
pe care se judecă. Secțiunile 1–8 s-au scris primele; secțiunea 9 (puterea și orizontul) s-a completat după simularea puterii pe
istoria de dinainte de 19.11 (date deja văzute azi, folosite DOAR ca să aleg N, nu ca dovadă). Nimic de aici nu se schimbă după cifrele noi.

## 1. De unde vine

Regula lui: după 3 boți închiși pe minus la rând (pragul `rand` al frânei, `/api/istoric-bot?action=config` → `frana.rand`,
implicit 3) ziua s-a terminat — nu mai pornesc nimic. Auditul din 18.11 pe toată istoria (2.456 de boți închiși, 263 de zile cu porniri,
21.12.2025–17.11.2026) a găsit că e singurul semn de pe pagina Comportament: boții porniți în aceeași zi DUPĂ ce s-au strâns 3 pierderi
la rând (în ordinea închiderii) au ieșit cu −0,53 USDT pe bot față de boții aceleiași zile porniți înainte. Față de zero asta nu spune
nimic; față de ce dă mecanica (vezi 3) e p 0,010 — dar e 1 din cel puțin 6 teste ale paginii, deci după corecție ≈ 0,06. De aceea:
o singură ipoteză, scrisă acum, judecată pe zile care nu există încă.

## 2. Ipoteza și mecanismul

**H1 (unilaterală):** în zilele în care regula se declanșează, boții porniți DUPĂ declanșare ies mai prost (net pe bot, USDT) decât
ar ieși dacă netul n-ar avea nicio legătură cu momentul pornirii față de seria de pierderi.

Mecanismul propus: după o serie de pierderi deciziile devin reactive („recuperare”, „mai încerc unul”): boți porniți în grabă, pe
monede alese din reflex, fără planul de dimineață. Dacă e așa, continuarea zilei costă, iar regula „gata ziua” are un motiv.

## 3. Alternativa (de ce H0 nu e „diferența = 0”)

Efect mecanic al selecției: grupa „înainte” conține chiar boții care au făcut seria de pierderi (cei porniți în aceeași zi și închiși
pe minus înainte de declanșare), deci „înainte” e trasă în jos prin construcție, iar „după” iese MECANIC mai bună. Pe istorie, sub H0
(netul amestecat între boții aceleiași zile de pornire, regula refăcută), diferența „după − înainte” are media +3,8 USDT pe bot
(5%–95%: +0,8 … +6,9). Testul se face deci față de distribuția H0 prin amestecare în zi, NU față de zero. Efectul văzut în istorie,
față de mecanică: −0,53 − 3,8 ≈ −4,3 USDT pe bot.

## 4. Datele

- Doar boții PORNIȚI de la **19.11.2026 00:00 Europe/Bucharest** (18.11.2026 22:00 UTC). Tot ce a pornit înainte a fost văzut azi.
- Sursa: arhiva boților închiși a colectorului (`/api/istoric-bot?action=botiInchisi` + prima pagină Pionex, `botiInchisiToti`), cu
  netul ca peste tot în Radar (`JurnalTrade.din`: realizat + comisioane + funding). Fără arhiva întreagă (`complet` fals) tura nu judecă.
- Ziua = ziua calendaristică la București.
- **Ziua de pornire j se judecă** (o singură dată, apoi se îngheață) când s-a terminat și: (a) niciun bot pornit în ziua j nu mai e
  deschis (lista boților activi a venit întreagă), sau (b) au trecut 7 zile de la sfârșitul zilei j. Membrii zilei j = boții porniți în
  ziua j și închiși la momentul judecății; lista lor de id-uri se îngheață (un bot închis mai târziu nu mai intră în grupe; netul lui
  intră doar în seria zilei în care s-a închis, nemișcat la amestecare).
- Tura colectorului rulează o dată pe zi, după 00:30 UTC (ziua de la București s-a terminat de 1,5–2,5 ore; arhiva boților se
  reîmprospătează la 10 minute). Starea (pragul, zilele judecate cu membrii lor, verdictul) stă pe disc în `data/trei-la-rand-stare.json`.
- Se folosește doar PREFIXUL continuu de zile judecate de la start (o zi judecată târziu nu mută setul celor N).
- Seria de pierderi a zilei k: toți boții închiși în ziua k (de oriunde ar fi porniți, inclusiv cei porniți înainte de 19.11 — ei sunt
  parte din regula pe care o trăiește el; netul lor nu se amestecă), în ordinea închiderii (la egalitate, după id). Net < 0 crește
  seria, net ≥ 0 o pune la 0. Declanșarea T(k) = ora închiderii botului la care seria atinge pragul.
- **Pragul** = `frana.rand` din configurare, citit la prima tură și ÎNGHEȚAT în stare (dacă îl schimbă după, proba rămâne pe cel de la start).

## 5. Unitatea și statistica

Unitatea = ziua cu declanșare (boții aceleiași zile nu sunt independenți: aceeași piață, aceeași stare). În ziua k cu declanșare:
D = membrii zilei k porniți după T(k), Î = membrii zilei k porniți până la T(k) inclusiv. Ziua **contează** doar dacă ambele grupe
au cel puțin un bot (altfel nu există comparație în aceeași zi). Pe fiecare zi care contează:
`d_k = media netului în D − media netului în Î` (USDT pe bot), cu ponderea `w_k = nD·nÎ / (nD + nÎ)`.

**Statistica S = Σ w_k·d_k / Σ w_k.** De ce așa: e exact mărimea măsurată în audit (−0,53), deci testul prospectiv întreabă același
lucru, nu unul ales după; ponderea e inversul varianței unei diferențe de medii la varianță egală, deci o zi cu 1 bot în fiecare grupă
nu cântărește cât una cu 10 și 5. Comparația e ÎN aceeași zi, deci starea pieței zilei se anulează.

## 6. Testul

- H0 prin amestecare: pentru fiecare zi de pornire judecată din prefix, netul se amestecă între membrii ei (aceleași ore de pornire și
  de închidere, neturile permutate), apoi regula se reface (seria fiecărei zile de închidere, T, grupele, S*). Sămânța mulberry32 fixă
  **20261119**, **B = 2.000** de amestecări.
- **p = (1 + #{S* ≤ S}) / (B + 1)** (unilateral: „după” mai prost decât dă mecanica).
- Pe lângă p se raportează: S, media S* (ce dă mecanica singură) și S − media S* (efectul peste mecanică).
- Mărimea testului s-a verificat prin simulare (proba `scripts/proba-v100360-trei.mjs`): pe date fără efect, „ține” iese fals în cel
  mult ~5% din lumi.

## 7. Pragul

α = 5% unilateral, fără corecție: e o singură ipoteză, pre-înregistrată, pe date noi.

## 8. Privirile, verdictul și ce NU se schimbă

- Până la orizont: doar „în curs” — câte zile judecate, câte cu declanșare, câte contează din N, S și ce dă mecanica. FĂRĂ verdict, iar p
  se ține în stare doar ca valoare curentă și NU se arată pe pagină înainte de orizont.
- La orizont (secțiunea 9) verdictul se calculează O dată și se îngheață:
  - `"tine"` dacă p ≤ 0,05: continuarea după 3 pierderi la rând e mai proastă decât explică mecanica — regula are motiv.
  - `"nu-tine"` altfel. ATENȚIE: „nu-tine” = **nu s-a dovedit** pe datele noi, NU „s-a dovedit că regula e greșită”. Regula rămâne
    o regulă de disciplină a lui; proba spune doar dacă datele o susțin statistic.
- Ce NU se schimbă după cifre: data de start, sursa, ziua la București, regula de judecare a zilei, seria (ordinea închiderii, net < 0),
  pragul înghețat, grupele, statistica și ponderile, H0, sămânța, B, α, N și data-limită. Nicio variantă nu se adaugă după cifre
  (alt prag, alt orizont, „doar boții mari”, „doar săptămâna X”). Dacă găsesc o greșeală de cod, o repar și o scriu aici cu data, iar
  verdictul se reface pe aceleași reguli.
- Dacă el ascultă regula mai des de acum, vor fi mai puține zile care contează (nu are cine să fie în „după”): asta lungește proba, nu
  schimbă regulile. E și un rezultat bun în sine.

## 9. Puterea și orizontul

**Ales: N = 45 de zile care contează; data-limită 18.11.2027** (dacă până atunci nu s-au strâns 45, verdictul se face o dată pe
zilele judecate până la 18.11.2027 inclusiv, cu aceleași reguli). Verdictul la ce vine întâi.

Cum s-a simulat (18.11.2026, pe istoria de dinainte de 19.11 — date văzute, folosite DOAR la alegerea lui N):
- lumi sintetice din istoria lui: blocuri de 7 zile calendaristice luate la întâmplare, cu înlocuire (boții unei zile, cu orele și
  duratele lor, mutați pe zile noi); netul amestecat apoi între boții aceleiași zile de pornire (lume FĂRĂ efect);
- efectul pus pe boții „după” (porniți după declanșare): δ = −4,31 USDT pe bot (cât s-a văzut peste mecanică: −0,53 − 3,78) și
  δ = −2,15 (jumătate: efectul văzut e probabil umflat — e cel mai bun din ≥ 6 teste);
- testul exact ca mai sus (S față de amestecarea în zi, 400 de amestecări în simulare), verdictul la a N-a zi care contează;
  600 de lumi pe fiecare celulă; două bazine: toată istoria (21.12.2025–17.11.2026) și doar ultimele 6 luni (18.05–17.11.2026),
  unde zilele cu declanșare au fost mult mai rare (16 zile care contează în 6 luni, față de 43 în decembrie–martie).

| N (zile care contează) | 15 | 20 | 30 | 45 | 60 |
|---|---|---|---|---|---|
| fals „ține” fără efect, toată istoria | 3,3% | 3,3% | 4,8% | 4,0% | 3,7% |
| puterea la δ −4,3, toată istoria | 34% | 42% | 52% | **65%** | 71% |
| puterea la δ −2,15, toată istoria | 16% | 17% | 21% | 23% | 30% |
| zile calendaristice până la N (mediana), toată istoria | 88 | 118 | 173 | **259** | 344 |
| fals „ține” fără efect, ultimele 6 luni | 4,7% | 5,0% | 4,2% | 4,7% | 5,2% |
| puterea la δ −4,3, ultimele 6 luni | 16% | 18% | 21% | 27% | 28% |
| puterea la δ −2,15, ultimele 6 luni | 8% | 9% | 9% | 11% | 10% |
| zile calendaristice până la N (mediana), ultimele 6 luni | 169 | 226 | 336 | 512 | 676 |

De ce 45: la 30 puterea e o aruncare de monedă chiar în cazul bun (52%); 45 aduce 65% în ~8,5 luni, iar 60 mai adaugă doar 6 puncte
pentru încă 3 luni. Limita de un an ține proba să nu curgă la nesfârșit.

**Spus cinstit: puterea e mică.** Pe ritmul mediu din istorie, proba prinde un efect cât cel văzut cam în 2 cazuri din 3; pe ritmul
din ultimele 6 luni (puțini boți în zilele cu declanșare) limita vine prima, cu ~30 de zile care contează, și puterea scade la ~1 din 5.
Dacă efectul adevărat e jumătate din cel văzut, proba îl prinde rar (10–23%). Deci „nu-tine” va însemna aproape mereu „n-am aflat”,
nu „regula e greșită”. „Ține” însă ar fi o dovadă adevărată: testul nu dă fals mai des de ~5%.

Mărimea testului (fals „ține” ≤ ~5% fără efect) se verifică și în proba codului, pe lumi construite (`scripts/proba-v100360-trei.mjs`, T6).

O limită pe care testul n-o poate scoate: H0 spune „netul nu depinde de locul botului în zi”. Dacă piața are un tipar pe ora din zi
(de exemplu serile mai proaste decât diminețile), și boții porniți „după” sunt mai des seara, asta ar arăta ca efect. Nu se corectează
după cifre; se spune lângă verdict.
