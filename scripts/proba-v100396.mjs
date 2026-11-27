// Proba v100.396 (27.11.2026, el: „fa tot” după auditul pe tot Radarul din 26.11): reparațiile auditului, pe valuri.
//   A. greșelile mele din v100.395: 1000PEPE cu prețul unei monede, „Probabil” nu pe Revenire, urmărirea cu ultimul preț văzut + „nejudecat” + ferestre
//   B. I-942 lichidarea (stopul propus, totalul plafonat) · C. I-943 alertele pe episod · D. I-944 boții de semnal · E. I-945 frâna pe o cifră
//   F. I-946 registrul alertelor · G. I-951 paznicul + un colector · H. I-947 frâna pe tot contul · I. I-953 pauza · J. I-954 parola · K. I-952 fără F5
//   L. I-948 riscul cu botul nou · M. I-950 lichidarea în mișcarea monedei · N. I-949 regula lui + proba listei · O. valul 3 (🟡) · V. versiunea
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
const plain = (o) => JSON.parse(JSON.stringify(o));
const ctxLib = (fisiere, extra) => { const ctx = Object.assign({ console, Math, Number, Array, Object, String, JSON, isFinite, isNaN, Infinity, NaN, Date, Intl, Promise, Set, Map, TextRo: globalThis.TextRo }, extra || {}); vm.createContext(ctx); for (const f of fisiere) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f }); return ctx; };
const H = 3600000, ZI = 24 * H, ACUM = Date.UTC(2026, 10, 27, 10, 0);

// ── A. greșelile din v100.395 ──
const M = ctxLib(["monede-bot.js"]).MonedeBot;
await test("A1. cheia și multiplicatorul ca tura-caderi: 1000PEPE / 1000000MOG / 1MBABYDOGE ⇒ baza; prețul afișat ÷ multiplicator", () => {
  assert.equal(M.cheie("1MBABYDOGEUSDT"), "BABYDOGE"); assert.equal(M.cheie("1000000MOGUSDT"), "MOG"); assert.equal(M.cheie("1000PEPEUSDT"), "PEPE"); assert.equal(M.cheie("1INCHUSDT"), "1INCH");
  assert.equal(M.mult("1000PEPEUSDT"), 1000); assert.equal(M.mult("1000000MOGUSDT"), 1e6); assert.equal(M.mult("1MBABYDOGEUSDT"), 1e6); assert.equal(M.mult("ZECUSDT"), 1); assert.equal(M.mult("1INCHUSDT"), 1);
  assert.equal(M.cheie("10000LADYSUSDT"), "LADYS"); assert.equal(M.mult("10000LADYSUSDT"), 1e4);   /* revizia 27.11: ca bazePionex („1000+”) */
  const c = ctxLib(["latime.js", "reveniri.js", "monede-bot.js", "sugestii-ecran.js"], { escapeHtml: (s) => String(s), sugStare: { panda: {} }, getJSON: async () => ({}), navTo() {}, setTimeout, clearTimeout, window: null });
  const kv = { la: ACUM - 10 * 60000, n: 2, short: ["PEPE"], long: [], revenire: [], range: [], monede: [{ sym: "1000PEPEUSDT", s: "PEPE", junk: [], parte: "short", agitata: true, r14: -0.2, er14: -0.18, r3: -0.05, er3: -0.1, amp: 0.09, pret: 0.003518, vol: 240e6, oi: 65e6 }] };
  const r = c.sugRanduri({ monedeBot: kv }, ACUM, "sugestii").find((x) => x.k === "mbot:short:PEPE"); assert.equal(r.pret, c.sugPandaPret(0.000003518));
  const f = plain(c.sugFisa(r, { monedeBot: kv }, ACUM)); assert.match(f.pretNota, /împărțit la 1\.000 \(contractul 1000PEPE\)/);
});
await test("A2. „Probabil” nu apare pe Revenire; „contra” doar pe Direcție", () => {
  const dir = { parte: "short", er14: -0.12, agitata: true, junk: [] };
  assert.ok(M.probabil(dir)); assert.equal(M.probabil({ ...dir, revine: true }), null);
  const kv = { la: ACUM - 10 * 60000, short: [], long: [], revenire: ["ENA"], range: [], monede: [{ sym: "ENAUSDT", s: "ENA", junk: [], parte: "short", revine: true, agitata: true, r14: -0.28, er14: -0.25, r3: 0.05, er3: 0.2, amp: 0.1 }] };
  const t = M.textMoneda(kv, "ENA", "long", ACUM); assert.equal(t.contra, false); assert.ok(!/botul tău e LONG, moneda merge/.test(t.text), t.text);
});
const T = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monede-bot.mjs")).href);
await test("A3. urmărirea: moneda delistată se judecă pe ultimul preț văzut; ziua ratată cu peste 2 h = „nejudecată”; ferestrele independente numărate", () => {
  const litere = "ABCDEFGHIJKL".split(""), corp = { short: ["A", "B"], long: ["C"], monede: litere.map((s) => ({ s, pret: 100 })) };
  let u = T.urmareste(null, corp, {}, ACUM);
  const pr2 = {}; litere.forEach((s) => (pr2[s] = 100)); pr2.A = 70;   // A văzut la 70 după 3 zile, apoi delistată
  u = T.urmareste(u, { ...corp, monede: [] }, pr2, ACUM + 3 * ZI);
  const pr7 = {}; litere.forEach((s) => (pr7[s] = 100)); delete pr7.A; pr7.B = 90; pr7.C = 120;
  u = T.urmareste(u, { ...corp, monede: [] }, pr7, ACUM + 7 * ZI + H);
  const j = u.judecate[0], medie = (70 + 90 + 120 + 900) / 12 / 100 - 1;
  assert.equal(j.nUnivers, 12, "A rămâne în medie pe ultimul preț văzut"); assert.ok(Math.abs(j.short.exces - (-1) * ((-0.3 - 0.1) / 2 - medie)) < 1e-12, JSON.stringify(j));
  let v = T.urmareste(null, corp, {}, ACUM); v = T.urmareste(v, { ...corp, monede: [] }, pr7, ACUM + 7 * ZI + 3 * H);
  assert.equal(v.judecate[0].nejudecat, "colectorul n-a mers la 7 zile"); assert.equal(T.rezumatUrmarire(v).nejudecate, 1); assert.equal(T.rezumatUrmarire(v).short.zile, 0);
  const W = { judecate: ["2026-01-01", "2026-01-02", "2026-01-05", "2026-01-08", "2026-01-15", "2026-01-16"].map((zi) => ({ zi, short: { exces: 0.01 } })), zile: [] };
  assert.equal(T.rezumatUrmarire(W).short.ferestre, 3, "01, 08, 15 - la cel puțin 7 zile una de alta"); assert.equal(T.rezumatUrmarire(W).short.zile, 6);
});
await test("A4. ruta păstrează ferestrele și zilele nejudecate; pagina le spune (26 de FERESTRE, nu de zile)", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const r = await m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=monedeBot", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.4", "content-type": "application/json" }, body: JSON.stringify({ la: ACUM, monede: [{ sym: "ZECUSDT", s: "ZEC" }], short: ["ZEC"], long: [], urmarire: { short: { zile: 9, ferestre: 2, medie: 0.01, pePlus: 0.6 }, nejudecate: 3 } }) }), env: ENV });
  assert.equal(r.status, 200); const g = JSON.parse(kv.get("monede-bot")); assert.equal(g.urmarire.short.ferestre, 2); assert.equal(g.urmarire.nejudecate, 3);
  const c = ctxLib(["latime.js", "reveniri.js", "monede-bot.js", "sugestii-ecran.js"], { escapeHtml: (s) => String(s), sugStare: { panda: {} }, getJSON: async () => ({}), navTo() {}, setTimeout, clearTimeout, window: null });
  const t = c.sugMbotUrm(g.urmarire, 40); assert.match(t, /9 zile judecate \(2 ferestre independente\)/); assert.match(t, /Doar cifrele: urmărirea n-are o regulă de verdict scrisă înainte/);   /* revizia valului 4: fără promisiunea unui verdict care nu vine */ assert.match(t, /3 zile nejudecate \(colectorul n-a mers la 7 zile\)/); assert.doesNotMatch(t, /Fără verdict sub 26/);   /* revizia valului 4: urmărirea n-are verdict deloc (nu „sub 26”) */
});

