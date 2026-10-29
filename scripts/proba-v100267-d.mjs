// Proba v100.267-d (auditul 29.10, felia 4 🟡): Binance fără răcire pe serverul Radarului.
// /api/market?type=futures trage ~8 cereri Binance pe fiecare apel (pagina, colectorul, tabelul F8). Un 429 (prea multe cereri) sau un 418
// (IP-ul e deja interzis) nu oprea nimic: cererile următoare plecau la fel, iar la 418 fiecare cerere în plus LUNGEȘTE interdicția IP-ului.
// Acum: după 429/418 de la Binance, serverul nu mai trimite nimic spre fapi.binance.com până trece pauza (retry-after; cel puțin 60 s la 429,
// 5 min la 418); refuzul se spune în `probleme`, nu se ascunde. Ceasul se mută din Date.now (modulul citește ora la fiecare cerere).
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  try { await f(); console.log(`  ok   ${nume}`); }
  catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }
}
console.log("\nV100.267-d · AUDITUL 29.10 · răcirea Binance pe server\n");

const TOKEN = "proba-token-1234567890";
const ceasReal = Date.now; let ceas = Date.parse("2026-10-29T12:00:00Z");
Date.now = () => ceas;
const modul = () => import(pathToFileURL(path.join(RAD, "functions", "api", "market.js")).href + "?t=" + ceasReal() + Math.random());
async function cere(mod, raspuns, simbol = "BTCUSDT") {
  const cerute = [];
  globalThis.fetch = async (url) => {
    url = String(url); cerute.push(url);
    const r = raspuns(url) || {};
    return new Response(r.corp ?? "{}", { status: r.status ?? 200, headers: Object.assign({ "content-type": "application/json" }, r.antete || {}) });
  };
  const res = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/market?type=futures&symbol=" + simbol, { headers: { authorization: `Bearer ${TOKEN}` } }), env: { APP_API_TOKEN: TOKEN } });
  return { corp: JSON.parse(await res.text()), binance: cerute.filter((u) => /binance\.com/.test(u)) };
}
const bun = (url) => {
  if (/fundingInfo/.test(url)) return { corp: '[{"symbol":"BTCUSDT","fundingIntervalHours":8}]' };
  if (/premiumIndex/.test(url)) return { corp: '{"markPrice":"100","indexPrice":"100","lastFundingRate":"0.0001","nextFundingTime":1793275200000}' };
  if (/openInterest\?/.test(url)) return { corp: '{"openInterest":"1000"}' };
  if (/fundingRate\?/.test(url)) return { corp: "[]" };
  return { corp: "[]" };
};
const refuz = (status, antete) => (url) => (/premiumIndex/.test(url) ? { status, corp: '{"code":-1003,"msg":"Way too many requests"}', antete } : bun(url));

await test("1a 418 (IP interzis) cu retry-after 120 ⇒ cererea următoare NU mai pleacă spre Binance; refuzul se spune în probleme", async () => {
  const mod = await modul();
  const a = await cere(mod, refuz(418, { "retry-after": "120" }));
  assert.ok(a.binance.length > 0, "premisa: prima cerere a ajuns la Binance");
  assert.match(String(a.corp.probleme && a.corp.probleme.funding), /418/);
  ceas += 30000;
  const b = await cere(mod, bun);
  assert.deepEqual(b.binance, [], "după 418 au mai plecat " + b.binance.length + " cereri spre Binance (interdicția se lungește)");
  assert.match(JSON.stringify(b.corp.probleme || {}), /răcire/i, "răcirea nu se spune: " + JSON.stringify(b.corp));
});
await test("1b după pauză (retry-after trecut, cel puțin 5 min la 418) cererile pleacă din nou", async () => {
  const mod = await modul();
  await cere(mod, refuz(418, { "retry-after": "120" }));
  ceas += 200000; const b = await cere(mod, bun);
  assert.deepEqual(b.binance, [], "la 418 pauza e cel puțin 5 min, chiar dacă retry-after zice 120 s");
  ceas += 120000; const c = await cere(mod, bun);
  assert.ok(c.binance.length >= 5, "după pauză trebuiau să plece cererile (" + c.binance.length + ")");
  assert.equal(c.corp.funding, 0.0001); assert.equal(c.corp.probleme, undefined);
});
await test("1c 429 fără retry-after ⇒ cel puțin 60 s fără cereri; la 61 s pleacă", async () => {
  const mod = await modul();
  await cere(mod, refuz(429, {}));
  ceas += 59000; assert.deepEqual((await cere(mod, bun)).binance, [], "înainte de 60 s");
  ceas += 2000; assert.ok((await cere(mod, bun)).binance.length >= 5, "după 60 s");
});
await test("1d 403 (Binance refuză Cloudflare, măsurat 22.09) NU pune răcire - nu e o limită de cereri", async () => {
  const mod = await modul();
  await cere(mod, refuz(403, {}));
  ceas += 1000; assert.ok((await cere(mod, bun)).binance.length >= 5);
});
await test("1e răcirea ține și pentru celelalte monede și pentru lista intervalelor (fundingInfo) - e IP-ul, nu moneda", async () => {
  const mod = await modul();
  await cere(mod, refuz(429, { "retry-after": "90" }));
  ceas += 10000; const b = await cere(mod, bun, "ETHUSDT");
  assert.deepEqual(b.binance, [], "pe ETH au plecat " + b.binance.join(", "));
});

