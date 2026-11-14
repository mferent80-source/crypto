// Măsurătorile din docs/cercetare/2026-11-13-tablou-acuratete.md (regulile sunt ACOLO, scrise înainte de cifre). Rulează codul paginii
// (scripts/lib/motor-pagina.mjs), pe lumânări publice Binance perp. Nimic din vreun cont; nu scrie nimic în afara dosarului de cache.
//   node scripts/cercetare-v100339-acuratete.mjs --ce=m1|m2|m3|m3h0|m4|m5|m5h0|m5b [--tf=1h|4h] [--cache=<dosar>] [--out=<fișier.json>] [--samanta=<număr>] [--pana=<ms UTC>]
// --samanta = sămânța generatorului (implicit cea din jurnal, 20261113): aceeași măsurătoare pe altă sămânță arată cât din cifră e noroc.
// --pana = capătul datelor: barele care se închid după clipa aceea nu intră, iar o aducere nouă cere de la Binance exact până acolo
// (fără el capătul e clipa rulării, deci cifrele nu se pot reface întocmai mai târziu; capătul rulărilor din 13.11 e scris în jurnal).
// m5h0: --rulari=<N> (implicit 10.000) --lume=indep|legate --bec (și testul C, lent: becul pe fiecare eșantion). m5: --tprag=<t> dacă mărimea
// simulată a cerut un prag calibrat pe ipoteza nulă (regula e în jurnal, la amendamentul M5).
// m1 = direcția la 4 bare (verdictul, becul, nota TradingView) · m2 = verdictul stabil (histerezis + confirmare) · m3 = estimarea din
// situații asemănătoare (K1 față de K2) · m4 = confirmarea „bec lateral ⇒ mai puțină mișcare” pe date mai vechi · m5 = regimul pentru grid
// (ADX și lățimea benzilor Bollinger față de eficiența și drumul următoarelor 24 h; becul „lateral”), pe fereastra principală și pe cea veche.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { incarcaMotor, incarcaLib } from "./lib/motor-pagina.mjs";
import { rating } from "./lib/tv-rating-calc.mjs";
import * as REF from "./lib/indicatori-referinta.mjs";
import { etichetaM5 } from "./lib/m5-etichete.mjs";
import { testBlocuri, blocuriDinZile, valoriPeBlocuri } from "./lib/statistica-blocuri.mjs";
import { judecaM5b, primaZiNoua, TAIETURA_M5 } from "./lib/m5b-reluare.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)=(.*)$/.exec(a); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true]; }));
const CE = String(ARG.ce || "m1"), CACHE = ARG.cache || path.join(os.tmpdir(), "radar-cercetare"); fs.mkdirSync(CACHE, { recursive: true });
const SYMS = ["BTCUSDT", "ETHUSDT", "ZECUSDT", "HYPEUSDT", "SOLUSDT", "BNBUSDT", "NEARUSDT", "XRPUSDT", "DOGEUSDT", "ENAUSDT", "WLDUSDT", "SUIUSDT", "ADAUSDT", "UNIUSDT", "PUMPUSDT", "INITUSDT", "LINKUSDT", "FILUSDT", "BCHUSDT", "AVAXUSDT", "EGLDUSDT"];
const TFS = { "1h": { ms: 3600000, orizont: 24 }, "4h": { ms: 14400000, orizont: 6 } }, TF_LISTA = ARG.tf && TFS[ARG.tf] ? [ARG.tf] : Object.keys(TFS);
const FER = 499, H = 4, PAS = 4, SAMANTA = Number(ARG.samanta) > 0 ? Number(ARG.samanta) : 20261113, B = 2000, BLOC = 5, PANA = Number(ARG.pana) > 0 ? Number(ARG.pana) : null;
// câte teste cu verdict s-au făcut până la fiecare măsurătoare inclusiv (registrul din jurnal)
const TESTE = { m1: 6, m2: 8, m3: 10, m3h0: 10, m4: 12, m5: 32, m5h0: 32, m5b: 35 };   /* m5b: al 33-lea test; pragul lui numără și cele două ale jurnalului notei (35) */   /* la m5 corecția e în pragul dovezii pe blocuri: p ≤ 0,05 ÷ 64 într-o parte */   /* m5: cele ~20 de până la el, numărate cum a cerut revizia, + 12 */
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- datele: 3.000 de bare (două cereri); `vechi` = cele 3.000 de DINAINTEA lor ----
async function bare(sym, tf, vechi) {
  const f = path.join(CACHE, sym + "-" + tf + (vechi ? "-vechi" : "") + ".json");
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  let end = PANA; if (vechi) { const noi = await bare(sym, tf, false); if (!noi.length) return []; end = noi[0][0] - 1; }
  let toate = [];
  for (let p = 0; p < 2; p++) {
    const r = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${tf}&limit=1500` + (end ? "&endTime=" + end : ""), { signal: AbortSignal.timeout(30000) });
    const k = await r.json(); if (!Array.isArray(k) || !k.length) break;
    toate = k.map((x) => [+x[0], +x[1], +x[2], +x[3], +x[4], +x[5]]).concat(toate); end = k[0][0] - 1; await asteapta(250);
    if (k.length < 1500) break;
  }
  fs.writeFileSync(f, JSON.stringify(toate)); return toate;
}
// M5b: lumânările de DUPĂ capătul datelor din M5 (cu destul trecut înaintea lui pentru etichetă), cerute înainte, pagină cu pagină
async function bareDupa(sym, tf) {
  // cache doar cu --pana (capăt fix, deci același răspuns mereu); fără el fiecare rulare aduce din nou - altfel o rulare de probă din 2026
  // ar îngheța datele și judecata din 2027 ar citi fișierul vechi (revizia independentă)
  const f = PANA ? path.join(CACHE, sym + "-" + tf + "-dupa-" + PANA + ".json") : null; if (f && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  let start = TAIETURA_M5 - (FER + 120) * TFS[tf].ms, toate = []; const capat = PANA || Date.now();
  for (let p = 0; p < 40 && start < capat; p++) {
    const r = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${tf}&limit=1500&startTime=${start}` + (PANA ? "&endTime=" + PANA : ""), { signal: AbortSignal.timeout(30000) });
    const k = await r.json(); if (!Array.isArray(k)) throw new Error("M5b: Binance n-a dat lumânări pentru " + sym + " " + tf + " (" + JSON.stringify(k).slice(0, 120) + ") - rularea se oprește, nu judecă pe o serie trunchiată");
    if (!k.length) break;
    toate = toate.concat(k.map((x) => [+x[0], +x[1], +x[2], +x[3], +x[4], +x[5]])); start = k[k.length - 1][0] + TFS[tf].ms; await asteapta(250);
    if (k.length < 1500) break;
  }
  if (f) fs.writeFileSync(f, JSON.stringify(toate)); return toate;
}
const inchise = (k, tf) => { const t = PANA || Date.now(); let n = k.length; while (n && k[n - 1][0] + TFS[tf].ms > t) n--; return n === k.length ? k : k.slice(0, n); };   /* doar barele închise până la capăt (--pana sau acum) */
const inCalc = (w) => w.map((x) => [x[0], String(x[1]), String(x[2]), String(x[3]), String(x[4]), String(x[5]), x[0] + 1, String(x[5] * x[4])]);
const ziua = (t, tf) => new Date(t + TFS[tf].ms).toISOString().slice(0, 10);

