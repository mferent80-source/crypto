// Consilierul (v89): sfaturi pe pozitiile deschise (actiuni si boti) si biletul la intrare, din istoricul LUI
// + cifrele pozitiei + piata + stiri. Modul pur, probat in scripts/consilier-v89.mjs.
// Specul: docs/superpowers/specs/2026-09-25-consilier-design.md
// Nu prezice directia si nu "cumpara" pe o stire: stirile se arata (titlu, ora, link), nu se interpreteaza.
// Un sfat: {nivel: r|g|n|v, titlu, text, ceAsFace, sursa: istoric|pozitie|piata|stiri, stiri?}
var Consilier = (function () {
  "use strict";
  var AS = typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale : globalThis.ActiuniSemnale;
  var ZI = 86400000, COST_CONV = 0.003, ORDINE = { r: 0, g: 1, n: 2, v: 3 };
  function P(x, z) { return x === null || x === undefined || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(z === undefined ? 1 : z).replace(".", ",") + "%"; }
  function L(x) { return x === null || x === undefined || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(Math.round(x)).toLocaleString("ro-RO") + " lei"; }
  function U(x) { return x === null || x === undefined || !isFinite(x) ? "—" : "$" + x.toFixed(2).replace(".", ","); }
  function ultima(b) { return Array.isArray(b) && b.length ? b[b.length - 1] : null; }
  function stat(l) {
    var n = l.length, plus = 0, tot = 0; l.forEach(function (t) { tot += t.rezultat || 0; if (t.rezultat > 0) plus++; });
    return { n: n, pePlus: plus, total: tot, rata: n ? plus / n : null };
  }
  function ordoneaza(l) { return l.sort(function (a, b) { return ORDINE[a.nivel] - ORDINE[b.nivel]; }); }
  function stiriRecente(s, acum) { return (Array.isArray(s) ? s : []).filter(function (x) { return x && x.titlu && x.la > 0 && acum - x.la <= 2 * ZI; }).slice(0, 4); }

  // ---------------- piata azi ----------------
  // o: {qqq, spy, vix: bare zilnice (t,o,h,l,c), fg: {valoare, clasa}}
  var FG = { "Extreme Fear": "frică extremă", Fear: "frică", Neutral: "neutru", Greed: "lăcomie", "Extreme Greed": "lăcomie extremă" };
  function piata(o) {
    o = o || {};
    var q = Array.isArray(o.qqq) && o.qqq.length ? o.qqq : null, parti = [], ton = "fara-date";
    var vix = ultima(o.vix), vv = vix ? vix.c : null;
    if (q) {
      var st = AS.stare(q), u = ultima(q), a = q[q.length - 2], ch = a ? u.c / a.c - 1 : null, dir = st.trend.dir;
      parti.push({ et: "Nasdaq (QQQ)", val: (dir === "sus" ? "↑ trend sus" : dir === "jos" ? "↓ trend jos" : dir === "lateral" ? "→ lateral" : "—") + (ch !== null ? " · ultima zi " + P(ch, Math.abs(ch) < 0.001 ? 2 : 1) : ""), cls: dir === "sus" ? "good" : dir === "jos" ? "bad" : "" });
      ton = dir === "jos" || (vv !== null && vv >= 25) ? "rau" : (vv !== null && vv >= 20) || dir === "lateral" ? "atentie" : "bine";
    }
    var s = ultima(o.spy), s0 = Array.isArray(o.spy) && o.spy.length > 1 ? o.spy[o.spy.length - 2] : null;
    if (s && s0) parti.push({ et: "S&P 500", val: "ultima zi " + P(s.c / s0.c - 1, Math.abs(s.c / s0.c - 1) < 0.001 ? 2 : 1), cls: s.c >= s0.c ? "good" : "bad" });
    if (vv !== null) parti.push({ et: "VIX", val: vv.toFixed(1).replace(".", ",") + (vv >= 25 ? " (frică mare)" : vv >= 20 ? " (agitat)" : " (liniște)"), cls: vv >= 25 ? "bad" : vv >= 20 ? "tbWarn" : "good" });
    if (o.fg && isFinite(o.fg.valoare)) parti.push({ et: "Frica/lăcomia crypto", val: o.fg.valoare + " (" + (FG[o.fg.clasa] || o.fg.clasa || "—") + ")", cls: o.fg.valoare >= 75 || o.fg.valoare <= 25 ? "tbWarn" : "" });
    var text = parti.map(function (x) { return x.et + ": " + x.val; }).join(" · ");
    return { ton: ton, parti: parti, text: text || "fără date despre piață" };
  }

  // ---------------- sfaturile pe o actiune deschisa ----------------
  // p: pozitia pregatita (ticker, simbol, pret, pretMediu, pctLei, ppl, sem, niv, pond, de); ctx: {inchise, piata, stiri, acum}
  function sfaturiPozitie(p, ctx) {
    if (!p) return [];
    ctx = ctx || {};
    var acum = ctx.acum || Date.now(), out = [], inch = Array.isArray(ctx.inchise) ? ctx.inchise : [];
    // 1) istoricul lui pe acelasi simbol
    var ist = stat(inch.filter(function (t) { return t.ticker === p.ticker; }));
    if (ist.n) out.push({ nivel: ist.total < 0 && ist.n >= 2 ? "g" : "n", sursa: "istoric",
      titlu: "Istoricul tău pe " + p.simbol + ": " + ist.n + " trade-uri, " + ist.pePlus + " pe plus, total " + L(ist.total),
      text: ist.n < 10 ? "puține cazuri — un semn, nu o regulă" : "", ceAsFace: ist.total < 0 && ist.n >= 3 ? "Pe " + p.simbol + " ai pierdut de obicei: n-aș adăuga." : null });
    // 2) zona de tinut in care pierde (1-4 saptamani), cand pozitia e pe minus si a intrat in ea
    var zile = p.de > 0 ? (acum - p.de) / ZI : null;
    if (p.pctLei !== null && p.pctLei < 0 && zile !== null && zile >= 7 && zile <= 28) {
      var g = stat(inch.filter(function (t) { return t.durataOre >= 168 && t.durataOre < 672; }));
      if (g.n >= 10 && g.total < 0) out.push({ nivel: "g", sursa: "istoric", titlu: p.simbol + " e în a " + Math.floor(zile) + "-a zi, pe minus",
        text: "Trade-urile tale ținute 1–4 săptămâni: " + g.pePlus + " din " + g.n + " pe plus, total " + L(g.total) + ".",
        ceAsFace: "N-aș aștepta să „își revină” fără stop: aș pune stopul care urcă (−15% de la maxim) sau aș ieși." });
    }
    // 3) profitul: aproape de tinta sau peste +15%
    var n = p.niv;
    if (p.pret > 0 && p.pretMediu > 0 && ((n && n.tintaPozitie > 0 && p.pret >= n.tintaPozitie * 0.97) || (p.pctLei !== null && p.pctLei >= 0.15)))
      out.push({ nivel: "v", sursa: "pozitie", titlu: p.simbol + " e pe " + P(p.pctLei !== null ? p.pctLei : p.pret / p.pretMediu - 1) + (n && n.tintaPozitie ? ", ținta e " + U(n.tintaPozitie) : ""), text: "",
        ceAsFace: "Aș lua jumătate" + (n && n.tintaPozitie ? " la " + U(Math.max(p.pret, n.tintaPozitie)) : " acum") + " și aș muta stopul pe rest la prețul de intrare (" + U(p.pretMediu) + "): de acolo nu mai poți pierde pe ea." });
    // 4) plusul care nu acopera comisionul
    var pp = p.pret > 0 && p.pretMediu > 0 ? p.pret / p.pretMediu - 1 : null;
    if (pp !== null && pp >= 0 && pp < COST_CONV) out.push({ nivel: "n", sursa: "pozitie", titlu: "Încă nu acoperă comisionul de 0,30%",
      text: "Prețul e la " + P(pp, 2) + " peste intrare, iar schimbul lei↔dolari costă ~0,15% la intrare și ~0,15% la ieșire.", ceAsFace: "Dacă ieși acum, ieși de fapt pe minus." });
    // 5) piata
    if (ctx.piata && ctx.piata.ton === "rau") out.push({ nivel: "n", sursa: "piata", titlu: "Piața întreagă e în jos", text: ctx.piata.text || "", ceAsFace: "N-aș adăuga nimic azi, pe nicio acțiune." });
    // 6) stirile din ultimele 48 h - aratate, nu interpretate
    var s = stiriRecente(ctx.stiri, acum);
    if (s.length) out.push({ nivel: "n", sursa: "stiri", titlu: s.length + (s.length === 1 ? " știre" : " știri") + " despre " + p.simbol + " în ultimele 48 h", text: "", ceAsFace: null, stiri: s });
    return ordoneaza(out);
  }

  // ---------------- biletul: situatiile asemanatoare din istoricul lui ----------------
  // sit: {dupaMiscare, langaMax7z, trendJos, suma (lei), ticker}; cf = verdictele "daca ascultai" pe fiecare trade
  function situatiiAsemanatoare(inchise, cf, sit) {
    var l = Array.isArray(inchise) ? inchise : [], c = cf || {}, s = sit || {}, out = [];
    function ad(et, f) { var x = stat(l.filter(f)); if (x.n) out.push({ et: et, n: x.n, pePlus: x.pePlus, total: x.total, rata: x.rata, text: "Când ai cumpărat " + et + ": " + x.pePlus + " din " + x.n + " pe plus, total " + L(x.total) + (x.n < 10 ? " (puține cazuri)" : "") + "." }); }
    function gr(t, k) { return c[t.id] && Array.isArray(c[t.id].greseli) && c[t.id].greseli.indexOf(k) >= 0; }
    if (s.dupaMiscare) ad("după o mișcare mare", function (t) { return gr(t, "dupa-miscare"); });
    if (s.langaMax7z) ad("lângă maximul pe 7 zile", function (t) { return gr(t, "langa-max7z"); });
    if (s.trendJos) ad("pe trend în jos (poarta ar fi zis NU)", function (t) { return c[t.id] && c[t.id].nivel === "nu"; });
    if (s.suma > 0 && s.suma < 1000) ad("sume sub 1.000 de lei", function (t) { return t.cost > 0 && t.cost < 1000; });
    if (s.ticker) { var sim = s.ticker.split("_")[0]; ad("aceeași acțiune (" + sim + ")", function (t) { return t.ticker === s.ticker; }); }
    return out;
  }

  // ---------------- sfaturile pe un bot ----------------
  // b: botul (baza "MET.PERP"); ctx: {trades: JurnalTrade.din(...), fg, stiri, acum}
  function sfaturiBot(b, ctx) {
    if (!b) return [];
    ctx = ctx || {};
    var acum = ctx.acum || Date.now(), out = [], m = String(b.baza || b.moneda || "").replace(/\.PERP$/, "").replace(/_USDT.*$/, "");
    var ist = stat((Array.isArray(ctx.trades) ? ctx.trades : []).filter(function (t) { return t && t.moneda === m; }));
    if (ist.n) out.push({ nivel: ist.total < 0 && ist.n >= 2 ? "g" : "n", sursa: "istoric", titlu: "Istoricul tău pe " + m + ": " + ist.n + (ist.n === 1 ? " bot" : " boți") + ", " + ist.pePlus + " pe plus, total " + (ist.total >= 0 ? "+" : "−") + Math.abs(ist.total).toFixed(2) + " USDT",
      text: ist.n < 10 ? "puține cazuri — un semn, nu o regulă" : "", ceAsFace: ist.total < 0 && ist.n >= 3 ? "Pe " + m + " boții tăi au pierdut de obicei: n-aș mări botul." : null });
    var fg = ctx.fg;
    if (fg && isFinite(fg.valoare) && (fg.valoare >= 75 || fg.valoare <= 25)) out.push({ nivel: "n", sursa: "piata", titlu: "Frica/lăcomia crypto e la " + fg.valoare + " (" + (FG[fg.clasa] || fg.clasa) + ")",
      text: "Piața e la o extremă: mișcările mari vin mai des în astfel de zile.", ceAsFace: "N-aș pune bani în plus azi și aș avea opritorul pornit." });
    var s = stiriRecente(ctx.stiri, acum);
    if (s.length) out.push({ nivel: "n", sursa: "stiri", titlu: s.length + (s.length === 1 ? " știre" : " știri") + " despre " + m + " în ultimele 48 h", text: "", ceAsFace: null, stiri: s });
    return ordoneaza(out);
  }

  // ---------------- rezumatul de dimineata ----------------
  function ziScurta(iso) { var x = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return x ? x[3] + "." + x[2] : "—"; }
  function rezumatDimineata(o) {
    o = o || {};
    var acum = o.acum || Date.now(), linii = [], deFacut = 0;
    if (o.piata && o.piata.text) linii.push("📈 Piața: " + o.piata.text);
    (o.deIesit || []).forEach(function (x) { deFacut++; linii.push("🔴 De ieșit: " + x.simbol + (x.pctLei !== null && x.pctLei !== undefined ? " (" + P(x.pctLei) + ")" : "")); });
    (o.rezultate || []).forEach(function (x) { var z = Math.ceil((Date.parse(x.data + "T12:00:00Z") - acum) / ZI); if (z >= 0 && z <= 7) { deFacut++; linii.push("🗓️ " + x.simbol + " își anunță rezultatele pe " + ziScurta(x.data) + (z === 0 ? " (azi)" : z === 1 ? " (mâine)" : " (peste " + z + " zile)")); } });
    (o.plafon || []).forEach(function (x) { deFacut++; linii.push("⚖️ " + x.simbol + " e " + Math.round(x.pond * 100) + "% din cont (plafonul e 20%)"); });
    (o.boti || []).forEach(function (x) { deFacut++; linii.push("⚠️ Botul " + x.nume + ": lichidarea la " + x.lich.toFixed(1).replace(".", ",") + "%"); });
    (o.stiri || []).slice(0, 3).forEach(function (x) { linii.push("📰 " + x.simbol + ": " + x.titlu); });
    if (!deFacut) linii.push("✓ Azi nu e nimic de făcut pe poziții.");
    return { titlu: "Rezumatul de dimineață", linii: linii };
  }

  return { piata: piata, sfaturiPozitie: sfaturiPozitie, situatiiAsemanatoare: situatiiAsemanatoare, sfaturiBot: sfaturiBot, rezumatDimineata: rezumatDimineata };
})();
if (typeof globalThis !== "undefined") globalThis.Consilier = Consilier;
