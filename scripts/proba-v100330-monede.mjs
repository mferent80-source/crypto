// Proba v100.330 · monedele pe Piața azi (12.11.2026, el: „sugestii de monede la fel cum sunt sugestii de stocks” ⇒ la întrebarea
//   „listele de monede le vrei înapoi cu eticheta istoricului la vedere, ca la acțiuni, chiar dacă revenirea la monede a ieșit sub piață?” ⇒ „da”):
//   „Ce aș cumpăra azi” are din nou listele de monede pe care colectorul le face zilnic (tura-sugestii, de la 8:00): „Monede pe revenire”
//   și „Monede pentru short”, lângă „Boți” și „Acțiuni pe revenire” - fiecare cu eticheta istoricului (dovada pe piață) și cu urmărirea
//   la 7 zile, la vedere. Sub „azi nu” (frâna zilei, pauza, piața în mișcare) rămân la vedere, fără bold și fără ton de sfat.
//   O monedă în AMBELE liste ⇒ „aș sări peste ea”. Tabloul și Discord rămân cum a hotărât el pe 02.11 (fără ele).
//   node scripts/proba-v100330-monede.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); }); }
console.log("\nV100.330 · monedele pe revenire și pentru short pe Piața azi, cu istoricul la vedere · proba\n");

// datele în forma rutelor; sugestiile = /api/istoric-bot?action=sugestii de pe 11.11 (VPS): ambele „n-am aflat”, urmărirea la 7 zile
const REV = (o) => Object.assign({ cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 5, revine: true }, o || {});
const M = (s, scor, o) => Object.assign({ simbol: s + "_USDT_PERP", volum: 10, stare: "candidat", dir: "long", tarie: "mediu", scor, latime: 0.1, profitGrila: 0.0026, traversariZi: 12, revenire: REV({ revine: false }) }, o || {});
const CL = { la: 5, monede: [M("HYPE", 9), M("XMR", 8), M("LTC", 7)] };
const IDEI = { idei: { zi: "2026-11-12", judecate: 203, trecute: 2, actiuni: [], reveniri: [{ simbol: "CRBP" }, { simbol: "CWD" }], dovadaReveniri: { eticheta: "n-am aflat" } } };
const URM_R = "Din 124 de sugestii de cel puțin 7 zile: 14 pe plus, −22,3% în medie de la prețul sugestiei, după comision.";
const URM_S = "Din 139 de sugestii de cel puțin 7 zile: 117 pe plus, +20,1% în medie de la prețul sugestiei, după comision.";
const SUG = { sugestii: { dovada: { revenire: { piata: { eticheta: "n-am aflat" } }, short: { piata: { eticheta: "n-am aflat" } } },
  urmarire: { revenire: { n: 124, text: URM_R }, short: { n: 139, text: URM_S } } } };
const ID = (rev, sh) => ({ reveniriBoti: (c, t, n) => rev.slice(0, n).map((m) => ({ moneda: m, simbol: m + "_USDT_PERP" })), shortBoti: (c, t, n) => sh.slice(0, n).map((m) => ({ moneda: m, simbol: m + "_USDT_PERP" })),
  ideiBoti: (c) => ((c && c.monede) || []).filter((x) => x.stare === "candidat").slice(0, 3) });
function acasa(I, aziNu) {
  const ctx = { escapeHtml: esc, Idei: I || ID(["AKE", "ORDI", "WIF"], ["DOGE", "SUI", "APT"]), acAziNu: () => aziNu || null, acAziNuHtml: (an) => '<p class="acAziNu">⛔ Azi nu: ' + esc(an.motiv || "") + "</p>", acPauzaSezon: () => null };
  vm.createContext(ctx);
  vm.runInContext(["acClasamentSumar", "acSym", "acasaCumpar", "acasaCumpar2Parti"].map((f) => fnDin("acasa-ecran.js", f)).join("\n") + "\n;this.f=acasaCumpar;this.p=acasaCumpar2Parti;", ctx);
  return ctx;
}
const coloane = (h) => h.split('<div class="acCumparCol">').slice(1);

