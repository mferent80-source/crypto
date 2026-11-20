// Proba v100.372 (20.11.2026, el: „fa ideea”): textele robotului de lățime cu FORMĂ NECUNOSCUTĂ strigă, nu mai trec netraduse pe Piața azi.
// Până acum aflam de ele din întâmplare (proba de telefon pica pe minusul ASCII). Acum: LatimeUS.formeNecunoscute(j) ține lista formelor
// scrise de robot (breadth_dashboard.py, confirmation.py, intermarket.py, sector_ideas.py), iar paza paginilor (VPS, 07:50) o întreabă zilnic.
// Lista e cinstită doar dacă fiecare formă cunoscută iese și tradusă ⇒ testul 3 trece toate formele prin pagină.
//   node scripts/proba-v100372.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { mesaj } from "./lib/paza-pagini.mjs";
import { abateriRobot, citesteRobot, incarcaLatimeUS } from "./lib/paza-robot-latime.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.372 · formele textelor robotului de lățime · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "latime-us.js"), ctx);
const LU = ctx.LatimeUS, ACUM = Date.parse("2026-11-20T12:00:00Z");
const simplu = (x) => JSON.parse(JSON.stringify(x));   /* obiectele din vm au alt prototip ⇒ deepEqual le vrea simple */
const MB = (o) => ({ schemaVersion: 1, sources: { sp500: { history: [{ date: "2026-11-19", above200: 0.5 }], latest: { date: "2026-11-19", above200: 0.5, above50: 0.4, ma8: 0.45, ma200: 0.6, bearish: true } },
  uptrend: { history: [{ date: "2026-11-19", ratio: 0.17 }], market: { ratio: 0.17, ma10: 0.15, trend: "up", count: 480, total: 2775 }, sectors: [] } },
  full: { engine: { data: Object.assign({ sp: { score: 27, zone: "Weakening", exposure: "40-60%", weakest: "Bearish Signal Status (10)", data_date: "2026-11-19", extra: o.extra === undefined ? "momentum(8/200MA) 35" : o.extra } }, o.surse || {}),
    master: { score: -2, stance: o.stance || "PRUDENTA / DEFENSIV", action: o.action === undefined ? "Redu expunerea, ridica cash, doar setup-uri A+. Protejeaza castigurile." : o.action,
      confidence: o.conf === undefined ? "MEDIE - acoperire partiala sau consens insuficient" : o.conf, net_ceiling: 40, scorecard: o.card || [] }, analysis: { flags: o.flags || [] } },
    ideas: { asOf: "2026-11-19", nh_nl: { new_highs: 9, new_lows: 23, net: -14 } } } });

// TOATE formele din sursa robotului (20.11.2026), brute
const POZITII = [["RISK-ON", "Poti tine pozitii pline; favorizeaza lideri cu forta relativa."], ["CONSTRUCTIV", "Adauga selectiv in lideri; stopuri normale."], ["MIXT / PRUDENTA SELECTIVA", "Selectiv, pozitii noi mai mici, stopuri stranse. Nu supra-dimensiona."],
  ["PRUDENTA / DEFENSIV", "Redu expunerea, ridica cash, doar setup-uri A+. Protejeaza castigurile."], ["RISK-OFF", "Prezervare capital; fara pozitii noi speculative; asteapta stabilizare."], ["NEVERIFICAT", "Breadth indisponibil; verdict suspendat."]];
