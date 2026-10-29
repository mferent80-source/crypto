// Proba v100.267-c (auditul 29.10): patru reparații, fiecare cu testul care pica înainte.
//  1. Fișa gridului (orizontul H = 1–3 zile) era contrazisă de un Monte Carlo pe 7 ZILE: pe datele auditului (6 monede × H 1–3) stopul
//     atins la 7 zile în 16 din 18 cazuri, deci toate cele 3 PORNEȘTE (H = 1) coborâte la AȘTEAPTĂ. Acum MC rulează pe H zile, iar
//     contrazicerea vine din verdictul simulării („N-aș porni”, stopul în zgomot, pierderea CONFIRMATĂ), nu din „pierde” > 50% brut.
//  2. Poarta T212 („Bilet”): două clicuri rapide ⇒ răspunsul vechi scria peste cel nou și intra în jurnalul verdictelor. Acum: jeton pe cerere.
//  3. Cu bursa închisă, „acum $X” era închiderea de ieri (barele zilnice n-au pre-market). Acum eticheta spune închiderea și ce zi,
//     iar un avertisment spune că la deschidere prețul poate sări peste stop.
//  4. Pence față de lire (×100) la Londra: prețul T212 nu era comparat cu barele Yahoo. Acum unitatea barelor se aliniază la cea a
//     prețului T212 când raportul e ~100 sau ~0,01 (banda ±30%, ca pretPotrivit), înainte de stop și semafor. Exemplu SINTETIC.
//   node scripts/proba-v100267-c.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.267-c · auditul 29.10 · proba\n");

// ================================================================ 1. fișa: Monte Carlo pe orizontul ei
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul;
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
globalThis.GridProba = GP;
globalThis.MonteSimbol = new Function(`${lib("monte-simbol.js")}; return MonteSimbol;`)();
const M = globalThis.MonteSimbol;
const GS = new Function(`${lib("grid-sim.js")}; return GridSim;`)();   // nu e global: fișa îl primește prin o.mc, ca în colector

// aceleași bare sintetice ca proba auditului 23.10 (5): pe ele fișa fără Monte Carlo zice PORNEȘTE la H = 1
function bareSint(n, seed, vol = 0.004, drift = 0, p0 = 100) {
  const rnd = M.generator(seed), out = []; let p = p0, t = Date.UTC(2026, 8, 1);
  for (let i = 0; i < n; i++) {
    const z = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const o = p, c = p * Math.exp(drift + vol * z);
    out.push({ t, o, h: Math.max(o, c) * (1 + Math.abs(vol * 0.5 * rnd())), l: Math.min(o, c) * (1 - Math.abs(vol * 0.5 * rnd())), c, v: 1 }); p = c; t += 900000;
  }
  return out;
}
const B5 = bareSint(30 * 96, 1023, 0.006), P5 = B5[B5.length - 1].c;
const fisa = (o) => GP.fisa({ simbol: "S", pret: P5, H: 1, b15: B5, b4h: G.agrega(B5, 4 * 3600000).slice(0, -1), b1d: G.agrega(B5, 86400000).slice(0, -1), suma: 100, ...o });
// Simulatorul de jucărie: ține minte cu ce a fost chemat și dă cifrele cerute
const spion = (z, v) => { const vazut = []; return { vazut, simuleaza: (b, st, o) => { vazut.push(o); return { orizonturi: [Object.assign({ zile: o && o.orizonturi && o.orizonturi[0] }, z)] }; }, verdict: () => v }; };
const ACORD = { pStop: 0.2, pPierde: 0.3, pCastig: 0.7, pLich: 0, p50: 1 };

