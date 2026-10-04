// Antrenorul arborilor (v100.93, specul docs/superpowers/specs/2026-10-04-gradient-boosting-design.md): aceleași rânduri (date.mjs), aceeași
// verificare walk-forward (verifica.mjs) și același prag „dovedită” (Retea.decide) ca rețeaua; modelul e boosting pe histograme (arbori.mjs),
// JS curat, fără TensorFlow. (1) pentru fiecare țintă modelul de azi (pe tot ce are eticheta știută); (2) cu bugetul rămas, lunile de verificare
// care lipsesc, judecate o dată și păstrate în data/retea/luni-arbori-<tinta>.json; (3) verificarea pe lunile gata, pragul „dovedită” și,
// în plus, vsRetea - arborii față de rețea pe lunile judecate de amândoi (din luni-<tinta>.json al rețelei; doar informație, nu prag)
// -> data/retea/modele-arbori.json (scris o dată, la sfârșit). Nu cere nimic din rețea și nu are token: îl pornește colectorul
// (scripts/lib/tura-retea.mjs), DUPĂ antrenorul rețelei, cu prioritate scăzută.
//   node retea/antreneaza-arbori.mjs [--buget-min 30] [--tinta directie] [--rad <dosarul cu data/>] [--seminte 3] [--max-randuri 40000]
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { incarcaModulele, simboluri, citesteBare, randuriMoneda, reperRand, randuriBoti, ORIZONT } from "./date.mjs";
import { luniDeTest, optiuniLuni, impartire, normalizare, matrice, esantion, logistica, verificare, luna, bss, bootstrap2 } from "./verifica.mjs";
import { antreneazaArbori, preziceArbori, exportaArbori, HIPER_ARBORI } from "./arbori.mjs";

const COD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARG = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d; };
const RAD = path.resolve(ARG("rad", COD)), DATA = path.join(RAD, "data", "retea");
const BUGET = Number(ARG("buget-min", 30)) * 60000, PANA = Date.now() + BUGET, DOAR = ARG("tinta", null);
const SEMINTE = Number(ARG("seminte", HIPER_ARBORI.seminte)), MAX = Number(ARG("max-randuri", 40000)), VERSIUNE = "a1";
const spune = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const scrie = (f, o) => { const tmp = f + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, f); };
const citeste = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

