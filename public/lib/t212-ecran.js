// Ecranul Trading 212 (v85): cardul "Contul meu Trading 212" din US Stocks si jurnalul de actiuni din
// Jurnal de trade (filtrul Crypto / Actiuni / Tot). Doar CITIRE: cheia T212 e doar de citire si sta acasa.
// Foloseste din app.js: $, getJSON, apiFetch, escapeHtml, toast; din lib: GridCalcul, T212, ActiuniSemnale.
// Calculele stau in lib (probate in scripts/t212-v85.mjs si scripts/actiuni-v85.mjs); aici doar se arata.
// v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
function t212Cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
var t212 = { profil: {}, sfaturiIst: null, anDecl: null, idei: null, stiri: {}, piata: null, dividende: null, rezultate: {}, niveluri: {}, simbolPret: {}, cont: null, poz: null, istoric: null, istoricEroare: null, bare: {}, planuri: {}, beta: {}, la: 0, inLucru: false, eroare: null, poarta: null };
var T212_NIVEL = { tine: ["ȚINE", "t212Pill-tine"], atentie: ["ATENȚIE", "t212Pill-atentie"], iesi: ["IEȘI", "t212Pill-iesi"], "fara-date": ["FĂRĂ DATE", "t212Pill-fara"] };
var T212_POARTA = { cumpara: ["🟢 CUMPĂR", "good"], asteapta: ["🟡 AȘTEAPTĂ", "tbWarn"], nu: ["🔴 NU ACUM", "bad"], "fara-date": ["⚪ FĂRĂ DATE", ""] };

function t212Lei(v, z) { if (v === null || v === undefined || !isFinite(v)) return "—"; return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toLocaleString("ro-RO", { minimumFractionDigits: z === undefined ? 0 : z, maximumFractionDigits: z === undefined ? 0 : z }) + " lei"; }
function t212Suma(v) { return v === null || v === undefined || !isFinite(v) ? "—" : Math.round(v).toLocaleString("ro-RO") + " lei"; }
function t212Pct(v) { return v === null || v === undefined || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; }
// v100.40 (audit 30.09): „$26.087” se citea ca douazeci si sase de mii (pe acelasi ecran punctul inseamna mii: „28.940 lei”) -> 2 zecimale de la $10
function t212Usd(v) { return ActiuniSemnale.usd(v); }   // v100.69: o singura forma pentru pretul unei actiuni (pagina, Consilierul, alertele)
function t212ZiScurta(iso) { var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "." + m[2] : "—"; }
function t212Cls(v) { return v === null || v === undefined || !isFinite(v) ? "" : v >= 0 ? "good" : "bad"; }
function t212Nr(v) { var x = Number(String(v === null || v === undefined ? "" : v).replace(",", ".").trim()); return String(v || "").trim() && isFinite(x) && x > 0 ? x : null; }
function t212Eroare(e) { var m = e && e.message || String(e); return /503|PUNE-CHEILE|Lipsesc T212/.test(m) ? "Lipsesc cheile Trading 212 pe serverul de acasă: pornește PUNE-CHEILE-T212.bat, apoi repornește Radarul." : /401|AUTH/.test(m) ? "Serverul a cerut parola aplicației (Setări)." : m; }

