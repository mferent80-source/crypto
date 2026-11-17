// v100.134 (el 07.10: „vreau să pun valori din grid ca la TradingView și să calculeze el probabilitățile de câștig” → spec
// docs/superpowers/specs/2026-10-07-simulator-grid-design.md): motorul paginii „Simulator grid”. Modul PUR (fără DOM, fără rețea).
// (1) codul pentru GRID-FISA dus-întors (dinCod / inCod) și setările din botul Pionex (setariDinBot); (2) simuleaza: pe fiecare drum
// (14 zile de bare de 15 minute lipite din zile reale, fără tendința perioadei - ca în Monte Carlo) botul rulează O SINGURĂ dată
// (GridProba.simuleaza cu traseu), iar traseul se citește la 1 / 3 / 7 / 14 zile: câștigă / pierde, planul lui (+X înainte de −Y),
// lichidare, stop, TP, ieșit din grid, grile, pierderea maximă pe drum, funding; botul care RULEAZĂ e reluat pe barele reale de la
// pornire, apoi continuă pe drumuri (prefix + viitor, aceeași simulare); (3) verdict: textele, cu regulile fixate dinainte (§3 din spec).
// Se încarcă DUPĂ grid-calcul.js, grid-proba.js, monte-simbol.js.
var GridSim = (function () {
  "use strict";
  var G = GridCalcul, GP = GridProba, M = MonteSimbol, BZ = 96;
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(typeof v === "string" ? v.replace(",", ".") : v); return isFinite(x) ? x : null; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function pc(v, p) { return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : null; }
  function nrRo(v, z) { return Number(v).toLocaleString("ro-RO", { minimumFractionDigits: z, maximumFractionDigits: z }); }
  function semn(v) { return v > 0 ? "+" : v < 0 ? "−" : ""; }
  function bani1(v) { return v == null || !isFinite(v) ? "—" : semn(Math.round(v * 10) / 10) + nrRo(Math.abs(v), 1) + " USDT"; }   // rezultatele: o zecimală
  function semn1(v) { return v == null || !isFinite(v) ? "—" : semn(Math.round(v * 10) / 10) + nrRo(Math.abs(v), 1); }
  function pr(v) { return v == null || !isFinite(v) ? "—" : Math.round(v * 100) + "%"; }
  function prMic(v) { return v > 0 && v < 0.005 ? "sub 1%" : pr(v); }   // v100.196: o frecvență pozitivă nu se scrie „0%”
  function pretTxt(v) { if (v == null || !isFinite(v)) return "—"; var a = Math.abs(v); return a > 0 && a < 0.01 ? nrRo(Number(v.toPrecision(4)), Math.min(12, 3 - Math.floor(Math.log10(a)))) : nrRo(v, a < 1 ? 4 : 2); }
  function dataTxt(t) { return new Date(t).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  // fără exponent la monedele foarte ieftine: 6 cifre semnificative scrise întreg (ca în codTVBot)
  function f6(v) { v = nr(v); if (v === null || !(v > 0)) return "0"; var s = String(Number(v.toPrecision(6))); return /e/i.test(s) ? Number(v.toPrecision(6)).toFixed(Math.min(20, 5 - Math.floor(Math.log10(v)))).replace(/\.?0+$/, "") : s; }

  // ---------------- (1) codul GRID-FISA ----------------
  var NUME = ["direcția", "jos", "sus", "linii", "levier", "stopJos", "stopSus", "lichJos", "lichSus", "suma", "tip", "planMinus", "planPlus", "planAfaraOre", "verdict", "generatLa", "margJos", "margSus", "pornitLa", "tpAprox"];
  function tipDin(t) { t = String(t || "").trim().toLowerCase(); return /^(aritmetic|arit|arithmetic)$/.test(t) ? "aritmetic" : /^(geometric|geo)$/.test(t) ? "geometric" : null; }
  // rândul copiat din Tablou / fișa Grid (9–20 câmpuri, aceeași ordine ca TabloExtra.codTVBot) ⇒ setările; stopul / TP-ul după ROL, ca în Pine:
  // long: câmpul 6 = stop, 7 = TP; short: 7 = stop (TP-ul nu e în cod); neutru: cel scris = stop, pe partea lui. Liniile sunt ca în Pionex ⇒ intervale = linii − 1
  function dinCod(text) {
    var t = String(text == null ? "" : text).trim(), out = { st: null, plan: null, lich: null, pornitLa: null, tpAprox: false, eroare: null };
    if (!t) { out.eroare = "Codul e gol: lipește rândul copiat din Tablou („Copiază codul”) sau din fișa Grid („Pentru TradingView”)."; return out; }
    var p = t.split(";").map(function (s) { return s.trim(); }), nc = p.length;
    if (nc < 9 || nc > 20) { out.eroare = "Codul trebuie să aibă între 9 și 20 de câmpuri despărțite prin „;” — are " + nc + "."; return out; }
    var dir = p[0].toLowerCase();
    if (dir !== "long" && dir !== "short" && dir !== "neutru") { out.eroare = "Direcția din cod trebuie să fie long / short / neutru — e „" + p[0] + "”."; return out; }
    var num = [];
    for (var i = 1; i <= 9 && i < nc; i++) { var v = p[i] === "" ? 0 : Number(p[i].replace(",", ".")); if (!isFinite(v)) { out.eroare = "Câmpul " + (i + 1) + " (" + NUME[i] + ") nu e un număr: „" + p[i] + "”."; return out; } num[i] = v; }
    var jos = num[1], sus = num[2], linii = num[3], lev = num[4], sj = num[5], ss = num[6], lj = num[7], ls = num[8], suma = nc >= 10 ? num[9] : 0;
    if (!(jos > 0) || !(sus > jos)) { out.eroare = "Sus trebuie să fie peste jos (jos „" + p[1] + "”, sus „" + p[2] + "”)."; return out; }
    if (linii < 3 || linii > 151) { out.eroare = "Numărul liniilor trebuie să fie între 3 și 151 (ca în Pionex) — e " + p[3] + "."; return out; }
    var stop = null, tp = null;
    if (dir === "long") { if (sj > 0) stop = { jos: sj }; if (ss > 0) tp = ss; }
    else if (dir === "short") { if (ss > 0) stop = { sus: ss }; }
    else { if (sj > 0 && ss > 0) stop = { jos: sj, sus: ss }; else if (sj > 0) stop = { jos: sj }; else if (ss > 0) stop = { sus: ss }; }   // revizia: neutru cu amândouă (Pine le citește pe amândouă ca stop)
    out.st = { jos: jos, sus: sus, grile: Math.round(linii) - 1, levier: Math.max(1, Math.round(lev)), dir: dir, suma: suma > 0 ? suma : null, stop: stop, tp: tp, tip: nc >= 11 ? tipDin(p[10]) : null };
    out.lich = { jos: lj > 0 ? lj : null, sus: ls > 0 ? ls : null };
    if (nc >= 12) { var nrc = function (x) { return Number(String(x == null ? "" : x).replace(",", ".")) || 0; }, pm = Math.abs(nrc(p[11])), pp = nc >= 13 ? nrc(p[12]) : 0, oa = nc >= 14 ? nrc(p[13]) : 0; if (pm > 0 || pp > 0 || oa > 0) out.plan = { minus: pm, plus: pp, afaraOre: oa }; }   // revizia: și codurile cu 12–13 câmpuri
    if (nc >= 19) { var pz = Number(p[18]); out.pornitLa = pz > 0 ? pz : null; }
    if (nc >= 20) out.tpAprox = p[19] === "1";
    return out;
  }
  // setările ⇒ rândul pentru GRID-FISA (10 câmpuri; + tip; + planul, 14) - restul (verdict, generatLa, margini, pornirea) le dă Tabloul
  function inCod(st, plan) {
    var lg = st.dir === "long", sj = st.stop && st.stop.jos > 0 ? st.stop.jos : 0, ss = st.stop && st.stop.sus > 0 ? st.stop.sus : 0;
    if (lg && st.tp > 0) ss = st.tp;
    var parti = [st.dir, f6(st.jos), f6(st.sus), String(Math.round(st.grile) + 1), String(Math.max(1, Math.round(st.levier))), f6(sj), f6(ss), "0", "0", st.suma > 0 ? String(Math.round(st.suma * 100) / 100) : "0"];
    var pl = plan && (plan.minus > 0 || plan.plus > 0 || plan.afaraOre > 0) ? plan : null;
    if (st.tip || pl) parti.push(st.tip || "");
    if (pl) parti.push(String(Math.abs(nr(pl.minus) || 0)), String(nr(pl.plus) || 0), String(nr(pl.afaraOre) || 0));
    return parti.join(";");
  }
  // din botul Pionex (aceeași citire ca mcsSetariBot: Pionex numără LINIILE ⇒ intervale = row − 1; stopul pe partea direcției; TP la long / short)
  function setariDinBot(b) {
    var d = String(b && b.directie || "").toLowerCase(), dir = d === "long" || d === "short" ? d : "neutru", bu = b && b.brut && b.brut.buOrderData || {};
    // v100.196 (auditul 14.10, 🔵2): la neutru partea stopului vine din pret (peste pret = sus), nu „jos” mereu
    var opB = Number(b.opritorPierdere), pB = Number(b.pretCurent), row = Number(bu.row), stop = b.opritorPierdereActiv && opB > 0 ? (dir === "short" || (dir === "neutru" && pB > 0 && opB > pB) ? { sus: opB } : { jos: opB }) : null;
    var tp = dir !== "neutru" && b.opritorProfitActiv && Number(b.opritorProfit) > 0 ? Number(b.opritorProfit) : null;
    var r = { st: { jos: Number(b.gridJos), sus: Number(b.gridSus), grile: row > 1 ? Math.round(row) - 1 : 20, levier: Number(b.levier) || 1, dir: dir, suma: Number(b.investit) > 0 ? Number(b.investit) : null, stop: stop, tp: tp, tip: tipDin(bu.gridType) },
      pornitLa: Number(b.pornitLa) > 0 ? Number(b.pornitLa) : null, tpAprox: !!(tp && b.opritorProfitTip === "raport"), pozitie: nr(b.pozitie) };   // v100.350: poziția din Pionex (monede, cu semn)
    // v100.259 (auditul 23.10): stopul pus în PROCENTE intră în simulare ca raport (totalul cu grilele de pe drum ≤ r · investiție); prețul
    // serverului (poziția înghețată) rămâne în st.stop doar de afișat - simularea nu-l folosește când are raportul
    var rP = Number(b.opritorPierdereRaport);
    if (b.opritorPierdereActiv && b.opritorPierdereTip === "raport" && isFinite(rP) && rP < 0) r.st.stopRaport = rP;
    return r;
  }
  // v100.259: stopurile pe care le folosește SIMULAREA - cu raportul, prețul fix al stopului iese (doar ținta rămâne)
  function raportValid(v) { return v !== null && v !== undefined && v !== "" && isFinite(v) && Number(v) < 0 ? Number(v) : null; }
  // v100.259 (auditul 23.10, punctul 4): UN singur prag de lichidări pe drumuri, pentru Simulator și pagina Monte Carlo - orice lichidare ⇒ nu
  // (decizia din v100.196, B2: 2% pe 7 zile ≈ 63% pe an). Ecranul Monte Carlo îl citește de aici, nu-l scrie cu mâna.
  var LICHIDARI_ACCEPTATE = 0;
  function lichidareAcceptata(p) { return p !== null && p !== undefined && isFinite(p) && Number(p) <= LICHIDARI_ACCEPTATE; }
  // TP-ul de partea greșită a prețului (long sub, short peste) s-ar atinge pe prima bară: nu intră (aceeași regulă ca mcsTpValid)
  function tpValid(st, P) { if (!(st.tp > 0) || (st.dir === "long" && st.tp > P) || (st.dir === "short" && st.tp < P)) return { st: st, ignorat: null }; var x = {}; for (var k in st) x[k] = st[k]; x.tp = null; return { st: x, ignorat: st.dir === "neutru" ? null : st.tp }; }

  // ---------------- (2) simularea ----------------
  function tendinta(b) { var s = 0, n = 0; for (var i = 1; i < b.length; i++) if (b[i].c > 0 && b[i - 1].c > 0) { s += Math.log(b[i].c / b[i - 1].c); n++; } return n ? s / n : 0; }
  // v100.149 (I-579): Monte Carlo pe REGIMUL Busolei - blocurile se trag doar din ferestrele de timp cu aceeași stare (ferestre = [{de, pana}]);
  // un start e bun când blocul lui întreg (bloc bare) cade într-o fereastră. drumDin = M.drum cu startul ales din listă, nu din tot istoricul
  function starturiRegim(b15, ferestre, bloc) {
    var out = [], F = Array.isArray(ferestre) ? ferestre : [], pas = b15.length > 1 ? b15[1].t - b15[0].t : 900000;
    for (var i = 1; i <= b15.length - bloc; i++) { var t0 = b15[i].t, t1 = b15[i + bloc - 1].t; for (var k = 0; k < F.length; k++) if (t0 >= F[k].de && t1 + pas <= F[k].pana) { out.push(i); break; }   /* revizia: blocul întreg, cu închiderea ultimei bare, în fereastră */ }
    return out;
  }
  function drumDin(b, n, bloc, pret0, rnd, mu, starturi, urme) {
    var out = [], cur = pret0, t = 0, k = mu ? Math.exp(-mu) : 1;
    while (out.length < n) {
      var i = starturi[Math.floor(rnd() * starturi.length)];
      if (urme) urme.push(i);   /* v100.196 (B1): începuturile blocurilor, pentru incertitudinea pe zile */
      for (var j = 0; j < bloc && out.length < n; j++) { var x = b[i + j], f = cur / b[i + j - 1].c * k; out.push({ t: t++, o: x.o * f, h: x.h * f, l: x.l * f, c: x.c * f, v: x.v }); cur = out[out.length - 1].c; }
    }
    return out;
  }
  var MIN_STARTURI_REGIM = 3 * BZ;
  function marja(p, n) { return !(n > 0) || !(p > 0) || !(p < 1) ? 0 : Math.round(1.96 * Math.sqrt(p * (1 - p) / n) * 100); }
  // v100.196 (auditul 14.10, B1): ±4 din 500 de drumuri era doar zgomotul tragerii - drumurile sunt lipite din ~31 de zile, iar P sărea cu zeci
  // de puncte între cele două jumătăți ale istoricului (SOL 32% / 70%). Incertitudinea reală = jackknife pe GRUPE de zile consecutive: pentru
  // fiecare grupă, P din drumurile care nu folosesc nicio bară din ea (= Monte Carlo pe istoricul fără grupa aceea); varianța jackknife
  // (K−1)/K·Σ(P_g − P̄)². Grupa cu sub 20 de drumuri nu intră; sub 3 grupe ⇒ null (nu se poate socoti). Puncte procentuale, rotunjite.
  // v100.269 (ideile auditului 29.10): marja pe zile ANALITIC, nu dintr-un singur set de drumuri. Jackknife-ul de mai sus se socotea din drumurile care
  // ocolesc grupa (la 14 zile ~8% din 500): pe aceeași monedă, semințele 12…20 dădeau ±4…±41 la o zi și ±5…±63 la 7 zile, iar pe 40 de istorii
  // independente ale aceluiași proces era de 1,2–7,7 ori cât variază P cu adevărat (ținea tendința fixă, deși drumurile o scot la fiecare istorie).
  // Acum: fiecare zi distinctă e o singură observație - P(1−P)/D - fără partea lui „câștigă” explicată liniar de mișcarea drumului (ρ² = corelația cu
  // randamentul drumului până la orizont; Monte Carlo scoate tendința, deci partea asta nu e incertitudine pe zile). Măsurat pe aceleași istorii:
  // 0,75–2,6 × variația adevărată; semințele o mută cu cel mult 2 puncte; costul ~0. vals = rezultatele, R = randamentele (log), D = zilele distincte.
  function marjaZile(vals, R, D) {
    var n = vals ? vals.length : 0, i; if (!(D >= 1) || !n || !R || R.length !== n) return null;
    var k = 0, mR = 0; for (i = 0; i < n; i++) { if (vals[i] > 0) k++; mR += R[i]; } mR /= n;
    var p = k / n; if (!(p > 0 && p < 1)) return 0;
    var cYR = 0, vR = 0; for (i = 0; i < n; i++) { var dr = R[i] - mR; cYR += ((vals[i] > 0 ? 1 : 0) - p) * dr; vR += dr * dr; }
    var rho2 = vR > 0 ? Math.min(1, cYR * cYR / (vR * n * p * (1 - p))) : 0;
    return Math.round(1.96 * Math.sqrt(p * (1 - p) * (1 - rho2) / D) * 100);
  }
  // v100.196 (B1): reluarea ISTORICULUI REAL - setarea (mutată relativ la prețul fiecărei porniri) pornită la începutul fiecărei zile de istoric, cu
  // tendința reală (nu drumuri), citită la fiecare orizont care încape. Media pe porniri, câte pe plus și câte ferestre nu se suprapun.
  function reluareReala(b15, st, oriz, suma) {
    var P0 = b15[b15.length - 1].c, maxZ = Math.max.apply(null, oriz), col = oriz.map(function () { return []; });
    for (var s = 0; s + Math.min.apply(null, oriz) * BZ <= b15.length; s += BZ) {
      var k = b15[s].o / P0, sc = function (v) { return v > 0 ? v * k : v; }, stR = {};
      for (var q in st) stR[q] = st[q];
      stR.jos = st.jos * k; stR.sus = st.sus * k; stR.stop = st.stop ? { jos: sc(st.stop.jos), sus: sc(st.stop.sus) } : null;
      var lung = Math.min(maxZ * BZ, b15.length - s), r = GP.simuleaza(b15, s, lung, stR, { traseu: true }), tr = r.traseu, L = tr.net.length;
      oriz.forEach(function (z, h) { if (s + z * BZ <= b15.length) col[h].push(tr.net[Math.min(z * BZ, L) - 1] * suma); });
    }
    return oriz.map(function (z, h) {
      var v = col[h]; if (!v.length) return null;
      return { n: v.length, media: v.reduce(function (a, c) { return a + c; }, 0) / v.length, pPlus: v.filter(function (x) { return x > 0; }).length / v.length, independente: Math.floor(b15.length / (z * BZ)) };
    });
  }
  // v100.350 (auditul Simulatorului, el: „și media pe plus, cu intervalul ei pe zile”): media drumurilor (USDT) și marja ei pe zile, ca la P:
  // fiecare zi distinctă e o observație - var / D (fără scoaterea părții explicate de mișcarea drumului: vezi H0 mai jos)
  function medie(v) { return v.length ? v.reduce(function (a, x) { return a + x; }, 0) / v.length : null; }
  // H0 (p8, lumea cu agitația persistentă): pe D zile „pe plus” fals ieșea 9% la granița ipotezei; zilele agitate vin grupate, deci observațiile
  // independente sunt mai puține - D_ef = D·(1−φ)/(1+φ), φ = autocorelația la o zi a |mișcării zilnice| (0…0,6 ⇒ D_ef între D/4 și D)
  function zileEfective(b15, D) {
    var a = []; for (var i = BZ; i < b15.length; i += BZ) if (b15[i].c > 0 && b15[i - BZ].c > 0) a.push(Math.abs(Math.log(b15[i].c / b15[i - BZ].c)));
    if (a.length < 8) return D;
    var m = medie(a), v = 0, c = 0; for (var k = 0; k < a.length; k++) { v += (a[k] - m) * (a[k] - m); if (k) c += (a[k] - m) * (a[k - 1] - m); }
    var phi = v > 0 ? Math.max(0, Math.min(0.6, c / v)) : 0; return Math.max(1, D * (1 - phi) / (1 + phi));
  }
  function marjaMedieZile(vals, R, D) {
    var n = vals ? vals.length : 0, i; if (!(D >= 1) || n < 2 || !R || R.length !== n) return null;
    var m = medie(vals), mR = medie(R), vY = 0, vR = 0, c = 0;
    for (i = 0; i < n; i++) { var dy = vals[i] - m, dr = R[i] - mR; vY += dy * dy; vR += dr * dr; c += dy * dr; }
    if (!(vY > 0)) return 0;
    // H0 (p9): fără scoaterea ρ² - cu ea, la volatilitate persistentă intervalul prindea media adevărată doar în 74–76% și dădea „pe plus” fals în 9%;
    // fără ea (și cu centrarea pe medie) 83% / 4,5% în cel mai greu caz încercat, 99–100% / 0% la zile independente
    void c; void vR;
    return 1.96 * Math.sqrt(vY / (n - 1) / D);
  }
  // cum se termină drumurile la orizont: stop / TP / lichidare / încă rulează - cât și ce aduce fiecare (p25…p75). Mediana singură cădea între grămezi.
  function terminari(vals, fel) {
    var g = {}, n = vals.length; if (!n) return [];
    for (var i = 0; i < n; i++) (g[fel[i]] = g[fel[i]] || []).push(vals[i]);
    return ["stop", "lich", "tp", "ruleaza"].filter(function (k) { return g[k]; }).map(function (k) { var v = g[k].sort(function (a, b) { return a - b; }); return { fel: k, p: v.length / n, n: v.length, p25: pc(v, 0.25), p50: pc(v, 0.5), p75: pc(v, 0.75) }; });
  }
  function mediana(v) { if (!v.length) return null; var s = v.slice().sort(function (a, b) { return a - b; }); return pc(s, 0.5); }
  // o = { zile (14), orizonturi ([1,3,7,14]), n (500), seed (12), plan: { minus, plus } | null, pornitLa: ms | null }
  // v100.351 (ideea 1): agitația pe zile numărate de la capăt (suma pătratelor randamentelor de 15 minute); r = media ultimelor 2 zile / media lunii
  function agitatieAcum(b15) {
    var Z = Math.floor(b15.length / BZ), rv = []; if (Z < 7) return null;
    for (var d = 0; d < Z; d++) { var s = 0, de = b15.length - (d + 1) * BZ; for (var i = Math.max(1, de); i < de + BZ; i++) if (b15[i].c > 0 && b15[i - 1].c > 0) { var x = Math.log(b15[i].c / b15[i - 1].c); s += x * x; } rv.push(s); }
    var med = medie(rv); if (!(med > 0)) return null;
    return { r: Math.min(2.89, Math.max(0.36, (rv[0] + rv[1]) / 2 / med)), zile: Z };
  }
  // drumul tras fără tendință, cu randamentele × k pe ziua lui (k² = 1 + (r − 1)·0,9^(zi+1)), apoi tendința scoasă (mm pe bară) - ca M.drum
  function scaleazaDrum(d, P0, r, mm) {
    // pe loc: drumul vine nou din tragere (M.drum / drumDin), nimeni altcineva nu-l ține; k² = 1 + (r − 1)·0,9^(zi+1), socotit o dată pe zi
    var cp = P0, cb = P0, dr = mm ? Math.exp(-mm) : 1, zi = -1, kv = 1;
    for (var q = 0; q < d.length; q++) {
      var x = d[q], z = (q / BZ) | 0; if (z !== zi) { zi = z; kv = Math.sqrt(Math.max(0.05, 1 + (r - 1) * Math.pow(0.9, z + 1))); }
      var lb = Math.log(cb), f = cp * dr, c0 = x.c;
      x.o = f * Math.exp(kv * (Math.log(x.o) - lb)); x.h = f * Math.exp(kv * (Math.log(x.h) - lb)); x.l = f * Math.exp(kv * (Math.log(x.l) - lb)); x.c = f * Math.exp(kv * (Math.log(c0) - lb));
      cb = c0; cp = x.c;
    }
    return d;
  }
  function simuleazaIntreg(b15, st, o) {
    o = o || {}; var zile = o.zile > 0 ? o.zile : 14, oriz = Array.isArray(o.orizonturi) && o.orizonturi.length ? o.orizonturi : [1, 3, 7, 14], n = o.drumFix ? 1 : o.n > 0 ? o.n : 500, seed = o.seed || 12;   /* v100.351: o.drumFix = barele reale de după hotărâre (judecata ei) */
    var plan = o.plan && (nr(o.plan.minus) > 0 || nr(o.plan.plus) > 0) ? { minus: Math.abs(nr(o.plan.minus) || 0), plus: nr(o.plan.plus) || 0 } : null;
    if (!Array.isArray(b15) || b15.length < 7 * BZ) return { eroare: "Prea puțin istoric ca să simulez: " + cate(Math.floor((b15 ? b15.length : 0) / BZ), "zi", "zile") + " pe 15 minute; îmi trebuie cel puțin 7." };
    var suma = st.suma > 0 ? st.suma : 50, H = zile * BZ, zileIst = Math.floor(b15.length / BZ);
    // botul care rulează: prefixul = barele reale de la prima bară de după pornire; botul pornește la deschiderea ei (ca GridPlan.dePornire)
    var s = -1;
    if (o.pornitLa > 0) {
      // revizia (R2): pornit cu peste 15 minute înaintea primei bare avute ⇒ nu pot relua de la pornire (reluarea ar porni din altă stare)
      if (o.pornitLa < b15[0].t - 15 * 60000) return { eroare: "Botul e pornit pe " + dataTxt(o.pornitLa) + ", înainte de barele pe care le am (de la " + dataTxt(b15[0].t) + "): nu pot să-l reiau de la pornire - Pionex dă cam 31 de zile de bare de 15 minute. Simulează-l ca bot nou, de la prețul de acum." };
      for (var i = 0; i < b15.length; i++) if (b15[i].t >= o.pornitLa) { s = i; break; }
      if (s < 0 || s >= b15.length - 1) return { eroare: "Botul e pornit după ultima bară pe care o am (sau în ea): n-am ce relua încă." };
    }
    var prefix = s >= 0 ? b15.slice(s) : [], pre = prefix.length, P0 = b15[b15.length - 1].c, Pst = pre ? prefix[0].o : P0;
    // revizia (R1): stopul de partea greșită a prețului de la pornire (long: stopul sub, short: deasupra, neutru: fiecare pe partea lui) -
    // simulatorul l-ar atinge pe drumul spre el și ar „încasa” grilele: câștig inventat. Eroare pe nume, nu cifre.
    // v100.351: o setare NOUĂ peste un bot care rulează (o.setareNoua, doar din hotarare) se verifică față de prețul de ACUM - de acolo se aplică
    var Pv = pre && o.setareNoua ? P0 : Pst;
    if (st.stop) {
      var sj0 = st.stop.jos > 0 ? st.stop.jos : null, ss0 = st.stop.sus > 0 ? st.stop.sus : null;
      var rauJ = sj0 !== null && sj0 >= Pv && st.dir !== "short", rauS = ss0 !== null && ss0 <= Pv && st.dir !== "long";
      if (st.dir === "long" && ss0 !== null && sj0 === null) rauS = ss0 <= Pv;   // long cu stopul scris doar sus (TP-ul e aparte): peste preț
      if (rauJ || rauS) return { eroare: "Stopul (" + pretTxt(rauJ ? sj0 : ss0) + ") e de partea greșită a prețului pentru " + st.dir + " (prețul " + (pre ? "de la pornire" : "de acum") + " e " + pretTxt(Pst) + "): la long stopul stă sub preț, la short deasupra, la neutru fiecare pe partea lui." };
    }
    var v = tpValid(st, P0), stS = {}; for (var k in v.st) stS[k] = v.st[k];
    var rapS = raportValid(stS.stopRaport), opr = stS.stop && rapS === null ? { jos: stS.stop.jos, sus: stS.stop.sus } : null, parteTp = stS.tp > 0 ? (stS.dir === "long" ? "sus" : stS.dir === "short" ? "jos" : null) : null;   // v100.259: cu raportul, fără prețul fix
    if (parteTp) { opr = opr || {}; opr[parteTp] = stS.tp; }
    stS.stop = opr;
    // v100.136: o.stPrefix = setarea botului PE prefix (gridul lui, stopul lui, ținta lui de până acum); ținta / stopul din st se aplică abia
    // de la prima bară simulată - „schimb ținta acum” pe botul care rulează, cu pozițiile de acum (GridProba: dinBara + stopDupa)
    var optGP = { traseu: true, tStart: pre ? prefix[0].t : b15[b15.length - 1].t + 9e5 }, tpIgnoratPrefix = null;   /* v100.351: funding-ul la orele lui reale */
    if (pre && o.stPrefix) {
      var vp = tpValid(o.stPrefix, Pst), rapP = raportValid(vp.st.stopRaport), oprP = vp.st.stop && rapP === null ? { jos: vp.st.stop.jos, sus: vp.st.stop.sus } : null, ptP = vp.st.tp > 0 ? (vp.st.dir === "long" ? "sus" : vp.st.dir === "short" ? "jos" : null) : null;
      if (ptP) { oprP = oprP || {}; oprP[ptP] = vp.st.tp; }
      // v100.259: pe prefix raportul botului de până acum, de la prima bară simulată cel al setării noi
      optGP.dinBara = pre; optGP.stopDupa = Object.assign({}, opr || {}, { raport: rapS }); stS.stop = oprP; stS.stopRaport = rapP; tpIgnoratPrefix = vp.ignorat || null;   // revizia (I2): spus, nu tăcut
    }
    // fără tendința perioadei: mijlocul log al capătului drumurilor la zero (ca MonteSimbol.grid)
    // v100.149 (I-579): pe regim, drumurile pornesc doar din ferestrele cu aceeași stare a Busolei; sub 3 zile de starturi ⇒ eroare pe nume
    var ST = Array.isArray(o.starturi) ? o.starturi.filter(function (i) { return i >= 1 && i <= b15.length - BZ; }) : null;
    if (ST && ST.length < MIN_STARTURI_REGIM) return { eroare: "Prea puține bare în regimul de acum (" + cate(Math.floor(ST.length / BZ), "zi", "zile") + "): îmi trebuie cel puțin 3 ca să trag drumuri doar din el." };
    var DRUM0 = o.drumFix ? function () { return o.drumFix; } : ST ? function (b, hh, bz, p, r, muu, urme) { return drumDin(b, hh, bz, p, r, muu, ST, urme); } : M.drum;
    // v100.351 (ideea 1, el: „fă tot”): agitația de acum (ultimele 2 zile față de lună), stinsă cu 10% pe zi - probat sub H0 (h0media/p15–p16): în lumea cu
    // agitație persistentă eroarea mediei −19…−26% și „pe plus” fals 4,3% → 0%; în lumea cu zile independente la fel ca înainte
    var agit = o.drumFix || ST || o.faraAgitatie ? null : agitatieAcum(b15), DRUM = DRUM0;
    if (agit && Math.abs(agit.r - 1) > 0.02) DRUM = function (b, hh, bz, p, r, muu, urme) { return scaleazaDrum(DRUM0(b, hh, bz, p, r, mu, urme), p, agit.r, muu - mu); };   /* revizia (🔴1): tendința scoasă înainte de × k, altfel revenea pe orizonturile intermediare */
    var mu = tendinta(b15), m;
    { var rnd0 = M.generator(seed), v0 = []; for (var q = 0; q < n; q++) { var d0 = DRUM(b15, H, BZ, P0, rnd0, mu); v0.push(Math.log(d0[d0.length - 1].c / P0)); } v0.sort(function (a, c) { return a - c; }); m = mu + Math.log(v0.reduce(function (a, x) { return a + Math.exp(x); }, 0) / v0.length) / H; }   /* v100.350 (H0 al regulii mediei, scratchpad h0media/p9): centrate pe MEDIA prețului de la capăt (martingală), nu pe mediana lui - mediana la zero adăuga o tendință de +σ²t/2 (câștig fals la long, +0,5 USDT pe ±5% 2×; pierdere falsă la short) */
    var rnd = M.generator(seed), bareO = oriz.map(function (z) { return pre + Math.round(z * BZ); });   /* v100.269: orizonturile de 1 h / 4 h pe bare întregi */
    var col = oriz.map(function () { return { net: [], deAici: [], R: [], plan: 0, planRau: 0, planZile: [], lich: 0, stop: 0, tp: 0, ies: 0, per: 0, maxJos: [], funding: 0, fel: [] }; });
    var acum = null, dejaAtins = null, imediat = 0;   /* v100.339 (revizia): drumurile oprite pe prag chiar la prima bară simulată */
    // v100.269 (ideile auditului 29.10): zilele distincte din care se trag drumurile (pe regim, doar zilele lui) - marja pe zile le cere; măștile
    // grupelor (jackknife-ul de până acum) nu mai trebuie, drumurile rămân exact aceleași (aceleași trageri din rnd)
    var D = ST ? Math.max(1, Math.round(ST.length / BZ)) : zileIst, Def = zileEfective(b15, D);
    for (var sIdx = 0; sIdx < n; sIdx++) {
      var d = DRUM(b15, H, BZ, P0, rnd, m), drumT = pre ? prefix.concat(d) : d;
      var r = GP.simuleaza(drumT, 0, drumT.length, stS, optGP), tr = r.traseu, L = tr.net.length;
      if (pre && r.oprit && !r.lichidat && r.bare > pre && r.bare <= pre + 1) imediat++;
      // „până acum” = traseul la ultima bară reală (identic pe toate drumurile); t = închiderea ei; oprit și când stopul cade chiar pe ea (revizia)
      if (pre && !acum) { var ia = Math.min(pre, L) - 1, cA = prefix[prefix.length - 1].c; acum = { afara: cA < stS.jos || cA > stS.sus, net: tr.net[ia], usdt: tr.net[ia] * suma, poz: tr.poz[ia] * suma,   /* revizia v100.350 (R1): prețul deja în afara gridului */ inchidere: tr.brut[ia] * suma * prefix[prefix.length - 1].c * G.C.COMISION, bare: pre, t: prefix[prefix.length - 1].t + 9e5, perechi: tr.perechi[ia],   /* v100.350: poziția și comisionul de închidere (Pionex nu-l scade din profit) */ oprit: (r.lichidat || r.oprit) && r.bare <= pre ? (r.lichidat ? "lichidat" : "oprit") : null }; }
      var iPlus = null, iMinus = null;
      // v100.135: planul în INTERIORUL barei (minimul / maximul pe cele 4 puncte); amândouă în aceeași bară ⇒ minusul întâi (pesimist: iPlus < iMinus strict)
      if (plan) for (var j = 0; j < L && (iPlus === null || iMinus === null); j++) { if (iMinus === null && plan.minus > 0 && tr.min[j] * suma <= -plan.minus) iMinus = j; if (iPlus === null && plan.plus > 0 && tr.max[j] * suma >= plan.plus) iPlus = j; }
      if (plan && pre && dejaAtins === null) { if (iPlus !== null && iPlus < pre && (iMinus === null || iPlus < iMinus)) dejaAtins = "plus"; else if (iMinus !== null && iMinus < pre && (iPlus === null || iMinus <= iPlus)) dejaAtins = "minus"; }   // revizia (R5): ≤, ca la rău
      for (var h = 0; h < oriz.length; h++) {
        var bare = bareO[h], ix = Math.min(bare, L) - 1, c = col[h], net = tr.net[ix];
        c.net.push(net); if (acum) c.deAici.push(net - acum.net);
        c.R.push(Math.log(d[Math.min(d.length, Math.round(oriz[h] * BZ)) - 1].c / P0));   // v100.269: mișcarea drumului până la orizont, de la prețul de acum
        if (plan) { var hit = iPlus !== null && iPlus < bare && (iMinus === null || iPlus < iMinus), rau = iMinus !== null && iMinus < bare && (iPlus === null || iMinus <= iPlus); if (hit) { c.plan++; if (iPlus >= pre) c.planZile.push((iPlus - pre + 1) / BZ); } if (rau) c.planRau++; }   // revizia: atins în prefix ⇒ fără zile („deja”)
        if (r.lichidat && r.bare <= bare) c.lich++;
        if (r.oprit && r.bare <= bare) { if (parteTp && r.iesit === parteTp) c.tp++; else c.stop++; }
        // v100.350 (auditul Simulatorului): la botul care rulează, ieșirile și funding-ul DE AICI ÎNCOLO (de la ultima bară reală), ca restul blocului
        var ia0 = pre ? Math.min(pre, L) - 1 : -1;
        if ((acum && acum.afara) || tr.iesiri[ix] - (ia0 >= 0 ? tr.iesiri[ia0] : 0) > 0) c.ies++;   /* revizia (R1): deja afară ⇒ afară pe orice drum, nu „0%” */
        c.fel.push(r.lichidat && r.bare <= bare ? "lich" : r.oprit && r.bare <= bare ? (parteTp && r.iesit === parteTp ? "tp" : "stop") : "ruleaza");
        c.per += tr.perechi[ix];
        var mj = Infinity; for (var w = 0; w <= ix; w++) if (tr.min[w] < mj) mj = tr.min[w]; c.maxJos.push(mj);   // v100.135: minimul în bară, nu pe închideri
        c.funding += tr.fund[ix] - (pre ? tr.fund[Math.min(pre, L) - 1] : 0);
      }
    }
    var rel = pre ? null : reluareReala(b15, stS, oriz, suma);   // v100.196 (B1): doar la botul nou - „de aici încolo” nu are o reluare de bot nou
    var orizonturi = oriz.map(function (z, h) {
      var c = col[h], nets = c.net.map(function (x) { return x * suma; }).sort(function (a, b) { return a - b; }), cast = 0, pier = 0;
      c.net.forEach(function (x) { if (x > 0) cast++; else if (x < 0) pier++; });
      var mjs = c.maxJos.map(function (x) { return x * suma; }).sort(function (a, b) { return a - b; }), pC = cast / n, mD = marja(pC, n), mZ = marjaZile(c.net, c.R, D), out = {
        zile: z, bare: bareO[h], scurt: zileIst < 3 * z, pCastig: pC, pPierde: pier / n, pZero: (n - cast - pier) / n, marja: mZ !== null ? Math.max(mZ, mD) : mD, marjaDrumuri: mD, marjaZile: mZ, zileDistincte: D, reluare: rel ? rel[h] : null,
        p5: pc(nets, 0.05), p50: pc(nets, 0.5), p95: pc(nets, 0.95), hist: M.histograma(nets, 24),
        media: medie(nets), marjaMedie: marjaMedieZile(c.net.map(function (x) { return x * suma; }), c.R, Def), terminari: terminari(c.net.map(function (x) { return x * suma; }), c.fel),   /* v100.350 */
        plan: plan ? { p: c.plan / n, pRau: c.planRau / n, zileMediana: c.planZile.length ? mediana(c.planZile) : null, dejaAtins: dejaAtins } : null,
        pLich: c.lich / n, pStop: c.stop / n, pTp: c.tp / n, pIesire: c.ies / n, perechi: c.per / n, maxJos: { p50: pc(mjs, 0.5), p5: pc(mjs, 0.05) }, funding: c.funding / n * suma };
      if (o.peDrum) out.drumuri = c.net.map(function (x) { return x * suma; });   // revizia (R3): rezultatele în ordinea drumurilor (drum cu drum)   // revizia (R3): rezultatele în ordinea drumurilor (drum cu drum)
      // revizia (R3): la botul care rulează, hotărârea lui („îl țin?”) depinde de ce URMEAZĂ ⇒ „de aici încolo” întreg: câștigă / pierde, marja, histograma
      if (acum) { var da = c.deAici.map(function (x) { return x * suma; }).sort(function (a, b) { return a - b; }), dc = 0, dp = 0; c.deAici.forEach(function (x) { if (x > 0) dc++; else if (x < 0) dp++; }); var mDa = marja(dc / n, n), mZa = marjaZile(c.deAici, c.R, D); var daD = c.deAici.map(function (x) { return x * suma; }); out.deAici = { media: medie(daD), marjaMedie: marjaMedieZile(daD, c.R, Def), terminari: terminari(daD, c.fel), p5: pc(da, 0.05), p50: pc(da, 0.5), p95: pc(da, 0.95), pCastig: dc / n, pPierde: dp / n, pZero: (n - dc - dp) / n, marja: mZa !== null ? Math.max(mZa, mDa) : mDa, marjaDrumuri: mDa, marjaZile: mZa, hist: M.histograma(da, 24) }; if (o.peDrum) out.drumuriDeAici = c.deAici.map(function (x) { return x * suma; }); }   // v100.136: și de aici încolo, pe drumuri
      return out;
    });
    return { agitatie: agit ? Math.round(agit.r * 100) / 100 : null, regim: ST ? { starturi: ST.length } : null, n: n, zile: zile, zileIstoric: zileIst, tendintaPeZi: Math.exp(mu * BZ) - 1, suma: suma, tpIgnorat: v.ignorat, tpIgnoratPrefix: tpIgnoratPrefix, acum: acum, opritImediat: pre ? imediat / n : 0, orizonturi: orizonturi };
  }
  // v100.339 (I-868, auditul din 13.11): o.botRuleaza = botul e pornit la Pionex ACUM. Dacă reluarea îl oprește pe stop / țintă pe drumul real
  // (prag pus după pornire sau neatins la Pionex), reluarea contrazice realitatea și toate drumurile stau pe loc („0% / 0% / pe zero 100%”).
  // Atunci pe drumul real rămâne doar gridul, iar stopul și ținta se aplică de la prima bară simulată (rez.praguriDeAici). Lichidarea pe
  // drumul real nu se ocolește: starea reluată nu mai seamănă cu botul, deci rămâne „Reluarea arată…”.
  function simuleazaBaza(b15, st, o) {
    var rez = simuleazaIntreg(b15, st, o);
    if (!rez || rez.eroare || !o || !o.botRuleaza || !(o.pornitLa > 0) || !rez.acum || rez.acum.oprit !== "oprit") return rez;
    var fara = {}, o2 = {}, k; for (k in st) fara[k] = st[k]; fara.stop = null; fara.tp = null; fara.stopRaport = null;
    for (k in o) o2[k] = o[k]; o2.stPrefix = fara;
    var r2 = simuleazaIntreg(b15, st, o2);
    // revizia independentă (14.11): pragul e depășit și la prețul de ACUM (stop 1,06 cu prețul la 1,07, stop în procente deja trecut) ⇒ toate
    // drumurile s-ar opri la prima bară simulată („CÂȘTIGĂ în 100% · stopul atins 100%” sau „PIERDE în 100%”, adică iar „contra botului”).
    // Botul rulează la Pionex cu pragul trecut: setările citite nu sunt ale lui ⇒ rămâne „Reluarea arată…”.
    if (!r2 || r2.eroare || (r2.acum && r2.acum.oprit) || r2.opritImediat >= 0.9) return rez;
    r2.praguriDeAici = true; return r2;
  }
  // v100.350 (el: „de aici încolo din poziția Pionex”): reluarea dădea 142 PENDLE, Pionex 121 - nu din bare (pe 1 minut tot 142), ci din
  // mărimea pe grilă a modelului. o.pozitiePionex (monede) ⇒ mărimea pe grilă se potrivește (scalaQ = |Pionex| / |reluată|; poziția e liniară
  // în ea) și se reia; drumurile pornesc din poziția Pionex. rez.pozitie = { reluata, pionex, scala, avert (peste 10%) } - reluarea rămâne verificare.
  function simuleaza(b15, st, o) {
    var rez = simuleazaBaza(b15, st, o), qp = o ? nr(o.pozitiePionex) : null;
    if (!rez || rez.eroare || !rez.acum || rez.acum.oprit || qp === null) return rez;
    // revizia independentă (R2): o grilă umplută în plus (ora barei vs ora Pionex) NU e altă mărime pe grilă - k = 2 dubla tot riscul. Potrivesc doar când
    // botul ține cel puțin 3 grile, nu e neutru (poziția netă e o diferență) și, pe sub 6 grile, diferența nu e un număr întreg de grile; altfel motivul pe nume
    var qr = rez.acum.poz, qG = st.levier > 0 && st.grile > 0 && rez.suma > 0 && b15.length ? st.levier / st.grile * rez.suma / b15[b15.length - 1].c : null, nR = qG ? Math.abs(qr) / qG : 0, nP = qG ? Math.abs(qp) / qG : 0, dG = nP - nR;
    var k = Math.abs(qr) > 0 && Math.abs(qp) > 0 ? Math.abs(qp) / Math.abs(qr) : null, zero = nR < 0.5 && nP < 0.5, poz = { reluata: qr, pionex: qp, scala: k, grile: Math.round(dG * 10) / 10, avert: !zero && (!(k !== null && Math.abs(k - 1) <= 0.1) || qr * qp < 0) };
    var motiv = zero ? "amândouă fără poziție" : st.dir === "neutru" ? "la neutru poziția e o diferență între cele două părți" : qr * qp < 0 ? "de părți diferite" : nR < 3 ? "botul ține sub 3 grile: o grilă în plus ar schimba tot" : k === null || k > 3 || k < 1 / 3 ? "prea departe" : nR < 6 && Math.abs(dG) >= 0.8 && Math.abs(dG - Math.round(dG)) < 0.2 ? "diferența e cam " + cate(Math.round(Math.abs(dG)), "grilă întreagă", "grile întregi") + ": mai degrabă o umplere în plus sau în minus decât altă mărime pe grilă" : null;
    if (motiv || Math.abs(k - 1) < 0.002) { rez.pozitie = Object.assign(poz, { potrivit: false, motiv: motiv || "la fel" }); return rez; }
    var st2 = Object.assign({}, st, { scalaQ: k }), o2 = Object.assign({}, o, { stPrefix: o.stPrefix ? Object.assign({}, o.stPrefix, { scalaQ: k }) : o.stPrefix }), r2 = simuleazaBaza(b15, st2, o2);
    if (!r2 || r2.eroare) { rez.pozitie = Object.assign(poz, { potrivit: false }); return rez; }
    r2.pozitie = Object.assign(poz, { potrivit: true }); return r2;
  }

  // revizia (R3): alte setări pe ACELEAȘI drumuri, cu ACELAȘI motor ca verdictul (14 zile, sămânța 12, fără prefix = bot pornit acum) ⇒ rândul
  // „așa cum e” e verdictul de deasupra, nu altă simulare (Monte Carlo pierdea tipul și funding-ul). lista = [{ nume, st, tp?, tu? }],
  // o.oriz = orizontul citit (zile); drum cu drum față de rândul de referință (cel cu tu, altfel primul). g are forma cardului din Monte Carlo
  function drumCuDrum(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return null;
    var bun = 0, rau = 0;
    for (var i = 0; i < a.length; i++) { var dd = b[i] - a[i]; if (dd > 0.005) bun++; else if (dd < -0.005) rau++; }
    return { maiBun: bun / a.length, maiRau: rau / a.length, egal: (a.length - bun - rau) / a.length };
  }
  // v100.136: x.dinStare + o.pornitLa (+ o.stPrefix = setarea botului de până acum) ⇒ rândul e botul CU POZIȚIILE DE ACUM, judecat „de aici
  // încolo” (deAici); fără dinStare rândul e un bot pornit acum, de la zero (= dacă l-ai opri și ai porni varianta). Aceleași drumuri.
  // revizia (I5): o.orizonturi = toate orizonturile dintr-o singură simulare pe rând (gOriz / drumOriz), g și drum = cele pe o.oriz; comparaLa
  // le citește pe altul fără recalcul. Revizia (I1): botul oprit / lichidat deja pe drumul real ⇒ eroare pe nume, nu zerouri „câștigate”
  function compara(b15, lista, o) {
    o = o || {}; var oriz = o.oriz > 0 ? o.oriz : 7, n = o.n > 0 ? o.n : 500, orizs = Array.isArray(o.orizonturi) && o.orizonturi.length ? o.orizonturi.slice() : [oriz];
    if (orizs.indexOf(oriz) < 0) orizs.push(oriz);
    var rows = (Array.isArray(lista) ? lista : []).map(function (x) {
      var dinStare = !!(x.dinStare && o.pornitLa > 0);
      var r = simuleaza(b15, x.st, { zile: o.zile, orizonturi: orizs, n: n, seed: o.seed, plan: null, pornitLa: dinStare ? o.pornitLa : null, stPrefix: dinStare ? (o.stPrefix || x.st) : null, pozitiePionex: dinStare ? o.pozitiePionex : null, peDrum: true });   /* revizia v100.350 (R3): aceeași bază ca verdictul */
      var er = !r ? "fără date" : r.eroare ? r.eroare : dinStare && r.acum && r.acum.oprit ? "botul s-ar fi " + (r.acum.oprit === "lichidat" ? "lichidat" : "oprit") + " deja pe drumul real: setările de aici nu se potrivesc cu botul din Pionex - verifică-le" : null;
      var gOriz = {};
      orizs.forEach(function (zz, k) {
        if (er) { gOriz[zz] = { eroare: er }; return; }
        var z = r.orizonturi[k], da = dinStare && z.deAici ? z.deAici : null;
        gOriz[zz] = { zile: zz, n: n, drumuri: da ? z.drumuriDeAici : z.drumuri, p5: (da || z).p5, p50: (da || z).p50, p95: (da || z).p95, pPlus: (da || z).pCastig, pLichidare: z.pLich, pStop: z.pStop, pTp: z.pTp, pIesire: z.pIesire, perechiMedii: z.perechi, hist: (da || z).hist, funding: z.funding, deAici: !!da };
      });
      return { nume: x.nume, st: x.st, tp: x.tp, tu: x.tu, gOriz: gOriz, g: gOriz[oriz] };
    });
    var ref = rows.filter(function (x) { return x.tu; })[0] || rows[0];
    rows.forEach(function (x) {
      x.drumOriz = {};
      orizs.forEach(function (zz) { var a = ref && ref.gOriz[zz], b = x.gOriz[zz]; x.drumOriz[zz] = x === ref || !a || !a.drumuri || b.eroare ? null : drumCuDrum(a.drumuri, b.drumuri); });
      x.drum = x.drumOriz[oriz];
    });
    return rows;
  }
  // ---------------- (2b) v100.351: „Ce fac cu botul ăsta?” ----------------
  // el (16.11): „dezvoltă mai mult ideea nr 2, că are potențial” ⇒ alegerile LUI: toate 6 acțiunile, recomandare doar CU DOVADĂ, urmărirea pe bare reale.
  // Pe ACELEAȘI drumuri (aceeași sămânță), din starea botului (prefixul real + poziția Pionex), fiecare acțiune de ACUM: îl țin · îl închid · TP-ul mai
  // aproape / la margine / fără · stopul la margine / mai larg · planul tău ca stop · îl închid și pornesc (setarea fișei, altfel același bot centrat pe
  // prețul de acum). Pe fiecare orizont: media, cele mai proaste 5%, câștigă %, stopul / TP-ul și, față de „îl țin”, diferența DRUM CU DRUM (pereche),
  // cu marja ei pe zilele efective ale istoricului. Regula de alegere (alegeHotarare) e fixată înainte de cifre și probată sub H0 (proba-v100351).
  function sigmaZi(b15) { var a = []; for (var i = b15.length - 1; i - BZ >= 0; i -= BZ) if (b15[i].c > 0 && b15[i - BZ].c > 0) a.push(Math.abs(Math.log(b15[i].c / b15[i - BZ].c))); return a.length ? mediana(a) : 0.03; }
  function gresitAcum(x, P) {
    var s = x.stop || {};
    if (s.jos > 0 && s.jos >= P && x.dir !== "short") return "stopul (" + pretTxt(s.jos) + ") ar sta peste prețul de acum (" + pretTxt(P) + ")";
    if (s.sus > 0 && s.sus <= P && x.dir !== "long") return "stopul (" + pretTxt(s.sus) + ") ar sta sub prețul de acum (" + pretTxt(P) + ")";
    if (x.tp > 0 && ((x.dir === "long" && x.tp <= P) || (x.dir === "short" && x.tp >= P))) return "TP-ul (" + pretTxt(x.tp) + ") ar sta de partea greșită a prețului de acum (" + pretTxt(P) + ")";
    return null;
  }
  function statHot(vals, ref, D) {
    var n = vals.length, v = vals.slice().sort(function (a, b) { return a - b; }), m = medie(vals), poz = 0; vals.forEach(function (x) { if (x > 0.005) poz++; });
    var o = { n: n, media: m, p5: pc(v, 0.05), p50: pc(v, 0.5), p95: pc(v, 0.95), pCastig: n ? poz / n : null, dif: null };
    if (ref && ref.length === n && n > 1) {
      var d = vals.map(function (x, i) { return x - ref[i]; }), md = medie(d), ss = 0, bun = 0, rau = 0;
      d.forEach(function (x) { ss += (x - md) * (x - md); if (x > 0.005) bun++; else if (x < -0.005) rau++; });
      o.dif = { media: md, marja: 1.96 * Math.sqrt(ss / (n - 1) / Math.max(1, D)), maiBun: bun / n, maiRau: rau / n, egal: (n - bun - rau) / n };
    }
    return o;
  }
  // regula (fixată înainte de cifre): o acțiune bate „îl țin” doar dacă, pe orizontul de hotărâre, media ei e mai bună cu cel puțin pragul, marginea de
  // jos a diferenței (pe zile) e peste 0 și cele mai proaste 5% nu sunt mai rele cu mai mult de prag; dintre ele, cea cu diferența cea mai mare
  function alegeHotarare(A, o) {
    var h = o.oriz, prag = o.prag, t = A.filter(function (a) { return a.cheie === "tine"; })[0];
    if (!t || !t.oriz || !t.oriz[h]) return { cheie: "tine", motiv: "fără cifre pentru „îl țin”" };
    var c = A.filter(function (a) { var z = a.cheie !== "tine" && !a.eroare && a.oriz && a.oriz[h]; return z && z.dif && z.dif.media >= prag && z.dif.media - z.dif.marja > 0 && z.p5 >= t.oriz[h].p5 - prag; })
      .sort(function (x, y) { return y.oriz[h].dif.media - x.oriz[h].dif.media; })[0];
    if (!c) return { cheie: "tine", motiv: "nicio altă acțiune nu iese clar mai bună (cu cel puțin " + nrRo(prag, 1) + " USDT în medie, sigur pe zile și fără o coadă mai rea)" };
    var d = c.oriz[h].dif;
    return { cheie: c.cheie, motiv: "în medie " + bani1(d.media) + " față de „îl țin” (±" + nrRo(d.marja, 1) + " pe zile), mai bun pe " + pr(d.maiBun) + " din drumuri, mai rău pe " + pr(d.maiRau) + ", cu cele mai proaste 5% la " + bani1(c.oriz[h].p5) + " (îl țin: " + bani1(t.oriz[h].p5) + ")" };
  }
  // o = { pornitLa, pozitiePionex, plan: { minus, plus }, n, seed, orizonturi ([1, 7]), fisa: setarea fișei Grid pentru un bot nou (opțional), verifica (true) }
  function hotarare(b15, st, o) {
    o = o || {}; if (!Array.isArray(b15) || b15.length < 7 * BZ) return { eroare: "prea puțin istoric: îmi trebuie cel puțin 7 zile de bare de 15 minute" };
    var P = b15[b15.length - 1].c, oriz = Array.isArray(o.orizonturi) && o.orizonturi.length ? o.orizonturi : [1, 7], zile = Math.max.apply(null, oriz), n = o.n > 0 ? o.n : 800, seed = o.seed || 12, suma = st.suma > 0 ? st.suma : 50;
    var baza = { pornitLa: o.pornitLa, stPrefix: st, botRuleaza: true, n: n, seed: seed, orizonturi: oriz, zile: zile, peDrum: true, plan: null };
    var r0 = simuleaza(b15, st, Object.assign({}, baza, { pozitiePionex: o.pozitiePionex }));
    if (!r0 || r0.eroare) return { eroare: r0 && r0.eroare || "fără rezultat" };
    if (!r0.acum) return { eroare: "botul nu rulează (fără pornire): pentru un bot nou nu e nimic de hotărât" };
    if (r0.acum.oprit) return { eroare: "reluarea arată botul " + (r0.acum.oprit === "lichidat" ? "lichidat" : "oprit") + " pe drumul real: setările de aici nu se potrivesc cu Pionex" };
    var k = r0.pozitie && r0.pozitie.potrivit ? r0.pozitie.scala : null, cuK = function (x) { return k ? Object.assign({}, x, { scalaQ: k }) : x; }, stK = cuK(st);
    var bazaK = Object.assign({}, baza, { stPrefix: stK, setareNoua: true }), fee = r0.acum.inchidere > 0 ? r0.acum.inchidere : 0, D = zileEfective(b15, Math.floor(b15.length / BZ));
    var dir = st.dir, lat = st.sus - st.jos, sz = sigmaZi(b15), A = [{ cheie: "tine", nume: "îl țin așa", st: st }, { cheie: "inchide", nume: "îl închid acum", fix: 0 }];   // referința „de aici” e deja rezultatul închis acum ⇒ 0
    if (dir === "long" || dir === "short") {
      var marg = dir === "long" ? st.sus : st.jos;
      var tpA = st.tp > 0 ? P + (st.tp - P) / 2 : P + (marg - P) / 2;
      A.push({ cheie: "tpAproape", nume: "TP-ul mai aproape (" + pretTxt(tpA) + ")", st: Object.assign({}, st, { tp: tpA }) });
      if (!(st.tp > 0) || Math.abs(st.tp - marg) / P > 0.002) A.push({ cheie: "tpMargine", nume: "TP-ul la marginea gridului (" + pretTxt(marg) + ")", st: Object.assign({}, st, { tp: marg }) });
      if (st.tp > 0) A.push({ cheie: "tpFara", nume: "fără TP", st: Object.assign({}, st, { tp: null }) });
      var sv = st.stop ? (dir === "long" ? st.stop.jos : st.stop.sus) : null, dist = sv > 0 ? Math.abs(P - sv) / P : null;
      var sM = dir === "long" ? st.jos * 0.999 : st.sus * 1.001, dL = Math.max(dist ? dist * 1.5 : 0, 2 * sz), sL = dir === "long" ? P * (1 - dL) : P * (1 + dL);
      if (dir === "long" ? sL > st.jos * 0.999 : sL < st.sus * 1.001) sL = dir === "long" ? Math.min(sL, st.jos * 0.99) : Math.max(sL, st.sus * 1.01);
      A.push({ cheie: "stopMargine", nume: "stopul la marginea gridului (" + pretTxt(sM) + ")", st: Object.assign({}, st, { stop: dir === "long" ? { jos: sM } : { sus: sM }, stopRaport: null }) });
      A.push({ cheie: "stopLarg", nume: "stopul mai larg (" + pretTxt(sL) + ", dincolo de o zi obișnuită)", st: Object.assign({}, st, { stop: dir === "long" ? { jos: sL } : { sus: sL }, stopRaport: null }) });
    }
    if (o.plan && Number(o.plan.minus) > 0) A.push({ cheie: "plan", nume: "stopul la planul tău (−" + nrRo(Number(o.plan.minus), 1) + " USDT de la pornire)", st: Object.assign({}, st, { stop: null, stopRaport: -Number(o.plan.minus) / suma }) });
    var nou = o.fisa && o.fisa.jos > 0 && o.fisa.sus > o.fisa.jos ? Object.assign({}, o.fisa, { suma: o.fisa.suma > 0 ? o.fisa.suma : suma }) : null, numeNou = "îl închid și pornesc setarea fișei Grid";
    if (!nou) {
      var hw = lat / 2, j2 = P - hw, s2 = P + hw;
      nou = Object.assign({}, st, { jos: j2, sus: s2, stop: st.stop && (st.stop.jos > 0 || st.stop.sus > 0) ? { jos: st.stop.jos > 0 ? j2 - (st.jos - st.stop.jos) : null, sus: st.stop.sus > 0 ? s2 + (st.stop.sus - st.sus) : null } : null,   /* revizia (🔵9): ambele părți (neutru) */ tp: st.tp > 0 ? (dir === "long" ? s2 + (st.tp - st.sus) : dir === "short" ? j2 - (st.jos - st.tp) : null) : null });
      numeNou = "îl închid și pornesc unul la fel, centrat pe prețul de acum (" + pretTxt(j2) + "–" + pretTxt(s2) + ")";
    }
    A.push({ cheie: "reporneste", nume: numeNou, nou: nou });
    var ref = null;
    A.forEach(function (a) {
      if (a.cheie === "tine") { a.r = r0; return; }
      if (a.fix !== undefined) return;
      var stA = a.nou || a.st, g = gresitAcum(stA, P); if (g) { a.eroare = g; return; }
      try {
        a.r = a.nou ? simuleazaBaza(b15, stA, {   /* revizia (🟡6): botul nou fără scalaQ-ul celui vechi */ n: n, seed: seed, orizonturi: oriz, zile: zile, peDrum: true, plan: null }) : simuleazaBaza(b15, cuK(stA), bazaK);
        if (!a.r || a.r.eroare) a.eroare = a.r && a.r.eroare || "fără rezultat"; else if (!a.nou && a.r.acum && a.r.acum.oprit) a.eroare = "botul s-ar fi oprit deja pe drumul real";
      } catch (e) { a.eroare = String(e && e.message || e); }
    });
    // toate cifrele sunt „față de închiderea de acum”: traseul are deja scăzut comisionul de închidere (netLa) - acum și la capăt - deci „îl închid acum” = 0,
    // „îl țin” / setările = drumuriDeAici (închise la capăt), „îl închid și pornesc” = drumurile botului nou (de la zero, închis la capăt)
    var valori = function (a, h) { if (a.fix !== undefined) { var v = []; for (var i = 0; i < n; i++) v.push(a.fix); return v; } var z = a.r && a.r.orizonturi[h]; if (!z) return null; return a.nou ? z.drumuri : z.drumuriDeAici; };
    var T = oriz.map(function (z, h) { return valori(A[0], h); });
    A.forEach(function (a) {
      if (a.eroare) return;
      a.oriz = oriz.map(function (z, h) { var v = valori(a, h); if (!v) return null; var x = statHot(v, a.cheie === "tine" ? null : T[h], D); var zz = a.r && a.r.orizonturi[h]; x.zile = z; x.pStop = zz ? zz.pStop : null; x.pTp = zz ? zz.pTp : null; x.pLich = zz ? zz.pLich : null; return x; });
      delete a.r;
    });
    var hH = oriz.length - 1, prag = Math.max(1, 0.02 * suma), ales = alegeHotarare(A, { oriz: hH, prag: prag });
    // verificarea: alesul și „îl țin” reluate pe drumuri NOI (sămânța 13, de două ori mai multe) - ~8 încercări deodată, deci alesul e și cel mai norocos
    if (ales.cheie !== "tine" && o.verifica !== false) {
      var a2 = A.filter(function (x) { return x.cheie === ales.cheie; })[0];
      var t2 = simuleazaBaza(b15, stK, Object.assign({}, bazaK, { seed: 13, n: n * 2 })), v2 = null;
      if (a2.fix !== undefined) { v2 = []; for (var q = 0; q < n * 2; q++) v2.push(a2.fix); }
      else { var r2 = a2.nou ? simuleazaBaza(b15, a2.nou, { n: n * 2, seed: 13, orizonturi: oriz, zile: zile, peDrum: true, plan: null }) : simuleazaBaza(b15, cuK(a2.st), Object.assign({}, bazaK, { seed: 13, n: n * 2 })); var z2 = r2 && !r2.eroare ? r2.orizonturi[hH] : null; v2 = z2 ? (a2.nou ? z2.drumuri : z2.drumuriDeAici) : null; }
      var tz = t2 && !t2.eroare ? t2.orizonturi[hH].drumuriDeAici : null;
      var ok = false; if (v2 && tz) { var sv2 = statHot(v2, tz, D), st2 = statHot(tz, null, D); ok = alegeHotarare([{ cheie: "tine", oriz: oriz.map(function (z, h) { return h === hH ? st2 : null; }) }, { cheie: a2.cheie, oriz: oriz.map(function (z, h) { return h === hH ? sv2 : null; }) }], { oriz: hH, prag: prag }).cheie === a2.cheie; ales.verif = { n: n * 2, dif: sv2.dif }; }
      if (!ok) ales = { cheie: "tine", motiv: "„" + a2.nume + "” ieșea mai bun pe drumurile de aici, dar pe alte " + cate(n * 2, "drum", "drumuri") + " nu s-a mai ținut: ales dintre mai multe, poate fi noroc", respins: a2.cheie };
      else ales.verificat = true;
    }
    // planul tău: coada (de la pornire) trece de minusul planului ⇒ stopul la plan (sau închiderea), oricât ar fi media - e regula TA, nu o statistică
    if (ales.cheie === "tine" && o.plan && Number(o.plan.minus) > 0) {
      var z0 = r0.orizonturi[hH], p5Tot = z0 ? z0.p5 : null;
      if (p5Tot !== null && p5Tot < -Number(o.plan.minus)) { var pl = A.filter(function (x) { return x.cheie === "plan" && !x.eroare; })[0]; ales = { cheie: pl ? "plan" : "inchide", motiv: "în cele mai proaste 5% ajungi la " + bani1(p5Tot) + " de la pornire, planul tău zice −" + nrRo(Number(o.plan.minus), 1) + ": " + (pl ? "pune stopul la plan" : "închide-l"), plan: true }; }
    }
    return { P: P, fee: fee, prag: prag, oriz: oriz, scala: k, actiuni: A, ales: ales, n: n, zileEfective: D };
  }
  // v100.351 (alegerea LUI: „urmăresc hotărârile pe barele reale”): nota = ce s-a hotărât și pe ce (setările fiecărei acțiuni, poziția potrivită, ora
  // ultimei bare știute); judecaHotarare = fiecare acțiune reluată pe barele REALE de după hotărâre, cu același motor (prefixul de la pornire + barele
  // reale ca un singur drum), închisă la capăt ca în hotărâre. Nimic din viitor la notare; la judecată doar barele de după, cât a trecut de fapt.
  function notaHotarare(h, st, o, b15, acum) {
    if (!h || h.eroare || !Array.isArray(h.actiuni) || !b15 || !b15.length) return null;
    var A = h.actiuni.filter(function (a) { return !a.eroare; }).map(function (a) { var x = { cheie: a.cheie, nume: a.nume }; if (a.fix !== undefined) x.fix = true; else if (a.nou) x.nou = a.nou; else if (a.cheie !== "tine") x.st = a.st; var z = a.oriz && a.oriz[h.oriz.length - 1]; if (z) { x.media = Math.round(z.media * 100) / 100; if (z.dif) x.dif = Math.round(z.dif.media * 100) / 100; } return x; });
    return { t: acum || Date.now(), tUrm: b15[b15.length - 1].t + 9e5, pret: h.P, pornitLa: o.pornitLa, st: st, k: h.scala || null, ales: h.ales.cheie, plan: !!h.ales.plan, prag: Math.round(h.prag * 100) / 100, actiuni: A };
  }
  function judecaHotarare(bare, nota, zile) {
    if (!nota || !Array.isArray(bare) || !bare.length) return { eroare: "fără bare" };
    var i0 = -1; for (var i = 0; i < bare.length; i++) if (bare[i].t >= nota.tUrm) { i0 = i; break; }
    var H = Math.round(zile * BZ); if (i0 < 0 || bare.length - i0 < H) return { asteapta: true };
    if (bare[i0].t - nota.tUrm > 3600000) return { eroare: "gaură în bare după hotărâre" };
    if (!(nota.pornitLa > 0) || bare[0].t > nota.pornitLa + 15 * 60000) return { eroare: "fără barele de la pornirea botului (botul era pornit de prea mult)" };
    var hist = bare.slice(0, i0), real = bare.slice(i0, i0 + H), k = nota.k, cuK = function (x) { return k ? Object.assign({}, x, { scalaQ: k }) : x; }, stK = cuK(nota.st);
    var baza = { pornitLa: nota.pornitLa, stPrefix: stK, botRuleaza: true, n: 1, drumFix: real, orizonturi: [zile], zile: zile, peDrum: true, plan: null };
    var r0 = simuleazaBaza(hist, stK, baza); if (!r0 || r0.eroare || !r0.acum) return { eroare: r0 && r0.eroare || "reluarea n-a mers" };
    var val = {};
    nota.actiuni.forEach(function (a) {
      var v = null;
      try {
        if (a.cheie === "tine") v = r0.orizonturi[0].drumuriDeAici[0];
        else if (a.fix) v = 0;
        else if (a.nou) { var rn = simuleazaBaza(hist, a.nou, { n: 1, drumFix: real, orizonturi: [zile], zile: zile, peDrum: true, plan: null }); v = rn && !rn.eroare ? rn.orizonturi[0].drumuri[0] : null; }
        else if (a.st) { var ra = simuleazaBaza(hist, cuK(a.st), Object.assign({}, baza, { setareNoua: true })); v = ra && !ra.eroare ? ra.orizonturi[0].drumuriDeAici[0] : null; }
      } catch (e) { v = null; }
      val[a.cheie] = v === null || !isFinite(v) ? null : Math.round(v * 100) / 100;
    });
    return { zile: zile, val: val, pret: real[real.length - 1].c };
  }
  // v100.351 (ideea 3): verdictul Simulatorului pentru un bot NOU, judecat pe barele reale - botul pornit la prima bară de după notare (nota.tUrm),
  // un singur drum = cel real, închis la capăt (comisionul de închidere scăzut, ca în hotărâre). nota = { tUrm, st }; 7 zile.
  function judecaVerdict(bare, nota) {
    if (!nota || !nota.st || !Array.isArray(bare) || !bare.length) return { eroare: "fără bare" };
    var i0 = -1; for (var i = 0; i < bare.length; i++) if (bare[i].t >= nota.tUrm) { i0 = i; break; }
    var H = 7 * BZ; if (i0 < 0 || bare.length - i0 < H) return { asteapta: true };
    if (bare[i0].t - nota.tUrm > 3600000) return { eroare: "gaură în bare după notare" };
    if (i0 < 7 * BZ) return { eroare: "prea puțin istoric înaintea notării" };
    var r = simuleazaBaza(bare.slice(0, i0), nota.st, { n: 1, drumFix: bare.slice(i0, i0 + H), orizonturi: [7], zile: 7, peDrum: true, plan: null });
    if (!r || r.eroare) return { eroare: r && r.eroare || "fără rezultat" };
    return { val: r.orizonturi[0].drumuri[0] };
  }
  function comparaLa(rows, zile) {
    return (Array.isArray(rows) ? rows : []).map(function (x) { return x.gOriz && x.gOriz[zile] ? Object.assign({}, x, { g: x.gOriz[zile], drum: x.drumOriz ? x.drumOriz[zile] : x.drum, verif: x.verifOriz && x.verifOriz[zile] ? x.verifOriz[zile] : undefined }) : x; });   /* v100.350: și verificarea pe drumuri noi */
  }

  // v100.140 (revizia colectorului): rata de funding pe zi din ratele Pionex („rates”: fundingTime, fundingRate) - aici, în motorul pur, ca s-o
  // folosească la fel Simulatorul, Monte Carlo, Tabloul și colectorul. SUMA ratelor din fereastra de 7 zile pe zilele acoperite (fiecare rată
  // acoperă intervalul dinaintea ei; o gaură nu se numără peste o zi); doar rate mai vechi de 7 zile ⇒ „veche”. Cu semn: pozitivă = longul plătește
  function rataFunding(rates, acum) {
    var l = (Array.isArray(rates) ? rates : []).map(function (z) { return { t: Number(z && z.fundingTime), r: Number(z && z.fundingRate) }; }).filter(function (z) { return isFinite(z.t) && isFinite(z.r); }).sort(function (a, b) { return b.t - a.t; });
    if (l.length < 2) return null;
    var d = []; for (var i = 1; i < l.length; i++) d.push((l[i - 1].t - l[i].t) / 3600000); d.sort(function (a, b) { return a - b; });
    var ore = Math.round(d[Math.floor(d.length / 2)] * 10) / 10; if (!(ore > 0)) return null;
    var veche = !(l[0].t > acum - 7 * 864e5), ref = veche ? l[0].t : acum, ult = [], zile = 0;
    for (var k = 0; k < l.length; k++) { if (!(l[k].t > ref - 7 * 864e5)) break; var c = k + 1 < l.length ? (l[k].t - l[k + 1].t) / 3600000 : ore; ult.push(l[k]); zile += Math.min(24, Math.max(0, c)) / 24; }
    zile = Math.min(7, zile); if (!(zile > 0)) return null;
    var suma = ult.reduce(function (s, z) { return s + z.r; }, 0);
    return { rataZi: suma / zile, intervalOre: ore, zile: Math.round(zile * 10) / 10, n: ult.length, rata: l[0].r, veche: veche, ultimaLa: l[0].t };
  }

  // ---------------- (3) verdictul ----------------
  // regulile, fixate ÎNAINTE de cifre (spec §3), în ordinea asta; bot = botul Pionex (profitNet) la „Botul meu”.
  // revizia (R3): la botul care RULEAZĂ, rândul mare, cifrele și regulile 4–6 sunt pe „de aici încolo” (Aș ține / Aș opri) - ce a făcut
  // până acum nu se mai schimbă; regula planului rămâne pe totalul de la pornire (așa numără Pionex).
  function verdict(rez, st, plan, oriz, bot) {
    var o = rez && rez.orizonturi && rez.orizonturi[oriz >= 0 ? oriz : 0]; if (!o) return null;
    var meu = !!rez.acum, d = meu && o.deAici ? o.deAici : null, pl = plan && (plan.minus > 0 || plan.plus > 0) ? plan : null;
    var pC = d ? d.pCastig : o.pCastig, pP = d ? (d.pPierde != null ? d.pPierde : 1 - d.pCastig) : o.pPierde, pZ = d ? (d.pZero || 0) : o.pZero;
    // v100.140 (ideea 4): rotunjite separat, 96,5% / 3,5% dădeau „97% · 4%” = 101 - PIERDE ia restul până la 100 (cu „pe zero” doar de la 0,5%)
    var P = Math.round(pC * 100), Z = pZ >= 0.005 ? Math.min(Math.round(pZ * 100), 100 - P) : 0, Q = Math.max(0, 100 - P - Z), p50 = d ? d.p50 : o.p50, p5 = d ? d.p5 : o.p5, p95 = d ? d.p95 : o.p95, mj = d && d.marja != null ? d.marja : o.marja;
    var rand = (meu ? "de aici încolo: " : "") + "CÂȘTIGĂ în " + P + "% din drumuri · PIERDE în " + Q + "%" + (Z > 0 ? " · pe zero " + Z + "%" : "");
    if (meu && rez.acum.oprit) rand = "de aici încolo: fără procente - drumurile simulate stau pe loc";   /* v100.339 (revizia): nu „0% · 0% · pe zero 100%” */
    // v100.350 (auditul Simulatorului, el: „pe cum se termină”): pe 7 zile 49% din drumuri ieșeau la stop și 44% la TP - „de obicei +1,3” (mediana) cădea
    // între grămezi (1,3% din drumuri lângă ea) ⇒ felurile cu cât aduce fiecare + MEDIA cu intervalul ei pe zile; mediana doar când nu e ruptă în două
    var mMed = d ? d.media : o.media, mjMed = d ? d.marjaMedie : o.marjaMedie, term = d ? d.terminari : o.terminari, pn0 = meu && bot ? nr(bot.profitNet) : null;
    var rupt = Array.isArray(term) && (Number(o.pStop) || 0) + (Number(o.pTp) || 0) + (Number(o.pLich) || 0) >= 0.1 && term.filter(function (x) { return x.p >= 0.05; }).length >= 2;
    var FEL = { stop: "stop", lich: "lichidare", tp: "TP", ruleaza: "încă rulează" }, intre = function (x) { return Math.abs(x.p75 - x.p25) <= Math.max(0.25, 0.05 * Math.abs(x.p50)) ? "≈ " + semn1(x.p50) : semn1(x.p25) + "…" + semn1(x.p75); };
    var medTxt = mMed != null && isFinite(mMed) ? "media " + bani1(mMed) + (mjMed != null && isFinite(mjMed) ? " (±" + nrRo(mjMed, 1) + " pe zile)" : "") : null;
    var cum = rupt ? term.map(function (x) { return prMic(x.p) + " " + FEL[x.fel] + " " + intre(x); }).join(" · ") : "de obicei " + bani1(p50);   /* fraza mare a paginii */
    var sub = cum + (medTxt ? " · " + medTxt : "") + " · cele mai proaste 5%: " + bani1(p5) + " · cele mai bune 5%: " + bani1(p95)
      + (meu ? (pn0 !== null && d && isFinite(d.media) ? " · cu ce are acum în Pionex (" + semn1(pn0) + "): în medie " + bani1(pn0 + d.media) : " · cu tot cu ce a făcut până acum: în medie " + bani1(o.media)) : "");
    var zi = cate(o.zile, "zi", "zile"), faCe, planTxt = pl && o.plan && pl.plus > 0 && pl.minus > 0 ? "; planul +" + nrRo(pl.plus, 1) + " vine înainte de −" + nrRo(pl.minus, 1) + " în " + pr(o.plan.p) : "";
    // v100.196 (auditul 14.10, B1): „Aș porni / Aș ține” cere și ca marginea de jos a incertitudinii reale (pe zile) să rămână peste 50%, iar la botul
    // nou și ca pornit în fiecare zi pe istoria REALĂ să fi ieșit în medie pe plus (pe aceleași bare „Aș porni” ieșea în 103 din 108 porniri).
    // Pragurile sunt ipoteze: se judecă pe verdictele de după 14.10, pe ≥ 10 cazuri independente, separat pe regim.
    var rel = meu ? null : o.reluare, motNes = [];
    if (mj > 0 && P - mj <= 50) motNes.push("incertitudinea reală e ±" + cate(mj, "punct", "puncte") + (o.zileDistincte > 0 ? " (din ~" + cate(o.zileDistincte, "zi distinctă", "zile distincte") + ")" : "") + ", deci poate fi și sub 50%");
    if (!meu && !rel) motNes.push("pe istoria reală n-am nicio fereastră de " + zi + " ca să verific");
    // v100.350 (auditul Simulatorului: 32 din 35 de „Aș porni / Aș ține” aveau media pe minus): media drumurilor, cu marginea de jos pe zile, peste 0
    if (!(mMed != null && isFinite(mMed) && mMed - (Number(mjMed) || 0) > 0)) motNes.push(mMed != null && isFinite(mMed) ? "media drumurilor e " + bani1(mMed) + (mjMed != null ? " (±" + nrRo(mjMed, 1) + " pe zile)" : "") + (mMed <= 0 ? ": câștigă des puțin și pierde rar mult" : ", deci poate fi și pe minus") : "n-am media drumurilor");
    if (!meu && rel && !(rel.media > 0)) motNes.push("pe istoria reală, pornit în fiecare zi, a ieșit în medie " + bani1(rel.media) + " (" + cate(rel.n, "pornire", "porniri") + ", ~" + cate(rel.independente, "fereastră independentă", "ferestre independente") + ")");
    var confirmat = P >= 55 && p50 > 0 && !motNes.length;
    // audit 19.10 (4): simetric cu „Aș porni / Aș ține” - „Aș opri / N-aș porni” cere ca și marginea de SUS a incertitudinii reale (pe zile) să
    // rămână sub 50% (P + marja < 50); altfel e o aruncare de ban: n-am aflat că pierde („nu s-a dovedit” ≠ „s-a dovedit că nu”), iar felul
    // „aș opri” nu se anunță pe Discord (tura-monte-carlo-bot.mjs îl citește din primul cuvânt)
    // v100.272 (ideile auditului 29.10, verificat): asimetria rămasă e VOITĂ. Marja (zgomotul pe zile) e simetrică; reluarea istoricului real stă
    // doar la „Aș porni” fiindcă repară o abatere ÎNTR-O SINGURĂ PARTE: drumurile fără tendință scot tocmai mișcarea care strică gridul, deci
    // simularea îl vede mai bun decât e (pe barele reale zicea „Aș porni” în 103 din 108 porniri). O medie reală pe plus lângă „N-aș porni” vine
    // din tendința perioadei, pe care simularea intenționat n-o prelungește; iar greșelile costă diferit: un „Aș porni” fals pierde bani, un
    // „N-aș porni” fals doar o ocazie (aruncarea de ban zice și ea „suma mică”). Fișa citește rauConfirmat ca poartă de siguranță - n-o slăbesc.
    var rauConfirmat = P <= 45 && !(mj > 0 && P + mj >= 50);
    if (rel) sub += " · pe istoria reală, pornit în fiecare zi: în medie " + bani1(rel.media) + ", pe plus în " + pr(rel.pPlus) + " (" + cate(rel.n, "pornire", "porniri") + ", ~" + cate(rel.independente, "fereastră independentă", "ferestre independente") + ")";
    if (meu && rez.acum.oprit) faCe = "Reluarea arată botul " + (rez.acum.oprit === "lichidat" ? "LICHIDAT" : "OPRIT") + " pe drumul real: setările de aici nu se potrivesc cu botul tău din Pionex (stopul sau gridul diferă) - verifică-le înainte să te iei după cifre.";
    // v100.196 (B2): orice lichidare pe drumuri (era tolerată până la 2% pe 7 zile ≈ 63% pe an); sub 0,5% se scrie „sub 1%”, nu „0%”
    else if (!lichidareAcceptata(o.pLich)) faCe = meu ? "L-aș opri: lichidare în " + prMic(o.pLich) + " din drumuri de aici încolo. La un bot pornit levierul nu se schimbă: oprește-l și pornește altul mai strâns de partea pierderii." : "N-aș porni așa: lichidare în " + prMic(o.pLich) + " din drumuri. Levier mai mic sau grid mai strâns de partea pierderii.";
    else if (pl && pl.minus > 0 && o.p5 < -pl.minus) faCe = meu ? "Nu se potrivește cu planul tău: în cele mai proaste 5% ajungi la −" + nrRo(Math.abs(o.p5), 1) + " USDT de la pornire, planul tău zice −" + nrRo(pl.minus, 1) + ". Mută stopul la planul tău." : "Nu se potrivește cu planul tău: în cele mai proaste 5% pierzi " + nrRo(Math.abs(o.p5), 1) + " USDT, planul tău zice −" + nrRo(pl.minus, 1) + ". Mută stopul la planul tău sau micșorează suma.";
    // v100.196 (B2): fără „renunță la el” (contra alertei CRITIC „n-ai stop activ”): stopul se mută dincolo de o zi obișnuită a monedei
    else if (o.pStop > 0.5) faCe = "Stopul e în zgomot: atins în " + pr(o.pStop) + " din drumuri în " + zi + ". L-aș muta dincolo de cât merge moneda împotriva botului într-o zi obișnuită (profilul monedei), nu l-aș scoate.";
    else if (P >= 55 && p50 > 0 && !confirmat) faCe = (meu ? "O aruncare de ban de aici încolo: " : "O aruncare de ban: ") + "câștigă în " + P + "% din drumuri, dar " + motNes.join(" și ") + "; deocamdată nu zic «" + (meu ? "Aș ține" : "Aș porni") + "». " + (meu ? "Ține-l doar cu planul tău pus." : "Dacă vrei totuși, suma mică.");
    else if (P >= 55 && p50 > 0) faCe = meu ? "Aș ține: de aici încolo câștigă în " + P + "% din drumuri, în medie " + bani1(mMed) + planTxt + "." : "Aș porni: câștigă în " + P + "% din drumuri, în medie " + bani1(mMed) + planTxt + ".";
    else if (P <= 45 && !rauConfirmat) faCe = (meu ? "O aruncare de ban de aici încolo: " : "O aruncare de ban: ") + "pierde în " + Q + "% din drumuri, în medie " + bani1(mMed) + ", dar incertitudinea reală e ±" + cate(mj, "punct", "puncte") + (o.zileDistincte > 0 ? " (din ~" + cate(o.zileDistincte, "zi distinctă", "zile distincte") + ")" : "") + ", deci poate fi și peste 50%; n-am aflat că pierde, deocamdată nu zic «" + (meu ? "Aș opri" : "N-aș porni") + "». " + (meu ? "Ține-l doar cu planul tău pus." : "Dacă vrei totuși, suma mică.");
    else if (P <= 45) faCe = meu ? "Aș opri: de aici încolo pierde în " + Q + "% din drumuri (în medie " + bani1(mMed) + "). Pe drumurile fără tendință, de aici încolo setarea pierde din comisioane și din poziția rămasă." : "N-aș porni: pierde în " + Q + "% din drumuri (în medie " + bani1(mMed) + "). Pe drumurile fără tendință, setarea asta pierde din comisioane și din poziția rămasă.";
    else faCe = meu ? "O aruncare de ban de aici încolo: " + P + "% câștigă, " + Q + "% pierde. Gridul câștigă din grile, nu din direcție; ține-l doar cu planul tău pus." : "O aruncare de ban: " + P + "% câștigă, " + Q + "% pierde. Gridul câștigă din grile, nu din direcție; dacă vrei totuși, suma mică.";
    if (meu) {
      var pn = bot && nr(bot.profitNet);
      faCe += " De la pornire botul tău are " + (pn !== null && pn !== undefined ? semn1(pn) + " USDT (Pionex), " + semn1(rez.acum.usdt) + " estimat" : semn1(rez.acum.usdt) + " USDT estimat") + ".";
      if (o.plan && o.plan.dejaAtins && pl) faCe += " Dar planul tău e deja atins (" + (o.plan.dejaAtins === "plus" ? "+" + nrRo(pl.plus, 1) + "): încasează" : "−" + nrRo(pl.minus, 1) + "): ieși") + ", cum ți-ai propus.";
    }
    var dinZile = o.zileDistincte > 0 ? ", din ~" + cate(o.zileDistincte, "zi distinctă", "zile distincte") + " de istoric" : "";
    /* v100.267 (auditul 29.10): rauConfirmat pe nume - fișa gridului îl citește ca să nu coboare PORNEȘTE pe o aruncare de ban */
    // v100.350 (auditul Simulatorului): culoarea și eticheta urmează «Ce aș face eu» (ca verdictScurt pe Tablou) - verde deasupra lui „N-aș porni așa: lichidare” mințea
    var f0 = String(faCe || ""), ET = [[/^Aș porni/, "AȘ PORNI", "good"], [/^Aș ține/, "AȘ ȚINE", "good"], [/^(L-aș opri|Aș opri)/, "AȘ OPRI", "bad"], [/^N-aș porni/, "N-AȘ PORNI", "bad"], [/^Nu se potrivește/, "NU SE POTRIVEȘTE CU PLANUL", "bad"], [/^Stopul e în zgomot/, "STOPUL E ÎN ZGOMOT", "mijl"], [/^Reluarea arată/, "VERIFICĂ SETĂRILE", "mijl"], [/^O aruncare de ban/, "ARUNCARE DE BAN", "mijl"]].filter(function (x) { return x[0].test(f0); })[0] || [null, "ARUNCARE DE BAN", "mijl"];
    if (meu && !rez.acum.oprit && o.plan && o.plan.dejaAtins && pl) ET = o.plan.dejaAtins === "minus" ? [null, "IEȘI: PLANUL ATINS", "bad"] : [null, "ÎNCASEAZĂ: PLANUL ATINS", "good"];   /* revizia (R4): ca pe Tablou - planul atins bate eticheta */
    return { rand: rand, eticheta: ET[1], marja: (mj > 0 ? "±" + cate(mj, "punct", "puncte") : "sub ±1 punct") + dinZile, culoare: ET[2], media: mMed, marjaMedie: mjMed, rupt: rupt, cum: cum, mediaTxt: medTxt, confirmat: confirmat, rauConfirmat: rauConfirmat, sub: sub, faCe: faCe, deAici: !!d,
      nota: "Pe istoria monedei reluată, fără tendința perioadei; o criză mai rea decât orice a avut nu apare în drumuri. Umplerile sunt estimate pe bare, nu pe ordinele reale." };
  }
  // v100.139 (el, 08.10: „Monte Carlo cu un scan automat pe bot la 15 min” în Tablou): rândul SCURT - verdictul pe 7 zile (CÂȘTIGĂ / PIERDE,
  // stopul / lichidarea / TP-ul atins), «ce aș face» (prima propoziție din faCe) și „pe o zi” - într-un singur rând; eroarea ca text
  // v100.201 (B1): verdictul verificat pe ce a urmat (raportul colectorului); Brier ×100 cu o zecimală (mai mic = mai bine; aruncarea de ban = 25,0)
  // v100.269 (auditul Monte Carlo 29.10): boții lui trăiesc în mediană 0,5 h ⇒ verdictele „pe 7 zile” s-au judecat LA ÎNCHIDERE, nu după 7 zile;
  // textul spune unde s-au judecat (din scorul colectorului: laInchidere, oreMediana), iar fără scor rămâne „după 7 zile sau la închidere”
  function undeJudecate(r) {
    var s = r && r.scor, n = s ? (Number(s.d) || 0) + (Number(s.g) || 0) : 0;
    if (!s || !n || !(Number(s.laInchidere) * 2 > n)) return "judecate după 7 zile sau la închidere";
    return "judecate la închiderea botului (mediana după " + (isFinite(Number(s.oreMediana)) && s.oreMediana !== null ? String(Math.round(Number(s.oreMediana) * 10) / 10).replace(".", ",") : "?") + " h)";
  }
  function textCalibrareMc(r) {
    if (!r || typeof r !== "object") return "";
    var z1 = function (x) { return (Math.round(Number(x) * 10) / 10).toFixed(1).replace(".", ","); };
    if (r.stare !== "testat") return "verificat pe ce a urmat: " + (Number(r.n) || 0) + " din 30 de verdicte " + undeJudecate(r) + " — încă puține";
    var cutia = function (de) { return (r.cutii || []).filter(function (c) { return c && c.de === de && c.n > 0 && c.rata !== null; })[0]; }, sus = cutia(0.6), jos = cutia(0);
    var parti = ["verificat pe ce a urmat: " + cate(r.n, "verdict judecat", "verdicte judecate") + " pe " + cate(r.zile, "zi", "zile") + ", " + undeJudecate(r), "Brier " + z1(r.brier * 100) + " (aruncarea de ban: " + z1(r.brierBan * 100) + "; mai mic = mai bine)"];
    if (sus) parti.push("când zicea peste 60%: pe plus în " + z1(sus.rata * 100) + "% (" + sus.n + ")");
    if (jos) parti.push("sub 40%: pe plus în " + z1(jos.rata * 100) + "% (" + jos.n + ")");
    parti.push("verdictele din aceeași zi se mișcă împreună, deci dovezile sunt mai puține decât pare");
    return parti.join(" · ");
  }
  // v100.269 (auditul Monte Carlo 29.10, el: „verdicte și pe perioade mai scurte”): pe 1 h / 4 h / o zi „pe plus X%” nu spune mai mult decât
  // media (reluare pe 73 de monede), dar șansa STOPULUI, a lichidării și pierderea din cele mai proaste 5% sunt calibrate în medie ⇒ riscul.
  // rez = simuleaza(..., { orizonturi: [1/24, 4/24, 1, 7] }); la botul care rulează, pierderea e „de aici încolo” (deAici.p5).
  var ORIZ_SCURT = [1 / 24, 4 / 24, 1];
  function riscScurt(rez) {
    var l = rez && Array.isArray(rez.orizonturi) ? rez.orizonturi : [], out = [];
    ORIZ_SCURT.forEach(function (z) {
      var o = l.filter(function (x) { return x && Math.abs(Number(x.zile) - z) < 1e-6; })[0]; if (!o) return;
      var p5 = o.deAici && isFinite(o.deAici.p5) ? o.deAici.p5 : o.p5;
      out.push({ ore: Math.round(z * 24), pStop: isFinite(o.pStop) ? o.pStop : null, pLich: isFinite(o.pLich) ? o.pLich : null, p5: isFinite(p5) ? Math.round(p5 * 100) / 100 : null });
    });
    return out;
  }
  // v100.312 (I-842, 07.11: botul STX avea gridul de 8% pe o monedă care se mișcă ~13% pe săptămână): ce poate face piața botului în 7 zile,
  // pe aceleași drumuri ca verdictul (fără tendință) - lățimea gridului față de mișcarea obișnuită pe o săptămână (o abatere standard a
  // randamentelor de 15 minute din barele aduse, × √(7 zile)) și șansa ca prețul să iasă din grid. Șansa stopului e deja în textul verdictului.
  function riscSaptamana(rez, b15, bot) {
    var o = rez && Array.isArray(rez.orizonturi) ? rez.orizonturi.filter(function (x) { return x && Math.abs(Number(x.zile) - 7) < 1e-6; })[0] : null;
    var j = nr(bot && bot.gridJos), s = nr(bot && bot.gridSus), lat = j > 0 && s > j ? (s - j) / ((s + j) / 2) : null, r = [];
    // pe ZILE care nu se suprapun (de la ultima bară înapoi), × √7: cât se duce prețul până la capătul săptămânii. Pe 15 minute și pe 4 ore
    // mișcările din zi se întorc și umflă cifra (STX, 07.11: ±18,5% pe 15 minute și pe 4 ore, ±13,4% pe zile)
    var P4 = 96;
    for (var i = Array.isArray(b15) ? b15.length - 1 : -1; i - P4 >= 0; i -= P4) if (b15[i].c > 0 && b15[i - P4].c > 0) r.push(Math.log(b15[i].c / b15[i - P4].c));
    var mis = null;
    if (r.length >= 20) { var m = r.reduce(function (a, x) { return a + x; }, 0) / r.length, v = r.reduce(function (a, x) { return a + (x - m) * (x - m); }, 0) / (r.length - 1); mis = Math.exp(Math.sqrt(v * 7)) - 1; }
    if (!o && lat == null) return null;
    // reluarea pe drumul real arată botul deja OPRIT (stop / TP atins de la pornire): drumurile „de aici încolo” stau pe loc - șansele n-ar spune nimic
    var oprit = !!(rez && rez.acum && rez.acum.oprit);
    return { afara: !!(rez && rez.acum && rez.acum.afara), latime: lat, miscare7: mis, oprit: oprit, pIesire: !oprit && o && isFinite(o.pIesire) ? o.pIesire : null, pStop: !oprit && o && isFinite(o.pStop) ? o.pStop : null, zileBare: Array.isArray(b15) ? Math.floor(b15.length / BZ) : 0 };
  }
  function textSaptamana(x, laStop) {
    if (!x) return "";
    var p = [], pc1 = function (v) { return nrRo(Math.round(v * 1000) / 10, 1) + "%"; };
    if (x.latime != null && x.miscare7 != null) p.push("gridul are " + pc1(x.latime) + " lățime (±" + pc1(x.latime / 2) + " de la mijloc), iar o săptămână obișnuită mișcă moneda cu ±" + pc1(x.miscare7) + (x.latime / 2 < x.miscare7 ? " (mai mult decât jumătatea gridului)" : ""));   /* revizia: jumătatea gridului față de mișcarea într-o parte */
    else if (x.latime != null) p.push("gridul are " + pc1(x.latime) + " lățime");
    if (x.oprit) p.push("reluarea arată botul deja oprit, deci fără șansele pe drumuri (vezi Simulatorul)");
    if (x.afara) p.push("prețul e deja în afara gridului");   /* revizia v100.350 (R1) */
    else if (x.pIesire != null) p.push("prețul iese din grid în " + prMic(x.pIesire) + " din drumuri");
    if (laStop != null && isFinite(laStop) && x.pStop != null && x.pStop >= 0.005) p.push("dacă stopul e atins (" + pr(x.pStop) + "): " + bani1(laStop));
    return p.length ? "Pe 7 zile, fără tendință: " + p.join(" · ") : "";
  }
  function verdictScurt(rez, st, plan, bot) {
    if (!rez || rez.eroare) return { stare: "info", text: rez && rez.eroare ? String(rez.eroare) : "fără rezultat" };
    var i7 = -1, i1 = -1; (rez.orizonturi || []).forEach(function (o, i) { if (o.zile === 7) i7 = i; if (o.zile === 1) i1 = i; });
    var k7 = i7 >= 0 ? i7 : 0, v = verdict(rez, st, plan, k7, bot), v1 = i1 >= 0 ? verdict(rez, st, plan, i1, bot) : null; if (!v) return { stare: "info", text: "fără rezultat" };
    var o7 = rez.orizonturi[k7], meu = !!rez.acum, fara = function (s) { return String(s).replace(/^de aici încolo: /, ""); };
    var parti = [(meu ? "de aici încolo, " : "") + cate(o7.zile, "zi", "zile") + ": " + fara(v.rand)];
    // revizia (2): planul deja atins e cel mai urgent lucru - imediat după cifre, nu pierdut în coada textului lung
    var atins = o7.plan && o7.plan.dejaAtins && plan && (plan.minus > 0 || plan.plus > 0) ? o7.plan.dejaAtins : null;
    if (atins) parti.push("planul atins: " + (atins === "plus" ? "încasează" : "ieși"));
    // revizia (5): sub 0,5% nu se scrie „0%”
    // v100.313: reluarea arată botul OPRIT ⇒ drumurile stau pe loc și „stopul atins 100%” ar minți (cifra măsurată e pe rândul stopului din grafic)
    var opritMeu = !!(meu && rez.acum.oprit);
    if (o7.pStop >= 0.005 && !opritMeu) parti.push("stopul atins " + pr(o7.pStop)); if (o7.pLich >= 0.005 && !opritMeu) parti.push("lichidare " + pr(o7.pLich)); if (o7.pTp >= 0.005 && !opritMeu) parti.push("TP atins " + pr(o7.pTp));
    var faCe = String(v.faCe || "").split(/[.:]/)[0].trim(); if (faCe) parti.push("«" + faCe + "»");
    if (!opritMeu && o7 && o7.funding != null && o7.funding !== "" && isFinite(Number(o7.funding))) {
      var fv = Number(o7.funding), fa = Math.abs(fv), fban = fa < 0.05 ? "sub 0,1 USDT" : "≈ " + nrRo(fa, 1) + " USDT";
      parti.push("din care funding " + (fv < 0 ? "încasat " : "plătit ") + fban + (st && st.fundingCost ? ", presupus" : ""));
    }
    if (v1 && !opritMeu) parti.push("pe o zi: " + fara(v1.rand).replace(/ din drumuri/, ""));
    // revizia (3): culoarea urmează TEXTUL - „oprește / nu porni / nu se potrivește / oprit pe drumul real” e rău oricare ar fi procentul;
    // planul atins pe plus e bine (încasează), pe minus e rău (ieși)
    // v100.339 (auditul din 13.11): „Reluarea arată botul OPRIT / LICHIDAT” nu e o părere despre bot, e „setările de aici nu se potrivesc” ⇒
    // informație, nu „rău” (din „rău” vocile de sub verdict făceau „Monte Carlo contra botului”)
    var rau = /^(L-aș opri|N-aș porni|Aș opri|Nu se potrivește)/.test(faCe), reluare = /^Reluarea arată/.test(faCe);
    var stare = reluare ? "info" : atins === "minus" ? "rau" : atins === "plus" ? "bine" : rau ? "rau" : v.culoare === "good" ? "bine" : v.culoare === "bad" ? "rau" : "atentie";
    return { stare: stare, text: parti.join(" · "), culoare: v.culoare, faCe: v.faCe, rand: v.rand, atins: atins };
  }
  return { hotarare: hotarare, alegeHotarare: alegeHotarare, notaHotarare: notaHotarare, judecaHotarare: judecaHotarare, judecaVerdict: judecaVerdict, agitatieAcum: agitatieAcum, scaleazaDrum: scaleazaDrum, riscSaptamana: riscSaptamana, textSaptamana: textSaptamana, riscScurt: riscScurt, ORIZ_SCURT: ORIZ_SCURT, LICHIDARI_ACCEPTATE: LICHIDARI_ACCEPTATE, lichidareAcceptata: lichidareAcceptata, starturiRegim: starturiRegim, dinCod: dinCod, inCod: inCod, setariDinBot: setariDinBot, tpValid: tpValid, simuleaza: simuleaza, compara: compara, comparaLa: comparaLa, verdict: verdict, verdictScurt: verdictScurt, rataFunding: rataFunding, marja: marja, bani1: bani1, pr: pr, NUME: NUME, textCalibrareMc: textCalibrareMc };
})();
if (typeof globalThis !== "undefined") globalThis.GridSim = GridSim;
