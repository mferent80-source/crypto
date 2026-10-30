// v100.272-i (integrarea restului auditului 29.10, 30.10.2026): ce a rămas după cei 5 agenți, prins la verificarea mea.
//  1. livrarea oprea colectorul din aceeași sesiune cu Stop-Process -Force ⇒ process.on("exit") nu rula ⇒ starea alertelor scrisă amânat (≤ 10 s)
//     se pierdea ⇒ o alertă putea pleca de două ori după livrare. Acum întâi semnalul de ieșire (iese curat, scrie starea), forțat doar dacă nu iese.
//  2. sfatul de funding de pe Discord (colectorul) primea doar Binance; Tabloul îl are pe Pionex (ce plătește botul) ⇒ colectorul dă ratele Pionex.
//  3. „$” rămas la alertele acțiunilor (frâna pe minus, planul) ⇒ moneda simbolului, ca pe pagina T212.
//  4. argumentele text din butoanele căutării (salt-ecran) doar cu escaparea HTML ⇒ și escaparea șirului JS (ca argActiune din app.js).
//  5. „mișcare” pe definiția comună și în ultimele locuri: cartela BTC arăta cifra pe 4 h lângă verdictul pe 24 h, sortarea „de evitat” pe Acasă după
//     maximul 4 h / 24 h, culoarea din Scan la „≥ 2×” în loc de mișcarea mare; textul Scan-ului „~1 zi din 10” (pe crypto măsurat 13%).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); });
}
function context(extra) {
  const c = Object.assign({ console, Math, Object, Array, String, Number, JSON, isFinite, isNaN, Intl, Date, Promise, RegExp, Error, TextRo: globalThis.TextRo, setTimeout, clearTimeout, encodeURIComponent }, extra || {});
  c.window = c; c.globalThis = c; vm.createContext(c);
  return c;
}
function cuLib(fis, extra) { const c = context(extra); for (const f of fis) vm.runInContext(citeste("public", "lib", f), c, { filename: f }); return c; }
console.log("\nV100.272-i · integrarea restului auditului 29.10\n");

