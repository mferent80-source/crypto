// Scorul sezonului (v100.217, 19.10.2026) - data sezonului + obiectivul LUI, pe serverul de acasă (KV ISTORIC, „scor:sezon”),
// ca să fie la fel pe PC și pe telefon. Boții nu se citesc aici - pagina îi are din Jurnal (jtAduBoti); aici doar configurația.
//   GET                               -> { sezon:{start, obiectiv:{rata,serie,net,pana}, istoric:[{start,sfarsit}]}, sursa:"acasa"|"implicit" }
//   POST ?action=obiectiv {rata,serie,net,pana} -> salvează obiectivul (validat ca în lib/scor-sezon.js; doar de pe aceeași origine)
//   POST ?action=sezonNou             -> sezonul de acum intră în istoric, startul devine 00:00 azi (ora României); obiectivul rămâne
// Pe pagina publicată (Cloudflare) nu există ISTORIC -> GET dă implicitul cu sursa „implicit”, POST 503 cu motiv.
import { requireApiAuth, authErrorResponse, sameOrigin } from "../_shared/auth.js";

const H = { "content-type": "application/json", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
// v100.220: două piețe - ?piata=pionex (implicit) sau t212 (trade-urile T212, în lei, sezonul din 19.10.2026 13:00 = doar cele viitoare);
// + POST ?action=opreste (sezonul îngheață la ora de acum; „sezonNou” îl închide în istoric și pornește altul)
const PIETE = {
  pionex: { cheie: "scor:sezon", start: Date.UTC(2026, 9, 18, 21, 0, 0), obiectiv: { rata: 0.55, serie: 3, net: 50, pana: null } },   // 19.10.2026 00:00 Europe/Bucharest - ca lib/scor-sezon.js
  t212: { cheie: "scor:sezon:t212", start: Date.UTC(2026, 9, 19, 10, 0, 0), obiectiv: { rata: 0.55, serie: 3, net: 200, pana: null } },
};
const piataDin = (u) => (u.searchParams.get("piata") === "t212" ? "t212" : "pionex");
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
  // v100.221 (audit 11): rata e MEREU procent („55” = 55 %; „1” = 1 %); din KV vine fracție ⇒ curata o înmulțește înainte
  if (rata === null || rata < 1 || rata > 100) return { ok: false, eroare: "Rata țintă e un procent între 1 și 100." };
  if (serie === null || serie < 1 || serie > 50 || serie !== Math.round(serie)) return { ok: false, eroare: "Pierderile la rând: un număr întreg de la 1 la 50." };
  if (net === null || net <= 0) return { ok: false, eroare: "Netul țintă e o sumă peste zero, în USDT." };
  if (pana === false) return { ok: false, eroare: "Data: zi.lună.an (de exemplu 30.11.2026) sau goală." };
  return { ok: true, obiectiv: { rata: rata / 100, serie, net, pana } };
}
// 00:00 al zilei de azi pe ora României (UTC+2 iarna / +3 vara, din Intl)
// v100.221 (audit 2): decalajul se ia la MIEZUL NOPȚII local, nu la ora de acum (în ziua schimbării orei diferă cu o oră) - ca lib/scor-sezon.js
const FMT_RO = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function partiRo(t) { const p = {}; FMT_RO.formatToParts(new Date(t)).forEach((x) => { p[x.type] = x.value; }); return p; }
function decalajMin(t) { const p = partiRo(t), d = new Date(t); return ((+p.hour - d.getUTCHours()) * 60 + (+p.minute - d.getUTCMinutes()) + 24 * 60) % (24 * 60); }
export function startulZilei(t) {
  const p = partiRo(t), u = Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0), s = u - decalajMin(u) * 60000;
  return u - decalajMin(s) * 60000;
}
// v100.221 (audit 🔴 1): „sezon nou” - pur, probat în scripts/proba-scor-sezon.mjs. Sezonul de acum se închide la oprire (dacă e oprit),
// altfel la 00:00 azi; dacă a pornit AZI (după 00:00) se închide ACUM. Cel nou pornește de la max(00:00 azi, închidere): niciodată înapoi.
export function sezonNouCalc(acum, now) {
  const zi = startulZilei(now);
  let sfarsit = acum.oprit || Math.max(zi, acum.start);
  if (sfarsit <= acum.start) sfarsit = Math.max(now, acum.start);   // pornit azi ⇒ se închide acum (un sezon care încă n-a început rămâne gol)
  const istoric = sfarsit > acum.start ? (acum.istoric || []).concat([{ start: acum.start, sfarsit }]).slice(-50) : (acum.istoric || []);
  return { ...acum, start: Math.max(zi, sfarsit), oprit: null, istoric };
}
function curata(c, piata) {
  const P = PIETE[piata] || PIETE.pionex;
  const start = c && nr(c.start) > 0 ? nr(c.start) : P.start;
  const rk = c && c.obiectiv ? nr(c.obiectiv.rata) : null;
  const v = c && c.obiectiv ? valideazaObiectiv({ ...c.obiectiv, rata: rk === null ? null : rk <= 1 ? rk * 100 : rk }) : { ok: false };   // în KV rata e fracție
  const istoric = Array.isArray(c && c.istoric) ? c.istoric.filter((x) => x && nr(x.start) > 0 && nr(x.sfarsit) > 0).map((x) => ({ start: nr(x.start), sfarsit: nr(x.sfarsit) })).slice(-50) : [];
  const oprit = c && nr(c.oprit) > start ? nr(c.oprit) : null;
  return { start, oprit, obiectiv: v.ok ? v.obiectiv : { ...P.obiectiv }, istoric, piata };
}
async function citeste(env, piata) {
  if (!env.ISTORIC || !env.ISTORIC.get) return { sezon: curata(null, piata), sursa: "implicit", piata };
  let c = null; try { c = JSON.parse((await env.ISTORIC.get(PIETE[piata].cheie)) || "null"); } catch { c = null; }
  return { sezon: curata(c, piata), sursa: c ? "acasa" : "implicit", piata };
}