Date.now = ceasReal;

// ---------------------------------------------------------------- 2. alertele critice nu se repetă noaptea (felia 5 🟡)
// Cheia alertelor planului T212 era ziua UTC: la 00:00 UTC (02/03 RO) aceeași „stop atins / −15% de la maxim” pleca din nou CRITIC, cu bursa
// închisă și prețul neschimbat (BE/STX/APLD pe 25–28.10). Acum cheia e ziua ȘEDINȚEI bursei simbolului: se repetă la deschiderea următoare.
const { turaPlanuri } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-t212.mjs")).href);
const { CalendarBursa } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "calendar-bursa.mjs")).href);
await import("./lib/text-ro-global.mjs");
const fs = await import("node:fs");
const AS = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "actiuni-semnale.js"), "utf8") + "; return ActiuniSemnale;")();
const T212 = { simbol: (t) => String(t).split("_")[0] };
async function planuri(acum, stare, trimise) {
  return turaPlanuri({ acum, stare, ActiuniSemnale: AS, T212, jurnal: () => {},
    cerePozitii: async () => [{ ticker: "APLD_US_EQ", quantity: 3, averagePrice: 30, currentPrice: 25.2, initialFillDate: "2026-10-01T15:00:00Z" }],
    cerePlan: async () => ({ stop: 26 }), cereBare: async () => [],
    trimite: async (m, cheie) => { trimise.push({ t: new Date(acum).toISOString(), cheie, nivel: m.nivel }); return true; } });
}
await test("2a stopul atins marți seara (20:00 New York): NU se repetă la 00:00 UTC (02/03 RO), cu bursa închisă și prețul neschimbat", async () => {
  const stare = {}, trimise = [];
  await planuri(Date.parse("2026-10-27T19:30:00Z"), stare, trimise);   /* marți 15:30 NY, în ședință */
  assert.equal(trimise.length, 1, "premisa: alerta stopului pleacă");
  await planuri(Date.parse("2026-10-28T00:05:00Z"), stare, trimise);   /* 02:05 RO, bursa închisă */
  await planuri(Date.parse("2026-10-28T09:00:00Z"), stare, trimise);   /* dimineața, înainte de deschidere */
  assert.equal(trimise.length, 1, "alerta s-a repetat noaptea: " + JSON.stringify(trimise));
});
await test("2b cât prețul stă sub stop, alerta se repetă la ședința URMĂTOARE (deschiderea de miercuri), nu în weekend", async () => {
  const stare = {}, trimise = [];
  await planuri(Date.parse("2026-10-27T19:30:00Z"), stare, trimise);
  await planuri(Date.parse("2026-10-28T13:45:00Z"), stare, trimise);   /* miercuri 09:45 NY, după deschidere */
  assert.equal(trimise.length, 2, "la ședința următoare trebuia repetată: " + JSON.stringify(trimise));
  const v = [], s2 = {};
  await planuri(Date.parse("2026-10-30T19:30:00Z"), s2, v);            /* vineri */
  await planuri(Date.parse("2026-10-31T12:00:00Z"), s2, v); await planuri(Date.parse("2026-11-01T12:00:00Z"), s2, v);   /* sâmbătă, duminică */
  assert.equal(v.length, 1, "repetată în weekend: " + JSON.stringify(v));
  assert.equal(CalendarBursa.ziSesiune(Date.parse("2026-11-01T12:00:00Z"), "APLD_US_EQ"), "2026-10-30");
});

await test("2c frâna contului: prima alertă pleacă oricând; repetarea din ziua următoare abia de la 8 RO (pleca la 00:00, critic)", async () => {
  const S = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "sanatate-colector.mjs")).href);
  assert.equal(typeof S.repetaZilnicDeLa8, "function", "lipsește regula");
  assert.equal(S.repetaZilnicDeLa8(undefined, "2026-10-29", 0.1), true, "prima dată, și la miezul nopții");
  assert.equal(S.repetaZilnicDeLa8("2026-10-28", "2026-10-29", 0.1), false, "repetarea de ieri la 00:06");
  assert.equal(S.repetaZilnicDeLa8("2026-10-28", "2026-10-29", 7.9), false);
  assert.equal(S.repetaZilnicDeLa8("2026-10-28", "2026-10-29", 8), true, "de la 8 RO se repetă");
  assert.equal(S.repetaZilnicDeLa8("2026-10-29", "2026-10-29", 15), false, "o dată pe zi");
  assert.equal(S.repetaZilnicDeLa8("2026-10-20", "2026-10-29", 2), true, "starea revenită după zile = alertă nouă, oricând");
  assert.equal(S.repetaZilnicDeLa8("2026-10-31", "2026-11-01", 3), false, "peste trecerea la ora de iarnă / lună");
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /f\.activa && S\.repetaZilnicDeLa8\(m\.franaZi, zi, /, "colectorul nu folosește regula la frână");
});

