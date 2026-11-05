// Proba v100.304 (el, 05.11.2026, la ideile I-805..I-810 după re-auditul Range Filter: „fa toate”) - partea din Radar:
//   1. I-806 rândul „DUPĂ COST”: RangeFilter.citire întoarce jurnalul R după REGULA din Pine v2.5 (I-804) - la 10 bare după semnal,
//      (randamentul în direcția semnalului − cost 0,13%) / distanța close → filtru LA SEMNAL; fără semnalele cu stopul sub 2× cost; în
//      doar-long doar BUY; ultimele 50, mediana pe ele; FĂRĂ stop. Paritate cu motorul Python (rf_motor) pe ETH 1h + 4h (1.000 de bare);
//   2. cartela arată rândul: mediana în R cu O zecimală, ultimele 5, „puține cazuri” sub 20, tooltip-ul cinstit (fără stop, nu e poartă);
//   3. I-808 un singur cache de lumânări (lib/lumanari.js) pe (monedă, interval) până la închiderea barei următoare: Range Filter și
//      Trade-ul zilei nu mai cer de două ori aceleași lumânări 1h; Tabloul folosește același cache;
//   4. I-807 căsuța: sugestiile din listele Pionex (perp TRADING + spot enable), „Pionex n-are XYZ” FĂRĂ nicio cerere de lumânări, moneda doar
//      spot cerută direct pe spot; listele căzute ⇒ ca înainte (perp, apoi spot); ultimele 5 căutări reușite ca butoane (doar în browserul lui);
//   5. I-810 linia de dimineață: boții al căror RF 1h s-a întors CONTRA în ultimele 24 de bare, „RF nedovedit: de privit, nu de închis
//      botul”, cel mult 160 de caractere; legată în colector (v101.164) după rândul BTC;
//   6. versiunile v100.304, lumanari.js înaintea ecranelor și în shell-ul SW, proba în lanțul npm test.
//   node scripts/proba-v100304.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); });
}
console.log("\nV100.304 · ideile I-806 / I-807 / I-808 / I-810 · proba\n");

const J = JSON.parse(citeste("scripts", "proba-date", "rf-jurnal-r.json"));
const D = JSON.parse(citeste("scripts", "proba-date", "rf-btc-1h.json"));
const H = 3600000;
const randuri = (bare, dt) => bare.map((b) => ({ time: b.t + (dt || 0), open: b.o, high: b.h, low: b.l, close: b.c }));
const dtAcum = Math.floor(Date.now() / H) * H - D.bare[D.bare.length - 1].t;   // ultima = bara în formare, ultima închisă = ora trecută
const aproape = (a, b, ce) => assert.ok(a != null && b != null && Math.abs(a - b) < 1e-9, `${ce}: ${a} față de ${b}`);
function stocare() { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m }; }
// getJSON de probă: ține minte cererile; lumânările aceleași pe orice monedă; listele Pionex după piață
function server(opt) {
  opt = opt || {};
  const cereri = [];
  const f = async (u) => {
    cereri.push(u);
    if (/pionex_klines/.test(u)) {
      const s = decodeURIComponent((u.match(/symbol=([^&]+)/) || [])[1] || "");
      if (opt.refuz) return { result: false, retryAfter: 2 };
      if (opt.faraLumanari && opt.faraLumanari.includes(s)) return { result: true, data: { klines: [] } };
      if (opt.lent) await new Promise((r) => setTimeout(r, opt.lent));
      return { result: true, data: { klines: randuri(D.bare, dtAcum) } };
    }
    if (/pionex_symbols/.test(u)) {
      if (opt.faraListe) throw new Error("listele Pionex au căzut");
      return /market=PERP/.test(u) ? { result: true, data: { symbols: [{ symbol: "BTC_USDT_PERP", status: "TRADING" }, { symbol: "PEPE_USDT_PERP", status: "TRADING" }, { symbol: "OLD_USDT_PERP", status: "OFFLINE" }, { symbol: "PUMP_USDT_PERP", baseCurrency: "PUMPFUN", status: "TRADING" }].concat(opt.perpExtra || []) } }
        : { result: true, data: { symbols: [{ symbol: "PEPE_USDT", enable: true }, { symbol: "ONLYSPOT_USDT", enable: true }, { symbol: "DEAD_USDT", enable: false }, { symbol: "BTC_EUR", enable: true }, { symbol: "OLD_USDT", enable: true }] } };
    }
    if (/bot-orders/.test(u)) return { bots: [] };
    if (/clasament/.test(u)) return { clasament: { monede: [] } };
    return {};
  };
  f.cereri = cereri;
  f.lumanari = () => cereri.filter((u) => /pionex_klines/.test(u));
  return f;
}
function context(getJSON, extra) {
  const c = { console, Intl, Date, Math, Number, String, Object, Array, Set, isFinite, JSON, Promise, setTimeout, RegExp, document: { getElementById: () => null } };
  c.window = c; c.module = undefined; c.getJSON = getJSON; Object.assign(c, extra || {});
  vm.createContext(c);
  for (const f of ["text-ro.js", "grid-calcul.js", "lumanari.js", "trade-zilei.js", "trade-zilei-ecran.js", "range-filter.js", "range-filter-ecran.js"]) {
    if (fs.existsSync(path.join(RAD, "public", "lib", f))) vm.runInContext(citeste("public", "lib", f), c);
  }
  return c;
}

