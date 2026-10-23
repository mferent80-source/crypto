// Proba v100.258 (23.10, el: „ok continua” după auditul „absolut tot”): cele trei 🔴 din audit.
// (1) „Mută gridul” și „Grid mai des” nu mai dau setări de copiat când fișa zice NU sau piața e în mișcare.
// (2) PORNEȘTE cere și media pe zilele nevăzute peste zero, nu doar mediana (pe mers aleator fișa zicea PORNEȘTE în 27–35% din cazuri).
// (3) Drumul botului scrie prețurile mici cu cifre semnificative (PEPE ieșea „0.00000”), ca graficul.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const citeste = (...p) => fs.readFileSync(new URL("../" + p.join("/"), import.meta.url), "utf8");
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "semnale-bot.js", "alerte.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { GridCalcul: G, GridProba: GP, SemnaleBot: SB, Alerte: A } = globalThis;
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); }
}
console.log("\nV100.258 · ROȘII · proba\n");

// ---- (1) mută gridul / grid mai des ----
const bot = (o) => ({ id: "9", baza: "SOL.PERP", directie: "long", levier: 5, pretCurent: 130, gridJos: 110, gridSus: 120, profitTotal: -3, investit: 100, ...o });
const SET = { dir: "long", jos: 120.01, sus: 127.95, grile: 21, levier: 5, pas: 0.003, stop: null };
const fisa = (o) => ({ setare: SET, treceriZi: 22.6, propusa: "deasa", deasa: { setare: SET, treceriZi: 22.6 },
  verdict: { nivel: "porneste", motive: [] }, regim: { r4h: 1.1, r24h: 1.0, miscare: false }, ...o });
const NU = { verdict: { nivel: "nu", motive: ["prețul abia a făcut o mișcare de 5,2× față de obișnuit — după mișcare gridul iese cel mai rău"] }, regim: { r4h: 5.2, r24h: 2.1, miscare: true } };

