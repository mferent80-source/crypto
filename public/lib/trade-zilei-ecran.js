// Pagina „Trade-ul zilei” (v100.297) - partea de ECRAN: aduce lumânările de 1 h pentru monedele tale, le trece prin TradeZilei
// (lib/trade-zilei.js, pur) și desenează pagina. tzHtml e fără DOM (proba o rulează în vm); tzPorneste leagă pagina.
// Cinstit: cifrele dovedite (P3, cât se mișcă) sunt date ca atare; „trade-ul zilei” apare DOAR dacă un trade a trecut proba din 03.11.2026.
// v100.298 (el: „pagina, ca să fie de folos dimineața”): monedele = boții activi + top 20 lichide din clasamentul colectorului (+ BTC / ETH /
// SOL); lățimea de grid și distanța de stop din mișcarea așteptată + butonul „Grid: ce setez?” cu moneda gata aleasă.
// v100.361 (el, 18.11.2026: „Trade-ul zilei ca Jurnalul”; hotărârile LUI: cifrele reparate și spuse cinstit, aspectul ca Jurnalul, toate 4 grafice):
//   - sus fraza zilei + „De unde știu” (introducerea întreagă, cu ora agitată corectată: 16–20 ora României, deschiderea SUA);
//   - rânduri pliate ca Tabloul / Jurnalul (TZ_RANDURI): Boții tăi și BTC · ETH · SOL pe cartele compacte (deschise), cele mai lichide din clasament
//     pe rânduri care se desfac, ziua pe ore, cât de bine a nimerit cifra mare, gridul promis / prins, de ce nu-ți propun un trade (cu proba A);
//   - cartela: cifra mare, bara mișcării (până acum / de obicei / ieri / media pe 10 zile), bara prețului între minimul și maximul de ieri, gridul
//     cu butonul; „Toate cifrele” la un clic - nimic pierdut din cartela veche; blocul „niciun trade dovedit” o singură dată (fraza), nu pe 21 de cartele;
//   - tema zi / noapte (RADACINI), prețul 1–10 USDT cu 3 zecimale, P1 fără verde (nedovedit), mediana în loc de medie în rezumat.
var tzStare = { monede: [], la: 0, zi: 0, inLucru: false, eroare: null, simboluri: [], probaA: null, deschise: {}, surse: false };
var TZ_IMPLICITE = ["BTC", "ETH", "SOL"];
var TZ_TOP = 20;
var TZ_MAX = 30;
var TZ_PAUZA_MS = 250;   // între cererile de lumânări: Pionex blochează IP-ul la prea multe cereri (serverul le ține 90 s în cache)
function tzEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function tzPct(v, zec) { if (v == null || !isFinite(v)) return "—"; var z = zec == null ? 0 : zec; return (v * 100).toFixed(z).replace(".", ",") + " %"; }
// prețul: punctul de mii DOAR pe partea întreagă (revizia 03.11: „0,1.234”). Sub 0,01: 3 cifre semnificative (v100.306, PEPE 0,00000530);
// sub 1: 4 zecimale; v100.361 (auditul de cod, 🔴 3): 1–10 USDT cu 3 zecimale (PENDLE 1,42 ieșea „1,46” la maxim și grid „1,35 – 1,48” cu un pas de
// 0,91 % - sub precizia prețului); peste 10: 2 zecimale. Regula e și în colector (tura-trade-zilei.mjs).
function tzPret(p) { if (!(p > 0)) return "—"; var z = p < 0.01 ? Math.min(12, 2 - Math.floor(Math.log10(p))) : p < 1 ? 4 : p < 10 ? 3 : 2, s = p.toFixed(z).split("."); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1]; }
function tzOra(t) { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return "—"; } }
function tzPauza(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function tzCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n === 1 ? "1 " + sg : n + (n % 100 >= 20 || (n % 100 === 0 && n >= 100) ? " de " : " ") + pl; }
// monedele paginii: boții activi (cu simbolul LOR Pionex, spot sau perp, prin TabloBot.simboluri) + implicitele + top TZ_TOP din clasament
// după volum, fără dubluri, cel mult TZ_MAX. Boții primesc eticheta „bot”, ca să stea primii.
function tzSimboluri(boti, clasament) {
  var l = [];
  function pune(simbol, pionex, fel) { var n = String(simbol || "").toUpperCase(); if (n && !l.some(function (x) { return x.simbol === n; })) l.push({ simbol: n, pionex: pionex, fel: fel }); }
  (boti || []).forEach(function (b) {
    if (!b || !b.activ || !b.baza) return;
    var s = typeof TabloBot !== "undefined" && TabloBot.simboluri ? TabloBot.simboluri(b.baza, b.quote, b.simbolPionex) : null;
    var n = String(s ? s.moneda : b.baza).replace(/\.PERP$/, "").toUpperCase();
    pune(n, s ? s.pionex : n + "_USDT_PERP", "bot");
  });
  TZ_IMPLICITE.forEach(function (m) { pune(m, m + "_USDT_PERP", "piata"); });
  var top = ((clasament && clasament.monede) || []).filter(function (m) { return m && m.simbol && Number(m.volum) > 0; })
    .sort(function (a, b) { return Number(b.volum) - Number(a.volum); }).slice(0, TZ_TOP);
  top.forEach(function (m) { pune(String(m.simbol).replace(/_USDT_PERP$/, ""), String(m.simbol), "top"); });
  return l.slice(0, TZ_MAX);
}
function tzTonP(p) { return p == null ? "" : p >= 0.7 ? " tzBun" : p <= 0.3 ? " tzMut" : ""; }
function tzP3Txt(d) {
  var cuZiua = !d.dejaMaiMult && !!d.cuZiua, prognoza = !d.dejaMaiMult && d.bareAzi > 0 && !cuZiua;
  return d.dejaMaiMult ? "deja mai mult ca ieri: " + tzPct(d.panaAcum, 1) + " până acum, față de " + tzPct(d.r1, 1) + " ieri"
    : cuZiua ? "din ziua de până acum și din ieri: " + (d.iesitToateOrele ? "din zilele cu cifra ca azi (pe toate orele; la ora asta sunt prea puține), " : "din zilele ca azi la ora asta, ") + Math.round(d.iesitCuZiua * 100) + " din 100 au ieșit așa (numărate pe 72 de zile nevăzute) · până acum " + tzPct(d.panaAcum, 1) + " față de " + tzPct(d.r1, 1) + " ieri"
    : prognoza ? "prognoza de la 00:00 UTC (din ieri și alaltăieri), nu vede ziua de azi: din zilele după un ieri ca ăsta, " + Math.round(d.maiMultCaIeri * 100) + " din 100 au ieșit așa · până acum " + tzPct(d.panaAcum, 1) + " față de " + tzPct(d.r1, 1) + " ieri"
    : "din ieri și alaltăieri: din zilele după un ieri ca ăsta, " + Math.round(d.maiMultCaIeri * 100) + " din 100 au ieșit așa";
}
// bara mișcării: pe aceeași scară, până acum (plin), banda de obicei (p25–p75) cu mediana, ieri și media pe 10 zile (semne)
function tzBaraMiscare(d) {
  var a = d.asteptat, S = Math.max(a.p75, d.r1, d.media10, d.panaAcum) * 1.12, pc = function (v) { return (100 * Math.max(0, Math.min(1, v / S))).toFixed(1) + "%"; };
  return '<div class="tzBara" role="img" aria-label="' + tzEsc("Mișcarea zilei: până acum " + tzPct(d.panaAcum, 1) + ", de obicei " + tzPct(a.med, 1) + " (" + tzPct(a.p25, 1) + "–" + tzPct(a.p75, 1) + "), ieri " + tzPct(d.r1, 1) + ", media pe 10 zile " + tzPct(d.media10, 1)) + '">'
    + '<span class="tzBaraBanda" style="left:' + pc(a.p25) + ";width:calc(" + pc(a.p75) + " - " + pc(a.p25) + ')"></span><span class="tzBaraFacut" style="width:' + pc(d.panaAcum) + '"></span>'
    + '<span class="tzBaraMed" style="left:' + pc(a.med) + '"></span><span class="tzBaraIeri" style="left:' + pc(d.r1) + '"></span><span class="tzBaraM10" style="left:' + pc(d.media10) + '"></span></div>'
    + '<p class="tzLeg tzMic"><span><i class="tzK tzKFacut"></i>până acum <b>' + tzPct(d.panaAcum, 1) + '</b></span><span><i class="tzK tzKBanda"></i>de obicei <b>' + tzPct(a.med, 1) + "</b> (" + tzPct(a.p25, 1) + "–" + tzPct(a.p75, 1) + ')</span><span><i class="tzK tzKIeri"></i>ieri ' + tzPct(d.r1, 1) + '</span><span><i class="tzK tzKM10"></i>media pe 10 zile ' + tzPct(d.media10, 1) + "</span></p>";
}
// bara prețului: unde e prețul de acum între minimul și maximul de ieri (și cât a umblat azi), cu P1 la capete
function tzBaraPret(d) {
  var lo = Math.min(d.pdl, d.aziLo || d.pret, d.pret), hi = Math.max(d.pdh, d.aziHi || d.pret, d.pret), pad = (hi - lo) * 0.06 || d.pret * 0.01; lo -= pad; hi += pad;
  var pc = function (v) { return (100 * (v - lo) / (hi - lo)).toFixed(1) + "%"; };
  function cap(nume, L, p) { return '<span class="tzPCap"><span class="tzMut">' + nume + "</span> " + tzPret(L) + " · " + (p.atins ? '<b class="tzMut">atins azi ✓</b>' : p.p == null ? "—" : "atinge azi <b>" + tzPct(p.p) + "</b>") + "</span>"; }
  return '<div class="tzPret" role="img" aria-label="' + tzEsc("Prețul " + tzPret(d.pret) + " între minimul de ieri " + tzPret(d.pdl) + " și maximul de ieri " + tzPret(d.pdh)) + '">'
    + '<span class="tzPIeri" style="left:' + pc(d.pdl) + ";width:calc(" + pc(d.pdh) + " - " + pc(d.pdl) + ')"></span>'
    + (d.aziLo != null ? '<span class="tzPAzi" style="left:' + pc(d.aziLo) + ";width:calc(" + pc(d.aziHi) + " - " + pc(d.aziLo) + ')"></span>' : "")
    + '<span class="tzPPret" style="left:' + pc(d.pret) + '"></span></div>'
    + '<p class="tzPCapete tzMic">' + cap("min ieri", d.pdl, d.p1Jos) + cap("max ieri", d.pdh, d.p1Sus) + "</p>";
}
// „Toate cifrele”: tot ce scria cartela veche, la un clic (nimic pierdut)
function tzDetalii(d, g, cuZiua) {
  function rand(et, cifra, txt, cls) { return '<div class="tzRand"><span class="tzEt">' + et + '</span><b class="tzCifra' + (cls || "") + '">' + cifra + '</b><span class="tzMut tzMic">' + txt + "</span></div>"; }
  var h = "";
  if (cuZiua) h += rand("Prognoza de la 00:00 UTC", tzPct(d.p3Model), "din ieri și alaltăieri, nu vede ziua de azi: din zilele după un ieri ca ăsta, " + Math.round(d.maiMultCaIeri * 100) + " din 100 au ieșit așa", " tzMut");
  h += rand("Cât se mișcă azi, de obicei", tzPct(d.asteptat.med, 1), "între " + tzPct(d.asteptat.p25, 1) + " și " + tzPct(d.asteptat.p75, 1) + " - cam jumătate din zile cad între ele (măsurat 43–56 % după oră)" + (d.bandaDinZi ? " · din ziua făcută (de la 15:00 UTC)" : d.bareAzi > 0 ? " · din prognoza de la 00:00 UTC și ce s-a mișcat deja" : "") + " · ieri " + tzPct(d.r1, 1) + " · media pe 10 zile " + tzPct(d.media10, 1) + (d.weekend ? " · weekend: ×" + String(TradeZilei.FACTOR_WEEKEND).replace(".", ",") + " față de media tuturor zilelor, inclus" : ""));
  h += rand("Până acum azi", tzPct(d.panaAcum, 1), tzCate(d.bareAzi, "oră închisă", "ore închise") + ", " + tzCate(d.bareRamase, "oră rămasă", "ore rămase") + " (ziua UTC)");
  h += rand("Din mișcarea zilei, până la ora asta", tzPct(d.format), "de obicei format (curba orelor, 21 de perechi; pe zile ținute deoparte abate până la 3 puncte) · de obicei se mai adaugă ~" + tzPct(d.adaos, 1) + " la întinderea de până acum");
  function niv(nume, L, p) { return rand(nume + " " + tzPret(L), p.atins ? "✓" : p.p == null ? "—" : tzPct(p.p), p.atins ? "atins deja azi" : p.p == null ? "—" : "atinge azi " + tzPct(p.p) + " · la " + tzPct(p.dist, Math.abs(p.dist) >= 0.01 ? 1 : 2) + " de preț · calibrat în medie (la valori mari spune prea puțin: ~67 % ⇒ ies ~75 %)", " tzMut"); }
  h += niv("Maximul de ieri", d.pdh, d.p1Sus) + niv("Minimul de ieri", d.pdl, d.p1Jos);
  if (g) {
    h += rand("Grid azi, din mișcare", "±" + tzPct(g.jumatate, 1), tzPret(g.jos) + " – " + tzPret(g.sus) + " · pas ~" + tzPct(g.pas, Math.abs(g.pas) >= 0.01 ? 1 : 2) + " la cinci grile pe parte · cuprinde restul zilei UTC cam în șapte zile din zece (măsurat; pe zile ținute deoparte cu ~3 puncte mai rar decât se spunea)" + (d.bareAzi > 0 ? " · lățimea din prognoza de la 00:00 UTC și ce s-a mișcat deja" : ""));
    h += rand("Stop, nu mai aproape de", tzPct(g.stop, 1), (g.stopLaMargine ? "marginea gridului: mai aproape, grilele de dincolo de stop n-ar mai lucra" : "cât se mișcă o zi obișnuită ca azi") + " · măsurat ca mișcare, nu ca bani");
  }
  if (d.ziIncompleta) h += '<p class="tzMut tzMic">sub 20 de zile întregi în lumânări: trendul lipsește din P1 (efect mic).</p>';
  return h;
}
// corpul cartelei (fără cap): cifra mare, bara mișcării, bara prețului, gridul cu butonul, toate cifrele la un clic, trade-ul DOVEDIT (doar dacă e)
function tzCorp(m) {
  if (m.eroare || !m.d || m.d.eroare) return '<p class="tzMut">' + tzEsc(m.eroare || (m.d && m.d.eroare) || "fără date") + "</p>";
  var d = m.d, t = TradeZilei.trade(d), g = TradeZilei.grid(d), cuZiua = !d.dejaMaiMult && !!d.cuZiua, prognoza = !d.dejaMaiMult && d.bareAzi > 0 && !cuZiua;
  var h = '<div class="tzRand tzRandMare"><span class="tzEt">Azi se mișcă mai mult ca ieri' + (prognoza ? ' <small class="tzMut">· prognoza de la 00:00 UTC</small>' : "") + '</span><b class="tzCifra' + (prognoza ? " tzMut" : tzTonP(d.p3)) + '">' + tzPct(d.p3) + '</b><span class="tzMut tzMic">' + tzP3Txt(d) + "</span></div>";
  h += tzBaraMiscare(d) + tzBaraPret(d);
  if (g) h += '<div class="tzGridR"><span>Grid <b>±' + tzPct(g.jumatate, 1) + '</b> <span class="tzMut">' + tzPret(g.jos) + " – " + tzPret(g.sus) + "</span> · stop ≥ <b>" + tzPct(g.stop, 1) + '</b></span><button class="acBtn" type="button" data-action-click="tzLaGrid(\'' + tzEsc(m.pionex) + '\')">Grid: ce setez? →</button></div>';
  if (t.fel !== "niciunul" && t.fel !== "eroare") h += '<div class="tzTrade tzTradeDa"><span class="tzEt">Trade-ul zilei</span><p>' + tzEsc(t.text) + (t.cifra ? ' <span class="tzMut tzMic">' + tzEsc(t.cifra) + "</span>" : "") + "</p></div>";
  var id = "tzd-" + String(m.simbol).replace(/[^A-Za-z0-9]/g, "");
  return h + '<details class="tzDet" data-det="' + tzEsc(id) + '"' + (tzStare.deschise[id] ? " open" : "") + "><summary>Toate cifrele</summary>" + tzDetalii(d, g, cuZiua) + "</details>";
}
function tzCartela(m) {
  var h = '<article class="tzCard' + (m.eroare ? " tzCardGol" : "") + (m.fel === "bot" ? " tzCardBot" : "") + '" aria-label="' + tzEsc(m.simbol) + '">';
  h += '<div class="tzCardCap"><b class="tzSimbol">' + tzEsc(m.simbol) + "</b>" + (m.fel === "bot" ? '<span class="tzEticheta">botul tău</span>' : "") + '<span class="tzMut tzMic">' + (m.d && m.d.pret ? tzPret(m.d.pret) + " USDT" : "") + "</span></div>";
  return h + tzCorp(m) + "</article>";
}
// cele mai lichide din clasament: câte un rând (moneda, prețul, cifra mare, cât se mișcă, până acum, gridul) care se desface în cartela întreagă
function tzTopRand(m) {
  var d = m.d && !m.d.eroare && !m.eroare ? m.d : null, g = d ? TradeZilei.grid(d) : null, id = "tzt-" + String(m.simbol).replace(/[^A-Za-z0-9]/g, "");
  return '<details class="tzTop" data-det="' + tzEsc(id) + '"' + (tzStare.deschise[id] ? " open" : "") + '><summary><b>' + tzEsc(m.simbol) + '</b><span class="tzMut">' + (d ? tzPret(d.pret) : "—") + '</span><span class="tzTopP3' + (d ? tzTonP(d.p3) : "") + '">' + (d ? (d.dejaMaiMult ? "deja" : tzPct(d.p3)) : "—") + "</span><span>" + (d ? tzPct(d.asteptat.med, 1) : "—") + "</span><span>" + (d ? tzPct(d.panaAcum, 1) : "—") + "</span><span>" + (g ? "±" + tzPct(g.jumatate, 1) : "—") + "</span></summary>"
    + '<div class="tzTopCorp">' + tzCorp(m) + "</div></details>";
}
// fraza zilei: trade-ul (dacă e unul dovedit) sau spus o dată că nu e; rezumatul pe boții lui și pe piață (mediana, nu media - EVAA / memecoins o trăgeau în sus)
function tzMediana(l) { var a = l.slice().sort(function (x, y) { return x - y; }), n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; }
function tzFrazaHtml(st) {
  var ok = st.monede.filter(function (m) { return m.d && !m.d.eroare && !m.eroare; }), P = TradeZilei.PROBA, dov = Object.keys(P).filter(function (k) { return P[k].dovedit; });
  var trade = null; ok.some(function (m) { var t = TradeZilei.trade(m.d); if (t.fel !== "niciunul" && t.fel !== "eroare") { trade = { m: m, t: t }; return true; } return false; });
  var fr = trade ? "Trade-ul zilei pe " + trade.m.simbol + ": " + trade.t.text : dov.length ? "Azi nu se îndeplinește condiția niciunui trade dovedit." : "Azi nu e niciun trade cu avantaj dovedit pe datele tale.";
  // de ce nu e niciun trade (textul lui TradeZilei.trade, fără prima propoziție, pe care o spune fraza) - era pe fiecare cartelă, acum o dată
  var deCe = !trade && ok.length ? String(TradeZilei.trade(ok[0].d).text || "").replace(/^[^.]*\.\s*/, "") : "";
  var sub = (deCe ? deCe + " " : "") + "Ce se știe sigur e cât se mișcă ziua - pentru lățimea gridului și pentru stop. ";
  var boti = ok.filter(function (m) { return m.fel === "bot"; });
  if (boti.length) sub += (boti.length === 1 ? "Botul tău: " : "Boții tăi: ") + boti.map(function (m) { return m.simbol + " " + (m.d.dejaMaiMult ? "deja mai mult ca ieri" : tzPct(m.d.p3) + " să se miște mai mult ca ieri") + ", de obicei " + tzPct(m.d.asteptat.med, 1); }).join("; ") + ". ";
  if (ok.length) {
    var mult = ok.filter(function (m) { return m.d.p3 >= 0.6; }).length, cal = ok.filter(function (m) { return m.d.p3 <= 0.4; }).length;
    sub += "Pe piață, din " + tzCate(ok.length, "monedă", "monede") + ": " + mult + " se mișcă probabil mai mult ca ieri, " + (cal === 1 ? "1 stă probabil mai liniștită" : cal + " stau probabil mai liniștite") + "; mișcarea așteptată, la mijloc (mediana), " + tzPct(tzMediana(ok.map(function (m) { return m.d.asteptat.med; })), 1) + ".";
    var atinse = boti.filter(function (m) { return m.d.p1Sus.atins || m.d.p1Jos.atins; }).map(function (m) { return m.simbol; });
    if (atinse.length) sub += " Boții pe " + atinse.join(", ") + " au atins deja un nivel de ieri.";
  }
  var Z = typeof TzDovezi !== "undefined" ? TzDovezi.oreRo(Date.now()) : null, varf = Z ? String(Z.varf).padStart(2, "0") + "–" + String((Z.varf + 4) % 24).padStart(2, "0") : "16–20", sfZi = Z ? (Z.dec === 3 ? "03:00 (vara)" : "02:00 (iarna)") : "02:00 iarna, 03:00 vara";
  var surse = [
    "Cât se mișcă ziua (P3): potrivit pe 2 ani, confirmat pe al treilea, 21 de perechi (01.11.2026); verificat din nou pe 190 de zile ținute deoparte - cam 20 % mai bun decât rata de bază: un avantaj real, dar modest.",
    "Cu ziua în curs, cifra mare ține cont și de cât s-a mișcat deja ziua (verificat pe 72 de zile nevăzute, 77 de monede Pionex; ține și pe BTC / ETH, care n-au fost în învățare). „N din 100 au ieșit așa” e numărat pe acele zile, nu calculat.",
    "„Cât se mișcă azi”: până la 15:00 UTC din prognoza de dimineață (și ce s-a mișcat deja), de la 15:00 UTC din ziua făcută - cam jumătate din zile cad între margini (măsurat 43–56 % după oră, pe 190 de zile; pe noiembrie 37–50 %).",
    "Nivelurile de ieri (P1): calibrat în medie; la valori mari spune prea puțin (unde spune ~67 %, au ieșit ~75 %); nedovedit că bate mersul la întâmplare - de aceea fără verde.",
    "Gridul: banda care a cuprins restul zilei cam în șapte zile din zece (măsurat pe zile nevăzute; pe zilele ținute deoparte cu ~3 puncte mai rar). Pasul = lățimea / 10, cinci grile pe parte.",
    "Orele cele mai agitate: " + varf + " ora României (deschiderea bursei din SUA, la 16:30) - vezi „Ziua pe ore”. Sâmbăta și duminica ziua e cu ~20 % mai liniștită decât una lucrătoare (inclus în cifre).",
    "Ziua e cea UTC: se termină la " + sfZi + " ora României. Direcția nu se prezice - nu apare aici.",
    "Un trade apare ca „trade-ul zilei” doar dacă a trecut proba pre-înregistrată din 03.11.2026. Același rezumat pleacă dimineața pe Discord."];
  return '<div class="tzFrazaBox grFrazaBox"><p class="grFraza">' + tzEsc(fr) + '</p><p class="grFrazaSub">' + tzEsc(sub) + '</p><details class="grSurse"' + (st.surse ? " open" : "") + "><summary>De unde știu</summary><ul>" + surse.map(function (x) { return "<li>" + tzEsc(x) + "</li>"; }).join("") + "</ul></details></div>";
}
function tzCap(titlu, sub, id) { return '<div class="tzBlocCap"><h3 id="' + id + '">' + tzEsc(titlu) + "</h3>" + (sub ? '<span class="tzMut tzMic">' + tzEsc(sub) + "</span>" : "") + "</div>"; }
// graficele (TzDovezi, măsurate o dată pe 18.11.2026): lățimea reală a paginii, ca textul să rămână 11 px
function tzLat() { var e = typeof document !== "undefined" && document.getElementById ? document.getElementById("tzPagina") : null; return Math.max(300, Math.floor((e && e.clientWidth) || 900) - 34); }
function tzGraficeHtml() {
  if (typeof TzDovezi === "undefined") return "";
  var lat = tzLat(), lj = typeof window !== "undefined" && window.innerWidth >= 1024 ? Math.floor((lat - 16) / 2) : lat, O = TzDovezi.ore(Date.now(), { lat: lat }), G = TzDovezi.grid(Date.now(), { lat: lj }), D = TzDovezi.D;
  var v = String(O.varf).padStart(2, "0") + ":00–" + String((O.varf + 4) % 24).padStart(2, "0") + ":00";
  var h = '<section class="tzBloc" id="tzSOre" aria-labelledby="tz-h-ore">' + tzCap("Ziua pe ore, în ora ta", "cât din agitația zilei vine din fiecare oră · " + (O.sezon === "vara" ? "vara" : "iarna") + " · " + tzCate(O.zile, "zi", "zile"), "tz-h-ore")
    + '<p class="tzMut tzMic">Cele mai agitate patru ore: <b>' + v + "</b> ora României (" + tzPct(O.cotaVarf) + " din agitația zilei; dacă orele ar fi egale, " + tzPct(4 / 24) + "). Deschiderea bursei din SUA (16:30) cade în ele vara și iarna. Linia punctată = o oră obișnuită; „acum” = ora ta.</p>" + O.svg + "</section>";
  h += '<div class="tzGrGrila">';
  h += '<section class="tzBloc" id="tzSP3" aria-labelledby="tz-h-p3">' + tzCap("Cât de bine a nimerit cifra mare", "„azi se mișcă mai mult ca ieri”, cu ziua în curs", "tz-h-p3")
    + '<p class="tzMut tzMic">Pe orizontală ce a spus, pe verticală cât a ieșit; pe linia punctată ar fi perfect. <span class="tzKey tzKPlin"></span> 190 de zile ținute deoparte (' + D.perioade.control.de + "–" + D.perioade.control.pana + ') · <span class="tzKey tzKGol"></span> zilele noi (' + D.perioade.noi.de + "–" + D.perioade.noi.pana + ", doar 17 zile: mustăți lungi). Mustățile = intervalul pe zile.</p>"
    + TzDovezi.calib({ lat: lj }) + '<p class="tzMut tzMic">Ține: punctele stau lângă linie; pe zilele noi cifra a spus puțin MAI PUȚIN decât a ieșit (în sensul prudent). Fără cifra zilei (doar prognoza de dimineață): pe 190 de zile cu ' + tzPct(D.p3Prog[0].bss) + " mai bună decât rata de bază; pe cele 17 zile noi " + tzPct(D.p3Prog[1].bss) + ".</p></section>";
  h += '<section class="tzBloc" id="tzSGrid" aria-labelledby="tz-h-grid">' + tzCap("Gridul: promis și prins", "cât de des banda a cuprins restul zilei, pe ora ta", "tz-h-grid")
    + '<p class="tzMut tzMic">Linia = cât spunea cartela; <span class="tzKey tzKPlin"></span> cât a prins pe 190 de zile ținute deoparte; <span class="tzKey tzKGol"></span> pe zilele noi. În medie a prins cu ' + tzPct(Math.abs(G.abat), 1) + (G.abat < 0 ? " mai rar" : " mai des") + " decât spunea (zilele noi: " + tzPct(Math.abs(G.abatNoi), 1) + (G.abatNoi < 0 ? " mai rar" : " mai des") + ") - de aceea cartela spune acum „cam în șapte zile din zece”, nu o cifră pe oră.</p>" + G.svg + "</section>";
  return h + "</div>";
}
function tzProbaHtml(st) {
  var P = TradeZilei.PROBA, h = '<section class="tzBloc" id="tzSProba" aria-labelledby="tz-h-proba">' + tzCap("De ce nu-ți propun un trade", "proba pre-înregistrată din 03.11.2026, 21 de perechi, 1 h, după cost", "tz-h-proba") + '<ul class="tzLista">';
  Object.keys(P).forEach(function (k) { var p = P[k]; h += '<li><span class="tzSemn ' + (p.dovedit ? "tzBun" : "tzRau") + '" aria-hidden="true">' + (p.dovedit ? "✓" : "✕") + "</span><span><b>" + tzEsc(p.nume) + "</b> - " + tzEsc(p.regula) + ". " + (p.dovedit ? "DOVEDIT" : "NEDOVEDIT") + (p.cifra ? " · " + tzEsc(p.cifra) : "") + "</span></li>"; });
  if (P.A.prospectiv) {
    var A = typeof TzDovezi !== "undefined" ? TzDovezi.probaA(st.probaA) : null;
    h += '<li><span class="tzSemn tzMut" aria-hidden="true">🕒</span><span><b>Spargerea A, în probă prospectivă</b> - ' + tzEsc(P.A.prospectiv);
    if (A) {
      h += '<span class="tzProg" role="img" aria-label="' + tzEsc((A.zile == null ? "? zile" : tzCate(A.zile, "zi", "zile")) + " din " + A.total) + '"><span style="width:' + (A.procent == null ? 0 : (100 * A.procent).toFixed(1)) + '%"></span></span>'
        + '<span class="tzMic">' + (A.zile == null ? "Stadiul n-a venit de la colector." : tzEsc(tzCate(A.zile, "zi judecată", "zile judecate") + " din ~" + A.total + (A.nSemnal != null ? " · " + tzCate(A.nSemnal, "zi-pereche", "zile-pereche") + " cu semnal, net pe semnal " + tzPct(A.netSemnal, 1) + " față de " + tzPct(A.netRest, 1) + " pe rest - nu înseamnă nimic încă" : ""))) + "</span>"
        + '<span class="tzMic tzAtent">Puterea, spusă pe față: chiar dacă A merge cum a mers pe anul de confirmare, proba îl prinde doar în ~1 caz din 10 (' + tzPct(A.putere) + "); cu un efect dublu, ~1 din 2 (" + tzPct(A.putereDublu) + "). Un „nu s-a dovedit” la final NU înseamnă „s-a dovedit că nu”.</span>";
    }
    h += "</span></li>";
  }
  return h + '</ul><p class="tzMut tzMic">Ce POȚI folosi din cifrele de sus: lățimea gridului și distanța stopului după „cât se mișcă azi” (măsurat ca mișcare, nu ca bani). Când cifra mare de dimineață e mare, ieri a fost o zi neobișnuit de liniștită - range-ul de azi e de obicei SUB media pe 10 zile, nu peste.</p></section>';
}
function tzHtml(st, acum) {
  var h = '<header class="tzCapPag sectionHead"><div><h2 class="tzH1">🎯 Trade-ul zilei</h2><p class="tzMut tzMic" id="tzCand">' + (st.la ? "citit la " + tzOra(st.la) : "ce se știe despre ziua de azi, pe monedele tale") + "</p></div>"
    + '<div class="tzCapBtn"><button class="acBtn actionGhost" type="button" data-action-click="tzPorneste(true)">↻ Recitește</button><button class="acBtn sugTemaBtn" type="button" id="tzTemaBtn" aria-pressed="false" data-action-click="tbTemaComuta()">Temă deschisă</button></div></header>';
  if (st.inLucru && !st.monede.length) return h + '<p class="tzMut">Aduc lumânările…</p>';
  if (st.eroare && !st.monede.length) return h + '<p class="tzRau">' + tzEsc(st.eroare) + ' <button class="acBtn" type="button" data-action-click="tzPorneste(true)">Încearcă din nou</button></p>';
  if (!st.monede.length) return h + '<p class="tzMut">Nicio monedă încă - apasă „Recitește”.</p>';
  if (st.eroare) h += '<p class="tzRau">' + tzEsc(st.eroare) + "</p>";
  if (st.inLucru) h += '<p class="tzMut tzMic">Mai citesc… ' + st.monede.length + " / " + st.simboluri.length + "</p>";
  h += tzFrazaHtml(st);
  // fără „fel” (apelanți vechi / probe) ⇒ la piață, nu pierdută
  var boti = st.monede.filter(function (m) { return m.fel === "bot"; }), top = st.monede.filter(function (m) { return m.fel === "top"; }), piata = st.monede.filter(function (m) { return m.fel !== "bot" && m.fel !== "top"; });
  h += '<section class="tzBloc" id="tzSBoti" aria-labelledby="tz-h-boti">' + tzCap("Boții tăi", boti.length ? "monedele pe care rulează acum un bot" : "", "tz-h-boti") + (boti.length ? '<div class="tzGrila">' + boti.map(tzCartela).join("") + "</div>" : '<p class="tzMut">Niciun bot activ acum.</p>') + "</section>";
  h += '<section class="tzBloc" id="tzSPiata" aria-labelledby="tz-h-piata">' + tzCap("BTC · ETH · SOL", "piața mare", "tz-h-piata") + '<div class="tzGrila">' + piata.map(tzCartela).join("") + "</div></section>";
  if (top.length) h += '<section class="tzBloc" id="tzSTop" aria-labelledby="tz-h-top">' + tzCap("Cele mai lichide din clasament", tzCate(top.length, "monedă", "monede") + " după volum · apasă un rând pentru toată cartela", "tz-h-top")
    + '<div class="tzTopLista"><div class="tzTopCapTab tzMut tzMic"><span>Moneda</span><span>Preț</span><span>Mai mult ca ieri</span><span>De obicei</span><span>Până acum</span><span>Grid</span></div>' + top.map(tzTopRand).join("") + "</div></section>";
  h += tzGraficeHtml() + tzProbaHtml(st);
  return h;
}
// v100.361: rândurile pliate - aceeași formă ca Tabloul / Jurnalul / Comportament (data-rand + data-titlu + data-rezumat), starea în „tzRanduri”
var TZ_RAND_KEY = "tzRanduri", TZ_RANDURI = { tzSBoti: "Boții tăi", tzSPiata: "BTC · ETH · SOL", tzSTop: "Cele mai lichide din clasament", tzSOre: "Ziua pe ore, în ora ta", tzSP3: "Cât de bine a nimerit cifra mare", tzSGrid: "Gridul: promis și prins", tzSProba: "De ce nu-ți propun un trade" }, TZ_RAND_DESCHIS = { tzSBoti: 1, tzSPiata: 1 };
function tzRandStare() { try { var o = JSON.parse(localStorage.getItem(TZ_RAND_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
function tzRandAplica() {
  var st = tzRandStare(), pune = function (e, k, v) { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
  Object.keys(TZ_RANDURI).forEach(function (id) {
    var e = document.getElementById(id); if (!e) return; var deschis = st[id] === true || (st[id] !== false && !!TZ_RAND_DESCHIS[id]);
    pune(e, "data-rand", deschis ? "deschis" : "pliat"); pune(e, "data-titlu", TZ_RANDURI[id]); pune(e, "aria-expanded", String(deschis));
    if (deschis) { if (e.hasAttribute("tabindex")) e.removeAttribute("tabindex"); if (e.getAttribute("role") === "button") e.removeAttribute("role"); return; }
    pune(e, "tabindex", "0"); pune(e, "role", "button"); pune(e, "data-rezumat", typeof tbRandRezumat === "function" ? tbRandRezumat(e, TZ_RANDURI[id]) : "");
  });
}
function tzRandComuta(id, deschis) {
  if (!Object.prototype.hasOwnProperty.call(TZ_RANDURI, id)) return; var st = tzRandStare(), acum = st[id] === true || (st[id] !== false && !!TZ_RAND_DESCHIS[id]);
  if (deschis == null) deschis = !acum; st[id] = !!deschis; try { localStorage.setItem(TZ_RAND_KEY, JSON.stringify(st)); } catch (e) {} tzRandAplica();
}
function tzDeseneaza() {
  var el = document.getElementById("tzPagina"); if (!el) return;
  // ce era desfăcut (cartele, rânduri, „De unde știu”) rămâne desfăcut când pagina se rescrie (cartelele apar pe rând)
  if (el.querySelectorAll) { el.querySelectorAll("details[data-det]").forEach(function (x) { tzStare.deschise[x.getAttribute("data-det")] = !!x.open; }); var s = el.querySelector(".tzFrazaBox details.grSurse"); if (s) tzStare.surse = !!s.open; }
  el.innerHTML = tzHtml(tzStare, Date.now());
  tzRandAplica(); if (typeof tbTemaAplica === "function") tbTemaAplica();
}
// v100.298: la „Grid: ce setez?” cu moneda gata aleasă (ca din Scanner: scan-ecran.js)
function tzLaGrid(simbol) {
  navTo("gridset", true);
  setTimeout(function () { if (typeof gridClasamentAlege === "function") gridClasamentAlege(String(simbol || "").replace(/_USDT(_PERP)?$/, "") + "_USDT_PERP"); }, 400);   // și botul spot (DOGE_USDT) duce la perp-ul lui în Grid
}
async function tzBotiActivi() {
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : (typeof contTot !== "undefined" && contTot && contTot.boti && contTot.boti.length ? contTot.boti : null);
  if (boti) return boti;
  try { var bo = await getJSON("/api/bot-orders"); return bo && bo.bots || []; } catch (e) { return []; }
}
async function tzPorneste(forta) {
  if (tzStare.inLucru) return;
  var ziUtc = Math.floor(Date.now() / 86400000), proaspat = tzStare.la && Date.now() - tzStare.la < 10 * 60 * 1000 && tzStare.zi === ziUtc;
  var cuDate = tzStare.monede.some(function (m) { return m.d && !m.d.eroare; });
  if (!forta && proaspat && cuDate) { tzDeseneaza(); return; }   // cache 10 min, doar în aceeași zi UTC și doar dacă a ieșit măcar o cartelă cu cifre
  tzStare.inLucru = true; tzStare.eroare = null;
  var monede = [];
  try {
    var boti = await tzBotiActivi(), cl = null;
    try { var c = await getJSON("/api/istoric-bot?action=clasament"); cl = c && c.clasament || null; } catch (e) { cl = null; }
    try { var pa = await getJSON("/api/istoric-bot?action=probaA"); tzStare.probaA = pa && pa.probaA || null; } catch (e) { tzStare.probaA = null; }   // v100.361: stadiul probei A (citit, o cerere)
    tzStare.simboluri = tzSimboluri(boti, cl); tzDeseneaza();
    for (var i = 0; i < tzStare.simboluri.length; i++) {
      var s = tzStare.simboluri[i], lu = null;
      try {
        // v100.304 (I-808): lumânările 1h din cache-ul comun (lib/lumanari.js) - Range Filter și Tabloul le-au adus deja de multe ori
        lu = typeof Lumanari !== "undefined" ? await Lumanari.cere(s.pionex, "60M", 500) : null;
        var k = lu ? (lu.refuz ? { result: false, retryAfter: 0 } : { data: { klines: lu.randuri } }) : await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s.pionex) + "&interval=60M&limit=500");
        // v100.301 (auditul RF): refuzul Pionex vine 200 {result:false, retryAfter} - nu aruncă; se citește aici, altfel bucla mergea mai departe
        if (k && k.result === false && k.retryAfter != null) { monede.push({ simbol: s.simbol, pionex: s.pionex, fel: s.fel, eroare: "Pionex a refuzat (prea multe cereri)" }); tzStare.eroare = "Pionex a refuzat (prea multe cereri) - restul monedelor le citesc la „Recitește”."; break; }
        // v100.361 (auditul de cod, 🔴 4): bareToate, nu bare - bare() arunca mereu ultima bară, chiar și una închisă; TradeZilei.azi scoate singur bara în curs (după `acum`)
        var bare = typeof GridCalcul !== "undefined" ? (GridCalcul.bareToate || GridCalcul.bare)(k && k.data && k.data.klines) : null;
        monede.push({ simbol: s.simbol, pionex: s.pionex, fel: s.fel, d: bare && bare.length ? TradeZilei.azi(bare, Date.now()) : { eroare: "fără lumânări de la Pionex" } });
      } catch (e) {
        var msg = String(e && e.message || e);
        monede.push({ simbol: s.simbol, pionex: s.pionex, fel: s.fel, eroare: "nu am putut citi lumânările (" + msg.slice(0, 80) + ")" });
        if (/429|prea multe|rate/i.test(msg)) { tzStare.eroare = "Pionex a refuzat (prea multe cereri) - restul monedelor le citesc la „Recitește”."; break; }
      }
      tzStare.monede = monede.slice(); tzDeseneaza();   // cartelele apar pe rând, nu toate la final
      if (i < tzStare.simboluri.length - 1 && !(lu && lu.dinCache)) await tzPauza(TZ_PAUZA_MS);   // din cache nu e nicio cerere de rărit
    }
    tzStare.monede = monede; tzStare.la = Date.now(); tzStare.zi = ziUtc;
    if (!monede.length) tzStare.eroare = "Nicio monedă de citit.";
  } finally { tzStare.inLucru = false; tzDeseneaza(); }
}
