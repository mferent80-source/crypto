// Pagina „Comportament” (v100.286 / colector v101.158; el, 31.10: „vreau să faci pagina dedicată în Radar pe comportament cu tot ce ți-am
// cerut”, apoi pe demo: „nu văd evaluarea comportamentală, sfaturi, corecții, disciplină”): colectorul socotește TOT ce arată pagina - din
// aceeași arhivă, aceiași boți porniți, aceleași praguri și aceleași funcții ca mesajele de pe Discord - și trimite textele gata (o zecimală,
// punct la mii) la /api/istoric-bot?action=comportament; pagina (public/lib/comportament-ecran.js) doar le desenează. Modul fără rețea (ține
// doar un memo al evaluărilor vechi refăcute), probat în scripts/proba-v100286.mjs. Ce s-a întâmplat, nu ce urmează: nicio cifră de aici nu e o dovadă.

import { PROBA_DE, oglindaLunii, franaPeSaptamana, lunaPeReguli, reguliPeDateNoi, searaZilei, evalueaza, adaugaInLuna, lunaPentru, lunaInainte } from "./comportament.mjs";
import { evaluareBot, pornitCuFrana, oglindaLunii as oglindaMesaj, sfatSeara, numeRegula, eticheta, numeLuna, ORDINE_REGULI, VERDICT } from "./mesaje-colector.mjs";

const ORA = 3600000, ZI = 86400000, MIN = 60000;
export const FORMA = 1;
// recomandările MELE din analiza de pe 30.10 (2.396 de boți) - nu pragurile lui din Poartă; pagina le scrie „recomandare”
export const ZI_PROASTA = -50, DUPA_PROASTA = 4, ORE_LUNGI = 6;
const PROASTA_TXT = "−" + Math.abs(ZI_PROASTA);
const MAX_EVALUARI = 100;
export const MIN_LUNA = 20;   // revizia: lunile se compară („ce faci bine”, oglinda pe luna începută) doar de la 20 de boți
const nr = (v) => { if (v === null || v === undefined || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const netDe = (t) => (nr(t && t.net) !== null ? nr(t.net) : nr(t && t.rezultat));
const r2 = (v) => Math.round(v * 100) / 100;
const fZi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }), ziRo = (t) => fZi.format(new Date(t));
const fOra = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }), oraRo = (t) => fOra.format(new Date(t));
const fZs = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Bucharest", weekday: "short" }), ZS = { Mon: "lun", Tue: "mar", Wed: "mie", Thu: "joi", Fri: "vin", Sat: "sâm", Sun: "dum" };
const fData = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" });
const fMii = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
// o zecimală, punct la mii, fără „+0,0” / „−0,0”
export const S1 = (v) => { v = Number(v) || 0; const a = Math.round(Math.abs(v) * 10) / 10; return a === 0 ? "0,0" : (v > 0 ? "+" : "−") + fMii.format(a); };
export const U1 = (v) => S1(v) + " USDT";
const z1 = (v) => fMii.format(Math.round(Number(v) * 10) / 10);
function cate(n, sg, pl) {
  const k = Math.round(Number(n)), r = Math.abs(k) % 100;
  const t = typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(k, sg, pl) : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl;
  return Math.abs(k) >= 1000 ? t.replace(/^\d+/, (d) => Number(d).toLocaleString("ro-RO")) : t;
}
const mare = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const ddmm = (zi) => String(zi).slice(8, 10) + "." + String(zi).slice(5, 7);
const plusZile = (zi, d) => new Date(Date.parse(zi + "T12:00:00Z") + d * ZI).toISOString().slice(0, 10);
const pragTxt = (v) => String(v).replace(".", ",");
const ordinal = (n) => (Math.round(Number(n)) === 1 ? "primul" : "al " + Math.round(Number(n)) + "-lea");
const dirTxt = (d) => (d === "long" || d === "short" ? " " + d : "");
const listaSi = (l) => (l.length > 1 ? l.slice(0, -1).join(", ") + " și " + l[l.length - 1] : String(l[0]));
const listaCate = (l, sg, pl) => (l.length > 1 ? l.slice(0, -1).join(", ") + " și " : "") + cate(l[l.length - 1], sg, pl);   // „36, 15, 8 și 20 de boți”
const tonNet = (v) => (v > 0.04 ? "bun" : v < -0.04 ? "rau" : "");
// începutul zilei României `zi` (UTC+2 iarna, +3 vara; în ziua schimbării orei miezul nopții e încă pe ora veche)
function inceputZi(zi) { for (const h of [2, 3]) { const x = Date.parse(zi + "T00:00:00Z") - h * ORA; if (ziRo(x) === zi && ziRo(x - 1) !== zi) return x; } return Date.parse(zi + "T00:00:00Z"); }
const lunaUrm = (c) => { const a = Number(c.slice(0, 4)), l = Number(c.slice(5, 7)); return l === 12 ? (a + 1) + "-01" : a + "-" + String(l + 1).padStart(2, "0"); };
const cand = (t, acum) => { const z = ziRo(t), a = ziRo(acum); return (z === a ? "azi" : z === plusZile(a, -1) ? "ieri" : ddmm(z)) + ", " + oraRo(t); };

