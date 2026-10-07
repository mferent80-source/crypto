// Proba v100.126 / colector v101.84 (07.10, el: „ok fa idei” după pagina Salt):
// (1) alertă pe Discord când o poziție Salt trece sub stopul care urcă (cel calculat pe pagină - Salt n-are planuri): o dată pe
//     trecere, iar la revenirea peste stop se „rearmează”; banii în EUR, ca pe pagină;
// (2) cifrele Salt lângă Trading 212: în banda de cont (⚠️ numără și pozițiile Salt de ieșit) și pe Acasă, din rezumatul pe care
//     colectorul îl scrie la 15 minute (/api/t212?action=saltRezumat).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.126 · Salt: alerta la stop pe Discord, cifrele lângă T212 (banda de cont, Acasă) · proba\n");

// modulele ca în colector: în variabile LOCALE (nu pe globalThis) - Salt.analizeaza trebuie să le primească ca parametru
for (const f of ["grid-calcul.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const AS = new Function("GridCalcul", citeste("public", "lib", "actiuni-semnale.js") + "; return ActiuniSemnale;")(globalThis.GridCalcul);
const SB = new Function(citeste("public", "lib", "semnale-bot.js") + "; return SemnaleBot;")();
const CS = new Function("SemnaleBot", citeste("public", "lib", "consiliu.js") + "; return Consiliu;")(SB);
const CL = new Function("ActiuniSemnale", citeste("public", "lib", "consilier.js") + "; return Consilier;")(AS);
// salt.js într-un context curat: acolo nu există ActiuniSemnale / Consiliu / Probabilitati pe globalThis (în colector Probabilitati nu e
// globală - fără parametru, verdictul ar ieși fără probabilități)
const ctx = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, Intl, TextRo: globalThis.TextRo });
vm.runInContext("var globalThis = this;", ctx); vm.runInContext(citeste("public", "lib", "salt.js"), ctx, { filename: "salt.js" });
const Salt = vm.runInContext("Salt", ctx);
vm.runInThisContext(citeste("public", "lib", "probabilitati.js"), { filename: "probabilitati.js" });
const DEPS = { ActiuniSemnale: AS, Consiliu: CS, Consilier: CL, Probabilitati: globalThis.Probabilitati };
const TP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-salt-pozitii.mjs")).href);

