// Antrenorul de noapte (specul rețelei, livrarea 1): (1) pentru fiecare țintă, modelul de azi (pe tot ce are eticheta știută) - întâi,
// ca cifrele de mâine să nu aștepte verificarea; (2) cu bugetul rămas, lunile de verificare care lipsesc, judecate o dată și păstrate în
// data/retea/luni-<tinta>.json (refăcute doar când se schimbă versiunea trăsăturilor sau hiperparametrii); (3) verificarea pe lunile gata
// și pragul „dovedită” -> data/retea/modele.json (scris o dată, la sfârșit). Nu cere nimic din rețea și nu are token: îl pornește
// colectorul (scripts/lib/tura-retea.mjs), cu prioritate scăzută.
//   node retea/antreneaza.mjs [--buget-min 30] [--tinta directie] [--rad <dosarul cu data/>] [--seminte 5] [--max-randuri 40000]
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { incarcaModulele, simboluri, citesteBare, randuriMoneda, reperRand, randuriBoti, ORIZONT } from "./date.mjs";
import { luniDeTest, judecaLuna, modelFinal, verificare, optiuniLuni, luna } from "./verifica.mjs";
import { antreneaza, HIPER, porneste } from "./model.mjs";

const COD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARG = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d; };
const RAD = path.resolve(ARG("rad", COD)), DATA = path.join(RAD, "data", "retea");
const BUGET = Number(ARG("buget-min", 30)) * 60000, PANA = Date.now() + BUGET, DOAR = ARG("tinta", null);
const spune = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const scrie = (f, o) => { const tmp = f + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, f); };
const citeste = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