// ── B. I-942: o singură pază de lichidare ──
const { botDeProba } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "bot-de-proba.mjs")).href);
for (const f of ["grid-calcul.js", "grid-proba.js", "monte-simbol.js", "grid-sim.js", "busola.js", "scenariu.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "sfaturi.js", "conteaza.js", "consiliu.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const TE = globalThis.TabloExtra, SB = globalThis.SemnaleBot;
const stopulPropus = (b, pragStop) => SB.acumConcret({ bot: b, fisa: null, zero: TE.dacaInchizi(b), costuri: TE.grileVsCosturi(b, ACUM), plan: null, acum: ACUM, pragStop, cifre: (pr) => TE.cifreActiuni(b, { protectie: pr }) }).filter((c) => c.cod === "stop")[0];
await test("B1. totalul la prețul X e plafonat la −suma pusă și e −suma pusă dincolo de lichidare (lichidatLa o spune); brutul rămâne neplafonat", () => {
  const b = botDeProba("long", 66, 66, { x: { estimateLiquidationPriceDown: "60" } }), inv = b.investit;
  assert.ok(inv > 0 && b.pretLichidare === 60, JSON.stringify([inv, b.pretLichidare]));
  assert.deepEqual(plain(TE.lichidatLa(b, 59)), { parte: "jos", pret: 60 }); assert.equal(TE.lichidatLa(b, 61), null);
  assert.equal(TE.totalCuGridLa(b, 59), -inv); assert.ok(TE.totalCuGridLaBrut(b, 40) < -inv, "premisa: brutul trece de −suma pusă");
  assert.equal(TE.totalCuGridLa(b, 40), -inv); const t61 = TE.totalCuGridLa(b, 61); assert.ok(t61 > -inv && t61 === Math.max(TE.totalCuGridLaBrut(b, 61), -inv));
  /* stricarea scăpată în prima rulare: plafonul fără lichidare știută (pretLichidare lipsă) - brutul sub −suma pusă tot −suma pusă dă */
  const f = Object.assign({}, b, { pretLichidare: null, lichidareJos: null, lichidareSus: null }); assert.equal(TE.lichidatLa(f, 40), null);
  assert.ok(TE.totalCuGridLaBrut(f, 30) < -inv, "premisa"); assert.equal(TE.totalCuGridLa(f, 30), -inv);
});
await test("B1b. lichidarea citită de partea GREȘITĂ a prețului (date vechi / stricate) nu plafonează nimic", () => {
  const b = botDeProba("long", 66, 66, { x: { estimateLiquidationPriceDown: "60" } });
  assert.equal(TE.lichidatLa(Object.assign({}, b, { pretLichidare: 70, lichidareJos: 70 }), 59), null, "long cu lichidarea peste preț");
  const s = Object.assign({}, b, { directie: "short", pretLichidare: 50, lichidareJos: null, lichidareSus: null }); assert.equal(TE.lichidatLa(s, 80), null, "short cu lichidarea sub preț");
});
await test("B2. stopul propus din profilul monedei, dincolo de lichidare ⇒ strâns înaintea ei (marja 2%), cu motivul spus", () => {
  const b = botDeProba("long", 64, 64, { x: { estimateLiquidationPriceDown: "60" } });
  const st = stopulPropus(b, { dist: 0.12, sursa: "profilul monedei" });   // 64 × 0,88 = 56,3 < lichidarea 60
  assert.ok(Math.abs(st.pretPropus - 60 * 1.02) < 1e-9, String(st.pretPropus)); assert.match(st.text, /strâns înaintea lichidării \(60/);
  const fara = stopulPropus(botDeProba("long", 64, 64, { x: { estimateLiquidationPriceDown: "40" } }), { dist: 0.12, sursa: "profilul monedei" });
  assert.ok(Math.abs(fara.pretPropus - 64 * 0.88) < 1e-9, "lichidarea departe ⇒ propunerea profilului rămâne: " + fara.pretPropus);
});
await test("B3. lichidarea chiar lângă margine (strânsul ar cădea peste preț) ⇒ niciun preț propus și spus de ce (marjă / levier)", () => {
  const b = botDeProba("long", 64, 64, { x: { estimateLiquidationPriceDown: "63.5" } });
  const st = stopulPropus(b, { dist: 0.12, sursa: "profilul monedei" });
  assert.equal(st.pretPropus ?? null, null, String(st.pretPropus)); /* revizia 27.11: aici motivul e PREȚUL (64, lichidarea 63,5 ⇒ sub 2%), nu marginea gridului ⇒ textul spune prețul */
  assert.match(st.text, /Lichidarea \(63[.,]5\) e la mai puțin de 2% de prețul de acum: nu mai încape un stop înaintea ei\. Aș adăuga marjă sau aș închide\./);
});
await test("B4. „un long simplu, aceeași sumă și levier” e lichidat la −suma pusă, nu −125%", () => {
  const b = botDeProba("long", 70, 52, { x: { estimateLiquidationPriceDown: "48.1", initPrice: "71" } });   // −27% față de pornire, la 3× ⇒ −81%… la 5× ⇒ −135%
  b.levier = 5; const v = TE.vsPozitie(b);
  assert.equal(v.pozitieSimpla, -b.investit); assert.equal(v.pozitieLichidata, true);
  const c = TE.vsPozitie(Object.assign({}, b, { levier: 1 })); assert.equal(c.pozitieLichidata, false); assert.ok(c.pozitieSimpla > -b.investit);
});
await test("B5. Consilierul: botul CU stop dincolo de lichidare nu mai e „n-are stop activ”; indicația de sub cursor are o zecimală și „lichidat înainte”", () => {
  const src = citeste("public", "lib", "consiliu.js"); assert.match(src, /\/lichidarea vine întâi\/\.test\(cs\.tag\.t\) \? "Stopul stă dincolo de lichidare: nu apucă să închidă"/);
  const tc = citeste("public", "lib", "tablou-citire.js"); assert.match(tc, /TextRo\.num\(Math\.abs\(t\),1\)\+' USDT<\/span>/); assert.doesNotMatch(tc.split("function tbLaPret")[1].split("\n")[0], /toFixed\(2\)/);
  assert.match(tc, /lichidLa:function\(px\)\{return TabloExtra\.lichidatLa/);
});

// ── C. I-943: alertele pe episod ──
const POL = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "politica-alerte.mjs")).href);
await test("C1. sănătatea colectorului (cheia „colector”, fără bot): al doilea critic din aceeași zi ajunge și el pe Discord", () => {
  const st = {}; const a = { nivel: "critic", titlu: "Crypto Radar oprit: serverul de pe VPS nu răspunde" }, b = { nivel: "critic", titlu: "Crypto Radar nu-ți mai vede boții" };
  assert.equal(POL.repetare(st, a, "colector", null, ACUM), false); assert.equal(POL.repetare(st, b, "colector", null, ACUM + H), false);
  assert.equal(POL.repetare(st, { nivel: "critic", titlu: "MMT nu mai apare în lista Pionex" }, "colector", null, ACUM + 2 * H), false);
});
await test("C2. episodul: revenirea (ok) pleacă și închide episodul ⇒ a doua alarmă pe aceeași cheie, în aceeași zi, pleacă; repetarea fără revenire rămâne tăiată", () => {
  const st = {}, alarma = { nivel: "critic", titlu: "BULLA: grila" }, ok = { nivel: "ok", titlu: "BULLA: grila, a trecut" };
  assert.equal(POL.repetare(st, alarma, "grila", "7", ACUM), false); assert.equal(POL.repetare(st, alarma, "grila", "7", ACUM + H), true, "aceeași alarmă, fără revenire ⇒ tot tăiată (anti-zgomot)");
  assert.equal(POL.repetare(st, ok, "grila", "7", ACUM + 2 * H), false, "revenirea pleacă"); assert.equal(POL.repetare(st, alarma, "grila", "7", ACUM + 3 * H), false, "episod nou ⇒ pleacă");
  assert.equal(POL.repetare(st, ok, "grila", "7", ACUM + 4 * H), false); assert.equal(POL.repetare(st, ok, "grila", "7", ACUM + 5 * H), true, "a doua revenire fără alarmă între ele ⇒ tăiată");
});
await test("C3. „status” (MARGIN_CALL) și „plan-stop” pleacă mereu; rapoartele programate (raportul pe părți, dimineața, trade-ul zilei, noaptea) nu sunt tăiate", () => {
  const st = {}, crit = { nivel: "critic", titlu: "x" };
  for (const k of ["status", "plan-stop", "raport", "dimineata", "tradezilei", "rezumat-noapte"]) { assert.equal(POL.repetare(st, crit, k, "7", ACUM), false, k); assert.equal(POL.repetare(st, crit, k, "7", ACUM + 60000), false, k + " a doua oară"); }
  assert.equal(POL.mereuPeDiscord("plan", crit), false, "„plan” rămâne sub regula pe episod (nu mereu)");
});
await test("C4. noaptea: intrările / ieșirile botului de semnal stau pentru 08:00, dar „s-a oprit” (poate lichidat) pleacă imediat", () => {
  const noapte = Date.UTC(2026, 10, 27, 0, 30);   // 02:30 ora României
  assert.equal(POL.eNoapte(noapte), true, "premisa");
  const intrare = POL.politicaNoapte({ nivel: "info", titlu: "MMT: intrare SHORT" }, "semnal-intrare-2692", noapte), oprit = POL.politicaNoapte({ nivel: "critic", titlu: "MMT: botul de semnal s-a oprit" }, "semnal-oprit-2692", noapte);
  assert.ok(intrare && intrare.doarRadar, JSON.stringify(intrare)); assert.ok(oprit && !oprit.doarRadar, JSON.stringify(oprit));
});

// ── D. I-944: paza boților de semnal ──
const BS = ctxLib(["bot-semnal.js"]).BotSemnal;
const sem = (o) => Object.assign({ tip: "semnal", id: "2692", baza: "MMT.PERP", ruleaza: true, directie: "short", pozitie: -1000, pozitieBani: 300, pretCurent: 0.3, levier: 3, investit: 100, profitTotal: -2, pretLichidare: null }, o);
await test("D1. lichidarea: maintPrice / pretLichidare dacă vine; altfel estimată din levier și intrare (bani / cantitate); long 1× nu se lichidează; intrare neplauzibilă ⇒ nimic", () => {
  const e = BS.lichidare(sem());   // intrare 0,30, short 3× ⇒ 0,30 × (1 + 1/3 − 0,005)
  assert.ok(e.estimat && Math.abs(e.pret - 0.3 * (1 + 1 / 3 - 0.005)) < 1e-12 && Math.abs(e.dist - (e.pret - 0.3) / 0.3) < 1e-12, JSON.stringify(e));
  assert.deepEqual(plain(BS.lichidare(sem({ pretLichidare: 0.39 }))), { pret: 0.39, dist: (0.39 - 0.3) / 0.3, estimat: false });
  assert.equal(BS.lichidare(sem({ directie: "long", pozitie: 1000, levier: 1 })).faraLichidare, true);
  assert.equal(BS.lichidare(sem({ pozitieBani: 3000 })), null, "intrarea 3,0 la prețul 0,3 nu e plauzibilă");
  assert.equal(BS.lichidare(sem({ directie: null })), null);
});
await test("D2. paza: o alertă pe treaptă și pe episod (lichidarea 15% / 8%, pierderea −10% / −15%), treapta coboară ⇒ episod nou; cheile ies pe Discord", () => {
  /* revizia: aici doar alertele de LICHIDARE (pierderea nerealizată a short-ului care urcă intră acum și ea, cum trebuie - D6) */
  const lq = (x) => x.alerte.filter((a) => /^lich-/.test(a.cheie));
  let r = BS.paza(sem({ pretCurent: 0.34, levier: 3 }), null, ACUM);   // lichidarea ~0,3985 ⇒ ~17% ⇒ nimic
  assert.equal(lq(r).length, 0, JSON.stringify(r.alerte));
  r = BS.paza(sem({ pretCurent: 0.36 }), r.st, ACUM + 60000); assert.equal(lq(r).length, 1); assert.equal(lq(r)[0].nivel, "atentie"); assert.match(lq(r)[0].titlu, /lichidarea la \d+,\d% de preț \(estimată\)/);
  assert.equal(lq(r)[0].cheie, "lich-semnal-2692"); assert.equal(POL.mereuPeDiscord(lq(r)[0].cheie, lq(r)[0]), true);
  r = BS.paza(sem({ pretCurent: 0.365 }), r.st, ACUM + 120000); assert.equal(lq(r).length, 0, "aceeași treaptă ⇒ tăcere");
  r = BS.paza(sem({ pretCurent: 0.375 }), r.st, ACUM + 180000); assert.equal(lq(r).length, 1); assert.equal(lq(r)[0].nivel, "critic");
  r = BS.paza(sem({ pretCurent: 0.3 }), r.st, ACUM + 240000); r = BS.paza(sem({ pretCurent: 0.36 }), r.st, ACUM + 300000); assert.equal(lq(r).length, 1, "episod nou după revenire");
  let p = BS.paza(sem({ profitTotal: -11 }), null, ACUM); assert.equal(p.alerte.filter((a) => a.cheie === "pierdere-semnal-2692").length, 1); assert.match(p.alerte[0].titlu, /−11,0% din suma pusă/);
  p = BS.paza(sem({ profitTotal: -16 }), p.st, ACUM + 60000); assert.equal(p.alerte[0].nivel, "critic"); assert.match(p.alerte[0].mesaj, /regula ta de oprire \(−15% din suma pusă, cu poziția deschisă\)/);
});
await test("D3. poziția ținută peste 24 h ⇒ o alertă; ieșirea resetează; botul oprit ⇒ nimic; noaptea pierderea și lichidarea nu se amână", () => {
  let r = BS.paza(sem(), null, ACUM); r = BS.paza(sem(), r.st, ACUM + 23 * H); assert.equal(r.alerte.length, 0);
  r = BS.paza(sem(), r.st, ACUM + 25 * H); assert.equal(r.alerte.length, 1); assert.equal(r.alerte[0].cheie, "veche-semnal-2692"); assert.match(r.alerte[0].titlu, /SHORT deschis de/);
  r = BS.paza(sem(), r.st, ACUM + 26 * H); assert.equal(r.alerte.length, 0);
  r = BS.paza(sem({ directie: null, pozitie: 0 }), r.st, ACUM + 27 * H); assert.equal(r.st.deschisDe, 0);
  assert.equal(BS.paza(sem({ ruleaza: false, profitTotal: -50 }), null, ACUM).alerte.length, 0);
  const noapte = Date.UTC(2026, 10, 27, 0, 30);
  for (const k of ["lich-semnal-1", "pierdere-semnal-1"]) { const m = POL.politicaNoapte({ nivel: "atentie", titlu: "x" }, k, noapte); assert.ok(!m.doarRadar, k); }
  /* revizia 27.11: poziția ținută peste 24 h (atenție) așteaptă noaptea rezumatul de 08:00 */
  assert.equal(POL.politicaNoapte({ nivel: "atentie", titlu: "x" }, "veche-semnal-1", noapte).doarRadar, true);
});
await test("D4. cartela botului de semnal: celula „Lichidarea” (estimată / după Pionex / nu există la long 1×), fără „lichidarea nu se aplică”; colectorul cheamă paza", () => {
  const h = BS.cardHtml(sem({ pretCurent: 0.36 }), (s) => String(s), { acum: ACUM });
  assert.match(h, /Lichidarea<\/span><b class="tbKpiVal tbWarn">\d+,\d% de preț<\/b><span class="tbSub">~[\d.,]+ · estimată din levier și intrare/); assert.doesNotMatch(h, /lichidarea și sfaturile de grid nu se aplică/);
  assert.match(BS.cardHtml(sem({ directie: "long", pozitie: 1000, levier: 1 }), (s) => String(s), { acum: ACUM }), /Lichidarea<\/span><b class="tbKpiVal good">nu există/);
  assert.match(citeste("scripts", "colector.mjs"), /pz = BotSemnal\.paza\(b, st\[b\.id\]\.paza, acum\)/);
});

await test("D5 (revizia). histerezis: prețul care joacă 7,9% ↔ 8,1% de lichidare o oră ⇒ O singură alertă critică; o citire lipsă păstrează treapta; ieșirea abia peste 9,5% / 17%", () => {
  /* short 3×, intrarea 0,30 ⇒ lichidarea ~0,3985; prețul pentru o distanță d: p = 0,3985 / (1 + d) */
  const laD = (d) => sem({ pretCurent: 0.3 * (1 + 1 / 3 - 0.005) / (1 + d) }); let st = null, n = 0, nCrit = 0;
  for (let i = 0; i < 60; i++) { const r = BS.paza(laD(i % 2 ? 0.079 : 0.081), st, ACUM + i * 60000); st = r.st; const l = r.alerte.filter((a) => a.cheie === "lich-semnal-2692"); n += l.length; nCrit += l.filter((a) => a.nivel === "critic").length; }
  assert.equal(nCrit, 1, "critice într-o oră: " + nCrit); assert.equal(n, 2, "atenția (8,1%) și apoi critica (7,9%), atât - înainte: 31");
  let r = BS.paza(sem({ pretCurent: null }), st, ACUM + 3700000); assert.equal(r.st.lich, 2, "fără preț: treapta rămâne"); assert.equal(r.alerte.length, 0);
  r = BS.paza(laD(0.09), r.st, ACUM + 3800000); assert.equal(r.st.lich, 2, "9% e încă în zona critică (ieșirea la 9,5%)");
  r = BS.paza(laD(0.12), r.st, ACUM + 3900000); assert.equal(r.st.lich, 1); r = BS.paza(laD(0.16), r.st, ACUM + 4000000); assert.equal(r.st.lich, 1, "16% încă atenție (ieșirea la 17%)");
  r = BS.paza(laD(0.18), r.st, ACUM + 4100000); assert.equal(r.st.lich, 0); r = BS.paza(laD(0.14), r.st, ACUM + 4200000); assert.equal(r.alerte.length, 1, "episod nou după ieșirea adevărată");
});
await test("D6 (revizia, pe viu: profitul Pionex al botului de semnal e doar REALIZAT): pierderea = realizat + nerealizatul poziției; întoarcerea poziției repornește ceasul de 24 h", () => {
  /* long 1000 la intrarea 0,30 (pozitieBani 300), realizat −2 USDT, prețul 0,27 ⇒ nerealizat −30 ⇒ −32 din 100 puși = −32% */
  const b = sem({ directie: "long", pozitie: 1000, pozitieBani: 300, pretCurent: 0.27, levier: 1, profitTotal: -2 }), rc = BS.rezultatCuPozitie(b);
  assert.ok(Math.abs(rc.nerealizat + 30) < 1e-9 && Math.abs(rc.total + 32) < 1e-9, JSON.stringify(rc));
  const r = BS.paza(b, null, ACUM); assert.equal(r.alerte.filter((a) => a.cheie === "pierdere-semnal-2692").length, 1); assert.match(r.alerte.find((a) => a.cheie === "pierdere-semnal-2692").titlu, /−32,0% din suma pusă/);
  assert.equal(BS.rezultatCuPozitie(sem({ directie: null, pozitie: 0, profitTotal: -2 })).total, -2);
  let s = BS.paza(sem(), null, ACUM).st; s = BS.paza(sem(), s, ACUM + 20 * H).st; s = BS.paza(sem({ directie: "long", pozitie: 1000 }), s, ACUM + 21 * H).st;
  const v = BS.paza(sem({ directie: "long", pozitie: 1000 }), s, ACUM + 26 * H); assert.equal(v.alerte.filter((a) => /^veche-/.test(a.cheie)).length, 0, "long-ul deschis la 21 h are 5 h, nu 26");
});

// ── E. I-945: frâna de 4% pe o singură cifră ──
const CA = ctxLib(["text-ro.js", "cont-intreg.js", "acasa.js"]), CI = CA.ContIntreg, AC = CA.Acasa, CAfara = ctxLib(["text-ro.js", "acasa.js"]).Acasa;
const rapCont = (o) => Object.assign({ valoare: { total: 42500, complet: true, lipsa: [] }, risc: { var95: 1500 }, riscAcum: { acum: { var95: 2100 } }, lipsuri: [] }, o);
await test("E1. ContIntreg.riscZi: riscul „de acum” întâi, cel vechi doar rezervă (= ciRiscZi de pe Contul întreg); lipsaValoare spune părțile lipsă", () => {
  assert.equal(CI.riscZi(rapCont()).var95, 2100); assert.equal(CI.riscZi(rapCont()).acum, true); assert.equal(CI.riscZi(rapCont({ riscAcum: null })).var95, 1500);
  assert.deepEqual(plain(CI.lipsaValoare(rapCont({ valoare: { total: 2500, complet: false, lipsa: ["Trading 212"] } }))), ["Trading 212"]); assert.deepEqual(plain(CI.lipsaValoare(rapCont())), []);
});
await test("E2. frâna pe Acasă: riscul de acum 4,9% (cel vechi 3,5%) ⇒ „aș reduce”, ca pe Contul întreg; la fel și fără cont-intreg.js încărcat (colectorul)", () => {
  for (const A of [AC, CAfara]) { const t = A.franaCont({ raportStare: "ok", raport: rapCont() }); assert.match(t, /^Aș reduce expunerea până sub 4% pe zi.*~4,9% din cont/, t); }
  assert.equal(AC.franaCont({ raportStare: "ok", raport: rapCont({ riscAcum: { acum: { var95: 1000 } } }) }) || "", AC.franaCont({ raportStare: "ok", raport: rapCont({ riscAcum: { acum: { var95: 1000 } } }) }) || "");
  assert.doesNotMatch(AC.franaCont({ raportStare: "ok", raport: rapCont({ riscAcum: { acum: { var95: 1000 } } }) }) || "", /Aș reduce/);
});
await test("E3. o parte lipsă din valoarea contului (T212 căzut la tură) ⇒ „n-o pot judeca”, nu „~56% din cont”; riscNecunoscut o spune", () => {
  const r = rapCont({ valoare: { total: 2500, complet: false, lipsa: ["Trading 212"] } });
  const t = AC.franaCont({ raportStare: "ok", raport: r }); assert.equal(t, "N-aș porni nimic nou: lipsește Trading 212, deci riscul pe o zi nu se poate judeca."); assert.ok(t.length <= 110, "rândul „👉” de pe Discord (revizia)");
  const t3 = AC.franaCont({ raportStare: "ok", raport: rapCont({ valoare: { total: 2500, complet: false, lipsa: ["soldul liber Pionex", "Trading 212", "Salt"] } }) }); assert.equal(t3, "N-aș porni nimic nou: lipsește o parte din cont, deci riscul pe o zi nu se poate judeca.");
  assert.match(AC.riscNecunoscut({ raportStare: "ok", raport: r }), /riscul pe o zi e socotit fără Trading 212/);
});

// ── F. I-946: registrul alertelor pe dovadă ──
const RG = ctxLib(["alerte-registru.js"]).AlReg;
const regDate = (fel, piata, zile, x) => { const intrari = [], jud = {}; zile.forEach((z, i) => { const e = { fel, piata, t: Date.parse(z + "T10:00:00Z"), simbol: "S" + i, sens: 1, pret0: 1 }; intrari.push(e); jud[RG.cheie(e)] = { [RG.CAP[piata]]: { x: typeof x === "function" ? x(i) : x } }; }); return { intrari, jud }; };
const zileDe = (n, pas) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * pas * ZI).toISOString().slice(0, 10));
await test("F1. 30 de cazuri pe 30 de zile la acțiuni (orizont 5 ședințe) NU mai dau verdict: doar ferestrele la ≥ 7 zile se numără (5 din 26)", () => {
  const { intrari, jud } = regDate("iesi", "actiuni", zileDe(30, 1), (i) => 0.02 + (i % 3) * 0.001);
  const f = RG.rezumat(intrari, jud, ACUM).feluri[0]; assert.equal(f.ferestre, 5); assert.equal(f.verdict, "se-aduna"); assert.equal(f.judecate, 30);
});
await test("F1b (revizia valului 4, 🟠). boții: ferestrele la 2 zile una de alta - 26 de zile la rând dau 13 ferestre (o zi și cea de după își împart până la 24 h din orizont)", () => {
  const { intrari, jud } = regDate("a", "crypto", zileDe(26, 1), 0.01); const f = RG.rezumat(intrari, jud, ACUM).feluri[0];
  assert.equal(RG.GAP_ZILE.crypto, 2); assert.equal(f.ferestre, 13); assert.equal(f.verdict, "se-aduna");
  assert.match(citeste("public", "lib", "alerte-ecran.js"), /boți: la 2 zile una de alta, ca 24 h să nu se suprapună/); assert.doesNotMatch(citeste("public", "lib", "alerte-ecran.js"), /60 de zile sau 30 de cazuri/);
});
await test("F2. la 26 de ferestre: verdict cu corecția pentru câte feluri sunt gata; un efect mic trece la un fel și nu la patru (Bonferroni)", () => {
  const x = (i) => 0.004 + ((i * 7919) % 13 - 6) * 0.001;   // medie ~0,004, abatere ~0,004
  const a = regDate("a", "crypto", zileDe(26, 2), x), b = RG.rezumat(a.intrari, a.jud, ACUM).feluri[0];
  assert.equal(b.ferestre, 26); assert.equal(b.corectie, 1); assert.equal(b.verdict, "peste", JSON.stringify(b));
  const tot = { intrari: [], jud: {} }; for (const k of ["a", "b", "c", "d"]) { const d = regDate(k, "crypto", zileDe(26, 2), x); tot.intrari.push(...d.intrari); Object.assign(tot.jud, d.jud); }
  const r4 = RG.rezumat(tot.intrari, tot.jud, ACUM).feluri; assert.ok(r4.every((f) => f.corectie === 4), JSON.stringify(r4.map((f) => f.corectie)));
  assert.ok(r4[0].lo < b.lo, "intervalul se lărgește cu corecția"); assert.ok(Math.abs(-RG.zInv(0.025) - 1.96) < 1e-3 && Math.abs(-RG.zInv(0.05 / 8) - 2.4977) < 2e-3);
});
await test("F3. verdictul se îngheață: dat o dată, rămâne chiar dacă datele noi l-ar întoarce; deInghetat dă doar verdictele noi", () => {
  const d = regDate("a", "crypto", zileDe(26, 2), 0.01), r = RG.rezumat(d.intrari, d.jud, ACUM), ing = RG.deInghetat(r, {});
  assert.equal(ing.a.verdict, "peste"); assert.deepEqual(plain(RG.deInghetat(r, ing)), {});
  const d2 = regDate("a", "crypto", zileDe(60, 2), (i) => (i < 26 ? 0.01 : -0.05)), r2 = RG.rezumat(d2.intrari, d2.jud, ACUM, ing).feluri[0];
  assert.equal(r2.verdict, "peste"); assert.equal(r2.inghetat, true);
  assert.equal(RG.rezumat(d2.intrari, d2.jud, ACUM).feluri[0].verdict, "sub", "fără înghețare datele noi l-ar fi întors");
});
await test("F5 (revizia 🔴). corecția pe TOATĂ familia: un fel ajuns singur la 26 poartă K = toate felurile; 12 feluri fără efect ⇒ cel puțin un verdict fals în ≤ ~6% din lumi (înainte 45,8%); verdictul înghețat arată cifrele lui", () => {
  const unu = regDate("a", "crypto", zileDe(26, 2), 0.01), tot = { intrari: [...unu.intrari], jud: { ...unu.jud } };
  for (let k = 0; k < 11; k++) { const d = regDate("f" + k, "crypto", zileDe(5, 2), 0); tot.intrari.push(...d.intrari); Object.assign(tot.jud, d.jud); }
  assert.equal(RG.rezumat(tot.intrari, tot.jud, ACUM).feluri.find((f) => f.fel === "a").corectie, 12);
  /* mulberry32 (regula casei pentru aleator în JS), local: m32p de la secțiunea L e definit mai jos */
  let sF = 4242; const rnd = () => { sF |= 0; sF = (sF + 0x6d2b79f5) | 0; let t = Math.imul(sF ^ (sF >>> 15), 1 | sF); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gF = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  let lumiCuFals = 0; const LUMI = 300;
  for (let s = 0; s < LUMI; s++) {
    const t = { intrari: [], jud: {} };
    for (let k = 0; k < 12; k++) { const d = regDate("n" + k, "crypto", zileDe(26, 2), () => 0.01 * gF()); t.intrari.push(...d.intrari); Object.assign(t.jud, d.jud); }
    if (RG.rezumat(t.intrari, t.jud, ACUM).feluri.some((f) => f.verdict === "peste" || f.verdict === "sub")) lumiCuFals++;
  }
  assert.ok(lumiCuFals / LUMI <= 0.08, "lumi cu un verdict fals: " + lumiCuFals + " din " + LUMI);
  const d2 = regDate("a", "crypto", zileDe(60, 2), (i) => (i < 26 ? 0.01 + (i % 3) * 0.001 : -0.05)), ing = RG.deInghetat(RG.rezumat(regDate("a", "crypto", zileDe(26, 2), (i) => 0.01 + (i % 3) * 0.001).intrari, regDate("a", "crypto", zileDe(26, 2), (i) => 0.01 + (i % 3) * 0.001).jud, ACUM), {});
  const f = RG.rezumat(d2.intrari, d2.jud, ACUM, ing).feluri[0]; assert.equal(f.inghetat, true); assert.ok(f.medie > 0 && f.lo > 0, "cifrele înghețate, nu cele de acum"); assert.ok(f.medieAcum < 0, "cele de acum, separat");
});
await test("F4. ruta păstrează ferestrele și înghețarea; colectorul ține verdictele pe disc; pagina spune „N din 26 ferestre” / „înghețat”", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const d = regDate("a", "crypto", zileDe(26, 2), 0.01), r = RG.rezumat(d.intrari, d.jud, ACUM, RG.deInghetat(RG.rezumat(d.intrari, d.jud, ACUM), {}));
  const res = await m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=alerteRegistru", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.5", "content-type": "application/json" }, body: JSON.stringify({ rezumat: r }) }), env: ENV });
  assert.equal(res.status, 200); const g = JSON.parse(kv.get("alerte:registru")).feluri[0]; assert.equal(g.ferestre, 26); assert.equal(g.inghetat, true); assert.equal(g.corectie, 1);
  assert.match(citeste("scripts", "colector.mjs"), /AlReg\.rezumat\(l, jud, Date\.now\(\), ing\), noi = AlReg\.deInghetat\(rez, ing\)/);
  assert.match(citeste("public", "lib", "alerte-ecran.js"), /" din " \+ TextRo\.cate\(f\.nVerdict \|\| 26, "fereastră", "ferestre"\)/);
});

