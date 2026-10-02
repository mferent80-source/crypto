// Proba v100.70 - reparatiile din revizia Opus a pachetului 3 (alertele si Discord): o singura voce cu semaforul (lichidarea depasita,
// BTC, aglomerarea), frana fara dubluri, textele reale (vremea, pornirea, funding-ul, mutarea gridului, „n-are plan”) in limite,
// „un rând, nu două” cu semaforul real, cifra miscarii = cea care a declansat, informatiile pierdute la grid-plan si SL/TP, botii short.
//   node scripts/proba-v10070.mjs
import "./lib/text-ro-global.mjs";   // RF4 (v100.61): TextRo inaintea semnale-bot.js / consiliu.js
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { situatii, verifica, STRICT } from "./garda-texte.mjs";   // incarca modulele paginii (Alerte, Sfaturi, SemnaleBot, TabloExtra, …)
import * as MC from "./lib/mesaje-colector.mjs";
import { alerteSLTP } from "./lib/poza.mjs";
import { mesajPornire } from "./lib/tura-pornire.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const [f, g] of [["obiceiuri.js", "Obiceiuri"], ["acasa.js", "Acasa"]]) if (!globalThis[g]) vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"), { filename: f });
const { Alerte: A, Sfaturi: SF, SemnaleBot: S, TabloExtra: TE, Obiceiuri: OB, Acasa: AC } = globalThis;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const T0 = Date.UTC(2026, 9, 2, 13, 0), ORA = 3600000, ZI = 86400000;
const PERS = /^(Aș|N-aș|L-aș|Le-aș|O-aș|M-aș|Nu m-aș)\s/;
const rand = (m, i) => String(m || "").split("\n")[i] || "";
const CRV = (o) => Object.assign({ baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, profitTotal: -3.2, pretCurent: 0.3858, gridJos: 0.3841, gridSus: 0.4331,
  distantaLichidarePct: 30, pretLichidare: 0.3383, gridProfitBrut: 3.2, pornitLa: T0 - 4 * ZI }, o || {});
const faraAb = (t, tip, cine) => { const ab = verifica(t, tip); assert.deepEqual(ab, [], (cine || "") + ": " + ab.join("; ") + " — " + t); };

console.log("Proba v100.70 · reparațiile reviziei pachetului 3 (alertele și Discord)");

await test("1. lichidarea estimată depășită: alerta și sfatul „pericol” spun acțiunea semaforului (o voce), nu „aș adăuga marjă”", () => {
  const b = CRV({ lichidareDepasita: true, pretCurent: 0.3301, distantaLichidarePct: -2.4 });
  const sm = S.semafor({ bot: b, fisa: null }), comp = sm.componente.find((c) => c.cod === "lichidare");
  assert.ok(comp && /închide/.test(comp.faCe), "semaforul: " + JSON.stringify(comp));
  const a = A.reguli(b, null, {}).lich;
  assert.equal(rand(a.mesaj, 1), "👉 " + comp.faCe, "alerta: " + a.mesaj);
  const sf = SF.sfaturi(SF.intrare({ bot: b, k4: null, fisa: null, acum: T0 })).find((s) => s.cod === "pericol" && s.tip === "lich");
  assert.ok(sf, "sfatul pericol lipsește"); assert.equal(sf.faCe, comp.faCe, "sfatul: " + sf.faCe);
  // sub 8% (nedepășită) rămâne „Aș adăuga marjă sau aș închide botul acum.” - și semaforul o spune
  const b6 = CRV({ distantaLichidarePct: 6.2, pretLichidare: 0.362 }), c6 = S.semafor({ bot: b6, fisa: null }).componente.find((c) => c.cod === "lichidare");
  assert.equal(rand(A.reguli(b6, null, {}).lich.mesaj, 1), "👉 " + c6.faCe);
});

