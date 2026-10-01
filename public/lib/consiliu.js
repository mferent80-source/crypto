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
  function mic(s) { s = String(s || ""); return s.charAt(0).toLowerCase() + s.slice(1); }
  function fp(v) { v = nr(v); if (v === null) return "?"; var t = v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toPrecision(4); return t.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ""); }
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; };
  var ETICHETA = { iesi: "🔴 Ieși", atentie: "🟡 Atenție", tine: "🟢 Ține", asteapta: "⏳ Socotesc" };
  // codul sfatului -> codul din socoteala (increderea masurata pe botii lui)
  var SOC = { margine: "muta", muta: "muta", liniste: "tine", directie: "tine", tine: "tine", "miscare-cu": "cu-botul", miscare: "miscare", costuri: "costuri",
    trend: "trend", plan: "plan", stop: "plan", lichidare: "lichidare", btc: "btc", aglomerare: "aglomerare", "ia-profit": "ia-profit", podea: "podea" };
  // ordinea in care cantaresc motivele de acelasi nivel (banii in joc: lichidarea si pierderea maxima intai)
  var PRIO = ["opreste", "lichidare", "stop", "plan", "pericol", "margine", "costuri", "trend", "miscare", "btc", "aglomerare", "ia-profit", "liniste"];
  // „Până la marginea de jos (0.3841) sunt 1.7%” -> „1,7% până la marginea de jos (0.3841)” (ca in demo: cifra intai)
  function titluMargine(t) {
    var m = /^Până la marginea de (jos|sus) \(([^)]*)\) sunt ([0-9.,]+)%$/.exec(String(t || ""));
    return m ? m[3].replace(".", ",") + "% până la marginea de " + m[1] + " (" + m[2] + ")" : t;
  }
  function prio(cod) { var i = PRIO.indexOf(cod); return i < 0 ? PRIO.length : i; }
  // v100.50 (I-479): siguranta nu se negociaza - acestea raman primele la acelasi nivel, oricat ar fi adus altele
  var FIX = { opreste: 1, lichidare: 1, plan: 1, stop: 1 };
  // banii masurati ai sfatului (socoteala pe botii lui), doar de la 10 cazuri judecate - altfel null (ordinea fixa)
  function baniMasurati(soc, cod) { var x = soc && soc[SOC[cod] || cod]; return x && x.judecate >= 10 && nr(x.bani) !== null ? nr(x.bani) : null; }
  function cip(soc, cod) {
    var k = SOC[cod]; if (!k || !soc) return null;
    var x = soc[k];
    if (!x || x.stare === "necunoscut" || !(x.judecate >= 10)) return { t: "încă nu știm", cls: "", titlu: (x && x.nume ? x.nume + ": " : "") + SemnaleBot.textIncredere(x || null) };
    return { t: (x.nume || k) + " " + x.corecte + " din " + x.judecate + (x.baniN ? " · " + (x.bani >= 0 ? "~+" : "~−") + Math.abs(x.bani).toFixed(0) + " USDT" : ""), cls: x.stare, titlu: SemnaleBot.textIncredere(x) };
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
    // v100.50 (I-479): la acelasi nivel, intai siguranta (ordinea fixa), apoi - cand amandoua sunt masurate (≥ 10 judecate) - cel care a
    // adus mai multi bani urmat; altfel ordinea fixa de pana acum
    cand.sort(function (a, b) {
      var d = rang[a.nivel] - rang[b.nivel]; if (d) return d;
      var fa = FIX[a.cod] ? 1 : 0, fb = FIX[b.cod] ? 1 : 0; if (fa !== fb) return fb - fa;
      if (!fa) { var ba = baniMasurati(soc, a.cod), bb = baniMasurati(soc, b.cod); if (ba !== null && bb !== null && ba !== bb) return bb - ba; }
      return prio(a.cod) - prio(b.cod);
    });
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
  return { deCe: deCe, alcatuieste: alcatuieste };
})();
if (typeof globalThis !== "undefined") globalThis.Consiliu = Consiliu;
