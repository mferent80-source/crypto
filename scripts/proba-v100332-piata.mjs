// Proba v100.332 · Piața azi (12.11.2026, auditul sever al paginii ⇒ el: „repară tot”). Fiecare test ține o constatare din audit:
//   🔴1 calendarul căzut (`eroare`) = eveniment NECUNOSCUT, nu „nimic azi” (pagina, banda, cardul, poza zilei, turele colectorului); la fel `piata.eroare`;
//   🔴2 vârsta datelor colectorului: clasamentul peste ~100 de minute nu mai invită și spune de când e; lățimea Nasdaq peste 30 h nu intră în verdict;
//   🔴3 verdictul bursei fără lățime e galben („lățime necunoscută”), fără VIX nu invită;
//   🟡  riscul pe o zi lipsă ≠ „frâna nu e trasă”; evenimentul rămâne frână 2 ore după; frâna zilei necunoscută; VIX 25–30 fără „mediul e bun”;
//       cererea către GitHub cu limită de timp; formatorul de dată o singură dată + redesenarea grupată; frâna necunoscută rămâne la vedere (și în Scan);
//   🔵  o singură scară de cuvinte pentru frica / lăcomia crypto, nota „pe revenire, dar de ocolit”, „Azi” în ziua schimbării orei, lărgimea crypto
//       nu se scrie peste starea altei piețe, pliul „Fiecare zi” rămâne deschis, „BTC în mișcare” la fel în colector și în pagină.
//   node scripts/proba-v100332-piata.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.332 · Piața azi: reparațiile auditului din 12.11 · proba\n");

const ORA = 3600000, MIN = 60000, ZI = 86400000;
// pagina întreagă într-un context cu un DOM de probă: funcțiile reale, pe date
function lume(o = {}) {
  const ls = new Map(), temporizari = [], elemente = o.elemente || {};
  const ctx = { console, Intl: o.Intl || Intl, Date, Math, JSON, Number, String, Array, Object, isFinite, RegExp, Error, Promise, AbortSignal, TextRo: globalThis.TextRo,
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } },
    document: { getElementById: () => null, addEventListener() {}, querySelector: (s) => (o.deschise && o.deschise.some((x) => s.indexOf(x) >= 0) ? {} : null), hidden: false, body: { classList: { contains: () => false, toggle() {}, add() {} } } },
    $: (id) => elemente[id] || null, setInterval: () => 0, clearTimeout() {}, setTimeout: (f) => { temporizari.push(f); return temporizari.length; }, escapeHtml: esc };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ["grid-calcul.js", "macro.js", "acasa.js", "acasa-ecran.js"].concat(o.inPlus || [])) vm.runInContext(lib(f), ctx, { filename: f });
  ctx.run = (cod) => vm.runInContext(cod, ctx);
  ctx.ls = ls; ctx.temporizari = temporizari; ctx.elemente = elemente;
  return ctx;
}
const A = lume().Acasa, ACUM = Date.now();
const serie = (f, n = 260) => Array.from({ length: n }, (_, i) => ({ t: ACUM - (n - i) * ZI, c: f(i) }));
const SUS = serie((i) => 100 * Math.pow(1.002, i)), LAT = serie((i) => 100 + (i % 2)), JOS = serie((i) => 100 * Math.pow(0.998, i));
const yahoo = (l) => l.map((x) => ({ time: x.t, open: x.c, high: x.c, low: x.c, close: x.c }));
const RAPORT = (o = {}) => ({ cont: Object.assign({ la: ACUM - ORA, valoare: { total: 50000 }, risc: { var95: 1000 } }, o) });
const CLAS = (la, evita = 10) => ({ la, monede: Array.from({ length: 100 }, (_, i) => ({ simbol: "M" + i + "_USDT_PERP", stare: i < evita ? "evita" : "candidat", dir: "neutru", scor: 100 - i, volum: 1000 - i })) });
const EV = (t, titlu = "CPI m/m", impact = "High") => ({ date: new Date(t).toISOString(), title: titlu, impact, country: "USD" });
const NDX = (n, sus) => Array.from({ length: n }, (_, i) => ({ s: "A" + i, ch: 1, e50: i < sus, e200: true, rsi: 55 }));