await test("(1) fișa zice NU după mișcare: „mută” spune faptul, dar fără setări de copiat", () => {
  const m = SB.mutaGridul(bot(), fisa(NU), 3, null);
  assert.ok(m, "faptul (prețul afară din grid) rămâne");
  assert.equal(m.setare, null);
  assert.equal(m.asteapta, true);
  assert.match(m.motivNu, /mișcare de 5,2×/);
  const ev = A.evalueaza(bot(), { semnale: { semafor: { nivel: "atentie" }, muta: m } }, {}, Date.UTC(2026, 9, 23, 12));
  const al = ev.mesaje.find((x) => x.cheie === "s-muta");
  assert.ok(al, "alerta s-muta există");
  assert.doesNotMatch(al.mesaj, /Aș muta gridul/);
  assert.doesNotMatch(al.mesaj, /grile în Pionex|5×/);
  assert.match(al.mesaj, /fișa: prețul abia a făcut o mișcare de 5,2×/);
  assert.match(al.mesaj, /👉 N-aș muta gridul acum, aștept să se liniștească piața\.$/);
  assert.doesNotMatch(al.titlu, /mută gridul/);
});
await test("(1) semaforul nu mai spune „pornesc cu setările din cartela Gridul” pe NU", () => {
  const m = SB.mutaGridul(bot(), fisa(NU), 3, null);
  const s = SB.semafor({ bot: bot(), fisa: fisa(NU), muta: m });
  const toate = JSON.stringify(s);
  assert.doesNotMatch(toate, /pornesc cu setările din cartela Gridul/);
});
await test("(1) piața în mișcare chiar fără NU (fișa pe AȘTEAPTĂ) ⇒ tot fără setări", () => {
  const m = SB.mutaGridul(bot(), fisa({ verdict: { nivel: "asteapta", motive: ["x"] }, regim: { r4h: 4, r24h: 1, miscare: true } }), 3, null);
  assert.equal(m.setare, null);
});
await test("(1) fișa PORNEȘTE / AȘTEAPTĂ în liniște ⇒ „mută” dă setările ca înainte", () => {
  for (const nivel of ["porneste", "asteapta"]) {
    const m = SB.mutaGridul(bot(), fisa({ verdict: { nivel, motive: [] } }), 3, null);
    assert.equal(m.asteapta, undefined);
    assert.equal(m.setare.jos, 120.01);
    const ev = A.evalueaza(bot(), { semnale: { semafor: { nivel: "atentie" }, muta: m } }, {}, Date.UTC(2026, 9, 23, 12));
    assert.match(ev.mesaje.find((x) => x.cheie === "s-muta").mesaj, /Aș muta gridul des \(0,3%\) la 120\.01 – 127\.95, 22 de grile în Pionex, 5×/);
  }
});
await test("(1) „Grid mai des” tace când fișa zice NU", () => {
  const larg = bot({ pretCurent: 115, brut: { buOrderData: { row: 5 } } });
  assert.ok(SB.gridMaiDes(larg, fisa()), "în liniște îl propune");
  assert.equal(SB.gridMaiDes(larg, fisa(NU)), null);
});
await test("(1) Tabloul ia setarea doar când „mută” are una", () => {
  assert.match(citeste("public", "app.js"), /var prop=muta&&muta\.setare\?\{setare:muta\.setare/);
});

// ---- (2) PORNEȘTE cere media pe test peste zero ----
const stat = (t) => ({ antren: { n: 40, mediana: 0.012, medie: 0.008, lichidari: 0 }, test: { n: 20, mediana: 0.01, medie: 0.006, lichidari: 0, ...t } });
const v = (t) => G.verdict({ regim: { r4h: 1, r24h: 1, miscare: false }, stat: stat(t), zile: 30, pozitie: 0.5, ferestreTest: 12, incercate: 36 });
await test("(2) statistici() dă și media netului pe ferestre", () => {
  const s = GP.statistici([{ net: 0.02, iesiri: 0, perechi: 1 }, { net: 0.01, iesiri: 0, perechi: 1 }, { net: -0.09, iesiri: 0, perechi: 1 }]);
  assert.equal(s.mediana, 0.01);
  assert.ok(Math.abs(s.medie - (-0.02)) < 1e-12, "media " + s.medie);
});
await test("(2) mediana pe plus, media pe minus pe zilele nevăzute ⇒ nu PORNEȘTE, spune de ce", () => {
  assert.equal(v({}).nivel, "porneste", "controlul: mediana și media pe plus");
  const r = v({ medie: -0.0139 });
  assert.equal(r.nivel, "asteapta");
  assert.ok(r.motive.some((m) => /pe zilele nevăzute, media e pe minus \(−1,39%\): câștigă des puțin și pierde rar mult/.test(m)), r.motive.join(" | "));
  assert.equal(v({ medie: 0 }).nivel, "asteapta");
});
await test("(2) fără medie (fișă veche) ⇒ nu PORNEȘTE pe ghicite", () => {
  assert.equal(v({ medie: undefined }).nivel, "asteapta");
});

// ---- (3) drumul botului: prețurile mici ----
const AS = citeste("public", "lib", "asezare-paznic.js");
function incarcaAsezarea() {
  const doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {}, remove() {} } } };
  const ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console, TabloExtra: globalThis.TabloExtra };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(AS, ctx);
  return ctx;
}
await test("(3) PEPE: grid jos, grid sus, stopul și acum au fiecare cifrele lor (nu „0.00000”)", () => {
  const ctx = incarcaAsezarea();
  const h = ctx.AsezarePaznic.drumHtml({ id: "1", baza: "PEPE.PERP", directie: "short", pretCurent: 0.0000049623, gridJos: 0.0000048, gridSus: 0.0000050,
    opritorPierdereActiv: true, opritorPierdereTip: "pret", opritorPierdere: 0.00000512 }, false, 1100);
  assert.doesNotMatch(h, /0\.00000</);
  assert.doesNotMatch(h, /0\.00001</);
  assert.match(h, /grid jos <b>0\.000004800<\/b>/);
  assert.match(h, /grid sus <b>0\.000005000<\/b>/);
  assert.match(h, /<b>0\.000005120<\/b>/);
  assert.match(h, /acum 0\.000004962/);
});
await test("(3) prețurile mari rămân cum erau (2 zecimale peste 100, 4 peste 1, 4 la 0,46)", () => {
  const ctx = incarcaAsezarea();
  const h = ctx.AsezarePaznic.drumHtml({ id: "2", baza: "ZRO.PERP", directie: "long", pretCurent: 0.46, gridJos: 0.40, gridSus: 0.50, opritorPierdereActiv: false }, false, 1100);
  assert.match(h, /grid jos <b>0\.4000<\/b>/);
  assert.match(h, /acum 0\.4600/);
  const h2 = ctx.AsezarePaznic.drumHtml({ id: "3", baza: "BTC.PERP", directie: "long", pretCurent: 108123.5, gridJos: 100000, gridSus: 112000, opritorPierdereActiv: false }, false, 1100);
  assert.match(h2, /grid jos <b>100000\.00<\/b>/);
});

