// scor-zi.js — „Scorul zilei” din „Piața azi” (global ScorZi, pur: pagină + colector + probe în vm). v100.193, 14.10.2026.
// EL (cu poza monitorului): „ai spațiul ăsta gol, ia și umple cu market breadth, sectoare și sugestii de acțiuni plus scor de zi”,
// demo aprobat („e ok”). Scorul NU e un model: e SUMA unor fapte deja arătate în pagină, fiecare −1 / 0 / +1, toate la vedere,
// regulile scrise aici înainte de orice cifră. Neprobat ca semnal ⇒ intră în jurnalul verdictelor (sursele „scor-zi-actiuni” și
// „scor-zi-crypto”), judecat la 5 și 20 de zile ca regimul macro. O piesă fără date (sau cu date vechi) nu intră în sumă.
// Revizia (agent read-only, 14.10): regimul macro din treapta ȚINUTĂ (aceeași ca pe cartela Regim; „neutru” = 0); VIX doar informativ
// (e deja în scorul macro — nu se numără de două ori); Market Breadth Nasdaq 100 = DOAR lățimea (câte peste media de 50), fără date ⇒
// fără piesă; lățimea crypto necunoscută / fără monede ⇒ fără piesă; Trend 12 luni mai vechi de 4 zile ⇒ fără piesă; piesele
// informative nu intră nici în numărul de piese.
(function (global) {
  "use strict";
  const fin = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const z1 = (x) => (Math.round(Math.abs(x) * 10) / 10).toFixed(1).replace(".", ",");
  const ORA = 3600000, ZI = 86400000;
  const semn = (v) => (v > 0 ? "+" + v : v < 0 ? "−" + Math.abs(v) : "0");
  const TREAPTA = { riskon: [1, "pofta de risc mare"], inclinat: [1, "înclinat spre risc"], neutru: [0, "neutru"], prudent: [-1, "prudent"], riskoff: [-1, "fuga de risc"], stres: [-1, "stres"] };

  // verdictul unei linii din suma pieselor cu date (cod pentru jurnal + text)
  function verdict(s, n, aglomerat) {
    if (!n) return { cod: "faradate", text: "fără date" };
    if (s >= 3) return { cod: "pentru", text: "pentru" };
    if (s >= 1) return { cod: "usorpentru", text: "mixt, ușor pentru" };
    if (s === 0) return { cod: "neutru", text: "neutru" };
    if (s >= -2) return { cod: "usorcontra", text: aglomerat ? "urcă, dar aglomerat" : "mixt, ușor contra" };
    return { cod: "contra", text: aglomerat ? "urcă, dar foarte aglomerat" : "contra" };
  }
  function linie(piese, aglomerat) {
    const numarate = piese.filter((p) => !p.info), cu = numarate.filter((p) => p.v !== null), s = cu.reduce((a, p) => a + p.v, 0);
    return Object.assign({ scor: s, n: cu.length, max: numarate.length, piese }, verdict(s, cu.length, aglomerat));
  }
  const semnMacro = (m, cod) => (m && Array.isArray(m.semne) ? m.semne.find((x) => x.cod === cod && x.ok && fin(x.v)) : null);
  const lipsa = (ce, val, info) => ({ ce, val, v: null, info: !!info });

  // o = { macro: Macro.scor(...), macroTinut: { cod, scor } (regimul ținut, KV piata), ndx: Acasa.largimeNdx(...) ({ n, e50 }),
  //       trend: KV sugestii:trend12, mbUs: LatimeUS.extins(...), latime: KV latime ({ acum: { la, lat, regim } }), acum }
  function calc(o) {
    o = o || {};
    const acum = fin(o.acum) ? o.acum : Date.now(), m = o.macro;
    const A = [];
    // 1. regimul macro: treapta ȚINUTĂ (histerezisul cartelei Regim) dacă o avem, altfel cea de acum; riscul +1, neutru 0, prudent/fugă/stres −1
    // v100.196 (auditul sever, 🔵3): regimul ținut mai vechi de 2 h (colectorul stă) nu mai contează - același prag ca cartela Regim (macro.js)
    const tinutProaspat = o.macroTinut && (!fin(o.macroTinut.la) || acum - o.macroTinut.la <= 2 * ORA);
    const mt = o.macroTinut && TREAPTA[o.macroTinut.cod] && tinutProaspat ? o.macroTinut : m && !m.partial && m.treapta && TREAPTA[m.treapta.cod] ? { cod: m.treapta.cod, scor: m.scor } : null;
    A.push(mt ? { ce: "Regim macro", val: TREAPTA[mt.cod][1] + (fin(mt.scor) ? " (" + semn(mt.scor) + ")" : ""), v: TREAPTA[mt.cod][0] } : lipsa("Regim macro", "fără date"));
    // 2. trendul pieței: S&P 500 față de media pe 200 de zile (regimul robotului Trend 12 luni); peste 4 zile vechime ⇒ fără piesă
    const tr = o.trend, rg = tr && tr.regim, vechiTr = tr && tr.dataUltimei ? acum - Date.parse(tr.dataUltimei + "T21:00:00Z") > 4 * ZI : true;
    A.push(rg && typeof rg.peste === "boolean" && !vechiTr
      ? { ce: "S&P 500 față de media de 200", val: (rg.peste ? "peste" : "sub") + (fin(rg.inchidere) && fin(rg.sma200) ? " (" + Math.round(rg.inchidere) + " față de " + Math.round(rg.sma200) + ")" : ""), v: rg.peste ? 1 : -1 }
      : lipsa("S&P 500 față de media de 200", rg ? "date vechi" : "fără date"));
    // 3. VIX: doar informativ — e deja în scorul macro (aceeași treaptă ca pe cartela Regim)
    const vx = semnMacro(m, "vix");
    A.push(vx ? { ce: "VIX · frica bursei", val: z1(vx.v) + " · " + (vx.text || ""), v: 0, info: true, nota: "e deja în regimul macro" } : lipsa("VIX · frica bursei", "fără date", true));
    // 4. Market Breadth SUA: Master Score al robotului (TraderMonty); datele vechi nu intră
    const mb = o.mbUs;
    A.push(mb && fin(mb.masterScor) && !mb.vechi
      ? { ce: "Market Breadth SUA", val: String(mb.stanta || "").toUpperCase() + " (Master Score " + semn(mb.masterScor) + ")", v: mb.masterScor >= 1 ? 1 : mb.masterScor <= -1 ? -1 : 0 }
      : lipsa("Market Breadth SUA", mb && mb.vechi ? "date vechi" : "fără date"));
    // 5. Market Breadth Nasdaq 100: DOAR lățimea — câte acțiuni din indice sunt peste media de 50 de zile (≥ 60 % +1, < 40 % −1)
    // v100.196 (auditul sever, 🟡8): Master Score-ul de la piesa 4 conține deja lățimea Nasdaq 100 (S&P + NDX + R2K + Uptrend) ⇒ când el are date,
    // piesa NDX e doar informativă (ca VIX), altfel aceeași lățime dădea până la ±2 din ±4; fără el, NDX rămâne piesă. Mai veche de 30 h ⇒ fără piesă (🔵3)
    const nd = o.ndx, cota = nd && fin(nd.n) && nd.n > 0 && fin(nd.e50) ? nd.e50 / nd.n : null, vechiNd = nd && fin(nd.la) && acum - nd.la > 30 * ORA, mbNum = A[3].v !== null;
    A.push(cota !== null && !vechiNd ? Object.assign({ ce: "Market Breadth Nasdaq 100", val: nd.e50 + " din " + nd.n + " peste media de 50 · " + (cota >= 0.6 ? "largă" : cota < 0.4 ? "îngustă" : "mixtă"), v: mbNum ? 0 : cota >= 0.6 ? 1 : cota < 0.4 ? -1 : 0 }, mbNum ? { info: true, nota: "e deja în Master Score-ul de mai sus" } : {})
      : lipsa("Market Breadth Nasdaq 100", vechiNd ? "date vechi" : "fără date", mbNum));

    const C = [];
    const la = o.latime && o.latime.acum, lat = la && la.lat, proaspat = la && !la.eroare && fin(Number(la.la)) && acum - Number(la.la) <= 3 * ORA;
    const nVal = proaspat && lat && fin(lat.n) ? lat.n - (fin(lat.lipsa) ? lat.lipsa : 0) : 0;
    const cod = String((la && la.regim && la.regim.cod) || "");
    const stareLat = !la ? "fără date" : la.eroare ? "eroare la citire" : !proaspat ? "date vechi" : "fără date";
    // 1. Market Breadth crypto pe 150 perp-uri: regimul colectorului (LARG-SUS +1 / LARG-JOS −1 / altul 0); necunoscut sau fără monede ⇒ fără piesă
    C.push(proaspat && nVal > 0 && fin(lat.sus) && fin(lat.jos) && lat.sus + lat.jos > 0 && cod && cod !== "NECUNOSCUT"
      ? { ce: "Market Breadth crypto · 150 perp-uri", val: cod.replace("-", " ") + " (" + lat.sus + " sus, " + lat.jos + " jos)", v: cod === "LARG-SUS" ? 1 : cod === "LARG-JOS" ? -1 : 0 }
      : lipsa("Market Breadth crypto · 150 perp-uri", proaspat ? "regim necunoscut" : stareLat));
    // 2. frica / lăcomia: extremele contează contrar (≥ 75 aglomerat −1, ≤ 25 frică extremă +1)
    const fg = semnMacro(m, "frica");
    // v100.196 (🔵4): aceeași cifră intră și în regimul macro (linia Acțiuni), unde lăcomia = poftă de risc (+); aici e citită CONTRAR (aglomerat) - se spune
    C.push(fg ? { ce: "Frica / lăcomia crypto", val: String(Math.round(fg.v)) + (fg.v >= 75 ? " · lăcomie extremă" : fg.v <= 25 ? " · frică extremă" : fg.v >= 55 ? " · lăcomie moderată" : fg.v <= 45 ? " · frică moderată" : " · neutru"), v: fg.v >= 75 ? -1 : fg.v <= 25 ? 1 : 0, nota: "citită contrar: în regimul macro aceeași lăcomie e poftă de risc" }
      : lipsa("Frica / lăcomia crypto", "fără date"));
    // 3. legătura BTC – S&P: doar informativ, spune dacă BTC diversifică sau nu
    const rho = semnMacro(m, "btcSp");
    C.push(rho ? { ce: "BTC față de S&P", val: "legătura " + (rho.v < 0 ? "−" : "") + z1(rho.v) + (rho.v > 0.5 ? " · fără câștig de diversificare" : " · diversifică"), v: 0, info: true } : lipsa("BTC față de S&P", "fără date", true));
    // 4. conturile mari long (aglomerarea): ≥ 80 % −1, ≤ 20 % +1
    C.push(nVal > 0 && fin(lat.mariLong) ? { ce: "Conturile mari long", val: lat.mariLong + " din " + nVal, v: lat.mariLong / nVal >= 0.8 ? -1 : lat.mariLong / nVal <= 0.2 ? 1 : 0 } : lipsa("Conturile mari long", stareLat));
    // 5. funding extrem pe piață: ≥ 40 % din monede ⇒ −1
    C.push(nVal > 0 && fin(lat.fundExtrem) ? { ce: "Funding extrem", val: "pe " + lat.fundExtrem + " din " + nVal, v: lat.fundExtrem / nVal >= 0.4 ? -1 : 0 } : lipsa("Funding extrem", stareLat));
    return { actiuni: linie(A, false), crypto: linie(C, C[0].v === 1), la: acum };
  }

  // verdictele pentru jurnal: unul pe linie, pe SPY și pe BTC (cu prețul de atunci); doar cu cel puțin 3 piese numărate cu date
  function verdicte(r, pretSpy, pretBtc, acum) {
    const out = [];
    if (r && r.actiuni && r.actiuni.n >= 3 && pretSpy > 0) out.push({ s: "scor-zi-actiuni", k: "SPY_US_EQ", n: r.actiuni.cod, p: pretSpy, t: acum });
    if (r && r.crypto && r.crypto.n >= 3 && pretBtc > 0) out.push({ s: "scor-zi-crypto", k: "BTC_USDT_PERP", n: r.crypto.cod, p: pretBtc, t: acum });
    return out;
  }

  function htmlLinie(nume, l) {
    const max = Math.max(1, l.max), lat = Math.min(50, Math.abs(l.scor) / max * 50), cls = l.scor > 0 ? "good" : l.scor < 0 ? "bad" : "acMut";
    const bara = l.scor > 0 ? '<b class="szPlus" style="width:' + lat.toFixed(1) + '%"></b>' : l.scor < 0 ? '<b class="szMinus" style="width:' + lat.toFixed(1) + '%"></b>' : "";
    return '<div class="szRand"><b>' + esc(nume) + '</b><div class="szBara" role="img" aria-label="' + esc(nume + ": " + semn(l.scor) + " din ±" + l.max + ", " + l.text) + '"><i></i>' + bara + '</div><span><b class="' + cls + ' szVal">' + (l.n ? semn(l.scor) : "—") + '</b> <span class="acSub">' + esc(l.text) + " · din ±" + l.max + (l.n < l.max ? " · " + l.n + " din " + l.max + " piese cu date" : "") + '</span></span></div>'
      + l.piese.map((p) => '<div class="szPiesa"><span>' + esc(p.ce) + ' · ' + esc(p.val) + (p.info ? " (doar informativ" + (p.nota ? ": " + esc(p.nota) : "") + ")" : p.nota ? " (" + esc(p.nota) + ")" : "") + '</span><span class="szChip ' + (p.v === null ? "szLipsa" : p.info ? "sz0" : p.v > 0 ? "szP" : p.v < 0 ? "szN" : "sz0") + '">' + (p.v === null ? "—" : p.info ? "i" : semn(p.v)) + '</span></div>').join("");
  }
  function html(r) {
    if (!r) return '<div class="acCap"><h4>Scorul zilei</h4></div><p class="acMut">Aștept datele pieței…</p>';
    return '<div class="acCap"><h4>Scorul zilei</h4><span class="acSub">suma faptelor din pagină · fiecare −1 / 0 / +1</span></div>'
      + htmlLinie("Acțiuni", r.actiuni) + '<div style="height:8px"></div>' + htmlLinie("Crypto", r.crypto)
      + '<p class="acEt">Fiecare piesă e la vedere; scorul doar le adună. Neprobat ca semnal: e contextul zilei, nu un buton. Jurnalul verdictelor îl ia o dată pe zi, după 9:00 (pe închiderea de ieri), și îl judecă la 5 și 20 de zile — la 5 zile abia după ~1 an (verdictele care nu se suprapun), la 20 de zile după ~5 ani. Până atunci e un rezumat, nu un semnal.</p>';
  }

  global.ScorZi = { calc, verdicte, html, verdict };
})(typeof window !== "undefined" ? window : globalThis);
