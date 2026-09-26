// Proba pentru pachetul de alerte din 26.09 (v91.11): "fa 1, fa si 2 dar nu doar dimineata - la fiecare
// 3 ore - cat si alerta de prag rosu sau schimbare de regim, piata, directie impotriva botului; 4 cu
// praguri puse de tine in app la fiecare bot cat si cand atinge un grid".
// Rulare: node scripts/alerte-v9111.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

for (const f of ["alerte.js", "indicatori-bot.js"]) vm.runInThisContext(fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8"));
const A = globalThis.Alerte, I = globalThis.IndicatoriBot;

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}
const T0 = Date.UTC(2026, 8, 26, 12, 0, 0), MIN = 60000, ORA = 3600000;
// botul VVV din 26.09: long 4x, grid 28,464 - 33,346, pret 29,786, iese pe zero la 30,15
const BOT = (o) => ({ id: "2383", baza: "VVV.PERP", directie: "long", levier: 4, pretCurent: 29.786, gridJos: 28.464, gridSus: 33.346, distantaLichidarePct: 25.4,
  profitTotal: -3.11, pozitie: 8.79, ordinePerechi: 0, gridProfitBrut: 0, brut: { buOrderData: { closedExchangeOrderCount: 2 } }, activ: true, ...o });
const MED = (o) => I.mediu(Object.assign({ regim: { r4h: 0.2, r24h: 0.5, miscare: false }, funding: { rate: 0.00005, hist: Array(90).fill(0.00005), intervalOre: 4 }, btc: { dir: "lateral", regim: { r4h: 0.1, r24h: 0.3, miscare: false } } }, o), "long");
const mesaj = (r, cheie) => r.mesaje.find((m) => m.cheie === cheie);

// ---------------- (2) alertele noi din "Mediul botului" ----------------
await test("BTC pe 4h coboara impotriva botului long -> alerta o data; se repeta abia dupa 12 h; cand trece -> 'nu mai merge impotriva'", () => {
  let r = A.evalueaza(BOT(), { mediu: MED({ btc: { dir: "coboara", regim: { r4h: 0.4, r24h: 0.5, miscare: false } } }) }, {}, T0);
  const m = mesaj(r, "m-btc"); assert.ok(m, "n-a plecat alerta BTC"); assert.equal(m.nivel, "atentie"); assert.match(m.titlu, /BTC/); assert.match(m.titlu, /împotriva/); assert.match(m.mesaj, /Ce aș face eu/);
  r = A.evalueaza(BOT(), { mediu: MED({ btc: { dir: "coboara", regim: null } }) }, r.stare, T0 + 3 * ORA); assert.ok(!mesaj(r, "m-btc"), "s-a repetat dupa 3 h");
  r = A.evalueaza(BOT(), { mediu: MED({ btc: { dir: "coboara", regim: null } }) }, r.stare, T0 + 13 * ORA); assert.ok(mesaj(r, "m-btc"), "nu s-a repetat dupa 12 h");
  r = A.evalueaza(BOT(), { mediu: MED({ btc: { dir: "urca", regim: null } }) }, r.stare, T0 + 14 * ORA);
  r = A.evalueaza(BOT(), { mediu: MED({ btc: { dir: "urca", regim: null } }) }, r.stare, T0 + 14 * ORA + 11 * MIN);
  assert.match((mesaj(r, "m-btc") || {}).titlu || "", /nu mai merge împotriva/);
});
await test("funding mult peste obicei, platit de partea botului -> alerta; BTC/funding fara date -> starea ramane (nu 'a trecut' fals)", () => {
  let r = A.evalueaza(BOT(), { mediu: MED({ funding: { rate: 0.0004, hist: Array(90).fill(0.00005), intervalOre: 4 } }) }, {}, T0);
  const m = mesaj(r, "m-funding"); assert.ok(m); assert.match(m.titlu, /funding/i); assert.match(m.mesaj, /8×/);
  const r2 = A.evalueaza(BOT(), { mediu: MED({ funding: null, btc: null }) }, r.stare, T0 + 20 * MIN);
  assert.ok(!mesaj(r2, "m-funding") && !mesaj(r2, "m-btc")); assert.equal(r2.stare["m-funding"].nivel, "atentie");
});
await test("miscarea mare ramane pe regula ei masurata (2x intra, 1,5x iese) - nu se dubleaza din 'Mediul botului'", () => {
  const r = A.evalueaza(BOT(), { mediu: MED({ regim: { r4h: 1.7, r24h: 0.9, miscare: true } }) }, {}, T0);
  assert.ok(!r.mesaje.some((m) => /mișcare/i.test(m.titlu)), "a trimis alerta de miscare din Mediu: " + JSON.stringify(r.mesaje.map((m) => m.titlu)));
});

