// Paznicul colectorului (v97, ideea 5 din 27.09): daca PC-ul de acasa se opreste sau colectorul moare, alertele botului
// tac FARA niciun semn. Colectorul bate aici la 5 minute (POST /bataie, cu tokenul PAZNIC_TOKEN); cronul de la 10 minute
// verifica: fara bataie de 30 de minute -> un mesaj pe Discord; tot linistit -> cate o amintire la 6 ore; bataia revine ->
// "a revenit". Secretele (DISCORD_WEBHOOK, PAZNIC_TOKEN) stau in Cloudflare (wrangler secret put), nu in cod.
const TACE_MS = 30 * 60000, AMINTIRE_MS = 6 * 3600000;
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function citeste(env) { try { return JSON.parse(await env.PAZNIC.get("stare") || "null") || {}; } catch { return {}; } }
async function scrie(env, s) { await env.PAZNIC.put("stare", JSON.stringify(s)); }
function minute(ms) { const m = Math.round(ms / 60000); return m < 90 ? m + " de minute" : (m / 60).toFixed(1).replace(".", ",") + " ore"; }
function ora(t) { return new Date(t).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", minute: "2-digit" }); }

export async function discord(env, nivel, titlu, mesaj, f = fetch) {
  if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(String(env.DISCORD_WEBHOOK || ""))) return false;
  const r = await f(env.DISCORD_WEBHOOK + "?wait=true", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "Crypto Radar · paznic", content: (nivel === "critic" ? "🔴 " : "🟢 ") + titlu,
      embeds: [{ title: titlu, description: mesaj, color: nivel === "critic" ? 0xdc283c : 0x00aa5a, footer: { text: "paznicul colectorului · Cloudflare" } }] }) });
  return r.ok;
}

// bataia colectorului: tine minte cand a venit; daca paznicul anuntase tacerea, spune ca a revenit
export async function bataie(env, corp, acum, f = fetch) {
  const s = await citeste(env), era = s.anuntatLa ? s.la : null;
  const nou = { la: acum, pid: Number(corp && corp.pid) || null, versiune: String(corp && corp.versiune || "").slice(0, 20) };
  if (era) await discord(env, "info", "Crypto Radar: colectorul a revenit", "Colectorul de acasă bate din nou (a tăcut de la " + ora(era) + ", " + minute(acum - era) + "). Alertele botului merg iar.", f);
  await scrie(env, nou);
  return nou;
}

// cronul: tace de 30 de minute -> anunta; apoi o amintire la 6 ore
export async function verifica(env, acum, f = fetch) {
  const s = await citeste(env);
  if (!s.la) return { stare: "fara-bataie" };
  const tace = acum - s.la;
  if (tace < TACE_MS) return { stare: "bate" };
  if (s.anuntatLa && acum - s.anuntatLa < AMINTIRE_MS) return { stare: "tace-anuntat" };
  const prima = !s.anuntatLa;
  const ok = await discord(env, "critic", "Crypto Radar: colectorul tace de " + minute(tace),
    "Ultimul semn de la PC-ul de acasă: " + ora(s.la) + ". Cât tace, NU primești alertele botului (lichidare, grid, planul tău, podeaua)." +
    (prima ? " Verifică: e pornit PC-ul? merge internetul? rulează PORNESTE-CRYPTO-RADAR.bat?" : " Încă tace."), f);
  if (ok) await scrie(env, { ...s, anuntatLa: acum });
  return { stare: ok ? "anuntat" : "discord-picat" };
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (u.pathname !== "/bataie") return J({ serviciu: "paznicul colectorului Crypto Radar" });
    if (request.method !== "POST") return J({ error: "doar POST" }, 405);
    const tok = String(env.PAZNIC_TOKEN || "");
    if (tok.length < 20 || request.headers.get("authorization") !== "Bearer " + tok) return J({ error: "neautorizat" }, 401);
    let corp = null; try { corp = JSON.parse((await request.text()).slice(0, 2000)); } catch { corp = null; }
    const s = await bataie(env, corp, Date.now());
    return J({ ok: true, la: s.la });
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(verifica(env, Date.now())); }
};
