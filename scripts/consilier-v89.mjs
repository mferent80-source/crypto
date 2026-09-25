// Probele v89: consilierul (sfaturi pe pozitiile deschise, din istoricul LUI + cifre + piata + stiri), situatiile
// asemanatoare pentru biletul la intrare, "Piata azi", rezumatul de dimineata si ruta /api/stiri (fetch fals).
import assert from "node:assert/strict";
import fs from "node:fs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const lib = (f) => { const u = new URL("../public/lib/" + f, import.meta.url); return fs.existsSync(u) ? fs.readFileSync(u, "utf8") : ""; };
const K = new Function(lib("grid-calcul.js") + lib("t212.js") + lib("actiuni-semnale.js") + lib("consilier.js") + "; return typeof Consilier !== 'undefined' ? Consilier : null;")();
const ZI = 86400000, ACUM = Date.UTC(2026, 8, 25, 12);
const zilnice = (n, f) => { const b = []; for (let i = 0; i < n; i++) { const c = f(i); b.push({ t: ACUM - (n - i) * ZI, o: c, h: c * 1.01, l: c * 0.99, c }); } return b; };
const urca = zilnice(300, (i) => 100 * Math.pow(1.002, i)), coboara = zilnice(300, (i) => 100 * Math.pow(0.998, i));
const tr = (o) => ({ id: "x", ticker: "APLD_US_EQ", simbol: "APLD", cost: 1000, rezultat: 10, pornit: ACUM - 30 * ZI, inchis: ACUM - 20 * ZI, durataOre: 240, pct: 0.01, ...o });

console.log("\nV89 · consilierul · proba\n");
await test("modulul exista", () => assert.ok(K, "public/lib/consilier.js lipseste"));

// ---------------- piata azi ----------------
await test("piata: Nasdaq pe trend sus + VIX mic -> bine; Nasdaq in jos sau VIX >= 25 -> rau; VIX 20-25 -> atentie; fara Nasdaq -> fara-date", () => {
  const vix = (v) => zilnice(30, () => v);
  assert.equal(K.piata({ qqq: urca, vix: vix(15), fg: { valoare: 71, clasa: "Greed" } }).ton, "bine");
  assert.equal(K.piata({ qqq: coboara, vix: vix(15) }).ton, "rau");
  assert.equal(K.piata({ qqq: urca, vix: vix(27) }).ton, "rau");
  assert.equal(K.piata({ qqq: urca, vix: vix(22) }).ton, "atentie");
  assert.equal(K.piata({}).ton, "fara-date");
  const p = K.piata({ qqq: urca, spy: urca, vix: vix(15), fg: { valoare: 71, clasa: "Greed" } });
  assert.ok(p.parti.some((x) => /Nasdaq/.test(x.et))); assert.ok(p.parti.some((x) => /VIX/.test(x.et))); assert.ok(p.parti.some((x) => /71/.test(x.val) && /lăcomie/.test(x.val)));
});

await test("piata: miscarile foarte mici au doua zecimale (nu '−0,0%')", () => {
  const q = urca.slice(); q[q.length - 1] = { ...q.at(-1), c: q.at(-2).c * 0.9997 };
  const p = K.piata({ qqq: q }); assert.doesNotMatch(p.text, /[+−]0,0%/); assert.match(p.text, /−0,03%/);
});

