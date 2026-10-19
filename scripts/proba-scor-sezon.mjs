// Proba „Scorul sezonului” (v100.217, 19.10.2026; el: „vreau ca în crypto să-mi afișeze începând de azi scorul trade-urilor pe
// Pionex: câte win, câte loss, rata de câștig etc., în așa fel încât să mă stimuleze să fiu mai atent” + „vreau și un obiectiv
// pe care îl setez eu”). Modulul pur lib/scor-sezon.js: boții închiși de la data sezonului încolo (rezultat NET), obiectivul LUI,
// seria curentă, comparația cu trecutul; sub 10 boți cifrele rămân dar nu „înseamnă” nimic (regula de 10 din statistica-trade).
// 🔑 Pe toată istoria lui rata e 56 % din 2.307 boți, dar netul −6.033 USDT ⇒ rata singură minte; netul stă lângă ea.
// Rulare: node scripts/proba-scor-sezon.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const citeste = (...p) => fs.readFileSync(new URL("../" + p.join("/"), import.meta.url), "utf8");
vm.runInThisContext(citeste("public", "lib", "scor-sezon.js"));
const S = globalThis.ScorSezon;
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
const ORA = 3600000, ZI = 86400000;
const START = Date.UTC(2026, 9, 18, 21, 0, 0);   // 19.10.2026 00:00 Europe/Bucharest
const ACUM = START + 36 * ORA;                   // 20.10 12:00
const t = (id, inchis, rezultat, et) => ({ id: String(id), eticheta: et || "ZRO", inchis, pornit: inchis - 5 * ORA, rezultat });
// trecutul: 6 pe plus a câte +1, 4 pe minus a câte −5 (60 % rată, net −14), ultimii 3 pe minus
const INAINTE = [t(1, START - 30 * ZI, 1), t(2, START - 29 * ZI, 1), t(3, START - 28 * ZI, -5), t(4, START - 27 * ZI, 1), t(5, START - 26 * ZI, 1), t(6, START - 25 * ZI, 1), t(7, START - 24 * ZI, 1), t(8, START - 3 * ZI, -5), t(9, START - 2 * ZI, -5), t(10, START - 1 * ZI, -5)];
const CFG = { start: START, obiectiv: { rata: 0.55, serie: 3, net: 50, pana: "2026-11-30" } };

console.log("\nScorul sezonului · proba\n");

await test("sezonul gol: n 0, rata null, net null, seria 0, nivel „fara”, trecutul socotit", () => {
  const s = S.calc(INAINTE, CFG, ACUM);
  assert.equal(s.n, 0); assert.equal(s.win, 0); assert.equal(s.loss, 0); assert.equal(s.rata, null); assert.equal(s.net, null);
  assert.deepEqual(s.serie, { n: 0, fel: null }); assert.equal(s.nivel, "fara"); assert.equal(s.suficient, false);
  assert.equal(s.inainte.n, 10); assert.ok(Math.abs(s.inainte.rata - 0.6) < 1e-9); assert.equal(s.inainte.net, -14); assert.equal(s.inainte.seriePierderi, 3);
});

await test("numără DOAR de la start (un bot închis cu o secundă înainte de start nu intră; unul la start intră)", () => {
  const s = S.calc(INAINTE.concat([t(11, START - 1000, 2), t(12, START, 3)]), CFG, ACUM);
  assert.equal(s.n, 1); assert.equal(s.win, 1); assert.equal(s.net, 3); assert.equal(s.inainte.n, 11);
});

