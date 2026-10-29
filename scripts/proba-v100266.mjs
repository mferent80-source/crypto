// Proba v100.266 (29.10, el: „fa ideile”) - ideile F6–F8:
//  F6 alerta „funding-ul s-a întors împotriva botului” (Pionex, două plăți la rând, ≥ 0,005% pe plată; tace cât vorbește m-funding, mai tare)
//  F7 proba pe date noi: colectorul ține un rând pe oră pe monedă, iar evaluarea ia UN rând pe monedă pe zi (fără suprapunere), unitatea = ziua,
//     verdict abia de la 30 de zile, cu limita de detecție spusă - protocolul scris ÎNAINTE de date (ipoteza: „înghesuit” ⇒ 24 h mai slabe)
//  F8 tabelul futures pe monedele tale (cele 20 măsurate + boții), din aceleași reguli.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import "./lib/text-ro-global.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
const lib = (f, n) => new Function(citeste("public", "lib", f) + "; return " + n + ";")();
const FC = () => lib("futures-citire.js", "FuturesCitire");
console.log("\nV100.266 · IDEILE F6–F8 · proba\n");

// ---------------------------------------------------------------- F6
await test("F6 IndicatoriBot.mediu: rândul de funding spune dacă botul plătește și dacă două plăți la rând au fost contra lui", () => {
  const IB = lib("indicatori-bot.js", "IndicatoriBot");
  const fl = (m) => m.find((x) => x.k === "funding");
  const lng = fl(IB.mediu({ funding: { rate: 0.0002, hist: [0.0002, 0.00015, -0.0001], intervalOre: 4 } }, "long"));
  assert.equal(lng.botPlateste, true); assert.equal(lng.doi, true); assert.equal(lng.rata, 0.0002); assert.equal(lng.ore, 4);
  const sh = fl(IB.mediu({ funding: { rate: 0.0002, hist: [0.0002, 0.00015], intervalOre: 4 } }, "short"));
  assert.equal(sh.botPlateste, false);
  const unu = fl(IB.mediu({ funding: { rate: 0.0002, hist: [0.0002, -0.0001], intervalOre: 4 } }, "long"));
  assert.equal(unu.doi, false);
});
const ctxF = (x) => ({ mediu: [Object.assign({ k: "funding", text: "0,020% la 4h · plătesc long (tu plătești)", ton: "neutru", botPlateste: true, doi: true, rata: 0.0002, ore: 4 }, x)] });
await test("F6 Alerte: „funding-ul s-a întors” la două plăți contra botului; tace sub 0,005%, la o singură plată și când m-funding e deja aprinsă", () => {
  const A = lib("alerte.js", "Alerte"), b = { id: 1, baza: "COTI.PERP", directie: "long" };
  const r = A.reguli(b, ctxF({}), {});
  assert.equal(r["m-funding-intors"].nivel, "atentie"); assert.match(r["m-funding-intors"].titlu, /^COTI: funding-ul s-a întors, acum botul plătește$/);
  assert.equal(A.reguli(b, ctxF({ rata: 0.00003 }), {})["m-funding-intors"].nivel, "ok");
  assert.equal(A.reguli(b, ctxF({ doi: false }), {})["m-funding-intors"].nivel, "ok");
  assert.equal(A.reguli(b, ctxF({ botPlateste: false }), {})["m-funding-intors"].nivel, "ok");
  assert.equal(A.reguli(b, ctxF({ ton: "atentie" }), {})["m-funding-intors"], null);
  assert.equal(A.reguli(b, { mediu: [{ k: "funding", text: "n-am rata de la Pionex", ton: "neutru" }] }, {})["m-funding-intors"], null);
});
await test("F6 se trimite o dată, se repetă cel mult o dată pe zi; „a trecut” după ce botul nu mai plătește", () => {
  const A = lib("alerte.js", "Alerte"), b = { id: 1, baza: "COTI.PERP", directie: "long" }, T = 1793260800000;
  const e1 = A.evalueaza(b, ctxF({}), {}, T);
  assert.ok(e1.mesaje.some((m) => m.cheie === "m-funding-intors"));
  const e2 = A.evalueaza(b, ctxF({}), e1.stare, T + 6 * 3600000);
  assert.ok(!e2.mesaje.some((m) => m.cheie === "m-funding-intors"), "repetat sub 24 h");
  const e3 = A.evalueaza(b, ctxF({}), e1.stare, T + 25 * 3600000);
  assert.ok(e3.mesaje.some((m) => m.cheie === "m-funding-intors"), "nerepetat după 24 h");
  const e4 = A.evalueaza(b, ctxF({ botPlateste: false }), e1.stare, T + 3600000), e5 = A.evalueaza(b, ctxF({ botPlateste: false }), e4.stare, T + 3600000 + 11 * 60000);
  assert.ok(e5.mesaje.some((m) => m.cheie === "m-funding-intors" && m.nivel === "info"));
});