// ---------------- sfaturile pe o pozitie ----------------
const poz = (o) => ({ ticker: "APLD_US_EQ", simbol: "APLD", pret: 27, pretMediu: 29.5, pctLei: -0.06, ppl: -300, sem: { nivel: "atentie" }, niv: { tintaPozitie: 36, stopPozitie: 26 }, pond: 0.12, de: ACUM - 10 * ZI, ...o });
await test("sfaturi: istoricul LUI pe acelasi simbol (cu 'putine cazuri' sub 10) si, daca a pierdut de obicei pe el, 'n-as adauga'", () => {
  const inchise = [tr({ rezultat: -100 }), tr({ rezultat: -50 }), tr({ rezultat: 20 }), tr({ ticker: "X_US_EQ", rezultat: 999 })];
  const l = K.sfaturiPozitie(poz(), { inchise, acum: ACUM });
  const s = l.find((x) => x.sursa === "istoric" && /APLD/.test(x.titlu));
  assert.ok(s, JSON.stringify(l)); assert.match(s.titlu, /3 trade-uri/); assert.match(s.titlu, /1 pe plus/); assert.match(s.text, /puține cazuri/); assert.match(s.ceAsFace, /n-aș adăuga/i);
});
await test("sfaturi: pe minus si in a 7-28-a zi, cand trade-urile LUI tinute 1-4 saptamani pierd -> galben, cu cifrele lui", () => {
  const inchise = [...Array(12)].map((_, i) => tr({ id: "d" + i, durataOre: 300, rezultat: i < 4 ? 50 : -200 }));
  const s = K.sfaturiPozitie(poz(), { inchise, acum: ACUM }).find((x) => /zi/.test(x.titlu) && x.sursa === "istoric" && /1–4 săptămâni/.test(x.text));
  assert.ok(s); assert.equal(s.nivel, "g"); assert.match(s.text, /4 din 12/);
  assert.ok(!K.sfaturiPozitie(poz({ pctLei: 0.05, ppl: 50 }), { inchise, acum: ACUM }).some((x) => /1–4 săptămâni/.test(x.text)), "pe plus nu");
});
await test("sfaturi: aproape de tinta sau peste +15% -> ia jumatate si muta stopul la intrare (cu preturile)", () => {
  const s = K.sfaturiPozitie(poz({ pret: 35.5, pctLei: 0.2, ppl: 1000 }), { inchise: [], acum: ACUM }).find((x) => /jumătate/.test(x.ceAsFace || ""));
  assert.ok(s); assert.equal(s.nivel, "v"); assert.match(s.ceAsFace, /\$29[.,]50/); assert.match(s.ceAsFace, /\$36/);
});
await test("sfaturi: pe plus sub 0,30% -> 'inca nu acopera comisionul'; piata rea -> 'n-as adauga azi'; stirile din 48 h -> lista, fara interpretare", () => {
  const l = K.sfaturiPozitie(poz({ pret: 29.55, pretMediu: 29.5, pctLei: 0.001, ppl: 3 }), { inchise: [], acum: ACUM, piata: { ton: "rau", text: "Nasdaq în jos" },
    stiri: [{ titlu: "Applied Digital signs lease", link: "https://x/1", la: ACUM - 3600000 }, { titlu: "vechi", link: "https://x/2", la: ACUM - 5 * ZI }] });
  assert.ok(l.some((x) => /comision/.test(x.titlu)));
  assert.ok(l.some((x) => x.sursa === "piata" && /n-aș adăuga/i.test(x.ceAsFace)));
  const st = l.find((x) => x.sursa === "stiri"); assert.ok(st); assert.equal(st.stiri.length, 1); assert.ok(!st.ceAsFace, "stirile nu primesc 'ce as face eu'");
});
await test("sfaturi: ordonate rosu, galben, gri, verde; fara date nu cade", () => {
  const l = K.sfaturiPozitie(poz({ pret: 35.5, pctLei: 0.2, ppl: 1000 }), { inchise: [...Array(12)].map((_, i) => tr({ id: "d" + i, durataOre: 300, rezultat: -10 })), acum: ACUM, piata: { ton: "rau" } });
  const c = l.map((x) => x.nivel); assert.deepEqual(c, c.slice().sort((a, b) => "rgnv".indexOf(a) - "rgnv".indexOf(b)));
  assert.deepEqual(K.sfaturiPozitie(null, {}), []);
});

// ---------------- biletul: situatii asemanatoare ----------------
await test("bilet: situatiile care se potrivesc ACUM (dupa miscare, langa maxim, trend jos, suma mica, acelasi simbol), fiecare cu cifrele lui din istoric", () => {
  const inchise = [tr({ id: "a", rezultat: -300 }), tr({ id: "b", rezultat: 100 }), tr({ id: "c", rezultat: -50, cost: 500 }), tr({ id: "d", ticker: "ZZ_US_EQ", rezultat: 40, cost: 800 })];
  const cf = { a: { nivel: "nu", greseli: ["dupa-miscare"] }, b: { nivel: "cumpara", greseli: ["langa-max7z"] }, c: { nivel: "asteapta", greseli: ["dupa-miscare"] }, d: { nivel: "nu", greseli: [] } };
  const l = K.situatiiAsemanatoare(inchise, cf, { dupaMiscare: true, langaMax7z: false, trendJos: true, suma: 700, ticker: "APLD_US_EQ" });
  const g = (re) => l.find((x) => re.test(x.et));
  assert.equal(g(/după o mișcare mare/).n, 2); assert.equal(g(/după o mișcare mare/).total, -350);
  assert.equal(g(/trend în jos/).n, 2); assert.equal(g(/sub 1.000/).n, 2); assert.equal(g(/APLD/).n, 3);
  assert.ok(!g(/lângă maximul/), "situatia care nu e acum nu apare");
});

