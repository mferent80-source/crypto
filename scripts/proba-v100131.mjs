// Proba v100.131 (07.10, el: „fa idei” după v100.130): (1) la T212, pozițiile cu stopul DEPĂȘIT primesc „🎲 revine la intrare”
// (aceeași funcție ca la Salt, mcsSansaRevenire); (2) stopurile pe aceleași drumuri și la coinuri (−5/−10/−15/−20% + stopul tău, 30 de
// zile); (3) „altă țintă, aceleași drumuri” (×½, ×¾, ×1,5, ×2), cu „drum cu drum” față de cea de sus și o recomandare care nu se
// păcălește pe serii fără avantaj.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "profil-moneda.js", "probabilitati.js", "semnale-bot.js", "consiliu.js", "actiuni-semnale.js", "consilier.js", "risc-luna.js", "t212.js", "salt.js", "monte-simbol.js"])
  vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" });
vm.runInThisContext(citeste("public", "lib", "salt-ecran.js"), { filename: "salt-ecran.js" });
const MSE = citeste("public", "lib", "monte-simbol-ecran.js"), TE = citeste("public", "lib", "t212-ecran.js"), CSS = citeste("public", "app.css");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const M = globalThis.MonteSimbol, G = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.131 · T212 revine la intrare · stopuri la coinuri · altă țintă · proba\n");
const ZI = 864e5;
function bareZi(n, seed, pas) { const g = M.generator(seed), b = []; let c = 100; for (let i = 0; i < n; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.06)); b.push({ t: i * ZI, o, h: Math.max(o, c) * 1.004, l: Math.min(o, c) * 0.996, c, v: 1 }); } return b; }
function bare15(zile, seed) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * 0.008); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
// serii realiste FĂRĂ avantaj (gap la deschidere, umbre cât agitația) - ca proba (4e) din v100.130
const serie = (n, seed, vol) => { const g = M.generator(seed), z = () => { let u = 0; for (let i = 0; i < 12; i++) u += g(); return u - 6; }, b = []; let c = 100;
  for (let i = 0; i < n; i++) { const o = c * Math.exp(z() * vol * 0.3), cc = o * Math.exp(z() * vol * 0.95); b.push({ t: i * ZI, o, h: Math.max(o, cc) * Math.exp(Math.abs(z()) * vol * 0.5), l: Math.min(o, cc) * Math.exp(-Math.abs(z()) * vol * 0.5), c: cc, v: 1 }); c = cc; }
  return b; };

