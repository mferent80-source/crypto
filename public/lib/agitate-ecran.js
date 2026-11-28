// Pagina „Agitate acum” (v100.397; el, 28.11.2026: „un tool simplu, integrat în Radar, care să-mi caute în Pionex cele mai agitate și volatile
// monede live” + „doar top 150 de coinuri”) - partea de ECRAN. Calculul e în lib/agitate.js (pur); aici: de unde vin datele și cum se desenează.
//   1. lista primelor monede după capitalizare: /api/market?type=top_cap (serverul o ține 6 ore; copia din browser ține 3 zile, pentru o cădere)
//   2. lista Pionex PERP pe 24 h: /api/market?type=pionex_tickers&market=PERP - O cerere pentru toate monedele, la 30 s cât pagina e pe ecran
//   3. lumânările de 5 minute (500 ≈ 41 de ore) pentru ferestrele scurte: o cerere pe monedă, pe rând (serverul ține ≥ 1,1 s între cererile spre
//      Pionex), de la cea mai agitată pe 24 h; apoi prețul viu din (2) le ține la zi. Primele 24 din clasament (cele 15 la vedere + marjă) se
//      recitesc la 5 minute (fitilele exacte), toate o dată pe oră.
// Cât pagina NU e pe ecran nu pleacă nicio cerere: pe altă pagină a Radarului ceasul se oprește; cu fila ascunsă ceasul rămâne, dar bate în gol,
// iar la întoarcere se citește pe loc (revizia independentă din 28.11: fără asta pagina rămânea cu „acum 12 s” pe prețuri de acum o oră).
// Timpul lumânărilor e al Pionex (`timestamp` din răspunsul listei), nu al PC-ului: un ceas de PC decalat nu strică ferestrele și nu pornește
// recitiri în buclă. O cerere de lumânări picată se reia cu pauză care se dublează (2, 4, 8… minute), nu la fiecare 30 s.
// agHtml e fără DOM (proba scripts/proba-v100397-agitate.mjs o rulează în vm, iar pagina în mers într-o lume prefăcută); agPorneste leagă pagina.
// Cinstit: sunt FAPTE (unde e mișcare acum), nu semnale (încotro merge) - rândul de sub frază o spune pe pagină.
var AG_VIZIBILE = 15;                 // câte rânduri la vedere; restul la „Arată toate”
var AG_TICK_MS = 30000;               // lista Pionex: serverul o ține 30 s
var AG_TOP_MS = 5 * 60000;            // primele din clasament: lumânările recitite la 5 minute
var AG_TOP_N = 24;                    // cele 15 la vedere + marjă: cine bate la ușa listei are și el fitilele exacte (revizia 28.11: erau 12)
var AG_TOT_MS = 60 * 60000;           // toate monedele: lumânările recitite o dată pe oră
var AG_ESEC_MS = 2 * 60000;           // după o cerere de lumânări picată: 2 minute, apoi dublu la fiecare cădere (cel mult cât citirea întreagă)
var AG_ESEC_MAX = 3;                  // de la a treia cădere la rând, rândul spune „fără lumânări”
var AG_HARTA_MS = 6 * 3600000;        // lista după capitalizare: cerută din nou după 6 ore
var AG_HARTA_PASTRATA_MS = 3 * 86400000;
var AG_VECHI_MS = 2 * 60000;          // prețurile mai vechi de 2 minute se spun „vechi”
var agStare = { k: "1h", monede: [], scoase: null, harta: null, hartaLa: 0, hartaSursa: "", hartaVeche: false, tickLa: 0, faraContract: 0, inLucru: false,
  eroare: null, detaliu: "", toate: false, boti: {}, bare: {}, masor: false, totLa: 0, topLa: 0, refuzPana: 0, ceas: null, ascult: false, tickInZbor: false,
  hartaIncercatLa: 0, decalaj: 0 };
try { var agKPastrat = localStorage.getItem("ag_fereastra"); if (Agitate.fer(agKPastrat)) agStare.k = agKPastrat; } catch (e) {}

function agEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
// regula casei (03.10): rezultatele cu O SINGURĂ zecimală, virgulă, minusul tipografic - prin TextRo
function agPct(v) { return v == null || !isFinite(v) ? "—" : TextRo.pct(v, 1); }
function agPctSemn(v) { return v == null || !isFinite(v) ? "—" : TextRo.pctSemn(v, 1); }
function agOri(v) { return v == null || !isFinite(v) ? "—" : TextRo.ori(v, 1); }
function agVarsta(ms) {
  if (!(ms >= 0)) return "—";
  var s = Math.round(ms / 1000);
  return s < 90 ? "acum " + s + " s" : s < 5400 ? "acum " + Math.round(s / 60) + " min" : s < 172800 ? "acum " + Math.round(s / 3600) + " h" : "acum " + TextRo.cate(Math.round(s / 86400), "zi", "zile");
}
function agOra(t) { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return "—"; } }
// „acum” pe ceasul Pionex: ceasul PC-ului + decalajul măsurat la ultima listă (0 cât PC-ul e la câteva secunde de Pionex)
function agAcum() { return Date.now() + (agStare.decalaj || 0); }
var AG_FEL = { sus: "aproape drept", jos: "aproape drept", dus: "dus-întors" };   /* direcția o spune semnul netului */
var AG_TREAPTA = { peste: "peste obișnuit", sub: "sub obișnuit", obisnuit: "ca de obicei" };
var AG_NEMASURAT = { scurta: ["istorie scurtă", "Moneda are prea puține lumânări pentru fereastra asta (listată de curând)."], veche: ["lumânări vechi", "Ultimele lumânări citite sunt mai vechi de 10 minute; se recitesc."] };

// fraza din capul paginii: cea mai agitată pe fereastra aleasă; cât încă se măsoară, o spune și dă cea mai agitată pe 24 h (care se știe pe loc)
function agFraza(st, acum) {
  var f = Agitate.fer(st.k) || Agitate.fer("1h"), cl = Agitate.clasament(st.monede, f.k, acum), top = cl[0];
  if (!top) return "";
  var spune = function (r) {
    return r.m.simbol + " — " + agPct(r.x.amp) + " între minim și maxim" + (r.x.net !== null ? " (" + agPctSemn(r.x.net) + " net)" : "") + (r.x.ori !== null ? ", de " + agOri(r.x.ori) + " cât obișnuiește" : "") + ".";
  };
  if (top.x.masurat) return "Cea mai agitată în " + f.lung + ": " + spune(top);
  var z = Agitate.clasament(st.monede, "24h", acum)[0];
  return "Măsor mișcarea din " + f.lung + "." + (z && z.x.masurat ? " Până atunci, cea mai agitată în ultimele 24 de ore: " + spune(z) : "");
}

