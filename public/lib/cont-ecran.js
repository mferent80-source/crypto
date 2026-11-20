// Pagina „Contul întreg” (v100.176; el 13.10: „din prima recomandare 1–6”): desenează raportul colectorului (ContIntreg, KV cont:raport).
// ciHtml e fără DOM (proba o rulează în vm); ciPorneste leagă pagina. Lipsa se spune (nu 0), aproximările se spun pe față.
// v100.369 (el 20.11: „Contul întreg ca Jurnalul”, după auditul cu 2 revizori; hotărârile LUI): capul cu vârsta raportului și căderile
// fiecărei rute, fraza cinstită + „De unde știu”, 3 cifre (valoarea · câștigul net pe un an · riscul azi), rândurile pliate (CI_RANDURI),
// banii în lei net pe bucăți (boții FĂRĂ procent), riscul pe agitația de acum cu proba pe zilele reale, 4 grafice (ContGrafice); procentele
// și cifrele cu o singură zecimală; nimic pierdut din pagina veche (titlurile, butonul exportului, câmpul fișierului).
var ciStare = { raport: null, zile: null, la: 0, inLucru: false, eroare: null, verdicte: null, banda: null, lectii: null, erori: {} };
function ciEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function ciMii(x) { if (x == null || !isFinite(x)) return "—"; var r = Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (x < 0 && r !== "0" ? "−" : "") + r; }
function ciLei(x, semn) { if (x == null || !isFinite(x)) return "—"; return (semn && Math.round(x) > 0 ? "+" : "") + ciMii(x) + " lei"; }
/* v100.369: procentele cu spațiu („5,6 %”, ca paginile refăcute) și cu o singură zecimală; fără „−0,0 %” */
function ciPct(x, z) { if (x == null || !isFinite(x)) return "—"; var v = Math.abs(x * 100).toFixed(z == null ? 1 : z).replace(".", ","), zero = Number(v.replace(",", ".")) === 0; return (zero ? "" : x < 0 ? "−" : x > 0 ? "+" : "") + v + " %"; }
function ciPctF(x, z) { return ciPct(x, z).replace("+", ""); }
function ciNr(x, z) { if (x == null || !isFinite(x)) return "—"; var s = Math.abs(Number(x)).toFixed(z == null ? 1 : z); return (x < 0 && Number(s) !== 0 ? "−" : "") + s.replace(".", ","); }   /* v100.306 (I-837): minusul „−”; v100.369: o zecimală implicit */
/* v100.369: p-ul spus în cuvinte, cu o zecimală: „din întâmplare ar ieși așa în ~0,2 % din cazuri” */
function ciSansa(p) { if (p == null || !isFinite(p)) return "—"; return p < 0.001 ? "sub 0,1 %" : "~" + ciPctF(p); }
function ciZi(z) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(z || "")); return m ? m[3] + "." + m[2] + "." + m[1] : "—"; }
function ciZiDinLa(t) {
  var n = Number(t);
  if (!(n > 0)) return "";
  try {
    var z = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(n));
    var a = ciZi(z);
    return a && a !== "—" ? a : "";
  } catch (e) { return ""; }
}
/* v100.369 (🔵15): ora în fusul României, ca restul paginii (nu al aparatului) */
function ciOraRo(t) { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(Number(t))); } catch (e) { return "—"; } }
/* v100.369 (🟡1): ziua pe care o ÎNCHIDE o citire - tura de după miezul nopții (până la 07:00, ora României) prinde închiderea de ieri.
   Rândurile fără ora citirii (înainte de 21.10) rămân pe ziua lor. */
function ciZiInchidere(x) { var t = Number(x && (x.citit || x.la)); if (!(t > 0)) return String(x && x.z || ""); try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t - 7 * 3600000)); } catch (e) { return String(x.z); } }
function ciEt(t) { return '<span class="ciEt">' + ciEsc(t) + " </span>"; }
function ciCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + pl; }
function ciLat() { var e = typeof document !== "undefined" && document.getElementById ? document.getElementById("ciPagina") : null; return Math.max(300, Math.floor((e && e.clientWidth) || 900) - 34); }
function ciLatJ() { var l = ciLat(); return typeof window !== "undefined" && window.innerWidth >= 1024 ? Math.floor((l - 16) / 2) : l; }
// histograma zilelor (P&L-ul pozițiilor de acum pe ultimele ~250 de zile): sub zero roșu, peste zero verde, pragul zilei proaste (VaR 95 %) marcat
function ciHisto(pnl, var95) {
  var v = (pnl || []).map(function (x) { return x[1]; }).filter(function (x) { return x != null && isFinite(x); });
  if (v.length < 20) return "";
  var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), n = 24, w = (hi - lo) / n || 1, b = new Array(n).fill(0);
  v.forEach(function (x) { b[Math.min(n - 1, Math.floor((x - lo) / w))]++; });
  var mx = Math.max.apply(null, b), W = 480, H = 120, bw = W / n;
  var bare = b.map(function (c, i) { var x0 = lo + i * w, h = c / mx * (H - 18); return '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (H - 14 - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" class="' + (x0 + w / 2 < 0 ? "ciRosu" : "ciVerde") + '"></rect>'; }).join("");
  var xv = var95 != null ? (-var95 - lo) / (hi - lo) * W : null;
  var linie = xv != null && xv >= 0 && xv <= W ? '<line x1="' + xv.toFixed(1) + '" x2="' + xv.toFixed(1) + '" y1="0" y2="' + (H - 14) + '" class="ciPrag"></line><text x="' + Math.min(W - 4, xv + 4).toFixed(1) + '" y="10" class="ciPragT">ziua proastă (1 din 20)</text>' : "";
  return '<svg class="ciHisto" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Câte zile au avut fiecare câștig sau pierdere, pe pozițiile de acum">' + bare + linie
    + '<text x="0" y="' + (H - 2) + '" class="ciAx">' + ciEsc(ciLei(lo)) + '</text><text x="' + W + '" y="' + (H - 2) + '" text-anchor="end" class="ciAx">' + ciEsc(ciLei(hi, true)) + "</text></svg>";
}
// riscul pe o zi pe care îl spune pagina: cel pe agitația de acum (v100.369) când există, altfel cel vechi (250 de zile egale)
function ciRiscZi(r) { var a = r && r.riscAcum && r.riscAcum.acum, rs = r && r.risc || {}; return a && a.var95 != null ? { var95: a.var95, es95: a.es95, var99: a.var99, es99: a.es99, acum: true } : { var95: rs.var95, es95: rs.es95, var99: rs.var99, es99: rs.es99, acum: false }; }
// „ce aș face eu”: o singură acțiune, din ce strică cel mai tare. v100.369 (🟡5): ordinea - reconcilierea, gărzile încălcate (stopul întâi),
// riscul pe zi peste 4 %, criza peste 35 %, perechea care se mișcă la fel (înainte perechea venea ÎNAINTEA riscului și gărzile lipseau)
function ciFac(r) {
  var tot = r.valoare && r.valoare.total, rec = r.reconciliere || {}, rz = ciRiscZi(r);
  if (rec.urmarire && !rec.urmarire.ok) return "Aș verifica acum botul " + rec.urmarire.lipsa.map(function (x) { return x.nume; }).join(", ") + " direct în Pionex: Radarul nu-l mai urmărește.";
  if (rec.t212 && !rec.t212.ok) return "Aș verifica în T212 " + rec.t212.abateri.map(function (a) { return String(a.ticker).replace(/_US_EQ$|_EQ$/, ""); }).join(", ") + ": jurnalul Radarului nu se potrivește cu contul.";
  var g = (r.garzi || []).filter(function (x) { return x && !x.ok; }), gs = g.filter(function (x) { return x.cod === "stop"; })[0];
  if (gs) return "Aș hotărî întâi ce fac cu acțiunile sub stopul tău (" + gs.detaliu + ")" + (r.bani && r.bani.deschiseT212 && r.bani.deschiseT212.lei < 0 ? ": pe pozițiile deschise stau acum " + ciLei(r.bani.deschiseT212.lei) : "") + ". Stopul e regula scoasă din trecutul tău; ținute mai departe, sunt pariuri noi.";
  if (rz.var95 && tot > 0 && rz.var95 > 0.04 * tot) return "O zi proastă îți ia acum ~" + ciPctF(rz.var95 / tot) + " din cont (" + ciLei(rz.var95) + "): aș reduce expunerea până sub 4 % pe zi" + (g.length ? "; " + ciCate(g.length, "gardă e încălcată", "gărzi sunt încălcate") + " (" + g.map(function (x) { return x.titlu.toLowerCase(); }).join("; ") + ")" : "") + ".";
  var cr = (r.stres || [])[0];
  if (cr && tot > 0 && -cr.lei > 0.35 * tot) return "O criză ca „" + cr.nume + "” ți-ar lua ~" + Math.round(-cr.lei / tot * 100) + " % din cont: aș micșora întâi poziția care pierde cel mai mult acolo (" + ((cr.pozitii || [])[0] || {}).nume + ").";
  var p = (r.corelatii || []).filter(function (x) { return x.acelasiRisc; })[0];
  if (p && p.rho >= 0.8) return p.a + " și " + p.b + " se mișcă aproape la fel (ρ " + ciNr(p.rho) + "): aș socoti-le o singură poziție când îmi pun riscul.";
  if (g.length) return "Aș repara întâi garda încălcată: " + g[0].titlu.toLowerCase() + (g[0].detaliu ? " (" + g[0].detaliu + ")" : "") + ".";
  return "Nimic urgent pe tot contul: aș păstra riscul pe zi sub 4 % din cont și aș verifica pagina după fiecare poziție nouă.";
}

