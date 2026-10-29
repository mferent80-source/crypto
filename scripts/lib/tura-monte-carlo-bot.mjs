// v101.89 (el 08.10: „fa ideile” - ideea B): Monte Carlo pe fiecare bot activ, la 15 minute, cu ACELAȘI motor ca Tabloul și Simulatorul
// (GridSim din pagină, botul reluat cu pozițiile de acum, 2.000 de drumuri pe 14 zile, v101.116; pe 7 zile de la v100.271); pe Discord DOAR când verdictul își schimbă FELUL
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
// v100.271 (ideile auditului 29.10): regimul Busolei NEVALIDAT se socotește o dată pe oră (pe aceeași stare), nu la fiecare tură - vezi turaMonteCarloBot
const REGIM_NEVALIDAT_MS = 60 * 60000;
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
      const opt = { plan, n: d.n || 2000, seed: 12, orizonturi: [1 / 24, 4 / 24, 1, 7] };   // v100.269 (auditul MC): + 1 h și 4 h (riscul pe termen scurt; boții lui trăiesc în mediană 0,5 h)
      /* v100.271 (ideile auditului 29.10): drumurile țin cât cel mai lung orizont citit (7 zile), nu 14 - verdictul, riscul scurt, p7, regimul și
         KV-ul citesc doar 1 h … 7 zile; ~40% mai puțin timp pe bot, aceleași cifre în limita tragerii (proba-v100271-o) */
      opt.zile = Math.max(...opt.orizonturi);
      let rez = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: s.pornitLa, stPrefix: s.pornitLa ? set : null }, opt)), nota = "";
      if (rez.eroare && s.pornitLa) { const motiv = String(rez.eroare).split(/[.:]/)[0]; rez = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: null }, opt)); if (!rez.eroare) nota = "ca bot pornit acum (" + motiv + "): "; }
      if (rez.eroare) throw new Error(rez.eroare);
      const v = d.GridSim.verdictScurt(rez, set, plan, b), cat = categorie(v.faCe), text = nota + v.text;
      out.simulati++; out.p7[String(b.id)] = pCastig7(rez);
      // v101.92 (I-579): și pe regimul Busolei (ferestrele cu starea de acum), pe aceleași setări; nevalidat ⇒ se ține în KV, nu se arată
      let regim = null, regimLa = null;
      if (d.regim) {
        try {
          const rg = await d.regim(b);
          if (rg && rg.stare && Array.isArray(rg.ferestre) && rg.ferestre.length) {
            /* v100.271 (ideile auditului 29.10): cât poarta NU e validată, regimul nu se arată nicăieri (Tabloul doar „validat”), iar poarta
               (proba-mc-regim.mjs) se judecă din bare, walk-forward, nu din KV - deci o socotire pe oră pe aceeași stare, nu la 15 minute (era a
               doua simulare a turei); între ele rămâne în stare / KV ultimul text. Validat, stare nouă sau socotit cât era validat ⇒ la fiecare tură */
            const pr = st.boti[String(b.id)], rv = pr && pr.regim;
            if (!d.regimValidat && rv && rv.nevalidat === true && rv.stare === rg.stare && nr(pr.regimLa) !== null && acum - pr.regimLa < REGIM_NEVALIDAT_MS) { regim = rv; regimLa = pr.regimLa; }
            else {
              // revizia Opus: aceeași reluare ca verdictul principal (prefixul de la pornire; căzut ⇒ ca bot nou), altfel cele două n-ar fi comparabile
              const starturi = d.GridSim.starturiRegim(b15, rg.ferestre, 96), zile = Math.ceil(starturi.length / 96);
              let rr = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: s.pornitLa, stPrefix: s.pornitLa ? set : null }, opt, { starturi })), notaR = "";
              if (rr.eroare && s.pornitLa && !/regimul de acum/.test(String(rr.eroare))) { rr = d.GridSim.simuleaza(b15, set, Object.assign({ pornitLa: null }, opt, { starturi })); if (!rr.eroare) notaR = "ca bot pornit acum: "; }
              regim = rr.eroare ? { stare: rg.stare, zile, text: String(rr.eroare).slice(0, 200), eroare: true, nevalidat: !d.regimValidat }
                : { stare: rg.stare, zile, text: notaR + d.GridSim.verdictScurt(rr, set, plan, b).text, nevalidat: !d.regimValidat };
              regimLa = acum;
            }
          }
        } catch (e) { if (d.jurnal) d.jurnal("monte carlo regim", b.id, e && e.message || e); }
      }
      const prev = st.boti[String(b.id)], fundingZi = set.fundingZi, scurt = d.GridSim.riscScurt ? d.GridSim.riscScurt(rez) : null;   // v100.269: riscul pe 1 h / 4 h / o zi
      // v101.90: și culoarea (stare) - KV-ul o duce în Tablou, care arată ultimul text / culoare; felul (cat) rămâne cel confirmat (Discord)
      if (!prev || !prev.cat) { st.boti[String(b.id)] = { cat, text, stare: v.stare, la: acum, ultima: acum, fundingZi, candidat: null, candidatN: 0, anuntatLa: 0, regim, regimLa, scurt }; continue; }   // prima socotire tace
      if (cat === prev.cat) { st.boti[String(b.id)] = Object.assign({}, prev, { text, stare: v.stare, ultima: acum, fundingZi, candidat: null, candidatN: 0, regim, regimLa, scurt }); continue; }
      const candidatN = prev.candidat === cat ? (prev.candidatN || 0) + 1 : 1, nou = Object.assign({}, prev, { text, stare: v.stare, ultima: acum, fundingZi, candidat: cat, candidatN, regim, regimLa, scurt });
      if (candidatN >= TURE_PANA_LA_ANUNT && acum - (prev.anuntatLa || 0) >= PAUZA_ANUNT_MS) {
        const ok = await d.anunta({ nivel: cat === "opreste" || cat === "plan" || cat === "reluare" ? "atentie" : "info",
          titlu: "🎰 " + nume + ": Monte Carlo zice acum «" + (NUME_CAT[cat] || cat) + "» (era «" + (NUME_CAT[prev.cat] || prev.cat) + "» " + deCand(prev.la, acum) + ")",
          /* v100.271 (ideile auditului 29.10): fraza veche (cu 14 zile) era falsă - drumurile se trag din toate barele de 15 minute aduse (3000 ≈ 31 de zile) */
          mesaj: text + " · șanse pe drumuri trase din ultima lună de prețuri, nu o predicție" }, b.id, "mc-verdict-" + cat);
        if (ok) { out.anuntate++; st.boti[String(b.id)] = { cat, text, stare: v.stare, la: acum, ultima: acum, fundingZi, candidat: null, candidatN: 0, anuntatLa: acum, regim, regimLa, scurt }; continue; }
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
// v100.269 (29.10, el: „un contor care să numere de câte ori a avut dreptate sau nu, gen 1-0, să fie vizibil”): scorul verdictelor.
// Regula, scrisă ÎNAINTE de a număra: verdictul = „pe plus” când șansa notată e peste 50%, „pe minus” sub 50%; 50% fix nu se numără.
// A avut dreptate când botul a ieșit așa (judecat mai sus: totalul la 7 zile sau la închidere față de cel de la notare). Expiratele nu intră.
// Intervalul (95%) e pe ZILE: verdictele din aceeași zi se mișcă împreună (aceeași piață), deci unitatea e ziua, nu verdictul.
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086];
const tCrit = (df) => (df >= 1 && df <= 20 ? T975[df - 1] : df <= 30 ? 2.086 - (df - 20) * 0.0044 : df <= 60 ? 2.042 - (df - 30) * 0.00071 : 1.98);
// Auditul Monte Carlo (29.10): etalonul cinstit nu e banul, ci regula fixă „mereu pe plus” (pe datele lui ar fi nimerit 65 – 46, mai bine decât
// Monte Carlo cu 59 – 52); diferența (Monte Carlo − „mereu pe plus”) se judecă tot pe ZILE. Și unde s-a judecat: boții lui trăiesc în mediană 0,5 h,
// deci verdictele „pe 7 zile” s-au judecat la închidere - contorul o spune.
function intervalZile(v) {
  const n = v.length; if (n < 2) return { medie: null, jos: null, sus: null };
  const medie = v.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(v.reduce((s, x) => s + (x - medie) ** 2, 0) / (n - 1)), m = tCrit(n - 1) * sd / Math.sqrt(n);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  return { medie: r3(medie), jos: r3(medie - m), sus: r3(medie + m) };
}
export function scorMc(jurnal) {
  const peZi = new Map(), peBot = new Map(), ultime = [], ore = []; let d = 0, g = 0, a = 0, egal = 0, plus = 0, laInchidere = 0;
  for (const e of Array.isArray(jurnal) ? jurnal : []) {
    if (!e || e.id == null || e.expirat) continue;
    const b = peBot.get(String(e.id)) || { d: 0, g: 0, a: 0 }; peBot.delete(String(e.id)); peBot.set(String(e.id), b);   /* revizia: botul notat recent trece la coadă (cei 60 păstrați = cei mai recenți) */
    if (e.y !== 0 && e.y !== 1) { a++; b.a++; continue; }
    const p = nr(e.p); if (p === null || p === 0.5) { egal++; continue; }
    const ok = (p > 0.5 ? 1 : 0) === e.y;
    if (ok) { d++; b.d++; } else { g++; b.g++; }
    if (e.y === 1) plus++;
    if (e.laInchidere) laInchidere++;
    const jl = nr(e.judecatLa), tl = nr(e.t); if (jl !== null && tl !== null && jl >= tl) ore.push((jl - tl) / 3600000);
    ultime.push(ok ? "D" : "G");
    const z = peZi.get(e.z) || [0, 0, 0]; z[0] += ok ? 1 : 0; z[1]++; z[2] += e.y === 1 ? 1 : 0; peZi.set(e.z, z);
  }
  const zile = [...peZi.values()], ic = intervalZile(zile.map(([k, n]) => k / n)), dif = intervalZile(zile.map(([k, n, p]) => (k - p) / n));
  ore.sort((x, y) => x - y);
  const oreMediana = ore.length ? Math.round((ore.length % 2 ? ore[(ore.length - 1) / 2] : (ore[ore.length / 2 - 1] + ore[ore.length / 2]) / 2) * 10) / 10 : null;
  return { d, g, a, egal, zile: zile.length, medie: ic.medie, icJos: ic.jos, icSus: ic.sus, plus, laInchidere, oreMediana, difMedie: dif.medie, difJos: dif.jos, difSus: dif.sus,
    ultime: ultime.slice(-10).join(""), peBot: Object.fromEntries([...peBot.entries()].slice(-60)) };
}
// Brier = media (p − y)²; „aruncarea de ban” = 0,25 (p = 50 % mereu); „rata de bază” = b·(1−b) (aceeași șansă pentru toți, cea care s-a întâmplat)
export function raportMc(jurnal) {
  const j = (Array.isArray(jurnal) ? jurnal : []).filter((e) => e && (e.y === 0 || e.y === 1) && nr(e.p) !== null);
  const zile = new Set(j.map((e) => e.z)).size, scor = scorMc(jurnal);   /* v100.269: contorul pleacă mereu, și sub 30 de verdicte */
  if (j.length < MIN_JUDECATE) return { stare: "putine", n: j.length, zile, scor };
  const n = j.length, baza = j.reduce((a, e) => a + e.y, 0) / n, brier = j.reduce((a, e) => a + (e.p - e.y) ** 2, 0) / n;
  const cutii = [[0, 0.4], [0.4, 0.6], [0.6, 1.0001]].map(([de, la]) => {
    const c = j.filter((e) => e.p >= de && e.p < la);
    return { de, la: Math.min(la, 1), n: c.length, pMed: c.length ? c.reduce((a, e) => a + e.p, 0) / c.length : null, rata: c.length ? c.reduce((a, e) => a + e.y, 0) / c.length : null };
  });
  return { stare: "testat", n, zile, brier, brierBan: 0.25, brierBaza: baza * (1 - baza), baza, cutii, scor };
}

