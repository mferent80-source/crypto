// Proba v100.306-c2 / colector v101.166 (05.11.2026, auditul final - partea SĂNĂTATE și PIONEX):
//   I-833 — sănătatea colectorului: erorile 5xx pe rută ⇒ UN mesaj după 30 min continue (și „a revenit”); o tură fără reușită 24 h ⇒ UN
//           mesaj „🩺 colectorul”, cu cauza scrisă în jurnal (nu doar „fetch failed”); simbolurile delistate (MARKET_INVALID_SYMBOL) sărite
//           după 3 zile de eșec; lansatorul de pe VPS reface Functions când `git pull` aduce functions/ și rotește wrangler.log la 20 MB.
//   I-838 — Pionex: lista boților cu cache de 30 s (lichidarea și stopul pe citirea proaspătă), lumânările de 4h (clasament) și 1 zi (scan)
//           aduse incremental de pe disc (coada lipită; coada goală ⇒ istoricul întreg), lumânările de 1 h de dimineață o singură dată.
//   node scripts/proba-v100306-c2.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const imp = (...p) => import(pathToFileURL(path.join(RAD, ...p)).href).catch((e) => ({ __lipsa: e.message }));
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ").slice(0, 700)}`); }); }
const are = (M, n) => assert.ok(M && !M.__lipsa, n + " lipsește: " + (M && M.__lipsa));
const fara = (m, ce) => { for (const a of verifica(m.titlu, "alertaTitlu").concat(verifica(m.mesaj, "alertaMesaj"))) assert.fail(ce + ": " + a + " · " + m.titlu + " · " + m.mesaj); };
console.log("\nv100.306-c2 · sănătatea colectorului și cererile Pionex (I-833, I-838) · proba\n");
const MIN = 60000, ORA = 3600000, ZI = 86400000, T0 = Date.UTC(2026, 10, 3, 6, 0);
const SRC = citeste("scripts", "colector.mjs");

