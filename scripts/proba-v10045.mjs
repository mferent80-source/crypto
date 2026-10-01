// Proba v100.45 (01.10, el: „sfaturile să fie adaptate și personalizate pentru fiecare monedă” + specul aprobat
// docs/superpowers/specs/2026-10-01-consiliere-personalizata-design.md, pachetul 1: profilul monedei + planul potrivit monedei).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
let PM = null; try { PM = new Function(`${lib("profil-moneda.js")}; return ProfilMoneda;`)(); } catch { PM = null; }

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.45 · Profilul monedei + planul potrivit monedei (pachetul 1) · proba\n");

const ORA = 3600000, T0 = Date.UTC(2026, 3, 1);
// bare sintetice de 1 h: in fiecare zi pretul coboara de la 100 la 100*(1-a) spre mijlocul zilei si revine (a = amplitudinea zilei)
function bareZile(amp, zile, gauraLa) {
  const v = [];
  for (let z = 0; z < zile; z++) for (let h = 0; h < 24; h++) {
    const t = T0 + (z * 24 + h) * ORA; if (gauraLa !== undefined && z === gauraLa && h === 5) continue;
    const a = amp[z % amp.length], jos = 100 * (1 - a * Math.min(h, 23 - h) / 11);   // la orele 11 si 12: toata amplitudinea
    v.push({ t, o: 100, h: 100.0001, l: jos, c: 100 });
  }
  return v;
}

await test("calculeaza: 40 de zile cu amplitudini cunoscute -> cuantilele pe 24 h le regasesc; doar barele incheiate", () => {
  assert.ok(PM && typeof PM.calculeaza === "function", "lipseste ProfilMoneda.calculeaza");
  const amp = [0.01, 0.02, 0.03, 0.04];
  const p = PM.calculeaza(bareZile(amp, 40), { acum: T0 + 40 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  assert.ok(p && p.z24 && p.z24.jos.length === 21);
  assert.ok(p.z24.jos[20] <= 0.0401 && p.z24.jos[20] >= 0.039, "maximul = 4%: " + p.z24.jos[20]);
  assert.ok(p.z24.n > 100, "pornire la fiecare 6 h"); assert.equal(p.z24.nIndep, Math.floor(p.z24.n * 6 / 24));
  assert.equal(p.zile, 40);
  const viitor = PM.calculeaza(bareZile(amp, 40), { acum: T0 + 20 * 24 * ORA, simbol: "X" });
  assert.ok(viitor === null || viitor.panaLa < T0 + 20 * 24 * ORA, "barele de dupa acum nu intra");
});

await test("calculeaza: sub 30 de zile -> null (fara cifre inventate)", () => {
  assert.equal(PM.calculeaza(bareZile([0.02], 25), { acum: T0 + 25 * 24 * ORA }), null);
});

await test("calculeaza: o ora lipsa -> ferestrele care o cuprind nu se numara", () => {
  const plin = PM.calculeaza(bareZile([0.02], 40), { acum: T0 + 40 * 24 * ORA }), gaura = PM.calculeaza(bareZile([0.02], 40, 10), { acum: T0 + 40 * 24 * ORA });
  assert.ok(gaura.z24.n <= plin.z24.n - 3, "o bara lipsa scade doar 1 fereastra din numaratoare; ferestrele care o cuprind (4) trebuie sarite: " + gaura.z24.n + " vs " + plin.z24.n);
});

// ferestrele pornesc la 0/6/12/18: 3 din 4 cuprind o singura zi, cea de la 12 cuprinde doua -> pe 16 ferestre: 1%:3, 2%:4, 3%:4, 4%:5
await test("frecventa si prag: pe 1%/2%/3%/4%, o coborare de 2,5% e atinsa in ~9 din 16 ferestre; P75 = 4%", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA });
  const f = PM.frecventa(p.z24.jos, 0.025); assert.ok(f > 0.45 && f < 0.7, "f=" + f);
  assert.equal(PM.frecventa(p.z24.jos, 0.5), 0); assert.equal(PM.frecventa(p.z24.jos, 0), 1);
  const q = PM.prag(p, "z24", "jos", 0.75); assert.ok(q >= 0.039 && q <= 0.0401, "P75=" + q);
});

