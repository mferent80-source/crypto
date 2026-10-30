// Proba v100.276 / colector v101.150 (30.10, el: „ok fă idei” - cele 3 idei de după v100.275):
// (1) Piața azi spune DE CE lipsește clasamentul (starea turelor din colector, pe server); (2) alerta după 3 ture picate la rând + „a revenit”,
// mărimea corpului în jurnal; (3) plafonul corpului într-un singur loc (ruta + colectorul), corpul prea mare nu mai pleacă, de la 75% alertă.
//   node scripts/proba-v100276.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { plafonIstoricBot, plafonCale, PLAFON_IMPLICIT } from "../functions/_shared/plafon-corp.js";
import { verificaCorp, deAnuntatAproape, mesajAproape, kb } from "./lib/marime-corp.mjs";
import { pasClasament, stareDeUrcat, PRAG_ESECURI } from "./lib/stare-clasament.mjs";
import { turaClasament } from "./lib/tura-clasament.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(lib("acasa.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.276 · DE CE LIPSEȘTE · proba\n");

const api = citeste("functions", "api", "istoric-bot.js"), col = citeste("scripts", "colector.mjs"), ae = lib("acasa-ecran.js");

// lanțul de până la v100.275, copiat întocmai din ruta veche - tabelul nou trebuie să dea exact aceleași plafoane
const vechi = (action) => (action === "cazuri" ? 1048576 : action === "retea" ? 524288 : action === "arbori" ? 2097152 : action === "ore" ? 524288 : action === "scan" || action === "botiInchisi" ? 393216 : action === "ingustUrmarire" ? 524288 : action === "risc" || action === "carnet" || action === "latime" ? 262144 : action === "cont" ? 1048576 : action === "verdicteCalibrare" ? 262144 : action === "universSua" ? 1048576 : action === "sectoareTop" || action === "trend12" ? 262144 : action === "disciplinaBanda" ? 524288 : 65536);

await test("(3) plafonul: același ca lanțul vechi pe fiecare acțiune a rutei; ruta îl citește din tabelul comun", () => {
  const actiuni = [...new Set([...api.matchAll(/action===?"([A-Za-z0-9]+)"/g)].map((m) => m[1]))].concat(["inventata", "constructor", "__proto__", "toString", ""]);
  assert.ok(actiuni.length > 30, "acțiunile rutei: " + actiuni.length);
  for (const a of actiuni) assert.equal(plafonIstoricBot(a), vechi(a), a);
  assert.equal(PLAFON_IMPLICIT, 65536);
  assert.doesNotMatch(api, /action==="cazuri"\?1048576/, "lanțul vechi a ieșit din rută");
  assert.match(api, /import \{plafonIstoricBot\} from "\.\.\/_shared\/plafon-corp\.js";/);
  assert.match(api, /citesteCorp\(request,plafonIstoricBot\(action\)\)/);
  assert.deepEqual(plafonCale("/api/istoric-bot?action=clasament"), { actiune: "clasament", plafon: 65536 });
  assert.deepEqual(plafonCale("/api/istoric-bot?x=1&action=cont"), { actiune: "cont", plafon: 1048576 });
  assert.equal(plafonCale("/api/t212?action=idei").plafon, 262144);
  assert.equal(plafonCale("/api/market?type=pionex_tickers"), null);
});

await test("(3) verificaCorp: peste plafon ⇒ prea, de la 75% ⇒ aproape, cifrele cu o zecimală; alerta o dată la 24 h, nu pe `alerte`", () => {
  const p = verificaCorp("/api/istoric-bot?action=clasament", 84200);
  assert.equal(p.prea, true); assert.equal(p.aproape, false); assert.equal(p.text, "82,2 KB din 64,0 KB (128%) pe action=clasament");
  const a = verificaCorp("/api/istoric-bot?action=clasament", 50000);
  assert.equal(a.prea, false); assert.equal(a.aproape, true);
  const j = verificaCorp("/api/istoric-bot?action=clasament", 42538);   // clasamentul real de după v100.275 (65%)
  assert.equal(j.prea, false); assert.equal(j.aproape, false);
  assert.equal(verificaCorp("/api/istoric-bot?action=clasament", 65536).prea, false, "egal cu plafonul trece, ca la rută (text.length > max)");
  assert.equal(verificaCorp("/api/market?type=x", 9e9), null);
  const T = Date.UTC(2026, 9, 30, 12);
  assert.equal(deAnuntatAproape(a, null, T), true);
  assert.equal(deAnuntatAproape(a, T - 3600000, T), false);
  assert.equal(deAnuntatAproape(a, T - 24 * 3600000, T), true);
  assert.equal(deAnuntatAproape(j, null, T), false);
  assert.equal(deAnuntatAproape(verificaCorp("/api/istoric-bot?action=alerte", 60000), null, T), false);
  const m = mesajAproape(a);
  assert.equal(m.nivel, "atentie"); assert.match(m.mesaj, /48,8 KB din 64,0 KB \(76%\) pe action=clasament/);
  assert.equal(kb(1024), "1,0 KB");
});

