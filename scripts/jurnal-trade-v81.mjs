// Probele v81: jurnalul de trade (public/lib/jurnal-trade.js) pe cei 10 boti REALI inchisi
// (Pionex status=finished, 24.09.2026; fixtura fara id-uri de cont - depozitul e public).
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = ["grid-calcul.js", "grid-proba.js", "jurnal-trade.js", "contrafactual.js"].map((f) => citeste("../public/lib/" + f)).join("\n");
const M = new Function(`${SRC}; return { JT: typeof JurnalTrade !== "undefined" ? JurnalTrade : null, CF: typeof Contrafactual !== "undefined" ? Contrafactual : null };`)();
const JT = M.JT, CF = M.CF;
const BOTI = JSON.parse(fs.readFileSync(new URL("./fixturi/boti-inchisi-2026-09-24.json", import.meta.url), "utf8"));

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const gaseste = (l, moneda, oraPornire) => l.find((t) => t.moneda === moneda && new Date(t.pornit).toISOString().slice(11, 16) === oraPornire);

console.log("\nV81 · jurnalul de trade · proba pe botii reali\n");

await test("modulul JurnalTrade exista", () => assert.ok(JT, "jurnal-trade.js lipseste"));

await test("din: 10 boti -> 10 trade-uri, cel mai nou primul; rezultat = realizat, restul pe bucati (grile / pozitie / comisioane / funding)", () => {
  const l = JT.din(BOTI);
  assert.equal(l.length, 10);
  assert.ok(l[0].inchis >= l[9].inchis);
  const sh = gaseste(l, "COTI", "11:07");
  assert.ok(sh, "short-ul COTI de la 11:07");
  assert.equal(sh.dir, "short"); assert.equal(sh.levier, 5);
  aprox(sh.rezultat, -21.3431, 1e-3); aprox(sh.grile, 3.0984, 1e-3); aprox(sh.comisioane, -0.9704, 1e-3); aprox(sh.funding, -1.0704, 1e-3);
  aprox(sh.pozitie, -21.3431 - 3.0984 + 0.9704 + 1.0704, 1e-3, "pozitia = rezultat - grile - comisioane - funding");
  aprox(sh.pct, -21.3431 / 124.44, 1e-6);
  aprox(sh.durataOre, (Date.parse("2026-09-22T14:19Z") - Date.parse("2026-09-22T11:07Z")) / 3600000, 0.02);
});

await test("greseli: reintrare pe aceeasi moneda in <10 min de la inchidere (COTI x5, BCH x1)", () => {
  const l = JT.din(BOTI);
  assert.equal(l.filter((t) => t.greseli.some((g) => g.cod === "reintrare")).length, 6);
  assert.ok(gaseste(l, "COTI", "14:21").greseli.some((g) => g.cod === "reintrare"));
  assert.ok(!gaseste(l, "COTI", "06:05").greseli.some((g) => g.cod === "reintrare"), "primul din sir nu e reintrare");
});

await test("greseli: pozitia a mancat grilele (grile pe plus, rezultat pe minus) - BCH 10:18, AAVE, SUI, COTI short", () => {
  const l = JT.din(BOTI);
  const cu = l.filter((t) => t.greseli.some((g) => g.cod === "pozitia-a-mancat-grilele")).map((t) => t.moneda + " " + new Date(t.pornit).toISOString().slice(11, 16)).sort();
  assert.deepEqual(cu, ["AAVE 06:41", "BCH 10:18", "COTI 11:07", "SUI 03:22"]);
});

await test("greseli: grile prea dese (net < 0,25% dupa comision) si stop/iesire din grid la BCH 10:18", () => {
  const l = JT.din(BOTI), b = gaseste(l, "BCH", "10:18");
  const g = b.greseli.map((x) => x.cod);
  assert.ok(g.includes("grile-prea-dese"), g.join(","));
  aprox(b.pasNet, (25 / 30) / 352.5 - 0.001, 1e-4);
  assert.ok(g.includes("stop-atins"), g.join(","));
  assert.ok(!gaseste(l, "SUI", "03:22").greseli.some((x) => x.cod === "stop-atins"), "SUI s-a inchis in interval");
});

await test("fiecare greseala are text + 'data viitoare' concret; nimic NaN/undefined/null in texte", () => {
  for (const t of JT.din(BOTI)) for (const g of t.greseli) {
    assert.ok(g.text && g.dataViitoare && g.dataViitoare.length > 15, JSON.stringify(g));
    assert.ok(!/NaN|undefined|null/.test(g.text + g.dataViitoare), g.text);
  }
});

