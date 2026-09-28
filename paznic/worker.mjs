// Paznicul colectorului (v97, ideea 5 din 27.09): daca PC-ul de acasa se opreste sau colectorul moare, alertele botului
// tac FARA niciun semn. Colectorul bate aici la 5 minute (POST /bataie, cu tokenul PAZNIC_TOKEN); cronul de la 10 minute
// verifica: fara bataie de 30 de minute -> un mesaj pe Discord; tot linistit -> cate o amintire la 6 ore; bataia revine ->
// "a revenit". Secretele (DISCORD_WEBHOOK, PAZNIC_TOKEN) stau in Cloudflare (wrangler secret put), nu in cod.
// v98: /poza (poza colectorului pentru pagina alerts din Trading Tools) si /simboluri (lista paginii), cheia de citire
// CHEIE_CITIRE (wrangler secret put), CORS doar pentru originea suitei.
const TACE_MS = 30 * 60000, AMINTIRE_MS = 6 * 3600000;
const POZA_MAX = 512 * 1024, SIMBOLURI_MAX = 60;
const ORIGINI = [/^https:\/\/mferent80-source\.github\.io$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/];
export function origineOk(o) { return !!o && ORIGINI.some((r) => r.test(String(o))); }
function cors(request) {
  const o = request.headers.get("origin");
  if (!origineOk(o)) return {};
  return { "access-control-allow-origin": o, "access-control-allow-headers": "authorization, content-type, if-none-match", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-expose-headers": "etag", "vary": "origin" };
}
const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", ...h } });
function autorizat(request, secret) { const s = String(secret || ""); return s.length >= 20 && request.headers.get("authorization") === "Bearer " + s; }

// poza colectorului: scrisa de acasa cu tokenul, citita de pagina cu cheia de citire
export async function pozaScrie(env, text) {
  if (text.length > POZA_MAX) return { status: 413, corp: { error: "poza prea mare", max: POZA_MAX, marime: text.length } };
  let p; try { p = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  if (!p || typeof p !== "object" || Array.isArray(p) || !(Number(p.la) > 0)) return { status: 400, corp: { error: "lipseste 'la'" } };
  // o singura cheie (o scriere pe poza: KV-ul are limita zilnica de scrieri; si nicio pereche de chei ne-atomica)
  await env.PAZNIC.put("poza", text);
  return { status: 200, corp: { ok: true, la: Number(p.la), marime: text.length } };
}
// ETag-ul = "la" din corp (primul camp al pozei), fara a doua cheie
function laDinText(text) { const m = /"la"\s*:\s*(\d{10,})/.exec(String(text || "").slice(0, 200)); return m ? m[1] : null; }
export async function pozaCiteste(env, ifNoneMatch) {
  const text = await env.PAZNIC.get("poza"); const la = laDinText(text);
  if (!text || !la) return { status: 404, corp: { error: "nicio poza inca" } };
  const etag = '"' + la + '"'; if (ifNoneMatch && ifNoneMatch === etag) return { status: 304, etag };
  return { status: 200, text, etag };
}
// lista de simboluri a paginii, pentru colector (max 60, curatate, fara dubluri)
export async function simboluriScrie(env, text) {
  let c; try { c = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  const l = c && Array.isArray(c.simboluri) ? c.simboluri : null; if (!l) return { status: 400, corp: { error: "lipseste 'simboluri'" } };
  const out = [], vazut = new Set();
  for (const x of l) {
    const s = String(x && x.s || "").toUpperCase().replace(/[^A-Z0-9.\-=^]/g, "").slice(0, 16);
    if (!s || vazut.has(s)) continue; vazut.add(s); out.push({ s, nota: String(x && x.nota || "").slice(0, 80) });
    if (out.length >= SIMBOLURI_MAX) break;
  }
  await env.PAZNIC.put("simboluri", JSON.stringify({ simboluri: out, la: Date.now() }));
  return { status: 200, corp: { ok: true, n: out.length } };
}
export async function simboluriCiteste(env) { let o = null; try { o = JSON.parse(await env.PAZNIC.get("simboluri") || "null"); } catch { o = null; } return o && Array.isArray(o.simboluri) ? o : { simboluri: [], la: null }; }

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
  // v98.1: poza colectorului tine loc de bataie (vine la 2-5 minute); asa colectorul nu mai scrie o cheie in plus pentru puls
  let laPoza = 0; try { laPoza = Number(laDinText(await env.PAZNIC.get("poza"))) || 0; } catch { laPoza = 0; }
  const la = Math.max(Number(s.la) || 0, laPoza);
  if (!la) return { stare: "fara-bataie" };
  const tace = acum - la;
  if (tace < TACE_MS) {
    // v98.2: cat poza curge, colectorul nu mai bate separat (scrieri KV) -> revenirea dupa o tacere anuntata o spune cronul, o singura data
    if (s.anuntatLa) {
      // de cand tacuse = ultimul semn dinaintea tacerii (tinut minte la anunt: poza sau bataie), nu ultima BATAIE de acum zile
      await discord(env, "info", "Crypto Radar: colectorul a revenit", "Colectorul de acasă dă iar semn (poza curge; tăcuse de la " + ora(Number(s.tacutDeLa) || Number(s.la) || la) + "). Alertele botului merg iar.", f);
      await scrie(env, { ...s, la, anuntatLa: undefined, tacutDeLa: undefined });
      return { stare: "revenit" };
    }
    return { stare: "bate" };
  }
  if (s.anuntatLa && acum - s.anuntatLa < AMINTIRE_MS) return { stare: "tace-anuntat" };
  const prima = !s.anuntatLa;
  const ok = await discord(env, "critic", "Crypto Radar: colectorul tace de " + minute(tace),
    "Ultimul semn de la PC-ul de acasă: " + ora(la) + ". Cât tace, NU primești alertele botului (lichidare, grid, planul tău, podeaua)." +
    (prima ? " Verifică: e pornit PC-ul? merge internetul? rulează PORNESTE-CRYPTO-RADAR.bat?" : " Încă tace."), f);
  if (ok) await scrie(env, { ...s, anuntatLa: acum, tacutDeLa: s.tacutDeLa || la });
  return { stare: ok ? "anuntat" : "discord-picat" };
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url), h = cors(request), m = request.method;
    if (m === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (u.pathname === "/bataie") {
      if (m !== "POST") return J({ error: "doar POST" }, 405, h);
      if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h);
      let corp = null; try { corp = JSON.parse((await request.text()).slice(0, 2000)); } catch { corp = null; }
      const s = await bataie(env, corp, Date.now());
      return J({ ok: true, la: s.la }, 200, h);
    }
    if (u.pathname === "/poza") {
      if (m === "POST") { if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h); const r = await pozaScrie(env, await request.text()); return J(r.corp, r.status, h); }
      if (m === "GET") {
        if (!autorizat(request, env.CHEIE_CITIRE)) return J({ error: "cheia de citire lipseste sau nu e buna" }, 401, h);
        const r = await pozaCiteste(env, request.headers.get("if-none-match"));
        if (r.status === 304) return new Response(null, { status: 304, headers: { ...h, etag: r.etag } });
        if (r.status !== 200) return J(r.corp, r.status, h);
        return new Response(r.text, { status: 200, headers: { ...h, "content-type": "application/json", "cache-control": "no-store", etag: r.etag } });
      }
      return J({ error: "doar GET sau POST" }, 405, h);
    }
    if (u.pathname === "/simboluri") {
      if (m === "POST") { if (!autorizat(request, env.CHEIE_CITIRE)) return J({ error: "cheia de citire lipseste sau nu e buna" }, 401, h); const r = await simboluriScrie(env, await request.text()); return J(r.corp, r.status, h); }
      if (m === "GET") { if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h); return J(await simboluriCiteste(env), 200, h); }
      return J({ error: "doar GET sau POST" }, 405, h);
    }
    return J({ serviciu: "paznicul colectorului Crypto Radar" }, 200, h);
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(verifica(env, Date.now())); }
};
