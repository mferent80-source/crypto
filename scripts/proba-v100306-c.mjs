// Proba v100.306-c / colector v101.166 (05.11.2026, auditul final Radar + Busola - partea COLECTOR și ALERTE):
//   I-827 — la ZERO boți porniți Pionex dă lista nulă ⇒ evaluările, seara, oglinda și profitul se amânau la nesfârșit (510 „evaluari amanate”
//           pe VPS, XMR neevaluat, „Seara pe scurt” din 04.11 n-a plecat). Lista nulă + arhiva celor închiși citită întreagă + fiecare bot știut
//           pornit regăsit printre cei închiși ⇒ „zero boți porniți”, nu citire proastă.
//   I-828 — „dovedit” de la paza Busolei doar când bilanțul e socotit pe momente rărite (`perp.bilant.pe === "momente"`, Busola 1.89).
//   I-830 — nota „Busola n-a mai măsurat” stă doar în Radar NUMAI cu paznicul Busolei viu (`paznic.discord` și `paznic.la` sub 90 min).
//   I-831 — alerte mai puține: treptele de 1% doar la un extrem nou al zilei, cheia T212 pe închiderea de ieri, noaptea (23–07) treptele,
//           „% azi”, gărzile și „altă setare” doar în Radar + un singur rezumat la 08:00, „critic” o dată pe episod, bandă și pauză la etichete.
//   I-832 — textele trimit la VPS (sarcina „Crypto Radar pornire”), nu la „PC-ul de acasă” / .bat; garda le respinge.
//   node scripts/proba-v100306-c.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifica } from "./garda-texte.mjs";   // încarcă și modulele paginii (Alerte, Acasa, ActiuniSemnale, Busola…) din copia asta

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const imp = (...p) => import(pathToFileURL(path.join(RAD, ...p)).href);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ").slice(0, 700)}`); }); }
console.log("\nv100.306-c · colectorul și alertele (I-827, I-828, I-830, I-831, I-832) · proba\n");
const MIN = 60000, ORA = 3600000, ZI = 86400000;
// 05.11.2026 e iarnă: ora României = UTC+2
const RO = (zi, h, m = 0) => Date.UTC(2026, 10, zi, h - 2, m);
const SRC = citeste("scripts", "colector.mjs");
const corpFunctie = (src, nume) => { const i = src.indexOf("async function " + nume + "("); assert.ok(i >= 0, nume + " lipsește din colector"); const j = src.indexOf("\nasync function ", i + 10), k = src.indexOf("\nfunction ", i + 10); return src.slice(i, Math.min(j < 0 ? 1e9 : j, k < 0 ? 1e9 : k)); };

