// Proba v100.282 / colector v101.154 (31.10, el: „fa” - ideile de după evaluarea boților):
// (1) regulile pe DATE NOI (boți porniți de la 31.10), în raportul de duminică - DESCRIPTIV: câți boți peste fiecare regulă, netul lor, „fără ei”
//     (ipoteză) și media pe ultimele 120 de zile a celor peste reguli, cu interval pe zile; FĂRĂ verdict - simularea pe istoria lui (sim282b):
//     pe 30–45 de zile un verdict ar greși 13–17% în loc de 1%, iar puterea e sub 50% chiar la 90 de zile;
// (3) în fiecare evaluare, cât au dat luna asta boții care au încălcat aceeași regulă (din data/evaluari.jsonl);
// (+) ziua României corectă și în zilele schimbării orei (Obiceiuri.inceputZiRo greșea cu o oră pe 29.03 și 25.10 după schimbare);
// (+) webhook-ul evaluărilor stricat (șters, greșit, lipsă) ⇒ o notă doar în Radar, o dată; închisă la revenire.
//   node scripts/proba-v100282.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifica } from "./garda-texte.mjs";
import * as MC from "./lib/mesaje-colector.mjs";
import * as CO from "./lib/comportament.mjs";
import * as CS from "./lib/canal-separat.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const OB = globalThis.Obiceiuri;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
const fara = (ab, ce) => assert.deepEqual(ab, [], ce + ": " + ab.join("; "));
console.log("\nV100.282 · IDEILE EVALUĂRII · proba\n");
const ORA = 3600000, ZI = 86400000, ACUM = Date.UTC(2026, 9, 31, 18, 0);
const PR = { zi: 20, sapt: 60, rand: 3, boti: 7 };

// ---------------- ziua României în zilele schimbării orei ----------------
await test("(+) începutul zilei României și în zilele schimbării orei (25.10 și 29.03), înainte și după schimbare; zilele obișnuite neschimbate", () => {
  assert.equal(OB.inceputZiRo(Date.UTC(2026, 9, 25, 0, 30)), Date.UTC(2026, 9, 24, 21, 0), "25.10 03:30 RO, înainte de schimbare");
  assert.equal(OB.inceputZiRo(Date.UTC(2026, 9, 25, 2, 0)), Date.UTC(2026, 9, 24, 21, 0), "25.10 04:00 RO, după schimbare");
  assert.equal(OB.inceputZiRo(Date.UTC(2026, 9, 25, 21, 59)), Date.UTC(2026, 9, 24, 21, 0), "25.10 23:59 RO");
  assert.equal(OB.inceputZiRo(Date.UTC(2026, 9, 25, 22, 0)), Date.UTC(2026, 9, 25, 22, 0), "26.10 00:00 RO");
  assert.equal(OB.inceputZiRo(Date.UTC(2026, 2, 29, 9, 0)), Date.UTC(2026, 2, 28, 22, 0), "29.03 12:00 RO, după trecerea la ora de vară");
  assert.equal(OB.inceputZiRo(Date.UTC(2026, 2, 29, 0, 30)), Date.UTC(2026, 2, 28, 22, 0), "29.03 02:30 RO, înainte");
  assert.equal(OB.inceputZiRo(Date.UTC(2026, 9, 31, 10, 0)), Date.UTC(2026, 9, 30, 22, 0), "zi obișnuită (iarna)");
  assert.equal(OB.inceputZiRo(Date.UTC(2026, 6, 15, 10, 0)), Date.UTC(2026, 6, 14, 21, 0), "zi obișnuită (vara)");
  // frâna: pe 25.10, botul pornit la 00:30 RO e „azi”
  const f = OB.frana({ trades: [{ pornit: Date.UTC(2026, 9, 24, 21, 30), inchis: Date.UTC(2026, 9, 24, 22, 0), net: -25 }], acum: Date.UTC(2026, 9, 25, 10, 0), praguri: { zi: 20, sapt: 1000, rand: 99, boti: 99 } });
  assert.equal(f.pornitiAzi, 1); assert.ok(f.depasit.some((d) => d.cod === "zi"));
});

