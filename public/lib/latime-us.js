// latime-us.js — lățimea pieței de acțiuni US în Radar (global LatimeUS, pur: pagină + probe în vm).
// 11.10.2026, direcția lui Marius „o aplicație și atât”: pagina market-breadth din premarket_scanner
// se mută în Radar. Datele le face în continuare robotul de pe GitHub (pages.yml, 12:20 / 22:20 UTC,
// luni–vineri; surse publice TraderMonty), deci merge și cu PC-ul oprit. Radarul doar CITEȘTE
// market-breadth/data/latest.json și arată: un rând în „Ce spune piața acum” și un bloc în pagina de acțiuni.
// Sugestiile Long / Early Reversal ale paginii vechi NU sunt aici: cer motorul de candidați, care nu se mută.
(function (global) {
  "use strict";
  const SURSA = "https://mferent80-source.github.io/premarket_scanner.html/market-breadth/data/latest.json";
  const ZI = 86400000;
  const VECHE_DUPA_ZILE = 4; // vineri → marți dimineața încă e „ultima zi de bursă”; peste 4 zile e veche

  const STANTE = {
    "RISK-ON": ["bine", "risk-on (piață largă, pe creștere)"],
    "CONSTRUCTIV": ["bine", "constructiv"],
    "MIXT / PRUDENTA SELECTIVA": ["info", "mixt / prudență selectivă"],
    "MIXT": ["info", "mixt"],
    "PRUDENTA / DEFENSIV": ["atentie", "prudență / defensiv"],
    "RISK-OFF": ["rau", "risk-off (păstrează capitalul)"],
  };
  const ZONE = { Strong: "puternic", Healthy: "sănătos", Neutral: "neutru", Weakening: "slăbire", Critical: "critic" };
  const SECTOARE = { XLE: "Energie", XLK: "Tehnologie", XLV: "Sănătate", XLF: "Financiar", XLI: "Industrie", XLY: "Consum ciclic", XLP: "Consum de bază", XLU: "Utilități", XLB: "Materiale", XLRE: "Imobiliare", XLC: "Comunicații" };
  const SCORURI = [["sp", "S&P 500"], ["uptrend", "Participare în trend"], ["ndx", "Nasdaq 100"], ["r2k", "Russell 2000"]];

  const nr = (x) => (typeof x === "number" && isFinite(x) ? x : null);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // jumătatea se rotunjește după valoarea absolută: −5,25 → −5,3
  const z1 = (x) => { x = nr(x); if (x === null) return "—"; const r = Math.round(Math.abs(x) * 10 + 1e-9) / 10; return (x < 0 && r > 0 ? "−" : "") + r.toFixed(1).replace(".", ","); };
  const diacritice = (s) => String(s || "")
    .replace(/\bridica\b/g, "ridică").replace(/\bProtejeaza\b/g, "Protejează").replace(/\bcastigurile\b/g, "câștigurile")
    .replace(/\bpozitii\b/g, "poziții").replace(/\bstranse\b/g, "strânse").replace(/\bfara\b/g, "fără").replace(/\basteapta\b/g, "așteaptă")
    .replace(/\bstabilizare\b/g, "stabilizare").replace(/\bExpunere\b/g, "Expunere");

  function cate(n, sg, pl) {
    if (global.TextRo && global.TextRo.cate) return global.TextRo.cate(n, sg, pl);
    const k = Math.round(n), r = Math.abs(k) % 100;
    return k === 1 ? "1 " + sg : k + (k >= 20 || (r >= 20 && r <= 99) || (k > 100 && r === 0) ? " de " : " ") + pl;
  }
  function ziua(data) {
    const t = Date.parse(data + "T12:00:00Z");
    if (!isFinite(t)) return data || "—";
    const d = new Date(t);
    const zile = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
    return zile[d.getUTCDay()] + ", " + String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0");
  }

  function normalizeaza(j, acum) {
    if (!j || typeof j !== "object" || !j.full || !j.full.engine) return null;
    const e = j.full.engine, d = e.data || {}, m = e.master || {};
    if (!d.sp || !m.stance) return null;
    const cheie = String(m.stance).trim().toUpperCase();
    const st = STANTE[cheie] || ["info", String(m.stance).toLowerCase()];
    const data = String(d.sp.data_date || "").slice(0, 10);
    const t = Date.parse(data + "T21:00:00Z");
    const scoruri = SCORURI.filter(([k]) => d[k]).map(([k, nume]) => ({
      cheie: k, nume, scor: nr(d[k].score), zonaCod: d[k].zone || "",
      zona: ZONE[d[k].zone] || String(d[k].zone || "—").toLowerCase(),
      expunere: String(d[k].exposure || "—").replace(/^[^(]*\(([^)]*)\)\s*$/, "$1"),
    }));
    const src = j.sources || {};
    const serie = (h, f) => (Array.isArray(h) ? h : []).map((x) => ({ d: String(x.date || ""), v: nr(x[f]) === null ? null : x[f] * 100 })).filter((x) => x.v !== null).slice(-60);
    const ideas = j.full.ideas || {};
    const idee = (l) => (Array.isArray(l) ? l : []).map((r) => ({ ticker: String(r.ticker || ""), sector: String(r.sector || ""), subMaxim: nr(r.pct_from_high), luna: nr(r.ret_1m), rezultate: r.earnings ? String(r.earnings).slice(0, 10) : "" })).filter((r) => r.ticker);
    return {
      data, ziua: ziua(data), vechi: !isFinite(t) || (acum - t) / ZI > VECHE_DUPA_ZILE,
      stare: st[0], stanta: st[1], actiune: diacritice(m.action),
      scoruri,
      serii: { uptrend: serie(src.uptrend && src.uptrend.history, "ratio"), sp200: serie(src.sp500 && src.sp500.history, "above200") },
      sectoare: (Array.isArray(ideas.rising_sectors) ? ideas.rising_sectors : []).map((x) => ({ etf: String(x), text: SECTOARE[x] ? SECTOARE[x] + " (" + x + ")" : String(x) })),
      early: idee(ideas.early_buy), contrarian: idee(ideas.contrarian),
    };
  }

  function textCitire(n, acum) {
    const ce = "Acțiuni US (lățimea pieței)";
    if (!n) return { ce, stare: "atentie", text: "datele lățimii US nu s-au putut citi (robotul de pe GitHub sau rețeaua) — pagina de acțiuni arată ultima stare știută", actiune: "latimeUsDeschide()", linkText: "lățimea US ›", vechi: true };
    const z = (k) => { const s = n.scoruri.find((x) => x.cheie === k); return s ? s.zona : "—"; };
    const sp = n.scoruri.find((x) => x.cheie === "sp");
    const sect = n.sectoare.length ? cate(n.sectoare.length, "sector", "sectoare") + " în creștere" : "niciun sector în creștere";
    const text = n.stanta + " · S&P " + z("sp") + ", Nasdaq " + z("ndx") + ", Russell " + z("r2k") + " · expunere " + (sp ? sp.expunere : "—") + " · " + sect + " · date de " + n.ziua;
    return { ce, stare: n.vechi ? "info" : n.stare, text, actiune: "latimeUsDeschide()", linkText: "lățimea US ›", vechi: n.vechi };
  }

  function grafic(n) {
    const W = 560, H = 120, p = 4;
    const pct = (vals) => vals.map((x, i) => (p + (i * (W - 2 * p)) / Math.max(1, vals.length - 1)).toFixed(1) + "," + (H - p - (Math.max(0, Math.min(100, x.v)) / 100) * (H - 2 * p)).toFixed(1)).join(" ");
    const u = n.serii.uptrend, s = n.serii.sp200;
    if (!u.length && !s.length) return "";
    const ult = (a) => (a.length ? z1(a[a.length - 1].v) + "%" : "—");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="luGrafic" role="img" aria-label="Participarea pe ultimele zile">' +
      '<line x1="0" y1="' + (H / 2) + '" x2="' + W + '" y2="' + (H / 2) + '" class="luMijloc"/>' +
      (u.length ? '<polyline class="luUp" points="' + pct(u) + '"/>' : "") + (s.length ? '<polyline class="luSp" points="' + pct(s) + '"/>' : "") + "</svg>" +
      '<p class="tbSub"><span class="luLegUp">━</span> acțiuni SUA în uptrend: ' + ult(u) + ' · <span class="luLegSp">━</span> S&amp;P peste MM200: ' + ult(s) + " · " + cate(Math.max(u.length, s.length), "zi", "zile") + " (linia din mijloc = 50%)</p>";
  }

  function tabel(titlu, lista) {
    if (!lista.length) return "";
    const randuri = lista.slice(0, 8).map((r) => "<tr><td><b>" + esc(r.ticker) + '</b></td><td class="luSector">' + esc(r.sector) + '</td><td class="num">' + z1(r.subMaxim) + '%</td><td class="num">' + z1(r.luna) + "%</td><td>" + esc(r.rezultate || "—") + "</td></tr>").join("");
    return '<div class="luTabel"><p class="tbSub"><b>' + esc(titlu) + "</b> · " + lista.length + '</p><table class="t212Tab luTab"><thead><tr><th>Acțiune</th><th class="luSector">Sector</th><th class="num">Sub maxim</th><th class="num">1 lună</th><th>Rezultate</th></tr></thead><tbody>' + randuri + "</tbody></table></div>";
  }

  function htmlBloc(n) {
    if (!n) return '<div class="tbBloc luBloc"><div class="tbBlocCap"><b>Lățimea pieței US</b></div><p class="tbSub">Datele nu s-au putut citi acum (robotul de pe GitHub sau rețeaua). Se reîncearcă singur; dacă rămâne așa o zi întreagă, robotul „Pages” din premarket_scanner nu mai rulează.</p></div>';
    const cartele = n.scoruri.map((s) => '<div class="luCartela"><div class="tbSub">' + esc(s.nume) + '</div><div class="luScor">' + z1(s.scor) + '</div><div class="luZona luZ' + esc(s.zonaCod) + '">' + esc(s.zona) + '</div><div class="tbSub">expunere ' + esc(s.expunere) + "</div></div>").join("");
    return '<div class="tbBloc luBloc' + (n.vechi ? " vechi" : "") + '"><div class="tbBlocCap"><b>Lățimea pieței US</b> <span class="tbSub">· calculată de robotul de pe GitHub după închiderea bursei · date de ' + esc(n.ziua) + (n.vechi ? " · VECHI" : "") + "</span></div>" +
      '<p class="luVerdict luS' + esc(n.stare) + '"><b>' + esc(n.stanta) + "</b>" + (n.actiune ? " — " + esc(n.actiune) : "") + "</p>" +
      '<div class="luCartele">' + cartele + "</div>" + grafic(n) +
      '<p class="tbSub">Sectoare cu participare în creștere: <b>' + (n.sectoare.length ? esc(n.sectoare.map((s) => s.text).join(", ")) : "niciunul") + "</b></p>" +
      tabel("Early Buy", n.early) + tabel("Contrarian", n.contrarian) +
      '<p class="tbSub luNota">Context, nu semnal de intrare. Sursa: TraderMonty (Uptrend Dashboard, Market Breadth Analysis), prin robotul „Pages” din premarket_scanner.</p></div>';
  }

  global.LatimeUS = { SURSA, VECHE_DUPA_ZILE, normalizeaza, textCitire, htmlBloc };
})(typeof window !== "undefined" ? window : globalThis);
