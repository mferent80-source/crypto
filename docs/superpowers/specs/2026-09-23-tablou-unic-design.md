# Tabloul unic — proiect

**Data:** 23.09.2026
**Cui îi folosește:** Marius, care ține bani reali într-un bot de grid cu levier 5×
pe Pionex și vrea să nu mai deschidă aplicația Pionex.

## Scopul

Ecranul „Tabloul botului" devine **singurul loc** unde Marius se uită: ce are de
făcut, cât a câștigat, dacă e în pericol, și pe ce dovezi se sprijină toate astea.

Ordinea benzilor e ordinea în care se uită EL, spusă de el:
banii → prețul față de grid → lichidarea → dacă botul mai lucrează.
Verdictul rămâne deasupra tuturor, fiindcă el e decizia.

## Ce NU face

- **Nu dă niciun procent de direcție prezentat ca măsurătoare.** Am măsurat:
  căutarea de direcție a dat **−0,112R** prin replay, iar pe 119 trade-uri
  intervalul de încredere cuprinde zero. Direcția apare ca **semn**, marcat
  `NEDOVEDIT`, cu cifra contrară scrisă lângă el.
- **Nu proiectează în viitor.** Fără „în N zile vei ajunge la…". Proiecțiile sunt
  felul în care ecranele încep să mintă.
- **Nu scrie nimic la Pionex.** Strict citire, ca tot restul aplicației.

## Vocabularul dovezii

Fiecare cifră de pe ecran are una din trei stări, și starea se **vede**:

| stare | înseamnă | cum arată |
|---|---|---|
| `dovedit` | destule observații în istoric | cifra, normal |
| `putin` | sub pragul ei, dar se poate arăta | cifra + „din doar N minute" |
| `nu-se-poate` | n-avem datele | „—" plus ce lipsește, niciodată `0` |

⚠️ **Regulă transversală:** lipsa nu se scrie niciodată ca zero. Un `0` și un
„n-am de unde ști" arată la fel pe ecran și se citesc complet diferit.

---

## Etapa B (se face acum) — tot ce se poate fără rută nouă

### B1. Colectarea în fundal

Azi istoricul se adună **doar** cât panoul „Tabloul botului" e deschis
(`opresteTabloBot()` oprește ceasul și WebSocket-ul la ieșire). Deci ecranul pe
care Marius îl vrea central e orb cât timp e pe alt ecran.

**Cum se schimbă:**
- Un colector pornește **o dată cu aplicația** și merge cât aplicația e deschisă,
  pe orice ecran.
- **Cadență:** 8 s cât panoul e vizibil (ca acum), **60 s** cât nu e.
- **Fără WebSocket în fundal.** Prețul spot nu se urmărește când panoul e ascuns;
  intrările de istoric au atunci `pretSpot: null`. Consumatorii sar peste `null`
  (deja reparat), deci mediana basis rămâne curată.
- **Regula penei rămâne neatinsă:** dacă `/api/bot-orders` pică, NU se scrie nimic
  în istoric. O pană nu are voie să devină dovadă.
- Colectorul se oprește la `visibilitychange` → ascuns, și repornește la revenire.
  Un tab uitat în fundal de zile nu bate ruta degeaba.

**Câmpuri noi în istoric** (pe lângă `t`, `perechi`, `pretPerp`, `pretSpot`):
`profitNet`, `comisioane`, `gridProfitBrut`, `investit`.
Fără ele nu se pot calcula nici banii în timp, nici ritmul real.

### B2. Banda BANII

Din `/api/bot-orders`, câmpuri care **există deja** și nu se arată nicăieri:

| ce se arată | din ce câmp |
|---|---|
| Investit | `investit` |
| **Profit net** | `profitNet` |
| plus/minus în procente | `profitNet / investit × 100` |
| Comisioane plătite | `comisioane` |
| Finanțare plătită/încasată | `finantare` |
| Profit brut de grid | `gridProfitBrut` |

**Profitul net e eroul benzii**, scris mare. Cifra brută de grid stă mică, lângă,
fiindcă e cea care păcălește: ea nu scade comisioanele.

Sub ele, **toți boții** (din aceeași rută, `d.bots`): simbol · activ/oprit ·
profit net al fiecăruia · investit. Plus un **total** peste toți.

Alături, **soldurile spot** din `/api/pionex-account?action=balances`, doar
monedele cu sold nenul, ordonate descrescător.

⚠️ **Limita spusă pe ecran:** marja liberă din contul **futures** NU apare în
etapa B — nu există rută pentru ea. Banda scrie asta explicit, ca Marius să nu
creadă că vede tot contul când nu-l vede.

### B3. Banda PERICOLUL

Trei lucruri deja măsurate, puse cap la cap pentru prima dată:
- **prețul față de grid** — bară, nu cifră (vezi B5)
- **distanța până la lichidare** — `distantaLichidarePct`, cu pragurile 15/8
- **starea marginii și a riscului** — `stareMargine`, `stareRisc`

Dacă oricare dintre ele lipsește, scrie „—" și ce lipsește.

### B4. Banda DOVADA — frecvențe din istoricul LUI

Toate se calculează în modulul pur, din istoric. Definiții exacte:

Cifrele sunt de **două feluri**, și găurile din istoric le ating diferit. Asta e
distincția centrală a benzii; dacă se pierde, ecranul minte.

**(a) Rate din contoare CUMULATIVE** — `profitNet`, `perechi`, `comisioane` vin
de la Pionex ca totaluri de la pornirea botului. Valoarea de la sfârșit **include
și ce s-a întâmplat cât n-am privit**, deci o gaură **nu** invalidează rata:

