// Grile sau directie? - din umplerile REALE ale botului (Pionex /trade/fills).
// Modul pur (fara DOM, fara retea), probat in scripts/grid-v78.mjs. Se incarca DUPA grid-calcul.js.
//
// De ce: cifra mare din Pionex amesteca banii din grile cu banii din directie.
// Aici fiecare umplere se pune intr-o celula: o cumparare deschide un lot, o vanzare
// il inchide (FIFO); la neutru o vanzare inchide intai loturile long, iar restul
// deschide short (si invers). Un lot deschis LA UN NIVEL de grila e "din grile";
// unul din primele 2 minute dupa pornire (intrarea la piata a botului) sau in afara
// nivelurilor e "din directie".
// Ce e inca deschis se socoteste la pretul de acum = nerealizat (tot directie).
// Lipsa ramane lipsa: umplerile fara pret/cantitate/parte se sar, nu devin 0.
var GridUmpleri = (function () {
  "use strict";
  var G = GridCalcul;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }

  // Randuri Pionex -> {t, side, pret, cant, fee (in moneda de cotare)}, crescator dupa timp
  function citeste(randuri) {
    if (!Array.isArray(randuri)) return [];
    var out = [];
    for (var i = 0; i < randuri.length; i++) {
      var r = randuri[i]; if (!r || typeof r !== "object") continue;
      var side = String(r.side || "").toUpperCase();
      var pret = nr(r.price), cant = nr(r.size != null ? r.size : r.qty), t = nr(r.timestamp != null ? r.timestamp : (r.ts != null ? r.ts : r.time));
      if ((side !== "BUY" && side !== "SELL") || !(pret > 0) || !(cant > 0) || t === null) continue;
      var fee = nr(r.fee); if (fee === null) fee = 0;
      var baza = String(r.symbol || "").split("_")[0].toUpperCase(), feeCoin = String(r.feeCoin || "").toUpperCase();
      if (feeCoin && baza && feeCoin === baza) fee = fee * pret;   // comisionul in moneda de baza -> in USDT
      out.push({ t: t, side: side, pret: pret, cant: cant, fee: Math.abs(fee), id: r.id != null ? String(r.id) : null });
    }
    // aceeasi umplere venita in doua pagini (granita pe endTime) se tine o data
    var vazut = {}, unice = [];
    for (var u = 0; u < out.length; u++) { var k = out[u].id || (out[u].t + "|" + out[u].side + "|" + out[u].pret + "|" + out[u].cant); if (!vazut[k]) { vazut[k] = 1; unice.push(out[u]); } }
    unice.sort(function (a, b) { return a.t - b.t; });
    return unice;
  }

  function laNivel(pret, niv, pas) {
    var tol = pret * pas / 4;
    for (var k = 0; k < niv.length; k++) if (Math.abs(niv[k] - pret) <= tol) return true;
    return false;
  }

  function niveluriAritmetice(jos, sus, N) { var v = [], p = (sus - jos) / N; for (var k = 0; k <= N; k++) v.push(jos + p * k); v[N] = sus; return v; }
  function cateLaNivel(umpleri, niv, pas, de, PORNIRE_MS) { var n = 0; for (var i = 0; i < umpleri.length; i++) if (umpleri[i].t - de > PORNIRE_MS && laNivel(umpleri[i].pret, niv, pas)) n++; return n; }

  // grid = {jos, sus, grile, dir, pornitLa, mod: "geometric"|"aritmetic"|"auto", trunchiat};
  // pretAcum pentru nerealizat (lipsa -> nerealizat null, nu 0).
  // out.motiv != null => impartirea NU se poate face cinstit; cifrele nu se arata.
  function imparte(umpleri, grid, pretAcum) {
    var out = { grile: 0, directieRealizat: 0, nerealizat: 0, comisioane: 0, umpleri: 0, total: 0, pozitie: { cant: 0, medie: null }, laNivel: 0, inAfara: 0, mod: null, motiv: null };
    if (!grid || !(grid.jos > 0) || !(grid.sus > grid.jos) || !(grid.grile >= 2)) { out.motiv = "botul n-are interval/grile citite"; return out; }
    var de = nr(grid.pornitLa) || 0, PORNIRE_MS = 2 * 60000;
    if (grid.trunchiat) { out.motiv = "istoricul de umpleri e trunchiat: fara inceput, perechile nu se pot reface"; return out; }
    var nivG = G.niveluri(grid.jos, grid.sus, grid.grile), pasG = Math.pow(grid.sus / grid.jos, 1 / grid.grile) - 1;
    var nivA = niveluriAritmetice(grid.jos, grid.sus, grid.grile), pasA = (grid.sus - grid.jos) / grid.grile / grid.jos;
    var mod = grid.mod === "aritmetic" || grid.mod === "geometric" ? grid.mod : null;
    if (!mod) { var lg = cateLaNivel(umpleri, nivG, pasG, de, PORNIRE_MS), la = cateLaNivel(umpleri, nivA, pasA, de, PORNIRE_MS); mod = la > lg ? "aritmetic" : "geometric"; }
    var niv = mod === "aritmetic" ? nivA : nivG, pas = mod === "aritmetic" ? pasA : pasG;
    out.mod = mod;
    var longi = [], shorti = [];   // loturi deschise: {cant, pret, grila}
    function indiceNivel(pret) {
      var tol = pret * pas / 4;
      for (var k = 0; k < niv.length; k++) if (Math.abs(niv[k] - pret) <= tol) return k;
      return -1;
    }
    // Care lot se inchide? Nu FIFO: gridul vinde celula de sub nivel (long) / cumpara
    // inapoi celula de deasupra (short). O inchidere la nivelul k ia lotul deschis la
    // nivelul vecin (k-1 la long, k+1 la short); daca nu e, cel mai apropiat lot de
    // partea buna (sub pret la long, peste la short); altfel cel mai apropiat oricum.
    function alegeLot(loturi, pret, semn) {
      var k = indiceNivel(pret), vecin = k < 0 ? null : (semn > 0 ? (k > 0 ? niv[k - 1] : null) : (k + 1 < niv.length ? niv[k + 1] : null));
      var best = -1, bestD = Infinity, i;
      if (vecin !== null) for (i = 0; i < loturi.length; i++) if (loturi[i].grila && Math.abs(loturi[i].pret - vecin) <= vecin * pas / 4) return i;
      for (i = 0; i < loturi.length; i++) {
        var d = semn * (pret - loturi[i].pret);   // > 0 = pe partea buna
        if (d > 0 && d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0) return best;
      for (i = 0; i < loturi.length; i++) { var dd = Math.abs(pret - loturi[i].pret); if (dd < bestD) { bestD = dd; best = i; } }
      return best;
    }
    function inchide(loturi, cant, pret, semn) {
      var ramas = cant;
      while (ramas > 1e-12 && loturi.length) {
        var i = alegeLot(loturi, pret, semn), lot = loturi[i], q = Math.min(ramas, lot.cant), c = semn * (pret - lot.pret) * q;
        if (lot.grila) out.grile += c; else out.directieRealizat += c;
        lot.cant -= q; ramas -= q;
        if (lot.cant <= 1e-12) loturi.splice(i, 1);
      }
      return ramas;
    }
    for (var i = 0; i < umpleri.length; i++) {
      var u = umpleri[i];
      if (u.t < de) continue;
      out.umpleri++; out.comisioane += u.fee;
      var peNivel = u.t - de > PORNIRE_MS && laNivel(u.pret, niv, pas);
      if (peNivel) out.laNivel++; else out.inAfara++;
      if (u.side === "BUY") {
        var r1 = inchide(shorti, u.cant, u.pret, -1);          // cumpararea inchide short-uri
        if (r1 > 1e-12) longi.push({ cant: r1, pret: u.pret, grila: peNivel });
      } else {
        var r2 = inchide(longi, u.cant, u.pret, 1);            // vanzarea inchide long-uri
        if (r2 > 1e-12) shorti.push({ cant: r2, pret: u.pret, grila: peNivel });
      }
    }
    var cant = 0, cost = 0, p = nr(pretAcum);
    longi.forEach(function (l) { cant += l.cant; cost += l.cant * l.pret; if (p !== null) out.nerealizat += (p - l.pret) * l.cant; });
    shorti.forEach(function (l) { cant -= l.cant; cost += l.cant * l.pret; if (p !== null) out.nerealizat += (l.pret - p) * l.cant; });
    if (p === null) out.nerealizat = null;
    out.pozitie = { cant: cant, medie: Math.abs(cant) > 1e-12 ? cost / Math.abs(cant) : null };
    // long/short fara intrarea de la pornire = fereastra incepe dupa pornire: perechile ar iesi strambe
    if ((grid.dir === "long" || grid.dir === "short") && out.umpleri > 0 && !umpleri.some(function (u) { return u.t >= de && u.t - de <= PORNIRE_MS; })) { out.motiv = "nu vad intrarea de la pornire in umpleri: nu pot imparti cinstit"; return out; }
    // sub 70% din umplerile de grid la nivel = nivelurile nu-s cele ale botului (alt mod, alt interval)
    if (out.laNivel + out.inAfara > 3 && out.laNivel < 0.7 * (out.laNivel + out.inAfara)) { out.motiv = "umplerile nu cad pe nivelurile gridului (" + out.laNivel + " din " + (out.laNivel + out.inAfara) + "): nu pot imparti"; return out; }
    out.total = out.nerealizat === null ? null : out.grile + out.directieRealizat + out.nerealizat - out.comisioane;
    return out;
  }

  return { citeste: citeste, imparte: imparte };
})();
if (typeof globalThis !== "undefined") globalThis.GridUmpleri = GridUmpleri;
