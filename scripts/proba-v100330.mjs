// Proba v100.330 (12.11.2026, după v100.329, el: „păi nu voiam verdicte la fel crypto și nasdaq” ⇒ „Fiecare cu verdictul lui”):
//   cardurile Crypto și Nasdaq își spun fiecare fraza lor; frâna CONTULUI (raportul lipsă / vechi / VaR peste 4 %, evenimentul mare de azi) apare O SINGURĂ
//   dată, într-o bandă separată deasupra cardurilor (cu măsura frânei, mutată de pe cardul Crypto); la fel în Scan și în Tabloul fără bot.
//   Frânele unei singure piețe rămân pe cardul ei (pauza sezonului și funding-ul la Crypto, exportul T212 nepotrivit la Nasdaq).
//   Colectorul / Discord neschimbat (franaVerb fără „faraCont” dă exact ce dădea).  node scripts/proba-v100330.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const LIB = (f) => citeste("public", "lib", f);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.330 · fiecare card cu verdictul lui, frâna contului o singură dată · proba\n");
const fn = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește funcția " + nume); const j = src.indexOf("\n}\n", i); assert.ok(j > i, "funcția " + nume + " nu se închide"); return src.slice(i, j + 2); };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ZI = 86400000, T0 = Date.UTC(2025, 10, 3);
const serie = (n, f) => Array.from({ length: n }, (_, i) => { const c = f(i); return { time: T0 + i * ZI, open: c, high: c * 1.006, low: c * 0.994, close: c }; });

function ctxEcran() {
  const ls = new Map();
  const c = { console, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, Date, RegExp, Intl, Promise, TextRo: globalThis.TextRo, escapeHtml: esc,
    setInterval: () => 0, setTimeout: () => 0, $: () => null, document: { getElementById: () => null, addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] },
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) }, getJSON: async () => null };
  vm.createContext(c);
  vm.runInContext(["grid-calcul.js", "macro.js", "acasa.js", "acasa-ecran.js"].map(LIB).join("\n;\n") + "\n;this.A = Acasa; this.acasaRef = acasa;", c);
  return c;
}
const RAP = (var95) => ({ cont: { la: Date.now() - 3600000, valoare: { total: 10000 }, risc: { var95 } } });
const VAR57 = "Aș reduce expunerea până sub 4% pe zi: o zi proastă îți ia ~5,7% din cont.";
const monede = (ev) => Array.from({ length: 100 }, (_, i) => ({ simbol: i === 0 ? "BTC_USDT_PERP" : "M" + i + "_USDT_PERP", stare: i > 0 && i <= ev ? "evita" : "candidat", dir: i < 64 ? "short" : "neutru", regim: { miscare: false } }));
const k1h = (n) => Array.from({ length: n }, (_, i) => ({ time: T0 + i * 3600000, open: 100 + Math.sin(i / 7), high: 100.1 + Math.sin(i / 7), low: 99.9 + Math.sin(i / 7), close: 100 + Math.sin(i / 7) }));
const dateZi = (var95) => ({ clasament: { monede: monede(12) }, piata: { qqq: serie(260, (i) => 100 * Math.pow(1.002, i)), vix: [{ time: T0, open: 17, high: 17, low: 17, close: 17 }], fg: { valoare: 28, clasa: "Fear", istoric: [40, 35, 28] } },
  ndx: { actiuni: Array.from({ length: 98 }, (_, i) => ({ s: "A" + i, ch: 1, e50: i < 54, e200: true, rsi: 55 })) }, btc1h: k1h(500), contRaport: RAP(var95), calendar: { evenimente: [] }, piataCol: { funding: null } });