await test("2. BTC contra botului: „aș fi gata să închid” (sensul vechi), nu „aș închide”; aglomerarea: acțiunea semaforului + semnele reale ≤ 160", () => {
  const mb = { k: "btc", eticheta: "BTC", ton: "rau", text: "↓ coboară pe 4h · mișcare (2,3×)" };
  const r = A.reguli(CRV(), { mediu: [mb] }, {})["m-btc"], l2 = rand(r.mesaj, 1);
  assert.match(l2, /aș fi gata să închid botul/, l2); assert.doesNotMatch(l2, /la o mișcare mare a lui aș închide/); faraAb(l2.replace(/^👉 /, ""), "faCe", "m-btc");
  const fut = { funding: 0.0006, longShort: 2.15, oiHist5m: [{ sumOpenInterest: 1000 }, { sumOpenInterest: 1182 }] }, ag = S.aglomerare(fut, "long");
  assert.ok(ag && ag.nivel === "atentie", "fixtura reală: " + JSON.stringify(ag));
  const comp = S.semafor({ bot: CRV(), fisa: null, aglomerare: ag }).componente.find((c) => c.cod === "aglomerare");
  const al = A.reguli(CRV(), { semnale: { semafor: { nivel: "atentie" }, aglomerare: ag } }, {})["s-aglomerare"];
  assert.equal(rand(al.mesaj, 1), "👉 " + comp.faCe, al.mesaj); faraAb(rand(al.mesaj, 0), "deCe", "aglomerarea, rândul 1"); assert.match(rand(al.mesaj, 0), /open interest/);
});

await test("3. frâna contului: din cifrele reale ale Obiceiuri.frana - titlul o dată, acțiunea o dată, virgulă; colectorul trimite obiectul", () => {
  const tr = [{ inchis: T0 - 2 * ORA, net: -12.05 }, { inchis: T0 - 3 * ORA, net: -12.05 }, { inchis: T0 - 3 * ZI, net: -40 }];
  const f = OB.frana({ trades: tr, acum: T0 }); assert.ok(f.activa, "fixtura: frâna trebuie să fie activă: " + JSON.stringify(f.depasit));
  const m = MC.frana(f), l = m.mesaj.split("\n");
  assert.equal(l.length, 2, m.mesaj); assert.doesNotMatch(m.mesaj, /Frâna contului/, "titlul repetat în mesaj"); assert.equal((m.mesaj.match(/N-aș mai porni boți azi/g) || []).length, 1, m.mesaj);
  assert.doesNotMatch(m.mesaj, /\d\.\d+ USDT/, "zecimală cu punct: " + m.mesaj); assert.match(l[0], /−24,10 USDT/); faraAb(l[0], "deCe", "frâna, rândul 1");
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), /MesajeColector\.frana\(f\)/, "colectorul trimite încă f.text");
});

