// Proba v100.367 (19.11.2026, el: „continua” ⇒ pagina Alerte „ca Jurnalul”; hotărârile LUI după auditul cu 2 revizori: zgomotul „și pe Discord”,
// dreptatea „spun cinstit + registru”, mesajele „spun cifra de pe viu”, toate 4 graficele; bugurile 🔴1–7 reparate fără întrebare).
//  A - bugurile: categoria / drumul alertelor de acțiuni (🔴1), mesajul netăiat (🔴2), „nou” / „necitite” după sosire (🔴3), eroarea la vedere (🔴4),
//      alerta urcată în Radar și când Discordul pică (🔴5), „% azi” cu cifra de ieri (🔴6), „ieșit din grid” în grid (🔴7)
//  B - zgomotul: repetarea aceleiași chei sub 24 h stă doar în Radar (escaladarea trece; lichidarea / stopul / frâna / evenimentele mari mereu)
//  C - mesajele: „intrarea sugerată” fără „+X % pe trade” promis ⇒ cifra de pe viu; „gridul prea larg” ⇒ nedovedit pe boții lui
//   node scripts/proba-v100367.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("V100.367 · Alertele cinstite\n");

// ---------------- (A1) categoria și drumul ----------------
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, Intl, isFinite, TextRo: globalThis.TextRo }; ctx.globalThis = ctx;
vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "alerte-ecran.js").split("// ---- ecranul ----")[0], ctx);
const AC = ctx.AlCentru;
await test("A1 categoria: Consilierul, intrarea sugerată, gărzile, becul 1z, „aștept”, simbolurile urmărite ⇒ Acțiuni; frâna ⇒ Boți; drumul fiecăreia", () => {
  for (const k of ["consilier-AVGO_US_EQ", "sltp-intrare-RANDAS-2026-11-19", "sltp-sl-X", "garda-stop", "bec1z-MU_US_EQ", "astept-WDC_US_EQ", "sim-miscare-MIGAMU-2026-11-19", "sim-insider-NVDA"]) assert.equal(AC.categorie({ cheie: k }), "actiuni", k);
  assert.equal(AC.categorie({ cheie: "frana" }), "boti"); assert.equal(AC.categorie({ cheie: "vreme-crypto" }), "piata"); assert.equal(AC.categorie({ cheie: "grila", bot: "1" }), "boti");
  assert.equal(AC.drum({ cheie: "consilier-AVGO_US_EQ" }).pag, "t212"); assert.equal(AC.drum({ cheie: "sim-miscare-MIGAMU-2026-11-19" }).pag, "alertsExt");
  assert.equal(AC.drum({ cheie: "tradezilei" }).pag, "tradezilei"); assert.equal(AC.drum({ cheie: "frana" }).pag, "comportament"); assert.equal(AC.drum({ cheie: "raport-actiuni" }).pag, "jurnaltrade");
  assert.equal(AC.drum({ cheie: "busola-veche" }).pag, "health"); assert.equal(AC.drum({ cheie: "colector" }).pag, "health");
});
await test("A3 nou / necitite după SOSIRE (primit), nu după ceasul alertei; o alertă urcată cu întârziere e tot nouă", () => {
  const vazut = 1000, x = { t: 500, primit: 2000 }; assert.equal(AC.sosit(x), 2000); assert.ok(AC.sosit(x) > vazut); assert.equal(AC.sosit({ t: 700 }), 700);
});
await test("B3 repetările: aceeași cheie + bot sub 24 h se adună sub cazul cel mai nou (×N), escaladările rămân rânduri separate", () => {
  const H = 3600000, l = [{ t: 10 * H, cheie: "consilier-AVGO_US_EQ", nivel: "critic", titlu: "AVGO · Ieși" }, { t: 9 * H, cheie: "consilier-AVGO_US_EQ", nivel: "atentie", titlu: "AVGO · Atenție" },
    { t: 8 * H, cheie: "consilier-AVGO_US_EQ", nivel: "critic", titlu: "AVGO · Ieși" }, { t: 7 * H, cheie: "p-margine", bot: "5", nivel: "atentie", titlu: "XMR" }, { t: 6 * H, cheie: "p-margine", bot: "6", nivel: "atentie", titlu: "LIT" }, { t: -20 * H, cheie: "consilier-AVGO_US_EQ", nivel: "critic", titlu: "vechi" }];
  const g = AC.grupeaza(l);
  assert.equal(g.length, 4); assert.equal(g[0].rep.length, 2); assert.equal(g[0].titlu, "AVGO · Ieși"); assert.equal(g[1].cheie, "p-margine"); assert.equal(g[3].titlu, "vechi");
});

