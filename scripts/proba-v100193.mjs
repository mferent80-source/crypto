// Probele v100.193 / colector v101.114 (14.10.2026, demo „Piața azi · golul umplut” aprobat de el: „e ok”):
// Market Breadth SUA cu nume, Sugestii din Market Breadth (lideri / early buy / contrarian), Scorul zilei (suma faptelor, neprobată,
// în jurnalul verdictelor), Trend 12 luni (primele 5), Cele mai tari pe sector — în rândul Dobânzi / Regim / Sectoare.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { scorZiDinDate } from "./lib/tura-verdicte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.193 · Piața azi: Market Breadth, Scorul zilei, sugestii · proba\n");

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "latime-us.js"), ctx);
vm.runInContext(citeste("public", "lib", "scor-zi.js"), ctx);
const LU = ctx.LatimeUS, SZ = ctx.ScorZi;
const ACUM = Date.parse("2026-10-14T12:00:00Z");

// fixtura: forma reală a latest.json din 14.10 (scurtată)
const MB = {
  schemaVersion: 1,
  sources: {
    sp500: { history: [{ date: "2026-10-13", above200: 0.518 }], latest: { date: "2026-10-13", above200: 0.518, above50: 0.396, ma8: 0.4993, ma200: 0.6117, bearish: true } },
    uptrend: { history: [{ date: "2026-10-13", ratio: 0.1762 }], market: { ratio: 0.1762, ma10: 0.1529, trend: "up", count: 489, total: 2775 },
      sectors: [{ name: "Energy", ratio: 0.3585, trend: "up" }, { name: "Technology", ratio: 0.3086, trend: "down" }] },
  },
  full: {
    engine: {
      data: { sp: { score: 27, zone: "Weakening", exposure: "40-60%", weakest: "Bearish Signal Status (10)", extra: "momentum(8/200MA) 15", data_date: "2026-10-13" },
        uptrend: { score: 50.2, zone: "Neutral", exposure: "Reduced Exposure (60-80%)", weakest: "Market Breadth (Overall) (30)", extra: "2 warning-uri", data_date: "2026-10-13" },
        ndx: { score: 55.8, zone: "Healthy", exposure: "75-90%", weakest: "momentum MM50 (50.0%)", extra: ">MM200 59.6% | >MM50 50.0%" },
        r2k: { score: 35.4, zone: "Weakening", exposure: "40-60%", weakest: "momentum MM50 (29.3%)" } },
      master: { score: -2, stance: "PRUDENTA / DEFENSIV", action: "Redu expunerea, ridica cash, doar setup-uri A+. Protejeaza castigurile.", confidence: "MEDIE - acoperire partiala", net_ceiling: 40,
        scorecard: [["Breadth participare (4/4 surse valide)", 0, "Mixt / racire (idx 41.4, min 27.0)"], ["Market timing (distribution days)", -2, "max 8 dist.days, 1/3 sub MM50"], ["New Highs - New Lows", 0, "33▲/23▼ (net +10), mixt"]] },
      analysis: { flags: [["low_breadth_watch", "ⓘ 8MA 0.50 < 0.50 (piata selectiva). Istoric: randamente forward PESTE medie (+3pp/60z) dar drawdown mai mare."]] },
    },
    ideas: { asOf: "2026-10-12", coverage: "497/500", rising_sectors: ["XLE", "XLV", "XLK"], nh_nl: { new_highs: 33, new_lows: 23, net: 10 },
      sectors: [{ sector: "Energy", etf: "XLE", rs_3m: 12.4, rising: true, ideas: [{ ticker: "MPC", rs_score: 69, ret_3m: 51.2, pct_from_high: -1, vcp: false, days_to_earnings: 20 }, { ticker: "VLO", rs_score: 53.9, ret_3m: 44.6, pct_from_high: -1.8, days_to_earnings: 8 }, { ticker: "PSX", rs_score: 49.1, ret_3m: 39.7, pct_from_high: 0, days_to_earnings: 14 }, { ticker: "APA", rs_score: 18.7, ret_3m: 35.7, pct_from_high: -1.2 }] },
        { sector: "Information Technology", etf: "XLK", rs_3m: 3.4, rising: true, ideas: [{ ticker: "P", rs_score: 115.1, ret_3m: 101.6, pct_from_high: 0, vcp: true, days_to_earnings: null }] },
        { sector: "Utilities", etf: "XLU", rs_3m: -12.4, rising: false }],
      early_buy: [{ ticker: "TWLO", sector: "Information Technology", rs_6m: 114.1, pct_from_high: -6.2, days_to_earnings: 15 }, { ticker: "URI", sector: "Industrials", rs_6m: 22.2, pct_from_high: -9.3, days_to_earnings: 7, earnings_warn: true },
        { ticker: "<b>X</b>", sector: "Industrials", rs_6m: 1, pct_from_high: -5 }, { ticker: "A1", rs_6m: 1, pct_from_high: -1 }, { ticker: "A2", rs_6m: 1, pct_from_high: -1 }, { ticker: "A3", rs_6m: 1, pct_from_high: -1 }],
      contrarian: [{ ticker: "ZTS", sector: "Health Care", pct_from_high: -48.7, off_low: 9.5, days_to_earnings: 22 }] },
  },
};

