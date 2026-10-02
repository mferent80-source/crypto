// Semnalele pentru ACTIUNI (Trading 212, doar long) - v85. Modul pur, probat in scripts/actiuni-v85.mjs.
// Aceleasi idei ca la crypto, pe bare ZILNICE (GridCalcul.bare: t,o,h,l,c crescator, fara bara in formare):
//   stare(bare, pretAcum)       -> trend (EMA20/50 + panta + EMA200), miscare mare, maxim 52 sapt / 7 zile
//   semafor(pozitie, stare)     -> tine / atentie / iesi / fara-date, cu motive si "👉 Ce as face eu"
//   greseli(trade, ctx)         -> greselile automate ale unui trade inchis (T212.perechi().inchise)
//   rezumatJurnal(trades, ctx)  -> cifrele jurnalului + greselile cu costul lor
//   poarta({stare, plan, ...})  -> cumpara / asteapta / nu / fara-date
//   portofoliu(pozitii, cash)   -> ponderi, cea mai mare, socul Nasdaq -10%
//   beta(bare, bareQqq)         -> beta din randamentele zilnice pe zilele comune (null sub 60)
// Nu e predictie: spune unde e pretul si ce ai spus TU ca faci (planul). Lipsa ramane lipsa, nu 0.
var ActiuniSemnale = (function () {
  "use strict";
  var G = typeof GridCalcul !== "undefined" ? GridCalcul : globalThis.GridCalcul;
  var ZI = 86400000, ZILE_52 = 252, ZILE_7 = 5, PRAG_MISCARE = 1.5;
  function P(x, z) { return x === null || x === undefined || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(z === undefined ? 1 : z).replace(".", ",") + "%"; }
  function L(x) { return x === null || x === undefined || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(Math.round(x)).toLocaleString("ro-RO") + " lei"; }
  // v100.69 (sfaturile concise, pachetul 4): pretul unei actiuni, o singura forma (si pagina T212 o foloseste, prin t212Usd) - „$29.50”,
  // „$4.12”, „$0.0123”. Inainte: „$33,00” (consilier), „29.50 $” (Consilierul pozitiei), „26.00” (alerte), „$4.120” (pagina) - a treia
  // zecimala nu se poate cota peste 1 $ si, langa „2.100 lei” (punctul = mii), „$4.900” se citea ca patru mii noua sute
  function usd(v) { return v === null || v === undefined || !isFinite(v) ? "—" : "$" + (v >= 1 ? v.toFixed(2) : v.toPrecision(3)); }
  function vg(x) { return String(x).replace(".", ","); }   // un prag scris de el (12.5 -> „12,5”)
  function maxH(b, k) { var m = -Infinity; for (var i = Math.max(0, b.length - k); i < b.length; i++) m = Math.max(m, b[i].h); return isFinite(m) ? m : null; }
  function minL(b, k) { var m = Infinity; for (var i = Math.max(0, b.length - k); i < b.length; i++) m = Math.min(m, b[i].l); return isFinite(m) ? m : null; }

  function trend(b) {
    if (b.length < 60) return { dir: "fara-date", tarie: "fara-date", scor: null, motive: ["prea puține zile de prețuri ca să judec trendul (" + b.length + " din 60)"] };
    var c = [], amp = [];
    for (var i = 0; i < b.length; i++) { c.push(b[i].c); amp.push(b[i].h - b[i].l); }
    var e20 = G.ema(c, 20), e50 = G.ema(c, 50), n = c.length - 1, s = 0, prag = (G.mediana(amp) || 0) * 0.25, panta = e50[n] - e50[n - 5], motive = [];
    if (e20[n] - e50[n] > prag) s++; else if (e50[n] - e20[n] > prag) s--;
    if (panta > prag) s++; else if (-panta > prag) s--;
    motive.push("EMA20 " + (e20[n] > e50[n] ? "peste" : "sub") + " EMA50, EMA50 " + (panta > prag ? "urcă" : -panta > prag ? "coboară" : "plată"));
    if (c.length >= 200) { var e200 = G.ema(c, 200)[n]; if (c[n] > e200) s++; else s--; motive.push("prețul " + (c[n] > e200 ? "peste" : "sub") + " media pe 200 de zile"); }
    var a = Math.abs(s);
    return { dir: s >= 2 ? "sus" : s <= -2 ? "jos" : "lateral", tarie: a >= 3 ? "tare" : a >= 2 ? "mediu" : "slab", scor: s, motive: motive };
  }

  function stare(bare, pretAcum) {
    var b = Array.isArray(bare) ? bare : [], n = b.length;
    var pret = pretAcum > 0 ? pretAcum : n ? b[n - 1].c : null;
    var r = n ? G.regimPeBare(b, 1, 5) : null, miscare = null;
    if (r) {
      var k = r.r4h !== null && r.r4h > PRAG_MISCARE ? 1 : 5, ref = b[n - 1 - k];
      miscare = { r1z: r.r4h, r5z: r.r24h, mare: !!r.miscare, sens: ref ? (b[n - 1].c >= ref.c ? "sus" : "jos") : null };
    }
    var max52 = n ? maxH(b, ZILE_52) : null, max7z = n ? maxH(b, ZILE_7) : null, min52 = n ? minL(b, ZILE_52) : null;
    return { pret: pret, trend: trend(b), miscare: miscare, max52: max52, min52: min52, max7z: max7z,
      distMax52: max52 && pret ? pret / max52 - 1 : null, distMax7z: max7z && pret ? pret / max7z - 1 : null,
      ultima: n ? b[n - 1].t : null, zile: n };
  }

  // pozitie: {simbol, qty, pretMediu, pret, plan:{tinta, stop, trailPct}, maxDupaCumparare}
  function semafor(p, st) {
    var s = p && p.simbol || "acțiunea";
    // v100.69 (pachetul 4): „Ce aș face eu” = o actiune la persoana I dupa eticheta (eticheta o taie consiliu.js si lista „Ce ai de făcut”)
    if (!p || !(p.pret > 0) || !(p.pretMediu > 0)) return { nivel: "fara-date", motive: ["lipsește prețul poziției"], ceAsFace: "👉 Ce aș face eu: Aș reîncărca pozițiile; fără preț nu pot judeca." };
    var pct = p.pret / p.pretMediu - 1, plan = p.plan || {}, iesi = [], atentie = [], bine = [], comp = [];
    // v100.54 (actiunile T212, pachetul 3): fiecare motiv si cu codul lui - pentru Consilierul pozitiei (aditiv; motive/ceAsFace raman)
    var ad = function (lista, cod, nivel, motiv) { lista.push(motiv); comp.push({ cod: cod, nivel: nivel, motiv: motiv }); };
    if (plan.stop > 0 && p.pret <= plan.stop) ad(iesi, "stop-plan", "iesi", "prețul a atins stopul din planul tău (" + usd(plan.stop) + ")");
    var ref = p.maxDupaCumparare > 0 ? p.maxDupaCumparare : st && st.max7z > 0 ? Math.max(st.max7z, p.pret) : null;
    if (plan.trailPct > 0 && ref && p.pret <= ref * (1 - plan.trailPct / 100)) ad(iesi, "trail-plan", "iesi", P(p.pret / ref - 1) + " de la maxim: pragul de −" + vg(plan.trailPct) + "% din planul tău e atins");
    if (plan.tinta > 0 && p.pret >= plan.tinta) ad(atentie, "tinta-plan", "atentie", "ținta din plan e atinsă (" + usd(plan.tinta) + ")");
    var areDate = st && st.trend && st.trend.dir !== "fara-date";
    if (!areDate && !iesi.length && !atentie.length) return { nivel: "fara-date", pct: pct, motive: ["n-am prețuri zilnice pentru " + s], ceAsFace: "👉 Ce aș face eu: Aș judeca după planul tău, nu după culoare: fără prețuri zilnice n-am semnal." };
    if (areDate) {
      if (st.trend.dir === "jos" && pct < -0.10) ad(iesi, "trend-jos-minus", "iesi", "trend în jos, iar poziția e pe " + P(pct));
      else if (st.trend.dir === "jos") ad(atentie, "trend-jos", "atentie", "trendul pe zilnice e în jos (" + st.trend.motive[0] + ")");
      else if (st.trend.dir === "sus") ad(bine, "trend-sus", "bine", "trend în sus pe zilnice");
      if (st.miscare && st.miscare.mare && st.miscare.sens === "jos") ad(atentie, "miscare-jos", "atentie", "mișcare mare în jos, peste cea obișnuită");
    }
    var arePlan = plan.stop > 0 || plan.trailPct > 0 || plan.tinta > 0;
    if (pct <= -0.20 && !arePlan) ad(atentie, "fara-plan-minus", "atentie", "poziția e pe " + P(pct) + " fără plan scris");
    var nivel = iesi.length ? "iesi" : atentie.length ? "atentie" : "tine", sfat;
    // "ce am scris" doar cand PLANUL a cerut iesirea (stop / -X% atins), nu cand iesirea vine din trend
    var planAtins = (plan.stop > 0 && p.pret <= plan.stop) || (plan.trailPct > 0 && ref && p.pret <= ref * (1 - plan.trailPct / 100));
    if (nivel === "iesi") sfat = planAtins ? "👉 Ce aș face eu: Aș ieși cum am scris în plan (tot sau jumătate) și n-aș recumpăra " + s + " în aceeași zi." : "👉 Ce aș face eu: Aș ieși (tot sau jumătate) și n-aș recumpăra " + s + " în aceeași zi.";
    else if (plan.tinta > 0 && p.pret >= plan.tinta) sfat = "👉 Ce aș face eu: Aș lua profit pe o parte și aș muta stopul pe rest la prețul de intrare (" + usd(p.pretMediu) + ").";
    else if (pct <= -0.20 && !arePlan) sfat = "👉 Ce aș face eu: Aș scrie acum un plan (stop sau „ies la −X% de la maxim”): fără el, minusul doar crește în liniște.";
    else if (nivel === "atentie" && areDate && st.trend.dir === "jos") sfat = "👉 Ce aș face eu: N-aș cumpăra în plus pe " + s + " până nu se întoarce trendul; dacă n-am stop, l-aș pune.";
    // „trendul e încă bun” doar cand chiar e in sus (ramura e si pentru trendul lateral cu miscare mare in jos)
    else if (nivel === "atentie") sfat = "👉 Ce aș face eu: N-aș cumpăra în plus pe " + s + " până nu se liniștește" + (areDate && st.trend.dir === "sus" ? " (trendul e încă în sus)" : "") + "; dacă n-am stop, l-aș pune.";
    else sfat = "👉 Ce aș face eu: Aș lăsa-o să meargă" + (arePlan ? " cu planul pus." : " și mi-aș scrie un stop, ca profitul să nu se întoarcă în minus.");
    return { nivel: nivel, pct: pct, motive: iesi.concat(atentie, bine), ceAsFace: sfat, componente: comp };
  }

  var TEXT = {
    "minus-20": "lăsat să piardă peste 20%",
    "comision-a-mancat": "câștig pe preț mâncat de comisionul de conversie",
    "recumparat-1z": "recumpărat în mai puțin de o zi după o vânzare pe minus",
    "dupa-miscare": "cumpărat după o mișcare mare",
    "langa-max7z": "cumpărat lângă maximul pe 7 zile"
  };
  // ctx: {umpleri (T212.umpleri, ca sa vad recumpararile), bare (zilnice ale actiunii)}
  function greseli(t, ctx) {
    var g = [], c = ctx || {};
    function ad(cod) { g.push({ cod: cod, text: TEXT[cod] }); }
    // "vandut pe minus in < 2 zile" NU e greseala la actiuni: pe datele lui (25.09) taierile rapide au pierdut
    // ~43 lei fiecare, iar pozitiile tinute pe minus mii - sfatul e chiar sa tai repede.
    if (t.pct !== null && t.pct <= -0.20) ad("minus-20");
    if (t.rezultatOficial > 0 && t.rezultat <= 0) ad("comision-a-mancat");
    if (t.rezultat < 0 && Array.isArray(c.umpleri) && c.umpleri.some(function (u) { return u.side === "BUY" && u.ticker === t.ticker && u.t > t.inchis && u.t - t.inchis <= ZI; })) ad("recumparat-1z");
    if (Array.isArray(c.bare) && c.bare.length) {
      // doar zilele INCHISE inainte de cumparare (bara zilnica are ora deschiderii; piata inchide in ~6,5 h)
      var inainte = c.bare.filter(function (b) { return b.t + 8 * 3600000 <= t.pornit; });
      if (inainte.length >= 60) {
        var s = stare(inainte, t.pretCumparare);
        if (s.miscare && s.miscare.mare) ad("dupa-miscare");
        if (s.max7z && t.pretCumparare >= s.max7z * 0.98) ad("langa-max7z");
      }
    }
    return g;
  }
  function rezumatJurnal(lista, ctx) {
    var l = Array.isArray(lista) ? lista : [], c = ctx || {}, gr = {}, ext = { n: 0, total: 0 }, r = { n: l.length, pePlus: 0, total: 0, totalOficial: 0, comisioane: 0 };
    l.forEach(function (t) {
      if (t.rezultat > 0) r.pePlus++;
      r.total += t.rezultat || 0; r.totalOficial += t.rezultatOficial !== null && t.rezultatOficial !== undefined ? t.rezultatOficial : t.rezultat || 0; r.comisioane += t.comisioane || 0;
      if (t.extCumparare || t.extVanzare) { ext.n++; ext.total += t.rezultat || 0; }
      var bare = c.barePe && c.barePe[t.ticker];
      var gl = greseli(t, { umpleri: c.umpleri, bare: bare }), cf = c.cf && c.cf[t.id];
      if (cf && Array.isArray(cf.greseli)) cf.greseli.forEach(function (k) { if (TEXT[k] && !gl.some(function (x) { return x.cod === k; })) gl.push({ cod: k, text: TEXT[k] }); });
      gl.forEach(function (x) { var a = gr[x.cod] || (gr[x.cod] = { cod: x.cod, text: x.text, n: 0, cost: 0 }); a.n++; a.cost += t.rezultat || 0; });
    });
    r.greseli = Object.keys(gr).map(function (k) { return gr[k]; }).sort(function (a, b) { return a.cost - b.cost; });
    r.ext = ext;
    return r;
  }

  // o: {stare, plan, vandutPeMinusAcumOre}
  function poarta(o) {
    var s = o && o.stare;
    if (!s || !s.trend || s.trend.dir === "fara-date") return { nivel: "fara-date", motive: ["n-am destule prețuri zilnice ca să judec"] };
    var rosu = [], galben = [];
    if (s.trend.dir === "jos") rosu.push("trendul pe zilnice e în jos — pentru acțiuni cumperi doar long, deci aștepți întoarcerea");
    else if (s.trend.dir === "lateral") galben.push("trendul pe zilnice nu e clar în sus");
    if (s.miscare && s.miscare.mare) galben.push("mișcare mult peste cea obișnuită azi sau săptămâna asta: nu cumpăra după ea");
    if (s.distMax7z !== null && s.distMax7z > -0.02) galben.push("prețul e lângă maximul pe 7 zile (" + P(s.distMax7z) + ")");
    var p = o.plan || {};
    if (!o.faraPlan && !(p.stop > 0 || p.trailPct > 0)) galben.push("n-ai scris un plan de ieșire (stop sau −X% de la maxim)");
    if (o.vandutPeMinusAcumOre !== null && o.vandutPeMinusAcumOre !== undefined && o.vandutPeMinusAcumOre < 24) galben.push("ai vândut-o pe minus acum " + Math.round(o.vandutPeMinusAcumOre) + " h — recumpărarea imediată e una din greșelile tale");
    return { nivel: rosu.length ? "nu" : galben.length ? "asteapta" : "cumpara", motive: rosu.concat(galben) };
  }

  // pozitii: [{simbol, valoare (in moneda contului), beta?}], cash in aceeasi moneda
  function portofoliu(poz, cash) {
    var l = (Array.isArray(poz) ? poz : []).filter(function (x) { return x && x.valoare > 0; }), inv = 0;
    l.forEach(function (x) { inv += x.valoare; });
    var total = inv + (cash > 0 ? cash : 0), soc = 0, cea = null;
    var rows = l.map(function (x) {
      var b = x.beta > 0 ? x.beta : 1, r = { simbol: x.simbol, valoare: x.valoare, pondere: total > 0 ? x.valoare / total : null, beta: x.beta > 0 ? x.beta : null, soc: -x.valoare * 0.10 * b };
      soc += r.soc; if (!cea || r.valoare > cea.valoare) cea = r; return r;
    }).sort(function (a, b) { return b.valoare - a.valoare; });
    // plafonul: 20% din cont pe o actiune (acelasi prag ca "Ce ai de facut acum" si marimea pozitiei)
    var pc = function (x) { return P(x, 0).replace("+", ""); };
    // v100.69 (pachetul 4): o actiune ≤ 110; socul Nasdaq −10% (o cifra, nu o actiune) trece in socText, sub ea
    var sfat = !rows.length ? "N-ai poziții deschise." : cea.pondere > 0.20
      ? "👉 Ce aș face eu: Aș ține " + cea.simbol + " sub 20% din cont (acum " + pc(cea.pondere) + "), ca o zi proastă a ei să nu fie ziua proastă a contului."
      : "👉 Ce aș face eu: Aș păstra împărțirea: cea mai mare poziție, " + cea.simbol + ", e " + pc(cea.pondere) + " din cont.";
    var socText = rows.length ? "La o scădere de 10% a Nasdaq-ului, contul ar pierde cam " + L(soc) + "." : "";
    return { total: total, investit: inv, cash: total > 0 ? (cash > 0 ? cash : 0) / total : null, pozitii: rows, cea: cea, soc: soc, ceAsFace: sfat, socText: socText };
  }

  function beta(b, q) {
    if (!Array.isArray(b) || !Array.isArray(q)) return null;
    function ran(a) { var m = {}; for (var i = 1; i < a.length; i++) m[Math.floor(a[i].t / ZI)] = a[i].c / a[i - 1].c - 1; return m; }
    var rb = ran(b), rq = ran(q), x = [], y = [];
    Object.keys(rb).forEach(function (k) { if (rq[k] !== undefined) { x.push(rq[k]); y.push(rb[k]); } });
    if (x.length < 60) return null;
    var mx = 0, my = 0; for (var i = 0; i < x.length; i++) { mx += x[i]; my += y[i]; } mx /= x.length; my /= y.length;
    var cov = 0, v = 0; for (var j = 0; j < x.length; j++) { cov += (x[j] - mx) * (y[j] - my); v += (x[j] - mx) * (x[j] - mx); }
    return v > 0 ? cov / v : null;
  }

  // "Daca ascultai de Radar" pe o cumparare: poarta refacuta DOAR cu zilele inchise inainte de cumparare.
  // Planul nu intra (atunci nu-l stim). inchise = T212.perechi().inchise (pentru recumpararea dupa pierdere).
  // v100.55 (actiunile T212, pachetul 4): starea de la cumparare intr-o cheie - aceeasi stare ca poarta (trend | dupa miscare | langa maxim)
  function cheieSituatie(s) {
    if (!s || !s.trend || !/^(sus|lateral|jos)$/.test(s.trend.dir)) return null;
    return s.trend.dir + "|" + (s.miscare && s.miscare.mare ? "dupa-miscare" : "calm") + "|" + (s.distMax7z !== null && s.distMax7z !== undefined && s.distMax7z > -0.02 ? "langa-max" : "departe");
  }
  var ET_SIT = { sus: "trend în sus", lateral: "trend neclar", jos: "trend în jos", calm: "fără mișcare mare", "dupa-miscare": "după o mișcare mare", departe: "departe de maximul pe 7 zile", "langa-max": "lângă maximul pe 7 zile" };
  function grupSit(l) {
    var pc = l.map(function (t) { return { pct: t.rezultat / t.cost, lei: t.rezultat }; }).sort(function (a, b) { return a.pct - b.pct; }), n = pc.length, tot = 0, plus = 0;
    pc.forEach(function (x) { tot += x.lei; if (x.lei > 0) plus++; });
    return { n: n, median: n ? (n % 2 ? pc[(n - 1) / 2].pct : (pc[n / 2 - 1].pct + pc[n / 2].pct) / 2) : null, pePlus: n ? plus / n : null,
      celMaiRau: n ? { pct: Math.round(pc[0].pct * 10000) / 10000, lei: pc[0].lei } : null, total: Math.round(tot * 100) / 100, putine: n < 10 };
  }
  // revizia 01.10 (I1): un CAZ = aceeasi actiune cumparata in aceeasi zi (vanzarile in transe / cumpararile repetate din zi se aduna) -
  // altfel o pozitie vanduta in 10 transe facea 10 cazuri si ascundea „prea puține”; randurile fara data raman cazuri separate
  function cazuri(l) {
    var m = {}, o = [];
    l.forEach(function (t) { var k = isFinite(t.pornit) && t.pornit !== null ? t.ticker + "|" + Math.floor(t.pornit / 864e5) : "id|" + t.id; if (!m[k]) { m[k] = { ticker: t.ticker, rezultat: 0, cost: 0 }; o.push(m[k]); } m[k].rezultat += t.rezultat; m[k].cost += t.cost; });
    o.forEach(function (x) { x.rezultat = Math.round(x.rezultat * 100) / 100; });
    return o;
  }
  // „in situatii ca asta, din trade-urile tale”: inchise = T212.perechi().inchise; cf = t212:cf (cf[id].sit); doar costul > 0.
  // Fara sector (n-avem sectorul actiunilor): in locul lui, aceeasi actiune in aceeasi stare
  function situatiiCaAsta(inchise, cf, sit, ticker) {
    var c = cf || {}, l = sit ? cazuri((Array.isArray(inchise) ? inchise : []).filter(function (t) { return t && t.cost > 0 && isFinite(t.rezultat) && c[t.id] && c[t.id].sit === sit; })) : [];
    return { sit: sit || null, ticker: ticker || null, eticheta: sit ? sit.split("|").map(function (k) { return ET_SIT[k] || k; }).join(", ") : "",
      toate: grupSit(l), actiune: ticker ? grupSit(l.filter(function (t) { return t.ticker === ticker; })) : null };
  }
  // revizia 01.10 (I2): stopul cu care se socotesc profilul si probabilitatile la poarta - al LUI cand l-a scris (stop sub pret sau −X% de
  // la maxim, socotit de la baza), altfel cel calculat; null fara niveluri
  function stopPoarta(plan, niv, baza) {
    if (!niv || niv.nivel !== "ok" || !(baza > 0)) return null;
    var p = plan || {};
    if (p.stop > 0 && p.stop < baza) return { stop: p.stop, alTau: true };
    if (p.trailPct > 0 && p.trailPct < 100) return { stop: Math.round(baza * (1 - p.trailPct / 100) * 1e6) / 1e6, alTau: true };
    return niv.stop > 0 && niv.stop < baza ? { stop: niv.stop, alTau: false } : null;
  }
  // „1 caz”, „4 cazuri”, „45 de cazuri”, „101 cazuri” (de: ultimele doua cifre 20–99 sau 00)
  function nrCazuri(n) { var r = n % 100; return n === 1 ? "1 caz" : n + (r >= 20 || (r === 0 && n >= 100) ? " de cazuri" : " cazuri"); }
  function textSituatie(r) {
    if (!r || !r.toate || !r.toate.n) return "În situații ca asta" + (r && r.eticheta ? " (" + r.eticheta + ")" : "") + ": niciun trade al tău judecat încă.";
    var g = r.toate, Pc = function (x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; };
    // v100.69 (pachetul 4): un rand de date, intr-o fraza; „(puține cazuri)” in locul avertizarii comune (ea sta in legenda); „1 caz”, „45 de cazuri”
    var s = "În situații ca asta (" + r.eticheta + "), din trade-urile tale: " + nrCazuri(g.n) + (g.putine ? " (puține cazuri)" : "") + ", median " + Pc(g.median) + ", " + Math.round(g.pePlus * 100) + "% pe plus, cel mai rău " + Pc(g.celMaiRau.pct);
    if (r.actiune && r.actiune.n) s += "; pe " + (String(r.ticker || "").split("_")[0] || "acțiunea asta") + " în aceeași stare: " + nrCazuri(r.actiune.n) + (r.actiune.putine ? " (puține cazuri)" : "") + ", median " + Pc(r.actiune.median);
    s += ".";
    return s;
  }
  function laCumparare(t, bare, inchise) {
    var b = Array.isArray(bare) ? bare.filter(function (x) { return x.t + 8 * 3600000 <= t.pornit; }) : [];
    if (b.length < 60) return { nivel: "fara-date", motive: ["prea puține zile de prețuri înainte de cumpărare"], greseli: [], sit: null };
    if (!pretPotrivit(t, bare)) return { nivel: "fara-date", motive: ["prețurile găsite nu se potrivesc cu ale tale (split sau alt simbol)"], greseli: [], sit: null };
    var st = stare(b, t.pretCumparare), ore = null;
    (Array.isArray(inchise) ? inchise : []).forEach(function (x) { if (x.ticker === t.ticker && x.rezultat < 0 && x.inchis <= t.pornit) { var o = (t.pornit - x.inchis) / 3600000; if (ore === null || o < ore) ore = o; } });
    var v = poarta({ stare: st, plan: null, faraPlan: true, vandutPeMinusAcumOre: ore }), g = [];
    if (st.miscare && st.miscare.mare) g.push("dupa-miscare");
    if (st.max7z && t.pretCumparare >= st.max7z * 0.98) g.push("langa-max7z");
    return { nivel: v.nivel, motive: v.motive.slice(0, 4), greseli: g, sit: cheieSituatie(st) };
  }

  // ---------------- preturile: intrare, stop, tinta, marime ----------------
  // ATR = media pe 14 zile a intervalului adevarat (max(h-l, |h-cIeri|, |l-cIeri|)); null pana are 14 zile
  function atr(b) {
    var tr = [], out = [];
    for (var i = 0; i < b.length; i++) {
      var x = b[i], p = i ? b[i - 1].c : null;
      tr.push(p === null ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - p), Math.abs(x.l - p)));
      if (i < 14) { out.push(null); continue; }
      var s = 0; for (var j = i - 13; j <= i; j++) s += tr[j]; out.push(s / 14);
    }
    return out;
  }
  var K = [1.5, 2, 2.5, 3], COST = 0.003, ORIZONT = 20, COST_CONV = 0.003;
  // Proba pe istoricul actiunii: intrare la inchidere, stop la k*ATR, tinta la 2k*ATR, cel mult 20 de zile;
  // doar zilele in aceeasi stare ca acum (EMA20 fata de EMA50), minus 0,30% comisionul de conversie.
  function proba(b, a, dirAcum) {
    var c = b.map(function (x) { return x.c; }), e20 = G.ema(c, 20), e50 = G.ema(c, 50), n = b.length, per = {};
    function ruleaza(cond) {
      var rez = {};
      K.forEach(function (k) {
        var r = [];
        for (var i = Math.max(60, n - 270); i < n - ORIZONT; i++) {
          if (a[i] === null || e50[i] === null) continue;
          if (cond && ((dirAcum === "sus" && !(e20[i] > e50[i])) || (dirAcum === "jos" && !(e20[i] < e50[i])))) continue;
          var intr = c[i], st = intr - k * a[i], tt = intr + 2 * k * a[i], iesit = null;
          for (var j = i + 1; j <= i + ORIZONT && iesit === null; j++) {
            if (b[j].l <= st) iesit = Math.min(b[j].o, st);
            else if (b[j].h >= tt) iesit = Math.max(b[j].o, tt);
          }
          if (iesit === null) iesit = c[i + ORIZONT];
          r.push(iesit / intr - 1 - COST);
        }
        var s = 0, plus = 0; r.forEach(function (x) { s += x; if (x > 0) plus++; });
        rez[k] = { n: r.length, medie: r.length ? s / r.length : null, pePlus: r.length ? plus / r.length : null };
      });
      return rez;
    }
    var conditionat = dirAcum !== "lateral";
    per = ruleaza(conditionat);
    if (!per[K[0]].n || per[K[0]].n < 30) { per = ruleaza(false); conditionat = false; }
    var best = K[0]; K.forEach(function (k) { if (per[k].medie !== null && (per[best].medie === null || per[k].medie > per[best].medie + 1e-12)) best = k; });
    return { k: best, n: per[best].n, medie: per[best].medie, pePlus: per[best].pePlus, conditionat: conditionat, perK: per };
  }
  function r2(x) { return x >= 100 ? Math.round(x * 100) / 100 : Math.round(x * 1000) / 1000; }
  // o: {pretMediu, maxDupaCumparare} pentru o pozitie deschisa
  function niveluri(bare, pret, o) {
    var b = Array.isArray(bare) ? bare : [];
    if (b.length < 120 || !(pret > 0)) return { nivel: "fara-date", motiv: "prea puține zile de prețuri (" + b.length + " din 120)" };
    o = o || {};
    var a = atr(b), A_ = a[b.length - 1], st = stare(b, pret), dir = st.trend.dir, pr = proba(b, a, dir);
    var d = Math.min(0.15 * pret, Math.max(0.03 * pret, pr.k * A_));
    var c = b.map(function (x) { return x.c; }), e20 = G.ema(c, 20)[b.length - 1], intrare = null, motivI = "";
    if (dir === "jos") motivI = "trend în jos pe zilnice: la acțiuni doar long, deci aștept întoarcerea";
    else if (dir === "fara-date") motivI = "trendul nu se poate judeca";
    else if (dir === "sus") { var pi = Math.min(pret, Math.max(e20, pret - 0.5 * A_)); intrare = { pret: r2(pi), motiv: pi < pret ? "retragere spre media pe 20 de zile (ordin limită), nu după mișcare" : "prețul e deja la media pe 20 de zile" }; }
    else { var mn = minL(b, 20), pl = Math.min(pret, mn + 0.25 * A_); intrare = { pret: r2(pl), motiv: "lateral: aproape de minimul pe 20 de zile" }; }
    var baza = intrare ? intrare.pret : pret, ref = o.maxDupaCumparare > 0 ? Math.max(o.maxDupaCumparare, pret) : pret;
    // o.minTrail (v88): pentru pozitiile deschise, stopul care urca e cel putin -X% de la maxim - pe trade-urile lui
    // (25.09) -15% care urca a iesit +1.001 lei fata de fara stop, iar variantele mai stranse, mai rau
    // v100.52 (actiunile T212): o.trailProfil = coborarea obisnuita pe 5 zile (profilul actiunii), doar cand a castigat pe trade-urile lui
    // revizia 01.10 (I1): stopul din profil se aplica EXACT cum a fost probat (−P75 de la maxim), nu max(ATR, P75) - altfel pagina zicea
    // „−11,8% de la maxim” sus si „−3,3%” jos
    var dT = o.trailProfil > 0 ? ref * o.trailProfil : o.minTrail > 0 ? Math.max(d, ref * o.minTrail) : d, stopPoz = ref - dT;
    var sursaTrail = o.trailProfil > 0 ? (o.sursaTrail || "profilul acțiunii") : o.minTrail > 0 ? (o.sursaTrail || "−" + Math.round(o.minTrail * 100) + "% de la maxim (măsurat pe trade-urile tale)") : null;
    return { nivel: "ok", trend: dir, atr: A_, k: pr.k, d: d, riscPct: d / baza, proba: pr, intrare: intrare, intrareMotiv: motivI,
      stop: r2(baza - d), tinta: r2(baza + 2 * d), stopPozitie: stopPoz, trailPct: dT / ref * 100, trailMinim: dT > d, stopAtins: stopPoz >= pret, sursaTrail: sursaTrail,
      // v100.40 (audit 30.09): tinta pozitiei e FIXA, de la pretul mediu de cumparare (+2×risc) - socotita din pretul de ACUM „fugea”
      // odata cu el, deci alerta „a atins ținta sugerată” si „aproape de țintă” din consilier nu se puteau declansa niciodata
      tintaPozitie: r2((o.pretMediu > 0 ? o.pretMediu : pret) + 2 * d) };
  }
  // Cate bucati ca atingerea stopului sa coste cel mult 1% din cont, plafon 20% din cont pe o actiune.
  // intrare/stop in dolari; cont in lei; fx = dolari pe leu (din umplerile T212); lipsa fx -> aceeasi moneda
  function marime(o) {
    if (!o || !(o.cont > 0) || !(o.intrare > 0) || !(o.stop > 0) || o.stop >= o.intrare) return null;
    var fx = o.fx > 0 ? o.fx : 1, riscLei = o.cont * 0.01, peBucLei = (o.intrare - o.stop) / fx, buc = riscLei / peBucLei, suma = buc * o.intrare / fx, plafon = o.cont * 0.20, plaf = false;
    if (suma > plafon + 1e-9) { buc = plafon * fx / o.intrare; suma = plafon; plaf = true; }
    // v87: comisionul de conversie dus-intors (0,15% + 0,15%) si cat trebuie sa urce ca sa iesi pe zero
    return { bucati: Math.round(buc * 10000) / 10000, suma: suma, risc: buc * peBucLei, plafonat: plaf, comision: suma * COST_CONV, peZero: COST_CONV };
  }

  // ---------------- v87: frana de "cumparat in jos" ----------------
  // Cumpararile facute cand pozitia pe actiunea aia era pe minus (pret sub costul mediu al bucatilor tinute,
  // in dolari). nr = a cata la rand; o cumparare peste medie rupe sirul; vanzarea totala il ia de la capat.
  function cumparariInJos(u) {
    var lot = {}, sir = {}, out = [];
    (Array.isArray(u) ? u : []).filter(function (x) { return x && x.ticker && x.qty > 0 && x.pret > 0; }).sort(function (a, b) { return a.t - b.t; }).forEach(function (x) {
      var L = lot[x.ticker] || (lot[x.ticker] = { q: 0, cost: 0 });
      if (x.side === "BUY") {
        var mediu = L.q > 1e-9 ? L.cost / L.q : null;
        if (mediu !== null && x.pret < mediu * 0.995) { sir[x.ticker] = (sir[x.ticker] || 0) + 1; out.push({ id: x.id, ticker: x.ticker, t: x.t, pret: x.pret, mediu: mediu, sub: x.pret / mediu - 1, nr: sir[x.ticker], suma: x.net }); }
        else if (mediu === null || x.pret >= mediu) sir[x.ticker] = 0;
        L.q += x.qty; L.cost += x.qty * x.pret;
      } else if (x.side === "SELL" && L.q > 1e-9) {
        var q = Math.min(x.qty, L.q); L.cost -= L.cost * q / L.q; L.q -= q;
        if (L.q <= 1e-9) { L.q = 0; L.cost = 0; sir[x.ticker] = 0; }
      }
    });
    return out;
  }
  function alertaFrana(x, simbol) {
    var s = simbol || x.ticker, a2 = x.nr >= 2;
    // v100.69 (pachetul 4): Discord pe 2 randuri - faptul cu sumele, apoi „👉 ” actiunea (cu lectia NPA); preturile ca pe pagina
    return { nivel: a2 ? "critic" : "atentie", titlu: s + ": ai cumpărat în plus pe minus" + (a2 ? " (a " + x.nr + "-a oară la rând)" : ""),
      mesaj: "Ai cumpărat la " + usd(x.pret) + ", cu " + P(Math.abs(x.sub)).replace("+", "") + " sub prețul tău mediu (" + usd(x.mediu) + ")" + (x.suma > 0 ? ": " + Math.round(x.suma).toLocaleString("ro-RO") + " lei" : "") + ".\n👉 N-aș mai adăuga pe minus: așa a crescut NPA la 33.000 de lei și a pierdut 8.165 lei." };
  }

  // ---------------- v87: cat te-ar fi salvat stopul ----------------
  // Pe barele zilnice DINTRE ziua cumpararii si ziua vanzarii (ele nu intra: nu stim ordinea din zi): prima zi
  // in care minimul atinge stopul -> iesire la stop sau la deschidere, daca a deschis sub el; minus 0,30% conversia.
  // Pretul Yahoo din ziua cumpararii se potriveste cu al lui? Nu, la split (Yahoo ajusteaza trecutul, T212 nu)
  // sau cand simbolul a ajuns la alta companie (FB) -> false: acel trade nu se judeca.
  function pretPotrivit(t, b) {
    var z = Math.floor(t.pornit / ZI), bar = null;
    for (var i = 0; i < b.length; i++) if (Math.floor(b[i].t / ZI) >= z) { bar = b[i]; break; }
    if (!bar || !(t.pretCumparare > 0)) return true;
    var r = bar.c / t.pretCumparare; return r >= 0.7 && r <= 1.43;
  }
  function cuStop(t, bare, praguri) {
    var out = {}, b = Array.isArray(bare) ? bare : [], intr = t && t.pretCumparare;
    if (b.length && t && !pretPotrivit(t, b)) return out;
    (praguri || [8, 10, 15]).forEach(function (p) {
      out[p] = null;
      if (!(intr > 0) || !b.length) return;
      var st = intr * (1 - p / 100), z0 = Math.floor(t.pornit / ZI), z1 = Math.floor(t.inchis / ZI);
      for (var i = 0; i < b.length; i++) {
        var z = Math.floor(b[i].t / ZI); if (z <= z0) continue; if (z >= z1) break;
        if (b[i].l <= st) { out[p] = { pct: Math.min(b[i].o, st) / intr - 1 - COST_CONV, zi: b[i].t }; break; }
      }
    });
    return out;
  }
  // v88: stopul care URCA dupa maxim. Maximul vine din zilele DE DINAINTE (al zilei curente nu se stie la ce ora a
  // fost fata de minim); ziua cumpararii si a vanzarii nu intra. variante: [{cheie, pct} | {cheie, trailPct}]
  function cuStopUrcator(t, bare, variante) {
    var out = {}, b = Array.isArray(bare) ? bare : [], intr = t && t.pretCumparare;
    if (b.length && t && !pretPotrivit(t, b)) return out;
    (variante || []).forEach(function (v) {
      out[v.cheie] = null;
      var tr = v.pct > 0 ? v.pct : v.trailPct > 0 ? v.trailPct : null;
      if (!(intr > 0) || !b.length || !tr) return;
      var z0 = Math.floor(t.pornit / ZI), z1 = Math.floor(t.inchis / ZI), mx = intr;
      for (var i = 0; i < b.length; i++) {
        var z = Math.floor(b[i].t / ZI); if (z <= z0) continue; if (z >= z1) break;
        var st = mx * (1 - tr / 100);
        if (b[i].l <= st) { out[v.cheie] = { pct: Math.min(b[i].o, st) / intr - 1 - COST_CONV, zi: b[i].t, trail: tr }; break; }
        if (b[i].h > mx) mx = b[i].h;
      }
    });
    return out;
  }
  // Pe trade-urile care au proba de stop (cf[id][camp], implicit "stop"): totalul real fata de cel cu stop, pe fiecare prag.
  function rezumatStop(inchise, cf, praguri, camp) {
    praguri = praguri || [8, 10, 15]; camp = camp || "stop";
    var r = { judecate: 0, real: 0, praguri: {} };
    praguri.forEach(function (p) { r.praguri[p] = { total: 0, atinse: 0, castigatoareTaiate: 0, dif: 0 }; });
    (Array.isArray(inchise) ? inchise : []).forEach(function (t) {
      var v = cf && cf[t.id], s = v && v[camp]; if (!s || !Object.keys(s).length || v.nivel === "fara-date" || !(t.cost > 0)) return;
      r.judecate++; r.real += t.rezultat;
      praguri.forEach(function (p) {
        var x = s[p], g = r.praguri[p];
        if (x && x.pct !== null && x.pct !== undefined) { g.total += t.cost * x.pct; g.atinse++; if (t.rezultat > 0) g.castigatoareTaiate++; }
        else g.total += t.rezultat;
      });
    });
    praguri.forEach(function (p) { r.praguri[p].dif = r.praguri[p].total - r.real; });
    return r;
  }

  // v100.52 (actiunile T212, pachetul 1): stopul care urca - din profilul actiunii („prof”) sau −15% („u15”, masurat pe trade-urile lui
  // la 25.09). Profilul il inlocuieste DOAR daca pe trade-urile lui iese cel putin la fel, pe cel putin 30 de trade-uri judecate.
  // alegeTrail(inchise, cf): comparatia se face DOAR pe trade-urile unde „prof” a fost rejucat, aceleasi pentru ambele variante (poza 01.10:
  // inainte, „prof” lipsa era numarat ca „neatins” = fara stop, si pagina zicea „−15% a ieșit +1.001 lei față de profil” pe 0 trade-uri probate).
  // alegeTrail(ru) ramane pentru un rezumat facut deja pe acelasi subset.
  function alegeTrail(inchise, cf) {
    // revizia 01.10 (C1): pe trade-urile lui, ~jumatate n-au nicio zi de bursa intre cumparare si vanzare -> acolo variantele ies IDENTIC;
    // la egalitate („a ieșit 0 lei”) stopul ar fi trecut pe 3–15% fara nicio dovada. Acum: (1) cat timp rejucarea e in curs, ramane −15%;
    // (2) se numara doar trade-urile unde rezultatele DIFERA - cel putin 30; (3) profilul castiga doar STRICT mai bine, cu o marja de 1% din
    // costul acelor trade-uri, si ramane mai bun si fara trade-ul cu cel mai mare castig (nu decide o singura pozitie mare).
    var l = Array.isArray(inchise) ? inchise : [], cu = [], fara = 0;
    l.forEach(function (t) {
      var v = cf && t && cf[t.id], s = v && v.stopU; if (!s || !Object.keys(s).length || v.nivel === "fara-date" || !(t.cost > 0)) return;
      if (!Object.prototype.hasOwnProperty.call(s, "prof")) { fara++; return; }
      cu.push(t);
    });
    var tot = cu.length + fara;
    if (fara) return { cheie: "u15", judecate: 0, dif: null, motiv: "stopul din profilul acțiunii se rejoacă pe trade-urile tale (rejucarea e în curs: " + cu.length + " din " + tot + ") — până atunci rămâne −15% de la maxim" };
    var difs = [], cost = 0;
    cu.forEach(function (t) {
      var s = cf[t.id].stopU, val = function (x) { return x && x.pct !== null && x.pct !== undefined ? t.cost * x.pct : t.rezultat; };
      var d = val(s.prof) - val(s.u15); if (Math.abs(d) > 1e-9) { difs.push(d); cost += t.cost; }
    });
    var n = difs.length;
    if (n < 30) return { cheie: "u15", judecate: n, dif: null, motiv: "stopul din profilul acțiunii se probează pe trade-urile tale unde ar fi schimbat ceva: " + n + " din 30 — până atunci rămâne −15% de la maxim" };
    var dif = difs.reduce(function (x, y) { return x + y; }, 0), max = Math.max.apply(null, difs), fara1 = dif - Math.max(0, max);
    return dif > 0.01 * cost && fara1 > 0
      ? { cheie: "prof", judecate: n, dif: dif, motiv: "pe " + n + " de trade-uri ale tale unde ar fi schimbat ceva, stopul din profilul acțiunii a ieșit " + L(dif) + " față de −15% de la maxim" }
      : { cheie: "u15", judecate: n, dif: dif, motiv: "pe " + n + " de trade-uri ale tale unde ar fi schimbat ceva, stopul din profil " + (dif > 0 ? "a ieșit doar " + L(dif) + " (prea puțin ca să fie sigur)" : "a ieșit " + L(dif)) + " față de −15% — rămâne −15%" };
  }

  // v100.52: optiunile stopului care urca pentru niveluri - din alegerea pe trade-urile lui (alegeTrail) si pragul din profil
  // (ProfilMoneda.pragStopActiune: {dist, sursa}); fara profil sau fara castig -> −15% ca pana acum. Motivul ramane langa stop.
  function trailPozitie(alegere, ps) {
    var m = alegere && alegere.motiv ? alegere.motiv : "";
    if (alegere && alegere.cheie === "prof" && ps && ps.dist > 0) return { minTrail: 0.15, trailProfil: ps.dist, sursaTrail: "−" + (ps.dist * 100).toFixed(1).replace(".", ",") + "% de la maxim — cât coboară acțiunea de la deschidere în ~1 din 4 săptămâni (fără zilele de rezultate, când coboară mai mult; " + ps.sursa + ")" + (m ? " · " + m : "") };
    return { minTrail: 0.15, sursaTrail: "−15% de la maxim (măsurat pe trade-urile tale)" + (m ? " · " + m : "") };
  }

  // ---------------- v87: regulile tale (din jurnalul de actiuni) ----------------
  function oraRo(t, tz) {
    try { return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz || "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t))); } catch (e) { return new Date(t).getUTCHours() + 3; }
  }
  function ziRo(t, tz) {
    try { return new Intl.DateTimeFormat("ro-RO", { timeZone: tz || "Europe/Bucharest", weekday: "long" }).format(new Date(t)); } catch (e) { return ""; }
  }
  function reguliPersonale(inchise, tz) {
    var l = (Array.isArray(inchise) ? inchise : []).filter(function (t) { return t && isFinite(t.rezultat) && t.pornit > 0; });
    if (l.length < 60) return { suficient: false, n: l.length, lipsa: 60 - l.length, reguli: [] };
    var plus = l.filter(function (t) { return t.rezultat > 0; }).length, rata = plus / l.length, grupe = {};
    function ad(k, t) { (grupe[k] = grupe[k] || []).push(t); }
    l.forEach(function (t) {
      var h = oraRo(t.pornit, tz);
      ad(h >= 23 || h < 11 ? "cumpărate noaptea (după 23 sau înainte de 11), în afara orelor" : h < 16 ? "cumpărate între 11 și 16:30, înainte de deschidere" : h < 18 ? "cumpărate în prima oră și jumătate după deschidere" : "cumpărate după 18", t);
      if (t.extCumparare) ad("cumpărate în afara orelor de bursă", t);
      ad("cumpărate " + ziRo(t.pornit, tz), t);
      var c = t.cost || 0; ad(c < 1000 ? "sub 1.000 de lei" : c < 3000 ? "de 1.000–3.000 de lei" : c < 6000 ? "de 3.000–6.000 de lei" : "de peste 6.000 de lei", t);
    });
    var reguli = Object.keys(grupe).map(function (k) {
      var g = grupe[k], p = g.filter(function (t) { return t.rezultat > 0; }).length, tot = 0; g.forEach(function (t) { tot += t.rezultat; });
      return { grupa: k, n: g.length, pePlus: p / g.length, total: tot, text: "Trade-urile " + k + ": " + p + " din " + g.length + " pe plus (" + Math.round(p / g.length * 100) + "%, față de " + Math.round(rata * 100) + "% în general), total " + L(tot) + "." };
    }).filter(function (g) { return g.n >= 30 && g.n < l.length && g.total < 0 && g.pePlus < rata - 0.05; }).sort(function (a, b) { return a.total - b.total; });
    return { suficient: true, n: l.length, rata: rata, reguli: reguli };
  }

  // Alertele planului pentru colector: doar pragurile scrise de EL. Cheia e pe zi (ora Romaniei nu conteaza
  // aici: o zi UTC), ca acelasi prag sa sune o data pe zi, nu la fiecare minut.
  function alertePlan(p, acum) {
    var out = [], pl = p && p.plan;
    if (!pl || !(p.pret > 0)) return out;
    var zi = new Date(acum || Date.now()).toISOString().slice(0, 10), s = p.simbol || p.ticker;
    function ad(tip, nivel, titlu, mesaj) { out.push({ cheie: "t212-" + p.ticker + "-" + tip + "-" + zi, nivel: nivel, titlu: titlu, mesaj: mesaj }); }
    // v99.1 (audit #9): preturile ca preturi, nu 30.690000534057617 - v100.69: scrise ca pe pagina T212 (usd = t212Usd)
    // v100.69 (pachetul 4): Discord pe 2 randuri - faptul cu pretul, apoi „👉 ” actiunea la persoana I; cheile raman
    var pr = function (v) { v = Number(v); return !isFinite(v) ? "?" : usd(v); };
    if (pl.stop > 0 && p.pret <= pl.stop) ad("stop", "critic", s + ": stopul din planul tău e atins (" + pr(pl.stop) + ")", "Prețul e " + pr(p.pret) + ".\n👉 Aș ieși cum am scris în plan și n-aș recumpăra " + s + " azi.");
    if (pl.trailPct > 0 && p.maxDupaCumparare > 0 && p.pret <= p.maxDupaCumparare * (1 - pl.trailPct / 100)) ad("trail", "critic", s + ": −" + vg(pl.trailPct) + "% de la maxim, pragul din planul tău", "A coborât " + P(1 - p.pret / p.maxDupaCumparare).replace("+", "") + " de la maximul de după cumpărare (" + pr(p.maxDupaCumparare) + ").\n👉 Aș ieși, măcar cu jumătate.");
    if (pl.tinta > 0 && p.pret >= pl.tinta) ad("tinta", "info", s + ": ținta din plan e atinsă (" + pr(pl.tinta) + ")", "Prețul e " + pr(p.pret) + ".\n👉 Aș lua profit pe o parte și aș muta stopul pe rest la prețul de intrare.");
    return out;
  }

  // Raportul de duminica, partea de actiuni: trade-urile inchise in ultimele 7 zile
  function raportSaptamana(inchise, acum) {
    var de = (acum || Date.now()) - 7 * ZI, l = (Array.isArray(inchise) ? inchise : []).filter(function (t) { return t.inchis >= de && t.inchis <= (acum || Date.now()); });
    if (!l.length) return ["Acțiuni (Trading 212): niciun trade închis săptămâna asta."];
    var tot = 0, com = 0, plus = 0, rau = null;
    l.forEach(function (t) { tot += t.rezultat || 0; com += t.comisioane || 0; if (t.rezultat > 0) plus++; if (!rau || t.rezultat < rau.rezultat) rau = t; });
    var linii = ["Acțiuni (Trading 212): " + l.length + " trade-uri, " + plus + " pe plus, rezultat real " + L(tot) + " (comisioane de conversie " + Math.round(com).toLocaleString("ro-RO") + " lei)."];
    if (rau && rau.rezultat < 0) linii.push("Cea mai mare pierdere: " + (rau.simbol || rau.ticker) + " " + L(rau.rezultat) + " (" + P(rau.pct) + ")" + (rau.pct !== null && rau.pct <= -0.2 ? ", peste −20%: aș scrie stopul încă de la cumpărare." : "."));
    return linii;
  }

  // v100.40 (audit 30.09): maximul de DUPA cumparare - de la ziua de dupa cumparare (pe bare zilnice nu stim daca maximul zilei
  // cumpararii a fost inainte sau dupa ea; proba cuStopUrcator o exclude). Inainte: ziua cumpararii intra -> trail-ul de 15%
  // putea porni de la un maxim de DINAINTEA cumpararii. Una singura, folosita de pagina T212, colector (poza + planuri).
  function maxDupaCumparare(bare, deLa, pretAcum) {
    var b = Array.isArray(bare) ? bare : [], de = typeof deLa === "number" ? deLa : Date.parse(deLa || ""), mx = null;
    if (!b.length || !isFinite(de)) return null;
    var z0 = Math.floor(de / ZI);
    for (var i = 0; i < b.length; i++) if (b[i] && Math.floor(b[i].t / ZI) > z0 && b[i].h > 0) mx = mx === null ? b[i].h : Math.max(mx, b[i].h);
    if (pretAcum > 0) mx = mx === null ? pretAcum : Math.max(mx, pretAcum);   // pretul de acum e si el dupa cumparare
    return mx;
  }
  return { usd: usd, stopPoarta: stopPoarta, cheieSituatie: cheieSituatie, situatiiCaAsta: situatiiCaAsta, textSituatie: textSituatie, trailPozitie: trailPozitie, alegeTrail: alegeTrail, maxDupaCumparare: maxDupaCumparare, cuStopUrcator: cuStopUrcator, cumparariInJos: cumparariInJos, alertaFrana: alertaFrana, cuStop: cuStop, rezumatStop: rezumatStop, reguliPersonale: reguliPersonale, atr: atr, niveluri: niveluri, marime: marime, laCumparare: laCumparare, raportSaptamana: raportSaptamana, alertePlan: alertePlan, stare: stare, semafor: semafor, greseli: greseli, rezumatJurnal: rezumatJurnal, poarta: poarta, portofoliu: portofoliu, beta: beta, TEXT: TEXT };
})();
if (typeof globalThis !== "undefined") globalThis.ActiuniSemnale = ActiuniSemnale;
