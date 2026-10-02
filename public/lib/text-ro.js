// Cifrele din textele sfaturilor (v100.61, specul „sfaturi concise”, 02.10): un singur loc pentru virgula zecimala, minusul
// tipografic („−”) si unitati - folosit de pagina si de colector. Preturile NU trec pe aici: raman cu zecimalele Pionex (fmtPret / grPret).
// Orice valoare lipsa sau stricata (null, NaN, Infinity) iese „—”, niciodata „NaN%” sau „null USDT”.
var TextRo = (function () {
  "use strict";
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function zec(z, implicit) { return typeof z === "number" && z >= 0 && z <= 6 ? Math.floor(z) : implicit; }
  // „12,4” / „−0,8”; un zero rotunjit nu poarta semn („0,0”, nu „−0,0”)
  function num(x, z) {
    x = nr(x); if (x === null) return "—";
    var s = Math.abs(x).toFixed(zec(z, 1));
    return (x < 0 && Number(s) !== 0 ? "−" : "") + s.replace(".", ",");
  }
  // x e deja in procente: pct(12.4) -> „12,4%”
  function pct(x, z) { return nr(x) === null ? "—" : num(x, z) + "%"; }
  function cuPlus(x, z, implicit) { x = nr(x); return x !== null && x > 0 && Number(Math.abs(x).toFixed(zec(z, implicit))) !== 0 ? "+" : ""; }
  function pctSemn(x, z) { return nr(x) === null ? "—" : cuPlus(x, z, 1) + num(x, z) + "%"; }
  function ori(x, z) { return nr(x) === null ? "—" : num(x, z) + "×"; }
  function usdt(x, z) { z = zec(z, 2); return nr(x) === null ? "—" : cuPlus(x, z, 2) + num(x, z) + " USDT"; }
  // „1.234 lei” (rotunjit la leu, mii cu punct); cuSemn -> „+1.234 lei”
  function lei(x, cuSemn) {
    x = nr(x); if (x === null) return "—";
    var r = Math.round(Math.abs(x)), s = String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (x < 0 && r !== 0 ? "−" : cuSemn && x > 0 && r !== 0 ? "+" : "") + s + " lei";
  }
  // durata in ms: sub o ora „45 min”, altfel „1 h” / „5,3 h”
  function ore(ms) {
    ms = nr(ms); if (ms === null || ms < 0) return "—";
    var m = Math.round(ms / 60000);
    if (m < 60) return Math.max(1, m) + " min";
    var h = Math.round(ms / 360000) / 10;
    return (h % 1 === 0 ? String(h) : num(h, 1)) + " h";
  }
  // v100.71 (revizia pachetului 4, I1): numarul cu substantivul lui - „1 caz”, „4 cazuri”, „45 de cazuri”, „101 cazuri”
  // („de” cand ultimele doua cifre sunt 20–99, sau 00 de la 100 in sus)
  function cate(n, sg, pl) { var k = Math.round(Number(n)); if (!isFinite(k)) return "— " + pl; var r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  // v100.77 (ideea 1): orele unui prag - „1 oră”, „2 ore”, „24 de ore”, „2,25 ore” (cel mult 2 zecimale) - aceeași formă pe Tablou și în alertă
  function oreN(h) { var v = Number(h); if (!isFinite(v)) return "— ore"; v = Math.round(Math.abs(v) * 100) / 100; return Number.isInteger(v) ? cate(v, "oră", "ore") : String(v).replace(".", ",") + " ore"; }
  // v100.78 (ideea 1): un text SALVAT înainte de v100.61 (raportul de duminică de pe server) se afișează cu cifrele în forma nouă:
  // „−36.16 USDT” -> „−36,16 USDT”, „-8.17 USDT” -> „−8,17 USDT”, „33.3%” -> „33,3%”. Doar cifrele urmate de USDT / %; cuvintele rămân,
  // leii („+1.052 lei” = mii cu punct) și prețurile nu se ating, iar un text deja nou iese neschimbat.
  function cifreNoi(t) {
    return String(t == null ? "" : t).replace(/(^|[^\w.,])([+−-]?)(\d+)\.(\d+)(\s?(?:USDT|%))/g, function (m, pre, s, a, b, u) { return pre + (s === "-" ? "−" : s) + a + "," + b + u; });
  }
  // v100.78 (ideea 3): ruperea rândurilor lungi, într-un singur loc (autopsiile, raportul de duminică). Un rând peste max (160 implicit)
  // se rupe la granița de sens - după „; ” / „: ”, înainte de „ — ” (cel mai târziu loc, nu în primele 40 de caractere) -, altfel pe
  // cuvinte; rândurile deja rupte („\n”) se iau pe rând. Nimic tăiat.
  function rupe(t, max) {
    max = typeof max === "number" && max >= 60 ? Math.floor(max) : 160;
    return String(t == null ? "" : t).split("\n").map(function un(s) {
      if (s.length <= max) return s;
      var bun = -1;
      ["; ", ": ", " — "].forEach(function (sep) { var i = s.lastIndexOf(sep, max - 2); if (i >= 40) { var c = sep === " — " ? i : i + sep.length - 1; if (c > bun) bun = c; } });
      if (bun < 0) { var sp = s.lastIndexOf(" ", max); bun = sp > 0 ? sp : max; }
      return s.slice(0, bun).replace(/\s+$/, "") + "\n" + un(s.slice(bun).replace(/^\s+/, ""));
    }).join("\n");
  }
  return { num: num, pct: pct, pctSemn: pctSemn, ori: ori, usdt: usdt, lei: lei, ore: ore, cate: cate, oreN: oreN, cifreNoi: cifreNoi, rupe: rupe };
})();
if (typeof globalThis !== "undefined") globalThis.TextRo = TextRo;
