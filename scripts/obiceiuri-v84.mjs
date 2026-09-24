// Probele v84: obiceiurile (public/lib/obiceiuri.js) - poarta de pornire, portofoliul,
// raportul de duminica, regulile personale, botul de hartie. Pe botii lui reali unde se poate.
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = ["grid-calcul.js", "grid-proba.js", "jurnal-trade.js", "obiceiuri.js"].map((f) => citeste("../public/lib/" + f)).join("\n");
const M = new Function(`${SRC}; return { JT: JurnalTrade, GC: GridCalcul, O: typeof Obiceiuri !== "undefined" ? Obiceiuri : null };`)();
const { JT, GC, O } = M;
const BOTI = JSON.parse(fs.readFileSync(new URL("./fixturi/boti-inchisi-2026-09-24.json", import.meta.url), "utf8"));
const TR = JT.din(BOTI);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const ORA = 3600000;
const fisa = (o) => Object.assign({ simbol: "COTI_USDT_PERP", dir: "long", directie: { dir: "long", tarie: "tare" }, verdict: { nivel: "porneste", motive: [] }, setare: { levier: 4, levierSigur: 4 } }, o || {});

console.log("\nV84 · obiceiurile · proba\n");
await test("modulul Obiceiuri exista", () => assert.ok(O, "obiceiuri.js lipseste"));

await test("poarta: toate regulile trec -> trecut; fiecare regula picata spune cat te-a costat in jurnalul tau", () => {
  const ultimCOTI = TR.filter((t) => t.moneda === "COTI").sort((a, b) => b.inchis - a.inchis)[0];
  const ok = O.poarta({ fisa: fisa(), trades: TR, acum: ultimCOTI.inchis + 2 * ORA, dir: "long", levier: 3, plan: { plus: 5, minus: 10 } });
  assert.equal(ok.trecut, true, JSON.stringify(ok.reguli.filter((r) => !r.ok)));
  const rau = O.poarta({ fisa: fisa({ verdict: { nivel: "nu", motive: ["mișcare"] }, directie: { dir: "short", tarie: "tare" } }), trades: TR, acum: ultimCOTI.inchis + 3 * 60000, dir: "long", levier: 5, plan: null });
  assert.equal(rau.trecut, false);
  const cod = rau.reguli.filter((r) => !r.ok).map((r) => r.cod).sort();
  assert.deepEqual(cod, ["contra-trend", "levier", "plan", "reintrare", "verde"]);
  const re = rau.reguli.find((r) => r.cod === "reintrare");
  assert.match(re.cost, /6 boți/); assert.match(re.cost, /−?\d/);
  assert.ok(rau.reguli.every((r) => r.text && !/NaN|undefined|null/.test(r.text + (r.cost || ""))));
});

await test("portofoliu: expunere, cate pe aceeasi parte, socul de -10% si cine s-ar lichida", () => {
  const b = (o) => Object.assign({ activ: true, directie: "long", investit: 100, levier: 5, pozitie: 1000, pretCurent: 0.5, lichidareJos: 0.4, baza: "X.PERP" }, o);
  const p = O.portofoliu([b({ baza: "A.PERP" }), b({ baza: "B.PERP", lichidareJos: 0.46 }), b({ baza: "C.PERP", directie: "short", pozitie: -500, lichidareSus: 0.7, lichidareJos: null }), b({ baza: "D.PERP", activ: false })], 500);
  assert.equal(p.n, 3); assert.equal(p.peParte.long, 2); assert.equal(p.peParte.short, 1);
  aprox(p.expunere, 1500, 1e-9); aprox(p.expunerePeSold, 3, 1e-9);
  aprox(p.soc10, -0.1 * 0.5 * 1000 * 2 + 0.1 * 0.5 * 500, 1e-9, "doi long pierd, short-ul castiga");
  assert.deepEqual(p.lichidatiLaSoc, ["B"]);
  assert.equal(p.acelasiPariu, true, "2 din 3 long, peste jumatate");
  assert.equal(O.portofoliu([], 500).n, 0);
});

await test("raportDuminica: rezultatul saptamanii, greseala cea mai scumpa, o singura regula pentru saptamana urmatoare", () => {
  const acum = Math.max(...TR.map((t) => t.inchis)) + ORA;
  const r = O.raportDuminica({ trades: TR, acum, socoteala: { miscare: { judecate: 4, corecte: 3, rata: 0.75 } }, laborator: null });
  assert.equal(r.n, 10); aprox(r.total, TR.reduce((s, t) => s + t.rezultat, 0), 1e-9);
  assert.match(r.regula, /[Pp]oziția a mâncat grilele|trend/);
  assert.ok(r.linii.length >= 4 && r.linii.every((l) => !/NaN|undefined|null/.test(l)), r.linii.join(" | "));
  const gol = O.raportDuminica({ trades: TR, acum: acum + 30 * 24 * ORA });
  assert.equal(gol.n, 0); assert.match(gol.linii[0], /niciun bot/i);
});

await test("reguliPersonale: sub 30 de boti -> spune cati mai trebuie; peste -> gaseste grupa care pierde clar (Wilson) si o numeste", () => {
  const sub = O.reguliPersonale(TR);
  assert.equal(sub.suficient, false); assert.equal(sub.lipsa, 20);
  // 40 de boti sintetici: noaptea (00-06) pierd aproape mereu, restul castiga
  const T0 = Date.parse("2026-09-01T00:00:00+03:00");
  const s = new Array(40).fill(0).map((_, i) => ({ moneda: i % 2 ? "A" : "B", dir: "long", pornit: T0 + i * 24 * ORA + (i % 4 === 0 ? 2 : 14) * ORA, inchis: T0 + i * 24 * ORA + 20 * ORA, durataOre: 3, rezultat: i % 4 === 0 ? -3 : 1, investit: 100 }));
  const r = O.reguliPersonale(s, "Europe/Bucharest");
  assert.equal(r.suficient, true);
  assert.ok(r.reguli.length >= 1, JSON.stringify(r));
  assert.match(r.reguli[0].grupa, /00–06/);
});

await test("hartie: botul de hartie simuleaza setarea din fisa pe lumanarile de dupa pornire (aceeasi masina ca proba)", () => {
  const Q = 15 * 60000, t0 = 1_790_000_000_000;
  const bare = [0, 1].map((i) => ({ t: t0 + i * Q, o: 100, h: 100, l: 94, c: 100 }));
  const r = O.hartie({ setare: { dir: "neutru", jos: 90, sus: 110, grile: 4, levier: 1, suma: 100 }, pornit: t0 }, bare);
  aprox(r.net, 0.0252108, 0.00002, "acelasi canal socotit de mana ca in grid-v78"); aprox(r.usdt, 2.52108, 0.002);
  assert.equal(r.bare, 2);
  assert.equal(O.hartie({ setare: { dir: "neutru", jos: 90, sus: 110, grile: 4, levier: 1, suma: 100 }, pornit: t0 + 10 * Q }, bare).bare, 0, "lumanarile de dinainte de pornire nu se socotesc");
});

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
