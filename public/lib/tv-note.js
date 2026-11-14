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
  /* o zecimală (regula lui), cu semn; „0,0” fără semn. v100.339 (auditul din 13.11): la mai puțin de 0,05 de un prag (±0,1 / ±0,5) două
     zecimale - altfel −0,112 („vinde”) și −0,091 („neutru”) se scriau amândouă „−0,1”, aceeași cifră cu două cuvinte */
  function valoare(x) {
    if (!bun(x)) return "—"; var a = Math.abs(x), langa = Math.abs(a - 0.1) < 0.05 || Math.abs(a - 0.5) < 0.05, z = langa ? 2 : 1, r = Math.round(x * Math.pow(10, z)) / Math.pow(10, z);
    if (r === 0) return "0,0"; return (r > 0 ? "+" : "−") + Math.abs(r).toFixed(z).replace(".", ",");
  }
  function ora(t) { if (!bun(t)) return ""; var d = new Date(t); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  /* v100.339: cu direcția botului, culoarea e FAȚĂ DE BOT (ca banda de sub tabel): „vinde” la un short e verde. Cuvântul rămâne al TradingView. */
  /* prețul cu virgulă, cu zecimalele mărimii lui (0,0000120 · 0,500 · 71,23 · 1.234,5 nu apare aici: fără separator de mii) */
  function pretTxt(x) { var a = Math.abs(x), d = a >= 100 ? 1 : a >= 1 ? 2 : a > 0 ? Math.min(12, 2 - Math.floor(Math.log10(a))) : 2; return Number(x).toFixed(d).replace(".", ","); }
  function tonFata(c, dir) { if (dir !== "short" && dir !== "long") return c.ton; return c.ton === "mutedInfo" ? c.ton : (c.ton === "good") === (dir === "long") ? "good" : "bad"; }
  function celula(x, mare, dir) { var c = clasa(x); return '<td class="' + tonFata(c, dir) + '"' + (bun(x) ? ' title="' + esc(c.text + " · " + valoare(x)) + '"' : "") + '>' + (mare ? "<b>" + esc(c.text) + "</b>" : esc(c.text)) + (bun(x) ? '<span class="tvNoteVal">' + valoare(x) + "</span>" : "") + "</td>"; }
  /* v100.339: de ce lipsește nota - fiecare cauză cu textul ei (înainte: „TradingView n-are simbolul ăsta” pentru toate) */
  function textLipsa(n) {
    var l = n && n.lipsa;
    if (l === "nemapat") return "Pentru simbolul ăsta nu știu ce simbol TradingView îi corespunde.";
    if (l === "nesigur") return "— simbol nesigur: prețurile sunt găsite după numele firmei sau au fost respinse, deci nu arăt nota altei firme.";
    if (l === "necerut") return "Simbolul n-a fost cerut încă (peste limita unei cereri sau prețurile lui n-au sosit).";
    return "TradingView n-are simbolul" + (n && Array.isArray(n.cautat) && n.cautat.length ? " (căutat: " + n.cautat.join(", ") + ")" : "") + ".";
  }
  var TF_MIN = { "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1D": 1440, "1W": 10080 };
  /* n = {tv, close, scara, iv:{"5m":{all,ma,osc},…}} | {eroare} | {lipsa, cautat} | null;
     opt = {directie:"short"|"long", cu, la (ora serverului), acum, pret (prețul botului, pentru verificarea instrumentului), radar (sursa barelor Radarului)} */
  function tabel(n, opt) {
    opt = opt || {};
    var cap = '<div class="tvNoteCap"><b>TradingView · Technicals</b><span class="tbSub">' + (n && n.tv ? esc(n.tv) + " · " : "") + "ca vitezometrele de pe pagina simbolului și „Technical Ratings”</span></div>";
    if (!n) return cap + '<p class="tbSub">Aștept notele TradingView…</p>';
    if (n.eroare) return cap + '<p class="tbSub">' + esc(n.eroare) + "</p>";
    if (!n.iv) return cap + '<p class="tbSub">' + esc(textLipsa(n)) + "</p>";
    /* v100.339 (I-869): prețul din TradingView față de prețul botului (la scara contractului) - peste 3% abatere e alt instrument cu același nume */
    var sc = bun(n.scara) && n.scara > 0 ? n.scara : 1;
    if (bun(n.close) && bun(opt.pret) && opt.pret > 0 && Math.abs(n.close / sc / opt.pret - 1) > 0.03)
      return cap + '<p class="tbSub">— alt instrument: la TradingView ' + esc(n.tv || "simbolul") + " are prețul " + esc(pretTxt(n.close / sc)) + ", al tău e " + esc(pretTxt(opt.pret)) + ". Nu arăt nota altei monede.</p>";
    var acum = bun(opt.acum) ? opt.acum : Date.now(), minute = bun(opt.la) ? Math.max(0, Math.round((acum - opt.la) / 60000)) : null;
    /* intervalele pe rânduri, grupurile pe coloane: încape și în coloana îngustă de lângă grafic (~240 px), fără derulare laterală */
    var rand = function (tf) { var v = n.iv[tf] || {}, vechi = minute !== null && minute > TF_MIN[tf]; return "<tr" + (vechi ? ' class="tvVechi" title="mai veche decât o bară de ' + tf + '"' : "") + "><th>" + tf + "</th>" + celula(v.all, true, opt.directie) + celula(v.ma, false, opt.directie) + celula(v.osc, false, opt.directie) + "</tr>"; };
    var cuCe = opt.cu || "botul", nota = ["informație, nu intră în verdict", opt.actiuni ? "direcția lui: pe acțiuni nemăsurată (pe crypto, cu formula ei refăcută pe bare închise: 48–49 din 100, nedovedit)" : "direcția lui, măsurată cu formula ei refăcută, pe bare închise (crypto): 48–49 din 100 (nedovedit)"];   /* v100.339 (I-871): măsurat 13.11.2026 pe 21 de monede, 1h și 4h */
    if (opt.directie === "short" || opt.directie === "long") nota.push("culoarea: verde = cu " + cuCe + " (" + opt.directie + "), roșu = împotrivă");
    if (bun(opt.pret) && opt.pret > 0 && !bun(n.close)) nota.push("prețul din TradingView n-a venit: instrument neverificat");   /* revizia (14.11): fără preț nu pot spune că e același instrument */
    if (minute !== null) nota.push(minute < 1 ? "adus acum" : "adus acum " + minute + " min (" + ora(opt.la) + ")");
    /* v100.339 (auditul din 13.11): bazele diferite la vedere, nu doar în titlul lui „≠” (pe telefon titlul nu se vede) */
    var baze = "TradingView: bara în curs" + (n.tv ? ", " + String(n.tv).split(":")[0] : "") + " · Radar: bare închise" + (opt.radar ? ", " + opt.radar : "");
    return cap + '<div class="tvNoteWrap"><table class="tvNoteTab"><thead><tr><th>TF</th><th>Rezumat</th><th>Medii (15)</th><th>Oscilatoare (11)</th></tr></thead><tbody>'
      + TF.map(rand).join("") + "</tbody></table></div>"
      + '<p class="tbSub tvNoteNota">' + esc(nota.join(" · ")) + "</p>"
      + '<p class="tbSub tvNoteNota tvNoteBaze">' + esc(baze) + "</p>";
  }
  /* linia scurtă din tabelul pozițiilor T212: „TV 1D: vinde”; cls = o clasă în plus (tvMicTel: doar pe telefon, sub numele acțiunii) */
  function mic(n, tf, cls) {
    tf = tf || "1D";
    /* v100.339: pe simbol nesigur (găsit după numele firmei / bare respinse) se spune asta, nu se tace și nu se arată nota altei firme */
    if (n && n.lipsa === "nesigur") return '<span class="t212Mic tvMic mutedInfo' + (cls ? " " + cls : "") + '" title="' + esc(textLipsa(n)) + '">TV: — simbol nesigur</span>';
    var v = n && n.iv && n.iv[tf], c = clasa(v && v.all);
    if (c.cod === "lipsa") return "";
    return '<span class="t212Mic tvMic ' + c.ton + (cls ? " " + cls : "") + '" title="' + esc("TradingView · Technicals pe " + tf + ": " + c.text + " (" + valoare(v.all) + ") · informație, nu intră în semafor") + '">TV ' + tf + ": " + esc(c.text) + "</span>";
  }
  // v100.341 (I-878): bilanțul pe viu al notei și al verdictului Radarului (jurnalul colectorului, judecat după 4 bare), de la 30 de zile.
  // Fapt, fără culoare și fără verdict până la judecata unică de la 90 de zile (regulile: docs/cercetare/2026-11-13-tablou-acuratete.md).
  // b = { zile, serii: { tv4h: { n, k, zile }, radar4h: {…} }, judecata: null | { tv4h: { gata, blocuri, verdict, medie }, radar4h: {…} } }
  // O serie apare doar de la 30 de zile ALE EI (revizia: pragul era pe zilele celeilalte serii). Procentul e cel simplu, din note.
  function bilantText(b) {
    if (!b || !b.serii) return "";
    var cate = function (n, unu, multe) { return TextRo.cate(n, unu, multe); };   /* pluralul și „de” de la 20: regula casei, într-un singur loc (text-ro.js) */
    var pc = function (x) { return Math.round(100 * x) + "%"; }, pc1 = function (x) { return (Math.round(1000 * x) / 10).toFixed(1).replace(".", ",") + "%"; };
    var are = function (x) { return !!x && x.n > 0 && x.zile >= 30 && x.k >= 0 && x.k <= x.n; }, cat = function (x) { return "(" + cate(x.n, "notă judecată", "note judecate") + " în " + cate(x.zile, "zi", "zile") + ")"; };
    var tv = b.serii.tv4h, rd = b.serii.radar4h, parti = [];
    if (are(tv)) parti.push("nota TradingView pe 4 ore a nimerit direcția în " + pc(tv.k / tv.n) + " din note " + cat(tv));
    if (are(rd)) parti.push("verdictul Radarului pe 4 ore " + (parti.length ? "" : "a nimerit direcția ") + "în " + pc(rd.k / rd.n) + (parti.length ? " " : " din note ") + cat(rd));
    if (!parti.length) return "";
    var j = b.judecata || {}, zj = function (x, nume) { return !x || !x.gata || !x.verdict ? null : nume + " — " + (x.verdict === "DOVEDIT" ? "nimerește direcția" : "nedovedit") + (bun(x.medie) ? " (" + pc1(x.medie) + " în medie pe bloc)" : ""); };
    var jud = [are(tv) ? zj(j.tv4h, "nota TradingView") : null, are(rd) ? zj(j.radar4h, "verdictul Radarului") : null].filter(Boolean);
    var coada = jud.length ? "Judecat o singură dată, pe primele " + cate((j.tv4h && j.tv4h.gata ? j.tv4h : j.radar4h).blocuri, "bloc", "blocuri") + " de 5 zile: " + jud.join("; ") + "."
      : "Numărătoare, nu dovadă: judecata se face o singură dată, pe primele 36 de blocuri de 5 zile.";
    return "Pe viu, din jurnalul colectorului, pe monedele boților tăi: " + parti.join("; ") + ". " + coada;
  }
  return { TF: TF, clasa: clasa, valoare: valoare, tabel: tabel, mic: mic, textLipsa: textLipsa, bilantText: bilantText };
})();
