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
  if (/^Aș ține/.test(s)) return "tine";
  if (/^(Aș opri|L-aș opri|N-aș porni|Reluarea arată)/.test(s)) return "opreste";
  if (/^Nu se potrivește/.test(s)) return "plan";
  if (/^Stopul e în zgomot/.test(s)) return "zgomot";
  if (/^O aruncare de ban/.test(s)) return "ban";
  return "alt";
}
const NUME_CAT = { tine: "aș ține", opreste: "aș opri", plan: "nu se potrivește cu planul", zgomot: "stopul e în zgomot", ban: "o aruncare de ban", alt: "altfel" };
function ora(t) { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
const nr = (v) => (typeof v === "number" && isFinite(v) ? v : null);

export async function turaMonteCarloBot(d) {
  const acum = d.acum || Date.now(), st = d.stare || {}, out = { boti: 0, simulati: 0, anuntate: 0, erori: 0 };
  st.boti = st.boti && typeof st.boti === "object" ? st.boti : {};
  const activi = (d.boti || []).filter((b) => b && b.id != null && b.activ !== false && Number(b.gridJos) > 0 && Number(b.gridSus) > Number(b.gridJos));
  const ids = new Set(activi.map((b) => String(b.id)));
  Object.keys(st.boti).forEach((k) => { if (!ids.has(k)) delete st.boti[k]; });   // boții închiși ies din stare (nu rămân „de când” fantomă)
  for (const b of activi) {
    out.boti++;
    try {
      const simbol = b.simbolPionex || String(b.baza || "").replace(/\.PERP$/, "") + "_USDT_PERP", nume = String(b.baza || simbol).replace(/\.PERP$/, "").replace(/_USDT_PERP$/, "");
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
      const prev = st.boti[String(b.id)];
      if (prev && prev.cat && prev.cat !== cat) {
        const ok = await d.anunta({ nivel: cat === "opreste" || cat === "plan" ? "atentie" : "info",
          titlu: "🎰 " + nume + ": Monte Carlo zice acum «" + (NUME_CAT[cat] || cat) + "» (era «" + (NUME_CAT[prev.cat] || prev.cat) + "» de la " + ora(prev.la) + ")",
          mesaj: text + " · șanse pe drumuri ca ultimele 14 zile, nu o predicție" }, b.id, "mc-verdict-" + cat);
        if (ok) out.anuntate++;
      }
      st.boti[String(b.id)] = { cat, text, la: prev && prev.cat === cat ? prev.la : acum, ultima: acum };
    } catch (e) { out.erori++; if (d.jurnal) d.jurnal("monte carlo bot", b.id, e && e.message || e); }
  }
  return out;
}