// ---------------- v100.197 valoarea contului pe zile (v100.369: ziua = închiderea ei, „—” la sursa lipsă, ultimele 7 la vedere) ----------------
// Cifra ultimei zile + schimbarea față de ziua dinainte (săgeată + semn, nu doar culoare), linia pe zile (un singur șir ⇒ fără legendă;
// detaliile pe sursă la trecerea mouse-ului), tabelul cu sursele. Schimbarea include depunerile / retragerile: nu e profit.
function ciZileHtml(zile, erori) {
  var l = (Array.isArray(zile) ? zile : []).filter(function (x) { return x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.z)) && isFinite(x.valoare) && Number(x.valoare) > 0; })
    .slice().sort(function (a, b) { return a.z < b.z ? -1 : a.z > b.z ? 1 : 0; });
  var h = "";
  if (!l.length) return h + '<p class="tbSub">' + ciEsc(erori && erori.contZile ? "N-am putut citi zilele acum (" + erori.contZile + "); reîncearcă peste câteva minute." : "Încă nu am nicio zi: colectorul o scrie o dată pe zi (Pionex + Trading 212 + Salt, în lei).") + "</p>";
  var ult = l[l.length - 1], ant = l.length > 1 ? l[l.length - 2] : null;
  // schimbarea doar între două zile complete; lângă o zi parțială se spune, nu se socotește pe un total trunchiat
  var sch = function (x, y) {
    if (!x || !y) return "";
    if (x.complet === false || y.complet === false) return '<span class="t212Mic">— (o zi e parțială)</span>';
    var d = y.valoare - x.valoare, pct = x.valoare > 0 ? d / x.valoare : null, sag = d > 0 ? "▲ " : d < 0 ? "▼ " : "= ";
    return '<span class="ciZileSch ' + (d > 0 ? "good" : d < 0 ? "bad" : "") + '">' + sag + ciLei(d, true) + (pct !== null ? " (" + ciPct(pct) + ")" : "") + "</span>";
  };
  var surse = function (x) { return "Pionex " + ciLei(x.pionex) + " · Trading 212 " + ciLei(x.t212) + " · Salt " + ciLei(x.salt); };
  var citit = function (x) { var t = x.citit || x.la; return t ? "citit pe " + ciZiDinLa(t) + ", " + ciOraRo(t) : ""; }, Z = function (x) { return ciZi(ciZiInchidere(x)); };
  h += '<p class="ciZileAzi"><b>' + ciLei(ult.valoare) + "</b> la închiderea din " + Z(ult) + (ult.complet === false ? " · parțial (lipsea o sursă)" : "") + (ant ? " · față de " + Z(ant) + ": " + sch(ant, ult) : "") + "</p>"
    + (citit(ult) ? '<p class="tbSub ciZileCitit">' + ciEsc(citit(ult)) + "</p>" : "");
  if (l.length < 2) h += '<p class="tbSub">O singură zi până acum: graficul apare de la a doua zi.</p>';
  else {
    var W = 600, H = 150, PX = 14, PY = 16, min = Infinity, max = -Infinity;
    l.forEach(function (x) { if (x.valoare < min) min = x.valoare; if (x.valoare > max) max = x.valoare; });
    var pad = (max - min) * 0.12 || max * 0.02 || 1, lo = min - pad, hi = max + pad;
    var X = function (i) { return PX + (W - 2 * PX) * (l.length === 1 ? 0.5 : i / (l.length - 1)); }, Y = function (v) { return PY + (H - 2 * PY) * (1 - (v - lo) / (hi - lo)); };
    var pts = l.map(function (x, i) { return X(i).toFixed(1) + "," + Y(x.valoare).toFixed(1); }).join(" ");
    h += '<svg class="ciZileGraf" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Valoarea contului pe ' + ciEsc(ciCate(l.length, "zi", "zile")) + ", de la " + ciLei(l[0].valoare) + " la " + ciLei(ult.valoare) + '">'
      + '<line class="ciZileAx" x1="' + PX + '" x2="' + (W - PX) + '" y1="' + (H - PY / 2) + '" y2="' + (H - PY / 2) + '"></line>'
      + '<polyline class="ciZileLin" points="' + pts + '"></polyline>'
      + l.map(function (x, i) {
        var t = "<title>" + ciEsc(Z(x) + ": " + ciLei(x.valoare) + " · " + surse(x) + (x.complet === false ? " (parțial)" : "")) + "</title>";
        var c = 'x1="' + X(i).toFixed(1) + '" y1="' + Y(x.valoare).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y2="' + Y(x.valoare).toFixed(1) + '"';   /* linie de lungime zero = cerc la orice lățime */
        return '<g><line class="ciZileTinta" ' + c + '>' + t + '</line><line class="ciZilePct' + (x.complet === false ? " ciZileGol" : "") + '" ' + c + '></line>' + (x.complet === false ? '<line class="ciZileGolIn" ' + c + '></line>' : "") + "</g>";
      }).join("") + "</svg>"
      + '<div class="ciZileScala"><span>' + Z(l[0]) + "</span><span>min " + ciLei(min) + " · max " + ciLei(max) + "</span><span>" + Z(ult) + "</span></div>";
  }
  var rand = function (x, i) {
    return "<tr><td data-et=\"Ziua\">" + Z(x) + (x.complet === false ? '<span class="t212Mic"> · parțial</span>' : "") + '</td><td data-et="Total"><b>' + ciLei(x.valoare) + "</b></td>"
      + '<td data-et="Față de ziua dinainte">' + (sch(l[i - 1], x) || "—") + '</td><td data-et="Pionex">' + ciLei(x.pionex) + '</td><td data-et="Trading 212">' + ciLei(x.t212) + '</td><td data-et="Salt">' + ciLei(x.salt) + "</td></tr>";
  };
  var rows = l.map(rand).reverse().slice(0, 60), cap = "<thead><tr><th>Ziua</th><th>Total</th><th>Față de ziua dinainte</th><th>Pionex</th><th>Trading 212</th><th>Salt</th></tr></thead>";
  h += '<div class="t212TabWrap"><table class="t212Tab ciTab ciZileTab">' + cap + "<tbody>" + rows.slice(0, 7).join("") + "</tbody></table></div>";
  if (rows.length > 7) h += '<details class="ciMetoda"><summary>' + ciEsc("Toate zilele (" + rows.length + ")") + '</summary><div class="t212TabWrap"><table class="t212Tab ciTab ciZileTab">' + cap + "<tbody>" + rows.slice(7).join("") + "</tbody></table></div></details>";
  h += '<p class="tbSub">În lei, o valoare pe zi: prima citire a colectorului din ziua aceea. Citirea de după miezul nopții prinde închiderea de ieri, de aceea rândul poartă ziua pe care o închide (unde ora citirii nu s-a ținut, înainte de 21.10, poartă ziua citirii). Schimbarea de la o zi la alta include și depunerile și retragerile — nu e doar profit. „Parțial” = o sursă n-a răspuns, deci totalul e mai mic decât cel real; o sursă lipsă se vede „—”, nu „0 lei”.</p>';
  return h;
}
function ciExportHtml(st) {
  var e = st && st.export, fraza, ziF = e ? ciZiDinLa(e.la) : "";
  if (!e) fraza = "A doua citire din exportul tău lipsește.";
  else if (!e.ok) fraza = "A doua citire din exportul tău lipsește: " + (e.eroare || "fișierul n-a putut fi citit") + ".";
  else if (e.lipsaApi) fraza = "A doua citire e citită, dar cantitatea din cont n-a venit: n-am aflat dacă se potrivește.";
  else if (e.nePotrivit) fraza = "Exportul nu se potrivește cu cantitatea din cont.";
  else fraza = "A doua citire se potrivește cu cantitatea din cont.";
  if (ziF) fraza += " Fișierul e citit pe " + ziF + ", ora României.";
  var h = '<h4>A doua citire, din exportul tău</h4><p class="ciRasp">' + ciEsc(fraza) + '</p><p><button type="button" class="actionGhost" id="ciExportBtn">Aduc exportul din T212</button><input type="file" id="ciExportFisier" accept=".csv,text/csv" hidden></p>';
  if (e && e.ok && !e.lipsaApi && Array.isArray(e.randuri) && e.randuri.length) {
    var rupte = e.randuri.filter(function (r) { return r && r.potrivit !== true; });
    var nPotrivite = e.randuri.length - rupte.length;
    h += '<p class="tbSub">' + ciEsc(ciCate(nPotrivite, "simbol se potrivește", "simboluri se potrivesc")) + ".</p>";
    if (rupte.length) {
      var cel = function (x) { return x == null ? "n-am aflat" : ciNr(x, 4).replace(/,?0+$/, ""); };
      h += '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Simbol</th><th>API</th><th>Jurnal</th><th>Export</th></tr></thead><tbody>'
        + rupte.map(function (r) { return "<tr><td>" + ciEsc(r.ticker) + '</td><td class="num">' + ciEsc(cel(r.api)) + '</td><td class="num">' + ciEsc(cel(r.jurnal)) + '</td><td class="num">' + ciEsc(cel(r.export)) + "</td></tr>"; }).join("")
        + "</tbody></table></div>";
    }
    if (e.lipsaJurnal) h += '<p class="tbSub">Jurnalul n-a venit: coloana lui rămâne n-am aflat. Comparația care poate schimba gura e exportul față de API.</p>';
  }
  h += '<p class="tbSub">Fișierul rămâne la tine. Radar citește cantitățile și le compară cu API-ul, la aceeași margine ca jurnalul. Un export cu alt antet nu inventează abateri.</p>';
  return h;
}
function ciAbateriPliate(ab, nepotriviri) {
  if (!ab || !ab.length) return "";
  var lin = ab.map(function (a) {
    var sp = typeof ContIntreg !== "undefined" && ContIntreg.notaSplit ? ContIntreg.notaSplit(a.ticker, nepotriviri) : "";
    return String(a.ticker).replace(/_US_EQ$|_EQ$/, "") + ": cont " + a.broker + ", jurnal " + ciNr(a.radar, 3).replace(/,?0+$/, "") + " — " + a.motiv + (sp ? "; " + sp : "");
  });
  return '<details class="ciMetoda"><summary>Simbolurile</summary><ul>' + lin.map(function (x) { return "<li>" + ciEsc(x) + "</li>"; }).join("") + "</ul></details>";
}
function ciMasuraHtml(st) {
  var m = st && st.masura;
  // v100.239: fără o zi completă, secțiunea nu se desenează. Fraza de lipsă rămâne în masuraFranei.
  if (!m || !m.text || m.complete === 0 || String(m.text).indexOf("N-am aflat:") === 0) return "";
  return '<h4>Măsura frânei pe cartea închisă</h4><p class="ciRasp">' + ciEsc(m.text) + '</p><p class="tbSub">Regulile de azi, pe zilele la care s-au salvat pauza, raportul și evenimentul. Sub 10 zile oprite, eșantionul nu ajunge.</p>';
}

