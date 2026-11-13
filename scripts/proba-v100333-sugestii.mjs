// Proba v100.333 · tura sugestiilor (el, 13.11: „rezolvă asta” - lista de monede n-a mai venit pe 12 și 13.11: „sugestii ESEC fetch failed”,
// în minutul în care bucla colectorului a stat blocată 21–31 s; măsurat pe PC: `R.puncte` pe 75 de monede = 8,8 s dintr-o bucată):
//   1  socoteala grea lasă bucla să respire între monede (cererile altor ture nu mai cad);
//   2  tura picată se reia în aceeași zi (după 30 min, de cel mult 3 ori), nu se pierde ziua;
//   3  urmărirea față de piață ține și seria PE ZILE (graficul din „Listele Radarului”);
//   4  colectorul reîncearcă O dată o cerere GET care a primit „fetch failed” (socket închis cât bucla a stat), iar jurnalul spune cauza.
//   node scripts/proba-v100333-sugestii.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const M = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-sugestii.mjs")).href);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); } }
console.log("\nV100.333 · tura sugestiilor · proba\n");

const ORA = 3600000, ZI = 86400000, ACUM = Date.UTC(2026, 10, 13, 6, 0);
// lumea falsă: N monede cu bare de 1 h; clasamentul / tickerele / istoricul la cerere; trimite ține minte
function lume(n, o = {}) {
  const simb = Array.from({ length: n }, (_, i) => "M" + i + "_USDT_PERP");
  const bare = (s) => { const k = Number(s.slice(1, s.indexOf("_"))) + 1; const b = []; for (let t = ACUM - 40 * ZI; t <= ACUM; t += ORA) b.push({ t, o: 100, h: 101, l: 99, c: 100 * (1 + k * 0.001 * ((t - (ACUM - 40 * ZI)) / ZI)) }); return b; };
  const trimise = [], stare = o.stare || {};
  const d = {
    acum: o.acum || ACUM, zi: "2026-11-13", ora: 8, stare, scrieStare: (st) => Object.assign(stare, st),
    Reveniri: { REGULI: { moneda: {} }, puncte: (b) => { let s = 0; for (let i = 0; i < 2e5; i++) s += i; return { n: b.length, s }; }, dovada: () => null, dovadaBoti: () => ({ revenire: null, short: null }), urmarire: () => ({ n: 0 }) },
    Idei: { reveniriBoti: () => [], shortBoti: () => [], ideiBoti: () => [] },
    G: { agrega: (b) => Array.from({ length: 600 }, (_, i) => ({ c: 1 + i })) },
    simboluriDepozit: () => simb, bare1h: bare, boti: async () => [],
    cere: o.cere || (async (u) => (/sugestii/.test(u) ? { istoric: o.istoric || [] } : /clasament/.test(u) ? { clasament: [] } : { data: { tickers: [] } })),
    trimite: async (u, c) => { trimise.push([u, c]); return { ok: true }; }, jurnal: () => {},
  };
  return { d, trimise, stare, simb };
}

await test("1 · socoteala seriilor lasă bucla să respire între monede (nu un bloc de 20–30 s)", async () => {
  const { d } = lume(12);
  let ture = 0, merge = true; const bate = () => { if (!merge) return; ture++; setImmediate(bate); }; setImmediate(bate);
  await M.turaSugestii(d); merge = false;
  assert.ok(ture >= 12, "bucla a respirat doar de " + ture + " ori pentru 12 monede");
});

await test("2 · tura picată nu pierde ziua: se reia după 30 min, de cel mult 3 ori; reușita o închide", async () => {
  let cad = true; const st = {};
  const pica = async (u) => { if (cad) throw new TypeError("fetch failed"); return /sugestii/.test(u) ? { istoric: [] } : {}; };
  let w = lume(3, { stare: st, cere: pica });
  await assert.rejects(M.turaSugestii(w.d));
  assert.notEqual(st.zi, "2026-11-13", "ziua s-a închis după prima cădere");
  w = lume(3, { stare: st, cere: pica, acum: ACUM + 10 * 60000 });
  assert.equal(await M.turaSugestii(w.d), null, "a reluat înainte de pauză");
  w = lume(3, { stare: st, cere: pica, acum: ACUM + 31 * 60000 });
  await assert.rejects(M.turaSugestii(w.d), "a doua încercare trebuia să ruleze (și să pice)");
  w = lume(3, { stare: st, cere: pica, acum: ACUM + 62 * 60000 }); await assert.rejects(M.turaSugestii(w.d));
  assert.equal(st.zi, "2026-11-13", "după 3 căderi ziua se închide (mâine din nou)");
  // altă zi: numărătoarea pornește de la zero, iar reușita închide ziua
  const st2 = {}; cad = true; w = lume(3, { stare: st2, cere: pica }); await assert.rejects(M.turaSugestii(w.d));
  cad = false; w = lume(3, { stare: st2, cere: pica, acum: ACUM + 31 * 60000 }); const r = await M.turaSugestii(w.d);
  assert.ok(r, "reluarea reușită n-a întors nimic"); assert.equal(st2.zi, "2026-11-13"); assert.ok(!st2.reia, "reluarea a rămas în stare după reușită");
});

