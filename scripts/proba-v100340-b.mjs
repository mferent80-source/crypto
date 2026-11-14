// Proba v100.340-b (restul auditului Tabloului botului, „repară tot și fă ideile”, 14.11.2026): reparațiile lăsate la v100.339.
// Modulele paginii și ale serverului sunt rulate așa cum sunt (fără copii ale formulelor).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as TV from "../functions/_shared/tv-note.js";
import { botDeProba, botBrut, GRID } from "./lib/bot-de-proba.mjs";
import { taie, incarcaMotor } from "./lib/motor-pagina.mjs";
import * as NTV from "./lib/tura-nota-tv.mjs";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.340-b · restul auditului Tabloului · proba\n");
const APP = citeste("public", "app.js"), HTML = citeste("public", "index.html"), CSS = citeste("public", "app.css");

// ---------------- (F1) simbolurile LSE de două litere ----------------
// rândul scannerului TradingView pentru un simbol întreg („LSE:BP.”), cu aceeași notă pe toate intervalele
const rand = (s, nota = 0.3) => { const col = TV.tvColoane(); return { s, d: col.map((c) => (c === "name" ? s.split(":")[1] : c === "exchange" ? s.split(":")[0] : c === "close" ? 100 : nota)) }; };
await test("(F1) LSE: simbolul de două litere are punct la coadă pe TradingView (LSE:BP., LSE:RR.), cel de trei sau mai multe nu; BT-A = LSE:BT.A", () => {
  assert.deepEqual(TV.tvDinYahoo("BP.L"), { tickere: [{ ticker: "LSE:BP.", scara: 1 }, { ticker: "LSE:BP", scara: 1 }] });
  assert.deepEqual(TV.tvDinYahoo("rr.l"), { tickere: [{ ticker: "LSE:RR.", scara: 1 }, { ticker: "LSE:RR", scara: 1 }] });
  assert.deepEqual(TV.tvDinYahoo("VOD.L"), { ticker: "LSE:VOD" }); assert.deepEqual(TV.tvDinYahoo("HSBA.L"), { ticker: "LSE:HSBA" }); assert.deepEqual(TV.tvDinYahoo("BT-A.L"), { ticker: "LSE:BT.A" });
  // celelalte burse și acțiunile americane: neschimbate
  assert.deepEqual(TV.tvDinYahoo("SAP.DE"), { ticker: "XETR:SAP" }); assert.deepEqual(TV.tvDinYahoo("OR.PA"), { ticker: "EURONEXT:OR" }, "două litere pe altă bursă: fără punct"); assert.deepEqual(TV.tvDinYahoo("BRK-B"), { us: "BRK.B" }); assert.equal(TV.tvDinYahoo("XX.ZZ"), null);
});
await test("(F1) LSE: cererea întreabă ambele scrieri, iar nota vine de pe cea găsită; negăsit rămâne „negăsit”, nu nota altei firme", () => {
  const tinte = [Object.assign({ cheie: "BP.L" }, TV.tvDinYahoo("BP.L")), Object.assign({ cheie: "VOD.L" }, TV.tvDinYahoo("VOD.L")), Object.assign({ cheie: "ZZ.L" }, TV.tvDinYahoo("ZZ.L"))];
  const cer = TV.tvCereri(tinte); assert.equal(cer.length, 1); assert.deepEqual(cer[0].corp.symbols.tickers.slice().sort(), ["LSE:BP", "LSE:BP.", "LSE:VOD", "LSE:ZZ", "LSE:ZZ."].sort());
  const n = TV.tvPotriveste(tinte, [{ data: [rand("LSE:BP."), rand("LSE:VOD", -0.4)] }]);
  assert.equal(n["BP.L"].tv, "LSE:BP."); assert.equal(n["BP.L"].iv["1D"].all, 0.3); assert.equal(n["VOD.L"].tv, "LSE:VOD");
  assert.equal(n["ZZ.L"].lipsa, "negasit"); assert.deepEqual(n["ZZ.L"].cautat, ["LSE:ZZ.", "LSE:ZZ"]);
});