await test("win = net > 0, loss = net < 0, zero nu e nici una; rata = win / (win + loss)", () => {
  const s = S.calc(INAINTE.concat([t(11, START + ORA, 2), t(12, START + 2 * ORA, -1), t(13, START + 3 * ORA, 0), t(14, START + 4 * ORA, 4)]), CFG, ACUM);
  assert.equal(s.n, 4); assert.equal(s.win, 2); assert.equal(s.loss, 1); assert.equal(s.zero, 1);
  assert.ok(Math.abs(s.rata - 2 / 3) < 1e-9); assert.equal(s.net, 5); assert.equal(s.castigBrut, 6); assert.equal(s.pierdereBruta, -1);
  assert.equal(s.castigMediu, 3); assert.equal(s.pierdereMedie, -1); assert.equal(s.raport, 3);
});

await test("seria curentă: de la ultimul închis înapoi, se oprește la primul de alt fel; la limita obiectivului ⇒ pauză", () => {
  const w3 = [t(11, START + ORA, -1), t(12, START + 2 * ORA, 1), t(13, START + 3 * ORA, 1), t(14, START + 4 * ORA, 1)];
  let s = S.calc(INAINTE.concat(w3), CFG, ACUM);
  assert.deepEqual(s.serie, { n: 3, fel: "w" }); assert.equal(s.pauza, false);
  const l3 = [t(11, START + ORA, 1), t(12, START + 2 * ORA, -1), t(13, START + 3 * ORA, -1), t(14, START + 4 * ORA, -1)];
  s = S.calc(INAINTE.concat(l3), CFG, ACUM);
  assert.deepEqual(s.serie, { n: 3, fel: "l" }); assert.equal(s.pauza, true); assert.equal(s.nivel, "rau");
  // ordinea din listă nu contează - seria e pe ora închiderii
  s = S.calc(INAINTE.concat(l3.slice().reverse()), CFG, ACUM);
  assert.deepEqual(s.serie, { n: 3, fel: "l" });
});

await test("nivelul după rată față de țintă: bine ≥ țintă, atenție în 15 pp sub, rău mai jos; sub 10 boți NU e „suficient”", () => {
  const mk = (w, l) => { const a = []; for (let i = 0; i < w; i++) a.push(t(100 + i, START + (i + 1) * ORA, 1)); for (let i = 0; i < l; i++) a.push(t(200 + i, START + (w + i + 1) * ORA, -1)); return a; };
  let s = S.calc(mk(6, 4), CFG, ACUM);   // 60 % ≥ 55 %, dar ultimii 4 pe minus ⇒ pauză bate rata
  assert.equal(s.pauza, true); assert.equal(s.nivel, "rau"); assert.equal(s.suficient, true);
  const lw = []; for (let i = 0; i < 6; i++) lw.push(t(300 + i, START + (i + 1) * ORA, -1)); for (let i = 0; i < 4; i++) lw.push(t(400 + i, START + (7 + i) * ORA, 1));
  s = S.calc(lw, CFG, ACUM);   // 40 %: sub 55 cu 15 pp ⇒ atenție (ultimii închiși sunt win, deci fără pauză)
  assert.equal(s.nivel, "atentie"); assert.deepEqual(s.serie, { n: 4, fel: "w" });
  s = S.calc(mk(2, 7), CFG, ACUM);   // 22 %
  assert.equal(s.nivel, "rau"); assert.equal(s.suficient, false);
  s = S.calc([t(1, START + ORA, 1), t(2, START + 2 * ORA, 1)], CFG, ACUM);   // 100 % din 2
  assert.equal(s.nivel, "bine"); assert.equal(s.suficient, false);
});

await test("progresul față de obiectiv: rata / țintă și net / țintă, tăiate la 0…1; zilele rămase până la data țintă", () => {
  const s = S.calc([t(1, START + ORA, 30), t(2, START + 2 * ORA, -5)], CFG, ACUM);
  assert.ok(Math.abs(s.progresRata - Math.min(1, 0.5 / 0.55)) < 1e-9);
  assert.ok(Math.abs(s.progresNet - 0.5) < 1e-9);
  assert.equal(s.zileRamase, 41);   // 20.10 → 30.11
  const s2 = S.calc([t(1, START + ORA, -30)], CFG, ACUM);
  assert.equal(s2.progresNet, 0);
  const s3 = S.calc([], { start: START, obiectiv: { rata: 0.55, serie: 3, net: 50, pana: null } }, ACUM);
  assert.equal(s3.zileRamase, null);
});

