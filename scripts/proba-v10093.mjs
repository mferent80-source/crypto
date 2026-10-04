// Proba v100.93 / colector v101.63 (04.10, el: „FA IDEILE + model de GRADIENT BOOSTING”; specul docs/superpowers/specs/2026-10-04-gradient-boosting-design.md,
// planul docs/superpowers/plans/2026-10-04-arbori-l0-l1.md): L0 - ideile A1–A4 din raportul v100.92; L1 - arborii pe boți (inferența ES5,
// producătorul comun de intrări, antrenorul de noapte, ruta, colectorul, pagina, garda, versiunile). Algoritmul în sine: scripts/proba-arbori.mjs.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { situatii, verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
// modulele paginii, încărcate ca în retea/date.mjs (aceeași ordine, aceleași globale)
const B = new Function(`${lib("busola.js")}; return Busola;`)();
globalThis.GridCalcul = globalThis.GridCalcul || new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul, AS = new Function("GridCalcul", `${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(G);
const P = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(G, AS); globalThis.Probabilitati = P;
const R = new Function("Probabilitati", `${lib("retea.js")}; return Retea;`)(P); globalThis.Retea = R;
const S = new Function(`${lib("semnale-bot.js")}; return SemnaleBot;`)(); globalThis.SemnaleBot = S;
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.93 · ideile A1–A4 + arborii pe boți");

const ORA = 3600000, ACUM = Date.UTC(2026, 9, 4, 6, 0);
const BOT = { id: "1", baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, pretCurent: 0.3907, gridJos: 0.3841, gridSus: 0.4331, distantaLichidarePct: 30 };
const BZ = (stare, verdict, dif, monede) => ({ stare: stare, bilant: verdict ? { verdict: verdict, dif: dif === undefined ? -0.0017 : dif, monede: monede === undefined ? 24 : monede } : null });

// ======== L0: ideile A1–A4 ========
await test("(A1) plierea: cheia secțiunii = titlul fără cifre; capul are aria-expanded; Enter/Space pliază (keydown delegat); săgețile/cursorul doar sub 600 px; --grSus se remăsoară la resize", () => {
  const a = citeste("public", "app.js"), css = citeste("public", "app.css");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fnApp("grCheieSectiune") + "\n;this.f=grCheieSectiune;", ctx);
  assert.equal(ctx.f("Proba pe ultimele 31 de zile"), "Proba pe ultimele de zile"); assert.equal(ctx.f("🚦 Poarta de pornire"), "Poarta de pornire"); assert.equal(ctx.f("Varianta ta · 5×"), "Varianta ta · ×");
  const pl = fnApp("grPliazaPeTelefon"); assert.ok(pl.includes("grCheieSectiune(t.textContent)") && pl.includes('cap.setAttribute("aria-expanded",'), "cheia stabilă / aria-expanded");
  assert.ok(/^function grPliereComuta\(k\)\{[^\n]*setAttribute\("aria-expanded"/m.test(a), "comutarea nu pune aria-expanded");
  assert.ok(/document\.addEventListener\("keydown",[^\n]*grPliereComuta\(/.test(a) && /e\.key==="Enter"\|\|e\.key===" "/.test(a), "Enter/Space nu pliază");
  assert.ok(/^function grSusAplica\(\)\{/m.test(a) && /addEventListener\("resize",grSusAplica\)/.test(a) && /addEventListener\("orientationchange",grSusAplica\)/.test(a), "--grSus nu se remăsoară la rotire");
  assert.ok(!/^#gridset \.grPliabil>\.tbBlocCap h4:after/m.test(css) && /@media \(max-width:600px\)\{[^\n]*#gridset \.grPliabil>\.tbBlocCap h4:after/.test(css), "săgețile sunt în afara @media");
});

await test("(A2) semaforul: „Busola: după agitație gridul pierde −0,17 pp pe episod” (≤ 60), NUME_SFAT la fel; Consiliul: SOC.busola + PRIO după aglomerare; garda: comparația Busolei (3 texte, ≤ 110)", () => {
  const r = S.semafor({ bot: BOT, fisa: null, busola: BZ("miscare", "dovedit") });
  assert.equal(r.motiv, "Busola: după agitație gridul pierde −0,17 pp pe episod"); assert.ok(r.motiv.length <= 60);
  assert.ok(lib("semnale-bot.js").includes('busola: "Busola: după agitație gridul pierde mai mult"'), "NUME_SFAT.busola");
  const c = lib("consiliu.js"); assert.ok(/busola: "busola"/.test(c), "SOC.busola"); assert.match(c, /"aglomerare", "busola", "ia-profit"/);
  const s = situatii().filter((x) => /^busola\.comparatie/.test(x.sursa)); assert.equal(s.length, 3, "situații: " + s.length);
  const rele = s.map((x) => ({ x: x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length); assert.equal(rele.length, 0, rele.map((q) => q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
});
await test("(A3) pentru-busola: `retea` din ultimele cifre ale rețelei pe boții deschiși - un rând pe monedă, p cu 3 zecimale, fără p lipsă; tura 🎲 le notează; colectorul le dă fișierului", async () => {
  const { alcatuieste } = await import("./lib/pentru-busola.mjs");
  const o = alcatuieste({ la: ACUM, versiune: "v101.63", deschisi: [], inchisi: [], acum: ACUM, Busola: B, cheia: (m) => m,
    retea: [{ simbol: "AAVE", tinta: "atinge-24", p: 0.4123456, dovedita: true, la: ACUM }, { simbol: "LIT", tinta: "atinge-24", p: null, dovedita: false, la: ACUM }, { simbol: "AAVE", tinta: "atinge-24", p: 0.3, dovedita: true, la: ACUM - 1 }] });
  assert.deepEqual(o.retea, [{ simbol: "AAVE", tinta: "atinge-24", p: 0.412, dovedita: true, la: ACUM }]);
  assert.deepEqual(alcatuieste({ la: ACUM, versiune: "v", deschisi: [], inchisi: [], acum: ACUM, Busola: B, cheia: (m) => m }).retea, []);
  const tp = citeste("scripts", "lib", "tura-probabilitati.mjs"); assert.ok(tp.includes("if (rt) { const pz = d.pornireDe ? d.pornireDe(b, bare) : null; if (pz) rt.pornire = pz; rez.retea = rt; if (d.noteazaRetea) d.noteazaRetea(b, rt); }"), "tura nu notează");
  const col = citeste("scripts", "colector.mjs"); assert.ok(/const reteaUltim = \{\};/.test(col) && col.includes("noteazaRetea: (b, rt) =>") && col.includes("retea: Object.values(reteaUltim)"), "colectorul: reteaUltim / fișierul");
});
await test("(A4) pe telefon, după ce derulezi de verdict, caseta ține doar eticheta (grMic); o atingere o deschide; pe PC nimic", () => {
  const a = citeste("public", "app.js"), css = citeste("public", "app.css");
  assert.ok(/^function grVerdictComuta\(\)\{/m.test(a) && /data-action-click="grVerdictComuta\(\)"/.test(fnApp("renderGrid")), "caseta nu se comută la atingere");
  assert.ok(/addEventListener\("scroll",grVerdictScroll/.test(a) && /^function grVerdictScroll\(\)\{[^\n]*matchMedia\("\(max-width:600px\)"\)/m.test(a), "scroll-ul nu compactează doar pe telefon");
  assert.ok(/@media \(max-width:600px\)\{[^\n]*#gridset \.grVerdict\.grMic \.grVMotiv,#gridset \.grVerdict\.grMic \.grLista\{display:none\}/.test(css), "CSS grMic");
});

// ======== L1: arborii pe boți ========
const incarcaArbori = () => new Function("Retea", "Probabilitati", `${lib("arbori.js")}; return Arbori;`)(R, P);
await test("(6) Arbori.prezice (ES5) dă EXACT ce dă preziceArbori din antrenor (1.000 de rânduri, ≤ 1e−9); NaN / listă scurtă / model fără semi ⇒ null", async () => {
  const A = incarcaArbori(), { antreneazaArbori, preziceArbori, exportaArbori } = await import("../retea/arbori.mjs");
  const r = (() => { let a = 7; return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648); })(), N = 3000, K = 5, X = new Float32Array(N * K), y = new Float32Array(N);
  for (let i = 0; i < N; i++) { for (let j = 0; j < K; j++) X[i * K + j] = r() * 4 - 2; y[i] = (X[i * K] * X[i * K + 1] > 0) !== (r() < 0.1) ? 1 : 0; }
  const m = antreneazaArbori(X, y, K, { seed: 2 }), model = exportaArbori({ baza: m.baza, pas: m.pas, semi: [m.arbori] }); model.versiune = "a1";
  assert.ok(m.arbori.length > 5, "antrenorul n-a învățat nimic: " + m.arbori.length + " runde");
  let dmax = 0; for (let i = 0; i < 1000; i++) { const x = Array.from({ length: K }, (_, j) => X[i * K + j]); dmax = Math.max(dmax, Math.abs(A.prezice(model, x) - preziceArbori(model, x))); }
  assert.ok(dmax <= 1e-9, "diferența " + dmax);
  assert.equal(A.prezice(model, [NaN, 1, 1, 1, 1]), null); assert.equal(A.prezice(model, [1, 2]), null); assert.equal(A.prezice({ versiune: "a1" }, [1, 1, 1, 1, 1]), null);
});
await test("(6) Retea.intrariBot / intrarePornire sunt singurul producător de intrări; pentruBot dă aceleași cifre ca înainte; Arbori.pentruBot le folosește; scriptul și cache-ul", () => {
  const s = lib("retea.js"); assert.ok(/function intrariBot\(bare, o, btc\)/.test(s) && /function intrarePornire\(t, bare, btc, ist\)/.test(s) && /intrariBot: intrariBot, intrarePornire: intrarePornire/.test(s), "exporturile");
  assert.ok(!/function pentruBot\(modele, bare, o, btc\) \{[\s\S]{0,400}var pune = function/.test(s), "pentruBot mai are logica nivelurilor în el (trebuie în intrariBot)");
  const a = lib("arbori.js"); assert.ok(a.includes("Retea.intrariBot(bare, o, btc)") && a.includes("Retea.intrarePornire(t, bare, btc, ist)"), "Arbori nu folosește producătorul comun");
  assert.ok(/<script src="\/lib\/retea\.js"[^>]*><\/script>\s*<script src="\/lib\/arbori\.js"/.test(citeste("public", "index.html")) && citeste("public", "sw.js").includes('"/lib/arbori.js"'), "scriptul / cache-ul");
  // regresie: pe o monedă sintetică (900 de bare, random walk cu sămânță), pentruBot cu un model logistic mic dă aceleași coduri ca intrariBot (listă nevidă)
  const rr = (() => { let q = 3; return () => ((q = (q * 1103515245 + 12345) % 2147483648) / 2147483648); })(), T0 = Date.UTC(2026, 6, 1); let c = 1;
  const bare = Array.from({ length: 900 }, (_, i) => { const o = c; c = c * (1 + (rr() - 0.5) * 0.02); return { t: T0 + i * ORA, o, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998, c }; }), btc = bare.map((b) => ({ ...b, c: b.c * 60000, o: b.o * 60000, h: b.h * 60000, l: b.l * 60000 }));
  const o = { acum: T0 + 900 * ORA, pret: c, dir: "long", jos: c * 0.97, sus: c * 1.03, lichidare: c * 0.8, tinta: c * 1.04, stop: c * 0.965 };
  const it = R.intrariBot(bare, o, btc); assert.ok(it && it.lista.length >= 5, "intrariBot: " + (it ? it.lista.length : "null")); assert.ok(it.lista.every((q) => Array.isArray(q.x) && q.cod && q.tinta));
});

await test("(7) antrenorul arborilor pe un dosar sintetic (2 monede + BTC, 3.600 de bare de 1 h, ca proba rețelei): scrie modele-arbori.json cu verificare (atinge-24) și cheia; a doua rulare ia lunile din cache; Arbori.prezice citește modelul", async () => {
  const dir = path.join(os.tmpdir(), "arbori-proba-" + Date.now()), ore = path.join(dir, "data", "retea", "ore"); fs.mkdirSync(ore, { recursive: true });
  const r = (() => { let a = 11; return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648); })(), T0 = Date.UTC(2026, 0, 1);
  const bare = (p0) => { const l = []; let c = p0; for (let i = 0; i < 3600; i++) { const o = c; c = c * (1 + (r() - 0.5) * 0.02); l.push({ time: T0 + i * 3600000, open: o, high: Math.max(o, c) * 1.003, low: Math.min(o, c) * 0.997, close: c, volume: 10 }); } return l; };
  for (const s of ["BTC_USDT_PERP", "AAA_USDT_PERP", "BBB_USDT_PERP"]) fs.writeFileSync(path.join(ore, s + ".json"), JSON.stringify(bare(s === "BTC_USDT_PERP" ? 60000 : 1)));
  const run = () => execFileSync(process.execPath, [path.join(RAD, "retea", "antreneaza-arbori.mjs"), "--rad", dir, "--buget-min", "5", "--tinta", "atinge-24", "--seminte", "1", "--max-randuri", "1500"], { encoding: "utf8", timeout: 600000 });
  const o1 = run(), m = JSON.parse(fs.readFileSync(path.join(dir, "data", "retea", "modele-arbori.json"), "utf8"));
  assert.equal(m.versiune, "a1"); assert.ok(m.cheie && m.modele["atinge-24"] && Array.isArray(m.modele["atinge-24"].semi) && m.modele["atinge-24"].versiune === "a1", o1);
  const v = m.modele["atinge-24"].verificare; assert.ok(v && typeof v.brier === "number" && typeof v.dovedita === "boolean" && "vsRetea" in v, JSON.stringify(v));
  assert.match(run(), /luni din cache/);
  const A = incarcaArbori(), x = Array.from({ length: m.modele["atinge-24"].nIn }, () => 0); assert.ok(typeof A.prezice(m.modele["atinge-24"], x) === "number", "Arbori.prezice nu citește modelul");
  fs.rmSync(dir, { recursive: true, force: true });
});

await test("(8) ruta arbori (serverul local): POST refuză fără modele/versiune, model fără semi, > 12 modele; acceptă un model bun; GET îl dă înapoi; restaurez ce era", async () => {
  const T = (fs.readFileSync(path.join(RAD, ".dev.vars"), "utf8").match(/^APP_API_TOKEN=(.*)$/m) || [])[1].trim().replace(/^"|"$/g, ""), U = "http://127.0.0.1:8788/api/istoric-bot?action=arbori", H = { "content-type": "application/json", "x-app-token": T, authorization: "Bearer " + T, origin: "http://127.0.0.1:8788" };   /* POST cere origin = originea rutei (sameOrigin) */
  const post = async (b) => (await fetch(U, { method: "POST", headers: H, body: JSON.stringify(b) })).status, get = async () => (await (await fetch(U, { headers: H })).json()).arbori;
  const era = await get();
  assert.equal(await post({ versiune: "a1" }), 400); assert.equal(await post({ versiune: "a1", modele: { x: { baza: 0, pas: 0.08 } } }), 400);
  assert.equal(await post({ versiune: "a1", modele: Object.fromEntries(Array.from({ length: 13 }, (_, i) => ["t" + i, { baza: 0, pas: 0.08, semi: [[[[-1, 0.1]]]] }])) }), 400);
  const bun = { la: Date.now(), versiune: "a1", modele: { "atinge-24": { tinta: "atinge-24", versiune: "a1", la: Date.now(), n: 10, nIn: 3, baza: -0.4, pas: 0.08, semi: [[[[0, 0.5, 1, 2], [-1, 0.1], [-1, -0.2]]]], verificare: null } } };
  assert.equal(await post(bun), 200); const dupa = await get(); assert.equal(dupa && dupa.modele["atinge-24"].baza, -0.4);
  assert.equal(await post(era && era.modele ? { la: era.la, versiune: era.versiune, modele: era.modele } : { la: Date.now(), versiune: "a1", modele: {} }), 200);   /* restaurez MEREU - altfel pagina ar servi modelul de test */
});

await test("(9) tura-retea: după rețea pornește antrenorul arborilor și urcă modelele la action=arbori; antrenorul picat ⇒ „nimic urcat”, rețeaua neatinsă; tura 🎲 pune rez.arbori; colectorul v101.63", async () => {
  const TR = await import("./lib/tura-retea.mjs"); const trimise = [], jur = [];
  const d = (codArbori) => ({ acum: Date.UTC(2026, 9, 5, 0, 30), stare: {}, forta: true, eNoapte: () => true, ziRo: () => "2026-10-05", simboluri: [], cereKlines: async () => null, pauza: async () => {}, citesteOre: () => [], scrieOre: () => {}, boti: async () => [], scrieBoti: () => {},
    porneste: async () => ({ cod: 0, minute: 1 }), citesteModele: () => ({ la: 1, versiune: "r1", modele: { directie: { norm: { m: [1], s: [1] }, ansamblu: [[]] } } }),
    pornesteArbori: async () => ({ cod: codArbori, minute: 1 }), citesteModeleArbori: () => ({ la: 2, versiune: "a1", modele: { directie: { baza: 0, pas: 0.08, semi: [[]] } } }),
    trimite: async (u, b) => { trimise.push(u); return true; }, jurnal: (...a) => jur.push(a.join(" ")), scrieStare: () => {} });
  await TR.turaRetea(d(0)); assert.deepEqual(trimise, ["/api/istoric-bot?action=retea", "/api/istoric-bot?action=arbori"]);
  trimise.length = 0; jur.length = 0; await TR.turaRetea(d(1)); assert.deepEqual(trimise, ["/api/istoric-bot?action=retea"]); assert.ok(jur.some((l) => /arbori: nimic urcat/.test(l)), jur.join("\n"));
  const tp = citeste("scripts", "lib", "tura-probabilitati.mjs"); assert.ok(tp.includes("if (rez && d.Arbori && d.modeleArbori)") && tp.includes("rez.arbori = ra;"), "tura 🎲 fără arbori");
  const col = citeste("scripts", "colector.mjs"); assert.ok(/VERSIUNE_COLECTOR = "v101\.63"/.test(col) && /function pornesteAntrenorArbori\(\)/.test(col) && col.includes('"antreneaza-arbori.mjs"') && /function modeleArbori\(\)/.test(col) && col.includes("Arbori, modeleArbori: mA,") && col.includes("pornesteArbori: pornesteAntrenorArbori, citesteModeleArbori: "), "colectorul");
});

await test("(10) Retea.randuri cu ambele familii: „🧠 61% · 🌳 58% · 🎲 55% · 🧠 dovedită … · 🌳 nedovedită …”, p2 pentru al doilea marker; fără arbori ⇒ rândul de ieri; capul „A doua părere: 🧠 rețeaua · 🌳 arborii”; subsolul cu „🌳 față de 🧠”; poarta cu amândouă", () => {
  const MOD = (ver, v) => Object.fromEntries(Object.keys(R.TINTE).map((t) => [t, { tinta: t, versiune: ver, la: ACUM - 3600000, verificare: v }]));
  const vBun = { luni: 11, luniGata: 11, nIndep: 274, reper: "🎲", brier: 0.17, brierReper: 0.18, brierLog: 0.175, ic: [0.01, 0.05], icLog: [0.004, 0.03], bss3: 0.02, logloss: 0.52, loglossReper: 0.53, loglossLog: 0.53 };
  const vRau = { ...vBun, ic: [-0.04, 0.01], vsRetea: { n: 300, bss: 0.012, ic: [0.003, 0.021] } };
  const rt = { la: ACUM, v: R.VERSIUNE, p: { "iese-jos-24": 0.61, "directie-24": 0.52 } }, ra = { la: ACUM, v: "a1", p: { "iese-jos-24": 0.58, "directie-24": 0.49 } }, zar = [{ cod: "iese-jos-24", titlu: "Atinge marginea de jos (0.3605) în 24 h", p: 0.55 }];
  const mR = MOD(R.VERSIUNE, vBun), mA = MOD("a1", vRau);
  const l = R.randuri(mR, rt, zar, { acum: ACUM }, { modele: mA, rt: ra });
  assert.equal(l[0].p, 0.61); assert.equal(l[0].p2, 0.58);
  assert.equal(l[0].text, "🧠 61% · 🌳 58% · 🎲 55% · 🧠 dovedită pe 274 de zile independente · 🌳 nedovedită: nu bate 🎲 (Brier 0,170 față de 0,180)");
  assert.equal(R.randuri(mR, rt, zar, { acum: ACUM })[0].text, "🎲 55% · dovedită pe 274 de zile independente"); assert.equal(R.randuri(mR, rt, zar, { acum: ACUM })[0].p2, undefined);
  assert.equal(R.randuri(null, null, zar, { acum: ACUM }, { modele: mA, rt: ra })[0].text, "🌳 58% · 🎲 55% · 🌳 nedovedită: nu bate 🎲 (Brier 0,170 față de 0,180)");
  assert.equal(R.antet(mR, ACUM, mA).titlu, "A doua părere: 🧠 rețeaua · 🌳 arborii"); assert.equal(R.antet(mR, ACUM).titlu, "🧠 Rețeaua neuronală — a doua părere");
  const sub = R.subsol(mR, mA); assert.ok(sub.some((x) => /🌳 față de 🧠: \+0,012 \(IC \+0,003…\+0,021\)/.test(x)), sub.join("\n")); assert.ok(sub.every((x) => x.length <= 160), "subsol > 160: " + sub.map((x) => x.length).join(","));
  const vd = R.verdict(mR.rezultat, ACUM), tp = R.textPornire({ p: 0.41, rata: 0.524 }, vd, { p: 0.39, rata: 0.524 }, { dovedita: false, motiv: "nu bate rata ta", nIndep: 50, bloc: 24 });
  assert.equal(tp, "Un bot ca ăsta ar ieși pe plus: 🧠 41% · 🌳 39% · rata ta: 52%.\n🧠 dovedită pe 274 de zile independente · 🌳 nedovedită: nu bate rata ta."); assert.ok(tp.split("\n").every((x) => x.length <= 160));
  assert.equal(R.VERSIUNE_ARBORI, incarcaArbori().VERSIUNE, "versiunea arborilor din retea.js ≠ Arbori.VERSIUNE");
  assert.equal(R.textPornire({ p: 0.41, rata: 0.524 }, vd), "Un bot ca ăsta ar ieși pe plus: 41% · rata ta: 52% · dovedită pe 274 de zile independente.");
});
await test("(10) pagina: reteaM.a din action=arbori; Tablou (rez.arbori), fișa (Arbori.pentruBot) și poarta (Arbori.pentruPornire) dau arborii lui reteaHtml / textPornire; al doilea marker pe bandă (CSS)", () => {
  const a = citeste("public", "app.js"), css = citeste("public", "app.css");
  assert.ok(a.includes('getJSON("/api/istoric-bot?action=arbori")') && /reteaM\.a=d&&d\.arbori&&typeof Arbori!=="undefined"&&d\.arbori\.versiune===Arbori\.VERSIUNE\?d\.arbori\.modele:null/.test(a), "reteaM.a");
  assert.ok(/^function reteaHtml\(rt,zar,o,ra\)\{/m.test(a) && a.includes("Retea.randuri(m,rt,zar,o,ra&&reteaM.a?{modele:reteaM.a,rt:ra}:null)") && a.includes("Retea.antet(m,o&&o.acum||Date.now(),reteaM.a)") && a.includes("Retea.subsol(m,reteaM.a)"), "reteaHtml cu arbori");
  assert.ok(a.includes("rtA=reteaM.a&&grProb.bare?Arbori.pentruBot(reteaM.a,grProb.bare,grProb.o,grRetea.btc):null") && a.includes("reteaHtml(rt,zar,{acum:Date.now()},rtA)"), "fișa");
  assert.ok(a.includes("reteaHtml(rez.retea,l,{acum:Date.now(),pornire:rez.retea&&rez.retea.pornire},rez.arbori)"), "Tabloul");
  assert.ok(fnApp("grReteaPoartaHtml").includes("Arbori.pentruPornire(reteaM.a,") && fnApp("grReteaPoartaHtml").includes("Retea.textPornire(pz,vd,pzA,vdA)"), "poarta");
  assert.ok(/x\.p2!=null\?'<b class="tbProbP2" style="left:'/.test(a) && /\.tbProbBanda b\.tbProbP2\{/.test(css), "al doilea marker");
});

await test("(11) garda: rândurile cu arbori (toate stările 🌳, și fără rețea, amândouă nedovedite pe direcție), capul (și vechi), subsolul cu „față de 🧠” și poarta pe două rânduri sunt în grupul STRICT retea și n-au abateri", () => {
  const s = situatii().filter((x) => /^arbori\./.test(x.sursa)); assert.ok(s.length >= 40, "situații arbori: " + s.length);
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length); assert.equal(rele.length, 0, rele.map((q) => q.x.sursa + ": " + q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
  for (const f of ["arbori.randuri", "arbori.subsol", "arbori.antet", "arbori.textPornire"]) assert.ok(s.some((x) => x.sursa.startsWith(f)), "lipsește sursa " + f);
  assert.ok(s.some((x) => /🌳 față de 🧠: \+0,012/.test(x.text)), "subsolul fără „față de 🧠”"); assert.ok(s.some((x) => /cât dat cu banul — 🧠 nedovedită/.test(x.text)), "direcția cu amândouă nedovedite"); assert.ok(s.some((x) => /^🌳 \d+% · 🎲 /.test(x.text)), "rândul doar cu arborii");
});

await test("(E) versiunile: pagina v100.93 (BUILD_INFO, versiune.js, sw, index ×4, package.json 100.93.0, lanțul cu v10093 și arbori), colectorul v101.63; index.html încarcă arbori.js după retea.js și sw.js îl ține", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, "v100.93"); assert.match(bi.badge, /^v100\.93 · /);
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "v100.93";'), "versiune.js");
  const sw = citeste("public", "sw.js"); assert.ok(sw.includes('const CACHE="crypto-radar-v100-93";'), "sw.js"); assert.ok(sw.includes('"/lib/retea.js","/lib/arbori.js"'), "sw.js nu ține arbori.js");
  const ix = citeste("public", "index.html"); assert.equal((ix.match(/v100\.93/g) || []).length, 4, "index.html ×4"); assert.ok(!/v100\.92/.test(ix), "index.html mai are v100.92");
  assert.ok(ix.includes('<script src="/lib/retea.js"></script><script src="/lib/arbori.js"></script>'), "arbori.js după retea.js");
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, "100.93.0"); assert.ok(/npm run test:v10092 && npm run test:v10093 && npm run test:arbori( && |")/.test(pk), "lanțul de teste");
  assert.ok(/VERSIUNE_COLECTOR = "v101\.63"/.test(citeste("scripts", "colector.mjs")), "colectorul v101.63");
});

console.log("\n" + (pica ? "V100.93 PICA · " + pica + " din " + (ok + pica) : "V100.93 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
