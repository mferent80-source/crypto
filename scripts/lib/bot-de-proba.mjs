// Botul de probă pentru probele Tabloului (v100.339, auditul din 13.11): un bot grid BRUT, în forma Pionex, trecut prin normalizarea ADEVĂRATĂ
// a serverului (`normalizeaza` din functions/api/bot-orders.js) - nu printr-o copie a formulelor ei. O schimbare în normalizare pică probele.
// Cifrele sunt inventate (grid 65–76, 23 de linii, 0,14 pe nivel, 76 USDT, 3×): nu sunt ale niciunui cont.
import { normalizeaza } from "../../functions/api/bot-orders.js";

export const GRID = { jos: 65, sus: 76, linii: 23, pas: 0.5, lot: 0.14, pornire: 71, bani: 76, levier: 3 };
// poziția unui grid după un drum monoton de la prețul de pornire la p (loturi întregi): short vinde la urcare, long cumpără la coborâre
export function stareGrid(dir, p, g = GRID) {
  const sh = dir === "short", n0 = sh ? Math.round((g.pornire - g.jos) / g.pas) : Math.round((g.sus - g.pornire) / g.pas);
  let q = n0 * g.lot, cost = q * g.pornire, real = 0, fee = -(q * g.pornire * 0.0005), grid = 0, perechi = 0;
  const contra = sh ? p > g.pornire : p < g.pornire, semn = sh ? 1 : -1;
  if (contra) for (let L = g.pornire + semn * g.pas; sh ? L <= p + 1e-9 && L <= g.sus : L >= p - 1e-9 && L >= g.jos; L += semn * g.pas) { q += g.lot; cost += g.lot * L; fee -= g.lot * L * 0.0002; }
  else for (let L = g.pornire - semn * g.pas; sh ? L >= p - 1e-9 && L >= g.jos : L <= p + 1e-9 && L <= g.sus; L -= semn * g.pas) { const pd = cost / q; real += g.lot * Math.abs(pd - L); cost -= g.lot * pd; q -= g.lot; fee -= g.lot * L * 0.0002; grid += g.lot * g.pas; perechi++; }
  q = Math.max(0, q);
  return { q, pd: q > 1e-9 ? cost / q : 0, real, fee, grid, perechi };
}
// o = { stare, fund, g24, pornitLa, acum, x: câmpuri brute în plus (lossStop, profitStop…), baza }
export function botBrut(dir, pGrid, o = {}) {
  const g = o.grid || GRID, s = o.stare || stareGrid(dir === "long" ? "long" : "short", pGrid, g), fund = o.fund ?? 0, acum = o.acum ?? Date.UTC(2026, 10, 13, 12);
  const x = Object.assign({
    bottom: String(g.jos), top: String(g.sus), row: String(g.linii), perVolume: String(g.lot), gridType: "arithmetic", trend: dir, leverage: String(g.levier),
    usdtInvestment: String(g.bani), initPrice: String(g.pornire), status: "running",
    estimateLiquidationPriceDown: dir === "long" ? "48.1" : "0", estimateLiquidationPriceUp: dir === "short" ? "95.2" : "0",
    profitStop: "0", lossStop: "0", stopLossEnabled: false, stopProfitEnabled: false,
    position: String(dir === "short" ? -s.q : s.q), positionOpenPrice: String(s.pd), marginBalance: String(g.bani + s.real + s.fee + fund),
    totalRealizedProfit: String(s.real), totalFee: String(s.fee), totalFundingFee: String(fund), gridProfit: String(s.grid), gridProfit24h: String(o.g24 ?? s.grid), trx24h: "4", exchangeOrderPairedCount: String(s.perechi),
  }, o.x);
  return { strategyId: o.id || "proba-1", base: o.baza || "MONEDA.PERP", quote: "USDT", status: "open", createTime: o.pornitLa ?? acum - 5 * 3600000, buOrderData: x };
}
// botul normalizat, cu prețul de acum `pret` (poate fi dincolo de grid) și starea gridului de la `pGrid`
export function botDeProba(dir, pGrid, pret, o = {}) {
  const raw = botBrut(dir, pGrid, o), sim = raw.base.endsWith(".PERP") ? raw.base.slice(0, -5) + "_" + raw.quote + "_PERP" : raw.base + "_" + raw.quote;
  return normalizeaza(raw, { [sim]: pret }, null);
}
