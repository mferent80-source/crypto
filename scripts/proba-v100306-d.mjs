// Proba v100.306-d (05.11.2026, la unirea auditului final — ce a rămas după cei trei agenți):
//   1. Laboratorul gridului (GridLaborator.testNet / compara, „dovedit” pe bani): permutarea etichetelor ÎN fiecare bloc socotea blocurile
//      independente. Cu eticheta ținută de aceeași monedă bloc după bloc și netul legat de monedă (o monedă volatilă iese mereu altfel), pe
//      lumi FĂRĂ efect ieșea „dovedit” în 15–50 % din lumi (scratchpad lab-marime.mjs). Acum: aceeași statistică, varianța pe DOUĂ căi
//      (monede + blocuri), ca Verdicte.comparaPeZi din v100.306 ⇒ mărimea sub H0 ≤ 6 %, iar un efect adevărat se vede în continuare.
//   2. „n-am aflat” (Reveniri.eticheta din v100.306) trecea prin server doar dacă era în lista veche („mai bine / mai slab / cam la fel”) ⇒
//      pe ecran nu apărea nimic. Acum serverul păstrează și „n-am aflat” / „la fel, prea puține cazuri”.
//   3. Titlul de dimineață: „istoricul n-am aflat” ar fi sunat stângaci, iar „cam la fel” (eticheta veche, nedovedită) nu e o asemănare
//      dovedită ⇒ doar „mai bine” / „mai slab” se scriu ca atare, restul ⇒ „istoricul nedovedit”.
//   node scripts/proba-v100306-d.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("\nv100.306-d · laboratorul gridului pe două căi, „n-am aflat” prin server, titlul de dimineață · proba\n");

// ── modulele, ca în colector (același text al paginii) ──
const lib = (f) => citeste("public", "lib", f);
const incarca = (f, n, ...dep) => new Function(...dep.map((d) => d[0]), lib(f) + "; return " + n + ";")(...dep.map((d) => d[1]));
globalThis.window = globalThis; globalThis.self = globalThis;
const GridCalcul = incarca("grid-calcul.js", "GridCalcul");
const GridProba = incarca("grid-proba.js", "GridProba", ["GridCalcul", GridCalcul]);
const Valoare = incarca("valoare.js", "Valoare");
const GL = incarca("grid-laborator.js", "GridLaborator", ["GridCalcul", GridCalcul], ["GridProba", GridProba], ["Valoare", Valoare]);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ZI = 864e5;
// o lume: S monede × B blocuri de H zile; eticheta ține pe monedă (persistența), netul = nivelul monedei + piața blocului + zgomot + efectul etichetei
function lume(seed, { S = 20, B = 40, H = 3, pers = 0.85, sdMoneda = 1, efect = 0 }) {
  const r = mulberry32(seed), n = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const mu = Array.from({ length: S }, () => sdMoneda * n()), ps = Array.from({ length: S }, () => 0.1 + 0.8 * r()), et = ps.map((p) => r() < p), rows = [];
  for (let b = 0; b < B; b++) {
    const f = 2 * n();
    for (let s = 0; s < S; s++) {
      if (b > 0 && r() > pers) et[s] = r() < ps[s];
      rows.push({ simbol: "S" + s, t: b * H * ZI, net: mu[s] + f + n() + (et[s] ? efect : 0), A: et[s], parte: b < B * 2 / 3 ? "a" : "t" });
    }
  }
  return { rows, H };
}
const rata = (lumi, o) => { let d = 0; for (let w = 0; w < lumi; w++) { const { rows, H } = lume(7000 + w, o); if (GL.compara(rows, (x) => x.A, (x) => !x.A, H).verdict === "dovedit") d++; } return d / lumi; };

