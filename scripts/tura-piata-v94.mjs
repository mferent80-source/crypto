// Proba turei de piata din colector (v94): vremea pietei (alerta la schimbare), funding-ul pe piata, miscarea
// neobisnuita pe botii lui si pe actiunile lui, Nasdaq la zi cat e bursa deschisa, poza zilnica. Fara retea.
// Rulare: node scripts/tura-piata-v94.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { turaPiata } from "./lib/tura-piata.mjs";

for (const f of ["grid-calcul.js", "grid-clasament.js", "directie.js", "alerte.js", "acasa.js", "latime.js", "latime-us.js", "sectoare.js", "macro.js"]) vm.runInThisContext(fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8"));
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
const ORA = 3600000, MIN = 60000;
// sambata 26.09 21:00 Bucuresti (bursa inchisa) si luni 28.09 17:30 Bucuresti = 10:30 New York (deschisa)
const SAMBATA = Date.UTC(2026, 8, 26, 18, 0), LUNI = Date.UTC(2026, 8, 28, 14, 30);
const kl = (n, f, pas) => Array.from({ length: n }, (_, i) => ({ time: SAMBATA - (n - i) * pas, open: f(i), high: f(i) * 1.001, low: f(i) * 0.999, close: f(i), volume: 1 }));
const zil = (n, f) => Array.from({ length: n }, (_, i) => ({ time: LUNI - (n - i - 1) * 86400000, open: f(i), high: f(i), low: f(i), close: f(i) }));

function lume(o = {}) {
  const cereri = [], trimise = [], alerte = [];
  const clasament = { la: SAMBATA, monede: Array.from({ length: 100 }, (_, i) => ({ simbol: "C" + i + "_USDT_PERP", stare: i < (o.evita ?? 30) ? "evita" : "candidat", dir: "long" })) };
  const date = {
    "/api/istoric-bot?action=clasament": { clasament },
    "/api/stiri?action=piata": { qqq: zil(260, (i) => 100 * Math.pow(1.002, i)), spy: zil(260, (i) => 100), vix: zil(40, () => o.vix ?? 15), fg: { valoare: 74, clasa: "Greed", istoric: [70, 74] } },
    "/api/t212?action=ndx": { la: SAMBATA, zi: "2026-09-26", actiuni: [{ s: "AAPL", ch: 1, e50: true, e200: true, rsi: 60 }, { s: "MSFT", ch: -1, e50: false, e200: true, rsi: 40 }] },
    "/api/bot-orders": { bots: [{ id: "2383", baza: "VVV.PERP", activ: true, pretCurent: 29.7, profitTotal: -7.75 }] },
    "/api/t212?action=pozitii": [{ ticker: "APLD_US_EQ" }, { ticker: "VOW3d_EQ" }],
    "/api/t212?action=cont": { cash: { total: 29251, ppl: -1447 } },
    "/api/stiri?action=calendar": { evenimente: [{ date: "2026-09-30T14:00:00-04:00", title: "FOMC Statement", impact: "High", country: "USD" }] },
    "/api/market?type=pionex_tickers&market=PERP": { data: { tickers: Array.from({ length: 40 }, (_, i) => ({ symbol: "C" + i + "_USDT_PERP", amount: String(1e9 - i), open: "1", close: "1" })) } },
  };
  const cere = async (u) => {
    cereri.push(u);
    if (date[u] !== undefined) return date[u];
    if (/pionex_klines&symbol=BTC_USDT_PERP&interval=60M/.test(u)) return { data: { klines: kl(500, (i) => 84000 + (i % 2), ORA) } };
    if (/pionex_klines&symbol=BTC_USDT_PERP&interval=1D/.test(u)) return { data: { klines: kl(200, (i) => 80000 + i * 10, 86400000) } };
    if (/pionex_klines&symbol=VVV_USDT_PERP&interval=60M/.test(u)) return { data: { klines: kl(500, (i) => (i >= 476 ? (o.vvvScade ? 26 : 30) : 30 * (1 + (i % 2 ? 0.003 : -0.003))), ORA) } };
    if (/pionex_funding/.test(u)) return { data: { rates: [{ fundingRate: String(o.funding ?? 0.00005), fundingTime: SAMBATA }, ...Array.from({ length: 30 }, (_, k) => ({ fundingRate: "0.00005", fundingTime: SAMBATA - (k + 1) * 4 * ORA }))] } };
    if (/action=preturi.*APLD_US_EQ/.test(u)) return { randuri: zil(260, (i) => (i === 259 && o.apldSare ? 40 * 1.2 : 40 * (1 + (i % 2 ? 0.01 : -0.01)))) };
    if (/action=preturi/.test(u)) return { randuri: zil(260, (i) => 100 * Math.pow(1.002, i)) };
    throw Object.assign(new Error("ruta necunoscuta in proba: " + u), { status: 404 });
  };
  const d = { cere, trimite: async (u, c) => { trimise.push([u, c]); return { ok: true } }, trimiteAlerta: async (m) => { alerte.push(m); return true; }, jurnal: () => {}, pauza: async () => {},
    Acasa: globalThis.Acasa, Alerte: globalThis.Alerte, GridCalcul: globalThis.GridCalcul, GridClasament: globalThis.GridClasament, Directie: globalThis.Directie, NDX: ["AAPL", "MSFT"] };
  return { d, cereri, trimise, alerte };
}

await test("sambata: vremea (prima citire tine minte), funding-ul pe piata trimis, botul verificat; bursa inchisa -> nicio cerere de actiuni", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA);
  assert.ok(st.vreme && st.vreme.crypto, "nu tine minte vremea"); assert.deepEqual(w.alerte, []);
  const f = w.trimise.find((x) => /action=piata/.test(x[0]) && x[1].funding); assert.ok(f, "funding-ul nu s-a trimis"); assert.equal(f[1].funding.n, 30);
  assert.ok(!w.cereri.some((u) => /action=preturi/.test(u)), "a cerut actiuni cu bursa inchisa");
  assert.ok(w.cereri.some((u) => /VVV_USDT_PERP&interval=60M/.test(u)), "n-a verificat miscarea botului");
});
await test("ritmul: la 5 minute nu se repeta nimic; vremea la 10 min, funding-ul la o ora", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA); const n0 = w.cereri.length;
  await turaPiata(w.d, st, SAMBATA + 5 * MIN); assert.equal(w.cereri.length, n0, "a cerut din nou dupa 5 min");
  await turaPiata(w.d, st, SAMBATA + 11 * MIN); assert.ok(w.cereri.length > n0, "vremea nu s-a reverificat dupa 10 min");
  assert.equal(w.cereri.filter((u) => /pionex_funding/.test(u)).length, 30, "funding-ul s-a cerut din nou inainte de o ora");
});
await test("vremea se schimba (70 din 100 in miscare) -> alerta CRITIC dupa confirmare, o singura data", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA);
  const w2 = lume({ evita: 70 }); w2.d.trimiteAlerta = w.d.trimiteAlerta;
  await turaPiata(w2.d, st, SAMBATA + 11 * MIN); await turaPiata(w2.d, st, SAMBATA + 22 * MIN); await turaPiata(w2.d, st, SAMBATA + 33 * MIN);
  const m = w.alerte.filter((x) => /Crypto/.test(x.titlu)); assert.equal(m.length, 1); assert.equal(m[0].nivel, "critic"); assert.match(m[0].titlu, /Crypto: mișcare/);   /* v100.70 (revizia pachetului 3): eticheta fără emoji și majuscule de strigat - nivelul îl dă culoarea */
});
await test("botul VVV scade neobisnuit in 24 h (-13%) -> alerta pe moneda lui, o data", async () => {
  const w = lume({ vvvScade: true }), st = {};
  await turaPiata(w.d, st, SAMBATA); await turaPiata(w.d, st, SAMBATA + 31 * MIN);
  const m = w.alerte.filter((x) => /VVV/.test(x.titlu)); assert.equal(m.length, 1); assert.match(m[0].titlu, /scade/);
});
await test("luni, bursa deschisa: Nasdaq 100 la zi trimis (action=ndx), actiunile americane din portofoliu verificate; APLD +20% -> alerta", async () => {
  const w = lume({ apldSare: true }), st = {};
  await turaPiata(w.d, st, LUNI);
  const n = w.trimise.find((x) => /action=ndx/.test(x[0])); assert.ok(n, "Nasdaq nu s-a trimis"); assert.deepEqual(n[1].ndx.map((x) => x.s), ["AAPL", "MSFT"]);
  assert.ok(!w.cereri.some((u) => /VOW3d_EQ/.test(u)), "a cerut o actiune ne-americana");
  const m = w.alerte.filter((x) => /APLD/.test(x.titlu)); assert.equal(m.length, 1); assert.match(m[0].titlu, /urcă/);
  await turaPiata(w.d, st, LUNI + 30 * MIN); assert.equal(w.trimise.filter((x) => /action=ndx/.test(x[0])).length, 1, "Nasdaq s-a refacut inainte de o ora");
});
await test("poza zilnica: dupa ora 9 (Bucuresti), o data pe zi, cu cifrele citite (FG, in miscare, VIX, Nasdaq peste media de 50, BTC, funding)", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA);
  const p = w.trimise.filter((x) => /action=piata/.test(x[0]) && x[1].instantaneu); assert.equal(p.length, 1);
  const z = p[0][1].instantaneu; assert.equal(z.zi, "2026-09-26"); assert.equal(z.fg, 74); assert.equal(z.inMiscare, 30); assert.equal(z.vix, 15); assert.equal(z.ndxE50, 1); assert.ok(z.btc > 0);
  await turaPiata(w.d, st, SAMBATA + 2 * ORA); assert.equal(w.trimise.filter((x) => /action=piata/.test(x[0]) && x[1].instantaneu).length, 1, "a doua poza in aceeasi zi");
});
await test("o sursa picata nu opreste restul turei (pozitii T212 cu eroare -> Nasdaq si vremea merg)", async () => {
  const w = lume(), st = {}, c0 = w.d.cere;
  w.d.cere = async (u) => { if (/pozitii/.test(u)) throw Object.assign(new Error("T212 picat"), { status: 502 }); return c0(u); };
  await turaPiata(w.d, st, LUNI);
  assert.ok(w.trimise.some((x) => /action=ndx/.test(x[0]))); assert.ok(st.vreme && st.vreme.bursa);
});

