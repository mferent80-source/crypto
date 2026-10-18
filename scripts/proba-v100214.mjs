// Probele v100.214 (18.10.2026, el: „ok, poți face dacă crezi că e mai bine” — propunerile 7 și 8 din controlul ecranelor).
// (7) Blocajul probei era un steag COMUN pe tot serverul (let proba în _shared/pionex.js, aprins de middleware cât ținea cererea
//     probei) ⇒ cât rula o probă, și cererile colectorului / ale telefonului primeau „probă de ecran: fără cereri către Pionex”
//     (9 ori pe 18.10 în data\colector.log, ex. 18:22:01Z bot-orders 503); invers, două probe suprapuse puteau lăsa una să bată
//     în Pionex. Acum semnul stă pe `env`-ul CERERII (cuProba(env, request) la începutul fiecărei rute care ajunge la Pionex).
// (8) livreaza: o cale `main` schimbată în radar-local.toml OPREA serverul la aducerea principalului (wrangler urmărește configul;
//     18.10 21:19:58, 1,5 min) ⇒ dacă toml-ul e atins, worker-ul se construiește la calea nouă ÎNAINTE de aducere.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as P from "../functions/_shared/pionex.js";
import { onRequest } from "../functions/_middleware.js";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\nv100.214 · blocajul probei pe cerere, nu pe server · livrarea nu mai oprește serverul la config nou · proba\n");
const ENV = { PIONEX_API_KEY: "cheie", PIONEX_API_SECRET: "secret", ISTORIC: { leg: "kv" } };
const cuProba = (h) => new Request("https://radar.test/api/bot-orders", h ? { headers: { "x-proba-ecran": "1" } } : {});
const fetchAdevarat = globalThis.fetch;
let cereri = 0;
globalThis.fetch = async () => { cereri++; await new Promise((r) => setTimeout(r, 30)); return new Response(JSON.stringify({ result: true, data: {} }), { status: 200, headers: { "content-type": "application/json" } }); };

await test("cuProba: cu antet ⇒ env propriu cererii (moștenește cheile și legăturile), fără antet ⇒ același env", () => {
  assert.equal(typeof P.cuProba, "function");
  const e1 = P.cuProba(ENV, cuProba(true)), e0 = P.cuProba(ENV, cuProba(false));
  assert.notEqual(e1, ENV); assert.equal(e1.PIONEX_API_KEY, "cheie"); assert.equal(e1.ISTORIC, ENV.ISTORIC);
  assert.equal(e0, ENV);
  assert.equal(ENV.__probaEcran, undefined, "env-ul comun a fost atins");
  assert.equal(P.cuProba(ENV, null), ENV);
});
await test("cererea de probă NU pleacă spre Pionex (503, spus pe nume)", async () => {
  P.reseteazaRitmPionex(); cereri = 0;
  await assert.rejects(() => P.pionexPrivatGet(P.cuProba(ENV, cuProba(true)), "/api/v1/account/balances"), (e) => e.status === 503 && /probă de ecran/.test(e.message));
  assert.equal(cereri, 0);
});
await test("în ACELAȘI timp: proba e oprită, cererea colectorului ajunge la Pionex (bug-ul din 18.10)", async () => {
  P.reseteazaRitmPionex(); cereri = 0;
  const [p, c] = await Promise.allSettled([
    P.pionexPrivatGet(P.cuProba(ENV, cuProba(true)), "/api/v1/bot/orders"),
    P.pionexPrivatGet(P.cuProba(ENV, cuProba(false)), "/api/v1/bot/orders"),
  ]);
  assert.equal(p.status, "rejected"); assert.equal(c.status, "fulfilled", "colectorul a fost blocat de probă");
  assert.equal(cereri, 1);
});
await test("nu mai există steagul comun: fără marcheazaProba / esteProba / `let proba` în pionex.js", () => {
  assert.equal(P.marcheazaProba, undefined); assert.equal(P.esteProba, undefined);
  assert.ok(!/^let proba\b/m.test(citeste("functions", "_shared", "pionex.js")));
  assert.ok(!/marcheazaProba/.test(citeste("functions", "_middleware.js")));
});
await test("middleware-ul lasă cererea neatinsă și pune tot nosniff", async () => {
  const r = await onRequest({ request: cuProba(true), next: async () => new Response("{}", { headers: { "content-type": "application/json" } }) });
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
});
await test("fiecare rută care ajunge la Pionex își face env-ul cererii la început", () => {
  for (const f of ["bot-orders", "pionex-account", "provider-health"]) {
    const s = citeste("functions", "api", f + ".js");
    assert.match(s, /import \{[^}]*\bcuProba\b[^}]*\} from "\.\.\/_shared\/pionex\.js"/, f + ": nu importă cuProba");
    assert.match(s, /export async function onRequestGet\(\{request,env\}\)\{\s*env=cuProba\(env,request\);/, f + ": env=cuProba(env,request) nu e prima instrucțiune");
  }
});
globalThis.fetch = fetchAdevarat;

