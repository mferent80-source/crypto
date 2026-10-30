// Proba v100.279 (30.10, el: „super, fă toate” - cele 5 idei de după v100.278, în „Boții tăi”):
// (1) suma și „USDT” nu se mai despart pe rânduri; (2) pe monede: unde ai pierdut / unde ai câștigat; (3) sub 15 min față de 15 min sau mai mult,
// pragul fixat dinainte; (4) comisioanele și funding-ul pe 7 zile; (5) netul pe ultimele 14 zile - grafic cu bare + tabelul zilelor.
//   node scripts/proba-v100279.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(lib("acasa.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.279 · BOȚII TĂI, IDEILE · proba\n");
const ae = lib("acasa-ecran.js"), css = citeste("public", "app.css");
const T = (s) => Date.parse(s), MIN = 60000;
const ACUM = T("2026-10-30T18:00:00Z");   // 20:00 ora României
// (id, monedă, pornit, minute, net, comisioane, funding)
const tr = (id, m, inchis, min, net, com, fund) => ({ id, moneda: m, dir: "long", levier: 3, pornit: T(inchis) - min * MIN, inchis: T(inchis), net, comisioane: com, funding: fund });
const L = [
  tr("1", "BULLA", "2026-10-30T07:10:00Z", 5, -40, -1.2, 0),
  tr("2", "BULLA", "2026-10-29T10:00:00Z", 14.99, -60, -2, -0.5),   // sub 15 min (14,99)
  tr("3", "BULLA", "2026-10-28T10:00:00Z", 15, 10, -1, 0),          // exact 15 min ⇒ „15 min sau mai mult”
  tr("4", "ORDER", "2026-10-27T10:00:00Z", 90, 39, -3, 0.25),
  tr("5", "PONS", "2026-10-26T10:00:00Z", 600, -97.6, -4, -1),
  tr("6", "CAP", "2026-10-25T10:00:00Z", 30, 33.1, -2, 0),
  tr("7", "PEPE", "2026-10-24T10:00:00Z", 3, -63.4, -0.5, 0),
  tr("8", "XAN", "2026-10-29T21:50:00Z", 8, 4, null, null),          // 29.10 23:50 ora RO; fără comisioane ⇒ „lipsă”
  tr("9", "XAN", "2026-10-29T22:10:00Z", 8, 6, -0.1, 0),             // 30.10 00:10 ora RO ⇒ azi
  tr("10", "OLD", "2026-10-22T10:00:00Z", 20, -500, -9, 0),          // în afara celor 7 zile, dar în cele 14
  tr("11", "VIITOR", "2026-10-30T19:00:00Z", 5, 999, -1, 0),         // după „acum” ⇒ nicăieri
  { id: "12", moneda: "Z", pornit: T("2026-10-30T09:00:00Z"), inchis: T("2026-10-30T09:05:00Z"), net: null, rezultat: null },   // fără rezultat
  { id: "13", moneda: "FARA", inchis: T("2026-10-30T09:00:00Z"), net: 2, comisioane: -0.1, funding: 0 },                        // fără ora pornirii
];
const D7 = ACUM - 7 * 86400000;

await test("(2) pe monede: pierderile de la cea mai mare, câștigurile la fel; o monedă = suma boților ei, la ban", () => {
  const m = AC.botiPeMonede(L, D7, ACUM);
  assert.deepEqual(m.slabe.map((x) => [x.moneda, x.n, x.net]), [["PONS", 1, -97.6], ["BULLA", 3, -90], ["PEPE", 1, -63.4]]);
  assert.deepEqual(m.bune.map((x) => [x.moneda, x.n, x.net]), [["ORDER", 1, 39], ["CAP", 1, 33.1], ["XAN", 2, 10], ["FARA", 1, 2]]);
  assert.equal(m.monede, 7);
  assert.ok(!m.slabe.concat(m.bune).some((x) => x.moneda === "OLD" || x.moneda === "VIITOR" || x.moneda === "Z"), "doar cele 7 zile, până acum, cu rezultat");
});

