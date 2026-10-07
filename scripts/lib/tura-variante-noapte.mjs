// v101.88 (el 07.10: „fa idei” - ideea „verificarea de noapte pe boții tăi activi”): pe fiecare bot activ, „Compară variante” și
// „Compară ținte (TP)” de pe pagina Monte Carlo, pe aceleași drumuri (15 minute, 7 zile), cu ACELEAȘI funcții ca pagina
// (public/lib/monte-simbol.js + monte-simbol-ecran.js, încărcate prin mcsDinPagina). Pe Discord doar sfaturile sigure („Aș încerca …”,
// „Aș pune / scoate TP-ul …” - regulile probate pe alarme false ȘI pe putere în proba-v100131 / v100132), o dată: același sfat nu se
// repetă noapte de noapte; dacă dispare și revine, se spune din nou.
// deps: { boti, Mcs, GridCalcul, cere(simbol, end) -> klines Pionex 15M (500), anunta({nivel, titlu, mesaj}, botId, cheie) -> bool,
//         stare (obiect ținut de colector; aici .anuntate), jurnal, pauza(ms), pauzaMs?, n? (drumuri, 500), pagini? (6, ca pagina), acum? }
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }

// modulele paginii, cu simulatorul gridului dat ca parametru (MonteSimbol.grid îl caută ca „GridProba”)
export function mcsDinPagina(srcMonte, srcEcran, GridCalcul, GridProba) {
  return new Function("GridCalcul", "GridProba", srcMonte + "\n;\n" + srcEcran
    + "\n; return { MonteSimbol: MonteSimbol, mcsSetariBot: mcsSetariBot, mcsBotiPe: mcsBotiPe, mcsSimbolBot: mcsSimbolBot, mcsCalcVariante: mcsCalcVariante, mcsVariantaBuna: mcsVariantaBuna, mcsCalcTinteBot: mcsCalcTinteBot, mcsTpRecomandat: mcsTpRecomandat, mcsTpValid: mcsTpValid };")(GridCalcul, GridProba);
}
// „același sfat” = același bot, același fel, aceeași propunere (partea de dinainte de „:”, fără cifrele de azi - acelea se mișcă)
export function cheieSfat(bot, fel, text) { return String(bot) + "|" + fel + "|" + String(text || "").split(":")[0].trim(); }

async function aduce15(d, simbol, pagini, pauzaMs) {
  let r15 = [], end = null;
  for (let p = 0; p < pagini; p++) {
    const k = await d.cere(simbol, end), r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
    if (!r || !r.length) break;
    r15 = r15.concat(r);
    const t = r.map((y) => Number(y && y.time)).filter(Number.isFinite);
    if (r.length < 500 || !t.length) break;
    end = Math.min(...t) - 1; if (pauzaMs) await d.pauza(pauzaMs);
  }
  return d.GridCalcul.bare(r15);
}

export async function turaVarianteNoapte(d) {
  const M = d.Mcs, n = d.n > 0 ? d.n : 500, pagini = d.pagini > 0 ? d.pagini : 6, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs;
  const stare = d.stare || {}, an = stare.anuntate || (stare.anuntate = {}), boti = Array.isArray(d.boti) ? d.boti : [];
  const activi = boti.filter((b) => b && b.activ === true && b.id);
  const rezultate = []; let anuntate = 0;
  for (const b of activi) {
    const sim = M.mcsSimbolBot(b);
    try {
      const lista = M.mcsBotiPe(boti, sim), idx = lista.indexOf(b);
      if (idx < 0) { d.jurnal("variante noapte " + sim, "botul n-are un interval valid"); continue; }
      const b15 = await aduce15(d, b.simbolPionex || sim + "_USDT_PERP", pagini, pauzaMs);
      if (b15.length < 7 * 96) { d.jurnal("variante noapte " + sim, "prea puțin istoric: " + cate(Math.floor(b15.length / 96), "zi", "zile")); continue; }
      const P = b15[b15.length - 1].c, st = M.mcsTpValid(M.mcsSetariBot(boti, sim, idx), P);
      const card = M.MonteSimbol.grid(b15, Object.assign({ pret: P }, st), { zile: 7, n, seed: 12, peDrum: true });
      if (!card || card.eroare) { d.jurnal("variante noapte " + sim, card && card.eroare || "fără rezultat"); continue; }
      const tV = M.mcsVariantaBuna(M.mcsCalcVariante(b15, st, P, { n, prima: card }));
      const tTp = st.dir === "long" || st.dir === "short" ? M.mcsTpRecomandat(M.mcsCalcTinteBot(b15, st, P, { n, prima: card }), st.suma) : null;
      rezultate.push({ bot: b.id, sim, variante: tV, tp: tTp });
      for (const [fel, text] of [["variante", tV], ["tp", tTp]]) {
        const loc = b.id + "|" + fel;
        if (!text || !/^Aș /.test(text)) { delete an[loc]; continue; }   // sfatul a dispărut ⇒ dacă revine, se spune din nou
        const cheie = cheieSfat(b.id, fel, text);
        if (an[loc] === cheie) continue;
        const ok = await d.anunta({ nivel: "info", titlu: "🌙 " + sim + ": " + (fel === "variante" ? "altă setare, pe aceleași drumuri" : "alt TP, pe aceleași drumuri"),
          mesaj: text + " (Monte Carlo peste noapte: " + cate(n, "drum", "drumuri") + " de 7 zile, botul tău " + st.dir + " " + st.levier + "×.)" }, b.id, "noapte-" + fel + "-" + b.id);
        if (ok) { an[loc] = cheie; anuntate++; }
      }
    } catch (e) { d.jurnal("variante noapte " + sim, e && e.message || String(e)); }
  }
  return { boti: activi.length, rezultate, anuntate };
}
