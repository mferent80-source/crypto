// Proba v100.259 (23.10, el: „hai să facem tot” după auditul „absolut tot”): integrarea celor trei copii (srv, ecran, logica)
// și paza nouă: colectorul pornește DOAR din dosarul principal. Azi un colector pornit dintr-o copie de lucru (data\ al copiei,
// alt colector.pid) a trimis 28 de mesaje duplicate pe Discord în ~2 minute. Probele proprii ale copiilor rămân separate.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); }
}
console.log("\nV100.259 · TOT · proba\n");

await test("colectorul pornit din altă rădăcină decât cea principală iese imediat (cod 0) și spune de ce", () => {
  // serverul spre un port mort: chiar dacă paza ar lipsi, colectorul n-are pe unde trimite ceva
  const radPrincipal = path.join(RAD, "..", "nu-e-aici-radar-principal");
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "colector.mjs")], {
    cwd: RAD, encoding: "utf8", timeout: 8000,
    env: { ...process.env, COLECTOR_DOAR_INCARCA: "", COLECTOR_RADACINA: radPrincipal, RADAR_URL: "http://127.0.0.1:9", PAZNIC_URL: "", PAZNIC_TOKEN: "" } });
  assert.notEqual(r.error && r.error.code, "ETIMEDOUT", "colectorul a rămas pornit: paza de rădăcină lipsește");
  assert.equal(r.status, 0, (r.stderr || "") + (r.stdout || ""));
  assert.match((r.stdout || "") + (r.stderr || ""), /colectorul pornește doar din dosarul principal/);
});
await test("paza de rădăcină stă înaintea pazei de PID și nu lovește probele (COLECTOR_DOAR_INCARCA)", () => {
  const col = citeste("scripts", "colector.mjs");
  const iRad = col.indexOf("colectorul pornește doar din dosarul principal"), iPid = col.indexOf("let pidVerificat = 0;");
  assert.ok(iRad > 0 && iPid > iRad, "paza de rădăcină înaintea celei de PID");
  assert.match(col, /if \(!DOAR_INCARCA && path\.resolve\(RAD\)\.toLowerCase\(\) !== path\.resolve\(RAD_PRINCIPAL\)\.toLowerCase\(\)\)/);
});