await test("(3) scurți / lungi: pragul de 15 min e fix; 15 min fix intră la „lungi”; fără ora pornirii ⇒ deoparte; zilele numărate", () => {
  assert.equal(AC.PRAG_SCURT_MIN, 15);
  const s = AC.botiScurtiLungi(L, D7, ACUM);
  assert.equal(s.prag, 15);
  assert.deepEqual([s.scurti.n, s.scurti.plus, s.scurti.minus, s.scurti.net], [5, 2, 3, -153.4]);   // 1, 2, 7, 8, 9
  assert.deepEqual([s.lungi.n, s.lungi.plus, s.lungi.minus, s.lungi.net], [4, 3, 1, -15.5]);       // 3, 4, 5, 6
  assert.equal(s.scurti.peBot, -30.68); assert.equal(s.lungi.peBot, -3.87, "−15,5 / 4 = −3,875 ⇒ Math.round: −3,87");
  assert.equal(s.faraDurata, 1);
  assert.equal(s.zile, 7, "zilele României pe care au fost boți: 24–30.10");
  assert.equal(AC.botiScurtiLungi([], D7, ACUM).scurti.peBot, null);
});

await test("(4) comisioanele și funding-ul: sumele, „fără ele” = net − costuri, boții fără niciuna numărați deoparte", () => {
  const c = AC.botiCosturi(L, D7, ACUM);
  assert.equal(c.n, 10);
  assert.equal(c.comisioane, -13.9); assert.equal(c.funding, -1.25); assert.equal(c.costuri, -15.15);
  assert.equal(c.net, -166.9); assert.equal(c.faraCosturi, -151.75);
  assert.equal(c.lipsa, 1);
  const g = AC.botiCosturi([], D7, ACUM); assert.equal(g.n, 0); assert.strictEqual(g.faraCosturi, null);
});

await test("(5) pe zile: 14 zile ale României, cea mai veche prima, azi ultima; ziua după ora României; fără viitor", () => {
  const z = AC.botiPeZile(L, ACUM, 14);
  assert.equal(z.length, 14);
  assert.equal(z[0].zi, "2026-10-17"); assert.equal(z[13].zi, "2026-10-30"); assert.equal(z[13].azi, true); assert.equal(z[12].azi, false);
  const pe = Object.fromEntries(z.map((x) => [x.zi, [x.n, x.net]]));
  assert.deepEqual(pe["2026-10-30"], [3, -32], "BULLA −40, XAN +6 (00:10 ora RO), FARA +2; VIITOR și Z nu");
  assert.deepEqual(pe["2026-10-29"], [2, -56], "BULLA −60 și XAN +4 (23:50 ora RO)");
  assert.deepEqual(pe["2026-10-22"], [1, -500]);
  assert.deepEqual(pe["2026-10-18"], [0, 0]);
  // trecerea la ora de iarnă (25.10) nu strică șirul de zile
  assert.deepEqual([...z.map((x) => x.zi)].slice(6, 10), ["2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26"]);
  assert.equal(AC.botiStatistici(L, ACUM).zile.length, 14);
  assert.equal(AC.botiStatistici(L, ACUM).costuri.n, 10);
});

const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cod = ae.slice(ae.indexOf("// v100.279 (ideea 1)"), ae.indexOf("function acasaDeseneaza() {"));
const F = new Function("Acasa", "escapeHtml", "acCate", cod + "; return { acBotiStatHtml, acZileSvg, acZileHtml, acUsd, acSemn };")(AC, esc, (n, s, p) => globalThis.TextRo.cate(n, s, p));
const text = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, "|[SVG]|").replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");

await test("(1) suma și „USDT” legate cu spațiu care nu se rupe - și pe rândurile de până acum din card", () => {
  assert.equal(F.acUsd(-682), "−682,0\u00a0USDT"); assert.equal(F.acUsd(0.04), "0,0\u00a0USDT"); assert.equal(F.acUsd(NaN), "—");
  assert.equal(F.acSemn(21.84), "+21,8"); assert.equal(F.acSemn(-0.04), "0,0");
  assert.match(ae, /Math\.abs\(tot\)\.toFixed\(1\)\.replace\("\.", ","\) \+ "\\u00a0USDT" : "—"\)/, "rândul botului activ");
  assert.match(ae, /Math\.abs\(zt\.boti\)\.toFixed\(1\)\.replace\("\.", ","\) \+ '\\u00a0USDT<\/b><\/div>'/, "rândul „față de ieri”");
  assert.doesNotMatch(ae, /acUsd\([^)]*\)\.replace\(" USDT"/, "nimeni nu mai taie „ USDT” cu spațiu obișnuit");
});

