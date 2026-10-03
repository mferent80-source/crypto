// Garda textelor, grupul „sugestii” (v100.85, reveniri + short): frazele cu istoricul (Reveniri.textDovada / textBoti) pe toate formele
// etichetei (mai bine / mai slab / cam la fel), puține cazuri, niciun caz, fără istoric; supraviețuitorii; rândul urmăririi - cu modulul REAL.
export function situatiiSugestii(pune) {
  const R = globalThis.Reveniri;
  const baza = { n: 15119, pePlus: 0.45, medie: 0.01 };
  const D = { "mai bine": { n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, mediana: 0.02, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false },
    "mai slab": { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza, eticheta: "mai slab", putine: false },
    "cam la fel": { n: 512, saptamani: 46, pePlus: 0.55, medie: -0.003, mediana: 0.01, baza: { n: 15119, pePlus: 0.55, medie: -0.01 }, eticheta: "cam la fel", putine: false },
    "puține cazuri": { n: 66, saptamani: 18, pePlus: 0.53, medie: 0.002, mediana: 0.003, baza, eticheta: "mai slab", putine: true },
    "niciun caz": { n: 0, saptamani: 0, pePlus: null, medie: null, mediana: null, baza, eticheta: null, putine: true }, "fără istoric": null };
  for (const [sit, d] of Object.entries(D)) for (const cum of ["monede", "short", "actiuni"]) pune("sugestii: " + cum + " · " + sit, "sugestii", "textDovada", { t: R.textDovada(d, cum) }, [["t", "deCe"]]);
  const B = { n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } };
  for (const cum of ["monede", "short"]) {
    pune("sugestii: boții · " + cum, "sugestii", "textBoti", { t: R.textBoti(B, cum) }, [["t", "deCe"]]);
    pune("sugestii: boții · " + cum + " · niciunul", "sugestii", "textBoti", { t: R.textBoti({ n: 0, pePlus: null, mediana: null, reper: B.reper }, cum) }, [["t", "deCe"]]);
  }
  pune("sugestii: supraviețuitorii", "sugestii", "TEXT_SUPRAVIETUITORI", { t: R.TEXT_SUPRAVIETUITORI }, [["t", "deCe"]]);
  const ACUM = Date.UTC(2026, 9, 20, 12), ist = [{ zi: "2026-10-03", simbol: "LIT_USDT_PERP", pret: 1 }, { zi: "2026-10-04", simbol: "PONS_USDT_PERP", pret: 2 }];
  for (const [sit, l] of [["niciuna", []], ["două", ist]]) pune("sugestii: urmărirea · " + sit, "sugestii", "urmarire", R.urmarire(l, { LIT_USDT_PERP: 1.1, PONS_USDT_PERP: 1.9 }, ACUM, { zile: 7, cost: 0.001 }), [["text", "deCe"]]);
  const multe = Array.from({ length: 40 }, (_, i) => ({ zi: "2026-09-0" + (1 + (i % 9)), simbol: "LIT_USDT_PERP", pret: 1 }));
  pune("sugestii: urmărirea · patruzeci", "sugestii", "urmarire", R.urmarire(multe, { LIT_USDT_PERP: 1.05 }, ACUM, { zile: 7, cost: 0.001 }), [["text", "deCe"]]);
}