// ───────────── 🔴1 calendarul căzut ─────────────
await test("🔴1 pagina: calendarul venit cu `eroare` = eveniment necunoscut ⇒ banda NU spune „azi nu e trasă”, spune că n-are calendarul și rămâne la vedere", () => {
  const c = lume();
  c.acasa.d = { contRaport: RAPORT(), calendar: { la: ACUM, evenimente: [], eroare: "calendarul n-a răspuns (429)" }, calendarErr: null };
  assert.equal(c.acEvenimentAzi(), undefined, "evenimentul trebuie să fie necunoscut");
  assert.equal(c.acFranaContStiut(), false);
  const h = c.acFranaContHtml(c.acFranaContText(), "");
  assert.ok(h, "banda nu stă ascunsă cât calendarul lipsește");
  assert.doesNotMatch(text(h), /azi nu e trasă/); assert.match(text(h), /n-am calendarul/); assert.match(text(h), /429/);
  c.acasa.d.calendar = { la: ACUM, evenimente: [] };
  assert.equal(c.acEvenimentAzi(), "", "calendarul bun, fără nimic azi: ca înainte");
  assert.equal(c.acFranaContStiut(), true);
});
await test("🔴1 cardul Calendar: cu `eroare` nu scrie „Nimic important”, spune că n-a venit; poza zilei nu se salvează „fără eveniment”", () => {
  const c = lume();
  const cal = c.Acasa.calendar([], ACUM);
  assert.match(c.acCalendarNota({ calendar: { evenimente: [], eroare: "calendarul n-a răspuns" } }, cal), /Calendarul n-a venit/);
  assert.doesNotMatch(c.acCalendarNota({ calendar: { evenimente: [], eroare: "calendarul n-a răspuns" } }, cal), /Nimic important/);
  assert.match(c.acCalendarNota({ calendar: { evenimente: [] } }, cal), /Nimic important/, "calendarul bun: textul de până acum");
  c.run("var ScorSezon = { calc: function () { return { pauza: false }; } }; function scTrades() { return []; }");
  c.acasa.d = { contRaport: RAPORT(), calendar: { evenimente: [], eroare: "x" } };
  c.acFranaSalveaza();
  assert.equal(c.ls.get("radar-frana-zile-v1"), undefined, "cu calendarul căzut nu se salvează poza zilei");
  c.acasa.d.calendar = { evenimente: [] };
  c.acFranaSalveaza();
  assert.equal(JSON.parse(c.ls.get("radar-frana-zile-v1")).length, 1, "cu calendarul bun poza se salvează");
});
const TP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-piata.mjs")).href);
await test("🔴1 colectorul: calendarul cu `eroare` rămâne necunoscut în tura de piață și în tura contului (nu „fără eveniment”)", () => {
  assert.equal(typeof TP.evenimenteStiute, "function", "tura-piata.mjs: lipsește evenimenteStiute");
  assert.equal(TP.evenimenteStiute(A, { evenimente: [], eroare: "calendarul n-a răspuns" }, ACUM), undefined);
  assert.equal(TP.evenimenteStiute(A, null, ACUM), undefined);
  const l = TP.evenimenteStiute(A, { evenimente: [EV(ACUM + ORA)] }, ACUM);
  assert.equal(l.length, 1); assert.equal(l[0].titlu, "CPI m/m");
  const S = citeste("scripts", "lib", "tura-piata.mjs");
  assert.equal(S.split("evenimenteStiute(").length - 1, 3, "definiția + cele două locuri care trag frâna (vremea, raportul săptămânii)");
  assert.match(citeste("scripts", "lib", "tura-cont.mjs"), /if \(cal && !cal\.eroare && d\.Acasa\.calendar\)/);
});
await test("🔴1 bursele venite cu `eroare` (Yahoo): verdictul și cardul spun de ce, nu „Aduc bursele…” la nesfârșit", () => {
  const c = lume();
  const v = c.acVremeBursa({ piata: { qqq: null, vix: null, eroare: "Yahoo n-a dat prețurile bursei acum" } });
  assert.equal(v.nivel, "fara-date"); assert.match(v.text, /Yahoo n-a dat prețurile/);
  assert.match(fnDin(lib("acasa-ecran.js"), "acasaDeseneaza"), /p\.eroare \? "Bursele n-au venit: " \+ p\.eroare/);
});

