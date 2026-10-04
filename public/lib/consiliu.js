// Consilierul unic al Tabloului (v100.44, I-465 - demo aprobat de el pe 01.10). Modul pur, probat in scripts/proba-v10044.mjs.
// Se incarca DUPA semnale-bot.js (foloseste SemnaleBot.textIncredere).
//
// De ce: Tabloul avea 8 surse care vorbeau fiecare cu pragurile ei. Pe datele reale (CRV, 30.09) semaforul zicea „ȚINE — nimic nu
// cere o mișcare” peste cartela Stopul rosie „peste plan”, iar fisa „trend long, tare” langa „Direcția pieței: laterală”.
// Aici se aduna TOATE intr-un verdict, o actiune cu bani, 3 motive (dupa banii in joc; fiecare cu cat a avut dreptate pe botii lui)
// si restul pliat. Nimic nu se pierde: fiecare sfat ajunge intr-un motiv sau in „Restul”.
//
// intrare: { sm (SemnaleBot.semafor), concret (SemnaleBot.acumConcret), sfaturi (Sfaturi.sfaturi, cu cod), consilier (consilierBot),
//            socoteala (peCod din KV „socoteala”), laJos (totalul la marginea de jos), opritor (pretul opritorului lui),
//            opreste ({titlu, ceFac} - verdictul vechi al Tabloului cand zice OPRESTE: margin call / LIQUIDATION la Pionex),
//            indicatori (text), btc (text) }
var Consiliu = (function () {
  "use strict";
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v); return isFinite(x) ? x : null; }
  function mare(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  // revizia 01.10 (actiuni): un simbol in capul frazei („ECHO e în…”) nu se micsoreaza - inainte ajungea „eCHO” pe Discord
  function mic(s) { s = String(s || ""); var b = s.charAt(1); return b && b === b.toUpperCase() && b !== b.toLowerCase() ? s : s.charAt(0).toLowerCase() + s.slice(1); }
  function fp(v) { v = nr(v); if (v === null) return "?"; var t = v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v > 0 && v < 1e-6 ? v.toFixed(Math.min(12, 3 - Math.floor(Math.log10(v)))) : v.toPrecision(4); return t.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ""); }
  var U = function (v) { return TextRo.usdt(v, 1); };
  // v100.61 (specul „sfaturi concise”): avertizarile comune se spun O DATA, aici - pagina le arata sub Consilier, nu in fiecare sfat
  var LEG_COMUNA = "Frecvențele („în N% din zile”) vin din trecut și nu sunt promisiuni, iar comparațiile (deciziile tale) nu sunt dovezi; „(puține cazuri)” înseamnă prea puține date: un semn, nu o regulă.";
  // v100.69 (sfaturile concise, pachetul 4): legenda paginii T212 - partea comuna + trendul pe zilnice (fara gridul si preturile botului)
  var LEGENDA_ACTIUNI = LEG_COMUNA + " Trendul se măsoară pe bare zilnice închise: arată starea de acum, nu încotro merge prețul.";
  var LEGENDA = LEG_COMUNA + " "
    // v100.62 (pachetul 2): avertizarile scoase din sfaturile vechi (trendul, directia, ce face gridul contra pietei) stau tot aici, o data
    + "Trendul și direcția se măsoară pe bare închise: arată starea de acum, nu încotro merge prețul; contra botului, gridul adaugă poziție la fiecare grilă și pierderea pe ea crește. "
    + "Prețurile propuse (zero-ul, stopul, podeaua) se recalculează la fiecare umplere; la întoarcere gridul cumpără înapoi la fiecare grilă, de aceea contează stopul.";
  var MAX_TITLU = 60;
  // taie la ultimul spatiu de dinainte de n, cu „…” (ultima rezerva - titlurile vin deja scurte)
  function taie(s, n) { s = String(s || ""); if (s.length <= n) return s; var t = s.slice(0, n - 1), i = t.lastIndexOf(" "); return (i > n / 2 ? t.slice(0, i) : t).replace(/[\s,;:·—-]+$/, "") + "…"; }
  var ETICHETA = { iesi: "🔴 Ieși", atentie: "🟡 Atenție", tine: "🟢 Ține", asteapta: "⏳ Socotesc" };
  // codul sfatului -> codul din socoteala (increderea masurata pe botii lui)
  var SOC = { margine: "muta", muta: "muta", liniste: "tine", directie: "tine", tine: "tine", "miscare-cu": "cu-botul", miscare: "miscare", costuri: "costuri",
    trend: "trend", plan: "plan", stop: "plan", lichidare: "lichidare", btc: "btc", aglomerare: "aglomerare", "ia-profit": "ia-profit", podea: "podea" };
  // ordinea in care cantaresc motivele de acelasi nivel (banii in joc: lichidarea si pierderea maxima intai)
  var PRIO = ["opreste", "lichidare", "stop", "plan", "pericol", "margine", "muta", "costuri", "perechi", "trend", "miscare", "btc", "aglomerare", "ia-profit", "liniste"];
  function prio(cod) { var i = PRIO.indexOf(cod); return i < 0 ? PRIO.length : i; }
  // v100.50 (I-479): siguranta nu se negociaza - acestea raman primele la acelasi nivel, oricat ar fi adus altele
  // revizia 01.10 (I4): si „pericol” (pretul afara din grid, margin call pe ton de atentie) e siguranta
  var FIX = { opreste: 1, lichidare: 1, plan: 1, stop: 1, pericol: 1 };
  // banii masurati ai sfatului (socoteala pe botii lui) PE CAZ - `bani` din socoteala e o SUMA (un sfat care suna des ar castiga din
  // volum) - si doar de la 10 cazuri judecate CU bani; altfel null (ordinea fixa)
  function baniMasurati(soc, cod) { var x = soc && soc[SOC[cod] || cod]; return x && x.judecate >= 10 && nr(x.baniN) >= 10 && nr(x.bani) !== null ? nr(x.bani) / nr(x.baniN) : null; }
  function cip(soc, cod) {
    var k = SOC[cod]; if (!k || !soc) return null;
    var x = soc[k];
    if (!x || x.stare === "necunoscut" || !(x.judecate >= 10)) return { t: "încă nu știm", cls: "", titlu: (x && x.nume ? x.nume + ": " : "") + SemnaleBot.textIncredere(x || null) };
    return { t: (x.nume || k) + " " + x.corecte + " din " + x.judecate + (x.baniN ? " · " + (x.bani >= 0 ? "~+" : "~−") + Math.abs(x.bani).toFixed(0) + " USDT" : ""), cls: x.stare, titlu: SemnaleBot.textIncredere(x) };
  }

  // v100.54 (actiunile T212, pachetul 3): sortarea comuna - acelasi nivel: intai siguranta (fix), apoi cele masurate dupa banii pe caz,
  // apoi cele nemasurate dupa prio; cheie precalculata (ordine totala)
  function ordoneaza(cand, soc, fix, prioF) {
    var rg = { iesi: 0, atentie: 1, bine: 2 }; fix = fix || FIX; prioF = prioF || prio;
    cand.forEach(function (m, i) { var f = fix[m.cod] ? 0 : 1, bm = f ? baniMasurati(soc, m.cod) : null; m._k = [rg[m.nivel], f, bm === null ? 1 : 0, bm === null ? 0 : -bm, prioF(m.cod), i]; });
    cand.sort(function (a, b) { for (var i = 0; i < a._k.length; i++) if (a._k[i] !== b._k[i]) return a._k[i] - b._k[i]; return 0; });
    return cand;
  }
  function alcatuieste(x) {
    x = x || {}; var sm = x.sm || { nivel: "asteapta", cod: "fara-fisa", motiv: "încă socotesc", faCe: "", componente: [] }, soc = x.socoteala || null;
    var cand = [], folosite = {}, sf = Array.isArray(x.sfaturi) ? x.sfaturi : [];
    var sfCod = function (c) { for (var i = 0; i < sf.length; i++) if (sf[i] && sf[i].cod === c) return sf[i]; return null; };
    // 0) verdictul vechi al Tabloului: starile de pericol raportate de Pionex (margin call, LIQUIDATION) - singurul loc care le judeca
    // v100.61 (poza pe CRV la 4,5%, 02.10): lichidarea sub 8% o spune deja semaforul (acelasi prag, aceeasi actiune) - fara al doilea motiv
    // „Ieși” (ca „pericol”, v100.60); o stare raportata de Pionex ramane prima: faptul in titlu, actiunea la persoana I, textul verdictului = de ce
    var op = x.opreste, opTxt = op ? String(op.ceFac || "") : "", smLich = (Array.isArray(sm.componente) ? sm.componente : []).some(function (k) { return k && k.cod === "lichidare"; });
    if (op && op.titlu && !(/lichidare/i.test(opTxt) && smLich)) {
      var mM = /marginea contului ca ([^,\s]+)/.exec(opTxt), mR = /starea de risc ca ([^,\s]+)/.exec(opTxt), mL = /([0-9.]+)% până la lichidare/.exec(opTxt);
      var mN = /trecut deja de pragul de lichidare cu ([0-9.]+)%/.exec(opTxt);
      var tO = mM ? "Pionex: marginea contului e " + mM[1] : mR ? "Pionex: starea de risc e " + mR[1] : mL ? "Lichidarea la " + TextRo.pct(Number(mL[1])) : mN ? "Prețul e dincolo de lichidare cu " + TextRo.pct(Number(mN[1]))
        : op.titlu !== "Ieși" ? mare(op.titlu) : mare(opTxt.replace(/\.$/, ""));
      // v100.62 (ideea 3 din pachetul 1): textul = de ce (starea bursei bate calculul nostru), nu titlul spus a doua oara
      var dO = mM || mR ? "Pionex o dă altfel decât " + (mM ? "NORMAL" : "TRADING") + ", iar starea bursei bate calculul nostru al lichidării." : mL || mN ? "" : opTxt;
      cand.push({ cod: "opreste", nivel: "iesi", c: "r", titlu: tO, text: dO, faCe: mR ? "Aș închide botul acum, după ce verific starea lui în Pionex." : "Aș adăuga marjă sau aș închide botul acum.", scurt: mic(tO) });
    }
    // 1) componentele semaforului (IEȘI / ATENȚIE)
    (Array.isArray(sm.componente) ? sm.componente : []).forEach(function (k) {
      if (!k || (k.nivel !== "iesi" && k.nivel !== "atentie")) return;
      // v100.61: explicatia semaforului (deCe) e textul motivului; sursa profilului (mută gridul) sta sub motiv
      var m = { cod: k.cod, nivel: k.nivel, c: k.nivel === "iesi" ? "r" : "g", titlu: mare(k.motiv), text: k.deCe || "", faCe: k.faCe || "", faCeSlab: k.faCeSlab || "", scurt: mic(k.motiv), extra: k.sursa || null };
      // „mută gridul” si sfatul „Până la marginea de jos” spun acelasi lucru: un singur motiv, cu cifrele sfatului
      // revizia 01.10: sfatul „margine” e mereu despre marginea de JOS - nu se lipeste peste „mută gridul” de la marginea de sus (short)
      if (k.cod === "muta" && k.parte !== "sus" && sfCod("margine")) { var s = sfCod("margine"); m.cod = "margine"; m.titlu = s.titlu; m.text = s.text; m.faCe = s.faCe || m.faCe; m.extra = [mare(k.motiv), k.deCe, k.sursa].filter(Boolean).join(" · "); folosite.margine = 1; }   /* revizia Opus I1: si „de ce”-ul (frecventa, pragul) */
      else if (k.cod === "costuri" && sfCod("costuri")) { m.text = sfCod("costuri").text; folosite.costuri = 1; }
      else if (k.cod === "miscare" && sfCod("miscare")) { m.text = sfCod("miscare").text; folosite.miscare = 1; }
      cand.push(m);
    });
    // 2) cartela Stopul: peste plan / fara protectie
    var cs = (Array.isArray(x.concret) ? x.concret : []).filter(function (c) { return c && c.cod === "stop"; })[0];
    if (cs && cs.tag && cs.tag.c === "bad" && !cand.some(function (m) { return m.cod === "plan"; })) {
      // v100.61: titlul cu cifra (cat costa stopul atins), textul = de ce (cartela il da in deCe; o fixtura veche - actiunea ei)
      var pp = cs.tag.t === "peste plan", cost = nr(cs.atins) !== null ? nr(cs.atins) : cs.cifre ? nr(cs.cifre.laOpritor) : null;
      cand.push({ cod: "stop", nivel: "atentie", c: "r", titlu: pp ? "Stopul e peste plan" + (cost !== null ? ": atins, ≈ −" + Math.round(Math.abs(cost)) + " USDT" : "") : "Botul n-are stop activ în Pionex", text: cs.deCe || cs.act || "", faCe: cs.act || "",
        scurt: pp ? "stopul costă peste plan" : "botul n-are stop", cifre: cs.cifre || null, bani: cs.bani || null });
    }
    // revizia Opus a 2b (2): trendul pe medii (sfatul „trend”), cand nu e un avertisment, se spune LANGA directia pietei, ca „structura pe
    // medii” - nu ca sfat separat cu actiunea lui („L-aș lăsa să lucreze” sub „Piața merge împotriva botului” erau doua voci)
    var tr = sfCod("trend"), di0 = sfCod("directie"), trM = tr ? /\(([^)]*)\)\s*$/.exec(String(tr.titlu)) : null, trTxt = trM ? trM[1] : "";   // „Trendul e cu botul (long, tare)” -> „long, tare”
    var trPliat = !!(di0 && tr && trTxt && tr.ton !== "atentie" && tr.ton !== "critic");
    var structura = function (t) { t = String(t || ""); return trPliat ? t.replace(/\.?\s*$/, "") + " (structura pe medii: " + trTxt + ")." : t; };
    if (trPliat) folosite.trend = 1;
    // 3) sfaturile de atentie / critice care n-au intrat deja
    sf.forEach(function (s) {
      if (!s || folosite[s.cod] || (s.ton !== "atentie" && s.ton !== "critic")) return;
      // v100.60: „pericol” din regulile alertelor despre lichidare spune acelasi lucru ca semaforul - un singur motiv (titlul era „…, iar lichidarea la …”)
      if (s.cod === "pericol" && s.tip === "lich" && cand.some(function (m) { return m.cod === "lichidare"; })) return;
      if (cand.some(function (m) { return m.cod === s.cod; })) { folosite[s.cod] = 1; return; }
      folosite[s.cod] = 1;
      cand.push({ cod: s.cod, nivel: s.ton === "critic" ? "iesi" : "atentie", c: s.ton === "critic" ? "r" : "g", titlu: s.titlu, text: s.cod === "directie" ? structura(s.text) : s.text || "", faCe: s.faCe || "",
        scurt: s.cod === "margine" ? "prețul e lângă marginea de jos" : mic(s.titlu) });
    });
    // 3b) v100.51 (I-477): gridul incheie sub jumatate din perechile pe care le astepta fisa pe istoricul de dinaintea pornirii
    var pe = x.perechi;
    // revizia 01.10 (I1): doar cu pretul IN grid (afara vorbesc margine/pericol) - si raportul pe fereastra lui (Perechi.raport)
    if (pe && pe.inGrid !== false && nr(pe.raport) !== null && pe.raport < 0.5 && nr(pe.real) !== null && nr(pe.est) !== null) {
      var z1 = function (v) { return TextRo.num(Math.round(v * 10) / 10, 1); };
      cand.push({ cod: "perechi", nivel: "atentie", c: "g", titlu: "Gridul încheie " + z1(pe.real) + " perechi pe zi; fișa aștepta " + z1(pe.est),
        text: "Așteptarea vine din cele 30 de zile dinaintea pornirii" + (pe.corectat ? ", corectată după boții tăi pe monedă" : "") + "; " + (pe.fereastra || "de la pornire") + " a făcut " + Math.round(pe.raport * 100) + "% din ea, prea puțin pentru costuri.",
        faCe: "Aș muta gridul pe unde stă prețul acum, cu setările din fișă.", scurt: "gridul încheie sub jumătate din perechi" });
    }
    // 4) motivul verde: piata, cu UN singur trend (directia pietei; fisa - media EMA - devine „structura”)
    // v100.65 (el, 02.10: „FA TOT” pe problema (a) din raportul reviziei): motivul VERDE spune doar ce e adevarat - piata linistita,
    // laterala sau cu botul. Directia contra are motivul ei galben (pasul 3), cea amestecata ramane in „Restul” cu titlul ei
    // („Piața dă semnale amestecate”); inainte intrau amandoua aici, sub „Piața e cu botul”. Verdictul nu se schimba (motivul verde nu-l atinge).
    // revizia Opus a 2b (I1): directia intra in verde DOAR cu tonul „bine” (laterala sau cu botul); „laterală” se citeste din concluzie,
    // nu din dovezi - amestecata cu un interval lateral iesea verde „Piața e laterală”
    var li = sfCod("liniste"), di = di0 && di0.ton === "bine" ? di0 : null;
    if (li || di) {
      var lateral = di && /^Piața e laterală/.test(di.rezumat || di.text || "");   // sfaturile vechi (fara „rezumat”) aveau concluzia in text
      var frDi = di ? structura("Trendul, o singură măsură: " + mic(di.rezumat || di.text || di.titlu)) : "";
      cand.push({ cod: li ? "liniste" : "directie", nivel: "bine", c: "v",
        titlu: "Piața e " + [li ? "liniștită" : null, lateral ? "laterală" : null].filter(Boolean).join(" și ") .replace(/^$/, "cu botul"),
        // revizia Opus a 2b (10): o fraza in text (liniștea SAU directia); cu amandoua, directia pe randul de dedesubt (extra) - ajungea la 249 de caractere
        text: li ? li.text : frDi, extra: li && di ? frDi : null,
        faCe: (li && li.faCe) || (di && di.faCe) || "" });
      folosite.liniste = 1; if (di) folosite.directie = 1;   // v100.65: directia nefolosita aici merge in „Restul”
    }
    cand.forEach(function (m) { m.cip = cip(soc, m.cod); });
    var rang = { iesi: 0, atentie: 1, bine: 2 };
    // v100.50 (I-479): la acelasi nivel, intai siguranta (ordinea fixa), apoi cele masurate (≥ 10 cazuri cu bani) dupa banii pe caz,
    // apoi cele nemasurate in ordinea fixa. Revizia 01.10 (I4): cheie precalculata - ordinea e TOTALA (inainte comparatorul amesteca
    // perechi masurate cu perechi dupa prio si iesea alta ordine - alt „Ce aș face eu” - dupa ordinea de intrare)
    ordoneaza(cand, soc, FIX, prio);   // v100.54: sortarea comuna (boti si actiuni)
    var motive = cand.slice(0, 3), avert = motive.filter(function (m) { return m.nivel !== "bine"; });

    // verdictul: cel mai grav dintre semafor si motive
    var nivel = sm.nivel === "asteapta" ? "asteapta" : sm.nivel === "iesi" || motive.some(function (m) { return m.nivel === "iesi"; }) ? "iesi"
      : avert.length || sm.nivel === "atentie" ? "atentie" : "tine";
    // v100.61: titlul ≤ 60 - doua motive doar daca incap; altfel primul (al doilea e chiar dedesubt, in „De ce”)
    var doi = avert.length >= 2 ? mare(avert[0].scurt) + ", iar " + avert[1].scurt : "";
    var titlu = taie(doi && doi.length <= MAX_TITLU ? doi : avert.length ? mare(avert[0].scurt) : mare(sm.motiv), MAX_TITLU);   // v100.65 (pachetul 1, M7): plafonul si in pagina

    // ce as face eu: actiunea motivului de sus; la stopul peste plan pe care o zi obisnuita l-ar atinge des -> las stopul, ajustez planul
    // revizia 01.10 (I2): actiunea primului motiv care ARE una (lichidarea care se indeparteaza n-are) - altfel textul linistitor al celui de sus
    var sus = avert[0] || null, cuFace = avert.filter(function (m) { return m.faCe; })[0] || null, faCe = cuFace ? cuFace.faCe : sus ? (sus.faCeSlab || sus.faCe) : (sm.faCe || "");
    // v100.61: „de ce” al actiunii, separat de ea - doar cand nu e deja textul unui motiv de dedesubt (verdictul semaforului, stopul lasat pe loc)
    var explica = avert.length ? null : (sm.deCe || null);
    var st = cand.filter(function (m) { return m.cod === "stop"; })[0], cf = st && st.cifre;
    if (sus && sus.cod === "stop" && cf && nr(cf.frecventa) >= 0.5 && nr(cf.laOpritor) !== null && nr(x.opritor) !== null) {
      faCe = "Aș lăsa stopul la " + fp(x.opritor) + " și aș trece planul la −" + Math.round(Math.abs(nr(cf.laOpritor))) + " USDT.";
      explica = "Stopul planului" + (nr(cf.pretPropus) !== null ? " (" + fp(cf.pretPropus) + ")" : "") + " e prea aproape: o zi obișnuită a monedei ajunge acolo în " + Math.round(nr(cf.frecventa) * 100) + "% din zile.";
    }
    // langa margine: „n-aș pune bani în plus” intra in aceeasi fraza, daca nu e deja spus si daca incape (≤ 110)
    var adaos = "n-aș pune bani în plus cât stă lângă margine";
    // revizia 02.10: nu se lipeste de o iesire sau de „aș adăuga marjă” (s-ar citi pe dos)
    // v100.65 (minorele amanate): „N-aș închide …” nu e o iesire (pachetul 2, M3); fara al doilea „;” in actiune; cand nu incape, fraza
    // merge la sfarsitul lui „de ce”, si cand acesta e deja ocupat (pachetul 1, M3 - inainte se pierdea fara urma)
    // revizia Opus a 2b (6): fara lookbehind (Safari sub 16.4 nu parseaza tot fisierul) - „n-aș închide” se scoate inainte de test
    if (avert.some(function (m) { return m.cod === "margine"; }) && !/n-aș (pune|adăuga|mări)|marjă|închide/i.test(String(faCe || "").replace(/n-aș închide/gi, ""))) {
      var cuAdaos = faCe ? faCe.replace(/\.$/, "") + "; " + adaos + "." : mare(adaos) + ".";
      if (cuAdaos.length <= 110 && String(faCe || "").indexOf(";") < 0) faCe = cuAdaos;
      else explica = explica ? explica.replace(/\.?\s*$/, "; ") + adaos + "." : mare(adaos) + ".";   // revizia Opus a 2b (8): o fraza, cu „;”
    }

    // banii: pierderea maxima (cartela Stopul) + totalul la marginea de jos
    var bani = [];
    if (cf && nr(cf.laPropus) !== null) bani.push("pierderea maximă: " + (nr(cf.laOpritor) !== null ? U(nr(cf.laOpritor)) + " cu stopul de acum" : "fără margine (n-ai stop)") + " · " + U(nr(cf.laPropus)).replace(" USDT", "") + " cu stopul planului");
    if (avert.some(function (m) { return m.cod === "margine"; }) && nr(x.laJos) !== null) bani.push("dacă atinge doar marginea de jos: " + U(nr(x.laJos)).replace(" USDT", ""));

    // increderea verdictului: cand semaforul singur spunea altceva, se spune si cat a avut el dreptate
    var inc = null;
    if (sm.nivel !== nivel && sm.nivel !== "asteapta") {
      var ss = soc && soc[SOC[sm.cod] || sm.cod];
      inc = "Semaforul singur zicea „" + (sm.nivel === "tine" ? "ȚINE" : sm.nivel === "iesi" ? "IEȘI" : "ATENȚIE") + "”" + (ss ? "; " + (ss.nume || sm.cod) + " " + SemnaleBot.textIncredere(ss) : "") + ".";
    }

    // restul, pliat: tot ce n-a intrat in motive - nimic nu se pierde
    var inMotive = {}; motive.forEach(function (m) { inMotive[m.cod] = 1; });
    var rest = [];
    cand.slice(3).forEach(function (m) { rest.push({ titlu: m.titlu, text: m.text }); });
    sf.forEach(function (s) { if (!s || folosite[s.cod] || inMotive[s.cod] || s.cod === "nimic") return; rest.push({ titlu: s.titlu, text: [s.cod === "directie" ? structura(s.text) : s.text, s.faCe ? "👉 " + s.faCe : ""].filter(Boolean).join(" ") }); });
    (Array.isArray(x.consilier) ? x.consilier : []).forEach(function (k) { if (k && k.titlu) rest.push({ titlu: k.titlu, text: [k.text, k.ceAsFace ? "👉 " + k.ceAsFace : ""].filter(Boolean).join(" ") }); });
    if (x.indicatori) rest.push({ titlu: String(x.indicatori), text: "" });
    if (x.btc) rest.push({ titlu: String(x.btc), text: "" });
    // v100.92 (I-522): Radarul (regimul fișei: ultimele 4 h față de mediana ei) și Busola (găleata ATR pe 4h față de un an) pot spune altceva -
    // un rând DOAR când se contrazic, ca să nu aleagă el între două „adevăruri” fără explicație; verdictul nu se schimbă (rândul ≤ 110, garda)
    var bz = x.busola, rg = x.regim, bvr = null;
    if (bz && rg && typeof rg.miscare === "boolean" && ((rg.miscare && bz.stare === "liniste") || (!rg.miscare && bz.stare === "miscare")))
      bvr = "Radarul: " + (rg.miscare ? "mișcare" : "liniște") + " (4 h față de mediana ei) · Busola: " + (bz.stare === "miscare" ? "mai agitată" : "mai calmă") + " (ATR 4h față de un an) — orizonturi diferite";

    return { nivel: nivel, eticheta: ETICHETA[nivel] || ETICHETA.asteapta, titlu: titlu, faCe: faCe, explica: explica, bani: bani.length ? bani.join(" · ") : null, incredere: inc,
      motive: motive.map(function (m) { return { cod: m.cod, c: m.c, titlu: m.titlu, text: m.text, cip: m.cip, extra: m.extra || null, scurt: m.scurt || null }; }), rest: rest, busolaVsRadar: bvr };
  }

  // v100.50 (I-473): de ce s-a schimbat verdictul - din ce nivel in care, motivele aparute (+) si disparute (−); nimic schimbat -> null
  function deCe(a, b) {
    if (!a || !b) return null;
    var ca = {}, cb = {}; (a.motive || []).forEach(function (m) { if (m && m.cod) ca[m.cod] = m; }); (b.motive || []).forEach(function (m) { if (m && m.cod) cb[m.cod] = m; });
    var plus = Object.keys(cb).filter(function (k) { return !ca[k]; }).map(function (k) { return cb[k].titlu; });
    var minus = Object.keys(ca).filter(function (k) { return !cb[k]; }).map(function (k) { return ca[k].titlu; });
    if (a.nivel === b.nivel && !plus.length && !minus.length) return null;
    var t = (a.nivel !== b.nivel ? "din " + (ETICHETA[a.nivel] || a.nivel) + " în " + (ETICHETA[b.nivel] || b.nivel) : "același verdict, alte motive")
      + (plus.length ? " · + " + plus.join(" · + ") : "") + (minus.length ? " · − " + minus.join(" · − ") : "");
    return { text: t, plus: plus, minus: minus };
  }
  // v100.50 (I-474): Consilierul in forma semaforului, pentru poza (pagina alerts o citeste fara nicio schimbare: niv / motive / sfat)
  function pentruPoza(c) {
    if (!c || !c.nivel || c.nivel === "asteapta") return { nivel: "asteapta", motiv: c && c.titlu ? String(c.titlu) : "încă socotesc", faCe: "", componente: [] };
    return { nivel: c.nivel, motiv: String(c.titlu || ""), faCe: String(c.faCe || "") + (c.explica ? " " + c.explica : "") + (c.bani ? " 💰 " + c.bani : ""),   /* revizia Opus I2: si de ce-ul, pe pagina alerts */
      componente: (Array.isArray(c.motive) ? c.motive : []).map(function (m) { return { motiv: String(m && m.titlu || "") }; }) };
  }
  // v100.50 (I-474 + I-473): schimbarea verdictului, cu anti-pâlpâire - un nivel nou trebuie sa tina DOUA ture la rand; prima vedere nu
  // alerteaza. Alerta poarta actiunea, banii si „de ce”; intoarcerea la ȚINE ramane doar in Radar. stare = {acum, inainte, schimbatLa, deCe, nou}
  // revizia 01.10 (I1): motivul -> cheile Alerte care il anunta deja imediat (lichidarea, planul, mută gridul...). Cand motivul de sus are
  // alerta lui activa, alerta Consilierului ar fi al doilea mesaj pe Discord pentru acelasi fapt -> ramane doar in Radar.
  var CHEI = { opreste: ["status"], lichidare: ["lich"], pericol: ["lich", "status", "grid", "activ"], plan: ["plan"], stop: ["plan-stop", "opritor"],
    muta: ["s-muta", "grid", "p-margine"], margine: ["s-muta", "grid", "p-margine"], btc: ["s-btc", "m-btc"], aglomerare: ["s-aglomerare"],
    "ia-profit": ["s-ia-profit"], funding: ["m-funding"], miscare: ["miscare"], directie: ["directie"], perechi: [],
    // v100.54 (actiunile T212): alertele planului pe pozitie (stop / −X% de la maxim / tinta) - colectorul le da ca activ["t212-stop"] etc.
    "stop-plan": ["t212-stop"], "trail-plan": ["t212-trail"], "tinta-plan": ["t212-tinta"], "stop-urcator": ["sltp-sl"] };
  // revizia 01.10 (I1): motivele fara socoteala proprie (nu pot „tacea” ca in I-466) nu suna pe Discord cand sunt in varf - raman in Radar
  var FARA_DISCORD = { perechi: 1 };
  var PAUZA = 2 * 3600000;   // acelasi nivel pe Discord cel mult o data la 2 h pe bot (un nivel care oscileaza nu mai suna la fiecare ciclu)
  // opt = { activ: {cheieAlerta: nivel} (starea alertelor botului), taci: {codSfat: true} (I-466: sfaturile care n-au batut hazardul) }
  function schimbare(st, c, acum, nume, opt) {
    st = st || {}; opt = opt || {};
    if (!c || !c.nivel || c.nivel === "asteapta") return { stare: st, alerta: null };
    var lite = { nivel: c.nivel, eticheta: c.eticheta || ETICHETA[c.nivel], titlu: c.titlu || "", faCe: c.faCe || "", bani: c.bani || null, la: acum,
      motive: (Array.isArray(c.motive) ? c.motive : []).map(function (m) { return { cod: m && m.cod, c: m && m.c, titlu: m && m.titlu, scurt: m && m.scurt || null }; }) };
    var cu = function (o) { if (st.trimis) o.trimis = st.trimis; return o; };
    if (!st.acum) return { stare: cu({ acum: lite }), alerta: null };
    if (st.acum.nivel === lite.nivel) return { stare: cu({ acum: lite, inainte: st.inainte || null, schimbatLa: st.schimbatLa || null, deCe: st.deCe || null }), alerta: null };
    if (!st.nou || st.nou.nivel !== lite.nivel) return { stare: cu({ acum: st.acum, inainte: st.inainte || null, schimbatLa: st.schimbatLa || null, deCe: st.deCe || null, nou: lite }), alerta: null };
    var d = deCe(st.acum, lite), N = nume || "Botul";
    var sus = lite.motive.filter(function (m) { return m.c !== "v"; })[0] || null, activ = opt.activ || {}, taci = opt.taci || {};
    var areAlerta = !!sus && (CHEI[sus.cod] || []).some(function (k) { return activ[k] && activ[k] !== "ok"; });
    var tacut = !!sus && !!taci[SOC[sus.cod] || sus.cod];
    var trimis = Object.assign({}, st.trimis || {}), pauza = nr(trimis[lite.nivel]) !== null && acum - trimis[lite.nivel] < PAUZA;
    var doar = lite.nivel === "tine" || areAlerta || tacut || pauza || (!!sus && !!FARA_DISCORD[sus.cod]);
    if (!doar) trimis[lite.nivel] = acum;
    // v100.61 (specul, regula 8): titlul ≤ 60 (moneda · verdictul: faptul; daca nu incape - motivul de sus pe scurt), mesajul pe 2 randuri
    var niv = String(lite.eticheta || "").replace(/^\S+\s+/, ""), pref = N + " · " + niv + ": ", t1 = pref + mic(lite.titlu);
    var tD = t1.length <= MAX_TITLU ? t1 : sus && sus.scurt && (pref + sus.scurt).length <= MAX_TITLU ? pref + sus.scurt : taie(t1, MAX_TITLU);
    var al = { nivel: lite.nivel === "iesi" ? "critic" : lite.nivel === "atentie" ? "atentie" : "info", titlu: tD,
      mesaj: "👉 " + (lite.faCe || "—") + (lite.bani ? " · 💰 " + lite.bani : "") + (d ? "\nDe ce: " + d.text : ""), doarRadar: doar };
    return { stare: { acum: lite, inainte: st.acum, schimbatLa: acum, deCe: d ? d.text : null, trimis: trimis }, alerta: al };
  }
  // revizia 01.10 (I3): cheia unei decizii = nivelul + motivele (fara cele verzi), NU titlul - titlul poarta cifre vii („12,3%” -> „12,1%”)
  // si la fiecare redesenare ar fi fost alt verdict: „notat” disparea si aceeasi hotarare se numara de mai multe ori
  function cheieDecizie(c) {
    if (!c || !c.nivel) return "";
    return String(c.nivel) + "|" + (Array.isArray(c.motive) ? c.motive : []).filter(function (m) { return m && m.cod && m.c !== "v"; }).map(function (m) { return m.cod; }).sort().join(",");
  }
  // revizia 01.10 (I2): colectorul (Discord, pagina alerts) nu vede directia pe mai multe intervale si merge la cateva minute - cand
  // verdictul lui difera de al Tabloului, Tabloul o spune pe fata (o singura voce, iar unde nu se poate, diferenta e la vedere)
  function altaVoce(kv, c) {
    var a = kv && kv.acum; if (!a || !a.nivel || !c || !c.nivel || a.nivel === c.nivel || c.nivel === "asteapta") return null;
    return "Pe Discord și pe pagina alerts: " + (a.eticheta || ETICHETA[a.nivel] || a.nivel) + "; colectorul nu vede direcția pe mai multe intervale și se reface la câteva minute, iar verdictul de aici e cel complet.";
  }
  // v100.50 (I-472): jurnalul deciziilor - fiecare „am făcut / n-am făcut” se judeca la 24 h pe totalul botului (istoricul ist:<bot>,
  // cea mai apropiata intrare de t + 24 h, la cel mult 2 h); botul inchis inainte = rezultatul final - totalul de atunci. Ziua netrecuta -> nejudecat.
  var ZI = 24 * 3600000;
  function judecaDecizii(lista, ist, final, acum) {
    var l = Array.isArray(ist) ? ist.filter(function (x) { return x && nr(x.t) !== null && nr(x.profitTotal) !== null; }) : [];
    return (Array.isArray(lista) ? lista : []).map(function (e) {
      if (!e || nr(e.t) === null || nr(e.total) === null || nr(e.r) !== null) return e;
      var tinta = e.t + ZI;
      if (final && nr(final.total) !== null && nr(final.la) !== null && final.la < tinta) return Object.assign({}, e, { r: Math.round((final.total - e.total) * 100) / 100, cum: "la închidere" });
      if ((nr(acum) || 0) < tinta) return e;
      var best = null; l.forEach(function (x) { var d = Math.abs(x.t - tinta); if (d <= 2 * 3600000 && (!best || d < Math.abs(best.t - tinta))) best = x; });
      return best ? Object.assign({}, e, { r: Math.round((best.profitTotal - e.total) * 100) / 100, cum: "la 24 h" }) : e;
    });
  }
  function median(v) { var a = v.slice().sort(function (x, y) { return x - y; }); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; }
  // socoteala: urmat vs neurmat (mediana totalului la 24 h) - de la 30 de decizii judecate; o comparatie, nu o dovada
  function socotealaDecizii(toate) {
    var j = (Array.isArray(toate) ? toate : []).filter(function (e) { return e && nr(e.r) !== null; });
    var u = j.filter(function (e) { return e.urmat === true; }).map(function (e) { return e.r; }), n = j.filter(function (e) { return e.urmat === false; }).map(function (e) { return e.r; });
    var o = { n: j.length, urmat: { n: u.length, median: median(u) }, neurmat: { n: n.length, median: median(n) } };
    o.text = j.length < 30 ? "Deciziile tale: încă " + j.length + " din 30 judecate (la 24 h) — sub 30 n-ar spune nimic."
      : "Când ai urmat Consilierul (" + u.length + "): median " + (o.urmat.median === null ? "—" : U(o.urmat.median)) + " la 24 h; când nu (" + n.length + "): " + (o.neurmat.median === null ? "—" : U(o.neurmat.median)) + ".";
    return o;
  }
  // ---- v100.54 (actiunile T212, pachetul 3): Consilierul POZITIEI - semaforul cu coduri, stopul care urca, probabilitatile (pachetul 2),
  // sfaturile Consilierului actiunilor; acelasi verdict pe pagina T212, in poza (pagina alerts) si pe Discord. Nimic nu se pierde: ce nu e
  // motiv ajunge in „Restul”. Siguranta (stopul planului, −X% din plan, stopul care urca atins) ramane prima.
  var FIX_ACT = { "stop-plan": 1, "trail-plan": 1, "stop-urcator": 1 };
  var PRIO_ACT = ["stop-plan", "trail-plan", "stop-urcator", "trend-jos-minus", "rezultate", "stop-maine", "fara-plan-minus", "trend-jos", "miscare-jos", "tinta-plan", "sf-istoric", "sf-pozitie", "trend-sus"];
  function prioAct(cod) { var i = PRIO_ACT.indexOf(cod); return i < 0 ? PRIO_ACT.length : i; }
  // v100.69 (sfaturile concise, pachetul 4): pretul unei actiuni ca pe pagina T212 („$30.12”, ActiuniSemnale.usd), sumele in dolari cu virgula
  var PA = function (v) { v = nr(v); return v === null ? "?" : typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale.usd(v) : "$" + v.toFixed(2); };
  var USD = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " $"; }, LEI = function (v) { return (v >= 0 ? "+" : "−") + Math.round(Math.abs(v)).toLocaleString("ro-RO") + " lei"; };
  function alcatuiesteActiune(x) {
    x = x || {}; var sem = x.sem || {};
    if (!sem.nivel || sem.nivel === "fara-date") return { nivel: "asteapta", eticheta: ETICHETA.asteapta, titlu: mare((Array.isArray(sem.motive) && sem.motive[0]) || "încă socotesc"), faCe: "", bani: null, motive: [], rest: [] };
    var cand = [], rest = [], niv = x.niv || null, faCeSem = String(sem.ceAsFace || "").replace(/^👉\s*Ce aș face eu:\s*/, "");
    (Array.isArray(sem.componente) ? sem.componente : []).forEach(function (k) {
      if (!k || !k.cod) return;
      cand.push({ cod: k.cod, nivel: k.nivel === "iesi" || k.nivel === "atentie" ? k.nivel : "bine", c: k.nivel === "iesi" ? "r" : k.nivel === "atentie" ? "g" : "v", titlu: mare(k.motiv), text: "", faCe: "", scurt: mic(k.motiv), dinSem: true });
    });
    if (niv && niv.stopAtins && !cand.some(function (m) { return m.cod === "stop-plan" || m.cod === "trail-plan"; })) {
      // v100.69: explicatia = sursa stopului, fara socoteala alegerii (aceea ramane intreaga langa preturi, pe pagina)
      // v100.71 (revizia pachetului 4, I3): sursa din profil, pe date reale, avea 179 de caractere (paranteze in paranteze) - aici, scurta
      var srs = String(niv.sursaTrail || "").split(" · ")[0];
      if (/cât coboară acțiunea/.test(srs)) srs = srs.split(" — ")[0] + ": coborârea obișnuită a acțiunii pe 5 zile, din profilul ei";
      cand.push({ cod: "stop-urcator", nivel: "iesi", c: "r", titlu: "Prețul e sub stopul care urcă (" + PA(niv.stopPozitie) + ")", text: srs, faCe: "Aș ieși, tot sau jumătate, cum cere stopul care urcă.", scurt: "stopul care urcă e atins" });
    }
    (Array.isArray(x.prob) ? x.prob : []).forEach(function (r) {
      if (!r || !r.titlu) return;
      if (/Atinge stopul mâine/.test(r.titlu) && nr(r.p) !== null && r.p >= 0.25) cand.push({ cod: "stop-maine", nivel: "atentie", c: "g", titlu: r.titlu + ": " + Math.round(r.p * 100) + "%", text: r.text || "", faCe: "N-aș adăuga: stopul e în mișcarea obișnuită a unei zile și poate fi atins mâine.", scurt: "stopul poate fi atins mâine (" + Math.round(r.p * 100) + "%)" });
      else if (/Rezultatele vin/.test(r.titlu)) cand.push({ cod: "rezultate", nivel: "atentie", c: "g", titlu: r.titlu, text: r.text || "", faCe: "N-aș adăuga înainte de rezultate și aș hotărî dinainte dacă țin peste ele.", scurt: mic(r.titlu) });
      else rest.push({ titlu: r.titlu + (nr(r.p) !== null ? ": " + Math.round(r.p * 100) + "%" : ""), text: r.text || "" });
    });
    (Array.isArray(x.sfaturi) ? x.sfaturi : []).forEach(function (f) {
      if (!f || !f.titlu) return;
      if (f.nivel === "g") cand.push({ cod: "sf-" + (f.sursa || "sfat"), nivel: "atentie", c: "g", titlu: f.titlu, text: f.text || "", faCe: f.ceAsFace || "", scurt: mic(f.titlu) });
      else rest.push({ titlu: f.titlu, text: [f.text, f.ceAsFace ? "👉 " + f.ceAsFace : ""].filter(Boolean).join(" "), din: "sfat" });   // pagina le arata cu stirile lor
    });
    // revizia 01.10: acelasi cod o singura data (doua sfaturi „istoric” -> unul; celalalt in rest) - altfel socoteala il numara dublu
    var vazut = {}; cand = cand.filter(function (m) { if (vazut[m.cod]) { rest.push({ titlu: m.titlu, text: m.text }); return false; } vazut[m.cod] = 1; return true; });
    ordoneaza(cand, x.socoteala || null, FIX_ACT, prioAct);
    var motive = cand.slice(0, 3), avert = motive.filter(function (m) { return m.nivel !== "bine"; });
    cand.slice(3).forEach(function (m) { rest.unshift({ titlu: m.titlu, text: m.text }); });
    var nivel = sem.nivel === "iesi" || motive.some(function (m) { return m.nivel === "iesi"; }) ? "iesi" : avert.length || sem.nivel === "atentie" ? "atentie" : "tine";
    // v100.69 (pachetul 4): titlul compus ≤ 60, ca la boti (pachetul 1, M7) - prea lung -> doar primul motiv (al doilea ramane in lista)
    var doi = avert.length >= 2 ? mare(avert[0].scurt) + ", iar " + avert[1].scurt : "";
    var titlu = taie(doi && doi.length <= MAX_TITLU ? doi : avert.length ? mare(avert[0].scurt) : "Nimic nu cere o mișcare acum", MAX_TITLU);
    // revizia 01.10: un motiv de sus fara actiune proprie nu mai ia „o las să meargă” din semafor (contrazicea verdictul)
    var faCe = mare(avert[0] && avert[0].faCe ? avert[0].faCe : avert[0] && !avert[0].dinSem ? (nivel === "iesi" ? "Aș ieși (tot sau jumătate): " : "N-aș adăuga până nu se lămurește: ") + avert[0].scurt + "." : faCeSem);
    // banii: unde e pozitia acum si cat ar fi la stopul care urca (dolari; lei doar cu costul in lei - fara curs inventat)
    var pret = nr(x.pret), pm = nr(x.pretMediu), q = nr(x.qty), cl = nr(x.costLei), fx = cl > 0 && q > 0 && pm > 0 ? cl / (q * pm) : null, bani = [];
    var cuLei = function (usd) { return USD(usd) + (fx ? " ≈ " + LEI(usd * fx) : ""); };
    if (pret > 0 && pm > 0 && q > 0) bani.push("acum: " + cuLei((pret - pm) * q));
    if (niv && nr(niv.stopPozitie) > 0 && pret > 0 && q > 0) bani.push(niv.stopPozitie < pret ? "la stopul care urcă (" + PA(niv.stopPozitie) + "): " + cuLei((niv.stopPozitie - pm) * q) : "stopul care urcă (" + PA(niv.stopPozitie) + ") e deja depășit");
    return { nivel: nivel, eticheta: ETICHETA[nivel], titlu: titlu, faCe: faCe, bani: bani.length ? bani.join(" · ") : null,
      motive: motive.map(function (m) { return { cod: m.cod, c: m.c, titlu: m.titlu, text: m.text, cip: null, extra: null }; }), rest: rest };
  }
  // ---- socoteala Consilierului actiunilor, pe motiv si in lei: verdictul notat o data pe schimbare, judecat la 5 zile de bursa pe
  // pret × bucati × curs. IESI/ATENTIE au dreptate daca pretul a scazut (iesind salvai diferenta); TINE, daca a crescut.
  function noteazaActiune(j, c, pret, qty, fx, acum, extra) {
    j = Array.isArray(j) ? j.slice() : [];
    if (!c || (c.nivel !== "iesi" && c.nivel !== "atentie" && c.nivel !== "tine") || !(nr(pret) > 0) || !(nr(qty) > 0)) return j;
    var coduri = (Array.isArray(c.motive) ? c.motive : []).map(function (m) { return m && m.cod; }).filter(Boolean).sort(), u = j[j.length - 1];
    if (u && u.nivel === c.nivel && (u.coduri || []).join(",") === coduri.join(",")) return j;
    var e = { t: nr(acum) !== null ? nr(acum) : Date.now(), coduri: coduri, nivel: c.nivel, pret: nr(pret), qty: nr(qty), fx: nr(fx) > 0 ? nr(fx) : null };
    if (extra && extra.stare) e.stare = String(extra.stare);   // v100.56: starea de atunci (trend|miscare|maxim), pentru autopsie
    j.push(e);
    return j.slice(-200);
  }
  function judecaActiune(j, bare, acum) {
    return (Array.isArray(j) ? j : []).map(function (e) {
      if (!e || e.r === 0 || e.r === 1 || !(e.pret > 0)) return e;
      var z0 = Math.floor(e.t / 864e5), f = (Array.isArray(bare) ? bare : []).filter(function (x) { return x && Math.floor(x.t / 864e5) > z0 && x.t <= (nr(acum) !== null ? nr(acum) : Date.now()); }).sort(function (a, b) { return a.t - b.t; });
      if (f.length < 5) return e;
      var c5 = f[4].c, stai = e.nivel === "tine", o = {}; for (var k in e) o[k] = e[k];
      o.r = stai ? (c5 >= e.pret ? 1 : 0) : (c5 < e.pret ? 1 : 0);
      o.bani = Math.round((stai ? c5 - e.pret : e.pret - c5) * e.qty * (e.fx || 1) * 100) / 100; o.inLei = !!e.fx; o.c5 = c5;
      return o;
    });
  }
  // v100.56 (actiunile T212, pachetul 5): autopsia - cele mai scumpe sfaturi gresite ale saptamanii (ce a urmat in 5 zile de bursa) si tiparul
  // repetat (motiv x stare) ca regula PROPUSA: zile distincte >= 10, marginea de jos Wilson 99% a greselilor > 50%, cost < 0 - ipoteza, nimic schimbat
  var ET_ST = { sus: "trend în sus", lateral: "trend neclar", jos: "trend în jos", calm: "fără mișcare mare", "dupa-miscare": "după o mișcare mare", departe: "departe de maximul pe 7 zile", "langa-max": "lângă maximul pe 7 zile" };
  var NV_ACT = { iesi: "IEȘI", atentie: "ATENȚIE", tine: "ȚINE" };
  function etStare(s) { return s ? String(s).split("|").map(function (k) { return ET_ST[k] || k; }).join(", ") : "nenotată (sfat dinainte de 01.10)"; }
  // v100.77 (ideea 3): un rând de raport ≤ 160, rupt la granița de sens; v100.78: ruperea stă într-un singur loc - TextRo.rupe
  // (fără TextRo, rândul rămâne întreg: nimic tăiat)
  function rupe(t, max) { return typeof TextRo !== "undefined" && TextRo.rupe ? TextRo.rupe(t, max) : String(t); }
  function autopsieActiuni(loguri, acum) {
    acum = nr(acum) !== null ? nr(acum) : Date.now(); var ZI = 864e5, toate = [];
    (Array.isArray(loguri) ? loguri : []).forEach(function (L) {
      (L && Array.isArray(L.log) ? L.log : []).forEach(function (e) {
        if (!e || (e.r !== 0 && e.r !== 1) || nr(e.bani) === null || nr(e.t) === null) return;
        toate.push({ ticker: L.ticker || "?", nivel: e.nivel, coduri: e.coduri || [], t: e.t, stare: e.stare || null, pret: e.pret, c5: e.c5, cost: e.bani, inLei: !!e.inLei, fx: nr(e.fx), gresit: e.r === 0 });
      });
    });
    // revizia 01.10 (I4): lei si $ nu se amesteca - clasamentul pe echivalent in lei (cursul median din jurnal), tiparul pe valute separate
    var F2 = function (v) { return Math.abs(v).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var Ban = function (x) { return F2(x.cost) + (x.inLei ? " lei" : " $"); };
    var fxL = toate.map(function (x) { return x.fx; }).filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; }), fxMed = fxL.length ? fxL[Math.floor(fxL.length / 2)] : 1;
    var echiv = function (x) { return x.inLei ? x.cost : x.cost * fxMed; };
    // un sfat se judeca la 5 zile de bursa (~7 calendaristice) dupa el: „saptamana” = sfaturile din ultimele 14 zile, deja judecate
    var scumpe = toate.filter(function (x) { return x.gresit && x.cost < 0 && x.t > acum - 14 * ZI && x.t <= acum; }).sort(function (a, b) { return echiv(a) - echiv(b); }).slice(0, 3);
    var linii = scumpe.length ? scumpe.map(function (x) {
      return (NV_ACT[x.nivel] || x.nivel) + " pe " + String(x.ticker).split("_")[0] + " (" + new Date(x.t).toISOString().slice(5, 10).split("-").reverse().join(".") + ", motive: " + x.coduri.join(", ") + "): starea de atunci: " + etStare(x.stare)
        + "; în 5 zile de bursă prețul a mers de la $" + (nr(x.pret) !== null ? nr(x.pret).toFixed(2) : "—") + " la $" + (nr(x.c5) !== null ? nr(x.c5).toFixed(2) : "—") + " — urmat, te-ar fi costat " + Ban(x) + ".";
    }) : ["Niciun sfat greșit judecat pe acțiuni săptămâna asta."];
    var gr = {};
    toate.forEach(function (x) {
      if (!x.stare || !(x.t > acum - 30 * ZI && x.t <= acum)) return;
      x.coduri.forEach(function (cod) {
        var k = cod + "|" + x.stare, g = gr[k] || (gr[k] = { cod: cod, stare: x.stare, zile: {}, cost: 0, costLei: 0, costUsd: 0 }), d = Math.floor(x.t / ZI), z = g.zile[d] || (g.zile[d] = { g: 0, b: 0 });
        if (x.gresit) { z.g++; g.cost += echiv(x); if (x.inLei) g.costLei += x.cost; else g.costUsd += x.cost; } else z.b++;
      });
    });
    var wJos = function (k, n, zz) { var p = k / n, a = zz * zz; return (p + a / (2 * n) - zz * Math.sqrt(p * (1 - p) / n + a / (4 * n * n))) / (1 + a / n); };
    var tip = Object.keys(gr).map(function (k) { var g = gr[k], z = Object.keys(g.zile).map(function (d) { return g.zile[d]; }); return { cod: g.cod, stare: g.stare, judecate: z.length, gresite: z.filter(function (q) { return q.g > q.b; }).length, cost: Math.round(g.cost * 100) / 100, costLei: Math.round(g.costLei * 100) / 100, costUsd: Math.round(g.costUsd * 100) / 100 }; })
      .filter(function (g) { return g.judecate >= 10 && wJos(g.gresite, g.judecate, 2.576) > 0.5 && g.cost < 0; })
      .sort(function (a, b) { return a.cost - b.cost; })[0] || null;
    if (tip) {
      tip.text = "Regulă propusă pe acțiuni (ipoteză, n-am schimbat nimic): motivul „" + tip.cod + "” în starea „" + etStare(tip.stare) + "” a greșit în " + tip.gresite + " din " + cate(tip.judecate, "zi", "zile") + ", în ultimele 30."
        + "\nDacă-l urmai, te-ar fi costat " + [tip.costUsd ? F2(tip.costUsd) + " $" : "", tip.costLei ? F2(tip.costLei) + " lei" : ""].filter(Boolean).join(" și ") + "; l-aș trata ca „încă nu știm” în starea asta. Spune-mi dacă vrei regula.";   // v100.77: două rânduri
      linii.push(tip.text);
    } else linii.push("Niciun tipar repetat sigur încă pe acțiuni (trebuie cel puțin 10 zile judecate ale aceluiași motiv în aceeași stare, cu greșeala clar peste jumătate).");
    linii = linii.map(function (l) { return rupe(l, 160); });   // v100.77 (ideea 3)
    return { scumpe: scumpe, tipar: tip, linii: ["Autopsia săptămânii pe acțiuni — sfaturile Consilierului care te-ar fi costat cel mai mult:"].concat(linii) };
  }
  function socotealaActiuni(jurnale) {
    var r = {};
    // revizia 01.10 (I2): o data pe (ticker, zi de bursa, cod) - pâlpâirile dintr-o zi sunt UN caz, nu 20
    (Array.isArray(jurnale) ? jurnale : []).forEach(function (j) {
      var vaz = {};
      (Array.isArray(j) ? j : []).forEach(function (e) {
        if (!e || (e.r !== 0 && e.r !== 1)) return;
        var zi = Math.floor(nr(e.t) / 864e5);
        (e.coduri || []).forEach(function (cod) {
          if (vaz[zi + "|" + cod]) return; vaz[zi + "|" + cod] = 1; var x = r[cod] || (r[cod] = { judecate: 0, corecte: 0, bani: 0, baniN: 0, nume: cod }); x.judecate++; x.corecte += e.r; if (nr(e.bani) !== null) { x.bani += e.bani; x.baniN++; } });
      });
    });
    Object.keys(r).forEach(function (k) { var x = r[k], ic = typeof GridCalcul !== "undefined" ? GridCalcul.wilson(x.corecte, x.judecate) : [0, 1]; x.bani = Math.round(x.bani * 100) / 100; x.stare = x.judecate < 10 ? "necunoscut" : ic[0] > 0.5 ? "ajuta" : "nesigur"; });
    return r;
  }
  // revizia 01.10 (I1): alertele care suna deja pe Discord pentru pozitie, din CONDITII (nu din cheile deja trimise - tura planurilor merge la
  // 5 min, poza mai des: Consilierul confirma inainte ca planul sa trimita, iar la stopul care urca fara plan suna SL/TP-ul pozei)
  function activPozitie(p, niv) {
    p = p || {}; var pl = p.plan || {}, pr = nr(p.pret), ref = nr(p.maxDupaCumparare);
    return { "t212-stop": pl.stop > 0 && pr !== null && pr <= pl.stop ? "critic" : "ok",
      "t212-trail": pl.trailPct > 0 && ref > 0 && pr !== null && pr <= ref * (1 - pl.trailPct / 100) ? "critic" : "ok",
      "t212-tinta": pl.tinta > 0 && pr !== null && pr >= pl.tinta ? "info" : "ok",
      "sltp-sl": !p.plan && niv && niv.stopAtins ? "critic" : "ok" };
  }
  // decizia pe actiune („am făcut / n-am făcut”): judecata la 5 zile de bursa pe PRETUL actiunii (si daca a vandut intre timp - se spune):
  // r = (inchiderea a 5-a zi de dupa − pretul de atunci) × bucati × curs (fara curs: dolari)
  function judecaDecizieActiune(lista, bare, acum) {
    var a = nr(acum) !== null ? nr(acum) : Date.now();
    return (Array.isArray(lista) ? lista : []).map(function (e) {
      if (!e || nr(e.r) !== null || !(nr(e.pret) > 0) || !(nr(e.qty) > 0) || nr(e.t) === null) return e;
      var z0 = Math.floor(e.t / 864e5), f = (Array.isArray(bare) ? bare : []).filter(function (x) { return x && Math.floor(x.t / 864e5) > z0 && x.t <= a; }).sort(function (x, y) { return x.t - y.t; });
      if (f.length < 5) return e;
      var o = {}; for (var k in e) o[k] = e[k];
      o.r = Math.round((f[4].c - e.pret) * e.qty * (nr(e.fx) > 0 ? e.fx : 1) * 100) / 100; o.cum = "la 5 zile de bursă (pe prețul acțiunii)";
      return o;
    });
  }
  // forma semaforului actiunilor (poza -> pagina alerts, fara schimbare acolo): {nivel, motive: [titluri], ceAsFace}
  function pentruPozaActiune(c) {
    if (!c || !c.nivel || c.nivel === "asteapta") return { nivel: "fara-date", motive: [c && c.titlu ? String(c.titlu) : "încă socotesc"], ceAsFace: "" };
    return { nivel: c.nivel, motive: (Array.isArray(c.motive) ? c.motive : []).map(function (m) { return String(m && m.titlu || ""); }).slice(0, 6),
      ceAsFace: "👉 Ce aș face eu: " + String(c.faCe || "") + (c.bani ? " 💰 " + c.bani : "") };
  }
  return { LEGENDA: LEGENDA, LEGENDA_ACTIUNI: LEGENDA_ACTIUNI, LEGENDA_COMUNA: LEG_COMUNA, autopsieActiuni: autopsieActiuni, activPozitie: activPozitie, judecaDecizieActiune: judecaDecizieActiune, noteazaActiune: noteazaActiune, judecaActiune: judecaActiune, socotealaActiuni: socotealaActiuni, ordoneaza: ordoneaza, alcatuiesteActiune: alcatuiesteActiune, pentruPozaActiune: pentruPozaActiune, cheieDecizie: cheieDecizie, altaVoce: altaVoce, judecaDecizii: judecaDecizii, socotealaDecizii: socotealaDecizii, pentruPoza: pentruPoza, schimbare: schimbare, deCe: deCe, alcatuieste: alcatuieste };
})();
if (typeof globalThis !== "undefined") globalThis.Consiliu = Consiliu;
