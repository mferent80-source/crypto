// Garda textelor, grupul „risc” (v100.114, revizia v100.113): textele riscului - probabilitățile botului / poziției, luna proastă, toți boții,
// corelația, obiceiurile, concluziile („ce înseamnă pentru tine” + „ce aș face eu”), pornirea față de fișă - cu modulele REALE (RiscLuna, GridPlan).
export function situatiiRisc(pune) {
  const R = globalThis.RiscLuna, G = globalThis.GridPlan;
  const sb = [{ h: 1, n: 692, pePlus: 0.66, mari: 0.14, medie: -0.016 }, { h: 24, n: 76, pePlus: 0.57, mari: 0.29, medie: -0.126 }, { h: 168, n: 15, pePlus: 0.2, mari: 0.67, medie: -0.353 }];
  for (const ore of [2, 30, 200]) pune("risc: botul stă de " + ore + " h", "risc", "textBot", { t: R.textBot(sb, ore) }, [["t", "deCe"]]);
  const sa = [{ h: 1, n: 371, pePlus: 0.54, mari: 0.19, medie: -0.017 }, { h: 20, n: 75, pePlus: 0.51, mari: 0.29, medie: -0.037 }, { h: 90, n: 12, pePlus: 0.17, mari: 0.83, medie: -0.289 }];
  for (const zile of [3, 49, 344]) pune("risc: poziția ținută de " + zile + " zile", "risc", "textActiune", { t: R.textActiune(sa, zile) }, [["t", "deCe"]]);
  const A1 = { k: "A1", nume: "Ai cumpărat la preț mai mic pe o poziție pe minus", cu: 65, fara: 774, medieCu: -0.0389, medieFara: -0.0019, mariCu: 0.323, mariFara: 0.092, stare: "la-limita-rau", banCu: -9006, banFara: 13450 };
  for (const st of ["dovedit-rau", "la-limita-rau"]) pune("risc: medierea · " + st, "risc", "textMediere", { t: R.textMediere(Object.assign({}, A1, { stare: st })) }, [["t", "detalii"]]);
  for (const [sit, mc, u, nn, tau] of [["boți, ritmul tău", { K: 159, S: 161.19, p5: -712.2, pMinus: 0.62 }, "USDT", null, true], ["boți, alt ritm", { K: 60, S: 161.19, p5: -348.1, pMinus: 0.58 }, "USDT", null, false],
    ["acțiuni", { K: 24, S: 5087.67, p5: -5430.6, pMinus: 0.42 }, "lei", ["poziție", "poziții"], true], ["un bot", { K: 1, S: 44.9, p5: -4.1, pMinus: 0.5 }, "USDT", null, true]])
    pune("risc: luna proastă · " + sit, "risc", "textLuna", { t: R.textLuna(mc, u, nn, tau) }, [["t", "deCe"]]);
  for (const [sit, l] of [["un bot", [{ nume: "ZAMA", investit: 44.94, laStop: -2.3, lichPct: 36.6 }]], ["stop pe plus", [{ nume: "A", investit: 50, laStop: 1.2, lichPct: 30 }]],
    ["fără stop + nesocotit", [{ nume: "A", investit: 50, laStop: -3, lichPct: 30 }, { nume: "B", investit: 40, laStop: null, lichPct: 12.5 }, { nume: "C", investit: 40, laStop: null, areStop: true, lichPct: 20 }]], ["niciun stop", [{ nume: "A", investit: 50, laStop: null, lichPct: 30 }]]])
    pune("risc: toți boții · " + sit, "risc", "textTotiBotii", { t: R.textTotiBotii(l) }, [["t", "detalii"]]);
  for (const [sit, c, d] of [["un bot", { monede: ["ZAMA"], M: [[1]], bare: 0 }, null], ["necorelate", { monede: ["ZAMA", "NIL", "TAKE"], M: [[1, 0.11, 0.01], [0.11, 1, 0.09], [0.01, 0.09, 1]], bare: 499 }, null],
    ["corelate", { monede: ["HYPE", "AAVE", "CRV"], M: [[1, 0.39, 0.43], [0.39, 1, 0.53], [0.43, 0.53, 1]], bare: 499 }, null], ["aceeași monedă", { monede: ["ZAMA"], M: [[1]], bare: 0 }, [{ m: "ZAMA", n: 2 }]]])
    pune("risc: corelația · " + sit, "risc", "textCorelatie", { t: R.textCorelatie(c, d) }, [["t", "deCe"]]);
  for (const st of ["dovedit-rau", "dovedit-bun", "la-limita-rau", "la-limita-bun", "nedovedit", "prea puține"]) {
    pune("risc: obiceiul acțiunii · " + st, "risc", "textObicei", { t: R.textObicei(Object.assign({}, A1, { stare: st }), "actiuni") }, [["t", "detalii"]]);
    pune("risc: obiceiul botului · " + st, "risc", "textObicei", { t: R.textObicei({ k: "O1", nume: "Stop pus", cu: 397, fara: 1338, medieCu: 0.0009, medieFara: -0.0068, mariCu: 0.154, mariFara: 0.109, stare: st.replace("puține", "puțini") }, "boti") }, [["t", "detalii"]]);
  }
  // concluziile, pe forma raportului real (06.10) și pe una cu obiceiuri dovedite la boți
  const desc = { n: 1735, pePlus: 0.61, bani: { grile: 4287, comisioane: -2388, funding: -177, realizat: -2520 }, comisioaneLaS: -1725, grileLaS: 2500, realizatLaS: -1500, coada: { prag: -0.049, n: 174, laS: -5555, restLaS: 4139, monede: [] },
    durate: [{ de: 0, pana: 0.25, n: 635, laS: 150 }, { de: 0.25, pana: 1, n: 408, laS: 250 }, { de: 1, pana: 4, n: 317, laS: 60 }, { de: 4, pana: 24, n: 299, laS: -330 }, { de: 24, pana: 72, n: 46, laS: -610 }, { de: 72, pana: null, n: 30, laS: -930 }], luni: [] };
  const obB = (st) => [["O2", "Marjă adăugată pe drum"], ["O6", "Pornit la ≤ 30 min după un bot pe minus"], ["O5", "Pornit în partea grea a benzii"]].map(([k, nume]) => ({ k, nume, cu: 140, fara: 1595, medieCu: -0.03, medieFara: -0.003, mariCu: 0.14, mariFara: 0.12, stare: st }));
  for (const [sit, comp] of [["fără obiceiuri dovedite", []], ["obiceiuri dovedite rele", obB("dovedit-rau")], ["la limită", obB("la-limita-rau")], ["bune", obB("dovedit-bun")]]) {
    const actiuni = { desc: { comisioane: 6367, rezultat: sit === "bune" ? -800 : 4659, oficial: 11026, mari: { n: 92, lei: -24422, restLei: 28866 } }, comportament: [Object.assign({}, A1, { stare: sit === "bune" ? "dovedit-bun" : "la-limita-rau" }), { k: "A3", nume: "Episod scurt", cu: 612, fara: 227, medieCu: 0.0058, medieFara: -0.0333, mariCu: 0.05, mariFara: 0.26, stare: "dovedit-bun" }] };
    const c = R.concluzii({ boti: { ritm: { K: 159, S: 161.19 }, desc, comportament: comp }, actiuni });
    for (const x of c.boti.concat(c.actiuni)) pune("risc: concluzie · " + sit + " · " + x.titlu, "risc", "concluzie", x, [["titlu", "titlu"], ["text", "detalii"], ["faCe", "faCe"]]);
  }
  // pornirea față de fișă (Tabloul): ZAMA 06.10 - ÎNGUST cu levierul 3× (fișa 5×), recomanda LARG
  for (const [sit, fb] of [["ZAMA, alt levier", { k: "ingust", rec: "larg", stop: 60, n: 109, oreTipic: 4.25, levierFisa: 5, levierBot: 3 }], ["LARG ca recomandat", { k: "larg", rec: "larg", stop: 32, n: 109, oreTipic: 32.25, levierFisa: 1, levierBot: 1 }],
    ["fișa zicea să aștepți", { k: "ingust", rec: "asteapta", stop: 77, n: 109, oreTipic: 0.4 }], ["altă bandă", { k: null, rec: "larg" }]])
    pune("risc: pornit ca · " + sit, "risc", "textPornit", { t: G.textPornit(fb, "12:48") }, [["t", "detalii"]]);
}
