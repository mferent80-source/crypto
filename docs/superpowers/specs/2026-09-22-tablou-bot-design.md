# Tabloul botului — design

**Data:** 22.09.2026 · **Stare:** aprobat în discuție, gata de plan

## Problema

Aplicația are 967 de funcții și 25 de „engines", toate pornind de la un simbol
ales de mână într-un câmp. Niciuna nu se uită la ce are omul de fapt.

Ce are de fapt: **un bot de grid pe `COTI.PERP`**, 101,05 USDT, 5× long. Jurnalul
v71 citește doar spot, deci nu-l vede. Soldul contului nu-l vede — Pionex ține
banii în bot. Până la `v72` nu-l vedea nimic.

Tabloul ăsta pune botul în centru și aduce lângă el doar cifrele care hotărăsc
dacă grid-ul trăiește sau moare.

## Hotărâri luate

1. **Semnalele se calculează pe perpetua Pionex**, unde chiar e botul. **Prețul
   viu vine de pe Binance spot** prin WebSocket. **Basis-ul dintre ele e arătat
   ca semnal**, nu ascuns. *(Măsurat 22.09: spot 0,01582 vs perp 0,01536 — 3%.)*
2. **Un singur verdict**, care alege între „păzește botul", „reglează grid-ul" și
   „oportunitate manuală", și spune care cifră l-a dat.
3. **Ecran nou**, care ia doar ce-i trebuie. Motoarele existente rămân neatinse.
4. **Prețul curge continuu; restul se recalculează la 5–10 s.**
5. **Verdict pe reguli cu praguri vizibile**, nu scor compus. Un prag învățat pe o
   felie de istoric descrie, nu prezice — dacă vrem praguri învățate mai târziu,
   se pun peste, cu semafor de dovadă.
6. **Fără bot, ecranul nu moare**: trece pe simbolul ales manual și o spune.
7. **Intrare nouă în meniu, sus.** Nu înlocuiește Dashboard-ul acum.

## Arhitectura

Un modul nou, curat, fără DOM și fără rețea:

**`public/lib/tablou-bot.js`** — expune `window.TabloBot` cu două funcții pure:

```
masoara({klinePerp, pretSpot, bot, istoric}) -> masuri
verdict(masuri) -> { nivel, titlu, deCe[], ceFac, declansator }
```

Fiind pure, se probează în Node cu cifre fabricate, fără browser și fără rețea.

Legarea (polling, WebSocket, randare) stă în `app.js`, într-o funcție
`renderTabloBot()`. Modulul nu știe nimic despre ecran.

### Izvoarele

| izvor | ce aduce | cum | ritm |
|---|---|---|---|
| Binance spot, WebSocket | preț viu | `wss://stream.binance.com/ws/<simbol>@trade` — **simbolul cu litere mici** (`cotiusdt`), direct din browser | continuu |
| Pionex perp, server local | lumânări 5m | `/api/market?type=pionex_klines&interval=5M&limit=100` | 8 s |
| Bot, server local | tot ce ține de grid | `/api/bot-orders` | 8 s |

**Traducerea simbolului**, într-un singur loc: botul zice `COTI.PERP` + `USDT`
⇒ Pionex `COTI_USDT_PERP`, Binance `COTIUSDT`.

### Istoricul

Ritmul și basis-ul au nevoie de trecut. Se ține în `localStorage`, cheia
`tabloBotIstoric_v1`: câte un instantaneu **pe minut** (decimat din cele de 8 s),
păstrate **24 de ore**, maximum 1440 de intrări, inel. Fiecare intrare:
`{t, perechi, pretPerp, pretSpot}`.

Citirea și scrierea în `try/catch`: dacă `localStorage` lipsește, ecranul merge,
doar că măsurile care cer trecut raportează „fără bază".

## Cele șapte măsuri

| # | măsură | formula | prag |
|---|---|---|---|
| 1 | **poziția în interval** | `(pret − jos) / (sus − jos) × 100` | margine: <15% sau >85%; afară: <0 sau >100 |
| 2 | **ritmul perechilor** | perechi în ultima oră ÷ media pe oră din **ultimele 6 ore** (fără ora curentă) | scăzut: <40% |
| 3 | **oscilație sau trend** | Kaufman pe 48 de lumânări de 5m: `abs(c[n]−c[0]) / Σ abs(c[i]−c[i−1])` | trend: >0,60 · zigzag: <0,30 |
| 4 | **amplitudine vs treaptă** | `ATR(14, 5m) ÷ ((sus−jos) / linii)` | moartă: <1,0 |
| 5 | **până la lichidare** | de la server, `distantaLichidarePct` | grav: <8% · atenție: <15% |
| 6 | **basis perp vs spot** | `(perp − spot) / spot × 100` | sărit: `abs` > 1% **și** > 2× mediana ultimelor 24 de măsurători |
| 7 | **comision vs grid brut** | `abs(comisioane) ÷ gridProfitBrut` | mănâncă: >0,50 |

