// Unealta de mana: "Daca ascultai de Radar" pe botii inchisi REALI (de acasa). Nu intra in npm test.
//   node scripts/daca-ascultai-real.mjs
// Botii vin de la serverul local (/api/bot-orders?status=finished, cu APP_API_TOKEN din .dev.vars);
// lumanarile direct de la Pionex, DOAR de dinainte de pornirea fiecarui bot (endTime + taie).
import fs from "node:fs";
const src = (f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8");
const { GC, GP, JT, CF } = new Function(["grid-calcul.js", "grid-proba.js", "jurnal-trade.js", "contrafactual.js"].map(src).join("\n") + "; return { GC: GridCalcul, GP: GridProba, JT: JurnalTrade, CF: Contrafactual };")();
const vars = Object.fromEntries(fs.readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await (await fetch("http://127.0.0.1:8788/api/bot-orders?status=finished&limit=100", { headers: { authorization: "Bearer " + vars.APP_API_TOKEN } })).json();
const lista = JT.din((b.bots || []).map((x) => x.brut || x));
async function kl(simbol, iv, lim, end) { const j = await (await fetch(`https://api.pionex.com/api/v1/market/klines?symbol=${simbol}&interval=${iv}&limit=${lim}&endTime=${end}`)).json(); if (!j.result) throw new Error(j.message); await pauza(350); return j.data.klines; }
const Q = 15 * 60000, P = GC.procent, out = [];
for (const t of lista) {
  const s = t.moneda + "_USDT_PERP";
  let r15 = [], end = t.pornit - 1;
  for (let p = 0; p < 6; p++) { const k = await kl(s, "15M", 500, end); r15 = r15.concat(k); if (k.length < 500) break; end = Math.min(...k.map((x) => x.time)) - 1; }
  const r4 = await kl(s, "4H", 300, t.pornit - 1), r1 = await kl(s, "1D", 200, t.pornit - 1);
  // bara "in formare" de la pornire iese; bare() scoate apoi si ultima, deci pun una falsa la coada ca sa nu pierd o bara reala
  const c15 = CF.taie(r15, t.pornit, Q), c4 = CF.taie(r4, t.pornit, 4 * 3600000), c1 = CF.taie(r1, t.pornit, 86400000);
  const coada = (a, d) => a.concat([{ time: t.pornit + d, open: "1", high: "1", low: "1", close: "1" }]);
  const f = GP.fisa({ simbol: s, pret: t.pretInit, b15: GC.bare(coada(c15, 1)), b4h: GC.bare(coada(c4, 1)), b1d: GC.bare(coada(c1, 1)), suma: t.investit || 100, H: 2, dir: null, levier: null, minNotional: null });
  const z = CF.zice(f && !f.eroare ? f : null, t);
  out.push({ t, z });
  console.log(`${t.moneda.padEnd(5)} ${t.dir.padEnd(6)} ${new Date(t.pornit).toISOString().slice(5, 16)} real ${(t.rezultat >= 0 ? "+" : "") + t.rezultat.toFixed(2).padStart(6)} · Radarul: ${z.nivel.toUpperCase().padEnd(9)} ${z.motive.join(" | ")}`);
}
const r = CF.rezumat(out);
console.log(`\nREAL pe toti: ${r.real.toFixed(2)} USDT (${r.n} boti; judecati ${r.judecate}, fara date ${r.faraDate})`);
console.log(`DACA ASCULTAI (doar 🟢): ${r.doarVerde.toFixed(2)} USDT pe ${r.nVerde} boti · (🟢+🟡): ${r.verdeGalben.toFixed(2)} pe ${r.nVerde + r.nGalben}`);
console.log(`Blocati ${r.nBlocate}: ar fi salvat ${r.blocateSalvat.toFixed(2)} din pierderi, ar fi ratat ${r.blocateRatat.toFixed(2)} din castiguri`);
fs.writeFileSync(new URL("../data/daca-ascultai.json", import.meta.url), JSON.stringify({ la: Date.now(), rezumat: r, boti: out.map((x) => ({ id: x.t.id, moneda: x.t.moneda, dir: x.t.dir, pornit: x.t.pornit, rezultat: x.t.rezultat, zice: x.z })) }, null, 1));