await test("(3) colectorul: trimite măsoară înainte, peste plafon nu pleacă (eroarea spune cifrele), de la 75% alertă ținută minte pe disc", () => {
  const f = col.slice(col.indexOf("function trimite(cale, corp) {"), col.indexOf("// v100.40 (audit 30.09): Discord refuzat"));
  assert.ok(f.length > 100, "trimite găsit");
  assert.match(f, /const body = JSON\.stringify\(corp\), v = verificaCorp\(cale, body\.length\);/);
  assert.match(f, /if \(v && v\.prea\) return Promise\.reject\(Object\.assign\(new Error\("Corp prea mare: " \+ v\.text \+ ", netrimis"\)/);
  assert.ok(f.indexOf("v.prea") < f.indexOf("return cere("), "verificarea înaintea cererii");
  assert.match(f, /deAnuntatAproape\(v, marimeVazuta\(\)\[v\.actiune\], Date\.now\(\)\)/);
  assert.match(col, /var MARIME_FIS = path\.join\(DATA, "marime-corp\.json"\), marimeAnuntata = null;/);
  assert.doesNotMatch(col, /const trimite = \(cale, corp\) =>/);
  assert.equal((col.match(/function trimite\(/g) || []).length, 1, "un singur trimite");
  // comportamentul: aceeași funcție, rulată cu o cerere falsă
  const cod = col.slice(col.indexOf("var MARIME_FIS"), col.indexOf("// v100.40 (audit 30.09): Discord refuzat"));
  const cereri = [], jurnalL = [], alerte = [], scrise = [];
  const fsFals = { readFileSync: () => { throw new Error("nu există"); } };
  const fab = new Function("path", "DATA", "fs", "verificaCorp", "deAnuntatAproape", "mesajAproape", "cere", "BAZA", "jurnal", "anuntaMesaj", "scrieAtomic", cod + "; return trimite;");
  const trimite = fab(path, "D", fsFals, verificaCorp, deAnuntatAproape, mesajAproape, async (c, o) => { cereri.push([c, o.body.length]); return { ok: true }; }, "http://x", (...a) => jurnalL.push(a.join(" ")), async (m) => { alerte.push(m); }, (f2, o) => scrise.push([f2, o]));
  return (async () => {
    const mare = { la: 1, monede: "x".repeat(70000) };
    await assert.rejects(trimite("/api/istoric-bot?action=clasament", mare), /Corp prea mare: 68,4 KB din 64,0 KB \(107%\) pe action=clasament, netrimis/);
    assert.equal(cereri.length, 0, "nu a plecat");
    await trimite("/api/istoric-bot?action=clasament", { m: "x".repeat(50000) });
    await trimite("/api/istoric-bot?action=clasament", { m: "x".repeat(50000) });
    assert.equal(cereri.length, 2); assert.equal(alerte.length, 1, "o singură alertă"); assert.equal(scrise.length, 1);
    assert.match(jurnalL.join("\n"), /corp aproape de plafon: 48,8 KB din 64,0 KB/);
    await trimite("/api/market?type=x", { m: "x".repeat(900000) });
    assert.equal(cereri.length, 3, "rută fără plafon știut: pleacă");
  })();
});

const T0 = Date.parse("2026-10-29T19:24:00+02:00");
await test("(1–2) starea turelor: alertă la a 3-a picată, o singură dată; „a revenit” la prima bună; după revenire se numără de la zero", () => {
  let st = null, msg = [];
  const pas = (ev, t) => { const p = pasClasament(st, ev, t); st = p.st; if (p.mesaj) msg.push(p.mesaj); return p; };
  pas({ ok: true }, T0 - 3600000); assert.equal(st.esecuri, 0); assert.equal(msg.length, 0);
  pas({ ok: false, motiv: "Corp prea mare" }, T0); assert.equal(st.esecuri, 1); assert.equal(st.deLa, T0);
  pas({ ok: false, motiv: "Corp prea mare" }, T0 + 600000); assert.equal(msg.length, 0);
  pas({ ok: false, motiv: "Corp prea mare" }, T0 + 1200000); assert.equal(msg.length, 1); assert.equal(PRAG_ESECURI, 3);
  assert.equal(msg[0].nivel, "atentie"); assert.equal(msg[0].titlu, "Clasamentul pieței nu ajunge pe server");
  assert.equal(msg[0].mesaj, "3 ture picate la rând, de la 29.10 19:24 (Corp prea mare). Piața azi rămâne fără clasament până trece; colectorul reîncearcă la 10 minute.");
  for (let i = 3; i < 68; i++) pas({ ok: false, motiv: "Corp prea mare" }, T0 + i * 600000);
  assert.equal(msg.length, 1, "nu se repetă"); assert.equal(st.esecuri, 68); assert.equal(st.deLa, T0);
  pas({ ok: true }, T0 + 70 * 600000); assert.equal(msg.length, 2); assert.equal(msg[1].nivel, "info");
  assert.equal(msg[1].mesaj, "După 68 de ture picate la rând, de la 29.10 19:24, Piața azi are iar clasamentul.");
  assert.equal(st.esecuri, 0); assert.equal(st.anuntat, false);
  pas({ ok: false, motiv: "  x \n y " }, T0 + 80 * 600000); assert.equal(st.esecuri, 1); assert.equal(st.motiv, "x y"); assert.equal(msg.length, 2);
  pas({ ok: true }, T0 + 81 * 600000); assert.equal(msg.length, 2, "fără alertă înainte, fără „a revenit”");
  assert.deepEqual(Object.keys(stareDeUrcat(st)).sort(), ["deLa", "esecuri", "la", "motiv", "okLa"]);
});

function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v, o) => { m.set(k, v); m.set(k + "#o", o); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [] }) }; }
const TOKEN = "token-de-proba-v100276";
async function cheama(metoda, qs, env, corp) {
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "_" + Math.random());
  const h = { "cf-connecting-ip": "10.0.2.76", authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request("https://exemplu.test/api/istoric-bot?" + qs, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env });
  return { status: res.status, d: await res.json() };
}
await test("(1) ruta: clasamentStare curățat și ținut 7 zile; GET clasament o dă alături; fără stare ⇒ 400", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  let r = await cheama("GET", "action=clasament", env);
  assert.equal(r.status, 200); assert.strictEqual(r.d.clasament, null); assert.strictEqual(r.d.stare, null);
  r = await cheama("POST", "action=clasamentStare", env, { stare: { esecuri: "68", deLa: T0, motiv: "y".repeat(500), okLa: null, la: T0 + 1, anuntat: true, rau: "<script>" } });
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(env.ISTORIC.m.get("clasament:stare")), { esecuri: 68, deLa: T0, motiv: "y".repeat(160), okLa: null, la: T0 + 1 });
  assert.equal(env.ISTORIC.m.get("clasament:stare#o").expirationTtl, 7 * 86400);
  r = await cheama("GET", "action=clasament", env);
  assert.equal(r.d.stare.esecuri, 68);
  assert.equal((await cheama("POST", "action=clasamentStare", env, { nimic: 1 })).status, 400);
});