await test("„Ce aș cumpăra azi”: patru coloane — Boți, Monede pe revenire, Monede pentru short, Acțiuni pe revenire", () => {
  const h = acasa().f({ idei: IDEI, clasament: CL, sugestii: SUG }), col = coloane(h);
  assert.equal(col.length, 4, text(h));
  assert.deepEqual(col.map((c) => text(c).split(" ").slice(0, 4).join(" ")), ["Boți HYPE, XMR sau", "Monede pe revenire AKE", "Monede pentru short DOGE", "Acțiuni pe revenire ↩️"]);
});
await test("fiecare listă de monede: numele în bold, fiecare duce la fișa monedei cu direcția listei; eticheta istoricului și urmărirea la 7 zile la vedere", () => {
  const col = coloane(acasa().f({ idei: IDEI, clasament: CL, sugestii: SUG }));
  assert.match(text(col[1]), /^Monede pe revenire AKE , ORDI sau WIF/);
  assert.ok(col[1].includes('data-action-click="gridDeschideMonedaDir(&#39;AKE&#39;,&#39;long&#39;)"'), col[1]);
  assert.match(text(col[1]), /istoricul: n-am aflat/);
  assert.ok(text(col[1]).includes(URM_R), "urmărirea pe revenire la vedere: " + text(col[1]));
  assert.ok(col[2].includes('data-action-click="gridDeschideMonedaDir(&#39;SUI&#39;,&#39;short&#39;)"'), col[2]);
  assert.match(text(col[2]), /^Monede pentru short DOGE , SUI sau APT/);
  assert.match(citeste("public", "app.js"), /var ACTIUNI_PERMISE=new Set\("[^"]* gridDeschideMonedaDir[ "]/, "butonul e pe lista acțiunilor permise");
  assert.ok(text(col[2]).includes(URM_S));
  assert.ok(col[3].includes("<b>CRBP, CWD</b>") && col[3].includes("(n-am aflat)"), "acțiunile rămân ca înainte");
});
await test("sub „azi nu” (frâna zilei): monedele rămân la vedere, fără bold, cu „azi nu pornesc”", () => {
  const col = coloane(acasa(null, { nu: true, motiv: "frâna zilei e trasă" }).f({ idei: IDEI, clasament: CL, sugestii: SUG }));
  assert.ok(!col[1].includes("<b>AKE") && !col[2].includes("<b>DOGE"), "fără bold sub azi nu");
  assert.match(text(col[1]), /AKE, ORDI sau WIF · azi nu pornesc/);
  assert.match(text(col[2]), /DOGE, SUI sau APT · azi nu pornesc/);
  assert.ok(text(col[1]).includes(URM_R), "istoricul rămâne la vedere");
});
await test("o monedă în AMBELE liste (din cele 5): „⚠ SUI e și pe revenire, și la short: aș sări peste ea”", () => {
  const col = coloane(acasa(ID(["AKE", "ORDI", "WIF", "SUI"], ["DOGE", "SUI", "APT"])).f({ idei: IDEI, clasament: CL, sugestii: SUG }));
  assert.match(text(col[2]), /⚠ SUI e și pe revenire, și la short: aș sări peste ea/);
});
await test("goluri cu stare: fără sugestii încă ⇒ „aștept istoricul”; listă goală ⇒ „nimic azi”; clasament fără starea de revenire ⇒ „—”", () => {
  const c = acasa(ID([], [])), col = coloane(c.f({ idei: IDEI, clasament: CL, sugestii: SUG }));
  assert.match(text(col[1]), /nimic azi/); assert.match(text(col[2]), /nimic azi/);
  const g = coloane(acasa().f({ idei: IDEI, clasament: CL, sugestii: null }));
  assert.match(text(g[1]), /aștept istoricul/);
  const fara = { la: 5, monede: [M("HYPE", 9, { revenire: null }), M("XMR", 8, { revenire: null })] };
  assert.match(text(coloane(acasa().f({ idei: IDEI, clasament: fara, sugestii: SUG }))[1]), /Monede pe revenire —/);
});
// revizia Opus (🔵5): Piața azi cere doar sugestiile (&scurt=1), fără istoricul de până la 4.000 de rânduri pe care nu-l citește; ruta îl lasă afară
await test("Piața azi cere din nou sugestiile - scurt, fără istoric (eticheta și urmărirea)", () => {
  assert.match(lib("acasa-ecran.js"), /pas\("sugestii", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=sugestii&scurt=1"\); \}\)/);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /if\(action==="sugestii"\)\{let s=null,l=\[\];try\{s=JSON\.parse\(await env\.ISTORIC\.get\("sugestii"\)\|\|"null"\)\}catch\{s=null\}if\(u\.searchParams\.get\("scurt"\)==="1"\)return json\(\{sugestii:s\}\);/);
});
// revizia Opus (🔵6): numele monedei din câmpul `moneda` (deja curățat), nu din simbolul tăiat de mână (BTC_USDT ⇒ „BTCUSDT”)
await test("numele monedei vine din `moneda` când există (simbol cu alt sufix)", () => {
  const I = { reveniriBoti: () => [{ moneda: "BTC", simbol: "BTC_USDT" }], shortBoti: () => [], ideiBoti: () => [] };
  const col = coloane(acasa(I).f({ idei: IDEI, clasament: CL, sugestii: SUG }));
  assert.ok(col[1].includes("gridDeschideMonedaDir(&#39;BTC&#39;,&#39;long&#39;)"), col[1]);
});
await test("Tabloul și Discord rămân fără listele de monede (hotărârea lui din 02.11)", () => {
  assert.doesNotMatch(lib("t212-ecran.js"), /contTot\.sugestii|reveniriBoti|shortBoti/);
  assert.doesNotMatch(lib("consilier.js"), /reveniriBoti|shortBoti/);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
