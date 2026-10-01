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
  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v); return isFinite(x) ? x : null; }
  function mare(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  // revizia 01.10 (actiuni): un simbol in capul frazei („ECHO e în…”) nu se micsoreaza - inainte ajungea „eCHO” pe Discord
  function mic(s) { s = String(s || ""); var b = s.charAt(1); return b && b === b.toUpperCase() && b !== b.toLowerCase() ? s : s.charAt(0).toLowerCase() + s.slice(1); }
  function fp(v) { v = nr(v); if (v === null) return "?"; var t = v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toPrecision(4); return t.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ""); }
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; };
  var ETICHETA = { iesi: "🔴 Ieși", atentie: "🟡 Atenție", tine: "🟢 Ține", asteapta: "⏳ Socotesc" };
  // codul sfatului -> codul din socoteala (increderea masurata pe botii lui)
  var SOC = { margine: "muta", muta: "muta", liniste: "tine", directie: "tine", tine: "tine", "miscare-cu": "cu-botul", miscare: "miscare", costuri: "costuri",
    trend: "trend", plan: "plan", stop: "plan", lichidare: "lichidare", btc: "btc", aglomerare: "aglomerare", "ia-profit": "ia-profit", podea: "podea" };
  // ordinea in care cantaresc motivele de acelasi nivel (banii in joc: lichidarea si pierderea maxima intai)
  var PRIO = ["opreste", "lichidare", "stop", "plan", "pericol", "margine", "muta", "costuri", "perechi", "trend", "miscare", "btc", "aglomerare", "ia-profit", "liniste"];
  // „Până la marginea de jos (0.3841) sunt 1.7%” -> „1,7% până la marginea de jos (0.3841)” (ca in demo: cifra intai)
  function titluMargine(t) {
    var m = /^Până la marginea de (jos|sus) \(([^)]*)\) sunt ([0-9.,]+)%$/.exec(String(t || ""));
    return m ? m[3].replace(".", ",") + "% până la marginea de " + m[1] + " (" + m[2] + ")" : t;
  }
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
    if (x.opreste && x.opreste.titlu) cand.push({ cod: "opreste", nivel: "iesi", c: "r", titlu: mare(x.opreste.titlu), text: x.opreste.ceFac || "", faCe: x.opreste.ceFac || "", scurt: mic(x.opreste.titlu) });
    // 1) componentele semaforului (IEȘI / ATENȚIE)
    (Array.isArray(sm.componente) ? sm.componente : []).forEach(function (k) {
      if (!k || (k.nivel !== "iesi" && k.nivel !== "atentie")) return;
      var m = { cod: k.cod, nivel: k.nivel, c: k.nivel === "iesi" ? "r" : "g", titlu: mare(k.motiv), text: "", faCe: k.faCe || "", scurt: mic(k.motiv) };
      // „mută gridul” si sfatul „Până la marginea de jos” spun acelasi lucru: un singur motiv, cu cifrele sfatului
      // revizia 01.10: sfatul „margine” e mereu despre marginea de JOS - nu se lipeste peste „mută gridul” de la marginea de sus (short)
      if (k.cod === "muta" && k.parte !== "sus" && sfCod("margine")) { var s = sfCod("margine"); m.cod = "margine"; m.titlu = titluMargine(s.titlu); m.text = s.text; m.faCe = s.faCe || m.faCe; m.extra = k.motiv; folosite.margine = 1; }
      else if (k.cod === "costuri" && sfCod("costuri")) { m.text = sfCod("costuri").text; folosite.costuri = 1; }
      else if (k.cod === "miscare" && sfCod("miscare")) { m.text = sfCod("miscare").text; folosite.miscare = 1; }
      cand.push(m);
    });
    // 2) cartela Stopul: peste plan / fara protectie
    var cs = (Array.isArray(x.concret) ? x.concret : []).filter(function (c) { return c && c.cod === "stop"; })[0];
    if (cs && cs.tag && cs.tag.c === "bad" && !cand.some(function (m) { return m.cod === "plan"; })) {
      cand.push({ cod: "stop", nivel: "atentie", c: "r", titlu: "Stopul e " + cs.tag.t, text: String(cs.act || "").replace(/^Atins, te costă/, "Atins, stopul de la " + (cs.mare || "?") + " te costă"), faCe: cs.act || "",
        scurt: cs.tag.t === "peste plan" ? "stopul te costă mai mult decât planul" : "botul n-are protecție", cifre: cs.cifre || null, bani: cs.bani || null });
    }
    // 3) sfaturile de atentie / critice care n-au intrat deja
    sf.forEach(function (s) {
      if (!s || folosite[s.cod] || (s.ton !== "atentie" && s.ton !== "critic")) return;
      if (cand.some(function (m) { return m.cod === s.cod; })) { folosite[s.cod] = 1; return; }
      folosite[s.cod] = 1;
      cand.push({ cod: s.cod, nivel: s.ton === "critic" ? "iesi" : "atentie", c: s.ton === "critic" ? "r" : "g", titlu: s.cod === "margine" ? titluMargine(s.titlu) : s.titlu, text: s.text || "", faCe: s.faCe || "",
        scurt: s.cod === "margine" ? "prețul stă lângă marginea de jos" : mic(s.titlu) });
    });
    // 3b) v100.51 (I-477): gridul incheie sub jumatate din perechile pe care le astepta fisa pe istoricul de dinaintea pornirii
    var pe = x.perechi;
    // revizia 01.10 (I1): doar cu pretul IN grid (afara vorbesc margine/pericol) - si raportul pe fereastra lui (Perechi.raport)
    if (pe && pe.inGrid !== false && nr(pe.raport) !== null && pe.raport < 0.5 && nr(pe.real) !== null && nr(pe.est) !== null) {
      var z1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1).replace(".", ","); };
      cand.push({ cod: "perechi", nivel: "atentie", c: "g", titlu: "Gridul încheie " + z1(pe.real) + " perechi pe zi; fișa aștepta " + z1(pe.est),
        text: "Pe cele 30 de zile de dinaintea pornirii, gridul tău ar fi încheiat ~" + z1(pe.est) + " perechi pe zi" + (pe.corectat ? " (corectat după boții tăi pe monedă)" : "") + "; " + (pe.fereastra || "de la pornire") + " a făcut " + Math.round(pe.raport * 100) + "% din asta. O frecvență din trecut, nu o promisiune.",
        faCe: "Aș muta gridul pe unde stă prețul acum (setările din fișă): cu atât de puține perechi nu-și acoperă costurile pe zi.", scurt: "gridul încheie sub jumătate din perechile așteptate" });
    }
    // 4) motivul verde: piata, cu UN singur trend (directia pietei; fisa - media EMA - devine „structura”)
    var li = sfCod("liniste"), di = sfCod("directie"), tr = sfCod("trend");
    if (li || di) {
      var lateral = di && /lateral/i.test(di.text || "");
      var trM = tr ? /\(([^)]*)\)\s*$/.exec(String(tr.titlu)) : null, trTxt = trM ? trM[1] : "";   // „Trendul e cu botul (long, tare)” -> „long, tare”
      cand.push({ cod: li ? "liniste" : "directie", nivel: "bine", c: "v",
        titlu: "Piața e " + [li ? "liniștită" : null, lateral ? "laterală" : null].filter(Boolean).join(" și ") .replace(/^$/, "cu botul"),
        text: (li ? li.text + " " : "") + (di ? "Trendul, o singură măsură: " + mic(di.text || di.titlu) + (trTxt ? " (structura pe medii: " + trTxt + ")" : "") : ""),
        faCe: (li && li.faCe) || (di && di.faCe) || "" });
      folosite.liniste = folosite.directie = folosite.trend = 1;
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
    var titlu = avert.length >= 2 ? mare(avert[0].scurt) + ", iar " + avert[1].scurt : avert.length === 1 ? mare(avert[0].scurt) : mare(sm.motiv);

    // ce as face eu: actiunea motivului de sus; la stopul peste plan pe care o zi obisnuita l-ar atinge des -> las stopul, ajustez planul
    var sus = avert[0] || null, faCe = sus ? sus.faCe : (sm.faCe || "");
    var st = cand.filter(function (m) { return m.cod === "stop"; })[0], cf = st && st.cifre;
    if (sus && sus.cod === "stop" && cf && nr(cf.frecventa) >= 0.5 && nr(cf.laOpritor) !== null && nr(x.opritor) !== null) {
      faCe = "Aș lăsa stopul la " + fp(x.opritor) + " și aș trece planul la −" + Math.round(Math.abs(nr(cf.laOpritor))) + " USDT: stopul planului" + (nr(cf.pretPropus) !== null ? " (" + fp(cf.pretPropus) + ")" : "") +
        " e atât de aproape încât o zi obișnuită a monedei ajunge acolo în " + Math.round(nr(cf.frecventa) * 100) + "% din zile.";
    }
    if (avert.some(function (m) { return m.cod === "margine"; })) faCe += (faCe ? " " : "") + "Cât stă lângă margine, n-aș pune bani în plus.";

    // banii: pierderea maxima (cartela Stopul) + totalul la marginea de jos
    var bani = [];
    if (cf && nr(cf.laPropus) !== null) bani.push("pierderea maximă: " + (nr(cf.laOpritor) !== null ? U(nr(cf.laOpritor)).replace(" USDT", "") + " cu stopul de acum" : "fără margine (n-ai opritor)") + " · " + U(nr(cf.laPropus)).replace(" USDT", "") + " cu stopul planului");
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
    sf.forEach(function (s) { if (!s || folosite[s.cod] || inMotive[s.cod] || s.cod === "nimic") return; rest.push({ titlu: s.titlu, text: [s.text, s.faCe ? "👉 " + s.faCe : ""].filter(Boolean).join(" ") }); });
    (Array.isArray(x.consilier) ? x.consilier : []).forEach(function (k) { if (k && k.titlu) rest.push({ titlu: k.titlu, text: [k.text, k.ceAsFace ? "👉 " + k.ceAsFace : ""].filter(Boolean).join(" ") }); });
    if (x.indicatori) rest.push({ titlu: String(x.indicatori), text: "" });
    if (x.btc) rest.push({ titlu: String(x.btc), text: "" });

    return { nivel: nivel, eticheta: ETICHETA[nivel] || ETICHETA.asteapta, titlu: titlu, faCe: faCe, bani: bani.length ? bani.join(" · ") : null, incredere: inc,
      motive: motive.map(function (m) { return { cod: m.cod, c: m.c, titlu: m.titlu, text: m.text, cip: m.cip, extra: m.extra || null }; }), rest: rest };
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
    return { nivel: c.nivel, motiv: String(c.titlu || ""), faCe: String(c.faCe || "") + (c.bani ? " 💰 " + c.bani : ""),
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
      motive: (Array.isArray(c.motive) ? c.motive : []).map(function (m) { return { cod: m && m.cod, c: m && m.c, titlu: m && m.titlu }; }) };
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
    var al = { nivel: lite.nivel === "iesi" ? "critic" : lite.nivel === "atentie" ? "atentie" : "info", titlu: N + ": Consilierul — " + lite.eticheta + " · " + lite.titlu,
      mesaj: "Ce aș face eu: " + (lite.faCe || "—") + (lite.bani ? " · 💰 " + lite.bani : "") + (d ? " · De ce: " + d.text : ""), doarRadar: doar };
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
    return "Pe Discord și pe pagina alerts: " + (a.eticheta || ETICHETA[a.nivel] || a.nivel) + " — colectorul nu vede direcția pe mai multe intervale și se reface la câteva minute; verdictul de aici e cel complet.";
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
      : "Când ai urmat Consilierul (" + u.length + "): median " + (o.urmat.median === null ? "—" : U(o.urmat.median)) + " la 24 h; când nu (" + n.length + "): " + (o.neurmat.median === null ? "—" : U(o.neurmat.median)) + ". O comparație, nu o dovadă.";
    return o;
  }
  // ---- v100.54 (actiunile T212, pachetul 3): Consilierul POZITIEI - semaforul cu coduri, stopul care urca, probabilitatile (pachetul 2),
  // sfaturile Consilierului actiunilor; acelasi verdict pe pagina T212, in poza (pagina alerts) si pe Discord. Nimic nu se pierde: ce nu e
  // motiv ajunge in „Restul”. Siguranta (stopul planului, −X% din plan, stopul care urca atins) ramane prima.
  var FIX_ACT = { "stop-plan": 1, "trail-plan": 1, "stop-urcator": 1 };
  var PRIO_ACT = ["stop-plan", "trail-plan", "stop-urcator", "trend-jos-minus", "rezultate", "stop-maine", "fara-plan-minus", "trend-jos", "miscare-jos", "tinta-plan", "sf-istoric", "sf-pozitie", "trend-sus"];
  function prioAct(cod) { var i = PRIO_ACT.indexOf(cod); return i < 0 ? PRIO_ACT.length : i; }
  var PA = function (v) { v = nr(v); return v === null ? "?" : v >= 1 ? v.toFixed(2) : v.toPrecision(3); };   // pretul unei actiuni: 2 zecimale
  var USD = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + " $"; }, LEI = function (v) { return (v >= 0 ? "+" : "−") + Math.round(Math.abs(v)).toLocaleString("ro-RO") + " lei"; };
  function alcatuiesteActiune(x) {
    x = x || {}; var sem = x.sem || {};
    if (!sem.nivel || sem.nivel === "fara-date") return { nivel: "asteapta", eticheta: ETICHETA.asteapta, titlu: mare((Array.isArray(sem.motive) && sem.motive[0]) || "încă socotesc"), faCe: "", bani: null, motive: [], rest: [] };
    var cand = [], rest = [], niv = x.niv || null, faCeSem = String(sem.ceAsFace || "").replace(/^👉\s*Ce aș face eu:\s*/, "");
    (Array.isArray(sem.componente) ? sem.componente : []).forEach(function (k) {
      if (!k || !k.cod) return;
      cand.push({ cod: k.cod, nivel: k.nivel === "iesi" || k.nivel === "atentie" ? k.nivel : "bine", c: k.nivel === "iesi" ? "r" : k.nivel === "atentie" ? "g" : "v", titlu: mare(k.motiv), text: "", faCe: "", scurt: mic(k.motiv), dinSem: true });
    });
    if (niv && niv.stopAtins && !cand.some(function (m) { return m.cod === "stop-plan" || m.cod === "trail-plan"; }))
      cand.push({ cod: "stop-urcator", nivel: "iesi", c: "r", titlu: "Prețul e sub stopul care urcă (" + PA(niv.stopPozitie) + " $)", text: niv.sursaTrail || "", faCe: "Ies (tot sau jumătate): stopul care urcă e atins.", scurt: "stopul care urcă e atins" });
    (Array.isArray(x.prob) ? x.prob : []).forEach(function (r) {
      if (!r || !r.titlu) return;
      if (/Atinge stopul mâine/.test(r.titlu) && nr(r.p) !== null && r.p >= 0.25) cand.push({ cod: "stop-maine", nivel: "atentie", c: "g", titlu: r.titlu + ": " + Math.round(r.p * 100) + "%", text: r.text || "", faCe: "Stopul e în mișcarea obișnuită a unei zile: n-aș adăuga; dacă țin, accept că poate fi atins mâine.", scurt: "stopul poate fi atins mâine (" + Math.round(r.p * 100) + "%)" });
      else if (/Rezultatele vin/.test(r.titlu)) cand.push({ cod: "rezultate", nivel: "atentie", c: "g", titlu: r.titlu, text: r.text || "", faCe: "Înainte de rezultate n-aș adăuga și aș hotărî dinainte dacă țin peste ele.", scurt: mic(r.titlu) });
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
    var titlu = avert.length >= 2 ? mare(avert[0].scurt) + ", iar " + avert[1].scurt : avert.length === 1 ? mare(avert[0].scurt) : "Nimic nu cere o mișcare acum";
    // revizia 01.10: un motiv de sus fara actiune proprie nu mai ia „o las să meargă” din semafor (contrazicea verdictul)
    var faCe = mare(avert[0] && avert[0].faCe ? avert[0].faCe : avert[0] && !avert[0].dinSem ? (nivel === "iesi" ? "Aș ieși (tot sau jumătate): " : "N-aș adăuga până nu se lămurește: ") + avert[0].scurt + "." : faCeSem);
    // banii: unde e pozitia acum si cat ar fi la stopul care urca (dolari; lei doar cu costul in lei - fara curs inventat)
    var pret = nr(x.pret), pm = nr(x.pretMediu), q = nr(x.qty), cl = nr(x.costLei), fx = cl > 0 && q > 0 && pm > 0 ? cl / (q * pm) : null, bani = [];
    var cuLei = function (usd) { return USD(usd) + (fx ? " ≈ " + LEI(usd * fx) : ""); };
    if (pret > 0 && pm > 0 && q > 0) bani.push("acum: " + cuLei((pret - pm) * q));
    if (niv && nr(niv.stopPozitie) > 0 && pret > 0 && q > 0) bani.push(niv.stopPozitie < pret ? "la stopul care urcă (" + PA(niv.stopPozitie) + " $): " + cuLei((niv.stopPozitie - pm) * q) : "stopul care urcă (" + PA(niv.stopPozitie) + " $) e deja depășit");
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
  function autopsieActiuni(loguri, acum) {
    acum = nr(acum) !== null ? nr(acum) : Date.now(); var ZI = 864e5, toate = [];
    (Array.isArray(loguri) ? loguri : []).forEach(function (L) {
      (L && Array.isArray(L.log) ? L.log : []).forEach(function (e) {
        if (!e || (e.r !== 0 && e.r !== 1) || nr(e.bani) === null || nr(e.t) === null) return;
        toate.push({ ticker: L.ticker || "?", nivel: e.nivel, coduri: e.coduri || [], t: e.t, stare: e.stare || null, pret: e.pret, c5: e.c5, cost: e.bani, inLei: !!e.inLei, gresit: e.r === 0 });
      });
    });
    var Ban = function (x) { return Math.abs(x.cost).toFixed(2).replace(".", ",") + (x.inLei ? " lei" : " $"); };
    // un sfat se judeca la 5 zile de bursa (~7 calendaristice) dupa el: „saptamana” = sfaturile din ultimele 14 zile, deja judecate
    var scumpe = toate.filter(function (x) { return x.gresit && x.cost < 0 && x.t > acum - 14 * ZI && x.t <= acum; }).sort(function (a, b) { return a.cost - b.cost; }).slice(0, 3);
    var linii = scumpe.length ? scumpe.map(function (x) {
      return (NV_ACT[x.nivel] || x.nivel) + " pe " + String(x.ticker).split("_")[0] + " (" + new Date(x.t).toISOString().slice(5, 10).split("-").reverse().join(".") + ", motive: " + x.coduri.join(", ") + "): starea de atunci: " + etStare(x.stare)
        + "; în 5 zile de bursă prețul a mers de la $" + x.pret + " la $" + x.c5 + " — urmat, te-ar fi costat " + Ban(x) + ".";
    }) : ["Niciun sfat greșit judecat pe acțiuni săptămâna asta."];
    var gr = {};
    toate.forEach(function (x) {
      if (!x.stare || !(x.t > acum - 30 * ZI && x.t <= acum)) return;
      x.coduri.forEach(function (cod) {
        var k = cod + "|" + x.stare, g = gr[k] || (gr[k] = { cod: cod, stare: x.stare, zile: {}, cost: 0, inLei: x.inLei }), d = Math.floor(x.t / ZI), z = g.zile[d] || (g.zile[d] = { g: 0, b: 0 });
        if (x.gresit) { z.g++; g.cost += x.cost; } else z.b++;
      });
    });
    var wJos = function (k, n, zz) { var p = k / n, a = zz * zz; return (p + a / (2 * n) - zz * Math.sqrt(p * (1 - p) / n + a / (4 * n * n))) / (1 + a / n); };
    var tip = Object.keys(gr).map(function (k) { var g = gr[k], z = Object.keys(g.zile).map(function (d) { return g.zile[d]; }); return { cod: g.cod, stare: g.stare, judecate: z.length, gresite: z.filter(function (q) { return q.g > q.b; }).length, cost: Math.round(g.cost * 100) / 100, inLei: g.inLei }; })
      .filter(function (g) { return g.judecate >= 10 && wJos(g.gresite, g.judecate, 2.576) > 0.5 && g.cost < 0; })
      .sort(function (a, b) { return a.cost - b.cost; })[0] || null;
    if (tip) {
      tip.text = "Regulă propusă pe acțiuni (ipoteză, n-am schimbat nimic): motivul „" + tip.cod + "” în starea „" + etStare(tip.stare) + "” a greșit în " + tip.gresite + " din " + tip.judecate + " zile, în ultimele 30 (" + Ban(tip) + " dacă-l urmai) — l-aș trata ca „încă nu știm” în starea asta. Spune-mi dacă vrei regula.";
      linii.push(tip.text);
    } else linii.push("Niciun tipar repetat sigur încă pe acțiuni (trebuie cel puțin 10 zile judecate ale aceluiași motiv în aceeași stare, cu greșeala clar peste jumătate).");
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
  return { autopsieActiuni: autopsieActiuni, activPozitie: activPozitie, judecaDecizieActiune: judecaDecizieActiune, noteazaActiune: noteazaActiune, judecaActiune: judecaActiune, socotealaActiuni: socotealaActiuni, ordoneaza: ordoneaza, alcatuiesteActiune: alcatuiesteActiune, pentruPozaActiune: pentruPozaActiune, cheieDecizie: cheieDecizie, altaVoce: altaVoce, judecaDecizii: judecaDecizii, socotealaDecizii: socotealaDecizii, pentruPoza: pentruPoza, schimbare: schimbare, deCe: deCe, alcatuieste: alcatuieste };
})();
if (typeof globalThis !== "undefined") globalThis.Consiliu = Consiliu;