await test("planPeMoneda: planul atins de o zi obisnuita in peste jumatate din zile -> avertizare + prag propus cu suma, si sursa scrisa", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const r = PM.planPeMoneda({ profil: p, dir: "long", dist: 0.012, laDist: (d) => -1000 * d });
  assert.ok(r.avertizare && r.frecventa > 0.5); assert.ok(r.maiStrans);
  assert.ok(Math.abs(r.sumaPropusa + 1000 * r.distPropusa) < 1e-9);
  assert.match(r.text, /în \d+% din zile/); assert.match(r.text, /1 zi din 4/); assert.match(r.text, /profilul CRV/);
  const s = PM.planPeMoneda({ profil: p, dir: "short", dist: 0.012, laDist: (d) => -1000 * d });
  assert.ok(s.frecventa < 0.05, "short se citeste pe URCARI (aici aproape zero): " + s.frecventa);
  assert.equal(PM.planPeMoneda({ profil: null, dir: "long", dist: 0.01 }), null);
});

await test("praguriMargine / pragStop: P75 pe 12 h si pe 24 h; fara profil -> null", () => {
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const m = PM.praguriMargine(p); assert.ok(m.jos > 0 && m.sus >= 0); assert.match(m.sursa, /profilul CRV/);
  const s = PM.pragStop(p, "long"); assert.ok(Math.abs(s.dist - PM.prag(p, "z24", "jos", 0.75)) < 1e-12);
  assert.equal(PM.praguriMargine(null), null); assert.equal(PM.pragStop(p, "neutru"), null);
});

await test("server: profilul se scrie si se citeste in KV „profil:<SIMBOL>”; forma stricata -> 400; simbolul curatat", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.has(k) ? kv.get(k) : null, put: async (k, v) => { kv.set(k, v); }, list: async () => ({ keys: [] }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const p = PM.calculeaza(bareZile([0.01, 0.02, 0.03, 0.04], 60), { acum: T0 + 60 * 24 * ORA, simbol: "CRV_USDT_PERP" });
  const r = await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "crv_usdt_perp<x>", profil: p }), env });
  assert.equal(r.status, 200, await r.clone().text());
  assert.ok(kv.has("profil:CRV_USDT_PERPX"), [...kv.keys()].join(","));
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=profil&simbol=CRV_USDT_PERPX"), env })).json();
  assert.deepEqual(g.profil.z24.jos, p.z24.jos); assert.equal(g.profil.zile, p.zile);
  const rau = await mod.onRequestPost({ request: cer("POST", "action=profil", { simbol: "CRV_USDT_PERP", profil: { z24: { jos: [1, 2] } } }), env });
  assert.equal(rau.status, 400);
});

