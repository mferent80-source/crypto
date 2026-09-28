// Probele v100.6 - prețul botului LIVE (el, 28.09: „linia galbenă de sus nu încape și nicăieri nu se arată prețul live
// al botului; integrează-l și sus în bara galbenă și în altă parte”):
//   - public/lib/pret-viu.js (pur): mesajele WebSocket-ului public Pionex (TRADE / PING), „viu” = ceva în ultimul minut,
//     banda de sus pe bucăți, cu prețul imediat după nume
//   - app.js: socketul pe piața EXACTĂ a botului (JTO_USDT_PERP), reconectare, PONG; banda și capul Tabloului arată prețul
//   - CSS: banda nu mai e tăiată la 520 px
// Rulare: node scripts/proba-pret-viu.mjs
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = citeste("../public/lib/pret-viu.js");
const PV = SRC ? new Function(`${SRC}; return PretViu;`)() : null;
const APP = citeste("../public/app.js"), HTML = citeste("../public/index.html"), CSS = citeste("../public/app.css"), SW = citeste("../public/sw.js"), HDR = citeste("../public/_headers");

let teste = 0, picate = 0;
function test(nume, fn) { teste++; try { fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }

const S = "JTO_USDT_PERP", ACUM = 1_790_602_710_000;
const BOT = { baza: "JTO.PERP", directie: "long", levier: 5, profitTotal: -12.04, distantaLichidarePct: 20.5, pretCurent: 0.5702 };
const trade = (p, t, sym = S) => JSON.stringify({ topic: "TRADE", symbol: sym, data: [{ symbol: sym, price: p, size: "1", side: "BUY", timestamp: t }], timestamp: t });

console.log("\nV100.6 · prețul botului live · proba\n");

test("modulul PretViu există", () => assert.ok(PV, "public/lib/pret-viu.js lipsește"));
test("PING → ping (nu e preț)", () => assert.deepEqual(PV.mesaj('{"op":"PING","timestamp":1}', S), { tip: "ping" }));
test("TRADE pe simbolul botului → prețul, textul exact de la Pionex", () => { const m = PV.mesaj(trade("0.5708", ACUM), S); assert.equal(m.tip, "pret"); assert.equal(m.pret, 0.5708); assert.equal(m.text, "0.5708"); assert.equal(m.la, ACUM); });
test("TRADE pe ALT simbol se ignoră (nu minte pe botul tău)", () => assert.equal(PV.mesaj(trade("64000", ACUM, "BTC_USDT_PERP"), S), null));
test("lot cu mai multe tranzacții → cea mai nouă", () => {
  const m = PV.mesaj(JSON.stringify({ topic: "TRADE", symbol: S, data: [{ symbol: S, price: "0.5710", timestamp: ACUM }, { symbol: S, price: "0.5701", timestamp: ACUM - 500 }] }), S);
  assert.equal(m.pret, 0.571);
});
test("gunoi / preț 0 / preț lipsă → null, nu 0", () => { assert.equal(PV.mesaj("nu e json", S), null); assert.equal(PV.mesaj(trade("0", ACUM), S), null); assert.equal(PV.mesaj(trade("", ACUM), S), null); });
test("viu = ceva primit în ultimul minut", () => { assert.equal(PV.eViu({ pret: 0.57, primitLa: ACUM - 59000 }, ACUM), true); assert.equal(PV.eViu({ pret: 0.57, primitLa: ACUM - 61000 }, ACUM), false); assert.equal(PV.eViu(null, ACUM), false); });
test("direcția față de tranzacția de dinainte", () => { assert.equal(PV.directia(0.57, 0.571), "sus"); assert.equal(PV.directia(0.57, 0.569), "jos"); assert.equal(PV.directia(0.57, 0.57), "egal"); assert.equal(PV.directia(null, 0.57), null); });
test("banda: prețul live stă imediat după nume, cu săgeata", () => {
  const r = PV.banda({ bot: BOT, pretViu: { pret: 0.5708, text: "0.5708", primitLa: ACUM - 1000, dir: "sus" }, acum: ACUM, distanteGrid: { inGrid: true, josPct: 0.009, susPct: 0.017 }, piata: { ton: "bine" } });
  assert.deepEqual(r.parti.map((p) => p.k), ["nume", "pret", "total", "lich", "grid", "piata"]);
  assert.equal(r.parti[1].t, "0.5708 \u25b2"); assert.equal(r.parti[1].viu, true);
  assert.equal(r.parti.map((p) => p.t).join(" · "), "JTO long 5× · 0.5708 ▲ · total -12.04 USDT · lichidare 20.5% · grid ↓0.9% ↑1.7% · piața: cu botul");
  assert.equal(r.clasa, "tbWarn");
});
test("banda fără live: prețul din citirea botului, fără săgeată, spus pe față", () => {
  const r = PV.banda({ bot: BOT, pretViu: { pret: 0.5708, text: "0.5708", primitLa: ACUM - 120000, dir: "sus" }, botLa: ACUM - 5000, acum: ACUM });
  assert.equal(r.parti[1].t, "0.5702"); assert.equal(r.parti[1].viu, false); assert.match(r.parti[1].title, /citirea botului/);
});
test("banda fără niciun preț: nu inventează bucata de preț", () => { const r = PV.banda({ bot: { ...BOT, pretCurent: null }, acum: ACUM }); assert.ok(!r.parti.some((p) => p.k === "pret")); });

// legătura în aplicație
test("index.html încarcă lib/pret-viu.js și sw.js îl ține în precache", () => { assert.match(HTML, /<script src="\/lib\/pret-viu\.js/); assert.match(SW, /"\/lib\/pret-viu\.js"/); });
test("CSP NU deschide ws.pionex.com (browserul e refuzat cu 403; merge prin releu, pe 'self')", () => assert.doesNotMatch(HDR, /ws\.pionex\.com/));
test("app.js se leagă la releul de acasă /api/pret-viu și se reconectează", () => {
  assert.match(APP, /\/api\/pret-viu\?simbol="\+encodeURIComponent\(simbol\)/); assert.doesNotMatch(APP, /ws\.pionex\.com/); assert.match(APP, /pvStare\.timeout=setTimeout/);
});
test("banda de sus se compune din PretViu.banda și renunță întâi la „piața”, apoi la „grid” când nu încape", () => {
  assert.match(APP, /PretViu\.banda\(/); assert.match(APP, /botStripPret/); assert.match(APP, /\["piata","grid"\]\.forEach/);
});
test("capul Tabloului are prețul live", () => { assert.match(HTML, /id="tbPretViu"/); assert.match(APP, /tbPretViuVal/); });
test("banda nu mai e tăiată la 520 px", () => { assert.doesNotMatch(CSS, /\.botStrip\{[^}]*max-width:520px/); });

// releul (functions/api/pret-viu.js), cu fetch / WebSocketPair / Response simulate
class FalsWS { constructor() { this.l = {}; this.trimise = []; this.inchis = false; } accept() { this.acceptat = true; } addEventListener(t, f) { (this.l[t] ||= []).push(f); } send(x) { this.trimise.push(x); } close() { this.inchis = true; } da(t, d) { (this.l[t] || []).forEach((f) => f(d)); } }
const vechi = { fetch: globalThis.fetch, Response: globalThis.Response, WebSocketPair: globalThis.WebSocketPair };
let sus = null, antetSus = null, perechi = [];
globalThis.fetch = async (u, o) => { antetSus = { u, h: o && o.headers }; sus = new FalsWS(); return { status: 101, webSocket: sus }; };
globalThis.WebSocketPair = function () { const p = { 0: new FalsWS(), 1: new FalsWS() }; perechi.push(p); return p; };
globalThis.Response = class { constructor(corp, i) { this.corp = corp; this.status = i.status; this.webSocket = i.webSocket; } };
const cerere = (simbol, antete) => ({ url: "http://127.0.0.1:8788/api/pret-viu?simbol=" + simbol, headers: new Headers(antete) });
const BUN = { upgrade: "websocket", origin: "http://127.0.0.1:8788" };
try {
  const { onRequestGet } = await import(new URL("../functions/api/pret-viu.js", import.meta.url));
  const r426 = await onRequestGet({ request: cerere(S, { origin: BUN.origin }) });
  const r403 = await onRequestGet({ request: cerere(S, { upgrade: "websocket", origin: "https://altcineva.ro" }) });
  const r403b = await onRequestGet({ request: cerere(S, { upgrade: "websocket" }) });
  const r400 = await onRequestGet({ request: cerere("JTO_USDT_PERP%22%7D", BUN) });
  const nrFetch = sus ? 1 : 0;
  const r101 = await onRequestGet({ request: cerere(S, BUN) });
  const catreOm = perechi.at(-1)[1];
  test("releu: fără upgrade → 426; Origin străin sau lipsă → 403; simbol ciudat → 400; niciunul nu sună la Pionex", () => {
    assert.equal(r426.status, 426); assert.equal(r403.status, 403); assert.equal(r403b.status, 403); assert.equal(r400.status, 400); assert.equal(nrFetch, 0);
  });
  test("releu: se leagă la Pionex FĂRĂ Origin și abonează exact simbolul botului", () => {
    assert.equal(r101.status, 101); assert.ok(r101.webSocket); assert.match(antetSus.u, /ws\.pionex\.com\/wsPub/);
    assert.ok(!Object.keys(antetSus.h || {}).some((k) => k.toLowerCase() === "origin")); assert.ok(sus.acceptat && catreOm.acceptat);
    assert.deepEqual(JSON.parse(sus.trimise[0]), { op: "SUBSCRIBE", topic: "TRADE", symbol: S });
  });
  test("releu: răspunde EL la PING (PONG spre Pionex), nu-l trimite paginii", () => {
    sus.da("message", { data: '{"op":"PING","timestamp":1}' });
    assert.equal(JSON.parse(sus.trimise.at(-1)).op, "PONG"); assert.equal(catreOm.trimise.length, 0);
  });
  test("releu: trimite paginii DOAR tranzacțiile simbolului cerut", () => {
    sus.da("message", { data: trade("64000", ACUM, "BTC_USDT_PERP") }); assert.equal(catreOm.trimise.length, 0);
    sus.da("message", { data: trade("0.5708", ACUM) }); assert.equal(catreOm.trimise.length, 1); assert.equal(PV.mesaj(catreOm.trimise[0], S).pret, 0.5708);
  });
  test("releu: cadrele BINARE de la Pionex (așa vin) se decodează: PING primește PONG, prețul ajunge ca text", () => {
    const bin = (x) => new TextEncoder().encode(x).buffer, n0 = sus.trimise.length;
    sus.da("message", { data: bin('{"op":"PING","timestamp":2}') }); assert.equal(sus.trimise.length, n0 + 1); assert.equal(JSON.parse(sus.trimise.at(-1)).op, "PONG");
    sus.da("message", { data: bin(trade("0.5711", ACUM)) }); assert.equal(typeof catreOm.trimise.at(-1), "string"); assert.equal(PV.mesaj(catreOm.trimise.at(-1), S).pret, 0.5711);
  });
  test("releu: Pionex închide → se închide și spre pagină (pagina se reconectează singură)", () => { sus.da("close", {}); assert.ok(catreOm.inchis); });
} catch (e) { test("releul se încarcă", () => { throw e; }); }
finally { Object.assign(globalThis, vechi); }

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}\n`);
process.exit(picate ? 1 : 0);
