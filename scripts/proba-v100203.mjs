// Probele v100.203 / colector v101.121 (15.10.2026, el: „fă toate” — Busola 1.60.0, I-632 + I-636).
//  I-632  …#ecran=tabloubot&bot=<id> (butonul „Deschide botul în Radar ↗” din Busola) ⇒ botul ales în Tablou
//  I-636  colectorul trimite boții DIRECT în worker-ul Busolei (POST /api/boti, cheia în antet), doar deschișii + închișii din 2 h
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { pentruWorker, trimiteBusolei, cheiaBotilorBusola, secretScriereBusola, inchisiProaspeti, RAMAN_INCHISI_MS, BUSOLA_BOTI_URL } from "./lib/pentru-busola.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.203 · boții direct în Busola · proba\n");

const app = citeste("public", "app.js");
function functia(src, nume) { let i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(i, j + 1); }
const ctx = {}; vm.createContext(ctx); vm.runInContext(functia(app, "crLegaturaDin") + ";this.f=crLegaturaDin;", ctx);

await test("I-632 #ecran=tabloubot&bot=2438 ⇒ botul 2438", () => { assert.equal(ctx.f("#ecran=tabloubot&bot=2438").bot, "2438"); assert.equal(ctx.f("#ecran=tabloubot&bot=2438").ecran, "tabloubot"); });
await test("I-632 bot= doar pe tabloubot; caractere ciudate ⇒ fără bot", () => {
  assert.equal(ctx.f("#ecran=t212&bot=2438").bot, null); assert.equal(ctx.f("#ecran=tabloubot&bot=24%2638").bot, null); assert.equal(ctx.f("#ecran=tabloubot").bot, null);
});
await test("I-632 legăturile vechi merg ca înainte (parola, t212+poz, gridset+moneda)", () => {
  const a = ctx.f("#parola=abc&ecran=t212&poz=AVGO_US_EQ"); assert.equal(a.parola, "abc"); assert.equal(a.poz, "AVGO_US_EQ");
  assert.equal(ctx.f("#ecran=gridset&moneda=lit").moneda, "LIT");
});
await test("I-632 botul din legătură devine ALES în Tablou (aceeași cheie ca tbAlegeBot, scrisă ca JSON)", () => {
  assert.match(app, /if\(L\.bot\)\{try\{localStorage\.setItem\("tabloBotAles_v1",JSON\.stringify\(String\(L\.bot\)\)\)\}catch\{\}\}/);
  assert.match(app, /TB_BOT_ALES="tabloBotAles_v1"/);
});

const acum = Date.now(), H = 3600000;
const ob = { la: acum, versiune: "v101.121", retea: [{ simbol: "X" }], boti: [{ id: "1", inchis: null }, { id: "2", inchis: acum - H }, { id: "3", inchis: acum - 3 * H }] };
await test("I-636 pleacă doar deschișii + închișii din 2 h, fără rețea", () => {
  const w = pentruWorker(ob, acum); assert.deepEqual(w.boti.map((b) => b.id), ["1", "2"]); assert.deepEqual(w.retea, []); assert.equal(w.la, acum); assert.equal(RAMAN_INCHISI_MS, 2 * H);
});
await test("I-636 cheia: doar 32 hex", () => { assert.equal(cheiaBotilorBusola(" " + "a".repeat(32) + "\n"), "a".repeat(32)); assert.equal(cheiaBotilorBusola("x"), null); assert.equal(cheiaBotilorBusola(""), null); });
await test("I-636 POST la worker-ul Busolei, cheia în ANTET (nu în adresă)", async () => {
  let cerere = null; const f = async (u, o) => { cerere = { u, o }; return new Response(JSON.stringify({ scris: true, motiv: "boti" }), { status: 200 }); };
  const r = await trimiteBusolei({ ob, acum, cheie: "a".repeat(32), secret: "b".repeat(64), fetch: f });
  assert.equal(cerere.u, BUSOLA_BOTI_URL); assert.equal(BUSOLA_BOTI_URL, "https://busola.mferent80.workers.dev/api/boti");
  assert.equal(cerere.o.method, "POST"); assert.equal(cerere.o.headers["x-cheie-boti"], "a".repeat(32)); assert.ok(!cerere.u.includes("a".repeat(32)));
  assert.equal(cerere.o.headers["x-scriere-boti"], "b".repeat(64)); assert.ok(!cerere.u.includes("b".repeat(64)));
  assert.deepEqual(JSON.parse(cerere.o.body).boti.map((b) => b.id), ["1", "2"]); assert.equal(r.ok, true); assert.equal(r.scris, true);
});
await test("I-636 fără cheie ⇒ nu pleacă nimic", async () => { let n = 0; const r = await trimiteBusolei({ ob, acum, cheie: null, fetch: async () => { n++; } }); assert.equal(n, 0); assert.equal(r.motiv, "fara-cheie"); });
await test("revizia 🟡1: fără SECRETUL de scriere ⇒ nu pleacă nimic (cheia de citire nu ajunge)", async () => { let n = 0; const r = await trimiteBusolei({ ob, acum, cheie: "a".repeat(32), secret: null, fetch: async () => { n++; } }); assert.equal(n, 0); assert.equal(r.motiv, "fara-secret"); assert.equal(secretScriereBusola("c".repeat(64) + "\n"), "c".repeat(64)); assert.equal(secretScriereBusola("c".repeat(32)), null); });
await test("I-636 rețea picată ⇒ nu aruncă", async () => { const r = await trimiteBusolei({ ob, acum, cheie: "a".repeat(32), secret: "b".repeat(64), fetch: async () => { throw new Error("ECONNRESET"); } }); assert.equal(r.ok, false); assert.match(r.motiv, /ECONNRESET/); });

