// Proba v100.85 (ecranele) - reveniri + short: Tabloul (cele două liste, „Fișa (long/short)”, istoricul pe față, urmărirea, stările goale),
// Trading 212 (tabelul „Pe revenire” cu „Biletul”), Acasă (al doilea rând din „Ce aș cumpăra azi”), scripturile încărcate, garda STRICTĂ.
//   node scripts/proba-v10085-ecran.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
// funcția de nivel 1 din fișier, până la următoarea (comentariile dintre ele se iau și ele - apelul se pune după "\n")
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.85 (ecranele) · Tabloul, Trading 212, Acasă, garda");

const CL = { la: 5, monede: [
  { simbol: "AAA_USDT_PERP", volum: 10, stare: "evita", dir: "long", scor: 9, revenire: { cadere: 0.3213, deLaMin: 0.1102, zileDeLaMin: 4.2, revine: true } },
  { simbol: "DDD_USDT_PERP", volum: 50, stare: "candidat", dir: "short", tarie: "puternic", scor: 7, latime: 0.12, profitGrila: 0.0026, traversariZi: 21, revenire: null } ] };
const SLAB = { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza: { n: 15119, pePlus: 0.45, medie: 0.01 }, eticheta: "mai slab", putine: false };
const SG = { sugestii: { la: 5, zi: "2026-10-03", dovada: { revenire: { piata: SLAB, boti: { n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } } },
  short: { piata: { ...SLAB, pePlus: 0.55, medie: -0.003, baza: { n: 15119, pePlus: 0.55, medie: -0.01 }, eticheta: "cam la fel" }, boti: { n: 83, pePlus: 0.49, mediana: -0.15, reper: { n: 374, pePlus: 0.56, mediana: 1.3 } } } },
  urmarire: { revenire: { n: 0, pePlus: 0, medie: null, text: "Sugestiile se urmăresc de azi: după ~30 se poate spune cu cifre dacă merită." }, short: null } }, istoric: [] };
function tablou(cl, sg) {
  const ctx = { Reveniri: R, Idei: ID, GridCalcul: G, escapeHtml: esc, TextRo: globalThis.TextRo }; vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "tbSugestiiHtml") + "\n" + fnDin("t212-ecran.js", "tbSugestiiCorp") + "\n;this.f=tbSugestiiHtml;", ctx);
  return ctx.f(cl, sg, [{ moneda: "AAA", rezultat: 2 }]);
}
await test("(7) Tabloul: „↩️ Pe revenire (bot long)” și „📉 Pentru short”, cu istoricul pe față, rândurile și „Fișa (long/short)”", () => {
  const h = tablou(CL, SG), t = text(h);
  assert.ok(t.includes("↩️ Pe revenire (bot long)") && t.includes("📉 Pentru short"));
  assert.ok(t.includes(R.textDovada(SLAB, "monede")) && t.includes("Boții tăi porniți așa: 53% pe plus din 66, față de 59% la toți boții tăi."), t);
  assert.ok(t.includes("AAA căzută −32% de la maximul pe 30 de zile · +11% de la minim (acum 4 zile)") && t.includes("istoricul tău: 1 bot, 1 pe plus, +2.00 USDT"), t);
  assert.match(h, /data-action-click="gridDeschideMonedaDir\('AAA','long'\)">Fișa \(long\)<\/button>/); assert.match(h, /data-action-click="gridDeschideMonedaDir\('DDD','short'\)">Fișa \(short\)<\/button>/);
  assert.ok(t.includes("DDD interval 12,00% · 0,26% net pe grilă · ~21 treceri pe zi · direcția short (puternic)") && t.includes("n-ai mai avut boți pe ea"), t);
  assert.ok(t.includes("Boții tăi short pe monede cu direcția short: 49% pe plus din 83, față de 56% la toți boții tăi short.") && t.includes("📏 Sugestiile se urmăresc de azi"));
});
await test("(7) Tabloul: stările goale - fără clasament („Aștept clasamentul…”), clasament vechi fără `revenire`, fără istoric („se socotește azi de la 8:00”)", () => {
  const a = text(tablou(null, null)); assert.ok(a.includes("Aștept clasamentul…") && a.includes("Istoricul se socotește azi de la 8:00."), a);
  const b = text(tablou({ la: 5, monede: [{ simbol: "X_USDT_PERP", stare: "candidat", dir: "long", scor: 1 }] }, null));
  assert.ok(b.includes("Acum nicio monedă nu e pe revenire.") && b.includes("Acum nicio monedă liniștită nu are direcția short."), b);
});
await test("(7) „Fișa (long/short)” deschide fișa monedei și alege direcția; altă direcție ⇒ doar fișa", () => {
  const apeluri = [], ctx = { gridDeschideMoneda: (m) => apeluri.push(["fisa", m]), gridDirectie: (d) => apeluri.push(["dir", d]) }; vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "gridDeschideMonedaDir") + "\n;gridDeschideMonedaDir('AAA','short');gridDeschideMonedaDir('BBB','neutru');", ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(apeluri)), [["fisa", "AAA"], ["dir", "short"], ["fisa", "BBB"]]);
});
await test("(7) Tabloul: listele stau SUB nota listei de candidați; sugestiile se aduc odată cu clasamentul (la 10 minute)", () => {
  assert.match(fnDin("t212-ecran.js", "tbIdeiRender"), /proba pe istoricul monedei\.<\/p>' \+ tbSugestiiHtml\(cl, contTot\.sugestii, contTot\.inchise\);/);
  const s = lib("t212-ecran.js");
  assert.match(s, /var contTot = \{.*sugestii: null, sugestiiLa: 0 \};/); assert.match(s, /contTot\.sugestii = await getJSON\("\/api\/istoric-bot\?action=sugestii"\);/);
});
await test("(7) o eroare în date nu strică Tabloul: lista nouă iese goală, candidații rămân", () => {
  assert.equal(tablou({ get monede() { throw new Error("x"); } }, SG), "");
});

console.log("\n" + (pica ? "V100.85 ECRAN PICA · " + pica + " din " + (ok + pica) : "V100.85 ECRAN PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
