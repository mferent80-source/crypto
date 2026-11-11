/* v100.320 (el, 11.11.2026: „vreau Technicals și Technical Ratings din TradingView, cele 2 scripturi pe care le folosesc și eu, în pagina
   botului și în pagina Trade 212”): desenul notelor TradingView, comun Tabloului și paginii T212. Cifrele vin de la server
   (/api/market?type=tv_rating, scannerul public TradingView - aceleași ca pe graficul lui). Pragurile sunt ale TradingView:
   < −0,5 vinde tare · [−0,5, −0,1) vinde · [−0,1, 0,1] neutru · (0,1, 0,5] cumpără · > 0,5 cumpără tare.
   E INFORMAȚIE: nu intră în verdictul botului și nici în semaforul pozițiilor (nedovedită pe boții / trade-urile lui). */
var TvNote = (function () {
  var TF = ["5m", "15m", "1h", "4h", "1D", "1W"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function bun(x) { return typeof x === "number" && isFinite(x); }
  function clasa(x) {
    if (!bun(x)) return { cod: "lipsa", text: "—", ton: "mutedInfo" };
    if (x < -0.5) return { cod: "vinde-tare", text: "vinde tare", ton: "bad" };
    if (x < -0.1) return { cod: "vinde", text: "vinde", ton: "bad" };
    if (x <= 0.1) return { cod: "neutru", text: "neutru", ton: "mutedInfo" };
    if (x <= 0.5) return { cod: "cumpara", text: "cumpără", ton: "good" };
    return { cod: "cumpara-tare", text: "cumpără tare", ton: "good" };
  }
  /* o zecimală (regula lui), cu semn; „0,0” fără semn */
  function valoare(x) { if (!bun(x)) return "—"; var r = Math.round(x * 10) / 10; if (r === 0) return "0,0"; return (r > 0 ? "+" : "−") + Math.abs(r).toFixed(1).replace(".", ","); }
  function ora(t) { if (!bun(t)) return ""; var d = new Date(t); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function celula(x, mare) { var c = clasa(x); return '<td class="' + c.ton + '"' + (bun(x) ? ' title="' + esc(c.text + " · " + valoare(x)) + '"' : "") + '>' + (mare ? "<b>" + esc(c.text) + "</b>" : esc(c.text)) + (bun(x) ? '<span class="tvNoteVal">' + valoare(x) + "</span>" : "") + "</td>"; }
  /* n = {tv, iv:{"5m":{all,ma,osc},…}} | {eroare} | null; opt = {directie:"short"|"long", la} */
  function tabel(n, opt) {
    opt = opt || {};
    var cap = '<div class="tvNoteCap"><b>TradingView · Technicals</b><span class="tbSub">' + (n && n.tv ? esc(n.tv) + " · " : "") + "ca vitezometrele de pe pagina simbolului și „Technical Ratings”</span></div>";
    if (!n) return cap + '<p class="tbSub">Aștept notele TradingView…</p>';
    if (n.eroare) return cap + '<p class="tbSub">' + esc(n.eroare) + "</p>";
    if (!n.iv) return cap + '<p class="tbSub">TradingView n-are simbolul ăsta.</p>';
    /* intervalele pe rânduri, grupurile pe coloane: încape și în coloana îngustă de lângă grafic (~240 px), fără derulare laterală */
    var rand = function (tf) { var v = n.iv[tf] || {}; return "<tr><th>" + tf + "</th>" + celula(v.all, true) + celula(v.ma, false) + celula(v.osc, false) + "</tr>"; };
    var nota = ["informație, nu intră în verdict"];
    if (opt.directie === "short") nota.push("pentru un short, „vinde” merge cu " + (opt.cu || "botul"));
    else if (opt.directie === "long") nota.push("pentru un long, „cumpără” merge cu " + (opt.cu || "botul"));
    if (opt.la) nota.push("adus la " + ora(opt.la));
    return cap + '<div class="tvNoteWrap"><table class="tvNoteTab"><thead><tr><th>TF</th><th>Rezumat</th><th>Medii (15)</th><th>Oscilatoare (11)</th></tr></thead><tbody>'
      + TF.map(rand).join("") + "</tbody></table></div>"
      + '<p class="tbSub tvNoteNota">' + esc(nota.join(" · ")) + "</p>";
  }
  /* linia scurtă din tabelul pozițiilor T212: „TV 1D: vinde”; cls = o clasă în plus (tvMicTel: doar pe telefon, sub numele acțiunii) */
  function mic(n, tf, cls) {
    tf = tf || "1D"; var v = n && n.iv && n.iv[tf], c = clasa(v && v.all);
    if (c.cod === "lipsa") return "";
    return '<span class="t212Mic tvMic ' + c.ton + (cls ? " " + cls : "") + '" title="' + esc("TradingView · Technicals pe " + tf + ": " + c.text + " (" + valoare(v.all) + ") · informație, nu intră în semafor") + '">TV ' + tf + ": " + esc(c.text) + "</span>";
  }
  return { TF: TF, clasa: clasa, valoare: valoare, tabel: tabel, mic: mic };
})();