export async function onRequestGet({ request, env }) {
  const auth = await requireApiAuth(request, env, "scor-sezon", 120); if (!auth.ok) return authErrorResponse(auth, H);
  return json(await citeste(env, piataDin(new URL(request.url))));
}

export async function onRequestPost({ request, env }) {
  const auth = await requireApiAuth(request, env, "scor-sezon-scrie", 20); if (!auth.ok) return authErrorResponse(auth, H);
  if (!sameOrigin(request)) return json({ error: "Origin rejected" }, 403);
  const u = new URL(request.url), a = u.searchParams.get("action") || "", piata = piataDin(u);
  if (a !== "obiectiv" && a !== "sezonNou" && a !== "opreste") return json({ error: "Acțiune necunoscută." }, 400);
  if (!env.ISTORIC || !env.ISTORIC.put) return json({ error: "Obiectivul se ține pe serverul de acasă - de aici nu se poate salva." }, 503);
  let corp = {}; try { corp = JSON.parse((await request.text()).slice(0, 2000) || "{}"); } catch { return json({ error: "JSON invalid" }, 400); }
  const acum = (await citeste(env, piata)).sezon;
  if (a === "obiectiv") {
    const v = valideazaObiectiv(corp); if (!v.ok) return json({ error: v.eroare }, 400);
    acum.obiectiv = v.obiectiv;
  } else if (a === "opreste") {
    if (acum.oprit) return json({ error: "Sezonul e deja oprit." }, 409);
    acum.oprit = Date.now();
  } else {
    // sezon nou: cel de acum intră în istoric (până la oprire, dacă a fost oprit; altfel până la 00:00 azi); cel nou pornește de la 00:00 azi
    // sau de la ora opririi, dacă opririea a fost tot azi (ca un trade închis azi să nu intre în amândouă)
    Object.assign(acum, sezonNouCalc(acum, Date.now()));
  }
  const { piata: _p, ...deScris } = acum;
  await env.ISTORIC.put(PIETE[piata].cheie, JSON.stringify(deScris));
  return json({ ok: true, sezon: acum, sursa: "acasa", piata });
}
