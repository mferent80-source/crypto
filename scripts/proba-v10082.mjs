// Proba v100.82 (03.10, el: „fa idei”) - (1) toate ideile de acțiuni care trec de poartă, nu doar primele 5: colectorul le trimite în
// `restul` (primele 5 rămân EXACT ca înainte - Discord, urmărirea și tabelul nu se schimbă), ruta le păstrează curățate fără să le
// pună în urmărire, pagina le arată pliate sub tabel („Vezi și celelalte N…”); (2) pe Acasă, sub cele două verdicte, rândul
// „💡 Ce aș cumpăra azi” cu primele acțiuni și monede și butoanele spre cele două panouri (el nu le găsea).
//   node scripts/proba-v10082.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { turaIdei } from "./lib/tura-idei.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.82 · toate ideile de acțiuni + „Ce aș cumpăra azi” pe Acasă");

// ---- (1) tura ideilor: primele 5 + restul
const SC = { S0: [true, 30], S1: [true, 90], S2: [true, 10], S3: [true, 70], S4: [true, 50], S5: [true, 80], S6: [true, 60], S7: [false, 99], S8: [false, 95] };
function deps(tab) {
  const R = {}; for (const [s, [trece, scor]] of Object.entries(tab)) R[s + "_US_EQ"] = { trece, scor, pret: 10, intrare: 10, stop: 9, tinta: 12, motive: ["a", "b", "c"] };
  return { tickere: Object.keys(R), inchise: [], Idei: { judecaActiune: (b, p, o) => R[o.simbol], alegeActiuni: ID.alegeActiuni }, pauza: async () => {}, jurnal: () => {}, acum: 0,
    simbol: (tk) => tk.split("_")[0], cereBare: async () => [{ t: 0, o: 1, h: 1, l: 1, c: 1 }], cereRezultate: async () => null };
}
await test("(1) tura ideilor: primele 5 rămân exact ca înainte (după scor), celelalte care trec de poartă vin în `restul`, tot după scor", async () => {
  const r = await turaIdei(deps(SC));
  assert.deepEqual(r.actiuni.map((x) => x.simbol), ["S1", "S5", "S3", "S6", "S4"]); assert.equal(r.trecute, 7);
  assert.ok(Array.isArray(r.restul), "`restul` lipsește"); assert.deepEqual(r.restul.map((x) => x.simbol), ["S0", "S2"]);
  assert.equal(r.restul[0].intrare, 10, "restul are aceleași câmpuri ca ideile");
});
await test("(1) tura ideilor: `restul` are cel mult 40 (KV-ul rămâne mic) și e gol când trec cel mult 5", async () => {
  const mult = {}; for (let i = 0; i < 50; i++) mult["T" + i] = [true, 1000 - i];
  const r = await turaIdei(deps(mult)); assert.equal(r.actiuni.length, 5); assert.equal(r.restul.length, 40); assert.equal(r.restul[0].simbol, "T5"); assert.equal(r.trecute, 50);
  const putine = await turaIdei(deps({ A: [true, 5], B: [false, 9] })); assert.deepEqual(putine.restul, []);
});

