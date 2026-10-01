// Proba v100.54 (01.10, el: actiunile T212 - pachetul 3: o singura voce pe pozitie,
// docs/superpowers/plans/2026-10-01-actiuni-pachetul-3-o-singura-voce.md).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(); globalThis.ActiuniSemnale = AS;
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.54 · Actiunile T212: o singura voce pe pozitie · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);

// ---- pasul 1: Consilierul pe pozitie ----
const poz = (o) => ({ ticker: "INTC_US_EQ", simbol: "INTC", qty: 10, pretMediu: 20, pret: 18, costLei: 900, plan: null, maxDupaCumparare: 22, ...o });
const stJos = { trend: { dir: "jos", motive: ["EMA20 sub EMA50"] }, miscare: { mare: false } };
await test("semaforul are componentele cu cod (aditiv): stopul planului si trendul in jos", () => {
  const s = AS.semafor(poz({ plan: { stop: 18.5 } }), stJos);
  assert.ok(Array.isArray(s.componente), "lipsesc componentele"); assert.deepEqual(s.componente.map((c) => c.cod), ["stop-plan", "trend-jos"]); assert.equal(s.nivel, "iesi"); assert.ok(Array.isArray(s.motive));
});
await test("alcatuiesteActiune: siguranta intai, un singur IESI in varf, banii pana la stop in lei si dolari, sfaturile in motive sau in rest", () => {
  are(CS.alcatuiesteActiune, "Consiliu.alcatuiesteActiune");
  const p = poz({ plan: { stop: 18.5 } }), sem = AS.semafor(p, stJos), niv = { stopPozitie: 18.7, trailPct: 15, stopAtins: true, sursaTrail: "−15% de la maxim" };
  const sf = [{ nivel: "g", sursa: "istoric", titlu: "Istoricul tău pe INTC: 33 trade-uri", text: "", ceAsFace: "N-aș adăuga." }, { nivel: "n", sursa: "piata", titlu: "Piața întreagă e în jos", text: "", ceAsFace: null }];
  const c = CS.alcatuiesteActiune({ sem, niv, sfaturi: sf, plan: p.plan, pret: 18, pretMediu: 20, qty: 10, costLei: 900, simbol: "INTC" });
  assert.equal(c.nivel, "iesi"); assert.equal(c.motive[0].cod, "stop-plan"); assert.match(c.faCe, /ies/i);
  assert.match(c.bani, /\$/); assert.match(c.bani, /lei/);
  const c4 = CS.alcatuiesteActiune({ sem, niv: { stopPozitie: 24.7605, trailPct: 15 }, pret: 26, pretMediu: 20, qty: 10, costLei: 900, simbol: "INTC" }); assert.match(c4.bani, /24\.76 \$/, "pretul stopului cu 2 zecimale la actiuni: " + c4.bani);
  assert.ok(c.rest.some((r) => /Piața întreagă/.test(r.titlu)) || c.motive.some((m) => /Piața/.test(m.titlu)), "nimic nu se pierde");
  const pp = CS.pentruPozaActiune(c); assert.equal(pp.nivel, "iesi"); assert.ok(pp.motive.length >= 1 && pp.ceAsFace);
});
await test("fara date -> asteapta; fara costLei -> banii doar in dolari", () => {
  are(CS.alcatuiesteActiune, "Consiliu.alcatuiesteActiune");
  const c0 = CS.alcatuiesteActiune({ sem: { nivel: "fara-date", motive: ["n-am prețuri"], ceAsFace: "x", componente: [] }, pret: 18, pretMediu: 20, qty: 10, simbol: "INTC" });
  assert.equal(c0.nivel, "asteapta"); assert.equal(CS.pentruPozaActiune(c0).nivel, "fara-date");
  const p = poz({ costLei: null }), c = CS.alcatuiesteActiune({ sem: AS.semafor(p, stJos), niv: { stopPozitie: 17, trailPct: 15 }, pret: 18, pretMediu: 20, qty: 10, costLei: null, simbol: "INTC" });
  assert.ok(!/lei/.test(c.bani || ""), c.bani);
});
await test("crypto neschimbat: alcatuieste (boti) trece prin ordoneaza si da ordinea din proba v10050 (muta, costuri, trend)", () => {
  assert.equal(typeof CS.ordoneaza, "function");
  const comp = (cod, motiv) => ({ cod, nivel: "atentie", motiv, faCe: "fa " + cod }), k = [comp("costuri", "costurile"), comp("muta", "mută gridul"), comp("trend", "trendul")];
  const S = { costuri: { judecate: 15, corecte: 7, bani: -20, baniN: 15 }, muta: { judecate: 12, corecte: 6, bani: 30, baniN: 12 } };
  const c = CS.alcatuieste({ sm: { nivel: "atentie", cod: "trend", motiv: "trendul", faCe: "", componente: [k[2], k[0], k[1]] }, socoteala: S });
  assert.deepEqual(c.motive.map((m) => m.cod), ["muta", "costuri", "trend"]);
});

