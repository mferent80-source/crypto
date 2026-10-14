// Probele v100.196 / colector v101.116 (14.10.2026 seara, el: „repară și fă tot” după auditul sever, zona COLECTOR + ALERTE + SERVER + PAZNIC):
//  S1  frâna anti-ghicit nu mai blochează parola BUNĂ (nici în memorie, nici pe KV); colectorul ia AUTH_* drept cădere, cu anunț
//  C3  lista de boți goală (Pionex results:null) cu boți activi cunoscuți ⇒ anunț „nu-ți mai văd boții”, nu tăcere
//  C2  noaptea o bătaie picată se reîncearcă după 1 minut (nu dă alarma falsă „colectorul tace”)
//  C1  pulsul paznicului = bucla alertelor (turaLa din poză), nu ceasul pozei; bătaia din colector.pid nu se învechește într-o tură lungă
//  C4  verdictele cu simbol simplu (Trend 12 luni, topul pe sectoare) își cer barele cu `yahoo=`; 404 nu mai stă 20 h
//  C5  starea Trend / sectoare pe disc (fără retrimitere la repornire); jurnalul păstrează PRIMUL verdict al zilei
//  C6  colectorul nu-și mai consumă limita: alerta ratată în KV intră în coadă și se reîncearcă; găleată separată pentru alerte
//  St2 registrul BH primește `bilant.teste` (serverul nu le mai aruncă)
//  + 🔵: ipOf, biletul prețului live, config fără ntfyTopic, brut fără userId/keyId, trunchiat, nosniff, coada Discord, starea boților, mesajele cu o zecimală…
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.196 · colectorul, alertele, serverul și paznicul · proba\n");

const ENV = { APP_API_TOKEN: "parola-buna-de-proba-0123456789" };
const cerere = (token, antete = {}) => new Request("http://127.0.0.1:8788/api/istoric-bot?action=config", { headers: Object.assign(token ? { authorization: "Bearer " + token } : {}, antete) });
const authProaspat = async () => (await import(`../functions/_shared/auth.js?t=${Math.random()}`)).requireApiAuth;

// ---------------- S1 ----------------
await test("S1: după 12 parole greșite de pe același IP, parola BUNĂ trece (colectorul nu mai e încuiat); ghicitul rămâne oprit", async () => {
  const requireApiAuth = await authProaspat();
  const r = []; for (let i = 0; i < 12; i++) r.push(await requireApiAuth(cerere("parola-veche"), ENV, "istoric-read", 300));
  assert.deepEqual(r.map((x) => x.status), [401, 401, 401, 401, 401, 401, 401, 401, 401, 401, 429, 429]);
  const bun = await requireApiAuth(cerere(ENV.APP_API_TOKEN, { "x-radar-client": "colector" }), ENV, "istoric-read", 300, 1200);
  assert.equal(bun.ok, true, "parola bună: " + JSON.stringify(bun));
  const iar = await requireApiAuth(cerere("alta-ghicire"), ENV, "istoric-read", 300);
  assert.equal(iar.status, 429, "ghicitul tot 429");
});
await test("S1: pe KV (contorul între izolate) la fel - parola bună trece peste un contor plin, cea greșită primește 429", async () => {
  const requireApiAuth = await authProaspat();
  const kv = new Map(); const API_RATE_LIMIT = { get: async (k) => (k.startsWith("auth-fail:") ? "10" : kv.get(k) || null), put: async (k, v) => { kv.set(k, v); } };
  const env = { ...ENV, API_RATE_LIMIT };
  assert.equal((await requireApiAuth(cerere(ENV.APP_API_TOKEN), env, "istoric-read", 300)).ok, true);
  assert.equal((await requireApiAuth(cerere("gresita"), env, "istoric-read", 300)).status, 429);
});
await test("S1 🔵1: prin Tailscale (x-forwarded-for pus de proxy) un client nu-și alege „IP-ul” cu cf-connecting-ip + cf-ray", async () => {
  const requireApiAuth = await authProaspat();
  const st = []; for (let i = 0; i < 12; i++) st.push((await requireApiAuth(cerere("ghicire" + i, { "x-forwarded-for": "100.64.0.7", "cf-connecting-ip": "10.0.0." + i, "cf-ray": "x" }), ENV, "api", 90)).status);
  assert.equal(st.filter((s) => s === 429).length, 2, "al 11-lea și al 12-lea: " + st.join(","));
});