// luna oglinzii: în primele 7 zile ale lunii, luna trecută întreagă față de cea dinainte (ca mesajul de pe 1); de pe 8, luna asta până azi
export function lunaOglinda(acum) {
  const z = ziRo(acum), c = z.slice(0, 7);
  return Number(z.slice(8, 10)) < 8 ? { a: lunaInainte(c), b: lunaInainte(lunaInainte(c)), intreaga: true } : { a: c, b: lunaInainte(c), intreaga: false };
}
// disciplina la pornire pe [de, pana): în regulă = al câtelea bot al zilei (ziua României a pornirii) e în pragul lui ȘI frâna pe pierderi
// (azi / 7 zile / la rând) era liberă la pornire - doar ce se știa ATUNCI (franaLaPornire). Boții încă porniți intră la număr; netul, pe închiși.
export function disciplinaPe(trades, deschise, de, pana, P, fl) {
  const prag = nr(P && P.boti) > 0 ? nr(P.boti) : 7, out = { n: 0, ok: 0, pct: null, inchisiOk: 0, netOk: 0, inchisiRau: 0, netRau: 0 };
  const toate = (Array.isArray(trades) ? trades : []).filter((t) => t && nr(t.pornit) !== null && nr(t.inchis) !== null);
  const ids = new Set(toate.map((t) => String(t.id)));   // revizia: un bot deja în arhivă pe care Pionex îl mai dă pornit se numără o dată
  const D = (Array.isArray(deschise) ? deschise : []).filter((b) => b && b.activ !== false && nr(b.pornitLa) !== null && !ids.has(String(b.id)));
  const l = toate.filter((t) => t.pornit >= de && t.pornit < pana)
    .concat(D.filter((b) => nr(b.pornitLa) >= de && nr(b.pornitLa) < pana).map((b) => ({ id: String(b.id), pornit: nr(b.pornitLa), deschis: true })))
    .sort((a, b) => a.pornit - b.pornit);
  const ctx = toate.filter((t) => t.inchis >= de - 8 * ZI), porn = {};
  for (const t of l) {
    const k = ziRo(t.pornit); porn[k] = (porn[k] || 0) + 1; out.n++;
    const dep = new Set((fl(t, ctx, P, D).depasit || []).map((d) => d && d.cod)), bun = porn[k] <= prag && !(dep.has("zi") || dep.has("sapt") || dep.has("rand"));
    if (bun) out.ok++;
    const v = t.deschis ? null : netDe(t);
    if (v !== null) { if (bun) { out.inchisiOk++; out.netOk = r2(out.netOk + v); } else { out.inchisiRau++; out.netRau = r2(out.netRau + v); } }
  }
  out.pct = out.n ? Math.round(100 * out.ok / out.n) : null;
  return out;
}
// pe ziua României a PORNIRII: câți boți (și cei încă porniți) și netul închișilor
function peZile(trades, deschise) {
  const z = new Map(), pune = (p, v) => { const k = ziRo(p), x = z.get(k) || { n: 0, net: 0 }; x.n++; if (v !== null) x.net += v; z.set(k, x); };
  const l = Array.isArray(trades) ? trades : [], ids = new Set(l.map((t) => String(t && t.id)));
  for (const t of l) { const p = nr(t && t.pornit); if (p !== null) pune(p, netDe(t)); }
  for (const b of Array.isArray(deschise) ? deschise : []) { const p = b && b.activ !== false && !ids.has(String(b.id)) ? nr(b.pornitLa) : null; if (p !== null) pune(p, null); }
  return z;
}
// recomandarea 3: după o zi ≤ −50 (pe ziua pornirii), câți boți a doua zi - în ultimele `zile`; doar zilele de după încheiate (nu azi)
export function zileDupaProaste(trades, acum, zile = 31, deschise) {
  const azi = ziRo(acum), de = plusZile(azi, -zile), z = peZile(trades, deschise), out = { zile: [], urm: [], n: 0, respectate: 0 };
  for (const [k, x] of [...z.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const u = plusZile(k, 1); if (k < de || x.net > ZI_PROASTA || u >= azi) continue;
    const c = (z.get(u) || { n: 0 }).n; out.zile.push(k); out.urm.push(c); out.n++; if (c <= DUPA_PROASTA) out.respectate++;
  }
  return out;
}
// pe toată istoria: media boților din ziua de după o zi ≤ −50, față de ziua de după celelalte zile cu boți
export function dupaProastaIstoric(trades, acum, deschise) {
  const azi = ziRo(acum), z = peZile(trades, deschise), a = [], b = [];
  for (const [k, x] of z) { const u = plusZile(k, 1); if (u >= azi) continue; (x.net <= ZI_PROASTA ? a : b).push((z.get(u) || { n: 0 }).n); }
  const m = (l) => (l.length ? Math.round(10 * l.reduce((s, v) => s + v, 0) / l.length) / 10 : null);
  return { n: a.length, dupa: m(a), altfel: m(b) };
}
// regula lui „N pierderi la rând = gata ziua”: în ce zile (ziua României a închiderii) a continuat după a N-a pierdere la rând - câți boți a mai
// pornit în aceeași zi după ea și ce au dat
export function continuatDupaRand(trades, prag) {
  const N = nr(prag) > 0 ? nr(prag) : 3, l = (Array.isArray(trades) ? trades : []).filter((t) => t && nr(t.pornit) !== null && nr(t.inchis) !== null && netDe(t) !== null);
  const peZi = new Map(), out = { zile: 0, boti: 0, net: 0 };
  for (const t of l) { const k = ziRo(t.inchis); if (!peZi.has(k)) peZi.set(k, []); peZi.get(k).push(t); }
  for (const [k, ale] of peZi) {
    ale.sort((a, b) => a.inchis - b.inchis); let r = 0, T = null;
    for (const t of ale) { r = netDe(t) < 0 ? r + 1 : 0; if (r >= N) { T = t.inchis; break; } }
    if (T === null) continue;
    const dupa = l.filter((t) => t.pornit > T && ziRo(t.pornit) === k);
    if (!dupa.length) continue;
    out.zile++; out.boti += dupa.length; out.net = r2(out.net + dupa.reduce((s, t) => s + netDe(t), 0));
  }
  return out;
}

// ---------------- evaluările: textul de pe Discord; cele vechi (fără text în jurnal) refăcute din arhivă, dacă dau aceleași reguli ----------------
const BUNE = { boti: "în pragul zilei", frana: "frâna liberă la pornire", banda: "închis la timp după ieșirea din grilă" };
function refa(x, toate, P, fl, D, dovezi, motive, inreg) {
  const t = toate.find((y) => String(y.id) === String(x.id)); if (!t) return null;
  const ev = evalueaza({ t, frana: fl(t, toate, P, D), afaraOre: null, banda: { dv: null, r: null }, dovezi, motiv: motive && motive.get ? motive.get(String(t.id)) || null : null });
  // revizia: verdictul, regulile încălcate ȘI cele respectate la fel ca în jurnal (banda nu se mai poate reface: orele în afara grilei nu se
  // mai știu) - altfel textul ar spune altceva decât Discordul ⇒ compactă
  const coduri = (l) => (Array.isArray(l) ? l.slice() : []).sort().join(",");
  if (ev.verdict !== x.verdict || coduri(ev.decizii.filter((d) => !d.ok).map((d) => d.cod)) !== coduri(x.rele) || coduri(ev.decizii.filter((d) => d.ok).map((d) => d.cod)) !== coduri(x.bune)) return null;
  const luna = lunaPeReguli(inreg.filter((y) => y !== x && nr(y && y.inchis) !== null && y.inchis < x.inchis), x.inchis);
  adaugaInLuna(luna, ev); ev.luna = lunaPentru(luna, ev);
  const m = evaluareBot(ev); return { titlu: m.titlu, mesaj: m.mesaj };
}
function compact(x) {
  const t = { moneda: x.moneda, dir: x.dir }, net = nr(x.net) || 0, rele = Array.isArray(x.rele) ? x.rele : [], bune = Array.isArray(x.bune) ? x.bune : [];
  const L = ["Net " + U1(net) + "."];
  if (bune.length) L.push("✅ " + mare(bune.map((c) => BUNE[c] || c).join(", ")) + ".");
  if (rele.length) L.push("❌ " + mare(rele.map((c) => numeRegula(c)).join(", ")) + ".");
  L.push("Textul întreg e pe Discord; jurnalul de dinainte de v100.286 ținea doar regulile.");
  return { titlu: (String(t.moneda || "Botul") + dirTxt(t.dir) + ": " + (VERDICT[x.verdict] || x.verdict) + " " + U1(net)).slice(0, 60), mesaj: L.join("\n") };
}
const memoRefacut = new Map();   // id ⇒ textul refăcut (cele vechi sunt câteva și nu se mai schimbă)
function evaluariVm(inreg, toate, P, fl, D, dovezi, motive) {
  const l = inreg.filter((x) => x && nr(x.inchis) !== null).sort((a, b) => b.inchis - a.inchis).slice(0, MAX_EVALUARI);
  return l.map((x) => {
    let txt = typeof x.mesaj === "string" && x.mesaj && typeof x.titlu === "string" ? { titlu: x.titlu, mesaj: x.mesaj } : null, refacut = false;
    if (!txt) { const k = [String(x.id), x.verdict, (Array.isArray(x.rele) ? x.rele.slice().sort() : []).join(","), (Array.isArray(x.bune) ? x.bune.slice().sort() : []).join(",")].join("|"); if (!memoRefacut.has(k)) memoRefacut.set(k, refa(x, toate, P, fl, D, dovezi, motive, inreg)); txt = memoRefacut.get(k); refacut = !!txt; if (!txt) txt = compact(x); }
    return { id: String(x.id).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40), cand: ddmm(ziRo(x.inchis)) + " " + oraRo(x.inchis), titlu: txt.titlu, mesaj: txt.mesaj, verdict: x.verdict, net: r2(nr(x.net) || 0), refacut };
  });
}

