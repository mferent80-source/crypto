// Sugestiile de monede (v101.58, 03.10, el: reveniri + short direcționat): o dată pe zi, de la 8:00 ora României - istoricul celor două
// liste (piața din depozitul de bare de 1 h, agregat 4h ca la clasament, + boții LUI) și urmărirea lor (notările zilei din clasament,
// prețurile de acum din tickerele Pionex PERP). Un filtru, nu o predicție: istoricul se arată lângă liste, „mai slab” la vedere.
// deps: { acum, zi, ora, stare:{zi}, Reveniri, Idei, G (GridCalcul), simboluriDepozit() -> [simbol], bare1h(simbol) -> [{t,o,h,l,c}],
//         boti() -> [{simbol, dir, pornit, net}], cere(cale), trimite(cale, corp), jurnal(...), scrieStare(st) }
const H4 = 4 * 3600000, ZI = 86400000;
// numărătorile din texte - „1 zi”, „25 de zile” (TextRo.cate; rezerva știe aceeași regulă, ca tura-idei)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
// v100.292 (auditul 01.11, 🔴3 + 🟡4): urmărirea „Pe ce aș porni” la orizont FIX - fiecare notare se judecă la `zile` zile după ea, din barele
// de 1 h (prima bară de la / după intrare și de la / după orizont), după cost, față de MEDIANA pieței (toate monedele din depozit) în aceleași
// zile; numărat pe ZILE (notările unei zile sunt o singură dovadă), nu pe monede. Fără bara de la orizont (sau acum < orizont) nu se judecă.
export function urmarireFixa(ist, o) {
  o = o || {}; const zile = o.zile || 7, cost = o.cost || 0, acum = o.acum || Date.now(), cache = new Map();
  const bare = (s) => { if (!cache.has(s)) cache.set(s, o.bare1h ? o.bare1h(s) || [] : []); return cache.get(s); };
  const laOra = (b, t) => { for (let i = 0; i < b.length; i++) if (b[i].t >= t) return b[i].c > 0 && b[i].t - t <= 2 * 3600000 ? b[i] : null; return null; };
  // v100.292 (revizia 01.11, 🟡9): intrarea e bara de la 06:00Z (aceeași ca a pieței), nu prețul turei (05:00Z vara); semnul urmează direcția
  // botului (short câștigă când scade; neutru = ca long); ce n-are bară la intrare sau la orizont se numără („nejudecate”), nu dispare tăcut
  const peZi = new Map(); let nejudecate = 0, inAsteptare = 0;
  for (const x of Array.isArray(ist) ? ist : []) {
    if (!x || !x.simbol || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.zi))) continue;
    const t0 = Date.parse(x.zi + "T06:00:00Z"), t1 = t0 + zile * ZI; if (!(acum >= t1)) { inAsteptare++; continue; }
    const b = bare(x.simbol), intra = laOra(b, t0), ies = laOra(b, t1); if (!intra || !ies) { nejudecate++; continue; }
    if (!peZi.has(x.zi)) peZi.set(x.zi, { brut: [], semn: [], piata: null, r: [], e: [] });
    peZi.get(x.zi).brut.push(ies.c / intra.c - 1); peZi.get(x.zi).semn.push(x.dir === "short" ? -1 : 1);
  }
  for (const [zi, z] of peZi) {
    const t0 = Date.parse(zi + "T06:00:00Z"), t1 = t0 + zile * ZI, v = [];
    for (const s of o.toate || []) { const b = bare(s), a = laOra(b, t0), c = laOra(b, t1); if (a && c) v.push(c.c / a.c - 1); }
    v.sort((p, q) => p - q); z.piata = v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null;
    z.r = z.brut.map((r, i) => z.semn[i] * r - cost);
    z.e = z.piata === null ? [] : z.brut.map((r, i) => z.semn[i] * (r - z.piata) - cost);
  }
  const zileL = [...peZi.values()], toateR = zileL.flatMap((z) => z.r), med = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
  const mediiZi = zileL.map((z) => med(z.r)), excesZi = zileL.filter((z) => z.e.length).map((z) => med(z.e));
  // ferestrele de `zile` zile care nu se suprapun: zilele judecate, în ordine; o fereastră nouă începe la cel puțin `zile` zile după precedenta
  let ferestre = 0, ultima = -Infinity; for (const zi of [...peZi.keys()].sort()) { const t = Date.parse(zi + "T06:00:00Z"); if (t - ultima >= zile * ZI) { ferestre++; ultima = t; } }
  const u = { n: toateR.length, zile: zileL.length, pePlus: toateR.length ? toateR.filter((r) => r > 0).length / toateR.length : null, medie: med(mediiZi), exces: med(excesZi), zilePeste: excesZi.length ? excesZi.filter((e) => e > 0).length / excesZi.length : null, nejudecate, inAsteptare, ferestre, zileCuPiata: excesZi.length };
  // v100.333 (el, 13.11: graficul din „Listele Radarului”): seria PE ZILE - fiecare zi judecată cu lista (după cost, în direcția ei), mediana pieței
  // din aceleași zile și diferența (pp), aceeași socoteală ca media de mai sus; doar zilele cu piață, ultimele 90 (corpul trimis rămâne mic)
  const r4 = (v) => Math.round(v * 1e6) / 1e6;
  u.peZile = [...peZi.entries()].filter(([, z]) => z.e.length).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-90)
    .map(([zi, z]) => ({ zi, n: z.r.length, lista: r4(med(z.r)), piata: r4(z.piata), exces: r4(med(z.e)) }));
  const P = (v) => (v == null ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"), pp = (v) => (v == null ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + " pp");
  const nej = nejudecate ? " · " + nejudecate + " nejudecate (fără bare la intrare sau la orizont)" : "";
  u.text = !u.n ? "Sugestiile se urmăresc de azi, la " + cate(zile, "zi", "zile") + " fiecare, în direcția botului (neutru: ca long): după ~30 de zile cu rezultat se poate spune cu cifre dacă merită" + nej + "."
    : "Din " + cate(u.n, "sugestie", "sugestii") + " (" + cate(u.zile, "zi", "zile") + ") la " + cate(zile, "zi", "zile") + ", în direcția botului (neutru: ca long): " + Math.round(u.pePlus * 100) + "% pe plus, " + P(u.medie) + " în medie după cost, " + pp(u.exces) + " față de piața din aceleași zile" + (u.zilePeste != null ? " (peste piață în " + Math.round(u.zilePeste * 100) + "% din zile)" : "") + " · ferestre de " + cate(zile, "zi", "zile") + " care nu se suprapun: " + ferestre + nej + ".";
  return u;
}
// v100.333 (el, 13.11: „rezolvă asta”): pe 12 și 13.11 tura a picat („fetch failed”) și ziua s-a pierdut. Acum o tură picată se reia în aceeași
// zi după REIA_MS; în total cel mult REIA_MAX încercări pe zi (prima + 2 reluări), apoi mâine; reușita închide ziua și șterge reluarea.
const REIA_MS = 30 * 60000, REIA_MAX = 3;
const respira = () => new Promise((r) => setImmediate(r));
export async function turaSugestii(d) {
  if (d.ora < 8 || d.stare.zi === d.zi) return null;
  const rz = d.stare.reia && d.stare.reia.zi === d.zi ? d.stare.reia : null;
  if (rz && d.acum < rz.la) return null;
  try {
    const r = await turaSugestiiPas(d);
    d.stare.zi = d.zi; delete d.stare.reia; d.scrieStare(d.stare);
    return r;
  } catch (e) {
    const n = (rz ? rz.n : 0) + 1;
    if (n >= REIA_MAX) { d.stare.zi = d.zi; delete d.stare.reia; } else d.stare.reia = { zi: d.zi, n, la: d.acum + REIA_MS };
    d.scrieStare(d.stare);
    throw e;
  }
}
async function turaSugestiiPas(d) {
  const R = d.Reveniri, G = d.G, cache = new Map(), brute = new Map();
  // v100.333: barele de 1 h citite O dată (în bucla care respiră), refolosite de cele trei urmăriri - înainte depozitul se citea a doua oară dintr-o bucată
  const bare1 = (s) => { if (!brute.has(s)) brute.set(s, d.bare1h(s) || []); return brute.get(s); };
  const bare4 = (s) => { if (!cache.has(s)) cache.set(s, G.agrega(bare1(s), H4).filter((x) => x && Number.isFinite(x.c))); return cache.get(s); };
  // 1) istoricul pieței: punctele de pe fiecare monedă din depozit (fereastra clasamentului: 500 de bare de 4h)
  // v100.333: bucla respiră după fiecare monedă - dintr-o bucată, citirea + R.puncte țineau colectorul 21–31 s la 8:00 (8,8 s pe 75 de monede pe PC),
  // iar cererile altor ture (și ale acesteia) cădeau: „aborted due to timeout”, „fetch failed”
  const serii = [];
  for (const s of d.simboluriDepozit()) { const b = bare4(s); await respira(); if (b.length < 520) continue; serii.push(R.puncte(b, { r: R.REGULI.moneda, dupaTimp: true, start: 499, G, short: true })); await respira(); }
  const piataRev = R.dovada(serii, "revine", { pauzaZile: 7 }), piataShort = R.dovada(serii, "short", { pauzaZile: 7, short: true });
  // 2) boții lui, după starea monedei la pornire
  const botiD = R.dovadaBoti(await d.boti(), bare4, G);
  // 3) listele de azi (aceleași ca pe Tablou) + urmărirea celor vechi
  const cl = ((await d.cere("/api/istoric-bot?action=clasament")) || {}).clasament || null;
  const rev = d.Idei.reveniriBoti(cl, [], 5), sh = d.Idei.shortBoti(cl, [], 5), porn = d.Idei.ideiBoti(cl, [], 5), preturi = {};   /* v100.292: și „Pe ce aș porni” */
  const tk = await d.cere("/api/market?type=pionex_tickers&market=PERP");
  for (const x of (tk && tk.data && tk.data.tickers) || []) { const p = Number(x && x.close); if (x && x.symbol && p > 0) preturi[String(x.symbol)] = p; }
  const ist = ((await d.cere("/api/istoric-bot?action=sugestii")) || {}).istoric || [];
  // revizia Opus (🔵4): barele de 1 h citite o singură dată pentru toate trei urmăririle (fiecare urmarireFixa își ținea cache-ul ei: depozitul citit de 4 ori)
  const bare1hO = bare1;
  const urm = { revenire: R.urmarire(ist.filter((x) => x && x.lista === "revenire"), preturi, d.acum, { zile: 7, cost: 0.001 }),
    short: R.urmarire(ist.filter((x) => x && x.lista === "short"), preturi, d.acum, { zile: 7, cost: 0.001, short: true }) };
  // v100.333: cele trei urmăriri la orizont fix, cu o respirație între ele (pe PC ~0,9 s dintr-o bucată, toate trei)
  await respira();
  // v100.292: „Pe ce aș porni” la orizont fix, pe zile, față de mediana pieței (pagina Sugestii o arată întreagă, lângă listă)
  urm.porn = urmarireFixa(ist.filter((x) => x && x.lista === "porn"), { zile: 7, cost: 0.001, bare1h: bare1hO, toate: d.simboluriDepozit(), acum: d.acum });
  await respira();
  // v100.331 (el, 12.11: „la 1 fă și integrează în detaliile indicatorilor”): listele de monede FAȚĂ DE PIAȚĂ, la orizont fix, pe zile (ca „porn”) -
  // „−22,3% de la prețul sugestiei” spunea mai ales încotro a mers piața; asta spune dacă lista ALEGE monede mai bune decât piața din aceleași zile
  urm.revenireFata = urmarireFixa(ist.filter((x) => x && x.lista === "revenire"), { zile: 7, cost: 0.001, bare1h: bare1hO, toate: d.simboluriDepozit(), acum: d.acum });
  await respira();
  urm.shortFata = urmarireFixa(ist.filter((x) => x && x.lista === "short").map((x) => Object.assign({}, x, { dir: "short" })), { zile: 7, cost: 0.001, bare1h: bare1hO, toate: d.simboluriDepozit(), acum: d.acum });
  const noi = rev.map((x) => ({ simbol: x.simbol, pret: preturi[x.simbol] || x.pret || null, lista: "revenire" })).concat(sh.map((x) => ({ simbol: x.simbol, pret: preturi[x.simbol] || x.pret || null, lista: "short" })))
    .concat(porn.map((x) => ({ simbol: x.simbol, pret: preturi[x.simbol] || x.pret || null, lista: "porn", dir: x.dir || null }))).filter((x) => x.pret > 0);
  await d.trimite("/api/istoric-bot?action=sugestii", { la: d.acum, zi: d.zi, dovada: { revenire: { piata: piataRev, boti: botiD.revenire }, short: { piata: piataShort, boti: botiD.short } }, urmarire: urm, noi });
  d.jurnal("sugestii: " + porn.length + " de pornit, " + rev.length + " pe revenire, " + sh.length + " pentru short; istoricul: revenire " + ((piataRev && piataRev.eticheta) || "—") + ", short " + ((piataShort && piataShort.eticheta) || "—") + "; pornirea urmărită: " + (urm.porn.n || 0) + " pe " + cate(urm.porn.zile || 0, "zi", "zile"));
  return { piataRev, piataShort, botiD, urm, noi };
}