await test("1a premisa: fără Monte Carlo fișa zice PORNEȘTE pe barele de probă (H = 1)", () => {
  assert.equal(fisa({ faraMc: true }).verdict.nivel, "porneste");
});
await test("1b Monte Carlo rulează pe orizontul FIȘEI (zile = H, orizonturi = [H]), nu pe 7 zile", () => {
  for (const H of [1, 2, 3]) {
    const S = spion(ACORD, { faCe: "Aș porni: câștigă în 70% din drumuri.", rauConfirmat: false });
    const f = fisa({ H, mc: S });
    assert.ok(!f.eroare, f.eroare);
    assert.equal(S.vazut.length, 1);
    assert.equal(S.vazut[0].zile, H, "zilele drumurilor la H = " + H + ": " + JSON.stringify(S.vazut[0]));
    assert.deepEqual(S.vazut[0].orizonturi, [H], "orizontul citit la H = " + H);
    assert.equal(f.mc.zile, H);
  }
});
await test("1c „pierde” > 50% NECONFIRMAT (aruncare de ban) nu mai coboară PORNEȘTE", () => {
  const S = spion({ pStop: 0.2, pPierde: 0.55, pCastig: 0.45, pLich: 0, p50: -0.3 }, { faCe: "O aruncare de ban: pierde în 55% din drumuri, de obicei −0,3 USDT, dar incertitudinea reală e ±12 puncte; n-am aflat că pierde.", culoare: "mijl", rauConfirmat: false });
  const f = fisa({ mc: S });
  assert.equal(f.mc.contrazice, false, f.mc.motiv);
  assert.equal(f.verdict.nivel, "porneste");
});
await test("1d pierderea CONFIRMATĂ de simulare contrazice; motivul spune orizontul real („pe 1 zi”)", () => {
  const S = spion({ pStop: 0.2, pPierde: 0.62, pCastig: 0.38, pLich: 0, p50: -1 }, { faCe: "Altceva", culoare: "bad", rauConfirmat: true });
  const f = fisa({ mc: S });
  assert.equal(f.verdict.nivel, "asteapta");
  assert.match(f.verdict.motive[0], /^Monte Carlo pe 1 zi, aceeași setare: pierde în 62% din drumuri/);
  assert.doesNotMatch(f.verdict.motive.join(" "), /7 zile/);
});
await test("1e stopul în zgomot pe orizontul fișei tot contrazice (e verdictul simulării), cu „pe 2 zile” în motiv", () => {
  const S = spion({ pStop: 0.6, pPierde: 0.4, pCastig: 0.6, pLich: 0, p50: 0.5 }, { faCe: "Stopul e în zgomot: atins în 60% din drumuri în 2 zile.", culoare: "mijl", rauConfirmat: false });
  const f = fisa({ H: 2, mc: S, dir: null });
  assert.equal(f.mc.contrazice, true);
  assert.match(f.mc.motiv, /^Monte Carlo pe 2 zile, aceeași setare: stopul atins în 60% din drumuri/);
});
await test("1f Simulatorul adevărat: fișa la H = 1 poartă MC pe o zi, 300 de drumuri; GridSim.verdict dă rauConfirmat", () => {
  const f = fisa({ mc: GS });
  assert.ok(f.mc && !f.mc.eroare, JSON.stringify(f.mc));
  assert.equal(f.mc.n, 300); assert.equal(f.mc.zile, 1);
  if (f.verdict.nivel === "asteapta") assert.match(f.verdict.motive[0], /^Monte Carlo pe 1 zi/);
  // același Simulator, aceeași setare: pe 7 zile stopul e atins mai des decât pe 1 zi (mecanismul auditului)
  const s = f.setare, sp = s.stop || {}, st = { jos: s.jos, sus: s.sus, grile: s.grile, levier: s.levier, dir: s.dir, suma: 100, fundingZi: 0.0003, fundingCost: true,
    stop: s.dir === "long" ? { jos: sp.jos } : s.dir === "short" ? { sus: sp.sus } : { jos: sp.jos, sus: sp.sus }, tp: s.dir === "long" ? sp.sus : s.dir === "short" ? sp.jos : null };
  const r = GS.simuleaza(B5, st, { n: 300, seed: 12, zile: 7, orizonturi: [1, 7] });
  assert.ok(r.orizonturi[1].pStop >= r.orizonturi[0].pStop, JSON.stringify([r.orizonturi[0].pStop, r.orizonturi[1].pStop]));
  const v = GS.verdict(r, st, null, 0, null);
  assert.equal(typeof v.rauConfirmat, "boolean", "GridSim.verdict spune pe nume dacă pierderea e confirmată");
  assert.equal(v.rauConfirmat, v.culoare === "bad");
});