await test("(2)–(4) cardul: comisioanele, unde ai pierdut / câștigat, scurți / lungi, cu explicația pragului", () => {
  const h = text(F.acBotiStatHtml(L, ACUM));
  assert.match(h, /\|Comisioane și funding \|· fără ele −151,7\u00a0USDT · lipsesc la 1 bot\|−15,1\u00a0USDT\|/);
  assert.match(h, /\|Unde ai pierdut\|−251,0\u00a0USDT\|PONS\u00a0−97,6\u00a0\(1 bot\) · BULLA\u00a0−90,0\u00a0\(3\) · PEPE\u00a0−63,4\u00a0\(1\)\|/);
  assert.match(h, /\|Unde ai câștigat \|· primele 3 din 4\|\|?\+82,1\u00a0USDT\|ORDER\u00a0\+39,0\u00a0\(1 bot\) · CAP\u00a0\+33,1\u00a0\(1\) · XAN\u00a0\+10,0\u00a0\(2\)\|/);
  assert.match(h, /\|Sub 15 min \|· 5 boți, 2 pe plus · −30,7 pe bot\|−153,4\u00a0USDT\|/);
  assert.match(h, /\|15 min sau mai mult \|· 4 boți, 3 pe plus · −3,9 pe bot\|−15,5\u00a0USDT\|/);
  assert.match(h, /Pragul de 15 min e fixat dinainte\. 7 zile nu sunt o dovadă: boții aceleiași zile se mișcă împreună\./);
  assert.doesNotMatch(h.replace(/−?\d+,\d\u00a0USDT/g, ""), /\d,\d\d\b/, "o singură zecimală la sume");
  // ordinea: după „Cele 7 zile dinainte”, înainte de grafic și de „Ce s-a întâmplat”
  const i = (s) => h.indexOf(s);
  assert.ok(i("Cele 7 zile dinainte") < i("Comisioane și funding") && i("Comisioane și funding") < i("Unde ai pierdut") && i("Unde ai pierdut") < i("Sub 15 min") && i("Sub 15 min") < i("Pe zile") && i("Pe zile") < i("Ce s-a întâmplat"));
  // fără boți în 7 zile: niciun rând nou (doar mesajul de până acum)
  const gol = text(F.acBotiStatHtml([L[9]], ACUM));
  assert.match(gol, /Niciun bot închis în 7 zile\./); assert.doesNotMatch(gol, /Comisioane|Unde ai|Sub 15 min/);
  assert.match(gol, /Pe zile · ultimele 14/, "OLD e în cele 14 zile ⇒ graficul apare");
});

