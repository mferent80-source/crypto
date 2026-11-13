// Proba v100.338 (13.11.2026, el: „folosește toate skillurile … și pagina Range Filter la fel ca ultimele pagini la care am lucrat,
//   optimizat design, layout, cod, corectitudine”). „Ca ultimele pagini” = ca Tabloul, T212 (v100.326) și Piața azi (v100.329):
//   A. tema Tabloului: rădăcina #rangefilter în generator (culorile de zi și scara de litere din stratul generat), un singur comutator
//      (tbTemaAplica + tema-devreme), butonul „Temă închisă / deschisă” în antetul paginii; rama (meniul, bara de sus, fondul) și litera
//      IBM Plex ca pe celelalte trei.
//   node scripts/proba-v100338-rf.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.338 · Range Filter ca Tabloul · proba\n");
const PATRU = "#tabloubot,#t212,#dash,#rangefilter";

await test("A tema: rădăcina #rangefilter în generator, stratul la zi, variabilele de zi pe toate patru", async () => {
  const GEN = citeste("scripts", "face-tema-tablou.mjs"), CSS = citeste("public", "app.css");
  assert.match(GEN, /export const RADACINI = \["tabloubot", "t212", "dash", "rangefilter"\];/);
  assert.ok(CSS.includes(":is(" + PATRU + ").tbZi{"), "variabilele de zi pe toate patru rădăcinile");
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "face-tema-tablou.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, "stratul generat e la zi: " + (r.stdout || r.stderr));
  // regulile paginii (scrise pe #rangefilter) primesc tema pe ea: fondul / linia cartelelor prin variabile, tonurile pe paleta de zi
  assert.match(CSS, /#rangefilter\.tbZi\{--rf-fond:#FFFFFF;--rf-linie:rgba\(14,26,43,\.16\)\}/, "cartelele RF au fondul de zi");
  assert.ok(CSS.includes("#rangefilter.tbZi .rfTon-sus{color:var(--pzSus,#0B8A5F)}"), "tonurile pe paleta de zi");
});

await test("A un singur comutator: tbTemaAplica și tema-devreme pun tbZi și pe #rangefilter; butonul rfTemaBtn în antetul paginii", () => {
  const APP = citeste("public", "app.js"), DEV = citeste("public", "lib", "tema-devreme.js"), RF = citeste("public", "lib", "range-filter-ecran.js");
  const ap = APP.slice(APP.indexOf("function tbTemaAplica("), APP.indexOf("function tbTemaComuta("));
  assert.match(ap, /\["tabloubot","t212","dash","rangefilter"\]/); assert.match(ap, /"rfTemaBtn"/);
  assert.match(DEV, /\["tabloubot", "t212", "dash", "rangefilter"\]/);
  assert.match(RF, /<button class="acBtn" type="button" id="rfTemaBtn" aria-pressed="(true|false)" data-action-click="tbTemaComuta\(\)">/);
  assert.match(RF, /tbTemaAplica\(\)/, "după ce antetul se redesenează, butonul își ia textul temei");
});

await test("A rama și litera: nicio regulă a ramei rămasă pe trei pagini; IBM Plex pe #rangefilter", () => {
  const CSS = citeste("public", "app.css"), coada = CSS.slice(CSS.indexOf("/* ==== v100.316 TEMA TABLOULUI: sfârșit ==== */"));
  assert.equal(coada.split("html:has(:is(#tabloubot,#t212,#dash).on").length - 1, 0, "regulile ramei fără #rangefilter");
  assert.ok(coada.split("html:has(:is(" + PATRU + ").on").length - 1 >= 20, "rama pe toate patru");
  assert.match(coada, /html\.pzDemo #rangefilter\{[^}]*font-family:"IBM Plex Sans"[^}]*color:var\(--pzT0\)\}/);
  assert.ok(coada.includes("html.pzDemo #rangefilter *{font-family:inherit!important}"));
  // poza 13.11 (1440, zi): banda cartelei avea text alb pe #C3CCD8 - de necitit; pe zi cerneala, după strat
  assert.ok(coada.includes("#rangefilter.tbZi .rfHero{color:#0E1A2B}"), "banda cartelei citibilă pe zi");
});

// ───────── B. așezarea (măsurat pe viu, 13.11, 1440 px: 20 de cartele de ~600 px = 5.955 px de derulat; „CE FAC?” și „DOVADA: nedovedit”
//   aceleași pe 20 de cartele; rezumatul - singurul care spune ceva despre toate - într-un rând mic; ultimul rând cu un loc gol) ─────────
//   verdictul paginii sus (rezumatul ca frază mare + „colorant de trend (nedovedit)” + „De unde știu”); monedele ca LISTĂ (un rând pe
//   monedă: direcția, LOC, ultimul semnal, DOVADA, după cost, „Grid: ce setez?” la vedere); FIȘA întreagă (cartela de până acum, rând cu
//   rând) la un clic, ținută deschisă când pagina se redesenează. Nimic scos: cartela e aceeași funcție (rfCartela).
import vm from "node:vm";
const J = JSON.parse(citeste("scripts", "proba-date", "rf-jurnal-r.json")), D = JSON.parse(citeste("scripts", "proba-date", "rf-btc-1h.json"));
function context(extra) {
  const c = { console, Intl, Date, Math, Number, String, Object, Array, Set, Map, isFinite, JSON, Promise, setTimeout, RegExp, document: { getElementById: () => null } };
  c.window = c; c.module = undefined; c.getJSON = async () => ({}); Object.assign(c, extra || {});
  vm.createContext(c);
  for (const f of ["text-ro.js", "grid-calcul.js", "lumanari.js", "acasa.js", "trade-zilei.js", "trade-zilei-ecran.js", "range-filter.js", "range-filter-ecran.js"]) {
    if (fs.existsSync(path.join(RAD, "public", "lib", f))) vm.runInContext(citeste("public", "lib", f), c);
  }
  return c;
}
const ACUM = Date.now();
function stare(c, extra) {
  const R = c.RangeFilter, cit = (i) => R.citire(J.cazuri[i % J.cazuri.length].bare);
  const monede = [
    { simbol: "HYPE", pionex: "HYPE_USDT_PERP", fel: "bot", directie: "SHORT", c: cit(0) },
    { simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", c: cit(1) },
    { simbol: "ETH", pionex: "ETH_USDT_PERP", fel: "piata", c: cit(0) },
    { simbol: "ZEC", pionex: "ZEC_USDT_PERP", fel: "top", eroare: "nu am putut citi lumânările (fetch failed)" },
  ];
  return Object.assign(c.rfStare, { monede, la: ACUM, inLucru: false, eroare: null, simboluri: monede.map((m) => ({ simbol: m.simbol })), tf: "60M", filtru: "toate", clasLa: ACUM - 20 * 60000, botiLa: ACUM - 60000 }, extra || {});
}

await test("B verdictul sus: rezumatul ca frază mare, „colorant de trend (nedovedit)”, „De unde știu” (lumânările, clasamentul, boții)", () => {
  const c = context(), st = stare(c), h = c.rfHtmlCorp(st);
  const v = h.indexOf('class="rfVerdict'), l = h.indexOf('class="rfLista');
  assert.ok(v >= 0 && l > v, "verdictul înaintea listei");
  const bloc = h.slice(v, l);
  assert.match(bloc, /class="rfVerdictFraza">Din 3 monede:/, "rezumatul e fraza mare");
  assert.match(bloc, /colorant de trend \(nedovedit\)/);
  assert.match(bloc, /class="dusRand"><span class="dusEt">De unde știu:<\/span>/);
  assert.match(bloc, /lumânările de 1h (acum|azi \d\d:\d\d|ieri \d\d:\d\d|\d\d\.\d\d \d\d:\d\d)/, "ora ultimei lumânări închise");
  assert.match(bloc, /⚠ lumânările de 1h \d\d\.\d\d \d\d:\d\d \(vechi\)/, "fixtura e din 04.11 ⇒ vechi, la vedere");
  assert.match(bloc, /clasamentul acum 20 min/); assert.match(bloc, /boții \(Pionex\) acum/);
  assert.match(bloc, /1 monedă necitită|necitit/, "căderea se spune în verdict");
});

await test("B lista: un rând pe monedă (direcția, LOC, semnalul, DOVADA, după cost) + „Grid: ce setez?” la vedere; fișa întreagă la un clic", () => {
  const c = context(), st = stare(c), h = c.rfHtmlCorp(st);
  const randuri = h.split('<div class="rfLinie').length - 1;
  assert.equal(randuri, 4, "un rând pe monedă, și cea necitită");
  const hype = h.slice(h.indexOf('data-simbol="HYPE"'), h.indexOf('data-simbol="BTC"'));
  assert.match(hype, /<details class="rfFisa"[^>]*><summary class="rfRandMoneda">/);
  for (const re of [/class="rfColDir[^"]*">(TREND SUS|TREND JOS|FĂRĂ DIRECȚIE)/, /class="rfColLoc[^"]*">[^<]*<span class="rfBara/, /class="rfColSemnal[^"]*">/, /class="rfColDovada[^"]*">/, /class="rfColCost[^"]*">/]) assert.match(hype, re);
  assert.match(hype, /botul tău/, "eticheta botului în rând");
  const sum = hype.slice(hype.indexOf("<summary"), hype.indexOf("</summary>"));
  assert.doesNotMatch(sum, /<button/, "niciun buton în summary (clicul l-ar deschide / închide)");
  assert.match(hype.slice(hype.indexOf("</details>")), /data-action-click="rfLaGrid\('HYPE_USDT_PERP'\)"/, "„Grid: ce setez?” la vedere, lângă rând");
});

await test("B nimic pierdut: fișa = cartela de până acum, rând cu rând, pentru fiecare monedă (și mesajul celei necitite)", () => {
  const c = context(), st = stare(c), h = c.rfHtmlCorp(st), z = c.rfZPaginaSt(st);
  for (const m of st.monede) {
    const r = h.slice(h.indexOf('data-simbol="' + m.simbol + '"')), fisa = r.slice(0, r.indexOf("</details>"));
    const card = c.rfCartela(m, z), corp = card.slice(card.indexOf("</div>") + 6, card.lastIndexOf("</article>"));   // fără capul cartelei (e în rând)
    assert.ok(fisa.includes(corp.replace(/<div class="rfAct">[\s\S]*?<\/div>/, "")), m.simbol + ": fișa conține toată cartela");
  }
  for (const et of ["TRIGGER", "CE FAC?", "LOC", "BANDA", "REGIM", "MA", "APRINDERE", "DOVADA", "DUPĂ COST", "SEMNAL"]) assert.ok(h.includes('<span class="rfEt">' + et + "</span>"), et);
  assert.match(h, /nu am putut citi lumânările \(fetch failed\)/);
});

await test("B fișele deschise rămân deschise la redesenare (cartelele vin una câte una); „Deschide toate / Închide toate”", () => {
  const c = context(), st = stare(c);
  c.rfFisaComuta("HYPE", true);
  let h = c.rfHtmlCorp(st);
  assert.match(h, /data-simbol="HYPE"[^]*?<details class="rfFisa" open>/);
  assert.match(h, /data-simbol="BTC"[^]*?<details class="rfFisa">/);
  c.rfToate(true); h = c.rfHtmlCorp(st);
  assert.equal(h.split('<details class="rfFisa" open>').length - 1, 4, "toate deschise");
  assert.match(c.rfHtmlFiltre(st), /data-action-click="rfToate\(false\)">Închide toate fișele</);
  c.rfToate(false); h = c.rfHtmlCorp(st);
  assert.equal(h.split('<details class="rfFisa" open>').length - 1, 0);
  const APP = citeste("public", "app.js"); assert.match(APP, /ACTIUNI_PERMISE=new Set\("[^"]*\brfToate\b/, "acțiunea e permisă");
  assert.match(citeste("public", "lib", "range-filter-ecran.js"), /addEventListener\("toggle", function \(e\) \{[^}]*rfFisa/, "clicul pe rând ține minte starea");
});

await test("B „De unde știu” pe răspunsul real: ora clasamentului din clasament.la (forma { clasament: { la, monede }, stare }); boții citiți acum", async () => {
  const L = ACUM - 17 * 60000, cereri = [];
  const c = context({ getJSON: async (u) => { cereri.push(u); if (/clasament/.test(u)) return { clasament: { la: L, monede: [] }, stare: {} }; if (/bot-orders/.test(u)) return { bots: [] }; return { result: false, code: "X" }; } });
  await c.rfPorneste(true);
  assert.equal(c.rfStare.clasLa, L, "ora din clasament.la");
  assert.ok(c.rfStare.botiLa > 0, "boții citiți acum ⇒ ora lor");
  const h = c.rfHtmlCorp(c.rfStare);
  assert.match(h, /clasamentul acum 17 min/); assert.match(h, /boții \(Pionex\) acum/);
});

await test("B ordinea și filtrele de până acum rămân (boții → semnale noi → restul); lista goală spune de ce", () => {
  const c = context(), st = stare(c), h = c.rfHtmlCorp(st);
  assert.ok(h.indexOf('data-simbol="HYPE"') < h.indexOf('data-simbol="BTC"'), "botul primul");
  st.filtru = "boti"; const hb = c.rfHtmlCorp(st);
  assert.equal(hb.split('<div class="rfLinie').length - 1, 1);
  st.monede = st.monede.filter((m) => m.fel !== "bot"); assert.match(c.rfHtmlCorp(st), /Niciun bot activ/);
});

// ───────── C. corectitudinea (auditul Opus de corectitudine, 13.11: 0 critice; reparate cele de mai jos) ─────────
await test("C „semnal nou” = în ultimele 3 bare închise (acum 0, 1, 2) - nu 4, cum spunea textul", () => {
  const c = context(), m = (a) => ({ c: { semnal: { acum: a, fel: "BUY" } } });
  assert.deepEqual([0, 1, 2, 3].map((a) => c.rfProaspat(m(a))), [true, true, true, false]);
});

await test("C DOVADA fără viitor: pe orice prefix al seriei numără exact semnalele cu rezultatul ÎNCHIS (j + 10 ≤ ultima bară)", () => {
  const c = context(), R = c.RangeFilter, bare = J.cazuri[0].bare, per = R.PER, warm = 3 * (2 * per - 1);
  const closes = bare.map((b) => Number(b.c)), m = R.motor(closes, R.PER, R.QTY);
  for (const k of [warm + 20, 300, 301, 377, 400, 441, bare.length]) {
    if (k > bare.length) continue;
    const L = k - 1, astept = []; for (let j = warm; j <= L; j++) if ((m.buy[j] || m.sell[j]) && j + R.DIRH <= L) astept.push(j);
    const cit = R.citire(bare.slice(0, k));
    assert.equal(cit.dovada.n, astept.length, "prefixul de " + k + " bare");
  }
});

await test("C texte cinstite: „doar ULTIMELE 500”; cu DOVADA pe 1.000 pornită nu mai cere s-o pornești; TRIGGER spune „NU TRECE” doar la semnal", () => {
  const c = context(), R = c.RangeFilter, cit = R.citire(J.cazuri[0].bare);
  const t500 = c.rfTexte(Object.assign({}, cit, { doar500: true }), 1.96);
  assert.match(t500.detalii, /doar ultimele 500/); assert.doesNotMatch(t500.detalii, /primele 500/);
  const putine = Object.assign({}, cit, { n: 600, adanc: true, dovada: { n: 5, k: 3, hit: 60 } });
  assert.doesNotMatch(c.rfTexte(putine, 1.96).dovadaR, /pornește/, "butonul e deja pornit");
  assert.match(c.rfTexte(putine, 1.96).dovadaR, /mai mult istoric|puține cazuri/i);
  const fara = Object.assign({}, cit, { costNu: true, semnalAcum: false, distPct: 0.002 });
  assert.doesNotMatch(c.rfTexte(fara, 1.96).triggerR, /NU TRECE/, "fără semnal nu e nimic de trecut");
  assert.match(c.rfTexte(fara, 1.96).triggerR, /sub pragul de 2× cost/);
  const cu = Object.assign({}, fara, { semnalAcum: true, semnal: { fel: "BUY", acum: 0, pret: 1 } });
  assert.match(c.rfTexte(cu, 1.96).triggerR, /NU TRECE/);
});

await test("C moneda căutată doar pe spot: fără short - citirea în doar-long, SELL = ieșire", () => {
  const src = citeste("public", "lib", "range-filter-ecran.js");
  assert.match(src, /RangeFilter\.citire\(l\.bare, \{ doarLong: !\/_PERP\$\/\.test\(pionex\) \}\)/);
  const c = context(), cit = c.RangeFilter.citire(J.cazuri[0].bare, { doarLong: true });
  const t = c.rfTexte(Object.assign({}, cit, { doarLong: true, semnalAcum: true, costNu: false, semnal: { fel: "SELL", acum: 0, pret: 1 } }), 1.96);
  assert.doesNotMatch(t.ceFac, /SHORT/); assert.match(t.ceFac, /spot/); assert.match(t.ceFac, /ieșire/);
});

await test("C DOVADA pe 1.000: a doua pagină se lipește doar dacă se leagă (ultima ei bară = prima − interval); altfel doar ultimele 500", async () => {
  const H = 3600000, T = Date.UTC(2026, 10, 1), kl = (t0, n) => Array.from({ length: n }, (_, i) => ({ time: t0 + i * H, open: 100 + i % 7, high: 102 + i % 7, low: 98 + i % 7, close: 100 + (i * 13) % 11, volume: 1 })).reverse();
  for (const [gol, asteptLipsa] of [[0, false], [3 * H, true]]) {
    const c = context({ getJSON: async (u) => /endTime=/.test(u) ? { result: true, data: { klines: kl(T - 500 * H - gol, 500) } } : { result: true, data: { klines: kl(T, 501) } } });
    const l = await c.rfLumanari("TST_USDT_PERP", "60M", true);
    assert.equal(!!l.pag2Lipsa, asteptLipsa, gol ? "gol între pagini ⇒ nelipită" : "legate ⇒ lipite");
    assert.ok(l.bare.length >= (gol ? 499 : 999), "bare: " + l.bare.length);
  }
});

await test("C cache-ul comun nu mai șterge pagina a doua când Tabloul pune doar prima; „Închide toate” nu minte după închiderile de mână", () => {
  const c = context(), LU = c.Lumanari, H = 3600000, t = Math.floor(Date.now() / H) * H, k = (x) => ({ time: x, open: 1, high: 1.1, low: 0.9, close: 1, volume: 1 });
  const r1 = [k(t), k(t - H), k(t - 2 * H)], r2 = [k(t - 3 * H), k(t - 4 * H)];   // bara cea mai nouă e în formare (GridCalcul.bare o aruncă)
  LU.pune("X_USDT_PERP", "60M", r1, r2); LU.pune("X_USDT_PERP", "60M", r1);
  assert.equal((LU.ia("X_USDT_PERP", "60M") || {}).r2, r2, "pagina a doua rămâne pentru aceeași bară");
  const st = stare(c); c.rfToate(true); for (const m of st.monede) c.rfFisaComuta(m.simbol, false);
  assert.match(c.rfHtmlFiltre(st), /rfToate\(true\)">Deschide toate fișele/);
});

console.log(`\n${teste - picate} / ${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
