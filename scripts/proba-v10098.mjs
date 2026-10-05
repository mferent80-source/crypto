// Proba v100.98 (05.10, el: „îmbunătățește graficul și scrisul, ce înseamnă cercurile, o citire live lângă el, poate un indicator”
// → discuție → demo aprobat → „ai mai adăuga ceva?” → toate 4 → „OK”). Demo-ul: claude.ai/artifact (linkul e în memorie, nu aici).
// (1) ADX 14 · (2) Simplu / Complet · (3) scrisul mai mare · (4) linia de pornire · (5) „dacă închizi la…” sub cursor
// (6) citirea graficului (pură) + funding · (7) lumânarea live · (8) liniile planului CU gridul pe drum (pretTintaPentru / pretOpritorPentru)
// (9) pagina: butoanele, cardul citirii, cursorul · (E) versiunile.
// Depozitul e PUBLIC ⇒ fără datele botului lui: lumânări construite, cu răspuns cunoscut.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
const G = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.98 · graficul botului: Simplu/Complet, ADX, citirea, lumânarea live, „dacă închizi la”, planul cu gridul");

const M5 = 300000, T0 = Date.UTC(2026, 9, 4, 11, 25);
// lumânări de 5 min: o urcare constantă (trend curat) sau un zigzag pe loc
const urcare = (n, p0 = 1, pas = 0.002) => Array.from({ length: n }, (_, i) => { const o = p0 * (1 + pas * i), c = o * (1 + pas); return { t: T0 + i * M5, o, h: c * 1.0005, l: o * 0.9995, c, v: 100 }; });
const zigzag = (n, p0 = 1) => Array.from({ length: n }, (_, i) => { const o = p0 * (i % 2 ? 1.004 : 0.996), c = p0 * (i % 2 ? 0.996 : 1.004); return { t: T0 + i * M5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 100 }; });
const NIV = (p) => G.niveluriBot({ bot: { gridSus: p * 1.11, gridJos: p * 0.82, pretDeschidere: p * 1.016, opritorPierdereActiv: true, opritorPierdere: p * 0.938, pretLichidare: p * 0.756 }, zero: p * 1.018, planPlus: { pret: p * 1.048, usdt: 2.2 }, planMinus: { pret: p * 0.93, usdt: 6.5 } });
const BOT = { directie: "long", profitTotal: -1.3, investit: 42.47, pozitie: 1139, pornitLa: T0 + 140 * M5 };
const baza = (bare, extra) => Object.assign({ bare, W: 1200, st: { bb: true, ema: true, rsi: true, vp: true, zi: false, val: false, adx: true }, niv: NIV(bare[bare.length - 1].c), grila: { jos: bare[bare.length - 1].c * 0.82, sus: bare[bare.length - 1].c * 1.11, linii: 50, geo: true }, alerte: [], per: "24h" }, extra || {});