// ── v100.271 (ideile auditului 29.10): riscul pe termen scurt VERIFICAT pe boții lui ────────────────────────────────────────────────
// Auditul (reluare offline pe 73 de monede) a arătat că riscul de pe 1 h / 4 h / o zi e calibrat ÎN MEDIE; pe boții lui nu era verificat.
// Jurnal NOU, separat de cel de 7 zile (ritm.mcScurt). PROTOCOLUL - scris înainte de orice dată, nu se schimbă după ce se văd rezultatele:
//  • Notarea: la tura Monte Carlo (15 min), pe fiecare bot activ socotit chiar în tura asta (fără „Reluarea arată botul OPRIT” - acolo
//    cifrele nu sunt ale botului din Pionex), pe fiecare orizont h ∈ {1, 4, 24} h: pStop (stopul atins în h), p5 (cele mai proaste 5% ale
//    schimbării totalului în h, USDT, de aici încolo), totalul botului (profitTotal = echitate − investit, aceeași bază ca jurnalul de 7 zile;
//    lipsă ⇒ nu se notează) și ora citirii lui. Ferestre FĂRĂ suprapunere: pe (bot, h) o notare nouă abia după ce cea dinainte s-a închis.
//  • Judecata, botul încă pornit: prima citire a listei din [t+h, t+h+20 min] (bucla de 60 s): stopul = 0 (merge, deci stopul nu l-a
//    închis), „sub p5” = (totalul de acum − cel de la notare) < p5. Fereastra trecută cu botul pornit ⇒ „expirat” (colectorul oprit).
//  • Botul închis (motivul din Pionex: buOrderData.reasonBy → motivInchidere), până la t+h: loss_stop ⇒ stopul = 1; profit_stop, lichidare,
//    system_cancel ⇒ stopul = 0; „sub p5” pe totalul final (lipsă ⇒ doar stopul). user_cancel ⇒ „închis de tine”: numărat separat, NU intră
//    în scor (clipa ai ales-o tu). Alt motiv / fără motiv / fără ora închiderii ⇒ „necitit”, separat. Închis în (t+h, t+h+20 min] ⇒ era pornit
//    la t+h: ca o citire din fereastră, pe totalul final. Mai târziu și nejudecat ⇒ „expirat”.
//  • Raportul, pe fiecare h: judecate, zile, stopul prezis în medie vs atins, cât de des „sub p5” (ar trebui ~5%), închise de tine, necitite,
//    expirate, deschise. Unitatea independentă = ZIUA (UTC, a notării): intervalul are varianța pe zile (CR1), dar nu mai mică decât a unor
//    aruncări cu șansele prezise, corelate în zi cu 0,1 (zilele fără niciun stop altfel ar „arăta” prea mult; corelația 0,1 aleasă din simularea
//    sub H0, înainte de date: cu aruncări independente „prezice prea mult” ieșea fals în 7–15% din seturi la zile cu piață comună), t cu
//    zile − 1 grade; pe ecran stau 2 cifre (stopul și „sub p5”) ⇒ Bonferroni: 97,5% fiecare, ca împreună să fie 95%.
//  • Cuvintele: sub 30 de judecate sau sub 10 zile ⇒ „strâng date”, niciun verdict. Altfel stopul: intervalul (atins − prezis) peste 0 ⇒
//    „prezice prea puțin”, sub 0 ⇒ „prezice prea mult”, tot în ±max(3 puncte, jumătate din prezis) ⇒ „se potrivește”, altfel nimic.
//    „Sub p5”: la fel față de 5%, cu ±5 puncte.
//  • Simularea sub H0 (scripts/sim-h0-v100271-j.mjs), făcută înainte de date: cât de des apare pe ecran „prezice prea puțin / prea mult”
//    când riscul e corect - trebuie ~5% sau mai rar.
//  • Revizia independentă (29.10): scos din scor, botul „închis de tine” înainte de orizont UMFLA rata stopului (rămâneau stopurile, plecau boții
//    fără stop: risc corect 5%, 70% închiși de tine ⇒ „atins 11,3%”, fals „prezice prea puțin”). Acum intră în scor cu stopul NEATINS, iar șansa
//    prezisă e pe cât a stat deschis (pStop × timpul deschis / orizont - risc aproximativ uniform în fereastră); „sub p5” pe totalul de la închidere.
//    Boții FĂRĂ stop activ (areStop false) nu intră în scorul stopului (prezis 0 = atins 0 ar fi un „se potrivește” gol), doar în „sub p5”.
const ORE_SCURT = [1, 4, 24], ORA_MS = 3600000, FEREASTRA_SCURT_MS = 20 * 60000, ASTEPT_INCHIDEREA_MS = 6 * ORA_MS, MAX_SCURT_JURNAL = 2000, MIN_SCURT = 30, MIN_ZILE_SCURT = 10;
const r4 = (x) => (x === null || !isFinite(x) ? null : Math.round(x * 10000) / 10000);
const deschisa = (e) => e && e.stare === "deschis";
// scurt = GridSim.riscScurt(rez): [{ ore, pStop, pLich, p5 }]; o notare pe orizont, doar dacă pe (bot, h) nu e una deschisă
export function noteazaScurt(jurnal, { id, scurt, total, acum, areStop } = {}) {
  const l = Array.isArray(jurnal) ? jurnal : [], t = nr(total), la = nr(acum);
  if (id == null || t === null || la === null || !Array.isArray(scurt)) return l;
  const noi = [];
  for (const ore of ORE_SCURT) {
    const s = scurt.find((x) => x && nr(x.ore) === ore); if (!s) continue;
    const pS = nr(s.pStop), p5 = nr(s.p5); if (pS === null || pS < 0 || pS > 1 || p5 === null) continue;
    if (l.some((e) => deschisa(e) && e.id === String(id) && e.ore === ore)) continue;   // fereastra de dinainte încă deschisă
    noi.push({ id: String(id), ore, t: la, z: new Date(la).toISOString().slice(0, 10), pStop: r4(pS), p5: Math.round(p5 * 100) / 100, total: r4(t), stare: "deschis", areStop: areStop !== false });   /* totalul la 4 zecimale: jurnalul stă în ritmuri.json */
  }
  return noi.length ? l.concat(noi).slice(-MAX_SCURT_JURNAL) : l;
}
// tura colectorului: stareBoti = verdictele Monte Carlo (st.boti), deLa = începutul turei - doar ce s-a socotit acum (o socotire picată lasă
// riscul vechi în stare); „Reluarea arată botul OPRIT” ⇒ cifrele nu sunt ale botului din Pionex, nu se notează
export function noteazaScurtBoti(jurnal, { boti, stareBoti, la, deLa } = {}) {
  let j = Array.isArray(jurnal) ? jurnal : []; const st = stareBoti && typeof stareBoti === "object" ? stareBoti : {}, de = nr(deLa);
  if (de === null) return j;
  for (const b of Array.isArray(boti) ? boti : []) {
    if (!b || b.id == null || b.activ === false) continue;
    // revizia: și „ca bot pornit acum” (simularea n-a putut relua botul real - cifrele sunt ale unui bot nou) nu se notează
    const sb = st[String(b.id)]; if (!sb || !(nr(sb.ultima) >= de) || /«Reluarea arată|ca bot pornit acum/.test(String(sb.text || ""))) continue;
    const areStop = nr(b.opritorPierdere) > 0 || nr(b.opritorPierdereRaport) !== null;   /* revizia: botul fără stop nu intră în scorul stopului */
    j = noteazaScurt(j, { id: b.id, scurt: sb.scurt, total: b.profitTotal === null || b.profitTotal === undefined || b.profitTotal === "" ? null : Number(b.profitTotal), acum: la, areStop });
  }
  return j;
}
// botul pornit: totaluri = Map(id -> totalul de acum | null), citit la `la`. Întoarce ACELAȘI jurnal când nu s-a schimbat nimic (fără scriere pe disc)
export function judecaScurt(jurnal, totaluri, la) {
  const l = Array.isArray(jurnal) ? jurnal : [], acum = nr(la); if (acum === null) return l;
  let schimbat = false;
  const out = l.map((e) => {
    if (!deschisa(e)) return e;
    const fin = e.t + e.ore * ORA_MS; if (acum < fin) return e;
    const are = !!(totaluri && totaluri.has(e.id)), tot = are ? nr(totaluri.get(e.id)) : null;
    if (acum <= fin + FEREASTRA_SCURT_MS) {
      if (tot === null) return e;
      schimbat = true; return Object.assign({}, e, { stare: "judecat", stop: 0, sub5: tot - e.total < e.p5 ? 1 : 0, totalDupa: r4(tot), la: acum });
    }
    // fereastra trecută: botul pornit ⇒ colectorul n-a citit la timp; botul lipsă ⇒ judecata la închidere, cel mult 6 h
    if (are || acum > fin + FEREASTRA_SCURT_MS + ASTEPT_INCHIDEREA_MS) { schimbat = true; return Object.assign({}, e, { stare: "expirat", la: acum }); }
    return e;
  });
  return schimbat ? out : l;
}
// motivul închiderii (bot-orders: motivInchidere = buOrderData.reasonBy curățat); ce nu știm sigur ⇒ „necitit”
export function clasaInchidere(motiv) {
  const m = String(motiv || "").toLowerCase();
  if (m === "loss_stop") return "stop";
  if (m === "profit_stop") return "tinta";
  if (/liquid/.test(m)) return "lichidare";
  if (m === "system_cancel") return "pionex";
  if (m === "user_cancel") return "tine";
  return "necitit";
}
export function judecaScurtLaInchidere(jurnal, id, { total, motiv, inchisLa } = {}) {
  const l = Array.isArray(jurnal) ? jurnal : [], t = nr(total), la = nr(inchisLa) > 0 ? nr(inchisLa) : null, cls = clasaInchidere(motiv);
  const brut = String(motiv || "").replace(/[^a-z_]/gi, "").slice(0, 30) || null, sub5 = (e) => (t === null ? null : t - e.total < e.p5 ? 1 : 0);
  let schimbat = false;
  const out = l.map((e) => {
    if (!deschisa(e) || e.id !== String(id)) return e;
    schimbat = true;
    if (la === null) return Object.assign({}, e, { stare: "necitit", motivBrut: brut });
    const fin = e.t + e.ore * ORA_MS;
    if (e.t > la || la > fin + FEREASTRA_SCURT_MS) return Object.assign({}, e, { stare: "expirat", la });   // notat după închidere / fereastra ratată
    if (la > fin) return Object.assign({}, e, { stare: "judecat", stop: 0, sub5: sub5(e), totalDupa: r4(t), la, laInchidere: true });   // pornit la t+h
    // revizia: închis de tine (sau de Pionex) înainte de orizont ⇒ stopul NEATINS, șansa pe cât a stat deschis (pExp), „sub p5” pe totalul final
    if (cls === "tine" || cls === "pionex") return Object.assign({}, e, { stare: "judecat", stop: 0, pExp: r4(e.pStop * Math.max(0, Math.min(1, (la - e.t) / (e.ore * ORA_MS)))), sub5: sub5(e), totalDupa: r4(t), la, laInchidere: true, motiv: cls, deTine: cls === "tine" });
    if (cls === "necitit") return Object.assign({}, e, { stare: "necitit", la, motivBrut: brut });
    return Object.assign({}, e, { stare: "judecat", stop: cls === "stop" ? 1 : 0, sub5: sub5(e), totalDupa: r4(t), la, laInchidere: true, motiv: cls });
  });
  return schimbat ? out : l;
}
// t pe 98,75% (două cifre pe ecran ⇒ Bonferroni, 97,5% fiecare), Cornish-Fisher pe z = 2,2414: la 9 grade 2,685, la 20 2,423 (ca în tabele);
// se folosește doar de la 10 zile (≥ 9 grade), unde aproximarea e bună
function tBonf(df) {
  const z = 2.241402727604947, v = Math.max(1, df), z3 = z ** 3, z5 = z ** 5, z7 = z ** 7, z9 = z ** 9;
  return z + (z3 + z) / (4 * v) + (5 * z5 + 16 * z3 + 3 * z) / (96 * v ** 2) + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * v ** 3) + (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * v ** 4);
}
// d = [{ z, x, p }]: x = ce s-a întâmplat (0/1), p = șansa prezisă. Media (x − p) pe judecate; varianța pe ZILE (CR1, centrată), dar nu sub cea a
// aruncărilor cu șansele prezise corelate în zi cu ICC_ZI - zilele fără niciun stop au altfel varianța ~0 și intervalul ar „arăta” prea mult din nimic
const ICC_ZI = 0.1;
function intervalScurt(d, marja) {
  const n = d.length, zile = new Map(); let s = 0;
  for (const e of d) { s += e.x - e.p; const z = zile.get(e.z) || { r: 0, k: 0, v: 0, q: 0 }; z.r += e.x - e.p; z.k++; z.v += e.p * (1 - e.p); z.q += Math.sqrt(e.p * (1 - e.p)); zile.set(e.z, z); }
  const D = zile.size; if (n < MIN_SCURT || D < MIN_ZILE_SCURT) return { jos: null, sus: null, verdict: "putine" };
  const dif = s / n; let sc = 0, v0 = 0;
  for (const z of zile.values()) { const r = z.r - z.k * dif; sc += r * r; v0 += z.v + ICC_ZI * (z.q * z.q - z.v); }   // Var(suma zilei) cu corelația ICC_ZI între notări
  const m = tBonf(D - 1) * Math.sqrt(Math.max(D / (D - 1) * sc, v0) / (n * n)), jos = dif - m, sus = dif + m;
  return { jos, sus, verdict: jos > 0 ? "prea-putin" : sus < 0 ? "prea-mult" : jos >= -marja && sus <= marja ? "potrivit" : "nedecis" };
}
export function raportScurt(jurnal) {
  const l = (Array.isArray(jurnal) ? jurnal : []).filter((e) => e && typeof e === "object");
  return { ore: ORE_SCURT.map((ore) => {
    const L = l.filter((e) => e.ore === ore), j = L.filter((e) => e.stare === "judecat"), c = (s) => L.filter((e) => e.stare === s).length;
    const st = j.filter((e) => (e.stop === 0 || e.stop === 1) && nr(e.pStop) !== null && e.areStop !== false).map((e) => ({ z: e.z, x: e.stop, p: nr(e.pExp) !== null ? e.pExp : e.pStop }));   /* revizia: fără boții fără stop; închișii de tine pe cât au stat deschiși */
    const s5 = j.filter((e) => e.sub5 === 0 || e.sub5 === 1).map((e) => ({ z: e.z, x: e.sub5, p: 0.05 }));
    const med = (a, f) => (a.length ? r4(a.reduce((s, x) => s + f(x), 0) / a.length) : null), pStopMed = med(st, (x) => x.p);
    const iS = intervalScurt(st, Math.max(0.03, 0.5 * (pStopMed || 0))), i5 = intervalScurt(s5, 0.05);
    return { ore, n: j.length, zile: new Set(j.map((e) => e.z)).size, pStopMed, stopRata: med(st, (x) => x.x), stopDifJos: r4(iS.jos), stopDifSus: r4(iS.sus), verdictStop: iS.verdict,
      nSub5: s5.length, sub5Rata: med(s5, (x) => x.x), sub5Jos: i5.jos !== null ? r4(i5.jos + 0.05) : null, sub5Sus: i5.sus !== null ? r4(i5.sus + 0.05) : null, verdictP5: i5.verdict,
      tine: L.filter((e) => e.deTine || e.stare === "tine").length, necitit: c("necitit"), expirat: c("expirat"), deschise: c("deschis") };
  }) };
}
