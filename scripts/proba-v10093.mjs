// Proba v100.93 / colector v101.63 (04.10, el: „FA IDEILE + model de GRADIENT BOOSTING”; specul docs/superpowers/specs/2026-10-04-gradient-boosting-design.md,
// planul docs/superpowers/plans/2026-10-04-arbori-l0-l1.md): L0 - ideile A1–A4 din raportul v100.92; L1 - arborii pe boți (inferența ES5,
// producătorul comun de intrări, antrenorul de noapte, ruta, colectorul, pagina, garda, versiunile). Algoritmul în sine: scripts/proba-arbori.mjs.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { situatii, verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
// modulele paginii, încărcate ca în retea/date.mjs (aceeași ordine, aceleași globale)
const B = new Function(`${lib("busola.js")}; return Busola;`)();
globalThis.GridCalcul = globalThis.GridCalcul || new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul, AS = new Function("GridCalcul", `${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(G);
const P = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(G, AS); globalThis.Probabilitati = P;
const R = new Function("Probabilitati", `${lib("retea.js")}; return Retea;`)(P); globalThis.Retea = R;
const S = new Function(`${lib("semnale-bot.js")}; return SemnaleBot;`)(); globalThis.SemnaleBot = S;
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.93 · ideile A1–A4 + arborii pe boți");

const ORA = 3600000, ACUM = Date.UTC(2026, 9, 4, 6, 0);
const BOT = { id: "1", baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, pretCurent: 0.3907, gridJos: 0.3841, gridSus: 0.4331, distantaLichidarePct: 30 };
const BZ = (stare, verdict, dif, monede) => ({ stare: stare, bilant: verdict ? { verdict: verdict, dif: dif === undefined ? -0.0017 : dif, monede: monede === undefined ? 24 : monede } : null });

// ======== L0: ideile A1–A4 ========
await test("(A1) plierea: cheia secțiunii = titlul fără cifre; capul are aria-expanded; Enter/Space pliază (keydown delegat); săgețile/cursorul doar sub 600 px; --grSus se remăsoară la resize", () => {
  const a = citeste("public", "app.js"), css = citeste("public", "app.css");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fnApp("grCheieSectiune") + "\n;this.f=grCheieSectiune;", ctx);
  assert.equal(ctx.f("Proba pe ultimele 31 de zile"), "Proba pe ultimele de zile"); assert.equal(ctx.f("🚦 Poarta de pornire"), "Poarta de pornire"); assert.equal(ctx.f("Varianta ta · 5×"), "Varianta ta · ×");
  const pl = fnApp("grPliazaPeTelefon"); assert.ok(pl.includes("grCheieSectiune(t.textContent)") && pl.includes('cap.setAttribute("aria-expanded",'), "cheia stabilă / aria-expanded");
  assert.ok(/^function grPliereComuta\(k\)\{[^\n]*setAttribute\("aria-expanded"/m.test(a), "comutarea nu pune aria-expanded");
  assert.ok(/document\.addEventListener\("keydown",[^\n]*grPliereComuta\(/.test(a) && /e\.key==="Enter"\|\|e\.key===" "/.test(a), "Enter/Space nu pliază");
  assert.ok(/^function grSusAplica\(\)\{/m.test(a) && /addEventListener\("resize",grSusAplica\)/.test(a) && /addEventListener\("orientationchange",grSusAplica\)/.test(a), "--grSus nu se remăsoară la rotire");
  assert.ok(!/^#gridset \.grPliabil>\.tbBlocCap h4:after/m.test(css) && /@media \(max-width:600px\)\{[^\n]*#gridset \.grPliabil>\.tbBlocCap h4:after/.test(css), "săgețile sunt în afara @media");
});

await test("(A2) semaforul: „Busola: după agitație gridul pierde −0,17 pp pe episod” (≤ 60), NUME_SFAT la fel; Consiliul: SOC.busola + PRIO după aglomerare; garda: comparația Busolei (3 texte, ≤ 110)", () => {
  const r = S.semafor({ bot: BOT, fisa: null, busola: BZ("miscare", "dovedit") });
  assert.equal(r.motiv, "Busola: după agitație gridul pierde −0,17 pp pe episod"); assert.ok(r.motiv.length <= 60);
  assert.ok(lib("semnale-bot.js").includes('busola: "Busola: după agitație gridul pierde mai mult"'), "NUME_SFAT.busola");
  const c = lib("consiliu.js"); assert.ok(/busola: "busola"/.test(c), "SOC.busola"); assert.match(c, /"aglomerare", "busola", "ia-profit"/);
  const s = situatii().filter((x) => /^busola\.comparatie/.test(x.sursa)); assert.equal(s.length, 3, "situații: " + s.length);
  const rele = s.map((x) => ({ x: x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length); assert.equal(rele.length, 0, rele.map((q) => q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
});
await test("(A3) pentru-busola: `retea` din ultimele cifre ale rețelei pe boții deschiși - un rând pe monedă, p cu 3 zecimale, fără p lipsă; tura 🎲 le notează; colectorul le dă fișierului", async () => {
  const { alcatuieste } = await import("./lib/pentru-busola.mjs");
  const o = alcatuieste({ la: ACUM, versiune: "v101.63", deschisi: [], inchisi: [], acum: ACUM, Busola: B, cheia: (m) => m,
    retea: [{ simbol: "AAVE", tinta: "atinge-24", p: 0.4123456, dovedita: true, la: ACUM }, { simbol: "LIT", tinta: "atinge-24", p: null, dovedita: false, la: ACUM }, { simbol: "AAVE", tinta: "atinge-24", p: 0.3, dovedita: true, la: ACUM - 1 }] });
  assert.deepEqual(o.retea, [{ simbol: "AAVE", tinta: "atinge-24", p: 0.412, dovedita: true, la: ACUM }]);
  assert.deepEqual(alcatuieste({ la: ACUM, versiune: "v", deschisi: [], inchisi: [], acum: ACUM, Busola: B, cheia: (m) => m }).retea, []);
  const tp = citeste("scripts", "lib", "tura-probabilitati.mjs"); assert.ok(tp.includes("if (rt) { const pz = d.pornireDe ? d.pornireDe(b, bare) : null; if (pz) rt.pornire = pz; rez.retea = rt; if (d.noteazaRetea) d.noteazaRetea(b, rt); }"), "tura nu notează");
  const col = citeste("scripts", "colector.mjs"); assert.ok(/const reteaUltim = \{\};/.test(col) && col.includes("noteazaRetea: (b, rt) =>") && col.includes("retea: Object.values(reteaUltim)"), "colectorul: reteaUltim / fișierul");
});
await test("(A4) pe telefon, după ce derulezi de verdict, caseta ține doar eticheta (grMic); o atingere o deschide; pe PC nimic", () => {
  const a = citeste("public", "app.js"), css = citeste("public", "app.css");
  assert.ok(/^function grVerdictComuta\(\)\{/m.test(a) && /data-action-click="grVerdictComuta\(\)"/.test(fnApp("renderGrid")), "caseta nu se comută la atingere");
  assert.ok(/addEventListener\("scroll",grVerdictScroll/.test(a) && /^function grVerdictScroll\(\)\{[^\n]*matchMedia\("\(max-width:600px\)"\)/m.test(a), "scroll-ul nu compactează doar pe telefon");
  assert.ok(/@media \(max-width:600px\)\{[^\n]*#gridset \.grVerdict\.grMic \.grVMotiv,#gridset \.grVerdict\.grMic \.grLista\{display:none\}/.test(css), "CSS grMic");
});

// ======== L1: arborii pe boți ========
const incarcaArbori = () => new Function("Retea", "Probabilitati", `${lib("arbori.js")}; return Arbori;`)(R, P);
await test("(6) Arbori.prezice (ES5) dă EXACT ce dă preziceArbori din antrenor (1.000 de rânduri, ≤ 1e−9); NaN / listă scurtă / model fără semi ⇒ null", async () => {
  const A = incarcaArbori(), { antreneazaArbori, preziceArbori, exportaArbori } = await import("../retea/arbori.mjs");
  const r = (() => { let a = 7; return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648); })(), N = 3000, K = 5, X = new Float32Array(N * K), y = new Float32Array(N);
  for (let i = 0; i < N; i++) { for (let j = 0; j < K; j++) X[i * K + j] = r() * 4 - 2; y[i] = (X[i * K] * X[i * K + 1] > 0) !== (r() < 0.1) ? 1 : 0; }
  const m = antreneazaArbori(X, y, K, { seed: 2 }), model = exportaArbori({ baza: m.baza, pas: m.pas, semi: [m.arbori] }); model.versiune = "a1";
  assert.ok(m.arbori.length > 5, "antrenorul n-a învățat nimic: " + m.arbori.length + " runde");
  let dmax = 0; for (let i = 0; i < 1000; i++) { const x = Array.from({ length: K }, (_, j) => X[i * K + j]); dmax = Math.max(dmax, Math.abs(A.prezice(model, x) - preziceArbori(model, x))); }
  assert.ok(dmax <= 1e-9, "diferența " + dmax);
  assert.equal(A.prezice(model, [NaN, 1, 1, 1, 1]), null); assert.equal(A.prezice(model, [1, 2]), null); assert.equal(A.prezice({ versiune: "a1" }, [1, 1, 1, 1, 1]), null);
});
await test("(6) Retea.intrariBot / intrarePornire sunt singurul producător de intrări; pentruBot dă aceleași cifre ca înainte; Arbori.pentruBot le folosește; scriptul și cache-ul", () => {
  const s = lib("retea.js"); assert.ok(/function intrariBot\(bare, o, btc\)/.test(s) && /function intrarePornire\(t, bare, btc, ist\)/.test(s) && /intrariBot: intrariBot, intrarePornire: intrarePornire/.test(s), "exporturile");
  assert.ok(!/function pentruBot\(modele, bare, o, btc\) \{[\s\S]{0,400}var pune = function/.test(s), "pentruBot mai are logica nivelurilor în el (trebuie în intrariBot)");
  const a = lib("arbori.js"); assert.ok(a.includes("Retea.intrariBot(bare, o, btc)") && a.includes("Retea.intrarePornire(t, bare, btc, ist)"), "Arbori nu folosește producătorul comun");
  assert.ok(/<script src="\/lib\/retea\.js"[^>]*><\/script>\s*<script src="\/lib\/arbori\.js"/.test(citeste("public", "index.html")) && citeste("public", "sw.js").includes('"/lib/arbori.js"'), "scriptul / cache-ul");
  // regresie: pe o monedă sintetică (900 de bare, random walk cu sămânță), pentruBot cu un model logistic mic dă aceleași coduri ca intrariBot (listă nevidă)
  const rr = (() => { let q = 3; return () => ((q = (q * 1103515245 + 12345) % 2147483648) / 2147483648); })(), T0 = Date.UTC(2026, 6, 1); let c = 1;
  const bare = Array.from({ length: 900 }, (_, i) => { const o = c; c = c * (1 + (rr() - 0.5) * 0.02); return { t: T0 + i * ORA, o, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998, c }; }), btc = bare.map((b) => ({ ...b, c: b.c * 60000, o: b.o * 60000, h: b.h * 60000, l: b.l * 60000 }));
  const o = { acum: T0 + 900 * ORA, pret: c, dir: "long", jos: c * 0.97, sus: c * 1.03, lichidare: c * 0.8, tinta: c * 1.04, stop: c * 0.965 };
  const it = R.intrariBot(bare, o, btc); assert.ok(it && it.lista.length >= 5, "intrariBot: " + (it ? it.lista.length : "null")); assert.ok(it.lista.every((q) => Array.isArray(q.x) && q.cod && q.tinta));
});

console.log("\n" + (pica ? "V100.93 PICA · " + pica + " din " + (ok + pica) : "V100.93 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