// ---------------- (3) luna asta, pe regulile încălcate ----------------
await test("(3) luna asta (calendaristică, ziua României a închiderii) pe fiecare regulă încălcată; botul de acum se adaugă; jurnalul stricat nu oprește nimic", () => {
  const jsonl = [
    { id: "a", inchis: Date.UTC(2026, 9, 30, 10), net: -5, rele: ["boti", "frana"] },
    { id: "b", inchis: Date.UTC(2026, 9, 31, 8), net: 2, rele: ["frana"] },
    { id: "c", inchis: Date.UTC(2026, 8, 30, 10), net: -9, rele: ["boti"] },     // septembrie
    { id: "d", inchis: Date.UTC(2026, 9, 31, 9), net: 1, rele: [] },
    { id: "e", inchis: Date.UTC(2026, 9, 31, 22, 30), net: -1, rele: ["boti"] }, // 01.11 la București
  ].map((x) => JSON.stringify(x)).join("\n") + "\n{stricat\n\n";
  const inreg = CO.dinJsonl(jsonl); assert.equal(inreg.length, 5);
  const dublu = CO.dinJsonl(jsonl + JSON.stringify({ id: "b", inchis: Date.UTC(2026, 9, 31, 8), net: 4, rele: ["frana"] }) + "\n");
  assert.equal(dublu.length, 5, "același bot scris de două ori se numără o dată"); assert.equal(dublu.find((x) => x.id === "b").net, 4, "ultimul rând câștigă");
  const luna = CO.lunaPeReguli(inreg, ACUM);
  assert.deepEqual(luna, { boti: { n: 1, net: -5 }, frana: { n: 2, net: -3 } });
  const ev = { net: -7.4, decizii: [{ cod: "boti", ok: false }, { cod: "frana", ok: true }, { cod: "minute", ok: false }] };
  CO.adaugaInLuna(luna, ev);
  assert.deepEqual(CO.lunaPentru(luna, ev), { boti: { n: 2, net: -12.4 }, minute: { n: 1, net: -7.4 } });
  assert.deepEqual(luna.frana, { n: 2, net: -3 }, "regula respectată nu se adună");
});
await test("(3) evaluarea spune luna asta pe regulile încălcate de bot (de la 2 boți încolo), rupt doar între reguli; garda textelor", () => {
  const T0 = Date.UTC(2026, 9, 31, 8, 0), PRAG = { zi: 20, sapt: 60, rand: 3, boti: 7 };
  const ev = CO.evalueaza({ t: { id: "1", moneda: "SOL", dir: "long", pornit: T0, inchis: T0 + 7.5 * ORA, net: -3.2, grile: 1.2, pozitie: -3.9, comisioane: -0.4, funding: -0.1 },
    frana: { pornitiAzi: 8, rand: 0, netZi: -1, netSapt: -682, depasit: [{ cod: "sapt" }, { cod: "boti" }], praguri: PRAG, activa: true }, afaraOre: null, banda: { dv: null, r: null }, dovezi: null, motiv: null });
  ev.luna = { boti: { n: 23, net: -180.4 }, frana: { n: 41, net: -302.5 } };
  const m = MC.evaluareBot(ev);
  assert.match(m.mesaj, /\n📅 Luna asta: 23 de boți porniți peste pragul zilei \(−180,4 USDT\) · 41 de boți porniți cu frâna trasă \(−302,5 USDT\)\.\n/);
  fara(verifica(m.mesaj, "raport"), "mesajul cu luna");
  ev.luna = { boti: { n: 1, net: -3.2 } };
  assert.doesNotMatch(MC.evaluareBot(ev).mesaj, /Luna asta/, "un singur bot (chiar acesta) nu spune nimic în plus");
  ev.luna = { boti: { n: 123, net: -1234.5 }, frana: { n: 456, net: -4567.8 }, banda: { n: 78, net: -987.6 }, minute: { n: 321, net: -123.4 }, lichidare: { n: 2, net: -456.7 } };
  ev.decizii.push({ cod: "banda", ok: false, ore: 9, dv: { h: 6, intoarse: 0.41 } }, { cod: "minute", ok: false, minute: 6, prag: 15, grile: 0.2, comisioane: -0.6 }, { cod: "lichidare", ok: false });
  const mare = MC.evaluareBot(ev); fara(verifica(mare.mesaj, "raport"), "luna cu toate regulile");
  assert.match(mare.mesaj, /\n📅 Luna asta: /); assert.ok(mare.mesaj.split("\n").every((l) => !/^\d+ (de )?boți$/.test(l.trim())), "nicio regulă ruptă în două");
});

