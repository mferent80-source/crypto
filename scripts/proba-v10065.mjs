// Proba v100.65 (02.10, el: „FA TOT” dupa raportul reviziei pachetului 2) - 2b: ce a ramas din sfaturile concise:
// verdele fals „Piața e cu botul” (a), „stopul la zero” pe minus (b), intervalul funding-ului si botul neutru, preturile monedelor mici,
// minorele amanate (pachetul 2: M3, M4; pachetul 1: M3, M4, M7). Planul: docs/superpowers/plans/2026-10-02-sfaturi-pachetul-2b-restul.md
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Sfaturi: SF, SemnaleBot: S, Consiliu: C, Directie: D } = globalThis;
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.65 · 2b: ce a rămas după revizia pachetului 2 (sfaturile concise) · proba\n");

// botul CRV al lui (long, 0.3841–0.4331), ca in proba v100.62
const T0 = Date.UTC(2026, 9, 2, 6, 0), ORA = 3600000;
const K4 = (p, amp) => Array.from({ length: 500 }, (_, i) => { const c = p * (1 + amp * Math.sin(i / 5)); return { time: T0 - (500 - i) * 4 * ORA, open: c, high: c * 1.01, low: c * 0.99, close: c }; });
const CRV = (o) => Object.assign({ id: "2394", baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, profitTotal: -3.2, pretCurent: 0.3858, gridJos: 0.3841, gridSus: 0.4331,
  distantaLichidarePct: 30, pretLichidare: 0.3383, gridProfitBrut: 3.2, pornitLa: T0 - 4 * 86400000,
  brut: { buOrderData: { bottom: "0.3841", top: "0.4331", row: 7, perVolume: "40", position: "160", positionOpenPrice: "0.3974", marginBalance: "44.7", trend: "long", gridProfit24h: "0.40", trx24h: 6, closedExchangeOrderCount: 120 } } }, o || {});
const FARA_LINISTE = { linisteAcum: false, zileLiniste: 0, n: 13, k: 3, p: 3 / 13, ic: [0.08, 0.5], suficient: true, H: 2 };
const FISA = (o) => Object.assign({ dir: "long", directie: { dir: "long", tarie: "mediu", motive: [] }, regim: { r4h: 0.6, r24h: 0.8, miscare: false },
  liniste: { linisteAcum: true, zileLiniste: 0.4, n: 13, k: 3, p: 3 / 13, ic: [0.08, 0.5], suficient: true, H: 2 },
  setare: { jos: 0.37, sus: 0.40, grile: 6, pas: 0.014, levier: 5, levierSigur: 4, dir: "long", stop: { jos: 0.36, sus: 0.41 } } }, o || {});
const sfaturi = (bot, o = {}) => {
  const x = SF.intrare({ bot, k4: o.k4 === undefined ? K4(bot.pretCurent, 0.06) : o.k4, funding: o.funding ?? null, fundingHist: o.fundingHist ?? null,
    fisa: o.fisa === undefined ? FISA() : o.fisa, rezumat: o.rezumat || null, acum: T0 });
  Object.assign(x, o.peste || {});
  return SF.sfaturi(x);
};
const cod = (l, c) => l.find((s) => s.cod === c);
const R = (d4, d1) => [d4, d1].map((d, i) => ({ tf: i ? "1D" : "4H", eticheta: i ? "1 zi" : "4 ore", dir: d, fata: { ton: d === "coboara" ? "rau" : d === "urca" ? "bine" : "neutru" } }));

