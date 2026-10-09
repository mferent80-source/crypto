// v101.89 (el 08.10: „fa ideile” - ideea B): Monte Carlo pe fiecare bot activ, la 15 minute, cu ACELAȘI motor ca Tabloul și Simulatorul
// (GridSim din pagină, botul reluat cu pozițiile de acum, 500 de drumuri pe 14 zile); pe Discord DOAR când verdictul își schimbă FELUL
// (aș ține → aș opri, stopul în zgomot → nu se potrivește cu planul…), nu cifrele la fiecare tură. Prima socotire pe un bot tace (nimic de
// comparat). Cuvântul rămâne „șanse”, nu „predicție”.
// deps: { boti, GridSim, GridCalcul, randuri15(simbol) -> rânduri Pionex 15M (lumânările colectorului), stare: { boti: {} } (ținută în ritm),
//         anunta({nivel, titlu, mesaj}, botId, cheie) -> bool, jurnal, acum?, n? (500), plan?(bot) -> {minus, plus} | null (async),
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
// revizia (3): un fel nou se anunță abia când ține DOUĂ ture la rând (marja e ±4 puncte - la P≈55 felul ar sări la fiecare 15 minute) și cel
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
export function vociBot({ Busola, rez, bot, grafic, mc, acum }) {
  if (!Busola || !rez || !bot) return null;
  const cheie = bot.simbolPionex || String(bot.baza || "").replace(/\.PERP$/, "") + "_USDT_PERP";
  const r = Busola.randDirectie(rez, cheie, acum, { bot: bot.directie }), semnB = r && r.semn ? r.semn : null;
  const c = Busola.concluzie({ bot: bot.directie, grafic: grafic || null, busola: semnB, mc: mc || null });
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
    const bara = b.find((y) => y && y.t >= Number(x.la) + H24 && y.t + 900000 <= acum); if (!bara || !(bara.c > 0)) continue;
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
  const acum = d.acum || Date.now(), st = d.stare || {}, out = { boti: 0, simulati: 0, anuntate: 0, erori: 0 };
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
      const opt = { plan, n: d.n || 500, seed: 12, orizonturi: [1, 7], zile: 14 };
      let rez = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: s.pornitLa, stPrefix: s.pornitLa ? set : null }, opt)), nota = "";
      if (rez.eroare && s.pornitLa) { const motiv = String(rez.eroare).split(/[.:]/)[0]; rez = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: null }, opt)); if (!rez.eroare) nota = "ca bot pornit acum (" + motiv + "): "; }
      if (rez.eroare) throw new Error(rez.eroare);
      const v = d.GridSim.verdictScurt(rez, set, plan, b), cat = categorie(v.faCe), text = nota + v.text;
      out.simulati++;
      // v101.92 (I-579): și pe regimul Busolei (ferestrele cu starea de acum), pe aceleași setări; nevalidat ⇒ se ține în KV, nu se arată
      let regim = null;
      if (d.regim) {
        try {
          const rg = await d.regim(b);
          if (rg && rg.stare && Array.isArray(rg.ferestre) && rg.ferestre.length) {
            const starturi = d.GridSim.starturiRegim(b15, rg.ferestre, 96), rr = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: null }, opt, { starturi }));
            regim = rr.eroare ? { stare: rg.stare, zile: Math.floor(starturi.length / 96), text: String(rr.eroare).slice(0, 200), eroare: true, nevalidat: !d.regimValidat }
              : { stare: rg.stare, zile: Math.floor(starturi.length / 96), text: d.GridSim.verdictScurt(rr, set, plan, b).text, nevalidat: !d.regimValidat };
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
