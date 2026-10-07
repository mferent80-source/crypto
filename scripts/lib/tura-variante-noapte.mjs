// v101.88 (el 07.10: „fa idei” - ideea „verificarea de noapte pe boții tăi activi”): pe fiecare bot activ, „Compară variante” și
// „Compară ținte (TP)” de pe pagina Monte Carlo, pe aceleași drumuri (15 minute, 7 zile), cu ACELEAȘI funcții ca pagina
// (public/lib/monte-simbol.js + monte-simbol-ecran.js, încărcate prin mcsDinPagina). Pe Discord doar sfaturile sigure („Aș încerca …”,
// „Aș pune / scoate TP-ul …” - regulile probate pe alarme false ȘI pe putere în proba-v100131 / v100132), o dată: aceeași propunere nu
// se repetă în 3 zile (nici A ⇒ B ⇒ A); dacă dispare și revine după aceea, se spune din nou.
// deps: { boti, Mcs, GridCalcul, randuri15?(simbol) -> rânduri Pionex 15M (lumânările colectorului, fără cereri noi), cere(simbol, end)
//         -> klines Pionex 15M (500; doar fără randuri15), anunta({nivel, titlu, mesaj}, botId, cheie) -> bool, stare (.anuntate), jurnal,
//         pauza(ms), pauzaMs?, n? (drumuri, 500), pagini? (6, ca pagina), acum? }
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const ZILE_FARA_REPETARE = 3;

// modulele paginii, cu simulatorul gridului dat ca parametru (MonteSimbol.grid îl caută ca „GridProba”)
export function mcsDinPagina(srcMonte, srcEcran, GridCalcul, GridProba) {
  return new Function("GridCalcul", "GridProba", srcMonte + "\n;\n" + srcEcran
    + "\n; return { MonteSimbol: MonteSimbol, mcsSetariBot: mcsSetariBot, mcsBotiPe: mcsBotiPe, mcsSimbolBot: mcsSimbolBot, mcsCalcVariante: mcsCalcVariante, mcsVariantaBuna: mcsVariantaBuna, mcsCalcTinteBot: mcsCalcTinteBot, mcsTpRecomandat: mcsTpRecomandat, mcsTpValid: mcsTpValid, mcsPretTxt: mcsPretTxt };")(GridCalcul, GridProba);
}
// „aceeași propunere” = același bot, același fel, partea de dinainte de „:” (fără cifrele de azi - acelea se mișcă); „ca protecție” e
// aceeași propunere de TP (revizia R6)
export function cheieSfat(bot, fel, text) { return String(bot) + "|" + fel + "|" + String(text || "").split(":")[0].replace(/ ca protecție$/, "").trim(); }

// 6 pagini de câte 500, ca pagina; o pagină picată după prima ⇒ rămâne ce s-a adus (revizia R2), prima picată ⇒ eroare
async function aduce15(d, simbol, pagini, pauzaMs) {
  let r15 = [], end = null;
  for (let p = 0; p < pagini; p++) {
    let k = null;
    try { k = await d.cere(simbol, end); } catch (e) { if (p === 0) throw e; break; }
    const r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
    if (!r || !r.length) { if (p === 0) throw new Error("Pionex n-a dat lumânări 15M"); break; }
    r15 = r15.concat(r);
    const t = r.map((y) => Number(y && y.time)).filter(Number.isFinite);
    if (r.length < 500 || !t.length) break;
    end = Math.min(...t) - 1; if (pauzaMs) await d.pauza(pauzaMs);
  }
  return r15;
}
// botul în cifre (revizia R8): direcția, levierul, intervalul, grilele, stopul, TP-ul
function descrie(M, st) {
  return st.dir + " " + st.levier + "× · " + M.mcsPretTxt(st.jos) + "–" + M.mcsPretTxt(st.sus) + " · " + cate(st.grile, "grilă", "grile")
    + (st.stop ? " · stop " + M.mcsPretTxt(st.stop.sus || st.stop.jos) : "") + (st.tp > 0 ? " · TP " + M.mcsPretTxt(st.tp) : "");
}

