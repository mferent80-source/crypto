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
await test("la cumparare (daca ascultai de Radar): doar barele DINAINTE; trend jos -> nu; dupa miscare + langa maxim -> asteapta cu greselile lor; prea putine bare -> fara-date; planul nu conteaza (atunci nu stiam)", () => {
  const b = urca.slice(0, 280), u = b.at(-1); b[b.length - 1] = { ...u, c: u.c * 1.15, h: u.c * 1.16 };
  const t = tr({ id: "9", pornit: b.at(-1).t + ZI / 2, pretCumparare: b.at(-1).c });
  const z = A.laCumparare(t, b.concat(urca.slice(280)), []);
  assert.equal(z.nivel, "asteapta"); assert.ok(z.greseli.includes("dupa-miscare") && z.greseli.includes("langa-max7z"), z.greseli);
  assert.ok(!z.motive.some((m) => /plan/.test(m)), "fara motivul de plan: la cumparare nu-l stim");
  const j = A.laCumparare(tr({ pornit: coboara.at(-1).t + ZI, pretCumparare: coboara.at(-1).c }), coboara, []);
  assert.equal(j.nivel, "nu");
  const ok = A.laCumparare(tr({ pornit: urca.at(-30).t + ZI / 2, pretCumparare: urca.at(-30).c * 0.9 }), urca, []);
  assert.equal(ok.nivel, "cumpara", ok.motive.join(" | "));
  assert.equal(A.laCumparare(tr({ pornit: urca[30].t }), urca, []).nivel, "fara-date");
  assert.equal(A.laCumparare(tr({}), null, []).nivel, "fara-date");
  // recumparare dupa o vanzare pe minus cu 5 ore inainte
  const v = A.laCumparare(tr({ pornit: urca.at(-30).t + ZI / 2, pretCumparare: urca.at(-30).c * 0.9 }), urca, [tr({ ticker: "AAPL_US_EQ", inchis: urca.at(-30).t + ZI / 2 - 5 * 3600000, rezultat: -10 })]);
  assert.equal(v.nivel, "asteapta"); assert.match(v.motive.join(" "), /recump/);
});
await test("tura 'daca ascultai' pe actiuni (colector): doar trade-urile fara verdict, cate `max` actiuni pe tura, o actiune fara preturi -> fara-date (nu se reincearca la infinit)", async () => {
  const { turaCfActiuni } = await import("./lib/tura-t212.mjs");
  // preturile tranzactiilor = cele din serie (altfel verificarea "pret potrivit" le respinge ca split)
  const um = [{ id: "b1", t: urca.at(-30).t + ZI / 2, side: "BUY", ticker: "AAA_US_EQ", qty: 1, pret: urca.at(-30).c * 0.97, net: 400, fee: 1, realizat: null },
    { id: "s1", t: urca.at(-20).t, side: "SELL", ticker: "AAA_US_EQ", qty: 1, pret: urca.at(-20).c, net: 420, fee: 1, realizat: 21 },
    { id: "b2", t: urca.at(-30).t, side: "BUY", ticker: "ZZZ_US_EQ", qty: 1, pret: 5, net: 20, fee: 0, realizat: null },
    { id: "s2", t: urca.at(-25).t, side: "SELL", ticker: "ZZZ_US_EQ", qty: 1, pret: 4, net: 16, fee: 0, realizat: -4 },
    { id: "b3", t: urca.at(-30).t, side: "BUY", ticker: "QQQ9_US_EQ", qty: 1, pret: 5, net: 20, fee: 0, realizat: null },
    { id: "s3", t: urca.at(-25).t, side: "SELL", ticker: "QQQ9_US_EQ", qty: 1, pret: 4, net: 16, fee: 0, realizat: -4 }];
  const T = new Function(fs.readFileSync(new URL("../public/lib/t212.js", import.meta.url), "utf8") + "; return T212;")();
  const salvat = {}, cerute = [], scrieri = [];
  const d = { umpleri: async () => um, gata: async () => ({ ...salvat }), cereBare: async (tk) => { cerute.push(tk); return tk === "AAA_US_EQ" ? urca : null; },
    salveaza: async (m) => { scrieri.push(Object.keys(m).length); Object.assign(salvat, m); }, T212: T, ActiuniSemnale: A, pauza: async () => {}, jurnal: () => {}, max: 2 };
  const r1 = await turaCfActiuni(d);
  assert.equal(cerute.length, 2); assert.equal(r1.judecate, 2); assert.deepEqual(scrieri, [2], "o singura scriere pentru toata tura (limita de 30/min a rutei)");
  assert.equal(salvat.s1.nivel, "cumpara"); assert.equal(Object.values(salvat).filter((x) => x.nivel === "fara-date").length, 1);
  await turaCfActiuni(d); assert.equal(cerute.length, 3, "doar actiunea ramasa"); assert.equal(Object.keys(salvat).length, 3);
  await turaCfActiuni(d); assert.equal(cerute.length, 3, "nimic de facut -> nicio cerere");
});
await test("rezumat jurnal + verdictele 'daca ascultai' (ctx.cf): greselile cu preturi intra in tabel cu costul lor", () => {
  const l = [tr({ id: "a", rezultat: -50 }), tr({ id: "b", rezultat: 20 })];
  const r = A.rezumatJurnal(l, { cf: { a: { nivel: "asteapta", greseli: ["dupa-miscare"] }, b: { nivel: "cumpara", greseli: [] } } });
  const g = r.greseli.find((x) => x.cod === "dupa-miscare"); assert.equal(g.n, 1); aprox(g.cost, -50, 1e-9); assert.match(g.text, /mișcare mare/);
});
await test("preturi: ATR = media pe 14 zile a intervalului adevarat (cu golul fata de inchiderea de ieri)", () => {
  const b = zilnice(30, () => 100).map((x, i) => ({ ...x, h: 102, l: 98, c: 100, o: 100 }));
  b[29] = { ...b[29], o: 110, h: 111, l: 109, c: 110 };   // gol: TR = max(2, |111-100|, |109-100|) = 11
  const a = A.atr(b);
  aprox(a[28], 4, 1e-9); aprox(a[29], (13 * 4 + 11) / 14, 1e-9); assert.strictEqual(a[5], null);
});
await test("preturi: pe trend sus -> intrare sub pretul de acum (retragere), stop < intrare < tinta, tinta = 2R; k ales din proba pe istoric, cu n si rezultatul probei", () => {
  const n = A.niveluri(urca, urca.at(-1).c, {});
  assert.equal(n.trend, "sus"); assert.ok(n.intrare && n.intrare.pret <= urca.at(-1).c, JSON.stringify(n.intrare));
  assert.ok(n.stop < n.intrare.pret && n.intrare.pret < n.tinta);
  aprox(n.tinta - n.intrare.pret, 2 * (n.intrare.pret - n.stop), 1e-6);
  assert.ok([1.5, 2, 2.5, 3].includes(n.k)); assert.ok(n.proba.n >= 30 && n.proba.medie !== null);
  assert.ok(n.riscPct >= 0.03 && n.riscPct <= 0.15, "stopul intre 3% si 15% " + n.riscPct);
});
await test("preturi: trend jos -> fara intrare (doar long), dar stop/tinta pentru o pozitie deschisa tot se dau; prea putine bare -> fara-date", () => {
  const n = A.niveluri(coboara, coboara.at(-1).c, { pretMediu: 60 });
  assert.strictEqual(n.intrare, null); assert.match(n.intrareMotiv, /jos/);
  assert.ok(n.stop > 0 && n.tinta > n.stop);
  assert.equal(A.niveluri(urca.slice(0, 40), 100, {}).nivel, "fara-date"); assert.equal(A.niveluri(null, 100, {}).nivel, "fara-date");
});
await test("preturi pentru o pozitie deschisa: stopul urca dupa maximul de dupa cumparare (chandelier) si se da si ca -X% de la maxim; peste pretul de acum -> spune ca stopul e deja atins", () => {
  const p = urca.at(-1).c, mx = p * 1.05;
  const n = A.niveluri(urca, p, { pretMediu: p * 0.8, maxDupaCumparare: mx });
  // d = k*ATR, tinut intre 3% si 15% din pret (aici ATR-ul sintetic e mic -> plafonul de 3%)
  aprox(n.d, Math.min(0.15 * p, Math.max(0.03 * p, n.k * n.atr)), 1e-9);
  aprox(n.stopPozitie, mx - n.d, 1e-6); aprox(n.trailPct, n.d / mx * 100, 1e-6);
  const sus = A.niveluri(urca, p * 0.5, { pretMediu: p, maxDupaCumparare: p * 1.2 });
  assert.equal(sus.stopAtins, true);
});
await test("marimea pozitiei: risc 1% din cont la stop, plafon 20% din cont; cont lipsa -> null", () => {
  const m = A.marime({ intrare: 100, stop: 95, cont: 30000, fx: null });
  // risc 300 lei / 5 pe bucata = 60 buc = 6000 lei = 20% -> exact plafonul
  aprox(m.bucati, 60, 1e-9); aprox(m.suma, 6000, 1e-9); assert.equal(m.plafonat, false);
  const p = A.marime({ intrare: 100, stop: 99, cont: 30000 });
  aprox(p.suma, 6000, 1e-9); assert.equal(p.plafonat, true, "stop strans -> ar iesi 300 buc, plafonul 20% taie");
  assert.strictEqual(A.marime({ intrare: 100, stop: 95, cont: null }), null);
});
await test("semafor: ATENTIE din miscare mare pe trend SUS nu zice 'pana se intoarce trendul' (trendul e deja sus)", () => {
  const b = urca.slice(); const u = b.at(-1); b[b.length - 1] = { ...u, c: u.c * 0.93, l: u.c * 0.92 };
  const st = A.stare(b); assert.equal(st.trend.dir, "sus");
  const r = A.semafor(poz({ pret: b.at(-1).c, pretMediu: b.at(-1).c * 1.01 }), st);
  assert.equal(r.nivel, "atentie"); assert.doesNotMatch(r.ceAsFace, /întoarce trendul/); assert.match(r.ceAsFace, /mișc|liniș/);
});
await test("sfaturile nu contrazic restul ecranului: IESI fara plan nu zice 'ce am scris'; portofoliul avertizeaza peste 20% (plafonul), fara semn +", () => {
  const r = A.semafor(poz({ pret: 85 }), A.stare(coboara));
  assert.equal(r.nivel, "iesi"); assert.doesNotMatch(r.ceAsFace, /scris/);
  const cu = A.semafor(poz({ pret: 85, plan: { stop: 90 } }), A.stare(coboara)); assert.match(cu.ceAsFace, /scris/);
  const q = A.portofoliu([{ simbol: "APLD", valoare: 23 }, { simbol: "X", valoare: 19 }, { simbol: "Y", valoare: 19 }, { simbol: "Z", valoare: 19 }, { simbol: "W", valoare: 20 }], 0);
  assert.match(q.ceAsFace, /APLD e 23% din cont/); assert.doesNotMatch(q.ceAsFace, /ok/);
});
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