// ---------------- I-827: zero boți porniți ≠ citire proastă ----------------
const CO = await imp("scripts", "lib", "comportament.mjs");
const toti = (l, complet) => Object.assign(l, { complet });
await test("I-827a. listă nulă + arhiva întreagă + niciun bot știut pornit ⇒ „zero boți porniți” (ok, listă goală)", () => {
  assert.equal(typeof CO.listaPornitilor, "function", "Comportament.listaPornitilor lipsește");
  const r = CO.listaPornitilor({ bots: [], probleme: { listaNula: true } }, toti([{ strategyId: "x1", closeTime: RO(5, 11, 19) }], true), { x1: { activ: false, nume: "XMR" } });
  assert.equal(r.ok, true, r.motiv); assert.deepEqual(r.boti, []); assert.equal(r.zero, true);
});
await test("I-827b. listă nulă + botul știut pornit e printre cei închiși (închis acum 2 min) ⇒ tot „zero boți”", () => {
  const r = CO.listaPornitilor({ bots: [], probleme: { listaNula: true } }, toti([{ strategyId: "x1", closeTime: RO(5, 11, 19) }], true), { x1: { activ: true, nume: "XMR" } });
  assert.equal(r.ok, true, r.motiv); assert.equal(r.zero, true);
});
await test("I-827c. listă nulă + arhiva NEvenită ⇒ citire proastă (amânat, ca înainte)", () => {
  const r = CO.listaPornitilor({ bots: [], probleme: { listaNula: true } }, toti([], false), {});
  assert.equal(r.ok, false); assert.match(r.motiv, /arhiv/);
});
await test("I-827d. listă nulă + un bot știut pornit care NU e printre cei închiși ⇒ citire proastă (al 8-lea nu devine al 3-lea)", () => {
  const r = CO.listaPornitilor({ bots: [], probleme: { listaNula: true } }, toti([{ strategyId: "x1" }], true), { x1: { activ: false, nume: "XMR" }, y2: { activ: true, nume: "ARIA" } });
  assert.equal(r.ok, false); assert.match(r.motiv, /ARIA/);
});
await test("I-827e. lista normală trece neschimbată; răspunsul lipsă ⇒ amânat", () => {
  const b = [{ id: "1", activ: true, baza: "ONDO.PERP" }];
  assert.deepEqual(CO.listaPornitilor({ bots: b }, toti([], false), {}).boti, b);
  assert.equal(CO.listaPornitilor(null, toti([], true), {}).ok, false);
});
await test("I-827f. colectorul: evaluările și pagina Comportament trec prin listaPornitilor (nu mai tac la orice listă nulă)", () => {
  for (const f of ["turaComportament", "turaPaginaComportament"]) {
    const c = corpFunctie(SRC, f);
    assert.match(c, /Comportament\.listaPornitilor\(/, f + " nu folosește listaPornitilor");
    assert.doesNotMatch(c, /act\.probleme && act\.probleme\.listaNula/, f + " încă tace la orice listă nulă");
  }
});

// ---------------- I-828: „dovedit” doar pe momente ----------------
const B = globalThis.Busola;
const REZ = (bilant) => ({ la: RO(5, 10, 5), monede: { ARIA: { perp4h: "miscare" } }, grid: { miscare: -0.011, liniste: -0.008, oricand: -0.009 }, perp: { prag: 200000, bilant } });
await test("I-828a. bilanțul vechi (pe monede) „dovedit” ⇒ „nedovedit (socotit pe monede)”; pe momente ⇒ „dovedit”", () => {
  assert.equal(typeof B.bilantText, "function", "Busola.bilantText nu e exportată");
  assert.equal(B.bilantText(REZ({ verdict: "dovedit", dif: -0.025, monede: 70 })), "pe date noi: nedovedit (socotit pe monede)");
  assert.equal(B.bilantText(REZ({ verdict: "dovedit", dif: -0.025, monede: 70, pe: "momente" })), "pe date noi: dovedit");
  assert.equal(B.bilantText(REZ({ verdict: "pe dos", dif: 0.01, monede: 70 })), "pe date noi: nedovedit (socotit pe monede)");
  assert.equal(B.bilantText(REZ({ verdict: "n-am aflat", monede: 70 })), "pe date noi: n-am aflat");
  assert.equal(B.bilantText(REZ({ verdict: "prea puține" })), null);
});
await test("I-828b. semaforul (pentruVerdict) primește „dovedit” DOAR pe momente - altfel SemnaleBot nu mai pune „Busola” în verdict", () => {
  const v1 = B.pentruVerdict(REZ({ verdict: "dovedit", dif: -0.025, monede: 70 }), "ARIA_USDT_PERP", RO(5, 10, 30));
  assert.notEqual(v1.bilant.verdict, "dovedit");
  const v2 = B.pentruVerdict(REZ({ verdict: "dovedit", dif: -0.025, monede: 70, pe: "momente" }), "ARIA_USDT_PERP", RO(5, 10, 30));
  assert.equal(v2.bilant.verdict, "dovedit");
});
await test("I-828c. titlul de dimineață: „pe agitație dovedită” doar pe momente; colectorul îi dă verdictul cinstit (Busola.bilantVerdict)", async () => {
  const { titluDimineata } = await imp("scripts", "lib", "dimineata-titlu.mjs");
  const boti = [{ nume: "ARIA", stare: "miscare" }];
  assert.equal(typeof B.bilantVerdict, "function", "Busola.bilantVerdict lipsește");
  assert.doesNotMatch(titluDimineata({ boti, bilant: B.bilantVerdict(REZ({ verdict: "dovedit", monede: 70 })) }), /dovedit/);
  assert.match(titluDimineata({ boti, bilant: B.bilantVerdict(REZ({ verdict: "dovedit", monede: 70, pe: "momente" })) }), /agitație dovedită/);
  assert.match(SRC, /titluDimineata\(\{[^}]*bilant: Busola\.bilantVerdict\(rz\)/, "colectorul nu trece verdictul cinstit în titlu");
});

// ---------------- I-830: vocea revine după 90 de minute fără semn de la paznic ----------------
const P = await imp("scripts", "lib", "paza-boti.mjs");
const ACUM = RO(5, 12, 0), VECHI = ACUM - 3 * ORA;
const nota = (paznic) => P.notaVeche({ Busola: B, rez: Object.assign({ la: VECHI, program: B.PROGRAM_MASURARE }, paznic === undefined ? {} : { paznic }), acum: ACUM, anuntat: 0 });
await test("I-830a. paznicul Busolei viu (discord + `la` acum 30 min) ⇒ nota doar în Radar", () => {
  const n = nota({ discord: true, la: ACUM - 30 * MIN }); assert.ok(n); assert.equal(n.doarRadar, true);
});
await test("I-830b. paznicul tace de 100 min, `la` lipsă sau discord fals ⇒ nota pleacă pe Discord (vocea revine)", () => {
  for (const pz of [{ discord: true, la: ACUM - 100 * MIN }, { discord: true, la: null }, { discord: true }, { discord: false, la: ACUM - 5 * MIN }, undefined]) {
    const n = nota(pz); assert.ok(n); assert.notEqual(n.doarRadar, true, JSON.stringify(pz));
  }
});
await test("I-830c. Busola.paznicViu: pragul de 90 de minute într-un singur loc", () => {
  assert.equal(typeof B.paznicViu, "function"); assert.equal(B.PAZNIC_VIU_MS, 90 * MIN);
  assert.equal(B.paznicViu({ paznic: { discord: true, la: ACUM - 89 * MIN } }, ACUM), true);
  assert.equal(B.paznicViu({ paznic: { discord: true, la: ACUM - 91 * MIN } }, ACUM), false);
});

// ---------------- I-831: alerte mai puține ----------------
const PZ = await imp("scripts", "lib", "poza.mjs");
const POL = await imp("scripts", "lib", "politica-alerte.mjs").catch((e) => ({ __lipsa: e.message }));
const arePol = () => assert.ok(!POL.__lipsa, "scripts/lib/politica-alerte.mjs lipsește: " + POL.__lipsa);
await test("I-831a. pragurile ALESE stau numite într-un singur loc (politica-alerte.mjs) și spun că sunt alese, nu dovedite", () => {
  arePol();
  assert.equal(POL.NOAPTE_DE_LA, 23); assert.equal(POL.NOAPTE_PANA_LA, 7); assert.equal(POL.REZUMAT_NOAPTE_LA, 8);
  assert.equal(POL.PRAG_MISCARE_INTRARE, 0.55); assert.equal(POL.PRAG_MISCARE_IESIRE, 0.45); assert.equal(POL.PAUZA_ETICHETA_MS, 2 * ORA); assert.equal(POL.AGRAVARE_PP, 5);
  assert.match(citeste("scripts", "lib", "politica-alerte.mjs"), /ALESE, nu dovedite/);
});
await test("I-831b. T212: aceeași treaptă față de ACEEAȘI închidere de ieri nu se retrimite la deschiderea SUA (cheia fără ziua ședinței)", () => {
  const poza = { t212: [{ s: "STX", pret: 95, prev: 100, mediu: 90 }] }, st = {};
  const a1 = PZ.alerteT212Pasi(poza, st, RO(5, 11, 49));   // pre-market
  assert.equal(a1.length, 1); for (const k of a1[0].marcheaza) st[k] = true;
  assert.deepEqual(PZ.alerteT212Pasi(poza, st, RO(5, 16, 31)).map((a) => a.titlu), [], "a doua oară, după deschidere");
  // o închidere nouă (altă sesiune) pornește treptele de la capăt
  assert.equal(PZ.alerteT212Pasi({ t212: [{ s: "STX", pret: 90, prev: 95 }] }, st, RO(6, 16, 31)).length, 1);
});
await test("I-831c. cheile fără dată (treptele T212) se curăță după valoarea lor (ziua marcării), cele cu dată după coada cheii", () => {
  arePol();
  const st = { "t212-pas-STX-m5-100": "2026-11-01", "t212-pas-STX-m6-100": "2026-11-05", "sim-miscare-STX-2026-11-01": true, "sim-miscare-STX-2026-11-05": true };
  POL.curataChei(st, "2026-11-02");
  assert.deepEqual(Object.keys(st).sort(), ["sim-miscare-STX-2026-11-05", "t212-pas-STX-m6-100"]);
  assert.match(corpFunctie(SRC, "turaPoza"), /POL\.curataChei\(st, prag\)/, "turaPoza nu curăță prin curataChei");
});
await test("I-831d. bot ±1%: doar la un extrem NOU al zilei - du-te-vino-ul nu mai sună", () => {
  const b = (p) => ({ id: "9", baza: "ARIA.PERP", directie: "short", levier: 3, pretCurent: p, gridJos: 90, gridSus: 110 });
  const t0 = RO(5, 10, 0);
  let r = PZ.alertaBotPas(b(100), null, t0); assert.equal(r.alerta, null);
  r = PZ.alertaBotPas(b(101), r.ref, t0 + 5 * MIN); assert.ok(r.alerta, "+1% = maxim nou"); assert.match(r.alerta.titlu, /\+1,0% în 5 min/);
  r = PZ.alertaBotPas(b(100), r.ref, t0 + 10 * MIN); assert.equal(r.alerta, null, "întoarcerea la 100 nu e un extrem nou");
  r = PZ.alertaBotPas(b(101.5), r.ref, t0 + 15 * MIN); assert.equal(r.alerta, null, "101,5 nu e cu 1% peste maximul anunțat");
  r = PZ.alertaBotPas(b(102.02), r.ref, t0 + 20 * MIN); assert.ok(r.alerta, "102,02 = încă o treaptă sus");
  r = PZ.alertaBotPas(b(99), r.ref, t0 + 30 * MIN); assert.ok(r.alerta, "99 = minim nou (1% sub deschiderea zilei)"); assert.match(r.alerta.titlu, /−/);
  // ziua nouă: extremele pornesc de la prima citire, fără alertă
  r = PZ.alertaBotPas(b(97), r.ref, RO(6, 0, 5)); assert.equal(r.alerta, null, "prima citire a zilei doar fixează");
  r = PZ.alertaBotPas(b(96), r.ref, RO(6, 0, 20)); assert.ok(r.alerta);
});
await test("I-831e. noaptea (23–07): treptele, „% azi”, gărzile, „altă setare” doar în Radar; lichidarea, stopul, boții nevăzuți și orice critic pleacă", () => {
  arePol();
  const n = RO(5, 23, 30), z = RO(5, 22, 0), d = RO(6, 6, 59), di = RO(6, 7, 0);
  const pol = (m, cheie, t) => POL.politicaNoapte(m, cheie, t);
  for (const [m, k] of [[{ nivel: "info", titlu: "STX: −5% azi" }, "t212-pas-STX-m5-100"], [{ nivel: "info", titlu: "ARIA (short 3×): +1,0% în 5 min" }, "bot-pas-9"],
    [{ nivel: "atentie", titlu: "WDC: −6,2% azi, de 2,1× mișcarea lui obișnuită" }, "sim-miscare-WDC-2026-11-05"], [{ nivel: "atentie", titlu: "Gardă încălcată: Contul se mișcă sub 15 % pe an" }, "garda-volatilitate"],
    [{ nivel: "info", titlu: "🌙 ARIA: altă setare, verificată pe drumuri noi" }, "noapte-variante"], [{ nivel: "atentie", titlu: "MU: scade −4,1% azi" }, "miscare-MU"]]) {
    assert.equal(pol(m, k, n).doarRadar, true, k + " la 23:30"); assert.equal(pol(m, k, n).noapte, true);
    assert.equal(pol(m, k, d).doarRadar, true, k + " la 06:59");
    assert.notEqual(pol(m, k, z).doarRadar, true, k + " la 22:00"); assert.notEqual(pol(m, k, di).doarRadar, true, k + " la 07:00");
  }
  for (const [m, k] of [[{ nivel: "critic", titlu: "ARIA: lichidarea la 6,2%" }, "lich"], [{ nivel: "critic", titlu: "STX: stopul din planul tău e atins ($80,00)" }, "t212-STX_US_EQ-stop-2026-11-05"],
    [{ nivel: "critic", titlu: "Crypto Radar nu-ți mai vede boții" }, null], [{ nivel: "critic", titlu: "BE: −16% de la maxim, pragul din planul tău" }, "t212-BE_US_EQ-trail0-2026-11-05"]])
    assert.notEqual(pol(m, k, n).doarRadar, true, (k || m.titlu) + " trebuie să plece noaptea");
});
await test("I-831f. ce a stat noaptea în Radar pleacă într-un SINGUR mesaj de la 08:00 (titlu ≤ 60, 2 rânduri, garda)", () => {
  arePol();
  const st = {};
  POL.noteazaNoapte(st, { titlu: "STX: −5% azi" }, "t212-pas-STX-m5-100", RO(5, 23, 40));
  POL.noteazaNoapte(st, { titlu: "WDC: −6% azi" }, "t212-pas-WDC-m6-100", RO(6, 1, 0));
  POL.noteazaNoapte(st, { titlu: "Gardă încălcată: Contul se mișcă sub 15 % pe an" }, "garda-volatilitate", RO(6, 3, 0));
  assert.equal(POL.rezumatNoapte(st, RO(6, 7, 30)), null, "înainte de 8 nu pleacă");
  const m = POL.rezumatNoapte(st, RO(6, 8, 1));
  assert.ok(m, "la 08:01 pleacă"); assert.ok(m.titlu.length <= 60, m.titlu); assert.match(m.titlu, /3 alerte/);
  assert.deepEqual(verifica(m.titlu, "alertaTitlu"), []); assert.deepEqual(verifica(m.mesaj, "alertaMesaj"), [], m.mesaj);
  assert.match(m.mesaj, /STX/); assert.match(m.mesaj, /gard/);
  POL.golesteNoapte(st); assert.equal(POL.rezumatNoapte(st, RO(6, 8, 30)), null, "o singură dată");
});
await test("I-831g. colectorul: trimiteAlerta trece prin politica de noapte și notează ce a ținut; rezumatul nopții e chemat în buclă", () => {
  const c = corpFunctie(SRC, "trimiteAlerta");
  assert.match(c, /POL\.politicaNoapte\(/); assert.match(c, /POL\.noteazaNoapte\(/);
  assert.match(SRC, /turaRezumatNoapte\(\)/);
});
await test("I-831h. „−15% de la maxim”: critic o dată pe episod, apoi doar la −20 / −25 (altfel atenție); revenirea închide episodul", async () => {
  arePol();
  let ep = null, r = POL.episodTrail(ep, 0.16, 15); assert.equal(r.nivel, "critic"); ep = { treapta: r.treapta };
  r = POL.episodTrail(ep, 0.17, 15); assert.equal(r.nivel, "atentie");
  r = POL.episodTrail(ep, 0.205, 15); assert.equal(r.nivel, "critic"); ep = { treapta: r.treapta };
  r = POL.episodTrail(ep, 0.19, 15); assert.equal(r.nivel, "atentie");
  r = POL.episodTrail(ep, 0.251, 15); assert.equal(r.nivel, "critic");
  // tura planurilor, două zile la rând cu aceeași coborâre: ziua 2 pleacă „atenție”; o agravare în aceeași zi pleacă din nou (critic)
  const { turaPlanuri } = await imp("scripts", "lib", "tura-t212.mjs");
  const AS = globalThis.ActiuniSemnale, T212 = { simbol: (t) => String(t).replace(/_US_EQ$/, "") }, trimise = [], stare = {}, episoade = {};
  let pret = 84;   // maxim 100 ⇒ −16%
  const d = (acum) => ({ acum, cerePozitii: async () => [{ ticker: "BE_US_EQ", quantity: 3, averagePrice: 70, currentPrice: pret, initialFillDate: "2026-09-01T10:00:00Z" }],
    cerePlan: async () => ({ trailPct: 15 }), cereBare: async () => [{ t: Date.UTC(2026, 9, 1), h: 100, l: 90, c: 95 }], trimite: async (m, k) => { trimise.push({ nivel: m.nivel, k }); return true; },
    stare, episoade, ActiuniSemnale: AS, T212, jurnal: () => {} });
  await turaPlanuri(d(RO(5, 17, 0))); assert.deepEqual(trimise.map((x) => x.nivel), ["critic"]);
  await turaPlanuri(d(RO(5, 17, 5))); assert.equal(trimise.length, 1, "aceeași zi, aceeași treaptă: nimic");
  await turaPlanuri(d(RO(6, 17, 0))); assert.deepEqual(trimise.map((x) => x.nivel), ["critic", "atentie"], "ziua 2: atenție");
  pret = 79; await turaPlanuri(d(RO(6, 17, 10))); assert.deepEqual(trimise.map((x) => x.nivel), ["critic", "atentie", "critic"], "−21%: agravare ⇒ critic");
  pret = 95; await turaPlanuri(d(RO(6, 18, 0))); assert.equal(episoade["BE_US_EQ"], undefined, "revenirea peste prag închide episodul");
});
await test("I-831i. „Crypto: liniște ⇄ mișcare”: bandă 0,45 / 0,55 și cel puțin 2 h între două schimbări", () => {
  arePol();
  const A = globalThis.Alerte, AC = globalThis.Acasa;
  const cl = (ev, n) => ({ evita: ev, candidati: n - ev, dir: { long: 30, short: 30, neutru: 40 } });
  const v = (ev, btc) => AC.vreme({ clasament: cl(ev, 100), btc: { miscare: !!btc }, fg: 50 });
  const banda = POL.bandaVreme();
  let t = RO(5, 9, 0), st = A.schimbareVreme(null, { crypto: v(60) }, t, banda).stare;   // pornește pe „mișcare” (0,60)
  const pas = (ev, dt, btc) => { t += dt; const r = A.schimbareVreme(st, { crypto: v(ev, btc) }, t, banda); st = r.stare; return r.mesaje.filter((m) => m.cheie === "vreme-crypto"); };
  assert.deepEqual(pas(48, 10 * MIN), []); assert.deepEqual(pas(48, 10 * MIN), [], "0,48 e în bandă: rămâne mișcare");
  assert.deepEqual(pas(40, 10 * MIN), []); const m1 = pas(40, 10 * MIN); assert.equal(m1.length, 1, "0,40 confirmat de două ori ⇒ iese din mișcare"); assert.doesNotMatch(m1[0].titlu, /mișcare/);
  assert.deepEqual(pas(52, 10 * MIN), []); assert.deepEqual(pas(52, 10 * MIN), [], "0,52 nu intră în mișcare (pragul 0,55)");
  assert.deepEqual(pas(70, 10 * MIN), []); assert.deepEqual(pas(70, 10 * MIN), [], "0,70 confirmat, dar la 40 min după schimbare: așteaptă 2 h");
  t += 2 * ORA; const m2 = pas(70, 0); assert.equal(m2.length, 1, "după 2 h pleacă"); assert.match(m2[0].titlu, /mișcare/);
  // fără bandă (pagina, garda): ca înainte
  const r0 = A.schimbareVreme(A.schimbareVreme(A.schimbareVreme(null, { crypto: v(10) }, RO(5, 9, 0)).stare, { crypto: v(52) }, RO(5, 9, 10)).stare, { crypto: v(52) }, RO(5, 9, 20));
  assert.equal(r0.mesaje.length, 1);
});
await test("I-831j. Monte Carlo pe bot: cel puțin 2 h între două anunțuri (pauza din politica-alerte, nu 1 h)", () => {
  const s = citeste("scripts", "lib", "tura-monte-carlo-bot.mjs");
  assert.match(s, /PAUZA_ANUNT_MS = PAUZA_ETICHETA_MS/); assert.match(s, /from "\.\/politica-alerte\.mjs"/);
});

// ---------------- I-832: textele trimit la VPS ----------------
const U = await imp("scripts", "lib", "unde-ruleaza.mjs");
const MC = await imp("scripts", "lib", "mesaje-colector.mjs");
const { mesajDiscord } = await imp("scripts", "lib", "canal-discord.mjs");
const curat = (m, ce) => { for (const t of [m.titlu, m.mesaj]) assert.deepEqual(U.abateriUnde(t), [], ce + ": " + t); };
await test("I-832a. garda: „PC-ul de acasă”, „serverul de acasă” și „.bat” sunt respinse în alerte (și de garda textelor)", () => {
  assert.ok(U.abateriUnde("Aș porni PORNESTE-CRYPTO-RADAR.bat").length); assert.ok(U.abateriUnde("Ultimul semn de la PC-ul de acasă: 10:00").length);
  assert.ok(U.abateriUnde("Crypto Radar oprit: serverul de acasă nu mai răspunde").length);
  assert.ok(verifica("Aș porni PORNESTE-CRYPTO-RADAR.bat", "alertaMesaj").some((a) => /\.bat/.test(a)), "garda-texte nu respinge .bat în alerte");
  assert.ok(verifica("Crypto Radar oprit: serverul de acasă nu mai răspunde", "alertaTitlu").some((a) => /acasă/.test(a)), "garda-texte nu respinge „de acasă” în titlu");
});
await test("I-832b. mesajele colectorului (server oprit / revenit, parola respinsă, T212, Busola) trimit la VPS, din constanta comună", () => {
  for (const [m, ce] of [[MC.serverOprit(20), "serverOprit"], [MC.serverRevenit(), "serverRevenit"], [MC.authRespins(5, "AUTH_INVALID"), "authRespins"], [MC.t212Rau(12, 401, "x"), "t212Rau"], [MC.busolaVeche(3, 1.8, null, false), "busolaVeche"]]) {
    curat(m, ce); assert.ok(m.titlu.length <= 60, ce + " titlu " + m.titlu.length);
    for (const a of verifica(m.titlu, "alertaTitlu").concat(verifica(m.mesaj, "alertaMesaj"))) assert.fail(ce + ": " + a + " · " + m.mesaj);
  }
  assert.match(MC.serverOprit(20).mesaj, /schtasks \/Run \/TN "Crypto Radar pornire"/);
  assert.match(citeste("scripts", "lib", "mesaje-colector.mjs"), /from "\.\/unde-ruleaza\.mjs"/);
});
await test("I-832c. subsolul Discord nu mai spune „colectorul de acasă”", () => {
  const d = mesajDiscord({ nivel: "info", titlu: "x", mesaj: "y" });
  assert.deepEqual(U.abateriUnde(d.embeds[0].footer.text), [], d.embeds[0].footer.text); assert.match(d.embeds[0].footer.text, /VPS/);
});
await test("I-832d. paznicul de pe Cloudflare: „colectorul tace / alertele stau / a revenit” trimit la VPS, nu la PC și .bat", async () => {
  const W = await imp("paznic", "worker.mjs");
  const mediu = () => { const kv = new Map(); return { kv, env: { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1/abc", PAZNIC_TOKEN: "t".repeat(32) } }; };
  const trimise = [], f = async (u, o) => { trimise.push(JSON.parse(o.body)); return new Response("{}", { status: 200 }); };
  const T0 = RO(5, 12, 0);
  // (1) colectorul tace de 45 min, apoi bate iar ⇒ „tace” + „a revenit”
  const a = mediu(); await W.bataie(a.env, { pid: 1, versiune: "v101.166" }, T0, f); await W.verifica(a.env, T0 + 45 * MIN, f); await W.bataie(a.env, { pid: 2 }, T0 + 50 * MIN, f);
  // (2) poza vine, bucla alertelor stă de 40 min ⇒ „alertele stau”; apoi poza curge iar ⇒ „a revenit” (din cron)
  const b = mediu(); b.kv.set("stare", JSON.stringify({ la: T0 - 40 * MIN })); b.kv.set("poza", JSON.stringify({ la: T0 - MIN, turaLa: T0 - 40 * MIN }));
  await W.verifica(b.env, T0, f); b.kv.set("poza", JSON.stringify({ la: T0 + 10 * MIN, turaLa: T0 + 10 * MIN })); await W.verifica(b.env, T0 + 11 * MIN, f);
  assert.ok(trimise.length >= 4, "paznicul a trimis doar " + trimise.length + " mesaje din 4");
  for (const x of trimise) { const e = x.embeds && x.embeds[0] || {}; for (const t of [x.content, e.title, e.description]) assert.deepEqual(U.abateriUnde(t), [], t); }
  assert.ok(trimise.some((x) => /schtasks/.test(JSON.stringify(x))), "niciun mesaj nu spune ce rulez pe VPS");
  assert.match(citeste("paznic", "worker.mjs"), /from "\.\.\/scripts\/lib\/unde-ruleaza\.mjs"/);
});

console.log(`\n${picate ? "PICA" : "PASS"} · ${teste - picate} din ${teste}\n`);
if (picate) process.exitCode = 1;