// ---------------- (1) regulile pe date noi, descriptiv ----------------
await test("(1) pe date noi: doar boții PORNIȚI de la 31.10 00:00 (ora României), pe fiecare regulă și peste oricare; fără verdict", () => {
  assert.equal(CO.PROBA_DE, Date.UTC(2026, 9, 30, 22, 0));
  const noi = CO.reguliPeDateNoi([
    { id: "x", pornit: CO.PROBA_DE - ORA, net: -9, rele: ["boti"] },
    { id: "y", pornit: CO.PROBA_DE + ORA, net: -4, rele: ["boti", "frana"] },
    { id: "z", pornit: CO.PROBA_DE + 2 * ORA, net: 1.5, rele: ["minute"] },
    { id: "w", pornit: CO.PROBA_DE + 3 * ORA, net: 2, rele: [] },
  ], CO.PROBA_DE);
  assert.equal(noi.n, 3); assert.deepEqual(noi.peste.boti, { n: 1, net: -4 }); assert.deepEqual(noi.peste.frana, { n: 1, net: -4 }); assert.deepEqual(noi.peste.minute, { n: 1, net: 1.5 });
  assert.deepEqual(noi.toate, { n: 2, net: -2.5 });
});
await test("(1) istoria pe 120 de zile: media celor porniți peste reguli (al N-lea > prag, frâna, minutele lui), interval 99% pe zile, determinist", () => {
  const l = [], Z0 = Date.UTC(2026, 7, 22, 6, 0);   // 22.08, 09:00 RO: toți cei 10 boți ai zilei în aceeași zi a României
  for (let d = 0; d < 60; d++) for (let k = 0; k < 10; k++) { const p = Z0 + d * ZI + k * ORA; l.push({ id: d + "-" + k, pornit: p, inchis: p + 2 * ORA, durataOre: 2, net: k < 7 ? 1 : -5 }); }
  const P = { zi: 100000, sapt: 1000000, rand: 999, boti: 7 };
  const r = CO.istoriaReguli(l, P, ACUM, OB.franaLaPornire, new Map());
  assert.equal(r.n, 180); assert.equal(r.z, 60); assert.equal(r.m, -5); assert.ok(r.hi < 0 && r.lo <= r.m && r.hi >= r.m, JSON.stringify(r));
  assert.deepEqual(CO.istoriaReguli(l, P, ACUM, OB.franaLaPornire, new Map()), r, "același rezultat (mulberry32 cu sămânță)");
  assert.equal(CO.istoriaReguli(l.slice(0, 50), P, ACUM, OB.franaLaPornire, new Map()), null, "sub 30 de boți peste reguli ⇒ nimic");
  const vechi = l.map((t) => Object.assign({}, t, { pornit: t.pornit - 200 * ZI, inchis: t.inchis - 200 * ZI }));
  assert.equal(CO.istoriaReguli(vechi, P, ACUM, OB.franaLaPornire, new Map()), null, "doar ultimele 120 de zile");
});
await test("(1) rândurile din raport: ce s-a întâmplat pe date noi, „fără ei” ca ipoteză, istoria cu interval; fără „te ajută”; garda textelor", () => {
  const noi = { n: 76, peste: { boti: { n: 12, net: -24.5 }, frana: { n: 64, net: -132.4 }, minute: { n: 20, net: -8.1 }, banda: { n: 3, net: -30.2 } }, toate: { n: 70, net: -140.2 } };
  const ist = { n: 1204, z: 112, m: -2.57, lo: -4.13, hi: -1.16 };
  const lin = CO.liniiReguliNoi(noi, ist), txt = lin.join("\n");
  assert.match(lin[0], /^Regulile pe date noi \(boți porniți de la 31\.10\): 12 boți porniți peste pragul zilei \(−24,5 USDT\) · 64 de boți porniți cu frâna trasă \(−132,4 USDT\)/);
  assert.match(txt, /Fără cei 70 de boți porniți peste reguli aveai cu 140,2 USDT mai puțin pierdut, dacă nu porneai alții în loc \(ipoteză\)\./);
  assert.match(txt, /Pe ultimele 120 de zile, boții porniți peste reguli au dat în medie −2,6 USDT\/bot \(interval 99%: −4,1 … −1,2\)/);
  assert.doesNotMatch(txt, /te ajută|nu te ajută|dovedit/);
  for (const x of txt.split("\n")) fara(verifica(x, "raport"), "rândul „" + x + "”");
  const plus = CO.liniiReguliNoi({ n: 5, peste: { boti: { n: 2, net: 3.1 } }, toate: { n: 2, net: 3.1 } }, null).join("\n");
  assert.match(plus, /Fără cei 2 boți porniți peste reguli aveai cu 3,1 USDT mai puțin câștigat/); assert.doesNotMatch(plus, /120 de zile/);
  assert.deepEqual(CO.liniiReguliNoi({ n: 0, peste: {}, toate: { n: 0, net: 0 } }, null), ["Regulile pe date noi (boți porniți de la 31.10): încă niciun bot închis."]);
  assert.match(CO.liniiReguliNoi({ n: 4, peste: {}, toate: { n: 0, net: 0 } }, null).join("\n"), /niciunul peste reguli/);
});

