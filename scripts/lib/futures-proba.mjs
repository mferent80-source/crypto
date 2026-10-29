// v100.266 / colector v101.142 (F7, 29.10, el: „fa ideile”): proba pe date noi a etichetei „înghesuit” de pe pagina Futures.
// O dată pe oră: pentru fiecare monedă din univers (cele 20 măsurate + boții) cere /api/market?type=futures (aceleași date ca pagina),
// scrie un rând [ora, simbol, markPrice, context C/K/B, funding la 8 h, percentila raportului] în data/futures-jurnal.jsonl, ține 120 de zile,
// apoi trimite rezumatul (FuturesCitire.evalForward - protocolul e scris acolo) la /api/istoric-bot?action=futuresProba, unde îl citește pagina.
import fs from "node:fs";

const PASTRARE_MS = 120 * 86400000;

export async function turaFuturesProba({ F, cere, trimite, jurnal = () => {}, fisier, acum = Date.now(), univers = [] }) {
  const ora = Math.floor(acum / 3600000) * 3600000, randuri = [];
  for (const s of univers) {
    let d = null;
    try { d = await cere("/api/market?type=futures&symbol=" + encodeURIComponent(s)); } catch (e) { jurnal("futures proba", s, e.message); continue; }
    if (!d || d.faraContract || !(Number(d.markPrice) > 0)) continue;
    const ag = F.aglomerare({ funding: d.funding, ore: d.fundingIntervalHours, ls: d.longShort, lsIst: d.lsIst });
    if (ag.context == null) continue;
    // conflictul (funding și raport opuse) e „echilibrat” pentru probă, ca pentru verdict
    const cod = ag.conflict ? "B" : ag.context === "CROWDED" ? "C" : ag.context === "CONTRARIAN +" ? "K" : "B";
    randuri.push([ora, s, Number(d.markPrice), cod, ag.fr8 == null ? null : Number(Number(ag.fr8).toFixed(8)), ag.lsPct == null ? null : Math.round(ag.lsPct * 10) / 10]);
  }
  let toate = [];
  try { toate = fs.readFileSync(fisier, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Array.isArray); } catch { toate = []; }
  // rândurile peste 120 de zile ies; aceeași (monedă, oră) se scrie o singură dată (o tură repetată în aceeași oră nu dublează)
  const prag = acum - PASTRARE_MS, chei = new Set();
  toate = toate.filter((r) => Number(r[0]) >= prag).filter((r) => { const k = r[1] + "|" + r[0]; if (chei.has(k)) return false; chei.add(k); return true; });
  for (const r of randuri) { const k = r[1] + "|" + r[0]; if (!chei.has(k)) { chei.add(k); toate.push(r); } }
  fs.writeFileSync(fisier + ".tmp", toate.map((r) => JSON.stringify(r)).join("\n") + (toate.length ? "\n" : ""));
  fs.renameSync(fisier + ".tmp", fisier);
  const rezumat = F.evalForward(toate, acum);
  delete rezumat.zileC; delete rezumat.zileK;   // pe server pleacă doar rezumatul
  try { await trimite("/api/istoric-bot?action=futuresProba", { la: acum, rezumat }); } catch (e) { jurnal("futures proba: rezumatul n-a plecat", e.message); }
  return { randuri: randuri.length, total: toate.length, rezumat };
}
