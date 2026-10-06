// Proba v100.107 (06.10, el: „repară și minorele”) - minorele rămase din revizia de cod a v100.106 + rândul contului care ieșea
// din pagină pe telefon (găsit la poza de 390 px).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js", "grafic-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Consiliu: C, GraficBot: GB } = globalThis;
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.107 · minorele din revizia v100.106 · proba\n");

const rand5 = (n, pas, f) => Array.from({ length: n }, (_, i) => { const c = f(i); return { time: 1e12 + i * pas, open: c, high: c * 1.002, low: c * 0.998, close: c, volume: 10 }; });
const SUS = (pas) => rand5(200, pas, (i) => 1 + i * 0.002 + (i % 3 ? 0.0015 : -0.002));

await test("(1) alerta tăcută: același vocabular ca încrederea - „nu-l trimit pe Discord: pe boții tăi nu bate întâmplarea” (rândul ≤ 160) (nu „tăcut … hazardul”)", () => {
  const s = citeste("public", "lib", "alerte.js");
  assert.doesNotMatch(s, /n-a bătut hazardul/); assert.match(s, /nu-l trimit pe Discord: pe boții tăi nu bate întâmplarea/);
});
await test("(2) semaforul: ADX și RSI pe aceleași bare ca graficul și rândul „ADX 14” (cu bara în formare) - aceeași cifră pe TF-ul graficului", () => {
  const r = SUS(3e5), s = GB.semafor({ "5M": r }, "long")[0], b = GB.bare(r);
  assert.equal(Math.round(s.adx), Math.round(GB.adx(b, 14).adx[b.length - 1]));
  assert.equal(Math.round(s.rsi), Math.round(GB.rsi(b.map((x) => x.c), 14)[b.length - 1]));
});
await test("(3) graficul îngust (telefon mic): cutia semaforului încape în zona prețurilor, nu intră peste etichetele din dreapta", () => {
  const raw = GB.bare(SUS(3e5)).slice(-120), sem = GB.semafor({ "5M": SUS(3e5) }, "long");
  for (const W of [300, 330, 360]) {
    const d = GB.desen({ bare: raw, W, ingust: true, st: { ema: true }, simplu: true, niv: [], semafor: sem, tfGrafic: "5M" });
    const lat = Number(/class="gbSemFond" x="8" y="8" width="([\d.]+)"/.exec(d.svg)[1]);
    assert.ok(8 + lat <= d.harta.plotW, W + ": cutia " + (8 + lat) + " > zona prețurilor " + d.harta.plotW);
  }
});
await test("(4) „de ce s-a schimbat”: textele noi nu se mai „traduc” - un titlu cu „ · − ” rămâne cum e", () => {
  assert.equal(C.deCeAfisat("din 🟢 Ține în 🟡 Atenție · a apărut: Stopul la 12% · − 5% azi", 5), "Verdictul s-a schimbat acum 5 min, din 🟢 Ține în 🟡 Atenție · a apărut: Stopul la 12% · − 5% azi · cifrele sunt cele de atunci");
});
await test("(5) marginea la mai puțin de 0,05%: „marginea de jos e chiar la preț”, nu „−0,0%”", () => {
  const c = C.alcatuieste({ sm: { nivel: "atentie", cod: "x", motiv: "x", faCe: "" }, concret: [], sfaturi: [{ cod: "margine", ton: "atentie", titlu: "Marginea de jos (1) e cu 0,0% sub preț", pctJos: 0.03, zile: 40, text: "x", faCe: "" }], consilier: [], socoteala: {} });
  assert.equal(c.titlu, "Marginea de jos e chiar la preț, atinsă în 40% din zile");
});
await test("(6) fără modulul Directie (alt chemător), graficul nu rezervă banda de trend", () => {
  assert.match(citeste("public", "lib", "grafic-bot.js"), /trH = Array\.isArray\(o\.semafor\) && typeof Directie !== "undefined" \?/);
});
await test("(7) telefon: rândurile contului (Balances / Open Orders) derulează în cutia lor, nu lățesc pagina", () => {
  assert.match(citeste("public", "app.css"), /\.accountRows\{display:grid;gap:5px;margin-top:10px;overflow:auto;min-width:0;max-width:100%\}/);
});
await test("(E) versiunea v100.107 peste tot", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1\d\d"/); assert.match(html, /id="sideVersiune"[^>]*>v100\.1\d\d/); assert.match(html, /id="antetVersiune">v100\.1\d\d/); assert.match(html, /id="healthAppVersion">v100\.1\d\d</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1\d\d\.0$/);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1\d\d";/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
