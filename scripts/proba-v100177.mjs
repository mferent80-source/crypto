// Probele v100.177 (13.10.2026, el: „din a doua recomandare 1–4 plus jurnalul verdictelor”) — jurnalul verdictelor și calibrarea lor,
// corecția pentru teste multiple (Benjamini–Hochberg pe tot registrul), profitul așteptat și corelația cu ce ai deja, la Poartă.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.177 · jurnalul verdictelor, corecția, Poarta · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, Set, Map, TextRo: globalThis.TextRo };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["verdicte.js", "cont-intreg.js"]) vm.runInContext(citeste("public", "lib", f), ctx);
const V = ctx.Verdicte, ZI = 86400000, T0 = Date.parse("2026-01-05T15:00:00Z");
function mb(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

await test("jurnalul: un verdict pe (sursă, simbol, zi) — cel mai nou rămâne; sursele necunoscute și prețurile lipsă ies", () => {
  const j = V.adauga([], [{ s: "poarta-t212", k: "AAPL_US_EQ", n: "Cumpara", p: 100, t: T0 }, { s: "poarta-t212", k: "AAPL_US_EQ", n: "nu", p: 101, t: T0 + 3600000 }, { s: "altceva", k: "X", n: "a", p: 1, t: T0 }, { s: "idei", k: "Y", n: "cumpar", p: 0, t: T0 }]);
  assert.equal(j.length, 1); assert.equal(j[0].n, "nu"); assert.equal(j[0].k, "AAPL_US_EQ");
  assert.equal(V.adauga(j, { s: "poarta-t212", k: "AAPL_US_EQ", n: "cumpara", p: 99, t: T0 + ZI }).length, 2, "a doua zi = alt verdict");
});
await test("evaluarea: randamentul după h bare de bursă; gridul: „a stat în bandă” din maximele / minimele zilelor; ideile față de QQQ", () => {
  const bare = (l) => l.map((c, i) => ({ t: T0 + (i + 1) * ZI, c, h: c * 1.01, l: c * 0.99 }));
  const b = { A: bare([101, 102, 103, 104, 110]), G: bare([100, 101, 100, 99]) }, q = { QQQ: [{ t: T0 - 1, c: 400 }].concat(bare([404, 404, 404, 404, 408])) };
  const ev = V.evalueaza([{ s: "poarta-t212", k: "A", n: "cumpara", p: 100, t: T0 }, { s: "poarta-grid", k: "G", n: "porneste", p: 100, t: T0, j: 95, u: 105 }, { s: "idei", k: "A", n: "cumpar", p: 100, t: T0 }], b, q);
  const a5 = ev.find((x) => x.s === "poarta-t212" && x.h === 5); assert.ok(Math.abs(a5.r - 0.10) < 1e-12);
  const g1 = ev.find((x) => x.s === "poarta-grid" && x.h === 1); assert.equal(g1.val, 1);
  const i5 = ev.find((x) => x.s === "idei" && x.h === 5); assert.ok(Math.abs(i5.val - (0.10 - 0.02)) < 1e-12, "10% minus 2% al QQQ");
  assert.equal(ev.filter((x) => x.h === 20).length, 0, "orizontul de 20 nu s-a împlinit");
});
await test("calibrarea: „puține” sub 30 pe o parte; cu un efect clar, testul îl vede (p mic)", () => {
  const ev = [], r = mb(1);
  for (let i = 0; i < 300; i++) ev.push({ s: "poarta-t212", k: "S" + (i % 60), n: i % 2 ? "cumpara" : "nu", t: T0, h: 20, r: 0, val: (i % 2 ? 0.03 : -0.01) + (r() - 0.5) * 0.04 });
  const c = V.calibrare(ev); assert.equal(c.length, 1); assert.equal(c[0].test.stare, "testat"); assert.ok(c[0].test.p < 0.01, "p " + c[0].test.p); assert.ok(c[0].test.dif > 0.03);
  assert.equal(V.calibrare(ev.slice(0, 40))[0].test.stare, "putine");
});
await test("Benjamini–Hochberg: dintre 0,001 / 0,02 / 0,03 / 0,6 la 5 % rămân primele trei; fără p-uri mici, nimic", () => {
  const r = V.bh([{ p: 0.6 }, { p: 0.02 }, { p: 0.001 }, { p: 0.03 }], 0.05);
  assert.deepEqual(r.map((x) => x.ramane), [false, true, true, true]);
  assert.deepEqual(V.bh([{ p: 0.04 }, { p: 0.5 }, { p: 0.7 }], 0.05).map((x) => x.ramane), [false, false, false], "0,04 trecea singur, nu și cu 3 teste");
});
await test("statistica pe date FĂRĂ efect (200 de seturi × 6 teste): după corecție, „dovedit” fals în cel mult ~5 % din seturi", () => {
  const r = mb(7); let fals = 0;
  for (let s = 0; s < 200; s++) {
    const teste = [];
    for (let k = 0; k < 6; k++) {
      const fav = [], rest = []; for (let i = 0; i < 80; i++) { const x = { k: "S" + (i % 25), val: (r() - 0.5) * 0.1 }; (i % 2 ? fav : rest).push(x); }
      teste.push(V.compara(fav, rest, { reps: 300, seed: s * 10 + k + 1 }));
    }
    if (V.bh(teste, 0.05).some((x) => x.ramane)) fals++;
  }
  assert.ok(fals / 200 <= 0.07, "fals " + fals + " din 200");
  // și când fiecare simbol are UN singur fel de verdict (randomizarea pe simbol întreg), cu simboluri care diferă între ele (efectul simbolului)
  let fals2 = 0;
  for (let s = 0; s < 200; s++) {
    const teste = [];
    for (let k = 0; k < 6; k++) {
      const fav = [], rest = [], efect = {}; for (let c = 0; c < 30; c++) efect["S" + c] = (r() - 0.5) * 0.04;
      for (let i = 0; i < 90; i++) { const c = "S" + (i % 30), x = { k: c, val: efect[c] + (r() - 0.5) * 0.06 }; ((i % 30) % 2 ? fav : rest).push(x); }
      teste.push(V.compara(fav, rest, { reps: 300, seed: s * 10 + k + 5 }));
    }
    if (V.bh(teste, 0.05).some((x) => x.ramane)) fals2++;
  }
  assert.ok(fals2 / 200 <= 0.07, "fals (un verdict pe simbol) " + fals2 + " din 200");
});
await test("registrul: verdictele + obiceiurile din riscul tău + becurile boților, corecția pe toate deodată; ce zicea „dovedit” și cade se vede", () => {
  const cal = [{ sursa: "poarta-t212", nume: "Poarta Trading 212", h: 20, intrebare: "q", test: { stare: "testat", p: 0.2, dif: 0.01 } }];
  const risc = { boti: { comportament: [{ nume: "Stop pus", p: 0.03, dif: 0.02, stare: "dovedit-bun" }, { nume: "Levier peste 3×", p: 0.0001, dif: -0.05, stare: "dovedit-rau" }] } };
  const reg = V.registru({ calibrare: cal, risc, asemanatoare: [{ nume: "becuri", p: 0.5, difMed: 0, verdict: "nedovedit" }] });
  assert.equal(reg.length, 4); assert.equal(reg.find((x) => x.afirmatie === "Levier peste 3×").ramane, true); assert.equal(reg.find((x) => x.afirmatie === "Stop pus").ramane, false, "0,03 cu 4 teste nu mai trece");
});
await test("riscul tău și boții asemănători dau p-ul din aceeași distribuție bootstrap (verdictul lor nu se schimbă)", () => {
  assert.match(citeste("public", "lib", "risc-luna.js"), /p: pB, stare: dov \? "dovedit-" \+ sens/);
  assert.equal((citeste("public", "lib", "asemanatoare.js").match(/out\.p = bm\.length \? Math\.min\(1, \(2 \* Math\.min\(/g) || []).length, 2);
  assert.match(citeste("scripts", "colector.mjs"), /teste: \[\{ nume: "Boții porniți cu ADX sub 20 față de cei în trend \(peste 25\)", p: bA\.p \?\? null/);
});

// serverul
await test("serverul: verdictele (unul sau mai multe), un verdict pe (sursă, simbol, zi); calibrarea cu „la”", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`); let ip = 0;
  const h = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://ex.test", "cf-connecting-ip": "10.177.1." + (++ip) });
  const post = async (a, c) => (await m.onRequestPost({ request: new Request("https://ex.test/api/istoric-bot?action=" + a, { method: "POST", headers: h(), body: JSON.stringify(c) }), env })).status;
  const get = async (a) => JSON.parse(await (await m.onRequestGet({ request: new Request("https://ex.test/api/istoric-bot?action=" + a, { headers: h() }), env })).text());
  assert.equal(await post("verdict", { s: "poarta-t212", k: "AAPL_US_EQ", n: "cumpara", p: 100, t: Date.now() }), 200);
  assert.equal(await post("verdict", { verdicte: [{ s: "poarta-t212", k: "AAPL_US_EQ", n: "nu", p: 101, t: Date.now() + 1000 }, { s: "idei", k: "MSFT_US_EQ", n: "cumpar", p: 400, t: Date.now() }] }), 200);
  assert.equal(await post("verdict", { s: "hack", k: "X", n: "a", p: 1, t: Date.now() }), 400);
  const j = (await get("verdicte")).verdicte; assert.equal(j.length, 2); assert.equal(j.find((x) => x.k === "AAPL_US_EQ").n, "nu");
  assert.equal(await post("verdicteCalibrare", { calibrare: [] }), 400); assert.equal(await post("verdicteCalibrare", { la: 1, calibrare: [], registru: [] }), 200);
  assert.equal((await get("verdicteCalibrare")).calibrare.la, 1);
});

// pagina: Porțile
await test("Porțile trimit verdictul în jurnal (o dată pe simbol pe zi, fără să blocheze); gridul și cu banda gridului", () => {
  const app = citeste("public", "app.js"), t = citeste("public", "lib", "t212-ecran.js");
  assert.match(app, /function verdictTrimite\(v\)\{/); assert.match(app, /verdictTrimite\(\{s:"poarta-grid",k:f\.simbol,n:f\.verdict\.nivel,p:f\.pret,j:stV&&stV\.jos,u:stV&&stV\.sus\}\)/);
  assert.match(t, /verdictTrimite\(\{ s: "poarta-t212", k: tk, n: vp\.nivel, p: st\.pret \}\)/);
});
const ctxP = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, ContIntreg: ctx.ContIntreg, document: { getElementById: () => null }, localStorage: { getItem: () => null, setItem() {} } };
ctxP.window = ctxP; ctxP.globalThis = ctxP; vm.createContext(ctxP);
const T = citeste("public", "lib", "t212-ecran.js"), fn = (n) => { const i = T.indexOf("function " + n + "("); let a = 0, j = T.indexOf("{", i); for (; j < T.length; j++) { if (T[j] === "{") a++; else if (T[j] === "}") { a--; if (!a) break; } } return T.slice(i, j + 1); };
vm.runInContext(["t212Cate", "t212Suma", "t212Lei", "t212PoartaCont"].map(fn).join("\n") + "\nvar escapeHtml = function (s) { return String(s); }; var t212 = { cont: null }; var ciStare = { raport: null };", ctxP);
await test("Poarta T212: profitul așteptat = media pe istoria ei TRASĂ SPRE ZERO după ferestrele independente; ≤ 0 ⇒ „fără avantaj”", () => {
  ctxP.t212MarimePoarta = () => ({ suma: 3000 }); ctxP.t212Jurnal = () => null;
  const h = ctxP.t212PoartaCont({ niv: { nivel: "ok", proba: { medie: 0.012, n: 200, nIndep: 10 } } });
  assert.match(h, /📈 <b>Profit așteptat:<\/b> \+0,40% pe trade după comision/); assert.match(h, /doar ~10 ferestre independente/); assert.match(h, /≈ \+12 lei/);
  const r = ctxP.t212PoartaCont({ niv: { nivel: "ok", proba: { medie: -0.004, n: 200, nIndep: 10 } } }); assert.match(r, /📉/); assert.match(r, /Fără avantaj măsurat/);
});
await test("Poarta T212: „se mișcă la fel cu ce ai deja” (ρ ≥ 0,6 pe zilele comune) și riscul pe o zi al contului înainte / după", () => {
  const z = Array.from({ length: 120 }, (_, i) => new Date(T0 + i * ZI).toISOString().slice(0, 10)), r = mb(3), mi = z.map(() => (r() - 0.5) * 0.06);
  const bare = [{ t: T0 - ZI, c: 100 }]; z.forEach((d, i) => bare.push({ t: Date.parse(d + "T15:00:00Z"), c: bare[bare.length - 1].c * (1 + mi[i]) }));
  const serie = {}; z.forEach((d, i) => { serie[d] = mi[i] * 0.9 + (r() - 0.5) * 0.005; });
  ctxP.ciStare.raport = { serii: { "T:WDC_US_EQ": serie }, expuneri: [{ cheie: "T:WDC_US_EQ", nume: "WDC" }], risc: { var95: 1000, pnl: z.map((d, i) => [d, mi[i] * 20000]) } };
  ctxP.t212MarimePoarta = () => ({ suma: 5000 });
  const h = ctxP.t212PoartaCont({ ticker: "STX_US_EQ", bare, niv: null });
  assert.match(h, /🔗 <b>Se mișcă la fel cu ce ai deja:<\/b> WDC \(ρ (0,9\d|1,00)\)/);
  const m = /Riscul pe o zi al contului \(ziua proastă, 1 din 20\): ~([\d.]+) lei → ~([\d.]+) lei/.exec(h); assert.ok(m, h); assert.ok(Number(m[2].replace(/\./g, "")) > Number(m[1].replace(/\./g, "")), "o poziție corelată CREȘTE riscul contului");
});
await test("Poarta gridului: profitul așteptat din boții tăi asemănători, tras spre zero după câți sunt", () => {
  const app = citeste("public", "app.js"), i = app.indexOf("function grAsteptatHtml("), f = app.slice(i, app.indexOf("\nfunction ", i + 10));
  const c2 = { TextRo: globalThis.TextRo, escapeHtml: (s) => String(s) }; vm.createContext(c2); vm.runInContext(f, c2);
  assert.match(c2.grAsteptatHtml({ asG: { n: 20, medianaPct: 0.04 } }), /📈 <b>Profit așteptat<\/b> pe boții tăi asemănători: \+2,0% din sumă \(mediana lor \+4,0%, trasă spre zero: 20 de cazuri\)/);
  assert.match(c2.grAsteptatHtml({ asG: { n: 8, medianaPct: -0.02 } }), /Fără avantaj măsurat/); assert.equal(c2.grAsteptatHtml({ asG: null }), "");
});
// pagina Contul întreg: verdictele
await test("pagina: „Au avut dreptate verdictele?” — gol ⇒ cum se umple; cu calibrare ⇒ tabelul pe niveluri, „puține”, registrul și ce cade după corecție", () => {
  const c3 = { TextRo: globalThis.TextRo }; vm.createContext(c3); vm.runInContext(citeste("public", "lib", "cont-ecran.js"), c3);
  assert.match(c3.ciVerdicteHtml(null), /Jurnalul verdictelor se umple de acum/);
  const h = c3.ciVerdicteHtml({ n: 120, evaluate: 60, calibrare: [{ sursa: "idei", nume: "Ideile zilei (acțiuni)", h: 5, masura: "pesteQqq", intrebare: "ideile față de Nasdaq (QQQ) pe aceleași zile", niveluri: [{ nivel: "cumpar", n: 60, medie: 0.004, mediana: 0.002, pePlus: 0.55 }], test: { stare: "testat", dif: 0.004, p: 0.31 } },
    { sursa: "poarta-t212", nume: "Poarta Trading 212", h: 20, masura: "randament", intrebare: "„cumpără” față de „așteaptă / nu”", niveluri: [{ nivel: "cumpara", n: 5, medie: 0.01, pePlus: 0.6 }], test: { stare: "putine", nFav: 5, nRest: 2 } }],
    registru: [{ sursa: "Riscul tău · boți", afirmatie: "Levier peste 3×", p: 0.0001, ramane: true }, { sursa: "Riscul tău · boți", afirmatie: "Stop pus", p: 0.03, ramane: false, stareVeche: "dovedit-bun" }] });
  assert.match(h, /120 de verdicte ținute minte, dintre care 60 au fost judecate/); assert.match(h, /Ideile zilei \(acțiuni\) · după 5 zile de bursă/); assert.match(h, /p = 0,310/);
  assert.match(h, /puține cazuri încă \(5 \/ 2/); assert.match(h, /Radarul are 2 teste deschise/); assert.match(h, /rămân 1 lucru dovedit/);
  assert.match(h, /Stop pus · p = 0,0300 · pagina lui zicea „dovedit”, după corecție NU mai e/);
});
await test("legarea: verdicte.js încărcat înainte de cont-ecran.js și în cache; colectorul încarcă Verdicte și rulează tura", () => {
  assert.match(citeste("public", "index.html"), /<script src="\/lib\/cont-intreg\.js"><\/script><script src="\/lib\/verdicte\.js"><\/script>(<script src="\/lib\/[a-z-]+\.js"><\/script>)*<script src="\/lib\/cont-ecran\.js"><\/script>/);
  assert.match(citeste("public", "sw.js"), /"\/lib\/cont-intreg\.js","\/lib\/verdicte\.js",("\/lib\/[a-z-]+\.js",)*"\/lib\/cont-ecran\.js"/);
  const c = citeste("scripts", "colector.mjs"); assert.match(c, /const Verdicte = incarca\("verdicte\.js", "Verdicte"\)/); assert.match(c, /turaVerdicteColector\(\)\.catch/);
});
const TV = await import("./lib/tura-verdicte.mjs");
await test("tura verdictelor: o singură dată istoricul ideilor; zilnic ideile + regimul macro; judecata la 6 ore cu registrul", async () => {
  const trimise = [], azi = new Date(Date.UTC(2026, 9, 13, 8, 0)).getTime();
  const z = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date(azi));
  const d = { acum: azi, Verdicte: V, jurnal: () => {}, GridCalcul: { bareBursa: (r) => r.map((x) => ({ t: x.time, c: x.close })), bare: (k) => k },
    cere: async (p) => p.includes("action=idei") ? { istoric: [{ zi: "2026-09-25", ticker: "SNDK_US_EQ", pret: 1753 }], idei: { zi: z, la: azi, actiuni: [{ ticker: "MU_US_EQ", pret: 200 }], restul: [] } }
      : p.includes("action=piata") ? { macro: { cod: "neutru", scor: 0 } } : p.includes("action=verdicte") ? { verdicte: [] } : p.includes("action=risc") ? { risc: null } : p.includes("action=cazuri") ? { cazuri: null } : {},
    bareZi: async () => ({ randuri: [{ time: azi - ZI, close: 500 }] }), trimite: async (p, c) => { trimise.push([p, c]); return { ok: true }; } };
  const st = {}; await TV.turaVerdicte(d, st);
  const v = trimise.find((x) => x[0].includes("action=verdict"))[1].verdicte;
  assert.deepEqual(v.map((x) => x.s + ":" + x.k).sort(), ["idei:MU_US_EQ", "idei:SNDK_US_EQ", "macro:SPY_US_EQ"]); assert.ok(st.umplutDinUrma); assert.equal(st.ziLog, z);
  assert.ok(trimise.some((x) => x[0].includes("action=verdicteCalibrare")), "judecata a rulat");
  trimise.length = 0; await TV.turaVerdicte(d, st); assert.equal(trimise.length, 0, "a doua oară în aceeași zi / sub 6 ore: nimic");
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