await test("(1) Piața azi: lipsă cu ture picate ⇒ motivul și ora; fără stare sau cu 0 ⇒ textul de până acum; clasament venit ⇒ starea nu contează", () => {
  const st = { esecuri: 68, deLa: T0, motiv: "Corp prea mare: 82,2 KB din 64,0 KB (128%) pe action=clasament, netrimis", la: T0 + 1 };
  const v = AC.vreme({ clasament: null, stare: st });
  assert.equal(v.eticheta, "FĂRĂ DATE"); assert.equal(v.titlu, "Clasamentul pieței nu ajunge pe server.");
  assert.equal(v.text, "Colectorul a încercat de 68 de ori la rând, de la 29.10 19:24, fără succes: Corp prea mare: 82,2 KB din 64,0 KB (128%) pe action=clasament, netrimis. Reîncearcă singur la 10 minute.");
  assert.match(AC.vreme({ clasament: null, stare: { esecuri: 1, deLa: T0, motiv: "fetch failed." } }).text, /^Colectorul a încercat o dată, de la 29\.10 19:24, fără succes: fetch failed\. Reîncearcă/);
  for (const s of [null, undefined, {}, { esecuri: 0 }, { esecuri: "x" }]) {
    const w = AC.vreme({ clasament: null, stare: s });
    assert.equal(w.titlu, "Clasamentul pieței n-a venit încă."); assert.match(w.text, /o dată pe oră/);
  }
  const ok = AC.vreme({ clasament: { evita: 10, candidati: 90, dir: {} }, stare: st });
  assert.notEqual(ok.nivel, "fara-date");
  assert.match(ae, /d\.clasamentStare = c && c\.stare \|\| null; return c && c\.clasament \|\| null;/);
  assert.match(ae, /Acasa\.vreme\(\{ clasament: cl, btc: \{ miscare: btcMis \}, fg: fgI\.acum, stare: d\.clasamentStare \}\)/);
});

