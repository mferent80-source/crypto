// Proba v100.250 (22.10, el: graficul ca în TradingView, un pic mai mare și mai lat,
// și o regulă ca să nu se piardă nimic pe drum).
// Desenează graficul și numără straturile. Șirurile vechi rămân în fișier.
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
console.log("\nV100.250 · LAT · proba\n");

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

await test("la 1000 px graficul e mai înalt, scara e în dreapta, și o lumânare rămâne pe bară", () => {
  const d = desen();
  assert.equal(d.harta.f, 1, "strângerea a unit bare");
  assert.equal((d.svg.match(/class="gbC"/g) || []).length, 288);
  assert.equal((d.svg.match(/class="gbV"/g) || []).length, 288);
  assert.equal(d.harta.plotW, 948, "scara de 52 px");
  assert.equal(d.harta.mainH, 540);
  assert.ok(d.harta.mainH > 460, "mai înalt decât plafonul din v100.249");
  const xs = [...d.svg.matchAll(/<text class="gbAxa" x="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(xs.length, 3);
  assert.ok(xs.every((x) => x > d.harta.plotW), "prețurile stau peste lumânări: " + xs.join(","));
  assert.match(d.svg, /<g class="gbPretAcum"><rect x="1"/);
  assert.match(d.svg, /class="gbScala"/);
  assert.match(d.svg, /aria-label="Prețul cu gridul, planul și alertele botului"/);
  assert.match(d.valori, /<p class="gbValCap">Ce e pe grafic<\/p><ul class="gbValori"/);
  assert.match(txt(d), /zero-ul botului/);
  assert.match(txt(d), /plan −14\.9 USDT/);
  assert.match(txt(d), /plan \+5\.2 USDT/);
  assert.match(txt(d), /intrarea medie/);
  assert.match(txt(d), /grid sus/);
  assert.match(txt(d), /lichidare/);
  assert.match(txt(d), /grid jos/);
  assert.match(txt(d), /stopul tău/);
  assert.equal((d.svg.match(/class="gbE"/g) || []).length, 2);
  for (const cls of ["gbBanda", "gbRsi", "gbEma20", "gbEma50", "gbBb", "gbViu"]) assert.match(d.svg, new RegExp("class=\"" + cls + "\""));
  assert.match(d.svg, /cel mai tranzacționat/);
  assert.match(d.svg, /#26A96C/);
  assert.doesNotMatch(d.svg, /<script>/);
  assert.doesNotMatch(d.svg, /NaN|undefined/);
});

await test("telefonul rămâne 270 fără scară, acțiunile rămân 340–520", () => {
  const tel = desen({ W: 400, ingust: true });
  assert.equal(tel.harta.mainH, 270);
  assert.equal(tel.harta.plotW, 400);
  assert.equal((tel.svg.match(/<text class="gbAxa"/g) || []).length, 0);
  assert.match(tel.svg, /<g class="gbPretAcum"><rect x="1"/);
  const act = GB.desen({ bare: GB.bare(klines(80)), W: 820, ingust: false, actiune: true, st: { ema: true }, niv: [], grila: {} });
  assert.equal(act.harta.mainH, 340);
  assert.ok(act.harta.mainH >= 340 && act.harta.mainH <= 520);
  assert.ok(act.harta.plotW < 820, "și acțiunea are scara, nu jgheabul de nume");
});

await test("șirurile vechi și straturile rămân în fișier; coloana de 340 px rămâne, cea de 280 e doar de la 1181", () => {
  const g = citeste("public", "lib", "grafic-bot.js");
  for (const s of ["Math.max(210, Math.min(300, W * 0.18))", "Math.max(360, Math.min(460, W * 0.46))", "Math.max(420, Math.min(540, W * 0.54))", "o.actiune ? Math.round(Math.max(340, Math.min(520", "var gut = cmp ? 0", "var cmp = true", "Math.max(1, Math.min(9, cw * 0.62))", "Math.max(1, Math.min(11, cw * 0.72))", "ingust ? 34 : 46", "ingust ? 34 : 54", "plotW - 6", "class=\"gbC\"", "#26A96C"]) assert.match(g, new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const cls of ["gbC", "gbV", "gbBanda", "gbTreapta", "gbAxa", "gbPretAcum", "gbE", "gbRsi", "gbEma20", "gbEma50", "gbBb", "gbVp", "gbTrend", "gbUmplere", "gbNiv", "gbViu", "gbCruce", "gbAdx", "gbSem", "gbScala"]) assert.ok(g.includes(cls), "lipsește stratul " + cls);
  assert.match(g, /cel mai tranzacționat/);
  assert.match(g, /Ce e pe grafic/);
  const css = citeste("public", "app.css");
  const i340 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 340px}");
  const i280 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 280px}");
  assert.ok(i340 >= 0 && i280 > i340, "280 trebuie să vină după 340");
  assert.match(css, /@media \(min-width:1181px\)\{[\s\S]*?#tabloubot \.tbGraficRand\{grid-template-columns:minmax\(0,1fr\) 280px\}/);
  assert.match(css, /@media \(max-width:1180px\)\{#tabloubot \.tbGraficRand\{grid-template-columns:1fr\}/);
  assert.match(css, /@media \(max-width:1180px\)\{#tabloubot #tbCitireCard\{display:none\}/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("versiunea de la v100.250 în sus, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 250, P.version);   /* v100.251: insigna live nu mai e LAT */
  assert.equal(P.scripts["test:v100250"], "node scripts/proba-v100250.mjs");
  assert.equal((P.scripts.test.match(/test:v100250/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100249/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100250"], /npm run test:v100250/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).engineContract, "54.1");
  const mv = citeste("scripts", "colector.mjs").match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/);
  assert.ok(mv && Number(mv[1]) >= 136);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