// ---------------- colectorul: căderea de autentificare ----------------
const S = await import("./lib/sanatate-colector.mjs").catch(() => ({}));
await test("S1 colector: AUTH_RATE_LIMITED / AUTH_INVALID / AUTH_REQUIRED sunt CĂDERE, nu limită de ritm; RATE_LIMITED simplu rămâne limită", () => {
  const e = (status, cod) => Object.assign(new Error(cod), { status, cod });
  assert.equal(S.eCadereAuth(e(429, "AUTH_RATE_LIMITED")), true);
  assert.equal(S.eCadereAuth(e(401, "AUTH_INVALID")), true);
  assert.equal(S.eCadereAuth(Object.assign(new Error("AUTH_REQUIRED"), { status: 401 })), true, "și doar din mesaj");
  assert.equal(S.eCadereAuth(e(429, "RATE_LIMITED")), false);
  assert.equal(S.eLimitaDeRitm(e(429, "RATE_LIMITED")), true);
  assert.equal(S.eLimitaDeRitm(e(429, "AUTH_RATE_LIMITED")), false);
  assert.equal(S.eCadereAuth(null), false);
});
await test("S1 colector: t212Sanatate nu mai înghite AUTH_RATE_LIMITED; bot-orders respins pe parolă ⇒ anunț după 3 min (nu 10), cu mesajul lui", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /if \(S\.eLimitaDeRitm\(e\)\) return;/, "t212Sanatate");
  assert.doesNotMatch(c, /if \(e\.status === 429\) return;/);
  assert.match(c, /\{ status: r\.status, cod: d && d\.error \|\| null \}/, "cere() poartă codul erorii");
  assert.match(c, /const auth = S\.eCadereAuth\(e\), prag = auth \? 3 \* 60000 : 10 \* 60000;/);
  assert.match(c, /auth \? MesajeColector\.authRespins\(/);
});
const M = await import("./lib/mesaje-colector.mjs");
await test("S1 mesajul: „serverul Radarului respinge colectorul” - critic, cu ce face el", () => {
  const m = M.authRespins(4, "AUTH_INVALID");
  assert.equal(m.nivel, "critic"); assert.match(m.titlu, /respinge colectorul/); assert.match(m.mesaj, /4 minute/); assert.match(m.mesaj, /👉 /); assert.match(m.mesaj, /parola/);
});


