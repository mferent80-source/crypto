// Proba v100.92 / colector v101.62 (04.10, el: „fa tot” pe I-517…I-526, planul docs/superpowers/plans/2026-10-04-structura-si-verdict.md):
// lotul A - I-518 cartela Busola unică (un singur producător: starea, intervalul, rândul scurt), I-524 distanța propunerii față de intervalul
// Busolei, I-517 blocul „Pe zi, la închidere, ce știm” în 3 grupuri, I-519 fișa cu verdict lipicios și secțiuni pliate pe telefon.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { situatii, verifica, STRICT } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
const B = new Function(`${lib("busola.js")}; return Busola;`)();
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.92 · structură și verdict (I-517…I-526)");

const ORA = 3600000, ACUM = Date.UTC(2026, 9, 4, 6, 0), LA = ACUM - 2 * ORA;
const REZ = (o) => Object.assign({ la: LA, versiune: "1.41.0",
  monede: { AAVE: { grid4h: "miscare", fisa4h: { jos: 159.35, sus: 201.927, linii: 17 } }, LIT: { perp4h: "liniste", fisa4h: { jos: 3.009, sus: 4.224, linii: 17 } }, PUMP: { perp4h: "nu-stiu" }, SOL: { perp4h: "nemasurat" } },
  grid: { interval: "4h", canal: "±2×ATR", miscare: -0.011341049, liniste: -0.0081260081, oricand: -0.0094456786, dovedit: true, miscareDovedita: true, canal4h: "+4,2/−3,9 ATR", fisa4hLa: LA },
  perp: { la: LA, monede: 102, prag: 200000, bilant: { verdict: "prea puține" } } }, o || {});
const cuVerdict = (v) => REZ({ perp: { ...REZ().perp, bilant: { verdict: v } } });

