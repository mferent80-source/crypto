// v100.134 (el 07.10: „vreau să pun valori din grid ca la TradingView și să calculeze el probabilitățile de câștig” → spec
// docs/superpowers/specs/2026-10-07-simulator-grid-design.md): motorul paginii „Simulator grid”. Modul PUR (fără DOM, fără rețea).
// (1) codul pentru GRID-FISA dus-întors (dinCod / inCod) și setările din botul Pionex (setariDinBot); (2) simuleaza: pe fiecare drum
// (14 zile de bare de 15 minute lipite din zile reale, fără tendința perioadei - ca în Monte Carlo) botul rulează O SINGURĂ dată
// (GridProba.simuleaza cu traseu), iar traseul se citește la 1 / 3 / 7 / 14 zile: câștigă / pierde, planul lui (+X înainte de −Y),
// lichidare, stop, TP, ieșit din grid, grile, pierderea maximă pe drum, funding; botul care RULEAZĂ e reluat pe barele reale de la
// pornire, apoi continuă pe drumuri (prefix + viitor, aceeași simulare); (3) verdict: textele, cu regulile fixate dinainte (§3 din spec).
// Se încarcă DUPĂ grid-calcul.js, grid-proba.js, monte-simbol.js.
var GridSim = (function () {
  "use strict";
  var G = GridCalcul, GP = GridProba, M = MonteSimbol, BZ = 96;
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(typeof v === "string" ? v.replace(",", ".") : v); return isFinite(x) ? x : null; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function pc(v, p) { return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : null; }
  function nrRo(v, z) { return Number(v).toLocaleString("ro-RO", { minimumFractionDigits: z, maximumFractionDigits: z }); }
  function semn(v) { return v > 0 ? "+" : v < 0 ? "−" : ""; }
  function bani1(v) { return v == null || !isFinite(v) ? "—" : semn(Math.round(v * 10) / 10) + nrRo(Math.abs(v), 1) + " USDT"; }   // rezultatele: o zecimală
  function semn1(v) { return v == null || !isFinite(v) ? "—" : semn(Math.round(v * 10) / 10) + nrRo(Math.abs(v), 1); }
  function pr(v) { return v == null || !isFinite(v) ? "—" : Math.round(v * 100) + "%"; }
  // fără exponent la monedele foarte ieftine: 6 cifre semnificative scrise întreg (ca în codTVBot)
  function f6(v) { v = nr(v); if (v === null || !(v > 0)) return "0"; var s = String(Number(v.toPrecision(6))); return /e/i.test(s) ? Number(v.toPrecision(6)).toFixed(Math.min(20, 5 - Math.floor(Math.log10(v)))).replace(/\.?0+$/, "") : s; }

  // ---------------- (1) codul GRID-FISA ----------------
  var NUME = ["direcția", "jos", "sus", "linii", "levier", "stopJos", "stopSus", "lichJos", "lichSus", "suma", "tip", "planMinus", "planPlus", "planAfaraOre", "verdict", "generatLa", "margJos", "margSus", "pornitLa", "tpAprox"];
  function tipDin(t) { t = String(t || "").trim().toLowerCase(); return /^(aritmetic|arit|arithmetic)$/.test(t) ? "aritmetic" : /^(geometric|geo)$/.test(t) ? "geometric" : null; }
  // rândul copiat din Tablou / fișa Grid (9–20 câmpuri, aceeași ordine ca TabloExtra.codTVBot) ⇒ setările; stopul / TP-ul după ROL, ca în Pine:
  // long: câmpul 6 = stop, 7 = TP; short: 7 = stop (TP-ul nu e în cod); neutru: cel scris = stop, pe partea lui. Liniile sunt ca în Pionex ⇒ intervale = linii − 1
  function dinCod(text) {
    var t = String(text == null ? "" : text).trim(), out = { st: null, plan: null, lich: null, pornitLa: null, tpAprox: false, eroare: null };
    if (!t) { out.eroare = "Codul e gol: lipește rândul copiat din Tablou („Copiază codul”) sau din fișa Grid („Pentru TradingView”)."; return out; }
    var p = t.split(";").map(function (s) { return s.trim(); }), nc = p.length;
    if (nc < 9 || nc > 20) { out.eroare = "Codul trebuie să aibă între 9 și 20 de câmpuri despărțite prin „;” — are " + nc + "."; return out; }
    var dir = p[0].toLowerCase();
    if (dir !== "long" && dir !== "short" && dir !== "neutru") { out.eroare = "Direcția din cod trebuie să fie long / short / neutru — e „" + p[0] + "”."; return out; }
    var num = [];
    for (var i = 1; i <= 9 && i < nc; i++) { var v = p[i] === "" ? 0 : Number(p[i]); if (!isFinite(v)) { out.eroare = "Câmpul " + (i + 1) + " (" + NUME[i] + ") nu e un număr: „" + p[i] + "”."; return out; } num[i] = v; }
    var jos = num[1], sus = num[2], linii = num[3], lev = num[4], sj = num[5], ss = num[6], lj = num[7], ls = num[8], suma = nc >= 10 ? num[9] : 0;
    if (!(jos > 0) || !(sus > jos)) { out.eroare = "Sus trebuie să fie peste jos (jos „" + p[1] + "”, sus „" + p[2] + "”)."; return out; }
    if (linii < 3 || linii > 151) { out.eroare = "Numărul liniilor trebuie să fie între 3 și 151 (ca în Pionex) — e " + p[3] + "."; return out; }
    var stop = null, tp = null;
    if (dir === "long") { if (sj > 0) stop = { jos: sj }; if (ss > 0) tp = ss; }
    else if (dir === "short") { if (ss > 0) stop = { sus: ss }; }
    else { if (sj > 0) stop = { jos: sj }; else if (ss > 0) stop = { sus: ss }; }
    out.st = { jos: jos, sus: sus, grile: Math.round(linii) - 1, levier: Math.max(1, Math.round(lev)), dir: dir, suma: suma > 0 ? suma : null, stop: stop, tp: tp, tip: nc >= 11 ? tipDin(p[10]) : null };
    out.lich = { jos: lj > 0 ? lj : null, sus: ls > 0 ? ls : null };
    if (nc >= 14) { var pm = Math.abs(Number(p[11]) || 0), pp = Number(p[12]) || 0, oa = Number(p[13]) || 0; if (pm > 0 || pp > 0 || oa > 0) out.plan = { minus: pm, plus: pp, afaraOre: oa }; }
    if (nc >= 19) { var pz = Number(p[18]); out.pornitLa = pz > 0 ? pz : null; }
    if (nc >= 20) out.tpAprox = p[19] === "1";
    return out;
  }
  // setările ⇒ rândul pentru GRID-FISA (10 câmpuri; + tip; + planul, 14) - restul (verdict, generatLa, margini, pornirea) le dă Tabloul
  function inCod(st, plan) {
    var lg = st.dir === "long", sj = st.stop && st.stop.jos > 0 ? st.stop.jos : 0, ss = st.stop && st.stop.sus > 0 ? st.stop.sus : 0;
    if (lg && st.tp > 0) ss = st.tp;
    var parti = [st.dir, f6(st.jos), f6(st.sus), String(Math.round(st.grile) + 1), String(Math.max(1, Math.round(st.levier))), f6(sj), f6(ss), "0", "0", st.suma > 0 ? String(Math.round(st.suma * 100) / 100) : "0"];
    var pl = plan && (plan.minus > 0 || plan.plus > 0 || plan.afaraOre > 0) ? plan : null;
    if (st.tip || pl) parti.push(st.tip || "");
    if (pl) parti.push(String(Math.abs(nr(pl.minus) || 0)), String(nr(pl.plus) || 0), String(nr(pl.afaraOre) || 0));
    return parti.join(";");
  }
  // din botul Pionex (aceeași citire ca mcsSetariBot: Pionex numără LINIILE ⇒ intervale = row − 1; stopul pe partea direcției; TP la long / short)
  function setariDinBot(b) {
    var d = String(b && b.directie || "").toLowerCase(), dir = d === "long" || d === "short" ? d : "neutru", bu = b && b.brut && b.brut.buOrderData || {};
    var row = Number(bu.row), stop = b.opritorPierdereActiv && Number(b.opritorPierdere) > 0 ? (dir === "short" ? { sus: Number(b.opritorPierdere) } : { jos: Number(b.opritorPierdere) }) : null;
    var tp = dir !== "neutru" && b.opritorProfitActiv && Number(b.opritorProfit) > 0 ? Number(b.opritorProfit) : null;
    return { st: { jos: Number(b.gridJos), sus: Number(b.gridSus), grile: row > 1 ? Math.round(row) - 1 : 20, levier: Number(b.levier) || 1, dir: dir, suma: Number(b.investit) > 0 ? Number(b.investit) : null, stop: stop, tp: tp, tip: tipDin(bu.gridType) },
      pornitLa: Number(b.pornitLa) > 0 ? Number(b.pornitLa) : null, tpAprox: !!(tp && b.opritorProfitTip === "raport") };
  }
  // TP-ul de partea greșită a prețului (long sub, short peste) s-ar atinge pe prima bară: nu intră (aceeași regulă ca mcsTpValid)
  function tpValid(st, P) { if (!(st.tp > 0) || (st.dir === "long" && st.tp > P) || (st.dir === "short" && st.tp < P)) return { st: st, ignorat: null }; var x = {}; for (var k in st) x[k] = st[k]; x.tp = null; return { st: x, ignorat: st.dir === "neutru" ? null : st.tp }; }

  // ---------------- (2) simularea ----------------
  function tendinta(b) { var s = 0, n = 0; for (var i = 1; i < b.length; i++) if (b[i].c > 0 && b[i - 1].c > 0) { s += Math.log(b[i].c / b[i - 1].c); n++; } return n ? s / n : 0; }
  function marja(p, n) { return !(n > 0) || !(p > 0) || !(p < 1) ? 0 : Math.round(1.96 * Math.sqrt(p * (1 - p) / n) * 100); }
  function mediana(v) { if (!v.length) return null; var s = v.slice().sort(function (a, b) { return a - b; }); return pc(s, 0.5); }
  // o = { zile (14), orizonturi ([1,3,7,14]), n (500), seed (12), plan: { minus, plus } | null, pornitLa: ms | null }
  function simuleaza(b15, st, o) {
    o = o || {}; var zile = o.zile > 0 ? o.zile : 14, oriz = Array.isArray(o.orizonturi) && o.orizonturi.length ? o.orizonturi : [1, 3, 7, 14], n = o.n > 0 ? o.n : 500, seed = o.seed || 12;
    var plan = o.plan && (nr(o.plan.minus) > 0 || nr(o.plan.plus) > 0) ? { minus: Math.abs(nr(o.plan.minus) || 0), plus: nr(o.plan.plus) || 0 } : null;
    if (!Array.isArray(b15) || b15.length < 7 * BZ) return { eroare: "Prea puțin istoric ca să simulez: " + cate(Math.floor((b15 ? b15.length : 0) / BZ), "zi", "zile") + " pe 15 minute; îmi trebuie cel puțin 7." };
    var suma = st.suma > 0 ? st.suma : 50, H = zile * BZ, zileIst = Math.floor(b15.length / BZ);
    // botul care rulează: prefixul = barele reale de la prima bară de după pornire; botul pornește la deschiderea ei (ca GridPlan.dePornire)
    var s = -1;
    if (o.pornitLa > 0) { for (var i = 0; i < b15.length; i++) if (b15[i].t >= o.pornitLa) { s = i; break; } if (s < 0 || s >= b15.length - 1) return { eroare: "Botul e pornit după ultima bară pe care o am (sau în ea): n-am ce relua încă." }; }
    var prefix = s >= 0 ? b15.slice(s) : [], pre = prefix.length, P0 = b15[b15.length - 1].c;
    var v = tpValid(st, P0), stS = {}; for (var k in v.st) stS[k] = v.st[k];
    var opr = stS.stop ? { jos: stS.stop.jos, sus: stS.stop.sus } : null, parteTp = stS.tp > 0 ? (stS.dir === "long" ? "sus" : stS.dir === "short" ? "jos" : null) : null;
    if (parteTp) { opr = opr || {}; opr[parteTp] = stS.tp; }
    stS.stop = opr;
    // fără tendința perioadei: mijlocul log al capătului drumurilor la zero (ca MonteSimbol.grid)
    var mu = tendinta(b15), m;
    { var rnd0 = M.generator(seed), v0 = []; for (var q = 0; q < n; q++) { var d0 = M.drum(b15, H, BZ, P0, rnd0, mu); v0.push(Math.log(d0[d0.length - 1].c / P0)); } v0.sort(function (a, c) { return a - c; }); m = mu + pc(v0, 0.5) / H; }
    var rnd = M.generator(seed), bareO = oriz.map(function (z) { return pre + z * BZ; });
    var col = oriz.map(function () { return { net: [], deAici: [], plan: 0, planRau: 0, planZile: [], lich: 0, stop: 0, tp: 0, ies: 0, per: 0, maxJos: [], funding: 0 }; });
    var acum = null, dejaAtins = null;
    for (var sIdx = 0; sIdx < n; sIdx++) {
      var d = M.drum(b15, H, BZ, P0, rnd, m), drumT = pre ? prefix.concat(d) : d;
      var r = GP.simuleaza(drumT, 0, drumT.length, stS, { traseu: true }), tr = r.traseu, L = tr.net.length;
      if (pre && !acum) { var ia = Math.min(pre, L) - 1; acum = { net: tr.net[ia], usdt: tr.net[ia] * suma, bare: pre, t: prefix[prefix.length - 1].t, perechi: tr.perechi[ia], oprit: L < pre ? (r.lichidat ? "lichidat" : "oprit") : null }; }
      var iPlus = null, iMinus = null;
      if (plan) for (var j = 0; j < L && (iPlus === null || iMinus === null); j++) { var u = tr.net[j] * suma; if (iPlus === null && plan.plus > 0 && u >= plan.plus) iPlus = j; if (iMinus === null && plan.minus > 0 && u <= -plan.minus) iMinus = j; }
      if (plan && pre && dejaAtins === null) { if (iPlus !== null && iPlus < pre && (iMinus === null || iPlus < iMinus)) dejaAtins = "plus"; else if (iMinus !== null && iMinus < pre && (iPlus === null || iMinus < iPlus)) dejaAtins = "minus"; }
      for (var h = 0; h < oriz.length; h++) {
        var bare = bareO[h], ix = Math.min(bare, L) - 1, c = col[h], net = tr.net[ix];
        c.net.push(net); if (acum) c.deAici.push(net - acum.net);
        if (plan) { var hit = iPlus !== null && iPlus < bare && (iMinus === null || iPlus < iMinus), rau = iMinus !== null && iMinus < bare && (iPlus === null || iMinus < iPlus); if (hit) { c.plan++; c.planZile.push((iPlus - pre + 1) / BZ); } if (rau) c.planRau++; }
        if (r.lichidat && r.bare <= bare) c.lich++;
        if (r.oprit && r.bare <= bare) { if (parteTp && r.iesit === parteTp) c.tp++; else c.stop++; }
        if (tr.iesiri[ix] > 0) c.ies++;
        c.per += tr.perechi[ix];
        var mj = Infinity; for (var w = 0; w <= ix; w++) if (tr.net[w] < mj) mj = tr.net[w]; c.maxJos.push(mj);
        c.funding += r.funding * (ix + 1) / L;
      }
    }
    var orizonturi = oriz.map(function (z, h) {
      var c = col[h], nets = c.net.map(function (x) { return x * suma; }).sort(function (a, b) { return a - b; }), cast = 0, pier = 0;
      c.net.forEach(function (x) { if (x > 0) cast++; else if (x < 0) pier++; });
      var mjs = c.maxJos.map(function (x) { return x * suma; }).sort(function (a, b) { return a - b; }), pC = cast / n, out = {
        zile: z, bare: bareO[h], scurt: zileIst < 3 * z, pCastig: pC, pPierde: pier / n, pZero: (n - cast - pier) / n, marja: marja(pC, n),
        p5: pc(nets, 0.05), p50: pc(nets, 0.5), p95: pc(nets, 0.95), hist: M.histograma(nets, 24),
        plan: plan ? { p: c.plan / n, pRau: c.planRau / n, zileMediana: c.planZile.length ? mediana(c.planZile) : null, dejaAtins: dejaAtins } : null,
        pLich: c.lich / n, pStop: c.stop / n, pTp: c.tp / n, pIesire: c.ies / n, perechi: c.per / n, maxJos: { p50: pc(mjs, 0.5), p5: pc(mjs, 0.05) }, funding: c.funding / n * suma };
      if (acum) { var da = c.deAici.map(function (x) { return x * suma; }).sort(function (a, b) { return a - b; }), dc = c.deAici.filter(function (x) { return x > 0; }).length; out.deAici = { p5: pc(da, 0.05), p50: pc(da, 0.5), p95: pc(da, 0.95), pCastig: dc / n }; }
      return out;
    });
    return { n: n, zile: zile, zileIstoric: zileIst, tendintaPeZi: Math.exp(mu * BZ) - 1, suma: suma, tpIgnorat: v.ignorat, acum: acum, orizonturi: orizonturi };
  }

  // ---------------- (3) verdictul ----------------
  // regulile, fixate ÎNAINTE de cifre (spec §3), în ordinea asta; bot = botul Pionex (profitNet) la „Botul meu”
  function verdict(rez, st, plan, oriz, bot) {
    var o = rez && rez.orizonturi && rez.orizonturi[oriz >= 0 ? oriz : 0]; if (!o) return null;
    var P = Math.round(o.pCastig * 100), Q = Math.round(o.pPierde * 100), Z = Math.round(o.pZero * 100), pl = plan && (plan.minus > 0 || plan.plus > 0) ? plan : null;
    var rand = "CÂȘTIGĂ în " + P + "% din drumuri · PIERDE în " + Q + "%" + (o.pZero >= 0.005 ? " · pe zero " + Z + "%" : "");
    var sub = "de obicei " + bani1(o.p50) + " · cele mai proaste 5%: " + bani1(o.p5) + " · cele mai bune 5%: " + bani1(o.p95);
    var zi = cate(o.zile, "zi", "zile"), faCe;
    if (o.pLich > 0.02) faCe = "N-aș porni așa: lichidare în " + pr(o.pLich) + " din drumuri. Levier mai mic sau grid mai strâns de partea pierderii.";
    else if (pl && pl.minus > 0 && o.p5 < -pl.minus) faCe = "Nu se potrivește cu planul tău: în cele mai proaste 5% pierzi " + nrRo(Math.abs(o.p5), 1) + " USDT, planul tău zice −" + nrRo(pl.minus, 1) + ". Mută stopul la planul tău sau micșorează suma.";
    else if (o.pStop > 0.5) faCe = "Stopul e în zgomot: atins în " + pr(o.pStop) + " din drumuri în " + zi + ". Mai departe sau fără (dacă lichidarea e 0%).";
    else if (P >= 55 && o.p50 > 0) faCe = "Aș porni: câștigă în " + P + "% din drumuri, de obicei " + bani1(o.p50) + (pl && o.plan && pl.plus > 0 && pl.minus > 0 ? "; planul +" + nrRo(pl.plus, 1) + " vine înainte de −" + nrRo(pl.minus, 1) + " în " + pr(o.plan.p) : "") + ".";
    else if (P <= 45) faCe = "N-aș porni: pierde în " + Q + "% din drumuri (de obicei " + bani1(o.p50) + "). Pe drumurile fără tendință, setarea asta pierde din comisioane și din poziția rămasă.";
    else faCe = "O aruncare de ban: " + P + "% câștigă, " + Q + "% pierde. Gridul câștigă din grile, nu din direcție; dacă vrei totuși, suma mică.";
    if (rez.acum) {
      var pn = bot && nr(bot.profitNet), da = o.deAici;
      faCe += " De la pornire, botul tău are " + (pn !== null && pn !== undefined ? semn1(pn) + " USDT (Pionex), " + semn1(rez.acum.usdt) + " estimat" : semn1(rez.acum.usdt) + " USDT estimat")
        + (da ? "; de aici încolo, în " + zi + ": câștigă în " + pr(da.pCastig) + ", de obicei " + bani1(da.p50) : "") + ".";
      if (o.plan && o.plan.dejaAtins) faCe += " Dar planul tău e deja atins (" + (o.plan.dejaAtins === "plus" ? "+" + nrRo(pl.plus, 1) + "): încasează" : "−" + nrRo(pl.minus, 1) + "): ieși") + ", cum ți-ai propus.";
    }
    return { rand: rand, marja: "±" + o.marja + " puncte", culoare: P >= 55 ? "good" : P <= 45 ? "bad" : "mijl", sub: sub, faCe: faCe,
      nota: "Pe istoria monedei reluată, fără tendința perioadei; o criză mai rea decât orice a avut nu apare în drumuri. Umplerile sunt estimate pe bare, nu pe ordinele reale." };
  }
  return { dinCod: dinCod, inCod: inCod, setariDinBot: setariDinBot, tpValid: tpValid, simuleaza: simuleaza, verdict: verdict, marja: marja, bani1: bani1, pr: pr, NUME: NUME };
})();
if (typeof globalThis !== "undefined") globalThis.GridSim = GridSim;
