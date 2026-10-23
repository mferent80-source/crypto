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


// ---------------- C6 + 🔵3: limita de scriere și cozile ----------------
await test("C6: colectorul are loc de scriere pe istoric (40 de POST-uri pe minut trec), iar alertele au găleata lor", async () => {
  const kv = kvMem(), env = ENVi(kv), st = [];
  const postCol = (action, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?action=" + action, { method: "POST", headers: { authorization: "Bearer " + ENV.APP_API_TOKEN, origin: "http://127.0.0.1:8788", "content-type": "application/json", "x-radar-client": "colector", "x-forwarded-for": "10.196.0.1" }, body: JSON.stringify(corp) });
  for (let i = 0; i < 40; i++) st.push((await IB.onRequestPost({ request: postCol("adauga", { bot: "b" + i, intrare: { t: Date.now(), pretPerp: 1 } }), env })).status);
  assert.equal(st.filter((s) => s === 429).length, 0, st.join(","));
  const a = (await IB.onRequestPost({ request: postCol("alerte", { alerta: { t: Date.now(), nivel: "critic", titlu: "lichidarea la 6%" } }), env })).status;
  assert.equal(a, 200, "alerta trece și după un minut plin de scrieri");
  assert.match(citeste("functions", "api", "istoric-bot.js"), /requireApiAuth\(request,env,action==="alerte"\?"istoric-alerte":"istoric-write",30,150\)/);
});
await test("C6 / 🔵3: coada (KV și Discord) - în ordine, se oprește la primul eșec, renunță doar la ce e prea vechi; critic ține 24 h", async () => {
  const T = 1792000000000, H = 3600000, trimise = [];
  const coada = [{ t: T - 13 * H, m: { nivel: "info", titlu: "vechi" } }, { t: T - 13 * H, m: { nivel: "critic", titlu: "critic vechi" } }, { t: T - 1 * H, m: { nivel: "atentie", titlu: "a" } }, { t: T, m: { nivel: "info", titlu: "b" } }];
  const maxMs = (x) => (x.m.nivel === "critic" ? 24 : 12) * H;
  const r = await S.golesteCoadaPas(coada, { acum: T, maxMs, trimite: async (x) => { trimise.push(x.m.titlu); return x.m.titlu !== "a"; } });
  assert.deepEqual(trimise, ["critic vechi", "a"]); assert.deepEqual(r.renuntate.map((x) => x.m.titlu), ["vechi"]);
  assert.deepEqual(r.ramase.map((x) => x.m.titlu), ["a", "b"], "după primul eșec restul așteaptă");
  const r2 = await S.golesteCoadaPas([{ t: T, m: { titlu: "x" } }], { acum: T, maxMs, trimite: async () => { throw new Error("fără rețea"); } });
  assert.equal(r2.ramase.length, 1, "o excepție = eșec, nu pierdere");
});
await test("C6 colector: alerta ratată în KV intră în coada de pe disc și se reîncearcă; cozile au gardă de reintrare; turele grele stau 60 s după un 429", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /if \(!inKv && ok\) \{ coadaKv\.push\(\{ t: alertaKv\.t, m: alertaKv \}\); salveazaCoadaKv\(\); \}/);
  assert.match(c, /golesteCoadaKv\(\)\.catch\(\(e\) => jurnal\("coada kv", e\.message\)\);/);
  assert.match(c, /if \(golireDiscord \|\| CANAL !== "discord" \|\| !coadaDiscord\.length\) return;/);
  assert.match(c, /if \(S\.eLimitaDeRitm\(eroare\)\) ritmPauzaPana = Date\.now\(\) \+ 60000;/);
  assert.match(c, /const greleOk = Date\.now\(\) >= ritmPauzaPana;/);
  assert.match(c, /if \(greleOk\) turaProfil\(\)/);
});