// ---------------- I-833: erorile 5xx pe rută ----------------
const SR = await imp("scripts", "lib", "sanatate-rute.mjs");
const MC = await imp("scripts", "lib", "mesaje-colector.mjs");
await test("I-833a. cheia rutei: calea + acțiunea (fără parametrii de simbol)", () => {
  are(SR, "scripts/lib/sanatate-rute.mjs");
  assert.equal(SR.cheieRuta("/api/istoric-bot?action=paza"), "istoric-bot·paza");
  assert.equal(SR.cheieRuta("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=4H&limit=500"), "market·pionex_klines");
  assert.equal(SR.cheieRuta("/api/bot-orders?status=finished&limit=100"), "bot-orders");
  assert.equal(SR.cheieRuta("/api/t212?action=pozitii"), "t212·pozitii");
});
await test("I-833b. 5xx continue pe o rută: nimic sub 30 min, UN mesaj la 30 min (garda), nimic la tura următoare, „a revenit” la primul răspuns bun", () => {
  are(SR, "sanatate-rute");
  const st = {}; let t = T0;
  for (; t < T0 + 29 * MIN; t += MIN) { SR.noteazaRaspuns(st, "/api/istoric-bot?action=paza", 500, t); assert.deepEqual(SR.pas5xx(st, t).cadere, [], "sub 30 min"); }
  SR.noteazaRaspuns(st, "/api/istoric-bot?action=paza", 500, T0 + 31 * MIN);
  const p = SR.pas5xx(st, T0 + 31 * MIN); assert.equal(p.cadere.length, 1); assert.equal(p.cadere[0].ruta, "istoric-bot·paza"); assert.ok(p.cadere[0].n >= 30);
  const m = MC.rute5xx(p.cadere); fara(m, "rute5xx"); assert.match(m.titlu, /🩺/); assert.match(m.mesaj, /istoric-bot·paza/);
  SR.noteazaRaspuns(st, "/api/istoric-bot?action=paza", 500, T0 + 32 * MIN); assert.deepEqual(SR.pas5xx(st, T0 + 32 * MIN).cadere, [], "o singură dată");
  SR.noteazaRaspuns(st, "/api/istoric-bot?action=paza", 200, T0 + 40 * MIN);
  const r = SR.pas5xx(st, T0 + 40 * MIN); assert.equal(r.revenit.length, 1); fara(MC.rute5xxRevenit(r.revenit), "rute5xxRevenit");
  assert.deepEqual(SR.pas5xx(st, T0 + 41 * MIN).revenit, [], "„a revenit” o singură dată");
});
await test("I-833c. un răspuns bun la mijloc rupe șirul; erorile rare (o dată pe oră) nu fac „30 min continue”; 4xx nu e cădere", () => {
  const st = {};
  for (let t = T0; t <= T0 + 40 * MIN; t += MIN) SR.noteazaRaspuns(st, "/api/t212?action=pozitii", t === T0 + 20 * MIN ? 200 : 503, t);
  assert.deepEqual(SR.pas5xx(st, T0 + 40 * MIN).cadere, [], "ruptă la minutul 20");
  const st2 = {}; SR.noteazaRaspuns(st2, "/api/stiri?action=piata", 500, T0); SR.noteazaRaspuns(st2, "/api/stiri?action=piata", 500, T0 + 61 * MIN);
  assert.deepEqual(SR.pas5xx(st2, T0 + 61 * MIN).cadere, [], "două erori la o oră distanță nu sunt o cădere continuă");
  const st3 = {}; for (let t = T0; t <= T0 + 40 * MIN; t += MIN) SR.noteazaRaspuns(st3, "/api/bot-orders", 429, t);
  assert.deepEqual(SR.pas5xx(st3, T0 + 40 * MIN).cadere, []);
});
await test("I-833d. colectorul numără răspunsurile în `cere` și trimite mesajul din turaSanatate (o dată pe tură)", () => {
  assert.match(SRC, /SR\.noteazaRaspuns\(/); assert.match(SRC, /SR\.pas5xx\(/); assert.match(SRC, /turaSanatate\(\)/);
});

// ---------------- I-833: o tură fără reușită 24 h ----------------
await test("I-833e. cauza reală în jurnal: „fetch failed (UND_ERR_SOCKET: other side closed)”, nu doar „fetch failed”", () => {
  are(SR, "sanatate-rute");
  const e = Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" }) });
  assert.equal(SR.motivEroare(e), "fetch failed (UND_ERR_SOCKET: other side closed)");
  assert.equal(SR.motivEroare(new Error("HTTP 500")), "HTTP 500");
  const ag = Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new AggregateError([Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8788"), { code: "ECONNREFUSED" })]), { code: undefined }) });
  assert.match(SR.motivEroare(ag), /ECONNREFUSED/);
});
await test("I-833f. „🩺 colectorul”: o tură fără nicio reușită 24 h ⇒ UN mesaj cu tura și cauza; o reușită închide (doar în Radar)", () => {
  const st = {};
  SR.noteazaTura(st, "frana", true, T0);
  SR.noteazaTura(st, "cazuri", false, T0, "fetch failed (UND_ERR_SOCKET: other side closed)");
  for (let h = 1; h < 24; h++) { SR.noteazaTura(st, "cazuri", false, T0 + h * ORA, "fetch failed (UND_ERR_SOCKET: other side closed)"); assert.deepEqual(SR.pasTure(st, T0 + h * ORA).cazute, []); }
  SR.noteazaTura(st, "cazuri", false, T0 + 24 * ORA + MIN, "fetch failed (UND_ERR_SOCKET: other side closed)");
  const p = SR.pasTure(st, T0 + 24 * ORA + MIN); assert.equal(p.cazute.length, 1); assert.equal(p.cazute[0].tura, "cazuri");
  const m = MC.tureCazute(p.cazute); fara(m, "tureCazute"); assert.match(m.titlu, /🩺 colectorul/); assert.match(m.mesaj, /cazuri/); assert.match(m.mesaj, /UND_ERR_SOCKET/);
  assert.deepEqual(SR.pasTure(st, T0 + 25 * ORA).cazute, [], "o singură dată");
  SR.noteazaTura(st, "cazuri", true, T0 + 26 * ORA);
  const r = SR.pasTure(st, T0 + 26 * ORA); assert.equal(r.revenite.length, 1);
  const mr = MC.tureRevenite(r.revenite); assert.equal(mr.doarRadar, true); fara(mr, "tureRevenite");
});
await test("I-833g. colectorul notează turele cazuri / frâna / disciplina / risc, cu motivul real în jurnal", () => {
  for (const t of ["cazuri", "frana", "disciplina", "risc"]) assert.match(SRC, new RegExp("SR\\.noteazaTura\\(sanatate\\(\\), \"" + t + "\""), t);
  assert.match(SRC, /jurnal\("cazuri ESEC \(reincerc peste o ora\)", SR\.motivEroare\(e\)\)/);
});

// ---------------- I-833: lista neagră a simbolurilor delistate ----------------
const LN = await imp("scripts", "lib", "lista-neagra.mjs");
await test("I-833h. MARKET_INVALID_SYMBOL: încercat 3 zile, apoi sărit (arhiva de 1 h nu mai cere nimic pentru el)", async () => {
  are(LN, "scripts/lib/lista-neagra.mjs");
  const { turaArhivaOre } = await imp("scripts", "lib", "tura-arhiva-ore.mjs");
  const st = {}, cereri = [], jurn = [];
  const d = (acum) => ({ acum, plan: [{ moneda: "YALA", deLa: T0 - 30 * ZI, panaLa: T0, boti: 3 }], simbolPentru: async () => "YALA_USDT_PERP", citeste: () => [], scrie: () => {},
    cere: async (u) => { cereri.push(u); return { result: false, code: "MARKET_INVALID_SYMBOL", data: null }; }, pauza: async () => {}, jurnal: (...a) => jurn.push(a.join(" ")), stare: st, scrieStare: () => {}, GridCalcul: { imbinaRanduri: (a, b) => a.concat(b) } });
  for (let z = 0; z <= 3; z++) await turaArhivaOre(d(T0 + z * ZI));
  const inainte = cereri.length; assert.ok(inainte >= 3, "a încercat " + inainte);
  await turaArhivaOre(d(T0 + 4 * ZI)); await turaArhivaOre(d(T0 + 5 * ZI));
  assert.equal(cereri.length, inainte, "după 3 zile de eșec nu mai cere");
  assert.ok(jurn.some((l) => /lista neagră/.test(l)), "spune în jurnal că l-a pus pe lista neagră");
  assert.equal(LN.eInListaNeagra(st, "YALA", T0 + 5 * ZI), true);
});
await test("I-833i. o eroare oarecare (timeout) NU duce pe lista neagră; profilul monedei folosește aceeași listă", async () => {
  const st = {}; for (let z = 0; z < 6; z++) LN.noteazaEsecSimbol(st, "BTC", "The operation was aborted due to timeout", T0 + z * ZI);
  assert.equal(LN.eInListaNeagra(st, "BTC", T0 + 6 * ZI), false);
  const st2 = {}; for (let z = 0; z <= 3; z++) LN.noteazaEsecSimbol(st2, "ORDER_USDT_PERP", "ORDER_USDT_PERP symbol error", T0 + z * ZI);
  assert.equal(LN.eInListaNeagra(st2, "ORDER_USDT_PERP", T0 + 3 * ZI + MIN), true);
  assert.match(citeste("scripts", "lib", "tura-profil.mjs"), /eInListaNeagra\(/);
});

// ---------------- I-833: lansatorul de pe VPS ----------------
await test("I-833j. scripts/vps/porneste-radar.ps1: cu BOM, după `git pull` cu functions/ schimbat oprește wrangler și reface Functions; rotește wrangler.log la 20 MB", () => {
  const f = path.join(RAD, "scripts", "vps", "porneste-radar.ps1"); assert.ok(fs.existsSync(f), "lipsește");
  const b = fs.readFileSync(f); assert.ok(b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf, "fără BOM (PowerShell 5.1 strică diacriticele)");
  const s = b.toString("utf8");
  assert.match(s, /git diff --name-only/); assert.match(s, /-- functions/);
  assert.match(s, /pages functions build functions/); assert.match(s, /wrangler\.log/); assert.match(s, /20MB/); assert.match(s, /2MB/);
  assert.match(s, /workerd/, "oprește și workerd-ul (serverul ascultă prin el)");
  assert.match(s, /idempotent/i);
  if (process.platform === "win32") {
    const out = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "$e=$null;$t=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('" + f.replace(/'/g, "''") + "',[ref]$t,[ref]$e);if($e.Count){$e|ForEach-Object{$_.Message}}else{'PARSE-OK'}"], { encoding: "utf8" });
    assert.match(out, /PARSE-OK/, out);
  }
});

// ---------------- I-838: lista boților cu cache de 30 s ----------------
const CP = await imp("scripts", "lib", "cache-pionex.mjs");
await test("I-838a. lista boților: o cerere la 30 s, cererile deodată legate, citirea proaspătă a turei o pune în cache; erorile nu se țin", async () => {
  are(CP, "scripts/lib/cache-pionex.mjs");
  let t = T0, n = 0, rau = false;
  const c = CP.creeazaCacheBoti({ cere: async () => { n++; if (rau) throw new Error("HTTP 500"); return { bots: [{ id: "1", pretCurent: 1 + n }] }; }, ceas: () => t });
  assert.equal(CP.TTL_BOTI_MS, 30000);
  const [a, b] = await Promise.all([c.citeste(), c.citeste()]); assert.equal(n, 1); assert.deepEqual(a, b);
  a.bots[0].pretCurent = 999; assert.notEqual((await c.citeste()).bots[0].pretCurent, 999, "o copie, nu obiectul comun");
  t += 29000; await c.citeste(); assert.equal(n, 1); t += 2000; await c.citeste(); assert.equal(n, 2);
  c.pune({ bots: [{ id: "1", pretCurent: 7 }] }); assert.equal((await c.citeste()).bots[0].pretCurent, 7); assert.equal(n, 2);
  t += 31000; rau = true; await assert.rejects(c.citeste()); rau = false; await c.citeste(); assert.equal(n, 4);
});
await test("I-838b. colectorul: tura alertelor citește PROASPĂT și pune în cache; restul turelor iau lista prin cache (cereBoti / cereCuCache)", () => {
  assert.match(SRC, /d = await cere\("\/api\/bot-orders"\);\s*cacheBoti\.pune\(d\)/, "tura alertelor nu pune citirea proaspătă în cache");
  const rest = (SRC.match(/cere\("\/api\/bot-orders"\)/g) || []).length;
  assert.equal(rest, 1, "doar tura alertelor mai cere direct lista boților porniți (" + rest + ")");
  assert.match(SRC, /cere: cereCuCache/);
});

// ---------------- I-838: lumânările incrementale ----------------
const LD = await imp("scripts", "lib", "lumanari-disc.mjs");
const H4 = 4 * ORA;
const kl = (t0, n, pas, f) => Array.from({ length: n }, (_, i) => { const c = 100 + (f ? f(i) : i % 7); return { time: t0 + i * pas, open: c, high: c + 1, low: c - 1, close: c, volume: 10 }; });
await test("I-838c. lipesteCoada (ca Busola 1.88): bara cu aceeași oră o înlocuiește; gaura sau coada goală ⇒ null (istoricul întreg)", () => {
  are(LD, "scripts/lib/lumanari-disc.mjs");
  const v = kl(0, 5, H4), c = kl(4 * H4, 3, H4, () => 50);
  const l = LD.lipesteCoada(v, c, H4); assert.equal(l.length, 7); assert.equal(l[4].close, 150, "bara de la 4×4h e cea din coadă");
  assert.equal(LD.lipesteCoada(v, [], H4), null); assert.equal(LD.lipesteCoada(v, kl(10 * H4, 2, H4), H4), null); assert.equal(LD.lipesteCoada([], c, H4), null);
});
await test("I-838d. 4h pe disc: prima dată istoricul întreg (500); în aceeași fereastră de 4 h ZERO cereri (bara în curs din prețul tickerului); fereastră nouă ⇒ doar coada", async () => {
  are(LD, "lumanari-disc");
  const disc = new Map(), cereri = [], memorie = {};
  let acum = Math.floor(T0 / H4) * H4 + 30 * MIN;
  const server = (limit) => { const capat = Math.floor(acum / H4) * H4; const n = Math.min(limit, 520); return kl(capat - (n - 1) * H4, n, H4).reverse(); };   // Pionex: descrescător, cu bara în curs
  const ia = (pret) => LD.klinesIncrementale({ simbol: "ARIA_USDT_PERP", pas: H4, limitaIntreg: 500, acum, pretAcum: pret, memorie,
    citeste: (k) => disc.get(k) || null, scrie: (k, v) => disc.set(k, v), cereKlines: async (limit) => { cereri.push(limit); return server(limit); } });
  let r = await ia(101.5); assert.deepEqual(cereri, [500]); assert.equal(r.klines.length, 500); assert.equal(r.sursa, "intreg");
  const u = r.klines[r.klines.length - 1]; assert.equal(u.time, Math.floor(acum / H4) * H4); assert.equal(Number(u.close), 101.5, "bara în curs închide la prețul de acum");
  acum += 2 * ORA; r = await ia(103); assert.deepEqual(cereri, [500], "aceeași fereastră: nicio cerere"); assert.equal(r.sursa, "disc");
  const u2 = r.klines[r.klines.length - 1]; assert.equal(Number(u2.close), 103); assert.ok(Number(u2.high) >= 103);
  acum += 2 * ORA; r = await ia(104); assert.equal(cereri.length, 2); assert.ok(cereri[1] < 10, "doar coada (" + cereri[1] + ")"); assert.equal(r.sursa, "coada"); assert.equal(r.klines.length, 500);
  const t = r.klines.map((x) => x.time); assert.deepEqual(t, [...t].sort((a, b) => a - b)); assert.equal(new Set(t).size, t.length, "fără bare dublate");
});
await test("I-838e. coada goală (pereche delistată / redenumită) ⇒ istoricul întreg; fără prețul tickerului ⇒ se cere coada (nu se servește bara veche)", async () => {
  const disc = new Map(), cereri = [], memorie = {}; let acum = Math.floor(T0 / H4) * H4 + 10 * MIN, gol = false;
  const ia = (pret) => LD.klinesIncrementale({ simbol: "X", pas: H4, limitaIntreg: 500, acum, pretAcum: pret, memorie, citeste: (k) => disc.get(k) || null, scrie: (k, v) => disc.set(k, v),
    cereKlines: async (limit) => { cereri.push(limit); return gol && limit < 500 ? [] : kl(Math.floor(acum / H4) * H4 - (Math.min(limit, 500) - 1) * H4, Math.min(limit, 500), H4); } });
  await ia(100); acum += 4 * H4; gol = true; const r = await ia(100); assert.deepEqual(cereri.slice(-2).map((x) => x === 500), [false, true], "coada goală ⇒ întreg: " + cereri);
  assert.equal(r.sursa, "intreg");
  gol = false; const n = cereri.length; await ia(null); assert.equal(cereri.length, n + 1, "fără preț de acum ⇒ o cerere");
});
await test("I-838f. clasamentul și scanul folosesc lumânările incrementale (fără o cerere de 500 pe monedă la fiecare oră)", async () => {
  const { turaClasament } = await imp("scripts", "lib", "tura-clasament.mjs");
  const cereri = [];
  const G = { bare: (k) => (k || []).map((x) => ({ t: x.time, o: +x.open, h: +x.high, l: +x.low, c: +x.close })) };
  const tickers = [{ symbol: "A_USDT_PERP", close: "101", amount: "9" }, { symbol: "B_USDT_PERP", close: "51", amount: "8" }];
  await turaClasament({ top: 2, pauzaMs: 0, cere: async (u) => { cereri.push(u); return { data: { tickers } }; }, trimite: async () => ({ ok: true }), jurnal: () => {}, pauza: async () => {},
    GridCalcul: G, GridClasament: { topDupaVolum: (t) => t.map((x) => ({ simbol: x.symbol, volum: +x.amount })), judeca: (s, b) => ({ simbol: s, stare: b ? "candidat" : "fara-date" }), rezumat: ({ monede }) => ({ faraDate: monede.filter((m) => m.stare === "fara-date").length, evita: 0, candidati: monede.length }) },
    klines4h: async (s, pret) => { assert.ok(pret > 0, "prețul tickerului ajunge la lumânări"); return kl(0, 60, H4); } });
  assert.equal(cereri.filter((u) => /pionex_klines/.test(u)).length, 0, "clasamentul a cerut lumânări direct");
  const sc = citeste("scripts", "lib", "tura-scan.mjs"); assert.match(sc, /d\.klines1d/);
  assert.match(SRC, /klines4h: /); assert.match(SRC, /klines1d: /);
});
await test("I-838g. dimineața: lumânările de 1 h ale unei monede se aduc o singură dată (Range Filter, Trade-ul zilei, proba A)", async () => {
  are(CP, "cache-pionex");
  let t = T0, n = 0; const m = CP.creeazaMemo({ ttlMs: 15 * MIN, ceas: () => t });
  const f = () => { n++; return Promise.resolve({ data: { klines: [1, 2] } }); };
  await Promise.all([m.ia("ARIA", f), m.ia("ARIA", f)]); await m.ia("ARIA", f); assert.equal(n, 1);
  t += 16 * MIN; await m.ia("ARIA", f); assert.equal(n, 2);
  assert.match(SRC, /lumanari1h\(/); assert.ok((SRC.match(/interval=60M&limit=500"\); return GridCalcul\.bare/g) || []).length === 0, "Trade-ul zilei / proba A cer încă direct");
});

console.log(`\n${picate ? "PICA" : "PASS"} · ${teste - picate} din ${teste}\n`);
if (picate) process.exitCode = 1;
