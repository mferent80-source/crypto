# Șansa take-profit-ului pe 1 h / 4 h / 24 h, verificată pe boții lui — pre-înregistrare

Scrisă pe 21.11.2026, înainte de prima notare (colectorul v101.209 nu a rulat încă; jurnalul nu are nicio notare cu `pTp`).

## De ce

Pe 21.11.2026 el a cerut în capul Tabloului „Atinge TP”, la fel ca marginea și stopul. Cifra vine din același Monte Carlo ca șansa stopului
(`GridSim.riscScurt`: `pTp` pe 1 h, 4 h, 24 h). Șansa stopului are din v100.271 un jurnal care o verifică pe boții lui; a take-profit-ului nu
avea nimic, iar bara o spune („nu e încă verificată”). Documentul ăsta fixează cum se verifică, înainte să existe date.

## Întrebarea

Când simularea zice „take-profit-ul se atinge în următoarele H ore cu șansa p”, se atinge pe boții lui în proporția p?

Ipoteza de lucru (H0): da — fiecare notare are take-profit-ul atins cu exact șansa prezisă.

## Ce se notează

- Aceeași notare ca la stop (`noteazaScurt`, jurnalul `mcScurt` din `ritmuri.json`): o notare pe (bot, orizont), ferestre fără suprapunere,
  doar din tura în care simularea a socotit botul real (nu „Reluarea arată botul oprit”, nu „ca bot pornit acum”).
- Notarea primește `pTp` și `areTp` **doar** când botul are take-profit pus (în Pionex: preț sau procent din investiție) și simularea a dat cifra.
  Botul fără take-profit nu intră: „prezis 0, atins 0” ar fi un „se potrivește” gol (aceeași regulă ca la botul fără stop).
- Notările de dinainte de v101.209 nu au `pTp` și nu intră.

## Cum se judecă

- Botul e încă pornit la capătul ferestrei ⇒ `tp = 0`.
- Botul s-a închis în fereastră cu motivul Pionex `profit_stop` ⇒ `tp = 1`. Cu `loss_stop` sau lichidare ⇒ `tp = 0`.
- Închis de el sau de Pionex (`user_cancel`, `system_cancel`) înainte de capăt ⇒ `tp = 0`, iar șansa prezisă se ia pe cât a stat deschis
  (`pExpTp = pTp × timpul deschis / orizont`) — aceeași corecție ca la stop (revizia din 29.10).
- Motiv necitit sau fereastra ratată ⇒ notarea iese din scor („necitit” / „expirat”), ca la stop.

## Cifra și verdictul

- Pe fiecare orizont: media (atins − prezis) pe notările judecate, cu intervalul pe **zile** (aceeași funcție `intervalScurt`: varianța pe zile,
  cu podeaua aruncărilor corelate în zi, ICC 0,1).
- Pragul: sub **30 de judecate** sau sub **10 zile** ⇒ „strânge date”, fără niciun cuvânt despre potrivire.
- Marja pentru „se potrivește”: ± max(3 puncte, jumătate din șansa medie prezisă) — ca la stop.
- E a treia cifră verificată de pe ecran (după stop și „sub cele mai proaste 5%”) ⇒ intervalul ei folosește cuantila pentru 0,05 / 3 pe două cozi
  (z = 2,394 în loc de 2,241). Cele două verdicte vechi rămân cum au fost pre-înregistrate; pe ansamblu, rata de alarmă falsă a celor trei
  e cel mult 2,5% + 2,5% + 1,7% = 6,7%.
- Pe ecran se spune orizontul cu cele mai multe judecate, în cuvintele verdictului: „se potrivește”, „prezice prea puțin”, „prezice prea mult”,
  „încă nedecisă”, „strânge date”.

## Simularea sub H0 (înainte de date)

`scripts/sim-h0-v100376-tp.mjs`: seturi de notări cu take-profit-ul atins exact cu șansa prezisă, cu piață comună în zi (corelația 0 / 0,3 / 0,6),
pe 10–60 de zile. Așteptarea: „prezice prea puțin” sau „prea mult” apare în cel mult ~5% din seturi. Ca informație, și cazul în care șansa
adevărată e de două ori cea prezisă (cât de des se vede).

Rezultatele rulării din 21.11.2026 (4000 de seturi pe rând, înainte de orice notare reală; sunt și la capătul scriptului):

- H0: „prea puțin” ≤ 0,4% peste tot; „prea mult” ≤ 2,3%; oricare ≤ 2,6%. Cu ~30 de judecate pe 10 zile, 45% din seturi rămân la „strânge date”.
- H1 (de două ori cât zice, corelația 0,3): „prea puțin” la 24 h 31% / 90% / 100% (cu ~42 / 150 / 600 de judecate), la 4 h 2% / 12% / 65%, la 1 h 0,1% / 0,7% / 10%.
- **Limită:** la 1 h șansele prezise sunt de ~1,5%, iar marja lui „se potrivește” e de ±3 puncte ⇒ o șansă de două ori mai mare primește
  „se potrivește” în 31% din seturi (cu ~600 de judecate). La 1 h „se potrivește” înseamnă doar „în marja de 3 puncte”; la 4 h și 24 h falsul
  „se potrivește” e 0%.

## Ce NU se face

- Nu se schimbă pragurile după ce vin datele. Orice schimbare se scrie aici, cu dată, înainte de a fi aplicată.
- Verdictul nu schimbă nimic în simulare și nu mută niciun prag al botului: e doar ce scrie sub bară.
- Cu puține notări (primele săptămâni) bara spune „strânge date”; nu se citește nimic din diferențe.

## Limite cunoscute

- Take-profit-ul în procente din investiție se declanșează la un total, nu la un preț; simularea îl urmărește pe total. Judecata se face pe motivul
  închiderii din Pionex, deci e aceeași pentru amândouă felurile.
- Un bot al cărui take-profit e mutat în mijlocul ferestrei e judecat cu șansa de la notare.
- Boții lui cu take-profit sunt mai puțini decât cei cu stop: pragul de 30 de judecate pe 10 zile poate cere săptămâni.