// ---- dovada pe zile: bootstrap pe blocuri de 5 zile; f(listaDeZile) ⇒ număr ----
function dovada(zile, f, nTeste) {
  const zl = Object.keys(zile).sort(), rnd = mulberry32(SAMANTA), est = f(zl.map((d) => zile[d])), v = [];
  for (let b = 0; b < B; b++) { const l = []; while (l.length < zl.length) { const st = Math.floor(rnd() * zl.length); for (let j = 0; j < BLOC && l.length < zl.length; j++) l.push(zile[zl[(st + j) % zl.length]]); } const x = f(l); if (Number.isFinite(x)) v.push(x); }
  v.sort((a, c) => a - c); const p = (q) => v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))], a = 0.05 / nTeste / 2;
  return { est, lo95: p(0.025), hi95: p(0.975), loC: p(a), hiC: p(1 - a), zile: zl.length };
}
const rata = (S) => (l) => 100 * l.reduce((a, z) => a + (z[S] ? z[S].k : 0), 0) / l.reduce((a, z) => a + (z[S] ? z[S].n : 0), 0);
const f1 = (x) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(1).replace(".", ",")), f2 = (x) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(2).replace(".", ","));
const verdictRata = (d) => (d.loC > 50 ? "DOVEDIT (ajută)" : d.hiC < 50 ? "DOVEDIT CĂ STRICĂ" : "NEDOVEDIT");
const pune = (zile, zi, S, d, ret) => { if (!d) return; const z = zile[zi] || (zile[zi] = {}), o = z[S] || (z[S] = { n: 0, k: 0 }); o.n++; if (ret * d > 0) o.k++; };
const semn = (ver) => (ver === "BULLISH" ? 1 : ver === "BEARISH" ? -1 : 0);

