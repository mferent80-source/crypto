// Motorul PAGINII în node, fără nicio rescriere (v100.339, auditul din 13.11): funcțiile lui calc() tăiate din public/app.js (de la
// „function NUME(” până la următoarea declarație de pe coloana 0) și rulate într-un context vm; ce le lipsește (ReferenceError) se adaugă pe
// rând din același fișier. Probele și măsurătorile rulează astfel CODUL paginii, nu o copie a formulelor lui.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD_IMPLICIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const citeste = (rad, ...p) => fs.readFileSync(path.join(rad, ...p), "utf8").replace(/\r\n/g, "\n");
// taie o funcție de nivel înalt din sursă; null dacă nu există
export function taie(sursa, nume) {
  const m = new RegExp("\\n(?:async )?function " + nume + "\\(").exec(sursa); if (!m) return null;
  const a = m.index + 1, rest = sursa.slice(a + 10), n = /\n(?:async function |function |var |let |const |\/\/|\/\*|if\(|[A-Za-z_$][\w$.]*\s*=)/.exec(rest);
  return sursa.slice(a, n ? a + 10 + n.index : sursa.length);
}
// seria de probă pe care se descoperă lipsurile: 320 de bare în forma lui calc ([t, o, h, l, c, v, tÎnchidere, vQuote])
export function serieDeProba(n = 320) {
  return Array.from({ length: n }, (_, i) => { const p = 100 + 10 * Math.sin(i / 9) + i * 0.05; return [i * 3600000, String(p), String(p + 1), String(p - 1), String(p + 0.3), "1000", i * 3600000 + 1, "100000"]; });
}
// { c: contextul (c.calc, c.historicalProbability, c.bareInchise…), functii: [numele încărcate] }; extra = alte funcții de nivel înalt de încărcat
export function incarcaMotor(o = {}) {
  const rad = o.rad || process.env.RAD_PROBA || RAD_IMPLICIT, APP = citeste(rad, "public", "app.js");
  const c = Object.assign({ Math, Number, String, Array, Object, JSON, Date, isFinite, isNaN, parseFloat, parseInt, console, Map, Set, Intl, RegExp }, o.global || {});
  c.window = c; c.globalThis = c; vm.createContext(c);
  const avem = new Set();
  const pune = (nume) => { if (avem.has(nume)) return true; const s = taie(APP, nume); if (!s) return false; vm.runInContext(s, c); avem.add(nume); return true; };
  for (const n of ["ema", "RSI", "sma", "stddev", "ATR", "DMI", "stochRSI", "rollingVWAP", "superTrend", "smcState", "atrPctMare", "profileParams", "MFI", "CMF", "OBV", "ichimoku", "rsiDivergence", "calc", "historicalProbability", "bareInchise", "volBara"].concat(o.extra || [])) if (!pune(n)) throw new Error("motorul paginii: nu găsesc funcția " + n + " în app.js");
  c.__p = serieDeProba();
  for (let k = 0; k < 120; k++) {
    try { vm.runInContext("calc(__p,'auto'); historicalProbability(__p,4); bareInchise(__p,'1h',1e15)", c); return { c, functii: [...avem], rad }; }
    catch (e) { const m = /(\w+) is not defined/.exec(String(e && e.message)); if (!m || !pune(m[1])) throw new Error("motorul paginii: " + (e && e.message)); }
  }
  throw new Error("motorul paginii: prea multe lipsuri");
}
// un modul din public/lib încărcat în contextul dat (sau într-unul nou), întors după numele lui global
export function incarcaLib(fisiere, nume, o = {}) {
  const rad = o.rad || process.env.RAD_PROBA || RAD_IMPLICIT, c = o.c || Object.assign({ Math, Number, String, Array, Object, JSON, Date, isFinite, console, Intl, RegExp }, o.global || {});
  if (!o.c) { c.window = c; c.globalThis = c; vm.createContext(c); }
  for (const f of fisiere) vm.runInContext(citeste(rad, "public", "lib", f), c, { filename: f });
  return vm.runInContext(nume, c);
}
