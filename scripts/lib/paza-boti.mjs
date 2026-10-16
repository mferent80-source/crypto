// v101.59 (03.10, Busola 1.36, §2 „paza boților” - aprobat de el): pentru fiecare bot deschis, starea Busolei pe moneda lui pe 4h
// (perp4h ?? grid4h ?? 4h, Busola.pazaStare). UN mesaj la TRECEREA în „mai agitată ca de obicei” (din liniște / nimic neobișnuit /
// nemăsurat), nerepetat cât rămâne; iese și reintră -> din nou. Tace: rezumat lipsă sau vechi (> 4,5 h; starea rămâne neatinsă, ca o
// trecere să nu se piardă și să nu se dubleze), „nemasurat”, prima vedere a unui bot vechi (după o repornire). Botul NOU (sub 30 min)
// pe o monedă deja agitată primește mesajul - acolo nu e nicio „trecere” de prins. Modul pur (fără rețea), probat în proba-v10086.mjs.
// v101.60 (I-513 + revizia Opus): cheia Busolei vine din TICKERUL Pionex (LIGHTER.PERP + simbolPionex LIT_USDT_PERP ⇒ LIT), nu din numele
// botului - 17 monede au baza altfel decât tickerul; „de” (de când e moneda în stare) se ține PE MONEDĂ (harta meta().busolaMonede):
// prima vedere ⇒ necunoscut, trecere văzută ⇒ ora rezumatului; pentruServer duce starea pe bot la ruta `paza` (Tabloul scrie „de N h”).
import * as MC from "./mesaje-colector.mjs";

const NOU_MS = 30 * 60000;

// v100.173 (auditul Opus): un bot activ care lipsește din lista Pionex se declară „închis / lichidat” doar dacă apare printre cei închiși
// sau lipsește 3 ture la rând — Pionex dă uneori listă goală / parțială (result:true, results:null) și pleca o alertă critică falsă.
// c = m.cunoscuti[id] (se ține minte c.lipsa); prezent ⇒ contorul se șterge.
export const LIPSA_TURE = 3;
export function lipsaConfirmata(c, { prezent, gasitInchis }) {
  if (!c) return false;
  if (prezent) { delete c.lipsa; return false; }
  if (gasitInchis) return true;
  c.lipsa = (c.lipsa || 0) + 1;
  return c.lipsa >= LIPSA_TURE;
}

// tickerul Pionex al botului (bot-orders îl dă ca simbolPionex); fără el rămâne baza fără „.PERP”
export function cheiaBot(bot) {
  const t = bot && typeof bot.simbolPionex === "string" && /^[A-Z0-9]{1,24}_[A-Z0-9]{2,10}(_PERP)?$/.test(bot.simbolPionex) ? bot.simbolPionex : null;
  return t || String(bot && bot.baza || "").replace(/\.PERP$/, "");
}

// { tine: false, mesaj: null } = nu atinge starea; { tine: true, cheie, stare: { stare, la, de }, mesaj | null }
export function pazaBot({ Busola, rez, bot, inainte, acum, pret, monede }) {
  const nume = String(bot && bot.baza || "").replace(/\.PERP$/, "");
  const p = Busola.pazaStare(rez, cheiaBot(bot), acum);
  if (!p || p.vechi) return { tine: false, mesaj: null };
  // „de” din harta pe monedă: prima vedere ⇒ null (necunoscut, nu ora de acum), trecere văzută ⇒ ora rezumatului, aceeași stare ⇒ rămâne;
  // fără hartă (probele vechi) ⇒ regula pe bot, din `inainte`
  const cuHarta = monede && typeof monede === "object", h = cuHarta ? monede[p.cheie] : undefined;
  const de = cuHarta
    ? (h ? (h.stare === p.stare ? (Number(h.de) > 0 ? Number(h.de) : null) : p.la) : null)
    : (inainte && inainte.stare === p.stare && Number(inainte.de) > 0 ? Number(inainte.de) : p.la);
  const stare = { stare: p.stare, la: p.la, de };
  const nou = !inainte && Number(bot.pornitLa) > 0 && acum - Number(bot.pornitLa) < NOU_MS;
  if (!(p.stare === "miscare" && (inainte ? inainte.stare !== "miscare" : nou))) return { tine: true, cheie: p.cheie, stare, mesaj: null };
  const jos = Number(bot.gridJos), sus = Number(bot.gridSus), f = typeof pret === "function" ? pret : String;
  return { tine: true, cheie: p.cheie, stare, mesaj: MC.busolaMiscare({ nume, directie: bot.directie, levier: bot.levier, nou: !inainte,
    interval: jos > 0 && sus > 0 ? f(jos) + " – " + f(sus) : null, cifra: Busola.cifraMiscare(rez) }) };
}