// ---- (1) ruta: `restul` curățat, fără urmărire
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "token-de-proba-v10082";
async function cheama(metoda, qs, env, corp) {
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href + "?t=" + Date.now() + "_" + Math.random());
  const h = { "cf-connecting-ip": "10.0.0.82", authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const req = new Request("https://exemplu.test/api/t212?" + qs, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}
const idee = (s, x) => ({ ticker: s + "_US_EQ", simbol: s, pret: 10, intrare: 10, stop: 9, tinta: 12, scor: 50, motive: ["m1", "m2", "m3"], istoric: { n: 0, pePlus: 0, total: 0 }, ...x });
await test("(1) ruta: `restul` se păstrează curățat (aceleași câmpuri ca ideile), cel mult 40, și NU intră în urmărire (istoricul ideilor rămâne pe primele 5)", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const p = await cheama("POST", "action=idei", env, { la: 5, zi: "2026-10-03", judecate: 201, trecute: 5, actiuni: [idee("AAA"), idee("BBB")], restul: [idee("CCC"), idee("DDD", { rau: "<x>" }), idee("EEE")], urmarire: null, ndx: [] });
  assert.equal(p.status, 200, JSON.stringify(p.d));
  const g = (await cheama("GET", "action=idei", env)).d;
  assert.ok(g.idei && Array.isArray(g.idei.restul), "`restul` nu s-a păstrat: " + JSON.stringify(g.idei).slice(0, 200));
  assert.deepEqual(g.idei.restul.map((x) => x.simbol), ["CCC", "DDD", "EEE"]); assert.ok(!("rau" in g.idei.restul[1]), "câmp necurățat"); assert.equal(g.idei.restul[0].intrare, 10);
  assert.deepEqual(g.istoric.map((x) => x.simbol).sort(), ["AAA", "BBB"], "restul a intrat în urmărire");
  const mult = Array.from({ length: 50 }, (_, i) => idee("R" + i));
  await cheama("POST", "action=idei", env, { la: 6, zi: "2026-10-03", judecate: 201, trecute: 55, actiuni: [idee("AAA")], restul: mult, ndx: [] });
  assert.equal((await cheama("GET", "action=idei", env)).d.idei.restul.length, 40);
});
await test("(1) colectorul trimite `restul` serverului (și urmărirea rămâne pe primele 5)", () => {
  assert.match(citeste("scripts", "colector.mjs"), /trimite\("\/api\/t212\?action=idei", \{[^}]*restul: r\.restul/);
});

// ---- (1) pagina: „Vezi și celelalte N…” pliat sub tabel
function deseneazaIdei(id) {
  const box = { innerHTML: "" };
  const ctx = { $: (k) => (k === "t212Idei" ? box : null), t212: { idei: { idei: id } }, escapeHtml: esc, TextRo: globalThis.TextRo, t212ZiScurta: (z) => String(z).slice(8, 10) + "." + String(z).slice(5, 7),
    t212Usd: (v) => "$" + v, t212Lei: (v) => v + " lei", t212Pct: (v) => v + "%", t212IdeiSit: () => "", t212ReveniriHtml: () => "" };
  vm.createContext(ctx);
  // t212Cate e pe un singur rând (dedesubt e `var t212 = {…}`, care ar acoperi datele probei)
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "t212IdeiRand") + "\n" + fnDin("t212-ecran.js", "t212IdeiRender") + "\n;t212IdeiRender();", ctx);
  return box.innerHTML;
}
const CINCI = ["LITE", "DELL", "ARM", "INTC", "NBIS"].map((s) => idee(s));
await test("(1) pagina: sub tabel, pliat, „Vezi și celelalte N acțiuni care trec de poartă” cu aceleași coloane; primele 5 rămân în tabelul de sus", () => {
  const h = deseneazaIdei({ zi: "2026-10-02", judecate: 201, trecute: 7, actiuni: CINCI, restul: [idee("AMD"), idee("TSLA")] });
  const i = h.indexOf('<details class="t212IdeiRest">'); assert.ok(i > 0, "lipsește blocul pliat");
  assert.equal((h.slice(0, i).match(/<tr><td><b>/g) || []).length, 5, "tabelul de sus are tot 5 rânduri");
  assert.match(h.slice(i), /<summary>Vezi și celelalte 2 acțiuni care trec de poartă<\/summary>/);
  assert.match(h.slice(i), /<th>Acțiune<\/th><th>Acum<\/th><th>Intrare<\/th><th>Stop<\/th><th>Țintă<\/th><th>Istoricul tău<\/th>/);
  assert.ok(h.slice(i).includes("<b>AMD</b>") && h.slice(i).includes("<b>TSLA</b>") && h.slice(i).includes("t212BiletPentru('TSLA')"), "rândurile restului (cu „Biletul”)");
});
await test("(1) pagina: o singură idee în plus -> „Vezi și cealaltă acțiune care trece de poartă”; fără `restul` (ideile de ieri) -> nimic în plus", () => {
  assert.match(deseneazaIdei({ zi: "2026-10-02", judecate: 201, trecute: 6, actiuni: CINCI, restul: [idee("AMD")] }), /<summary>Vezi și cealaltă acțiune care trece de poartă<\/summary>/);
  assert.ok(!deseneazaIdei({ zi: "2026-10-02", judecate: 201, trecute: 24, actiuni: CINCI }).includes("t212IdeiRest"));
});

