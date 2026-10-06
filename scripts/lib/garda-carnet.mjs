// Garda textelor, grupul „carnet” (v100.117, I-561): textele Carnetului fișei - alegerea ÎNGUST / LARG, „aș aștepta”, stopul promis,
// verdictul „pornește / aștept”, rândul de sub fișă, concluzia - cu modulul REAL (Carnet), pe toate stările verdictului.
export function situatiiCarnet(pune) {
  const C = globalThis.Carnet;
  const v = (stare, dif, cu, fara) => ({ stare, dif, cu, fara, medieCu: 0.004 + dif, medieFara: 0.004, monede: 18 });
  for (const st of ["dovedit-bun", "dovedit-rau", "la-limita-bun", "la-limita-rau", "nedovedit"]) {
    pune("carnet: alegerea · " + st, "carnet", "textAlegere", { t: C.textAlegere(v(st, /rau/.test(st) ? -0.0123 : 0.0187, 412, 412)) }, [["t", "deCe"]]);
    pune("carnet: aștept · " + st, "carnet", "textAsteapta", { t: C.textAsteapta(v(st, /rau/.test(st) ? -0.021 : 0.008, 64, 760)) }, [["t", "deCe"]]);
    pune("carnet: rândul sub fișă · " + st, "carnet", "randSubFisa", { t: C.randSubFisa({ la: 1, rejoc: { intrebari: { alegere: v(st, 0.0187, 412, 412) } } }) }, [["t", "deCe"]]);
    pune("carnet: concluzia · " + st, "carnet", "concluzie", { t: C.concluzie({ alegere: { stare: st } }) }, [["t", "faCe"]]);
  }
  pune("carnet: alegerea · prea puține", "carnet", "textAlegere", { t: C.textAlegere(v("prea puține", 0, 12, 12)) }, [["t", "deCe"]]);
  pune("carnet: aștept · prea puține", "carnet", "textAsteapta", { t: C.textAsteapta(v("prea puține", 0, 1, 40)) }, [["t", "deCe"]]);
  pune("carnet: rândul sub fișă · prea puține", "carnet", "randSubFisa", { t: C.randSubFisa({ la: 1, rejoc: { intrebari: { alegere: v("prea puține", 0, 3, 3) } } }) }, [["t", "deCe"]]);
  for (const k of [{ cos: "sub 30%", n: 412, promis: 0.21, venit: 0.26, putine: false }, { cos: "30–50%", n: 12, promis: 0.41, venit: 0.5, putine: true }, { cos: "peste 50%", n: 0, promis: null, venit: null, putine: true }, { cos: "peste 50%", n: 1, promis: 0.6, venit: 1, putine: true }])
    pune("carnet: stopul promis · " + k.cos + " · " + k.n, "carnet", "textCalibrare", { t: C.textCalibrare(k) }, [["t", "deCe"]]);
  for (const f of [{ n: 0, pornit: { n: 0 }, asteptat: { n: 0 } }, { n: 1, pornit: { n: 1, medie: 0.01 }, asteptat: { n: 0 } }, { n: 46, pornit: { n: 31, pePlus: 0.58, medie: 0.0123 }, asteptat: { n: 15, pePlus: 0.33, medie: -0.021 } }])
    pune("carnet: pornește / aștept · " + f.n, "carnet", "textVerdictFisa", { t: C.textVerdictFisa(f) }, [["t", "deCe"]]);
}
