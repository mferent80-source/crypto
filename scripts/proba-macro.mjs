// Proba regimului macro în Radar (v100.168, 12.10.2026, direcția lui „o aplicație și atât”, pasul 4.5):
// din pagina macro-dashboard a premarket_scanner se mută DOAR ce lipsea (el: „Alerta + scorul de regim macro”, „e ok”):
// scorul de regim (VIX + dobânda pe 10 ani + dolarul + legătura BTC–S&P + frica crypto, praguri și trepte ca în pagina veche,
// histerezis anti-zbatere), un card pe Dashboard, un rând în „Ce spune piața acum”, alerta pe Discord la schimbarea REALĂ
// a regimului și alerta cu ~30 de minute înainte de evenimentele mari din SUA (calendarul faireconomy).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nRegimul macro în Radar · proba\n");

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "macro.js"), ctx);
const MC = ctx.Macro;
const J = (x) => JSON.parse(JSON.stringify(x));

// ── date sintetice în forma rutelor: /api/stiri?action=piata dă {time, close}; Pionex dă {time, close} ca text ──
const ZI = 86400000, N = 60, T0 = Date.UTC(2026, 7, 1);
const zil = (f, ora) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * ZI + (ora || 0), open: f(i), high: f(i), low: f(i), close: f(i) }));
const r = (i) => 0.01 * Math.sin(i * 1.7);
const cum = (k) => { const a = [100]; for (let i = 1; i < N; i++) a.push(a[i - 1] * (1 + k * r(i))); return a; };
const SPY = cum(1), BTC = cum(2);
function date(o) {
  o = o || {};
  return {
    vix: o.faraVix ? null : zil(() => o.vix ?? 14.8, 13.5 * 3600000),
    tnx: o.faraTnx ? null : zil((i) => (i < N - 22 ? 4.94 : i === N - 1 ? 4.94 + (o.tnxBp ?? 30) / 100 : 4.94), 13.5 * 3600000),
    dxy: o.faraDxy ? null : zil((i) => (i < N - 1 ? 100 : 100 * (1 + (o.dxyPct ?? 3.1) / 100)), 13.5 * 3600000),
    spy: zil((i) => SPY[i], 13.5 * 3600000),
    btc: (o.faraBtc ? [] : BTC).map((c, i) => ({ time: String(T0 + i * ZI), close: String(c) })),
    fg: o.faraFg ? null : { valoare: o.fg ?? 69 },
  };
}
const ACUM = T0 + N * ZI;