// ---------------- (4) pragurile puse de mine pe fiecare bot ----------------
await test("pragul 'iese pe zero': pretul trece peste 30,15 la un long -> anunta; sub (cu 0,3% marja) tace, nu clipeste", () => {
  let r = A.evalueaza(BOT({ pretCurent: 30.2 }), { pretZero: 30.15 }, {}, T0);
  const m = mesaj(r, "p-zero"); assert.ok(m); assert.match(m.titlu, /pe zero/); assert.match(m.titlu, /30\.15/); assert.match(m.mesaj, /fără pierdere/);
  r = A.evalueaza(BOT({ pretCurent: 30.1 }), { pretZero: 30.15 }, r.stare, T0 + 5 * MIN); assert.equal(r.stare["p-zero"].nivel, "atentie", "a iesit din alerta la 0,2% sub");
  const s = A.evalueaza(BOT({ pretCurent: 30.2 }), { pretZero: 30.15 }, {}, T0).stare;
  const r3 = A.evalueaza(BOT({ directie: "short", pretCurent: 30.2 }), { pretZero: 30.15 }, {}, T0); assert.ok(!mesaj(r3, "p-zero"), "short peste pragul de zero = pierdere, nu 'pe zero'");
  assert.ok(s["p-zero"]);
});
await test("pragul 'marginea gridului': la 1% de marginea de jos (inauntru) -> alerta; iese abia peste 1,5%; afara din grid e regula 'grid'", () => {
  let r = A.evalueaza(BOT({ pretCurent: 28.7 }), {}, {}, T0);
  const m = mesaj(r, "p-margine"); assert.ok(m, "n-a anuntat marginea"); assert.match(m.titlu, /marginea de jos/); assert.match(m.titlu, /28\.46/);
  r = A.evalueaza(BOT({ pretCurent: 28.85 }), {}, r.stare, T0 + 5 * MIN); assert.equal(r.stare["p-margine"].nivel, "atentie");
  assert.ok(!mesaj(A.evalueaza(BOT({ pretCurent: 30 }), {}, {}, T0), "p-margine"));
  const sus = mesaj(A.evalueaza(BOT({ pretCurent: 33.1 }), {}, {}, T0), "p-margine"); assert.match(sus.titlu, /marginea de sus/);
});

// ---------------- (4) grila atinsa / pereche incheiata ----------------
await test("grila: prima citire doar tine minte; umplere noua cu pozitia crescuta = 'a cumparat'; pereche noua = '✅ pereche incheiata +X USDT'", () => {
  let g = A.grila(BOT(), null); assert.deepEqual(g.mesaje, []);
  g = A.grila(BOT({ pozitie: 11.72, brut: { buOrderData: { closedExchangeOrderCount: 3 } }, pretCurent: 29.38 }), g.contori);
  assert.equal(g.mesaje.length, 1); assert.match(g.mesaje[0].titlu, /grilă atinsă/); assert.match(g.mesaje[0].titlu, /a cumpărat/); assert.match(g.mesaje[0].titlu, /29\.38/);
  g = A.grila(BOT({ pozitie: 8.79, ordinePerechi: 1, gridProfitBrut: 0.84, brut: { buOrderData: { closedExchangeOrderCount: 4 } }, pretCurent: 30.33 }), g.contori);
  assert.equal(g.mesaje.length, 1, "o singura mesaj pe tura"); assert.match(g.mesaje[0].titlu, /✅/); assert.match(g.mesaje[0].titlu, /pereche încheiată/); assert.match(g.mesaje[0].titlu, /\+0,84 USDT/);
  const acelasi = A.grila(BOT({ pozitie: 8.79, ordinePerechi: 1, gridProfitBrut: 0.84, brut: { buOrderData: { closedExchangeOrderCount: 4 } } }), g.contori); assert.deepEqual(acelasi.mesaje, []);
});
await test("grila: mai multe umpleri intr-o tura -> un singur mesaj cu numarul; contori mai mici (bot repornit) -> reia in tacere", () => {
  const c = A.grila(BOT(), null).contori;
  const g = A.grila(BOT({ pozitie: 5.8, brut: { buOrderData: { closedExchangeOrderCount: 5 } } }), c);
  assert.equal(g.mesaje.length, 1); assert.match(g.mesaje[0].titlu, /3 grile atinse/); assert.match(g.mesaje[0].titlu, /a vândut/);
  assert.deepEqual(A.grila(BOT({ brut: { buOrderData: { closedExchangeOrderCount: 1 } } }), g.contori).mesaje, []);
  assert.deepEqual(A.grila(BOT({ brut: null }), c).mesaje, [], "fara datele brute: nu inventeaza");
});