// ───────────── 🔴2 vârsta datelor colectorului ─────────────
await test("🔴2 Acasa.vreme: clasamentul mai vechi de ~100 de minute nu mai invită și spune de când e; proaspăt sau fără `la` (colectorul) - ca înainte", () => {
  const cl = { evita: 10, candidati: 90, faraDate: 0, dir: { long: 10, neutru: 80, short: 10 } };
  const vechi = A.vreme({ clasament: cl, btc: { miscare: false }, la: ACUM - 5.5 * ORA, acum: ACUM, stare: { esecuri: 5, deLa: ACUM - 5 * ORA, motiv: "prea multe monede fără date: 40 din 100" } });
  assert.equal(vechi.vechi, true); assert.equal(vechi.nivel, "fara-date"); assert.equal(vechi.eticheta, "DATE VECHI");
  assert.doesNotMatch(vechi.faCe, /^Aș porni/, "nu invită pe date vechi");
  const ora = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ACUM - 5.5 * ORA));
  assert.ok(vechi.titlu.includes(ora), "spune ora clasamentului: " + vechi.titlu);
  assert.match(vechi.text, /prea multe monede fără date/, "spune și de ce n-a venit unul nou");
  assert.equal(vechi.dateLa, ACUM - 5.5 * ORA);
  const bun = A.vreme({ clasament: cl, btc: { miscare: false }, la: ACUM - 40 * MIN, acum: ACUM });
  assert.equal(bun.nivel, "liniste"); assert.ok(!bun.vechi);
  assert.equal(A.vreme({ clasament: cl, btc: { miscare: false } }).nivel, "liniste", "fără `la`: neschimbat (colectorul, probele vechi)");
});
await test("🔴2 pagina: cu clasamentul de 5,5 h cardul Crypto spune „DATE VECHI”, candidatele nu mai sunt îngroșate și „azi nu” spune de ce", () => {
  const c = lume();
  c.acasa.d = { clasament: CLAS(ACUM - 5.5 * ORA), clasamentLa: ACUM };
  const v = c.acVremeCrypto(c.acasa.d);
  assert.equal(v.vechi, true); assert.equal(v.eticheta, "DATE VECHI");
  const an = c.acAziNu();
  assert.equal(an.nu, true); assert.ok(an.motive.some((m) => m.cod === "vechi"), "motivul „vechi”: " + an.motiv);
  const h = c.acasaCumpar(c.acasa.d, an);
  assert.doesNotMatch(h, /<b>M10/); assert.doesNotMatch(h, /Pe ce aș porni un bot/);
  assert.match(text(h), /candidatele din clasament: M10, M11, M12/, "lista rămâne la vedere");
  c.acasa.d = { clasament: CLAS(ACUM - 20 * MIN), clasamentLa: ACUM };
  assert.equal(c.acVremeCrypto(c.acasa.d).nivel, "liniste");
  assert.match(c.acasaCumpar(c.acasa.d, c.acAziNu()), /<b>M10, M11 sau M12<\/b>/, "clasament proaspăt: ca înainte");
});
await test("🔴2 rândul de sus arată și ora clasamentului (nu doar ora cererii)", () => {
  const c = lume();
  const t = ACUM - 3 * ORA, ora = new Date(t).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  assert.ok(c.acCandText({ clasament: CLAS(t), clasamentLa: ACUM }, new Date(ACUM), false).includes("clasamentul de la " + ora));
  assert.match(c.acCandText({ clasamentLa: ACUM }, new Date(ACUM), false), /actualizat /);
});
await test("🔴2 lățimea Nasdaq mai veche de 30 h nu intră în verdict (ca în Scorul zilei); proaspătă - ca înainte", () => {
  assert.equal(A.ndxVechi({ la: ACUM - 31 * ORA }, ACUM), true); assert.equal(A.ndxVechi({ la: ACUM - 29 * ORA }, ACUM), false); assert.equal(A.ndxVechi({}, ACUM), false);
  const c = lume(), piata = { qqq: yahoo(SUS), vix: yahoo(serie(() => 15, 40)) };
  const veche = c.acVremeBursa({ piata, ndx: { la: ACUM - 40 * ORA, actiuni: NDX(100, 70) } });
  assert.equal(veche.latime, "necunoscuta"); assert.match(veche.text, /veche/);
  const bun = c.acVremeBursa({ piata, ndx: { la: ACUM - 2 * ORA, actiuni: NDX(100, 70) } });
  assert.equal(bun.nivel, "larga");
  assert.match(citeste("scripts", "lib", "tura-piata.mjs"), /ndxVechi/, "colectorul aplică aceeași vârstă (Discord spune ce spune pagina)");
});
await test("🔴2 Scan: aceeași vârstă a clasamentului lângă etichetă, fără lățimea veche", () => {
  const el = { innerHTML: "" };
  const c = lume({ inPlus: ["scan.js", "scan-ecran.js"], elemente: { scContext: el } });
  c.acasa.d = { clasament: CLAS(ACUM - 5.5 * ORA), piata: { qqq: yahoo(SUS), vix: yahoo(serie(() => 15, 40)) }, ndx: { la: ACUM - 40 * ORA, actiuni: NDX(100, 70) }, contRaport: RAPORT(), calendar: { evenimente: [] } };
  c.scanContext();
  const t = text(el.innerHTML);
  assert.match(t, /DATE VECHI/); assert.match(t, /clasamentul de la /); assert.doesNotMatch(t, /% din acțiuni peste media de 50 de zile/, "lățimea veche nu se mai arată ca de azi");
});