await test("rezumat: total, cate pe plus, grile vs pozitie, si greselile ordonate dupa cat au costat", () => {
  const l = JT.din(BOTI), r = JT.rezumat(l);
  assert.equal(r.n, 10); assert.equal(r.pePlus, 6);
  const tot = BOTI.reduce((s, b) => s + Number(b.buOrderData.totalRealizedProfit), 0);
  aprox(r.total, tot, 1e-6);
  aprox(r.grile, BOTI.reduce((s, b) => s + Number(b.buOrderData.gridProfit), 0), 1e-6);
  const g0 = r.greseli[0];
  assert.equal(g0.cod, "pozitia-a-mancat-grilele", JSON.stringify(r.greseli.map((g) => g.cod + ":" + g.cost.toFixed(2))));
  aprox(g0.cost, -11.56122 - 2.2724 - 0.98624 - 21.34312, 0.01);
  assert.equal(g0.n, 4);
  assert.ok(r.greseli.every((g, i) => i === 0 || g.cost >= r.greseli[i - 1].cost), "ordonate de la cea mai scumpa");
});

await test("lipsa ramane lipsa: bot fara closeTime sau fara realizat -> sarit, nu 0", () => {
  const b = JSON.parse(JSON.stringify(BOTI.slice(0, 2)));
  b[0].closeTime = null; b[1].buOrderData.totalRealizedProfit = null;
  assert.equal(JT.din(b).length, 0);
  assert.deepEqual(JT.din(null), []);
});

// --- v83: "Daca ascultai de Radar" ---
await test("v83 modulul Contrafactual exista", () => assert.ok(CF, "contrafactual.js lipseste"));
await test("v83 taie: pastreaza DOAR lumanarile inchise inainte de pornire (bara in formare la pornire iese)", () => {
  const Q = 15 * 60000, P = 1_789_000_000_000 - (1_789_000_000_000 % Q) + 7 * 60000;   // pornit la minutul 7 dintr-o bara
  const r = [0, 1, 2, 3, 4].map((i) => ({ time: P - 7 * 60000 - (3 - i) * Q, close: "1" }));   // ultimele: bara inchisa inainte, bara la pornire, una dupa
  const t = CF.taie(r, P, Q);
  assert.ok(t.every((x) => x.time + Q <= P), JSON.stringify(t.map((x) => x.time - P)));
  assert.equal(t.length, 3);
});
const fisaCF = (o) => Object.assign({ dir: "long", directie: { dir: "long", tarie: "tare" }, verdict: { nivel: "porneste", motive: [] } }, o || {});
const tr = (o) => Object.assign({ id: "x", moneda: "COTI", dir: "long", rezultat: 1, greseli: [] }, o || {});
await test("v83 zice: verdictul fisei; + reguli: short contra trend long tare -> NU; reintrare -> NU; asteapta ramane asteapta", () => {
  assert.equal(CF.zice(fisaCF(), tr()).nivel, "porneste");
  const c = CF.zice(fisaCF(), tr({ dir: "short" }));
  assert.equal(c.nivel, "nu"); assert.ok(c.motive.some((m) => /contra trendului/.test(m)), c.motive.join(" | "));
  assert.equal(CF.zice(fisaCF(), tr({ greseli: [{ cod: "reintrare" }] })).nivel, "nu");
  assert.equal(CF.zice(fisaCF({ verdict: { nivel: "asteapta", motive: ["la limita"] } }), tr()).nivel, "asteapta");
  assert.equal(CF.zice(fisaCF({ verdict: { nivel: "nu", motive: ["miscare"] } }), tr()).nivel, "nu");
  assert.equal(CF.zice(null, tr()).nivel, "fara-date");
  assert.equal(CF.zice(fisaCF({ directie: { dir: "long", tarie: "slab" } }), tr({ dir: "short" })).nivel, "porneste", "contra unui trend SLAB nu blocheaza");
});
await test("v83 rezumat: real vs doar verde vs verde+galben; cat au salvat blocarile si cat au ratat", () => {
  const l = [{ t: tr({ rezultat: -21 }), z: { nivel: "nu" } }, { t: tr({ rezultat: 3 }), z: { nivel: "porneste" } }, { t: tr({ rezultat: 2 }), z: { nivel: "nu" } }, { t: tr({ rezultat: -1 }), z: { nivel: "asteapta" } }, { t: tr({ rezultat: 5 }), z: { nivel: "fara-date" } }];
  const r = CF.rezumat(l);
  assert.equal(r.real, -12); assert.equal(r.doarVerde, 3); assert.equal(r.verdeGalben, 2);
  assert.equal(r.blocateSalvat, 21); assert.equal(r.blocateRatat, 2); assert.equal(r.faraDate, 1);
  assert.equal(r.judecate, 4);
});

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
