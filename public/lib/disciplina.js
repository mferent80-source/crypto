// Disciplina (v100.179; el 13.10: „fă 1, 2, 3, 4”): ieșirea botului din bandă după istoria LUI, gărzile LUI, lecția săptămânii, teza la intrare.
// Modul PUR (fără DOM, fără rețea), probat în scripts/proba-v100179.mjs. Colectorul îl rulează, pagina și Discordul îl arată.
// Pragurile sunt scoase din datele lui (stopul din MAE, orele din bandă) acolo unde există; altfel valorile implicite, spuse pe față.
// Avertizează, nu blochează (regula lui: „pragul e un privilegiu”).
var Disciplina = (function () {
  "use strict";
  var ORA = 3600000, ZI = 86400000, PRAGURI_ORE = [1, 3, 6, 12, 24, 48];
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  function mediana(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }

  // ---------------- 1. ieșirea din bandă ----------------
  // pentru fiecare bot închis (JurnalTrade.din: jos, sus, dir, pornit, inchis, pct) și barele de 1 h ale monedei: prima ieșire a prețului din
  // bandă; pentru fiecare prag de ore în care a STAT afară continuu: s-a întors în bandă în următoarele 24 h? cât a mers prețul în continuare
  // ÎMPOTRIVA botului (long ieșit pe jos: în jos; short ieșit pe sus: în sus; neutrul: mai departe de bandă)
  function iesiriBanda(trades, bareDe, o) {
    o = o || {}; var praguri = o.praguri || PRAGURI_ORE, rez = {}, oreAfaraPe = {}, bucket = { "sub 6 h": [], "6–24 h": [], "peste 24 h": [], "nu a ieșit": [] };
    praguri.forEach(function (h) { rez[h] = { h: h, n: 0, intoarse: 0, miscari: [], net: [] }; });
    (trades || []).forEach(function (t) {
      var jos = nr(t.jos), sus = nr(t.sus); if (!(jos > 0) || !(sus > jos) || !(t.pornit > 0) || !(t.inchis > t.pornit)) return;
      var b = bareDe(t.moneda); if (!b || !b.length) return;
      var l = b.filter(function (x) { return x.t >= t.pornit && x.t <= t.inchis + 72 * ORA; }); if (l.length < 3) return;
      var iesire = -1, parte = 0;
      for (var i = 0; i < l.length && l[i].t <= t.inchis; i++) { if (l[i].c < jos) { iesire = i; parte = -1; break; } if (l[i].c > sus) { iesire = i; parte = 1; break; } }
      var dirSemn = t.dir === "short" ? 1 : t.dir === "long" ? -1 : parte;   // direcția în care mișcarea strică botul
      // orele afară în viața botului (până la închidere), pentru grupele pe rezultat
      var afara = 0; l.forEach(function (x) { if (x.t <= t.inchis && (x.c < jos || x.c > sus)) afara++; });
      oreAfaraPe[t.id] = afara;
      var g = iesire < 0 ? "nu a ieșit" : afara < 6 ? "sub 6 h" : afara <= 24 ? "6–24 h" : "peste 24 h"; if (nr(t.pct) !== null) bucket[g].push(t.pct);
      if (iesire < 0) return;
      var afaraLa = function (j) { return parte < 0 ? l[j].c < jos : l[j].c > sus; };
      praguri.forEach(function (h) {
        var j = iesire + h; if (j >= l.length) return;
        for (var k = iesire; k <= j; k++) if (!afaraLa(k)) return;   // a stat afară continuu h ore
        var R = rez[h], sf = Math.min(l.length - 1, j + 24), intors = false;
        for (var q = j + 1; q <= sf; q++) if (l[q].c >= jos && l[q].c <= sus) { intors = true; break; }
        R.n++; if (intors) R.intoarse++;
        var mv = l[sf].c / l[j].c - 1; R.miscari.push(dirSemn > 0 ? -mv : mv);   // negativ = prețul a mers mai departe în direcția care strică botul
        if (nr(t.pct) !== null) R.net.push(t.pct);
      });
    });
    var tabel = praguri.map(function (h) { var R = rez[h]; return { h: h, n: R.n, intoarse: R.n ? R.intoarse / R.n : null, miscareImpotriva: R.miscari.length ? mediana(R.miscari) : null, netMedian: R.net.length ? mediana(R.net) : null }; });
    // regula: primul prag (cu cel puțin 30 de cazuri) după care mai puțin de 30 % dintre boți s-au întors în bandă în 24 h
    var regula = null; for (var i2 = 0; i2 < tabel.length; i2++) { var x = tabel[i2]; if (x.n >= (o.min || 30) && x.intoarse !== null && x.intoarse < (o.prag || 0.3)) { regula = x; break; } }
    var grupe = Object.keys(bucket).map(function (k) { return { grupa: k, n: bucket[k].length, netMedian: bucket[k].length ? mediana(bucket[k]) : null }; });
    return { tabel: tabel, regula: regula, grupe: grupe, oreAfaraPe: oreAfaraPe };
  }

  // ---------------- 3. gărzile ----------------
  // o = { factori (Factori.expunere), vol (Factori.tintaVol), pozitii: [{nume, pct}] (față de prețul mediu), stop (din MAE, ex. −0,08),
  //       boti: [{nume, oreAfara}], regulaOre, praguri: { sector, risc, vol } }
  function garzi(o) {
    o = o || {}; var p = Object.assign({ sector: 0.4, risc: 0.25, vol: 0.3 }, o.praguri || {}), out = [];
    var add = function (cod, ok, titlu, detaliu, sursa) { out.push({ cod: cod, ok: ok, titlu: titlu, detaliu: detaliu || "", sursa: sursa || "" }); };
    if (o.factori && o.factori.sectoare) {
      var s = o.factori.sectoare.filter(function (x) { return x.pestePrag || x.pondere > p.sector; })[0], ind = (o.factori.industrii || []).filter(function (x) { return x.pondere > p.sector; })[0];
      add("sector", !s && !ind, "Un sector / o industrie cel mult " + Math.round(p.sector * 100) + " % din acțiuni", s ? s.ro + ": " + Math.round(s.pondere * 100) + " % (" + s.pozitii.join(", ") + ")" : ind ? ind.nume + ": " + Math.round(ind.pondere * 100) + " %" : "", "concentrarea");
    }
    if (o.vol) {
      var c0 = (o.vol.contrib || [])[0];
      add("risc", !(c0 && c0.pondere > p.risc), "Nicio poziție peste " + Math.round(p.risc * 100) + " % din riscul contului", c0 && c0.pondere > p.risc ? c0.nume + ": " + Math.round(c0.pondere * 100) + " % din risc" : "", "contribuția la risc");
      add("vol", !(o.vol.volAnual > p.vol), "Contul se mișcă sub " + Math.round(p.vol * 100) + " % pe an", o.vol.volAnual > p.vol ? "acum " + Math.round(o.vol.volAnual * 100) + " % pe an" : "", "volatilitatea contului");
    }
    if (Array.isArray(o.pozitii) && o.stop !== null && o.stop !== undefined) {
      var sub = o.pozitii.filter(function (x) { return x && x.pct !== null && x.pct <= o.stop; });
      add("stop", !sub.length, "Nicio acțiune ținută sub stopul tău (" + (o.stop * 100).toFixed(0) + " % de la cumpărare)", sub.map(function (x) { return x.nume + " " + Math.round(x.pct * 100) + " %"; }).join(", "), o.stopDinMae ? "din MAE-ul tău" : "implicit −8 %");
    }
    if (Array.isArray(o.boti) && o.regulaOre) {
      var af = o.boti.filter(function (x) { return x && x.oreAfara >= o.regulaOre; });
      add("banda", !af.length, "Niciun bot afară din bandă de peste " + cate(o.regulaOre, "oră", "ore"), af.map(function (x) { return x.nume + " (" + cate(Math.round(x.oreAfara), "oră", "ore") + ")"; }).join(", "), "din boții tăi închiși");
    }
    return out;
  }

  // ---------------- 2. lecția săptămânii ----------------
  // deciziile închise în săptămână care au costat, fiecare cu regula încălcată; regula săptămânii = cea care a costat cel mai mult
  // o = { de, pana, trades: [{id, ticker, simbol, inchis, pornit, rezultat (lei), cost (lei), pct, mfe?}], boti: [{id, moneda, inchis, net (USDT), oreAfara}],
  //       usdLei, stop, regulaOre, verdicte: [{s, k, n, t}], teze: [{tk, t, orizont}] }
  var REGULI = {
    stop: "Ies la stopul meu, fără să aștept să-și revină",
    plus: "Când sunt pe plus cu peste 5 %, nu las trade-ul să se întoarcă pe minus (mut stopul la intrare)",
    poarta: "Nu cumpăr când Poarta zice „așteaptă” sau „nu”",
    banda: "Când botul stă afară din bandă peste pragul meu, îl închid sau mut banda",
    orizont: "Ies când trece orizontul pe care mi l-am scris la intrare"
  };
  function lectia(o) {
    o = o || {}; var dec = [], stop = nr(o.stop) !== null ? o.stop : -0.08;
    (o.trades || []).forEach(function (t) {
      if (!(t.inchis >= o.de && t.inchis < o.pana) || !(t.rezultat < 0)) return;
      var cost = -t.rezultat, motive = [];
      if (t.pct !== null && t.pct < stop) motive.push({ r: "stop", cost: (stop - t.pct) * (t.cost || 0), text: "a ieșit la " + Math.round(t.pct * 100) + " %, stopul tău e " + Math.round(stop * 100) + " %" });
      if (t.mfe !== null && t.mfe !== undefined && t.mfe >= 0.05) motive.push({ r: "plus", cost: cost, text: "a fost pe plus cu " + Math.round(t.mfe * 100) + " % înainte" });
      var v = (o.verdicte || []).filter(function (x) { return x.s === "poarta-t212" && x.k === t.ticker && x.t <= t.pornit && t.pornit - x.t < 3 * ZI; }).pop();
      if (v && v.n !== "cumpara") motive.push({ r: "poarta", cost: cost, text: "Poarta zicea „" + (v.n === "nu" ? "nu" : "așteaptă") + "” la cumpărare" });
      var tz = (o.teze || []).filter(function (x) { return x.tk === t.ticker && x.t <= t.inchis && x.orizont > 0; }).pop();
      if (tz && t.inchis - Math.max(t.pornit, tz.t) > tz.orizont * ZI) motive.push({ r: "orizont", cost: cost, text: "ai ținut-o peste orizontul tău de " + cate(tz.orizont, "zi", "zile") });
      if (motive.length) dec.push({ ce: (t.simbol || t.ticker), fel: "acțiune", cost: cost, motive: motive });
    });
    (o.boti || []).forEach(function (b) {
      if (!(b.inchis >= o.de && b.inchis < o.pana) || !(b.net < 0) || !o.usdLei) return;
      var cost = -b.net * o.usdLei;
      if (o.regulaOre && b.oreAfara >= o.regulaOre) dec.push({ ce: b.moneda + " (bot)", fel: "bot", cost: cost, motive: [{ r: "banda", cost: cost, text: "a stat " + cate(b.oreAfara, "oră", "ore") + " afară din bandă (pragul tău: " + o.regulaOre + " h)" }] });
    });
    dec.sort(function (a, b) { return b.cost - a.cost; });
    var pe = {}, nr2 = {}; dec.forEach(function (d) { d.motive.forEach(function (m) { pe[m.r] = (pe[m.r] || 0) + m.cost; nr2[m.r] = (nr2[m.r] || 0) + 1; }); });
    var cheie = Object.keys(pe).sort(function (a, b) { return pe[b] - pe[a]; })[0] || null;
    return { de: o.de, pana: o.pana, top: dec.slice(0, 3), toate: dec.length, costTotal: dec.reduce(function (s, d) { return s + d.cost; }, 0), incalcari: nr2,
      regula: cheie ? { cod: cheie, text: REGULI[cheie], cost: pe[cheie] } : null };
  }
  // verificarea regulii de săptămâna trecută pe săptămâna asta: de câte ori a fost încălcată
  function verifica(regulaVeche, lectiaNoua) {
    if (!regulaVeche || !lectiaNoua) return null;
    var n = lectiaNoua.incalcari && lectiaNoua.incalcari[regulaVeche.cod] || 0;
    return { cod: regulaVeche.cod, text: regulaVeche.text, incalcari: n, respectata: n === 0 };
  }

  // ---------------- 4. teza ----------------
  function curataTeza(t) {
    if (!t || typeof t !== "object") return null;
    var txt = function (s, n) { return String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n); };
    var o = { teza: txt(t.teza, 300), invalidare: txt(t.invalidare, 200), orizont: nr(t.orizont) };
    if (!(o.orizont > 0 && o.orizont <= 3650)) o.orizont = null;
    return o.teza || o.invalidare || o.orizont ? o : null;
  }

  return { PRAGURI_ORE: PRAGURI_ORE, REGULI: REGULI, iesiriBanda: iesiriBanda, garzi: garzi, lectia: lectia, verifica: verifica, curataTeza: curataTeza, cate: cate };
})();
