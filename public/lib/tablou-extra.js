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

  // v81 (1) Ziua botului: din istoricul minut-cu-minut (colectorul, 7 zile) -> pe fiecare zi
  // (ora Romaniei) cat au adus grilele (ultima minus ultima de ieri) si totalul la sfarsit.
  function peZile(ist, tz) {
    if (!Array.isArray(ist) || !ist.length) return [];
    var f;
    try { f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }); } catch (e) { f = null; }
    var zi = function (t) { return f ? f.format(new Date(t)) : new Date(t).toISOString().slice(0, 10); };
    var l = ist.filter(function (x) { return x && nr(x.t) !== null; }).slice().sort(function (a, b) { return a.t - b.t; });
    var zile = [], cur = null;
    l.forEach(function (x) {
      var z = zi(x.t);
      if (!cur || cur.zi !== z) { cur = { zi: z, prim: x, ultim: x }; zile.push(cur); } else cur.ultim = x;
    });
    return zile.map(function (d, i) {
      var sf = nr(d.ultim.gridProfitBrut), dinainte = i > 0 ? nr(zile[i - 1].ultim.gridProfitBrut) : nr(d.prim.gridProfitBrut);
      return { zi: d.zi, grile: sf !== null && dinainte !== null ? sf - dinainte : null, total: nr(d.ultim.profitTotal) };
    });
  }

  // v81 (2) Daca adaug marja M: marja izolata in plus muta lichidarea cu M / pozitie
  // (long in jos, short in sus). Aproximare: Pionex poate rotunji altfel.
  function marjaNoua(b, M) {
    var q = nr(b && b.pozitie), L = nr(b && b.pretLichidare), p = nr(b && b.pretCurent), dir = String(b && b.directie || "").toLowerCase();
    M = nr(M);
    if (!(M > 0) || !(Math.abs(q) > 0) || L === null || !(L > 0) || (dir !== "long" && dir !== "short")) return null;
    var nou = dir === "long" ? L - M / Math.abs(q) : L + M / Math.abs(q);
    if (dir === "long" && nou < 0) nou = 0;
    return { lichidare: nou, distantaPct: p > 0 ? Math.abs(p - nou) / p : null, inainte: L };
  }

  // v81 (4) Botul vs "sa fi tinut doar pozitia": un long/short simplu cu aceeasi suma si
  // acelasi levier, deschis la pretul de pornire al botului. La neutru: vs a nu face nimic.
  function vsPozitie(b) {
    var d = bu(b), inv = nr(b && b.investit), lev = nr(b && b.levier), init = nr(d.initPrice), p = nr(b && b.pretCurent), tot = nr(b && b.profitTotal);
    var dir = String(b && b.directie || "").toLowerCase();
    if (inv === null || tot === null) return null;
    var poz = dir === "long" || dir === "short" ? (init > 0 && p > 0 && lev > 0 ? (dir === "long" ? 1 : -1) * inv * lev * (p - init) / init : null) : 0;
    return { pozitieSimpla: poz, bot: tot, diferenta: poz === null ? null : tot - poz, pretPornire: init };
  }

  // v81 (3) Planul lui: {plus: USDT, minus: USDT, afaraOre: ore}. stare.afaraDe = de cand e
  // pretul in afara gridului (il tine colectorul/tabloul). Intoarce distantele si ce s-a atins.
  function planStare(b, plan, stare, acum) {
    if (!plan || !b) return null;
    var tot = nr(b.profitTotal), out = { plus: null, minus: null, afara: null, atins: [] };
    if (nr(plan.plus) > 0 && tot !== null) { out.plus = { prag: nr(plan.plus), lipsa: nr(plan.plus) - tot }; if (tot >= nr(plan.plus)) out.atins.push("plus"); }
    if (nr(plan.minus) > 0 && tot !== null) { out.minus = { prag: nr(plan.minus), lipsa: nr(plan.minus) + tot }; if (tot <= -nr(plan.minus)) out.atins.push("minus"); }
    if (nr(plan.afaraOre) > 0) {
      var de = stare && nr(stare.afaraDe), ore = de ? ((acum || Date.now()) - de) / 3600000 : 0;
      out.afara = { prag: nr(plan.afaraOre), ore: ore, afara: !!de };
      if (de && ore >= nr(plan.afaraOre)) out.atins.push("afara");
    }
    return out;
  }

  // v81 (5) Evenimentele pe grafic: iesirile/revenirile din grid (din istoricul de preturi)
  // si alertele colectorului, doar cele din fereastra [deLa, panaLa].
  function evenimente(ist, alerte, jos, sus, deLa, panaLa) {
    var out = [], inauntru = null;
    (Array.isArray(ist) ? ist.slice().sort(function (a, b) { return a.t - b.t; }) : []).forEach(function (x) {
      var p = nr(x.pretPerp), t = nr(x.t); if (p === null || t === null || !(jos > 0) || !(sus > jos)) return;
      var acum = p >= jos && p <= sus;
      if (inauntru !== null && acum !== inauntru && t >= deLa && t <= panaLa) out.push({ t: t, fel: acum ? "revenire" : p > sus ? "iesire-sus" : "iesire-jos", text: acum ? "revine în grid" : "iese din grid " + (p > sus ? "pe sus" : "pe jos") });
      inauntru = acum;
    });
    (Array.isArray(alerte) ? alerte : []).forEach(function (a) { var t = nr(a && a.t); if (t !== null && t >= deLa && t <= panaLa) out.push({ t: t, fel: "alerta", text: String(a.titlu || "alertă"), nivel: a.nivel }); });
    return out.sort(function (a, b) { return a.t - b.t; });
  }

  // v84.1: cat mai e pana la marginile gridului, in % din pretul de acum (el: "nu mai e distanta pana la grid?")
  function distanteGrid(b) {
    var p = nr(b && b.pretCurent), jos = nr(b && b.gridJos), sus = nr(b && b.gridSus);
    if (p === null || !(p > 0) || jos === null || sus === null || !(sus > jos)) return null;
    var f = function (v) { return (v * 100).toFixed(1).replace(".", ",") + "%"; };
    var j = (p - jos) / p, s = (sus - p) / p, inGrid = p >= jos && p <= sus;
    return { josPct: j, susPct: s, inGrid: inGrid, text: inGrid ? "↓ " + f(j) + " până jos · ↑ " + f(s) + " până sus" : p < jos ? "sub grid cu " + f(-j) : "peste grid cu " + f(-s) };
  }

  return { distanteGrid: distanteGrid, geometrieBot: geometrieBot, comparaCuFisa: comparaCuFisa, grileVsCosturi: grileVsCosturi, dacaInchizi: dacaInchizi, legaturaJurnal: legaturaJurnal,
    peZile: peZile, marjaNoua: marjaNoua, vsPozitie: vsPozitie, planStare: planStare, evenimente: evenimente };
})();
if (typeof globalThis !== "undefined") globalThis.TabloExtra = TabloExtra;