// ── G. I-951: paznicul vede Discordul mort + un singur colector ──
const PZ = await import(pathToFileURL(path.join(RAD, "paznic", "worker.mjs")).href), PO = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "poza.mjs")).href);
const envPaznic = (poza, webhookOk = true) => { const kv = new Map([["poza", poza]]), trimise = []; return { kv, trimise, env: { DISCORD_WEBHOOK: "https://discord.com/api/webhooks/123/abc_DEF", PAZNIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } },
  f: async (url, o) => { trimise.push(JSON.parse(o.body)); return { ok: webhookOk }; } }; };
const pozaCu = (la, discord) => JSON.stringify(PO.construiestePoza({ acum: la, turaLa: la - 30000, discord, versiune: "v101.215", pid: 1, tura: 1, boti: [], t212: [], simboluri: [] }));
await test("G1. poza duce „discord” în primele 400 de caractere, imediat după turaLa; o valoare cu altă formă nu intră", () => {
  const t = pozaCu(ACUM, "esec:" + (ACUM - 40 * 60000) + ":404:3"); assert.match(t.slice(0, 120), /^\{"la":\d+,"turaLa":\d+,"discord":"esec:\d+:404:3",/);
  assert.deepEqual(plain(PZ.discordDinText(t)), { ok: false, esecDe: ACUM - 40 * 60000, cod: "404", coada: 3 }); assert.deepEqual(plain(PZ.discordDinText(pozaCu(ACUM, "ok"))), { ok: true });
  assert.equal(PZ.discordDinText(pozaCu(ACUM, "ceva<script>")), null); assert.equal(PZ.discordDinText(pozaCu(ACUM)), null, "colector vechi ⇒ nimic");
});
await test("G2. paznicul: refuz de 40 de minute ⇒ UN anunț (404 ⇒ webhook șters, cu reparația), tăcere până la 6 h, „a revenit” la ok; sub 30 min / poză veche / fără câmp ⇒ nimic", async () => {
  let p = envPaznic(pozaCu(ACUM, "esec:" + (ACUM - 40 * 60000) + ":404:3"));
  assert.equal((await PZ.verificaDiscord(p.env, ACUM + 60000, p.f)).stare, "anuntat"); assert.equal(p.trimise.length, 1);
  assert.match(p.trimise[0].embeds[0].title, /Discordul refuză alertele colectorului de 41 de minute/); assert.match(p.trimise[0].embeds[0].description, /3 stau la coadă.*webhook-ul colectorului pare șters sau schimbat.*DISCORD_WEBHOOK/);
  assert.equal((await PZ.verificaDiscord(p.env, ACUM + 11 * 60000, p.f)).stare, "anuntat"); assert.equal(p.trimise.length, 1, "o singură dată pe episod");
  assert.equal((await PZ.verificaDiscord(p.env, ACUM + 7 * H, p.f)).stare, "fara-semn", "poza de acum 7 h e veche: tăcerea o spune verifica()");
  p.kv.set("poza", pozaCu(ACUM + 7 * H, "esec:" + (ACUM - 40 * 60000) + ":404:5")); assert.equal((await PZ.verificaDiscord(p.env, ACUM + 7 * H, p.f)).stare, "anuntat"); assert.match(p.trimise[1].embeds[0].description, /Încă refuză/);
  p.kv.set("poza", pozaCu(ACUM + 8 * H, "ok")); assert.equal((await PZ.verificaDiscord(p.env, ACUM + 8 * H, p.f)).stare, "revenit"); assert.match(p.trimise[2].embeds[0].title, /ajung iar pe Discord/); assert.equal(p.kv.get("discordStare"), "{}");
  assert.equal((await PZ.verificaDiscord(p.env, ACUM + 8 * H + 60000, p.f)).stare, "ok"); assert.equal(p.trimise.length, 3);
  p = envPaznic(pozaCu(ACUM, "esec:" + (ACUM - 10 * 60000) + ":retea:1")); assert.equal((await PZ.verificaDiscord(p.env, ACUM, p.f)).stare, "refuz-proaspat");
  p = envPaznic(pozaCu(ACUM)); assert.equal((await PZ.verificaDiscord(p.env, ACUM, p.f)).stare, "fara-semn"); assert.equal(p.trimise.length, 0);
  p = envPaznic(pozaCu(ACUM, "esec:" + (ACUM - 40 * 60000) + ":404:3"), false); assert.equal((await PZ.verificaDiscord(p.env, ACUM, p.f)).stare, "discord-picat"); assert.equal(p.kv.has("discordStare"), false, "netrimis ⇒ se reîncearcă");
  assert.match(citeste("paznic", "worker.mjs"), /ctx\.waitUntil\(verificaDiscord\(env, t\)\)/);
});
await test("G3. colectorul: notează fiecare trimitere (directă și din coadă), pune starea în poză; bate() iese dacă alt colector viu a preluat PID-ul", () => {
  const col = citeste("scripts", "colector.mjs");
  assert.equal((col.match(/notaDiscord\(ok, info\);/g) || []).length, 2); assert.match(col, /discord: discordInPoza\(\)/);
  const src = col.slice(col.indexOf("function altColectorViu("), col.indexOf("const bate = () =>"));
  const alt = new Function("process", "BATAIE_MS", src + "; return altColectorViu;")(process, 3 * 60000);
  assert.equal(alt(process.pid + " " + ACUM, process.pid, ACUM), 0, "eu");
  assert.equal(alt(process.ppid + " " + (ACUM - 60000), process.pid, ACUM), process.ppid, "alt proces viu, bătaie proaspătă ⇒ el a preluat");
  assert.equal(alt(process.ppid + " " + (ACUM - 10 * 60000), process.pid, ACUM), 0, "bătaie veche ⇒ nu contează");
  assert.equal(alt("4194300 " + ACUM, process.pid, ACUM), 0, "proces inexistent");
  assert.match(col, /if \(alt\) \{ iesireDublura = true; try \{ process\.removeListener\("exit", golesteStarea\); \} catch \{\}.*process\.exit\(0\); \}/);
});

// ── H. I-947: frâna pe tot contul, în lei, fără depuneri ──
const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
const rand =(z, valoare, t212, t212Rez, o) => Object.assign({ z, valoare, complet: true, pionex: 15000, t212, salt: valoare - 15000 - t212 }, t212Rez === undefined ? {} : { t212Rez }, o || {});
await test("H1. fluxul T212 = Δtotal − Δ(ppl + result): o depunere de 2.000 lei cu o zi de −500 pe poziții ⇒ −500, nu +1.500; rândul fără ppl + result ⇒ nu se știe", () => {
  const a = rand("2026-11-26", 40000, 22000, 2000), b = rand("2026-11-27", 41500, 23500, 1500);
  assert.equal(CI.fluxT212(a, b), 2000); assert.deepEqual(plain(CI.schimbareFaraDepuneri(a, b)), { lei: -500, flux: 2000, pct: -500 / 40000, din: "ppl+result" });
  assert.equal(CI.schimbareFaraDepuneri(rand("2026-11-26", 40000, 22000), b), null);
  /* pe viu, 27.11: total 22.274,16, ppl −9.293,75, result 11.370,95 ⇒ banii puși net ~20.197 lei (ce scade fluxul) */
  assert.equal(Math.round(22274.16 - (-9293.75 + 11370.95)), 20197);
});
await test("H1b (revizia 🟠). boții de semnal porniți intră în valoarea contului (suma pusă + realizat + nerealizat): 4 × 60 USDT mutați din soldul liber în boți nu mai sunt „pierdere”", () => {
  const leiPe = { USD: 4.87 }, liber = 1000, sm = (o) => Object.assign({ tip: "semnal", activ: false, ruleaza: true, baza: "ZEC.PERP", investit: 60, profitTotal: 0, pozitie: 0, pozitieBani: null, pretCurent: 760, directie: null }, o);
  const v0 = CI.valoare({ boti: [], pionexLiber: liber, t212Cash: { total: 20000 }, salt: [], leiPe });
  const v1 = CI.valoare({ boti: [sm({ id: 1 }), sm({ id: 2 }), sm({ id: 3 }), sm({ id: 4 })], pionexLiber: liber - 240, t212Cash: { total: 20000 }, salt: [], leiPe });
  assert.ok(Math.abs(v1.total - v0.total) < 1e-6, v0.total + " / " + v1.total);
  /* long 0,064 la intrarea 762,37 (pozitieBani 48,79), realizat −0,78, prețul 752,37 ⇒ nerealizat −0,64 ⇒ valoarea 60 − 0,78 − 0,64 */
  const e = CI.dinBot(sm({ directie: "long", pozitie: 0.064, pozitieBani: 48.79168, pretCurent: 752.37, profitTotal: -0.78 }), leiPe);
  assert.ok(Math.abs(e.valoare - (60 - 0.78 - 0.064 * 10)) < 1e-6, String(e.valoare)); assert.ok(e.notional > 0);
  assert.equal(CI.dinBot(sm({ ruleaza: false }), leiPe), null, "botul de semnal oprit nu e în cont");
});
await test("H2. castigCont: azi față de rândul zilei, 7 zile față de rândul de acum 7 zile (cel mult 10); rândul vechi fără ppl + result ⇒ lei null spus; o parte lipsă ⇒ nimic", () => {
  const zile = [rand("2026-11-17", 43000, 22500, 3500), rand("2026-11-20", 42000, 22300, 3300), rand("2026-11-27", 41000, 22200, 3200)];
  const r = CI.castigCont(zile, { valoare: 39600, t212: 22800, t212Rez: 2000, complet: true }, "2026-11-27");
  /* azi: Δ −1.400, flux T212 = 600 − (−1.200) = 1.800 ⇒ −3.200 (−7,8%); 7 zile (rândul din 20.11): Δ −2.400, flux 500 − (−1.300) = 1.800 ⇒ −4.200 */
  assert.equal(r.zi.lei, -3200); assert.equal(r.zi.de, "2026-11-27"); assert.equal(r.zi.flux, 1800); assert.equal(r.sapt.lei, -4200); assert.equal(r.sapt.de, "2026-11-20"); assert.deepEqual(plain(r.prag), { zi: 0.03, sapt: 0.06 });
  const v = CI.castigCont([rand("2026-11-20", 42000, 22300), rand("2026-11-27", 41000, 22200, 3200)], { valoare: 40000, t212: 22200, t212Rez: 3100, complet: true }, "2026-11-27");
  assert.equal(v.zi.lei, -1100, "Δ −1.000; T212 cu totalul neschimbat și ppl + result −100 ⇒ 100 lei depuși ⇒ −1.100"); assert.equal(v.sapt.lei, null); assert.match(v.sapt.motiv, /n-are ppl \+ result, iar istoricul depunerilor T212 nu-l acoperă/);
  assert.equal(CI.castigCont(zile, { valoare: 39600, t212: 22800, t212Rez: 2000, complet: false }, "2026-11-27"), null);
  assert.equal(CI.castigCont(zile, { valoare: 39600, t212: 22800, t212Rez: 2000 }, "2026-11-28").zi, null, "rândul de azi nu e încă scris");
});
await test("H3. frâna pe Acasă: −3,5% azi fără depuneri ⇒ „N-aș porni nimic nou azi”; o depunere fără pierdere ⇒ nimic; −6,5% pe 7 zile ⇒ frâna pe săptămână", () => {
  const r0 = rapCont({ riscAcum: { acum: { var95: 800 } } });
  const t = AC.franaCont({ raportStare: "ok", raport: Object.assign({}, r0, { castig: { zi: { lei: -1487.5, pct: -0.035, flux: 2000 }, sapt: null, prag: { zi: 0.03, sapt: 0.06 } } }) });
  assert.equal(t, "N-aș porni nimic nou azi: contul a pierdut 1.487,5 lei (−3,5%) fără depuneri; pragul ales e −3%."); assert.ok(t.length <= 110);
  assert.equal(AC.franaCont({ raportStare: "ok", raport: Object.assign({}, r0, { castig: { zi: { lei: 20, pct: 0.0005, flux: 2000 }, sapt: { lei: -900, pct: -0.02 }, prag: { zi: 0.03, sapt: 0.06 } } }) }), "");
  assert.match(AC.franaCont({ raportStare: "ok", raport: Object.assign({}, r0, { castig: { zi: null, sapt: { lei: -2762.5, pct: -0.065 }, prag: { zi: 0.03, sapt: 0.06 } } }) }), /^N-aș porni nimic nou: pe 7 zile contul a pierdut 2\.762,5 lei \(−6,5%\) fără depuneri; pragul ales e −6%\.$/);
  const m = MC.franaContTot("zi", { lei: -1487.5, pct: -0.035, flux: 2000 }, 0.03); assert.match(m.titlu, /^Frâna pe tot contul: −1\.487,5 lei azi$/); assert.equal(m.mesaj, "Contul întreg a pierdut 1.487,5 lei (−3,5%) azi, fără depunerile T212 (2.000,0 lei depuse, scoase); pragul ales e −3% pe zi.\n👉 N-aș porni nimic nou azi; mâine, cu capul limpede.");
  assert.equal(POL.mereuPeDiscord("frana-cont-zi", m), true);
});
await test("H4. „față de ieri dimineață” la T212: ppl + result când ambele poze îl au (depunerea nu mai iese „+2.000 lei” verde); poză veche ⇒ totalul, ca înainte", () => {
  const z = AC.ziuaTa({ t212Total: 24000, t212Rez: 1500 }, [{ zi: "2026-11-26", t212Total: 22000, t212Rez: 2000 }], "2026-11-27");
  assert.equal(z.t212, -500); assert.equal(z.t212FaraDepuneri, true);
  const v = AC.ziuaTa({ t212Total: 24000, t212Rez: 1500 }, [{ zi: "2026-11-26", t212Total: 22000 }], "2026-11-27"); assert.equal(v.t212, 2000); assert.equal(v.t212FaraDepuneri, false);
  const s = citeste("public", "lib", "acasa-ecran.js"); assert.equal((s.match(/t212Rez: ctRez \}/g) || []).length, 2); assert.match(s, /Față de ieri dimineață' \+ \(zt\.t212FaraDepuneri \? ' <span class="acMut">· fără depuneri<\/span>'/);
  assert.match(citeste("scripts", "lib", "tura-piata.mjs"), /t212Rez: ca && Number\.isFinite\(Number\(ca\.ppl\)\) && Number\.isFinite\(Number\(ca\.result\)\)/);
});
await test("H5. proba VaR pe zilele reale: ziua cu depunere nu mai pare câștig / retragerea nu mai pare depășire; perechile curățate se numără", () => {
  const z = []; for (let i = 0; i < 12; i++) { const d = new Date(Date.UTC(2026, 10, 2 + i)); if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue; z.push(rand(d.toISOString().slice(0, 10), 40000, 22000, 2000, { raport: { risc: { var95: 900 } } })); }
  z[4] = Object.assign({}, z[4], { valoare: 37000, t212: 19000, salt: 3000 });   /* retragere de 3.000 lei din T212, ppl + result neschimbate */
  const p = CI.probaReala(z, {}); assert.equal(p.x, 0, "retragerea nu e o zi proastă"); assert.equal(p.faraDepuneri, p.n);
  const vechi = CI.probaReala(z.map((r) => { const o = Object.assign({}, r); delete o.t212Rez; return o; }), {}); assert.equal(vechi.x, 1, "fără ppl + result: ca înainte"); assert.equal(vechi.faraDepuneri || 0, 0);
});
await test("H6. colectorul și serverul: tura contului pune castig în raport + rândul zilei cu t212Rez; ruta contZi îl păstrează; frâna pleacă pe Discord o dată pe zi", async () => {
  const tc = citeste("scripts", "lib", "tura-cont.mjs");
  assert.match(tc, /raport\.castig = C\.castigCont\(zl\.zile, \{ valoare: val\.total, t212: val\.t212, t212Rez: val\.t212Rez, complet: val\.complet, citit: acum \}, ziRo\(acum\), trT\)/);   /* + istoricul T212 (I-959) */
  assert.match(tc, /Number\.isFinite\(val\.t212Rez\) \? \{ t212Rez: val\.t212Rez \} : \{\}/); assert.match(tc, /abateri\.push\(\{ cheie: "frana-cont-" \+ fel, m: d\.MesajeColector\.franaContTot\(fel, x, p\) \}\)/);
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const res = await m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=contZi", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.5", "content-type": "application/json" }, body: JSON.stringify({ z: "2026-11-27", valoare: 40000, complet: true, pionex: 15000, t212: 22000, salt: 3000, t212Rez: 2077.2, citit: ACUM }) }), env: ENV });
  assert.equal(res.status, 200, await res.clone().text()); assert.equal(JSON.parse(kv.get("cont:zile"))[0].t212Rez, 2077.2);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /"t212Total","t212Ppl","t212Rez","la"\]/);
});

