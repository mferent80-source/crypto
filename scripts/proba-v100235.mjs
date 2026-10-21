// Proba v100.235 (21.10, el: „amprenta”): semnul funding-ului deja măsurat
// ajunge la gura care invită. Pragul 3× rămâne. Bursa și gura roșie nu-l iau.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { mesajFundingPiata } from "./lib/tura-piata.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "acasa.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.235 · SEMN · proba\n");

const acasa = citeste("public", "lib", "acasa.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const tp = citeste("scripts", "lib", "tura-piata.mjs");
const idx = citeste("public", "index.html");
const col = citeste("scripts", "colector.mjs");
const lin = () => AC.vreme({ clasament: { evita: 10, candidati: 90, dir: { long: 45, short: 45, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
const ros = () => AC.vreme({ clasament: { evita: 70, candidati: 30, dir: { long: 45, short: 45, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
const sus = (i) => 100 + i * 0.2;
const serie = (f) => Array.from({ length: 260 }, (_, i) => ({ c: f(i) }));
const larga = () => AC.vremeBursa({ qqq: serie(sus), vix: 14, ndx: { e50: 70, n: 100 } });
const LONG = "N-aș porni boți noi: longul plătește un funding mult peste obicei.";
const SHORT = "N-aș porni boți noi: shortul plătește un funding mult peste obicei.";
const fLong = () => Array.from({ length: 10 }, (_, i) => ({ s: "L" + i, rate: 0.0004, hist: Array.from({ length: 8 }, () => 0.00005) }));
const fShort = () => Array.from({ length: 10 }, (_, i) => ({ s: "S" + i, rate: -0.0004, hist: Array.from({ length: 8 }, () => -0.00005) }));
const fCalm = () => Array.from({ length: 10 }, (_, i) => ({ s: "C" + i, rate: 0.00005, hist: Array.from({ length: 8 }, () => 0.00005) }));

await test("semnul funding-ului: long rămâne long, short nu mai spune long, minusul e „−”", () => {
  const a = AC.fundingPiata(fLong()), b = AC.fundingPiata(fShort()), c = AC.fundingPiata(fCalm());
  assert.equal(a.ton, "atentie");
  assert.match(a.text, /înghesuit pe long/);
  assert.doesNotMatch(a.text, /înghesuit pe short/);
  assert.equal(b.ton, "atentie");
  assert.ok(b.mediana < 0);
  assert.match(b.text, /înghesuit pe short/);
  assert.doesNotMatch(b.text, /înghesuit pe long/);
  assert.match(b.text, /−0,040%/);
  assert.doesNotMatch(b.text, /(^|[\s(·:])-\d/);
  assert.equal(c.ton, "neutru");
  assert.equal(AC.fundingAtentie(a), "long");
  assert.equal(AC.fundingAtentie(b), "short");
  assert.equal(AC.fundingAtentie(c), "");
  assert.equal(AC.fundingAtentie(null), "");
  assert.equal(AC.fundingAtentie({ ton: "atentie", mediana: 0 }), "");
});

await test("gura care invită aude semnul; pauza, cantitatea, VaR-ul și evenimentul rămân înainte; bursa și roșul nu-l iau", () => {
  const ok = { raportStare: "ok", raport: { valoare: { total: 100000 }, risc: { var95: 1000 }, reconciliere: { t212: { abateri: [] } } } };
  assert.equal(AC.franaVerb(lin(), Object.assign({ fundingAtentie: "long" }, ok)).faCe, LONG);
  assert.equal(AC.franaVerb(lin(), Object.assign({ fundingAtentie: "short" }, ok)).faCe, SHORT);
  assert.ok(LONG.length <= 110 && SHORT.length <= 110);
  assert.match(AC.franaVerb(lin(), Object.assign({ fundingAtentie: "long", pauza: true, pauzaN: 3 }, ok)).faCe, /alt bot azi/);
  assert.match(AC.franaVerb(lin(), { fundingAtentie: "long", raportStare: "ok", raport: { reconciliere: { t212: { abateri: [{ ticker: "AAPL" }] } }, valoare: { total: 100000 }, risc: { var95: 1000 } } }).faCe, /jurnalul nu se potrivește/);
  assert.match(AC.franaVerb(lin(), { fundingAtentie: "short", raportStare: "ok", raport: { valoare: { total: 100000 }, risc: { var95: 5000 } } }).faCe, /^Aș reduce/);
  assert.match(AC.franaVerb(lin(), Object.assign({ fundingAtentie: "long", eveniment: "CPI m/m" }, ok)).faCe, /chiar înainte de CPI/);
  assert.equal(AC.franaVerb(ros(), Object.assign({ fundingAtentie: "long" }, ok)).faCe, ros().faCe);
  assert.match(AC.franaVerb(larga(), Object.assign({ fel: "bursa", fundingAtentie: "long" }, ok)).faCe, /^Aș cumpăra/);
  assert.match(AC.franaVerb(lin(), ok).faCe, /^Aș porni/);
  assert.equal(AC.franaVerb(lin(), { raportStare: "necunoscut", fundingAtentie: "long" }).faCe, LONG);
  const fn = acasa.slice(acasa.indexOf("function franaVerb"), acasa.indexOf("function ziBucMs"));
  assert.ok(fn.indexOf("o.pauza === true") < fn.indexOf("!invita") && fn.indexOf("!invita") < fn.indexOf("areAbateriCantitate"));
  assert.ok(fn.indexOf("chiar înainte de") < fn.indexOf("FRAZA_FUNDING"));
});

await test("măsura aude semnul salvat; pagina și vremea colectorului îl pasează; alerta de short nu spune long", () => {
  const zi = { z: "2026-10-21", pauza: false, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } }, fundingAtentie: "short" };
  const m = AC.masuraFranei([], [zi]);
  assert.equal(m.aflat, true);
  assert.equal(m.schimbate, 1);
  assert.match(m.text, /21\.10\.2026/);
  const linistita = { z: "2026-10-20", pauza: false, raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } };
  assert.equal(AC.masuraFranei([], [linistita]).schimbate, 0);
  assert.match(ae, /fundingAtentie/);
  assert.match(ae, /piataCol\.funding/);
  assert.match(tp, /fr\.fundingAtentie = sideF/);
  assert.match(tp, /A\.fundingAtentie\(st\.funding\)/);
  const al = mesajFundingPiata({ text: "Funding pe minus.", mediana: -0.0004 });
  assert.match(al.mesaj, /N-aș porni boți short noi până nu se descarcă\./);
  assert.doesNotMatch(al.mesaj, /boți long/);
  const vechi = mesajFundingPiata({ text: "Funding pe plus." });
  assert.match(vechi.mesaj, /N-aș porni boți long noi până nu se descarcă\./);
});

await test("versiunea de la v100.235 în sus", () => {
  const P = JSON.parse(citeste("package.json"));
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 235);
  assert.equal(P.scripts["test:v100235"], "node scripts/proba-v100235.mjs");
  assert.equal((P.scripts.test.match(/test:v100235/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100234/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100235"], /npm run test:v100235/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(idx, new RegExp('id="sideVersiune"[^>]*>v100\\.' + minor + " · "));
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + minor + '"'));
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100." + minor);
  assert.match(info.badge, new RegExp("^v100\\." + minor + " · "));
  assert.equal(info.engineContract, "54.1");
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.134"/);
  assert.doesNotMatch(col, /exportNePotrivit/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
