// Proba v100.252 (22.10, el: fă ideile, verifică că nu se pierde nimic, aplică în app).
// Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const SRC = ["public/lib/grid-calcul.js", "public/lib/tablou-extra.js", "public/lib/semnale-bot.js", "public/lib/grafic-bot.js"].map((f) => citeste(f)).join("\n");
const GB = new Function(`${SRC}; return typeof GraficBot !== "undefined" ? GraficBot : null;`)();

let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.252 · CLAR · proba\n");

const T0 = 1_790_500_000_000, M5 = 5 * 60000;
function klines(n = 288) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = 0.62 - 0.054 * (i / (n - 1)) + 0.004 * Math.sin(i / 5), o = i ? out[i - 1].close : c;
    out.push({ time: T0 + i * M5, open: String(o), close: String(c), high: String(Math.max(o, c) * 1.002), low: String(Math.min(o, c) * 0.998), volume: String(1000 + 500 * Math.abs(Math.sin(i / 7))) });
  }
  return out.reverse();
}
const BOT = { id: "2386", baza: "JTO.PERP", directie: "long", levier: 5, investit: 98.14, profitTotal: -21.97, pretCurent: 0.566, gridJos: 0.5722, gridSus: 0.6572, pretDeschidere: 0.59176, pretLichidare: 0.4712485, distantaLichidarePct: 16.76, opritorPierdere: 0.5455, opritorPierdereActiv: true, ordinePerechi: 10, brut: { buOrderData: { row: 18, gridType: "arithmetic", bottom: "0.5722", top: "0.6572" } } };
const NIV = () => GB.niveluriBot({ bot: BOT, zero: 0.59512, planPlus: { pret: 0.60192, usdt: 5.2 }, planMinus: { pret: 0.57563, usdt: 14.9 } });
const ST = { bb: true, ema: true, rsi: true, vp: true };
const desen = (o) => GB.desen({ bare: GB.bare(klines()), W: 1000, ingust: false, st: ST, niv: NIV(), grila: { jos: 0.5722, sus: 0.6572, n: 18, geo: false }, alerte: [], per: "24h", ...o });

