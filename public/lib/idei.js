// Idei de cumparare (v90): actiunile care trec de poarta si botii candidati din clasament, cu istoricul LUI.
// Modul pur, probat in scripts/idei-v90.mjs. Un FILTRU care te tine departe de situatiile proaste, nu o predictie:
// pe cele 965 de trade-uri ale lui, "doar pe verde" ar fi adus mai putin decat a facut singur (+4.390 vs +6.416).
// De aceea ideile se si URMARESC (urmarire): dupa ~30 se poate spune cu cifre daca merita urmate.
var Idei = (function () {
  "use strict";
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var AS = typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale : globalThis.ActiuniSemnale;
  var ZI = 86400000, COST_CONV = 0.003;
  function stat(l) { var n = l.length, p = 0, t = 0; l.forEach(function (x) { t += x.rezultat || 0; if (x.rezultat > 0) p++; }); return { n: n, pePlus: p, total: t }; }
  function ziScurta(iso) { var x = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return x ? x[3] + "." + x[2] : "—"; }
  function P(x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; }

  // bare zilnice (GridCalcul.bare), pretul de acum; o: {rezultate: "YYYY-MM-DD"|null, acum}
  function judecaActiune(bare, pret, o) {
    o = o || {};
    var b = Array.isArray(bare) ? bare : [];
    if (b.length < 120 || !(pret > 0)) return { trece: false, scor: null, motive: ["prea puține zile de prețuri"] };
    var st = AS.stare(b, pret);
    // v100.222 (I-722): aceleași câmpuri ca biletul viu, doar când apelantul le are. Data necunoscută după căutare (rezultateStiut) ține numele afară.
    var po = { stare: st, plan: null, faraPlan: true };
    if (o.zileLipsa !== undefined) po.zileLipsa = o.zileLipsa;
    else if (o.simbol) po.zileLipsa = AS.zileLipsa(st.ultima, o.acum || Date.now(), o.simbol);
    if (o.regim) po.regim = o.regim;
    if (o.rezultateStiut === true) po.rezultateZile = o.rezultate ? Math.ceil((Date.parse(o.rezultate + "T12:00:00Z") - (o.acum || Date.now())) / ZI) : null;
    var v = AS.poarta(po);
    if (v.nivel !== "cumpara") return { trece: false, scor: null, motive: v.motive.length ? v.motive : ["poarta nu zice cumpăr"] };
    var n = AS.niveluri(b, pret, {});
    if (n.nivel !== "ok" || !n.intrare) return { trece: false, scor: null, motive: [n.motiv || n.intrareMotiv || "fără preț de intrare"] };
    if (n.proba.medie === null || n.proba.medie <= 0) return { trece: false, scor: null, motive: ["pe istoricul ei, în starea de acum, intrările n-au ieșit pe plus în medie"] };
    var z = o.rezultate ? Math.ceil((Date.parse(o.rezultate + "T12:00:00Z") - (o.acum || Date.now())) / ZI) : null;
    if (z !== null && z >= 0 && z <= 10) return { trece: false, scor: null, motive: ["își anunță rezultatele pe " + ziScurta(o.rezultate) + " (peste " + cate(z, "zi", "zile") + "): prețul poate sări"] };
    var intrare = n.intrare.pret;
    // v100.40 (audit 30.09): stopul ideii = stopul PROBAT (k×ATR, cel cu care proba a iesit pe plus si cu care Biletul socoteste
    // cate bucati), nu −15%: la COKE tabelul arata −15% si Biletul socotea pe −4,5% -> cine punea stopul din tabel risca 3% din
    // cont in loc de 1%. Acelasi stop ca pagina alerts si Discord („a ajuns la intrarea sugerată”).
    return { trece: true, scor: n.proba.medie, pret: pret, intrare: intrare, stop: n.stop, riscPct: intrare > 0 ? (intrare - n.stop) / intrare : null, tinta: n.tinta,
      pePlusProba: n.proba.pePlus, nProba: n.proba.n, rezultate: o.rezultate || null, sit: AS.cheieSituatie(st), prob: probIdee(b, intrare, n, o), prof: profIdee(b, intrare, n, o),
      motive: ["trend în sus pe zilnice (" + st.trend.tarie + ")", "fără mișcare mare, " + P(st.distMax7z) + " față de maximul pe 7 zile",
        "pe istoricul ei, intrările în starea asta: " + Math.round(n.proba.pePlus * 100) + "% pe plus, " + P(n.proba.medie) + " în medie (" + cate(n.proba.n, "zi", "zile") + ")"] };
  }
  // v100.55 (actiuni, pachetul 4): cat de des, pe actiunea asta in zile ca acum - tinta inaintea stopului in 5 zile, stopul atins maine
  // (si prin saritura la deschidere); avertizeaza, nu schimba filtrul. Fara o.Probabilitati -> null
  function probIdee(b, intrare, n, o) {
    var PB = o && o.Probabilitati; if (!PB || !(intrare > 0) || !(n.stop > 0)) return null;
    // revizia 01.10: o eroare aici nu strica ideea (si nici tura ideilor) - fara probabilitati, ca inainte
    var r; try { r = PB.pentruActiune(b, { pret: intrare, stop: n.stop, tinta: n.tinta, acum: o.acum || Date.now() }); } catch (e) { return null; } if (!r || !r.stop1) return null;
    var r3 = function (x) { return Math.round(x * 1000) / 1000; };
    return { tinta5: r.cursa5 && r.cursa5.tinta ? r3(r.cursa5.tinta.p) : null, stop1: r.sare1 ? r3(r.stop1.p + r.sare1.p) : r3(r.stop1.p) };
  }
  // v100.57 (el, 01.10): profilul actiunii pe idee - coborarea obisnuita pe 5 zile fata de stopul ideii si sariturile mari la deschidere;
  // avertizeaza, nu schimba filtrul. Fara o.ProfilMoneda sau la o eroare -> null
  function profIdee(b, intrare, n, o) {
    var PMo = o && o.ProfilMoneda; if (!PMo || !(intrare > 0) || !(n.stop > 0)) return null;
    try {
      var p = PMo.calculeaza(b, { piata: "actiuni", simbol: o.simbol || "", acum: o.acum || Date.now() }); if (!p) return null;
      var c = PMo.comparaStopActiune(p, (intrare - n.stop) / intrare), e = p.evenimente, r4 = function (x) { return Math.round(x * 10000) / 10000; };
      return c ? { dist: r4(c.dist), strans: c.strans, zile: p.zile, sar: e && e.n && e.mediana !== null ? { n: e.n, med: r4(e.mediana), max: r4(e.max) } : null } : null;
    } catch (x) { return null; }
  }
  // l: [{ticker, simbol?, r: judecaActiune(...)}]; inchise: T212.perechi().inchise (istoricul lui pe fiecare)
  function alegeActiuni(l, n, inchise) {
    var inch = Array.isArray(inchise) ? inchise : [];
    return (Array.isArray(l) ? l : []).filter(function (x) { return x && x.r && x.r.trece; })
      .sort(function (a, b) { return b.r.scor - a.r.scor; }).slice(0, n || 5)
      .map(function (x) { return Object.assign({ ticker: x.ticker, simbol: x.simbol || String(x.ticker).split("_")[0], istoric: stat(inch.filter(function (t) { return t.ticker === x.ticker; })) }, x.r); });
  }
  // clasamentul colectorului (istoric-bot?action=clasament) + botii lui inchisi (JurnalTrade.din)
  // v100.344 (16.11, el a ales „Costuri de acum” după audit): scorul e o trăsătură a monedei pe 83 de zile (aceeași listă zi de zi, și pe mers
  // aleator), iar ordinea primilor ~15 e la nivelul zgomotului ⇒ între candidați se ordonează după COSTURI cunoscute acum, nu după o predicție:
  // (1) volum ≥ 1 M USDT/zi; (2) net7 = 7 × scor − s × f7 × 0,5 (f7 = funding-ul pe 7 zile la rata din ultimele 7, s = +1 long / −1 short /
  // 0 neutru; un grid direcționat ține în medie ~jumătate din sumă în poziție); (3) cel mult 2 pe aceeași direcție (restul = același pariu).
  // Fără f7 (funding necitit) ordinea e doar după scor pentru moneda aceea, marcat fNecitit. Verdictul listei rămâne N-AM AFLAT.
  var PRAG_VOL_BOT = 1e6, EXPUNERE_FUNDING = 0.5, MAX_PE_DIR = 2;
  function net7(x) { var s = x.dir === "long" ? 1 : x.dir === "short" ? -1 : 0, f = x.f7 != null && isFinite(x.f7) ? Number(x.f7) : null; return 7 * (Number(x.scor) || 0) - (f == null ? 0 : s * f * EXPUNERE_FUNDING); }
  function ideiBotiInfo(cl, n) {
    var m = cl && Array.isArray(cl.monede) ? cl.monede : [], cand = m.filter(function (x) { return x && x.stare === "candidat"; });
    var lichizi = cand.filter(function (x) { return Number(x.volum) >= PRAG_VOL_BOT; }).map(function (x) { return Object.assign({}, x, { net7: net7(x), fNecitit: x.f7 === null || (x.f7 !== undefined && !isFinite(x.f7)), fNecerut: x.f7 === undefined }); })   // null = cererea a picat; lipsă = necerut (colectorul vechi)
      .sort(function (a, b) { return b.net7 - a.net7; });
    var pe = {}, lista = [], sarite = 0;
    for (var i = 0; i < lichizi.length && lista.length < (n || 5); i++) { var k = lichizi[i].dir || "neutru"; if ((pe[k] || 0) >= MAX_PE_DIR) { sarite++; continue; } pe[k] = (pe[k] || 0) + 1; lista.push(lichizi[i]); }
    return { lista: lista, toti: lichizi, subPrag: cand.length - lichizi.length,   /* v100.349: toti = toți lichizii, ordonați (pagina Grid) */ lichizi: lichizi.length, candidati: cand.length, sarite: sarite, prag: PRAG_VOL_BOT, maxPeDir: MAX_PE_DIR, expunere: EXPUNERE_FUNDING };
  }
  function ideiBoti(cl, trades, n) {
    var tr = Array.isArray(trades) ? trades : [];
    return ideiBotiInfo(cl, n).lista.map(function (x) { var mo = String(x.simbol || "").replace(/_USDT_PERP$/, "").replace(/_USDT$/, ""); return Object.assign({ moneda: mo, istoric: stat(tr.filter(function (t) { return t && t.moneda === mo; })) }, x); });
  }
  // v100.85 (reveniri + short, 03.10): din același clasament, cu istoricul LUI pe monedă (aceeași formă ca ideiBoti)
  function cuIstoric(tr) { return function (x) { var mo = String(x.simbol || "").replace(/_USDT_PERP$/, "").replace(/_USDT$/, ""); return Object.assign({ moneda: mo, istoric: stat(tr.filter(function (t) { return t && t.moneda === mo; })) }, x); }; }
  function reveniriBoti(cl, trades, n) {
    var m = cl && Array.isArray(cl.monede) ? cl.monede : [], tr = Array.isArray(trades) ? trades : [];
    return m.filter(function (x) { return x && x.revenire && x.revenire.revine === true; }).sort(function (a, b) { return (b.volum || 0) - (a.volum || 0); }).slice(0, n || 5).map(cuIstoric(tr));
  }
  function shortBoti(cl, trades, n) {
    var m = cl && Array.isArray(cl.monede) ? cl.monede : [], tr = Array.isArray(trades) ? trades : [];
    return m.filter(function (x) { return x && x.stare === "candidat" && x.dir === "short"; }).sort(function (a, b) { return (b.scor || 0) - (a.scor || 0); }).slice(0, n || 5).map(cuIstoric(tr));
  }
  // istoricul ideilor [{zi, ticker, pret}] + preturile de acum {ticker: pret}: cat au facut de la pretul ideii
  function urmarire(ist, preturi, acum) {
    var l = (Array.isArray(ist) ? ist : []).filter(function (x) { return x && x.pret > 0 && preturi && preturi[x.ticker] > 0 && (acum || Date.now()) - Date.parse(x.zi + "T12:00:00Z") >= 5 * ZI; });
    var r = l.map(function (x) { return preturi[x.ticker] / x.pret - 1 - COST_CONV; }), p = r.filter(function (v) { return v > 0; }).length, s = 0;
    r.forEach(function (v) { s += v; });
    var o = { n: r.length, pePlus: p, medie: r.length ? s / r.length : null };
    o.text = !o.n ? "Ideile se urmăresc de azi: după ~30 se poate spune dacă merită urmate." : "Din " + o.n + " idei de cel puțin 5 zile: " + p + " pe plus, " + P(o.medie) + " în medie de la prețul ideii, după comision" + (o.n < 30 ? " (puține — mai așteaptă)" : "") + ".";
    return o;
  }
  // v100.231: lista de la 8, pe datele deja scrise. Regimul blocat sau rezultatele în 0–10 zile scot numele.
  // Data lipsă sau necitibilă îl păstrează. Ordinea rămâne. Plafonul 45, primele 5 sus.
  function ideiInca(id, o) {
    o = o || {}; id = id || {};
    var acum = o.acum > 0 ? o.acum : Date.now(), blocat = false;
    if (o.regim && AS && AS.regimPoarta) { var rg = AS.regimPoarta(o.regim); blocat = !!(rg && rg.cod === "blocat"); }
    var tine = function (x) {
      if (!x || x.scos) return false;
      if (blocat) return false;
      var raw = x.rezultate ? String(x.rezultate) : "";
      var z = raw ? Math.ceil((Date.parse(raw.slice(0, 10) + "T12:00:00Z") - acum) / ZI) : null;
      if (z !== null && z >= 0 && z <= 10) return false;
      return true;
    };
    var l = [].concat(id.actiuni || [], id.restul || []).filter(tine).slice(0, 45);
    return { actiuni: l.slice(0, 5), restul: l.slice(5), trecute: l.length };
  }
  // v100.366 (el 19.11: „Ideile T212 cinstite”): urmărirea pe viu față de reperul din ACEEAȘI zi de bursă, pe un orizont fix. Socoteala veche (urmarire)
  // lua randamentul până azi, aceeași acțiune în fiecare zi și fără reper - pe 25.09–19.11 dădea „−22,7 %” fără să spună cât a scăzut piața.
  // ist = [{zi, ticker, simbol?, pret}]; bareDe(ticker) ⇒ bare închise [{t, c}]; univ = tickerele reperului (Nasdaq-100); o.h = zile de bursă (20).
  // Intrarea = ultima închidere ÎNAINTE de ziua ideii (ideea se face dimineața). Zilele = barele de intrare (ideile din weekend repetă vinerea:
  // aceeași acțiune pe aceeași bară se numără o dată). Fiecare zi = media ideilor ei − media reperului de la aceeași bară.
  function ziUtc(t) { return new Date(t).toISOString().slice(0, 10); }
  function urmarireZi(ist, bareDe, univ, o) {
    o = o || {}; var h = o.h > 0 ? o.h : 20, BL = 28 * ZI, cache = {}, peZi = {}, nume = {}, vazut = {}, judecate = 0, deLa = null, panaLa = null;
    var b = function (t) { if (!(t in cache)) { var v = null; try { v = bareDe(t); } catch (e) { v = null; } cache[t] = Array.isArray(v) ? v.filter(function (x) { return x && x.c > 0 && x.t > 0; }) : []; } return cache[t]; };
    var inainte = function (l, zi) { var k = -1; for (var i = 0; i < l.length; i++) { if (ziUtc(l[i].t) < zi) k = i; else break; } return k; };
    var pana = function (l, zi) { var k = -1; for (var i = 0; i < l.length; i++) { if (ziUtc(l[i].t) <= zi) k = i; else break; } return k; };
    (Array.isArray(ist) ? ist : []).forEach(function (x) {
      if (!x || !x.ticker || !/^\d{4}-\d{2}-\d{2}$/.test(x.zi)) return; var l = b(x.ticker), i = inainte(l, x.zi); if (i < 0 || i + h >= l.length) return;
      var cheie = ziUtc(l[i].t), id = x.ticker + "|" + cheie; if (vazut[id]) return; vazut[id] = 1;
      (peZi[cheie] = peZi[cheie] || []).push(l[i + h].c / l[i].c - 1); judecate++; var s = x.simbol || String(x.ticker).split("_")[0]; nume[s] = (nume[s] || 0) + 1;
      if (!deLa || x.zi < deLa) deLa = x.zi; if (!panaLa || x.zi > panaLa) panaLa = x.zi;
    });
    var zile = [];
    Object.keys(peZi).sort().forEach(function (zi) {
      var u = []; (Array.isArray(univ) ? univ : []).forEach(function (t) { var l = b(t), i = pana(l, zi); if (i >= 0 && ziUtc(l[i].t) === zi && i + h < l.length) u.push(l[i + h].c / l[i].c - 1); });
      if (u.length < 30) return; var mi = 0, mu = 0; peZi[zi].forEach(function (v) { mi += v; }); u.forEach(function (v) { mu += v; }); mi /= peZi[zi].length; mu /= u.length;
      zile.push({ t: Date.parse(zi + "T00:00:00Z"), zi: zi, dif: mi - mu, idei: mi, univ: mu, n: peZi[zi].length });
    });
    var top = Object.keys(nume).map(function (s) { return { s: s, n: nume[s] }; }).sort(function (a, c) { return c.n - a.n || (a.s < c.s ? -1 : 1); }).slice(0, 8);
    var r = { h: h, zile: zile.length, judecate: judecate, medie: null, lo: null, hi: null, blocuri: 0, verdict: "fara-date", pePlus: null, ideiMedie: null, univMedie: null,
      deLa: zile.length ? deLa : null, panaLa: zile.length ? panaLa : null, serie: zile.map(function (z) { return { t: z.t, dif: z.dif, n: z.n }; }), top: top };
    if (!zile.length) { r.text = textUrmarireZi(r); return r; }
    var bl = {}, s = 0, si = 0, su = 0, pe = 0; zile.forEach(function (z) { var k = Math.floor(z.t / BL); (bl[k] = bl[k] || { s: 0, n: 0 }); bl[k].s += z.dif; bl[k].n++; s += z.dif; si += z.idei; su += z.univ; if (z.dif > 0) pe++; });
    var n = zile.length, m = s / n, K = Object.keys(bl), G = K.length, ss = 0; K.forEach(function (k) { ss += Math.pow(bl[k].s - m * bl[k].n, 2); });
    var T95 = [null, 12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13, 2.12, 2.11, 2.10, 2.09, 2.09], tc = G - 1 <= 20 ? T95[G - 1] : 1.98;
    var se = G > 1 ? Math.sqrt(ss * G / (G - 1)) / n : null;
    r.medie = m; r.ideiMedie = si / n; r.univMedie = su / n; r.pePlus = pe / n; r.blocuri = G; r.lo = se !== null ? m - tc * se : null; r.hi = se !== null ? m + tc * se : null;
    r.verdict = G < 4 ? "un-episod" : r.lo > 0 ? "peste" : r.hi < 0 ? "sub" : "n-am-aflat";
    r.text = textUrmarireZi(r); return r;
  }
  function pct1(v) { return (v > 0.00049 ? "+" : v < -0.00049 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + " %"; }
  function textUrmarireZi(u) {
    if (!u || !u.zile) return "Ideile se urmăresc față de Nasdaq-100 din aceeași zi, la " + ((u && u.h) || 20) + " de zile de bursă: prima judecată după ce trec cele " + ((u && u.h) || 20) + " de zile.";
    var d = u.deLa.slice(8, 10) + "." + u.deLa.slice(5, 7);
    return "Pe viu, din " + d + ", la " + u.h + " de zile de bursă: ideile " + pct1(u.ideiMedie) + ", Nasdaq-100 " + pct1(u.univMedie) + " în aceleași zile ⇒ " + pct1(u.medie) + " față de piață"
      + (u.lo != null ? " (" + pct1(u.lo) + " … " + pct1(u.hi) + ")" : "") + "; în " + Math.round(u.pePlus * u.zile) + " din " + cate(u.zile, "zi de bursă", "zile de bursă") + " ideile au bătut piața. "
      + (u.verdict === "un-episod" ? "Am abia " + cate(u.blocuri, "bloc", "blocuri") + " de 4 săptămâni: un singur episod, nu e dovedit, dar " + (u.medie < 0 ? "pierderea e reală." : "nici câștigul nu e sigur.") : u.verdict === "sub" ? "Mai slab decât piața, dovedit pe viu." : u.verdict === "peste" ? "Mai bine decât piața, dovedit pe viu." : "N-am aflat încă.");
  }
  return { judecaActiune: judecaActiune, alegeActiuni: alegeActiuni, ideiBoti: ideiBoti, ideiBotiInfo: ideiBotiInfo, PRAG_VOL_BOT: PRAG_VOL_BOT, cuIstoric: cuIstoric, reveniriBoti: reveniriBoti, shortBoti: shortBoti, urmarire: urmarire, ideiInca: ideiInca, urmarireZi: urmarireZi, textUrmarireZi: textUrmarireZi };
})();
if (typeof globalThis !== "undefined") globalThis.Idei = Idei;
