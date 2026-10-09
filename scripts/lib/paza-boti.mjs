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
  return { la: acum, boti: out };
}

// v101.91 (I-572, el 09.10: „fă ideile”): paza și pe DIRECȚIA Busolei și pe BTC. Aceleași reguli de liniște: trecerea se anunță abia
// după 2 rezumate la rând (vazut ≥ 2 pe rezumate diferite - direcția oscilează la prag), cel mult un mesaj pe bot la 4 h (ritmul
// rezumatului), rezumat vechi / monedă fără direcție / bot neutru ⇒ nu atinge starea. Pure, probate în proba-v100148.mjs.
const RITM_MS = 4 * 3600000, PRAG_BTC = 0.02;
const dirBot = (b) => { const d = String(b && b.directie || "").toUpperCase(); return d === "LONG" ? "long" : d === "SHORT" ? "short" : null; };
// revizia Opus: după o gaură (rezumat vechi ore întregi, Busola căzută) numărătoarea pornește de la 1, nu continuă episodul vechi
const numara = (inainte, acelasi, la) => (acelasi ? (Number(inainte.la) === la ? Number(inainte.vazut) || 1 : la - Number(inainte.la) > 2 * RITM_MS ? 1 : (Number(inainte.vazut) || 0) + 1) : 1);
const numeBot = (bot) => String(bot && bot.baza || "").replace(/\.PERP$/, "");

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
  // revizia Opus: episodul e al BUSOLEI (contra botului) - graficul (5 min) și MC (15 min) pâlpâie în același rezumat; „anunțat” rămâne cât
  // Busola e contra, chiar dacă fraza cade o tură pe „se contrazic” (altfel mesajul s-ar repeta la fiecare 4 h)
  const busolaContra = !!(r && r.nivel === "atentie");
  const la = Number(rez.la), acelasi = !!(inainte && !!inainte.contra === contra), vazut = numara(inainte, acelasi, la), anuntat = inainte ? Number(inainte.anuntat) || 0 : 0;
  const anuntatContra = inainte && busolaContra ? !!inainte.anuntatContra : false;
  const stare = { contra, la, vazut, anuntat, anuntatContra, text: c ? c.text : null };
  if (!(contra && vazut >= 2 && !anuntatContra && acum - anuntat > RITM_MS)) return { tine: true, stare, mesaj: null };
  // câte voci s-au pronunțat și câte sunt contra (spec: ≥ 2) - titlul spune numărul real, „toate” doar când sunt 3 din 3
  const cine = c.text.split(" spun la fel")[0], nContra = cine.split(/, | și /).length, nVoci = [grafic, r && r.semn, mc].filter(Boolean).length;
  return { tine: true, stare: Object.assign({}, stare, { anuntat: acum, anuntatContra: true }), mesaj: MC.busolaVoci({ nume: numeBot(bot), directie: bot.directie, levier: bot.levier, cine: cine.replace(/^./, (x) => x.toLowerCase()), nContra, nVoci, text: c.text }) };
}

// pasul din bucla colectorului: mesajul care n-a plecat nu mută starea și nici harta (tura următoare reîncearcă, ca la celelalte alerte)
export async function pazaPas({ Busola, rez, bot, st, acum, pret, trimite, monede, voci }) {
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
  for (const [cheie, fn] of [["_busolaDir", pazaDirectie], ["_busolaBtc", pazaBtc]]) {
    try {
      const x = fn({ Busola, rez, bot, inainte: st[cheie], acum });
      if (!x.tine) continue;
      if (x.mesaj && (vociPlecat || vociInEpisod)) { st[cheie] = Object.assign({}, x.stare, cheie === "_busolaDir" ? { anuntatSemn: x.stare.semn } : { anuntatContra: true }); continue; }
      if (x.mesaj && !(await trimite(x.mesaj))) continue;
      st[cheie] = x.stare;
    } catch (e) { out = Object.assign({}, out, { eroare: String(e && e.message || e) }); }
  }
  return out;
}

// rezumatul vechi: o notă doar în Radar, o dată pe rezumat (anuntat = `la`-ul rezumatului deja anunțat)
export function notaVeche({ Busola, rez, acum, anuntat }) {
  const la = rez ? Number(rez.la) : NaN;
  if (!(la > 0) || acum - la <= Busola.PAZA_VECHI_MS || anuntat === la) return null;
  return Object.assign(MC.busolaVeche(Math.floor((acum - la) / 3600000)), { la });
}