// v101.60 (I-513): harta pentru ruta `paza` a serverului (Tabloul arată „de N h”) - doar boții cu stare ținută
export function pentruServer(boti, stareAlerte, acum) {
  const out = {};
  for (const b of Array.isArray(boti) ? boti : []) { const s = b && b.id && stareAlerte && stareAlerte[b.id] && stareAlerte[b.id]._busola; if (s) out[String(b.id)] = { stare: s.stare, la: s.la, de: s.de }; }
  // v101.109: + bilanțul alertelor (lista ține în meta colectorului, cheia _colector), ca Tabloul să-l arate
  const l = stareAlerte && stareAlerte._colector && stareAlerte._colector.pandaContra;
  if (!Array.isArray(l)) return { la: acum, boti: out };
  // v101.110: + episoadele pentru pagina Alerts (cele mai noi 30, fără martori) și câți martori s-au notat
  const ep = l.filter((x) => x && x.tip !== "martor").slice(-30).reverse().map((x) => ({ tip: x.tip, nume: x.nume, la: x.la, d24: x.delta24 != null ? x.delta24 : null, d72: x.delta != null ? x.delta : null }));
  return { la: acum, boti: out, bilant: bilantAlerte(l), episoade: ep, martori: l.filter((x) => x && x.tip === "martor").length };
}

// v101.91 (I-572, el 09.10: „fă ideile”): paza și pe DIRECȚIA Busolei și pe BTC. Aceleași reguli de liniște: trecerea se anunță abia
// după 2 rezumate la rând (vazut ≥ 2 pe rezumate diferite - direcția oscilează la prag), cel mult un mesaj pe bot la 4 h (ritmul
// rezumatului), rezumat vechi / monedă fără direcție / bot neutru ⇒ nu atinge starea. Pure, probate în proba-v100148.mjs.
const RITM_MS = 4 * 3600000, PRAG_BTC = 0.02;
const dirBot = (b) => { const d = String(b && b.directie || "").toUpperCase(); return d === "LONG" ? "long" : d === "SHORT" ? "short" : null; };
// revizia Opus: după o gaură (rezumat vechi ore întregi, Busola căzută) numărătoarea pornește de la 1, nu continuă episodul vechi
const numara = (inainte, acelasi, la) => (acelasi ? (Number(inainte.la) === la ? Number(inainte.vazut) || 1 : la - Number(inainte.la) > 2 * RITM_MS ? 1 : (Number(inainte.vazut) || 0) + 1) : 1);
const numeBot = (bot) => String(bot && bot.baza || "").replace(/\.PERP$/, "");