await test("1. I-806: jurnalul R după cost = motorul Python (regula Pine v2.5) pe ETH 1h + 4h, și în doar-long", () => {
  const c = context(async () => ({})), R = c.RangeFilter;
  for (const caz of J.cazuri) {
    for (const [opt, a] of [[{}, caz.asteptat], [{ doarLong: true }, caz.asteptat_doar_long]]) {
      const d = R.citire(caz.bare, opt).dupaCost, ce = caz.simbol + " " + caz.interval + (opt.doarLong ? " doar-long" : "");
      assert.ok(d, ce + ": citirea are dupaCost");
      assert.equal(d.nTot, a.n_tot, ce + ": câte semnale trec de cost");
      assert.equal(d.n, a.n, ce + ": câte intră în mediană (cel mult 50)");
      aproape(d.mediana, a.mediana, ce + " mediana");
      assert.equal(d.ultime.length, a.ultime.length, ce + ": ultimele 5");
      d.ultime.forEach((v, i) => aproape(v, a.ultime[i], ce + " ultimele[" + i + "]"));
    }
  }
  // revizia Opus: datele ETH n-au semnale sub 2× cost și nici peste 50 de cazuri ⇒ o serie sintetică (mulberry32) cu ambele, față de
  // regula scrisă separat, bară cu bară, ca în Pine (motorul comun; regula jurnalului independentă)
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(305), bare = [], N = 7000; let p = 100;
  for (let i = 0; i < N; i++) { const pas = (i < N / 2 ? 0.0004 : 0.004) * (rnd() * 2 - 1), o = p; p = p * (1 + pas); bare.push({ t: i * H, o, h: Math.max(o, p) * 1.0005, l: Math.min(o, p) * 0.9995, c: p }); }
  const cl = bare.map((b) => b.c), m = R.motor(cl), warm = 3 * (2 * R.PER - 1), ref = []; let sub = 0;
  for (let j = warm; j < N; j++) {
    const side = m.buy[j] ? 1 : m.sell[j] ? -1 : 0; if (!side || j + R.DIRH > N - 1) continue;
    const dist = Math.abs(cl[j] - m.filt[j]) / cl[j];
    if (!(dist > 0) || dist < 2 * R.COST) { sub++; continue; }
    ref.push(((cl[j + R.DIRH] - cl[j]) / cl[j] * side - R.COST) / dist);
  }
  assert.ok(sub > 5 && ref.length > 60, `seria are și semnale sub prag (${sub}) și peste 50 de cazuri (${ref.length})`);
  const d = R.citire(bare).dupaCost, ult50 = ref.slice(-50).sort((x, y) => x - y), toate = ref.slice().sort((x, y) => x - y);
  const medToate = toate.length % 2 ? toate[toate.length >> 1] : (toate[toate.length / 2 - 1] + toate[toate.length / 2]) / 2;
  assert.ok(Math.abs(medToate - (ult50[24] + ult50[25]) / 2) > 0.01, "seria deosebește mediana pe ultimele 50 de cea pe toate (altfel limita nu se vede; cu sămânța 304 ieșeau egale)");
  assert.equal(d.nTot, ref.length, "doar semnalele peste 2× cost"); assert.equal(d.n, 50, "mediana pe ultimele 50");
  aproape(d.mediana, (ult50[24] + ult50[25]) / 2, "mediana ultimelor 50");
  ref.slice(-5).forEach((v, i) => aproape(d.ultime[i], v, "ultimele[" + i + "]"));
});

