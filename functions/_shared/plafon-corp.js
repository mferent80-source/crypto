// v100.276 (30.10, el: „ok fă idei” - ideea 3 după v100.275): plafonul corpului pe acțiune, într-un SINGUR loc. Ruta istoric-bot îl aplică
// (citesteCorp), colectorul îl verifică ÎNAINTE de trimitere (scripts/lib/marime-corp.mjs). Pe 29.10 un câmp nou pe clasament a trecut de
// 64 KB și serverul l-a refuzat tăcut o zi întreagă; acum colectorul spune „X KB din Y KB” și anunță de la 75%.
// În semne (ca text.length din citesteCorp), nu în octeți. Aceleași valori ca lanțul de până la v100.275.
const ISTORIC_BOT = {
  cazuri: 1048576, retea: 524288, arbori: 2097152, ore: 524288, scan: 393216, botiInchisi: 393216, ingustUrmarire: 524288,
  risc: 262144, carnet: 262144, latime: 262144, cont: 1048576, verdicteCalibrare: 262144, universSua: 1048576,
  sectoareTop: 262144, trend12: 262144, disciplinaBanda: 524288,
};
export const PLAFON_IMPLICIT = 65536;
export const PLAFON_T212 = 262144;
export function plafonIstoricBot(action) { return Object.prototype.hasOwnProperty.call(ISTORIC_BOT, action) ? ISTORIC_BOT[action] : PLAFON_IMPLICIT; }
// calea unei cereri a colectorului ⇒ { actiune, plafon } sau null (rută fără plafon știut aici)
export function plafonCale(cale) {
  const s = String(cale || ""), m = /^\/api\/istoric-bot\?(?:[^#]*&)?action=([A-Za-z0-9]+)/.exec(s);
  if (m) return { actiune: m[1], plafon: plafonIstoricBot(m[1]) };
  if (/^\/api\/t212(\?|$)/.test(s)) { const a = /[?&]action=([A-Za-z0-9]+)/.exec(s); return { actiune: "t212" + (a ? ":" + a[1] : ""), plafon: PLAFON_T212 }; }
  return null;
}
