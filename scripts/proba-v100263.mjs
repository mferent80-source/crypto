// Proba v100.263 (28.10, auditul Radar din Trading Tools, partea a doua - cele trei lucruri rămase, „FA”):
//   I-791 cheia de SCRIERE la Paznic (CHEIE_SCRIERE) pentru /simboluri, /stopuri, /salt-cereri - cu tranziție (secret nepus = cheia de citire);
//   P3  `la` din viitor refuzat; P2 ETag-ul / pulsul citite și dintr-o poză cu câmpurile în altă ordine;
//   I-786 contractul pozei: paznic/exemplu-poza.json produs de construiestePoza, la zi, cu toate câmpurile pe care pagina Alerte le randează;
//   P3  moneda de rezervă a simbolului din bursa lui (colector); #parola= diferită întreabă înainte să înlocuiască (app.js).
// Fără rețea. Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import paznic, { pozaScrie, pozaCiteste, laDinText, turaDinText, cheieScrierePusa, LA_VIITOR_MAX_MS } from "../paznic/worker.mjs";
import { monedaBursa } from "./lib/poza.mjs";
import { exemplu, FISIER, ACUM } from "./exemplu-poza.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); });
}
console.log("\nV100.263 · CHE · proba\n");

const TOK = "t".repeat(32), CIT = "c".repeat(32), SCR = "s".repeat(32);
function lume(cuScriere) {
  const kv = new Map(), env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, delete: async (k) => { kv.delete(k); },
    list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix || "")).sort().map((name) => ({ name })), list_complete: true }) }, PAZNIC_TOKEN: TOK, CHEIE_CITIRE: CIT, ...(cuScriere ? { CHEIE_SCRIERE: SCR } : {}) };
  const cere = (cale, m, cheie, corp) => paznic.fetch(new Request("https://paznic.test" + cale, { method: m, headers: { "content-type": "application/json", ...(cheie ? { authorization: "Bearer " + cheie } : {}) }, body: corp }), env);
  return { kv, env, cere };
}
const C = JSON.stringify;