// ---------------- 🔵 serverul ----------------
await test("🔵2 biletul prețului live: semnat cu o cheie a releului (RELEU_SECRET sau derivată), nu direct cu parola aplicației", async () => {
  const PV = await import(`../functions/api/pret-viu.js?t=${Math.random()}`), S0 = "JTO_USDT_PERP", acum = Date.now();
  const env = { APP_API_TOKEN: "parola-buna" }, cheie = await PV.cheieReleu(env);
  assert.ok(cheie && cheie !== env.APP_API_TOKEN, "cheia releului nu e parola");
  assert.equal(await PV.biletBun(cheie, S0, await PV.biletPentru(cheie, S0, acum), acum), true);
  assert.equal(await PV.biletBun(cheie, S0, await PV.biletPentru(env.APP_API_TOKEN, S0, acum), acum), false, "un bilet făcut cu parola goală nu mai trece");
  const sec = "s".repeat(40); assert.equal(await PV.cheieReleu({ APP_API_TOKEN: "x", RELEU_SECRET: sec }), sec, "RELEU_SECRET (≥ 32) are întâietate");
  assert.notEqual(await PV.cheieReleu({ APP_API_TOKEN: "x", RELEU_SECRET: "scurt" }), "scurt");
  assert.equal(await PV.cheieReleu({}), "", "fără parolă, fără cheie");
});
await test("🔵3 action=citeste: config-ul fără ntfyTopic cât canalul nu e ntfy (pagina îl arată doar pe canalul ntfy)", async () => {
  const kv = kvMem(); kv.m.set("config", JSON.stringify({ colectorLa: 5, canal: "discord", ntfyTopic: "radar-secret-123456", prag: { pierdere: 5 }, frana: { zi: 10 } }));
  const get = (q) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { headers: { authorization: "Bearer " + ENV.APP_API_TOKEN } });
  const c = JSON.parse(await (await IB.onRequestGet({ request: get("action=citeste&bot=b1"), env: ENVi(kv) })).text()).config;
  assert.equal(c.ntfyTopic, undefined); assert.equal(c.colectorLa, 5); assert.equal(c.canal, "discord"); assert.deepEqual(c.prag, { pierdere: 5 });
  kv.m.set("config", JSON.stringify({ colectorLa: 5, canal: "ntfy", ntfyTopic: "radar-secret-123456" }));
  const n = JSON.parse(await (await IB.onRequestGet({ request: get("action=citeste&bot=b1"), env: ENVi(kv) })).text()).config;
  assert.equal(n.ntfyTopic, "radar-secret-123456");
});
// bot-orders cu Pionex simulat (forma răspunsului real, cifre inventate)
const BOTp = (id) => ({ base: "XYZ.PERP", quote: "USDT", status: "open", strategyId: String(id), userId: "u-123", keyId: "k-456", createTime: 1780000000000,
  buOrderData: { status: "running", usdtInvestment: "200.00", marginBalance: "198.05", gridProfit: "2.8", totalRealizedProfit: "-1.25", totalFee: "-0.64", totalFundingFee: "-0.06", leverage: 5, trend: "long", bottom: "0.028", top: "0.033", row: 20 } });