// ---------------- C3: lista goală cu boți activi cunoscuți ----------------
await test("C3: lista goală + boți activi cunoscuți ⇒ după 10 min „nu-ți văd boții” (o dată la 3 h); la revenire „îi văd iar”", () => {
  const T = Date.UTC(2026, 9, 14, 20, 0), MIN = 60000, m = { cunoscuti: { a: { activ: true, nume: "SOL" }, b: { activ: false, nume: "ETH" }, c: { activ: true, nume: "CRV" } } };
  assert.equal(S.listaGoalaPas(m, { goala: true, acum: T }).tip, null, "abia a început");
  assert.equal(S.listaGoalaPas(m, { goala: true, acum: T + 9 * MIN }).tip, null);
  const r = S.listaGoalaPas(m, { goala: true, acum: T + 10 * MIN });
  assert.equal(r.tip, "orb"); assert.equal(r.minute, 10); assert.deepEqual(r.nume, ["SOL", "CRV"]);
  m.listaGoalaAnuntat = T + 10 * MIN;   // apelantul o notează DOAR după ce mesajul a plecat
  assert.equal(S.listaGoalaPas(m, { goala: true, acum: T + 40 * MIN }).tip, null, "nu repetă în 3 h");
  assert.equal(S.listaGoalaPas(m, { goala: true, acum: T + 10 * MIN + 3 * 3600000 }).tip, "orb", "repetă la 3 h");
  const v = S.listaGoalaPas(m, { goala: false, acum: T + 4 * 3600000 });
  assert.equal(v.tip, "vede"); assert.equal(m.listaGoalaDe, 0);
});
await test("C3: lista goală fără boți activi cunoscuți (i-ai închis) ⇒ tăcere; lista plină fără anunț ⇒ nimic de trimis", () => {
  const T = Date.UTC(2026, 9, 14, 20, 0), m = { cunoscuti: { b: { activ: false, nume: "ETH" } } };
  assert.equal(S.listaGoalaPas(m, { goala: true, acum: T }).tip, null);
  assert.equal(S.listaGoalaPas(m, { goala: true, acum: T + 3600000 }).tip, null);
  assert.equal(S.listaGoalaPas({ cunoscuti: { a: { activ: true } } }, { goala: false, acum: T }).tip, null);
});
await test("C3 mesajele: critic „nu-ți mai văd boții” cu numele + ce merge totuși; info la revenire", () => {
  const o = M.botiNevazuti(12, ["SOL", "CRV"]);
  assert.equal(o.nivel, "critic"); assert.ok(o.titlu.length <= 60, o.titlu); assert.match(o.mesaj, /12 minute/); assert.match(o.mesaj, /SOL, CRV/); assert.match(o.mesaj, /lichidare/); assert.match(o.mesaj, /👉 /);
  const i = M.botiVazutiIar(); assert.equal(i.nivel, "info"); assert.match(i.titlu, /vede iar/);
});
await test("C3 colector: pasul listei goale e legat în tură, după fișele de închidere, iar starea se notează DOAR după trimitere", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const lg = S\.listaGoalaPas\(m, \{ goala: listaGoala, acum \}\);/);
  assert.match(c, /if \(lg\.tip === "orb" && \(await anuntaMesaj\(MesajeColector\.botiNevazuti\(lg\.minute, lg\.nume\)\)\)\) m\.listaGoalaAnuntat = acum;/);
  assert.match(c, /if \(lg\.tip === "vede" && \(await anuntaMesaj\(MesajeColector\.botiVazutiIar\(\)\)\)\) m\.listaGoalaAnuntat = 0;/);
  assert.ok(c.indexOf("const lg = S.listaGoalaPas") > c.indexOf("if (!fisa && listaGoala) continue;"), "după bucla de închideri");
});


