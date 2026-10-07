// Proba v100.120 / colector v101.82 (06.10, el: „creează și o pagină Salt cu acțiunile din listă și le analizezi ca pe cele din Trading 212”):
// specul docs/superpowers/specs/2026-10-06-pagina-salt-design.md · ales: lista + pozițiile mele · acțiuni + ETF-uri · pozițiile le scrie el pe pagină
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "tablou-extra.js", "profil-moneda.js", "probabilitati.js", "semnale-bot.js", "consiliu.js", "actiuni-semnale.js", "consilier.js", "t212.js", "risc-luna.js", "carnet.js", "sugestii-actiuni.js", "reveniri.js", "salt.js"])
  vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Salt: S } = globalThis;
const U = JSON.parse(citeste("public", "data", "salt-univers.json")).instrumente;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.120 · Pagina „Salt”: instrumentele Salt Bank, analizate ca la Trading 212 · proba\n");
const ZI = 86400000, T0 = Date.UTC(2025, 0, 6, 14, 30);
const bareUrcare = () => Array.from({ length: 300 }, (_, i) => { const c = 100 + i * 0.1 + Math.sin(i / 5); return { t: T0 + i * ZI, o: c, h: c * 1.01, l: c * 0.99, c, v: 1000 }; });

await test("(1a) universul: acțiuni + ETF-uri din lista Salt (fără ETC/ETN), fiecare cu ISIN valid, simbol, bursă, fără dubluri; sursa și data", () => {
  const u = JSON.parse(citeste("public", "data", "salt-univers.json"));
  assert.match(u.sursa, /salt\.bank/); assert.ok(U.length >= 500, String(U.length));
  for (const x of U) { assert.match(x.isin, /^[A-Z]{2}[A-Z0-9]{9}\d$/); assert.ok(x.simbol && x.nume && x.bursa, x.isin); assert.ok(x.tip === "actiune" || x.tip === "ETF", x.isin + " " + x.tip); }
  assert.equal(new Set(U.map((x) => x.simbol)).size, U.length); assert.equal(new Set(U.map((x) => x.isin)).size, U.length);
  // revizia (I1): `\b` se pierduse prin heredoc-ul Bash - acum prin Edit; + ETC-urile pe metale (Physical, Commodity, WisdomTree)
  assert.ok(!U.some((x) => /\bETP\b|\bETN\b|\bETC\b|21Shares|Physical|Commodit|Comm\.? ?Secur/i.test(x.nume)), "ETP / ETN / ETC nu intră (Bitcoin Group SE e acțiune și rămâne)");
  for (const s of ["IGLN.L", "IGLD.DE", "COPA.L"]) assert.ok(!U.some((x) => x.simbol === s), "ETC: " + s);
  for (const n of [/Santander/i, /DHL|Deutsche Post/i, /Diageo/i, /Herm[eè]s/i]) assert.ok(U.some((x) => n.test(x.nume)), "lipsește " + n);
  assert.ok(!U.some((x) => /\.(F|SG|BE|DU|MU|HM|HA)$/.test(x.simbol) && U.some((y) => y.isin !== x.isin)), "fără burse regionale germane");
  assert.ok(U.every((x) => typeof x.moneda === "string" && x.moneda.length >= 3), "moneda pe fiecare instrument");
  for (const [s, t] of [["AXP", "actiune"], ["GE", "actiune"], ["AZN", "actiune"]]) { const x = U.find((y) => y.simbol === s); if (x) assert.equal(x.tip, t, s); }
  for (const s of ["AMZN", "ADS.DE", "GOOGL"]) assert.ok(U.some((x) => x.simbol === s), s);
});
await test("(1b) căutarea în univers: după nume, ISIN sau simbol, fără diacritice / majuscule, cel mult 20", () => {
  assert.equal(S.cauta(U, "amazon")[0].simbol, "AMZN"); assert.equal(S.cauta(U, "de000a1ewww0")[0].simbol, "ADS.DE"); assert.equal(S.cauta(U, "ads.de")[0].isin, "DE000A1EWWW0");
  assert.ok(S.cauta(U, "a").length <= 20); assert.deepEqual(S.cauta(U, ""), []);
});
await test("(1c) poziția scrisă de el: curățată (ISIN din univers, cantitate și preț pozitive, data opțională), cu simbolul și numele din univers; altfel null", () => {
  const p = S.pozitieCurata({ isin: "US0231351067", qty: "10", pretMediu: "180,5", de: "2026-09-01" }, U);
  assert.deepEqual(p, { isin: "US0231351067", simbol: "AMZN", nume: U.find((x) => x.isin === "US0231351067").nume, qty: 10, pretMediu: 180.5, de: "2026-09-01", plata: "simbol" });   // revizia (I2): + moneda plății
  assert.equal(S.pozitieCurata({ isin: "XX0000000000", qty: 1, pretMediu: 1 }, U), null); assert.equal(S.pozitieCurata({ isin: "US0231351067", qty: 0, pretMediu: 1 }, U), null);
  assert.equal(S.pozitieCurata({ isin: "US0231351067", qty: 1, pretMediu: 1, de: "ieri" }, U).de, null);
});
await test("(1d) analiza poziției = cea de la T212: starea, semaforul, stopul care urcă, probabilitățile, sfaturile, verdictul Consilierului", () => {
  const b = bareUrcare(), a = S.analizeaza({ isin: "US0231351067", simbol: "AMZN", nume: "Amazon", qty: 10, pretMediu: 110, de: null }, b, T0 + 300 * ZI);
  assert.ok(a.cons && ["tine", "atentie", "iesi", "asteapta"].includes(a.cons.nivel), JSON.stringify(a.cons && a.cons.nivel)); assert.ok(a.cons.faCe);
  assert.ok(a.niv && a.niv.stopPozitie > 0 && a.niv.stopPozitie < a.p.pret); assert.ok(Math.abs(a.p.ppl - (a.p.pret - 110) * 10) < 1e-9);
  assert.equal(S.analizeaza({ isin: "X", simbol: "X", qty: 1, pretMediu: 1 }, [], T0).eroare, "fara-bare");
});
await test("(1e) trendul pe 50 / 200 de zile și rândul din tabel (prețul, ziua de ieri) - doar pe bara închisă", () => {
  const b = bareUrcare(), r = S.randTabel({ isin: "I", simbol: "S", nume: "N", tip: "actiune", bursa: "NMS" }, b, T0 + 300 * ZI);
  assert.equal(r.trend, "sus"); assert.ok(Math.abs(r.pret - b[299].c) < 1e-9); assert.ok(Math.abs(r.zi - (b[299].c / b[298].c - 1)) < 1e-12);
  const jos = b.map((x, i) => ({ ...x, c: 200 - i * 0.3, o: 200 - i * 0.3, h: 201 - i * 0.3, l: 199 - i * 0.3 })); assert.equal(S.randTabel({ isin: "I", simbol: "S" }, jos, T0 + 300 * ZI).trend, "jos");
  assert.match(S.textTrend("sus"), /peste media/); assert.equal(S.randTabel({ isin: "I", simbol: "S" }, [], T0), null);
});
// ---------------- revizia Opus (C2, I2–I5, minorele) ----------------
globalThis.escapeHtml = globalThis.escapeHtml || ((s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
if (typeof globalThis.saltHtml !== "function") vm.runInThisContext(citeste("public", "lib", "salt-ecran.js"), { filename: "salt-ecran.js" });
const fxBare = Array.from({ length: 300 }, (_, i) => ({ t: T0 + i * ZI, o: 1.1, h: 1.1, l: 1.1, c: i < 100 ? 1.05 : 1.15, v: 0 }));
await test("(R-I2) moneda: prețul mediu plătit în EUR se convertește în moneda simbolului la cursul din ziua cumpărării (azi, fără dată); GBp = pence; perechea de curs", () => {
  assert.equal(S.perecheFx("USD"), "EURUSD=X"); assert.equal(S.perecheFx("GBp"), "EURGBP=X"); assert.equal(S.perecheFx("EUR"), null); assert.equal(S.perecheFx("DKK"), "EURDKK=X");
  assert.ok(Math.abs(S.medieInMonedaSimbolului({ pretMediu: 100, plata: "EUR", de: new Date(T0 + 50 * ZI).toISOString().slice(0, 10) }, "USD", fxBare) - 105) < 1e-9, "cursul din ziua cumpărării");
  assert.ok(Math.abs(S.medieInMonedaSimbolului({ pretMediu: 100, plata: "EUR", de: null }, "USD", fxBare) - 115) < 1e-9, "fără dată: cursul de azi");
  assert.ok(Math.abs(S.medieInMonedaSimbolului({ pretMediu: 6.4, plata: "EUR", de: null }, "GBp", fxBare) - 6.4 * 1.15 * 100) < 1e-9, "pence");
  assert.equal(S.medieInMonedaSimbolului({ pretMediu: 180, plata: "simbol" }, "USD", null), 180); assert.equal(S.medieInMonedaSimbolului({ pretMediu: 100, plata: "EUR" }, "USD", null), null, "fără curs: nu ghicesc");
  assert.match(S.verificaMedie(6.4, 560.9), /prea departe/); assert.equal(S.verificaMedie(180, 210), null);
  assert.equal(S.inMoneda("Prețul e sub stopul care urcă ($271.38)", "EUR"), "Prețul e sub stopul care urcă (271,38 EUR)");
});
await test("(R-I3/I5) analiza: stopul care urcă de cel puțin 15% de la maxim (ca la T212), procentul poziției știut (nu „pe —”), fără dată ⇒ se spune", () => {
  const b = bareUrcare(), a = S.analizeaza({ isin: "US0231351067", simbol: "AMZN", qty: 10, pretMediu: 110, de: new Date(T0).toISOString().slice(0, 10) }, b, T0 + 300 * ZI);
  const max = Math.max(...b.map((x) => x.h)); assert.ok(a.niv.stopPozitie <= max * 0.85 + 1e-9, a.niv.stopPozitie + " vs " + max * 0.85);
  assert.ok(Math.abs(a.p.pctLei - (a.p.pret / 110 - 1)) < 1e-9); assert.ok(!JSON.stringify(a.cons).includes("pe —"));
  assert.match(globalThis.saltHtml({ univers: U, raport: null, pozitii: [{ isin: "US0231351067", simbol: "AMZN", nume: "Amazon", qty: 10, pretMediu: 110, de: null, plata: "simbol" }], analize: {}, incarcate: true, filtru: "" }, T0), /[Ff]ără data cumpărării/);
});
await test("(R-C2) până nu se citesc pozițiile de pe server, formularul e blocat și salvarea refuză (altfel „Adaugă” ar șterge tot); eroarea se vede", async () => {
  const h = globalThis.saltHtml({ univers: U, raport: null, pozitii: [], analize: {}, incarcate: false, eroare: "N-am putut citi pozițiile: HTTP 401", filtru: "" }, T0);
  assert.match(h, /data-action-click="saltAdauga\(\)" disabled/); assert.match(h, /HTTP 401/); assert.doesNotMatch(h, /n-ai scris încă/);
  globalThis.saltStare.d.incarcate = false; await assert.rejects(() => globalThis.saltSalveaza(), /nu s-au citit/);
});
await test("(R-min) numerele „1.234,56”; data din viitor refuzată; a doua oară același ISIN ⇒ înlocuire spusă; profitul cu o zecimală; Twelve Data nu primește simbolurile Yahoo", () => {
  assert.equal(S.pozitieCurata({ isin: "US0231351067", qty: "1.234,5", pretMediu: "1.234,56" }, U).pretMediu, 1234.56);
  assert.equal(S.pozitieCurata({ isin: "US0231351067", qty: 1, pretMediu: 1, de: "2099-01-01" }, U, Date.UTC(2026, 9, 6)).de, null);
  assert.match(citeste("public", "lib", "salt-ecran.js"), /am înlocuit poziția/);
  assert.match(citeste("functions", "api", "t212.js"), /if \(env\.TWELVE_DATA_API_KEY && !pp && !yh\)/);
  const a = S.analizeaza({ isin: "US0231351067", simbol: "AMZN", qty: 10, pretMediu: 110 }, bareUrcare(), T0 + 300 * ZI), h = globalThis.saltHtml({ univers: U, raport: null, pozitii: [{ isin: "US0231351067", simbol: "AMZN", qty: 10, pretMediu: 110, plata: "simbol" }], analize: { US0231351067: a }, incarcate: true, filtru: "" }, T0);
  assert.doesNotMatch(h, /[+−]\d[\d.]*,\d\d \(/, "profitul cu o zecimală");
});
await test("(R-I4) colectorul: Salt doar DUPĂ tura ideilor de azi (nu în paralel); peste 10% fără prețuri ⇒ eșec (rămâne raportul de ieri); intraday nu rămâne blocat după o așteptare", () => {
  const c = citeste("scripts", "colector.mjs"), f = c.slice(c.indexOf("async function turaSaltZi()"), c.indexOf("async function turaSaltZi()") + 2500);
  assert.match(f, /m\.ideiZi !== zi \|\| ideiInLucru/); assert.match(f, /r\.fara > 0\.1 \* /);
  const g = c.slice(c.indexOf("async function turaSugestiiIntraday()"), c.indexOf("async function turaSugestiiIntraday()") + 3000); assert.match(g, /finally \{ sugIntradayInLucru = false; \}/);
});
// ---------------- (2) serverul ----------------
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix || "")).map((name) => ({ name })) }) }; }
const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
const cheama = async (metoda, qs, corp, brut) => { const mod = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.7." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp || brut) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/t212?${qs}`, { method: metoda, headers: h, body: brut || (corp ? JSON.stringify(corp) : undefined) }), env }); return { status: res.status, d: await res.json().catch(() => null) }; };
await test("(2a) prețurile după simbolul Yahoo (yahoo=ADS.DE) în locul tickerului T212; simbol nevalid ⇒ 400", async () => {
  const urls = [], vechi = globalThis.fetch;
  globalThis.fetch = async (u) => { urls.push(String(u)); return new Response(JSON.stringify({ chart: { result: [{ timestamp: [1759748400], indicators: { quote: [{ open: [1], high: [1], low: [1], close: [1], volume: [5] }] } }] } }), { status: 200, headers: { "content-type": "application/json" } }); };
  try { const r = await cheama("GET", "action=preturi&yahoo=ADS.DE&interval=1d"); assert.equal(r.status, 200); assert.equal(r.d.simbol, "ADS.DE"); assert.equal((await cheama("GET", "action=preturi&yahoo=AD%3BS&interval=1d")).status, 400); }
  finally { globalThis.fetch = vechi; }
  assert.ok(urls.some((u) => /chart\/ADS\.DE\?/.test(u)), urls.join(" "));
});
await test("(2b) pozițiile Salt: scrise de pagină (curățate, cel mult 60), citite cu raportul; raportul colectorului cu „la”", async () => {
  assert.deepEqual((await cheama("GET", "action=salt")).d, { raport: null, pozitii: [] });
  const poz = [{ isin: "US0231351067", simbol: "AMZN", nume: "Amazon", qty: 10, pretMediu: 180.5, de: "2026-09-01" }, { isin: "rau", qty: -1 }, { isin: "DE000A1EWWW0", simbol: "ADS.DE", nume: "<b>adidas</b>", qty: 3, pretMediu: 170, de: "x" }];
  assert.equal((await cheama("POST", "action=saltPozitii", { pozitii: poz })).status, 200);
  const g = (await cheama("GET", "action=salt")).d; assert.equal(g.pozitii.length, 2); assert.equal(g.pozitii[1].de, null); assert.equal(g.pozitii[0].qty, 10);
  assert.equal((await cheama("POST", "action=salt", { raport: { la: T0, tabel: [] } })).status, 200); assert.equal((await cheama("GET", "action=salt")).d.raport.la, T0);
  assert.equal((await cheama("POST", "action=salt", { raport: { tabel: [] } })).status, 400);
});
// ---------------- (3) colectorul ----------------
const TSalt = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-salt.mjs")).href);
await test("(3a) tura Salt: barele fiecărui instrument (simbolul fără prețuri se numără), tabelul tuturor, listele (urcare, revers, revenire) cu istoricul lor", async () => {
  const univ = [{ isin: "A1", simbol: "AAA", nume: "Alfa", tip: "actiune", bursa: "NMS" }, { isin: "B1", simbol: "BBB.DE", nume: "Beta", tip: "ETF", bursa: "GER" }, { isin: "C1", simbol: "LIPSA", nume: "Gama", tip: "actiune", bursa: "NMS" }];
  const r = await TSalt.turaSalt({ Salt: S, SA: globalThis.SugestiiActiuni, Reveniri: globalThis.Reveniri, univers: univ, cereBare: async (s) => s === "LIPSA" ? null : bareUrcare(), acum: T0 + 300 * ZI, jurnal: () => {}, pauza: async () => {} });
  assert.equal(r.judecate, 2); assert.equal(r.fara, 1); assert.equal(r.tabel.length, 2); assert.equal(r.tabel[0].nume, "Alfa"); assert.equal(r.tabel[0].trend, "sus");
  for (const k of ["urcare", "revers", "revine"]) { assert.ok(Array.isArray(r.liste[k]), k); assert.ok(r.dovada[k] && typeof r.dovada[k].text === "string", k); }
  assert.ok(r.la > 0); assert.ok(JSON.stringify(r).length < 262144);
});
await test("(3b) colectorul: Salt încărcat, tura Salt o dată pe zi după idei (universul din public/data), raportul pe server", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const Salt = incarca\("salt\.js", "Salt"\);/); assert.match(c, /import \{ turaSalt as turaSaltModul \} from "\.\/lib\/tura-salt\.mjs";/);
  assert.match(c, /async function turaSaltZi\(\)/); assert.match(c, /m\.saltZi/); assert.match(c, /public", "data", "salt-univers\.json"/); assert.match(c, /await trimite\("\/api\/t212\?action=salt", \{ raport: /);
  assert.match(c, /turaIdeiZi\(\)\.then\(\(\) => turaDimineata\(\)\)\.then\(\(\) => turaSaltZi\(\)\)/);
});
// ---------------- (4) pagina ----------------
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "salt-ecran.js"), { filename: "salt-ecran.js" });
await test("(4a) pagina: pozițiile (cu verdictul Consilierului), formularul, listele cu istoricul, tabelul tuturor (căutabil); totul escapat", () => {
  const a = S.analizeaza({ isin: "US0231351067", simbol: "AMZN", nume: "Amazon <x>", qty: 10, pretMediu: 110, de: null }, bareUrcare(), T0 + 300 * ZI);
  const d = { univers: U, raport: { la: T0, judecate: 500, fara: 3, tabel: [{ isin: "US0231351067", simbol: "AMZN", nume: "Amazon.com <img>", tip: "actiune", bursa: "NMS", pret: 180.5, zi: 0.012, trend: "sus" }],
    liste: { urcare: [], revers: [{ isin: "X", simbol: "XYZ", nume: "Xyz", cadere: 0.2 }], revine: [] }, dovada: { urcare: { text: "După un început de urcare, pe 2 ani: 51%." }, revers: { text: "x" }, revine: { text: "y" } } },
    pozitii: [{ isin: "US0231351067", simbol: "AMZN", nume: "Amazon <x>", qty: 10, pretMediu: 110 }], analize: { US0231351067: a }, incarcate: true, filtru: "" };
  const h = globalThis.saltHtml(d, T0 + 300 * ZI);
  for (const t of ["Pozițiile mele la Salt", "Adaugă poziția", "Început de urcare", "Revers timpuriu", "Pe revenire", "Toate instrumentele", "Ce aș face eu", "XYZ"]) assert.ok(h.includes(t), t);
  assert.doesNotMatch(h, /<img>|<x>/); assert.match(h, /&lt;img&gt;/); assert.match(h, /id="saltCauta"/); assert.match(h, /180,50/);
  assert.doesNotMatch(h, /undefined|NaN/);
});
await test("(4b) pagina fără nimic: spune ce așteaptă (tura de la 8:00, pozițiile tale) și nu cade; filtrul tabelului caută după nume / simbol / ISIN", () => {
  const h = globalThis.saltHtml({ univers: [], raport: null, pozitii: [], analize: {}, incarcate: true, filtru: "" }, T0); assert.match(h, /8:00/); assert.match(h, /n-ai scris încă/);
  const f = globalThis.saltHtml({ univers: U, raport: { la: T0, tabel: [{ isin: "I1", simbol: "AAA", nume: "Alfa", pret: 1, zi: 0, trend: "sus" }, { isin: "I2", simbol: "BBB", nume: "Beta", pret: 1, zi: 0, trend: "jos" }], liste: {}, dovada: {} }, pozitii: [], analize: {}, filtru: "bet" }, T0);
  assert.ok(f.includes(">BBB<") && !f.includes(">AAA<"));
});
await test("(4c) pagina în aplicație: #salt în Zilnic după Trading 212, scripturile după Consilier și în cache (cu universul), navTo o pornește, sertarul „More”", () => {
  const html = citeste("public", "index.html"), app = citeste("public", "app.js"), sw = citeste("public", "sw.js");
  assert.match(html, /<section class="panel" id="salt">/); assert.match(html, /id="saltPagina"/);
  const z = html.slice(html.indexOf('id="sideZilnic"'), html.indexOf('id="sideUnelte"')); assert.ok(z.indexOf('data-nav="salt"') > z.indexOf('data-nav="t212"') && z.indexOf('data-nav="salt"') < z.indexOf('data-nav="scan"'));
  const i1 = html.indexOf('src="/lib/salt.js"'), i2 = html.indexOf('src="/lib/salt-ecran.js"'); assert.ok(i1 > html.indexOf('src="/lib/consilier.js"') && i2 > i1);
  for (const f of ["/lib/salt.js", "/lib/salt-ecran.js", "/data/salt-univers.json"]) assert.ok(sw.includes('"' + f + '"'), f);
  assert.match(app, /if\(id==="salt"\)\{if\(typeof saltPorneste==="function"\)saltPorneste\(false\)\}/); assert.match(html, /moreNav\('salt',true\)/);
});
await test("(E) versiunea de la v100.120 în sus / colector v101.82; meniul 50 de butoane", () => {
  const html = citeste("public", "index.html"); assert.match(html, /content="v100\.1[2-9]\d"/); assert.match(JSON.parse(citeste("package.json")).version, /^100\.1[2-9]\d\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1[2-9]\d";/);   // v100.121: lărgit
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(8[2-9]|9\d)";/);   // v100.125: lărgit (colector v101.83)
  const m = html.slice(html.indexOf('<div class="sideMenu">'), html.indexOf('<div class="sideFooter">')); assert.equal([...m.matchAll(/class="sideBtn/g)].length, 51);   // v100.134: + „Simulator grid”
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