async function botOrders(pionex, qs = "") {
  const vechi = globalThis.fetch;
  globalThis.fetch = async (url) => { const r = pionex(String(url)); return new Response(JSON.stringify(r), { status: 200, headers: { "content-type": "application/json" } }); };
  try {
    const { reseteazaRitmPionex } = await import("../functions/_shared/pionex.js"); if (reseteazaRitmPionex) reseteazaRitmPionex();
    const { onRequestGet } = await import(`../functions/api/bot-orders.js?t=${Math.random()}`);
    const res = await onRequestGet({ request: new Request("http://127.0.0.1:8788/api/bot-orders?" + qs, { headers: { authorization: "Bearer " + ENV.APP_API_TOKEN, "x-forwarded-for": "10.196.9." + Math.floor(Math.random() * 250) } }), env: { ...ENV, PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" } });
    return JSON.parse(await res.text());
  } finally { globalThis.fetch = vechi; }
}
const TICK = { result: true, data: { tickers: [{ symbol: "XYZ_USDT_PERP", close: "0.03" }] } };
await test("🔵3 bot-orders: obiectul Pionex brut spre pagină fără userId / keyId (restul neatins: buOrderData rămâne)", async () => {
  const d = await botOrders((u) => (u.includes("/bot/orders") ? { result: true, data: { results: [BOTp(1)], nextPageToken: null } } : TICK));
  assert.equal(d.bots.length, 1, JSON.stringify(d).slice(0, 200)); assert.equal(d.bots[0].brut.userId, undefined); assert.equal(d.bots[0].brut.keyId, undefined);
  assert.equal(d.bots[0].brut.buOrderData.row, 20); assert.equal(d.bots[0].brut.strategyId, "1");
});
await test("🔵7 bot-orders: peste 10 pagini de boți porniți ⇒ probleme.trunchiat (nu tăcere); results:null ⇒ probleme.listaNula", async () => {
  let pag = 0;
  const d = await botOrders((u) => (u.includes("/bot/orders") ? { result: true, data: { results: [BOTp(++pag)], nextPageToken: "pag" + pag } } : TICK));
  assert.equal(d.bots.length, 10); assert.equal(d.probleme && d.probleme.trunchiat, true);
  const g = await botOrders((u) => (u.includes("/bot/orders") ? { result: true, data: { results: null } } : TICK));
  assert.equal(g.bots.length, 0); assert.equal(g.probleme && g.probleme.listaNula, true);
});
await test("🔵12 răspunsurile /api/* au X-Content-Type-Options: nosniff (middleware-ul Functions); WebSocket-ul (101) trece neatins", async () => {
  const { onRequest } = await import(`../functions/_middleware.js?t=${Math.random()}`);
  const r = await onRequest({ next: async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }) });
  assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.equal(r.status, 200);
  const imutabil = new Response("{}", { status: 404 }); Object.defineProperty(imutabil, "headers", { value: { get: () => null, set: () => { throw new TypeError("immutable"); } } });
  const r2 = await onRequest({ next: async () => imutabil }); assert.equal(r2.status, 404);
  const ws = { status: 101, webSocket: {} }; assert.equal(await onRequest({ next: async () => ws }), ws);
});
await test("🔵11 history.js: PRAGMA / ALTER TABLE o singură dată pe izolat (nu la fiecare GET)", async () => {
  let pragma = 0; const db = { prepare: (sql) => ({ all: async () => { if (/PRAGMA/.test(sql)) pragma++; return { results: [{ name: "tenant" }] }; }, run: async () => ({}), bind: () => ({ all: async () => ({ results: [] }), first: async () => null }), first: async () => null }) };
  const H = await import(`../functions/api/history.js?t=${Math.random()}`);
  const cer = () => new Request("http://127.0.0.1:8788/api/history?type=x", { headers: { authorization: "Bearer " + ENV.APP_API_TOKEN, "x-forwarded-for": "10.196.8.1" } });
  await H.onRequestGet({ request: cer(), env: { ...ENV, DB: db } }); const dupaPrima = pragma;
  await H.onRequestGet({ request: cer(), env: { ...ENV, DB: db } });
  assert.ok(dupaPrima > 0, "prima cerere verifică schema"); assert.equal(pragma, dupaPrima, "a doua nu mai rulează PRAGMA");
});
await test("🔵10 scripturile de chei: cheile se tastează ascuns, copia în clar a lui .dev.vars se șterge, PID-ul se oprește doar dacă e colectorul", () => {
  const k = citeste("scripts", "pune-cheile.ps1"), d = citeste("scripts", "pune-discord.ps1");
  assert.match(k, /-AsSecureString/); assert.match(k, /CitesteAscuns "  Trading 212 - API Key"/); assert.match(k, /CitesteAscuns "  Trading 212 - API Secret"/);
  assert.doesNotMatch(k, /= Read-Host "  (Trading 212|Twelve Data)/);
  assert.match(k, /Remove-Item[^\n]*inainte-de-chei/); assert.match(d, /Remove-Item[^\n]*inainte-de-discord/);
  assert.match(d, /colector\.mjs/); assert.match(d, /CommandLine/);
});


// ---------------- 🔵 colectorul ----------------
await test("🔵1 starea boților: închișii fără `inchisLa` primesc ora o dată; la 30 de zile pleacă și din cunoscuți, și din starea alertelor; orfanii ies", () => {
  const ZIc = 86400000, T = Date.UTC(2026, 9, 14), stare = { _colector: {}, "t212-MU_US_EQ": { a: 1 }, vechi: { x: 1 }, orfan: { y: 1 }, viu: { z: 1 }, nou: { w: 1 } };
  const m = { cunoscuti: { vechi: { activ: false, inchisLa: T - 31 * ZIc }, faraOra: { activ: false }, viu: { activ: true }, nou: { activ: false, inchisLa: T - ZIc } } };
  S.curataStareBoti(stare, m, { viu: true }, T);
  assert.equal(m.cunoscuti.vechi, undefined); assert.equal(stare.vechi, undefined, "starea alertelor botului închis de 31 de zile");
  assert.equal(m.cunoscuti.faraOra.inchisLa, T, "fără oră ⇒ ora de acum, o singură dată");
  assert.equal(stare.orfan, undefined, "orfanul (nu mai e nici printre cunoscuți) iese");
  assert.ok(stare._colector && stare["t212-MU_US_EQ"] && stare.viu && stare.nou, "meta, acțiunile T212 și boții știuți rămân");
  assert.match(citeste("scripts", "colector.mjs"), /S\.curataStareBoti\(stareAlerte, m, acumIds, acum\);/);
});
await test("🔵2 capul colectorului spune ce face codul: după ~15 minute fără server anunță și așteaptă (MAX_ESECURI = 15)", () => {
  // v100.259 (auditul 23.10, punctul 4): nu mai „se oprește” - așteaptă cu pauze tot mai lungi; capul spune tot „15 minute la rand”
  const c = citeste("scripts", "colector.mjs");
  assert.match(c.slice(0, 700), /ASTEAPTA/); assert.doesNotMatch(c.slice(0, 700), /Se opreste singur/);
  assert.match(c, /const MAX_ESECURI = 15;/); assert.match(c.slice(0, 600), /15 minute la rand/); assert.doesNotMatch(c.slice(0, 600), /raspunde 5 minute/);
});
await test("🔵4 turaBandaLive și turaPerechiOra au gardă de reintrare (o trimitere lentă nu dublează alertele)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /if \(bandaLiveInLucru\) return;\n  bandaLiveInLucru = true;/); assert.match(c, /\} finally \{ bandaLiveInLucru = false; \}/);
  assert.match(c, /if \(perechiOraInLucru\) return;\n  perechiOraInLucru = true;/); assert.match(c, /\} finally \{ perechiOraInLucru = false; \}/);
});
await test("🔵5 radar-monitor: push „opportunity” pe scorul euristic nevalidat doar cu MONITOR_PUSH_NEVALIDAT=da (implicit oprit)", () => {
  const w = citeste("workers", "radar-monitor.js");
  assert.match(w, /if\(env\.MONITOR_PUSH_NEVALIDAT!=="da"\)return \{alerted:false,reason:"scor-nevalidat"\};/);
  assert.doesNotMatch(citeste("wrangler.monitor.toml"), /MONITOR_PUSH_NEVALIDAT/);
});
await test("🔵6 alerta „contra din pândă” spune că pânda judecă pe Binance, nu pe Pionex", () => {
  const o = M.pandaContra({ nume: "CRV", directie: "long", levier: 5, text: "CRV scade pe 84 de zile", lich: null });
  assert.match(o.mesaj, /Binance, nu Pionex/);
});
const PT = await import("./lib/ponderi-t212.mjs").catch(() => ({}));
await test("🔵7 ponderile T212: pe aceeași monedă ca înainte; cu monede amestecate (USD + GBX) nu se mai socotesc (fără alertă falsă de concentrare)", () => {
  const mon = (tk) => (/_US_EQ$/.test(tk) ? "USD" : /l_EQ$/.test(tk) ? "GBX" : "EUR");
  const cash = { total: 1000, free: 200 };
  const a = PT.ponderiT212([{ ticker: "MU_US_EQ", quantity: 2, currentPrice: 100 }, { ticker: "NVDA_US_EQ", quantity: 1, currentPrice: 200 }], cash, mon);
  assert.equal(a.amestec, null); assert.ok(Math.abs(a.pe.MU_US_EQ - 0.4) < 1e-12); assert.ok(Math.abs(a.pe.NVDA_US_EQ - 0.4) < 1e-12);
  const b = PT.ponderiT212([{ ticker: "MU_US_EQ", quantity: 2, currentPrice: 100 }, { ticker: "VUSAl_EQ", quantity: 10, currentPrice: 9000 }], cash, mon);
  assert.deepEqual(b.amestec, ["GBX", "USD"]); assert.deepEqual(b.pe, {});
  assert.deepEqual(PT.ponderiT212([{ ticker: "MU_US_EQ", quantity: 2, currentPrice: 100 }], { total: 0, free: 0 }, mon).pe, {}, "fără cont ⇒ nimic");
  const c = citeste("scripts", "colector.mjs");
  assert.equal((c.match(/ponderiT212\(poz, cash, ContIntreg\.monedaTicker\)/g) || []).length, 3, "toate cele trei locuri");
  assert.doesNotMatch(c, /usd \+= x\.quantity \* x\.currentPrice/);
});
await test("🔵8 fișa de închidere caută botul pe până la 3 pagini de boți închiși (nu doar primii 10)", async () => {
  const cerute = [], pagina = { "": { bots: [{ id: "a" }], nextPageToken: "p2" }, p2: { bots: [{ id: "b" }], nextPageToken: "p3" }, p3: { bots: [{ id: "c" }], nextPageToken: "p4" }, p4: { bots: [{ id: "d" }] } };
  const cere = async (u) => { cerute.push(u); const t = (/pageToken=([A-Za-z0-9]+)/.exec(u) || [])[1] || ""; return pagina[t]; };
  assert.equal((await S.botInchisDupaId("c", cere)).id, "c"); assert.equal(cerute.length, 3);
  cerute.length = 0; assert.equal(await S.botInchisDupaId("d", cere), null, "peste 3 pagini nu mai caută"); assert.equal(cerute.length, 3);
  assert.match(citeste("scripts", "colector.mjs"), /const x = await S\.botInchisDupaId\(id, cere\);/);
});
await test("🔵10 data/cont-bare: fișierele mai vechi de 30 de zile se șterg o dată pe zi; 🔵11 poza refuzată cu 429/5xx spune „cota KV”", () => {
  assert.deepEqual(S.deSters([{ nume: "a.json", mtime: 0 }, { nume: "b.json", mtime: 40 * 86400000 }, { nume: "c.tmp", mtime: 0 }], 41 * 86400000, 30 * 86400000), ["a.json"]);
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /function curataContBare\(\)/); assert.match(c, /curataContBare\(\);/);
  assert.match(c, /if \(r\.status === 429 \|\| r\.status >= 500\) jurnal\("poza: paznicul refuză scrierea/);
});
await test("🔵12 mesajele colectorului dau USDT cu O SINGURĂ zecimală; sub 0,05 nu apare „0,0”", () => {
  assert.match(M.minus24h("CRV", 30, -21.31, null, null).titlu, /−21,3 USDT/);
  assert.match(M.perechiOra("CRV", 3, 0.42).titlu, /\+0,4 USDT/);
  assert.match(M.perechiOra("CRV", 1, 0.03).titlu, /\+<0,1 USDT/);
  assert.match(M.faraPlan("CRV", { plus: 3.456, minus: 15.04, afaraOre: 12, nota: "" }).mesaj, /Propun \+3,5 \/ −15 USDT/);
  assert.doesNotMatch(citeste("scripts", "lib", "tura-pornire.mjs"), /toFixed\(2\)/);
});


// ---------------- revizia de securitate a ramurii: fără „oracol” ----------------
await test("S1 securitate: din rețea (Tailscale / Cloudflare) blocarea ține și pentru tokenul bun - altfel 429 = greșit, 200 = corect ar fi un oracol pentru ghicit", async () => {
  const requireApiAuth = await authProaspat();
  const net = { "x-forwarded-for": "100.64.0.9" };
  for (let i = 0; i < 10; i++) await requireApiAuth(cerere("ghicire" + i, net), ENV, "api", 90);
  assert.equal((await requireApiAuth(cerere(ENV.APP_API_TOKEN, net), ENV, "api", 90)).status, 429, "din rețea tokenul bun așteaptă minutul");
  const cf = { "cf-connecting-ip": "203.0.113.5", "cf-ray": "abc", "x-forwarded-for": "203.0.113.5" };
  for (let i = 0; i < 10; i++) await requireApiAuth(cerere("g" + i, cf), ENV, "api", 90);
  assert.equal((await requireApiAuth(cerere(ENV.APP_API_TOKEN, cf), ENV, "api", 90)).status, 429, "pe Cloudflare la fel");
  // local (direct pe 127.0.0.1, fără proxy: colectorul, browserul de pe PC) tokenul bun trece și când IP-ul e blocat
  for (let i = 0; i < 10; i++) await requireApiAuth(cerere("vechi" + i), ENV, "api", 90);
  assert.equal((await requireApiAuth(cerere(ENV.APP_API_TOKEN), ENV, "api", 90)).ok, true);
});
await test("S1 securitate: prin tunelul Cloudflare (cf-ray + cf-connecting-ip + x-forwarded-for) un client nu scapă schimbându-și x-forwarded-for", async () => {
  const requireApiAuth = await authProaspat();
  const st = []; for (let i = 0; i < 12; i++) st.push((await requireApiAuth(cerere("g" + i, { "cf-connecting-ip": "198.51.100.7", "cf-ray": "r", "x-forwarded-for": "10.9.9." + i }), ENV, "api", 90)).status);
  assert.equal(st.filter((s) => s === 429).length, 2, st.join(","));
});

console.log(`\n${picate ? "PICĂ" : "TRECE"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
