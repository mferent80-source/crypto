// Un canal Discord SEPARAT (v100.281 / colector v101.153; el, 31.10: „vreau să trimiți evaluările aici, să nu se amestece cu restul
// mesajelor”): alt webhook, cu coada LUI pe disc - ce nu pleacă se reîncearcă la fiecare buclă, în ordine, cel mult 24 h, cu „(întârziat N min)”;
// în pauza cerută de Discord (429) nicio cerere. Nimic nu cade pe canalul alertelor: fără webhook ⇒ nimic trimis, spus o dată în jurnal.
// Adresa (secretă) nu apare niciodată în jurnal. Probat în scripts/proba-v100281.mjs cu un fetch fals.
import fs from "node:fs";
import { trimiteDiscord, esteWebhookDiscord, taieCoada } from "./canal-discord.mjs";
import { golesteCoadaPas, cuPoateDublura } from "./sanatate-colector.mjs";
import { intarziat } from "./mesaje-colector.mjs";

const MAX_MS = 24 * 3600000;

// { nume (în jurnal), webhook, fis (coada pe disc), fetch, jurnal, cheie (numele setării, spus când lipsește) } ⇒ { legat, trimite, goleste, coada }
// trimite(m) ⇒ true = plecat sau intrat la coadă; false = canalul nu e legat
export function creeazaCanal({ nume, webhook, fis, fetch, jurnal, cheie }) {
  const j = (...a) => { try { jurnal("[" + nume + "]", ...a); } catch {} };
  const legat = esteWebhookDiscord(webhook);
  let coada = []; try { const x = JSON.parse(fs.readFileSync(fis, "utf8")); if (Array.isArray(x)) coada = x; } catch {}
  let golire = null, pauzaPana = 0, spusNelegat = false;
  const salveaza = () => { try { const t = taieCoada(coada, 200); if (t.taiate) j("coada: plafon 200, am renunțat la " + t.taiate + " (întâi cele info)"); coada = t.coada; const tmp = fis + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(coada)); fs.renameSync(tmp, fis); } catch (e) { j("coada nescrisă", e.message); } };
  // { ok, nesigur }: nesigur = plecat fără confirmare (poate a ajuns) ⇒ reîncercat cu „poate e o dublură”, ca pe canalul alertelor
  const unu = async (m) => {
    let info = null; const ok = await trimiteDiscord(m, { fetch, webhook, jurnal: j, laRezultat: (z) => { info = z; } });
    if (!ok && info && info.reiaDupaMs > 0) pauzaPana = Date.now() + info.reiaDupaMs;
    return { ok, nesigur: !ok && !!(info && info.nesigur) };
  };
  function goleste() {
    if (golire) return golire;
    if (!legat || !coada.length || Date.now() < pauzaPana) return Promise.resolve();
    golire = (async () => {
      try {
        const acum = Date.now(), lot = coada.slice(); let marcat = false;
        const r = await golesteCoadaPas(lot, { acum, maxMs: () => MAX_MS, trimite: async (x) => {
          if (Date.now() < pauzaPana) return false;
          const titlu = intarziat(x.m.titlu, Math.round((acum - x.t) / 60000)), z = await unu({ ...x.m, titlu: x.nesigur ? cuPoateDublura(titlu) : titlu });
          if (z.nesigur && !x.nesigur) { x.nesigur = Date.now(); marcat = true; }
          return z.ok;
        } });
        for (const x of r.renuntate) j("renunț (peste 24 h)", x.m && x.m.titlu);
        if (r.ramase.length !== lot.length || marcat) { coada = r.ramase.concat(coada.filter((x) => !lot.includes(x))); salveaza(); }
      } finally { golire = null; }
    })();
    return golire;
  }
  async function trimite(m) {
    if (!legat) { if (!spusNelegat) { j("canalul nu e legat (" + (cheie || "webhook-ul") + " lipsește sau e greșit în .dev.vars) - mesajele lui rămân netrimise"); spusNelegat = true; } return false; }
    if (coada.length || golire) await goleste();
    const x = { t: Date.now(), m: { nivel: m.nivel, titlu: m.titlu, mesaj: m.mesaj || "" } };
    // coada veche întâi: cât mai are mesaje sau Discord a cerut pauză, cel nou intră după ele
    if (coada.length || Date.now() < pauzaPana) { coada.push(x); salveaza(); return true; }
    const z = await unu(x.m);
    if (!z.ok) { if (z.nesigur) x.nesigur = Date.now(); coada.push(x); salveaza(); }
    return true;
  }
  return { legat, trimite, goleste, coada: () => coada.slice() };
}