await test("(1) ADX 14: urcare curată ⇒ peste 25 (trend), +DI peste −DI; zigzag pe loc ⇒ sub 20", () => {
  const u = G.adx(urcare(120), 14), z = G.adx(zigzag(120), 14), L = 119;
  assert.ok(u.adx[L] > 25 && u.pdi[L] > u.mdi[L], "urcare: ADX " + u.adx[L] + " +DI " + u.pdi[L] + " −DI " + u.mdi[L]);
  assert.ok(z.adx[L] < 20, "zigzag: ADX " + z.adx[L]);
  assert.equal(G.adx(urcare(20), 14).adx[19], null, "sub 2×14+1 bare ⇒ fără ADX (nu inventează)");
});
await test("(2) Simplu ⇒ fără treptele gridului, Bollinger, profil; Complet ⇒ cu ele; ADX în ambele", () => {
  const b = zigzag(288), s = G.desen(baza(b, { simplu: true })).svg, c = G.desen(baza(b, { simplu: false })).svg;
  assert.ok(!/gbTreapta|gbBb|gbVp/.test(s), "Simplu are decor"); assert.ok(/gbAdx/.test(s), "Simplu fără ADX");
  assert.ok(/gbTreapta/.test(c) && /gbBb/.test(c) && /gbVp/.test(c) && /gbAdx/.test(c), "Complet fără tot");
  assert.ok(!/NaN|undefined/.test(s + c), "NaN/undefined în SVG");
});
await test("(3) scrisul: etichetele din dreapta 13 px, „acum” 13,5 px, ce iese din cadru 12,5 px; bulina cu explicație (<title>)", () => {
  const zz = zigzag(288), pz = zz[zz.length - 1].c;
  const svg = G.desen(baza(zz, { simplu: true, niv: NIV(pz).concat([{ k: "zero", p: pz * 1.002, t: "zero-ul botului", c: "#f5c451", st: "dash", s: "zero" }]), alerte: [{ t: T0 + 100 * M5, nivel: "atentie", titlu: "TAKE: botul n-are plan" }, { t: T0 + 101 * M5, nivel: "info", titlu: "TAKE: altceva" }] })).svg;
  assert.match(svg, /font-size="13"/); assert.match(svg, /font-size="13.5" font-weight="700"/); assert.match(svg, /font-size="12.5"/);
  assert.match(svg, /<g class="gbE"[^>]*><title>2 alerte ale botului, cea mai gravă de atenție/);
});
await test("(4) linia de pornire a botului: în cadru ⇒ linia + „botul pornit HH:MM” + lumânările de dinainte estompate; pornit înainte de cadru ⇒ nimic", () => {
  const b = zigzag(288), cu = G.desen(baza(b, { pornit: BOT.pornitLa })).svg, inainte = G.desen(baza(b, { pornit: T0 - 10 * M5 })).svg;
  assert.ok(/gbPornit/.test(cu) && /gbInainte/.test(cu) && /botul pornit \d\d:\d\d/.test(cu));
  assert.ok(!/gbPornit/.test(inainte));
});
await test("(5) cursorul: pretLaY e inversa scalei (sus = maxim, jos = minim); tip(…, sy, laPret) pune „dacă închizi la” doar în graficul mare", () => {
  const h = G.desen(baza(zigzag(288))).harta;
  assert.ok(Math.abs(G.pretLaY(h, 0) - h.hi) < 1e-12 && Math.abs(G.pretLaY(h, h.mainH) - h.lo) < 1e-12);
  assert.equal(G.pretLaY(h, h.mainH + 5), null, "sub graficul mare (volum, RSI) nu e un preț");
  const lp = (px) => "LA " + px.toFixed(4);
  assert.match(G.tip(h, 300, 10, lp), /class="gbLa">LA /);
  assert.doesNotMatch(G.tip(h, 300, h.mainH + 20, lp), /gbLa/);
  assert.doesNotMatch(G.tip(h, 300), /gbLa/, "fără sy merge ca înainte");
});
await test("(6) citirea: botul, zero-ul, planul, stopul, gridul, direcția, ADX, funding — pe ce se vede; stopul la −6,2% ⇒ atenție", () => {
  const b = zigzag(288), p = b[b.length - 1].c, o = baza(b, { pretViu: p, funding: { rata: 0.000114, urmatoarea: T0 + 300 * M5, acum: T0 + 293 * M5, sursa: "după Binance" } });
  const c = G.citire(o, BOT, p), r = Object.fromEntries(c.randuri.map((x) => [x.ce, x]));
  for (const k of ["Botul", "Zero-ul botului", "Planul", "Stopul", "Gridul", "Direcția", "ADX 14", "Funding"]) assert.ok(r[k], "lipsește rândul " + k + ": " + Object.keys(r).join(", "));
  assert.equal(r.Stopul.stare, "atentie"); assert.match(r.Stopul.text, /la −6,2%/);
  assert.ok(r.Funding.text.includes("botul plătește ~" + (1139 * p * 0.000114).toFixed(3).replace(".", ",") + " USDT"), r.Funding.text); assert.match(r.Funding.text, /în 35 min/);
  assert.match(r["ADX 14"].text, /stă pe loc/, "zigzagul e pe loc");
  assert.ok(c.peScurt.startsWith("botul pe minus −1,30 USDT"), c.peScurt);
  assert.equal(G.citire(baza(zigzag(10)), BOT, 1), null, "prea puține bare ⇒ null");
});
await test("(7) lumânarea live: în perioada ei, ultima lumânare primește prețul (închidere, maxim, minim); după, apare una nouă", () => {
  const b = zigzag(10), u = b[b.length - 1];
  const a = G.cuPretViu(b, u.h * 1.01, u.t + 60000);
  assert.equal(a.length, 10); assert.equal(a[9].c, u.h * 1.01); assert.equal(a[9].h, u.h * 1.01); assert.equal(a[9].o, u.o);
  assert.equal(b[9].c, u.c, "nu strică lista primită");
  const n = G.cuPretViu(b, 2, u.t + M5 + 1000);
  assert.equal(n.length, 11); assert.equal(n[10].t, u.t + M5); assert.equal(n[10].o, u.c); assert.equal(n[10].c, 2);
  assert.equal(G.cuPretViu(b, null, u.t + 1000), b, "fără preț ⇒ aceeași listă");
});
await test("(8) liniile planului se pun CU gridul pe drum (pretTintaPentru / pretOpritorPentru), nu cu pretPentruTotal", () => {
  // v100.99 (I-532): socoteala a plecat în GraficBot.intrareBot ⇒ se verifică ce întoarce (pe un TabloExtra de probă), nu textul din app.js
  const cer = [], TE = { dacaInchizi: () => null, alerteleBotului: () => [], totalLaOpritor: () => null, pretPentruTotal: () => { cer.push("fara grid"); return 9; },
    pretTintaPentru: (b, t) => { cer.push("tinta " + t); return 1.05; }, pretOpritorPentru: (b, t) => { cer.push("opritor " + t); return 0.95; } };
  const o = G.intrareBot({ bot: { id: "x", directie: "long" }, bare: zigzag(30), plan: { plus: 2.2, minus: 6.5 }, W: 900, TabloExtra: TE });
  assert.deepEqual(cer, ["tinta 2.2", "opritor -6.5"], "doar socoteala cu gridul"); assert.ok(o.niv.some((x) => x.k === "planPlus" && x.p === 1.05) && o.niv.some((x) => x.k === "planMinus" && x.p === 0.95));
  assert.doesNotMatch(fnApp("renderTabloGrafic"), /pretPentruTotal/);
});
await test("(9) pagina: Simplu/Complet ținut minte, ADX comutabil, pornirea + funding + lumânarea live în desen, cursorul cu „dacă închizi la”, citirea în coloana din dreapta", () => {
  const r = fnApp("renderTabloGrafic"), ix = citeste("public", "index.html");
  assert.match(ix, /id="tbMod-simplu"/); assert.match(ix, /id="tbMod-complet"/); assert.match(ix, /id="tbInd-adx"/);
  assert.match(ix, /<div class="tbGrCol"><div class="tbBloc" id="tbCitireCard">/, "citirea, prima în coloana din dreapta");
  assert.match(r, /simplu:tbModSimplu\(\)/); assert.match(r, /funding:tbFundingPt\(\)/);
  // v100.99 (I-532): pornirea și lumânarea live le pune intrarea pură - se verifică ce întoarce
  const zz = zigzag(20), u = zz[zz.length - 1], oi = G.intrareBot({ bot: { id: "x", pornitLa: 123 }, bare: zz, pretViu: u.h * 1.01, acum: u.t + 1000, W: 900, TabloExtra: null });
  assert.equal(oi.pornit, 123); assert.equal(oi.bare[oi.bare.length - 1].c, u.h * 1.01);
  assert.match(r, /GraficBot\.tip\(d\.harta,sx,sy,tbLaPret\(b\)\)/);
  assert.match(r, /tbDeseneazaCitire\(/);
  assert.match(fnApp("tbIndStare"), /adx:true/);
});

await test("(E) versiunile v100.98 (BUILD_INFO, versiune.js, sw, index ×4, package.json, lanțul cu v10098)", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.9[8-9]$/, "de la 98 în sus"); const V = bi.version; assert.ok(bi.badge.startsWith(V + " · "));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V + '";'));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V.replace(".", "-") + '";'));
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V.replace(".", "\\."), "g")) || []).length, 4, "index.html ×4");
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V.slice(1) + ".0"); assert.ok(/npm run test:v10097 && npm run test:v10098( && |")/.test(pk), "lanțul de teste");
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