// ---- sarcina 1: (a) motivul verde al pietei spune doar ce e adevarat ----
const piata = (d4, d1, fisa) => {
  const b = CRV({ pretCurent: 0.41 }), f = fisa || FISA({ liniste: FARA_LINISTE });
  return C.alcatuieste({ sm: S.semafor({ bot: b, fisa: f }), concret: [], sfaturi: sfaturi(b, { fisa: f, rezumat: D.rezumat(R(d4, d1), "long") }) });
};
const toate = (c) => c.motive.map((m) => m.titlu).concat(c.rest.map((r) => r.titlu));
await test("(a) piața CONTRA botului: fără verdele „Piața e cu botul”; motivul galben „Piața merge împotriva botului” rămâne; verdictul ATENȚIE", () => {
  const c = piata("coboara", "coboara");
  assert.ok(!toate(c).includes("Piața e cu botul"), toate(c).join(" | "));
  assert.ok(c.motive.some((m) => m.titlu === "Piața merge împotriva botului" && m.c === "g"), toate(c).join(" | "));
  assert.equal(c.nivel, "atentie");
});
await test("(a) piața AMESTECATĂ: fără verdele „Piața e cu botul”; „Piața dă semnale amestecate” rămâne în „Restul”; verdictul neschimbat", () => {
  const c = piata("urca", "coboara");
  assert.ok(!toate(c).includes("Piața e cu botul"), toate(c).join(" | "));
  const r = c.rest.find((x) => x.titlu === "Piața dă semnale amestecate");
  assert.ok(r && /4 ore urcă, 1 zi coboară/.test(r.text), JSON.stringify(c.rest));
  assert.equal(c.nivel, "atentie");   /* ca inainte de reparatie (marginea, ritmul si setarea din fixtura) */
});
await test("(a) piața CU botul: verdele „Piața e cu botul” rămâne, cu concluzia direcției", () => {
  const c = piata("urca", "urca"), m = c.motive.find((x) => x.titlu === "Piața e cu botul");
  assert.ok(m && m.c === "v" && /piața merge cu botul \(4 ore urcă, 1 zi urcă\)/.test(m.text), toate(c).join(" | "));
});
await test("(a) piața LINIȘTITĂ și contra: verdele spune „Piața e liniștită”, fără direcția contra în el", () => {
  const c = piata("coboara", "coboara", FISA()), m = c.motive.concat(c.rest).find((x) => /^Piața e liniștită/.test(x.titlu));
  assert.ok(m, toate(c).join(" | "));
  assert.ok(!/Trendul, o singură măsură/.test(m.text || ""), m.text);
  assert.ok(!toate(c).includes("Piața e cu botul"));
});

// ---- sarcina 2: (b) miscarea cu botul - stopul la zero doar cand zero-ul e de partea care protejeaza ----
const cuBotul = (bot, zero) => cod(sfaturi(bot, { fisa: FISA({ dir: bot.directie, regim: { r4h: 2.4, r24h: 1.2, miscare: true, sens: bot.directie === "long" ? "urca" : "coboara" }, liniste: FARA_LINISTE }),
  peste: { zero } }), "miscare-cu");
await test("(b) long pe plus (zero-ul sub preț): stopul la zero", () => {
  const s = cuBotul(CRV({ profitTotal: 2.1 }), { pretZero: 0.38, distantaZeroPct: -0.015 });
  assert.equal(s && s.faCe, "L-aș lăsa fără bani în plus, cu stopul mutat la zero-ul botului, și aș urmări marginea de sus.");
});
await test("(b) long pe minus (zero-ul peste preț): take-profit-ul la zero, nu stopul", () => {
  const s = cuBotul(CRV(), { pretZero: 0.3925, distantaZeroPct: 0.0174 });
  assert.equal(s && s.faCe, "L-aș lăsa fără bani în plus, cu take-profit-ul la zero-ul botului, și aș urmări marginea de sus.");
});
await test("(b) short pe minus (zero-ul sub preț): take-profit-ul la zero; short pe plus: stopul; fără zero: fără stop", () => {
  const sh = CRV({ directie: "short" });
  assert.equal(cuBotul(sh, { pretZero: 0.38, distantaZeroPct: -0.015 }).faCe, "L-aș lăsa fără bani în plus, cu take-profit-ul la zero-ul botului, și aș urmări marginea de jos.");
  assert.equal(cuBotul(sh, { pretZero: 0.3925, distantaZeroPct: 0.0174 }).faCe, "L-aș lăsa fără bani în plus, cu stopul mutat la zero-ul botului, și aș urmări marginea de jos.");
  assert.equal(cuBotul(CRV(), null).faCe, "L-aș lăsa fără bani în plus și aș urmări marginea de sus.");
});

