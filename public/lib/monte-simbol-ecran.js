// v100.128 (el 07.10: „fă montecarlo să facă și analiza pe un coin sau stock ales” → „toate trei” → „da” pe demo): caseta de sus din
// pagina Monte Carlo - un simbol ales ⇒ (1) încotro poate merge prețul (fără tendința perioadei, stop / țintă editabile), (2) botul grid
// (botul lui activ pe moneda aia, altfel setări de probă editabile; doar coinuri), (3) istoria lui pe simbol. Calculul e în MonteSimbol
// (pur); aici: funcțiile de desen (fără DOM, probate în vm) și aducerea datelor (Pionex 15M + 1D ca fișa Grid, Yahoo 1D ca pagina Salt).
// v100.129 (el: „fa idei”): Enter în câmp + ultimele 10 simboluri; alegerea botului când sunt mai mulți pe aceeași monedă; „Compară 6 variante”
// pe aceleași drumuri; 🎲 din pozițiile T212 / Salt (prețul tău de intrare și stopul poziției)
var mcsStare = { sim: "", inLucru: false, eroare: null, rez: null, date: null, arhiva: null, recente: null, botIdx: 0, poz: null, oriz: { coin: 1, stock: 1 } };
// v100.133 (el: „fa idei”): orizontul la alegere - perechi (scurt, lung), pe fel: coin în zile, acțiune în zile de bursă; implicit a doua
function mcsOrizonturi(tip) { return tip === "stock" ? [[5, 20], [20, 60], [60, 120]] : [[3, 7], [7, 30], [30, 90]]; }
function mcsOrizontAles(tip, i) { var l = mcsOrizonturi(tip); return l[i >= 0 && i < l.length ? i : 1]; }
function mcsOrizontTxt(p, tip) { return p[0] + " și " + mcsCate(p[1], tip === "stock" ? "zi de bursă" : "zi", tip === "stock" ? "zile de bursă" : "zile"); }
function mcsOrizHtml(r) {
  var l = mcsOrizonturi(r.tip), ales = r.oriz >= 0 && r.oriz < l.length ? r.oriz : 1;
  return '<div class="mcsOriz" role="group" aria-label="Orizontul"><span class="tbSub">Orizontul:</span>' + l.map(function (p, i) { return '<button type="button" class="tbIntBtn" aria-pressed="' + (i === ales) + '" data-action-click="mcsAlegeOriz(' + i + ')">' + mcsEsc(mcsOrizontTxt(p, r.tip)) + '</button>'; }).join("") + '</div>';
}
function mcsEsc(s) { return typeof escapeHtml === "function" ? escapeHtml(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function mcsNr(v, z) { return Number(v).toLocaleString("ro-RO", { minimumFractionDigits: z, maximumFractionDigits: z }); }
function mcsSemn(v) { return v > 0 ? "+" : v < 0 ? "−" : ""; }
function mcsPct1(v) { return v == null || !isFinite(v) ? "—" : mcsSemn(Math.round(v * 1000) / 10) + mcsNr(Math.abs(v * 100), 1) + "%"; }
function mcsPr(v) { return v == null || !isFinite(v) ? "—" : Math.round(v * 100) + "%"; }
function mcsBani1(v, unit) { return v == null || !isFinite(v) ? "—" : mcsSemn(Math.round(v * 10) / 10) + mcsNr(Math.abs(v), 1) + " " + (unit || "USDT"); }   // rezultatele: o zecimală
function mcsCls(v) { return v > 0 ? "good" : v < 0 ? "bad" : ""; }
function mcsCate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var r = Math.abs(n) % 100; return n === 1 ? "1 " + sg : n + (r >= 20 || (r === 0 && n >= 100) ? " de " : " ") + pl; }
// revizia v100.133 (R3): sub 0,01 cu 4 cifre semnificative („0,00001234”, nu „0,0000”) - pe pagină, pe Discord, în cheia anti-repetare
function mcsPretTxt(v) {
  if (v == null || !isFinite(v)) return "—";
  var a = Math.abs(v);
  return a > 0 && a < 0.01 ? mcsNr(Number(v.toPrecision(4)), Math.min(12, 3 - Math.floor(Math.log10(a)))) : mcsNr(v, a < 1 ? 4 : 2);
}
function mcsCurata(s) { var t = String(s == null ? "" : s).trim().toUpperCase().replace(/\s+/g, ""); return /^[A-Z0-9][A-Z0-9.^=-]{0,19}$/.test(t) ? t : ""; }
// ultimele 10 simboluri analizate: cel nou primul, fără dubluri, doar simboluri curate
// v100.130: fiecare ține și felul ({s, tip: "coin" | "stock" | null}) - BE analizat ca acțiune (din poziție) se redeschide ca acțiune,
// nu ca BE_USDT_PERP de pe Pionex; cele salvate înainte (doar text) rămân fără fel (drumul obișnuit: întâi Pionex)
function mcsFel(x) {
  var o = x && typeof x === "object" ? x : { s: x }, s = mcsCurata(o.s);
  return s ? { s: s, tip: o.tip === "coin" || o.tip === "stock" ? o.tip : null } : null;
}
function mcsRecente(lista, sim, tip) {
  var l = [mcsFel({ s: sim, tip: tip })].concat((Array.isArray(lista) ? lista : []).map(mcsFel)).filter(Boolean), vazut = {};
  return l.filter(function (x) { if (vazut[x.s]) return false; vazut[x.s] = 1; return true; }).slice(0, 10);
}
// butonul unui simbol (recente / scurtături): trimite și felul; acțiunea fără bursă în nume (BE, NFLX) primește „acț.”
function mcsButonSim(x, rec) {
  return '<button type="button" class="t212BtnLinie' + (rec ? ' mcsRecent' : '') + '" data-action-click="mcsAlege(\'' + x.s + '\'' + (x.tip ? ',\'' + x.tip + '\'' : '') + ')"' + (x.tip ? ' title="' + (x.tip === "coin" ? "coin pe Pionex" : "acțiune / ETF (Yahoo)") + '"' : '') + '>' + x.s + (x.tip === "stock" && x.s.indexOf(".") < 0 ? '<small>acț.</small>' : '') + '</button>';
}
// v100.130 / v100.131: stopul care urcă DEPĂȘIT și prețul sub intrare ⇒ șansa să revină la intrare în 60 de zile de bursă - aceleași drumuri
// ca 🎲 „Monte Carlo pe poziție” (MonteSimbol.pret, sămânța 21, orizonturile 20 / 60). Comună: pagina Salt și pagina T212.
function mcsSansaRevenire(b, P, I, stop) {
  if (typeof MonteSimbol === "undefined" || !(P > 0) || !(stop > P) || !(I > P) || !Array.isArray(b)) return null;
  var m = MonteSimbol.pret(b, { orizonturi: [20, 60], n: 1000, blocZile: 5, seed: 21, stopPct: 0.1, tintaPct: 0.15, prag: 0.1, intrare: I / P, faraCuTendinta: true });   // revizia (R4): orizontul de 20 rămâne (sămânța lui 60 = j 1), trecerea „cu tendința” nu
  var o = m && !m.eroare ? m.orizonturi[1] : null;
  return o ? { p: o.pIntrare, pCapat: o.pPesteIntrare, zile: 60 } : null;
}
// v100.132: „🎲 revine la intrare” din rândul unei poziții (T212 / Salt) e un buton: deschide Monte Carlo pe poziție (ca 🎲 din detaliu);
// clasa dată (t212RevMic / saltRevMic) îl ascunde pe telefon, unde se suprapunea cu ținta
function mcsRevineButon(sim, pret, intrare, stop, r, cls) {
  var c = mcsCurata(sim); if (!c || !r) return "";
  return '<button type="button" class="mcsRevBtn t212Mic' + (cls ? " " + cls : "") + '" data-action-click="mcsPozitie(\'' + c + '\',' + mcsPozArg(pret) + ',' + mcsPozArg(intrare) + ',' + mcsPozArg(stop) + ')" title="Monte Carlo pe poziție">🎲 revine la intrare: ' + Math.round(r.p * 100) + '% în ' + r.zile + ' z</button>';
}
// butonul 🎲 din detaliul unei poziții (T212 / Salt): numerele fără exponent (delegarea acceptă doar 123.45), simbolul curățat
function mcsPozArg(v) { if (v == null || !isFinite(v)) return "null"; var t = Number(v).toFixed(10); return t.indexOf(".") >= 0 ? t.replace(/0+$/, "").replace(/\.$/, "") : t; }
function mcsPozButon(sim, pret, intrare, stop) {
  var c = mcsCurata(sim); if (!c) return "";
  return '<button type="button" class="t212BtnLinie" data-action-click="mcsPozitie(\'' + c + '\',' + mcsPozArg(pret) + ',' + mcsPozArg(intrare) + ',' + mcsPozArg(stop) + ')">🎲 Monte Carlo pe poziție</button>';
}

// ---------------- datele (pure) ----------------
// botul LUI activ pe moneda aleasă: Pionex numără LINIILE (row), intervalele = row − 1; stopul pe partea direcției
// revizia (R3): baza botului poate diferi de simbolul Pionex (PUMPFUN.PERP ⇒ PUMP_USDT_PERP) - scurtătura și căutarea merg pe Pionex
function mcsSimbolBot(b) { var p = String(b && b.simbolPionex || "").toUpperCase().replace(/_USDT_PERP$/, ""); return p || String(b && b.baza || "").replace(/\.PERP$/, "").toUpperCase(); }
function mcsBotPe(b, sim) { return !!b && (mcsSimbolBot(b) === sim || String(b.baza || "").replace(/\.PERP$/, "").toUpperCase() === sim); }
// revizia (R2): Pionex dă „neutral” / „no_trend” ⇒ „neutru” (simulatorul: orice altceva decât long / short e neutru; în formular, neutru)
function mcsDir(d) { d = String(d || "").toLowerCase(); return d === "long" || d === "short" ? d : "neutru"; }
// v100.129: toți boții lui activi pe moneda aleasă (cu interval valid); se simulează cel ales (implicit primul)
function mcsBotiPe(boti, sim) { return (Array.isArray(boti) ? boti : []).filter(function (x) { return x && x.activ && mcsBotPe(x, sim) && x.gridJos > 0 && x.gridSus > x.gridJos; }); }
function mcsSetariBot(boti, sim, idx) {
  var l = mcsBotiPe(boti, sim), b = l[idx >= 0 && idx < l.length ? idx : 0];
  if (!b) return null;
  var row = Number(b.brut && b.brut.buOrderData && b.brut.buOrderData.row), dir = mcsDir(b.directie);
  var stop = b.opritorPierdereActiv && Number(b.opritorPierdere) > 0 ? (dir === "short" ? { sus: Number(b.opritorPierdere) } : { jos: Number(b.opritorPierdere) }) : null;
  // v100.132: ținta (TP) lui din Pionex - long deasupra, short dedesubt (ca Tabloul, opritorProfit e deja preț); la neutru nu are o parte
  var tp = dir !== "neutru" && b.opritorProfitActiv && Number(b.opritorProfit) > 0 ? Number(b.opritorProfit) : null;
  var r = { jos: Number(b.gridJos), sus: Number(b.gridSus), grile: row > 1 ? row - 1 : 20, levier: Number(b.levier) || 1, dir: dir, suma: Number(b.investit) || 50, stop: stop, tp: tp, botulTau: true };
  if (tp && b.opritorProfitTip === "raport") r.tpAprox = true;   // revizia (R4): Pionex l-a dat în % din investiție
  return r;
}
// fără bot activ: setări de probă (schimbabile pe pagină) - ±8% în jurul prețului, 20 de grile, 2×, long, 50 USDT, fără stop
function mcsEticheteBoti(boti, sim) {
  return mcsBotiPe(boti, sim).map(function (b, i) { var st = mcsSetariBot(boti, sim, i); return st.dir + " " + st.levier + "× · " + mcsPretTxt(st.jos) + "–" + mcsPretTxt(st.sus) + " · " + mcsNr(st.suma, 2) + " USDT"; });
}
function mcsSetariProba(P) { return { jos: +(P * 0.92).toPrecision(5), sus: +(P * 1.08).toPrecision(5), grile: 20, levier: 2, dir: "long", suma: 50, stop: null, tp: null, botulTau: false }; }
function mcsAceleasiSetari(a, b) {
  if (!a || !b) return false; var eq = function (x, y) { return Math.abs(Number(x) - Number(y)) <= 1e-9 * Math.max(1, Math.abs(Number(x))); }, sa = a.stop ? (a.stop.sus || a.stop.jos) : null, sb = b.stop ? (b.stop.sus || b.stop.jos) : null;
  return eq(a.jos, b.jos) && eq(a.sus, b.sus) && eq(a.grile, b.grile) && eq(a.levier, b.levier) && a.dir === b.dir && eq(a.suma, b.suma) && (sa === null ? sb === null : sb !== null && eq(sa, sb)) && (a.tp > 0 ? b.tp > 0 && eq(a.tp, b.tp) : !(b.tp > 0));   // v100.132: și TP-ul
}
// v100.129: variantele pe aceleași drumuri - interval pe jumătate / ×1,5 (același centru), levier ±1, grile ½ / ×2. Stopul se mută cu
// marginea gridului (aceeași distanță de ea), ca să nu ajungă în mijlocul gridului.
function mcsVariante(st) {
  var c = (st.jos + st.sus) / 2, w = (st.sus - st.jos) / 2;
  function cu(o) {
    var x = Object.assign({}, st, o, { botulTau: false });
    if (st.stop && (o.jos != null || o.sus != null)) {
      // revizia: un stop scris ÎN grid (distanță negativă) ajunge la margine, nu rămâne înăuntru; sub zero ⇒ proporțional cu jos
      x.stop = st.stop.sus ? { sus: x.sus + Math.max(0, st.stop.sus - st.sus) } : { jos: x.jos - Math.max(0, st.jos - st.stop.jos) };
      if (x.stop.jos != null && !(x.stop.jos > 0)) x.stop = { jos: x.jos * Math.min(1, st.stop.jos / st.jos) };
    }
    // v100.132: TP-ul se mută și el cu marginea de pe partea profitului (aceeași distanță), ca să nu ajungă în grid
    if (st.tp > 0 && (o.jos != null || o.sus != null)) {
      if (st.dir === "long") x.tp = x.sus + Math.max(0, st.tp - st.sus);
      else if (st.dir === "short") { x.tp = x.jos - Math.max(0, st.jos - st.tp); if (!(x.tp > 0)) x.tp = x.jos * Math.min(1, st.tp / st.jos); }
    }
    return x;
  }
  var j15 = c - 1.5 * w, l = [{ nume: "așa cum e", st: st }, { nume: "mai îngust (jumătate din interval)", st: cu({ jos: c - w / 2, sus: c + w / 2 }) }, { nume: j15 > 0 ? "mai larg (×1,5)" : "mai larg (jos pe jumătate)", st: cu({ jos: j15 > 0 ? j15 : st.jos / 2, sus: c + 1.5 * w }) }];
  if (st.levier > 1) l.push({ nume: "levier mai mic", st: cu({ levier: st.levier - 1 }) });
  l.push({ nume: "levier mai mare", st: cu({ levier: st.levier + 1 }) });
  if (Math.max(2, Math.round(st.grile / 2)) !== st.grile) l.push({ nume: "jumătate din grile", st: cu({ grile: Math.max(2, Math.round(st.grile / 2)) }) });
  l.push({ nume: "dublu de grile", st: cu({ grile: st.grile * 2 }) });
  return l;
}
// aceeași sămânță ca botul ⇒ aceleași drumuri pentru toate (diferența dintre rânduri vine din setări, nu din noroc); o.prima = cardul deja calculat
function mcsCalcVariante(b15, st, P, o) {
  o = o || {};
  var rows = mcsVariante(st).map(function (v, i) { return { nume: v.nume, st: v.st, g: i === 0 && o.prima && o.prima.drumuri ? o.prima : MonteSimbol.grid(b15, Object.assign({ pret: P }, v.st), { zile: 7, n: o.n || 500, seed: 12, faraCuTendinta: true, peDrum: true }) }; });
  var baza = rows[0].g && rows[0].g.drumuri;
  rows.slice(1).forEach(function (x) { x.drum = x.g && !x.g.eroare ? mcsDrumCuDrum(baza, x.g.drumuri) : null; });
  return rows;
}
// v100.130: drum cu drum (aceleași drumuri, aceeași ordine): în câte e varianta mai bună / mai rea decât a ta; sub 1 cent = la fel.
// Mijlocul poate ieși mai bun dintr-o coadă norocoasă; „mai bună în majoritatea drumurilor” e o probă mai tare (testul semnului).
function mcsDrumCuDrum(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return null;
  var bun = 0, rau = 0;
  for (var i = 0; i < a.length; i++) { var dd = b[i] - a[i]; if (dd > 0.005) bun++; else if (dd < -0.005) rau++; }
  return { maiBun: bun / a.length, maiRau: rau / a.length, egal: (a.length - bun - rau) / a.length };
}
// „ce aș face eu”: alta doar dacă e mai bună cu cel puțin 1 USDT și 2% din sumă (sub atât e zgomot), fără lichidare peste 2%
// revizia (R1): ȘI coada de jos (5%) nu mai rea, ȘI pe plus cel puțin la fel de des - altfel e doar un pariu mai mare (levierul umflă și câștigul, și pierderea)
function mcsVariantaBuna(rows) {
  var b = rows[0], prag = Math.max(1, 0.02 * (Number(b.st && b.st.suma) || 0));
  // v100.130: ȘI mai bună decât a ta în mai multe drumuri decât mai rea (altfel mijlocul mai bun vine din câteva drumuri norocoase)
  var bune = rows.slice(1).filter(function (x) { return x.g && !x.g.eroare && x.g.pLichidare <= 0.02 && x.g.p50 - b.g.p50 >= prag && !(x.g.p5 < b.g.p5) && !(x.g.pPlus < b.g.pPlus) && !(x.drum && x.drum.maiBun <= x.drum.maiRau); }).sort(function (x, y) { return y.g.p50 - x.g.p50; });
  // mijloacele la fel în limita pragului (zgomot) ⇒ câștigă cea mai bună drum cu drum (PONS 07.10: ½ grile, mai bună în 99%, față de levier −1, în 72%)
  var marja = function (x) { return x.drum ? x.drum.maiBun - x.drum.maiRau : 0; }, c = bune[0];
  // revizia (R6): toate față de cea mai bună pe mijloc (bune[0]), nu față de ultima aleasă - altfel alunecă din aproape în aproape
  bune.forEach(function (x) { if (c && x.g.p50 >= bune[0].g.p50 - prag && marja(x) > marja(c)) c = x; });
  // toate pe minus ⇒ se spune: setarea „mai bună” doar pierde mai puțin (problema e botul pe moneda asta, nu setarea)
  var toate = rows.every(function (x) { return !x.g || x.g.eroare || x.g.p50 < 0; });
  if (!c) return "Păstrează-l așa: nicio variantă nu iese clar mai bună (cu cel puțin " + mcsBani1(prag) + " de obicei) pe aceleași drumuri, fără să pună mai mult la risc." + (toate ? " Dar toate variantele ies de obicei pe minus: problema e botul pe moneda asta acum, nu setarea." : "");
  return "Aș încerca „" + c.nume + "”: de obicei " + mcsBani1(c.g.p50) + " în loc de " + mcsBani1(b.g.p50) + ", pe plus în " + mcsPr(c.g.pPlus) + " din drumuri"
    + (c.drum ? ", mai bună decât a ta în " + mcsPr(c.drum.maiBun) + " din drumuri (mai rea în " + mcsPr(c.drum.maiRau) + ")" : "") + ". Pe istoria scurtă a monedei, nu o promisiune."
    + (c.g.p50 < 0 ? " Atenție: și așa iese de obicei pe minus" + (toate ? " - toate variantele pierd pe drumurile astea, una doar mai puțin decât alta." : ".") : "");
}
// v100.132: ținte (TP) pentru bot pe aceleași drumuri - fără TP, la marginea gridului, +¼, +½, +1 lățime de grid pe partea profitului
// (long deasupra, short dedesubt) + TP-ul lui; rândul lui (sau „fără TP” dacă n-are) e cel de sus. La neutru: nimic
// revizia (R1): P = prețul de acum - un nivel deja atins (long ≤ P, short ≥ P) ar închide botul pe prima bară („TP atins 100%”); îl scot
function mcsTinteBot(st, P) {
  if (!st || (st.dir !== "long" && st.dir !== "short")) return [];
  var w = st.sus - st.jos, lg = st.dir === "long", e = lg ? st.sus : st.jos, l = [{ nume: "fără TP", tp: null }];
  var dincolo = function (v) { return !(P > 0) || (lg ? v > P : v < P); };
  [[0, "la marginea gridului"], [0.25, "+¼ din grid"], [0.5, "+½ din grid"], [1, "+1 grid"]].forEach(function (k) { var v = lg ? e + k[0] * w : e - k[0] * w; if (v > 0 && dincolo(v)) l.push({ nume: k[1], tp: v }); });
  if (st.tp > 0 && !l.some(function (x) { return x.tp !== null && Math.abs(x.tp - st.tp) <= 1e-9 * Math.max(1, st.tp); })) l.push({ nume: "TP-ul tău", tp: st.tp });
  var cheie = function (x) { return x.tp === null ? -Infinity : lg ? x.tp : -x.tp; };
  l.sort(function (a, b) { return cheie(a) - cheie(b); });
  l.forEach(function (x) { x.tu = st.tp > 0 ? x.tp !== null && Math.abs(x.tp - st.tp) <= 1e-9 * Math.max(1, st.tp) : x.tp === null; });
  return l;
}
// aceeași sămânță (12) și aceleași drumuri ca botul; drum cu drum față de rândul lui
function mcsCalcTinteBot(b15, st, P, o) {
  o = o || {};
  // revizia (R6): rândul tău = cardul botului (o.prima, aceleași drumuri) - o simulare mai puțin
  var prima = o.prima && o.prima.drumuri && o.prima.n === (o.n || 500) ? o.prima : null;
  var rows = mcsTinteBot(st, P).map(function (x) { return { nume: x.nume, tp: x.tp, tu: x.tu, g: x.tu && prima ? prima : MonteSimbol.grid(b15, Object.assign({ pret: P }, st, { tp: x.tp }), { zile: 7, n: o.n || 500, seed: 12, faraCuTendinta: true, peDrum: true }) }; });
  var tu = rows.filter(function (x) { return x.tu; })[0];
  rows.forEach(function (x) { x.drum = x === tu || !tu || !x.g || x.g.eroare ? null : mcsDrumCuDrum(tu.g.drumuri, x.g.drumuri); });
  return rows;
}
// „ce aș face eu” la TP: altul doar cu mijlocul mai bun cu pragul (1 USDT, 2% din sumă), sigur drum cu drum (mcsSigur), fără lichidare
// peste 2% și fără coada de jos mai rea - altfel păstrează și spune de ce
function mcsTpRecomandat(rows, suma) {
  var tu = rows.filter(function (x) { return x.tu; })[0] || rows[0], prag = Math.max(1, 0.02 * (Number(suma) || 0));
  var n = function (x) { return x.tp === null ? "fără TP" : mcsPretTxt(x.tp); };
  if (!tu || !tu.g || tu.g.eroare) return "Nu pot compara: botul n-are rezultat pe drumurile astea.";
  var ok = rows.filter(function (x) { return x !== tu && x.g && !x.g.eroare && x.g.p50 - tu.g.p50 >= prag && mcsSigur(x.drum) && x.g.pLichidare <= 0.02 && !(x.g.p5 < tu.g.p5); }).sort(function (a, b) { return b.g.p50 - a.g.p50; })[0];
  if (ok) return (ok.tp === null ? "Aș scoate TP-ul" : "Aș pune TP-ul la " + n(ok)) + ": de obicei " + mcsBani1(ok.g.p50) + " în loc de " + mcsBani1(tu.g.p50) + ", mai bun în " + mcsPr(ok.drum.maiBun) + " din drumuri (mai rău în " + mcsPr(ok.drum.maiRau) + "), pe aceleași drumuri. Pe istoria scurtă a monedei, nu o promisiune.";
  // revizia (R7): „ca protecție” - pe o urcare urmată de cădere (pump & dump) mijlocul e același, dar TP-ul taie coada de jos (măsurat:
  // 5% sub −29,8 ⇒ +1,3 USDT). Doar un TP (nu scoaterea lui), mijlocul nu mai rău (10 cenți), coada de jos mai bună cu pragul ȘI cu 25%,
  // fără lichidare în plus și nu mai rău în majoritatea drumurilor. Pe mers aleator nu apare (proba (R7b)): acolo TP-ul strică mijlocul
  var prot = rows.filter(function (x) { return x !== tu && x.tp !== null && x.g && !x.g.eroare && x.g.p50 >= tu.g.p50 - 0.1 && x.g.p5 - tu.g.p5 >= Math.max(prag, 0.25 * Math.abs(tu.g.p5)) && x.g.pLichidare <= Math.max(0.02, tu.g.pLichidare) && !(x.drum && x.drum.maiRau > 0.5); }).sort(function (a, b) { return b.g.p5 - a.g.p5; })[0];
  if (prot) return "Aș pune TP-ul la " + n(prot) + " ca protecție: de obicei cam la fel (" + mcsBani1(prot.g.p50) + " față de " + mcsBani1(tu.g.p50) + "), dar în 5% din drumuri cele mai proaste " + mcsBani1(prot.g.p5) + " în loc de " + mcsBani1(tu.g.p5) + " - taie coada de jos (o urcare urmată de cădere)." + (isFinite(prot.g.p95) && isFinite(tu.g.p95) ? " Costul: 5% din drumuri peste " + mcsBani1(prot.g.p95) + " în loc de " + mcsBani1(tu.g.p95) + "." : "") + " Pe istoria scurtă a monedei, nu o promisiune.";
  var nes = rows.filter(function (x) { return x !== tu && x.g && !x.g.eroare && x.g.p50 - tu.g.p50 >= prag; }).sort(function (a, b) { return b.g.p50 - a.g.p50; })[0];
  return (tu.tp === null ? "Rămâi fără TP" : "Păstrează TP-ul la " + n(tu)) + ": " + (nes ? n(nes) + " are mijlocul mai bun (" + mcsBani1(nes.g.p50) + " față de " + mcsBani1(tu.g.p50) + ")" + (nes.drum ? ", mai bun în " + mcsPr(nes.drum.maiBun) + " din drumuri, mai rău în " + mcsPr(nes.drum.maiRau) + ", la fel în " + mcsPr(nes.drum.egal) : "") + (nes.g.pLichidare > 0.02 ? ", dar cu lichidare în " + mcsPr(nes.g.pLichidare) : nes.g.p5 < tu.g.p5 ? ", dar coada de jos e mai rea (" + mcsBani1(nes.g.p5) + ")" : "") + " - nu destul de sigur ca să-l schimb" : "niciun alt TP nu iese mai bine cu cel puțin " + mcsNr(prag, 1) + " USDT de obicei") + ". Un TP aproape încasează des puțin și oprește botul; unul departe îl lasă să lucreze - de obicei unul strică mijlocul, celălalt coada de jos: de aceea recomand rar alt TP.";
}
// tabelul TP la cerere (ca variantele)
function mcsTpHtml(r) {
  var st = r.setari; if (!st) return "";
  if (st.dir !== "long" && st.dir !== "short") return '<p class="tbSub mcsNota">La neutru, botul n-are o parte a profitului: ținta (TP) nu se compară.</p>';
  if (r.tinteBotInLucru) return '<p class="tbSub mcsNota">calculez țintele (TP) pe aceleași drumuri…</p>';
  if (r.tinteBotEroare) return '<p class="tbWarn mcsNota">' + mcsEsc(r.tinteBotEroare) + '</p>';
  if (!r.tinteBot) return '<p class="mcsNota mcsVarBut"><button type="button" class="t212BtnLinie" data-action-click="mcsComparaTp()">Compară ținte (TP) pe aceleași drumuri</button> <span class="tbSub">fără TP, la marginea gridului, +¼ / +½ / +1 lățime de grid (câteva secunde)</span></p>';
  var rows = r.tinteBot;
  return '<div class="mcsVarBloc"><h5>' + mcsEsc("Altă țintă (TP), aceleași drumuri (" + (st.dir === "long" ? "deasupra gridului" : "sub grid") + ")") + '</h5><div class="rlTab"><table class="t212Tab mcsVar"><thead><tr><th>TP</th><th>De obicei</th><th>Pe plus</th><th>TP atins</th><th>Stop atins</th><th>Lichidare</th><th>5% sub</th><th>Drum cu drum</th></tr></thead><tbody>'
    + rows.map(function (x) {
      var g = x.g || {}, er = !x.g || g.eroare, dd = x.drum;
      var dc = x.tu || !dd ? '<td class="tbSub">—</td>' : '<td class="' + (dd.maiBun > dd.maiRau ? "good" : dd.maiRau > dd.maiBun ? "bad" : "") + '">mai bun în ' + mcsPr(dd.maiBun) + '<span class="t212Mic">mai rău în ' + mcsPr(dd.maiRau) + '</span></td>';
      return '<tr' + (x.tu ? ' class="mcsVarTu"' : '') + '><td>' + mcsEsc(x.tp === null ? "fără TP" : mcsPretTxt(x.tp)) + '<span class="t212Mic">' + mcsEsc(x.tu ? "al tău" : x.nume) + '</span></td>'
        + (er ? '<td colspan="7" class="tbSub">' + mcsEsc(g && g.eroare || "fără date") + '</td>' : '<td class="' + mcsCls(Math.round(g.p50 * 10) / 10) + '">' + mcsBani1(g.p50) + '</td><td>' + mcsPr(g.pPlus) + '</td><td>' + (x.tp === null ? "—" : mcsPr(g.pTp)) + '</td><td>' + (st.stop ? mcsPr(g.pStop) : "fără stop") + '</td><td class="' + (g.pLichidare > 0.02 ? "bad" : "") + '">' + mcsPr(g.pLichidare) + '</td><td>' + mcsBani1(g.p5) + '</td>' + dc) + '</tr>';
    }).join("") + '</tbody></table></div>'
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + mcsEsc(mcsTpRecomandat(rows, st.suma)) + '</p>'
    + '<p class="tbSub">Același bot, aceleași drumuri; se schimbă doar TP-ul (botul se închide când prețul îl atinge). În Pionex: „Take profit” la prețul de mai sus.</p></div>';
}
function mcsRitm(l, acum) { return Math.max(1, l.filter(function (x) { return x.inchis >= acum - 30 * 864e5; }).length); }
// istoria pe coin: arhiva boților Pionex (ca pagina Riscului, RiscLuna.bazinBoti), doar moneda aleasă; banii = randamentul × suma
function mcsIstorieCoin(arhiva, sim, acum, alias) {
  var nume = [sim].concat(Array.isArray(alias) ? alias : []);
  var bz = typeof RiscLuna !== "undefined" ? RiscLuna.bazinBoti((Array.isArray(arhiva) ? arhiva : []).filter(function (x) { return x && nume.indexOf(String(x.base || "").replace(/\.PERP$/, "").toUpperCase()) >= 0; })) : [];
  var l = bz.map(function (x) { return { t: x.t, inchis: x.inchis, bani: x.r * x.inv, ore: x.ore, dir: x.dir, lev: x.lev, inv: x.inv }; }), K = mcsRitm(l, acum);
  return { l: l, unit: "USDT", K: K, r: MonteSimbol.istorie(l, { K: K, n: 2000, seed: 7 }) };
}
// istoria pe stock: trade-urile T212 închise (T212.perechi, rezultatul în lei), după simbolul T212 (RHM.DE ⇒ și RHM)
function mcsIstorieStock(umpleri, sim, acum) {
  var s2 = sim.replace(/\..*$/, ""), inch = typeof T212 !== "undefined" ? T212.perechi(Array.isArray(umpleri) ? umpleri : []).inchise : [];
  var l = inch.filter(function (x) { var s = String(x.simbol || "").toUpperCase(); return s === sim || s === s2; })
    .map(function (x) { return { t: x.pornit, inchis: x.inchis, bani: x.rezultat, ore: x.durataOre, dir: "long", lev: 1, inv: x.cost }; }), K = mcsRitm(l, acum);
  return { l: l, unit: "lei", K: K, r: MonteSimbol.istorie(l, { K: K, n: 2000, seed: 7 }) };
}

// ---------------- desenul (pur) ----------------
// histograma: o singură culoare, liniile 5% / mijloc / 95% etichetate direct, zero punctat
function mcsHist(h, marcaje, fmt) {
  if (!h || !h.c) return "";
  var W = 420, H = 96, pad = 16, k = h.c.length, max = Math.max.apply(null, h.c), bw = (W - 2 * pad) / k, x = function (v) { return pad + (v - h.lo) / (h.hi - h.lo) * (W - 2 * pad); };
  var s = '<svg class="mcsHist" viewBox="0 0 ' + W + ' ' + (H + 30) + '" width="100%" role="img" aria-label="cum se împart rezultatele drumurilor">';
  h.c.forEach(function (c, i) { var bh = max ? c / max * H : 0; s += '<rect x="' + (pad + i * bw + 1).toFixed(1) + '" y="' + (H - bh).toFixed(1) + '" width="' + Math.max(0.5, bw - 2).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" class="mcsBara"><title>' + c + ' drumuri</title></rect>'; });
  if (h.lo < 0 && h.hi > 0) s += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="0" y2="' + H + '" class="mcsZero"/>';
  marcaje.forEach(function (m, i) { var xx = Math.max(pad, Math.min(W - pad, x(m.v))); s += '<line x1="' + xx + '" x2="' + xx + '" y1="0" y2="' + (H + 4) + '" class="mcsMarc ' + m.c + '"/><text x="' + xx + '" y="' + (H + 15 + (i % 2) * 12) + '" text-anchor="' + (i === 0 ? "start" : i === marcaje.length - 1 ? "end" : "middle") + '">' + mcsEsc(m.t + " " + fmt(m.v)) + '</text>'; });
  return s + '</svg>';
}
function mcsCif(et, v, cls) { return '<div class="mcsCif"><span>' + mcsEsc(et) + '</span><b class="' + (cls || "") + '">' + mcsEsc(v) + '</b></div>'; }
function mcsRand(et, v, cls) { return '<div class="mcsRand"><span>' + mcsEsc(et) + '</span><b class="' + (cls || "") + '">' + mcsEsc(v) + '</b></div>'; }
function mcsCartPret(o, m, unit, poz) {
  var mk = [{ v: o.p5, t: "5%", c: "bad" }, { v: o.p50, t: "mijloc", c: "mijl" }, { v: o.p95, t: "95%", c: "good" }];
  return '<div class="mcsCart"><h5>Peste ' + mcsEsc(mcsCate(o.H, unit === "b" ? "zi de bursă" : "zi", unit === "b" ? "zile de bursă" : "zile")) + '</h5>'
    + (o.scurt ? '<p class="mcsAvert">Istoricul e scurt față de orizont: la ' + mcsEsc(unit === "b" ? mcsCate(o.H, "zi de bursă", "zile de bursă") : mcsCate(o.H, "zi", "zile")) + ' simularea doar reamestecă aceleași zile. Citește cifrele ca o schiță.</p>' : '')
    + '<div class="mcsCifre">' + mcsCif("5% din drumuri, sub", mcsPct1(o.p5), "bad") + mcsCif("mijlocul", mcsPct1(o.p50), mcsCls(Math.round(o.p50 * 1000) / 1000)) + mcsCif("5% din drumuri, peste", mcsPct1(o.p95), "good") + '</div>'
    + mcsHist(o.hist, mk, mcsPct1)
    + (poz && o.pIntrare !== undefined ? mcsRand("atinge prețul tău de intrare (" + mcsPretTxt(poz.intrare) + ") măcar o dată", mcsPr(o.pIntrare)) + mcsRand("la capăt peste intrare, fără să fi atins stopul (−" + mcsNr(m.stopPct * 100, 1) + "%)", mcsPr(o.pPesteIntrareStop), o.pPesteIntrareStop >= 0.5 ? "good" : "bad") + mcsRand("la capăt peste intrare, fără stop", mcsPr(o.pPesteIntrare)) : "")
    + mcsRand("urcă cu " + Math.round(m.prag * 100) + "% sau mai mult", mcsPr(o.pSus)) + mcsRand("scade cu " + Math.round(m.prag * 100) + "% sau mai mult", mcsPr(o.pJos))
    + '<div class="mcsCine"><span class="tbSub">Dacă intri azi: stopul (−' + mcsNr(m.stopPct * 100, 1) + '%) sau ținta (+' + mcsNr(m.tintaPct * 100, 1) + '%), care vine întâi?</span>'
    + '<div class="mcsBaraSt"><i class="s" style="width:' + (o.pStop * 100).toFixed(1) + '%"></i><i class="t" style="width:' + (o.pTinta * 100).toFixed(1) + '%"></i><i class="n" style="width:' + (o.pNiciuna * 100).toFixed(1) + '%"></i></div>'
    + '<div class="mcsLeg"><span class="bad">■ stopul întâi ' + mcsPr(o.pStop) + '</span><span class="good">■ ținta întâi ' + mcsPr(o.pTinta) + '</span>' + (o.pNiciuna >= 0.005 ? '<span>■ niciuna ' + mcsPr(o.pNiciuna) + '</span>' : '') + '</div></div>'
    + (o.cuTendinta ? '<p class="tbSub">Cu tendința perioadei păstrată (dacă ar continua ca până acum): mijlocul ' + mcsPct1(o.cuTendinta.p50) + ', stopul întâi ' + mcsPr(o.cuTendinta.pStop) + '.</p>' : '')
    + '</div>';
}
function mcsPretHtml(r) {
  var m = r.pretMc;
  if (!m || m.eroare) return '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>📈 Încotro poate merge prețul</h4></div><p class="tbWarn mcsNota">' + mcsEsc(m && m.eroare || "fără date") + '</p></section>';
  return '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>📈 Încotro poate merge prețul</h4><span class="tbSub">' + mcsEsc(m.n.toLocaleString("ro-RO") + " de drumuri din " + mcsCate(m.zileIstoric, "zi", "zile") + " de istoric · bucăți reale de câte " + mcsCate(m.blocZile, "zi", "zile") + " · prețul de acum " + mcsPretTxt(r.pret)) + '</span></div>'
    + (r.poz ? '<p class="t212Fac mcsPoz">' + mcsEsc("Poziția ta: ai intrat la " + mcsPretTxt(r.poz.intrare) + ", acum " + mcsPretTxt(r.poz.pret) + " (" + mcsPct1(r.poz.pret / r.poz.intrare - 1) + ")" + (r.poz.stop > 0 ? "; stopul poziției " + mcsPretTxt(r.poz.stop) + (r.poz.stop >= r.poz.pret ? " (DEPĂȘIT: prețul e sub el)" : "") : "") + ". Mai jos: cât de des atinge prețul tău de intrare și cât de des ești peste el la capăt.") + '</p>' : '')
    + (m.faraTendinta ? '<p class="tbSub mcsNota">În ' + mcsEsc(mcsCate(m.zileIstoric, "zi", "zile")) + ', ' + mcsEsc(r.sim) + ' a mers în medie ' + mcsPct1(m.tendintaPeZi) + ' pe zi. Drumurile păstrează agitația reală, dar nu repetă tendința perioadei: o cădere (sau o urcare) care a fost nu se „prezice” mai departe.</p>' : '')
    + mcsOrizHtml(r)
    + '<div class="mcsStopTinta"><label>Stopul, % sub prețul de acum <input id="mcsStop" inputmode="decimal" value="' + mcsNr(m.stopPct * 100, 1) + '"></label><label>Ținta, % peste <input id="mcsTinta" inputmode="decimal" value="' + mcsNr(m.tintaPct * 100, 1) + '"></label>'
    + '<button type="button" class="t212BtnLinie" data-action-click="mcsResimuleaza()">Refă simularea</button><span class="tbSub">' + mcsEsc(r.nivelText || "") + '</span></div>'
    + '<div class="mcsDoua">' + m.orizonturi.map(function (o) { return mcsCartPret(o, m, r.tip === "stock" ? "b" : "z", r.poz); }).join("") + '</div>'
    + mcsNiveluriHtml(m, r.tip === "stock" ? "b" : "z", "stop") + mcsNiveluriHtml(m, r.tip === "stock" ? "b" : "z", "tinta")
    + '<p class="tbSub mcsNota">Aceeași zi atinge și stopul, și ținta ⇒ se numără stopul (pesimist).</p></section>';
}
// v100.131: „N zile” - la acțiuni zile de bursă (u = "b"), la coinuri zile (u = "z")
function mcsZileTxt(n, u) { return u === "z" ? mcsCate(n, "zi", "zile") : mcsCate(n, "zi de bursă", "zile de bursă"); }
// v100.130: „ce aș face eu” la stop. Cu ținta fixă, „stopul întâi” e o cursă stop – țintă: pe drumuri fără tendință iese cam
// ținta / (stop + țintă) la orice stop (RHM.DE 07.10: 71% la −4,6% cu ținta +9,1%), deci nu spune care stop e „bun”. Ce contează e
// rezultatul mediu: aproape același (sub 1 punct) ⇒ păstrează stopul de sus și spune ce schimbă stopul; altfel cel cu media clar mai bună.
// revizia v100.131 (R1): „sigur” = din drumurile în care nivelurile DIFERĂ, cel puțin 70% mai bune. „> 0,5 din toate” nu putea recomanda
// nimic (la ținte cele mai multe drumuri ies la egalitate: 0 din 40 pe serii cu momentum); „bune > rele” dădea 3% alarme false.
// Cu 70%: 200 de serii fără avantaj ⇒ cel mult 1%, serii cu momentum ⇒ cam jumătate prinse (proba-v100131 (3e)/(3f))
function mcsSigur(d) { var x = d ? d.maiBun + d.maiRau : 0; return x > 0 && d.maiBun / x >= 0.7; }
// nivelul de sus: după semnul ref (din MonteSimbol.pret), altfel după toleranță
function mcsRandSus(rows, eTu) { return rows.filter(function (x) { return x.ref === true; })[0] || rows.filter(eTu)[0] || rows[0]; }
// partea din mijloc a lui „Păstrează …”: un nivel cu media mai bună cu 1 punct dar nesigur se spune ca atare (revizia R2: textul vechi
// zicea „câteva drumuri” chiar când tabelul îl colora în verde)
function mcsDeCePastrez(rows, tu, p, gen) {
  var best = rows.slice().sort(function (x, y) { return y.media - x.media; })[0], lo = Math.min.apply(null, rows.map(function (s) { return s.media; }));
  var nes = rows.filter(function (x) { return x !== tu && x.media - tu.media >= 0.01; }).sort(function (x, y) { return y.media - x.media; })[0];
  if (nes) return p(nes) + " are media mai bună (" + mcsPct1(nes.media) + " față de " + mcsPct1(tu.media) + ")" + (nes.drum ? ": " + (gen === "f" ? "mai bună" : "mai bun") + " în " + mcsPr(nes.drum.maiBun) + " din drumuri, " + (gen === "f" ? "mai rea" : "mai rău") + " în " + mcsPr(nes.drum.maiRau) + ", la fel în " + mcsPr(nes.drum.egal) : "") + " - nu destul de sigur ca " + (gen === "f" ? "s-o" : "să-l") + " schimb";
  return best.media - lo < 0.01 ? "pe drumurile fără tendință, rezultatul mediu e aproape același la toate (între " + mcsPct1(lo) + " și " + mcsPct1(best.media) + ")" : "niciun alt nivel nu are media mai bună cu cel puțin 1 punct (între " + mcsPct1(lo) + " și " + mcsPct1(best.media) + ")";
}
function mcsStopRecomandat(rows, zile, spSus, u) {
  var tu = mcsRandSus(rows, function (s) { return Math.abs(s.sp - spSus) < 5e-4; }), prim = rows[0], ult = rows[rows.length - 1];
  var p = function (s) { return "−" + mcsNr(s.sp * 100, 1) + "%"; };
  // revizia (R1): alt stop doar dacă media e mai bună cu 1 punct ȘI e sigur drum cu drum (mcsSigur) (proba (4e) din v100.130: pe
  // serii fără avantaj, media singură recomanda „−15%” în 13–27 din 40); altfel păstrează stopul de sus
  // v100.131: „majoritatea drumurilor” = peste jumătate din TOATE (nu doar mai multe bune decât rele: la ținte, cele mai multe drumuri
  // ies la egalitate - 200 de serii fără avantaj dădeau 3% „Aș lua +24%” cu „mai bună în 29%, mai rea în 12%”)
  var alt = rows.filter(function (s) { return s !== tu && s.media - tu.media >= 0.01 && mcsSigur(s.drum); }).sort(function (x, y) { return y.media - x.media; })[0];
  if (alt) return "Aș lua " + p(alt) + ": rezultatul mediu " + mcsPct1(alt.media) + ", față de " + mcsPct1(tu.media) + " la stopul de sus (" + p(tu) + "), și iese mai bun în " + mcsPr(alt.drum.maiBun) + " din drumuri (mai rău în " + mcsPr(alt.drum.maiRau) + "), pe aceleași drumuri în " + mcsZileTxt(zile, u) + ". Pe istoria ei reluată, nu o promisiune.";
  return "Păstrează stopul de sus (" + p(tu) + "): " + mcsDeCePastrez(rows, tu, p, "m") + ". Stopul schimbă doar cât de des ieși (" + mcsPr(prim.pStop) + " la " + p(prim) + ", " + mcsPr(ult.pStop) + " la " + p(ult) + ") și cât pierzi într-un drum prost (5% sub: " + mcsPct1(prim.p5) + " față de " + mcsPct1(ult.p5) + "). Alege-l după cât poți pierde o dată și potrivește mărimea poziției.";
}
// v100.131: la fel pentru țintă (stopul de sus fix): alta doar cu media mai bună cu 1 punct ȘI mai bună în majoritatea drumurilor -
// pe drumuri fără tendință, o țintă aproape vine des dar aduce puțin, una departe invers: media rămâne cam aceeași
function mcsTintaRecomandata(rows, zile, tpSus, u) {
  var tu = mcsRandSus(rows, function (t) { return Math.abs(t.tp - tpSus) < 5e-4; }), prim = rows[0], ult = rows[rows.length - 1];
  var p = function (t) { return "+" + mcsNr(t.tp * 100, 1) + "%"; };
  var alt = rows.filter(function (t) { return t !== tu && t.media - tu.media >= 0.01 && mcsSigur(t.drum); }).sort(function (x, y) { return y.media - x.media; })[0];
  if (alt) return "Aș lua ținta " + p(alt) + ": rezultatul mediu " + mcsPct1(alt.media) + ", față de " + mcsPct1(tu.media) + " la ținta de sus (" + p(tu) + "), și iese mai bună în " + mcsPr(alt.drum.maiBun) + " din drumuri (mai rea în " + mcsPr(alt.drum.maiRau) + "), pe aceleași drumuri în " + mcsZileTxt(zile, u) + ". Pe istoria reluată, nu o promisiune.";
  return "Păstrează ținta de sus (" + p(tu) + "): " + mcsDeCePastrez(rows, tu, p, "f") + ". Ținta schimbă doar cât de des o atingi (" + mcsPr(prim.pTinta) + " la " + p(prim) + ", " + mcsPr(ult.pTinta) + " la " + p(ult) + ") și cât iei o dată: una aproape vine des, dar aduce puțin.";
}
// v100.130 / v100.131: tabelul „alt stop” (fel = "stop") sau „altă țintă” (fel = "tinta") pe aceleași drumuri, pe orizontul cel mai lung,
// cu „drum cu drum” față de nivelul de sus
function mcsNiveluriHtml(m, u, fel) {
  var o = m.orizonturi[m.orizonturi.length - 1], st = fel === "stop", rows = o && (st ? o.stopuri : o.tinte);
  if (!rows || !rows.length) return "";
  var atr = st && m.atrPct > 0 ? m.atrPct : null, kAtr = function (x) { var k = Math.round(x.sp / atr * 10) / 10; return mcsNr(k, k % 1 ? 1 : 0) + "× ATR"; };
  var titlu = st ? "Alt stop, aceleași drumuri (" + mcsZileTxt(o.H, u) + ", ținta +" + mcsNr(m.tintaPct * 100, 1) + "%" + (atr ? "; ATR " + mcsNr(atr * 100, 1) + "% pe zi" : "") + ")" : "Altă țintă, aceleași drumuri (" + mcsZileTxt(o.H, u) + ", stopul −" + mcsNr(m.stopPct * 100, 1) + "%)";
  var cap = st ? "<th>Stopul</th><th>Stopul întâi</th><th>Ținta întâi</th>" : "<th>Ținta</th><th>Ținta întâi</th><th>Stopul întâi</th>";
  return '<div class="mcsVarBloc"><h5>' + mcsEsc(titlu) + '</h5><div class="rlTab"><table class="t212Tab mcsVar"><thead><tr>' + cap + '<th>Niciuna</th><th>Rezultatul mediu</th><th>5% sub</th><th>Drum cu drum</th></tr></thead><tbody>'
    + rows.map(function (x) {
      var tu = typeof x.ref === "boolean" ? x.ref : st ? Math.abs(x.sp - m.stopPct) < 5e-4 : Math.abs(x.tp - m.tintaPct) < 5e-4, dd = x.drum;
      var niv = st ? "−" + mcsNr(x.sp * 100, 1) + "%" : "+" + mcsNr(x.tp * 100, 1) + "%";
      var p1 = st ? '<td class="' + (x.pStop > 0.5 ? "bad" : "") + '">' + mcsPr(x.pStop) + '</td><td>' + mcsPr(x.pTinta) + '</td>' : '<td>' + mcsPr(x.pTinta) + '</td><td class="' + (x.pStop > 0.5 ? "bad" : "") + '">' + mcsPr(x.pStop) + '</td>';
      var dc = tu || !dd ? '<td class="tbSub">—</td>' : '<td class="' + (dd.maiBun > dd.maiRau ? "good" : dd.maiRau > dd.maiBun ? "bad" : "") + '">' + (st ? "mai bun în " : "mai bună în ") + mcsPr(dd.maiBun) + '<span class="t212Mic">' + (st ? "mai rău în " : "mai rea în ") + mcsPr(dd.maiRau) + '</span></td>';
      var eti = [tu ? (st ? "cel de sus" : "cea de sus") : "", atr ? kAtr(x) : ""].filter(Boolean).join(" · ");
      return '<tr' + (tu ? ' class="mcsVarTu"' : '') + '><td>' + niv + (eti ? '<span class="t212Mic">' + eti + '</span>' : '') + '</td>' + p1 + '<td>' + mcsPr(x.pNiciuna) + '</td><td class="' + mcsCls(Math.round(x.media * 1000) / 1000) + '">' + mcsPct1(x.media) + '</td><td>' + mcsPct1(x.p5) + '</td>' + dc + '</tr>';
    }).join("") + '</tbody></table></div>'
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + mcsEsc(st ? mcsStopRecomandat(rows, o.H, m.stopPct, u) : mcsTintaRecomandata(rows, o.H, m.tintaPct, u)) + '</p>'
    + '<p class="tbSub">' + (st ? "Rezultatul: ieși la stop (sau la deschidere, dacă prețul sare peste el), la țintă, altfel la capăt. Toate stopurile pe aceleași drumuri, deci diferențele vin din stop, nu din noroc." : "Aceeași socoteală, cu stopul de sus fix și ținta schimbată; „drum cu drum” = în câte drumuri iese mai bine decât ținta de sus.") + '</p></div>';
}
function mcsGridHtml(r) {
  if (r.tip !== "coin") return '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>🤖 Un bot grid</h4></div><p class="tbSub mcsNota">Doar la coinuri (Pionex). ' + mcsEsc(r.sim) + ' e o acțiune.</p></section>';
  var g = r.grid, st = r.setari || {};
  var form = '<div class="mcsSetari"><label>Jos <input id="mcsJos" inputmode="decimal" value="' + mcsEsc(st.jos) + '"></label><label>Sus <input id="mcsSus" inputmode="decimal" value="' + mcsEsc(st.sus) + '"></label>'
    + '<label>Intervale (în Pionex scrii N+1 linii) <input id="mcsGrile" inputmode="numeric" value="' + mcsEsc(st.grile) + '"></label><label>Levier <input id="mcsLevier" inputmode="numeric" value="' + mcsEsc(st.levier) + '"></label>'
    + '<label>Direcția <select id="mcsDir">' + ["long", "short", "neutru"].map(function (d) { return '<option' + (st.dir === d ? ' selected' : '') + '>' + d + '</option>'; }).join("") + '</select></label>'
    + '<label>Suma, USDT <input id="mcsSuma" inputmode="decimal" value="' + mcsEsc(st.suma) + '"></label>'
    + '<label>Stop <input id="mcsStopBot" inputmode="decimal" placeholder="fără" value="' + mcsEsc(st.stop ? (st.stop.sus || st.stop.jos) : "") + '"></label>'
    + (st.dir === "neutru" ? '<label>TP (take profit) <input id="mcsTpBot" inputmode="decimal" placeholder="la neutru nu" value="" disabled></label>'   // revizia (R5)
      : '<label>TP (take profit) <input id="mcsTpBot" inputmode="decimal" placeholder="fără" value="' + mcsEsc(st.tp > 0 ? st.tp : st.tpIgnorat > 0 ? st.tpIgnorat : "") + '"></label>')
    + '<button type="button" class="t212BtnLinie" data-action-click="mcsResimuleaza()">Refă simularea</button></div>'
    + (st.tpIgnorat > 0 ? '<p class="tbWarn mcsNota">' + mcsEsc("TP-ul (" + mcsPretTxt(st.tpIgnorat) + ") e de partea greșită a prețului pentru " + st.dir + ": nu-l pun în simulare. La long, TP-ul e deasupra prețului de acum; la short, dedesubt.") + '</p>' : '')
    + (st.tpAprox ? '<p class="tbSub mcsNota">TP-ul tău e în procente din investiție: prețul de aici e cel socotit de Pionex pentru botul care rulează; pentru un bot pornit azi e aproximativ.</p>' : '');
  if (r.boti && r.boti.length > 1) form = '<label class="mcsBotAles tbSub">' + mcsEsc("ai " + mcsCate(r.boti.length, "bot activ", "boți activi") + " pe " + r.sim + "; îl simulez pe:") + ' <select id="mcsBotAles" data-action-change="mcsAlegeBot(this.value)">'
    + r.boti.map(function (t, i) { return '<option value="' + i + '"' + (i === (r.botIdx || 0) ? ' selected' : '') + '>' + mcsEsc(t) + '</option>'; }).join("") + '</select></label>' + form;
  var cap = '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>🤖 ' + (st.botulTau ? "Un bot grid ca al tău, pornit azi" : "Un bot grid pe " + mcsEsc(r.sim) + " (setări de probă - schimbă-le)") + '</h4>'
    + (g && !g.eroare ? '<span class="tbSub">' + mcsEsc(g.n.toLocaleString("ro-RO") + " de drumuri de " + mcsCate(g.zile, "zi", "zile") + " pe 15 minute · același simulator ca fișa Grid (grilele, comisioanele, lichidarea)") + '</span>' : '') + '</div>' + form;
  if (!g || g.eroare) return cap + '<p class="tbWarn mcsNota">' + mcsEsc(g && g.eroare || "fără date") + '</p></section>';
  var mk = [{ v: g.p5, t: "5%", c: "bad" }, { v: g.p50, t: "mijloc", c: "mijl" }, { v: g.p95, t: "95%", c: "good" }], stopV = st.stop ? (st.stop.sus || st.stop.jos) : null;
  return cap + '<div class="mcsDoua"><div class="mcsCart"><h5>' + mcsEsc(st.dir + " " + st.levier + "× · " + mcsPretTxt(st.jos) + "–" + mcsPretTxt(st.sus) + " · " + mcsCate(st.grile, "grilă", "grile") + " · " + mcsNr(st.suma, 2) + " USDT" + (stopV ? " · stop la " + mcsPretTxt(stopV) : "") + (st.tp > 0 ? " · TP la " + mcsPretTxt(st.tp) : "")) + '</h5>'
    + '<div class="mcsCifre">' + mcsCif("5% din drumuri, sub", mcsBani1(g.p5), "bad") + mcsCif("de obicei (mijlocul)", mcsBani1(g.p50), mcsCls(Math.round(g.p50 * 10) / 10)) + mcsCif("5% din drumuri, peste", mcsBani1(g.p95), "good") + '</div>'
    + mcsHist(g.hist, mk, function (v) { return mcsBani1(v); }) + '</div>'
    + '<div class="mcsCart"><h5>Cât de des, în ' + mcsEsc(mcsCate(g.zile, "zi", "zile")) + '</h5>'
    + mcsRand("lichidare", mcsPr(g.pLichidare), g.pLichidare > 0.02 ? "bad" : "good") + (stopV ? mcsRand("atinge stopul (" + mcsPretTxt(stopV) + ")", mcsPr(g.pStop), g.pStop > 0.5 ? "bad" : "") : "") + (st.tp > 0 ? mcsRand("atinge TP-ul (" + mcsPretTxt(st.tp) + ")", mcsPr(g.pTp)) : "")
    + mcsRand("iese măcar o dată din grid", mcsPr(g.pIesire)) + mcsRand("se închide pe plus", mcsPr(g.pPlus), g.pPlus >= 0.5 ? "good" : "bad") + mcsRand("grile încasate, în medie", mcsNr(g.perechiMedii, 1))
    + (g.cuTendinta ? '<p class="tbSub">Cu tendința perioadei păstrată: mijlocul ' + mcsBani1(g.cuTendinta.p50) + ', pe plus ' + mcsPr(g.cuTendinta.pPlus) + (stopV ? ', stopul ' + mcsPr(g.cuTendinta.pStop) : '') + '.</p>' : '')
    + '<p class="t212Fac">👉 <b>Ce înseamnă:</b> ' + mcsEsc("rezultatul obișnuit în " + mcsCate(g.zile, "zi", "zile") + " e " + mcsBani1(g.p50) + "; lichidare în " + mcsPr(g.pLichidare) + " din drumuri" + (stopV ? ", stopul atins în " + mcsPr(g.pStop) : "") + ".") + '</p></div></div>'
    + mcsVarHtml(r) + mcsTpHtml(r)
    + '<p class="tbSub mcsNota">' + mcsEsc(mcsCate(g.zileIstoric, "zi", "zile") + " pe 15 minute (atât dă Pionex); drumurile = zile întregi reale, fără tendința perioadei.") + '</p></section>';
}
// v100.129: „Compară variante” (la cerere: câteva secunde) ⇒ tabelul pe aceleași drumuri + „ce aș face eu”
function mcsVarHtml(r) {
  if (!r.setari) return "";
  if (r.varianteInLucru) return '<p class="tbSub mcsNota">calculez variantele pe aceleași drumuri…</p>';
  if (r.varianteEroare) return '<p class="tbWarn mcsNota">' + mcsEsc(r.varianteEroare) + '</p>';
  if (!r.variante) return '<p class="mcsNota mcsVarBut"><button type="button" class="t212BtnLinie" data-action-click="mcsCompara()">Compară ' + (mcsVariante(r.setari).length - 1) + ' variante pe aceleași drumuri</button> <span class="tbSub">interval îngust / larg, levier ±1, grile ½ / ×2 (câteva secunde)</span></p>';
  var rows = r.variante;
  return '<div class="mcsVarBloc"><h5>' + mcsEsc("Aceleași drumuri, " + mcsCate(rows.length, "variantă", "variante")) + '</h5><div class="rlTab"><table class="t212Tab mcsVar"><thead><tr><th>Varianta</th><th>De obicei</th><th>Pe plus</th><th>Stop atins</th><th>Lichidare</th><th>5% sub</th><th>Drum cu drum</th><th>Setările</th></tr></thead><tbody>'
    + rows.map(function (x, i) {
      var g = x.g || {}, st = x.st, er = !g || g.eroare, dd = x.drum;
      // v100.130: față de al tău pe fiecare drum; verde doar când e mai bun în mai multe drumuri decât mai rău
      var dc = i === 0 ? '<td class="tbSub">al tău</td>' : dd ? '<td class="' + (dd.maiBun > dd.maiRau ? "good" : dd.maiRau > dd.maiBun ? "bad" : "") + '">mai bună în ' + mcsPr(dd.maiBun) + '<span class="t212Mic">mai rea în ' + mcsPr(dd.maiRau) + '</span></td>' : '<td class="tbSub">—</td>';
      return '<tr' + (i === 0 ? ' class="mcsVarTu"' : '') + '><td>' + mcsEsc(x.nume) + '</td>'
        + (er ? '<td colspan="6" class="tbSub">' + mcsEsc(g && g.eroare || "fără date") + '</td>' : '<td class="' + mcsCls(Math.round(g.p50 * 10) / 10) + '">' + mcsBani1(g.p50) + '</td><td>' + mcsPr(g.pPlus) + '</td><td>' + (st.stop ? mcsPr(g.pStop) : "fără stop") + '</td><td class="' + (g.pLichidare > 0.02 ? "bad" : "") + '">' + mcsPr(g.pLichidare) + '</td><td>' + mcsBani1(g.p5) + '</td>' + dc) + '<td>' + mcsEsc(mcsPretTxt(st.jos) + "–" + mcsPretTxt(st.sus) + " · " + mcsCate(st.grile, "grilă", "grile") + " · " + st.levier + "×") + '</td>' + '</tr>';
    }).join("") + '</tbody></table></div>'
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + mcsEsc(mcsVariantaBuna(rows)) + '</p>'
    + '<p class="tbSub">Toate pe aceleași drumuri (aceeași sămânță), din același istoric scurt: o diferență mică între rânduri e zgomot; mai multe variante vecine care merg în aceeași direcție spun mai mult decât una singură. În Pionex, la grile scrii N+1 linii.</p></div>';
}
function mcsIstHtml(r) {
  var i = r.ist || {}, x = i.r || {}, u = i.unit || "USDT";
  var cap = '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>🧾 Istoria ta pe ' + mcsEsc(r.sim) + '</h4>';
  if (!x.cazuri) return cap + '</div><p class="tbSub mcsNota">' + mcsEsc(r.tip === "coin" ? "N-ai boți închiși pe " + r.sim + "." : "N-ai tranzacții închise pe " + r.sim + " în Trading 212.") + '</p></section>';
  cap += '<span class="tbSub">' + mcsEsc(mcsCate(x.cazuri, r.tip === "coin" ? "bot închis" : "tranzacție închisă", r.tip === "coin" ? "boți închiși" : "tranzacții închise") + " · total " + mcsBani1(x.total, u) + " · " + x.pePlus + " pe plus") + '</span></div>';
  if (x.putine) return cap + '<p class="mcsAvert mcsNota">Prea puține ca să conteze: ' + mcsEsc(mcsCate(x.cazuri, "caz", "cazuri")) + ' (îmi trebuie cel puțin 10). O „lună simulată” din atât doar le repetă. Mai jos, cazurile, așa cum au fost.</p>'
    + '<div class="rlTab mcsNota"><table class="t212Tab"><thead><tr><th>Pornit</th><th>Direcția</th><th>Levier</th><th>Suma</th><th>A stat</th><th>Rezultat</th></tr></thead><tbody>'
    + x.lista.map(function (y) { return '<tr><td>' + mcsEsc(new Date(y.t).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })) + '</td><td>' + mcsEsc(y.dir || "") + '</td><td>' + mcsEsc(y.lev ? y.lev + "×" : "—") + '</td><td>' + mcsEsc(y.inv != null ? mcsNr(y.inv, 2) + " " + u : "—") + '</td><td>' + mcsEsc(y.ore != null ? (y.ore < 1 ? Math.round(y.ore * 60) + " min" : mcsNr(y.ore, 1) + " h") : "—") + '</td><td class="' + mcsCls(y.bani) + '">' + mcsBani1(y.bani, u) + '</td></tr>'; }).join("")
    + '</tbody></table></div></section>';
  return cap + '<p class="tbSub mcsNota">' + mcsEsc("O lună cu " + mcsCate(i.K, r.tip === "coin" ? "bot" : "tranzacție", r.tip === "coin" ? "boți" : "tranzacții") + " pe " + r.sim + " (ritmul tău din ultimele 30 de zile; fără niciunul, unul), trase din ale tale: 5% sub " + mcsBani1(x.p5, u) + ", de obicei " + mcsBani1(x.p50, u) + ", 5% peste " + mcsBani1(x.p95, u) + "; pe plus în " + mcsPr(x.pPlus) + ".") + '</p></section>';
}
function mcsHtml(st) {
  st = st || {};
  var rec = (Array.isArray(st.recente) ? st.recente : []).map(mcsFel).filter(Boolean).slice(0, 10), scu = (Array.isArray(st.scurtaturi) ? st.scurtaturi : []).map(mcsFel).filter(Boolean).slice(0, 12);
  var h = '<div class="mcsCap"><h4>🎲 Monte Carlo pe un coin sau un stock</h4><span class="tbSub">trecutul reluat de mii de ori, nu o predicție</span></div>'
    + '<div class="mcsForm"><input id="mcsSim" placeholder="ex. PONS, LIT, AAPL, RHM.DE" autocomplete="off" value="' + mcsEsc(st.sim || "") + '"><button type="button" class="t212Btn t212BtnPlin" data-action-click="mcsAnalizeaza()">Analizează</button>'
    + (rec.length ? '<span class="tbSub">recente:</span>' + rec.map(function (x) { return mcsButonSim(x, true); }).join("") : '')
    + (scu.length ? '<span class="tbSub">sau:</span>' + scu.map(function (x) { return mcsButonSim(x, false); }).join("") : '') + '</div>';
  if (st.inLucru) return h + '<p class="tbSub mcsNota">aduc prețurile și simulez ' + mcsEsc(st.sim) + '… (~15 secunde la un coin: Pionex dă lumânările pe bucăți)</p>';
  if (st.eroare) return h + '<p class="tbWarn mcsNota">' + mcsEsc(st.eroare) + '</p>';
  if (!st.rez) return h + '<p class="tbSub mcsNota">Scrie un coin (cum e pe Pionex, ex. PONS) sau un stock (ca la Yahoo, ex. AAPL, RHM.DE) și apasă „Analizează”: prețul pe următoarele zile, un bot grid pe el (la coinuri) și istoria ta pe el.</p>';
  return h + (st.rez.sursa ? '<p class="tbSub mcsNota mcsSursa">Am analizat: <b>' + mcsEsc(st.rez.sursa) + '</b></p>' : '') + mcsPretHtml(st.rez) + mcsGridHtml(st.rez) + mcsIstHtml(st.rez)
    + '<p class="mcsAvert">E trecutul reluat de mii de ori, nu o predicție. Drumurile sunt lipite din zile reale ale simbolului, deci o criză mai rea decât orice a avut nu apare în ele. Simularea iese la fel la aceeași dată (generator cu sămânță fixă).</p>';
}

// ---------------- în pagină ----------------
function mcsEl(id) { return typeof document !== "undefined" ? document.getElementById(id) : null; }
function mcsBoti() { return typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : typeof contTot !== "undefined" && contTot.boti ? contTot.boti : []; }
// scurtăturile: monedele boților activi, pozițiile T212 și Salt
// v100.130: cu felul lor - boții = coin, pozițiile = acțiune (BE din T212 nu se mai caută pe Pionex)
function mcsScurtaturi() {
  var l = mcsBoti().filter(function (b) { return b && b.activ; }).map(function (b) { return { s: mcsSimbolBot(b), tip: "coin" }; });
  try { (typeof t212 !== "undefined" && t212.poz || []).forEach(function (x) { if (typeof T212 !== "undefined") l.push({ s: T212.simbol(x.ticker), tip: "stock" }); }); } catch (e) {}
  try { (typeof saltStare !== "undefined" && saltStare.d.pozitii || []).forEach(function (p) { l.push({ s: p.simbol, tip: "stock" }); }); } catch (e) {}
  var vazut = {};
  return l.map(mcsFel).filter(function (x) { if (!x || vazut[x.s]) return false; vazut[x.s] = 1; return true; });
}
var MCS_RECENTE = "cryptoRadarMcsRecenteV1";
function mcsCitesteRecente() { try { var v = JSON.parse(localStorage.getItem(MCS_RECENTE) || "[]"); return mcsRecente(v, ""); } catch (e) { return []; } }
function mcsSalveazaRecente() { try { localStorage.setItem(MCS_RECENTE, JSON.stringify(mcsStare.recente || [])); } catch (e) {} }
function mcsDeseneaza() {
  var el = mcsEl("mcsPagina"); if (!el) return;
  if (!mcsStare.recente) mcsStare.recente = mcsCitesteRecente();
  var u = mcsUnesteFel(mcsStare.recente, mcsScurtaturi());
  el.innerHTML = mcsHtml(Object.assign({}, mcsStare, { recente: u.rec, scurtaturi: u.scu }));
}
// revizia (R2): un recent vechi (doar text, salvat înainte de v100.130) ia felul scurtăturii cu același simbol (BE din T212 ⇒ acțiune);
// scurtătura se ascunde doar când recentul are ACELAȘI fel - cu felul diferit (LIT monedă vs LIT acțiune) rămân amândouă
function mcsUnesteFel(recente, scurtaturi) {
  var scu = (Array.isArray(scurtaturi) ? scurtaturi : []).map(mcsFel).filter(Boolean), dupa = {};
  scu.forEach(function (x) { if (!dupa[x.s]) dupa[x.s] = x.tip; });
  var rec = (Array.isArray(recente) ? recente : []).map(mcsFel).filter(Boolean).map(function (x) { return x.tip || !dupa[x.s] ? x : { s: x.s, tip: dupa[x.s] }; });
  return { rec: rec, scu: scu.filter(function (x) { return !rec.some(function (y) { return y.s === x.s && y.tip === x.tip; }); }) };
}
// Enter: în câmpul simbolului ⇒ „Analizează”; în stop / țintă / setările botului ⇒ „Refă simularea”
function mcsTasta(e) {
  if (!e || e.key !== "Enter" || !e.target) return;
  var id = e.target.id || "";
  if (id === "mcsSim") { e.preventDefault(); mcsAnalizeaza(); }
  else if (/^mcs(Stop|Tinta|Jos|Sus|Grile|Levier|Suma|StopBot|TpBot)$/.test(id)) { e.preventDefault(); mcsResimuleaza(); }
}
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("keydown", mcsTasta);
function mcsAlegeBot(v) {
  var d = mcsStare.date; mcsStare.botIdx = Number(v) || 0;
  if (!d || d.tip !== "coin") return;
  mcsStare.rez = mcsCalculeaza(d, { stop: mcsNumar("mcsStop"), tinta: mcsNumar("mcsTinta"), botIdx: mcsStare.botIdx, oriz: mcsStare.oriz[d.tip] }); mcsDeseneaza();
}
function mcsCompara() {
  var r = mcsStare.rez, d = mcsStare.date;
  if (!r || !d || d.tip !== "coin" || !r.setari || r.varianteInLucru) return;
  r.varianteInLucru = true; mcsDeseneaza();
  setTimeout(function () {
    try { r.variante = mcsCalcVariante(d.b15, r.setari, r.pret, { n: 500, prima: r.grid && !r.grid.eroare ? r.grid : null }); r.varianteEroare = null; } catch (e) { r.variante = null; r.varianteEroare = "Variantele n-au mers: " + (e && e.message || e); }
    r.varianteInLucru = false; if (mcsStare.rez === r) mcsDeseneaza();
  }, 30);
}
// v100.132: „Compară ținte (TP)” - ca variantele, la cerere (câteva secunde)
function mcsComparaTp() {
  var r = mcsStare.rez, d = mcsStare.date;
  if (!r || !d || d.tip !== "coin" || !r.setari || r.tinteBotInLucru) return;
  r.tinteBotInLucru = true; mcsDeseneaza();
  setTimeout(function () {
    try { r.tinteBot = mcsCalcTinteBot(d.b15, r.setari, r.pret, { n: 500, prima: r.grid && !r.grid.eroare ? r.grid : null }); r.tinteBotEroare = null; } catch (e) { r.tinteBot = null; r.tinteBotEroare = "Țintele n-au mers: " + (e && e.message || e); }
    r.tinteBotInLucru = false; if (mcsStare.rez === r) mcsDeseneaza();
  }, 30);
}
// 🎲 din detaliul unei poziții T212 / Salt: prețul de acum, intrarea și stopul în aceeași monedă (ale poziției) ⇒ doar rapoartele contează
function mcsPozitie(sim, pret, intrare, stop) {
  var c = mcsCurata(sim);
  if (!c || !(pret > 0) || !(intrare > 0)) { mcsStare.eroare = "Poziția " + (c || "") + " n-are încă prețul sau intrarea (se încarcă): încearcă din nou peste câteva secunde."; mcsStare.rez = null; mcsDeseneaza(); return; }
  mcsStare.poz = { sim: c, pret: Number(pret), intrare: Number(intrare), stop: stop > 0 ? Number(stop) : null };
  if (typeof navTo === "function") navTo("montecarlo", true);
  if (mcsStare.inLucru) { mcsStare.reia = true; return; }   // revizia (R2): o analiză e în curs ⇒ pornește după ea, pe poziție
  if (!mcsEl("mcsSim")) mcsDeseneaza();
  var i = mcsEl("mcsSim"); if (i) i.value = c;
  mcsAnalizeaza();
}
// v100.130: tip = felul ținut minte ("stock" ⇒ doar Yahoo, "coin" ⇒ doar Pionex; fără ⇒ întâi Pionex, apoi Yahoo)
function mcsAlege(s, tip) {
  if (mcsStare.inLucru) return;
  var i = mcsEl("mcsSim"); if (i) i.value = s; else mcsStare.sim = s;
  mcsStare.forta = tip === "coin" || tip === "stock" ? tip : null;
  return mcsAnalizeaza();
}
function mcsPauza(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function mcsNumar(id) { var el = mcsEl(id), v = el ? String(el.value || "").replace(",", ".").trim() : ""; var x = Number(v); return v !== "" && isFinite(x) ? x : null; }
// coin: 15M (6 pagini de câte 500, ca fișa Grid) + 1D; nimic pe Pionex ⇒ null (încerc stock)
// revizia (R4): „lipsa” doar când Pionex spune că simbolul nu există (MARKET_INVALID_SYMBOL, HTTP 200) sau n-are nicio lumânare; orice altă
// eroare (429, cădere, rețea) e „eroare” - NU trec la Yahoo (SOL, LIT, APT există și ca acțiuni: aș analiza alt instrument)
function mcsPionexFel(k) {
  if (!k || typeof k !== "object") return "eroare";
  if (k.code === "MARKET_INVALID_SYMBOL") return "lipsa";
  if (k.data && Array.isArray(k.data.klines)) return k.data.klines.length ? "date" : "lipsa";
  return "eroare";
}
async function mcsAduCoin(sim) {
  var baza = "/api/market?type=pionex_klines&symbol=" + encodeURIComponent(sim + "_USDT_PERP"), r15 = [], end = null;
  for (var p = 0; p < 6; p++) {
    var k = null; try { k = await getJSON(baza + "&interval=15M&limit=500" + (end ? "&endTime=" + end : "")); } catch (e) { if (p === 0) throw new Error("Pionex n-a răspuns acum (" + (e && e.message || e) + "): încearcă din nou peste un minut."); break; }
    var fel = mcsPionexFel(k); if (fel !== "date") { if (p === 0 && fel === "lipsa") return null; if (p === 0) throw new Error("Pionex n-a dat lumânările pentru " + sim + " (" + (k && (k.code || k.message) || "fără răspuns") + "): încearcă din nou peste un minut."); break; }
    var r = k.data.klines;
    r15 = r15.concat(r); if (r.length < 500) break;
    end = Math.min.apply(null, r.map(function (x) { return Number(x.time); }).filter(isFinite)) - 1; await mcsPauza(350);
  }
  await mcsPauza(350);
  var r1 = []; try { var k1 = await getJSON(baza + "&interval=1D&limit=200"); r1 = k1 && k1.data && k1.data.klines || []; } catch (e) {}
  return { b15: GridCalcul.bare(r15), b1: GridCalcul.bare(r1) };
}
// lista Salt (ISIN ⇒ simbol Yahoo cu bursa): „RHM” ⇒ RHM.DE; adusă o dată, chiar dacă pagina Salt n-a fost deschisă
async function mcsUnivers() {
  if (mcsStare.univers) return mcsStare.univers;
  if (typeof saltStare !== "undefined" && saltStare.d && saltStare.d.univers) return (mcsStare.univers = saltStare.d.univers);
  try { var u = await (await fetch("/data/salt-univers.json")).json(); mcsStare.univers = u && u.instrumente || []; } catch (e) { mcsStare.univers = []; }
  return mcsStare.univers;
}
async function mcsAduStock(sim, exact) {
  var cand = [sim];
  try { if (!exact && sim.indexOf(".") < 0 && typeof Salt !== "undefined") { var u = Salt.cauta(await mcsUnivers(), sim)[0]; if (u && u.simbol && u.simbol !== sim) cand.unshift(u.simbol); } } catch (e) {}
  for (var i = 0; i < cand.length; i++) {
    try { var r = await getJSON("/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(cand[i])), b = GridCalcul.bareToate(r && r.randuri || []); if (b.length >= 60) return { sim: cand[i], b: b }; } catch (e) {}
  }
  return null;
}
async function mcsArhiva() {
  if (mcsStare.arhiva) return mcsStare.arhiva;
  try { var a = await getJSON("/api/istoric-bot?action=botiInchisi"); mcsStare.arhiva = a && Array.isArray(a.boti) ? a.boti : []; } catch (e) { mcsStare.arhiva = []; }
  return mcsStare.arhiva;
}
// calculul (fără rețea) pe datele aduse; stopul / ținta / setările botului din câmpuri dacă le-a schimbat
// revizia v100.130 (R4): nivelul de sus intră nerotunjit; un nivel standard care s-ar scrie la fel (≤ 0,06 puncte) e înlocuit
// v100.132: agitația zilnică (ATR pe 14 zile) ca parte din preț; stopurile pe aceleași drumuri se pun în multipli de ATR, nu în % fix
// (un −5% e zgomot pe o acțiune agitată și departe pe una liniștită)
function mcsAtrPct(b) {
  if (!Array.isArray(b) || b.length < 20 || typeof ActiuniSemnale === "undefined") return null;
  var a = ActiuniSemnale.atr(b)[b.length - 1], P = b[b.length - 1].c;
  return a > 0 && P > 0 ? a / P : null;
}
function mcsStopuriAtr(a) { return [1, 1.5, 2, 3].map(function (k) { return Math.min(0.5, Math.max(0.005, k * a)); }); }
// revizia v100.132 (R2): long cu TP sub preț / short cu TP peste (de ex. după schimbarea direcției) ⇒ s-ar închide pe prima bară; nu-l pun.
// v100.133: o singură regulă pentru pagină (mcsCalculeaza) și pentru verificarea de noapte a colectorului
function mcsTpValid(st, P) {
  if (!st || !(st.tp > 0) || (st.dir === "long" && st.tp > P) || (st.dir === "short" && st.tp < P)) return st;
  return Object.assign({}, st, { tp: null, tpIgnorat: st.dir === "neutru" ? null : st.tp });
}
function mcsListaStopuri(std, sp) {
  var l = std.filter(function (x) { return Math.abs(x - sp) >= 6e-4; }), out = [];
  if (sp > 0 && sp < 1) l.push(sp);
  // revizia v100.132 (R3): după limitarea 0,5% / 50%, multiplii ATR pot cădea pe același nivel ⇒ fără dubluri (stopul de sus rămâne)
  l.sort(function (x, y) { return x - y; }).forEach(function (x) { if (!out.some(function (y) { return Math.abs(y - x) < 6e-4; })) out.push(x); });
  return out;
}
// v100.131: ținta de sus × ½, ¾, 1, 1,5, 2 (ținta de sus exact, ca rândul ei să fie cardul)
function mcsListaTinte(tp) { return tp > 0 ? [0.5, 0.75, 1, 1.5, 2].map(function (k) { return k === 1 ? tp : tp * k; }) : []; }
function mcsCalculeaza(d, o) {
  o = o || {}; var acum = Date.now();
  if (d.tip === "coin") {
    var P = d.b15[d.b15.length - 1].c, sp = o.stop > 0 ? o.stop / 100 : 0.1, tp = o.tinta > 0 ? o.tinta / 100 : 0.15;
    var atrC = d.b1.length >= 60 ? mcsAtrPct(d.b1) : null;   // v100.132: după ATR doar pe barele zilnice; pe 15 minute, % fix
    var slC = mcsListaStopuri(atrC ? mcsStopuriAtr(atrC) : [0.05, 0.1, 0.15, 0.2], sp), tlC = mcsListaTinte(tp);   // v100.131: și la coinuri
    var orC = mcsOrizontAles("coin", o.oriz);
    var pretMc = d.b1.length >= 60 ? MonteSimbol.pret(d.b1, { orizonturi: orC, n: 1000, blocZile: 5, seed: 11, stopPct: sp, tintaPct: tp, prag: 0.1, stopuri: slC, tinte: tlC })
      : MonteSimbol.pret(d.b15, { barePeZi: 96, orizonturi: orC, n: 600, blocZile: 1, minZile: 14, seed: 11, stopPct: sp, tintaPct: tp, prag: 0.1, stopuri: slC, tinte: tlC });
    if (pretMc && !pretMc.eroare) pretMc.atrPct = atrC;
    var bi = o.botIdx || 0, st = o.setari || mcsSetariBot(mcsBoti(), d.sim, bi) || mcsSetariProba(P);
    st = mcsTpValid(st, P);
    return { sim: d.sim, tip: "coin", oriz: o.oriz, sursa: d.sursa, pret: P, pretMc: pretMc, setari: st, boti: mcsEticheteBoti(mcsBoti(), d.sim), botIdx: bi, grid: MonteSimbol.grid(d.b15, Object.assign({ pret: P }, st), { zile: 7, n: 500, seed: 12, peDrum: true }), ist: d.ist,
      nivelText: o.stop > 0 || o.tinta > 0 ? "stopul și ținta tale" : "−10% / +15% pentru un coin: schimbă-le" };
  }
  var b = d.b, Pp = b[b.length - 1].c, n = typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale.niveluri(b, Pp, {}) : null, ok = n && n.nivel === "ok";
  // v100.129: poziția lui (din T212 / Salt) - stopul și intrarea ca rapoarte față de prețul POZIȚIEI (unitățile ei: GBp, EUR la cursul zilei)
  var poz = o.poz && o.poz.pret > 0 && o.poz.intrare > 0 ? Object.assign({}, o.poz, { intrareR: o.poz.intrare / o.poz.pret }) : null;
  var spPoz = poz && poz.stop > 0 && poz.stop < poz.pret ? 1 - poz.stop / poz.pret : null;
  var sp2 = o.stop > 0 ? o.stop / 100 : poz ? (spPoz !== null ? spPoz : 0.1) : ok && n.stop > 0 && n.stop < Pp ? 1 - n.stop / Pp : 0.1, tp2 = o.tinta > 0 ? o.tinta / 100 : ok && n.tinta > Pp ? n.tinta / Pp - 1 : 0.15;
  // v100.130: −5 / −8 / −10 / −15% și stopul de sus, pe aceleași drumuri (aceeași țintă)
  // revizia (R4): stopul de sus intră NEROTUNJIT (rândul lui = cardul de sus); un nivel standard la cel mult 0,05 puncte de el (s-ar scrie la fel, cu o zecimală) e înlocuit
  var atrS = mcsAtrPct(b), sl = mcsListaStopuri(atrS ? mcsStopuriAtr(atrS) : [0.05, 0.08, 0.1, 0.15], sp2), tl = mcsListaTinte(tp2);   // v100.132: după ATR
  var pmS = MonteSimbol.pret(b, { orizonturi: mcsOrizontAles("stock", o.oriz), n: 1000, blocZile: 5, seed: 21, stopPct: sp2, tintaPct: tp2, prag: 0.1, intrare: poz ? poz.intrareR : undefined, stopuri: sl, tinte: tl });
  if (pmS && !pmS.eroare) pmS.atrPct = atrS;
  return { sim: d.sim, tip: "stock", oriz: o.oriz, sursa: d.sursa, pret: Pp, pretMc: pmS, grid: null, setari: null, ist: d.ist, poz: poz,
    nivelText: o.stop > 0 || o.tinta > 0 ? "stopul și ținta tale" : spPoz !== null ? "stopul poziției tale (" + mcsPretTxt(poz.stop) + ")" + (ok && n.tinta > Pp ? "; ținta: a Radarului" : "") : poz && poz.stop > 0 ? "stopul poziției (" + mcsPretTxt(poz.stop) + ") e deja depășit: prețul e sub el; aici −10% de acum" : poz ? "poziția n-are stop: −10%" : ok ? "ale Radarului pentru o intrare nouă azi (stopul " + mcsPretTxt(n.stop) + ", ținta " + mcsPretTxt(n.tinta) + ")" : "−10% / +15%: schimbă-le" };
}
async function mcsAnalizeaza() {
  var i = mcsEl("mcsSim"), sim = mcsCurata(i ? i.value : mcsStare.sim), forta = mcsStare.forta; mcsStare.forta = null;
  if (!sim) { mcsStare.eroare = "Scrie un simbol: un coin ca pe Pionex (PONS) sau un stock ca la Yahoo (AAPL, RHM.DE)."; mcsStare.rez = null; mcsDeseneaza(); return; }
  if (mcsStare.inLucru) return;
  var poz = mcsStare.poz && mcsStare.poz.sim === sim ? mcsStare.poz : null; if (!poz) mcsStare.poz = null;
  mcsStare.sim = sim; mcsStare.inLucru = true; mcsStare.eroare = null; mcsStare.rez = null; mcsStare.botIdx = 0; mcsDeseneaza();
  try {
    // o poziție T212 / Salt e o acțiune: nu caut pe Pionex (BE e și monedă) și nici în lista Salt (simbolul e deja cel de la Yahoo)
    // v100.130: felul ținut minte (recente / scurtături): „stock” nu întreabă Pionex, „coin” nu trece la Yahoo (alt instrument)
    var c = sim.indexOf(".") < 0 && !poz && forta !== "stock" ? await mcsAduCoin(sim) : null, d = null;
    var alias = mcsBoti().filter(function (b) { return mcsBotPe(b, sim); }).map(function (b) { return String(b.baza || "").replace(/\.PERP$/, "").toUpperCase(); });
    if (c && c.b15.length) d = { tip: "coin", sim: sim, sursa: sim + "_USDT_PERP · Pionex", b15: c.b15, b1: c.b1, ist: mcsIstorieCoin(await mcsArhiva(), sim, Date.now(), alias) };
    else if (forta === "coin") throw new Error("Nu găsesc „" + sim + "” pe Pionex (" + sim + "_USDT_PERP) acum. L-ai analizat înainte ca monedă; ca acțiune scrie-l în câmp și apasă „Analizează”.");
    else {
      var s = await mcsAduStock(sim, !!poz || forta === "stock"); if (!s) throw new Error("Nu găsesc „" + sim + "”: nici ca monedă pe Pionex (" + sim + "_USDT_PERP), nici ca acțiune la Yahoo (cu cel puțin 60 de zile). La acțiunile din afara SUA scrie și bursa: RHM.DE, ULVR.L.");
      var u = typeof t212 !== "undefined" && t212.istoric ? t212.istoric.umpleri : null;
      if (!u) { try { var h = await getJSON("/api/t212?action=istoric"); u = h && h.umpleri || []; } catch (e) { u = []; } }
      d = { tip: "stock", sim: s.sim, sursa: s.sim + " · Yahoo (acțiune / ETF)", b: s.b, ist: mcsIstorieStock(u, s.sim, Date.now()) };
    }
    mcsStare.date = d; await mcsPauza(0);   // „aduc… / simulez” apare înainte de calcul
    // revizia v100.133 (R12): din 🎲 al unei poziții ⇒ 20 / 60 de zile de bursă (cifra „revine la intrare” din rând e pe 60)
    if (poz && d.tip === "stock") mcsStare.oriz.stock = 1;
    mcsStare.rez = mcsCalculeaza(d, { poz: poz, oriz: mcsStare.oriz[d.tip] });
    mcsStare.recente = mcsRecente(mcsStare.recente || mcsCitesteRecente(), d.sim, d.tip); mcsSalveazaRecente();
  } catch (e) { mcsStare.eroare = e && e.message || String(e); }
  finally { mcsStare.inLucru = false; }
  mcsDeseneaza();
  if (mcsStare.reia) { mcsStare.reia = false; var ii = mcsEl("mcsSim"); if (ii && mcsStare.poz) ii.value = mcsStare.poz.sim; return mcsAnalizeaza(); }
}
// v100.133: alt orizont ⇒ aceeași simulare, alte zile (ținut minte pe fel, pentru simbolurile următoare)
function mcsAlegeOriz(i) {
  var d = mcsStare.date; if (!d || mcsStare.inLucru) return;
  mcsStare.oriz[d.tip] = Number(i) >= 0 ? Number(i) : 1;
  mcsResimuleaza();
}
// refă simularea pe aceleași date, cu stopul / ținta / setările botului din câmpuri (fără cereri noi)
function mcsResimuleaza() {
  var d = mcsStare.date; if (!d) return;
  var o = { stop: mcsNumar("mcsStop"), tinta: mcsNumar("mcsTinta"), poz: mcsStare.poz && mcsStare.poz.sim === d.sim ? mcsStare.poz : null, botIdx: mcsStare.botIdx, oriz: mcsStare.oriz[d.tip] };
  if (d.tip === "coin" && mcsEl("mcsJos")) {
    var jos = mcsNumar("mcsJos"), sus = mcsNumar("mcsSus"), g = mcsNumar("mcsGrile"), lv = mcsNumar("mcsLevier"), dirEl = mcsEl("mcsDir"), suma = mcsNumar("mcsSuma"), sb = mcsNumar("mcsStopBot"), tpb = mcsNumar("mcsTpBot"), dir = dirEl ? dirEl.value : "long";
    if (jos > 0 && sus > jos && g >= 2 && lv >= 1 && suma > 0) {
      var nou = { jos: jos, sus: sus, grile: Math.round(g), levier: Math.round(lv), dir: mcsDir(dir), suma: suma, stop: sb > 0 ? (dir === "short" ? { sus: sb } : { jos: sb }) : null, tp: tpb > 0 && mcsDir(dir) !== "neutru" ? tpb : null, botulTau: false }, vechi = mcsStare.rez && mcsStare.rez.setari;
      o.setari = mcsAceleasiSetari(vechi, nou) ? vechi : nou;
    }
    else { mcsStare.eroare = null; }
  }
  mcsStare.rez = mcsCalculeaza(d, o); mcsDeseneaza();
}