// ───────────── 🔴3 verdictul bursei fără date ─────────────
await test("🔴3 fără lățime: galben, „lățime necunoscută”, fără „o urmează majoritatea” și fără „mediul e bun”", () => {
  const v = A.vremeBursa({ qqq: SUS, vix: 15, ndx: null });
  assert.equal(v.nivel, "ingusta"); assert.equal(v.latime, "necunoscuta"); assert.match(v.eticheta, /^🟡/); assert.match(v.eticheta, /LĂȚIME NECUNOSCUTĂ/);
  assert.doesNotMatch(v.titlu + v.text + v.faCe, /majoritatea|mediul e bun/);
  assert.match(v.faCe, /^Aș cumpăra doar ce e deja pe trend/);
  assert.equal(A.vremeBursa({ qqq: SUS, vix: 15, ndx: { n: 100, e50: 70 } }).nivel, "larga", "cu lățime: ca înainte");
  assert.equal(A.vremeBursa({ qqq: SUS, vix: 15, ndx: { n: 100, e50: 30 } }).latime, "ingusta");
});
await test("🔴3 fără VIX fraza nu invită (urcare și lateral); cu indicele în jos rămâne cum era", () => {
  for (const o of [{ qqq: SUS, vix: null, ndx: { n: 100, e50: 70 } }, { qqq: SUS, vix: null, ndx: null }, { qqq: LAT, vix: null, ndx: { n: 100, e50: 50 } }]) {
    const v = A.vremeBursa(o);
    assert.doesNotMatch(v.faCe, /^Aș cumpăra/, v.nivel + ": " + v.faCe); assert.match(v.faCe, /VIX/); assert.match(v.text, /VIX-ul n-a venit/);
  }
  assert.equal(A.vremeBursa({ qqq: JOS, vix: null, ndx: { n: 100, e50: 30 } }).faCe, "N-aș cumpăra contra trendului; aș ține doar ce are stopul pus.");
  assert.match(A.vremeBursa({ qqq: SUS, vix: 15, ndx: { n: 100, e50: 70 } }).faCe, /^Aș cumpăra/, "cu VIX: invită ca înainte");
});

