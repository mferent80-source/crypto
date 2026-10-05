// Proba v100.101 / colector v101.70 (05.10, el: „2 ferestre, larg și îngust, motivele pentru fiecare, și fă în așa fel încât să nu se mai
// întâmple situația de azi” → demo aprobat). Azi: TAKE long 5×, grid 0.05330–0.07224 (−18% / +11%), 40 USDT (sumă construită), plan −6,5 ⇒ la marginea de
// jos ~−27 USDT; stopul planului la mijlocul gridului. Propunerea de sus a fișei (100 USDT, 4×, gridul des) pierdea la stop −23,99 = 3,7× planul.
// (1) GridPlan.potrivire (fișa, poarta) · (2) GridPlan.alege · (3) GridPlan.motive · (4) TabloExtra.gridVsPlan (botul care rulează)
// (5) mesajul de Discord · (6) pagina: capul fișei, poarta, Tabloul · (7) colectorul · (E) versiunile. Depozit PUBLIC ⇒ cifre construite.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
globalThis.GridProba = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
const GP = new Function(`${lib("grid-plan.js")}; return GridPlan;`)();
const TE = new Function(`${lib("tablou-extra.js")}; return TabloExtra;`)();
const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.101 · colector v101.70 · Îngust / Larg și garda „gridul prea larg pentru levier”");