// ---------------- botii ----------------
await test("sfaturi bot: istoricul LUI pe aceeasi moneda; frica/lacomia extrema -> 'n-as pune bani in plus'; stirile despre moneda", () => {
  const trades = [{ moneda: "MET", rezultat: -5 }, { moneda: "MET", rezultat: -2 }, { moneda: "BTC", rezultat: 9 }];
  const l = K.sfaturiBot({ baza: "MET.PERP" }, { trades, fg: { valoare: 84, clasa: "Extreme Greed" }, stiri: [{ titlu: "Metis MET rallies", link: "https://x", la: ACUM - 3600000 }], acum: ACUM });
  const i = l.find((x) => x.sursa === "istoric"); assert.match(i.titlu, /MET: 2 boți/); assert.match(i.titlu, /0 pe plus/);
  assert.ok(l.some((x) => x.sursa === "piata" && /84/.test(x.titlu) && /n-aș pune bani în plus/i.test(x.ceAsFace)));
  assert.ok(l.some((x) => x.sursa === "stiri"));
});

// ---------------- rezumatul de dimineata ----------------
await test("rezumatul de dimineata: piata, de iesit, rezultate in 7 zile, peste plafon, boti aproape de lichidare, 3 titluri; zi linistita -> o linie care spune asta", () => {
  const r = K.rezumatDimineata({ acum: ACUM, piata: { text: "Nasdaq: trend sus · VIX 15" }, deIesit: [{ simbol: "AVGO", pctLei: -0.09 }], rezultate: [{ simbol: "APLD", data: "2026-10-01" }, { simbol: "MPC", data: "2026-11-03" }],
    plafon: [{ simbol: "APLD", pond: 0.23 }], boti: [{ nume: "MET", lich: 12 }], stiri: [{ simbol: "APLD", titlu: "a" }, { simbol: "AVGO", titlu: "b" }, { simbol: "MPC", titlu: "c" }, { simbol: "X", titlu: "d" }] });
  const t = r.linii.join("\n");
  assert.match(r.titlu, /dimineață/i); assert.match(t, /Nasdaq/); assert.match(t, /AVGO/); assert.match(t, /APLD.*01\.10/); assert.doesNotMatch(t, /MPC.*03\.11/, "rezultatele peste 7 zile nu");
  assert.match(t, /23%/); assert.match(t, /MET.*12/); assert.equal((t.match(/📰/g) || []).length, 3);
  assert.match(K.rezumatDimineata({ acum: ACUM, piata: { text: "Nasdaq: trend sus" } }).linii.join(" "), /nimic de făcut/i);
});

