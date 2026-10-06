// Garda textelor, grupul „sugestii-act” (v100.119, pagina Sugestii): istoricul fiecărei reguli noi de acțiuni (SugestiiActiuni.textDovada),
// în toate stările verdictului și cu zero cazuri / fără istoric - cu modulul REAL. (Grupul „sugestii” e al listelor de monede, v100.85.)
export function situatiiSugestiiAct(pune) {
  const SA = globalThis.SugestiiActiuni;
  const d = (stare, n, et) => ({ n, pePlus: 0.51, medie: 0.004, baza: { n: 5000, pePlus: 0.5, medie: 0.001 }, eticheta: et, verdict: { stare } });
  for (const k of ["urcare", "revers", "gap"]) {
    for (const st of ["dovedit-bun", "dovedit-rau", "la-limita-bun", "la-limita-rau", "nedovedit", "prea puține"]) pune("sugestii: istoricul · " + k + " · " + st, "sugestii-act", "textDovada", { t: SA.textDovada(d(st, 346, "cam la fel"), k) }, [["t", "deCe"]]);
    pune("sugestii: istoricul · " + k + " · niciun caz", "sugestii-act", "textDovada", { t: SA.textDovada(d("prea puține", 0, null), k) }, [["t", "deCe"]]);
    pune("sugestii: istoricul · " + k + " · un caz", "sugestii-act", "textDovada", { t: SA.textDovada(d("prea puține", 1, "mai bine"), k) }, [["t", "deCe"]]);
  }
  pune("sugestii: istoricul · fără raport", "sugestii-act", "textDovada", { t: SA.textDovada(null, "urcare") }, [["t", "deCe"]]);
}
