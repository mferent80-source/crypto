// Probele v91 ("fa toate", 25.09 seara): socoteala sfaturilor la actiuni, raportul pentru Declaratia Unica,
// copia de siguranta nocturna a datelor Radarului, linkul spre Radar (tunelul) in rezumatul de dimineata.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= eps, `${m || ""} ${a} vs ${b}`);
const lib = (f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8");
const K = new Function(lib("grid-calcul.js") + lib("t212.js") + lib("actiuni-semnale.js") + lib("consilier.js") + "; return { Consilier, T212 };")();
const ZI = 86400000, ACUM = Date.UTC(2026, 8, 26, 6);

console.log("\nV91 · pachetul 'fa toate' · proba\n");

// ---------------- 1) socoteala sfaturilor ----------------
await test("socoteala sfaturilor: IESI a avut dreptate daca pretul a SCAZUT dupa N zile, TINE daca a CRESCUT; pe fiecare nivel si orizont (5/10/20 zile), doar cele evaluate", () => {
  const l = [
    { zi: "2026-09-01", ticker: "A", nivel: "iesi", pret: 100, p5: 95, p10: 90 },
    { zi: "2026-09-01", ticker: "B", nivel: "iesi", pret: 100, p5: 104 },
    { zi: "2026-09-01", ticker: "C", nivel: "tine", pret: 50, p5: 55, p10: 60, p20: 40 },
    { zi: "2026-09-20", ticker: "D", nivel: "atentie", pret: 10 }];
  const s = K.Consilier.socotealaSfaturi(l);
  assert.equal(s.iesi[5].n, 2); assert.equal(s.iesi[5].dreptate, 1); aprox(s.iesi[5].medie, (-0.05 + 0.04) / 2, 1e-12);
  assert.equal(s.iesi[10].n, 1); assert.equal(s.iesi[10].dreptate, 1);
  assert.equal(s.tine[5].dreptate, 1); assert.equal(s.tine[20].dreptate, 0);
  assert.equal(s.atentie[5].n, 0, "nevaluat inca");
  assert.match(s.text, /IEȘI/);
});
await test("socoteala: ce trebuie evaluat azi - intrarile cu orizontul trecut si fara pret; pretul = inchiderea primei zile de dupa orizont", () => {
  const l = [{ zi: "2026-09-10", ticker: "A_US_EQ", nivel: "iesi", pret: 100 }, { zi: "2026-09-24", ticker: "A_US_EQ", nivel: "iesi", pret: 90, p5: null }];
  const bare = [{ t: Date.UTC(2026, 8, 15, 13, 30), c: 97 }, { t: Date.UTC(2026, 8, 16, 13, 30), c: 96 }, { t: Date.UTC(2026, 8, 21, 13, 30), c: 94 }];
  const ev = K.Consilier.deEvaluat(l, { A_US_EQ: bare }, ACUM);
  assert.deepEqual(ev, [{ zi: "2026-09-10", ticker: "A_US_EQ", cheie: "p5", pret: 97 }, { zi: "2026-09-10", ticker: "A_US_EQ", cheie: "p10", pret: 94 }]);
});

// ---------------- 2) raportul pentru Declaratia Unica ----------------
await test("Declaratia Unica: pe anul inchiderii - castiguri, pierderi, net (lei, dupa comisioane), cate trade-uri, dividendele anului; Pionex separat, in USDT", () => {
  const inchise = [{ inchis: Date.UTC(2025, 11, 20), rezultat: 100, comisioane: 3 }, { inchis: Date.UTC(2026, 1, 3), rezultat: -40, comisioane: 2 }, { inchis: Date.UTC(2026, 5, 3), rezultat: 250, comisioane: 5 }];
  const div = [{ paidOn: "2026-03-01T10:00:00Z", amount: 4.5 }, { paidOn: "2025-12-01T10:00:00Z", amount: 1 }];
  const boti = [{ inchis: Date.UTC(2026, 8, 1), rezultat: -9.5 }, { inchis: Date.UTC(2026, 8, 2), rezultat: 2 }, { inchis: Date.UTC(2025, 5, 2), rezultat: 7 }];
  const r = K.T212.raportAnual({ inchise, dividende: div, boti, an: 2026 });
  assert.equal(r.an, 2026); assert.equal(r.t212.n, 2); aprox(r.t212.castiguri, 250, 1e-9); aprox(r.t212.pierderi, -40, 1e-9); aprox(r.t212.net, 210, 1e-9); aprox(r.t212.comisioane, 7, 1e-9);
  aprox(r.t212.dividende, 4.5, 1e-9); assert.equal(r.pionex.n, 2); aprox(r.pionex.net, -7.5, 1e-9);
  assert.deepEqual(r.ani, [2026, 2025]);
  assert.match(r.text, /2026/); assert.match(r.text, /210/);
});

// ---------------- 3) copia de siguranta ----------------
await test("copia de siguranta: copiaza folderul datelor intr-un folder cu data zilei; pastreaza doar ultimele N; o zi deja copiata nu se reface", async () => {
  const { faCopie } = await import("./lib/copie.mjs");
  const rad = fs.mkdtempSync(path.join(os.tmpdir(), "copie-v91-")), sursa = path.join(rad, "kv"), dest = path.join(rad, "copii");
  try {
    fs.mkdirSync(path.join(sursa, "a"), { recursive: true }); fs.writeFileSync(path.join(sursa, "a", "x.bin"), "date");
    for (const z of ["2026-09-20", "2026-09-21", "2026-09-22"]) faCopie({ sursa, dest, zi: z, pastreaza: 2 });
    assert.deepEqual(fs.readdirSync(dest).sort(), ["kv-2026-09-21", "kv-2026-09-22"]);
    assert.equal(fs.readFileSync(path.join(dest, "kv-2026-09-22", "a", "x.bin"), "utf8"), "date");
    assert.equal(faCopie({ sursa, dest, zi: "2026-09-22", pastreaza: 2 }).facut, false, "aceeasi zi -> nimic");
    assert.equal(faCopie({ sursa: path.join(rad, "nu-exista"), dest, zi: "2026-09-23", pastreaza: 2 }).facut, false);
  } finally { fs.rmSync(rad, { recursive: true, force: true }); }
});

// ---------------- 5) linkul spre Radar in rezumat ----------------
await test("linkul tunelului: ultima adresa trycloudflare din jurnalul tunelului; in rezumatul de dimineata ca rand cu 🔗", () => {
  assert.equal(K.Consilier.adresaTunel("INF | https://vechi-a-b.trycloudflare.com\nceva\nINF | https://nou-c-d.trycloudflare.com  |"), "https://nou-c-d.trycloudflare.com");
  assert.strictEqual(K.Consilier.adresaTunel("nimic aici"), null);
  const r = K.Consilier.rezumatDimineata({ acum: ACUM, link: "https://nou-c-d.trycloudflare.com" });
  assert.match(r.linii.join(" | "), /🔗 Radarul pe telefon: https:\/\/nou-c-d\.trycloudflare\.com/);
});

// ---------------- ruta: socoteala sfaturilor (KV) ----------------
const TOKEN = "proba-token-1234567890";
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
let ip = 0;
async function ruta(met, qs, env, corp) {
  const m = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.91.0." + (++ip % 250), origin: "https://exemplu.test", "content-type": "application/json" };
  const req = new Request(`https://exemplu.test/api/t212?${qs}`, met === "POST" ? { method: "POST", headers: h, body: JSON.stringify(corp) } : { headers: h });
  const res = await (met === "POST" ? m.onRequestPost : m.onRequestGet)({ request: req, env });
  let c = null; try { c = JSON.parse(await res.text()); } catch {}
  return { status: res.status, corp: c };
}
await test("ruta sfaturi: intrarile zilei (o data pe zi pe actiune), evaluarile completeaza p5/p10/p20; nivel necunoscut -> ignorat", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  await ruta("POST", "action=sfaturi", env, { intrari: [{ zi: "2026-09-25", ticker: "AVGO_US_EQ", nivel: "iesi", pret: 353 }, { zi: "2026-09-25", ticker: "X_US_EQ", nivel: "hack", pret: 1 }] });
  await ruta("POST", "action=sfaturi", env, { intrari: [{ zi: "2026-09-25", ticker: "AVGO_US_EQ", nivel: "iesi", pret: 350 }] });
  await ruta("POST", "action=sfaturi", env, { evaluari: [{ zi: "2026-09-25", ticker: "AVGO_US_EQ", cheie: "p5", pret: 340 }, { zi: "2026-09-25", ticker: "AVGO_US_EQ", cheie: "p99", pret: 1 }] });
  const g = await ruta("GET", "action=sfaturi", env);
  assert.equal(g.status, 200); assert.equal(g.corp.sfaturi.length, 1);
  assert.deepEqual(g.corp.sfaturi[0], { zi: "2026-09-25", ticker: "AVGO_US_EQ", nivel: "iesi", pret: 353, p5: 340 });
});

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