// v101.107 (el 13.10: „fă idei”): moneda botului în pândă (Latime, 150 perp-uri, direcția pe 84 de zile) e pe partea CEALALTĂ a botului.
// { tine:false } (lățime lipsă / veche / cu eroare, monedă din afara celor 150, bot neutru) | { tine:true, stare:{ contra, dir, la, anuntat }, mesaj | null }
// O dată pe episod (contra cu aceeași direcție a monedei); un episod nou se anunță abia la 24 h după ultimul mesaj (direcția oscilează lângă zero)
const PANDA_RITM_MS = 24 * 3600000;
export function pazaPanda({ Latime, latime, bot, inainte, acum }) {
  const a = latime && latime.acum, d = dirBot(bot);
  if (!Latime || !Latime.botiContra || !a || a.eroare || !(acum - Number(a.la) <= Latime.PRAGURI.vechiMin * 60000) || !d) return { tine: false, mesaj: null };
  const k = cheiaBot(bot);
  if (!Latime.textMoneda(latime, k, d, acum)) return { tine: false, mesaj: null };
  const c = Latime.botiContra(latime, [{ s: k, dir: d }])[0] || null, anuntat = inainte ? Number(inainte.anuntat) || 0 : 0;
  const acelasi = !!(c && inainte && inainte.contra && inainte.dir === c.dir);
  const stare = { contra: !!c, dir: c ? c.dir : null, la: Number(a.la), anuntat };
  if (!c || (acelasi && anuntat) || acum - anuntat < PANDA_RITM_MS) return { tine: true, stare, mesaj: null };
  // v101.108 (el: „fă idei”): cât de departe e lichidarea, în zile obișnuite ale monedei (distanța / amplitudinea medie pe zi din pândă)
  const dist = Math.abs(Number(bot.distantaLichidarePct)), ap = Number(c.adrPct), v1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(".", ",");
  const lich = bot.distantaLichidarePct != null && dist > 0 && ap > 0 ? "Lichidarea e la " + v1(dist) + "%, " + (dist / ap < 1 ? "sub" : "de " + v1(dist / ap) + "×") + " amplitudinea obișnuită a monedei pe o zi (~" + v1(ap) + "%)." : null;   /* „N zile” cu zecimale ar încălca garda v100.75 */
  return { tine: true, stare: Object.assign({}, stare, { anuntat: acum }), mesaj: MC.pandaContra({ nume: numeBot(bot), directie: bot.directie, levier: bot.levier, text: c.text, lich }) };
}

// v101.108 (el: „fă idei”): bilanțul alertei „contra” - spune ceva alerta? Fiecare episod anunțat (sau marcat) se notează cu profitul botului;
// MARTORUL = o zi fără contra pe același bot (cel mult una la 24 h). La 72 h fiecare se judecă: profitul ultim văzut − cel de la notare
// (botul închis rămâne pe ultimul profit văzut). Lista stă în meta (cel mult 400). Fără verdict „dovedit”: sub 10 de fiecare ⇒ „prea puține”.
const PANDA_JUDECA_MS = 72 * 3600000, PANDA_MAX = 400;
// v101.109 (el: „fă idei”): același bilanț și pentru alertele Busolei. Episodul nou = `anuntat` schimbat pe cheia alertei (trimis sau doar
// marcat cât vocile sunt anunțate - episodul a existat). Martorul = o zi în care botul nu e în NICIUN episod, cel mult una la 24 h.
const BILANT_TIP = { _panda: "contra", _busolaDir: "dir", _busolaVoci: "voci", _busolaBtc: "btc" };
const inEpisod = (st) => !!((st._panda && st._panda.contra) || (st._busolaVoci && st._busolaVoci.contra) || (st._busolaBtc && st._busolaBtc.contra)
  || (st._busolaDir && st._busolaDir.anuntatSemn && st._busolaDir.anuntatSemn === st._busolaDir.semn));