function agRand(r, max, st, f) {
  var m = r.m, x = r.x, scurt = !!f.bare, h = '<div class="agRand' + (st.boti && st.boti[m.simbol] ? " agRandBot" : "") + '" data-ag-simbol="' + agEsc(m.simbol) + '">';
  h += '<div class="agColMoneda"><span class="agRang">#' + agEsc(m.rang) + '</span><b class="agSimbol">' + agEsc(m.simbol) + '</b><span class="agNume">' + agEsc(m.nume) + "</span>"
    + (st.boti && st.boti[m.simbol] ? '<span class="agEt agEtBot">botul tău</span>' : "") + "</div>";
  if (x.masurat) {
    var lat = max > 0 ? Math.max(2, Math.min(100, Math.round(x.amp / max * 100))) : 0;
    h += '<div class="agColAmp"><span class="agBara" aria-hidden="true"><i style="width:' + lat + '%"></i></span><b>' + agPct(x.amp) + "</b></div>";
    h += '<div class="agColNet" data-et="Net"><span class="' + (x.net > 0 ? "agSus" : x.net < 0 ? "agJos" : "") + '">' + agPctSemn(x.net) + "</span>" + (AG_FEL[x.fel] ? ' <span class="agMut">' + AG_FEL[x.fel] + "</span>" : "") + "</div>";
    if (scurt) {
      var tr = Agitate.treapta(x.ori);
      h += '<div class="agColOri" data-et="Față de obișnuit">' + (x.ori !== null ? '<b class="' + (tr === "peste" ? "agPeste" : "") + '">' + agOri(x.ori) + '</b> <span class="agMut">' + AG_TREAPTA[tr] + "</span>" : '<span class="agMut" title="Prea puțină istorie pentru o mediană (sub ' + TextRo.cate(Agitate.MIN_BLOCURI, "fereastră", "ferestre") + ').">fără reper</span>') + "</div>";
    }
  } else {
    /* de ce nu e măsurată: n-au venit încă lumânările („măsor…”), au picat de mai multe ori, sunt prea puține sau prea vechi - nu se arată 0 */
    var cuBare = m.bare && m.bare.length, n = cuBare && AG_NEMASURAT[x.motiv] ? AG_NEMASURAT[x.motiv] : null;
    h += '<div class="agColAmp agMut"' + (n ? ' title="' + n[1] + '"' : "") + ">" + (n ? n[0] : m.faraBare ? "fără lumânări" : "măsor…") + '</div><div class="agColNet agMut" data-et="Net">—</div>' + (scurt ? '<div class="agColOri agMut" data-et="Față de obișnuit">—</div>' : "");
  }
  if (scurt) h += '<div class="agCol24" data-et="Pe 24 h">' + agPct(m.amp24) + ' <span class="agMut">(' + agPctSemn(m.net24) + ")</span></div>";
  /* „subțire” stă lângă cifra care o spune (volumul), nu lângă nume: rândurile rămân la aceeași înălțime */
  h += '<div class="agColVol" data-et="Volum Pionex">' + (m.vol === null ? "—" : agEsc(TextRo.volum(m.vol)) + ' <span class="agMut">USDT</span>')
    + (m.subtire ? ' <span class="agEt" title="Sub 0,3 M USDT tranzacționați pe Pionex în 24 h: ordinul la piață alunecă și pot apărea fitile doar aici.">subțire</span>' : "") + "</div>";
  h += '<div class="agColPret" data-et="Preț">' + agEsc(TextRo.pret(m.pret)) + "</div>";
  /* pasul următor rămâne în Radar (ca pe Range Filter / Trade-ul zilei): moneda în „Grid: ce setez?”. O legătură în afară (TradingView) ar cere o
     excepție în garda de antete (scripts/garzi-v746.mjs numără orice adresă din pagină drept cerere) - rămâne idee, la alegerea lui. */
  h += '<button class="agGrafic" type="button" data-action-click="agLaGrid(\'' + agEsc(m.simbol) + '\')" title="Deschide moneda în „Grid: ce setez?”">Grid ›</button>';
  return h + "</div>";
}

