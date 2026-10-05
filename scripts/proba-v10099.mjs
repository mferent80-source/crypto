// Proba v100.99 (05.10, el: „FA TOATE” pe ideile I-527..I-532 din backlog, după v100.98):
// (1) I-532 intrarea graficului PURĂ (GraficBot.intrareBot) · (2) I-527 „Stopul vs planul” în citire · (3) I-528 șansele măsurate pe linii
// (4) I-529 stopul de probă · (5) I-531 citirea sub grafic pe telefon · (E) versiunile.
// Depozitul e PUBLIC ⇒ un bot construit, nu al lui.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
const G = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.99 · intrarea pură, stopul vs planul, șansele pe linii, stopul de probă, citirea pe telefon");

const M5 = 300000, T0 = Date.UTC(2026, 9, 4, 11, 25);
const zigzag = (n, p0 = 1) => Array.from({ length: n }, (_, i) => { const o = p0 * (i % 2 ? 1.004 : 0.996), c = p0 * (i % 2 ? 0.996 : 1.004); return { t: T0 + i * M5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 100 }; });
const BARE = zigzag(288), P = BARE[BARE.length - 1].c, ACUM = BARE[BARE.length - 1].t + 60000;
const BOT = { id: "B1", directie: "long", gridJos: P * 0.82, gridSus: P * 1.11, pretDeschidere: P * 1.016, opritorPierdereActiv: true, opritorPierdere: P * 0.938, pretLichidare: P * 0.756, pornitLa: T0 + 140 * M5, ordinePerechi: 4, profitTotal: -1.3, investit: 42.47, pozitie: 1139, pretCurent: P };
const BRUT = { buOrderData: { bottom: String(P * 0.82), top: String(P * 1.11), row: 50, gridType: "geometric", initPrice: String(P * 1.016) } };
// TabloExtra de probă: cifre cunoscute, ca să se vadă că intrarea le folosește pe ACESTEA (cu gridul), nu altă socoteală
const apeluri = [];
const TE = {
  dacaInchizi: () => ({ pretZero: P * 1.018 }),
  pretTintaPentru: (b, t) => { apeluri.push("tinta " + t); return P * 1.069; },
  pretOpritorPentru: (b, t) => { apeluri.push("opritor " + t); return P * 0.946; },
  totalLaOpritor: () => -7.41,
  alerteleBotului: (l, id, t) => l.filter((a) => a.bot === id),
};
const D = (extra) => Object.assign({ bot: BOT, brut: BRUT, bare: BARE, plan: { plus: 2.2, minus: 6.5 }, alerteServer: [{ bot: "B1", t: T0 + 100 * M5, nivel: "atentie", titlu: "B1: x" }, { bot: "ALT", t: T0, nivel: "info", titlu: "alt bot" }],
  consLinii: { bot: "B1", stopAcum: P * 0.938, stopPlan: P * 0.93 }, pretViu: P * 1.002, acum: ACUM, W: 1200, st: { ema: true, rsi: true, adx: true }, simplu: true, TabloExtra: TE }, extra || {});