// ---------------- v100.369: capul, fraza, cifrele ----------------
function ciVarstaHtml(r, st) {
  var acum = Number(st.acum) || Date.now(), e = st.erori || {}, h = "";
  if (r && r.la) {
    var ore = Math.round((acum - r.la) / 3600000);
    h += '<p class="tbSub rlLa ciLa">' + ciEsc("Raportul din " + ciZiDinLa(r.la) + ", ora " + ciOraRo(r.la) + " (ora României) · se reface la 6 ore · pozițiile de acum puse pe istoria reală; e un calcul, nu o promisiune.") + "</p>";
    if (acum - r.la > 12 * 3600000) h += '<p class="tbWarn">⚠ Raportul e vechi de ' + ciEsc(ciCate(ore, "oră", "ore")) + ": colectorul nu l-a refăcut (merge colectorul de pe VPS?).</p>";
    if (!r.bani) h += '<p class="tbWarn">⚠ Raportul e făcut de colectorul de dinainte de v100.369: banii pe bucăți, riscul de acum și graficele apar la tura următoare.</p>';
  }
  // v100.369 (🟡3): fiecare rută picată se spune (nu „încă nu sunt date”); raportul vechi rămâne la vedere cu vârsta lui
  var N = { cont: "raportul", contZile: "valoarea pe zile", verdicte: "verdictele", banda: "ieșirile din bandă", lectii: "lecțiile" }, pic = Object.keys(N).filter(function (k) { return e[k]; });
  if (pic.length) h += '<p class="tbWarn">' + ciEsc("⚠ N-am putut citi acum: " + pic.map(function (k) { return N[k] + " (" + e[k] + ")"; }).join("; ") + (r ? ". Ce vezi e ultima citire bună." : ".")) + "</p>";
  return h;
}
function ciSurse(r) {
  var ra = r && r.riscAcum, b = r && r.bani;
  return ["Valoarea: boții Pionex (suma pusă + profitul) + soldul liber Pionex + Trading 212 (contul întreg, în lei) + Salt (pozițiile scrise de tine, la prețul de acum). USD din cursul BNR; o sursă necitită rămâne „—”, nu 0.",
    "Câștigul pe ultimul an, în lei: Trading 212 refăcut din umplerile tale și închiderile zilnice (pe banii investiți; cash-ul care stă nu intră), cu procentul lui ponderat în timp; boții închiși cu NETUL lor (după comisioane și funding), la cursul zilei închiderii, pe bucăți. Boții nu au procent: Pionex nu dă capitalul pe zi, iar suma pusă a boților scurți din aceeași zi se numără de mai multe ori (pe 26.10, 36 de boți ⇒ 46.504 lei „la lucru”, în cont erau ~1.144).",
    "„Proces sau ghinion” la boți: pe fiecare zi de închidere, netul împărțit la suma pusă (boții aceleiași zile = o singură unitate); semnele întoarse pe zile dau cât de des ar ieși așa din întâmplare, intervalul e pe blocuri de 5 zile.",
    "Riscul pe o zi (VaR / ES): pozițiile de ACUM, în lei, puse pe randamentele zilnice reale ale fiecăreia, cu tot cu mișcarea leului față de dolar / euro (simulare istorică). Cifra de acum re-scalează zilele trecute cu agitația de acum (EWMA, λ 0,94); cifra veche ia ultimele 250 de zile egal. VaR 95 % = pierderea depășită într-o zi din 20; ES = media acelor zile.",
    "Proba riscului: pe istoria pozițiilor de acum" + (ra ? " (" + ciZi(ra.de) + " – " + ciZi(ra.pana) + ")" : "") + ", fiecare zi judecată doar cu zilele DE DINAINTE; testul Kupiec spune dacă rata zilelor peste prag e cea promisă. Intervalele sunt de 90 %, pe blocuri de 5 zile (volatilitatea vine în grămezi). Sub 60 de zile de istorie comună riscul e orientativ.",
    "Corelațiile: pe zilele în care amândouă au preț (ultimele 90), cel puțin 40. „Pariuri independente” = pătratul raportului dintre suma riscurilor fiecărei poziții și riscul contului; pe ferestre de 60 și 250 de zile se vede dacă e regimul de acum sau o regulă.",
    "Crizele: ferestrele reale (Covid 2020, întreg și cele 10 zile, China 2021, Terra/Luna 2022, FTX 2022, yenul 2024, tarifele 2025, 10 octombrie 2025), fără mișcarea leului. Boții: gridul long cumpără la scădere până la marginea de jos (short-ul vinde la creștere), iar trecerea de prețul de lichidare = pierzi tot ce e în bot.",
    "Reconcilierea: cantitatea fiecărei acțiuni din jurnalul Radarului (umplerile T212, FIFO) față de ce raportează T212; boții închiși de pe prima pagină Pionex față de arhivă; boții porniți față de istoricul din Radar. O abatere vine o dată pe zi pe Discord.",
    "Randamentul ponderat în timp (Trading 212): înlănțuit zi cu zi (câștigul zilei ÷ banii la lucru în ziua aceea), deci depunerile și retragerile nu-l strâmbă. Reperele (S&P, BTC) sunt în LEI: randamentul lor în dolari compus cu mișcarea leului (leul a mișcat ~11 % față de dolar într-un an). Sharpe-ul și Sortino-ul T212 sunt anualizate pe 365 de zile, fără dobânda fără risc; intervalul Sharpe-ului e pe blocuri de 10 zile."
    + (b && b.boti && b.boti.netUsdt != null ? " Netul boților în dolari: " + ciMii(b.boti.netUsdt) + " USDT." : "")];
}
function ciFraza(r) {
  var v = r.valoare || {}, b = r.bani, rz = ciRiscZi(r), tot = v.total;
  var fr = "Contul tău: " + ciLei(tot) + (v.complet ? "" : " (fără " + (v.lipsa || []).join(", ") + ")") + ".";
  if (b && b.tot != null) fr += " Pe ultimul an ai " + (b.tot < 0 ? "pierdut " + ciLei(-b.tot) : "câștigat " + ciLei(b.tot)) + " net: boții " + ciLei(b.boti && b.boti.net, true) + " (după comisioane și funding), Trading 212 " + ciLei(b.t212 && b.t212.pnl, true) + ".";
  if (rz.var95 != null) fr += " Într-o zi proastă (1 din 20) pozițiile de acum pierd ~" + ciLei(rz.var95) + (tot > 0 ? " (" + ciPctF(rz.var95 / tot) + " din cont)" : "") + (rz.acum ? ", pe agitația de acum" : "") + ".";
  var sub = "";
  if (b && b.deschiseT212 && b.deschiseT212.lei != null) sub += "Pe pozițiile Trading 212 deschise stau acum " + ciLei(b.deschiseT212.lei, true) + " nerealizat (" + ciCate(b.deschiseT212.n, "poziție", "poziții") + "). ";
  var P = b && b.boti && b.boti.proces;
  if (P) sub += "Pierderea boților nu e ghinion: pe " + ciCate(P.zile, "zi", "zile") + " de închidere, " + ciPct(P.medie) + " din suma pusă pe zi (între " + ciPct(P.lo) + " și " + ciPct(P.hi) + "); din întâmplare ar ieși așa în " + ciSansa(P.p) + " din cazuri. ";
  var cr = (r.stres || [])[0]; if (cr) sub += "Cea mai rea criză din trecut, pe ce ai acum: " + cr.nume + ", " + ciLei(cr.lei, true) + ". ";
  return { fr: fr, sub: sub.trim() };
}
function ciFrazaHtml(r, st) {
  var F = ciFraza(r);
  return '<div class="cnFrazaBox grFrazaBox" id="ciFraza"><p class="grFraza ciRasp">' + ciEsc(F.fr) + "</p>" + (F.sub ? '<p class="grFrazaSub">' + ciEsc(F.sub) + "</p>" : "")
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + ciEsc(ciFac(r)) + "</p>"
    + '<details class="grSurse ciMetoda"' + (st && st.surse ? " open" : "") + "><summary>De unde știu</summary><ul>" + ciSurse(r).slice(0, 3).map(function (x) { return "<li>" + ciEsc(x) + "</li>"; }).join("") + "</ul>"
    + '<details class="ciMetoda"><summary>Cum am socotit</summary><ul>' + ciSurse(r).slice(3).map(function (x) { return "<li>" + ciEsc(x) + "</li>"; }).join("") + "</ul></details></details></div>";
}
function ciCifreHtml(r) {
  var v = r.valoare || {}, b = r.bani, rz = ciRiscZi(r), tot = v.total, ra = r.riscAcum;
  var cel = function (et, cifra, sub, ton) { return '<div class="cnCifra"><span class="cnEt">' + ciEsc(et) + '</span><b class="cnMare' + (ton || "") + '">' + ciEsc(cifra) + '</b><span class="cnMut cnMic">' + ciEsc(sub) + "</span></div>"; };
  var vechiDep = ra && ra.proba && ra.proba.vechi95 ? ra.proba.vechi95 : null;
  return '<div class="cnCifre" id="ciCifre">'
    + cel("Valoarea contului", ciLei(tot), "Pionex " + ciLei(v.pionex) + " · T212 " + ciLei(v.t212) + " · Salt " + ciLei(v.salt) + (v.complet ? "" : " · parțial"))
    + cel("Câștigul net pe ultimul an", b && b.tot != null ? ciLei(b.tot, true) : "—", b ? "boți " + ciLei(b.boti && b.boti.net, true) + " · T212 " + ciLei(b.t212 && b.t212.pnl, true) + (b.deschiseT212 ? " · deschise acum " + ciLei(b.deschiseT212.lei, true) : "") : "apare la tura următoare a colectorului", b && b.tot < 0 ? " cnAtent" : b && b.tot > 0 ? " cnBun" : "")
    + cel("Riscul azi (1 zi din 20)", rz.var95 != null ? "−" + ciLei(rz.var95) : "—", (tot > 0 && rz.var95 != null ? ciPctF(rz.var95 / tot) + " din cont" : "") + (rz.acum ? " · pe agitația de acum" : "") + (vechiDep ? " · cifra veche (" + ciLei(ra.vechi.var95) + ") a fost depășită în " + ciPctF(vechiDep.rata) + " din zile, nu în 5 %" : ""), " cnAtent")
    + "</div>";
}
function ciBloc(id, titlu, sub, corp) {
  return '<section class="cnBloc" id="' + id + '" aria-labelledby="' + id + '-h"><div class="cnBlocCap"><h3 id="' + id + '-h">' + ciEsc(titlu) + "</h3>" + (sub ? '<span class="cnMut cnMic">' + ciEsc(sub) + "</span>" : "") + "</div>" + corp + "</section>";
}

// ---------------- v100.369: banii (lei net, pe bucăți) ----------------
function ciBaniHtml(r) {
  var b = r.bani, ra = r.randament || {}, h = "";
  if (!b) return '<p class="tbSub">Banii pe bucăți apar la tura următoare a colectorului (raportul de acum e de formă veche).</p>';
  var B = b.boti, T = b.t212, I = ra.t212Interval, fs = I && I.fata;
  var rand = function (et, lei, alt, cls) { return "<tr" + (cls ? ' class="' + cls + '"' : "") + "><td>" + ciEsc(et) + '</td><td class="num"><b>' + ciEsc(ciLei(lei, true)) + '</b></td><td class="tbSub">' + ciEsc(alt || "") + "</td></tr>"; };
  h += '<div class="t212TabWrap"><table class="t212Tab ciTab ciBani"><thead><tr><th>Bucata</th><th>Lei</th><th>Ce înseamnă</th></tr></thead><tbody>'
    + (T ? rand("Trading 212", T.pnl, "ponderat în timp " + ciPct(T.twr) + " pe " + ciCate(T.n, "zi", "zile") + " (procentul și leii pot avea semne diferite)") : rand("Trading 212", null, "n-am putut reface seria"))
    + (B ? rand("Boții · grila", B.grila, "ce au prins liniile gridului") + rand("Boții · direcția prețului", B.directie, "prețul a ieșit din bandă și a rămas acolo") + rand("Boții · comisioanele", B.comisioane, "Pionex, la fiecare umplere") + rand("Boții · funding-ul", B.funding, "plătit / primit pe poziția futures")
      + rand("Boții închiși · net", B.net, ciCate(B.n, "bot închis", "boți închiși") + (B.zile ? " în " + ciCate(B.zile, "zi", "zile") : ""), "ciTot") : rand("Boții închiși", null, "arhiva n-a venit"))
    + (B && B.pornite && B.pornite.n ? rand("Boții porniți acum", B.pornite.lei, "profitul de acum din Pionex, nerealizat") : "")
    + rand("Tot contul", b.tot, "pe ultimul an, " + ciZi(b.an && b.an.de) + " – " + ciZi(b.an && b.an.pana), "ciTot")
    + (b.deschiseT212 ? rand("Pe pozițiile T212 deschise, acum", b.deschiseT212.lei, "nerealizat, din Trading 212 (e deja în cifra T212 de sus)") : "")
    + "</tbody></table></div>";
  var P = B && B.proces;
  if (P) h += '<p class="ciRasp">' + ciEsc("Boții: pe " + ciCate(P.zile, "zi", "zile") + " de închidere, netul a fost în medie " + ciPct(P.medie) + " din suma pusă (interval 90 %: " + ciPct(P.lo) + " … " + ciPct(P.hi) + "), doar " + ciPctF(P.pePlus) + " din zile pe plus. Din întâmplare ar ieși așa în " + ciSansa(P.p) + " din cazuri: e felul în care merg boții, nu ghinion.") + "</p>";
  if (B && B.directie < 0 && B.grila > 0) h += '<p class="tbSub">Grila își face treaba; pierderea vine din direcție și din comisioane: banda, stopul, levierul și câți boți scurți pornești (fiecare plătește comisioanele de la capăt).</p>';
  if (I) h += '<p class="ciRasp">' + ciEsc("Trading 212: Sharpe " + ciNr(I.sharpe) + " (interval 90 %: " + ciNr(I.sharpeLo) + " … " + ciNr(I.sharpeHi) + ")" + (fs ? "; față de S&P în lei (" + ciPct(fs.reper) + " pe aceleași " + ciCate(fs.n, "zi", "zile") + " de bursă), diferența ar ieși din întâmplare în " + ciSansa(fs.p) + " din cazuri" + (fs.p < 0.05 ? "" : ", deci nu e dovedită") : "") + (ra.btcLei ? "; BTC în lei " + ciPct(ra.btcLei.reper) : "") + ".") + "</p>";
  var t2 = ra.t212;
  if (t2 && t2.maxDd != null) h += '<p class="tbSub">' + ciEsc("Trading 212, pe același an: scăderea maximă " + ciPct(t2.maxDd) + (t2.ziMaxDd ? " (până pe " + ciZi(t2.ziMaxDd) + ")" : "") + (t2.sortino != null && isFinite(t2.sortino) ? ", Sortino " + ciNr(t2.sortino) + " (ca Sharpe, doar pe zilele cu pierdere)" : "") + (t2.zilePlus != null && isFinite(t2.zilePlus) ? ", " + ciPctF(t2.zilePlus, 0) + " din zile pe plus" : "") + ".") + "</p>";
  if (T && T.twr < 0 && T.pnl > 0) h += '<p class="tbSub">' + ciEsc("Procentul și leii au semne diferite: pierderile procentuale au venit pe puțini bani investiți, câștigurile pe mulți.") + "</p>";
  var G = typeof ContGrafice !== "undefined" ? ContGrafice : null, g = r.grafice || {};
  if (G && g.boti && g.boti.length > 1) h += '<div class="cnGr"><h5>Banii boților închiși pe ultimul an, cumulat, pe bucăți</h5><p class="cnMut cnMic">lei la cursul zilei închiderii · netul = grila + direcția + comisioanele + funding-ul</p>' + G.botiBucati(g.boti, { lat: ciLat(), net: B && B.net }) + "</div>";
  var note = [];
  if (ra.t212Aprox && ra.t212Aprox.length) note.push(ciCate(ra.t212Aprox.length, "simbol fără prețuri primite e ținut", "simboluri fără prețuri primite sunt ținute") + " la ultimul preț de tranzacție (n-am avut prețuri: delistat, ținut minte 7 zile după un 404 sau o eroare).");
  if (ra.t212Nepotrivite && ra.t212Nepotrivite.length) note.push(ciCate(ra.t212Nepotrivite.length, "simbol are", "simboluri au") + " prețuri care nu se potrivesc cu tranzacțiile tale (alt simbol sau o împărțire de acțiuni): " + ra.t212Nepotrivite.slice(0, 8).map(function (t) { return String(t).replace(/_US_EQ$|_EQ$/, ""); }).join(", ") + (ra.t212Nepotrivite.length > 8 ? "…" : "") + " - merg pe prețurile tranzacțiilor.");
  if (note.length) h += '<ul class="ciNote">' + note.map(function (n) { return '<li class="tbSub">' + ciEsc(n) + "</li>"; }).join("") + "</ul>";
  return h;
}