// ---- lotul A: I-524 comparația ----
await test("(A) I-524 comparaInterval: propunerea LIT 3.177–3.962 față de Busola 3.009–4.224 ⇒ „cu 35% mai îngust”; mai larg; ±10% ⇒ „cam la fel”; date lipsă ⇒ null", () => {
  assert.equal(typeof B.comparaInterval, "function", "lipsește Busola.comparaInterval");
  const c = B.comparaInterval({ jos: 3.009, sus: 4.224 }, 3.177, 3.962);
  assert.equal(Math.round(c.raport * 100), -35); assert.equal(c.text, "intervalul tău e cu 35% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot)");
  assert.equal(B.comparaInterval({ jos: 100, sus: 110 }, 95, 118).text, "intervalul tău e cu 130% mai larg decât al Busolei (al ei a pierdut cel mai puțin, pe spot)");
  assert.equal(B.comparaInterval({ jos: 100, sus: 120 }, 101, 122).text, "intervalul tău e cam la fel de larg ca al Busolei");
  assert.equal(B.comparaInterval({ jos: 100, sus: 120 }, 0, 122), null); assert.equal(B.comparaInterval(null, 1, 2), null);
});
await test("(A) I-524 randFisa cu propunerea: rândul din fișă capătă `comparatie`; fără propunere ⇒ fără", () => {
  const r = B.randFisa(REZ(), "LIT_USDT_PERP", ACUM, String, { jos: 3.177, sus: 3.962 });
  assert.equal(r.comparatie, "intervalul tău e cu 35% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot)"); assert.equal(r.scurt, "jos 3.009 · sus 4.224 · 17 linii");
  assert.equal(B.randFisa(REZ(), "LIT", ACUM, String).comparatie, null);
  assert.ok(fnApp("grBusolaFisaHtml").includes("{jos:st.jos,sus:st.sus}") && fnApp("grBusolaFisaHtml").includes("r.comparatie"), "fișa nu dă propunerea și nu arată comparația");
});
// ---- lotul A: I-518 cartela ----
await test("(A) I-518 Busola.cartela: un singur producător - eticheta (starea + nota), intervalul (cu comparația față de gridul botului), rândul scurt; fără rezumat ⇒ null", () => {
  assert.equal(typeof B.cartela, "function", "lipsește Busola.cartela");
  const c = B.cartela(REZ(), "AAVE.PERP", ACUM, { kv: { stare: "miscare", de: ACUM - 8 * ORA }, pret: String, prop: { jos: 170, sus: 190 } });
  assert.deepEqual(c.eticheta, { stare: "miscare", nivel: "atentie", text: "mai agitată ca de obicei", nota: "de 8 h · măsurat acum 2 h" });
  assert.ok(c.interval.text.endsWith("jos 159.35 · sus 201.927 · 17 linii"), c.interval.text); assert.equal(c.interval.scurt, "jos 159.35 · sus 201.927 · 17 linii"); assert.equal(c.interval.comparatie, "intervalul tău e cu 53% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot)");
  assert.equal(c.rand, "AAVE mai agitată de 8 h");
  const p = B.cartela(REZ(), "PUMP", ACUM, {}); assert.equal(p.eticheta.text, "nimic neobișnuit"); assert.equal(p.interval, null); assert.equal(p.rand, "PUMP nimic neobișnuit");
  assert.equal(B.cartela(null, "AAVE", ACUM, {}), null);
});
await test("(A) I-518 htmlCartela: rândurile în forma Tabloului (tbLinie) - starea cu nota și culoarea, intervalul cu comparația; fără interval ⇒ un singur rând", () => {
  assert.equal(typeof B.htmlCartela, "function", "lipsește Busola.htmlCartela");
  const h = B.htmlCartela(B.cartela(REZ(), "AAVE", ACUM, { kv: { stare: "miscare", de: ACUM - 8 * ORA }, pret: String, prop: { jos: 170, sus: 190 } }), esc);
  assert.equal(text(h), "Busola, pe 4h de 8 h · măsurat acum 2 h mai agitată ca de obicei Intervalul Busolei (4h) intervalul tău e cu 53% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot) jos 159.35 · sus 201.927 · 17 linii");
  assert.match(h, /<b class="tbWarn">mai agitată ca de obicei<\/b>/); assert.equal((h.match(/class="tbLinie"/g) || []).length, 2);
  assert.equal((B.htmlCartela(B.cartela(REZ(), "PUMP", ACUM, {}), esc).match(/class="tbLinie"/g) || []).length, 1);
  assert.equal(B.htmlCartela(null, esc), "");
});
// ---- lotul A: I-517 grupurile ----
await test("(A) I-517 Tabloul: blocul „Pe zi, la închidere, ce știm” în 3 grupuri - Azi / Dacă închizi acum / Contextul, Busola (cartela) în Contextul; tbGrup + CSS", () => {
  const ex = fnApp("tbDeseneazaExtra"), a = citeste("public", "app.js");
  const i1 = ex.indexOf('tbGrup("Azi")'), i2 = ex.indexOf('tbGrup("Dacă închizi acum")'), i3 = ex.indexOf('tbGrup("Contextul")'), ib = ex.indexOf("h+=tbBusolaLinie(b);"), ig = ex.indexOf('linie("Grile, ultimele 24 h"'), ii = ex.indexOf("Dacă îl închizi acum, iei");
  assert.ok(i1 >= 0 && i2 > i1 && i3 > i2, "cele 3 grupuri, în ordine"); assert.ok(i1 < ig && ig < i2 && i2 < ii && ii < i3 && i3 < ib, "grilele sub „Azi”, „iei” sub „Dacă închizi”, Busola sub „Contextul”");
  assert.ok(/^function tbGrup\(t\)\{/m.test(a) && /#tabloubot \.tbGrup\{/.test(citeste("public", "app.css")), "tbGrup + CSS");
  assert.ok(fnApp("tbBusolaLinie").includes("Busola.htmlCartela(Busola.cartela("), "cartela unică pe Tablou");
});
// ---- lotul A: I-519 fișa ----
await test("(A) I-519 fișa: grPliabil - toate secțiunile se pliază pe telefon în afară de „Setările de pus în Pionex”; grPliazaPeTelefon după desen; verdictul lipicios", () => {
  const a = citeste("public", "app.js"), ctx = {}; vm.createContext(ctx); vm.runInContext(fnApp("grPliabil") + "\n;this.f=grPliabil;", ctx);
  assert.equal(ctx.f("Setările de pus în Pionex"), false); assert.equal(ctx.f("Poarta de pornire"), true); assert.equal(ctx.f("Ce spune istoricul tău"), true); assert.equal(ctx.f(""), false);
  assert.ok(/^function grPliazaPeTelefon\(box\)\{/m.test(a), "lipsește grPliazaPeTelefon");
  const rg = fnApp("renderGrid"); assert.ok(/box\.innerHTML=h[^\n]*\n\s*grPliazaPeTelefon\(box\)/.test(rg) || /grPliazaPeTelefon\(box\)/.test(rg), "plierea nu se cheamă după desen");
  assert.ok(/^function grPliereComuta\(cap\)\{/m.test(a), "lipsește grPliereComuta (data-action-click)");
  const css = citeste("public", "app.css"); assert.ok(/\.grVerdict\{[^}]*position:sticky/.test(css) && /@media \(max-width:600px\)\{#gridset \.grPliat>/.test(css), "CSS: verdict lipicios + pliere doar sub 600 px (pragul fișei)");
});

console.log("\n" + (pica ? "V100.92 PICA · " + pica + " din " + (ok + pica) : "V100.92 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
