// Proba v100.236 (21.10, el: „fa ideile”): cele două sume ale frânei, ora primei poze,
// finanțarea boților deschiși și felia de funding din rândul scurt. Fără prag nou.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "acasa.js"), ctx);
const AC = ctx.Acasa;
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js", "grid-sim.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const GS = globalThis.GridSim;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.236 · SUMĂ · proba\n");

const acasa = citeste("public", "lib", "acasa.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const idx = citeste("public", "index.html");
const app = citeste("public", "app.js");
const gs = citeste("public", "lib", "grid-sim.js");
const bo = citeste("functions", "api", "bot-orders.js");
const col = citeste("scripts", "colector.mjs");
const ziua = { z: "2026-10-21", pauza: true, pauzaN: 3, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } };
const linistita = (z) => ({ z, pauza: false, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } });
const ASCII = /(^|[\s(·:])-\d/;

await test("partea liniștită: sub 10 boți n-am aflat, 10 boți au suma, zero e niciun bot", () => {
  const p = Date.parse("2026-10-20T12:00:00+03:00");
  const putini = AC.masuraFranei([1, 2, 3].map((i) => ({ pornit: p, baza: 7777, rezultat: -3 })), [linistita("2026-10-20")]);
  assert.match(putini.text, /Când gura ar fi rămas „Aș porni”: 3 boți, n-am aflat\./);
  assert.doesNotMatch(putini.text, /7\.777|23\.331|7777/);
  assert.match(putini.text, /nu arată că frâna face bani/);
  assert.match(putini.text, /Eșantion insuficient/);
  assert.equal(putini.baza, null);
  const zece = Array.from({ length: 10 }, () => ({ pornit: p, baza: 12.5, rezultat: -1.5 }));
  const destul = AC.masuraFranei(zece, [linistita("2026-10-20")]);
  assert.match(destul.text, /Când gura ar fi rămas „Aș porni”: suma pusă 125,00, rezultatul adunat −15,00\./);
  assert.doesNotMatch(destul.text, /Suma pusă/);
  assert.doesNotMatch(destul.text, ASCII);
  const gol = AC.masuraFranei([], [linistita("2026-10-20"), ziua]);
  assert.match(gol.text, /Când gura ar fi rămas „Aș porni”: niciun bot\./);
  assert.doesNotMatch(gol.text, /Când gura ar fi rămas „Aș porni”: \d/);
  const faraZi = AC.masuraFranei([{ pornit: Date.parse("2026-10-21T12:00:00+03:00"), baza: 100, rezultat: -4 }], [ziua]);
  assert.match(faraZi.text, /Nicio zi salvată în care gura ar fi rămas „Aș porni”\./);
  const spart = zece.slice(); spart[0] = { pornit: p, rezultat: -1.5 };
  const partial = AC.masuraFranei(spart, [linistita("2026-10-20")]);
  assert.match(partial.text, /n-am aflat suma pusă, baza lipsește/);
  assert.doesNotMatch(partial.text, /112,50|125,00/);
});

await test("ziua fără oră rămâne în suma veche; ziua cu oră se desparte și nu intră în m.baza", () => {
  const faraOra = AC.masuraFranei([{ pornit: Date.parse("2026-10-21T12:00:00+03:00"), baza: 100, rezultat: -4 }], [ziua]);
  assert.equal(faraOra.baza, 100);
  assert.equal(faraOra.rezultat, -4);
  assert.equal(faraOra.boti, 1);
  assert.match(faraOra.text, /Suma pusă în boții porniți în zilele acelea e 100,00\./);
  assert.match(faraOra.text, /Rezultatul lor adunat e −4,00\./);
  assert.match(faraOra.text, /Zilele astea n-au ora pozei\./);
  assert.match(faraOra.text, /Eșantion insuficient/);
  assert.doesNotMatch(faraOra.text, /, n-am aflat/);
  const la = Date.parse("2026-10-21T09:00:00+03:00");
  const cuOra = Object.assign({ la }, ziua);
  const dupa = Array.from({ length: 10 }, () => ({ pornit: la, baza: 12.5, rezultat: -1.5 }));
  const inainte = { pornit: Date.parse("2026-10-21T08:00:00+03:00"), baza: 8888, rezultat: 4 };
  const sp = AC.masuraFranei(dupa.concat(inainte), [cuOra]);
  assert.equal(sp.baza, null);
  assert.equal(sp.boti, 0);
  assert.match(sp.text, /După ora pozei: suma pusă 125,00, rezultatul adunat −15,00\./);
  assert.match(sp.text, /Înainte de poză, în aceeași zi: 1 bot, n-am aflat\./);
  assert.doesNotMatch(sp.text, /8\.888|8888/);
  assert.doesNotMatch(sp.text, /Niciun bot din cartea dată n-a pornit/);
  assert.doesNotMatch(sp.text, /Suma pusă/);
  const vechi = { z: "2026-10-20", pauza: true, pauzaN: 3, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } };
  const amestec = AC.masuraFranei([
    { pornit: Date.parse("2026-10-20T12:00:00+03:00"), baza: 100, rezultat: -4 },
    { pornit: la, baza: 8888, rezultat: -9 },
    inainte,
  ], [vechi, cuOra]);
  assert.equal(amestec.baza, 100);
  assert.equal(amestec.rezultat, -4);
  assert.equal(amestec.boti, 1);
  assert.match(amestec.text, /Suma pusă/);
  assert.match(amestec.text, /Zilele fără ora pozei rămân în suma de mai sus\./);
  assert.doesNotMatch(amestec.text, /8\.888|7\.777|8888/);
  assert.match(amestec.text, /nu arată că frâna face bani/);
  const loc = [{ z: "2026-10-21", pauza: true, raportStare: "ok", eveniment: "", la: 1000 }];
  const kv = [{ z: "2026-10-21", pauza: true, raportStare: "ok", eveniment: "" }];
  assert.equal(AC.unesteZileFrana(loc, kv)[0].la, 1000);
  const zece = Array.from({ length: 10 }, (_, i) => ({ z: "2026-09-" + String(i + 1).padStart(2, "0"), pauza: true, pauzaN: 3, raportStare: "ok", eveniment: "", raport: { valoare: { total: 1 }, risc: { var95: 0 } } }));
  const mult = AC.masuraFranei([], zece);
  assert.equal(mult.insuficient, false);
  assert.doesNotMatch(mult.text, /Eșantion insuficient/);
  assert.match(mult.text, /Zilele astea n-au ora pozei\./);
});

