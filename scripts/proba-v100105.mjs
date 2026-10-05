// Proba v100.105 (05.10, auditul de la final, el: „la final faci audit din toate direcțiile”): găsit în audit - scriptul meu de la v100.103
// a lipit în app.js un CR singur („\r\r\n”) ⇒ git a socotit app.js binar (-text), nu l-a mai convertit și commit-ul c0ec47d a pus tot
// fișierul cu CRLF în depozit (7.012 rânduri „schimbate”, diff-uri ilizibile). (1) fiecare fișier al paginii are UN SINGUR fel de capăt de
// rând (fără CR singur, fără LF singur în fișierele CRLF) · (E) versiunile.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
globalThis.GridProba = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
const GP = new Function(`${lib("grid-plan.js")}; return GridPlan;`)();
globalThis.GridPlan = GP;
const GJ = new Function(`${lib("grid-jurnal.js")}; return GridJurnal;`)();
const OF = { simbol: "ABC_USDT_PERP", t: 1000, dir: "long", rec: "larg", ta: { jos: 0.97, sus: 1.02, levier: 5, stop: 40, n: 100, oreTipic: 5 }, mea: { jos: 0.89, sus: 1.11, levier: 1, stop: 15, n: 100, oreTipic: 24 } };
const BOT = { id: "9", baza: "ABC.PERP", directie: "long", gridJos: 0.891, gridSus: 1.108, levier: 1, investit: 100, pornitLa: 5000, activ: true };
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.105 · capetele de rând ale paginii");