// ---- (2) Acasă: „💡 Ce aș cumpăra azi”
function cumpar(d) {
  const ctx = { escapeHtml: esc }; vm.createContext(ctx);
  vm.runInContext(fnDin("acasa-ecran.js", "acClasamentSumar") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar") + "\n;this.f=acasaCumpar;", ctx);
  return ctx.f(d);
}
const CL = { monede: [{ simbol: "PONS_USDT_PERP", stare: "candidat", scor: 8 }, { simbol: "BTC_USDT_PERP", stare: "evita" }, { simbol: "LIT_USDT_PERP", stare: "candidat", scor: 9 }, { simbol: "VVV_USDT_PERP", stare: "candidat", scor: 7 }, { simbol: "PENDLE_USDT_PERP", stare: "candidat", scor: 6 }] };
const IDEI = { idei: { zi: "2026-10-02", judecate: 201, trecute: 24, actiuni: CINCI } };
await test("(2) Acasă: „💡 Ce aș cumpăra azi” - primele 3 acțiuni cu cifrele zilei, primele 3 monede candidate, două butoane spre panouri", () => {
  const h = cumpar({ idei: IDEI, clasament: CL });
  assert.ok(text(h).startsWith("💡 Ce aș cumpăra azi: acțiunile LITE, DELL, ARM (24 din 201 trec de poartă pe 02.10) · un bot pe LIT, PONS sau VVV"), text(h));
  assert.match(h, /<button class="acBtn" type="button" data-action-click="acasaMergiLa\('t212','t212Idei'\)">Idei de cumpărare<\/button>/);
  assert.match(h, /<button class="acBtn" type="button" data-action-click="acasaMergiLa\('tabloubot','tbIdei'\)">Pe ce aș porni un bot<\/button>/);
});
await test("(2) Acasă: stările - fără idei / nicio acțiune / fără clasament / nicio monedă; o acțiune și una, două monede", () => {
  assert.match(text(cumpar({ idei: null, clasament: CL })), /^💡 Ce aș cumpăra azi: acțiuni: aștept ideile · /);
  assert.match(text(cumpar({ idei: { idei: { zi: "2026-10-02", judecate: 201, trecute: 0, actiuni: [] } }, clasament: CL })), /acțiuni: pe 02\.10 niciuna nu trece de poartă · /);
  assert.match(text(cumpar({ idei: IDEI, clasament: null })), / · boți: aștept clasamentul/);
  assert.match(text(cumpar({ idei: IDEI, clasament: { monede: [{ simbol: "BTC_USDT_PERP", stare: "evita" }] } })), / · boți: acum nicio monedă nu e candidată/);
  assert.match(text(cumpar({ idei: { idei: { zi: "2026-10-02", judecate: 201, trecute: 1, actiuni: [idee("LITE")] } }, clasament: { monede: [CL.monede[2], CL.monede[0]] } })),
    /acțiunea LITE \(1 din 201 trece de poartă pe 02\.10\) · un bot pe LIT sau PONS/);
});
await test("(2) Acasă: rândul stă sub cele două verdicte, înaintea legăturii BTC–bursa, și se desenează la fiecare desen al paginii", () => {
  const h = citeste("public", "index.html"), v = h.indexOf('class="acVerdicte"'), c = h.indexOf('<div class="acLegatura acCumpar" id="acCumpar"></div>'), l = h.indexOf('id="acLegatura"');
  assert.ok(v > 0 && c > v && c < l, "locul: " + [v, c, l].join(","));
  assert.match(fnDin("acasa-ecran.js", "acasaDeseneaza"), /if \(\$\("acCumpar"\)\) \$\("acCumpar"\)\.innerHTML = acasaCumpar\(d\);/);
});
await test("(2) butonul deschide pagina și aduce panoul sus (fără animație), SUB bara de sus lipită (pe poză titlul stătea sub ea: 56 px pe calculator, 156 pe telefon)", () => {
  // o singură derulare, INSTANT, la ținta socotită: html are scroll-behavior:smooth, iar scrollIntoView + scrollBy se anulau (pagina rămânea sus)
  const apeluri = [], el = { getBoundingClientRect: () => ({ top: 659 }), scrollIntoView: (o) => apeluri.push(["scroll", o]) };
  const ctx = { navTo: (a, b) => apeluri.push(["navTo", a, b]), $: (k) => (k === "t212Idei" ? el : null), setTimeout: (f) => f(),
    document: { querySelector: (s) => (s === "header.topStatus" ? { getBoundingClientRect: () => ({ bottom: 56 }) } : null) },
    window: { scrollY: 0, scrollTo: (o) => apeluri.push(["scrollTo", o]), scrollBy: (x, y) => apeluri.push(["scrollBy", x, y]) } }; vm.createContext(ctx);
  vm.runInContext(fnDin("acasa-ecran.js", "acasaMergiLa") + "\n;acasaMergiLa('t212','t212Idei');", ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(apeluri)), [["navTo", "t212", true], ["scrollTo", { top: 595, behavior: "instant" }]]);   // obiectele din vm au alt prototip
});

console.log("\n" + (pica ? "V100.82 PICA · " + pica + " din " + (ok + pica) : "V100.82 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
