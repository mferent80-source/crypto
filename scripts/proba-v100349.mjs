// Proba v100.349 (16.11.2026, el: „ok fă la fel la pagina grid ce setez” ⇒ auditul sever al paginii „Grid: ce setez acum?” ⇒ hotărârile LUI:
// verdict unic pe setarea pornită + avertismentul probei + urmărire; o singură listă ca Sugestii; laboratorul înghețat; jurnal + hârtie pe server).
// Valul 1 - FIȘA:
//   🔴 verdictul de sus judeca gridul des din „Alte setări”, iar ÎNGUST / LARG (ce pornești) primeau „aș alege-o acum” fără verdict ⇒
//       GridPlan.verdictFereastra (aceeași regulă GridCalcul.verdict, pe proba ferestrei: aceleași bare, H, funding) + garda Pionex
//       (minimul pe ordin cu minSizeLimit, pasul de preț al bursei, lichidarea înaintea stopului); verdictul de sus = al ferestrei pornite;
//   🔴 proba pe bare de 1 h scoate un minus fals (I-888) și pagina nu spunea ⇒ avertismentul sub verdict;
//   🟡 ÎNGUST / LARG fără minSizeLimit, fără funding real, fereastra fixă de 3 zile ⇒ minSize, funding, fereastra = cât îl ții;
//   🟡 „ce s-a dovedit e să nu-l pornești după mișcare” scris de mână (Busola 14.10: nedovedit) ⇒ textele spun precauție, nedovedită;
//   🟡 o reîmprospătare picată ștergea fișa ⇒ fișa veche rămâne, cu ora; 🟡 fișa goală deși câmpul are moneda ⇒ calculul pornește singur.
//   node scripts/proba-v100349.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul);
const GridPlan = new Function("GridCalcul", "GridProba", `${lib("grid-plan.js")}; return GridPlan;`)(GridCalcul, GridProba);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.349 · pagina Grid, valul 1: fișa · proba\n");

const T0 = Date.UTC(2026, 7, 25);
const bare = (f, n = 35 * 96) => Array.from({ length: n }, (_, i) => { const o = f(i), c = f(i + 1); return { t: T0 + i * 900000, o, c, h: Math.max(o, c), l: Math.min(o, c) }; });
const LATERAL = bare((i) => 4.473 * (1 + 0.012 * Math.sin(i / 7)));
const O = (x) => Object.assign({ pret: 4.473, dir: "long", suma: 103.38, levier: 5, plan: { plus: 5.5, minus: 15.7 }, amp: 0.0985, pas: 0.003, b15: LATERAL }, x || {});
const OV = (x) => Object.assign({ b: LATERAL, bz: 96, H: 2, fundingZi: null, regim: { miscare: false, r4h: 1, r24h: 1 }, pozitie: 0.5, zile: 35, info: {} }, x || {});