await test("(1) app.js, index.html, app.css și modulele din lib: niciun CR singur; fiecare fișier e ori tot CRLF, ori tot LF", () => {
  const fis = ["public/app.js", "public/index.html", "public/app.css"].concat(fs.readdirSync(path.join(RAD, "public", "lib")).filter((f) => /\.js$/.test(f)).map((f) => "public/lib/" + f));
  for (const f of fis) {
    const s = fs.readFileSync(path.join(RAD, f), "latin1"), crSingur = (s.match(/\r(?!\n)/g) || []).length, crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/\n/g) || []).length;
    assert.equal(crSingur, 0, f + ": " + crSingur + " CR singur(i) ⇒ git îl socotește binar");
    assert.ok(crlf === 0 || crlf === lf, f + ": amestec - " + crlf + " CRLF din " + lf + " rânduri");
  }
});
// revizia de cod a zilei (6cc294c..56bf437): 10 probleme, toate în codul de azi
await test("(R1/R6) colectorul: fără ofertă (încă) nu marchează botul pentru totdeauna; fără date (gridVsPlan null) nu-l declară „ok”", () => {
  const col = citeste("scripts", "colector.mjs");
  assert.doesNotMatch(col, /faraOferta/); assert.match(col, /if \(fb\) \{ const m = MesajeColector\.pornitCa\(/);
  assert.match(col, /if \(gv && !gv\.preaLarg\) st\._gridLarg = "ok";/); assert.doesNotMatch(col, /if \(!gv \|\| !gv\.preaLarg\) st\._gridLarg = "ok";/);
});
await test("(R2) fișa neutră: oferta și rândul din jurnal poartă direcția ferestrelor (long), nu „neutru”", () => {
  const f = { simbol: "ABC_USDT_PERP", dir: "neutru", verdict: { nivel: "asteapta" }, setare: { suma: 100 } };
  assert.equal(GJ.adauga([], f, 1, { eticheta: "larg", setare: GP.setareFereastra({ dir: "long", jos: 1, sus: 2, grile: 3, levier: 1, suma: 100, stop: null }) })[0].dir, "long");
  assert.match(citeste("public", "app.js"), /grFerestreTine\(f,vG,dirG\)/); assert.match(fnApp("grFerestreTine"), /^function grFerestreTine\(f,v,dir\)\{/);
});
await test("(R3) un rând recunoscut șters de el nu revine (boții ignorați)", () => {
  assert.equal(GJ.recunoaste([], [BOT], [OF], 9000, ["9"]).length, 0); assert.equal(GJ.recunoaste([], [BOT], [OF], 9000, []).length, 1);
  assert.match(fnApp("gridJurnalSterge"), /grJurnalIgnorati/); assert.match(fnApp("gridJurnalActualizeaza"), /grJurnalIgnoratiCititi\(\)\)/);
});
await test("(R4) rândul apăsat de el („Am pornit-o”) bate rândul recunoscut automat pe același bot: automatul cedează, apăsatul se leagă", () => {
  const auto = GJ.recunoaste([], [BOT], [OF], 9000)[0];
  const manual = { id: "6000-ABC", t: 6000, simbol: "ABC_USDT_PERP", dir: "long", fereastra: "larg", botId: null, activ: null, investit: null, rezultat: null, inchisLa: null };
  const l = GJ.actualizeaza([auto, manual], [BOT], 9000);
  assert.equal(l.length, 1, "o singură intrare pe bot"); assert.equal(l[0].id, "6000-ABC"); assert.equal(l[0].botId, "9");
});
await test("(R5) LARG identic cu ÎNGUST (moneda liniștită) ⇒ recomandarea e ÎNGUST, ca recunoașterea", () => {
  const ta = { laStop: -6.5, proba: { n: 100, stop: 40, mediaUsdt: -0.5, independente: 10 } }, mea = Object.assign({}, ta, { egalaCuTa: true });
  const a = GP.alege(ta, mea); assert.equal(a.cine, "ta"); assert.match(a.text, /^ÎNGUST · LARG e la fel la moneda asta/);
});
await test("(R7/R8) poarta: pragul scris și nesalvat rămâne la redesenare; câmpurile gridului nu trec de la o monedă la alta", () => {
  const c = { $: (id) => (id === "grPragPierdere" ? { value: "7,5" } : null), escapeHtml: (s) => String(s), grFrana: { prag: { pierdere: 10, tinta: 5, afaraOre: 12 } } }; vm.createContext(c);
  vm.runInContext(fnApp("grPragVal") + ";this.f=grPragVal;", c);
  assert.equal(c.f("pierdere"), ' value="7,5"', "ce a scris el"); assert.equal(c.f("tinta"), ' value="5"', "din server");
  const pf = fnApp("grPoartaGridForm"); assert.match(pf, /el\.getAttribute\("data-simbol"\)===f\.simbol/); assert.match(pf, /data-simbol="'\+escapeHtml\(f\.simbol\)\+'"/);
});
await test("(R9) oferta văzută din nou se reînnoiește (ultim); recunoașterea numără 12 h de la ultima vedere", async () => {
  const of = Object.assign({}, OF, { t: 1000, ultim: 1000 + 11 * 3600000 }), bot = Object.assign({}, BOT, { pornitLa: 1000 + 20 * 3600000 });
  assert.equal(GP.fereastraBotului(bot, [of]).k, "larg"); assert.equal(GP.fereastraBotului(bot, [OF]), null, "fără ultim: 20 h de la prima vedere ⇒ nu");
  assert.match(fnApp("grFerestreTine"), /ac\.ultim=acum/);
  function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
  const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const h = { "cf-connecting-ip": "10.0.4.1", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" };
  await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=ferestre", { method: "POST", headers: h, body: JSON.stringify({ oferta: of }) }), env });
  assert.equal(JSON.parse(env.ISTORIC.m.get("ferestre"))[0].ultim, of.ultim);
});
await test("(R10) motivele fără probă (monedă nouă, < 30 de zile): nimic „undefined”", () => {
  const v = { dir: "long", jos: 0.9, sus: 1.05, d: 0.1, u: 0.05, pas: 0.003, levier: 5, lichidare: { jos: 0.8 }, proba: null };
  for (const k of ["ta", "mea"]) { const m = GP.motive(v, k, 0.1); assert.ok(!JSON.stringify(m).includes("undefined"), k + ": " + JSON.stringify(m)); assert.ok(m.da.length && m.nu.length); }
});
await test("(R+) oferta se ține doar dacă variantele memorate sunt ale monedei de acum", () => {
  assert.match(citeste("public", "app.js"), /try\{var vG=grPlanMemo\.grid&&grPlanMemo\.grid\.cheie&&grPlanMemo\.grid\.cheie\.indexOf\(f\.simbol\+"\|"\)===0\?grPlanMemo\.grid\.v:null;/);
});
await test("(E) versiunile v100.105", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.1(0[5-9]|[1-9]\d)$/); const V2 = bi.version; assert.ok(bi.badge.startsWith(V2 + " · "));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V2 + '";'));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V2.replace(".", "-") + '";'));
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V2.replace(".", "\\.") + "(?!\\d)", "g")) || []).length, 4);
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V2.slice(1) + ".0"); assert.ok(/npm run test:v100104 && npm run test:v100105( && |")/.test(pk));
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