// ---------------- boții porniți cu frâna trasă (pierderile peste prag la pornire), TOȚI din ultimele 7 zile ----------------
// revizia: lista vine din arhivă + boții porniți (nu doar din cei văzuți de colector la pornire - azi ar fi fost 2 din 75); textul frânei e cel
// văzut la pornire când există (instantaneul colectorului, cu pierderea boților deschiși), altfel socotit pe istorie. Cei mai noi 10 + numărul.
function porniriVm(st, D, toate, acum, P, flP) {
  const azi = ziRo(acum), de = inceputZi(plusZile(azi, -6)), sn = (st && st.porniri) || {}, out = [];
  const lista = toate.filter((t) => t.pornit >= de && t.pornit <= acum).map((t) => ({ t, b: null }))
    .concat(D.filter((b) => nr(b.pornitLa) >= de && nr(b.pornitLa) <= acum).map((b) => ({ t: { id: String(b.id), pornit: nr(b.pornitLa) }, b })));
  for (const { t, b } of lista) {
    const fIst = flP(t, toate, P, D); if (!fIst.activa) continue;
    const id = String(t.id), v = sn[id], f0 = v && typeof v === "object" && v.f && v.f.activa ? v.f : fIst;
    const moneda = b ? String(b.baza || "").replace(/\.PERP$/, "") || "Botul" : t.moneda || (v && v.moneda) || "Botul";
    const dir = b ? String(b.directie || "").toLowerCase() : t.dir || (v && v.dir) || "";
    const ant = toate.filter((x) => String(x.id) !== id && x.inchis <= t.pornit && x.inchis > t.pornit - ORA).sort((p, q) => q.inchis - p.inchis)[0];
    const min = ant ? Math.max(1, Math.round((t.pornit - ant.inchis) / MIN)) : null;
    out.push({ pornit: t.pornit, titlu: (moneda + dirTxt(dir)).trim(), cand: cand(t.pornit, acum), stare: b ? "încă pornit" : "închis · " + U1(netDe(t)),
      frana: pornitCuFrana(moneda, dir, f0).mesaj.split("\n")[0],
      inainte: ant ? "Pornit " + (min === 1 ? "la un minut" : "la " + cate(min, "minut", "minute")) + " după ce s-a închis " + ant.moneda + dirTxt(ant.dir) + " (" + U1(netDe(ant)) + ")." : null,
      sfat: !b ? null : ziRo(t.pornit) === azi ? "N-aș mai porni altul azi; pe acesta l-aș lăsa să lucreze, cu stopul pus." : "Pe acesta l-aș lăsa să lucreze, cu stopul pus." });
  }
  out.sort((a, b2) => b2.pornit - a.pornit);
  return { n: out.length, lista: out.slice(0, 10).map(({ pornit, ...r }) => r) };
}

