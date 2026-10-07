// Paznicul colectorului (v97, ideea 5 din 27.09): daca PC-ul de acasa se opreste sau colectorul moare, alertele botului
// tac FARA niciun semn. Colectorul bate aici la 5 minute (POST /bataie, cu tokenul PAZNIC_TOKEN); cronul de la 10 minute
// verifica: fara bataie de 30 de minute -> un mesaj pe Discord; tot linistit -> cate o amintire la 6 ore; bataia revine ->
// "a revenit". Secretele (DISCORD_WEBHOOK, PAZNIC_TOKEN) stau in Cloudflare (wrangler secret put), nu in cod.
// v98: /poza (poza colectorului pentru pagina alerts din Trading Tools) si /simboluri (lista paginii), cheia de citire
// CHEIE_CITIRE (wrangler secret put), CORS doar pentru originea suitei.
const TACE_MS = 30 * 60000, AMINTIRE_MS = 6 * 3600000;
const POZA_MAX = 512 * 1024, SIMBOLURI_MAX = 60;
// v100.42 (audit 30.09): lista se scrie cu cheia de CITIRE a paginii - deci nu are voie sa goleasca cota KV (1.000 de scrieri pe zi pe
// tot contul; o cota golita face paznicul sa tipe pe Discord la 10 minute): lista identica = nicio scriere; cel mult o scriere la 5 s
// si 200 pe zi. Pagina trimite doar la schimbare (cu 1,5 s de pauza), deci folosirea normala nu atinge limitele.
const SIMBOLURI_PAUZA_MS = 5000, SIMBOLURI_PE_ZI = 200, SIMBOLURI_CORP_MAX = 16 * 1024;
const ORIGINI = [/^https:\/\/mferent80-source\.github\.io$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/];
export function origineOk(o) { return !!o && ORIGINI.some((r) => r.test(String(o))); }
function cors(request) {
  const o = request.headers.get("origin");
  if (!origineOk(o)) return {};
  return { "access-control-allow-origin": o, "access-control-allow-headers": "authorization, content-type, if-none-match", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-expose-headers": "etag", "vary": "origin" };
}
const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", ...h } });
// v100.42 (audit 30.09): comparare in timp CONSTANT (=== se opreste la primul caracter diferit - timpul spune cat din cheie e ghicit)
function egalConstant(a, b) { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; }
function autorizat(request, secret) { const s = String(secret || ""); return s.length >= 20 && egalConstant(request.headers.get("authorization") || "", "Bearer " + s); }

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
export async function simboluriScrie(env, text, acum = Date.now()) {
  if (String(text || "").length > SIMBOLURI_CORP_MAX) return { status: 413, corp: { error: "lista prea mare" } };
  let c; try { c = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  const l = c && Array.isArray(c.simboluri) ? c.simboluri : null; if (!l) return { status: 400, corp: { error: "lipseste 'simboluri'" } };
  const out = [], vazut = new Set();
  for (const x of l) {
    const s = String(x && x.s || "").toUpperCase().replace(/[^A-Z0-9.\-=^]/g, "").slice(0, 16);
    if (!s || vazut.has(s)) continue; vazut.add(s); out.push({ s, nota: String(x && x.nota || "").slice(0, 80) });
    if (out.length >= SIMBOLURI_MAX) break;
  }
  const vechi = await simboluriCiteste(env), zi = new Date(acum).toISOString().slice(0, 10);
  if (JSON.stringify(vechi.simboluri) === JSON.stringify(out)) return { status: 200, corp: { ok: true, n: out.length, neschimbat: true } };
  if (vechi.la && acum - vechi.la < SIMBOLURI_PAUZA_MS) return { status: 429, corp: { error: "prea des: mai încearcă peste câteva secunde" } };
  const scrieri = vechi.zi === zi ? (Number(vechi.scrieriZi) || 0) : 0;
  if (scrieri >= SIMBOLURI_PE_ZI) return { status: 429, corp: { error: "prea multe schimbări azi (" + SIMBOLURI_PE_ZI + "); mâine se poate din nou" } };
  await env.PAZNIC.put("simboluri", JSON.stringify({ simboluri: out, la: acum, zi, scrieriZi: scrieri + 1 }));
  return { status: 200, corp: { ok: true, n: out.length } };
}
export async function simboluriCiteste(env) { let o = null; try { o = JSON.parse(await env.PAZNIC.get("simboluri") || "null"); } catch { o = null; } return o && Array.isArray(o.simboluri) ? o : { simboluri: [], la: null }; }

// v101.86 (pagina alerts în două): pozițiile Salt adăugate de pe pagină - pagina scrie cererea (cheia de citire), colectorul o ia,
// o aplică pe lista din Radar și o confirmă (tokenul lui). O singură cheie KV; cel mult 20 în așteptare și 100 de scrieri pe zi.
const SALT_CERERI_MAX = 20, SALT_SCRIERI_ZI = 100;
async function saltCereriCiteste(env) { let o = null; try { o = JSON.parse(await env.PAZNIC.get("salt-cereri") || "null"); } catch { o = null; } return o && Array.isArray(o.cereri) ? o : { cereri: [] }; }
export async function saltCerereScrie(env, text, acum = Date.now()) {
  if (String(text || "").length > 2000) return { status: 413, corp: { error: "cerere prea mare" } };
  let c; try { c = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  const op = c && c.op, n = (x) => (typeof x === "number" && Number.isFinite(x) ? x : NaN);
  if (op !== "pune" && op !== "scoate") return { status: 400, corp: { error: "op: pune sau scoate" } };
  const isin = String(c.isin || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12), simbol = String(c.simbol || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 20);
  if (!isin && !simbol) return { status: 400, corp: { error: "lipsește simbolul sau ISIN-ul" } };
  const x = { id: acum.toString(36) + Math.random().toString(36).slice(2, 6), op, isin: isin || null, simbol: simbol || null, la: acum };
  if (op === "pune") {
    if (!(n(c.qty) > 0) || !(n(c.pretMediu) > 0)) return { status: 400, corp: { error: "bucățile și prețul mediu trebuie să fie mai mari ca zero" } };
    if (c.moneda !== "EUR" && c.moneda !== "USD") return { status: 400, corp: { error: "moneda: EUR sau USD" } };
    Object.assign(x, { qty: c.qty, pretMediu: c.pretMediu, moneda: c.moneda, de: /^\d{4}-\d{2}-\d{2}$/.test(String(c.de || "")) ? c.de : null });
  }
  const v = await saltCereriCiteste(env), zi = new Date(acum).toISOString().slice(0, 10), scrieri = v.zi === zi ? (Number(v.scrieriZi) || 0) : 0;
  if (v.cereri.length >= SALT_CERERI_MAX) return { status: 429, corp: { error: "sunt deja " + SALT_CERERI_MAX + " cereri în așteptare: colectorul de acasă nu le-a luat (e pornit?)" } };
  if (scrieri >= SALT_SCRIERI_ZI) return { status: 429, corp: { error: "prea multe cereri azi (" + SALT_SCRIERI_ZI + "); mâine se poate din nou" } };
  await env.PAZNIC.put("salt-cereri", JSON.stringify({ cereri: v.cereri.concat([x]), zi, scrieriZi: scrieri + 1 }));
  return { status: 200, corp: { ok: true, id: x.id } };
}
export async function saltCereriConfirma(env, text) {
  let c; try { c = JSON.parse(text); } catch { return { status: 400, corp: { error: "JSON stricat" } }; }
  const iduri = new Set(Array.isArray(c && c.iduri) ? c.iduri.map(String) : []), v = await saltCereriCiteste(env), ramase = v.cereri.filter((x) => !iduri.has(String(x.id)));
  if (ramase.length !== v.cereri.length) await env.PAZNIC.put("salt-cereri", JSON.stringify({ ...v, cereri: ramase }));
  return { status: 200, corp: { ok: true, ramase: ramase.length } };
}

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
    if (u.pathname === "/salt-cereri") {
      if (m === "POST") { if (!autorizat(request, env.CHEIE_CITIRE)) return J({ error: "cheia de citire lipseste sau nu e buna" }, 401, h); const r = await saltCerereScrie(env, await request.text()); return J(r.corp, r.status, h); }
      if (m === "GET") { if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h); const v = await saltCereriCiteste(env); return J({ cereri: v.cereri }, 200, h); }
      return J({ error: "doar GET sau POST" }, 405, h);
    }
    if (u.pathname === "/salt-cereri/ack") {
      if (m !== "POST") return J({ error: "doar POST" }, 405, h);
      if (!autorizat(request, env.PAZNIC_TOKEN)) return J({ error: "neautorizat" }, 401, h);
      const r = await saltCereriConfirma(env, await request.text()); return J(r.corp, r.status, h);
    }
    return J({ serviciu: "paznicul colectorului Crypto Radar" }, 200, h);
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(verifica(env, Date.now())); }
};
