// v100.119 (el 06.10: „o pagină de sugestii unde pui tot: boți, EU, US, absolut toate”): pagina „Sugestii” - toate listele într-un loc,
// fiecare cu istoricul ei pe 2 ani și urmărirea înainte. Un filtru, nu o predicție: o listă cu istoric slab rămâne, cu istoricul la vedere.
// sugHtml e fără DOM (proba o rulează în vm); sugPorneste aduce datele. Nimic nu se mută: listele rămân și pe Tablou, T212 și Acasă.
var sugStare = { d: {}, la: 0, inLucru: false, panda: { desfacut: false, filtru: "toate" } };   // v100.150 (I-584): pânda - pliată, filtrul ales
function sugEsc(s) { return typeof escapeHtml === "function" ? escapeHtml(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function sugP1(x) { return x == null || !isFinite(x) ? "—" : (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; }
function sugPc(x) { return x == null || !isFinite(x) ? "—" : Math.round(x * 100) + "%"; }
function sugCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + pl; }
// revizia (M2): lista intraday de altă zi își spune data (în weekend, înainte de 10:20)
function sugOra(t, acum) { var d = new Date(t), p = function (n) { return String(n).padStart(2, "0"); }; if (!isFinite(d.getTime())) return "—"; var a = new Date(acum || Date.now()), alta = d.toDateString() !== a.toDateString(); return (alta ? p(d.getDate()) + "." + p(d.getMonth() + 1) + " " : "") + p(d.getHours()) + ":" + p(d.getMinutes()); }
// v100.262 (el 28.10: „în Sugestii să apară și direcția la boți”): direcția monedei din clasament (GridCalcul.directie pe 4h + 1z, aceeași
// ca în Fișă) cu tăria ei, ca pastilă lângă nume pe cartelele de boți; fără direcție în rând (acțiuni, clasament vechi) nu apare nimic
var SUG_DIR = { long: "↑ long", short: "↓ short", neutru: "→ neutru" }, SUG_TARIE = { tare: "tare", mediu: "mediu", slab: "slab" };
function sugDir(x) {
  var d = x && SUG_DIR[x.dir] ? x.dir : null; if (!d) return null;
  return { c: d, t: SUG_DIR[d] + (SUG_TARIE[x.tarie] ? " · " + SUG_TARIE[x.tarie] : "") };
}
function sugDirHtml(dir) {
  return dir ? '<span class="sugDir ' + dir.c + '" title="direcția trendului monedei pe 4h și 1z, ca în Fișă (long / short / neutru) și tăria lui (tare / mediu / slab); gridul se înclină după ea">' + sugEsc(dir.t) + '</span> ' : '';
}
// v100.150 (I-584): pânda - lățimea pieței pe 150 perp-uri (din KV, colectorul la 15 min) ca PRIMUL bloc al paginii: pliat la agregat,
// „arată cele 150” desface tabelul cu filtre. Fapte, nu semnal: permisiunea și fișa de intrare ale lui PAZNIC nu sunt aici (p = 0,23).
// boti = boții lui activi din /api/bot-orders, { s: "ADA", dir: "long" } (I-586: primii în tabel, CU / CONTRA direcției monedei)
function sugZec(x) { return x == null || !isFinite(x) ? "—" : (x < 0 ? "−" : "") + Math.abs(x).toFixed(1).replace(".", ","); }
function sugPandaNr(x) { return x == null || !isFinite(x) ? "—" : String(Math.round(x)); }   /* nu sugPc: aceea e pentru procente (× 100) */
// prețul își păstrează cifrele semnificative (poza 11.10: „US 0,0”, „ADA 0,2” nu spuneau nimic): ≥ 100 o zecimală, ≥ 1 două, sub 1 patru cifre semnificative
function sugPandaPret(x) { if (x == null || !isFinite(x)) return "—"; var z = x >= 100 ? 1 : x >= 1 ? 2 : Math.max(4, 3 - Math.floor(Math.log10(Math.abs(x) || 1))); return x.toFixed(z).replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1").replace(".", ","); }
function sugPandaHtml(l, boti, acum) {
  var t = typeof Latime !== "undefined" ? Latime.textCitire(l, null, acum) : null, a = l && l.acum;
  var min = a ? Math.max(0, Math.round((acum - a.la) / 60000)) : null;
  var cap = '<div class="tbBlocCap sugPandaCap"><h4>Lățimea pieței · 150 perp-uri Binance</h4><span class="tbSub">' + (a ? (t.vechi ? "veche, de " + sugCate(min, "minut", "minute") : "acum " + min + " min") + " · din colector, la 15 min" : "") + '</span></div>';
  if (!a || !t) return '<div class="tbBloc sugPanda">' + cap + '<p class="tbSub">' + sugEsc(t ? t.text : "aștept lățimea pieței (vine o dată la 15 minute)") + '</p></div>';
  if (a.eroare) return '<div class="tbBloc sugPanda">' + cap + '<p class="tbCitScurt">' + sugEsc(t.text) + '</p></div>';   /* revizia (2): eroarea colectorului, nu „arată cele 0” */
  var L = a.lat, nMas = a.n - (a.lipsa || 0), regim = Latime.regimText[a.regim && a.regim.cod] || "necunoscută", deCand = Latime.regimDeCand(l.istoric, acum).text, larg = a.regim && (a.regim.cod === "LARG-SUS" || a.regim.cod === "LARG-JOS");
  var h = '<div class="tbBloc sugPanda">' + cap
    + '<p class="tbCitScurt">Piața e <b>' + sugEsc(regim) + '</b>' + (deCand ? " " + sugEsc(deCand) : "") + ': ' + sugCate(L.sus, "monedă", "monede") + ' sus, ' + L.jos + ' jos. Conturile mari sunt long pe ' + L.mariLong + ' din ' + nMas + '.' + (larg ? ' Riscul e corelat, nu diversificat.' : '') + (a.incomplet ? ' Măsurat pe ' + nMas + ' din ' + a.n + '.' : '') + '</p>'
    + '<p class="tbSub">' + L.fundExtrem + ' în funding extrem · ' + L.oiExtrem + ' în OI extrem · ' + L.volExtrem + ' cu volatilitate extremă · ' + L.bugetEpuizat + ' cu bugetul zilei epuizat</p>'
    + '<p class="tbSub sugPandaCinste">Fapte, nu semnal: filtrul de permisiune și fișa de intrare ale lui PAZNIC n-au selectat nimic (p = 0,23; 78 trade-uri pe hârtie) și nu sunt aici.</p>';
  var lb = Array.isArray(boti) ? boti : [], simb = lb.map(function (b) { return b.s; }), m = a.monede || [], f = sugStare.panda.filtru, cate = function (k) { return Latime.filtreaza(m, k, simb).length; };
  var bc = Latime.botiContra ? Latime.botiContra(l, lb) : [];   /* v100.185 (el: „ok fă idei”): boții contra direcției monedei, la vedere și cu pânda pliată */
  if (bc.length) h += '<p class="tbCitScurt sugPandaContra">⚠ Contra direcției monedei: ' + bc.map(function (x) { return '<b>' + sugEsc(x.s) + '</b> (botul ' + sugEsc(x.dirBot) + ', ' + sugEsc(x.text) + ')'; }).join("; ") + '. Direcția de aici e cea pe 84 de zile (ca în PAZNIC); pe rândul monedei, mai jos, e și trendul pe 4h+1z.</p>';
  if (!sugStare.panda.desfacut) { var nb = cate("boti");   /* v100.184 (el: „fă idei”): boții tăi la un clic, fără să cauți filtrul în tabelul desfăcut */
    return h + '<div class="sugPandaFiltre"><button type="button" class="t212BtnLinie" data-action-click="sugPandaDesfa()">arată cele ' + a.n + ' ›</button>' + (nb ? '<button type="button" class="t212BtnLinie" data-action-click="sugPanda(\'boti\')">monedele boților mei (' + nb + ') ›</button>' : '') + '</div></div>'; }
  var dirBot = function (s) { var b = lb.filter(function (x) { return x.s === s; })[0]; return b ? b.dir : null; };
  var filtre = [["toate", "toate"], ["boti", "monedele boților mei"], ["contra", "contra mulțimii"], ["extreme", "extreme"], ["sus", "SUS"], ["jos", "JOS"]];
  h += '<div class="sugPandaFiltre">' + filtre.map(function (x) { return '<button type="button" class="t212BtnLinie' + (f === x[0] ? ' ales' : '') + '" data-action-click="sugPanda(\'' + x[0] + '\')">' + sugEsc(x[1]) + ' (' + cate(x[0]) + ')</button>'; }).join("") + '</div>';
  var P = Latime.PRAGURI, prag = function (v, p, jos) { return v != null && (jos ? v <= p : v >= p) ? ' prag' : ''; };
  h += '<div class="rlTab"><table class="t212Tab sugPandaTab"><thead><tr><th>Monedă</th><th>Direcția pe 84 z</th><th>Vol pctl</th><th>Ext pctl</th><th>Buget zi</th><th>Funding</th><th>OI</th><th>Mari % long</th><th>Mici % long</th><th>Agresiune</th><th>Botul meu</th></tr></thead><tbody>'
    + Latime.filtreaza(m, f, simb).map(function (x) {
      var s = String(x.sym).replace(/USDT$/, ""), db = dirBot(s);
      var cu = !db ? null : db === "neutru" ? "neutru" : x.dir === "neclara" ? "—" : Latime.esteBotContra(db, x.dir === "SUS" ? "LARG-SUS" : "LARG-JOS") ? "CONTRA" : "CU";   /* moneda SUS + bot short = CONTRA; moneda JOS + bot long = CONTRA */
      var bz = typeof Busola !== "undefined" && Busola.adresaBusola ? Busola.adresaBusola({ simbol: s, tf: "4h" }) : null;   /* v100.183 (el: „poți face ideile”): 🧭 pe fiecare monedă, Busola pe 4h ca direcția din tabel */
      return '<tr class="sugPandaRand' + (db ? ' bot' : '') + '"><td><b>' + sugEsc(s) + '</b> <span class="tbSub">' + sugEsc(sugPandaPret(x.pret)) + '</span>' + (bz ? '<a class="sugBusola" href="' + sugEsc(bz) + '" target="_blank" rel="noopener" aria-label="deschide ' + sugEsc(s) + ' în Busola" title="deschide în Busola">🧭</a>' : '') + '</td>'
        + '<td class="' + (x.dir === "SUS" ? "good" : x.dir === "JOS" ? "bad" : "neutral") + '">' + sugEsc(x.dir === "neclara" ? "neclară" : x.dir) + (x.dir !== "neclara" && x.zileDir != null ? ' <span class="tbSub">de ' + sugCate(x.zileDir, "zi", "zile") + '</span>' : '') + '</td>'
        + '<td class="sugPandaCel' + prag(x.volPctl, P.volPctl) + '">' + sugPandaNr(x.volPctl) + '</td><td class="sugPandaCel' + prag(x.extPctl, P.extPctl) + '">' + sugPandaNr(x.extPctl) + '</td><td class="sugPandaCel' + prag(x.adrUsed, P.adrConsumat) + '">' + (x.adrUsed == null ? "—" : sugZec(x.adrUsed) + "%") + '</td>'
        + '<td class="sugPandaCel' + (prag(x.fundPctl, P.fundPctlSus) || prag(x.fundPctl, P.fundPctlJos, true)) + '">' + sugPandaNr(x.fundPctl) + '</td><td class="sugPandaCel' + prag(x.oiPctl, P.oiPctl) + '">' + sugPandaNr(x.oiPctl) + (x.oiChg != null ? ' <span class="tbSub">' + sugZec(x.oiChg) + '%</span>' : '') + '</td>'
        + '<td>' + sugPandaNr(x.lMari) + '</td><td>' + sugPandaNr(x.lMici) + '</td><td>' + sugPandaNr(x.deltaPctl) + '</td><td class="' + (cu === "CONTRA" ? "bad" : cu === "CU" ? "good" : "tbSub") + '">' + (cu || "—") + '</td></tr>';
    }).join("") + '</tbody></table></div><p class="tbSub">Percentilele sunt față de ultimele 564 de bare de 4h ale fiecărei monede; direcția = randamentul pe 84 de zile (ca în PAZNIC); conturile = Binance (poziții mari / conturi global); agresiunea = cine a fost agresorul (taker). O celulă colorată e un prag atins, nu un sfat.</p></div>';
  return h;
}
function sugPandaDesfa() { sugStare.panda.desfacut = true; sugDeseneaza(); }
// revizia (4): „pânda ›” din Tablou - pagina se ÎNCARCĂ (navTo cu load), blocul vine desfăcut, filtrul pe toate
function sugDeschidePanda() { sugStare.panda.desfacut = true; sugStare.panda.filtru = "toate"; navTo("sugestii", true); }
function sugPanda(f) { sugStare.panda.filtru = f; sugStare.panda.desfacut = true; sugDeseneaza(); }
function sugBani(v) { var n = Number(v); return isFinite(n) && n > 0 ? n.toFixed(n >= 10 ? 1 : 2).replace(".", ",") : ""; }   // poza 06.10: virgula, nu punctul; v100.183 (regula lui, 03.10): o zecimală de la 10 în sus (±0,05 = sub 0,5%), sub 10 două (stopul s-ar muta cu peste 0,5%); întregi pe pagina Trading 212
function sugSim(x) { return x.simbol || String(x.ticker || x.simbolTicker || "").split("_")[0]; }
// v100.292 (el, 01.11: „analizează foarte bine pagina de sugestii, refă-o la fel ca pe Trade 212 și verifică foarte sever condițiile care
// sugerează poziții: cât mai reale, cât mai corecte”): auditul (numărat pe ZILE, față de piața din aceleași zile, după cost) n-a găsit
// avantaj dovedit la nicio listă; el a hotărât („da scoate”) să dispară de aici listele fără avantaj: Pe revenire (monede), Pentru short,
// Idei de cumpărare, Început de urcare, Revers timpuriu, Gap / Pre-market. Rămân: Pe ce aș porni un bot, Pe revenire (acțiuni US / EU),
// Cele mai tari pe sectoare, Trend 12 luni - ca o singură LISTĂ cu FIȘA rândului ales alături (ca pe Trading 212): de ce e în listă, regula,
// cum a mers (dovada + urmărirea înainte, ÎNTREGI, nu tăiate), avertismentele („Înainte să intri”), graficul, ce faci. Verdictul fiecărei liste
// stă lângă titlu; cifrele auditului din 01.11 sunt scrise cu data lor. sugRanduri / sugGrupuri / sugFisa sunt fără DOM (proba le rulează în vm).
// v100.308 (07.11, el: „ok fă așa dar fă și sugestie de coinuri”, după proba pre-înregistrată din 07.11 - A / B / C = n-am aflat): grupul „cad”,
// căderile de ieri pe monedele Pionex, cu fapte și urmărirea înainte; ÎN PROBĂ - fără Poartă, fără sumă (colectorul: scripts/lib/tura-caderi.mjs)
var SUG_GRUPURI = [["porn", "🤖 Boți · 💡 Pe ce aș porni un bot"], ["cad", "📉 Monede Pionex · după o cădere mare (în probă)"], ["revUS", "📈 Acțiuni US · 🔁 Pe revenire"], ["revEU", "📈 Acțiuni EU (DAX, CAC, AEX + ale tale) · 🔁 Pe revenire"], ["sect", "🏆 Cele mai tari pe sectoare (acțiuni mari din SUA)"], ["trend", "📈 Trend 12 luni (în probă)"]];   /* titlurile vechilor secțiuni rămân în titlul grupului */
var SUG_VERDICT = { porn: ["N-AM AFLAT", "v"], cad: ["ÎN PROBĂ", "p"], revUS: ["N-AM AFLAT", "v"], revEU: ["N-AM AFLAT", "v"], sect: ["N-AM AFLAT", "v"], trend: ["ÎN PROBĂ", "p"] };
// v100.308: fraza urmăririi înainte a căderilor (din KV `sugestii:caderi`, urmarire.grupuri) - cifrele, fără verdict până la privirile fixate
function sugCadZi(z) { var m = String(z || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + "." + m[2] + "." + m[1] : "—"; }   // ca în restul textelor lui: 06.11.2026
function sugCadUrm(c) {
  var u = c && c.urmarire, g = u && u.grupuri, E = g && g.E, P = u && u.P, v = u && u.verdict;
  if (!u) return "Urmărirea înainte pornește de la ziua UTC 07.11.2026 (regulile scrise înainte, în jurnalul probei); prima privire cu verdict: 01.03.2027.";
  var t = "Urmărit înainte de la " + sugCadZi(c.start || "2026-11-07") + ": " + sugCate(u.evenimente || 0, "cădere", "căderi") + " în " + sugCate(u.zile || 0, "zi", "zile") + " judecate"
    + (E && E.n ? "; la 7 zile, față de piața din aceleași zile, după cost și funding: media " + sugP1(E.stat) + " pe blocuri de 14 zile, mediana " + sugP1(E.mediana) + ", " + sugPc(E.pePlus) + " pe plus" : "")
    + (u.zileIncomplete ? " (" + sugCate(u.zileIncomplete, "zi incompletă", "zile incomplete") + ", scoase)" : "") + ".";
  // revizia 07.11: privirea e judecată O DATĂ, pe căderile închise până la ea, și ținută; cifrele de mai sus merg mai departe, verdictul nu
  t += v ? " Privirea din " + sugCadZi(v.la) + " (căderile până la " + sugCadZi(v.pana && v.pana.BC) + "): A " + v.A + ", B " + v.B + ", C " + v.C + "." : " Verdict abia la privirile fixate (01.03.2027, 08.11.2027); până atunci doar cifrele. Prima privire are prea puține blocuri de 14 zile ca să poată confirma ceva: verdictul adevărat e la 08.11.2027.";
  if (E && E.n >= 30 && E.stat != null && E.stat < -0.03) t += " ⚠ Datele noi arată mai rău decât istoricul (−0,1%): media sub −3%.";
  if (P) t += " Proba P (după o spălare largă cumperi piața): " + sugCate(P.episoade || 0, "episod", "episoade") + " pe date noi" + (P.episoade ? ", media " + sugP1(P.medie) : "") + (P.verdict ? " — judecată pe primele " + sugCate(P.judecate || 0, "episod", "episoade") + ": " + P.verdict : " (verdict o dată, la al 8-lea episod)") + "; pe istoric: n-am aflat (46 de episoade, +0,4%).";
  return t;
}
// v100.308 (revizia 07.11): lista nu se mai ia drept „de azi” când colectorul n-a mai trimis (peste 30 de ore)
function sugCadVeche(c, acum) { return !!(c && c.la > 0 && (acum || Date.now()) - c.la > 30 * 3600000); }
function sugCadEtichete(x) { return [x.A === true ? "A spălare" : "", x.B === "piata" ? "B cu piața" : x.B === "singura" ? "B singură" : "", x.C ? "C top 20" : ""].filter(Boolean).join(" · "); }
var SUG_TF = { moneda: [["4h", "4H", "4 ore"], ["1z", "1D", "1 zi"]], actiune: [["1h", "1h", "1 oră"], ["1z", "1d", "1 zi"]] };
function sugPctZ(x, z) { return x == null || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(z == null ? 1 : z).replace(".", ",") + "%"; }
function sugPr(v, z) { return v == null || !isFinite(v) ? "—" : Math.abs(v * 100).toFixed(z == null ? 1 : z).replace(".", ",") + "%"; }   // mărimi (intervalul, câștigul pe grilă): fără semn, ca pe Tablou
// v100.293 (02.11, el: „gata?” ⇒ în poza de pe 8788 fișa HYPE arăta „Mișcarea pe 24 h +29,1%”): regim.r4h / r24h sunt RAPOARTE față de
// mișcarea obișnuită a monedei (percentila 75 a mișcărilor ei, GridCalcul.regimPeBare), nu procente - ca pe Acasă: „0,3×”
function sugOri(v) { return v == null || !isFinite(v) ? "—" : Number(v).toFixed(1).replace(".", ",") + "×"; }
// celula „Mișcarea pe 24 h”: mișcarea reală pe 24 h (s24h, cu semn; colectorul o trimite de la v101.160) și raportul față de obișnuit;
// cu clasamentul vechi din KV (fără s24h), doar raportul, cu unitatea lui; v100.294: cifra și unitatea legate cu spațiu fără rupere (la 1920 / 2560 „h” rămânea singur pe rând)
function sugMis(rg) { rg = rg || {}; var s = rg.s24h != null && isFinite(rg.s24h), r24 = rg.r24h != null && isFinite(rg.r24h), r4 = rg.r4h != null && isFinite(rg.r4h);
  return { v: s ? sugPctZ(rg.s24h) : r24 ? sugOri(rg.r24h) + " obișnuitul" : "—", sub: [s && r24 ? sugOri(rg.r24h) + " obișnuitul" : "", r4 ? "pe 4\u00a0h " + sugOri(rg.r4h) : ""].filter(Boolean).join(" · ") }; }
// regula revenirii pe acțiuni, din Reveniri.REGULI.actiune (cifrele textelor nu se scriu de mână; rezerva = valorile de azi)
function sugRegRev(R) { var a = R && R.REGULI && R.REGULI.actiune || {}, d = { cadere: 0.2, revenire: 0.08, maxZile: 60, minZile: 20, vechimeZile: 3, medieZile: 5, orizontZile: 10 }, o = {}, k; for (k in d) o[k] = a[k] > 0 ? a[k] : d[k]; return o; }
function sugMil(v) { return v == null || !isFinite(v) ? "—" : (v / 1e6).toFixed(1).replace(".", ",") + " M USDT/zi"; }
function sugUsd(v) { return v == null || !isFinite(v) ? "—" : "$" + Number(v).toFixed(2).replace(".", ","); }   /* v100.306 (I-837): virgula zecimală („$4,22”), prețul își păstrează cele două zecimale */
function sugPretEU(v) { return v == null || !isFinite(v) ? "—" : Number(v).toFixed(2).replace(".", ","); }   // v100.292 (revizia 01.11): EU = moneda bursei (EUR, GBp…), fără „$”
function sugScurt(s) { return String(s || "").replace(/_USDT_PERP$/, ""); }
function sugCurat(s) { return String(s || "").replace(/[^A-Za-z0-9._-]/g, ""); }
function sugDirPanda(d, s) { var m = d && d.latime && d.latime.acum && d.latime.acum.monede || [], x = null; for (var i = 0; i < m.length; i++) if (String(m[i].sym).replace(/USDT$/, "") === s) { x = m[i]; break; } return x ? { dir: x.dir, zile: x.zileDir } : null; }
// v100.306 (I-824): regula „azi nu” a paginii = cea comună (acasa-ecran.js: acAziNu - frâna zilei, pauza, piața în MIȘCARE); fără ea (probele
// vechi, în vm) doar pauza sezonului. Lista de pornire rămâne la vedere sub „azi nu: <motivul>”, nu se mai golește.
function sugAziNu() {
  if (typeof acAziNu === "function") { try { return acAziNu() || { nu: false, motiv: "" }; } catch (e) { return { nu: false, motiv: "" }; } }
  var pz = typeof acPauzaSezon === "function" ? acPauzaSezon() : null;
  return pz > 0 ? { nu: true, motiv: typeof acFrazaPauza === "function" ? acFrazaPauza(pz) : "pauza sezonului", motive: [{ cod: "pauza" }] } : { nu: false, motiv: "" };
}
// grupurile paginii (titlul, verdictul, rândul de sub titlu) - sub „azi nu” titlul pornirii pierde tonul de sfat și spune de ce
function sugGrupuri(d, acum) {
  d = d || {}; var an = sugAziNu(), porn = typeof Idei !== "undefined" && d.clasament ? Idei.ideiBoti(d.clasament, [], 5) : [];
  var sa = d.sugActiuni && d.sugActiuni.sugestii, ai = d.idei && d.idei.idei, eu = sa && sa.eu, S = d.sectoare, T = d.trend12, bl = T && T.bilant, conc = T && T.concentrare;
  var jud = function (x) { return x ? sugCate(Number(x.judecate) || 0, "acțiune judecată", "acțiuni judecate") + (Number(x.fara) ? ", " + Number(x.fara) + " fără prețuri" : "") : ""; };   // numărătoarea turei de la 8:00, ca pe titlul vechi al secțiunii
  var sub = { porn: (an.nu ? "azi nu: " + an.motiv + " · " : "") + (d.clasament ? porn.length + " din clasamentul primelor 100 de monede PERP · un filtru, nu o predicție" : "aștept clasamentul (colectorul îl face o dată pe oră)"),
    revUS: "au scăzut puternic și acum revin" + (ai ? " · " + (ai.reveniri || []).length + " din " + sugCate(Number(ai.judecate) || 0, "acțiune judecată", "acțiuni judecate") + " la 8:00 · cel mult 10 pe zi, cea mai mare cădere întâi" + (Number(ai.nReveniri) > (ai.reveniri || []).length ? " (trec regula: " + Number(ai.nReveniri) + ")" : "") : " · aștept tura de la 8:00"),
    revEU: "au scăzut puternic și acum revin" + (eu ? " · " + (eu.revine || []).length + " pe revenire · cel mult 10 pe zi, cea mai mare cădere întâi" : " · aștept tura de la 8:00"),
    sect: S && Array.isArray(S.sectoare) ? sugCate(S.sectoare.length, "sector", "sectoare") + " · " + (S.univers || "—") + " firme mari · o dată pe zi, de la 8:00" + (S.sectoare.some(function (x) { return !(x.top || []).length; }) ? " · nicio acțiune mare cu trend în sus acum în: " + S.sectoare.filter(function (x) { return !(x.top || []).length; }).map(function (x) { return x.ro; }).join(", ") : "") : "Topul se face o dată pe zi, de la 8:00 (după închiderea bursei din SUA), din screenerul Nasdaq: cele mai mari ~25 de firme din fiecare sector, cu prețurile pe 2 ani.",
    trend: T && Array.isArray(T.top) && T.top.length ? sugTrendNota(T, acum).text : "Clasamentul vine o dată pe zi (după 8:00) de la robotul din Trading Tools: primele 20% dintre ~600 de acțiuni SUA de peste 2 mld. $ după randamentul pe lunile 2–12.",
    cad: d.caderi && d.caderi.zi ? (sugCadVeche(d.caderi, acum) ? "LISTĂ VECHE (colectorul n-a mai trimis din " + sugCadZi(d.caderi.zi) + ") · " : "") + "ziua UTC " + sugCadZi(d.caderi.zi) + ": " + sugCate(d.caderi.nE || 0, "cădere nouă", "căderi noi") + " de −25% pe Binance, " + (d.caderi.pionexLipsa ? "lista Pionex n-a venit (nu știu care sunt pe Pionex)" : (d.caderi.nPionex || 0) + " și pe Pionex") + (d.caderi.nA ? ", " + d.caderi.nA + " cu spălare de levier" : "") + (d.caderi.incomplet ? " · date incomplete (ziua nu intră în probă)" : "") + (d.caderi.inainteDeProba ? " · ziua de dinaintea probei (arătată, nu intră în urmărire)" : "") + " · cel mult 10, după lichiditate · fapte, nu semnal" : "Lista vine o dată pe zi (după 8:00) din colector: căderile de ieri pe Binance (prima zi la −25% sub maximul pe 30 de zile), doar monedele care sunt și pe Pionex." };
  var trendV = T && Array.isArray(T.top) && T.top.length ? sugTrendNota(T, acum).vechiHtml : "";
  var titlu = { porn: an.nu ? "🤖 Boți · candidatele din clasament (azi nu pornesc)" : null, revEU: eu ? "📈 Acțiuni EU (DAX, CAC, AEX + ale tale) · " + jud(eu) + " · 🔁 Pe revenire" : null };   // v100.293 (02.11): fără numărătoarea turei sugActiuni.us pe titlul US - listele ei (urcare, revers, gap) au fost scoase pe 01.11; lista de revenire vine din tura Idei, iar numărătoarea ei e sub titlu
  var gol = { cad: d.caderi && d.caderi.zi ? (d.caderi.pionexLipsa ? "Lista Pionex n-a venit la tura de azi: căderile de pe Binance sunt numărate mai sus, dar nu știu care sunt și pe Pionex." : "În ziua UTC " + sugCadZi(d.caderi.zi) + " nicio monedă de pe Pionex n-a trecut pentru prima dată de −25% sub maximul pe 30 de zile.") : "aștept tura de la 8:00" };   // v100.308
  return SUG_GRUPURI.map(function (g) { return { k: g[0], titlu: titlu[g[0]] || g[1], verdict: SUG_VERDICT[g[0]][0], verdictC: "sugVerdict-" + SUG_VERDICT[g[0]][1], sub: sub[g[0]], subHtml: g[0] === "trend" && trendV ? trendV + sugEsc(sub[g[0]]) : "", gol: gol[g[0]] || "" }; });
}
function sugTrendProba(T) { var bl = T && T.bilant || {}, conc = T && T.concentrare; return "proba: " + sugCate(bl.n20 || 0, "zi", "zile") + " cu rezultat" + (conc ? " · " + conc.n + " din 20 în " + conc.sector + ": un singur pariu" : ""); }
// v100.190-192 (păstrate): nota robotului - EOD, regim, concentrarea, proba (ferestre de 20 z, diferența față de alte acțiuni, t-ul, ABATEREA), au intrat / au ieșit,
// raportările; vechimea = zile de bursă NY de la EOD până azi, minus una (EOD de ieri = proaspăt); de la 2 ⇒ VECHI (robotul n-a publicat)
function sugTrendNota(x, acum) {
  if (!x || !x.dataUltimei) return { text: "", vechime: 0 };
  var P1 = function (v) { return v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; };
  var ziNY = function (t) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t)); };
  var regim = !!(x.regim && x.regim.peste), b = x.bilant;
  var vechime = (function () { var a = Date.parse(x.dataUltimei + "T12:00:00Z"), z = Date.parse(ziNY(acum) + "T12:00:00Z"); if (!(a > 0) || !(z > a)) return 0; var n = 0; for (var t = a + 86400000; t <= z; t += 86400000) { var w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) n++; } return Math.max(0, n - 1); })();
  var nota = "EOD " + x.dataUltimei + " · regim " + (regim ? "pornit" : "OPRIT") + (x.concentrare ? " · " + x.concentrare.n + " din 20 " + x.concentrare.sector + " — un singur pariu" : "")
    + (b ? " · proba: " + sugCate(b.n20 || 0, "zi", "zile") + " cu rezultat" + (b.ferestre20 != null ? " (" + sugCate(b.ferestre20, "fereastră", "ferestre") + " de 20 z)" : "") + (b.diferenta20 && b.diferenta20.medie != null && (b.n20 || 0) > 0 ? ", " + P1(b.diferenta20.medie / 100) + " vs alte acțiuni" : "") + (b.t20 != null ? ", t " + String(b.t20.toFixed(1)).replace(".", ",") + " („probat” cere t > 3,2 pe ≥ 12 ferestre)" : "") + " · " + b.verdict + (b.abatere && b.abatere.atinsa ? " · ABATERE: media " + P1(b.abatere.medie / 100) + " sub pragul scris înainte " + P1(b.abatere.prag / 100) : "") : " · proba: fără bilanț încă")
    + (x.intrari && x.intrari.length ? " · au intrat: " + x.intrari.join(", ") : "") + (x.iesiri && x.iesiri.length ? " · au ieșit: " + x.iesiri.map(function (e) { return e.s; }).join(", ") : "") + (x.raportari !== "finnhub" ? " · raportările neverificate (robotul fără cheie)" : "");
  return { text: nota, vechime: vechime, vechiHtml: vechime >= 2 ? '<b class="sugTrendVechi">VECHI de ' + sugEsc(sugCate(vechime, "zi", "zile")) + ' de bursă — robotul n-a publicat</b> · ' : "" };
}
// toate rândurile, în ordinea paginii; fiecare știe lista lui, cifrele regulii și avertismentele („Înainte să intri”)
function sugRanduri(d, acum) {
  d = d || {}; var l = [], an = sugAziNu();
  var porn = typeof Idei === "undefined" || !d.clasament ? [] : Idei.ideiBoti(d.clasament, [], 5);   /* v100.306 (I-824): nici pauza nu mai golește lista */
  porn.forEach(function (x) {
    var s = sugScurt(x.simbol || x.moneda), pd = sugDirPanda(d, s), D = SUG_DIR[x.dir] ? x.dir : null, av = [], rg = x.regim || {};
    if (an.nu) av.push("Azi nu: " + an.motiv + ". Lista e de privit, nu de pornit.");
    if (x.volum != null && x.volum < 1e6) av.push("Lichiditate mică: " + sugMil(x.volum) + ", sub pragul de 1 M. La un grid, ordinele tale sunt o parte vizibilă din piață: alunecare și umpleri parțiale.");
    if (pd && ((x.dir === "short" && pd.dir === "SUS") || (x.dir === "long" && pd.dir === "JOS"))) av.push("Direcțiile nu se pun de acord: pe 4h+1z trendul e " + x.dir + ", pe 84 de zile moneda e " + pd.dir + (pd.zile != null ? " de " + sugCate(pd.zile, "zi", "zile") : "") + ". Botul s-ar înclina contra mișcării lungi.");
    // v100.293 (02.11): mr = mișcarea de azi pe 24 h / pragul ei de „mișcare mare” (GridCalcul.miscareMare(...).r; pragul = percentila 90 a mișcărilor
    // ei pe o zi), trimis de colector de la v101.160; pragul în procente = |s24h| / mr. Înainte (v100.292) se compara r24h - un RAPORT față de
    // obișnuit - cu un procent, iar pragul nu ajungea pe pagină: avertismentul nu putea apărea.
    var mr = rg.mr, s24 = rg.s24h;
    if (mr != null && isFinite(mr) && mr >= 0.8 && !rg.miscare) av.push(s24 != null && isFinite(s24) && mr > 0 ? "Pe 24 h s-a mișcat " + sugPctZ(s24) + ": aproape de pragul ei de „mișcare mare” (" + sugPr(Math.abs(s24) / mr) + ", percentila 90 a mișcărilor ei pe o zi)." : "Mișcarea pe 24 h e la " + Math.round(mr * 100) + "% din pragul ei de „mișcare mare” (percentila 90 a mișcărilor ei pe o zi).");
    l.push({ k: "porn:" + s, grup: "porn", tip: "moneda", aziNu: !!an.nu, s: s, tk: s + "_USDT_PERP", nume: "", dir: D ? "4h+1z " + SUG_DIR[D] + (SUG_TARIE[x.tarie] ? " · " + SUG_TARIE[x.tarie] : "") : "", dirC: D || "", pret: sugPandaPret(x.pret), avert: av, x: x, pd: pd,
      sub: "interval " + sugPr(x.latime) + " · " + sugPr(x.profitGrila, 2) + " net pe grilă · ~" + Math.round(x.traversariZi || 0) + " treceri pe zi · " + sugMil(x.volum) + (pd ? " · 84 z " + pd.dir : "") });
  });
  // v100.308: căderile de ieri pe monedele Pionex (în probă) - faptele pe rând, avertismentele în „Înainte să intri”
  var cd = d.caderi;
  (cd && Array.isArray(cd.lista) ? cd.lista : []).forEach(function (x) {
    var s = sugScurt(x.s), av = [], et = sugCadEtichete(x);
    av.push("Pe istoric (6.932 de căderi pe Binance, 2022–2026, cu monedele delistate), după 7 zile moneda a făcut cam cât piața: mediana −1,6% față de ea, 40% pe plus. Mai multe pierderi mici decât câștiguri; niciuna dintre regulile A / B / C n-a trecut.");
    if (x.A === true) av.push("Spălare de levier (OI " + sugPctZ(x.oi) + " în 3 zile, funding negativ): pe istoric, plusul acestui grup a venit din câteva cazuri cu funding extrem (delistări, strângeri de short), nu din preț; fără ele, cam cât piața.");
    if (x.f72 != null && isFinite(x.f72) && x.f72 <= -0.001) av.push("Funding foarte negativ (" + sugPctZ(x.f72, 3) + " pe decontare, media pe 72 h): o strângere de shorturi sau o delistare în curs; pe Pionex funding-ul e altul.");
    if (x.B === "singura") av.push("A căzut singură: BTC explică " + (x.bs != null && isFinite(x.bs) ? sugPc(Math.max(0, Math.min(1, 1 - x.bs))) : "puțin") + " din cădere. Caută întâi cauza (deblocare de tokeni, hack, delistare).");
    if (x.vol != null && x.vol < 20e6) av.push("Lichiditate mică: " + sugMil(x.vol) + " pe Binance (mediana pe 30 de zile); pe Pionex e mai mică. Ordinele tale se văd în piață.");
    if (cd.incomplet) av.push("Ziua are date incomplete (prea puține monede citite): nu intră în probă.");
    l.push({ k: "cad:" + s, grup: "cad", tip: "moneda", s: s, tk: String(x.s || ""), nume: "", dir: et, dirC: "", pret: sugPandaPret(x.c / (x.mult > 1 ? x.mult : 1)), avert: av, x: x,   /* revizia 07.11: 1000PEPE ⇒ prețul unui PEPE, ca pe Pionex */
      sub: sugPctZ(-x.cadere, 0) + " de la maximul pe 30 z" + (x.oi != null ? " · OI " + sugPctZ(x.oi, 0) + " în 3 z" : "") + (x.f72 != null ? " · funding " + sugPctZ(x.f72, 3) : "") + " · " + sugMil(x.vol) + " (locul " + (x.rang || "—") + ")" });
  });
  var ai = d.idei && d.idei.idei, eu = d.sugActiuni && d.sugActiuni.sugestii && d.sugActiuni.sugestii.eu;
  var rev = function (x, piata) {
    var s = sugSim(x), av = [], ist = x.istoric, P = piata === "EU" ? sugPretEU : sugUsd;
    if (x.zileDeLaMin != null && x.zileDeLaMin <= 5) av.push("Revenirea are doar " + sugCate(x.zileDeLaMin, "zi", "zile") + ": prima săptămână de după un minim e cea mai zgomotoasă.");
    if (x.cadere >= 0.8) av.push("Cădere de " + sugPctZ(-x.cadere, 0) + " de la maxim: o firmă în pericol, nu o corecție.");
    av.push("Istoricul paginii intră la închiderea zilei semnalului și nu scade costul: cifrele lui sunt mai bune decât ce prinzi la deschiderea de după.");
    l.push({ k: "rev" + piata + ":" + s, grup: "rev" + piata, tip: "actiune", s: s, tk: x.ticker || s + "_US_EQ", nume: piata === "EU" ? "EU" : "", dir: "revine", dirC: "neutru", pret: P(x.pret), avert: av, x: x,
      sub: sugPctZ(-x.cadere, 0) + " de la maxim, revine · " + sugPctZ(x.deLaMin, 0) + " de la minim" + (x.zileDeLaMin != null ? " (" + x.zileDeLaMin + " z)" : "") + " · stop " + P(x.stop) + " · țintă " + P(x.tinta) + (ist ? " · " + sugCate(ist.n, "trade al tău", "trade-uri ale tale") + ", " + ist.pePlus + " pe plus, " + (typeof TextRo !== "undefined" && TextRo.lei ? TextRo.lei(ist.total, true) : (ist.total >= 0 ? "+" : "−") + Math.abs(Math.round(ist.total)) + " lei") : "") });
  };
  (ai && Array.isArray(ai.reveniri) ? ai.reveniri : []).forEach(function (x) { rev(x, "US"); });
  (eu && Array.isArray(eu.revine) ? eu.revine : []).forEach(function (x) { rev(x, "EU"); });
  var S = d.sectoare;
  (S && Array.isArray(S.sectoare) ? S.sectoare : []).forEach(function (sec) {
    (sec.top || []).forEach(function (t, i) {
      var av = [];
      if (t.r3 >= 1.5) av.push(sugPctZ(t.r3, 0) + " în 3 luni: verifică seria (un salt într-o zi, nu un trend).");
      if (t.max52 > -0.005) av.push("La maximul pe un an: intrarea e în vârf; stopul care urcă e tot ce te apără.");
      l.push({ k: "sect:" + t.s, grup: "sect", tip: "actiune", s: t.s, tk: t.s + "_US_EQ", nume: String(t.nume || "").slice(0, 28) + " · " + sec.ro + " " + sec.etf + " · din " + sec.n + " · " + (i + 1) + "/" + (sec.top || []).length, dir: "trend sus", dirC: "long", pret: sugUsd(t.pret), avert: av, x: t, sec: sec,
        sub: "3 luni " + sugPctZ(t.r3, 0) + " · 6 luni " + sugPctZ(t.r6, 0) + " (sectorul: " + sugPctZ(t.r6 - t.peste6, 0) + ") · " + (t.max52 > -0.005 ? "la maximul pe un an" : sugPctZ(t.max52, 0) + " de la maximul pe un an") });
    });
  });
  var T = d.trend12, conc = T && T.concentrare;
  (T && Array.isArray(T.top) ? T.top : []).forEach(function (t) {
    var av = [];
    if (conc && t.sector === conc.sector) av.push(conc.n + " din cele 20 sunt în " + conc.sector + ": lista e un singur pariu pe sector, nu 20.");
    var rap = t.raporteaza && t.raporteaza.d ? Math.round((Date.parse(t.raporteaza.d + "T12:00:00Z") - Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(acum || Date.now())) + "T12:00:00Z")) / 86400000) : null;
    if (t.salt && t.salt.pct >= 0.5) av.push("Salt " + sugPctZ(t.salt.pct) + " într-o zi (" + t.salt.d + "): verifică seria (split, știre), nu e trend.");
    if (rap != null && rap >= 0) av.push("Raportează în " + rap + "z (" + t.raporteaza.d + "): prețul poate sări 10–20% într-o noapte.");
    l.push({ k: "trend:" + t.s, grup: "trend", tip: "actiune", s: t.s, tk: t.s + "_US_EQ", nume: String(t.nume || "").slice(0, 28) + " " + t.sector + " · 12-1 " + sugPctZ(t.m12) + " · 60 z " + sugPctZ(t.r60) + (rap != null && rap >= 0 ? " · raportează în " + rap + "z" : "") + (t.salt && t.salt.pct >= 0.5 ? " · salt " + sugPctZ(t.salt.pct) + " într-o zi" + (t.salt.d ? " (" + t.salt.d + ")" : "") + " — verifică seria" : ""), dir: "", dirC: "", pret: sugUsd(t.pret), avert: av, x: t,
      sub: "6 luni " + sugPctZ(t.m6, 0) + " · locul " + ((t.rang || 0) + 1) + " din 20" });
  });
  return l;
}
// fișa unui rând: celulele, de ce e în listă, regula, cum a mers (dovada paginii + urmărirea înainte, întregi), ce faci
function sugFisa(r, d, acum) {
  d = d || {}; if (!r) return null;
  var V = SUG_VERDICT[r.grup] || ["—", "n"], f = { k: r.k, lista: (SUG_GRUPURI.filter(function (g) { return g[0] === r.grup; })[0] || [])[1] || "", verdict: V[0], verdictC: "sugVerdict-" + V[1], s: r.s, nume: r.nume, sub: r.sub, pret: r.pret, avert: r.avert.slice(), cele: [], dovada: [], actiuni: [], motiv: "", regula: "", pretNota: "", actNota: "" };
  var x = r.x, sm = d.sugMonede && d.sugMonede.sugestii, urmP = sm && sm.urmarire && sm.urmarire.porn, R = typeof Reveniri !== "undefined" ? Reveniri : null, bz = typeof Busola !== "undefined" && Busola.adresaBusola ? Busola.adresaBusola({ simbol: r.s, tf: "4h" }) : null;
  if (r.grup === "porn") {
    f.pretNota = "din clasament" + (d.clasament && d.clasament.la ? ", la " + sugOra(d.clasament.la, acum) : "");
    f.cele = [{ et: "Interval", v: sugPr(x.latime), sub: "lățimea gridului propus" }, { et: "Net pe grilă", v: sugPr(x.profitGrila, 2), sub: "după comisionul de maker" }, { et: "Treceri pe zi", v: "~" + Math.round(x.traversariZi || 0), sub: "estimare" }, { et: "Grile", v: String(x.grile || "—"), sub: "pasul " + sugPr(x.pas, 2) }, { et: "Volum", v: sugMil(x.volum), sub: x.volum < 1e6 ? "sub 1 M" : "" }, { et: "Mișcarea pe 24\u00a0h", v: sugMis(x.regim).v, sub: sugMis(x.regim).sub }];
    f.motiv = "Moneda e „candidat”: fără mișcare mare în ultimele 24 h, în primele 100 PERP după volum, ordonate după scor (câștig net pe grilă × treceri / grile). " + (SUG_DIR[x.dir] ? "Direcția 4h+1z: " + x.dir + (x.tarie ? " (" + x.tarie + ")" : "") : "Clasamentul n-are încă direcția") + (r.pd ? "; pe 84 de zile: " + r.pd.dir : "") + ".";
    f.regula = "Regula (grid-clasament.js): fără mișcare mare pe 24 h, ordonate după scor. Un filtru (liniște, interval, treceri), nu o predicție; Fișa îți dă setările și proba pe moneda ta.";
    f.dovada = [urmP && urmP.text ? urmP.text : "Urmărirea înainte (la 7 zile fixe, pe zile, față de piața din aceleași zile, după cost) începe de la prima tură a colectorului.",
      "Auditul din 01.11, pe cei 941 de boți ai tăi judecați la pornire: „candidat” față de „de evitat” −0,7 pp în aceleași zile (45 de zile, t −1,1); treimea de sus a scorului: mediana +0,5%, cea de jos +1,1%. Filtrul lasă 89 din 100 de monede; scorul nu ține cont de funding și de comisionul de la pornire.",
      "Gridul îngust urmărit pe aceste monede (auditul din 01.11): −0,8% pe fereastră, pe plus în 11 din 31 de zile. Verdict: n-am aflat; ordinea după scor e un indiciu că nu ajută.",
      (R && R.TEXT_SUPRAVIETUITORI_MONEDE ? R.TEXT_SUPRAVIETUITORI_MONEDE : "Doar monedele care sunt azi pe Pionex: cifra iese mai bună decât a fost în realitate.")];
    f.actiuni = [{ et: "Fișa gridului", c: "sugBtnPlin", act: "gridDeschideMonedaDir('" + sugCurat(r.s) + "','" + (SUG_DIR[x.dir] ? x.dir : "") + "')" }].concat(bz ? [{ et: "🧭 Busola, 4h", c: "", href: bz }] : []);
    f.actNota = "Fișa dă setările și proba pe moneda ta; Busola, imaginea pe 4h.";
  } else if (r.grup === "cad") {   // v100.308: căderile de ieri (în probă)
    var cd = d.caderi || {}, bsP = x.bs != null && isFinite(x.bs) ? Math.max(0, Math.min(1, 1 - x.bs)) : null;
    f.pretNota = "închiderea zilei UTC " + sugCadZi(cd.zi) + " pe Binance (00:00 UTC)" + (x.mult > 1 ? ", împărțită la " + (x.mult === 1000 ? "1.000" : "1.000.000") + " (contractul " + (x.b || "") + ")" : "");
    f.cele = [{ et: "De la maxim", v: sugPctZ(-x.cadere, 0), sub: "față de maximul închiderilor pe 30 de zile" }, { et: "Partea pieței", v: bsP == null ? "—" : sugPc(bsP), sub: "din cădere, explicată de BTC" + (x.beta != null ? " (β " + sugZec(x.beta) + ")" : "") }, { et: "OI pe 3 zile", v: x.oi == null ? "—" : sugPctZ(x.oi), sub: "contracte deschise, Binance" }, { et: "Funding 72 h", v: x.f72 == null ? "—" : sugPctZ(x.f72, 3), sub: "media pe decontare; minus = shorturile plătesc" }, { et: "Lichiditate", v: sugMil(x.vol), sub: "mediana pe 30 de zile, locul " + (x.rang || "—") }, { et: "Etichete", v: sugCadEtichete(x) || "—", sub: "A spălare · B piață / singură · C top 20" }];
    f.motiv = "În ziua UTC " + sugCadZi(cd.zi) + " a închis pentru prima dată la " + sugPctZ(-x.cadere, 0) + " sub maximul închiderilor pe 30 de zile." + (x.A === true ? " Căderea a venit cu spălare de levier (OI " + sugPctZ(x.oi, 0) + " în 3 zile, funding negativ)." : "") + (x.B === "piata" ? " Mai mult de jumătate din cădere o explică BTC." : x.B === "singura" ? " A căzut mai mult singură decât cu piața." : "") + (x.C ? " E printre primele 20 de monede după volum." : "");
    f.regula = "Regula probei din 07.11, fixată înainte de date: prima zi la ≥ 25% sub maximul închiderilor pe 30 de zile, pe monedele cu ≥ 90 de zile de istoric și ≥ 5 M USDT/zi pe Binance (pauză de 14 zile pe monedă). A = OI −10% în 3 zile și funding negativ; B = cât din cădere explică BTC (β pe 60 de zile); C = primele 20 după volum. Cel mult 10 pe zi, după lichiditate. Fapte, nu semnal.";
    f.dovada = ["Pe istoric (Binance 2022-01 … 2026-10, 6.932 de căderi pe 583 de monede, cu cele delistate), față de media monedelor din aceeași zi, după cost (0,2%) și funding: toate căderile −0,1% la 7 zile (mediana −1,6%, 40% pe plus); A (spălare) +1,1% la 3 zile, p 0,29 — tot plusul din 13 cazuri cu funding extrem; B (cu piața vs singură) nimic; C (top 20) +0,6%, p 0,72. Verdict: n-am aflat. Proba ar fi prins un efect de ~2% (A) sau ~2,5% (C) de 8–9 ori din 10.",
      sugCadUrm(cd),
      "Prețurile sunt ale Binance (reperul pieței); pe Pionex prețul și funding-ul diferă puțin. Nu e semnal de cumpărare: de aceea lista nu duce la Poartă și nu dă o sumă."];
    f.actiuni = [{ et: "Fișa monedei", c: "sugBtnPlin", act: "gridDeschideMonedaDir('" + sugCurat(r.s) + "','')" }].concat(bz ? [{ et: "🧭 Busola, 4h", c: "", href: bz }] : []);
    f.actNota = "În probă: fără Poartă și fără sumă. Fișa îți dă proba gridului pe monedă; Busola, imaginea pe 4h.";
  } else if (r.grup === "revUS" || r.grup === "revEU") {
    var ai = d.idei && d.idei.idei, eu = d.sugActiuni && d.sugActiuni.sugestii && d.sugActiuni.sugestii.eu, ist = x.istoric, P = r.grup === "revEU" ? sugPretEU : sugUsd, RA = sugRegRev(R);
    f.pretNota = r.grup === "revEU" ? "închiderea de ieri (Yahoo), în moneda bursei" : "închiderea de ieri (Yahoo)";
    f.cele = [{ et: "De la maxim", v: sugPctZ(-x.cadere, 0), sub: "pe 60 de zile de bursă" }, { et: "De la minim", v: sugPctZ(x.deLaMin, 0), sub: x.zileDeLaMin != null ? "în " + sugCate(x.zileDeLaMin, "zi", "zile") : "" }, { et: "Stop propus", v: P(x.stop), sub: (x.pret > 0 ? sugPctZ(x.stop / x.pret - 1) + " de acum · " : "") + "1% sub minimul pe " + sugCate(RA.minZile, "zi", "zile") }, { et: "Țintă", v: P(x.tinta), sub: (x.pret > 0 ? sugPctZ(x.tinta / x.pret - 1) + " · " : "") + "vechiul maxim pe " + sugCate(RA.maxZile, "zi", "zile") + ", nu o prognoză" }].concat(ist ? [{ et: "Istoricul tău", v: sugCate(ist.n, "trade", "trade-uri"), sub: ist.pePlus + " pe plus · " + (typeof TextRo !== "undefined" && TextRo.lei ? TextRo.lei(ist.total, true) : (ist.total >= 0 ? "+" : "−") + Math.abs(Math.round(ist.total)) + " lei") }] : []);
    f.motiv = "A scăzut " + sugPctZ(-x.cadere, 0) + " de la maximul pe 60 de zile de bursă și a urcat " + sugPctZ(x.deLaMin, 0) + " de la minim: prima revenire după cădere.";
    // v100.293 (02.11): regula întreagă - condițiile din reveniri.js (vechimea minimului, media pe 5 zile) + tăietura turelor (tura-idei, tura-sugestii-actiuni: cel mult 10)
    f.regula = "Regula (reveniri.js): cădere de cel puțin " + Math.round(RA.cadere * 100) + "% de la maximul pe " + sugCate(RA.maxZile, "zi", "zile") + " de bursă, apoi prețul urcat cu cel puțin " + Math.round(RA.revenire * 100) + "% de la minimul pe " + sugCate(RA.minZile, "zi", "zile") + "."
      + " Și: minimul e vechi de cel puțin " + sugCate(RA.vechimeZile, "zi", "zile") + ", iar prețul e peste media ultimelor " + sugCate(RA.medieZile, "zi", "zile") + "; cel mult 10 pe zi, cea mai mare cădere întâi" + (r.grup === "revEU" ? "; seriile în care prețul sare într-o zi de peste 3 ori, în sus sau în jos (pence ↔ lire, split), nu intră" : "") + "."
      + " Proba istorică: intrare la închiderea zilei semnalului, " + sugCate(RA.orizontZile, "zi", "zile") + " de bursă, fără cost.";
    var dov = r.grup === "revUS" ? (R && ai ? R.textDovada(ai.dovadaReveniri, "actiuni") : null) : (eu && eu.dovada && eu.dovada.revine ? eu.dovada.revine.text : null);
    f.dovada = [dov || "Istoricul se socotește la 8:00."];
    if (r.grup === "revUS") f.dovada.push(ai && ai.urmarireReveniri && ai.urmarireReveniri.text ? "Urmărit înainte (semnalele de cel puțin 14 zile, la prețul de azi, numărate pe semnal, fără comparație cu piața; după comision): " + ai.urmarireReveniri.text : "Urmărirea înainte începe de la prima tură: semnalele de cel puțin 14 zile, la prețul de azi, numărate pe semnal, fără comparație cu piața.", "Auditul din 01.11, numărat pe zile: −6,0% după cost la 10 zile, +0,5% față de QQQ (52 de intrări, 10 zile; peste QQQ în 7 din 10 zile). Verdict: n-am aflat.");
    else f.dovada.push("Pe EU nu e încă urmărire înainte (începe de la prima tură). Verdict: n-am aflat.");
    f.dovada.push((R && R.TEXT_SUPRAVIETUITORI ? R.TEXT_SUPRAVIETUITORI + " " : "") + "Firmele sunt cele listate azi; cele care au căzut din listă lipsesc, deci istoricul e optimist.");
    // 🔴3 (revizia 01.11): Poarta construiește tickerul `SIMBOL_US_EQ` - pe EU ar deschide alt instrument (SAP ⇒ ADR-ul american, AIR ⇒ AAR Corp)
    f.actiuni = r.grup === "revEU" ? [] : [{ et: "Poarta Trading 212", c: "sugBtnPlin", act: "sugLaPoarta('" + sugCurat(r.s) + "')" }];
    f.actNota = r.grup === "revEU" ? "Poarta știe doar acțiunile US (tickerul _US_EQ, prețurile zilnice): pe EU ar deschide alt instrument. Planul îl pui în Trading 212 pe tickerul " + sugEsc(x.ticker || r.s) + "." : "Poarta îți dă planul, stopul, mărimea și ce se mișcă la fel cu ce ai deja.";
  } else if (r.grup === "sect") {
    var S = d.sectoare || {}, sec = r.sec || {}, ist2 = S.istoric || {}, i = Number(String(r.nume).match(/ (\d+)\/\d+$/) && String(r.nume).match(/ (\d+)\/\d+$/)[1]) || 1;
    f.pretNota = "închiderea de ieri";
    f.cele = [{ et: "3 luni", v: sugPctZ(x.r3, 0), sub: "față de sector " + sugPctZ(x.peste3, 0) }, { et: "6 luni", v: sugPctZ(x.r6, 0), sub: "față de sector " + sugPctZ(x.peste6, 0) }, { et: "De la maximul pe un an", v: x.max52 > -0.005 ? "la maxim" : sugPctZ(x.max52, 0), sub: "" }, { et: "Locul în sector", v: i + " din " + (sec.n || "—"), sub: "firme mari judecate" }];
    f.motiv = "Trend în sus (prețul peste media de 50 de zile, ea peste cea de 200) și printre cele mai puternice 3 din sectorul " + (sec.ro || "—") + " pe 3 și 6 luni.";
    f.regula = "Regula, fixată înainte de cifre: în fiecare sector, doar acțiunile cu trend în sus (prețul peste media de 50 de zile, ea peste cea de 200), ordonate după cât au urcat pe 3 și pe 6 luni față de celelalte din sector. Un clasament, nu o predicție.";
    f.dovada = [ist2.luni ? "Pe ultimele " + ist2.luni + " luni, primele 3 din fiecare sector, ținute o lună, au făcut în medie " + sugPctZ(ist2.medie) + " pe lună față de media sectorului, pe plus în " + ist2.luniPlus + " din " + ist2.luni + " luni. ⚠ Firmele sunt cele mari de AZI (cele care au căzut din top lipsesc), deci istoricul e optimist; momentumul pe 3–12 luni are un avantaj documentat în studii, nu dovedit pe banii tăi - jurnalul verdictelor îl măsoară de acum. Istoricul paginii e fără cost." : "Istoricul se face o dată pe zi, de la 8:00.",
      "Auditul din 01.11, refăcut pe date calendaristice, după cost: +1,1% pe lună, 8 din 11 luni (t 1,1). Semnul se întoarce după cum cad granițele lunilor. Verdict: n-am aflat."];
    f.actiuni = [{ et: "Poarta Trading 212", c: "sugBtnPlin", act: "sugLaPoarta('" + sugCurat(r.s) + "')" }];
    f.actNota = "Apasă pe „Poarta Trading 212”: se deschide Poarta din Trading 212 (planul, stopul, mărimea, ce se mișcă la fel cu ce ai deja). Sectoarele sunt după clasificarea Nasdaq, care diferă uneori de cea S&P (Visa și Mastercard apar la Consum ciclic, transportul de gaze la Utilități).";
  } else if (r.grup === "trend") {
    var T = d.trend12 || {}, bl = T.bilant || {}, probat = bl && /^probat/i.test(String(bl.verdict || "")) ? "1" : "";
    f.pretNota = "închiderea de ieri";
    f.cele = [{ et: "Randament lunile 2–12", v: sugPctZ(x.m12), sub: "ultima lună sărită" }, { et: "60 de zile", v: sugPctZ(x.r60), sub: "" }, { et: "6 luni", v: sugPctZ(x.m6, 0), sub: "" }, { et: "Locul", v: ((x.rang || 0) + 1) + " din 20", sub: "din ~600 de acțiuni ≥ 2 mld. $" }];
    f.motiv = "Primele 20% după randamentul pe lunile 2–12, cu momentum pozitiv; regimul (SPY peste media pe 200 de zile) e " + (T.regim && T.regim.peste ? "pornit" : "oprit") + ".";
    f.regula = "Regula, fixată înainte de cifre: primele 20% după randamentul pe lunile 2–12 (ultima lună sărită), cu momentum pozitiv, din ~600 de acțiuni SUA ≥ 2 mld. $; regim = SPY peste media pe 200 de zile. Se ține 20–60 de zile, fără stop strâns; iese când cade din top 20 % sau când regimul se oprește.";
    f.dovada = ["Pe 5 ani, față de alte acțiuni în aceleași zile, doar un indiciu (+0,8% pe 20 de zile, t ≈ 1,5 pe ferestre care nu se suprapun — sub pragul de „probat”), NEprobat pe listă istorică ⇒ în probă — nu e un buton de cumpărat. Cifrele: auditul din 14.10.",
      "Nota robotului: " + sugTrendNota(T, acum).text + ". Poarta nu dimensionează pe el până nu spune bilanțul „probat”.",
      "Judecata: jurnalul verdictelor, sursa „Trend 12 luni”, la 20 și 60 de zile față de S&P 500 (SPY); fiecare zi se judecă întreagă, ca un coș. Cifrele robotului (Decision App) nu sunt verificate aici: e o aplicație separată."];
    f.actiuni = [{ et: "Poarta Trading 212", c: "sugBtnPlin", act: "sugLaPoarta('" + sugCurat(r.s) + "','trend12','" + probat + "')" }];
    f.actNota = "Apasă pe „Poarta Trading 212”: se deschide Poarta din Trading 212, cu planul și riscul tău.";
  }
  return f;
}
// v100.196 (auditul sever 14.10, 🟡7): k = de unde vine simbolul ("trend12" = Trend 12 luni, în probă) și probat = bilanțul robotului zice „probat”;
// Poarta (t212.poartaSursa) dă atunci verdictul, dar nu dă o sumă până la „probat” - înainte fraza de sub listă promitea asta și nimic n-o făcea
function sugLaPoarta(sim, k, probat) {
  var s = String(sim || "").replace(/[^A-Za-z0-9.-]/g, "");
  if (typeof t212 !== "undefined" && t212) t212.poartaSursa = k ? { s: s.toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 12), k: String(k), probat: probat === true || probat === "1" } : null;
  if (typeof deschideT212 === "function") deschideT212(); setTimeout(function () { if (typeof t212BiletPentru === "function") t212BiletPentru(s); }, 900);
}
// rândul ales (implicit primul), intervalul graficului lui (implicit 1z), lumânările ținute pe cheie „rând|interval”
sugStare.graf = sugStare.graf || {}; sugStare.grafInLucru = sugStare.grafInLucru || {}; sugStare.tf = sugStare.tf || null; sugStare.ales = sugStare.ales || null;   // tf null = încă n-a ales: implicitul tipului
// v100.310 (el, 07.11: „un gol imens și o listă lungă”; ales „Primele 5, restul la un clic”): fiecare listă arată primele 5 rânduri,
// restul stau în pagină pliate (clasa sugPeste) până la „Arată încă N”; ce a deschis rămâne deschis pe aparatul ăsta; rândul ales nu se pliază
var SUG_PRIMELE = 5, SUG_DESF_CHEIE = "cryptoRadarSugDesfacuteV1";
sugStare.desfacute = sugStare.desfacute || (function () { try { var o = JSON.parse(localStorage.getItem(SUG_DESF_CHEIE) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } })();
function sugDesface(k) {
  k = String(k || ""); if (!k) return;
  if (sugStare.desfacute[k]) delete sugStare.desfacute[k]; else sugStare.desfacute[k] = true;
  try { localStorage.setItem(SUG_DESF_CHEIE, JSON.stringify(sugStare.desfacute)); } catch (e) {}
  sugDeseneaza();
  // la închidere lista se scurtează sub deget: butonul rămâne în ecran
  var b = !sugStare.desfacute[k] && typeof document !== "undefined" ? document.getElementById("sugMai-" + k) : null;
  if (b && b.getBoundingClientRect && b.scrollIntoView) { var r = b.getBoundingClientRect(); if (r.top < 70 || r.bottom > (window.innerHeight || 0)) b.scrollIntoView({ block: "center" }); }
}
function sugRandAles(d, acum) { var l = sugRanduri(d || sugStare.d, acum); var r = null; for (var i = 0; i < l.length; i++) if (l[i].k === sugStare.ales) r = l[i]; return r || l[0] || null; }
// intervalul implicit: monede 4h (intervalul clasamentului și al Fișei), acțiuni 1 zi; alegerea lui rămâne cât e în lista rândului
function sugTfAles(r) { var L = SUG_TF[r && r.tip] || SUG_TF.actiune; for (var i = 0; i < L.length; i++) if (L[i][0] === sugStare.tf) return L[i]; return r && r.tip === "moneda" ? L[0] : L[L.length - 1]; }
function sugBare(rasp) {
  var l = rasp && rasp.randuri ? rasp.randuri : rasp && rasp.data && rasp.data.klines ? rasp.data.klines : rasp && rasp.klines ? rasp.klines : [];
  return (Array.isArray(l) ? l : []).map(function (x) { return { t: Number(x.time != null ? x.time : x.t), o: Number(x.open != null ? x.open : x.o), h: Number(x.high != null ? x.high : x.h), l: Number(x.low != null ? x.low : x.l), c: Number(x.close != null ? x.close : x.c), v: Number(x.volume || x.v || 0) }; }).filter(function (b) { return isFinite(b.t) && b.c > 0; }).sort(function (a, b) { return a.t - b.t; });
}
// v100.292 (revizia 01.11, 🟡6): graficul stă în cache ca {la, html[, eroare]} - 5 minute (cât reîmprospătarea paginii), apoi se aduce din nou;
// eroarea (sau prea puține lumânări) se arată, dar nu se ține: următorul apel cere din nou; „în lucru” e o hartă separată, deci apelurile
// paralele pe aceeași cheie fac O cerere (înainte santinela era "", care e falsă)
var SUG_GRAF_MIN = 5 * 60000;
function sugGrafHtml(cheie) { var g = sugStare.graf[cheie]; return g && typeof g === "object" ? String(g.html || "") : ""; }
async function sugGraficAdu(r) {
  if (!r) return; var tf = sugTfAles(r), cheie = r.k + "|" + tf[0], g = sugStare.graf[cheie];
  if (sugStare.grafInLucru[cheie] || (g && typeof g === "object" && !g.eroare && Date.now() - g.la < SUG_GRAF_MIN)) return;
  sugStare.grafInLucru[cheie] = true;
  var html = "", eroare = false;
  try {
    var u = r.tip === "moneda" ? "/api/market?type=pionex_klines&symbol=" + encodeURIComponent(r.tk) + "&interval=" + tf[1] + "&limit=180" : "/api/t212?action=preturi&interval=" + tf[1] + "&ticker=" + encodeURIComponent(r.tk);
    var b = sugBare(await getJSON(u)).slice(-180), el = typeof document !== "undefined" ? document.getElementById("sugGraf") : null, W = Math.max(300, (el && el.clientWidth) || 700);
    if (b.length < 10 || typeof GraficBot === "undefined") { html = '<p class="tbSub">Graficul apare după ce vin lumânările (cel puțin 10).</p>'; eroare = true; }
    else {
      // 🟡7: „acum” e închiderea ultimei lumânări aduse (mai proaspătă decât prețul orar din clasament; la acțiuni, ultima închidere); nivelurile sunt cele PROPUSE de regulă, nu „ale tale”
      var x = r.x || {}, niv = r.grup === "revUS" || r.grup === "revEU" ? { stop: x.stop > 0 ? x.stop : null, tinta: x.tinta > 0 ? x.tinta : null } : null;
      var nivL = niv && GraficBot.niveluriActiune ? GraficBot.niveluriActiune({ pretMediu: null, stop: niv.stop, tinta: niv.tinta }).map(function (n) { if (n.k === "stop") n.t = "stopul propus"; if (n.k === "tinta") n.t = "ținta propusă"; return n; }) : null;
      var d = GraficBot.desen({ bare: b, W: W, ingust: W < 560, st: { ema: true }, actiune: true, pretViu: b[b.length - 1].c, tfGrafic: tf[1].toUpperCase(), etTf: "lumânări de " + tf[2], niv: nivL });
      html = '<div class="gbZona">' + (d.svg || "") + '</div>' + (d.valori || '') + '<div class="gbLeg">' + (d.legenda || "") + '</div>';   /* fasia valorilor, ca pe T212 (garda v100.154) */
    }
  } catch (e) { html = '<p class="tbSub">N-am putut aduce lumânările: ' + sugEsc(e && e.message || e) + '</p>'; eroare = true; }
  sugStare.graf[cheie] = { la: Date.now(), html: html, eroare: eroare }; delete sugStare.grafInLucru[cheie];
  sugDeseneaza();
}
async function sugAlege(k) { sugStare.ales = String(k || ""); sugDeseneaza(); await sugGraficAdu(sugRandAles()); }
function sugAlegeTf(tf) { var r = sugRandAles(); if (!r) return; var L = SUG_TF[r.tip] || SUG_TF.actiune, ok = false; for (var i = 0; i < L.length; i++) if (L[i][0] === tf) ok = true; if (!ok) return; sugStare.tf = tf; sugDeseneaza(); return sugGraficAdu(r); }
function sugVerdicteHtml(d) {
  var sm = d.sugMonede && d.sugMonede.sugestii, urmP = sm && sm.urmarire && sm.urmarire.porn, ai = d.idei && d.idei.idei, T = d.trend12;
  var cel = function (et, k, sub) { var V = SUG_VERDICT[k]; return '<div><span class="tbEt2">' + sugEsc(et) + '</span><span class="sugVerdict sugVerdict-' + V[1] + '">' + V[0] + '</span><p class="tbSub">' + sugEsc(sub) + '</p></div>'; };
  var cd = d.caderi, uE = cd && cd.urmarire && cd.urmarire.grupuri && cd.urmarire.grupuri.E;   /* v100.308 */
  return '<div class="sugVerdicte" data-sug="verdicte">' + cel("Pe ce aș porni un bot", "porn", urmP && urmP.n ? urmP.text : "auditul 01.11, pe boții tăi: „candidat” față de „de evitat” −0,7 pp în aceleași zile (45 de zile)")
    + cel("După o cădere mare · monede", "cad", uE && uE.n ? "urmărit înainte: " + sugCate(uE.n, "cădere", "căderi") + ", la 7 zile " + sugP1(uE.stat) + " față de piață (istoric −0,1%)" : "proba din 07.11 (6.932 de căderi, 2022–2026): A, B, C n-am aflat; urmărirea înainte pornește de la 07.11")
    + cel("Pe revenire · acțiuni", "revUS", ai && ai.urmarireReveniri && ai.urmarireReveniri.n ? "urmărit înainte (semnalele de cel puțin 14 zile, la prețul de azi): " + ai.urmarireReveniri.text : "auditul 01.11, SUA: −6,0% după cost la 10 zile, +0,5% față de QQQ")
    + cel("Cele mai tari pe sectoare", "sect", "auditul 01.11: +1,1% pe lună față de sector, după cost, 8 din 11 luni (t 1,1)") + cel("Trend 12 luni", "trend", T && T.top && T.top.length ? sugTrendProba(T) : "aștept clasamentul robotului") + '</div>';
}
function sugListaHtml(d, acum) {
  var g = sugGrupuri(d, acum), l = sugRanduri(d, acum), ales = sugRandAles(d, acum), f = sugFisa(ales, d, acum), h = '<section class="rlSec sugLista2" data-sug="lista"><div class="sugPandaCap"><h4>Sugestiile</h4><span class="tbSub">' + sugCate(l.length, "rând", "rânduri") + ' în ' + sugCate(g.length, "listă", "liste") + ' · atinge un rând: fișa lui, cu de ce e în listă, cum a mers regula și ce faci</span></div><div class="sugCorp" style="--n:', c = "", nVaz = 0;   // v100.310: --n = doar ce se vede (pliatele nu ocupă rânduri în grilă)
  g.forEach(function (gr) {
    c += '<h4 class="sugGrup">' + sugEsc(gr.titlu) + ' <span class="sugVerdict ' + gr.verdictC + '">' + gr.verdict + '</span><span class="tbSub">' + (gr.subHtml || sugEsc(gr.sub)) + '</span></h4>'; nVaz++;
    var rg = l.filter(function (r) { return r.grup === gr.k; }), desf = !!sugStare.desfacute[gr.k], pliate = 0;
    rg.forEach(function (r, i) {
      var e = ales && r.k === ales.k, peste = !desf && i >= SUG_PRIMELE && !e;   // v100.310: după primele 5 se pliază, afară de rândul ales
      if (peste) pliate++; else nVaz++;
      c += '<button type="button" class="sugRand' + (r.aziNu ? ' sugAziNu' : '') + (e ? ' ales' : '') + (peste ? ' sugPeste' : '') + '" id="sugR-' + sugEsc(r.k) + '" data-grup="' + r.grup + '" aria-pressed="' + e + '" data-action-click="sugAlege(\'' + sugEsc(r.k) + '\')">'
        + '<span class="sugRandSim"><b>' + sugEsc(r.s) + '</b>' + (r.nume ? ' <span class="tbSub">' + sugEsc(r.nume) + '</span>' : '') + (r.dir ? ' <span class="sugDir ' + sugEsc(r.dirC) + '">' + sugEsc(r.dir) + '</span>' : '') + '</span><span class="sugRandPret">' + sugEsc(r.pret) + '</span>'
        + '<span class="sugRandSub tbSub">' + sugEsc(r.sub) + (r.avert.length ? ' <span class="sugAv">⚠ ' + r.avert.length + '</span>' : '') + '</span></button>';
      if (e) c += sugFisaHtml(f, r);
    });
    if (rg.length > SUG_PRIMELE && (desf || pliate > 0)) {   // v100.310: un singur buton pe listă, sub rândurile ei; spune exact ce face
      c += '<button type="button" class="sugMaiMult" id="sugMai-' + sugEsc(gr.k) + '" aria-expanded="' + desf + '" data-action-click="sugDesface(\'' + sugEsc(gr.k) + '\')">' + (desf ? "▴ Arată doar primele " + SUG_PRIMELE : "▾ Arată încă " + sugCate(pliate, "rând", "rânduri")) + '</button>'; nVaz++;
    }
    if (!rg.length) { c += '<p class="sugGol">' + sugEsc(gr.k === "porn" && /pauz/i.test(gr.sub) ? gr.sub : gr.gol || "nimic acum") + '</p>'; nVaz++; }
  });
  if (!ales) { c += '<p class="sugGol">Nicio sugestie acum.</p>'; nVaz++; }
  return h + nVaz + '">' + c + '</div></section>';
}
function sugFisaHtml(f, r) {
  if (!f) return "";
  var tf = sugTfAles(r), L = SUG_TF[r.tip] || SUG_TF.actiune, graf = sugGrafHtml(r.k + "|" + tf[0]);
  return '<section class="tbBloc sugFisa" id="sugFisa" aria-label="Fișa sugestiei"><div class="sugFisaCap"><div><span class="sugVerdict sugVerdict-n">' + sugEsc(f.lista) + '</span> <span class="sugVerdict ' + f.verdictC + '">' + f.verdict + '</span><div class="sugFisaSim">' + sugEsc(f.s) + ' <span class="tbSub">' + sugEsc(f.nume) + '</span></div><p class="tbSub">' + sugEsc(f.sub) + '</p></div><div class="sugFisaPret"><b>' + sugEsc(f.pret) + '</b><span class="tbSub">' + sugEsc(f.pretNota) + '</span></div></div>'
    + '<div class="sugCel">' + f.cele.map(function (c) { return '<div><span class="tbEt2">' + sugEsc(c.et) + '</span><b>' + sugEsc(c.v) + '</b><span class="tbSub">' + sugEsc(c.sub) + '</span></div>'; }).join("") + '</div>'
    + (f.avert.length ? '<div class="sugBlocA"><h5>Înainte să intri</h5>' + f.avert.map(function (a) { return '<p class="sugAvert">' + sugEsc(a) + '</p>'; }).join("") + '</div>' : '')
    + '<div class="sugBloc"><h5>De ce e în listă</h5><p>' + sugEsc(f.motiv) + '</p><p class="tbSub">' + sugEsc(f.regula) + '</p></div>'
    + '<div class="sugBloc"><h5>Cum a mers regula · fixată înainte de cifre</h5>' + f.dovada.map(function (t) { return '<p>' + sugEsc(t) + '</p>'; }).join("") + '</div>'
    + '<div class="sugBloc"><div class="tbInterval sugTfGrup" role="group" aria-label="Intervalul graficului ' + sugEsc(f.s) + '">' + L.map(function (t) { return '<button type="button" class="tbIntBtn" aria-pressed="' + (t[0] === tf[0]) + '" data-action-click="sugAlegeTf(\'' + t[0] + '\')">' + t[0] + '</button>'; }).join("") + '</div><div id="sugGraf">' + (graf || '<p class="tbSub">Aduc lumânările de ' + sugEsc(tf[2]) + '…</p>') + '</div></div>'
    + '<div class="sugActiuni">' + f.actiuni.map(function (a) { return a.href ? '<a class="t212BtnLinie" href="' + sugEsc(a.href) + '" target="_blank" rel="noopener">' + sugEsc(a.et) + '</a>' : '<button type="button" class="t212BtnLinie ' + sugEsc(a.c) + '" data-action-click="' + sugEsc(a.act) + '">' + sugEsc(a.et) + '</button>'; }).join("") + '<span class="tbSub">' + sugEsc(f.actNota) + '</span></div></section>';
}
function sugHtml(d, acum) {
  d = d || {};
  return '<p class="rlRasp" data-sug="rasp">Nicio listă de mai jos n-are un avantaj dovedit (auditul din 01.11, numărat pe zile, față de piața din aceleași zile, după cost): verdictul fiecăreia e lângă titlu, iar cum a mers regula e în fișa fiecărui rând. Un filtru, nu o predicție - judeci tu.</p>'
    + sugPandaHtml(d.latime, d.boti, acum) + sugVerdicteHtml(d) + sugListaHtml(d, acum)
    + '<p class="tbSub" data-sug="nota">Regulile au fost fixate înainte de cifre și nu se ajustează după istoric; fiecare listă își spune intrarea, ieșirea și costul în fișă, iar urmărirea înainte e la orizont fix, numărată pe zile, față de piața din aceleași zile. Scoase de pe pagină la cererea ta (01.11), fără avantaj dovedit: Pe revenire (monede), Pentru short, Idei de cumpărare, Început de urcare, Revers timpuriu, Gap / Pre-market.</p>';
}
// v100.243: o secțiune își schimbă cifrele pe loc. Pagina întreagă se rescrie doar la primul desen
// sau când apare ori dispare un bloc. „arată toate” nu e parte din schelet: rămâne deschisă.
// v100.288: nici `randPlin` (cardul întins pe tot rândul de lib/asezare-randuri.js): nodul rămâne, clasa o scoate doar așezarea.
function sugSchelet(h) { return String(h || "").replace(/>([^<]*)</g, "><"); }
// v100.292 (revizia 01.11, 🔴1): clasa citită din atribut - pe <svg> className e SVGAnimatedString, iar String() dă „[object SVGAnimatedString]”;
// SVG-ul graficului e un bloc întreg (formele stau în atribute: d, x, y, pe care alinierea nu le sincronizează): egal doar dacă e identic
function sugClasa(n) { var c = n && n.getAttribute ? n.getAttribute("class") : null; return String(c == null ? (typeof n.className === "string" ? n.className : "") : c); }
function sugOpac(n) { return !!n && n.nodeType === 1 && /^svg$/i.test(String(n.tagName || "")); }
function sugAcelasiNod(a, b) {
  if (!a || !b || a.nodeType !== 1 || b.nodeType !== 1 || a.tagName !== b.tagName) return false;
  if (sugOpac(a)) return a.outerHTML === b.outerHTML;
  var ca = sugClasa(a).replace(/\brandPlin\b/g, "").replace(/\s+/g, " ").trim();
  var cb = sugClasa(b).replace(/\brandPlin\b/g, "").replace(/\s+/g, " ").trim();
  if (ca !== cb) return false;
  if ((a.getAttribute("href") || "") !== (b.getAttribute("href") || "")) return false;
  if ((a.getAttribute("data-action-click") || "") !== (b.getAttribute("data-action-click") || "")) return false;
  var ae = [], be = [], i, j;
  for (i = 0; i < a.childNodes.length; i++) if (a.childNodes[i].nodeType === 1) ae.push(a.childNodes[i]);
  for (j = 0; j < b.childNodes.length; j++) if (b.childNodes[j].nodeType === 1) be.push(b.childNodes[j]);
  if (ae.length !== be.length) return false;
  for (i = 0; i < ae.length; i++) if (!sugAcelasiNod(ae[i], be[i])) return false;
  return true;
}
function sugTexte(n, L) {
  for (var i = 0; i < n.childNodes.length; i++) {
    var c = n.childNodes[i];
    if (c.nodeType === 3) L.push(c);
    else if (c.nodeType === 1) sugTexte(c, L);
  }
}
function sugPeLoc(el, h) {
  if (!el || typeof document === "undefined") return false;
  var tmp = document.createElement("div"); tmp.innerHTML = h; var nou = tmp.firstElementChild;
  if (!nou || !sugAcelasiNod(el, nou)) return false;
  var a = [], b = []; sugTexte(el, a); sugTexte(nou, b);
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i].nodeValue !== b[i].nodeValue) a[i].nodeValue = b[i].nodeValue;
  sugPuneTitle(el, nou);
  return true;
  function sugPuneTitle(x, y) {
    if (!x || x.nodeType !== 1 || !y || y.nodeType !== 1 || !x.getAttribute || !y.getAttribute) return;
    var t = y.getAttribute("title"), i, xe = [], ye = [];
    if (t) { if (x.getAttribute("title") !== t) x.setAttribute("title", t); }
    else if (x.getAttribute("title") != null && typeof x.removeAttribute === "function") x.removeAttribute("title");
    for (i = 0; i < x.childNodes.length; i++) if (x.childNodes[i].nodeType === 1) xe.push(x.childNodes[i]);
    for (i = 0; i < y.childNodes.length; i++) if (y.childNodes[i].nodeType === 1) ye.push(y.childNodes[i]);
    for (i = 0; i < xe.length && i < ye.length; i++) sugPuneTitle(xe[i], ye[i]);
  }
}
// v100.292: ajutoarele coloanelor grilelor de carduri (v100.244) au plecat odata cu grilele; lista + fisa au latimea din CSS (container query)
function sugAlinia(vechi, nou) {
  function elemente(n) {
    var L = [], i;
    for (i = 0; i < n.childNodes.length; i++) if (n.childNodes[i].nodeType === 1) L.push(n.childNodes[i]);
    return L;
  }
  function cheieRand(n) {
    var i, c, tag, t, j, act;
    if (!n || n.nodeType !== 1) return "";
    act = n.getAttribute ? n.getAttribute("data-action-click") : null;
    if (act) return "act:" + act;
    for (i = 0; i < n.childNodes.length; i++) {
      c = n.childNodes[i];
      if (!c || c.nodeType !== 1) continue;
      tag = String(c.tagName || "").toUpperCase();
      if (tag !== "B" && tag !== "BUTTON") continue;
      t = "";
      for (j = 0; j < c.childNodes.length; j++) if (c.childNodes[j].nodeType === 3) t += c.childNodes[j].nodeValue;
      t = t.replace(/\s+/g, " ").trim();
      if (t) return tag + ":" + t;
    }
    return "";
  }
  function cheieBaza(n) {
    var cls = sugClasa(n).replace(/\brandPlin\b/g, "").replace(/\bales\b/g, "").replace(/\s+/g, " ").trim();
    return String(n.tagName || "").toUpperCase() + "." + cls;
  }
  function chei(lista) {
    var vazut = {}, out = [], i, k, b;
    for (i = 0; i < lista.length; i++) {
      k = cheieRand(lista[i]);
      if (!k) {
        b = cheieBaza(lista[i]);
        vazut[b] = (vazut[b] || 0) + 1;
        k = b + "#" + vazut[b];
      } else {
        vazut[k] = (vazut[k] || 0) + 1;
        if (vazut[k] > 1) k = k + "#" + vazut[k];
      }
      out.push(k);
    }
    return out;
  }
  function puneClasa(a, b) {
    var clsV = " " + sugClasa(a).replace(/\s+/g, " ") + " ";
    var cls = sugClasa(b).replace(/\s+/g, " ").trim();
    if (clsV.indexOf(" randPlin ") >= 0 && (" " + cls + " ").indexOf(" randPlin ") < 0) cls = (cls + " randPlin").trim();
    a.className = cls;
    if (a.setAttribute) a.setAttribute("class", cls);
  }
  function puneLegatura(a, b) {
    var i, k, v, nume = ["href", "data-action-click", "title", "aria-pressed", "aria-expanded"];   // v100.292: rândul ales își schimbă și aria-pressed, nu doar clasa; v100.310: butonul „Arată încă” - aria-expanded
    for (i = 0; i < nume.length; i++) {
      k = nume[i];
      v = b.getAttribute ? b.getAttribute(k) : null;
      if (v) a.setAttribute(k, v);
      else if (a.getAttribute && a.getAttribute(k) != null && a.removeAttribute) a.removeAttribute(k);
    }
  }
  function sincronTexte(a, b) {
    var ta = [], tb = [], i, n;
    for (i = 0; i < a.childNodes.length; i++) if (a.childNodes[i].nodeType === 3) ta.push(a.childNodes[i]);
    for (i = 0; i < b.childNodes.length; i++) if (b.childNodes[i].nodeType === 3) tb.push(b.childNodes[i]);
    n = Math.min(ta.length, tb.length);
    for (i = 0; i < n; i++) if (ta[i].nodeValue !== tb[i].nodeValue) ta[i].nodeValue = tb[i].nodeValue;
    for (i = n; i < tb.length; i++) a.appendChild(tb[i]);
    for (i = ta.length - 1; i >= n; i--) if (ta[i].parentNode) ta[i].parentNode.removeChild(ta[i]);
  }
  function alinia(a, b) {
    if (!a || !b || a.nodeType !== 1 || b.nodeType !== 1) return false;
    if (String(a.tagName).toUpperCase() !== String(b.tagName).toUpperCase()) return false;
    puneClasa(a, b);
    puneLegatura(a, b);
    var ae = elemente(a), be = elemente(b), ak = chei(ae), bk = chei(be);
    var harta = {}, i, j, gasit, ordine = [], folosit = {};
    for (i = 0; i < ae.length; i++) if (!harta[ak[i]]) harta[ak[i]] = ae[i];
    for (j = 0; j < be.length; j++) {
      gasit = harta[bk[j]];
      if (gasit && !folosit[bk[j]] && sugOpac(gasit)) {   // v100.292 (revizia 01.11, 🔴1): graficul se înlocuiește întreg când diferă
        if (gasit.outerHTML === be[j].outerHTML) { folosit[bk[j]] = 1; ordine.push(gasit); } else ordine.push(be[j]);
      } else if (gasit && !folosit[bk[j]]) {
        if (!alinia(gasit, be[j])) return false;
        folosit[bk[j]] = 1;
        ordine.push(gasit);
      } else ordine.push(be[j]);
    }
    for (i = 0; i < ae.length; i++) if (!folosit[ak[i]] && ae[i].parentNode) ae[i].parentNode.removeChild(ae[i]);
    for (j = 0; j < ordine.length; j++) a.appendChild(ordine[j]);
    sincronTexte(a, b);
    return true;
  }
  return alinia(vechi, nou);
}
// v100.292: --n (rândurile din coloana 1, pentru grila listă + fișă) se pune după FIECARE desen: alinierea pe loc nu sincronizează style-ul,
// deci --n rămânea cel de la primul desen (01.11, poza la 1920: 5 în loc de 74 ⇒ gol în listă după 5 rânduri)
function sugPuneN(el) {
  var c = el && el.querySelector ? el.querySelector(".sugCorp") : null, n = 0, i;
  if (!c || !c.children || !c.style || !c.style.setProperty) return 0;
  for (i = 0; i < c.children.length; i++) if (c.children[i].id !== "sugFisa" && !/\bsugPeste\b/.test(sugClasa(c.children[i]))) n++;   // v100.310: nici rândurile pliate
  c.style.setProperty("--n", String(n));
  return n;
}
function sugDeseneaza() {
  var el = typeof document !== "undefined" && document.getElementById("sugPagina"); if (!el) return;
  var h = sugHtml(sugStare.d, Date.now()); if (el._sugH === h) return;
  // v100.310: alinierea pe loc mută nodurile în DOM ⇒ rândul apăsat pierdea focusul (Tab o lua de la capăt); îl pun la loc, fără derulare
  var fa = document.activeElement, faId = fa && fa.id && el.contains && el.contains(fa) ? fa.id : "";
  var tmp = document.createElement("div"); tmp.innerHTML = h;
  var nou = [].slice.call(tmp.children), vechi = [].slice.call(el.children), parti = nou.map(function (c) { return c.outerHTML; }), peLoc = vechi.length === nou.length;
  if (peLoc) for (var i = 0; i < nou.length; i++) {
    if (el._sugP && el._sugP[i] === parti[i]) continue;
    if (el._sugP && sugSchelet(el._sugP[i]) === sugSchelet(parti[i]) && sugPeLoc(vechi[i], parti[i])) continue;
    if (sugAlinia(vechi[i], nou[i])) continue;
    vechi[i].outerHTML = parti[i];
  } else el.innerHTML = h;
  el._sugH = h; el._sugP = parti;
  sugPuneN(el);
  var fb = faId ? document.getElementById(faId) : null;
  if (fb && fb !== document.activeElement && fb.focus) try { fb.focus({ preventScroll: true }); } catch (e) {}
}
async function sugPorneste(fortat) {
  sugDeseneaza();
  if (sugStare.inLucru || (!fortat && Date.now() - sugStare.la < 5 * 60000)) return;
  sugStare.inLucru = true; sugStare.la = Date.now();
  var d = sugStare.d, pas = async function (k, fn) { try { d[k] = await fn(); } catch (e) {} sugDeseneaza(); };
  try {
    await Promise.all([
      pas("latime", function () { return getJSON("/api/istoric-bot?action=latime").then(function (r) { return r && r.latime || null; }); }),   /* v100.150 (I-584): lățimea pieței + pânda */
      pas("boti", function () { return getJSON("/api/bot-orders").then(function (r) { return r && Array.isArray(r.bots) ? r.bots.filter(function (b) { return b && b.activ !== false; }).map(function (b) { return { s: String(b.baza || "").replace(/\.PERP$/, "").toUpperCase(), dir: String(b.directie || "").toLowerCase() }; }) : []; }); }),
      pas("cont", async function () { if (typeof contTotAsigura === "function") await contTotAsigura(); return true; }),   /* v100.306 (I-824): boții închiși, pentru frâna din regula „azi nu” */
      pas("clasament", async function () { var c = await getJSON("/api/istoric-bot?action=clasament"); return c && c.clasament || null; }),
      pas("sugMonede", function () { return getJSON("/api/istoric-bot?action=sugestii"); }),
      pas("idei", function () { return getJSON("/api/t212?action=idei"); }),
      pas("sugActiuni", function () { return getJSON("/api/t212?action=sugestii"); }),
      pas("sectoare", function () { return getJSON("/api/istoric-bot?action=sectoareTop").then(function (r) { return r && r.sectoare || null; }); }),   /* v100.178 */
      pas("trend12", function () { return getJSON("/api/istoric-bot?action=trend12").then(function (r) { return r && r.trend || null; }); }),   /* v100.190 */
      pas("caderi", function () { return getJSON("/api/istoric-bot?action=caderi").then(function (r) { return r && r.caderi || null; }); })   /* v100.308: căderile de ieri (în probă) */
    ]);
  } finally { sugStare.inLucru = false; }
  sugDeseneaza();
  try { await sugGraficAdu(sugRandAles()); } catch (e) {}   // v100.292: graficul fișei rândului ales
}
