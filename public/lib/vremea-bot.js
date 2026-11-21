// v100.374 (21.11.2026, el: „da fa tot”; ideea I-905 din analiza de trader din 20.11): „VREMEA MONEDEI” într-un rând.
// Pagina botului are multe voci de direcție (becurile pe 6 intervale, TradingView, scorul indicatorilor, Busola) și spune singură că sunt
// nedovedite: direcția lor a fost nimerită în 47–50 din 100 de cazuri (măsurat 13.11, 21 de monede), iar pe boții lui, la pornire, 12
// comparații nu despart câștigul de pierdere. Rândul le numără într-o frază, FĂRĂ culoare de verdict; tabelele rămân dedesubt, într-un pliu
// („Vremea monedei, pe larg”) - nimic scos. Modul pur (fără DOM), probat în scripts/proba-v100374.mjs. Numele: „Vremea pieței” e alt card
// (starea pieței întregi); aici e moneda botului.
var VremeaBot = (function () {
  "use strict";
  /* intervalele TradingView care intră în frază (cheile notei: tv-note.js TF) */
  var TV = [["4h", "4 h"], ["1D", "1 zi"]];
  function cate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n === 1 ? "1 " + sg : n + " " + pl; }
  var BUSOLA = { asteapta: "Busola așteaptă", "inclinat-long": "Busola înclină long", "inclinat-short": "Busola înclină short" };
  // x = { sem: rândurile semaforului (tbSemaforTf: { ton: bine | rau | atentie | neutru, dir }), tv: nota TradingView a monedei (n.iv[tf].all),
  //       tvClasa: TvNote.clasa, busola: direcția Busolei (asteapta | inclinat-long | inclinat-short) sau null, dovada: bilanțul becurilor pe boții lui }
  function rezumat(x) {
    x = x || {}; var sem = Array.isArray(x.sem) ? x.sem : [], T = sem.length, n = { contra: 0, cu: 0, lateral: 0, impinge: 0, fara: 0 }, b = [];
    sem.forEach(function (s) { if (!s || !s.dir) n.fara++; else if (s.ton === "rau") n.contra++; else if (s.ton === "bine") n.cu++; else if (s.ton === "atentie") n.impinge++; else n.lateral++; });
    if (T && n.fara < T) {
      var p = [];
      if (n.contra) p.push(n.contra + " contra botului"); if (n.cu) p.push(n.cu + " cu botul"); if (n.lateral) p.push(cate(n.lateral, "lateral", "laterale"));
      if (n.impinge) p.push(cate(n.impinge, "împinge gridul", "împing gridul")); if (n.fara) p.push(n.fara + " fără lumânări");
      b.push("din " + cate(T, "interval", "intervale") + ": " + p.join(", "));
    } else if (T) b.push("becurile: se aduc lumânările");
    var tv = [];
    if (x.tv && x.tv.iv && typeof x.tvClasa === "function") TV.forEach(function (t) { var v = x.tv.iv[t[0]], c = v ? x.tvClasa(v.all) : null; if (c && c.cod && c.cod !== "lipsa") tv.push(c.text + " pe " + t[1]); });
    if (tv.length) b.push("TradingView: " + tv.join(", "));
    if (x.busola && BUSOLA[x.busola]) b.push(BUSOLA[x.busola]);
    if (!b.length) return { gol: true, text: "", contra: 0, cu: 0, total: T };
    /* dovada: fraza scurtă a bilanțului (cifrele lui rămân în pliu, lângă tabel) */
    var d = String(x.dovada || "").replace(/^pe boții tăi[,:]?\s*/i, ""), i = d.indexOf(" ("); if (i > 0) d = d.slice(0, i);
    return { gol: false, text: "Vremea monedei: " + b.join(" · ") + (d ? " — pe boții tăi: " + d : " — informație, nedovedită pe boții tăi"), contra: n.contra, cu: n.cu, total: T };
  }
  return { rezumat: rezumat };
})();
if (typeof module !== "undefined" && module.exports) module.exports = VremeaBot;
