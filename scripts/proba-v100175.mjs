// Probele v100.175 (13.10.2026, el: „fă reparațiile”) — minorele rămase din auditul Opus (server, colector, interfață) și din revizia lui.
import "./lib/text-ro-global.mjs";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.175 · reparațiile rămase din audit · proba\n");
const fetchOrig = globalThis.fetch;

// ── calendarul burselor (punctul 4 din comparația instituțională: date de referință) ──
const { CalendarBursa: CB } = await import("./lib/calendar-bursa.mjs");
const lista = (an, b) => Object.keys(CB.sarbatori(an, b)).sort().join(" ");
await test("calendar: sărbătorile NYSE 2026 (Vinerea Mare, Juneteenth, 4 iulie mutat pe vineri, Thanksgiving)", () => {
  assert.equal(lista(2026, "NYSE"), "2026-01-01 2026-01-19 2026-02-16 2026-04-03 2026-05-25 2026-06-19 2026-07-03 2026-09-07 2026-11-26 2026-12-25");
});
await test("calendar: Anul Nou de sâmbătă NU se mută pe 31.12 (2022); Juneteenth doar din 2022; Crăciunul de sâmbătă ⇒ vineri 24 (2021)", () => {
  assert.ok(!CB.sarbatori(2022, "NYSE")["2021-12-31"] && !CB.sarbatori(2022, "NYSE")["2022-01-01"]);
  assert.ok(CB.sarbatori(2022, "NYSE")["2022-06-20"]); assert.ok(!Object.keys(CB.sarbatori(2021, "NYSE")).some((z) => z.slice(5) === "06-18" || z.slice(5) === "06-19"));
  assert.ok(CB.sarbatori(2021, "NYSE")["2021-12-24"]);
});
await test("calendar: Xetra (fără mutări, 24 și 31 decembrie închis) și Londra (zilele înlocuitoare de Crăciun)", () => {
  assert.equal(lista(2026, "XETRA"), "2026-01-01 2026-04-03 2026-04-06 2026-05-01 2026-12-24 2026-12-25 2026-12-26 2026-12-31");
  assert.equal(lista(2027, "LSE"), "2027-01-01 2027-03-26 2027-03-29 2027-05-03 2027-05-31 2027-08-30 2027-12-27 2027-12-28");
});
await test("calendar: ziua sesiunii — de Thanksgiving e ziua de dinainte; Xetra dimineața la 10:00 Berlin e ziua de AZI (nu ieri, ca la New York)", () => {
  assert.equal(CB.ziSesiune(Date.parse("2026-11-26T18:00:00Z"), "AAPL"), "2026-11-25");
  assert.equal(CB.ziSesiune(Date.parse("2026-10-13T08:00:00Z"), "SAP.DE"), "2026-10-13");
  assert.equal(CB.ziSesiune(Date.parse("2026-10-13T08:00:00Z"), "AAPL"), "2026-10-12");
  assert.equal(CB.ziSesiune(Date.parse("2026-10-13T06:00:00Z"), "SAP.DE"), "2026-10-12", "înainte de 9:00 Berlin");
  assert.equal(CB.bursaSimbol("SAPd_EQ"), "XETRA"); assert.equal(CB.bursaSimbol("VODl_EQ"), "LSE"); assert.equal(CB.bursaSimbol("AMD_US_EQ"), "NYSE");
});
await test("calendar: închiderea ședinței ține cont de ora de vară (New York 20:00Z vara, 21:00Z iarna; Xetra 15:30Z)", () => {
  assert.equal(new Date(CB.inchidereLa("2026-10-13", "AAPL")).toISOString(), "2026-10-13T20:00:00.000Z");
  assert.equal(new Date(CB.inchidereLa("2026-01-13", "AAPL")).toISOString(), "2026-01-13T21:00:00.000Z");
  assert.equal(new Date(CB.inchidereLa("2026-10-13", "SAP.DE")).toISOString(), "2026-10-13T15:30:00.000Z");
  const st = CB.stare(Date.parse("2026-11-26T15:00:00Z"), "SPY"); assert.equal(st.deschisa, false, "Thanksgiving: închis"); assert.equal(st.ziDeBursa, false);
});

