// Proba v100.362 (18.11.2026, el: „da continuă” ⇒ Carnetul fișei „ca Jurnalul”; hotărârile LUI: cifrele reparate și spuse cinstit, toate ofertele
// păstrate, aspectul ca paginile refăcute, toate graficele + alte idei; demo ⇒ „ok”). Analiza nouă (față de „mereu LARG”, media pe cazuri cu
// intervalul pe blocuri, grupuri sub 10 fără medie, „aș aștepta” ⇒ stopul, calibrarea cu interval), ofertele fără plafon, colectorul (oră fixă,
// doar tură întreagă), graficele, pagina (nimic pierdut, raportul vechi încă desenat), tema, versiunile.
//   node scripts/proba-v100362.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "risc-luna.js", "carnet.js", "carnet-grafice.js", "carnet-ecran.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Carnet: CN, CnGrafice: CG } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("V100.362 · Carnetul fișei cinstit\n");

const ZI = 86400000, T0 = Date.UTC(2026, 9, 1);
// cazuri construite: 20 de monede × 20 de porniri, 30 de zile; fișa alege LARG („mea”) în ~85 %; ÎNGUST − LARG = `efIng` acolo unde alege ÎNGUST
function cazuri(seed, o) {
  o = o || {}; let x = seed >>> 0; const rnd = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const l = [];
  for (let m = 0; m < 20; m++) for (let k = 0; k < 20; k++) {
    const larg = (rnd() - 0.5) * 0.04 - 0.004, cine = rnd() < 0.85 ? "mea" : "ta", ast = rnd() < (o.ast == null ? 0.3 : o.ast), ps = 0.2 + rnd() * 0.6;
    const ing = larg + (o.efIng || 0) + (rnd() - 0.5) * 0.01;
    l.push({ simbol: "M" + m + "_USDT_PERP", t: T0 + Math.floor(k * 1.5 * ZI) + m * 3600000, dir: rnd() < 0.5 ? "long" : "short", cine, asteapta: ast, egale: false,
      ta: { net: ing, stop: rnd() < ps + (ast ? 0.2 : 0), pStop: ps, lichidat: false }, mea: { net: larg, stop: rnd() < ps + (ast ? 0.2 : 0), pStop: ps, lichidat: false } });
  }
  return l;
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

await test("A1 analiza: „mereu LARG” e reperul (aleasă − LARG = 0 unde alege LARG); ÎNGUST − LARG doar unde alege ÎNGUST; media pe CAZURI cu intervalul pe blocuri de 3 zile", () => {
  const l = cazuri(7, { efIng: -0.007 }), a = CN.analiza(l, { reps: 200 });
  const per = l.filter((c) => !c.egale && !c.asteapta), ing = per.filter((c) => c.cine === "ta");
  assert.equal(a.perechi, per.length); assert.equal(a.alegeIngust, ing.length); assert.equal(a.alegeLarg, per.length - ing.length);
  assert.ok(Math.abs(a.vsLarg.medie - mean(per.map((c) => c[c.cine].net - c.mea.net))) < 1e-12);
  assert.ok(Math.abs(a.ingustVsLarg.medie - mean(ing.map((c) => c.ta.net - c.mea.net))) < 1e-12); assert.ok(a.ingustVsLarg.medie < -0.005);
  assert.ok(a.vsLarg.lo <= a.vsLarg.medie && a.vsLarg.medie <= a.vsLarg.hi); assert.equal(a.vsLarg.blocuri, 10);
  assert.ok(["nedovedit", "prea puține"].includes(a.ingustVsLarg.stare) || /^(dovedit|la-limita)-/.test(a.ingustVsLarg.stare));
  assert.equal(a.blocuri.length, 10); assert.ok(a.peMonede.length === 20 && a.peMonede.every((m, i, v) => i === 0 || v[i - 1].dif <= m.dif)); assert.ok(!/USDT/.test(a.peMonede[0].simbol));
  // niveluri: aleasă / cealaltă / mereu LARG, nu doar diferența
  assert.ok(Math.abs(a.niveluri.larg.medie - mean(per.map((c) => c.mea.net))) < 1e-12); assert.ok(a.niveluri.pePlus >= 0 && a.niveluri.pePlus <= 1);
});
await test("A2 statBloc: intervalul conține media, se lărgește cu mai puține blocuri; un bloc ⇒ fără interval; grupul sub 10 cazuri ⇒ fără medie", () => {
  const l = cazuri(11), s = CN.statBloc(l, (c) => c.mea.net, T0), s2 = CN.statBloc(l.filter((c) => c.t < T0 + 9 * ZI), (c) => c.mea.net, T0);
  assert.ok(s.lo < s.medie && s.medie < s.hi); assert.ok(s2.hi - s2.lo > s.hi - s.lo, "mai puține blocuri ⇒ interval mai larg");
  const u = CN.statBloc(l.filter((c) => c.t < T0 + 2 * ZI), (c) => c.mea.net, T0); assert.equal(u.blocuri, 1); assert.equal(u.lo, null);
  assert.equal(CN.MIN_GRUP, 10);
  const a = CN.analiza(l.slice(0, 12)); assert.ok(a.ingustVsLarg.medie === null && a.ingustVsLarg.putine === true, "sub 10 cazuri ÎNGUST ⇒ fără medie");
  assert.deepEqual(CN.analiza([]), { n: 0 });
});
await test("A3 „aș aștepta” ⇒ stopul: rata stopului cu și fără, cu interval; calibrarea pe coșuri cu interval", () => {
  const a = CN.analiza(cazuri(13, { ast: 0.4 }));
  assert.ok(a.asteapta.stop.medie > a.asteapta.stopRest.medie, "construit: stopul vine mai des când „aștept”"); assert.ok(a.asteapta.n + a.asteapta.rest === a.n);
  assert.equal(a.calibrare.length, 3); for (const k of a.calibrare) if (k.n >= 10) assert.ok(k.lo <= k.venit && k.venit <= k.hi, k.cos);
});
await test("A4 „pornește / aștept”: niciun grup sub 10 nu primește medie (era „pornește (1) −9,6 %” = un trade; gol ⇒ „+0,0 %” inventat)", () => {
  const cz = cazuri(17).slice(0, 59).map((c, i) => Object.assign({}, c, { verdict: i === 0 ? "porneste" : "asteapta" }));
  const f = CN.verdictFisa2(cz); assert.equal(f.pornit.n, 1); assert.equal(f.pornit.medie, null); assert.ok(f.asteptat.medie !== null);
  const t = CN.textVerdictFisa(f); assert.match(t, /Ofertele cu „pornește”: 1 ofertă, prea puține pentru o medie/); assert.doesNotMatch(t, /\(1\) au ieșit/);
  const g = CN.textVerdictFisa(CN.verdictFisa2(cz.map((c) => Object.assign({}, c, { verdict: "asteapta" })))); assert.match(g, /„pornește”: 0 oferte, prea puține/); assert.doesNotMatch(g, /\+0,0%/);
});
await test("A5 ofertele se păstrează toate (fără plafonul de 120 de zile); raportul are v2 pe istoric și pe ofertele noi, mic", () => {
  const u = CN.uneste([{ simbol: "B", t: T0 - 400 * ZI, dir: "long", sursa: "laborator" }], [{ simbol: "B", t: T0, dir: "long", sursa: "laborator" }], T0); assert.equal(u.length, 2);
  const cz = cazuri(19), of = cz.slice(0, 80).map((c) => Object.assign({ sursa: "fisa", verdict: "asteapta", r: { ta: c.ta, mea: c.mea } }, c));
  const r = CN.raport({ cazuri: cz, oferte: of, acum: T0 + 40 * ZI, reps: 200 });
  assert.equal(r.v2.forma, 2); assert.ok(r.v2.rejoc.vsLarg && r.inainte.v2.vsLarg); assert.ok(r.inainte.deLa > 0); assert.ok(JSON.stringify(r).length < 60000);
  assert.ok(r.rejoc.intrebari.alegere.stare, "verdictul vechi (regula fixată înainte) rămâne în raport - registrul îl citește");
});
await test("C colectorul: laboratorul în fereastra 05:00–09:00 RO (≥ 20 h; după 30 h oricând; 30 min după pornire); carnetul DOAR din tură întreagă; colector v101.199", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const LAB_DE_LA = 5, LAB_PANA = 9, LAB_PORNIT = Date\.now\(\);/); assert.match(c, /function laboratorDatorat\(acum\) \{ if \(acum - LAB_PORNIT < 30 \* 60000\) return false;/);
  assert.match(c, /return d >= 30 \* 3600000 \|\| \(d >= 20 \* 3600000 && h >= LAB_DE_LA && h < LAB_PANA\);/); assert.match(c, /!laboratorDatorat\(Date\.now\(\)\)\) return;/);
  const a = c.indexOf("if (r.carnet && !(r.monede >= 10))"), b = c.indexOf("const toate = Carnet.uneste(carnetOf, r.carnet.oferteNoi"); assert.ok(a > 0 && b > a, "tura parțială oprită ÎNAINTE de scriere");
  assert.match(c, /function laboratorAmana\(\) \{ laboratorLa = Date\.now\(\) - 19 \* 3600000; \}/); assert.match(c, /const VERSIUNE_COLECTOR = "v101\.(199|2\d\d)";/);   // v100.363: colectorul a mers mai departe
});
const A = () => CN.analiza(cazuri(23, { efIng: -0.007 }));
await test("G graficele: calibrarea (puncte cu mustăți, plin / gol), blocurile (o bară pe bloc + banda), barele cu interval, pe monede (doar cu ≥ 5), puterea cu „azi”; nimic NaN", () => {
  const a = A(), c = CG.calib(a.calibrare, a.calibrare, { lat: 600 }); assert.equal((c.match(/<circle /g) || []).length, 6); assert.match(c, /class="jgNou"/);
  const b = CG.blocuri(a.blocuri, a.vsLarg, { lat: 600 }); assert.equal((b.match(/class="jgBara /g) || []).length, a.blocuri.length); assert.match(b, /class="jgBanda"/);
  const r = CG.bare([{ et: "x", medie: -0.005, lo: -0.009, hi: -0.001, n: 50 }, { et: "y", medie: 0.003, lo: null, hi: null, n: 40 }], { lat: 500 }); assert.equal((r.match(/class="jgBara /g) || []).length, 2);
  const pm = CG.peMonede([{ simbol: "A", dif: 0.01, n: 9 }, { simbol: "B", dif: -0.01, n: 2 }], { lat: 500, min: 5 }); assert.equal((pm.svg.match(/<circle /g) || []).length, 1); assert.equal(pm.ascunse, 1);
  const p = CG.putere(42, { lat: 600 }); assert.match(p, /class="jgAzi"/); assert.match(p, /fostul plafon \(120\)/);
  for (const s of [c, b, r, pm.svg, p]) { assert.doesNotMatch(s, /NaN|undefined|Infinity/); assert.doesNotMatch(s, /\d\.\d+ %/); }
  assert.equal(CG.P1(-0.0002), "0,0 %", "fără „−0,0 %”");
});
await test("P pagina: capul cu tema, fraza cinstită („nu bate «mereu LARG»” cu intervalul), trei cifre, rândurile, două coloane, tabelele în .rlTab, graficele; raportul VECHI (fără v2) încă se desenează", () => {
  const cz = cazuri(29, { efIng: -0.007 }), of = cz.slice(0, 80).map((c, i) => Object.assign({ sursa: "fisa", verdict: i ? "asteapta" : "porneste", r: { ta: c.ta, mea: c.mea } }, c));
  const r = CN.raport({ cazuri: cz, oferte: of, acum: T0 + 40 * ZI, reps: 200 }), h = globalThis.carnetHtml(r, r.la + 3600000);
  assert.match(h, /<h2 class="cnH1">📒 Carnetul fișei<\/h2>/); assert.match(h, /id="cnTemaBtn"[^>]*data-action-click="tbTemaComuta\(\)"/); assert.match(h, /data-action-click="carnetPorneste\(true\)"/);
  assert.match(h, /<p class="grFraza">(Nu se vede că alegerea fișei bate|Alegerea fișei nu bate|Alegerea fișei bate) „aș lua mereu LARG”: /);
  assert.match(h, /<summary>De unde știu<\/summary>/); assert.match(h, /între 05:00 și 09:00/); assert.doesNotMatch(h, /o dată pe noapte/);
  assert.equal((h.match(/class="cnCifra"/g) || []).length, 3);
  for (const id of Object.keys(globalThis.CN_RANDURI)) assert.match(h, new RegExp('id="' + id + '"'), id);
  assert.deepEqual(Object.keys(globalThis.CN_RANDURI), ["cnSAlegere", "cnSAstept", "cnSStop", "cnSOferte", "cnSMetoda"]); assert.deepEqual(Object.keys(globalThis.CN_RAND_DESCHIS), ["cnSAlegere", "cnSStop"]);
  assert.ok((h.match(/<h4>Pe istoric<\/h4>/g) || []).length >= 3 && (h.match(/<h4>De acum înainte<\/h4>/g) || []).length >= 3);
  assert.equal((h.match(/<div class="rlTab"><table class="cnTab">/g) || []).length, 2); assert.equal((h.match(/<tr class="cnCos">/g) || []).length, 6);
  assert.match(h, /Ofertele cu „pornește”: 1 ofertă, prea puține pentru o medie/); assert.match(h, /Toate ofertele se păstrează/);
  assert.ok((h.match(/<svg /g) || []).length >= 7, "graficele"); assert.doesNotMatch(h, /−0,0 %|NaN|undefined/); assert.doesNotMatch(h, /class="rlCon"/, "antetul vechi pzV-carnet se ascunde (fraza e a paginii)");
  // raportul vechi (până la prima tură de noapte după livrare): fără v2 ⇒ textele vechi, fără să cadă
  const v = JSON.parse(JSON.stringify(r)); delete v.v2; delete v.inainte.v2; const hv = globalThis.carnetHtml(v, v.la + 3600000);
  assert.match(hv, /Când am ales ÎNGUST sau LARG, varianta aleasă a ieșit cu/); assert.match(hv, /Pe istoric/); assert.doesNotMatch(hv, /undefined|NaN/);
  assert.match(globalThis.carnetHtml(null), /Carnetul se face noaptea/); assert.match(globalThis.carnetHtml(r, r.la + 40 * 3600000), /vechi \(de acum 40 de ore\)/);
});
await test("T tema și legăturile: RADACINI, tbTemaAplica + cnTemaBtn, tema devreme, tbRandComuta ⇒ cnRandComuta, generatorul, index (capul în pagină, scriptul graficelor), cache-ul, CSS-ul", () => {
  assert.match(citeste("scripts", "face-tema-tablou.mjs"), /"tradezilei", "carnet", "scan", "salt", "alerts", "contintreg"\]/); const A2 = citeste("public", "app.js");
  assert.match(A2, /"tradezilei","carnet","scan","salt","alerts","contintreg"\]\.forEach\(function\(id\)\{var p=document\.getElementById\(id\);if\(p\)p\.classList\.toggle\("tbZi",zi\)\}\)/); assert.match(A2, /"tzTemaBtn","cnTemaBtn","scTemaBtn","slTemaBtn","alTemaBtn","ciTemaBtn"\]/);
  assert.match(A2, /return cnRandComuta\(id,deschis\)/); assert.match(A2, /var ACTIUNI_PERMISE=new Set\("[^"]*\bcarnetPorneste\b/, "butonul „Reîmprospătează” din capul paginii (lista albă a dispecerului)"); assert.match(citeste("public", "lib", "tema-devreme.js"), /"tradezilei", "carnet", "scan", "salt", "alerts", "contintreg"\]/);
  execFileSync(process.execPath, [path.join(RAD, "scripts", "face-tema-tablou.mjs"), "--check"], { stdio: "pipe" });
  const H = citeste("public", "index.html"); assert.match(H, /<section class="panel" id="carnet">\n<div class="cnPag" id="cnPagina">/); assert.doesNotMatch(H, /<h3>Carnetul fișei<\/h3>/);
  assert.match(H, /<script src="\/lib\/carnet\.js"><\/script><script src="\/lib\/carnet-grafice\.js"><\/script>/); assert.ok(H.indexOf("/lib/carnet-grafice.js") < H.indexOf("/lib/carnet-ecran.js"));
  assert.match(citeste("public", "sw.js"), /"\/lib\/carnet\.js","\/lib\/carnet-grafice\.js"/);
  const C = citeste("public", "app.css"); for (const k of ["#carnet .cnTab{min-width:0", "#carnet .cnCifre{", "#carnet .cnDoua{", 'html.pzDemo #carnet [data-rand="pliat"]', "#carnet.tbZi .acBtn{color:#0E1A2B}"]) assert.ok(C.includes(k), k);
  assert.ok(C.indexOf("#carnet .cnCifre{") < C.indexOf("/* v100.313 (08.11.2026"), "înaintea blocului v100.313");
});
await test("V versiunile de la v100.362 încolo (v100.363: versiunea curentă o verifică proba ei)", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 362 && nr(citeste("public", "sw.js")) >= 362 && nr(JSON.parse(citeste("BUILD_INFO.json")).badge) >= 362);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 362); assert.match(p.scripts.test, /npm run test:v100361 && npm run test:v100362/); assert.equal(p.scripts["test:v100362"], "node scripts/proba-v100362.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(bi.cf362 && bi.tz361);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
