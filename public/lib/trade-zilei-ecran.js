// Pagina „Trade-ul zilei” (v100.297) - partea de ECRAN: aduce lumânările de 1 h pentru monedele tale (BTC, ETH, SOL + boții activi),
// le trece prin TradeZilei (lib/trade-zilei.js, pur) și desenează cartelele. tzHtml e fără DOM (proba o rulează în vm); tzPorneste leagă pagina.
// Cinstit: cifrele dovedite (P3, P1, cât se mișcă) sunt date ca atare; „trade-ul zilei” apare DOAR dacă un trade a trecut proba din 03.11.2026.
var tzStare = { monede: [], la: 0, zi: 0, inLucru: false, eroare: null, simboluri: [] };
var TZ_IMPLICITE = ["BTC", "ETH", "SOL"];
var TZ_MAX = 10;
function tzEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function tzPct(v, zec) { if (v == null || !isFinite(v)) return "—"; var z = zec == null ? 0 : zec; return (v * 100).toFixed(z).replace(".", ",") + " %"; }
// prețul: 2 zecimale, 4 sub 1 USDT, 6 sub 0,01 (monede mici); punctul de mii DOAR pe partea întreagă (revizia 03.11: „0,1.234”)
function tzPret(p) { if (!(p > 0)) return "—"; var z = p < 0.01 ? 6 : p < 1 ? 4 : 2, s = p.toFixed(z).split("."); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1]; }
function tzOra(t) { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return "—"; } }
// monedele paginii: implicitele (perp) + boții activi (Tablou / Contul întreg) cu simbolul LOR Pionex (spot sau perp, TabloBot.simboluri), fără dubluri, cel mult TZ_MAX
function tzSimboluri() {
  var l = TZ_IMPLICITE.map(function (m) { return { simbol: m, pionex: m + "_USDT_PERP" }; });
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : (typeof contTot !== "undefined" && contTot ? contTot.boti : null);
  (boti || []).forEach(function (b) {
    if (!b || !b.activ || !b.baza) return;
    var s = typeof TabloBot !== "undefined" && TabloBot.simboluri ? TabloBot.simboluri(b.baza, b.quote, b.simbolPionex) : null;
    var n = String(s ? s.moneda : b.baza).replace(/\.PERP$/, "").toUpperCase(), p = s ? s.pionex : n + "_USDT_PERP";
    if (n && !l.some(function (x) { return x.simbol === n; })) l.push({ simbol: n, pionex: p });
  });
  return l.slice(0, TZ_MAX);
}
function tzTonP(p) { return p == null ? "" : p >= 0.7 ? " tzBun" : p <= 0.3 ? " tzMut" : ""; }
// o cartelă: ce spun modelele dovedite despre ziua de azi + trade-ul zilei
function tzCartela(m) {
  var h = '<article class="tzCard' + (m.eroare ? " tzCardGol" : "") + '" aria-label="' + tzEsc(m.simbol) + '">';
  h += '<div class="tzCardCap"><b class="tzSimbol">' + tzEsc(m.simbol) + "</b><span class=\"tzMut tzMic\">" + (m.d && m.d.pret ? tzPret(m.d.pret) + " USDT" : "") + "</span></div>";
  if (m.eroare || !m.d || m.d.eroare) { h += '<p class="tzMut">' + tzEsc(m.eroare || (m.d && m.d.eroare) || "fără date") + "</p></article>"; return h; }
  var d = m.d, t = TradeZilei.trade(d);
  h += '<div class="tzRand tzRandMare"><span class="tzEt">Azi se mișcă mai mult ca ieri</span><b class="tzCifra' + tzTonP(d.p3) + '">' + tzPct(d.p3) + "</b><span class=\"tzMut tzMic\">calibrat: din 100 de zile ca azi, " + Math.round(d.maiMultCaIeri * 100) + " au ieșit așa</span></div>";
  h += '<div class="tzRand"><span class="tzEt">Cât se mișcă azi, de obicei</span><b class="tzCifra">' + tzPct(d.asteptat.med, 1) + "</b><span class=\"tzMut tzMic\">între " + tzPct(d.asteptat.p25, 1) + " și " + tzPct(d.asteptat.p75, 1) + " (jumătatea zilelor) · ieri " + tzPct(d.r1, 1) + " · media pe 10 zile " + tzPct(d.media10, 1) + "</span></div>";
  h += '<div class="tzRand"><span class="tzEt">Până acum azi</span><b class="tzCifra">' + tzPct(d.panaAcum, 1) + "</b><span class=\"tzMut tzMic\">" + TextRo.cate(d.bareAzi, "oră închisă", "ore închise") + ", " + TextRo.cate(d.bareRamase, "oră rămasă", "ore rămase") + " (ziua UTC)</span></div>";
  function niv(nume, L, p) {
    var txt = p.atins ? "atins deja azi" : p.p == null ? "—" : "atinge azi " + tzPct(p.p) + " · la " + tzPct(p.dist, 2) + " de preț";
    return '<div class="tzRand"><span class="tzEt">' + nume + " " + tzPret(L) + '</span><b class="tzCifra' + (p.atins ? " tzMut" : tzTonP(p.p)) + '">' + (p.atins ? "✓" : p.p == null ? "—" : tzPct(p.p)) + '</b><span class="tzMut tzMic">' + tzEsc(txt) + "</span></div>";
  }
  h += niv("Maximul de ieri", d.pdh, d.p1Sus) + niv("Minimul de ieri", d.pdl, d.p1Jos);
  h += '<div class="tzTrade' + (t.fel === "niciunul" ? " tzTradeNu" : " tzTradeDa") + '"><span class="tzEt">Trade-ul zilei</span><p>' + tzEsc(t.text) + (t.cifra ? ' <span class="tzMut tzMic">' + tzEsc(t.cifra) + "</span>" : "") + "</p></div>";
  if (d.ziIncompleta) h += '<p class="tzMut tzMic">sub 20 de zile întregi în lumânări: trendul lipsește din P1 (efect mic).</p>';
  return h + "</article>";
}
function tzHtml(st, acum) {
  var h = '<div class="tzAntet"><h3>Trade-ul zilei</h3><span class="tzMut tzMic" id="tzCand">' + (st.la ? "citit la " + tzOra(st.la) : "") + '</span><div class="tzDr"><button class="acBtn" type="button" data-action-click="tzPorneste(true)">↻ Recitește</button></div></div>';
  h += '<p class="tzIntro">Ce se știe despre ziua de azi, pe monedele tale: cât se mișcă (P3, dovedit: potrivit pe 2 ani, confirmat pe al treilea, 21 de perechi, 01.11.2026) și cât de probabil atinge nivelurile de ieri (P1, calibrat, nu dovedit că bate mersul la întâmplare). Direcția nu se prezice - nu apare aici. ';
  h += "Ziua e cea UTC (se termină la 02:00 ora României iarna). Un trade apare ca „trade-ul zilei” doar dacă a trecut proba pre-înregistrată din 03.11.2026.</p>";
  if (st.inLucru && !st.monede.length) h += '<p class="tzMut">Aduc lumânările…</p>';
  else if (st.eroare && !st.monede.length) h += '<p class="tzRau">' + tzEsc(st.eroare) + ' <button class="acBtn" type="button" data-action-click="tzPorneste(true)">Încearcă din nou</button></p>';
  else if (!st.monede.length) h += '<p class="tzMut">Nicio monedă încă - apasă „Recitește”.</p>';
  else h += (st.eroare ? '<p class="tzRau">' + tzEsc(st.eroare) + "</p>" : "") + '<div class="tzGrila">' + st.monede.map(tzCartela).join("") + "</div>";
  var P = TradeZilei.PROBA;
  h += '<section class="tzBloc" aria-labelledby="tz-h-proba"><div class="tzBlocCap"><h3 id="tz-h-proba">De ce nu-ți propun un trade</h3><span class="tzMut tzMic">proba pre-înregistrată din 03.11.2026, 21 de perechi, 1 h, după cost</span></div><ul class="tzLista">';
  Object.keys(P).forEach(function (k) { var p = P[k]; h += "<li><span class=\"tzSemn " + (p.dovedit ? "tzBun" : "tzRau") + '" aria-hidden="true">' + (p.dovedit ? "✓" : "✕") + "</span><span><b>" + tzEsc(p.nume) + "</b> - " + tzEsc(p.regula) + ". " + (p.dovedit ? "DOVEDIT" : "NEDOVEDIT") + (p.cifra ? " · " + tzEsc(p.cifra) : "") + "</span></li>"; });
  h += '</ul><p class="tzMut tzMic">Ce POȚI folosi din cifrele de sus: lățimea gridului și distanța stopului după „cât se mișcă azi” (măsurat ca mișcare, nu ca bani). Când P3 e mare, ieri a fost o zi neobișnuit de liniștită - range-ul de azi e de obicei SUB media pe 10 zile, nu peste.</p></section>';
  return h;
}
function tzDeseneaza() { var el = document.getElementById("tzPagina"); if (el) el.innerHTML = tzHtml(tzStare, Date.now()); }
async function tzPorneste(forta) {
  if (tzStare.inLucru) return;
  var ziUtc = Math.floor(Date.now() / 86400000), proaspat = tzStare.la && Date.now() - tzStare.la < 10 * 60 * 1000 && tzStare.zi === ziUtc;
  var cuDate = tzStare.monede.some(function (m) { return m.d && !m.d.eroare; });
  if (!forta && proaspat && cuDate) { tzDeseneaza(); return; }   // cache 10 min, doar în aceeași zi UTC și doar dacă a ieșit măcar o cartelă cu cifre
  tzStare.inLucru = true; tzStare.eroare = null;
  var monede = [];
  try {
    tzStare.simboluri = tzSimboluri(); tzDeseneaza();
    for (var i = 0; i < tzStare.simboluri.length; i++) {
      var s = tzStare.simboluri[i];
      try {
        var k = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s.pionex) + "&interval=60M&limit=500");
        var bare = typeof GridCalcul !== "undefined" ? GridCalcul.bare(k && k.data && k.data.klines) : null;
        monede.push({ simbol: s.simbol, d: bare && bare.length ? TradeZilei.azi(bare, Date.now()) : { eroare: "fără lumânări de la Pionex" } });
      } catch (e) {
        var msg = String(e && e.message || e);
        monede.push({ simbol: s.simbol, eroare: "nu am putut citi lumânările (" + msg.slice(0, 80) + ")" });
        if (/429|prea multe|rate/i.test(msg)) { tzStare.eroare = "Pionex a refuzat (prea multe cereri) - restul monedelor le citesc la „Recitește”."; break; }
      }
      tzStare.monede = monede.slice(); tzDeseneaza();   // cartelele apar pe rând, nu toate la final
    }
    tzStare.monede = monede; tzStare.la = Date.now(); tzStare.zi = ziUtc;
    if (!monede.length) tzStare.eroare = "Nicio monedă de citit.";
  } finally { tzStare.inLucru = false; tzDeseneaza(); }
}