const INCREDERI = ["SCAZUTA - semnale in conflict (1 pozitive / 4 negative)", "RIDICATA - dimensiunile sunt aliniate", "MEDIE - acoperire partiala sau consens insuficient", "INSUFICIENTA"];
const CARD = ["Risk-ON larg", "INGUST (risc ridicat)", "Risk-OFF", "Constructiv, selectiv", "Mixt / racire", "Date indisponibile"].map((v) => ["Breadth participare (4/4 surse valide)", 0, v + " (idx 41.4, min 27.0)"]).concat([
  ["Breadth participare (2/4 surse valide)", 0, "Risk-OFF (idx 34.1, min 24.3) ⚠️ STALE 9z - vot neutralizat"], ["Breadth participare (3/4 surse valide)", 0, "Mixt / racire (idx 41.4, min 27.0) (date vechi de 5z)"],
  ["Market timing (distribution days)", -2, "max 9 dist.days, 3/3 sub MM50, follow-through recent"], ["Market timing (distribution days)", 1, "max 2 dist.days, 0/3 sub MM50"],
  ["Confirmare risc (VIX/credit/breadth pret)", 2, "RISK-ON confirmat (VIX 16.6)"], ["Confirmare risc (VIX/credit/breadth pret)", -2, "RISK-OFF confirmat (VIX ?)"], ["Confirmare risc (VIX/credit/breadth pret)", 0, "Mixt / neconcludent (VIX 28.4)"],
  ["New Highs - New Lows", 1, "40▲/3▼ (net +37), sanatos (NH domina)"], ["New Highs - New Lows", -1, "9▲/23▼ (net -14), slab (NL domina)"], ["New Highs - New Lows", 0, "12▲/12▼ (net +0), mixt"],
  ["Intermarket / macro", 1, "Macro RISK-ON (VIX term 0.92)"], ["Intermarket / macro", -2, "Macro RISK-OFF (VIX term 1.052)"], ["Intermarket / macro", 0, "Macro neutru/mixt (VIX term ?)"],
  ["Washout contrarian (8MA<0.40)", 1, "istoric BULLISH (+9.9%/60z)"], ["Small-caps", -1, "raman in urma (risk-off incipient)"], ["Small-caps", 1, "conduc (risk-on)"]]);
const STEAGURI = [["narrow_market", "⚠️ Piata larga (2800) 31.2 << large-cap 52.4 → raliu INGUST: RISC/volatilitate ridicata (nu implica randament slab - vezi backtest)"],
  ["washout_contrarian", "✓ CONTRARIAN: 8MA 0.38 < 0.40 = washout. Istoric BULLISH: +9.9%/60z (81% pozitiv). Urmareste trough pt re-intrare."],
  ["low_breadth_watch", "ⓘ 8MA 0.45 < 0.50 (piata selectiva). Istoric: randamente forward PESTE medie (+3pp/60z) dar drawdown mai mare."],
  ["smallcap_lag", "⚠️ Small-caps 31.5 raman in urma → apetit de risc in scadere"], ["smallcap_lead", "✓ Small-caps 71.5 conduc → risk-on sanatos"]];
const SURSE = { uptrend: { score: 24.3, zone: "Cautious", exposure: "Defensive (30-60%)", weakest: "Market Breadth (Overall) (5)", extra: "fara warning-uri" }, ndx: { score: 55, zone: "Neutral", exposure: "60-75%", weakest: "momentum MM50 (41.2%)", extra: ">MM200 49.0% | >MM50 41.2%" },
  r2k: { score: 40, zone: "Weakening", exposure: "40-60%", weakest: "trend MM200 (38.5%)", extra: ">MM200 38.5% | >MM50 44.1%" } };
const TOATE = POZITII.map(([stance, action], i) => MB({ stance, action, conf: INCREDERI[i % INCREDERI.length], card: CARD, flags: STEAGURI, surse: SURSE }))
  .concat([MB({ surse: { uptrend: Object.assign({}, SURSE.uptrend, { extra: "3 warning-uri" }) }, extra: "" }), MB({ extra: "momentum(8/200MA) 62.5", action: "", conf: "" })]);

await test("fiecare formă din sursa robotului e cunoscută: nimic de strigat (și datele din 20.11, cum au venit)", () => {
  for (const j of TOATE) assert.deepEqual(simplu(LU.formeNecunoscute(j)), []);
  const azi = MB({ stance: "RISK-OFF", action: "Prezervare capital; fara pozitii noi speculative; asteapta stabilizare.", conf: "SCAZUTA - semnale in conflict (1 pozitive / 4 negative)", surse: { uptrend: SURSE.uptrend },
    card: [["Breadth participare (2/4 surse valide)", -2, "Risk-OFF (idx 34.1, min 24.3)"], ["Market timing (distribution days)", -1, "max 9 dist.days, 3/3 sub MM50, follow-through recent"], ["Confirmare risc (VIX/credit/breadth pret)", 1, "Mixt / neconcludent (VIX 28.4)"],
      ["New Highs - New Lows", -1, "9▲/23▼ (net -14), slab (NL domina)"], ["Intermarket / macro", -2, "Macro RISK-OFF (VIX term 1.052)"]] });
  assert.deepEqual(simplu(LU.formeNecunoscute(azi)), []);
});

