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
    // textul simplu apare si in notificarea de pe telefon (embed-ul singur nu se vede in preview)
    content: (nivel === "critic" ? "🔴 " : nivel === "atentie" ? "🟠 " : "🟢 ") + titlu,
    embeds: [{ title: titlu, description: text || undefined, color: CULOARE[nivel], timestamp: new Date(m && m.t > 0 ? m.t : Date.now()).toISOString(), footer: { text: "Crypto Radar · colectorul de acasă" } }],
  };
}

// deps: { fetch, webhook, jurnal }. Intoarce true doar cand Discord a acceptat (2xx).
export async function trimiteDiscord(m, d) {
  if (!esteWebhookDiscord(d.webhook)) { d.jurnal("discord: webhook lipsa sau cu forma gresita (DISCORD_WEBHOOK in .dev.vars)"); return false; }
  try {
    const r = await d.fetch(d.webhook.trim() + "?wait=true", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mesajDiscord(m)), signal: AbortSignal.timeout(15000) });
    if (!r.ok) { d.jurnal("discord EȘEC", r.status, String(await r.text()).slice(0, 200)); return false; }
    d.jurnal("discord", m.nivel, m.titlu);
    return true;
  } catch (e) { d.jurnal("discord EȘEC", e.message); return false; }
}