// ---------------- ruta /api/stiri ----------------
const TOKEN = "proba-token-1234567890", ENV = { APP_API_TOKEN: TOKEN };
let cereri = [], ip = 0;
function fetchStub(fn) { cereri = []; globalThis.fetch = async (url) => { const u = String(url); cereri.push(u); const r = fn(u); return new Response(r.corp, { status: r.status || 200, headers: { "content-type": r.tip || "application/json" } }); }; }
async function cheama(qs) {
  const m = await import(`../functions/api/stiri.js?t=${Date.now()}_${Math.random()}`);
  const res = await m.onRequestGet({ request: new Request(`https://exemplu.test/api/stiri?${qs}`, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.89.0." + (++ip % 250) } }), env: ENV });
  let c = null; try { c = JSON.parse(await res.text()); } catch {}
  return { status: res.status, corp: c };
}
const RSS = (items) => `<?xml version="1.0"?><rss><channel>${items.map((x) => `<item><title><![CDATA[${x[0]}]]></title><link>${x[1]}</link><pubDate>${x[2]}</pubDate></item>`).join("")}</channel></rss>`;
await test("ruta stiri actiune: Yahoo RSS pe simbolul de bursa (NPA -> ASTS); titlu curatat (&amp;), link doar http(s), data; cel mult 6", async () => {
  fetchStub((u) => /headline\?s=ASTS/.test(u) ? { tip: "application/rss+xml", corp: RSS([["AST SpaceMobile &amp; partners", "https://finance.yahoo.com/a", "Thu, 25 Sep 2026 10:00:00 +0000"], ["rau", "javascript:alert(1)", "Thu, 25 Sep 2026 09:00:00 +0000"]]) } : { status: 404, corp: "" });
  const r = await cheama("action=actiune&ticker=NPA_US_EQ");
  assert.equal(r.status, 200); assert.equal(r.corp.simbol, "ASTS"); assert.equal(r.corp.stiri.length, 1);
  assert.equal(r.corp.stiri[0].titlu, "AST SpaceMobile & partners"); assert.equal(r.corp.stiri[0].la, Date.parse("Thu, 25 Sep 2026 10:00:00 +0000"));
  assert.equal((await cheama("action=actiune&ticker=")).status, 400);
});
await test("ruta stiri crypto: doar titlurile care pomenesc moneda (cuvant intreg), din ambele surse; general = primele din Cointelegraph", async () => {
  fetchStub((u) => /cointelegraph/.test(u) ? { tip: "application/rss+xml", corp: RSS([["MET token jumps 20%", "https://ct/1", "Thu, 25 Sep 2026 10:00:00 +0000"], ["METAVERSE is back", "https://ct/2", "Thu, 25 Sep 2026 09:00:00 +0000"], ["Bitcoin holds 100k", "https://ct/3", "Thu, 25 Sep 2026 08:00:00 +0000"]]) }
    : /coindesk/.test(u) ? { tip: "application/rss+xml", corp: RSS([["Why MET matters", "https://cd/1", "Thu, 25 Sep 2026 07:00:00 +0000"]]) } : { status: 404, corp: "" });
  const r = await cheama("action=crypto&moneda=MET");
  assert.equal(r.status, 200); assert.deepEqual(r.corp.moneda.map((x) => x.link), ["https://ct/1", "https://cd/1"]); assert.ok(r.corp.general.length >= 1);
});
await test("ruta stiri piata: QQQ, SPY, ^VIX (Yahoo) + frica/lacomia (alternative.me); o sursa picata -> null, nu 0", async () => {
  const chart = (c) => JSON.stringify({ chart: { result: [{ timestamp: [1790000000, 1790086400], indicators: { quote: [{ open: [c, c], high: [c, c], low: [c, c], close: [c, c], volume: [1, 1] }] } }] } });
  fetchStub((u) => /chart\/QQQ/.test(u) ? { corp: chart(500) } : /chart\/SPY/.test(u) ? { corp: chart(600) } : /chart\/%5EVIX/.test(u) ? { status: 500, corp: "" } : /alternative\.me/.test(u) ? { corp: JSON.stringify({ data: [{ value: "71", value_classification: "Greed" }] }) } : { status: 404, corp: "" });
  const r = await cheama("action=piata");
  assert.equal(r.status, 200); assert.equal(r.corp.qqq.length, 2); assert.equal(r.corp.spy[0].close, 600); assert.strictEqual(r.corp.vix, null);
  assert.deepEqual(r.corp.fg, { valoare: 71, clasa: "Greed" });
});

// ---------------- tura de dimineata (colector) ----------------
await test("tura de dimineata: o data pe zi, dupa 9:00 ora Romaniei, cu mesajul construit din date; inainte de 9 -> nimic", async () => {
  const { turaDimineata } = await import("./lib/tura-dimineata.mjs");
  const trimise = [], stare = {};
  const d = { Consilier: K, trimite: async (m) => { trimise.push(m); return true; }, stare, jurnal: () => {},
    date: async () => ({ piata: { text: "Nasdaq: trend sus" }, deIesit: [{ simbol: "AVGO", pctLei: -0.09 }] }) };
  await turaDimineata({ ...d, acum: Date.UTC(2026, 8, 25, 5, 30) }); assert.equal(trimise.length, 0, "8:30 ora Romaniei");
  await turaDimineata({ ...d, acum: Date.UTC(2026, 8, 25, 6, 5) }); assert.equal(trimise.length, 1); assert.match(trimise[0].mesaj, /AVGO/);
  await turaDimineata({ ...d, acum: Date.UTC(2026, 8, 25, 9, 0) }); assert.equal(trimise.length, 1, "o singura data pe zi");
  await turaDimineata({ ...d, acum: Date.UTC(2026, 8, 26, 6, 5) }); assert.equal(trimise.length, 2, "a doua zi iar");
});
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