await test("3 · urmărirea față de piață ține seria pe zile (zi, câte, lista, piața, față de piață), în ordine", () => {
  const { d, simb } = lume(6);
  const ist = [{ zi: "2026-10-20", simbol: simb[5], lista: "revenire" }, { zi: "2026-10-20", simbol: simb[4], lista: "revenire" }, { zi: "2026-10-25", simbol: simb[0], lista: "revenire" }, { zi: "2026-11-10", simbol: simb[1], lista: "revenire" }];
  const u = M.urmarireFixa(ist, { zile: 7, cost: 0.001, bare1h: d.bare1h, toate: simb, acum: ACUM });
  assert.ok(Array.isArray(u.peZile), "lipsește peZile");
  assert.deepEqual(u.peZile.map((z) => z.zi), ["2026-10-20", "2026-10-25"], "zilele judecate (11.11 e încă în așteptare)");
  const z = u.peZile[0];
  assert.equal(z.n, 2); assert.ok(Number.isFinite(z.lista) && Number.isFinite(z.piata) && Number.isFinite(z.exces));
  assert.ok(z.exces > 0, "monedele 4 și 5 urcă mai repede decât mediana ⇒ peste piață");
  assert.ok(u.peZile[1].exces < 0, "moneda 0 urcă cel mai încet ⇒ sub piață");
  // media pe zile a seriei = excesul agregat (aceeași socoteală, nu alta)
  const m = u.peZile.reduce((a, x) => a + x.exces, 0) / u.peZile.length; assert.ok(Math.abs(m - u.exces) < 1e-6, "seria e rotunjită la 6 zecimale");
});
await test("3b · seria pe zile e tăiată la ultimele 90 de zile (corpul trimis rămâne mic)", () => {
  const { d, simb } = lume(3);
  const ist = []; for (let i = 0; i < 130; i++) ist.push({ zi: new Date(ACUM - (i + 8) * ZI).toISOString().slice(0, 10), simbol: simb[i % 3], lista: "short", dir: "short" });
  const u = M.urmarireFixa(ist, { zile: 7, bare1h: (s) => { const b = []; for (let t = ACUM - 150 * ZI; t <= ACUM; t += ORA) b.push({ t, c: 100 }); return b; }, toate: simb, acum: ACUM });
  assert.equal(u.peZile.length, 90); assert.ok(u.peZile[89].zi > u.peZile[0].zi);
});

// ---- 4 · colectorul: cere() reîncearcă o dată un GET cu „fetch failed”; POST nu (s-ar putea dubla o scriere) ----
const COL = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8").replace(/\r\n/g, "\n");
const fnCere = (() => { const i = COL.indexOf("async function cere("); const j = COL.indexOf("\n}\n", i); return COL.slice(i, j + 2); })();
async function cereCu(fetchFals) {
  const f = new Function("fetch", "BAZA", "ANTET", "SR", "sanatate", "S", "preturiTura", "setTimeout", "var ritmPauzaPana = 0;\n" + fnCere + "\nreturn cere;");
  return f(fetchFals, "http://x", {}, { noteazaRaspuns() {} }, () => ({}), { eLimitaDeRitm: () => false }, { ok: 0, rau: 0 }, (fn) => fn());
}
await test("4 · cere(): un GET cu „fetch failed” se mai încearcă o dată; POST nu se repetă", async () => {
  let n = 0; const fals = async () => { n++; if (n === 1) throw Object.assign(new TypeError("fetch failed"), { cause: { code: "UND_ERR_SOCKET" } }); return { ok: true, status: 200, text: async () => '{"a":1}' }; };
  const cere = await cereCu(fals);
  assert.deepEqual(await cere("/api/istoric-bot?action=clasament"), { a: 1 }); assert.equal(n, 2);
  n = 0; await assert.rejects(cere("/api/istoric-bot?action=sugestii", { method: "POST", body: "{}" })); assert.equal(n, 1, "POST-ul s-a repetat");
  let k = 0; const mereu = await cereCu(async () => { k++; throw new TypeError("fetch failed"); });
  await assert.rejects(mereu("/api/x"), "a doua cădere trebuie să urce"); assert.equal(k, 2, "altceva decât o singură reîncercare");
  k = 0; const alta = await cereCu(async () => { k++; throw Object.assign(new Error("HTTP 500"), { status: 500 }); });
  await assert.rejects(alta("/api/x")); assert.equal(k, 1, "o eroare de server nu se reîncearcă");
});
await test("4b · jurnalul turei spune CAUZA (UND_ERR_SOCKET …), nu doar „fetch failed”", () => {
  const i = COL.indexOf("async function turaSugestiiColector"), src = COL.slice(i, COL.indexOf("\n}\n", i));
  assert.match(src, /jurnal\("sugestii ESEC", SR\.motivEroare\(e\)\)/);
});

await test("5 · ruta sugestiilor păstrează seria pe zile la salvare (curățată: zi validă, cifre, cel mult 90)", () => {
  const R = fs.readFileSync(path.join(RAD, "functions", "api", "istoric-bot.js"), "utf8");
  const m = /const ur=(x=>x&&typeof x==="object"\?\{.*?\}:null);/.exec(R); assert.ok(m, "nu găsesc ur");
  const nr = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const ur = new Function("nr", "return " + m[1])(nr);
  const zile = Array.from({ length: 95 }, (_, i) => ({ zi: new Date(Date.UTC(2026, 6, 1) + i * ZI).toISOString().slice(0, 10), n: 2, lista: 0.01, piata: 0.02, exces: -0.01, gunoi: "x" }));
  const r = ur({ n: 3, exces: 0.1, peZile: zile.concat([{ zi: "ieri", exces: 1 }, null]) });
  assert.equal(r.peZile.length, 90); assert.deepEqual(Object.keys(r.peZile[0]).sort(), ["exces", "lista", "n", "piata", "zi"]);
  assert.equal(r.peZile[89].zi, zile[94].zi); assert.deepEqual(ur({ n: 1 }).peZile, []);
});

console.log(`\n${picate ? "PICĂ" : "trec"} ${teste - picate}/${teste}`);
process.exit(picate ? 1 : 0);
