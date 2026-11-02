// Proba v100.296 (el, 02.11.2026 seara: „verifică și de ce nu se deschide pe toată lățimea decât pe pagina Comportament”).
// Cauza, găsită în cod și măsurată pe 8788 la 1440 / 1920 / 2560 (asezare-toate.mjs, măsura nouă „cutii”): plafonul comun
// `:root{--latime-pagina:1800px}` ținea Piața azi, Tabloul, Jurnalul, Trading 212, Salt și Scannerul la 1800 px ⇒ la 2560 rămâneau
// ~267 px goi de fiecare parte; Comportament (`.coPag{max-width:none}`) era singura care umplea. La 1440 și 1920 nimic nu se schimbă.
// Reparația: plafonul comun devine `none` - același buton pentru toate paginile care îl folosesc, ca la Comportament.
// Ce probează:
//   1. ultima valoare a lui --latime-pagina (cea care câștigă în cascadă) e `none`; nu mai e nicio limită în px pe ea;
//   2. paginile își iau lățimea tot din butonul comun (nicio limită proprie pusă în locul lui); Comportament neatinsă;
//   3. versiunile v100.296; v100.295 pe „≥”.
//   node scripts/proba-v100296.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.296 · paginile pe toată lățimea, ca Comportament · proba\n");
const CSS = citeste("public", "app.css");

await test("1. --latime-pagina: ultima valoare (cea care câștigă) e `none`, nu o limită în px", () => {
  const v = [...CSS.matchAll(/:root\{--latime-pagina:([^};]+)\}/g)].map((m) => m[1].trim());
  assert.ok(v.length >= 1, "lipsește --latime-pagina");
  assert.equal(v[v.length - 1], "none", "ultima valoare: " + v.join(" → "));
  assert.doesNotMatch(CSS, /--latime-pagina:1800px/, "plafonul de 1800 px a rămas");
});

await test("2. paginile își iau lățimea tot din butonul comun; nicio limită proprie în loc; Comportament neatinsă", () => {
  for (const sel of [".t212Card{", "#tabloubot .tbCadru{", "#jurnaltrade>*{", "#dash .acasa,#dash .acGrupuri{", "#scan .scNou,#scan .scVechi{", "#alerts .alCentru{", "#alerts .alEpisoade{"]) {
    assert.ok(CSS.includes(sel + "max-width:var(--latime-pagina)"), sel + " nu mai folosește butonul comun");   /* forma din proba-v10056 */
  }
  assert.match(CSS, /#comportament \.coPag\{box-sizing:border-box;max-width:none;/);
});

await test("2b. Master Verdict (pliul „Analizează o monedă”, Piața azi): pe pagina lată cele 6 cartele încap pe UN rând, iar grila îl întindea cât caseta verdictului (+116 px goi, măsurat la 2560) ⇒ rândul de cartele nu se mai întinde", () => {
  assert.match(CSS, /\.decisionKpis\{[^}]*align-content:start/, ".decisionKpis fără align-content:start");
});

await test("3. versiunile v100.296 (aplicația, BUILD_INFO, pagina, cache-ul, package.json, lanțul); v100.295 pe „≥”", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.296"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(B.version, "v100.296"); assert.match(B.badge, /v100\.296/); assert.equal(Object.keys(B.features)[0], "latime296"); assert.ok(B.features.listeScoase295, "cheia v100.295 rămâne");
  const H = citeste("public", "index.html");
  for (const re of [/<meta content="v100\.296" name="app-version"\/>/, /id="sideVersiune"[^>]*>v100\.296/, /id="antetVersiune"[^>]*>v100\.296/, /healthAppVersion[^>]*>v100\.296/]) assert.match(H, re);
  assert.match(citeste("public", "sw.js"), /CACHE="crypto-radar-v100-296"/);
  const pk = JSON.parse(citeste("package.json")); assert.equal(pk.version, "100.296.0"); assert.equal(pk.scripts["test:v100296"], "node scripts/proba-v100296.mjs"); assert.match(pk.scripts.test, /npm run test:v100295 && npm run test:v100296/);
  assert.doesNotMatch(citeste("scripts", "proba-v100295.mjs"), /VERSIUNE = "v100\\\.295"\/\)/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
