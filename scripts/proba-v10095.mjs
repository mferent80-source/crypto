// Proba v100.95 / colector v101.65 (04.10, el: „ok fa” pe ideile raportului v100.94; planul docs/superpowers/plans/2026-10-04-idei-v10095.md):
// (1) „încă ~N luni” la „prea puține cazuri”; (2) suma propusă a porții la „un trade ca ăsta”; (3) barele din tura ideilor în data/retea/zile;
// (4) bilanțul Busolei despre predicțiile 🧠 (modulul, ruta, pagina, colectorul, garda); (E) versiunile.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { situatii, verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
const fnColector = (nume) => { const s = citeste("scripts", "colector.mjs"), i = s.search(new RegExp("^(async )?function " + nume + "\\(", "m")); assert.ok(i >= 0, "lipsește " + nume + " în colector.mjs"); const k = s.indexOf("\n}\n", i); return s.slice(i, k < 0 ? undefined : k + 2); };
// modulele paginii, încărcate ca în retea/date.mjs (aceeași ordine, aceleași globale)
globalThis.GridCalcul = globalThis.GridCalcul || new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul, AS = new Function("GridCalcul", `${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(G);
const P = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(G, AS); globalThis.Probabilitati = P;
const R = new Function("Probabilitati", `${lib("retea.js")}; return Retea;`)(P); globalThis.Retea = R;
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const oPropozitie = (s) => { assert.ok(s.length <= 160, "peste 160: " + s); assert.ok(!/\. [A-ZĂÂÎȘȚ]/.test(s), "două propoziții: " + s); };
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.95 · ideile raportului v100.94");

const ORA = 3600000, ZI = 864e5, ACUM = Date.UTC(2026, 9, 4, 12, 0);

// ======== Task 1: „încă ~N luni” la „prea puține cazuri” (ideea 3) ========
await test("(1) Retea.decide(v, cuRitm): la „prea puține cazuri” scrie cât mai durează DOAR unde istoria crește (țintele T212 - revizia 🔴1: pe crypto depozitul de 1 h e tăiat la 430 de zile, lunile nu cresc); de la 10 cazuri, peste 3 ani în ani (rotunjit), peste 10 ani plafon (revizia 🔵9); „în lucru” neschimbat; eticheta o propoziție ≤ 160", () => {
  const d = (v, r) => R.decide(v, r).motiv;
  assert.equal(d({ luni: 11, luniGata: 11, nIndep: 35 }), "prea puține cazuri: 35 din 100", "fără cuRitm (crypto): fără estimare");
  assert.equal(d({ luni: 11, luniGata: 11, nIndep: 35 }, true), "prea puține cazuri: 35 din 100 · încă ~21 de luni", "35 în 11 luni ⇒ 65 la 3,18 pe lună ⇒ 21");
  assert.equal(d({ luni: 11, luniGata: 11, nIndep: 48 }, true), "prea puține cazuri: 48 din 100 · încă ~12 luni");
  assert.equal(d({ luni: 11, luniGata: 11, nIndep: 99 }, true), "prea puține cazuri: 99 din 100 · încă ~1 lună", "TextRo.cate nu face „o lună”: 1 lună, ca „1 zi” în rest");
  assert.equal(d({ luni: 11, luniGata: 11, nIndep: 20 }, true), "prea puține cazuri: 20 din 100 · încă ~4 ani", "44 de luni ⇒ 4 ani (rotunjit o singură dată)");
  assert.equal(d({ luni: 11, luniGata: 11, nIndep: 3 }, true), "prea puține cazuri: 3 din 100", "sub 10 cazuri nu există ritm");
  assert.equal(d({ luni: 24, luniGata: 24, nIndep: 10 }, true), "prea puține cazuri: 10 din 100 · încă peste 10 ani", "216 luni ⇒ plafon");
  assert.equal(d({ nIndep: 35 }, true), "prea puține cazuri: 35 din 100", "fără luni judecate: textul vechi");
  assert.equal(d({ luni: 11, luniGata: 11, nIndep: 0 }, true), "prea puține cazuri: 0 din 100", "fără cazuri nu există ritm");
  assert.equal(d({ luni: 11, luniGata: 6, nIndep: 35 }, true), "verificarea în lucru: 6 din 11 luni", "în lucru rămâne primul");
  assert.equal(R.decide({ luni: 11, luniGata: 11, nIndep: 120, ic: [0.01, 0.05], icLog: [0.01, 0.03], bss3: 0.01, logloss: 0.5, loglossReper: 0.51, loglossLog: 0.52 }, true).dovedita, true, "de la 100 nu se mai socotesc luni");
  const V = { luni: 11, luniGata: 11, nIndep: 35 }, mod = (t) => ({ tinta: t, versiune: R.VERSIUNE, la: ACUM - ORA, verificare: V });
  assert.equal(R.verdict(mod("atinge-24"), ACUM).motiv, "prea puține cazuri: 35 din 100", "crypto: fără estimare"); assert.equal(R.verdict(mod("cursa"), ACUM).motiv, "prea puține cazuri: 35 din 100");
  assert.match(R.verdict(mod("cursa5-t212"), ACUM).motiv, /încă ~21 de luni$/, "T212: istoria se adună (unesteZile) ⇒ estimarea e cinstită");
  assert.match(R.verdictArbori({ ...mod("directie-t212"), versiune: R.VERSIUNE_ARBORI }, ACUM).motiv, /încă ~21 de luni$/, "și pe arbori");
  const rand = R.randuri({ "atinge-24": mod("atinge-24") }, { la: ACUM, v: R.VERSIUNE, p: { "iese-jos-24": 0.21 } }, [{ cod: "iese-jos-24", titlu: "Atinge marginea de jos (0.3605) în 24 h", p: 0.18 }], { acum: ACUM });
  assert.equal(rand.length, 1); String(rand[0].text).split("\n").forEach(oPropozitie); assert.ok(!/încă/.test(rand[0].text), rand[0].text);
});

// ======== Task 2: suma propusă a porții la „un trade ca ăsta” (ideea 4) ========
await test("(2) poarta T212: „un trade ca ăsta” se judecă pe SUMA din „Cât cumperi” (t212MarimePoarta: intrarea, stopul calculat, doar cu intrare și poarta nu pe „nu” - revizia 🟡4), nu pe mediană; fără sumă ⇒ cost null ⇒ rezerva costTipic rămâne în t212ReteaHtml", () => {
  const src = fnDin("t212-ecran.js", "t212MarimePoarta") + "\n" + fnDin("t212-ecran.js", "t212ProfilPoarta"); let prins = null;
  const f = new Function("ActiuniSemnale", "t212ReteaHtml", "t212Fx", "escapeHtml", "t212Usd", "t212ProbListaHtml", src + "\n; return t212ProfilPoarta;")(AS, (o, b, prob, cump) => { prins = { o, cump }; return ""; }, () => 4.6, (x) => String(x), (x) => String(x), () => "");   /* „\n” înainte de return: felia se poate termina cu un comentariu */
  const p = { simbol: "ASTS", ticker: "ASTS_US_EQ", baza4: 100, stopP: { stop: 96, alTau: true }, prof: null, prob: [], niv: { nivel: "ok", intrare: { pret: 100, motiv: "limită" }, tinta: 116, stop: 92, riscPct: 8 }, v: { nivel: "ok" }, st: { pret: 101 }, bareZi: [], tot: 10000, rezultate: null, stiri: [] };
  f(p); assert.ok(prins, "t212ReteaHtml nechemat"); const m92 = AS.marime({ intrare: 100, stop: 92, cont: 10000, fx: 4.6 }), m96 = AS.marime({ intrare: 100, stop: 96, cont: 10000, fx: 4.6 });
  assert.ok(m92 && m92.suma > 0 && m96.suma !== m92.suma, "marime"); assert.equal(prins.cump.cost, m92.suma, "costul = suma din „Cât cumperi” (stopul calculat), nu pe stopul lui"); assert.equal(prins.o.stop, 96, "probabilitățile rămân pe stopul LUI"); assert.equal(prins.cump.ticker, "ASTS_US_EQ");
  prins = null; f({ ...p, v: { nivel: "nu" } }); assert.equal(prins.cump.cost, null, "poarta pe „nu”: nicio sumă ⇒ rezerva (mediana)");
  prins = null; f({ ...p, niv: { ...p.niv, intrare: null } }); assert.equal(prins.cump.cost, null, "fără intrare (trend jos): null");
  prins = null; f({ ...p, tot: null }); assert.equal(prins.cump.cost, null, "fără cont: null");
  const pp = fnDin("t212-ecran.js", "t212PreturiPoarta"); assert.ok(/t212MarimePoarta\(p\)/.test(pp) && !/ActiuniSemnale\.marime\(/.test(pp), "„Cât cumperi” ia suma din aceeași funcție");
  assert.ok(/cost: cump\.cost > 0 \? cump\.cost : Retea\.costTipic\(inchise\)/.test(fnDin("t212-ecran.js", "t212ReteaHtml")), "rezerva costTipic în t212ReteaHtml");
});

// ======== Task 3: barele din tura ideilor în data/retea/zile (ideea 2) ========
await test("(3) tura ideilor scrie barele zilnice aduse dimineața în data/retea/zile (scrieZileTicker, aceeași unire pe „time” ca noaptea), după ce ideile sunt trimise; rândurile goale nu scriu; deps-ul rețelei folosește aceeași funcție", async () => {
  const col = citeste("scripts", "colector.mjs"), idei = fnColector("turaIdeiZi");
  assert.ok(/randuriIdei\.set\(tk, /.test(idei), "cereBare ține rândurile brute ale rutei"); assert.ok(/scrieZileTicker\(/.test(idei), "turaIdeiZi cheamă scrieZileTicker");
  assert.ok(idei.indexOf("scrieZileTicker(") > idei.indexOf('trimite("/api/t212?action=idei"'), "barele se scriu DUPĂ ce ideile sunt trimise (o eroare la scris nu lasă ziua fără idei)");
  assert.ok(/scrieZile: scrieZileTicker/.test(col), "deps-ul rețelei folosește scrieZileTicker");
  const src = fnColector("scrieZileTicker"); const D = await import("../retea/date-t212.mjs"); const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zile-")); const jur = [];
  const scrie = new Function("path", "fs", "RETEA_ZILE", "scrieAtomic", "citesteJson", "unesteZile", "jurnal", src + "; return scrieZileTicker;")(path, fs, dir, (f, o) => fs.writeFileSync(f, JSON.stringify(o)), (f, impl) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return impl; } }, D.unesteZile, (...a) => jur.push(a.join(" ")));
  const r1 = [{ time: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }, { time: 2000, open: 1.5, high: 2, low: 1, close: 1.8, volume: 11 }];
  assert.equal(scrie("AAA_US_EQ", r1), true); const j1 = JSON.parse(fs.readFileSync(path.join(dir, "AAA_US_EQ.json"), "utf8")); assert.equal(j1.randuri.length, 2); assert.ok(j1.la > 0);
  assert.equal(scrie("AAA_US_EQ", [{ time: 2000, open: 1.5, high: 2.2, low: 1, close: 1.9, volume: 12 }, { time: 3000, open: 1.9, high: 2.5, low: 1.8, close: 2.4, volume: 9 }]), true);
  const j2 = JSON.parse(fs.readFileSync(path.join(dir, "AAA_US_EQ.json"), "utf8")); assert.deepEqual(j2.randuri.map((x) => x.time), [1000, 2000, 3000], "unirea pe time"); assert.equal(j2.randuri[1].close, 1.9, "rândul nou bate pe cel vechi");
  assert.equal(scrie("BBB_US_EQ", []), false, "rânduri goale: nu scrie"); assert.ok(!fs.existsSync(path.join(dir, "BBB_US_EQ.json")), "fără fișier gol");
  assert.equal(scrie("a/b c", r1), true); assert.ok(fs.existsSync(path.join(dir, "abc.json")), "numele curățat"); assert.equal(jur.length, 0, "fără jurnal pe drumul bun");
  fs.rmSync(dir, { recursive: true, force: true });
});

// ======== Task 4: bilanțul Busolei despre predicțiile 🧠 ale Radarului (ideea 1) ========
const BZ = (retea, la) => ({ la: la === undefined ? ACUM - ORA : la, retea });
const BATE = { judecate: 240, independente: 131, brier: 0.2101, brierBaza: 0.2402, castig: 0.125, icJos: 0.02, icSus: 0.2, verdict: "bate rata de bază" };
await test("(4a) Retea.textBusola: rândul Busolei pentru „Cum s-a verificat” - nimic judecat (cu câte îi trimite Radarul acum - revizia 🟡5), prea puține cazuri / prea puține monede (🟡2), bate / mai prost / n-am aflat „IC cuprinde 0” (🟡3), verdict necunoscut ca atare, bilanț vechi; cifrele prin TextRo (🔵8); fără cifre nu scrie NaN/null; o propoziție ≤ 160 și la 5 cifre cu bilanț de 20 de zile (🔵6); null fără bilanț", () => {
  // v100.96: textBusola dă 1–2 rânduri („🧭 Busola, pe marginile gridului în 24 h: …”); textele exacte le pinează proba-v10096 (6b) - aici rămân invariantele
  assert.equal(R.textBusola(null, ACUM), null); assert.equal(R.textBusola({ la: ACUM }, ACUM), null, "fără retea");
  const ZERO = { judecate: 0, independente: 0, brier: null, brierBaza: null, castig: null, icJos: null, icSus: null, verdict: "prea puține" };
  const T = (b) => { const l = R.textBusola(b, ACUM); assert.ok(Array.isArray(l) && l.length >= 1 && l.length <= 2, JSON.stringify(l)); l.forEach(oPropozitie); assert.match(l[0], /^🧭 Busola, pe marginile gridului în 24 h: /); return l; };
  assert.equal(T(BZ(ZERO)).length, 1, "nimic judecat: un rând"); assert.match(T({ ...BZ(ZERO), trimise: 7 })[0], /Radarul îi trimite acum 7 predicții/); assert.match(T({ ...BZ(ZERO), trimise: 0 })[0], /Radarul nu-i trimite nimic acum/, "legătura ruptă se vede");
  assert.match(T(BZ({ judecate: 12, independente: 9, brier: 0.2213, brierBaza: 0.2401, castig: null, icJos: null, icSus: null, verdict: "prea puține" }))[0], /prea puține ca să judece \(cere 100 de independente\)/);
  assert.match(T(BZ({ ...BATE, verdict: "prea puține" }))[0], /prea puține monede ca să judece/, "≥ 100 independente și tot „prea puține” = sub 10 monede");
  const lb = T(BZ(BATE)); assert.match(lb[0], /Brier 0,210 \(rata de bază 0,240\) ⇒ bate rata de bază\.$/); assert.match(lb[1], /^🧭 240 de predicții 🧠 judecate, 131 de independente\.$/);
  assert.match(T(BZ({ ...BATE, verdict: "mai prost" }))[0], /⇒ mai prost decât rata de bază\.$/); assert.match(T(BZ({ ...BATE, verdict: "n-am aflat" }))[0], /⇒ n-am aflat \(IC cuprinde 0\)\.$/, "IC-ul cuprinde zero, nu „peste zero”");
  assert.match(T(BZ({ ...BATE, verdict: "altceva" }))[0], /altceva\.$/, "verdictul necunoscut, ca atare");
  assert.match(T(BZ(BATE, ACUM - 3 * ZI))[1], /· de acum 3 zile\.$/); assert.ok(!/de acum/.test(T(BZ(BATE, ACUM - ZI)).join(" ")), "o zi nu e „vechi”");
  const faraCifre = T(BZ({ judecate: 150, independente: 120, brier: null, brierBaza: null, castig: null, icJos: null, icSus: null, verdict: "n-am aflat" })); assert.ok(!/Brier/.test(faraCifre[0]), faraCifre[0]);
  const GREU = { ...BATE, judecate: 12345, independente: 10123 };
  [BATE, GREU, { ...GREU, verdict: "mai prost" }, { ...GREU, verdict: "n-am aflat" }, { ...GREU, verdict: "prea puține" }].forEach((r) => { T(BZ(r, ACUM - 20 * ZI)); T(BZ(r)); });
  T({ ...BZ(ZERO, ACUM - 20 * ZI), trimise: 12 }); T({ ...BZ(ZERO, ACUM - 20 * ZI), trimise: 0 });
});
await test("(4b) Retea.subsol: cu o.busola rândul 🧭 e primul în „Cum s-a verificat” pe paginile crypto; pe acțiuni (o.actiuni) lipsește - Busola judecă boții; fără busola nimic nou", () => {
  const modele = { "atinge-24": { tinta: "atinge-24", versiune: R.VERSIUNE, la: ACUM - ORA, verificare: null } };
  const l = R.subsol(modele, null, { busola: BZ(BATE), acum: ACUM }); assert.equal(l.length, 3, JSON.stringify(l)); assert.match(l[0], /^🧭 Busola, pe marginile gridului în 24 h: /); assert.match(l[1], /^🧭 240 de predicții 🧠 judecate/); assert.match(l[2], /neverificată încă/);   /* v100.96: două rânduri ale Busolei */
  assert.equal(R.subsol(modele, null, { busola: BZ(BATE), actiuni: true }).some((x) => /^🧭/.test(x)), false, "pe acțiuni nu");
  assert.equal(R.subsol(modele, null, {}).length, 1); assert.equal(R.subsol(modele).length, 1); assert.equal(R.subsol(modele, null, { busola: { la: ACUM } }).length, 1, "bilanț fără retea: nimic");
});
await test("(4c) ruta istoric-bot: POST busolaRetea validează (lipsa la/retea, cifre ne-numerice, verdict peste 40 ⇒ 400) și păstrează doar cheile știute; GET întoarce {busolaRetea}", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=busolaRetea", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.95.0.2", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=busolaRetea", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.95.0.2" } }), env: ENV });
  let r = await get(); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { busolaRetea: null });
  assert.equal((await post({})).status, 400, "fără la/retea"); assert.equal((await post({ la: ACUM, retea: { judecate: "12", independente: 9, verdict: "x" } })).status, 400, "judecate text");
  assert.equal((await post({ la: ACUM, retea: { judecate: 12, independente: 9, brier: "0.2", brierBaza: 0.24, castig: null, icJos: null, icSus: null, verdict: "x" } })).status, 400, "brier text");
  assert.equal((await post({ la: ACUM, retea: { judecate: 12, independente: 9, brier: 0.22, brierBaza: 0.24, castig: null, icJos: null, icSus: null, verdict: "a".repeat(41) } })).status, 400, "verdict lung");
  assert.equal((await post({ la: ACUM, retea: { judecate: 12, independente: 9, brier: 0.22, brierBaza: 0.24, castig: null, icJos: null, icSus: null, verdict: "x" }, trimise: "7" })).status, 400, "trimise text (revizia 🟡5)");
  assert.equal((await post({ la: ACUM, retea: { judecate: 12, independente: 9, brier: 0.22, brierBaza: 0.24, castig: null, icJos: null, icSus: null, verdict: "x" }, trimise: -1 })).status, 400, "trimise negativ");
  r = await post({ la: ACUM, retea: { judecate: 12, independente: 9, brier: 0.2213, brierBaza: 0.2401, castig: null, icJos: null, icSus: null, verdict: "prea puține", extra: "nu" } }); assert.equal(r.status, 200, await r.text());
  r = await get(); let j = await r.json(); assert.equal(j.busolaRetea.la, ACUM); assert.deepEqual(j.busolaRetea.retea, { judecate: 12, independente: 9, brier: 0.2213, brierBaza: 0.2401, castig: null, icJos: null, icSus: null, verdict: "prea puține" }); assert.equal(j.busolaRetea.trimise, null, "fără trimise ⇒ null");
  r = await post({ la: ACUM + 1, retea: { judecate: 0, independente: 0, brier: null, brierBaza: null, castig: null, icJos: null, icSus: null, verdict: "prea puține" }, trimise: 7 }); assert.equal(r.status, 200, await r.text());
  r = await get(); j = await r.json(); assert.equal(j.busolaRetea.trimise, 7, "trimise păstrat"); assert.equal(j.busolaRetea.la, ACUM + 1);
});
await test("(4d) scripts/lib/din-busola.mjs: bilantDinBusola(j, trimise) curăță fișierul Busolei (null pe lipsă/stricat/fără retea; cifrele doar numere sau null, niciodată 0 din null; „trimise” = câte predicții îi trimite Radarul acum - revizia 🟡5); colectorul îl urcă din turaBilantBusola (calea din BUSOLA_BILANT, implicit busola/cron/stare/din-radar-bilant.json), cel mult o dată la 10 minute, doar când se schimbă la sau trimise, din bucla", async () => {
  const { bilantDinBusola } = await import("./lib/din-busola.mjs");
  assert.equal(bilantDinBusola(null, 0), null); assert.equal(bilantDinBusola({}, 0), null); assert.equal(bilantDinBusola({ la: ACUM }, 0), null, "fără retea");
  assert.equal(bilantDinBusola({ la: ACUM, retea: { ...BATE, judecate: "12" } }, 0), null, "judecate text");
  const b = bilantDinBusola({ la: ACUM, retea: { ...BATE, brier: null, extra: 1 }, boti: { x: 1 } }, 7);
  assert.deepEqual(b, { la: ACUM, retea: { judecate: 240, independente: 131, brier: null, brierBaza: 0.2402, castig: 0.125, icJos: 0.02, icSus: 0.2, verdict: "bate rata de bază" }, trimise: 7 }, "doar cheile știute, null rămâne null, trimise întreg");
  assert.equal(bilantDinBusola({ la: ACUM, retea: BATE }, 0).trimise, 0, "0 e o cifră, nu lipsă"); assert.equal(bilantDinBusola({ la: ACUM, retea: BATE }, "7").trimise, null, "trimise ne-întreg ⇒ null"); assert.equal(bilantDinBusola({ la: ACUM, retea: BATE }).trimise, null);
  const col = citeste("scripts", "colector.mjs"), t = fnColector("turaBilantBusola");
  assert.ok(/const BUSOLA_BILANT = process\.env\.BUSOLA_BILANT \|\| "C:\/Users\/Cimin\/busola\/cron\/stare\/din-radar-bilant\.json"/.test(col), "calea");
  assert.ok(/bilantDinBusola\(/.test(t) && /trimite\("\/api\/istoric-bot\?action=busolaRetea"/.test(t), "urcă prin bilantDinBusola"); assert.ok(/10 \* 60000/.test(t), "cel mult o dată la 10 minute");
  assert.ok(/reteaUltim/.test(t), "trimise = predicțiile din reteaUltim (ce pleacă spre Busola)"); assert.ok(/b\.la === bilantLa && b\.trimise === bilantTrimise/.test(t), "nu retrimite când nu s-a schimbat nimic");
  assert.ok(/turaBilantBusola\(\)\.catch/.test(fnColector("bucla")), "în bucla"); assert.ok(/import \{ bilantDinBusola \} from "\.\/lib\/din-busola\.mjs"/.test(col), "importul");
});
await test("(4e) pagina: reteaAdu cere și busolaRetea (reteaM.b), reteaHtml îl dă subsolului cu actiuni din o; garda are situațiile Busolei în grupul retea, fără abateri", () => {
  assert.ok(/var reteaM=\{la:0,m:null,a:null,b:null/.test(citeste("public", "app.js")), "reteaM.b");
  const adu = fnApp("reteaAdu"); assert.ok(/action=busolaRetea/.test(adu) && /reteaM\.b=/.test(adu), "a treia cerere"); assert.ok(/catch\(function\(\)\{reteaM\.b=null\}\)/.test(adu), "picată ⇒ null, pagina merge");
  const h = fnApp("reteaHtml"); assert.ok(/Retea\.subsol\(m,aM,\{actiuni:!!\(o&&o\.actiuni\),busola:reteaM\.b,acum:Date\.now\(\)\}\)/.test(h), "subsol cu busola");
  const s = situatii().filter((x) => x.mod === "retea" && /^busola:/.test(x.sit)); assert.ok(s.length >= 5, "situații: " + s.length);
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length); assert.equal(rele.length, 0, rele.map((q) => q.x.sit + ": " + q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
});

// ======== Task 5: versiunile ========
await test("(E) versiunile: pagina de la v100.95 în sus (BUILD_INFO, versiune.js, sw, index ×4, package.json, lanțul cu v10095), colectorul de la v101.65 în sus - versiunea merge înainte (v100.96 a lărgit-o)", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.(?:9[5-9]|1\d\d)$/, "de la 95 în sus"); const V = bi.version; assert.ok(bi.badge.startsWith(V + " · "), "badge-ul cu versiunea");
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V + '";'), "versiune.js");
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V.replace(".", "-") + '";'), "sw.js");
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V.replace(".", "\\."), "g")) || []).length, 4, "index.html ×4"); assert.ok(!/v100\.94/.test(ix), "index.html mai are v100.94");
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V.slice(1) + ".0"); assert.ok(/npm run test:v10094 && npm run test:v10095( && |")/.test(pk), "lanțul de teste"); assert.equal(JSON.parse(pk).scripts["test:v10095"], "node scripts/proba-v10095.mjs");
  assert.ok(/VERSIUNE_COLECTOR = "v101\.6[5-9]"/.test(citeste("scripts", "colector.mjs")), "colectorul de la v101.65 în sus");
});

console.log("\n" + (pica ? "✗ " + pica + " picate, " + ok + " trecute" : "✓ toate cele " + ok + " teste au trecut"));
process.exit(pica ? 1 : 0);