const ZI = 86400000, T0 = Date.UTC(2026, 4, 1, 15);
// urcă 100 de zile până la 1.600, apoi coboară la 980 (sub stopul care urcă de −15% de la maxim)
function bare(ultim) { const b = []; for (let i = 0; i < 260; i++) { const c = i < 150 ? 1000 + i * 4 : Math.max(980, 1600 - (i - 150) * 6); b.push({ t: T0 - (260 - i) * ZI, o: c, h: c * 1.01, l: c * 0.99, c, v: 1000 }); } if (ultim) b[b.length - 1] = Object.assign({}, b[b.length - 1], { c: ultim, h: ultim, l: ultim }); return b; }
const U = [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall AG", tip: "actiune", moneda: "EUR" }, { isin: "US64110L1061", simbol: "NFLX", nume: "Netflix Inc.", tip: "actiune", moneda: "USD" }];
const POZ = [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall AG", qty: 1.0456, pretMediu: 1349.6, de: "2026-01-02", plata: "EUR" }];

await test("(1a) Salt.analizeaza primește modulele ca parametru (în colector nu stau pe globalThis); fără ele ⇒ „fara-module”, ca înainte", () => {
  const p = Object.assign({}, POZ[0], { pretMediuSimbol: 1349.6 });
  assert.equal(Salt.analizeaza(p, bare(), T0).eroare, "fara-module");
  const a = Salt.analizeaza(p, bare(), T0, DEPS); assert.ok(a.niv && a.niv.stopPozitie > 0, JSON.stringify(a).slice(0, 200)); assert.ok(a.p.pret < a.niv.stopPozitie, "prețul de probă e sub stop");
});
await test("(1b) alerta: o dată la trecerea sub stopul care urcă (critic, banii în EUR, „👉”), nu la fiecare tură; peste stop se rearmează; sub iar ⇒ iar", async () => {
  const stare = {}, trimise = [], cereBare = async (s) => (s === "RHM.DE" ? b() : []);
  let b = () => bare();
  const run = () => TP.turaSaltPozitii({ pozitii: POZ, univers: U, cereBare, Salt, deps: DEPS, stare, trimite: async (m, k) => { trimise.push({ m, k }); return true; }, acum: T0, eurRon: 5.0, jurnal: () => {} });
  let r = await run(); assert.equal(trimise.length, 1); const m = trimise[0].m;
  assert.equal(m.nivel, "critic"); assert.match(m.titlu, /^Salt · RHM: sub stopul care urcă \([\d.]+,\d\d EUR\)$/); assert.match(m.mesaj, /\n👉 /); assert.match(m.mesaj, /−\d[\d.]*,\d EUR/, "banii în EUR cu o zecimală");
  assert.match(trimise[0].k, /^salt-stop-DE0007030009$/);
  await run(); assert.equal(trimise.length, 1, "nu la fiecare tură");
  b = () => bare(1590); await run(); assert.equal(trimise.length, 1); assert.equal(stare["salt-stop-DE0007030009"], "peste");
  b = () => bare(); await run(); assert.equal(trimise.length, 2, "sub stop din nou ⇒ iar");
  assert.equal(r.rezumat.n, 1); assert.deepEqual(r.rezumat.iesi, ["RHM"]); assert.ok(r.rezumat.val > 0 && r.rezumat.cost > 0); assert.equal(Math.round(r.rezumat.rez * 100), Math.round((r.rezumat.val - r.rezumat.cost) * 100));
});
await test("(1c) trimiterea eșuată nu se ține minte (încearcă la tura următoare); poziția fără prețuri se numără, nu oprește tura", async () => {
  const stare = {}; let n = 0;
  const r = await TP.turaSaltPozitii({ pozitii: POZ.concat([{ isin: "US64110L1061", simbol: "NFLX", nume: "Netflix", qty: 1, pretMediu: 80, plata: "EUR" }]), univers: U, cereBare: async (s) => (s === "RHM.DE" ? bare() : []), Salt, deps: DEPS, stare, trimite: async () => { n++; return false; }, acum: T0, jurnal: () => {} });
  assert.equal(n, 1); assert.equal(stare["salt-stop-DE0007030009"], undefined); assert.equal(r.rezumat.fara, 1);
});

// ---------------- (2) serverul + pagina ----------------
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
const cheama = async (metoda, qs, corp) => { const mod = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.8." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/t212?${qs}`, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env }); return { status: res.status, d: await res.json().catch(() => null) }; };
await test("(2a) serverul: rezumatul Salt scris de colector (curățat) și citit de pagină; fără „la” ⇒ 400", async () => {
  assert.deepEqual((await cheama("GET", "action=saltRezumat")).d, { rezumat: null });
  assert.equal((await cheama("POST", "action=saltRezumat", { rezumat: { la: T0, n: 2, val: 1907.4, cost: 2563.6, rez: -656.2, eurRon: 5.35, iesi: ["RHM", "<b>x</b>"], atentie: [], fara: 0, rau: "x".repeat(5000) } })).status, 200);
  const r = (await cheama("GET", "action=saltRezumat")).d.rezumat; assert.equal(r.val, 1907.4); assert.deepEqual(r.iesi, ["RHM", "bxb"]); /* „<b>x</b>” fără ce nu e literă / cifră / . / - */ assert.equal(r.rau, undefined);
  assert.equal((await cheama("POST", "action=saltRezumat", { rezumat: { n: 1 } })).status, 400);
});
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "salt-ecran.js"), { filename: "salt-ecran.js" });
const REZ = { la: T0, n: 2, val: 1907.4, cost: 2563.6, rez: -656.2, eurRon: 5.3471, iesi: ["RHM", "NFLX"], atentie: [], fara: 0 };
await test("(2b) banda de cont: „Salt · 1.907,4 EUR (≈ 10.199 lei) · deschise −656,2 EUR”; fără poziții ⇒ nimic", () => {
  const h = globalThis.saltBandaHtml(REZ);
  assert.match(h, /<b>Salt<\/b> · 1\.907,4 EUR/); assert.match(h, /≈ 10\.199 lei/); assert.match(h, /deschise <b class="bad">−656,2 EUR<\/b>/);
  assert.equal(globalThis.saltBandaHtml(null), ""); assert.equal(globalThis.saltBandaHtml({ la: T0, n: 0 }), "");
  const f = citeste("public", "lib", "t212-ecran.js");
  assert.match(f, /saltBandaHtml\(contTot\.salt\)/); assert.match(f, /\/api\/t212\?action=saltRezumat/); assert.match(f, /la Salt/, "⚠️ numără și pozițiile Salt de ieșit");
});
await test("(2c) Acasă, în „Acțiunile tale”: Salt (valoarea, pe deschise, semafoarele) + „Deschide Salt”", () => {
  const h = globalThis.saltAcasaHtml(REZ);
  assert.match(h, /Salt/); assert.match(h, /1\.907,4 EUR/); assert.match(h, /class="bad">−656,2 EUR/); assert.match(h, /2 de ieșit/); assert.match(h, /navTo\('salt',true\)/);
  assert.equal(globalThis.saltAcasaHtml(null), "");
  assert.match(citeste("public", "lib", "acasa-ecran.js"), /saltAcasaHtml\(/);
});
await test("(3) colectorul: tura pozițiilor Salt la 15 minute (alertele în meta().saltAlerte, rezumatul pe server); Salt.analizeaza cu modulele colectorului", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /import \{ turaSaltPozitii as turaSaltPozitiiModul \} from "\.\/lib\/tura-salt-pozitii\.mjs";/);
  assert.match(c, /async function turaSaltPozitii\(\)/); assert.match(c, /m\.saltAlerte/); assert.match(c, /await trimite\("\/api\/t212\?action=saltRezumat", \{ rezumat: /);
  assert.match(c, /deps: \{ ActiuniSemnale, Consiliu, Consilier, Probabilitati \}/); assert.match(c, /15 \* 60000/);
});
await test("(E) versiunea v100.126 / colector v101.84", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.126"/); assert.match(html, /id="antetVersiune">v100\.126 /); assert.match(html, /id="healthAppVersion">v100\.126</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.126.0"); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-126";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.126"/); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100.126");
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.84";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
