// Canalul Discord pentru alertele colectorului: un webhook (adresa secreta a unui canal),
// fara bot si fara token. Probat in scripts/colector-v77.mjs cu un fetch fals.
//
// Alerta {nivel, titlu, mesaj} -> un "embed" colorat: rosu critic, portocaliu atentie, verde info.
// Discord accepta ~30 de mesaje/minut pe webhook; colectorul trimite mult sub atat.
const CULOARE = { critic: 0xdc283c, atentie: 0xff8c00, info: 0x00aa5a };

export function esteWebhookDiscord(url) {
  return /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(String(url || "").trim());
}

export function mesajDiscord(m) {
  const nivel = ["critic", "atentie", "info"].includes(m && m.nivel) ? m.nivel : "info";
  const titlu = String((m && m.titlu) || "Crypto Radar").slice(0, 256);
  const text = String((m && m.mesaj) || "").slice(0, 2000);
  return {
    username: "Crypto Radar",
    allowed_mentions: { parse: [] },   // v100.40: niciun @everyone / @here / rol din textele alertelor
    // textul simplu apare si in notificarea de pe telefon (embed-ul singur nu se vede in preview)
    content: (nivel === "critic" ? "🔴 " : nivel === "atentie" ? "🟠 " : "🟢 ") + titlu,
    embeds: [{ title: titlu, description: text || undefined, color: CULOARE[nivel], timestamp: new Date(m && m.t > 0 ? m.t : Date.now()).toISOString(), footer: { text: "Crypto Radar · colectorul de acasă" } }],
  };
}

// v100.272 (ideile auditului 29.10, felia 5) - ce poate webhook-ul Discord (docs.discord.com, „Execute Webhook” și „Rate Limits”, citite 30.10):
//  • corpul acceptă content, username, avatar_url, tts, embeds, allowed_mentions, components, files, payload_json, attachments, flags,
//    thread_name, applied_tags, poll - FĂRĂ nonce / enforce_nonce (acelea există doar la mesajele trimise de un bot). Cu ?wait=true răspunsul
//    poartă mesajul creat; un mesaj se citește înapoi doar după id-ul lui (GET …/messages/{id}), nu există listă ⇒ o trimitere rămasă fără
//    răspuns NU se poate verifica și nici deduplica la Discord.
//  • 429: corpul { message, retry_after (secunde, cu zecimale), global } și antetul Retry-After.
// Ce facem: (1) retry_after respectat - o pauză scurtă (≤ asteptMaxMs, 2 s) se așteaptă pe loc și se reia o dată; una lungă se întoarce
// (reiaDupaMs), iar colectorul nu mai bate la ușă până atunci; (2) cele 3 dubluri din jurnal au venit cu bucla blocată (alte cereri „aborted due
// to timeout” în aceeași milisecundă): ceasul de 15 s suna când bucla se elibera, ÎNAINTEA răspunsului deja sosit ⇒ ceasul care sună cu mult
// întârziat mai dă răspunsului rabdareMs, o dată; (3) ce rămâne nesigur (timeout adevărat, conexiune ruptă după trimitere) iese `nesigur`.
const NETRIMIS = ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH", "EADDRNOTAVAIL", "UND_ERR_CONNECT_TIMEOUT"];
function codRetea(e) { const c = e && e.cause; if (!c) return ""; if (c.code) return String(c.code); const l = Array.isArray(c.errors) ? c.errors : []; return l.length && l[0] && l[0].code ? String(l[0].code) : ""; }
// eroarea s-a produs înainte să plece cererea (fără DNS, conexiune refuzată, conectarea expirată) ⇒ sigur netrimis
export function eSigurNetrimis(e) { return NETRIMIS.includes(codRetea(e)); }
// cât cere Discord la 429, în ms (corpul, apoi antetul Retry-After), cel mult 15 min; null = nu spune
export function reiaDupaMs429(corp, antete) {
  let s = null;
  try { const j = JSON.parse(String(corp || "")); if (j && j.retry_after !== undefined && j.retry_after !== null && Number.isFinite(Number(j.retry_after))) s = Number(j.retry_after); } catch {}
  if (s === null && antete && typeof antete.get === "function") { const v = antete.get("retry-after"), h = v === null || v === "" ? NaN : Number(v); if (Number.isFinite(h)) s = h; }
  return s === null || s < 0 ? null : Math.min(15 * 60000, Math.ceil(s * 1000));
}
// fetch cu ceasul lui: sună după timeoutMs; dacă a sunat cu mult peste ora lui (bucla a stat blocată), mai așteaptă o dată rabdareMs
// v100.272 (revizia independentă): ceasul ține și citirea CORPULUI (abort oprește și corpul) - se oprește abia cu stop(), după ce corpul e citit;
// înainte se oprea la antete, iar un corp care nu mai venea ținea cererea ~300 s (limita lui undici), cu golirea cozii Discord blocată
function cuCeas(f, url, opt, timeoutMs, rabdareMs) {
  const ac = new AbortController(); let t = null, oprit = false;
  const stop = () => { oprit = true; if (t !== null) { clearTimeout(t); t = null; } };
  const arma = (ms, ultima) => {
    const la = Date.now() + ms;
    t = setTimeout(() => {
      t = null; if (oprit) return;
      if (!ultima && Date.now() - la > Math.min(1000, ms / 2)) arma(rabdareMs, true);
      else ac.abort(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }));
    }, ms);
  };
  arma(timeoutMs, false);
  let p; try { p = Promise.resolve(f(url, { ...opt, signal: ac.signal })); } catch (e) { p = Promise.reject(e); }
  return p.then((r) => ({ r, stop }), (e) => { stop(); throw e; });
}
// corpul unui răspuns, sub ceasul cererii; ruptură / abort ⇒ "" (nu aruncă: o excepție de aici oprea tura colectorului)
async function corpText(r) { try { return String(await r.text()); } catch { return ""; } }