// ---------------- (A2) ruta ----------------
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "t".repeat(40);
await test("A2 ruta: mesajul până la 2.000 de semne, cu „…” peste; cheia până la 64; păstrează doarRadar / repetare; adaugă primit", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const h = { "cf-connecting-ip": "10.0.6.1", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" };
  const lung = "x".repeat(2500), cheie = "t212-APLD_US_EQ-trail7-2026-11-19-lung";
  const r = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=alerte", { method: "POST", headers: h, body: JSON.stringify({ alerta: { t: Date.now(), nivel: "info", titlu: "T", mesaj: lung, cheie, doarRadar: true, repetare: true } }) }), env });
  assert.equal(r.status, 200, await r.text()); const a = JSON.parse(env.ISTORIC.m.get("alerte"))[0];
  assert.equal(a.mesaj.length, 2000); assert.ok(a.mesaj.endsWith("…")); assert.equal(a.cheie, "t212-APLD_US_EQ-trail7-2026-11-19-lung"); assert.equal(a.doarRadar, true); assert.equal(a.repetare, true); assert.ok(a.primit > 0);
});

// ---------------- (A4) pagina: eroarea, „văzut”, subtitlul, „Doar importante” ----------------
const ec = citeste("public", "lib", "alerte-ecran.js");
await test("A4 pagina: eroarea se vede și cu o listă veche; „actualizat” doar după o citire reușită; „văzut” după citire reușită + 10 s pe pagină", () => {
  assert.match(ec, /alSt\.err \? '<p class="tbWarn alEroare">/); assert.match(ec, /alSt\.okLa/); assert.doesNotMatch(ec, /alSt\.la = Date\.now\(\) - 30000/);
  assert.match(ec, /setTimeout\(alMarcheazaVazut, 10000\)/); assert.doesNotMatch(ec, /aceleași ca pe Discord/); assert.match(ec, /function alImpAcum\(\) \{ return !!alSt\.imp; \}/);
});

// ---------------- (A5) colectorul ----------------
const col = citeste("scripts", "colector.mjs");
await test("A5 colectorul: alerta necitită de KV intră în coada KV ORICE ar face Discordul / ntfy (și cele doar în Radar)", () => {
  const f = col.slice(col.indexOf("async function trimiteAlerta("), col.indexOf("async function trimiteAlerta(") + 6000);
  assert.match(f, /if \(!inKv\) \{ coadaKv\.push\(\{ t: alertaKv\.t, m: alertaKv \}\); salveazaCoadaKv\(\); \}/); assert.doesNotMatch(f, /if \(!inKv && ok\)/);
  assert.match(f, /doarRadar: !!m\.doarRadar, repetare: !!m\.repetare/);
});

// ---------------- (A6, A7) textele ----------------
const pz = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "poza.mjs")).href);
await test("A6 „% azi”: aceeași mișcare (aceeași închidere de dinainte) nu se anunță a doua oară la deschiderea sesiunii noi; textul spune ședința, nu „azi”", () => {
  const c = Array.from({ length: 20 }, (_, k) => 100 + (k % 2)), s = { s: "MIGA.MU", closes30: c, pret: 90.3, prev: 100 };
  const a = pz.alerteSimboluri([s], [], Date.UTC(2026, 10, 19, 8, 36)), b = pz.alerteSimboluri([s], [], Date.UTC(2026, 10, 19, 9, 2));
  assert.equal(a.length, 1); assert.ok(a[0].dupa && a[0].dupa === b[0].dupa, "aceeași mișcare ⇒ aceeași cheie „dupa”"); assert.doesNotMatch(a[0].titlu, / azi,/); assert.match(a[0].titlu, /în ultima ședință/);
  const f = col.slice(col.indexOf("alerteSimboluri(poza.simboluri"), col.indexOf("alerteSimboluri(poza.simboluri") + 600);
  assert.match(f, /if \(st\[a\.cheie\] \|\| \(a\.dupa && st\[a\.dupa\]\)\) continue;/); assert.match(f, /if \(a\.dupa\) st\[a\.dupa\] = POL\.ziRo\(Date\.now\(\)\);/);
});
await test("A7 „p-margine”: prețul e ÎN grid ⇒ „încă în grid, aproape de margine”, nu „Ieșit din grid”", () => {
  const al = citeste("public", "lib", "alerte.js"); assert.doesNotMatch(al, /msg\("Ieșit din grid, botul nu mai face perechi"/); assert.match(al, /Încă în grid, dar aproape de margine: dacă trece de ea, botul nu mai face perechi/);
});

// ---------------- (B) repetările ----------------
const POL = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "politica-alerte.mjs")).href);
await test("B2 repetarea: aceeași cheie + bot sub 24 h ⇒ doar în Radar; escaladarea (atenție ⇒ critic) trece; după 24 h din nou; alt bot = alt caz", () => {
  const st = {}, H = 3600000, m = (n) => ({ nivel: n, titlu: "x" });
  assert.equal(POL.repetare(st, m("atentie"), "consilier-AVGO_US_EQ", null, 0), false);
  assert.equal(POL.repetare(st, m("critic"), "consilier-AVGO_US_EQ", null, H), false, "escaladarea trece");
  assert.equal(POL.repetare(st, m("atentie"), "consilier-AVGO_US_EQ", null, 2 * H), true, "înapoi la Atenție sub 24 h");
  assert.equal(POL.repetare(st, m("critic"), "consilier-AVGO_US_EQ", null, 3 * H), true, "Ieși din nou sub 24 h");
  assert.equal(POL.repetare(st, m("atentie"), "consilier-AVGO_US_EQ", null, 26 * H), false, "după 24 h");
  assert.equal(POL.repetare(st, m("atentie"), "p-margine", "5", 0), false); assert.equal(POL.repetare(st, m("atentie"), "p-margine", "6", H), false, "alt bot");
  assert.equal(POL.repetare(st, m("atentie"), "p-margine", "5", 2 * H), true);
});
await test("B2 mereu pe Discord: lichidarea, stopul atins, frâna, evenimentele mari, opritorul - și fără cheie", () => {
  const st = {}; for (const k of ["lich-5", "sltp-sl-X-2026-11-19", "frana", "eveniment-mare", "opritor", "stop-5"]) { assert.equal(POL.repetare(st, { nivel: "critic", titlu: "x" }, k, "5", 0), false, k); assert.equal(POL.repetare(st, { nivel: "critic", titlu: "x" }, k, "5", 1000), false, k + " a doua oară"); }
  assert.equal(POL.repetare(st, { nivel: "info", titlu: "x" }, "", null, 0), false); assert.equal(POL.repetare(st, { nivel: "info", titlu: "x" }, "", null, 1), false);
});
await test("B2 colectorul: politica repetărilor înainte de KV / Discord, starea în meta().repetari, curățată", () => {
  const f = col.slice(col.indexOf("async function trimiteAlerta("), col.indexOf("async function trimiteAlerta(") + 6000);
  assert.match(f, /POL\.repetare\(mR\.repetari \|\| \(mR\.repetari = \{\}\), m, cheie, bot, Date\.now\(\)\)/); assert.match(f, /POL\.curataRepetari\(mR\.repetari, Date\.now\(\)\)/);
});

