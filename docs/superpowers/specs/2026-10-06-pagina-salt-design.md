# Pagina „Salt” — instrumentele Salt Bank, analizate ca la Trading 212 · design

Data: 2026-10-06 · El: „creează și o pagină Salt cu acțiunile din listă și le analizezi ca pe cele din Trading 212” ⇒ ales: „Lista + pozițiile mele” · „Acțiuni + ETF-uri” · pozițiile „le scriu eu pe pagină”.
Lista: https://salt.bank/storage/app/efsfiles/media/investitii/Lista%20intrumente%20disponibile%20pentru%20tranzactionare.pdf

## Ce știm din listă
- 556 de instrumente: ISIN, nume (în forma bursei germane), tip, complexitate, țară — FĂRĂ simbol de bursă.
- Acțiuni + ETF-uri = 526 (ETC/ETN-urile pe crypto și mărfuri nu intră); Yahoo găsește simbolul după ISIN pentru 513 (căutare `v1/finance/search?q=ISIN`); bursa aleasă după țara ISIN-ului (US ⇒ Nasdaq/NYSE, DE ⇒ Xetra, FR ⇒ Paris…), ETF-urile ⇒ Xetra / Paris / Amsterdam / Londra.
- Universul se ține în `public/data/salt-univers.json` (refăcut când Salt schimbă lista — el îmi dă PDF-ul nou).

## Pagina (Zilnic, după „Trading 212”)
1. **Pozițiile mele la Salt** — formular (instrumentul din listă, căutare după nume / ISIN / simbol; cantitatea; prețul mediu în moneda simbolului; data cumpărării, opțional) ⇒ pe server (`/api/t212?action=saltPozitii`). Pe fiecare: aceeași analiză ca la T212 — `ActiuniSemnale.stare / semafor / niveluri` (stopul care urcă), `Probabilitati.pentruActiune`, `Consilier.sfaturiPozitie`, verdictul `Consiliu.alcatuiesteActiune` (pastila ȚINE / ATENȚIE / IEȘI, „Ce aș face eu”, motivele) — pe barele zilnice ale simbolului (`preturi&yahoo=SIMBOL`).
2. **Liste pe instrumentele Salt** — 🌱 început de urcare, ↩️ revers timpuriu, 🔁 pe revenire, fiecare cu istoricul pe 2 ani pe universul Salt (aceleași reguli ca pagina Sugestii; igiena salturilor).
3. **Toate instrumentele** — tabel căutabil: nume, simbol, bursa, tipul, prețul, ziua de ieri, trendul pe 50 / 200 de zile.

## Datele
- Colectorul, la 8:00 (după sugestii): barele zilnice pe universul Salt ⇒ listele + istoricul + tabelul ⇒ POST `/api/t212?action=salt` (KV `t212:salt`, ≤ 256 KB).
- Serverul: `preturi` primește și `yahoo=SIMBOL` (validat) în locul tickerului T212; `saltPozitii` POST / GET (KV `t212:salt-pozitii`, ≤ 60 de poziții, câmpuri curățate); GET `salt` ⇒ `{ raport, pozitii }`.

## Ce nu face (spus pe pagină)
- Nu citește contul Salt (nu are API): pozițiile sunt cele scrise de el; prețul e cel al bursei principale a simbolului (la Salt prețul poate fi în EUR, pe o bursă germană).
- Fără idei de cumpărare cu poarta T212 (aceea folosește rezultatele trimestriale și istoricul lui T212).

## Testele
- `proba-v100120.mjs`, roșie întâi: universul (fără ETC/ETN, fără dubluri, simboluri valide), serverul (yahoo=, saltPozitii, salt), analiza unei poziții pe bare construite (pastila + stopul), pagina în vm (formularul, tabelul, escapare), colectorul, garda textelor.
