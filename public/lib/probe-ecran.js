// Pagina „Probe” (v100.312; el, 07.11.2026: „fă tot, dar poți pune tot ce am făcut azi pe o pagină separată?” ⇒ „Amândouă”).
// Tot ce e ÎN PROBĂ pe date noi, într-un singur loc:
//   - unde e fiecare probă (de când, câte s-au judecat, cum stă fără verdict, privirile fixate dinainte), cu drumul până la privire;
//   - listele „📉 după o cădere mare” și „🎯 direcția pe 7 zile”, mutate din Sugestii cu același motor (listă + fișă + grafic: sugestii-ecran.js,
//     vederea „probe”), deci nimic pierdut la mutare;
//   - caietul de păreri judecate (I-843): o părere scrisă (a lui sau a lui Claude) cu șansa „mai sus peste N zile”, notată la ora ei și judecată
//     singură de colector la termen (scripts/lib/tura-pareri.mjs), cu scorul pe autor față de „50% la fiecare” (public/lib/caiet.js).
// Formularul caietului stă ÎN AFARA zonei redesenate (index.html, #prCaietForm): ce tastează nu se pierde la o reîmprospătare.
var prStare = { la: 0, inLucru: false, trimit: false, mesaj: "", mesajC: "" };
var PR_ZI = 86400000;
function prZi(z) { return typeof sugCadZi === "function" ? sugCadZi(z) : String(z || "—"); }
function prT(z) { var t = Date.parse(String(z || "") + "T00:00:00Z"); return isFinite(t) ? t : null; }
function prOra(t) { if (!(t > 0)) return "—"; try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(t)).replace(",", ""); } catch (e) { return "—"; } }
function prAbil(v) { return v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; }
function prPret(v) { return typeof sugPandaPret === "function" ? sugPandaPret(v) : String(v); }

// drumul unei probe: de la start la ultima privire fixată (sau, fără dată, până la pragul ei de număr), cu azi și privirile pe el. SVG întreg:
// alinierea pe loc înlocuiește un <svg> care diferă (sugOpac), deci lățimea umplerii nu rămâne cea de la primul desen
function prDrumSvg(f, priv, eticheta) {
  f = Math.max(0, Math.min(1, Number(f) || 0));
  var x = Math.max(f * 100, f > 0 ? 1.5 : 0).toFixed(1);
  return '<svg class="prDrumSvg" viewBox="0 0 100 12" preserveAspectRatio="none" role="img" aria-label="' + sugEsc(eticheta) + '"><rect class="prDrumFond" x="0" y="4" width="100" height="4"></rect><rect class="prDrumPlin" x="0" y="4" width="' + x + '" height="4"></rect>'
    + (priv || []).map(function (p) { return '<line class="prDrumPriv" x1="' + (p * 100).toFixed(1) + '" x2="' + (p * 100).toFixed(1) + '" y1="0" y2="12"></line>'; }).join("") + '</svg>';
}
function prPeDate(start, priviri, acum, nume) {
  var t0 = prT(start), L = priviri.map(function (p) { return prT(p[0]); }), tf = L[L.length - 1];
  if (!(t0 > 0) || !(tf > t0)) return { svg: "", text: "" };
  var f = (acum - t0) / (tf - t0), zile = Math.max(0, Math.ceil((tf - acum) / PR_ZI)), urm = null;
  for (var i = 0; i < L.length; i++) if (L[i] > acum) { urm = i; break; }
  var text = priviri.map(function (p) { return p[1] + " " + prZi(p[0]); }).join(" · ");
  var mai = urm == null ? "privirile au trecut" : "următoarea privire peste " + sugCate(Math.ceil((L[urm] - acum) / PR_ZI), "zi", "zile");
  return { svg: prDrumSvg(f, L.slice(0, -1).map(function (t) { return (t - t0) / (tf - t0); }), nume + ": " + Math.round(Math.max(0, Math.min(1, f)) * 100) + "% din drum, " + mai + (zile ? ", verdictul peste " + sugCate(zile, "zi", "zile") : "")), text: text, mai: mai };
}