function agHtmlAntet(st) {
  var n = (st.monede || []).length;
  var h = '<h3>Agitate acum</h3><span class="agMut agMic">primele ' + Agitate.TOP + " de monede după capitalizare, pe Pionex" + (n ? " · " + TextRo.cate(n, "monedă", "monede") : "") + '</span><div class="agDr">';
  h += '<span class="agSeg" role="group" aria-label="Fereastra">' + Agitate.FERESTRE.map(function (f) {
    return '<button class="acBtn' + (st.k === f.k ? " agSegOn" : "") + '" type="button" aria-pressed="' + (st.k === f.k ? "true" : "false") + '" data-action-click="agFereastra(\'' + f.k + "')\">" + f.et + "</button>";
  }).join("") + "</span>";
  h += '<button class="acBtn" type="button" data-action-click="agPorneste(true)">↻ Recitește</button>';
  h += '<button class="acBtn" type="button" id="agTemaBtn" aria-pressed="false" data-action-click="tbTemaComuta()">Temă închisă</button></div>';
  return h;
}
function agHtmlVerdict(st, acum) {
  var f = Agitate.fer(st.k) || Agitate.fer("1h"), cl = Agitate.clasament(st.monede, f.k, acum);
  var peste = f.bare ? cl.filter(function (r) { return r.x.masurat && Agitate.treapta(r.x.ori) === "peste"; }).length : 0, cuReper = f.bare ? cl.filter(function (r) { return r.x.masurat && r.x.ori !== null; }).length : 0;
  var h = '<p class="agFraza">' + agEsc(agFraza(st, acum)) + "</p>";
  if (cuReper) h += '<p class="agSub">' + (peste ? TextRo.cate(peste, "monedă", "monede") + " din " + cuReper + " se mișcă peste obișnuitul " + (peste === 1 ? "ei" : "lor") + " (de la " + agOri(Agitate.PESTE) + " în sus)." : "Nicio monedă din " + cuReper + " nu se mișcă peste obișnuitul ei (de la " + agOri(Agitate.PESTE) + " în sus).") + "</p>";
  h += '<p class="agCinstit">Fapte, nu semnale: lista arată unde e mișcare acum, nu încotro merge prețul. O monedă agitată se poate liniști la fel de repede.</p>';
  return h;
}
function agHtmlSurse(st, acum) {
  var f = Agitate.fer(st.k) || Agitate.fer("1h"), n = (st.monede || []).length, vechi = st.tickLa > 0 && acum - st.tickLa > AG_VECHI_MS;
  var p = ['<span class="' + (vechi ? "agAtentie" : "") + '">Prețuri: Pionex, contractele perpetue pe USDT, ' + (st.tickLa > 0 ? agVarsta(acum - st.tickLa) + (vechi ? " — vechi" : "") : "necitite") + "</span>"];
  if (f.bare) {
    var mas = Agitate.clasament(st.monede, f.k, acum).filter(function (r) { return r.x.masurat; }).length;
    p.push("lumânări de 5 minute: măsurate " + mas + " din " + n + (st.masor ? " (măsor…)" : ""));
  }
  if (st.hartaLa > 0) p.push('<span class="' + (st.hartaVeche ? "agAtentie" : "") + '">rangul: ' + agEsc(st.hartaSursa || "CoinGecko") + ", " + agVarsta(Math.max(0, acum - st.hartaLa)) + (st.hartaVeche ? " — n-a răspuns acum, folosesc lista veche" : "") + "</span>");
  var h = '<p class="agSurse agMut agMic">' + p.join(" · ") + "</p>";
  if (st.refuzPana > acum) h += '<p class="agAtentie agMic">Pionex a cerut o pauză (prea multe cereri) până la ' + agOra(st.refuzPana - (st.decalaj || 0)) + ". Măsor restul după.</p>";
  if (st.eroare && n) h += '<p class="agAtentie agMic">Ultima citire a picat' + (st.detaliu ? " (" + agEsc(st.detaliu) + ")" : "") + ". Lista de mai jos e cea de " + agVarsta(acum - st.tickLa) + ".</p>";
  return h;
}
function agHtmlLista(st, acum) {
  var f = Agitate.fer(st.k) || Agitate.fer("1h"), cl = Agitate.clasament(st.monede, f.k, acum), vaz = st.toate ? cl : cl.slice(0, AG_VIZIBILE), max = 0;
  vaz.forEach(function (r) { if (r.x.masurat && r.x.amp > max) max = r.x.amp; });
  var h = '<div class="agLista' + (f.bare ? "" : " agK24") + '"><div class="agListaCap" aria-hidden="true"><span>Monedă</span><span>Mișcare · ' + f.et + "</span><span>Net</span>" + (f.bare ? "<span>Față de obișnuit</span><span>Pe 24 h</span>" : "") + "<span>Volum Pionex</span><span>Preț</span><span></span></div>";
  h += vaz.map(function (r) { return agRand(r, max, st, f); }).join("");
  if (cl.length > AG_VIZIBILE) h += '<div class="agMai"><button class="acBtn" type="button" id="agToateBtn" data-action-click="agToate(' + (st.toate ? "false" : "true") + ')">' + (st.toate ? "Arată doar primele " + AG_VIZIBILE : "Arată toate (" + cl.length + ")") + "</button></div>";
  return h + "</div>";
}
function agHtmlNote(st) {
  var sc = st.scoase || {}, st1 = (sc.stabile || []).slice().sort(), nc = (sc.nuCrypto || []).slice().sort(), buc = [];
  if (st1.length) buc.push(agEsc(st1.join(", ")) + " (" + (st1.length === 1 ? "stabilă" : "stabile") + ")");
  if (nc.length) buc.push(agEsc(nc.join(", ")) + " (aur, nu crypto)");
  var h = '<details class="agNote"><summary>Cum citesc lista</summary>';
  h += "<p><b>Mișcare</b> = cât e între minimul și maximul ferestrei, în % din minim, pe prețurile Pionex (prinde și fitilele). <b>Net</b> = de unde a plecat până unde e acum; lângă el, dacă a mers aproape drept sau s-a dus și s-a întors.</p>";
  h += "<p><b>Față de obișnuit</b> = mișcarea de acum împărțită la mediana ferestrelor de aceeași lungime din ultimele ~41 de ore ale aceleiași monede. De la " + agOri(Agitate.PESTE) + " în sus scriu „peste obișnuit”. E o descriere, nu o regulă probată.</p>";
  h += "<p><b>Ferestrele</b> se numără în lumânări de 5 minute: „15 minute” înseamnă între 12 și 18 minute, „o oră” între 57 și 63.</p>";
  h += "<p><b>Subțire</b> = sub 0,3 M USDT tranzacționați pe Pionex în 24 h. Acolo ordinul la piață alunecă, iar prețul poate face fitile pe care alte burse nu le au.</p>";
  h += "<p>Pe 24 h cifrele vin din lista Pionex (toate monedele dintr-o cerere). Pe 15 minute, o oră și 4 ore vin din lumânările de 5 minute. Primele " + AG_TOP_N + " din clasament le au recitite la 5 minute, cu fitilele exacte; celelalte, între două citiri întregi (o dată pe oră), se țin la zi cu prețul citit la 30 de secunde, deci mișcarea lor poate ieși puțin mai mică.</p></details>";
  h += '<p class="agMut agMic">' + (st.faraContract > 0 ? "Din primele " + Agitate.TOP + " după capitalizare, " + st.faraContract + " n-au contract pe Pionex (stabile, jetoane de bursă, altele)." : "") + (buc.length ? " Scoase din listă: " + buc.join(" · ") + "." : "") + "</p>";
  return h;
}
function agHtml(st, acum) {
  var n = (st.monede || []).length, h = '<div class="agAntet" id="agZonaAntet">' + agHtmlAntet(st) + "</div>";
  if (!n) {
    if (st.eroare === "top") return h + '<div class="agVerdict"><p class="agFraza">N-am lista primelor ' + Agitate.TOP + " de monede.</p><p class=\"agSub\">CoinGecko nu a răspuns" + (st.detaliu ? " (" + agEsc(st.detaliu) + ")" : "") + ' și nu am o listă păstrată. Fără ea nu aleg eu monedele.</p><p><button class="acBtn" type="button" data-action-click="agPorneste(true)">Încearcă din nou</button></p></div>';
    if (st.eroare) return h + '<div class="agVerdict"><p class="agFraza">Pionex nu a răspuns.</p><p class="agSub">' + (st.detaliu ? agEsc(st.detaliu) + ". " : "") + (st.refuzPana > acum ? "A cerut o pauză până la " + agOra(st.refuzPana - (st.decalaj || 0)) + ". " : "") + 'Nu arăt o listă veche ca și cum ar fi de acum.</p><p><button class="acBtn" type="button" data-action-click="agPorneste(true)">Încearcă din nou</button></p></div>';
    return h + '<div class="agVerdict"><p class="agSub">' + (st.inLucru ? "Aduc lista de pe Pionex…" : "Nicio monedă din primele " + Agitate.TOP + " nu are acum contract citibil pe Pionex.") + "</p></div>";
  }
  h += '<div class="agVerdict" id="agZonaVerdict">' + agHtmlVerdict(st, acum) + "</div>";
  h += '<div id="agZonaSurse">' + agHtmlSurse(st, acum) + "</div>";
  h += '<div id="agZonaLista">' + agHtmlLista(st, acum) + "</div>";
  h += '<div id="agZonaNote">' + agHtmlNote(st) + "</div>";
  return h;
}