export function bilantNoteaza(lista, { bot, inainte, dupa, acum }) {
  const p = Number(bot && bot.profitTotal);
  if (!Array.isArray(lista) || !bot || bot.profitTotal == null || !Number.isFinite(p) || !dupa) return;
  const id = String(bot.id), ina = inainte || {}, rec = (tip) => lista.push({ tip, id, nume: numeBot(bot), la: acum, p0: p, ultim: p });
  for (const k of Object.keys(BILANT_TIP)) { const d = dupa[k]; if (d && d.anuntat && d.anuntat !== (ina[k] && ina[k].anuntat)) rec(BILANT_TIP[k]); }
  if (!inEpisod(dupa)) { const u = lista.filter((x) => x.tip === "martor" && x.id === id).pop(); if (!u || acum - u.la >= 24 * 3600000) rec("martor"); }
  if (lista.length > PANDA_MAX) lista.splice(0, lista.length - PANDA_MAX);
}
// v101.108 - doar pânda (inainte / dupa = starea _panda)
export function pandaNoteaza(lista, { bot, inainte, dupa, acum }) { bilantNoteaza(lista, { bot, inainte: { _panda: inainte }, dupa: dupa ? { _panda: dupa } : null, acum }); }
export function pandaJudeca(lista, boti, acum) {
  const pr = {}; for (const b of Array.isArray(boti) ? boti : []) { const v = Number(b && b.profitTotal); if (b && b.id != null && b.profitTotal != null && Number.isFinite(v)) pr[String(b.id)] = v; }
  for (const r of Array.isArray(lista) ? lista : []) {
    if (r.delta != null) continue;
    if (r.id in pr) r.ultim = pr[r.id];
    if (r.delta24 == null && acum - r.la >= PANDA_24_MS) r.delta24 = Math.round((r.ultim - r.p0) * 100) / 100;   // v101.110: și la 24 h
    if (acum - r.la >= PANDA_JUDECA_MS) r.delta = Math.round((r.ultim - r.p0) * 100) / 100;
  }
}
const PANDA_24_MS = 24 * 3600000;
function bilantTip(lista, tip, eticheta) {
  const L = (Array.isArray(lista) ? lista : []).filter(Boolean), j = L.filter((x) => x.delta != null), c = j.filter((x) => x.tip === tip), m = j.filter((x) => x.tip === "martor");
  const j24 = L.filter((x) => x.delta24 != null), c24 = j24.filter((x) => x.tip === tip), m24 = j24.filter((x) => x.tip === "martor");
  const cap = eticheta + " (bilanț la 72 h): ";
  const T = globalThis.TextRo, pierd = (l, k) => l.filter((x) => x[k || "delta"] < 0).length, pc = (l, k) => (l.length ? Math.round(100 * pierd(l, k) / l.length) : 0);
  // v101.110: și la 24 h (o alertă poate avea dreptate pe termen scurt și să greșească pe trei zile); verdictul rămâne pe 72 h
  const p24 = c24.length || m24.length ? "la 24 h: pierdut în " + pierd(c24, "delta24") + " din " + c24.length + " (" + pc(c24, "delta24") + "%), martorul în " + pierd(m24, "delta24") + " din " + m24.length + " (" + pc(m24, "delta24") + "%)" : null;
  if (!c.length && !m.length) return cap + (p24 ? "la 72 h încă nimic judecat · " + p24 + "." : "încă nimic judecat.");
  let t = cap + T.cate(c.length, "episod", "episoade") + ", botul a pierdut în " + pierd(c) + " (" + pc(c) + "%) · martorul (zile fără contra): " + m.length + ", pierdut în " + pierd(m) + " (" + pc(m) + "%)" + (p24 ? " · " + p24 : "");
  if (c.length < 10 || m.length < 10) return t + " · prea puține ca să spună ceva (trebuie cel puțin 10 de fiecare).";
  return t + " · diferența e de " + T.cate(Math.abs(pc(c) - pc(m)), "punct", "puncte") + "; nedovedită pe atât de puține, o urmăresc.";
}
export function pandaBilant(lista) { return bilantTip(lista, "contra", "Alerta „contra” din pândă"); }
// v101.109: rândul pândei mereu; Busola / voci / BTC doar când au episoade judecate (altfel ar fi trei rânduri „încă nimic”)
const BILANT_ETICHETE = [["dir", "Busola „invers față de bot”"], ["voci", "„Toate vocile contra”"], ["btc", "BTC contra botului"]];
export function bilantAlerte(lista) {
  const j = (Array.isArray(lista) ? lista : []).filter((x) => x && (x.delta != null || x.delta24 != null));
  return [pandaBilant(lista)].concat(BILANT_ETICHETE.filter(([tip]) => j.some((x) => x.tip === tip)).map(([tip, e]) => bilantTip(lista, tip, e)));
}

// { tine:false } | { tine:true, stare:{ semn, la, vazut, anuntat }, mesaj | null } - „invers față de bot” = randDirectie pe galben
export function pazaDirectie({ Busola, rez, bot, inainte, acum }) {
  const p = Busola.pazaStare(rez, cheiaBot(bot), acum);
  if (!p || p.vechi || !dirBot(bot)) return { tine: false, mesaj: null };
  const r = Busola.randDirectie(rez, cheiaBot(bot), acum, { bot: bot.directie });
  if (!r || !r.semn) return { tine: false, mesaj: null };
  // revizia Opus (spec: „doar la schimbare”): un episod „invers” se anunță O dată (anuntatSemn); 4 h = frână la oscilație, nu ritm de repetare
  const la = Number(rez.la), acelasi = !!(inainte && inainte.semn === r.semn), vazut = numara(inainte, acelasi, la), anuntat = inainte ? Number(inainte.anuntat) || 0 : 0;
  const anuntatSemn = acelasi ? inainte.anuntatSemn || null : null;
  const stare = { semn: r.semn, la, vazut, anuntat, anuntatSemn };
  if (!(r.nivel === "atentie" && vazut >= 2 && anuntatSemn !== r.semn && acum - anuntat > RITM_MS)) return { tine: true, stare, mesaj: null };
  return { tine: true, stare: Object.assign({}, stare, { anuntat: acum, anuntatSemn: r.semn }), mesaj: MC.busolaDirectie({ nume: numeBot(bot), directie: bot.directie, levier: bot.levier, spre: r.semn === "inclinat-long" ? "long" : "short", text: r.text }) };
}