await test("(5) graficul: 14 zile, bare doar unde au fost boți, pe plus în sus / pe minus în jos de la linia zero, colț ≤ 4, lățime ≤ 14", () => {
  const z = AC.botiPeZile(L, ACUM, 14), s = F.acZileSvg(z);
  assert.equal((s.match(/<g class="zZi">/g) || []).length, 14);
  const bare = [...s.matchAll(/<path class="zBar (zPlus|zMinus)" d="([^"]+)"\/>/g)];
  assert.equal(bare.length, z.filter((x) => x.n && x.net !== 0).length);
  const y0 = Number(s.match(/<line class="zAx" x1="\d+" y1="([\d.]+)"/)[1]);
  const ysDin = (d) => { const ys = [], re = /([MVHAZ])([^MVHAZ]*)/g; let m; while ((m = re.exec(d))) { const n = (m[2].match(/-?[\d.]+/g) || []).map(Number); if (m[1] === "M") ys.push(n[1]); else if (m[1] === "V") ys.push(n[0]); else if (m[1] === "A") ys.push(n[6]); } return ys; };
  for (const [, cls, d] of bare) {
    const ys = ysDin(d);
    const lat = Number(d.match(/H([\d.]+)/)[1]) - Number(d.match(/^M([\d.]+)/)[1]);
    assert.ok(cls === "zPlus" ? Math.min(...ys) < y0 && Math.max(...ys) <= y0 + 0.01 : Math.max(...ys) > y0 && Math.min(...ys) >= y0 - 0.01, cls + " " + d);
    const r = Number(d.match(/A([\d.]+),/)[1]); assert.ok(r > 0 && r <= 4, "colț " + r);
    assert.ok(lat > 0 && lat <= 14, "lățimea fără colțuri " + lat);
  }
  assert.equal(bare.filter((b) => b[1] === "zPlus").length, z.filter((x) => x.n && x.net > 0).length);
  assert.match(s, /role="img" aria-label="Rezultatul net pe zi, ultimele 14 zile; cea mai proastă: 22\.10 −500,0\u00a0USDT; cea mai bună: 27\.10 \+39,0\u00a0USDT"/);
  assert.match(s, /<title>azi \(până acum\) · 3 boți închiși · −32,0\u00a0USDT<\/title>/);
  assert.match(s, /<title>18\.10 · niciun bot închis<\/title>/);
  assert.match(s, /<text x="24" y="89">17\.10<\/text><text x="320" y="89" text-anchor="end">azi<\/text>/);
  // totul pe minus: linia zero sus; totul zero: fără bare
  const neg = F.acZileSvg(z.map((x) => ({ ...x, net: x.n ? -Math.abs(x.net) || -1 : 0 })));
  assert.equal(Number(neg.match(/<line class="zAx" x1="\d+" y1="([\d.]+)"/)[1]), 8);
  assert.doesNotMatch(F.acZileSvg(z.map((x) => ({ ...x, n: 0, net: 0 }))), /<path/);
});

await test("(5) sub grafic: cea mai proastă / cea mai bună zi în cuvinte și tabelul tuturor zilelor (cea mai nouă prima); fără boți ⇒ nimic", () => {
  const h = F.acZileHtml(AC.botiPeZile(L, ACUM, 14));
  assert.match(text(h), /\|Cea mai proastă zi 22\.10 −500,0\u00a0USDT · cea mai bună 27\.10 \+39,0\u00a0USDT\.\|/);
  const rows = [...h.matchAll(/<tr><td>([^<]+)<\/td><td>([^<]+)<\/td><td[^>]*>([^<]+)<\/td><\/tr>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.equal(rows.length, 14);
  assert.deepEqual(rows[0], ["azi", "3", "−32,0\u00a0USDT"]); assert.deepEqual(rows[1], ["29.10", "2", "−56,0\u00a0USDT"]); assert.deepEqual(rows[13], ["17.10", "—", "—"]);
  assert.match(h, /<details class="acZileTab"><summary>Fiecare zi<\/summary>/);
  assert.equal(F.acZileHtml(AC.botiPeZile([], ACUM, 14)), "");
});

await test("CSS: blocul nou lângă celelalte reguli ale Acasă, ÎNAINTEA cozii păzite (regula pândei + #topLive la final)", () => {
  const i = css.indexOf("#dash .acZile{"), panda = css.indexOf("@media (max-width:640px){.sugPandaTab thead");
  assert.ok(i > 0 && panda > i, "înaintea regulii pândei");
  for (const s of ["#dash .acLinSub{", "#dash .acZile .zPlus{fill:var(--good)}", "#dash .acZile .zMinus{fill:var(--bad)}", "#dash .acZile .zAx{stroke:var(--line);stroke-width:1}", "#dash .acZile .zZi:hover .zBar{opacity:.72}", "#dash .acZileTab table{"]) assert.ok(css.includes(s), s);
  assert.match(css.trimEnd(), /#topLive\{display:none!important\}$/);
  assert.doesNotMatch(css, /\r/, "fără CR rătăcit (citit normalizat)");
});

await test("versiunea v100.279", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.279"/);
  assert.match(citeste("BUILD_INFO.json"), /"version": "v100\.279"/);
  assert.match(citeste("public", "index.html"), /id="healthAppVersion">v100\.279</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-279/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
