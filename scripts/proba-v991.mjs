// Probele v99.1 - cosmeticele auditului din 28.09 (#9, #13, #15 + eticheta listei de alerte):
//   1. alertele nu mai poarta numere cu 16 zecimale: „Gridul propus acum: 0.54747 – 0.62979" (nu 0.5474728091781905), iar la
//      T212 „maximul de dupa cumparare (30.69)", stopul din plan (25.66) - formatate ca preturi
//   2. cele 11 functii scrise si nechemate niciodata au disparut din public/app.js (aceleasi 10 din 22.09 + tbCadentaMs)
//   3. cele 75 de fisiere din era ChatGPT (AUDIT_V*, DEPLOY_V*, FINAL_TEST_RESULTS_*, PARITY_*, FILE_MANIFEST_*) au plecat din
//      radacina in docs/arhiva-chatgpt/ (README trimite acolo)
//   4. lista de alerte din Radar e plafonata la 100 (istoric-bot.js) - eticheta spune „ultimele 100", nu doar „ultimele 7 zile"
// Rulare: node scripts/proba-v991.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = new URL("../", import.meta.url);
const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = ["../public/lib/grid-calcul.js", "../public/lib/t212.js", "../public/lib/alerte.js", "../public/lib/actiuni-semnale.js"].map(citeste).join("\n");
const M = new Function(`${SRC}; return { A: typeof Alerte !== "undefined" ? Alerte : null, AS: typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale : null };`)();
const { A, AS } = M;

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")}`); } }
const T0 = 1_790_600_000_000;

console.log("\nV99.1 · cosmeticele auditului · proba\n");

await test("1a. alerta „muta gridul” scrie preturile ca preturi (5 zecimale sub 1), nu cu 16 zecimale; cand propunerea e gridul des, o spune", () => {
  assert.ok(A && typeof A.reguli === "function", "Alerte.reguli lipseste");
  const b = { id: "2386", baza: "JTO.PERP", directie: "long", levier: 5, investit: 98.14, profitTotal: -10.12, pretCurent: 0.5831, gridJos: 0.5722, gridSus: 0.6572, distantaLichidarePct: 19.09 };
  const muta = { nivel: "atentie", motiv: "prețul stă la marginea de jos a gridului (9,6% din interval)", des: true, treceriZi: 18.5, setare: { dir: "long", jos: 0.5474728091781905, sus: 0.6297907862327145, grile: 46, levier: 5, stop: null } };
  const out = A.reguli(b, { semnale: { semafor: { nivel: "tine" }, muta } }, {});
  const m = out["s-muta"]; assert.ok(m && m.nivel === "atentie", JSON.stringify(m));
  assert.match(m.mesaj, /0\.54747 – 0\.62979/, m.mesaj); assert.doesNotMatch(m.mesaj, /\d\.\d{7,}/, "16 zecimale: " + m.mesaj);
  assert.match(m.mesaj, /des|0,3/, "spune ca e gridul des: " + m.mesaj); assert.match(m.mesaj, /18,5/, "trecerile pe zi");
  const rar = A.reguli(b, { semnale: { semafor: { nivel: "tine" }, muta: { ...muta, des: false, treceriZi: 6.2, setare: { ...muta.setare, grile: 6 } } } }, {})["s-muta"];
  assert.doesNotMatch(rar.mesaj, /grid des/); assert.match(rar.mesaj, /6 grile/);
});
await test("1b. alertele planului T212 (stop, trail, tinta) scriu preturile cu 2 zecimale (peste 1) - nu 30.690000534057617", () => {
  const p = { ticker: "APLD_US_EQ", simbol: "APLD", pret: 26.08, pretMediu: 28, maxDupaCumparare: 30.690000534057617, plan: { trailPct: 15, stop: 25.661500453948975, tinta: 31.219000000000001 } };
  const a = AS.alertePlan({ ...p, plan: { trailPct: 15 } }, T0);
  const tr = a.find((x) => /trail/.test(x.cheie)); assert.ok(tr, JSON.stringify(a));
  assert.match(tr.mesaj, /\(30\.69\)/, tr.mesaj); assert.doesNotMatch(tr.mesaj, /\d\.\d{5,}/, tr.mesaj);
  const st = AS.alertePlan({ ...p, pret: 25.5, plan: { stop: 25.661500453948975 } }, T0).find((x) => /stop/.test(x.cheie));
  assert.match(st.titlu, /\(25\.66\)/, st.titlu); assert.match(st.mesaj, /25\.5\b|25\.50/, st.mesaj);
  const ti = AS.alertePlan({ ...p, pret: 31.3, plan: { tinta: 31.219000000000001 } }, T0).find((x) => /tinta/.test(x.cheie));
  assert.match(ti.titlu, /\(31\.22\)/, ti.titlu);
});
await test("2. functiile nechemate au disparut din app.js si fisierul ramane JS valid (node --check il inghite)", async () => {
  const app = citeste("../public/app.js");
  for (const f of ["awaitPionexReady", "markAlertsRead", "marketLabelSymbol", "paperEntryFillFraction", "paperExit", "portfolioReturnsSeries", "safeUiToken", "tbCadentaMs", "trainRegimeModels", "v65BiasScore", "v66Pf"])
    assert.ok(!new RegExp("^(async )?function " + f + "\\(", "m").test(app), f + " e inca definita");
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, ["--check", path.join(RAD.pathname.replace(/^\/([A-Za-z]:)/, "$1"), "public", "app.js")]);
});
await test("3. radacina fara fisierele din era ChatGPT; arhiva in docs/arhiva-chatgpt; README trimite acolo", () => {
  const rad = RAD.pathname.replace(/^\/([A-Za-z]:)/, "$1"), MORTI = /^(AUDIT_V\d+|DEPLOY_V\d+|FINAL_TEST_RESULTS|PARITY_V\d+|FILE_MANIFEST_SHA256|LAYOUT_AUDIT_V\d+|AUDIT\.md$|DEPLOY\.md$)/;
  const ramase = fs.readdirSync(rad).filter((f) => MORTI.test(f));
  assert.deepEqual(ramase, [], "au ramas in radacina: " + ramase.join(", "));
  assert.ok(fs.existsSync(path.join(rad, "docs", "arhiva-chatgpt", "AUDIT_V71.md")), "arhiva lipseste");
  assert.ok(fs.readdirSync(path.join(rad, "docs", "arhiva-chatgpt")).length >= 70, "arhiva prea mica");
  assert.doesNotMatch(citeste("../README.md"), /`AUDIT_V69\.md`/, "README trimite inca la radacina");
  assert.match(citeste("../README.md"), /arhiva-chatgpt/);
});
await test("4. eticheta listei de alerte din Radar spune plafonul real (ultimele 100), nu doar „ultimele 7 zile”", () => {
  const e = citeste("../public/lib/alerte-ecran.js");
  assert.match(e, /class="alSub">[^<]*ultimele 100/, "eticheta VIZIBILA (alSub), nu un comentariu");
  assert.match(citeste("../functions/api/istoric-bot.js"), /slice\(-100\)/, "plafonul din server e 100 (daca se schimba, schimba si eticheta)");
});

console.log(`\nV991 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste} probe trecute\n`);
process.exit(picate ? 1 : 0);