await test("configurația lipsă / stricată ⇒ sezonul implicit (19.10.2026) + obiectivul implicit; obiectivul se validează", () => {
  const c = S.normalizeaza(null);
  assert.equal(c.start, START); assert.deepEqual(c.obiectiv, S.OBIECTIV_IMPLICIT);
  const c2 = S.normalizeaza({ start: "aiurea", obiectiv: { rata: 5, serie: -1, net: "x", pana: "31.02" } });
  assert.equal(c2.start, START); assert.deepEqual(c2.obiectiv, S.OBIECTIV_IMPLICIT);
  const v = S.valideazaObiectiv({ rata: "60", serie: "4", net: "100", pana: "2026-12-31" });
  assert.equal(v.ok, true); assert.deepEqual(v.obiectiv, { rata: 0.6, serie: 4, net: 100, pana: "2026-12-31" });
  assert.equal(S.valideazaObiectiv({ rata: "0", serie: 3, net: 50, pana: "" }).ok, false);
  assert.equal(S.valideazaObiectiv({ rata: "101", serie: 3, net: 50, pana: "" }).ok, false);
  assert.equal(S.valideazaObiectiv({ rata: "55", serie: "0", net: 50, pana: "" }).ok, false);
  assert.equal(S.valideazaObiectiv({ rata: "55", serie: 3, net: "-5", pana: "" }).ok, false);
  assert.equal(S.valideazaObiectiv({ rata: "55", serie: 3, net: 50, pana: "2026-13-40" }).ok, false);
  const v2 = S.valideazaObiectiv({ rata: "55", serie: 3, net: 50, pana: "" });
  assert.equal(v2.ok, true); assert.equal(v2.obiectiv.pana, null);
  // data din formular în forma românească („30.11.2026”) e acceptată
  assert.equal(S.valideazaObiectiv({ rata: "55", serie: 3, net: 50, pana: "30.11.2026" }).obiectiv.pana, "2026-11-30");
});

await test("startul unei zile pe ora României (sezon nou „de azi”)", () => {
  assert.equal(S.startulZilei(ACUM), START + ZI);
  assert.equal(S.startulZilei(START + 10), START);
  assert.equal(S.dataRo(START), "19.10.2026");
});

await test("html: cifrele mari, ținta, seria, trecutul, „sub 10” - cu escape pe tot ce vine din date", () => {
  const s = S.calc(INAINTE.concat([t(11, START + ORA, 2.26, "<b>X</b>"), t(12, START + 2 * ORA, -5.04)]), CFG, ACUM);
  const h = S.html(s, { id: "acScor" });
  assert.ok(/Scorul tău pe Pionex/.test(h) && /sezonul din 19\.10/.test(h), "titlul cu data sezonului");
  assert.ok(h.includes(">1<") && h.includes(">2<") === false, "win 1");
  assert.ok(/50 %/.test(h), "rata 50 %");
  assert.ok(/−2,8 USDT/.test(h), "netul cu O zecimală: " + (h.match(/[−+][\d,]+ USDT/g) || []).join(" "));
  assert.ok(/1 pe minus/.test(h), "seria");
  assert.ok(/ținta 55 %/.test(h), "ținta lângă rată");
  assert.ok(/încă nu înseamnă nimic/.test(h), "sub 10");
  assert.ok(/Înainte de 19\.10/.test(h) && /60 %/.test(h) && /10 boți/.test(h) && /−14,0 USDT/.test(h), "trecutul");
  assert.ok(/41 de zile/.test(h), "zilele rămase");
  assert.ok(!h.includes("<b>X</b>"), "escape");
  assert.ok(/data-action-click="scorFormular\(this\.value\)"/.test(h) && /value="acScor"/.test(h), "butonul Obiectiv ✎ cu id-ul cardului");
  assert.ok(!/scForm/.test(h), "formularul închis");
  const hf = S.html(s, { id: "acScor", formular: true, mesaj: "x<y" });
  assert.ok(/class="scForm"/.test(hf) && /name="rata"/.test(hf) && /value="55"/.test(hf) && /name="pana"/.test(hf) && /30\.11\.2026/.test(hf), "formularul cu valorile de acum");
  assert.ok(/scorSalveaza\(this\.value\)/.test(hf) && /scorSezonNou\(this\.value\)/.test(hf), "butoanele formularului");
  assert.ok(hf.includes("x&lt;y"), "mesajul cu escape");
});

