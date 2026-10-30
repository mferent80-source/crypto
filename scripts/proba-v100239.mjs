// Proba v100.239 (21.10, el: „si partea de code si de design”): linia de măsură doar pe o zi completă,
// ziua fișierului pe rândul de export, semnul de finanțare pe cont:zile, simbolurile pliate lângă număr.
// Funcția masuraFranei tot întoarce fraza de lipsă. Fără prag nou. Fără rută de ordin.
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
ctx.escapeHtml = (x) => String(x ?? "");
ctx.setInterval = () => 0;
ctx.setTimeout = () => 0;
ctx.document = {
  getElementById() { return null; },
  addEventListener() {},
  querySelector() { return null; },
  body: { classList: { contains() { return false; }, add() {}, remove() {}, toggle() {} } }
};
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "acasa.js"), ctx);
vm.runInContext(citeste("public", "lib", "cont-ecran.js"), ctx);
vm.runInContext(citeste("public", "lib", "acasa-ecran.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.239 · ZI · proba\n");

const acasa = citeste("public", "lib", "acasa.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const cont = citeste("public", "lib", "cont-ecran.js");
const col = citeste("scripts", "colector.mjs");
const tc = citeste("scripts", "lib", "tura-cont.mjs");
const api = citeste("functions", "api", "istoric-bot.js");
const idx = citeste("public", "index.html");
const css = citeste("public", "app.css");
const ziL = { z: "2026-10-21", pauza: false, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } };
const LIPSA = "N-am aflat: zilele vechi nu au pauza, VaR-ul și evenimentul salvate.";

await test("funcția tot spune lipsa; ecranul o omite până există o zi completă", () => {
  const gol = AC.masuraFranei([], [{ z: "2026-10-21", valoare: 10 }]);
  assert.equal(gol.complete, 0);
  assert.equal(gol.text, LIPSA);
  assert.match(acasa, /var lipsa = "N-am aflat: zilele vechi nu au pauza, VaR-ul și evenimentul salvate\."/);
  ctx.acFranaZileCitite = () => [];
  ctx.acasa.d = { contZile: { zile: [] } };
  assert.equal(ctx.acMasuraLin(), "");
  assert.equal(ctx.ciMasuraHtml({ masura: gol }), "");
  assert.equal(ctx.ciMasuraHtml({}), "");
  ctx.acFranaZileCitite = () => [ziL];
  const lin = ctx.acMasuraLin();
  assert.match(lin, /<p class="acMut">/);
  assert.match(lin, /n-ar fi zis „nu porni” în nicio zi/);
  assert.doesNotMatch(lin, /N-am aflat: zilele vechi/);
  const sec = ctx.ciMasuraHtml({ masura: AC.masuraFranei([], [ziL]) });
  assert.match(sec, /Măsura frânei pe cartea închisă/);
  assert.match(sec, /n-ar fi zis „nu porni” în nicio zi/);
  assert.doesNotMatch(sec, /N-am aflat: zilele vechi/);
  assert.match(ae, /m\.complete === 0/);
  assert.match(cont, /m\.complete === 0/);
});

await test("rândul de export numește ziua României a fișierului și nu inventează una", () => {
  const la = Date.parse("2026-10-21T09:00:00+03:00");
  const cu = ctx.ciExportHtml({ export: { la, ok: true, nePotrivit: false } });
  assert.match(cu, /A doua citire se potrivește cu cantitatea din cont\. Fișierul e citit pe 21\.10\.2026, ora României\./);
  const noapte = Date.parse("2026-10-20T22:30:00Z");
  const peste = ctx.ciExportHtml({ export: { la: noapte, ok: false, eroare: "antet necunoscut" } });
  assert.match(peste, /21\.10\.2026/);
  assert.doesNotMatch(peste, /20\.10\.2026/);
  const fara = ctx.ciExportHtml({ export: { ok: true, nePotrivit: false, randuri: [{ ticker: "AAPL", api: 1, jurnal: 1, export: 1, potrivit: true }] } });
  assert.doesNotMatch(fara, /\d{2}\.\d{2}\.\d{4}/);
  assert.match(fara, /1 simbol se potrivește/);
  assert.equal(ctx.ciExportHtml({}).includes("Fișierul e citit"), false);
  assert.doesNotMatch(cont, /exportNePotrivit\s*:/);
  assert.doesNotMatch(ae, /action=contZi"/);
});

await test("simbolurile stau pliate lângă număr; gura tot le spune pe rând", () => {
  const rc = { t212: { ok: false, verificate: 4, abateri: [
    { ticker: "AAPL_US_EQ", broker: 10, radar: 3, motiv: "cantitate" },
    { ticker: "MSFT_US_EQ", broker: 2, radar: 1, motiv: "cantitate" }
  ] } };
  const h = ctx.ciHtml({ la: Date.now(), valoare: { total: 1000, complet: true, pionex: 1, t212: 1, salt: 0 }, risc: {}, reconciliere: rc }, { masura: AC.masuraFranei([], [ziL]), acum: Date.now() });
  assert.match(h, /Aș verifica în T212 AAPL, MSFT/);
  assert.match(h, /2 abateri/);
  assert.match(h, /4 simboluri verificate/);
  const iDet = h.indexOf('<details class="ciMetoda"><summary>Simbolurile</summary>');
  assert.ok(iDet > 0);
  assert.doesNotMatch(h.slice(iDet, iDet + 80), / open/);
  const det = h.slice(iDet, h.indexOf("</details>", iDet));
  assert.match(det, /AAPL: cont 10, jurnal 3/);
  assert.match(det, /MSFT: cont 2, jurnal 1/);
  const inainte = h.slice(h.indexOf("Se potrivește cu brokerii"), iDet);
  assert.doesNotMatch(inainte, /AAPL|MSFT/);
  const okH = ctx.ciHtml({ la: Date.now(), valoare: { total: 1000, complet: true }, risc: {}, reconciliere: { t212: { ok: true, verificate: 3, abateri: [] } } }, { masura: AC.masuraFranei([], [ziL]), acum: Date.now() });
  assert.match(okH, /3 simboluri verificate/);
  assert.doesNotMatch(okH, /<summary>Simbolurile<\/summary>/);
  assert.doesNotMatch(cont, /GridPlan/);
  const ultima = css.trimEnd().split("\n").pop();
  assert.match(ultima, /#topLive\{display:none!important\}/);
});

await test("cont:zile ține long sau short doar după citirea reușită", async () => {
  const acum = Date.parse("2026-10-21T10:00:00Z");
  const raport = { valoare: { total: 50000 }, risc: { var95: 1000 } };
  const lung = { ton: "atentie", mediana: 0.0002 };
  const d = {
    jurnal() {},
    funding: lung,
    cere: async (url) => {
      if (String(url).includes("calendar")) return { evenimente: [{ titlu: "CPI", mare: true, t: acum }] };
      if (String(url).includes("botiInchisi")) return { boti: [] };
      if (String(url).includes("scor-sezon")) return { sezon: null };
      throw new Error("alta");
    },
    Acasa: { calendar: (ev) => ({ urmatoare: ev || [] }), fundingAtentie: AC.fundingAtentie },
    ScorSezon: { calc: () => ({ pauza: true, serie: { n: 3 } }) },
    StatisticaTrade: { dinPionex: () => [], dinPionexAlte: () => [] },
    JurnalTrade: { din: () => [], alte: () => [] }
  };
  const fr = await campuriZiFrana(d, acum, raport);
  assert.equal(fr.fundingAtentie, "long");
  assert.equal(fr.la, acum);
  assert.equal(fr.pauza, true);
  const scurt = await campuriZiFrana({ ...d, funding: () => ({ ton: "atentie", mediana: -0.0002 }) }, acum, raport);
  assert.equal(scurt.fundingAtentie, "short");
  const linistit = await campuriZiFrana({ ...d, funding: { ton: "neutru", mediana: 0.0002 } }, acum, raport);
  assert.equal(linistit.fundingAtentie, undefined);
  assert.equal(linistit.pauza, true);
  const gol = await campuriZiFrana({ ...d, funding: null }, acum, raport);
  assert.equal(gol.fundingAtentie, undefined);
  const picat = await campuriZiFrana({ ...d, cere: async () => { throw new Error("picat"); } }, acum, raport);
  assert.equal(picat.fundingAtentie, undefined);
  assert.equal(picat.pauza, undefined);
  assert.equal(picat.la, undefined);
  assert.notEqual(picat.pauza, false);
  const bloc = tc.slice(tc.indexOf('if (typeof pauza === "boolean"'), tc.indexOf("else delete o.pauzaN"));
  assert.match(bloc, /o\.fundingAtentie = semn/);
  const iZi = api.indexOf('if(action==="contZi")');
  const buc = api.slice(iZi, iZi + 1800);
  assert.match(buc, /corp\.fundingAtentie==="long"\|\|corp\.fundingAtentie==="short"/);
  assert.doesNotMatch(buc, /exportNePotrivit/);
  const apel = col.slice(col.indexOf("async function turaContColector"), col.indexOf("const verdicteStare"));
  assert.match(apel, /funding: \(\) => \{ const p = meta\(\)\.piata/);
  const mvCol = col.match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/);
  assert.ok(mvCol && Number(mvCol[1]) >= 136);
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`);
  let ip = 0;
  const h = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://ex.test", "cf-connecting-ip": "10.239.1." + (++ip) });
  const post = async (c) => (await m.onRequestPost({ request: new Request("https://ex.test/api/istoric-bot?action=contZi", { method: "POST", headers: h(), body: JSON.stringify(c) }), env })).status;
  const get = async () => JSON.parse(await (await m.onRequestGet({ request: new Request("https://ex.test/api/istoric-bot?action=contZile", { headers: h() }), env })).text());
  assert.equal(await post({ z: "2026-10-21", valoare: 50000, pauza: true, raportStare: "ok", eveniment: "", fundingAtentie: "short", exportNePotrivit: true }), 200);
  const z = (await get()).zile[0];
  assert.equal(z.fundingAtentie, "short");
  assert.equal(z.exportNePotrivit, undefined);
  assert.equal(await post({ z: "2026-10-20", valoare: 48000, fundingAtentie: "" }), 200);
  assert.equal((await get()).zile.find((x) => x.z === "2026-10-20").fundingAtentie, undefined);
  assert.equal(await post({ z: "2026-10-19", valoare: 47000, fundingAtentie: "lung" }), 200);
  assert.equal((await get()).zile.find((x) => x.z === "2026-10-19").fundingAtentie, undefined);
  assert.equal(await post({ z: "2026-10-18", valoare: 46000, pauza: false, raportStare: "ok", eveniment: "" }), 200);
  const faraSemn = (await get()).zile.find((x) => x.z === "2026-10-18");
  assert.equal(faraSemn.fundingAtentie, undefined);
  assert.equal(faraSemn.pauza, false);
});

await test("versiunea de la v100.239 în sus, colectorul din fișier v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 239, P.version);   /* v100.240: insigna live nu mai e ZI */
  assert.equal(P.scripts["test:v100239"], "node scripts/proba-v100239.mjs");
  assert.equal((P.scripts.test.match(/test:v100239/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100238/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100239"], /npm run test:v100239/);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).engineContract, "54.1");
  const mv = (citeste("scripts", "colector.mjs").match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/) || [])[1];
  assert.ok(Number(mv) >= 136, mv);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
