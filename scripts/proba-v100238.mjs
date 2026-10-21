// Proba v100.238 (21.10, el: „fa tot,demo,idei tot”): bara, ora pozei, zilele liniștite,
// finanțarea sub botul deschis, la pe cont:zile. Fără prag nou. Fără rută de ordin.
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
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.238 · BARĂ · proba\n");

const app = citeste("public", "app.js");
const css = citeste("public", "app.css");
const idx = citeste("public", "index.html");
const acasa = citeste("public", "lib", "acasa.js");
const api = citeste("functions", "api", "istoric-bot.js");
const tc = citeste("scripts", "lib", "tura-cont.mjs");
const col = citeste("scripts", "colector.mjs");
const r = app.slice(app.indexOf("function renderGrid("), app.indexOf("function tbPanouVizibil("));
const ASCII = /(^|[\s(·:])-\d/;
const linistita = (z) => ({ z, pauza: false, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } });
const schimbata = (z, la) => ({ z, pauza: true, pauzaN: 3, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } }, ...(la ? { la } : {}) });
const ziua = (n, prefix) => prefix + "-" + String(n).padStart(2, "0");

await test("bara ține Direcția cu verdictul; trendul și ferestrele rămân dedesubt", () => {
  const bara = r.indexOf('class="grBara"');
  const dir = r.indexOf("<h4>Direcția</h4>");
  const verd = r.indexOf('class="grVerdict ');
  const trend = r.indexOf("grTrendTfHtml(f)");
  const fer = r.indexOf('id="grPlanVar"');
  assert.ok(bara >= 0 && bara < dir && dir < verd && verd < trend && trend < fer);
  assert.match(r, /class="tbRand grTrendRand"/);
  const intre = r.slice(verd, trend);
  assert.match(intre, /<\/div><\/div>/);
  assert.doesNotMatch(intre, /grPlanVar|grAlte|Busola/);
  assert.match(css, /#gridset \.grBara\{position:sticky;top:var\(--grSus,72px\)/);
  assert.match(css, /#gridset \.grBara \.grVerdict\{position:static/);
  assert.match(css, /\.pzDemo #grFisa>\.grBara\{order:10\}/);
  assert.match(css, /\.pzDemo #grFisa>\.grTrendRand\{order:15\}/);
  assert.match(css, /\.pzDemo #grFisa>#grPlanVar\{order:30\}/);
  assert.match(css, /\.pzDemo #grFisa>\*\{order:65\}/);
  assert.ok(css.includes(".pzDemo #grFisa>#grAlte+p{order:61}"));
  assert.match(app, /Aș porni/);
  assert.doesNotMatch(r.slice(r.indexOf('class="grVerdict '), r.indexOf("grTrendTfHtml(f)")), /position:sticky/);
});

await test("măsura spune ora României când la există și nu o inventează", () => {
  const la = Date.parse("2026-10-21T09:00:00+03:00");
  const cu = AC.masuraFranei([], [schimbata("2026-10-21", la)]);
  assert.match(cu.text, /Ora pozei, ora României: 09:00\./);
  assert.match(cu.text, /Zilele astea n-au ora pozei|După ora pozei/);
  assert.doesNotMatch(cu.text, /Zilele astea n-au ora pozei/);
  assert.doesNotMatch(cu.text, ASCII);
  const fara = AC.masuraFranei([], [schimbata("2026-10-21")]);
  assert.match(fara.text, /Zilele astea n-au ora pozei\./);
  assert.doesNotMatch(fara.text, /Ora pozei, ora României|Orele pozei/);
  assert.doesNotMatch(fara.text, /\d{2}:\d{2}/);
  const la2 = Date.parse("2026-10-20T08:15:00+03:00");
  const doua = AC.masuraFranei([], [schimbata("2026-10-20", la2), schimbata("2026-10-21", la)]);
  assert.match(doua.text, /Orele pozei, ora României: 20\.10\.2026 08:15, 21\.10\.2026 09:00\./);
  assert.match(acasa, /timeZone: "Europe\/Bucharest"/);
});

await test("partea liniștită își spune zilele; sub 10 zile eșantionul stă acolo; suma de 10 boți rămâne", () => {
  const p = Date.parse("2026-10-20T12:00:00+03:00");
  const zece = Array.from({ length: 10 }, () => ({ pornit: p, baza: 12.5, rezultat: -1.5 }));
  const destul = AC.masuraFranei(zece, [linistita("2026-10-20")]);
  assert.match(destul.text, /Când gura ar fi rămas „Aș porni”: suma pusă 125,00, rezultatul adunat −15,00\./);
  assert.match(destul.text, /Partea liniștită: 1 zi\./);
  assert.match(destul.text, /Eșantion insuficient pe zilele liniștite/);
  const sch = Array.from({ length: 10 }, (_, i) => schimbata(ziua(i + 1, "2026-09")));
  const lin = Array.from({ length: 10 }, (_, i) => linistita(ziua(i + 1, "2026-08")));
  const mult = AC.masuraFranei(zece.map((b) => ({ ...b, pornit: Date.parse("2026-08-01T12:00:00+03:00") })), sch.concat(lin));
  assert.match(mult.text, /Când gura ar fi rămas „Aș porni”: suma pusă 125,00, rezultatul adunat −15,00\./);
  assert.match(mult.text, /Partea liniștită: 10 zile\./);
  assert.doesNotMatch(mult.text, /Eșantion insuficient/);
  const putine = AC.masuraFranei([], sch.concat([linistita("2026-08-01"), linistita("2026-08-02"), linistita("2026-08-03")]));
  assert.match(putine.text, /Când gura ar fi rămas „Aș porni”: niciun bot\./);
  assert.match(putine.text, /Partea liniștită: 3 zile\./);
  assert.match(putine.text, /Eșantion insuficient pe zilele liniștite/);
  assert.doesNotMatch(putine.text, /Când gura ar fi rămas „Aș porni”: \d/);
  const golSch = AC.masuraFranei([], sch);
  assert.match(golSch.text, /Nicio zi salvată în care gura ar fi rămas „Aș porni”\./);
  assert.doesNotMatch(golSch.text, /Partea liniștită/);
  assert.doesNotMatch(golSch.text, /Eșantion insuficient/);
  assert.match(destul.text, /nu arată că frâna face bani/);
  assert.doesNotMatch(mult.text, ASCII);
});

await test("finanțarea de sub bot e felia deja din net, cu partea care plătește", () => {
  const ban = app.slice(app.indexOf("function botiNr("), app.indexOf("function botiSuma("));
  const fin = app.slice(app.indexOf("function botiFinantareRand"), app.indexOf("function botiBaniHtml"));
  const rand = new Function(ban + fin + "return botiFinantareRand;")();
  assert.equal(rand(-1.2), "finanțare plătită −1,2 USDT");
  assert.equal(rand(0.4), "finanțare primită +0,4 USDT");
  assert.equal(rand(0), "finanțare 0,0 USDT");
  assert.equal(rand(null), "finanțare —");
  assert.match(app, /botiFinantareRand\(b\.finantare\)/);
  assert.match(app, /\$\('botiFinantare'\)/);
  assert.match(citeste("functions", "api", "bot-orders.js"), /finantareTotal:suma\("finantare","finantareTotal"\)/);
  assert.match(citeste("functions", "api", "bot-orders.js"), /profitNet=!cuMarja&&toate\(margine,investit\)\?margine-investit:dinSuma/);
  const celula = app.slice(app.indexOf("function botiBaniHtml"), app.indexOf("function botiProblemeText"));
  assert.doesNotMatch(celula, /profitNet\s*[-−]\s*|finantareTotal\s*[-−]/);
  assert.doesNotMatch(rand(-1.2), ASCII);
});

await test("cont:zile ține la doar când pauza și evenimentul s-au citit", async () => {
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
  assert.equal(fr.la, acum);
  assert.equal(fr.pauza, true);
  assert.equal(fr.raportStare, "ok");
  const picat = await campuriZiFrana({ ...d, cere: async () => { throw new Error("picat"); } }, acum, raport);
  assert.equal(picat.la, undefined);
  assert.equal(picat.pauza, undefined);
  assert.notEqual(picat.pauza, false);
  const iZi = api.indexOf('if(action==="contZi")');
  const buc = api.slice(iZi, iZi + 1600);
  assert.ok(iZi > 0);
  assert.match(buc, /laZi=nr\(corp\.la\)/);
  assert.match(buc, /row\.la=Math\.round\(laZi\)/);
  assert.doesNotMatch(buc, /exportNePotrivit/);
  assert.match(tc, /o\.la = acum/);
  const mvLa = (col.match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/) || [])[1];
  assert.ok(Number(mvLa) >= 135, mvLa);
  const ecran = citeste("public", "lib", "acasa-ecran.js");
  assert.match(ecran, /action=contZile/);
  assert.doesNotMatch(ecran, /action=contZi"/);
});

await test("pinul live s-a mutat de la v100.238; bara și la rămân", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 238, P.version);
  assert.equal(P.scripts["test:v100238"], "node scripts/proba-v100238.mjs");
  assert.equal((P.scripts.test.match(/test:v100238/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100237/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100238"], /npm run test:v100238/);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).engineContract, "54.1");
  const mv = (col.match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/) || [])[1];
  assert.ok(Number(mv) >= 135, mv);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
