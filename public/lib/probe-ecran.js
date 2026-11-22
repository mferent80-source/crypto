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
/* v100.377 (el 22.11: „fa idei”): câți boți PORNIȚI sunt chiar acum în clipa pe care o judecă proba - aceleași praguri ca episodul probei
   (scripts/lib/proba-margine.mjs: PRAG_PIERDERE 5% din sumă; PRAG_TIMP 0,5% între 4 și 24 de ore) și ca alerta de 4 ore. Un fapt de azi lângă o probă
   care încă n-are verdict, nu un sfat. `null` = lista boților necunoscută (nu se scrie nimic); boții fără suma citită se numără separat. */
var PR_MINUS_TIMP = 0.005, PR_ORE_MAX = 24;
function prPorniti(boti, acum) {
  if (!Array.isArray(boti)) return null;
  var A = boti.filter(function (b) { return b && b.activ !== false; }), L = A.filter(function (b) { return Number(b.investit) > 0 && typeof b.profitTotal === "number" && isFinite(b.profitTotal); });
  var fa = function (cine) { var t = 0, s = 0; cine.forEach(function (b) { t += b.profitTotal; s += Number(b.investit); }); return { n: cine.length, total: t, suma: s }; };
  return { activi: A.length, n: L.length,
    pierdere: fa(L.filter(function (b) { return b.profitTotal <= -PR_PIERDERE.prag / 100 * Number(b.investit); })),
    timp: fa(L.filter(function (b) { var p = Number(b.pornitLa), v = acum - p; return p > 0 && v >= PR_TIMP.ore * 3600000 && v < PR_ORE_MAX * 3600000 && b.profitTotal <= -PR_MINUS_TIMP * Number(b.investit); })) };
}
function prPornitiText(P, ce, areVerdict) {
  if (!P) return undefined;
  if (!P.activi) return "niciun bot pornit acum";
  var g = P[ce], fara = P.activi - P.n, coada = fara > 0 ? sugCate(fara, "bot pornit", "boți porniți") + " fără suma citită, " + (fara === 1 ? "nenumărat" : "nenumărați") : "";
  var z1 = function (v) { var p = Math.abs(v).toFixed(1).split("."); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1]; }, minus = String(PR_MINUS_TIMP * 100).replace(".", ",");
  if (!P.n) return coada;
  if (!g.n) return (P.n === 1 ? "botul pornit nu e" : "niciunul din cei " + sugCate(P.n, "bot pornit", "boți porniți") + " nu e")
    + (ce === "pierdere" ? " acum la −" + PR_PIERDERE.prag + "% din sumă" : ", între " + PR_TIMP.ore + " și " + PR_ORE_MAX + " de ore de la pornire, pe minus cu " + minus + "% din sumă") + (coada ? " · " + coada : "");
  return sugCate(g.n, "bot pornit", "boți porniți")
    + (ce === "pierdere" ? (g.n === 1 ? " e" : " sunt") + " acum la −" + PR_PIERDERE.prag + "% din sumă sau sub" : (g.n === 1 ? " a trecut de " : " au trecut de ") + sugCate(PR_TIMP.ore, "oră", "ore") + (g.n === 1 ? " și e" : " și sunt") + " pe minus cu cel puțin " + minus + "% din sumă")
    + ": total " + (g.total < 0 ? "−" : "+") + z1(g.total) + " USDT din " + z1(g.suma) + " USDT puși (" + (g.total < 0 ? "−" : "+") + z1(g.total / g.suma * 100) + "%)"
    + (areVerdict ? "" : " · proba încă n-are verdict") + (coada ? " · " + coada : "");
}
function prProbe(d, acum) {
  /* lista boților porniți: cea a Tabloului, deja încărcată în pagină (fără altă cerere la Pionex) */
  var BP = prPorniti(d && d.botiPorniti ? d.botiPorniti : (typeof tbStare !== "undefined" && tbStare && Array.isArray(tbStare.boti) ? tbStare.boti : null), acum);
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
  R.push({ k: "trend", nume: "📈 Trend 12 luni · acțiuni SUA", de: b && b.zile ? "de " + sugCate(b.zile, "zi", "zile") : "—", jud: b && b.forma ? "bilanțul robotului are o formă necunoscută (nu-l citesc)" : b ? sugCate(b.n20 || 0, "zi", "zile") + " cu rezultat" + (b.ferestre20 != null ? " (" + sugCate(b.ferestre20, "fereastră", "ferestre") + " de 20 z)" : "") : T ? "0 zile cu rezultat (robotul n-a trimis încă bilanțul)" : "aștept robotul (după 8:00)",
    sta: b ? (b.diferenta20 && b.diferenta20.medie != null && b.n20 ? sugP1(b.diferenta20.medie / 100) + " față de alte acțiuni" : "fără cifre încă") + (b.t20 != null ? ", t " + sugZec(b.t20) : "") + " · " + (b.verdict || "în probă") + (b.abatere && b.abatere.atinsa ? " · ABATERE sub pragul scris înainte" : "") : T ? "fără cifre încă" : "—",
    ultima: T && T.dataUltimei ? "EOD " + prZi(T.dataUltimei) : "", drum: { svg: prDrumSvg(b && b.ferestre20 != null ? b.ferestre20 / 12 : 0, [], "Trend 12 luni: " + (b && b.ferestre20 != null ? b.ferestre20 : 0) + " din cele 12 ferestre cerute"), text: "fără dată fixă: „probat” cere t peste 3,2 pe cel puțin 12 ferestre de 20 de zile" },
    act: ["în Sugestii ›", "navTo('sugestii',true)"] });
  var P = d.pareri, l = P && Array.isArray(P.pareri) ? P.pareri : [], sc = typeof Caiet !== "undefined" ? Caiet.scor(l, P && P.judecate) : {}, nj = 0, ab = [];
  Object.keys(sc).forEach(function (k) { nj = Math.max(nj, sc[k].judecate); if (sc[k].judecate) ab.push((k === "claude" ? "Claude " : "tu ") + prAbil(sc[k].abilitate)); });
  R.push({ k: "caiet", nume: "📓 Caietul de păreri · tu și Claude", de: l.length ? prZi(new Date(Math.min.apply(null, l.map(function (p) { return p.la; }))).toISOString().slice(0, 10)) : "de la prima părere", jud: P ? sugCate(l.length, "părere notată", "păreri notate") + ", " + sugCate(Object.keys(sc).reduce(function (s, k) { return s + sc[k].judecate; }, 0), "judecată", "judecate") : "aștept caietul",
    sta: ab.length ? "față de „50% la fiecare”: " + ab.join(" · ") + (nj < 30 ? " · sub 30 de păreri judecate, scorul e zgomot" : "") : "nicio părere judecată încă",
    ultima: "", drum: { svg: prDrumSvg(nj / 30, [], "Caietul: " + nj + " din cele 30 de păreri judecate de la care scorul începe să spună ceva"), text: "fără dată fixă: un prim semn de la 30 de păreri judecate pe autor" }, act: ["la caiet ›", "prLaCaiet()"] });
  // v100.353: Oscilo (la capăt: probele vechi citesc rândurile după poziție) - fără dată fixă: privirile la 28 și 42 de zile judecate
  var os = d.oscilo, uo = os && os.urmarire, oS = os && os.start, nz = uo && uo.zile || 0, po = uo && uo.principal || {}, g1 = uo && uo.G && uo.G.G1 || {};
  R.push({ k: "osc", nume: "🔁 Oscilo · canal de ±5–10% pe 14 zile, primele 100 Pionex", de: oS ? prZi(oS) : "de la prima tură (după 00:30 UTC)", jud: nz ? sugCate(nz, "zi judecată", "zile judecate") + ", " + sugCate(po.nO || 0, "intrare Oscilo", "intrări Oscilo") : "nicio zi judecată încă: fiecare zi se judecă la 7 zile după ea",
    sta: nz ? "canalul a ținut 7 zile la Oscilo în " + sugPc(po.O) + ", la restul în " + sugPc(po.R) + "; gridul ca în probă: Oscilo " + oscG(g1.O) + ", restul " + oscG(g1.R) + (nz < 28 ? "; sub 28 de zile, prea puține observații" : "") : "pe istoric: canalul ține mai des (23% față de 14%, t 3,1), dar gridul pe canal a pierdut (−2,7% în 7 zile)",
    ultima: os && os.zi ? "ultima zi: " + prZi(os.zi) + (oscVeche(os, acum) ? " · LISTĂ VECHE" : "") : "aștept tura de după 00:30 UTC", drum: { svg: prDrumSvg(Math.min(nz, 42) / 42, [28 / 42], "Oscilo: " + Math.min(nz, 42) + " din cele 42 de zile judecate ale verdictului"), text: "fără dată fixă: prima privire la 28 de zile judecate, verdictul la 42 (cam 7 săptămâni de la start)" } });
  // v100.360: „3 la rând” (la capăt, după Oscilo: probele vechi citesc rândurile după poziție) - regulile în docs/cercetare/2026-11-18-proba-trei-la-rand.md;
  // până la orizont doar cifre (p nu se arată), verdictul înghețat o dată la a N-a zi care contează sau la limită
  var tr = d.treiLaRand, tN = tr && tr.N || PR_TREI.N, tC = tr && tr.zileConteaza || 0, tV = tr && tr.verdict && tr.inghetat ? tr.inghetat : null;
  R.push({ k: "trei", nume: "✋ 3 pierderi la rând = gata ziua · boții porniți după, în aceeași zi", de: prZi(tr && tr.start || PR_TREI.start),
    jud: tr && tr.zileJudecate ? sugCate(tr.zileJudecate, "zi judecată", "zile judecate") + ", " + (tr.zileCuDeclansare || 0) + " cu declanșare, " + tC + " din " + tN + " care contează (cu boți și înainte, și după)" : "nicio zi judecată încă: o zi se judecă după ce s-au închis toți boții porniți în ea (cel târziu la 7 zile)",
    sta: tV ? "VERDICT pe " + sugCate(tV.zileConteaza || 0, "zi", "zile") + " (până la " + prZi(tV.pana) + "): " + (tV.verdict === "tine" ? "ține: boții porniți după 3 pierderi la rând au ieșit mai prost decât dă mecanica" : "nedovedit pe zilele noi (nu înseamnă că regula e greșită)") + " · după − înainte " + prUsd(tV.statistica) + " USDT pe bot, mecanica singură " + prUsd(tV.mecanica) + ", p " + prP(tV.pH0)
      : tC ? "după − înainte: " + prUsd(tr.statistica) + " USDT pe bot; doar mecanica ar da " + prUsd(tr.mecanica) + (tC < tN ? "; sub " + sugCate(tN, "zi", "zile") + " care contează, cifrele sunt zgomot" : "")
      : "pe istoric: după − înainte −0,5 USDT pe bot, iar doar mecanica ar da +3,8 (p 0,01, dar 1 din cel puțin 6 teste); aici se vede pe zile noi",
    ultima: tr && tr.la ? "ultima tură: " + prOra(tr.la) + (acum - tr.la > 30 * 3600000 ? " · VECHE" : "") + (tr.asteapta ? " · " + sugCate(tr.asteapta, "zi așteaptă", "zile așteaptă") + " închiderea boților" : "") : "aștept tura de după 00:30 UTC",
    drum: { svg: prDrumSvg(Math.min(tC, tN) / tN, [], "3 la rând: " + Math.min(tC, tN) + " din cele " + sugCate(tN, "zi", "zile") + " care contează ale verdictului"), text: "fără dată fixă: verdictul la a " + tN + "-a zi care contează, cel târziu la " + prZi(tr && tr.limita || PR_TREI.limita) + "; " + PR_TREI.putere } });
  // v100.374 (I-908): proba marginii - „stop la margine sau nu?” (la capăt: probele vechi citesc rândurile după poziție); regulile, scrise înainte
  // de cifre, în docs/cercetare/2026-11-21-v100374-proba-marginii.md; sub prag doar cifre, verdictul de la 60 de episoade pe 20 de zile
  var mg = d.probaMargine, mN = mg && mg.minEpisoade || PR_MARGINE.n, mZ = mg && mg.minZile || PR_MARGINE.zile, mB = mg && mg.boti || null;
  var p1 = function (v) { return v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ",") + "%"; };
  /* revizia (21.11): sub prag se arată DOAR numărătoarea (media văzută la fiecare tură ar fi o privire pe parcurs); verdictul e cel ÎNGHEȚAT de
     colector la prima tură cu toată arhiva citită și pragul atins - episoadele de după se numără, dar nu-l schimbă */
  var mV = mg && mg.inghetat && mg.inghetat.verdict ? mg.inghetat : null, mIc = mV && mV.ic ? " (interval 95% pe zile: " + p1(mV.ic[0]) + " … " + p1(mV.ic[1]) + ")" : "";
  var mAlte = mB ? (mB.drumTaiat || 0) + (mB.gol || 0) + (mB.mutat || 0) : 0;
  /* revizia reparațiilor (22.11, N3): boții al căror drum n-a putut fi citit nici după 24 de ture ies din probă - numărați aici, nu pe tăcute; a doua trecere (D1): se reîncearcă zilnic, iar peste 3 țin verdictul - spus aici */
  var necititText = function (B) { return B && B.necititi > 0 ? " · " + sugCate(B.necititi, "bot cu drumul necitit", "boți cu drumul necitit") + " (se reîncearcă o dată pe zi" + (B.necititi > 3 ? "; cât sunt mai mult de 3, verdictul nu se dă" : "") + ")" : ""; };
  /* v100.377 (el, 22.11: „idei care chiar să conteze”): proba pierderii - a doua regulă de ieșire pusă la probă; sub prag doar numărătoarea */
  var pg = d.probaPierdere, pN = pg && pg.minEpisoade || PR_PIERDERE.n, pZ = pg && pg.minZile || PR_PIERDERE.zile, pB = pg && pg.boti || null;
  var pV = pg && pg.inghetat && pg.inghetat.verdict ? pg.inghetat : null, pIc = pV && pV.ic ? " (interval 99,5% pe zile: " + p1(pV.ic[0]) + " … " + p1(pV.ic[1]) + ")" : "";
  var pAlte = pB ? (pB.drumTaiat || 0) + (pB.gol || 0) + (pB.pornitSub || 0) : 0;
  R.push({ k: "pierdere", nume: "✂️ Închid la −" + PR_PIERDERE.prag + "% din sumă sau las? · boții tăi, din clipa în care totalul ajunge acolo", de: prZi(PR_PIERDERE.start), acum: prPornitiText(BP, "pierdere", !!pV),
    jud: pg ? sugCate(pg.n || 0, "episod", "episoade") + " în " + sugCate(pg.zile || 0, "zi", "zile") + (pB ? " · citiți " + sugCate(pB.judecati, "bot închis", "boți închiși") + ": " + (pB.pestePrag || 0) + " n-au ajuns la prag, " + (pB.faraDrum || 0) + " fără drum, " + pAlte + " cu drumul tăiat sau cu goluri (boții ținuți peste 7 zile și cei încă deschiși nu intră: lipsesc tocmai cei lăsați cel mai mult, deci un „lăsatul a fost mai bun” e mai slab decât pare)" : "") + necititText(pB) : "aștept colectorul (o dată pe oră)",
    sta: pV ? "VERDICT (înghețat la " + prOra(pV.la) + ", pe " + sugCate(pV.n, "episod", "episoade") + " în " + sugCate(pV.zile, "zi", "zile") + "): " + (pV.verdict === "inchiderea" ? "închiderea la −" + PR_PIERDERE.prag + "% ar fi fost mai bună" : pV.verdict === "lasatul" ? "lăsatul a fost mai bun" : "n-am aflat" + (pV.seContrazic ? " (datele se contrazic)" : "")) + " · lăsat − închis la prag: " + p1(pV.medie) + " din suma pusă, în medie pe bot" + pIc + " · în total " + prUsd(pV.suma) + " USDT"
        + (pg.n > pV.n ? " · de atunci s-au mai adunat " + sugCate(pg.n - pV.n, "episod", "episoade") + " (verdictul nu se schimbă)" : "")
      : pg ? "doar numărătoarea până la prag: diferența dintre „lăsat” și „închis la −" + PR_PIERDERE.prag + "%” se arată o singură dată, la verdict" + (pB && pB.ramasi ? " · mai sunt de citit " + sugCate(pB.ramasi, "bot", "boți") : "")
        : "din arhiva ta, la 22.11.2026: câștigul mediu rămâne ~3% din sumă oricât stă botul, pierderea medie crește cu vârsta lui; dacă închiderea devreme ar fi ajutat se vede abia cu drumul fiecărui bot",
    ultima: pg && pg.la ? "ultima tură: " + prOra(pg.la) + (acum - pg.la > 8 * 3600000 ? " · VECHE" : "") : "",
    drum: { svg: prDrumSvg(Math.min((pg && pg.n || 0) / pN, (pg && pg.zile || 0) / pZ), [], "Proba pierderii: " + (pg && pg.n || 0) + " din " + sugCate(pN, "episod", "episoade") + ", " + (pg && pg.zile || 0) + " din " + sugCate(pZ, "zi", "zile")),
      text: "fără dată fixă: verdictul de la " + sugCate(pN, "episod", "episoade") + " pe " + sugCate(pZ, "zi", "zile") + "; o singură regulă, un singur prag (cel de „pierdere mare” al paginii), scrise înainte de date" } });
  /* v100.377 (el, 22.11: „fă ideile astea”): proba timpului - „închid după 4 ore pe minus”, clipa alertei de 4 ore; sub prag doar numărătoarea */
  var tg = d.probaTimp, tN = tg && tg.minEpisoade || PR_TIMP.n, tZ = tg && tg.minZile || PR_TIMP.zile, tB = tg && tg.boti || null;
  var tV = tg && tg.inghetat && tg.inghetat.verdict ? tg.inghetat : null, tIc = tV && tV.ic ? " (interval 99,5% pe zile: " + p1(tV.ic[0]) + " … " + p1(tV.ic[1]) + ")" : "";
  var tAlte = tB ? (tB.drumTaiat || 0) + (tB.gol || 0) : 0;
  var tOre = sugCate(PR_TIMP.ore, "oră", "ore");   /* „4 ore”: numărul nu se lipește de substantiv */
  R.push({ k: "timp", nume: "⏱️ Închid după " + tOre + " pe minus sau las? · boții tăi, din clipa alertei „a trecut de " + tOre + " și e pe minus”", de: prZi(PR_TIMP.start), acum: prPornitiText(BP, "timp", !!tV),
    jud: tg ? sugCate(tg.n || 0, "episod", "episoade") + " în " + sugCate(tg.zile || 0, "zi", "zile") + (tB ? " · citiți " + sugCate(tB.judecati, "bot închis", "boți închiși") + ": " + (tB.scurt || 0) + " închiși înainte de " + tOre + ", " + (tB.pePlus || 0) + " n-au fost pe minus între " + PR_TIMP.ore + " și 24 de ore, " + (tB.faraDrum || 0) + " fără drum, " + tAlte + " cu drumul tăiat sau cu goluri (boții ținuți peste 7 zile și cei încă deschiși nu intră: lipsesc tocmai cei lăsați cel mai mult, deci un „lăsatul a fost mai bun” e mai slab decât pare)" : "") + necititText(tB) : "aștept colectorul (o dată pe oră)",
    sta: tV ? "VERDICT (înghețat la " + prOra(tV.la) + ", pe " + sugCate(tV.n, "episod", "episoade") + " în " + sugCate(tV.zile, "zi", "zile") + "): " + (tV.verdict === "inchiderea" ? "închiderea la " + tOre + " ar fi fost mai bună" : tV.verdict === "lasatul" ? "lăsatul a fost mai bun" : "n-am aflat" + (tV.seContrazic ? " (datele se contrazic)" : "")) + " · lăsat − închis atunci: " + p1(tV.medie) + " din suma pusă, în medie pe bot" + tIc + " · în total " + prUsd(tV.suma) + " USDT"
        + (tg.n > tV.n ? " · de atunci s-au mai adunat " + sugCate(tg.n - tV.n, "episod", "episoade") + " (verdictul nu se schimbă)" : "")
      : tg ? "doar numărătoarea până la prag: diferența dintre „lăsat” și „închis la " + tOre + "” se arată o singură dată, la verdict" + (tB && tB.ramasi ? " · mai sunt de citit " + sugCate(tB.ramasi, "bot", "boți") : "")
        : "din arhiva ta, la 22.11.2026: boții ajunși la " + tOre + " erau 22% din boți și făcuseră 64% din pierdere; dacă închiderea de atunci ar fi ajutat se vede abia cu drumul fiecărui bot",
    ultima: tg && tg.la ? "ultima tură: " + prOra(tg.la) + (acum - tg.la > 8 * 3600000 ? " · VECHE" : "") : "",
    drum: { svg: prDrumSvg(Math.min((tg && tg.n || 0) / tN, (tg && tg.zile || 0) / tZ), [], "Proba timpului: " + (tg && tg.n || 0) + " din " + sugCate(tN, "episod", "episoade") + ", " + (tg && tg.zile || 0) + " din " + sugCate(tZ, "zi", "zile")),
      text: "fără dată fixă: verdictul de la " + sugCate(tN, "episod", "episoade") + " pe " + sugCate(tZ, "zi", "zile") + "; pragurile alertei de " + tOre + ", scrise înainte de date; două reguli de ieșire sunt la probă deodată (și cea de −5%)" } });
  R.push({ k: "margine", nume: "🧱 Stop la margine sau nu? · boții tăi, din clipa în care prețul trece de marginea contra", de: prZi(PR_MARGINE.start),
    jud: mg ? sugCate(mg.n || 0, "episod", "episoade") + " în " + sugCate(mg.zile || 0, "zi", "zile") + " (istoria din arhivă și datele noi)" + (mB ? " · citiți " + mB.judecati + " din " + sugCate(mB.total, "bot închis", "boți închiși") + ": " + (mB.inGrid || 0) + " rămași în grid, " + (mB.faraDrum || 0) + " fără drum în arhivă, " + mAlte + " cu drumul tăiat, cu goluri sau cu gridul mutat chiar la trecere (boții ținuți peste 7 zile nu intră)" : "") + necititText(mB) : "aștept colectorul (o dată pe oră, câte 90 de boți închiși)",
    sta: mV ? "VERDICT (înghețat la " + prOra(mV.la) + ", pe " + sugCate(mV.n, "episod", "episoade") + " în " + sugCate(mV.zile, "zi", "zile") + "): " + (mV.verdict === "inchiderea" ? "închiderea la margine ar fi fost mai bună" : mV.verdict === "lasatul" ? "lăsatul a fost mai bun" : "n-am aflat" + (mV.seContrazic ? " (istoria și datele noi se contrazic)" : "")) + " · lăsat − închis la margine: " + p1(mV.medie) + " din suma pusă, în medie pe bot" + mIc + " · în total " + prUsd(mV.suma) + " USDT"
        + (mg.n > mV.n ? " · de atunci s-au mai adunat " + sugCate(mg.n - mV.n, "episod", "episoade") + " (verdictul nu se schimbă)" : "")
      : mg ? "doar numărătoarea până la prag: diferența dintre „lăsat” și „închis la margine” se arată o singură dată, la verdict" + (mB && mB.ramasi ? " · mai sunt de citit " + sugCate(mB.ramasi, "bot", "boți") : "") : "pe boții închiși dincolo de margine (176): −9.855,0 USDT, din care estimat −4.900,4 făcuți după margine; ce ar fi adus închiderea acolo se vede abia cu drumul fiecărui bot",
    ultima: mg && mg.la ? "ultima tură: " + prOra(mg.la) + (acum - mg.la > 8 * 3600000 ? " · VECHE" : "") : "",
    drum: { svg: prDrumSvg(Math.min((mg && mg.n || 0) / mN, (mg && mg.zile || 0) / mZ), [], "Proba marginii: " + (mg && mg.n || 0) + " din " + sugCate(mN, "episod", "episoade") + ", " + (mg && mg.zile || 0) + " din " + sugCate(mZ, "zi", "zile")),
      text: "fără dată fixă: verdictul de la " + sugCate(mN, "episod", "episoade") + " pe " + sugCate(mZ, "zi", "zile") + "; " + PR_MARGINE.putere } });
  return R;
}
/* v100.374: proba marginii - ce se știe dinainte (din documentul pre-înregistrării) */
/* v100.377: proba pierderii („închid la −5% din sumă”); regulile în docs/cercetare/2026-11-22-v100377-proba-pierderii.md */
var PR_PIERDERE = { n: 60, zile: 20, start: "2026-11-22", prag: 5 };
var PR_TIMP = { n: 60, zile: 20, start: "2026-11-22", ore: 4 };
var PR_MARGINE = { n: 60, zile: 20, start: "2026-11-21", putere: "o diferență medie sub ~2,6% din sumă rămâne „n-am aflat”" };
// v100.360: „3 la rând” - ce se știe dinainte (din documentul pre-înregistrării, secțiunea 9); cifrele rezultatelor cu o singură zecimală
var PR_TREI = { N: 45, start: "2026-11-19", limita: "2027-11-18", putere: "puterea e mică: cam 2 șanse din 3 să prindă un efect cât cel văzut pe ritmul mediu de până acum (în cam 8–9 luni), cam 1 din 5 pe ritmul din ultimele 6 luni (atunci verdictul vine la limită)" };
function prUsd(v) { return v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ","); }
function prP(v) { return v == null || !isFinite(v) ? "—" : v.toFixed(2).replace(".", ","); }
function prStadiuHtml(d, acum) {
  var R = prProbe(d, acum);
  return '<section class="tbBloc prStadiu" data-pr="stadiu"><div class="sugPandaCap"><h4>Unde e fiecare probă</h4><span class="tbSub">regulile s-au fixat înainte; până la privire doar cifre, fără verdict</span></div><div class="prRanduri">'
    + R.map(function (r) {
      return '<div class="prRand" data-proba="' + r.k + '"><div class="prNume"><b>' + sugEsc(r.nume) + '</b> <span class="sugVerdict sugVerdict-p">ÎN PROBĂ</span>' + (r.act ? ' <button type="button" class="t212BtnLinie prDu" data-action-click="' + sugEsc(r.act[1]) + '">' + sugEsc(r.act[0]) + '</button>' : '') + '</div>'
        + '<dl class="prFapte"><div><dt>De când</dt><dd>' + sugEsc(r.de) + '</dd></div><div><dt>Judecate</dt><dd>' + sugEsc(r.jud) + '</dd></div><div class="prSta"><dt>Cum stă, fără verdict</dt><dd>' + sugEsc(r.sta) + '</dd></div>' + (r.acum ? '<div class="prAcum"><dt>La boții porniți acum</dt><dd>' + sugEsc(r.acum) + '</dd></div>' : '') + '</dl>'
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
      pas("oscilo", function () { return getJSON("/api/istoric-bot?action=oscilo").then(function (r) { return r && r.oscilo || null; }); }),   /* v100.353 */
      pas("treiLaRand", function () { return getJSON("/api/istoric-bot?action=treiLaRand").then(function (r) { return r && r.treiLaRand || null; }); }),   /* v100.360 */
      pas("probaMargine", function () { return getJSON("/api/istoric-bot?action=probaMargine").then(function (r) { return r && r.probaMargine || null; }); }),   /* v100.374 */
      pas("probaPierdere", function () { return getJSON("/api/istoric-bot?action=probaPierdere").then(function (r) { return r && r.probaPierdere || null; }); }),   /* v100.377 */
      pas("probaTimp", function () { return getJSON("/api/istoric-bot?action=probaTimp").then(function (r) { return r && r.probaTimp || null; }); }),   /* v100.377 */
      pas("trend12", function () { return getJSON("/api/istoric-bot?action=trend12").then(function (r) { return r && r.trend || null; }); }),
      pas("probaA", function () { return getJSON("/api/istoric-bot?action=probaA").then(function (r) { return r && r.probaA || null; }); }),
      pas("pareri", function () { return getJSON("/api/istoric-bot?action=pareri"); })
    ]);
  } finally { prStare.inLucru = false; }
  if (sugStare.vedere !== "probe") return;
  sugDeseneaza(); prCaietDeseneaza();
  try { var ra = sugRandAles(); await Promise.all([sugGraficAdu(ra), typeof sugIndAdu === "function" ? sugIndAdu(ra) : null]); } catch (e) {}   // v100.344: și detaliile indicatorilor + TradingView ale fișei
}
