# Simulator grid (Radar v100.134) — planul

Spec: `docs/superpowers/specs/2026-10-07-simulator-grid-design.md`. Execuție directă, TDD (proba picată întâi), o singură versiune v100.134, revizie Opus la final, push cu `npm test && …`.

## Sarcini
1. **`grid-calcul.js`**: `niveluriArit(jos, sus, N)` + export. Proba: N+1 valori, egal depărtate, capetele exacte.
2. **`grid-proba.js` `simuleaza(b, start, lungime, st, opt)`**: `st.tip` (aritmetic), `st.fundingZi`, `opt.traseu` (`net`, `perechi`, `iesiri` pe bară), `r.funding`. Probe: implicit neschimbat (cifra de dinainte, salvată în probă pe bare sintetice cu sămânță), traseu[ultim] = net, oprire la lichidare / stop, funding ≈ rata × expunere × zile.
3. **`grid-sim.js`**: `dinCod`, `inCod`, `setariDinBot`, `simuleaza`, `verdict`. Probe: dus-întors cu `TabloExtra.codTVBot` (9 / 10 / 19 / 20 câmpuri), erori pe nume, forma rezultatului, sumele la 1, planul (stricare), modul 2 = reluarea pe barele reale, verdictul regulă cu regulă.
4. **`grid-sim-ecran.js`**: HTML pur (`gsHtml`, verdict, durate, riscuri, botul meu) + legătura cu pagina (`gsPorneste`, `gsMod`, `gsAlegeBot`, `gsDinCod`, `gsDirectie`, `gsSimuleaza`, `gsOriz`, `gsCopiazaCod`, Enter). Probe în vm: formularul cu câmpurile, direcția mută stopul / TP-ul, verdictul cu culorile, tabelul cu 4 rânduri, modul 2.
5. **Pagina**: `index.html` (meniu + panel + script-uri), `app.js` `show()`, `sw.js` `APP_SHELL`, `app.css`. Bump v100.134 (BUILD_INFO, versiune.js, package.json, index.html, sw.js) + `test:v100134`.
6. **Verificare**: `npm test`; proba de pagină pe 8788 la 1920 / 390 (PONS: bot nou și botul meu; cod lipit; Enter); `test:ecran-telefon` (hook); revizie Opus; reparații; push; memorie.