await test("LatimeUS.extins: Master Score, încrederea, plafonul; cele 4 surse cu numele robotului, zona în engleză, „cel mai slab” în română", () => {
  const x = LU.extins(MB, ACUM);
  assert.equal(x.masterScor, -2); assert.equal(x.incredere, "medie"); assert.equal(x.plafon, 40); assert.equal(x.stanta, "prudență / defensiv");
  assert.equal(x.surse.map((s) => s.nume + "|" + s.scor + "|" + s.zona).join(" · "), "S&P 500 Breadth Index|27|Weakening · Uptrend Ratio|50.2|Neutral · Nasdaq 100 Breadth|55.8|Healthy · Russell 2000 Breadth|35.4|Weakening");
  assert.equal(x.surse[1].slab, "Market Breadth Overall (30)"); assert.equal(x.surse[2].slab, "momentum peste MM50 (50%)"); assert.equal(x.surse[1].expunere, "60-80%");
  assert.equal(LU.normalizeaza(MB, ACUM).masterScor, undefined, "normalizeaza rămâne cum era (pagina Acțiuni)");
});
await test("LatimeUS.extins: scorecard-ul și steagul în română curată (diacritice, virgulă zecimală)", () => {
  const x = LU.extins(MB, ACUM);
  assert.equal(x.scorecard.map((c) => c.ce + "|" + c.v + "|" + c.text).join(" ## "),
    "Breadth participare|0|4/4 surse valide · mixt / răcire · media 41,4, minimul 27 ## Market Timing · Distribution Days|-2|până la 8 zile de distribuție · 1 din 3 indici sub MM50 ## New Highs − New Lows|0|33 maxime ▲ / 23 minime ▼ · net +10 · mixt");
  assert.equal(x.steaguri[0], "Breadth 8MA 50,0%: piață selectivă. Istoric: randamente pe 60 de zile peste medie (+3 pp), dar cu căderi mai mari.");
  assert.equal(x.sp500.peste200, 0.518); assert.equal(x.sp500.bearish, true); assert.equal(x.uptrend.trend, "urcă"); assert.equal(x.uptrend.sectoare[1].nume, "Technology");
  assert.equal(x.lideri.length, 2, "doar sectoarele care urcă, cu idei"); assert.equal(x.earlyX[1].rapAproape, true); assert.equal(x.contrarianX[0].pesteMinim, 9.5);
});
await test("htmlCard: „Market Breadth · SUA” cu toate numele, 51,8% peste MM200, Bearish Signal activ, Uptrend Ratio pe sectoare, sursele", () => {
  const h = LU.htmlCard(LU.extins(MB, ACUM));
  for (const s of ["Market Breadth · SUA", "PRUDENȚĂ / DEFENSIV", "Master Score <b class=\"bad\">−2</b>", "expunere maximă 40%", "Cele 4 surse · scor 0–100", "S&amp;P 500 Breadth Index", "Uptrend Ratio", "Nasdaq 100 Breadth", "Russell 2000 Breadth",
    "mbZWeakening", "Scorecard", "Market Timing · Distribution Days", "51,8%", "39,6%", "49,9% / 61,2%", "Bearish Signal (8MA sub 200MA)", ">activ<", "17,6%", "New Highs − New Lows", "33 ▲ / 23 ▼ · net +10", "Uptrend Ratio pe sectoare", "Technology <b class=\"bad\">30,9% ↓", "TraderMonty"])
    assert.ok(h.includes(s), "lipsește: " + s);
  assert.match(LU.htmlCard(null), /Aștept datele robotului market-breadth/);
});
await test("htmlSugestii: cele trei liste cu numele lor, clic ⇒ Poarta, raportarea ≤ 7 zile roșie, VCP, „încă N”, simbolul escapat, avertismentul", () => {
  const h = LU.htmlSugestii(LU.extins(MB, ACUM));
  for (const s of ["Sugestii din Market Breadth", "497/500", "1 · Liderii din sectoarele care urcă", "2 sectoare urcă", "Energy (XLE) +12,4%", "2 · Early buy", "3 · Contrarian", "risc mare", "sugLaPoarta(&#39;MPC&#39;)", "3 luni +51,2%", "la 1,8% de maxim", "la maxim", "VCP", "încă 1: APA", "încă 1: A3", "mbIncaTel\">încă 3: VLO, PSX, APA", "mbIncaTel\">încă 4: &lt;b&gt;X&lt;/b&gt;, A1, A2, A3", "−48,7% de la maxim", "+9,5% peste minim", "NU recomandare", "doar setup-uri A+"])
    assert.ok(h.includes(s), "lipsește: " + s);
  assert.match(h, /<span class="szChip szN mbRap">raport\. 7z<\/span>/, "URI raportează în 7 zile ⇒ roșu");
  assert.ok(!h.includes("<b>X</b>"), "simbolul cu HTML e curățat"); assert.match(LU.htmlSugestii(null), /Aștept datele/);
});