// ---------------------------------------------------------------- 3. fără internet: fără bucle (felia 5 🟡)
// 28.10, 15:11–20:04Z: 11.077 de rânduri în jurnal (lățime 5.825, poza 2.080, curs BNR 450) ⇒ 1,06 MB, rotirea a scos o generație de istoric.
const S5 = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "sanatate-colector.mjs")).href);
const COL = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
await test("3a poza picată: încercarea următoare peste 1, 2, 4, 8, apoi cel mult 10 min - nu la fiecare buclă (pozaLa = acum − 4 min, la un ritm de 3 min ⇒ imediat)", () => {
  assert.equal(typeof S5.pozaLaDupaEsec, "function", "lipsește regula");
  const acum = Date.parse("2026-10-28T16:00:00Z"), I = 3 * 60000;
  const peste = (n) => (S5.pozaLaDupaEsec(acum, I, n) + I) - acum;   /* tura pleacă când acum − pozaLa ≥ I */
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(peste), [60000, 120000, 240000, 480000, 600000, 600000]);
  assert.match(COL, /pozaEsecuri\+\+; pozaLa = S\.pozaLaDupaEsec\(Date\.now\(\), plan\.intervalMs, pozaEsecuri\)/, "colectorul nu folosește regula la poza picată");
  assert.match(COL, /pozaEsecuri = 0;/, "numărătoarea nu se golește după o poză reușită");
});
await test("3b cursul BNR: după un eșec (sau un răspuns gol) pauză de 10 min și când n-a avut niciodată curs (condiția `&& bnrMemo.v` o sărea)", () => {
  assert.equal(typeof S5.bnrDeCerut, "function", "lipsește regula");
  const T = Date.parse("2026-10-28T16:00:00Z");
  assert.equal(S5.bnrDeCerut({ la: 0, v: null }, T), true, "prima dată se cere");
  assert.equal(S5.bnrDeCerut({ la: 0, v: null, eroareLa: T - 60000 }, T), false, "fără curs, la 1 min după eșec: se cerea din nou");
  assert.equal(S5.bnrDeCerut({ la: 0, v: null, eroareLa: T - 601000 }, T), true);
  assert.equal(S5.bnrDeCerut({ la: T - 3600000, v: { curs: 4.4 } }, T), false, "cursul de acum o oră ajunge");
  assert.equal(S5.bnrDeCerut({ la: T - 7 * 3600000, v: { curs: 4.4 } }, T), true);
  assert.match(COL, /if \(!S\.bnrDeCerut\(bnrMemo, Date\.now\(\)\)\) return bnrMemo\.v;/, "colectorul nu folosește regula");
});
await test("3c lățimea: rețeaua moartă (5 cereri la rând fără niciun răspuns HTTP) oprește tura - nu 300 de cereri × 3 încercări și 300 de rânduri", async () => {
  const { cereBinance } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-latime.mjs")).href);
  let n = 0; const jurnal = [];
  const b = cereBinance({ fetch: async () => { n++; throw new TypeError("fetch failed"); }, pauza: async () => {}, jurnal: (...a) => jurnal.push(a.join(" ")), ceas: () => Date.parse("2026-10-28T16:00:00Z") });
  for (let i = 0; i < 300; i++) assert.equal(await b("https://fapi.binance.com/fapi/v1/klines?symbol=S" + i), null);
  assert.ok(n <= 15, "au plecat " + n + " cereri fără rețea");
  assert.ok(jurnal.length <= 7, "jurnal: " + jurnal.length + " rânduri");
  assert.match(String(b.stare.oprit), /rețea/i);
  assert.equal(b.reia(), true, "tura următoare încearcă din nou (rețeaua poate reveni)");
});
await test("3d lățimea: un eșec izolat nu oprește tura (un răspuns HTTP între ele golește numărătoarea)", async () => {
  const { cereBinance } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-latime.mjs")).href);
  let merge = false;
  const b = cereBinance({ fetch: async () => { if (merge) return new Response("[]", { status: 200 }); throw new TypeError("fetch failed"); }, pauza: async () => {}, jurnal: () => {}, ceas: () => 0 });
  for (let i = 0; i < 4; i++) await b("https://fapi.binance.com/a" + i);
  assert.equal(b.stare.oprit, null, "4 cereri picate nu sunt încă rețea moartă");
  merge = true; assert.deepEqual(await b("https://fapi.binance.com/ok"), []); merge = false;
  for (let i = 0; i < 4; i++) await b("https://fapi.binance.com/b" + i);
  assert.equal(b.stare.oprit, null, "4 + 4 picate cu un răspuns între ele: numărătoarea trebuia golită de răspuns");
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