// ---------------- (F2) cardul vechi al verdictului ----------------
await test("(F2a) cardul vechi (#tbVerdictCard, ascuns din v82) nu mai e în pagină: nici în HTML, nici în stiluri, nici scris de cod", () => {
  for (const id of ["tbVerdictCard", "tbNivel", "tbTitlu", "tbCeFac", "tbDeCe"]) { assert.ok(!HTML.includes('id="' + id + '"'), "index.html încă are #" + id); assert.ok(!APP.includes('$("' + id + '")'), "app.js încă scrie în #" + id); }
  assert.ok(!/tbVerdictCard|\.tbVerdict\b|\.tbVerdictStanga|\.tbVerdictDreapta|#tbNivel\b|#tbTitlu\b|#tbCeFac\b|#tbDeCe\b/.test(CSS), "app.css încă are regulile cardului");
  assert.ok(!/function tbNivelClasa\(/.test(APP), "clasa nivelului nu mai are unde se desena");
  // verdictul lui rămâne socotit și ținut în stare (probele de ecran îl citesc de acolo)
  assert.match(taie(APP, "renderTabloBot"), /tbStare\.verdictCard=\{nivel:v\.nivel,titlu:v\.titlu,ceFac:/);
});
await test("(F2b) rândul vizibil de avertismente: creat o dată; pe calculator stă în capul cartelei cifrelor (chiar sub verdict), pe telefon și tabletă rămâne frate cu gridul larg (tot sub verdict: acolo cifrele sunt sub grafic); fără bot, la fel; la eroarea de parolă poartă explicația și butonul spre Setări", () => {
  const els = {}, mutari = []; let lat = true;
  const parinte = (nume) => ({ nume, insertBefore(x, ref) { mutari.push(nume + "<" + ref.id); x.parentNode = this; } });
  const cadru = parinte("cadru"), sus = parinte("sus"); els.tbGridLarg = { id: "tbGridLarg", parentNode: cadru }; els.tbKpi = { id: "tbKpi", parentNode: sus };
  const mk = () => { const x = { hidden: false, textContent: "", className: "", copii: [], attr: {}, parentNode: null, setAttribute(k, v) { this.attr[k] = v; }, appendChild(c) { this.copii.push(c); } }; Object.defineProperty(x, "id", { set(v) { els[v] = x; this._id = v; }, get() { return this._id; } }); return x; };
  const c = { $: (id) => els[id] || null, document: { createElement: mk }, matchMedia: (q) => { assert.equal(q, "(min-width:1181px)", "același prag ca așezarea pe coloane"); return { matches: lat }; }, tbStare: { routeOk: true, bot: { id: "x" }, citireGoala: false } };
  vm.createContext(c); for (const f of ["tbAvertGazda", "tbAvertVizibil"]) vm.runInContext(taie(APP, f), c);
  c.tbAvertVizibil(["lumânările sunt învechite - ultima citire a picat", "botul ales de tine nu mai e în listă"], false);
  assert.deepEqual(mutari, ["sus<tbKpi"], "calculator, cu bot: în capul cartelei cifrelor"); assert.equal(els.tbAvertVizibil.hidden, false); assert.match(els.tbAvertText.textContent, /^⚠ lumânările sunt învechite.* · botul ales/); assert.equal(els.tbSpreSetari.hidden, true, "fără eroare de parolă: fără buton");
  assert.equal(els.tbSpreSetari.attr["data-action-click"], "mergiLaParola()"); assert.equal(els.tbSpreSetari.textContent, "Deschide Setări (parola)");
  // eroarea de parolă (citirea a picat: cartela cifrelor rămâne la vedere, cu liniuțe) - același loc, cu butonul
  c.tbStare = { routeOk: false, bot: { id: "x" }, citireGoala: false };
  c.tbAvertVizibil(["Serverul cere parola aplicației — pune-o în Setări"], true); assert.equal(els.tbAvertVizibil.hidden, false); assert.equal(els.tbSpreSetari.hidden, false); assert.match(els.tbAvertText.textContent, /parola aplicației/); assert.equal(mutari.length, 1, "nu se mută degeaba");
  c.tbAvertVizibil([], false); assert.equal(els.tbAvertVizibil.hidden, true, "fără avertismente rândul se ascunde"); assert.equal(els.tbSpreSetari.hidden, true);
  c.tbAvertVizibil([], true); assert.equal(els.tbAvertVizibil.hidden, false, "eroarea de parolă ține rândul la vedere chiar fără alt text");
  // fără bot (citire reușită, niciun bot): cartela cifrelor e ascunsă din CSS ⇒ rândul trece înaintea gridului larg; la întoarcerea botului, înapoi
  c.tbStare = { routeOk: true, bot: null, citireGoala: false }; c.tbAvertVizibil(["Pionex: tickere PERP indisponibile (x)"], false); assert.deepEqual(mutari, ["sus<tbKpi", "cadru<tbGridLarg"]);
  c.tbStare = { routeOk: true, bot: null, citireGoala: true }; c.tbAvertVizibil(["x"], false); assert.deepEqual(mutari.slice(-1), ["sus<tbKpi"], "citirea goală ține boții de dinainte: cartela cifrelor e la vedere");
  // telefon / tabletă (sub 1181 px): cartela cifrelor stă sub grafic (măsurat în browser la 412 px) ⇒ rândul e frate cu gridul larg, cu bot sau fără
  lat = false; c.tbStare = { routeOk: true, bot: { id: "x" }, citireGoala: false }; c.tbAvertVizibil(["x"], false); assert.deepEqual(mutari.slice(-1), ["cadru<tbGridLarg"], "îngust, cu bot"); const n = mutari.length;
  c.tbStare = { routeOk: false, bot: null, citireGoala: false }; c.tbAvertVizibil(["parola"], true); assert.equal(mutari.length, n, "îngust: nu se mai mută");
  // la lărgirea ferestrei se reașază singur: tbKpiAsezare (care are ascultătorul de resize) cheamă tbAvertGazda
  lat = true; c.tbStare = { routeOk: true, bot: { id: "x" }, citireGoala: false }; c.tbAvertGazda(); assert.deepEqual(mutari.slice(-1), ["sus<tbKpi"]);
  assert.match(taie(APP, "tbKpiAsezare"), /tbAvertGazda\(\)/, "reașezarea la schimbarea lățimii");
  assert.match(CSS, /#tabloubot\.tbFaraBot \.tbSus,/, "premisa: fără bot cartela cifrelor e ascunsă");
  assert.match(taie(APP, "renderTabloBot"), /var fbA=faraBot&&!tbStare\.citireGoala,pnl=\$\("tabloubot"\)/, "premisa: aceeași condiție ca starea „fără bot” a paginii");
  assert.match(taie(APP, "tbKpiAsezare"), /matchMedia\("\(min-width:1181px\)"\)/, "premisa: același prag ca detaliile cifrelor");
  assert.match(taie(APP, "renderTabloBot"), /var parolaE=eroareActiva&&eroareDeParola\(tbStare\.eroare,tbStare\.eroareStatus\);/);
  // în cartela cifrelor rândul ține toată lățimea; ca frate al gridului larg are locul lui în ordinea cartelelor (altfel order:900 = coada paginii)
  assert.match(CSS, /#tabloubot \.tbSus>#tbAvertVizibil\{grid-column:1 \/ -1;margin:0 0 10px\}/);
  assert.ok(CSS.includes(".pzDemo #tabloubot .tbCadru>*{order:900}"), "premisa: copiii fără regulă merg la coadă");
  const ordine = (sel) => { const m = [...CSS.matchAll(new RegExp("\\.pzDemo #tabloubot \\.tbCadru>" + sel + "\\{order:(\\d+)\\}", "g"))]; return m.length ? Number(m[m.length - 1][1]) : null; };
  const oA = ordine("#tbAvertVizibil"), oV = ordine("#pzVerdict"), oG = ordine("#tbGridLarg"); assert.ok(oA !== null && oA > oV && oA < oG, "avertismentele între verdict (" + oV + ") și gridul larg (" + oG + "): " + oA);
  assert.match(taie(APP, "renderTabloBot"), /tbAvertVizibil\(\(parolaE\?\[[^\]]+\]:\(!eroareActiva&&b&&tbStare\.stocareStricata\?\[v\.titlu\]:\[\]\)\)\.concat\(note\),parolaE\)/);
  // „la prețul viu”, când e ascuns, nu ține loc nici pe ecranul lat (acolo copiii coloanei sunt display:block)
  assert.match(CSS, /#tabloubot #tbKpiTotalViu\[hidden\]\{display:none!important\}/);
});

// ---------------- (F3) totalul la prețul viu ----------------
for (const f of ["grid-calcul.js", "tablou-extra.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const TE = globalThis.TabloExtra;
await test("(F3a) totalul la prețul viu = totalul citirii + poziția × cât s-a mișcat prețul de la citire; în oglindă la short; fără poziție, fără semn sigur sau fără prețuri ⇒ nimic", () => {
  const b = { directie: "long", pozitie: 2, pretCurent: 100, profitTotal: -1.5 };
  assert.deepEqual(JSON.parse(JSON.stringify(TE.totalLaPretViu(b, 101))), { total: 0.5, dif: 2 }); assert.deepEqual(JSON.parse(JSON.stringify(TE.totalLaPretViu(b, 99.5))), { total: -2.5, dif: -1 });
  const s = { directie: "short", pozitie: -2, pretCurent: 100, profitTotal: -1.5 };
  assert.deepEqual(JSON.parse(JSON.stringify(TE.totalLaPretViu(s, 101))), { total: -3.5, dif: -2 }); assert.equal(TE.totalLaPretViu(Object.assign({}, s, { pozitie: 2 }), 99).total, 0.5, "short cu poziția scrisă pozitiv: direcția botului hotărăște");
  assert.equal(TE.totalLaPretViu(b, 100).dif, 0);
  for (const [ce, x, p] of [["fără poziție", Object.assign({}, b, { pozitie: 0 }), 101], ["neutru", Object.assign({}, b, { directie: "neutral" }), 101], ["semn nesigur", Object.assign({}, b, { pnlNerealizatSigur: false }), 101], ["fără total", Object.assign({}, b, { profitTotal: null }), 101],
    ["fără prețul citirii", Object.assign({}, b, { pretCurent: null }), 101], ["fără preț viu", b, null], ["preț viu zero", b, 0], ["fără bot", null, 101]]) assert.equal(TE.totalLaPretViu(x, p), null, ce);
});
await test("(F3b) pe pagină: rândul „la prețul viu ≈ …” apare doar cu preț viu și doar când cifra rotunjită diferă de totalul citirii; altfel e ascuns", () => {
  assert.match(HTML, /<span id="tbKpiTotalSub" class="tbSub">—<\/span><span id="tbKpiTotalViu" class="tbSub" hidden(="")?><\/span><\/div>/);
  const el = { hidden: true, textContent: "" }; let viu = 101;
  const c = { $: (id) => (id === "tbKpiTotalViu" ? el : null), TabloExtra: TE, TextRo: globalThis.TextRo, pvPretViuAcum: () => viu, Number, Math, isFinite };
  vm.createContext(c); for (const f of ["botiNr", "botiBan", "tbKpiTotalViuDeseneaza"]) vm.runInContext(taie(APP, f), c);   /* botiBan-ul ADEVĂRAT (revizia: cel fals ascundea „USDT USDT”) */
  const b = { directie: "long", pozitie: 2, pretCurent: 100, profitTotal: -1.5 };
  c.tbKpiTotalViuDeseneaza(b); assert.equal(el.hidden, false); assert.equal(el.textContent, "la prețul viu: ≈ +0,5 USDT"); assert.equal(el.textContent.split("USDT").length - 1, 1, "unitatea o singură dată");
  viu = 100.01; c.tbKpiTotalViuDeseneaza(b); assert.equal(el.hidden, true, "aceeași cifră rotunjită (−1,5): nu se repetă");
  viu = null; c.tbKpiTotalViuDeseneaza(b); assert.equal(el.hidden, true, "fără preț viu");
  viu = 101; c.tbKpiTotalViuDeseneaza(null); assert.equal(el.hidden, true, "fără bot"); c.tbKpiTotalViuDeseneaza(Object.assign({}, b, { pnlNerealizatSigur: false })); assert.equal(el.hidden, true, "neutru cu semn nesigur");
  assert.match(taie(APP, "tbKpiPretDeseneaza"), /tbKpiTotalViuDeseneaza\(b0\)/, "se redesenează la fiecare tic, cu prețul");
  // 🟡 2: când botul dispare (citire picată, bot închis), rândul nu rămâne cu cifra veche
  assert.match(taie(APP, "tbDeseneazaKpi"), /if\(!b\)\{tbKpiTotalViuDeseneaza\(null\);/, "ramura fără bot stinge rândul");
  // 🔵 13: pe ecranele late rândul se mută cu ora citirii (în #tbKpiDetalii), nu rămâne singur în celulă
  assert.match(APP, /TB_KPI_DET=\[\["tbKpiGrid","tbKpiTotalSub","tbKpiTotalViu"\],/);
});

// ---------------- (F4) totalul pe nivelurile gridului ----------------
const COM = 0.0005, LINII = Array.from({ length: GRID.linii }, (_, k) => GRID.jos + k * GRID.pas);
// adevărul, linie cu linie: din starea botului (poziția, prețul mediu, netul), prețul merge într-un singur sens până la x. „gol” = linia fără
// ordin (ultima umplută). Pe partea câștigului se închid loturi pe liniile lor; pe partea pierderii se deschid loturi noi. Comisionul: pe ce se
// închide pe drum + pe ce rămâne de închis la x (câștig); pe toată poziția la x (pierdere) - aceeași convenție ca modelul paginii.
function adevar(b, x, gol) {
  const sh = b.directie === "short", q = Math.abs(b.pozitie), pd = b.pretDeschidere, p = b.pretCurent, lot = GRID.lot, castig = sh ? x < p : x > p;
  const peDrum = LINII.filter((L) => Math.abs(L - gol) > 1e-9 && (x < p ? L < p - 1e-9 && L >= x - 1e-9 : L > p + 1e-9 && L <= x + 1e-9)).sort((a, c) => (x < p ? c - a : a - c));
  if (castig) { let rest = q, real = 0, vandut = 0; for (const L of peDrum) { const cat = Math.min(lot, rest); if (!(cat > 1e-12)) break; real += cat * (sh ? pd - L : L - pd); vandut += cat * L; rest -= cat; }
    return b.profitNet + real + rest * (sh ? pd - x : x - pd) - (vandut + rest * x) * COM; }
  let tot = b.profitNet + q * (sh ? pd - x : x - pd), qt = q; for (const L of peDrum) { tot += lot * (sh ? L - x : x - L); qt += lot; }
  return tot - qt * x * COM;
}
const aproape = (a, c, ce) => assert.ok(Math.abs(a - c) < 1e-6, ce + ": modelul " + a + " · adevărul " + c);
await test("(F4a) short cu prețul pe o linie (72): câștigul și pierderea la orice preț ies ca socoteala linie cu linie; dincolo de margini totalul câștigului nu mai crește", () => {
  const b = botDeProba("short", 72, 72); assert.ok(Math.abs(Math.abs(b.pozitie) / GRID.lot - 14) < 1e-6, "premisa: 14 loturi deschise, " + b.pozitie);
  for (const x of [71.5, 71.2, 70, 68.3, 65]) aproape(TE.totalCuGridLa(b, x), adevar(b, x, 72), "câștig la " + x);
  aproape(TE.totalCuGridLa(b, 64), adevar(b, 64, 72), "sub marginea de jos"); assert.ok(Math.abs(TE.totalCuGridLa(b, 64) - TE.totalCuGridLa(b, 65)) < 1e-9, "fără poziție sub margine: totalul stă");
  for (const x of [72.4, 72.5, 74, 76, 77.5]) aproape(TE.totalCuGridLa(b, x), adevar(b, x, 72), "pierdere la " + x);
});
await test("(F4b) prețul ÎNTRE linii: linia goală (ultima umplută) e găsită din numărul de loturi deschise - și când prețul a trecut puțin de ea, și când s-a întors", () => {
  for (const p of [72.2, 71.7]) { const b = botDeProba("short", 72, p);
    for (const x of [71.5, 70, 65, 72.5, 74, 76.5]) if (Math.abs(x - p) > 1e-9) aproape(TE.totalCuGridLa(b, x), adevar(b, x, 72), "preț " + p + " → " + x); }
});
await test("(F4c) oglinda la long (prețul coborât la 70; apoi între linii)", () => {
  for (const p of [70, 70.3, 69.8]) { const b = botDeProba("long", 70, p); assert.ok(Math.abs(Math.abs(b.pozitie) / GRID.lot - 12) < 1e-6, "premisa: 12 loturi, " + b.pozitie);
    for (const x of [70.5, 72, 76, 77, 69.5, 68, 65, 64]) if (Math.abs(x - p) > 1e-9) aproape(TE.totalCuGridLa(b, x), adevar(b, x, 70), "long, preț " + p + " → " + x); }
});
await test("(F4d) jumătatea de pas: față de modelul continuu (păstrat ca rezervă), câștigul pe niveluri e mai mare cu ≈ loturile închise × pas ÷ 2; prețul de zero urmează modelul nou", () => {
  const b = botDeProba("short", 72, 72), cont = TE.totalCuGridContinuu(b, 70), niv = TE.totalCuGridLa(b, 70);
  assert.ok(niv > cont, "pe niveluri " + niv + " · continuu " + cont); assert.ok(Math.abs((niv - cont) - 4 * GRID.lot * GRID.pas / 2) < 0.002, "diferența " + (niv - cont) + " față de " + 4 * GRID.lot * GRID.pas / 2);
  for (const T of [0, 0.5, -3]) { const px = TE.pretPentruTotal(b, T); if (px !== null) aproape(TE.totalCuGridLa(b, px), T, "prețul pentru totalul " + T); }
  // totalul e continuu în preț: între două prețuri vecine nu sare
  let ant = TE.totalCuGridLa(b, 64.9); for (let x = 64.95; x <= 77; x += 0.05) { const t = TE.totalCuGridLa(b, x); assert.ok(Math.abs(t - ant) < 0.2, "salt la " + x.toFixed(2) + ": " + ant + " → " + t); assert.ok(t <= ant + 1e-9, "short: totalul nu crește când prețul urcă (" + x.toFixed(2) + ")"); ant = t; }
});
await test("(F4e) rezerva: fără geometrie, la grid geometric sau cu un număr de loturi care nu se potrivește cu liniile, rămâne modelul continuu (nu o cifră ghicită)", () => {
  const b = botDeProba("short", 72, 72), fara = (x) => { const c = JSON.parse(JSON.stringify(b)); x(c); return c; };
  const geo = fara((c) => { c.brut.buOrderData.gridType = "geometric"; }), faraRand = fara((c) => { delete c.brut.buOrderData.row; }), faraLot = fara((c) => { delete c.brut.buOrderData.perVolume; });
  const altaPoz = fara((c) => { c.pozitie = -(Math.abs(c.pozitie) + 5.5 * GRID.lot); }), jumate = fara((c) => { c.pozitie = -(Math.abs(c.pozitie) - 0.45 * GRID.lot); });
  for (const [ce, c] of [["geometric", geo], ["fără row", faraRand], ["fără perVolume", faraLot], ["loturi nepotrivite", altaPoz], ["poziție la jumătate de lot", jumate]]) for (const x of [70, 74])
    assert.equal(TE.totalCuGridLa(c, x), TE.totalCuGridContinuu(c, x), ce + " la " + x);
  assert.notEqual(TE.totalCuGridLa(b, 70), TE.totalCuGridContinuu(b, 70), "control: botul obișnuit merge pe niveluri");
  for (const c of [null, {}, fara((x) => { x.directie = "neutral"; }), fara((x) => { x.pnlNerealizatSigur = false; })]) assert.equal(TE.totalCuGridLa(c, 70), null);
});

await test("(F4f) revizia: lotul parțial rămas se închide pe ultima linie (dincolo de marginea câștigului totalul nu mai crește); poziția din „Dacă prețul ajunge la…” vine din același model; pagina spune ce model a folosit", () => {
  const b = botDeProba("short", 72, 72), cuRest = JSON.parse(JSON.stringify(b)); cuRest.pozitie = -(Math.abs(b.pozitie) + 0.19 * GRID.lot);
  assert.notEqual(TE.totalCuGridLa(cuRest, 65), TE.totalCuGridContinuu(cuRest, 65), "premisa: 0,19 de lot în plus rămâne pe modelul pe niveluri");
  assert.ok(Math.abs(TE.totalCuGridLa(cuRest, 64) - TE.totalCuGridLa(cuRest, 65)) < 1e-9, "sub margine: " + TE.totalCuGridLa(cuRest, 65) + " → " + TE.totalCuGridLa(cuRest, 64)); assert.ok(Math.abs(TE.totalCuGridLa(cuRest, 50) - TE.totalCuGridLa(cuRest, 65)) < 1e-9);
  // poziția după drum, din același model: short cu prețul întors la 71,7 (linia goală e 72) → la 74 se mai deschid 72,5 … 74 = 4 loturi, nu 5
  const b2 = botDeProba("short", 72, 71.7), q = Math.abs(b2.pozitie);
  assert.ok(Math.abs(TE.pozitieCuGridLa(b2, 74) - (q + 4 * GRID.lot)) < 1e-9, "poziția la 74: " + TE.pozitieCuGridLa(b2, 74)); assert.ok(Math.abs(TE.pozitieCuGridLa(b2, 70) - (q - 4 * GRID.lot)) < 1e-9, "la 70 se închid 71,5 … 70"); assert.equal(TE.pozitieCuGridLa(b2, 60), 0);
  for (const f of ["scenariu.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
  const S = globalThis.Scenariu, r = S.scenarii(b2.brut, b2, [{ pret: 74, eticheta: "x" }], (x) => TE.totalCuGridLa(b2, x), (x) => TE.pozitieCuGridLa(b2, x)), fara = S.scenarii(b2.brut, b2, [{ pret: 74, eticheta: "x" }], (x) => TE.totalCuGridLa(b2, x));
  assert.ok(Math.abs(r.randuri[0].pozitie - (q + 4 * GRID.lot)) < 1e-9, "rândul ia poziția modelului: " + r.randuri[0].pozitie); assert.ok(Math.abs(fara.randuri[0].pozitie - (q + 5 * GRID.lot)) < 1e-9, "premisa: fără ea, scenariul vechi număra un lot în plus");
  assert.match(APP, /Scenariu\.scenarii\(tbStare\.botBrut,b,tbTinteScenariu\(b\),tbTotalLa\(b\),tbPozitieLa\(b\)\)/);
  // ce model a dat cifrele: pe linii, sau aproximarea întinsă uniform (poziția nu se potrivește cu liniile / grid geometric / fără geometrie)
  assert.equal(TE.modelTotal(b), "niveluri"); const nepotrivit = JSON.parse(JSON.stringify(b)); nepotrivit.pozitie = -(Math.abs(b.pozitie) + 5.5 * GRID.lot); assert.equal(TE.modelTotal(nepotrivit), "continuu"); assert.equal(TE.modelTotal(null), null);
  const rs = taie(APP, "renderTabloScenarii"); assert.match(rs, /TabloExtra\.modelTotal\(b\)==="niveluri"\?"Socotit pe liniile gridului tău \("/); assert.match(rs, /Aproximare: poziția de acum nu se potrivește cu liniile gridului/);
  assert.match(rs, /După o socoteală mai simplă \(fără linia goală de lângă preț\), contul botului s-ar goli pe la/, "revizia a doua: prețul de golire nu vine din modelul pe linii - nota o spune"); assert.doesNotMatch(rs, /După model,/);
  // revizia a doua (🟡 2): sfatul „Marginea de jos / sus” (Tablou, Consilier, colector) arată poziția din ACELAȘI model ca totalul și ca tabelul
  for (const f of ["alerte.js", "sfaturi.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
  const SF = globalThis.Sfaturi, bl = botDeProba("long", 71, 71.2), pm = TE.pozitieCuGridLa(bl, GRID.jos), pv = S.scenarii(bl.brut, bl, [{ pret: GRID.jos, eticheta: "jos" }]).randuri[0].pozitie;
  assert.ok(pm !== null && Math.abs(pm - pv) > 0.1, "premisa: modelul pe linii (" + pm + ") și scenariul vechi (" + pv + ") dau poziții diferite");
  const mg = SF.sfaturi(SF.intrare({ bot: bl, acum: Date.UTC(2026, 10, 14, 9) })).find((x) => x.cod === "margine");
  assert.ok(mg && mg.text.startsWith("Acolo botul ar avea ~" + globalThis.TextRo.cant(pm) + " "), (mg && mg.text) + " · aștept ~" + globalThis.TextRo.cant(pm));
});

// ---------------- (F5) verdictul Radarului lângă nota TradingView, în jurnalul colectorului ----------------
const ORA = 3600000, BARA4 = 4 * ORA, T0N = Math.floor(Date.UTC(2026, 10, 14, 0) / BARA4) * BARA4;
const randTv = (s, close, n4h, nZ) => { const col = TV.tvColoane(); return { s, d: col.map((c) => (c === "name" ? s.split(":")[1] : c === "exchange" ? s.split(":")[0] : c === "close" ? close : c === "Recommend.All|240" ? n4h : c === "Recommend.All" ? nZ : 0)) }; };
await test("(F5a) la notare, lângă nota TradingView se scrie verdictul Radarului (4 ore și 1 zi, cu scorul); fără verdict sau cu verdictul căzut, nota se scrie oricum", async () => {
  const cerute = [], lume = { cere: async () => ({ data: [randTv("PIONEX:ABCUSDT.P", 10, -0.4, 0.2), randTv("PIONEX:XYZUSDT.P", 5, 0.3, 0.3)] }) };
  const r = await NTV.turaNotaTv({ acum: T0N + 2 * ORA + 1, simboluri: ["ABC_USDT_PERP", "XYZ_USDT_PERP"], stare: null, cere: lume.cere,
    verdict: async (s) => { cerute.push(s); if (s === "XYZ_USDT_PERP") throw new Error("fără lumânări"); return { v4: "BEARISH", s4: 31.2, vZ: "NEUTRAL", sZ: 48 }; } });
  assert.equal(r.notate, 2); assert.deepEqual(cerute, ["ABC_USDT_PERP", "XYZ_USDT_PERP"]);
  const [a, x] = r.stare.jurnal; assert.deepEqual({ rv4: a.rv4, rs4: a.rs4, rvZ: a.rvZ, rsZ: a.rsZ }, { rv4: "BEARISH", rs4: 31.2, rvZ: "NEUTRAL", rsZ: 48 }); assert.equal(a.tv4h, -0.4);
  assert.deepEqual({ rv4: x.rv4, rs4: x.rs4, rvZ: x.rvZ, rsZ: x.rsZ }, { rv4: null, rs4: null, rvZ: null, rsZ: null }, "verdictul căzut: nota rămâne"); assert.equal(x.tv4h, 0.3);
  const fara = await NTV.turaNotaTv({ acum: T0N + 2 * ORA + 1, simboluri: ["ABC_USDT_PERP"], stare: null, cere: lume.cere }); assert.equal(fara.notate, 1); assert.equal(fara.stare.jurnal[0].rv4, null);
  // la o tură care doar judecă notele vechi, verdictul nu se cere
  cerute.length = 0; const j = await NTV.turaNotaTv({ acum: T0N + 2 * ORA + 1 + NTV.ORIZONT_MS["4h"] + 20 * 60000, simboluri: [], stare: r.stare, cere: lume.cere, verdict: async (s) => { cerute.push(s); return null; } });
  assert.ok(j.judecate >= 1); assert.deepEqual(cerute, []);
});
await test("(F5g) revizia a doua: nota păstrează și verdictul barei (rb4 / rbZ); verdictul Radarului se judecă la soroc și când TradingView n-a dat notă pe intervalul acela", async () => {
  const lume = { cere: async () => ({ data: [randTv("PIONEX:ABCUSDT.P", 11, 0.4, 0.2)] }) };
  const r = await NTV.turaNotaTv({ acum: T0N + 2 * ORA + 1, simboluri: ["ABC_USDT_PERP"], stare: null, cere: lume.cere, verdict: async () => ({ v4: "BULLISH", s4: 61, b4: "NEUTRAL", vZ: "BEARISH", sZ: 30, bZ: "BEARISH" }) });
  assert.deepEqual({ rv4: r.stare.jurnal[0].rv4, rb4: r.stare.jurnal[0].rb4, rvZ: r.stare.jurnal[0].rvZ, rbZ: r.stare.jurnal[0].rbZ }, { rv4: "BULLISH", rb4: "NEUTRAL", rvZ: "BEARISH", rbZ: "BEARISH" });
  // intrare veche fără notă TradingView pe 4 ore, dar cu verdictul Radarului: la soroc primește prețul de după și intră în bilanțul Radarului
  const J = [{ t: T0N, s: "ABC_USDT_PERP", tv: "PIONEX:ABCUSDT.P", tv4h: null, tvZ: 0.3, p: 10, d4: null, dZ: null, rv4: "BULLISH", rs4: 60, rvZ: null, rsZ: null }];
  const j = await NTV.turaNotaTv({ acum: T0N + NTV.ORIZONT_MS["4h"] + 20 * 60000, simboluri: [], stare: { felia: null, incercat: null, jurnal: J }, cere: lume.cere });
  assert.equal(j.judecate, 1); assert.equal(j.stare.jurnal[0].d4, 11); const rp = NTV.raportNotaTv(j.stare.jurnal); assert.deepEqual(rp.radar4h, { n: 1, k: 1 }); assert.deepEqual(rp["4h"], { n: 0, k: 0 }, "nota TradingView lipsă nu se numără");
  // fără notă și fără verdict pe interval: nimic de judecat (rămâne cum era)
  const J2 = [{ t: T0N, s: "ABC_USDT_PERP", tv4h: null, tvZ: 0.3, p: 10, d4: null, dZ: null, rv4: null }]; const j2 = await NTV.turaNotaTv({ acum: T0N + NTV.ORIZONT_MS["4h"] + 20 * 60000, simboluri: [], stare: { felia: null, incercat: null, jurnal: J2 }, cere: lume.cere }); assert.equal(j2.judecate, 0);
  assert.match(citeste("scripts", "colector.mjs"), /verdictDinLumanari\(\{ motor: motorPagina, dinPionex: IndicatoriBot\.dinPionex, confirma: IndicatoriBot\.confirma,/);
});
await test("(F5b) bilanțul judecă și verdictul Radarului, cu aceeași regulă ca nota (direcția față de prețul de după 4 bare); „neutru” nu se numără", () => {
  const J = [{ t: T0N, s: "A", p: 10, tv4h: -0.4, d4: 9, tvZ: 0.2, dZ: 9.5, rv4: "BEARISH", rvZ: "BULLISH" }, { t: T0N + BARA4, s: "A", p: 10, tv4h: 0.4, d4: 11, tvZ: null, dZ: null, rv4: "NEUTRAL", rvZ: null },
    { t: T0N + 2 * BARA4, s: "A", p: 10, tv4h: 0.4, d4: 9, tvZ: null, dZ: null, rv4: "BULLISH", rvZ: null }, { t: T0N + 3 * BARA4, s: "A", p: 10, tv4h: 0.4, d4: null, tvZ: null, dZ: null, rv4: "BULLISH", rvZ: null }, { t: T0N, s: "B", p: 10, tv4h: 0.4, d4: 11 }];
  const r = NTV.raportNotaTv(J); assert.deepEqual(r.radar4h, { n: 2, k: 1 }, "BEARISH + a coborât = nimerit; BULLISH + a coborât = ratat; NEUTRAL și nejudecatul nu se numără"); assert.deepEqual(r.radar1D, { n: 1, k: 0 });
  assert.deepEqual(r["4h"], { n: 4, k: 3 }, "nota TradingView: ca până acum (−0,4 și a coborât; +0,4 și a urcat de două ori; +0,4 și a coborât = ratat)");
});
await test("(F5c) verdictul vine din motorul PAGINII pe bare închise (ca în Tablou): calc pe lumânările Pionex, fără bara în curs; sub 60 de bare închise ⇒ fără verdict pe intervalul acela", () => {
  const motor = incarcaMotor(), IB = new Function(citeste("public", "lib", "indicatori-bot.js") + "; return IndicatoriBot;")();
  const acum = Date.UTC(2026, 10, 14, 9, 30), k = (pas, n, urca) => Array.from({ length: n }, (_, i) => { const t = Math.floor(acum / pas) * pas - (n - 1 - i) * pas, p = 100 + (urca ? 1 : -1) * i * 0.4 + 2 * Math.sin(i / 3); return { time: t, open: p - 0.2, high: p + 0.6, low: p - 0.7, close: p, volume: 1000 + i }; });
  const k4 = k(BARA4, 300, true), kz = k(24 * ORA, 200, false), v = NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, k4, kz, acum });
  const direct = (rows, tf) => { const j = motor.c.bareInchise(IB.dinPionex(rows), tf, acum); return motor.c.calc(j, "auto"); }, q4 = direct(k4, "4h"), qz = direct(kz, "1d");
  assert.equal(v.v4, q4.ver); assert.ok(Math.abs(v.s4 - q4.score) < 0.051); assert.equal(v.vZ, qz.ver); assert.ok(["BULLISH", "BEARISH", "NEUTRAL"].includes(v.v4) && ["BULLISH", "BEARISH", "NEUTRAL"].includes(v.vZ));
  // bara în curs (ultima) nu intră: îi schimb închiderea și verdictul rămâne același
  const k4b = k4.map((x) => Object.assign({}, x)); k4b[k4b.length - 1].close = 1; k4b[k4b.length - 1].low = 1;
  assert.deepEqual(NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, k4: k4b, kz, acum }), v);
  const putine = NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, k4: k4.slice(-40), kz, acum }); assert.equal(putine.v4, null); assert.equal(putine.s4, null); assert.equal(putine.vZ, v.vZ);
  assert.equal(NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, k4: [], kz: null, acum }), null); assert.equal(NTV.verdictDinLumanari({ motor: null, dinPionex: IB.dinPionex, k4, kz, acum }), null);
  // revizia a doua: pagina arată verdictul CONFIRMAT pe două bare închise (IndicatoriBot.confirma); jurnalul îl notează pe acela, cu al barei alături
  const j4 = motor.c.bareInchise(IB.dinPionex(k4), "4h", acum), q1 = motor.c.calc(j4.slice(0, -1), "auto"), q2 = motor.c.calc(j4.slice(0, -2), "auto");
  const vc = NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, confirma: IB.confirma, k4, kz, acum });
  assert.equal(vc.v4, IB.confirma(q4.ver, q1.ver, q2.ver).ver, "verdictul arătat"); assert.equal(vc.b4, q4.ver, "verdictul barei"); assert.equal(v.b4, q4.ver); assert.equal(v.v4, q4.ver, "fără regula de confirmare: verdictul barei");
  // o serie care tocmai s-a întors: bara de acum zice altceva decât cele două dinainte ⇒ arătat = cel dinainte, al barei = cel nou
  const fals = { c: { bareInchise: motor.c.bareInchise, calc: (j) => ({ ver: j.length % 3 === 0 ? "BEARISH" : "BULLISH", score: 50 }) } }, kk = k4.slice(-241), jj = fals.c.bareInchise(IB.dinPionex(kk), "4h", acum);
  assert.equal(jj.length % 3, 0, "premisa: 240 de bare închise"); const vf = NTV.verdictDinLumanari({ motor: fals, dinPionex: IB.dinPionex, confirma: IB.confirma, k4: kk, kz: null, acum }); assert.equal(vf.b4, "BEARISH"); assert.equal(vf.v4, "BULLISH", "două bare dinainte zic BULLISH: verdictul arătat nu s-a schimbat încă");
});
await test("(F5d) colectorul v101.179: dă turei verdictul din lumânările lui de pe disc (4 ore, 1 zi) și din motorul paginii încărcat o singură dată; orice cădere se scrie în jurnal, nu oprește tura", () => {
  const C = citeste("scripts", "colector.mjs"), i = C.indexOf("async function turaNotaTvColector()"), f = C.slice(i, C.indexOf("\n}\n", i));
  assert.match(f, /verdict: verdictRadar/); assert.match(C, /const VERSIUNE_COLECTOR = "v101\.(179|1[89]\d|[2-9]\d\d)"/);
  const j = C.indexOf("async function verdictRadar("), g = C.slice(j, C.indexOf("\n}\n", j)); assert.ok(j > 0, "verdictRadar lipsește");
  assert.match(g, /verdictDinLumanari\(\{ motor: motorPagina, dinPionex: IndicatoriBot\.dinPionex,/); assert.match(g, /catch \(e\) \{ jurnal\("nota tv verdict", e\.message\); return null; \}/);
  assert.match(C, /incarcaMotor\(\{ rad: RAD \}\)/); assert.doesNotMatch(g, /trimiteAlerta|trimite\(/);
});
await test("(F5e) revizia: verdictRadar RULAT - motorul paginii se încarcă o singură dată; lumânările de 1 zi căzute nu pierd verdictul de 4 ore; prețul Pionex de acum merge la lumânările de pe disc; motorul care nu se încarcă nu se mai încearcă", async () => {
  const C = citeste("scripts", "colector.mjs"), a = C.indexOf("let motorPagina = null, motorPaginaIncercat = false;"), j = C.indexOf("async function verdictRadar("), cod = C.slice(a, C.indexOf("\n}\n", j) + 2); assert.ok(a > 0 && j > a);
  const lume = (o) => { const L = { incarcari: 0, jurnal: [], cerute: [], date: [] };
    L.f = new Function("incarcaMotor", "klines4h", "klines1d", "preturiPerpTicker", "verdictDinLumanari", "IndicatoriBot", "jurnal", "RAD", cod + "; return verdictRadar;")(
      () => { L.incarcari++; if (o.motorCade) throw new Error("fără app.js"); return { c: {} }; },
      async (s, p) => { L.cerute.push(["4h", s, p]); return ["k4"]; }, async (s, p) => { L.cerute.push(["1d", s, p]); if (o.ziCade) throw new Error("429"); return ["kz"]; },
      async () => { if (o.tickerCade) throw new Error("ticker"); return { ABC_USDT_PERP: 12.5 }; }, (d) => { L.date.push(d); return { v4: d.k4 ? "BULLISH" : null, s4: 60, vZ: d.kz ? "BEARISH" : null, sZ: 40 }; },
      { dinPionex: (x) => x }, (...x) => L.jurnal.push(x.join(" ")), "/rad"); return L; };
  const L = lume({}); for (let i = 0; i < 3; i++) await L.f("ABC_USDT_PERP"); assert.equal(L.incarcari, 1, "motorul o singură dată"); assert.deepEqual(L.cerute.slice(0, 2), [["4h", "ABC_USDT_PERP", 12.5], ["1d", "ABC_USDT_PERP", 12.5]], "prețul din ticker merge la lumânări");
  assert.deepEqual(await L.f("XYZ_USDT"), { v4: "BULLISH", s4: 60, vZ: "BEARISH", sZ: 40 }); assert.deepEqual(L.cerute.slice(-2), [["4h", "XYZ_USDT", null], ["1d", "XYZ_USDT", null]], "moneda fără preț în ticker: fără preț, nu cu al alteia");
  const Z = lume({ ziCade: true }), vz = await Z.f("ABC_USDT_PERP"); assert.equal(vz.v4, "BULLISH", "4 ore rămâne"); assert.equal(vz.vZ, null); assert.deepEqual(Z.date[0].k4, ["k4"]); assert.equal(Z.date[0].kz, null); assert.ok(Z.jurnal.some((x) => /nota tv verdict 1 zi ABC_USDT_PERP 429/.test(x)), Z.jurnal.join(" | "));
  const T = lume({ tickerCade: true }); assert.equal((await T.f("ABC_USDT_PERP")).v4, "BULLISH"); assert.equal(T.cerute[0][2], null, "tickerul căzut: lumânările se cer fără preț");
  const M = lume({ motorCade: true }); assert.equal(await M.f("ABC_USDT_PERP"), null); assert.equal(await M.f("ABC_USDT_PERP"), null); assert.equal(M.incarcari, 1, "nu se reîncearcă la fiecare notă"); assert.equal(M.cerute.length, 0); assert.equal(M.jurnal.length, 1);
});
await test("(F5f) revizia: verdictul „din aceeași clipă” cere bare proaspete (ultima închisă = cea dinaintea barei în curs), altfel lipsește pe intervalul acela; bilanțul sare intrarea cu ora stricată în loc să arunce", () => {
  const motor = incarcaMotor(), IB = new Function(citeste("public", "lib", "indicatori-bot.js") + "; return IndicatoriBot;")();
  const acum = Date.UTC(2026, 10, 14, 9, 30), k = (pas, n, inUrma) => Array.from({ length: n }, (_, i) => { const t = Math.floor(acum / pas) * pas - (n - 1 - i + inUrma) * pas, p = 100 + i * 0.4 + 2 * Math.sin(i / 3); return { time: t, open: p - 0.2, high: p + 0.6, low: p - 0.7, close: p, volume: 1000 + i }; });
  const proaspat = NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, k4: k(BARA4, 300, 0), kz: k(24 * ORA, 200, 0), acum }); assert.ok(proaspat.v4 && proaspat.vZ);
  const vechi4 = NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, k4: k(BARA4, 300, 2), kz: k(24 * ORA, 200, 0), acum }); assert.equal(vechi4.v4, null, "4 ore rămase în urmă cu două bare"); assert.equal(vechi4.s4, null); assert.equal(vechi4.vZ, proaspat.vZ);
  assert.equal(NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, k4: k(BARA4, 300, 3), kz: k(24 * ORA, 200, 2), acum }), null, "ambele vechi: niciun verdict");
  // o bară în urmă fără bara în curs (lumânările aduse chiar la schimbarea barei): ultima închisă e tot cea dinaintea barei în curs
  assert.equal(NTV.verdictDinLumanari({ motor, dinPionex: IB.dinPionex, k4: k(BARA4, 300, 1), kz: null, acum }).v4 !== null, true);
  const J = [{ t: "stricat", s: "A", p: 10, tv4h: 0.4, d4: 11, rv4: "BULLISH" }, { t: 9e15, s: "A", p: 10, tv4h: 0.4, d4: 11 }, { s: "A", p: 10, tv4h: 0.4, d4: 11 }, { t: T0N, s: "A", p: 10, tv4h: 0.4, d4: 11, rv4: "BULLISH" }];
  const r = NTV.raportNotaTv(J); assert.deepEqual(r["4h"], { n: 1, k: 1 }); assert.deepEqual(r.radar4h, { n: 1, k: 1 }); assert.equal(r.zile, 1);
  // cititorul bilanțului: există, citește data/nota-tv.json și spune limpede când e prea devreme
  const cit = citeste("scripts", "raport-nota-tv.mjs"); assert.match(cit, /bilantDinZile\(/);   /* v100.341: bilanțul pe zile ținute, nu numărătoarea pe note */ assert.match(cit, /prea devreme/); assert.match(citeste("package.json"), /"raport:nota-tv": "node scripts\/raport-nota-tv\.mjs"/);
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
