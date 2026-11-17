// Proba v100.357 (17.11.2026, el: „mai departe?” ⇒ „fa tot si livreaza”): I-896 (fișa fără barele de o oră ⇒ cel mult AȘTEAPTĂ; notele țin barele)
// + alerta dublă pe Discord (pusă la coadă = plecată).   node scripts/proba-v100357.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
new Function(lib("text-ro.js") + "; return TextRo;")();
const GC = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GC);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
console.log("\nV100.357 · fișa fără barele de o oră + alerta dublă · proba\n");
const MOTIV = /^n-am barele de o oră ale monedei, iar pe lumânări de 15 minute proba zice PORNEȘTE prea des pe date fără niciun avantaj \(~20% din monede, sub H0\): aștept barele de o oră ca să probez$/;

await test("🔑 S1 (I-896) verdictul comun: cu bare15, ce ar fi fost PORNEȘTE devine AȘTEAPTĂ cu motivul; fără bare15 neschimbat; un AȘTEAPTĂ / NU nu primește motivul în plus", () => {
  const bun = { antren: { mediana: 0.03, lichidari: 0 }, test: { mediana: 0.01, medie: 0.01, lichidari: 0 } }, o = { regim: { miscare: false }, stat: bun, zile: 30, pozitie: 0.5 };
  assert.equal(GC.verdict(o).nivel, "porneste");
  const v = GC.verdict(Object.assign({}, o, { bare15: true })); assert.equal(v.nivel, "asteapta"); assert.equal(v.motive.length, 1); assert.match(v.motive[0], MOTIV);
  const a = GC.verdict(Object.assign({}, o, { bare15: true, pozitie: 0.99 })); assert.equal(a.nivel, "asteapta"); assert.ok(!a.motive.some((m) => MOTIV.test(m)));
  const n = GC.verdict(Object.assign({}, o, { bare15: true, stat: { antren: { mediana: -0.01, lichidari: 0 }, test: null } })); assert.equal(n.nivel, "nu"); assert.ok(!n.motive.some((m) => MOTIV.test(m)));
});
await test("S2 (I-896) cei trei chemători dau bare15 după barele pe care au probat (fișa ×2, fereastra ÎNGUST / LARG)", () => {
  const P = lib("grid-proba.js"), L = lib("grid-plan.js");
  assert.equal((P.match(/cereT: pr\.barePeZi === C\.BARE_ZI_1H, bare15: pr\.barePeZi !== C\.BARE_ZI_1H/g) || []).length, 2);
  assert.match(L, /cereT: o\.bz === C\.BARE_ZI_1H, bare15: o\.bz !== C\.BARE_ZI_1H/);
});
await test("🔑 S3 (I-896) pe 12 monede de mers aleator (pași de 1 minut, fără direcție), proba doar pe 15 minute la H = 1: niciun PORNEȘTE; motivul nou apare unde altfel ar fi fost PORNEȘTE", () => {
  let porn = 0, cuMotiv = 0, ok = 0;
  for (let k = 0; k < 12; k++) {
    const r = mulberry(700000 + k), zile = 40, n = zile * 1440, s = (0.02 + 0.04 * r()) / Math.sqrt(1440), b = [], T = Date.UTC(2026, 3, 1); let p = 100, o = p, h = p, l = p;
    for (let i = 1; i <= n; i++) { const z = Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); p *= Math.exp(s * z - s * s / 2); if (p > h) h = p; if (p < l) l = p; if (i % 15 === 0) { b.push({ t: T + (i - 15) * 60000, o, h, l, c: p, v: 1 }); o = p; h = p; l = p; } }
    const b4 = []; for (let i = 0; i + 16 <= b.length; i += 16) { const g = b.slice(i, i + 16); b4.push({ t: g[0].t, o: g[0].o, h: Math.max(...g.map((x) => x.h)), l: Math.min(...g.map((x) => x.l)), c: g[15].c }); }
    const f = GP.fisa({ simbol: "SINT", pret: b[b.length - 1].c, b15: b.slice(-3000), b4h: b4.slice(-300), b1d: [], suma: 100, fundingZi: null, H: 1, dir: null, levier: null, minNotional: null, faraMc: true });
    if (f.eroare) continue; ok++; assert.equal(f.proba.barePeZi, 96);
    if (f.verdict.nivel === "porneste") porn++; if (f.verdict.motive.some((m) => MOTIV.test(m))) cuMotiv++;
  }
  assert.ok(ok >= 10, "fișe socotite: " + ok); assert.equal(porn, 0); assert.ok(cuMotiv >= 1, "cel puțin o fișă ar fi zis PORNEȘTE pe 15 minute (sub H0 ~20%): " + cuMotiv);
});
await test("S4 (I-896) notele fișelor țin pe ce bare s-a probat (24 = o oră, 96 = 15 minute; altceva ⇒ null)", () => {
  assert.match(citeste("public", "app.js"), /pr:pr,bare:f\.proba&&f\.proba\.barePeZi\|\|null/);
  const R = citeste("functions", "api", "istoric-bot.js"); assert.match(R, /bare:\[24,96\]\.includes\(nr\(n\.bare\)\)\?nr\(n\.bare\):null/);
});
await test("🔑 S5 (revizia 🔵7) alerta refuzată de Discord, pusă la coadă, e „plecată” pentru chemător (nu se mai pune încă o dată la tura următoare); ntfy neatins", () => {
  const C = citeste("scripts", "colector.mjs"), f = C.slice(C.indexOf("async function trimiteAlerta("), C.indexOf("async function ntfy("));
  const d = f.slice(f.indexOf('if (CANAL === "discord") {'));
  assert.match(d, /if \(!ok\) \{ coadaDiscord\.push\(/, "refuzată ⇒ la coadă"); assert.match(d, /return inKv \|\| ok \|\| !ok;/);
  assert.match(f, /if \(CANAL === "ntfy"\) \{ const ok = await ntfy\(m\); [^\n]*return inKv \|\| ok; \}/, "ntfy n-are coadă: rămâne cum era");
});
await test("S6 (I-896) comutatorul probaFara15 e doar al probelor vechi ale Monte Carlo pe fișă: niciun chemător real (pagina, colectorul, grid-plan, worker) nu-l dă", () => {
  for (const f of [["public", "app.js"], ["scripts", "colector.mjs"], ["public", "lib", "grid-plan.js"], ["public", "lib", "grid-sim-ecran.js"], ["public", "lib", "monte-simbol-ecran.js"], ["public", "lib", "grid-sim-worker.js"]])
    if (fs.existsSync(path.join(RAD, ...f))) assert.ok(!/probaFara15/.test(citeste(...f)), f.join("/"));
  assert.equal((lib("grid-proba.js").match(/bare15: pr\.barePeZi !== C\.BARE_ZI_1H && !o\.probaFara15/g) || []).length, 2);
});
await test("V versiunile v100.357 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO) + colector v101.195", () => {
  const h = citeste("public", "index.html"); assert.equal((h.match(/v100\.357/g) || []).length, 4); assert.match(h, /v100\.357 · FIȘA FĂRĂ BARE DE O ORĂ/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-357/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.357"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.357.0"); assert.match(p.scripts.test, /npm run test:v100356 && npm run test:v100357/);
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.badge, /^v100\.357/); assert.ok(bi.f357 && bi.tot356);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.195";/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