// ── colector: Xetra fără informație din viitor; ziua sesiunii pe bursa simbolului ──
const t212Mod = citeste("scripts", "lib", "tura-t212.mjs"), poza = citeste("scripts", "lib", "poza.mjs"), piata = citeste("scripts", "lib", "tura-piata.mjs");
await test("planul de la cumpărare: bara zilei intră doar după închiderea ședinței EI (o cumpărare la Xetra la 15:10Z nu vede bara zilei)", () => {
  assert.match(t212Mod, /CalendarBursa\.inchidereLa\(CalendarBursa\.ziLocala\(b\.t, tk\), tk\) <= t\.pornit/);
  const bara = Date.parse("2026-10-13T07:00:00Z"), cump = Date.parse("2026-10-13T15:10:00Z");
  assert.ok(bara + 8 * 3600000 <= cump, "regula veche lăsa bara să intre"); assert.ok(!(CB.inchidereLa(CB.ziLocala(bara, "SAPd_EQ"), "SAPd_EQ") <= cump), "regula nouă n-o lasă");
});
const P = await import("./lib/poza.mjs");
await test("poza: cheile „o dată pe zi” pe ziua bursei simbolului; mesajul în moneda bursei (€ la Xetra, nu „$”)", () => {
  assert.equal(P.ziSesiune(Date.parse("2026-10-13T08:00:00Z"), "SAP.DE"), "2026-10-13"); assert.equal(P.ziSesiune(Date.parse("2026-10-13T08:00:00Z")), "2026-10-12");
  assert.match(poza, /"sltp-aproape-" \+ p\.s \+ "-" \+ zi\(p\.s\)/); assert.match(poza, /"t212-pas-" \+ p\.s \+ "-" \+ semn \+ k \+ "-" \+ rot\(prev, 4\) \+ "-" \+ zi\(p\.s\)/);
  const i = poza.indexOf("export function alerteSLTP("), bucata = poza.slice(i, poza.indexOf("\nexport function", i + 10));
  assert.ok(!/\(\$" \+ pr\(|Prețul e \$" \+ pr\(|ținta \$" \+ pr\(/.test(bucata), "nu mai rămâne „$” fix în alertele de stop / țintă");
});
await test("tura pieței: zilele de sărbătoare NYSE nu mai sunt „deschise” (calendarul burselor)", () => { assert.match(piata, /CalendarBursa\.stare\(acum, "SPY"\)/); });

// ── colector: coada Discord, poza în limită, frâna fără arhivă, cursul BNR ──
const CD = await import("./lib/canal-discord.mjs");
await test("coada Discord: la plafon pleacă întâi alertele „info”, critice vechi rămân; plafonul e 200", () => {
  const l = [{ t: 1, m: { nivel: "critic", titlu: "c1" } }, { t: 2, m: { nivel: "info", titlu: "i1" } }, { t: 3, m: { nivel: "atentie", titlu: "a1" } }, { t: 4, m: { nivel: "info", titlu: "i2" } }];
  const r = CD.taieCoada(l, 2); assert.equal(r.taiate, 2); assert.deepEqual(r.coada.map((x) => x.m.titlu), ["c1", "a1"]);
  assert.deepEqual(CD.taieCoada([{ m: { nivel: "critic", titlu: "x" } }, { m: { nivel: "critic", titlu: "y" } }], 1).coada.map((x) => x.m.titlu), ["y"], "fără info: cea mai veche");
  assert.match(citeste("scripts", "colector.mjs"), /taieCoada\(coadaDiscord, 200\)/);
});
const AZ = await import("./lib/alerte-zi.mjs");
await test("poza peste plafon: se taie în trepte (zgomotul, info vechi, seriile de 30 de zile, insiderii) — pozițiile și boții rămân mereu", () => {
  const mare = "x".repeat(2000);
  const p = { t212: Array.from({ length: 20 }, (_, i) => ({ s: "T" + i, closes30: Array(30).fill(123.4567), insideri: { text: mare } })), boti: [{ s: "BTC" }], simboluri: [],
    alerte: Array.from({ length: 200 }, (_, i) => ({ t: i, nivel: "info", titlu: "a" + i, mesaj: mare.slice(0, 300) })) };
  const text = AZ.pozaInLimita(p, 40000), o = JSON.parse(text);
  assert.ok(text.length <= 40000, "sub plafon: " + text.length); assert.equal(o.t212.length, 20); assert.equal(o.boti.length, 1);
  assert.ok(o.alerte.length <= 60 && o.alerte.every((a) => a.t >= 140), "rămân cele mai noi 60 de alerte info");
  assert.ok(o.taiat.includes("closes30"));
  assert.equal(AZ.pozaInLimita({ alerte: [], t212: [] }, 1000), JSON.stringify({ alerte: [], t212: [] }), "sub plafon: neschimbată");
});
const MC = await import("./lib/mesaje-colector.mjs");
await test("frâna fără arhivă: după 2 ore spune o dată pe zi că nu poate judeca (mesajul din modul, 👉 la persoana I)", () => {
  const m = MC.franaFaraArhiva(3.2); assert.equal(m.nivel, "atentie"); assert.ok(m.titlu.length <= 60); assert.match(m.mesaj, /nu vine de 3 ore/); assert.match(m.mesaj, /\n👉 Până revine, aș număra/);
  const c = citeste("scripts", "colector.mjs"); assert.match(c, /Date\.now\(\) - mF\.franaFaraArhivaDe > 2 \* 3600000 && mF\.franaFaraArhivaZi !== ziF/); assert.match(c, /MesajeColector\.franaFaraArhiva\(/);
});
await test("colectorul: cursul $/leu din BNR (ca pagina), pozițiile doar de rezervă; boții închiși de peste 30 de zile ies din starea alertelor", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const fx = \(await usdPeLeuBnr\(\)\) \|\| fxDinPozitii\(t212\);/); assert.match(c, /async function cursBnr\(\)/);
  // v100.196 (auditul sever, 🔵1): regula de 30 de zile s-a mutat în sanatate-colector.mjs și curăță și starea alertelor botului
  assert.match(c, /S\.curataStareBoti\(stareAlerte, m, acumIds, acum\);/);
  assert.match(citeste("scripts", "lib", "sanatate-colector.mjs"), /if \(acum - x\.inchisLa > 30 \* ZI_MS\) \{ delete c\[id\]; delete stare\[id\]; \}/);
});
await test("Binance cu limită de timp (o cerere agățată ținea lățimea pieței oprită ~5 minute)", () => { assert.match(citeste("scripts", "lib", "tura-latime.mjs"), /signal: AbortSignal\.timeout\(20000\)/); });

// ── server: IP-ul, listele KV, boții activi pe pagini, monitorul ──
await test("limita de parole greșite: IP-ul e ULTIMUL din x-forwarded-for (pus de proxy), nu primul (ales de client)", async () => {
  const { requireApiAuth } = await import(`../functions/_shared/auth.js?t=${Math.random()}`);
  const env = { APP_API_TOKEN: "proba-token-1234567890" };
  let ultima = null;
  for (let i = 0; i < 11; i++) ultima = await requireApiAuth(new Request("http://x/api/a", { headers: { authorization: "Bearer gresit" + i, "x-forwarded-for": "1.2.3." + i + ", 100.64.0.9" } }), env, "p175");
  assert.equal(ultima.status, 429, "11 ghiciri de pe același IP real ⇒ blocat, oricât ar schimba primul IP din antet");
  const alt = await requireApiAuth(new Request("http://x/api/a", { headers: { authorization: "Bearer gresit", "x-forwarded-for": "100.64.0.10" } }), env, "p175");
  assert.equal(alt.status, 401, "alt IP real nu e blocat");
});
await test("planuri / ultimulPlan: toate cheile KV (cursorul), nu doar primele 1000", async () => {
  const chei = Array.from({ length: 1500 }, (_, i) => "plan:b" + String(i).padStart(4, "0"));
  const kv = { list: async (o) => { const s = o.cursor ? Number(o.cursor) : 0, l = chei.filter((k) => k.startsWith(o.prefix)).slice(s, s + 1000); return { keys: l.map((name) => ({ name })), list_complete: s + 1000 >= chei.length, cursor: String(s + 1000) }; },
    get: async (k) => JSON.stringify({ plus: 5, minus: 10, la: Number(k.slice(6)) }) };
  const m = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`);
  const r = await m.onRequestGet({ request: new Request("http://x/api/istoric-bot?action=ultimulPlan", { headers: { authorization: "Bearer proba-token-1234567890", "cf-connecting-ip": "10.175.0.1" } }), env: { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: kv } });
  const d = await r.json(); assert.equal(d.bot, "b1499", "ultimul plan e din a doua pagină de chei");
});
await test("boții PORNIȚI pe mai multe pagini: lista urmează nextPageToken (al 11-lea bot nu mai rămâne fără alerte)", async () => {
  const cereri = [];
  globalThis.fetch = async (u) => {
    const url = String(u); cereri.push(url);
    if (url.includes("/api/v1/bot/orders")) { const tok = new URL(url).searchParams.get("pageToken"), s = tok ? Number(tok) : 0; const res = Array.from({ length: s < 10 ? 10 : 3 }, (_, i) => ({ buOrderId: "b" + (s + i), status: "running", buOrderType: "futures_grid", base: "X", quote: "USDT", buOrderData: {} })); return new Response(JSON.stringify({ result: true, data: { results: res, nextPageToken: s < 10 ? "10" : null } }), { status: 200 }); }
    return new Response(JSON.stringify({ result: true, data: { tickers: [], symbols: [] } }), { status: 200 });
  };
  try {
    const m = await import(`../functions/api/bot-orders.js?t=${Math.random()}`);
    const r = await m.onRequestGet({ request: new Request("http://x/api/bot-orders", { headers: { authorization: "Bearer proba-token-1234567890", "cf-connecting-ip": "10.175.0.2" } }), env: { APP_API_TOKEN: "proba-token-1234567890", PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" } });
    const d = await r.json(); assert.equal(r.status, 200, JSON.stringify(d).slice(0, 200)); assert.equal(d.bots.length, 13); assert.equal(cereri.filter((u) => u.includes("/api/v1/bot/orders")).length, 2);
  } finally { globalThis.fetch = fetchOrig; }
});
await test("monitorul: cererile spre worker au limită de timp", () => { const s = citeste("functions", "api", "monitor.js"); assert.equal((s.match(/signal:AbortSignal\.timeout\(/g) || []).length, 2); });

// ── interfața ──
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, localStorage: { getItem: () => null, setItem() {} } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["grid-calcul.js", "probabilitati.js", "scan.js", "asemanatoare.js", "t212.js", "actiuni-semnale.js"]) vm.runInContext(f === "actiuni-semnale.js" ? "var ActiuniSemnale = (function(GridCalcul){" + citeste("public", "lib", f) + "; return ActiuniSemnale;})(GridCalcul);" : citeste("public", "lib", f), ctx);
await test("Scan „În trecut”: +8 puncte pe 40 de intrări NU mai e verde (intră în zgomot); pe 2000 de intrări da", () => {
  const ist = (pe, n) => ({ x: { s: { n, pe, med: 1 }, l: { n, pe, med: 1 } }, baza: { s: { n: 5000, pe: 50, med: 0 }, l: { n: 5000, pe: 50, med: 0 } } });
  assert.equal(ctx.Scan.textIstoric(ist(58, 40), "x").semnif, 0); assert.equal(ctx.Scan.textIstoric(ist(58, 2000), "x").semnif, 1); assert.equal(ctx.Scan.textIstoric(ist(40, 2000), "x").semnif, -1);
  assert.match(citeste("public", "lib", "scan-ecran.js"), /t\.semnif === 1 \?/);
});
await test("Scan: forța față de BTC / QQQ în puncte procentuale („pp”), nu „%”", () => { assert.match(citeste("public", "lib", "scan-ecran.js"), /scPct\(x\.rel\)\.replace\("%", " pp"\)/); });
await test("Declarația: anul vânzării T212 după ora României (00:30 pe 1 ianuarie e în anul nou)", () => {
  const t = Date.parse("2026-12-31T22:30:00Z"), x = { inchis: t, rezultat: 10, qty: 1, cost: 100, incasat: 110, ticker: "AAPL_US_EQ" };
  const r27 = ctx.T212.raportAnual({ an: 2027, inchise: [x] }), r26 = ctx.T212.raportAnual({ an: 2026, inchise: [x] });
  assert.equal(r27.t212 ? r27.t212.n : r27.n, 1, JSON.stringify(Object.keys(r27))); assert.equal(r26.t212 ? r26.t212.n : r26.n, 0);
});
await test("asemănătoare: textul arată întâi MEDIANA (pe ea e verdictul), „% pe plus” alături", () => {
  const t = ctx.Asemanatoare.textSemafor({ n: 144, verdict: "nedovedit", cu: { plus: 0.6, med: 0.012 }, contra: { plus: 0.5, med: -0.003 } });
  assert.match(t, /fără bec împotrivă: mediana \+1,2%, 60% pe plus · cu unul împotrivă: mediana −0,3%, 50% pe plus, din 144/);
});
await test("Poarta: planul LUI rămâne pe ecran când contul n-a venit (nu mai trece tăcut la prețurile calculate)", () => {
  const r = ctx.ActiuniSemnale.planulMeu({ intrare: 100, stop: 92, cont: 0, fx: 0.22, calc: { intrare: 99, stop: 90, tinta: 110 } });
  assert.ok(r && r.intrare === 100 && r.m === null); assert.match(r.eroare, /Contul Trading 212 n-a venit/);
});
await test("Poarta: cifra „probat” spune câte ferestre de 20 de zile nu se suprapun și că stopul e ales pe aceleași zile", () => {
  assert.match(citeste("public", "lib", "actiuni-semnale.js"), /nIndep: Math\.floor\(per\[best\]\.n \/ ORIZONT\)/);
  assert.match(citeste("public", "lib", "t212-ecran.js"), /ferestre"\) \+ " de 20 de zile care nu se suprapun; stopul e ales cel mai bun pe aceleași zile, deci cifra e optimistă\)"/);
});
const ecr = citeste("public", "lib", "t212-ecran.js");
await test("Poarta: trendul și ATR-ul pe barele bursei (vinerea seara nu mai e aruncată)", () => { assert.match(ecr, /var bare = GridCalcul\.bareBursa\(b && b\.randuri \|\| \[\], Date\.now\(\)(, tk)?\), pret = /); });   /* v100.272: + simbolul (bara în formare pe bursa lui) */
await test("rândul de sus: futures necitit = necitit (nu 0); boții fără „investit” ⇒ „≥ …” și „N boți necitiți”", () => {
  assert.match(ecr, /Number\(cf\.usdt\.total\) : null \};/); assert.match(ecr, /sp\.botiFaraInvestit \? "≥ " : ""/);
});
await test("acțiunile din atribute: argumentul doar [A-Za-z0-9._-] (un apostrof dintr-un nume nu mai iese din șir)", () => {
  assert.ok(!/\(\\'' \+ escapeHtml\((p\.ticker|x\.simbol|x\.moneda)\)/.test(ecr)); assert.ok((ecr.match(/\.replace\(\/\[\^A-Za-z0-9\._-\]\/g, ""\)/g) || []).length >= 7);
});
await test("„Raportează în 7 zile”: zilele după ora României (la 01:30 pe 14.10 nu mai intră raportările din 13.10)", () => {
  const src = citeste("public", "lib", "rezultate.js"); assert.match(src, /timeZone: "Europe\/Bucharest" \}\)\.format\(new Date\(t\)\), azi = zR\(acum\), pana = zR\(acum \+ 7 \* ZI\)/);
});
await test("Monte Carlo vechi: sămânța din date și mulberry32 (aceleași cifre la reîncărcare), fără Math.random în simulare", () => {
  const a = citeste("public", "app.js"), i = a.indexOf("async function runMonteCarlo"), f = a.slice(i, a.indexOf("\n", a.indexOf("if(!result)", i)));
  assert.match(f, /seed:mcSamanta\(vals\)/); assert.match(f, /const rnd=mcMulberry\(mcSamanta\(vals\)\)/); assert.ok(!/Math\.random/.test(f));
});
await test("raportul de risc mai vechi de 36 de ore se spune pe față", () => {
  const ctxR = { RiscLuna: { concluzii: () => ({}) }, TextRo: globalThis.TextRo }; vm.createContext(ctxR); vm.runInContext(citeste("public", "lib", "risc-ecran.js"), ctxR);
  const acum = Date.parse("2026-10-13T12:00:00Z"), h = ctxR.rlHtml({ la: acum - 3 * 86400000, boti: null, actiuni: { n: 0 } }, { acum });
  assert.match(h, /Raportul e vechi de 3 zile/); assert.ok(!/vechi de/.test(ctxR.rlHtml({ la: acum - 3600000, actiuni: { n: 0 } }, { acum })));
});
await test("telefon: țintele de atingere de 44 px pe ecran tactil (înaintea regulii pandei, care rămâne ultima)", () => {
  const css = citeste("public", "app.css"); assert.match(css, /@media \(pointer:coarse\)\{[^}]*\.t212BtnLinie[^}]*min-height:44px/);
  assert.equal(pandaInainteaCozii(css), "");   // v100.258: pânda după orice regulă de tabel, înaintea blocului v100.224
});
await test("fila „Tot”: nota spune ce curs folosește (BNR din ziua X, același pentru toți boții)", () => { assert.match(citeste("public", "app.js"), /"cursul BNR din "\+t212\.bnr\.zi\.slice\(8\)/); });

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