await test("html pe sezon gol: „ziua 1”, fără pauză, trecutul tot acolo; htmlAstept spune ce lipsește", () => {
  const h = S.html(S.calc(INAINTE, CFG, ACUM), { id: "jtScor" });
  assert.ok(/niciun bot închis încă/.test(h) && !/pauză/.test(h), h.slice(0, 300));
  assert.ok(/aduc boții/.test(S.htmlAstept(null)) && /Pionex nu a dat/.test(S.htmlAstept("Pionex nu a dat lista")));
});

await test("pauza: la N pierderi la rând cardul spune „pauză” și ce înseamnă; sub N spune câte mai sunt până la limită", () => {
  const h = S.html(S.calc([t(1, START + ORA, -1), t(2, START + 2 * ORA, -1), t(3, START + 3 * ORA, -1)], CFG, ACUM), { id: "acScor" });
  assert.ok(/3 pe minus/.test(h) && /pauză/i.test(h), h.slice(0, 400));
  const h2 = S.html(S.calc([t(1, START + ORA, -1), t(2, START + 2 * ORA, -1)], CFG, ACUM), { id: "acScor" });
  assert.ok(/încă una și e pauză/.test(h2), h2.match(/scCel[\s\S]{0,300}Seria[\s\S]{0,200}/)[0]);
});

