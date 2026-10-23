// Scorul sezonului (v100.217, 19.10.2026; el: „vreau ca în crypto să-mi afișeze începând de azi scorul trade-urilor pe Pionex:
// câte win, câte loss, rata de câștig etc., în așa fel încât să mă stimuleze să fiu mai atent” + „vreau și un obiectiv pe care
// îl setez eu”). Modul PUR (fără DOM, fără rețea), probat în scripts/proba-scor-sezon.mjs. Pagina îl desenează pe Acasă (sub
// verdictele pieței) și sus în Jurnal; data sezonului + obiectivul stau în KV-ul de acasă (functions/api/scor-sezon.js).
//
// Un „trade” = un bot Pionex închis (grid futures, spot grid, smart copy), cu rezultatul NET după comisioane și funding - lista
// în forma StatisticaTrade (dinPionex + dinPionexAlte): { id, eticheta, inchis, rezultat }. Win = net > 0, loss = net < 0, zero nu e
// nici una. Sub 10 boți cifrele rămân, dar cardul spune că încă nu înseamnă nimic (regula de 10 din statistica-trade).
// 🔑 De ce netul stă lângă rată: pe toată istoria lui rata e 56 % din 2.307 boți și netul −6.033 USDT - câștigă des și puțin,
// pierde rar și mult. Rata singură l-ar liniști în timp ce pierde.
var ScorSezon = (function () {
  "use strict";
  var MIN = 10, ZI = 86400000, TZ = "Europe/Bucharest";
  var SEZON_IMPLICIT = Date.UTC(2026, 9, 18, 21, 0, 0);   // 19.10.2026 00:00 Europe/Bucharest (ziua cererii lui)
  var OBIECTIV_IMPLICIT = { rata: 0.55, serie: 3, net: 50, pana: null };
  // v100.220 (el: „fă și pentru Trade 212, dar cu trade-urile viitoare”): a doua piață - trade-urile închise T212 (lei), sezonul din
  // 19.10.2026 13:00 (ora livrării), deci doar ce se închide de atunci încolo; „fel” = cum se numește un trade pe piața aia
  var PIETE = {
    pionex: { nume: "Pionex", moneda: "USDT", fel: ["bot", "boți"], felInchis: ["bot închis", "boți închiși"], start: SEZON_IMPLICIT, obiectiv: OBIECTIV_IMPLICIT },
    t212: { nume: "Trading 212", moneda: "lei", fel: ["trade", "trade-uri"], felInchis: ["trade închis", "trade-uri închise"], start: Date.UTC(2026, 9, 19, 10, 0, 0), obiectiv: { rata: 0.55, serie: 3, net: 200, pana: null } }
  };
  function piataDin(p) { return PIETE[p] ? p : "pionex"; }

  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v.replace(",", ".")); return isFinite(x) ? x : null; }
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // sumele cu O zecimală și virgulă (regula lui din 03.10); „+0,0” fără semn
  function U(v, M) { if (v === null || v === undefined || !isFinite(v)) return "—"; var s = Math.abs(v).toFixed(1); return (Number(s) === 0 ? "" : v >= 0 ? "+" : "−") + s.replace(".", ",") + " " + (M || "USDT"); }
  function pr(v) { return v === null || v === undefined || !isFinite(v) ? "—" : Math.round(v * 100) + " %"; }
  // v100.259: intervalul Wilson (95%) pentru k din n - același ca GridCalcul.wilson
  function wilson(k, n) { if (!(n > 0)) return [0, 1]; var z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]; }

  // ---- ziua pe ora României ----
  var fmtZi = null;
  try { fmtZi = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }); } catch (e) { fmtZi = null; }
  function ziIso(t) { if (!fmtZi) return new Date(t).toISOString().slice(0, 10); var p = {}; fmtZi.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; }); return p.year + "-" + p.month + "-" + p.day; }
  // decalajul României la momentul t (+2 h iarna, +3 h vara), din aceeași formatare
  function decalajOre(t) { if (!fmtZi) return 0; var p = {}; new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; }); var u = new Date(t); return ((+p.hour - u.getUTCHours()) * 60 + (+p.minute - u.getUTCMinutes()) + 24 * 60) % (24 * 60) / 60; }
  // 00:00 al zilei lui t, pe ora României, ca timestamp UTC
  function startulZilei(t) { var z = ziIso(t), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(z), u = Date.UTC(+m[1], +m[2] - 1, +m[3], 0, 0, 0); var s = u - decalajOre(u) * 3600000; return u - decalajOre(s) * 3600000; }   // decalajul la miezul nopții LOCAL (în ziua schimbării orei diferă de cel de la 00:00 UTC)
  function dataRo(t) { var z = ziIso(t); return z.slice(8, 10) + "." + z.slice(5, 7) + "." + z.slice(0, 4); }
  function dataScurta(t) { var z = ziIso(t); return z.slice(8, 10) + "." + z.slice(5, 7); }
  function zileIntre(deLa, panaIso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(panaIso || ""); if (!m) return null; return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(+ziIso(deLa).slice(0, 4), +ziIso(deLa).slice(5, 7) - 1, +ziIso(deLa).slice(8, 10))) / ZI); }

  // ---- obiectivul LUI ----
  // acceptă „2026-11-30” sau „30.11.2026”; gol = fără dată; data stricată = eroare
  function dataIso(v) {
    var s = String(v == null ? "" : v).trim(); if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s), r = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
    var y, mo, d; if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; } else if (r) { y = +r[3]; mo = +r[2]; d = +r[1]; } else return false;
    var t = new Date(Date.UTC(y, mo - 1, d)); if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return false;
    return t.toISOString().slice(0, 10);
  }
  function valideazaObiectiv(o, piata) {
    o = o || {}; var M = PIETE[piataDin(piata)].moneda;
    var rata = nr(o.rata), serie = nr(o.serie), net = nr(o.net), pana = dataIso(o.pana);
    // v100.221 (audit 11): rata e MEREU procent („55” = 55 %); „1” = 1 %, nu 100 %; sub 1 % nu e țintă
    if (rata === null || rata < 1 || rata > 100) return { ok: false, eroare: "Rata țintă e un procent între 1 și 100." };
    if (serie === null || serie < 1 || serie > 50 || serie !== Math.round(serie)) return { ok: false, eroare: "Pierderile la rând: un număr întreg de la 1 la 50." };
    if (net === null || net <= 0) return { ok: false, eroare: "Netul țintă e o sumă peste zero, în " + M + "." };
    if (pana === false) return { ok: false, eroare: "Data: zi.lună.an (de exemplu 30.11.2026) sau goală." };
    return { ok: true, obiectiv: { rata: rata / 100, serie: serie, net: net, pana: pana } };
  }
  // ce vine din KV (sau nimic) ⇒ mereu o configurație întreagă; stricată ⇒ implicită
  function normalizeaza(c, piata) {
    var P = PIETE[piataDin(piata)];
    var start = c && nr(c.start) !== null && nr(c.start) > 0 ? nr(c.start) : P.start;
    var rk = c && c.obiectiv ? nr(c.obiectiv.rata) : null;   // în KV rata e fracție (0,55); validarea cere procent
    var v = c && c.obiectiv ? valideazaObiectiv({ rata: rk === null ? null : rk <= 1 ? rk * 100 : rk, serie: c.obiectiv.serie, net: c.obiectiv.net, pana: c.obiectiv.pana }, piata) : { ok: false };
    // v100.220: sezonul OPRIT - numără doar până la ora opririi; ce se închide după nu intră, până la „Sezon nou”
    var oprit = c && nr(c.oprit) !== null && nr(c.oprit) > start ? nr(c.oprit) : null;
    // v100.218 (ideea 1): sezoanele încheiate [{start, sfarsit}], cum le ține serverul (sezonNou); stricate ⇒ fără
    var ist = Array.isArray(c && c.istoric) ? c.istoric.filter(function (x) { return x && nr(x.start) > 0 && nr(x.sfarsit) > nr(x.start); }).map(function (x) { return { start: nr(x.start), sfarsit: nr(x.sfarsit) }; }) : [];
    return { start: start, oprit: oprit, obiectiv: v.ok ? v.obiectiv : Object.assign({}, P.obiectiv), istoric: ist, piata: piataDin(piata) };
  }

  // ---- socoteala ----
  function grupa(l) {
    var win = 0, loss = 0, zero = 0, sc = 0, sp = 0;
    l.forEach(function (x) { if (x.rezultat > 0) { win++; sc += x.rezultat; } else if (x.rezultat < 0) { loss++; sp += x.rezultat; } else zero++; });
    var n = l.length, serieP = 0, maxP = 0;
    l.forEach(function (x) { if (x.rezultat < 0) { serieP++; if (serieP > maxP) maxP = serieP; } else serieP = 0; });
    return { n: n, win: win, loss: loss, zero: zero, rata: n ? win / n : null, /* v100.221 (audit 13): win ÷ toți, ca statistica Jurnalului (zerourile intră la numitor) */ net: n ? sc + sp : null, castigBrut: sc, pierdereBruta: sp,
      castigMediu: win ? sc / win : null, pierdereMedie: loss ? sp / loss : null, raport: win && loss ? (sc / win) / (-sp / loss) : null, seriePierderi: maxP };
  }
  function calc(lista, cfg, acum, piata) {
    var c = normalizeaza(cfg, piata), ob = c.obiectiv, t = acum || Date.now(), P = PIETE[c.piata];
    var l = (Array.isArray(lista) ? lista : []).filter(function (x) { return x && nr(x.rezultat) !== null && nr(x.inchis) !== null; })
      .map(function (x) { return { id: x.id, eticheta: x.eticheta, inchis: nr(x.inchis), rezultat: nr(x.rezultat) }; })
      .sort(function (a, b) { return a.inchis - b.inchis; });
    var sezon = l.filter(function (x) { return x.inchis >= c.start && (c.oprit === null || x.inchis < c.oprit); }), inainte = l.filter(function (x) { return x.inchis < c.start; });
    var dupaOprire = c.oprit === null ? 0 : l.filter(function (x) { return x.inchis >= c.oprit; }).length;
    var s = grupa(sezon), b = grupa(inainte);
    // seria curentă: de la ultimul închis înapoi, până la primul de alt fel (zero o oprește)
    var n = 0, fel = null;
    for (var i = sezon.length - 1; i >= 0; i--) { var f = sezon[i].rezultat > 0 ? "w" : sezon[i].rezultat < 0 ? "l" : null; if (!f) continue; if (!fel) fel = f; if (f !== fel) break; n++; }   // v100.221: zeroul e sărit, nu rupe seria
    s.serie = { n: n, fel: fel };
    s.pauza = fel === "l" && n >= ob.serie;
    s.suficient = s.n >= MIN;
    s.nivel = s.pauza ? "rau" : s.rata === null || !s.suficient ? "fara" : s.rata >= ob.rata && s.net !== null && !(s.net < 0) ? "bine" : s.rata >= ob.rata - 0.15 ? "atentie" : "rau";   // v100.222 (I-724): rata peste țintă cu net pe minus nu e verde
    s.start = c.start; s.obiectiv = ob; s.acum = t; s.oprit = c.oprit; s.dupaOprire = dupaOprire; s.piata = c.piata; s.moneda = P.moneda;
    s.ultimul = sezon.length ? sezon[sezon.length - 1] : null;
    s.progresRata = s.rata === null ? null : Math.max(0, Math.min(1, s.rata / ob.rata));
    s.progresNet = s.net === null ? null : Math.max(0, Math.min(1, s.net / ob.net));
    s.zileRamase = ob.pana ? zileIntre(t, ob.pana) : null;
    s.inainte = b;
    return s;
  }

  // ---- v100.218 (ideea 1): sezoanele - cele încheiate (istoricul de pe server) + cel de acum, fiecare socotit pe boții lui ----
  function sezoane(lista, cfg, acum, piata) {
    var c = normalizeaza(cfg, piata), t = acum || Date.now(), l = Array.isArray(lista) ? lista : [];
    var toate = c.istoric.slice().sort(function (a, b) { return a.start - b.start; }).map(function (x) { return { start: x.start, sfarsit: x.sfarsit, curent: false }; });
    toate.push({ start: c.start, sfarsit: c.oprit, curent: true });
    return toate.map(function (z) {
      var s = calc(l.filter(function (x) { return z.sfarsit === null || nr(x.inchis) < z.sfarsit; }), { start: z.start, obiectiv: c.obiectiv }, t, c.piata);
      return { start: z.start, sfarsit: z.sfarsit, curent: z.curent, n: s.n, win: s.win, loss: s.loss, rata: s.rata, net: s.net, seriePierderi: s.seriePierderi, moneda: P_moneda(c.piata) };
    });
  }
  function P_moneda(p) { return PIETE[piataDin(p)].moneda; }
  // tabelul „Sezoanele tale” (doar când există măcar un sezon încheiat); cel de acum e primul
  function htmlIstoric(lista, piata) {
    var l = Array.isArray(lista) ? lista : []; if (l.length < 2) return ""; var felCap = PIETE[piataDin(piata)].fel[1]; felCap = felCap.charAt(0).toUpperCase() + felCap.slice(1);
    var rows = l.slice().reverse().map(function (z) {
      var per = dataRo(z.start) + " → " + (z.sfarsit === null ? "acum" : dataRo(z.sfarsit - 1));
      return "<tr" + (z.curent ? ' class="scIstAcum"' : "") + "><td>" + esc(per) + (z.curent ? " <b>· sezonul de acum" + (z.sfarsit !== null ? " (oprit)" : "") + "</b>" : "") + "</td><td data-et=\"boți:\">" + z.n + "</td><td data-et=\"win / loss:\"><span class=\"good\">" + z.win + "</span> / <span class=\"bad\">" + z.loss + "</span></td><td data-et=\"rata:\">" + esc(pr(z.rata)) + "</td><td data-et=\"net:\" class=\"" + (z.net === null || !(z.n >= 10) ? "" : z.net >= 0 ? "good" : "bad") + "\">" + esc(U(z.net, z.moneda)) + "</td><td data-et=\"pierderi la rând:\">" + z.seriePierderi + "</td></tr>";
    }).join("");
    return '<div class="scIst"><h4>Sezoanele tale</h4><table class="scIstTab"><thead><tr><th>Perioada</th><th>' + esc(felCap) + '</th><th>Win / loss</th><th>Rata</th><th>Net</th><th>Pierderi la rând</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  // ---- v100.218 (ideea 2): ce anunță colectorul, pur - starea ține minte ce s-a anunțat (pauza pe ultimul bot, țintele pe sezon) ----
  // pauza: la fiecare bot NOU închis pe minus cât ești în pauză (ultimul bot schimbat); rata / netul atins: o dată pe sezon, rata doar de la 10 boți
  function alerte(s, stare) {
    var st = stare && typeof stare === "object" ? stare : {}, out = [];
    if (s.oprit) return { mesaje: out, stare: st };   // v100.220: sezon oprit - nimic de anunțat
    if (s.pauza && s.ultimul && st.pauzaLa !== s.ultimul.id) { st.pauzaLa = s.ultimul.id; out.push({ fel: "pauza" }); }
    // v100.221 (audit 5): cheia ține startul ȘI ținta - o țintă ridicată se anunță din nou când e atinsă
    var kr = s.start + "|" + s.obiectiv.rata, kn = s.start + "|" + s.obiectiv.net;
    if (s.suficient && s.rata !== null && s.rata >= s.obiectiv.rata && s.net !== null && !(s.net < 0) && st.rataLa !== kr) { st.rataLa = kr; out.push({ fel: "rata" }); }   // v100.222 (I-724)
    if (s.suficient && s.net !== null && s.net >= s.obiectiv.net && st.netLa !== kn) { st.netLa = kn; out.push({ fel: "net" }); }   /* v100.254: sub 10 închideri netul nu se anunță */
    return { mesaje: out, stare: st };
  }

  // ---- cardul ----
  var CUL = { fara: "var(--muted)", bine: "var(--good)", atentie: "var(--warn)", rau: "var(--bad)" };
  function cel(et, val, cls, sub, mare) { var c = "scVal" + (cls ? " " + cls : "") + (mare ? " scMare" : ""); return '<div class="scCel' + (mare ? " scCelMare" : "") + '"><span class="scEt">' + esc(et) + '</span><b class="' + c + '">' + esc(val) + '</b><span class="scSub">' + esc(sub) + '</span></div>'; }
  function html(s, o) {
    o = o || {}; var id = String(o.id || "scor"), ob = s.obiectiv, se = s.serie, P = PIETE[piataDin(s.piata)], M = P.moneda, fel = P.fel, Um = function (v) { return U(v, M); };
    var serieTxt = se.n === 0 ? "—" : se.n + (se.fel === "w" ? " pe plus" : " pe minus");
    var serieCls = se.fel === "w" ? "good" : s.pauza ? "bad" : se.fel === "l" ? "neutral" : "";
    var serieSub = s.pauza ? "PAUZĂ: " + cate(ob.serie, "pierdere", "pierderi") + " la rând - nu porni alt " + fel[0] + " azi" : se.fel === "l" ? (ob.serie - se.n === 1 ? "încă una și e pauză" : "la " + ob.serie + " la rând e pauză") : se.fel === "w" ? "ține ritmul" : "primul " + P.felInchis[0] + " pornește seria";
    var subN = s.n === 0 ? "niciun " + P.felInchis[0] + " încă" : !s.suficient ? "sub 10: încă nu înseamnă nimic" : (s.piata === "t212" ? "destule ca să conteze" : "destui boți ca să conteze");
    var cifre = cel("Win", s.win, "good", s.n ? Um(s.castigBrut) : P.felInchis[1] + " pe plus")
      + cel("Loss", s.loss, "bad", s.n ? Um(s.pierdereBruta) : P.felInchis[1] + " pe minus")
      + cel("Rata de câștig", pr(s.rata), s.nivel === "bine" ? "good" : s.nivel === "atentie" ? "neutral" : s.nivel === "rau" ? "bad" : "", "ținta " + pr(ob.rata) + " · " + subN)
      + cel("Net", Um(s.net), !s.suficient || s.net === null || Math.round(s.net * 10) === 0 ? "" : s.net > 0 ? "good" : "bad", s.raport !== null ? "o pierdere = " + s.raport.toFixed(1).replace(".", ",") + " câștiguri" + (s.raport < 1 ? " - pierzi mai mult decât câștigi" : "") : (s.piata === "t212" ? "după comisioanele de conversie" : "după comisioane și funding"), true)
      + cel("Seria", serieTxt, serieCls, serieSub);
    var b = s.inainte, inTxt;
    if (b.n) {
      inTxt = "Înainte de " + esc(dataScurta(s.start)) + ": <b>" + esc(pr(b.rata)) + "</b> din " + esc(cate(b.n, fel[0], fel[1])) + " · net <b class=\"" + (!(b.n >= 10) || b.net === null ? "" : b.net >= 0 ? "good" : "bad") + "\">" + esc(Um(b.net)) + "</b> · cea mai lungă serie de pierderi " + b.seriePierderi + ". ";
      // v100.259 (auditul 23.10, punctul 8): „bate / sub trecut” doar când intervalul Wilson (95%) al ratei de acum lasă trecutul de o parte;
      // 7 din 10 față de 56% (p ≈ 0,29) e „încă nu se poate spune”, cu intervalul la vedere
      var icS = wilson(s.win, s.n);
      inTxt += !s.suficient ? "Sezonul nou pornește de la zero: fiecare " + P.felInchis[0] + " contează."
        : icS[0] > b.rata ? (s.net > 0 ? "Sezonul nou bate trecutul: și marginea de jos a ratei (" + pr(icS[0]) + ") e peste " + pr(b.rata) + "." : "Rata e mai bună (și marginea ei de jos, " + pr(icS[0]) + ", e peste " + pr(b.rata) + "), dar netul încă nu: pierderile sunt prea mari.")
        : icS[1] < b.rata ? "Sezonul nou e sub trecut: și marginea de sus a ratei (" + pr(icS[1]) + ") e sub " + pr(b.rata) + "."
        : "Încă nu se poate spune dacă sezonul nou e mai bun: rata " + pr(s.rata) + " pe " + cate(s.n, fel[0], fel[1]) + " are intervalul " + pr(icS[0]) + "–" + pr(icS[1]) + ", iar trecutul (" + pr(b.rata) + ") e înăuntru.";
    } else inTxt = "Nu am istoric de dinainte de " + esc(dataScurta(s.start)) + ".";
    var zile = s.zileRamase === null ? "" : s.zileRamase < 0 ? " · termenul a trecut" : " · " + cate(s.zileRamase, "zi", "zile") + " până la " + esc(dataRo(Date.parse(ob.pana + "T00:00:00Z")));
    var pRata = s.progresRata === null ? 0 : Math.round(s.progresRata * 100), pNet = s.progresNet === null ? 0 : Math.round(s.progresNet * 100);
    // v100.220: sezon oprit - banda de stare + butoanele potrivite („Pornește sezon nou de azi” în loc de „Oprește” + „Sezon nou”)
    var oprit = s.oprit ? '<div class="scOprit">⏸ Sezon OPRIT din ' + esc(dataRo(s.oprit)) + ' - cifrele sunt înghețate' + (s.dupaOprire ? "; " + esc(cate(s.dupaOprire, P.felInchis[0], P.felInchis[1])) + " după oprire nu intră în scor" : "") + '. Apasă „Obiectiv ✎” → „Pornește sezon nou de azi” când reiei.</div>' : "";
    // v100.221 (audit 9): setările nu s-au putut citi de pe serverul de acasă - spus pe față, nu obiectiv implicit în tăcere
    var nota = o.sursaEroare ? '<div class="scOprit">⚠ Setările scorului nu s-au putut citi de pe serverul de acasă: cardul arată sezonul și obiectivul implicit până răspunde.</div>' : "";
    var form = "";
    if (o.formular) {
      // v100.221 (audit 7): ce a tastat (o.valori) are întâietate față de obiectivul salvat - o eroare sau o redesenare nu îi șterge câmpurile
      var V = o.valori || {}, v = function (x) { return esc(x); }, val = function (k, implicit) { return v(V[k] !== undefined && V[k] !== null ? V[k] : implicit); };
      form = '<div class="scForm" id="scForm-' + esc(id) + '"><label>Rata de câștig țintă (%)<input name="rata" inputmode="decimal" value="' + val("rata", Math.round(ob.rata * 100)) + '"></label>'
        + '<label>Max pierderi la rând<input name="serie" inputmode="numeric" value="' + val("serie", ob.serie) + '"></label>'
        + '<label>Net țintă (' + esc(M) + ')<input name="net" inputmode="decimal" value="' + val("net", ob.net) + '"></label>'
        + '<label>Până la (zi.lună.an)<input name="pana" inputmode="numeric" placeholder="30.11.2026" value="' + val("pana", ob.pana ? dataRo(Date.parse(ob.pana + "T00:00:00Z")) : "") + '"></label></div>'
        + '<div class="scFormBtn"><button class="acBtn" type="button" value="' + esc(id) + '" data-action-click="scorSalveaza(this.value)">Salvează obiectivul</button>'
        + (s.oprit ? '<button class="acBtn" type="button" value="' + esc(id) + '" data-action-click="scorSezonNou(this.value)">Pornește sezon nou de azi</button>'
          : '<button class="acBtn" type="button" value="' + esc(id) + '" data-action-click="scorOpreste(this.value)">Oprește sezonul</button><button class="acBtn" type="button" value="' + esc(id) + '" data-action-click="scorSezonNou(this.value)">Sezon nou de azi</button>')
        + (o.mesaj ? '<span class="scSub scMesaj">' + esc(o.mesaj) + '</span>' : '<span class="scSub">obiectivul și data sezonului stau pe serverul de acasă · sezonul vechi rămâne în Jurnal</span>') + '</div>';
    }
    return '<div class="scCard' + (s.oprit ? " scCardOprit" : "") + '" style="--sc-c:' + CUL[s.nivel] + '"><div class="scCap"><h4>🏁 Scorul tău pe ' + esc(P.nume) + ' · sezonul din ' + esc(dataScurta(s.start)) + (s.oprit ? " · OPRIT" : "") + '</h4>'
      + '<span class="acSub">' + (s.ultimul ? "ultimul închis " + esc(dataScurta(s.ultimul.inchis)) : "ziua 1") + (o.faraJurnal ? "" : ' · <button type="button" class="actionGhost" data-action-click="navTo(\'jurnaltrade\',true)' + (s.piata === "t212" ? ";jtAlegeFiltru(\'actiuni\')" : "") + '">Jurnal ›</button>') + ' · <button type="button" class="actionGhost" value="' + esc(id) + '" data-action-click="scorFormular(this.value)">' + (o.formular ? "închide" : "Obiectiv ✎") + '</button></span></div>'
      + nota + oprit + '<div class="scCifre">' + cifre + '</div>'
      + '<div class="scObiectiv"><div class="scTinta"><span class="scSub">Obiectivul tău: rata ≥ <b>' + esc(pr(ob.rata)) + '</b> · max <b>' + ob.serie + '</b> pierderi la rând · <b>' + esc(Um(ob.net)) + '</b>' + zile + '</span><div class="scBara"><i style="width:' + pRata + '%"></i></div><span class="scSub">rata: ' + pRata + ' % din țintă</span></div>'
      + '<div class="scTinta"><span class="scSub">Netul față de țintă</span><div class="scBara"><i style="width:' + pNet + '%"></i></div><span class="scSub">' + esc(Um(s.net)) + ' din ' + esc(Um(ob.net)) + '</span></div></div>'
      + '<div class="scInainte">' + inTxt + '</div>' + form + '</div>';
  }
  function htmlAstept(eroare, piata) { var P = PIETE[piataDin(piata)]; return '<div class="scCard" style="--sc-c:var(--muted)"><div class="scCap"><h4>🏁 Scorul tău pe ' + esc(P.nume) + '</h4><span class="acSub">' + (eroare ? esc(eroare) : P.nume === "Pionex" ? "aduc boții închiși din Pionex…" : "citesc istoricul Trading 212…") + '</span></div></div>'; }

  return { calc: calc, html: html, htmlAstept: htmlAstept, sezoane: sezoane, htmlIstoric: htmlIstoric, alerte: alerte, normalizeaza: normalizeaza, valideazaObiectiv: valideazaObiectiv, startulZilei: startulZilei, dataRo: dataRo, dataIso: dataIso,
    OBIECTIV_IMPLICIT: OBIECTIV_IMPLICIT, SEZON_IMPLICIT: SEZON_IMPLICIT, MIN: MIN, PIETE: PIETE };
})();