// ================================================================ pagina T212 în vm (ca proba v100.196-actiuni), cu ceasul dat
const ZI = 86400000;
function ceasLa(ACUM) { return class Ceas extends Date { constructor(...a) { if (a.length) super(...a); else super(ACUM); } static now() { return ACUM; } }; }
function context(acum, extra) {
  const c = Object.assign({ console, Date: ceasLa(acum), Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, setTimeout: () => 0 }, extra || {});
  c.window = c; c.globalThis = c; vm.createContext(c);
  return c;
}
const LIB = ["grid-calcul.js", "calendar-bursa.js", "actiuni-semnale.js"];
const cB = context(Date.parse("2026-10-14T22:00:00Z")); for (const f of LIB) vm.runInContext(lib(f), cB);
function zileBursa(n, panaLa) {
  const z = []; let t = Date.parse(new Date(panaLa).toISOString().slice(0, 10) + "T13:30:00Z");
  while (z.length < n) { const d = new Date(t).toISOString().slice(0, 10); if (cB.CalendarBursa.eZiDeBursa(d, "NYSE")) z.unshift(t); t -= ZI; }
  return z;
}
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function bareDin(samanta, n, panaLa, scara) {
  const t = zileBursa(n || 320, panaLa), r = mulberry32(samanta), b = []; let c = 100;
  for (let i = 0; i < t.length; i++) { const o = c; c *= 1 + 0.0015 + (r() - 0.5) * 0.04; b.push({ t: t[i], o, h: Math.max(o, c) * (1 + r() * 0.01), l: Math.min(o, c) * (1 - r() * 0.01), c, v: 1e6 }); }
  const k = scara ? scara / b[b.length - 1].c : 1;
  return b.map((x) => ({ t: x.t, o: x.o * k, h: x.h * k, l: x.l * k, c: x.c * k, v: x.v }));
}
const RAND = (b) => b.map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: x.v }));
function pagina(o) {
  o = o || {};
  const acum = o.acum || Date.parse("2026-10-14T22:00:00Z"), bare = o.bare || bareDin(7, 320, acum);
  const el = {}, $ = (id) => el[id] || (el[id] = { id, value: "", innerHTML: "", textContent: "", hidden: false, scrollIntoView() {}, setAttribute() {}, getAttribute() { return null; }, querySelectorAll: () => [], closest: () => null, getBoundingClientRect: () => ({ width: 700 }) });
  const cereri = [], verdicte = [];
  const getJSON = async (u) => {
    cereri.push(u);
    const r = o.raspuns ? o.raspuns(u) : undefined; if (r instanceof Error) throw r; if (r !== undefined) return r;
    if (/action=preturi/.test(u)) return { simbol: (/ticker=([A-Z0-9.]+)_US_EQ/.exec(u) || [])[1], randuri: RAND(bare) };
    if (/action=rezultate/.test(u)) return { data: "2026-12-20" };
    if (/action=piata/.test(u) && /istoric-bot/.test(u)) return { la: acum - 600000, macro: { cod: "inclinat", scor: 3 } };
    if (/stiri/.test(u)) return { stiri: [] };
    return null;
  };
  const c = context(acum, { $, getJSON, escapeHtml: (s) => String(s == null ? "" : s), toast() {}, apiFetch: async () => ({ ok: true, json: async () => ({}) }), verdictTrimite(x) { verdicte.push(x); }, navTo() {},
    localStorage: { getItem: () => null, setItem() {} }, document: { querySelectorAll: () => [], addEventListener() {} }, fetch: async () => ({ ok: false }) });
  for (const f of LIB.concat(["t212.js", "t212-ecran.js"])) vm.runInContext(lib(f), c, { filename: f });
  c.t212.cont = { cash: { total: 27549.75, free: 20000 } }; c.t212.bnr = { zi: "2026-10-14", curs: 4.7706 };
  c.t212.poz = []; c.t212.raportCont = { reconciliere: { t212: { abateri: [] } } }; c.t212.cititBine = acum;
  return { c, el, $, cereri, verdicte };
}
const amanat = () => { let da; const p = new Promise((r) => { da = r; }); return { p, da }; };
const antet = (html) => { const i = html.indexOf('<div class="t212Verdict'); return i < 0 ? "" : html.slice(i, html.indexOf("</div>", i)); };