await test("🔑 GridPlan.fabrica: aceeași fereastră mutată pe alt preț (aceleași fracții jos / sus, grile, levier)", () => {
  const ta = GridPlan.variante(O()).ta, s = GridPlan.fabrica(ta)(5);
  assert.equal(s.grile, ta.grile); assert.equal(s.levier, ta.levier); assert.equal(s.dir, "long");
  assert.ok(Math.abs(s.jos / 5 - ta.jos / ta.pret) < 1e-9 && Math.abs(s.sus / 5 - ta.sus / ta.pret) < 1e-9);
});
await test("🔑 verdictFereastra: aceeași regulă ca fișa (mișcarea mare ⇒ NU PORNI), pe proba ferestrei", () => {
  const ta = GridPlan.variante(O()).ta;
  const v1 = GridPlan.verdictFereastra(ta, OV({ regim: { miscare: true, r4h: 3, r24h: 2.4 } }));
  assert.equal(v1.nivel, "nu"); assert.match(v1.motive.join(" | "), /mișcare mare/);
  const v2 = GridPlan.verdictFereastra(ta, OV()); assert.ok(v2 && v2.stat && v2.stat.antren, "proba ferestrei rulată"); assert.doesNotMatch(v2.motive.join(" | "), /mișcare mare/);
});
await test("🔑 garda Pionex: sub minimul pe ordin (și cu minSizeLimit) ⇒ NU PORNI; pasul bursei mare ⇒ spus; lichidarea înaintea stopului ⇒ NU PORNI", () => {
  const ta = GridPlan.variante(O()).ta;
  const m = GridPlan.verdictFereastra(ta, OV({ info: { minNotional: 1, minSizeLimit: 1000 } })); assert.equal(m.nivel, "nu"); assert.match(m.motive[0], /sub minimul Pionex/);
  const t = GridPlan.verdictFereastra(ta, OV({ info: { quotePrecision: 1 } })); assert.match(t.motive.join(" | "), /pasul de preț al bursei/);
  const lq = Object.assign({}, ta, { lichidare: { jos: ta.stop.jos * 1.01, sus: null } }), l = GridPlan.verdictFereastra(lq, OV());
  assert.equal(l.nivel, "nu"); assert.match(l.motive.join(" | "), /lichidarea vine înaintea stopului/);
});
await test("🟡 ÎNGUST / LARG: minimul pe ordin cu minSizeLimit, funding-ul real și fereastra probei = cât îl ții", () => {
  const v = GridPlan.variante(O({ minSize: 2 })), ta = v.ta;
  assert.ok(ta.perOrdin >= 2 * ta.sus - 1e-9 || ta.sumaMica, "perOrdin " + ta.perOrdin + " vs " + 2 * ta.sus);
  assert.equal(GridPlan.variante(O({ fereastraZile: 2 })).ta.proba.ferestreZile, 2);
  assert.equal(GridPlan.variante(O()).ta.proba.ferestreZile, 3, "fără fereastră: ca înainte");
  const a = GridPlan.variante(O({ fundingZi: 0.003 })).ta.proba, b = GridPlan.variante(O()).ta.proba;
  assert.ok(a.mediaUsdt < b.mediaUsdt, "funding-ul real (0,3%/zi) costă: " + a.mediaUsdt + " vs " + b.mediaUsdt);
});
await test("🔑 pagina: verdictul de sus e al ferestrei pornite, spune pe ce judecă, avertismentul probei; „aș alege-o acum” doar fără NU PORNI", () => {
  const a = citeste("public", "app.js");
  assert.match(a, /function grVerdictePlan\(/); assert.match(a, /GridPlan\.verdictFereastra\(/);
  assert.match(a, /f\.verdictDes/); assert.match(a, /class="grVPe/); assert.match(a, /simulatorul probei iese mai rău decât realitatea/);
  assert.match(a, /vd&&vd\.nivel==="nu"/); assert.match(a, /aș aștepta/);
  assert.match(a, /fundingZi:dG\.fundingZi/); assert.match(a, /fereastraZile:f\.H/); assert.match(a, /minSize:i&&Number\(i\.minSizeLimit\)/);
});
await test("🟡 textele: fără „ce s-a dovedit e să nu-l pornești”; motivul mișcării spune că e nedovedit", () => {
  const a = citeste("public", "app.js"); assert.doesNotMatch(a, /ce s-a dovedit e să nu-l pornești/);
  const v = GridCalcul.verdict({ regim: { miscare: true, r24h: 1.6 }, stat: { antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: 0.01, medie: 0.01, lichidari: 0 } }, zile: 30 });
  assert.match(v.motive[0], /neprobat/);
});
await test("🟡 fișa rămâne la o reîmprospătare picată (cu ora), iar calculul pornește singur când câmpul are moneda", () => {
  const a = citeste("public", "app.js");
  assert.match(a, /grStare\.eroareRefacere/); assert.match(a, /n-am putut reface fișa/);
  const p = a.slice(a.indexOf("function porneGrid(){"), a.indexOf("function grPauza("));
  assert.match(p, /gridCalculeaza\(\)/);
});

// ---- Valul 2 - URMĂRIREA FIȘEI (el: „fiecare fișă calculată se notează și se judecă după cât o ții, pe bare de 1 minut”) ----
const ZI = 86400000;
const { simGrid } = await import("./lib/proba-grid.mjs");
await test("🔑 simGrid cu ieșiri (stop / țintă la margini): prețul trece de stop ⇒ închis acolo, fără funding după; fără ieșiri, ca înainte", () => {
  const b = Array.from({ length: 50 }, (_, i) => { const p = 100 - i; return { t: i * 60000, o: p, h: p, l: p - 1, c: p - 1 }; });
  const p = { jos: 90, sus: 110, n: 10, dir: "long" };
  const g = simGrid(p, b, { drum: "scurt", iesiri: { jos: 89, sus: 111 } }), g0 = simGrid(p, b, { drum: "scurt" });
  assert.equal(g.oprit, "jos"); assert.equal(g.pozFinala, 0); assert.ok(g.r < 0); assert.ok(g.r > g0.r, "oprit la 89 pierde mai puțin decât ținut până la 50");
  assert.equal(g0.oprit, undefined);
});
await test("🔑 judecaFisa: gridul notat, pe barele de 1 minut ale zilelor lui, în % din marjă (× levier), pe două drumuri", async () => {
  const { judecaFisa } = await import("./lib/tura-fise.mjs");
  const t0 = Date.UTC(2026, 10, 10), n = { id: "a", simbol: "X_USDT_PERP", t: t0, H: 1, dir: "long", nivel: "nu", cheie: "ta", pret: 100, jos: 97, sus: 103, grile: 10, levier: 3, stopJos: 96.8, stopSus: 103.2 };
  const bare = Array.from({ length: 1440 }, (_, i) => { const p = 100 * (1 + 0.01 * Math.sin(i / 20)); return [t0 + i * 60000, p, p * 1.001, p * 0.999, p]; });
  const binance = async (u) => (/klines/.test(u) ? bare.filter((x) => x[0] >= Number(/startTime=(\d+)/.exec(u)[1])).slice(0, 1500) : []);
  const j = await judecaFisa(n, { binance });
  assert.equal(j.id, "a"); assert.ok(Number.isFinite(j.r) && Number.isFinite(j.rSus)); assert.ok(j.umpleri > 0);
  const p = { jos: 97, sus: 103, n: 10, dir: "long" }, b = bare.map((x) => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4] }));
  assert.ok(Math.abs(j.r - simGrid(p, b, { drum: "scurt", iesiri: { jos: 96.8, sus: 103.2 }, funding: [] }).r * 3) < 1e-12);
  const j2 = await judecaFisa(Object.assign({}, n, { pret: 50 }), { binance }); assert.equal(j2.r, null); assert.match(j2.motiv, /alt multiplu/);
});
await test("🔑 turaFise: judecă doar fișele ajunse la capăt (o dată), cel mult 15 pe tură, rezumă pe verdict, registrele pe zile întregi", async () => {
  const { turaFise } = await import("./lib/tura-fise.mjs");
  const t0 = Date.UTC(2026, 10, 1), acum = t0 + 10 * ZI;
  const fise = [];
  for (let k = 0; k < 20; k++) fise.push({ id: "f" + k, simbol: "X_USDT_PERP", t: t0 + k * 3600000, H: 1, dir: "long", nivel: k % 2 ? "nu" : "asteapta", cheie: "ta", pret: 100, jos: 97, sus: 103, grile: 10, levier: 2, stopJos: 96.8, stopSus: 103.2, pr: -0.01 });
  fise.push({ id: "viitor", simbol: "X_USDT_PERP", t: acum - 3600000, H: 1, dir: "long", nivel: "nu", cheie: "ta", pret: 100, jos: 97, sus: 103, grile: 10, levier: 2 });
  const bare = (s) => Array.from({ length: 1500 }, (_, i) => { const t = s + i * 60000, p = 100 * (1 + 0.01 * Math.sin(t / 1.2e6)); return [t, p, p * 1.001, p * 0.999, p]; });
  const binance = async (u) => (/klines/.test(u) ? bare(Number(/startTime=(\d+)/.exec(u)[1])) : []);
  const trimise = [], reg = {}; const d = { acum, binance, cere: async () => ({ fise }), trimite: async (c, b) => { trimise.push([c, b]); }, jurnal: () => {}, registru: { citeste: (k) => reg[k] || null, scrie: (k, r) => { reg[k] = r; } } };
  const st = {}; await turaFise(d, st);
  assert.equal(st.judecate.length, 15, "cel mult 15 pe tură");
  await turaFise(d, st); assert.equal(st.judecate.length, 20, "restul la tura următoare; „viitor” încă nu"); assert.ok(!st.judecate.some((x) => x.id === "viitor"));
  await turaFise(d, st); assert.equal(st.judecate.length, 20, "o dată");
  const [cale, corp] = trimise[trimise.length - 1]; assert.match(cale, /action=fiseUrmarire/);
  assert.equal(corp.rezumat.nu.n, 10); assert.equal(corp.rezumat.asteapta.n, 10); assert.ok(Number.isFinite(corp.rezumat.nu.medie)); assert.ok(corp.rezumat.nu.vf && corp.rezumat.nu.vf.verdict);
  assert.ok(Number.isFinite(corp.proba.dif), "simulatorul de pe pagină față de 1 minut"); assert.ok(reg.fiseNu && reg.fiseNu.f.length >= 1);
});
await test("ruta: fisaNota (curățată, una pe monedă / zi / fereastră), fise (GET), fiseUrmarire (POST / GET)", async () => {
  const TOKEN = "t-349", kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const { pathToFileURL } = await import("node:url");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const cer = (a, corp, m) => new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: m || "POST", headers: { "cf-connecting-ip": "10.0.3.49", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: m === "GET" ? undefined : JSON.stringify(corp) });
  const n = { simbol: "x_usdt_perp", t: Date.now() - 1000, H: 2, dir: "long", nivel: "nu", cheie: "ta", pret: 100, jos: 97, sus: 103, grile: 10, levier: 3, stopJos: 96.8, stopSus: 103.2, pr: -0.01, rau: "<b>" };
  let r = await mod.onRequestPost({ request: cer("fisaNota", n), env }); assert.equal(r.status, 200); assert.equal((await r.json()).nou, true);
  r = await mod.onRequestPost({ request: cer("fisaNota", Object.assign({}, n, { t: Date.now() })), env }); assert.equal((await r.json()).nou, false, "aceeași monedă, zi, fereastră");
  const l = JSON.parse(kv.get("grid:fise")); assert.equal(l.length, 1); assert.equal(l[0].simbol, "X_USDT_PERP"); assert.ok(!("rau" in l[0])); assert.ok(l[0].id);
  r = await mod.onRequestPost({ request: cer("fisaNota", Object.assign({}, n, { H: 9 })), env }); assert.equal(r.status, 400);
  r = await mod.onRequestGet({ request: cer("fise", null, "GET"), env }); assert.equal((await r.json()).fise.length, 1);
  r = await mod.onRequestPost({ request: cer("fiseUrmarire", { la: Date.now(), rezumat: { nu: { n: 3, medie: -0.01 } }, proba: { n: 3, dif: 0.02 }, judecate: [] }), env }); assert.equal(r.status, 200);
  r = await mod.onRequestGet({ request: cer("fiseUrmarire", null, "GET"), env }); assert.equal((await r.json()).urmarire.rezumat.nu.n, 3);
});
await test("🔑 pagina: fișa se notează (o dată pe monedă / zi / fereastră) și rândul „Cum au ieșit fișele” e sub verdict; colectorul rulează tura", () => {
  const a = citeste("public", "app.js");
  assert.match(a, /function grFisaNoteaza\(/); assert.match(a, /action=fisaNota/); assert.match(a, /action=fiseUrmarire/); assert.match(a, /Cum au ieșit fișele/);
  const c = citeste("scripts", "colector.mjs"); assert.match(c, /turaFiseColector/); assert.match(c, /fise-urmarire-stare\.json/); assert.match(c, /registru: registruVf/);
});

// ---- Valul 3 - CLASAMENTUL (el: „O singură listă, ca Sugestii”) ----
await test("🔑 Idei.ideiBotiInfo dă și toți lichizii ordonați (pentru lista întreagă de pe pagina Grid), aceeași ordine ca primii 5", () => {
  const I = new Function(`${lib("idei.js")}; return Idei;`)();
  const m = (s, dir, scor, volum, f7) => ({ simbol: s + "_USDT_PERP", stare: "candidat", dir, scor, volum, f7 });
  const cl = { monede: [m("A", "long", 0.002, 5e6, 0), m("B", "long", 0.0019, 5e6, 0), m("C", "long", 0.0018, 5e6, 0), m("D", "short", 0.001, 5e6, 0), m("E", "neutru", 0.003, 5e5, 0), { simbol: "F_USDT_PERP", stare: "evita", volum: 9e6 }] };
  const inf = I.ideiBotiInfo(cl, 5);
  assert.deepEqual(inf.toti.map((x) => x.simbol[0]).join(""), "ABCD"); assert.deepEqual(inf.lista.map((x) => x.simbol[0]).join(""), "ABD", "cel mult 2 pe direcție");
  assert.ok(inf.toti.every((x) => Number.isFinite(x.net7)));
});
await test("🔑 pagina: clasamentul e lista din Sugestii (primele 5 la vedere, restul pliat cu numărul lor; sub 1 M și de evitat separat), fără tăietura la 60", () => {
  const a = citeste("public", "app.js"), f = a.slice(a.indexOf("function renderGridClasament(){"), a.indexOf("function grLinisteTine("));
  assert.match(f, /Idei\.ideiBotiInfo\(/); assert.doesNotMatch(f, /slice\(0,60\)/);
  assert.match(f, /class="grClasPli"/); assert.match(f, /sub 1 M USDT\/zi/); assert.match(f, /de evitat acum/); assert.match(f, /G1/);
  assert.match(f, /sugSparkHtml/); assert.match(f, /class="sugRand/);
  assert.doesNotMatch(f, /după mișcare gridul iese cel mai rău/);
});

// ---- Valul 4 - LABORATORUL (el: „Înghețat + corecția”) ----
const GL = new Function(`${lib("grid-laborator.js")}; return GridLaborator;`)();
const Q = (verdict, dif, p) => ({ id: "miscare", titlu: "Pornit după mișcare vs pornit în liniște", eticheteA: "după mișcare", eticheteB: "în liniște", verdict, net: { stare: "testat", dif, p, pMin: 0, ic: [dif - 0.01, dif + 0.01] }, A: { pePlus: 0.4 }, B: { pePlus: 0.5 } });
await test("🔑 laboratorul: verdictul se îngheață o singură dată pe bloc de 60 de zile care nu se suprapune; între blocuri, nimic nou", () => {
  const t0 = Date.UTC(2026, 10, 16);
  let r = GL.ingheata(null, [Q("dovedit", -0.02, 0.01)], t0); assert.equal(r.start, t0); assert.equal(r.blocuri.length, 0);
  r = GL.ingheata(r, [Q("dovedit", -0.02, 0.01)], t0 + 30 * ZI); assert.equal(r.blocuri.length, 0, "zgomotul zilnic nu se îngheață");
  r = GL.ingheata(r, [Q("dovedit", -0.02, 0.01)], t0 + 60 * ZI + 3600000); assert.equal(r.blocuri.length, 1); assert.equal(r.blocuri[0].intrebari[0].verdict, "dovedit"); assert.equal(r.blocuri[0].intrebari[0].net.p, 0.01);
  r = GL.ingheata(r, [Q("n-am-aflat", 0.001, 0.6)], t0 + 61 * ZI); assert.equal(r.blocuri.length, 1, "o dată pe bloc");
  r = GL.ingheata(r, [Q("n-am-aflat", 0.001, 0.6)], t0 + 121 * ZI); assert.equal(r.blocuri.length, 2);
  const b = GL.bilantBlocuri(r); assert.equal(b.miscare.n, 2); assert.equal(b.miscare.dovedit, 1);
  assert.equal(GL.pentruRegistru(r.blocuri[1].intrebari).length, 1, "blocul înghețat intră în corecția BH");
});
await test("🔑 corecția BH: ruta laboratorului păstrează netul și blocurile; tura verdictelor ia testele blocului înghețat; colectorul îngheață", async () => {
  const TOKEN = "t-349b", kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const { pathToFileURL } = await import("node:url");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "L");
  const blocuri = { start: Date.UTC(2026, 10, 16), blocuri: [{ de: 1, pana: 2, la: 2, intrebari: [Q("dovedit", -0.02, 0.01)] }] };
  const req = new Request("https://exemplu.test/api/istoric-bot?action=laborator", { method: "POST", headers: { "cf-connecting-ip": "10.0.3.50", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify({ la: Date.now(), monede: 20, ferestre: 100, H: 2, intrebari: [Q("dovedit", -0.02, 0.01)], blocuri }) });
  const r = await mod.onRequestPost({ request: req, env }); assert.equal(r.status, 200);
  const s = JSON.parse([...kv.entries()].find(([k]) => /labor/.test(k))[1]);
  assert.equal(s.intrebari[0].net.p, 0.01); assert.equal(s.blocuri.blocuri.length, 1); assert.equal(s.blocuri.blocuri[0].intrebari[0].net.dif, -0.02);
  assert.match(citeste("scripts", "lib", "tura-verdicte.mjs"), /GridLaborator\.pentruRegistru\(labInghetat\(lab\)\)/);
  const c = citeste("scripts", "colector.mjs"); assert.match(c, /GridLaborator\.ingheata\(registruVf\.citeste\("labBlocuri"\)/);
});
await test("🔑 pagina: laboratorul fără eticheta zilnică DOVEDIT - „dovedit în k din N blocuri” sau când se judecă primul; pliat într-un rând; Tabloul la fel", () => {
  const a = citeste("public", "app.js"), f = a.slice(a.indexOf("function renderGridLaborator(){"), a.indexOf("function gridClasamentAlege("));
  assert.doesNotMatch(f, /✅ DOVEDIT/); assert.match(f, /GridLaborator\.bilantBlocuri\(/); assert.match(f, /din \"\+|blocuri de 60 de zile/); assert.match(f, /class="grLabPli"/);
  assert.doesNotMatch(a, /qm\.verdict==="dovedit"\?"good"/);
});

// ---- Valul 5 - JURNALUL ȘI HÂRTIA PE SERVER (el: „Pe server”) ----
await test("🔑 hârtia: fără re-ancorare tăcută (lumânările nu ajung la pornire ⇒ spus), cu funding-ul monedei", () => {
  const JT = { };
  const Ob = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(GridCalcul, GridProba, JT);
  const b = bare((i) => 4.473 * (1 + 0.012 * Math.sin(i / 7)), 500), h = { pornit: b[0].t - 3 * ZI, setare: { dir: "long", jos: 4.3, sus: 4.6, grile: 20, levier: 3, suma: 100 } };
  const r = Ob.hartie(h, b); assert.equal(r.lipsa, true); assert.equal(r.usdt, null);
  const h2 = Object.assign({}, h, { pornit: b[10].t }), a = Ob.hartie(h2, b), f = Ob.hartie(h2, b, { fundingZi: 0.01 });
  assert.ok(Number.isFinite(a.usdt) && f.usdt < a.usdt, "funding-ul pozitiv costă long-ul"); assert.equal(f.funding, true);
});
await test("🔑 GridJurnal.uneste: după id, câștigă cel modificat ultimul (m), cele șterse nu revin", () => {
  const GJ = new Function("GridCalcul", `${lib("grid-jurnal.js")}; return GridJurnal;`)(GridCalcul);
  const a = [{ id: "1", m: 5, x: "telefon" }, { id: "2", m: 1 }], b = [{ id: "1", m: 9, x: "pc" }, { id: "3", m: 2 }];
  const u = GJ.uneste(a, b, ["2"]); assert.deepEqual(u.map((e) => e.id).sort(), ["1", "3"]); assert.equal(u.find((e) => e.id === "1").x, "pc");
});
await test("ruta gridJurnal: unește ce trimite aparatul cu ce e pe server și întoarce lista unită (aceeași pe telefon și PC)", async () => {
  const TOKEN = "t-349c", kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const { pathToFileURL } = await import("node:url");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "J");
  const cer = (corp, m) => new Request("https://exemplu.test/api/istoric-bot?action=gridJurnal", { method: m || "POST", headers: { "cf-connecting-ip": "10.0.3.51", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: m === "GET" ? undefined : JSON.stringify(corp) });
  let r = await mod.onRequestPost({ request: cer({ jurnal: [{ id: "a", m: 1, simbol: "X" }], hartie: [{ id: "h1", m: 1, setare: { jos: 1 } }], ignorati: ["b1"], sterse: [] }), env }); assert.equal(r.status, 200);
  r = await mod.onRequestPost({ request: cer({ jurnal: [{ id: "b", m: 2 }], hartie: [], ignorati: [], sterse: ["h1"] }), env });
  const j = await r.json(); assert.deepEqual(j.jurnal.map((e) => e.id).sort(), ["a", "b"]); assert.equal(j.hartie.length, 0); assert.deepEqual(j.ignorati, ["b1"]);
  r = await mod.onRequestGet({ request: cer(null, "GET"), env }); assert.equal((await r.json()).jurnal.length, 2);
  r = await mod.onRequestPost({ request: cer({ jurnal: "rău" }), env }); assert.equal(r.status, 400);
});
await test("🔑 pagina: jurnalul și hârtia se sincronizează cu serverul; ștergerea cere confirmare; hârtia își aduce lumânările de la pornire (pagini) și funding-ul; fără tăietura tăcută la 20", () => {
  const a = citeste("public", "app.js");
  assert.match(a, /function grSyncJurnal\(/); assert.match(a, /action=gridJurnal/); assert.match(a, /function grHartieBare\(/); assert.match(a, /endTime=/);
  const st = a.slice(a.indexOf("function gridJurnalSterge("), a.indexOf("async function gridJurnalActualizeaza("));
  assert.match(st, /confirm\(/); assert.match(a.slice(a.indexOf("function gridHartieSterge("), a.indexOf("var grHartieCache")), /confirm\(/);
  assert.doesNotMatch(a, /l\.slice\(-20\)\)\)\}catch/); assert.match(a, /aceleași pe telefon și pe PC/);
});

// ---- Valul 6 - ASPECTUL „ca paginile refăcute” + mărunțișurile ----
await test("🔑 tema: Grid intră în paginile refăcute (rădăcina în generator, comutatorul, butonul din antet, rama comună); stratul generat e la zi", async () => {
  assert.match(citeste("scripts", "face-tema-tablou.mjs"), /RADACINI = \[[^\]]*"gridset"/);
  const a = citeste("public", "app.js"), ap = a.slice(a.indexOf("function tbTemaAplica(){"), a.indexOf("function tbTemaAplica(){") + 700);
  assert.match(ap, /"gridset"/); assert.match(ap, /"grTemaBtn"/);
  assert.match(citeste("public", "index.html"), /id="grTemaBtn"[^>]*data-action-click="tbTemaComuta\(\)"/);
  assert.match(citeste("public", "app.css"), /html:has\(:is\(#tabloubot,#t212,#dash,#rangefilter,#sugestii,#probe,#gridset,#gridsim,#montecarlo,#jurnaltrade,#comportament,#tradezilei,#carnet,#scan\)\.on\.tbZi\) body/);
  const { execFileSync } = await import("node:child_process"); execFileSync(process.execPath, [path.join(RAD, "scripts", "face-tema-tablou.mjs"), "--check"], { stdio: "pipe" });
});
await test("🔑 sus: fraza mare + „De unde știu”; pe ecran lat lista și fișa alături (lista lipită, cu derulare proprie)", () => {
  assert.match(citeste("public", "index.html"), /id="grFrazaBox"/);
  const a = citeste("public", "app.js"); assert.match(a, /function renderGridFraza\(/); assert.match(a.slice(a.indexOf("function renderGridFraza(")), /De unde știu/);
  const c = citeste("public", "app.css"); assert.match(c, /@media \(min-width:1280px\)\{\.pzDemo #gridset\.on\{display:grid/); assert.match(c, /\.pzDemo #gridset\.on>#grClasamentCard\{grid-column:1/);
  assert.match(c, /\.pzDemo #gridset\.on>#grFrazaBox\{order:5\}/);
});
await test("mărunțișuri: tabelul planului pe direcția botului tău; sumele cu o zecimală; textele numesc butoanele cum se văd; pragul calibrării spus la fel", () => {
  const a = citeste("public", "app.js"), x = citeste("public", "index.html");
  assert.match(a, /var grLabDir=null;/); assert.match(a, /function grLabDirBot\(/);
  assert.doesNotMatch(a, /\+s\.suma\+" USDT · pornit "/); assert.doesNotMatch(a, /\(e\.suma!=null\?e\.suma:"\?"\)\+" USDT"/);
  assert.doesNotMatch(x + a, /apasă „Pornește pe hârtie”/); assert.doesNotMatch(x, /apasă „am pornit botul”/);
  assert.doesNotMatch(a, /După 10–20 de boți, rezumatul de sus spune dacă verdictele au adus bani/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
