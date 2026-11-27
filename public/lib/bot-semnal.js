// v100.380 (el, 23.11.2026: „vede radarul botul meu spot?” ⇒ „da”): botul de SEMNAL (Pionex „smart_copy”: TradingView trimite intrările și ieșirile,
// Pionex le execută) - textele lui pentru Tablou, Piața azi și banda de sus, și schimbările de poziție pentru alertele colectorului.
// Modul pur: fără DOM, fără rețea, fără ceas (acum vine din afară). Câmpurile vin traduse de server (functions/api/bot-orders.js, normalizeazaSemnal):
// tip „semnal”, ruleaza, semnal, baza, investit, sumaAcum, profitTotal, levier, directie, pozitie, pozitieBani, inPozitie, runde, rundePePlus, pretPornire.
// Nu e un bot de grid: gridul, grilele, lichidarea, zero-ul și sfaturile de grid nu există aici - nu se desenează și nu se inventează.
// Probat în scripts/proba-v100380.mjs.
var BotSemnal = (function () {
  "use strict";
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  /* TextRo se ia la fiecare folosire (în colector și în probe se încarcă uneori după modul) */
  function tr() { return typeof TextRo !== "undefined" ? TextRo : null; }
  function num(x, z) { var T = tr(); if (T) return T.num(x, z); x = nr(x); return x === null ? "—" : (x < 0 ? "−" : "") + Math.abs(x).toFixed(z == null ? 1 : z).replace(".", ","); }
  // rezultat cu o zecimală și semn după cifra rotunjită (fără „−0,0”)
  function semn1(x) { x = nr(x); if (x === null) return "—"; var r = Math.round(x * 10) / 10; return (r > 0 ? "+" : "") + num(r === 0 ? 0 : r, 1); }
  function cant(x) { var T = tr(); return T && T.cant ? T.cant(x) : num(x, 4); }
  function pret(x) { var T = tr(); x = nr(x); if (x === null) return "—"; return x >= 1000 ? num(x, 2) : x >= 1 ? num(x, 4) : (T && T.pret ? T.pret(x) : num(x, 6)); }
  function cate(n, sg, pl) { var T = tr(); return T && T.cate ? T.cate(n, sg, pl) : String(n) + "\u00a0" + pl; }
  function ore(ms) { var T = tr(); if (!(ms >= 0)) return "—"; var h = ms / 3600000; if (h < 1) return Math.max(1, Math.round(ms / 60000)) + " min"; if (h < 48) return T ? T.oreN(Math.round(h)) : Math.round(h) + " h"; return cate(Math.round(h / 24), "zi", "zile"); }   /* de la 2 zile în sus, zile întregi (regula „de”: TextRo.cate) */

  function eSemnal(b) { return !!(b && b.tip === "semnal"); }
  function moneda(b) { return String(b && b.baza || "").replace(/\.PERP$/, "") || "—"; }
  function perp(b) { return /\.PERP$/.test(String(b && b.baza || "")) || /perp/i.test(String(b && b.piata || "")); }

  // starea în cuvinte: { cod: fara | long | short | neclar | oprit, titlu, sub, ton (sus / jos / gri) }
  function stare(b) {
    if (!b) return null;
    if (b.ruleaza === false) return { cod: "oprit", titlu: "oprit", sub: "botul nu mai rulează în Pionex", ton: "gri" };
    var d = b.directie, q = nr(b.pozitie), bani = nr(b.pozitieBani);
    if (d === "long" || d === "short") {
      var cat = [q !== null ? cant(Math.abs(q)) + " " + moneda(b) : null, bani !== null ? num(bani, 1) + " USDT" : null].filter(Boolean).join(" · ");
      return { cod: d, titlu: d === "long" ? "LONG" : "SHORT", sub: cat || "cantitatea nu e citită", ton: d === "long" ? "sus" : "jos" };
    }
    if (b.pozitieNeclara || b.inPozitie) return { cod: "neclar", titlu: "neclar", sub: "Pionex dă cantitatea și banii poziției care nu se potrivesc - verifică în aplicația Pionex", ton: "gri" };
    return { cod: "fara", titlu: "fără poziție", sub: "așteaptă semnalul din TradingView", ton: "gri" };
  }
  // v100.396 (I-944, auditul 26.11 🔴): botul de semnal e un perpetual - ARE lichidare. Pionex dă maintPrice = 0 la boții lui (văzut pe VPS, 27.11),
  // deci: maintPrice / pretLichidare dacă vine > 0; altfel ESTIMATĂ din levier și intrare (banii poziției / cantitate), cu marja de întreținere
  // ~0,5%: long = intrare × (1 − 1/levier + 0,5%), short = intrare × (1 + 1/levier − 0,5%). Long la 1× nu se lichidează. Fără o intrare plauzibilă
  // (între jumătate și dublul prețului de acum) - nimic, spus ca atare.
  var MMR = 0.005;
  function lichidare(b) {
    var p = nr(b && b.pretCurent), lev = nr(b && b.levier), d = b && b.directie, q = nr(b && b.pozitie), bani = nr(b && b.pozitieBani), lq = nr(b && b.pretLichidare);
    if (!(p > 0) || (d !== "long" && d !== "short")) return null;
    if (lq > 0) return { pret: lq, dist: d === "long" ? (p - lq) / p : (lq - p) / p, estimat: false };
    if (!(lev > 0)) return null;
    if (d === "long" && lev <= 1) return { pret: null, dist: null, faraLichidare: true };
    var e = q && bani ? Math.abs(bani / q) : null; if (!(e > 0) || e < p / 2 || e > p * 2) return null;
    var pl = d === "long" ? e * (1 - 1 / lev + MMR) : e * (1 + 1 / lev - MMR);
    return { pret: pl, dist: d === "long" ? (p - pl) / p : (pl - p) / p, estimat: true, intrare: e };
  }
  // paza (colectorul o cheamă la fiecare tură): lichidarea (≤ 15% atenție, ≤ 8% critic - pragurile Tabloului), pierderea (−10% din suma pusă atenție,
  // −15% critic = regula LUI de oprire), poziția deschisă de peste 24 h (ieșirea din TradingView poate să nu fi sosit). O alertă pe treaptă și pe
  // episod; treapta coboară ⇒ episodul se închide. st = starea lui (colectorul o ține pe disc).
  // revizia 27.11 (🔴): HISTEREZIS, ca la grid (alerte.js: ieșirea la 17% / 9,5% după ce s-au măsurat 59 de mesaje pe oră) - treapta urcă la
  // 15% / 8%, dar coboară abia peste 17% / 9,5% (prețul care joacă în jurul pragului dădea ~31 de alerte critice pe oră); o citire LIPSĂ
  // (preț / intrare) cât botul e în poziție PĂSTREAZĂ treapta. La fel pierderea: urcă la −10% / −15%, coboară abia peste −8% / −13%.
  var PRAG = { lichAtentie: 0.15, lichCritic: 0.08, lichIesAtentie: 0.17, lichIesCritic: 0.095, pierdAtentie: -0.10, pierdCritic: -0.15, pierdIesAtentie: -0.08, pierdIesCritic: -0.13, vecheMs: 24 * 3600000 };
  // treapta cu histerezis: la ambele mărimi (distanța până la lichidare, rezultatul în % din sumă) „mai mic = mai rău”
  function treapta(v, prev, intra1, intra2, ies1, ies2) {
    var t = v <= intra2 ? 2 : v <= intra1 ? 1 : 0;
    if (prev === 2 && t < 2 && v <= ies2) t = 2;
    if (prev >= 1 && t === 0 && v <= ies1) t = 1;
    return t;
  }
  // revizia 27.11 (verificat pe viu, 3 citiri la un minut: `profit` și `sumaAcum` stau pe loc cât prețul se mișcă, `pozitieBani` = costul intrării):
  // profitul Pionex al botului de semnal e doar REALIZAT ⇒ rezultatul cu poziția = realizat + cantitate × (preț − intrare) × direcție
  function rezultatCuPozitie(b) {
    var pr = nr(b && b.profitTotal), q = nr(b && b.pozitie), bani = nr(b && b.pozitieBani), p = nr(b && b.pretCurent), d = b && b.directie;
    if (pr === null) return null;
    if ((d !== "long" && d !== "short") || !q) return { total: pr, realizat: pr, nerealizat: 0 };
    var e = bani ? Math.abs(bani / q) : null; if (!(e > 0) || !(p > 0) || e < p / 2 || e > p * 2) return { total: null, realizat: pr, nerealizat: null };
    var nz = Math.abs(q) * (p - e) * (d === "long" ? 1 : -1); return { total: pr + nz, realizat: pr, nerealizat: nz, intrare: e };
  }
  // v100.396 (revizia valului 4, I-967): cifra de pe ECRANE (cartela, Piața azi, banda de sus, Paznicul) = aceeași ca paza (−15%) și Contul întreg:
  // realizatul Pionex (doar încasatul, verificat pe viu 27.11) + poziția deschisă la prețul de acum; fără intrare socotibilă ⇒ fără total (nu verde
  // peste o pierdere deschisă). { val, cls, sub, total, realizat, nerealizat }
  function rezultatEcran(b) {
    var x = rezultatCuPozitie(b); if (!x) return { val: "—", cls: "", sub: "", total: null };
    var r1 = function (v) { return Math.round(v * 10) / 10; }, c = function (v) { return v === null ? "" : r1(v) > 0 ? "good" : r1(v) < 0 ? "bad" : ""; };
    if (x.total === null) return { val: "încasat " + semn1(x.realizat), cls: "", sub: "poziția deschisă n-o pot socoti (intrarea nu iese din banii poziției)", total: null, realizat: x.realizat, nerealizat: null };
    if (!x.nerealizat) return { val: semn1(x.total), cls: c(x.total), sub: "încasat; acum fără poziție deschisă", total: x.total, realizat: x.realizat, nerealizat: 0 };
    return { val: semn1(x.total), cls: c(x.total), sub: "încasat " + semn1(x.realizat) + " · poziția deschisă " + semn1(x.nerealizat) + " (din intrarea ~" + pret(x.intrare) + ", estimată)", total: x.total, realizat: x.realizat, nerealizat: x.nerealizat };
  }
  function paza(b, st, acum) {
    st = st && typeof st === "object" ? st : {}; var out = [], m = moneda(b), id = String(b && b.id || ""), D = function (x) { return x === "long" ? "LONG" : "SHORT"; };
    if (!eSemnal(b) || b.ruleaza === false) return { st: st, alerte: out };
    var inPoz = b.directie === "long" || b.directie === "short", lq = inPoz ? lichidare(b) : null;
    var tl = !inPoz ? 0 : lq && lq.dist !== null && lq.dist !== undefined ? treapta(lq.dist, st.lich || 0, PRAG.lichAtentie, PRAG.lichCritic, PRAG.lichIesAtentie, PRAG.lichIesCritic) : lq && lq.faraLichidare ? 0 : (st.lich || 0);
    if (tl > (st.lich || 0)) out.push({ nivel: tl === 2 ? "critic" : "atentie", cheie: "lich-semnal-" + id, titlu: m + " semnal: lichidarea la " + num(lq.dist * 100, 1) + "% de preț" + (lq.estimat ? " (estimată)" : ""),
      /* mesajul pe forma casei (garda textelor): faptul, apoi „👉 ” cu ce aș face */
      mesaj: D(b.directie) + " la " + pret(b.pretCurent) + ", lichidarea ~" + pret(lq.pret) + (lq.estimat ? " (estimată din levierul " + num(nr(b.levier), 0) + "× și intrarea ~" + pret(lq.intrare) + "; Pionex n-o dă la botul de semnal)" : "") + ".\n👉 Aș verifica botul în Pionex: aș adăuga marjă sau l-aș închide." });
    st.lich = tl;
    var rc = rezultatCuPozitie(b), pr = rc ? rc.total : null, inv = nr(b && b.investit), rp = pr !== null && inv > 0 ? pr / inv : null;
    var tp = rp !== null ? treapta(rp, st.pierd || 0, PRAG.pierdAtentie, PRAG.pierdCritic, PRAG.pierdIesAtentie, PRAG.pierdIesCritic) : inPoz ? (st.pierd || 0) : 0;
    if (tp > (st.pierd || 0)) out.push({ nivel: tp === 2 ? "critic" : "atentie", cheie: "pierdere-semnal-" + id, titlu: m + " semnal: " + num(rp * 100, 1) + "% din suma pusă (" + semn1(pr) + " USDT)",
      mesaj: tp === 2 ? "Botul a trecut de regula ta de oprire (−15% din suma pusă, cu poziția deschisă).\n👉 Aș opri botul de mână, dacă stopul din Pionex nu l-a oprit." : "Botul se apropie de regula ta de oprire (−15% din suma pusă, cu poziția deschisă).\n👉 Aș verifica în Pionex că stopul botului e pus." });
    st.pierd = tp;
    /* revizia 27.11 (minor): întoarcerea dintr-un ordin (long ⇒ short, regula v1.3) e o poziție NOUĂ ⇒ ceasul de 24 h pornește din nou */
    if (inPoz && st.dir && st.dir !== b.directie) { st.deschisDe = 0; st.vecheAnuntat = false; }
    st.dir = inPoz ? b.directie : null;
    if (inPoz) { if (!st.deschisDe) st.deschisDe = acum; if (acum - st.deschisDe >= PRAG.vecheMs && !st.vecheAnuntat) { st.vecheAnuntat = true; out.push({ nivel: "atentie", cheie: "veche-semnal-" + id, titlu: m + " semnal: " + D(b.directie) + " deschis de " + ore(acum - st.deschisDe),
      mesaj: "O poziție ținută atâta e neobișnuită pentru un bot pe semnal: ieșirea din TradingView poate să nu fi sosit.\n👉 Aș verifica în TradingView că alerta trimite și ieșirea, apoi în Pionex (Jurnal semnale) că a sosit." }); } }
    else { st.deschisDe = 0; st.vecheAnuntat = false; }
    return { st: st, alerte: out };
  }
  // numele scurt: „BTC semnal 1×”
  function nume(b) { var l = nr(b && b.levier); return moneda(b) + " semnal" + (l !== null ? " " + num(l, l % 1 ? 1 : 0) + "×" : ""); }
  // banda de sus: „BTC semnal 1× · fără poziție” / „… · LONG 0,0006 BTC”
  function textBanda(b) { var s = stare(b); return s ? nume(b) + " · " + (s.cod === "long" || s.cod === "short" ? s.titlu + (nr(b.pozitie) !== null ? " " + cant(Math.abs(nr(b.pozitie))) + " " + moneda(b) : "") : s.titlu) : nume(b); }

  // Cardul din Tablou (în locul verdictului și al celor 4 cifre de grid). esc = escapeHtml al paginii. o = { acum }
  function cardHtml(b, esc, o) {
    if (!eSemnal(b)) return "";
    esc = esc || function (s) { return String(s); }; var acum = o && o.acum || 0, s = stare(b);
    var inv = nr(b.investit), sa = nr(b.sumaAcum), re = rezultatEcran(b);   /* revizia (I-967): cu poziția deschisă, ca paza */
    var cls = function (x) { return x > 0 ? "good" : x < 0 ? "bad" : ""; };
    var cel = function (et, val, vcls, sub) { return '<div class="bsmCel"><span class="tbEt2">' + esc(et) + '</span><b class="tbKpiVal ' + (vcls || "") + '">' + esc(val) + '</b>' + (sub ? '<span class="tbSub">' + esc(sub) + '</span>' : '') + '</div>'; };
    var nR = nr(b.runde), nP = nr(b.rundePePlus), lev = nr(b.levier);
    var h = '<div class="tbBlocCap"><h4>Botul de semnal · ' + esc(moneda(b)) + '</h4><span class="tbSub">' + esc((b.semnal ? "TradingView „" + b.semnal + "”" : "TradingView") + " trimite intrările și ieșirile, Pionex le execută") + '</span></div>';
    h += '<div class="bsmCifre">'
      + cel("Poziția", s.titlu, s.ton === "sus" ? "good" : s.ton === "jos" ? "bad" : "mutedInfo", s.sub)
      + cel("Rezultat, USDT", re.val, re.cls, [re.sub || null, inv !== null ? "din " + num(inv, 1) + " puși" : null, sa !== null ? "în bot acum " + num(sa, 1) : null, "Pionex dă doar încasatul; poziția o adaugă Radarul"].filter(Boolean).join(" · "))
      + cel("Intrări", nR === null ? "—" : String(nR), "", nR === null ? "" : nP !== null && nR > 0 ? "pe plus " + nP + " din " + nR : nR === 0 ? "nicio intrare încă" : "")
      + cel("Pornit", nr(b.pornitLa) && acum ? "acum " + ore(acum - nr(b.pornitLa)) : "—", "", [perp(b) ? moneda(b) + " perpetual" : moneda(b), lev !== null ? "levier " + num(lev, lev % 1 ? 1 : 0) + "×" : null, nr(b.pretPornire) !== null ? "prețul la pornire " + pret(b.pretPornire) : null].filter(Boolean).join(" · "))
      + (function () {   /* v100.396 (I-944): lichidarea, cât există poziție */
        if (s.cod !== "long" && s.cod !== "short") return "";
        var lq = lichidare(b);
        if (!lq) return cel("Lichidarea", "—", "mutedInfo", "n-o pot estima: Pionex n-o dă, iar intrarea nu se poate socoti din banii poziției");
        if (lq.faraLichidare) return cel("Lichidarea", "nu există", "good", "long la 1×: marja acoperă toată poziția");
        return cel("Lichidarea", num(lq.dist * 100, 1) + "% de preț", lq.dist <= PRAG.lichCritic ? "bad" : lq.dist <= PRAG.lichAtentie ? "tbWarn" : "", "~" + pret(lq.pret) + (lq.estimat ? " · estimată din levier și intrare (~" + pret(lq.intrare) + "); Pionex n-o dă" : " · după Pionex"));
      })()
      + '</div>';
    /* v100.396 (I-958): toți boții de semnal pe viu - netul realizat pe tranzacție, regula de oprire scrisă înainte (verdict la 30) */
    if (o && o.registru !== undefined) h += '<p class="tbSub bsmReg">' + esc(textTranzactii(o.registru && o.registru.rezumat)) + "</p>";
    h += '<p class="tbSub bsmNota">Nu e un bot de grid: marginile, grilele și sfaturile de grid nu se aplică și nu apar aici; lichidarea și pierderea le urmărește colectorul (Discord, și noaptea). Prețul de intrare Pionex nu-l dă pentru botul de semnal. Intrările și ieșirile vin ca alertă pe Discord (noaptea, în rezumatul de la 08:00).</p>';
    return h;
  }
  // rândul din Piața azi („Boții tăi”): eticheta și cifra
  function randAcasa(b) { if (!eSemnal(b)) return null; var s = stare(b), re = rezultatEcran(b); return { et: nume(b) + " · " + s.titlu + (s.cod === "long" || s.cod === "short" ? " " + s.sub.split(" · ")[0] : ""), val: re.val === "—" ? "—" : re.val + " USDT" + (re.nerealizat ? " (cu poziția)" : ""), cls: re.val === "—" || re.total === null ? "acMut" : re.cls }; }   /* revizia (I-967): cu poziția deschisă */

  // ---------- schimbările de poziție (colectorul) ----------
  // ref = { d: directie | null, q: cantitatea, pr: rezultatul botului, p: prețul, t, n: numărul evenimentului } sau null (prima citire doar fixează)
  // ⇒ { ev: intrat | iesit | intors | marit | micsorat | null, ref: referința nouă, ant: cea veche }
  function schimbare(ref, b, acum) {
    var d = b && (b.directie === "long" || b.directie === "short") ? b.directie : null, q = nr(b && b.pozitie);
    var nou = { d: d, q: q, pr: nr(b && b.profitTotal), p: nr(b && b.pretCurent), r: nr(b && b.runde), t: acum, n: ref && ref.n || 0 };
    if (!b || b.ruleaza === false) return { ev: null, ref: ref || null, ant: ref || null };
    if (!ref) return { ev: null, ref: nou, ant: null };
    if (b.pozitieNeclara) return { ev: null, ref: ref, ant: ref };   /* revizia: poziția neclară nu dă nicio alertă și nu mută referința */
    var ev = null;
    if (!ref.d && d) ev = "intrat";
    else if (ref.d && !d && !b.inPozitie) ev = "iesit";
    else if (ref.d && d && ref.d !== d) ev = "intors";
    /* revizia valului 4 (27.11, 🟡): aceeași direcție, dar o rundă închisă între două citiri (ieșit + reintrat) - pe viu 27.11 (data/semnal-brut.jsonl,
       16 boți) roundCount crește cu 1 exact la fiecare poziție închisă (ieșire sau întoarcere) și realizatul se mișcă doar atunci ⇒ tranzacție, nu „mărit” */
    else if (ref.d && d && ref.d === d && nr(ref.r) !== null && nou.r !== null && nou.r > ref.r) ev = "reintrat";
    else if (ref.d && d && q !== null && nr(ref.q) !== null && Math.abs(q) > Math.abs(ref.q) * 1.000001) ev = "marit";
    else if (ref.d && d && q !== null && nr(ref.q) !== null && Math.abs(q) < Math.abs(ref.q) * 0.999999) ev = "micsorat";
    /* revizia (🔵): o intrare și o ieșire între două citiri - poziția arată la fel, dar rundele au crescut */
    else if (!ref.d && !d && nr(ref.r) !== null && nou.r !== null && nou.r > ref.r) ev = "runda";
    if (!ev) return { ev: null, ref: Object.assign({}, ref, { pr: nou.pr, p: nou.p, r: nou.r }), ant: ref };
    nou.n = (ref.n || 0) + 1;
    if (ev === "marit" || ev === "micsorat") { nou.pr0 = ref.pr0 != null ? ref.pr0 : ref.pr; nou.p0 = ref.p0 != null ? ref.p0 : ref.p; }
    /* revizia valului 4 (27.11, 🔴): la ÎNTOARCERE realizatul de acum cuprinde deja poziția închisă ⇒ poziția nouă pornește de la el (înainte: ref.pr,
       de dinainte de închidere ⇒ tranzacția următoare mai număra o dată poziția veche: 0 ⇒ 5 ⇒ 8 ⇒ 6 dădea [5, 8, 1] în loc de [5, 3, −2]); la INTRARE
       rămâne realizatul de la ultima citire fără poziție (o rundă scăpată între citiri intră în poziția nouă, suma rămâne corectă) */
    else if (ev === "intrat") { nou.pr0 = ref.pr; nou.p0 = nou.p; }
    else if (ev === "intors" || ev === "reintrat") { nou.pr0 = nou.pr; nou.p0 = nou.p; }
    return { ev: ev, ref: nou, ant: ref };
  }
  // v100.396 (I-958, el 27.11: „fa tot plus idei”): boții de semnal PE VIU - fiecare tranzacție închisă (ieșire, întoarcere, rundă între două citiri)
  // cu rezultatul ei REALIZAT (profitul Pionex e doar realizat - verificat pe viu 27.11 - deci după comision și funding): realizatul de acum minus cel
  // de la intrare (aceeași socoteală ca „pe poziția asta” din mesaj). { bot, moneda, d, la, net (USDT), pus, pct (net / pus) } | null
  function tranzactie(r, b, acum) {
    if (!r || !r.ev || (r.ev !== "iesit" && r.ev !== "intors" && r.ev !== "runda" && r.ev !== "reintrat")) return null;
    var ant = r.ant || {}, rez = nr(b && b.profitTotal), pr0 = r.ev === "runda" ? nr(ant.pr) : nr(ant.pr0 != null ? ant.pr0 : ant.pr), pus = nr(b && b.investit);
    if (rez === null || pr0 === null) return null;
    var net = rez - pr0; return { bot: String(b.id || ""), moneda: moneda(b), d: r.ev === "runda" ? null : ant.d || null, la: acum, net: Math.round(net * 1e4) / 1e4, pus: pus, pct: pus > 0 ? net / pus : null };
  }
  // regula SCRISĂ ÎNAINTE (27.11.2026, înaintea oricărei tranzacții numărate): pe toți boții de semnal, media rezultatului pe tranzacție în % din suma
  // pusă, cu IC 95% (Student pe n − 1); verdict abia la 30 de tranzacții, înghețat de colector: IC întreg sub zero ⇒ „opreste” (aș opri boții de
  // semnal), IC întreg peste zero ⇒ „castiga”, altfel „n-am-aflat”. Reper: Proba 13 (1 h, un an, 21 de monede) aștepta ~−0,2% pe tranzacție după cost.
  var REG_SEMNAL = { n: 30, reperProba13: -0.002 };
  function rezumatTranzactii(l) {
    var v = (Array.isArray(l) ? l : []).map(function (x) { return x && nr(x.pct); }).filter(function (x) { return x !== null; }), n = v.length;
    var med = n ? v.reduce(function (a, x) { return a + x; }, 0) / n : null, sd = n > 1 ? Math.sqrt(v.reduce(function (a, x) { return a + (x - med) * (x - med); }, 0) / (n - 1)) : null;
    var z = 1.959964, tc = n > 1 ? z * (1 + (z * z + 1) / (4 * (n - 1))) : null, se = sd !== null ? sd / Math.sqrt(n) : null;
    var lo = se !== null ? med - tc * se : null, hi = se !== null ? med + tc * se : null, sumaNet = (Array.isArray(l) ? l : []).reduce(function (a, x) { return a + (nr(x && x.net) || 0); }, 0);
    return { n: n, medie: med, lo: lo, hi: hi, sumaNet: sumaNet, pePlus: n ? v.filter(function (x) { return x > 0; }).length / n : null, nVerdict: REG_SEMNAL.n, reper: REG_SEMNAL.reperProba13,
      verdict: n < REG_SEMNAL.n ? "se-aduna" : hi < 0 ? "opreste" : lo > 0 ? "castiga" : "n-am-aflat" };
  }
  // textul (cartela, Discord): o frază
  function textTranzactii(rz) {
    if (!rz || !rz.n) return "Boții de semnal, pe viu: încă nicio tranzacție închisă numărată (de la livrarea v100.396). Verdictul abia la " + REG_SEMNAL.n + ".";
    var P = function (x) { var a = Math.abs(x) * 100; return (x > 0 ? "+" : x < 0 ? "−" : "") + num(a, a >= 0.095 ? 1 : 2) + "%"; };   /* o zecimală; două doar sub 0,1% */
    var V = { opreste: "verdict: pierde pe viu - aș opri boții de semnal", castiga: "verdict: câștigă pe viu", "n-am-aflat": "verdict: n-am aflat" };
    return "Boții de semnal, pe viu: " + cate(rz.n, "tranzacție închisă", "tranzacții închise") + ", media " + P(rz.medie) + " pe tranzacție din suma pusă" + (rz.lo !== null ? " (" + P(rz.lo) + " … " + P(rz.hi) + ")" : "") + ", în total " + semn1(rz.sumaNet) + " USDT · "
      + (rz.verdict === "se-aduna" ? "verdictul abia la " + REG_SEMNAL.n + " (regula scrisă înainte)" : V[rz.verdict] + (rz.inghetat ? (rz.cifreInghetate && rz.cifreInghetate.medie !== null && rz.cifreInghetate.medie !== undefined ? " (înghețat la " + rz.cifreInghetate.n + ": " + P(rz.cifreInghetate.medie) + (rz.cifreInghetate.lo !== null && rz.cifreInghetate.lo !== undefined ? ", " + P(rz.cifreInghetate.lo) + " … " + P(rz.cifreInghetate.hi) : "") + ")" : " (înghețat)") : "")) + " · Proba 13 aștepta ~" + P(REG_SEMNAL.reperProba13) + ".";
  }
  // mesajul alertei: { nivel, titlu, mesaj, cheie, doarRadar } - intrarea, ieșirea și întoarcerea pleacă pe Discord; mărirea / micșorarea doar în Radar
  function mesaj(r, b) {
    if (!r || !r.ev) return null;
    /* revizia: prețul e cel de la citire, nu prețul de intrare (Pionex nu-l dă); cheia poartă ora evenimentului - după o repornire nu se repetă una veche */
    var m = moneda(b), p = nr(b.pretCurent), la = p !== null ? " · prețul acum " + pret(p) : "", s = stare(b), ant = r.ant || {}, cheie = "semnal-" + r.ev + "-" + String(b.id) + "-" + String(r.ref.t);
    var rez = nr(b.profitTotal), rezT = rez === null ? "" : "rezultatul botului: " + semn1(rez) + " USDT", pr0 = nr(ant.pr0 != null ? ant.pr0 : ant.pr);
    var pe = rez !== null && pr0 !== null ? " (pe poziția asta " + semn1(rez - pr0) + ")" : "", prov = b.semnal ? " · semnal TradingView „" + b.semnal + "”" : "";
    var D = function (d) { return d === "long" ? "LONG" : d === "short" ? "SHORT" : "?"; };
    if (r.ev === "intrat") return { nivel: "info", cheie: cheie, titlu: m + " semnal: a intrat " + D(b.directie) + la, mesaj: s.sub + (rezT ? " · " + rezT + " până acum" : "") + prov };
    if (r.ev === "iesit") return { nivel: "info", cheie: cheie, titlu: m + " semnal: a ieșit din " + D(ant.d) + la, mesaj: (rezT ? rezT + pe : "rezultatul botului necitit") + prov };
    if (r.ev === "runda") return { nivel: "info", cheie: cheie, titlu: m + " semnal: o intrare și o ieșire între două citiri", mesaj: (rezT ? rezT + (rez !== null && nr(ant.pr) !== null ? " (pe runda asta " + semn1(rez - nr(ant.pr)) + ")" : "") : "rezultatul botului necitit") + prov };
    if (r.ev === "intors") return { nivel: "info", cheie: cheie, titlu: m + " semnal: din " + D(ant.d) + " în " + D(b.directie) + la, mesaj: s.sub + (rezT ? " · " + rezT + pe : "") + prov };
    /* revizia: ieșit și reintrat pe aceeași parte între două citiri - doar în Radar (e o tranzacție închisă, dar poziția arată la fel) */
    if (r.ev === "reintrat") return { nivel: "info", cheie: cheie, doarRadar: true, titlu: m + " semnal: a ieșit și a reintrat " + D(b.directie) + " între două citiri" + la, mesaj: s.sub + (rezT ? " · " + rezT + pe : "") + prov };
    return { nivel: "info", cheie: cheie, doarRadar: true, titlu: m + " semnal: " + (r.ev === "marit" ? "a mărit " : "a micșorat ") + D(b.directie) + la, mesaj: s.sub + prov };
  }
  // botul de semnal închis (găsit printre cei închiși): mesajul de la sfârșit
  function mesajInchis(x, acum) {
    if (!x) return null; var rez = nr(x.profitTotal), inv = nr(x.investit), dur = nr(x.inchisLa) && nr(x.pornitLa) ? nr(x.inchisLa) - nr(x.pornitLa) : null, nR = nr(x.runde), nP = nr(x.rundePePlus);
    return { nivel: "info", cheie: "semnal-oprit-" + String(x.id), titlu: moneda(x) + " semnal: botul s-a oprit" + (rez !== null ? " · " + semn1(rez) + " USDT" : ""),
      mesaj: [inv !== null ? "din " + num(inv, 1) + " USDT puși" : null, dur !== null ? "a ținut " + ore(dur) : null, nR !== null ? (nR === 1 ? "o intrare" : cate(nR, "intrare", "intrări")) + (nP !== null && nR > 0 ? ", " + nP + " pe plus" : "") : null].filter(Boolean).join(" · ") };
  }
  // ce se notează pe disc la fiecare schimbare (ca semnificația câmpurilor Pionex să se poată verifica după): doar cifre și texte scurte, fără userSignals
  /* revizia (🔵): o LISTĂ de câmpuri permise (nu una de excluderi) - un câmp nou de la Pionex nu ajunge pe disc până nu e trecut aici */
  var POZA_BOT = ["quoteTotalInvestment", "quoteOriginalInvestment", "currentQuoteAmount", "quoteBaseAmount", "profit", "fundingFee", "trx24h", "roundCount24h", "status", "signalName", "market", "tradeType", "initQuotePrice", "closedSharedQuote"];
  var POZA_P = ["qtyLong", "qtyShort", "amountLong", "amountShort", "currentBaseAmount", "profit", "profitPositive", "percent", "initPrice", "maintPrice", "closedPrice", "leverage", "tradeBase", "base", "currentRound", "roundCount", "profitRoundCount", "closedQuoteAmount", "closedBaseAmount", "fundingFee", "totalFeeInQuote", "totalFeeInBase", "amountSettle", "sharedAmount", "status", "lossStopRatio", "profitStopRatio"];
  function poza(b, acum) {
    var x = b && b.brut && b.brut.buOrderData || {}, p = Array.isArray(x.portfolio) && x.portfolio[0] || {}, o = { t: acum, id: String(b && b.id || ""), pret: nr(b && b.pretCurent), bot: {}, p: {} };
    var ok = function (v) { return typeof v === "number" || v === null || (typeof v === "string" && v.length <= 40 && !/https?:|token/i.test(v)); };
    POZA_BOT.forEach(function (k) { if (k in x && ok(x[k])) o.bot[k] = x[k]; });
    POZA_P.forEach(function (k) { if (k in p && ok(p[k])) o.p[k] = p[k]; });
    return o;
  }

  return { tranzactie: tranzactie, rezumatTranzactii: rezumatTranzactii, textTranzactii: textTranzactii, REG_SEMNAL: REG_SEMNAL, lichidare: lichidare, paza: paza, PRAG_PAZA: PRAG, rezultatCuPozitie: rezultatCuPozitie, rezultatEcran: rezultatEcran, treapta: treapta, eSemnal: eSemnal, stare: stare, nume: nume, textBanda: textBanda, cardHtml: cardHtml, randAcasa: randAcasa, schimbare: schimbare, mesaj: mesaj, mesajInchis: mesajInchis, poza: poza, semn1: semn1 };
})();
if (typeof globalThis !== "undefined") globalThis.BotSemnal = BotSemnal;