await test("(1) potrivire: gridul de azi (−18% / +11% la 5×, 40 USDT, plan −6,5) ⇒ prea larg, ~62% din bani la marginea de jos, stopul planului la ~mijloc", () => {
  const r = GP.potrivire({ pret: 0.06505, dir: "long", jos: 0.0533, sus: 0.07224, levier: 5, suma: 40 }, 6.5);
  assert.equal(r.preaLarg, true); assert.ok(Math.abs(r.laMargine - 24.92) < 0.05, String(r.laMargine)); assert.ok(Math.abs(r.procent - 0.623) < 0.005);
  assert.ok(r.stopPlan > 0.0533 && r.stopPlan < 0.06505 && Math.abs(r.moarte - 0.54) < 0.02, r.stopPlan + " / " + r.moarte);
  assert.ok(Math.abs(GP.pierdere(40 * 5, 1 - r.stopPlan / 0.06505, 0.07224 / 0.06505 - 1) - 6.5) < 1e-6, "la stopul planului pierzi exact planul");
  assert.equal(r.parte, "jos");
});
await test("(1) potrivire: același grid la 1× încape în plan ⇒ nu e prea larg; short = oglinda (marginea de sus); date lipsă ⇒ null", () => {
  assert.equal(GP.potrivire({ pret: 1, dir: "long", jos: 0.97, sus: 1.03, levier: 1, suma: 100 }, 6.5).preaLarg, false);
  const s = GP.potrivire({ pret: 1, dir: "short", jos: 0.89, sus: 1.18, levier: 5, suma: 40 }, 6.5);
  assert.equal(s.parte, "sus"); assert.equal(s.preaLarg, true); assert.ok(s.stopPlan > 1 && s.stopPlan < 1.18);
  assert.equal(GP.potrivire({ pret: 1, dir: "long", jos: 1.1, sus: 1.2, levier: 5, suma: 10 }, 6.5), null, "prețul sub grid");
  assert.equal(GP.potrivire({ pret: 1, dir: "long", jos: 0.9, sus: 1.1, levier: 5, suma: 10 }, 0), null, "fără plan");
});
const V = (lev, stop, n, media, inGrid, ore) => ({ levier: lev, laStop: -6.5, proba: { n, stop, tinta: n - stop - inGrid, inGrid, mediaUsdt: media, oreTipic: ore, independente: 10, zile: 30 } });
await test("(2) alege: aceeași pierdere la stop ⇒ cea cu stopul mai rar (dacă media nu e mai proastă); puține cazuri se spune", () => {
  const a = GP.alege(V(5, 54, 109, -1.04, 0, 2), V(1, 27, 109, -0.04, 24, 25));
  assert.equal(a.cine, "mea"); assert.match(a.text, /^LARG · /); assert.match(a.text, /de 27 de ori din 109 porniri, față de 54/); assert.match(a.text, /nu e dovedită/);
  assert.equal(GP.alege(V(5, 20, 109, 0.5, 0, 2), V(1, 50, 109, -0.5, 24, 25)).cine, "ta", "îngust: stop mai rar și media mai bună");
  assert.equal(GP.alege(V(5, 54, 109, -1, 0, 2), null).cine, "ta", "fără larg ⇒ îngust");
  assert.equal(GP.alege(null, null), null);
});
await test("(3) motive: „de ce da” / „de ce nu” din cifrele variantei (fără texte inventate), cu „de” corect", () => {
  const ta = Object.assign(V(5, 54, 109, -1.04, 0, 2), { jos: 0.0639, sus: 0.0659, pas: 0.0031, lichidare: { jos: 0.0522 } }), mea = Object.assign(V(1, 27, 109, -0.04, 24, 25), { jos: 0.0593, sus: 0.071, pas: 0.003, lichidare: { jos: null } });
  const mt = GP.motive(ta, "ta", 0.111), mm = GP.motive(mea, "mea", 0.111);
  assert.ok(mt.da.some((x) => /ieși repede: tipic după 2 h/.test(x)) && mt.nu.some((x) => /stop 54 din 109 porniri/.test(x)), JSON.stringify(mt));
  assert.ok(mm.da.some((x) => /ține o zi obișnuită a monedei \(±11,1%\)/.test(x)) && mm.da.some((x) => /fără lichidare/.test(x)) && mm.nu.some((x) => /tipic 25 h/.test(x)), JSON.stringify(mm));
  assert.ok(mm.nu.some((x) => x === "24 din 109 porniri încă în grid după 3 zile"));
  // poza 05.10: LARG strâns cât planul (−8,4% / +9,8%, o zi e ±11,1%) - motivul spune banda REALĂ; orele rotunjite („2.5 h” ieșea cu punct)
  assert.equal(GP.motive(Object.assign({}, mea, { dir: "long", d: 0.0838, u: 0.0976 }), "mea", 0.111).da[0], "ține −8,4% / +9,8% fără să iasă (o zi obișnuită e ±11,1%: strânsă cât planul)");
  assert.equal(GP.motive(Object.assign({}, mea, { dir: "long", d: 0.112, u: 0.115 }), "mea", 0.111).da[0], "ține −11,2% / +11,5% fără să iasă, cât o zi obișnuită a monedei (±11,1%)");
  assert.ok(GP.motive(Object.assign({}, ta, { proba: Object.assign({}, ta.proba, { oreTipic: 2.5 }) }), "ta", 0.111).da.includes("ieși repede: tipic după 3 h, banii nu stau"));
  assert.match(GP.alege(V(5, 54, 109, -1.04, 0, 2), V(1, 27, 109, 0.31, 24, 25)).text, /\(−6,5 USDT\).*media pe pornire \+0,3 USDT față de −1,0 USDT/, "o singură zecimală");
});
// botul TAKE construit (cifrele de azi): gridul din Pionex, poziția, profitul
const BOT = { id: "B", directie: "long", investit: 40, levier: 5, pretCurent: 0.06505, pretDeschidere: 0.066, pozitie: 1070, profitNet: -0.1, profitTotal: -1, gridJos: 0.0533, gridSus: 0.07224, pnlNerealizatSigur: true,
  brut: { buOrderData: { row: 50, gridType: "geometric", perVolume: "72" } } };   // ~3.500 de monede pe tot gridul (40 × 5 la ~0,06)