// ---- pasul 2: socoteala pe motiv si lei ----
await test("socoteala actiunilor: verdictul notat o data pe schimbare, judecat la 5 zile de bursa pe pret × bucati × curs; IESI/ATENTIE au dreptate daca pretul a scazut", () => {
  are(CS.noteazaActiune, "Consiliu.noteazaActiune");
  const Z = 864e5; let j = CS.noteazaActiune([], { nivel: "atentie", motive: [{ cod: "trend-jos" }] }, 100, 10, 4.6, 0);
  j = CS.noteazaActiune(j, { nivel: "atentie", motive: [{ cod: "trend-jos" }] }, 99, 10, 4.6, Z); assert.equal(j.length, 1, "acelasi verdict nu se renoteaza");
  const bare = Array.from({ length: 10 }, (_, i) => ({ t: i * Z, o: 100 - i, h: 101 - i, l: 99 - i, c: 100 - i }));
  j = CS.judecaActiune(j, bare, 9 * Z); assert.equal(j[0].r, 1); assert.ok(Math.abs(j[0].bani - 5 * 10 * 4.6) < 1e-6, String(j[0].bani));
  const s = CS.socotealaActiuni([j]); assert.equal(s["trend-jos"].judecate, 1); assert.ok(s["trend-jos"].bani > 0); assert.equal(s["trend-jos"].stare, "necunoscut");
  const t = CS.noteazaActiune([], { nivel: "tine", motive: [{ cod: "trend-sus", c: "v" }] }, 100, 1, null, 0);
  assert.equal(CS.judecaActiune(t, bare, 9 * Z)[0].r, 0, "ȚINE pe o scadere: n-a avut dreptate"); assert.ok(CS.judecaActiune(t, bare, 9 * Z)[0].bani < 0, "fara curs: banii in dolari");
});
await test("rutele: jurnalul pe ticker si socoteala actiunilor in KV; lista tickerelor cu jurnal", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=semneAct", { bot: "INTC_US_EQ", log: [{ t: 1, coduri: ["trend-jos"], nivel: "atentie", pret: 20, qty: 2, fx: 4.5 }] }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=semneAct&bot=INTC_US_EQ"), env })).json()).log[0].coduri[0], "trend-jos");
  assert.deepEqual((await (await mod.onRequestGet({ request: cer("GET", "action=semneActLista"), env })).json()).tickere, ["INTC_US_EQ"]);
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=socotealaAct", { la: 1, peCod: { "trend-jos": { judecate: 1, corecte: 1, bani: 46, baniN: 1 } } }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=socotealaAct"), env })).json()).peCod["trend-jos"].bani, 46);
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), /async function turaSocotealaActiuni/);
});

// ---- pasul 3: colectorul ----
await test("schimbarea pe actiuni: motivul de sus cu alerta planului activa azi -> doar in Radar; fara ea -> pe Discord", () => {
  const T = { nivel: "tine", eticheta: "🟢 Ține", titlu: "x", motive: [] }, I = { nivel: "iesi", eticheta: "🔴 Ieși", titlu: "Stopul din plan", faCe: "ies", motive: [{ cod: "stop-plan", c: "r", titlu: "Stopul din plan" }] };
  const doua = (opt) => { let r = CS.schimbare(CS.schimbare(null, T, 0, "INTC").stare, I, 1, "INTC", opt); return CS.schimbare(r.stare, I, 2, "INTC", opt); };
  assert.ok(doua({ activ: { "t212-stop": "critic" } }).alerta.doarRadar === true, "alerta planului a sunat deja azi");
  assert.ok(!doua({ activ: {} }).alerta.doarRadar, "fara alerta planului: pe Discord");
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /Consiliu\.alcatuiesteActiune\(/); assert.match(col, /Consiliu\.pentruPozaActiune\(/); assert.match(col, /"t212-" \+ x\.ticker/); assert.match(col, /delete stareAlerte\[k\]\._cons/);
});

// ---- pasul 4: pagina T212 + deciziile ----
await test("decizia pe actiune: judecata la 5 zile de bursa pe pretul actiunii (si daca a vandut intre timp); ruta pastreaza pret/qty/fx", async () => {
  are(CS.judecaDecizieActiune, "Consiliu.judecaDecizieActiune");
  const Z = 864e5, bare = Array.from({ length: 10 }, (_, i) => ({ t: i * Z, o: 100 + i, h: 101 + i, l: 99 + i, c: 100 + i }));
  const r = CS.judecaDecizieActiune([{ t: 0.5 * Z, pret: 100, qty: 2, fx: 4.5, urmat: true, cheie: "x" }], bare, 9 * Z);
  assert.ok(Math.abs(r[0].r - 5 * 2 * 4.5) < 1e-9, String(r[0].r)); assert.match(r[0].cum, /5 zile/);
  assert.equal(CS.judecaDecizieActiune([{ t: 6.5 * Z, pret: 100, qty: 2, urmat: true }], bare, 9 * Z)[0].r, undefined, "ziua n-a trecut");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const rq = new Request("http://127.0.0.1:8788/api/istoric-bot?action=decizie", { method: "POST", headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: JSON.stringify({ bot: "t212-INTC_US_EQ", t: 1, cheie: "iesi|stop-plan", nivel: "iesi", titlu: "x", faCe: "y", urmat: true, total: 900, pret: 20, qty: 10, fx: 4.5 }) });
  assert.equal((await mod.onRequestPost({ request: rq, env })).status, 200); const d = JSON.parse(kv.get("decizii:t212-INTC_US_EQ"))[0]; assert.equal(d.pret, 20); assert.equal(d.qty, 10); assert.equal(d.fx, 4.5);
});
await test("pagina T212: Consilierul pozitiei (un verdict), de ce s-a schimbat, am facut / n-am facut; colectorul judeca deciziile t212-* pe pret", () => {
  const ecr = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"), col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(ecr, /Consiliu\.alcatuiesteActiune\(/); assert.match(ecr, /t212Decizie\(/); assert.match(ecr, /action=cons&bot=t212-/); assert.match(ecr, /Consiliu\.pentruPozaActiune\(p\.cons\)/);
  assert.match(col, /Consiliu\.judecaDecizieActiune\(/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