// ---------------- (1) preturile moarte ----------------
await test("preturile: esec 10 minute la rand -> CRITIC 'nu mai primeste preturile' o data (repeta la 3 h); prima reusita -> 'primeste din nou'", () => {
  let p = A.preturi(null, { ok: false, eroare: "HTTP 500" }, T0); assert.equal(p.mesaj, null);
  p = A.preturi(p.stare, { ok: false, eroare: "HTTP 500" }, T0 + 9 * MIN); assert.equal(p.mesaj, null, "prea devreme");
  p = A.preturi(p.stare, { ok: false, eroare: "HTTP 500 · hung" }, T0 + 10 * MIN);
  assert.equal(p.mesaj.nivel, "critic"); assert.match(p.mesaj.titlu, /nu mai primește prețurile/); assert.match(p.mesaj.mesaj, /10 minute/); assert.match(p.mesaj.mesaj, /hung/);
  const anuntat = A.anuntatPreturi(p.stare, T0 + 10 * MIN);
  p = A.preturi(anuntat, { ok: false, eroare: "HTTP 500" }, T0 + 2 * ORA); assert.equal(p.mesaj, null, "s-a repetat prea des");
  p = A.preturi(p.stare, { ok: false, eroare: "HTTP 500" }, T0 + 3 * ORA + 11 * MIN); assert.ok(p.mesaj, "nu s-a repetat dupa 3 h");
  p = A.preturi(A.anuntatPreturi(p.stare, T0 + 3 * ORA + 11 * MIN), { ok: true }, T0 + 4 * ORA);
  assert.equal(p.mesaj.nivel, "info"); assert.match(p.mesaj.titlu, /din nou/); assert.equal(p.stare.reaDe, null);
});
await test("preturile: esec scurt (sub 10 min) apoi reusita -> niciun mesaj", () => {
  let p = A.preturi(null, { ok: false, eroare: "x" }, T0);
  p = A.preturi(p.stare, { ok: true }, T0 + 4 * MIN); assert.equal(p.mesaj, null); assert.equal(p.stare.reaDe, null);
});

// ---------------- (2) raportul la 3 ore ----------------
await test("raportul: la 9, 12, 15, 18, 21 (ora Romaniei) - o cheie pe interval; noaptea si intre ore -> nimic", () => {
  const la = (h, m = 5) => Date.UTC(2026, 8, 26, h - 3, m);   // septembrie = ora de vara, UTC+3
  assert.equal(A.slotRaport(la(12)), "2026-09-26 12"); assert.equal(A.slotRaport(la(21, 40)), "2026-09-26 21"); assert.equal(A.slotRaport(la(9)), "2026-09-26 09");
  for (const h of [0, 3, 6, 7, 10, 13, 23]) assert.equal(A.slotRaport(la(h)), null, "ora " + h);
});
await test("raportul: un rand pe bot (directie, total, pret in grid, lichidare) + miscarea / funding / BTC cu bulina lor; fara boti -> null", () => {
  const t = A.raportBoti([{ b: BOT(), mediu: MED() }], T0);
  assert.match(t.titlu, /Mediul boților/);
  assert.match(t.mesaj, /VVV long 4×/); assert.match(t.mesaj, /−3,11 USDT/); assert.match(t.mesaj, /27% în grid/); assert.match(t.mesaj, /lichidare la 25%/);
  assert.match(t.mesaj, /🟢 Mișcarea: liniște/); assert.match(t.mesaj, /Funding: 0,005%/); assert.match(t.mesaj, /BTC: ↔ lateral/);
  assert.ok(!/NaN|undefined|null/.test(t.mesaj), t.mesaj);
  assert.equal(A.raportBoti([], T0), null);
});

console.log(`\nALERTE_V9111 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