// ---- (4) livrarea nu pornește un al doilea colector (serverul și colectorul în sesiunea 0, S4U) ----
const { decizieRepornire } = await import("./copie-de-lucru.mjs");
const arunca = (code) => () => { const e = new Error(code); e.code = code; throw e; };
await test("(4) colectorul din altă sesiune (EPERM, linia de comandă ilizibilă) ⇒ nu-l opresc și NU pornesc altul", () => {
  const d = decizieRepornire(5988, "", arunca("EPERM"));
  assert.equal(d.opreste, false); assert.equal(d.porneste, false); assert.equal(d.motiv, "alta-sesiune");
});
await test("(4) colectorul meu ⇒ îl opresc și pornesc altul; mort sau lipsă ⇒ pornesc; alt program pe PID ⇒ pornesc", () => {
  assert.deepEqual(decizieRepornire(10, "node scripts\\colector.mjs", arunca("EPERM")), { opreste: true, porneste: true, motiv: "al-meu" });
  assert.deepEqual(decizieRepornire(10, "", arunca("ESRCH")), { opreste: false, porneste: true, motiv: "nu-ruleaza" });
  assert.deepEqual(decizieRepornire(null, "", arunca("ESRCH")), { opreste: false, porneste: true, motiv: "fara-pid" });
  assert.deepEqual(decizieRepornire(10, "C:\\Windows\\notepad.exe", () => true), { opreste: false, porneste: true, motiv: "alt-program" });
  assert.equal(decizieRepornire(10, "", () => true).porneste, false, "viu, dar nu știu ce e ⇒ nu pornesc al doilea");
});
await test("(4) paza colectorului: EPERM (colectorul din sesiunea 0) înseamnă „rulează deja”, nu „a murit”", () => {
  const col = citeste("scripts", "colector.mjs").replace(/\r\n/g, "\n");
  const paza = col.slice(col.indexOf("let pidVerificat = 0;"), col.indexOf("const bate = "));
  assert.match(paza, /pidVerificat = vechi; process\.kill\(vechi, 0\);/);
  assert.match(paza, /catch \(e\) \{ if \(pidVerificat && e && e\.code === "EPERM"\) \{ jurnal\("mai rulează un colector \(PID " \+ pidVerificat \+ "\), în altă sesiune - ies"\); process\.exit\(0\); \} \}/);
  assert.doesNotMatch(paza, /\} catch \{\}/);
});

await test("versiunea v100.258 și proba în lanțul `test`", () => {
  const pk = JSON.parse(citeste("package.json"));
  assert.equal(pk.version, "100.258.0");
  assert.match(pk.scripts.test, /npm run test:v100258$/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-258/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exitCode = picate ? 1 : 0;