await test("o formă NOUĂ strigă, cu locul ei: rând de scor, dimensiune nouă, steag, îndemn, încredere, poziție, rândul sursei", () => {
  const una = (o) => simplu(LU.formeNecunoscute(MB(o)));
  assert.deepEqual(una({ card: [["Market timing (distribution days)", -1, "max 9 dist.days, 3/3 sub MM50, rally attempt day 4"]] }), [{ unde: "scorecard · Market timing (distribution days)", text: "max 9 dist.days, 3/3 sub MM50, rally attempt day 4" }]);
  assert.deepEqual(una({ card: [["Sentiment (put/call)", 1, "frica extrema (1.32)"]] }), [{ unde: "scorecard · rând nou", text: "Sentiment (put/call): frica extrema (1.32)" }]);
  assert.deepEqual(una({ card: [["New Highs - New Lows", -1, "9▲/23▼ (net -14), foarte slab (NL domina)"]] }).map((x) => x.unde), ["scorecard · New Highs - New Lows"]);
  /* textul unei dimensiuni pus la alta nu trece drept cunoscut */
  assert.equal(una({ card: [["Small-caps", 1, "Macro RISK-ON (VIX term 0.92)"]] }).length, 1);
  assert.deepEqual(una({ flags: [["sector_rotation", "⚠️ Rotatie defensiva: utilitatile conduc de 5z"]] }), [{ unde: "steag", text: "⚠️ Rotatie defensiva: utilitatile conduc de 5z" }]);
  assert.deepEqual(una({ action: "Asteapta confirmarea; fara graba." }).map((x) => x.unde), ["îndemnul"]);
  assert.deepEqual(una({ conf: "MEDIE - doua surse lipsa" }).map((x) => x.unde), ["încrederea"]);
  assert.deepEqual(una({ stance: "CAPITULARE" }), [{ unde: "poziția", text: "CAPITULARE" }]);
  assert.deepEqual(una({ extra: "momentum(8/200MA) in crestere" }).map((x) => x.unde), ["sursa S&P 500 Breadth Index"]);
  assert.deepEqual(una({ surse: { ndx: Object.assign({}, SURSE.ndx, { extra: ">MM200 None% | >MM50 None%" }) } }).map((x) => x.unde), ["sursa Nasdaq 100 Breadth"]);
  /* mai multe deodată, toate */
  assert.equal(una({ stance: "CAPITULARE", action: "Stai pe margine.", flags: [["x", "ceva nou"]], card: [["Ceva", 0, "nou"]] }).length, 4);
});

await test("date stricate sau lipsă: lista e goală (pagina are deja rândul ei „datele nu s-au putut citi”), nu excepție", () => {
  for (const j of [null, undefined, {}, { full: {} }, { full: { engine: null } }, "text", { full: { engine: { master: { scorecard: "x" }, analysis: { flags: [null, "y", []] }, data: { sp: null } } } }]) assert.deepEqual(simplu(LU.formeNecunoscute(j)), []);
  assert.deepEqual(simplu(LU.formeNecunoscute(MB({ card: [null, "x", ["New Highs - New Lows", -1, "9▲/23▼ (net -14), slab (NL domina)"]] }))), []);
});