async function t212Porneste(forta) {
  if (t212.inLucru) return;
  if (!forta && t212.la && Date.now() - t212.la < 60000) { t212Render(); return; }
  if (forta) t212.ideiRe = null;
  t212.inLucru = true; t212.eroare = null; t212Stare("citesc contul din Trading 212…");
  try {
    t212.cont = await getJSON("/api/t212?action=cont"); t212.contLa = Date.now();
    var p = await getJSON("/api/t212?action=pozitii");
    t212.poz = (p && Array.isArray(p.pozitii) ? p.pozitii : []).filter(function (x) { return x && x.quantity > 0; });
    t212.cititBine = Date.now();
  } catch (e) { t212.eroare = t212Eroare(e); }
  try { t212.istoric = await getJSON("/api/t212?action=istoric"); t212.istoricEroare = null; } catch (e) { t212.istoric = null; t212.istoricEroare = t212Eroare(e); }
  try { var cf = await getJSON("/api/t212?action=cf"); t212.cf = cf && cf.cf || {}; } catch (e) { t212.cf = null; }
  try { var bn = await getJSON("/api/curs-bnr?an=" + new Date().getFullYear()), zl = bn && bn.curs ? Object.keys(bn.curs).sort() : []; t212.bnr = zl.length ? { zi: zl[zl.length - 1], curs: bn.curs[zl[zl.length - 1]] } : null; } catch (e) { t212.bnr = null; }
  try { var pz = await getJSON("/api/stiri?action=piata"); t212.piata = t212PiataDin(pz); t212.fg = pz && pz.fg || null; } catch (e) { t212.piata = null; }
  try { t212.idei = await getJSON("/api/t212?action=idei"); } catch (e) { t212.idei = null; }
  t212IdeiIncaAcum();
  try { var sfi = await getJSON("/api/t212?action=sfaturi"); t212.sfaturiIst = sfi && sfi.sfaturi || []; } catch (e) { t212.sfaturiIst = null; }
  await t212AduDividende();
  t212JurnalCache.n = -1;
  t212.la = Date.now(); t212Render();
  if (!t212.eroare && t212.poz) {
    for (var i = 0; i < t212.poz.length; i++) {
      var tk = t212.poz[i].ticker;
      if (!t212.stiri[tk]) { try { var sn = await getJSON("/api/stiri?action=actiune&ticker=" + encodeURIComponent(tk)); t212.stiri[tk] = sn && sn.stiri || []; } catch (e) { t212.stiri[tk] = []; } }
      await t212RezultatePt(tk);   /* v100.196 (🟡6): o eroare nu se mai ține minte ca „fără dată” pentru totdeauna */
      try { var pl = await getJSON("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + tk)); t212.planuri[tk] = pl && pl.plan || null; } catch (e) { t212.planuri[tk] = t212.planuri[tk] || null; }
      if (!t212.bare[tk] || forta) { try { var nm = t212Nume(tk), b = await getJSON("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk) + (nm ? "&nume=" + encodeURIComponent(nm) : "")); t212.simbolPret[tk] = b && b.simbol || null; t212.dupaNume = t212.dupaNume || {}; t212.dupaNume[tk] = !!(b && b.gasitDupaNume); t212.bare[tk] = GridCalcul.bareBursa(b && b.randuri || [], Date.now()); } catch (e) { t212.bare[tk] = []; } }
      t212Render();
    }
    if (!t212.monede && t212.poz.some(function (x) { return !/_US_EQ$/.test(x.ticker); })) { try { var mo = await getJSON("/api/t212?action=monede"); t212.monede = mo && mo.monede || null; } catch (e) { t212.monede = null; } }   /* v100.196 (🟡13): moneda pozițiilor din afara SUA */
    if (!t212.bare.QQQ_US_EQ || forta) { try { var q = await getJSON("/api/t212?action=preturi&interval=1d&ticker=QQQ_US_EQ"); t212.bare.QQQ_US_EQ = GridCalcul.bareBursa(q && q.randuri || [], Date.now()); } catch (e) { t212.bare.QQQ_US_EQ = []; } }
    t212.poz.forEach(function (x) { t212.beta[x.ticker] = ActiuniSemnale.beta(t212.bare[x.ticker], t212.bare.QQQ_US_EQ); });
  }
  t212.inLucru = false; t212Render();
  t212IdeiRejudeca();
  if (typeof jtRenderActiuni === "function") jtRenderActiuni();
}
// v100.231: filtrul imediat, pe regimul deja adus (lipsește ⇒ nu se inventează un blocaj)
function t212IdeiIncaAcum() {
  var id = t212.idei && t212.idei.idei;
  if (!id || typeof Idei === "undefined" || !Idei.ideiInca) return;
  var nou = Idei.ideiInca(id, { regim: t212.regimPiata ? t212RegimPt() : null, acum: Date.now() });
  id.actiuni = nou.actiuni; id.restul = nou.restul; id.trecute = nou.trecute;
}
// v100.231: la deschiderea T212, lista de la 8 se rejudecă la poarta vie. Fără listă se întoarce înainte de orice așteptare.
// Bare goale scot numele. O excepție de rețea îl păstrează. Lista nu se scrie înapoi în KV.
async function t212IdeiRejudeca() {
  if (t212.ideiRe) return;
  var id = t212.idei && t212.idei.idei;
  if (!id || typeof Idei === "undefined" || !Idei.judecaActiune) return;
  t212.ideiRe = "in";
  try {
    await t212RegimAdu();
    var rp = t212RegimPt();
    if (Idei.ideiInca) {
      var nou = Idei.ideiInca(id, { regim: rp, acum: Date.now() });
      id.actiuni = nou.actiuni; id.restul = nou.restul; id.trecute = nou.trecute;
      t212IdeiRender();
    }
    var toate = (id.actiuni || []).concat(id.restul || []), ramase = [];
    for (var i = 0; i < toate.length; i++) {
      var x = toate[i], tk = x.ticker || ((x.simbol || "") + "_US_EQ"), tine = true;
      try {
        var b = await getJSON("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk));
        var randuri = b && b.randuri || [];
        var bare = GridCalcul.bareBursa(randuri, Date.now());
        var pret = GridCalcul.pretCurent(randuri);
        if (!bare || !bare.length || !(pret > 0)) tine = false;
        else {
          var rez = await t212RezultatePt(tk);
          var r = Idei.judecaActiune(bare, pret, { acum: Date.now(), rezultate: rez.data, rezultateStiut: rez.stiut, simbol: tk, regim: rp });
          tine = !!r.trece;
          if (tine) {
            var st = ActiuniSemnale.stare(bare, pret), niv = ActiuniSemnale.niveluri(bare, pret, {});
            var cc = t212.cont && t212.cont.cash;
            if (cc && cc.total > 0 && niv.nivel === "ok" && niv.intrare && niv.stop > 0) {
              var dejaId = t212DejaLei(tk);
              if (dejaId === null) tine = false;
              else {
                var liber = cc.free !== null && cc.free !== undefined && isFinite(Number(cc.free)) ? Number(cc.free) : null;
                var mCash = ActiuniSemnale.marime({ intrare: niv.intrare.pret, stop: niv.stop, cont: cc.total, fx: t212Fx(), riscPct: ActiuniSemnale.regimPoarta(rp).riscPct, deja: dejaId, liber: liber, pretAcum: st.pret });
                if (mCash && (mCash.blocat || mCash.pesteLiber || mCash.plin)) tine = false;
              }
            }
          }
        }
      } catch (e) { tine = true; }
      if (tine) ramase.push(x);
    }
    ramase = ramase.slice(0, 45);
    id.actiuni = ramase.slice(0, 5); id.restul = ramase.slice(5); id.trecute = ramase.length;
    t212IdeiRender();
  } finally { t212.ideiRe = "gata"; }
}
// v86: Trading 212 are PAGINA LUI (ca Tabloul botului): fara bara de cautare, blocul "AAPL" si filele de
// deasupra - "fa la fel toata pagina" (25.09). Merge din orice mod, Crypto sau US Stocks.
function deschideT212() {
  navTo("t212", true);
  if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
}
function t212Nume(tk) {
  var u = t212.istoric && t212.istoric.umpleri || [];
  for (var i = u.length - 1; i >= 0; i--) if (u[i].ticker === tk && u[i].nume && u[i].nume !== tk) return u[i].nume;
  return "";
}
function t212Stare(t) { var e = $("t212Stare"); if (e) e.textContent = t; }

// Pozitia, gata de judecat: pretul mediu si pretul de acum sunt in dolari (moneda actiunii)
function t212Pozitie(x) {
  var tk = x.ticker, b = t212.bare[tk] || [], de = Date.parse(x.initialFillDate || ""), mx = ActiuniSemnale.maxDupaCumparare(b, de, x.currentPrice);   // v100.40
  return { ticker: tk, simbol: T212.simbol(tk), qty: x.quantity, pretMediu: x.averagePrice, pret: x.currentPrice, ppl: x.ppl, plan: t212.planuri[tk] || null, maxDupaCumparare: mx, de: de };
}

// ---------------- preturile calculate (v85.2): stop, tinta, intrare, marime ----------------
// Dolari pe leu, din cea mai noua umplere pe o actiune americana (T212 da fxRate in walletImpact)
// v100.173 (auditul Opus): cursul BNR de azi întâi (1 / lei pe dolar); ultima umplere americană din T212 doar ca rezervă (poate fi veche de luni)
function t212Fx() {
  if (t212.bnr && t212.bnr.curs > 0) return 1 / t212.bnr.curs;
  var u = t212.istoric && t212.istoric.umpleri || [];
  for (var i = u.length - 1; i >= 0; i--) if (/_US_EQ$/.test(u[i].ticker) && u[i].fx > 0) return u[i].fx;
  return null;
}
// v100.196 (auditul sever 14.10, 🔴2 / 🟡6): data rezultatelor pentru Poartă și poziții - un răspuns reușit se ține minte (și „fără dată”: ruta îl
// ține 12 h); o EROARE nu (înainte rămânea { data: null } pentru totdeauna, nici „Reîncarcă” nu mai întreba). stiut = Nasdaq a răspuns
async function t212RezultatePt(tk) {
  var r = t212.rezultate[tk];
  if (!r) { try { r = await getJSON("/api/t212?action=rezultate&ticker=" + encodeURIComponent(tk)); if (r) t212.rezultate[tk] = r; } catch (e) { return { data: null, stiut: false }; } }
  return { data: r && r.data || null, stiut: !!r };
}
// v100.196 (🟡13): valoarea în LEI a fiecărei poziții, pe moneda EI - înainte ponderile adunau bucăți × preț în dolari, euro și pence la un loc.
// Acțiunile americane: bucăți × preț ÷ cursul (t212Fx); celelalte: costul FIFO în lei + rezultatul din T212 (în lei); fără cost știut ⇒ null
function t212ValoriLei(poz) {
  var fx = t212Fx(), out = {};
  (poz || []).forEach(function (x) {
    var tk = x && x.ticker; if (!tk) return;
    if (/_US_EQ$/.test(tk) && fx > 0 && x.quantity > 0 && x.currentPrice > 0) { out[tk] = x.quantity * x.currentPrice / fx; return; }
    var c = t212CostLei(tk, x.quantity); out[tk] = c !== null && isFinite(Number(x.ppl)) ? c + Number(x.ppl) : null;
  });
  return out;
}
// v100.254: 0 fără poziție; null când poziția există dar valoarea în lei nu e știută (marime() ar lua null drept 0)
function t212DejaLei(tk) { var x = (t212.poz || []).filter(function (p) { return p && p.ticker === tk && p.quantity > 0; })[0]; if (!x) return 0; var v = t212ValoriLei([x])[tk]; return v > 0 ? v : null; }
// v100.196 (🟡13): prețul unei poziții în moneda ei ($ la SUA; €, £ sau „p” = pence din metadatele T212); fără monedă știută, fără semn
function t212PretIn(v, tk) {
  var s = t212Usd(v), m = /_US_EQ$/.test(tk || "") ? "USD" : t212.monede && t212.monede[tk];
  if (s === "—" || m === "USD") return s;
  return m === "EUR" ? "€" + s.slice(1) : m === "GBP" ? "£" + s.slice(1) : m === "GBX" ? s.slice(1) + " p" : s.slice(1);
}
// v100.196 (🟡3, regime-detection: răspunsul fixat dinainte): regimul pieței pentru Poartă - regimul macro ȚINUT de colector (KV piata; contează
// doar cel mult 2 h vechime) și Market Breadth SUA (aceeași sursă ca Piața azi; dacă Piața azi l-a adus deja, nu se mai cere). O dată la 10 minute
function t212MacroDin(p, btc) {
  if (typeof Macro === "undefined" || !Macro.scor || !p) return null;
  var sc; try { sc = Macro.scor({ vix: p.vix, tnx: p.tnx, dxy: p.dxy, spy: p.spy, btc: btc, fg: p.fg }, Date.now()); } catch (e) { return null; }
  if (!sc || sc.partial || !sc.treapta || !sc.treapta.cod || sc.treapta.cod === "partial") return null;
  return String(sc.treapta.cod);
}
async function t212RegimAdu() {
  var ac = typeof acasa !== "undefined" && acasa && acasa.d ? acasa.d : null;
  var semn = typeof acasa !== "undefined" && acasa && acasa.la ? acasa.la : 0;
  // v100.226: pe T212 se recitește KV la fiecare poartă. v100.227: copia paginii ține cât ACASA_MS.
  // v100.228: fiecare apăsare cere KV. Copia paginii e doar rezerva, când cererea nu dă un cod și pagina e încă în ACASA_MS.
  var peAzi = typeof acasaPe === "function" && acasaPe();
  var fereastra = typeof ACASA_MS === "number" && ACASA_MS > 0 ? ACASA_MS : 5 * 60000;
  var paginaProaspata = !!(peAzi && semn && Date.now() - semn < fereastra);
  var macro = null, la = null, mb = null, viu = false;
  var pc = null;
  try { pc = await getJSON("/api/istoric-bot?action=piata"); } catch (e) {}
  // v100.232: cererea fără cod e citire picată. Copia paginii rămâne rezerva, dar nu se dă drept citire nouă din KV.
  var dinKv = !!(pc && pc.macro && pc.macro.cod);
  if (!(pc && pc.macro && pc.macro.cod) && paginaProaspata && ac && ac.piataCol && ac.piataCol.macro) pc = ac.piataCol;
  var dinPagina = !dinKv && !!(pc && pc.macro && pc.macro.cod);
  if (pc && pc.macro && pc.macro.cod) { macro = String(pc.macro.cod); la = Number(pc.la || (pc.macro && pc.macro.la)) || null; }
  // v100.224: KV proaspăt (≤ 2 h) rămâne codul ținut. KV vechi sau fără oră + citire completă de pe pagină ⇒ codul de acum, fără scriere în KV.
  var tinut = macro && la && Date.now() - la <= 2 * 3600000;
  if (!tinut) {
    var cod = t212MacroDin(ac && ac.piata, ac && ac.btc1d);
    if (!cod) {
      try {
        var pp = await getJSON("/api/stiri?action=piata");
        var kk = await getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=1D&limit=60");
        cod = t212MacroDin(pp, kk && kk.data && kk.data.klines);
      } catch (e2) {}
    }
    if (cod) { macro = cod; la = Date.now(); viu = true; dinPagina = false; }
  }
  try {
    var j = ac && ac.mbUs ? ac.mbUs : null;
    if (!j && typeof LatimeUS !== "undefined" && typeof fetch === "function") j = await fetch(LatimeUS.SURSA, { cache: "no-store" }).then(function (x) { return x.ok ? x.json() : null; });
    var n = j && typeof LatimeUS !== "undefined" ? LatimeUS.normalizeaza(j, Date.now()) : null; if (n) mb = { stare: n.stare, vechi: !!n.vechi, stanta: n.stanta };
  } catch (e) {}
  t212.regimPiata = { adus: Date.now(), acasaLa: semn, macro: macro, la: la, mb: mb, viu: viu, citirePicata: !dinKv, rezerva: !!dinPagina };
  return t212.regimPiata;
}
function t212RegimPt() { var r = t212.regimPiata || {}, ok = r.macro && r.la && Date.now() - r.la <= 2 * 3600000; return { macro: ok ? r.macro : null, mb: r.mb || null, viu: !!(ok && r.viu) }; }
// v100.196 (🟡7): Trend 12 luni e în probă ⇒ Poarta dă verdictul, dar nu dă o sumă până nu zice bilanțul robotului „probat”
// v100.196 (🟡12): mărimea pentru alte ecrane (Scan) cu ACEEAȘI regulă ca Poarta: riscul regimului ținut (dacă e adus), plafonul pe total cu ce ai deja,
// banii liberi; null fără cont sau curs
function t212MarimeCalc(tk, intrare, stop, pretAcum) {
  var c = t212.cont && t212.cont.cash, rg = t212.regimPiata ? ActiuniSemnale.regimPoarta(t212RegimPt()) : null;
  if (rg && rg.cod === "blocat") return { blocat: true, motiv: rg.motiv };   /* v100.200: ca Poarta - regimul blocat nu dă nicio sumă (riscPct 0 cădea pe 1 %) */
  var deja = t212DejaLei(tk);
  if (deja === null) return { dejaNecunoscut: true };   /* v100.254: valoarea în lei lipsește — nu chem marime(), care ar lua null drept 0 */
  return ActiuniSemnale.marime({ intrare: intrare, stop: stop, cont: c && c.total, fx: t212Fx(), riscPct: rg ? rg.riscPct : 0.01, deja: deja, liber: c && c.free !== null && c.free !== undefined && isFinite(Number(c.free)) ? Number(c.free) : null, pretAcum: pretAcum });   /* v100.222: risc 0 rămâne 0 */
}
function t212FrazaCitire() {
  var r = t212.regimPiata;
  if (!r || !r.citirePicata) return "";
  return r.rezerva ? "Citirea din KV a picat: pe poartă e copia de pe Piața azi, nu o citire nouă." : "Citirea din KV a picat.";
}
function t212FaraMarime(p) { return p && p.sursa && p.sursa.k === "trend12" && !p.sursa.probat ? "trend12" : null; }
// riscul la stop din cont, cu o zecimală fără „,0” (1% · 0,5% · 0,7%)
function t212PctRisc(x) { return !isFinite(x) ? "—" : String(Math.round(x * 1000) / 10).replace(".", ",") + "%"; }
// rândul „Cât cumperi” (Poartă și planul tău): suma, riscul REAL, plafonul pe total cu ce ai deja, riscul pe toată poziția, banii liberi
function t212CatText(m, simbol) {
  return "≈ " + t212Suma(m.suma) + " · la stop pierzi ~" + t212Suma(m.risc) + " (" + t212PctRisc(m.riscPctReal) + " din cont)"
    + (m.plin ? " · ai deja 20% din cont în " + simbol + ": nimic în plus" : m.plafonat ? (m.deja > 0 ? " · tăiat ca, împreună cu ce ai deja (" + t212Suma(m.deja) + "), să fie 20% din cont" : " · tăiat la 20% din cont") : "")
    + (m.riscTotal > 0 ? " · cu ce ai deja în " + simbol + ", la același stop ~" + t212Suma(m.riscTotal) + " (" + t212PctRisc(m.riscTotalPct) + " din cont)" : "")
    + (m.pesteLiber ? " · ai doar " + t212Suma(m.liber) + " liberi" : "");
}
function t212RaportCont() {
  if (t212.raportCont) return t212.raportCont;
  return typeof ciStare !== "undefined" && ciStare.raport ? ciStare.raport : null;
}
function t212CitireVeche() {
  var limita = 30 * 60000, bun = t212.cititBine;
  if (bun && Date.now() - bun < limita) return false;
  if (!bun && !t212.eroare) return false;
  return true;
}
function t212FaraSuma(p) {
  var wouldSize = p && p.v && p.v.nivel === "cumpara" && p.v.riscPct !== 0 && !t212FaraMarime(p);
  if (wouldSize && p.deja === null) return "deja";   /* înainte de t212MarimePoarta: ea întoarce null la deja null */
  if (!t212MarimePoarta(p)) return null;
  var r = t212RaportCont();
  if (!r || !r.reconciliere || !r.reconciliere.t212) return "raport";
  if (Array.isArray(r.reconciliere.t212.abateri) && r.reconciliere.t212.abateri.length) return "reconciliere";
  if (t212CitireVeche()) return "necitit";
  return null;
}
function t212NotaRec(p) {
  var r = t212RaportCont();
  if (!r) return " · n-am o reconciliere";
  if (r.reconciliere && r.reconciliere.t212) return "";
  var la = Number(r.la), min = la > 0 ? Math.max(0, Math.round((Date.now() - la) / 60000)) : null;
  if (min === null) return " · n-am o reconciliere";
  if (min < 1) return " · reconcilierea e de acum";
  return " · reconcilierea e de acum " + t212Cate(min, "minut", "minute");
}
function t212TextFaraSuma(fel) {
  if (fel === "reconciliere") return "N-aș da o sumă: jurnalul nu se potrivește cu cantitatea din cont.";
  if (fel === "necitit") return "N-aș da o sumă: brokerul n-a fost citit de 30 de minute.";
  if (fel === "raport") return "N-aș da o sumă: n-am o reconciliere pe tot contul.";
  if (fel === "deja") return "N-aș da o sumă: nu știu cât ai deja în acțiunea asta.";
  return "";
}
async function t212ContSiCalibrare() {
  try {
    var d = await getJSON("/api/istoric-bot?action=cont");
    var cont = d && d.cont || null;
    if (cont) { t212.raportCont = cont; if (typeof ciStare !== "undefined") { ciStare.raport = cont; ciStare.la = Date.now(); } }
  } catch (e) {}
  if (t212.calibrare && t212.calibrareLa && Date.now() - t212.calibrareLa < 5 * 60000) return;
  try {
    var dv = await getJSON("/api/istoric-bot?action=verdicteCalibrare");
    if (dv && Object.prototype.hasOwnProperty.call(dv, "calibrare")) {
      t212.calibrare = dv.calibrare || null; t212.calibrareLa = Date.now();
      if (t212.calibrare && typeof ciStare !== "undefined") ciStare.verdicte = t212.calibrare;
    }
  } catch (e2) { if (t212.calibrare === undefined) t212.calibrareLa = Date.now(); }
}
function t212LinieCal() {
  if (typeof Macro === "undefined" || typeof Macro.linieCalibrare !== "function" || t212.calibrareLa === undefined && t212.calibrare === undefined) return "";
  if (t212.calibrare === undefined && !t212.calibrareLa) return "";
  return '<p class="tbSub t212Cal">' + escapeHtml(Macro.linieCalibrare(t212.calibrare)) + "</p>";
}
function t212RegimNedovedit() {
  return typeof Macro !== "undefined" && typeof Macro.regimNedovedit === "function" && Macro.regimNedovedit(t212.calibrare);
}
function t212ProbaText(n) {
  var pr = n.proba;
  return "stop la " + String(n.k).replace(".", ",") + "× mișcarea obișnuită pe zi (ATR, media simplă pe 14 zile, $" + t212Usd(n.atr).slice(1) + ")" + (Math.abs(n.d - n.k * n.atr) > 1e-9 ? ", ținut între 3% și 15%" : "")
    + " · probat pe " + t212Cate(pr.n, "zi", "zile") + " din ultimul an" + (pr.nIndep != null ? " (~" + t212Cate(pr.nIndep, "fereastră", "ferestre") + " de 20 de zile care nu se suprapun; stopul e ales cel mai bun pe aceleași zile, deci cifra e optimistă)" : "") + (pr.conditionat ? " cu trendul ca acum" : "") + ": " + Math.round(pr.pePlus * 100) + "% pe plus, " + (pr.medie !== null && Math.abs(pr.medie) < 0.001 ? (pr.medie >= 0 ? "+" : "−") + Math.abs(pr.medie * 100).toFixed(2).replace(".", ",") + "%" : t212Pct(pr.medie)) + " în medie după comision";
}
async function t212PlanSalveaza(tk) {
  var g = function (p) { var e = $(p + tk); return e ? t212Nr(e.value) : null; };
  var plan = { stop: g("t212Stop-"), tinta: g("t212Tinta-"), trailPct: g("t212Trail-") };
  // v100.179 (teza la intrare): de ce ai intrat, ce te-ar face să ieși, orizontul în zile - se țin cu planul și în istoricul tezelor
  var tx = function (p) { var e = $(p + tk); return e ? String(e.value || "").trim() : ""; }; plan.teza = tx("t212Teza-"); plan.invalidare = tx("t212Inv-"); plan.orizont = g("t212Oriz-");
  var gol = plan.stop === null && plan.tinta === null && plan.trailPct === null && !plan.teza && !plan.invalidare && plan.orizont === null;
  try {
    var r = await apiFetch("/api/istoric-bot?action=plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bot: "t212-" + tk, plan: gol ? null : (window.__proba ? Object.assign({ proba: true }, plan) : plan) }) });
    var d = await r.json().catch(function () { return null; });
    if (!r.ok) throw new Error(d && d.error || "HTTP " + r.status);
    t212.planuri[tk] = d && d.plan || null; t212Render();
    toast(gol ? "Planul e șters" : "Planul e salvat; colectorul de acasă te anunță când prețul îl atinge", "good");
  } catch (e) { toast("Planul nu s-a salvat: " + t212Eroare(e), "bad"); }
}

// v85.3: ecranul reasezat dupa demo (25.09) - rezumatul pe un rand, "Ce ai de facut acum" in ordinea
// urgentei, pozitiile intr-un tabel dens (un rand pe actiune, detaliile la clic), poarta + portofoliul alaturi.
// Procentul principal e cel IN LEI, ca in Trading 212 (include cursul dolar/leu: fxPpl); pretul in dolari ramane
// langa el si ramane baza stopurilor (la el se executa ordinul).
var T212_ORDINE = { iesi: 0, atentie: 1, "fara-date": 2, tine: 3 };
t212.deschis = t212.deschis || {};

// Costul in lei al bucatilor deschise, din loturile FIFO ale istoricului (net = cu comisionul de conversie).
// Daca bucatile din istoric nu se potrivesc cu pozitia (istoric incomplet) -> null, nu un procent inventat.
function t212CostLei(tk, qty) {
  var j = t212Jurnal(); if (!j) return null;
  var q = 0, cost = 0;
  j.p.deschise.forEach(function (l) { if (l.ticker === tk) { q += l.qty; cost += l.qty * l.costBuc; } });
  if (!(q > 0) || Math.abs(q - qty) / qty > 0.02) return null;
  return cost * qty / q;
}
// v100.52 (actiunile T212, pachetul 1): profilul actiunii (colectorul, noaptea) si stopul ales pe trade-urile tale (varianta „prof” vs −15%)
function t212ProfilPt(tk) {
  if (!(tk in t212.profil)) { t212.profil[tk] = null; getJSON("/api/istoric-bot?action=profil&simbol=" + encodeURIComponent(tk)).then(function (d) { t212.profil[tk] = d && d.profil || false; if (t212.profil[tk]) t212Render(); }).catch(function () { t212.profil[tk] = false; }); }
  return t212.profil[tk] || null;
}
var t212TrailMemo = { cf: null, n: -1, v: null };
function t212TrailAles() {
  var jj = t212Jurnal(), n = jj ? jj.p.inchise.length : 0;
  if (t212TrailMemo.cf === t212.cf && t212TrailMemo.n === n && t212TrailMemo.v) return t212TrailMemo.v;
  var v = jj && t212.cf ? ActiuniSemnale.alegeTrail(jj.p.inchise, t212.cf) : { cheie: "u15", motiv: "" };
  t212TrailMemo = { cf: t212.cf, n: n, v: v }; return v;
}
// v100.53 (actiunile T212, pachetul 2): probabilitatile pe pozitie (barele zilnice) + calibrarea pe cumpararile tale; memo pe ticker
var t212ProbMemo = {}, t212StareMemo = {}, t212CalMemo = { cf: null, n: -1, v: null };
function t212Calibrare() {
  var jj = t212Jurnal(), n = jj ? jj.p.inchise.length : 0;
  if (t212CalMemo.cf === t212.cf && t212CalMemo.n === n && t212CalMemo.v) return t212CalMemo.v;
  var v = jj && t212.cf && typeof Probabilitati !== "undefined" ? Probabilitati.calibrareActiuni(jj.p.inchise, t212.cf) : {};
  t212CalMemo = { cf: t212.cf, n: n, v: v }; return v;
}
function t212ProbPt(p, b, n) {
  if (!n || typeof Probabilitati === "undefined" || !b || b.length < 120) return null;
  // revizia 01.10 (I1): pretul de acum intra in cheie (distanta pana la stop se schimba cu el); starile zilelor se tin pe ticker|ultima bara
  var tinta = p.plan && p.plan.tinta > 0 ? p.plan.tinta : n.tintaPozitie, ub = b[b.length - 1].t, cheie = p.ticker + "|" + ub + "|" + Math.round(p.pret * 1000) + "|" + Math.round(n.stopPozitie * 100) + "|" + Math.round(tinta * 100);
  var sm = t212StareMemo[p.ticker]; if (!sm || sm.ub !== ub) sm = t212StareMemo[p.ticker] = { ub: ub, m: {} };
  if (!t212ProbMemo[p.ticker] || t212ProbMemo[p.ticker].cheie !== cheie) t212ProbMemo[p.ticker] = { cheie: cheie, v: Probabilitati.pentruActiune(b, { pret: p.pret, stop: n.stopPozitie, tinta: tinta, acum: Date.now(), memo: sm.m }) };
  var r = t212.rezultate[p.ticker], zc = r && r.data ? Math.ceil((Date.parse(r.data + "T12:00:00Z") - Date.now()) / 86400000) : null, pf = t212ProfilPt(p.ticker);
  return Probabilitati.randActiune(t212ProbMemo[p.ticker].v, t212Calibrare(), { rezultateZile: zc !== null && zc >= 0 ? Math.round(zc * 5 / 7) : null, evenimente: pf && pf.evenimente });
}
// v100.54: socoteala Consilierului pe actiuni (KV, de la colector, la 10 min), verdictul colectorului si deciziile pe ticker (la 2 min)
var t212SocActC = { la: 0, v: {}, inLucru: false }, t212ConsKv = {};
function t212SocAct() {
  if (!t212SocActC.inLucru && Date.now() - t212SocActC.la > 10 * 60000) { t212SocActC.inLucru = true; getJSON("/api/istoric-bot?action=socotealaAct").then(function (d) { t212SocActC.v = d && d.peCod || {}; }).catch(function () {}).then(function () { t212SocActC.la = Date.now(); t212SocActC.inLucru = false; }); }
  return t212SocActC.v;
}
function t212ConsKvPt(tk) {
  var c = t212ConsKv[tk] || (t212ConsKv[tk] = { la: 0, cons: null, decizii: [], inLucru: false });
  if (!c.inLucru && Date.now() - c.la > 2 * 60000) {
    c.inLucru = true;
    Promise.all([getJSON("/api/istoric-bot?action=cons&bot=t212-" + encodeURIComponent(tk)).catch(function () { return null; }), getJSON("/api/istoric-bot?action=decizie&bot=t212-" + encodeURIComponent(tk)).catch(function () { return null; })])
      .then(function (r) { var vechi = JSON.stringify([c.cons, c.decizii]); c.cons = r[0] && r[0].cons || null; c.decizii = r[1] && Array.isArray(r[1].decizii) ? r[1].decizii : []; c.la = Date.now(); c.inLucru = false; if (JSON.stringify([c.cons, c.decizii]) !== vechi) t212Render(); });
  }
  return c;
}
function t212DecText(tk, c) {
  var k = Consiliu.cheieDecizie(c), e = (t212ConsKvPt(tk).decizii || []).filter(function (x) { return x.cheie === k; }).pop();
  return e ? "notat: " + (e.urmat ? "am făcut" : "n-am făcut") + " (" + new Date(e.t).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + ")" + (e.r != null ? " · în 5 zile de bursă de la decizie, acțiunea a mers " + (e.r >= 0 ? "+" : "−") + Math.abs(e.r).toFixed(1).replace(".", ",") + (e.fx ? " lei" : " $") + " pe poziție (pe preț, și dacă ai vândut)" : "") : "ai făcut ce zice? notează — după 30 de decizii îți spun cum ți-a mers";
}
async function t212Decizie(tk, da) {
  var p = (t212.pozPregatite || []).filter(function (x) { return x.ticker === tk; })[0], c = p && p.cons; if (!c) return;
  var fx = p.cost > 0 && p.qty > 0 && p.pretMediu > 0 ? p.cost / (p.qty * p.pretMediu) : null;
  var corp = { bot: "t212-" + tk, t: Date.now(), cheie: Consiliu.cheieDecizie(c), nivel: c.nivel, titlu: c.titlu, faCe: c.faCe || "", urmat: da === "da", total: p.pret * p.qty * (fx || 1), pret: p.pret, qty: p.qty, fx: fx };
  try { var r = await apiFetch("/api/istoric-bot?action=decizie", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corp) }); if (!r.ok) throw new Error("HTTP " + r.status);
    var kv = t212ConsKvPt(tk); kv.decizii = (kv.decizii || []).filter(function (e) { return e.cheie !== corp.cheie; }).concat([corp]); var el = $("t212Dec-" + tk); if (el) el.textContent = t212DecText(tk, c);
  } catch (e) { var el2 = $("t212Dec-" + tk); if (el2) el2.textContent = "nu s-a notat (" + e.message + ") — încearcă din nou"; }
}
function t212ConsHtml(p) {
  var c = p.cons, tk = escapeHtml(p.ticker), niv = T212_NIVEL[p.sem.nivel] || T212_NIVEL["fara-date"]; if (!c) return "";
  var kv = t212ConsKvPt(p.ticker), kc = kv.cons, deCe = "";
  if (kc && kc.acum && kc.acum.nivel === c.nivel && kc.deCe && kc.schimbatLa) { var mn = Math.max(1, Math.round((Date.now() - kc.schimbatLa) / 60000)); deCe = "🔁 " + Consiliu.deCeAfisat(kc.deCe, mn); }   /* v100.106 */
  var alta = Consiliu.altaVoce(kc, c), restA = (c.rest || []).filter(function (r) { return r.din !== "sfat"; }), sfN = (p.sfaturi || []).filter(function (f) { return f && f.nivel !== "g"; });
  return '<div class="t212Cons"><h5><span class="t212Pill ' + niv[1] + '">' + escapeHtml(c.eticheta) + '</span> ' + escapeHtml(c.titlu) + '</h5>'
    + (deCe ? '<p class="tbSub">' + escapeHtml(deCe) + '</p>' : '') + (alta ? '<p class="tbSub">📣 ' + escapeHtml(alta) + '</p>' : '')
    + (c.faCe ? '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(c.faCe) + '</p>' : '') + (c.bani ? '<p class="tbSub">💰 ' + escapeHtml(c.bani) + '</p>' : '')
    + (c.motive.length ? '<ul class="t212Motive">' + c.motive.map(function (m) { return '<li>' + escapeHtml(m.titlu) + (m.text ? ' <span class="t212Mic">' + escapeHtml(m.text) + '</span>' : '') + '</li>'; }).join("") + '</ul>' : '')
    + (c.nivel !== "asteapta" ? '<div class="t212Decizii"><button type="button" class="actionGhost t212DecBtn" data-action-click="t212Decizie(\'' + tk + '\',\'da\')" aria-label="Am făcut ce zice Consilierul pentru ' + escapeHtml(p.simbol) + '">✅ am făcut</button><button type="button" class="actionGhost t212DecBtn" data-action-click="t212Decizie(\'' + tk + '\',\'nu\')" aria-label="N-am făcut ce zice Consilierul pentru ' + escapeHtml(p.simbol) + '">✋ n-am făcut</button><span class="tbSub" id="t212Dec-' + tk + '" aria-live="polite">' + escapeHtml(t212DecText(p.ticker, c)) + '</span></div>' : '')
    + (restA.length || sfN.length ? '<details class="t212Rest"><summary>Restul (' + (restA.length + sfN.length) + ') — tot ce mai văd, pliat</summary>' + (restA.length ? '<ul class="t212Motive">' + restA.map(function (r) { return '<li>' + escapeHtml(r.titlu) + (r.text ? ' <span class="t212Mic">' + escapeHtml(r.text) + '</span>' : '') + '</li>'; }).join("") + '</ul>' : '') + t212SfaturiHtml(sfN) + '</details>' : '')
    + (Consiliu.LEGENDA_ACTIUNI ? '<p class="tbSub tbConsLeg">' + escapeHtml(Consiliu.LEGENDA_ACTIUNI) + '</p>' : '')   // v100.69: avertizarile comune, o data (ca pe Tablou)
    + '</div>';
}
function t212PregatesteP(x, pond) {
  // v100.267 (auditul 29.10): pence față de lire (×100) la Londra - barele Yahoo trec în unitatea prețului T212 ÎNAINTE de stop și semafor;
  // se scriu înapoi în t212.bare, de unde le citesc și maximul de după cumpărare, graficul și rețeaua; factorul stă pe ele (nota rămâne la fiecare desen)
  var un = ActiuniSemnale.unitateBare(t212.bare[x.ticker], x.currentPrice); if (un.factor !== 1) { t212.bare[x.ticker] = un.bare; un.bare.unitateT212 = un.factor; }
  var p = t212Pozitie(x), b = t212.bare[p.ticker] || [];
  p.unitate = b.unitateT212 || null;
  p.st = ActiuniSemnale.stare(b, p.pret); p.sem = ActiuniSemnale.semafor(p, p.st);
  // v88: stopul care urca pentru pozitii e cel putin -15% de la maxim (proba pe trade-urile lui, "Cat te-ar fi salvat stopul")
  // v100.52: sau coborarea obisnuita pe 5 zile din profilul actiunii, DOAR daca pe trade-urile tale a iesit cel putin la fel
  var pf = t212ProfilPt(p.ticker), tp = ActiuniSemnale.trailPozitie(t212TrailAles(), pf && typeof ProfilMoneda !== "undefined" ? ProfilMoneda.pragStopActiune(pf) : null);
  var n = b.length ? ActiuniSemnale.niveluri(b, p.pret, { pretMediu: p.pretMediu, maxDupaCumparare: p.maxDupaCumparare, minTrail: tp.minTrail, trailProfil: tp.trailProfil, sursaTrail: tp.sursaTrail }) : null;
  p.niv = n && n.nivel === "ok" ? n : null; if (p.niv) t212.niveluri[p.ticker] = p.niv;
  p.nivMotiv = n && n.nivel !== "ok" ? n.motiv : null;
  p.prob = t212ProbPt(p, b, p.niv);   // v100.53
  try { p.revine = t212RevinePt(p, b, p.niv); } catch (e) { p.revine = null; }
  p.cost = t212CostLei(p.ticker, p.qty); p.pctLei = p.cost ? p.ppl / p.cost : null; p.fxPpl = x.fxPpl;
  p.pond = pond[p.ticker] || null;
  // v89: consilierul - istoricul LUI, cifrele pozitiei, piata, stirile
  var jj = t212Jurnal();
  p.sfaturi = typeof Consilier !== "undefined" ? Consilier.sfaturiPozitie(p, { inchise: jj ? jj.p.inchise : [], piata: t212.piata, stiri: t212.stiri[p.ticker], acum: Date.now() }) : [];
  // v100.54 (actiunile T212, pachetul 3): O SINGURA VOCE - Consilierul pozitiei (aceleasi intrari ca in colector: semaforul, stopul care urca,
  // probabilitatile, sfaturile); pastila, motivele si „ce aș face eu” vin din el (p.semVechi ramane pentru restul paginii)
  p.semVechi = p.sem;
  if (typeof Consiliu !== "undefined" && Consiliu.alcatuiesteActiune) {
    p.cons = Consiliu.alcatuiesteActiune({ sem: p.sem, niv: p.niv, prob: p.prob || [], sfaturi: p.sfaturi, plan: p.plan, pret: p.pret, pretMediu: p.pretMediu, qty: p.qty, costLei: p.cost, pplLei: p.ppl, simbol: p.simbol, socoteala: t212SocAct(), semZi: t212SemZi(p.ticker) });
    p.sem = Consiliu.pentruPozaActiune(p.cons);
  }
  return p;
}
function t212Comuta(tk) { t212.deschis[tk] = !t212.deschis[tk]; var d = $("t212Det-" + tk), r = $("t212R-" + tk); if (d) d.hidden = !t212.deschis[tk]; if (r) r.setAttribute("aria-expanded", String(!!t212.deschis[tk])); if (t212.deschis[tk]) { t212AduTf(tk); t212GraficeDeseneaza(); } }
function t212Deschide(tk) {
  t212.deschis[tk] = true; var d = $("t212Det-" + tk), r = $("t212R-" + tk); if (d) d.hidden = false;
  if (r) { r.setAttribute("aria-expanded", "true"); if (r.scrollIntoView) r.scrollIntoView({ block: "center", behavior: "smooth" }); }
  t212AduTf(tk); t212GraficeDeseneaza();   // revizia 01.10 (I1): „Vezi X” si legatura din Alerte deschid detaliul fara randare - graficul se deseneaza aici
}
// v100.108 (semaforul trendului, demo aprobat): lumânările 5m…4h DOAR pentru poziția deschisă (Twelve Data are 8 cereri pe minut), ținute 5 min;
// 1z vine din barele zilnice pe care pagina le are deja
var t212Tf = {};
async function t212AduTf(tk, reia) {
  var c = t212Tf[tk]; if (c && (c.inLucru || (!reia && Date.now() - c.la < 5 * 60000))) return;
  var deReluat = reia && c ? c.lipsa : null; c = t212Tf[tk] = { la: c ? c.la : 0, pe: c ? c.pe : {}, inLucru: true, lipsa: [], reiaProgramat: false, aDouaOara: false };
  var nm = t212Nume(tk), K = { "5m": "5M", "15m": "15M", "30m": "30M", "1h": "60M", "4h": "4H" }, lista = deReluat || ["5m", "15m", "30m", "1h", "4h"];
  for (var i = 0; i < lista.length; i++) {
    var ok = false;
    try { var b = await getJSON("/api/t212?action=preturi&interval=" + lista[i] + "&ticker=" + encodeURIComponent(tk) + (nm ? "&nume=" + encodeURIComponent(nm) : "")); if (b && Array.isArray(b.randuri) && b.randuri.length) { c.pe[K[lista[i]]] = b.randuri; ok = true; } } catch (e) {}
    if (!ok) c.lipsa.push(lista[i]);
    try { if (t212.deschis[tk]) t212GraficeDeseneaza(); } catch (e) {}   // v100.110 (I-548): becurile pe rând
  }
  if (!reia) c.la = Date.now(); c.inLucru = false;
  // o singură reluare, doar pentru ce lipsește; revizia v100.110 (R1): becul spune „reîncerc” doar cât e chiar programată, apoi „nici la a doua cerere”
  if (c.lipsa.length && !reia) { c.reiaProgramat = true; setTimeout(function () { t212AduTf(tk, true); }, 30000); }
  else if (c.lipsa.length) c.aDouaOara = true;
  try { if (t212.deschis[tk]) t212GraficeDeseneaza(); } catch (e) {}
}
function t212Reincerc(tk) { var c = t212Tf[tk]; return !!(c && c.reiaProgramat); }
function t212ADouaOara(tk) { var c = t212Tf[tk]; return !!(c && c.aDouaOara); }
function t212SeAduc(tk) { var c = t212Tf[tk]; return !c || !!c.inLucru; }
// revizia v100.108 (R5): bursa americană e deschisă acum? (luni–vineri 9:30–16:00 la New York, ca GridCalcul.bareBursa; fără sărbători)
function t212SedintaDeschisa(acum) {
  /* v100.196 (auditul sever, 🔵9): cu calendarul bursei (sărbătorile NYSE), când e încărcat; altfel ca înainte */
  if (typeof CalendarBursa !== "undefined" && CalendarBursa.stare) { try { return !!CalendarBursa.stare(acum, "SPY").deschisa; } catch (e) {} }
  try {
    var o = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(acum)).forEach(function (x) { o[x.type] = x.value; });
    var min = Number(o.hour) * 60 + Number(o.minute); return ["Sat", "Sun"].indexOf(o.weekday) < 0 && min >= 570 && min < 960;
  } catch (e) { return null; }
}
function t212ZiRanduri(tk) { return (t212.bare[tk] || []).map(function (x) { return { time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: x.v }; }); }
function t212PeTf(tk) { var c = t212Tf[tk], pe = Object.assign({}, c && c.pe || {}), z = t212ZiRanduri(tk); if (z.length) pe["1D"] = z; return pe; }
// trendul zilnic după regula semaforului (bare închise) - Consilierul spune diferența când mediile lui zic altceva (AVGO, 06.10)
function t212SemZi(tk) { return /_US_EQ$/.test(tk) && typeof GraficBot !== "undefined" && GraficBot.semZi ? GraficBot.semZi(t212.bare[tk], "long") : null; }   /* revizia: doar listările din SUA */   /* v100.110: regula comună cu colectorul */
function t212TfCitHtml(sem) {
  if (!Array.isArray(sem) || !sem.length) return "";
  var IC = { bine: "✓", atentie: "!", rau: "✕", info: "·" };
  return '<div class="tbCitTf"><p class="tbEt2">Trendul pe TF-uri · culoarea = față de poziția ta (doar long): verde urcă, galben lateral, roșu coboară</p>' + sem.map(function (s) {
    var st = s.ton === "bine" ? "bine" : s.ton === "rau" ? "rau" : s.ton === "atentie" ? "atentie" : "info";
    return '<div class="tbCitR ' + st + '"><span class="tbCitIc" aria-hidden="true">' + IC[st] + '</span><div><b>' + escapeHtml(s.et) + ':</b> <span class="tbCitTx">' + escapeHtml(s.text) + '</span></div></div>';
  }).join("") + '</div>';
}

function t212Render() {
  var sus = $("t212Sus"), box = $("t212Continut"), pfBox = $("t212Pf"); if (!box) return;
  if (typeof reteaAdu === "function") reteaAdu(function () { t212Render(); });   /* v100.94 (L2): modelele 🧠/🌳 din KV pentru poziții și poartă (o dată la 30 de minute) */
  if (t212.inLucru && !t212.cont) { t212Stare("citesc contul din Trading 212…"); return; }
  if (t212.eroare) { if (sus) sus.innerHTML = ""; box.innerHTML = '<p class="bad t212Gol">' + escapeHtml(t212.eroare) + '</p>'; t212Stare("n-am putut citi contul"); return; }
  if (!t212.cont) { box.innerHTML = '<div class="emptyState">Apasă „Reîncarcă”.</div>'; return; }
  var c = t212.cont.cash || {}, j = t212Jurnal();
  t212Stare((t212.inLucru ? "aduc prețurile… · " : "") + "citit la " + new Date(t212.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + " · doar citire");
  // portofoliul intai: ponderile intra in tabel si in "ce ai de facut"
  // v100.196 (auditul sever, 🟡13): valoarea fiecărei poziții în lei, pe moneda ei (înainte: bucăți × preț adunate în $, € și pence)
  var brute = t212.poz || [], vLei = t212ValoriLei(brute);
  var pf = ActiuniSemnale.portofoliu(brute.map(function (x) { return { simbol: T212.simbol(x.ticker), ticker: x.ticker, valoare: vLei[x.ticker] > 0 ? vLei[x.ticker] : 0, beta: t212.beta[x.ticker] }; }), c.free), pond = {};
  pf.pozitii.forEach(function (r, i) { pond[r.simbol] = r.pondere; });
  brute.forEach(function (x) { pond[x.ticker] = pond[T212.simbol(x.ticker)]; });
  var poz = brute.map(function (x) { return t212PregatesteP(x, pond); }).sort(function (a, b) { return (T212_ORDINE[a.sem.nivel] - T212_ORDINE[b.sem.nivel]) || (a.ppl - b.ppl); });
  t212.pozPregatite = poz;   // v100.54: butoanele „am făcut / n-am făcut” găsesc poziția
  // v100.40 (audit 30.09, CRITIC): cate pozitii sunt pe IESI, din DATE (Acasa si banda de cont le citeau din DOM-ul paginii T212 -
  // „nimic roșu” pana deschideai T212). null cat preturile nu sunt aduse pentru toate (semaforul ar fi „fără date”, nu „țin”).
  t212.nrIesi = brute.length && brute.every(function (x) { return t212.bare[x.ticker]; }) ? poz.filter(function (p) { return p.sem.nivel === "iesi"; }).length : brute.length ? null : 0;
  var pe = poz.filter(function (p) { return p.ppl > 0; }).length;

  // 1) rezumatul pe un rand
  var cel = function (et, v, cls, sub) { return '<div class="t212Cel"><span class="t212Et">' + escapeHtml(et) + '</span><b class="t212Val ' + (cls || "") + '">' + escapeHtml(v) + '</b><span class="tbSub">' + sub + '</span></div>'; };
  var h = '<div class="t212Kpi">' + cel("Contul", t212Suma(c.total), "", "liber " + escapeHtml(t212Suma(c.free)) + (pf.cash !== null ? " · " + escapeHtml(t212Pct(pf.cash).replace("+", "")) : ""))
    + cel("Pe pozițiile deschise", t212Lei(c.ppl), t212Cls(c.ppl), t212Cate(poz.length, "poziție", "poziții") + " · " + pe + " pe plus")
    + (j ? cel("Câștigat real, închise", t212Lei(j.r.total), t212Cls(j.r.total), 'vânzările închise, după comisioanele de conversie (' + escapeHtml(t212Lei(-j.r.comisioane).replace(" lei", "")) + ') · T212 arată <span class="t212Muted">' + escapeHtml(t212Lei(c.result).replace(" lei", "")) + '</span> (fără comisioanele de conversie)' + (t212.dividende && t212.dividende.n ? ' · dividendele, separat: ' + escapeHtml(t212Lei(t212.dividende.total, 2).replace(" lei", "")) : ''))   /* v100.40: explicatia spune din ce vine cifra */
      : cel("Rezultat (după T212)", t212Lei(c.result), t212Cls(c.result), escapeHtml(t212.istoricEroare || "fără comisioanele de conversie; istoricul se strânge acasă")))
    + cel("Dacă Nasdaq scade 10%", poz.length ? t212Lei(pf.soc) : "—", poz.length ? "bad" : "", "beta din QQQ, pe fiecare acțiune") + '</div>';

  // 2) ce ai de facut acum, in ordinea urgentei
  var todo = [], fara = poz.filter(function (p) { return p.niv && !p.plan; });
  poz.filter(function (p) { return p.sem.nivel === "iesi"; }).forEach(function (p) {
    todo.push({ c: "r", t: p.simbol + (p.niv && p.niv.stopAtins ? " a coborât sub stopul calculat (" + t212Usd(p.niv.stopPozitie) + ")" : ": " + (p.sem.motive[0] || "de ieșit")), s: t212Lei(p.ppl) + (p.pctLei !== null ? " (" + t212Pct(p.pctLei) + ")" : "") + ". " + p.sem.ceAsFace.replace(/^👉 Ce aș face eu: /, ""), b: '<button type="button" class="t212BtnLinie" data-action-click="t212Deschide(\'' + String(p.ticker).replace(/[^A-Za-z0-9._-]/g, "") + '\')">Vezi ' + escapeHtml(p.simbol) + '</button>' });
  });
  if (fara.length) todo.push({ c: "g", t: (fara.length === poz.length ? (fara.length === 1 ? "Singura poziție e" : "Toate cele " + t212Cate(fara.length, "poziție", "poziții") + " sunt") : t212Cate(fara.length, "poziție", "poziții") + (fara.length === 1 ? " e" : " sunt")) + " fără plan", s: "Stopurile și țintele sunt deja calculate pentru fiecare, iar colectorul te anunță când se ating.", b: '<button type="button" class="t212Btn t212BtnPlin" id="t212PuneToate" data-action-click="t212PuneToate()">Pune planurile la ' + (fara.length === 1 ? "ea" : "toate " + fara.length) + '</button>' });
  poz.filter(function (p) { return p.pond > 0.2; }).forEach(function (p) {
    todo.push({ c: "g", t: p.simbol + " e " + Math.round(p.pond * 100) + "% din cont", s: "Peste plafonul de 20%: o zi proastă a ei e ziua proastă a contului.", b: '<button type="button" class="t212BtnLinie" data-action-click="t212Deschide(\'' + String(p.ticker).replace(/[^A-Za-z0-9._-]/g, "") + '\')">Vezi ' + escapeHtml(p.simbol) + '</button>' });
  });
  var slabe = poz.filter(function (p) { return p.niv && p.niv.proba.medie !== null && p.niv.proba.medie <= 0; }).map(function (p) { return p.simbol; });
  if (slabe.length) todo.push({ c: "n", t: slabe.join(" și ") + ": proba pe istoric e pe minus în starea de acum", s: "Stopul calculat doar limitează pierderea. 👉 N-aș adăuga la " + (slabe.length === 1 ? "ea" : "ele") + ".", b: "" });
  // v87: frana de "cumparat in jos" (ultimele 7 zile) si rezultatele trimestriale in urmatoarele 10 zile
  var jos7 = t212.istoric && Array.isArray(t212.istoric.umpleri) ? ActiuniSemnale.cumparariInJos(t212.istoric.umpleri).filter(function (x) { return Date.now() - x.t < 7 * 86400000; }) : [];
  // v100.116 (revizia, M2): același rând A1 ca pe Discord, din raportul de risc încărcat de pagină (rlStare)
  var a1F = null; try { var rpF = typeof rlStare !== "undefined" && rlStare.raport; a1F = rpF && rpF.actiuni ? (rpF.actiuni.comportament || []).filter(function (y) { return y.k === "A1"; })[0] || null : null; } catch (e) {}
  jos7.slice(-3).reverse().forEach(function (x) { var a = ActiuniSemnale.alertaFrana(x, T212.simbol(x.ticker), a1F); todo.push({ c: a.nivel === "critic" ? "r" : "g", t: a.titlu + " · " + new Date(x.t).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" }), s: a.mesaj, b: "" }); });
  poz.forEach(function (p) {
    var r = t212.rezultate[p.ticker], zile = r && r.data ? Math.ceil((Date.parse(r.data + "T12:00:00Z") - Date.now()) / 86400000) : null;
    if (zile !== null && zile >= 0 && zile <= 10) todo.push({ c: "n", t: p.simbol + " își anunță rezultatele pe " + t212ZiScurta(r.data) + (zile === 0 ? " (azi)" : zile === 1 ? " (mâine)" : " (peste " + t212Cate(zile, "zi", "zile") + ")"), s: "Prețul poate sări 10–20% într-o noapte, în orice direcție. 👉 Aș avea stopul pus înainte și n-aș cumpăra în plus chiar înainte de anunț.", b: '<button type="button" class="t212BtnLinie" data-action-click="t212Deschide(\'' + String(p.ticker).replace(/[^A-Za-z0-9._-]/g, "") + '\')">Vezi ' + escapeHtml(p.simbol) + '</button>' });
  });
  poz.forEach(function (p) {
    (p.sfaturi || []).filter(function (x) { return (x.nivel === "g" && x.tip === "tinut-pe-minus") || x.nivel === "v";   /* v100.108 (revizia, 🔴): după câmp, nu după titlu */ }).forEach(function (x) {
      todo.push({ c: x.nivel === "v" ? "v" : "g", t: x.titlu, s: (x.text ? x.text + " " : "") + (x.ceAsFace ? "👉 " + x.ceAsFace : ""), b: '<button type="button" class="t212BtnLinie" data-action-click="t212Deschide(\'' + String(p.ticker).replace(/[^A-Za-z0-9._-]/g, "") + '\')">Vezi ' + escapeHtml(p.simbol) + '</button>' });
    });
  });
  var RT = { r: 0, g: 1, n: 2, v: 3 }; todo.sort(function (a, b) { return RT[a.c] - RT[b.c]; });
  h += '<section class="t212Todo" aria-label="Ce ai de făcut acum"><div class="t212TodoCap"><h4>Ce ai de făcut acum</h4><span class="tbSub">în ordinea urgenței</span></div>'
    + (todo.length ? todo.map(function (x) { return '<div class="t212TodoRand"><span class="t212Dunga ' + x.c + '"></span><div><b>' + escapeHtml(x.t) + '</b><p>' + escapeHtml(x.s) + '</p></div>' + x.b + '</div>'; }).join("")
      : '<div class="t212TodoRand"><span class="t212Dunga v"></span><div><b>Nimic urgent</b><p>' + (poz.length ? "Toate pozițiile au plan și niciuna n-a atins stopul." : "N-ai poziții deschise.") + '</p></div></div>') + '</section>';
  if (sus) sus.innerHTML = h;

  // 3) pozitiile: un rand pe actiune, detaliile la clic
  if (!poz.length) box.innerHTML = '<p class="tbSub t212Gol">N-ai poziții deschise în Trading 212.</p>';
  else box.innerHTML = '<div class="t212TabWrap"><table class="t212Tab"><thead><tr><th>Acțiune</th><th>Acum</th><th>Rezultat</th><th>Stop calculat</th><th>Țintă</th><th>Trend</th><th>Din cont</th><th>Plan</th></tr></thead><tbody>'
    + poz.map(t212RandPozitie).join("") + '</tbody></table></div>';
  t212GraficeDeseneaza();   // v100.56: graficele detaliilor deschise (latimea reala, dupa randare)

  // 4) portofoliul, in coloana din dreapta
  if (pfBox) {
    var sub = $("t212PfSub"); if (sub) sub.textContent = pf.cash !== null ? "cash " + t212Pct(pf.cash).replace("+", "") : "";
    pfBox.innerHTML = !poz.length ? '<p class="tbSub">—</p>' : pf.pozitii.map(function (r) {
      var w = r.pondere > 0.2 ? " rau" : r.pondere > 0.15 ? " atentie" : "";
      return '<div class="t212Bara"><span>' + escapeHtml(r.simbol) + '</span><div class="t212BaraFond"><div class="t212BaraPlin' + w + '" style="width:' + Math.max(1, Math.min(100, (r.pondere || 0) / 0.3 * 100)).toFixed(1) + '%"></div></div><b>' + Math.round((r.pondere || 0) * 100) + '%</b></div>';
    }).join("") + '<p class="tbSub t212PfNota">Bara plină = 30% din cont. Galben peste 15%, roșu peste 20%.</p><p class="t212Fac">' + escapeHtml(pf.ceAsFace) + '</p>' + (pf.socText ? '<p class="tbSub">' + escapeHtml(pf.socText) + '</p>' : '');
  }
  // v100.12 (ideea 6 „Păstrează ca plan”, din pagina alerts): pozitia ceruta in link se desface o singura data, cu planul completat din
  // preturile calculate (formularul il are deja cand nu exista plan) - el apasa „Salvează planul”; nimic nu se scrie fara el
  if (typeof pozDinLegatura !== "undefined" && pozDinLegatura && !t212.pozCerutaGata && poz.some(function (x) { return x.ticker === pozDinLegatura; })) {
    t212.pozCerutaGata = true; t212Deschide(pozDinLegatura);
    toast("Planul pentru " + pozDinLegatura.replace(/_US_EQ$/, "") + " e completat cu prețurile calculate · apasă „Salvează planul” ca să-l păstrezi", "good");
  }
  t212RenderPoarta();
  t212IdeiRender();
  if (typeof contTotRender === "function") contTotRender();
}
// v100.91 (ideea 1): sub 10 $/acțiune bucățile ies ÎNTREGI („250 buc”) - cu zecimale, „144,118 buc” se citea „144 de mii”; de la 10 $ în sus
// rămân 3 zecimale, ca până acum (biletul și tabelul de revenire folosesc același ajutor)
function t212Bucati(bucati, pret) { var n = Number(bucati) || 0; return (pret < 10 && n >= 1 ? Math.round(n).toLocaleString("ro-RO") : (+n.toFixed(3)).toLocaleString("ro-RO")) + " buc"; }   /* audit 23.10: sub o bucată fracția („0,4 buc”), nu „0 buc” */
// audit 23.10: „Cât cumperi” rotunjea bucățile cu Math.round (1,5 ⇒ 2: +33% risc, peste plafonul de 20%; 0,4 ⇒ 0 cu suma fracționară). La cumpărare bucățile
// merg în JOS (sub 10 $ întregi, de la o bucată; de la 10 $ la 3 zecimale - T212 permite fracții), iar suma, riscul și comisionul se refac din bucățile afișate.
function t212MarimeAfisata(m, pret) {
  var n = m ? Number(m.bucati) || 0 : 0; if (!m || !(n > 0)) return m;
  var f = pret < 10 && n >= 1 ? Math.floor(n) : Math.floor(n * 1000 + 1e-9) / 1000, k = f / n; if (k === 1) return m;
  var r = Object.assign({}, m, { bucati: f, k: k, suma: m.suma * k, risc: m.risc * k, riscPctReal: m.riscPctReal * k, comision: m.comision * k });
  if (m.riscTotal > 0) { r.riscTotal = m.riscTotal - m.risc + r.risc; r.riscTotalPct = m.riscTotalPct - m.riscPctReal + r.riscPctReal; }
  return r;
}
// v100.85 (reveniri, 03.10): acțiunile care au scăzut puternic și acum revin - doar long; istoricul regulii pe față (+ supraviețuitorii) și urmărirea
function t212ReveniriHtml(id) {
  if (!id || typeof Reveniri === "undefined") return "";
  try { return t212ReveniriCorp(id); } catch (e) { return ""; }   /* o eroare în date nu strică panoul ideilor */
}
// v100.200: un rând din „Pe revenire” (celula „Cât cumperi” vine gata făcută: suma sau „nimic azi” la regimul blocat)
function t212RevRand(x, cat) {
  var ist = x.istoric && x.istoric.n ? t212Cate(x.istoric.n, "trade", "trade-uri") + ", " + x.istoric.pePlus + " pe plus, " + t212Lei(x.istoric.total) : "n-ai mai avut-o";
  return '<tr><td data-et="Acțiune"><b>' + escapeHtml(x.simbol) + '</b></td><td data-et="La idee">' + t212Usd(x.pret) + '</td><td class="bad" data-et="Căderea">−' + Math.round(x.cadere * 100) + '%<span class="t212Mic">de la maximul pe 60 de zile</span></td><td class="good" data-et="De la minim">+' + Math.round(x.deLaMin * 100) + '%<span class="t212Mic">' + escapeHtml("minimul acum " + t212Cate(Math.round(x.zileDeLaMin), "zi de bursă", "zile de bursă")) + '</span></td><td class="bad" data-et="Stop">' + t212Usd(x.stop) + '<span class="t212Mic">sub minim</span></td><td class="good" data-et="Țintă">' + t212Usd(x.tinta) + '<span class="t212Mic">maximul</span></td><td data-et="Istoricul tău"><span class="t212Mic' + (x.istoric && x.istoric.total < 0 ? " bad" : "") + '">' + escapeHtml(ist) + '</span></td><td data-et="Cât cumperi">' + cat + '</td></tr>';
}
// v100.254: pe revenire nu se tipăresc bucăți sau lei. Regimul blocat rămâne „nimic azi”, înaintea frânei.
function t212RevFrana(tk) {
  if (t212DejaLei(tk) === null) return "deja";
  var r = t212RaportCont();
  if (!r || !r.reconciliere || !r.reconciliere.t212) return "raport";
  if (Array.isArray(r.reconciliere.t212.abateri) && r.reconciliere.t212.abateri.length) return "reconciliere";
  if (t212CitireVeche()) return "necitit";
  return null;
}
function t212ReveniriCorp(id) {
  var l = Array.isArray(id.reveniri) ? id.reveniri : [];
  // revizia (I1): mărimea pe rând, ca în bilet (1% din cont), pe stopul de sub minim - „Biletul” trece acțiunea prin poarta ideilor (trend în sus), care la o revenire spune NU
  var cont = typeof t212 !== "undefined" && t212.cont && t212.cont.cash && t212.cont.cash.total, AS = typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale : null;
  var h = '<div class="t212Reveniri"><h5>↩️ Pe revenire <span class="t212Estompat">· au scăzut puternic și acum revin (doar long)</span></h5><p class="tbSub">' + escapeHtml(Reveniri.textDovada(id.dovadaReveniri, "actiuni")) + '</p>'
    + (id.dovadaReveniri ? '<p class="tbSub">⚠ ' + escapeHtml(Reveniri.TEXT_SUPRAVIETUITORI) + '</p>' : '');
  if (!Array.isArray(id.reveniri)) h += '<p class="tbSub t212Gol">Lista apare la următoarea tură a ideilor, de la 8:00.</p>';
  else if (!l.length) h += '<p class="tbSub t212Gol">Azi nicio acțiune nu e pe revenire.</p>';
  // v100.196 (raportul UI, 🔴5 / 🟡1): „La idee” = prețul din tura de dimineață (nu cel de acum); fiecare celulă își spune coloana (data-et) pe telefon
  else h += '<div class="t212TabWrap"><table class="t212Tab t212RevTab"><thead><tr><th>Acțiune</th><th>La idee</th><th>Căderea</th><th>De la minim</th><th>Stop</th><th>Țintă</th><th>Istoricul tău</th><th>Cât cumperi · la prețul ideii</th></tr></thead><tbody>'
    + l.map(function (x) {
      /* v100.254: nu tipăresc rezultatul lui marime. Blocajul de regim rămâne „nimic azi”. */
      if (!(cont > 0) || !AS) return t212RevRand(x, '—<span class="t212Mic">citește întâi contul</span>');
      var m = t212MarimeCalc(x.ticker, x.pret, x.stop, null);
      if (m && m.blocat) return t212RevRand(x, '<b class="bad">nimic azi</b><span class="t212Mic">' + escapeHtml(m.motiv) + '</span>');
      var fr = t212RevFrana(x.ticker);
      if (fr) return t212RevRand(x, '<span class="t212Mic">' + escapeHtml(t212TextFaraSuma(fr)) + '</span>');
      return t212RevRand(x, '<span class="t212Mic">poarta ar spune NU</span>');
    }).join("") + '</tbody></table></div><p class="tbSub">Fără „Biletul”: poarta lui cere trend în sus, deci la o revenire ar spune NU. Nu tipăresc bucăți sau lei.</p>';
  if (id.urmarireReveniri && id.urmarireReveniri.text) h += '<p class="tbSub">📏 ' + escapeHtml(id.urmarireReveniri.text) + '</p>';
  return h + '</div>';
}
// v100.82: un rând din tabelul ideilor (primele 5 și, pliate, celelalte) - mutat neschimbat din t212IdeiRender
function t212IdeiRand(x) {
  var ist = x.istoric && x.istoric.n ? t212Cate(x.istoric.n, "trade", "trade-uri") + ", " + x.istoric.pePlus + " pe plus, " + t212Lei(x.istoric.total) : "n-ai mai avut-o";
  return '<tr><td data-et="Acțiune"><b>' + escapeHtml(x.simbol) + '</b><span class="t212Mic">' + escapeHtml((x.motive || [])[2] || "") + '</span></td><td data-et="La idee">' + t212Usd(x.pret) + '</td><td data-et="Intrare">' + t212Usd(x.intrare) + '</td><td class="bad" data-et="Stop">' + t212Usd(x.stop) + '<span class="t212Mic">' + (x.riscPct != null ? "−" + (x.riscPct * 100).toFixed(1).replace(".", ",") + "%, " : "") + 'din probă</span></td><td class="good" data-et="Țintă">' + t212Usd(x.tinta) + '</td><td data-et="Istoricul tău"><span class="t212Mic ' + (x.istoric && x.istoric.total < 0 ? "bad" : "") + '">' + escapeHtml(ist) + '</span>' + (x.prob && x.prob.tinta5 !== null && x.prob.stop1 !== null ? '<span class="t212Mic">🎲 ținta înaintea stopului în 5 zile: ' + Math.round(x.prob.tinta5 * 100) + '% · stopul mâine: ' + Math.round(x.prob.stop1 * 100) + '%</span>' : '')
    // v100.94 (L2): a doua (🧠) și a treia părere (🌳) pe idee - „un trade ca ăsta pe plus”, cifrele colectorului (nedovedită = modelul n-a trecut pragul)
    + (x.retea && x.retea.p != null ? '<span class="t212Mic">🧠 un trade ca ăsta pe plus: ' + Math.round(x.retea.p * 100) + '%' + (x.retea.dovedita ? '' : ' (nedovedită)') + (x.arbori && x.arbori.p != null ? ' · 🌳 ' + Math.round(x.arbori.p * 100) + '%' + (x.arbori.dovedita ? '' : ' (nedovedită)') : '') + '</span>'
      : (x.arbori && x.arbori.p != null ? '<span class="t212Mic">🌳 un trade ca ăsta pe plus: ' + Math.round(x.arbori.p * 100) + '%' + (x.arbori.dovedita ? '' : ' (nedovedită)') + '</span>' : ''))
    // v100.57: profilul actiunii - stopul ideii fata de coborarea obisnuita pe 5 zile + sariturile mari
    + (x.prof && x.prof.dist > 0 ? '<span class="t212Mic' + (x.prof.strans ? ' bad' : '') + '">📐 coborârea obișnuită pe 5 zile −' + (x.prof.dist * 100).toFixed(1).replace(".", ",") + '%' + (x.prof.strans ? ' · stopul ideii e mai strâns: te poate scoate pe o mișcare normală' : ' · stopul e în afara ei') + '</span>' : '')
    + (x.prof && x.prof.sar && x.prof.sar.n ? '<span class="t212Mic">⚡ sărituri mari la deschidere: ' + x.prof.sar.n + ', de obicei ~' + Math.round(x.prof.sar.med * 100) + '%, cea mai mare ' + Math.round(x.prof.sar.max * 100) + '%</span>' : '') + '</td><td><button type="button" class="t212BtnLinie" data-action-click="t212BiletPentru(\'' + String(x.simbol).replace(/[^A-Za-z0-9._-]/g, "") + '\')">Biletul</button></td></tr>';
}
// v90: ideile de cumparare (colectorul, in fiecare dimineata de la 8:00) - un filtru, nu o predictie
function t212IdeiRender() {
  var box = $("t212Idei"); if (!box) return;
  var d = t212.idei, id = d && d.idei, l = id && Array.isArray(id.actiuni) ? id.actiuni : [];
  // v100.196 (raportul UI, 🔴5): coloana „Acum” era prețul din tura de dimineață (închiderea zilei de bursă de dinainte), iar „Biletul” de pe aceeași
  // pagină socotea pe prețul viu (LITE: $987.99 în tabel, $913.61 pe bilet, alt stop) ⇒ antetul spune ce e („La idee”), panoul spune ora turei,
  // iar nota spune că „Biletul” reface intrarea, stopul și suma pe prețul de acum - una singură, consecventă
  var oraT = id && id.la > 0 ? new Date(id.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }) : "";
  var tabel = function (q) { return '<div class="t212TabWrap"><table class="t212Tab t212IdeiTab"><thead><tr><th>Acțiune</th><th>La idee</th><th>Intrare</th><th>Stop</th><th>Țintă</th><th>Istoricul tău</th><th></th></tr></thead><tbody>' + q.map(t212IdeiRand).join("") + '</tbody></table></div>'; };
  var h = '<div class="t212PanouCap"><h4>💡 Idei de cumpărare</h4><span class="tbSub">' + (id ? escapeHtml("din " + t212Cate(id.judecate || 0, "acțiune judecată", "acțiuni judecate") + " pe " + t212ZiScurta(id.zi) + (oraT ? ", la " + oraT : "") + ", " + (id.trecute || 0) + " trec de poartă") : "colectorul le caută în fiecare dimineață de la 8:00") + '</span></div>';
  var fzCit = t212FrazaCitire(); if (fzCit) h += '<p class="tbWarn">⚠️ ' + escapeHtml(fzCit) + '</p>';
  var fIdei = '<p class="tbSub t212IdeiNota">Un filtru care te ține departe de situațiile proaste (trend în jos, după mișcare, lângă maxim, rezultate în 10 zile), nu o predicție: pe trade-urile tale, „doar pe 🟢” a adus mai puțin decât ai făcut singur. ' + escapeHtml(id && id.urmarire ? id.urmarire.text : "Ideile se urmăresc: după ~30 se poate spune dacă merită urmate.") + '</p>';
  if (!l.length) fIdei += '<p class="tbSub t212Gol">' + (id ? "Azi nicio acțiune nu trece de poartă — și asta e un răspuns: n-aș cumpăra nimic nou azi." : "Primele idei apar după prima trecere a colectorului.") + '</p>';
  else fIdei += t212IdeiSit(l) + tabel(l) + '<p class="tbSub">Prețurile sunt cele din tura de dimineață' + (oraT ? ' (' + escapeHtml(oraT) + ')' : '') + ', pe închiderea zilei de bursă de dinainte; „Biletul” le reface pe prețul de acum, cu stopul și suma lui.</p>';
  // v100.82 (03.10, ideea 1): și celelalte care trec de poartă, pliate sub tabel - primele 5 rămân sus
  var rest = id && Array.isArray(id.restul) ? id.restul : [];
  if (l.length && rest.length) fIdei += '<details class="t212IdeiRest"><summary>' + (rest.length === 1 ? "Vezi și cealaltă acțiune care trece de poartă" : "Vezi și celelalte " + t212Cate(rest.length, "acțiune care trece", "acțiuni care trec") + " de poartă") + '</summary>' + tabel(rest) + '</details>';
  var fRev = t212ReveniriHtml(id) || '<p class="tbSub t212Gol">Primele idei apar după prima trecere a colectorului.</p>', fSoc = "";
  // v91: socoteala sfaturilor - au avut dreptate semafoarele? (dupa 5 / 10 / 20 de zile)
  if (t212.sfaturiIst && typeof Consilier !== "undefined") {
    var sc = Consilier.socotealaSfaturi(t212.sfaturiIst), NV = { iesi: "IEȘI", atentie: "ATENȚIE", tine: "ȚINE" };
    var cel = function (x) { return x.n ? x.dreptate + " din " + x.n + ' <span class="t212Mic">' + t212Pct(x.medie) + '</span>' : '<span class="t212Estompat">—</span>'; };
    fSoc = '<div class="t212Socoteala"><h5>📏 Socoteala sfaturilor <span class="t212Estompat">· au avut dreptate? (IEȘI/ATENȚIE: prețul a scăzut după; ȚINE: a crescut)</span></h5>'
      + '<div class="t212TabWrap"><table class="t212Tab t212SocTab"><thead><tr><th>Semaforul</th><th>după 5 zile</th><th>după 10 zile</th><th>după 20 de zile</th></tr></thead><tbody>'
      + Object.keys(NV).map(function (k) { return '<tr><td data-et="Semaforul"><b>' + NV[k] + '</b></td><td data-et="după 5 zile">' + cel(sc[k][5]) + '</td><td data-et="după 10 zile">' + cel(sc[k][10]) + '</td><td data-et="după 20 de zile">' + cel(sc[k][20]) + '</td></tr>'; }).join("")
      + '</tbody></table></div><p class="tbSub">' + escapeHtml(sc.text) + ' Se notează în fiecare dimineață, pe fiecare poziție.</p></div>';
  }
  // v100.92 (I-520): trei file în același panou - numărul în titlu („Idei · 23”), fila aleasă ținută în localStorage; notele rămân la fila lor
  h += t212File([{ k: "idei", t: "Idei", n: id ? l.length + rest.length : null, h: fIdei }, { k: "revenire", t: "Pe revenire", n: id && Array.isArray(id.reveniri) ? id.reveniri.length : null, h: fRev },
    { k: "socoteala", t: "Socoteala sfaturilor", n: null, h: fSoc || '<p class="tbSub t212Gol">Socoteala apare după primele sfaturi notate dimineața.</p>' }], t212FilaAleasa());
  var lista = d && Array.isArray(d.lista) ? d.lista : [];
  h += '<div class="t212Lista"><label for="t212ListaIn" class="tbSub">Urmăresc și (simboluri, despărțite prin virgulă):</label><input id="t212ListaIn" value="' + escapeHtml(lista.join(", ")) + '" placeholder="ex. ASTS, MSFT, NVDA" autocomplete="off"><button type="button" class="t212BtnLinie" data-action-click="t212ListaSalveaza()">Salvează</button></div>';
  // v100.71 (I2): avertizarile comune si sub idei (randul 📊 „În situații ca asta”, „(puține cazuri)”)
  if (typeof Consiliu !== "undefined" && Consiliu.LEGENDA_ACTIUNI) h += '<p class="tbSub tbConsLeg">' + escapeHtml(Consiliu.LEGENDA_ACTIUNI) + '</p>';
  box.innerHTML = h;
}
// v100.55: „in situatii ca asta” pentru idei (toate au trecut de poarta: aceeasi stare) - o linie deasupra tabelului
// v100.92 (I-520): filele panoului de idei - butoanele (numărul în titlu), fila aleasă vizibilă, celelalte ascunse (hidden); alegerea fără redesen
function t212File(file, aleasa) {
  var k = file.some(function (f) { return f.k === aleasa; }) ? aleasa : file[0].k;
  return '<div class="t212File" role="tablist">' + file.map(function (f) { return '<button type="button" class="tbIntBtn" aria-pressed="' + (f.k === k) + '" data-action-click="t212FilaAlege(\'' + f.k + '\')">' + escapeHtml(f.t + (f.n != null ? " · " + f.n : "")) + '</button>'; }).join("") + '</div>'
    + file.map(function (f) { return '<div class="t212Fila" data-fila="' + f.k + '"' + (f.k === k ? "" : " hidden") + '>' + f.h + '</div>'; }).join("");
}
function t212FilaAleasa() { try { var v = localStorage.getItem("t212Fila"); return v === "revenire" || v === "socoteala" ? v : "idei"; } catch (e) { return "idei"; } }
function t212FilaAlege(k) {
  try { localStorage.setItem("t212Fila", k); } catch (e) {}
  var box = $("t212Idei"); if (!box) return;
  box.querySelectorAll(".t212Fila").forEach(function (p) { p.hidden = p.getAttribute("data-fila") !== k; });
  box.querySelectorAll(".t212File .tbIntBtn").forEach(function (b) { var m = /\('(\w+)'\)/.exec(b.getAttribute("data-action-click") || ""); b.setAttribute("aria-pressed", String(!!m && m[1] === k)); });
}
function t212IdeiSit(l) {
  var j = t212Jurnal(), sit = l.length && l[0].sit; if (!j || !sit) return "";
  return '<p class="tbSub">📊 ' + escapeHtml(ActiuniSemnale.textSituatie(ActiuniSemnale.situatiiCaAsta(j.p.inchise, t212.cf || {}, sit, null))) + '</p>';
}
function t212BiletPentru(sim) {
  var e = $("t212PSimbol"); if (e) e.value = sim;
  t212Poarta();
  var r = $("t212PoartaRez"); if (r && r.scrollIntoView) r.scrollIntoView({ block: "center", behavior: "smooth" });
}
async function t212ListaSalveaza() {
  var e = $("t212ListaIn"), l = String(e && e.value || "").split(/[,\s]+/).filter(Boolean);
  try {
    var r = await apiFetch("/api/t212?action=lista", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ simboluri: l }) });
    var d = await r.json().catch(function () { return null; }); if (!r.ok) throw new Error(d && d.error || "HTTP " + r.status);
    if (t212.idei) t212.idei.lista = d.lista; t212IdeiRender();
    toast("Lista e salvată: colectorul le judecă de mâine dimineață", "good");
  } catch (x) { toast("Lista nu s-a salvat: " + t212Eroare(x), "bad"); }
}
// v90: ideile de boti - candidatii din clasamentul colectorului, cu istoricul tau pe moneda
// v100.58: gridul ingust al monedelor sugerate (colectorul, la 6 h) - TOATE intr-o singura cerere, o data la 10 min
// (limita de 120 de citiri/min e comuna cu colectorul - o cerere pe moneda dadea RATE_LIMITED altor ecrane)
var tbIngust = { la: 0, cheie: "", v: {}, inLucru: false };
function tbIngustAdu(simboluri) {
  var cheie = simboluri.slice().sort().join(",");
  if (!cheie || tbIngust.inLucru || (tbIngust.cheie === cheie && Date.now() - tbIngust.la < 10 * 60000)) return;
  tbIngust.inLucru = true;
  getJSON("/api/istoric-bot?action=ingustLista&simboluri=" + encodeURIComponent(cheie)).then(function (d) { tbIngust = { la: Date.now(), cheie: cheie, v: d && d.ingust || {}, inLucru: false }; tbIdeiRender(); })
    .catch(function () { tbIngust.inLucru = false; tbIngust.la = Date.now(); tbIngust.cheie = cheie; });
}
function tbIngustPt(simbol) { return tbIngust.v[simbol] || null; }
// v100.59 (I-480): urmarirea inainte - adusa o data la 10 min
var tbUrm = { la: 0, v: null, inLucru: false };
function tbUrmAdu() {
  if (tbUrm.inLucru || Date.now() - tbUrm.la < 10 * 60000) return;
  tbUrm.inLucru = true;
  getJSON("/api/istoric-bot?action=ingustUrmarire").then(function (d) { tbUrm = { la: Date.now(), v: d && d.lista || [], inLucru: false }; tbIdeiRender(); }).catch(function () { tbUrm.inLucru = false; tbUrm.la = Date.now(); });
}
function tbIdeiRender() {
  var box = $("tbIdei"); if (!box || typeof Idei === "undefined") return;
  var cl = contTot.clasament, pzT = typeof acPauzaSezon === "function" ? acPauzaSezon() : null, l = pzT > 0 ? [] : Idei.ideiBoti(cl, contTot.inchise || [], 5);
  var h = '<div class="tbTodoCap"><h4>💡 Pe ce aș porni un bot acum</h4><span class="tbSub">' + (cl && cl.la ? "clasamentul de la " + escapeHtml(new Date(cl.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })) + ", top 100 PERP" : "colectorul face clasamentul o dată pe oră") + '</span></div>';
  if (pzT > 0) h += '<p class="tbSub tbTodoGol">' + escapeHtml(acFrazaPauza(pzT)) + '</p>';
  else if (!l.length) h += '<p class="tbSub tbTodoGol">' + (cl ? "Acum nicio monedă nu e candidată." : "Aștept clasamentul…") + '</p>';
  else { tbIngustAdu(l.map(function (x) { return x.simbol; }).filter(Boolean)); }
  if (l.length) h += l.map(function (x) {
    var ist = tbIstoricBoti(x.istoric);
    var det = [x.latime != null ? "interval " + GridCalcul.procent(x.latime) : "", x.profitGrila != null ? GridCalcul.procent(x.profitGrila) + " net pe grilă" : "", x.traversariZi != null ? "~" + Math.round(x.traversariZi) + " treceri pe zi" : ""].filter(Boolean).join(" · ");
    return '<div class="tbTodoRand"><span class="tbDunga ' + (tbIstoricRosu(x) ? "r" : "v") + '"></span><div><b>' + escapeHtml(x.moneda) + '</b> <span class="tbSub">' + escapeHtml(det) + '</span><p' + (tbIstoricRosu(x) ? ' class="bad"' : '') + '>' + escapeHtml(ist) + '</p>' + (function () { try { var g = typeof GridProba !== "undefined" && x.simbol ? tbIngustPt(x.simbol) : null; if (!g) return ''; var v = GridProba.varstaIngust(g, Date.now()); return '<p class="tbSub' + (g.propus ? '' : ' t212Estompat') + '">' + escapeHtml(GridProba.rezumatIngust(g)) + (v.text ? ' · ' + escapeHtml(v.text) : '') + '</p>'; } catch (e) { return ''; } })() + '</div><button type="button" class="tbBtnLinie" data-action-click="gridDeschideMoneda(\'' + String(x.moneda).replace(/[^A-Za-z0-9._-]/g, "") + '\')">Fișa</button></div>';
  }).join("");
  tbUrmAdu();
  if (tbUrm.v && typeof GridProba !== "undefined") { try { h += '<p class="tbSub">⚡ ' + escapeHtml(GridProba.socotealaUrmarire(tbUrm.v).text) + '</p>'; } catch (e) {} }
  var hI = h + '<p class="tbSub tbTodoGol">Un filtru (liniște, interval, treceri), nu o predicție: laboratorul n-a găsit încă o diferență clară. Fișa îți dă setările și proba pe istoricul monedei.</p>' + tbSugestiiHtml(cl, contTot.sugestii, contTot.inchise); if (box._contH !== hI) { box._contH = hI; box.innerHTML = hI; }   /* audit 23.10: doar când s-a schimbat. v100.85 (reveniri + short): sub nota listei de candidați */
}
// v100.85 (reveniri + short, 03.10): sub „Pe ce aș porni un bot acum” - două liste cu istoricul pe față și urmărirea (filtre, nu predicții)
// v100.89 (ideea 2): istoricul boților tăi pe o monedă, pe rândurile Tabloului (candidații + revenire / short) - un singur loc,
// cu virgulă zecimală ca restul paginii (TextRo.usdt: „−7,22 USDT”; înainte „−7.22 USDT”)
// v100.92 (I-525, revizia Opus): istoricul LUI pe monedă pe minus (≥ 3 boți) - aceeași regulă și culoare la candidați și la listele de revenire/short
function tbIstoricRosu(x) { return !!(x && x.istoric && x.istoric.n >= 3 && x.istoric.total < 0); }
function tbIstoricBoti(ist) {
  if (!ist || !ist.n) return "n-ai mai avut boți pe ea";
  var bani = typeof TextRo !== "undefined" && TextRo.usdt ? TextRo.usdt(ist.total, 1) : (ist.total >= 0 ? "+" : "−") + Math.abs(ist.total).toFixed(1).replace(".", ",") + " USDT";   // audit 19.10: o zecimală
  return "istoricul tău: " + t212Cate(ist.n, "bot", "boți") + ", " + ist.pePlus + " pe plus, " + bani;
}
function tbSugestiiHtml(cl, sg, inchise) {
  if (typeof Reveniri === "undefined" || typeof Idei === "undefined" || !Idei.reveniriBoti) return "";
  try { return tbSugestiiCorp(cl, sg, inchise); } catch (e) { return ""; }   /* o eroare în date nu strică lista de candidați de deasupra */
}
function tbSugestiiCorp(cl, sg, inchise) {
  var rev = Idei.reveniriBoti(cl, inchise || [], 5), sh = Idei.shortBoti(cl, inchise || [], 5), s = sg && sg.sugestii, dv = s && s.dovada || {}, u = s && s.urmarire || {};
  var ist = function (x) { return tbIstoricBoti(x.istoric); };
  // audit 19.10 (8): istoricul monedelor e pe universul de azi - avertismentul de supraviețuire, ca la acțiuni
  var dov = function (d, cum) { var b = d && d.boti ? Reveniri.textBoti(d.boti, cum) : ""; return '<p class="tbSub">' + escapeHtml(Reveniri.textDovada(d && d.piata, cum)) + (b ? ' ' + escapeHtml(b) : '') + '</p>' + (d && d.piata && Reveniri.TEXT_SUPRAVIETUITORI_MONEDE ? '<p class="tbSub">⚠ ' + escapeHtml(Reveniri.TEXT_SUPRAVIETUITORI_MONEDE) + '</p>' : ''); };
  var urm = function (x) { return x && x.text ? '<p class="tbSub">📏 ' + escapeHtml(x.text) + '</p>' : ''; };
  var dunga = function (d) { return d && d.piata && d.piata.eticheta === "mai slab" ? "g" : "v"; };
  // v100.87 (el, „ok” după poza de la 10:55 - Q era în ambele liste): moneda aflată și pe revenire, și la short primește pe fiecare rând
  // al ei „Aș sări peste ea” - semnalele se bat cap în cap; listele tot nu se filtrează între ele (specul)
  var inRev = {}, inSh = {}; rev.forEach(function (x) { inRev[x.moneda] = 1; }); sh.forEach(function (x) { inSh[x.moneda] = 1; });
  // v100.92 (I-525): istoricul LUI pe monedă pe minus (≥ 3 boți) ⇒ dunga roșie și istoricul pe roșu - același ajutor ca la candidați (tbIstoricRosu)
  var rand = function (x, det, dir, d, nota) { return '<div class="tbTodoRand"><span class="tbDunga ' + (tbIstoricRosu(x) ? "r" : dunga(d)) + '"></span><div><b>' + escapeHtml(x.moneda) + '</b> <span class="tbSub">' + escapeHtml(det) + '</span><p' + (tbIstoricRosu(x) ? ' class="bad"' : '') + '>' + escapeHtml(ist(x)) + '</p>' + (nota ? '<p class="tbWarn">' + escapeHtml(nota) + '</p>' : '') + '</div><button type="button" class="tbBtnLinie" data-action-click="gridDeschideMonedaDir(\'' + String(x.moneda).replace(/[^A-Za-z0-9._-]/g, "") + '\',\'' + dir + '\')">Fișa (' + dir + ')</button></div>'; };
  var gol = function (t) { return '<p class="tbSub tbTodoGol">' + (cl ? t : "Aștept clasamentul…") + '</p>'; };
  // revizia (I7): un clasament făcut înainte de colectorul nou n-are starea de revenire (lipsește sau e null peste tot, după ruta curățată)
  var faraStare = !!(cl && Array.isArray(cl.monede) && cl.monede.length && !cl.monede.some(function (m) { return m && m.revenire; }));
  var h = '<div class="tbSugestii"><h4>↩️ Pe revenire (bot long)</h4>' + dov(dv.revenire, "monede");
  h += rev.length ? rev.map(function (x) { var r = x.revenire; return rand(x, "căzută −" + Math.round(r.cadere * 100) + "% de la maximul pe 30 de zile · +" + Math.round(r.deLaMin * 100) + "% de la minim (acum " + t212Cate(Math.round(r.zileDeLaMin), "zi", "zile") + ")", "long", dv.revenire, inSh[x.moneda] ? "Aș sări peste ea: e și în lista pentru short, deci semnalele se bat cap în cap." : ""); }).join("") : gol(faraStare ? "Starea de revenire apare la următorul clasament (o dată pe oră)." : "Acum nicio monedă nu e pe revenire.");
  h += urm(u.revenire) + '<h4>📉 Pentru short</h4>' + dov(dv.short, "short");
  h += sh.length ? sh.map(function (x) { return rand(x, [x.latime != null ? "interval " + GridCalcul.procent(x.latime) : "", x.profitGrila != null ? GridCalcul.procent(x.profitGrila) + " net pe grilă" : "", x.traversariZi != null ? "~" + Math.round(x.traversariZi) + " treceri pe zi" : "", "direcția short" + (x.tarie && x.tarie !== "fara-date" ? " (" + x.tarie + ")" : "")].filter(Boolean).join(" · "), "short", dv.short, inRev[x.moneda] ? "Aș sări peste ea: e și pe revenire (bot long), deci semnalele se bat cap în cap." : ""); }).join("") : gol("Acum nicio monedă liniștită nu are direcția short.");
  return h + urm(u.short) + '</div>';
}
// v100.85: „Fișa (long/short)” din listele de sugestii - aceeași fișă, cu direcția aleasă DOAR pentru moneda ei (revizia: pusă înainte de calcul, deci
// un singur calcul; la altă monedă gridDirTemporara întoarce direcția de dinainte, iar o alegere de mână o face permanentă)
function gridDeschideMonedaDir(m, dir) {
  if ((dir === "long" || dir === "short") && typeof grStare === "object" && grStare) {
    grStare.dirTemp = { simbol: String(m).replace(/_USDT_PERP$/, ""), inainte: grStare.dirTemp ? grStare.dirTemp.inainte : grStare.dir };
    grStare.dir = dir;
    if (typeof gridDirButoane === "function") gridDirButoane();
  }
  gridDeschideMoneda(m);
}
// v97.3: acelasi drum ca din clasament / Scan: moneda aleasa, calculul ei, pagina dusa la fisa (nu lasata sus)
function gridDeschideMoneda(m) {
  navTo("gridset", true);
  if (typeof gridClasamentAlege === "function") { gridClasamentAlege(m); return; }
  var e = $("grMoneda"); if (e) e.value = m;
  if (typeof gridCalculeaza === "function") gridCalculeaza("fortat");
}

// v100.96 (el: „nu le văd pe toate, scoate-le în evidență”): pe rândul poziției, sub trend, direcția pe 5 zile de bursă după 🧠 · 🌳 și
// starea lor (Retea.rezumat scurt), pe barele ÎNCHISE ale acțiunii (t212.bare), cu stopul și ținta poziției; fără modele sau bare nimic
function t212ModeleRand(p) {
  try {
    if (typeof Retea === "undefined" || typeof reteaM === "undefined" || !(reteaM.m || reteaM.a)) return "";
    var b = t212.bare[p.ticker], q = t212.bare.QQQ_US_EQ || null, j = t212Jurnal(), inchise = j ? j.p.inchise : [];
    if (!b || b.length < 251) return "";
    var n = p.niv, o = { acum: Date.now(), pret: p.pret, stop: n ? n.stopPozitie : null, tinta: p.plan && p.plan.tinta > 0 ? p.plan.tinta : n ? n.tintaPozitie : null, ticker: p.ticker };
    var rt = reteaM.m ? Retea.pentruActiune(reteaM.m, b, o, q, inchise) : null, ra = null;
    try { ra = reteaM.a && typeof Arbori !== "undefined" ? Arbori.pentruActiune(reteaM.a, b, o, q, inchise) : null; } catch (e) { ra = null; }
    var t = Retea.rezumat(reteaM.m, rt, null, { acum: Date.now(), cod: "directie5", scurt: true }, ra && reteaM.a ? { modele: reteaM.a, rt: ra } : null);
    return t ? '<span class="t212Mic t212Modele" title="Prețul mai sus peste 5 zile de bursă: 🧠 rețeaua · 🌳 arborii">' + 'peste 5 zile: ' + escapeHtml(t) + '</span>' : "";   /* revizia 🔵5: în prima celulă (vizibilă și pe telefon), cu prefix */
  } catch (e) { return ""; }
}
// v100.131 (el: „fa idei”): stopul care urcă DEPĂȘIT ⇒ șansa să revină la intrare în 60 de zile de bursă (mcsSansaRevenire, aceeași ca la
// Salt). Ținută minte pe poziție: se calculează din nou doar la o bară nouă, alt preț mediu / stop, sau prețul mutat cu 0,5% sau mai mult
var t212RevineMemo = {};
function t212RevinePt(p, b, n) {
  if (!n || !n.stopAtins || typeof mcsSansaRevenire !== "function" || !b || !b.length) return null;
  var m = t212RevineMemo[p.ticker], ub = b[b.length - 1].t;
  if (m && m.ub === ub && m.pm === p.pretMediu && m.stop === n.stopPozitie && Math.abs(p.pret / m.pret - 1) < 0.005) return m.v;
  var v = mcsSansaRevenire(b, p.pret, p.pretMediu, n.stopPozitie);
  t212RevineMemo[p.ticker] = { ub: ub, pm: p.pretMediu, stop: n.stopPozitie, pret: p.pret, v: v };
  return v;
}
// rândul: o bucată mică sub „DEPĂȘIT” (ascunsă pe telefon - se suprapunea cu ținta); detaliul: propoziția întreagă
function t212RevineHtml(p) {
  var r = p && p.revine;
  if (!r) return { mic: "", det: "" };
  // v100.132: în rând e un buton care deschide Monte Carlo pe poziție (mcsRevineButon); fără simbol, doar textul
  var sim = (typeof t212 !== "undefined" && t212.simbolPret && t212.simbolPret[p.ticker]) || p.simbol, stop = p.niv ? p.niv.stopPozitie : null;
  var btn = sim && typeof mcsRevineButon === "function" ? mcsRevineButon(sim, p.pret, p.pretMediu, stop, r, "t212RevMic") : "";
  return { mic: btn || '<span class="t212Mic t212RevMic">🎲 revine la intrare: ' + Math.round(r.p * 100) + '% în ' + r.zile + ' z</span>',
    det: '<p class="t212Revine">🎲 Șansa să revină la prețul tău de intrare (' + t212Usd(p.pretMediu) + ') măcar o dată în ' + r.zile + ' de zile de bursă: <b>' + Math.round(r.p * 100) + '%</b>; la capăt peste intrare: ' + Math.round(r.pCapat * 100) + '%. <span class="t212Mic">Monte Carlo pe istoria ei, fără tendința perioadei: zile reale reluate de 1.000 de ori, nu o predicție.</span></p>' };
}
function t212RandPozitie(p) {
  var niv = T212_NIVEL[p.sem.nivel] || T212_NIVEL["fara-date"], n = p.niv, tk = escapeHtml(p.ticker), pl = p.plan || {}, des = !!t212.deschis[p.ticker];
  var pctPret = p.pret / p.pretMediu - 1, tr = p.st.trend.dir;
  var sz = t212SemZi(p.ticker), NZ = { urca: "urcă", coboara: "coboară", lateral: "lateral" };   // v100.110 (I-546): becul 1z, când nu e de acord cu mediile
  var dif = sz && ((tr === "sus" && sz.dir !== "urca") || (tr === "jos" && sz.dir !== "coboara") || (tr === "lateral" && sz.dir !== "lateral"));
  // v100.196 (🟡13): prețurile poziției în moneda EI ($ / € / £ / pence), nu mereu cu „$”
  var Pr = function (v) { return t212PretIn(v, p.ticker); }, rz = t212.rezultate[p.ticker];
  var planTxt = p.plan ? [pl.trailPct ? "−" + String(pl.trailPct).replace(".", ",") + "% de la max" : "", pl.stop ? "stop " + Pr(pl.stop) : "", pl.tinta ? "țintă " + Pr(pl.tinta) : ""].filter(Boolean).join(" · ") : "";
  var w = p.pond > 0.2 ? " rau" : p.pond > 0.15 ? " atentie" : "", rv = t212RevineHtml(p);
  var rand = '<tr class="t212Rand" id="t212R-' + tk + '" tabindex="0" aria-expanded="' + des + '" data-action-click="t212Comuta(\'' + tk + '\')">'
    + '<td><div class="t212Sim"><span class="t212Pill ' + niv[1] + '">' + niv[0] + '</span><div><b>' + escapeHtml(p.simbol) + '</b><span class="t212Mic">' + t212Bucati(p.qty, p.pret > 0 ? p.pret : p.pretMediu) + ' · mediu ' + Pr(p.pretMediu) + (rz && rz.data ? ' · rezultate ' + t212ZiScurta(rz.data) : rz && /_US_EQ$/.test(p.ticker) ? ' · rezultate: dată necunoscută' : '') + '</span>' + t212ModeleRand(p) + '</div></div></td>'
    + '<td class="c-acum">' + Pr(p.pret) + '</td>'
    + '<td class="c-rez"><b class="' + t212Cls(p.ppl) + '">' + t212Lei(p.ppl) + '</b><span class="t212Mic">' + (p.pctLei !== null ? t212Pct(p.pctLei) + ' · preț ' + t212Pct(pctPret) : 'preț ' + t212Pct(pctPret)) + '</span></td>'
    + '<td class="c-stop" data-et="Stop">' + (n ? '<span class="' + (n.stopAtins ? "bad" : "") + '">' + Pr(n.stopPozitie) + '</span><span class="t212Mic">' + (n.stopAtins ? "DEPĂȘIT" : Math.abs(n.stopPozitie / p.pret - 1) < 0.0005 ? "la stop" : t212Pct(n.stopPozitie / p.pret - 1) + " de acum") + '</span>' + rv.mic : '—') + '</td>'   /* v100.196 (UI 🔵5): nu „−0,0%” */
    + '<td class="c-tinta" data-et="Țintă">' + (n ? '<span class="good">' + Pr(n.tintaPozitie) + '</span><span class="t212Mic">' + t212Pct(n.tintaPozitie / p.pret - 1) + '</span>' : '—') + '</td>'
    + '<td class="c-trend"><b class="' + (tr === "sus" ? "good" : tr === "jos" ? "bad" : "t212Estompat") + '">' + (tr === "sus" ? "↑ sus" : tr === "jos" ? "↓ jos" : tr === "lateral" ? "→ lateral" : "—") + '</b>' + (dif ? '<span class="t212Mic">1z: ' + NZ[sz.dir] + '</span>' : '') + '</td>'
    + '<td class="c-pond">' + (p.pond !== null ? Math.round(p.pond * 100) + '%<span class="t212MiniBara"><i class="' + w + '" style="width:' + Math.min(100, p.pond / 0.3 * 100).toFixed(0) + '%"></i></span>' : '—') + '</td>'
    + '<td class="c-plan">' + (p.plan ? '<span class="t212PlanChip ok">✓ ' + escapeHtml(planTxt) + '</span>' : '<span class="t212PlanChip">fără plan</span>') + '</td>'
    + '</tr>';
  // detaliul
  var info = [tr !== "fara-date" ? "trend " + tr + " (" + p.st.trend.tarie + ")" : "", p.st.distMax52 !== null ? "față de maximul pe 52 săpt. " + t212Pct(p.st.distMax52) : "", p.maxDupaCumparare ? "de la maximul de după cumpărare " + t212Pct(p.pret / p.maxDupaCumparare - 1) : "", t212.beta[p.ticker] ? "beta " + t212.beta[p.ticker].toFixed(2).replace(".", ",") : "", p.fxPpl && Math.abs(p.fxPpl) >= 1 ? "din rezultat, cursul dolar/leu: " + t212Lei(p.fxPpl) : "",
    t212.dupaNume && t212.dupaNume[p.ticker] ? "⚠️ prețurile zilnice sunt găsite după numele firmei (" + (t212.simbolPret[p.ticker] || "alt simbol") + "): verifică în Trading 212 că e aceeași firmă" : "",
    p.unitate ? "⚠️ prețurile zilnice veneau în " + (p.unitate === 100 ? "lire, iar Trading 212 dă pence" : "pence, iar Trading 212 dă lire") + ": le-am adus la unitatea din Trading 212 înainte de stop" : ""].filter(Boolean).join(" · ");   /* v100.196 (🔵2); v100.267 (auditul 29.10): nota de unitate */
  // v100.54: o singura voce - Consilierul pozitiei (verdict, ce as face, bani, 3 motive, de ce, decizii, restul pliat); fara el, ca inainte
  var stanga = '<div>' + (p.cons ? t212ConsHtml(p) : '<h5>De ce ' + niv[0] + '</h5>' + (p.sem.motive.length ? '<ul class="t212Motive">' + p.sem.motive.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join("") + '</ul>' : '')
    + '<p class="t212Fac">' + escapeHtml(p.sem.ceAsFace) + '</p>' + t212SfaturiHtml(p.sfaturi))
    + (!p.cons && n && n.stopAtins ? '<p class="t212Fac">👉 <b>Ce aș face eu:</b> Aș ieși (măcar jumătate), fără să aștept să „își revină”: ' + escapeHtml(p.simbol) + ' e deja sub stopul calculat.</p>' : '')
    + '<p class="tbSub">' + escapeHtml(info || (t212.inLucru ? "aduc prețurile zilnice…" : "fără prețuri zilnice pentru " + p.simbol)) + '</p>'
    + (n ? '<p class="tbSub"><b>Adaug doar la:</b> ' + (n.intrare && p.pret >= p.pretMediu ? Pr(n.intrare.pret) + " — " + escapeHtml(n.intrare.motiv) : escapeHtml(p.pret < p.pretMediu ? "— ești pe minus: nu adaug (așa a crescut NPA la 33.000 de lei)" : "— " + n.intrareMotiv)) + '</p>' : '')
    + rv.det
    + (typeof mcsPozButon === "function" ? '<p class="tbSub">' + mcsPozButon(t212.simbolPret[p.ticker] || p.simbol, p.pret, p.pretMediu, n ? n.stopPozitie : null) + '</p>' : '') + '</div>';
  var v = function (camp, calc) { return pl[camp] != null ? pl[camp] : calc != null ? calc : ""; };
  var dreapta = '<div class="t212Preturi"><h5>Planul tău <span class="t212Estompat">· ' + (p.plan ? "salvat " + new Date(pl.la).toLocaleDateString("ro-RO") + " · colectorul te anunță" : n ? "completat cu prețurile calculate" : "scrie-l tu") + '</span></h5>'
    + '<div class="t212Plan"><label>Ies la −% de la maxim<input inputmode="decimal" id="t212Trail-' + tk + '" class="' + (!p.plan && n ? "calc" : "") + '" value="' + escapeHtml(String(v("trailPct", n ? +n.trailPct.toFixed(1) : null))) + '" placeholder="8"></label>'
    + '<label>Țintă, ' + escapeHtml(t212PretIn(1, p.ticker).replace(/[\d.,\s]/g, "") || "preț") + '<input inputmode="decimal" id="t212Tinta-' + tk + '" class="' + (!p.plan && n ? "calc" : "") + '" value="' + escapeHtml(String(v("tinta", n ? n.tintaPozitie : null))) + '" placeholder="preț"></label>'
    + '<label>Stop fix, ' + escapeHtml(t212PretIn(1, p.ticker).replace(/[\d.,\s]/g, "") || "preț") + '<input inputmode="decimal" id="t212Stop-' + tk + '" value="' + escapeHtml(String(v("stop", null))) + '" placeholder="opțional"></label>'
    + '<button type="button" class="t212Btn t212BtnPlin" data-action-click="t212PlanSalveaza(\'' + tk + '\')">Salvează planul</button>'
    + (p.plan ? '<button type="button" class="t212BtnLinie" data-action-click="t212PlanSterge(\'' + tk + '\')">Șterge</button>' : '') + '</div>'
    + '<div class="t212Teza"><label>De ce am intrat (teza)<input id="t212Teza-' + tk + '" maxlength="300" value="' + escapeHtml(pl.teza || "") + '" placeholder="ex. rezultate bune, sectorul conduce"></label>'
    + '<label>Ies dacă (invalidarea)<input id="t212Inv-' + tk + '" maxlength="200" value="' + escapeHtml(pl.invalidare || "") + '" placeholder="ex. închide sub media de 50"></label>'
    + '<label>Orizont, zile<input inputmode="numeric" id="t212Oriz-' + tk + '" value="' + escapeHtml(pl.orizont != null ? String(pl.orizont) : "") + '" placeholder="30"></label></div>'
    + (pl.orizont > 0 && pl.la ? (function () { var trec = (Date.now() - pl.la) / 86400000; return trec > pl.orizont ? '<p class="tbWarn">⏰ ' + escapeHtml("Orizontul tău de " + t212Cate(pl.orizont, "zi", "zile") + " a trecut (au trecut " + t212Cate(Math.floor(trec), "zi", "zile") + "): teza ta mai stă în picioare?") + '</p>' : ""; })() : "")
    + (n ? '<p class="tbSub">Stop care urcă după maxim: <b class="' + (n.stopAtins ? "bad" : "") + '">' + t212PretIn(n.stopPozitie, p.ticker) + '</b> (−' + n.trailPct.toFixed(1).replace(".", ",") + '% de la maxim) · Țintă: <b class="good">' + t212PretIn(n.tintaPozitie, p.ticker) + '</b> (2× riscul)</p><p class="tbSub">' + escapeHtml(t212ProbaText(n)) + '</p>'
      + (p.prob && p.prob.length && typeof tbProbRandHtml === "function" ? '<div class="t212Prob"><p class="tbSub"><b>🎲 Probabilitățile din istoric</b> · cât de des s-a întâmplat pe acțiunea asta, în zile ca acum — nu o prognoză</p>' + t212ProbListaHtml(p.prob) + '</div>' : '') + t212ReteaHtml({ acum: Date.now(), pret: p.pret, stop: n.stopPozitie, tinta: p.plan && p.plan.tinta > 0 ? p.plan.tinta : n.tintaPozitie, ticker: p.ticker }, t212.bare[p.ticker], p.prob)
      + (n.sursaTrail ? '<p class="tbSub">Stopul care urcă: ' + escapeHtml(n.sursaTrail) + ' (socoteala: Jurnal → „Cât te-ar fi salvat stopul”).</p>' : n.trailMinim ? '<p class="tbSub">Stopul care urcă e ținut la −15% de la maxim, nu mai strâns: pe trade-urile tale, stopurile mai strânse au tăiat prea multe care își reveneau (socoteala: Jurnal → „Cât te-ar fi salvat stopul”).</p>' : '')
      + (n.proba.medie !== null && n.proba.medie <= 0 ? '<p class="tbWarn">⚠️ Pe istoricul ei, în starea de acum, niciun stop (1,5–3× ATR (media simplă pe 14 zile)) n-a ieșit pe plus în medie: prețurile limitează pierderea, nu promit câștig.</p>' : '')
      : '<p class="tbSub">' + escapeHtml(p.nivMotiv || "Prețurile calculate apar după ce vin prețurile zilnice.") + '</p>') + '</div>';
  return rand + '<tr class="t212Det" id="t212Det-' + tk + '"' + (des ? '' : ' hidden') + '><td colspan="8"><div class="t212DetGrila">' + stanga + dreapta + '</div><div class="t212Graf" id="t212Graf-' + tk + '"></div></td></tr>';
}

/* v100.196 (auditul sever, 🔵10): t212PuneNiveluri scos - nu-l chema niciun buton (doar o probă de ecran, care face acum același lucru prin câmpuri) */
function t212PlanSterge(tk) { ["t212Trail-", "t212Tinta-", "t212Stop-"].forEach(function (k) { var e = $(k + tk); if (e) e.value = ""; }); t212PlanSalveaza(tk); }
// "Pune planurile la toate": pentru fiecare pozitie fara plan, planul din preturile calculate
async function t212PuneToate() {
  var b = $("t212PuneToate"); if (b) { b.disabled = true; b.textContent = "salvez…"; }
  var tk = (t212.poz || []).map(function (x) { return x.ticker; }).filter(function (k) { return t212.niveluri[k] && !t212.planuri[k]; }), ok = 0;
  for (var i = 0; i < tk.length; i++) {
    var n = t212.niveluri[tk[i]];
    try {
      var r = await apiFetch("/api/istoric-bot?action=plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bot: "t212-" + tk[i], plan: Object.assign({ trailPct: +n.trailPct.toFixed(1), tinta: n.tintaPozitie }, window.__proba ? { proba: true } : {}) }) });
      var d = await r.json().catch(function () { return null; });
      if (r.ok) { t212.planuri[tk[i]] = d && d.plan || null; ok++; }
    } catch (e) {}
  }
  t212Render();
  toast(ok === tk.length ? ok + " planuri salvate cu prețurile calculate · colectorul te anunță" : "Am salvat " + ok + " din " + tk.length + " planuri; reîncearcă pentru restul", ok === tk.length ? "good" : "bad");
}

// v100.267 (auditul 29.10): barele zilnice n-au pre-market - cu bursa simbolului închisă, „acum $X” era ultima închidere (înainte de deschidere:
// cea de ieri), iar la deschidere prețul poate sări peste stop. null = bursa deschisă, fără calendar sau fără bare: eticheta rămâne „acum”
function t212PretInchis(tk, randuri, acum) {
  if (typeof CalendarBursa === "undefined" || !CalendarBursa.stare) return null;
  var sb = CalendarBursa.stare(acum, tk); if (sb.deschisa) return null;
  var v = GridCalcul.bareToate(randuri || []).filter(function (x) { return x.t <= acum; }); if (!v.length) return null;   /* rândul din care vine prețul (pretCurent), nu bareBursa */
  var zu = new Date(v[v.length - 1].t).toISOString().slice(0, 10), ieri = new Date(Date.parse(sb.zi + "T12:00:00Z") - 86400000).toISOString().slice(0, 10);
  var et = zu === sb.zi ? "închiderea de azi" : zu === ieri ? "închiderea de ieri" : "închiderea din " + zu.slice(8, 10) + "." + zu.slice(5, 7);
  return { eticheta: et, avertisment: "Bursa e închisă: prețul de aici e " + et + " (barele zilnice n-au pre-market), nu cel de acum. La deschidere prețul poate sări peste stop, iar stopul se execută la primul preț de după salt." };
}
// v100.269 (ideile auditului 29.10): cu bursa închisă, ultima cotație din afara ședinței - barele de 5 minute cu prepost=1 (aceeași rută ca
// Sugestiile, Yahoo), începute după închiderea ultimei ședințe încheiate și până acum. faza „pre” = ziua următoare (pre-market), „dupa” =
// aceeași zi (după închidere). null = nicio bară de după închidere ⇒ Poarta rămâne pe închidere, ca până acum
function t212PretExtins(tk, randuri, inchidere, acum) {
  if (typeof CalendarBursa === "undefined" || !CalendarBursa.ultimaZiInchisa || !(inchidere > 0)) return null;
  var zi = CalendarBursa.ultimaZiInchisa(acum, tk), fin = CalendarBursa.inchidereLa(zi, tk), u = null;
  (Array.isArray(randuri) ? randuri : []).forEach(function (x) { var t = Number(x && x.time), c = Number(x && x.close); if (t >= fin && t <= acum && c > 0 && (!u || t > u.t)) u = { t: t, c: c }; });
  if (!u) return null;
  var faza = CalendarBursa.ziLocala(u.t, tk) === zi ? "dupa" : "pre", fata = u.c / inchidere - 1;
  return { pret: u.c, t: u.t, faza: faza, fata: fata, text: (faza === "pre" ? "pre-market " : "după închidere ") + t212Usd(u.c) + " (" + t212Pct(fata) + " față de închidere)" };
}
// Poarta de intrare: "vreau sa cumpar X" -> cumpar / astept / nu acum
async function t212Poarta() {
  var campS = function () { return String(($("t212PSimbol") && $("t212PSimbol").value) || "").toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 12); };
  var s = campS(), out = $("t212PoartaRez");
  // v100.267 (auditul 29.10): jetonul cererii (ca window.__derivSeq) - la două clicuri rapide pe „Bilet” răspunsul vechi (5 așteptări) scria peste
  // cel nou și intra în jurnalul verdictelor; după fiecare așteptare se iese dacă a venit alt clic. Doar jetonul, nu și câmpul: un simbol tastat
  // fără clic lăsa „aduc prețurile…” pe ecran la nesfârșit; biletul poartă oricum numele simbolului lui (revizia 29.10)
  var seq = t212.poartaSeq = (t212.poartaSeq || 0) + 1, depasit = function () { return seq !== t212.poartaSeq; };
  if (!s) { if (out) out.innerHTML = '<p class="tbSub">Scrie simbolul (de exemplu ASTS).</p>'; return; }
  if (out) out.innerHTML = '<p class="tbSub">aduc prețurile zilnice pentru ' + escapeHtml(s) + '…</p>';
  // v100.196 (🟡7): de unde vine simbolul (Trend 12 luni în probă ⇒ fără mărime) - doar pentru simbolul cerut, o singură dată
  var sursa = t212.poartaSursa && t212.poartaSursa.s === s ? t212.poartaSursa : null; t212.poartaSursa = null;
  var tk = s + "_US_EQ", plan = { stop: t212Nr($("t212PStop") && $("t212PStop").value), trailPct: t212Nr($("t212PTrail") && $("t212PTrail").value) };
  // v100.169 (Sizerul din market-events): restul planului LUI - intrarea, ținta, riscul % din cont (gol = calculate / 1 %)
  var pm = { intrare: t212Nr($("t212PIntrare") && $("t212PIntrare").value), tinta: t212Nr($("t212PTinta") && $("t212PTinta").value), riscPct: t212Nr($("t212PRisc") && $("t212PRisc").value), stop: plan.stop };
  pm.scris = !!(pm.intrare || pm.tinta || pm.riscPct || plan.stop || plan.trailPct);
  try {
    var b = await getJSON("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk));
    if (depasit()) return;   /* v100.267 (auditul 29.10): alt clic între timp */
    // v100.175 (auditul Opus, M15): GridCalcul.bare aruncă MEREU ultima bară - seara și în weekend aceea e o zi închisă (vinerea) ⇒ bareBursa
    var bare = GridCalcul.bareBursa(b && b.randuri || [], Date.now()), pret = GridCalcul.pretCurent(b && b.randuri || []);
    var inchisa = t212PretInchis(tk, b && b.randuri || [], Date.now());   /* v100.267 (auditul 29.10): „închiderea de ieri”, nu „acum” */
    var st = ActiuniSemnale.stare(bare, pret), ore = null, niv = ActiuniSemnale.niveluri(bare, pret, {});
    // v100.269 (ideile auditului 29.10): bursa închisă ⇒ și cotația din afara ședinței (o cerere în plus, ruta existentă); lipsa ei nu oprește Poarta
    var extins = null;
    if (inchisa) {
      try { var b5 = await getJSON("/api/t212?action=preturi&interval=5m&ticker=" + encodeURIComponent(tk) + "&prepost=1"); extins = t212PretExtins(tk, b5 && b5.randuri, st.pret, Date.now()); } catch (e5) { extins = null; }
      if (depasit()) return;
    }
    var j = t212Jurnal();
    if (j) j.p.inchise.forEach(function (t) { if (T212.simbol(t.ticker) === (b.simbol || s) && t.rezultat < 0) { var o = (Date.now() - t.inchis) / 3600000; if (ore === null || o < ore) ore = o; } });
    var cc = t212.cont && t212.cont.cash, tot = cc && cc.total, liber = cc && cc.free !== null && cc.free !== undefined && isFinite(Number(cc.free)) ? Number(cc.free) : null;
    // planul scris de el bate stopul calculat; fara plan, poarta judeca cu stopul calculat
    var planPoarta = plan.stop || plan.trailPct ? plan : niv.nivel === "ok" ? { stop: niv.stop } : plan;
    // v100.196 (auditul sever 14.10): verdictul vede și data rezultatelor (adusă ÎNAINTE de el, 🔴2), ce ai deja în ea (🔴1), media pe istoricul
    // ei (🟡2), regimul pieței (🟡3) și vârsta barelor (🟡5) - înainte data rezultatelor venea DUPĂ verdict și ajungea doar în bilet
    var rez = await t212RezultatePt(tk), zR = rez.data ? Math.ceil((Date.parse(rez.data + "T12:00:00Z") - Date.now()) / 86400000) : null;
    if (depasit()) return;
    await t212RegimAdu();
    if (depasit()) return;   /* v100.267: înainte de jurnalul verdictelor - doar biletul cerut ultimul intră acolo */
    var deja = t212DejaLei(tk);
    var rp = t212RegimPt();
    var v = ActiuniSemnale.poarta({ stare: st, plan: planPoarta, vandutPeMinusAcumOre: ore, rezultateZile: zR, medie: niv.nivel === "ok" && niv.proba ? niv.proba.medie : undefined,
      dejaPct: tot > 0 && deja > 0 ? deja / tot : 0, simbol: b.simbol || s, regim: rp, zileLipsa: ActiuniSemnale.zileLipsa(st.ultima, Date.now(), tk),
      extins: extins ? { pret: extins.pret, faza: extins.faza, stop: plan.stop > 0 ? plan.stop : niv.nivel === "ok" && niv.stop > 0 ? niv.stop : null } : undefined });   /* v100.269: stopul tău, altfel cel calculat */
    if (rp.viu && v && v.note) v.note.push("regimul e citirea de acum: colectorul nu l-a publicat în ultimele 2 ore");
    if (v && v.note) { var fzCit = t212FrazaCitire(); if (fzCit) v.note.push(fzCit); }
    // v100.222 (I-722): verdele care nu încape în banii liberi, e plin sau e blocat devine AȘTEAPTĂ înainte de jurnal
    if (v.nivel === "cumpara" && niv.nivel === "ok" && niv.intrare && niv.stop > 0 && deja !== null) {
      var mCash = ActiuniSemnale.marime({ intrare: niv.intrare.pret, stop: niv.stop, cont: tot, fx: t212Fx(), riscPct: v.riscPct, deja: deja, liber: liber, pretAcum: st.pret });
      if (mCash && (mCash.blocat || mCash.pesteLiber || mCash.plin)) {
        v = Object.assign({}, v, { nivel: "asteapta", motive: v.motive.concat([mCash.blocat ? "regimul blocat: risc 0, n-aș deschide" : mCash.plin ? "ai deja 20% din cont în " + (b.simbol || s) + ": n-aș adăuga" : "N-aș deschide: ai doar " + Math.round(mCash.liber) + " lei liberi."]), riscPct: mCash.blocat ? 0 : v.riscPct });
      }
    }
    // v100.177 (jurnalul verdictelor): verdictul Porții intră în jurnal cu prețul de acum (judecat după 5 și 20 de zile de bursă) - v100.196: ACELAȘI verdict ca pe ecran
    try { if (v && v.nivel && v.nivel !== "fara-date" && typeof verdictTrimite === "function") verdictTrimite({ s: "poarta-t212", k: tk, n: v.nivel, p: st.pret }); } catch (eV) {}
    await t212ContSiCalibrare();
    if (depasit()) return;
    /* revizia 29.10: biletul se publică în t212.poarta abia după ultima așteptare (știrile) - publicat înainte, un desen al paginii din timpul
       așteptării arăta biletul vechi pe jumătate (fără profil și probabilități) peste „aduc prețurile…” al clicului nou */
    var bilet = { simbol: b.simbol || s, ticker: tk, st: st, niv: niv, bare: bare, bareZi: GridCalcul.bareBursa(b && b.randuri || [], Date.now()), planScris: !!(plan.stop || plan.trailPct), planMeu: pm, v: v, tot: tot,
      liber: liber, deja: deja, sursa: sursa, rezultate: rez.data, rezultateStiut: rez.stiut, gasitDupaNume: !!(b && b.gasitDupaNume), inchisa: inchisa, extins: extins };
    // v89: biletul - ce spune istoricul tau despre situatii asemanatoare, rezultatele (aduse deja, mai sus), stirile
    // v100.267 (auditul 29.10): știrile întârziate ale unui bilet vechi nu se mai lipesc pe biletul nou (t212.poarta e deja al altui clic)
    var sp = null; try { sp = await getJSON("/api/stiri?action=actiune&ticker=" + encodeURIComponent(tk)); } catch (e) { sp = null; }
    if (depasit()) return;
    bilet.stiri = sp && sp.stiri || []; t212.poarta = bilet;
    // v100.55 (actiunile T212, pachetul 4): profilul si probabilitatile actiunii propuse, din barele aduse deja (merge si pe o actiune noua
    // pentru tine) + „in situatii ca asta” din trade-urile tale. Avertizeaza, nu schimba verdictul portii (revizia 01.10: try propriu -
    // o eroare aici lasa verdictul in picioare, fara randurile noi)
    try {
      var P = t212.poarta, n4 = P.niv, baza4 = n4 && n4.nivel === "ok" ? (pm.intrare || (n4.intrare ? n4.intrare.pret : st.pret)) : null;
      // revizia 01.10 (I2): stopul LUI cand l-a scris (poarta judeca tot cu el), altfel cel calculat
      P.stopP = ActiuniSemnale.stopPoarta(plan, n4, baza4); P.baza4 = baza4;
      P.prof = typeof ProfilMoneda !== "undefined" ? ProfilMoneda.calculeaza(bare, { piata: "actiuni", simbol: tk, acum: Date.now() }) : null;
      var zc4 = P.rezultate ? Math.ceil((Date.parse(P.rezultate + "T12:00:00Z") - Date.now()) / 86400000) : null;
      t212.poarta.prob = typeof Probabilitati !== "undefined" && p4ok(P) ? Probabilitati.randActiune(Probabilitati.pentruActiune(bare, { pret: baza4, stop: P.stopP.stop, tinta: pm.tinta > baza4 ? pm.tinta : n4.tinta, acum: Date.now() }), t212Calibrare(), { rezultateZile: zc4 !== null && zc4 >= 0 ? Math.round(zc4 * 5 / 7) : null, evenimente: P.prof && P.prof.evenimente }) : [];
      P.sit = j ? ActiuniSemnale.situatiiCaAsta(j.p.inchise, t212.cf || {}, ActiuniSemnale.cheieSituatie(st), tk) : null;
    } catch (e4) { t212.poarta.prof = null; t212.poarta.prob = []; t212.poarta.sit = null; t212.poarta.stopP = null; }
  } catch (e) { if (depasit()) return; t212.poarta = { simbol: s, eroare: t212Eroare(e) }; }   /* v100.267: nici eroarea unui bilet vechi */
  t212RenderPoarta();
}
function p4ok(p) { return !!(p.niv && p.niv.nivel === "ok" && p.stopP && p.stopP.stop > 0); }
// v100.94 (L2): a doua părere (🧠 rețeaua) și a treia (🌳 arborii) pe acțiune, din modelele din KV (reteaM) și barele zilnice ale paginii (+ QQQ,
// perechile lui); o = { acum, pret, stop, tinta, ticker }, prob = rândurile 🎲 (randActiune, cu cod), cump = { ticker, pornit, cost } la poartă
// („un trade ca ăsta iese pe plus”). Nimic fără modele T212, fără 250 de zile de bare sau fără QQQ; o eroare aici nu oprește desenul
function t212ReteaHtml(o, b, prob, cump) {
  if (typeof Retea === "undefined" || typeof reteaHtml !== "function" || typeof reteaM === "undefined" || !b || b.length < 251) return "";
  try {
    var j = t212Jurnal(), inchise = j ? j.p.inchise : [], q = t212.bare && t212.bare.QQQ_US_EQ ? t212.bare.QQQ_US_EQ : null;
    var rt = reteaM.m ? Retea.pentruActiune(reteaM.m, b, o, q, inchise) : null, ra = null;
    try { ra = reteaM.a && typeof Arbori !== "undefined" ? Arbori.pentruActiune(reteaM.a, b, o, q, inchise) : null; } catch (e) { ra = null; }
    if (cump) {
      var cu = { ticker: cump.ticker, pornit: cump.pornit, cost: cump.cost > 0 ? cump.cost : Retea.costTipic(inchise) };   /* revizia 🟡5: mărimea lui tipică, nu 100 de lei */
      if (rt) { var pz = Retea.pentruCumparare(reteaM.m, cu, b, q, inchise); if (pz) rt.pornire = pz; }
      if (ra) { try { var pa = Arbori.pentruCumparare(reteaM.a, cu, b, q, inchise); if (pa) ra.pornire = pa; } catch (e2) {} }
    }
    return reteaHtml(rt, prob, { acum: Date.now(), codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire: rt && rt.pornire, actiuni: true }, ra);   /* revizia 🔵8: subsolul doar cu țintele de pe acțiuni */
  } catch (e) { return ""; }
}
// v100.55: randurile de probabilitate (pozitia si poarta, aceeasi forma)
function t212ProbListaHtml(l) {
  if (!l || !l.length || typeof tbProbRandHtml !== "function") return "";
  return l.map(function (x) { return x.p === null ? '<p class="tbSub' + (x.avertizare ? ' tbWarn' : '') + '"><b>' + escapeHtml(x.titlu) + '</b>' + (x.text ? ' — ' + escapeHtml(x.text) : '') + '</p>' : tbProbRandHtml(x); }).join("");
}
// v100.56 (actiunile T212, pachetul 5): graficul actiunii in detaliul pozitiei - desenul botilor pe bare zilnice; comutatoarele au starea lor
var T212_IND = [["zi", "Ziua obișnuită", "Cât coboară și cât urcă acțiunea într-o zi obișnuită, de la prețul de acum (profilul ei)"], ["zi5", "5 zile", "Cât se mișcă într-o săptămână de bursă obișnuită"],
  ["val", "Zona de valoare", "Unde s-a tranzacționat 70% din volum în ultimele 20 de zile de bursă + suporturi/rezistențe confirmate"], ["ema", "EMA", "EMA 20 și 50"], ["bb", "Bollinger", "Bollinger 20, 2"], ["vp", "Volum la preț", "Profilul de volum"], ["rsi", "RSI", "RSI 14"]];
function t212IndStare() {
  var d = { bb: false, ema: true, rsi: false, vp: false, zi: true, zi5: true, val: true };
  try { var v = JSON.parse(localStorage.getItem("t212Ind") || "null"); if (v && typeof v === "object") for (var k in d) if (typeof v[k] === "boolean") d[k] = v[k]; } catch (e) {}
  return d;
}
function t212ComutaInd(k) {
  var s = t212IndStare(); if (!Object.prototype.hasOwnProperty.call(s, k)) return; s[k] = !s[k];
  try { localStorage.setItem("t212Ind", JSON.stringify(s)); } catch (e) {}
  t212GraficeDeseneaza();
}
function t212GraficHtml(p, W) {
  var b = (t212.bare[p.ticker] || []).slice(-120); if (b.length < 10 || typeof GraficBot === "undefined") return null;
  var pf = t212ProfilPt(p.ticker), n = p.niv, pl = p.plan || {}, VA = typeof Valoare !== "undefined" ? Valoare : null;
  var stopAcum = pl.stop > 0 ? pl.stop : pl.trailPct > 0 && p.maxDupaCumparare ? p.maxDupaCumparare * (1 - pl.trailPct / 100) : null;
  var sem = GraficBot.semafor(t212PeTf(p.ticker), "long", { actiune: true, acum: Date.now(), sedinta: t212SedintaDeschisa(Date.now()), reincerc: t212Reincerc(p.ticker), aDouaOara: t212ADouaOara(p.ticker), seAduc: t212SeAduc(p.ticker) });   /* v100.108; v100.110 reluarea */
  var d = GraficBot.desen({ bare: b, W: W, ingust: W < 560, st: t212IndStare(), actiune: true, pretViu: p.pret, semafor: sem, tfGrafic: "1D", trendIstoric: t212ZiRanduri(p.ticker), trendInchise: true,   /* revizia 01.10 (I2): in orele bursei bara de azi lipseste - „acum” = pretul viu */
    niv: GraficBot.niveluriActiune({ pretMediu: p.pretMediu, stop: stopAcum, tinta: pl.tinta > 0 ? pl.tinta : n ? n.tintaPozitie : null }),
    zi: GraficBot.ziObisnuitaActiune(p.pret, pf, 1), zi5: GraficBot.ziObisnuitaActiune(p.pret, pf, 5),
    val: VA ? { zona: VA.zona(b.slice(-20), { minBare: 15, bins: 24 }), pivoti: VA.pivoti(b, 3), et: "20 z", etLung: "20 de zile de bursă", etPivoti: "zilnic" } : null,
    consLinii: n ? { stopAcum: stopAcum, stopPlan: n.stopPozitie, et: "stopul propus", etLung: "stopul propus (" + (n.sursaTrail ? "din profilul acțiunii" : "−" + n.trailPct.toFixed(1).replace(".", ",") + "% de la maxim") + ")" } : null });
  d.semafor = sem;
  return d;
}
function t212GraficeDeseneaza() {
  (t212.pozPregatite || []).forEach(function (p) {
    var el = $("t212Graf-" + p.ticker); if (!el || !t212.deschis[p.ticker]) return;
    t212AduTf(p.ticker);   // revizia v100.108 (R5): reîmprospătarea lumânărilor TF-urilor (limita de 5 min o ține în frâu, fără buclă)
    // poza 01.10: tabelul pozitiilor poate fi mai lat decat panoul (defileaza) - graficul ia latimea VIZIBILA, nu pe a randului
    var wr = el.closest(".t212TabWrap"), vis = wr ? wr.clientWidth - 28 : 0; el.style.maxWidth = vis > 200 ? vis + "px" : "";
    var W = Math.round(Math.min(el.getBoundingClientRect().width || el.clientWidth || 700, vis > 200 ? vis : 1e9)), d = t212GraficHtml(p, Math.max(300, W)), s = t212IndStare();
    if (!d) { el.innerHTML = '<p class="tbSub">Graficul apare după ce vin prețurile zilnice (cel puțin 10 zile).</p>'; return; }
    var faraProfil = !t212ProfilPt(p.ticker);
    el.innerHTML = '<div class="tbInterval tbGrInd" role="group" aria-label="Indicatorii graficului ' + escapeHtml(p.simbol) + '">' + T212_IND.map(function (x) { return '<button type="button" class="tbIntBtn" aria-pressed="' + !!s[x[0]] + '" title="' + escapeHtml(x[2]) + '" data-action-click="t212ComutaInd(\'' + x[0] + '\')">' + escapeHtml(x[1]) + '</button>'; }).join("") + '</div>'
      + '<div class="gbZona">' + d.svg + '</div>' + (d.valori || '')   /* v100.162 (revizia Opus C1): ținta, prețul mediu, stopurile - în fâșia de sub grafic */
      + (faraProfil && (s.zi || s.zi5) ? '<p class="tbSub">Ziua și cele 5 zile obișnuite apar când profilul vine de la colector (îl face noaptea).</p>' : '')
      + '<div class="gbLeg">' + d.legenda + '</div>'
      + '<div class="t212TfCit">' + t212TfCitHtml(d.semafor) + '</div>' + t212RiscHtml(p);   /* v100.108: citirea pe TF-uri, sub grafic; v100.113: riscul tău */
  });
}
// v100.113 (el, 06.10: „în Tablou să-mi spună despre bot sau stock probabilități”): probabilitățile poziției din istoria ta - după cât o ții deja
// (din pozițiile tale ținute măcar atât) + medierea pe minus, dovedit rea la tine (RiscLuna, raportul de noapte)
var t212RiscEp = { n: -1, ep: null };
function t212RiscHtml(p) {
  if (typeof RiscLuna === "undefined") return "";
  var rp = typeof rlStare !== "undefined" ? rlStare.raport : null; if (!rp && typeof rlPorneste === "function") rlPorneste(false);
  var u = t212.istoric && Array.isArray(t212.istoric.umpleri) ? t212.istoric.umpleri : null; if (!rp || !rp.actiuni || !u) return "";
  if (t212RiscEp.n !== u.length) t212RiscEp = { n: u.length, ep: RiscLuna.episoade(u) };
  var e = t212RiscEp.ep.deschise.filter(function (x) { return x.ticker === p.ticker; })[0]; if (!e) return "";
  var t = RiscLuna.textActiune(rp.actiuni.supravietuire, (Date.now() - e.start) / 864e5), a1 = (rp.actiuni.comportament || []).filter(function (x) { return x.k === "A1"; })[0], m = e.A1 && a1 ? RiscLuna.textMediere(a1) : null;
  if (!t && !m) return "";
  return '<div class="t212Risc">' + (t ? '<p class="tbSub">🎲 ' + escapeHtml(t) + '</p>' : '') + (m ? '<p class="tbSub t212RiscRau">⚠️ ' + escapeHtml(m) + '</p>' : '') + '</div>';
}
// v100.55: profilul + probabilitatile actiunii propuse (avertizeaza, nu schimba verdictul portii)
function t212ProfilPoarta(p) {
  var h = "", baza = p.baza4, sp = p.stopP, PMo = typeof ProfilMoneda !== "undefined";
  var cmp = p.prof && baza && sp && sp.stop > 0 && PMo ? ProfilMoneda.comparaStopActiune(p.prof, 1 - sp.stop / baza) : null, sr = p.prof && PMo ? ProfilMoneda.textSarituri(p.prof) : "";
  if (!p.prof) h += '<p class="tbSub">📐 Profilul acțiunii: prea puține zile de prețuri (sub 120) — fără coborârea obișnuită și fără probabilități.</p>';
  if (cmp) h += '<p class="' + (cmp.strans ? "tbWarn" : "tbSub") + '">📐 ' + (sp.alTau ? "Cu stopul tău (" + escapeHtml(t212Usd(sp.stop)) + "): " : "") + escapeHtml(cmp.text) + '</p>';
  if (sr) h += '<p class="tbSub">⚡ ' + escapeHtml(sr) + '</p>';
  if (p.prob && p.prob.length) h += '<div class="t212Prob"><p class="tbSub"><b>🎲 Probabilitățile din istoric</b> · ' + (sp && sp.alTau ? "cu stopul tău (" + escapeHtml(t212Usd(sp.stop)) + ") și ținta de mai sus" : "cu stopul și ținta de mai sus") + ', cât de des s-a întâmplat pe acțiunea asta în zile ca acum — nu o prognoză</p>' + t212ProbListaHtml(p.prob) + '</div>';
  // v100.95 (ideea 4): „un trade ca ăsta” pe SUMA propusă de poartă - exact cea din „Cât cumperi” (t212MarimePoarta, revizia 🟡4: același
  // stop, aceeași condiție); fără sumă (fără cont, fără intrare, poarta pe „nu”) cost null -> t212ReteaHtml ia rezerva (mediana trade-urilor lui)
  // v100.172 (revizia Opus): cu planul LUI scris, „un trade ca ăsta” judecă trade-ul LUI (intrarea, stopul, ținta lui), nu prețurile calculate
  var ms = t212FaraSuma(p) ? null : t212MarimePoarta(p), plT = t212PlanPoarta(p), cuPlan = !!(plT && !plT.eroare);
  h += t212ReteaHtml({ acum: Date.now(), pret: cuPlan ? plT.intrare : baza, stop: cuPlan ? plT.stop : sp && sp.stop, tinta: cuPlan && plT.tinta !== null ? plT.tinta : p.niv && p.niv.tinta, ticker: p.ticker }, p.bareZi, p.prob, { ticker: p.ticker, pornit: Date.now(), cost: ms && ms.suma > 0 ? ms.suma : null });   /* v100.94 (L2): 🧠/🌳 + „un trade ca ăsta iese pe plus”; revizia 🔵9: barele ÎNCHISE (bareBursa), 🟡5: costul tipic */
  return h ? '<div class="t212ProfilPoarta">' + h + '</div>' : "";
}
// v100.95 (revizia 🟡4): O SINGURĂ sursă pentru suma propusă - „Cât cumperi” și „un trade ca ăsta iese pe plus” judecă același trade:
// intrarea (ordinul limită), stopul CALCULAT, doar cu intrare (nu pe trend jos) și cu poarta nu pe „nu” (ar contrazice verdictul); altfel null
// v100.169: cu planul LUI scris, suma e cea din planul lui (și la „așteaptă” / „nu”: se avertizează, nu se refuză)
function t212MarimePoarta(p) {
  if (t212FaraMarime(p)) return null;   /* v100.196 (revizia): Trend 12 luni în probă ⇒ fără sumă, nici din plan */
  // v100.222 (I-722): sumă doar pe verde. „ok” nu e cumpărare. Riscul 0 nu dă bucăți. Lipsa riscPct pe verde rămâne 1 %.
  if (!p || !p.v || p.v.nivel !== "cumpara" || p.v.riscPct === 0) return null;
  if (p.deja === null) return null;   /* v100.254: după poarta de cumpărare; marime() ar lua null drept 0 */
  var n = p && p.niv, pl = t212PlanPoarta(p);
  if (pl) return pl.m && (pl.m.blocat || pl.m.pesteLiber || pl.m.plin) ? null : pl.m;
  if (!n || n.nivel !== "ok" || !n.intrare || !(n.intrare.pret > 0) || !(n.stop > 0)) return null;
  var mPo = ActiuniSemnale.marime({ intrare: n.intrare.pret, stop: n.stop, cont: p.tot, fx: t212Fx(), riscPct: p.v.riscPct, deja: p.deja, liber: p.liber, pretAcum: p.st && p.st.pret });
  if (!mPo || mPo.blocat || mPo.pesteLiber || mPo.plin) return null;
  return mPo;
}
// v100.169 (Sizerul din market-events): planul scris de el la „am deja un plan în minte”, peste prețurile calculate; null fără plan scris
function t212PlanPoarta(p) {
  var pm = p && p.planMeu, n = p && p.niv;
  if (!pm || !pm.scris || !n || n.nivel !== "ok") return null;
  var stop = pm.stop || (p.stopP && p.stopP.alTau ? p.stopP.stop : null);
  return ActiuniSemnale.planulMeu({ intrare: pm.intrare, stop: stop, tinta: pm.tinta, riscPct: pm.riscPct, riscImplicit: p.v && p.v.riscPct ? p.v.riscPct * 100 : null, cont: p.tot, fx: t212Fx(), deja: p.deja, liber: p.liber, pretAcum: p.st && p.st.pret, calc: { intrare: n.intrare ? n.intrare.pret : p.st.pret, stop: n.stop, tinta: n.tinta } });
}
function t212PlanPoartaHtml(p, pl) {
  var n = p.niv, c = function (et, v, cls, sub) { return '<div><span class="tbEt2">' + et + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</b><span class="tbSub">' + sub + '</span></div>'; };
  var m = t212MarimeAfisata(pl.m, pl.intrare), fara = t212FaraSuma(p), arata = !fara && p.v && p.v.nivel === "cumpara" && m && !m.blocat && !m.pesteLiber && !m.plin && !pl.eroare;   /* v100.222: bucăți doar pe verde */
  var cat = fara ? escapeHtml(t212TextFaraSuma(fara)) : pl.eroare ? '<span class="bad">⚠ ' + escapeHtml(pl.eroare) + '</span>' : !m ? "citește întâi contul"
    : t212CatText(m, p.simbol) + (pl.castig !== null ? " · la țintă câștigi ~" + t212Suma(pl.castig * (m.k || 1)) : "") + " · comision dus-întors ~" + t212Suma(m.comision) + escapeHtml(t212NotaRec(p));
  return '<div class="t212PretGrid">'
    + c("Intrare" + (pl.ale.intrare ? " · a ta" : " (ordin limită)"), t212Usd(pl.intrare), "", t212Pct(pl.intrare / p.st.pret - 1) + " față de acum" + (pl.ale.intrare ? " · calculată " + (n.intrare ? t212Usd(n.intrare.pret) : "—") : ""))
    + c("Stop" + (pl.ale.stop || (p.stopP && p.stopP.alTau) ? " · al tău" : ""), t212Usd(pl.stop), "bad", t212Pct(pl.stop / pl.intrare - 1) + " de la intrare · calculat " + t212Usd(n.stop))
    + c("Țintă" + (pl.ale.tinta && pl.tinta !== null ? " · a ta" : ""), pl.tinta !== null ? t212Usd(pl.tinta) : "—", "good", pl.tinta !== null ? t212Pct(pl.tinta / pl.intrare - 1) + " · câștig/risc " + pl.rr.toFixed(1).replace(".", ",") + " : 1" : "")
    + c("Cât cumperi · pe planul tău", arata ? t212Bucati(m.bucati, pl.intrare) : "—", "", arata ? cat : "nu cumpăr acum — vezi verdictul de sus") + '</div>'
    + pl.avert.map(function (a) { return '<p class="tbWarn">⚠️ ' + escapeHtml(a) + '</p>'; }).join("");
}
function t212PreturiPoarta(p) {
  var n = p.niv;
  if (!n || n.nivel !== "ok") return n ? '<p class="tbSub">🎯 ' + escapeHtml(n.motiv || "") + '</p>' : "";
  var pl = t212PlanPoarta(p);
  if (pl) return '<div class="t212Preturi"><div class="t212PretCap"><b>🎯 Planul tău pentru ' + escapeHtml(p.simbol) + '</b><span class="tbSub">' + escapeHtml(t212ProbaText(n)) + '</span></div>' + t212PlanPoartaHtml(p, pl)
    + (n.proba.medie !== null && n.proba.medie <= 0 ? '<p class="tbWarn">⚠️ Pe istoricul ei, în starea de acum, niciun stop (1,5–3× ATR (media simplă pe 14 zile)) n-a ieșit pe plus în medie: aș sări peste ea.</p>' : '') + '</div>';
  // fara intrare (trend jos) sau poarta pe "nu" -> nu dau o marime de cumparare: ar contrazice verdictul (regula sta in t212MarimePoarta)
  var baza = n.intrare ? n.intrare.pret : p.st.pret, cumpar = !!n.intrare && p.v && p.v.nivel === "cumpara", fara = t212FaraSuma(p), m = fara ? null : t212MarimeAfisata(t212MarimePoarta(p), baza);   /* v100.222: AȘTEAPTĂ nu e cumpărare. audit 23.10: bucățile în jos, suma din ele */
  return '<div class="t212Preturi"><div class="t212PretCap"><b>🎯 Prețurile calculate pentru ' + escapeHtml(p.simbol) + '</b><span class="tbSub">' + escapeHtml(t212ProbaText(n)) + '</span></div><div class="t212PretGrid">'
    + '<div><span class="tbEt2">Intrare (ordin limită)</span><b>' + (n.intrare ? t212Usd(n.intrare.pret) : "—") + '</b><span class="tbSub">' + escapeHtml(n.intrare ? n.intrare.motiv + (n.intrare.pret < p.st.pret ? " · " + t212Pct(n.intrare.pret / p.st.pret - 1) + " față de acum" : "") : n.intrareMotiv) + '</span></div>'
    + '<div><span class="tbEt2">Stop' + (n.intrare ? "" : " (dacă o cumperi totuși)") + '</span><b class="bad">' + t212Usd(n.stop) + '</b><span class="tbSub">' + t212Pct(-n.riscPct) + (n.intrare ? ' de la intrare' : ' de la prețul de acum') + (p.planScris ? " · ai scris tu alt stop — poarta îl folosește pe al tău" : "") + '</span></div>'
    + '<div><span class="tbEt2">Țintă</span><b class="good">' + t212Usd(n.tinta) + '</b><span class="tbSub">' + t212Pct(n.tinta / baza - 1) + ' (2× riscul)</span></div>'
    + '<div><span class="tbEt2">Cât cumperi</span><b>' + (m ? t212Bucati(m.bucati, baza) : "—") + '</b><span class="tbSub">' + escapeHtml(fara ? t212TextFaraSuma(fara) : m ? t212CatText(m, p.simbol) + " · comision dus-întors ~" + t212Suma(m.comision) + ", deci ieși pe zero abia la +0,3%" + t212NotaRec(p) : !cumpar || (p.v && p.v.nivel === "fara-date") ? "nu cumpăr acum — vezi verdictul de sus" : t212FaraMarime(p) ? "Trend 12 luni e în probă: nu dau o sumă până nu zice bilanțul robotului „probat”" : p.tot > 0 && !t212Fx() ? "lipsește cursul dolar/leu (BNR și istoricul T212 n-au venit)" : "citește întâi contul") + '</span></div></div>'
    + (n.proba.medie !== null && n.proba.medie <= 0 ? '<p class="tbWarn">⚠️ Pe istoricul ei, în starea de acum, niciun stop (1,5–3× ATR (media simplă pe 14 zile)) n-a ieșit pe plus în medie: aș sări peste ea.</p>' : '') + '</div>';
}
// v89: biletul la intrare - partea despre TINE: situatiile asemanatoare din istoricul tau, rezultatele, stirile, piata
function t212BiletTu(p) {
  var j = t212Jurnal(), st = p.st, n = p.niv, h = "";
  var m = t212MarimePoarta(p);   /* v100.196 (🟡1): aceeași sumă ca „Cât cumperi” */
  var sit = j && typeof Consilier !== "undefined" ? Consilier.situatiiAsemanatoare(j.p.inchise, t212.cf || {}, { dupaMiscare: !!(st.miscare && st.miscare.mare), langaMax7z: st.distMax7z !== null && st.distMax7z > -0.02, trendJos: st.trend.dir === "jos", suma: m ? m.suma : null, ticker: p.ticker }) : [];
  h += '<div class="t212Bilet"><h5>🧾 Ce spune istoricul tău</h5>' + (p.sit ? '<p class="' + (p.sit.toate.n >= 10 && p.sit.toate.median < 0 ? "tbWarn" : "tbSub") + '">📊 ' + escapeHtml(ActiuniSemnale.textSituatie(p.sit)) + '</p>' : '') + (sit.length ? '<ul class="t212Motive">' + sit.map(function (x) { return '<li class="' + (x.total < 0 ? "bad" : "good") + '">' + escapeHtml(x.text) + '</li>'; }).join("") + '</ul>' : '<p class="tbSub">Nimic asemănător în istoricul tău' + (j ? "" : " (istoricul se strânge acasă)") + '.</p>');
  var z = p.rezultate ? Math.ceil((Date.parse(p.rezultate + "T12:00:00Z") - Date.now()) / 86400000) : null;
  if (z !== null && z >= 0) h += '<p class="' + (z <= 10 ? "tbWarn" : "tbSub") + '">🗓️ Rezultatele trimestriale: ' + t212ZiScurta(p.rezultate) + (z <= 10 ? " — peste " + t212Cate(z, "zi", "zile") + ": prețul poate sări 10–20% într-o noapte." : "") + '</p>';
  if (t212.piata) h += '<p class="tbSub">📈 Piața azi: ' + escapeHtml(t212.piata.text) + '</p>';
  h += t212StiriHtml(p.stiri, 3) + '</div>';
  return h;
}
function t212StiriHtml(l, max) {
  var s = (Array.isArray(l) ? l : []).slice(0, max || 3);
  if (!s.length) return "";
  return '<ul class="t212Stiri">' + s.map(function (x) { return '<li><a href="' + escapeHtml(x.link) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(x.titlu) + '</a> <span class="tbSub">' + (x.la ? escapeHtml(new Date(x.la).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })) : "") + '</span></li>'; }).join("") + '</ul>';
}
var T212_SURSA = { istoric: "istoricul tău", pozitie: "poziția", piata: "piața", stiri: "știri" };
function t212SfaturiHtml(l) {
  if (!l || !l.length) return "";
  return '<div class="t212Sfaturi"><h5>💡 Sfaturi</h5>' + l.map(function (x) {
    return '<div class="t212Sfat t212Sfat-' + x.nivel + '"><span class="t212Sursa">' + escapeHtml(T212_SURSA[x.sursa] || x.sursa) + '</span><b>' + escapeHtml(x.titlu) + '</b>' + (x.text ? ' <span class="tbSub">' + escapeHtml(x.text) + '</span>' : '') + (x.ceAsFace ? '<div class="t212SfatFac">👉 ' + escapeHtml(x.ceAsFace) + '</div>' : '') + (x.stiri ? t212StiriHtml(x.stiri, 4) : '') + '</div>';
  }).join("") + '</div>';
}
// raspunsul rutei -> "Piata azi" (barele zilnice ale rutei au forma randurilor Pionex)
function t212PiataDin(pz) {
  if (!pz || typeof Consilier === "undefined") return null;
  // v92: barele zilnice de bursa, CU ultima zi (bare() o scotea: "ultima zi" arata ziua de dinainte)
  var b = function (r) { return Array.isArray(r) && r.length ? GridCalcul.bareToate(r) : null; };
  return Consilier.piata({ qqq: b(pz.qqq), spy: b(pz.spy), vix: b(pz.vix), fg: pz.fg });
}
function piataAziRender() {
  var p = t212.piata;
  document.querySelectorAll("[data-piata-azi]").forEach(function (el) {
    var hP = (!p ? '<span class="tbSub">Piața azi: aduc datele…</span>' : '<b>Piața azi</b> ' + p.parti.map(function (x) { return '<span>' + escapeHtml(x.et) + ': ' + (Array.isArray(x.bucati) && x.bucati.length ? x.bucati.map(function (y) { return '<b class="' + (y.cls || "") + '">' + escapeHtml(y.t) + '</b>'; }).join("") : '<b class="' + (x.cls || "") + '">' + escapeHtml(x.val) + '</b>') + '</span>'; }).join('<span class="contTotSep">·</span>')); if (el._contH !== hP) { el._contH = hP; el.innerHTML = hP; }   /* audit 23.10: doar când s-a schimbat. v100.196: fiecare bucată cu culoarea ei */
  });
}
// v100.177 (el 13.10, „din a doua recomandare 1–4”): (4) profitul așteptat - media pe istoria ei în starea de acum, TRASĂ SPRE ZERO după câte
// ferestre independente are (n/20; ~10 ferestre ⇒ o treime din medie), plus trade-urile tale de până acum; (2) corelația cu ce ai deja (seriile
// din raportul contului întreg) și cât crește riscul pe o zi al contului dacă intri (VaR 95 % pe aceleași zile). Informează, nu schimbă verdictul.
function t212PoartaCont(p) {
  var h = "", n = p && p.niv, P = function (x, z) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(z == null ? 1 : z).replace(".", ",") + "%"; };
  try {
    if (n && n.nivel === "ok" && n.proba && n.proba.medie != null && n.proba.n > 0) {
      // v100.196 (auditul sever 14.10, 🟡14, backtest-expert): media e pe ACELEAȘI zile pe care s-a ales stopul (cel mai bun din 4), fără spread și
      // fără gap la intrare, pe ferestre de 20 de zile care se suprapun ⇒ sub 30 de ferestre independente nu dau o cifră de profit; peste, cu ~0,2%
      // spread și alunecare scăzute (ipoteză, nemăsurată pe umplerile tale)
      var ni = n.proba.nIndep != null ? n.proba.nIndep : Math.floor(n.proba.n / 20), SLIP = 0.002, e = n.proba.medie * ni / (ni + 20) - SLIP, m = t212FaraSuma(p) ? null : t212MarimePoarta(p), putine = ni < 30;
      var j = t212Jurnal(), al = j ? j.p.inchise.filter(function (x) { return x.pct != null && isFinite(x.pct); }) : [], mAl = al.length ? al.reduce(function (s, x) { return s + x.pct; }, 0) / al.length : null;
      h += '<p class="' + (!putine && e > 0 ? "tbSub" : "tbWarn") + '">' + (!putine && e > 0 ? "📈" : "📉") + ' <b>Profit așteptat:</b> '
        + escapeHtml(putine ? "prea puține cazuri ca să spun o cifră (~" + t212Cate(ni, "fereastră independentă", "ferestre independente") + " de 20 de zile; trebuie cel puțin 30)" : P(e, 1) + " pe trade după comision și ~0,2% spread" + (m && m.suma > 0 ? "; la ~" + t212Suma(m.suma) + " ≈ " + t212Lei(m.suma * e) : ""))
        + escapeHtml(". Media pe istoria ei în starea de acum, " + P(n.proba.medie, 1) + ", e aleasă pe aceleași date (cel mai bun stop din 4), fără spread și fără gap la intrare: nedovedită")
        + (mAl !== null && al.length >= 10 ? escapeHtml(". Trade-urile tale de până acum: " + P(mAl) + " în medie (" + t212Cate(al.length, "vânzare", "vânzări") + ")") : "")
        + (n.proba.medie <= 0 ? ". Fără avantaj măsurat: aș sări peste." : ".") + "</p>";
    }
    var r = typeof ciStare !== "undefined" ? ciStare.raport : null;
    if (r && r.serii && typeof ContIntreg !== "undefined" && p.bare && p.bare.length > 60) {
      var rc = ContIntreg.randamente(p.bare), nume = {}, semn = {}; (r.expuneri || []).forEach(function (x) { nume[x.cheie] = x.nume; semn[x.cheie] = (semn[x.cheie] || 0) + (x.lei || 0); });
      var la = [], sine = false;
      Object.keys(r.serii).forEach(function (k) {
        if (k === "T:" + p.ticker) { sine = true; return; }   /* v100.196 (🔴1): se spune mai jos, nu tăcut */
        var s = r.serii[k], z = Object.keys(s).filter(function (d) { return rc[d] !== undefined; }); if (z.length < 40) return;
        var rho = ContIntreg.corel(z.map(function (d) { return rc[d]; }), z.map(function (d) { return s[d]; })); if (rho !== null && rho * (semn[k] < 0 ? -1 : 1) >= 0.6) la.push({ nume: nume[k] || k.slice(2), rho: rho });   /* (revizia, M13): cu un short corelat e acoperire */
      });
      la.sort(function (a, b) { return b.rho - a.rho; });
      var mm = t212FaraSuma(p) ? null : t212MarimePoarta(p), pnl = r.risc && r.risc.pnl, v0 = null, v1 = null;
      if (mm && mm.suma > 0 && pnl && pnl.length >= 60) { var q0 = ContIntreg.varEs(pnl.map(function (x) { return x[1]; }), 0.95), q = ContIntreg.varEs(pnl.map(function (x) { return x[1] + mm.suma * (rc[x[0]] || 0); }), 0.95); v0 = q0 ? q0.var : null; v1 = q && v0 !== null ? q.var : null; }
      // v100.178 (4): mărimea „cu risc egal” - ținta contului de 15 % pe an împărțită egal pe poziții; (1) concentrarea pe sector după intrare
      if (typeof Factori !== "undefined" && r.valoare && r.valoare.total > 0) {
        var sz = Factori.sigmaZi(p.bare, 60), nPoz = (r.expuneri || []).filter(function (x) { return x.clasa === "actiuni"; }).length, mv = Factori.marimeVol(sz, r.valoare.total, 0.15, nPoz);
        if (mv) h += '<p class="tbSub">⚖️ <b>Mărimea cu risc egal:</b> ~' + escapeHtml(t212Suma(mv.lei)) + " (se mișcă ~" + escapeHtml(P(sz)) + " pe zi; ținta contului de 15% pe an, împărțită pe " + escapeHtml(t212Cate(mv.pozitii, "poziție", "poziții")) + ")" + (mm && mm.suma > 0 ? escapeHtml(" - planul cu 1% risc dă ~" + t212Suma(mm.suma)) : "") + ".</p>";
        var fa = r.factori, sec = t212.sectorCand && t212.sectorCand.s === p.simbol ? t212.sectorCand.v : null;
        if (!t212.sectorCand || t212.sectorCand.s !== p.simbol) { t212.sectorCand = { s: p.simbol, v: null }; getJSON("/api/istoric-bot?action=sector&s=" + encodeURIComponent(p.simbol)).then(function (d) { t212.sectorCand = { s: p.simbol, v: d && d.sector || "" }; if (t212.poarta && t212.poarta.simbol === p.simbol) t212RenderPoarta(); }).catch(function () {}); }
        if (sec && fa && fa.actiuniLei > 0 && mm && mm.suma > 0) {
          var s0 = (fa.sectoare || []).filter(function (x) { return x.nume === sec; })[0], dupa = ((s0 ? s0.lei : 0) + mm.suma) / (fa.actiuniLei + mm.suma);
          if (dupa > 0.4) h += '<p class="tbWarn">🧩 <b>Concentrare:</b> cu ea, ' + escapeHtml(Factori.sectorNume(sec)) + " ar fi " + escapeHtml(Math.round(dupa * 100) + "%") + " din acțiunile tale (pragul: 40%).</p>";
        }
      }
      if (sine) h += '<p class="tbWarn">🔗 <b>O ai deja:</b> corelația e socotită fără ea însăși, dar cumpărarea de acum se adaugă la aceeași poziție, nu face una nouă.</p>';
      if (la.length) h += '<p class="tbWarn">🔗 <b>Se mișcă la fel cu ce ai deja:</b> ' + escapeHtml(la.slice(0, 3).map(function (x) { return x.nume + " (ρ " + x.rho.toFixed(2).replace(".", ",") + ")"; }).join(", ")) + ". Ar fi același risc de două ori, nu o poziție nouă.</p>";
      if (v1 !== null) h += '<p class="tbSub">🧮 Riscul pe o zi al contului (ziua proastă, 1 din 20): ~' + escapeHtml(t212Suma(v0)) + " → ~" + escapeHtml(t212Suma(v1)) + (v0 > 0 ? " (" + escapeHtml(P(v1 / v0 - 1, 0)) + ")" : "") + " dacă intri cu ~" + escapeHtml(t212Suma(mm.suma)) + ".</p>";
    }
  } catch (e) {}
  return h;
}
// v100.261 (27.10, el: „linia vreau să cumpăr întinde f mult pagina în jos lăsând un mare gol”): cu raport pe ecran, grila Trading 212 își schimbă
// așezarea (app.css, de la 1101 px: panoul pe toată lățimea sub poziții, raportul pe coloane); eroarea și golul o lasă cum era
function t212CuRaport(out, da) { var g = out && out.closest ? out.closest(".t212Grila") : null; if (g) g.classList.toggle("t212CuRaport", !!da); }
function t212RenderPoarta() {
  var out = $("t212PoartaRez"), p = t212.poarta; if (!out || !p) return;
  if (p.eroare) { t212CuRaport(out, false); out.innerHTML = '<p class="bad">' + escapeHtml(p.eroare) + '</p>'; return; }
  var n = T212_POARTA[p.v.nivel] || T212_POARTA["fara-date"], st = p.st;
  // v100.69 (sfaturile concise, pachetul 4): „Ce aș face eu” = o actiune la persoana I, ≤ 110; lectia NPA pe randul de sub ea
  // v100.196 (auditul sever 14.10, 🟡1): „Ce aș face eu” spune suma din „Cât cumperi” (aceeași funcție), nu 20% din cont
  var planMotiv = p.v.motive.some(function (m) { return /plan de ieșire/.test(m); });
  var fara = t212FaraSuma(p);
  var fac = ActiuniSemnale.facPoarta(p.v.nivel, t212MarimePoarta(p), { faraMarime: t212FaraMarime(p), motivPlan: planMotiv, faraSuma: fara, regimNedovedit: t212RegimNedovedit() });   // v100.71 (I4): functie pura, generata si masurata de garda
  var zu = st.ultima ? new Date(st.ultima).toISOString() : "";
  t212CuRaport(out, true);
  out.innerHTML = '<div class="t212Verdict ' + n[1] + '"><b>' + n[0] + ' · ' + escapeHtml(p.simbol) + '</b><span class="tbSub">' + escapeHtml(p.inchisa ? p.inchisa.eticheta : "acum") + ' ' + t212Usd(st.pret) + (p.extins ? ' · ' + escapeHtml(p.extins.text) : '') + (zu ? ' · ultima zi închisă ' + zu.slice(8, 10) + '.' + zu.slice(5, 7) : '') + ' · trend ' + escapeHtml(st.trend.dir) + ' · față de maximul pe 7 zile ' + t212Pct(st.distMax7z) + ' · pe 52 săpt. ' + t212Pct(st.distMax52) + '</span></div>'
    + '<p class="t212Fac t212FacPoarta">👉 <b>Ce aș face eu:</b> ' + escapeHtml(fac) + '</p>'
    + t212LinieCal()
    + (p.v.motive.length ? '<ul class="t212Motive">' + p.v.motive.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join("") + '</ul>' : '<p class="good">Nimic de obiectat.</p>')
    + (p.v.note || []).map(function (x) { return '<p class="tbWarn">⚠️ ' + escapeHtml(x) + '</p>'; }).join("")   /* v100.196: spuse, fără să schimbe verdictul */
    + (p.inchisa ? '<p class="tbWarn">⚠️ ' + escapeHtml(p.inchisa.avertisment) + '</p>' : '')   /* v100.267 (auditul 29.10): bursa închisă ⇒ saltul de la deschidere */
    + (p.gasitDupaNume ? '<p class="tbWarn">⚠️ Prețurile sunt găsite după NUMELE firmei, nu după simbol: verifică în Trading 212 că e aceeași firmă.</p>' : '')
    + (t212FaraMarime(p) ? '<p class="tbWarn">⚠️ Vine din Trend 12 luni, care e în probă: verdictul e al Porții, dar nu dau o sumă până nu zice bilanțul robotului „probat”.</p>' : '')
    + t212PreturiPoarta(p)
    + t212ProfilPoarta(p)
    + t212PoartaCont(p)   /* v100.177: profitul așteptat + ce se mișcă la fel cu ce ai deja + riscul pe o zi al contului */
    + t212BiletTu(p)
    + (p.v.nivel === "asteapta" && planMotiv ? '<p class="tbSub">Fără un plan scris, NPA a crescut prin cumpărări în jos la 33.000 de lei și a costat 8.165 lei.</p>' : '')
    + (typeof Consiliu !== "undefined" && Consiliu.LEGENDA_ACTIUNI ? '<p class="tbSub tbConsLeg">' + escapeHtml(Consiliu.LEGENDA_ACTIUNI) + '</p>' : '');   // v100.71 (I2): avertizarile comune, si aici
}

// ---------------- jurnalul de actiuni ----------------
var t212JurnalCache = { n: -1, v: null };
function t212Jurnal() {
  var u = t212.istoric && Array.isArray(t212.istoric.umpleri) ? t212.istoric.umpleri : null;
  if (!u || !u.length) return null;
  if (t212JurnalCache.n === u.length && t212JurnalCache.v) return t212JurnalCache.v;
  var p = T212.perechi(u), r = ActiuniSemnale.rezumatJurnal(p.inchise, { umpleri: u, cf: t212.cf || {} });
  t212JurnalCache = { n: u.length, v: { p: p, r: r, u: u } };
  return t212JurnalCache.v;
}
var jtFiltru = (function () { try { var v = localStorage.getItem("jtFiltru"); return v === "actiuni" || v === "tot" ? v : "crypto"; } catch (e) { return "crypto"; } })();
function jtAlegeFiltru(f) {
  jtFiltru = f === "actiuni" || f === "tot" ? f : "crypto";
  try { localStorage.setItem("jtFiltru", jtFiltru); } catch (e) {}
  jtAplicaFiltru();
  if (jtFiltru !== "crypto" && !t212.istoric && !t212.inLucru) t212Porneste(false);
}
function jtAplicaFiltru() {
  var a = $("jtCrypto"), b = $("jtActiuni");
  if (a) a.hidden = jtFiltru === "actiuni";
  if (b) b.hidden = jtFiltru === "crypto";
  // v100.22: pe „Tot” statistica comuna, in lei, deasupra; cea a fiecarei piete ramane pe fila ei
  var st = $("jtStatTot"), sc = $("jtStatCrypto");
  if (st) st.hidden = jtFiltru !== "tot";
  if (sc) sc.hidden = jtFiltru === "tot";
  if (jtFiltru === "tot" && typeof jtStatRender === "function") jtStatRender("tot");
  ["crypto", "actiuni", "tot"].forEach(function (k) { var e = $("jtF-" + k); if (e) e.setAttribute("aria-pressed", String(jtFiltru === k)); });
  if (jtFiltru !== "crypto") jtRenderActiuni();
}
function jtRenderActiuni() {
  var box = $("jtActiuni"); if (!box || box.hidden) return;
  var j = t212Jurnal();
  // v100.220: cardul scorului T212 stă sus și fără istoric (0 trade-uri, „ziua 1”) - fila se rescrie toată, deci îl desenăm după
  if (!j) { box.innerHTML = (jtFiltru === "actiuni" ? '<div id="jtScorT212"></div>' : "") + '<div class="tbBloc"><p class="tbSub">' + escapeHtml(t212.inLucru ? "citesc istoricul Trading 212…" : t212.istoricEroare || "Istoricul Trading 212 nu e încă strâns: colectorul de acasă îl coboară (o pagină la 11 s), apoi apare aici.") + '</p></div>'; if (typeof scDeseneaza === "function") scDeseneaza(); return; }
  var r = j.r, l = j.p.inchise, P = t212Pct, L = function (v) { return t212Lei(v); }, cls = t212Cls;
  var cel = function (et, v, c, sub) { return '<div class="tbKpiCel"><span class="tbEt2">' + escapeHtml(et) + '</span><b class="tbKpiVal ' + (c || "") + '">' + escapeHtml(v) + '</b>' + (sub ? '<span class="tbSub">' + escapeHtml(sub) + '</span>' : "") + '</div>'; };
  var st = t212.istoric.stare || {}, h = '<h3 class="jtTitluPiata">📈 Acțiuni · Trading 212</h3>' + (jtFiltru === "actiuni" ? '<div id="jtScorT212"></div><div id="jtStatActiuni"></div>' : "");   // v100.22: statistica T212 sus pe fila ei   // v100.220: + scorul sezonului T212
  h += '<div class="tbKpi jtKpi">' + cel("Câștigat REAL", L(r.total), cls(r.total), t212Cate(r.n, "trade", "trade-uri") + ", " + r.pePlus + " pe plus (" + P(r.n ? r.pePlus / r.n : null).replace("+", "") + ")" + (t212.dividende && t212.dividende.n ? " · + dividende " + t212Lei(t212.dividende.total, 2) : ""))
    + cel("T212 îți arată", L(r.totalOficial), "", "fără comisioane") + cel("Comisioane de conversie", L(-r.comisioane), "bad", "0,15% la fiecare schimb lei↔dolari")
    + cel("Vândute în afara orelor", L(r.ext.total), cls(r.ext.total), t212Cate(r.ext.n, "trade", "trade-uri")) + '</div>';
  h += t212Cireasa(l);
  // v100.69 (sfaturile concise, pachetul 4): avertizarile comune o data, sus (blocurile de mai jos nu le mai repeta - ex. „Dacă ascultai de poartă”)
  if (typeof Consiliu !== "undefined" && Consiliu.LEGENDA_ACTIUNI) h += '<p class="tbSub tbConsLeg">' + escapeHtml(Consiliu.LEGENDA_ACTIUNI) + '</p>';
  if (!st.complet) h += '<p class="tbWarn">Istoricul încă se coboară (' + t212Cate(st.ordine || 0, "ordin", "ordine") + ' până acum) — cifrele cresc până se termină.</p>';
  // pe durata: aici s-a vazut unde se duc banii
  var g = [["sub o zi", 0, 24], ["1–7 zile", 24, 168], ["1–4 săptămâni", 168, 672], ["peste o lună", 672, Infinity]].map(function (x) {
    var s = l.filter(function (t) { return t.durataOre >= x[1] && t.durataOre < x[2]; }), tot = 0, com = 0, plus = 0;
    s.forEach(function (t) { tot += t.rezultat; com += t.comisioane || 0; if (t.rezultat > 0) plus++; });
    return { et: x[0], n: s.length, tot: tot, com: com, plus: plus };
  });
  var cea = g.slice().sort(function (a, b) { return a.tot - b.tot; })[0];
  h += '<div class="tbBloc"><div class="tbBlocCap"><h4>Cât ai ținut — și ce a ieșit</h4><span class="tbSub">rezultat real, după comisioane</span></div><div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Ținut</th><th>Trade-uri</th><th>Pe plus</th><th>Comisioane</th><th>Real</th></tr></thead><tbody>'
    + g.map(function (x) { return '<tr><td>' + x.et + '</td><td>' + x.n + '</td><td>' + (x.n ? Math.round(x.plus / x.n * 100) + "%" : "—") + '</td><td class="bad">' + L(-x.com) + '</td><td class="' + cls(x.tot) + '"><b>' + L(x.tot) + '</b></td></tr>'; }).join("") + '</tbody></table></div>'
    + (cea && cea.tot < 0 ? (function (sf) { return '<p class="tbFac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(sf.fac) + '</p><p class="tbSub">Banii se pierd pe trade-urile ținute ' + escapeHtml(cea.et) + ' (' + L(cea.tot) + '): pe cele rămase pe minus și lăsate „să-și revină”.' + (sf.nota ? ' ' + escapeHtml(sf.nota) : '') + '</p>'; })(t212SfatStop(l)) : '') + '</div>';
  h += t212StopBloc(l) + t212ReguliBloc(l) + t212DeclaratieBloc(l);
  // greselile cu costul lor
  h += '<div class="tbBloc"><div class="tbBlocCap"><h4>Greșelile care te-au costat</h4><span class="tbSub">găsite automat; suma = rezultatul trade-urilor care le-au avut</span></div>'
    + (r.greseli.length ? '<div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Greșeala</th><th>De câte ori</th><th>Rezultatul lor</th></tr></thead><tbody>' + r.greseli.map(function (x) { return '<tr><td><b>' + escapeHtml(x.text) + '</b></td><td>' + x.n + '</td><td class="' + cls(x.cost) + '">' + L(x.cost) + '</td></tr>'; }).join("") + '</tbody></table></div>' : '<p class="good">Nicio greșeală găsită automat.</p>') + '</div>';
  // cele mai mari pierderi
  var mari = l.slice().sort(function (a, b) { return a.rezultat - b.rezultat; }).slice(0, 5).filter(function (t) { return t.rezultat < 0; });
  if (mari.length) h += '<div class="tbBloc"><div class="tbBlocCap"><h4>Cele mai mari 5 pierderi</h4><span class="tbSub">' + L(mari.reduce(function (s, t) { return s + t.rezultat; }, 0)) + ' împreună</span></div><ul class="grLista">' + mari.map(function (t) { return '<li><b>' + escapeHtml(T212.simbol(t.ticker)) + '</b> <span class="bad">' + L(t.rezultat) + '</span> (' + P(t.pct) + ', ținut ' + t212Cate(Math.round(t.durataOre / 24), "zi", "zile") + ', ' + new Date(t.inchis).toLocaleDateString("ro-RO") + ')</li>'; }).join("") + '</ul></div>';
  // fiecare trade (cele mai noi 150)
  var cfm = t212.cf || {}, note = typeof jtNote === "function" ? jtNote() : {}, data = function (t) { return new Date(t).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); };
  h += '<details class="tbPl jtPl" id="jtPl-actiuni"><summary><b>Fiecare trade</b><span class="tbSub">cele mai noi ' + Math.min(150, l.length) + ' din ' + l.length + ' · o vânzare = un trade</span></summary>' + l.slice(0, 150).map(function (t) {
    var gr = ActiuniSemnale.greseli(t, { umpleri: j.u }), cfg = cfm[t.id] && cfm[t.id].greseli || [], dur = t.durataOre < 24 ? Math.max(1, Math.round(t.durataOre)) + " h" : t212Cate(Math.round(t.durataOre / 24), "zi", "zile"), id = "t212-" + t.id;
    cfg.forEach(function (k) { if (ActiuniSemnale.TEXT[k] && !gr.some(function (x) { return x.cod === k; })) gr.push({ cod: k, text: ActiuniSemnale.TEXT[k] }); });
    return '<div class="jtTrade"><div class="jtCap"><b>' + escapeHtml(T212.simbol(t.ticker)) + '</b> <span class="tbSub">' + escapeHtml(t212Bucati(t.qty, t.pretCumparare > 0 ? t.pretCumparare : t.pretVanzare) + " · " + t212Usd(t.pretCumparare) + " → " + t212Usd(t.pretVanzare) + " · " + data(t.pornit) + " → " + data(t.inchis) + " (" + dur + ")" + (t.extVanzare ? " · vândut în afara orelor" : "")) + '</span><b class="jtRez ' + cls(t.rezultat) + '">' + L(t.rezultat) + ' <span class="tbSub">' + P(t.pct) + '</span></b></div>'
      + '<div class="tbSub">T212 arată ' + L(t.rezultatOficial) + ' · comisioane ' + L(-(t.comisioane || 0)) + (t.partial ? ' · o parte din vânzare n-are cumpărarea în istoric' : '') + '</div>'
      + (cfm[t.id] && cfm[t.id].nivel !== "fara-date" ? '<p class="jtCf">Radarul ar fi zis la cumpărare: <b class="' + (T212_POARTA[cfm[t.id].nivel] || ["", ""])[1] + '">' + escapeHtml((T212_POARTA[cfm[t.id].nivel] || [cfm[t.id].nivel])[0]) + '</b>' + (cfm[t.id].motive && cfm[t.id].motive.length ? ' <span class="tbSub">— ' + escapeHtml(cfm[t.id].motive.join("; ")) + '</span>' : '') + '</p>' : '')
      + (gr.length ? '<ul class="jtGreseli">' + gr.map(function (x) { return '<li><b>' + escapeHtml(x.text) + '</b></li>'; }).join("") + '</ul>' : '')
      + '<textarea class="jtNota" data-id="' + escapeHtml(id) + '" rows="1" placeholder="De ce am cumpărat, ce aș face altfel…">' + escapeHtml(note[id] || "") + '</textarea></div>';
  }).join("") + '</details>';
  box.innerHTML = h;
  if (typeof scDeseneaza === "function") scDeseneaza();   // v100.220: scorul sezonului T212, sus pe filă (fila se rescrie toată)
  if (typeof jtStatRender === "function") { if (jtFiltru === "actiuni") jtStatRender("actiuni"); else if (jtFiltru === "tot") jtStatRender("tot"); }   // v100.22
}
// v87: "cat te-ar fi salvat stopul" - rejucat pe preturile reale (zilnice), din verdictele colectorului
// v88: toate variantele de stop, rejucate pe trade-urile lui: fix (-8/-10/-15%) si care URCA dupa maxim (planul
// Radarului, -15%, -25%). Sfatul se ia din cea mai buna varianta, oricare ar fi ea - inclusiv "fara stop".
var T212_VARIANTE_STOP = [
  { camp: "stop", k: 8, et: "fix, −8% de la cumpărare" }, { camp: "stop", k: 10, et: "fix, −10%" }, { camp: "stop", k: 15, et: "fix, −15%" },
  { camp: "stopU", k: "plan", et: "urcă după maxim — planul Radarului (k×ATR, 3–15%)" }, { camp: "stopU", k: "u15", et: "urcă, −15% de la maxim" }, { camp: "stopU", k: "u25", et: "urcă, −25% de la maxim" }];
function t212Variante(l) {
  var cfm = t212.cf; if (!cfm) return null;
  var rs = ActiuniSemnale.rezumatStop(l, cfm, [8, 10, 15], "stop"), ru = ActiuniSemnale.rezumatStop(l, cfm, ["plan", "u15", "u25"], "stopU");
  var v = T212_VARIANTE_STOP.map(function (x) { var r = x.camp === "stop" ? rs : ru, g = r.praguri[x.k]; return { et: x.et, camp: x.camp, k: x.k, judecate: r.judecate, real: r.real, total: g.total, dif: g.dif, atinse: g.atinse, taiate: g.castigatoareTaiate }; });
  // v100.52: stopul din profilul actiunii - comparat cu −15% DOAR pe trade-urile unde a fost rejucat (aceleasi pentru amandoua), nu rand in tabel
  return { rs: rs, ru: ru, v: v, best: v.slice().sort(function (a, b) { return b.dif - a.dif; })[0], prof: ActiuniSemnale.alegeTrail(l, cfm) };
}
function t212StopBloc(l) {
  var x = t212Variante(l), L = function (v) { return t212Lei(v); };
  if (!x) return "";
  if (!x.rs.judecate && !x.ru.judecate) return '<div class="tbBloc"><div class="tbBlocCap"><h4>✂️ Cât te-ar fi salvat stopul</h4></div><p class="tbSub">Colectorul de acasă rejoacă trade-urile tale cu un stop (40 de acțiuni pe oră). Încă n-a terminat niciunul.</p></div>';
  var rand = function (v) { return '<tr><td>' + escapeHtml(v.et) + '</td><td class="' + t212Cls(v.total) + '"><b>' + L(v.total) + '</b></td><td class="' + t212Cls(v.dif) + '">' + L(v.dif) + '</td><td>' + v.atinse + '</td><td>' + v.taiate + '</td></tr>'; };
  var b = x.best, fara = b.dif <= 0;
  return '<div class="tbBloc"><div class="tbBlocCap"><h4>✂️ Cât te-ar fi salvat stopul</h4><span class="tbSub">trade-urile tale rejucate pe prețurile zilnice reale · ' + x.rs.judecate + ' judecate</span></div>'
    + '<div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Stopul</th><th>Totalul ar fi fost</th><th>Față de ce ai făcut</th><th>Trade-uri oprite</th><th>Din care câștigătoare tăiate</th></tr></thead><tbody>'
    + '<tr><td>fără stop (ce ai făcut)</td><td class="' + t212Cls(x.rs.real) + '"><b>' + L(x.rs.real) + '</b></td><td>—</td><td>—</td><td>—</td></tr>'
    + x.v.map(rand).join("") + '</tbody></table></div>'
    + (x.prof && x.prof.motiv ? '<p class="tbSub">📐 Stopul din profilul acțiunii (coborârea obișnuită pe 5 zile): ' + escapeHtml(x.prof.motiv) + '.</p>' : '')
    // v100.69 (sfaturile concise, pachetul 4): actiunea la persoana I (≤ 110), constatarea pe randul de sub ea - v100.71 (I4): din ActiuniSemnale.facStop
    + (function (fs) { return '<p class="tbFac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(fs.fac) + '</p><p class="tbSub">' + escapeHtml(fs.nota) + '</p>'; })(ActiuniSemnale.facStop(fara, b))
    + '<p class="tbSub">Pe barele zilnice: ziua cumpărării și a vânzării nu intră (nu știm ordinea din zi); la stopul care urcă, maximul vine din zilele de dinainte. Rezultatul = prețul de ieșire față de cel de cumpărare, minus 0,30% comisionul; cursul dolar/leu nu intră. Trade-urile la care prețul găsit nu se potrivește cu al tău (split, alt simbol) nu sunt judecate.</p></div>';
}
// Sfatul pentru pozitiile tinute pe minus vine din proba cu stop, nu dintr-o regula de manual (v87: stopul fix
// strans ar fi iesit MAI RAU pe trade-urile lui). v88: si varianta care urca intra in socoteala.
// v100.69: o actiune la persoana I; ca un stop strans n-ar fi ajutat o spune blocul „Cât te-ar fi salvat stopul”, chiar sub el
// v100.71 (I4): {fac, nota} din ActiuniSemnale.sfatStop (functie pura, generata de garda)
function t212SfatStop(l) {
  var x = t212Variante(l);
  return ActiuniSemnale.sfatStop(!!(x && x.rs.judecate), x && x.best);
}
// v91: raportul pentru Declaratia Unica (anul inchiderii), cu butonul de copiat pentru contabil
// v100.27: si botii spot grid / smart copy (JurnalTrade.alte) - si ei sunt venit de declarat
function t212BotiInchisi() {
  if (typeof jtStare !== "undefined" && jtStare.boti && typeof JurnalTrade !== "undefined") return JurnalTrade.din(jtStare.boti).concat(JurnalTrade.alte(jtStare.boti));
  return typeof contTot !== "undefined" && contTot.inchise ? contTot.inchise.concat(contTot.alteInchise || []) : [];
}
// v100.28: cursul BNR (USD) pe zile pentru Declaratie - anul ales si cel dinainte (1-4 ianuarie iau cursul din decembrie).
// null cat timp anul ales nu e adus (sau n-a putut fi adus) - atunci raportul ramane doar in USDT, iar blocul spune de ce.
function t212CursPentru(an) {
  var C = t212.cursBnr || (t212.cursBnr = {}), gata = true, tot = {};
  [an - 1, an].forEach(function (a) {
    var x = C[a];
    if (!x) {
      C[a] = { stare: "vine" }; gata = false;
      getJSON("/api/curs-bnr?an=" + a).then(function (d) { C[a] = { stare: "ok", curs: d && d.curs || {} }; }, function (e) { C[a] = { stare: "eroare", motiv: String(e && e.message || e).slice(0, 140) }; })
        .then(function () { if (typeof jtRenderActiuni === "function") jtRenderActiuni(); });
      return;
    }
    if (x.stare === "vine") { gata = false; return; }
    if (x.stare === "ok") Object.assign(tot, x.curs);
  });
  return gata && C[an] && C[an].stare === "ok" ? tot : null;
}
// v100.40 (audit 30.09, CRITIC): dividendele se aduceau DOAR din t212Porneste; pe drumul Jurnal -> Acțiuni istoricul era deja
// incarcat pe alta cale, deci Declaratia scria „Dividende 0,00 lei” (real: +18,84 lei in 2025, +32,10 in 2026) - si la fel
// „Copiază pentru contabil” si CSV-ul. Acum: le aduce oricine are nevoie de ele; cat nu sunt citite, se spune, nu se scrie 0.
var t212DivInZbor = null;
function t212AduDividende() {
  if (t212DivInZbor) return t212DivInZbor;
  t212DivInZbor = (async function () {
    try { var dv = await getJSON("/api/t212?action=dividende"); t212.dividendeItems = dv && dv.items || []; t212.dividende = T212.dividende(t212.dividendeItems); t212.dividendeEroare = null; }
    catch (e) { t212.dividende = null; t212.dividendeItems = undefined; t212.dividendeEroare = t212Eroare(e); }
    finally { t212DivInZbor = null; }
  })();
  return t212DivInZbor;
}
// dividendele sunt citite? (null = da; altfel textul de spus in locul cifrei)
function t212DivNecitite() {
  if (Array.isArray(t212.dividendeItems)) return null;
  if (t212.dividendeEroare) return "necitite: " + t212.dividendeEroare;
  if (!t212DivInZbor) t212AduDividende().then(function () { if (typeof jtRenderActiuni === "function") jtRenderActiuni(); });
  return "se încarcă…";
}
function t212RaportDecl(l) {
  var an = t212.anDecl || new Date().getUTCFullYear();
  return T212.raportAnual({ inchise: l, dividende: t212.dividendeItems || [], boti: t212BotiInchisi(), an: an, cursUsd: t212CursPentru(an) });
}
// v100.25: Pionex da istoria pe pagini; anul intreg vine doar din arhiva de acasa (colectorul), completa. Altfel se spune.
function t212PionexIncomplet() {
  var A = typeof jtArhiva !== "undefined" ? jtArhiva : null;
  if (A && A.sursa === "acasa" && A.complet) return "";
  return "⚠️ Pionex: nu e anul întreg — " + (A && A.sursa === "acasa" ? "colectorul de acasă încă strânge istoria boților" : "aici se văd doar ultimii boți (prima pagină Pionex); toată istoria se vede pe pagina de acasă") + ".";
}
function t212DeclaratieBloc(l) {
  var r = t212RaportDecl(l), t = r.t212, px = r.pionex, L = function (v) { return t212Lei(v, 2); }, pxInc = t212PionexIncomplet();
  var ani = r.ani.length ? r.ani : [r.an];
  return '<div class="tbBloc" id="t212Decl"><div class="tbBlocCap"><h4>🧾 Pentru Declarația Unică</h4><span class="tbSub">pe anul vânzării · ' + ani.map(function (a) { return '<button type="button" class="t212BtnLinie' + (a === r.an ? " t212BtnAles" : "") + '" data-action-click="t212AnDeclaratie(' + a + ')">' + a + '</button>'; }).join(" ") + '</span></div>'
    + '<div class="grTabelWrap"><table class="grTabel"><tbody>'
    + '<tr><td>Trading 212 · vânzări în ' + r.an + '</td><td><b>' + t.n + '</b></td></tr>'
    + '<tr><td>Câștiguri (trade-urile pe plus)</td><td class="good"><b>' + L(t.castiguri) + '</b></td></tr>'
    + '<tr><td>Pierderi (trade-urile pe minus)</td><td class="bad"><b>' + L(t.pierderi) + '</b></td></tr>'
    + '<tr><td><b>Câștig NET din acțiuni</b></td><td class="' + t212Cls(t.net) + '"><b>' + L(t.net) + '</b></td></tr>'
    + '<tr><td>Din care comisioane de conversie (deja scăzute)</td><td>' + L(-t.comisioane) + '</td></tr>'
    + '<tr><td>Dividende încasate în ' + r.an + '</td><td>' + (t212DivNecitite() ? '<span class="tbWarn">' + escapeHtml(t212DivNecitite()) + '</span>' : L(t.dividende)) + '</td></tr>'
    + '<tr><td>Pionex · boți închiși în ' + r.an + '</td><td><b>' + px.n + '</b> · NET <b class="' + t212Cls(px.net) + '">' + (px.net >= 0 ? "+" : "−") + Math.abs(px.net).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT</b>'
    + (px.lei !== null ? ' ≈ <b class="' + t212Cls(px.lei) + '">' + L(px.lei) + '</b>' : '') + '</td></tr>'
    // v100.28: Pionex in lei, bot cu bot, la cursul BNR din ziua inchiderii - sau de ce inca nu
    + '<tr><td colspan="2" class="tbSub">' + escapeHtml(px.lei !== null ? "Pionex în lei: fiecare bot la cursul BNR (USD) din ziua închiderii, după ora României; USDT socotit ca USD" + (px.faraCurs ? "; " + t212Cate(px.faraCurs, "bot", "boți") + " fără curs, " + (px.faraCurs === 1 ? "lăsat" : "lăsați") + " afară" : "") + "."
      : t212.cursBnr && t212.cursBnr[r.an] && t212.cursBnr[r.an].stare === "eroare" ? "Cursul BNR nu s-a putut aduce (" + t212.cursBnr[r.an].motiv + "): Pionex rămâne doar în USDT." : "Se aduce cursul BNR, ca să arăt Pionex și în lei…") + '</td></tr>'
    + (pxInc ? '<tr><td colspan="2" class="bad">' + escapeHtml(pxInc) + '</td></tr>' : '')
    + '</tbody></table></div>'
    + '<p class="tbSub">Sumele T212 sunt în lei, la cursul din ziua fiecărei tranzacții (așa le dă Trading 212), cu comisioanele de conversie scăzute. Pionex e în USDT, iar în lei l-am socotit eu la cursul BNR din ziua fiecărei închideri — verifică-l cu contabilul, ca și cotele de impozit și CASS. Eu îți dau cifrele.</p>'
    + '<button type="button" class="t212BtnLinie" data-action-click="t212CopiazaDeclaratia()">Copiază pentru contabil</button> '
    + '<button type="button" class="t212BtnLinie" data-action-click="t212CsvDeclaratie()">⬇ CSV pentru contabil (T212 + Pionex)</button></div>';
}
// v100.34 (30.09, el: „fa idei”): UN SINGUR CSV pentru contabil (in locul celui doar Pionex din v100.31) - vanzarile T212, dividendele
// si botii Pionex din anul ales, cu ziua si cursul BNR folosit si suma in lei; TOTAL pe fiecare sursa
function t212CsvDeclaratie() {
  var j = t212Jurnal(); if (!j) return;
  if (t212DivNecitite()) { toast("Dividendele sunt încă " + t212DivNecitite() + " — CSV-ul ar avea 0 la dividende. Mai încearcă peste câteva secunde.", "bad"); return; }
  var r = t212RaportDecl(j.p.inchise), nt = r.t212.randuri.length;
  if (!nt && !r.pionex.n) { toast("Nimic închis în " + r.an, "bad"); return; }
  var b = new Blob(["﻿" + T212.csvDeclaratie(r)], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = "declaratie-" + r.an + "-pentru-contabil.csv"; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast("CSV-ul e descărcat: " + t212Cate(nt, "rând", "rânduri") + " Trading 212, " + t212Cate(r.pionex.n, "bot", "boți") + " Pionex" + (r.pionex.n && r.pionex.lei === null ? " (Pionex fără lei: cursul BNR nu e încă adus)" : ""), r.pionex.n && r.pionex.lei === null ? "bad" : "good");
}
function t212AnDeclaratie(an) { t212.anDecl = an; if (typeof jtRenderActiuni === "function") jtRenderActiuni(); }
function t212CopiazaDeclaratia() {
  var j = t212Jurnal(); if (!j) return;
  if (t212DivNecitite()) { toast("Dividendele sunt încă " + t212DivNecitite() + " — textul ar avea 0 la dividende. Mai încearcă peste câteva secunde.", "bad"); return; }
  var txt = t212RaportDecl(j.p.inchise).text, pxInc = t212PionexIncomplet();
  if (pxInc) txt += "\n" + pxInc;
  var ok = function () { toast("Copiat — lipește-l în mesajul către contabil", "good"); };
  try { navigator.clipboard.writeText(txt).then(ok, function () { window.prompt("Copiază textul:", txt); }); } catch (e) { window.prompt("Copiază textul:", txt); }
}
// v87: regulile tale, invatate din jurnalul de actiuni
// v100.269 (ideile auditului 29.10): regulă = doar grupa care trece testul pe zile și corecția pe toate grupele (sfatul vine doar din ea);
// grupele care doar arată mai rău stau la „De urmărit (nedovedit)”, fără sfat - pe trade-uri fără efect apăreau ca „reguli” în 66–93% din rulări
function t212ReguliBloc(l) {
  var r = ActiuniSemnale.reguliPersonale(l, "Europe/Bucharest"), urm = r.deUrmarit || [];
  return '<div class="tbBloc"><div class="tbBlocCap"><h4>🧭 Regulile tale (învățate din jurnal)</h4><span class="tbSub">grupe de cel puțin 30 de trade-uri care ies clar mai rău decât restul, peste noroc</span></div>'
    + (!r.suficient ? '<p class="tbSub">' + t212Cate(r.n, "trade", "trade-uri") + ': mai trebuie ' + r.lipsa + '.</p>'
      : (r.reguli.length ? '<ul class="grLista">' + r.reguli.slice(0, 5).map(function (x) { return '<li class="bad">' + escapeHtml(x.text) + '</li>'; }).join("") + '</ul><p class="tbFac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(ActiuniSemnale.facReguli(r.reguli[0].grupa)) + '</p>'
        : '<p class="good">Pe ' + t212Cate(r.n, "trade", "trade-uri") + ' nu văd o grupă care să iasă clar mai rău decât restul.</p>')
      + (urm.length ? '<p class="tbSub">De urmărit (nedovedit: pe zile, diferența poate fi noroc):</p><ul class="grLista">' + urm.slice(0, 3).map(function (x) { return '<li class="warn">' + escapeHtml(x.text) + '</li>'; }).join("") + '</ul>' : '')
      + '<p class="tbSub">' + escapeHtml(ActiuniSemnale.notaReguli(r)) + '</p>') + '</div>';
}

// 🍒 "Daca ascultai de Radar" pe actiuni: verdictul portii la ora fiecarei cumparari (colectorul de acasa)
function t212Cireasa(l) {
  var cfm = t212.cf;
  if (!cfm) return '<p class="tbSub">🍒 „Dacă ascultai de Radar” se socotește pe serverul de acasă.</p>';
  var m = { cumpara: "porneste", asteapta: "asteapta", nu: "nu" };
  var cr = Contrafactual.rezumat(l.map(function (t) { var z = cfm[t.id]; return { t: t, z: { nivel: z && m[z.nivel] || "fara-date" } }; }));
  var toate = l.filter(function (t) { return cfm[t.id]; }).length;
  if (!cr.judecate) return '<p class="tbSub">🍒 „Dacă ascultai de Radar”: colectorul de acasă îl socotește pentru fiecare trade (40 de acțiuni pe oră). ' + (toate ? t212Cate(toate, "trade văzut", "trade-uri văzute") + (toate === 1 ? ', fără prețuri pentru el.' : ', fără prețuri pentru ele.') : 'Încă n-a terminat niciunul.') + '</p>';
  var L = function (v) { return t212Lei(v); }, cls = t212Cls, bine = cr.doarVerde > cr.realJudecate;
  return '<div class="jtCireasa"><h4>🍒 Dacă ascultai de Radar</h4><div class="jtCirGrid">'
    + '<div><span class="tbEt2">Ce ai făcut (pe cei ' + cr.judecate + ' judecați)</span><b class="' + cls(cr.realJudecate) + '">' + L(cr.realJudecate) + '</b></div>'
    + '<div><span class="tbEt2">Dacă cumpărai doar pe 🟢 (' + cr.nVerde + ')</span><b class="' + cls(cr.doarVerde) + '">' + L(cr.doarVerde) + '</b></div>'
    + '<div><span class="tbEt2">Pierderi evitate de 🔴 (' + cr.nBlocate + ')</span><b class="good">' + L(cr.blocateSalvat) + '</b></div>'
    + '<div><span class="tbEt2">Câștiguri pe care 🔴 le-ar fi ratat</span><b class="bad">' + L(-cr.blocateRatat) + '</b></div></div>'
    + '<p class="tbFac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(ActiuniSemnale.facPoartaIstoric(bine, cr.doarVerde - cr.realJudecate)) + '</p>'
    + '<p class="tbSub">Radarul a văzut doar zilele închise înainte de fiecare cumpărare; planul nu intră (atunci nu-l știa). ' + (cr.faraDate ? t212Cate(cr.faraDate, "trade", "trade-uri") + ' fără prețuri (mai ales acțiuni europene — Radarul caută prețuri doar pe bursa americană — și câteva delistate)' + (cr.faraDate === 1 ? ' nu e judecat. ' : ' nu sunt judecate. ') : '') + 'Poarta nu e antrenată pe trade-urile tale, doar aplicată pe ele.</p></div>';
}
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", function () { jtAplicaFiltru(); });

// v87: tot contul pe un rand, sus pe ambele pagini: botii Pionex (USDT, cu echivalentul in lei) si Trading 212 (lei)
var contTot = { boti: null, botiLa: 0, inLucru: false, inchise: null, stiriCrypto: {}, clasament: null, clasamentLa: 0, conturi: null, conturiLa: 0, salt: null, saltLa: 0, sugestii: null, sugestiiLa: 0 };
// v100.97 (el, 05.10: „să afișezi la bot SOLDUL CONTULUI”): soldul Pionex = conturile (spot USDT+USDC, futures manual) + ce valorează
// boții activi (investit + profitul lor). Pe contul lui azi aproape tot stă în bot (spot ~0,006, futures 0, TAKE 42,47 investit).
// conturi = { spot, futures } citite; null / un cont lipsă ⇒ conturiCitite:false și suma e doar „în boți” - nu un „sold” fals de mic.
function contTotSoldPionex(boti, conturi) {
  var inBoti = 0, areBoti = false, faraInvestit = 0;
  (boti || []).forEach(function (b) {
    if (!b || !b.activ) return;
    var inv = Number(b.investit), pr = Number(b.profitTotal);
    if (!isFinite(inv) || inv <= 0) { faraInvestit++; return; }
    inBoti += inv + (isFinite(pr) ? pr : 0); areBoti = true;
  });
  var citite = !!conturi && isFinite(conturi.spot) && conturi.spot !== null && isFinite(conturi.futures) && conturi.futures !== null;
  if (!areBoti && !citite) return null;
  return { sold: inBoti + (citite ? conturi.spot + conturi.futures : 0), inBoti: inBoti, conturiCitite: citite, botiFaraInvestit: faraInvestit };
}
async function contTotStiriCrypto(m) {
  if (!m || contTot.stiriCrypto[m]) return;
  try { var sc = await getJSON("/api/stiri?action=crypto&moneda=" + encodeURIComponent(m)); contTot.stiriCrypto[m] = sc && sc.moneda || []; } catch (e) { contTot.stiriCrypto[m] = []; }
}
// v89: sfaturile consilierului pentru un bot / o moneda (Tablou si fisa Grid)
function consilierBot(b) {
  if (typeof Consilier === "undefined" || !b) return [];
  var m = String(b.baza || b.moneda || "").replace(/\.PERP$/, "").replace(/_USDT.*$/, "");
  return Consilier.sfaturiBot(b, { trades: contTot.inchise || [], fg: t212.fg, stiri: contTot.stiriCrypto[m], acum: Date.now() });
}
// v89: biletul din fisa Grid - partea despre TINE (istoricul pe moneda, regulile tale, frica/lacomia, stirile)
var grBiletCerut = {};
function grBiletTu(f) {
  if (!f || !f.simbol) return "";
  var m = String(f.simbol).replace(/_USDT_PERP$/, "").replace(/_USDT$/, "");
  if (!grBiletCerut[m]) { grBiletCerut[m] = true; contTotAsigura().then(function () { return contTotStiriCrypto(m); }).then(function () { if (typeof renderGrid === "function") renderGrid(); }); }
  var l = consilierBot({ baza: m }), rg = typeof Obiceiuri !== "undefined" && contTot.inchise ? Obiceiuri.reguliPersonale(contTot.inchise, "Europe/Bucharest") : null;
  var h = '<div class="tbBloc grBilet"><div class="tbBlocCap"><h4>🧾 Ce spune istoricul tău</h4><span class="tbSub">înainte să pornești botul pe ' + escapeHtml(m) + '</span></div>';
  h += l.length ? l.map(function (x) { return '<p class="' + (x.nivel === "g" ? "tbWarn" : "") + '"><b>' + escapeHtml(x.titlu) + '</b>' + (x.text ? ' <span class="tbSub">' + escapeHtml(x.text) + '</span>' : '') + (x.ceAsFace ? '<br>👉 ' + escapeHtml(x.ceAsFace) : '') + '</p>' + (x.stiri ? t212StiriHtml(x.stiri, 3) : ''); }).join("") : '<p class="tbSub">N-ai mai avut boți pe ' + escapeHtml(m) + (contTot.inchise ? "" : " (aduc istoricul…)") + '.</p>';
  if (rg && rg.suficient && rg.reguli.length) h += '<p class="tbSub">Regulile tale: ' + rg.reguli.slice(0, 2).map(function (x) { return escapeHtml(x.text); }).join(" · ") + '</p>';
  if (typeof Consiliu !== "undefined" && Consiliu.LEGENDA_COMUNA) h += '<p class="tbSub tbConsLeg">' + escapeHtml(Consiliu.LEGENDA_COMUNA) + '</p>';   // v100.71 (I2): „(puține cazuri)” fara legenda pe fisa
  return h + '</div>';
}
async function contTotAsigura() {
  if (contTot.inLucru) return; contTot.inLucru = true;
  try {
    var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : null;
    if (!boti && Date.now() - contTot.botiLa > 60000) { try { var d = await getJSON("/api/bot-orders"); contTot.boti = d && Array.isArray(d.bots) ? d.bots : []; contTot.botiLa = Date.now(); contTot.botiEroare = null; } catch (e) { contTot.boti = contTot.boti || null; contTot.botiEroare = String(e && e.message || e).slice(0, 80); } }
    // v100.40: contul se reia cand e mai vechi de 60 s (era adus o singura data - Acasa scria „actualizat” peste cifre inghetate)
    // v100.97: conturile Pionex (spot + futures manual) pentru soldul de pe rândul de sus - la 5 min, poarta Pionex e comună cu boții
    if (Date.now() - contTot.conturiLa > 5 * 60000) {
      contTot.conturiLa = Date.now();
      try {
        var cf = await getJSON("/api/pionex-account?action=futures"), cs = await getJSON("/api/pionex-account?action=balances");
        var st = (cs && cs.data && Array.isArray(cs.data.balances) ? cs.data.balances : []).reduce(function (s, x) { return x && (x.coin === "USDT" || x.coin === "USDC") ? s + (Number(x.free) || 0) + (Number(x.frozen) || 0) : s; }, 0);
        contTot.conturi = { spot: st, futures: cf && cf.usdt && cf.usdt.total !== null && isFinite(Number(cf.usdt.total)) ? Number(cf.usdt.total) : null };   /* v100.175 (M11): lipsă = necitit, nu 0 */
      } catch (e) { contTot.conturi = null; }
    }
    if (!t212.cont || Date.now() - (t212.contLa || 0) > 60000) { try { t212.cont = await getJSON("/api/t212?action=cont"); t212.contLa = Date.now(); } catch (e) {} }
    // v100.40: semaforul actiunilor cere pozitiile + preturile lor - le aduce pagina T212 (in fundal, fara s-o deschida); la 5 min
    if (typeof t212Porneste === "function" && !t212.inLucru && (!t212.la || Date.now() - t212.la > 5 * 60000)) t212Porneste(false).then(function () { contTotRender(); if (typeof acasaDeseneaza === "function" && typeof acasaPe === "function" && acasaPe()) acasaDeseneaza(); });
    if (!t212.istoric) { try { t212.istoric = await getJSON("/api/t212?action=istoric"); } catch (e) {} }
    if (!t212.piata) { try { var pz = await getJSON("/api/stiri?action=piata"); t212.piata = t212PiataDin(pz); t212.fg = pz && pz.fg || null; } catch (e) {} }
    // v89: botii inchisi (istoricul lui pe monede) si stirile despre moneda botului de pe Tablou
    // v100.25: toata istoria (arhiva de acasa + prima pagina Pionex), nu doar primii 10
    if (!contTot.inchise && typeof JurnalTrade !== "undefined") { try { var bi = (typeof jtAduBoti === "function" ? await jtAduBoti() : null) || []; contTot.inchise = JurnalTrade.din(bi); contTot.alteInchise = JurnalTrade.alte(bi); } catch (e) { contTot.inchise = []; contTot.alteInchise = []; } }
    if (Date.now() - contTot.clasamentLa > 10 * 60000) { try { var cl = await getJSON("/api/istoric-bot?action=clasament"); contTot.clasament = cl && cl.clasament || null; contTot.clasamentLa = Date.now(); } catch (e) {} }
    if (Date.now() - (contTot.saltLa || 0) > 5 * 60000) { try { var sr = await getJSON("/api/t212?action=saltRezumat"); contTot.salt = sr && sr.rezumat || null; contTot.saltLa = Date.now(); } catch (e) {} }   /* v100.126: Salt lângă T212 (rezumatul colectorului) */
    if (Date.now() - (contTot.sugestiiLa || 0) > 10 * 60000) { try { contTot.sugestii = await getJSON("/api/istoric-bot?action=sugestii"); contTot.sugestiiLa = Date.now(); } catch (e) {} }   /* v100.85 (reveniri + short) */
    var bb = typeof tbStare !== "undefined" && tbStare.bot; if (bb) await contTotStiriCrypto(String(bb.baza || "").replace(/\.PERP$/, ""));
  } finally { contTot.inLucru = false; }
  contTotRender();
}
// audit 23.10: cu Tabloul în repaus #t212Card (pagină ascunsă) se rescria de 32 de ori în 20 s ⇒ innerHTML doar când s-a schimbat
function contTotPune(el, h) { if (el._contH === h) return; el._contH = h; el.innerHTML = h; }
function contTotRender() {
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : contTot.boti;
  var act = (boti || []).filter(function (b) { return b && b.activ; }), usdt = 0, areUsdt = false;
  act.forEach(function (b) { var v = Number(b.profitTotal); if (isFinite(v)) { usdt += v; areUsdt = true; } });
  var fx = t212Fx(), c = t212.cont && t212.cont.cash, parti = [];
  // v100.97: soldul contului întâi (ca la Trading 212), o zecimală; fără conturile citite se spune „în boți”
  var sp = contTotSoldPionex(boti, contTot.conturi);
  var soldH = sp ? ' · ' + (sp.conturiCitite ? "sold " : "în boți ") + '<b>' + (sp.botiFaraInvestit ? "≥ " : "") + sp.sold.toFixed(1).replace(".", ",") + ' USDT</b>' + (sp.botiFaraInvestit ? ' <span class="tbWarn">(' + escapeHtml(t212Cate(sp.botiFaraInvestit, "bot necitit", "boți necitiți")) + ')</span>' : '') + (fx ? ' <span class="tbSub">(≈ ' + escapeHtml(t212Suma(sp.sold / fx)) + ')</span>' : '') : '';   // un sold, nu un profit: fără „+”
  parti.push(boti ? '<span><b>Pionex</b>' + soldH + ' · ' + t212Cate(act.length, "bot activ", "boți activi") + (areUsdt ? ' · <b class="' + t212Cls(usdt) + '">' + TextRo.usdt(usdt, 1) + '</b>' + (fx ? ' <span class="tbSub">(≈ ' + escapeHtml(t212Lei(usdt / fx)) + ')</span>' : '') : '') + '</span>' : contTot.botiEroare ? '<span class="tbWarn">Pionex: nu răspunde acum</span>' : '<span class="tbSub">Pionex: aduc boții…</span>');
  var sbH = typeof saltBandaHtml === "function" ? saltBandaHtml(contTot.salt) : "";   // v100.126: Salt lângă T212
  parti.push(c ? '<span><b>Trading 212</b> · ' + escapeHtml(t212Suma(c.total)) + ' · deschise <b class="' + t212Cls(c.ppl) + '">' + escapeHtml(t212Lei(c.ppl)) + '</b></span>' : '<span class="tbSub">Trading 212: aduc contul…</span>');
  // actiunile pe IESI: semaforul le-a pus deja in tabelul pozitiilor
  var iesi = t212.nrIesi || 0;   // v100.40: din date (t212Render), nu din DOM-ul paginii T212
  var lich = act.filter(function (b) { var d = Number(b.distantaLichidarePct); return b.lichidareDepasita || (isFinite(d) && Math.abs(d) < 15); }).length;
  if (sbH) parti.push(sbH);
  var iesiS = contTot.salt && Array.isArray(contTot.salt.iesi) && typeof saltRezumatProaspat === "function" && saltRezumatProaspat(contTot.salt, Date.now()) ? contTot.salt.iesi.length : 0;   // v100.126: și pozițiile Salt de ieșit (doar din rezumatul proaspăt - revizia R2)
  var ati = iesi + lich + iesiS;
  parti.push(ati ? '<span class="bad">⚠️ ' + [iesi ? t212Cate(iesi, "acțiune", "acțiuni") + " de ieșit" : "", iesiS ? t212Cate(iesiS, "acțiune", "acțiuni") + " de ieșit la Salt" : "", lich ? t212Cate(lich, "bot", "boți") + " aproape de lichidare" : ""].filter(Boolean).join(" · ") + '</span>'
    // v100.173 (auditul Opus): cu T212 sau Pionex căzut nu se știe dacă e ceva roșu ⇒ „nu știu”, niciodată bifa verde
    : t212.eroare || contTot.botiEroare ? '<span class="tbWarn">⚠ nu știu dacă e ceva roșu: ' + (t212.eroare ? "Trading 212" : "Pionex") + ' nu răspunde</span>'
    : t212.nrIesi == null && (!t212.poz || t212.poz.length) ? '<span class="tbSub">acțiunile: aduc prețurile…</span>' : !boti ? '<span class="tbSub">Pionex: aduc boții…</span>' : '<span class="good">✓ nimic roșu</span>');   // v100.40: fara semafor inca -> nu „nimic roșu”
  document.querySelectorAll("[data-cont-tot]").forEach(function (el) { contTotPune(el, parti.join('<span class="contTotSep">│</span>')); });
  piataAziRender();
  tbIdeiRender();
}
