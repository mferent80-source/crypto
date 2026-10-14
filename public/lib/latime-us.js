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
    const idee = (l) => (Array.isArray(l) ? l : []).filter(Boolean).map((r) => ({ ticker: String(r.ticker || ""), sector: String(r.sector || ""), subMaxim: nr(r.pct_from_high), luna: nr(r.ret_1m), rezultate: r.earnings ? String(r.earnings).slice(0, 10) : "" })).filter((r) => r.ticker);
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

  // v100.193 (14.10, el: „vreau să pui EXPLICIT care e market breadth, cu nume” + „sugestii din market breadth nu pui?”): tot ce dă
  // robotul, cu numele lui, pentru cardurile din „Piața azi”: Master Score, cele 4 surse (scor, zonă, expunere, „cel mai slab”),
  // scorecard-ul, indicatorii S&P 500, Uptrend Ratio (piață + sectoare), maxime/minime și cele trei liste de idei. normalizeaza rămâne.
  const ZONA_EN = { Strong: "Strong", Healthy: "Healthy", Neutral: "Neutral", Weakening: "Weakening", Critical: "Critical" };
  const NUME_SURSA = { sp: "S&P 500 Breadth Index", uptrend: "Uptrend Ratio", ndx: "Nasdaq 100 Breadth", r2k: "Russell 2000 Breadth" };
  const SEC_EN = { "Information Technology": "Technology", "Consumer Discretionary": "Cons. Discretionary", "Communication Services": "Communication", "Consumer Defensive": "Cons. Defensive", "Consumer Cyclical": "Cons. Cyclical", "Financial Services": "Financials" };
  const scurt = (s) => SEC_EN[s] || String(s || "");
  // textele robotului vin fără diacritice și cu punct zecimal ⇒ româna paginii (doar formulările cunoscute; restul trece prin diacritice)
  function roMb(s) {
    s = String(s || "");
    let m = /^8MA ([\d.]+) < ([\d.]+) \(piata selectiva\)\. Istoric: randamente forward PESTE medie \(\+?(\d+)pp\/60z\) dar drawdown mai mare\.?$/.exec(s);
    if (m) return "Breadth 8MA " + z1(+m[1] * 100) + "%: piață selectivă. Istoric: randamente pe 60 de zile peste medie (+" + m[3] + " pp), dar cu căderi mai mari.";
    return diacritice(s).replace(/\bracire\b/g, "răcire").replace(/\bpiata\b/g, "piața").replace(/\bselectiva\b/g, "selectivă").replace(/^Mixt\b/, "mixt")
      .replace(/\(idx ([\d.]+), min ([\d.]+)\)/, (_, a, b) => "· media " + z1(+a).replace(/,0$/, "") + ", minimul " + z1(+b).replace(/,0$/, ""))
      .replace(/^max (\d+) dist\.days, (\d+)\/(\d+) sub MM50$/, "până la $1 zile de distribuție · $2 din $3 indici sub MM50")
      .replace(/^(\d+)▲\/(\d+)▼ \(net ([+−-]?\d+)\), (\w+)$/, "$1 maxime ▲ / $2 minime ▼ · net $3 · $4")
      .replace(/^Market Breadth \(Overall\)/, "Market Breadth Overall").replace(/^momentum MM50 \(([\d.]+)%\)$/, (_, a) => "momentum peste MM50 (" + z1(+a).replace(/,0$/, "") + "%)");
  }
  function numeSc(s) {
    const m = /^(.*?) \(([^)]*)\)$/.exec(String(s || ""));
    const ce = m ? m[1] : String(s || ""), sub = m ? m[2] : "";
    const C = { "Market timing": "Market Timing · Distribution Days", "New Highs - New Lows": "New Highs − New Lows" };
    return { ce: ce === "Market timing" && /distribution/i.test(sub) ? C["Market timing"] : C[ce] || ce, sub: /distribution/i.test(sub) ? "" : sub.replace(/\bsurse valide\b/, "surse valide") };
  }
  function extins(j, acum) {
    const n = normalizeaza(j, acum);
    if (!n) return null;
    const e = j.full.engine, d = e.data || {}, m = e.master || {}, src = j.sources || {}, ide = j.full.ideas || {};
    const sp = (src.sp500 && src.sp500.latest) || {}, up = (src.uptrend && src.uptrend.market) || {};
    const idee = (r) => ({ ticker: String(r.ticker || "").slice(0, 8), sector: scurt(r.sector), rs: nr(r.rs_score) !== null ? r.rs_score : nr(r.rs_6m), r3: nr(r.ret_3m), luna: nr(r.ret_1m),
      subMaxim: nr(r.pct_from_high), pesteMinim: nr(r.off_low), vcp: r.vcp === true, zileRap: nr(r.days_to_earnings),
      rapAproape: r.earnings_warn === true || (nr(r.days_to_earnings) !== null && r.days_to_earnings <= 7 && r.days_to_earnings >= 0) });
    return Object.assign(n, {
      masterScor: nr(m.score), incredere: String(m.confidence || "").split(" - ")[0].toLowerCase(), plafon: nr(m.net_ceiling),
      surse: SCORURI.filter(([k]) => d[k]).map(([k]) => ({ cheie: k, nume: NUME_SURSA[k], scor: nr(d[k].score), zona: ZONA_EN[d[k].zone] || String(d[k].zone || "—"), zonaCod: d[k].zone || "",
        expunere: String(d[k].exposure || "—").replace(/^[^(]*\(([^)]*)\)\s*$/, "$1"), slab: roMb(String(d[k].weakest || "")), extra: String(d[k].extra || "").replace(/>MM/g, "peste MM").replace(/(\d)\.(\d)/g, "$1,$2").replace(/ \| /g, " · ").replace(/^momentum\(8\/200MA\) (\d+)/, "momentum 8/200 = $1").replace(/\b(\d+) warning-uri\b/, "$1 avertismente") })),
      scorecard: (Array.isArray(m.scorecard) ? m.scorecard : []).filter(Array.isArray).map((x) => { const ns = numeSc(x[0]); return { ce: ns.ce, v: nr(x[1]), text: (ns.sub ? ns.sub + " · " : "") + roMb(String(x[2] || "")) }; }),
      sp500: { peste200: nr(sp.above200), peste50: nr(sp.above50), ma8: nr(sp.ma8), ma200: nr(sp.ma200), bearish: sp.bearish === true, data: String(sp.date || "") },
      uptrend: { ratio: nr(up.ratio), ma10: nr(up.ma10), trend: up.trend === "up" ? "urcă" : up.trend === "down" ? "scade" : "", n: nr(up.count), total: nr(up.total),
        sectoare: (src.uptrend && Array.isArray(src.uptrend.sectors) ? src.uptrend.sectors : []).filter(Boolean).map((s) => ({ nume: scurt(s.name), ratio: nr(s.ratio), sus: s.trend === "up" })).filter((s) => s.ratio !== null) },
      nhnl: ide.nh_nl ? { maxime: nr(ide.nh_nl.new_highs), minime: nr(ide.nh_nl.new_lows), net: nr(ide.nh_nl.net) } : null,
      steaguri: (e.analysis && Array.isArray(e.analysis.flags) ? e.analysis.flags : []).filter(Array.isArray).map((f) => roMb(String((f && f[1]) || "").replace(/^ⓘ\s*/, ""))).filter(Boolean),
      ideiZi: String(ide.asOf || ""), acoperire: String(ide.coverage || ""),
      lideri: (Array.isArray(ide.sectors) ? ide.sectors : []).filter((s) => s && s.rising && Array.isArray(s.ideas) && s.ideas.length).map((s) => ({ sector: scurt(s.sector), etf: String(s.etf || ""), rs3: nr(s.rs_3m), idei: s.ideas.filter(Boolean).map(idee) })),
      earlyX: (Array.isArray(ide.early_buy) ? ide.early_buy : []).filter(Boolean).map(idee), contrarianX: (Array.isArray(ide.contrarian) ? ide.contrarian : []).filter(Boolean).map(idee),
      avertisment: "Screening / listă de urmărit, NU recomandare: validezi tu intrarea, stopul și contextul.",
    });
  }
  const pc1 = (f) => (nr(f) === null ? "—" : z1(f * 100) + "%");
  const sg1 = (v) => (nr(v) === null ? "—" : (v > 0 ? "+" : "") + z1(v) + "%");
  const chipZona = (z) => '<span class="mbZona mbZ' + esc(z) + '">' + esc(z) + "</span>";
  const bara = (et, f, cul) => '<div class="acLb mbLb"><span>' + et + '</span><i><b class="' + (cul || "") + '" style="width:' + (nr(f) === null ? 0 : Math.max(0, Math.min(100, f * 100))).toFixed(1) + '%"></b></i><em>' + pc1(f) + "</em></div>";
  const semnS = (v) => (v === null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v));
  function htmlCard(x) {
    if (!x) return '<div class="acCap"><h4>Market Breadth · SUA</h4><span class="acSub">lățimea pieței</span></div><p class="acMut">Aștept datele robotului market-breadth (GitHub)…</p>';
    const ms = x.masterScor, mcls = ms === null ? "acMut" : ms > 0 ? "good" : ms < 0 ? "bad" : "acMut";
    let h = '<div class="acCap"><h4>Market Breadth · SUA</h4><span class="acSub">lățimea pieței · închiderea de ' + esc(x.ziua) + (x.vechi ? " · VECHI" : "") + "</span></div>"
      + '<div class="mbVerd"><b class="mbS' + esc(x.stare) + '">' + esc(String(x.stanta || "").toUpperCase()) + '</b><span class="acSub">Master Score <b class="' + mcls + '">' + semnS(ms) + "</b>"
      + (x.incredere ? " · încredere " + esc(x.incredere) : "") + (x.plafon !== null ? " · expunere maximă " + x.plafon + "%" : "") + "</span></div>"
      + (x.actiune ? '<p class="acEt mbCitat">„' + esc(x.actiune) + "”</p>" : "");
    h += '<h5 class="mbH">Cele 4 surse · scor 0–100</h5>' + x.surse.map((s) => '<div class="mbSursa"><span><b>' + esc(s.nume) + "</b>"
      + (s.cheie === "uptrend" && x.uptrend.total ? ' <span class="acMut">· ' + esc(cate(x.uptrend.total, "acțiune", "acțiuni")) + "</span>" : "")
      + (s.slab ? '<span class="mbMic">cel mai slab: ' + esc(s.slab) + "</span>" : "") + '</span><b class="mbScor">' + z1(s.scor) + "</b>" + chipZona(s.zona)
      + '<span class="acMut">expunere ' + esc(s.expunere) + (s.extra ? " · " + esc(s.extra) : "") + "</span></div>").join("");
    if (x.scorecard.length) h += '<h5 class="mbH">Scorecard</h5>' + x.scorecard.map((c) => '<div class="mbSc"><b>' + esc(c.ce) + '</b><span class="szChip ' + (c.v > 0 ? "szP" : c.v < 0 ? "szN" : "sz0") + '">' + semnS(c.v) + '</span><span class="acMut">' + esc(c.text) + "</span></div>").join("");
    const s5 = x.sp500, u = x.uptrend;
    h += '<h5 class="mbH">Indicatorii S&amp;P 500</h5>' + bara("% peste MM200", s5.peste200, s5.peste200 !== null && s5.peste200 < 0.6 ? "w" : "")
      + bara("% peste MM50", s5.peste50, s5.peste50 !== null && s5.peste50 < 0.5 ? "w" : "")
      + (s5.ma8 !== null && s5.ma200 !== null ? '<div class="acLin"><span>Breadth 8MA față de 200MA</span><b>' + pc1(s5.ma8) + " / " + pc1(s5.ma200) + "</b></div>" : "")
      + '<div class="acLin"><span>Bearish Signal (8MA sub 200MA)</span><b class="' + (s5.bearish ? "bad" : "good") + '">' + (s5.bearish ? "activ" : "inactiv") + "</b></div>"
      + (u.ratio !== null ? bara("Uptrend Ratio · în trend sus", u.ratio, "") + '<div class="acLin"><span>Uptrend Ratio · media pe 10 zile ' + pc1(u.ma10) + '</span><b class="' + (u.trend === "urcă" ? "good" : u.trend === "scade" ? "bad" : "") + '">' + esc(u.trend || "—") + "</b></div>" : "")
      + (x.nhnl && x.nhnl.maxime !== null && x.nhnl.minime !== null ? '<div class="acLin"><span>New Highs − New Lows · 52 de săptămâni</span><b>' + x.nhnl.maxime + " ▲ / " + x.nhnl.minime + " ▼ · net " + (x.nhnl.maxime - x.nhnl.minime > 0 ? "+" : "") + (x.nhnl.maxime - x.nhnl.minime) + "</b></div>" : "");
    if (u.sectoare.length) h += '<h5 class="mbH">Uptrend Ratio pe sectoare</h5><div class="mbSect">' + u.sectoare.map((s) => "<span>" + esc(s.nume) + ' <b class="' + (s.sus ? "" : "bad") + '">' + pc1(s.ratio) + " " + (s.sus ? "↑" : "↓") + "</b></span>").join("") + "</div>";
    h += x.steaguri.map((f) => '<p class="acEt">ⓘ ' + esc(f) + "</p>").join("")
      + '<p class="acEt">Context, nu semnal de intrare. Surse: TraderMonty Market Breadth Analysis + Uptrend Dashboard, prin robotul market-breadth (GitHub, după închiderea bursei).</p>';
    return h;
  }
  const btnSim = (s) => '<button type="button" class="acSym" data-action-click="sugLaPoarta(&#39;' + esc(String(s).replace(/[^A-Za-z0-9.-]/g, "")) + '&#39;)">' + esc(s) + "</button>";
  const rap = (r) => (r.zileRap === null ? '<span class="acMut mbRap">raport. —</span>' : r.rapAproape ? '<span class="szChip szN mbRap">raport. ' + r.zileRap + "z</span>" : '<span class="acMut mbRap">raport. ' + r.zileRap + "z</span>");
  const deLaMax = (r) => (r.subMaxim === null ? "" : r.subMaxim >= -0.05 ? "la maxim" : "la " + z1(-r.subMaxim) + "% de maxim");
  const vcp = (r) => (r.vcp ? ' <span class="szChip sz0">VCP</span>' : "");
  function htmlSugestii(x) {
    if (!x) return '<div class="acCap"><h4>Sugestii din Market Breadth</h4></div><p class="acMut">Aștept datele robotului market-breadth (GitHub)…</p>';
    let h = '<div class="acCap"><h4>Sugestii din Market Breadth</h4><span class="acSub">S&amp;P 500 · acoperire ' + esc(x.acoperire) + " · EOD " + esc(ziua(x.ideiZi)) + "</span></div>";
    h += '<h5 class="mbH">1 · Liderii din sectoarele care urcă <span class="mbHsub">· ' + esc(cate(x.lideri.length, "sector urcă", "sectoare urcă"))
      + (x.lideri.length ? ": " + esc(x.lideri.map((s) => s.sector + " (" + s.etf + ") " + sg1(s.rs3)).join(" · ")) + " față de S&amp;P pe 3 luni" : "") + "</span></h5>";
    // pe monitor: 3 lideri pe sector, 5 early buy, 5 contrarian; pe telefon (demo): 1 pe sector, 2 early buy, 1 contrarian — restul pe un rând „încă N”
    const inca = (l, pc, tel) => (l.length > pc ? '<p class="acEt mbIncaPc">încă ' + (l.length - pc) + ": " + esc(l.slice(pc).join(", ")) + "</p>" : "")
      + (l.length > tel ? '<p class="acEt mbIncaTel">încă ' + (l.length - tel) + ": " + esc(l.slice(tel).join(", ")) + "</p>" : "");
    const restPc = [], restTel = [];
    x.lideri.forEach((s) => {
      s.idei.slice(0, 3).forEach((r, i) => { h += '<div class="mbRand' + (i >= 1 ? " mbPeste" : "") + '">' + btnSim(r.ticker) + "<span>" + esc(s.sector) + " · RS " + z1(r.rs) + " · " + esc(deLaMax(r)) + vcp(r) + '</span><b class="good mbNum">3 luni ' + sg1(r.r3) + "</b>" + rap(r) + "</div>"; });
      s.idei.slice(3).forEach((r) => restPc.push(r.ticker)); s.idei.slice(1).forEach((r) => restTel.push(r.ticker));
    });
    if (restPc.length) h += '<p class="acEt mbIncaPc">încă ' + restPc.length + ": " + esc(restPc.join(", ")) + "</p>";
    if (restTel.length) h += '<p class="acEt mbIncaTel">încă ' + restTel.length + ": " + esc(restTel.join(", ")) + "</p>";
    const lista = (titlu, sub, l, f, tel) => '<h5 class="mbH">' + titlu + ' <span class="mbHsub">' + sub + " (" + l.length + ")</span></h5>"
      + l.slice(0, 5).map((r, i) => f(r).replace('<div class="mbRand">', '<div class="mbRand' + (i >= tel ? " mbPeste" : "") + '">')).join("") + inca(l.map((r) => r.ticker), 5, tel);
    h += lista("2 · Early buy", "· tari pe 6 luni, trase înapoi de la maxim", x.earlyX, (r) => '<div class="mbRand">' + btnSim(r.ticker) + "<span>" + esc(r.sector) + " · RS 6 luni " + z1(r.rs) + vcp(r) + '</span><b class="bad mbNum">' + z1(r.subMaxim) + "% de la maxim</b>" + rap(r) + "</div>", 2);
    h += lista("3 · Contrarian", '<span class="warn">· risc mare, contra trendului</span>', x.contrarianX, (r) => '<div class="mbRand">' + btnSim(r.ticker) + "<span>" + esc(r.sector) + " · +" + z1(r.pesteMinim) + "% peste minim" + vcp(r) + '</span><b class="bad mbNum">' + z1(r.subMaxim) + "% de la maxim</b>" + rap(r) + "</div>", 1);
    h += '<p class="acEt">' + esc(x.avertisment) + " Datele de raportare vin de la furnizor, neconfirmate." + (x.stare === "atentie" || x.stare === "rau" ? " Cu Market Breadth pe " + esc(String(x.stanta).toUpperCase()) + ", robotul spune „doar setup-uri A+”." : "") + " Apasă simbolul: Poarta T212.</p>";
    return h;
  }

  global.LatimeUS = { SURSA, VECHE_DUPA_ZILE, normalizeaza, textCitire, htmlBloc, extins, htmlCard, htmlSugestii };
})(typeof window !== "undefined" ? window : globalThis);
