// M5b (I-877): reluarea pe date NOI a efectului „benzi Bollinger largi ⇒ drum mai lung în următoarele 24 h” (testul B din M5), pe 1h.
// Regulile sunt scrise în docs/cercetare/2026-11-13-tablou-acuratete.md („M5b — reluarea efectului B pe date noi”) pe 14.11.2026, înaintea
// oricărei bare noi. Aici e doar judecata: aceleași blocuri de 5 zile și același test ca în M5 (scripts/lib/statistica-blocuri.mjs), pe
// PRIMELE `blocuri` blocuri ÎNCHEIATE și valide de după tăietură - oricând s-ar rula, eșantionul e același, deci nu există „încă o privire”.
import { testBlocuri } from "./statistica-blocuri.mjs";

export const TAIETURA_M5 = 1794596400000;   // capătul datelor din M5 (--pana de atunci, 13.11.2026 19:00 UTC): M5b folosește doar ce vine după
// blocuri: câte blocuri de 5 zile intră; alfa: pragul după regula casei (toate testele cu verdict de până acum: 32 până la M5, acesta, două
// la jurnalul notei ⇒ 0,05 ÷ 70, într-o parte); minim: raportul pe bloc de la care merită spus pe pagină; minClasa: eșantioane pe clasă și bloc
export const M5B = { blocuri: 30, zilePeBloc: 5, alfa: 0.05 / 70, minim: 1.2, minClasa: 20 };

const nrZi = (z) => Math.round(Date.parse(z + "T00:00:00Z") / 86400000), ziDin = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
// prima zi UTC plină de după tăietură (ziua în care se ÎNCHIDE bara etichetată)
export function primaZiNoua(taietura = TAIETURA_M5) { return ziDin(Math.floor(taietura / 86400000) + 1); }

// zile = { "AAAA-LL-ZZ": { rid: { n, s }, joasa: { n, s } } } (drumul următoarelor 24 h, adunat pe ziua etichetei, după benzi largi / strânse)
// Blocurile se iau la rând de la prima zi nouă și doar cele ÎNCHEIATE: ultima zi a blocului trebuie să fie în urma celei mai noi zile cu
// eșantioane (un eșantion există doar când și urmarea lui de 24 h e în date, deci o zi mai nouă arată că blocul e întreg). Un bloc încheiat
// în care o clasă are sub `minClasa` eșantioane se sare.
// ⇒ { gata: false, blocuri, trebuie, primaZi } cât nu sunt destule; altfel { gata: true, blocuri, primaZi, panaLa, raport, t, p, verdict }
export function judecaM5b(zile, o = {}) {
  const cfg = Object.assign({}, M5B, o), primaZi = primaZiNoua(o.taietura == null ? TAIETURA_M5 : o.taietura), z0 = nrZi(primaZi), Z = zile && typeof zile === "object" ? zile : {};
  const are = (x) => !!x && ((x.rid && x.rid.n > 0) || (x.joasa && x.joasa.n > 0)), noi = Object.keys(Z).filter((d) => d >= primaZi && are(Z[d])).sort();   /* zilele dinaintea tăieturii nu intră, oricâte ar primi */
  const maxZi = noi.length ? nrZi(noi[noi.length - 1]) : -Infinity, valori = []; let panaLa = null;
  for (let bl = 0; valori.length < cfg.blocuri; bl++) { const prima = z0 + bl * cfg.zilePeBloc, ultima = prima + cfg.zilePeBloc - 1; if (!(ultima < maxZi)) break;
    const a = { n: 0, s: 0 }, c = { n: 0, s: 0 }; for (let d = prima; d <= ultima; d++) { const x = Z[ziDin(d)]; if (!x) continue; if (x.rid) { a.n += x.rid.n; a.s += x.rid.s; } if (x.joasa) { c.n += x.joasa.n; c.s += x.joasa.s; } }
    if (a.n < cfg.minClasa || c.n < cfg.minClasa || !(a.s > 0) || !(c.s > 0)) continue;
    valori.push(Math.log((a.s / a.n) / (c.s / c.n))); panaLa = ziDin(ultima); }
  if (valori.length < cfg.blocuri) return { gata: false, blocuri: valori.length, trebuie: cfg.blocuri, primaZi };
  const T = testBlocuri(valori), raport = Math.exp(T.medie);
  return { gata: true, blocuri: cfg.blocuri, primaZi, panaLa, raport, t: T.t, p: T.p, verdict: Number.isFinite(T.p) && T.p <= cfg.alfa && raport >= cfg.minim ? "DOVEDIT" : "NEDOVEDIT" };
}