// (8) livreaza
const L = await import(new URL("./copie-de-lucru.mjs", import.meta.url));
await test("mainDinToml citește calea worker-ului din radar-local.toml", () => {
  assert.equal(typeof L.mainDinToml, "function");
  assert.equal(L.mainDinToml('name = "x"\nmain = "worker-local/index.js"\ncompatibility_date = "2026-01-01"\n'), "worker-local/index.js");
  assert.equal(L.mainDinToml("# main = \"comentariu/index.js\"\nname = \"x\"\n"), null);
  assert.equal(L.mainDinToml(citeste("radar-local.toml")), "worker-local/index.js");
});
await test("livreaza: toml atins ⇒ worker-ul se construiește la calea nouă ÎNAINTE de aducerea principalului", () => {
  const c = citeste("scripts", "copie-de-lucru.mjs");
  const iToml = c.indexOf('atinse.includes("radar-local.toml")'), iFf = c.indexOf('git(RAD, "merge", "--ff-only", "origin/main")');
  assert.ok(iToml > 0, "livreaza nu se uită dacă radar-local.toml e atins");
  assert.ok(iToml < iFf, "construirea pentru toml-ul nou trebuie să vină ÎNAINTE de merge --ff-only");
  assert.match(c.slice(iToml, iFf), /mainDinToml\(/);
});

// (1)–(6) ecranele: meniurile, subsolul, banda pliată, traducerile
const IDX = citeste("public", "index.html"), APP = citeste("public", "app.js"), CSS = citeste("public", "app.css");
const intre = (s, a, b) => { const i = s.indexOf(a); return i < 0 ? "" : s.slice(i, s.indexOf(b, i + a.length)); };
await test("(1)(5) meniul lateral: Piața pe monede și Monitorul din cloud stau în Laboratorul vechi, nu în Unelte", () => {
  const unelte = intre(IDX, 'id="sideUnelte"', "</div>"), vechi = intre(IDX, 'id="sideVechi"', "</details>");
  for (const k of ["market", "cloud"]) { assert.ok(!unelte.includes(`data-nav="${k}"`), k + " încă în Unelte"); assert.ok(vechi.includes(`data-nav="${k}"`), k + " lipsește din Laborator"); }
  assert.match(APP, /^var PAGINI_ZILNICE=\[[^\]]*\];/m);
  const z = JSON.parse(APP.match(/^var PAGINI_ZILNICE=(\[[^\]]*\]);/m)[1]);
  assert.ok(!z.includes("market") && !z.includes("cloud")); for (const k of ["dash", "tabloubot", "account", "settings", "health"]) assert.ok(z.includes(k), k);
});
await test("telefonul: foaia „Mai mult” are Zilnic / Unelte / Laborator vechi pliat, ca meniul lateral, și nimic pierdut", () => {
  const foaie = intre(IDX, 'id="moreDrawer"', "</div></div><script");
  const cap = [...foaie.matchAll(/class="moreGrupCap">([^<(]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(cap, ["Zilnic", "Unelte", "Laborator vechi"]);
  assert.match(foaie, /<details class="moreVechi" id="moreVechi"><summary class="moreGrupCap">Laborator vechi \(34\)<\/summary>/);
  const vechi = intre(foaie, 'id="moreVechi"', "</details>");
  for (const k of ["market", "cloud", "engine", "signals"]) assert.ok(vechi.includes(`moreNav('${k}'`), k + " nu e în Laborator");
  const zilnic = intre(foaie, ">Zilnic<", 'class="moreGrupCap">Unelte');
  for (const k of ["dash", "tabloubot", "sugestii", "gridset", "gridsim", "carnet", "jurnaltrade", "salt", "scan", "alerts", "montecarlo", "contintreg"]) assert.ok(zilnic.includes(`moreNav('${k}'`), k + " nu e în Zilnic");
  assert.ok(foaie.includes("closeMoreDrawer();openStocksDesk()"), "Nasdaq lipsește pe telefon"); assert.ok(foaie.includes("closeMoreDrawer();deschideAlertsPagina()"));
  assert.equal((foaie.match(/class="moreBtn"/g) || []).length, 55);
  assert.match(CSS, /\.moreVechi>summary\{[^}]*min-height:44px/);
});
await test("(2) subsolul motorului vechi doar în Laboratorul vechi: show() pune peLaborator, CSS ascunde nota în rest", () => {
  assert.match(APP, /function show\(id\)\{document\.body\.classList\.toggle\("peLaborator",typeof PAGINI_ZILNICE!=="undefined"&&!PAGINI_ZILNICE\.includes\(id\)\)/);
  assert.match(CSS, /body:not\(\.peLaborator\) main>\.note\{display:none\}/);
});
await test("(3) Contul Pionex: fâșia veche se PLIAZĂ (decizia din 11.10), bara cu moneda rămâne", () => {
  assert.ok(CSS.includes("html.pzDemo body:not(.pzFasiaDeschisa):has(main>#account.on) main :is(.heroStrip,.tabs){display:none}"));
  assert.ok(CSS.includes("html.pzDemo body:has(main>#account.on) .pzFasiaBtn{display:block}"));
  assert.ok(!/#account\.on\)[^{]*\.toolbar/.test(CSS), "bara cu moneda nu se ascunde pe Contul Pionex");
});
await test("(4)(6) Setări, Starea aplicației, Futures, Nasdaq, Contul Pionex: titlurile în română, push spus pe față", () => {
  for (const vechi of ["Settings &amp; Presets", "Data &amp; System Health", "US Session Context", "Derivatives composite", "Pionex Journal Correctness", "Operations Watchdog", "Live Provider Health", "Backup &amp; Restore", "Earnings Risk"]) assert.ok(!IDX.includes(vechi), "a rămas: " + vechi);
  assert.match(IDX, />Notificări push · neconfigurate</); assert.match(IDX, /alertele tale ajung pe Discord, de la colector/);
  assert.match(IDX, />Istoric D1 \(neconfigurat\)</); assert.match(IDX, />Monitor cloud \(neconfigurat\)</);
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /„Verifică acum” și „Verifică furnizorii”/);
  assert.match(citeste("public", "lib", "acasa-ecran.js"), /Setări → Parola aplicației pe acest dispozitiv/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
