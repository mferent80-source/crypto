# Pagina „Sugestii” — boți, acțiuni US, acțiuni EU · design

Data: 2026-10-06 · Aprobat de el în chat: „pune pe pagină și sugestii de stocks EU, la fel reversul, sugestii early” ⇒ „Acasă” + „early = toate trei” ⇒ „Da, așa” ⇒ „mai bine o pagină de sugestii unde pui tot și boți și EU și US, absolut toate” ⇒ „Da: DAX + CAC + AEX + ale tale”.

## Ce a cerut (cuvintele lui și alegerile)
- O pagină „Sugestii” cu TOATE sugestiile: boți, acțiuni US, acțiuni EU.
- „Early” = toate trei: începutul unei urcări, pre-market, revers timpuriu — în plus față de ce există.
- EU = DAX 40 + CAC 40 + AEX 25 + acțiunile EU pe care le-a tranzacționat.

## Presupuneri (ale mele)
- Pagina nouă `sugestii` în „Zilnic”, după „Tabloul botului”; Acasă păstrează cartela „Ce aș cumpăra azi” + un buton „Toate sugestiile”. Nimic șters din Tablou / T212.
- Regulile se fixează ÎNAINTE de cifre și nu se ajustează după istoric (fără curve-fitting). Pragul e un privilegiu: o listă cu istoric slab rămâne, cu istoricul la vedere.
- Intrarea: la deschiderea zilei de după semnal (semnalul se vede la 8:00 RO, după închiderea de ieri); ieșirea: închiderea după 10 zile de bursă; comisionul de conversie 0,3% scăzut.
- Gap-ul / pre-market: istoricul se socotește pe gap-ul LA DESCHIDERE (deschiderea / închiderea de ieri), intrare la deschiderea aceleiași zile — Yahoo nu păstrează pre-market pe 2 ani; se spune.

## Regulile (fixate acum)
- 🌱 **Început de urcare**: închiderea de ieri > maximul celor 20 de zile dinainte; cele 10 zile dinainte au avut amplitudinea (max/min − 1) ≤ 8%; volumul de ieri ≥ 1,5 × media volumului pe 20 de zile; închiderea > media pe 50 de zile.
- ↩️ **Revers timpuriu**: închiderea de ieri ≤ 85% din maximul pe 30 de zile (cădere ≥ 15%) și închiderea de ieri > maximul zilei de alaltăieri, iar alaltăieri închiderea era sub maximul zilei dinaintea ei (prima zi de întoarcere).
- 🌅 **Pre-market (US)**: la ~16:00 RO, prețul din pre-market ≥ +2% față de închiderea de ieri și volumul din pre-market ≥ 1% din volumul mediu zilnic pe 20 de zile.
- 🌅 **Gap la deschidere (EU)**: la ~10:20 RO (bursele EU deschid la 10:00), deschiderea de azi ≥ +2% față de închiderea de ieri și volumul primelor 20 de minute ≥ 3% din volumul mediu zilnic pe 20 de zile.
- Existente: 💡 Idei de cumpărare (US), 🔁 Pe revenire (US; regula Reveniri.actiune) — și pe EU „Pe revenire” cu aceeași regulă.

## Istoricul fiecărei liste
- Pe barele zilnice aduse dimineața (US: Nasdaq-100 + ale lui; EU: DAX/CAC/AEX + ale lui), ~2 ani, fără privit în viitor.
- Puncte: zilele cu semnal (cel mult una la 14 zile pe ticker) vs zilele oarecare (aceleași tickere); rezultatul = randamentul pe 10 zile de bursă − 0,3%.
- Verdict = `Carnet.verdictMonede` cu cheia ticker + blocuri de 14 zile: dovedit / la limită / nedovedit / prea puține; plus eticheta „mai bine / cam la fel / mai slab” (ca reveniri).
- Urmărirea înainte: fiecare listă își ține istoricul (zi, ticker, preț) ⇒ după 14 zile, rezultatul real.

## Datele
- `public/lib/sugestii-actiuni.js` (pur, `SugestiiActiuni`): regulile, `azi(b, regula)`, `puncte(b, regula)`, `dovada(serii, regula)`, `premarket(randuri5m, inchidereIeri, volMediu)`, textele.
- Colectorul, la 8:00 (tura ideilor): listele US pe barele aduse deja + EU (aduce barele EU, ~100) ⇒ POST `/api/t212?action=sugestii`; la ~10:20 RO gap-ul EU și la ~16:00 RO pre-market-ul US (zile lucrătoare) ⇒ POST `action=premarket` (`{eu}` / `{us}`).
- Serverul: KV `t212:sugestii`, `t212:premarket`, `t212:sugestii-istoric` (urmărirea), ≤ 256 KB, `la` obligatoriu; `action=preturi` primește `prepost=1` (Yahoo `includePrePost=true`).
- Pagina: secțiunea `#sugestii`: 🤖 Boți (clasamentul: Pe ce aș porni / Pe revenire / Short — funcțiile existente) · 🇺🇸 US · 🇪🇺 EU; fiecare listă: ≤ 5 rânduri (simbol, ce s-a întâmplat, prețul) + istoricul într-un rând + verdictul.

## Testele
- Proba `proba-v100119.mjs`, roșie întâi: regulile pe bare construite (da / nu la limită), fără privit în viitor (barele de după stricate ⇒ același semnal), punctele și verdictul, pre-market pe rânduri construite, serverul (sugestii / premarket / prepost), colectorul, pagina în vm, garda textelor (grupul `sugestii`).
