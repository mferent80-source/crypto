// Tabloul botului, v80 - cinci randuri noi, modul pur (fara DOM, fara retea), probat in
// scripts/grid-v78.mjs pe cifrele botului REAL (MET, 24.09). Se incarca DUPA grid-calcul.js.
//   1) botul vs fisa de azi   2) grile pe zi vs comisioane si funding pe zi
//   3) daca il inchizi acum   4) linistea si laboratorul (din fisa, in app.js)
//   5) legatura cu jurnalul gridurilor
// Lipsa ramane null, nu 0 (Number(null) === 0 ar minti).
var TabloExtra = (function () {
  "use strict";
  var G = GridCalcul, C = G.C, ZI = 86400000;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function bu(b) { return (b && b.brut && b.brut.buOrderData) || {}; }

  // Pasul botului care RULEAZA: aritmetic = (sus-jos)/grile in pret; geometric = (sus/jos)^(1/N)-1
  function geometrieBot(b) {
    var d = bu(b), N = nr(d.row), jos = nr(b && b.gridJos), sus = nr(b && b.gridSus), p = nr(b && b.pretCurent);
    if (!(N >= 2) || !(jos > 0) || !(sus > jos)) return null;
    var mod = String(d.gridType || "").toLowerCase() === "geometric" ? "geometric" : "aritmetic";
    var ref = p > 0 ? p : (jos + sus) / 2;
    var pasPret = mod === "aritmetic" ? (sus - jos) / N : null;
    var pasPct = mod === "aritmetic" ? pasPret / ref : Math.pow(sus / jos, 1 / N) - 1;
    var net = pasPct - 2 * C.COMISION;
    return { mod: mod, grile: N, jos: jos, sus: sus, pasPret: pasPret, pasPct: pasPct, netPct: net, preaDese: net < C.PAS_MIN - 2 * C.COMISION };
  }

  function comparaCuFisa(b, f) {
    var out = { randuri: [], semnale: [] };
    if (!b || !f || !f.setare) return out;
    var g = geometrieBot(b), st = f.setare, pr = G.procent, lev = nr(b.levier);
    var dirBot = String(b.directie || "").toLowerCase();
    out.randuri.push({ et: "Direcția", bot: dirBot || "—", fisa: f.dir });
    out.randuri.push({ et: "Interval", bot: g ? g.jos + " – " + g.sus : "—", fisa: st.jos.toPrecision(4) + " – " + st.sus.toPrecision(4) });
    out.randuri.push({ et: "Grile", bot: g ? g.grile + " " + g.mod : "—", fisa: st.grile + " geometric" });
    out.randuri.push({ et: "Pas net pe grilă", bot: g ? pr(g.netPct) : "—", fisa: pr(st.profitGrila) });
    out.randuri.push({ et: "Levier", bot: lev !== null ? lev + "×" : "—", fisa: st.levier + "× (sigur " + st.levierSigur + "×)" });
    out.randuri.push({ et: "Verdictul de azi", bot: "", fisa: f.verdict && f.verdict.nivel || "—" });
    if (g && g.preaDese) out.semnale.push("grile prea dese: fiecare umplere lasă " + pr(g.netPct) + " după comision (fișa cere cel puțin " + pr(C.PAS_MIN - 2 * C.COMISION) + ")");
    if (lev !== null && st.levierSigur > 0 && lev > st.levierSigur) out.semnale.push("levier " + lev + "× peste cel sigur azi (" + st.levierSigur + "×): lichidarea stă mai aproape decât o lățime de interval");
    if (dirBot && f.dir && dirBot !== f.dir && !(dirBot === "neutral" && f.dir === "neutru")) out.semnale.push("direcția botului (" + dirBot + ") diferă de cea din trend azi (" + f.dir + ")");
    if (g && (g.jos > st.sus || g.sus < st.jos)) out.semnale.push("intervalul botului nu se mai suprapune cu cel propus azi");
    if (f.verdict && f.verdict.nivel === "nu") out.semnale.push("fișa de azi zice NU PORNI pe moneda asta: " + (f.verdict.motive[0] || ""));
    return out;
  }

  function grileVsCosturi(b, acum) {
    var d = bu(b), p = nr(b && b.pornitLa), zile = p > 0 ? Math.max(1 / 24, ((acum || Date.now()) - p) / ZI) : null;
    var fund = nr(b && b.finantare), com = nr(b && b.comisioane), g24 = nr(d.gridProfit24h);
    var out = { grile24h: g24, umpleri24h: nr(d.trx24h), zile: zile, fundingZi: fund !== null && zile ? fund / zile : null, comisionZi: com !== null && zile ? com / zile : null, netZi: null, fundingMananca: null };
    if (g24 !== null && out.fundingZi !== null && out.comisionZi !== null) {
      out.netZi = g24 + out.comisionZi + out.fundingZi;
      out.fundingMananca = out.fundingZi < 0 && -out.fundingZi >= g24;
    }
    return out;
  }

  // Ce iei daca inchizi acum si la ce pret botul iese pe zero (long/short; la neutru semnul
  // pozitiei e nesigur - nu se spune).
  function dacaInchizi(b, comision) {
    comision = comision == null ? C.COMISION : comision;
    var inv = nr(b && b.investit), tot = nr(b && b.profitTotal), net = nr(b && b.profitNet);
    var poz = nr(b && b.pozitie), pd = nr(b && b.pretDeschidere), p = nr(b && b.pretCurent), dir = String(b && b.directie || "").toLowerCase();
    var out = { iei: null, comisionInchidere: null, pretZero: null, distantaZeroPct: null };
    if (poz !== null && p !== null) out.comisionInchidere = Math.abs(poz) * p * comision;
    if (inv !== null && tot !== null) out.iei = inv + tot - (out.comisionInchidere || 0);
    var q = poz !== null ? Math.abs(poz) : null;
    if (q > 0 && pd > 0 && net !== null && b.pnlNerealizatSigur !== false) {
      if (dir === "long") out.pretZero = (q * pd - net) / (q * (1 - comision));
      else if (dir === "short") out.pretZero = (q * pd + net) / (q * (1 + comision));
    }
    if (out.pretZero !== null && p > 0) out.distantaZeroPct = (out.pretZero - p) / p;
    return out;
  }

  function legaturaJurnal(lista, b) {
    if (!Array.isArray(lista) || !b || !b.id) return null;
    for (var i = 0; i < lista.length; i++) if (lista[i] && String(lista[i].botId) === String(b.id)) return lista[i];
    return null;
  }

  return { geometrieBot: geometrieBot, comparaCuFisa: comparaCuFisa, grileVsCosturi: grileVsCosturi, dacaInchizi: dacaInchizi, legaturaJurnal: legaturaJurnal };
})();
if (typeof globalThis !== "undefined") globalThis.TabloExtra = TabloExtra;