let TP = null; try { TP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-profil.mjs")).href); } catch { TP = null; }
const kline = (t) => ({ time: t, open: "100", high: "101", low: "99", close: "100", volume: "1" });
function pionexFals(pana, de) {   // raspunde ca Pionex: cele mai noi 500 de bare de 1 h <= endTime, de la `de` incoace
  const cereri = [];
  return { cereri, cere: async (cale) => {
    cereri.push(cale); const m = /endTime=(\d+)/.exec(cale), end = m ? Number(m[1]) : pana, out = [];
    for (let t = Math.floor(end / ORA) * ORA; t >= de && out.length < 500; t -= ORA) out.push(kline(t));
    return { result: true, data: { klines: out } };
  } };
}
await test("colector: prima data aduce 6 luni pe pagini (cu pauza), a doua oara doar ce lipseste", async () => {
  assert.ok(TP && typeof TP.aduOre === "function", "lipseste scripts/lib/tura-profil.mjs");
  const acum = T0 + 200 * 24 * ORA, p = pionexFals(acum, T0), pauze = [];
  const d = { cere: p.cere, GridCalcul: G, acum, pauza: async (ms) => { pauze.push(ms); } };
  const r = await TP.aduOre("CRV_USDT_PERP", [], d);
  assert.ok(r.length >= 183 * 24 && p.cereri.length >= 9 && p.cereri.length <= 10, r.length + " bare, " + p.cereri.length + " cereri");
  assert.ok(p.cereri.every((c) => /interval=60M/.test(c))); assert.ok(pauze.length >= 8 && pauze.every((ms) => ms >= 1600));
  const p2 = pionexFals(acum + 5 * ORA, T0);
  const r2 = await TP.aduOre("CRV_USDT_PERP", r, { ...d, cere: p2.cere, acum: acum + 5 * ORA });
  assert.equal(p2.cereri.length, 1, "doar pagina cea noua"); assert.ok(r2.length >= r.length);
});
await test("colector: noaptea (02-05 ora Romaniei) o data pe zi; moneda fara profil se face oricand", async () => {
  assert.ok(TP && typeof TP.turaProfil === "function", "lipseste turaProfil");
  const zi = Date.UTC(2026, 9, 1), noapte = zi + 30 * 60000, amiaza = zi + 10 * ORA;   // 03:30 si 13:00 ora Romaniei (UTC+3)
  assert.equal(TP.eNoapte(noapte), true); assert.equal(TP.eNoapte(amiaza), false);
  const scrise = [], stare = { facute: {} }, mk = (acum) => ({ GridCalcul: G, ProfilMoneda: PM, acum, pauza: async () => {},
    cere: pionexFals(acum, acum - 60 * 24 * ORA).cere, trimite: async (cale, corp) => { scrise.push(corp.simbol); return { ok: true }; },
    simboluri: async () => [{ simbol: "CRV_USDT_PERP", moneda: "CRV" }], trades: async () => [], citesteBare: () => [], scrieBare: () => {},
    stare, scrieStare: () => {}, jurnal: () => {}, profile: new Map() });
  await TP.turaProfil(mk(amiaza)); assert.deepEqual(scrise, ["CRV_USDT_PERP"], "fara profil: se face si la amiaza");
  await TP.turaProfil(mk(amiaza + ORA)); assert.equal(scrise.length, 1, "are profil: asteapta noaptea");
  await TP.turaProfil(mk(noapte + 24 * ORA)); assert.equal(scrise.length, 2, "noaptea urmatoare: se reface");
  await TP.turaProfil(mk(noapte + 25 * ORA)); assert.equal(scrise.length, 2, "o singura data pe noapte");
});

const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
const fisaF = { setare: { dir: "long", jos: 0.40, sus: 0.50, grile: 20, pas: 0.0112, levier: 3, stop: { jos: 0.395, sus: 0.505 } }, propusa: "rara", treceriZi: 3 };
const botL = (pret, jos = 0.40, sus = 0.50, dir = "long") => ({ pretCurent: pret, gridJos: jos, gridSus: sus, directie: dir, brut: { buOrderData: { row: 21, gridType: "geometric" } } });
await test("marginea din profil: 2,4% pana jos cand moneda coboara 3% in 12 h (P75) -> la margine, cu sursa; 6% pana jos -> nu", () => {
  assert.ok(typeof SB.laMargine === "function", "lipseste SemnaleBot.laMargine");
  const pm = { jos: 0.03, sus: 0.03, sursa: "profilul CRV: 183 de zile de bare de 1 h" };
  const m = SB.mutaGridul(botL(0.41), fisaF, 0, pm);   // 0,41: 2,4% pana jos, 10% din interval (pragul fix n-ar fi sunat: nu e sub 10%)
  assert.ok(m && /marginea de jos/.test(m.motiv) && /profilul CRV/.test(m.motiv), m && m.motiv);
  assert.equal(SB.mutaGridul(botL(0.4255), fisaF, 0, pm), null, "6% pana jos > 3% (P75 pe 12 h): nu e la margine");
  const m2 = SB.mutaGridul(botL(0.4048), fisaF, 0, null);   // fara profil: pragul fix, 4,8% din interval
  assert.ok(m2 && /marginea de jos/.test(m2.motiv) && /prag fix/.test(m2.motiv), m2 && m2.motiv);
});
await test("marginea din profil e plafonata la 25% din interval: gridul ingust nu sta „la margine” mereu", () => {
  const pm = { jos: 0.08, sus: 0.08, sursa: "profilul X" };
  assert.equal(SB.mutaGridul(botL(0.45), fisaF, 0, pm), null, "pretul la mijloc, interval de 22%: nu e la margine");
  const l = SB.laMargine(botL(0.45), pm); assert.ok(l.prag <= 0.25 * (0.50 - 0.40) / 0.45 + 1e-12);
});
await test("short: marginea de pierdere e SUS; stopul propus din profil e PESTE pret, mai departe decat al fisei", () => {
  const pm = { jos: 0.03, sus: 0.03, sursa: "profilul CRV" };
  const m = SB.mutaGridul(botL(0.49, 0.40, 0.50, "short"), { ...fisaF, setare: { ...fisaF.setare, dir: "short" } }, 0, pm);
  assert.ok(m && /marginea de sus/.test(m.motiv), m && m.motiv);
  const c = SB.acumConcret({ bot: { ...botL(0.47, 0.40, 0.50, "short"), profitTotal: -3 }, fisa: fisaF, zero: { pretZero: 0.45 }, costuri: {}, pragMargine: pm, pragStop: { dist: 0.12, sursa: "profilul CRV" }, acum: T0 });
  const st = c.find((x) => x.cod === "stop");
  assert.ok(st.pretPropus > 0.505 && Math.abs(st.pretPropus - 0.47 * 1.12) < 1e-9, "dincolo de P75 pe 24 h: " + st.pretPropus);
  assert.match(st.sursaStop || "", /profilul CRV/);
  const c0 = SB.acumConcret({ bot: { ...botL(0.47, 0.40, 0.50, "short"), profitTotal: -3 }, fisa: fisaF, zero: { pretZero: 0.45 }, costuri: {}, acum: T0 });
  assert.equal(c0.find((x) => x.cod === "stop").pretPropus, 0.505, "fara profil: stopul fisei, ca azi");
});

await test("poarta: planul atins de o zi obisnuita in peste jumatate din zile -> regula „plan-moneda” rosie (avertizare, nu blocare)", () => {
  const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
  const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
  const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(G, GP, JT);
  const pm = { avertizare: true, text: "O zi obișnuită a monedei ajunge la planul tău (−1,2% de preț) în 70% din zile." };
  const r = OB.poarta({ fisa: { simbol: "CRV_USDT_PERP", verdict: { nivel: "porneste" }, setare: {} }, trades: [], acum: T0, dir: "long", levier: 3, plan: { plus: 5, minus: 10 }, planMoneda: pm });
  const rg = r.reguli.find((x) => x.cod === "plan-moneda");
  assert.ok(rg && rg.ok === false && /70% din zile/.test(rg.text), JSON.stringify(rg)); assert.equal(r.trecut, false);
  const r2 = OB.poarta({ fisa: { simbol: "CRV_USDT_PERP", verdict: { nivel: "porneste" }, setare: {} }, trades: [], acum: T0, dir: "long", levier: 3, plan: { plus: 5, minus: 10 } });
  assert.ok(!r2.reguli.some((x) => x.cod === "plan-moneda"), "fara profil: regula nu apare");
});
await test("app: Tabloul cere profilul si il da la margine, stop si plan; poarta il foloseste; modulul e incarcat si pus in cache", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), sw = fs.readFileSync(path.join(RAD, "public", "sw.js"), "utf8");
  assert.match(app, /action=profil&simbol=/); assert.match(app, /SemnaleBot\.mutaGridul\(b,f,ac\?ac\.afaraOre:0,pmT\)/);
  assert.match(app, /pragMargine:pmT,pragStop:psT/); assert.match(app, /ProfilMoneda\.planPeMoneda\(/); assert.match(app, /planMoneda:pmG/);
  assert.match(html, /<script src="\/lib\/profil-moneda\.js"><\/script>/); assert.match(sw, /"\/lib\/profil-moneda\.js"/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