if (!(BUGET > 0)) { spune("buget 0: nimic de antrenat, modelele rămân"); process.exit(0); }
fs.mkdirSync(DATA, { recursive: true });
// revizia finală (M6): pe CPU (JS pur) antrenarea ar fi de sute de ori mai lentă și colectorul ar opri-o la 35 de minute în fiecare noapte
const BACKEND = await porneste();
if (BACKEND !== "wasm") { spune("TensorFlow nu rulează pe WebAssembly (" + BACKEND + "): nu antrenez, modelele de ieri rămân"); process.exit(2); }
// revizia finală (I2, M8): cheia CODULUI (versiunea, hiperparametrii și fișierele rețelei) păstrează modelele de ieri; lunile judecate mai
// cer și AMPRENTA DATELOR (luna primei bare a fiecărei monede și a BTC) - cât se umple istoria de 400 de zile, lunile se refac
const COD_HASH = crypto.createHash("sha1").update(["public/lib/retea.js", "retea/date.mjs", "retea/verifica.mjs", "retea/model.mjs"].map((f) => fs.readFileSync(path.join(COD, f), "utf8")).join("\n")).digest("hex").slice(0, 12);
const M = incarcaModulele(COD), CHEIE = M.R.VERSIUNE + "|" + JSON.stringify(HIPER) + "|" + COD_HASH, acum = Date.now();
const OPT = { antreneaza, prezice: M.R.prezice, versiune: M.R.VERSIUNE, ascunse: HIPER.ascunse, seminte: Number(ARG("seminte", HIPER.seminte)), maxRanduri: Number(ARG("max-randuri", 40000)) };
const vechi = citeste(path.join(DATA, "modele.json")), modele = vechi && vechi.cheie === CHEIE && vechi.modele ? vechi.modele : {};
const btc = citesteBare(RAD, "BTC_USDT_PERP", M.G), bareDe = new Map(), memo = new Map();
for (const s of simboluri(RAD)) { if (s === "BTC_USDT_PERP") continue; const b = citesteBare(RAD, s, M.G); if (b.length > 800) { bareDe.set(s, b); memo.set(s, {}); } }
const AMPRENTA = crypto.createHash("sha1").update([...bareDe.entries()].map(([s, b]) => s + ":" + luna(b[0].t)).sort().join(",") + "|BTC:" + (btc.length ? luna(btc[0].t) : "-")).digest("hex").slice(0, 12), CHEIE_LUNI = CHEIE + "|" + AMPRENTA;
spune("pornit: " + bareDe.size + " monede, BTC " + btc.length + " bare, buget " + Math.round(BUGET / 60000) + " min, " + BACKEND);
const tinte = Object.keys(M.R.TINTE).filter((t) => !DOAR || t === DOAR);
function randuri(t) {
  if (t === "rezultat") return randuriBoti(citeste(path.join(DATA, "boti.json")) || [], (s) => bareDe.get(s) || null, btc, M);
  const out = []; for (const [s, b] of bareDe) for (const r of randuriMoneda(t, s, b, btc, M, memo.get(s))) out.push(r);
  return out.sort((a, b) => a.t - b.t);
}
const OPT_LUNI = (t) => optiuniLuni(t, ORIZONT[t], acum);   // revizia finală (I1)
const NUME_REPER = (t) => (t === "rezultat" ? ["rata ta", "rata pe monedă"] : t === "directie" ? ["🎲", "50%"] : ["🎲"]);
// (1) modelele de azi
for (const t of tinte) {
  if (Date.now() >= PANA) break;
  const stiute = randuri(t).filter((r) => r.tEt <= acum);
  if (stiute.length < 200) { spune(t + ": prea puține rânduri (" + stiute.length + "), fără model"); continue; }
  const f = await modelFinal(stiute, OPT);
  modele[t] = { tinta: t, versiune: M.R.VERSIUNE, la: Date.now(), n: f.n, norm: f.norm, ansamblu: f.ansamblu, verificare: modele[t] && modele[t].verificare || null };
  spune(t + ": modelul de azi pe " + f.n + " rânduri");
}
// (2) lunile care lipsesc, cât ține bugetul; (3) verificarea pe lunile gata
for (const t of tinte) {
  if (!modele[t]) continue;
  const R = randuri(t), luni = luniDeTest(R, OPT_LUNI(t)), fis = path.join(DATA, "luni-" + t + ".json");
  let cache = citeste(fis); if (!cache || cache.cheie !== CHEIE_LUNI || !cache.luni) cache = { cheie: CHEIE_LUNI, luni: {} };
  let noi = 0;
  for (const l of luni) {
    if (cache.luni[l] || Date.now() >= PANA) continue;
    const rows = await judecaLuna(R, l, OPT);
    if (rows && t !== "rezultat") for (const r of rows) { r.r1 = reperRand(t, bareDe.get(r.s), r, M, memo.get(r.s)); r.r2 = t === "directie" ? 0.5 : null; }
    cache.luni[l] = (rows || []).map((r) => [r.t, r.s, r.y, r.p, r.pLog, r.r1, r.r2]); noi++;
    scrie(fis, cache); spune(t + ": luna " + l + " judecată (" + cache.luni[l].length + " rânduri)");
  }
  const gata = luni.filter((l) => cache.luni[l]), test = [];
  for (const l of gata) for (const a of cache.luni[l]) test.push({ t: a[0], s: a[1], y: a[2], p: a[3], pLog: a[4], r1: a[5], r2: a[6] });
  const v = test.length ? verificare(test, { oreBloc: M.R.TINTE[t].bloc, numeReper: NUME_REPER(t), luni: luni.length, luniGata: gata.length }) : null;
  if (v) Object.assign(v, M.R.decide(v));
  modele[t].verificare = v;
  spune(t + ": " + (gata.length - noi) + " luni din cache, " + noi + " noi; " + (v ? (v.dovedita ? "DOVEDITĂ" : "nedovedită: " + v.motiv) : "neverificată încă"));
}
scrie(path.join(DATA, "modele.json"), { la: Date.now(), cheie: CHEIE, versiune: M.R.VERSIUNE, modele });
spune("gata: " + Object.keys(modele).length + " modele");