// ── Scorul zilei ──
const macro = { scor: 2, partial: false, treapta: { cod: "inclinat", text: "înclinat spre risc" }, semne: [{ cod: "vix", ok: true, v: 15.8, text: "calm" }, { cod: "frica", ok: true, v: 62 }, { cod: "btcSp", ok: true, v: 0.61 }] };
const trend = { dataUltimei: "2026-10-13", regim: { peste: true, inchidere: 778, sma200: 724 } };
const ndxIngust = { n: 100, e50: 35 };
const latime = { acum: { la: ACUM - 10 * 60000, regim: { cod: "LARG-SUS" }, lat: { n: 150, lipsa: 1, sus: 127, jos: 18, mariLong: 142, fundExtrem: 83 } } };
await test("ScorZi.calc pe cifrele de azi: acțiuni 0 „neutru” din 4 piese (VIX doar informativ, e deja în macro), crypto −1 „urcă, dar aglomerat” din 4 (BTC/S&P informativ)", () => {
  const r = SZ.calc({ macro, ndx: ndxIngust, trend, mbUs: LU.extins(MB, ACUM), latime, acum: ACUM });
  // v100.196 (auditul sever, 🟡8): Master Score-ul conține deja lățimea NDX ⇒ piesa NDX doar informativă (ca VIX): +1 din 3 piese
  assert.equal(r.actiuni.piese.map((p) => p.v).join(","), "1,1,0,-1,0"); assert.equal(r.actiuni.piese[2].info, true); assert.equal(r.actiuni.piese[4].info, true); assert.equal(r.actiuni.scor, 1); assert.equal(r.actiuni.n, 3); assert.equal(r.actiuni.max, 3); assert.equal(r.actiuni.cod, "usorpentru");
  assert.match(r.actiuni.piese[4].val, /35 din 100 peste media de 50 · îngustă/);
  assert.equal(r.crypto.piese.map((p) => p.v).join(","), "1,0,0,-1,-1"); assert.equal(r.crypto.scor, -1); assert.equal(r.crypto.n, 4); assert.equal(r.crypto.max, 4); assert.equal(r.crypto.text, "urcă, dar aglomerat"); assert.equal(r.crypto.piese[2].info, true);
  assert.match(r.crypto.piese[2].val, /legătura 0,6 ·/, "o singură zecimală");
  assert.match(r.actiuni.piese[3].val, /PRUDENȚĂ \/ DEFENSIV \(Master Score −2\)/); assert.match(r.crypto.piese[0].val, /LARG SUS \(127 sus, 18 jos\)/); assert.equal(r.crypto.piese[3].val, "142 din 149");
});
await test("ScorZi.calc: o piesă fără date nu intră în sumă și se spune; lățimea crypto veche de peste 3 ore = „date vechi”; nimic ⇒ „fără date”", () => {
  const r = SZ.calc({ macro, ndx: null, trend: null, mbUs: null, latime: { acum: Object.assign({}, latime.acum, { la: ACUM - 4 * 3600000 }) }, acum: ACUM });
  assert.equal(r.actiuni.n, 1); assert.equal(r.actiuni.scor, 1); assert.equal(r.actiuni.piese[1].val, "fără date"); assert.equal(r.actiuni.piese[4].v, null, "fără ndx ⇒ fără piesă (nu „largă”)");
  assert.equal(r.crypto.piese[0].val, "date vechi"); assert.equal(r.crypto.piese[0].v, null);
  const g = SZ.calc({ acum: ACUM }); assert.equal(g.actiuni.cod, "faradate"); assert.equal(g.actiuni.text, "fără date");
  const html = SZ.html(r); assert.match(html, /1 din 4 piese cu date/); assert.match(html, /szLipsa/); assert.match(html, /Neprobat ca semnal/);
});
await test("ScorZi.verdicte: unul pe linie (SPY / BTC) doar cu cel puțin 3 piese numărate cu date și preț", () => {
  const r = SZ.calc({ macro, ndx: ndxIngust, trend, mbUs: LU.extins(MB, ACUM), latime, acum: ACUM });
  assert.deepEqual(JSON.parse(JSON.stringify(SZ.verdicte(r, 660, 112000, ACUM))), [{ s: "scor-zi-actiuni", k: "SPY_US_EQ", n: "usorpentru", p: 660, t: ACUM }, { s: "scor-zi-crypto", k: "BTC_USDT_PERP", n: "usorcontra", p: 112000, t: ACUM }]);
  const p = SZ.calc({ macro: null, acum: ACUM }); assert.equal(SZ.verdicte(p, 660, 112000, ACUM).length, 0);
});
await test("revizia: macro ținut „neutru” = 0 (nu −1); Trend mai vechi de 4 zile și lățimea crypto NECUNOSCUT / fără monede ⇒ fără piesă; un verdict crypto nu pleacă doar din frică/lăcomie", () => {
  const r = SZ.calc({ macro, macroTinut: { cod: "neutru", scor: -2 }, ndx: { n: 100, e50: 70 }, trend: Object.assign({}, trend, { dataUltimei: "2026-10-05" }), acum: ACUM });
  assert.equal(r.actiuni.piese[0].v, 0); assert.match(r.actiuni.piese[0].val, /neutru \(−2\)/); assert.equal(r.actiuni.piese[1].val, "date vechi"); assert.equal(r.actiuni.piese[4].v, 1);
  const lN = { acum: { la: ACUM, regim: { cod: "NECUNOSCUT" }, lat: { n: 150, lipsa: 150, sus: 0, jos: 0, mariLong: 0, fundExtrem: 0 } } };
  const c = SZ.calc({ macro, latime: lN, acum: ACUM });
  assert.equal(c.crypto.piese[0].v, null); assert.equal(c.crypto.piese[3].v, null); assert.equal(c.crypto.n, 1); assert.equal(SZ.verdicte(c, 660, 112000, ACUM).length, 0);
  assert.equal(SZ.calc({ macro, latime: { acum: { la: ACUM, lat: { n: 150, sus: 100, jos: 40 } } }, acum: ACUM }).crypto.piese[0].v, null, "regim lipsă ⇒ fără piesă, fără excepție");
  assert.equal(SZ.calc({ latime: { acum: { la: ACUM, eroare: "429" } }, acum: ACUM }).crypto.piese[0].val, "eroare la citire");
});
await test("revizia: date stricate de la robot (null în liste) nu aruncă; cardurile noi au plasă de siguranță în pagină; istoricul topului se scrie ca numere", () => {
  const j = JSON.parse(JSON.stringify(MB)); j.full.engine.master.scorecard.push(null); j.full.ideas.sectors[0].ideas.push(null); j.full.ideas.early_buy.push(null); j.sources.uptrend.sectors.push(null); j.full.ideas.nh_nl = { new_highs: 3 };
  const x = LU.extins(j, ACUM); assert.ok(x); assert.ok(!/null/.test(LU.htmlCard(x)), "nimic „null” pe ecran"); LU.htmlSugestii(x);
  const ae = citeste("public", "lib", "acasa-ecran.js");
  assert.match(ae, /var acNou = function \(id, f\) \{ var el = \$\(id\); if \(!el\) return; try \{ el\.innerHTML = f\(\); \} catch \(e\)/); assert.match(ae, /macroTinut: d\.piataCol && d\.piataCol\.macro \? Object\.assign\(\{ la: d\.piataCol\.la \}, d\.piataCol\.macro\) : null, ndx: ndxL \? Object\.assign\(\{ la: d\.ndx && d\.ndx\.la \}, ndxL\) : null/);   /* v100.196: cu vârstele (🔵3) */
  assert.match(ae, /var nL = Number\(i && i\.luni\) \|\| 0, nP = Number\(i && i\.luniPlus\) \|\| 0/);
});
await test("colectorul: scorZiDinDate adună ACELEAȘI date ca pagina (piata, btc 1D, ndx, trend12, latime, Market Breadth) și întoarce scorul + prețul BTC", async () => {
  const cerute = [];
  const d = { jurnal() {}, ScorZi: SZ, LatimeUS: LU, GridCalcul: { bareToate: (l) => l.map((x) => ({ t: x.t || x.time, c: Number(x.c || x.close) })) },
    Macro: { scor: () => macro }, Acasa: { largimeNdx: () => ndxIngust },
    cere: async (u) => { cerute.push(u); if (/stiri\?action=piata/.test(u)) return { vix: [{ t: 1, c: 16.3 }], qqq: [{ t: 1, c: 600 }] }; if (/pionex_klines/.test(u)) return { data: { klines: [{ time: 1, close: "112000" }] } }; if (/ndx/.test(u)) return { actiuni: [] }; if (/trend12/.test(u)) return { trend }; if (/latime/.test(u)) return { latime }; return null; },
    fetch: async () => ({ ok: true, json: async () => MB }) };
  const r = await scorZiDinDate(d, ACUM);
  assert.equal(r.sz.actiuni.scor, 1); assert.equal(r.sz.actiuni.n, 3); assert.equal(r.sz.crypto.scor, -1);   /* v100.196: NDX informativ lângă Master Score */ assert.equal(r.pretBtc, 112000);
  assert.ok(["/api/stiri?action=piata", "/api/t212?action=ndx", "/api/istoric-bot?action=trend12", "/api/istoric-bot?action=latime", "/api/istoric-bot?action=piata"].every((u) => cerute.includes(u)), cerute.join(" "));
  assert.equal(await scorZiDinDate({ jurnal() {} }, ACUM), null, "fără module ⇒ nimic");
});

// ── pagina „Piața azi” ──
await test("acasa-ecran: acTrendZi arată primele 5 (salt, raportare, „toate 20 în Sugestii ›”), acTopSector primul pe sector după 3 luni, cu istoricul „nedovedit”", () => {
  const c = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])), $: () => null, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {}, addEventListener() {}, document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] } };
  c.window = c; vm.createContext(c); vm.runInContext(citeste("public", "lib", "acasa-ecran.js"), c);
  const top = Array.from({ length: 20 }, (_, i) => ({ s: "T" + i, nume: "Firma " + i, sector: "Technology", m12: 1.5, r60: 0.3, ...(i === 2 ? { salt: { pct: 1.77 } } : {}), ...(i === 4 ? { raporteaza: { d: "2099-01-01" } } : {}) }));
  const h = c.acTrendZi({ dataUltimei: "2026-10-13", regim: { peste: true }, top, concentrare: { n: 11, sector: "Technology" }, bilant: { n20: 0 } });
  assert.equal((h.match(/class="acSym"/g) || []).length, 5); assert.match(h, /salt \+177,0% într-o zi/); assert.match(h, /raportează în \d+z/); assert.match(h, /11 din 20 Technology — un singur pariu/); assert.match(h, /navTo\(&#39;sugestii&#39;,true\)/);
  assert.match(c.acTrendZi(null), /Clasamentul vine o dată pe zi/);
  const s = c.acTopSector({ univers: 250, istoric: { luni: 7, medie: 0.003, luniPlus: 4 }, sectoare: [{ ro: "Energie", top: [{ s: "MPC", nume: "Marathon", r3: 0.59 }, { s: "PBF" }, { s: "VLO" }] }, { ro: "Sănătate", top: [{ s: "MRNA", nume: "Moderna", r3: 2.17 }] }] });
  assert.ok(s.indexOf("MRNA") < s.indexOf("MPC"), "ordonat după 3 luni"); assert.match(s, /\+217,0%/); assert.match(s, /PBF, VLO/); assert.match(s, /7 luni de istoric, \+0,3% pe lună în medie, 4 din 7 pe plus — nedovedit/);
});
await test("pagina: cererile noi, cardurile desenate, Scorul zilei din aceleași date ca regimul macro; rândurile în HTML, scriptul în pagină și în cache", () => {
  const ae = citeste("public", "lib", "acasa-ecran.js"), idx = citeste("public", "index.html"), sw = citeste("public", "sw.js");
  for (const s of ['pas("mbUs"', 'pas("trend12"', 'pas("sectoareTop"', 'pas("latimeKv"', 'acNou("acMb", function () { return LatimeUS.htmlCard(mbX); })', 'acNou("acMbSug", function () { return LatimeUS.htmlSugestii(mbX); })', 'ScorZi.html(ScorZi.calc({ macro:', 'trend: d.trend12, mbUs: mbX, latime: d.latimeKv', 'acNou("acTrendZi", function () { return acTrendZi(d.trend12); })', 'acNou("acTopSector", function () { return acTopSector(d.sectoareTop); })'])
    assert.ok(ae.includes(s), "acasa-ecran: " + s);
  assert.match(idx, /<div class="acDoua acDouaMb"><div class="acCol"><div class="acBloc" id="acMacro"><\/div><div class="acBloc acMbBloc" id="acMb"><\/div><\/div><div class="acCol"><div class="acBloc" id="acRegim"><\/div><div class="acBloc acSzBloc" id="acScorZi"><\/div><\/div><\/div>/);
  assert.match(idx, /<div class="acDoua acDouaSug"><div class="acCol"><div class="acBloc" id="acSectoare"><\/div><div class="acBloc" id="acTopSector"><\/div><\/div><div class="acCol"><div class="acBloc acMbBloc" id="acMbSug"><\/div><\/div><\/div>/);
  assert.match(idx, /<script src="\/lib\/macro\.js"><\/script><script src="\/lib\/scor-zi\.js"><\/script>/); assert.match(sw, /"\/lib\/scor-zi\.js"/);
});
await test("CSS: coloanele pe monitor, ordinea demo-ului pe telefon (Dobânzi, Scorul zilei, Market Breadth, Regim; Sectoare, Sugestii MB, Trend, Cele mai tari), rândul 2 înaintea hărții", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#dash \.acCol\{display:flex;flex-direction:column;gap:8px;min-width:0\}/); assert.match(css, /\.pzDemo #acasa>\.acDoua:has\(#acSectoare\)\{order:51\}/);
  assert.match(css, /@media \(max-width:900px\)\{#dash \.acCol\{display:contents\}#dash \.acDouaMb #acMacro\{order:1\}#dash \.acDouaMb #acScorZi\{order:2\}#dash \.acDouaMb #acMb\{order:3\}#dash \.acDouaMb #acRegim\{order:4\}/);
  assert.match(css, /#dash \.acDouaSug #acSectoare\{order:1\}#dash \.acDouaSug #acMbSug\{order:2\}#dash \.acDouaSug #acTopSector\{order:3\}/);
  assert.match(css, /\.acSym\{min-height:44px\}/, "pe telefon simbolul e de apăsat cu degetul");
  assert.match(css, /\.szRand>span\{grid-column:1\/-1\}\.mbPeste\{display:none\}\.mbIncaPc\{display:none\}\.mbIncaTel\{display:block\}/, "pe telefon: verdictul scorului sub bară, rândurile peste demo ascunse, „încă N” al telefonului");
  assert.match(css, /\.mbIncaTel\{display:none\}/);
  const iNou = css.indexOf("#dash .acCol{"), iPanda = css.lastIndexOf("@media (max-width:640px){.sugPandaTab thead"); assert.ok(iNou > 0 && iPanda > iNou, "pânda rămâne ultima regulă");
});
await test("jurnalul verdictelor: sursele scor-zi-actiuni / scor-zi-crypto în pagină și pe server; colectorul le trimite din tura verdictelor; versiunile", () => {
  const vc = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl }; vc.window = vc; vm.createContext(vc); vm.runInContext(citeste("public", "lib", "verdicte.js"), vc);
  const A = vc.Verdicte.SURSE["scor-zi-actiuni"], C = vc.Verdicte.SURSE["scor-zi-crypto"];
  assert.ok(A && C); assert.equal(A.h.join(","), "5,20"); assert.equal(A.masura, "randament"); assert.equal(A.fav.join(","), "pentru,usorpentru"); assert.equal(C.piata, "crypto");
  assert.match(citeste("functions", "api", "istoric-bot.js"), /"trend-12-1","scor-zi-actiuni","scor-zi-crypto"\]\)/);
  const tv = citeste("scripts", "lib", "tura-verdicte.mjs"), col = citeste("scripts", "colector.mjs");
  assert.match(tv, /const sz = await incearca\(d, "scorul zilei", \(\) => scorZiDinDate\(d, acum\)\)/); assert.match(col, /const ScorZi = incarca\("scor-zi\.js", "ScorZi"\)/);
  assert.match(col, /bareZi: bareZiCont, Macro, Acasa, LatimeUS, ScorZi, fetch(, Carnet, Retea, modeleRetea, modeleArbori)?(, GridLaborator, GridProba, lumanari15M, netCache)? \}, verdicteStare\)/);   /* v101.116: + registrul întreg */
  const v = /const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(col); assert.ok(v && Number(v[1]) >= 114);
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 193); assert.ok(!/v100\.192\b/.test(citeste("public", "index.html")));   /* de la v100.193 în sus */
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-(19[3-9]|[2-9]\d\d)/); assert.match(citeste("package.json"), /npm run test:v100192 && npm run test:v100193/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