// rândurile „unde e fiecare probă” - aceleași cifre ca fișele, fără verdict înainte de privire
function prProbe(d, acum) {
  d = d || {}; var R = [];
  var c = d.caderi, u = c && c.urmarire, E = u && u.grupuri && u.grupuri.E, cs = c && c.start || "2026-11-07", pc = prPeDate(cs, [["2027-03-01", "prima privire"], ["2027-11-08", "verdictul"]], acum, "Căderile");
  R.push({ k: "cad", nume: "📉 După o cădere mare · monede Pionex", de: prZi(cs), jud: u ? sugCate(u.evenimente || 0, "cădere", "căderi") + " în " + sugCate(u.zile || 0, "zi judecată", "zile judecate") : "încă nimic: prima zi se judecă la 7 zile după ea",
    sta: E && E.n ? "la 7 zile, pe " + sugCate(E.n, "cădere judecată", "căderi judecate") + ", față de piață, după cost: " + sugP1(E.stat) + " (pe istoric −0,1%)" : "pe istoric (6.932 de căderi, 2022–2026) A, B, C n-am aflat; aici se vede dacă datele noi spun altceva",
    ultima: c && c.zi ? "ultima zi: " + prZi(c.zi) + (typeof sugCadVeche === "function" && sugCadVeche(c, acum) ? " · LISTĂ VECHE" : "") : "aștept tura de la 8:00", drum: pc });
  var dr = d.directie, ud = dr && dr.urmarire, ds = dr && dr.start || "2026-11-06", pd = prPeDate(ds, [["2027-05-08", "doar cifrele"], ["2027-11-08", "a doua privire"]], acum, "Direcția");
  var nim = function (k, t) { var x = ud && ud[k] && ud[k][t]; return x && x.nimerire != null ? sugPc(x.nimerire) : "—"; };
  R.push({ k: "dir", nume: "🎯 Direcția pe 7 zile · primele 10 monede Pionex", de: prZi(ds), jud: ud && ud.perechi ? sugCate(ud.perechi, "pereche judecată", "perechi judecate") + " în " + sugCate(ud.zile || 0, "zi", "zile") : "nicio zi judecată încă: prima, la 7 zile după start",
    sta: ud && ud.perechi ? "M1 a nimerit " + nim("M1", "abs") + ", M2 " + nim("M2", "abs") + " (față de piață " + nim("M1", "rel") + " / " + nim("M2", "rel") + ")" + (ud.M1 && ud.M1.abs && ud.M1.abs.sapt < 8 ? "; sub 8 săptămâni e practic o singură observație" : "") : "pe istoric (124 de săptămâni) n-am aflat pe trei întrebări; „M2 față de piață” a ieșit invers, cât costul",
    ultima: dr && dr.zi ? "ultima zi: " + prZi(dr.zi) + (typeof sugDirVeche === "function" && sugDirVeche(dr, acum) ? " · LISTĂ VECHE" : "") : "aștept tura de la 8:00", drum: pd });
  var a = d.probaA, pa = prPeDate("2026-11-04", [["2027-02-01", "verdictul (z ≥ 2, o singură încercare)"]], acum, "Proba A");
  R.push({ k: "a", nume: "🎯 Trade-ul zilei · spargerea A", de: prZi("2026-11-04"), jud: a ? sugCate(a.zile || 0, "zi", "zile") + ", " + sugCate(a.nSemnal || 0, "zi-pereche cu semnal", "zile-pereche cu semnal") : "aștept colectorul (o dată pe oră)",
    sta: a && a.nSemnal ? "net pe semnal " + sugP1(a.netSemnal) + ", pe rest " + sugP1(a.netRest) + " (medii pe trade; verdictul se face pe zile)" : "pe istoric: +0,42% pe semn la IS și OOS (z 2,1); acum se vede pe zile noi",
    ultima: a && a.ultima ? "ultima zi: " + prZi(a.ultima) : "", drum: pa, act: ["Trade-ul zilei ›", "navTo('tradezilei',true)"] });
  var T = d.trend12, b = T && T.bilant;
  R.push({ k: "trend", nume: "📈 Trend 12 luni · acțiuni SUA", de: b && b.zile ? "de " + sugCate(b.zile, "zi", "zile") : "—", jud: b ? sugCate(b.n20 || 0, "zi", "zile") + " cu rezultat" + (b.ferestre20 != null ? " (" + sugCate(b.ferestre20, "fereastră", "ferestre") + " de 20 z)" : "") : T ? "0 zile cu rezultat (robotul n-a trimis încă bilanțul)" : "aștept robotul (după 8:00)",
    sta: b ? (b.diferenta20 && b.diferenta20.medie != null && b.n20 ? sugP1(b.diferenta20.medie / 100) + " față de alte acțiuni" : "fără cifre încă") + (b.t20 != null ? ", t " + sugZec(b.t20) : "") + " · " + (b.verdict || "în probă") + (b.abatere && b.abatere.atinsa ? " · ABATERE sub pragul scris înainte" : "") : T ? "fără cifre încă" : "—",
    ultima: T && T.dataUltimei ? "EOD " + prZi(T.dataUltimei) : "", drum: { svg: prDrumSvg(b && b.ferestre20 != null ? b.ferestre20 / 12 : 0, [], "Trend 12 luni: " + (b && b.ferestre20 != null ? b.ferestre20 : 0) + " din cele 12 ferestre cerute"), text: "fără dată fixă: „probat” cere t peste 3,2 pe cel puțin 12 ferestre de 20 de zile" },
    act: ["în Sugestii ›", "navTo('sugestii',true)"] });
  var P = d.pareri, l = P && Array.isArray(P.pareri) ? P.pareri : [], sc = typeof Caiet !== "undefined" ? Caiet.scor(l, P && P.judecate) : {}, nj = 0, ab = [];
  Object.keys(sc).forEach(function (k) { nj = Math.max(nj, sc[k].judecate); if (sc[k].judecate) ab.push((k === "claude" ? "Claude " : "tu ") + prAbil(sc[k].abilitate)); });
  R.push({ k: "caiet", nume: "📓 Caietul de păreri · tu și Claude", de: l.length ? prZi(new Date(Math.min.apply(null, l.map(function (p) { return p.la; }))).toISOString().slice(0, 10)) : "de la prima părere", jud: P ? sugCate(l.length, "părere notată", "păreri notate") + ", " + sugCate(Object.keys(sc).reduce(function (s, k) { return s + sc[k].judecate; }, 0), "judecată", "judecate") : "aștept caietul",
    sta: ab.length ? "față de „50% la fiecare”: " + ab.join(" · ") + (nj < 30 ? " · sub 30 de păreri judecate, scorul e zgomot" : "") : "nicio părere judecată încă",
    ultima: "", drum: { svg: prDrumSvg(nj / 30, [], "Caietul: " + nj + " din cele 30 de păreri judecate de la care scorul începe să spună ceva"), text: "fără dată fixă: un prim semn de la 30 de păreri judecate pe autor" }, act: ["la caiet ›", "prLaCaiet()"] });
  return R;
}
function prStadiuHtml(d, acum) {
  var R = prProbe(d, acum);
  return '<section class="tbBloc prStadiu" data-pr="stadiu"><div class="sugPandaCap"><h4>Unde e fiecare probă</h4><span class="tbSub">regulile s-au fixat înainte; până la privire doar cifre, fără verdict</span></div><div class="prRanduri">'
    + R.map(function (r) {
      return '<div class="prRand" data-proba="' + r.k + '"><div class="prNume"><b>' + sugEsc(r.nume) + '</b> <span class="sugVerdict sugVerdict-p">ÎN PROBĂ</span>' + (r.act ? ' <button type="button" class="t212BtnLinie prDu" data-action-click="' + sugEsc(r.act[1]) + '">' + sugEsc(r.act[0]) + '</button>' : '') + '</div>'
        + '<dl class="prFapte"><div><dt>De când</dt><dd>' + sugEsc(r.de) + '</dd></div><div><dt>Judecate</dt><dd>' + sugEsc(r.jud) + '</dd></div><div class="prSta"><dt>Cum stă, fără verdict</dt><dd>' + sugEsc(r.sta) + '</dd></div></dl>'
        + '<div class="prDrum">' + (r.drum && r.drum.svg || "") + '<p class="tbSub">' + sugEsc((r.drum && r.drum.text) || "") + (r.drum && r.drum.mai ? " · " + sugEsc(r.drum.mai) : "") + (r.ultima ? " · " + sugEsc(r.ultima) : "") + '</p></div></div>';
    }).join("") + '</div></section>';
}
function prHtml(d, acum) {
  d = d || {};
  return '<p class="rlRasp" data-pr="rasp">Ce e aici se testează pe zile care nu existau când s-au fixat regulile. Nimic nu e un sfat: pe istoric niciuna n-a dovedit un avantaj după cost. Cifrele merg zi de zi, verdictul vine doar la privirile scrise dinainte.</p>'
    + prStadiuHtml(d, acum) + sugListaHtml(d, acum)
    + '<p class="tbSub" data-pr="nota">Mutate aici din Sugestii pe 07.11 (la cererea ta), cu fișa, graficul și urmărirea lor neschimbate. Trend 12 luni rămâne și în Sugestii, Trade-ul zilei are pagina lui. Caietul de păreri e mai jos.</p>';
}

