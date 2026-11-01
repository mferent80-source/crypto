// Așezarea rândurilor (v100.288; el, 01.11, după pagina Comportament: „ok, acum arată bine, fă toate paginile așa”): în grilele de carduri ale
// paginii deschise, un card rămas SINGUR pe rândul lui, cu gol lângă (sub 60% din lățimea grilei, într-o grilă care are și rânduri de două),
// se întinde pe tot rândul - oricâte coloane are grila la lățimea de acum și oricâte carduri vin din date. Rândurile se socotesc după poziția
// VĂZUTĂ (merge și cu `order`). Se întind doar cutiile care se văd (fundal sau chenar pe laturi); câmpurile, butoanele, pastilele (sub 60 px)
// și rândurile de listă (o linie doar sus) nu. O singură clasă, `randPlin`; niciun nod mutat. alege / eCard / tinte sunt pure (proba v100288).
// Când: o trecere întreagă la pornire, la lățime nouă și la o schimbare reală a clasei din body (Setări: Crypto / Stocks); în rest observatorul
// reface ÎNAINTE de desen doar grilele atinse (pagina arătată, un card venit / plecat, o clasă rescrisă, un pliu deschis). Textul (prețurile
// vii) și scrierile identice (clasa panoului Tablou la 1,5 s) nu-l pornesc; o grilă neschimbată nu se atinge (reviziile Opus 1 și 2, 01.11).
var ArRanduri = (function () {
  var CLS = "randPlin", FARA = /(^|\s)randPlin(?=\s|$)/g;
  function faraMarcaj(s) { return String(s || "").replace(FARA, " ").replace(/\s+/g, " ").trim(); }
  // copii = [{ top, bottom, width, height, card? }] în ordinea din pagină (null = nu se vede), latime = lățimea grilei
  // ⇒ indicii copiilor singuri pe rândul lor (pe stil îi verifică apoi eCard)
  function alege(copii, latime) {
    var l = (copii || []).map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return x.c && x.c.width > 0 && x.c.height > 0; });
    if (l.length < 3 || !(latime > 0)) return [];
    l.sort(function (a, b) { return a.c.top - b.c.top; });
    var randuri = [];
    l.forEach(function (x) { var u = randuri[randuri.length - 1]; if (u && x.c.top < u.jos - 2) { u.l.push(x); u.jos = Math.max(u.jos, x.c.bottom); } else randuri.push({ l: [x], jos: x.c.bottom }); });
    // o singură coloană (telefonul) sau un singur rând: nimic de întins
    if (randuri.length < 2 || !randuri.some(function (r) { return r.l.length >= 2; })) return [];
    var out = [];
    randuri.forEach(function (r) {
      if (r.l.length !== 1) return;
      var s = r.l[0].c;
      if (s.card === false || s.width >= 0.6 * latime || s.height < 60 || (s.width < 250 && s.height < 120)) return;
      out.push(r.l[0].i);
    });
    return out;
  }
  var transparent = /rgba\([^)]*,\s*0\)$/, CAMPURI = { INPUT: 1, SELECT: 1, TEXTAREA: 1, BUTTON: 1 };
  // un card = o cutie care se vede (fundal sau chenar pe laturi), în rând cu celelalte (nu așezată deasupra), nu un câmp sau un buton
  function eCard(tag, cs) {
    if (!cs || CAMPURI[String(tag || "").toUpperCase()] || (cs.visibility && cs.visibility !== "visible") || cs.position === "absolute" || cs.position === "fixed") return false;
    var bg = cs.backgroundColor;
    if ((bg && bg !== "transparent" && !transparent.test(bg)) || (cs.backgroundImage && cs.backgroundImage !== "none")) return true;
    // o linie doar sus / jos e un rând de listă (Tablou: „Ce spune piața acum”), nu o cutie
    var latura = function (p) { return parseFloat(cs["border" + p + "Width"]) > 0 && !transparent.test(cs["border" + p + "Color"]); };
    return latura("Left") && latura("Right");
  }
  function dreptunghiuri(copii) {
    var dr = [];
    for (var k = 0; k < copii.length; k++) { var r = copii[k].getBoundingClientRect(); dr.push({ top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height }); }
    return dr;
  }
  // semnul unei grile: lățimea, coloanele, clasa ei; pe fiecare copil locul pe orizontală (ordinea venită și din afară: data-pz-ord, clasa din
  // body), clasa fără marcaj, stilul scris și marcajul
  function semn(g, cs, rg, copii, dr) {
    var s = Math.round(rg.width) + "|" + cs.gridTemplateColumns + "|" + (g.getAttribute("class") || "");
    for (var k = 0; k < copii.length; k++) {
      var e = copii[k], r = dr[k];
      s += "|" + (r.width > 0 && r.height > 0 ? Math.round(r.left - rg.left) + ":" + Math.round(r.width) : "-") + (e.classList.contains(CLS) ? "+" : "") + faraMarcaj(e.getAttribute("class")) + "~" + (e.getAttribute("style") || "");
    }
    return s;
  }
  // marcajele jos ⇒ copiii atinși
  function curata(copii) {
    var sch = [];
    for (var k = 0; k < copii.length; k++) if (copii[k].classList.contains(CLS)) { copii[k].classList.remove(CLS); copii[k].__arCls = copii[k].getAttribute("class"); sch.push(copii[k]); }
    return sch;
  }
  // o grilă (sau un rând flexibil) ⇒ copiii al căror marcaj s-a schimbat (grilele din ei se refac după ei)
  function aseazaGrila(g) {
    var copii = g.children || [], n = copii.length, k;
    // sub 3 copii nu e ce întinde; un marcaj rămas (Sugestii: o cartelă plecată din trei) pleacă și el
    if (n < 3) return curata(copii);
    var rg = g.getBoundingClientRect(); if (!(rg.width > 0)) return [];   // nu se vede (altă pagină, pliu închis)
    var cs = getComputedStyle(g), grila = cs.display === "grid" || cs.display === "inline-grid";
    // nu mai e grilă (alt rând de media query): marcajele vechi jos
    if (!grila && !((cs.display === "flex" || cs.display === "inline-flex") && cs.flexWrap === "wrap" && String(cs.flexDirection).indexOf("column") < 0)) return curata(copii);
    var aveau = []; for (k = 0; k < n; k++) if (copii[k].classList.contains(CLS)) aveau.push(copii[k]);
    var dr = dreptunghiuri(copii);
    // grila neschimbată (aceeași lățime, aceleași coloane, copiii la aceleași locuri, aceleași clase, marcajele cum le-am lăsat): nu se atinge
    var s0 = grila ? semn(g, cs, rg, copii, dr) : null;
    if (s0 !== null && g.__arSemn === s0) return [];
    if (aveau.length) {
      // socoteala pe așezarea firească: cardul întins stă singur pe rând chiar fiindcă e întins
      for (k = 0; k < aveau.length; k++) aveau[k].classList.remove(CLS);
      dr = dreptunghiuri(copii);
    }
    var alese = alege(dr, rg.width).map(function (i) { return copii[i]; }).filter(function (e) { return eCard(e.tagName, getComputedStyle(e)); });
    for (k = 0; k < alese.length; k++) alese[k].classList.add(CLS);
    var sch = [], atinse = aveau.concat(alese);
    for (k = 0; k < atinse.length; k++) {
      var e = atinse[k]; e.__arCls = e.getAttribute("class");   // observatorul își recunoaște clasa
      if ((aveau.indexOf(e) >= 0) !== (alese.indexOf(e) >= 0) && sch.indexOf(e) < 0) sch.push(e);
    }
    // marcajele cum erau ⇒ așezarea e cea de la început (s0); altfel se citește din nou
    if (grila) g.__arSemn = sch.length ? semn(g, cs, rg, copii, dreptunghiuri(copii)) : s0;
    return sch;
  }
  // grilele de sub un nod, de sus în jos: cele cu cel puțin 3 copii și cele care mai țin un marcaj (au rămas cu mai puțini)
  function recipiente(rad) {
    var out = [], cuMarcaj = [], toate = rad.querySelectorAll("*"), m = rad.querySelectorAll("." + CLS), i;
    for (i = 0; i < m.length; i++) if (m[i].parentElement) cuMarcaj.push(m[i].parentElement);
    for (i = 0; i < toate.length; i++) if (toate[i].children.length >= 3 || cuMarcaj.indexOf(toate[i]) >= 0) out.push(toate[i]);
    return out;
  }
  // o trecere întreagă pe pagina deschisă (grila mare înaintea celor din cardurile ei)
  function aseaza(rad) {
    rad = rad || (typeof document !== "undefined" && document.querySelector(".panel.on")); if (!rad) return 0;
    var de = recipiente(rad), n = 0;
    for (var i = 0; i < de.length; i++) n += aseazaGrila(de[i]).length;
    return n;
  }
  // observatorul: ce se reface după o tură de schimbări din pagina deschisă (doar nodurile, fără stil)
  function tinte(lista, pan) {
    var out = [], vazut = typeof Set === "function" ? new Set() : null;
    if (!pan) return out;
    function pune(e) { if (!e || e.nodeType !== 1 || !pan.contains(e)) return; if (vazut ? vazut.has(e) : out.indexOf(e) >= 0) return; if (vazut) vazut.add(e); out.push(e); }
    function cuSub(e) { pune(e); if (!e || e.nodeType !== 1 || !e.querySelectorAll) return; var t = recipiente(e); for (var i = 0; i < t.length; i++) pune(t[i]); }
    for (var i = 0; i < (lista || []).length; i++) {
      var r = lista[i], t = r.target, j, el = false;
      if (!t || t.nodeType !== 1 || !pan.contains(t)) continue;
      if (r.type === "childList") {
        for (j = 0; j < r.addedNodes.length; j++) if (r.addedNodes[j].nodeType === 1) { el = true; cuSub(r.addedNodes[j]); }
        for (j = 0; j < r.removedNodes.length; j++) if (r.removedNodes[j].nodeType === 1) el = true;
        if (el) pune(t);   // doar text (prețurile vii, cifrele): nimic nu intră și nu iese dintr-o grilă
      } else if (r.type === "attributes") {
        var acum = t.getAttribute(r.attributeName);
        // scris la fel (o clasă pusă unde era, hidden pe ce era ascuns, clasa panoului Tablou rescrisă la 1,5 s): nimic nou
        if (r.oldValue === acum) continue;
        // doar marcajul meu s-a mișcat, iar clasa e cum am lăsat-o (un marcaj șters de altcineva nu trece de aici)
        if (r.attributeName === "class" && t.__arCls === acum && faraMarcaj(r.oldValue) === faraMarcaj(acum)) continue;
        pune(t.parentElement); cuSub(t);
      }
    }
    return out;
  }
  var ceas = null, cadru = null, semnalat = false;
  function semnal(e) { if (semnalat || typeof console === "undefined") return; semnalat = true; console.warn("asezare-randuri: " + (e && e.message || e)); }
  function laSchimbari(lista) {
    try {
      var de = tinte(lista, typeof document !== "undefined" ? document.querySelector(".panel.on") : null); if (!de.length) return;
      de.sort(function (a, b) { return a === b ? 0 : (a.compareDocumentPosition(b) & 4 ? -1 : 1); });
      var facute = typeof Set === "function" ? new Set() : null;
      var fa = function (g) {
        if (facute) { if (facute.has(g)) return; facute.add(g); }
        var sch = aseazaGrila(g);
        // un card care și-a schimbat lățimea: grilele din el, după el
        for (var i = 0; i < sch.length; i++) { var t = recipiente(sch[i]); for (var j = 0; j < t.length; j++) fa(t[j]); }
      };
      for (var i = 0; i < de.length; i++) fa(de[i]);
    } catch (e) { semnal(e); }
  }
  function opreste() { if (ceas) { clearTimeout(ceas); ceas = null; } if (cadru && typeof cancelAnimationFrame === "function") cancelAnimationFrame(cadru); cadru = null; }
  function trecere() { opreste(); try { aseaza(); } catch (e) { semnal(e); } }
  // 0 = înaintea desenului următor; altfel după un răgaz care se mută la fiecare cerere (cât trage de fereastră)
  function programeaza(ms) {
    opreste();
    if (ms) { ceas = setTimeout(trecere, ms); return; }
    if (typeof requestAnimationFrame === "function") cadru = requestAnimationFrame(trecere); else ceas = setTimeout(trecere, 0);
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    // pe telefon bara de adresă schimbă doar înălțimea: atunci nimic
    var latV = window.innerWidth;
    window.addEventListener("resize", function () { if (window.innerWidth === latV) return; latV = window.innerWidth; programeaza(150); });
    var porneste = function () {
      var m = document.querySelector("main"); if (!m) return;
      if (typeof MutationObserver === "function") {
        // pagina arătată (show() pune `on` pe panel), carduri venite / plecate, clase rescrise, pliuri deschise; textul nu (characterData lipsește)
        new MutationObserver(laSchimbari).observe(m, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ["class", "hidden", "style", "open"] });
        // clasa din body ascunde / arată carduri fără nicio schimbare în main (Setări: Crypto / Stocks) ⇒ o trecere, doar la o schimbare reală
        var b = document.body;
        if (b) new MutationObserver(function (l) { for (var i = 0; i < l.length; i++) if (l[i].oldValue !== b.getAttribute("class")) { programeaza(0); return; } }).observe(b, { attributes: true, attributeOldValue: true, attributeFilter: ["class"] });
      }
      programeaza(0);
    };
    if (document.querySelector("main")) porneste(); else document.addEventListener("DOMContentLoaded", porneste);
  }
  return { alege: alege, eCard: eCard, tinte: tinte, aseazaGrila: aseazaGrila, aseaza: aseaza, laSchimbari: laSchimbari, programeaza: programeaza };
})();