// ---------------------------------------------------------------- F7
const ZI = 86400000, T0 = Date.UTC(2026, 9, 1);
// rânduri [t, simbol, mark, ctx, fr8, lsPct]; ctx: "C" = longurile înghesuite, "K" = shorturile înghesuite, "B" = echilibrat
// prețul = 100 · exp(suma pașilor orari); zgomotul e pe (monedă, zi), cu medie zero pe un ciclu de 5 zile - efectul nul dă „nu se vede”
function sintetic(zile, efect) {
  const r = [];
  for (const s of ["AAAUSDT", "BBBUSDT", "CCCUSDT"]) {
    const ctx = s === "AAAUSDT" ? "C" : s === "BBBUSDT" ? "K" : "B";
    let log = 0;
    for (let d = 0; d < zile; d++) {
      const zgomot = (((d * 7 + s.charCodeAt(0)) % 5) - 2) * 0.001, pas = ((ctx === "C" ? -efect : ctx === "K" ? efect : 0) + zgomot) / 24;
      for (let h = 0; h < 24; h++) { r.push([T0 + d * ZI + h * 3600000, s, 100 * Math.exp(log), ctx, 0.0001, 50]); log += pas; }
    }
  }
  return r;
}
await test("F7 evaluarea: sub 30 de zile „strâng date”; cu efect mare pe 40 de zile se vede, în sensul ipotezei, cu IC și limita de detecție", () => {
  const F = FC();
  const mic = F.evalForward(sintetic(10, 0.01), T0 + 11 * ZI);
  assert.equal(mic.parti.CROWDED.verdict, "strâng date"); assert.ok(mic.parti.CROWDED.zile >= 8 && mic.parti.CROWDED.zile <= 10);
  const mare = F.evalForward(sintetic(41, 0.01), T0 + 42 * ZI);
  // 41 de zile: și ultima are întoarcerea (la 23 h, în toleranța „24 h ± 1 h” scrisă în protocol)
  assert.equal(mare.parti.CROWDED.zile, 41); assert.equal(mare.parti.CROWDED.verdict, "se vede pe date noi");
  assert.ok(mare.parti.CROWDED.medie < -0.005 && mare.parti.CROWDED.ciHi < 0);
  assert.equal(mare.parti["CONTRARIAN +"].verdict, "se vede pe date noi"); assert.ok(mare.parti["CONTRARIAN +"].ciLo > 0);
  assert.ok(Number.isFinite(mare.parti.CROWDED.mde) && mare.parti.CROWDED.mde > 0);
  const zero = F.evalForward(sintetic(41, 0), T0 + 42 * ZI);
  assert.equal(zero.parti.CROWDED.verdict, "nu se vede");
});
await test("F7 fără privit în viitor: tăiat la ziua 20, diferențele zilelor 0–18 sunt aceleași ca pe tot setul (proba de trunchiere)", () => {
  const F = FC(), tot = sintetic(41, 0.01);
  const a = F.evalForward(tot, T0 + 42 * ZI).zileC, b = F.evalForward(tot.filter((r) => r[0] < T0 + 20 * ZI), T0 + 20 * ZI).zileC;
  for (let d = 0; d <= 18; d++) assert.equal(b[d], a[d], "ziua " + d);
  // rânduri de după „acum” nu se folosesc nici dacă stau în fișier: „acum” = ziua 20 ⇒ cel mult 20 de zile cu întoarcere
  assert.ok(F.evalForward(tot, T0 + 20 * ZI).parti.CROWDED.zile <= 20);
});
await test("F7 un singur rând pe monedă pe zi (prima oră a zilei UTC, până la 03:00), întoarcerea la 24 h ± 1 h; textul cartelei", () => {
  const F = FC(), r = sintetic(35, 0.01).filter((x) => new Date(x[0]).getUTCHours() !== 0);   // fără ora 00 ⇒ ia ora 01
  const e = F.evalForward(r, T0 + 36 * ZI);
  assert.ok(e.parti.CROWDED.zile >= 33, String(e.parti.CROWDED.zile));
  // 3 monede × 34 de zile: ultima zi (eșantion la 01:00) n-are întoarcere - a doua zi nu există nici 00:00, nici 02:00
  assert.equal(e.esantion, 3 * 34, "un singur rând pe monedă pe zi (fără ferestre suprapuse)");
  const t = F.subForward(e);
  assert.match(t, /din 01\.10/); assert.match(t, /Longurile înghesuite/); assert.match(t, /IC95/); assert.match(t, /poate prinde doar/);
  assert.match(F.subForward(null), /încă nimic/);
  assert.doesNotMatch(t, /NaN|undefined|null/);
});
await test("F7 colectorul: un rând pe monedă din răspunsul serverului, fișierul crește, rândurile peste 120 de zile ies, rezumatul pleacă la server", async () => {
  const { turaFuturesProba } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "futures-proba.mjs")).href);
  const fisier = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fp-")), "futures-jurnal.jsonl"), acum = Date.UTC(2026, 9, 29, 10, 20);
  fs.writeFileSync(fisier, JSON.stringify([acum - 130 * ZI, "OLDUSDT", 1, "B", 0, 50]) + "\n");
  const trimise = [];
  const r = await turaFuturesProba({ F: FC(), fisier, acum, univers: ["COTIUSDT", "NOPEUSDT"], jurnal() {},
    cere: async (u) => /NOPE/.test(u) ? { faraContract: true } : { funding: -0.0002, fundingIntervalHours: 4, longShort: 1.29, lsIst: Array.from({ length: 100 }, (_, i) => [i, 1 + i / 100]), markPrice: 0.0101, simbol: "COTIUSDT" },
    trimite: async (c, corp) => { trimise.push([c, corp]); return { ok: true }; } });
  const linii = fs.readFileSync(fisier, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(linii.length, 1); assert.equal(linii[0][1], "COTIUSDT"); assert.equal(linii[0][0], Date.UTC(2026, 9, 29, 10)); assert.equal(linii[0][3], "K");
  assert.equal(r.randuri, 1);
  assert.equal(trimise.length, 1); assert.equal(trimise[0][0], "/api/istoric-bot?action=futuresProba"); assert.ok(trimise[0][1].rezumat && trimise[0][1].la === acum);
});
await test("F7 colectorul cheamă tura o dată pe oră, cu futures-citire.js încărcat", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /incarca\("futures-citire\.js", "FuturesCitire"\)/);
  assert.match(c, /if \(val\.grele\) turaFuturesProbaColector\(\)\.catch/);
  assert.match(c, /FUTURES_PROBA_MS = 3600000/);
});
await test("F7 serverul: istoric-bot?action=futuresProba ține rezumatul curățat (numere, verdicte scurte) și îl dă înapoi", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const H = { authorization: "Bearer proba-token-1234567890", origin: "https://exemplu.test", "content-type": "application/json" };
  const rez = { la: 5, deLa: "2026-10-01", zile: 40, monede: 20, parti: { CROWDED: { zile: 40, medie: -0.01, ciLo: -0.02, ciHi: -0.001, mde: 0.004, verdict: "se vede pe date noi", rau: "<b>x</b>".repeat(50) }, "CONTRARIAN +": { zile: 3, medie: 0.001, ciLo: null, ciHi: null, mde: null, verdict: "strâng date" } } };
  const p = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=futuresProba", { method: "POST", headers: H, body: JSON.stringify({ la: 7, rezumat: rez }) }), env });
  assert.equal(p.status, 200, await p.clone().text());
  const g = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=futuresProba", { headers: H }), env });
  const j = await g.json();
  assert.equal(j.futuresProba.parti.CROWDED.verdict, "se vede pe date noi"); assert.equal(j.futuresProba.zile, 40);
  assert.equal(j.futuresProba.parti.CROWDED.rau, undefined, "câmp străin păstrat");
});