if (!(BUGET > 0)) { spune("buget 0: nimic de antrenat, modelele arborilor rămân"); process.exit(0); }
fs.mkdirSync(DATA, { recursive: true });
// cheia CODULUI (versiunea, hiperparametrii și fișierele atinse) păstrează modelele de ieri; lunile judecate mai cer și AMPRENTA DATELOR
const COD_HASH = crypto.createHash("sha1").update(["public/lib/retea.js", "public/lib/arbori.js", "retea/date.mjs", "retea/verifica.mjs", "retea/arbori.mjs"].map((f) => fs.readFileSync(path.join(COD, f), "utf8")).join("\n")).digest("hex").slice(0, 12);
const M = incarcaModulele(COD), CHEIE = VERSIUNE + "|" + JSON.stringify(HIPER_ARBORI) + "|" + COD_HASH, acum = Date.now();
const vechi = citeste(path.join(DATA, "modele-arbori.json")), modele = vechi && vechi.cheie === CHEIE && vechi.modele ? vechi.modele : {};
const btc = citesteBare(RAD, "BTC_USDT_PERP", M.G), bareDe = new Map(), memo = new Map();
for (const s of simboluri(RAD)) { if (s === "BTC_USDT_PERP") continue; const b = citesteBare(RAD, s, M.G); if (b.length > 800) { bareDe.set(s, b); memo.set(s, {}); } }
const AMPRENTA = crypto.createHash("sha1").update([...bareDe.entries()].map(([s, b]) => s + ":" + luna(b[0].t)).sort().join(",") + "|BTC:" + (btc.length ? luna(btc[0].t) : "-")).digest("hex").slice(0, 12), CHEIE_LUNI = CHEIE + "|" + AMPRENTA;
spune("pornit (arbori): " + bareDe.size + " monede, BTC " + btc.length + " bare, buget " + Math.round(BUGET / 60000) + " min, " + SEMINTE + " semințe");
const tinte = Object.keys(M.R.TINTE).filter((t) => !DOAR || t === DOAR);
function randuri(t) {
  if (t === "rezultat") return randuriBoti(citeste(path.join(DATA, "boti.json")) || [], (s) => bareDe.get(s) || null, btc, M);
  const out = []; for (const [s, b] of bareDe) for (const r of randuriMoneda(t, s, b, btc, M, memo.get(s))) out.push(r);
  return out.sort((a, b) => a.t - b.t);
}
const OPT_LUNI = (t) => optiuniLuni(t, ORIZONT[t], acum);
const NUME_REPER = (t) => (t === "rezultat" ? ["rata ta", "rata pe monedă"] : t === "directie" ? ["🎲", "50%"] : ["🎲"]);
// ansamblul de arbori pe rânduri (X NEnormalizat, în ordinea timpului - esantion le pune înapoi în ordine) + formula simplă pe aceleași
// rânduri, normalizate (ca la rețea; e pragul). Modelul se EXPORTĂ (rotunjit) înainte de orice predicție: ce se verifică e ce se servește
function ansamblu(rows, cuLogistic) {
  const tr = esantion(rows, MAX, 11), k = tr[0].x.length, X = Float32Array.from(tr.flatMap((q) => q.x)), y = Float32Array.from(tr, (q) => q.y);
  const semi = [], runde = []; let baza = 0;
  for (let s = 0; s < SEMINTE; s++) { const a = antreneazaArbori(X, y, k, { seed: 1000 + s }); semi.push(a.arbori); baza = a.baza; runde.push(a.runde); }
  const model = exportaArbori({ baza, pas: HIPER_ARBORI.pas, semi });
  let logist = null; if (cuLogistic) { const norm = normalizare(tr); logist = { norm, st: logistica(matrice(tr, norm), y, k).straturi[0] }; }
  return { model, logist, n: tr.length, nIn: k, runde };
}
const pLog = (lg, x) => { let a = lg.st.b[0]; for (let j = 0; j < x.length; j++) a += ((x[j] - lg.norm.m[j]) / (lg.norm.s[j] || 1)) * lg.st.W[j][0]; return 1 / (1 + Math.exp(-a)); };
// o lună: antrenarea pe ce se știa la începutul ei, apoi arborii și formula simplă pe rândurile lunii (aceleași cazuri)
function judecaLunaArbori(R, l) {
  const { antrenare, test } = impartire(R, l); if (antrenare.length < 50 || !test.length) return null;
  const a = ansamblu(antrenare, true);
  return test.map((r) => ({ t: r.t, s: r.s, y: r.y, p: preziceArbori(a.model, r.x), pLog: pLog(a.logist, r.x), i: r.i, e: r.e, r1: r.r1 ?? null, r2: r.r2 ?? null }));
}
const r4 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 1e4) / 1e4);
// arborii față de rețea pe aceleași rânduri judecate (t + moneda), cu IC prin același bootstrap; sub 100 de rânduri comune ⇒ null
function vsRetea(t, test) {
  const c = citeste(path.join(DATA, "luni-" + t + ".json")); if (!c || !c.luni) return null;
  const nn = new Map(); for (const l of Object.values(c.luni)) for (const a of l) nn.set(a[0] + "|" + a[1], a[3]);
  const l = test.filter((x) => Number.isFinite(x.p) && Number.isFinite(nn.get(x.t + "|" + x.s))).map((x) => ({ ...x, pNN: nn.get(x.t + "|" + x.s) }));
  if (l.length < 100) return null;
  return { n: l.length, bss: r4(bss(l, "p", "pNN")), ic: bootstrap2(l, "p", "pNN").map(r4) };
}
// (1) modelele de azi
for (const t of tinte) {
  if (Date.now() >= PANA) break;
  const stiute = randuri(t).filter((r) => r.tEt <= acum);
  if (stiute.length < 200) { spune(t + ": prea puține rânduri (" + stiute.length + "), fără model"); continue; }
  const a = ansamblu(stiute, false);
  modele[t] = { tinta: t, versiune: VERSIUNE, la: Date.now(), n: a.n, nIn: a.nIn, baza: a.model.baza, pas: a.model.pas, semi: a.model.semi, verificare: modele[t] && modele[t].verificare || null };
  spune(t + ": modelul de azi pe " + a.n + " rânduri, runde " + a.runde.join("/"));
}
// (2) lunile care lipsesc, cât ține bugetul; (3) verificarea pe lunile gata + vsRetea
for (const t of tinte) {
  if (!modele[t]) continue;
  const R = randuri(t), luni = luniDeTest(R, OPT_LUNI(t)), fis = path.join(DATA, "luni-arbori-" + t + ".json");
  let cache = citeste(fis); if (!cache || cache.cheie !== CHEIE_LUNI || !cache.luni) cache = { cheie: CHEIE_LUNI, luni: {} };
  let noi = 0;
  for (const l of luni) {
    if (cache.luni[l] || Date.now() >= PANA) continue;
    const rows = judecaLunaArbori(R, l);
    if (rows && t !== "rezultat") for (const r of rows) { r.r1 = reperRand(t, bareDe.get(r.s), r, M, memo.get(r.s)); r.r2 = t === "directie" ? 0.5 : null; }
    cache.luni[l] = (rows || []).map((r) => [r.t, r.s, r.y, r.p, r.pLog, r.r1, r.r2]); noi++;
    scrie(fis, cache); spune(t + ": luna " + l + " judecată (" + cache.luni[l].length + " rânduri)");
  }
  const gata = luni.filter((l) => cache.luni[l]), test = [];
  for (const l of gata) for (const a of cache.luni[l]) test.push({ t: a[0], s: a[1], y: a[2], p: a[3], pLog: a[4], r1: a[5], r2: a[6] });
  const v = test.length ? verificare(test, { oreBloc: M.R.TINTE[t].bloc, numeReper: NUME_REPER(t), luni: luni.length, luniGata: gata.length }) : null;
  if (v) { Object.assign(v, M.R.decide(v)); v.vsRetea = vsRetea(t, test); }
  modele[t].verificare = v;
  spune(t + ": " + (gata.length - noi) + " luni din cache, " + noi + " noi; " + (v ? (v.dovedita ? "DOVEDITĂ" : "nedovedită: " + v.motiv) + (v.vsRetea ? "; față de 🧠: " + v.vsRetea.bss : "") : "neverificată încă"));
}
scrie(path.join(DATA, "modele-arbori.json"), { la: Date.now(), cheie: CHEIE, versiune: VERSIUNE, modele });
spune("gata: " + Object.keys(modele).length + " modele de arbori");