Numărul de linii al grilei vine din `buOrderData.row`. Dacă lipsește, măsura 4
raportează „nu se poate socoti" — nu se ghicește.

## Verdictul

O scară. Se coboară și se oprește la prima treaptă aprinsă. Aceleași cifre dau
mereu același verdict.

| nivel | condiție | exemplu de text |
|---|---|---|
| ⬛ `NEDOVEDIT` | vârsta botului <2 h **sau** lumânări <48 **sau** istoric <30 min | „Botul are 47 de minute. Ritmul are nevoie de ~2 ore ca să însemne ceva." |
| 🔴 `OPRESTE` | lichidare <8% **sau** `marginStatus≠NORMAL` **sau** `riskStatus≠TRADING` | „Ieși. 6,2% până la lichidare." |
| 🟠 `PAZESTE` | poziția afară din interval **sau** (trend >0,60 **și** poziția la margine) **sau** lichidare <15% | „Nu mai câștigi din oscilație, ții doar un long de 5×." |
| 🟡 `REGLEAZA` | poziția la margine ≥30 min **sau** amplitudine <1,0 **sau** comision >0,50 **sau** ritm <40% | „Mută intervalul în sus — stai la 94% de trei sferturi de oră." |
| 🔵 `OPORTUNITATE` | basis sărit **sau** trend trecut de la >0,60 la <0,30 | „Perpetua a luat-o înainte cu 3,4% față de spot." |
| 🟢 `LINISTE` | nimic din cele de mai sus | „Merge. 14 perechi în ultima oră, ești la 61% din interval." |

`NEDOVEDIT` e **prima** dinadins. Un ecran care spune verde fără să aibă cu ce
compara minte politicos.

Fiecare verdict cară `declansator`: numele măsurii, valoarea ei și pragul.

**Fără bot:** nivel `FARA_BOT`, ecranul trece pe simbolul din câmpul manual,
măsurile 1, 2, 4, 5, 7 raportează „n-am bot", 3 și 6 se calculează normal.

## Ecranul

Intrare nouă în meniu, deasupra la Dashboard: **„Tabloul botului"**,
secțiune `tabloubot`.

1. **Verdictul**, sus, mare, colorat. Sub el, mic: cifra care l-a declanșat și pragul.
2. **Rigla intervalului**: `0,0153 ─────●──── 0,0158`, cu semnul tău pe ea, cu
   prețul viu deasupra și lichidarea marcată jos.
3. **Cele șapte măsuri**, fiecare cu valoarea, pragul și starea. Cele care au
   declanșat verdictul, aprinse.
4. **Rândul botului**, ca în panoul de azi.

Fără culoare ca singur purtător de înțeles: fiecare stare are și cuvânt.

## Probele

**`scripts/tablou-bot-v73.mjs`** — funcțiile pure, cu cifre fabricate:

- fiecare treaptă a scării, aprinsă pe rând
- **ordinea scării**: cu două condiții aprinse deodată, iese cea mai gravă
- graniță: exact pe prag nu aprinde; cu un pas peste, aprinde
- `NEDOVEDIT` când lipsește trecutul, și **nu** când e destul
- `FARA_BOT` nu crapă și nu inventează cifre
- fiecare verdict poartă `declansator` cu valoare și prag
- traducerea simbolului: `COTI.PERP`+`USDT` → `COTI_USDT_PERP` și `COTIUSDT`
- inelul de istoric: nu trece de 1440, taie ce e mai vechi de 24 h
- măsura 4 raportează „nu se poate socoti" când lipsește `row`, nu ghicește

**Probă de ecran**, în Chrome real: pagina se deschide, verdictul apare, rigla se
mișcă unde trebuie, nu crapă nimic fără bot, zero excepții.

**Fiecare gardă se măsoară prin stricare.** O gardă pe care n-am văzut-o dând
roșu nu e o gardă.

## Ce NU intră

- Nimic care scrie la Pionex. Tot ce atinge botul rămâne citire.
- Nicio pornire, oprire sau reglare automată. Ecranul spune, omul face.
- Praguri învățate din istoric. Mai târziu, cu semafor de dovadă.
- Rescrierea motoarelor existente.