| cifră | definiție | prag minim |
|---|---|---|
| **perechi pe oră** | `(ultimul perechi − primul perechi) / ore observate` | 2 h de întindere |
| **net pe zi (observat)** | `(ultimul profitNet − primul profitNet) / ore × 24` | 2 h de întindere |

unde `ore = (ultimul.t − primul.t) / 3600000`. Contorul care **scade** înseamnă
că botul a fost repornit sau schimbat ⇒ `nu-se-poate`, nu o rată negativă
inventată.

**(b) Frecvențe de STARE** — aici gaura chiar înseamnă că nu știm unde era
prețul, deci intrările lipsă **nu intră în numitor**, iar ecranul spune cât din
răstimp a fost observat:

| cifră | definiție | prag minim |
|---|---|---|
| **timp în interval** | `100 × (intrări cu pretPerp între gridJos și gridSus) / intrări observate` | 60 intrări |
| **cât de des la margine** | `100 × (intrări cu poziție <15% sau >85%) / intrări observate` | 60 intrări |

⚠️ Amândouă se afișează **cu acoperirea alături**: „82% din interval ·
**observat 61% din ultimele 24 h**". Fără acoperire, „82%" se citește ca și cum
am fi privit tot timpul.

⚠️ **Frecvențele de stare se socotesc cu `gridJos`/`gridSus` CURENTE.** Dacă
intervalul a fost mutat recent, ele descriu prețul vechi față de gridul nou.
Istoricul nu ține marginile per intrare. Se scrie pe ecran, o dată, sub bandă.

**Duratele** (nu frecvențele, nu ratele) rup lanțul la o gaură mai mare de
5 minute, ca `minuteLaMargine` — o ședere „continuă" nu se dovedește peste un gol.

### B5. Graficul

Un singur grafic, SVG construit în cod, fără nicio bibliotecă.

**Ce arată:** prețul perp pe ultimele 24 h, peste **banda gridului** (`gridJos`…
`gridSus`) desenată ca dreptunghi umbrit, cu **linia de lichidare** dacă intră în
scară.

**Reguli care îl fac să nu mintă:**
1. **Găurile se desenează ca găuri.** O întrerupere mai mare de 5 minute rupe
   linia; nu se unesc două puncte peste o oră de necunoscut.
2. **Scara verticală cuprinde întotdeauna banda gridului.** Altfel un preț ieșit
   mult din interval ar comprima banda până la o dungă și ar părea că prețul e
   „aproape" de ea.
3. **Sub 10 puncte nu se desenează nimic** — scrie „prea puține măsurători",
   nu o axă goală care pare un grafic.
4. **Fără animație, fără gradient, fără umbre.** Se citește pe telefon, în
   lumină, în două secunde.
5. Culorile vin din variabilele temei, nu fixate — ca să meargă și pe fundal
   deschis, și pe întunecat.

### B6. Direcția, marcată NEDOVEDITĂ

Ultimul rând al benzii DOVADA. Semnul de direcție se calculează din eficiența
Kaufman și din trend (măsura 3, care există), dar se afișează astfel:

> **Semn: în sus** · `NEDOVEDIT`
> *Nu s-a dovedit că prezice. Prin replay, o direcție căutată a dat −0,112R;
> pe 119 trade-uri intervalul de încredere cuprinde zero.*

Textul cu cifra contrară **nu e opțional și nu se ascunde după un click.**

---

## Etapa A (după B, dacă sonda iese bine) — contul futures

**Necunoscuta:** aplicația n-are nicio rută pe prefixul futures al Pionex
(`/uapi/v1/*`). Nu știu sigur ce endpoint dă soldul și marja liberă, și **nu pot
verifica fără cheile lui pornite**.

**Deci A începe cu o sondă**, nu cu cod livrat: cu aplicația pornită local, se
încearcă endpoint-urile candidate și se citește ce întorc. Dacă unul dă soldul și
marja liberă, se adaugă o rută **strict read-only**, la fel ca `bot-orders`, și
banda BANII primește marja liberă plus avertismentul când e sub un prag.

Dacă sonda nu găsește nimic, **A se oprește aici** și banda rămâne cu nota din B2.

---

## Cum se probează

- **Modulul pur** (`public/lib/tablou-bot.js`) primește frecvențele și geometria
  graficului. Probe în `npm test`: fiecare frecvență la pragul ei, sub prag,
  cu istoric gol, cu găuri, cu `gridJos`/`gridSus` lipsă.
- **Ecranul** (`npm run test:ecran`, Chrome real): benzile apar în ordinea cerută
  · profitul net e mai mare decât cifra brută · graficul nu unește peste o gaură
  · sub 10 puncte nu desenează · colectorul scrie în fundal de pe alt ecran ·
  colectorul NU scrie în timpul unei pene de rută · nota despre futures apare.
- **Fiecare purtare nouă se măsoară prin stricare**: o condiție, nu un bloc.

## Constrângeri transversale

- Cod și comentarii în **română fără diacritice**; textul de pe ecran **cu**.
- **Strict read-only** față de Pionex. Nicio rută care scrie.
- Terminațiile de linie se iau din fișier (`app.js` și `index.html` sunt CRLF).
- `npm test` verde înainte de orice livrare; numele cache-ului din `sw.js` urcat
  odată cu versiunea, altfel reparația nu ajunge în browser.
- Se livrează pe `main` doar cu cuvântul lui.