await test("(4) gridVsPlan pe botul care rulează: −27 la marginea de jos (64%), prea larg, stopul planului ~0.0614, ~23 din 49 de grile moarte", () => {
  const r = TE.gridVsPlan(BOT, 6.5);
  assert.equal(r.preaLarg, true); assert.ok(r.laMargine > 20 && r.laMargine < 35, String(r.laMargine)); assert.ok(Math.abs(r.procent - r.laMargine / 40) < 1e-9);
  assert.ok(r.stopPlan > 0.06 && r.stopPlan < 0.0625, String(r.stopPlan)); assert.equal(r.intervale, 49); assert.ok(r.moarte >= 20 && r.moarte <= 26, String(r.moarte));
  assert.equal(TE.gridVsPlan(Object.assign({}, BOT, { levier: 1, gridJos: 0.0635 }), 6.5).preaLarg, false, "un grid strâmt încape");
  assert.equal(TE.gridVsPlan(BOT, null), null);
});
await test("(5) mesajul de Discord: titlul ≤ 60, două rânduri (faptul · 👉 ce aș face), cu cifrele și ieșirea", () => {
  const m = MC.gridPreaLarg("TAKE", Object.assign(TE.gridVsPlan(BOT, 6.5), { plan: 6.5 }));
  assert.equal(m.cheie, "grid-larg"); assert.equal(m.nivel, "atentie"); assert.ok(m.titlu.length <= 60, m.titlu); assert.equal(m.titlu, "TAKE: gridul e prea larg pentru levier");
  assert.match(m.mesaj, /≈ \d+,\d USDT/, "o singură zecimală"); assert.match(m.mesaj, /planul −6,5[;.]/);
  const r = m.mesaj.split("\n"); assert.equal(r.length, 2); assert.match(r[0], /La marginea de jos pierzi ≈ \d+,?\d* USDT \(\d+% din bani\), planul −6,5/); assert.match(r[0], /din 49 de grile n-ar lucra/);
  assert.match(r[1], /^👉 Aș închide aproape de zero și aș porni ÎNGUST sau LARG din fișă/);
});
await test("(6) pagina: capul fișei = Îngust / Larg sub verdict; setările vechi pliate cu „la stop pierzi”; poarta cu jos/sus/levier/sumă; Tabloul cu rândul roșu", () => {
  const rg = fnApp("renderGrid"), ix = citeste("public", "index.html");
  assert.ok(rg.indexOf('id="grPlanVar"') < rg.indexOf("Setările de pus în Pionex"), "Îngust / Larg înaintea setărilor vechi");
  assert.ok(rg.indexOf('id="grPlanVar"') < rg.indexOf("h+=grPoartaHtml(f);"), "și înaintea porții");
  assert.match(rg, /<details class="grAlte"[^>]*><summary>Alte setări · gridul des al fișei<\/summary>/);
  assert.match(rg, /GridPlan\.potrivire\(\{pret:f\.pret,dir:f\.dir,jos:st\.jos,sus:st\.sus,levier:st\.levier,suma:st\.suma\}/);
  const pv = fnApp("grPlanVarHtml"); assert.match(pv, /GridPlan\.alege\(/); assert.match(pv, /GridPlan\.motive\(/); assert.match(pv, /"ÎNGUST · "/); assert.match(pv, /"LARG · "/);
  assert.match(fnApp("grPoartaHtml"), /\+grPoartaGridForm\(f\)/, "poarta nu cheamă câmpurile gridului");
  const pa = fnApp("grPoartaGridForm"); for (const id of ["grPgJos", "grPgSus", "grPgLev", "grPgSuma"]) assert.ok(pa.includes('["' + id + '"'), id);
  assert.match(fnApp("grPoartaGrid"), /GridPlan\.potrivire\(/);
  assert.match(ix, /<div class="tbGridLarg" id="tbGridLarg" hidden><\/div>/);
  assert.match(fnApp("tbGridLargRender"), /TabloExtra\.gridVsPlan\(b,/);
});
await test("(7) colectorul: botul nou se verifică o dată, în primele 6 h, cu planul lui sau cel obișnuit, și pleacă pe Discord; v101.70", () => {
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /TabloExtra\.gridVsPlan\(b, planMinus\)/); assert.match(col, /MesajeColector\.gridPreaLarg\(/);
  assert.match(col, /!st\._gridLarg && acum - Number\(b\.pornitLa\) < 6 \* 3600000/);
  assert.match(col, /const VERSIUNE_COLECTOR = "v101\.(7\d|[89]\d)";/);
});
await test("(E) versiunile v100.101 (BUILD_INFO, versiune.js, sw, index ×4, package.json, lanțul)", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.1(0[1-9]|[1-9]\d)$/); const V2 = bi.version; assert.ok(bi.badge.startsWith(V2 + " · "));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V2 + '";'));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V2.replace(".", "-") + '";'));
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V2.replace(".", "\\.") + "(?!\\d)", "g")) || []).length, 4);
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V2.slice(1) + ".0"); assert.ok(/npm run test:v100100 && npm run test:v100101( && |")/.test(pk));
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