// ce NU are voie să rămână într-un text cunoscut, după traducere: cuvinte fără diacritice, punct zecimal, minus ASCII ca semn, „60z”
const NETRADUS = /\b(fara|pozitii|piata|larga|raman|urma|sanatos|domina|scadere|racire|ridicata|scazuta|insuficienta|Poti|tine|favorizeaza|forta|relativa|Adauga|INGUST|implica|Urmareste|pret|warning-uri|asteapta|stranse|castigurile|Protejeaza|ridica|selectiva|pt)\b| in |\d\.\d{1,2}(?!\d)|\d+z\b|(^|[\s(:=·/[])-(?=\d)|<<|ⓘ|⚠|✓/;
await test("lista e cinstită: fiecare formă cunoscută iese pe pagină TRADUSĂ (nicio vorbă fără diacritice, niciun punct zecimal, niciun minus ASCII)", () => {
  let vazute = 0;
  for (const j of TOATE) {
    const x = LU.extins(j, ACUM); assert.ok(x, "extins a întors null");
    const texte = [x.stanta, x.actiune, x.incredere].concat(x.scorecard.map((c) => c.ce + " · " + c.text), x.steaguri, x.surse.map((s) => s.extra));
    for (const t of texte) { vazute++; const m = NETRADUS.exec(String(t)); assert.equal(m, null, "netradus („" + (m && m[0]) + "”): " + t); }
    const card = LU.htmlCard(x).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), mc = /\b(scazuta|ridicata|insuficienta|fara|warning-uri|INGUST)\b/.exec(card);
    assert.equal(mc, null, "pe card: " + (mc && mc[0]));
  }
  assert.ok(vazute > 200, "prea puține texte văzute: " + vazute);
});

await test("traducerile adăugate acum (găsite citind sursa): încrederea, „fără avertismente”, îndemnurile de sus, „îngust”, steagurile", () => {
  const x = (o) => LU.extins(MB(o), ACUM), sc = (o) => x(o).scorecard[0];
  assert.deepEqual(INCREDERI.map((c) => x({ conf: c }).incredere), ["scăzută", "ridicată", "medie", "insuficientă"]);
  assert.match(LU.htmlCard(x({ conf: INCREDERI[0] })), /încredere scăzută/);
  const up = (extra) => x({ surse: { uptrend: Object.assign({}, SURSE.uptrend, { extra }) } }).surse.find((s) => s.cheie === "uptrend").extra;
  assert.equal(up("fara warning-uri"), "fără avertismente"); assert.equal(up("1 warning-uri"), "1 avertisment"); assert.equal(up("3 warning-uri"), "3 avertismente"); assert.equal(up("21 warning-uri"), "21 de avertismente");
  assert.equal(x({ stance: "RISK-ON", action: POZITII[0][1] }).actiune, "Poți ține poziții pline; favorizează lideri cu forță relativă.");
  assert.equal(x({ stance: "CONSTRUCTIV", action: POZITII[1][1] }).actiune, "Adaugă selectiv în lideri; stopuri normale.");
  assert.equal(sc({ card: [CARD[1]] }).text, "4/4 surse valide · îngust (risc ridicat) · media 41,4, minimul 27");
  assert.deepEqual([sc({ card: [["Washout contrarian (8MA<0.40)", 1, "istoric BULLISH (+9.9%/60z)"]] })].map((c) => c.ce + " ¦ " + c.text), ["Washout contrarian ¦ 8MA sub 0,40 · istoric bullish (+9,9% la 60 de zile)"]);
  assert.deepEqual(simplu(x({ flags: STEAGURI }).steaguri), [
    "Piața largă (≈2.800 de acțiuni) la 31,2, mult sub large-cap (52,4): raliu îngust, cu risc și volatilitate ridicate (nu înseamnă randament slab, vezi backtestul).",
    "Contrarian: Breadth 8MA 38,0% (sub 40%) = washout. Istoric bullish: +9,9% la 60 de zile (81% din cazuri pe plus). Urmărește minimul (trough) pentru reintrare.",
    "Breadth 8MA 45,0%: piață selectivă. Istoric: randamente pe 60 de zile peste medie (+3 pp), dar cu căderi mai mari.",
    "Small-caps 31,5 rămân în urmă → apetit de risc în scădere", "Small-caps 71,5 conduc → risk-on sănătos"]);
  /* un steag necunoscut rămâne la vedere (cu semnul lui), nu dispare */
  assert.deepEqual(simplu(x({ flags: [["nou", "⚠️ Ceva nou de la robot"]] }).steaguri), ["⚠️ Ceva nou de la robot"]);
});

await test("paza paginilor: formele necunoscute devin abateri pe Piața azi; mesajul le spune fără „0 px” și fără „a doua deschidere”", () => {
  assert.deepEqual(abateriRobot([]), []); assert.deepEqual(abateriRobot(null), []);
  const a = abateriRobot([{ unde: "scorecard · Market timing (distribution days)", text: "max 9 dist.days, 3/3 sub MM50, rally attempt day 4" }, { unde: "steag", text: "x".repeat(300) }]);
  assert.equal(a.length, 2); assert.equal(a[0].cheie, "robot:scorecard · Market timing (distribution days):max 9 dist.days, 3/3 sub MM50, rally attempt day 4");
  assert.equal(a[0].text, "text nou de la robotul de lățime, netradus (scorecard · Market timing (distribution days)): „max 9 dist.days, 3/3 sub MM50, rally attempt day 4”");
  assert.ok(a[1].text.length < 200, "textul lung se scurtează");
  assert.equal(abateriRobot(Array.from({ length: 9 }, (_, i) => ({ unde: "steag", text: "t" + i }))).length, 5, "cel mult 5 pe mesaj");
  const m = mesaj([{ pagina: "dash", latime: 0, abateri: a.slice(0, 1) }], "dimineata");
  assert.equal(m.titlu, "Radar: o abatere pe pagini (dimineata)");
  assert.equal(m.mesaj, "Piața azi: " + a[0].text);
  /* abaterile de pagină rămân cum erau, cu lățimea și cu rândul despre a doua deschidere */
  const p = mesaj([{ pagina: "dash", latime: 412, abateri: [{ cheie: "lateral", text: "derulare laterală (+30 px)" }] }, { pagina: "dash", latime: 0, abateri: a.slice(0, 1) }], "dimineata");
  assert.equal(p.mesaj, "Piața azi · 412 px: derulare laterală (+30 px)\nPiața azi: " + a[0].text + "\nAbaterile de pagină se repetă la a doua deschidere (după un minut).");
  assert.equal(mesaj([{ pagina: "dash", latime: 412, abateri: [{ cheie: "lateral", text: "derulare laterală (+30 px)" }] }], "x").mesaj, "Piața azi · 412 px: derulare laterală (+30 px)\nSe repetă la a doua deschidere (după un minut).");
});

await test("citirea robotului din pază: codul paginii, cererea falsă; robotul căzut NU e abatere (doar se spune în jurnal)", async () => {
  assert.equal(typeof incarcaLatimeUS(RAD).formeNecunoscute, "function");
  const cere = (corp, ok) => async (u) => { assert.match(String(u), /market-breadth\/data\/latest\.json$/); return { ok: ok !== false, status: ok === false ? 503 : 200, json: async () => corp }; };
  const bun = await citesteRobot({ rad: RAD, cere: cere(TOATE[0]) });
  assert.deepEqual(bun, { abateri: [], eroare: null });
  const nou = await citesteRobot({ rad: RAD, cere: cere(MB({ flags: [["x", "⚠️ Ceva nou de la robot"]] })) });
  assert.equal(nou.eroare, null); assert.equal(nou.abateri.length, 1); assert.match(nou.abateri[0].text, /netradus \(steag\): „⚠️ Ceva nou de la robot”/);
  assert.deepEqual(await citesteRobot({ rad: RAD, cere: cere({}, false) }), { abateri: [], eroare: "HTTP 503" });
  assert.deepEqual(await citesteRobot({ rad: RAD, cere: async () => { throw new Error("fetch failed"); } }), { abateri: [], eroare: "fetch failed" });
  assert.deepEqual(await citesteRobot({ rad: RAD, cere: cere({ altceva: 1 }) }), { abateri: [], eroare: "răspuns fără full.engine" });
  /* rulatorul pazei o cheamă și pune abaterile pe Piața azi */
  const rul = citeste("scripts", "vps", "paza-pagini.mjs");
  assert.match(rul, /citesteRobot\(\{ rad: RAD \}\)/); assert.match(rul, /gasite\.push\(\{ pagina: "dash", latime: 0, abateri: rb\.abateri \}\)/);
});

await test("zonele: Uptrend Ratio cu culoare și cu vorba românească (și pe blocul din pagina de acțiuni); o zonă cu nume nou strigă", () => {
  const cu = (zone) => MB({ surse: { uptrend: Object.assign({}, SURSE.uptrend, { zone }) } });
  const cip = (zone) => (/<span class="mbZona ([^"]*)" data-conv-nume>([^<]*)<\/span>/g.exec(LU.htmlCard(LU.extins(cu(zone), ACUM)).split("<b>Uptrend Ratio</b>")[1] || "") || []).slice(1, 3).join(" ¦ ");
  assert.deepEqual(["Strong Bull", "Bull", "Neutral", "Cautious", "Bear"].map(cip), ["mbZStrong ¦ Strong Bull", "mbZHealthy ¦ Bull", "mbZNeutral ¦ Neutral", "mbZWeakening ¦ Cautious", "mbZCritical ¦ Bear"]);
  assert.equal(cip("Panic <b>"), "mbZ ¦ Panic &lt;b&gt;", "numele necunoscut: fără culoare, fără clasă ruptă");
  const bloc = (zone) => (/<div class="luZona (luZ[A-Za-z]*)">([^<]*)<\/div>/.exec(LU.htmlBloc(LU.normalizeaza(cu(zone), ACUM)).split("Participare în trend")[1] || "") || []).slice(1, 3).join(" ¦ ");
  assert.deepEqual(["Strong Bull", "Bull", "Neutral", "Cautious", "Bear"].map(bloc), ["luZStrong ¦ bull puternic", "luZHealthy ¦ bull", "luZNeutral ¦ neutru", "luZWeakening ¦ prudent", "luZCritical ¦ bear"]);
  /* zonele Breadth rămân cum erau */
  assert.match(LU.htmlBloc(LU.normalizeaza(MB({}), ACUM)), /<div class="luZona luZWeakening">slăbire<\/div>/); assert.match(LU.htmlCard(LU.extins(MB({}), ACUM)), /<span class="mbZona mbZWeakening" data-conv-nume>Weakening<\/span>/);
  for (const z of ["Strong Bull", "Bull", "Neutral", "Cautious", "Bear"]) assert.deepEqual(simplu(LU.formeNecunoscute(cu(z))), []);
  assert.deepEqual(simplu(LU.formeNecunoscute(cu("Capitulation"))), [{ unde: "zona Uptrend Ratio", text: "Capitulation" }]);
  assert.deepEqual(simplu(LU.formeNecunoscute(cu("Weakening"))).map((x) => x.unde), ["zona Uptrend Ratio"], "zona unei surse nu trece drept cunoscută la alta");
  assert.deepEqual(simplu(LU.formeNecunoscute(MB({ surse: { ndx: Object.assign({}, SURSE.ndx, { zone: "?" }) } }))), [{ unde: "zona Nasdaq 100 Breadth", text: "?" }]);
});