await test("(2) tura clasamentului: motivul la NEURCAT / neconfirmat, mărimea corpului în jurnal; colectorul urcă starea în ambele ramuri", async () => {
  const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
  const GC = new Function("GridCalcul", `${lib("grid-clasament.js")}; return GridClasament;`)(G);
  const tk = { data: { tickers: [{ symbol: "AAA_USDT_PERP", amount: "9", close: "1" }, { symbol: "BBB_USDT_PERP", amount: "8", close: "1" }] } };
  const kl = Array.from({ length: 120 }, (_, i) => ({ time: Date.UTC(2026, 5, 1) + i * 14400000, open: "1", high: "1.01", low: "0.99", close: String(1 + (i % 5) / 100), volume: "1" }));
  const j1 = [], neconf = await turaClasament({ cere: async (u) => (/tickers/.test(u) ? tk : { data: { klines: kl } }), trimite: async () => ({ ok: false }), jurnal: (...a) => j1.push(a.join(" ")), pauza: async () => {}, pauzaMs: 0, GridCalcul: G, GridClasament: GC, top: 2 });
  assert.equal(neconf.urcat, false); assert.equal(neconf.motiv, "serverul n-a confirmat primirea");
  assert.match(j1.join("\n"), /clasament: 2 monede in \d+ s; .* fara date; \d+,\d KB; NEURCAT/);
  const neurc = await turaClasament({ cere: async (u) => (/tickers/.test(u) ? tk : { result: false }), trimite: async () => ({ ok: true }), jurnal: () => {}, pauza: async () => {}, pauzaMs: 0, GridCalcul: G, GridClasament: GC, top: 2 });
  assert.equal(neurc.motiv, "prea multe monede fără date: 2 din 2");
  const f = col.slice(col.indexOf("async function turaClasament() {"), col.indexOf("if (CANAL === \"discord\" && !/^https"));
  assert.match(f, /await stareClasamentPas\(r\.urcat \? \{ ok: true \} : \{ ok: false, motiv: r\.motiv \}\);/);
  assert.match(f, /catch \(e\) \{ jurnal\("clasament ESEC", e\.message\); clasamentLa = [^}]+; await stareClasamentPas\(\{ ok: false, motiv: e\.message \}\); \}/);
  assert.match(f, /tineRitm\("clasamentStare", p\.st\)/);
  assert.match(f, /trimite\("\/api\/istoric-bot\?action=clasamentStare", \{ stare: stareDeUrcat\(p\.st\) \}\)/);
});

// v100.277: de la v100.276 / v101.150 în sus (ca probele vechi), nu exact
await test("versiunile: de la v100.276 în aplicație, de la v101.150 în colector", () => {
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 276, String(app));
  assert.match(citeste("public", "index.html"), new RegExp('id="healthAppVersion">v100\\.' + app + "<"));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + app));
  assert.ok(Number(col.match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 150);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