// ---------------- v100.369: riscul (cifra de acum + proba) ----------------
function ciRiscHtml(r) {
  var rs = r.risc || {}, ra = r.riscAcum, tot = r.valoare && r.valoare.total, div = r.diversificare, h = "";
  var cel = function (et, cifra, sub, cls) { return '<div class="ciCifra"><span>' + ciEsc(et) + '</span><b class="' + (cls || "") + '">' + ciEsc(cifra) + "</b><small>" + ciEsc(sub) + "</small></div>"; };
  var ic = function (k) { var x = ra && ra.acum && ra.acum.ic && ra.acum.ic[k]; return x ? "interval " + ciMii(x[0]) + " … " + ciMii(x[1]) + " lei" : ""; };
  var A = ra && ra.acum, V = ra && ra.vechi, PR = ra && ra.proba;
  h += '<div class="ciCifre">'
    + cel("Ziua proastă (1 din 20)", A ? "−" + ciLei(A.var95) : rs.var95 != null ? "−" + ciLei(rs.var95) : "—", A ? "VaR 95 % pe agitația de acum · ES −" + ciLei(A.es95) + " · " + ic("var95") : "VaR 95 % pe o zi · ES " + (rs.es95 != null ? "−" + ciLei(rs.es95) : "—"), "bad")
    + cel("Ziua foarte proastă (1 din 100)", A ? "−" + ciLei(A.var99) : rs.var99 != null ? "−" + ciLei(rs.var99) : "—", (A ? "VaR 99 % · ES −" + ciLei(A.es99) + " · " + ic("var99") : "VaR 99 % · ES " + (rs.es99 != null ? "−" + ciLei(rs.es99) : "—")) + " · orientativ: o zi din 100 se vede rar", "bad")
    + cel("Cea mai rea zi din ultimul an", rs.ziRea ? ciLei(rs.ziRea.lei, true) : "—", rs.ziRea ? "pe " + ciZi(rs.ziRea.z) + ", cu pozițiile de acum" : "", "bad")
    + cel("Pariuri independente", div ? ciNr(div.pariuri, 1).replace(",0", "") : "—", div ? "din " + ciCate(div.pozitii, "poziție", "poziții") + ": restul se mișcă împreună" : "", "")
    + "</div>";
  if (A && V && PR) {
    var k = function (x) { return x ? x.x + " din " + ciCate(x.n, "zi", "zile") + " = " + ciPctF(x.rata) : "—"; };
    h += '<p class="ciRasp">' + ciEsc("Cifra veche (ultimele 250 de zile, egal: −" + ciMii(V.var95) + " lei) ar fi fost depășită în " + k(PR.vechi95) + ", nu în 5 %: din întâmplare ar ieși așa în " + ciSansa(PR.vechi95.p) + " din cazuri. Cea de acum (zilele trecute re-scalate cu agitația de acum) a fost depășită în " + k(PR.acum95) + (PR.acum95.p >= 0.05 ? ", cât se poate pune pe seama întâmplării" : "") + ".") + "</p>";
    var ani = PR.ani || {};
    h += '<div class="t212TabWrap"><table class="t212Tab ciTab ciKupiec"><thead><tr><th>Anul</th><th>Zile</th><th>Peste cifra veche</th><th>Peste cifra de acum</th></tr></thead><tbody>'
      + Object.keys(ani).sort().map(function (a) { var y = ani[a]; return "<tr><td>" + ciEsc(a) + '</td><td class="num">' + y.n + '</td><td class="num">' + ciEt("veche") + ciEsc(y.vechi + " (" + ciPctF(y.vechi / y.n) + ")") + '</td><td class="num">' + ciEt("acum") + ciEsc(y.acum + " (" + ciPctF(y.acum / y.n) + ")") + "</td></tr>"; }).join("")
      + "</tbody></table></div>";
    h += '<p class="tbSub">' + ciEsc("Agitația: pe ultimele 20 de zile pozițiile au mișcat ~" + ciLei(ra.sigma20) + " pe zi (o abatere standard), pe 250 de zile ~" + ciLei(ra.sigmaFer) + "; pentru mâine ~" + ciLei(ra.sigma) + ". Pe zilele REALE ale contului (de când se ține valoarea) zilele sunt încă prea puține ca să judece ceva.") + "</p>";
  }
  var G = typeof ContGrafice !== "undefined" ? ContGrafice : null, g = r.grafice || {};
  h += '<div class="cnGrGrila">';
  if (G && g.risc && g.risc.length) h += '<div class="cnGr"><h5>Riscul față de zilele reale</h5><p class="cnMut cnMic">bara = cât au făcut pozițiile de acum în ziua aceea (roșu = peste pragul vechi) · linia punctată = pragul vechi, linia galbenă = pragul de acum · ultimele ' + ciEsc(ciCate(Math.min(250, g.risc.length), "zi", "zile")) + " de bursă</p>" + G.riscZile(g.risc, { lat: ciLatJ(), ultime: 250 }) + "</div>";
  var hs = ciHisto(rs.pnl, A ? A.var95 : rs.var95);
  if (hs) h += '<div class="cnGr"><h5>Câte zile au avut fiecare câștig sau pierdere</h5><p class="cnMut cnMic">pozițiile de acum pe ultimele ' + ciEsc(ciCate(rs.n || 250, "zi", "zile")) + " de bursă · linia = ziua proastă (1 din 20)</p>" + hs + "</div>";
  h += "</div>";
  if (rs.n && rs.n < 60) h += '<p class="tbWarn">Doar ' + ciEsc(ciCate(rs.n, "zi", "zile")) + " de istorie comună: cifrele de risc sunt orientative.</p>";
  if (rs.scoase && rs.scoase.length) h += '<p class="tbSub">Fără ' + ciEsc(rs.scoase.map(function (x) { return x.nume + " (" + x.motiv + ")"; }).join(", ")) + ".</p>";
  return h;
}
function ciExpHtml(r) {
  var tot = r.valoare && r.valoare.total, ex = (r.expuneri || []).slice().sort(function (a, b) { return Math.abs(b.lei || 0) - Math.abs(a.lei || 0); });
  if (!ex.length) return '<p class="tbSub">Nicio poziție deschisă citită acum.</p>';
  /* v100.369 (🔵7): botul se spune „· bot Pionex” (STX bot = Stacks, STX acțiune = Seagate) */
  return '<p class="tbSub">Expunerea = cât se mișcă poziția la o mișcare a prețului (la boți, poziția reală de acum din Pionex, nu suma pusă). β = cât se mișcă față de BTC (crypto) sau Nasdaq (acțiuni) pe 180 de zile.</p><div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Poziție</th><th>Expunere</th><th>% din cont</th><th>β</th></tr></thead><tbody>'
    + ex.map(function (x) { return "<tr><td>" + ciEsc(x.nume) + (x.tip === "bot" ? '<span class="t212Mic"> · bot Pionex</span>' : "") + (x.lipsa ? ' <span class="tbWarn">(' + ciEsc(x.lipsa) + ")</span>" : "") + '</td><td class="num">' + ciEt("expunere") + ciEsc(ciLei(x.lei)) + '</td><td class="num">' + ciEt("din cont") + (tot > 0 && x.lei != null ? ciEsc(ciPctF(x.lei / tot)) : "—") + '</td><td class="num">' + ciEt("β") + ciEsc(ciNr(x.beta, 1)) + "</td></tr>"; }).join("") + "</tbody></table></div>";
}
function ciCorelHtml(r) {
  var co = r.corelatii || [], acelasi = co.filter(function (x) { return x.acelasiRisc; }), acop = co.filter(function (x) { return x.seAcopera; }), h = "";
  var li = function (x) { return "<li><b>" + ciEsc(x.a + " + " + x.b) + "</b> · ρ " + ciEsc(ciNr(x.rho)) + ' <span class="tbSub">(' + ciEsc(ciCate(x.n, "zi", "zile")) + " comune)</span></li>"; };
  if (acelasi.length) {
    h += '<p class="ciRasp">' + ciEsc((acelasi.length === 1 ? "O pereche e" : ciCate(acelasi.length, "pereche e", "perechi sunt")) + " practic același risc (ρ ≥ 0,6 pe ultimele 90 de zile), din " + ciCate(r.corelatiiN || co.length, "pereche", "perechi") + ":") + '</p><ul class="ciLista">' + acelasi.slice(0, 5).map(li).join("") + "</ul>";
    if (acelasi.length > 5) h += '<details class="ciMetoda"><summary>' + ciEsc("Încă " + ciCate(acelasi.length - 5, "pereche", "perechi")) + '</summary><ul class="ciLista">' + acelasi.slice(5).map(li).join("") + "</ul></details>";
  } else h += '<p class="tbSub">Nicio pereche cu ρ ≥ 0,6 pe ultimele 90 de zile.</p>';
  if (acop.length) h += '<p class="tbSub">Se acoperă (una câștigă când cealaltă pierde): ' + ciEsc(acop.map(function (x) { return x.a + " + " + x.b; }).join(", ")) + ".</p>";
  var G = typeof ContGrafice !== "undefined" ? ContGrafice : null, g = r.grafice || {}, pf = g.pariuri;
  if (G && pf && pf.length > 1) {
    var v60 = pf.map(function (x) { return x[1]; }), sub60 = v60.filter(function (x) { return x <= v60[v60.length - 1]; }).length;
    h += '<div class="cnGr"><h5>Câte pariuri independente porți, pe ferestre</h5><p class="cnMut cnMic">' + ciEsc("pe ultimii 2 ani, din 5 în 5 zile de bursă · acum " + ciNr(v60[v60.length - 1]) + " pe 60 de zile; în " + sub60 + " din " + ciCate(v60.length, "fereastră", "ferestre") + " a fost la fel de puțin sau mai puțin - corelațiile de acum sunt „regimul de acum”, nu o regulă veche") + "</p>" + G.pariuri(pf, { lat: ciLat(), pozitii: r.diversificare && r.diversificare.pozitii }) + "</div>";
  }
  return h;
}
function ciStresHtml(r) {
  var sr = r.stres || [], tot = r.valoare && r.valoare.total, h = "", ca = r.carte;
  if (sr.length) h += '<p class="tbSub">Randamentele din ferestrele reale ale crizelor (închideri zilnice), puse pe pozițiile de acum: cu istoria ei unde o are, altfel β × BTC / Nasdaq. Boții cumpără pe drum, iar lichidarea ia tot ce e în bot. În timpul zilei căderile au fost mai mari.</p><div class="t212TabWrap"><table class="t212Tab ciTab ciStres"><thead><tr><th>Criza</th><th>BTC</th><th>Nasdaq</th><th>Contul tău</th><th>Cel mai lovit</th></tr></thead><tbody>'
    + sr.map(function (s) { var p0 = (s.pozitii || [])[0]; return "<tr><td>" + ciEsc(s.nume) + '<br><span class="tbSub">' + ciEsc(ciZi(s.de).slice(0, 5) + "–" + ciZi(s.pana)) + '</span><span class="tbSub ciDoarTel">' + ciEsc("BTC " + ciPct(s.btc) + " · Nasdaq " + ciPct(s.qqq)) + '</span></td><td class="num ' + (s.btc < 0 ? "bad" : "good") + '">' + ciEt("BTC") + ciEsc(ciPct(s.btc)) + '</td><td class="num ' + (s.qqq < 0 ? "bad" : "good") + '">' + ciEt("Nasdaq") + ciEsc(ciPct(s.qqq)) + '</td><td class="num ' + (s.lei < 0 ? "bad" : "good") + '">' + ciEt("contul tău") + "<b>" + ciEsc(ciLei(s.lei, true)) + "</b>" + (tot > 0 ? '<br><span class="tbSub">' + ciEsc(ciPct(s.lei / tot)) + "</span>" : "") + "</td><td>" + ciEt("cel mai lovit") + (p0 ? ciEsc(p0.nume + " " + ciLei(p0.lei, true)) + (p0.lichidat ? ' <span class="bad">⚠ lichidat</span>' : "") : "—") + "</td></tr>"; }).join("") + "</tbody></table></div>";
  if (ca) {
    var L = function (x) { return ciLei(x * ca.expunere, true); };
    h += '<p class="ciRasp">' + ciEsc("Pozițiile de acum, ținute pe toată istoria lor: acum sunt la " + ciPct(ca.acum) + " (" + L(ca.acum) + ") de la vârf; cel mai jos au fost " + ciPct(ca.max.dd) + " (" + L(ca.max.dd) + ", de la " + ciZi(ca.max.de) + " la " + ciZi(ca.max.pana) + ")." + (ca.z5 ? " Cele mai rele 5 zile de bursă: " + ciPct(ca.z5.r) + " (" + ciZi(ca.z5.de) + " – " + ciZi(ca.z5.pana) + ")" : "") + (ca.z20 ? "; cele mai rele 20: " + ciPct(ca.z20.r) + "." : ".")) + "</p>";
    var G = typeof ContGrafice !== "undefined" ? ContGrafice : null, g = r.grafice || {};
    if (G && g.carte && g.carte.length > 1) h += '<div class="cnGr"><h5>Scăderea de la vârf a pozițiilor de acum</h5><p class="cnMut cnMic">' + ciEsc("procent din expunerea de acum (" + ciLei(ca.expunere) + "), pe istoria tuturor pozițiilor · punctul albastru = cel mai jos, cel gol = acum") + "</p>" + G.carte(g.carte, { lat: ciLat(), expunere: ca.expunere }) + "</div>";
  }
  return h || '<p class="tbSub">Crizele n-au putut fi socotite acum (lipsesc istoriile lungi).</p>';
}
function ciBrokeriHtml(r, st) {
  var rc = r.reconciliere || {}, rand = function (ok, titlu, detaliu) { return '<li class="' + (ok === null ? "" : ok ? "good" : "bad") + '">' + (ok === null ? "· " : ok ? "✓ " : "✗ ") + "<b>" + ciEsc(titlu) + "</b>" + (detaliu ? ' <span class="tbSub">' + ciEsc(detaliu) + "</span>" : "") + "</li>"; };
  return '<ul class="ciLista">'
    + (rc.t212 ? rand(rc.t212.ok, rc.t212.ok ? "Trading 212: cantitățile din jurnal = cele din cont" : "Trading 212: " + ciCate(rc.t212.abateri.length, "abatere", "abateri"), typeof rc.t212.verificate === "number" ? ciCate(rc.t212.verificate, "simbol verificat", "simboluri verificate") : "").replace("</li>", (rc.t212.ok ? "" : ciAbateriPliate(rc.t212.abateri, st.nepotriviri)) + "</li>") : rand(null, "Trading 212: necitit acum", ""))
    + (rc.arhiva ? rand(rc.arhiva.ok, rc.arhiva.ok ? "Arhiva boților are toți boții închiși din Pionex" : "Arhiva boților: lipsesc " + ciCate(rc.arhiva.lipsa.length, "bot", "boți"), ciCate(rc.arhiva.verificate, "bot verificat", "boți verificați") + " (prima pagină Pionex)") : rand(null, "Arhiva boților: necitită acum", ""))
    /* v100.369 (🟡12): fără „✓” verde pe nimic când nu e niciun bot pornit */
    + (rc.urmarire ? (rc.urmarire.verificate ? rand(rc.urmarire.ok, rc.urmarire.ok ? "Toți boții porniți au istoric proaspăt în Radar" : "Boți porniți fără istoric în Radar: " + rc.urmarire.lipsa.map(function (x) { return x.nume; }).join(", "), ciCate(rc.urmarire.verificate, "bot pornit", "boți porniți")) : rand(null, "Niciun bot pornit acum: n-am ce urmări", "")) : rand(null, "Urmărirea boților: necitită acum", ""))
    + rand(null, "Salt: pozițiile le scrii tu (Salt n-are o legătură de citire), deci nu am cu ce le compara", "")
    + "</ul><p class=\"tbSub\">" + ciEsc(typeof ContIntreg !== "undefined" && ContIntreg.margine ? ContIntreg.margine() : "") + "</p>" + ciExportHtml(st);
}
// factorii, atribuirea, MAE / MFE, volatilitatea, execuția (v100.178), cu textele reparate în v100.369
function ciFactoriHtml(r) {
  var h = "", fa = r.factori;
  if (fa && fa.actiuniLei > 0) {
    var pp = fa.sectoare.filter(function (x) { return x.pestePrag; }), ip = fa.industrii.filter(function (x) { return x.pestePrag; });
    h += '<p class="ciRasp">' + ciEsc(pp.length || ip.length ? "Acțiunile tale stau " + (ip.length ? ciPctF(ip[0].pondere, 0) + " într-o singură industrie (" + (ip[0].ro || ip[0].nume) + ": " + ip[0].pozitii.join(", ") + ")" : ciPctF(pp[0].pondere, 0) + " într-un singur sector (" + pp[0].ro + ")") + ", peste pragul de 40 %: când sectorul cade, cad toate deodată." : "Nicio industrie și niciun sector nu trec de 40 % din acțiuni.") + "</p>"
      + '<p class="tbSub">' + ciEsc("Pe factori (din " + ciLei(fa.actiuniLei) + " în acțiuni): piață " + ciLei(fa.factori.piata) + ", firme mici " + ciLei(fa.factori.mici, true) + ", momentum " + ciLei(fa.factori.momentum, true) + ", sectorul propriu " + ciLei(fa.factori.sector, true) + ". Adică la o zi cu S&P −1 %, acțiunile tale pierd ~" + ciLei(Math.abs(fa.factori.piata) * 0.01) + " doar din piață.") + "</p>"
      + '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Sector</th><th>% din acțiuni</th><th>Poziții</th></tr></thead><tbody>' + fa.sectoare.map(function (x) { return '<tr><td>' + ciEsc(x.ro) + (x.pestePrag ? ' <span class="bad">⚠ peste 40 %</span>' : "") + '</td><td class="num">' + ciEt("din acțiuni") + ciEsc(ciPctF(x.pondere, 0)) + "</td><td>" + ciEsc(x.pozitii.join(", ")) + "</td></tr>"; }).join("") + "</tbody></table></div>"
      + (fa.perPozitie && fa.perPozitie.length ? '<details class="ciMetoda"><summary>Factorii fiecărei poziții (regresie pe 250 de zile)</summary><ul>' + fa.perPozitie.map(function (x) { return "<li>" + ciEsc(x.nume + ": piață " + ciNr(x.piata) + ", firme mici " + ciNr(x.mici) + ", momentum " + ciNr(x.momentum) + (x.etf ? ", sectorul (" + x.etf + ") " + ciNr(x.sectorBeta) : "") + " · explică " + ciPctF(x.r2, 0) + " din mișcare") + "</li>"; }).join("") + "</ul></details>" : "");
  }
  // atribuirea: piață sau alegere (v100.369, 🔴5: o singură cifră T212 - cea din „Cât ai câștigat”; aici doar pasivul și alfa, pe zilele de bursă)
  var at = r.atribuire;
  if (at && (at.t212Spy || at.boti)) {
    var a1 = at.t212Spy, b1 = at.boti, lin2 = [];
    if (a1) lin2.push("Cu același beta (" + ciNr(a1.beta) + ") pe S&P" + (at.reperLei ? " în lei" : "") + " ai fi făcut " + ciPct(a1.pasiv) + " ⇒ alegerile tale (alfa) au adus " + ciPct(a1.alfa) + " (pe " + ciCate(a1.n, "zi", "zile") + " de bursă, până pe " + ciZi(a1.pana) + ")" + (a1.t != null ? (Math.abs(a1.t) < 2 ? ": cu eroarea de ±" + ciPctF(a1.eroare) + ", nu e dovedit în niciun sens" : ": peste eroarea de ±" + ciPctF(a1.eroare)) : "") + (a1.alfa < 0 && a1.t != null && Math.abs(a1.t) >= 2 ? "; un ETF pe S&P cu aceeași expunere ar fi ieșit mai bine." : "."));
    if (at.t212Qqq) lin2.push("Față de Nasdaq (QQQ), beta " + ciNr(at.t212Qqq.beta) + ": pasiv " + ciPct(at.t212Qqq.pasiv) + ", alfa " + ciPct(at.t212Qqq.alfa) + ".");
    h += "<h4>Piață sau alegere</h4>" + lin2.map(function (x) { return '<p class="ciRasp">' + ciEsc(x) + "</p>"; }).join("");
    if (b1 && b1.n && !r.bani) {
      var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " USDT"; };
      h += '<p class="ciRasp">' + ciEsc("Boții, pe ultimul an (" + ciCate(b1.n, "bot închis", "boți închiși") + "): grila a adus " + U(b1.grila) + ", direcția prețului " + U(b1.directie) + ", comisioanele " + U(b1.comisioane) + ", finanțarea " + U(b1.finantare) + " ⇒ net " + U(b1.net) + ".") + "</p>";
    } else if (b1 && b1.n) h += '<p class="tbSub">Boții, pe bucăți și în lei la cursul zilei închiderii, sunt la „Cât ai câștigat, corect socotit”.</p>';
  }
  var mm2 = r.maeMfe;
  if (mm2 && mm2.n >= 10) {
    var lin3 = ["Câștigătorii tăi au coborât de obicei până la " + ciPct(mm2.maeCastig) + " înainte să iasă pe plus; pierzătorii până la " + ciPct(mm2.maePierd) + "."];
    if (mm2.pierdDupaPlus5) lin3.push(ciCate(mm2.pierdDupaPlus5, "pierdere a fost", "pierderi au fost") + " întâi pe plus cu cel puțin 5 % (le-ai lăsat să se întoarcă).");
    if (mm2.lasatPeMasa !== null) lin3.push("La câștigători ai lăsat pe masă (vârful de pe drum minus ieșirea) " + ciPctF(mm2.lasatPeMasa) + " în mediană.");
    // audit 19.10 (5): economia NETĂ (pierderi salvate − câștiguri tăiate), pe aceleași trade-uri pe care s-a ales stopul (în eșantion); net ≤ 0 ⇒ nu-l propun
    var netCunoscut = mm2.economieNeta !== null && mm2.economieNeta !== undefined, baniSau = function (b, s) { return b !== null && b !== undefined ? ciLei(b, true) : ciPct(s); };
    var fac3 = mm2.stopSugerat !== null && mm2.stopSugerat !== undefined ? "Un stop la " + ciPct(mm2.stopSugerat) + " de la cumpărare ar fi păstrat 80 % din câștigători și ar fi tăiat mai devreme " + ciCate(mm2.taiatePierderi, "pierdere", "pierderi") + (mm2.economie ? " (cu ~" + ciPctF(mm2.economie) + " mai puțin pierdut la fiecare)" : "")
      + (netCunoscut ? ", dar ar fi costat " + baniSau(mm2.costatBani !== null && mm2.costatBani !== undefined ? -mm2.costatBani : null, -mm2.costat) + " (" + (mm2.castigTaiat ? ciCate(mm2.castigTaiat, "câștigător oprit", "câștigători opriți") + " și " : "") + "pierderile mai mici decât stopul, duse la stop)" + ": net " + baniSau(mm2.netBani, mm2.economieNeta) + ", măsurat pe aceleași trade-uri pe care l-am ales (în eșantion, deci optimist)" : "") + "." : "";
    var cand3 = mm2.stopCandidat;
    if (!fac3 && netCunoscut && cand3 !== null && cand3 !== undefined) lin3.push("Un stop la " + ciPct(cand3) + " (cel care păstra 80 % din câștigători) ar fi salvat " + baniSau(mm2.salvatBani, mm2.salvat) + " la pierderi, dar ar fi costat " + baniSau(mm2.costatBani !== null && mm2.costatBani !== undefined ? -mm2.costatBani : null, -mm2.costat) + " (" + (mm2.castigTaiat ? ciCate(mm2.castigTaiat, "câștigător oprit", "câștigători opriți") + " și " : "") + "pierderile mai mici, duse la stop): net " + baniSau(mm2.netBani, mm2.economieNeta) + " pe aceleași trade-uri, deci nu-l propun.");
    h += "<h4>Cât de jos merge un trade până să iasă</h4>" + lin3.map(function (x) { return '<p class="ciRasp">' + ciEsc(x) + "</p>"; }).join("") + (fac3 ? '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + ciEsc(fac3 + " E trecutul tău pe ultimul an, nu o garanție.") + "</p>" : "")
      + '<p class="tbSub">' + ciEsc(ciCate(mm2.n, "trade închis", "trade-uri închise") + " pe ultimul an (" + mm2.castig + " pe plus, " + mm2.pierd + " pe minus); din barele zilnice, deci ziua cumpărării și a vânzării intră întregi.") + "</p>";
  }
  var vo = r.vol;
  if (vo) {
    /* v100.369 (🟡6): două ținte numite - cea de manual (15 %) și garda ta (30 %) */
    h += "<h4>Cât de tare se mișcă contul</h4><p class=\"ciRasp\">" + ciEsc("Contul tău se mișcă cu ~" + ciPctF(vo.volAnual, 0) + " pe an (o abatere standard). Ținta de manual la un cont de tranzacționare e 15 %, garda ta e 30 %" + (vo.factor < 1 ? ": ca să atingi ținta de manual, expunerea de acum ar trebui ținută la ~" + ciPctF(vo.factor, 0) + " din ce e." : ": ești sub ea.")) + "</p>"
      + (vo.contrib && vo.contrib.length ? '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Poziție</th><th>Partea ei din riscul contului</th></tr></thead><tbody>' + vo.contrib.slice(0, 8).map(function (x) { return "<tr><td>" + ciEsc(x.nume) + '</td><td class="num">' + ciEt("din risc") + ciEsc(ciPctF(x.pondere, 0)) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "")
      + '<p class="tbSub">La o poziție nouă, Poarta din Trading 212 îți arată și mărimea „cu risc egal”: cât să pui ca poziția să aducă în cont cât o parte egală din ținta de 15 %.</p>';
  }
  var ex2 = r.executie;
  if (ex2 && ex2.n) {
    var lin = [];
    /* v100.369: procentele mici spuse în bani la 100 de lei (o zecimală nu le-ar mai deosebi) */
    var bani100 = function (x) { return x == null || !isFinite(x) ? "—" : (x < 0 ? "−" : "") + Math.round(Math.abs(x) * 10000) + " bani la 100 de lei"; };
    if (ex2.conversie && ex2.conversie.n) lin.push(["Conversia lei ↔ dolari", "comisionul T212: " + ciLei(ex2.conversie.lei) + " pe ultimul an (" + bani100(ex2.conversie.mediana) + " la o tranzacție)" + (ex2.conversie.fataBnr ? "; cursul folosit față de BNR: " + bani100(ex2.conversie.fataBnr.mediana) + " (mediana, " + ciCate(ex2.conversie.fataBnr.n, "tranzacție", "tranzacții") + ")" : ""), ex2.conversie.lei > 0 ? "bad" : ""]);
    if (ex2.pesteNoapte && ex2.pesteNoapte.n) lin.push(["Ordine la piață date cu bursa închisă", ciCate(ex2.pesteNoapte.n, "ordin umplut", "ordine umplute") + " abia la deschidere: față de închiderea dinainte, mediana " + ciPct(ex2.pesteNoapte.mediana) + ", cel mai rău " + ciPct(ex2.pesteNoapte.cel) + (ex2.pesteNoapte.cele && ex2.pesteNoapte.cele[0] ? " (" + String(ex2.pesteNoapte.cele[0].ticker).replace(/_US_EQ$|_EQ$/, "") + ")" : ""), ex2.pesteNoapte.mediana < 0 ? "bad" : ""]);
    if (ex2.stop && ex2.stop.n) lin.push(["Ordinele stop", ciCate(ex2.stop.n, "stop atins", "stopuri atinse") + ": ai ieșit cu mediana " + ciPct(ex2.stop.mediana) + " față de prețul de stop, cel mai rău " + ciPct(ex2.stop.cel), ex2.stop.mediana < -0.005 ? "bad" : ""]);
    if (ex2.subPlan && ex2.subPlan.n) lin.push(["Ieșiri sub stopul din planul tău", ciCate(ex2.subPlan.n, "vânzare", "vânzări") + " sub stopul scris în Radar: mediana " + ciPct(ex2.subPlan.mediana) + " sub el, cel mai rău " + ciPct(ex2.subPlan.cel), "bad"]);
    if (ex2.limita && ex2.limita.n) lin.push(["Ordinele limită", ciCate(ex2.limita.n, "ordin", "ordine") + ": mediana " + bani100(ex2.limita.mediana) + " față de limită (≥ 0 = cel puțin cât ai cerut)", ""]);
    h += '<h4>Cât te costă execuția</h4><p class="tbSub">Prețul plănuit (stopul, limita, prețul de când ai dat ordinul) față de cel obținut, pe ultimul an. ' + (ex2.cuTip < ex2.n ? "Tipul ordinului îl știu pentru " + ciCate(ex2.cuTip, "umplere", "umpleri") + " din " + ciMii(ex2.n) + " (istoricul vechi se completează singur, câteva pagini la 5 minute)." : "") + '</p><ul class="ciLista">'
      + (lin.length ? lin.map(function (x) { return '<li><b>' + ciEsc(x[0]) + ':</b> <span class="' + x[2] + '">' + ciEsc(x[1]) + "</span></li>"; }).join("") : '<li class="tbSub">Încă nimic de măsurat (ordinele vechi n-au tipul lor; vin pe măsură ce se completează istoricul).</li>') + "</ul>";
  }
  return h || '<p class="tbSub">Factorii apar după prima tură a colectorului.</p>';
}
// v100.179 (el 13.10: „fă 1, 2, 3, 4”): gărzile LUI (din datele lui), lecția săptămânii (duminică seara, cu verificarea regulii de data trecută),
// ce se întâmplă după ce prețul iese din banda gridului (din boții lui închiși) - informează, nu blochează
function ciDisciplinaHtml(r, banda, lectii, st) {
  var h = "", g = r && r.garzi, e = st && st.erori || {};
  if (g && g.length) {
    var rele = g.filter(function (x) { return !x.ok; });
    h += '<h4>Gărzile tale</h4><p class="ciRasp">' + ciEsc(rele.length ? ciCate(rele.length, "gardă e încălcată", "gărzi sunt încălcate") + " acum. Le vezi și la Poartă; pe Discord vine câte o alertă pe zi." : "Toate gărzile sunt respectate.") + '</p><ul class="ciLista">'
      + g.map(function (x) { return '<li class="' + (x.ok ? "good" : "bad") + '">' + (x.ok ? "✓ " : "✗ ") + "<b>" + ciEsc(x.titlu) + "</b>" + (x.detaliu ? " · " + ciEsc(x.detaliu) : "") + ' <span class="tbSub">(' + ciEsc(x.sursa) + ")</span></li>"; }).join("") + "</ul>";
  }
  var l = Array.isArray(lectii) && lectii.length ? lectii[lectii.length - 1] : null;
  h += "<h4>Lecția săptămânii</h4>";
  if (!l) h += '<p class="tbSub">' + ciEsc(e.lectii ? "N-am putut citi lecțiile acum (" + e.lectii + ")." : "Vine duminică seara (și pe Discord): cele mai scumpe 3 decizii ale săptămânii, ce regulă a ta au încălcat, cât au costat, și o singură regulă pentru săptămâna care vine. Duminica următoare: ai respectat-o?") + "</p>";
  else {
    var L = l.lectie || {}, v = l.verificare;
    if (v) h += '<p class="' + (v.respectata ? "good" : "bad") + '">' + ciEsc("Regula de data trecută („" + v.text + "”): " + (v.respectata ? "respectată ✓" : "încălcată de " + ciCate(v.incalcari, "dată", "ori"))) + "</p>";
    /* v100.369 (🔵7): „STX (bot)” = Stacks; „· bot Pionex” ca să nu se confunde cu Seagate */
    h += (L.top && L.top.length ? '<ol class="ciLista">' + L.top.map(function (d) { return "<li><b>" + ciEsc(String(d.ce).replace(/ \(bot\)$/, " · bot Pionex")) + "</b> · −" + ciEsc(ciMii(d.cost)) + " lei · " + ciEsc(d.motive.map(function (m) { return m.text; }).join("; ")) + "</li>"; }).join("") + "</ol>" : '<p class="good">Săptămâna asta nicio pierdere n-a încălcat o regulă a ta.</p>')
      + (L.regula ? '<p class="t212Fac">👉 <b>Regula săptămânii:</b> ' + ciEsc(L.regula.text) + ' <span class="tbSub">(' + ciEsc("a costat " + ciMii(L.regula.cost) + " lei săptămâna trecută") + ")</span></p>" : "")
      /* v100.369 (🟡2): ziua în ora României (era UTC: „07.11” pentru 08.11, 00:03) și vârsta lecției */
      + '<p class="tbSub">' + ciEsc("Săptămâna " + (ciZiDinLa(L.de) || "—") + " – " + ciZi(l.sapt) + (l.la ? " · făcută pe " + ciZiDinLa(l.la) + ", " + ciOraRo(l.la) : "") + ".") + "</p>";
  }
  if (banda && Array.isArray(banda.tabel)) {
    /* v100.369 (🟡, semnul): în date, negativ = prețul a mers MAI DEPARTE împotriva botului; pe pagină „împotrivă” e pozitiv */
    var R = banda.regula, imp = function (x) { return x == null || !isFinite(x) ? null : -x; };
    /* sub 0,1 % (cât nu se mai vede cu o zecimală) = pe loc */
    var P = function (x) { var v = imp(x); return v == null ? "—" : Math.abs(v) < 0.001 ? "pe loc" : v > 0 ? ciPctF(v) + " împotrivă" : ciPctF(-v) + " înapoi"; };
    var IW = function (x) { return x && x.intoarseLo != null && x.intoarseHi != null ? Math.round(x.intoarseLo * 100) + "–" + Math.round(x.intoarseHi * 100) + " %" : null; };
    var mers = function (x) { var v = imp(x); return v == null ? "" : Math.abs(v) < 0.001 ? "prețul a stat practic pe loc" : v > 0 ? "prețul a mers încă " + ciPctF(v) + " împotriva botului" : "prețul s-a întors " + ciPctF(-v) + " spre bot"; };
    var prinde30 = R && R.intoarseLo != null && R.intoarseHi != null && R.intoarseLo <= 0.3 && R.intoarseHi >= 0.3;
    h += '<h4>Când iese botul din bandă</h4><p class="ciRasp">' + ciEsc(R ? "Din boții tăi închiși: după " + ciCate(R.h, "oră", "ore") + " afară din bandă, doar " + Math.round(R.intoarse * 100) + " %" + (IW(R) ? " (interval 95 %: " + IW(R) + ")" : "") + " s-au mai întors în 24 h, iar " + mers(R.miscareImpotriva) + " (mediana; " + ciCate(R.n, "caz", "cazuri") + "). Regula de până acum: după " + ciCate(R.h, "oră", "ore") + " afară, închizi sau muți banda - alerta vine singură." + (prinde30 ? " Intervalul cuprinde pragul de 30 %, deci regula nu e încă dovedită: e cea mai bună citire de acum." : "") : "Prea puține ieșiri din bandă în istoria ta ca să scot o regulă (cel puțin 30 la un prag).") + "</p>"
      + '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Afară de</th><th>Cazuri</th><th>S-au întors în 24 h</th><th>Mișcarea în continuare</th></tr></thead><tbody>'
      + banda.tabel.map(function (x) { return '<tr' + (R && x.h === R.h ? ' class="ciAles"' : "") + "><td>" + ciEsc(ciCate(x.h, "oră", "ore")) + '</td><td class="num">' + ciEt("cazuri") + ciEsc(String(x.n)) + '</td><td class="num">' + ciEt("întoarse") + ciEsc(x.intoarse == null ? "—" : Math.round(x.intoarse * 100) + " %" + (IW(x) ? " (" + IW(x) + ")" : "")) + '</td><td class="num">' + ciEt("mișcarea") + ciEsc(P(x.miscareImpotriva)) + "</td></tr>"; }).join("") + "</tbody></table></div>"
      + ((banda.grupe || []).length ? '<p class="tbSub">' + ciEsc("Rezultatul net (mediana) după cât au stat afară: " + banda.grupe.filter(function (x) { return x.n; }).map(function (x) { return x.grupa + " " + ciPct(x.netMedian) + " (" + x.n + ")"; }).join(" · ") + ".") + "</p>" : "")
      + (banda.la ? '<p class="tbSub">' + ciEsc("Socotit pe " + ciZiDinLa(banda.la) + ", " + ciOraRo(banda.la) + ".") + "</p>" : "");
  } else if (e.banda) h += '<p class="tbSub">' + ciEsc("N-am putut citi ieșirile din bandă acum (" + e.banda + ").") + "</p>";
  return h;
}
// v100.196 (auditul sever 14.10, 🟡2): ce familii de teste are registrul - corecția Benjamini–Hochberg ține descoperirile false DOAR între ele
function ciFamiliiRegistru(rg) {
  var N = { verdict: "jurnalul verdictelor", obicei: "obiceiurile din Riscul tău", bec: "becurile și ADX-ul boților", carnet: "carnetul", laborator: "laboratorul", model: "modelele 🧠/🌳" }, v = [];
  (rg || []).forEach(function (x) { var n = N[x && x.felul] || (x && x.felul); if (n && v.indexOf(n) < 0) v.push(n); });
  return v.join(", ");
}
// v100.177 (jurnalul verdictelor): au avut dreptate verdictele Radarului? + registrul TUTUROR testelor cu corecția pentru teste multiple
function ciVerdicteHtml(c, st) {
  var h = "", e = st && st.erori || {};
  if (!c) return h + '<p class="tbSub">' + ciEsc(e.verdicte ? "N-am putut citi verdictele acum (" + e.verdicte + ")." : "Jurnalul verdictelor se umple de acum: fiecare verificare la Poartă (T212 și grid), ideile zilei și regimul macro se țin minte cu prețul de atunci și se judecă după 5 / 20 de zile de bursă (gridul după 1 / 3 zile). Prima judecată vine după prima tură de noapte a colectorului.") + "</p>";
  var P = function (x, z) { return ciPct(x, z); };
  /* v100.369 (🟡7): „ușor pentru / ușor contra” (veneau cheile brute „usorpentru”) */
  var NIV = { cumpara: "cumpără", asteapta: "așteaptă", nu: "nu", porneste: "pornește", cumpar: "idee", riskon: "pofta de risc", inclinat: "înclinat spre risc", neutru: "neutru", prudent: "prudent", riskoff: "fuga de risc", stres: "stres", pentru: "pentru", contra: "contra", usorpentru: "ușor pentru", usorcontra: "ușor contra" };
  var cal = c.calibrare || [], testate = cal.filter(function (r) { return r.test && r.test.stare === "testat"; });
  h += '<p class="ciRasp">' + ciEsc(ciCate(cal.length, "măsurătoare", "măsurători") + ": " + (testate.length ? ciCate(testate.length, "are", "au") + " destule cazuri ca să fie judecate" : "niciuna nu are încă destule cazuri, deci n-am aflat încă dacă verdictele au avut dreptate (nedovedit nu înseamnă greșit)") + ".") + "</p>";
  h += '<p class="tbSub">' + ciEsc(ciCate(c.n || 0, "verdict ținut minte", "verdicte ținute minte") + ", dintre care " + ciMii(Number(c.evaluate || 0)) + " au fost judecate (cele mai noi încă își așteaptă orizontul)." + (c.la ? " Socotit pe " + ciZiDinLa(c.la) + ", " + ciOraRo(c.la) + "." : "")) + "</p>";
  var parti = cal.map(function (r) {
    var lin = r.niveluri.slice().sort(function (a, b) { return b.n - a.n; }).map(function (x) { return "<tr><td>" + ciEsc(NIV[x.nivel] || x.nivel) + '</td><td class="num">' + ciEsc(String(x.n)) + '</td><td class="num">' + ciEsc(r.masura === "linistit" ? Math.round(x.medie * 100) + " % au stat în bandă" : P(x.medie)) + '</td><td class="num">' + ciEsc(r.masura === "linistit" ? "—" : ciPctF(x.pePlus, 0)) + "</td></tr>"; }).join("");
    var zi1 = r.unitate === "zi";   /* v100.195: coșurile (~20 de nume pe zi) se judecă pe zile independente, nu pe nume */
    /* v100.306 (I-834): la Poartă (pe zi) testul cere și cel puțin 8 simboluri și 8 săptămâni - motivul se spune, nu „puține cazuri” */
    var t = r.test || {}, v = t.stare === "putine" ? (t.motiv === "simboluri" ? "puține simboluri încă (" + Number(t.simboluri || 0) + ", trebuie cel puțin " + Number(t.minSimboluri || 8) + "; eticheta ține zile la rând pe același simbol, deci simbolul e unitatea testului)" : t.motiv === "saptamani" ? "puține săptămâni încă (" + Number(t.saptamani || 0) + ", trebuie cel puțin " + Number(t.minSaptamani || 8) + "; verdictele aceleiași săptămâni trec prin aceeași piață)" : zi1 && t.zileAmestecate && t.minU && Number(t.unitati) < t.minU ? "puține zile cu ambele feluri de verdict încă (" + Number(t.unitati || 0) + ", trebuie cel puțin " + Number(t.minU) + "; verdictele din aceeași zi trec prin aceeași piață, deci se compară în ziua lor)" : zi1 && t.minU && Number(t.unitati) < t.minU ? "puține zile independente încă (" + Number(t.unitati || 0) + ", trebuie cel puțin " + Number(t.minU) + "; numele aceleiași zile se mișcă împreună, deci se judecă împreună)" : "puține cazuri încă (" + Number(t.nFav) + " / " + Number(t.nRest) + ", trebuie cel puțin 30 pe fiecare parte)") : t.stare === "testat" ? "diferența " + (r.masura === "linistit" ? Math.round(t.dif * 100) + " puncte" : P(t.dif)) + ", din întâmplare ar ieși așa în " + ciSansa(t.p) + " din cazuri" + (zi1 && t.unitati ? ", pe " + (t.zileAmestecate ? ciCate(Number(t.unitati), "zi cu ambele feluri", "zile cu ambele feluri") : ciCate(Number(t.unitati), "zi independentă", "zile independente")) : "") : "";
    /* v100.369 (🟡8): „după 20 de zile” (regula lui „de” de la 20) */
    var dupa = r.masura === "linistit" || r.masura === "net" ? ciCate(r.h, "zi", "zile") : ciCate(r.h, "zi", "zile") + " de bursă";
    return "<h4>" + ciEsc(r.nume + " · după " + dupa) + '</h4><p class="tbSub">' + ciEsc(r.intrebare + (v ? ": " + v : "")) + '</p><div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Verdict</th><th>Câte</th><th>' + (r.masura === "pesteQqq" ? "Față de QQQ" : r.masura === "pesteSpy" ? "Față de SPY" : r.masura === "linistit" ? "Rezultat" : "Media") + "</th><th>Pe plus</th></tr></thead><tbody>" + lin + "</tbody></table></div>";
  });
  /* v100.369 (🔵3): cele 13 sub-tabele într-un singur pliu, cu rezumatul de deasupra */
  if (parti.length) h += '<details class="ciMetoda"><summary>' + ciEsc("Măsurătorile, una câte una (" + parti.length + ")") + "</summary>" + parti.join("") + "</details>";
  var rg = c.registru || [];
  if (rg.length) {
    var ram = rg.filter(function (x) { return x.ramane; }), leg = rg.filter(function (x) { return x.treceBh && x.cauza === false; });
    /* v100.196 (🟡2): corecția ține doar între testele din registru - restul au regulile lor; 🟡3: legăturile (se știu abia la ieșire) nu sunt reguli */
    var afara = [["model", "modelele 🧠/🌳"], ["laborator", "laboratorul"], ["carnet", "carnetul"]].filter(function (f) { return !rg.some(function (x) { return x.felul === f[0]; }); }).map(function (f) { return f[1]; }).concat(["Dovada pe bot"]);
    h += '<h4>Ce e dovedit cu adevărat (după corecția pentru teste multiple)</h4><p class="ciRasp">' + ciEsc("Registrul are " + ciCate(rg.length, "test", "teste") + " deschise, din " + ciFamiliiRegistru(rg) + ". Cu atâtea, câteva ies „dovedite” din întâmplare; între ele, corecția Benjamini–Hochberg ține descoperirile false la cel mult ~5 %, și rămân " + (ram.length ? ciCate(ram.length, "lucru dovedit", "lucruri dovedite") + ":" : "niciunul dovedit.")) + "</p>"
      + (ram.length ? '<ul class="ciLista">' + ram.map(function (x) { return "<li><b>" + ciEsc(x.afirmatie) + "</b> · " + ciEsc((x.directie ? x.directie + " · " : "") + x.sursa) + ' <span class="tbSub">(' + ciEsc("din întâmplare: " + ciSansa(x.p)) + ")</span></li>"; }).join("") + "</ul>" : "")
      + (leg.length ? '<p class="tbSub">' + ciEsc("Trec corecția, dar se știu abia la ieșire, deci nu sunt reguli de urmat: " + leg.map(function (x) { return x.afirmatie + " — " + (x.limita || "legătură, nu cauză"); }).join("; ") + ".") + "</p>" : "")
      + '<p class="tbSub">' + ciEsc("În afara corecției, cu regulile lor proprii: " + afara.join(", ") + ".") + "</p>"
      + '<details class="ciMetoda"><summary>Toate testele (' + ciEsc(String(rg.length)) + ")</summary><ul>" + rg.slice().sort(function (a, b) { return a.p - b.p; }).map(function (x) { return '<li class="' + (x.ramane ? "good" : "") + '">' + ciEsc(x.sursa + " · " + x.afirmatie + (x.directie ? " · " + x.directie : "") + " · din întâmplare " + ciSansa(x.p) + (x.cauza === false && x.limita ? " · " + x.limita : x.stareVeche && /^dovedit/.test(x.stareVeche) && !x.ramane ? " · pagina lui zicea „dovedit”, după corecție NU mai e" : x.treceBh && !x.ramane ? " · p mic, dar nu trece regula lui fixată dinainte (direcția / cele două jumătăți)" : "")) + "</li>"; }).join("") + "</ul></details>";
  }
  return h;
}

// ---------------- pagina întreagă ----------------
function ciHtml(r, st) {
  st = st || {};
  var e = st.erori || {};
  if (!r) return ciVarstaHtml(null, st) + '<p class="tbSub">' + ciEsc(e.cont ? "Nu pot citi raportul acum." : "Raportul pe tot contul îl face colectorul la 6 ore (boți, Trading 212, Salt, prețurile pe doi ani, crizele din 2020–2025). Încă nu există: pornește colectorul și revino peste câteva minute.") + "</p>"
    + ciBloc("ciSZile", "Valoarea contului pe zile", "", ciZileHtml(st.zile, e)) + ciBloc("ciSBrokeri", "Se potrivește cu brokerii?", "", ciExportHtml(st) + ciMasuraHtml(st));
  var b = r.bani, rz = ciRiscZi(r), tot = r.valoare && r.valoare.total, co = (r.corelatii || []).filter(function (x) { return x.acelasiRisc; }).length, g = (r.garzi || []).filter(function (x) { return !x.ok; }).length, rc = r.reconciliere || {};
  var recOk = !((rc.t212 && !rc.t212.ok) || (rc.arhiva && !rc.arhiva.ok) || (rc.urmarire && !rc.urmarire.ok));
  return ciVarstaHtml(r, st) + ciFrazaHtml(r, st) + ciCifreHtml(r)
    + ciBloc("ciSBani", "Cât ai câștigat, corect socotit", b && b.an ? "lei net, pe ultimul an · boții fără procent" : "", ciBaniHtml(r))
    + ciBloc("ciSRisc", "Riscul pe o zi", "cifra de acum și proba ei pe zilele reale", ciRiscHtml(r))
    + ciBloc("ciSStres", "Dacă vine iar o criză", (r.stres || [])[0] ? "cea mai rea: " + r.stres[0].nume + ", " + ciLei(r.stres[0].lei, true) : "", ciStresHtml(r))
    + ciBloc("ciSZile", "Valoarea contului pe zile", "", ciZileHtml(st.zile, e))
    + ciBloc("ciSDisc", "Gărzile tale · lecția · banda", g ? ciCate(g, "gardă încălcată", "gărzi încălcate") : "", ciDisciplinaHtml(r, st.banda, st.lectii, st) + ciMasuraHtml(st))
    + ciBloc("ciSCorel", "Ce se mișcă împreună", "", ciCorelHtml(r))
    + ciBloc("ciSExp", "Pe ce stă riscul", tot > 0 && rz.var95 ? ciCate((r.expuneri || []).length, "poziție", "poziții") : "", ciExpHtml(r))
    + ciBloc("ciSBrokeri", "Se potrivește cu brokerii?", recOk ? "totul se potrivește" : "o abatere de verificat", ciBrokeriHtml(r, st))
    + ciBloc("ciSFactori", "Pe ce pariezi de fapt", "factorii · piață sau alegere · execuția", ciFactoriHtml(r))
    + ciBloc("ciSVerd", "Au avut dreptate verdictele?", "", ciVerdicteHtml(st.verdicte, st));
}
// rândurile pliate - aceeași formă ca paginile refăcute (data-rand + data-titlu + data-rezumat), starea în „ciRanduri”.
// Fapta rămâne la vedere (banii, riscul, crizele, zilele, gărzile); se pliază decorul. Brokerii se deschid singuri la o abatere.
var CI_RAND_KEY = "ciRanduri", CI_RANDURI = { ciSBani: "Cât ai câștigat, corect socotit", ciSRisc: "Riscul pe o zi", ciSStres: "Dacă vine iar o criză", ciSZile: "Valoarea contului pe zile", ciSDisc: "Gărzile tale · lecția · banda", ciSCorel: "Ce se mișcă împreună", ciSExp: "Pe ce stă riscul", ciSBrokeri: "Se potrivește cu brokerii?", ciSFactori: "Pe ce pariezi de fapt", ciSVerd: "Au avut dreptate verdictele?" };
var CI_RAND_DESCHIS = { ciSBani: 1, ciSRisc: 1, ciSStres: 1, ciSZile: 1, ciSDisc: 1 };
function ciRandStare() { try { var o = JSON.parse(localStorage.getItem(CI_RAND_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
function ciRandAplica() {
  if (typeof document === "undefined") return;
  var st = ciRandStare(), pune = function (e, k, v) { if (e.getAttribute(k) !== v) e.setAttribute(k, v); }, r = ciStare.raport, rc = r && r.reconciliere || {};
  var abatere = (rc.t212 && !rc.t212.ok) || (rc.arhiva && !rc.arhiva.ok) || (rc.urmarire && !rc.urmarire.ok);
  Object.keys(CI_RANDURI).forEach(function (id) {
    var e = document.getElementById(id); if (!e) return; var deschis = st[id] === true || (st[id] !== false && (!!CI_RAND_DESCHIS[id] || (id === "ciSBrokeri" && abatere)));
    pune(e, "data-rand", deschis ? "deschis" : "pliat"); pune(e, "data-titlu", CI_RANDURI[id]); pune(e, "aria-expanded", String(deschis));
    if (deschis) { if (e.hasAttribute("tabindex")) e.removeAttribute("tabindex"); if (e.getAttribute("role") === "button") e.removeAttribute("role"); return; }
    pune(e, "tabindex", "0"); pune(e, "role", "button"); pune(e, "data-rezumat", typeof tbRandRezumat === "function" ? tbRandRezumat(e, CI_RANDURI[id]) : "");
  });
}
function ciRandComuta(id, deschis) {
  if (!Object.prototype.hasOwnProperty.call(CI_RANDURI, id)) return; var st = ciRandStare(), acum = st[id] === true || (st[id] !== false && !!CI_RAND_DESCHIS[id]);
  if (deschis == null) deschis = !acum; st[id] = !!deschis; try { localStorage.setItem(CI_RAND_KEY, JSON.stringify(st)); } catch (e) {} ciRandAplica();
}
function ciExportCitit() {
  try { var o = JSON.parse(localStorage.getItem("radar-export-t212-v1") || "null"); return o && typeof o === "object" ? o : null; }
  catch (e) { return null; }
}
function ciExportPune(o) {
  try { localStorage.setItem("radar-export-t212-v1", JSON.stringify(o)); } catch (e) {}
  ciStare.export = o;
}
async function ciBotiMasura() {
  try {
    if (typeof scTrades === "function") { var tr = scTrades("pionex"); if (tr) return tr; }
    var d = await getJSON("/api/istoric-bot?action=botiInchisi");
    var boti = d && Array.isArray(d.boti) ? d.boti : null;
    if (!boti || typeof JurnalTrade === "undefined" || typeof StatisticaTrade === "undefined") return null;
    return StatisticaTrade.dinPionex(JurnalTrade.din(boti)).concat(StatisticaTrade.dinPionexAlte ? StatisticaTrade.dinPionexAlte(JurnalTrade.alte(boti)) : []);
  } catch (e) { return null; }
}
function ciDeseneaza() {
  var box = document.getElementById("ciPagina"); if (!box) return;
  if (typeof acFranaSalveaza === "function") acFranaSalveaza();
  var r = ciStare.raport, st = { export: ciExportCitit(), masura: null, nepotriviri: r && r.randament && Array.isArray(r.randament.t212Nepotrivite) ? r.randament.t212Nepotrivite : null, acum: Date.now(),
    zile: ciStare.zile, banda: ciStare.banda, lectii: ciStare.lectii, verdicte: ciStare.verdicte, erori: ciStare.erori || {} };
  var loc = typeof acFranaZileCitite === "function" ? acFranaZileCitite() : [];
  var kv = Array.isArray(ciStare.zile) ? ciStare.zile : [];
  var zile = typeof Acasa !== "undefined" && Acasa.unesteZileFrana ? Acasa.unesteZileFrana(loc, kv) : loc;
  if (typeof Acasa !== "undefined" && Acasa.masuraFranei) st.masura = Acasa.masuraFranei(ciStare.botiMasura, zile);
  box.innerHTML = ciHtml(r, st);
  ciRandAplica();
  if (typeof tbTemaAplica === "function") tbTemaAplica();
  ciLeagaExport();
}
function ciLeagaExport() {
  var btn = document.getElementById("ciExportBtn"), inp = document.getElementById("ciExportFisier");
  if (!btn || !inp) return;
  btn.addEventListener("click", function () { inp.click(); });
  inp.addEventListener("change", function () {
    var f = inp.files && inp.files[0];
    inp.value = "";
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { ciDupaExport(String(rd.result || "")); };
    rd.readAsText(f);
  });
}
async function ciDupaExport(text) {
  if (typeof ContIntreg === "undefined" || !ContIntreg.citesteExport) return;
  var p = ContIntreg.citesteExport(text);
  if (!p.ok) { ciExportPune({ la: Date.now(), ok: false, nePotrivit: false, eroare: p.eroare || "fișierul n-a putut fi citit", cantitati: null, randuri: null }); ciDupaExportDesen(); return; }
  var api = null, jurnal = null, lipsaApi = false, lipsaJurnal = false;
  try { var dz = await getJSON("/api/t212?action=pozitii"); api = dz && Array.isArray(dz.pozitii) ? dz.pozitii : null; if (!api) lipsaApi = true; }
  catch (e) { lipsaApi = true; }
  if (lipsaApi) { ciExportPune({ la: Date.now(), ok: true, nePotrivit: false, citit: true, lipsaApi: true, eroare: null, cantitati: p.cantitati, randuri: null, fel: p.fel }); ciDupaExportDesen(); return; }
  try {
    var ist = typeof t212 !== "undefined" && t212.istoric && Array.isArray(t212.istoric.umpleri) ? t212.istoric : await getJSON("/api/t212?action=istoric");
    var ump = ist && Array.isArray(ist.umpleri) ? ist.umpleri : null;
    if (ump && typeof T212 !== "undefined" && T212.perechi) jurnal = T212.perechi(ump).deschise;
    else lipsaJurnal = true;
  } catch (e2) { lipsaJurnal = true; }
  var cmp = ContIntreg.treiCitiri(api, lipsaJurnal ? null : jurnal, p.cantitati);
  ciExportPune({ la: Date.now(), ok: true, nePotrivit: cmp.nePotrivit === true, citit: true, lipsaApi: false, lipsaJurnal: lipsaJurnal, eroare: null, cantitati: p.cantitati, randuri: cmp.randuri, fel: p.fel });
  ciDupaExportDesen();
}
function ciDupaExportDesen() {
  ciDeseneaza();
  if (typeof acasaDeseneaza === "function") acasaDeseneaza();
}
// v100.369 (🟡3): fiecare rută cu eroarea ei; o citire picată păstrează ultima citire bună (nu „încă nu sunt date”)
async function ciAdu(cheie, cale, ia) {
  try { var d = await getJSON(cale), v = ia(d); ciStare.erori[cheie] = null; return { ok: true, v: v }; }
  catch (e) { ciStare.erori[cheie] = String(e && e.message || e).slice(0, 120); return { ok: false }; }
}
async function ciPorneste(forta) {
  var box = document.getElementById("ciPagina"); if (!box) return;
  if (ciStare.inLucru) return;
  if (!forta && ciStare.raport && Date.now() - ciStare.la < 5 * 60000) {
    if (ciStare.botiMasura === undefined) ciStare.botiMasura = await ciBotiMasura();
    ciDeseneaza();
    return;
  }
  ciStare.inLucru = true; ciStare.erori = ciStare.erori || {};
  var a = await ciAdu("cont", "/api/istoric-bot?action=cont", function (d) { return d && d.cont || null; }); if (a.ok) { ciStare.raport = a.v; ciStare.la = Date.now(); }
  ciStare.eroare = ciStare.erori.cont || null;
  var v = await ciAdu("verdicte", "/api/istoric-bot?action=verdicteCalibrare", function (d) { return d && d.calibrare || null; }); if (v.ok) ciStare.verdicte = v.v;
  var bd = await ciAdu("banda", "/api/istoric-bot?action=disciplinaBanda", function (d) { return d && d.banda || null; }); if (bd.ok) ciStare.banda = bd.v;
  var lc = await ciAdu("lectii", "/api/istoric-bot?action=lectii", function (d) { return d && d.lectii || null; }); if (lc.ok) ciStare.lectii = lc.v;
  var zz = await ciAdu("contZile", "/api/istoric-bot?action=contZile", function (d) { return d && Array.isArray(d.zile) ? d.zile : null; }); if (zz.ok) ciStare.zile = zz.v;   /* v100.197 */
  ciStare.botiMasura = await ciBotiMasura();
  ciStare.inLucru = false;
  ciDeseneaza();
}