// ================================================================ 2. Poarta T212: jetonul pe cerere
await test("2a premisa: pe barele de probă Poarta dă un verdict (nu FĂRĂ DATE), deci scrie în jurnalul verdictelor", async () => {
  const P = pagina(); P.$("t212PSimbol").value = "BBB"; await P.c.t212Poarta();
  assert.ok(P.c.t212.poarta && P.c.t212.poarta.v, JSON.stringify(P.c.t212.poarta));
  assert.notEqual(P.c.t212.poarta.v.nivel, "fara-date", JSON.stringify(P.c.t212.poarta.v.motive));
  assert.deepEqual(P.verdicte.map((v) => v.k), ["BBB_US_EQ"]);
});
await test("2b două clicuri, simboluri diferite: răspunsul vechi (AAA, mai lent) nu scrie peste BBB și nu intră în jurnal", async () => {
  const lent = amanat();
  const P = pagina({ raspuns: (u) => /action=preturi/.test(u) && /AAA_US_EQ/.test(u) ? lent.p.then(() => ({ simbol: "AAA", randuri: RAND(bareDin(7, 320, Date.parse("2026-10-14T22:00:00Z"))) })) : undefined });
  P.$("t212PSimbol").value = "AAA"; const p1 = P.c.t212Poarta();
  P.$("t212PSimbol").value = "BBB"; await P.c.t212Poarta();
  const nou = P.c.t212.poarta;
  assert.equal(nou.simbol, "BBB");
  lent.da(); await p1;
  assert.equal(P.c.t212.poarta, nou, "răspunsul vechi (" + (P.c.t212.poarta && P.c.t212.poarta.simbol) + ") a scris peste cel nou");
  assert.doesNotMatch(P.$("t212PoartaRez").innerHTML, /AAA/);
  assert.deepEqual(P.verdicte.map((v) => v.k), ["BBB_US_EQ"], "jurnalul verdictelor");
});
await test("2c două clicuri pe ACELAȘI simbol: doar ultimul răspuns scrie (o singură intrare în jurnal)", async () => {
  const lent = amanat(); let n = 0;
  const P = pagina({ raspuns: (u) => /action=preturi/.test(u) && n++ === 0 ? lent.p.then(() => ({ simbol: "AAA", randuri: RAND(bareDin(7, 320, Date.parse("2026-10-14T22:00:00Z"))) })) : undefined });
  P.$("t212PSimbol").value = "AAA"; const p1 = P.c.t212Poarta();
  await P.c.t212Poarta();
  const nou = P.c.t212.poarta;
  lent.da(); await p1;
  assert.equal(P.c.t212.poarta, nou, "răspunsul vechi a înlocuit biletul nou");
  assert.equal(P.verdicte.length, 1, "jurnalul: " + JSON.stringify(P.verdicte));
});
await test("2d răspunsul vechi întârziat la ȘTIRI (ultimul await) nu-și lipește știrile pe biletul nou", async () => {
  const lent = amanat();
  const P = pagina({ raspuns: (u) => /stiri/.test(u) ? (/AAA_US_EQ/.test(u) ? lent.p.then(() => ({ stiri: [{ titlu: "știre AAA" }] })) : { stiri: [{ titlu: "știre BBB" }] }) : undefined });
  P.$("t212PSimbol").value = "AAA"; const p1 = P.c.t212Poarta();
  for (let i = 0; i < 50 && !P.cereri.some((u) => /stiri.*AAA_US_EQ/.test(u)); i++) await new Promise((r) => setImmediate(r));
  assert.ok(P.cereri.some((u) => /stiri.*AAA_US_EQ/.test(u)), "premisa: AAA a ajuns la știri");
  P.$("t212PSimbol").value = "BBB"; await P.c.t212Poarta();
  lent.da(); await p1;
  assert.equal(P.c.t212.poarta.simbol, "BBB");
  assert.deepEqual(JSON.parse(JSON.stringify(P.c.t212.poarta.stiri)), [{ titlu: "știre BBB" }]);
  assert.doesNotMatch(P.$("t212PoartaRez").innerHTML, /AAA/);
});

