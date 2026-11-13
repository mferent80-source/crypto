// Proba v100.334 · scara graficului „Listele Radarului” (13.11, pe Radarul viu după v100.333): o singură zi de short (29.10, AKE −90% în 7 zile,
// față de piață +86,3 pp, reală - verificată pe lumânările Pionex) ținea scara la ±86,3 pp, iar celelalte 59 de zile (|e| median ~5 pp) ieșeau plate.
// Regula: scara fără valoarea ieșită din rând (cea mai mare > 2,5 × următoarea, cel mult 2 așa); bara ei atinge marginea, are o ruptură,
// cifra adevărată rămâne în hover și e scrisă sub grafic.   node scripts/proba-v100334-scara.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<title>[^<]*<\/title>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); } }
console.log("\nV100.334 · scara graficului „Listele Radarului” · proba\n");

const IB = new Function(lib("indicatori-bot.js") + "; return IndicatoriBot;")();
const z = (zi, e, n) => ({ zi, n: n || 2, lista: e, piata: 0, exces: e });
// cifrele de pe server (13.11): revenire până la ±15,6 pp; short cu 29.10 = +86,3 pp, apoi −26,1 pp
const REV = { zile: 4, peZile: [z("2026-10-05", -0.09), z("2026-10-26", 0.1497), z("2026-10-29", -0.1557), z("2026-11-05", 0.02)] };
const SH = { zile: 4, peZile: [z("2026-10-12", -0.261), z("2026-10-23", -0.1531), z("2026-10-29", 0.8629, 1), z("2026-11-05", 0.03)] };
const bare = (h) => [...h.matchAll(/<rect class="lrBar( lrTaiat)?" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => ({ taiat: !!m[1], y: +m[3], h: +m[5] }));

await test("1 · scara nu urmează ziua ieșită din rând: ±28,7 pp (26,1 × 1,1), nu ±86,3 pp", () => {
  const h = IB.listeGraficHtml({ revenire: REV, short: SH }, esc), t = text(h);
  assert.match(t, /\+28,7 pp piața −28,7 pp/); assert.doesNotMatch(t, /\+86,3 pp piața/);   /* v100.335: scara scrisă pe axă */
});
await test("2 · bara tăiată: atinge marginea, are clasa lrTaiat și o ruptură; celelalte nu", () => {
  const h = IB.listeGraficHtml({ revenire: REV, short: SH }, esc), b = bare(h);
  const t = b.filter((x) => x.taiat); assert.equal(t.length, 1, "o singură bară tăiată");
  const hMax = Math.max(...b.map((x) => x.h)); assert.ok(Math.abs(t[0].h - hMax) < 1e-9, "bara tăiată nu atinge marginea");
  assert.equal((h.match(/<line class="lrRupt"/g) || []).length, 1, "ruptura");
  // −26,1 pp (12.10) e acum o bară înaltă, nu o liniuță: ≥ 80% din înălțimea maximă
  const z1210 = b[4]; assert.ok(z1210.h / hMax > 0.8, "a doua cea mai mare zi tot plată: " + (z1210.h / hMax).toFixed(2));
});
await test("3 · cifra adevărată rămâne: în hover (+86,3 pp) și scrisă sub grafic, cu ziua", () => {
  const h = IB.listeGraficHtml({ revenire: REV, short: SH }, esc);
  assert.ok(/<title>29\.10: lista \+86,3% · piața \+0,0% · față de piață \+86,3 pp · 1 monedă<\/title>/.test(h), "hover-ul zilei tăiate");
  assert.match(text(h), /29\.10 \(short\): \+86,3 pp, peste scară/);
});
await test("4 · fără valoare ieșită din rând, scara rămâne cea mai mare abatere (ca în v100.333)", () => {
  const h = IB.listeGraficHtml({ revenire: REV, short: { zile: 2, peZile: [z("2026-10-12", -0.12), z("2026-10-23", 0.05)] } }, esc);
  assert.match(text(h), /\+15,6 pp piața −15,6 pp/); assert.doesNotMatch(h, /lrTaiat/); assert.doesNotMatch(text(h), /peste scară/);
});
await test("5 · CSS: bara tăiată mai ștearsă, ruptura în culoarea fondului", () => {
  const C = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8");
  assert.match(C, /#tabloubot \.lrBar\.lrTaiat\{fill-opacity:\.6\}/); assert.match(C, /#tabloubot \.lrRupt\{stroke:var\(--pzF1\);stroke-width:2;pointer-events:none\}/);
});

console.log(`\n${picate ? "PICĂ" : "trec"} ${teste - picate}/${teste}`);
process.exit(picate ? 1 : 0);