// ───────────── 🟡 ─────────────
await test("🟡1 raport fără riscul pe o zi sau cu surse lipsă: banda nu spune „nu e trasă”; Acasa.franaCont (Discord) rămâne cum era", () => {
  assert.match(A.riscNecunoscut({ raportStare: "ok", raport: { valoare: { total: 50000 }, risc: { var95: null }, lipsuri: ["boții Pionex"] } }), /n-are riscul pe o zi.*boții Pionex/);
  assert.match(A.riscNecunoscut({ raportStare: "ok", raport: { valoare: { total: 50000 }, risc: { var95: 1000 }, lipsuri: ["pozițiile Trading 212"] } }), /fără pozițiile Trading 212/);
  assert.equal(A.riscNecunoscut({ raportStare: "ok", raport: { valoare: { total: 50000 }, risc: { var95: 1000 }, lipsuri: [] } }), "");
  assert.equal(A.riscNecunoscut({ raportStare: "lipsa" }), "", "raportul lipsă are deja frâna lui");
  assert.equal(A.franaCont({ raportStare: "ok", raport: { valoare: { total: 50000 }, risc: { var95: null } }, eveniment: "" }), "", "franaCont neschimbat");
  const c = lume();
  c.acasa.d = { contRaport: RAPORT({ risc: { var95: null }, lipsuri: ["boții Pionex"] }), calendar: { evenimente: [] } };
  assert.equal(c.acFranaContStiut(), false);
  const h = text(c.acFranaContHtml(c.acFranaContText(), ""));
  assert.doesNotMatch(h, /azi nu e trasă/); assert.match(h, /n-are riscul pe o zi/);
});
await test("🟡2 evenimentul mare de azi rămâne frână încă 2 ore după ora lui, cu „imediat după”", () => {
  assert.equal(A.franaCont({ eveniment: "CPI m/m", evenimentTrecut: true }), "N-aș porni boți noi și n-aș cumpăra imediat după CPI m/m.");
  assert.equal(A.franaCont({ eveniment: "CPI m/m" }), "N-aș porni boți noi și n-aș cumpăra chiar înainte de CPI m/m.", "înainte: ca până acum");
  const c = lume(), d = { contRaport: RAPORT() };
  c.acasa.d = d;
  d.calendar = { evenimente: [EV(ACUM - 5 * MIN)] };
  assert.equal(c.acFranaContText(), "N-aș porni boți noi și n-aș cumpăra imediat după CPI m/m.");
  d.calendar = { evenimente: [EV(ACUM + 5 * MIN)] };
  assert.equal(c.acFranaContText(), "N-aș porni boți noi și n-aș cumpăra chiar înainte de CPI m/m.");
  d.calendar = { evenimente: [EV(ACUM - 3 * ORA)] };
  assert.equal(c.acFranaContText(), "", "după 2 ore frâna evenimentului se ridică");
  d.calendar = { evenimente: [EV(ACUM - 5 * MIN, "Vânzări", "Medium")] };
  assert.equal(c.acFranaContText(), "", "doar evenimentele mari");
});
await test("🟡3 frâna zilei necunoscută (boții închiși n-au venit) ⇒ lista fără bold și motivul spus; pragurile implicite nu se cheamă „ale tale”", () => {
  const c = lume();
  c.run("var Obiceiuri = { frana: function (o) { return { activa: false, depasit: [], praguri: { zi: 20, sapt: 60, rand: 3, boti: 7 }, netZi: 0, netSapt: 0, pornitiAzi: 0, rand: 0 }; } };");
  c.acasa.d = { clasament: CLAS(ACUM - 10 * MIN) };
  c.run("var contTot = { inchise: [], inchiseOk: false, inchiseLa: Date.now() - 270000, boti: [] };");   /* așa lasă t212-ecran o citire picată */
  const an = c.acAziNu();
  assert.equal(an.nu, true); assert.ok(an.motive.some((m) => m.cod === "necunoscut"), an.motiv); assert.match(an.motiv, /nu știu frâna zilei/);
  assert.doesNotMatch(c.acasaCumpar(c.acasa.d, an), /<b>M10/);
  c.run("contTot = { inchise: [], inchiseOk: true, boti: [] };");
  assert.equal(c.acAziNu().nu, false, "lista citită: ca înainte");
  c.run("contTot = { inchise: null, boti: [] };");
  assert.equal(c.acAziNu().nu, false, "încă necitită (în zbor): nu inventează un „nu”");
  c.acasa.d.franaCfgErr = "HTTP 500";   /* cererea configurației a picat (în zbor rămâne „pragurile tale”, ca proba v100.280) */
  assert.match(c.acFranaZileiHtml([], [], null, ACUM), /pragurile implicite/);
  assert.match(c.acFranaZileiHtml([], [], { zi: 10 }, ACUM), /pragurile tale/);
});
await test("🟡4 VIX între 25 și 30 cu indicele pe urcare: nivelul rămâne, dar fraza nu mai spune „mediul e bun” lângă cadranul „frică”", () => {
  const v = A.vremeBursa({ qqq: SUS, vix: 27, ndx: { n: 100, e50: 70 } });
  assert.equal(v.nivel, "larga", "pragurile nu se mută");
  assert.doesNotMatch(v.faCe, /mediul e bun/); assert.match(v.faCe, /^Aș cumpăra ideile pe trend, mereu cu stop/); assert.match(v.faCe, /VIX e la 27,0/);
  assert.match(A.vremeBursa({ qqq: SUS, vix: 20, ndx: { n: 100, e50: 70 } }).faCe, /mediul e bun/, "sub 25: ca înainte");
  assert.equal(A.vremeBursa({ qqq: SUS, vix: 30, ndx: { n: 100, e50: 70 } }).nivel, "frica", "de la 30: ca înainte");
});
await test("🟡6 cererea către robotul de pe GitHub are limită de timp", () => {
  assert.match(fnDin(lib("acasa-ecran.js"), "acasaPorneste"), /fetch\(LatimeUS\.SURSA, \{ cache: "no-store", signal: [^}]*AbortSignal\.timeout\(\d+\)/);
});
await test("🟡7 ziua României: formatorul de dată se creează o dată, nu la fiecare bot (1.000 de boți închiși)", () => {
  let facute = 0;
  const IntlN = { DateTimeFormat: function (...a) { facute++; return new Intl.DateTimeFormat(...a); } };
  const c = lume({ Intl: IntlN });
  const boti = Array.from({ length: 1000 }, (_, i) => ({ id: "b" + i, moneda: "M" + (i % 40), pornit: ACUM - (i + 1) * 3 * ORA, inchis: ACUM - (i + 1) * 3 * ORA + 20 * MIN, net: (i % 3) - 1, baza: 100, rezultat: (i % 3) - 1 }));
  const zile = Array.from({ length: 20 }, (_, i) => ({ z: new Date(ACUM - i * ZI).toISOString().slice(0, 10), pauza: i % 4 === 0, raportStare: "ok", eveniment: "", la: ACUM - i * ZI }));
  facute = 0;
  const st = c.Acasa.botiStatistici(boti, ACUM), m = c.Acasa.masuraFranei(boti, zile);
  assert.ok(facute < 200, "formatoare create: " + facute + " (înainte: câteva mii)");
  assert.equal(st.zile.length, 14); assert.equal(m.aflat, true);
});
await test("🟡7 redesenarea grupată: mai multe cereri sosite la rând ⇒ o singură desenare; pauza sezonului se socotește o dată pe desenare", () => {
  const c = lume();
  let n = 0; c.run("acasaDeseneaza = function () { this.__n = (this.__n || 0) + 1; };");
  for (let i = 0; i < 5; i++) c.acasaDeseneazaGrupat();
  assert.equal(c.temporizari.length, 1, "o singură desenare programată");
  c.temporizari[0](); n = c.run("this.__n");
  assert.equal(n, 1);
  c.acasaDeseneazaGrupat(); assert.equal(c.temporizari.length, 2, "după desenare se poate programa alta");
  const c2 = lume();
  c2.run("var __calc = 0; var ScorSezon = { calc: function () { __calc++; return { pauza: true, serie: { n: 4 } }; } }; function scTrades() { return []; }");
  c2.acasa.memo = {};
  assert.equal(c2.acPauzaSezon(), 4); assert.equal(c2.acPauzaSezon(), 4); assert.equal(c2.run("__calc"), 1, "în aceeași desenare: o socoteală");
  c2.acasa.memo = null;
  c2.acPauzaSezon(); c2.acPauzaSezon(); assert.equal(c2.run("__calc"), 3, "în afara desenării (Scan, Tablou, probe): ca înainte");
});
await test("🟡8 frâna necunoscută rămâne la vedere (și fără măsură); știută și netrasă, fără măsură - ascunsă, ca până acum", () => {
  const c = lume();
  c.acasa.d = {};
  const h = c.acFranaContHtml(c.acFranaContText(), "");
  assert.match(text(h), /încă verific raportul contului și calendarul/);
  c.acasa.d = { contRaport: RAPORT(), calendar: { evenimente: [] } };
  assert.equal(c.acFranaContHtml(c.acFranaContText(), ""), "");
  assert.match(text(c.acFranaContHtml(c.acFranaContText(), "<p>m</p>")), /azi nu e trasă/);
});
await test("🟡8 Scan: frâna contului necunoscută are rândul ei („încă verific”), nu lipsește ca atunci când nu e trasă", () => {
  const el = { innerHTML: "" };
  const c = lume({ inPlus: ["scan.js", "scan-ecran.js"], elemente: { scContext: el } });
  c.acasa.d = { clasament: CLAS(ACUM - 10 * MIN), calendar: { evenimente: [], eroare: "calendarul n-a răspuns" }, contRaport: RAPORT() };
  c.scanContext();
  assert.match(text(el.innerHTML), /Frâna contului: n-am calendarul/);
  c.acasa.d.calendar = { evenimente: [] };
  c.scanContext();
  assert.doesNotMatch(text(el.innerHTML), /Frâna contului/, "știută și netrasă: fără rând, ca înainte");
});

// ───────────── 🔵 ─────────────
await test("🔵 o singură scară de cuvinte pentru frica / lăcomia crypto: Regimul macro spune ce spune cardul (scorurile lui rămân)", () => {
  const c = lume(), M = c.Macro;
  const semn = (v) => M.scor({ fg: { valoare: v } }).semne.find((x) => x.cod === "frica");
  for (const [v, scor] of [[20, -2], [28, -2], [40, -1], [50, 0], [60, 1], [72, 2], [80, 2]]) {
    assert.equal(semn(v).text, c.Acasa.fgNume(v), "la " + v); assert.equal(semn(v).scor, scor, "scorul la " + v + " nu se mută");
  }
});
await test("🔵 „Monede pe revenire” care sunt și „de ocolit pentru grid” primesc o notă", () => {
  const c = lume();
  c.run("var Idei = { reveniriBoti: function (cl, t, n) { return [{ moneda: 'AKE', simbol: 'AKE_USDT_PERP', stare: 'evita' }, { moneda: 'ORDI', simbol: 'ORDI_USDT_PERP', stare: 'candidat' }].slice(0, n); }, shortBoti: function () { return []; } };");
  const d = { clasament: { la: ACUM, monede: [{ simbol: "AKE_USDT_PERP", stare: "evita", revenire: { revine: true } }] }, sugestii: { sugestii: {} } };
  const p = c.acasaCumpar2Parti(d);
  assert.match(p.notaRev, /AKE e și în mișcare/);
  assert.match(text(c.acasaCumpar(d, { nu: false, motive: [] })), /AKE e și în mișcare \(de ocolit pentru grid\)/);
});
await test("🔵 ziua schimbării orei (25.10.2026): „Azi” începe la miezul nopții României, nu cu o oră mai târziu", () => {
  const t = Date.parse("2026-10-25T10:00:00+02:00");
  const b = [{ id: "x", moneda: "X", pornit: Date.parse("2026-10-24T21:10:00Z"), inchis: Date.parse("2026-10-24T21:30:00Z"), net: -30 }];
  assert.equal(A.botiStatistici(b, t).azi.n, 1, "botul închis la 00:30 e de azi");
  const p = Date.parse("2026-03-29T10:00:00+03:00"), ieri = [{ id: "y", moneda: "Y", pornit: Date.parse("2026-03-28T21:10:00Z"), inchis: Date.parse("2026-03-28T21:30:00Z"), net: -30 }];
  assert.equal(A.botiStatistici(ieri, p).azi.n, 0, "29.03: botul închis la 23:30 în ajun nu e de azi");
  assert.equal(A.botiStatistici([{ id: "z", pornit: ACUM - 2 * MIN, inchis: ACUM - MIN, net: 1 }], ACUM).azi.n, 1, "o zi obișnuită: ca înainte");
});
await test("🔵 lărgimea crypto de la server nu se scrie peste starea altei piețe; pliul „pe larg” rămâne umplut cu piața aleasă", () => {
  const c = lume();
  c.run("var marketBreadthV64State = { market: 'STOCKS', score: 61 }; var __desen = 0, __cerut = 0; function renderMarketBreadthV64() { __desen++; } function refreshMarketBreadthV64() { __cerut++; return Promise.resolve(marketBreadthV64State); } function assetClass() { return 'STOCKS'; }");
  const o = c.acLargimeDinServer({ state: "BULLISH", score: 70, market: "CRYPTO" });
  assert.equal(o.score, 70, "cardul „Lărgimea crypto” primește tot lărgimea crypto");
  assert.equal(c.run("marketBreadthV64State.market"), "STOCKS", "starea pieței alese rămâne a ei");
  assert.equal(c.run("__cerut"), 1, "pliul se umple cu piața aleasă");
  c.run("assetClass = function () { return 'CRYPTO'; }; __desen = 0;");
  c.acLargimeDinServer({ state: "BULLISH", score: 70, market: "CRYPTO" });
  assert.equal(c.run("marketBreadthV64State.score"), 70); assert.equal(c.run("__desen"), 1, "pe crypto: ca până acum");
});
await test("🔵 pliul „Fiecare zi” rămâne deschis la redesenare", () => {
  const zile = [{ zi: "2026-11-11", n: 2, net: -3, azi: false }, { zi: "2026-11-12", n: 1, net: 2, azi: true }];
  assert.match(lume({ deschise: ["acZileTab"] }).acZileHtml(zile), /<details class="acZileTab" open>/);
  assert.match(lume().acZileHtml(zile), /<details class="acZileTab">/);
});
await test("🔵 colectorul: „BTC în mișcare” din lumânări, altfel din clasament - ca pagina", () => {
  assert.equal(typeof TP.btcInMiscare, "function", "tura-piata.mjs: lipsește btcInMiscare");
  const cl = { monede: [{ simbol: "BTC_USDT_PERP", regim: { miscare: true } }] };
  assert.equal(TP.btcInMiscare(null, cl), true); assert.equal(TP.btcInMiscare({ miscare: false }, cl), false); assert.equal(TP.btcInMiscare(null, null), false);
});
// revizia Opus v100.332 (🟡3): reîncercarea nu mai e „în 30 s” la fiecare eșec, ci cu pauză crescătoare (1, 2, 4, 5 min) - proba-v100332-revizie.mjs o rulează
await test("🔵 după o tură picată pagina reîncearcă și când are date vechi pe ecran (cu pauză crescătoare); VIX-ul de pe cadran cu o zecimală", () => {
  const P = fnDin(lib("acasa-ecran.js"), "acasaPorneste");
  assert.match(P, /acasa\.la = d\.clasament && d\.piata && d\.tickers && !d\.clasamentErr && !d\.piataErr && !d\.tickersErr \? \(acasa\.esec = 0, Date\.now\(\)\)/);
  assert.match(fnDin(lib("acasa-ecran.js"), "acasaDeseneaza"), /vixU == null \? "—" : acNr\(vixU, 1\)/);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
