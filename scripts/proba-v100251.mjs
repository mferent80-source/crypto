// Proba v100.251 (22.10, el: toate cele 6 idei, și încă o dată că nu se pierde nimic).
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
console.log("\nV100.251 · AXĂ · proba\n");

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
const ALERTE = [
  { t: T0 + 200 * M5, nivel: "info", titlu: "JTO: grilă atinsă — a cumpărat la ~0.58810" },
  { t: T0 + 201 * M5, nivel: "atentie", titlu: "JTO: BTC a intrat în mișcare" },
  { t: T0 + 202 * M5, nivel: "critic", titlu: "JTO: planul tău — ieși (pierderea a atins 14.9 USDT)" },
  { t: T0 + 280 * M5, nivel: "atentie", titlu: "JTO: <script>alert(1)</script> prețul e la marginea de jos" },
];
const ST = { bb: true, ema: true, rsi: true, vp: true };
const desen = (o) => GB.desen({ bare: GB.bare(klines()), W: 1000, ingust: false, st: ST, niv: NIV(), grila: { jos: 0.5722, sus: 0.6572, n: 18, geo: false }, alerte: ALERTE, per: "24h", ...o });
const txt = (d) => (d.svg + " " + (d.valori || "")).replace(/<title>[^<]*<\/title>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

await test("la 1000 px straturile rămân, scara are trei prețuri plus prețul de acum, ecusonul stă în stânga", () => {
  const d = desen();
  assert.equal(d.harta.f, 1);
  assert.equal(d.harta.gut, 52);
  assert.equal(d.harta.plotW, 948);
  assert.equal(d.harta.mainH, 540);
  assert.equal((d.svg.match(/class="gbC"/g) || []).length, 288);
  assert.equal((d.svg.match(/class="gbV"/g) || []).length, 288);
  assert.equal((d.svg.match(/<text class="gbAxa"/g) || []).length, 3);
  assert.equal((d.svg.match(/class="gbAxaAcum"/g) || []).length, 1);
  const xs = [...d.svg.matchAll(/<text class="gbAxa" x="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(xs.every((x) => x > d.harta.plotW), xs.join(","));
  const tag = d.svg.match(/<g class="gbAxaAcum">([\s\S]*?)<\/g>/);
  assert.ok(tag);
  const tx = Number(tag[1].match(/<text x="([\d.]+)"/)[1]);
  assert.ok(tx > d.harta.plotW && tx <= 1000, "prețul de acum stă în scară, nu peste lumânări: " + tx);
  assert.match(d.svg, /<g class="gbPretAcum"><rect x="1"/);
  assert.match(d.svg, /class="gbScala"/);
  assert.match(d.svg, /class="gbCruceY"/);
  assert.match(d.svg, /class="gbCruce"/);
  assert.match(d.svg, /class="gbCrucePret"/);
  assert.equal((d.svg.match(/class="gbCruce"/g) || []).length, 1, "o singură cruce verticală");
  assert.match(d.svg, /aria-label="Prețul cu gridul, planul și alertele botului"/);
  for (const cls of ["gbBanda", "gbRsi", "gbEma20", "gbEma50", "gbBb", "gbViu", "gbTreapta"]) assert.match(d.svg, new RegExp("class=\"" + cls + "\""));
  assert.match(txt(d), /zero-ul botului/);
  assert.match(txt(d), /plan −14\.9 USDT/);
  assert.match(txt(d), /plan \+5\.2 USDT/);
  assert.match(txt(d), /intrarea medie/);
  assert.match(txt(d), /grid sus/);
  assert.match(txt(d), /lichidare/);
  assert.match(txt(d), /grid jos/);
  assert.match(txt(d), /stopul tău/);
  assert.match(txt(d), /cel mai tranzacționat/);
  assert.equal((d.svg.match(/class="gbE"/g) || []).length, 2);
  assert.match(d.svg, /#26A96C/);
  assert.doesNotMatch(d.svg, /<script>/);
  assert.doesNotMatch(d.svg + d.valori, /NaN|undefined/);
});

await test("rândul cel mai aproape de acum e marcat, rândul „acum” nu", () => {
  const d = desen();
  const lis = [...d.valori.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ atr: m[1], corp: m[2] }));
  const marcate = lis.filter((x) => /class="gbAproape"/.test(x.atr));
  assert.equal(marcate.length, 1);
  assert.match(marcate[0].corp, /<span class="gbVN">[^<]+<\/span><b class="gbVP">/);
  assert.doesNotMatch(marcate[0].corp, /<span class="gbAproape">/);
  assert.doesNotMatch(marcate[0].corp, /<span class="gbVN">acum</);
  assert.match(citeste("public", "app.css"), /li\.gbAproape \.gbVN::after\{content:" · aproape"/);
  const pret = (corp) => Number(corp.match(/<b class="gbVP">([^<]+)<\/b>/)[1]);
  const nume = (corp) => corp.match(/<span class="gbVN">([^<]*)/)[1];
  const acum = lis.find((x) => nume(x.corp) === "acum");
  assert.ok(acum);
  assert.doesNotMatch(acum.atr, /gbAproape/);
  const p0 = pret(acum.corp);
  const dist = (x) => Math.abs(pret(x.corp) - p0);
  const rest = lis.filter((x) => x !== acum && nume(x.corp) !== "botul pornit");
  const min = Math.min(...rest.map(dist));
  assert.ok(Math.abs(dist(marcate[0]) - min) < 1e-9, "marcat " + nume(marcate[0].corp) + " nu e cel mai aproape");
});

await test("scara oprită scoate banda, telefonul rămâne 270, acțiunile rămân 340–520", () => {
  const off = desen({ scara: false });
  assert.equal(off.harta.gut, 0);
  assert.equal(off.harta.plotW, 1000);
  assert.equal(off.harta.mainH, 540);
  assert.equal((off.svg.match(/<text class="gbAxa"/g) || []).length, 0);
  assert.doesNotMatch(off.svg, /gbAxaAcum/);
  assert.doesNotMatch(off.svg, /class="gbScala"/);
  assert.equal((off.svg.match(/class="gbC"/g) || []).length, 288);
  assert.match(off.svg, /<g class="gbPretAcum"><rect x="1"/);
  assert.match(off.valori, /class="gbAproape"/);
  const tel = desen({ W: 400, ingust: true });
  assert.equal(tel.harta.mainH, 270);
  assert.equal(tel.harta.plotW, 400);
  assert.equal(tel.harta.gut, 0);
  assert.equal((tel.svg.match(/<text class="gbAxa"/g) || []).length, 0);
  assert.doesNotMatch(tel.svg, /gbAxaAcum/);
  assert.match(tel.svg, /<g class="gbPretAcum"><rect x="1"/);
  const act = GB.desen({ bare: GB.bare(klines(80)), W: 820, ingust: false, actiune: true, st: { ema: true }, niv: [], grila: {} });
  assert.ok(act.harta.mainH >= 340 && act.harta.mainH <= 520);
  assert.equal(act.harta.mainH, 340);
  assert.ok(act.harta.plotW < 820);
  assert.equal(act.harta.gut, 52);
});

await test("coloana de 240 vine după 280 și 340, trendul vechi rămâne în fișier, ultima linie CSS rămâne", () => {
  const g = citeste("public", "lib", "grafic-bot.js");
  for (const s of ["Math.max(210, Math.min(300, W * 0.18))", "Math.max(360, Math.min(460, W * 0.46))", "Math.max(420, Math.min(540, W * 0.54))", "var gut = cmp ? 0", "var scara = ingust ? 0 : 52", "o.scara === false", "var cmp = true", "Math.max(1, Math.min(9, cw * 0.62))", "Math.max(1, Math.min(11, cw * 0.72))", "ingust ? 34 : 46", "ingust ? 34 : 54", "plotW - 6", "class=\"gbC\"", "#26A96C", "gbAxaAcum", "gbCrucePret", "gbAproape"]) assert.ok(g.includes(s), "lipsește " + s);
  const css = citeste("public", "app.css");
  const i340 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 340px}");
  const i280 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 280px}");
  const i240 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 240px}");
  assert.ok(i340 >= 0 && i280 > i340 && i240 > i280, [i340, i280, i240].join(","));
  assert.match(css, /@media \(min-width:1181px\)\{[^}]*#tabloubot \.tbGraficRand\{grid-template-columns:minmax\(0,1fr\) 240px\}/);
  assert.match(css, /#tabloubot #tbTrendCard\{grid-column:auto;grid-row:auto;flex:1 1 auto/);
  assert.match(css, /#tabloubot #tbTrendCard\{flex:0 0 auto\}/);
  assert.match(css, /#tabloubot \.tbGrCol\{align-self:start\}/);
  assert.match(css, /#tabloubot \.gbValori li\.gbAproape \.gbVN\{color:#E9B949\}#tabloubot \.gbValori li\.gbAproape \.gbVN::after\{content:" · aproape";font-weight:600\}/);
  assert.match(css, /@media \(max-width:1180px\)\{#tabloubot \.tbGraficRand\{grid-template-columns:1fr\}/);
  assert.match(css, /@media \(max-width:1180px\)\{#tabloubot #tbCitireCard\{display:none\}/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
  const app = citeste("public", "app.js");
  assert.match(app, /var d=\{bb:true,ema:true,rsi:true,vp:true,zi:true,val:true,adx:true\};d\.scara=true/);
  assert.match(app, /st:tbIndStare\(\),scara:tbIndStare\(\)\.scara/);
  assert.match(app, /gbCrucePret/);
  assert.match(app, /Scara pornită/);
  const idx = citeste("public", "index.html");
  assert.match(idx, /id="tbInd-scara"[^>]*data-action-click="tbComutaInd\('scara'\)"/);
});

await test("versiunea v100.251, insigna AXĂ, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.251.0");
  assert.equal(P.scripts["test:v100251"], "node scripts/proba-v100251.mjs");
  assert.equal((P.scripts.test.match(/test:v100251/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100250/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100251"], /npm run test:v100251/);
  const idx = citeste("public", "index.html");
  assert.equal((idx.match(/v100\.251/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.251 · AXĂ</);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-251/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.251"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.251");
  assert.equal(info.badge, "v100.251 · AXĂ");
  assert.equal(info.engineContract, "54.1");
  assert.match(info.features.axa251, /240/);
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
