// Probele v100.179 (13.10.2026, el: „fă 1, 2, 3, 4”) — ieșirea botului din bandă după istoria lui, gărzile lui, lecția săptămânii, teza la intrare.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.179 · disciplina (banda, gărzile, lecția, teza) · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "disciplina.js"), ctx);
const D = ctx.Disciplina, ORA = 3600000, ZI = 86400000, T0 = Date.parse("2026-05-01T00:00:00Z");

await test("banda: pe fiecare prag de ore afară continuu — câți s-au întors în 24 h, cât a mers prețul împotriva botului; regula = primul prag sub 30 % (≥ 30 de cazuri)", () => {
  const trades = [], bare = {};
  for (let k = 0; k < 40; k++) {   // 40 de boți long cu banda 90–110; prețul iese pe jos la ora 5; primii 10 se întorc după 2 h, restul nu
    const m = "M" + k, intoarce = k < 10, b = [];
    for (let i = 0; i < 120; i++) { let c = 100; if (i >= 5) c = intoarce && i >= 7 ? 100 : 85 - (intoarce ? 0 : (i - 5) * 0.1); b.push({ t: T0 + i * ORA, c }); }
    bare[m] = b; trades.push({ id: "b" + k, moneda: m, jos: 90, sus: 110, dir: "long", pornit: T0, inchis: T0 + 100 * ORA, pct: intoarce ? 0.01 : -0.2 });
  }
  const r = D.iesiriBanda(trades, (m) => bare[m]);
  const h1 = r.tabel.find((x) => x.h === 1), h3 = r.tabel.find((x) => x.h === 3);
  assert.equal(h1.n, 40); assert.ok(Math.abs(h1.intoarse - 0.25) < 1e-9, "după 1 h: 10 din 40 se întorc");
  assert.equal(h3.n, 30); assert.equal(h3.intoarse, 0, "cei care se întorc au ieșit înainte de 3 h");
  assert.ok(h3.miscareImpotriva < 0, "long ieșit pe jos care tot coboară ⇒ negativ (mai rău): " + h3.miscareImpotriva);
  assert.equal(r.regula.h, 1, "regula: primul prag cu ≥ 30 de cazuri sub 30 %"); assert.equal(r.oreAfaraPe.b39 > 50, true);
  assert.equal(r.grupe.find((x) => x.grupa === "peste 24 h").n, 30);
});
await test("gărzile: sectorul / industria peste 40 %, o poziție peste 25 % din risc, contul peste 30 % pe an, acțiuni sub stopul tău, boți afară peste regula ta", () => {
  const g = D.garzi({ factori: { sectoare: [{ ro: "Tehnologie", pondere: 0.83, pestePrag: true, pozitii: ["MU", "WDC"] }], industrii: [] }, vol: { volAnual: 0.48, contrib: [{ nume: "APLD", pondere: 0.34 }] },
    pozitii: [{ nume: "APLD", pct: -0.12 }, { nume: "MU", pct: 0.05 }], stop: -0.08, stopDinMae: true, boti: [{ nume: "PLUME", oreAfara: 14 }], regulaOre: 12 });
  const pe = Object.fromEntries(g.map((x) => [x.cod, x]));
  assert.equal(pe.sector.ok, false); assert.match(pe.sector.detaliu, /Tehnologie: 83 %/); assert.equal(pe.risc.ok, false); assert.match(pe.risc.detaliu, /APLD: 34 %/);
  assert.equal(pe.vol.ok, false); assert.equal(pe.stop.ok, false); assert.match(pe.stop.detaliu, /APLD −?-?12 %|APLD -12 %/); assert.equal(pe.stop.sursa, "din MAE-ul tău");
  assert.equal(pe.banda.ok, false); assert.match(pe.banda.detaliu, /PLUME \(14 ore\)/);
  assert.ok(D.garzi({ vol: { volAnual: 0.1, contrib: [{ nume: "A", pondere: 0.1 }] } }).every((x) => x.ok));
});
await test("lecția: doar pierderile închise în săptămână care au încălcat o regulă, cele mai scumpe 3; regula săptămânii = cea care a costat cel mai mult; verificarea", () => {
  const de = Date.parse("2026-10-05T00:00:00Z"), pana = Date.parse("2026-10-12T00:00:00Z"), t = (z) => Date.parse(z + "T15:00:00Z");
  const trades = [
    { id: "1", ticker: "A_US_EQ", simbol: "A", pornit: t("2026-10-01"), inchis: t("2026-10-06"), rezultat: -500, cost: 2000, pct: -0.25, mfe: 0.01 },   // stop încălcat
    { id: "2", ticker: "B_US_EQ", simbol: "B", pornit: t("2026-10-02"), inchis: t("2026-10-07"), rezultat: -100, cost: 2000, pct: -0.05, mfe: 0.08 },   // a fost pe plus
    { id: "3", ticker: "C_US_EQ", simbol: "C", pornit: t("2026-10-03"), inchis: t("2026-10-08"), rezultat: 300, cost: 2000, pct: 0.15, mfe: 0.2 },   // câștig: nu intră
    { id: "4", ticker: "D_US_EQ", simbol: "D", pornit: t("2026-10-06"), inchis: t("2026-10-09"), rezultat: -50, cost: 1000, pct: -0.05, mfe: 0 } ];   // Poarta zicea „nu”
  const l = D.lectia({ de, pana, trades, boti: [{ id: "x", moneda: "PLUME", inchis: t("2026-10-08"), net: -40, oreAfara: 30 }], usdLei: 4.5, stop: -0.08, regulaOre: 12,
    verdicte: [{ s: "poarta-t212", k: "D_US_EQ", n: "nu", t: t("2026-10-05") }], teze: [] });
  assert.equal(l.toate, 4); assert.deepEqual(Array.from(l.top.map((x) => x.ce)), ["A", "PLUME (bot)", "B"]);
  assert.match(l.top[0].motive[0].text, /a ieșit la −?-25 %, stopul tău e −?-8 %/); assert.equal(l.regula.cod, "stop");
  assert.equal(l.incalcari.poarta, 1); assert.equal(l.incalcari.banda, 1);
  const v = D.verifica({ cod: "poarta", text: D.REGULI.poarta }, l); assert.equal(v.respectata, false); assert.equal(v.incalcari, 1);
  assert.equal(D.verifica({ cod: "orizont", text: "x" }, l).respectata, true);
});
await test("teza: de ce, invalidarea, orizontul (1–3650 de zile), curățate; goală ⇒ nimic", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(D.curataTeza({ teza: " rezultate bune ", invalidare: "sub media de 50", orizont: "30" }))), { teza: "rezultate bune", invalidare: "sub media de 50", orizont: 30 });
  assert.equal(D.curataTeza({ teza: "", orizont: 0 }), null); assert.equal(D.curataTeza({ orizont: 99999, teza: "x" }).orizont, null);
});
// mesajele
const MC = await import("./lib/mesaje-colector.mjs");
await test("mesajele: botul afară peste regula lui, garda încălcată, lecția săptămânii (cu verificarea) — titlul ≤ 60, 👉 la persoana I", () => {
  const a = MC.afaraDinBanda("PLUME", 13.4, { h: 12, intoarse: 0.25, miscareImpotriva: -0.005 }); assert.ok(a.titlu.length <= 60); assert.match(a.titlu, /PLUME: afară din bandă de 13 ore/); assert.match(a.mesaj, /doar 25% s-au mai întors[\s\S]*\n👉 Aș închide botul/);
  const g = MC.garda({ titlu: "Un sector cel mult 40 % din acțiuni", detaliu: "Tehnologie: 83 %", sursa: "concentrarea" }); assert.ok(g.titlu.length <= 60); assert.match(g.mesaj, /\n👉 Aș readuce/);
  const l = MC.lectiaSaptamanii({ top: [{ ce: "A", cost: 500, motive: [{ text: "a ieșit la −25 %" }] }], regula: { text: "Ies la stopul meu" } }, { text: "Nu cumpăr când Poarta zice nu", respectata: false, incalcari: 2 });
  assert.match(l.mesaj, /încălcată de 2 ori/); assert.match(l.mesaj, /1\. A: −500 lei - a ieșit la −25 %/); assert.match(l.mesaj, /\n👉 Regula pentru săptămâna care vine: Ies la stopul meu\./);
});
// serverul
await test("serverul: teza se ține cu planul (doar la acțiuni) și în istoricul tezelor; banda; lecțiile (una pe săptămână)", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`); let ip = 0;
  const h = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://ex.test", "cf-connecting-ip": "10.179.1." + (++ip) });
  const post = async (a, c) => (await m.onRequestPost({ request: new Request("https://ex.test/api/istoric-bot?action=" + a, { method: "POST", headers: h(), body: JSON.stringify(c) }), env })).status;
  const get = async (a) => JSON.parse(await (await m.onRequestGet({ request: new Request("https://ex.test/api/istoric-bot?action=" + a, { headers: h() }), env })).text());
  assert.equal(await post("plan", { bot: "t212-AAPL_US_EQ", plan: { stop: 150, teza: "rezultate bune", invalidare: "sub 140", orizont: 30 } }), 200);
  const p = (await get("plan&bot=t212-AAPL_US_EQ")).plan; assert.equal(p.teza, "rezultate bune"); assert.equal(p.orizont, 30);
  assert.equal((await get("teze")).teze[0].tk, "AAPL_US_EQ");
  assert.equal(await post("plan", { bot: "123", plan: { plus: 5, teza: "nu la boți" } }), 200); assert.equal((await get("plan&bot=123")).plan.teza, undefined);
  assert.equal(await post("disciplinaBanda", { la: 1, tabel: [], regula: { h: 12 } }), 200); assert.equal((await get("disciplinaBanda")).banda.regula.h, 12);
  assert.equal(await post("lectie", { la: 1, sapt: "2026-10-11", lectie: { top: [] } }), 200); assert.equal(await post("lectie", { la: 2, sapt: "2026-10-11", lectie: { top: [1] } }), 200);
  const l = (await get("lectii")).lectii; assert.equal(l.length, 1); assert.equal(l[0].la, 2);
});
// pagina
const ctxE = { TextRo: globalThis.TextRo }; vm.createContext(ctxE); vm.runInContext(citeste("public", "lib", "cont-ecran.js"), ctxE);
await test("pagina: „Gărzile tale”, „Lecția săptămânii” (cu verificarea), „Când iese botul din bandă” (tabelul + regula)", () => {
  const h = ctxE.ciDisciplinaHtml({ garzi: [{ cod: "sector", ok: false, titlu: "Un sector cel mult 40 % din acțiuni", detaliu: "Tehnologie: 83 %", sursa: "concentrarea" }, { cod: "vol", ok: true, titlu: "Contul sub 30 %", detaliu: "", sursa: "x" }] },
    { tabel: [{ h: 12, n: 36, intoarse: 0.25, miscareImpotriva: -0.005 }], regula: { h: 12, n: 36, intoarse: 0.25, miscareImpotriva: -0.005 }, grupe: [{ grupa: "peste 24 h", n: 9, netMedian: -0.52 }] },
    [{ sapt: "2026-10-11", lectie: { de: Date.parse("2026-10-04T00:00:00Z"), top: [{ ce: "A", cost: 500, motive: [{ text: "a ieșit la −25 %" }] }], regula: { text: "Ies la stopul meu", cost: 500 } }, verificare: { text: "Nu cumpăr când Poarta zice nu", respectata: true } }]);
  assert.match(h, /1 gardă e încălcată acum/); assert.match(h, /✗ <b>Un sector cel mult 40 % din acțiuni<\/b> · Tehnologie: 83 %/);
  assert.match(h, /Regula de data trecută \(„Nu cumpăr când Poarta zice nu”\): respectată ✓/); assert.match(h, /👉 <b>Regula săptămânii:<\/b> Ies la stopul meu/);
  assert.match(h, /după 12 h afară din bandă, doar 25% s-au mai întors în 24 h/); assert.match(h, /peste 24 h −52,0% \(9\)/);
  assert.match(ctxE.ciDisciplinaHtml({}, null, null), /Vine duminică seara/);
});
await test("T212: teza în planul poziției (de ce, invalidarea, orizontul), salvată cu planul; orizontul trecut se spune", () => {
  const t = citeste("public", "lib", "t212-ecran.js");
  assert.match(t, /plan\.teza = tx\("t212Teza-"\); plan\.invalidare = tx\("t212Inv-"\); plan\.orizont = g\("t212Oriz-"\);/); assert.match(t, /id="t212Teza-' \+ tk/); assert.match(t, /Orizontul tău de /);
});
await test("legarea: disciplina.js în pagină și în cache; colectorul: statistica benzii zilnic, banda pe viu, gărzile și lecția în tura contului; Poarta gridului arată regula", () => {
  assert.match(citeste("public", "index.html"), /<script src="\/lib\/disciplina\.js"><\/script>/); assert.match(citeste("public", "sw.js"), /"\/lib\/disciplina\.js"/);
  const c = citeste("scripts", "colector.mjs"); assert.match(c, /const Disciplina = incarca\("disciplina\.js", "Disciplina"\)/); assert.match(c, /turaDisciplinaBanda\(\)\.catch/); assert.match(c, /turaBandaLive\(\)\.catch/);
  const tc = citeste("scripts", "lib", "tura-cont.mjs"); assert.match(tc, /d\.Disciplina\.garzi\(/); assert.match(tc, /d\.Disciplina\.lectia\(/); assert.match(tc, /lectiaSaptamanii\(lectieR, ver\)/);
  assert.match(citeste("public", "app.js"), /function grBandaRegulaHtml\(\)/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