// ---------------------------------------------------------------- F8
await test("F8 universul: cele 20 de monede măsurate + boții (PEPE.PERP ⇒ PEPEUSDT, fără dubluri, doar litere și cifre)", () => {
  const F = FC();
  const u = F.univers([{ baza: "COTI.PERP", quote: "USDT" }, { baza: "PEPE.PERP", quote: "USDT" }, { baza: "X<Y.PERP" }]);
  assert.ok(u.includes("BTCUSDT") && u.includes("COTIUSDT") && u.includes("PEPEUSDT"));
  assert.equal(u.filter((s) => s === "COTIUSDT").length, 1); assert.ok(u.every((s) => /^[A-Z0-9]+USDT$/.test(s)), u.join(","));
});
await test("F8 tabelul: un rând pe monedă din răspunsul serverului, sortat după funding-ul la 8 h, fără HTML străin", () => {
  const F = FC();
  const r1 = F.randTabel({ simbol: "COTIUSDT", funding: -0.0002, fundingIntervalHours: 4, longShort: 1.29, lsIst: Array.from({ length: 100 }, (_, i) => [i, 1 + i / 100]), markPrice: 101, indexPrice: 100 });
  const r2 = F.randTabel({ simbol: "BTCUSDT", funding: 0.0001, fundingIntervalHours: 8, longShort: 1.7 });
  assert.ok(Math.abs(r1.fr8 - -0.0004) < 1e-12); assert.equal(r1.ctx, "CONTRARIAN +"); assert.ok(Math.abs(r1.prima - 100) < 1e-9);
  const h = F.tabelHtml([r2, r1, F.randTabel({ simbol: "X<script>", faraContract: true })]);
  assert.ok(h.indexOf("COTIUSDT") < h.indexOf("BTCUSDT"), "sortare după |funding la 8 h|");
  assert.doesNotMatch(h, /<script>/); assert.match(h, /fără contract/);
  // și tabelHtml singur curăță simbolul (nu doar randTabel)
  assert.doesNotMatch(F.tabelHtml([{ simbol: "<img src=x onerror=1>", fr8: 0.0001, cost: 0.3, ore: 8, ctx: "BALANCED", lsPct: 50, prima: 1 }]), /<img/);
  assert.equal((h.match(/<tr>/g) || []).length, 4);
});
await test("F8 + F7 pe pagină: tabelul și proba (cartela) stau în #deriv; butonul cheamă futuresTabel(); deschiderea paginii citește proba", () => {
  const html = citeste("public", "index.html"), app = citeste("public", "app.js");
  const d = html.slice(html.indexOf('id="deriv"'), html.indexOf('id="edgepro"'));
  for (const id of ["fTabel", "fProba"]) assert.match(d, new RegExp('id="' + id + '"'), id);
  assert.match(d, /data-action-click="futuresTabel\(\)"/);
  assert.match(app, /async function futuresTabel\(\)\{/); assert.match(app, /async function futuresProbaArata\(\)\{/);
  assert.match(app, /else if\(id==="deriv"\)\{derivatives\(\);futuresProbaArata\(\)\.catch\(\(\)=>\{\}\)\}/);
});
await test("versiunea ≥ v100.266 peste tot, colectorul ≥ v101.142, nota în BUILD_INFO, proba în lanț", () => {
  const P = JSON.parse(citeste("package.json")), ver = Number(P.version.split(".")[1]), V = "v100." + ver;
  assert.ok(ver >= 266, V); const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, V); assert.match(String(bi.features.idei266), /întors/);
  assert.ok(citeste("public", "sw.js").startsWith('const CACHE="crypto-radar-v100-' + ver + '";'));
  const mv = citeste("scripts", "colector.mjs").match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/); assert.ok(mv && Number(mv[1]) >= 142, mv && mv[1]);
  assert.equal(P.scripts["test:v100266"], "node scripts/proba-v100266.mjs"); assert.match(P.scripts.test, /npm run test:v100266/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