await test("aceeași scriere de preț ca scara, straturile rămân", () => {
  assert.equal(typeof GB.fmtP, "function");
  assert.equal(GB.fmtP(0.566), "0.5660");
  assert.equal(GB.fmtP(0.5989), "0.5989");
  assert.notEqual(GB.fmtP(0.5989), "0.59890");
  const d = desen();
  assert.equal(d.harta.f, 1);
  assert.equal(d.harta.gut, 52);
  assert.equal(d.harta.plotW, 948);
  assert.equal(d.harta.mainH, 540);
  assert.equal((d.svg.match(/class="gbC"/g) || []).length, 288);
  assert.equal((d.svg.match(/<text class="gbAxa"/g) || []).length, 3);
  assert.equal((d.svg.match(/class="gbAxaAcum"/g) || []).length, 1);
  assert.equal((d.svg.match(/class="gbCruce"/g) || []).length, 1);
  assert.match(d.svg, /class="gbCruceY"/);
  assert.match(d.svg, /class="gbCrucePret"/);
  assert.match(d.svg, /<g class="gbPretAcum"><rect x="1"/);
  assert.match(d.svg, /#26A96C/);
  assert.doesNotMatch(d.svg, /<script>/);
  assert.doesNotMatch(d.svg + d.valori, /NaN|undefined/);
  const tag = d.svg.match(/<g class="gbAxaAcum">[\s\S]*?<text[^>]*>([^<]+)<\/text>/);
  assert.ok(tag);
  assert.equal(tag[1], GB.fmtP(Number(tag[1])));
});

await test("prețurile din scară nu se calcă, barele de volum lasă ultima lumânare", () => {
  const d = desen();
  const ys = [...d.svg.matchAll(/<text class="gbAxa"[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(ys.length, 3);
  const tagY = Number(d.svg.match(/class="gbAxaAcum"[\s\S]*?<text[^>]* y="([\d.]+)"/)[1]);
  for (const y of ys) assert.ok(Math.abs(y - tagY) >= 16, y + " lângă " + tagY);
  const vps = [...d.svg.matchAll(/<rect class="gbVp" x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/g)];
  assert.ok(vps.length > 0, "profilul de volum rămâne");
  const drept = Math.max(...vps.map((m) => Number(m[1]) + Number(m[2])));
  const lumanari = [...d.svg.matchAll(/<g class="gbC"><line[^>]*\/><rect x="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(lumanari.length, 288);
  const ultima = Math.max(...lumanari);
  assert.ok(drept < ultima, "profilul " + drept + " acoperă lumânarea " + ultima);
  assert.match(d.svg, /cel mai tranzacționat/);
});

await test("„aproape” e în rând, nu doar în CSS, iar „acum” rămâne nemarcat", () => {
  const d = desen();
  const lis = [...d.valori.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ atr: m[1], corp: m[2] }));
  const marcate = lis.filter((x) => /class="gbAproape"/.test(x.atr));
  assert.equal(marcate.length, 1);
  assert.match(marcate[0].corp, /<span class="gbVN">[^<]* · aproape<\/span><b class="gbVP">/);
  assert.doesNotMatch(marcate[0].corp, /<span class="gbAproape">/);
  const nume = (corp) => corp.match(/<span class="gbVN">([^<]*)/)[1];
  assert.doesNotMatch(nume(marcate[0].corp).replace(/ · aproape$/, ""), /^acum$/);
  const acum = lis.find((x) => nume(x.corp) === "acum");
  assert.ok(acum);
  assert.doesNotMatch(acum.corp, /aproape/);
  const css = citeste("public", "app.css");
  const vechi = css.indexOf('li.gbAproape .gbVN::after{content:" · aproape"');
  const stins = css.indexOf("li.gbAproape .gbVN::after{content:none}");
  assert.ok(vechi >= 0 && stins > vechi, [vechi, stins].join(","));
  const tel = desen({ W: 400, ingust: true });
  assert.equal(tel.harta.mainH, 270);
  assert.equal(tel.harta.gut, 0);
  assert.match(tel.valori, / · aproape/);
});

await test("jgheabul arată prețul, șirurile vechi rămân, ultima linie CSS rămâne", () => {
  const g = citeste("public", "lib", "grafic-bot.js");
  for (const s of ["plotW - w", "Math.abs(y - yAcum) < 13", "yAcum + 14", "var scara = ingust ? 0 : 52", "o.scara === false", "var cmp = true", "Math.max(1, Math.min(11, cw * 0.72))", "ingust ? 34 : 54", "plotW - 6", "gbAxaAcum", "gbCrucePret"]) assert.ok(g.includes(s), "lipsește " + s);
  const app = citeste("public", "app.js");
  assert.match(app, /inJgheab/);
  assert.match(app, /GraficBot\.fmtP\(pY\)/);
  assert.match(app, /tbPretScurt\(pY\)/);
  assert.match(app, /st:tbIndStare\(\),scara:tbIndStare\(\)\.scara/);
  const css = citeste("public", "app.css");
  const i340 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 340px}");
  const i280 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 280px}");
  const i240 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 240px}");
  assert.ok(i340 >= 0 && i280 > i340 && i240 > i280);
  assert.match(css, /#tabloubot #tbTrendCard\{grid-column:auto;grid-row:auto;flex:1 1 auto/);
  assert.match(css, /#tabloubot #tbTrendCard\{flex:0 0 auto\}/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("versiunea de la v100.252 în sus, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 252, P.version);   /* v100.253: insigna live nu mai e CLAR */
  assert.equal(P.scripts["test:v100252"], "node scripts/proba-v100252.mjs");
  assert.equal((P.scripts.test.match(/test:v100252/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100251/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100252"], /npm run test:v100252/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.engineContract, "54.1");
  assert.match(info.features.clar252, /aproape/);
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