await test("I-791 · cu CHEIE_SCRIERE pusă: /simboluri, /stopuri, /salt-cereri scriu DOAR cu ea; cheia de citire primește 401 cu mesajul „cheia de scriere”; GET /poza rămâne pe cheia de citire", async () => {
  const w = lume(true);
  for (const [cale, corp] of [["/simboluri", C({ simboluri: [{ s: "INTC" }] })], ["/stopuri", C({ cuStop: ["INTC_US_EQ"] })], ["/salt-cereri", C({ op: "scoate", isin: "US64110L1061" })]]) {
    const r1 = await w.cere(cale, "POST", CIT, corp); assert.equal(r1.status, 401, cale + " cu cheia de citire"); assert.match((await r1.json()).error, /cheia de scriere/);
    assert.equal((await w.cere(cale, "POST", null, corp)).status, 401, cale + " fără cheie");
    assert.equal((await w.cere(cale, "POST", SCR, corp)).status, 200, cale + " cu cheia de scriere");
  }
  await pozaScrie(w.env, C({ la: ACUM, t212: [] }), ACUM);
  assert.equal((await w.cere("/poza", "GET", CIT)).status, 200, "citirea rămâne pe cheia de citire");
  assert.equal((await w.cere("/poza", "GET", SCR)).status, 401, "cheia de scriere NU citește poza");
  assert.deepEqual(await (await w.cere("/", "GET", null)).json(), { serviciu: "paznicul colectorului Crypto Radar", cheieScriere: true });
});
await test("I-791 · tranziția: fără CHEIE_SCRIERE în Cloudflare, cheia de citire scrie ca înainte (nimic nu se strică la publicare); / spune cheieScriere:false", async () => {
  const w = lume(false);
  assert.equal(cheieScrierePusa(w.env), false);
  assert.equal((await w.cere("/stopuri", "POST", CIT, C({ cuStop: ["INTC_US_EQ"] }))).status, 200);
  assert.equal((await w.cere("/simboluri", "POST", CIT, C({ simboluri: [{ s: "INTC" }] }))).status, 200);
  const r = await w.cere("/stopuri", "POST", SCR, C({ cuStop: [] })); assert.equal(r.status, 401); assert.match((await r.json()).error, /cheia de citire/);
  assert.deepEqual(await (await w.cere("/", "GET", null)).json(), { serviciu: "paznicul colectorului Crypto Radar", cheieScriere: false });
  assert.equal(cheieScrierePusa({ CHEIE_SCRIERE: "scurta" }), false, "un secret sub 20 de caractere nu contează ca pus");
});
await test("P3 · `la` cu peste 10 minute în viitor e refuzat (400, cu motivul); cu 9 minute trece; POST /poza prin fetch la fel", async () => {
  const w = lume(false);
  const r = await pozaScrie(w.env, C({ la: ACUM + LA_VIITOR_MAX_MS + 1000, t212: [] }), ACUM); assert.equal(r.status, 400); assert.match(r.corp.error, /viitor/); assert.equal(w.kv.has("poza"), false);
  assert.equal((await pozaScrie(w.env, C({ la: ACUM + 9 * 60000, t212: [] }), ACUM)).status, 200);
  const rr = await w.cere("/poza", "POST", TOK, C({ la: Date.now() + 3600000, t212: [] })); assert.equal(rr.status, 400);
});
await test("P2 · ETag-ul și pulsul: regexul pe capul textului e calea rapidă; o poză cu `la` / `turaLa` la coadă (altă ordine a câmpurilor) tot se citește (200 + ETag), nu 404", async () => {
  const laCoada = C({ t212: Array.from({ length: 40 }, (_, i) => ({ s: "X" + i, pret: i })), boti: [], simboluri: [], turaLa: ACUM - 45000, la: ACUM });
  assert.ok(laCoada.indexOf('"la"') > 300, "proba are `la` după 300 de caractere");
  assert.equal(laDinText(laCoada), String(ACUM)); assert.equal(turaDinText(laCoada), ACUM - 45000);
  assert.equal(laDinText('{"la":' + ACUM + ',"x":1}'), String(ACUM), "calea rapidă"); assert.equal(laDinText("{stricat"), null); assert.equal(laDinText(""), null); assert.equal(turaDinText(C({ la: ACUM })), null);
  const w = lume(false); await pozaScrie(w.env, laCoada, ACUM);
  const r = await pozaCiteste(w.env, null); assert.equal(r.status, 200); assert.equal(r.etag, '"' + ACUM + '"');
  assert.equal((await pozaCiteste(w.env, '"' + ACUM + '"')).status, 304);
});
await test("I-786 · contractul pozei: paznic/exemplu-poza.json e exact ce produce construiestePoza acum și are toate câmpurile pe care pagina Alerte le randează", () => {
  const pe = JSON.parse(citeste("paznic", "exemplu-poza.json"));
  assert.deepEqual(pe, JSON.parse(JSON.stringify(exemplu())), "regenerează: node scripts/exemplu-poza.mjs (și copiază-l în premarket_scanner.html/tools/)");
  assert.ok(fs.existsSync(FISIER));
  const cer = (o, chei, unde) => { for (const k of chei) assert.ok(k in o, unde + " fără „" + k + "”"); };
  cer(pe, ["la", "turaLa", "versiune", "colector", "radarUrl", "t212", "t212La", "t212Eroare", "boti", "simboluri", "salt", "saltCereri", "gol", "alerte"], "poza");
  cer(pe.t212[0], ["s", "t212", "buc", "mediu", "costLei", "pret", "prev", "la", "closes30", "pplLei", "pctLei", "pctPret", "plan", "stopT212", "trend", "pondere", "niv", "motive", "sfat", "insideri", "sursa", "sugestie"], "poziția");
  cer(pe.t212[0].plan, ["trailPct", "tinta", "stop", "max", "stopFix"], "planul"); cer(pe.t212[0].insideri, ["form4", "buys", "sells", "bp", "sp", "net", "verdict", "top", "n60"], "insiderii");
  cer(pe.t212[0].sugestie, ["stop", "tinta", "riscPct", "k", "trend", "proba"], "sugestia poziției");
  cer(pe.boti[0], ["id", "s", "m", "dir", "lev", "investit", "jos", "sus", "pret", "inGrid", "lichidarePct", "total", "perechi", "gridBrut", "pozitie", "comisioane", "zero", "plan", "niv", "motive", "sfat", "pret30", "la", "d24", "d24Ore", "grila", "zi"], "botul");
  cer(pe.simboluri[0], ["s", "nota", "sursa", "moneda", "pret", "prev", "closes30", "insideri", "rezultate", "analisti", "shortFloat", "sugestie"], "simbolul");
  cer(pe.simboluri[0].sugestie, ["intrare", "stop", "tinta", "riscPct", "k", "trend", "proba", "marime"], "sugestia simbolului");
  cer(pe.salt.randuri[0], ["simbol", "isin", "qty", "pretMediu", "moneda", "plata", "pret", "prev", "closes30", "rez", "cost", "val", "max", "de", "nume", "niv", "motive", "sfat", "sugestie", "mediuSimbol"], "rândul Salt");
  cer(pe.alerte[0], ["t", "grup", "sim", "src", "nivel", "titlu", "mesaj", "zgomot"], "alerta");
  assert.ok(pe.t212[1].costLei === null && pe.t212[1].pctLei === null && pe.t212[1].plan === null && pe.t212[1].niv === "iesi", "a doua poziție: cazurile cu null");
  assert.ok(pe.simboluri[1].sugestie && pe.simboluri[1].sugestie.intrare === null && pe.simboluri[1].sugestie.trend === "jos", "simbol cu trend în jos: fără intrare");
  assert.ok(C(pe).length < 100 * 1024);
});
await test("P3 · moneda de rezervă a simbolului vine din bursa lui: .SW nu mai e „€”, .L e „£”, .DE „€”, US „$”; colectorul o folosește în loc de regexul propriu", () => {
  assert.equal(monedaBursa("NESN.SW"), "$"); assert.equal(monedaBursa("SHEL.L"), "£"); assert.equal(monedaBursa("RHM.DE"), "€"); assert.equal(monedaBursa("INTC"), "$"); assert.equal(monedaBursa("MCp_EQ"), "€");
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /moneda: c \? c\.moneda : monedaBursa\(s\.s\)/); assert.doesNotMatch(col, /\/\\\.\(DE\|MU\|F\|PA\|AS\|MI\|SW\)\$\/\.test\(s\.s\)/);
  assert.match(col, /import \{[^}]*monedaBursa[^}]*\} from "\.\/lib\/poza\.mjs"/);
});
await test("P3 · app.js: #parola= DIFERITĂ de cea ținută pe dispozitiv întreabă (confirm) înainte s-o înlocuiască; aceeași sau prima nu întreabă", () => {
  const app = citeste("public", "app.js"), i = app.indexOf("const L=crLegaturaDin(location.hash);"), bloc = app.slice(i, i + 700);
  assert.ok(i > 0);
  assert.match(bloc, /if\(L\.parola\)\{const tinuta=/); assert.match(bloc, /tinuta===L\.parola\|\|confirm\("Linkul vine cu altă parolă a Radarului/); assert.match(bloc, /localStorage\.setItem\(APP_API_TOKEN_SESSION_KEY,L\.parola\)/);
  assert.doesNotMatch(bloc, /if\(L\.parola\)localStorage\.setItem/);
});
await test("versiunea ≥ v100.263 peste tot și nota CHE în BUILD_INFO; proba e în lanțul de test", () => {
  const P = JSON.parse(citeste("package.json")), ver = Number(P.version.split(".")[1]), V = "v100." + ver;
  assert.ok(ver >= 263, "versiunea " + V); assert.equal(P.version, "100." + ver + ".0");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, V); assert.ok(bi.badge.startsWith(V + " · ")); assert.match(String(bi.features.chei263), /CHEIE_SCRIERE/);
  const html = citeste("public", "index.html"); assert.equal(html.split(V).length - 1, 4);
  assert.ok(citeste("public", "sw.js").startsWith('const CACHE="crypto-radar-v100-' + ver + '";')); assert.ok(citeste("functions", "_shared", "versiune.js").includes('VERSIUNE = "' + V + '"'));
  assert.equal(P.scripts["test:v100263"], "node scripts/proba-v100263.mjs"); assert.match(P.scripts.test, /npm run test:v100263/);
});

console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