const M = incarcaMotor({ extra: ["regimProfil", "profilDinRegim"] }), C = M.c, Directie = incarcaLib(["text-ro.js", "directie.js"], "Directie");
// RegimGrid: același fișier ca pagina, încărcat în contextul scriptului (într-un context vm separat buclele lui mergeau de ~12 ori mai încet)
vm.runInThisContext(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "lib", "regim-grid.js"), "utf8"), { filename: "regim-grid.js" });
const RegimGrid = globalThis.RegimGrid;
const rez = { ce: CE, la: new Date().toISOString(), teste: TESTE[CE], samanta: SAMANTA, pana: PANA };

for (const tf of TF_LISTA) {
  const t0 = Date.now(), out = (rez[tf] = {});
  if (CE === "m1") {
    const zile = {}; let jud = 0;
    for (const s of SYMS) { const k = inchise(await bare(s, tf), tf);
      for (let i = FER - 1; i + H < k.length; i += PAS) { const w = k.slice(i - FER + 1, i + 1), ret = k[i + H][4] / k[i][4] - 1, zi = ziua(k[i][0], tf); jud++;
        pune(zile, zi, "S1", semn(C.calc(inCalc(w), "auto", { faraHisterezis: true }).ver), ret);
        const u = w[w.length - 1], an = Directie.analizeaza(w.concat([[u[0] + TFS[tf].ms, u[4], u[4], u[4], u[4], 0]]), TFS[tf].orizont, null);
        pune(zile, zi, "S2", an && an.dir === "urca" ? 1 : an && an.dir === "coboara" ? -1 : 0, ret);
        const R = rating(w.map((x) => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4], v: x[5] }))).ALL; pune(zile, zi, "S3", R > 0.1 ? 1 : R < -0.1 ? -1 : 0, ret); } }
    out.judecati = jud; console.log(`\n══ M1 · ${tf}: ${jud} judecăți`);
    for (const [S, nume] of [["S1", "Verdictul"], ["S2", "Becul"], ["S3", "Nota TradingView"]]) { const d = (out[S] = dovada(zile, rata(S), TESTE.m1)); console.log(`${nume.padEnd(18)} nimerire ${f1(d.est)}% [corectat: ${f1(d.loC)}–${f1(d.hiC)}] pe ${d.zile} zile ⇒ ${verdictRata(d)}`); }
  }
  if (CE === "m2") {
    const zile = {}, st = { V1: { sch: 0, param: 0, ep: 0, scurte: 0 }, V2: { sch: 0, param: 0, ep: 0, scurte: 0 }, V2c: { sch: 0, ep: 0, scurte: 0 } }; let jud = 0;
    const profilDinPrag = (p) => (p === 64 ? { st: 2.8, breakout: 22, signal: 64 } : p === 67 ? { st: 3.0, breakout: 18, signal: 67 } : { st: 2.4, breakout: 18, signal: 66 });
    for (const s of SYMS) { const k = inchise(await bare(s, tf), tf), memo = new Map();
      const q = (i, v) => { const ch = v + i; if (!memo.has(ch)) { const r = C.calc(inCalc(k.slice(i - FER + 1, i + 1)), "auto", v === "V1" ? { faraHisterezis: true } : null); memo.set(ch, { ver: r.ver, prag: r.prag }); } return memo.get(ch); };
      const arata = (i) => { const a = q(i, "V2").ver, b = q(i - 1, "V2").ver; return a === b ? a : b === q(i - 2, "V2").ver ? b : "NEUTRAL"; };
      // (1) stabilitatea pe ultimele 600 de bare, fiecare bară
      const de = Math.max(FER + 2, k.length - 600);
      for (const v of ["V1", "V2"]) { let lung = 0, dir = null;
        for (let i = de; i < k.length; i++) { const a = q(i, v), b = q(i - 1, v);
          if (a.ver !== b.ver) { st[v].sch++; if (a.prag !== b.prag) { const cuVechi = C.calc(inCalc(k.slice(i - FER + 1, i + 1)), "auto", { faraHisterezis: v === "V1", profil: profilDinPrag(b.prag) }).ver; if (cuVechi === b.ver) st[v].param++; } }
          if (a.ver === dir && dir !== "NEUTRAL") lung++; else { if (dir && dir !== "NEUTRAL") { st[v].ep++; if (lung <= 2) st[v].scurte++; } dir = a.ver; lung = 1; } }
        if (dir && dir !== "NEUTRAL") { st[v].ep++; if (lung <= 2) st[v].scurte++; } }
      { let lung = 0, dir = null, prec = null; for (let i = de; i < k.length; i++) { const a = arata(i); if (prec !== null && a !== prec) st.V2c.sch++; prec = a; if (a === dir && dir !== "NEUTRAL") lung++; else { if (dir && dir !== "NEUTRAL") { st.V2c.ep++; if (lung <= 2) st.V2c.scurte++; } dir = a; lung = 1; } } if (dir && dir !== "NEUTRAL") { st.V2c.ep++; if (lung <= 2) st.V2c.scurte++; } }
      // (2) nimerirea la 4 bare: V2 brut și V2 cu confirmare, pe grila din M1
      for (let i = FER + 1; i + H < k.length; i += PAS) { const ret = k[i + H][4] / k[i][4] - 1, zi = ziua(k[i][0], tf); jud++; pune(zile, zi, "V2", semn(q(i, "V2").ver), ret); pune(zile, zi, "V2c", semn(arata(i)), ret); }
      console.log(tf, s, "·", Math.round((Date.now() - t0) / 1000), "s"); }
    out.stabilitate = st; out.judecati = jud; out.V2 = dovada(zile, rata("V2"), TESTE.m2); out.V2c = dovada(zile, rata("V2c"), TESTE.m2);
    console.log(`\n══ M2 · ${tf} · stabilitatea pe ultimele 600 de bare × ${SYMS.length} perechi`);
    for (const v of ["V1", "V2", "V2c"]) console.log(`${v.padEnd(4)} schimbări de verdict ${st[v].sch}` + (st[v].param != null ? ` · doar din schimbarea parametrilor ${st[v].param} (${f1(100 * st[v].param / (st[v].sch || 1))}%)` : "") + ` · episoade cu direcție ${st[v].ep}, din care de cel mult 2 bare ${st[v].scurte} (${f1(100 * st[v].scurte / (st[v].ep || 1))}%)`);
    for (const v of ["V2", "V2c"]) console.log(`${v.padEnd(4)} nimerire la 4 bare ${f1(out[v].est)}% [corectat (8 teste): ${f1(out[v].loC)}–${f1(out[v].hiC)}] pe ${out[v].zile} zile ⇒ ${verdictRata(out[v])}`);
  }
  if (CE === "m3h0") {   // doar mărimea pe mers aleator (ipoteza nulă): K1, K2 (banda normală) și K3 (banda Student), pe aceleași serii
    const rnd = mulberry32(SAMANTA), norm = () => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }, mar = { K1: { n: 0, afara: 0 }, K2: { n: 0, afara: 0 }, K3: { n: 0, afara: 0 } };
    for (let r = 0; r < 2000; r++) { let c = 100; const j = []; for (let i = 0; i < 500; i++) { const o = c; c = c * Math.exp(0.01 * norm()); j.push([i * 3600000, String(o), String(Math.max(o, c)), String(Math.min(o, c)), String(c), "1000", i * 3600000 + 1, String(1000 * c)]); }
      for (const [v, opt] of [["K1", { vechi: true }], ["K2", { bandaNormala: true }], ["K3", null]]) { const hp = C.historicalProbability(j, H, opt); if (!hp) continue; mar[v].n++; if (!hp.inBanda) mar[v].afara++; } }
    out.marime = mar; console.log(`\n══ M3b · mărimea pe mers aleator (2.000 de serii)`); for (const v of ["K1", "K2", "K3"]) console.log(`${v} în afara benzii ${f1(100 * mar[v].afara / mar[v].n)}% (${mar[v].afara} din ${mar[v].n})`);
    break;
  }
  if (CE === "m3") {
    // (1) mărimea pe mers aleator: cât de des iese „în afara benzii”
    const rnd = mulberry32(SAMANTA), norm = () => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }, mar = { K1: { n: 0, afara: 0, tare: 0 }, K2: { n: 0, afara: 0, tare: 0 } };
    for (let r = 0; r < 2000; r++) { let c = 100; const j = []; for (let i = 0; i < 500; i++) { const o = c; c = c * Math.exp(0.01 * norm()); j.push([i * 3600000, String(o), String(Math.max(o, c)), String(Math.min(o, c)), String(c), "1000", i * 3600000 + 1, String(1000 * c)]); }
      for (const [v, opt] of [["K1", { vechi: true }], ["K2", { bandaNormala: true }]]) { const hp = C.historicalProbability(j, H, opt); if (!hp) continue; mar[v].n++; if (!hp.inBanda) mar[v].afara++; if (hp.up >= 70 || hp.up <= 30) mar[v].tare++; } }
    out.marime = mar;
    // (2) nimerirea pe piață, pe grila din M1
    const zile = {}; let jud = 0;
    for (const s of SYMS) { const k = inchise(await bare(s, tf), tf);
      for (let i = FER - 1; i + H < k.length; i += PAS) { const j = inCalc(k.slice(i - FER + 1, i + 1)), ret = k[i + H][4] / k[i][4] - 1, zi = ziua(k[i][0], tf); jud++;
        for (const [v, opt] of [["K1", { vechi: true }], ["K2", { bandaNormala: true }]]) { const hp = C.historicalProbability(j, H, opt); if (!hp) continue; const d = hp.up >= 50 ? 1 : -1; pune(zile, zi, v, d, ret); if (!hp.inBanda) pune(zile, zi, v + "afara", d, ret); } } }
    out.judecati = jud; console.log(`\n══ M3 · ${tf}`);
    for (const v of ["K1", "K2"]) console.log(`${v} mărimea pe mers aleator (${mar[v].n} serii): în afara benzii ${f1(100 * mar[v].afara / mar[v].n)}% · „≥ 70%” ${f1(100 * mar[v].tare / mar[v].n)}%`);
    for (const v of ["K1", "K2", "K1afara", "K2afara"]) { const d = (out[v] = dovada(zile, rata(v), TESTE.m3)); console.log(`${v.padEnd(8)} nimerire ${f1(d.est)}% [corectat (10 teste): ${f1(d.loC)}–${f1(d.hiC)}] ⇒ ${verdictRata(d)}`); }
  }
  if (CE === "m4") {
    const zile = {}; let nL = 0, nD = 0, perechi = 0;
    for (const s of SYMS) { const k = await bare(s, tf, true); if (k.length < FER + 100) continue; perechi++;
      for (let i = FER - 1; i + H < k.length; i += PAS) { const w = k.slice(i - FER + 1, i + 1), abs = Math.abs(k[i + H][4] / k[i][4] - 1) * 100, zi = ziua(k[i][0], tf), u = w[w.length - 1];
        const an = Directie.analizeaza(w.concat([[u[0] + TFS[tf].ms, u[4], u[4], u[4], u[4], 0]]), TFS[tf].orizont, null); if (!an || !an.dir) continue;
        const z = zile[zi] || (zile[zi] = { lat: { n: 0, a: 0 }, dir: { n: 0, a: 0 } }), L = an.dir === "lateral" ? z.lat : z.dir; L.n++; L.a += abs; if (an.dir === "lateral") nL++; else nD++; } }
    const med = (K) => (l) => l.reduce((a, z) => a + z[K].a, 0) / l.reduce((a, z) => a + z[K].n, 0), d = (out.raport = dovada(zile, (l) => med("lat")(l) / med("dir")(l), TESTE.m4));
    out.perechi = perechi; out.lateral = nL; out.directie = nD; out.absLateral = med("lat")(Object.values(zile)); out.absDirectie = med("dir")(Object.values(zile));
    console.log(`\n══ M4 · ${tf} · ${perechi} perechi cu date mai vechi · ${d.zile} zile\nmișcarea absolută la 4 bare: după bec lateral ${f2(out.absLateral)}% (${nL}) · după bec cu direcție ${f2(out.absDirectie)}% (${nD}) · raport ${f2(d.est)} [95%: ${f2(d.lo95)}–${f2(d.hi95)}; corectat (12 teste): ${f2(d.loC)}–${f2(d.hiC)}] ⇒ ${d.hiC < 1 ? "CONFIRMAT" : "NECONFIRMAT"}`);
  }
  if (CE === "m5h0") {   // mărimea dovezii pe blocuri (amendamentul M5) pe serii FĂRĂ efect, în două lumi; doar 1h (regulile: jurnal)
    if (tf !== "1h") continue;
    const RUL = Number(ARG.rulari) > 0 ? Number(ARG.rulari) : 10000, NBARE = 3000, HF = 24, ALFA_C = 0.05 / 64, CU_BEC = !!ARG.bec;
    const LUMI = [["independente", 0], ["legate (factor comun 0,7 și volatilitate comună)", 0.7]].filter((x) => !ARG.lume || (ARG.lume === "indep" ? x[1] === 0 : x[1] > 0));
    out.lumi = {};
    for (const [nume, rho] of LUMI) {
      const rnd = mulberry32(SAMANTA + 5 + Math.round(rho * 100)), norm = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
      const R = { A: [], B: [], C: [] }, noteaza = (K, T) => { if (Number.isFinite(T.p)) R[K].push({ t: T.t, p: T.p, n: T.n }); };
      for (let r = 0; r < RUL; r++) {
        for (const ciorchini of [true, false]) {   // A și C: volatilitate în ciorchini, fără inerția direcției; B: volatilitate constantă
          const zile = {}, fc = [], vc = []; let lvC = 0; for (let i = 0; i < NBARE; i++) { fc.push(norm()); if (ciorchini) lvC = 0.98 * lvC + 0.2 * norm(); vc.push(lvC); }
          for (let sr = 0; sr < 21; sr++) { const k = []; let c = 100, lv = 0;
            for (let i = 0; i < NBARE; i++) { if (ciorchini && !rho) lv = 0.98 * lv + 0.2 * norm(); const sg = 0.006 * Math.exp(ciorchini ? (rho ? vc[i] : lv) : 0), op = c, z = rho ? Math.sqrt(rho) * fc[i] + Math.sqrt(1 - rho) * norm() : norm();
              c = c * Math.exp(sg * z); k.push([i * 3600000, op, Math.max(op, c) * (1 + Math.abs(sg * norm()) / 3), Math.min(op, c) * (1 - Math.abs(sg * norm()) / 3), c, 1000]); }
            const cl = k.map((x) => x[4]), E = RegimGrid.clasificaSerie(cl, REF.dmi(k.map((x) => x[2]), k.map((x) => x[3]), cl).adx);
            for (let i = FER - 1; i + HF < k.length; i += PAS) { const ef = RegimGrid.eficientaInainte(cl, i, HF), dr = RegimGrid.drumInainte(cl, i, HF); if (ef === null || dr === null) continue;
              const zi = ziua(k[i][0], tf), z = zile[zi] || (zile[zi] = {}), pun = (K, v) => { const o = z[K] || (z[K] = { n: 0, s: 0 }); o.n++; o.s += v; };
              if (ciorchini) { if (E[i].trend === "trend") pun("trend", ef); else if (E[i].trend === "lateral") pun("lateral", ef);
                if (CU_BEC) { const w = k.slice(i - FER + 1, i + 1), u = w[w.length - 1], an = Directie.analizeaza(w.concat([[u[0] + TFS[tf].ms, u[4], u[4], u[4], u[4], 0]]), TFS[tf].orizont, null); if (an && an.dir) pun(an.dir === "lateral" ? "becLat" : "becDir", ef); } }
              else if (E[i].vol === "ridicata") pun("rid", dr); else if (E[i].vol === "joasa") pun("joasa", dr); } }
          const bl = blocuriDinZile(zile, 5);
          if (ciorchini) { noteaza("A", testBlocuri(valoriPeBlocuri(bl, "trend", "lateral", "diferenta"))); if (CU_BEC) noteaza("C", testBlocuri(valoriPeBlocuri(bl, "becDir", "becLat", "diferenta"))); }
          else noteaza("B", testBlocuri(valoriPeBlocuri(bl, "rid", "joasa", "logRaport")));
        }
        if ((r + 1) % (CU_BEC ? 10 : 1000) === 0) console.log(nume, "· rulări", r + 1, "·", Math.round((Date.now() - t0) / 1000), "s");
      }
      const rez = {}; console.log(`\n══ M5-H0 (dovada pe blocuri) · lumea: ${nume} · ${RUL} rulări · ${NBARE} bare × 21 de serii`);
      for (const K of ["A", "B", "C"]) { const v = R[K]; if (!v.length) continue; const n25 = v.filter((x) => x.p <= 0.025).length, nc = v.filter((x) => x.p <= ALFA_C).length, ts = v.map((x) => x.t).sort((x, y) => x - y), iq = Math.min(ts.length - 1, Math.ceil((1 - ALFA_C) * ts.length) - 1);
        rez[K] = { n: v.length, la25: n25 / v.length, laPrag: nc / v.length, tCuantila: ts[iq], tMax: ts[ts.length - 1], tMedie: ts.reduce((a, b2) => a + b2, 0) / ts.length, tMediana: ts[Math.floor(ts.length / 2)], blocuriMedie: v.reduce((a, b2) => a + b2.n, 0) / v.length };
        console.log(`${K} · respingeri la 2,5% într-o parte: ${f2(100 * n25 / v.length)}% (nominal 2,50%) · la pragul verdictului (0,05 ÷ 64): ${(100 * nc / v.length).toFixed(3).replace(".", ",")}% (nominal 0,078%; ${nc} din ${v.length}) · t la care respingerile ajung la nominal: ${f2(ts[iq])} · t: media ${f2(rez[K].tMedie)}, mediana ${f2(rez[K].tMediana)} · blocuri în test, în medie: ${f2(rez[K].blocuriMedie)}`); }
      out.lumi[nume] = rez;
    }
    break;
  }
  if (CE === "m5") {   // regimul pentru grid, pe piață: dovada pe blocuri de 5 zile (amendamentul din jurnal), pe fereastra principală și pe cea veche
    const HF = tf === "1h" ? 24 : 6, MIN_CLASA = 500, ALFA_C = 0.05 / 64, T_PRAG = Number(ARG.tprag) > 0 ? Number(ARG.tprag) : null, fer = {};
    const fp = (p) => (!Number.isFinite(p) ? "—" : p < 0.0001 ? p.toExponential(1).replace(".", ",") : (100 * p).toFixed(3).replace(".", ",") + "%");
    for (const vechi of [false, true]) {
      const zile = {}, cate = { trend: 0, lateral: 0, rid: 0, joasa: 0, becDir: 0, becLat: 0 }; let perechi = 0;
      for (const sm of SYMS) { const k = inchise(await bare(sm, tf, vechi), tf); if (k.length < FER + HF + 10) continue; perechi++; const cl = k.map((x) => x[4]);
        for (let i = FER - 1; i + HF < k.length; i += PAS) {
          const ef = RegimGrid.eficientaInainte(cl, i, HF), dr = RegimGrid.drumInainte(cl, i, HF); if (ef === null || dr === null) continue;
          const e = etichetaM5({ k, cl, i, FER, C, RegimGrid, Directie, orizont: TFS[tf].orizont, msTf: TFS[tf].ms, inCalc }); if (!e) continue;   /* etichetele: doar din barele ≤ i (proba le verifică mecanic) */
          const zi = ziua(k[i][0], tf), z = zile[zi] || (zile[zi] = {});
          const pun = (K, v) => { const o = z[K] || (z[K] = { n: 0, s: 0 }); o.n++; o.s += v; cate[K]++; };
          if (e.trend === "trend") pun("trend", ef); else if (e.trend === "lateral") pun("lateral", ef);
          if (e.vol === "ridicata") pun("rid", dr); else if (e.vol === "joasa") pun("joasa", dr);
          if (e.bec) pun(e.bec === "lateral" ? "becLat" : "becDir", ef);
        } }
      const med = (K) => { let n = 0, sm = 0; for (const z of Object.values(zile)) if (z[K]) { n += z[K].n; sm += z[K].s; } return n ? sm / n : NaN; }, medii = {}; for (const K of Object.keys(cate)) medii[K] = med(K);
      const bl = blocuriDinZile(zile, 5);
      const A = Object.assign(testBlocuri(valoriPeBlocuri(bl, "trend", "lateral", "diferenta")), { est: medii.trend - medii.lateral });
      const B = Object.assign(testBlocuri(valoriPeBlocuri(bl, "rid", "joasa", "logRaport")), { est: medii.rid / medii.joasa });
      const Cb = Object.assign(testBlocuri(valoriPeBlocuri(bl, "becDir", "becLat", "diferenta")), { est: medii.becDir - medii.becLat });
      fer[vechi ? "veche" : "principala"] = { perechi, zile: Object.keys(zile).length, blocuri: bl.length, cate, medii, A, B, C: Cb };
      console.log(`\n══ M5 · ${tf} · fereastra ${vechi ? "veche" : "principală"} · ${perechi} perechi · ${Object.keys(zile).length} zile · ${bl.length} blocuri de 5 zile · orizont ${HF} bare`);
      console.log(`A · eficiența înainte: după „trend” ${f2(medii.trend)} (${cate.trend}) · după „lateral” ${f2(medii.lateral)} (${cate.lateral}) · diferența ${f2(A.est)} · pe ${A.n} blocuri: t = ${f2(A.t)}, p = ${fp(A.p)}`);
      console.log(`B · drumul înainte: după benzi largi ${f2(medii.rid)}% (${cate.rid}) · după benzi strânse ${f2(medii.joasa)}% (${cate.joasa}) · raportul ${f2(B.est)} · pe ${B.n} blocuri: t = ${f2(B.t)}, p = ${fp(B.p)}`);
      console.log(`C · eficiența înainte: după becul cu direcție ${f2(medii.becDir)} (${cate.becDir}) · după becul „lateral” ${f2(medii.becLat)} (${cate.becLat}) · diferența ${f2(Cb.est)} · pe ${Cb.n} blocuri: t = ${f2(Cb.t)}, p = ${fp(Cb.p)}`);
    }
    // verdictul după regulile din jurnal (cu amendamentul): pe AMBELE ferestre testul trece pragul (p ≤ 0,05 ÷ 64, sau t ≥ --tprag dacă mărimea
    // simulată a cerut calibrarea), mărimea minimă e atinsă (A, C: ≥ 0,03; B: ≥ 1,3) și fiecare clasă are cel puțin 500 de eșantioane
    const P = fer.principala, V = fer.veche, destule = (x, y) => [P, V].every((w) => w.cate[x] >= MIN_CLASA && w.cate[y] >= MIN_CLASA), trece = (T) => (T_PRAG ? T.t >= T_PRAG : T.p <= ALFA_C);
    const verd = (K, minim, x, y) => (!destule(x, y) ? "PREA PUȚINE" : [P, V].every((w) => trece(w[K]) && w[K].est >= minim) ? "DOVEDIT" : "NEDOVEDIT");
    out.ferestre = fer; out.pragT = T_PRAG; out.verdict = { A: verd("A", 0.03, "trend", "lateral"), B: verd("B", 1.3, "rid", "joasa"), C: verd("C", 0.03, "becDir", "becLat") };
    console.log(`\n⇒ M5 · ${tf} (pragul: ${T_PRAG ? "t ≥ " + f2(T_PRAG) : "p ≤ 0,078%"}): A (trend / lateral → eficiența) ${out.verdict.A} · B (benzi largi / strânse → drumul) ${out.verdict.B} · C (becul → eficiența) ${out.verdict.C}`);
  }
  if (CE === "m5b") {   // reluarea efectului B pe date NOI (regulile: jurnal, „M5b”, scrise 14.11.2026); refuză până sunt destule blocuri de după tăietură
    if (tf !== "1h") { console.log(`\n⇒ M5b · ${tf}: nu se judecă (regulile: doar 1h - pe 4h ar trebui peste un an de blocuri valide)`); continue; }
    const HF = tf === "1h" ? 24 : 6, zile = {}, primaZi = primaZiNoua(); let perechi = 0;
    for (const sm of SYMS) { const k = inchise(await bareDupa(sm, tf), tf); if (k.length < FER + HF + 10) continue; perechi++; const cl = k.map((x) => x[4]);
      for (let i = FER - 1; i + HF < k.length; i += PAS) { const zi = ziua(k[i][0], tf); if (zi < primaZi) continue;   /* doar barele etichetate care se închid după tăietură */
        const dr = RegimGrid.drumInainte(cl, i, HF), e = RegimGrid.clasifica(cl, i, null); if (dr === null || !e || (e.vol !== "ridicata" && e.vol !== "joasa")) continue;   /* eticheta benzilor: aceeași ca în M5, doar din barele ≤ i */
        const z = zile[zi] || (zile[zi] = {}), K = e.vol === "ridicata" ? "rid" : "joasa", o = z[K] || (z[K] = { n: 0, s: 0 }); o.n++; o.s += dr; } }
    const J = judecaM5b(zile); out.m5b = J; out.perechi = perechi;
    if (!J.gata) console.log(`\n⇒ M5b · ${tf}: PREA DEVREME — ${J.blocuri} din ${J.trebuie} blocuri de 5 zile încheiate și valide de după ${J.primaZi} (${perechi} perechi). Nu se judecă nimic până atunci.`);
    else console.log(`\n⇒ M5b · ${tf} (primele ${J.blocuri} blocuri încheiate de după ${J.primaZi}, până la ${J.panaLa}; pragul p ≤ 0,05 ÷ 70, raportul pe bloc cel puțin 1,2): raportul ×${f2(J.raport)} · t = ${f2(J.t)} · p = ${(100 * J.p).toFixed(4).replace(".", ",")}% ⇒ ${J.verdict}`);
  }
  out.secunde = Math.round((Date.now() - t0) / 1000);
}
if (ARG.out) fs.writeFileSync(ARG.out, JSON.stringify(rez, null, 1));
console.log("\nGATA " + CE);
