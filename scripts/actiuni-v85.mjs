// Probele v85: semnalele pentru actiuni (public/lib/actiuni-semnale.js) - trend/miscare pe zilnice,
// semaforul unei pozitii T212, greselile din jurnal, poarta de intrare, portofoliul.
import assert from "node:assert/strict";
import fs from "node:fs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const SRC = ["grid-calcul.js", "actiuni-semnale.js"].map((f) => { const u = new URL("../public/lib/" + f, import.meta.url); return fs.existsSync(u) ? fs.readFileSync(u, "utf8") : ""; }).join("\n");
const A = new Function(`${SRC}; return typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale : null;`)();
const ZI = 86400000;
// bare zilnice deja curatate (forma GridCalcul.bare: t,o,h,l,c), crescator
function zilnice(n, f) { const b = []; for (let i = 0; i < n; i++) { const c = f(i); b.push({ t: Date.UTC(2025, 0, 1) + i * ZI, o: c, h: c * 1.01, l: c * 0.99, c }); } return b; }
const urca = zilnice(300, (i) => 100 * Math.pow(1.002, i) * (1 + 0.004 * Math.sin(i)));
const coboara = zilnice(300, (i) => 100 * Math.pow(0.998, i) * (1 + 0.004 * Math.sin(i)));

console.log("\nV85 · semnale actiuni · proba\n");
await test("modulul exista", () => assert.ok(A, "public/lib/actiuni-semnale.js lipseste"));

await test("stare: trend sus pe o serie care urca, jos pe una care coboara; maximul pe 52 de saptamani si distanta pana la el", () => {
  const s = A.stare(urca), j = A.stare(coboara);
  assert.equal(s.trend.dir, "sus"); assert.equal(j.trend.dir, "jos");
  const mx = Math.max(...urca.slice(-252).map((b) => b.h));
  aprox(s.max52, mx, 1e-9); aprox(s.distMax52, urca.at(-1).c / mx - 1, 1e-12);
  assert.ok(j.distMax52 < -0.3, "seria care coboara e departe de maxim " + j.distMax52);
  assert.ok(s.max7z > 0 && s.distMax7z <= 0);
});
await test("stare: prea putine bare -> fara-date (nu trend inventat); pretul de acum, daca e dat, bate ultima inchidere", () => {
  const s = A.stare(urca.slice(0, 20));
  assert.equal(s.trend.dir, "fara-date"); assert.strictEqual(s.miscare, null);
  const p = A.stare(urca, 999); assert.equal(p.pret, 999);
  assert.equal(A.stare([]).trend.dir, "fara-date"); assert.equal(A.stare(null).trend.dir, "fara-date");
});
await test("stare: miscare mare = ultima zi mult peste miscarea obisnuita (percentila 75), cu semnul ei", () => {
  const b = urca.slice(); const u = b.at(-1); b[b.length - 1] = { ...u, c: u.c * 0.85, l: u.c * 0.84 };
  const s = A.stare(b);
  assert.equal(s.miscare.mare, true); assert.equal(s.miscare.sens, "jos");
  assert.equal(A.stare(urca).miscare.mare, false);
});

const poz = (o) => ({ ticker: "AAPL_US_EQ", simbol: "AAPL", qty: 10, pretMediu: 100, pret: 100, ppl: 0, ...o });
await test("semafor: plus, trend sus -> TINE; stopul din plan atins -> IESI; tinta atinsa -> ATENTIE cu 'ia profit'", () => {
  const s = A.stare(urca);
  assert.equal(A.semafor(poz({ pret: 110 }), s).nivel, "tine");
  const st = A.semafor(poz({ pret: 90, plan: { stop: 92 } }), s);
  assert.equal(st.nivel, "iesi"); assert.match(st.motive.join(" "), /stop/i); assert.match(st.ceAsFace, /👉/);
  const t = A.semafor(poz({ pret: 125, plan: { tinta: 120 } }), s);
  assert.equal(t.nivel, "atentie"); assert.match(t.ceAsFace, /profit|stop/i);
});
await test("semafor: minus peste 20% FARA plan -> ATENTIE cu sfat de plan; trend jos + minus peste 10% -> IESI", () => {
  const a = A.semafor(poz({ pret: 75 }), A.stare(urca));
  assert.equal(a.nivel, "atentie"); assert.match(a.motive.join(" "), /fără plan/);
  const b = A.semafor(poz({ pret: 85 }), A.stare(coboara));
  assert.equal(b.nivel, "iesi");
});
await test("semafor: fara bare -> 'fara-date' (nu TINE din lipsa); trailing din plan: -X% de la maximul de dupa cumparare", () => {
  assert.equal(A.semafor(poz({ pret: 90 }), A.stare(null)).nivel, "fara-date");
  const s = A.stare(urca), mx = s.max7z;
  const r = A.semafor(poz({ pret: mx * 0.9, pretMediu: 50, plan: { trailPct: 8 } }), s);
  assert.equal(r.nivel, "iesi"); assert.match(r.motive.join(" "), /maxim/);
});