await test("🔑 laboratorul, lume FĂRĂ efect, eticheta ține pe monedă, netul legat de monedă (H = 3): „dovedit” în ≤ 6 % din 200 de lumi", () => {
  const p = rata(200, { H: 3, pers: 0.85, sdMoneda: 1 });
  assert.ok(p <= 0.06, `„dovedit” în ${(100 * p).toFixed(1)} % din lumi (înainte: 49,5 %)`);
});
await test("🔑 …blocuri de 7 zile, nivelul monedei mai mic: tot ≤ 6 %", () => {
  const p = rata(200, { H: 7, pers: 0.85, sdMoneda: 0.5 });
  assert.ok(p <= 0.06, `„dovedit” în ${(100 * p).toFixed(1)} % din lumi (înainte: 35,0 %)`);
});
await test("…fără nivel pe monedă și eticheta schimbată des: tot ≤ 6 %", () => {
  const p = rata(200, { H: 3, pers: 0.5, sdMoneda: 0 });
  assert.ok(p <= 0.06, `„dovedit” în ${(100 * p).toFixed(1)} % din lumi`);
});
await test("🔑 un efect ADEVĂRAT (+0,8 pe fereastră la eticheta A, peste nivelul monedelor) se vede în continuare: „dovedit” în ≥ 50 % din 100 de lumi", () => {
  const p = rata(100, { H: 3, pers: 0.6, sdMoneda: 0.5, efect: 0.8 });
  assert.ok(p >= 0.5, `„dovedit” doar în ${(100 * p).toFixed(1)} % din lumi`);
});
await test("testul spune pe ce s-a socotit: simboluri, grade de libertate; sub 8 monede ⇒ „putine”", () => {
  const { rows, H } = lume(11, { H: 3 });
  const t = GL.testNet(rows, (x) => x.A, (x) => !x.A, H);
  assert.equal(t.stare, "testat"); assert.ok(t.simboluri === 20 && t.gradeLibertate >= 7, JSON.stringify({ s: t.simboluri, df: t.gradeLibertate }));
  assert.ok(Array.isArray(t.ic) && t.ic[0] < t.dif && t.dif < t.ic[1] && t.p > 0 && t.p <= 1, JSON.stringify(t));
  const putine = lume(12, { S: 6, H: 3 });
  assert.equal(GL.testNet(putine.rows, (x) => x.A, (x) => !x.A, putine.H).stare, "putine");
});

await test("🔑 serverul păstrează „n-am aflat” și „la fel, prea puține cazuri” (t212.js și istoric-bot.js), nu le face null", () => {
  for (const f of [["functions", "api", "t212.js"], ["functions", "api", "istoric-bot.js"]]) {
    const s = citeste(...f), liste = [...s.matchAll(/\[([^\]]*"mai bine"[^\]]*)\]\.includes\(/g)].map((m) => m[1]);
    assert.ok(liste.length >= 1, f.join("/") + ": lista etichetelor lipsește");
    for (const l of liste) for (const e of ["mai bine", "mai slab", "n-am aflat", "la fel, prea puține cazuri"]) assert.ok(l.includes('"' + e + '"'), f.join("/") + ": lipsește „" + e + "” din " + l);
  }
});

const { titluDimineata: T } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "dimineata-titlu.mjs")).href);
await test("🔑 titlul de dimineață: „mai bine” / „mai slab” ca atare; „n-am aflat”, „cam la fel”, „la fel, prea puține cazuri” ⇒ „istoricul nedovedit”", () => {
  const t = (e) => T({ reveniri: 9, eticheta: e, deIesit: 0 });
  assert.equal(t("mai bine"), "Azi: 9 acțiuni pe revenire, istoricul mai bine · nimic de ieșit");
  assert.equal(t("mai slab"), "Azi: 9 acțiuni pe revenire, istoricul mai slab · nimic de ieșit");
  for (const e of ["n-am aflat", "cam la fel", "la fel, prea puține cazuri"]) assert.equal(t(e), "Azi: 9 acțiuni pe revenire, istoricul nedovedit · nimic de ieșit", e);
  assert.equal(t(null), "Azi: 9 acțiuni pe revenire · nimic de ieșit");
});

// 4. (revizia v100.306, 🔴) Salt citește înapoi prețurile din textele Consilierului („$25,17”) ca să le scrie în moneda simbolului.
//    Regex-ul vechi lua virgula drept separator de mii ⇒ „$25,17” ⇒ 2.517 EUR. Acum: virgula = format românesc (usd() din v100.306),
//    fără virgulă = textele vechi („$1109.08”).
const linieFn = (src, nume) => { const l = src.replace(/\r\n/g, "\n").split("\n").find((x) => x.trimStart().startsWith("function " + nume + "(")); return l ? l.trim() : ""; };
await test("🔑 Salt: „$25,17” / „$1.234,56” / „$0,0123” se citesc ca 25,17 / 1.234,56 / 0,0123 în moneda simbolului; textele vechi „$1109.08” la fel", () => {
  const se = lib("salt-ecran.js"), sl = lib("salt.js");
  const f = new Function(["saltEsc", "saltBani", "saltMon", "saltPret", "saltNumarUsd", "saltInMoneda"].map((n) => linieFn(se, n)).join("\n") + "\nreturn saltInMoneda;")();
  assert.equal(f("stopul care urcă ($25,17)", "EUR"), "stopul care urcă (25,17 EUR)");
  assert.equal(f("ținta $1.234,56, intrarea $0,0123.", "EUR"), "ținta 1.234,56 EUR, intrarea 0,01 EUR.");
  assert.equal(f("vechi: $1109.08", "EUR"), "vechi: 1.109,08 EUR");
  const g = new Function(linieFn(sl, "inMoneda") + "\nreturn inMoneda;")();
  assert.equal(g("Prețul e sub stopul care urcă ($271,38)", "EUR"), "Prețul e sub stopul care urcă (271,38 EUR)");
  assert.equal(g("vechi ($271.38)", "EUR"), "vechi (271,38 EUR)");
  assert.equal(g("mare ($1.234,56)", "EUR"), "mare (1.234,56 EUR)");
});