// { tine:false } | { tine:true, stare:{ contra, la, vazut, anuntat }, mesaj | null } - CONTRA = randBtc pe galben (legătura DA) cu BTC mișcat ≥ 2%
export function pazaBtc({ Busola, rez, bot, inainte, acum }) {
  if (!rez || !rez.btc || typeof rez.btc !== "object") return { tine: false, mesaj: null };
  const p = Busola.pazaStare(rez, cheiaBot(bot), acum);
  if (!p || p.vechi || !dirBot(bot)) return { tine: false, mesaj: null };
  const r = Busola.randBtc(rez, cheiaBot(bot), acum, { bot: bot.directie });
  if (!r) return { tine: false, mesaj: null };
  const contra = r.nivel === "atentie" && typeof r.h24 === "number" && Math.abs(r.h24) >= PRAG_BTC;
  const la = Number(rez.la), acelasi = !!(inainte && !!inainte.contra === contra), vazut = numara(inainte, acelasi, la), anuntat = inainte ? Number(inainte.anuntat) || 0 : 0;
  const anuntatContra = acelasi ? !!inainte.anuntatContra : false;   // revizia Opus: o dată pe episodul CONTRA
  const stare = { contra, la, vazut, anuntat, anuntatContra };
  if (!(contra && vazut >= 2 && !anuntatContra && acum - anuntat > RITM_MS)) return { tine: true, stare, mesaj: null };
  const btc = String(r.text).split(" · ")[0];
  return { tine: true, stare: Object.assign({}, stare, { anuntat: acum, anuntatContra: true }), mesaj: MC.busolaBtc({ nume: numeBot(bot), directie: bot.directie, levier: bot.levier, btc, text: r.text }) };
}

// v101.92 (I-578): „toate vocile contra botului tău” - concluzia (graficul pe 4h, Busola, Monte Carlo) cu ≥ 2 voci, toate contra;
// aceleași reguli (2 rezumate la rând, o dată pe episod, 4 h frână). Când pleacă, alertele separate (direcție, BTC) tac pe episodul lor
export function pazaVoci({ Busola, rez, bot, inainte, acum, grafic, mc }) {
  const p = Busola.pazaStare(rez, cheiaBot(bot), acum);
  if (!p || p.vechi || !dirBot(bot)) return { tine: false, mesaj: null };
  const r = Busola.randDirectie(rez, cheiaBot(bot), acum, { bot: bot.directie });
  const c = Busola.concluzie({ bot: bot.directie, grafic: grafic || null, busola: r && r.semn || null, mc: mc || null });
  const contra = !!(c && /spun la fel: contra botului tău/.test(c.text));
  // v100.205: Busola nu mai e voce numărată ⇒ episodul e al VOCILOR: „anunțat” rămâne cât vocile sunt contra sau se contrazic (graficul și MC
  // pâlpâie); se închide doar când nu mai sunt contra. Înainte era legat de Busola contra ⇒ cu Busola pe „așteaptă” (aproape mereu) se repeta la 4 h
  const seContrazic = !!(c && /^Vocile se contrazic/.test(c.text));
  const la = Number(rez.la), acelasi = !!(inainte && !!inainte.contra === contra), vazut = numara(inainte, acelasi, la), anuntat = inainte ? Number(inainte.anuntat) || 0 : 0;
  const anuntatContra = inainte ? !!inainte.anuntatContra && (contra || seContrazic) : false;
  const stare = { contra, la, vazut, anuntat, anuntatContra, text: c ? c.text : null };
  if (!(contra && vazut >= 2 && !anuntatContra && acum - anuntat > RITM_MS)) return { tine: true, stare, mesaj: null };
  // câte voci s-au pronunțat și câte sunt contra (spec: ≥ 2) - titlul spune numărul real, „toate” doar când sunt 3 din 3
  const cine = c.text.split(" spun la fel")[0], nContra = cine.split(/, | și /).length, nVoci = [grafic, mc].filter(Boolean).length;   /* v100.205: Busola nu se mai numără */
  return { tine: true, stare: Object.assign({}, stare, { anuntat: acum, anuntatContra: true }), mesaj: MC.busolaVoci({ nume: numeBot(bot), directie: bot.directie, levier: bot.levier, cine: cine.replace(/^./, (x) => x.toLowerCase()), nContra, nVoci, text: c.text }) };
}