export async function turaVarianteNoapte(d) {
  const M = d.Mcs, n = d.n > 0 ? d.n : 500, pagini = d.pagini > 0 ? d.pagini : 6, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs, acum = d.acum || Date.now();
  const stare = d.stare || {}, an = stare.anuntate && typeof stare.anuntate === "object" ? stare.anuntate : (stare.anuntate = {}), boti = Array.isArray(d.boti) ? d.boti : [];
  const activi = boti.filter((b) => b && b.activ === true && b.id), ids = new Set(activi.map((b) => String(b.id)));
  // revizia (R6): cheile boților care nu mai sunt activi ies (altfel rămân pentru totdeauna)
  for (const k of Object.keys(an)) if (!ids.has(k.split("|")[0])) delete an[k];
  const rezultate = []; let anuntate = 0, simulati = 0;
  for (const b of activi) {
    const sim = M.mcsSimbolBot(b);
    try {
      const lista = M.mcsBotiPe(boti, sim), idx = lista.indexOf(b);
      if (idx < 0) { d.jurnal("variante noapte " + sim, "botul n-are un interval valid"); continue; }
      const simbol = b.simbolPionex || sim + "_USDT_PERP";
      const b15 = d.GridCalcul.bare(d.randuri15 ? await d.randuri15(simbol) : await aduce15(d, simbol, pagini, pauzaMs));
      if (b15.length < 7 * 96) { d.jurnal("variante noapte " + sim, "prea puțin istoric: " + cate(Math.floor(b15.length / 96), "zi", "zile")); continue; }
      const P = b15[b15.length - 1].c, st = M.mcsTpValid(M.mcsSetariBot(boti, sim, idx), P);
      const card = M.MonteSimbol.grid(b15, Object.assign({ pret: P }, st), { zile: 7, n, seed: 12, peDrum: true });
      if (!card || card.eroare) { d.jurnal("variante noapte " + sim, card && card.eroare || "fără rezultat"); continue; }
      const rowsV = M.mcsCalcVariante(b15, st, P, { n, prima: card }), tV = M.mcsVariantaBuna(rowsV);
      const tTp = st.dir === "long" || st.dir === "short" ? M.mcsTpRecomandat(M.mcsCalcTinteBot(b15, st, P, { n, prima: card }), st.suma) : null;
      simulati++;
      rezultate.push({ bot: b.id, sim, variante: tV, tp: tTp });
      for (const [fel, text] of [["variante", tV], ["tp", tTp]]) {
        const loc = b.id + "|" + fel;
        if (!text || !/^Aș /.test(text)) continue;
        const cheie = cheieSfat(b.id, fel, text), ist = (Array.isArray(an[loc]) ? an[loc] : []).filter((x) => x && acum - x.la < ZILE_FARA_REPETARE * 864e5);
        an[loc] = ist;
        if (ist.some((x) => x.c === cheie)) continue;   // aceeași propunere în ultimele 3 zile (și A ⇒ B ⇒ A): tăcere
        const ales = fel === "variante" ? (rowsV.find((r) => text.indexOf("„" + r.nume + "”") >= 0) || null) : null;
        const mesaj = text + " Botul tău: " + descrie(M, st) + "." + (ales ? " Setarea propusă: " + descrie(M, ales.st) + "." : "")
          + (fel === "tp" && st.tpAprox ? " TP-ul tău e dat de Pionex în procente: prețul lui e aproximativ." : "")
          + " (Monte Carlo peste noapte: " + cate(n, "drum", "drumuri") + " de 7 zile.)";
        const ok = await d.anunta({ nivel: "info", titlu: "🌙 " + sim + ": " + (fel === "variante" ? "altă setare, pe aceleași drumuri" : "alt TP, pe aceleași drumuri"), mesaj }, b.id, "noapte-" + fel);
        if (ok) { ist.push({ c: cheie, la: acum }); anuntate++; }
      }
    } catch (e) { d.jurnal("variante noapte " + sim, e && e.message || String(e)); }
  }
  return { boti: activi.length, simulati, rezultate, anuntate };
}