// 5. (revizia v100.306, 🔵 6) Trade-ul zilei: „deja mai mult ca ieri” compara până-acum / prețul de ACUM cu ieri / închiderea de ieri.
//    Procentul final al zilei nu poate fi sub (max − min) / max de până acum, oricum s-ar închide ⇒ „deja” doar când limita asta trece de ieri.
//    Și (din pozele unirii): cu bare de azi, dar fără „deja”, P3 e al modelului (vede doar ieri și alaltăieri) ⇒ textul o spune.
{
  const vm = await import("node:vm");
  const ctx = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout }; ctx.window = ctx; ctx.module = undefined;
  vm.createContext(ctx);
  for (const f of ["text-ro.js", "tablou-bot.js", "trade-zilei.js", "trade-zilei-ecran.js"]) vm.runInContext(lib(f), ctx);
  const TZ = ctx.TradeZilei, ORA = 3600000, ZIx = 86400000, T0 = Math.floor(1761955200000 / ZIx) * ZIx;
  const bare = (ranges, oreAzi, pretAzi, ra) => { const out = [], p = 100; ranges.forEach((r, d) => { for (let h = 0; h < 24; h++) out.push({ t: T0 + d * ZIx + h * ORA, o: p, h: h === 12 ? p * (1 + r / 2) : p * 1.001, l: h === 6 ? p * (1 - r / 2) : p * 0.999, c: p }); }); for (let h = 0; h < oreAzi; h++) out.push({ t: T0 + ranges.length * ZIx + h * ORA, o: pretAzi, h: pretAzi * (1 + (h === 1 ? ra / 2 : 0.001)), l: pretAzi * (1 - (h === 2 ? ra / 2 : 0.001)), c: pretAzi }); return out; };
  const r12 = Array(12).fill(0.04); r12[11] = 0.02; r12[10] = 0.025;
  await test("🔑 Trade-ul zilei: până acum 2,01 % / preț, dar (max − min) / max = 1,99 % < ieri 2 % ⇒ NU „deja” (închiderea poate coborî procentul)", () => {
    const d = TZ.azi(bare(r12, 20, 100, 0.0201), T0 + 12 * ZIx + 20 * ORA + 300000);
    assert.ok(!d.eroare, d.eroare); assert.ok(d.panaAcum >= d.r1, "construcția: " + d.panaAcum + " / " + d.r1);
    assert.equal(d.dejaMaiMult, false); assert.equal(d.p3, d.p3CuZiua); assert.ok(d.p3 < 1);   // v100.307 (I-841): fără „deja”, P3 e condiționat de ziua făcută
    const d2 = TZ.azi(bare(r12, 20, 100, 0.03), T0 + 12 * ZIx + 20 * ORA + 300000);
    assert.equal(d2.dejaMaiMult, true, "3 %: (max − min) / max = 2,96 % > 2 % ⇒ deja");
  });
  await test("🔑 cu bare de azi, fără „deja”: prognoza modelului din ieri și alaltăieri (nu vede ziua de azi) rămâne spusă, și cât s-a făcut", () => {
    const d = TZ.azi(bare(r12, 20, 100, 0.015), T0 + 12 * ZIx + 20 * ORA + 300000);
    const h = ctx.tzCartela({ simbol: "ETH", pionex: "ETH_USDT_PERP", fel: "piata", d });
    assert.match(h, /nu vede ziua de azi/); assert.match(h, /până acum 1,5 % față de 2,0 % ieri/);
    const d0 = TZ.azi(bare(r12, 0, 100, 0.015), T0 + 12 * ZIx + 300000);
    assert.match(ctx.tzCartela({ simbol: "ETH", pionex: "ETH_USDT_PERP", fel: "piata", d: d0 }), /calibrat: din 100 de zile ca azi, \d+ au ieșit așa/, "la 00:xx UTC (nicio bară de azi) rămâne calibrarea");
  });
  // pozele de pe VPS, 06.11 00:20: BTC „7 %” mare, deși la prețul de acum ziua e deja 7,1 % față de 6,8 % ieri ⇒ cifra mare spune ce este.
  // v100.306 a pus eticheta „prognoza de la 00:00 UTC” pe cifra mare; v100.307 (I-841) o înlocuiește cu P3 condiționat de ziua făcută (măsurat
  // pe ore, verificat pe zile nevăzute - proba-v100307-a), iar prognoza modelului coboară pe un rând al ei (nimic pierdut)
  await test("🔑 cu ziua în curs (fără „deja”): cifra mare e P3 cu ziua de până acum, pe tonul lui; prognoza de la 00:00 UTC pe rândul ei; rezumatul spune la fel", () => {
    const d = TZ.azi(bare(r12, 20, 100, 0.015), T0 + 12 * ZIx + 20 * ORA + 300000);
    const h = ctx.tzCartela({ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d });
    const ton = d.p3 >= 0.7 ? " tzBun" : d.p3 <= 0.3 ? " tzMut" : "";
    assert.ok(h.includes('Azi se mișcă mai mult ca ieri</span><b class="tzCifra' + ton + '">' + Math.round(d.p3 * 100) + " %</b>"), "cifra mare = P3 condiționat");
    assert.ok(h.includes('Prognoza de la 00:00 UTC</span><b class="tzCifra tzMut">' + Math.round(d.p3Model * 100) + " %</b>"), "prognoza modelului pe rândul ei");
    const r = ctx.tzRezumat([{ simbol: "BTC", fel: "piata", d }]);
    assert.match(r, />Azi: /); assert.match(r, /\(cu ziua de până acum\)/); assert.doesNotMatch(r, /prognoza de la 00:00 UTC; ziua e în curs/);
    const d0 = TZ.azi(bare(r12, 0, 100, 0.015), T0 + 12 * ZIx + 300000);
    assert.doesNotMatch(ctx.tzCartela({ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d: d0 }), /prognoza de la 00:00 UTC/i, "la 00:xx UTC e chiar prognoza zilei - fără etichetă");
  });
}

