# Riscul boților și al acțiunilor (I-558, I-559, I-560 + comportamentul) — planul

> Execuție: nativ (eu scriu, testez, livrez — regula lui din 24.09), TDD pe fiecare etapă, revizie Opus la final.

**Cererea (el, 06.10):** „1. amândouă — în Tablou să-mi spună despre bot sau stock probabilități, iar în pagina din meniu să-mi spună tot ce poate 2. îi numeri tu 3. pune 4. fă explicit, așa aflu și eu dacă am un comportament greșit — pentru boți și pentru stock”.
**Demo aprobat:** https://claude.ai/artifact/BncJBs4CqtXBshsdCcoRLB · analizele: scratchpad `mc-boti2.mjs`, `comportament-boti.mjs`, `comportament-actiuni.mjs` (regula fixată înainte de rezultate, în capul fiecăruia).

**Arhitectura:** un modul pur `public/lib/risc-luna.js` (RiscLuna) face toate socotelile; colectorul îl rulează o dată pe noapte pe arhiva boților (`/api/istoric-bot?action=botiInchisi`) și pe istoricul T212 (`/api/t212?action=istoric`) și trimite rezumatul (mic, ≤ 100 KB) la `/api/istoric-bot?action=risc`; paginile doar îl citesc. Corelația boților DESCHIȘI se socotește pe pagină (lumânări 1 h, la 30 min).

## Constrângeri
- Regula statistică (I-530 / I-545): dovedit = IC 95% (bootstrap pe monede / acțiuni, 2.000) fără 0 ȘI același semn în ambele jumătăți de timp; altfel „nedovedit” (nu „fără efect”); minim 30 de boți / 20 de episoade pe grup. Lista obiceiurilor e închisă (cea din scripturi).
- Bazinul boților: futures_grid, închiși din 2026-01-01, sumă > 0; Monte Carlo pe levier ≤ 5; r = totalRealizedProfit / usdtInvestment.
- Ritmul (K) și suma (S) le număr eu: boții porniți în ultimele 30 de zile, mediana sumelor lor (fallback: ultimele 20 de boți); la acțiuni: episoadele începute în 30 de zile, mediana banilor puși.
- Rezultatele cu o singură zecimală; textele prin TextRo.cate; minus „−”; caveat-urile de cauză spuse (durata / medierea depind și de rezultat).
- Nimic pierdut: Monte Carlo-ul vechi pe semnale rămâne, pliat, pe aceeași pagină.

## Etapele
1. **RiscLuna (pur)** — `bazinBoti`, `ritm`, `monteCarlo`, `supravietuire` (pe ore, pentru „botul stă de X h”), `descBoti` (comisioane, durate, coada), `comportamentBoti`; `episoade`, `ritmActiuni`, `monteCarloActiuni`, `supravietuireActiuni` (pe zile), `descActiuni`, `comportamentActiuni`; `corelatie`; `raport` (le strânge). Probe pe date mici construite + cifrele analizei pe arhiva reală (aceleași ca scripturile).
2. **Server + colector** — `action=risc` GET/POST (curățat, ≤ 100 KB, KV `risc`); colectorul: `turaRisc` o dată pe zi, după ce are arhiva, starea scrisă după trimitere reușită.
3. **Pagina „Monte Carlo” din meniu** — Boții (luna proastă la ritmul tău + alegere K, histograma, de unde vine, lunile reale, ținuți mult, comisioane, obiceiurile cu verdict) · Acțiunile (la fel) · metoda pliată · vechiul Monte Carlo pe semnale pliat.
4. **Tablou** — cartela „Riscul”: probabilitățile botului după cât stă deja (din boții tăi care au ajuns la X h), luna proastă la ritmul tău, toți boții deodată (la stop, lichidarea cea mai apropiată, corelația ≥ 0,5).
5. **T212** — în detaliul poziției: probabilitățile după cât o ții deja + avertismentul „ai cumpărat mai jos pe ea” cu cifra dovedită.
6. Versiunea, `npm test`, verificat pe 8788, revizie Opus, commit + push, colectorul repornit, memoria.