await test("scor: cele 5 semne cu pragurile paginii vechi — VIX 14,8 calm +2 · dobânda +30 pb −1 · dolarul +3,1% −1 · BTC–S&P +1 · frica 69 +1 ⇒ +2", () => {
  const s = MC.scor(date(), ACUM);
  assert.deepEqual(J(s.semne.map((x) => [x.cod, x.scor])), [["vix", 2], ["dobanda", -1], ["dolar", -1], ["btcSp", 1], ["frica", 1]]);
  assert.equal(s.scor, 2); assert.equal(s.treapta.cod, "inclinat"); assert.equal(s.treapta.text, "înclinat spre risc"); assert.equal(s.partial, false); assert.equal(s.valide, 5);
  assert.equal(s.semne[0].valoare, "14,8"); assert.equal(s.semne[1].valoare, "+30 pb într-o lună"); assert.equal(s.semne[2].valoare, "+3,1% într-o lună"); assert.match(s.semne[3].valoare, /^legătura 1,00 pe 30 de zile$/);
});
await test("trepte: ≥4 risk-on · ≥1 înclinat · ≥−2 neutru · ≥−5 prudent · ≥−8 risk-off · altfel stres", () => {
  assert.deepEqual(J([4, 1, 0, -2, -3, -5, -6, -8, -9].map((v) => MC.treaptaDin(v).cod)), ["riskon", "inclinat", "neutru", "neutru", "prudent", "prudent", "riskoff", "riskoff", "stres"]);
});
await test("pragurile fiecărui semn (VIX, dobânda, dolarul, frica)", () => {
  const v = (vix) => MC.scor(date({ vix }), ACUM).semne[0].scor;
  assert.deepEqual([v(11), v(17.9), v(24), v(29), v(31)], [1, 2, -1, -2, -3]);
  const t = (tnxBp) => MC.scor(date({ tnxBp }), ACUM).semne[1].scor;
  assert.deepEqual([t(-30), t(-15), t(0), t(15), t(30)], [-2, -1, 1, 0, -1]);
  const d = (dxyPct) => MC.scor(date({ dxyPct }), ACUM).semne[2].scor;
  assert.deepEqual([d(2), d(0.5), d(-2)], [-1, 0, 1]);
  const f = (fg) => MC.scor(date({ fg }), ACUM).semne[4].scor;
  assert.deepEqual([f(75), f(60), f(50), f(35), f(20)], [2, 1, 0, -1, -2]);
});
await test("date parțiale: sub 3 din 5 surse ⇒ fără verdict („date parțiale”), semnele lipsă spuse; nimic ⇒ null", () => {
  const s = MC.scor(date({ faraVix: true, faraTnx: true, faraDxy: true }), ACUM);
  assert.equal(s.partial, true); assert.equal(s.valide, 2); assert.equal(s.treapta.cod, "partial"); assert.equal(s.semne[0].ok, false);
  assert.equal(MC.scor(null, ACUM), null);
});
await test("histerezis (ca în pagina veche): o treaptă vecină cu |Δscor| < 2 ține regimul vechi; salt ≥ 2 sau ≥ 2 trepte schimbă", () => {
  const nou = (scor) => ({ scor, treapta: MC.treaptaDin(scor), partial: false });
  assert.deepEqual(J(MC.histerezis({ cod: "neutru", scor: 0 }, nou(1))), { cod: "neutru", scor: 0, tinut: true, schimbat: false });
  assert.deepEqual(J(MC.histerezis({ cod: "neutru", scor: 0 }, nou(3))), { cod: "inclinat", scor: 3, tinut: false, schimbat: true });
  assert.deepEqual(J(MC.histerezis(null, nou(1))), { cod: "inclinat", scor: 1, tinut: false, schimbat: false });
  assert.deepEqual(J(MC.histerezis({ cod: "inclinat", scor: 2 }, nou(2))), { cod: "inclinat", scor: 2, tinut: false, schimbat: false });
});
await test("mesajRegim: alerta la schimbarea REALĂ, cu semnele; parțial ⇒ nimic", () => {
  const s = MC.scor(date(), ACUM), m = MC.mesajRegim("neutru", s);
  assert.equal(m.titlu, "🛡 Regimul macro s-a schimbat"); assert.match(m.mesaj, /^Din „neutru” în „înclinat spre risc” \(scor \+2\): VIX calm, dobânda urcă tare/);
  assert.equal(MC.mesajRegim("neutru", MC.scor(date({ faraVix: true, faraTnx: true, faraDxy: true }), ACUM)), null);
});
await test("textCitire: rândul „Regim macro” scurt; fără date ⇒ spus", () => {
  const t = MC.textCitire(MC.scor(date(), ACUM));
  assert.equal(t.ce, "Regim macro"); assert.equal(t.stare, "bine");
  assert.equal(t.text, "înclinat spre risc (scor +2) · VIX 14,8 · dobânda +30 pb/lună · dolarul +3,1%/lună · BTC–S&P 1,00 · frica crypto 69");
  assert.match(MC.textCitire(null).text, /nu s-au putut citi/);
  assert.match(MC.textCitire(MC.scor(date({ faraVix: true, faraTnx: true, faraDxy: true }), ACUM)).text, /^date parțiale/);
});
await test("htmlCard: cardul de pe Dashboard (acCap, verdict, bara −10…+7, 5 rânduri cu scor, nota); fără undefined/NaN", () => {
  const h = MC.htmlCard(MC.scor(date(), ACUM));
  assert.match(h, /<h4>Regim macro<\/h4>/); assert.match(h, /<b>înclinat spre risc<\/b> · scor \+2/); assert.equal((h.match(/class="acTr mcTr"/g) || []).length, 5);
  assert.match(h, /class="mcBara"><span style="left:70\.6%"/); assert.match(h, /nu semnal de intrare/); assert.ok(!/undefined|NaN/.test(h));
  assert.match(MC.htmlCard(null), /Aduc datele/);
});
// v100.172 (revizia Opus): cardul și rândul nu mai contrazic Discordul — regimul ținut de colector (histerezis + confirmare) e cel afișat
await test("v100.172 htmlCard / textCitire cu regimul ținut de colector: aproape de prag ⇒ rămâne cel ținut, citirea de acum spusă alături", () => {
  const r = MC.scor(date(), ACUM);   // înclinat spre risc, scor +2
  const h = MC.htmlCard(r, { cod: "neutru", scor: 1 });
  assert.match(h, /<b>neutru<\/b>/); assert.match(h, /citirea de acum: înclinat spre risc \(scor \+2\)/);
  const t = MC.textCitire(r, { cod: "neutru", scor: 1 });
  assert.match(t.text, /^neutru \(ținut; citirea de acum: înclinat spre risc, scor \+2\)/); assert.equal(t.stare, "info");
});
await test("v100.172 schimbare reală încă neconfirmată de colector ⇒ citirea de acum, cu nota că Discordul o anunță după confirmare", () => {
  const r = MC.scor(date(), ACUM), h = MC.htmlCard(r, { cod: "prudent", scor: -3 });
  assert.match(h, /<b>înclinat spre risc<\/b>/); assert.match(h, /Pe Discord e încă „prudent”/);
  assert.match(MC.textCitire(r, { cod: "prudent", scor: -3 }).text, /^înclinat spre risc \(scor \+2\).*Discord: încă „prudent”/);
});
await test("v100.172 același regim ca la colector sau fără el ⇒ cardul și rândul neschimbate", () => {
  const r = MC.scor(date(), ACUM);
  assert.equal(MC.htmlCard(r, { cod: "inclinat", scor: 2 }), MC.htmlCard(r)); assert.equal(MC.htmlCard(r, null), MC.htmlCard(r));
  assert.equal(MC.textCitire(r, { cod: "inclinat", scor: 2 }).text, MC.textCitire(r).text);
});
await test("v100.172 ruta piata (istoric-bot): colectorul salvează regimul ținut; GET îl dă; cod necunoscut ignorat", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const H = { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.172.0.1" };
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=piata", { method: "POST", headers: H, body: JSON.stringify(corp) }), env: ENV });
  const get = async () => JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=piata", { headers: H }), env: ENV })).text());
  assert.equal((await post({ la: ACUM, macro: { cod: "inclinat", scor: 2 } })).status, 200);
  assert.deepEqual((await get()).macro, { la: ACUM, cod: "inclinat", scor: 2 });
  await post({ la: ACUM, macro: { cod: "<b>", scor: 2 } }); assert.equal((await get()).macro.cod, "inclinat", "cod necunoscut ignorat");
});
await test("v100.172 Dashboard și „Ce spune piața acum” trimit regimul ținut (piataCol.macro) în card / rând", () => {
  const ae = citeste("public", "lib", "acasa-ecran.js"), app = citeste("public", "app.js");
  assert.match(ae, /Macro\.htmlCard\(Macro\.scor\(\{[^}]*\}, Date\.now\(\)\), d\.piataCol && d\.piataCol\.macro \? Object\.assign\(\{ la: d\.piataCol\.la \}, d\.piataCol\.macro\) : null, d\.piataLa \|\| d\.btc1dLa \|\| null\)/);   /* v100.224: ora citirii */
  assert.match(app, /getJSON\("\/api\/istoric-bot\?action=piata"\)/); assert.ok(app.includes("Date.now()),macroStare.tinut)"), "macroCitire fără regimul ținut");
});
await test("v100.174 regimul ținut mai vechi de 2 ore (colectorul stă) e ignorat: cardul arată citirea de acum", () => {
  const r = MC.scor(date(), ACUM), vechi = { cod: "neutru", scor: 1, la: Date.now() - 3 * 3600000 }, proaspat = { cod: "neutru", scor: 1, la: Date.now() - 10 * 60000 };
  assert.equal(MC.htmlCard(r, vechi), MC.htmlCard(r)); assert.match(MC.htmlCard(r, proaspat), /<b>neutru<\/b>/);
  const la = Date.UTC(2026, 9, 20, 10, 5), ora = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(la));
  const cu = MC.htmlCard(r, vechi, la);
  assert.match(cu, new RegExp("actualizat " + ora.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(cu, /Colectorul n-a publicat regimul de curând\. Asta e citirea de acum\./);
  assert.doesNotMatch(MC.htmlCard(r, proaspat, la), /Colectorul n-a publicat/);
  assert.match(MC.htmlCard(r, vechi, null), /Colectorul n-a publicat/);
  assert.doesNotMatch(MC.htmlCard(r, vechi, null), /actualizat /);
});
await test("evenimente: doar SUA, impact mare, în următoarele 35 de minute; mesajul cu prognoza / anteriorul cu virgulă", () => {
  const A = Date.UTC(2026, 9, 14, 12, 0), ev = (min, o) => Object.assign({ title: "CPI m/m", country: "USD", impact: "High", date: new Date(A + min * 60000).toISOString(), forecast: "0.3%", previous: "0.4%" }, o || {});
  const l = MC.evenimenteCurand([ev(30), ev(40), ev(-5), ev(20, { country: "EUR" }), ev(25, { impact: "Medium" })], A);
  assert.equal(l.length, 1); assert.equal(l[0].titlu, "CPI m/m");
  const m = MC.mesajEveniment(l[0], A);
  assert.equal(m.titlu, "⚠️ Eveniment mare în SUA: CPI m/m"); assert.equal(m.nivel, "atentie");
  assert.match(m.mesaj, /^În 30 de minute: CPI m\/m \(mie\. 15:30\) · prognoza 0,3%, anterior 0,4%\. N-aș porni boți noi și n-aș cumpăra chiar acum/);
  assert.match(MC.mesajEveniment(MC.evenimenteCurand([ev(1, { forecast: "", previous: "" })], A)[0], A).mesaj, /^În 1 minut: CPI m\/m \(mie\. 15:01\)\. N-aș/);
});

// ── legăturile din pagină ──
const idx = citeste("public", "index.html"), sw = citeste("public", "sw.js"), app = citeste("public", "app.js"), ae = citeste("public", "lib", "acasa-ecran.js"), css = citeste("public", "app.css");
await test("index.html: cardul #acRegim imediat după „Dobânzi, dolar, aur”; scriptul lib/macro.js; sw.js îl are în APP_SHELL", () => {
  assert.match(idx, /<div class="acCol"><div class="acBloc" id="acMacro"><\/div>[^]*?<\/div><\/div><div class="acCol"><div class="acBloc" id="acRegim"><\/div>/);   /* v100.193: același rând, coloana a doua (demo aprobat) */
  assert.match(idx, /<script src="\/lib\/macro\.js"><\/script>/); assert.match(sw, /"\/lib\/macro\.js"/);
});
await test("Dashboard: cardul se desenează din datele pe care ecranul le are deja (piata + btc1d), fără cereri noi", () => {
  assert.match(ae, /\$\("acRegim"\)\.innerHTML = typeof Macro !== "undefined" \? Macro\.htmlCard\(Macro\.scor\(\{ vix: p\.vix, tnx: p\.tnx, dxy: p\.dxy, spy: p\.spy, btc: d\.btc1d, fg: p\.fg \}, Date\.now\(\)\), d\.piataCol && d\.piataCol\.macro \? Object\.assign\(\{ la: d\.piataCol\.la \}, d\.piataCol\.macro\) : null, d\.piataLa \|\| d\.btc1dLa \|\| null\) : ""/);
});
await test("„Ce spune piața acum”: rândul „Regim macro” după „Sectoarele US”", () => {
  assert.match(app, /if\(ex\.sectoare\)out\.push\(rd\(ex\.sectoare\)\);if\(ex\.macro\)out\.push\(rd\(ex\.macro\)\);/);
  assert.match(app, /function macroAduce\(dupa\)/);
});
await test("CSS: stilul cardului înaintea regulii pândei (care rămâne ultima)", () => {
  assert.match(css, /\.mcBara\{position:relative/); assert.ok(css.lastIndexOf(".sugPandaTab thead{display:table-header-group}") > css.lastIndexOf(".mcBara"));
});

console.log(`\n${teste - picate}/${teste} probe trec`);
if (picate) process.exit(1);