// deps: { fetch, webhook, jurnal, laRezultat?, timeoutMs?, rabdareMs?, asteptMaxMs? }. Intoarce true doar cand Discord a acceptat (2xx).
// v100.272: rezultatul pe larg - { ok, status, reiaDupaMs (429), nesigur (poate a ajuns) } - merge la laRezultat, dacă e dat
export async function trimiteDiscord(m, d) {
  const gata = (x) => { if (typeof d.laRezultat === "function") { try { d.laRezultat(x); } catch {} } return x.ok; };
  if (!esteWebhookDiscord(d.webhook)) { d.jurnal("discord: webhook lipsa sau cu forma gresita (DISCORD_WEBHOOK in .dev.vars)"); return gata({ ok: false, nesigur: false }); }
  const corp = JSON.stringify(mesajDiscord(m)), timeoutMs = Number(d.timeoutMs) > 0 ? Number(d.timeoutMs) : 15000;
  const rabdareMs = Number(d.rabdareMs) > 0 ? Number(d.rabdareMs) : 3000, asteptMaxMs = Number(d.asteptMaxMs) >= 0 ? Number(d.asteptMaxMs) : 2000;
  for (let incercare = 0; ; incercare++) {
    let r, stop;
    try { ({ r, stop } = await cuCeas(d.fetch, d.webhook.trim() + "?wait=true", { method: "POST", headers: { "content-type": "application/json" }, body: corp }, timeoutMs, rabdareMs)); }
    catch (e) { const nesigur = !eSigurNetrimis(e); d.jurnal("discord EȘEC", e.message + (nesigur ? " (fără confirmare: poate a ajuns)" : "")); return gata({ ok: false, nesigur }); }
    /* v100.272 (revizia): corpul se citește doar la eșec, sub ceasul cererii; apoi ceasul se oprește */
    const text = r.ok ? "" : await corpText(r);
    stop();
    if (r.status === 429) {
      const ms = reiaDupaMs429(text, r.headers);
      if (incercare === 0 && ms !== null && ms <= asteptMaxMs) { d.jurnal("discord 429: aștept " + ms + " ms, cât cere Discord"); await new Promise((rs) => setTimeout(rs, ms)); continue; }
      const reia = ms === null ? 5000 : ms;
      d.jurnal("discord EȘEC 429", "(reiau peste " + Math.ceil(reia / 1000) + " s)", text.slice(0, 200));
      return gata({ ok: false, status: 429, nesigur: false, reiaDupaMs: reia });
    }
    if (!r.ok) { d.jurnal("discord EȘEC", r.status, text.slice(0, 200)); return gata({ ok: false, status: r.status, nesigur: false }); }
    d.jurnal("discord", m.nivel, m.titlu);
    return gata({ ok: true, status: r.status });
  }
}
// v100.175 (auditul Opus, M18): coada de pe disc la plafon taie întâi alertele „info” (cele mai vechi), apoi restul - nu critice vechi
export function taieCoada(l, max) { const c = (Array.isArray(l) ? l : []).slice(); let taiate = 0; while (c.length > max) { let i = c.findIndex((x) => !x || !x.m || x.m.nivel === 'info'); if (i < 0) i = 0; c.splice(i, 1); taiate++; } return { coada: c, taiate }; }
