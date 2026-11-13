// Măsurătorile din docs/cercetare/2026-11-13-tablou-acuratete.md (regulile sunt ACOLO, scrise înainte de cifre). Rulează codul paginii
// (scripts/lib/motor-pagina.mjs), pe lumânări publice Binance perp. Nimic din vreun cont; nu scrie nimic în afara dosarului de cache.
//   node scripts/cercetare-v100339-acuratete.mjs --ce=m1|m2|m3|m3h0|m4 [--tf=1h|4h] [--cache=<dosar>] [--out=<fișier.json>] [--samanta=<număr>] [--pana=<ms UTC>]
// --samanta = sămânța generatorului (implicit cea din jurnal, 20261113): aceeași măsurătoare pe altă sămânță arată cât din cifră e noroc.
// --pana = capătul datelor: barele care se închid după clipa aceea nu intră, iar o aducere nouă cere de la Binance exact până acolo
// (fără el capătul e clipa rulării, deci cifrele nu se pot reface întocmai mai târziu; capătul rulărilor din 13.11 e scris în jurnal).
// m1 = direcția la 4 bare (verdictul, becul, nota TradingView) · m2 = verdictul stabil (histerezis + confirmare) · m3 = estimarea din
// situații asemănătoare (K1 față de K2) · m4 = confirmarea „bec lateral ⇒ mai puțină mișcare” pe date mai vechi.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { incarcaMotor, incarcaLib } from "./lib/motor-pagina.mjs";
import { rating } from "./lib/tv-rating-calc.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)=(.*)$/.exec(a); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true]; }));
const CE = String(ARG.ce || "m1"), CACHE = ARG.cache || path.join(os.tmpdir(), "radar-cercetare"); fs.mkdirSync(CACHE, { recursive: true });
const SYMS = ["BTCUSDT", "ETHUSDT", "ZECUSDT", "HYPEUSDT", "SOLUSDT", "BNBUSDT", "NEARUSDT", "XRPUSDT", "DOGEUSDT", "ENAUSDT", "WLDUSDT", "SUIUSDT", "ADAUSDT", "UNIUSDT", "PUMPUSDT", "INITUSDT", "LINKUSDT", "FILUSDT", "BCHUSDT", "AVAXUSDT", "EGLDUSDT"];
const TFS = { "1h": { ms: 3600000, orizont: 24 }, "4h": { ms: 14400000, orizont: 6 } }, TF_LISTA = ARG.tf && TFS[ARG.tf] ? [ARG.tf] : Object.keys(TFS);
const FER = 499, H = 4, PAS = 4, SAMANTA = Number(ARG.samanta) > 0 ? Number(ARG.samanta) : 20261113, B = 2000, BLOC = 5, PANA = Number(ARG.pana) > 0 ? Number(ARG.pana) : null;
// câte teste cu verdict s-au făcut până la fiecare măsurătoare inclusiv (registrul din jurnal)
const TESTE = { m1: 6, m2: 8, m3: 10, m3h0: 10, m4: 12 };
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
  out.secunde = Math.round((Date.now() - t0) / 1000);
}
if (ARG.out) fs.writeFileSync(ARG.out, JSON.stringify(rez, null, 1));
console.log("\nGATA " + CE);