await test("2. I-806: cartela are rândul „DUPĂ COST” - mediana cu O zecimală în R, ultimele 5, „puține cazuri” sub 20, tooltip cinstit", () => {
  const c = context(async () => ({})), R = c.RangeFilter, T = c.TextRo;
  const fR = (v) => { const s = T.num(v, 1); return (v > 0 && s !== "0,0" ? "+" : "") + s + "R"; };
  const mult = R.citire(J.cazuri[0].bare), putin = R.citire(J.cazuri[1].bare, { doarLong: true });
  const h = c.rfCartela({ simbol: "ETH", pionex: "ETH_USDT_PERP", fel: "piata", c: mult }, 1.96);
  assert.match(h, /DUPĂ COST/);
  assert.ok(h.includes("mediana " + fR(mult.dupaCost.mediana)), "mediana în R, o zecimală, minusul tipografic");
  assert.ok(h.includes(T.cate(mult.dupaCost.nTot, "semnal", "semnale")), "pe câte semnale");
  assert.ok(h.includes(mult.dupaCost.ultime.map(fR).join(" · ")), "ultimele 5, în ordine");
  assert.doesNotMatch(h.split("DUPĂ COST")[1].split("</div>")[0], /puține cazuri/, "23 de cazuri nu sunt „puține”");
  assert.match(h.split("DUPĂ COST")[1].split("</div>")[0], /rfVal rfTon-fara/, "fără verde / roșu: mediana nu e un verdict, nimic nu e dovedit (revizia Opus)");
  assert.match(h, /title="[^"]*FĂRĂ stop[^"]*"/, "tooltip-ul spune că e fără stop");
  assert.match(h, /title="[^"]*2× cost[^"]*"/, "tooltip-ul spune că semnalele sub 2× cost nu intră");
  const h2 = c.rfCartela({ simbol: "ETH", pionex: "ETH_USDT_PERP", fel: "piata", c: putin }, 1.96);
  assert.match(h2.split("DUPĂ COST")[1].split("</div>")[0], /puține cazuri/, "sub 20 de cazuri se spune");
  const gol = Object.assign({}, mult, { dupaCost: { nTot: 0, n: 0, ultime: [], mediana: null } });
  const h3 = c.rfCartela({ simbol: "ETH", pionex: "ETH_USDT_PERP", fel: "piata", c: gol }, 1.96);
  assert.match(h3, /DUPĂ COST/); assert.doesNotMatch(h3, /NaN|undefined|null R/);
});