// ---------------- C2 + C1: paznicul ----------------
const Poza = await import("./lib/poza.mjs");
const W = await import("../paznic/worker.mjs");
const MINp = 60000;
function lumePaznic() {
  const kv = new Map(), trimise = [];
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1/abc", PAZNIC_TOKEN: "t".repeat(32) };
  const f = async (u, o) => { trimise.push(JSON.parse(o.body)); return { ok: true }; };
  return { env, kv, trimise, f };
}
await test("C2: noaptea (02:00 RO) o bătaie picată la minutul 20 se reîncearcă după 1 minut ⇒ nicio alarmă falsă „colectorul tace”", async () => {
  const T0 = Date.parse("2026-10-14T23:00:00Z"), w = lumePaznic();
  let paznicLa = 0; const picaLa = new Set([20]), batai = [];
  for (let m = 0; m <= 90; m++) {
    const acum = T0 + m * MINp;
    if (Poza.bataieNecesara({ acum, pozaOkLa: 0, paznicLa })) {
      paznicLa = acum;
      if (picaLa.has(m)) paznicLa = Poza.paznicLaDupaEsec(acum);
      else { await W.bataie(w.env, { pid: 1 }, acum, w.f); batai.push(m); }
    }
    if (m % 10 === 0) await W.verifica(w.env, acum, w.f);
  }
  assert.deepEqual(w.trimise.map((x) => x.content), [], "mesaje: " + JSON.stringify(w.trimise.map((x) => x.content)));
  assert.equal(batai[1], 21, "reîncercarea la minutul 21: " + batai.join(","));
});
await test("C2: ziua o bătaie picată se reîncearcă tot după 1 minut; colectorul folosește paznicLaDupaEsec și pentru răspunsul refuzat (!r.ok)", () => {
  const zi = Date.parse("2026-10-14T09:00:00Z"), p = Poza.paznicLaDupaEsec(zi);
  assert.equal(Poza.bataieNecesara({ acum: zi + MINp - 1, pozaOkLa: 0, paznicLa: p }), false);
  assert.equal(Poza.bataieNecesara({ acum: zi + MINp, pozaOkLa: 0, paznicLa: p }), true);
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /if \(!r\.ok\) \{ jurnal\("paznic: bataia refuzata", r\.status\); paznicLa = paznicLaDupaEsec\(Date\.now\(\)\); \}/);
  assert.match(c, /catch \(e\) \{ jurnal\("paznic: bataia n-a plecat", e\.message\); paznicLa = paznicLaDupaEsec\(Date\.now\(\)\); \}/);
});
await test("C1: poza poartă `turaLa` (ultima tură a alertelor TERMINATĂ), imediat după `la`", () => {
  const p = Poza.construiestePoza({ acum: 1792000000000, turaLa: 1791999900000, versiune: "v", boti: [], t212: [], simboluri: [] });
  assert.equal(p.turaLa, 1791999900000);
  assert.deepEqual(Object.keys(p).slice(0, 2), ["la", "turaLa"]);
  assert.equal(Poza.construiestePoza({ acum: 5, boti: [], t212: [], simboluri: [] }).turaLa, null, "fără tură încă = null, nu 0");
});
await test("C1: paznicul socotește tăcerea pe turaLa din poză - poza proaspătă cu bucla oprită de 31 min ⇒ „alertele botului stau”", async () => {
  const T0 = Date.UTC(2026, 9, 14, 10, 0), w = lumePaznic();
  await W.bataie(w.env, { pid: 1 }, T0 - 60 * MINp, w.f);
  await W.pozaScrie(w.env, JSON.stringify({ la: T0 + 30 * MINp, turaLa: T0 - MINp, boti: [] }));
  const r = await W.verifica(w.env, T0 + 30 * MINp, w.f);
  assert.equal(r.stare, "anuntat");
  assert.match(w.trimise[0].content, /alertele botului stau de 31 de minute/); assert.match(w.trimise[0].embeds[0].description, /poza/);
  // bucla revine (turaLa nou) ⇒ „a revenit”
  await W.pozaScrie(w.env, JSON.stringify({ la: T0 + 40 * MINp, turaLa: T0 + 39 * MINp, boti: [] }));
  assert.equal((await W.verifica(w.env, T0 + 40 * MINp, w.f)).stare, "revenit");
});
await test("C1: poza unui colector vechi (fără turaLa) ține loc de puls ca înainte; turaLa din viitor nu păcălește", async () => {
  const T0 = Date.UTC(2026, 9, 14, 10, 0), w = lumePaznic();
  await W.bataie(w.env, { pid: 1 }, T0 - 60 * MINp, w.f);
  await W.pozaScrie(w.env, JSON.stringify({ la: T0, boti: [] }));
  assert.equal((await W.verifica(w.env, T0 + 5 * MINp, w.f)).stare, "bate");
  const v = lumePaznic(); await W.bataie(v.env, { pid: 1 }, T0 - 60 * MINp, v.f);
  await W.pozaScrie(v.env, JSON.stringify({ la: T0, turaLa: T0 + 999 * MINp, boti: [] }));
  assert.equal((await W.verifica(v.env, T0 + 5 * MINp, v.f)).stare, "bate", "turaLa > la se ia drept la");
});
await test("C1 colector: turaLa ținut la sfârșitul turei, dus în poză; bătaia pleacă doar dacă bucla a mers în ultimele 5 min; colector.pid bate la 10 s", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /try \{ await tura\(\); turaGataLa = Date\.now\(\); \} catch \(e\) \{ jurnal\("tură", e\.message\); \}/);
  assert.match(c, /construiestePoza\(\{ acum: Date\.now\(\), turaLa: turaGataLa \|\| null,/);
  assert.match(c, /if \(Date\.now\(\) - turaGataLa > 5 \* 60000\) return;/);
  assert.match(c, /setInterval\(\(\) => \{ bate\(\); turaPoza\(\)/);
});


// ---------------- C4 / C5 / 🔵4 / St2: jurnalul verdictelor ----------------
const TV = await import("./lib/tura-verdicte.mjs");
await test("C4: barele verdictelor - simbolul T212 (…_EQ) cu ticker=, simbolul simplu (Trend 12 luni, topul pe sectoare) cu yahoo=", async () => {
  assert.equal(TV.caleBareZi("MU_US_EQ"), "/api/t212?action=preturi&interval=1d&ticker=MU_US_EQ");
  assert.equal(TV.caleBareZi("VOW3d_EQ"), "/api/t212?action=preturi&interval=1d&ticker=VOW3d_EQ");
  assert.equal(TV.caleBareZi("FFIV"), "/api/t212?action=preturi&interval=1d&yahoo=FFIV");
  assert.equal(TV.caleBareZi("BRK-B"), "/api/t212?action=preturi&interval=1d&yahoo=BRK-B");
  // tura întreagă, cu un jurnal real în formă: SNDK din Trend, MU din idei, BTC din Poarta gridului
  const T = Date.UTC(2026, 9, 14, 12, 0), ZIv = 86400000, cerute = [];
  const vc = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl }; vc.window = vc;
  const vm = await import("node:vm"); vm.createContext(vc); vm.runInContext(citeste("public", "lib", "verdicte.js"), vc);
  const jr = [{ s: "trend-12-1", k: "SNDK", n: "top", p: 1482.33, t: T - 40 * ZIv }, { s: "idei", k: "MU_US_EQ", n: "cumpar", p: 100, t: T - 40 * ZIv }];
  const d = { acum: T, jurnal: () => {}, Verdicte: vc.Verdicte, GridCalcul: { bareBursa: (r) => r.map((x) => ({ t: x.time, c: x.close })), bare: (k) => k },
    cere: async (c) => (c.includes("action=verdicte") ? { verdicte: jr } : c.includes("action=risc") ? { risc: null } : c.includes("action=cazuri") ? { cazuri: null } : c.includes("action=idei") ? { idei: null, istoric: [] } : {}),
    trimite: async () => ({ ok: true }), bareZi: async (c) => { cerute.push(c); return { randuri: [] }; } };
  await TV.turaVerdicte(d, { umplutDinUrma: true, ziLog: "2026-10-14" });
  assert.ok(cerute.includes("/api/t212?action=preturi&interval=1d&yahoo=SNDK"), JSON.stringify(cerute));
  assert.ok(cerute.includes("/api/t212?action=preturi&interval=1d&ticker=MU_US_EQ"));
  assert.ok(!cerute.some((c) => /ticker=SNDK/.test(c)));
});
await test("C4: un 404 al barelor se ține minte 3 h (nu 20 h); C5: starea Trend / sectoare pe disc (nu se retrimit la repornire)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /if \(Date\.now\(\) - x\.la < \(x\.lipsa \? 3 : 20\) \* 3600000\)/);
  assert.match(c, /const sectoareStare = stareDeDisc\("sectoare-stare\.json"\)/);
  assert.match(c, /const trendStare = stareDeDisc\("trend-stare\.json"\);/);
  assert.match(c, /scrieStareDisc\("trend-stare\.json", trendStare\)/);
  assert.match(c, /scrieStareDisc\("sectoare-stare\.json", sectoareStare\)/);
});

