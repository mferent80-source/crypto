// v100.112 (I-553, el: „fa tot”): starea semaforului din Tablou, fără DOM și fără rețea - tura de lumânări (pe rând), reluarea o singură
// dată a TF-urilor care n-au venit și ce primește semaforul (lumânările botului de ACUM + „reîncerc / a doua oară / se aduc”).
// Rețeaua și desenul vin de la pagină (o.aduce, o.analizeaza, o.pas); probele (scripts/proba-v100112.mjs) le dau secvențe de răspunsuri / erori.
var TabloTrend = (function () {
  "use strict";
  function motivImplicit(e) { return String(e && e.message || e || "eroare"); }
  function rand(x, an) { return Object.assign({ tf: x.tf, eticheta: x.eticheta, orizontText: x.orizontText }, an); }
  function cuEroare(rez) { return rez.length > 0 && rez.every(function (r) { return r && r.stare === "eroare"; }); }

  // o = { dirTf: [{ tf, eticheta, orizont, limit, orizontText }] (TF-urile „Direcției” și ale indicatorilor), extraTf: [{ tf, limit }] (doar pentru
  //       semafor), aduce(tf, limit) ⇒ Promise<rânduri | null> (aruncă la eroare), analizeaza(rânduri, x) ⇒ obiectul Directie, motiv(e) ⇒ text,
  //       pas(pe) - după fiecare TF venit (becurile se aprind pe rând) }
  // ⇒ { rez, pe, lipsa, eroare, reiaProgramat }: lipsa = TF-urile care n-au venit; se reiau o dată doar dacă n-au căzut toate (atunci se reia toată tura)
  async function tura(o) {
    var rez = [], pe = {}, dir = o.dirTf || [], extra = o.extraTf || [], motiv = o.motiv || motivImplicit;
    for (var i = 0; i < dir.length; i++) {
      var x = dir[i];
      try {
        var rows = await o.aduce(x.tf, x.limit);
        if (!Array.isArray(rows)) throw new Error("Pionex nu a dat lumânări");   // revizia: lista goală e un răspuns (Directie zice „sub 60 de bare”), nu o eroare
        rez.push(rand(x, o.analizeaza(rows, x))); pe[x.tf] = rows; if (o.pas) o.pas(pe);
      } catch (e) { rez.push({ tf: x.tf, eticheta: x.eticheta, orizontText: x.orizontText, dir: null, stare: "eroare", motiv: motiv(e) }); }
    }
    for (var j = 0; j < extra.length; j++) {
      try { var r = await o.aduce(extra[j].tf, extra[j].limit); if (Array.isArray(r)) { pe[extra[j].tf] = r; if (o.pas) o.pas(pe); } } catch (e) { /* semaforul spune singur „Pionex n-a dat lumânările” */ }
    }
    var lipsa = dir.concat(extra).map(function (x) { return x.tf; }).filter(function (tf) { return !pe[tf]; }), eroare = cuEroare(rez);
    return { rez: rez, pe: pe, lipsa: lipsa, eroare: eroare, reiaProgramat: lipsa.length > 0 && !eroare };
  }

  // d = starea paginii ({ rez, randuriPe, lipsa }) - se modifică pe loc: TF-urile din lipsa se cer o dată; rândul „Direcției” se reface;
  // ce tot nu vine rămâne în lipsa, cu aDouaOara (becul spune „nici la a doua cerere”). ⇒ d
  async function reia(d, o) {
    var dupa = {}, rest = [], lipsa = Array.isArray(d.lipsa) ? d.lipsa.slice() : [];
    (o.dirTf || []).forEach(function (x) { dupa[x.tf] = { x: x, dir: true }; });
    (o.extraTf || []).forEach(function (x) { if (!dupa[x.tf]) dupa[x.tf] = { x: x, dir: false }; });
    d.randuriPe = d.randuriPe || {};
    for (var i = 0; i < lipsa.length; i++) {
      var tf = lipsa[i], p = dupa[tf], lim = p ? p.x.limit : 500;
      try {
        var rows = await o.aduce(tf, lim);
        if (!rows || !rows.length) { rest.push(tf); continue; }
        d.randuriPe[tf] = rows;
        if (p && p.dir) { var nou = rand(p.x, o.analizeaza(rows, p.x)); d.rez = (d.rez || []).map(function (r) { return r.tf === tf ? nou : r; }); }
      } catch (e) { rest.push(tf); }
    }
    d.lipsa = rest; d.reiaProgramat = false; d.aDouaOara = rest.length > 0; d.eroare = cuEroare(d.rez || []);
    return d;
  }

  // ce primește GraficBot.semafor pentru botul cu cheia `cheie` (moneda|direcția): lumânările lui (gata, sau cele venite deja în tura
  // de acum) și opțiunile becurilor fără lumânări. ⇒ null cât n-a venit nimic pentru el
  function stareSemafor(d, cheie) {
    if (!d) return null;
    var fin = d.simbol === cheie, pe = fin && d.randuriPe ? d.randuriPe : d.peLucru && d.peLucru.cheie === cheie ? d.peLucru.pe : null;
    if (!pe) return null;
    return { pe: pe, opt: { reincerc: fin && !!d.reiaProgramat, aDouaOara: fin && !!d.aDouaOara, seAduc: !fin } };
  }

  return { tura: tura, reia: reia, stareSemafor: stareSemafor };
})();
if (typeof globalThis !== "undefined") globalThis.TabloTrend = TabloTrend;