await test("(1) I-532 intrareBot: gridul din Pionex (row = linii, geometric), umplerile cu perechile, alertele DOAR ale botului, lumânarea live, linia pornirii", () => {
  const o = G.intrareBot(D());
  assert.equal(o.grila.linii, 50); assert.equal(o.grila.geo, true); assert.ok(Math.abs(o.grila.jos - P * 0.82) < 1e-12);
  assert.ok(o.umpleri && Array.isArray(o.umpleri.umpleri), "umplerile"); assert.equal(o.perechiPionex, 4);
  assert.deepEqual(o.alerte.map((a) => a.titlu), ["B1: x"], "alertele altui bot nu intră");
  assert.equal(o.bare[o.bare.length - 1].c, P * 1.002, "ultima lumânare = prețul live"); assert.equal(BARE[BARE.length - 1].c, P, "lista primită rămâne");
  assert.equal(o.pornit, BOT.pornitLa); assert.equal(o.consLinii.bot, "B1"); assert.equal(G.intrareBot(D({ consLinii: { bot: "ALT" } })).consLinii, null);
  assert.equal(o.ingust, false); assert.equal(G.intrareBot(D({ W: 400 })).ingust, true); assert.equal(o.per, "24h");
  const svg = G.desen(o).svg; assert.ok(!/NaN|undefined/.test(svg) && /gbPornit/.test(svg));
});
await test("(1) planul CU gridul pe drum: intrarea cere pretTintaPentru(+2,2) și pretOpritorPentru(−6,5), iar liniile stau la prețurile lor", () => {
  apeluri.length = 0; const o = G.intrareBot(D()), k = Object.fromEntries(o.niv.map((x) => [x.k, x.p]));
  assert.deepEqual(apeluri, ["tinta 2.2", "opritor -6.5"]);
  assert.ok(Math.abs(k.planPlus - P * 1.069) < 1e-12 && Math.abs(k.planMinus - P * 0.946) < 1e-12);
  assert.equal(G.intrareBot(D({ plan: null })).niv.some((x) => /^plan/.test(x.k)), false, "fără plan ⇒ fără linii de plan");
});
await test("(2) I-527 „Stopul vs planul”: la stop −7,41 cu planul −6,5 ⇒ „cu 0,91 mai mult” (atenție); la −6,50 ⇒ „în plan”; fără plan ⇒ „Stopul” ca înainte", () => {
  const o = G.intrareBot(D()); assert.deepEqual(o.stopVsPlan, { laStop: -7.41, plan: 6.5 });
  const r = G.citire(o, BOT, P).randuri.find((x) => /^Stopul/.test(x.ce));
  assert.equal(r.ce, "Stopul vs planul"); assert.match(r.text, /la stop pierzi −7,41 USDT, planul −6,50 \(cu 0,91 mai mult\)/); assert.equal(r.stare, "atentie");
  const r2 = G.citire(Object.assign({}, o, { stopVsPlan: { laStop: -6.5, plan: 6.5 } }), BOT, P).randuri.find((x) => /^Stopul/.test(x.ce));
  assert.match(r2.text, /în plan \(−6,50\)/);
  const r3 = G.citire(G.intrareBot(D({ plan: null })), BOT, P).randuri.find((x) => /^Stopul/.test(x.ce)); assert.equal(r3.ce, "Stopul");
  assert.equal(G.intrareBot(D({ bot: Object.assign({}, BOT, { opritorPierdereActiv: false }) })).stopVsPlan, null, "stop stins ⇒ nimic");
});
await test("(3) I-528 șansele MĂSURATE pe liniile lor: marginile 24 h, lichidarea 7 zile, ținta înaintea stopului (cursa); stopul și zero-ul fără cifră inventată", () => {
  const sanse = [{ cod: "iese-jos-24", p: 0.12, titlu: "Atinge marginea de jos în 24 h" }, { cod: "iese-sus-24", p: 0.05 }, { cod: "lichidare", p: 0.02 }, { cod: "cursa", p: 0.38, titlu: "Ținta planului înaintea stopului", text: "din 40" }, { cod: "liniste-24", p: 0.6 }];
  const k = Object.fromEntries(G.intrareBot(D({ sanse })).niv.map((x) => [x.k, x]));
  assert.equal(k.gridJos.sansa, "24 h: 12%"); assert.equal(k.gridSus.sansa, "24 h: 5%"); assert.equal(k.lich.sansa, "7 zile: 2%");
  assert.equal(k.planPlus.sansa, "înaintea stopului, 7 zile: 38%"); assert.equal(k.planPlus.sansaScurt, "38%"); assert.match(k.planPlus.sansaLung, /din 40/);
  assert.equal(k.stop.sansa, undefined); assert.equal(k.zero.sansa, undefined);
  // pe desen: în cadru ⇒ textul gbSansa; ce iese din cadru ⇒ la marginea din stânga, după procentul distanței
  const TEaproape = Object.assign({}, TE, { pretTintaPentru: () => P * 1.003 });   // ținta în cadru (lumânările de probă se mișcă ±0,5%)
  const svg = G.desen(G.intrareBot(D({ sanse, TabloExtra: TEaproape }))).svg;
  assert.match(svg, /class="gbSansa"[^>]*>(<title>[^<]*<\/title>)?înaintea stopului, 7 zile: 38%/); assert.match(svg, /grid jos [\d.]+ \([^)]*\) · 24 h: 12%/);
  assert.equal((G.desen(G.intrareBot(D())).svg.match(/gbSansa/g) || []).length, 0, "fără șanse ⇒ nimic");
});
await test("(4) I-529 stopul de probă: textul spune pierderea cu gridul față de plan; linia apare pe grafic; pagina are butonul, apăsarea și copierea", () => {
  assert.equal(G.stopProba(P * 0.946, P, -6.5, 6.5).text, "stop de probă la " + G.stopProba(P * 0.946, P, -6.5, 6.5).text.split(" la ")[1].split(" (")[0] + " (−5,4%): pierzi −6,50 USDT, exact planul");
  assert.match(G.stopProba(P * 0.93, P, -7.41, 6.5).text, /pierzi −7,41 USDT, cu 0,91 peste plan$/);
  assert.match(G.stopProba(P * 0.97, P, -3, 6.5).text, /cu 3,50 sub plan$/);
  assert.equal(G.stopProba(null, P, -1, 6.5), null);
  const pr = G.stopProba(P * 1.002, P, -3, 6.5), svg = G.desen(G.intrareBot(D({ proba: { pret: pr.pret, text: pr.text } }))).svg;
  assert.match(svg, /<g class="gbProba">.*🧪 stop de probă la/);
  const tel = G.desen(G.intrareBot(D({ W: 390, proba: { pret: pr.pret, text: pr.text, scurt: pr.scurt } }))).svg;   // pe telefon textul lung ieșea din grafic
  assert.ok(/<g class="gbProba"><line [^>]*\/><\/g>/.test(tel) && !tel.includes("🧪"), "pe telefon doar linia - textul e în citirea de sub grafic"); assert.match(pr.scurt, /^[\d.]+ · −3,00 USDT$/);
  assert.match(fnApp("tbProbaPt"), /GraficBot\.stopProba\(tbProbaStop\.pret,.*TabloExtra\.totalCuGridLa\(b,tbProbaStop\.pret\)/);
  assert.match(fnApp("renderTabloGrafic"), /if\(tbProbaStop\.activ&&tbProbaStop\.botId===b\.id\)\{.*GraficBot\.pretLaY\(d\.harta,sy\)/);
  assert.match(fnApp("tbProbaCopiaza"), /navigator\.clipboard\.writeText/);
  assert.match(fnApp("tbDeseneazaCitire"), /data-action-click="tbProbaComuta\(\)"/);
});
await test("(1) renderTabloGrafic cheamă intrarea pură o singură dată, cu planul, șansele, stopul de probă, funding-ul și modul", () => {
  const r = fnApp("renderTabloGrafic");
  assert.match(r, /var oG=GraficBot\.intrareBot\(\{bot:b,brut:brut,bare:bare,plan:/); for (const k of ["sanse:tbSansePt(b)", "proba:tbProbaPt(b)", "funding:tbFundingPt()", "simplu:tbModSimplu()", "st:tbIndStare()"]) assert.ok(r.includes(k), k);
  assert.doesNotMatch(r, /GraficBot\.umpleri\(|niveluriBot\(|pretPentruTotal/, "socoteala a plecat în lib");
  assert.match(fnApp("tbSansePt"), /tbProbVechi\(rez\)/, "cifrele vechi de peste 3 h nu se pun pe grafic");
});
await test("(5) I-531 pe telefon: citirea și imediat sub grafic (același conținut, randat în două locuri), dreapta ascunsă sub 1180 px", () => {
  const ix = citeste("public", "index.html"), css = citeste("public", "app.css");
  assert.match(ix, /<div class="tbGrafic" id="tbGrafic">.*?<\/div><div class="tbCitireMobil" id="tbCitireMobil"><\/div><\/div>/);
  assert.match(css, /@media \(max-width:1180px\)\{#tabloubot #tbCitireCard\{display:none\}#tabloubot \.tbCitireMobil\{display:block/);
  assert.match(fnApp("tbDeseneazaCitire"), /\[\$\("tbCitire"\),\$\("tbCitireMobil"\)\]/);
});
await test("(E) versiunile v100.99 (BUILD_INFO, versiune.js, sw, index ×4, package.json, lanțul cu v10099)", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.(?:99|1\d\d)$|^v10[1-9]\.\d+$/, "de la 99 în sus"); const V = bi.version; assert.ok(bi.badge.startsWith(V + " · "));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V + '";'));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V.replace(".", "-") + '";'));
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V.replace(".", "\\."), "g")) || []).length, 4, "index.html ×4");
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V.slice(1) + ".0"); assert.ok(/npm run test:v10098 && npm run test:v10099( && |")/.test(pk), "lanțul de teste");
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
