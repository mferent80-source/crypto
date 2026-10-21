// Pagina „Contul întreg” (v100.176; el 13.10: „din prima recomandare 1–6”): desenează raportul colectorului (ContIntreg, KV cont:raport).
// ciHtml e fără DOM (proba o rulează în vm); ciPorneste leagă pagina. Răspunsul întâi, în cuvinte; cifrele și tabelele dedesubt; „cum am
// socotit” pliat. Lipsa se spune (nu 0), aproximările se spun pe față.
var ciStare = { raport: null, zile: null, la: 0, inLucru: false, eroare: null, verdicte: null, banda: null, lectii: null };
function ciEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function ciMii(x) { if (x == null || !isFinite(x)) return "—"; var r = Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (x < 0 ? "−" : "") + r; }
function ciLei(x, semn) { if (x == null || !isFinite(x)) return "—"; return (semn && x > 0 ? "+" : "") + ciMii(x) + " lei"; }
function ciPct(x, z) { if (x == null || !isFinite(x)) return "—"; var v = Math.abs(x * 100).toFixed(z == null ? 1 : z).replace(".", ","); return (x < 0 ? "−" : x > 0 ? "+" : "") + v + "%"; }
function ciNr(x, z) { return x == null || !isFinite(x) ? "—" : Number(x).toFixed(z == null ? 2 : z).replace(".", ","); }
function ciZi(z) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(z || "")); return m ? m[3] + "." + m[2] + "." + m[1] : "—"; }
function ciEt(t) { return '<span class="ciEt">' + ciEsc(t) + " </span>"; }
function ciCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + pl; }
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
// „ce aș face eu”: o singură acțiune, din ce strică cel mai tare (concentrarea, riscul pe zi, criza, reconcilierea)
function ciFac(r) {
  var tot = r.valoare && r.valoare.total, rec = r.reconciliere || {};
  if (rec.urmarire && !rec.urmarire.ok) return "Aș verifica acum botul " + rec.urmarire.lipsa.map(function (x) { return x.nume; }).join(", ") + " direct în Pionex: Radarul nu-l mai urmărește.";
  if (rec.t212 && !rec.t212.ok) return "Aș verifica în T212 " + rec.t212.abateri.map(function (a) { return String(a.ticker).replace(/_US_EQ$|_EQ$/, ""); }).join(", ") + ": jurnalul Radarului nu se potrivește cu contul.";
  var cr = (r.stres || [])[0];
  if (cr && tot > 0 && -cr.lei > 0.35 * tot) return "O criză ca „" + cr.nume + "” ți-ar lua ~" + Math.round(-cr.lei / tot * 100) + "% din cont: aș micșora întâi poziția care pierde cel mai mult acolo (" + ((cr.pozitii || [])[0] || {}).nume + ").";
  var p = (r.corelatii || []).filter(function (x) { return x.acelasiRisc; })[0];
  if (p && p.rho >= 0.8) return p.a + " și " + p.b + " se mișcă aproape la fel (ρ " + ciNr(p.rho) + "): aș socoti-le o singură poziție când îmi pun riscul.";
  if (r.risc && r.risc.var95 && tot > 0 && r.risc.var95 > 0.04 * tot) return "O zi proastă îți ia ~" + ciPct(r.risc.var95 / tot) .replace("+", "") + " din cont: aș reduce expunerea până sub 3% pe zi.";
  return "Nimic urgent pe tot contul: aș păstra riscul pe zi sub 3% din cont și aș verifica pagina după fiecare poziție nouă.";
}
// v100.197 (15.10, el: „afișează”): valoarea contului pe zile (KV cont:zile, scrisă de colector o dată pe zi, necitită până acum).
// Cifra de azi + schimbarea față de ziua dinainte (săgeată + semn, nu doar culoare), linia pe zile (un singur șir ⇒ fără legendă;
// detaliile pe sursă la trecerea mouse-ului), tabelul cu sursele. Schimbarea include depunerile / retragerile: nu e profit.
function ciZileHtml(zile) {
  var l = (Array.isArray(zile) ? zile : []).filter(function (x) { return x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.z)) && isFinite(x.valoare) && Number(x.valoare) > 0; })
    .slice().sort(function (a, b) { return a.z < b.z ? -1 : a.z > b.z ? 1 : 0; });
  var h = '<section class="ciSec ciZile"><h4>Valoarea contului pe zile</h4>';
  if (!l.length) return h + '<p class="tbSub">Încă nu am nicio zi: colectorul o scrie o dată pe zi (Pionex + Trading 212 + Salt, în lei).</p></section>';
  var ult = l[l.length - 1], ant = l.length > 1 ? l[l.length - 2] : null;
  var sch = function (x, y) {
    if (!x || !y) return "";
    var d = y.valoare - x.valoare, pct = x.valoare > 0 ? d / x.valoare : null, sag = d > 0 ? "▲ " : d < 0 ? "▼ " : "= ";
    return '<span class="ciZileSch ' + (d > 0 ? "good" : d < 0 ? "bad" : "") + '">' + sag + ciLei(d, true) + (pct !== null ? " (" + ciPct(pct) + ")" : "") + "</span>";
  };
  var surse = function (x) { return "Pionex " + ciLei(x.pionex) + " · Trading 212 " + ciLei(x.t212) + " · Salt " + ciLei(x.salt); };
  h += '<p class="ciZileAzi"><b>' + ciLei(ult.valoare) + "</b> pe " + ciZi(ult.z) + (ult.complet === false ? '<span class="t212Mic"> · parțial (lipsea o sursă)</span>' : "")
    + (ant ? " · față de " + ciZi(ant.z) + ": " + sch(ant, ult) + (ant.complet === false ? '<span class="t212Mic"> · ziua dinainte era parțială</span>' : "") : "") + "</p>";
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
        var t = "<title>" + ciEsc(ciZi(x.z) + ": " + ciLei(x.valoare) + " · " + surse(x) + (x.complet === false ? " (parțial)" : "")) + "</title>";
        var c = 'x1="' + X(i).toFixed(1) + '" y1="' + Y(x.valoare).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y2="' + Y(x.valoare).toFixed(1) + '"';   /* linie de lungime zero = cerc la orice lățime */
        return '<g><line class="ciZileTinta" ' + c + '>' + t + '</line><line class="ciZilePct' + (x.complet === false ? " ciZileGol" : "") + '" ' + c + '></line>' + (x.complet === false ? '<line class="ciZileGolIn" ' + c + '></line>' : "") + "</g>";
      }).join("") + "</svg>"
      + '<div class="ciZileScala"><span>' + ciZi(l[0].z) + "</span><span>min " + ciLei(min) + " · max " + ciLei(max) + "</span><span>" + ciZi(ult.z) + "</span></div>";
  }
  var rand = function (x, i) {
    return "<tr><td data-et=\"Ziua\">" + ciZi(x.z) + (x.complet === false ? '<span class="t212Mic"> · parțial</span>' : "") + '</td><td data-et="Total"><b>' + ciLei(x.valoare) + "</b></td>"
      + '<td data-et="Față de ziua dinainte">' + (sch(l[i - 1], x) || "—") + '</td><td data-et="Pionex">' + ciLei(x.pionex) + '</td><td data-et="Trading 212">' + ciLei(x.t212) + '</td><td data-et="Salt">' + ciLei(x.salt) + "</td></tr>";
  };
  var rows = l.map(rand).reverse().slice(0, 60);
  h += '<div class="t212TabWrap"><table class="t212Tab ciTab ciZileTab"><thead><tr><th>Ziua</th><th>Total</th><th>Față de ziua dinainte</th><th>Pionex</th><th>Trading 212</th><th>Salt</th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>"
    + '<p class="tbSub">În lei, o valoare pe zi (colectorul, după curs). Schimbarea de la o zi la alta include și depunerile și retragerile — nu e doar profit. „Parțial” = o sursă n-a răspuns în ziua aceea, deci totalul e mai mic decât cel real.</p></section>';
  return h;
}
function ciExportHtml(st) {
  var e = st && st.export, fraza;
  if (!e) fraza = "A doua citire din exportul tău lipsește.";
  else if (!e.ok) fraza = "A doua citire din exportul tău lipsește: " + (e.eroare || "fișierul n-a putut fi citit") + ".";
  else if (e.lipsaApi) fraza = "A doua citire e citită, dar cantitatea din cont n-a venit: n-am aflat dacă se potrivește.";
  else if (e.nePotrivit) fraza = "Exportul nu se potrivește cu cantitatea din cont.";
  else fraza = "A doua citire se potrivește cu cantitatea din cont.";
  var h = '<section class="ciSec"><h3>A doua citire, din exportul tău</h3><p class="ciRasp">' + ciEsc(fraza) + '</p><p><button type="button" class="actionGhost" id="ciExportBtn">Aduc exportul din T212</button><input type="file" id="ciExportFisier" accept=".csv,text/csv" hidden></p>';
  if (e && e.ok && !e.lipsaApi && Array.isArray(e.randuri) && e.randuri.length) {
    var cel = function (x) { return x == null ? "n-am aflat" : ciNr(x, 4).replace(/,?0+$/, ""); };
    h += '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Simbol</th><th>API</th><th>Jurnal</th><th>Export</th></tr></thead><tbody>'
      + e.randuri.map(function (r) { return "<tr><td>" + ciEsc(r.ticker) + '</td><td class="num">' + ciEsc(cel(r.api)) + '</td><td class="num">' + ciEsc(cel(r.jurnal)) + '</td><td class="num">' + ciEsc(cel(r.export)) + "</td></tr>"; }).join("")
      + "</tbody></table></div>";
    if (e.lipsaJurnal) h += '<p class="tbSub">Jurnalul n-a venit: coloana lui rămâne n-am aflat. Comparația care poate schimba gura e exportul față de API.</p>';
  }
  h += '<p class="tbSub">Fișierul rămâne la tine. Radar citește cantitățile și le compară cu API-ul, la aceeași margine ca jurnalul. Un export cu alt antet nu inventează abateri.</p></section>';
  return h;
}
function ciMasuraHtml(st) {
  var m = st && st.masura, t = m && m.text ? m.text : "N-am aflat: zilele vechi nu au pauza, VaR-ul și evenimentul salvate.";
  return '<section class="ciSec"><h3>Măsura frânei pe cartea închisă</h3><p class="ciRasp">' + ciEsc(t) + '</p><p class="tbSub">Regulile de azi, pe zilele la care s-au salvat pauza, raportul și evenimentul. Sub 10 zile oprite, eșantionul nu ajunge.</p></section>';
}
function ciHtml(r, st) {
  st = st || {};
  if (!r) return '<p class="tbSub">Raportul pe tot contul îl face colectorul la 6 ore (boți, Trading 212, Salt, prețurile pe doi ani, crizele din 2020–2025). Încă nu există: pornește colectorul și revino peste câteva minute.</p>' + ciExportHtml(st) + ciMasuraHtml(st);
  var acum = Number(st.acum) || Date.now(), v = r.valoare || {}, rs = r.risc || {}, tot = v.total, h = "";
  var vechi = acum - r.la > 12 * 3600000;
  var d = new Date(r.la), p2 = function (n) { return String(n).padStart(2, "0"); };
  h += '<p class="tbSub ciLa">Raportul de la ' + p2(d.getDate()) + "." + p2(d.getMonth() + 1) + ", ora " + p2(d.getHours()) + ":" + p2(d.getMinutes()) + " · se reface la 6 ore · pozițiile de acum puse pe istoria reală; e un calcul, nu o promisiune.</p>";
  if (vechi) h += '<p class="tbWarn">⚠ Raportul e vechi de ' + ciEsc(ciCate(Math.round((acum - r.la) / 3600000), "oră", "ore")) + ": colectorul nu l-a refăcut (e pornit PC-ul de acasă?).</p>";
  // răspunsul
  var cr = (r.stres || [])[0], txt = "Contul tău: " + ciLei(tot) + (v.complet ? "" : " (fără " + (v.lipsa || []).join(", ") + ")") + ".";
  if (rs.var95 != null) txt += " Într-o zi proastă (1 din 20) pozițiile de acum pierd cel puțin ~" + ciLei(rs.var95) + (tot > 0 ? " (" + ciPct(rs.var95 / tot).replace("+", "") + ")" : "") + "; în medie, în zilele acelea, ~" + ciLei(rs.es95) + ".";
  if (cr) txt += " Cea mai rea criză din trecut, pe ce ai acum: " + cr.nume + ", " + ciLei(cr.lei, true) + ".";
  h += '<section class="ciSec"><p class="ciRasp">' + ciEsc(txt) + '</p><p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + ciEsc(ciFac(r)) + "</p>";
  var div = r.diversificare;
  var cif = [["Valoarea contului", ciLei(tot), "Pionex " + ciLei(v.pionex) + " · T212 " + ciLei(v.t212) + " · Salt " + ciLei(v.salt), ""],
    ["Ziua proastă (1 din 20)", rs.var95 != null ? "−" + ciLei(rs.var95) : "—", "VaR 95 % pe o zi · ES " + (rs.es95 != null ? "−" + ciLei(rs.es95) : "—"), "bad"],
    ["Ziua foarte proastă (1 din 100)", rs.var99 != null ? "−" + ciLei(rs.var99) : "—", "VaR 99 % · ES " + (rs.es99 != null ? "−" + ciLei(rs.es99) : "—"), "bad"],
    ["Cea mai rea zi din ultimul an", rs.ziRea ? ciLei(rs.ziRea.lei, true) : "—", rs.ziRea ? "pe " + ciZi(rs.ziRea.z) + ", cu pozițiile de acum" : "", "bad"],
    ["Pariuri independente", div ? ciNr(div.pariuri, 1).replace(",0", "") : "—", div ? "din " + ciCate(div.pozitii, "poziție", "poziții") + ": restul se mișcă împreună" : "", ""]];
  h += '<div class="ciCifre">' + cif.map(function (c) { return '<div class="ciCifra"><span>' + ciEsc(c[0]) + '</span><b class="' + c[3] + '">' + ciEsc(c[1]) + "</b><small>" + ciEsc(c[2]) + "</small></div>"; }).join("") + "</div>";
  h += ciHisto(rs.pnl, rs.var95);
  if (rs.n && rs.n < 60) h += '<p class="tbWarn">Doar ' + ciEsc(ciCate(rs.n, "zi", "zile")) + " de istorie comună: cifrele de risc sunt orientative.</p>";
  if (rs.scoase && rs.scoase.length) h += '<p class="tbSub">Fără ' + ciEsc(rs.scoase.map(function (x) { return x.nume + " (" + x.motiv + ")"; }).join(", ")) + ".</p>";
  h += "</section>";
  // expunerile
  var ex = (r.expuneri || []).slice().sort(function (a, b) { return Math.abs(b.lei || 0) - Math.abs(a.lei || 0); });
  if (ex.length) h += '<section class="ciSec"><h3>Pe ce stă riscul</h3><p class="tbSub">Expunerea = cât se mișcă poziția la o mișcare a prețului (la boți, poziția reală de acum din Pionex, nu suma pusă). β = cât se mișcă față de BTC (crypto) sau Nasdaq (acțiuni) pe 180 de zile.</p><div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Poziție</th><th>Expunere</th><th>% din cont</th><th>β</th></tr></thead><tbody>'
    + ex.map(function (x) { return "<tr><td>" + ciEsc(x.nume) + (x.lipsa ? ' <span class="tbWarn">(' + ciEsc(x.lipsa) + ")</span>" : "") + '</td><td class="num">' + ciEt("expunere") + ciEsc(ciLei(x.lei)) + '</td><td class="num">' + ciEt("din cont") + (tot > 0 && x.lei != null ? ciEsc(ciPct(x.lei / tot).replace("+", "")) : "—") + '</td><td class="num">' + ciEt("β") + ciEsc(ciNr(x.beta, 1)) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
  // corelațiile
  var co = r.corelatii || [], acelasi = co.filter(function (x) { return x.acelasiRisc; }), acop = co.filter(function (x) { return x.seAcopera; });
  h += '<section class="ciSec"><h3>Ce se mișcă împreună</h3>' + (acelasi.length ? '<p class="ciRasp">' + ciEsc(acelasi.length === 1 ? "O pereche e practic același risc:" : ciCate(acelasi.length, "pereche e", "perechi sunt") + " practic același risc:") + "</p><ul class=\"ciLista\">" + acelasi.map(function (x) { return "<li><b>" + ciEsc(x.a + " + " + x.b) + "</b> · ρ " + ciEsc(ciNr(x.rho)) + ' <span class="tbSub">(' + ciEsc(ciCate(x.n, "zi", "zile")) + " comune)</span></li>"; }).join("") + "</ul>" : '<p class="tbSub">Nicio pereche cu ρ ≥ 0,6 pe ultimele 90 de zile.</p>')
    + (acop.length ? '<p class="tbSub">Se acoperă (una câștigă când cealaltă pierde): ' + ciEsc(acop.map(function (x) { return x.a + " + " + x.b; }).join(", ")) + ".</p>" : "") + "</section>";
  // stres
  var sr = r.stres || [];
  if (sr.length) h += '<section class="ciSec"><h3>Dacă vine iar o criză</h3><p class="tbSub">Randamentele din ferestrele reale ale crizelor (închideri zilnice), puse pe pozițiile de acum: cu istoria ei unde o are, altfel β × BTC / Nasdaq. Boții cumpără pe drum, iar lichidarea ia tot ce e în bot. În timpul zilei căderile au fost mai mari.</p><div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Criza</th><th>BTC</th><th>Nasdaq</th><th>Contul tău</th><th>Cel mai lovit</th></tr></thead><tbody>'
    + sr.map(function (s) { var p0 = (s.pozitii || [])[0]; return "<tr><td>" + ciEsc(s.nume) + '<br><span class="tbSub">' + ciEsc(ciZi(s.de).slice(0, 5) + "–" + ciZi(s.pana)) + '</span></td><td class="num ' + (s.btc < 0 ? "bad" : "good") + '">' + ciEt("BTC") + ciEsc(ciPct(s.btc)) + '</td><td class="num ' + (s.qqq < 0 ? "bad" : "good") + '">' + ciEt("Nasdaq") + ciEsc(ciPct(s.qqq)) + '</td><td class="num ' + (s.lei < 0 ? "bad" : "good") + '">' + ciEt("contul tău") + "<b>" + ciEsc(ciLei(s.lei, true)) + "</b>" + (tot > 0 ? '<br><span class="tbSub">' + ciEsc(ciPct(s.lei / tot)) + "</span>" : "") + "</td><td>" + ciEt("cel mai lovit") + (p0 ? ciEsc(p0.nume + " " + ciLei(p0.lei, true)) + (p0.lichidat ? ' <span class="bad">⚠ lichidat</span>' : "") : "—") + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
  // reconcilierea
  var rc = r.reconciliere || {}, rand = function (ok, titlu, detaliu) { return '<li class="' + (ok === null ? "" : ok ? "good" : "bad") + '">' + (ok === null ? "· " : ok ? "✓ " : "✗ ") + "<b>" + ciEsc(titlu) + "</b>" + (detaliu ? ' <span class="tbSub">' + ciEsc(detaliu) + "</span>" : "") + "</li>"; };
  h += '<section class="ciSec"><h3>Se potrivește cu brokerii?</h3><ul class="ciLista">'
    + (rc.t212 ? rand(rc.t212.ok, rc.t212.ok ? "Trading 212: cantitățile din jurnal = cele din cont" : "Trading 212: " + ciCate(rc.t212.abateri.length, "abatere", "abateri"), rc.t212.ok ? ciCate(rc.t212.verificate, "simbol verificat", "simboluri verificate") : rc.t212.abateri.map(function (a) { var sp = typeof ContIntreg !== "undefined" && ContIntreg.notaSplit ? ContIntreg.notaSplit(a.ticker, st.nepotriviri) : ""; return String(a.ticker).replace(/_US_EQ$|_EQ$/, "") + ": cont " + a.broker + ", jurnal " + ciNr(a.radar, 3).replace(/,?0+$/, "") + " — " + a.motiv + (sp ? "; " + sp : ""); }).join("; ")) : rand(null, "Trading 212: necitit acum", ""))
    + (rc.arhiva ? rand(rc.arhiva.ok, rc.arhiva.ok ? "Arhiva boților are toți boții închiși din Pionex" : "Arhiva boților: lipsesc " + ciCate(rc.arhiva.lipsa.length, "bot", "boți"), ciCate(rc.arhiva.verificate, "bot verificat", "boți verificați") + " (prima pagină Pionex)") : rand(null, "Arhiva boților: necitită acum", ""))
    + (rc.urmarire ? rand(rc.urmarire.ok, rc.urmarire.ok ? "Toți boții porniți au istoric proaspăt în Radar" : "Boți porniți fără istoric în Radar: " + rc.urmarire.lipsa.map(function (x) { return x.nume; }).join(", "), ciCate(rc.urmarire.verificate, "bot pornit", "boți porniți")) : rand(null, "Urmărirea boților: necitită acum", ""))
    + rand(null, "Salt: pozițiile le scrii tu (Salt n-are o legătură de citire), deci nu am cu ce le compara", "")
    + "</ul><p class=\"tbSub\">" + ciEsc(typeof ContIntreg !== "undefined" && ContIntreg.margine ? ContIntreg.margine() : "") + "</p></section>";
  // v100.178 (1) factorii și sectoarele
  var fa = r.factori;
  if (fa && fa.actiuniLei > 0) {
    var pp = fa.sectoare.filter(function (x) { return x.pestePrag; }), ip = fa.industrii.filter(function (x) { return x.pestePrag; });
    h += '<section class="ciSec"><h3>Pe ce pariezi de fapt</h3><p class="ciRasp">' + ciEsc(pp.length || ip.length ? "Acțiunile tale stau " + (ip.length ? ciPct(ip[0].pondere, 0).replace("+", "") + " într-o singură industrie (" + ip[0].nume + ": " + ip[0].pozitii.join(", ") + ")" : ciPct(pp[0].pondere, 0).replace("+", "") + " într-un singur sector (" + pp[0].ro + ")") + ", peste pragul de 40 %: când sectorul cade, cad toate deodată." : "Nicio industrie și niciun sector nu trec de 40 % din acțiuni.") + "</p>"
      + '<p class="tbSub">' + ciEsc("Pe factori (din " + ciLei(fa.actiuniLei) + " în acțiuni): piață " + ciLei(fa.factori.piata) + ", firme mici " + ciLei(fa.factori.mici, true) + ", momentum " + ciLei(fa.factori.momentum, true) + ", sectorul propriu " + ciLei(fa.factori.sector, true) + ". Adică la o zi cu S&P −1 %, acțiunile tale pierd ~" + ciLei(Math.abs(fa.factori.piata) * 0.01) + " doar din piață.") + "</p>"
      + '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Sector</th><th>% din acțiuni</th><th>Poziții</th></tr></thead><tbody>' + fa.sectoare.map(function (x) { return '<tr><td>' + ciEsc(x.ro) + (x.pestePrag ? ' <span class="bad">⚠ peste 40 %</span>' : "") + '</td><td class="num">' + ciEt("din acțiuni") + ciEsc(ciPct(x.pondere, 0).replace("+", "")) + "</td><td>" + ciEsc(x.pozitii.join(", ")) + "</td></tr>"; }).join("") + "</tbody></table></div>"
      + (fa.perPozitie && fa.perPozitie.length ? '<details class="ciMetoda"><summary>Factorii fiecărei poziții (regresie pe 250 de zile)</summary><ul>' + fa.perPozitie.map(function (x) { return "<li>" + ciEsc(x.nume + ": piață " + ciNr(x.piata) + ", firme mici " + ciNr(x.mici) + ", momentum " + ciNr(x.momentum) + (x.etf ? ", sectorul (" + x.etf + ") " + ciNr(x.sectorBeta) : "") + " · explică " + ciPct(x.r2, 0).replace("+", "") + " din mișcare") + "</li>"; }).join("") + "</ul></details>" : "")
      + "</section>";
  }
  // v100.178 (2) atribuirea: piață sau alegere
  var at = r.atribuire;
  if (at && (at.t212Spy || at.boti)) {
    var a1 = at.t212Spy, b1 = at.boti, lin2 = [];
    if (a1) lin2.push("Trading 212 pe ultimul an: " + ciPct(a1.tu) + ". Cu același beta (" + ciNr(a1.beta) + ") pe S&P ai fi făcut " + ciPct(a1.pasiv) + " ⇒ alegerile tale (alfa) au adus " + ciPct(a1.alfa) + (a1.alfa < 0 ? ": un ETF pe S&P cu aceeași expunere ar fi ieșit mai bine." : "."));
    if (at.t212Qqq) lin2.push("Față de Nasdaq (QQQ), beta " + ciNr(at.t212Qqq.beta) + ": pasiv " + ciPct(at.t212Qqq.pasiv) + ", alfa " + ciPct(at.t212Qqq.alfa) + ".");
    h += '<section class="ciSec"><h3>Piață sau alegere</h3>' + lin2.map(function (x) { return '<p class="ciRasp">' + ciEsc(x) + "</p>"; }).join("");
    if (b1 && b1.n) {
      var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(0) + " USDT" + (at.usdLei ? " (" + ciLei(v * at.usdLei, true) + ")" : ""); };
      h += '<p class="ciRasp">' + ciEsc("Boții, pe ultimul an (" + ciCate(b1.n, "bot închis", "boți închiși") + "): grila a adus " + U(b1.grila) + ", direcția prețului " + U(b1.directie) + ", comisioanele " + U(b1.comisioane) + ", finanțarea " + U(b1.finantare) + " ⇒ net " + U(b1.net) + ".") + "</p>"
        + '<p class="tbSub">' + ciEsc(b1.directie < 0 && b1.grila > 0 ? "Grila își face treaba; pierderea vine din direcție (prețul a ieșit din bandă și a rămas acolo) - asta e de lucrat: banda, stopul, levierul." : b1.grila <= 0 ? "Nici grila n-a acoperit comisioanele: benzile au fost prea late sau gridul a stat puțin." : "") + "</p>";
    }
    h += "</section>";
  }
  // v100.178 (3) MAE / MFE
  var mm2 = r.maeMfe;
  if (mm2 && mm2.n >= 10) {
    var lin3 = ["Câștigătorii tăi au coborât de obicei până la " + ciPct(mm2.maeCastig) + " înainte să iasă pe plus; pierzătorii până la " + ciPct(mm2.maePierd) + "."];
    if (mm2.pierdDupaPlus5) lin3.push(ciCate(mm2.pierdDupaPlus5, "pierdere a fost", "pierderi au fost") + " întâi pe plus cu cel puțin 5 % (le-ai lăsat să se întoarcă).");
    if (mm2.lasatPeMasa !== null) lin3.push("La câștigători ai lăsat pe masă (vârful de pe drum minus ieșirea) " + ciPct(mm2.lasatPeMasa).replace("+", "") + " în mediană.");
    // audit 19.10 (5): economia NETĂ (pierderi salvate − câștiguri tăiate), pe aceleași trade-uri pe care s-a ales stopul (în eșantion); net ≤ 0 ⇒ nu-l propun
    var netCunoscut = mm2.economieNeta !== null && mm2.economieNeta !== undefined, baniSau = function (b, s) { return b !== null && b !== undefined ? ciLei(b, true) : ciPct(s); };
    var fac3 = mm2.stopSugerat !== null && mm2.stopSugerat !== undefined ? "Un stop la " + ciPct(mm2.stopSugerat) + " de la cumpărare ar fi păstrat 80 % din câștigători și ar fi tăiat mai devreme " + ciCate(mm2.taiatePierderi, "pierdere", "pierderi") + (mm2.economie ? " (cu ~" + ciPct(mm2.economie).replace("+", "") + " mai puțin pierdut la fiecare)" : "")
      + (netCunoscut ? ", dar ar fi costat " + baniSau(mm2.costatBani !== null && mm2.costatBani !== undefined ? -mm2.costatBani : null, -mm2.costat) + " (" + (mm2.castigTaiat ? ciCate(mm2.castigTaiat, "câștigător oprit", "câștigători opriți") + " și " : "") + "pierderile mai mici decât stopul, duse la stop)" + ": net " + baniSau(mm2.netBani, mm2.economieNeta) + ", măsurat pe aceleași trade-uri pe care l-am ales (în eșantion, deci optimist)" : "") + "." : "";
    var cand3 = mm2.stopCandidat;
    if (!fac3 && netCunoscut && cand3 !== null && cand3 !== undefined) lin3.push("Un stop la " + ciPct(cand3) + " (cel care păstra 80 % din câștigători) ar fi salvat " + baniSau(mm2.salvatBani, mm2.salvat) + " la pierderi, dar ar fi costat " + baniSau(mm2.costatBani !== null && mm2.costatBani !== undefined ? -mm2.costatBani : null, -mm2.costat) + " (" + (mm2.castigTaiat ? ciCate(mm2.castigTaiat, "câștigător oprit", "câștigători opriți") + " și " : "") + "pierderile mai mici, duse la stop): net " + baniSau(mm2.netBani, mm2.economieNeta) + " pe aceleași trade-uri, deci nu-l propun.");
    h += '<section class="ciSec"><h3>Cât de jos merge un trade până să iasă</h3>' + lin3.map(function (x) { return '<p class="ciRasp">' + ciEsc(x) + "</p>"; }).join("") + (fac3 ? '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + ciEsc(fac3 + " E trecutul tău pe ultimul an, nu o garanție.") + "</p>" : "")
      + '<p class="tbSub">' + ciEsc(ciCate(mm2.n, "trade închis", "trade-uri închise") + " pe ultimul an (" + mm2.castig + " pe plus, " + mm2.pierd + " pe minus); din barele zilnice, deci ziua cumpărării și a vânzării intră întregi.") + "</p></section>";
  }
  // v100.178 (4) ținta de volatilitate
  var vo = r.vol;
  if (vo) {
    h += '<section class="ciSec"><h3>Cât de tare se mișcă contul</h3><p class="ciRasp">' + ciEsc("Contul tău se mișcă cu ~" + ciPct(vo.volAnual, 0).replace("+", "") + " pe an (o abatere standard). Ținta obișnuită la un cont de tranzacționare e 15 %" + (vo.factor < 1 ? ": ca s-o atingi, expunerea de acum ar trebui ținută la ~" + ciPct(vo.factor, 0).replace("+", "") + " din ce e." : ": ești sub ea.")) + "</p>"
      + (vo.contrib && vo.contrib.length ? '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Poziție</th><th>Partea ei din riscul contului</th></tr></thead><tbody>' + vo.contrib.slice(0, 8).map(function (x) { return "<tr><td>" + ciEsc(x.nume) + '</td><td class="num">' + ciEt("din risc") + ciEsc(ciPct(x.pondere, 0).replace("+", "")) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "")
      + '<p class="tbSub">La o poziție nouă, Poarta din Trading 212 îți arată și mărimea „cu risc egal”: cât să pui ca poziția să aducă în cont cât o parte egală din ținta de 15 %.</p></section>';
  }
  // execuția: prețul plănuit față de cel obținut
  var ex2 = r.executie;
  if (ex2 && ex2.n) {
    var lin = [];
    if (ex2.conversie && ex2.conversie.n) lin.push(["Conversia lei ↔ dolari", "comisionul T212: " + ciLei(ex2.conversie.lei) + " pe ultimul an (" + ciPct(ex2.conversie.mediana, 2).replace("+", "") + " la o tranzacție)" + (ex2.conversie.fataBnr ? "; cursul folosit față de BNR: " + ciPct(ex2.conversie.fataBnr.mediana, 2) + " (mediana, " + ciCate(ex2.conversie.fataBnr.n, "tranzacție", "tranzacții") + ")" : ""), ex2.conversie.lei > 0 ? "bad" : ""]);
    if (ex2.pesteNoapte && ex2.pesteNoapte.n) lin.push(["Ordine la piață date cu bursa închisă", ciCate(ex2.pesteNoapte.n, "ordin umplut", "ordine umplute") + " abia la deschidere: față de închiderea dinainte, mediana " + ciPct(ex2.pesteNoapte.mediana) + ", cel mai rău " + ciPct(ex2.pesteNoapte.cel) + (ex2.pesteNoapte.cele && ex2.pesteNoapte.cele[0] ? " (" + String(ex2.pesteNoapte.cele[0].ticker).replace(/_US_EQ$|_EQ$/, "") + ")" : ""), ex2.pesteNoapte.mediana < 0 ? "bad" : ""]);
    if (ex2.stop && ex2.stop.n) lin.push(["Ordinele stop", ciCate(ex2.stop.n, "stop atins", "stopuri atinse") + ": ai ieșit cu mediana " + ciPct(ex2.stop.mediana) + " față de prețul de stop, cel mai rău " + ciPct(ex2.stop.cel), ex2.stop.mediana < -0.005 ? "bad" : ""]);
    if (ex2.subPlan && ex2.subPlan.n) lin.push(["Ieșiri sub stopul din planul tău", ciCate(ex2.subPlan.n, "vânzare", "vânzări") + " sub stopul scris în Radar: mediana " + ciPct(ex2.subPlan.mediana) + " sub el, cel mai rău " + ciPct(ex2.subPlan.cel), "bad"]);
    if (ex2.limita && ex2.limita.n) lin.push(["Ordinele limită", ciCate(ex2.limita.n, "ordin", "ordine") + ": mediana " + ciPct(ex2.limita.mediana, 2) + " față de limită (≥ 0 = cel puțin cât ai cerut)", ""]);
    h += '<section class="ciSec"><h3>Cât te costă execuția</h3><p class="tbSub">Prețul plănuit (stopul, limita, prețul de când ai dat ordinul) față de cel obținut, pe ultimul an. ' + (ex2.cuTip < ex2.n ? "Tipul ordinului îl știu pentru " + ciCate(ex2.cuTip, "umplere", "umpleri") + " din " + ex2.n + " (istoricul vechi se completează singur, câteva pagini la 5 minute)." : "") + '</p><ul class="ciLista">'
      + (lin.length ? lin.map(function (x) { return '<li><b>' + ciEsc(x[0]) + ':</b> <span class="' + x[2] + '">' + ciEsc(x[1]) + "</span></li>"; }).join("") : '<li class="tbSub">Încă nimic de măsurat (ordinele vechi n-au tipul lor; vin pe măsură ce se completează istoricul).</li>') + "</ul></section>";
  }
  // randamentul
  var ra = r.randament || {}, s = ra.tot;
  h += '<section class="ciSec"><h3>Cât ai câștigat, corect socotit</h3>';
  if (!s) h += '<p class="tbSub">Prea puține zile pentru randament (cel puțin 20).</p>';
  else {
    var fb = ra.fataBtc, fs = ra.fataSpy;
    h += '<p class="ciRasp">' + ciEsc("Pe ultimul an (" + ciZi(s.de) + " – " + ciZi(s.pana) + "), banii puși la lucru au făcut " + ciPct(s.twr) + " ponderat în timp" + (fb ? "; BTC a făcut " + ciPct(fb.reper) : "") + (fs ? ", S&P " + ciPct(fs.reper) : "") + " pe aceleași zile.") + "</p>";
    var c2 = [["Randament ponderat în timp", ciPct(s.twr), ciCate(s.n, "zi", "zile"), s.twr < 0 ? "bad" : "good"], ["Scăderea maximă", ciPct(s.maxDd), s.ziMaxDd ? "până pe " + ciZi(s.ziMaxDd) : "", "bad"],
      ["Sharpe", ciNr(s.sharpe), "câștig pe unitate de risc, pe an (fără dobândă)", ""], ["Sortino", ciNr(s.sortino), "ca Sharpe, doar pe zilele cu pierdere", ""],
      ["Zile pe plus", ciPct(s.zilePlus, 0).replace("+", ""), "", ""]];
    h += '<div class="ciCifre">' + c2.map(function (c) { return '<div class="ciCifra"><span>' + ciEsc(c[0]) + '</span><b class="' + c[3] + '">' + ciEsc(c[1]) + "</b><small>" + ciEsc(c[2]) + "</small></div>"; }).join("") + "</div>";
    var parte = function (et, x, f, rep) { return x ? "<tr><td>" + ciEsc(et) + '</td><td class="num ' + (x.twr < 0 ? "bad" : "good") + '">' + ciEsc(ciPct(x.twr)) + '</td><td class="num">' + ciEsc(ciPct(x.maxDd)) + '</td><td class="num">' + ciEsc(ciNr(x.sharpe)) + '</td><td class="num">' + (f ? ciEsc(ciPct(f.reper) + " (" + rep + ")") : "—") + "</td></tr>" : ""; };
    h += '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Parte</th><th>Randament</th><th>Scădere max.</th><th>Sharpe</th><th>Reperul</th></tr></thead><tbody>' + parte("Boții Pionex", ra.boti, ra.botiFataBtc, "BTC") + parte("Trading 212", ra.t212, ra.t212FataSpy, "S&P") + parte("Tot contul", s, fs, "S&P") + "</tbody></table></div>";
    var note = ["Boții: rezultatul fiecăruia împărțit egal pe zilele lui (Pionex nu dă istoria poziției), deci zilele par mai liniștite decât au fost și Sharpe-ul iese mai frumos.", "Trading 212: refăcut din umplerile tale și închiderile zilnice, pe banii investiți (cash-ul care stă nu intră)."];
    if (ra.t212Aprox && ra.t212Aprox.length) note.push(ciCate(ra.t212Aprox.length, "simbol fără prețuri (delistat) e ținut", "simboluri fără prețuri (delistate) sunt ținute") + " la ultimul preț de tranzacție.");
    if (ra.t212Nepotrivite && ra.t212Nepotrivite.length) note.push(ciCate(ra.t212Nepotrivite.length, "simbol are", "simboluri au") + " prețuri care nu se potrivesc cu tranzacțiile tale (alt simbol sau o împărțire de acțiuni): " + ra.t212Nepotrivite.slice(0, 8).map(function (t) { return String(t).replace(/_US_EQ$|_EQ$/, ""); }).join(", ") + (ra.t212Nepotrivite.length > 8 ? "…" : "") + " - merg pe prețurile tranzacțiilor.");
    h += '<ul class="ciNote">' + note.map(function (n) { return '<li class="tbSub">' + ciEsc(n) + "</li>"; }).join("") + "</ul>";
  }
  h += "</section>";
  h += '<details class="ciMetoda"><summary>Cum am socotit</summary><ul>' + ["Riscul pe o zi (VaR / ES): pozițiile de ACUM, în lei, puse pe randamentele zilnice reale ale fiecăreia din ultimele ~250 de zile, cu tot cu mișcarea leului față de dolar / euro (simulare istorică). VaR 95 % = pierderea depășită într-o zi din 20; ES = media acelor zile.",
    "Corelațiile: pe zilele în care amândouă au preț (ultimele 90), cel puțin 40. „Pariuri independente” = pătratul raportului dintre suma riscurilor fiecărei poziții și riscul contului.",
    "Crizele: ferestrele reale (Covid 2020, China 2021, Terra/Luna 2022, FTX 2022, yenul 2024, 10 octombrie 2025). Boții: gridul long cumpără la scădere până la marginea de jos (short-ul vinde la creștere), iar trecerea de prețul de lichidare = pierzi tot ce e în bot.",
    "Reconcilierea: cantitatea fiecărei acțiuni din jurnalul Radarului (umplerile T212, FIFO) față de ce raportează T212; boții închiși de pe prima pagină Pionex față de arhivă; boții porniți față de istoricul din Radar. O abatere vine o dată pe zi pe Discord.",
    "Randamentul ponderat în timp: înlănțuit zi cu zi (câștigul zilei ÷ banii la lucru în ziua aceea), deci depunerile și retragerile nu-l strâmbă. Sharpe / Sortino anualizate pe 365 de zile, fără dobânda fără risc."].map(function (x) { return "<li>" + ciEsc(x) + "</li>"; }).join("") + "</ul></details>";
  h += ciExportHtml(st);
  h += ciMasuraHtml(st);
  return h;
}
// v100.179 (el 13.10: „fă 1, 2, 3, 4”): gărzile LUI (din datele lui), lecția săptămânii (duminică seara, cu verificarea regulii de data trecută),
// ce se întâmplă după ce prețul iese din banda gridului (din boții lui închiși) - informează, nu blochează
function ciDisciplinaHtml(r, banda, lectii) {
  var h = "", g = r && r.garzi;
  if (g && g.length) {
    var rele = g.filter(function (x) { return !x.ok; });
    h += '<section class="ciSec"><h3>Gărzile tale</h3><p class="ciRasp">' + ciEsc(rele.length ? ciCate(rele.length, "gardă e încălcată", "gărzi sunt încălcate") + " acum. Le vezi și la Poartă; pe Discord vine câte o alertă pe zi." : "Toate gărzile sunt respectate.") + '</p><ul class="ciLista">'
      + g.map(function (x) { return '<li class="' + (x.ok ? "good" : "bad") + '">' + (x.ok ? "✓ " : "✗ ") + "<b>" + ciEsc(x.titlu) + "</b>" + (x.detaliu ? " · " + ciEsc(x.detaliu) : "") + ' <span class="tbSub">(' + ciEsc(x.sursa) + ")</span></li>"; }).join("") + "</ul></section>";
  }
  var l = Array.isArray(lectii) && lectii.length ? lectii[lectii.length - 1] : null;
  h += '<section class="ciSec"><h3>Lecția săptămânii</h3>';
  if (!l) h += '<p class="tbSub">Vine duminică seara (și pe Discord): cele mai scumpe 3 decizii ale săptămânii, ce regulă a ta au încălcat, cât au costat, și o singură regulă pentru săptămâna care vine. Duminica următoare: ai respectat-o?</p>';
  else {
    var L = l.lectie || {}, v = l.verificare;
    if (v) h += '<p class="' + (v.respectata ? "good" : "bad") + '">' + ciEsc("Regula de data trecută („" + v.text + "”): " + (v.respectata ? "respectată ✓" : "încălcată de " + ciCate(v.incalcari, "dată", "ori"))) + "</p>";
    h += (L.top && L.top.length ? '<ol class="ciLista">' + L.top.map(function (d) { return "<li><b>" + ciEsc(d.ce) + "</b> · −" + ciEsc(ciMii(d.cost)) + " lei · " + ciEsc(d.motive.map(function (m) { return m.text; }).join("; ")) + "</li>"; }).join("") + "</ol>" : '<p class="good">Săptămâna asta nicio pierdere n-a încălcat o regulă a ta.</p>')
      + (L.regula ? '<p class="t212Fac">👉 <b>Regula săptămânii:</b> ' + ciEsc(L.regula.text) + ' <span class="tbSub">(' + ciEsc("a costat " + ciMii(L.regula.cost) + " lei săptămâna trecută") + ")</span></p>" : "")
      + '<p class="tbSub">' + ciEsc("Săptămâna " + ciZi(new Date(L.de).toISOString().slice(0, 10)) + " – " + ciZi(l.sapt) + ".") + "</p>";
  }
  h += "</section>";
  if (banda && Array.isArray(banda.tabel)) {
    var R = banda.regula, P = function (x) { return x == null || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; };
    // audit 19.10 (6): intervalul Wilson 95% lângă procentul de întoarceri; „regula de până acum (n cazuri, interval …)”; mediana nu e „în medie”
    var IW = function (x) { return x && x.intoarseLo != null && x.intoarseHi != null ? Math.round(x.intoarseLo * 100) + "–" + Math.round(x.intoarseHi * 100) + "%" : null; };
    h += '<section class="ciSec"><h3>Când iese botul din bandă</h3><p class="ciRasp">' + ciEsc(R ? "Din boții tăi închiși: după " + R.h + " h afară din bandă, doar " + Math.round(R.intoarse * 100) + "%" + (IW(R) ? " (interval 95%: " + IW(R) + ")" : "") + " s-au mai întors în 24 h, iar prețul a mers încă " + P(R.miscareImpotriva) + " împotriva botului (mediana; " + ciCate(R.n, "caz", "cazuri") + "). Regula de până acum (" + ciCate(R.n, "caz", "cazuri") + (IW(R) ? ", interval 95%: " + IW(R) : "") + "): după " + R.h + " h afară, închizi sau muți banda - alerta vine singură." : "Prea puține ieșiri din bandă în istoria ta ca să scot o regulă (cel puțin 30 la un prag).") + "</p>"
      + '<div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Afară de</th><th>Cazuri</th><th>S-au întors în 24 h</th><th>Mișcarea în continuare</th></tr></thead><tbody>'
      + banda.tabel.map(function (x) { return '<tr' + (R && x.h === R.h ? ' class="ciAles"' : "") + "><td>" + ciEsc(ciCate(x.h, "oră", "ore")) + '</td><td class="num">' + ciEt("cazuri") + ciEsc(String(x.n)) + '</td><td class="num">' + ciEt("întoarse") + ciEsc(x.intoarse == null ? "—" : Math.round(x.intoarse * 100) + "%" + (IW(x) ? " (" + IW(x) + ")" : "")) + '</td><td class="num">' + ciEt("împotrivă") + ciEsc(P(x.miscareImpotriva)) + "</td></tr>"; }).join("") + "</tbody></table></div>"
      + ((banda.grupe || []).length ? '<p class="tbSub">' + ciEsc("Rezultatul net (mediana) după cât au stat afară: " + banda.grupe.filter(function (x) { return x.n; }).map(function (x) { return x.grupa + " " + P(x.netMedian) + " (" + x.n + ")"; }).join(" · ") + ".") + "</p>" : "")
      + "</section>";
  }
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
  var h = '<section class="ciSec"><h3>Au avut dreptate verdictele?</h3>';
  if (!c) return h + '<p class="tbSub">Jurnalul verdictelor se umple de acum: fiecare verificare la Poartă (T212 și grid), ideile zilei și regimul macro se țin minte cu prețul de atunci și se judecă după 5 / 20 de zile de bursă (gridul după 1 / 3 zile). Prima judecată vine după prima tură de noapte a colectorului.</p></section>';
  var P = function (x, z) { return x == null || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(z == null ? 1 : z).replace(".", ",") + "%"; };
  var NIV = { cumpara: "cumpără", asteapta: "așteaptă", nu: "nu", porneste: "pornește", cumpar: "idee", riskon: "pofta de risc", inclinat: "înclinat spre risc", neutru: "neutru", prudent: "prudent", riskoff: "fuga de risc", stres: "stres" };
  h += '<p class="tbSub">' + ciEsc(ciCate(c.n || 0, "verdict ținut minte", "verdicte ținute minte") + ", dintre care " + Number(c.evaluate || 0) + " au fost judecate (cele mai noi încă își așteaptă orizontul).") + "</p>";
  (c.calibrare || []).forEach(function (r) {
    var lin = r.niveluri.slice().sort(function (a, b) { return b.n - a.n; }).map(function (x) { return "<tr><td>" + ciEsc(NIV[x.nivel] || x.nivel) + '</td><td class="num">' + ciEsc(String(x.n)) + '</td><td class="num">' + ciEsc(r.masura === "linistit" ? Math.round(x.medie * 100) + "% au stat în bandă" : P(x.medie)) + '</td><td class="num">' + ciEsc(r.masura === "linistit" ? "—" : P(x.pePlus, 0).replace("+", "")) + "</td></tr>"; }).join("");
    var zi1 = r.unitate === "zi";   /* v100.195: coșurile (~20 de nume pe zi) se judecă pe zile independente, nu pe nume */
    var t = r.test || {}, v = t.stare === "putine" ? (zi1 && t.zileAmestecate && t.minU && Number(t.unitati) < t.minU ? "puține zile cu ambele feluri de verdict încă (" + Number(t.unitati || 0) + ", trebuie cel puțin " + Number(t.minU) + "; verdictele din aceeași zi trec prin aceeași piață, deci se compară în ziua lor)" : zi1 && t.minU && Number(t.unitati) < t.minU ? "puține zile independente încă (" + Number(t.unitati || 0) + ", trebuie cel puțin " + Number(t.minU) + "; numele aceleiași zile se mișcă împreună, deci se judecă împreună)" : "puține cazuri încă (" + Number(t.nFav) + " / " + Number(t.nRest) + ", trebuie cel puțin 30 pe fiecare parte)") : t.stare === "testat" ? "diferența " + (r.masura === "linistit" ? Math.round(t.dif * 100) + " puncte" : P(t.dif)) + ", p = " + ciNr(t.p, 3) + (zi1 && t.unitati ? ", pe " + (t.zileAmestecate ? ciCate(Number(t.unitati), "zi cu ambele feluri", "zile cu ambele feluri") : ciCate(Number(t.unitati), "zi independentă", "zile independente")) : "") : "";
    h += "<h4>" + ciEsc(r.nume + " · după " + r.h + (r.masura === "linistit" ? (r.h === 1 ? " zi" : " zile") : " zile de bursă")) + '</h4><p class="tbSub">' + ciEsc(r.intrebare + (v ? ": " + v : "")) + '</p><div class="t212TabWrap"><table class="t212Tab ciTab"><thead><tr><th>Verdict</th><th>Câte</th><th>' + (r.masura === "pesteQqq" ? "Față de QQQ" : r.masura === "pesteSpy" ? "Față de SPY" : r.masura === "linistit" ? "Rezultat" : "Media") + "</th><th>Pe plus</th></tr></thead><tbody>" + lin + "</tbody></table></div>";
  });
  var rg = c.registru || [];
  if (rg.length) {
    var ram = rg.filter(function (x) { return x.ramane; }), leg = rg.filter(function (x) { return x.treceBh && x.cauza === false; });
    /* v100.196 (🟡2): corecția ține doar între testele din registru - restul au regulile lor; 🟡3: legăturile (se știu abia la ieșire) nu sunt reguli */
    var afara = [["model", "modelele 🧠/🌳"], ["laborator", "laboratorul"], ["carnet", "carnetul"]].filter(function (f) { return !rg.some(function (x) { return x.felul === f[0]; }); }).map(function (f) { return f[1]; }).concat(["Dovada pe bot"]);
    h += '<h4>Ce e dovedit cu adevărat (după corecția pentru teste multiple)</h4><p class="ciRasp">' + ciEsc("Registrul are " + ciCate(rg.length, "test", "teste") + " deschise, din " + ciFamiliiRegistru(rg) + ". Cu atâtea, câteva ies „dovedite” din întâmplare; între ele, corecția Benjamini–Hochberg ține descoperirile false la cel mult ~5%, și rămân " + (ram.length ? ciCate(ram.length, "lucru dovedit", "lucruri dovedite") + ":" : "niciunul dovedit.")) + "</p>"
      + (ram.length ? '<ul class="ciLista">' + ram.map(function (x) { return "<li><b>" + ciEsc(x.afirmatie) + "</b> · " + ciEsc((x.directie ? x.directie + " · " : "") + x.sursa) + ' <span class="tbSub">(p = ' + ciEsc(ciNr(x.p, 4)) + ")</span></li>"; }).join("") + "</ul>" : "")
      + (leg.length ? '<p class="tbSub">' + ciEsc("Trec corecția, dar se știu abia la ieșire, deci nu sunt reguli de urmat: " + leg.map(function (x) { return x.afirmatie + " — " + (x.limita || "legătură, nu cauză"); }).join("; ") + ".") + "</p>" : "")
      + '<p class="tbSub">' + ciEsc("În afara corecției, cu regulile lor proprii: " + afara.join(", ") + ".") + "</p>"
      + '<details class="ciMetoda"><summary>Toate testele (' + ciEsc(String(rg.length)) + ")</summary><ul>" + rg.slice().sort(function (a, b) { return a.p - b.p; }).map(function (x) { return '<li class="' + (x.ramane ? "good" : "") + '">' + ciEsc(x.sursa + " · " + x.afirmatie + (x.directie ? " · " + x.directie : "") + " · p = " + ciNr(x.p, 4) + (x.cauza === false && x.limita ? " · " + x.limita : x.stareVeche && /^dovedit/.test(x.stareVeche) && !x.ramane ? " · pagina lui zicea „dovedit”, după corecție NU mai e" : x.treceBh && !x.ramane ? " · p mic, dar nu trece regula lui fixată dinainte (direcția / cele două jumătăți)" : "")) + "</li>"; }).join("") + "</ul></details>";
  }
  return h + "</section>";
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
  var r = ciStare.raport, st = { export: ciExportCitit(), masura: null, nepotriviri: r && r.randament && Array.isArray(r.randament.t212Nepotrivite) ? r.randament.t212Nepotrivite : null, acum: Date.now() };
  var zile = typeof acFranaZileCitite === "function" ? acFranaZileCitite() : [];
  if (typeof Acasa !== "undefined" && Acasa.masuraFranei) st.masura = Acasa.masuraFranei(ciStare.botiMasura, zile);
  var corp = !r && ciStare.eroare ? '<p class="bad">Nu pot citi raportul: ' + ciEsc(ciStare.eroare) + "</p>" + ciHtml(null, st) : ciHtml(r, st);
  box.innerHTML = ciZileHtml(ciStare.zile) + corp + ciDisciplinaHtml(r, ciStare.banda, ciStare.lectii) + ciVerdicteHtml(ciStare.verdicte, {});
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
async function ciPorneste(forta) {
  var box = document.getElementById("ciPagina"); if (!box) return;
  if (ciStare.inLucru) return;
  if (!forta && ciStare.raport && Date.now() - ciStare.la < 5 * 60000) {
    if (ciStare.botiMasura === undefined) ciStare.botiMasura = await ciBotiMasura();
    ciDeseneaza();
    return;
  }
  ciStare.inLucru = true;
  try { var d = await getJSON("/api/istoric-bot?action=cont"); ciStare.raport = d && d.cont || null; ciStare.eroare = null; ciStare.la = Date.now(); }
  catch (e) { ciStare.eroare = String(e && e.message || e); }
  try { var dv = await getJSON("/api/istoric-bot?action=verdicteCalibrare"); ciStare.verdicte = dv && dv.calibrare || null; } catch (e2) { ciStare.verdicte = null; }
  try { var db = await getJSON("/api/istoric-bot?action=disciplinaBanda"); ciStare.banda = db && db.banda || null; } catch (e3) { ciStare.banda = null; }
  try { var dl = await getJSON("/api/istoric-bot?action=lectii"); ciStare.lectii = dl && dl.lectii || null; } catch (e4) { ciStare.lectii = null; }
  try { var dz = await getJSON("/api/istoric-bot?action=contZile"); ciStare.zile = dz && Array.isArray(dz.zile) ? dz.zile : null; } catch (e5) { ciStare.zile = null; }   /* v100.197 */
  ciStare.botiMasura = await ciBotiMasura();
  ciStare.inLucru = false;
  ciDeseneaza();
}
