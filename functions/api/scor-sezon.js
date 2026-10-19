// Scorul sezonului (v100.217, 19.10.2026) - data sezonului + obiectivul LUI, pe serverul de acasă (KV ISTORIC, „scor:sezon”),
// ca să fie la fel pe PC și pe telefon. Boții nu se citesc aici - pagina îi are din Jurnal (jtAduBoti); aici doar configurația.
//   GET                               -> { sezon:{start, obiectiv:{rata,serie,net,pana}, istoric:[{start,sfarsit}]}, sursa:"acasa"|"implicit" }
//   POST ?action=obiectiv {rata,serie,net,pana} -> salvează obiectivul (validat ca în lib/scor-sezon.js; doar de pe aceeași origine)
//   POST ?action=sezonNou             -> sezonul de acum intră în istoric, startul devine 00:00 azi (ora României); obiectivul rămâne
// Pe pagina publicată (Cloudflare) nu există ISTORIC -> GET dă implicitul cu sursa „implicit”, POST 503 cu motiv.
import { requireApiAuth, authErrorResponse, sameOrigin } from "../_shared/auth.js";

const H = { "content-type": "application/json", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const CHEIE_KV = "scor:sezon";
const SEZON_IMPLICIT = Date.UTC(2026, 9, 18, 21, 0, 0);   // 19.10.2026 00:00 Europe/Bucharest - aceeași cu lib/scor-sezon.js
const OBIECTIV_IMPLICIT = { rata: 0.55, serie: 3, net: 50, pana: null };
const nr = (v) => { if (typeof v === "number") return Number.isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; const x = Number(v.replace(",", ".")); return Number.isFinite(x) ? x : null; };

// aceeași validare ca ScorSezon.valideazaObiectiv (modulul paginii nu se importă pe server - e un IIFE global)
function dataIso(v) {
  const s = String(v == null ? "" : v).trim(); if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s), r = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  let y, mo, d; if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; } else if (r) { y = +r[3]; mo = +r[2]; d = +r[1]; } else return false;
  const t = new Date(Date.UTC(y, mo - 1, d)); if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return false;
  return t.toISOString().slice(0, 10);
}
export function valideazaObiectiv(o) {
  o = o || {};
  const rata = nr(o.rata), serie = nr(o.serie), net = nr(o.net), pana = dataIso(o.pana);
  if (rata === null || rata <= 0 || rata > 100) return { ok: false, eroare: "Rata țintă e un procent între 1 și 100." };
  if (serie === null || serie < 1 || serie > 50 || serie !== Math.round(serie)) return { ok: false, eroare: "Pierderile la rând: un număr întreg de la 1 la 50." };
  if (net === null || net <= 0) return { ok: false, eroare: "Netul țintă e o sumă peste zero, în USDT." };
  if (pana === false) return { ok: false, eroare: "Data: zi.lună.an (de exemplu 30.11.2026) sau goală." };
  return { ok: true, obiectiv: { rata: rata > 1 ? rata / 100 : rata, serie, net, pana } };
}
// 00:00 al zilei de azi pe ora României (UTC+2 iarna / +3 vara, din Intl)
export function startulZilei(t) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = {}; f.formatToParts(new Date(t)).forEach((x) => { p[x.type] = x.value; });
  const u = Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0), d = new Date(t), dec = ((+p.hour - d.getUTCHours()) * 60 + (+p.minute - d.getUTCMinutes()) + 24 * 60) % (24 * 60);
  return u - dec * 60000;
}
function curata(c) {
  const start = c && nr(c.start) > 0 ? nr(c.start) : SEZON_IMPLICIT;
  const v = c && c.obiectiv ? valideazaObiectiv(c.obiectiv) : { ok: false };
  const istoric = Array.isArray(c && c.istoric) ? c.istoric.filter((x) => x && nr(x.start) > 0 && nr(x.sfarsit) > 0).map((x) => ({ start: nr(x.start), sfarsit: nr(x.sfarsit) })).slice(-50) : [];
  return { start, obiectiv: v.ok ? v.obiectiv : { ...OBIECTIV_IMPLICIT }, istoric };
}
async function citeste(env) {
  if (!env.ISTORIC || !env.ISTORIC.get) return { sezon: curata(null), sursa: "implicit" };
  let c = null; try { c = JSON.parse((await env.ISTORIC.get(CHEIE_KV)) || "null"); } catch { c = null; }
  return { sezon: curata(c), sursa: c ? "acasa" : "implicit" };
}

export async function onRequestGet({ request, env }) {
  const auth = await requireApiAuth(request, env, "scor-sezon", 120); if (!auth.ok) return authErrorResponse(auth, H);
  return json(await citeste(env));
}

export async function onRequestPost({ request, env }) {
  const auth = await requireApiAuth(request, env, "scor-sezon-scrie", 20); if (!auth.ok) return authErrorResponse(auth, H);
  if (!sameOrigin(request)) return json({ error: "Origin rejected" }, 403);
  const a = new URL(request.url).searchParams.get("action") || "";
  if (a !== "obiectiv" && a !== "sezonNou") return json({ error: "Acțiune necunoscută." }, 400);
  if (!env.ISTORIC || !env.ISTORIC.put) return json({ error: "Obiectivul se ține pe serverul de acasă - de aici nu se poate salva." }, 503);
  let corp = {}; try { corp = JSON.parse((await request.text()).slice(0, 2000) || "{}"); } catch { return json({ error: "JSON invalid" }, 400); }
  const acum = (await citeste(env)).sezon;
  if (a === "obiectiv") {
    const v = valideazaObiectiv(corp); if (!v.ok) return json({ error: v.eroare }, 400);
    acum.obiectiv = v.obiectiv;
  } else {
    const start = startulZilei(Date.now());
    if (start > acum.start) acum.istoric = acum.istoric.concat([{ start: acum.start, sfarsit: start }]).slice(-50);
    acum.start = start;
  }
  await env.ISTORIC.put(CHEIE_KV, JSON.stringify(acum));
  return json({ ok: true, sezon: acum, sursa: "acasa" });
}