await test("3. I-808: un singur cache de lumânări - Trade-ul zilei după Range Filter (și invers) nu mai cere nimic; Tabloul pe același cache", async () => {
  assert.ok(fs.existsSync(path.join(RAD, "public", "lib", "lumanari.js")), "lib/lumanari.js există");
  const g1 = server(), c1 = context(g1, { localStorage: stocare() });
  await c1.rfPorneste(true);
  const dupaRf = g1.lumanari().length;
  assert.ok(dupaRf >= 3, "Range Filter a citit BTC / ETH / SOL");
  await c1.tzPorneste(true);
  assert.equal(g1.lumanari().length - dupaRf, 0, "Trade-ul zilei ia lumânările 1h din cache-ul comun");
  const g2 = server(), c2 = context(g2, { localStorage: stocare() });
  await c2.tzPorneste(true);
  const dupaTz = g2.lumanari().length;
  await c2.rfPorneste(true);
  assert.equal(g2.lumanari().length - dupaTz, 0, "Range Filter ia lumânările din ce a adus Trade-ul zilei");
  // bune doar până se închide bara următoare: lumânări vechi de 10 ore nu se dau din cache
  const L = c2.Lumanari;
  L.pune("VECHI_USDT_PERP", "60M", randuri(D.bare, dtAcum - 10 * H));
  assert.equal(L.ia("VECHI_USDT_PERP", "60M"), null, "cache-ul expirat nu se folosește");
  L.pune("ORA_USDT_PERP", "60M", randuri(D.bare, dtAcum - H));
  assert.equal(L.ia("ORA_USDT_PERP", "60M"), null, "la limită: lumânările de acum o oră s-au învechit la închiderea barei (nu „3 × interval”)");
  // revizia Opus: cererile deja plecate se împart - Range Filter și Trade-ul zilei pornite deodată nu cer de două ori aceeași monedă
  const g3 = server({ lent: 30 }), c3 = context(g3, { localStorage: stocare() });
  await Promise.all([c3.rfPorneste(true), c3.tzPorneste(true)]);
  const sim3 = g3.lumanari().map((u) => decodeURIComponent(u.match(/symbol=([^&]+)/)[1]));
  assert.equal(sim3.length, new Set(sim3).size, "fiecare monedă cerută o singură dată: " + sim3.join(", "));
  // refuzul Pionex pe drumul cu cache: Trade-ul zilei se oprește la prima monedă și o spune
  const g4 = server({ refuz: true }), c4 = context(g4, { localStorage: stocare() });
  await c4.tzPorneste(true);
  assert.equal(g4.lumanari().length, 1, "după refuz nu se mai cere nimic"); assert.match(c4.tzStare.eroare || "", /refuzat/);
  assert.ok(L.ia("BTC_USDT_PERP", "60M"), "cache-ul proaspăt se folosește");
  assert.equal(L.ia("BTC_USDT_PERP", "4H"), null, "intervalul face parte din cheie");
  assert.doesNotMatch(citeste("public", "lib", "range-filter-ecran.js"), /var rfBareCache/, "nu mai e un al doilea cache în pagina Range Filter");
  const A = citeste("public", "app.js"), tb = A.slice(A.indexOf("function tbRangeFilterAdu"), A.indexOf("function tbRangeFilterAdu") + 1200);
  assert.match(tb, /Lumanari\.ia\(k,"60M"\)/, "Tabloul citește din cache-ul comun");
  assert.match(tb, /Lumanari\.pune\(k,"60M",rd\)/, "Tabloul pune în cache-ul comun");
});