// ── I. I-953: pauza sezonului cu ieșire clară ──
const SS = ctxLib(["scor-sezon.js"]).ScorSezon;
const cfgS = { start: Date.UTC(2026, 10, 1), obiectiv: { rata: 0.6, serie: 3, net: 50 } };
const pierd = (ore) => [0, 1, 2].map((k) => ({ id: "b" + k, rezultat: -2, inchis: Date.UTC(2026, 10, 27, ore[k], 0) }));
await test("I1. pauza ține până la miezul nopții (ora României) de după a treia pierdere, apoi se încheie; încă o pierdere a doua zi ⇒ pauză din nou", () => {
  const l = pierd([6, 8, 9]);   /* 08:00 … 11:00 ora României */
  const azi = SS.calc(l, cfgS, Date.UTC(2026, 10, 27, 20, 0), "pionex"); assert.equal(azi.pauza, true); assert.equal(azi.pauzaPana, Date.UTC(2026, 10, 27, 22, 0), "00:00 RO = 22:00 UTC iarna");
  const maine = SS.calc(l, cfgS, Date.UTC(2026, 10, 27, 22, 30), "pionex"); assert.equal(maine.pauza, false); assert.equal(maine.pauzaIncheiata, true); assert.equal(maine.serie.n, 3);
  const iar = SS.calc(l.concat([{ id: "b3", rezultat: -1, inchis: Date.UTC(2026, 10, 28, 8, 0) }]), cfgS, Date.UTC(2026, 10, 28, 9, 0), "pionex"); assert.equal(iar.pauza, true);
  /* a treia pierdere la 23:00 RO (21:00 UTC): pauză la 23:50 RO, încheiată la 00:10 RO */
  assert.equal(SS.calc(pierd([6, 8, 21]), cfgS, Date.UTC(2026, 10, 27, 21, 50), "pionex").pauza, true);
  assert.equal(SS.calc(pierd([6, 8, 21]), cfgS, Date.UTC(2026, 10, 27, 22, 10), "pionex").pauza, false);
});
await test("I2. textul cardului și al Discordului spun sfârșitul pauzei", () => {
  const l = pierd([6, 8, 9]), h = SS.html(SS.calc(l, cfgS, Date.UTC(2026, 10, 27, 20, 0), "pionex"), {});
  assert.match(h, /PAUZĂ: 3 pierderi la rând - nu porni alt bot azi \(până la miezul nopții\)/);
  assert.match(SS.html(SS.calc(l, cfgS, Date.UTC(2026, 10, 28, 8, 0), "pionex"), {}), /pauza s-a încheiat la miezul nopții; încă o pierdere și e pauză din nou/);
  assert.match(MC.scorPauza(SS.calc(l, cfgS, Date.UTC(2026, 10, 27, 20, 0), "pionex")).mesaj, /N-aș porni alt bot până la miezul nopții; mâine/);
});

// ── J. I-954: parola aplicației generată ──
const PN = await import(pathToFileURL(path.join(RAD, "scripts", "parola-noua.mjs")).href);
await test("J1. parola nouă: 40 de semne base64url, alta de fiecare dată; rândul APP_API_TOKEN înlocuit cu CRLF-ul și celelalte chei neatinse", () => {
  const a = PN.genereaza(), b = PN.genereaza(); assert.equal(a.length, 40); assert.match(a, /^[A-Za-z0-9_-]{40}$/); assert.notEqual(a, b);
  const t = "APP_API_TOKEN=scurta1234\r\nPIONEX_API_KEY=k\r\nDISCORD_WEBHOOK=w\r\n";
  assert.equal(PN.parolaDin(t), "scurta1234"); assert.equal(PN.cuParola(t, "NOUA"), "APP_API_TOKEN=NOUA\r\nPIONEX_API_KEY=k\r\nDISCORD_WEBHOOK=w\r\n");
  assert.equal(PN.cuParola("PIONEX_API_KEY=k\n", "NOUA"), "PIONEX_API_KEY=k\nAPP_API_TOKEN=NOUA\n"); assert.equal(PN.parolaDin('APP_API_TOKEN="cu-ghilimele"\r\n'), "cu-ghilimele");
  assert.equal(PN.trebuieSchimbata("x".repeat(23)).schimba, true); assert.equal(PN.trebuieSchimbata("x".repeat(24)).schimba, false); assert.equal(PN.trebuieSchimbata(null).schimba, true); assert.equal(PN.trebuieSchimbata("x".repeat(40), true).schimba, true);
});
await test("J2. pe disc: parola de 10 semne ⇒ una nouă, copia veche păstrată, parola-noua.txt scris; a doua rulare n-o mai schimbă", () => {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TEMP || process.env.TMP || "."), "parola-")), fis = path.join(dir, ".dev.vars");
  try {
    fs.writeFileSync(fis, "APP_API_TOKEN=zece12345x\r\nPIONEX_API_KEY=k\r\n");
    const r = PN.ruleaza(fis, { acum: ACUM }); assert.equal(r.schimbat, true); assert.match(r.motiv, /are 10 semne/);
    assert.equal(PN.parolaDin(fs.readFileSync(fis, "utf8")), r.parola); assert.match(fs.readFileSync(fis, "utf8"), /\r\nPIONEX_API_KEY=k\r\n$/);
    assert.equal(fs.readFileSync(r.copie, "utf8"), "APP_API_TOKEN=zece12345x\r\nPIONEX_API_KEY=k\r\n"); assert.ok(fs.readFileSync(r.fisierParola, "utf8").includes(r.parola));
    const r2 = PN.ruleaza(fis, { acum: ACUM + 1000 }); assert.equal(r2.schimbat, false); assert.equal(PN.parolaDin(fs.readFileSync(fis, "utf8")), r.parola);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
await test("J2b (revizia 🟠8). cu colectorul viu (PID existent, bătaie de sub 10 min) parola NU se schimbă - colectorul ar rămâne orb; cu bătaia veche, da", () => {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TEMP || process.env.TMP || "."), "parola-col-")), fis = path.join(dir, ".dev.vars"), dd = path.join(dir, "data");
  try {
    fs.mkdirSync(dd); fs.writeFileSync(fis, "APP_API_TOKEN=zece12345x\r\n"); fs.writeFileSync(path.join(dd, "colector.pid"), process.pid + " " + ACUM);
    const r = PN.ruleaza(fis, { acum: ACUM + 60000 }); assert.equal(r.schimbat, false); assert.match(r.motiv, /colectorul rulează \(PID \d+\)/); assert.equal(PN.parolaDin(fs.readFileSync(fis, "utf8")), "zece12345x");
    const r2 = PN.ruleaza(fis, { acum: ACUM + 11 * 60000 }); assert.equal(r2.schimbat, true, "bătaia de acum 11 minute ⇒ colectorul nu mai merge");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
await test("J3. lansatoarele o cheamă înaintea serverului (VPS: înainte de wrangler dev; .bat la fel); IP-ul din x-forwarded-for bate cf-connecting-ip", () => {
  const ps = citeste("scripts", "vps", "porneste-radar.ps1"), i = ps.indexOf("parola-noua.mjs"), j = ps.indexOf("wrangler@4.137.0 dev");
  assert.ok(i > 0 && j > i, "parola se verifică înainte de pornirea serverului"); assert.equal(ps.charCodeAt(0), 0xfeff, "BOM-ul rămâne (PowerShell 5.1 + diacritice)");
  const bat = citeste("PORNESTE-CRYPTO-RADAR.bat"); assert.ok(bat.indexOf("call node scripts\\parola-noua.mjs .dev.vars") > 0 && bat.indexOf("call node scripts\\parola-noua.mjs") < bat.indexOf("wrangler@4.137.0 dev"));
  assert.match(citeste("functions", "_shared", "auth.js"), /function ipOf\(request\)\{const l=String\(request\.headers\.get\('x-forwarded-for'\)\|\|''\)[^}]*if\(l\.length\)return l\[l\.length-1\];return request\.headers\.get\('cf-connecting-ip'\)/);
});

// ── K. I-952: livrarea fără F5 ──
const swInstal = async (rau) => {
  const h = {}, puse = [], cereri = [], ctx = { self: { addEventListener: (k, f) => { h[k] = f; }, location: { origin: "https://x" }, clients: {}, registration: {} }, caches: { open: async () => ({ put: async (u) => { puse.push(u); } }), keys: async () => [], match: async () => null }, URL, Response, Error, Promise, String, JSON, console,
    fetch: async (u, o) => { cereri.push(o && o.cache); return { ok: !rau.includes(u), status: rau.includes(u) ? 404 : 200 }; } };
  vm.createContext(ctx); vm.runInContext(citeste("public", "sw.js"), ctx);
  let p = null; h.install({ waitUntil: (x) => { p = x; } });
  try { await p; return { ok: true, puse, cereri, n: vm.runInContext("APP_SHELL.length", ctx) }; } catch (e) { return { ok: false, err: e.message, puse, cereri }; }
};
await test("K1. SW-ul se instalează cu revalidare (no-cache ⇒ 304 la fișierele neschimbate) și strict: un fișier lipsă ⇒ instalarea pică, SW-ul vechi rămâne", async () => {
  const bun = await swInstal([]); assert.equal(bun.ok, true); assert.equal(bun.puse.length, bun.n); assert.ok(bun.cereri.every((c) => c === "no-cache"), JSON.stringify([...new Set(bun.cereri)]));
  const rau = await swInstal(["/lib/acasa.js"]); assert.equal(rau.ok, false); assert.match(rau.err, /PWA shell incomplet \(1 din \d+\): \/lib\/acasa\.js 404/);
});
const { cuTablou } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "sursa-app.mjs")).href);
const APPJS = cuTablou(citeste("public", "app.js"), RAD), blocVers = APPJS.slice(APPJS.indexOf("var VERS_VERIF_MS="), APPJS.indexOf("\n", APPJS.indexOf("if(typeof document!==\"undefined\"){document.addEventListener(\"visibilitychange\"")));
await test("K2. versiuneNoua: doar serverul MAI NOU cere actualizarea (în timpul livrării pagina poate fi înaintea serverului)", () => {
  const f = new Function(blocVers.slice(blocVers.indexOf("function versiuneNoua"), blocVers.indexOf("async function verificaVersiuneaServerului")) + "; return versiuneNoua;")();
  assert.equal(f("v100.396", "v100.395"), true); assert.equal(f("v101.1", "v100.999"), true); assert.equal(f("v100.395", "v100.396"), false); assert.equal(f("v100.395", "v100.395"), false); assert.equal(f(null, "v100.395"), false); assert.equal(f("v100.396", "v?"), false);
});
await test("K3. fila deschisă: întreabă serverul (health, fără cache), la versiune nouă cere SW-ul nou și arată bannerul cu versiunea; fila ascunsă nu întreabă", async () => {
  const fac = (vis, ver) => { const ban = { cls: new Set(), t: { textContent: "" } }, st = { cereri: [], update: 0 };
    const ctx = { APP_VERSION: "v100.395", pwaWaitingWorker: null, Date, setInterval: () => 0, setTimeout: () => 0,
      document: { visibilityState: vis, addEventListener() {} }, $: (id) => (id === "pwaUpdateBanner" ? { classList: { add: (c) => ban.cls.add(c) }, querySelector: () => ban.t } : null),
      fetch: async (u, o) => { st.cereri.push([u, o && o.cache]); return { ok: true, json: async () => ({ version: ver }) }; },
      navigator: { serviceWorker: { getRegistration: async () => ({ update: async () => { st.update++; }, waiting: { postMessage() {} } }) } } };
    vm.createContext(ctx); vm.runInContext(blocVers, ctx); return { ctx, ban, st }; };
  let x = fac("visible", "v100.396"); await x.ctx.verificaVersiuneaServerului(true);
  assert.deepEqual(x.st.cereri, [["/api/market?type=health", "no-store"]]); assert.equal(x.st.update, 1); assert.ok(x.ban.cls.has("on")); assert.equal(x.ban.t.textContent, "Este disponibilă versiunea v100.396 (aici: v100.395)"); assert.ok(x.ctx.pwaWaitingWorker);
  x = fac("visible", "v100.395"); await x.ctx.verificaVersiuneaServerului(true); assert.equal(x.st.update, 0); assert.equal(x.ban.cls.size, 0);
  x = fac("hidden", "v100.396"); await x.ctx.verificaVersiuneaServerului(true); assert.equal(x.st.cereri.length, 0);
  x = fac("visible", "v100.396"); await x.ctx.verificaVersiuneaServerului(true); await x.ctx.verificaVersiuneaServerului(false); assert.equal(x.st.cereri.length, 1, "a doua oară sub 10 min ⇒ nu mai întreabă");
});

// ── L. I-948: cât risc mai încape la pornirea unui bot ──
const m32p = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const zileL = (n) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2025, 0, 1) + i * ZI).toISOString().slice(0, 10));
const rapRisc = (n, sam) => { const r = m32p(sam), z = zileL(n), N = z.map(() => gauss(r)), V0 = 2000; return { N, z, rap: { valoare: { total: V0 / 0.02 }, riscAcum: { acum: { var95: V0 } }, risc: { pnl: z.map((d, i) => [d, 1000 * N[i]]) } } }; };
await test("L1. riscul CU botul: același drum ca contul ⇒ exact ×1,5 (long, expunere ½) / ×0,5 (short, acoperire); încape până la expunerea care atinge 4%", () => {
  const { N, z, rap } = rapRisc(400, 7), rc = Object.fromEntries(z.map((d, i) => [d, 0.01 * N[i]]));   /* P&L-ul candidatului = 50.000 × 0,01 × N = jumătate din cont */
  const lg = CI.riscCuCandidat(rap, rc, { expunereLei: 50000, dir: "long" });
  assert.ok(Math.abs(lg.v1 / lg.v0 - 1.5) < 1e-9, JSON.stringify(lg)); assert.equal(lg.metoda, "acum"); assert.equal(lg.n, 400); assert.ok(Math.abs(lg.pct1 - 0.03) < 1e-9);
  assert.ok(Math.abs(lg.incapeLei - 100000) < 10, "4% = de 2 ori riscul de acum ⇒ expunerea care dublează P&L-ul = 100.000 lei; " + lg.incapeLei);
  const sh = CI.riscCuCandidat(rap, rc, { expunereLei: 50000, dir: "short" }); assert.ok(Math.abs(sh.v1 / sh.v0 - 0.5) < 1e-9, JSON.stringify(sh));
});
await test("L2. moneda fără legătură ⇒ între ×1 și ×1,5; peste buget ⇒ „nu încape” cu suma maximă; neutru / puține zile / date lipsă ⇒ nimic inventat", () => {
  const { z, rap } = rapRisc(400, 7), r2 = m32p(99), rc = Object.fromEntries(z.map((d) => [d, 0.01 * gauss(r2)]));
  const ind = CI.riscCuCandidat(rap, rc, { expunereLei: 50000, dir: "long" }); assert.ok(ind.v1 / ind.v0 > 1 && ind.v1 / ind.v0 < 1.5, String(ind.v1 / ind.v0));
  const mare = CI.riscCuCandidat(rap, rc, { expunereLei: 400000, dir: "long" }); assert.ok(mare.pct1 > 0.04 && mare.incapeLei > 0 && mare.incapeLei < 400000, JSON.stringify(mare));
  assert.equal(CI.riscCuCandidat(rap, rc, { expunereLei: 50000, dir: "neutru" }), null); assert.equal(CI.riscCuCandidat(rap, null, { expunereLei: 50000, dir: "long" }), null);
  const scurt = Object.fromEntries(z.slice(-40).map((d) => [d, 0.01])); assert.deepEqual(plain(CI.riscCuCandidat(rap, scurt, { expunereLei: 50000, dir: "long" })), { n: 40, putine: true });
  const pe200 = CI.riscCuCandidat(rap, Object.fromEntries(z.slice(-200).map((d, i) => [d, 0.01 * gauss(r2)])), { expunereLei: 50000, dir: "long" }); assert.equal(pe200.metoda, "istoric"); assert.equal(pe200.putine, false);
});
await test("L3. rândul de sub poartă: „încape” / „nu încape; cel mult ~X USDT la N×” / „deja peste buget”, cu zilele comune; poarta îl cheamă după verdict", () => {
  const src = APPJS.slice(APPJS.indexOf("var grRiscCont={simbol:null"), APPJS.indexOf("\n}", APPJS.indexOf("function grRiscContHtml(f)")) + 2);
  const ctx = { TextRo: globalThis.TextRo, escapeHtml: (s) => String(s) }; vm.createContext(ctx); vm.runInContext(src, ctx);
  const cu = (rez) => { ctx.grRiscCont = { simbol: "ZEC_USDT_PERP", rez, inLucru: false, suma: 100, lev: 3, leiUsd: 4.4 }; return vm.runInContext('grRiscContHtml({ simbol: "ZEC_USDT_PERP" })', ctx); };
  assert.match(cu({ n: 400, v0: 2000, v1: 3000, pct0: 0.02, pct1: 0.03, prag: 0.04, incapeLei: 13200, pesteDeja: false, putine: false }), /acum ~2\.000,0 lei \(2,0%\); cu botul ăsta ~3\.000,0 lei \(3,0%\): încape în bugetul de 4% \(până la ~1\.000,0 USDT la 3×\)\..*Pe 400 de zile comune; expunerea luată la maxim/);
  assert.match(cu({ n: 90, v0: 2000, v1: 5000, pct0: 0.02, pct1: 0.05, prag: 0.04, incapeLei: 6600, pesteDeja: false, putine: true }), /: nu încape în bugetul de 4%; cel mult ~500,0 USDT la 3×\..*Pe 90 de zile comune \(puține: cifra e aproximativă\)/);
  assert.match(cu({ n: 400, v0: 5000, v1: 5600, pct0: 0.05, pct1: 0.056, prag: 0.04, incapeLei: 0, pesteDeja: true, putine: false }), /contul e deja peste bugetul de 4%, deci nu încape nimic în plus/);
  /* pe viu, 27.11: 2.134 lei (9,7%) acum, short ZEC 100 × 3 ⇒ 2.061 lei (9,3%) */
  assert.match(cu({ n: 250, v0: 2134, v1: 2061, pct0: 0.0967, pct1: 0.0934, prag: 0.04, incapeLei: 0, pesteDeja: true, putine: false }), /~2\.061,0 lei \(9,3%\), mai puțin: merge invers față de ce ai deja; contul rămâne peste bugetul de 4%\./);
  assert.match(APPJS, /grRiscContAdu\(f,lev\);   \/\* v100\.396 \(I-948\)/); assert.match(APPJS, /\+\(typeof grRiscContHtml==="function"\?grRiscContHtml\(f\):""\)/);
});

