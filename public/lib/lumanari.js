// Lumânările Pionex ținute O SINGURĂ DATĂ pe (monedă, interval) (v100.304, ideea I-808; el, 05.11.2026: „fa toate”). Înainte, pagina
// Range Filter, rândul „Range Filter” din Tabloul botului și Trade-ul zilei cereau aceleași lumânări 1h × 500, fiecare cu cache-ul lui
// (până la 30 de cereri în plus la o deschidere de pagini în șir, iar Pionex blochează IP-ul la prea multe cereri).
// Regula: bune până se închide bara următoare - `time` de la Pionex e ora de DESCHIDERE (probat pe viu 05.11), bara cea mai nouă e în
// formare (GridCalcul.bare o aruncă) ⇒ ultima închisă + 2 × intervalul. Toți cei trei cer 500 de bare pe pagină (cheia nu ține limita).
// Fără DOM: proba (scripts/proba-v100304.mjs) îl rulează în vm.
var Lumanari = (function () {
  var MS = { "15M": 900000, "60M": 3600000, "4H": 14400000, "1D": 86400000 };
  var cache = {}, zbor = {};   // zbor: cererile deja plecate, pe aceeași cheie (revizia Opus: RF + Trade-ul zilei pornite deodată)
  function urm(randuri, tf) {
    var bare = typeof GridCalcul !== "undefined" ? GridCalcul.bare(randuri) : null, t = bare && bare.length ? bare[bare.length - 1].t : 0;
    return t > 0 && MS[tf] ? t + 2 * MS[tf] : 0;
  }
  // { r1, r2, urm } cât e proaspăt, altfel null; r2 = a doua pagină (Range Filter, „DOVADA pe 1.000 de bare”), dacă a fost cerută
  function ia(pionex, tf) { var e = cache[pionex + "|" + tf]; return e && Date.now() < e.urm ? e : null; }
  function pune(pionex, tf, r1, r2) {
    var u = urm(r1, tf);
    if (u > 0) cache[pionex + "|" + tf] = { r1: r1, r2: r2 || null, urm: u };
    return u > 0;
  }
  // prima pagină: din cache sau de la Pionex; refuzul vine 200 {result:false, retryAfter} ⇒ { refuz: true }
  function cere(pionex, tf, limit) {
    var e = ia(pionex, tf), cheie = pionex + "|" + tf;
    if (e) return Promise.resolve({ randuri: e.r1, dinCache: true });
    if (zbor[cheie]) return zbor[cheie];
    var p = (async function () {
      var k = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(pionex) + "&interval=" + tf + "&limit=" + (limit || 500));
      if (k && k.result === false) return k.retryAfter != null ? { refuz: true, randuri: [] } : { randuri: [] };
      var r = (k && k.data && k.data.klines) || [];
      pune(pionex, tf, r);
      return { randuri: r };
    })();
    zbor[cheie] = p;   // pus ÎNAINTE de curățare: și o eroare aruncată pe loc lasă cheia liberă
    var gata = function () { if (zbor[cheie] === p) delete zbor[cheie]; };
    p.then(gata, gata);
    return p;
  }
  return { MS: MS, ia: ia, pune: pune, cere: cere };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Lumanari;
