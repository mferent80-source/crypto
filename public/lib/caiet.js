// v100.312 (07.11.2026, I-843, el: „la ce potențial ai tu… să fim realiști” ⇒ „fă tot”): caietul de păreri judecate - partea PURĂ, aceeași pe
// pagina Probe și în raportul de duminică al colectorului (incarca). O părere: moneda, p = șansa să fie MAI SUS peste `zile` zile, autorul
// („eu” = el, „claude”), ora notării. Judecata (y = 1 dacă închiderea de 1 minut de la termen e peste cea de la notare) o scrie colectorul.
// Scorul: Brier = media (p − y)²; „50% la fiecare” dă 0,25 ⇒ abilitatea = 1 − Brier / 0,25 (peste zero = mai bine decât banul).
var Caiet = (function () {
  var ZI = 86400000, ORIZONTURI = [1, 3, 7, 14, 30], PRAG_SEMN = 30;
  function judecata(p, J) { var j = J && p && J[p.id]; return j && (j.y === 0 || j.y === 1) ? j : null; }
  function scor(lista, J) {
    var o = {};
    (Array.isArray(lista) ? lista : []).forEach(function (p) {
      if (!p) return;
      var a = p.autor === "claude" ? "claude" : "eu", x = o[a] || (o[a] = { notate: 0, judecate: 0, nimerite: 0, decise: 0, sb: 0, m2n: 0, m2sb: 0, m2sbP: 0 });
      x.notate++;
      var j = judecata(p, J); if (!j) return;
      x.judecate++; x.sb += Math.pow(p.p - j.y, 2);
      if (p.p !== 0.5) { x.decise++; if ((p.p > 0.5) === (j.y === 1)) x.nimerite++; }
      if (p.m2 > 0 && p.m2 < 1) { x.m2n++; x.m2sb += Math.pow(p.m2 - j.y, 2); x.m2sbP += Math.pow(p.p - j.y, 2); }
    });
    Object.keys(o).forEach(function (a) {
      var x = o[a];
      x.brier = x.judecate ? x.sb / x.judecate : null;
      x.abilitate = x.brier == null ? null : 1 - x.brier / 0.25;
      x.m2Abilitate = x.m2n ? 1 - x.m2sb / x.m2n / 0.25 : null;    // M2 pe aceleași păreri (unde moneda era în lista direcției din ziua notării)
      x.m2AbilitateTa = x.m2n ? 1 - x.m2sbP / x.m2n / 0.25 : null;  // autorul pe ACELEAȘI păreri
      delete x.sb; delete x.m2sb; delete x.m2sbP;
    });
    return o;
  }
  function termen(p) { return Number(p.la) + Number(p.zile) * ZI; }
  // starea unei păreri pentru pagină: „judecată”, „așteaptă termenul”, „fără preț” (eroare a colectorului)
  function stare(p, J, acum) {
    var j = J && J[p.id] || {};
    if (j.eroare) return { k: "eroare", j: j };
    if (j.y === 0 || j.y === 1) return { k: "judecata", j: j, nimerit: p.p === 0.5 ? null : (p.p > 0.5) === (j.y === 1) };
    return { k: termen(p) <= (acum || Date.now()) ? "lajudecat" : "asteapta", j: j };
  }
  return { ORIZONTURI: ORIZONTURI, PRAG_SEMN: PRAG_SEMN, scor: scor, termen: termen, stare: stare, judecata: judecata };
})();
if (typeof globalThis !== "undefined") globalThis.Caiet = Caiet;
