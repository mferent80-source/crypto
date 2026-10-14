// Ponderile pozițiilor Trading 212 în cont (v101.116, auditul sever 🔵7): plafonul de 20 %, poza paginii alerts, rândul de dimineață.
// Înainte se aduna `quantity × currentPrice` în moneda FIECĂRUI instrument ($ + € + pence) - o poziție la Londra (în pence) ieșea de 100 de ori
// mai grea și dădea o alertă de concentrare falsă. Acum: pe aceeași monedă ca înainte; cu monede amestecate nu se socotește nimic (nicio cifră
// inventată) și apelantul spune asta în jurnal. Pondere = valoarea poziției / valoarea tuturor pozițiilor × banii investiți / contul întreg.
// poz = pozițiile T212 ({ ticker, quantity, currentPrice }), cash = { total, free } (contul), monedaDe(ticker) = ContIntreg.monedaTicker.
export function ponderiT212(poz, cash, monedaDe) {
  const l = (Array.isArray(poz) ? poz : []).filter((x) => x && x.quantity > 0 && x.currentPrice > 0);
  const monede = [...new Set(l.map((x) => String((monedaDe && monedaDe(x.ticker)) || "?")))].sort();
  if (monede.length > 1) return { pe: {}, amestec: monede };
  const inv = cash && cash.total > 0 && cash.free >= 0 ? cash.total - cash.free : null;
  let tot = 0; for (const x of l) tot += x.quantity * x.currentPrice;
  const pe = {};
  if (inv !== null && tot > 0) for (const x of l) pe[x.ticker] = x.quantity * x.currentPrice / tot * inv / cash.total;
  return { pe, amestec: null };
}