// ---------------- v95 ----------------
const DUMINICA = Date.UTC(2026, 8, 27, 17, 30);   // 20:30 Bucuresti
await test("v95 poza zilnica: pune si totalul botilor si contul T212 (pentru 'ziua ta')", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA);
  const z = w.trimise.find((x) => /action=piata/.test(x[0]) && x[1].instantaneu)[1].instantaneu;
  assert.equal(z.botiTotal, -7.75); assert.equal(z.t212Total, 29251);
});
await test("v95 raportul de duminica: dupa ora 20 (Bucuresti), o singura data, cu saptamana pietei si calendarul", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA); assert.ok(!w.alerte.some((x) => /Săptămâna/.test(x.titlu)), "a trimis sambata");
  await turaPiata(w.d, st, DUMINICA); await turaPiata(w.d, st, DUMINICA + 2 * ORA);
  const r = w.alerte.filter((x) => /Săptămâna pieței/.test(x.titlu)); assert.equal(r.length, 1);
  assert.match(r[0].mesaj, /FOMC Statement/); assert.match(r[0].mesaj, /\n👉 (Crypto|Bursă|N-aș|Aș) /);   /* v100.72: acțiunile pe rânduri „👉 ” (era „Ce aș face eu:” cu trei lipite) */ assert.match(r[0].mesaj, /−7,75 USDT/);
});
// v100.166 (12.10, Weekly Review din premarket_scanner mutat aici - el: „completez raportul de duminică”): „Săptămâna pieței” spune și
// lățimea pieței crypto (150 perp-uri) și a acțiunilor US, cu ACELEAȘI texte ca rândurile din „Ce spune piața acum”, și se salvează
// pe serverul de acasă, ca Jurnalul de trade să-l arate sub raportul de duminică (până acum era doar pe Discord).
const LAT = { latime: { acum: { la: Date.UTC(2026, 8, 27, 17, 25), n: 150, lipsa: 0, lat: { sus: 40, jos: 90, mariLong: 70, fundExtrem: 3, oiExtrem: 5, bugetEpuizat: 0, volExtrem: 0 }, regim: { cod: "LARG-JOS" } }, istoric: [] } };
const US = { full: { status: "COMPLETE", engine: { data: { sp: { score: 27.6, zone: "Weakening", exposure: "40-60%", data_date: "2026-09-25" }, uptrend: { score: 49, zone: "Neutral", exposure: "60-80%", data_date: "2026-09-25" }, ndx: { score: 54, zone: "Healthy", exposure: "75-90%", data_date: "2026-09-25" }, r2k: { score: 34, zone: "Weakening", exposure: "40-60%", data_date: "2026-09-25" } }, master: { score: -2, stance: "PRUDENTA / DEFENSIV" } }, ideas: { rising_sectors: ["XLE"] } }, sources: {} };
function lumeLat(o = {}) {
  const w = lume(), cere0 = w.d.cere, cereriExt = [];
  w.d.cere = async (u) => (u === "/api/istoric-bot?action=latime" ? (o.faraLat ? { latime: null } : LAT) : cere0(u));
  w.d.Latime = globalThis.Latime; w.d.LatimeUS = globalThis.LatimeUS;
  w.d.fetch = async (u) => { cereriExt.push(u); if (o.usCade) throw new Error("rețea"); return { ok: true, json: async () => US }; };
  return Object.assign(w, { cereriExt });
}
await test("v100.166 Săptămâna pieței: + lățimea crypto și acțiunile US (textele din „Ce spune piața acum”) și se SALVEAZĂ pentru Jurnal", async () => {
  const w = lumeLat(), st = {};
  await turaPiata(w.d, st, DUMINICA);
  const r = w.alerte.find((x) => /Săptămâna pieței/.test(x.titlu)); assert.ok(r, "raportul n-a plecat");
  assert.match(r.mesaj, /\n🌐 Lățimea crypto \(150 perp-uri\): larg JOS · 40 sus · 90 jos/);
  assert.match(r.mesaj, /\n🗽 Acțiuni US: .*S&P slăbire, Nasdaq sănătos, Russell slăbire/);
  assert.doesNotMatch(r.mesaj, /acum [0-9]+ min/, "„acum N min” are sens în pagină, nu în raportul de duminică");
  assert.ok(w.cereriExt[0] === globalThis.LatimeUS.SURSA, "lățimea US se citește de la robotul GitHub");
  const s = w.trimise.find((x) => x[0] === "/api/istoric-bot?action=raportPiata"); assert.ok(s, "nu s-a salvat pentru Jurnal");
  assert.equal(s[1].la, DUMINICA); assert.equal(s[1].titlu, r.titlu); assert.deepEqual(s[1].linii, r.mesaj.split("\n"));
});
await test("v100.166 fără lățime (colectorul n-a măsurat / GitHub tace): rândurile lipsesc, raportul pleacă oricum, fără „aștept…”", async () => {
  const w = lumeLat({ faraLat: true, usCade: true }), st = {};
  await turaPiata(w.d, st, DUMINICA);
  const r = w.alerte.find((x) => /Săptămâna pieței/.test(x.titlu)); assert.ok(r);
  assert.doesNotMatch(r.mesaj, /Lățimea crypto|Acțiuni US|aștept/);
});
// v100.167 (12.10, pagina sector-rotation mutată în Radar — el: „Doar când se schimbă regimul”): după închiderea bursei, o dată pe zi,
// colectorul citește rotația sectoarelor și trimite pe Discord DOAR când regimul se schimbă (ciclice / defensive / neutră); prima citire
// doar se ține minte, regimul „parțial” (un sector lipsă) nu schimbă nimic.
const sectSerii = (zi, pCyc, pDef, fara) => {
  const sf = Date.UTC(2026, 8, zi, 13, 30), N = 130, L = N - 1, ser = (p) => Array.from({ length: N }, (_, i) => ({ t: sf - (L - i) * 86400000, c: i <= L - 5 ? 100 : 100 * (1 + (p / 100) * (i - (L - 5)) / 5) }));
  const o = { SPY: ser(0) };
  for (const x of globalThis.Sectoare.LISTA) if (!(fara || []).includes(x.s)) o[x.s] = ser(x.g === "defensiv" ? pDef : pCyc);
  return { la: sf, serii: o };
};
function lumeSect() {
  const w = lume(), cere0 = w.d.cere; let sect = null;
  w.d.cere = async (u) => (u === "/api/sectoare" ? sect : cere0(u));
  w.d.Sectoare = globalThis.Sectoare;
  return Object.assign(w, { pune: (x) => { sect = x; } });
}
const DUPA = (zi) => Date.UTC(2026, 8, zi, 20, 30);   // 16:30 New York, după închidere (marți 29, miercuri 30)
await test("v100.167 rotația sectoarelor: prima citire doar se ține minte; schimbarea regimului ⇒ O alertă; aceeași zi ⇒ nimic; parțial ⇒ nimic", async () => {
  const w = lumeSect(), st = {}, rot = () => w.alerte.filter((x) => /Rotația sectoarelor/.test(x.titlu || ""));
  w.pune(sectSerii(28, 1, 3)); await turaPiata(w.d, st, DUPA(28));
  assert.equal(st.sectRegim, "off"); assert.equal(rot().length, 0, "prima citire nu trimite");
  w.pune(sectSerii(29, 3, 1)); await turaPiata(w.d, st, LUNI + 25 * ORA);   // marți 10:30 New York: bursa deschisă ⇒ nu se judecă
  assert.equal(rot().length, 0, "în ședință nu se judecă");
  await turaPiata(w.d, st, DUPA(29));
  assert.equal(rot().length, 1); assert.match(rot()[0].mesaj, /^Din „spre defensive \(risk-off\)” în „spre ciclice \(risk-on\)”/); assert.equal(st.sectRegim, "on");
  await turaPiata(w.d, st, DUPA(29) + 30 * MIN); assert.equal(rot().length, 1, "o singură dată pe zi");
  w.pune(sectSerii(30, 1, 3, ["XLE"])); await turaPiata(w.d, st, DUPA(30));
  assert.equal(rot().length, 1, "parțial nu trimite"); assert.equal(st.sectRegim, "on", "parțial nu schimbă regimul ținut minte");
});
await test("v100.167 fără Sectoare în colector sau ruta tace ⇒ tura merge mai departe, fără alertă", async () => {
  const w = lumeSect(), st = {};
  w.pune(null); await turaPiata(w.d, st, DUPA(28));
  assert.equal(w.alerte.filter((x) => /Rotația/.test(x.titlu || "")).length, 0); assert.equal(st.sectRegim, undefined);
  delete w.d.Sectoare; w.pune(sectSerii(29, 3, 1)); await turaPiata(w.d, st, DUPA(29)); assert.equal(st.sectRegim, undefined);
});
// v100.168 (12.10, macro-dashboard mutat în Radar — el: „Alerta + scorul de regim macro”, „e ok”): (1) cu ~30 de minute înainte de un
// eveniment mare din SUA, o singură alertă pe eveniment; (2) la 30 de minute, regimul macro cu histerezis: prima citire se ține minte,
// alertă doar la schimbarea REALĂ, „parțial” nu schimbă nimic.
function lumeMacro() {
  const w = lume(), cere0 = w.d.cere; let ev = [], piata = null;
  w.d.cere = async (u) => (u === "/api/stiri?action=calendar" ? { evenimente: ev } : u === "/api/stiri?action=piata" && piata ? piata : /interval=1D&limit=60/.test(u) ? { data: { klines: [] } } : cere0(u));
  w.d.Macro = globalThis.Macro;
  return Object.assign(w, { ev: (l) => { ev = l; }, piata: (x) => { piata = x; } });
}
const evMare = (t, titlu) => ({ title: titlu || "CPI m/m", country: "USD", impact: "High", date: new Date(t).toISOString(), forecast: "0.3%", previous: "0.4%" });
await test("v100.168 evenimentele mari: ~30 min înainte ⇒ O alertă pe eveniment (nu la fiecare tură); departe / trecut ⇒ nimic", async () => {
  const w = lumeMacro(), st = {}, ale = () => w.alerte.filter((x) => /Eveniment mare/.test(x.titlu || ""));
  w.ev([evMare(SAMBATA + 30 * MIN), evMare(SAMBATA + 3 * ORA, "FOMC Statement"), evMare(SAMBATA - 10 * MIN, "NFP")]);
  await turaPiata(w.d, st, SAMBATA);
  assert.equal(ale().length, 1); assert.match(ale()[0].mesaj, /^În 30 de minute: CPI m\/m/);
  await turaPiata(w.d, st, SAMBATA + 6 * MIN); assert.equal(ale().length, 1, "o singură dată pe eveniment");
  await turaPiata(w.d, st, SAMBATA + 3 * ORA - 30 * MIN); assert.equal(ale().length, 2); assert.match(ale()[1].titlu, /FOMC Statement/);
});
const piataMacro = (vix) => {
  const N = 60, T0 = SAMBATA - N * 86400000, zl = (f) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * 86400000 + 48600000, close: f(i) }));
  return { vix: zl(() => vix), tnx: zl(() => 4.5), dxy: zl(() => 100), spy: zl((i) => 100 + i), qqq: zl((i) => 100 + i), fg: { valoare: 50 } };
};
await test("v100.168 regimul macro: prima citire doar se ține minte; mișcare mică la graniță ⇒ ținut; schimbare reală ⇒ O alertă", async () => {
  const w = lumeMacro(), st = {}, reg = () => w.alerte.filter((x) => /Regimul macro/.test(x.titlu || ""));
  w.piata(piataMacro(20)); await turaPiata(w.d, st, SAMBATA);   // VIX 20 (−1) + dobânda stabilă (+1) + dolar plat (0) + frica 50 (0) = 0 ⇒ neutru
  assert.deepEqual(st.macroRegim, { cod: "neutru", scor: 0 }); assert.equal(st.macroLa, SAMBATA); assert.equal(st.macroRegim.la, undefined); assert.equal(reg().length, 0);
  w.piata(piataMacro(17)); await turaPiata(w.d, st, SAMBATA + 31 * MIN);   // VIX 17 (+2) ⇒ 3, înclinat: salt de 3 ⇒ schimbare reală
  // revizia v100.171: regimul nou trebuie să se confirme la citirea următoare (30 min) ⇒ abia a doua oară pleacă alerta
  assert.equal(reg().length, 0, "prima citire a regimului nou doar se notează"); assert.equal(st.macroRegim.cod, "neutru");
  await turaPiata(w.d, st, SAMBATA + 40 * MIN); assert.equal(reg().length, 0, "la 30 de minute, nu la fiecare tură");
  await turaPiata(w.d, st, SAMBATA + 62 * MIN);
  assert.equal(reg().length, 1); assert.match(reg()[0].mesaj, /^Din „neutru” în „înclinat spre risc” \(scor \+3\)/); assert.equal(st.macroRegim.cod, "inclinat");
});
// v100.172: colectorul publică regimul ținut (cel de pe Discord) ca Dashboard-ul să nu-l contrazică — la prima citire și la fiecare schimbare confirmată
// v100.174 (revizia reparațiilor): regimul ținut se trimite la FIECARE citire completă, cu ora și scorul proaspete (scorul vechi făcea pagina
// să contrazică Discordul; fără oră, pagina nu știa că e vechi când colectorul stă)
await test("v100.174 regimul ținut se trimite acasă la fiecare citire completă (cu `la` proaspăt); cel neconfirmat rămâne cel vechi", async () => {
  const w = lumeMacro(), st = {}, mac = () => w.trimise.filter(([u, c]) => u === "/api/istoric-bot?action=piata" && c && c.macro).map(([, c]) => [c.macro.cod, c.la]);
  w.piata(piataMacro(20)); await turaPiata(w.d, st, SAMBATA);
  assert.deepEqual(mac().map((x) => x[0]), ["neutru"]);
  await turaPiata(w.d, st, SAMBATA + 31 * MIN); assert.deepEqual(mac().map((x) => x[0]), ["neutru", "neutru"]); assert.equal(mac()[1][1], SAMBATA + 31 * MIN);
  w.piata(piataMacro(17)); await turaPiata(w.d, st, SAMBATA + 62 * MIN); assert.equal(mac()[2][0], "neutru", "neconfirmat: tot cel ținut"); assert.equal(st.macroLa, SAMBATA + 62 * MIN, "regimul ținut republicat își împrospătează macroLa");
  await turaPiata(w.d, st, SAMBATA + 93 * MIN); assert.equal(mac()[3][0], "inclinat"); assert.equal(st.macroLa, SAMBATA + 93 * MIN); assert.equal(st.macroRegim.la, undefined);
});
// revizia Opus v100.171 (Important): la pragul VIX 18 scorul sare cu 3 (histerezisul de 2 nu-l ține) ⇒ VIX 17,9 ⇄ 18,1 dădea 5 alerte în 6 citiri
await test("v100.171 VIX care se zbate la 18 (17,9 ⇄ 18,1 la fiecare citire) ⇒ NICIO alertă de regim; o schimbare care ține ⇒ una", async () => {
  const w = lumeMacro(), st = {}, reg = () => w.alerte.filter((x) => /Regimul macro/.test(x.titlu || ""));
  w.piata(piataMacro(17.9)); await turaPiata(w.d, st, SAMBATA);
  for (let k = 1; k <= 6; k++) { w.piata(piataMacro(k % 2 ? 18.1 : 17.9)); await turaPiata(w.d, st, SAMBATA + k * 31 * MIN); }
  assert.equal(reg().length, 0, "zbaterea nu se confirmă niciodată");
  for (let k = 7; k <= 8; k++) { w.piata(piataMacro(18.1)); await turaPiata(w.d, st, SAMBATA + k * 31 * MIN); }
  assert.equal(reg().length, 1, "VIX rămas peste 18 ⇒ o alertă după confirmare");
});
await test("v100.171 după o alertă de regim, următoarea vine abia după 3 ore (regimul nou se ține minte, alerta așteaptă)", async () => {
  const w = lumeMacro(), st = {}, reg = () => w.alerte.filter((x) => /Regimul macro/.test(x.titlu || ""));
  w.piata(piataMacro(20)); await turaPiata(w.d, st, SAMBATA);
  w.piata(piataMacro(17)); await turaPiata(w.d, st, SAMBATA + 31 * MIN); await turaPiata(w.d, st, SAMBATA + 62 * MIN);
  assert.equal(reg().length, 1);
  w.piata(piataMacro(20)); await turaPiata(w.d, st, SAMBATA + 93 * MIN); await turaPiata(w.d, st, SAMBATA + 124 * MIN);
  assert.equal(reg().length, 1, "sub 3 ore de la ultima alertă: nimic");
  await turaPiata(w.d, st, SAMBATA + 62 * MIN + 3 * ORA + MIN);
  assert.equal(reg().length, 2, "după 3 ore, schimbarea care a ținut pleacă");
});
await test("v95 socoteala: alerta de miscare se tine minte cu pretul; dupa 24 h i se pune pretul de atunci si se trimite socoteala", async () => {
  const w = lume({ vvvScade: true }), st = {};
  await turaPiata(w.d, st, SAMBATA);
  assert.equal(st.soc.length, 1); assert.equal(st.soc[0].sim, "VVV"); assert.equal(st.soc[0].dir, "jos"); assert.ok(st.soc[0].pret > 0);
  await turaPiata(w.d, st, SAMBATA + 25 * ORA);
  assert.ok(st.soc[0].p1 > 0, "nu s-a pus pretul dupa 24 h");
  const t = w.trimise.filter((x) => /action=piata/.test(x[0]) && x[1].socoteala); assert.ok(t.length, "socoteala nu s-a trimis"); assert.equal(t[t.length - 1][1].socoteala.n1, 1);
});

console.log(`\nTURA_PIATA_V94 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