// ---------------- (+) webhook-ul evaluărilor stricat ⇒ nota din Radar ----------------
const fetchFals = (raspunsuri) => { const urls = []; const f = async (u) => { urls.push(u); const r = raspunsuri.length > 1 ? raspunsuri.shift() : raspunsuri[0]; return { ok: r.status >= 200 && r.status < 300, status: r.status, headers: { get: () => null }, text: async () => r.corp || "" }; }; f.urls = urls; return f; };
const W = "https://discord.com/api/webhooks/1/abc_DEF-123";
await test("(+) canalul spune când nu merge: lipsă / 401 / 403 / 404 (nu 429 sau 5xx - trec singure); la primul mesaj plecat, gata", async () => {
  const fis = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "canal-")), "coada.json");
  assert.deepEqual(CS.creeazaCanal({ nume: "evaluări", webhook: "", fis, fetch: fetchFals([{ status: 204 }]), jurnal: () => {} }).problema().status, "lipsă");
  const c = CS.creeazaCanal({ nume: "evaluări", webhook: W, fis, fetch: fetchFals([{ status: 404, corp: '{"message":"Unknown Webhook"}' }, { status: 500 }, { status: 204 }]), jurnal: () => {} });
  assert.equal(c.problema(), null);
  await c.trimite({ nivel: "info", titlu: "unu", mesaj: "m" }); assert.equal(c.problema().status, 404);
  await c.goleste(); assert.equal(c.problema().status, 404, "un 500 nu șterge problema și nici n-o schimbă");
  await c.goleste(); assert.equal(c.problema(), null, "mesajul a plecat ⇒ canalul merge");
});
await test("(+) nota din Radar: doar în Radar (nu pe Discord), o dată pe problemă, cu ce să faci; garda textelor", () => {
  for (const st of [404, "lipsă"]) {
    const m = MC.canalEvaluariStricat(st);
    assert.equal(m.doarRadar, true); assert.equal(m.nivel, "atentie");
    fara(verifica(m.titlu, "alertaTitlu"), "titlul"); fara(verifica(m.mesaj, "alertaMesaj"), "mesajul");
  }
  assert.match(MC.canalEvaluariStricat(404).mesaj, /404/); assert.match(MC.canalEvaluariStricat("lipsă").mesaj, /DISCORD_WEBHOOK_EVALUARI/);
  const s = citeste("scripts", "colector.mjs"), tc = s.slice(s.indexOf("async function turaCanalEvaluari("), s.indexOf("\n}\n", s.indexOf("async function turaCanalEvaluari(")));
  assert.ok(tc.length > 50, "turaCanalEvaluari lipsește");
  assert.match(tc, /canalEvaluari\.problema\(\)/); assert.match(tc, /trimiteAlerta\(MesajeColector\.canalEvaluariStricat\(/); assert.match(tc, /canalEvaluariAnuntat/);
  assert.match(s, /async function bucla\(\)[\s\S]*?canalEvaluari\.goleste\(\)\.then\(\(\) => turaCanalEvaluari\(\)\)/);
});

// ---------------- legarea în colector + versiunile ----------------
await test("colectorul: luna din jurnalul evaluărilor (o citire pe tură), adăugată la fiecare evaluare; raportul de duminică primește regulile pe date noi + istoria", () => {
  const s = citeste("scripts", "colector.mjs");
  const tc = s.slice(s.indexOf("async function turaComportament("), s.indexOf("\n}\n", s.indexOf("async function turaComportament(")));
  assert.match(tc, /Comportament\.lunaPeReguli\(Comportament\.dinJsonl\(/);
  assert.match(tc, /Comportament\.adaugaInLuna\(luna, ev\); ev\.luna = Comportament\.lunaPentru\(luna, ev\);[\s\S]*?MesajeColector\.evaluareBot\(ev\)/);
  const r = s.slice(s.indexOf("async function turaRaport("), s.indexOf("\n}\n", s.indexOf("async function turaRaport(")));
  assert.match(r, /Comportament\.liniiReguliNoi\(Comportament\.reguliPeDateNoi\(/); assert.match(r, /Comportament\.istoriaReguli\(trades, /);
});
await test("versiunile: v100.282 în aplicație, v101.154 în colector; proba în lanț; v100281 de la v100.281 în sus", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.282"/);
  assert.match(citeste("BUILD_INFO.json"), /"version": "v100\.282"/);
  assert.match(citeste("public", "index.html"), /id="healthAppVersion">v100\.282</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-282/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.154"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.scripts["test:v100282"], "node scripts/proba-v100282.mjs"); assert.match(p.scripts.test, /npm run test:v100281 && npm run test:v100282/);
  assert.doesNotMatch(citeste("scripts", "proba-v100281.mjs"), /VERSIUNE = "v100\\\.281"\/\)/, "v100281 nu mai cere exact v100.281");
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