// trade-uri in forma T212.perechi().inchise
const tr = (o) => ({ ticker: "AAPL_US_EQ", simbol: "AAPL", qty: 1, pornit: Date.UTC(2026, 8, 1), inchis: Date.UTC(2026, 8, 10), durataOre: 216, cost: 1000, incasat: 1050, rezultat: 40, rezultatOficial: 50, comisioane: 10, pct: 0.04, extCumparare: false, extVanzare: false, ...o });
await test("greseli: pierdere > 20%; castig pe pret mancat de comisioane; recumparat in < 1 zi dupa o vanzare pe minus; vanzarea RAPIDA pe minus NU e greseala (e stopul respectat)", () => {
  const t1 = tr({ durataOre: 20, rezultat: -30, rezultatOficial: -20, pct: -0.03 });
  const t2 = tr({ rezultat: -250, rezultatOficial: -240, pct: -0.25 });
  const t3 = tr({ rezultat: -4, rezultatOficial: 6, pct: -0.004 });
  const umpleri = [{ side: "BUY", ticker: "AAPL_US_EQ", t: t1.inchis + 3 * 3600000 }];
  const g1 = A.greseli(t1, { umpleri }).map((g) => g.cod), g2 = A.greseli(t2, {}).map((g) => g.cod), g3 = A.greseli(t3, {}).map((g) => g.cod);
  assert.ok(!g1.includes("panica-2z"), "pe datele lui (25.09) taierile rapide au pierdut ~43 lei fiecare, cele tinute mii: sfatul e sa tai repede"); assert.ok(g1.includes("recumparat-1z"), g1);
  assert.ok(g2.includes("minus-20"), g2); assert.ok(g3.includes("comision-a-mancat"), g3);
  assert.deepEqual(A.greseli(tr({}), {}).map((g) => g.cod), [], "trade curat -> nicio greseala");
});
await test("greseli cu preturi: cumparat dupa o miscare mare si cumparat langa maximul pe 7 zile (doar cu barele DINAINTE de cumparare)", () => {
  const b = urca.slice(0, 280); const u = b.at(-1); b[b.length - 1] = { ...u, c: u.c * 1.15, h: u.c * 1.16 };
  const t = tr({ pornit: b.at(-1).t + ZI / 2, pretCumparare: b.at(-1).c });
  const g = A.greseli(t, { bare: b.concat(urca.slice(280)) }).map((x) => x.cod);
  assert.ok(g.includes("dupa-miscare"), g); assert.ok(g.includes("langa-max7z"), g);
});
await test("rezumat jurnal: numara, total real vs oficial, comisioane, greselile cu costul lor, vanzarile in afara orelor", () => {
  const l = [tr({}), tr({ durataOre: 10, rezultat: -30, rezultatOficial: -25, comisioane: 5, pct: -0.03 }), tr({ rezultat: -4, rezultatOficial: 6, extVanzare: true })];
  const r = A.rezumatJurnal(l, {});
  assert.equal(r.n, 3); assert.equal(r.pePlus, 1); aprox(r.total, 6, 1e-9); aprox(r.totalOficial, 31, 1e-9); aprox(r.comisioane, 25, 1e-9);
  const p = r.greseli.find((g) => g.cod === "comision-a-mancat"); assert.equal(p.n, 1); aprox(p.cost, -4, 1e-9);
  assert.equal(r.ext.n, 1);
  assert.equal(A.rezumatJurnal([], {}).n, 0);
});
await test("poarta: trend sus, fara miscare, departe de maxim, cu plan -> cumpara; fara plan -> asteapta; trend jos -> nu; recumparare imediata -> asteapta", () => {
  const s = A.stare(urca);
  const cuPlan = A.poarta({ stare: { ...s, distMax7z: -0.05 }, plan: { stop: 90 } });
  assert.equal(cuPlan.nivel, "cumpara", cuPlan.motive.join(" | "));
  assert.equal(A.poarta({ stare: { ...s, distMax7z: -0.05 }, plan: null }).nivel, "asteapta");
  assert.equal(A.poarta({ stare: A.stare(coboara), plan: { stop: 1 } }).nivel, "nu");
  assert.equal(A.poarta({ stare: { ...s, distMax7z: -0.05 }, plan: { stop: 90 }, vandutPeMinusAcumOre: 5 }).nivel, "asteapta");
  assert.equal(A.poarta({ stare: A.stare(null), plan: { stop: 1 } }).nivel, "fara-date");
});
await test("portofoliu: ponderea pe actiune, cea mai mare, socul Nasdaq -10% (beta 1 cand lipseste), cat e cash", () => {
  const p = A.portofoliu([{ simbol: "A", valoare: 6000 }, { simbol: "B", valoare: 3000, beta: 2 }], 1000);
  aprox(p.total, 10000, 1e-9); assert.equal(p.cea.simbol, "A"); aprox(p.cea.pondere, 0.6, 1e-9); aprox(p.cash, 0.1, 1e-9);
  aprox(p.soc, -(6000 * 0.1 + 3000 * 0.2), 1e-9); assert.match(p.ceAsFace, /👉/);
  assert.equal(A.portofoliu([], 0).total, 0);
});
await test("beta din randamentele zilnice fata de QQQ, pe zilele comune; prea putine -> null", () => {
  const q = zilnice(120, (i) => 100 + 5 * Math.sin(i / 3)), x = q.map((b) => ({ ...b, c: 50 + 2 * (b.c - 100) * 0.5 + 0 }));
  const d = zilnice(120, (i) => 100 * (1 + 2 * (Math.sin(i / 3) * 5) / 100));
  const b = A.beta(d, q); assert.ok(b > 1.5 && b < 2.5, "beta ~2: " + b);
  assert.strictEqual(A.beta(d.slice(0, 10), q), null); void x;
});
await test("alertele planului: stop atins -> critic; -X% de la maxim -> critic; tinta -> info; fara plan / nimic atins -> nimic; cheia e pe zi (o alerta pe zi pe prag)", () => {
  const zi = Date.UTC(2026, 8, 25, 15);
  const a = A.alertePlan(poz({ pret: 90, plan: { stop: 92 } }), zi);
  assert.equal(a.length, 1); assert.equal(a[0].nivel, "critic"); assert.match(a[0].titlu, /AAPL/); assert.match(a[0].titlu, /stop/i); assert.match(a[0].cheie, /^t212-AAPL_US_EQ-stop-2026-09-25$/);
  const t = A.alertePlan(poz({ pret: 90, maxDupaCumparare: 100, plan: { trailPct: 8 } }), zi);
  assert.equal(t.length, 1); assert.equal(t[0].nivel, "critic"); assert.match(t[0].mesaj, /maxim/);
  assert.equal(A.alertePlan(poz({ pret: 93, maxDupaCumparare: 100, plan: { trailPct: 8 } }), zi).length, 0);
  const g = A.alertePlan(poz({ pret: 130, plan: { tinta: 120 } }), zi);
  assert.equal(g.length, 1); assert.equal(g[0].nivel, "info"); assert.match(g[0].mesaj, /👉/);
  assert.equal(A.alertePlan(poz({ pret: 90 }), zi).length, 0); assert.equal(A.alertePlan(poz({ pret: null, plan: { stop: 92 } }), zi).length, 0);
});
await test("raportul saptamanii pentru actiuni: ultimele 7 zile - cate, real, comisioane, cea mai mare pierdere; nimic -> o linie care spune asta", () => {
  const acum = Date.UTC(2026, 8, 27, 18), zi = 86400000;
  const l = [tr({ inchis: acum - 2 * zi, rezultat: 40, comisioane: 10 }), tr({ simbol: "X", ticker: "X_US_EQ", inchis: acum - 3 * zi, rezultat: -90, comisioane: 5, pct: -0.22 }), tr({ inchis: acum - 9 * zi, rezultat: 1000 })];
  const r = A.raportSaptamana(l, acum);
  assert.match(r.join(" "), /2 trade-uri/); assert.match(r.join(" "), /−50 lei/); assert.match(r.join(" "), /15 lei/); assert.match(r.join(" "), /X/);
  assert.match(A.raportSaptamana([], acum)[0], /niciun trade/i);
});
await test("tura planurilor (colector): alerta pleaca o singura data pe cheie; fara plan nu se cer preturi; o pozitie care pica nu le opreste pe celelalte", async () => {
  const { turaPlanuri } = await import("./lib/tura-t212.mjs");
  const trimise = [], cereriPret = [], trimiseChei = {};
  const deps = {
    cerePozitii: async () => [{ ticker: "AAA_US_EQ", quantity: 1, averagePrice: 100, currentPrice: 88, initialFillDate: "2026-09-01T10:00:00Z" }, { ticker: "BBB_US_EQ", quantity: 1, averagePrice: 10, currentPrice: 11 }, { ticker: "CCC_US_EQ", quantity: 1, averagePrice: 10, currentPrice: 9 }],
    cerePlan: async (tk) => tk === "AAA_US_EQ" ? { stop: 90 } : tk === "CCC_US_EQ" ? (() => { throw new Error("KV picat"); })() : null,
    cereBare: async (tk) => { cereriPret.push(tk); return []; },
    stare: trimiseChei,
    trimite: async (m, cheie) => { trimise.push(cheie); return true; },
    ActiuniSemnale: A, T212: { simbol: (t) => t.split("_")[0] }, jurnal: () => {}, acum: Date.UTC(2026, 8, 25, 15) };
  await turaPlanuri(deps); await turaPlanuri(deps);
  assert.deepEqual(trimise, ["t212-AAA_US_EQ-stop-2026-09-25"], "o singura alerta, o singura data");
  assert.deepEqual(cereriPret, ["AAA_US_EQ", "AAA_US_EQ"], "preturi doar pentru pozitia cu plan");
});
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