// ================================================================ 3. bursa închisă: „acum” e închiderea
const poartaLa = async (acum, panaLa, simbol) => {
  const P = pagina({ acum, bare: bareDin(7, 320, panaLa) }); P.$("t212PSimbol").value = simbol || "BBB"; await P.c.t212Poarta();
  return Object.assign(P, { html: P.$("t212PoartaRez").innerHTML });
};
await test("3a înainte de deschidere (joi 08:00 New York): „închiderea de ieri $X”, nu „acum $X”, și avertismentul de salt peste stop", async () => {
  const r = await poartaLa(Date.parse("2026-10-15T12:00:00Z"), Date.parse("2026-10-14T22:00:00Z"));
  const a = antet(r.html);
  assert.match(a, /închiderea de ieri \$\d/, a);
  assert.doesNotMatch(a, /acum \$/, a);
  assert.match(r.html, /tbWarn">⚠️ [^<]*poate sări peste stop/);
});
await test("3b în ședință (joi 11:00 New York, bara de azi în formare): rămâne „acum $X”, fără avertisment", async () => {
  const r = await poartaLa(Date.parse("2026-10-15T15:00:00Z"), Date.parse("2026-10-15T15:00:00Z"));
  assert.match(antet(r.html), /acum \$\d/);
  assert.doesNotMatch(r.html, /poate sări peste stop/);
});
await test("3c după închidere în aceeași zi: „închiderea de azi”; sâmbătă „de ieri” (vinerea), duminică „din 16.10”; avertismentul peste tot", async () => {
  const s = await poartaLa(Date.parse("2026-10-14T22:00:00Z"), Date.parse("2026-10-14T22:00:00Z"));
  assert.match(antet(s.html), /închiderea de azi \$\d/); assert.match(s.html, /poate sări peste stop/);
  const sa = await poartaLa(Date.parse("2026-10-17T12:00:00Z"), Date.parse("2026-10-17T12:00:00Z"));
  assert.match(antet(sa.html), /închiderea de ieri \$\d/); assert.match(sa.html, /poate sări peste stop/);
  const du = await poartaLa(Date.parse("2026-10-18T12:00:00Z"), Date.parse("2026-10-18T12:00:00Z"));
  assert.match(antet(du.html), /închiderea din 16\.10 \$\d/); assert.match(du.html, /poate sări peste stop/);
});

// ================================================================ 4. pence față de lire (×100) pe pozițiile vii
// PRESUPUNERE (fără date reale T212): T212 dă prețul VUSA în pence (10984), Yahoo dă VUSA.L în lire (109,84)
await test("4a ActiuniSemnale.unitateBare: ~100 ⇒ barele ×100; ~0,01 ⇒ ×0,01; în ±30% sau altceva (o cădere de 45%) ⇒ neatinse", () => {
  const AS = cB.ActiuniSemnale, b = bareDin(3, 200, Date.parse("2026-10-14T22:00:00Z"), 109.84);
  assert.equal(typeof AS.unitateBare, "function", "lipsește ActiuniSemnale.unitateBare");
  const u = AS.unitateBare(b, 10984);
  assert.equal(u.factor, 100); assert.ok(Math.abs(u.bare[u.bare.length - 1].c - 10984) < 1e-6); assert.equal(u.bare[0].v, b[0].v); assert.equal(u.bare.length, b.length);
  assert.ok(Math.abs(u.bare[5].h / b[5].h - 100) < 1e-9 && Math.abs(u.bare[5].l / b[5].l - 100) < 1e-9 && Math.abs(u.bare[5].o / b[5].o - 100) < 1e-9);
  const p = AS.unitateBare(u.bare, 109.84); assert.equal(p.factor, 0.01); assert.ok(Math.abs(p.bare[p.bare.length - 1].c - 109.84) < 1e-9);
  for (const pret of [112, 95, 60, 200, null, 0]) { const x = AS.unitateBare(b, pret); assert.equal(x.factor, 1, "preț " + pret); assert.equal(x.bare, b); }
  assert.equal(AS.unitateBare([], 10984).factor, 1);
  assert.equal(AS.unitateBare(null, 10984).factor, 1);
});
await test("4b poziția vie VUSAl_EQ (T212 10984 p, barele Yahoo 109,84 £): stopul, ATR-ul și distanța de maxim sunt în pence", () => {
  const P = pagina(), tk = "VUSAl_EQ", b = bareDin(3, 320, Date.parse("2026-10-14T22:00:00Z"), 109.84);
  P.c.t212.bare[tk] = b;
  const x = { ticker: tk, quantity: 10, averagePrice: 10500, currentPrice: 10984, ppl: 40, initialFillDate: new Date(Date.parse("2026-08-20T10:00:00Z")).toISOString() };
  const p = P.c.t212PregatesteP(x, {});
  assert.ok(p.st.distMax52 > -0.6 && p.st.distMax52 < 0.3, "față de maximul pe 52 săpt.: " + p.st.distMax52);
  assert.ok(p.niv && p.niv.nivel === "ok", JSON.stringify(p.nivMotiv));
  assert.ok(p.niv.atr / 10984 > 0.001 && p.niv.atr / 10984 < 0.1, "ATR " + p.niv.atr + " față de prețul 10984");
  assert.ok(p.niv.stopPozitie > 10984 * 0.7 && p.niv.stopPozitie < 10984, "stopul " + p.niv.stopPozitie);
  assert.ok(p.maxDupaCumparare > 10984 * 0.7 && p.maxDupaCumparare < 10984 * 1.5, "maximul de după cumpărare " + p.maxDupaCumparare);
  assert.equal(p.unitate, 100);
  assert.ok(Math.abs(P.c.t212.bare[tk][P.c.t212.bare[tk].length - 1].c - 10984) < 1e-6, "barele din pagină rămân aliniate (graficul, rețeaua)");
  assert.match(P.c.t212RandPozitie(p), /prețurile zilnice veneau în lire, iar Trading 212 dă pence: le-am adus la unitatea din Trading 212 înainte de stop/, "nota se vede pe poziție");
  const p2 = P.c.t212PregatesteP(x, {});   // al doilea desen: barele sunt deja aliniate - nu se înmulțesc iar, nota rămâne
  assert.equal(p2.unitate, 100); assert.ok(Math.abs(p2.niv.atr - p.niv.atr) < 1e-9, "a doua oară: " + p2.niv.atr + " față de " + p.niv.atr);
});
await test("4c poziția americană (unitatea la fel): barele rămân aceleași, fără notă de unitate", () => {
  const P = pagina(), tk = "ABC_US_EQ", b = bareDin(3, 320, Date.parse("2026-10-14T22:00:00Z"), 50);
  P.c.t212.bare[tk] = b;
  const p = P.c.t212PregatesteP({ ticker: tk, quantity: 2, averagePrice: 48, currentPrice: 50.5, ppl: 3, initialFillDate: "2026-08-20T10:00:00Z" }, {});
  assert.equal(P.c.t212.bare[tk], b); assert.equal(p.unitate || null, null);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
