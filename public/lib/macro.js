// macro.js — regimul macro în Radar (global Macro, pur: Dashboard + citire + colector + probe în vm).
// 12.10.2026, direcția lui Marius „o aplicație și atât”: din pagina macro-dashboard a premarket_scanner se mută doar ce lipsea
// (el: „Alerta + scorul de regim macro”): scorul de regim cu pragurile și treptele paginii vechi (v193: VIX + dobânda pe 10 ani
// + dolarul + legătura BTC–S&P + frica crypto), histerezisul anti-zbatere, alerta la schimbarea REALĂ și alerta cu ~30 de minute
// înainte de evenimentele mari din SUA. Fără AI, fără watchlist × macro, fără Danger Score.
(function (global) {
  "use strict";

  const TREPTE = [
    { min: 4, cod: "riskon", text: "pofta de risc mare (risk-on)", stare: "bine", banda: 5 },
    { min: 1, cod: "inclinat", text: "înclinat spre risc", stare: "bine", banda: 4 },
    { min: -2, cod: "neutru", text: "neutru", stare: "info", banda: 3 },
    { min: -5, cod: "prudent", text: "prudent", stare: "atentie", banda: 2 },
    { min: -8, cod: "riskoff", text: "fuga de risc (risk-off)", stare: "rau", banda: 1 },
    { min: -Infinity, cod: "stres", text: "stres", stare: "rau", banda: 0 },
  ];
  const PARTIAL = { cod: "partial", text: "date parțiale", stare: "info", banda: null };
  const LUNA = 21, ZI = 86400000;

  const fin = (x) => typeof x === "number" && isFinite(x);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const nr = (v, z) => Math.abs(v).toFixed(z).replace(".", ",");
  const sg = (v, z) => (v >= 0 ? "+" : "−") + nr(v, z);
  const scS = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v);
  const cate = (n, sg1, pl) => (global.TextRo && global.TextRo.cate ? global.TextRo.cate(n, sg1, pl) : n + " " + (n === 1 ? sg1 : pl));

  // barele vin ca {time, close} (stiri / Pionex, uneori text) sau {t, c}; ies {t, c} crescător, doar închideri bune
  function bare(l) {
    return (Array.isArray(l) ? l : []).map((x) => ({ t: Number(x && (x.t != null ? x.t : x.time)), c: Number(x && (x.c != null ? x.c : x.close)) }))
      .filter((x) => fin(x.t) && fin(x.c) && x.c > 0).sort((a, b) => a.t - b.t);
  }
  const zi = (t) => new Date(t).toISOString().slice(0, 10);
  function legatura(spy, btc) {
    const m = new Map(btc.map((x) => [zi(x.t), x.c])), al = spy.filter((x) => m.has(zi(x.t))).map((x) => [x.c, m.get(zi(x.t))]).slice(-31);
    const a = [], b = []; for (let i = 1; i < al.length; i++) { a.push(al[i][0] / al[i - 1][0] - 1); b.push(al[i][1] / al[i - 1][1] - 1); }
    if (a.length < 10) return null;
    const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length;
    let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return da > 0 && db > 0 ? n / Math.sqrt(da * db) : null;
  }
  function treaptaDin(s) { for (const t of TREPTE) if (s >= t.min) return t; return TREPTE[TREPTE.length - 1]; }

  // d = { vix, tnx, dxy, spy, btc (bare), fg: {valoare} }
  function scor(d) {
    if (!d || typeof d !== "object") return null;
    const vixB = bare(d.vix), tnxB = bare(d.tnx), dxyB = bare(d.dxy), spyB = bare(d.spy), btcB = bare(d.btc), semne = [];
    const vix = vixB.length ? vixB[vixB.length - 1].c : null;
    semne.push(!fin(vix) ? { cod: "vix", ce: "VIX · frica bursei", ok: false, scor: 0, valoare: "—", text: "lipsește" }
      : Object.assign({ cod: "vix", ce: "VIX · frica bursei", ok: true, valoare: nr(vix, 1), v: vix }, vix < 12 ? { scor: 1, text: "liniște prea mare (atenție la întoarcere)" } : vix < 18 ? { scor: 2, text: "calm" } : vix < 25 ? { scor: -1, text: "prudență" } : vix < 30 ? { scor: -2, text: "frică" } : { scor: -3, text: "stres" }));
    const bp = tnxB.length > LUNA ? (tnxB[tnxB.length - 1].c - tnxB[tnxB.length - 1 - LUNA].c) * 100 : null;
    semne.push(!fin(bp) ? { cod: "dobanda", ce: "Dobânda SUA 10 ani", ok: false, scor: 0, valoare: "—", text: "lipsește" }
      : Object.assign({ cod: "dobanda", ce: "Dobânda SUA 10 ani", ok: true, valoare: sg(Math.round(bp), 0) + " pb într-o lună", v: bp }, bp < -25 ? { scor: -2, text: "scade tare (teamă de recesiune)" } : bp < -10 ? { scor: -1, text: "scade" } : bp > 25 ? { scor: -1, text: "urcă tare (dobânzi mai mari)" } : bp > 10 ? { scor: 0, text: "urcă puțin" } : { scor: 1, text: "stabilă" }));
    const dx = dxyB.length > LUNA ? (dxyB[dxyB.length - 1].c / dxyB[dxyB.length - 1 - LUNA].c - 1) * 100 : null;
    semne.push(!fin(dx) ? { cod: "dolar", ce: "Dolarul (DXY)", ok: false, scor: 0, valoare: "—", text: "lipsește" }
      : Object.assign({ cod: "dolar", ce: "Dolarul (DXY)", ok: true, valoare: sg(dx, 1) + "% într-o lună", v: dx }, dx > 1.5 ? { scor: -1, text: "în creștere (apasă pe risc)" } : dx < -1.5 ? { scor: 1, text: "în scădere (ajută riscul)" } : { scor: 0, text: "plat" }));
    const rho = spyB.length && btcB.length ? legatura(spyB, btcB) : null;
    semne.push(!fin(rho) ? { cod: "btcSp", ce: "BTC față de S&P", ok: false, scor: 0, valoare: "—", text: "lipsește" }
      : Object.assign({ cod: "btcSp", ce: "BTC față de S&P", ok: true, valoare: "legătura " + (rho < 0 ? "−" : "") + nr(rho, 2) + " pe 30 de zile", v: rho }, rho > 0.6 ? { scor: 1, text: "merg împreună (BTC = activ de risc)" } : rho > 0.2 ? { scor: 0, text: "parțial legate" } : rho > -0.2 ? { scor: -1, text: "decuplate" } : { scor: -2, text: "în sens opus" }));
    const fg = d.fg && fin(Number(d.fg.valoare)) ? Number(d.fg.valoare) : null;
    semne.push(fg === null ? { cod: "frica", ce: "Frica / lăcomia crypto", ok: false, scor: 0, valoare: "—", text: "lipsește" }
      : Object.assign({ cod: "frica", ce: "Frica / lăcomia crypto", ok: true, valoare: String(Math.round(fg)), v: fg }, fg > 70 ? { scor: 2, text: "lăcomie" } : fg > 55 ? { scor: 1, text: "spre lăcomie" } : fg >= 45 ? { scor: 0, text: "neutru" } : fg >= 30 ? { scor: -1, text: "spre frică" } : { scor: -2, text: "frică" }));
    const valide = semne.filter((x) => x.ok).length, s = semne.reduce((a, x) => a + x.scor, 0), partial = valide < 3;
    return { semne, scor: s, valide, partial, treapta: partial ? PARTIAL : treaptaDin(s) };
  }

  // histerezisul paginii vechi: o treaptă vecină cu |Δscor| < 2 față de regimul ținut minte NU comută
  function histerezis(vechi, r) {
    const t = r.treapta || treaptaDin(r.scor);
    if (!vechi || !vechi.cod) return { cod: t.cod, scor: r.scor, tinut: false, schimbat: false };
    if (vechi.cod === t.cod) return { cod: t.cod, scor: r.scor, tinut: false, schimbat: false };
    const bv = (TREPTE.find((x) => x.cod === vechi.cod) || {}).banda;
    if (fin(bv) && Math.abs(t.banda - bv) <= 1 && Math.abs(r.scor - vechi.scor) < 2) return { cod: vechi.cod, scor: vechi.scor, tinut: true, schimbat: false };
    return { cod: t.cod, scor: r.scor, tinut: false, schimbat: true };
  }
  const textTreapta = (cod) => ((TREPTE.find((x) => x.cod === cod) || {}).text || cod);
  const semneScurt = (r) => r.semne.filter((x) => x.ok).map((x) => ({ vix: "VIX ", dobanda: "dobânda ", dolar: "dolarul ", btcSp: "BTC–S&P ", frica: "frica crypto " }[x.cod] + x.text)).join(", ");
  function mesajRegim(vechiCod, r) {
    if (!r || r.partial || !vechiCod || vechiCod === r.treapta.cod) return null;
    return { nivel: r.treapta.stare === "bine" ? "info" : "atentie", titlu: "🛡 Regimul macro s-a schimbat",
      mesaj: "Din „" + textTreapta(vechiCod) + "” în „" + r.treapta.text + "” (scor " + scS(r.scor) + "): " + semneScurt(r) + ".\nContext pentru câți bani pui la risc, nu semnal de intrare." };
  }

  // v100.172 (revizia Opus): regimul ținut de colector (histerezis + confirmare, cel anunțat pe Discord) ⇒ cardul și rândul nu-l mai contrazic.
  // Aproape de prag (histerezisul îl ține) ⇒ se arată cel ținut, cu citirea de acum alături; schimbare reală încă neconfirmată ⇒ citirea de acum + nota.
  function fataDeTinut(r, tinut) {
    // v100.174: regimul ținut mai vechi de 2 ore (colectorul stă) nu mai contează
    if (!r || r.partial || !tinut || !tinut.cod || !TREPTE.some((x) => x.cod === tinut.cod) || tinut.cod === r.treapta.cod) return null;
    if (fin(tinut.la) && Date.now() - tinut.la > 2 * 3600000) return null;
    const h = histerezis({ cod: tinut.cod, scor: fin(tinut.scor) ? tinut.scor : r.scor }, r), t = TREPTE.find((x) => x.cod === tinut.cod);
    return h.tinut ? { tinut: true, t, scor: h.scor } : { tinut: false, t };
  }
  function textCitire(r, tinut) {
    const ce = "Regim macro", ft = fataDeTinut(r, tinut);
    if (!r) return { ce, stare: "atentie", text: "datele macro nu s-au putut citi (Yahoo / alternative.me sau rețeaua) — se reîncearcă singur" };
    const v = (c) => r.semne.find((x) => x.cod === c), p = [];
    if (v("vix").ok) p.push("VIX " + nr(v("vix").v, 1));
    if (v("dobanda").ok) p.push("dobânda " + sg(Math.round(v("dobanda").v), 0) + " pb/lună");
    if (v("dolar").ok) p.push("dolarul " + sg(v("dolar").v, 1) + "%/lună");
    if (v("btcSp").ok) p.push("BTC–S&P " + (v("btcSp").v < 0 ? "−" : "") + nr(v("btcSp").v, 2));
    if (v("frica").ok) p.push("frica crypto " + v("frica").valoare);
    if (r.partial) return { ce, stare: "info", text: "date parțiale (" + r.valide + " din 5 semne)" + (p.length ? " · " + p.join(" · ") : "") };
    if (ft && ft.tinut) return { ce, stare: ft.t.stare === "rau" ? "atentie" : ft.t.stare, text: ft.t.text + " (ținut; citirea de acum: " + r.treapta.text + ", scor " + scS(r.scor) + ") · " + p.join(" · ") };
    return { ce, stare: r.treapta.stare === "rau" ? "atentie" : r.treapta.stare, text: r.treapta.text + " (scor " + scS(r.scor) + ") · " + p.join(" · ") + (ft ? " · Discord: încă „" + ft.t.text + "” până se confirmă" : "") };
  }

  function htmlCard(r, tinut, laCitire) {
    // v100.224: ceasul „actualizat” și nota de colector oprit apar doar când pagina trimite ora citirii. Apelul cu două argumente, pe un regim vechi, rămâne neschimbat.
    // v100.225: „publicat” e ora din KV, doar cât regimul ținut e în 2 ore. Candidatul nu înlocuiește codul ținut.
    // v100.226: „publicat” e ora României (Europe/Bucharest). Cât Discord încă ține codul vechi, colectorul își spune candidatul doar dacă e altul decât citirea de acum.
    // v100.227: „actualizat” e același fus. Eticheta stă înaintea ceasurilor. Candidatul intră în fraza de pe Discord, nu într-un al doilea rând.
    const ceasRo = (t) => { try { return new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(t)); } catch (e) { return ""; } };
    const tinutProaspat = !!(tinut && fin(tinut.la) && Date.now() - tinut.la <= 2 * 3600000);
    const ora = fin(laCitire) ? ceasRo(laCitire) : "";
    const pub = tinutProaspat ? ceasRo(tinut.la) : "";
    const ceasuri = (ora || pub) ? " · ora României" + (ora ? " · actualizat " + esc(ora) : "") + (pub ? " · publicat " + esc(pub) : "") : "";
    const cap = '<div class="acCap"><h4>Regim macro</h4><span class="acSub">5 semne · scor de la −10 la +7' + ceasuri + '</span></div>';
    if (!r) return cap + '<p class="acMut">Aduc datele…</p>';
    const sc = (x) => '<span class="mcSc ' + (!x.ok ? "acMut" : x.scor > 0 ? "good" : x.scor < 0 ? "bad" : "acMut") + '">' + (x.ok ? scS(x.scor) : "—") + "</span>";
    const poz = Math.max(0, Math.min(100, ((r.scor + 10) / 17) * 100)).toFixed(1), ft = fataDeTinut(r, tinut);
    const cand = tinut && tinut.candidat;
    const candOk = !!(r && !r.partial && tinutProaspat && cand && TREPTE.some((x) => x.cod === cand.cod) && cand.cod !== tinut.cod);
    const discord = !!(ft && !ft.tinut);
    const asteapta = candOk && discord && cand.cod !== r.treapta.cod ? " Colectorul așteaptă „" + esc(textTreapta(cand.cod)) + "”." : "";
    const verdict = ft && ft.tinut
      ? '<p class="mcVerdict mc' + ft.t.stare + '"><b>' + esc(ft.t.text) + "</b> · ținut (citirea de acum: " + esc(r.treapta.text) + " (scor " + scS(r.scor) + "), prea aproape de prag ca să schimbe regimul)</p>"
      : '<p class="mcVerdict mc' + r.treapta.stare + '"><b>' + esc(r.treapta.text) + "</b> · scor " + scS(r.scor) + (r.partial ? " · doar " + r.valide + " din 5 semne" : "") + "</p>" +
        (ft ? '<p class="acEt">Pe Discord e încă „' + esc(ft.t.text) + "”: schimbarea se anunță după ce se confirmă la citirea următoare (cel mult o alertă la 3 ore)." + asteapta + "</p>" : "");
    const nota = laCitire !== undefined && tinut && fin(tinut.la) && Date.now() - tinut.la > 2 * 3600000
      ? '<p class="acEt">Colectorul n-a publicat regimul de curând. Asta e citirea de acum.</p>' : "";
    const conf = candOk && !discord
      ? '<p class="acEt">' + esc(textTreapta(cand.cod)) + " se confirmă la citirea următoare.</p>" : "";
    return cap + verdict +
      '<div class="mcBara"><span style="left:' + poz + '%"></span></div><div class="mcAx"><span>stres −10</span><span>neutru</span><span>+7 risk-on</span></div>' +
      r.semne.map((x) => '<div class="acTr mcTr"><b>' + esc(x.ce) + '<span class="acMut acTrSub">' + esc(x.valoare) + '</span></b><span class="mcTxt">' + esc(x.text) + "</span>" + sc(x) + "</div>").join("") +
      '<p class="acEt">Același scor ca în Macro Dashboard-ul vechi; context pentru câți bani pui la risc, nu semnal de intrare. Alertă pe Discord când regimul se schimbă de-adevăratelea și cu ~30 de minute înainte de evenimentele mari din SUA.</p>' + nota + conf;
  }

  // calendarul faireconomy (/api/stiri?action=calendar): SUA, impact mare, în următoarele `min` minute
  function evenimenteCurand(l, acum, min) {
    const pana = acum + (min || 35) * 60000;
    return (Array.isArray(l) ? l : []).filter((x) => x && x.country === "USD" && x.impact === "High").map((x) => ({ t: Date.parse(x.date), titlu: String(x.title || ""), prognoza: String(x.forecast || ""), anterior: String(x.previous || "") }))
      .filter((x) => fin(x.t) && x.t > acum && x.t <= pana).sort((a, b) => a.t - b.t);
  }
  function mesajEveniment(e, acum) {
    const min = Math.max(1, Math.round((e.t - acum) / 60000));
    let cand = ""; try { cand = new Intl.DateTimeFormat("ro-RO", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(e.t)); } catch (x) { cand = new Date(e.t).toISOString().slice(11, 16); }
    const v = (s) => s.replace(/(\d)\.(\d)/g, "$1,$2");
    return { nivel: "atentie", titlu: "⚠️ Eveniment mare în SUA: " + e.titlu,
      mesaj: "În " + cate(min, "minut", "minute") + ": " + e.titlu + " (" + cand + ")" + (e.prognoza ? " · prognoza " + v(e.prognoza) : "") + (e.anterior ? (e.prognoza ? ", anterior " : " · anterior ") + v(e.anterior) : "") +
        ". N-aș porni boți noi și n-aș cumpăra chiar acum: la anunț prețul poate sări în ambele direcții." };
  }

  global.Macro = { TREPTE, bare, scor, treaptaDin, histerezis, mesajRegim, textCitire, htmlCard, evenimenteCurand, mesajEveniment };
})(typeof window !== "undefined" ? window : globalThis);