const IB = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`);
function kvMem() { const m = new Map(); return { m, get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, list: async () => ({ keys: [], list_complete: true }) }; }
const ENVi = (kv) => ({ APP_API_TOKEN: ENV.APP_API_TOKEN, ISTORIC: kv });
const post = (action, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?action=" + action, { method: "POST", headers: { authorization: "Bearer " + ENV.APP_API_TOKEN, origin: "http://127.0.0.1:8788", "content-type": "application/json" }, body: JSON.stringify(corp) });
await test("C5 / 🔵4: jurnalul verdictelor păstrează PRIMUL verdict al zilei (retrimiterea de după-amiază nu-l mai înlocuiește pe cel de dimineață)", async () => {
  const kv = kvMem(), acum = Date.now(), dim = acum - 1000;
  assert.equal((await IB.onRequestPost({ request: post("verdict", { verdicte: [{ s: "poarta-t212", k: "MU_US_EQ", n: "cumpara", p: 100, t: dim }] }), env: ENVi(kv) })).status, 200);
  await IB.onRequestPost({ request: post("verdict", { verdicte: [{ s: "poarta-t212", k: "MU_US_EQ", n: "asteapta", p: 104, t: acum }] }), env: ENVi(kv) });
  const l = JSON.parse(kv.m.get("verdicte:jurnal"));
  assert.equal(l.length, 1); assert.equal(l[0].n, "cumpara"); assert.equal(l[0].p, 100);
});
await test("🔵4: un verdict al PAGINII (Poarta) cu `t` mai vechi de 10 min e refuzat; cele ale colectorului (idei din istoric) trec", async () => {
  const kv = kvMem(), vechi = Date.now() - 3 * 86400000;
  const r = await IB.onRequestPost({ request: post("verdict", { verdicte: [{ s: "poarta-grid", k: "BTC_USDT_PERP", n: "porneste", p: 60000, t: vechi }] }), env: ENVi(kv) });
  assert.equal(r.status, 400);
  const r2 = await IB.onRequestPost({ request: post("verdict", { verdicte: [{ s: "idei", k: "MU_US_EQ", n: "cumpar", p: 90, t: vechi }] }), env: ENVi(kv) });
  assert.equal(r2.status, 200);
});
await test("St2: action=cazuri păstrează `bilant.teste` (curățat: nume ≤ 120, p, difMed, verdict) ⇒ registrul BH le primește", async () => {
  const kv = kvMem();
  const corp = { la: 1, cazuri: [{ a: 1 }], bilant: { adx: "x", sem: "y", teste: [{ nume: "Boții porniți cu ADX sub 20 față de cei în trend (peste 25)", p: 0.03, difMed: 0.4, verdict: "dovedit" }, { nume: "<b>" + "z".repeat(300), p: "rău", difMed: null, verdict: 5 }, null] } };
  assert.equal((await IB.onRequestPost({ request: post("cazuri", corp), env: ENVi(kv) })).status, 200);
  const b = JSON.parse(kv.m.get("cazuri")).bilant;
  assert.equal(b.adx, "x"); assert.equal(b.teste.length, 2);
  assert.deepEqual(b.teste[0], { nume: "Boții porniți cu ADX sub 20 față de cei în trend (peste 25)", p: 0.03, difMed: 0.4, verdict: "dovedit" });
  assert.equal(b.teste[1].nume.length, 120); assert.equal(b.teste[1].p, null); assert.equal(b.teste[1].verdict, null);
});

console.log(`\n${picate ? "PICĂ" : "TRECE"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
