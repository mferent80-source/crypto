// sectoare.js — rotația sectoarelor US în Radar (global Sectoare, pur: pagină + colector + probe în vm).
// 12.10.2026, direcția lui Marius „o aplicație și atât”: pagina sector-rotation din premarket_scanner se mută în Radar
// ca BLOC în pagina Acțiuni (sub lățimea US), plus un rând în „Ce spune piața acum” și o alertă pe Discord doar când
// se schimbă regimul. Logica e a paginii vechi: Δ pe 1 / 5 / 21 / 63 de ședințe; forța față de S&P (RRG): RS-Ratio =
// raportul sector/SPY față de media lui pe 21 de ședințe, momentul = cât s-a schimbat RS-Ratio în 5 ședințe; regimul =
// media ciclicelor − media defensivelor pe o săptămână, prag ±0,6 pp; XLRE (dobânzi) în afara regimului.
// Fără AI, fără top companii, fără sunet (el: „ok” pe macheta din 12.10).
(function (global) {
  "use strict";

  const LISTA = [
    { s: "XLK", n: "Tehnologie", g: "ciclic" }, { s: "XLY", n: "Consum ciclic", g: "ciclic" }, { s: "XLC", n: "Comunicații", g: "ciclic" },
    { s: "XLF", n: "Financiar", g: "ciclic" }, { s: "XLI", n: "Industrie", g: "ciclic" }, { s: "XLB", n: "Materiale", g: "ciclic" },
    { s: "XLE", n: "Energie", g: "ciclic" }, { s: "XLRE", n: "Imobiliare", g: "dobanzi" },
    { s: "XLV", n: "Sănătate", g: "defensiv" }, { s: "XLP", n: "Consum de bază", g: "defensiv" }, { s: "XLU", n: "Utilități", g: "defensiv" },
  ];
  const RRG_LB = 21, RRG_MOM = 5, PRAG = 0.6;
  const REGIM = {
    on: { cod: "on", text: "spre ciclice (risk-on)", stare: "bine" },
    off: { cod: "off", text: "spre defensive (risk-off)", stare: "atentie" },
    neutru: { cod: "neutru", text: "neutră", stare: "info" },
  };
  const CADRAN = { cdL: "Conduce", cdW: "Slăbește", cdG: "În urmă", cdI: "Revine" };
  const CULORI = { cdL: "#3fb950", cdW: "#d29922", cdG: "#f85149", cdI: "#58a6ff" };

  const fin = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const pct = (v) => (fin(v) ? (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + "%" : "—");

  // ziua și ora din New York (bara zilnică Yahoo e pusă la 09:30 New York)
  function ny(t) {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t));
    const g = (k) => (p.find((x) => x.type === k) || {}).value;
    return { zi: g("year") + "-" + g("month") + "-" + g("day"), min: Number(g("hour")) * 60 + Number(g("minute")) };
  }
  // bara de azi intră doar după închiderea bursei (16:00 New York) — în ședință ar fi un preț de moment, nu o închidere
  function inchise(l, acum) {
    const a = (Array.isArray(l) ? l : []).filter((x) => x && fin(x.t) && fin(x.c) && x.c > 0);
    if (a.length && fin(acum)) { const u = ny(a[a.length - 1].t), n = ny(acum); if (u.zi === n.zi && n.min < 16 * 60) a.pop(); }
    return a;
  }
  const delta = (c, n) => (c.length > n && c[c.length - 1 - n] > 0 ? (c[c.length - 1] / c[c.length - 1 - n] - 1) * 100 : null);

  function forta(sc, spy) {
    const n = Math.min(sc.length, spy.length);
    if (n < RRG_LB + 4 * RRG_MOM) return null;
    const a = sc.slice(-n), b = spy.slice(-n), rs = a.map((x, i) => (b[i] > 0 ? x / b[i] : null));
    const ratio = (j) => {
      if (j < RRG_LB - 1 || rs[j] == null) return null;
      let s = 0, c = 0; for (let k = j - RRG_LB + 1; k <= j; k++) if (rs[k] != null) { s += rs[k]; c++; }
      return c && s > 0 ? (rs[j] / (s / c) - 1) * 100 : null;
    };
    const L = n - 1, x = ratio(L), p = ratio(L - RRG_MOM), coada = [];
    for (let t = 3; t >= 0; t--) { const j = L - t * RRG_MOM, rr = ratio(j), rp = ratio(j - RRG_MOM); if (rr != null && rp != null) coada.push({ x: rr, y: rr - rp }); }
    return x != null && p != null ? { x, y: x - p, coada } : null;
  }
  function cadranDin(f) {
    if (!f) return null;
    const cod = f.x >= 0 ? (f.y >= 0 ? "cdL" : "cdW") : (f.y < 0 ? "cdG" : "cdI");
    return { cod, text: CADRAN[cod] };
  }
  function regimDin(spread) { return spread > PRAG ? REGIM.on : spread < -PRAG ? REGIM.off : REGIM.neutru; }

  // serii = { SPY: [{t, c}], XLK: [...], ... } (de la /api/sectoare); acum = ms
  function calculeaza(serii, acum) {
    if (!serii || typeof serii !== "object") return null;
    const spy = inchise(serii.SPY, acum);
    if (spy.length < 2) return null;
    const cSpy = spy.map((x) => x.c), randuri = [], lipsa = [];
    for (const s of LISTA) {
      const l = inchise(serii[s.s], acum);
      if (l.length < 2) { lipsa.push(s.s); continue; }
      const c = l.map((x) => x.c), f = forta(c, cSpy);
      randuri.push({ s: s.s, n: s.n, g: s.g, z1: delta(c, 1), s1: delta(c, 5), l1: delta(c, 21), l3: delta(c, 63), x: f ? f.x : null, y: f ? f.y : null, coada: f ? f.coada : [], cadran: cadranDin(f) });
    }
    randuri.sort((a, b) => (fin(b.s1) ? b.s1 : -1e9) - (fin(a.s1) ? a.s1 : -1e9));
    const medie = (g) => { const v = randuri.filter((r) => r.g === g && fin(r.s1)).map((r) => r.s1); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const cyc = medie("ciclic"), def = medie("defensiv"), nG = (g) => LISTA.filter((x) => x.g === g).length;
    const partial = randuri.filter((r) => r.g === "ciclic" && fin(r.s1)).length < nG("ciclic") || randuri.filter((r) => r.g === "defensiv" && fin(r.s1)).length < nG("defensiv");
    const regim = cyc !== null && def !== null ? Object.assign({}, regimDin(cyc - def), { ciclice: cyc, defensive: def, spread: cyc - def, partial }) : null;
    let zi = ""; try { zi = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "America/New_York" }).format(new Date(spy[spy.length - 1].t)); } catch (e) { zi = ny(spy[spy.length - 1].t).zi; }
    return { zi, randuri, lipsa, regim, conduc: randuri.filter((r) => r.cadran && r.cadran.cod === "cdL").map((r) => r.n) };
  }

  const CE = "Sectoarele US";
  function textCitire(d) {
    if (!d || !d.regim) return { ce: CE, stare: "atentie", text: "datele sectoarelor nu s-au putut citi (Yahoo sau rețeaua) — se reîncearcă singur" };
    const r = d.regim;
    const text = "rotație " + r.text + " · ciclicele " + pct(r.ciclice) + ", defensivele " + pct(r.defensive) + " pe săptămână" +
      (d.conduc.length ? " · conduc " + d.conduc.slice(0, 3).join(", ") : "") + (r.partial ? " · parțial: lipsesc " + d.lipsa.join(", ") : "") + " · închiderea de " + d.zi;
    return { ce: CE, stare: r.partial ? "info" : r.stare, text };
  }

  function grafic(d) {
    const pts = d.randuri.filter((r) => fin(r.x) && fin(r.y));
    if (!pts.length) return "";
    const W = 560, H = 300, m = 26, M = Math.max(2, ...pts.flatMap((r) => (r.coada.length ? r.coada : [r]).flatMap((p) => [Math.abs(p.x), Math.abs(p.y) * 2]))) * 1.1;
    const X = (v) => (W / 2 + (v / M) * (W / 2 - m)).toFixed(1), Y = (v) => (H / 2 - ((v * 2) / M) * (H / 2 - m)).toFixed(1);
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="srRrg" role="img" aria-label="Rotația sectoarelor față de S&amp;P 500">' +
      '<rect x="' + W / 2 + '" y="0" width="' + W / 2 + '" height="' + H / 2 + '" class="srQ srQL"/><rect x="0" y="0" width="' + W / 2 + '" height="' + H / 2 + '" class="srQ srQI"/>' +
      '<rect x="0" y="' + H / 2 + '" width="' + W / 2 + '" height="' + H / 2 + '" class="srQ srQG"/><rect x="' + W / 2 + '" y="' + H / 2 + '" width="' + W / 2 + '" height="' + H / 2 + '" class="srQ srQW"/>' +
      '<line x1="' + W / 2 + '" y1="0" x2="' + W / 2 + '" y2="' + H + '" class="srAx"/><line x1="0" y1="' + H / 2 + '" x2="' + W + '" y2="' + H / 2 + '" class="srAx"/>' +
      '<text x="' + (W - 6) + '" y="14" class="srQt" text-anchor="end">conduce</text><text x="6" y="14" class="srQt">revine</text>' +
      '<text x="6" y="' + (H - 6) + '" class="srQt">în urmă</text><text x="' + (W - 6) + '" y="' + (H - 6) + '" class="srQt" text-anchor="end">slăbește</text>';
    for (const r of pts) {
      const c = CULORI[r.cadran ? r.cadran.cod : "cdG"];
      if (r.coada.length > 1) s += '<polyline points="' + r.coada.map((q) => X(q.x) + "," + Y(q.y)).join(" ") + '" fill="none" stroke="' + c + '" stroke-opacity=".3" stroke-width="1"/>';
      s += '<circle cx="' + X(r.x) + '" cy="' + Y(r.y) + '" r="4.5" fill="' + c + '"><title>' + esc(r.n) + ": " + esc(r.cadran ? r.cadran.text : "") + '</title></circle><text x="' + (Number(X(r.x)) + 7) + '" y="' + (Number(Y(r.y)) + 4) + '" class="srEt">' + esc(r.s) + "</text>";
    }
    return s + "</svg>";
  }

  function htmlBloc(d) {
    const cap = '<div class="tbBlocCap"><b>Rotația sectoarelor US</b>';
    if (!d || !d.regim) return '<div class="tbBloc srBloc">' + cap + '</div><p class="tbSub">Datele sectoarelor nu s-au putut citi acum (Yahoo sau rețeaua). Se reîncearcă singur.</p></div>';
    const r = d.regim, cls = (v) => (fin(v) ? (v >= 0 ? " bun" : " rau") : "");
    const tab = '<table class="t212Tab srTab"><thead><tr><th>Sector</th><th class="num">1 zi</th><th class="num">1 săpt.</th><th class="num">1 lună</th><th class="num">3 luni</th><th>Față de S&amp;P</th></tr></thead><tbody>' +
      d.randuri.map((x) => '<tr><td><b>' + esc(x.n) + '</b> <span class="tbSub">' + esc(x.s) + "</span></td>" + [x.z1, x.s1, x.l1, x.l3].map((v) => '<td class="num' + cls(v) + '">' + pct(v) + "</td>").join("") +
        "<td>" + (x.cadran ? '<span class="srCad ' + x.cadran.cod + '">' + x.cadran.text + "</span>" : "—") + "</td></tr>").join("") + "</tbody></table>";
    return '<div class="tbBloc srBloc">' + cap + ' <span class="tbSub">· cele 11 sectoare S&amp;P față de S&amp;P 500 · închiderea de ' + esc(d.zi) + "</span></div>" +
      '<p class="luVerdict luS' + (r.partial ? "info" : r.stare) + '"><b>Rotație ' + esc(r.text) + "</b> — ciclicele " + pct(r.ciclice) + " pe săptămână, defensivele " + pct(r.defensive) +
      (d.conduc.length ? " · conduc " + esc(d.conduc.slice(0, 3).join(", ")) : "") + (r.partial ? " · parțial: lipsesc " + esc(d.lipsa.join(", ")) : "") + "</p>" + grafic(d) + tab +
      '<p class="tbSub luNota">Context, nu semnal. Cadranul = forța sectorului față de S&amp;P pe ~1 lună (dreapta = mai tare) și cum s-a schimbat în ultima săptămână (sus = câștigă teren); linia = drumul din ultimele 4 săptămâni. Alertă pe Discord doar când rotația se schimbă (ciclice / defensive / neutră). Sursa: Yahoo, închiderile zilnice.</p></div>';
  }

  // alerta colectorului: doar la SCHIMBAREA regimului, pe date complete; prima citire (vechi = null) doar se ține minte
  function mesajSchimbare(vechi, d) {
    if (!d || !d.regim || d.regim.partial || !vechi || !REGIM[vechi] || vechi === d.regim.cod) return null;
    const r = d.regim;
    return { nivel: r.cod === "off" ? "atentie" : "info", titlu: "🔄 Rotația sectoarelor US s-a schimbat",
      mesaj: "Din „" + REGIM[vechi].text + "” în „" + r.text + "”: ciclicele " + pct(r.ciclice) + ", defensivele " + pct(r.defensive) + " pe săptămână" +
        (d.conduc.length ? " · conduc " + d.conduc.slice(0, 3).join(", ") : "") + " · închiderea de " + d.zi + ".\nContext pentru acțiuni, nu semnal de intrare." };
  }

  global.Sectoare = { LISTA, RRG_LB, RRG_MOM, PRAG, inchise, calculeaza, regimDin, textCitire, htmlBloc, mesajSchimbare };
})(typeof window !== "undefined" ? window : globalThis);
