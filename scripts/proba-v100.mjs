// Probele v100 - Tabloul botului refacut dupa demo-ul aprobat pe 28.09 (https://claude.ai/artifact/5WCB5m54Umdk1i2xSGnXmw):
//   - graficul (public/lib/grafic-bot.js, pur): lumanari + volum, liniile care conteaza cu eticheta in dreapta (planul, zero-ul,
//     intrarea, gridul, stopul, lichidarea; cele din afara cadrului = sageti la margine), alertele DOAR ale botului pe o banda,
//     stranse cand sunt apropiate, Bollinger 20,2 / EMA 20 si 50 / RSI 14 / profil de volum, fiecare cu butonul lui
//   - verdictul scurt + „celelalte motive" pe randul lor; „Acum, concret" in 3 cartele (Stopul, Gridul, Miscarea)
//   - Directia pietei sub „Ce spun indicatorii"
// Rulare: node scripts/proba-v100.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = ["../public/lib/grid-calcul.js", "../public/lib/tablou-extra.js", "../public/lib/semnale-bot.js", "../public/lib/grafic-bot.js"].map(citeste).join("\n");
const M = new Function(`${SRC}; return { GB: typeof GraficBot !== "undefined" ? GraficBot : null, S: SemnaleBot, TE: TabloExtra };`)();
const { GB, S, TE } = M;

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")}`); } }
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const T0 = 1_790_500_000_000, M5 = 5 * 60000;
// 288 de lumanari de 5 min: coborare lina de la 0.62 la 0.566 cu oscilatie, volum variabil (ca JTO pe 28.09)
function klines(n = 288) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = 0.62 - 0.054 * (i / (n - 1)) + 0.004 * Math.sin(i / 5), o = i ? out[i - 1].close : c;
    out.push({ time: T0 + i * M5, open: String(o), close: String(c), high: String(Math.max(o, c) * 1.002), low: String(Math.min(o, c) * 0.998), volume: String(1000 + 500 * Math.abs(Math.sin(i / 7))) });
  }
  return out.reverse();   // Pionex le da de la cea mai noua
}
const BOT = { id: "2386", baza: "JTO.PERP", directie: "long", levier: 5, investit: 98.14, profitTotal: -21.97, pretCurent: 0.566, gridJos: 0.5722, gridSus: 0.6572, pretDeschidere: 0.59176,
  pretLichidare: 0.4712485, distantaLichidarePct: 16.76, opritorPierdere: 0.5455, opritorPierdereActiv: true, ordinePerechi: 10, brut: { buOrderData: { row: 18, gridType: "arithmetic", bottom: "0.5722", top: "0.6572" } } };
const NIV = () => GB.niveluriBot({ bot: BOT, zero: 0.59512, planPlus: { pret: 0.60192, usdt: 5.2 }, planMinus: { pret: 0.57563, usdt: 14.9 } });
const ALERTE = [
  { t: T0 + 200 * M5, nivel: "info", titlu: "JTO: grilă atinsă — a cumpărat la ~0.58810" },
  { t: T0 + 201 * M5, nivel: "atentie", titlu: "JTO: BTC a intrat în mișcare" },
  { t: T0 + 202 * M5, nivel: "critic", titlu: "JTO: planul tău — ieși (pierderea a atins 14.9 USDT)" },
  { t: T0 + 280 * M5, nivel: "atentie", titlu: "JTO: <script>alert(1)</script> prețul e la marginea de jos" },
];
const ST = { bb: true, ema: true, rsi: true, vp: true };

console.log("\nV100 · Tabloul botului refacut (demo-ul aprobat) · proba\n");

