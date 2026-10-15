// v101.89 (el 08.10: „fa ideile” - ideea B): Monte Carlo pe fiecare bot activ, la 15 minute, cu ACELAȘI motor ca Tabloul și Simulatorul
// (GridSim din pagină, botul reluat cu pozițiile de acum, 2.000 de drumuri pe 14 zile, v101.116); pe Discord DOAR când verdictul își schimbă FELUL
// (aș ține → aș opri, stopul în zgomot → nu se potrivește cu planul…), nu cifrele la fiecare tură. Prima socotire pe un bot tace (nimic de
// comparat). Cuvântul rămâne „șanse”, nu „predicție”.
// deps: { boti, GridSim, GridCalcul, randuri15(simbol) -> rânduri Pionex 15M (lumânările colectorului), stare: { boti: {} } (ținută în ritm),
//         anunta({nivel, titlu, mesaj}, botId, cheie) -> bool, jurnal, acum?, n? (2000), plan?(bot) -> {minus, plus} | null (async),
//         funding?(simbol) -> {rataZi} | null (async) }

// motorul paginii, cu dependențele date ca parametri (nu sunt globale în colector); globalThis fals ca grid-sim.js să nu scrie în cel adevărat
export function gridSimDinPagina(src, GridCalcul, GridProba, MonteSimbol) {
  return new Function("GridCalcul", "GridProba", "MonteSimbol", "globalThis", src + "\n; return GridSim;")(GridCalcul, GridProba, MonteSimbol, {});
}
// felul verdictului, din prima propoziție a lui «ce aș face» (GridSim.verdict) - cifrele se mișcă la fiecare tură, felul nu
export function categorie(faCe) {
  const s = String(faCe || "").trim();
  if (/^(Aș ține|Aș porni)/.test(s)) return "tine";   // revizia (1): „Aș porni” = varianta de bot NOU (boții mai vechi de ~31 de zile se socotesc așa)
  if (/^(Aș opri|L-aș opri|N-aș porni)/.test(s)) return "opreste";
  if (/^Reluarea arată/.test(s)) return "reluare";   // setările de aici nu se potrivesc cu botul din Pionex - nu e „aș opri”
  if (/^Nu se potrivește/.test(s)) return "plan";
  if (/^Stopul e în zgomot/.test(s)) return "zgomot";
  if (/^O aruncare de ban/.test(s)) return "ban";
  return "alt";
}
const NUME_CAT = { tine: "aș ține", opreste: "aș opri", plan: "nu se potrivește cu planul", zgomot: "stopul e în zgomot", ban: "o aruncare de ban", reluare: "reluarea nu se potrivește cu Pionex", alt: "altfel" };
// revizia (3): un fel nou se anunță abia când ține DOUĂ ture la rând (v101.116: marja reală, pe grupe de zile, e ±28…±46 de puncte, nu ±4 - felul ar sări des fără confirmare) și cel
// mult un mesaj pe bot pe oră; (mărunt) alerta netrimisă nu schimbă starea - se reîncearcă la tura următoare
const TURE_PANA_LA_ANUNT = 2, PAUZA_ANUNT_MS = 60 * 60000;
function ora(t) { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
function deCand(la, acum) { const ms = acum - la; return ms >= 86400000 ? "de " + cate(Math.round(ms / 86400000), "zi", "zile") : "de la " + ora(la); }   // peste 24 h ora singură ar minți
const nr = (v) => (typeof v === "number" && isFinite(v) ? v : null);
// v101.90 (ideea 1): rândul din rezumatul de dimineață - „MET «aș ține» de 2 zile · PONS «aș opri» de 3 h”, doar boții activi cu un fel știut.
// Revizia Opus (4, 5): ≤ 144 (160 − „🎰 Monte Carlo: ”) ca rândul Busolei - întâi fără „de când”, apoi „· +N”; boții cu socotirea mai veche de
// 30 de minute (PC-ul pornit după ora rezumatului ⇒ starea e de aseară) nu intră; nimic proaspăt ⇒ fără rând
const LINIA_MAX = 144, SOCOTIRE_PROASPATA_MS = 30 * 60000;
function deCat(ms) { return ms >= 86400000 ? "de " + cate(Math.round(ms / 86400000), "zi", "zile") : ms >= 3600000 ? "de " + Math.round(ms / 3600000) + " h" : "de " + Math.max(1, Math.round(ms / 60000)) + " min"; }
export function liniaMonteCarlo(stareBoti, boti, acum, max) {
  const st = stareBoti && typeof stareBoti === "object" ? stareBoti : {}, MAX = Number(max) > 0 ? Number(max) : LINIA_MAX, l = [];
  for (const b of boti || []) {
    if (!b || b.id == null || b.activ === false) continue; const s = st[String(b.id)]; if (!s || !s.cat || !NUME_CAT[s.cat]) continue;
    const u = nr(s.ultima); if (!(u > 0) || acum - u > SOCOTIRE_PROASPATA_MS) continue;
    l.push({ nume: String(b.baza || "").replace(/\.PERP$/, ""), fel: NUME_CAT[s.cat], de: deCat(acum - (nr(s.la) || acum)) });
  }
  if (!l.length) return null;
  const unu = (x, cuDurata) => x.nume + " «" + x.fel + "»" + (cuDurata ? " " + x.de : "");
  let tx = l.map((x) => unu(x, true)).join(" · "); if (tx.length <= MAX) return tx;
  const p = l.map((x) => unu(x, false)); tx = p.join(" · "); if (tx.length <= MAX) return tx;
  for (let n = p.length - 1; n >= 1; n--) { tx = p.slice(0, n).join(" · ") + " · +" + (p.length - n); if (tx.length <= MAX) return tx; }
  return p[0].slice(0, MAX - 6) + " · +" + (p.length - 1);
}

// ── v101.92 (I-577): jurnalul vocilor ──────────────────────────────────────────────────────────────
// vocile botului acum (Busola.concluzie pe graficul pe 4h, direcția Busolei, felul Monte Carlo) + semnele lor și prețul; se notează în KV
// la fiecare SCHIMBARE a frazei și se judecă după 24 h (judecaVoci: încotro a mers prețul; sub 0,2% = pe loc). Pure, probate în proba-v100149.
const SEMN_GR = { urca: 1, coboara: -1, lateral: 0 }, SEMN_B = { "inclinat-long": 1, "inclinat-short": -1, asteapta: 0 }, SEMN_MC = { bine: 1, rau: -1, atentie: 0 };
export function vociBot({ Busola, rez, bot, grafic, mc, mcAtins, acum }) {
  if (!Busola || !rez || !bot) return null;
  const cheie = bot.simbolPionex || String(bot.baza || "").replace(/\.PERP$/, "") + "_USDT_PERP";
  // revizia Opus: aceeași frază ca în Tablou - vocea Busolei doar din rezumat proaspăt (sub 4,5 h), „planul atins (încasează)” la MC
  const p = Busola.pazaStare(rez, cheie, acum), r = p && !p.vechi ? Busola.randDirectie(rez, cheie, acum, { bot: bot.directie }) : null, semnB = r && r.semn ? r.semn : null;
  const c = Busola.concluzie({ bot: bot.directie, grafic: grafic || null, busola: semnB, mc: mc || null, mcAtins: !!mcAtins });
  if (!c) return null;
  const d = String(bot.directie || "").toLowerCase();
  return { la: acum, bot: String(bot.id), simbol: cheie, pret: nr(bot.pretCurent), dir: d === "long" || d === "short" ? d : "neutru", text: c.text, nivel: c.nivel, contrazic: /^Vocile se contrazic/.test(c.text),
    semne: { grafic: SEMN_GR[grafic] || 0, busola: SEMN_B[semnB] || 0, mc: SEMN_MC[mc] || 0 } };
}
export function schimbareVoci(prev, nou) { return !!nou && (!prev || prev.text !== nou.text); }
export function judecaVoci(lista, bareDupaSimbol, acum) {
  const out = [], H24 = 86400000;
  for (const x of Array.isArray(lista) ? lista : []) {
    if (!x || x.dupa || !(nr(x.pret) > 0) || acum - Number(x.la) < H24) continue;
    const b = bareDupaSimbol && bareDupaSimbol[x.simbol]; if (!Array.isArray(b) || !b.length) continue;
    // revizia Opus: bara la ≥ 24 h, dar nu mai târziu de 24 h 30 min (fără bare acolo ⇒ intrarea se lasă, nu se judecă pe un preț de peste zile)
    const bara = b.find((y) => y && y.t >= Number(x.la) + H24 && y.t <= Number(x.la) + H24 + 1800000 && y.t + 900000 <= acum); if (!bara || !(bara.c > 0)) continue;
    const r = bara.c / Number(x.pret) - 1;
    out.push({ la: Number(x.la), bot: String(x.bot), pret24: bara.c, pretDir: Math.abs(r) < 0.002 ? 0 : r > 0 ? 1 : -1 });
  }
  return out;
}
// ── v101.92 (I-579): ferestrele regimului - rulările Busolei (jurnal-stari.json, pe același PC) cu aceeași stare pe monedă, lipite ──
export function ferestreRegim(stari, cheie, stare, acum) {
  const l = (Array.isArray(stari) ? stari : []).filter((x) => x && Number(x.la) > 0 && x.monede).slice().sort((a, b) => a.la - b.la), out = [];
  for (let i = 0; i < l.length; i++) {
    if (l[i].monede[cheie] !== stare) continue;
    const de = Number(l[i].la), pana = i + 1 < l.length ? Number(l[i + 1].la) : acum;
    if (out.length && out[out.length - 1].pana === de) out[out.length - 1].pana = pana; else out.push({ de, pana });
  }
  return out;
}

export async function turaMonteCarloBot(d) {
  const acum = d.acum || Date.now(), st = d.stare || {}, out = { boti: 0, simulati: 0, anuntate: 0, erori: 0, p7: {} };   /* v101.118: + p7 (șansa pe plus la 7 zile, pentru calibrare) */
  st.boti = st.boti && typeof st.boti === "object" ? st.boti : {};
  const activi = (d.boti || []).filter((b) => b && b.id != null && b.activ !== false && Number(b.gridJos) > 0 && Number(b.gridSus) > Number(b.gridJos));
  const ids = new Set(activi.map((b) => String(b.id)));
  Object.keys(st.boti).forEach((k) => { if (!ids.has(k)) delete st.boti[k]; });   // boții închiși ies din stare (nu rămân „de când” fantomă)
  for (const b of activi) {
    out.boti++;
    try {
      const simbol = d.simbol ? d.simbol(b) : (b.simbolPionex || String(b.baza || "").replace(/\.PERP$/, "") + "_USDT_PERP"), nume = String(b.baza || simbol).replace(/\.PERP$/, "").replace(/_USDT_PERP$/, "");   // simbolul ca în restul colectorului (TabloBot.simboluri)
      const b15 = d.GridCalcul.bare(await d.randuri15(simbol)); if (b15.length < 7 * 96) throw new Error("prea puține lumânări de 15 minute (" + b15.length + ")");
      const s = d.GridSim.setariDinBot(b), fi = d.funding ? await d.funding(simbol) : null, rata = fi ? nr(fi.rataZi) : null;
      const set = Object.assign({}, s.st, { suma: s.st.suma || 50, fundingZi: rata !== null ? rata : 0.0003, fundingCost: rata === null });
      let plan = d.plan ? await d.plan(b) : null; if (!(plan && !plan.proba && (nr(plan.minus) > 0 || nr(plan.plus) > 0))) plan = null;
      const opt = { plan, n: d.n || 2000, seed: 12, orizonturi: [1, 7], zile: 14 };
      let rez = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: s.pornitLa, stPrefix: s.pornitLa ? set : null }, opt)), nota = "";
      if (rez.eroare && s.pornitLa) { const motiv = String(rez.eroare).split(/[.:]/)[0]; rez = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: null }, opt)); if (!rez.eroare) nota = "ca bot pornit acum (" + motiv + "): "; }
      if (rez.eroare) throw new Error(rez.eroare);
      const v = d.GridSim.verdictScurt(rez, set, plan, b), cat = categorie(v.faCe), text = nota + v.text;
      out.simulati++; out.p7[String(b.id)] = pCastig7(rez);
      // v101.92 (I-579): și pe regimul Busolei (ferestrele cu starea de acum), pe aceleași setări; nevalidat ⇒ se ține în KV, nu se arată
      let regim = null;
      if (d.regim) {
        try {
          const rg = await d.regim(b);
          if (rg && rg.stare && Array.isArray(rg.ferestre) && rg.ferestre.length) {
            // revizia Opus: aceeași reluare ca verdictul principal (prefixul de la pornire; căzut ⇒ ca bot nou), altfel cele două n-ar fi comparabile
            const starturi = d.GridSim.starturiRegim(b15, rg.ferestre, 96), zile = Math.ceil(starturi.length / 96);
            let rr = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: s.pornitLa, stPrefix: s.pornitLa ? set : null }, opt, { starturi })), notaR = "";
            if (rr.eroare && s.pornitLa && !/regimul de acum/.test(String(rr.eroare))) { rr = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: null }, opt, { starturi })); if (!rr.eroare) notaR = "ca bot pornit acum: "; }
            regim = rr.eroare ? { stare: rg.stare, zile, text: String(rr.eroare).slice(0, 200), eroare: true, nevalidat: !d.regimValidat }
              : { stare: rg.stare, zile, text: notaR + d.GridSim.verdictScurt(rr, set, plan, b).text, nevalidat: !d.regimValidat };
          }
        } catch (e) { if (d.jurnal) d.jurnal("monte carlo regim", b.id, e && e.message || e); }
      }
      const prev = st.boti[String(b.id)], fundingZi = set.fundingZi;
      // v101.90: și culoarea (stare) - KV-ul o duce în Tablou, care arată ultimul text / culoare; felul (cat) rămâne cel confirmat (Discord)
      if (!prev || !prev.cat) { st.boti[String(b.id)] = { cat, text, stare: v.stare, la: acum, ultima: acum, fundingZi, candidat: null, candidatN: 0, anuntatLa: 0, regim }; continue; }   // prima socotire tace
      if (cat === prev.cat) { st.boti[String(b.id)] = Object.assign({}, prev, { text, stare: v.stare, ultima: acum, fundingZi, candidat: null, candidatN: 0, regim }); continue; }
      const candidatN = prev.candidat === cat ? (prev.candidatN || 0) + 1 : 1, nou = Object.assign({}, prev, { text, stare: v.stare, ultima: acum, fundingZi, candidat: cat, candidatN, regim });
      if (candidatN >= TURE_PANA_LA_ANUNT && acum - (prev.anuntatLa || 0) >= PAUZA_ANUNT_MS) {
        const ok = await d.anunta({ nivel: cat === "opreste" || cat === "plan" || cat === "reluare" ? "atentie" : "info",
          titlu: "🎰 " + nume + ": Monte Carlo zice acum «" + (NUME_CAT[cat] || cat) + "» (era «" + (NUME_CAT[prev.cat] || prev.cat) + "» " + deCand(prev.la, acum) + ")",
          mesaj: text + " · șanse pe drumuri ca ultimele 14 zile, nu o predicție" }, b.id, "mc-verdict-" + cat);
        if (ok) { out.anuntate++; st.boti[String(b.id)] = { cat, text, stare: v.stare, la: acum, ultima: acum, fundingZi, candidat: null, candidatN: 0, anuntatLa: acum, regim }; continue; }
      }
      st.boti[String(b.id)] = nou;   // încă nu se anunță (o tură, pauza de o oră sau alerta netrimisă): felul vechi rămâne, candidatul se ține
    } catch (e) { out.erori++; if (d.jurnal) d.jurnal("monte carlo bot", b.id, e && e.message || e); }
  }
  return out;
}
// v101.118 (15.10, el: „fă tot” — ideea B1 din audit): verdictul Monte Carlo VERIFICAT pe ce a urmat. O dată pe zi (UTC) pe fiecare bot activ se ține
// șansa „pe plus în 7 zile” dată de simulator + totalul botului de atunci; după 7 zile (cel mult 9 — colectorul oprit mai mult ⇒ „expirat”, nu judecat
// pe altă fereastră) sau la închiderea botului (totalul final) se vede dacă botul chiar a câștigat de atunci. Nimic din viitor: șansa și totalul sunt
// cele de la momentul notării, rezultatul se citește abia după.
const ZI_MS = 86400000, MAX_MC_JURNAL = 800, JUDECAT_DE_LA = 7 * ZI_MS, EXPIRAT_DUPA = 9 * ZI_MS, MIN_JUDECATE = 30;
// șansa pe plus la 7 zile: „de aici încolo” (botul pornit, cu pozițiile de acum) când există, altfel a drumului întreg (bot pornit acum)
export function pCastig7(rez) {
  const o = rez && Array.isArray(rez.orizonturi) ? rez.orizonturi.find((x) => x && x.zile === 7) : null; if (!o) return null;
  const p = o.deAici && nr(o.deAici.pCastig) !== null ? nr(o.deAici.pCastig) : nr(o.pCastig);
  return p !== null && p >= 0 && p <= 1 ? p : null;
}
export function noteazaMc(jurnal, { id, p, cat, total, acum }) {
  const l = Array.isArray(jurnal) ? jurnal.slice() : [], z = new Date(acum).toISOString().slice(0, 10), t = nr(total), pp = nr(p);
  if (id == null || pp === null || t === null) return l;
  if (l.some((e) => e && e.id === String(id) && e.z === z)) return l;   // o singură intrare pe bot pe zi - altfel 96 de ture pe zi ar număra de 96 de ori aceeași fereastră
  l.push({ id: String(id), z, t: acum, p: Math.round(pp * 1000) / 1000, cat: cat || null, total: t, y: null });
  return l.slice(-MAX_MC_JURNAL);
}
// totaluri: Map(id -> totalul de acum) pentru boții activi
export function judecaMc(jurnal, totaluri, acum) {
  return (Array.isArray(jurnal) ? jurnal : []).map((e) => {
    if (!e || e.y !== null || e.expirat) return e;
    const varsta = acum - e.t; if (varsta < JUDECAT_DE_LA) return e;
    if (varsta > EXPIRAT_DUPA) return Object.assign({}, e, { expirat: true });
    const t = totaluri && totaluri.has(e.id) ? nr(totaluri.get(e.id)) : null; if (t === null) return e;
    return Object.assign({}, e, { y: t > e.total ? 1 : 0, totalDupa: t, judecatLa: acum });
  });
}
export function judecaMcLaInchidere(jurnal, id, totalFinal, inchisLa) {
  const t = nr(totalFinal), la = nr(inchisLa);
  return (Array.isArray(jurnal) ? jurnal : []).map((e) => {
    if (!e || e.id !== String(id) || e.y !== null || e.expirat || t === null || (la !== null && e.t > la)) return e;
    return Object.assign({}, e, { y: t > e.total ? 1 : 0, totalDupa: t, judecatLa: la, laInchidere: true });
  });
}
// Brier = media (p − y)²; „aruncarea de ban” = 0,25 (p = 50 % mereu); „rata de bază” = b·(1−b) (aceeași șansă pentru toți, cea care s-a întâmplat)
export function raportMc(jurnal) {
  const j = (Array.isArray(jurnal) ? jurnal : []).filter((e) => e && (e.y === 0 || e.y === 1) && nr(e.p) !== null);
  const zile = new Set(j.map((e) => e.z)).size;
  if (j.length < MIN_JUDECATE) return { stare: "putine", n: j.length, zile };
  const n = j.length, baza = j.reduce((a, e) => a + e.y, 0) / n, brier = j.reduce((a, e) => a + (e.p - e.y) ** 2, 0) / n;
  const cutii = [[0, 0.4], [0.4, 0.6], [0.6, 1.0001]].map(([de, la]) => {
    const c = j.filter((e) => e.p >= de && e.p < la);
    return { de, la: Math.min(la, 1), n: c.length, pMed: c.length ? c.reduce((a, e) => a + e.p, 0) / c.length : null, rata: c.length ? c.reduce((a, e) => a + e.y, 0) / c.length : null };
  });
  return { stare: "testat", n, zile, brier, brierBan: 0.25, brierBaza: baza * (1 - baza), baza, cutii };
}