// ---- firele dintre copii (ce agenții n-au putut atinge în fișierele altora) ----
const src = (...p) => citeste(...p).replace(/\r\n/g, "\n");
await test("colectorul dă fișei Simulatorul (GridSim e local acolo, nu global) ⇒ fișa poartă Monte Carlo pe 7 zile", () => {
  assert.match(src("scripts", "colector.mjs"), /GridProba\.fisa\(\{ simbol: s, [^\n]*mc: GridSim/);
});
await test("carnetul și contrafactualul cer fișa fără Monte Carlo (30–80 ms pe caz, nu schimbă rejocul)", () => {
  assert.match(src("public", "lib", "carnet.js"), /GP\.fisa\(\{[^\n]*faraMc: true/);
  assert.match(src("scripts", "lib", "tura-contrafactual.mjs"), /d\.GridProba\.fisa\(\{[^\n]*faraMc: true/);
});
await test("Monte Carlo pe pagină: stopul în procente intră ca procent; un singur prag de lichidări (GridSim)", async () => {
  const s = src("public", "lib", "monte-simbol-ecran.js");
  assert.match(s, /b\.opritorPierdereTip === "raport" && Number\(b\.opritorPierdereRaport\) < 0\) r\.stopRaport = Number\(b\.opritorPierdereRaport\)/);
  assert.match(s, /\(a\.stopRaport \|\| null\) === \(b\.stopRaport \|\| null\)/);
  assert.doesNotMatch(s, /pLichidare <= 0\.02|pLichidare > 0\.02|Math\.max\(0\.02, tu\.g\.pLichidare\)/);
  assert.match(s, /mcsLichOk\(x\.g\.pLichidare\)/); assert.match(s, /function mcsLichOk\(p\) \{ return typeof GridSim !== "undefined"/);
});
await test("Simulatorul: stopul schimbat de mână anulează procentul venit de la bot", () => {
  assert.match(src("public", "lib", "grid-sim-ecran.js"), /if \(st\.stopRaport && !aceeasiStop\) delete st\.stopRaport;/);
});
await test("Poarta gridului trimite direcția, grilele și levierul; serverul le păstrează (măsura pe bani)", () => {
  assert.match(src("public", "app.js"), /verdictTrimite\(\{s:"poarta-grid",k:f\.simbol,n:f\.verdict\.nivel,p:f\.pret,j:stV&&stV\.jos,u:stV&&stV\.sus,d:stV&&stV\.dir,g:stV&&stV\.grile,l:stV&&stV\.levier\}\)/);
  assert.match(src("functions", "api", "istoric-bot.js"), /if\(o\.j&&\(d==="long"\|\|d==="short"\|\|d==="neutru"\)\)o\.d=d;if\(o\.j&&g>=2&&g<=150\)o\.g=Math\.round\(g\);if\(o\.j&&l>=1&&l<=125\)o\.l=l;/);
});
await test("tura verdictelor: măsura pe bani ținută pe disc (barele de 15 min acoperă doar ~31 de zile) și laboratorul în registru", async () => {
  const { uneNet } = await import("./lib/tura-verdicte.mjs");
  const v = (t, h, val) => ({ s: "poarta-grid-net", k: "SOL", n: "porneste", t, h, r: 0, val, p: 100 });
  const deEv = [{ s: "poarta-grid", k: "SOL", t: 1 }, { s: "poarta-grid", k: "SOL", t: 2 }];
  // tura 1: ambele verdicte au bare ⇒ intră în memorie
  const a = uneNet([v(1, 1, 0.5), v(2, 1, -0.2)], deEv, {}, 3e9);
  assert.equal(a.ev.length, 2); assert.equal(Object.keys(a.cache).length, 2);
  // tura 2: barele nu mai acoperă verdictul 1 ⇒ rezultatul vine din memorie, nu dispare
  const b = uneNet([v(2, 1, -0.2)], deEv, a.cache, 3e9);
  assert.equal(b.ev.filter((x) => x.s === "poarta-grid-net").length, 2);
  // un verdict ieșit din jurnal (peste 400 de zile) iese și din memorie
  const c = uneNet([], [deEv[1]], a.cache, 3e9);
  assert.equal(c.ev.length, 1); assert.equal(Object.keys(c.cache).length, 1);
  const tv = src("scripts", "lib", "tura-verdicte.mjs");
  assert.match(tv, /d\.GridLaborator && lab \? d\.GridLaborator\.pentruRegistru\(lab\.intrebari\) : \[\]/);
  assert.match(tv, /d\.Verdicte\.evalueaza\(deEvaluat, bare, reper, \{ bare15, GridProba: d\.GridProba \}\)/);
  assert.match(src("scripts", "colector.mjs"), /turaVerdicteModul\(\{[^\n]*GridLaborator, GridProba, lumanari15M, netCache/);
});
await test("Contul întreg: măsura pe bani a porții gridului e pe zile, nu pe „zile de bursă”", () => {
  assert.match(src("public", "lib", "cont-ecran.js"), /r\.masura === "linistit" \|\| r\.masura === "net" \? \(r\.h === 1 \? " zi" : " zile"\) : " zile de bursă"/);
});
await test("pagina laboratorului spune că „dovedit” e pe bani (net, pe zile, ferestre care nu se suprapun)", () => {
  assert.match(src("public", "app.js"), /„Dovedit” = diferența de bani \(netul\) pe zile, pe ferestre care nu se suprapun, cu p sub 0,05 și același semn pe zilele de alegere și pe cele nevăzute/);
});
await test("Consilierul ține ambele margini la un bot neutru (jos și sus), nu doar prima", () => {
  const vm2 = { console, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo };
  vm2.window = vm2; const ctxC = vm.createContext(vm2);
  vm.runInContext(citeste("public", "lib", "consiliu.js"), ctxC);
  const m = (parte, t) => ({ cod: "margine", parte, ton: "atentie", titlu: t, text: "x", faCe: "N-aș adăuga bani." });
  const c = vm2.Consiliu.alcatuieste({ sm: { nivel: "tine", cod: "tine", motiv: "nimic", faCe: "L-aș lăsa.", componente: [] }, concret: [],
    sfaturi: [m("jos", "Marginea de jos e aproape"), m("sus", "Marginea de sus e aproape")], consilier: [], socoteala: null });
  const tot = JSON.stringify(c);
  assert.match(tot, /Marginea de jos e aproape/); assert.match(tot, /Marginea de sus e aproape/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exitCode = picate ? 1 : 0;
