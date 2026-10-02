# Sfaturile, concise și profesioniste — design

**Data:** 01–02.10.2026 · **Cerut de el:** „revizuiește toate sfaturile, cu toate skilurile necesare, să le faci mai concise, profesioniste și mai optimizate”. **Stil ales de el:** „Concis, cu «Aș …»”. **Abordare aprobată:** A — pe loc, fișier cu fișier, în 5 pachete, cu gardă automată.

## Ce se schimbă și ce nu
- **Se schimbă:** DOAR textul sfaturilor (titlu/motiv, „Ce aș face eu”, explicația, mesajele Discord) și felul în care sunt scrise cifrele.
- **Nu se schimbă:** pragurile, logica, nivelurile (IEȘI / ATENȚIE / ȚINE), codurile sfaturilor, ordinea motivelor, ce informație poartă fiecare sfat (cifrele, condițiile, acțiunea). Nicio informație nu se pierde (vezi „Inventarul”).

## Regulile de scris (garda le verifică)
1. **Titlul / motivul** = faptul + cifra, **≤ 60 de caractere**. Fără „s-a”, „a ajuns să”, fără umplutură. Ex.: „Lichidarea la 12,4% · se îndepărtează (11,8% acum 1 h)”.
2. **„Ce aș face eu”** = **o singură acțiune**, la persoana I („Aș …”, „N-aș …”), **≤ 110 caractere**. Condiția apare doar dacă schimbă acțiunea („Dacă scade sub 8%, adaug marjă.”). Nu repetă titlul.
3. **Explicația** = **o frază, ≤ 160 de caractere**, doar „de ce”. Nu repetă titlul sau acțiunea.
4. **Avertizările comune** („o frecvență din trecut, nu o promisiune”, „puține cazuri — un semn, nu o regulă”) se spun **o singură dată**, în legenda panoului, nu în fiecare sfat. În sfat rămâne doar marcajul scurt „(puține cazuri)” acolo unde e cazul.
5. **Cifrele** — un singur modul comun, `public/lib/text-ro.js` (`TextRo`), folosit în pagină și în colector:
   - `TextRo.pct(x, zec)` → „12,4%” (virgulă), `TextRo.pctSemn(x, zec)` → „+1,2%” / „−0,8%” (minus tipografic);
   - `TextRo.usdt(x)` → „−8,50 USDT”, `TextRo.lei(x)` → „1.234 lei”;
   - `TextRo.ore(ms)` → „1 h” / „45 min”.
   Prețurile rămân cu zecimalele Pionex (formatarea existentă `grPret`/`fmtP`).
6. **Vocabular unic** (un singur cuvânt pentru un lucru): botul · gridul · grila (o treaptă) · intervalul · marginea de jos / de sus · lichidarea · stopul · planul (ținta și pragul tău) · „închide botul” (nu „oprește”/„ieși” amestecat) · „adaugă marjă” · „pornește unul nou din fișă”.
7. **Ton:** fără exclamații, fără „atenție!” în text (nivelul îl dă culoarea), fără „vezi … mai jos” dacă acel lucru nu e chiar sub sfat pe ecran.
8. **Discord:** titlul ≤ 60, mesajul ≤ 2 rânduri (faptul cu cifra + acțiunea); legătura spre Radar rămâne.

## Pachetele (în ordine)
1. **Consilierul și semaforul boților** — `public/lib/semnale-bot.js` (semafor, „Ce aș face eu” pe componente, scenarii), `public/lib/consiliu.js` (titluri, motive compuse, rest).
2. **Sfaturile boților** — `public/lib/sfaturi.js`, `public/lib/tablou-extra.js` („Ce ai de făcut acum”), `public/lib/scenariu.js`.
3. **Alertele și Discord** — `public/lib/alerte.js` (77 de texte), mesajele compuse în `scripts/colector.mjs` (ceasul gridului îngust, raportul de duminică, autopsia).
4. **Acțiunile T212** — `public/lib/actiuni-semnale.js` (semafor, poarta), `public/lib/consilier.js` (sfaturi pe poziție, piața, rezumatul), textele din `public/lib/t212-ecran.js` (Consilier, poarta, idei), `public/lib/probabilitati.js` (rândurile 🎲).
5. **Acasă, rapoarte, fișa** — `public/lib/acasa.js`, `public/lib/obiceiuri.js` (raport, autopsie), `public/lib/grid-proba.js` (motivele gridului îngust, verdictul fișei), textele fișei din `public/app.js`.

Fiecare pachet: inventar înainte → rescriere → gardă + probele vechi aduse la textul nou (fiecare schimbare de test notată) → poze → commit/push.

## Garda automată — `scripts/garda-texte.mjs` (în `npm test`)
- Generează sfaturile REAL, cu modulele adevărate, pe un set de situații (fixturi din datele lui): CRV long lângă marginea de jos cu lichidarea la 12% (se apropie / se îndepărtează / fără istoric), bot sub grid, bot cu plan atins (plus / minus), funding contra, mișcare BTC, trend contra; acțiunile: poziție IEȘI (stop atins), ATENȚIE (trend jos), ȚINE, poarta (cumpără / așteaptă / nu), rezultate în 3 zile; alertele: lichidare 12% / 6%, preț ieșit din grid, botul oprit.
- Pentru fiecare text generat verifică: lungimea (regulile 1–3, 8), virgula zecimală (nicio cifră de forma „12.4%”), lipsa cuvintelor interzise („atenție!”, „s-a apropiat la”, umpluturi din listă), că titlul nu se repetă în explicație/acțiune, că avertizările comune nu apar în sfat.
- Pragurile gărzii se aplică pachet cu pachet: un pachet terminat trece pe „strict” (eșec la orice abatere); cele netrecute încă raportează doar numărul de abateri (ca să nu blocheze suita între pachete).

## Inventarul (nu se pierde nimic)
- **Înainte** de fiecare pachet: lista textelor (fișier:linie, cheia, textul) și, pentru fiecare, informațiile pe care le poartă (cifrele, condițiile, acțiunea) — `docs/superpowers/inventar-sfaturi/<pachet>.md`.
- **După:** aceeași listă cu textul nou alături; fiecare informație din „înainte” trebuie să existe în „după” (sau mutată explicit în legenda comună — scris pe rând).

## Cum se verifică
- `npm test` verde, garda strictă pe pachetele terminate.
- Poze la 1920 și 390 px: Tabloul (Consilierul pe CRV), pagina T212 (o poziție IEȘI deschisă + poarta), fișa, „Ce ai de făcut acum”; un mesaj Discord de probă (în jurnal, nu trimis).
- Revizie Opus la final pe tot (regulile + inventarul).
- Versiunile: v100.61 … (o versiune pe pachet), colectorul la pachetele 3 și 5.