// 6. (revizia v100.306, 🔵 5) rezumatul nopții: aceeași alertă reîncercată (KV căzut) nu se numără de două ori; tura de dimineață nu
//    pleacă de două ori când Discord e lent (gardă de reintrare)
{
  const POL = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "politica-alerte.mjs")).href);
  await test("🔑 noaptea: aceeași cheie notată de două ori (reîncercare) ⇒ numărată o dată; alta ⇒ două", () => {
    const st = {}, m = { titlu: "STX: −1% azi", nivel: "info" }, la = Date.UTC(2026, 10, 6, 1);
    POL.noteazaNoapte(st, m, "bot-1-pas-2026-11-06", la); POL.noteazaNoapte(st, m, "bot-1-pas-2026-11-06", la + 60000);
    assert.equal(st.n, 1, JSON.stringify(st));
    POL.noteazaNoapte(st, m, "bot-2-pas-2026-11-06", la + 120000);
    assert.equal(st.n, 2);
  });
  await test("tura rezumatului de dimineață are gardă de reintrare (bucla o pornește fără await)", () => {
    const c = citeste("scripts", "colector.mjs");
    assert.match(c, /var rezumatNoapteInZbor = false;/); assert.match(c, /if \(rezumatNoapteInZbor\) return;/);
  });
}

// 7. (revizia v100.306, 🔵 9 + 8) un 5xx pe bot-orders are deja alerta lui („nu mai poate citi botul”) ⇒ nu și „🩺 erori 5xx”; linkul din
//    banda „versiunea publicată” duce la Radarul de pe server, nu la 127.0.0.1
{
  const SR = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "sanatate-rute.mjs")).href);
  await test("5xx pe bot-orders nu intră în contorul pe rută (o singură voce); pe altă rută da", () => {
    const st = {}, la = Date.UTC(2026, 10, 6, 10);
    SR.noteazaRaspuns(st, "/api/bot-orders", 500, la); SR.noteazaRaspuns(st, "/api/bot-orders?id=1", 502, la + 60000);
    assert.ok(!st.rute || !st.rute["bot-orders"], JSON.stringify(st));
    SR.noteazaRaspuns(st, "/api/istoric-bot?action=paza", 500, la);
    assert.ok(st.rute["istoric-bot·paza"]);
  });
  await test("banda „versiunea publicată”: linkul duce la Radarul de pe server", () => {
    const h = citeste("public", "index.html"), b = /id="pePublicat"[^\n]*/.exec(h)[0];
    assert.match(b, /href="https:\/\/mau\.tail9144fe\.ts\.net:8443\/"/); assert.doesNotMatch(b, /127\.0\.0\.1:8788/);
  });
}

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