// ── M. I-950: lichidarea și în mișcarea monedei (pragurile fixe rămân până la calibrare) ──
const SBm = ctxLib(["text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js"]).SemnaleBot;
const lichSem = (dist, ps) => { const r = SBm.semafor({ bot: { directie: "long", distantaLichidarePct: dist, pretCurent: 1, gridJos: 0.9, gridSus: 1.1 }, fisa: null, pragStop: ps }); return r.cod === "lichidare" ? r : (r.componente || []).find((m) => m.cod === "lichidare"); };
await test("I-950 M1. aceleași trepte (8% / 15%), cu „~N× ziua proastă a monedei” spus lângă; fără profil ⇒ textul vechi; o frază ≤ 160", () => {
  const a = lichSem(7, { dist: 0.086 }); assert.equal(a.nivel, "iesi"); assert.equal(a.deCe, "Sub 8% nu mai e loc de răbdare: e ~0,8× ziua proastă a monedei (8,6%, depășită într-o zi din 4).");
  const b = lichSem(12, { dist: 0.04 }); assert.equal(b.nivel, "atentie"); assert.equal(b.deCe, "Lichidarea e ~3,0× ziua proastă a monedei (4,0%, depășită într-o zi din 4); cât o mută marja arată calculatorul „Dacă adaug marjă”.");
  assert.equal(lichSem(7, null).deCe, "Sub 8% nu mai e loc de răbdare."); assert.equal(lichSem(12, null).deCe, "Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”.");
  assert.equal(lichSem(20, { dist: 0.3 }), undefined, "peste 15% nicio treaptă, oricât de agitată moneda (pragurile nu s-au mutat)");
  for (const m of [a, b]) { assert.ok(m.deCe.length <= 160, m.deCe.length); assert.equal((m.deCe.match(/\. /g) || []).length, 0); }
  assert.match(citeste("scripts", "colector.mjs"), /pragStop: ProfilMoneda\.pragStop\(profileMoneda\.get\(s\) \|\| null, dir\)/); assert.match(citeste("public", "lib", "tablou-consilier.js"), /SemnaleBot\.semafor\(\{bot:b,fisa:f,pragStop:psT,/);
});

// ── N. I-949: regula LUI în JS, la literă cu motorul Python ──
const RLc = ctxLib(["monede-bot.js", "regula-lui.js"]), RL = RLc.RegulaLui;
await test("N1. paritatea cu motorul Python (ppst_motor + expo_motor + regula_macd_ppst): BTC și ZEC 1 h, 700 de bare, Long + Short / Doar Long / Doar Short - tranzacție cu tranzacție", () => {
  const fx = JSON.parse(citeste("scripts", "proba-v100396-regula.json")); let n = 0;
  for (const s of fx) {
    const bare = s.bare.map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
    for (const dirn of [0, 1, -1]) {
      const js = plain(RL.pe(bare, dirn, 0.6)), py = s.treceri[String(dirn)];
      assert.equal(js.length, py.length, s.sym + " " + dirn + ": " + js.length + " față de " + py.length);
      py.forEach((y, i) => { const x = js[i]; assert.deepEqual([x.bar, x.exit, x.dir, x.cum], [y.bar, y.exit, y.dir, y.cum], s.sym + " " + dirn + " #" + i); assert.ok(Math.abs(x.r - y.r) < 1e-8, s.sym + " #" + i + " r " + x.r + " / " + y.r); n++; });
    }
    const m = RL.expo(bare.map((x) => x.c)).macd.slice(-5); s.macd_ultim.forEach((v, i) => assert.ok(Math.abs(m[i] - v) < 1e-6 * Math.abs(v), "macd " + m[i] + " / " + v));
  }
  assert.ok(n >= 130, "tranzacții comparate: " + n);
});

const TMB = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monede-bot.mjs")).href);
const FX = JSON.parse(citeste("scripts", "proba-v100396-regula.json")), bareFx = (i) => FX[i].bare.map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
const mon = (s, vol, o) => Object.assign({ sym: s + "USDT", s, vol, pionex: true, junk: [] }, o || {});
await test("N2. notarea zilei: primele 5 short / long + martorul = cele mai lichide 5 fără junk, pe Pionex, din afara listelor; o dată pe zi UTC", () => {
  const corp = { monede: [mon("A", 9e8), mon("B", 8e8), mon("C", 7e8, { junk: ["vol/OI"] }), mon("D", 6e8, { pionex: false }), mon("E", 5e8), mon("F", 4e8), mon("G", 3e8), mon("H", 2e8), mon("I", 1e8), mon("Z", 5e7), mon("Y", 4e7)], short: ["Z", "A"], long: ["Y"] };
  const r = TMB.noteazaRegula(null, corp, ACUM); assert.equal(r.zile.length, 1);
  assert.deepEqual(plain(r.zile[0].ctrl.map((x) => x.s)), ["B", "E", "F", "G", "H"], "A e în listă, C junk, D nu e pe Pionex");
  assert.deepEqual(plain(r.zile[0].short), [{ s: "Z", sym: "ZUSDT" }, { s: "A", sym: "AUSDT" }]); assert.equal(TMB.noteazaRegula(r, corp, ACUM + 3 * H).zile.length, 1, "aceeași zi UTC");
});
await test("N3. netul pe tranzacție: intrate în cele 24 h, închise până la 48 h, minus 0,13% și funding-ul (long plătește, short primește); cele rămase deschise se numără", () => {
  const b = bareFx(0), la = b[b.length - 48].t, tr = plain(RL.pe(b, 0, 0.6)), Hh = 3600000;
  const inFer = tr.filter((x) => b[x.bar].t + Hh >= la && b[x.bar].t + Hh < la + 24 * Hh && b[x.exit].t + Hh <= la + 48 * Hh);
  assert.ok(inFer.length >= 1, "fixtura are tranzacții în ultimele 48 h");
  const fund = [{ t: la + 8 * Hh, r: 0.0001 }, { t: la + 16 * Hh, r: 0.0002 }];
  const z = TMB.netZi(b, fund, 0, la, RL);
  assert.equal(z.net.length, inFer.length);
  inFer.forEach((x, i) => { const te = b[x.bar].t + Hh, tx = b[x.exit].t + Hh, f = fund.filter((y) => y.t > te && y.t <= tx).reduce((a, y) => a + y.r, 0) * 100 * x.dir; assert.ok(Math.abs(z.net[i] - (x.r - 0.13 - f)) < 1e-12); });
  const des = RL.pe(b, 0, 0.6).deschisa; assert.equal(z.deschise, des && b[des.bar].t + Hh >= la ? 1 : 0);
});
await test("N4. judecata la 48 h pe barele Binance (simulate cu BTC real): lista Doar Short / Long față de martor; o monedă lipsă ⇒ reîncerc; peste toleranță ⇒ nejudecată", async () => {
  const b = FX[0].bare, pana = b[b.length - 1][0] + 3600000, la = pana - 48 * 3600000, cereri = [];
  const binance = async (u) => { cereri.push(u); if (/symbol=LIPSAUSDT/.test(u)) return null; return /klines/.test(u) ? b.map(([t, o, h, l, c]) => [t, String(o), String(h), String(l), String(c)]) : []; };
  const zi = { zi: "2026-11-25", la, short: [{ s: "A", sym: "AUSDT" }], long: [{ s: "B", sym: "BUSDT" }], ctrl: ["C", "D", "E", "F", "G"].map((s) => ({ s, sym: s + "USDT" })) };
  let r = await TMB.judecaRegula({ zile: [zi], judecate: [] }, { binance, RegulaLui: RL }, pana);
  assert.equal(r.zile.length, 0); const j = r.judecate[0]; assert.ok(j.short && j.long, JSON.stringify(j));
  const exp = (dirn) => TMB.netZi(bareFx(0), [], dirn, la, RL).net; const m = (v) => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : null);
  assert.equal(j.short.nL, exp(-1).length); assert.equal(j.short.nC, 5 * exp(-1).length); assert.ok(Math.abs(j.short.mL - m(exp(-1))) < 1e-12 || (j.short.mL === null && !exp(-1).length));
  assert.ok(cereri.some((u) => /interval=1h&endTime=\d+&limit=600/.test(u)) && cereri.some((u) => /fundingRate\?symbol=AUSDT&startTime=\d+&endTime=\d+/.test(u)));
  const ziL = Object.assign({}, zi, { short: [{ s: "LIPSA", sym: "LIPSAUSDT" }] });
  r = await TMB.judecaRegula({ zile: [ziL], judecate: [] }, { binance, RegulaLui: RL }, pana + 60000); assert.equal(r.zile.length, 1, "o monedă n-a venit ⇒ ziua se reia");
  r = await TMB.judecaRegula({ zile: [ziL], judecate: [] }, { binance, RegulaLui: RL }, pana + 5.5 * 3600000); assert.equal(r.judecate[0].short.lipsa, 1, "la capătul toleranței se judecă cu ce a venit");
  r = await TMB.judecaRegula({ zile: [zi], judecate: [] }, { binance, RegulaLui: RL }, pana + 7 * 3600000); assert.match(r.judecate[0].nejudecat, /n-a mers la 48 h/);
});
await test("N5. verdictul: abia la 26 de ferestre la ≥ 2 zile; „merge” cere lista pe plus ȘI peste martor; înghețat; ruta și fișa îl duc", async () => {
  const J = (n, f) => Array.from({ length: n }, (_, i) => ({ zi: new Date(Date.UTC(2026, 11, 1) + i * ZI).toISOString().slice(0, 10), short: f(i), long: null }));
  let r = { judecate: J(51, (i) => ({ nL: 3, mL: 0.2 + (i % 5) * 0.05, nC: 15, mC: -0.1 })) }, s = TMB.rezumatRegula(r);
  assert.equal(s.short.ferestre, 26, "51 de zile la rând ⇒ 26 de ferestre la 2 zile"); assert.equal(s.short.verdict, "merge"); assert.ok(r.verdict.short);
  r.judecate = J(51, () => ({ nL: 3, mL: -0.5, nC: 15, mC: -0.1 })); assert.equal(TMB.rezumatRegula(r).short.verdict, "merge", "înghețat");
  assert.equal(TMB.rezumatRegula({ judecate: J(51, (i) => ({ nL: 3, mL: -0.2 + (i % 3) * 0.01, nC: 15, mC: -0.4 })) }).short.verdict, "ajuta-dar-pierde");
  assert.equal(TMB.rezumatRegula({ judecate: J(51, (i) => ({ nL: 3, mL: -0.5 + (i % 3) * 0.01, nC: 15, mC: -0.1 })) }).short.verdict, "nu-ajuta");
  assert.equal(TMB.rezumatRegula({ judecate: J(49, () => ({ nL: 3, mL: 0.3, nC: 15, mC: -0.1 })) }).short.verdict, "se-aduna", "25 de ferestre");
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const mm = await import("../functions/api/istoric-bot.js"), corp = { la: ACUM, n: 1, nPionex: 1, monede: [{ sym: "ZECUSDT", s: "ZEC", pret: 400, vol: 2e8, oi: 1e8, pionex: true, junk: [] }], short: ["ZEC"], long: [], revenire: [], range: [], urmarire: { short: { zile: 0, ferestre: 0 }, long: { zile: 0, ferestre: 0 } }, regula: s };
  const res = await mm.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=monedeBot", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.5", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  assert.equal(res.status, 200, await res.clone().text()); const g = JSON.parse(kv.get("monede-bot")).regula; assert.equal(g.short.verdict, "merge"); assert.equal(g.short.ferestre, 26);
  const se = ctxLib(["latime.js", "reveniri.js", "monede-bot.js", "sugestii-ecran.js"], { escapeHtml: (x) => String(x), sugStare: { panda: {} }, getJSON: async () => ({}), navTo() {}, setTimeout, clearTimeout, window: null });
  assert.match(se.sugMbotRegula(g), /Doar Short: 26 de ferestre din 26, lista \+0,3% pe tranzacție \(78 de tranzacții\), martorul −0,1% · verdict: lista e pe plus și peste martor \(înghețat\)/);
  assert.match(se.sugMbotRegula(null), /pornește la prima tură de după livrare/);
  assert.match(citeste("scripts", "colector.mjs"), /MonedeBot, RegulaLui, boti,/);
});

// ── O. valul 3 (🟡 din audit) ──
await test("O1. starea alertelor și cozile: scrierea cu fsync; un fișier stricat la pornire ⇒ păstrat ca .stricat-…, se ia copia .bak", () => {
  const col = citeste("scripts", "colector.mjs"), src = col.slice(col.indexOf("function scrieAtomic("), col.indexOf("// v101.215 (Radar v100.396, I-951): de când refuză"));
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TEMP || process.env.TMP || "."), "stare-")), jurnale = [];
  try {
    const f = new Function("fs", "path", "jurnal", src + "; return { scrieAtomic, copieBak, citesteCuBak };")(fs, path, (...a) => jurnale.push(a.join(" ")));
    const fis = path.join(dir, "alerte-stare.json");
    f.scrieAtomic(fis, { b1: { lich: 1 } }); f.copieBak(fis); assert.deepEqual(JSON.parse(fs.readFileSync(fis + ".bak", "utf8")), { b1: { lich: 1 } });
    fs.writeFileSync(fis, '{"b1": {"lich"');   /* tăiat de o cădere de curent */
    assert.deepEqual(f.citesteCuBak(fis, {}), { b1: { lich: 1 } }); assert.ok(fs.readdirSync(dir).some((x) => /\.stricat-\d+$/.test(x))); assert.ok(jurnale.some((x) => /STRICAT la pornire: alerte-stare\.json/.test(x)));
    assert.deepEqual(f.citesteCuBak(path.join(dir, "lipsa.json"), []), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.match(col, /function scrieAtomic\(fis, obj\) \{[^}]*fs\.fsyncSync\(fd\)/); assert.match(col, /let stareAlerte = citesteCuBak\(STARE_FIS, \{\}\)/); assert.match(col, /let coadaDiscord = citesteCuBak\(COADA_FIS, \[\]\)/);
  assert.match(col, /scrieAtomic\(COADA_FIS, coadaDiscord\); copieBak\(COADA_FIS\);/); assert.match(col, /if \(Date\.now\(\) - stareBakLa > 600000\) \{ copieBak\(STARE_FIS\);/);
});
await test("O2. un bot fără monedă nu mai cere „-_USDT_PERP” (profilul și rețeaua); poza zilei nu se scrie cu boții necitiți (se reia până la 13:00)", async () => {
  const col = citeste("scripts", "colector.mjs"), re = new RegExp(col.match(/var SIMBOL_PERP_BUN = \/(.*?)\/;/)[1]);
  assert.equal(re.test("-_USDT_PERP"), false); assert.equal(re.test("_USDT_PERP"), false); assert.equal(re.test("ZEC_USDT_PERP"), true); assert.equal(re.test("1000PEPE_USDT_PERP"), true);
  const TP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-piata.mjs")).href);
  const lume = (bo) => { const trimise = [], jurn = []; return { trimise, jurn, d: { jurnal: (...a) => jurn.push(a.join(" ")), trimite: async (u, c) => { trimise.push(c); }, cere: async (u) => { if (/bot-orders/.test(u)) { if (bo === "rau") throw new Error("timeout"); return bo; } return { cash: { total: 22000, ppl: -9000, result: 11000 } }; } } }; };
  const la = (h, m) => Date.UTC(2026, 10, 27, h - 2, m);   /* ora României iarna */
  let st = { ult: { fg: 40 } }, x = lume("rau"); await TP.pozaZilei(x.d, st, la(9, 30)); assert.equal(x.trimise.length, 0); assert.equal(st.pozaZi, undefined); assert.match(x.jurn.join("|"), /boții n-au venit, reîncerc/);
  x = lume({ bots: [{ id: 7, activ: true, profitTotal: 12.34 }] }); await TP.pozaZilei(x.d, st, la(9, 40)); assert.deepEqual(plain(x.trimise[0].instantaneu.botiPeId), { 7: 12.34 }); assert.equal(st.pozaZi, "2026-11-27");
  st = { ult: { fg: 40 } }; x = lume("rau"); await TP.pozaZilei(x.d, st, la(13, 10)); assert.equal(x.trimise.length, 1); assert.equal("botiPeId" in plain(x.trimise[0].instantaneu), false, "după 13:00: fără boți, nu {}"); assert.equal(x.trimise[0].instantaneu.t212Rez, 2000);
});

await test("O3. copia KV: SQLite-ul viu (WAL) luat cu VACUUM INTO + integrity_check, fără -wal / -shm; bloburile copiate; o bază care nu se poate lua ⇒ copiată brut și SPUSĂ", async () => {
  const { DatabaseSync } = await import("node:sqlite"), CP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "copie.mjs")).href);
  const t = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TEMP || process.env.TMP || "."), "copiekv-")), src = path.join(t, "kv"), dst = path.join(t, "copii");
  let viu = null;
  try {
    fs.mkdirSync(path.join(src, "miniflare-KVNamespaceObject"), { recursive: true }); fs.mkdirSync(path.join(src, "ISTORIC", "blobs"), { recursive: true });
    fs.writeFileSync(path.join(src, "ISTORIC", "blobs", "b1"), "valoarea 1");
    viu = new DatabaseSync(path.join(src, "miniflare-KVNamespaceObject", "kv.sqlite")); viu.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE _mf_entries (key TEXT PRIMARY KEY, blob_id TEXT)");
    for (let i = 0; i < 50; i++) viu.prepare("INSERT INTO _mf_entries VALUES (?, ?)").run("k" + i, "b1");   /* rămân în -wal (checkpoint oprit), conexiunea deschisă = „wrangler scrie” */
    assert.ok(fs.existsSync(path.join(src, "miniflare-KVNamespaceObject", "kv.sqlite-wal")));
    const r = CP.faCopie({ sursa: src, dest: dst, zi: "2026-11-27" }); assert.equal(r.facut, true); assert.deepEqual(plain(r.neverificate), []);
    const cop = path.join(r.tinta, "miniflare-KVNamespaceObject"); assert.deepEqual(fs.readdirSync(cop).sort(), ["kv.sqlite"], "fără -wal / -shm");
    const c = new DatabaseSync(path.join(cop, "kv.sqlite"), { readOnly: true }); assert.equal(c.prepare("SELECT count(*) AS n FROM _mf_entries").get().n, 50, "rândurile din WAL sunt în copie"); c.close();
    assert.equal(fs.readFileSync(path.join(r.tinta, "ISTORIC", "blobs", "b1"), "utf8"), "valoarea 1");
    fs.writeFileSync(path.join(src, "rau.sqlite"), "x"); const r2 = CP.faCopie({ sursa: src, dest: dst, zi: "2026-11-28" });
    assert.equal(r2.facut, true); assert.equal(r2.neverificate.length, 1); assert.match(r2.neverificate[0], /^rau\.sqlite: VACUUM INTO n-a mers .*copiată brut$/); assert.equal(fs.readFileSync(path.join(r2.tinta, "rau.sqlite"), "utf8"), "x");
  } finally { try { viu && viu.close(); } catch {} fs.rmSync(t, { recursive: true, force: true }); }
});

