// Garda textelor, grupul „acasa” (specul „sfaturi concise”, pachetul 5): Acasă (Acasa.*), obiceiurile (Obiceiuri.*: istoricul monedei,
// prima ora, poarta de pornire, frana, raportul de duminica, autopsia, regulile tale), fisa (GridCalcul.verdict, GridProba.verdictIngust /
// rezumatIngust / ingust) - toate cu modulele REALE si date in forma lor (lectia reviziei pachetului 3: fara texte de baza inventate).
// Textele fisei din app.js (DOM) se verifica prin sursa, in proba pachetului.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ZI = 86400000, ORA = 3600000, T0 = Date.UTC(2026, 9, 4, 18, 0);   // o duminica seara (raportul de duminica)
// botii lui inchisi, REALI (Pionex, 24.09) -> trade-urile in forma JurnalTrade.din (cu greselile lor); clonele pastreaza forma
const BOTI = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixturi", "boti-inchisi-2026-09-24.json"), "utf8"));
const PERS = /^(Aș|N-aș|L-aș|Le-aș|O-aș|M-aș|Nu m-aș)\s/;

export function situatiiAcasa(pune) {
  const AC = globalThis.Acasa, OB = globalThis.Obiceiuri, G = globalThis.GridCalcul, GP = globalThis.GridProba;
  const D = (o) => Object.assign({}, o);
  // ---- vremea crypto (Acasa.vreme): fiecare ramura, cu lacomie / frica
  const cr = (evita, dir, fg, btc) => AC.vreme({ clasament: { evita, candidati: 100 - evita, dir }, btc: { miscare: !!btc }, fg });
  for (const [sit, v] of [["fără clasament", AC.vreme({})], ["BTC în mișcare", cr(10, { long: 45, short: 45, neutru: 10 }, 50, true)],
    ["jumătate în mișcare + lăcomie", cr(60, { long: 70, short: 20, neutru: 10 }, 78)], ["amestecat + frică", cr(30, { long: 10, short: 80, neutru: 10 }, 22)],
    ["liniște", cr(10, { long: 45, short: 45, neutru: 10 }, 50)], ["liniște + lăcomie", cr(10, { long: 70, short: 20, neutru: 10 }, 80)]])
    pune("vremea crypto: " + sit, "acasa", "vreme", D(v), [["titlu", "deCe"], ["text", "detalii"], ["faCe", "faCe"]]);
  // ---- vremea bursei (Acasa.vremeBursa)
  const serie = (f) => Array.from({ length: 260 }, (_, i) => ({ c: f(i) }));
  const SUS = (i) => 100 + i * 0.2, JOS = (i) => 200 - i * 0.3, LAT = (i) => 100 + 3 * Math.sin(i / 9);
  for (const [sit, o] of [["fără date", { qqq: [] }], ["frică (VIX 31)", { qqq: serie(JOS), vix: 31, ndx: { e50: 30, n: 100 } }], ["scade", { qqq: serie(JOS), vix: 22, ndx: { e50: 30, n: 100 } }],
    ["laterală", { qqq: serie(LAT), vix: 21, ndx: { e50: 50, n: 100 } }], ["urcare îngustă", { qqq: serie(SUS), vix: 18, ndx: { e50: 40, n: 100 } }], ["urcare largă", { qqq: serie(SUS), vix: 14, ndx: { e50: 70, n: 100 } }]])
    pune("vremea bursei: " + sit, "acasa", "vremeBursa", D(AC.vremeBursa(o)), [["titlu", "deCe"], ["text", "detalii"], ["faCe", "faCe"]]);
  // ---- frica/lacomia, latimea pietei, legatura BTC - bursa, calendarul, funding-ul pietei, socoteala alertelor
  for (const [sit, l] of [["lăcomie", Array.from({ length: 30 }, (_, i) => 50 + i)], ["frică", Array.from({ length: 30 }, (_, i) => 60 - i * 1.5)], ["la mijloc", Array.from({ length: 30 }, (_, i) => 40 + (i % 5))]])
    pune("frica/lăcomia: " + sit, "acasa", "fg", { t: AC.fg(l).text }, [["t", "detalii"]]);
  for (const [sit, x] of [["largă fără volum", { participation: 85, above20: 88, above50: 80, above200: 70, momentum: 75, volume: 40, altParticipation: 70, score: 78, highs: 40, lows: 3, divergence: "NONE", state: "BULLISH" }],
    ["coborâre largă", { participation: 15, above20: 12, above50: 20, above200: 35, momentum: 20, volume: 60, altParticipation: 10, score: 18, highs: 2, lows: 50, divergence: "BEARISH", state: "BEARISH" }],
    ["împărțită", { participation: 50, above20: 52, above50: 48, above200: 55, momentum: 50, volume: 50, altParticipation: 45, score: 50, highs: 10, lows: 9, divergence: "NONE", state: "NEUTRAL" }]]) {
    const lg = AC.largime(x); pune("lățimea pieței: " + sit, "acasa", "largime", { t: lg.concluzie, m: lg.maxMin }, [["t", "deCe"], ["m", "detalii"]]);
  }
  const zile = (n, f) => Array.from({ length: n }, (_, i) => ({ t: T0 - (n - i) * ZI, c: f(i) }));
  const q = zile(40, (i) => 100 * (1 + 0.01 * Math.sin(i))), bU = zile(40, (i) => 60000 * (1 + 0.02 * Math.sin(i))), bI = zile(40, (i) => 60000 * (1 - 0.02 * Math.sin(i))), bS = zile(40, (i) => 60000 * (1 + 0.01 * Math.cos(i * 2.3)));
  for (const [sit, b] of [["urmează bursa", bU], ["merge invers", bI], ["pe drumul lui", bS]]) pune("BTC și bursa: " + sit, "acasa", "corelatie", { t: AC.corelatie(b, q).text }, [["t", "deCe"]]);
  const ev = (zi, h, titlu, impact) => ({ country: "USD", impact: impact || "High", date: new Date(T0 + zi * ZI + h * ORA).toISOString(), title: titlu, forecast: "0,3%", previous: "0,2%" });
  for (const [sit, l] of [["nimic", []], ["două mari", [ev(1, 12, "CPI m/m"), ev(3, 18, "FOMC Statement")]], ["doar medii", [ev(2, 14, "Retail Sales m/m", "Medium")]]])
    pune("calendarul: " + sit, "acasa", "calendar", { t: AC.calendar(l, T0).text }, [["t", "detalii"]]);
  const fp = (rate, uz, n) => Array.from({ length: n }, (_, i) => ({ s: "C" + i, rate: i % 4 ? rate : -rate / 2, hist: Array.from({ length: 10 }, () => uz) }));
  for (const [sit, l] of [["înghesuiți pe long", fp(0.0006, 0.0001, 40)], ["ca de obicei", fp(0.0001, 0.0001, 40)]]) { const f = AC.fundingPiata(l); if (f) pune("funding-ul pieței: " + sit, "acasa", "fundingPiata", { t: f.text }, [["t", "detalii"]]); }
  const al = (n, cont) => Array.from({ length: n }, (_, i) => ({ fel: i % 7 ? "moneda" : "vreme", dir: "sus", pret: 100, p1: i < cont ? 104 : 97, p3: i < cont ? 106 : 95 }));
  for (const [sit, l] of [["nimic", []], ["fără socoteli", [{ fel: "moneda", dir: "sus", pret: 100 }]], ["8 judecate", al(8, 5)], ["30 judecate", al(30, 14)]]) {
    const s = AC.socotealaAlerte(l); pune("socoteala alertelor: " + sit, "acasa", "socotealaAlerte", { t: s.text, v: s.textVreme }, [["t", "detalii"], ["v", "detalii"]]);
  }
  // ---- raportul saptamanii pietei (Discord, duminica seara): randuri ≤ 160; randurile „👉” = o actiune la persoana I
  const vr = cr(60, { long: 70, short: 20, neutru: 10 }, 78), vb = AC.vremeBursa({ qqq: serie(JOS), vix: 22, ndx: { e50: 30, n: 100 } });
  const raport = (sit, o) => {
    const r = AC.raportSaptamana(o); pune("raportul pieței: " + sit, "acasa", "raportSaptamana", r, [["titlu", "alertaTitlu"], ["mesaj", "raport"]]);
    r.mesaj.split("\n").filter((l) => /^👉 /.test(l)).forEach((l, i) => pune("raportul pieței: " + sit + " (acțiunea " + (i + 1) + ")", "acasa", "raportSaptamana.fac", { t: l.replace(/^👉\s*(Ce aș face eu:\s*)?([^:]{1,20}:\s*)?/, "") }, [["t", "faCe"]]));
  };
  raport("tot", { btc7: -4.2, qqq5: -1.8, vix: 22.4, vreme: vr, vremeBursa: vb, sus: [{ s: "NVDA", ch5: 6.1 }], jos: [{ s: "INTC", ch5: -7.4 }], botiTotal: -12.4, t212Ppl: 312,
    calendar: [{ mare: true, cand: "mar 15:30", titlu: "CPI m/m" }, { mare: true, cand: "mie 21:00", titlu: "FOMC Statement" }], rezultate: [{ simbol: "NVDA", data: "08.10" }] });
  // v100.75 (ideea 4): săptămâna cu 5 evenimente mari (titluri reale din calendar) - rândurile ≤ 160
  const rs5 = AC.raportSaptamana({ btc7: 1.2, qqq5: 0.4, calendar: [["mar 15:30", "Core PCE Price Index m/m"], ["mie 21:00", "Federal Funds Rate"], ["mie 21:00", "FOMC Statement"], ["vin 15:30", "Non-Farm Employment Change"], ["vin 15:30", "Average Hourly Earnings m/m"]].map(([cand, titlu]) => ({ mare: true, cand, titlu })) });
  pune("raportul pieței: 5 evenimente mari", "acasa", "raportSaptamana5", { t: rs5.mesaj }, [["t", "raport"]]);
  raport("fără date", {});
  // ---- obiceiurile: istoricul monedei, prima ora, frana, poarta, raportul de duminica, autopsia, regulile tale
  const REALE = globalThis.JurnalTrade.din(BOTI), TPL = REALE[0];
  if (!TPL || !Array.isArray(TPL.greseli)) throw new Error("garda-acasa: fixtura reala n-a dat trade-uri cu greseli");
  let nId = 0;
  const tr = (m, rez, o) => Object.assign({}, TPL, { id: "g" + (++nId), moneda: m, rezultat: rez, net: rez, inchis: T0 - 5 * ZI, pornit: T0 - 6 * ZI, durataOre: 30, comisioane: -0.2, funding: 0, dir: "long", greseli: [] }, o || {});
  pune("istoricul monedei (real): COTI", "acasa", "istoricMoneda", { t: OB.istoricMoneda(REALE, "COTI").text }, [["t", "deCe"]]);
  pune("istoricul monedei (real): BCH", "acasa", "istoricMoneda", { t: OB.istoricMoneda(REALE, "BCH").text }, [["t", "deCe"]]);
  const istT = (plus, minus, mare) => Array.from({ length: plus }, (_, i) => tr("LIGHTER", 1.5, { inchis: T0 - (30 - i) * ZI })).concat(Array.from({ length: minus }, (_, i) => tr("LIGHTER", i === 0 ? mare : -6.1, { inchis: T0 - (12 - i) * ZI })));
  for (const [sit, l] of [["niciun bot", []], ["câștigi des, dar pierderile mari", istT(7, 5, -40.12)], ["pierzi des", istT(3, 9, -22.4)], ["2 boți, pe plus", istT(2, 0, 0)], ["4 boți, pe plus", istT(3, 1, -0.5)]])
    pune("istoricul monedei: " + sit, "acasa", "istoricMoneda", { t: OB.istoricMoneda(l, "LIGHTER").text }, [["t", "deCe"]]);
  const sub = Array.from({ length: 48 }, (_, i) => tr("X" + (i % 5), i % 3 ? -0.4 : 0.2, { comisioane: -0.17, durataOre: 0.5, inchis: T0 - (30 - i % 30) * ZI }));
  pune("prima oră", "acasa", "subOOra", { t: OB.subOOra(sub).text }, [["t", "deCe"]]);
  const frT = (l) => OB.frana({ trades: l, acum: T0 });
  for (const [sit, l] of [["trasă azi", [tr("A", -12.05, { inchis: T0 - 2 * ORA }), tr("B", -12.05, { inchis: T0 - 3 * ORA })]], ["trasă pe 7 zile și la rând", [tr("A", -9, { inchis: T0 - ORA }), tr("B", -8, { inchis: T0 - 2 * ORA }), tr("C", -7.5, { inchis: T0 - 3 * ORA }), tr("D", -40, { inchis: T0 - 3 * ZI })]],
    ["liberă", [tr("A", -2, { inchis: T0 - 2 * ORA }), tr("B", 3, { inchis: T0 - 3 * ZI })]]])
    pune("frâna contului: " + sit, "acasa", "frana", { t: frT(l).text }, [["t", "deCe"]]);
  const fi = OB.franaIstoric(Array.from({ length: 40 }, (_, i) => tr("M" + (i % 6), i % 3 ? -6 : 4, { inchis: T0 - (40 - i) * 6 * ORA, pornit: T0 - (40 - i) * 6 * ORA - 3 * ORA })), null);
  if (fi && fi.text) pune("frâna pe istoria ta", "acasa", "franaIstoric", { t: fi.text }, [["t", "detalii"]]);
  const fisa = (nivel, motive, o) => Object.assign({ simbol: "LIT_USDT_PERP", dir: "long", verdict: { nivel, motive }, setare: { levierSigur: 4 }, directie: { dir: "long", tarie: "mediu" } }, o || {});
  for (const [sit, o] of [["totul trece", { fisa: fisa("porneste", []), levier: 3, dir: "long", plan: { plus: 5.5, minus: 15.7, afaraOre: 12 } }],
    ["fișa zice nu, levier peste, contra trendului, fără plan, repornire", { fisa: fisa("nu", ["pe istoric, setarea asta a fost lichidată de 2 ori"], { directie: { dir: "short", tarie: "tare" } }), levier: 6, dir: "long", plan: null,
      trades: [tr("LIGHTER", -4, { inchis: T0 - 4 * 60000 })].concat(istT(7, 5, -40.12)), numeBot: "LIGHTER.PERP", acum: T0, frana: frT([tr("A", -12.05, { inchis: T0 - 2 * ORA }), tr("B", -12.05, { inchis: T0 - 3 * ORA })]) }],
    ["fișa zice așteaptă", { fisa: fisa("asteapta", ["prețul stă lângă minimul ultimelor 7 zile"]), levier: 4, dir: "long", plan: { minus: 10 }, trades: sub }],
    ["113 de boți pe LIGHTER (LIT)", { fisa: fisa("porneste", []), levier: 3, dir: "long", plan: { plus: 5.5, minus: 15.7, afaraOre: 12 }, trades: Array.from({ length: 113 }, (_, i) => tr("LIGHTER", i % 3 ? -12.35 : 4.2, { inchis: T0 - (i + 2) * 6 * ORA, pornit: T0 - (i + 3) * 6 * ORA })), numeBot: "LIGHTER.PERP" }]]) {
    const r = OB.poarta(Object.assign({ acum: T0 }, o));
    r.reguli.forEach((x) => pune("poarta de pornire: " + sit + " · " + x.cod, "acasa", "poarta." + x.cod, { t: x.text }, [["t", "deCe"]]));   // randurile portii = explicatii (≤ 160)
    const fp = OB.facPoarta(r); pune("poarta de pornire: " + sit + " · ce aș face", "acasa", "facPoarta", { t: fp.fac, n: fp.nota }, [["t", "faCe"], ["n", "deCe"]]);
    r.sfaturi.forEach((x, i) => pune("poarta de pornire: " + sit + " · sfat " + (i + 1), "acasa", "poarta.sfat", { t: x }, [["t", "detalii"]]));
  }
  // raportul de duminica (Discord): randuri ≤ 160, regula saptamanii
  const G1 = REALE.reduce((a, t) => a.concat(t.greseli || []), [])[0] || null;   // o greseala reala din fixtura, daca are
  const sapt = Array.from({ length: 9 }, (_, i) => tr(["CRV", "LIGHTER", "JTO"][i % 3], i % 3 ? -3.1 : 2.4, { net: i % 3 ? -3.4 : 2.1, comisioane: -0.3, inchis: T0 - (i + 1) * 15 * ORA, pornit: T0 - (i + 2) * 15 * ORA, durataOre: 15, grile: 1.1, pozitie: i % 3 ? -4.2 : 1.3, greseli: i % 3 && G1 ? [G1] : [] }));
  const soc = { muta: { nume: "„Mută gridul”", judecate: 12, corecte: 8, bani: 14.2, baniN: 12 }, btc: { nume: "„BTC în mișcare”", judecate: 11, corecte: 4, bani: -6.3, baniN: 11 } };
  const log = (cod, motiv, total, dupa, stare) => ({ dreptate: false, cod, nivel: "atentie", motiv, t: T0 - 3 * ZI, judecatLa: T0 - 2 * ZI, total, totalDupa: dupa, stare });
  // un avertisment GRESIT = totalul s-a imbunatatit dupa (urmat, il inchideai mai jos); 25 de zile distincte cu acelasi sfat in aceeasi stare,
  // 23 gresite -> tiparul propus (regula, ipoteza); motivele reale ale semaforului (cu cifre, lungi)
  const aut = OB.autopsie([{ moneda: "MARSCOIN", log: [log("muta", "prețul stă la marginea de jos a gridului (9,6% din interval)", -6.4, 2.2, "liniste-jos")] }, { moneda: "CRV", log: [log("btc", "BTC în mișcare (2,3× față de obișnuit), moneda încă nu", -6.4, -1.2, "liniste-jos"), log("muta", "prețul la 0,1% de marginea de jos (1,0% din interval)", -3.3, 2.1, null)] },
    { moneda: "LIGHTER", log: Array.from({ length: 25 }, (_, i) => Object.assign(log("btc", "BTC în mișcare (1,9× față de obișnuit), moneda încă nu", -2.4, i % 12 ? -0.6 : -3.1, "liniste-jos"), { t: T0 - (i + 2) * ZI, judecatLa: T0 - (i + 1) * ZI, dreptate: !!(i % 12 === 0) })) }], T0);
  if (!(aut.tipar && aut.scumpe && aut.scumpe.length)) throw new Error("garda-acasa: autopsia n-a dat sfaturi scumpe si tipar");
  (aut.linii || []).forEach((l, i) => pune("autopsia săptămânii", "acasa", "autopsie.l" + (i + 1), { t: l }, [["t", "raport"]]));
  for (const [sit, o] of [["o săptămână cu boți", { trades: sapt, acum: T0, socoteala: soc, autopsie: aut, laborator: { intrebari: [{ verdict: "dovedit", titlu: "după o mișcare mare, gridul iese mai rău" }] } }], ["nimic închis", { trades: [], acum: T0 }]]) {
    const rd = OB.raportDuminica(o); (rd.linii || []).forEach((l, i) => pune("raportul de duminică: " + sit, "acasa", "raportDuminica.l" + (i + 1), { t: l }, [["t", "raport"]]));
  }
  const rp = OB.reguliPersonale(Array.from({ length: 90 }, (_, i) => tr(["CRV", "LIGHTER", "JTO"][i % 3], i % 4 === 0 ? -8 : 2, { pornit: T0 - (90 - i) * ZI + (i % 6) * 4 * ORA, inchis: T0 - (90 - i) * ZI + 30 * ORA, durataOre: i % 5 ? 30 : 400 })), "Europe/Bucharest");
  (rp.reguli || []).slice(0, 3).forEach((g, i) => pune("regulile tale: " + g.grupa, "acasa", "reguliPersonale" + (i + 1), { t: g.text }, [["t", "deCe"]]));
  // ---- fisa: verdictul (GridCalcul.verdict), gridul ingust (GridProba)
  const vd = (sit, o) => (G.verdict(o).motive || []).forEach((m, i) => pune("verdictul fișei: " + sit, "acasa", "verdict.motiv" + (i + 1), { t: m }, [["t", "rand"]]));
  const stat = (o) => ({ antren: Object.assign({ mediana: 0.004, lichidari: 0 }, o && o.a), test: o && o.faraTest ? null : Object.assign({ mediana: 0.002, lichidari: 0 }, o && o.t) });
  vd("fără lumânări", { regim: null, stat: null });
  vd("după mișcare, lichidată, pe minus, nesigur", { regim: { r4h: 2.4, r24h: 1.8, miscare: true }, stat: stat({ a: { mediana: -0.012, lichidari: 2 }, t: { lichidari: 1 } }), zile: 40, pozitie: 0.5, nesigur: true });
  vd("la limită, fără test, lângă minim, istoric scurt", { regim: { r4h: 0.6, r24h: 0.8, miscare: false }, stat: stat({ a: { mediana: 0.0004 }, faraTest: true }), zile: 9, pozitie: 0.03, pesteSigur: true });
  vd("test pe minus, lângă maxim", { regim: { r4h: 0.6, r24h: 0.8, miscare: false }, stat: stat({ t: { mediana: -0.004 } }), zile: 40, pozitie: 0.97 });
  for (const [sit, t] of [["puține ferestre", { nIndep: 4 }], ["lichidată pe test", { nIndep: 30, lichidari: 1 }], ["pe minus pe test", { nIndep: 30, lichidari: 0, mediana: -0.002 }],
    ["media pe minus", { nIndep: 30, lichidari: 0, mediana: 0.002, medie: -0.012 }], ["pe plus nu clar peste jumătate", { nIndep: 30, lichidari: 0, mediana: 0.002, medie: 0.003, ic: [0.42, 0.7], pePlus: 0.56 }]]) {
    const m = GP.verdictIngust(t, 12); if (m) pune("gridul îngust: " + sit, "acasa", "verdictIngust", { t: m }, [["t", "rand"]]);
  }
  for (const [sit, o] of [["piața în mișcare", { miscare: true, dir: "long" }], ["fără direcție", { miscare: false, dir: "?" }], ["istoric scurt", { miscare: false, dir: "long" }]]) {
    const r = GP.ingust([], o); if (r && r.motiv) pune("gridul îngust: " + sit, "acasa", "ingust", { t: r.motiv }, [["t", "rand"]]);
  }
  // v100.73 (revizia pachetului 5, M7): rândul „nu” din motivele REALE - GridProba.ingust pe bare (urcare pe 12 zile ⇒ „prea puține ferestre …”),
  // ramura timpurie (piața în mișcare) și ramura „!best” citită din sursa grid-proba.js (nu scrisă de mână); „propus” = forma rezultatului real
  const BZ = G.C.BARE_ZI, M15 = 15 * 60000, n15 = 12 * BZ;
  const bareU = Array.from({ length: n15 }, (_, i) => { const c = 1 + 0.8 * i / n15; return { t: T0 - (n15 - i) * M15, o: c, h: c * 1.0005, l: c * 0.9995, c }; });
  const mBest = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "lib", "grid-proba.js"), "utf8").match(/if \(!best\) return \{ propus: false, motiv: "([^"]+)" \}/);
  if (!mBest) throw new Error("garda-acasa: ramura „!best” din grid-proba.js nu mai are forma așteptată");
  for (const [sit, r] of [["nu · test cu puține ferestre", GP.ingust(bareU, { miscare: false, dir: "long" })], ["nu · piața în mișcare", GP.ingust([], { miscare: true, dir: "long" })],
    ["nu · toate variantele căzute", { propus: false, motiv: mBest[1] }],
    ["propus", { propus: true, dir: "long", ore: 12, latime: 0.024, setare: { grile: 9 }, test: { perechiZi: 18.4, mediana: 0.0042, medie: 0.0051, pePlus: 0.64, celMaiRau: -0.021, nIndep: 31 } }]])
    pune("gridul îngust (rândul ideilor): " + sit, "acasa", "rezumatIngust", { t: GP.rezumatIngust(r) }, [["t", "detalii"]]);
}
export { PERS };