const col = citeste("scripts", "colector.mjs");
await test("I-636 colectorul trimite DUPĂ scriere, fără să aștepte (nu ține tura), jurnal doar la schimbarea stării", () => {
  const f = col.slice(col.indexOf("async function scriePentruBusola("), col.indexOf("var BUSOLA_CHEIE_FIS"));
  assert.ok(f.indexOf("scrieAtomic(PENTRU_BUSOLA_FIS, ob)") > 0 && f.indexOf("trimiteBusolei({ ob, acum, cheie, secret })") > f.indexOf("scrieAtomic(PENTRU_BUSOLA_FIS, ob)"));
  assert.ok(f.indexOf("inchisiProaspeti(pbStareInchisi,") > 0 && f.indexOf("inchisiProaspeti(pbStareInchisi,") < f.indexOf("scrieAtomic(PENTRU_BUSOLA_FIS, ob)"));
  assert.ok(!/await trimiteBusolei/.test(f)); assert.match(f, /if \(st !== pbBusolaStare\)/);
  assert.match(col, /var BUSOLA_CHEIE_FIS = process\.env\.BUSOLA_CHEIE_BOTI_FIS \|\| "C:\/Users\/Cimin\/busola\/cron\/stare\/boti-cheie\.txt"/);
});
// ── revizia 🟡7: botul oprit apare închis pe loc ──
const B = (id, inchis = null, pnlPct = 1) => ({ id, simbol: "MARSCOIN", inchis, pnlPct });
await test("🟡7 botul lipsește 2 ture la rând ⇒ ÎNCHIS provizoriu, cu ultimul profit; o tură lipsă ⇒ încă nimic", () => {
  let s = inchisiProaspeti(null, { boti: [B("1", null, 2.7), B("2")] }, acum).stare;
  let r = inchisiProaspeti(s, { boti: [B("2")] }, acum + 60000); assert.equal(r.ob.boti.length, 1);
  r = inchisiProaspeti(r.stare, { boti: [B("2")] }, acum + 120000);
  const x = r.ob.boti.find((b) => b.id === "1"); assert.ok(x && x.inchis === acum + 120000 && x.provizoriu === true && x.pnlPct === 2.7);
});
await test("🟡7 lista cu totul GOALĂ (căderea Pionex de o tură) ⇒ abia după 3 ture", () => {
  let r = inchisiProaspeti(null, { boti: [B("1")] }, acum);
  r = inchisiProaspeti(r.stare, { boti: [] }, acum + 60000); r = inchisiProaspeti(r.stare, { boti: [] }, acum + 120000); assert.equal(r.ob.boti.length, 0);
  r = inchisiProaspeti(r.stare, { boti: [] }, acum + 180000); assert.equal(r.ob.boti.length, 1); assert.equal(r.ob.boti[0].inchis, acum + 180000);
});
await test("🟡7 cel adevărat din arhivă (același id) înlocuiește provizoriul; revenit deschis ⇒ provizoriul dispare; după 2 h iese", () => {
  let r = inchisiProaspeti(null, { boti: [B("1")] }, acum); r = inchisiProaspeti(r.stare, { boti: [B("9")] }, acum + 60000); r = inchisiProaspeti(r.stare, { boti: [B("9")] }, acum + 120000);
  assert.ok(r.ob.boti.some((b) => b.id === "1" && b.provizoriu));
  const real = inchisiProaspeti(r.stare, { boti: [B("9"), B("1", acum + 100000, -1.3)] }, acum + 180000);
  assert.deepEqual(real.ob.boti.filter((b) => b.id === "1").map((b) => [b.pnlPct, !!b.provizoriu]), [[-1.3, false]]);
  const tarziu = inchisiProaspeti(r.stare, { boti: [B("9")] }, acum + 120000 + 2 * H + 1000); assert.ok(!tarziu.ob.boti.some((b) => b.id === "1"));
});
await test("versiunile: v100.203, colectorul v101.121, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  assert.equal(JSON.parse(citeste("package.json")).version, "100.203.0"); assert.match(citeste("public", "sw.js"), /^const CACHE="crypto-radar-v100-203";/);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100.203"); assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.203"/);
  assert.equal((idx.match(/v100\.203/g) || []).length, 4); assert.ok(!/v100\.202\b/.test(idx));
  assert.match(col, /const VERSIUNE_COLECTOR = "v101\.121"/);
  assert.match(citeste("package.json"), /npm run test:v100202 && npm run test:v100203/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