await test("modulul GraficBot exista", () => assert.ok(GB, "public/lib/grafic-bot.js lipseste"));
await test("bare: randurile Pionex (texte, de la cea mai noua) -> crescator dupa timp, cu volum; randurile stricate se sar", () => {
  const b = GB.bare(klines(10).concat([{ time: "x", open: "1", close: "1", high: "1", low: "1" }, { time: T0 + 99 * M5, open: "0", close: "1", high: "1", low: "1", volume: "1" }]));
  assert.equal(b.length, 10); assert.ok(b[0].t < b[9].t); assert.ok(b[0].v > 0 && typeof b[0].c === "number");
});
await test("indicatori: EMA pe constanta = constanta; RSI pe urcare continua = 100, pe ±1 alternat ~50; Bollinger pe constanta = benzi lipite", () => {
  const k = Array(60).fill(2), up = Array.from({ length: 60 }, (_, i) => i + 1), alt = Array.from({ length: 80 }, (_, i) => 10 + (i % 2));
  assert.equal(GB.ema(k, 20)[59], 2); assert.equal(GB.ema(k, 20)[10], null, "sub 20 de bare nu inventeaza");
  aprox(GB.rsi(up, 14)[59], 100, 1e-6); aprox(GB.rsi(alt, 14)[79], 50, 3);
  const bb = GB.bollinger(k, 20, 2)[59]; assert.equal(bb.m, 2); assert.equal(bb.s, 2); assert.equal(bb.j, 2);
  const bb2 = GB.bollinger(alt, 20, 2)[79]; aprox(bb2.m, 10.5, 1e-9); aprox(bb2.s - bb2.m, 1, 1e-9, "2 abateri standard de 0,5");
});
await test("niveluriBot: planul (+/−), zero-ul, intrarea, gridul, stopul (doar activ), lichidarea - cu eticheta si culoarea lor", () => {
  const n = NIV(), k = n.map((x) => x.k);
  for (const x of ["gridSus", "planPlus", "zero", "intrare", "planMinus", "gridJos", "stop", "lich"]) assert.ok(k.includes(x), "lipseste " + x);
  assert.match(n.find((x) => x.k === "planPlus").t, /plan \+5\.2 USDT/); assert.match(n.find((x) => x.k === "planMinus").t, /plan −14\.9 USDT/);
  assert.ok(!GB.niveluriBot({ bot: { ...BOT, opritorPierdereActiv: false } }).some((x) => x.k === "stop"), "stopul stins nu se deseneaza");
  assert.ok(!GB.niveluriBot({ bot: BOT }).some((x) => x.k === "planPlus"), "fara plan nu inventeaza linii de plan");
});
await test("grupeaza: alertele la mai putin de 16 px se strang intr-un punct cu numarul lor si culoarea celei mai grave; cele departate raman separate", () => {
  const tx = (t) => (t - T0) / (288 * M5) * 800;
  const g = GB.grupeaza(ALERTE, tx, 16);
  assert.equal(g.length, 2, JSON.stringify(g.map((x) => x.l.length))); assert.equal(g[0].l.length, 3); assert.equal(g[0].nivel, "critic"); assert.equal(g[1].nivel, "atentie");
});
await test("desen: lumanari (o bara la 5 min), volum, banda + treptele gridului, liniile cu eticheta, sageti pentru ce e in afara cadrului (grid sus, lichidare), banda de alerte, RSI, profil, EMA, Bollinger", () => {
  const d = GB.desen({ bare: GB.bare(klines()), W: 1000, ingust: false, st: ST, niv: NIV(), grila: { jos: 0.5722, sus: 0.6572, n: 18, geo: false }, alerte: ALERTE, per: "24h" });
  assert.ok(d && typeof d.svg === "string" && d.harta, "desen() intoarce {svg, harta}");
  assert.equal((d.svg.match(/class="gbC"/g) || []).length, 288, "o lumanare pe bara la 1000 px");
  assert.equal((d.svg.match(/class="gbV"/g) || []).length, 288, "volumul");
  assert.match(d.svg, /zero-ul botului 0\.5951/); assert.match(d.svg, /plan −14\.9 USDT 0\.5756/); assert.match(d.svg, /intrarea medie 0\.5918/);
  assert.match(d.svg, /↓ lichidare 0\.4712/, "lichidarea e departe -> sageata jos cu distanta"); assert.match(d.svg, /↑ grid sus 0\.6572/);
  assert.equal((d.svg.match(/class="gbE"/g) || []).length, 2, "doua puncte pe banda de alerte");
  assert.match(d.svg, /class="gbRsi"/); assert.match(d.svg, /cel mai tranzacționat/); assert.match(d.svg, /class="gbEma20"/); assert.match(d.svg, /class="gbEma50"/); assert.match(d.svg, /class="gbBb"/);
  assert.doesNotMatch(d.svg, /<script>/, "titlurile alertelor nu intra in SVG ca HTML");
  assert.doesNotMatch(d.svg, /NaN|undefined/);
});
await test("desen: indicatorii opriti nu se deseneaza; RSI oprit -> SVG mai scund; pe telefon (390) lumanarile se strang (cel mult ~1 la 3 px)", () => {
  const baza = { bare: GB.bare(klines()), niv: NIV(), grila: { jos: 0.5722, sus: 0.6572, n: 18, geo: false }, alerte: ALERTE, per: "24h" };
  const toate = GB.desen({ ...baza, W: 1000, ingust: false, st: ST }), fara = GB.desen({ ...baza, W: 1000, ingust: false, st: { bb: false, ema: false, rsi: false, vp: false } });
  assert.doesNotMatch(fara.svg, /gbRsi|gbEma20|gbBb|cel mai tranzacționat/); assert.ok(fara.inaltime < toate.inaltime, "fara RSI e mai scund");
  const tel = GB.desen({ ...baza, W: 330, ingust: true, st: ST }), n = (tel.svg.match(/class="gbC"/g) || []).length;
  assert.ok(n < 288 && n >= 60, "lumanari pe telefon: " + n); assert.ok(tel.harta.f > 1);
});
await test("tip: sub cursor spune ora, deschiderea/maximul/minimul/inchiderea, volumul, RSI, EMA si alertele din apropiere - cu titlurile scapate (fara HTML)", () => {
  const d = GB.desen({ bare: GB.bare(klines()), W: 1000, ingust: false, st: ST, niv: NIV(), grila: { jos: 0.5722, sus: 0.6572, n: 18, geo: false }, alerte: ALERTE, per: "24h" });
  const x = d.harta.bare.findIndex((b) => b.t >= T0 + 201 * M5) * d.harta.cw + d.harta.cw / 2;
  const h = GB.tip(d.harta, x);
  for (const w of ["deschidere", "maxim", "minim", "închidere", "volum", "RSI 14", "EMA 20", "EMA 50"]) assert.ok(h.includes(w), "lipseste " + w);
  assert.match(h, /planul tău — ieși/); assert.doesNotMatch(h, /JTO: /, "prefixul monedei se taie");
  const h2 = GB.tip(d.harta, d.harta.bare.findIndex((b) => b.t >= T0 + 280 * M5) * d.harta.cw + d.harta.cw / 2);
  assert.ok(h2.includes("&lt;script&gt;") && !h2.includes("<script>"), "XSS: " + h2.slice(0, 200));
});
await test("celelalteMotive: componentele verdictului in afara celui principal, IEȘI inaintea ATENȚIE; fara componente -> []", () => {
  const sm = S.semafor({ bot: { ...BOT, distantaLichidarePct: 22 }, fisa: { dir: "long", directie: { dir: "long", tarie: "mediu", motive: [] }, regim: { r4h: 1.7, r24h: 1.1, miscare: true, sens: "coboara" }, liniste: null, setare: { jos: 0.52, sus: 0.63, grile: 9, pas: 0.022, levier: 5, dir: "long", stop: { jos: 0.5, sus: 0.66 } }, propusa: "aleasa", deasa: null },
    plan: { atins: ["minus"], minus: { prag: 14.9 } }, btc: { nivel: "atentie", text: "BTC" } });
  assert.equal(sm.nivel, "iesi");
  const alte = S.celelalteMotive(sm);
  assert.ok(alte.length >= 2, JSON.stringify(alte)); assert.ok(!alte.some((x) => x.motiv === sm.motiv), "principalul nu se repeta");
  assert.ok(alte.every((x) => x.motiv && x.faCe && x.nivel)); assert.deepEqual(S.celelalteMotive({ nivel: "tine", motiv: "x", faCe: "y", componente: [] }), []);
});
await test("acumConcret: fiecare cartela are cifra mare, eticheta de stare si actiunea de un rand (Stopul, Gridul, Miscarea); textul intreg ramane in detalii", () => {
  const f = { dir: "long", regim: { r4h: 1.7, r24h: 1.1, miscare: true, sens: "coboara" }, setare: { jos: 0.5216, sus: 0.6322, grile: 9, pas: 0.022, levier: 5, dir: "long", stop: { jos: 0.5, sus: 0.66 } }, treceriZi: 2.7, propusa: "aleasa",
    deasa: { setare: { jos: 0.5216, sus: 0.6322, grile: 64, pas: 0.003, levier: 5, dir: "long", stop: { jos: 0.519, sus: 0.635 } }, treceriZi: 62.6, respinsa: true, motiv: "pe istoric a ieșit pe minus (mediana −5,94%)", aceeasi: false } };
  const l = S.acumConcret({ bot: BOT, fisa: f, zero: { pretZero: 0.59512 }, costuri: { grile24h: 2.15, umpleri24h: 10 }, acum: T0 });
  const c = Object.fromEntries(l.map((x) => [x.cod, x]));
  assert.equal(c.stop.mare, "0.5455"); assert.match(c.stop.mic, /activ/); assert.ok(c.stop.tag && c.stop.tag.t && ["good", "warn", "bad", "mut"].includes(c.stop.tag.c));
  assert.match(c.grid.mare, /−1,1%/); assert.equal(c.grid.tag.c, "bad"); assert.match(c.grid.tag.t, /nu tranzacționează/); assert.match(c.grid.act, /10 grile/);   // v100.38: propunerea de 9 intervale = 10 grile Pionex
  assert.equal(c.miscare.mare, "1,7×"); assert.equal(c.miscare.tag.c, "bad"); assert.match(c.miscare.tag.t, /împotriva botului/);
  for (const x of l) { assert.ok(x.act && x.act.length < x.text.length + 1, "actiunea e mai scurta decat detaliile"); assert.ok(x.text.length > 30); }
  const ff = S.acumConcret({ bot: BOT, fisa: null, zero: { pretZero: 0.59512 }, costuri: {}, acum: T0 });
  assert.equal(ff.find((x) => x.cod === "miscare").tag.t, "socotesc");
});
await test("pagina: verdict scurt + #tbMotive + #tbConcret dupa randul de sus; Directia pietei in coloana graficului sub indicatori; Banii botului ramane in dreapta jos; butoanele indicatorilor; socoteala coboara intr-o sectiune pliata", () => {
  const h = citeste("../public/index.html"), poz = (s) => { const i = h.indexOf(s); assert.ok(i >= 0, "lipseste " + s); return i; };
  assert.ok(poz('class="tbSus"') < poz('id="tbMotive"') && poz('id="tbMotive"') < poz('id="tbConcret"') && poz('id="tbConcret"') < poz('class="tbGraficRand"'));
  const rand = h.slice(poz('class="tbGraficRand"'), poz('id="tbIdei"'));
  // v100.111 (I-542): indicatorii + direcția = UN tabel „Trendul pe TF-uri”, tot în rândul graficului
  assert.ok(rand.includes('id="tbTrendCard"') && rand.includes('id="tbIndicatoriRezumat"') && rand.includes('id="tbDirectieRezumat"'), "tabelul unic, langa grafic");
  const side = h.slice(poz('class="tbSideNou"'), poz('id="tbPl-plan"'));
  assert.ok(side.includes('id="tbBaniCard"') && !side.includes('id="tbTrendCard"'));
  for (const k of ["bb", "ema", "rsi", "vp"]) assert.match(h, new RegExp("tbComutaInd\\('" + k + "'\\)"));
  assert.match(h, /id="tbPl-socoteala"/);
  assert.match(h, /<script src="\/lib\/grafic-bot\.js/); assert.ok(poz('src="/lib/grafic-bot.js') > poz('src="/lib/grid-calcul.js'));
  assert.match(citeste("../public/sw.js"), /"\/lib\/grafic-bot\.js"/, "in precache");
});
await test("app.js: graficul deseneaza cu GraficBot si DOAR alertele botului (TabloExtra.alerteleBotului), nu tot contul; verdictul nu mai contine „Acum, concret”", () => {
  const a = citeste("../public/app.js"), i = a.indexOf("function renderTabloGrafic("), corp = a.slice(i, a.indexOf("\nfunction ", i + 10));
  assert.ok(i > 0); assert.match(corp, /GraficBot\.desen\(/);
  // v100.99 (I-532): filtrul pe bot e în intrarea PURĂ (GraficBot.intrareBot, cu TabloExtra.alerteleBotului) - se verifică ce întoarce
  assert.match(corp, /GraficBot\.intrareBot\(\{bot:b,/);
  const GBi = new Function(fs.readFileSync(new URL("../public/lib/grafic-bot.js", import.meta.url), "utf8") + "; return GraficBot;")();
  const TEa = { alerteleBotului: (l, id) => l.filter((x) => x.bot === id), dacaInchizi: () => null, totalLaOpritor: () => null };
  assert.deepEqual(GBi.intrareBot({ bot: { id: "A" }, bare: [], alerteServer: [{ bot: "A", t: 1 }, { bot: "B", t: 2 }], W: 800, TabloExtra: TEa }).alerte, [{ bot: "A", t: 1 }], "doar alertele botului");
  assert.doesNotMatch(corp, /TabloExtra\.evenimente\(ist,tbStare\.alerteServer/, "vechiul desen cu toate alertele contului");
  const j = a.indexOf("function tbDeseneazaSemafor("), sem = a.slice(j, a.indexOf("\nfunction ", j + 10));
  assert.doesNotMatch(sem, /tbConcret"><h5>Acum, concret/, "Acum, concret are randul lui");
  assert.match(a, /function tbComutaInd\(/);
});

// ---------- revizia v100 (28.09) ----------
await test("revizie 🔴: moneda ieftina (0.00001234) - etichetele din grafic au cifre semnificative, nu „0.0000”; pretul plat nu da NaN", () => {
  const k = klines().map((x) => ({ ...x, open: String(Number(x.open) / 50000), close: String(Number(x.close) / 50000), high: String(Number(x.high) / 50000), low: String(Number(x.low) / 50000) }));
  const b = { ...BOT, gridJos: 0.5722 / 50000, gridSus: 0.6572 / 50000, pretDeschidere: 0.59176 / 50000, pretLichidare: 0.4712485 / 50000, opritorPierdere: 0.5455 / 50000 };
  const d = GB.desen({ bare: GB.bare(k), W: 1000, ingust: false, st: ST, niv: GB.niveluriBot({ bot: b, zero: 0.59512 / 50000 }), grila: { jos: b.gridJos, sus: b.gridSus, n: 18 }, alerte: [], per: "24h" });
  assert.doesNotMatch(d.svg, /0\.0000</, "etichete „0.0000”"); assert.match(d.svg, /zero-ul botului 0\.00001190/);
  const plat = Array.from({ length: 40 }, (_, i) => ({ time: T0 + i * M5, open: "1", close: "1", high: "1", low: "1", volume: "5" }));
  assert.doesNotMatch(GB.desen({ bare: GB.bare(plat), W: 800, ingust: false, st: ST, niv: [], grila: {}, alerte: [], per: "24h" }).svg, /NaN/);
});
await test("revizie: pe telefon etichetele din dreapta au un nume scurt (zero, stop, −14.9 …), nu doar cifre colorate", () => {
  const d = GB.desen({ bare: GB.bare(klines()), W: 330, ingust: true, st: ST, niv: NIV(), grila: { jos: 0.5722, sus: 0.6572, n: 18 }, alerte: [], per: "24h" });
  assert.match(d.svg, />zero 0\.5951</); assert.match(d.svg, />−14\.9 0\.5756</); assert.match(d.svg, />intrare 0\.5918</);
});
await test("revizie: cu RSI oprit, axa timpului ramane in SVG; legenda nu arata ce nu e desenat (fara zero / fara plan / o singura parte a planului)", () => {
  const d = GB.desen({ bare: GB.bare(klines()), W: 1000, ingust: false, st: { bb: false, ema: false, rsi: false, vp: false }, niv: [], grila: {}, alerte: [], per: "24h" });
  const ys = [...d.svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*text-anchor="(start|middle|end)"/g)].map((m) => Number(m[1]));
  assert.ok(ys.length && ys.every((y) => y <= d.inaltime - 2), "axa timpului in afara SVG-ului: " + ys + " / " + d.inaltime);
  assert.doesNotMatch(d.legenda, /zero-ul botului|planul, pe/);
  const doarPlus = GB.desen({ bare: GB.bare(klines()), W: 1000, ingust: false, st: ST, niv: GB.niveluriBot({ bot: BOT, planPlus: { pret: 0.602, usdt: 5 } }), grila: {}, alerte: [], per: "24h" });
  assert.match(doarPlus.legenda, /planul, pe plus/); assert.doesNotMatch(doarPlus.legenda, /planul, pe minus/);
});
await test("revizie: cartela Stop - „sub gridul de jos” doar daca stopul CHIAR e sub grid; un stop pus in grid se spune; stop nepus pe plus -> „pune-l la zero”, nu „muta-l”", () => {
  const f = { dir: "long", regim: { r4h: 0.9, r24h: 1, miscare: false }, setare: { jos: 0.52, sus: 0.63, grile: 9, pas: 0.022, levier: 5, dir: "long", stop: { jos: 0.5, sus: 0.66 } }, propusa: "aleasa", deasa: null };
  const inGrid = S.acumConcret({ bot: { ...BOT, opritorPierdere: 0.58, pretCurent: 0.59 }, fisa: f, zero: { pretZero: 0.5951 }, costuri: {}, acum: T0 }).find((x) => x.cod === "stop");
  assert.doesNotMatch(inGrid.act, /sub gridul de jos/); assert.match(inGrid.act, /în grid/); assert.equal(inGrid.tag.c, "warn");
  const sub = S.acumConcret({ bot: BOT, fisa: f, zero: { pretZero: 0.5951 }, costuri: {}, acum: T0 }).find((x) => x.cod === "stop");
  assert.match(sub.act, /sub gridul de jos/);
  const nepus = S.acumConcret({ bot: { ...BOT, opritorPierdereActiv: false, pretCurent: 0.62, profitTotal: 3 }, fisa: f, zero: { pretZero: 0.6012 }, costuri: {}, acum: T0 }).find((x) => x.cod === "stop");
  assert.match(nepus.tag.t, /de pus la zero/); assert.match(nepus.act, /Aș pune stopul la 0\.6012/);   // v100.61: persoana I
});
await test("revizie: botul NEUTRU (zero-ul nu se socoteste niciodata) -> „reper”, nu „de socotit”; pretul in afara gridului -> Miscarea nu mai spune „gridul lucreaza”", () => {
  const f = { dir: "neutru", regim: { r4h: 0.8, r24h: 0.9, miscare: false }, setare: { jos: 0.52, sus: 0.63, grile: 9, pas: 0.022, levier: 5, dir: "neutru", stop: { jos: 0.5, sus: 0.66 } }, propusa: "aleasa", deasa: null };
  const n = S.acumConcret({ bot: { ...BOT, directie: "neutru" }, fisa: f, zero: null, costuri: {}, acum: T0 });
  assert.equal(n.find((x) => x.cod === "stop").tag.t, "reper"); assert.doesNotMatch(n.find((x) => x.cod === "stop").text + n.find((x) => x.cod === "stop").act, /nu se poate socoti/);
  const afara = S.acumConcret({ bot: BOT, fisa: { ...f, dir: "long" }, zero: { pretZero: 0.5951 }, costuri: {}, acum: T0 }).find((x) => x.cod === "miscare");
  assert.doesNotMatch(afara.act, /[Gg]ridul lucrează/); assert.match(afara.act, /afara gridului|afara intervalului|în afara gridului/);
});
await test("revizie: aplicatia - #tbConcret ascuns chiar ascunde (CSS); fara bot se golesc cartelele, motivele si socoteala; graficul nu deseneaza lumanarile altei monede/perioade; „ia profit” nu se dubleaza; ultimele alerte si ca text; test:v100 e in npm test", () => {
  const css = citeste("../public/app.css"), a = citeste("../public/app.js"), pkg = JSON.parse(citeste("../package.json"));
  assert.match(css, /#tabloubot \.tbConcret\[hidden\]\{display:none\}/);
  assert.doesNotMatch(css, /#tabloubot \.tbConcret p\{/, "regula veche din v99 bate actiunea din cartele");
  const i = a.indexOf("function tbDeseneazaBanii("), ban = a.slice(i, a.indexOf("\n", a.indexOf("if(!b)", i)));
  assert.match(ban, /tbDeseneazaSemafor\(null\)/, "fara bot: cartelele si motivele se ascund");
  const j = a.indexOf("function tbDeseneazaSemafor("), sem = a.slice(j, a.indexOf("\nfunction ", j + 10));
  assert.match(sem, /tbSocoteala/); assert.doesNotMatch(sem, /alte\.push\(\{c:"var\(--muted\)",m:iap\.text/, "ia profit apare deja ca motiv");
  const k = a.indexOf("function renderTabloGrafic("), gr = a.slice(k, a.indexOf("\nfunction ", k + 10));
  assert.match(gr, /g\.simbol!==|g\.simbol !==/, "verifica simbolul si perioada lumanarilor"); assert.match(gr, /typeof GraficBot/); assert.match(gr, /gbUlt/);
  assert.match(pkg.scripts.test, /npm run test:v100/); assert.equal(pkg.scripts["test:v100"], "node scripts/proba-v100.mjs");
});

await test("v100.2 (el: „pune Ce ai de facut acum sub grafic si incadreaza in pagina sa nu mai ramana goluri”): Ce ai de facut sta sub grafic in coloana stanga; jos „Daca pretul ajunge la” langa „Banii botului”, iar „Pe zi, la inchidere” pe toata latimea, pe doua coloane", () => {
  const h = citeste("../public/index.html"), poz = (s) => { const i = h.indexOf(s); assert.ok(i >= 0, "lipseste " + s); return i; };
  const rand = h.slice(poz('class="tbGraficRand"'), poz('id="tbIdei"'));
  assert.ok(rand.includes('class="tbGrStanga"'), "coloana stanga a graficului");
  const st = rand.slice(rand.indexOf('class="tbGrStanga"'), rand.indexOf('class="tbGrCol"'));
  assert.ok(st.includes('id="tbGraficCard"') && st.includes('id="tbTodo"') && st.indexOf('id="tbGraficCard"') < st.indexOf('id="tbTodo"'), "Ce ai de facut sub grafic, in aceeasi coloana");
  assert.equal(h.split('id="tbTodo"').length - 1, 1, "o singura sectiune Ce ai de facut");
  const jos = h.slice(poz('class="tbGrilaNoua"'), poz('id="tbPl-plan"'));
  const main = jos.slice(jos.indexOf('class="tbMain"'), jos.indexOf('class="tbSideNou"'));
  assert.ok(main.includes('id="tbScenariiCard"') && !main.includes('id="tbAcumCard"'), "in stanga jos doar scenariile");
  assert.ok(poz('id="tbAcumCard"') > poz('class="tbSideNou"') && poz('id="tbAcumCard"') < poz('id="tbPl-plan"'), "Pe zi, la inchidere dupa randul cu Banii, pe toata latimea");
  const css = citeste("../public/app.css");
  assert.match(css, /#tabloubot \.tbGrStanga\{[^}]*display:grid/); assert.match(css, /#tabloubot #tbAcum\{[^}]*columns:/); assert.match(css, /#tabloubot #tbAcum \.tbLinie\{[^}]*break-inside:avoid/);
});

// ---------- v100.3 (el, 28.09: „procentul LIVE, acelasi cu cel din TradingView”) - rezerva din colector ----------
// TradingView socoteste procentul fata de inchiderea de ieri = deschiderea lumanarii zilnice (00:00 UTC). Pagina alerts il ia live
// de la Binance; pentru monedele care nu sunt pe Binance, colectorul pune in poza aceeasi socoteala pe lumanarea zilnica Pionex.
await test("v100.3: ziDinKlines ia deschiderea zilei de AZI (00:00 UTC) din lumanarile 1D Pionex, in orice ordine; bara de ieri sau nimic -> null", async () => {
  const { ziDinKlines } = await import("./lib/poza.mjs");
  assert.equal(typeof ziDinKlines, "function", "ziDinKlines exportat din scripts/lib/poza.mjs");
  const ZI = 86400000, acum = Date.UTC(2026, 8, 28, 13, 40), azi = Date.UTC(2026, 8, 28);
  const k = [{ time: azi, open: "0.5960", close: "0.5582", high: "0.6", low: "0.55" }, { time: azi - ZI, open: "0.61", close: "0.5960", high: "0.62", low: "0.59" }];
  assert.deepEqual(ziDinKlines(k, acum), { deschidere: 0.596, t: azi });
  assert.deepEqual(ziDinKlines(k.slice().reverse(), acum), { deschidere: 0.596, t: azi }, "ordinea nu conteaza");
  assert.equal(ziDinKlines([k[1]], acum), null, "doar bara de ieri (ziua noua inca nu a aparut) -> null, nu procentul de ieri");
  assert.equal(ziDinKlines(null, acum), null); assert.equal(ziDinKlines([{ time: azi, open: "0" }], acum), null, "deschidere 0 -> null");
});
await test("v100.3: construiestePoza pune zi {deschidere, pct} pe bot din ziPionex; fara -> zi null (pagina cade pe d24)", async () => {
  const { construiestePoza } = await import("./lib/poza.mjs");
  const b = { id: "2386", baza: "JTO.PERP", directie: "long", pretCurent: 0.5702, gridJos: 0.5722, gridSus: 0.6572, profitTotal: -18.84, ziPionex: { deschidere: 0.596, t: Date.UTC(2026, 8, 28) } };
  const p = construiestePoza({ acum: Date.UTC(2026, 8, 28, 13, 40), versiune: "v100.3", boti: [b], t212: [], simboluri: [] });
  assert.ok(p.boti[0].zi, "zi in poza"); assert.equal(p.boti[0].zi.deschidere, 0.596); aprox(p.boti[0].zi.pct, 0.5702 / 0.596 - 1, 1e-6, "pct");
  const p2 = construiestePoza({ acum: Date.UTC(2026, 8, 28, 13, 40), versiune: "v100.3", boti: [{ ...b, ziPionex: null }], t212: [], simboluri: [] });
  assert.equal(p2.boti[0].zi, null);
});
await test("v100.3: colectorul cere lumanarea zilnica Pionex a botului (interval=1D) si o da pozei ca ziPionex", () => {
  const c = citeste("./colector.mjs");
  assert.match(c, /_USDT_PERP[\s\S]{0,200}interval=1D&limit=2/, "cererea 1D pe simbolul perpetual");
  assert.match(c, /ziDinKlines\(/); assert.match(c, /ziPionex/);
});

// ---------- v100.4 (el, 28.09: „atât în pagina alerts cât și în pagina botului lipsește profit per grilă, adică doar din grid”) ----------
// Pionex arata doua cifre ale gridului: „Grid profit” (tot ce a adus gridul, fara pozitie) si „Profit/grid” (cat aduce O grila, dupa
// comision). Amandoua trebuie la vedere, pe Tablou si pe pagina alerts.
const BOT_G = () => ({ id: "2386", baza: "JTO.PERP", directie: "long", levier: 5, investit: 98.14, gridJos: 0.5455, gridSus: 0.565, pretCurent: 0.5603, gridProfitBrut: 12.31882676, ordinePerechi: 27, comisioane: -1.89, profitTotal: -20.76, brut: { buOrderData: { row: 12, gridType: "arithmetic" } } });
await test("v100.4: TabloExtra.profitPeGrila - ce aduce O grila dupa comision: procentul (ca „Profit/grid” din Pionex) si banii (investit x levier / grile x procent); fara grile -> null", () => {
  assert.equal(typeof TE.profitPeGrila, "function", "TabloExtra.profitPeGrila exportat");
  const g = TE.geometrieBot(BOT_G()), r = TE.profitPeGrila(BOT_G());
  aprox(r.pct, g.netPct, 1e-12, "pct = pasul net al botului"); assert.equal(r.grile, 12); assert.equal(r.mod, "aritmetic");
  aprox(r.usdt, 98.14 * 5 / 11 * g.netPct, 1e-9, "usdt pe grila (v100.38: row 12 = 12 linii = 11 intervale / loturi)");
  assert.equal(TE.profitPeGrila({ ...BOT_G(), brut: { buOrderData: {} } }), null, "fara numarul de grile -> null");
  assert.equal(TE.profitPeGrila({ ...BOT_G(), investit: null }).usdt, null, "fara investit: procentul ramane, banii nu se inventeaza");
});
await test("v100.4: poza duce grila {pct, usdt, grile} pe bot; fara -> null", async () => {
  const { construiestePoza } = await import("./lib/poza.mjs");
  const b = { ...BOT_G(), grila: { pct: 0.00196, usdt: 0.0801, grile: 12, mod: "aritmetic" } };
  const p = construiestePoza({ acum: Date.UTC(2026, 8, 28, 14), versiune: "v100.4", boti: [b], t212: [], simboluri: [] });
  assert.deepEqual(p.boti[0].grila, { pct: 0.00196, usdt: 0.0801, grile: 12 });
  const p2 = construiestePoza({ acum: Date.UTC(2026, 8, 28, 14), versiune: "v100.4", boti: [{ ...b, grila: null }], t212: [], simboluri: [] });
  assert.equal(p2.boti[0].grila, null);
});
await test("v100.4: colectorul pune profitul pe grila in poza (TabloExtra.profitPeGrila)", () => {
  assert.match(citeste("./colector.mjs"), /grila: TabloExtra\.profitPeGrila\(b\)/);
});
await test("v100.4: Tabloul - profitul DOAR din grid la vedere: sub „Rezultat total” (tbKpiGrid) si in Banii botului ca rand colorat, plus „Pe grilă, după comision”", () => {
  const html = citeste("../public/index.html"), app = citeste("../public/app.js");
  assert.match(html, /id="tbKpiTotal"[^>]*>[^<]*<\/b><span id="tbKpiGrid" class="tbKpiGrid">/, "randul din grid imediat sub rezultatul total");
  assert.match(app, /pune\("tbKpiGrid",/);
  assert.match(app, /rand\("Profit doar din grid",botiBan\(b\.gridProfitBrut\),botiClasa\(b\.gridProfitBrut\)/, "rand normal, colorat - nu gri");
  assert.doesNotMatch(app, /rand\("Profit brut din grid"/);
  assert.match(app, /rand\("Pe grilă, după comision"/);
  assert.match(citeste("../public/app.css"), /#tabloubot \.tbKpiGrid\{/);
});

// ---------- v100.5 (el, 28.09: „la Ce ai de făcut acum pune ora la fiecare sfat ca să știu dacă e de actualitate sau nu”) ----------
// Alerta poarta ora ei (ultima din grup); sfatul, avertismentul, planul si „Nimic urgent” poarta ora datelor din care s-au
// socotit (ultima citire a botului). Ora se scrie „HH:MM · acum N min”; peste o ora randul e marcat vechi.
await test("v100.5: ceAiDeFacut - fiecare rand are ora (la): alerta = ultima din grup, restul = ora datelor botului", () => {
  const ACUM = Date.UTC(2026, 8, 28, 13, 0), DATE = ACUM - 2 * 60000;
  const al = (min, titlu, nivel = "atentie") => ({ t: ACUM - min * 60000, titlu, nivel, mesaj: "" });
  const l = TE.ceAiDeFacut({ acum: ACUM, dateLa: DATE, planGol: true, avertismente: ["Opritorul e stins"],
    alerte: [al(300, "JTO: iese din grid pe jos"), al(90, "JTO: iese din grid pe jos")],
    sfaturi: [{ ton: "atentie", titlu: "Pune stopul la zero", text: "x", faCe: "y" }] });
  const dupa = (t) => l.find((x) => x.titlu === t);
  assert.equal(dupa("iese din grid pe jos").la, ACUM - 90 * 60000, "alerta = cea mai noua din grup");
  assert.equal(dupa("Opritorul e stins").la, DATE, "avertismentul = ora datelor");
  assert.equal(dupa("Pune stopul la zero").la, DATE);
  assert.equal(dupa("Nu ai un plan pentru bot").la, DATE);
  assert.equal(TE.ceAiDeFacut({ acum: ACUM, dateLa: DATE, alerte: [], avertismente: [], sfaturi: [], planGol: false })[0].la, DATE, "Nimic urgent = ora datelor");
  const lipsa = TE.ceAiDeFacut({ acum: ACUM, alerte: [], avertismente: [], sfaturi: [], planGol: true });
  assert.equal(lipsa[0].la, null, "fara ora datelor nu se inventeaza una");
});
// v100.63 (revizia Opus I2, 02.10): randul unit arata starea de ACUM (titlul avertismentului, textul sfatului de acum, culoarea lui) -
// ora lui e ora citirii botului, ca sa raspunda la ce a cerut el la v100.5 („ca să știu dacă e de actualitate”); de la alerta ramane ×N
await test("v100.5 → v100.63: avertismentul care înghite o alertă e starea de acum - ora citirii botului, ×N de la alertă", () => {
  const ACUM = Date.UTC(2026, 8, 28, 13, 0);
  const l = TE.ceAiDeFacut({ acum: ACUM, dateLa: ACUM, sfaturi: [], planGol: false,
    alerte: [{ t: ACUM - 40 * 60000, titlu: "JTO: opritorul pe pierdere e setat dar stins", nivel: "critic", mesaj: "" }],
    avertismente: ["Opritorul pe pierdere e setat dar STINS — nu se va declanșa."] });
  assert.equal(l.length, 1); assert.equal(l[0].la, ACUM); assert.equal(l[0].n, 1);
});
await test("v100.5: TabloExtra.oraSfat - „HH:MM · acum N min”, ieri cu „ieri”, vechi peste o ora, fara ora -> null", () => {
  assert.equal(typeof TE.oraSfat, "function", "TabloExtra.oraSfat exportat");
  const ACUM = new Date(2026, 8, 28, 15, 40).getTime();
  assert.deepEqual(TE.oraSfat(new Date(2026, 8, 28, 15, 38).getTime(), ACUM), { text: "15:38 · acum 2 min", vechi: false });
  assert.deepEqual(TE.oraSfat(new Date(2026, 8, 28, 15, 40, 20).getTime(), ACUM), { text: "15:40 · chiar acum", vechi: false }, "ceasul putin inainte nu da minute negative");
  assert.deepEqual(TE.oraSfat(new Date(2026, 8, 28, 12, 10).getTime(), ACUM), { text: "12:10 · acum 3 h 30 min", vechi: true });
  assert.deepEqual(TE.oraSfat(new Date(2026, 8, 27, 22, 5).getTime(), ACUM), { text: "ieri 22:05 · acum 17 h", vechi: true });
  assert.equal(TE.oraSfat(null, ACUM), null);
});
await test("v100.5: Tabloul scrie ora pe fiecare rand din „Ce ai de făcut acum” (dateLa = ultima citire a botului; consilierul ia aceeasi ora)", () => {
  const app = citeste("../public/app.js");
  assert.match(app, /tbStare\.botLa=Date\.now\(\)/, "ora citirii botului tinuta la citirea reusita");
  assert.match(app, /ceAiDeFacut\(\{acum:Date\.now\(\),dateLa:tbStare\.botLa/);
  assert.match(app, /TabloExtra\.oraSfat\(x\.la,Date\.now\(\)\)/);
  assert.match(app, /class="tbOra'/);
  assert.match(citeste("../public/app.css"), /#tabloubot \.tbOra\{/);
});

// v101.5 (el, 29.09: „în pagina alerts PUMP arată greșit”): botul PUMPFUN.PERP are tickerul PUMP_USDT_PERP -> pagina alerts cerea
// Binance PUMPFUNUSDT (400, nu exista) si ramanea fara pretul live; poza poarta acum si moneda reala a bursei (m)
await test("v101.5: poza pune la bot moneda reala a bursei (m) din simbolPionex; fara el, moneda din baza", async () => {
  const { construiestePoza } = await import("./lib/poza.mjs?t=" + Date.now());
  const b = { id: "2388", baza: "PUMPFUN.PERP", quote: "USDT", simbolPionex: "PUMP_USDT_PERP", directie: "long", pretCurent: 0.004919, gridJos: 0.004598, gridSus: 0.005374, profitTotal: 3.27 };
  const p = construiestePoza({ acum: Date.UTC(2026, 8, 29, 6, 20), versiune: "v101.5", boti: [b], t212: [], simboluri: [] });
  assert.equal(p.boti[0].s, "PUMPFUN", "numele botului ramane cel din Pionex");
  assert.equal(p.boti[0].m, "PUMP", "moneda reala pentru Binance");
  const v = construiestePoza({ acum: Date.UTC(2026, 8, 29, 6, 20), versiune: "v101.5", boti: [{ ...b, baza: "JTO.PERP", simbolPionex: undefined }], t212: [], simboluri: [] });
  assert.equal(v.boti[0].m, "JTO");
});

console.log(`\nV100 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste} probe trecute\n`);
process.exit(picate ? 1 : 0);