// ---- sarcina 3: funding-ul - intervalul real si botul neutru ----
const ist = (ore, n, gol) => Array.from({ length: n }, (_, i) => ({ fundingTime: T0 - (n - i) * ore * ORA - (gol && i < 3 ? ore * ORA : 0), fundingRate: "0.0008" }));
await test("funding: intervalul din istoria ratelor (4 ore), 8 ore fără istorie, iar o istorie neordonată sau cu un gol dă tot intervalul cel mai des", () => {
  assert.equal(cod(sfaturi(CRV(), { funding: 0.0008, fundingHist: ist(4, 30) }), "funding").titlu, "Funding-ul: 0,080% la 4 ore, îl plătești");
  assert.equal(cod(sfaturi(CRV(), { funding: 0.0008 }), "funding").titlu, "Funding-ul: 0,080% la 8 ore, îl plătești");
  assert.equal(cod(sfaturi(CRV(), { funding: 0.0008, fundingHist: ist(4, 30, true).reverse() }), "funding").titlu, "Funding-ul: 0,080% la 4 ore, îl plătești");
});
await test("funding la botul NEUTRU: cine plătește rata, fără „îl plătești / îl încasezi” (semnul poziției nu e sigur)", () => {
  const s = cod(sfaturi(CRV({ directie: "no_trend", finantare: -0.42 }), { funding: 0.0008 }), "funding");
  assert.equal(s.titlu, "Funding-ul: 0,080% la 8 ore, îl plătesc long-urile");
  assert.equal(s.ton, "info"); assert.equal(s.faCe, null);
  assert.equal(s.text, "Până acum botul a plătit 0,42 USDT; botul neutru îl plătește cât e net long și îl încasează cât e net short.");
  assert.equal(cod(sfaturi(CRV({ directie: "no_trend" }), { funding: -0.0008 }), "funding").titlu, "Funding-ul: −0,080% la 8 ore, îl plătesc short-urile");
});
await test("funding: pagina (Tabloul) și colectorul trimit istoria ratelor în Sfaturi.intrare", () => {
  assert.match(citeste("public", "app.js"), /Sfaturi\.intrare\(\{bot:b,[^\n]*fundingHist:e\.fundingHist/);
  assert.match(citeste("public", "app.js"), /e\.fundingHist=fu&&Array\.isArray\(fu\.fundingHist\)\?fu\.fundingHist:null/);
  assert.match(citeste("scripts", "colector.mjs"), /Sfaturi\.intrare\(\{ bot: b,[^\n]*fundingHist: fut && Array\.isArray\(fut\.fundingHist\) \? fut\.fundingHist : null/);
});

// ---- sarcina 4: preturile monedelor mici ----
await test("prețurile sub 0,01: 4 cifre semnificative în sfaturi (0.004123, nu 0.0041); sub 0,000001 fără exponent", () => {
  const z = (pz) => cod(sfaturi(CRV(), { peste: { zero: { pretZero: pz, distantaZeroPct: 0.02 } } }), "zero").titlu;
  assert.equal(z(0.004123), "Botul iese pe zero la 0.004123 (+2,0% de aici)");
  assert.equal(z(0.0000001234), "Botul iese pe zero la 0.0000001234 (+2,0% de aici)");
  assert.equal(z(0.3851), "Botul iese pe zero la 0.3851 (+2,0% de aici)");
  assert.equal(z(64123.456), "Botul iese pe zero la 64123.46 (+2,0% de aici)");
});
await test("prețurile sub 0,000001 fără exponent în cele 4 formatoare (Consilier, semafor, probabilități, valoare); restul neschimbat", () => {
  const nr = (v) => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
  for (const [f, nume] of [["consiliu.js", "fp"], ["semnale-bot.js", "fmtPret"], ["probabilitati.js", "fp"], ["valoare.js", "fp"]]) {
    const src = new RegExp("function " + nume + "\\(v\\) \\{[^\\n]*\\}").exec(citeste("public", "lib", f));
    assert.ok(src, f + ": " + nume + " lipsește");
    const fn = new Function("nr", src[0] + "; return " + nume + ";")(nr);
    assert.equal(fn(0.0000001234), "0.0000001234", f);
    assert.equal(fn(0.004123), "0.004123", f); assert.equal(fn(0.38512), "0.3851", f); assert.equal(fn(64123.456), "64123.46", f);
  }
});

// ---- sarcina 5: minorele amanate ----
const sm1 = (k) => ({ nivel: "atentie", cod: k.cod, motiv: k.motiv, faCe: k.faCe, componente: [Object.assign({ nivel: "atentie" }, k)] });
const margine = { cod: "margine", ton: "atentie", titlu: "0,4% până la marginea de jos (0.3841)", text: "~3 grile la margine.", faCe: "" };
await test("(pachetul 2, M3) „N-aș închide botul pentru asta; …” nu e o ieșire: lângă margine, „n-aș pune bani în plus” nu se pierde", () => {
  const c = C.alcatuieste({ sm: sm1({ cod: "setare", motiv: "Gridul e mai des decât fișa", faCe: "N-aș închide botul pentru asta; la următorul aș lua grile geometrice." }), concret: [], sfaturi: [margine] });
  assert.match((c.faCe || "") + " " + (c.explica || ""), /[Nn]-aș pune bani în plus cât stă lângă margine/, c.faCe + " || " + c.explica);
  assert.ok((c.faCe.match(/;/g) || []).length <= 1, c.faCe);
});
await test("(pachetul 1, M3) când „n-aș pune bani în plus” nu încape și „de ce”-ul e ocupat (ramura stopului), merge la sfârșitul lui „de ce”", () => {
  // singura ramura in care „de ce” e deja ocupat cand e si margine: stopul peste plan pe care o zi obisnuita l-ar atinge des
  const stop = { cod: "stop", tag: { c: "bad", t: "peste plan" }, atins: -123456789, cifre: { frecventa: 0.6, laOpritor: -123456789, pretPropus: 12000, laPropus: -7.6 }, deCe: "Stopul e prea departe.", act: "Aș muta stopul." };
  const c = C.alcatuieste({ sm: { nivel: "atentie", cod: "x", motiv: "Stopul", faCe: "", componente: [] }, concret: [stop], sfaturi: [margine], opritor: 12345.68 });
  assert.match(c.faCe, /^Aș lăsa stopul la 12345\.68/, c.faCe);
  assert.match((c.faCe || "") + " " + (c.explica || ""), /[Nn]-aș pune bani în plus cât stă lângă margine/, c.faCe + " || " + c.explica);
});
await test("(pachetul 1, M7) titlul Consilierului din pagină are plafonul de 60", () => {
  const c = C.alcatuieste({ sm: sm1({ cod: "x", motiv: "Un motiv foarte lung care spune multe lucruri despre bot și piață, peste șaizeci de caractere", faCe: "Aș aștepta." }), concret: [], sfaturi: [] });
  assert.ok(c.titlu.length <= 60, c.titlu.length + ": " + c.titlu);
});
await test("(pachetul 1, M4) banii stopului cu stopul PE PLUS: semnul nu se pierde", () => {
  const k = S.acumConcret({ bot: CRV({ opritorPierdereActiv: true, opritorPierdere: 0.36 }), fisa: FISA(), zero: null, costuri: null, plan: null, acum: T0,
    bani: { stop: { laPropus: -21, laOpritor: 2.4, frecventa: 0.3 } } }).find((x) => x.cod === "stop");
  assert.equal(k && k.bani, "💰 Stopul tău închide pe plus (+2,4 USDT), mai bine decât cel propus (−21,0 USDT): l-aș lăsa unde e.");
});
await test("(pachetul 2, M4) acțiunea trendului contra: condiția măsurabilă de dinainte („tare” și pe 1 zi)", () => {
  const s = cod(sfaturi(CRV(), { fisa: FISA({ directie: { dir: "short", tarie: "mediu", motive: ["4h: EMA20 sub EMA50"] }, liniste: FARA_LINISTE }) }), "trend");
  assert.equal(s && s.faCe, "N-aș adăuga bani; dacă e „tare” și pe 1 zi, aș închide botul lângă zero și aș porni din fișă unul pe trend.");
  assert.ok(s.faCe.length <= 110, s.faCe.length);
});

// ---- sarcina 6: garda pe forme reale (ideea 4, M2 din revizia pachetului 2) ----
await test("garda: o frecvență „(k din n)” cu n sub 30 cere „puține cazuri” în același text (pragul scenariului)", async () => {
  const G = await import(new URL("./garda-texte.mjs", import.meta.url).href);
  assert.ok(G.verifica("Liniștea a mai ținut 2 zile în 23% din cazuri (3 din 13).", "deCe").some((a) => /puține cazuri/.test(a)), "regula lipsește");
  assert.deepEqual(G.verifica("Liniștea a mai ținut 2 zile în 23% din cazuri (3 din 13, puține cazuri).", "deCe"), []);
  assert.deepEqual(G.verifica("Atinge marginea în 19% din situații (78 din 406).", "deCe"), []);
});
await test("liniștea pe 13 cazuri poartă „puține cazuri”, ca scenariul (sub 30)", () => {
  const s = cod(sfaturi(CRV()), "liniste");
  assert.ok(s && /\(3 din 13, puține cazuri\)/.test(s.text), s && s.text);
});
await test("garda: lumânările de 4 ore sunt 500 (cât dă Pionex) și avertismentele serverului au situații cu prețuri BTC, sume în mii și o monedă sub 0,01", () => {
  const g = citeste("scripts", "garda-texte.mjs");
  assert.match(g, /const K4 = \(p, amp\) => Array\.from\(\{ length: 500 \}/);
  assert.match(g, /av\("BTC:/); assert.match(g, /av\("monedă sub 0,01:/);
});

console.log(`\nV100.65 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