await test("Acasa.franaCont: frâna CONTULUI într-un singur loc - raportul lipsă / vechi / VaR peste 4 % / evenimentul mare; altfel nimic", () => {
  const c = ctxEcran(), A = c.A;
  assert.equal(typeof A.franaCont, "function", "Acasa.franaCont lipsește");
  assert.equal(A.franaCont({ raportStare: "ok", raport: RAP(570).cont }), VAR57);
  assert.equal(A.franaCont({ raportStare: "lipsa" }), "N-aș porni nimic nou: raportul pe tot contul lipsește.");
  assert.equal(A.franaCont({ raportStare: "vechi", raportOre: 15 }), "N-aș porni nimic nou: raportul pe tot contul e vechi de 15 ore.");
  assert.equal(A.franaCont({ eveniment: "CPI SUA." }), "N-aș porni boți noi și n-aș cumpăra chiar înainte de CPI SUA.");
  assert.equal(A.franaCont({ raportStare: "ok", raport: RAP(100).cont }), "");
  assert.equal(A.franaCont({}), "");
});

await test("franaVerb neschimbat fără „faraCont” (colectorul / Discord); cu „faraCont” cardul își păstrează fraza, dar frânele pieței lui rămân (pauza, exportul T212, funding-ul)", () => {
  const c = ctxEcran(), A = c.A;
  const cr = { nivel: "liniste", faCe: "Aș porni boți grid doar unde fișa monedei zice PORNEȘTE, nu pe liniștea pieței singură." }, bu = { nivel: "lateral", faCe: "Aș cumpăra doar ce e deja pe trend, cu stop; restul aș aștepta." };
  const cont = { raportStare: "ok", raport: RAP(570).cont };
  assert.equal(A.franaVerb(cr, Object.assign({ fel: "crypto" }, cont)).faCe, VAR57, "colectorul: ca înainte");
  assert.equal(A.franaVerb(bu, Object.assign({ fel: "bursa" }, cont)).faCe, VAR57, "colectorul: ca înainte");
  assert.equal(A.franaVerb(cr, Object.assign({ fel: "crypto", faraCont: true }, cont)).faCe, cr.faCe, "cardul Crypto: fraza lui");
  assert.equal(A.franaVerb(bu, Object.assign({ fel: "bursa", faraCont: true }, cont)).faCe, bu.faCe, "cardul Nasdaq: fraza lui");
  assert.match(A.franaVerb(cr, Object.assign({ fel: "crypto", faraCont: true, pauza: true, pauzaN: 3 }, cont)).faCe, /3 pierderi la rând/, "pauza sezonului rămâne pe Crypto");
  assert.match(A.franaVerb(bu, Object.assign({ fel: "bursa", faraCont: true, exportNePotrivit: true }, cont)).faCe, /jurnalul T212 nu se potrivește/, "exportul T212 rămâne pe Nasdaq");
  assert.equal(A.franaVerb(cr, Object.assign({ fel: "crypto", faraCont: true, fundingAtentie: "long" }, cont)).faCe, "N-aș porni boți noi: longul plătește un funding mult peste obicei.", "funding-ul rămâne pe Crypto (și cu frâna contului trasă)");
});

await test("pe pagină: cardurile spun fiecare fraza lor (diferite), frâna contului vine separat (acFranaContText), o singură dată", () => {
  const c = ctxEcran();
  c.acasaRef.d = dateZi(570);
  const vc = c.acVremeCrypto(c.acasaRef.d), vb = c.acVremeBursa(c.acasaRef.d);
  assert.match(vc.faCe, /^Aș porni boți grid doar unde fișa monedei zice PORNEȘTE/);
  assert.match(vb.faCe, /^Aș cumpăra doar ce e deja pe trend/);
  assert.notEqual(vc.faCe, vb.faCe, "Crypto și Nasdaq NU mai au aceeași frază");
  assert.equal(typeof c.acFranaContText, "function", "acFranaContText lipsește");
  assert.equal(c.acFranaContText(), VAR57);
  c.acasaRef.d = dateZi(100);
  assert.equal(c.acFranaContText(), "", "fără frână: nimic");
});

