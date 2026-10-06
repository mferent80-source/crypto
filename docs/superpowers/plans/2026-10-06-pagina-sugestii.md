# Pagina „Sugestii” — planul

> Execuție: nativ (eu), apoi revizie Opus pe tot. Specul: `docs/superpowers/specs/2026-10-06-pagina-sugestii-design.md`. Versiunea: v100.119 / colector v101.81.

**Scopul:** o pagină cu toate sugestiile (boți, acțiuni US, acțiuni EU), cu trei liste noi „early” (început de urcare, pre-market / gap, revers timpuriu), fiecare cu istoricul pe 2 ani și urmărirea înainte.

## Constrângeri globale
- Regulile din spec, fixate înainte de cifre; nu se ajustează după istoric.
- Intrare la deschiderea zilei de după semnal (gap: deschiderea aceleiași zile), ieșire după 10 zile de bursă, −0,3% comision; un semnal la cel mult 14 zile pe ticker.
- Verdict = `Carnet.verdictMonede` (cheie ticker, blocuri de 14 zile); textele în garda STRICT (grupul `sugestii`), o zecimală la rezultate.
- Nimic șters din Tablou / T212 / Acasă.

## Ce poate mușca
1. Privit în viitor: semnalul de „ieri” care folosește bara de azi; media pe 50 / volumul pe 20 care includ ziua semnalului greșit ⇒ proba „stric viitorul”.
2. Bara de azi neterminată (la 8:00 RO bursa US e închisă, dar `bareToate` poate include o bară parțială) ⇒ `azi` folosește ultima bară ÎNCHISĂ.
3. Tickerele EU care nu există la Yahoo ⇒ se sar, se numără, nu opresc tura.
4. Pre-market: rânduri fără volum / fără pre-market (Yahoo dă doar ora de bursă) ⇒ „n-am pre-market”, nu 0%.
5. Zilele fără bursă (weekend, sărbători) ⇒ turele de 10:20 / 16:00 nu scriu liste goale peste cele bune.

### Task 1 — `SugestiiActiuni` pur: regulile, punctele, istoricul
### Task 2 — pre-market / gap la deschidere pe rânduri intraday
### Task 3 — serverul: `sugestii`, `premarket`, `prepost=1`
### Task 4 — colectorul: listele la 8:00 (US + EU), turele 10:20 și 16:00
### Task 5 — pagina `#sugestii` + butonul de pe Acasă + meniul
### Task 6 — versiunea, suita, pozele, revizia, livrarea