// ── B. endpointul de acasă (functions/api/scor-sezon.js) - KV fals, token de probă ────────────────────────────────
const M = await import("../functions/api/scor-sezon.js");
const TOKEN = "proba-token-1234567890";
const kvFals = () => { const m = new Map(); return { get: async (k) => m.has(k) ? m.get(k) : null, put: async (k, v) => { m.set(k, String(v)); }, _m: m }; };
const cere = (env, url, o = {}) => new Request("https://exemplu.test" + url, { method: o.method || "GET", headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.95.0.7", ...(o.origin ? { origin: o.origin } : {}), ...(o.body ? { "content-type": "application/json" } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });

await test("endpoint GET fără KV (pagina publicată) ⇒ implicitul, sursa „implicit”; fără token ⇒ 401", async () => {
  const r = await M.onRequestGet({ request: cere({}, "/api/scor-sezon"), env: { APP_API_TOKEN: TOKEN } });
  assert.equal(r.status, 200); const j = await r.json();
  assert.equal(j.sursa, "implicit"); assert.equal(j.sezon.start, START); assert.deepEqual(j.sezon.obiectiv, S.OBIECTIV_IMPLICIT); assert.deepEqual(j.sezon.istoric, []);
  const r2 = await M.onRequestGet({ request: new Request("https://exemplu.test/api/scor-sezon"), env: { APP_API_TOKEN: TOKEN } });
  assert.equal(r2.status, 401);
});

await test("endpoint POST obiectiv: validat, salvat în KV, citit înapoi; de pe altă origine 403; stricat 400; fără KV 503", async () => {
  const kv = kvFals(), env = { APP_API_TOKEN: TOKEN, ISTORIC: kv };
  let r = await M.onRequestPost({ request: cere(env, "/api/scor-sezon?action=obiectiv", { method: "POST", origin: "https://exemplu.test", body: { rata: "60", serie: "4", net: "100", pana: "31.12.2026" } }), env });
  const tx = await r.text(); assert.equal(r.status, 200, tx); let j = JSON.parse(tx);
  assert.deepEqual(j.sezon.obiectiv, { rata: 0.6, serie: 4, net: 100, pana: "2026-12-31" }); assert.equal(j.sezon.start, START);
  r = await M.onRequestGet({ request: cere(env, "/api/scor-sezon"), env }); j = await r.json();
  assert.equal(j.sursa, "acasa"); assert.equal(j.sezon.obiectiv.rata, 0.6);
  r = await M.onRequestPost({ request: cere(env, "/api/scor-sezon?action=obiectiv", { method: "POST", origin: "https://altcineva.test", body: { rata: 60, serie: 4, net: 100 } }), env });
  assert.equal(r.status, 403);
  r = await M.onRequestPost({ request: cere(env, "/api/scor-sezon?action=obiectiv", { method: "POST", origin: "https://exemplu.test", body: { rata: 0, serie: 4, net: 100 } }), env });
  assert.equal(r.status, 400); assert.ok(/Rata/.test((await r.json()).error));
  r = await M.onRequestPost({ request: cere(env, "/api/scor-sezon?action=obiectiv", { method: "POST", origin: "https://exemplu.test", body: { rata: 60, serie: 4, net: 100 } }), env: { APP_API_TOKEN: TOKEN } });
  assert.equal(r.status, 503);
  r = await M.onRequestPost({ request: cere(env, "/api/scor-sezon?action=aiurea", { method: "POST", origin: "https://exemplu.test", body: {} }), env });
  assert.equal(r.status, 400);
});

await test("endpoint POST sezonNou: startul = 00:00 azi (ora României), sezonul vechi în istoric, obiectivul rămâne; a doua oară în aceeași zi nu dublează", async () => {
  const kv = kvFals(), env = { APP_API_TOKEN: TOKEN, ISTORIC: kv };
  await M.onRequestPost({ request: cere(env, "/api/scor-sezon?action=obiectiv", { method: "POST", origin: "https://exemplu.test", body: { rata: 70, serie: 2, net: 20 } }), env });
  let r = await M.onRequestPost({ request: cere(env, "/api/scor-sezon?action=sezonNou", { method: "POST", origin: "https://exemplu.test" }), env });
  const tx = await r.text(); assert.equal(r.status, 200, tx); let j = JSON.parse(tx);
  const azi = M.startulZilei(Date.now());
  assert.equal(j.sezon.start, azi); assert.equal(j.sezon.obiectiv.rata, 0.7);
  if (azi > START) assert.deepEqual(j.sezon.istoric, [{ start: START, sfarsit: azi }]); else assert.deepEqual(j.sezon.istoric, []);
  r = await M.onRequestPost({ request: cere(env, "/api/scor-sezon?action=sezonNou", { method: "POST", origin: "https://exemplu.test" }), env }); j = await r.json();
  assert.equal(j.sezon.istoric.length, azi > START ? 1 : 0);
  // startul zilei de pe server = cel din modulul paginii
  assert.equal(M.startulZilei(ACUM), S.startulZilei(ACUM)); assert.equal(M.startulZilei(START + 10), START);
  // iarna (UTC+2): 15.01.2027 10:00 UTC ⇒ 15.01 00:00 Europe/Bucharest = 14.01 22:00 UTC
  assert.equal(M.startulZilei(Date.UTC(2027, 0, 15, 10)), Date.UTC(2027, 0, 14, 22)); assert.equal(S.startulZilei(Date.UTC(2027, 0, 15, 10)), Date.UTC(2027, 0, 14, 22));
});

// ── D. ideile (v100.218, el „fa idei”): sezoanele încheiate + alertele colectorului (pure) + mesajele ──────────────
await test("ideea 1 - sezoane: istoricul de pe server + cel de acum, fiecare pe boții lui (închis în [start, sfarsit)); stricat ⇒ doar cel de acum", () => {
  const S1 = START - 20 * ZI, S2 = START - 10 * ZI;
  const tr = [t(1, S1 + ORA, 1), t(2, S1 + 2 * ORA, -2), t(3, S2 + ORA, 3), t(4, S2 + 2 * ORA, 4), t(5, START + ORA, -1), t(6, START - 1000, 9)];   // 6 e în sezonul 2 (înainte de START)
  const cfg = { start: START, obiectiv: CFG.obiectiv, istoric: [{ start: S2, sfarsit: START }, { start: S1, sfarsit: S2 }, { start: "x", sfarsit: 5 }] };
  const z = S.sezoane(tr, cfg, ACUM);
  assert.equal(z.length, 3); assert.deepEqual(z.map((x) => x.curent), [false, false, true]);
  assert.deepEqual(z.map((x) => [x.n, x.win, x.loss, x.net]), [[2, 1, 1, -1], [3, 3, 0, 16], [1, 0, 1, -1]]);
  assert.equal(z[0].start, S1); assert.equal(z[1].sfarsit, START); assert.equal(z[2].sfarsit, null);
  assert.equal(S.sezoane(tr, { start: START, obiectiv: CFG.obiectiv }, ACUM).length, 1);
  assert.deepEqual(S.normalizeaza(cfg).istoric, [{ start: S2, sfarsit: START }, { start: S1, sfarsit: S2 }]);
});

await test("ideea 1 - htmlIstoric: gol cu un singur sezon; altfel tabelul cu cel de acum primul, perioada, win / loss, rata, net, seria", () => {
  const S1 = START - 20 * ZI;
  assert.equal(S.htmlIstoric(S.sezoane([], CFG, ACUM)), "");
  const h = S.htmlIstoric(S.sezoane([t(1, S1 + ORA, 5), t(2, S1 + 2 * ORA, -2), t(3, START + ORA, -1)], { start: START, obiectiv: CFG.obiectiv, istoric: [{ start: S1, sfarsit: START }] }, ACUM));
  assert.ok(/Sezoanele tale/.test(h) && /scIstAcum/.test(h), "tabelul");
  assert.ok(h.indexOf("sezonul de acum") < h.indexOf("29.09.2026"), "cel de acum primul; vechiul 29.09.2026 → 18.10.2026: " + h.slice(0, 400));
  assert.ok(/29\.09\.2026 → 18\.10\.2026/.test(h) && /19\.10\.2026 → acum/.test(h), "perioadele");
  assert.ok(/\+3,0 USDT/.test(h) && /−1,0 USDT/.test(h) && /50 %/.test(h), "cifrele");
  assert.ok(/data-et="net:"/.test(h), "etichetele pentru telefon");
});

await test("ideea 2 - alerte (pur): pauza o dată pe bot închis cât ești în pauză; rata doar de la 10 boți și o dată pe sezon; netul o dată pe sezon; starea ține minte", () => {
  const st = {};
  let s = S.calc([t(1, START + ORA, -1), t(2, START + 2 * ORA, -1)], CFG, ACUM);
  assert.deepEqual(S.alerte(s, st).mesaje, [], "2 la rând: nimic");
  s = S.calc([t(1, START + ORA, -1), t(2, START + 2 * ORA, -1), t(3, START + 3 * ORA, -1)], CFG, ACUM);
  assert.deepEqual(S.alerte(s, st).mesaje, [{ fel: "pauza" }]); assert.equal(st.pauzaLa, "3");
  assert.deepEqual(S.alerte(s, st).mesaje, [], "același bot: nu repetă");
  s = S.calc([t(1, START + ORA, -1), t(2, START + 2 * ORA, -1), t(3, START + 3 * ORA, -1), t(4, START + 4 * ORA, -1)], CFG, ACUM);
  assert.deepEqual(S.alerte(s, st).mesaje, [{ fel: "pauza" }], "a 4-a pierdere în pauză: iar");
  // rata ≥ țintă dar sub 10 boți ⇒ nimic; netul ≥ 50 ⇒ o dată
  s = S.calc([t(1, START + ORA, 60), t(2, START + 2 * ORA, 1)], CFG, ACUM);
  assert.deepEqual(S.alerte(s, st).mesaje, [{ fel: "net" }]); assert.deepEqual(S.alerte(s, st).mesaje, []);
  const l = []; for (let i = 0; i < 10; i++) l.push(t(10 + i, START + (i + 1) * ORA, i < 4 ? -1 : 1));   // pierderile întâi: ultimii închiși sunt câștiguri, deci fără pauză
  s = S.calc(l, CFG, ACUM);   // 60 % din 10, net +2
  assert.deepEqual(S.alerte(s, st).mesaje, [{ fel: "rata" }]); assert.deepEqual(S.alerte(s, st).mesaje, []);
  // sezon nou ⇒ țintele se anunță iar
  s = S.calc(l.map((x) => Object.assign({}, x, { inchis: x.inchis + 30 * ZI })), { start: START + 30 * ZI, obiectiv: CFG.obiectiv }, ACUM + 31 * ZI);
  assert.deepEqual(S.alerte(s, st).mesaje, [{ fel: "rata" }]);
});

await test("ideea 2 - mesajele colectorului (scorPauza / scorTinta) + legarea în colector și garda textelor", async () => {
  const MC = await import("./lib/mesaje-colector.mjs");
  const s = S.calc([t(1, START + ORA, -1.26), t(2, START + 2 * ORA, -1), t(3, START + 3 * ORA, -1)], CFG, ACUM);
  const p = MC.scorPauza(s);
  assert.equal(p.nivel, "atentie"); assert.ok(p.titlu.length <= 60, p.titlu); assert.ok(/3 pierderi la rând - pauză/.test(p.titlu));
  assert.ok(/0 win \/ 3 loss/.test(p.mesaj) && /−3,3 USDT/.test(p.mesaj) && /19\.10/.test(p.mesaj) && /👉/.test(p.mesaj), p.mesaj);
  const l = []; for (let i = 0; i < 12; i++) l.push(t(10 + i, START + (i + 1) * ORA, i < 7 ? 9 : -2));
  const s2 = S.calc(l, CFG, ACUM), r = MC.scorTinta(s2, "rata"), n = MC.scorTinta(s2, "net");
  assert.equal(r.nivel, "info"); assert.ok(/58 %/.test(r.titlu) && r.titlu.length <= 60, r.titlu); assert.ok(/ținta 55 %/.test(r.mesaj), r.mesaj);
  assert.ok(/\+53,0 USDT/.test(n.titlu) && /ținta \+50 USDT/.test(n.mesaj), n.titlu + " | " + n.mesaj);
  const C = citeste("scripts", "colector.mjs"), G = citeste("scripts", "lib", "garda-alerte.mjs");
  assert.ok(/VERSIUNE_COLECTOR = "v101\.(12[7-9]|1[3-9]\d|[2-9]\d\d)"/.test(C), "colectorul ≥ v101.127");
  assert.ok(C.includes('incarca("scor-sezon.js", "ScorSezon")') && C.includes('incarca("statistica-trade.js", "StatisticaTrade")'), "lib-urile în colector");
  assert.ok(C.includes("async function turaScor()") && C.includes(".then(() => turaScor())"), "tura după arhivă");
  assert.ok(C.includes("stareAlerte._scor") && C.includes("ScorSezon.alerte(s, st)"), "starea în alerte-stare.json");
  assert.ok(G.includes("MC.scorPauza(") && G.includes('MC.scorTinta(SC, "net")'), "garda textelor știe mesajele");
  const APP = citeste("public", "app.js");
  assert.ok(APP.includes('ScorSezon.htmlIstoric(ScorSezon.sezoane(tr,scStare.cfg,Date.now()))'), "istoricul sub cardul din Jurnal");
});

// ── v100.219: „am apăsat pe Obiectiv dar nu se întâmplă nimic” - garda de redesenare ține DOAR pentru un INPUT din formular, nu pentru butonul apăsat
await test("v100.219: scDeseneaza nu sare redesenarea când elementul activ e butonul „Obiectiv ✎” (doar un INPUT din card o oprește)", () => {
  const APP = citeste("public", "app.js"), f = APP.slice(APP.indexOf("function scDeseneaza()"), APP.indexOf("async function scPorneste()"));
  assert.ok(/activ\.tagName==="INPUT"&&el\.contains\(activ\)/.test(f), "garda pe INPUT: " + f.slice(0, 600));
  assert.ok(!/el\.contains\(document\.activeElement\)\)return/.test(f), "garda veche (orice element activ) scoasă");
});

// ── C. legarea în aplicație (index.html, app.js, acasa-ecran.js, app.css, versiunea) ──────────────────────────────
await test("v100.217: versiunea ≥ 217 peste tot, lib-ul în index.html, cardul pe Acasă sub verdicte și în Jurnal, proba în lanț, CSS înaintea regulii pândei", () => {
  const P = JSON.parse(citeste("package.json")), ver = Number(P.version.split(".")[1]), V = "v100." + ver, IDX = citeste("public", "index.html");
  assert.ok(ver >= 217, "versiunea " + V);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, V); assert.equal(IDX.split(V).length - 1, 4, "de 4 ori în index.html"); assert.ok(!IDX.includes("v100.216"));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-v100-' + ver + '"')); assert.ok(citeste("functions", "_shared", "versiune.js").includes('VERSIUNE = "' + V + '"'));
  assert.ok(IDX.includes('<script src="/lib/statistica-trade.js"></script><script src="/lib/scor-sezon.js"></script>'), "lib-ul după statistica-trade");
  assert.ok(/<\/div><div class="acScorBloc" id="acScor"><\/div><div class="acLegatura acCumpar" id="acCumpar">/.test(IDX), "cardul pe Acasă între verdicte și „ce aș cumpăra”");
  assert.ok(IDX.includes('<div id="jtCrypto"><div id="jtScor"></div><div id="jtStatCrypto"></div>'), "cardul sus în Jurnal");
  assert.ok(P.scripts["test:scorsezon"] && P.scripts.test.includes("npm run test:scorsezon"), "proba în lanț");
  const APP = citeste("public", "app.js"), AC = citeste("public", "lib", "acasa-ecran.js"), CSS = citeste("public", "app.css");
  for (const f of ["function scDeseneaza()", "async function scPorneste()", "function scorFormular(id)", "async function scorSalveaza(id)", "async function scorSezonNou(id)"]) assert.ok(APP.includes(f), f);
  assert.ok(/function jtRender\(\)\{\s*var box=[^\n]*\n\s*if\(typeof scDeseneaza==="function"\)scDeseneaza\(\);/.test(APP), "jtRender desenează scorul");
  assert.ok(AC.includes('pas("scor", function () { return typeof scPorneste === "function" ? scPorneste() : null; })'), "Acasă îl pornește");
  assert.ok(CSS.includes(".pzDemo #acasa>#acScor{order:11}") && CSS.includes(".pzDemo #jtCrypto>#jtScor{order:10}"), "ordinea");
  assert.ok(CSS.indexOf(".scCard{") < CSS.lastIndexOf(".sugPandaTab thead{display:table-header-group}"), "CSS-ul înaintea regulii pândei (care rămâne ultima)");
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