// ---------------- (C) mesajele ----------------
await test("C „intrarea sugerată”: fără „+X % pe trade” din istoric ⇒ cifra măsurată pe viu (38 de cazuri: −2,9 % la 5 ședințe, −1,7 puncte sub piață, nedovedit)", () => {
  const p = citeste("scripts", "lib", "poza.mjs"); assert.match(p, /INTRARE_MASURAT = \{ la: "19\.11\.2026", n: 38, r5: -0\.029, exces: -0\.017 \}/);
  assert.match(p, /pe viu după intrare: /); assert.doesNotMatch(p, /" · pe istoric " \+ \(q\.medie >= 0/);
});
await test("C „gridul e prea larg pentru levier”: spune că pe boții lui avertismentul n-a ieșit (16 cazuri, +3,0 %, niciunul pe minus)", async () => {
  const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
  const a = MC.gridPreaLarg("TAKE", { laMargine: 24.9, procent: 0.62, parte: "jos", plan: 6.5, stopPlan: 0.0614, moarte: 22, intervale: 30 });
  assert.match(a.titlu, /: gridul e prea larg pentru levier \(nedovedit\)$/); assert.ok(a.titlu.length <= 60); assert.match(a.mesaj, /Aș închide aproape de zero/); assert.match(citeste("scripts", "lib", "mesaje-colector.mjs"), /cei 16 avertizați au ieșit mai bine/);
});
// ---------------- (D) registrul ----------------
vm.runInThisContext(citeste("public", "lib", "alerte-registru.js"), { filename: "alerte-registru.js" });
const AR = globalThis.AlReg, HH = 3600000, T0 = Date.UTC(2026, 10, 3, 15);
await test("D inregistreaza: Consilierul Ieși / Atenție, intrarea (simbolul din titlu), becul, „sub stop” ⇒ acțiuni cu sensul; botul ⇒ crypto cu direcția lui; repetările și grilele nu", () => {
  assert.deepEqual(AR.inregistreaza({ t: T0, cheie: "consilier-AVGO_US_EQ", titlu: "AVGO · Ieși: trend în jos" }), { t: T0, fel: "consilier-iesi", sens: -1, piata: "actiuni", ticker: "AVGO_US_EQ", yahoo: null, cheie: "consilier-AVGO_US_EQ" });
  const i = AR.inregistreaza({ t: T0, cheie: "sltp-intrare-RANDAS-2026-11-19", titlu: "RAND.AS: a ajuns la intrarea sugerată (€40,72)" }); assert.equal(i.fel, "intrare"); assert.equal(i.sens, 1); assert.equal(i.yahoo, "RAND.AS");
  const b = AR.inregistreaza({ t: T0, cheie: "p-margine", bot: "77", simbol: "XMR_USDT_PERP", pret: 495, titlu: "XMR" }, { dir: -1 }); assert.equal(b.fel, "p-margine"); assert.equal(b.sens, -1); assert.equal(b.piata, "crypto");
  assert.equal(AR.inregistreaza({ t: T0, cheie: "consilier-AVGO_US_EQ", titlu: "AVGO · Ieși", repetare: true }), null); assert.equal(AR.inregistreaza({ t: T0, cheie: "grila", bot: "1", simbol: "X", pret: 1 }), null);
  assert.equal(AR.inregistreaza({ t: T0, cheie: "vreme-crypto", titlu: "Crypto: liniște" }), null);
});
await test("D judeca: acțiuni - închiderea de la alertă ⇒ +1 / +5 / +10 ședințe, față de QQQ, în sensul alertei; boți - +1 / 24 / 72 h față de BTC, în direcția botului", () => {
  const zi = (k) => T0 - 6 * HH + k * 24 * HH, a = Array.from({ length: 30 }, (_, k) => ({ t: zi(k), c: 100 * (1 - 0.01 * k) })), q = Array.from({ length: 30 }, (_, k) => ({ t: zi(k), c: 100 }));
  const e = AR.inregistreaza({ t: zi(3) + HH, cheie: "consilier-AVGO_US_EQ", titlu: "AVGO · Ieși" }), j = AR.judeca(e, a, q);
  assert.ok(Math.abs(j[5].r - (a[8].c / a[3].c - 1)) < 1e-12); assert.equal(j[5].rep, 0); assert.ok(j[5].x > 0, "a scăzut ⇒ Ieși a avut dreptate"); assert.ok(j[10] && j[1]);
  const o = (k) => ({ t: T0 + k * HH, c: 100 + k }), bb = Array.from({ length: 100 }, (_, k) => o(k)), btc = Array.from({ length: 100 }, (_, k) => ({ t: T0 + k * HH, c: 100 }));
  const eb = AR.inregistreaza({ t: T0, cheie: "s-muta", bot: "5", simbol: "X_USDT_PERP", pret: 100 }, { dir: 1 }), jb = AR.judeca(eb, bb, btc);
  assert.ok(Math.abs(jb[24].r - 0.24) < 1e-12 && jb[24].x > 0 && jb[72]); const en = AR.inregistreaza({ t: T0, cheie: "s-muta", bot: "5", simbol: "X_USDT_PERP", pret: 100 }, { dir: 0 }); assert.equal(AR.judeca(en, bb, btc)[24].x, null);
});
await test("D rezumat: pe fel, la orizontul de cap, media pe zile cu interval; sub 60 de zile și 30 de cazuri ⇒ „se adună”, peste ⇒ verdict", () => {
  const l = [], j = {};
  for (let k = 0; k < 70; k++) { const e = { t: T0 + k * 24 * HH, fel: "consilier-iesi", sens: -1, piata: "actiuni", cheie: "consilier-A" + k }; l.push(e); j[AR.cheie(e)] = { 5: { r: -0.02, rep: 0, x: 0.02 + 0.001 * Math.sin(k) } }; }
  l.push({ t: T0, fel: "intrare", sens: 1, piata: "actiuni", cheie: "sltp-intrare-X" });
  const r = AR.rezumat(l, j, T0 + 80 * 24 * HH), f = r.feluri.find((x) => x.fel === "consilier-iesi"), g = r.feluri.find((x) => x.fel === "intrare");
  assert.equal(f.zile, 70); assert.equal(f.verdict, "peste"); assert.ok(f.lo > 0); assert.equal(f.h, 5); assert.equal(g.verdict, "se-aduna"); assert.equal(g.judecate, 0); assert.equal(r.total, 71);
});
await test("D colectorul: notează cazul nou la alertă (direcția botului), îl judecă o dată pe oră (Pionex 1 h / T212 zilnic, BTC / QQQ) și urcă rezumatul; ruta îl păstrează", async () => {
  const f = col.slice(col.indexOf("async function trimiteAlerta("), col.indexOf("async function trimiteAlerta(") + 7000);
  assert.match(f, /AlReg\.inregistreaza\(alertaKv, \{ dir: dirBot\(bot\) \}\)/); assert.match(col, /const REG_FIS = path\.join\(DATA, "alerte-registru\.jsonl"\)/);
  assert.match(col, /async function turaRegistruAlerte\(\)/); assert.match(col, /trimite\("\/api\/istoric-bot\?action=alerteRegistru", \{ rezumat: rez \}\)/); assert.match(col, /if \(val\.medii\) turaRegistruAlerte\(\)/);
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_r`);
  const h = { "cf-connecting-ip": "10.0.6.2", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" };
  const rez = { la: Date.now(), deLa: Date.now() - 1000, total: 3, prag: { zile: 60, cazuri: 30 }, feluri: [{ fel: "consilier-iesi<b>", piata: "actiuni", h: 5, n: 3, judecate: 2, zile: 2, medie: 0.01, lo: -0.1, hi: 0.2, pePlus: 0.5, verdict: "se-aduna" }] };
  const r = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=alerteRegistru", { method: "POST", headers: h, body: JSON.stringify({ rezumat: rez }) }), env });
  assert.equal(r.status, 200, await r.text());
  const g = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=alerteRegistru", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.0.6.3" } }), env });
  const d = await g.json(); assert.equal(d.registru.feluri[0].fel, "consilier-iesib"); assert.equal(d.registru.feluri[0].verdict, "se-aduna"); assert.equal(d.registru.total, 3);
});
// ---------------- (E) pagina ----------------
await test("E pagina: fraza cinstită + De unde știu, 3 cifre, dovada cu 4 grafice și registrul pe viu; rândurile AL_RANDURI; tema; id-urile vechi păstrate", () => {
  const c2 = { console, Date, Math, Object, Array, String, Number, JSON, Intl, isFinite, TextRo: globalThis.TextRo, localStorage: { getItem() { return null; }, setItem() {} }, escapeHtml: (s) => String(s == null ? "" : s).replace(/</g, "&lt;"), $: () => null, setInterval() {}, setTimeout() {}, document: { addEventListener() {}, getElementById() { return null; }, hidden: false } };
  c2.globalThis = c2; c2.window = c2; vm.createContext(c2);
  for (const f of ["carnet-grafice.js", "alerte-dovezi.js", "alerte-grafice.js", "alerte-registru.js", "alerte-ecran.js"]) vm.runInContext(citeste("public", "lib", f), c2, { filename: f });
  c2.alSt.l = [{ t: Date.now() - 1000, nivel: "critic", titlu: "AVGO · Ieși", cheie: "consilier-AVGO_US_EQ" }, { t: Date.now() - 2000, nivel: "info", titlu: "x", cheie: "grila", bot: "1", doarRadar: true }];
  const s = c2.alSusHtml(); assert.match(s, /niciuna nu s-a dovedit că știe încotro merge prețul/); assert.match(s, /<summary>De unde știu<\/summary>/); assert.equal((s.match(/class="cnCifra"/g) || []).length, 3); assert.match(s, /1 pe Discord/);
  const d = c2.alDovadaHtml(); assert.equal((d.match(/<svg/g) || []).length, 4); assert.doesNotMatch(d, /NaN|undefined/); assert.match(d, /Registrul pe viu se umple/);
  c2.alSt.reg = { la: Date.now(), deLa: Date.UTC(2026, 10, 19), total: 3, feluri: [{ fel: "consilier-iesi", piata: "actiuni", h: 5, n: 3, judecate: 1, zile: 1, medie: 0.02, lo: null, hi: null, verdict: "se-aduna" }] };
  assert.match(c2.alDovadaHtml(), /„Ieși” \(Consilier\)<\/td><td>3<\/td><td>1<\/td><td>\+2,0 %<\/td><td>se adună/);
  const ix = citeste("public", "index.html"); for (const id of ["alSus", "alSCentru", "alCentru", "alEpisoade", "alSDovada", "alDovada", "alSVechi", "alertSrRule", "alertList", "alTemaBtn"]) assert.match(ix, new RegExp('id="' + id + '"'), id);
  assert.match(ix, /<script defer="" src="\/lib\/alerte-registru\.js"><\/script><script defer="" src="\/lib\/alerte-dovezi\.js"><\/script><script defer="" src="\/lib\/alerte-grafice\.js"><\/script><script defer="" src="\/lib\/alerte-ecran\.js"><\/script>/);
  const ap = citeste("public", "app.js"); assert.match(ap, /return alRandComuta\(id,deschis\);/); assert.match(ap, /"salt","alerts"\]\.forEach/); assert.match(ap, /"slTemaBtn","alTemaBtn"\]/);
  assert.match(citeste("scripts", "face-tema-tablou.mjs"), /"salt", "alerts"\]/); assert.match(citeste("public", "sw.js"), /"\/lib\/alerte-grafice\.js"/);
});
await test("V versiunile v100.367 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO) și colectorul v101.204", () => {
  const H = citeste("public", "index.html");
  const vh = (H.match(/v100\.(\d{3})/) || [])[1]; assert.ok(+vh >= 367, "versiunea de la v100.367 încolo: " + vh); assert.doesNotMatch(H, /v100\.366/);   /* v100.368: „de la încolo” */
  assert.ok(+(citeste("public", "sw.js").match(/crypto-radar-v100-(\d{3})/) || [])[1] >= 367); assert.ok(+(citeste("functions", "_shared", "versiune.js").match(/"v100\.(\d{3})"/) || [])[1] >= 367);
  const p = JSON.parse(citeste("package.json")); assert.ok(+p.version.split(".")[1] >= 367); assert.match(p.scripts.test, /npm run test:v100366 && npm run test:v100367/); assert.equal(p.scripts["test:v100367"], "node scripts/proba-v100367.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(+(bi.badge.match(/^v100\.(\d{3})/) || [])[1] >= 367); assert.ok(bi.al367 && bi.ti366); assert.match(col, /const VERSIUNE_COLECTOR = "v101\.204";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