// ---------------- (1) T212: revine la intrare ----------------
await test("(1a) mcsSansaRevenire (pură, comună): aceeași cifră ca la Salt; doar la stop depășit și preț sub intrare", () => {
  const b = bareZi(400, 9, 0.05), P = b[b.length - 1].c;
  const r = G.mcsSansaRevenire(b, P, P * 1.3, P * 1.1);
  assert.equal(r.zile, 60); assert.ok(r.p >= 0 && r.p <= 1);
  assert.deepEqual(r, G.saltSansaRevenire(b, { p: { pret: P, pretMediu: P * 1.3 }, niv: { stopPozitie: P * 1.1 } }));
  assert.equal(G.mcsSansaRevenire(b, P, P * 1.3, P * 0.9), null, "stopul neatins");
  assert.equal(G.mcsSansaRevenire(b, P, P * 0.9, P * 1.1), null, "pe plus");
  assert.equal(G.mcsSansaRevenire(b.slice(0, 30), P, P * 1.3, P * 1.1), null, "prea puțin istoric");
  assert.match(functie(citeste("public", "lib", "salt-ecran.js"), "saltSansaRevenire"), /mcsSansaRevenire\(/);
});
// funcțiile T212 rulate separat, cu un t212 minim (pagina întreagă cere DOM și rețea)
try { vm.runInThisContext("var t212RevineMemo = {};\n" + functie(TE, "t212Usd") + "\n" + functie(TE, "t212RevinePt") + "\n" + functie(TE, "t212RevineHtml"), { filename: "t212-revine" }); } catch (e) { console.log("  (funcțiile T212 lipsesc încă: " + e.message + ")"); }
await test("(1b) t212RevinePt: doar la stop depășit; ține minte pe ticker + ultima bară + prețul (la 0,5%) - fără recalcul la fiecare tic", () => {
  const b = bareZi(400, 9, 0.05), P = b[b.length - 1].c, p = { ticker: "RHM_EQ", pret: P, pretMediu: P * 1.3 }, n = { stopPozitie: P * 1.1, stopAtins: true };
  const r1 = G.t212RevinePt(p, b, n); assert.ok(r1 && r1.p >= 0);
  assert.equal(G.t212RevinePt(Object.assign({}, p, { pret: P * 1.001 }), b, n), r1, "același obiect: prețul s-a mișcat sub 0,5%");
  assert.notEqual(G.t212RevinePt(Object.assign({}, p, { pret: P * 1.02 }), b, n), r1, "prețul s-a mișcat ⇒ din nou");
  assert.equal(G.t212RevinePt(p, b, { stopPozitie: P * 0.9, stopAtins: false }), null);
  assert.equal(G.t212RevinePt(p, b, null), null);
  assert.match(functie(TE, "t212PregatesteP"), /p\.revine = t212RevinePt\(p, b, p\.niv\)/);
});
await test("(1c) T212: rândul arată „🎲 revine la intrare: X% în 60 z” sub DEPĂȘIT (ascuns pe telefon), detaliul o propoziție întreagă", () => {
  const p = { revine: { p: 0.13, pCapat: 0.07, zile: 60 }, pretMediu: 120.5 };
  const h = G.t212RevineHtml(p);
  assert.equal(h.mic, '<span class="t212Mic t212RevMic">🎲 revine la intrare: 13% în 60 z</span>');
  assert.match(h.det, /Șansa să revină la prețul tău de intrare \(\$120\.50\) măcar o dată în 60 de zile de bursă: <b>13%<\/b>; la capăt peste intrare: 7%/);
  assert.deepEqual(G.t212RevineHtml({}), { mic: "", det: "" });
  assert.match(functie(TE, "t212RandPozitie"), /t212RevineHtml\(p\)/);
  // .t212Mic.t212RevMic: regula telefonului „td.c-stop .t212Mic{display:inline}” are aceeași greutate și vine după ⇒ bătea „none” (văzut în poză)
  assert.match(CSS, /\.t212Tab tr\.t212Rand td\.c-stop \.t212Mic\.t212RevMic\{display:none\}/);
});

// ---------------- (2) stopurile pe aceleași drumuri și la coinuri ----------------
await test("(2a) coin: stopurile −5/−10/−15/−20% + stopul de sus, pe 30 de zile; tabelul spune „zile”, nu „zile de bursă”", () => {
  const d = { tip: "coin", sim: "PONS", sursa: "x", b15: bare15(20, 3), b1: bareZi(120, 4, 0.08), ist: { r: { cazuri: 0 } } };
  const r = G.mcsCalculeaza(d, { stop: 12 }), o = r.pretMc.orizonturi[r.pretMc.orizonturi.length - 1];
  assert.deepEqual(o.stopuri.map((s) => Math.round(s.sp * 1000) / 10), [5, 10, 12, 15, 20]);
  const h = G.mcsPretHtml(r);
  assert.match(h, /Alt stop, aceleași drumuri \(30 de zile, ținta \+15,0%\)/); assert.doesNotMatch(h, /zile de bursă/);
  assert.match(h, /<tr class="mcsVarTu"><td>−12,0%/);
});
await test("(2b) coin fără destule zile pe 1D (doar 15M): tot are stopurile", () => {
  const d = { tip: "coin", sim: "PONS", sursa: "x", b15: bare15(20, 3), b1: [], ist: { r: { cazuri: 0 } } };
  const r = G.mcsCalculeaza(d, {}), o = r.pretMc.orizonturi[r.pretMc.orizonturi.length - 1];
  assert.equal(o.stopuri.length, 4, "stopul de sus (10%) e unul dintre niveluri");
});

// ---------------- (3) altă țintă pe aceleași drumuri ----------------
await test("(3a) MonteSimbol.pret cu tinte: un rând pe țintă; ținta mai departe e atinsă întâi mai rar; rândul ×1 = cardul; drum cu drum față de ea", () => {
  const b = bareZi(400, 9, 0.05), r = M.pret(b, { orizonturi: [20, 60], n: 400, seed: 21, stopPct: 0.1, tintaPct: 0.15, tinte: [0.075, 0.1125, 0.15, 0.225, 0.3] });
  r.orizonturi.forEach((o) => {
    assert.equal(o.tinte.length, 5);
    for (let i = 1; i < 5; i++) assert.ok(o.tinte[i].pTinta <= o.tinte[i - 1].pTinta + 1e-12);
    o.tinte.forEach((t) => assert.ok(Math.abs(t.pStop + t.pTinta + t.pNiciuna - 1) < 1e-9));
    assert.equal(o.tinte[2].pTinta, o.pTinta); assert.equal(o.tinte[2].pStop, o.pStop); assert.equal(o.tinte[2].drum, null);
    assert.ok(o.tinte[0].drum && o.tinte[4].drum);
  });
  assert.equal(M.pret(b, { orizonturi: [20], n: 50 }).orizonturi[0].tinte, undefined);
});
await test("(3b) recomandarea țintei: alta doar cu media mai bună cu 1 punct ȘI mai bună în majoritatea drumurilor; altfel păstrează și spune ce schimbă ținta", () => {
  const t = (tp, pTinta, media, drum) => ({ tp, pTinta, pStop: 1 - pTinta, pNiciuna: 0, media, p5: -0.1, p50: 0, drum });
  const d = (a, b) => ({ maiBun: a, maiRau: b, egal: 1 - a - b });
  const rows = [t(0.075, 0.6, -0.004, d(0.5, 0.4)), t(0.15, 0.4, -0.006, null), t(0.3, 0.2, -0.002, d(0.3, 0.6))];
  const s = G.mcsTintaRecomandata(rows, 60, 0.15, "b");
  assert.match(s, /^Păstrează ținta de sus \(\+15,0%\)/); assert.match(s, /60% la \+7,5%, 20% la \+30,0%/);
  const r2 = [rows[0], rows[1], t(0.3, 0.2, 0.02, d(0.6, 0.3))];
  assert.match(G.mcsTintaRecomandata(r2, 60, 0.15, "b"), /^Aș lua ținta \+30,0%: rezultatul mediu \+2,0%, față de −0,6%.*mai bună în 60% din drumuri/);
  const r3 = [rows[0], rows[1], t(0.3, 0.2, 0.02, d(0.3, 0.6))];
  assert.match(G.mcsTintaRecomandata(r3, 30, 0.15, "z"), /^Păstrează ținta de sus/);
  // „majoritatea drumurilor” = peste jumătate din toate: 45% mai bună / 10% mai rea / 45% la fel NU ajunge (200 de serii fără avantaj: 3% false)
  assert.match(G.mcsTintaRecomandata([rows[0], rows[1], t(0.3, 0.2, 0.02, d(0.45, 0.1))], 60, 0.15, "b"), /^Păstrează ținta de sus/);
  const sr = (sp, media, drum) => ({ sp, pStop: 0.5, pTinta: 0.5, pNiciuna: 0, media, p5: -0.1, p50: 0, drum });
  assert.match(G.mcsStopRecomandat([sr(0.05, -0.03, null), sr(0.1, 0, d(0.45, 0.1))], 60, 0.05, "b"), /^Păstrează stopul de sus/, "la fel la stop");
});
// măsurat la scrierea probei (scratchpad rata200): pe 200 de serii fără avantaj × 3 agitații, 0 „Aș lua” (stop și țintă); cu regula
// veche (mai bună > mai rea) ținta dădea 6/200 la 3,5%/zi - seriile 5000+ de mai jos sunt dintre ele
await test("(3c) pe serii FĂRĂ avantaj, „Aș lua” (stop sau țintă) nu apare: 0 din 40 la 3,5%/zi, inclusiv seriile care păcăleau regula veche", () => {
  let fals = 0;
  for (let k = 0; k < 40; k++) {
    const r = G.mcsCalculeaza({ tip: "stock", sim: "X", b: serie(400, 5000 + k, 0.035), ist: {} }, { stop: 8, tinta: 12 });
    const m = r.pretMc, o = m.orizonturi[m.orizonturi.length - 1];
    if (/^Aș lua/.test(G.mcsTintaRecomandata(o.tinte, o.H, m.tintaPct, "b")) || /^Aș lua/.test(G.mcsStopRecomandat(o.stopuri, o.H, m.stopPct, "b"))) fals++;
  }
  assert.equal(fals, 0, `${fals} din 40`);
});
await test("(3d) caseta: „Altă țintă, aceleași drumuri” la acțiuni și la coinuri; ambele tabele au „Drum cu drum” față de cea de sus", () => {
  const rs = G.mcsCalculeaza({ tip: "stock", sim: "X", b: bareZi(400, 9, 0.05), ist: { r: { cazuri: 0 } } }, { stop: 8, tinta: 12 });
  const hs = G.mcsPretHtml(rs);
  assert.match(hs, /Altă țintă, aceleași drumuri \(60 de zile de bursă, stopul −8,0%\)/);
  assert.match(hs, /<tr class="mcsVarTu"><td>\+12,0%<span class="t212Mic">cea de sus/);
  assert.equal((hs.match(/<th>Drum cu drum<\/th>/g) || []).length, 2);
  assert.match(hs, /mai bun în \d+%<span class="t212Mic">mai rău în \d+%/, "stopul: „mai bun / mai rău”");
  assert.match(hs, /mai bună în \d+%<span class="t212Mic">mai rea în \d+%/, "ținta: „mai bună / mai rea”");
  const rc = G.mcsCalculeaza({ tip: "coin", sim: "PONS", sursa: "x", b15: bare15(20, 3), b1: bareZi(120, 4, 0.08), ist: { r: { cazuri: 0 } } }, {});
  assert.match(G.mcsPretHtml(rc), /Altă țintă, aceleași drumuri \(30 de zile, stopul −10,0%\)/);
});

await test("(E) versiunea de la v100.131 în sus (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(3[1-9]|[4-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(3[1-9]|[4-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(3[1-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[1-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[1-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[1-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[1-9]|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
