// Proba v100.234 (21.10, el: „fa idei”): ziua pozei, tabelul doar cu abateri,
// o linie de măsură pe cardul crypto, pauza și evenimentul pe cont:zile.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { campuriZiFrana } from "./lib/tura-cont.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "acasa.js"), ctx);
vm.runInContext(citeste("public", "lib", "cont-ecran.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.234 · POZĂ · proba\n");

const acasa = citeste("public", "lib", "acasa.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const cont = citeste("public", "lib", "cont-ecran.js");
const col = citeste("scripts", "colector.mjs");
const tc = citeste("scripts", "lib", "tura-cont.mjs");
const api = citeste("functions", "api", "istoric-bot.js");
const idx = citeste("public", "index.html");

await test("poza numește ziua; o zi liniștită nu e istoric gol", () => {
  const gol = AC.masuraFranei([], [{ z: "2026-10-21", valoare: 10 }]);
  assert.equal(gol.aflat, false);
  assert.match(gol.text, /^N-am aflat: zilele vechi nu au pauza/);
  assert.doesNotMatch(gol.text, /Frâna de azi/);
  const linistita = { z: "2026-10-21", pauza: false, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } };
  const zero = AC.masuraFranei([], [linistita]);
  assert.equal(zero.schimbate, 0);
  assert.match(zero.text, /^Frâna de azi, pusă pe zilele salvate \(21\.10\.2026\): n-ar fi zis „nu porni” în nicio zi\./);
  assert.doesNotMatch(zero.text, /^N-am aflat/);
  const zece = Array.from({ length: 10 }, (_, i) => ({ z: "2026-09-" + String(i + 1).padStart(2, "0"), pauza: true, pauzaN: 3, raportStare: "ok", eveniment: "" }));
  const destul = AC.masuraFranei([], zece);
  assert.match(destul.text, /zilele salvate \(01\.09\.2026 – 10\.09\.2026\): în 10 zile din 10 ar fi zis „nu porni”/);
  assert.doesNotMatch(destul.text, /Prea puține zile ca să tragem o concluzie/);
  const ms = acasa.slice(acasa.indexOf("function masuraFranei"), acasa.indexOf("// socoteala alertelor"));
  assert.doesNotMatch(ms, /0\.04|yahoo|Obiceiuri|franaIstoric/);
});

await test("zilele din browser și cele din KV se unesc fără dublură", () => {
  const loc = [{ z: "2026-10-21", pauza: true, raportStare: "ok", eveniment: "", exportNePotrivit: true }];
  const kv = [{ z: "2026-10-21", valoare: 1 }, { z: "2026-10-20", pauza: false, raportStare: "ok", eveniment: "" }];
  const u = AC.unesteZileFrana(loc, kv);
  assert.equal(u.length, 2);
  assert.equal(u[0].z, "2026-10-20");
  assert.equal(u[1].exportNePotrivit, true);
  const doarKv = AC.unesteZileFrana([], kv);
  assert.equal(doarKv.length, 2);
  assert.equal(AC.masuraFranei([], doarKv).complete, 1);
});

await test("tabelul arată abaterea și numără potrivirile", () => {
  const h = ctx.ciExportHtml({ export: { ok: true, nePotrivit: true, randuri: [
    { ticker: "AAPL", api: 10, jurnal: 3, export: 10, potrivit: true },
    { ticker: "MSFT", api: 2, jurnal: null, export: 7, potrivit: false }
  ] } });
  assert.match(h, /1 simbol se potrivește/);
  assert.match(h, />MSFT</);
  assert.doesNotMatch(h, />AAPL</);
  const toate = ctx.ciExportHtml({ export: { ok: true, nePotrivit: false, randuri: [{ ticker: "AAPL", api: 10, jurnal: 10, export: 10, potrivit: true }] } });
  assert.match(toate, /1 simbol se potrivește/);
  assert.doesNotMatch(toate, /<th>API<\/th>/);
  assert.match(cont, /r\.potrivit !== true/);
  assert.match(cont, /<th>API<\/th><th>Jurnal<\/th><th>Export<\/th>/);
});

await test("linia de măsură stă pe cardul crypto și nu intră în verb", () => {
  assert.match(ae, /function acMasuraLin/);
  assert.match(ae, /acMasuraLin\(\)/);
  const verb = ae.slice(ae.indexOf("function acFraneaza"), ae.indexOf("function acMasuraLin"));
  assert.doesNotMatch(verb, /masuraFranei|acMasuraLin/);
  const crypto = ae.slice(ae.indexOf('acasaVerd($("acVremeCrypto")'), ae.indexOf('acasaVerd($("acVremeBursa")'));
  assert.match(crypto, /acMasuraLin\(\)/);
  assert.match(ae, /action=contZile/);
  assert.match(cont, /Acasa\.unesteZileFrana/);
  assert.doesNotMatch(ae, /<style/);
});

await test("cont:zile ține pauza, VaR-ul și evenimentul doar când ambele citiri au reușit", async () => {
  const acum = Date.parse("2026-10-21T10:00:00Z");
  const raport = { valoare: { total: 50000 }, risc: { var95: 1000 } };
  const d = {
    jurnal() {},
    cere: async (url) => {
      if (String(url).includes("calendar")) return { evenimente: [{ titlu: "CPI", mare: true, t: acum }] };
      if (String(url).includes("botiInchisi")) return { boti: [] };
      if (String(url).includes("scor-sezon")) return { sezon: null };
      throw new Error("alta");
    },
    Acasa: { calendar: (ev) => ({ urmatoare: ev || [] }) },
    ScorSezon: { calc: () => ({ pauza: true, serie: { n: 3 } }) },
    StatisticaTrade: { dinPionex: () => [], dinPionexAlte: () => [] },
    JurnalTrade: { din: () => [], alte: () => [] }
  };
  const fr = await campuriZiFrana(d, acum, raport);
  assert.equal(fr.pauza, true);
  assert.equal(fr.pauzaN, 3);
  assert.equal(fr.eveniment, "CPI");
  assert.equal(fr.raportStare, "ok");
  assert.equal(fr.la, acum);
  assert.equal(fr.raport.risc.var95, 1000);
  assert.equal(fr.raport.valoare.total, 50000);
  const picat = await campuriZiFrana({ ...d, cere: async () => { throw new Error("picat"); } }, acum, raport);
  assert.equal(picat.pauza, undefined);
  assert.equal(picat.raportStare, undefined);
  assert.equal(picat.la, undefined);
  assert.equal(picat.raport.valoare.total, 50000);
  const fara = await campuriZiFrana({ cere: d.cere, jurnal() {} }, acum, raport);
  assert.equal(fara.raportStare, undefined);
  assert.equal(fara.la, undefined);
  assert.match(tc, /campuriZiFrana/);
  assert.match(col, /Acasa, ScorSezon, StatisticaTrade/);
  assert.doesNotMatch(col, /exportNePotrivit/);
  assert.match(api, /row\.pauza=corp\.pauza/);
  assert.doesNotMatch(api.slice(api.indexOf('action==="contZi"'), api.indexOf('action==="risc"')), /exportNePotrivit/);
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`);
  let ip = 0;
  const h = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://ex.test", "cf-connecting-ip": "10.234.1." + (++ip) });
  const post = async (c) => (await m.onRequestPost({ request: new Request("https://ex.test/api/istoric-bot?action=contZi", { method: "POST", headers: h(), body: JSON.stringify(c) }), env })).status;
  const get = async () => JSON.parse(await (await m.onRequestGet({ request: new Request("https://ex.test/api/istoric-bot?action=contZile", { headers: h() }), env })).text());
  assert.equal(await post({ z: "2026-10-21", valoare: 50000, complet: true, pauza: true, pauzaN: 3, raportStare: "ok", eveniment: "CPI", raport: { valoare: { total: 50000 }, risc: { var95: 1000 } }, exportNePotrivit: true }), 200);
  const z = (await get()).zile;
  assert.equal(z.length, 1);
  assert.equal(z[0].pauza, true);
  assert.equal(z[0].eveniment, "CPI");
  assert.equal(z[0].raport.risc.var95, 1000);
  assert.equal(z[0].exportNePotrivit, undefined);
  assert.equal(z[0].la, undefined);
  assert.equal(await post({ z: "2026-10-19", valoare: 47000, la: acum, pauza: false, raportStare: "ok", eveniment: "" }), 200);
  const cuLa = (await get()).zile.find((x) => x.z === "2026-10-19");
  assert.equal(cuLa.la, acum);
  assert.equal(cuLa.pauza, false);
  assert.equal(await post({ z: "2026-10-20", valoare: 48000, raportStare: "aiurea" }), 200);
  const vechi = (await get()).zile.find((x) => x.z === "2026-10-20");
  assert.equal(vechi.valoare, 48000);
  assert.equal(vechi.pauza, undefined);
  assert.equal(vechi.raportStare, undefined);
});

await test("versiunea de la v100.234 în sus", () => {
  const P = JSON.parse(citeste("package.json"));
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 234);
  assert.equal(P.scripts["test:v100234"], "node scripts/proba-v100234.mjs");
  assert.equal((P.scripts.test.match(/test:v100234/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100233/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100234"], /npm run test:v100234/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(idx, new RegExp('id="sideVersiune"[^>]*>v100\\.' + minor + " · "));
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + minor + '"'));
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100." + minor);
  assert.match(info.badge, new RegExp("^v100\\." + minor + " · "));
  assert.equal(info.engineContract, "54.1");
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.(13[2-9]|1[4-9]\d)"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
