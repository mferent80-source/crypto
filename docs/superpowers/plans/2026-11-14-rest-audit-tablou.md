# Restul auditului Tabloului botului (v100.340) — plan de lucru

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tot ce a rămas nefăcut după v100.339 („repară tot și fă ideile”, 14.11.2026): restul ideilor I-872 și I-875 și reparațiile lăsate.

**Architecture:** aceleași module ale paginii; un modul nou, pur, pentru regimul gridului (`public/lib/regim-grid.js`), folosit de pagină, de
scriptul de măsurare și de probă. Regulile măsurătorii (M5) sunt în jurnalul de cercetare, scrise înaintea cifrelor. Colectorul notează și
verdictul Radarului lângă nota TradingView (v101.179).

**Tech Stack:** JavaScript fără pachete (pagina), node (probe, colector, măsurătoare).

**Spec:** `AUDIT-SEVER-CLAUDE-2026-11-13.md` („Ce NU s-a făcut”) și `docs/superpowers/plans/2026-11-13-audit-tablou-reparatii.md`
(„Starea la 14.11”); regulile M5: `docs/cercetare/2026-11-13-tablou-acuratete.md`.

## Global Constraints

- Radarul doar citește și avertizează; nimic nu trimite ordine.
- Depozitul e public: fără sume din cont, fără id-uri de bot, în cod, probe, documente și commit.
- Rezultatele cu o singură zecimală (sumele mici cu zecimalele lor); română cu diacritice.
- Orice „ce urmează” pe pagină doar dacă M5 l-a dovedit după regulile scrise dinainte; altfel „nedovedit”. Fără culoare pe regim.
- „Nimic pierdut”: inventarul ecranului vechi față de cel nou, la 412 / 1280 / 2560; poze la 412 / 768 / 1920 / 2560, zi și noapte.
- O copie de lucru, un commit, o livrare — după întrebarea „livrez acum?”.

## Review Focus

1. Totalul „la prețul viu” la botul neutru (semnul poziției nesigur) și la botul fără poziție: nu se arată o cifră inventată.
2. Modelul pe niveluri când lipsește geometria (fără `row` / `perVolume`), la grid geometric și cu prețul în afara gridului: cade pe modelul
   continuu, nu pe o cifră greșită; zero-ul și ținta rămân de partea bună a prețului.
3. Simbol LSE de două litere față de trei: `LSE:BP.` și `LSE:VOD`; un simbol negăsit rămâne „—”, nu nota altei firme.
4. Colectorul fără lumânări sau cu motorul paginii neîncărcat: nota TradingView se scrie oricum, fără verdict; nicio excepție neprinsă.
5. Regimul fără ADX sau cu sub 60 de lățimi: nimic afișat, nu „lateral”.

## Sarcinile (fiecare: proba care pică întâi, apoi reparația)

- [x] F1 Simbolurile LSE de două litere: `LSE:XX.` (verificat pe scannerul public), cu `LSE:XX` ca rezervă — `functions/_shared/tv-note.js`.
- [x] F2 Cardul vechi al verdictului (`#tbVerdictCard`, mereu ascuns) scos din pagină; avertismentele vizibile își păstrează locul.
- [x] F3 Totalul botului la prețul viu, lângă ora citirii („la prețul viu ≈ …”), doar cu poziție și semn sigur.
- [x] F4 „Dacă prețul ajunge la…” / zero-ul / ținta pe nivelurile gridului (nu întinse uniform): fără jumătatea de pas pierdută (🔵 15 din audit).
- [x] F5 Jurnalul colectorului notează și verdictul Radarului (4 ore, 1 zi) lângă nota TradingView; bilanțul le judecă la fel (I-875).
- [x] F6 Regimul pentru grid pe rândul „oscilație sau trend” + perechile care ar ieși din drumul prețului (I-872), cu textul hotărât de M5. (M5: nedovedit ⇒ regimul apare ca stare de acum, „ce urmează: nedovedit”; rândurile stau sub „Cele șapte măsuri”; perechile se numără pe liniile gridului)
- [x] F7 Becul „lateral · bun pentru grid”: rămâne sau se scoate, după testul C din M5. (amendamentul din jurnal: se scoate oricum ar ieși C; scos, becul lateral e gri; piața laterală nu mai e „cu botul” și nici motiv verde în Consilier)
- [x] F8 Căderea SSH de după paza paginilor: cauza căutată în jurnalele VPS-ului; ce s-a exclus și cum se prinde data viitoare. (cauza negăsită; scris în raportul de audit, „Ce NU s-a făcut”)
- [x] F9 Probele în lanțul `npm test`; suita întreagă (362 de pași); inventarul (412 / 1280 / 2560: nimic pierdut) și pozele (412 / 768 / 1920 / 2560, zi și noapte); două revizii independente, constatările reparate cu testul întâi și verificate „pe roșu”; versiunea v100.340; un commit; întrebarea
  „livrez acum?”.