await test("4. I-807: sugestiile din listele Pionex, „n-are” fără cereri de lumânări, spot direct; ultimele 5 căutări ca butoane", async () => {
  const st = stocare(), g = server(), c = context(g, { localStorage: st });
  await c.rfSimboluriPionex();
  const html = c.rfHtmlCauta(c.rfStare);
  assert.match(html, /list="rfMonede"/, "căsuța are lista de sugestii");
  for (const s of ["BTC", "PEPE", "ONLYSPOT"]) assert.ok(html.includes('<option value="' + s + '">'), "sugestia " + s);
  assert.equal((html.match(/<option value="PEPE">/g) || []).length, 1, "PEPE (perp + spot) o singură dată");
  assert.ok(!html.includes('<option value="DEAD">'), "DEAD nu e de tranzacționat (spot oprit)");
  assert.ok(html.includes('<option value="OLD">'), "OLD: perp-ul e oprit, dar spot-ul merge");
  assert.doesNotMatch(html, /BTC_EUR|value="BTC_/, "doar perechile pe USDT, fără sufix");
  const q = c.rfStare.cauta;
  let n0 = g.lumanari().length; q.text = "xyzq"; await c.rfCauta(false);
  assert.equal(g.lumanari().length, n0, "simbol inexistent: nicio cerere de lumânări");
  assert.match(q.eroare || "", /Pionex n-are XYZQ/);
  n0 = g.lumanari().length; q.text = "onlyspot"; await c.rfCauta(false);
  assert.deepEqual(g.lumanari().slice(n0).map((u) => decodeURIComponent(u.match(/symbol=([^&]+)/)[1])), ["ONLYSPOT_USDT"], "doar spot ⇒ direct pe spot");
  assert.ok(q.m && q.m.pionex === "ONLYSPOT_USDT");
  // listele căzute ⇒ ca înainte: perp, apoi spot
  const g2 = server({ faraListe: true, faraLumanari: ["NOU_USDT_PERP"] }), c2 = context(g2, { localStorage: stocare() });
  await c2.rfSimboluriPionex();
  c2.rfStare.cauta.text = "nou"; await c2.rfCauta(false);
  assert.deepEqual(g2.lumanari().map((u) => decodeURIComponent(u.match(/symbol=([^&]+)/)[1])), ["NOU_USDT_PERP", "NOU_USDT"], "fără liste: perp, apoi spot");
  // ultimele 5 căutări reușite, cea mai nouă prima, fără dubluri; refuzul nu intră
  const st3 = stocare(), c3 = context(server(), { localStorage: st3 });
  await c3.rfSimboluriPionex();
  for (const s of ["btc", "pepe", "onlyspot", "btc", "pepe", "onlyspot", "xyzq"]) { c3.rfStare.cauta.text = s; await c3.rfCauta(false); }
  assert.deepEqual(JSON.parse(st3._m.rf_cautari), ["ONLYSPOT", "PEPE", "BTC"], "ultimele căutări, fără dubluri, fără refuz");
  const c4 = context(server(), { localStorage: Object.assign(stocare(), { getItem: (k) => (k === "rf_cautari" ? JSON.stringify(["A1", "B2", "C3", "D4", "E5", "F6", "<x>"]) : null) }) });
  // revizia Opus: butoanele în zona LOR (rfZonaUltime), nu în zona rescrisă la fiecare monedă citită (clicul s-ar pierde)
  const tot = c4.rfHtml(c4.rfStare), zona = (tot.split('id="rfZonaUltime">')[1] || "").split('<div class="rfCautaRez"')[0];
  assert.equal((zona.match(/data-action-click="rfCautaDin\('/g) || []).length, 5, "cel mult 5 butoane, în zona lor");
  assert.match(zona, /rfCautaDin\('A1'\)[^]*rfCautaDin\('E5'\)/, "în ordinea ținută");
  assert.doesNotMatch(zona, /<x>|F6/, "doar simboluri curate, cel mult 5");
  assert.doesNotMatch(c4.rfHtmlCautaRez(c4.rfStare) + c4.rfHtmlCorp(c4.rfStare), /rfCautaDin/, "zonele rescrise la fiecare monedă n-au butoanele");
  const c5 = context(server(), { localStorage: { getItem: () => { throw new Error("blocat"); }, setItem: () => { throw new Error("blocat"); } } });
  assert.doesNotThrow(() => c5.rfHtml(c5.rfStare), "stocarea blocată nu strică pagina");
  assert.match(citeste("public", "app.js"), /ACTIUNI_PERMISE=new Set\("[^"]*\brfCautaDin\b/, "rfCautaDin în lista albă");
  // revizia Opus: sugestiile ajung în pagină prin <datalist> (căsuța nu se redesenează)
  const dl = { innerHTML: "" }, c6 = context(server(), { localStorage: stocare(), document: { getElementById: (id) => (id === "rfMonede" ? dl : null) } });
  await c6.rfSimboluriPionex();
  assert.match(dl.innerHTML, /<option value="PEPE">/, "lista ajunsă în <datalist> din pagină");
  // perp scos de la tranzacționare + spot activ ⇒ direct spot; baza Pionex ≠ simbolul (PUMPFUN ⇒ PUMP_USDT_PERP)
  const g7 = server(), c7 = context(g7, { localStorage: stocare() });
  for (const [t, astept] of [["old", "OLD_USDT"], ["pumpfun", "PUMP_USDT_PERP"]]) {
    const k0 = g7.lumanari().length; c7.rfStare.cauta.text = t; await c7.rfCauta(false);
    assert.deepEqual(g7.lumanari().slice(k0).map((u) => decodeURIComponent(u.match(/symbol=([^&]+)/)[1])), [astept], t + " ⇒ " + astept);
  }
  // listele expiră: o monedă listată după ce s-au citit listele nu primește „n-are” (reîmprospătare înainte de „n-are”, o dată)
  const g8 = server(), c8 = context(g8, { localStorage: stocare() });
  await c8.rfSimboluriPionex();
  c8.rfStare.pionexSim.la = Date.now() - 6 * 60 * 1000;
  g8.lumanari().length; const s8 = g8.cereri.filter((u) => /pionex_symbols/.test(u)).length;
  const g8b = server({ perpExtra: [{ symbol: "NOU2_USDT_PERP", status: "TRADING" }] }); c8.getJSON = g8b;
  c8.rfStare.cauta.text = "nou2"; await c8.rfCauta(false);
  assert.ok(g8b.cereri.filter((u) => /pionex_symbols/.test(u)).length === 2 && s8 === 2, "listele vechi de 6 min se recitesc înainte de „n-are”");
  assert.deepEqual(g8b.lumanari().map((u) => decodeURIComponent(u.match(/symbol=([^&]+)/)[1])), ["NOU2_USDT_PERP"], "moneda nouă se citește");
  c8.rfStare.pionexSim.la = Date.now() - 2 * 3600 * 1000; const s8c = g8b.cereri.length;
  await c8.rfSimboluriPionex();
  assert.ok(g8b.cereri.length > s8c, "listele mai vechi de o oră se recitesc");
});

await test("5. I-810: linia de dimineață - boții cu RF 1h întors CONTRA în ultimele 24 de bare, cinstită, ≤ 160 de caractere; legată în colector", async () => {
  const M = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "rf-dimineata.mjs")).href);
  const l = M.liniaRfContra([
    { nume: "ETH", directie: "LONG", dir: -1, bareDir: 5 },
    { nume: "SOL", directie: "SHORT", dir: 1, bareDir: 0 },
    { nume: "BTC", directie: "LONG", dir: 1, bareDir: 3 },
    { nume: "XRP", directie: "LONG", dir: -1, bareDir: 30 },
    { nume: "ADA", directie: "SHORT", eroare: "fără lumânări" }
  ], 140);
  assert.ok(l && /ETH/.test(l) && /SOL/.test(l), "cei doi întorși contra apar");
  assert.doesNotMatch(l, /BTC|XRP|ADA/, "aliniatul, cel întors de mult și cel necitit nu apar");
  assert.match(l, /^nedovedit[^:]*nu de închis botul[^:]*:/, "avertismentul în CAPUL liniei (Discord taie coada - revizia Opus)");
  assert.match(l, /1 monedă necitită/, "necititele se spun");
  assert.ok(l.length <= 140, "cel mult cât i se dă");
  assert.equal(M.liniaRfContra([{ nume: "BTC", directie: "LONG", dir: 1, bareDir: 3 }], 140), null, "nimic contra ⇒ fără linie");
  const multe = Array.from({ length: 20 }, (_, i) => ({ nume: "MONEDA" + i, directie: "LONG", dir: -1, bareDir: 2 }));
  const lm = M.liniaRfContra(multe, 140); assert.ok(lm.length <= 140 && /\+\d+/.test(lm), "prea mulți ⇒ tăiat cu „+N”");
  // cu lumânări: o cerere 1h × 500 pe monedă, aceeași citire ca pagina
  const GridCalcul = new Function(citeste("public", "lib", "grid-calcul.js") + "; return GridCalcul;")();
  const RangeFilter = new Function(citeste("public", "lib", "range-filter.js") + "; return RangeFilter;")();
  const cereri = [], cere = async (u) => { cereri.push(u); return { data: { klines: randuri(D.bare, dtAcum) } }; };
  const cit = RangeFilter.citire(GridCalcul.bare(randuri(D.bare, dtAcum)));
  const contra = cit.dir === 1 ? "SHORT" : "LONG";
  const boti = [{ id: 1, activ: true, baza: "BTC", directie: contra, sp: "BTC_USDT_PERP" }, { id: 2, activ: true, baza: "BTC", directie: contra, sp: "BTC_USDT_PERP" }, { id: 3, activ: false, baza: "ETH", directie: "LONG", sp: "ETH_USDT_PERP" }];
  const lr = await M.liniaRangeFilterBoti({ boti, cere, simbol: (b) => b.sp, GridCalcul, RangeFilter, max: 140 });
  assert.equal(cereri.length, 1, "o singură cerere pe monedă, doar boții activi");
  assert.match(cereri[0], /interval=60M&limit=500/);
  assert.equal(lr, M.liniaRfContra([{ nume: "BTC", directie: contra, dir: cit.dir, bareDir: cit.bareDir }], 140), "aceeași regulă pe citirea paginii");
  // revizia Opus: LONG + SHORT pe aceeași MONEDĂ (spot BTC_USDT + perp BTC_USDT_PERP) nu e „contra” și nu se cere nimic
  const cer2 = [], cere2 = async (u) => { cer2.push(u); return { data: { klines: randuri(D.bare, dtAcum) } }; };
  const amb = await M.liniaRangeFilterBoti({ boti: [{ activ: true, baza: "BTC", directie: "LONG", sp: "BTC_USDT" }, { activ: true, baza: "BTC", directie: "SHORT", sp: "BTC_USDT_PERP" }], cere: cere2, simbol: (b) => b.sp, moneda: (b) => b.baza, GridCalcul, RangeFilter, max: 140 });
  assert.equal(amb, null); assert.equal(cer2.length, 0, "ambele direcții pe aceeași monedă ⇒ nicio cerere");
  // revizia Opus: refuzul Pionex oprește cererile și linia o spune (altfel dimineața fără linie = „niciun bot contra”)
  const cer3 = [], cere3 = async (u) => { cer3.push(u); return { result: false, retryAfter: 2 }; };
  const ref = await M.liniaRangeFilterBoti({ boti: ["BTC", "ETH", "SOL"].map((x) => ({ activ: true, baza: x, directie: "LONG", sp: x + "_USDT_PERP" })), cere: cere3, simbol: (b) => b.sp, GridCalcul, RangeFilter, max: 140 });
  assert.equal(cer3.length, 1, "după refuz nu se mai cere"); assert.match(ref || "", /n-am putut citi 3 monede din 3/);
  assert.match(M.liniaRfContra([{ nume: "A", directie: "LONG", dir: -1, bareDir: 1 }, { nume: "B", directie: "LONG", dir: -1, bareDir: 2 }, { nume: "C", directie: "LONG", dir: -1, bareDir: 3 }], 80), /3 boți cu RF întors contra|A \(long/, "fără „boți întorși” (RF s-a întors, nu botul)");
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /incarca\("range-filter\.js", "RangeFilter"\)/);
  assert.match(C, /from "\.\/lib\/rf-dimineata\.mjs"/);
  assert.match(C, /out\.liniiExtra\.push\("📏 Range Filter 1h, " \+/);
  assert.match(C, /moneda: \(y\) => TabloBot\.simboluri\(y\.baza, y\.quote, y\.simbolPionex\)\.moneda/, "colectorul grupează pe monedă");
  assert.match(C, /const VERSIUNE_COLECTOR = "v101\.(16[4-9]|1[7-9]\d)"/);
});

await test("6. versiunile v100.304, lumanari.js înaintea ecranelor și în shell-ul SW, proba în lanțul npm test", () => {
  const Hh = citeste("public", "index.html");
  assert.ok((Hh.match(/v100\.(30[4-9]|3[1-9]\d)/g) || []).length >= 3); assert.doesNotMatch(Hh, /v100\.303 · /);
  const iL = Hh.indexOf('<script src="/lib/lumanari.js"></script>');
  assert.ok(iL > Hh.indexOf('<script src="/lib/grid-calcul.js"></script>') && iL < Hh.indexOf('<script src="/lib/trade-zilei-ecran.js"></script>') && iL < Hh.indexOf('<script src="/lib/range-filter-ecran.js"></script>'), "lumanari.js după GridCalcul, înaintea ecranelor");
  const S = citeste("public", "sw.js");
  assert.match(S, /const CACHE="crypto-radar-v100-(30[4-9]|3[1-9]\d)"/); assert.match(S, /"\/lib\/lumanari\.js"/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(30[4-9]|3[1-9]\d)"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.match(B.version, /^v100\.(30[4-9]|3[1-9]\d)$/); assert.ok(B.features.rfIdei304);
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 304);
  assert.match(citeste("package.json"), /npm run test:v100303 && npm run test:v100304/);
  // revizia Opus: pagina nu trimite să lipească un script încă necompilat - „același motor ca v2.5 / v2.6” e adevărat
  assert.match(citeste("public", "lib", "range-filter-ecran.js"), /Range Filter B&S v2\.5 \/ v2\.6 din TradingView/);
  assert.doesNotMatch(citeste("public", "lib", "range-filter-ecran.js"), /de lipit acum/);
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