await test("O4. textele: „Server” = răspunsul real (nu „Engine READY” fix); T212 căzut spus (nu „Aduc contul…”); „5 minute”; „2,3%”; mii cu punct în USDT; funding cu o zecimală; rândul zilei parțial rescris până la 07:00; monedele spot în valoare", () => {
  const idx = citeste("public", "index.html"); assert.doesNotMatch(idx, /<span class="small">Engine<\/span><b class="good">READY<\/b>/); assert.match(idx, /<b id="sideServer" class="acMut"/);
  assert.match(APPJS, /sv\(v\?v:"nu răspunde",v\?"good":"bad"\)/);
  assert.match(citeste("public", "lib", "acasa-ecran.js"), /t212\.eroare && !t212\.inLucru \? '<p class="acMut">⚠ Trading 212 n-a răspuns \(/);
  const TB = ctxLib(["text-ro.js", "tablou-bot.js"]).TabloBot, tb = citeste("public", "lib", "tablou-bot.js");
  assert.match(tb, /"Botul are " \+ cate\(Math\.round\(m\.varstaBotMin\), "minut", "minute"\)/); assert.doesNotMatch(tb, /m\.lichidare\.valoare\.toFixed\(1\)/);
  const TE = ctxLib(["text-ro.js", "grid-calcul.js", "tablou-extra.js"]); assert.match(citeste("public", "lib", "tablou-extra.js"), /TextRo\.num\(Math\.abs\(v\), z\) : Math\.abs\(v\)\.toFixed\(z\)\.replace\("\.", ","\)\) \+ " USDT"/);
  assert.match(citeste("public", "lib", "sugestii-ecran.js"), /sugPctZ\(x\.f7, Math\.abs\(x\.f7 \* 100\) >= 0\.095 \? 1 : 2\)/);
  const tc = citeste("scripts", "lib", "tura-cont.mjs"); assert.match(tc, /if \(okZ && dz\.marcheazaDupa\) st\.ziValoare = z; else if \(okZ\) st\.ziPartial = z;/); assert.match(tc, /lipsuri\.push\("Pionex spot: "/); assert.match(tc, /type=pionex_tickers&market=SPOT/);
  assert.ok(TB && TE);
});
await test("O4b (revizia 🟠5). rândul zilei pe comportament: parțial la 03:00 ⇒ scris, rescris la 05:00; la 09:00 NU se rescrie (rămâne închiderea de ieri), ziua marcată; complet ⇒ marcat la prima scriere", async () => {
  const TC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-cont.mjs")).href), z = "2026-11-27", st = {};
  let dz = TC.deciziaZilei(st, z, false, 3); assert.deepEqual(plain(dz), { scrie: true, marcheaza: false, marcheazaDupa: false }); st.ziPartial = z;
  dz = TC.deciziaZilei(st, z, false, 5); assert.equal(dz.scrie, true, "până la 07:00 parțialul se poate rescrie");
  dz = TC.deciziaZilei(st, z, true, 9); assert.deepEqual(plain(dz), { scrie: false, marcheaza: true }, "la 09:00, chiar complet, nu suprascrie închiderea de noapte");
  assert.deepEqual(plain(TC.deciziaZilei({}, z, false, 10)), { scrie: true, marcheaza: false, marcheazaDupa: true }, "prima scriere a zilei, la orice oră");
  assert.equal(TC.deciziaZilei({}, z, true, 1).marcheazaDupa, true); assert.equal(TC.deciziaZilei({ ziValoare: z }, z, true, 1).scrie, false);
});
await test("O5. prețul viu: fila ascunsă închide socketul și ține minte simbolul; la întoarcere pornește iar; pornirea cu fila ascunsă nu deschide nimic", () => {
  assert.match(APPJS, /if\(document\.visibilityState==="hidden"\)\{if\(pvStare\.simbol\)\{pvAscunsSimbol=pvStare\.simbol;pvOpreste\(\)\}\}/);
  assert.match(APPJS, /else if\(pvAscunsSimbol\)\{var s=pvAscunsSimbol;pvAscunsSimbol=null;pvPorneste\(s\)\}/);
  assert.match(APPJS, /function pvPorneste\(simbol\)\{\r?\n  if\(typeof PretViu==="undefined"\|\|typeof WebSocket==="undefined"\)return;\r?\n  if\(typeof document!=="undefined"&&document\.visibilityState==="hidden"\)\{pvAscunsSimbol=simbol;return\}/);
});
await test("O6. contorul de deschideri (I-955): pe pagină și zi, 14 zile, local; urcat o dată la 6 ore; ruta îl ține pe aparat (cel mult 6)", async () => {
  const src = APPJS.slice(APPJS.indexOf('var DESCHIDERI_KEY="radarDeschideri";'), APPJS.indexOf("function navTo(id,load=false){"));
  const ls = new Map(), trimise = [], ctx = { localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, v) }, apiFetch: async (u, o) => { trimise.push([u, JSON.parse(o.body)]); return {}; }, Date, Math, JSON, Object, String, Number };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  ctx.deschideriNoteaza("acasa"); ctx.deschideriNoteaza("acasa"); ctx.deschideriNoteaza("tabloubot"); ctx.deschideriNoteaza("../rau");
  const o = JSON.parse(ls.get("radarDeschideri")), z = new Date().toISOString().slice(0, 10);
  assert.deepEqual(o.zile[z], { acasa: 2, tabloubot: 1 }); assert.match(o.aparat, /^[a-z0-9]{12}$/); assert.equal(trimise.length, 1, "o dată la 6 ore");
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const mm = await import("../functions/api/istoric-bot.js"), H0 = { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.5", "content-type": "application/json" };
  const post = (b) => mm.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=deschideri", { method: "POST", headers: H0, body: JSON.stringify(b) }), env: ENV });
  assert.equal((await post({ aparat: o.aparat, zile: o.zile })).status, 200); assert.equal((await post({ aparat: "x", zile: {} })).status, 400);
  assert.deepEqual(JSON.parse(kv.get("deschideri"))[o.aparat].zile[z], { acasa: 2, tabloubot: 1 });
  const g = await mm.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=deschideri", { headers: H0 }), env: ENV }); assert.equal((await g.json()).deschideri[o.aparat].zile[z].acasa, 2);
  assert.match(APPJS, /function navTo\(id,load=false\)\{\r?\n deschideriNoteaza\(id\);/);
});

await test("O7. câștigul T212 pe an ia și pozițiile ținute de peste 420 de zile; fraza spune ce e realizat și ce nu", () => {
  assert.match(citeste("scripts", "lib", "tura-cont.mjs"), /\.map\(\(u\) => u\.ticker\)\.concat\(\(poz \|\| \[\]\)\.map\(\(p\) => p && p\.ticker\)\.filter\(Boolean\)\)/);
  const ce = ctxLib(["text-ro.js", "cont-intreg.js", "cont-ecran.js"], { escapeHtml: (s) => String(s) });
  const t = ce.ciFraza({ valoare: { total: 22072, complet: true }, bani: { tot: -1200, boti: { net: -1500 }, t212: { pnl: 300 } }, riscAcum: { acum: { var95: 2134 } } }).fr;
  assert.match(t, /boții −1\.500 lei \(cei închiși, după comisioane și funding\), Trading 212 \+300 lei \(închise și deschise, la prețul de azi\)\./);
});

await test("O8. urmăririle (Salt, orizont 20 de ședințe ≈ un bloc de 28 de zile): blocurile vecine corelate lărgesc intervalul (Newey-West, un decalaj); corelația negativă nu-l strânge", () => {
  const SA = ctxLib(["salt.js"], { root: null }).Salt || ctxLib(["salt.js"]).Salt; assert.ok(SA && SA.statBlocuri, "Salt.statBlocuri");
  const B = 28 * ZI, t0 = Date.UTC(2025, 0, 1), caz = (f) => { const l = []; for (let k = 0; k < 20; k++) for (let j = 0; j < 4; j++) l.push({ t: t0 + k * B + j * ZI, x: f(k) }); return l; };
  const lin = SA.statBlocuri(caz((k) => (k < 10 ? -0.01 : 0.02))), alt = SA.statBlocuri(caz((k) => (k % 2 ? 0.02 : -0.01)));
  /* aceeași medie și aceleași valori; în „lin” zece blocuri pe minus, apoi zece pe plus (vecinii corelați), în „alt” alternează (corelație negativă) */
  assert.ok(Math.abs(lin.medie - alt.medie) < 1e-12); assert.ok(lin.vecini > 0 && alt.vecini < 0, lin.vecini + " / " + alt.vecini);
  const lat = (r) => r.hi - r.lo; assert.ok(lat(lin) > lat(alt) * 1.3, lat(lin) + " / " + lat(alt));
  const naiv = Math.sqrt(20 * 4 * 4 * 0.015 * 0.015 * 20 / 19) / 80 * 2 * 2.09; assert.ok(Math.abs(lat(alt) - naiv) / naiv < 0.05, "fără vecini corelați = intervalul de dinainte (" + lat(alt) + " / " + naiv + ")");
});

// ── P. valul 4 (el, 27.11: „fa tot plus idei”) ──
const OBp = ctxLib(["text-ro.js", "grid-calcul.js", "grid-proba.js", "jurnal-trade.js", "obiceiuri.js"]).Obiceiuri;
const fisaP = { simbol: "ZEC_USDT_PERP", setare: { levierSigur: 4, suma: 100 }, dir: "short", directie: null };
await test("P1 (I-956). Poarta judecă și frâna CONTULUI: trasă ⇒ ✗ cu fraza de pe Acasă; știută și liberă ⇒ ✓; nestiută ⇒ „?” (nu ✓); frâna boților se cheamă „Frâna boților”", () => {
  const r = (fc) => OBp.poarta({ fisa: fisaP, trades: [], acum: ACUM, dir: "short", levier: 2, plan: null, franaCont: fc }).reguli.find((x) => x.cod === "frana-cont");
  const t = r({ text: "Aș reduce expunerea până sub 4% pe zi (prag ales, de prudență): o zi proastă îți ia ~9,7% din cont.", stiut: true });
  assert.equal(t.ok, false); assert.equal(t.text, "Frâna contului: aș reduce expunerea până sub 4% pe zi (prag ales, de prudență): o zi proastă îți ia ~9,7% din cont.");
  assert.equal(r({ text: "", stiut: true }).ok, true); const n = r({ text: "", stiut: false }); assert.equal(n.necunoscut, true); assert.match(n.text, /încă n-o știu/);
  assert.equal(OBp.poarta({ fisa: fisaP, trades: [], acum: ACUM, dir: "short", levier: 2 }).reguli.some((x) => x.cod === "frana-cont"), false, "fără date ⇒ fără rândul nou (paginile vechi)");
  const fb = OBp.frana({ trades: [], deschise: [], acum: ACUM }); assert.match(fb.text, /^Frâna boților: azi /);
  assert.equal(MC.frana({ text: "Frâna boților: gata pe azi — azi −23,4 USDT. N-aș mai porni boți azi; …" }).titlu, "🛑 Frâna boților: gata pe azi");
  assert.match(APPJS, /franaCont:grFrCont,numeBot:/); assert.match(APPJS, /\(r\.necunoscut\?"\? ":r\.ok\?"✓ ":"✗ "\)/);
});
await test("P2 (I-957). planul sub 4%: taie întâi poziția care scade riscul cel mai mult pe leu (cea agitată), câte o jumătate, până sub prag; sub prag ⇒ nimic de tăiat; textele (pagină + Discord)", () => {
  /* contul = A (calmă, 10.000 lei) + B (agitată, 5.000 lei, aceleași zile); P&L-ul contului = suma lor; riscul de acum = cel istoric (raport 1) */
  let s = 777; const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()), zl = zileL(120), rA = {}, rB = {}, pnl = [];
  for (const z of zl) { rA[z] = 0.01 * g(); rB[z] = 0.06 * g(); pnl.push([z, 10000 * rA[z] + 5000 * rB[z]]); }
  const h = CI.varEs(pnl.map((x) => x[1]), 0.95).var, rap = { valoare: { total: h / 0.08 }, risc: { pnl, var95: h }, serii: { "T:A": rA, "T:B": rB }, expuneri: [{ cheie: "T:A", nume: "A", lei: 10000 }, { cheie: "T:B", nume: "B", lei: 5000 }] };
  const p = CI.planSub4(rap); assert.ok(Math.abs(p.pct0 - 0.08) < 1e-9); assert.equal(p.pePozitii[0].cheie, "T:B", "întâi cea agitată"); assert.equal(p.ajunge, true); assert.ok(p.pct <= 0.04 + 1e-12);
  assert.ok(p.pasi.length >= 1 && p.pasi.every((x, i) => i === 0 || x.v <= p.pasi[i - 1].v), "fiecare pas scade riscul");
  assert.ok(p.pasi.length === 1 || p.pasi[p.pasi.length - 2].pct > 0.04, "se oprește la primul pas sub prag (nu taie mai mult decât trebuie)");
  assert.equal(CI.planSub4(Object.assign({}, rap, { valoare: { total: h / 0.03 } })).pasi.length, 0, "sub prag ⇒ niciun pas");
  assert.deepEqual(plain(CI.planSub4(Object.assign({}, rap, { risc: { pnl: pnl.slice(-40), var95: h } }))), { n: 40, putine: true });
  const ce = ctxLib(["text-ro.js", "cont-intreg.js", "cont-ecran.js"], { escapeHtml: (x) => String(x) });
  assert.match(ce.ciPlanHtml(rap), /Ce tai ca să cobori sub 4 % pe zi.*Ca să cobori sub 4 % pe zi: B \(~5\.000 lei din poziții\)/s);   /* Contul întreg scrie „4 %” (ciPctF) */
  const m = MC.planRisc({ pct0: 0.097, prag: 0.04, ajunge: true, pct: 0.039, pePozitii: [{ nume: "BE", parte: 1, lei: 1041 }, { nume: "MU", parte: 0.5, lei: 2003 }] });
  assert.equal(m.titlu, "Contul: o zi proastă ~9,7% (bugetul 4%)"); assert.match(m.mesaj, /^Sub 4% cobori tăind BE, MU \(jumătate\) \(~3\.044,0 lei\), cu riscul la ~3,9%\.\n👉 N-aș porni nimic nou/);
  assert.equal(POL.mereuPeDiscord("frana-cont-risc", m), true);
  assert.match(citeste("scripts", "lib", "tura-cont.mjs"), /if \(pr4 && pr4\.pct0 > pr4\.prag && val\.complet && d\.MesajeColector\.planRisc\) abateri\.push\(\{ cheie: "frana-cont-risc", m: d\.MesajeColector\.planRisc\(pr4\) \}\)/);
});
await test("P3 (I-958). boții de semnal pe viu: tranzacția = realizatul după ieșire − cel de la intrare; verdict abia la 30 (IC sub 0 ⇒ „opreste”); ruta, cartela, Discord", async () => {
  const b0 = sem({ directie: null, pozitie: 0, profitTotal: -0.5, investit: 50 });
  let r = BS.schimbare(null, b0, ACUM); r = BS.schimbare(r.ref, sem({ directie: "long", pozitie: 0.064, profitTotal: -0.5, investit: 50 }), ACUM + 60000); assert.equal(r.ev, "intrat"); assert.equal(BS.tranzactie(r, b0, ACUM), null, "intrarea nu închide nimic");
  r = BS.schimbare(r.ref, sem({ directie: "long", pozitie: 0.064, profitTotal: -0.6, investit: 50 }), ACUM + 90000); assert.equal(r.ev, null, "o citire fără eveniment (funding-ul mută realizatul) ⇒ pr se mută, pr0 rămâne");
  const bI = sem({ directie: null, pozitie: 0, profitTotal: -0.9, investit: 50 }); r = BS.schimbare(r.ref, bI, ACUM + 120000); assert.equal(r.ev, "iesit");
  const t = BS.tranzactie(r, bI, ACUM + 120000); assert.ok(Math.abs(t.net + 0.4) < 1e-9 && Math.abs(t.pct + 0.008) < 1e-9 && t.d === "long", JSON.stringify(t));
  const l = Array.from({ length: 29 }, (_, i) => ({ net: -0.15, pus: 50, pct: -0.003 + (i % 3) * 0.0005 }));
  assert.equal(BS.rezumatTranzactii(l).verdict, "se-aduna"); const rz = BS.rezumatTranzactii(l.concat([{ net: -0.1, pus: 50, pct: -0.002 }])); assert.equal(rz.n, 30); assert.equal(rz.verdict, "opreste");
  assert.equal(BS.rezumatTranzactii(Array.from({ length: 30 }, (_, i) => ({ pct: (i % 2 ? 1 : -1) * 0.004 }))).verdict, "n-am-aflat");
  assert.match(BS.textTranzactii(rz), /^Boții de semnal, pe viu: 30 de tranzacții închise, media −0,3% pe tranzacție din suma pusă \(.+\), în total −4,4 USDT · verdict: pierde pe viu - aș opri boții de semnal · Proba 13 aștepta ~−0,2%\.$/);
  assert.match(BS.textTranzactii(null), /încă nicio tranzacție închisă/);
  const mv = MC.verdictSemnale(rz); assert.equal(mv.nivel, "critic"); assert.equal(mv.titlu, "Boții de semnal, 30 de tranzacții: pierd"); assert.match(mv.mesaj, /\n👉 Aș opri boții de semnal/);
  const col = citeste("scripts", "colector.mjs"); assert.match(col, /const tr = BotSemnal\.tranzactie\(r, b, acum\); if \(tr\)/); assert.match(col, /if \(m\.semnaleVerdict\) \{ rz\.verdict = m\.semnaleVerdict\.verdict;/); assert.match(col, /trimiteAlerta\(MesajeColector\.verdictSemnale\(rz\), null, "verdict-semnale"\)/);
  assert.equal(POL.politicaNoapte({ nivel: "atentie", titlu: "x" }, "verdict-semnale", Date.UTC(2026, 10, 27, 23, 30)).noapte, undefined, "verdictul pleacă și noaptea"); assert.equal(POL.mereuPeDiscord("verdict-semnale", {}), true);
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const mm = await import("../functions/api/istoric-bot.js"), H0 = { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.5", "content-type": "application/json" };
  const res = await mm.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=semnaleRegistru", { method: "POST", headers: H0, body: JSON.stringify({ rezumat: Object.assign({ la: ACUM }, rz), ultime: [t] }) }), env: ENV });
  assert.equal(res.status, 200); const g = JSON.parse(kv.get("semnale:registru")); assert.equal(g.rezumat.verdict, "opreste"); assert.equal(g.ultime[0].d, "long");
  assert.match(BS.cardHtml(sem(), (x) => String(x), { acum: ACUM, registru: g }), /class="tbSub bsmReg">Boții de semnal, pe viu: 30 de tranzacții închise/);
  assert.doesNotMatch(BS.cardHtml(sem(), (x) => String(x), { acum: ACUM }), /bsmReg/, "fără registru adus ⇒ fără rând");
});
await test("P4 (I-959). istoricul depunerilor T212: rândul vechi fără ppl + result se curăță cu el (o depunere de 2.000 nu mai e „câștig”); acoperirea lipsă ⇒ null; colectorul pe pagini, cu oprire", async () => {
  const t0 = Date.parse("2026-11-20T06:00:00Z"), t1 = Date.parse("2026-11-21T06:00:00Z"), tr = { pana: t0 - 86400000, la: t1, items: [{ t: t0 + 3600000, s: 2000 }, { t: t1 + 1000, s: 500 }] };
  assert.equal(CI.fluxDinTranzactii(tr, t0, t1), 2000, "doar ce cade între cele două citiri");
  assert.equal(CI.fluxDinTranzactii({ pana: t0 + 1, la: t1, items: tr.items }, t0, t1), null, "istoricul nu ajunge la t0 ⇒ nu se știe");
  /* revizia valului 4 (🟠): istoricul citit ÎNAINTE de t1 nu vede o retragere de după ⇒ nu se știe (nu „pierdere”) */
  assert.equal(CI.fluxDinTranzactii(Object.assign({}, tr, { la: t1 - 3600000 }), t0, t1), null, "citit înainte de t1 ⇒ nu se știe");
  /* I-969: cu istoricul care acoperă, el bate ppl + result (comisionul de conversie rămâne pierdere): ppl + result spunea 2.050 „depuși” (2.000 + 50 de comision luat drept retragere) */
  const aR = { valoare: 20000, t212: 15000, t212Rez: 100, citit: t0 }, bR = { valoare: 22050, t212: 17050, t212Rez: 150, citit: t1 };
  assert.equal(CI.schimbareFaraDepuneri(aR, bR).din, "ppl+result"); const sR = CI.schimbareFaraDepuneri(aR, bR, tr); assert.equal(sR.din, "tranzactii"); assert.equal(sR.flux, 2000); assert.equal(sR.lei, 50);
  const a = { valoare: 20000, t212: 15000, citit: t0 }, b = { valoare: 22100, t212: 17100, citit: t1 };
  assert.equal(CI.schimbareFaraDepuneri(a, b), null, "fără ppl + result și fără istoric ⇒ ca înainte");
  const s = CI.schimbareFaraDepuneri(a, b, tr); assert.equal(s.lei, 100); assert.equal(s.flux, 2000); assert.equal(s.din, "tranzactii");
  const c = CI.castigCont([{ z: "2026-11-20", valoare: 20000, t212: 15000, citit: t0 }], { valoare: 22100, t212: 17100, complet: true, citit: t1 }, "2026-11-20", tr);
  assert.equal(c.zi.lei, 100); assert.equal(c.zi.din, "tranzactii");
  /* colectorul: 3 pagini (cursor), apoi capătul istoriei ⇒ acoperit tot; a doua zi se oprește la citirea de ieri */
  const AZ = 5.1e12, Z = 86400000;   /* paginile acoperă 10 / 20 / 30 de zile în urmă (sub limita de 420) */
  const pag = [{ bani: [{ t: AZ - 2 * Z, s: 100, moneda: "RON" }, { t: AZ - 5 * Z, s: 7, moneda: "EUR" }], celMaiVechi: AZ - 10 * Z, cursor: "aa-1", time: "2026-11-01T00:00:00.000Z" }, { bani: [{ t: AZ - 15 * Z, s: -50 }], celMaiVechi: AZ - 20 * Z, cursor: "aa-2", time: "2026-10-01T00:00:00.000Z" }, { bani: [], celMaiVechi: AZ - 30 * Z, cursor: null }];
  const cerute = [], dF = { jurnal() {}, cere: async (u) => { cerute.push(u); return pag[cerute.length - 1]; } };
  const { tranzactiiT212 } = await import("./lib/tura-cont.mjs"), st = {};
  const v = await tranzactiiT212(dF, st, AZ, 0); assert.equal(cerute.length, 3); assert.match(cerute[1], /cursor=aa-1&time=2026-11-01T00%3A00%3A00\.000Z$/); assert.equal(v.pana, 1); assert.deepEqual(v.items.map((x) => x.s), [-50, 100], "EUR nu se adună cu lei");
  /* revizia valului 4 (🟠): la FIECARE tură se recitește incremental (o pagină, oprită la citirea de dinainte) și `la` = ora turei - altfel o retragere
     de după citire ieșea pierdere, iar o listă refolosită (la < ora contului) ar fi ținut frâna „nu se știe” 6 h */
  st.tranzT212 = v; const c5 = [], d5 = { jurnal() {}, cere: async (u) => { c5.push(u); return { bani: [], celMaiVechi: AZ - 2 * Z, cursor: "cc-1", time: "2026-11-27T00:00:00.000Z" }; } };
  const v5 = await tranzactiiT212(d5, st, AZ + 5 * 60000, 0); assert.equal(c5.length, 1, "și la 5 minute: o pagină"); assert.equal(v5.la, AZ + 5 * 60000); assert.equal(v5.pana, 1);
  const dP = { jurnal() {}, cere: async () => { throw new Error("429"); } }; assert.equal(await tranzactiiT212(dP, { tranzT212: v }, AZ + Z, 0), v, "picată ⇒ cea veche, nimic stricat");
  /* a doua zi: o pagină nouă care ajunge sub citirea de ieri ⇒ se oprește, păstrează acoperirea */
  const c2 = [], d2 = { jurnal() {}, cere: async (u) => { c2.push(u); return { bani: [{ t: AZ + Z - 1000, s: 300 }], celMaiVechi: AZ - Z, cursor: "bb-1", time: "2026-11-27T00:00:00.000Z" }; } };
  const v2 = await tranzactiiT212(d2, { tranzT212: v }, AZ + Z, 0); assert.equal(c2.length, 1); assert.equal(v2.pana, 1); assert.deepEqual(v2.items.map((x) => x.s), [-50, 100, 300]);
  assert.match(citeste("scripts", "lib", "tura-cont.mjs"), /raport\.castig = C\.castigCont\(zl\.zile, \{[^}]*citit: acum \}, ziRo\(acum\), trT\)/);
  assert.match(citeste("functions", "api", "t212.js"), /if \(a === "tranzactii"\)/);
  /* ruta: taxa cardului (FEE) intră în flux cu minus, dobânda nu; semnul din tip */
  const kvR = new Map(), envR = { APP_API_TOKEN: "proba-token-1234567890", T212_API_KEY: "k", T212_API_SECRET: "s", ISTORIC: { get: async (k) => (kvR.has(k) ? kvR.get(k) : null), put: async (k, v) => { kvR.set(k, v); }, delete: async () => {} } };
  const fetch0 = globalThis.fetch; globalThis.fetch = async () => new Response(JSON.stringify({ items: [{ type: "LENDING_INTEREST", amount: 1.2, currency: "RON", dateTime: "2026-11-26T04:00:00Z" }, { type: "FEE", amount: -14, currency: "RON", dateTime: "2025-11-23T10:00:01Z" }, { type: "DEPOSIT", amount: 2014, currency: "RON", dateTime: "2025-11-23T10:00:00Z" }, { type: "WITHDRAW", amount: 84.09, currency: "RON", dateTime: "2026-08-19T09:00:00Z" }], nextPagePath: "/api/v0/history/transactions?limit=50&cursor=01a0d191-9b45-7185-a936-6d249863350a&time=2025-11-23T10:00:00.000Z" }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const rt = await (await import("../functions/api/t212.js")).onRequestGet({ request: new Request("https://exemplu.test/api/t212?action=tranzactii", { headers: { authorization: "Bearer proba-token-1234567890", origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.5" } }), env: envR });
    const jr = await rt.json(); assert.equal(rt.status, 200, JSON.stringify(jr)); assert.deepEqual(jr.bani.map((x) => x.tip + " " + x.s), ["FEE -14", "DEPOSIT 2014", "WITHDRAW -84.09"]); assert.equal(jr.cursor, "01a0d191-9b45-7185-a936-6d249863350a"); assert.equal(jr.time, "2025-11-23T10:00:00.000Z");
  } finally { globalThis.fetch = fetch0; }
});
await test("P5 (I-960). rezumatul zilei: informările de trepte / perechi / grile stau în Radar și pleacă într-un mesaj la 3 h; atenția, criticul, noaptea și „mereu pe Discord” neatinse", () => {
  const z0 = Date.UTC(2026, 10, 27, 9, 0) /* 11:00 RO */, i = (k, n) => POL.politicaRezumat({ nivel: n || "info", titlu: "STX: −4% azi" }, k);
  assert.deepEqual([i("t212-pas-STX-2026-11-26").rezumat, i("bot-pas-HYPE-1").rezumat, i("perechi-ora-HYPE").rezumat, i("grila-HYPE-3").rezumat], [true, true, true, true]);
  assert.equal(i("t212-pas-STX-2026-11-26").doarRadar, true);
  assert.equal(i("t212-pas-STX", "atentie").rezumat, undefined, "atenția pleacă imediat"); assert.equal(i("t212-pas-STX", "critic").rezumat, undefined);
  assert.equal(i("sim-miscare-MU").rezumat, undefined); assert.equal(i("sltp-intrare-CAP").rezumat, undefined, "intrarea sugerată atinsă cere o hotărâre");
  assert.equal(POL.politicaRezumat({ nivel: "info", titlu: "BTC: lichidare aproape" }, "bot-pas-X").rezumat, undefined, "lichidarea în titlu ⇒ mereu pe Discord");
  const st = {}; for (let k = 0; k < 4; k++) POL.noteazaRezumat(st, { nivel: "info", titlu: ["STX", "AVGO", "STX", "MU"][k] + ": −" + (k + 1) + "% azi" }, "t212-pas-" + k, z0 + k * 60000);
  /* revizia valului 4 (🟠): cheile REALE - „perechi-ora” e aceeași pentru toți boții, „bot-pas-<id>” pentru toate treptele unui bot ⇒ fiecare se numără */
  for (const s of ["HYPE", "BNB", "MMT"]) POL.noteazaRezumat(st, { nivel: "info", titlu: "✅ " + s + ": 3 perechi în ultima oră" }, "perechi-ora", z0 + 6e5);
  POL.noteazaRezumat(st, { nivel: "info", titlu: "SOL (long 3×): −2,2% în 6 h" }, "bot-pas-2692", z0 + 7e5); POL.noteazaRezumat(st, { nivel: "info", titlu: "SOL (long 3×): −3,1% în 6 h" }, "bot-pas-2692", z0 + 8e5);
  assert.equal(st.n, 9); assert.deepEqual(st.sim, ["STX", "AVGO", "MU", "HYPE", "BNB", "MMT", "SOL"]);
  assert.equal(POL.rezumatZi(st, z0 + 3 * 3600000 - 1), null, "sub 3 h ⇒ încă nu");
  const r = POL.rezumatZi(st, z0 + 3 * 3600000 + 1); assert.equal(r.titlu, "📋 În ultimele 3 ore: 9 informări"); assert.equal(r.cheie, "rezumat-zi");
  assert.match(r.mesaj, /^Au stat doar în Radar: 4 trepte T212, 3 anunțuri de perechi pe oră, 2 trepte de boți \(STX, AVGO, MU, HYPE, BNB, MMT, SOL\)\.\n👉 /);
  /* revizia (🟡): rezumatul nereușit se pune la loc PESTE ce s-a strâns cât era în zbor */
  const nou = {}; POL.noteazaRezumat(nou, { nivel: "info", titlu: "WDC: −1% azi" }, "t212-pas-9", z0 + 3 * 3600000 + 5); POL.unesteRezumat(nou, st);
  assert.equal(nou.n, 10); assert.equal(nou.de, st.de); assert.equal(nou.pe.t212, 5); assert.ok(nou.sim.includes("WDC") && nou.sim.includes("SOL"));
  assert.equal(POL.mereuPeDiscord("rezumat-zi", r), true, "rezumatul nu e oprit de repetări");
  assert.equal(POL.rezumatZi(st, Date.UTC(2026, 10, 27, 22, 0) /* 00:00 RO */), null, "noaptea așteaptă");
  POL.golesteRezumat(st); assert.equal(POL.rezumatZi(st, z0 + 4 * 3600000), null);
  /* ordinea din colector: noaptea întâi (treptele de noapte ⇒ rezumatul de la 08), apoi rezumatul zilei */
  const n = POL.politicaRezumat(POL.politicaNoapte({ nivel: "info", titlu: "STX: −2% azi" }, "t212-pas-STX", Date.UTC(2026, 10, 27, 22, 30)), "t212-pas-STX"); assert.equal(n.noapte, true); assert.equal(n.rezumat, undefined);
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /m = POL\.politicaNoapte\(m, cheie, Date\.now\(\)\);\r?\n  m = POL\.politicaRezumat\(m, cheie\);/);
  assert.match(col, /if \(m && m\.rezumat\) \{ try \{ const mZ = meta\(\); POL\.noteazaRezumat\(/); assert.match(col, /turaRezumatZi\(\)\.catch\(/);
  assert.match(col, /mZ\.rezumatZi = \{\}; let ok = false;/); assert.match(col, /if \(!ok\) POL\.unesteRezumat\(mZ\.rezumatZi, st\);/);   /* revizia: starea desprinsă înainte de await */
  assert.match(col, /return inKv \|\| !!\(m\.rezumat \|\| m\.noapte\); \}/, "alerta strânsă se dă drept trimisă odată în coada KV");
  assert.match(col, /else if \(m && m\.rezumat\) \{ const mR = meta\(\); if \(POL\.repetare\(/, "steagul de repetare și pentru cele strânse (registrul)");
});
await test("P6 (I-961). puterea dinainte: efectul minim detectabil la 26 (80%) din abaterea de acum - formula ține în simulare; registrul, lista, regula, serverul și textele îl duc", async () => {
  const m26 = RG.mde(1, 26, 26, 1); assert.ok(Math.abs(m26.mde / 0.5718 - 1) < 0.01, "t(25) exact: (2,0595 + 0,8562) / √26 = 0,5718 · " + m26.mde);
  assert.ok(m26.lo < m26.mde && m26.hi > m26.mde); assert.equal(RG.mde(1, 4, 26, 1), null, "sub 5 ferestre ⇒ nu se spune");
  assert.ok(RG.mde(1, 26, 26, 12).mde > m26.mde * 1.2, "corecția pentru 12 feluri cere un efect mai mare");
  /* simularea (mulberry32): efectul adevărat = MDE, abaterea 1, 26 de ferestre, testul Student pe 2 părți la 5% ⇒ ~80% din probe îl prind */
  let s = 2026; const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()); let prinse = 0; const N = 4000;
  for (let k = 0; k < N; k++) { const v = Array.from({ length: 26 }, () => m26.mde + g()), me = v.reduce((a, b) => a + b, 0) / 26, sd = Math.sqrt(v.reduce((a, b) => a + (b - me) ** 2, 0) / 25); if (me - 2.0595 * sd / Math.sqrt(26) > 0 || me + 2.0595 * sd / Math.sqrt(26) < 0) prinse++; }
  assert.ok(Math.abs(prinse / N - 0.8) < 0.03, "puterea simulată " + (prinse / N));
  assert.equal(RG.poateRaspunde({ mde: 0.3, lo: 0.2, hi: 0.4 }, 0.5), "da"); assert.equal(RG.poateRaspunde({ mde: 0.8, lo: 0.6, hi: 1.1 }, 0.5), "nu"); assert.equal(RG.poateRaspunde({ mde: 0.5, lo: 0.4, hi: 0.7 }, 0.5), "la-limita");
  /* paritatea: lista (tura-monede-bot) = registrul (AlReg), aceeași formulă */
  const v = [0.012, -0.03, 0.025, 0.004, -0.011, 0.031, -0.02, 0.006], me = v.reduce((a, b) => a + b, 0) / v.length, sdv = Math.sqrt(v.reduce((a, b) => a + (b - me) ** 2, 0) / (v.length - 1));
  assert.equal(TMB.putereDinainte(v.slice(0, 4), 26, 0.02), null, "sub 5 ferestre ⇒ nu se spune");
  const pT = TMB.putereDinainte(v, 26, 0.02), pR = RG.mde(sdv, v.length, 26, 1); assert.ok(Math.abs(pT.mde - pR.mde) < 1e-6 && Math.abs(pT.lo - pR.lo) < 1e-4 && Math.abs(pT.hi - pR.hi) < 1e-4, JSON.stringify([pT, pR]));
  /* registrul: un fel cu 10 ferestre ⇒ puterea + „poate”; la 26 ⇒ fără */
  const z = (i) => new Date(Date.UTC(2026, 10, 1) + i * 2 * 86400000).toISOString().slice(0, 10), intr = [], jud = {};   /* boții: la 2 zile (revizia) */
  for (let i = 0; i < 10; i++) { const e = { t: Date.parse(z(i) + "T10:00:00Z"), fel: "p-zero", piata: "crypto", cheie: "p-zero-" + i, bot: "b" }; intr.push(e); jud[RG.cheie(e)] = { 24: { x: (i % 2 ? 1 : -1) * 0.02 } }; }
  const fz = RG.rezumat(intr, jud, ACUM, {}).feluri[0]; assert.equal(fz.ferestre, 10); assert.ok(fz.putere && fz.putere.lo > 0.005, "abaterea 2% ⇒ la 26 vede doar efecte de peste ~1,2% (tot intervalul peste 0,5%)"); assert.equal(fz.bani, 0.005); assert.equal(fz.poate, "nu");
  const ae = ctxLib(["text-ro.js", "alerte-ecran.js"], { escapeHtml: (x) => String(x), localStorage: { getItem: () => null, setItem() {} }, $: () => null, setInterval() {}, setTimeout() {}, document: { addEventListener() {}, hidden: false }, getJSON: async () => ({}), navTo() {}, innerWidth: 412 });
  assert.match(ae.alPutere(fz), /^ · la 26 vede de la ~1,2 % \(0,8 % … 2,2 %\); efectul care ar conta \(0,5 %\) e sub el ⇒ așa nu poate răspunde: trebuie alt orizont sau mai multe ferestre$/);
  /* lista și regula: rezumatele poartă puterea; serverul o păstrează; textul o spune */
  const J = (n, f) => Array.from({ length: n }, (_, i) => ({ zi: new Date(Date.UTC(2026, 11, 1) + i * 2 * ZI).toISOString().slice(0, 10), short: f(i), long: null }));
  const rr = TMB.rezumatRegula({ judecate: J(8, (i) => ({ nL: 3, mL: 0.1 + (i % 2 ? 0.6 : -0.6), nC: 15, mC: -0.1 })) }); assert.equal(rr.short.ferestre, 8); assert.equal(rr.short.putere.poate, "nu");
  const ru = TMB.rezumatUrmarire({ judecate: Array.from({ length: 6 }, (_, i) => ({ zi: new Date(Date.UTC(2026, 11, 1) + i * 7 * ZI).toISOString().slice(0, 10), short: { exces: i % 2 ? 0.05 : -0.04 } })) }); assert.equal(ru.short.ferestre, 6); assert.equal(ru.short.putere, undefined, "urmărirea n-are verdict ⇒ nici putere (revizia)");
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } }, mm = await import("../functions/api/istoric-bot.js");
  const H0 = { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.5", "content-type": "application/json" }, post = (a, b) => mm.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: H0, body: JSON.stringify(b) }), env: ENV });
  assert.equal((await post("monedeBot", { la: ACUM, n: 1, nPionex: 1, monede: [{ sym: "ZECUSDT", s: "ZEC", pret: 400, vol: 2e8, oi: 1e8, pionex: true, junk: [] }], short: ["ZEC"], long: [], revenire: [], range: [], urmarire: ru, regula: rr })).status, 200);
  const g2 = JSON.parse(kv.get("monede-bot")); assert.equal(g2.regula.short.putere.poate, "nu"); assert.equal(g2.urmarire.short.putere, null);
  assert.equal((await post("alerteRegistru", { rezumat: RG.rezumat(intr, jud, ACUM, {}) })).status, 200); assert.equal(JSON.parse(kv.get("alerte:registru")).feluri[0].poate, "nu");
  const se = ctxLib(["latime.js", "reveniri.js", "monede-bot.js", "sugestii-ecran.js"], { escapeHtml: (x) => String(x), sugStare: { panda: {} }, getJSON: async () => ({}), navTo() {}, setTimeout, clearTimeout, window: null });
  assert.match(se.sugMbotRegula(g2.regula), /Doar Short: 8 ferestre din 26; la 26 vede de la ~0,\d pp \(.+\), peste efectul care ar conta \(0,13 pp\) ⇒ așa nu poate răspunde/);
  assert.match(se.sugMbotUrm(g2.urmarire, 40), /6 ferestre independente\), /); assert.doesNotMatch(se.sugMbotUrm(g2.urmarire, 40), /vede de la/);
});
await test("P7 (revizia valului 4). boții de semnal: întoarcerile nu se mai numără de două ori, ieșirea+reintrarea între citiri e tranzacție, botul închis în poziție intră în registru; verdictul înghețat cu cifrele lui", async () => {
  /* 🔴 întoarceri: realizatul 0 ⇒ 5 ⇒ 8 ⇒ 6 = tranzacțiile +5, +3, −2 (înainte [5, 8, 1]) */
  const sx = (o) => sem(Object.assign({ investit: 50, pozitieBani: null }, o)); let r1 = BS.schimbare(null, sx({ directie: null, pozitie: 0, profitTotal: 0, runde: 0 }), ACUM); const L = [];
  const pas = (o, t) => { const b = sx(o); r1 = BS.schimbare(r1.ref, b, ACUM + t); const tr = BS.tranzactie(r1, b, ACUM + t); if (tr) L.push(Math.round(tr.net * 100) / 100); return r1.ev; };
  assert.equal(pas({ directie: "long", pozitie: 0.1, profitTotal: 0, runde: 0 }, 1e3), "intrat");
  assert.equal(pas({ directie: "short", pozitie: -0.1, profitTotal: 5, runde: 1 }, 2e3), "intors"); assert.equal(pas({ directie: "short", pozitie: -0.1, profitTotal: 5, runde: 1 }, 3e3), null);
  assert.equal(pas({ directie: "long", pozitie: 0.1, profitTotal: 8, runde: 2 }, 4e3), "intors"); assert.equal(pas({ directie: null, pozitie: 0, profitTotal: 6, runde: 3 }, 5e3), "iesit");
  assert.deepEqual(L, [5, 3, -2]); assert.equal(L.reduce((a, x) => a + x, 0), 6, "suma registrului = creșterea realizatului");
  /* 🟡 ieșit + reintrat pe aceeași parte între două citiri (rundele cresc - pe viu roundCount +1 la fiecare poziție închisă) */
  let r2 = BS.schimbare(null, sx({ directie: "long", pozitie: 0.1, profitTotal: 1, runde: 3 }), ACUM); const b2 = sx({ directie: "long", pozitie: 0.11, profitTotal: 3, runde: 4 });
  r2 = BS.schimbare(r2.ref, b2, ACUM + 1e3); assert.equal(r2.ev, "reintrat"); assert.equal(BS.tranzactie(r2, b2, ACUM + 1e3).net, 2); assert.equal(r2.ref.pr0, 3); assert.equal(BS.mesaj(r2, b2).doarRadar, true);
  /* 🟠 botul închis cu poziția deschisă (stop / mână): ultima tranzacție intră o dată, după alerta plecată */
  assert.equal(BS.tranzactie({ ev: "iesit", ant: { d: "short", pr0: 0, pr: -1 }, ref: {} }, sx({ profitTotal: -7.5 }), ACUM).net, -7.5);
  const col = citeste("scripts", "colector.mjs"); assert.match(col, /if \(rf && rf\.d\) trI = BotSemnal\.tranzactie\(\{ ev: "iesit", ant: rf, ref: rf \}, x, acum\)/); assert.match(col, /if \(trI\) \{ const R = m\.semnaleTr \|\| \(m\.semnaleTr = \[\]\); R\.push\(trI\);/);
  /* 🟡 după îngheț: cifrele LUI lângă verdict; ruta le păstrează */
  const rz = Object.assign(BS.rezumatTranzactii(Array.from({ length: 30 }, (_, i) => ({ net: -0.15, pus: 50, pct: -0.003 + (i % 3) * 0.0005 }))), { inghetat: ACUM, cifreInghetate: { n: 30, medie: -0.003, lo: -0.005, hi: -0.001 } });
  assert.match(BS.textTranzactii(rz), /verdict: pierde pe viu - aș opri boții de semnal \(înghețat la 30: −0,3%, −0,5% … −0,1%\)/);
  const kv = new Map(), ENV = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } }, mm = await import("../functions/api/istoric-bot.js");
  const res = await mm.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=semnaleRegistru", { method: "POST", headers: { authorization: "Bearer proba-token-1234567890", origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.5", "content-type": "application/json" }, body: JSON.stringify({ rezumat: Object.assign({ la: ACUM }, rz), ultime: [] }) }), env: ENV });
  assert.equal(res.status, 200); assert.equal(JSON.parse(kv.get("semnale:registru")).rezumat.cifreInghetate.n, 30);
});
await test("P8 (revizia valului 4 + I-967). ecranele botului de semnal: rezultatul CU poziția deschisă (ca paza), fără verde peste o pierdere deschisă; fără intrare ⇒ doar încasatul", () => {
  const e = BS.rezultatEcran(sem({ directie: "long", pozitie: 0.1, pozitieBani: 10, pretCurent: 60, profitTotal: 2 }));
  assert.equal(e.total, -2, "încasat +2, poziția −4 ⇒ −2"); assert.equal(e.cls, "bad"); assert.match(e.sub, /^încasat \+2,0 · poziția deschisă −4,0 \(din intrarea ~.+, estimată\)$/);
  const f = BS.rezultatEcran(sem({ directie: "long", pozitie: 0.1, pozitieBani: null, pretCurent: 60, profitTotal: 2 })); assert.equal(f.total, null); assert.equal(f.cls, ""); assert.equal(f.val, "încasat +2,0");
  const fara = BS.rezultatEcran(sem({ directie: null, pozitie: 0, pozitieBani: null, profitTotal: 2 })); assert.equal(fara.total, 2); assert.equal(fara.cls, "good");
  const card = BS.cardHtml(sem({ directie: "long", pozitie: 0.1, pozitieBani: 10, pretCurent: 60, profitTotal: 2 }), (x) => String(x), { acum: ACUM });
  assert.match(card, /<b class="tbKpiVal bad">−2,0<\/b>/); assert.match(card, /Pionex dă doar încasatul; poziția o adaugă Radarul/); assert.doesNotMatch(card, /neverificat dacă o cuprinde/);
  assert.match(BS.randAcasa(sem({ directie: "long", pozitie: 0.1, pozitieBani: 10, pretCurent: 60, profitTotal: 2 })).val, /^−2,0 USDT \(cu poziția\)$/);
  /* banda de sus, pe comportament (mutația „banda pe profitul brut” scăpa cu o probă pe text): încasat +2, poziția −4 ⇒ „total −2,0 USDT”, nu verde */
  const pvc = ctxLib(["text-ro.js", "bot-semnal.js", "pret-viu.js"]), bnd = pvc.PretViu.banda({ bot: sem({ directie: "long", pozitie: 0.1, pozitieBani: 10, pretCurent: 60, profitTotal: 2 }), acum: ACUM });
  assert.equal(bnd.parti.find((p) => p.k === "total").t, "total −2,0 USDT"); assert.equal(bnd.clasa, "tbWarn");
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /BotSemnal\.rezultatEcran\(x\)/);
  assert.match(citeste("public", "lib", "acasa-ecran.js"), /"\+" \+ TextRo\.cate\(sem\.length - 3, "bot de semnal", "boți de semnal"\) \+ " în Tablou"/);
});
await test("P9 (revizia valului 4). planul sub 4%: weekendul boților intră în lunea lui, acțiunea vândută își ia și cursul, doar pozițiile chiar din risc, valoarea parțială ⇒ spus; Poarta nu „trece” cu frâna neștiută", () => {
  let s = 99; const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()), zl = zileL(200), lucr = (z) => { const w = new Date(z + "T12:00:00Z").getUTCDay(); return w !== 0 && w !== 6; };
  /* 🟠 un singur bot (5.000 lei), seria are și weekenduri; P&L-ul pe zile de bursă, cu weekendul în luni (ca pnlIstoric) ⇒ tăiat tot, riscul ⇒ 0 */
  const sB = {}; for (const z of zl) sB[z] = 0.05 * g(); const P = []; let adus = 0; for (const z of zl) { if (!lucr(z)) { adus += 5000 * sB[z]; continue; } P.push([z, 5000 * sB[z] + adus]); adus = 0; }
  const vB = CI.varEs(P.map((x) => x[1]), 0.95).var, rapB = { valoare: { total: vB / 0.12 }, risc: { pnl: P, var95: vB, folosite: ["C:X"] }, serii: { "C:X": sB }, expuneri: [{ tip: "bot", cheie: "C:X", nume: "X (bot long 5×)", clasa: "crypto", moneda: "USDT", lei: 5000 }] };
  const pB = CI.planSub4(rapB); assert.equal(pB.ajunge, true, JSON.stringify(plain(pB))); assert.ok(pB.pct < 0.005, "fără bot riscul e ~0, nu weekendurile rămase: " + pB.pct);
  /* 🟡 o acțiune în USD vândută: pleacă și partea valutară (banii rămân în lei) */
  const sA = {}, fx = {}; const PA = []; for (const z of zl) { if (!lucr(z)) continue; sA[z] = 0.01 * g(); fx[z] = 0.01 * g(); PA.push([z, 10000 * ((1 + sA[z]) * (1 + fx[z]) - 1)]); }
  const vA = CI.varEs(PA.map((x) => x[1]), 0.95).var, rapA = { valoare: { total: vA / 0.1 }, risc: { pnl: PA, var95: vA, folosite: ["T:A"] }, serii: { "T:A": sA }, fx: { USD: fx }, expuneri: [{ tip: "t212", cheie: "T:A", nume: "A", clasa: "actiuni", moneda: "USD", lei: 10000 }] };
  const pA = CI.planSub4(rapA); assert.equal(pA.ajunge, true); assert.ok(pA.pct < 0.005, "riscul valutar fals rămas: " + pA.pct);
  /* 🟠 doar pozițiile din risc: un bot nou pe o monedă scurtă (scos din risc) nu taie zilele comune și nu e tăiat */
  const sN = {}; for (const z of zl.slice(-40)) sN[z] = 0.08 * g();
  const rapN = Object.assign({}, rapA, { serii: { "T:A": sA, "C:NOU": sN }, expuneri: rapA.expuneri.concat([{ tip: "bot", cheie: "C:NOU", nume: "NOU (bot long 3×)", clasa: "crypto", moneda: "USDT", lei: 900 }]) });
  const pN = CI.planSub4(rapN); assert.notEqual(pN.putine, true, "planul nu dispare"); assert.ok(pN.pePozitii.every((x) => x.cheie !== "C:NOU"));
  /* 🟡 valoarea parțială ⇒ planul nu se socotește, pagina o spune */
  const pL = CI.planSub4(Object.assign({}, rapA, { valoare: { total: 1500, complet: false, lipsa: ["Trading 212"] } })); assert.deepEqual(plain(pL), { lipsa: ["Trading 212"] });
  const ce = ctxLib(["text-ro.js", "cont-intreg.js", "cont-ecran.js"], { escapeHtml: (x) => String(x) }); assert.match(ce.ciPlanHtml(Object.assign({}, rapA, { valoare: { total: 1500, complet: false, lipsa: ["Trading 212"] } })), /N-o pot judeca acum: lipsește Trading 212/);
  /* 🟡 Discord: „și încă N” doar când au rămas nume; fără plan, alerta tot pleacă */
  const m3 = MC.planRisc({ pct0: 0.12, prag: 0.04, ajunge: true, pct: 0.03, pePozitii: [{ nume: "VVV (bot long 3×)", parte: 0.5, lei: 300 }, { nume: "HYPE (bot short 3×)", parte: 0.5, lei: 300 }, { nume: "ZEC (bot short 3×)", parte: 0.5, lei: 300 }] });
  assert.doesNotMatch(m3.mesaj, /și încă (-|0\b)/); assert.ok(m3.mesaj.split("\n")[0].length <= 160);
  assert.match(MC.planRisc({ pct0: 0.097, prag: 0.04, pePozitii: [] }).mesaj, /^Riscul pe o zi e peste buget; ce să tai nu pot socoti acum/);
  const tc = citeste("scripts", "lib", "tura-cont.mjs"); assert.match(tc, /const pr4 = raport\.planRisc \|\| \(pct4 !== null \? \{ pct0: pct4, prag: 0\.04, pePozitii: \[\] \} : null\);/); assert.match(tc, /if \(pl && !pl\.putine && !pl\.lipsa\) raport\.planRisc/);
  assert.match(tc, /folosite: ist\.folosite \}/); assert.match(tc, /fx: Object\.fromEntries\(Object\.entries\(fxSerii\)/);
  /* 🟠 Poarta: frâna neștiută nu „trece”; motivul din Acasă; raportul și calendarul aduse proaspăt */
  const n = OBp.poarta({ fisa: fisaP, trades: [], acum: ACUM, dir: "short", levier: 2, plan: null, franaCont: { text: "", stiut: false, nec: "n-am calendarul de azi (eroare), deci nu știu dacă e un eveniment mare" } }).reguli.find((x) => x.cod === "frana-cont");
  assert.equal(n.ok, false); assert.equal(n.necunoscut, true); assert.equal(n.text, "Frâna contului: încă n-o știu (n-am calendarul de azi (eroare), deci nu știu dacă e un eveniment mare).");
  assert.match(OBp.facPoarta({ trecut: false, reguli: [{ cod: "frana-cont", ok: false, necunoscut: true }, { cod: "x", ok: true }] }).fac, /^Aș aștepta până știu frâna contului/);
  assert.match(APPJS, /🛑 Frâna boților — sună când boții pierd/); assert.doesNotMatch(APPJS, /🛑 Frâna contului — sună/, "două frâne cu același nume");
  assert.match(APPJS, /async function grFranaContCiteste\(\)\{[\s\S]{0,700}await acVremeAsigura\(\)[\s\S]{0,300}acFranaContStiut\(\)/);
  assert.match(citeste("functions", "api", "t212.js"), /tranzactii: "History \/ Transactions"/);
});
await test("V. versiunea v100.396 (index ×4, sw, versiune.js, package + lanț după v100.395, BUILD_INFO), colectorul v101.215", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(pk.version, "100.396.0"); assert.equal(bi.version, "v100.396"); assert.ok(bi.li396 && bi.li396.length > 100); assert.equal(bi.badge, "v100.396 · REPARAȚIILE AUDITULUI");
  assert.ok((citeste("public", "index.html").match(/v100\.396/g) || []).length >= 4); assert.match(citeste("public", "sw.js"), /crypto-radar-v100-396/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.396"/);
  assert.match(pk.scripts.test, /npm run test:v100395 && npm run test:v100396 && node scripts\/mutatii\.mjs/); assert.equal(pk.scripts["test:v100396"], "node scripts/proba-v100396.mjs");
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.215"/);
});

console.log(`\nproba v100.396 (reparațiile auditului): ${teste - picate} / ${teste}`);
process.exit(picate ? 1 : 0);