await test("„VIX term” cu înțelesul lui (pragurile robotului: peste 1 backwardation, sub 0,9 contango); cifra lipsă spusă pe nume", () => {
  const im = (t) => LU.extins(MB({ card: [["Intermarket / macro", 0, t]] }), ACUM).scorecard[0].text, cr = (t) => LU.extins(MB({ card: [["Confirmare risc (VIX/credit/breadth pret)", 0, t]] }), ACUM).scorecard[0].text;
  assert.equal(im("Macro RISK-OFF (VIX term 1.052)"), "Macro RISK-OFF (VIX term 1,052 · backwardation, stres acut)");
  assert.equal(im("Macro RISK-ON (VIX term 0.85)"), "Macro RISK-ON (VIX term 0,85 · contango, calm)");
  assert.equal(im("Macro neutru/mixt (VIX term 0.95)"), "Macro neutru/mixt (VIX term 0,95 · neutru)");
  assert.equal(im("Macro neutru/mixt (VIX term 1.0)"), "Macro neutru/mixt (VIX term 1,0 · neutru)"); assert.equal(im("Macro neutru/mixt (VIX term 0.9)"), "Macro neutru/mixt (VIX term 0,9 · neutru)");
  assert.equal(im("Macro neutru/mixt (VIX term ?)"), "Macro neutru/mixt (VIX term necunoscut)");
  assert.equal(cr("RISK-OFF confirmat (VIX ?)"), "VIX, credit, breadth pe preț · RISK-OFF confirmat (VIX necunoscut)"); assert.equal(cr("Mixt / neconcludent (VIX 28.4)"), "VIX, credit, breadth pe preț · mixt / neconcludent (VIX 28,4)");
});

await test("versiunile: v100.372 peste tot (de la v100.372 încolo), proba în lanț", () => {
  const pk = JSON.parse(citeste("package.json")), nr = (v) => { const m = /^100\.(\d+)\./.exec(String(v)); return m ? +m[1] : 0; };
  assert.ok(nr(pk.version) >= 372, "package.json: " + pk.version);
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 372, "sw.js");
  assert.ok(+(/v100\.(\d+)/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 372, "versiune.js");
  assert.equal(pk.scripts["test:v100372"], "node scripts/proba-v100372.mjs");
  assert.match(pk.scripts.test + " " + Object.keys(pk.scripts).filter((k) => /^test:lant-/.test(k)).map((k) => pk.scripts[k]).join(" "), /test:v100372\b/);
});

console.log(`\n${teste - picate}/${teste} teste trecute\n`);
process.exit(picate ? 1 : 0);
