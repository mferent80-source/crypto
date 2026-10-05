// Proba v100.96 / colector v101.66 (04.10, el: „fa reparatii si idei” pe raportul v100.95; planul docs/superpowers/plans/2026-10-04-reparatii-idei-v10096.md):
// (1) 🔵10 tura de noapte numără doar scrierile reușite; (2) 🔵11 dimineața nu se scrie bara în curs; (3) 🔵12/ideea 3 hash-ul codului fără texte;
// (4) ideea 2 pragul „dovedită” pe bloc; (5) ideea 4 costul porții în plaja perechilor lui; (6) 🔵7/ideea 1 rândul Busolei cu monede și așteptare; (E) versiunile.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { situatii, verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
const fnColector = (nume) => { const s = citeste("scripts", "colector.mjs"), i = s.search(new RegExp("^(async )?function " + nume + "\\(", "m")); assert.ok(i >= 0, "lipsește " + nume + " în colector.mjs"); const k = s.indexOf("\n}\n", i); return s.slice(i, k < 0 ? undefined : k + 2); };
globalThis.GridCalcul = globalThis.GridCalcul || new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul, AS = new Function("GridCalcul", `${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(G);
const P = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(G, AS); globalThis.Probabilitati = P;
const R = new Function("Probabilitati", `${lib("retea.js")}; return Retea;`)(P); globalThis.Retea = R;
const A = new Function("Retea", "Probabilitati", `${lib("arbori.js")}; return Arbori;`)(R, P);
const oPropozitie = (s) => { assert.ok(typeof s === "string" && s.length <= 160, "peste 160 sau nu e text: " + s); assert.ok(!/\. [A-ZĂÂÎȘȚ]/.test(s), "două propoziții: " + s); assert.ok(!/NaN|null|undefined/.test(s), s); };
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.96 · reparațiile și ideile raportului v100.95");

const ORA = 3600000, ZI = 864e5, ACUM = Date.UTC(2026, 9, 4, 12, 0);
// bare zilnice sintetice (t la 13:30 UTC, ca Yahoo), mers aleator cu sămânță
const bareZi = (n, p0, sem) => { const r = (() => { let a = sem; return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648); })(); const l = []; let c = p0; for (let i = 0; i < n; i++) { const o = c; c = c * (1 + (r() - 0.5) * 0.04); l.push({ t: Date.UTC(2024, 8, 2, 13, 30) + i * ZI, o, h: Math.max(o, c) * 1.01, l: Math.min(o, c) * 0.99, c, v: 1000 }); } return l; };

// ======== Task 1 (🔵10): tura de noapte numără doar scrierile reușite ========
await test("(1) tura-retea: o scriere picată (scrieZile dă false) nu intră în „zile: N din M”; stuburile vechi (fără valoare) contează ca până acum", async () => {
  const TR = await import("./lib/tura-retea.mjs"); const jur = [];
  const d = { acum: Date.UTC(2026, 9, 5, 0, 30), stare: {}, forta: true, eNoapte: () => true, ziRo: () => "2026-10-05", simboluri: [], cereKlines: async () => null, pauza: async () => {}, citesteOre: () => [], scrieOre: () => {}, boti: async () => [], scrieBoti: () => {},
    porneste: async () => ({ cod: 1, minute: 0 }), citesteModele: () => null, trimite: async () => true, jurnal: (...a) => jur.push(a.join(" ")), scrieStare: () => {},
    tickereZile: async () => ["AAA_US_EQ", "BBB_US_EQ", "CCC_US_EQ"], vechimeZile: () => 0, cereZile: async () => ({ randuri: [{ time: 1, open: 1, high: 1, low: 1, close: 1 }] }), scrieZile: (tk) => (tk === "BBB_US_EQ" ? false : undefined), tradeuri: async () => [], scrieTradeuri: () => {} };
  await TR.turaRetea(d); assert.ok(jur.some((l) => /zile: 3 din 4 tickere/.test(l)), jur.filter((l) => /zile:/.test(l)).join(" | ") || "fără rândul „zile:”");
});

// ======== Task 2 (🔵11): dimineața nu se scrie bara în curs ========
await test("(2) date-t212.randuriInchise: cu bursa deschisă (marți 15:00 NY) rândul zilei în curs nu intră; sâmbăta intră tot; rândurile rămân cele brute ale rutei (time/open/…); colectorul le scrie prin ea", async () => {
  const D = await import("../retea/date-t212.mjs");
  const zile = [Date.UTC(2026, 9, 2, 13, 30), Date.UTC(2026, 9, 5, 13, 30), Date.UTC(2026, 9, 6, 13, 30)];   /* vineri, luni, marți */
  const rd = zile.map((t, i) => ({ time: t, open: 10 + i, high: 11 + i, low: 9 + i, close: 10.5 + i, volume: 100 }));
  const marti15NY = Date.UTC(2026, 9, 6, 19, 0), sambata = Date.UTC(2026, 9, 10, 15, 0);
  const inchise = D.randuriInchise(rd, marti15NY, G); assert.equal(inchise.length, 2, "marți în ședință: ziua de marți e în curs"); assert.deepEqual(inchise.map((x) => x.time), zile.slice(0, 2)); assert.equal(inchise[1].open, 11, "rândurile brute, nu barele");
  assert.equal(D.randuriInchise(rd, sambata, G).length, 3, "sâmbăta toate zilele sunt închise");
  assert.deepEqual(D.randuriInchise([], marti15NY, G), []); assert.deepEqual(D.randuriInchise(null, marti15NY, G), []);
  const idei = fnColector("turaIdeiZi"); assert.ok(/scrieZileTicker\(tk, randuriInchise\(rd, Date\.now\(\), GridCalcul\)\)/.test(idei), "turaIdeiZi scrie doar rândurile închise");
  assert.ok(/import \{ unesteZile, randuriInchise \} from "\.\.\/retea\/date-t212\.mjs"/.test(citeste("scripts", "colector.mjs")), "importul");
});

// ======== Task 3 (🔵12 + ideea 3): hash-ul codului fără texte ========
await test("(3) retea/hash-cod.mjs: normalizarea scoate comentariile, conținutul șirurilor și spațiile - o schimbare doar de text nu schimbă hash-ul, una de număr/logică da; amândoi antrenorii îl folosesc; fișierele din hash n-au regex cu ghilimele (gardă)", async () => {
  const H = await import("../retea/hash-cod.mjs");
  const a = 'var x = 1; // un comentariu\nfunction f(v) { return v > 2 ? "prea puține cazuri: " + v : \'alt text\'; } /* bloc */\n';
  const b = 'var x = 1; // ALT comentariu\nfunction f(v) { return v > 2 ? "cu totul alt text" + v : \'și altul\'; }   /* alt bloc */\n';
  assert.equal(H.normalizeazaCod(a), H.normalizeazaCod(b), "text și comentarii diferite ⇒ același cod normalizat");
  assert.notEqual(H.normalizeazaCod(a), H.normalizeazaCod(a.replace("v > 2", "v > 3")), "un număr schimbat se vede"); assert.notEqual(H.normalizeazaCod(a), H.normalizeazaCod(a.replace("return v", "return -v")), "logica schimbată se vede");
  assert.ok(!/comentariu|prea puține|alt text/.test(H.normalizeazaCod(a)), H.normalizeazaCod(a));
  assert.equal(H.normalizeazaCod('u("http://x.y/z"); // c'), H.normalizeazaCod('u("https://a.b/c");'), "adresa e tot un șir");
  // revizia 🔵3: o singură trecere, primul token câștigă - un „/*” dintr-un comentariu „//”, o ghilimea într-un șir simplu sau un apostrof
  // într-un bloc nu pot ascunde cod de după ele
  const n = H.normalizeazaCod;
  const a1 = "var k = 1; // fișierele din public/lib/*.js\nif (v > 2) { x(); } /* bloc */\n"; assert.notEqual(n(a1), n(a1.replace("v > 2", "v > 3")), "un „/*” dintr-un comentariu „//” nu deschide un bloc");
  const b1 = "var q = '\"'; y = s.slice(0, 2); z = \"a\";\n"; assert.notEqual(n(b1), n(b1.replace("slice(0, 2)", "slice(0, 3)")), "ghilimeaua dintr-un șir simplu nu se împerechează cu alta");
  const c1 = "/* it's */ u = 1; w = 'x'; if (v > 2) {} /* end */\n"; assert.notEqual(n(c1), n(c1.replace("v > 2", "v > 3")), "apostroful dintr-un bloc nu mănâncă „*/”");
  // revizia 🔵4: și modulele din care vin etichetele crypto, o parte din trăsături și reperul 🎲 intră în hash
  const FIS = ["public/lib/retea.js", "public/lib/arbori.js", "retea/date.mjs", "retea/verifica.mjs", "retea/model.mjs", "retea/date-t212.mjs", "retea/arbori.mjs", "public/lib/grid-calcul.js", "public/lib/actiuni-semnale.js", "public/lib/probabilitati.js"];
  for (const f of FIS) { const s = citeste(...f.split("/")); assert.ok(!/\/[^/\n ]*["'][^/\n ]*\/[gimsuy]*[ ,;)]/.test(s), f + ": regex cu ghilimele ar strica normalizarea"); assert.ok(!/\/[^/\n ]*(\/\/|\/\*)[^/\n ]*\/[gimsuy]*[ ,;)]/.test(s), f + ": regex cu „//” sau „/*” ar strica normalizarea"); const nn = n(s); assert.ok(nn.length > s.length * 0.35 && /function /.test(nn), f + ": normalizarea a înghițit codul"); }
  const h1 = H.hashCod(RAD, FIS); assert.match(h1, /^[0-9a-f]{40}$/); assert.equal(h1, H.hashCod(RAD, FIS), "stabil");
  for (const f of ["retea/antreneaza.mjs", "retea/antreneaza-arbori.mjs"]) { const s = citeste(...f.split("/")); assert.ok(/import \{ hashCod \} from "\.\/hash-cod\.mjs"/.test(s) && /const COD_HASH = hashCod\(COD, \[/.test(s), f + ": nu folosește hashCod"); for (const x of ["grid-calcul.js", "actiuni-semnale.js", "probabilitati.js"]) assert.ok(s.includes('"public/lib/' + x + '"'), f + ": " + x + " lipsește din hash"); }
});

// ======== Task 4 (ideea 2): pragul „dovedită” pe bloc ========
await test("(4) Retea.minIndep: 100 de cazuri la 24/48/72 h, 40 la blocul de 7 zile; decide citește v.oreBloc (textul „din 40”), verdict/incaLuni la fel; fără oreBloc rămâne 100", () => {
  assert.equal(R.minIndep(24), 100); assert.equal(R.minIndep(72), 100); assert.equal(R.minIndep(168), 40); assert.equal(R.minIndep(undefined), 100);
  const bun = { ic: [0.01, 0.05], icLog: [0.01, 0.03], bss3: 0.01, logloss: 0.5, loglossReper: 0.51, loglossLog: 0.52 };
  assert.equal(R.decide({ luni: 11, luniGata: 11, nIndep: 44, oreBloc: 168, ...bun }).dovedita, true, "44 de săptămâni ⇒ trece de prag (IC-ul decide)");
  assert.equal(R.decide({ luni: 11, luniGata: 11, nIndep: 35, oreBloc: 168 }).motiv, "prea puține cazuri: 35 din 40");
  assert.equal(R.decide({ luni: 11, luniGata: 11, nIndep: 44, oreBloc: 24, ...bun }).dovedita, false, "44 de zile nu ajung la 24 h"); assert.equal(R.decide({ luni: 11, luniGata: 11, nIndep: 44, oreBloc: 24 }).motiv, "prea puține cazuri: 44 din 100");
  assert.equal(R.decide({ luni: 11, luniGata: 11, nIndep: 44, ...bun }).dovedita, false, "fără oreBloc: 100");
  assert.equal(R.decide({ luni: 11, luniGata: 11, nIndep: 35, oreBloc: 168 }, true).motiv, "prea puține cazuri: 35 din 40 · încă ~2 luni", "ritmul până la 40");
  const vd = R.verdict({ tinta: "cursa", versiune: R.VERSIUNE, la: ACUM - ORA, verificare: { luni: 11, luniGata: 11, nIndep: 44, oreBloc: 168, reper: "🎲", brier: 0.24, brierReper: 0.25, ...bun } }, ACUM);
  assert.equal(vd.dovedita, true); assert.equal(R.eticheta(vd), "dovedită pe 44 de săptămâni");
});

// ======== Task 5 (ideea 4): costul porții în plaja perechilor lui ========
await test("(5) Retea.plajaCost / intrareCumparare: costul în afara plajei perechilor lui (p5–p95 de la 20 de perechi, min–max sub) se judecă pe mediană și rândul spune „judecat la suma ta obișnuită”; în plajă nimic nou; și arborii", () => {
  const ist = Array.from({ length: 40 }, (_, k) => ({ ticker: "AAA_US_EQ", inchis: ACUM - (k + 2) * ZI, cost: 500 + k * 25, rezultat: k % 2 ? 30 : -20 }));
  const pl = R.plajaCost(ist); assert.ok(pl.jos > 500 && pl.jos <= 560 && pl.sus >= 1440 && pl.sus < 1475, JSON.stringify(pl));
  const putine = ist.slice(0, 8); assert.deepEqual(R.plajaCost(putine), { jos: 500, sus: 675 }, "sub 20 de perechi: min–max"); assert.equal(R.plajaCost([]), null);
  assert.deepEqual(R.costInPlaja(900, ist), { cost: 900, inPlaja: true }); assert.deepEqual(R.costInPlaja(5000, ist), { cost: R.costTipic(ist), inPlaja: false }); assert.deepEqual(R.costInPlaja(100, ist), { cost: R.costTipic(ist), inPlaja: false });
  assert.deepEqual(R.costInPlaja(5000, []), { cost: 5000, inPlaja: true }, "fără perechi nu există plajă");
  const b = bareZi(400, 100, 11), q = bareZi(400, 300, 5), por = b[b.length - 1].t + 2 * ZI;
  const f1 = R.intrareCumparare({ ticker: "AAA_US_EQ", pornit: por, cost: 900 }, b, q, ist), f2 = R.intrareCumparare({ ticker: "AAA_US_EQ", pornit: por, cost: 9000 }, b, q, ist), f3 = R.intrareCumparare({ ticker: "AAA_US_EQ", pornit: por, cost: R.costTipic(ist) }, b, q, ist);
  assert.ok(f1 && f2 && f3); assert.equal(f1.inPlaja, true); assert.equal(f2.inPlaja, false); assert.deepEqual(f2.x, f3.x, "în afara plajei intrarea e cea de la mediană");
  const mT = { "rezultat-t212": { tinta: "rezultat-t212", versiune: R.VERSIUNE, la: ACUM - ORA, verificare: null } }, rtT = { la: ACUM, v: R.VERSIUNE, p: {} };
  const l = R.randuri(mT, rtT, [], { acum: ACUM, codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire: { p: 0.61, rata: 0.57, n: 40, inPlaja: false } });
  const rp = l.find((x) => x.cod === "rezultat-t212"); assert.ok(rp, JSON.stringify(l)); assert.match(rp.text, /rata ta: 57% · judecat la suma ta obișnuită/); String(rp.text).split("\n").forEach(oPropozitie);
  const l2 = R.randuri(mT, rtT, [], { acum: ACUM, codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire: { p: 0.61, rata: 0.57, n: 40, inPlaja: true } }); assert.ok(!/obișnuită/.test(l2.find((x) => x.cod === "rezultat-t212").text));
  assert.ok(/inPlaja: f\.inPlaja/.test(fnDin("retea.js", "pentruCumparare")) && /inPlaja: f\.inPlaja/.test(fnDin("arbori.js", "pentruCumparare")), "pentruCumparare (🧠 și 🌳) dau inPlaja mai departe");
  const s = situatii().filter((x) => x.mod === "retea" && /suma ta obișnuită/.test(x.text)); assert.ok(s.length >= 1, "garda n-are situația „la suma ta obișnuită”");
});

// ======== Task 6 (🔵7 + ideea 1): rândul Busolei spune ce judecă, cu monede și așteptare ========
const BZ = (retea, la, extra) => ({ la: la === undefined ? ACUM - ORA : la, retea, ...(extra || {}) });
const BATE = { judecate: 240, independente: 131, brier: 0.2101, brierBaza: 0.2402, castig: 0.125, icJos: 0.02, icSus: 0.2, verdict: "bate rata de bază" };
const ZERO = { judecate: 0, independente: 0, brier: null, brierBaza: null, castig: null, icJos: null, icSus: null, verdict: "prea puține" };
await test("(6b) Retea.textBusola dă 1–2 rânduri: primul spune că judecă marginile gridului în 24 h și verdictul, al doilea cifrele (predicții, independente, monede, în așteptare, vechimea); fără simboluri/asteptare (bilanț vechi) rândurile stau fără ele; subsol le pune primele; ≤ 160 la 5 cifre + 20 de zile; ruta și din-busola lasă câmpurile noi să treacă", async () => {
  assert.equal(R.textBusola(null, ACUM), null);
  assert.deepEqual(R.textBusola(BZ(ZERO), ACUM), ["🧭 Busola, pe marginile gridului în 24 h: nicio predicție 🧠 judecată încă (le judecă după ce le trece orizontul)."]);
  assert.deepEqual(R.textBusola(BZ(ZERO, undefined, { trimise: 2 }), ACUM), ["🧭 Busola, pe marginile gridului în 24 h: nicio predicție 🧠 judecată încă · Radarul îi trimite acum 2 predicții, le judecă după orizont."]);
  assert.deepEqual(R.textBusola(BZ({ ...ZERO, asteptare: 7 }, undefined, { trimise: 2 }), ACUM), ["🧭 Busola, pe marginile gridului în 24 h: nicio predicție 🧠 judecată încă · Radarul îi trimite acum 2 predicții, 7 așteaptă la ea."]);
  assert.deepEqual(R.textBusola(BZ({ ...ZERO, asteptare: 0 }, undefined, { trimise: 2 }), ACUM), ["🧭 Busola, pe marginile gridului în 24 h: nicio predicție 🧠 judecată încă · Radarul îi trimite acum 2 predicții, le judecă după orizont."], "0 în așteptare = Busola n-a rulat încă, nu legătură ruptă (revizia 🔵6)");
  assert.deepEqual(R.textBusola(BZ({ ...ZERO, asteptare: 17 }, ACUM - 20 * ZI, { trimise: 0 }), ACUM), ["🧭 Busola, pe marginile gridului în 24 h: nicio predicție 🧠 judecată încă · Radarul nu-i trimite nimic acum · 17 așteaptă la ea · de acum 20 de zile."]);
  assert.deepEqual(R.textBusola(BZ(ZERO, undefined, { trimise: 0 }), ACUM), ["🧭 Busola, pe marginile gridului în 24 h: nicio predicție 🧠 judecată încă · Radarul nu-i trimite nimic acum (fără boți sau fără model)."]);
  assert.deepEqual(R.textBusola(BZ(BATE), ACUM), ["🧭 Busola, pe marginile gridului în 24 h: Brier 0,210 (rata de bază 0,240) ⇒ bate rata de bază.", "🧭 240 de predicții 🧠 judecate, 131 de independente."]);
  assert.deepEqual(R.textBusola(BZ({ ...BATE, simboluri: 12, asteptare: 7 }, ACUM - 3 * ZI), ACUM), ["🧭 Busola, pe marginile gridului în 24 h: Brier 0,210 (rata de bază 0,240) ⇒ bate rata de bază.", "🧭 240 de predicții 🧠 judecate, 131 de independente pe 12 monede · 7 așteaptă la Busola · de acum 3 zile."]);
  assert.deepEqual(R.textBusola(BZ({ ...BATE, simboluri: 12, asteptare: 0 }), ACUM)[1], "🧭 240 de predicții 🧠 judecate, 131 de independente pe 12 monede.", "0 în așteptare nu se scrie");
  assert.deepEqual(R.textBusola(BZ({ ...BATE, verdict: "prea puține", simboluri: 9 }), ACUM)[0], "🧭 Busola, pe marginile gridului în 24 h: prea puține monede ca să judece (9 monede, cere 10).");
  assert.deepEqual(R.textBusola(BZ({ ...BATE, verdict: "prea puține" }), ACUM)[0], "🧭 Busola, pe marginile gridului în 24 h: prea puține monede ca să judece (cere 10).", "fără simboluri în bilanț");
  assert.deepEqual(R.textBusola(BZ({ ...BATE, independente: 50, judecate: 60, verdict: "prea puține" }), ACUM)[0], "🧭 Busola, pe marginile gridului în 24 h: prea puține ca să judece (cere 100 de independente).");
  assert.match(R.textBusola(BZ({ ...BATE, verdict: "mai prost" }), ACUM)[0], /⇒ mai prost decât rata de bază\.$/); assert.match(R.textBusola(BZ({ ...BATE, verdict: "n-am aflat" }), ACUM)[0], /⇒ n-am aflat \(IC cuprinde 0\)\.$/);
  assert.deepEqual(R.textBusola(BZ({ ...BATE, brier: null, brierBaza: null, verdict: "n-am aflat" }), ACUM)[0], "🧭 Busola, pe marginile gridului în 24 h: n-am aflat (IC cuprinde 0).");
  assert.match(R.textBusola(BZ({ ...BATE, judecate: 1, independente: 1, simboluri: 1 }), ACUM)[1], /^🧭 1 predicție 🧠 judecată, 1 independentă pe 1 monedă\.$/);
  const GREU = { ...BATE, judecate: 12345, independente: 10123, simboluri: 12, asteptare: 123 };
  [GREU, { ...GREU, verdict: "mai prost" }, { ...GREU, verdict: "n-am aflat" }, { ...GREU, verdict: "prea puține" }, { ...ZERO, asteptare: 123 }].forEach((r) => R.textBusola(BZ(r, ACUM - 20 * ZI, { trimise: 12 }), ACUM).forEach(oPropozitie));
  const modele = { "atinge-24": { tinta: "atinge-24", versiune: R.VERSIUNE, la: ACUM - ORA, verificare: null } };
  const l = R.subsol(modele, null, { busola: BZ({ ...BATE, simboluri: 12, asteptare: 7 }), acum: ACUM }); assert.equal(l.length, 3, JSON.stringify(l)); assert.match(l[0], /^🧭 Busola, pe marginile/); assert.match(l[1], /^🧭 240 de predicții/); assert.match(l[2], /neverificată încă/);
  assert.equal(R.subsol(modele, null, { busola: BZ(BATE), actiuni: true }).some((x) => /^🧭/.test(x)), false, "pe acțiuni nu");
  const { bilantDinBusola } = await import("./lib/din-busola.mjs");
  const b = bilantDinBusola({ la: ACUM, retea: { ...BATE, simboluri: 12, asteptare: 7, extra: 1 } }, 2); assert.equal(b.retea.simboluri, 12); assert.equal(b.retea.asteptare, 7); assert.equal("extra" in b.retea, false);
  assert.equal("simboluri" in bilantDinBusola({ la: ACUM, retea: BATE }, 2).retea, false, "fără ele în fișier ⇒ lipsesc (nu 0)"); assert.equal("simboluri" in bilantDinBusola({ la: ACUM, retea: { ...BATE, simboluri: "12" } }, 2).retea, false, "text ⇒ lipsă");
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=busolaRetea", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.2", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=busolaRetea", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.2" } }), env: ENV });
  assert.equal((await post({ la: ACUM, retea: { ...BATE, simboluri: -1 } })).status, 400, "simboluri negativ"); assert.equal((await post({ la: ACUM, retea: { ...BATE, asteptare: "7" } })).status, 400, "asteptare text");
  assert.equal((await post({ la: ACUM, retea: { ...BATE, simboluri: 12, asteptare: 7 }, trimise: 2 })).status, 200); let j = await (await get()).json(); assert.equal(j.busolaRetea.retea.simboluri, 12); assert.equal(j.busolaRetea.retea.asteptare, 7);
  assert.equal((await post({ la: ACUM + 1, retea: BATE })).status, 200); j = await (await get()).json(); assert.equal("simboluri" in j.busolaRetea.retea, false, "fără ele ⇒ fără chei");
  const s = situatii().filter((x) => x.mod === "retea" && /^busola:/.test(x.sit)); assert.ok(s.some((x) => /pe 12 monede/.test(x.text)) && s.some((x) => /așteaptă la (ea|Busola)/.test(x.text)), "garda fără monede/așteptare");
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length); assert.equal(rele.length, 0, rele.map((q) => q.x.sit + ": " + q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
});

// ======== Task 8 (el: „nu le văd pe toate, scoate-le mai mult în evidență”): rândul-rezumat permanent + cartela 🎲 deschisă ========
await test("(7) Retea.rezumat: un rând cu ținta care contează (marginea împotriva botului în 24 h; pe acțiuni direcția pe 5 zile, scurt) cu 🧠 · 🌳 · 🎲, starea și lichidarea; Tabloul îl pune sub semafor și deschide cartela 🎲, fișa sub verdict, T212 pe rândul poziției; garda îl are", () => {
  const v0 = { luni: 11, luniGata: 11, nIndep: 312, oreBloc: 24, reper: "🎲", brier: 0.1834, brierReper: 0.1801, brierLog: 0.1822, ic: [-0.0412, 0.0123], icLog: [-0.02, 0.01], bss3: -0.004, logloss: 0.5412, loglossReper: 0.5388, loglossLog: 0.54 };
  const bun = { ic: [0.012, 0.081], icLog: [0.004, 0.03], bss3: 0.02, brier: 0.17, logloss: 0.52, loglossLog: 0.53 };
  const mod = (ver, v) => { const m = {}; for (const t of Object.keys(R.TINTE)) m[t] = { tinta: t, versiune: ver, la: ACUM - ORA, verificare: { ...v, oreBloc: R.TINTE[t].bloc } }; return m; };
  const RT = { la: ACUM, v: R.VERSIUNE, p: { "iese-jos-24": 0.26, "iese-sus-24": 0.21, lichidare: 0.01, directie5: 0.52 } }, RA = { la: ACUM, v: R.VERSIUNE_ARBORI, p: { "iese-jos-24": 0.25, "iese-sus-24": 0.23, lichidare: 0.07, directie5: 0.48 } };
  const ZAR = [{ cod: "iese-jos-24", titlu: "Atinge marginea de jos (88) în 24 h", p: 0.61 }, { cod: "iese-sus-24", titlu: "Atinge marginea de sus (92) în 24 h", p: 0.48 }];
  const mD = mod(R.VERSIUNE, { ...v0, ...bun }), aD = mod(R.VERSIUNE_ARBORI, { ...v0, ...bun }), mN = mod(R.VERSIUNE, v0), aN = mod(R.VERSIUNE_ARBORI, v0);
  assert.equal(R.rezumat(mD, RT, ZAR, { acum: ACUM, dir: "long" }, { modele: aD, rt: RA }), "Marginea de jos în 24 h: 🧠 26% · 🌳 25% · 🎲 61% · amândouă dovedite · lichidarea în 7 zile: 🧠 1% · 🌳 7% · amândouă dovedite");
  assert.equal(R.rezumat(mD, RT, ZAR, { acum: ACUM, dir: "short" }, { modele: aN, rt: RA }), "Marginea de sus în 24 h: 🧠 21% · 🌳 23% · 🎲 48% · 🧠 dovedită, 🌳 nu · lichidarea în 7 zile: 🧠 1% · 🌳 7% · 🧠 dovedită, 🌳 nu");
  assert.equal(R.rezumat(mN, RT, ZAR, { acum: ACUM, dir: "long" }, null), "Marginea de jos în 24 h: 🧠 26% · 🎲 61% · nedovedită · lichidarea în 7 zile: 🧠 1% · nedovedită");
  assert.equal(R.rezumat(null, null, ZAR, { acum: ACUM, dir: "long" }, { modele: aD, rt: RA }), "Marginea de jos în 24 h: 🌳 25% · 🎲 61% · dovedită · lichidarea în 7 zile: 🌳 7% · dovedită", "doar arborii");
  const mL = { ...mD, "atinge-168": { ...mD["atinge-168"], verificare: { ...v0, oreBloc: 168 } } };   /* revizia 🟡2: lichidarea cu starea EI, nu a mărginii */
  assert.equal(R.rezumat(mL, RT, ZAR, { acum: ACUM, dir: "long" }, { modele: aD, rt: RA }), "Marginea de jos în 24 h: 🧠 26% · 🌳 25% · 🎲 61% · amândouă dovedite · lichidarea în 7 zile: 🧠 1% · 🌳 7% · 🌳 dovedită, 🧠 nu");
  assert.equal(R.rezumat(mD, RT, ZAR, { acum: ACUM, dir: "neutru" }, { modele: aD, rt: RA }), "Marginea de jos în 24 h: 🧠 26% · 🌳 25% · 🎲 61% · amândouă dovedite · lichidarea în 7 zile: 🧠 1% · 🌳 7% · amândouă dovedite", "neutru: marginea cu cifra 🧠 mai mare (revizia 🔵7)");
  assert.equal(R.rezumat(mD, { ...RT, p: { ...RT.p, "iese-sus-24": 0.3 } }, ZAR, { acum: ACUM, dir: "neutru" }, null), "Marginea de sus în 24 h: 🧠 30% · 🎲 48% · dovedită · lichidarea în 7 zile: 🧠 1% · dovedită", "neutru: sus când sus e mai probabil");
  assert.equal(R.rezumat(mD, { la: ACUM, v: R.VERSIUNE, p: { lichidare: 0.01 } }, ZAR, { acum: ACUM, dir: "long" }, null), "Lichidarea în 7 zile: 🧠 1% · dovedită", "marginea în afara grilei: rândul doar cu lichidarea");
  assert.equal(R.rezumat(null, null, ZAR, { acum: ACUM }, null), null, "fără nicio cifră");
  assert.equal(R.rezumat(mN, RT, null, { acum: ACUM, cod: "directie5", scurt: true }, { modele: aN, rt: RA }), "🧠 52% · 🌳 48% · niciuna dovedită", "T212, scurt");
  assert.equal(R.rezumat(mD, { ...RT, v: "r0" }, ZAR, { acum: ACUM, dir: "long" }, null), null, "altă versiune a trăsăturilor ⇒ nimic");
  [R.rezumat(mD, RT, ZAR, { acum: ACUM, dir: "long" }, { modele: aD, rt: RA }), R.rezumat(mN, RT, ZAR, { acum: ACUM, dir: "short" }, { modele: aN, rt: RA })].forEach(oPropozitie);
  const app = citeste("public", "app.js"); assert.ok(/function tbRezumatHtml\(t\)/.test(app) && /cons\.rezumat=tbProb&&tbProb\.rezumat\|\|null/.test(app) && /<\/h3>'\+tbRezumatHtml\(c\.rezumat\)/.test(app), "Tabloul: rândul sub eticheta verdictului (tbConsHtml)"); assert.ok(/tbProb\.rezumat=.*Retea\.rezumat\(reteaM\.m,rez\.retea\|\|null,l,\{acum:Date\.now\(\),dir:b\.directie\}/.test(app), "Tabloul: Retea.rezumat pe cifrele colectorului");
  assert.ok(/id="grRezumat"/.test(app) && /rz\.textContent=tz\|\|""/.test(app), "fișa: rândul sub verdict"); assert.ok(/<details class="tbPl" id="tbPl-prob" open hidden>/.test(citeste("public", "index.html")), "cartela 🎲 deschisă implicit");
  const e = citeste("public", "lib", "t212-ecran.js"); assert.ok(/function t212ModeleRand\(p\)/.test(e) && /cod: "directie5", scurt: true/.test(e), "T212: pe rândul poziției");
  assert.ok(/<\/span>' \+ t212ModeleRand\(p\) \+ '<\/div><\/div><\/td>'/.test(e) && !/t212ModeleRand\(p\) \+ '<\/td>'/.test(e), "T212: în prima celulă (vizibilă și pe telefon, revizia 🔵5), nu în coloana trend ascunsă sub 640 px"); assert.ok(/'peste 5 zile: ' \+ escapeHtml\(t\)/.test(e), "cu prefix vizibil");
  const css = citeste("public", "app.css"); assert.ok(/\.tbRezumat\{/.test(css) && /\.t212Modele\{/.test(css) && !/\.t212Modele\{[^}]*nowrap/.test(css), "stilurile (fără nowrap: tabelul nu se lățește la 1.100–1.400 px)");
  assert.ok(/\.t212Tab tr\.t212Rand \.t212Sim \.t212Mic\.t212Modele\{display:block/.test(css), "pe telefon rândul modelelor rămâne la vedere (regula care ascunde .t212Mic din prima celulă sub 640 px nu-l atinge)");
  assert.ok(/\.t212Tab tr\.t212Rand\{grid-template-columns:minmax\(0,1fr\) auto\}/.test(css) && /\.t212Tab tr\.t212Rand \.t212Sim>div\{min-width:0\}/.test(css), "pe telefon prima coloană a fișei poziției se poate strânge: rândul lung se împachetează, rezultatul (lei) nu mai iese din card");
  const s = situatii().filter((x) => x.mod === "retea" && /^rezumat:/.test(x.sit)); assert.ok(s.length >= 6, "situații rezumat: " + s.length);
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length); assert.equal(rele.length, 0, rele.map((q) => q.x.sit + ": " + q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
});

// ======== revizia Opus (04.10, v100.96): pasul de reparații - fiecare văzut ROȘU întâi ========
await test("(R1) 🟡1: după schimbarea botului sau o reîmprospătare picată, rândul de sub verdict nu rămâne cu cifrele altui bot - tbDeseneazaProb îl golește (și pe ecran) ÎNAINTE de ieșirile timpurii (fără rez / rez.gol)", () => {
  const f = fnApp("tbDeseneazaProb"); const iReset = f.indexOf("tbProb.rezumat=null"), iFara = f.indexOf("if(!rez){card.hidden=true;return}"), iGol = f.indexOf("if(rez.gol)");
  assert.ok(iReset >= 0 && iFara > 0 && iGol > 0, "ancorele"); assert.ok(iReset < iFara && iReset < iGol, "golirea stă înaintea ieșirilor timpurii");
  assert.ok(/rz1\.hidden=true;rz1\.textContent=""/.test(f.slice(0, iFara)), "și pe ecran rândul se ascunde la golire");
});

// ======== Task 7: versiunile ========
await test("(E) versiunile: pagina de la v100.96 în sus (BUILD_INFO, versiune.js, sw, index ×4, package.json, lanțul cu v10096), colectorul de la v101.66 în sus, Busola de la 1.43.0 în sus - versiunea merge înainte (v100.97 a lărgit-o)", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.9[6-9]$/, "de la 96 în sus"); const V = bi.version; assert.ok(bi.badge.startsWith(V + " · "), "badge-ul cu versiunea");
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V + '";'), "versiune.js");
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V.replace(".", "-") + '";'), "sw.js");
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V.replace(".", "\\."), "g")) || []).length, 4, "index.html ×4"); assert.ok(!/v100\.95/.test(ix), "index.html mai are v100.95");
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V.slice(1) + ".0"); assert.ok(/npm run test:v10095 && npm run test:v10096( && |")/.test(pk), "lanțul de teste"); assert.equal(JSON.parse(pk).scripts["test:v10096"], "node scripts/proba-v10096.mjs");
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v(?:101\.(?:6[6-9]|[7-9]\d|\d{3,})|10[2-9]\.\d+|1[1-9]\d\.\d+)";/, "cel putin v101.66");
  const bv = JSON.parse(fs.readFileSync("C:/Users/Cimin/busola/package.json", "utf8")).version.split(".").map(Number);
  assert.ok(bv[0] > 1 || (bv[0] === 1 && (bv[1] > 43 || (bv[1] === 43 && bv[2] >= 0))), "Busola de la 1.43.0 în sus: " + bv.join("."));
});

console.log("\n" + (pica ? "✗ " + pica + " picate, " + ok + " trecute" : "✓ toate cele " + ok + " teste au trecut"));
process.exit(pica ? 1 : 0);