await test("banda frânei: deasupra cardurilor, cu măsura frânei (mutată de pe cardul Crypto); fără frână azi spune asta, fără nimic de spus stă ascunsă; nota de pe Nasdaq dispare", () => {
  const c = ctxEcran();
  assert.equal(typeof c.acFranaContHtml, "function", "acFranaContHtml lipsește");
  const h = c.acFranaContHtml(VAR57, '<p class="acMut">Frâna de azi, pusă pe zilele salvate…</p>');
  assert.match(h, /Frâna contului azi/); assert.ok(h.includes(esc(VAR57))); assert.match(h, /Frâna de azi, pusă pe zilele salvate/);
  assert.match(h, /la ambele piețe/, "spune că e aceeași pentru Crypto și Nasdaq");
  c.acFranaContStiut = () => true;   /* revizia (🔵4): „azi nu e trasă” doar cu raportul și calendarul știute - testul de jos ține cazul neștiut */
  assert.match(c.acFranaContHtml("", '<p class="acMut">măsura</p>'), /azi nu e trasă/);
  assert.equal(c.acFranaContHtml("", ""), "");
  const AE = LIB("acasa-ecran.js"), des = fn(AE, "acasaDeseneaza");
  assert.match(des, /acFranaContHtml\(acFranaContText\(\), acMasuraLin\(\)\)/);
  assert.doesNotMatch(des.slice(des.indexOf('acasaVerd($("acVremeCrypto")'), des.indexOf('acasaVerd($("acVremeBursa")')), /acMasuraLin\(\)/, "măsura nu mai stă pe cardul Crypto");
  assert.doesNotMatch(AE, /acFranaNota/, "nota de pe cardul Nasdaq dispare");
  const HTML = citeste("public", "index.html");
  assert.ok(HTML.includes('<div class="acFranaCont" id="acFranaCont" hidden></div><div class="acVerdicte">'), "banda stă imediat deasupra cardurilor");
  const CSS = citeste("public", "app.css");
  assert.ok(CSS.includes(".pzDemo #acasa>.acFranaCont{order:9}"), "în ordinea paginii, înaintea verdictelor (order:10)");
});

await test("Scan și Tabloul fără bot: aceeași frână a contului, o singură dată; fraza fiecărei piețe rămâne a ei", () => {
  const SC = LIB("scan-ecran.js"), ctxS = fn(SC, "scanContext");
  assert.equal(ctxS.split("acFranaContText()").length - 1, 1, "o singură dată în Scan");
  assert.match(ctxS, /scFrana/);
  const APP = citeste("public", "app.js"), preg = APP.slice(APP.indexOf("function tbPregatire("), APP.indexOf("function tbPregatire(") + 3000);
  assert.match(preg, /acFranaContText\(\)/, "Tabloul fără bot: linia frânei contului lângă vremea crypto");
});

await test("colectorul (Discord) neatins: tura de piață nu cere „faraCont”", () => {
  assert.doesNotMatch(citeste("scripts", "lib", "tura-piata.mjs"), /faraCont/);
});

// revizia Opus (12.11): 🟡1 banda cu `hidden` rămânea vizibilă (display:grid bate regula browserului); 🔵4 „azi nu e trasă” cât raportul /
// calendarul încă n-au venit era o afirmație fără date
await test("revizia: banda ascunsă chiar e ascunsă; cât raportul sau calendarul n-au venit nu scrie „azi nu e trasă”", () => {
  assert.match(citeste("public", "app.css"), /#dash \.acFranaCont\[hidden\]\{display:none\}/);
  const c = ctxEcran();
  c.acFranaContStiut = () => false;
  const h = c.acFranaContHtml("", "<p>măsura</p>");
  assert.doesNotMatch(h, /azi nu e trasă/); assert.match(h, /încă verific raportul contului și calendarul/);
  c.acFranaContStiut = () => true;
  assert.match(c.acFranaContHtml("", "<p>măsura</p>"), /Frâna contului: azi nu e trasă/);
  assert.match(LIB("acasa-ecran.js"), /function acFranaContStiut\(\) \{[\s\S]{0,300}rs\.stare !== "necunoscut"[\s\S]{0,120}ev !== undefined/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? " · " + picate + " PICĂ" : ""}\n`);
process.exit(picate ? 1 : 0);