await test("4a. vremea pieței (Acasa.vreme / vremeBursa reale): titlul fără majuscule de strigat, acțiunea ≤ 110 la persoana I, chiar și cu lăcomie ≥ 70", () => {
  const v1 = AC.vreme({ clasament: { evita: 60, candidati: 40, dir: { long: 70, short: 20, neutru: 10 } }, btc: { miscare: false }, fg: 78 });
  const v0 = AC.vreme({ clasament: { evita: 10, candidati: 90, dir: { long: 50, short: 40, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
  let st = A.schimbareVreme(null, { crypto: v0 }, T0).stare; st = A.schimbareVreme(st, { crypto: v1 }, T0).stare;
  const m = A.schimbareVreme(st, { crypto: v1 }, T0).mesaje.find((x) => x.cheie === "vreme-crypto");
  assert.ok(m, "alerta vremii n-a plecat"); faraAb(m.titlu, "alertaTitlu", "titlul vremii"); faraAb(m.mesaj, "alertaMesaj", "mesajul vremii");
  for (const o of [{ qqq: Array.from({ length: 260 }, (_, i) => 100 + i * 0.2), vix: 16, ndx: { e50: 40, n: 100 } }, { qqq: Array.from({ length: 260 }, (_, i) => 100 + 3 * Math.sin(i / 9)), vix: 22, ndx: { e50: 50, n: 100 } }]) {
    const vb = AC.vremeBursa(Object.assign({}, o, { qqq: o.qqq.map((c) => ({ c })) })); if (vb.faCe) faraAb(vb.faCe, "faCe", "vremea bursei " + vb.nivel);
  }
});

await test("4b. pornirea (istoricMoneda + subOOra reale): faptul într-o frază ≤ 160, cu virgulă, cu cifrele (boți, pe plus, net, cel mai rău, prima oră)", () => {
  const tr = Array.from({ length: 12 }, (_, i) => ({ moneda: "LIGHTER", rezultat: i < 7 ? 1.5 : i === 7 ? -40.12 : -6.1, net: i < 7 ? 1.5 : i === 7 ? -40.12 : -6.1, inchis: T0 - (20 - i) * ZI, durataOre: 30 }))
    .concat(Array.from({ length: 48 }, (_, i) => ({ moneda: "X" + (i % 5), rezultat: i % 3 ? -0.4 : 0.2, net: i % 3 ? -0.4 : 0.2, comisioane: -0.17, inchis: T0 - (30 - i % 30) * ZI, durataOre: 0.5 })));
  const im = OB.istoricMoneda(tr, "LIGHTER"), sub = OB.subOOra(tr); assert.ok(im.avertizare && sub, "fixtura: " + JSON.stringify({ im: im.avertizare, sub: !!sub }));
  const m = mesajPornire({ id: "b1" }, "LIGHTER", im, sub, "LIT", "https://mau.tail9144fe.ts.net:8443/#ecran=gridset&moneda=LIT"), l1 = rand(m.mesaj, 0);
  faraAb(m.mesaj, "alertaMesaj", "pornirea"); for (const x of ["12", "7 pe plus", "−", "48"]) assert.ok(l1.includes(x), x + ": " + l1); assert.doesNotMatch(l1, /\d\.\d+ USDT/);
});

await test("4c. funding-ul mult peste obicei la un bot SHORT: rândul 1 ≤ 160 și riscul e o urcare bruscă, nu o cădere", () => {
  const mf = { k: "funding", ton: "atentie", text: "−0,060% la 8h · plătesc short (tu plătești) · 6× față de obicei · botul: −0,85 USDT pe zi" };
  const r = A.reguli(CRV({ directie: "short" }), { mediu: [mf] }, {})["m-funding"];
  faraAb(r.mesaj, "alertaMesaj", "funding short"); assert.match(rand(r.mesaj, 0), /urcări bruște|urcare bruscă/); assert.doesNotMatch(r.mesaj, /căder/);
  const rl = A.reguli(CRV(), { mediu: [Object.assign({}, mf, { text: "0,060% la 8h · plătesc long (tu plătești) · 6× față de obicei · botul: −0,85 USDT pe zi" })] }, {})["m-funding"];
  assert.match(rand(rl.mesaj, 0), /căderi bruște|cădere bruscă/);
});

await test("4d. „mută gridul” cu motivul real: titlul ≤ 60 fără cifră tăiată, poziția în interval și pragul pe rândul 1", () => {
  const f = { setare: { jos: 0.37, sus: 0.40, grile: 6, levier: 5 }, treceriZi: 6 };
  const mu = S.mutaGridul(CRV({ pretCurent: 0.3846 }), f, 0, null); assert.ok(mu && mu.motiv, "fixtura: mutaGridul n-a dat motiv");
  const r = A.reguli(CRV({ pretCurent: 0.3846 }), { semnale: { semafor: { nivel: "atentie" }, muta: mu } }, {})["s-muta"];
  faraAb(r.titlu, "alertaTitlu", "titlul"); assert.doesNotMatch(r.titlu, /…/, "titlul e tăiat: " + r.titlu); assert.match(r.titlu, /\d,\d%|\d%/);
  faraAb(r.mesaj, "alertaMesaj", "mesajul"); assert.match(rand(r.mesaj, 0), /din interval/);
});

await test("4e. „n-are plan” cu nota reală (TabloExtra.propunePlan): fără „Propun … propunerea mea”, „12 h afară din grid” o dată", () => {
  const pp = TE.propunePlan(null, 50); assert.ok(pp && /propunerea mea/.test(pp.nota), "fixtura: " + JSON.stringify(pp));
  const m = MC.faraPlan("CRV", pp);
  assert.doesNotMatch(m.mesaj, /propunerea mea/); assert.equal((m.mesaj.match(/afară din grid/g) || []).length, 1, m.mesaj); assert.match(m.mesaj, /din investiție/); faraAb(m.mesaj, "alertaMesaj", "n-are plan");
});

await test("4f. garda: majusculele cu diacritice („DEPĂȘITĂ”, „MIȘCARE”, „FRICĂ”) sunt prinse; generatorul cheamă producătorii reali", () => {
  for (const t of ["CRV: lichidarea e DEPĂȘITĂ", "Crypto: 🔴 MIȘCARE", "Nasdaq: 🔴 FRICĂ PE BURSĂ"]) assert.ok(verifica(t, "alertaTitlu").some((a) => /strigat/.test(a)), "nu prinde: " + t);
  const g = fs.readFileSync(path.join(RAD, "scripts", "lib", "garda-alerte.mjs"), "utf8");
  for (const p of ["SemnaleBot.aglomerare(", "Obiceiuri.frana(", "Obiceiuri.istoricMoneda(", "Acasa.vreme(", "SemnaleBot.mutaGridul(", "propunePlan("]) assert.ok(g.includes(p) || g.includes(p.replace(/^\w+\./, "")), "generatorul nu cheamă " + p);
  const rele = situatii().filter((x) => STRICT.has(x.mod)).map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((r) => r.ab.length);
  assert.equal(rele.length, 0, rele.slice(0, 6).map((r) => r.x.sit + " · " + r.x.sursa + ": " + r.ab.join("; ")).join("\n"));
});

await test("5. „un rând, nu două”: „semafor roșu” e „CRV: semafor roșu — …” și se unește cu rândul faptului lui (lichidarea la 6,2%)", () => {
  const b = CRV({ distantaLichidarePct: 6.2, pretLichidare: 0.362 }), sem = S.semafor({ bot: b, fisa: null });
  const r = A.reguli(b, { semnale: { semafor: sem } }, {});
  assert.match(r["s-iesi"].titlu, /^CRV: semafor roșu — /, r["s-iesi"].titlu);
  const al = Object.keys(r).filter((k) => r[k] && r[k].titlu && (r[k].nivel === "critic" || r[k].nivel === "atentie")).map((k, i) => ({ t: T0 - (5 - i) * 60000, nivel: r[k].nivel, titlu: r[k].titlu, mesaj: r[k].mesaj }));
  assert.ok(al.length >= 2, "fixtura: " + al.map((x) => x.titlu).join(" | "));
  const rows = TE.ceAiDeFacut({ acum: T0, dateLa: T0, sfaturi: [], avertismente: [], alerte: al, planGol: false }).filter((x) => /lichidarea/i.test(x.titlu));
  assert.equal(rows.length, 1, rows.map((x) => x.titlu).join(" | "));
});

await test("6. mișcarea: cifra din titlu e cea care a declanșat (maximul, cu fereastra lui) - alerta și sfatul", () => {
  const ctx = { regim: { r4h: 1.1, r24h: 2.6, miscare: true, sens: "coboara" } };
  const m = A.reguli(CRV(), ctx, {}).miscare; assert.match(m.titlu, /2,6× pe 24 h/, m.titlu); assert.match(rand(m.mesaj, 0), /4 h e 1,1×/, m.mesaj);
  const sf = SF.sfaturi(Object.assign(SF.intrare({ bot: CRV(), k4: null, fisa: { dir: "long", regim: ctx.regim, liniste: { linisteAcum: false } }, acum: T0 }), {})).find((s) => s.cod === "miscare");
  assert.ok(sf, "sfatul mișcării lipsește"); assert.match(sf.titlu, /2,6× obișnuitul pe 24 h/, sf.titlu);
});

await test("7. informațiile pierdute: grid-plan („nici la levier mai mic”, „pe același grid”, „de preț”, „dincolo nu lucrează”), SL/TP („decizia e a ta”, „dacă intru”)", () => {
  const b = CRV({ opritorPierdere: 0.379, opritorPierdereActiv: true, brut: { buOrderData: { row: 7 } } });
  // forma din TabloExtra.planStare: plan.minus = {prag, laOpritor, opritorPlan, laMargine, iesire, ampZi, levierPotrivit}
  const gp = (lv) => A.reguli(b, { plan: { atins: [], minus: { prag: 4, laOpritor: -3.6, opritorPlan: 0.379, laMargine: -9.5, iesire: 0.02, ampZi: 0.05, levierPotrivit: lv } } }, {})["grid-plan"];
  const cu = gp({ levier: 3, laMargine: -5.6, iesire: 0.035 }), fara = gp(null);
  assert.ok(cu && cu.nivel === "atentie", "fixtura grid-plan: " + JSON.stringify(cu));
  assert.match(rand(cu.mesaj, 1), /același grid/); assert.match(rand(cu.mesaj, 1), /de preț/); assert.match(rand(cu.mesaj, 0), /de preț/); assert.match(rand(cu.mesaj, 0), /dincolo/);
  assert.match(rand(fara.mesaj, 1), /nici la levier mai mic/, fara.mesaj); faraAb(cu.mesaj, "alertaMesaj", "grid-plan cu levier"); faraAb(fara.mesaj, "alertaMesaj", "grid-plan fără levier");
  const pz = { simboluri: [{ s: "INTC", moneda: "$", pret: 19.9, sugestie: { intrare: { pret: 20 }, stop: 18.5, tinta: 23, proba: { medie: 0.012, pePlus: 0.55, n: 40 }, marime: { bucati: 3.6238, suma: 1870, risc: 289, plafonat: false } } }] };
  const sl = alerteSLTP(pz, T0).find((x) => /^sltp-intrare-/.test(x.cheie));
  assert.match(rand(sl.mesaj, 1), /decizia e a ta/); assert.match(rand(sl.mesaj, 1), /dacă intru/); assert.doesNotMatch(sl.mesaj, /Aș cumpăra cel mult/);
});

await test("8. boții SHORT: „o urcare bruscă” la stopul stins, „plină pe creștere” lângă marginea de sus, nimic „plin” lângă cea de jos", () => {
  const s = (o) => CRV(Object.assign({ directie: "short", pretLichidare: 0.45, distantaLichidarePct: 30 }, o));
  const PL = (op) => ({ plan: { atins: [], minus: { prag: 4, laOpritor: null, opritorPlan: op } } });
  const ps = A.reguli(s({ opritorPierdere: 0.42, opritorPierdereActiv: false }), PL(0.40), {})["plan-stop"];
  assert.ok(ps, "fixtura plan-stop"); assert.match(rand(ps.mesaj, 0), /urcare bruscă/); assert.doesNotMatch(ps.mesaj, /cădere/);
  const sus = A.reguli(s({ pretCurent: 0.4320 }), null, {})["p-margine"], jos = A.reguli(s({ pretCurent: 0.3843 }), null, {})["p-margine"];
  assert.match(rand(sus.mesaj, 0), /plină pe creștere/, sus.mesaj); assert.doesNotMatch(jos.mesaj, /plină/, jos.mesaj);
  const lj = A.reguli(CRV({ pretCurent: 0.3843 }), null, {})["p-margine"]; assert.match(rand(lj.mesaj, 0), /plină pe scădere/);
  assert.match(rand(A.reguli(CRV({ pretLichidare: 0.33 }), PL(0.37), {})["plan-stop"].mesaj, 0), /cădere bruscă/);
});

await test("9. probele slabe întărite: proba-sltp verifică forma nouă (nu „Cât cumpăr”), cu-botul-v963 nu mai acceptă „închid”", () => {
  const sl = fs.readFileSync(path.join(RAD, "scripts", "proba-sltp.mjs"), "utf8"), cb = fs.readFileSync(path.join(RAD, "scripts", "cu-botul-v963.mjs"), "utf8");
  assert.doesNotMatch(sl, /doesNotMatch\(fara\.mesaj, \/Cât cumpăr\//, "proba-sltp:129 tot pe „Cât cumpăr” (nu mai apare niciodată)");
  assert.match(cb, /doesNotMatch\(cu\.mesaj, \/[^/]*închid/, "cu-botul-v963:75 nu verifică „închid”");
});

console.log("\n" + (pica ? "V100.70 PICA · " + pica + " din " + (ok + pica) : "V100.70 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
