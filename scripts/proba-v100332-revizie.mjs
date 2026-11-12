// Proba v100.332 · revizia Opus a reparațiilor (12.11.2026): patru drumuri pe care o sursă lipsă tot ajungea la verde / la cereri multe:
//   🟡1 Poarta T212 cu frâna contului NECUNOSCUTĂ (calendarul n-a venit: aplicația deschisă direct pe T212) nu mai dă 🟢 CUMPĂR;
//   🟡2 fără VIX, Nasdaq nu mai e „🟢 URCARE LARGĂ” (treapta coboară la galben, ca la lățimea lipsă), iar lipsa datelor nu dă alertă de „vreme”;
//   🟡3 Piața azi: o sursă picată peste date vechi se reîncearcă cu pauză crescătoare (1, 2, 4 min, cel mult 5), nu toată tura la fiecare minut;
//   🟡4 barele respinse (vechi / ale altui simbol) nu mai intră în trendul zilnic al Consilierului și nici în beta („Dacă Nasdaq scade 10%”).
//   node scripts/proba-v100332-revizie.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); } }
console.log("\nV100.332 · revizia Opus · proba\n");

for (const f of ["alerte.js", "acasa.js"]) vm.runInThisContext(lib(f));
const A = globalThis.Acasa, Al = globalThis.Alerte;
const ZI = 86400000, T0 = Date.UTC(2026, 5, 1), MIN = 60000;
const zile = (n, f) => Array.from({ length: n }, (_, i) => ({ t: T0 + i * ZI, o: f(i), h: f(i) * 1.01, l: f(i) * 0.99, c: f(i) }));
const urca = zile(260, (i) => 100 * Math.pow(1.002, i));
const X = (s) => ({ s, ch: 1, ch5: 1, e50: true, e200: true, rsi: 60, mis: 0.5, p: 100 });
const NDX_LARG = A.largimeNdx(["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "PANW", "MCHP", "PYPL"].map(X));

// ---------------- 🟡2 ----------------
await test("🟡2 fără VIX, cu lățime largă: nu mai e „🟢 URCARE LARGĂ” (galben, spune de ce), iar fraza nu invită", () => {
  const cu = A.vremeBursa({ qqq: urca, vix: 15, ndx: NDX_LARG });
  assert.equal(cu.nivel, "larga", "premisa: cu VIX e largă");
  const fara = A.vremeBursa({ qqq: urca, vix: null, ndx: NDX_LARG });
  assert.notEqual(fara.nivel, "larga"); assert.equal(fara.nivel, "ingusta");
  assert.equal(fara.faraVix, true); assert.doesNotMatch(fara.eticheta, /🟢/); assert.match(fara.eticheta, /VIX/);
  assert.match(fara.faCe, /N-aș cumpăra până nu văd VIX-ul/);
});
await test("🟡2 alerta de „vreme”: lățimea sau VIX-ul lipsă NU sunt o schimbare de vreme (nici la cădere, nici la revenire)", () => {
  const V = (b) => ({ crypto: { nivel: "amestecat", eticheta: "🟡 AMESTECAT", titlu: "t" }, bursa: b });
  const larg = A.vremeBursa({ qqq: urca, vix: 15, ndx: NDX_LARG }), faraLat = A.vremeBursa({ qqq: urca, vix: 15 }), faraVix = A.vremeBursa({ qqq: urca, vix: null, ndx: NDX_LARG });
  assert.equal(faraLat.latime, "necunoscuta", "premisa");
  let r = Al.schimbareVreme(null, V(larg), T0);
  for (const [k, v] of [[1, faraLat], [2, faraLat], [3, faraLat], [4, faraVix], [5, faraVix], [6, larg], [7, larg]]) {
    r = Al.schimbareVreme(r.stare, V(v), T0 + k * 10 * MIN);
    assert.deepEqual(r.mesaje, [], "a dat alertă la pasul " + k + " (" + v.eticheta + ")");
  }
  // prima citire a colectorului fără lățime: starea bursei se ține (tura o citește), iar datele adevărate de după o înlocuiesc FĂRĂ alertă
  let p = Al.schimbareVreme(null, V(faraLat), T0);
  assert.ok(p.stare.bursa, "starea bursei lipsește după prima citire fără lățime");
  for (let k = 1; k <= 3; k++) { p = Al.schimbareVreme(p.stare, V(larg), T0 + k * 10 * MIN); assert.deepEqual(p.mesaje, [], "alertă la revenirea datelor, pasul " + k); }
  assert.equal(p.stare.bursa.nivel, "larga");
});

// ---------------- 🟡3 ----------------
await test("🟡3 Piața azi: sursa picată peste date vechi ⇒ reîncercare cu pauză crescătoare (1, 2, 4, 5 min), nu toată tura la fiecare minut", () => {
  const src = fnDin(lib("acasa-ecran.js"), "acasaPorneste");
  assert.ok(!src.includes("Date.now() - ACASA_MS + 30000"), "a rămas reîncercarea la fiecare minut");
  const m = src.match(/acasa\.esec/g) || []; assert.ok(m.length >= 2, "numărul de eșecuri la rând nu e ținut");
  // formula, rulată: după n eșecuri la rând, următoarea tură pleacă peste min(5 min, 1 min × 2^(n-1)) - intervalul de 60 s o vede doar când a trecut
  const linie = src.split("\n").find((l) => l.includes("acasa.la =") && l.includes("acasa.esec"));
  assert.ok(linie, "lipsește rândul care pune acasa.la după eșecuri");
  const ACASA_MS = 5 * MIN, pauze = [];
  for (let n = 1; n <= 5; n++) {
    const acasa = { esec: n - 1 }, d = { clasament: 1, piata: 1, tickers: 1, piataErr: "picat" }, ACUM = 1e12;
    const f = new Function("acasa", "d", "ACASA_MS", "Date", linie.trim().replace(/;?\s*(\/\*.*\*\/)?\s*$/, "") + "; return acasa;");
    const a = f(acasa, d, ACASA_MS, { now: () => ACUM });
    pauze.push((a.la + ACASA_MS - ACUM) / MIN);
  }
  assert.deepEqual(pauze, [1, 2, 4, 5, 5]);
  const ok = new Function("acasa", "d", "ACASA_MS", "Date", linie.trim().replace(/;?\s*(\/\*.*\*\/)?\s*$/, "") + "; return acasa;")({ esec: 3 }, { clasament: 1, piata: 1, tickers: 1 }, 5 * MIN, { now: () => 7 });
  assert.equal(ok.la, 7); assert.equal(ok.esec, 0, "după o tură reușită numărătoarea pornește de la zero");
});

// ---------------- 🟡1 / 🟡4 · pagina T212 (funcțiile ei, într-un vm) ----------------
const T212SRC = lib("t212-ecran.js");
function vmT212(extra) {
  const ctx = vm.createContext(Object.assign({ console, Date, Math, Number, String, Object, Array, JSON, isFinite, TextRo: globalThis.TextRo }, extra || {}));
  for (const f of ["actiuni-semnale.js"]) vm.runInContext(lib(f), ctx);
  vm.runInContext("var t212 = { bare: {}, beta: {}, poz: [] };\n" + ["t212FranaCont", "t212FranaPoartaText", "t212CuFrana", "t212RaportCont", "t212BareRespinse", "t212SemZi"].map((n) => fnDin(T212SRC, n)).join("\n"), ctx);
  return ctx;
}
await test("🟡1 Poarta: frâna contului NECUNOSCUTĂ (calendarul n-a venit) face din 🟢 un AȘTEAPTĂ, cu motivul; știută și netrasă ⇒ rămâne 🟢", () => {
  const verde = { nivel: "cumpara", motive: ["trend sus"] };
  const nec = vmT212({ Acasa: A, acFranaContText: () => "", acFranaContStiut: () => false, acFranaContNec: () => "n-am calendarul de azi (Yahoo a picat), deci nu știu dacă e un eveniment mare" });
  const v = nec.t212CuFrana(verde, nec.t212FranaPoartaText());
  assert.equal(v.nivel, "asteapta"); assert.match(v.motive.join(" | "), /nu știu încă dacă e trasă.*n-am calendarul/);
  const stiut = vmT212({ Acasa: A, acFranaContText: () => "", acFranaContStiut: () => true, acFranaContNec: () => "" });
  assert.equal(stiut.t212CuFrana(verde, stiut.t212FranaPoartaText()).nivel, "cumpara");
  const trasa = vmT212({ Acasa: A, acFranaContText: () => "N-aș cumpăra chiar înainte de CPI.", acFranaContStiut: () => true, acFranaContNec: () => "" });
  assert.match(trasa.t212CuFrana(verde, trasa.t212FranaPoartaText()).motive.join(" | "), /frâna contului: N-aș cumpăra chiar înainte de CPI/);
});
await test("🟡1 Poarta își aduce calendarul și raportul (acVremeAsigura) ÎNAINTE de verdictul cu frâna", () => {
  const src = fnDin(T212SRC, "t212Poarta"), i = src.indexOf("acVremeAsigura"), j = src.indexOf("t212CuFrana(");
  assert.ok(i > 0 && j > i, "acVremeAsigura lipsește sau vine după frână");
  assert.ok(src.includes("t212FranaPoartaText()"), "Poarta nu folosește frâna cu „nu știu”");
});
await test("🟡4 barele respinse (ale altui simbol / vechi) nu dau trendul zilnic al Consilierului și nici beta", () => {
  const bare = (n, c) => Array.from({ length: n }, (_, i) => ({ t: Date.now() - (n - i) * ZI, o: c, h: c * 1.01, l: c * 0.99, c }));
  const ctx = vmT212({ GraficBot: { semZi: () => "urca" } });
  vm.runInContext("t212.poz = [{ ticker: 'XYZ_US_EQ', currentPrice: 10 }, { ticker: 'OK_US_EQ', currentPrice: 100 }];", ctx);
  ctx.t212.bare.XYZ_US_EQ = bare(60, 100);   // închiderea 100 față de prețul T212 10 ⇒ alt simbol (raport 0,1)
  ctx.t212.bare.OK_US_EQ = bare(60, 100);
  assert.equal(ctx.t212BareRespinse({ ticker: "XYZ_US_EQ", currentPrice: 10 }), true);
  assert.equal(ctx.t212BareRespinse({ ticker: "OK_US_EQ", currentPrice: 100 }), false);
  assert.equal(ctx.t212SemZi("XYZ_US_EQ"), null, "trendul pe barele altui simbol");
  assert.equal(ctx.t212SemZi("OK_US_EQ"), "urca");
  const randare = fnDin(T212SRC, "t212Render");
  assert.match(randare, /beta: *\(?typeof t212BareRespinse === "function" && t212BareRespinse\(x\)\)? *\? *null *: *t212\.beta\[x\.ticker\]/, "beta din portofoliu nu ocolește barele respinse");
});

console.log(`\n${picate ? "PICĂ" : "trec"} ${teste - picate}/${teste}`);
process.exit(picate ? 1 : 0);