await test("prima poză ține ora; finanțarea deschisă e o celulă, nu o a doua scădere", () => {
  assert.match(ae, /la: Date\.now\(\)/);
  assert.match(ae, /if \(lista\.some\(function \(x\) \{ return x && x\.z === zi; \}\)\) return;/);
  assert.match(bo, /finantareTotal:suma\("finantare","finantareTotal"\)/);
  assert.match(idx, /id="botiFinantare">—<\/b>/);
  assert.match(app, /\$\('botiFinantare'\)/);
  assert.match(app, /s\.finantareTotal/);
  assert.match(bo, /profitNet=!cuMarja&&toate\(margine,investit\)\?margine-investit:dinSuma/);
});

await test("rândul scurt spune felia de funding; faCe și primul cuvânt rămân", () => {
  const vs = gs.slice(gs.indexOf("function verdictScurt"), gs.indexOf("return { starturiRegim"));
  const vd = gs.slice(gs.indexOf("function verdict("), gs.indexOf("function textCalibrareMc"));
  assert.match(vd, /Aș porni: câștigă în /);
  assert.doesNotMatch(vd, /din care funding/);
  assert.match(vs, /din care funding/);
  const baza = { zile: 7, bare: 672, pCastig: 0.62, pPierde: 0.38, pZero: 0, marja: 4, p5: -1, p50: 1.2, p95: 3, pLich: 0, pStop: 0, pTp: 0, plan: null, reluare: { media: 1, n: 12, independente: 8, pPlus: 0.6 } };
  const zi1 = Object.assign({}, baza, { zile: 1, bare: 96, funding: 0 });
  const scurt = (funding, st) => GS.verdictScurt({ n: 60, zile: 14, suma: 50, acum: null, orizonturi: [Object.assign({ funding }, baza), zi1] }, st || {}, null, null);
  const incasat = scurt(-1.2, { fundingCost: true });
  assert.match(incasat.faCe, /^Aș porni: câștigă în 62%/);
  assert.match(incasat.text, /«Aș porni» · din care funding încasat ≈ 1,2 USDT, presupus · pe o zi:/);
  assert.doesNotMatch(incasat.text, /stopul atins|TP atins|lichidare/);
  assert.doesNotMatch(incasat.text, ASCII);
  const platit = scurt(0.2, {});
  assert.match(platit.text, /din care funding plătit ≈ 0,2 USDT/);
  assert.doesNotMatch(platit.text, /presupus/);
  assert.match(scurt(0.01, {}).text, /din care funding plătit sub 0,1 USDT/);
  const lipsa = GS.verdictScurt({ n: 60, zile: 14, suma: 50, acum: null, orizonturi: [baza] }, {}, null, null);
  assert.doesNotMatch(lipsa.text, /din care funding/);
  assert.match(lipsa.faCe, /^Aș porni: câștigă în 62%/);
  const stricat = scurt("nu", { fundingCost: true });
  assert.doesNotMatch(stricat.text, /din care funding/);
});

await test("colectorul e cel puțin v101.134; pinul live s-a mutat de la v100.236", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 236, P.version);   /* v100.237: insigna live nu mai e SUMĂ; proba asta păstrează suma frânei */
  assert.equal(P.scripts["test:v100236"], "node scripts/proba-v100236.mjs");
  assert.equal((P.scripts.test.match(/test:v100236/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100235/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100236"], /npm run test:v100236/);
  const mv = (col.match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/) || [])[1];
  assert.ok(Number(mv) >= 134, mv);   /* v100.238: cont:zile ține și la, fișierul colectorului e v101.135 */
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