// ═════════ 1. livrarea: întâi semnalul, forțat doar dacă nu iese ═════════
const L = await import("./copie-de-lucru.mjs");
function lumeOprire({ iesePeste }) {
  let t = 0, semnal = false, sters = false, fortat = 0, viu = true; const jurnal = [];
  const d = {
    pid: 4242, acum: () => t, asteaptaMs: (ms) => { t += ms; if (semnal && iesePeste != null && t >= iesePeste) viu = false; },
    scrieSemnal: () => { semnal = true; }, stergeSemnal: () => { sters = true; }, eViu: () => viu,
    forteaza: () => { fortat++; viu = false; }, scrie: (s) => jurnal.push(s),
  };
  return { d, stare: () => ({ semnal, sters, fortat, viu, t, jurnal }) };
}
await test("1a colectorul care iese la semnal NU e oprit forțat (process.on(\"exit\") scrie starea amânată)", () => {
  assert.equal(typeof L.opresteCurat, "function", "lipsește opresteCurat în copie-de-lucru.mjs");
  const w = lumeOprire({ iesePeste: 8000 }); const r = L.opresteCurat(w.d); const s = w.stare();
  assert.equal(s.semnal, true, "semnalul de ieșire nu s-a lăsat"); assert.equal(s.fortat, 0, "oprit forțat deși a ieșit singur");
  assert.equal(s.sters, true, "semnalul rămas după ieșire"); assert.equal(r.curat, true);
});
await test("1b colectorul care NU iese în timp e oprit forțat, iar semnalul se șterge (colectorul nou nu-l vede)", () => {
  const w = lumeOprire({ iesePeste: null }); const r = L.opresteCurat(w.d); const s = w.stare();
  assert.equal(s.fortat, 1); assert.equal(s.sters, true); assert.equal(r.curat, false);
  assert.ok(s.t <= 85000 && s.t >= 70000, "așteptarea dinaintea opririi forțate: " + s.t + " ms (semnalul se vede în ≤ 10 s, iar colectorul iese la capătul turei, cel mult după 60 s)");
});
await test("1c repornesteColectorul (aceeași sesiune) trece prin opresteCurat, nu direct prin Stop-Process -Force", () => {
  const src = citeste("scripts", "copie-de-lucru.mjs"), i = src.indexOf("function repornesteColectorul("), corp = src.slice(i, src.indexOf("\nfunction ", i + 10));
  assert.ok(i >= 0); assert.match(corp, /opresteCurat\(/, "repornesteColectorul nu cheamă opresteCurat");
  assert.doesNotMatch(corp, /if \(d\.opreste\) \{ ps\(`Stop-Process/, "încă oprește direct forțat");
});

// ═════════ 2. sfatul de funding din colector pe Pionex ═════════
await test("2 colectorul dă sfaturilor ratele Pionex (d.funding: rate, hist, intervalOre, rataZi) ca fundingPionex", () => {
  const src = citeste("scripts", "colector.mjs"), i = src.indexOf("x.sfaturi = Sfaturi.sfaturi(Sfaturi.intrare({"); assert.ok(i >= 0, "lipsește apelul sfaturilor");
  const apel = src.slice(i, src.indexOf("\n", i));
  assert.match(apel, /fundingPionex:\s*d\.funding && Number\.isFinite\(Number\(d\.funding\.rataZi\)\) \? d\.funding : null/, "sfatul din colector n-are fundingPionex");
  const S = cuLib(["sfaturi.js"]).Sfaturi, d = { funding: { rate: 0.0002, hist: [0.0002, 0.0002, 0.0001], intervalOre: 8, rataZi: 0.0006 } };
  const x = S.intrare({ bot: { directie: "long", investit: 100 }, funding: 0.0009, fundingHist: [0.0009], fundingPionex: d.funding && Number.isFinite(Number(d.funding.rataZi)) ? d.funding : null });
  assert.ok(x.fundingPionex && x.fundingPionex.rataZi === 0.0006 && x.fundingPionex.rata === 0.0002 && x.fundingPionex.intervalOre === 8, "forma colectorului nu e citită: " + JSON.stringify(x.fundingPionex));
});

// ═════════ 3. moneda în alertele acțiunilor ═════════
const AS = cuLib(["actiuni-semnale.js"]).ActiuniSemnale;
await test("3a frâna pe minus: euro la Xetra, dolari la New York", () => {
  const de = AS.alertaFrana({ ticker: "SAPd_EQ", pret: 180.5, mediu: 200, sub: -0.0975, nr: 1, suma: 900 }, "SAP");
  assert.match(de.mesaj, /€180\.50/); assert.doesNotMatch(de.mesaj, /\$/);
  const us = AS.alertaFrana({ ticker: "AAPL_US_EQ", pret: 180.5, mediu: 200, sub: -0.0975, nr: 1, suma: 900 }, "AAPL");
  assert.match(us.mesaj, /\$180\.50/);
});
await test("3b planul (stop / țintă): moneda simbolului; Londra fără metadate fără semn, cu metadate în lire / pence", () => {
  const p = (ticker) => ({ ticker, simbol: ticker.split("_")[0], pret: 90, plan: { stop: 95, tinta: 80 } });
  const de = AS.alertePlan(p("SAPd_EQ"), Date.UTC(2026, 9, 30), {});
  assert.ok(de.length === 2, "alertele: " + de.length); assert.ok(de.every((a) => !/\$/.test(a.titlu + a.mesaj)), JSON.stringify(de));
  assert.match(de[0].titlu, /€95\.00/);
  const us = AS.alertePlan(p("AAPL_US_EQ"), Date.UTC(2026, 9, 30), {}); assert.match(us[0].titlu, /\$95\.00/);
  const lp = AS.alertePlan(p("VODl_EQ"), Date.UTC(2026, 9, 30), { monede: { VODl_EQ: "GBX" } }); assert.match(lp[0].titlu, /95\.00 p/);
  const ln = AS.alertePlan(p("VODl_EQ"), Date.UTC(2026, 9, 30), {}); assert.doesNotMatch(ln[0].titlu, /[$€£]/);
});

// ═════════ 4. butoanele căutării ═════════
await test("4 căutarea: un apostrof din ISIN / simbol nu iese din ghilimelele acțiunii (escaparea JS înaintea celei HTML)", () => {
  const src = citeste("public", "lib", "salt-ecran.js");
  assert.match(src, /function saltArg\(/, "lipsește saltArg");
  const c = context(); vm.runInContext(src.slice(src.indexOf("function saltEsc("), src.indexOf("\n", src.indexOf("function saltEsc("))) + "\n" + src.slice(src.indexOf("function saltArg("), src.indexOf("\n", src.indexOf("function saltArg("))), c);
  const atr = "saltVezi('" + c.saltArg("X');alert('1") + "')", decodat = atr.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  assert.equal(decodat, "saltVezi('X\\');alert(\\'1')", "după decodarea atributului: " + decodat);
  for (const loc of ["saltVezi(", "saltBilet(", "saltComuta(", "saltEditeaza(", "saltSterge("]) {
    const i = src.indexOf("data-action-click=\"" + loc); assert.ok(i >= 0, loc);
    assert.match(src.slice(i, i + 80), /saltArg\(/, loc + " nu trece prin saltArg");
  }
  /* toate argumentele text ale acțiunilor din fișier (revizia de securitate: „Editează” și „Șterge” rămăseseră pe saltEsc); f[0] = numele filei, constant */
  const rele = [...src.matchAll(/data-action-[a-z]+="\w+\(\\'' \+ ([^+]+?) \+ '\\'/g)].map((m) => m[1].trim()).filter((x) => !/^saltArg\(/.test(x) && x !== "f[0]");
  assert.deepEqual(rele, [], "argumente fără saltArg: " + rele.join(" | "));
});

// ═════════ 5. „mișcare” pe definiția comună în ultimele locuri ═════════
await test("5a cartela BTC: cifra de lângă „mișcare / liniște” e cea pe 24 h (verdictul e pe 24 h)", () => {
  const IB = cuLib(["indicatori-bot.js"]).IndicatoriBot; assert.ok(IB, "IndicatoriBot");
  const fn = Object.values(IB).find((f) => typeof f === "function" && /eticheta: "BTC"/.test(String(f))); assert.ok(fn, "funcția cu cartela BTC");
  const src = citeste("public", "lib", "indicatori-bot.js");
  assert.match(src, /bm = br \? nr\(br\.r24h\) : null/, "cartela citește încă r4h");
  assert.match(src, /" \(" \+ x1\(bm\) \+ " pe 24 h\)"/, "cifra nu spune că e pe 24 h");
});
await test("5b Acasă: monedele de evitat sortate după mișcarea pe 24 h (nu după maximul 4 h / 24 h)", () => {
  const src = citeste("public", "lib", "acasa-ecran.js"), i = src.indexOf("function acClasamentSumar("), corp = src.slice(i, src.indexOf("\nfunction ", i + 5));
  const c = context(); vm.runInContext(corp, c);
  const o = c.acClasamentSumar({ monede: [{ s: "A", stare: "evita", regim: { r4h: 5, r24h: 1.1 } }, { s: "B", stare: "evita", regim: { r4h: 1, r24h: 2.5 } }] });
  assert.equal(o.deEvitat.map((x) => x.s).join(","), "B,A", "ordinea: " + o.deEvitat.map((x) => x.s));   /* join: lista vine din alt context vm */
});
await test("5c Scan: culoarea de atenție pe mișcarea mare comună (x.mare); fără ea, ca înainte (≥ 2×)", () => {
  const src = citeste("public", "lib", "scan-ecran.js");
  assert.match(src, /'<span class="scMis ' \+ \(\(x\.mare === true \|\| \(x\.mare === undefined && x\.mis >= 2\)\) \? "warn" : ""\)/, "culoarea e încă la ≥ 2×");
});
await test("5d Scan: textul nu promite „~1 zi din 10” (pe crypto s-a aprins 13% din zile)", () => {
  const src = citeste("public", "lib", "scan.js");
  assert.doesNotMatch(src, /se aprinde ~1 zi din 10\)/);
  assert.match(src, /mai mult decât în 9 zile din 10 ale ei/, "regula de pe ecran a dispărut");
});

// ═════════ 6. procentele scorului pe Discord, ca pe pagină (o zecimală, lipit) ═════════
await test("6 scorul pe Discord: rata cu o zecimală, lipită de semn („58,3%”, nu „58 %”), ca pe pagina scorului (v100.272-c)", async () => {
  const MC = await import("./lib/mesaje-colector.mjs");
  const s = { piata: "pionex", start: Date.UTC(2026, 9, 1), win: 7, loss: 5, n: 12, net: 12.4, rata: 0.5833, obiectiv: { rata: 0.55, net: 50 } };
  const m = MC.scorTinta(s, "rata"), tot = m.titlu + "\n" + m.mesaj;
  assert.match(m.titlu, /rata țintă atinsă \(58,3%\)/, m.titlu);
  assert.match(m.mesaj, /rata 58,3% față de ținta 55,0%\./, m.mesaj);
  assert.doesNotMatch(tot, / %/, "procent cu spațiu: " + tot);
});

// ═════════ 7–11. revizia independentă (Opus, 30.10) ═════════
// 7 (Important): Discord - corpul unui răspuns de eroare citit în afara try și fără ceas (ceasul se oprea la antete) ⇒ excepția oprea tura
//   (alerta de lichidare trecută „trimisă”, boții rămași nejudecați) sau cererea stătea ~300 s cu golirea cozii blocată
const CD = await import("./lib/canal-discord.mjs");
const WH = "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789ab";
const raspuns = (status, text) => (url, opt) => Promise.resolve({ status, ok: status >= 200 && status < 300, headers: { get: () => null }, text: () => text(opt.signal) });
await test("7a Discord 502 cu corpul rupt: întoarce „netrimis” (la coadă), nu aruncă și nu oprește tura", async () => {
  let info = null;
  const ok = await CD.trimiteDiscord({ nivel: "critic", titlu: "MET: lichidarea la 7,5%", mesaj: "x" }, { fetch: raspuns(502, () => Promise.reject(new TypeError("terminated"))), webhook: WH, jurnal() {}, laRezultat: (z) => { info = z; } });
  assert.equal(ok, false); assert.ok(info && info.ok === false && info.status === 502, JSON.stringify(info));
});
await test("7b Discord 502 / 429 cu corpul care nu mai vine: se oprește la ceasul cererii (nu ~300 s cu coada blocată)", async () => {
  const atarna = (sig) => new Promise((rs, rj) => sig.addEventListener("abort", () => rj(sig.reason || new Error("aborted"))));
  for (const st of [502, 429]) {
    const t0 = Date.now();
    const ok = await CD.trimiteDiscord({ nivel: "critic", titlu: "t", mesaj: "x" }, { fetch: raspuns(st, atarna), webhook: WH, jurnal() {}, timeoutMs: 150, rabdareMs: 150 });
    assert.equal(ok, false); assert.ok(Date.now() - t0 < 2000, st + ": a durat " + (Date.now() - t0) + " ms");
  }
});
// 8 (Important): ieșirea la semnalul livrării - golesteStarea scria doar starea MARCATĂ (lichidareIntai schimbă starea fără marcaj până
//   mai târziu ⇒ alerta critică pleca din nou după repornire) și ieșea în mijlocul turei (starea unui mesaj în zbor scrisă „trimis”)
const SC2 = await import("./lib/sanatate-colector.mjs");
await test("8a decizia de ieșire: între ture pe loc; în tură la capătul ei; cel mult IESIRE_MAX_MS după semnal (livrarea așteaptă 90 s)", () => {
  assert.equal(typeof SC2.decizieIesire, "function", "lipsește decizieIesire");
  const T = 1e12, M = SC2.IESIRE_MAX_MS; assert.ok(M >= 30000 && M <= 70000, "IESIRE_MAX_MS " + M);
  assert.equal(SC2.decizieIesire({ semnal: false, turaInCurs: false, cerutaLa: 0, acum: T }), "nimic");
  assert.equal(SC2.decizieIesire({ semnal: true, turaInCurs: false, cerutaLa: 0, acum: T }), "iesi");
  assert.equal(SC2.decizieIesire({ semnal: true, turaInCurs: true, cerutaLa: 0, acum: T }), "asteapta");
  assert.equal(SC2.decizieIesire({ semnal: true, turaInCurs: true, cerutaLa: T, acum: T + M - 1 }), "asteapta");
  assert.equal(SC2.decizieIesire({ semnal: true, turaInCurs: true, cerutaLa: T, acum: T + M }), "iesi");
  assert.equal(SC2.decizieIesire({ semnal: true, turaInCurs: false, cerutaLa: T, acum: T + 5 }), "iesi", "cerută în tură, tura s-a terminat");
  /* semnalul retras (livrarea a renunțat și l-a șters) ⇒ rămâne pornit: altfel n-ar mai porni nimeni colectorul */
  assert.equal(SC2.decizieIesire({ semnal: false, turaInCurs: false, cerutaLa: T, acum: T + 5 }), "nimic", "semnalul retras");
});
await test("8b colectorul: starea scrisă NECONDIȚIONAT la ieșire; tura marcată în curs; ieșirea cerută în tură pleacă la capătul ei", () => {
  const src = citeste("scripts", "colector.mjs");
  assert.match(src, /function golesteStarea\(\) \{[^\n]*scrieStareAcum\(\)/, "golesteStarea nu scrie necondiționat");
  assert.match(src, /S\.decizieIesire\(/, "iesiLaSemnal nu folosește decizieIesire");
  const i = src.indexOf("async function bucla() {"), corp = src.slice(i, src.indexOf("\n}", i));
  assert.match(corp, /turaInCurs = true;[^\n]*await tura\(\)[^\n]*finally \{ turaInCurs = false; \}/, "tura nu e marcată în curs");
  assert.ok(corp.indexOf("iesiLaSemnal();", corp.indexOf("await tura()")) > 0, "după tură nu se verifică ieșirea cerută");
  assert.match(src, /^var turaInCurs = false, iesireCerutaLa = 0;/m, "var (citite la semnal, fără TDZ)");
});
await test("8c livrarea așteaptă ieșirea curată cel puțin cât semnalul + capătul turei (IESIRE_MAX_MS + 10 s)", () => {
  assert.ok(L.OPRIRE_CURATA_MS >= SC2.IESIRE_MAX_MS + 10000 && L.OPRIRE_CURATA_MS <= 85000, "OPRIRE_CURATA_MS " + L.OPRIRE_CURATA_MS);
});
// 9 (Minor): mesajul de noapte spunea „pe aceleași drumuri … cea mai bună dintre 7 încercări” lângă textul nou „cifrele de pe alte 2.000 de drumuri”
await test("9 noaptea pe Discord: titlul și coada spun că propunerea e verificată pe drumuri noi (nu doar „pe aceleași drumuri”)", () => {
  const src = citeste("scripts", "lib", "tura-variante-noapte.mjs");
  assert.doesNotMatch(src, /"altă setare, pe aceleași drumuri"|"alt TP, pe aceleași drumuri"/, "titlul vechi");
  assert.doesNotMatch(src, /deci e cea mai bună dintre /, "coada veche („cea mai bună dintre N încercări”)");
  assert.match(src, /verificat[ăa]? pe alte drumuri/, "coada nu spune verificarea");
});
// 10 (Minor): Salt își convertește singur „$n” în moneda simbolului (saltInMoneda); cu moneda ghicită din „ULVR.L” (null) unitatea dispărea,
//   iar la euro ieșea „€30.12” în loc de „30,12 EUR” ⇒ Salt cere Consilierului prețul în „$”, ca înainte de v100.272
await test("10 Salt: Consilierul primește moneda „USD” (Salt convertește „$n” în moneda simbolului, ca înainte)", () => {
  const src = citeste("public", "lib", "salt.js"), i = src.indexOf("CS.alcatuiesteActiune({"); assert.ok(i >= 0);
  assert.match(src.slice(i, src.indexOf("\n", i)), /moneda: "USD"/, "Salt nu fixează moneda");
});
// 11 (Minor): proba futures - o tură care trece de ora fixă punea monedele citite după ea pe ora următoare (cheia de dedublare / perechea la 24 h)
const FP = await import("./lib/futures-proba.mjs");
await test("11 proba futures: toate rândurile unei ture stau în ora în care a pornit tura, chiar dacă citirea trece de ora fixă", async () => {
  const os = await import("node:os"), fis = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fp272i-")), "futures-jurnal.jsonl");
  const ORA = 3600000, acum = Date.UTC(2026, 9, 30, 10) + ORA - 300;   /* 10:59:59.700 */
  const R = { funding: -0.0002, fundingIntervalHours: 4, longShort: 1.29, lsIst: Array.from({ length: 100 }, (_, i) => [i, 1 + i / 100]), markPrice: 0.0101 };
  const F = { aglomerare: () => ({ context: "CROWDED", conflict: false, fr8: 0.0001, lsPct: 56 }), evalForward: () => ({}) };
  let k = 0; const cere = async () => { if (k++ === 1) await new Promise((r) => setTimeout(r, 700)); return R; };
  await FP.turaFuturesProba({ F, cere, trimite: async () => ({}), fisier: fis, acum, univers: ["AUSDT", "BUSDT"] });
  const l = fs.readFileSync(fis, "utf8").trim().split("\n").map((x) => JSON.parse(x));
  assert.equal(l.length, 2); for (const r of l) assert.equal(Math.floor(r[0] / ORA), Math.floor(acum / ORA), "rândul " + r[1] + " la " + new Date(r[0]).toISOString());
});

console.log(picate ? `\n${picate} PICA din ${teste}` : `\ntoate ${teste} ok`);
process.exit(picate ? 1 : 0);