// pasul din bucla colectorului: mesajul care n-a plecat nu mută starea și nici harta (tura următoare reîncearcă, ca la celelalte alerte)
export async function pazaPas({ Busola, rez, bot, st, acum, pret, trimite, monede, voci, Latime, latime }) {
  const d = pazaBot({ Busola, rez, bot, inainte: st._busola, acum, pret, monede });
  let out = d;
  if (d.tine) {
    if (d.mesaj && !(await trimite(d.mesaj))) out = Object.assign({}, d, { trimis: false });
    else { st._busola = d.stare; if (monede && typeof monede === "object") monede[d.cheie] = { stare: d.stare.stare, de: d.stare.de }; }
  }
  // v101.92 (I-578): întâi „toate vocile contra”; dacă a plecat, direcția și BTC nu mai trimit și ele (episoadele lor se marchează anunțate)
  let vociPlecat = false;
  if (voci && typeof voci === "object") {
    try {
      const v = pazaVoci({ Busola, rez, bot, inainte: st._busolaVoci, acum, grafic: voci.grafic, mc: voci.mc });
      if (v.tine) { if (v.mesaj && !(await trimite(v.mesaj))) { /* netrimis: starea rămâne */ } else { st._busolaVoci = v.stare; vociPlecat = !!v.mesaj; } }
    } catch (e) { out = Object.assign({}, out, { eroare: String(e && e.message || e) }); }
  }
  // v101.91 (I-572): direcția și BTC, fiecare cu starea ei pe bot (_busolaDir / _busolaBtc, copiate de evalueaza ca orice cheie)
  // revizia Opus: și cât ține episodul anunțat al vocilor (nu doar în tura în care a plecat) alertele separate doar se marchează
  const vociInEpisod = !!(st._busolaVoci && st._busolaVoci.contra && st._busolaVoci.anuntatContra);
  let altaPlecata = false;   /* v101.107: pânda nu dublează în aceeași tură o alertă de direcție / BTC deja plecată */
  for (const [cheie, fn] of [["_busolaDir", pazaDirectie], ["_busolaBtc", pazaBtc], ["_panda", pazaPanda]]) {
    try {
      const x = fn({ Busola, rez, bot, inainte: st[cheie], acum, Latime, latime });
      if (!x.tine) continue;
      if (x.mesaj && (vociPlecat || vociInEpisod || (cheie === "_panda" && altaPlecata))) { st[cheie] = Object.assign({}, x.stare, cheie === "_busolaDir" ? { anuntatSemn: x.stare.semn } : cheie === "_panda" ? {} : { anuntatContra: true }); continue; }
      if (x.mesaj && !(await trimite(x.mesaj))) continue;
      if (x.mesaj) altaPlecata = true;
      st[cheie] = x.stare;
    } catch (e) { out = Object.assign({}, out, { eroare: String(e && e.message || e) }); }
  }
  return out;
}

// rezumatul vechi: o notă doar în Radar, o dată pe rezumat (anuntat = `la`-ul rezumatului deja anunțat)
// v100.207 (16.10, auditul Busolei — „om mort”): pragul urmează programul Busolei (Busola.pragVechime); nota pleacă pe DISCORD, o dată pe rezumat
export function notaVeche({ Busola, rez, acum, anuntat }) {
  const la = rez ? Number(rez.la) : NaN;
  const prag = typeof Busola.pragVechime === "function" ? Busola.pragVechime(la) : Busola.PAZA_VECHI_MS;
  if (!(la > 0) || acum - la <= prag || anuntat === la) return null;
  return Object.assign(MC.busolaVeche((acum - la) / 3600000, prag / 3600000), { la });
}