// ---------------- profitul real (Profit.profitPe / costuriPe / topSapt ale colectorului) ----------------
function profitVm(pr) {
  if (!pr || !pr.p || !pr.p.perioade) return null;
  const K = ["saptamana", "luna", "an", "total"], P0 = pr.p.perioade;
  const et = { saptamana: "Săptămâna " + ddmm(P0.saptamana.luni) + "–" + ddmm(P0.saptamana.azi), luna: mare(numeLuna(P0.luna.cheie)), an: String(P0.an.an) };
  const unul = (x) => x.eticheta + dirTxt(x.dir) + " " + S1(x.rezultat) + " (" + ddmm(ziRo(x.inchis)) + ")";
  const piata = (nume, o, cost, top, sg, pl, mon, ceCost) => ({ nume,
    randuri: K.map((k) => ({ perioada: k === "total" ? "Total" + (o.total.de ? ", de la " + fData.format(new Date(o.total.de)) : "") : et[k],
      net: o[k].n ? S1(o[k].net) + " " + mon : "—", ton: o[k].n ? tonNet(o[k].net) : "",
      cate: o[k].n ? cate(o[k].n, sg, pl) + " · " + Math.round(100 * o[k].plus / o[k].n) + "% pe plus" : "niciun " + sg + " închis",
      cost: o[k].n && cost && cost[k] ? ceCost + " " + S1(cost[k]) : "" })),
    buni: top ? (top.buni.length ? top.buni.map(unul).join(" · ") : "niciunul pe plus") : "—",
    slabi: top ? (top.slabi.length ? top.slabi.map(unul).join(" · ") : "niciunul pe minus") : "—" });
  return { piete: [piata("Boți Pionex · USDT", pr.p, pr.costP, pr.topP, "bot", "boți", "USDT", "comisioane și funding"),
    pr.q ? piata("Trading 212 · lei", pr.q, pr.costQ, pr.topQ, "trade", "trade-uri", "lei", "comisioane")
      : { nume: "Trading 212 · lei", randuri: [], nota: pr.stareT212 === "nelegat" ? "Trading 212 nu e legat la Radar." : "Istoricul Trading 212 n-a venit acum; revine la citirea următoare." }] };
}

