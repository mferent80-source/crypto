// Arborii (gradient boosting) — a treia părere, lângă 🧠 (v100.93, specul docs/superpowers/specs/2026-10-04-gradient-boosting-design.md). Modul
// pur, ES5, fără dependențe; se încarcă DUPĂ retea.js: trăsăturile și intrările sunt ale rețelei (Retea.intrariBot / intrarePornire), aici e doar
// aritmetica arborilor (aceeași cu retea/arbori.mjs - proba le compară bit cu bit) și pragul „dovedită” al rețelei (Retea.decide). Nu schimbă
// semaforul, verdictul, poarta, alertele sau 🎲. Model: { versiune: "a1", baza, pas, semi: [[arbore, …], …] }, nod [k, prag, stânga, dreapta]
// sau [-1, valoare]; x[k] <= prag ⇒ stânga.
var Arbori = (function () {
  "use strict";
  var VERSIUNE = "a1", ZI = 864e5;
  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v); return isFinite(x) ? x : null; }
  function sig(z) { return 1 / (1 + Math.exp(-z)); }
  function scor(noduri, x) { var i = 0; for (var pas = 0; pas < 64; pas++) { var nd = noduri[i]; if (nd[0] < 0) return nd[1]; i = x[nd[0]] <= nd[1] ? nd[2] : nd[3]; } return 0; }
  // media sigmoidelor pe semințe; null la model sau intrare greșită (NaN, listă scurtă - arborele ar citi undefined)
  function prezice(model, x) {
    if (!model || !Array.isArray(model.semi) || !model.semi.length || !Array.isArray(x) || nr(model.baza) === null || nr(model.pas) === null) return null;
    for (var q = 0; q < x.length; q++) if (typeof x[q] !== "number" || !isFinite(x[q])) return null;
    for (var e0 = 0; e0 < model.semi.length; e0++) for (var a0 = 0; a0 < model.semi[e0].length; a0++) for (var n0 = 0; n0 < model.semi[e0][a0].length; n0++) { var nd = model.semi[e0][a0][n0]; if (nd[0] >= 0 && nd[0] >= x.length) return null; }
    var s = 0;
    for (var e = 0; e < model.semi.length; e++) { var F = model.baza, semi = model.semi[e]; for (var a = 0; a < semi.length; a++) F += model.pas * scor(semi[a], x); s += sig(F); }
    var p = s / model.semi.length; return isFinite(p) ? p : null;
  }
  // „dovedită / nedovedită” cu motivul - același prag ca rețeaua (Retea.decide), vârsta modelului la fel
  function verdict(m, acum) {
    if (!m || m.versiune !== VERSIUNE) return null;
    var d = Retea.decide(m.verificare || null), v = m.verificare || {}, la = nr(m.la), z = la !== null ? Math.floor(((nr(acum) || Date.now()) - la) / ZI) : null;
    return { dovedita: d.dovedita, motiv: d.motiv, nIndep: nr(v.nIndep) || 0, bloc: (Retea.TINTE[m.tinta] || { bloc: 24 }).bloc, vechi: z !== null && z >= 2 ? z : null };
  }
  // aceleași intrări ca Retea.pentruBot (prin producătorul comun Retea.intrariBot) -> { la, v, p: {cod: probabilitate} } sau null
  function pentruBot(modele, bare, o, btc) {
    if (!modele || typeof modele !== "object") return null;
    var it = Retea.intrariBot(bare, o, btc); if (!it) return null;
    var p = {}, k = 0;
    it.lista.forEach(function (q) { var m = modele[q.tinta]; if (!m || m.versiune !== VERSIUNE) return; var v = prezice(m, q.x); if (v !== null) { p[q.cod] = Math.round(v * 1000) / 1000; k++; } });
    return k ? { la: it.la, v: VERSIUNE, p: p } : null;
  }
  // „Rezultatul tău” la pornire, ca Retea.pentruPornire (modelul de după pornire ar fi văzut ce a urmat ⇒ null)
  function pentruPornire(modele, t, bare, btc, ist) {
    var m = modele && modele.rezultat; if (!m || m.versiune !== VERSIUNE) return null;
    var por = nr(t && t.pornit); if (por === null) return null;
    if (nr(m.la) !== null && m.la > por) return null;
    var f = Retea.intrarePornire(t, bare, btc, ist); if (!f) return null;
    var q = prezice(m, f.x); return q === null ? null : { p: Math.round(q * 1000) / 1000, rata: Math.round(f.rata * 1000) / 1000, n: f.n };
  }
  return { VERSIUNE: VERSIUNE, prezice: prezice, verdict: verdict, pentruBot: pentruBot, pentruPornire: pentruPornire };
})();
if (typeof globalThis !== "undefined") globalThis.Arbori = Arbori;
