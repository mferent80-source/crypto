// v100.6 (el, 28.09: „nicăieri nu se arată prețul live al botului”) - prețul botului LIVE, din tranzacțiile publice
// Pionex (topic TRADE), pe EXACT piața botului (ex. JTO_USDT_PERP), nu spot Binance. Vin prin releul functions/api/pret-viu.js.
// Modul pur (fara DOM, fara retea): citeste mesajele, spune daca pretul e inca viu, compune banda de sus.
// Legatura (socket, reconectare) sta in app.js - pvPorneste(). Probat in scripts/proba-pret-viu.mjs.
var PretViu = (function () {
  "use strict";
  var VIU_MS = 60000;   // fara nicio tranzactie un minut = nu-l mai numim „live”

  function nr(v) {
    if (v === null || v === undefined || typeof v === "boolean") return null;
    if (typeof v === "string" && v.trim() === "") return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // text -> null (nu ne priveste) | {tip:"ping"} | {tip:"pret", pret, text, la}. Ultima tranzactie din lot castiga.
  function mesaj(text, simbol) {
    var m; try { m = JSON.parse(text); } catch (e) { return null; }
    if (!m || typeof m !== "object") return null;
    if (m.op === "PING") return { tip: "ping" };
    if (m.topic !== "TRADE" || m.symbol !== simbol || !Array.isArray(m.data)) return null;
    var best = null;
    for (var i = 0; i < m.data.length; i++) {
      var t = m.data[i] || {}, p = nr(t.price), la = nr(t.timestamp);
      if (t.symbol !== undefined && t.symbol !== simbol) continue;
      if (!(p > 0)) continue;
      if (!best || (la || 0) >= (best.la || 0)) best = { tip: "pret", pret: p, text: String(t.price).trim(), la: la };
    }
    return best;
  }

  // pv = {pret, text, la, primitLa, dir}; viu = am primit ceva in ultimul minut
  function eViu(pv, acum) { return !!(pv && pv.pret > 0 && pv.primitLa && acum - pv.primitLa <= VIU_MS); }
  function directia(vechi, nou) { return vechi == null || nou == null || nou === vechi ? (vechi == null ? null : "egal") : nou > vechi ? "sus" : "jos"; }

  function ora(t) { var d = new Date(t), z = function (x) { return (x < 10 ? "0" : "") + x; }; return z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds()); }

  // Pretul de aratat: cel live daca e viu, altfel cel din ultima citire a botului (Pionex, la 8-60 s), spus pe fata.
  function pretDeAratat(b, pv, botLa, acum) {
    if (eViu(pv, acum)) return { pret: pv.pret, text: pv.text || String(pv.pret), viu: true, dir: pv.dir || null, sursa: "live · Pionex", la: pv.la || pv.primitLa };
    var p = nr(b && b.pretCurent);
    if (p > 0) return { pret: p, text: String(b.pretCurent).trim(), viu: false, dir: null, sursa: botLa ? "din citirea botului de la " + ora(botLa) : "din citirea botului", la: botLa || null };
    if (pv && pv.pret > 0) return { pret: pv.pret, text: pv.text || String(pv.pret), viu: false, dir: null, sursa: "ultimul preț live, de la " + ora(pv.primitLa), la: pv.primitLa };
    return null;
  }

  // Banda de sus: bucatile in ordine; pretul e a doua, imediat dupa nume.
  function banda(o) {
    var b = o.bot; if (!b) return null;
    var parti = [{ k: "nume", t: String(b.baza || "").replace(/\.PERP$/, "") + " " + (b.directie || "") + (b.levier != null ? " " + b.levier + "×" : "") }];
    var pa = pretDeAratat(b, o.pretViu, o.botLa, o.acum);
    if (pa) parti.push({ k: "pret", t: pa.text + (pa.viu && pa.dir === "sus" ? " ▲" : pa.viu && pa.dir === "jos" ? " ▼" : ""), viu: pa.viu, dir: pa.viu ? pa.dir : null, title: "Prețul botului " + pa.sursa });
    var tot = nr(b.profitTotal);
    parti.push({ k: "total", t: tot === null ? "total —" : "total " + (tot > 0 ? "+" : "") + tot.toFixed(2) + " USDT" });
    var dist = nr(b.distantaLichidarePct);
    parti.push({ k: "lich", t: b.lichidareDepasita ? "LICHIDARE DEPĂȘITĂ" : dist === null ? "lichidare —" : "lichidare " + Math.abs(dist).toFixed(1) + "%" });
    var dg = o.distanteGrid;
    if (dg) parti.push({ k: "grid", t: dg.inGrid ? "grid ↓" + (dg.josPct * 100).toFixed(1) + "% ↑" + (dg.susPct * 100).toFixed(1) + "%" : dg.text });
    var z = o.piata;
    if (z && z.ton !== "nu-se-poate") parti.push({ k: "piata", t: z.ton === "rau" ? "piața: împotrivă" : z.ton === "bine" ? "piața: cu botul" : "piața: amestecat" });
    var rau = (dist !== null && (b.lichidareDepasita || Math.abs(dist) < 15)) || (z && z.ton === "rau");
    return { parti: parti, clasa: rau ? "bad" : (tot === null || dist === null || tot < 0) ? "tbWarn" : "good", pret: pa };
  }

  return { VIU_MS: VIU_MS, mesaj: mesaj, eViu: eViu, directia: directia, ora: ora, pretDeAratat: pretDeAratat, banda: banda };
})();