// --- caietul ---
function prCaietRanduri(P, acum) {
  var l = P && Array.isArray(P.pareri) ? P.pareri.slice() : [], J = P && P.judecate || {};
  l.sort(function (a, b) { return b.la - a.la; });
  return l.map(function (p) {
    var st = typeof Caiet !== "undefined" ? Caiet.stare(p, J, acum) : { k: "asteapta", j: {} }, j = st.j || {}, mult = j.mult > 1 ? j.mult : 1;
    var rez = st.k === "judecata" ? (j.y === 1 ? "▲ a urcat" : "▼ n-a urcat") + (st.nimerit == null ? "" : st.nimerit ? " · nimerit" : " · greșit") : st.k === "eroare" ? "fără judecată: " + j.eroare : st.k === "lajudecat" ? "se judecă la tura următoare (cel mult o oră)" : "se judecă pe " + prOra(Caiet.termen(p));
    var pret = st.k === "eroare" ? "" : j.p0 > 0 ? prPret(j.p0 / mult) + (j.pT > 0 ? " ⇒ " + prPret(j.pT / mult) + " (" + sugP1(j.pT / j.p0 - 1) + ")" : "") : "prețul îl citește colectorul (în cel mult o oră)";
    var sterg = Date.now() - (p.creat || 0) < 15 * 60000 ? ' <button type="button" class="t212BtnLinie prSterge" data-action-click="prSterge(\'' + sugEsc(p.id) + '\')">Șterge</button>' : '';
    return '<li class="prParere prParere-' + st.k + (st.nimerit === true ? ' prNimerit' : st.nimerit === false ? ' prGresit' : '') + '"><div class="prParCap"><b>' + sugEsc(p.s) + '</b> <span class="sugDir">' + (p.p > 0.5 ? "▲" : p.p < 0.5 ? "▼" : "·") + ' ' + sugPc(p.p) + ' sus în ' + sugCate(p.zile, "zi", "zile") + '</span> <span class="tbSub">' + (p.autor === "claude" ? "Claude" : "tu") + ' · ' + prOra(p.la) + (p.retro ? " (trecută mai târziu, ora din conversație)" : "") + (p.m2 ? " · M2 zicea " + sugPc(p.m2) : "") + '</span>' + sterg + '</div>'
      + '<p class="tbSub prParRez"><b>' + sugEsc(rez) + '</b>' + (pret ? ' · ' + sugEsc(pret) : '') + '</p>' + (p.nota ? '<p class="tbSub prParNota">' + sugEsc(p.nota) + '</p>' : '') + '</li>';
  }).join("");
}
function prCaietScorHtml(P) {
  var l = P && Array.isArray(P.pareri) ? P.pareri : [], sc = typeof Caiet !== "undefined" ? Caiet.scor(l, P && P.judecate) : {};
  var cel = function (k, nume) {
    var x = sc[k];
    if (!x) return '<div><span class="tbEt2">' + nume + '</span><b>—</b><span class="tbSub">nicio părere încă</span></div>';
    return '<div><span class="tbEt2">' + nume + '</span><b>' + (x.judecate ? prAbil(x.abilitate) : "—") + '</b><span class="tbSub">' + (x.judecate ? "față de „50% la fiecare” · " + sugCate(x.nimerite, "nimerită", "nimerite") + " din " + x.decise + " · " : "") + sugCate(x.judecate, "judecată", "judecate") + " din " + sugCate(x.notate, "notată", "notate")
      + (x.m2n ? " · pe cele " + x.m2n + " cu cifra M2: tu " + prAbil(x.m2AbilitateTa) + ", M2 " + prAbil(x.m2Abilitate) : "") + '</span></div>';
  };
  return '<div class="sugCel prScor">' + cel("eu", "Tu") + cel("claude", "Claude") + '</div>';
}
function prCaietDeseneaza() {
  if (typeof document === "undefined") return;
  var el = document.getElementById("prCaietLista"); if (!el) return;
  var P = sugStare.d && sugStare.d.pareri, acum = Date.now(), r = prCaietRanduri(P, acum);
  var h = prCaietScorHtml(P) + (prStare.mesaj ? '<p class="prMesaj ' + prStare.mesajC + '" role="status">' + sugEsc(prStare.mesaj) + '</p>' : '')
    + (r ? '<ol class="prPareri">' + r + '</ol>' : '<p class="sugGol">' + (P ? "Caietul e gol. Prima părere: moneda, șansa să fie mai sus și peste câte zile." : "Aduc caietul…") + '</p>')
    + '<p class="tbSub">Scorul: Brier pe autor, față de cineva care spune mereu 50% (peste zero = mai bine decât banul). Monedele merg împreună, deci părerile din aceeași zi greșesc împreună: sub 30 de păreri judecate scorul e zgomot. M2 = regula „combinat” din direcția pe 7 zile, unde moneda era în lista zilei.</p>';
  if (el._prH !== h) { el.innerHTML = h; el._prH = h; }
  var b = document.getElementById("prNoteaza"); if (b) { b.disabled = !!prStare.trimit; b.textContent = prStare.trimit ? "Notez…" : "Notează părerea"; }
}
function prLaCaiet() { var el = typeof document !== "undefined" && document.getElementById("prCaiet"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); var i = document.getElementById("prS"); if (i && i.focus) try { i.focus({ preventScroll: true }); } catch (e) {} }
async function prCaietAdu() { try { sugStare.d.pareri = await getJSON("/api/istoric-bot?action=pareri"); } catch (e) { if (!sugStare.d.pareri) sugStare.d.pareri = null; } prCaietDeseneaza(); sugDeseneaza(); }
function prCitesteForm() {
  var v = function (id) { var e = document.getElementById(id); return e ? String(e.value || "").trim() : ""; };
  var s = v("prS").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/USDT$/, "").replace(/_USDT_PERP$/, ""), p = Number(v("prP").replace(",", ".")), z = Number(v("prZile")), a = v("prAutor") === "claude" ? "claude" : "eu", nota = v("prNota");
  if (!s) return { eroare: "Scrie moneda (de exemplu STX)." };
  if (!(p >= 1 && p <= 99)) return { eroare: "Șansa să fie mai sus: un număr între 1 și 99." };
  if (Caiet.ORIZONTURI.indexOf(z) < 0) return { eroare: "Alege peste câte zile." };
  var corp = { op: "adauga", s: s, p: Math.round(p) / 100, zile: z, autor: a };
  if (nota) corp.nota = nota.slice(0, 200);
  var dl = sugStare.d && sugStare.d.directie, x = dl && Array.isArray(dl.lista) ? dl.lista.filter(function (m) { return sugScurt(m.s).replace(/^(1000000|1000|1M)(?=[A-Z])/, "") === s; })[0] : null;
  if (z === 7 && x && x.P2 > 0 && x.P2 < 1 && !(typeof sugDirVeche === "function" && sugDirVeche(dl, Date.now()))) corp.m2 = x.P2;   // revizia: M2 prezice 7 zile
  return { corp: corp };
}
async function prNoteaza() {
  if (prStare.trimit) return;
  var f = prCitesteForm();
  if (f.eroare) { prStare.mesaj = f.eroare; prStare.mesajC = "prMesajRau"; prCaietDeseneaza(); return; }
  prStare.trimit = true; prStare.mesaj = ""; prCaietDeseneaza();
  try {
    var r = await apiFetch("/api/istoric-bot?action=pareri", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f.corp) }), j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok || !j || !j.ok) throw new Error(j && j.error || "HTTP " + r.status);
    var p = j.parere || f.corp;
    prStare.mesaj = "Notată: " + p.s + ", " + sugPc(p.p) + " să fie mai sus peste " + sugCate(p.zile, "zi", "zile") + ", la " + prOra(p.la || Date.now()) + ". Poți s-o ștergi în primele 15 minute; apoi rămâne.";
    prStare.mesajC = "prMesajBun";
    ["prS", "prP", "prNota"].forEach(function (id) { var e = document.getElementById(id); if (e) e.value = ""; });
  } catch (e) { prStare.mesaj = "N-am putut nota: " + (e && e.message || e); prStare.mesajC = "prMesajRau"; }
  finally { prStare.trimit = false; }
  await prCaietAdu();
}
async function prSterge(id) {
  try {
    var r = await apiFetch("/api/istoric-bot?action=pareri", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "sterge", id: String(id || "") }) }), j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok || !j || !j.ok) throw new Error(j && j.error || "HTTP " + r.status);
    prStare.mesaj = "Ștearsă."; prStare.mesajC = "prMesajBun";
  } catch (e) { prStare.mesaj = "N-am putut șterge: " + (e && e.message || e); prStare.mesajC = "prMesajRau"; }
  await prCaietAdu();
}
async function prPorneste(fortat) {
  if (typeof sugSchimbaVedere === "function") sugSchimbaVedere("probe"); else sugStare.vedere = "probe";
  sugDeseneaza(); prCaietDeseneaza();
  if (prStare.inLucru || (!fortat && Date.now() - prStare.la < 5 * 60000)) return;
  prStare.inLucru = true; prStare.la = Date.now();
  var d = sugStare.d, pas = async function (k, fn) { try { d[k] = await fn(); } catch (e) {} if (sugStare.vedere === "probe") { sugDeseneaza(); prCaietDeseneaza(); } };
  try {
    await Promise.all([
      pas("caderi", function () { return getJSON("/api/istoric-bot?action=caderi").then(function (r) { return r && r.caderi || null; }); }),
      pas("directie", function () { return getJSON("/api/istoric-bot?action=directie").then(function (r) { return r && r.directie || null; }); }),
      pas("trend12", function () { return getJSON("/api/istoric-bot?action=trend12").then(function (r) { return r && r.trend || null; }); }),
      pas("probaA", function () { return getJSON("/api/istoric-bot?action=probaA").then(function (r) { return r && r.probaA || null; }); }),
      pas("pareri", function () { return getJSON("/api/istoric-bot?action=pareri"); })
    ]);
  } finally { prStare.inLucru = false; }
  if (sugStare.vedere !== "probe") return;
  sugDeseneaza(); prCaietDeseneaza();
  try { await sugGraficAdu(sugRandAles()); } catch (e) {}
}
