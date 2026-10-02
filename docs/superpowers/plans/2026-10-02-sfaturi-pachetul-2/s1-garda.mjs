// Sarcina 1 · scripts/garda-texte.mjs: pachetul 2 intra in garda, in modul „raport” (strict il fac sarcinile 2–5):
//   sfaturi    - Sfaturi.sfaturi REAL (ideea 2 din pachetul 1), pe botii lui cu buOrderData Pionex si lumanari de 4 h
//   alerte     - titlul/textul sfatului „pericol” (vin din regulile alertelor, alerte.js = pachetul 3; raman „raport”)
//   todo       - randurile proprii din „Ce ai de făcut acum” (planul lipsa, „Nimic urgent”) + ritmul de recuperare
//   consiliu-2 - Consilierul cu sfaturile reale (M7: primul motiv venit din sfaturi.js) + verdictul vechi al Tabloului (ideea 3)
//   server     - avertismentele serverului (functions/_shared/avertismente.js)
// + `--mod=a,b` la `--inventar`: doar textele grupurilor date (inventarul pachetului).
export default [
  [`//   node scripts/garda-texte.mjs --inventar <fisier>  -> si lista textelor (situatie, sursa, lungime, text) in Markdown
`, `//   node scripts/garda-texte.mjs --inventar <fisier>  -> si lista textelor (situatie, sursa, lungime, text) in Markdown
//   ... --inventar <fisier> --mod=sfaturi,todo        -> doar grupurile date (inventarul unui pachet)
`],
  [`import { mesajDiscord } from "./lib/canal-discord.mjs";
`, `import { mesajDiscord } from "./lib/canal-discord.mjs";
import { avertismenteBot } from "../functions/_shared/avertismente.js";
`],
  [`for (const f of ["text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js", "consiliu.js"]) vm.runInThisContext(`,
   `for (const f of ["text-ro.js", "grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js"]) vm.runInThisContext(`],
  [`const { GridCalcul: G, SemnaleBot: S, TabloExtra: T, Consiliu: C } = globalThis;
`, `const { GridCalcul: G, SemnaleBot: S, TabloExtra: T, Consiliu: C, Sfaturi: SF, Directie: DR } = globalThis;
`],
  [`// pachetele trecute pe „strict” - unul cate unul, la terminarea lui (semafor + cartele = semnale-bot.js, consiliu = consiliu.js)
`, `// pachetele trecute pe „strict” - unul cate unul, la terminarea lui (semafor + cartele = semnale-bot.js, consiliu = consiliu.js;
// pachetul 2: sfaturi = sfaturi.js, consiliu-2 = Consilierul cu sfaturile reale, todo = „Ce ai de făcut acum”, server = avertismentele;
// „alerte” = titlurile/textele din regulile alertelor (alerte.js), strict la pachetul 3)
`],
  [`const PLAN_L = { plus: 5.5, minus: 15.7, afaraOre: 12 };
`, `const PLAN_L = { plus: 5.5, minus: 15.7, afaraOre: 12 };
// v100.62 (pachetul 2): sfaturile REALE cer buOrderData-ul Pionex (scenariul pana la marginea de jos) si lumanari de 4 h (cat de des a coborat atat)
const cuBrut = (b, o) => ({ ...b, gridProfitBrut: 3.2, pornitLa: T0 - 4 * 86400000, pretLichidare: b.pretLichidare ?? +(b.pretCurent * 0.8).toFixed(4),
  brut: { buOrderData: Object.assign({ bottom: String(b.gridJos), top: String(b.gridSus), row: 7, perVolume: "40", position: "160", positionOpenPrice: String(+(b.pretCurent * 1.03).toFixed(4)),
    marginBalance: String(+(b.investit * 0.9).toFixed(2)), trend: b.directie, gridProfit24h: "0.80", trx24h: 30, closedExchangeOrderCount: 120 }, o || {}) } });
const K4 = (p, amp) => Array.from({ length: 300 }, (_, i) => { const c = p * (1 + amp * Math.sin(i / 5)); return { time: T0 - (300 - i) * 4 * ORA, open: c, high: c * 1.01, low: c * 0.99, close: c }; });
// fisa cu linistea intreaga (cum o da GridProba.fisa: zilele de liniste, cazurile, intervalul de incredere)
const fisaS = (o) => fisa(Object.assign({ liniste: { linisteAcum: true, zileLiniste: 0.4, n: 13, k: 3, p: 3 / 13, ic: [0.08, 0.5], suficient: true, H: 2 } }, o || {}));
// directia pe 4 ore si 1 zi, ca Directie.analizeaza (formare = bara de 4 ore care se face acum)
const REZ = (d4, d1, formare) => [{ tf: "4H", eticheta: "4 ore", dir: d4, fata: { ton: d4 === "coboara" ? "rau" : "bine" }, formare: formare || null }, { tf: "1D", eticheta: "1 zi", dir: d1, fata: { ton: d1 === "coboara" ? "rau" : "bine" } }];
const MOTIVE_JOS = ["4h: EMA20 sub EMA50, EMA50 coboară", "1z: EMA20 sub EMA50, EMA50 coboară", "structura 4h: maxime și minime tot mai jos"];
`],
  [`  pune("deciziile tale", "consiliu", "consiliu.socotealaDecizii", C.socotealaDecizii(Array.from({ length: 40 }, (_, i) => ({ r: i % 2 ? 1 : -1, urmat: i % 3 === 0 }))), [["text", "deCe"]]);
  return out;
}
`, `  pune("deciziile tale", "consiliu", "consiliu.socotealaDecizii", C.socotealaDecizii(Array.from({ length: 40 }, (_, i) => ({ r: i % 2 ? 1 : -1, urmat: i % 3 === 0 }))), [["text", "deCe"]]);

  // ---- pachetul 2 ----
  // sfaturile REALE (ideea 2 din pachetul 1): Sfaturi.intrare + Sfaturi.sfaturi, ca pe Tablou si in colector; „pericol” are titlul si
  // textul din regulile alertelor (grupul „alerte”, pachetul 3) - aici se judeca doar actiunea lui
  const sf = (sit, bot, o = {}) => {
    const x = SF.intrare({ bot, k4: o.k4 === undefined ? K4(bot.pretCurent, 0.06) : o.k4, fata4h: o.fata4h, dir4h: o.dir4h, funding: o.funding ?? null,
      fisa: o.fisa === undefined ? fisaS() : o.fisa, rezumat: o.rezumat || null, acum: T0 });
    Object.assign(x, o.peste || {});
    const l = SF.sfaturi(x);
    for (const s of l) {
      if (s.cod === "pericol") { pune(sit, "alerte", "sfat.pericol." + s.tip, s, [["titlu", "titlu"], ["text", "deCe"]]); pune(sit, "sfaturi", "sfat.pericol." + s.tip, s, [["faCe", "faCe"]]); }
      else pune(sit, "sfaturi", "sfat." + s.cod, s, [["titlu", "titlu"], ["text", "deCe"], ["faCe", "faCe"], ["sursa", "detalii"], ["deCe", "detalii"]]);
    }
    return l;
  };
  const crvM = cuBrut(CRV({ pretCurent: 0.3858, pretLichidare: 0.3383, distantaLichidarePct: 30 })), jtoR = cuBrut(JTO({ distantaLichidarePct: 30, pretLichidare: 0.47 }));
  const fisaSig = fisaS({ setare: { ...fisa().setare, levierSigur: 4 } });
  sf("CRV lângă marginea de jos", crvM);
  sf("LIGHTER: trendul contra, tare", cuBrut(LIGHTER()), { fisa: fisaS({ directie: { dir: "short", tarie: "tare", motive: MOTIVE_JOS } }) });
  sf("JTO: mișcare mare contra", jtoR, { fisa: fisaS({ regim: { r4h: 2.4, r24h: 1.2, miscare: true, sens: "coboara" }, liniste: { linisteAcum: false } }) });
  sf("VVV: mișcare mare cu botul", cuBrut(VVV({ id: "2391", baza: "VVV.PERP", levier: 3 })), { fisa: fisaS({ regim: { r4h: 2.4, r24h: 1.6, miscare: true, sens: "urca" }, liniste: { linisteAcum: false } }) });
  sf("VVV short: mișcare cu botul, trendul contra", cuBrut(VVV({ id: "2392", baza: "VVV.PERP", directie: "short", pretCurent: 30, gridJos: 27, gridSus: 35 })),
    { fisa: fisaS({ dir: "long", directie: { dir: "long", tarie: "mediu", motive: ["4h: EMA20 peste EMA50, EMA50 urcă"] }, regim: { r4h: 2.1, r24h: 1.3, miscare: true, sens: "coboara" }, liniste: { linisteAcum: false } }) });
  sf("JTO: liniște rară", jtoR, { fisa: fisaS({ liniste: { linisteAcum: true, zileLiniste: 1.6, n: 20, k: 4, p: 0.2, ic: [0.08, 0.42], suficient: true, H: 2 } }) });
  sf("CRV: ritmul a scăzut", crvM, { peste: { ritm: { grile24h: 0.1, medieZi: 1.2, tranz24h: 2, tranzMedieZi: 14, zile: 4 } } });
  sf("CRV: ritmul a crescut, fără tranzacții", crvM, { peste: { ritm: { grile24h: 3.1, medieZi: 1.2, tranz24h: null, tranzMedieZi: null, zile: 4 } } });
  sf("LIGHTER: funding-ul mănâncă grilele", cuBrut(LIGHTER()), { peste: { costuri: { netZi: -0.42, grile24h: 0.3, comisionZi: 0.12, fundingZi: 0.6, fundingMananca: true } } });
  sf("JTO: costuri sub un cent pe zi", jtoR, { peste: { costuri: { netZi: -0.004, grile24h: 0.01, comisionZi: 0.004, fundingZi: 0.01, fundingMananca: false } } });
  sf("JTO: grile dese și levier peste cel sigur", cuBrut(JTO({ levier: 8, distantaLichidarePct: 30 })), { fisa: fisaSig, peste: { geom: { netPct: 0.0012, preaDese: true, grile: 93, mod: "aritmetic" } } });
  sf("JTO: doar levierul peste cel sigur", cuBrut(JTO({ levier: 8, distantaLichidarePct: 30 })), { fisa: fisaSig, peste: { geom: null } });
  sf("CRV pe minus: zero-ul botului", crvM, { peste: { zero: { pretZero: 0.4012, distantaZeroPct: 0.0399, iei: 46.4 } } });
  sf("VVV short pe minus: zero-ul sub preț", cuBrut(VVV({ id: "2392", baza: "VVV.PERP", directie: "short", pretCurent: 30, gridJos: 27, gridSus: 35, profitTotal: -4 })), { peste: { zero: { pretZero: 29.1, distantaZeroPct: -0.03, iei: 92.6 } } });
  sf("direcția rea", jtoR, { rezumat: DR.rezumat(REZ("coboara", "coboara"), "long") });
  sf("direcția amestecată", jtoR, { rezumat: DR.rezumat(REZ("urca", "coboara"), "long") });
  sf("direcția cu botul, dar bara de 4 ore cade", jtoR, { rezumat: DR.rezumat(REZ("urca", "urca", { pct: -2.4 }), "long") });
  sf("direcția laterală", jtoR, { rezumat: DR.rezumat(REZ("lateral", "lateral"), "long") });
  // rezumatul directiei e si pe Tablou (panoul directiei, KPI-ul pietei)
  for (const [sit, r] of [["rea", REZ("coboara", "coboara")], ["amestecată", REZ("urca", "coboara")], ["cu botul, bara de 4 ore cade", REZ("urca", "urca", { pct: -2.4 })], ["laterală", REZ("lateral", "lateral")]])
    pune("direcția " + sit + " (Tablou)", "sfaturi", "directie.rezumat", DR.rezumat(r, "long"), [["text", "deCe"]]);
  sf("funding plătit, mare", cuBrut(JTO({ distantaLichidarePct: 30, finantare: -0.04 })), { funding: 0.0008 });
  sf("funding încasat, fără istoric", cuBrut(JTO({ distantaLichidarePct: 30, finantare: null })), { funding: -0.0002 });
  sf("lichidarea la 5% și prețul sub grid", cuBrut(CRV({ pretCurent: 0.375, pretLichidare: 0.3562, distantaLichidarePct: 5 })));
  sf("lichidarea la 12%", cuBrut(CRV({ pretLichidare: 0.3438, distantaLichidarePct: 12 })));
  sf("nimic urgent, fără lumânări de 4 h", cuBrut(JTO({ profitTotal: 2, distantaLichidarePct: 30 })), { k4: [] });
  // „Ce ai de făcut acum” (tablou-extra.js): randurile lui (planul lipsa, „Nimic urgent”) si ritmul de recuperare de sub „Rezultat total”
  const todo = (sit, o) => T.ceAiDeFacut(Object.assign({ acum: T0, dateLa: T0, sfaturi: [], avertismente: [], alerte: [], planGol: false }, o)).forEach((r) => {
    if (r.actiune === "plan" || r.c === "v") pune(sit, "todo", "todo." + (r.actiune || "gol"), r, [["titlu", "titlu"], ["text", "deCe"]]);
  });
  todo("planul lipsă", { planGol: true });
  todo("nimic de făcut", {});
  for (const [sit, a] of [["recuperare: pe plus", [3, 1]], ["recuperare: nu se recuperează", [-3, -0.2]], ["recuperare: sub 10 zile", [-3.2, 7.99]], ["recuperare: peste 10 zile", [-10, 0.8]]])
    pune(sit, "todo", "ritmRecuperare", T.ritmRecuperare(a[0], a[1]), [["text", "rand"]]);
  // Consilierul cu sfaturile REALE (M7 din revizia pachetului 1: primul motiv venit din sfaturi.js are tot titlul ≤ 60) + verdictul vechi (ideea 3)
  const cons2 = (sit, x) => {
    const c = C.alcatuieste(x);
    pune(sit, "consiliu-2", "consiliu", c, [["titlu", "titlu"], ["faCe", "faCe"], ["explica", "deCe"]]);
    c.motive.forEach((m, i) => pune(sit, "consiliu-2", "consiliu.motiv" + (i + 1) + "." + m.cod, m, [["titlu", "titlu"], ["text", "deCe"], ["extra", "detalii"]]));
    c.rest.forEach((r, i) => pune(sit, "consiliu-2", "consiliu.rest" + (i + 1), r, [["titlu", "titlu"]]));
    return c;
  };
  cons2("CRV lângă marginea de jos + mută gridul (sfatul real)", { sm: S.semafor({ bot: crvM, fisa: fisa(), muta: S.mutaGridul(crvM, fisa(), 0, PM) }), concret: [], sfaturi: sf("(pentru Consilier) CRV lângă margine", crvM) });
  cons2("primul motiv vine din sfaturi (ritmul + funding-ul)", { sm: S.semafor({ bot: jtoR, fisa: fisa() }), concret: [],
    sfaturi: sf("(pentru Consilier) ritmul + funding-ul", cuBrut(JTO({ distantaLichidarePct: 30, finantare: -0.04 })), { funding: 0.0008, peste: { ritm: { grile24h: 0.1, medieZi: 1.2, tranz24h: 2, tranzMedieZi: 14, zile: 4 } } }) });
  cons2("verdictul vechi: lichidarea depășită", { sm: S.semafor({ bot: CRV({ distantaLichidarePct: 30 }), fisa: fisa() }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Prețul a trecut deja de pragul de lichidare cu 1.2%." } });
  cons2("verdictul vechi: Pionex MARGIN_CALL", { sm: S.semafor({ bot: CRV({ distantaLichidarePct: 30 }), fisa: fisa() }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Pionex raportează marginea contului ca MARGIN_CALL, nu NORMAL." } });
  // avertismentele serverului (functions/_shared/avertismente.js): randurile de sus din „Ce ai de făcut acum” si lista botilor
  const av = (sit, o) => avertismenteBot(o).forEach((t, i) => pune(sit, "server", "avertisment" + (i + 1), { t }, [["t", "rand"]]));
  av("CRV: fără stop, peste grid, lichidarea la 10,9%, pe minus deși grilele câștigă", { x: {}, pret: 0.3806, jos: 0.37, sus: 0.38,
    lich: { pretLichidare: 0.3382876201448984, lichidarePartea: "jos", distantaLichidarePct: 10.93, lichidareDepasita: false }, comisioane: -1.21, gridProfitBrut: 10.91, profitNet: -1.6 });
  av("lichidarea depășită, sub grid, comisioanele peste grile", { x: { lossStop: "0.36" }, pret: 0.3301, jos: 0.37, sus: 0.38,
    lich: { pretLichidare: 0.3382876201448984, lichidarePartea: "jos", distantaLichidarePct: -2.4, lichidareDepasita: true }, comisioane: -2.5, gridProfitBrut: 1.2, profitNet: -9 });
  av("comisioanele necunoscute", { x: { profitStop: "5" }, pret: 0.375, jos: 0.37, sus: 0.38,
    lich: { pretLichidare: null, lichidarePartea: null, distantaLichidarePct: null, lichidareDepasita: false }, comisioane: null, gridProfitBrut: 3, profitNet: -2 });
  return out;
}
`],
  [`  const i = process.argv.indexOf("--inventar");
`, `  const i = process.argv.indexOf("--inventar");
  const mods = (process.argv.find((a) => a.startsWith("--mod=")) || "").slice(6).split(",").filter(Boolean), inMod = (x) => !mods.length || mods.includes(x.mod);
`],
  [`.concat(l.map((x) => "| " + x.sit`, `.concat(l.filter(inMod).map((x) => "| " + x.sit`],
  [`(STRICT.has(m) ? "STRICT " : "raport ") + m.padEnd(10)`, `(STRICT.has(m) ? "STRICT " : "raport ") + m.padEnd(11)`],
];
