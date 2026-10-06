// Proba v100.115 / colector v101.78 (06.10, el: „ok fă, după continuă cu taburile din app”):
// I-563 Discord „botul stă de 24 h și e pe minus” cu cifrele lui (RiscLuna.textBot) · I-565 frâna T212 „cumpărat în jos” cu cifra lui
// I-554 meniul în 3 grupe (Zilnic / Unelte / Laborator vechi pliat, nimic șters) · I-555 bara de jos pe telefon: Tablou · Grid · T212 · Alerte · ⋯
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "actiuni-semnale.js", "risc-luna.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { ActiuniSemnale: AS, RiscLuna: RL } = globalThis;
const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
const col = citeste("scripts", "colector.mjs"), html = citeste("public", "index.html"), app = citeste("public", "app.js"), css = citeste("public", "app.css");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.115 · 24 h pe minus + frâna cu cifra ta + meniul în 3 grupe + bara de jos · proba\n");

const SB = [{ h: 1, n: 692, pePlus: 0.66, mari: 0.14, medie: -0.016 }, { h: 24, n: 76, pePlus: 0.57, mari: 0.29, medie: -0.126 }];
await test("(563a) mesajul: titlul cu orele și minusul; rândul 1 = cifrele tale (din boții care au ajuns la 24 h); rândul 2 = ce aș face eu", () => {
  const m = MC.minus24h("ZAMA", 26.4, -1.234, RL.textBot(SB, 26.4), RL.pragulAtins(SB, 26.4));
  assert.equal(m.titlu, "ZAMA: 26 h pe minus (−1,23 USDT)"); assert.equal(m.cheie, "minus-24h"); assert.equal(m.nivel, "atentie");
  assert.equal(m.mesaj, "Din boții tăi care au ajuns la 24 h (76), 57% au ieșit pe plus și 29% au pierdut peste 5% (media −12,6%).\n👉 Aș pune un stop aproape: cei mai mulți revin, dar pierderile mari trag media în jos.");
});
await test("(563b) colectorul: o dată pe bot, la 24 h pe minus, cu raportul de noapte (ținut o oră); marcat după trimiterea reușită", () => {
  const i = col.indexOf("st._minus24"), f = col.slice(i - 200, i + 900);
  assert.match(f, /if \(!st\._minus24 && Number\(b\.pornitLa\) > 0 && acum - Number\(b\.pornitLa\) >= 24 \* 3600000/);   // pragul exact: (R-M3/M4)
  assert.match(f, /RiscLuna\.textBot\(rp\.boti\.supravietuire,/); assert.match(f, /if \(await trimiteAlerta\(m, b\.id, m\.cheie\)\) st\._minus24 = true;/);
  assert.match(col, /async function riscRaport\(\)/); assert.match(col.slice(col.indexOf("async function riscRaport()"), col.indexOf("async function riscRaport()") + 500), /3600000/);
});
const X = { ticker: "PLTR_US_EQ", pret: 150.2, mediu: 160, sub: -0.061, nr: 1, suma: 2100 };
await test("(565a) frâna T212: cu cifra ta (medierea rea la tine - dovedit sau la limită) rândul 2 o spune; altfel rămâne lecția NPA", () => {
  const a1 = { k: "A1", stare: "la-limita-rau", cu: 65, mariCu: 0.323, mariFara: 0.092 };
  assert.equal(AS.alertaFrana(X, "PLTR", a1).mesaj.split("\n")[1], "👉 N-aș mai adăuga pe minus: la tine, 32% din pozițiile mediate au pierdut peste 5%, față de 9% (la limită).");
  assert.equal(AS.alertaFrana(X, "PLTR", Object.assign({}, a1, { stare: "dovedit-rau" })).mesaj.split("\n")[1], "👉 N-aș mai adăuga pe minus: la tine, 32% din pozițiile mediate au pierdut peste 5%, față de 9%.");
  const fara = AS.alertaFrana(X, "PLTR").mesaj; assert.match(fara, /NPA/); assert.equal(AS.alertaFrana(X, "PLTR", Object.assign({}, a1, { stare: "nedovedit" })).mesaj, fara);
});
await test("(565b) colectorul îi dă frânei rândul A1 din raportul de risc", () => {
  assert.match(col, /ActiuniSemnale\.alertaFrana\(x, T212\.simbol\(x\.ticker\), a1\)/);
  assert.match(col, /const rpA = await riscRaport\(\), a1 = rpA && rpA\.actiuni \? \(rpA\.actiuni\.comportament \|\| \[\]\)\.find\(\(y\) => y\.k === "A1"\) : null;/);
});
await test("(G) garda textelor: mesajul de 24 h (cu și fără cifre) și frâna cu cifra ta", () => {
  assert.match(citeste("scripts", "lib", "garda-alerte.mjs"), /MC\.minus24h\(/); assert.match(citeste("scripts", "lib", "garda-actiuni.mjs"), /alertaFrana\([^)]*\{ k: "A1"/);
});
// ---------------- revizia Opus (I1, I2, M1–M4, M8, M9) ----------------
await test("(R-I1) sfatul de 24 h urmează cifrele lui: media pe plus ⇒ las cu stop; mulți revin dar media pe minus ⇒ stop aproape; rău ⇒ închid", () => {
  const r = (pePlus, medie) => ({ h: 24, n: 76, pePlus, mari: 0.29, medie });
  const sfat = (p) => MC.minus24h("ZAMA", 26, -1.2, "x", p).mesaj.split("\n")[1];
  assert.equal(sfat(r(0.57, 0.02)), "👉 Aș lăsa botul, dar cu stop: la tine, boții ținuți peste o zi au ieșit în medie pe plus.");
  assert.equal(sfat(r(0.57, -0.126)), "👉 Aș pune un stop aproape: cei mai mulți revin, dar pierderile mari trag media în jos.");
  assert.equal(sfat(r(0.4, -0.126)), "👉 Aș închide botul care stă de peste o zi pe minus, în loc să aștept să revină.");
  const f = MC.minus24h("ZAMA", 26.4, -1.234, null, null).mesaj.split("\n");
  assert.equal(f[0], "Botul stă de 26 h și e pe −1,23 USDT; încă n-am raportul de risc cu istoria ta."); assert.equal(f[1], "👉 Aș verifica acum stopul botului, dacă nu are unul.");
  const i = col.indexOf("st._minus24"), c = col.slice(i - 200, i + 1200);
  assert.match(c, /RiscLuna\.pragulAtins\(rp\.boti\.supravietuire, ore\)/); assert.match(c, /MesajeColector\.minus24h\([^;]*, t, pr\)/);
});
await test("(R-I2) citirea ratată a raportului se reîncearcă în 5 minute, iar alerta așteaptă până la 26 h în loc să plece fără cifre", () => {
  const f = col.slice(col.indexOf("async function riscRaport()"), col.indexOf("async function riscRaport()") + 700);
  assert.match(f, /riscMemo\.eroare = true; riscMemo\.la = Date\.now\(\) - 3600000 \+ 300000;/); assert.match(f, /riscMemo\.eroare = false;/);
  const i = col.indexOf("st._minus24"), c = col.slice(i - 200, i + 1200);
  assert.match(c, /if \(rp \|\| !riscMemo\.eroare \|\| ore >= 26\)/);
});
await test("(R-M3/M4) fără ora pornirii nimic; minusul contează de la 0,5% din investiție", () => {
  const i = col.indexOf("st._minus24"), c = col.slice(i - 200, i + 600);
  assert.match(c, /Number\(b\.pornitLa\) > 0 && acum - Number\(b\.pornitLa\) >= 24 \* 3600000 && Number\(b\.profitTotal\) < -0\.005 \* \(Number\(b\.investit\) > 0 \? Number\(b\.investit\) : 0\)/);
});
await test("(R-M1) frâna și textMediere spun procentele doar când chiar arată mai rău (mariCu > mariFara)", () => {
  const a1 = { k: "A1", stare: "la-limita-rau", cu: 65, mariCu: 0.08, mariFara: 0.092 };
  assert.match(AS.alertaFrana(X, "PLTR", a1).mesaj, /NPA/); assert.equal(RL.textMediere(a1), null);
  assert.ok(RL.textMediere(Object.assign({}, a1, { mariCu: 0.323 })));
});
await test("(R-M2) pagina T212 dă frânei același rând A1 (din raportul de risc încărcat), ca Discord", () => {
  assert.match(citeste("public", "lib", "t212-ecran.js"), /ActiuniSemnale\.alertaFrana\(x, T212\.simbol\(x\.ticker\), a1F\)/);
});
await test("(R-M8/M9) deschiderea automată a grupului nu suprascrie alegerea lui; numărul din „Laborator vechi” se numără", () => {
  assert.match(app, /if\(bv&&!sv\.open\)\{sv\.__auto=true;sv\.open=true\}/);
  const f = app.slice(app.indexOf("function sideVechiTine("), app.indexOf("function openMoreDrawer("));
  assert.match(f, /if\(sv\.__auto\)\{sv\.__auto=false;return\}/); assert.match(f, /querySelectorAll\("\[data-nav\]"\)\.length/);
});
// ---------------- I-554: meniul ----------------
const meniu = (() => { const i = html.indexOf('<div class="sideMenu">'); return html.slice(i, html.indexOf('<div class="sideFooter">', i)); })();
const nav = (bucata) => [...bucata.matchAll(/data-nav="([a-z0-9]+)"/g)].map((m) => m[1]);
const grup = (id) => { const i = meniu.indexOf('id="' + id + '"'); assert.ok(i > 0, id); const r = meniu.slice(i + 5), j = r.search(/<(div|details) class="sideGrup[ "]/); return j < 0 ? r : r.slice(0, j); };
await test("(554a) meniul în 3 grupe, cu toate cele 47 de butoane (nimic șters): Zilnic, Unelte, Laborator vechi (pliat)", () => {
  assert.equal([...meniu.matchAll(/class="sideBtn/g)].length, 48);   // v100.117: + „Carnetul fișei” (I-561) în Zilnic
  assert.deepEqual(nav(grup("sideZilnic")), ["dash", "tabloubot", "gridset", "carnet", "jurnaltrade", "t212", "scan", "alerts", "montecarlo"]);
  assert.deepEqual(nav(grup("sideUnelte")), ["market", "deriv", "stocks", "account", "cloud", "settings", "health"]);
  const v = nav(grup("sideVechi")); assert.equal(v.length, 32); for (const k of ["desk", "engine", "mtf", "signals", "backtest", "replaylab", "researchml", "decisioncore"]) assert.ok(v.includes(k), k);
  assert.match(meniu, /<details class="sideGrup sideVechi" id="sideVechi"><summary class="sideGrupCap">Laborator vechi \(32\)<\/summary>/);
  assert.match(meniu, /<div class="sideGrupCap">Zilnic<\/div>/); assert.match(meniu, /<div class="sideGrupCap">Unelte<\/div>/);
});
await test("(554b) o pagină din laborator, deschisă (din alt loc sau la reîncărcare), deschide grupul; starea pliatului se ține minte", () => {
  const f = app.slice(app.indexOf("function navTo("), app.indexOf("\nfunction ", app.indexOf("function navTo(") + 10));
  assert.match(f, /var sv=document\.getElementById\("sideVechi"\),bv=sv&&sv\.querySelector\('\[data-nav="'\+id\+'"\]'\);if\(bv&&!sv\.open\)/);
  assert.match(app, /function sideVechiTine\(/); assert.match(css, /\.sideGrupCap\{/);
});
// ---------------- I-555: bara de jos ----------------
await test("(555) bara de jos pe telefon: Tablou · Grid · T212 · Alerte · ⋯; Home, Scan, Signals și Market trec în „More” (nimic pierdut)", () => {
  const i = html.indexOf('<nav class="mobileBottom">'), bara = html.slice(i, html.indexOf("</nav>", i));
  assert.deepEqual(nav(bara), ["tabloubot", "gridset", "t212", "alerts"]); assert.match(bara, /data-action-click="deschideT212\(\)"/); assert.match(bara, /openMoreDrawer\(\)/);
  const j = html.indexOf('id="moreDrawer"'), sertar = html.slice(j, j + 6000);
  for (const k of ["dash", "scan", "signals", "market"]) assert.match(sertar, new RegExp("moreNav\\('" + k + "'"), k);
});
await test("(E) versiunea v100.116+ / colector v101.79+ (merge mai departe)", () => {
  assert.match(html, /content="v100\.1\d\d"/); assert.match(html, /id="antetVersiune">v100\.1\d\d/); assert.match(html, /id="healthAppVersion">v100\.1\d\d</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1\d\d\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1\d\d";/);
  assert.match(col, /const VERSIUNE_COLECTOR = "v101\.(79|[89]\d)";/);
  const sc = JSON.parse(citeste("package.json")).scripts; assert.equal(sc["test:v100115"], "node scripts/proba-v100115.mjs"); assert.match(sc.test, /npm run test:v100115/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