// ── legarea de pagină ──
function agEl(id) { return typeof document !== "undefined" && document.getElementById ? document.getElementById(id) : null; }
function agPanouDeschis() { var p = agEl("agitate"); return !!(p && p.classList.contains("on")); }
function agPeEcran() { return typeof document !== "undefined" && agPanouDeschis() && !document.hidden; }
// desenul întreg (schimbare de stare) sau doar zonele care se mișcă (la fiecare citire: butoanele din antet și pliul rămân neatinse)
function agDeseneaza(doarZone) {
  var el = agEl("agPagina"); if (!el) return;
  var acum = agAcum(), zV = agEl("agZonaVerdict"), zS = agEl("agZonaSurse"), zL = agEl("agZonaLista");
  if (doarZone && zV && zS && zL && agStare.monede.length) {
    var activ = document.activeElement && document.activeElement.id === "agToateBtn";
    zV.innerHTML = agHtmlVerdict(agStare, acum); zS.innerHTML = agHtmlSurse(agStare, acum); zL.innerHTML = agHtmlLista(agStare, acum);
    if (activ) { var b = agEl("agToateBtn"); if (b) b.focus({ preventScroll: true }); }
    return;
  }
  el.innerHTML = agHtml(agStare, acum);
  if (typeof tbTemaAplica === "function") { try { tbTemaAplica(); } catch (e) {} }
}
// boții deja citiți de Radar în sesiunea asta (banda de sus / Tabloul / Contul) - fără nicio cerere nouă spre contul Pionex
function agBotiStiuti() {
  var l = typeof tbStare !== "undefined" && tbStare && tbStare.boti && tbStare.boti.length ? tbStare.boti : typeof contTot !== "undefined" && contTot && contTot.boti && contTot.boti.length ? contTot.boti : [], out = {};
  l.forEach(function (b) {
    if (!b || !b.baza || !(b.activ !== false || b.ruleaza === true)) return;
    var s = typeof TabloBot !== "undefined" && TabloBot.simboluri ? TabloBot.simboluri(b.baza, b.quote, b.simbolPionex) : null;
    out[String(s ? s.moneda : b.baza).replace(/\.PERP$/, "").toUpperCase()] = 1;
  });
  return out;
}
// lista după capitalizare: proaspătă 6 ore (apoi se cere din nou, și cu pagina ținută deschisă); la eșec rămâne cea veche, cu semn
async function agHartaAdu(forta) {
  var acum = Date.now();
  if (agStare.harta && !agStare.hartaVeche && acum - agStare.hartaLa < AG_HARTA_MS) return;
  if (!forta && agStare.harta && acum - agStare.hartaIncercatLa < 2 * 60000) return;   /* lista veche e în folosință: nu întreb mai des de 2 minute */
  agStare.hartaIncercatLa = acum;
  var r = null, det = "";
  try { r = await getJSON("/api/market?type=top_cap"); } catch (e) { det = String(e && e.message || e).slice(0, 80); }
  if (r && r.result !== false && Array.isArray(r.monede) && r.monede.length >= Agitate.TOP) {
    agStare.harta = Agitate.ranguri(r.monede, Agitate.TOP); agStare.hartaLa = Number(r.la) > 0 ? Number(r.la) : acum; agStare.hartaSursa = String(r.sursa || "CoinGecko"); agStare.hartaVeche = !!r.vechi;
    if (agStare.eroare === "top") { agStare.eroare = null; agStare.detaliu = ""; }
    try { localStorage.setItem("ag_top", JSON.stringify({ la: agStare.hartaLa, sursa: agStare.hartaSursa, monede: r.monede.slice(0, Agitate.TOP + 20) })); } catch (e) {}
    return;
  }
  if (r && r.result === false) det = String(r.detail || r.error || "").slice(0, 80);
  if (agStare.harta) { agStare.hartaVeche = true; return; }
  try {
    var p = JSON.parse(localStorage.getItem("ag_top") || "null");
    if (p && Array.isArray(p.monede) && Number(p.la) > 0 && acum - Number(p.la) < AG_HARTA_PASTRATA_MS) { agStare.harta = Agitate.ranguri(p.monede, Agitate.TOP); agStare.hartaLa = Number(p.la); agStare.hartaSursa = String(p.sursa || "CoinGecko"); agStare.hartaVeche = true; return; }
  } catch (e) {}
  agStare.eroare = "top"; agStare.detaliu = det;
}
// lista Pionex pe 24 h ⇒ universul; lumânările deja citite se țin la zi cu prețul viu. Ora e a Pionex (`timestamp` din răspuns):
//   - răspunsul mai vechi cu cel mult 35 s decât ceasul PC-ului = lista ținută de server (≤ 30 s) ⇒ vârsta ei se scade din „acum N s”;
//   - altfel ceasul PC-ului e decalat ⇒ decalajul se ține minte și toate socotelile cu lumânări se fac pe ceasul Pionex.
async function agTickAdu() {
  if (agStare.tickInZbor || !agStare.harta) return false;
  agStare.tickInZbor = true;
  try {
    var r = await getJSON("/api/market?type=pionex_tickers&market=PERP"), t = r && r.data && Array.isArray(r.data.tickers) ? r.data.tickers : null;
    if (!t || r.result === false) {
      agStare.eroare = "pionex"; agStare.detaliu = String(r && (r.detail || r.error) || "răspuns fără listă").slice(0, 80);
      if (r && r.retryAfter > 0) agStare.refuzPana = agAcum() + r.retryAfter * 1000;
      return false;
    }
    var sosit = Date.now(), ts = Number(r.timestamp), d = ts > 0 ? ts - sosit : 0, varsta = 0;
    if (d >= -35000 && d <= 5000) { agStare.decalaj = 0; varsta = Math.max(0, -d); } else agStare.decalaj = d;
    var acum = sosit + agStare.decalaj, u = Agitate.univers(t, agStare.harta, { eCrypto: typeof GridCalcul !== "undefined" && GridCalcul.eCrypto ? GridCalcul.eCrypto : null });
    agStare.boti = agBotiStiuti();
    u.monede.forEach(function (m) {
      var e = agStare.bare[m.simbol]; if (!e) return;
      if (!e.b) { if (e.esec >= AG_ESEC_MAX) m.faraBare = true; return; }
      var b = Agitate.cuPret(e.b, acum, m.pret), k = b.length;
      /* o gaură de peste două lumânări (pagina a stat ascunsă): lumânările rămân, dar se recitesc (cel mult o dată la 5 minute, nu în buclă) */
      if (k > 1 && b[k - 1].t - b[k - 2].t > 2 * Agitate.PER_MS) e.refa = true;
      e.b = b; m.bare = b;
    });
    agStare.monede = u.monede; agStare.scoase = u.scoase; agStare.tickLa = acum - varsta; agStare.eroare = null; agStare.detaliu = "";
    var prezente = u.monede.length + u.scoase.stabile.length + u.scoase.nuCrypto.length + u.scoase.stricate;
    agStare.faraContract = Math.max(0, Object.keys(agStare.harta).length - prezente);
    return true;
  } catch (e) {
    agStare.eroare = "pionex"; agStare.detaliu = String(e && e.message || e).slice(0, 80);
    return false;
  } finally { agStare.tickInZbor = false; }
}
function agMoneda(s) { for (var j = 0; j < agStare.monede.length; j++) if (agStare.monede[j].simbol === s) return agStare.monede[j]; return null; }
// o cerere de lumânări picată: se numără; lumânările vechi (dacă sunt) rămân în folosință
function agEsec(s, acum) {
  var e = agStare.bare[s] || (agStare.bare[s] = { b: null, esec: 0 }), m = agMoneda(s);
  e.esec = (e.esec || 0) + 1; e.la = acum;
  if (m && !e.b && e.esec >= AG_ESEC_MAX) m.faraBare = true;
}
// trebuie cerute lumânările monedei acum? niciodată citită: da; picată: după pauza care se dublează; cu gaură: cel mult o dată la 5 minute
function agLipsa(m, acum) {
  var e = agStare.bare[m.simbol];
  if (!e) return true;
  if (e.esec > 0) return acum - e.la >= Math.min(AG_TOT_MS, AG_ESEC_MS * Math.pow(2, e.esec - 1));
  return !!e.refa && acum - e.la >= AG_TOP_MS;
}
// lumânările de 5 minute, pe rând, pentru monedele date; se oprește dacă pagina pleacă de pe ecran sau Pionex cere o pauză
async function agMasoara(lista) {
  if (agStare.masor) return;
  agStare.masor = true;
  try {
    for (var i = 0; i < lista.length; i++) {
      if (!agPeEcran() || agStare.refuzPana > agAcum()) break;
      var s = lista[i].simbol, r = null;
      try { r = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(lista[i].pionex) + "&interval=5M&limit=500"); }
      catch (e) { if (/429|prea multe|rate/i.test(String(e && e.message || e))) { agStare.refuzPana = agAcum() + 60000; break; } agEsec(s, agAcum()); continue; }
      if (r && r.result === false) { if (r.retryAfter != null) { agStare.refuzPana = agAcum() + Math.max(15, Number(r.retryAfter) || 60) * 1000; break; } agEsec(s, agAcum()); continue; }
      var b = Agitate.bare(r && r.data && r.data.klines), m = agMoneda(s);
      if (b.length < 3) { agEsec(s, agAcum()); continue; }
      /* lumânările abia citite sunt mai proaspete decât prețul din listă (ținut până la 30 s): intră cum au venit */
      agStare.bare[s] = { b: b, la: agAcum(), esec: 0, refa: false };
      if (m) { m.bare = b; m.faraBare = false; }
      agDeseneaza(true);
    }
  } finally { agStare.masor = false; agDeseneaza(true); }
}
// ce lumânări se cer acum: toate o dată pe oră; primele 24 MĂSURATE din clasament la 5 minute; cele lipsă (după regulile din agLipsa) mereu
function agDeMasurat(acum) {
  var f = Agitate.fer(agStare.k), toate = Agitate.deMasurat(agStare.monede, agStare.boti);
  if (!agStare.totLa || acum - agStare.totLa >= AG_TOT_MS) { agStare.totLa = acum; agStare.topLa = acum; return toate; }
  var lipsa = toate.filter(function (m) { return agLipsa(m, acum); });
  if (acum - agStare.topLa >= AG_TOP_MS) {
    agStare.topLa = acum;
    var top = Agitate.clasament(agStare.monede, f && f.bare ? f.k : "1h", acum).filter(function (r) { return r.x.masurat; }).slice(0, AG_TOP_N).map(function (r) { return r.m; });
    return top.concat(lipsa.filter(function (m) { return top.indexOf(m) < 0; }));
  }
  return lipsa;
}
function agMasoaraDacaTrebuie() {
  var acum = agAcum();
  if (agStare.masor || !agStare.monede.length || agStare.refuzPana > acum) return;
  var l = agDeMasurat(acum); if (l.length) agMasoara(l);
}
// bătaia ceasului (la 30 s). Pe altă pagină a Radarului ceasul se oprește (navTo ⇒ agPorneste îl repornește); cu fila ascunsă bate în gol.
async function agBataie() {
  if (!agPanouDeschis()) { if (agStare.ceas) { clearInterval(agStare.ceas); agStare.ceas = null; } return; }
  if (typeof document !== "undefined" && document.hidden) return;
  if (agStare.inLucru) return;
  await agHartaAdu(false);
  if (!agStare.harta) { agDeseneaza(); return; }
  var aveam = agStare.monede.length;
  await agTickAdu();
  agDeseneaza(!!aveam);
  agMasoaraDacaTrebuie();
}
// întoarcerea pe filă: întâi vârsta adevărată a ce e pe ecran, apoi citirea pe loc (nu după cel mult 30 s)
function agRevenire() { if (!agPeEcran()) return; agDeseneaza(true); return agBataie(); }
function agCeasPorneste() {
  if (!agStare.ceas && typeof setInterval === "function") agStare.ceas = setInterval(agBataie, AG_TICK_MS);
  if (!agStare.ascult && typeof document !== "undefined" && document.addEventListener) { agStare.ascult = true; document.addEventListener("visibilitychange", agRevenire); }
}
// „Recitește” (forta): citirea întreagă a lumânărilor de la capăt; pauza cerută de Pionex NU se șterge
async function agPorneste(forta) {
  agCeasPorneste();
  if (agStare.inLucru) return;
  agStare.inLucru = true;
  if (forta) { agStare.totLa = 0; agStare.eroare = null; agStare.detaliu = ""; }
  try {
    agDeseneaza();
    await agHartaAdu(!!forta);
    if (agStare.harta && (forta || !agStare.tickLa || agAcum() - agStare.tickLa >= AG_TICK_MS)) await agTickAdu();
  } finally { agStare.inLucru = false; agDeseneaza(); }
  agMasoaraDacaTrebuie();
}
function agFereastra(k) {
  if (!Agitate.fer(k) || k === agStare.k) return;
  agStare.k = k; try { localStorage.setItem("ag_fereastra", k); } catch (e) {}
  agDeseneaza();
}
function agToate(deschis) { agStare.toate = deschis === true || deschis === "true"; agDeseneaza(true); }
function agLaGrid(simbol) { if (typeof tzLaGrid === "function") tzLaGrid(simbol); else if (typeof navTo === "function") navTo("gridset", true); }