// ---------------- raportul paginii ----------------
// o = { acum, P (Obiceiuri.praguriFrana), f (Obiceiuri.frana de acum, cu boții porniți), toate (JurnalTrade.din - toată arhiva), deschise, motive
// (id ⇒ reasonBy), inreg (data/evaluari.jsonl), st (starea comportamentului: sapt, porniri), fl (Obiceiuri.franaLaPornire), dovezi
// (Comportament.dovezi), istoria (Comportament.istoriaReguli sau null), profit ({ p, q, costP, costQ, topP, topQ, stareT212 } sau null),
// banda (tabelul benzii lui sau un rând { h, n, intoarse }), versiune }
export function raportPagina(o) {
  const acum = o.acum, P = o.P, f = o.f || {}, fl = o.fl, st = o.st || {}, motive = o.motive, dovezi = o.dovezi || {}, azi = ziRo(acum);
  const toate = (Array.isArray(o.toate) ? o.toate : []).filter((t) => t && nr(t.pornit) !== null && nr(t.inchis) !== null);
  const ids = new Set(toate.map((t) => String(t.id)));   // revizia: un bot deja în arhivă pe care Pionex îl mai dă pornit se numără o dată
  const D = (Array.isArray(o.deschise) ? o.deschise : []).filter((b) => b && b.activ !== false && nr(b.pornitLa) !== null && !ids.has(String(b.id)));
  const inreg = (Array.isArray(o.inreg) ? o.inreg : []).filter((x) => x && typeof x === "object"), legat = o.evaluariLegat !== false;
  const dep = new Set((f.depasit || []).map((d) => d && d.cod)), trasa = dep.has("zi") || dep.has("sapt") || dep.has("rand");
  // revizia: zilele frânei pe 7 zile din starea colectorului doar dacă e la zi (pusă azi sau ieri); altfel nu se știe ⇒ 1
  const sz = st.sapt && (st.sapt.zi === azi || st.sapt.zi === plusZile(azi, -1)) ? nr(st.sapt.zile) : null;
  const zileSapt = dep.has("sapt") ? Math.max(1, sz || 1) : 0;
  // revizia: pe pagină „frâna trasă” = pierderile (azi / 7 zile / la rând), ca evaluarea, oglinda și disciplina; pragul zilei (boții porniți)
  // e regula lui separată - altfel al 8-lea bot al zilei ieșea și „cu frâna trasă”, și „peste prag”
  const flP = (t, l, P0, D0, cu) => { const r = fl(t, l, P0, D0, cu), d = (r.depasit || []).filter((x) => x && x.cod !== "boti"); return Object.assign({}, r, { depasit: d, activa: d.length > 0 }); };
  // oglinda: luna asta doar de pe 8 și de la MIN_LUNA boți; altfel luna trecută întreagă
  let lo = lunaOglinda(acum), oa = oglindaLunii(toate, P, lo.a, fl, motive);
  if (!lo.intreaga && (!oa || oa.n < MIN_LUNA)) { lo = { a: lo.b, b: lunaInainte(lo.b), intreaga: true }; oa = oglindaLunii(toate, P, lo.a, fl, motive); }
  const ob = oglindaLunii(toate, P, lo.b, fl, motive), na = numeLuna(lo.a), nb = numeLuna(lo.b), comparabile = !!(oa && ob && oa.n >= MIN_LUNA && ob.n >= MIN_LUNA);
  const fs7 = franaPeSaptamana(toate, P, acum, flP, D), porniti7 = fs7.zile.reduce((s, z) => s + z.porniti, 0), zp7 = fs7.zile.filter((z) => z.porniti > P.boti);
  const zdp = zileDupaProaste(toate, acum, 31, D), ist = dupaProastaIstoric(toate, acum, D), cdr = continuatDupaRand(toate, P.rand);
  const pc = (x, k) => (x && x.n ? Math.round(100 * x[k].n / x.n) : 0), lr = lunaPeReguli(inreg, acum);

  // disciplina: ultimele 7 zile + luna oglinzii și cele două dinainte
  const lunile = [lo.a, lunaInainte(lo.a), lunaInainte(lunaInainte(lo.a))];
  const dRand = [{ eticheta: "Ultimele 7 zile", r: disciplinaPe(toate, D, inceputZi(plusZile(azi, -6)), acum + 1, P, fl) }]
    .concat(lunile.map((c) => ({ eticheta: mare(numeLuna(c)), cheie: c, r: disciplinaPe(toate, D, inceputZi(c + "-01"), Math.min(acum + 1, inceputZi(lunaUrm(c) + "-01")), P, fl) })));
  const dFr = dRand.slice(1).find((x) => x.r.inchisiOk >= 5 && x.r.inchisiRau >= 5);
  const disciplina = { nota: "În regulă = pornit în pragul tău de " + cate(P.boti, "bot", "boți") + " pe zi și cu frâna liberă.",
    randuri: dRand.map((x) => ({ eticheta: x.eticheta, text: x.r.n ? x.r.ok + " din " + x.r.n + " · " + x.r.pct + "%" : "niciun bot", lat: x.r.n ? x.r.pct : 0 })),
    fraza: dFr ? "În " + numeLuna(dFr.cheie) + ", boții porniți în regulă au dat " + U1(dFr.r.netOk / dFr.r.inchisiOk) + " pe bot, cei porniți peste reguli " + U1(dFr.r.netRau / dFr.r.inchisiRau) + " pe bot." : null };

  // ce faci bine / ce greșești
  const bine = [], rau = [];
  if (comparabile) {   // revizia: doar între luni cu cel puțin MIN_LUNA boți
    if (!oa.lichidati.n) bine.push(ob.lichidati.n ? "Nicio lichidare în " + na + " (în " + nb + ": " + ob.lichidati.n + ")." : "Nicio lichidare, nici în " + na + ", nici în " + nb + ".");
    if (oa.frana.n / oa.n < ob.frana.n / ob.n) bine.push("Ai pornit mai rar cu frâna trasă: " + pc(oa, "frana") + "% din boți în " + na + ", față de " + pc(ob, "frana") + "% în " + nb + ".");
    if (oa.zilePeste.z / oa.zile < ob.zilePeste.z / ob.zile) bine.push("Mai puține zile cu prea mulți boți: " + oa.zilePeste.z + " din " + oa.zile + " în " + na + ", față de " + ob.zilePeste.z + " din " + ob.zile + ".");
    const peM = (x) => (x.minute.n ? x.minute.net / x.minute.n : null);   // revizia: pe bot, nu suma (luni cu boți diferiți)
    if (oa.minute.n && ob.minute.n && peM(ob) < 0 && peM(oa) > peM(ob)) bine.push("Închiderile în minute te-au costat mai puțin pe bot: " + U1(peM(oa)) + " în " + na + " (" + cate(oa.minute.n, "bot", "boți") + "), față de " + S1(peM(ob)) + " în " + nb + ".");
    if (oa.lungi.n / oa.n < ob.lungi.n / ob.n) bine.push("Ai ținut mai rar boți peste " + ORE_LUNGI + " h: " + pc(oa, "lungi") + "% în " + na + ", față de " + pc(ob, "lungi") + "%.");
  }
  const cuBoti = fs7.zile.filter((z) => z.porniti > 0); let k = cuBoti.length; while (k > 0 && cuBoti[k - 1].porniti <= P.boti) k--;
  const sir = cuBoti.slice(k);
  if (sir.length >= 2 && k === 0) bine.push("Ai pornit cel mult " + cate(P.boti, "bot", "boți") + " în fiecare zi cu boți din ultima săptămână: " + listaSi(sir.map((z) => z.porniti)) + ".");
  else if (sir.length >= 2) bine.push("De pe " + ddmm(sir[0].zi) + " ții numărul de boți în prag: " + listaSi(sir.map((z) => z.porniti)) + " pe zi (pe " + ddmm(cuBoti[k - 1].zi) + " erau " + cuBoti[k - 1].porniti + ").");
  // ziua de azi nu s-a terminat: „respectată” se spune doar pe zilele încheiate; azi, „deocamdată”
  const trec = fs7.zile.slice(0, 6), respTrec = trec.filter((z) => z.respectata).length, traseTrec = trec.filter((z) => z.trasa).length, aziResp = !!(fs7.zile[6] && fs7.zile[6].respectata);
  if (respTrec) bine.push(respTrec === traseTrec ? (traseTrec === 1 ? "Ai respectat frâna în ziua în care a fost trasă." : "Ai respectat frâna în toate cele " + cate(traseTrec, "zi", "zile") + " în care a fost trasă.")
    : "Ai respectat frâna în " + cate(respTrec, "zi", "zile") + " din cele " + cate(traseTrec, "zi", "zile") + " în care a fost trasă.");
  if (fs7.nPeste) {
    const inch = fs7.nPeste - fs7.deschisi;
    rau.push("Pornești cu frâna trasă: " + (porniti7 === 1 ? "singurul bot" : fs7.nPeste === porniti7 ? "toți cei " + cate(porniti7, "bot", "boți") : fs7.nPeste + " din cei " + cate(porniti7, "bot", "boți"))
      + " din ultimele 7 zile" + (inch > 0 ? (inch === 1 ? "; cel închis a dat " : "; cei închiși au dat ") + U1(fs7.netPeste) : "") + ".");
  }
  if (zp7.length) rau.push("Ai trecut de pragul tău de " + cate(P.boti, "bot", "boți") + " pe zi în " + cate(zp7.length, "zi", "zile") + " din ultimele 7 (" + listaCate(zp7.map((z) => z.porniti), "bot", "boți") + ").");
  if (zdp.urm.some((c) => c > DUPA_PROASTA)) rau.push((ist.n >= 3 && ist.dupa > ist.altfel ? "După o zi proastă pornești mai mulți boți, nu mai puțini: " : "După o zi proastă nu te oprești: ")
    + (zdp.n === 1 ? "după ziua sub " + PROASTA_TXT + " din ultima lună, a doua zi ai pornit " + cate(zdp.urm[0], "bot", "boți") : "după cele " + cate(zdp.n, "zi", "zile") + " sub " + PROASTA_TXT + " din ultima lună, a doua zi ai pornit " + listaCate(zdp.urm, "bot", "boți")) + ".");
  const lungPe = oa && oa.lungi.n ? oa.lungi.net / oa.lungi.n : null, restPe = oa && oa.n > oa.lungi.n ? (oa.net - oa.lungi.net) / (oa.n - oa.lungi.n) : null;
  if (oa && oa.lungi.n >= 3 && restPe !== null && lungPe < 0 && lungPe < restPe) rau.push("Ții mai mult boții care merg prost: " + cate(oa.lungi.n, "bot ținut", "boți ținuți") + " peste " + ORE_LUNGI + " h în " + na + ", " + U1(lungPe) + " pe bot, față de " + S1(restPe) + " la ceilalți.");
  const dm = dovezi.minute, ori = dm && dm.grile > 0 ? z1(Math.abs(dm.comisioane) / dm.grile) + "×" : null;
  if (oa && oa.minute.n) rau.push("Închizi gridul în minute: " + cate(oa.minute.n, "bot", "boți") + " în " + na + " (" + U1(oa.minute.net) + ")" + (ori ? "; sub 15 minute, comisioanele sunt " + ori + " cât prind grilele" : "") + ".");
  if (oa && oa.lichidati.n) rau.push("Ai avut " + cate(oa.lichidati.n, "lichidare", "lichidări") + " în " + na + " (" + U1(oa.lichidati.net) + "): stopul înaintea lichidării, de la pornire.");

  // sfatul săptămânii - un singur lucru, cel mai greu
  const cauza = dep.has("sapt") ? "7 zile " + U1(f.netSapt) + ", pragul −" + pragTxt(P.sapt) : dep.has("zi") ? "azi " + U1(f.netZi) + ", pragul −" + pragTxt(P.zi) : cate(f.rand, "pierdere", "pierderi") + " la rând";
  const sfat = zileSapt >= 4 ? "Un singur lucru săptămâna asta: frâna. Cu pragul de −" + pragTxt(P.sapt) + " pe 7 zile ești peste el de " + cate(zileSapt, "zi", "zile") + ", așa că orice bot pornit e o încălcare și frâna nu mai măsoară nimic. Ori ții pauză până revine, ori pui în Poartă un prag pe care îl respecți."
    : trasa ? "Un singur lucru azi: frâna e trasă (" + cauza + "). N-aș mai porni boți azi; mâine, cu capul limpede."
    : zp7.length >= 2 ? "Un singur lucru săptămâna asta: numărul de boți. Ai trecut de pragul de " + P.boti + " în " + zp7.length + " din ultimele 7 zile; după " + ordinal(P.boti) + ", gata ziua."
    : fs7.nPeste ? "Un singur lucru săptămâna asta: pornirile cu frâna trasă (" + cate(fs7.nPeste, "bot", "boți") + "). Aș porni doar cu frâna liberă."
    : oa && oa.minute.n >= 5 ? "Un singur lucru luna asta: lasă gridul să lucreze. " + mare(cate(oa.minute.n, "bot închis", "boți închiși")) + " în minute în " + na + "."
    : "Nimic urgent de îndreptat: în ultimele 7 zile ai pornit în regulile tale. Aș păstra ritmul.";

  // cardul Azi - frâna de acum, pe pragurile lui
  const aziVm = { activa: !!f.activa, eticheta: trasa ? "Frâna e trasă" : dep.has("boti") ? "Pragul zilei atins" : "Frâna e liberă",
    titlu: dep.has("sapt") ? "Pe 7 zile ai " + U1(f.netSapt) + ". Pragul tău e −" + pragTxt(P.sapt) + "."
      : dep.has("zi") ? "Azi ai " + U1(f.netZi) + ". Pragul tău e −" + pragTxt(P.zi) + "."
      : dep.has("rand") ? mare(cate(f.rand, "pierdere", "pierderi")) + " la rând. Pauza ta e la " + P.rand + "."
      : dep.has("boti") ? mare(cate(f.pornitiAzi, "bot pornit", "boți porniți")) + " azi. Pragul tău e " + P.boti + "."
      : "Azi " + U1(f.netZi) + " din −" + pragTxt(P.zi) + ", pe 7 zile " + S1(f.netSapt) + " din −" + pragTxt(P.sapt) + ".",
    cifre: [{ v: (f.pornitiAzi || 0) + " din " + P.boti, et: "boți porniți azi" },
      { v: (f.rand || 0) + " din " + P.rand, et: "pierderi la rând" },
      { v: S1(f.netZi) + " din −" + pragTxt(P.zi), et: "USDT azi" }],
    nota: zileSapt >= 4 ? "E trasă de " + cate(zileSapt, "zi", "zile") + " la rând, așa că nu-ți mai spune nimic nou." : zileSapt >= 2 ? "E trasă de " + cate(zileSapt, "zi", "zile") + " la rând." : null,
    sfat: zileSapt >= 4 ? "Aș hotărî azi: țin pauza până revine săptămâna sau pun în Poartă un prag pe care îl respect." : trasa ? "N-aș mai porni boți azi; mâine, cu capul limpede."
      : dep.has("boti") ? "N-aș mai porni alți boți azi: pragul tău e " + P.boti + "." : null };

  // corecțiile: regulile lui (Poartă) și recomandările din analiza de pe 30.10
  const dz = dovezi.zile, rb = Array.isArray(o.banda) ? (o.banda.find((x) => x && x.h === ORE_LUNGI && x.n >= 30) || o.banda.find((x) => x && x.n >= 30 && nr(x.intoarse) !== null && x.intoarse < 0.5)) : o.banda;
  const corectii = [
    { regula: "Frâna trasă = pauză, sau un prag nou în Poartă", recomandare: false, stare: trasa ? (zileSapt >= 2 ? "trasă de " + cate(zileSapt, "zi", "zile") : "trasă azi") : "liberă", ton: trasa ? "rau" : "bun",
      dece: (dep.has("sapt") ? "Pe 7 zile ai " + U1(f.netSapt) + ", pragul tău e −" + pragTxt(P.sapt) + "." : dep.has("zi") ? "Azi ai " + U1(f.netZi) + ", pragul tău e −" + pragTxt(P.zi) + "."
        : dep.has("rand") ? mare(cate(f.rand, "pierdere", "pierderi")) + " la rând, pauza ta e la " + P.rand + "." : "Azi " + U1(f.netZi) + " din −" + pragTxt(P.zi) + ", pe 7 zile " + S1(f.netSapt) + " din −" + pragTxt(P.sapt) + ".")
        + (o.istoria ? " Pe ultimele 120 de zile, boții porniți peste reguli au dat în medie " + U1(o.istoria.m) + " pe bot." : "") },
    { regula: "Cel mult " + cate(P.boti, "bot", "boți") + " pe zi", recomandare: false, stare: zp7.length ? zp7.length + " din 7 zile" : "respectată", ton: zp7.length ? "rau" : "bun",
      dece: dz ? "Pe toată istoria ta, zilele cu peste " + cate(dz.prag, "bot", "boți") + " au dat " + U1(dz.peste.pe) + " pe zi, celelalte " + S1(dz.sub.pe) + " (din " + cate(dz.peste.zile + dz.sub.zile, "zi", "zile") + ")." : "Pe istoria ta încă nu sunt destule zile ca să le compar." },
    { regula: "După o zi sub " + PROASTA_TXT + ", a doua zi cel mult " + cate(DUPA_PROASTA, "bot", "boți"), recomandare: true, stare: zdp.n === 1 ? (zdp.respectate ? "respectată o dată" : "încălcată o dată") : zdp.n ? zdp.respectate + " din " + cate(zdp.n, "dată", "ori") : "nicio zi sub " + PROASTA_TXT, ton: zdp.n && zdp.respectate < zdp.n ? "rau" : "bun",
      dece: ist.n >= 3 && ist.dupa !== null && ist.altfel !== null ? "După o zi proastă pornești de obicei " + (ist.dupa > ist.altfel ? "mai mulți boți" : ist.dupa < ist.altfel ? "mai puțini boți" : "la fel de mulți boți") + ": " + z1(ist.dupa) + " față de " + z1(ist.altfel) + " (pe toată istoria ta, " + cate(ist.n, "zi proastă", "zile proaste") + ")." : "Pe istoria ta sunt încă prea puține zile sub " + PROASTA_TXT + " ca să compar." },
    { regula: cate(P.rand, "pierdere", "pierderi") + " la rând = gata ziua", recomandare: false, stare: "acum " + (f.rand || 0) + " din " + P.rand, ton: f.rand >= P.rand ? "rau" : f.rand ? "atentie" : "bun",
      dece: cdr.zile ? "Pe toată istoria ta, în " + (cdr.zile === 1 ? "ziua" : "cele " + cate(cdr.zile, "zi", "zile")) + " în care ai continuat în aceeași zi după " + cate(P.rand, "pierdere", "pierderi") + " la rând, ai mai pornit " + cate(cdr.boti, "bot", "boți") + ": " + U1(cdr.net) + "."
        : "Pe istoria ta, n-ai continuat niciodată în aceeași zi după " + cate(P.rand, "pierdere", "pierderi") + " la rând." },
    { regula: "Ieși când prețul stă peste " + ORE_LUNGI + " h în afara grilei", recomandare: true, stare: lr.banda && lr.banda.n ? cate(lr.banda.n, "bot", "boți") + " luna asta" : "niciunul luna asta", ton: lr.banda && lr.banda.n ? "rau" : "bun",   /* revizia: ce spune regula - ținuți peste prag cu prețul în afara grilei (evaluările), nu toți boții de peste 6 h */
      dece: rb && nr(rb.h) > 0 && nr(rb.intoarse) !== null ? "Pe istoria ta, după " + rb.h + " h în afara grilei prețul se mai întoarce doar în " + Math.round(100 * rb.intoarse) + "% din cazuri."
        : lungPe !== null && restPe !== null && oa.lungi.n >= 3 ? "În " + na + ", boții ținuți peste " + ORE_LUNGI + " h au dat " + U1(lungPe) + " pe bot, ceilalți " + S1(restPe) + "." : "" },
    { regula: "Lasă gridul să lucreze, nu-l închide în minute", recomandare: true, stare: oa ? oa.minute.n + " în " + na : "—", ton: !oa ? "" : oa.minute.n ? "rau" : "bun",
      dece: dm ? "Pe cei " + cate(dm.n, "bot închis", "boți închiși") + " sub 15 minute, grilele au prins " + U1(dm.grile) + ", iar comisioanele au luat " + z1(Math.abs(dm.comisioane)) + " USDT." : "" },
  ];

  // seara de azi (aceeași socoteală ca mesajul de la 22)
  const s = searaZilei(inreg, acum), grup = (g) => (g.n ? cate(g.n, "bot", "boți") + " · " + U1(g.net) : "niciunul");
  const seara = !legat ? { titlu: "Evaluările nu se fac: canalul evaluărilor nu e legat la colector.", randuri: [], sfat: null } : !s ? { titlu: "Niciun bot închis azi.", randuri: [], sfat: null } : {
    titlu: mare(cate(s.n, "bot închis", "boți închiși")) + " azi, " + (s.bune.n === s.n ? (s.n === 1 ? "în regulă" : "toți în regulă") : s.bune.n ? s.bune.n + " în regulă" : "niciunul în regulă") + ".",
    randuri: [{ et: "În regulă", v: grup(s.bune), ton: "" }, { et: "Cu reguli încălcate", v: grup(s.rele), ton: s.rele.n ? "rau" : "" }].concat(s.top ? [{ et: "Cel mai des", v: numeRegula(s.top), ton: "" }] : []),
    sfat: (s.top && sfatSeara(s.top, P.boti)) || "Aș păstra ziua de azi ca reper: toate deciziile au fost în regulile tale." };

  const pv = porniriVm(st, D, toate, acum, P, flP);
  // evaluările și verdictele lor
  const evaluari = evaluariVm(inreg, toate, P, fl, D, dovezi, motive), verdicte = {};
  for (const v of ["bune", "ghinion", "noroc", "cost"]) { const l = evaluari.filter((e) => e.verdict === v); verdicte[v] = { n: l.length, net: r2(l.reduce((a, e) => a + e.net, 0)) }; }

  // regulile: luna asta, date noi, istoria
  const noi = reguliPeDateNoi(inreg, PROBA_DE), capNoi = "Pe date noi (boți porniți de la 31.10): ";
  const itNoi = ORDINE_REGULI.filter((c) => noi.peste[c] && noi.peste[c].n).map((c) => eticheta(c, noi.peste[c].n) + ", " + U1(noi.peste[c].net));
  const reguli = { lunaNume: numeLuna(azi.slice(0, 7)),
    luna: ORDINE_REGULI.filter((c) => lr[c]).map((c) => ({ nume: mare(numeRegula(c)), cate: cate(lr[c].n, "bot", "boți"), net: U1(lr[c].net), ton: tonNet(lr[c].net) })),
    noi: !noi.n ? capNoi + "încă niciun bot închis." : itNoi.length ? capNoi + itNoi.join(" · ") + "." : capNoi + cate(noi.n, "bot închis", "boți închiși") + ", niciunul peste reguli.",
    istoria: o.istoria ? "Pe ultimele 120 de zile, boții porniți peste reguli au dat în medie " + U1(o.istoria.m) + " pe bot (interval 99%: " + S1(o.istoria.lo) + " … " + S1(o.istoria.hi) + "). Un verdict pe datele noi cere luni de boți." : null };

  // frâna pe săptămână
  const maxP = Math.max(1, ...fs7.zile.map((z) => z.peste));
  const franaSapt = {
    titlu: !fs7.trase ? "N-a fost trasă în nicio zi." : (fs7.trase === 7 ? "Trasă în toate cele 7 zile" : "Trasă în " + cate(fs7.trase, "zi", "zile") + " din 7") + ", respectată în " + (respTrec || "niciuna") + (aziResp ? "; azi, deocamdată, da" : "") + ".",
    sub: !fs7.nPeste ? null : fs7.nPeste === fs7.deschisi ? mare(cate(fs7.nPeste, "bot pornit", "boți porniți")) + " peste ea, " + (fs7.nPeste === 1 ? "încă deschis." : "toți încă deschiși.")
      : mare(cate(fs7.nPeste, "bot pornit", "boți porniți")) + " peste ea: net " + U1(fs7.netPeste) + (fs7.nPeste - fs7.deschisi === 1 ? " pe cel închis" : " pe cei închiși") + (fs7.deschisi ? ", " + cate(fs7.deschisi, "bot încă deschis", "boți încă deschiși") : "") + ".",
    zile: fs7.zile.map((z, i) => ({ zi: ZS[fZs.format(new Date(inceputZi(z.zi) + 12 * ORA))] + " " + ddmm(z.zi), boti: z.peste ? cate(z.peste, "bot", "boți") : "niciunul",
      net: z.peste ? (z.peste > z.deschisi ? S1(z.netPeste) : z.deschisi === 1 ? "deschis" : "deschiși") : z.trasa ? (i === 6 ? "încă respectată" : "respectată") : "liberă", lat: Math.round(100 * z.peste / maxP),
      ton: z.peste ? (z.peste > z.deschisi ? tonNet(z.netPeste) : "") : z.trasa ? "bun" : "" })) };

  // oglinda lunii
  let oglinda = null;
  if (oa && ob) {
    const zp = (x) => (x.zilePeste.z ? x.zilePeste.z + " din " + x.zile + " · " + S1(x.zilePeste.net) : "niciuna din " + x.zile);
    const gr = (x, k2) => (x[k2].n ? x[k2].n + " · " + pc(x, k2) + "% · " + S1(x[k2].net) : "niciunul");
    const sens = (a, b) => (a < b ? ["mai rar", "bun"] : a > b ? ["mai des", "rau"] : ["la fel", ""]);
    const rand = (nume, acumT, inainteT, ra, rb2) => { const [ss, ton] = sens(ra, rb2); return { nume, acum: acumT, inainte: inainteT, sens: ss, ton }; };
    oglinda = { titlu: "Oglinda lunii: " + na + (lo.intreaga ? "" : " până azi") + ", față de " + nb,
      intro: mare(na) + ": " + cate(oa.n, "bot", "boți") + ", net " + U1(oa.net) + " în " + cate(oa.zile, "zi", "zile") + " cu boți. " + mare(nb) + ": " + cate(ob.n, "bot", "boți") + ", net " + U1(ob.net) + " în " + cate(ob.zile, "zi", "zile") + ".",
      cap: ["Obiceiul", mare(na), mare(nb), "Față de " + nb],
      randuri: [rand("Zile cu peste " + cate(P.boti, "bot", "boți"), zp(oa), zp(ob), oa.zile ? oa.zilePeste.z / oa.zile : 0, ob.zile ? ob.zilePeste.z / ob.zile : 0)]
        .concat([["frana", "Porniți cu frâna trasă"], ["lungi", "Ținuți peste " + ORE_LUNGI + " h"], ["minute", "Închiși de tine în minute"], ["lichidati", "Lichidați"]]
          .map(([k2, nume]) => rand(nume, gr(oa, k2), gr(ob, k2), oa[k2].n / oa.n, ob[k2].n / ob.n))),
      sfat: oglindaMesaj(oa, ob, P.boti).mesaj.split("\n").pop().replace(/^👉 /, "") };
  }

  return { forma: FORMA, la: acum, versiune: o.versiune || null, praguri: { zi: P.zi, sapt: P.sapt, rand: P.rand, boti: P.boti },
    sfat, disciplina, bine, rau, corectii, azi: aziVm, seara, porniri: pv.lista, porniriN: pv.n, evaluariLegat: legat, evaluari, nEvaluari: inreg.length, verdicte,
    reguli, franaSapt, oglinda, oglindaNota: oglinda ? null : "Oglinda cere boți în " + na + " și în " + nb + ".", profit: profitVm(o.profit) };
}
