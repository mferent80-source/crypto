// Proba v100.312 / colector v101.170 (07.11.2026, el: „mai ai vreo idee?” ⇒ I-842..I-847 ⇒ „fă tot, dar poți pune tot ce am făcut azi pe o
// pagină separată?” ⇒ „Amândouă”):
//   1. defectele: „locul 1.0017064846416381 din 20” (rang = procentil) și „MAMastercard” (alinierea pe loc muta spațiul în fața elementelor);
//   2. pagina „Probe”: căderile și direcția mutate din Sugestii cu același motor (vederile), „Unde e fiecare probă”, nimic pierdut;
//   3. caietul de păreri (I-843): scorul (Caiet), judecata din Binance (tura-pareri), ruta, pagina;
//   4. I-842 (Tablou: „Pe 7 zile”), I-844 (raportul de duminică), I-845 (proba de telefon cu date), I-847 (panoul zilnic Binance);
//   5. legăturile: meniu, paletă, lista albă, SW, colector, versiuni, CSS.
//   node scripts/proba-v100312.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as TP from "./lib/tura-pareri.mjs";
import { cuPanouZilnic, cheiePanou } from "./lib/panou-binance.mjs";
import { liniiProbeRaport, zileLipsa } from "./lib/probe-raport.mjs";
import { stadiuProbaA } from "./lib/tura-proba-a.mjs";
import { abateri } from "./proba-ecran-telefon-conventii.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.312 · pagina Probe + I-842..I-847 · proba\n");
const ZI = 86400000, ORA = 3600000, MIN = 60000;
const J = (x) => JSON.parse(JSON.stringify(x));
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function pagina() {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(["text-ro.js", "caiet.js", "sugestii-ecran.js", "probe-ecran.js"].map((f) => citeste("public", "lib", f)).join("\n")
    + "\nthis.sugHtml = sugHtml; this.sugGrupuri = sugGrupuri; this.sugRanduri = sugRanduri; this.sugStare = sugStare; this.sugTrendLoc = sugTrendLoc; this.sugVerdicteHtml = sugVerdicteHtml;"
    + " this.prProbe = prProbe; this.prHtml = prHtml; this.prCaietRanduri = prCaietRanduri; this.prCaietScorHtml = prCaietScorHtml; this.prDrumSvg = prDrumSvg; this.Caiet = Caiet;", ctx);
  return ctx;
}
const PT = (f) => JSON.parse(citeste("scripts", "date", "proba-telefon", f + ".json"));
const muta = (x, acum) => { const d = acum - x._acum, m = (v) => Array.isArray(v) ? v.map(m) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, (k === "la" || k === "creat") && typeof w === "number" ? w + d : m(w)])) : v; return m(x.raspuns); };
const ACUM = Date.parse("2026-11-08T10:00:00Z");
const DATE = () => { const c = muta(PT("caderi"), ACUM), d = muta(PT("directie"), ACUM), p = muta(PT("pareri"), ACUM), a = muta(PT("probaA"), ACUM); return { caderi: c.caderi, directie: d.directie, pareri: p, probaA: a.probaA }; };

// ── 1. defectele ──
await test("🔑 Trend 12 luni: „locul” e poziția în lista robotului, nu rang + 1 (rang = procentil 0,0017 ⇒ scria „locul 1.0017064846416381 din 20”)", () => {
  const P = pagina(), T = { dataUltimei: "2026-11-06", top: [{ s: "AAA", rang: 0.0017064846416381, m6: 0.5, m12: 1, r60: 0.2, pret: 10, sector: "Tech" }, { s: "BBB", rang: 0.004, m6: 0.4, m12: 0.8, r60: 0.1, pret: 5, sector: "Tech" }] };
  assert.equal(P.sugTrendLoc(T, T.top[0]), "1 din 2"); assert.equal(P.sugTrendLoc(T, T.top[1]), "2 din 2"); assert.equal(P.sugTrendLoc(T, { s: "X" }), "— din 2");
  const r = P.sugRanduri({ trend12: T }, ACUM).filter((x) => x.grup === "trend");
  assert.match(r[0].sub, /locul 1 din 2$/); assert.match(r[1].sub, /locul 2 din 2$/);
  assert.ok(!/\d\.\d{3,}/.test(r.map((x) => x.sub).join(" ")), "fără numere lungi cu punct");
  assert.doesNotMatch(citeste("public", "lib", "sugestii-ecran.js"), /\(\(x\.rang \|\| 0\) \+ 1\)|\(\(t\.rang \|\| 0\) \+ 1\)/);
});
function domFals() {
  function element(tag) {
    const el = { nodeType: 1, tagName: String(tag).toUpperCase(), attrs: {}, className: "", childNodes: [], parentNode: null };
    el.getAttribute = (k) => (el.attrs[k] == null ? null : el.attrs[k]);
    el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
    el.removeAttribute = (k) => { delete el.attrs[k]; };
    el.appendChild = (n) => { if (n.parentNode) { const i = n.parentNode.childNodes.indexOf(n); if (i >= 0) n.parentNode.childNodes.splice(i, 1); } n.parentNode = el; el.childNodes.push(n); return n; };
    el.removeChild = (n) => { const i = el.childNodes.indexOf(n); if (i >= 0) el.childNodes.splice(i, 1); n.parentNode = null; return n; };
    return el;
  }
  function parse(html) {
    const out = [], st = [{ childNodes: out, appendChild(n) { out.push(n); } }], re = /<\/([A-Za-z0-9]+)>|<([A-Za-z0-9]+)([^>]*)>|([^<]+)/g; let m;
    while ((m = re.exec(html))) {
      if (m[1]) { st.pop(); continue; }
      if (m[2]) { const e = element(m[2]); const ar = /([a-z-]+)="([^"]*)"/g; let a; while ((a = ar.exec(m[3]))) e.setAttribute(a[1], a[2]); const p = st[st.length - 1]; e.parentNode = p.nodeType ? p : null; p.childNodes.push(e); st.push(e); continue; }
      const t = { nodeType: 3, nodeValue: m[4], parentNode: null }, p = st[st.length - 1]; t.parentNode = p.nodeType ? p : null; p.childNodes.push(t);
    }
    return out;
  }
  const scrie = (n) => n.nodeType === 3 ? n.nodeValue : "<" + n.tagName.toLowerCase() + ">" + n.childNodes.map(scrie).join("") + "</" + n.tagName.toLowerCase() + ">";
  return { parse, scrie };
}
await test("🔑 „MAMastercard”: după alinierea pe loc, textul dintre simbol și nume rămâne ÎNTRE ele (ordinea amestecată a nodului nou)", () => {
  const src = citeste("public", "lib", "sugestii-ecran.js"), i = src.indexOf("function sugClasa("), j = src.indexOf("function sugAcelasiNod("), k = src.indexOf("function sugAlinia("), l = src.indexOf("// v100.292: --n (rândurile");
  assert.ok(i > 0 && j > i && k > 0 && l > k);
  const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(i, j) + src.slice(k, l) + "\nthis.sugAlinia = sugAlinia;", ctx);
  const D = domFals();
  const vechi = D.parse('<span class="sugRandSim"><b>MA</b> <span class="tbSub">Mastercard · Financiare</span></span>')[0];
  const b = vechi.childNodes[0];
  assert.equal(ctx.sugAlinia(vechi, D.parse('<span class="sugRandSim"><b>MA</b> <span class="tbSub">Mastercard · Financiare XLF</span> <span class="sugDir long">trend sus</span></span>')[0]), true);
  assert.equal(D.scrie(vechi), '<span><b>MA</b> <span>Mastercard · Financiare XLF</span> <span>trend sus</span></span>');
  assert.equal(vechi.childNodes[0], b, "nodul <b> e același (nu s-a rescris)");
  // și invers: un element dispare, textul de după el pleacă odată cu el
  assert.equal(ctx.sugAlinia(vechi, D.parse('<span class="sugRandSim"><b>MA</b> <span class="tbSub">Mastercard</span></span>')[0]), true);
  assert.equal(D.scrie(vechi), '<span><b>MA</b> <span>Mastercard</span></span>');
  assert.doesNotMatch(src, /function sincronTexte\(/, "funcția veche (textele la coadă) a plecat");
});

// ── 2. pagina Probe ──
await test("🔑 vederile: Sugestii = boți, revenire US/EU, sectoare, Trend; Probe = căderi + direcție; fără vedere, toate (probele vechi)", () => {
  const P = pagina(), d = DATE();
  assert.deepEqual(J(P.sugGrupuri(d, ACUM, "sugestii").map((g) => g.k)), ["porn", "revUS", "revEU", "sect", "trend"]);
  assert.deepEqual(J(P.sugGrupuri(d, ACUM, "probe").map((g) => g.k)), ["cad", "dir"]);
  assert.deepEqual(J(P.sugGrupuri(d, ACUM).map((g) => g.k)), ["porn", "cad", "dir", "revUS", "revEU", "sect", "trend"]);
  const toate = P.sugRanduri(d, ACUM), pr = P.sugRanduri(d, ACUM, "probe"), su = P.sugRanduri(d, ACUM, "sugestii");
  assert.equal(pr.length + su.length, toate.length, "fiecare rând într-o singură vedere");
  assert.ok(pr.length >= 12 && pr.every((r) => r.grup === "cad" || r.grup === "dir"));
  assert.ok(su.every((r) => r.grup !== "cad" && r.grup !== "dir"));
});
await test("🔑 nimic pierdut la mutare: grupurile, rândurile și fișele căderilor / direcției sunt pe Probe identice cu cele din Sugestii de dinainte", () => {
  const P = pagina(), d = DATE();
  P.sugStare.vedere = "probe";
  const h = P.prHtml(d, ACUM), t = text(h);
  for (const r of P.sugRanduri(d, ACUM).filter((x) => x.grup === "cad" || x.grup === "dir")) { assert.ok(h.includes('id="sugR-' + r.k + '"'), "rândul " + r.k); assert.ok(t.includes(text(r.sub).slice(0, 60)), "sub-rândul " + r.k); }
  assert.match(t, /📉 Monede Pionex · după o cădere mare \(în probă\)/); assert.match(t, /🎯 Monede Pionex · direcția pe 7 zile \(în probă\)/);
  assert.match(h, /class="tbBloc sugFisa" id="sugFisa"/, "fișa rândului ales");
  assert.match(h, /<h4>Listele în probă<\/h4>/);
  // celula „După o cădere mare · monede” a plecat din verdictele Sugestii; textul ei e în „Unde e fiecare probă”
  assert.doesNotMatch(P.sugVerdicteHtml(d), /După o cădere mare/);
  assert.match(t, /Unde e fiecare probă/); assert.match(t, /📉 După o cădere mare · monede Pionex/);
  P.sugStare.vedere = "sugestii";
  const hs = P.sugHtml(d, ACUM);
  assert.doesNotMatch(hs, /sugR-cad:|sugR-dir:/, "Sugestii fără rândurile mutate");
  assert.match(hs, /<p class="rlRasp" data-sug="rasp">[^<]*Căderile mari și direcția pe 7 zile \(monede Pionex, în probă\) sunt pe pagina lor, cu caietul de păreri: <button type="button" class="t212BtnLinie sugSpreProbe" data-action-click="navTo\('probe',true\)">🧪 Probe ›<\/button><\/p>/);
  assert.equal((hs.match(/data-sug="/g) || []).length, 4, "locurile paginii scrise de JS (rasp, verdicte, lista, nota; pânda le are în index.html) - niciun loc nou");
});
await test("revizia 🔵10: rândul ales și intervalul rămân ale fiecărei pagini (un clic pe Probe nu mută alegerea din Sugestii)", () => {
  const P = pagina(); vm.runInContext("this.sugSchimbaVedere = sugSchimbaVedere;", P);
  P.sugStare.vedere = "sugestii"; P.sugStare.ales = "sect:MA"; P.sugStare.tf = "1z";
  P.sugSchimbaVedere("probe"); assert.equal(P.sugStare.vedere, "probe"); assert.equal(P.sugStare.ales, undefined);
  P.sugStare.ales = "dir:BTC"; P.sugStare.tf = "4h";
  P.sugSchimbaVedere("sugestii"); assert.equal(P.sugStare.ales, "sect:MA"); assert.equal(P.sugStare.tf, "1z");
  P.sugSchimbaVedere("probe"); assert.equal(P.sugStare.ales, "dir:BTC"); assert.equal(P.sugStare.tf, "4h");
});
await test("🔑 „Unde e fiecare probă”: 5 probe (căderi, direcție, proba A, Trend 12 luni, caietul) cu de când, judecate, cum stă, privirile fixate", () => {
  const P = pagina(), d = DATE(), R = J(P.prProbe(d, ACUM));
  assert.deepEqual(R.map((r) => r.k), ["cad", "dir", "a", "trend", "caiet"]);
  const c = R[0], dr = R[1], a = R[2], k = R[4];
  assert.equal(c.de, "20.10.2026"); assert.equal(c.drum.text, "prima privire 01.03.2027 · verdictul 08.11.2027");
  assert.equal(dr.drum.text, "doar cifrele 08.05.2027 · a doua privire 08.11.2027"); assert.match(dr.sta, /^M1 a nimerit \d+%, M2 \d+% \(față de piață \d+% \/ \d+%\)/);
  assert.equal(a.jud, "3 zile, 7 zile-pereche cu semnal"); assert.equal(a.sta, "net pe semnal +0,2%, pe rest −0,1% (medii pe trade; verdictul se face pe zile)"); assert.equal(a.drum.text, "verdictul (z ≥ 2, o singură încercare) 01.02.2027");
  const T0 = J(P.prProbe({ trend12: { dataUltimei: "2026-11-06", top: [] } }, ACUM))[3]; assert.equal(T0.jud, "0 zile cu rezultat (robotul n-a trimis încă bilanțul)"); assert.equal(T0.sta, "fără cifre încă");
  assert.match(k.jud, /^5 păreri notate, 3 judecate$/); assert.match(k.sta, /tu .*%.*Claude .*%|Claude .*% · tu .*%/); assert.match(k.sta, /sub 30 de păreri judecate, scorul e zgomot/);
  // fără date: nimic inventat
  const G = J(P.prProbe({}, ACUM)); assert.match(G[0].jud, /încă nimic/); assert.match(G[1].jud, /nicio zi judecată/); assert.match(G[2].jud, /aștept colectorul/); assert.equal(G[4].jud, "aștept caietul");
});
await test("drumul: umplerea = cât a trecut din drum, privirile ca semne; SVG întreg (alinierea pe loc îl înlocuiește când diferă)", () => {
  const P = pagina();
  const s = P.prDrumSvg(0.25, [0.4], "x");
  assert.match(s, /<rect class="prDrumPlin" x="0" y="4" width="25\.0" height="4">/); assert.match(s, /<line class="prDrumPriv" x1="40\.0" x2="40\.0"/);
  assert.match(P.prDrumSvg(-1, [], "x"), /width="0\.0"/); assert.match(P.prDrumSvg(3, [], "x"), /width="100\.0"/);
  const R = J(P.prProbe(DATE(), ACUM)); assert.match(R[0].drum.svg, /^<svg class="prDrumSvg"/); assert.match(R[0].drum.svg, /aria-label="Căderile: \d+% din drum, următoarea privire peste \d+ (de )?zile, verdictul peste \d+ (de )?zile"/);
});
await test("🔑 convențiile pe textul paginii Probe (cu datele probei de telefon): o zecimală, virgula, minusul, fără engleză - 0 abateri", () => {
  const P = pagina(), d = DATE(); P.sugStare.vedere = "probe";
  const t = text(P.prHtml(d, ACUM)) + " " + text(P.prCaietScorHtml(d.pareri)) + " " + text(P.prCaietRanduri(d.pareri, ACUM));
  const ab = abateri(t); assert.deepEqual(J(ab), [], JSON.stringify(ab).slice(0, 400));
});

// ── 3. caietul ──
await test("🔑 Caiet.scor: Brier pe autor, abilitatea față de „50% la fiecare”, nimeritele, M2 pe aceleași păreri", () => {
  const P = pagina(), l = [{ id: "a", p: 0.8, autor: "eu" }, { id: "b", p: 0.3, autor: "eu", m2: 0.6 }, { id: "c", p: 0.5, autor: "eu" }, { id: "d", p: 0.47, autor: "claude" }, { id: "e", p: 0.9, autor: "claude" }];
  const s = J(P.Caiet.scor(l, { a: { y: 1 }, b: { y: 1 }, c: { y: 0 }, d: { y: 0 }, e: { p0: 1 } }));
  // eu: (0,2² + 0,7² + 0,5²) / 3 = (0,04 + 0,49 + 0,25) / 3 = 0,26 ⇒ abilitatea 1 − 0,26/0,25 = −0,04; nimerite 1 din 2 (0,5 nu se socotește)
  assert.ok(Math.abs(s.eu.brier - 0.26) < 1e-12); assert.ok(Math.abs(s.eu.abilitate + 0.04) < 1e-12); assert.equal(s.eu.nimerite, 1); assert.equal(s.eu.decise, 2); assert.equal(s.eu.notate, 3); assert.equal(s.eu.judecate, 3);
  // M2 pe părerea b: (0,6 − 1)² = 0,16 ⇒ 1 − 0,64 = 0,36; autorul pe aceeași: (0,3 − 1)² = 0,49 ⇒ 1 − 1,96 = −0,96
  assert.equal(s.eu.m2n, 1); assert.ok(Math.abs(s.eu.m2Abilitate - 0.36) < 1e-12); assert.ok(Math.abs(s.eu.m2AbilitateTa + 0.96) < 1e-12);
  // claude: doar d judecată: 0,47² = 0,2209 ⇒ 1 − 0,8836 = 0,1164; e așteaptă
  assert.equal(s.claude.judecate, 1); assert.equal(s.claude.notate, 2); assert.ok(Math.abs(s.claude.abilitate - 0.1164) < 1e-12); assert.equal(s.claude.nimerite, 1);
});
await test("🔑 tura-pareri: prețul la notare și la termen = închiderea lumânării de 1 minut a orei; y = mai sus strict; judecata nu se rescrie", async () => {
  const la = Date.parse("2026-11-07T13:40:20Z"), m0 = Date.parse("2026-11-07T13:40:00Z"), T = m0 + 7 * ZI + 20000, cereri = [];
  const bare = async (sim, t) => { cereri.push([sim, t]); const m = Math.floor(t / MIN) * MIN; return [[m, "0", "0", "0", t < la + ZI ? "0.3364" : "0.3121", "0", m + MIN - 1]]; };
  const ex = new Set(["STXUSDT", "1000PEPEUSDT"]);
  const L = [{ id: "x", s: "STX", p: 0.47, zile: 7, la }];
  let r = await TP.judecaLista(L, {}, ex, bare, la + MIN);   // încă în primele 2 minute: doar simbolul
  assert.deepEqual(J(r.judecate), { x: { sim: "STXUSDT", mult: 1 } }); assert.equal(cereri.length, 0);
  r = await TP.judecaLista(L, r.judecate, ex, bare, la + 5 * MIN);
  assert.equal(r.judecate.x.p0, 0.3364); assert.equal(r.judecate.x.y, undefined); assert.deepEqual(cereri[0], ["STXUSDT", la]);
  r = await TP.judecaLista(L, r.judecate, ex, bare, la + 7 * ZI + 3 * MIN);
  assert.equal(r.judecate.x.pT, 0.3121); assert.equal(r.judecate.x.y, 0); assert.equal(cereri[1][1], la + 7 * ZI);
  const n = cereri.length; r = await TP.judecaLista(L, r.judecate, ex, bare, la + 9 * ZI); assert.equal(cereri.length, n, "gata ⇒ nicio cerere"); assert.equal(r.schimbat, false);
  // PEPE e „1000PEPEUSDT”; moneda inexistentă ⇒ eroare scrisă o dată
  assert.deepEqual(J(TP.simbolPentru("pepe", ex)), { sim: "1000PEPEUSDT", mult: 1000 });
  r = await TP.judecaLista([{ id: "q", s: "XYZQ", p: 0.6, zile: 1, la }], {}, ex, bare, la + 5 * MIN); assert.match(r.judecate.q.eroare, /nu e pe Binance/);
  // părerea ștearsă ⇒ judecata ei iese
  r = await TP.judecaLista([], { x: { y: 1 } }, ex, bare, la); assert.deepEqual(J(r.judecate), {}); assert.equal(r.schimbat, true);
  // egal ⇒ „nu mai sus”; minutul lipsă ⇒ încă nu (iar după 3 zile, eroare)
  assert.equal(TP.inchidereMinut([[m0, 0, 0, 0, "1.5"]], la), 1.5); assert.equal(TP.inchidereMinut([[m0 + MIN, 0, 0, 0, "1.5"]], la), null);
  const egal = async (s, t) => [[Math.floor(t / MIN) * MIN, 0, 0, 0, "2"]];
  r = await TP.judecaLista([{ id: "e", s: "STX", p: 0.5, zile: 1, la }], {}, ex, egal, la + ZI + 3 * MIN); assert.equal(r.judecate.e.y, 0);
  const gol = async () => [];
  r = await TP.judecaLista([{ id: "g", s: "STX", p: 0.5, zile: 1, la }], {}, ex, gol, la + ZI); assert.equal(r.judecate.g.eroare, undefined);
  r = await TP.judecaLista([{ id: "g", s: "STX", p: 0.5, zile: 1, la }], {}, ex, gol, la + 4 * ZI); assert.match(r.judecate.g.eroare, /ora notării/);
});
await test("tura-pareri: o dată pe oră; exchangeInfo o dată pe zi; serverul tăcut ⇒ reîncearcă; trimite judecățile ÎNTREGI doar când s-a schimbat ceva", async () => {
  const la = Date.parse("2026-11-07T13:40:00Z"), trimise = [], st = {};
  let lista = { pareri: [{ id: "x", s: "STX", p: 0.47, zile: 7, la }], judecate: {} }, info = 0;
  const d = (acum) => ({ acum, cere: async () => lista, trimite: async (c, b) => { trimise.push([c, J(b)]); lista = { ...lista, judecate: b.judecate }; },
    binance: async (u) => { if (/exchangeInfo/.test(u)) { info++; return { symbols: [{ symbol: "STXUSDT", contractType: "PERPETUAL", quoteAsset: "USDT" }] }; } const t = Number(new URL(u).searchParams.get("startTime")); return [[t, 0, 0, 0, "0.34"]]; } });
  await TP.turaPareri(d(la + 10 * MIN), st); assert.equal(trimise.length, 1); assert.equal(trimise[0][0], "/api/istoric-bot?action=pareriJudecate"); assert.equal(trimise[0][1].judecate.x.p0, 0.34);
  assert.equal(await TP.turaPareri(d(la + 30 * MIN), st), null, "sub o oră: nimic"); assert.equal(info, 1);
  await TP.turaPareri(d(la + 2 * ORA), st); assert.equal(trimise.length, 1, "nimic nou ⇒ nu trimite"); assert.equal(info, 1, "aceeași zi ⇒ exchangeInfo o dată");
  const st2 = {}; assert.equal(await TP.turaPareri({ ...d(la), cere: async () => null }, st2), null); assert.equal(st2.la, undefined, "serverul tăcut ⇒ bucla următoare reîncearcă");
});
await test("🔑 ruta: păreri - ora o pune serverul; șansa 1–99%, orizonturile 1/3/7/14/30; o oră din trecut ≤ 3 zile = „retro”; ștergerea doar în 15 minute; judecățile și proba A pe chei separate", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (a, corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.3", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = async (a) => (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.3" } }), env: ENV })).json();
  assert.deepEqual(await get("pareri"), { pareri: [], judecate: {} });
  for (const rau of [{ op: "adauga", s: "", p: 0.5, zile: 7, autor: "eu" }, { op: "adauga", s: "STX", p: 1, zile: 7, autor: "eu" }, { op: "adauga", s: "STX", p: 0.5, zile: 5, autor: "eu" }, { op: "adauga", s: "STX", p: 0.5, zile: 7, autor: "x" }, { op: "xx" }, { op: "adauga", s: "STX", p: 0.5, zile: 7, autor: "eu", la: Date.now() - 4 * ZI }])
    assert.equal((await post("pareri", rau)).status, 400, JSON.stringify(rau));
  const t0 = Date.now(), r1 = await (await post("pareri", { op: "adauga", s: "stx_usdt", p: 0.471, zile: 7, autor: "claude", la: Date.parse("2020-01-01") + 0 * t0 + (t0 - 2 * ZI - 13 * MIN - (t0 % MIN)) - Date.parse("2020-01-01"), nota: "practic ban", m2: 0.4123 })).json();
  assert.equal(r1.ok, true); const p = r1.parere;
  assert.equal(p.s, "STX", "„stx_usdt” ⇒ STX"); assert.equal(p.p, 0.47); assert.equal(p.retro, true); assert.equal(p.la % MIN, 0); assert.equal(p.m2, 0.412); assert.equal(p.nota, "practic ban"); assert.ok(p.creat >= t0);
  const r2 = await (await post("pareri", { op: "adauga", s: "ZEC", p: 0.6, zile: 3, autor: "eu" })).json(); assert.ok(!r2.parere.retro); assert.ok(Math.abs(r2.parere.la - Date.now()) < 5000, "ora serverului");
  assert.equal((await get("pareri")).pareri.length, 2);
  assert.equal((await post("pareri", { op: "sterge", id: r2.parere.id })).status, 200); assert.equal((await get("pareri")).pareri.length, 1);
  const L = JSON.parse(kv.get("pareri:lista")); L[0].creat -= 16 * MIN; kv.set("pareri:lista", JSON.stringify(L));
  assert.equal((await post("pareri", { op: "sterge", id: p.id })).status, 409, "după 15 minute rămâne");
  assert.equal((await post("pareriJudecate", { la: 1, judecate: [] })).status, 400); assert.equal((await post("pareriJudecate", { la: 1, judecate: { [p.id]: { y: 1 } } })).status, 200);
  assert.deepEqual((await get("pareri")).judecate, { [p.id]: { y: 1 } }); assert.equal(JSON.parse(kv.get("pareri:lista")).length, 1, "judecățile nu ating lista");
  // revizia 🟡2: o părere cu termenul deja trecut (sau sub o oră) nu se primește - rezultatul s-ar ști dinainte
  assert.equal((await post("pareri", { op: "adauga", s: "BTC", p: 0.9, zile: 1, autor: "eu", la: Date.now() - 2 * ZI })).status, 400);
  assert.equal((await post("pareri", { op: "adauga", s: "BTC", p: 0.9, zile: 1, autor: "eu", la: Date.now() - ZI + 30 * MIN })).status, 400, "termenul în 30 de minute");
  // revizia 🟡4: M2 doar pe părerile de 7 zile
  const r3 = await (await post("pareri", { op: "adauga", s: "SOL", p: 0.55, zile: 3, autor: "eu", m2: 0.6 })).json(); assert.equal(r3.parere.m2, undefined);
  // revizia 🔵9: KV-ul stricat ⇒ 503, nu caiet gol (colectorul ar fi șters judecățile)
  const bun = kv.get("pareri:lista"); kv.set("pareri:lista", "{stricat"); const g503 = await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=pareri", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.3" } }), env: ENV });
  assert.equal(g503.status, 503); kv.set("pareri:lista", bun);
  // revizia 🔴1: verdictul Monte Carlo al colectorului își păstrează rândul „Pe 7 zile” prin rută (altfel Tabloul nu-l arată cât merge colectorul)
  assert.equal((await post("mcVerdict", { la: 1, boti: { b1: { cat: "tine", stare: "info", text: "7 zile: …", la: 1, ultima: 1, scurt: null, sapt: "Pe 7 zile, fără tendință: gridul are 8,0% lățime" } } })).status, 200);
  assert.equal((await get("mcVerdict")).mcVerdict.boti.b1.sapt, "Pe 7 zile, fără tendință: gridul are 8,0% lățime");
  assert.equal((await post("probaA", { la: 1 })).status, 400); assert.equal((await post("probaA", { la: 1, zile: 3, nSemnal: 7 })).status, 200); assert.deepEqual((await get("probaA")).probaA, { la: 1, zile: 3, nSemnal: 7 });
  const { plafonIstoricBot } = await import("../functions/_shared/plafon-corp.js"); assert.equal(plafonIstoricBot("pareriJudecate"), 786432); assert.equal(plafonIstoricBot("pareri"), 65536);
});
await test("pagina: caietul arată toate stările (nimerită, greșită, așteaptă, fără judecată, trecută mai târziu, M2) și scorul pe autor", () => {
  const P = pagina(), d = DATE(), h = P.prCaietRanduri(d.pareri, ACUM), t = text(h), s = text(P.prCaietScorHtml(d.pareri));
  assert.match(t, /STX ▼ 47% sus în 7 zile Claude · \d\d\.\d\d \d\d:\d\d \(trecută mai târziu, ora din conversație\)/); assert.match(t, /▼ n-a urcat · nimerit · 0,3364 ⇒ 0,3121 \(−7,2%\)/);
  assert.match(t, /BTC ▲ 60% sus în 1 zi tu/); assert.match(t, /▲ a urcat · nimerit/);
  assert.match(t, /ZEC ▲ 55% sus în 7 zile tu · .* · M2 zicea 41%/); assert.match(t, /se judecă pe \d\d\.\d\d \d\d:\d\d · 512,3/);
  assert.match(t, /PEPE ▼ 35% sus în 3 zile/); assert.match(t, /0,0000072 ⇒ 0,0000069|0,00000721 ⇒ 0,00000694/, "prețul unui PEPE (÷ 1000)");
  assert.match(t, /fără judecată: moneda nu e pe Binance/);
  assert.match(s, /^Tu \+\d+,\d% față de „50% la fiecare” · 1 nimerită din 1 · 1 judecată din 3 notate/); assert.match(s, /Claude \+\d+,\d% față de „50% la fiecare” · 2 nimerite din 2 · 2 judecate din 2 notate/);
  assert.ok(!/class="t212BtnLinie prSterge"/.test(h), "ștergerea doar în primele 15 minute");
});
await test("pagina: formularul stă în afara zonei redesenate (index.html), cu etichete; notarea prin POST, ștergerea în 15 minute; M2 luat din lista zilei", () => {
  const H = citeste("public", "index.html"), i = H.indexOf('<section class="panel" id="probe">'), j = H.indexOf("</section>", i), s = H.slice(i, j);
  assert.ok(i > 0); assert.ok(s.indexOf('id="prPagina"') < s.indexOf('id="prCaietForm"'), "formularul nu e în #prPagina");
  for (const id of ["prS", "prP", "prZile", "prAutor", "prNota"]) assert.match(s, new RegExp('<label class="prCamp[^"]*">[^<]+<(input|select) id="' + id + '"'));
  assert.match(s, /<button type="button" class="t212BtnLinie sugBtnPlin" id="prNoteaza" data-action-click="prNoteaza\(\)">Notează părerea<\/button>/); assert.match(s, /id="prCaietLista"/);
  assert.match(s, /<option value="7" selected="">7 zile<\/option>/);
  const E = citeste("public", "lib", "probe-ecran.js");
  assert.match(E, /apiFetch\("\/api\/istoric-bot\?action=pareri", \{ method: "POST"/); assert.match(E, /Date\.now\(\) - \(p\.creat \|\| 0\) < 15 \* 60000/);
  assert.match(E, /if \(z === 7 && x && x\.P2 > 0 && x\.P2 < 1 && !\(typeof sugDirVeche === "function" && sugDirVeche\(dl, Date\.now\(\)\)\)\) corp\.m2 = x\.P2;/);
});

// ── 4. I-842, I-844, I-845, I-847 ──
await test("🔑 I-842: Tablou „Pe 7 zile” - gridul față de mișcarea obișnuită pe o săptămână, ieșirea din grid, pierderea la stop", () => {
  const ctx = { console, Math, Number, String, Array, Object, JSON, isFinite, Date, Intl }; vm.createContext(ctx);
  vm.runInContext(["text-ro.js", "grid-calcul.js", "grid-proba.js", "monte-simbol.js", "grid-sim.js"].map((f) => citeste("public", "lib", f)).join("\n") + "\nthis.GridSim = GridSim;", ctx);
  // zile (96 de bare) alternante ±5%: dus-întorsul din zi nu mai intră (pe STX, 15 minute și 4 ore dădeau ±18,5%, zilele ±13,4%)
  const G = ctx.GridSim, b15 = []; let c = 1; for (let i = 0; i < 31 * 96; i++) { c *= Math.exp((Math.floor(i / 96) % 2 ? 1 : -1) * 0.05 / 96); b15.push({ t: i * 900000, o: c, h: c, l: c, c }); }
  const x = J(G.riscSaptamana({ orizonturi: [{ zile: 1, pIesire: 0.3, pStop: 0.02 }, { zile: 7, pIesire: 0.92, pStop: 0.26 }] }, b15, { gridJos: 0.333, gridSus: 0.3607 }));
  assert.ok(Math.abs(x.latime - (0.3607 - 0.333) / ((0.3607 + 0.333) / 2)) < 1e-12); assert.equal(x.pIesire, 0.92); assert.equal(x.pStop, 0.26); assert.equal(x.oprit, false);
  const rr = []; for (let k = b15.length - 1; k - 96 >= 0; k -= 96) rr.push(Math.log(b15[k].c / b15[k - 96].c));
  const mm = rr.reduce((a, v) => a + v, 0) / rr.length, vv = rr.reduce((a, v) => a + (v - mm) ** 2, 0) / (rr.length - 1);
  assert.ok(rr.every((v) => Math.abs(Math.abs(v) - 0.05) < 1e-12), "zilele sunt aliniate de la ultima bară");
  assert.ok(Math.abs(x.miscare7 - (Math.exp(Math.sqrt(vv * 7)) - 1)) < 1e-9); assert.ok(Math.abs(x.miscare7 - (Math.exp(0.05 * Math.sqrt(7)) - 1)) < 5e-3, "≈ e^(0,05·√7) − 1 = 14,1–14,4% (abaterea fără deplasare)");
  assert.equal(G.textSaptamana(x, -28.04), "Pe 7 zile, fără tendință: gridul are 8,0% lățime (±4,0% de la mijloc), iar o săptămână obișnuită mișcă moneda cu ±14,4% (mai mult decât jumătatea gridului) · prețul iese din grid în 92% din drumuri · dacă stopul e atins (26%): −28,0 USDT");
  // botul deja oprit în reluarea drumului real (STX, 07.11: stopul la 0,33): fără „100%” inventate
  const xo = J(G.riscSaptamana({ acum: { oprit: "oprit", net: 0 }, orizonturi: [{ zile: 7, pIesire: 1, pStop: 1 }] }, b15, { gridJos: 0.333, gridSus: 0.3607 }));
  assert.equal(xo.oprit, true); assert.equal(xo.pIesire, null); assert.equal(xo.pStop, null);
  assert.equal(G.textSaptamana(xo, -7.4), "Pe 7 zile, fără tendință: gridul are 8,0% lățime (±4,0% de la mijloc), iar o săptămână obișnuită mișcă moneda cu ±14,4% (mai mult decât jumătatea gridului) · reluarea arată botul deja oprit, deci fără șansele pe drumuri (vezi Simulatorul)");
  assert.equal(G.textSaptamana({ latime: 0.2, miscare7: 0.13 }, null), "Pe 7 zile, fără tendință: gridul are 20,0% lățime (±10,0% de la mijloc), iar o săptămână obișnuită mișcă moneda cu ±13,0% (mai mult decât jumătatea gridului)");   /* jumătatea, nu toată lățimea (revizia 🔵6) */
  assert.equal(G.textSaptamana({ latime: 0.2, miscare7: 0.1, pIesire: 0.004, pStop: 0.001 }, -5), "Pe 7 zile, fără tendință: gridul are 20,0% lățime (±10,0% de la mijloc), iar o săptămână obișnuită mișcă moneda cu ±10,0% · prețul iese din grid în sub 1% din drumuri");
  assert.equal(G.riscSaptamana({ orizonturi: [] }, [], {}), null);
  const A = citeste("public", "app.js");
  assert.match(A, /tbMc\.rand\.sapt=typeof tbMcSapt==="function"\?tbMcSapt\(rez,tbMc\.b15,b\):null;/); assert.match(A, /sapt:tbMc\.rand\.sapt\|\|null/);
  // și când verdictul vine de la colector (pagina nu mai simulează cât KV-ul e proaspăt): colectorul îl socotește cu același GridSim
  assert.match(A, /scurt:v\.scurt\|\|null,sapt:v\.sapt\|\|null\};/);
  const MC = citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"); assert.equal((MC.match(/regimLa, scurt, sapt \}/g) || []).length, 4);
  assert.match(MC, /sapt = d\.GridSim\.textSaptamana && d\.GridSim\.riscSaptamana \? d\.GridSim\.textSaptamana\(d\.GridSim\.riscSaptamana\(rez, b15, b\), d\.laStop \? d\.laStop\(b\) : null\) \|\| null : null;/);
  assert.match(citeste("scripts", "colector.mjs"), /randuri15: lumanari15M, laStop: \(x\) => \(x && x\.opritorPierdereActiv \? TabloExtra\.totalLaOpritor\(x\) : null\),/);
  assert.match(A, /\+tbMcScurtHtml\(mc\.scurt\)\+tbMcScurtVerifHtml\([^)]*:null\)\+\(mc\.sapt\?'<span class="tbSub tbMcScurt tbMcSapt">'\+escapeHtml\(mc\.sapt\)\+'<\/span>':''\)\+/);
  assert.match(A, /function tbMcSapt\(rez,b15,b\)\{try\{[^}]*GridSim\.riscSaptamana\(rez,b15,b\),ls=b&&b\.opritorPierdereActiv&&typeof TabloExtra!=="undefined"&&TabloExtra\.totalLaOpritor\?TabloExtra\.totalLaOpritor\(b\):null/);
});
await test("🔑 I-844: raportul de duminică - un rând pe căderi, direcție și caiet, cu zilele lipsă din săptămână; fără verdict", () => {
  const acum = Date.parse("2026-11-15T19:00:00Z");
  assert.deepEqual(zileLipsa(["2026-11-14", "2026-11-13", "2026-11-11", "2026-11-10", "2026-11-09", "2026-11-08"], acum, "2026-11-07"), ["2026-11-12"]);
  assert.deepEqual(zileLipsa([], Date.parse("2026-11-08T19:00:00Z"), "2026-11-07"), ["2026-11-07"], "înainte de start nu se socotește");
  const d = DATE(), L = liniiProbeRaport({ caderi: d.caderi, directie: d.directie, pareri: d.pareri, scor: pagina().Caiet.scor(d.pareri.pareri, d.pareri.judecate), lipsaCaderi: ["2026-11-12"], lipsaDirectie: [] });
  assert.equal(L.length, 3);
  assert.match(L[0], /^📉 Căderi \(în probă, din 20\.10\.2026\): \d+ (de )?(căderi|cădere) în \d+ (de )?zile judecate.*; ⚠ 1 zi lipsă săptămâna asta \(12\.11\)\. Privirile: 01\.03\.2027 și 08\.11\.2027, fără verdict înainte\.$/);
  assert.match(L[1], /^🎯 Direcția pe 7 zile \(în probă, din 24\.10\.2026\): \d+ (de )?perechi judecate în \d+ zile; M1 a nimerit \d+% \(față de piață \d+%\), M2 \d+% \(\d+%\).*nicio zi lipsă săptămâna asta\. Privirile: 08\.05\.2027 \(cifrele\) și 08\.11\.2027\.$/);
  assert.match(L[2], /^📓 Caietul de păreri: 5 păreri notate, 3 judecate; față de „50% la fiecare”: (tu|Claude) .* · sub 30 de păreri judecate scorul e zgomot\.$/);
  for (const l of L) assert.deepEqual(J(abateri(l)), [], l);
  const G = liniiProbeRaport({}); assert.match(G[0], /nimic judecat încă/); assert.match(G[1], /nicio zi judecată încă/); assert.equal(G[2], "📓 Caietul de păreri: 0 păreri notate, 0 judecate.");
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /rap\.linii\.push\(\.\.\.liniiProbeRaport\(\{ caderi: await cit\("caderi", "caderi"\), directie: await cit\("directie", "directie"\), pareri: P, scor: P \? Caiet\.scor\(P\.pareri, P\.judecate\) : null,/);
  assert.ok(C.indexOf("liniiProbeRaport({") > C.indexOf("rap.linii.push(liniaProbaA(pa))") && C.indexOf("liniiProbeRaport({") < C.indexOf("await trimite(\"/api/istoric-bot?action=raport\""), "în raport, înainte de trimitere");
});
await test("🔑 I-847: panoul zilnic - a doua cerere a aceleiași serii zilnice vine din panou (copie), alte cereri trec direct; null nu se ține; ziua nouă golește", async () => {
  let ceas = Date.parse("2026-11-08T06:05:00Z"), n = 0; const lov = [];
  const jos = async (u) => { n++; lov.push(u); return /bad/.test(u) ? null : /exchangeInfo/.test(u) ? { symbols: [{ symbol: "AUSDT" }] } : [[1, "1", "1", "1", "2", "0", 2, "5"]]; };
  jos.stare = { oprit: null }; jos.reia = () => "reia";
  const b = cuPanouZilnic(jos, { ceas: () => ceas });
  const K = "https://fapi.binance.com/fapi/v1/klines?symbol=AUSDT&interval=1d&limit=200";
  const x1 = await b(K), x2 = await b(K); assert.deepEqual(x1, x2); assert.notEqual(x1, x2, "copie, nu același obiect"); x2[0][4] = "999"; assert.equal((await b(K))[0][4], "2", "o tură nu strică datele celeilalte"); assert.equal(n, 1);
  await b("https://fapi.binance.com/fapi/v1/exchangeInfo"); await b("https://fapi.binance.com/fapi/v1/exchangeInfo"); assert.equal(n, 2);
  await b("https://fapi.binance.com/fapi/v1/fundingRate?symbol=AUSDT&startTime=1&limit=200"); await b("https://fapi.binance.com/fapi/v1/fundingRate?symbol=AUSDT&startTime=1&limit=200"); assert.equal(n, 4, "funding-ul trece direct");
  await b("https://fapi.binance.com/fapi/v1/klines?symbol=AUSDT&interval=1d&limit=1000"); assert.equal(n, 5, "altă limită (BTC 1000) = altă serie");
  await b("https://fapi.binance.com/fapi/v1/klines?symbol=AUSDT&interval=1m&startTime=5&limit=1"); assert.equal(n, 6);
  { let m = 0; const j2 = async () => { m++; return [[1]]; }; const b2 = cuPanouZilnic(j2, { ceas: () => ceas });   /* mutația din 07.11 scăpase: o singură cerere nu vedea panoul */
    for (const u of ["https://fapi.binance.com/fapi/v1/klines?symbol=A&interval=1m&startTime=5&limit=1", "https://fapi.binance.com/fapi/v1/klines?symbol=A&interval=1d&startTime=5&limit=1", "https://fapi.binance.com/fapi/v1/klines?symbol=A&interval=4h&limit=200"]) { await b2(u); await b2(u); }
    assert.equal(m, 6, "barele pe alt interval sau cu startTime trec direct, de fiecare dată"); }
  await b("https://fapi.binance.com/fapi/v1/klines?symbol=bad&interval=1d&limit=200"); await b("https://fapi.binance.com/fapi/v1/klines?symbol=bad&interval=1d&limit=200"); assert.equal(n, 8, "un eșec nu se ține minte");
  ceas += ZI; await b(K); assert.equal(n, 9, "ziua nouă: panoul gol");
  assert.equal(b.stare, jos.stare); assert.equal(b.reia(), "reia");
  b.goleste(); await b(K); assert.equal(n, 10, "după golire, seria se cere din nou"); assert.deepEqual(J(b.panou()), { zi: "2026-11-09", serii: 1, luate: 0, cerute: 2 });
  assert.equal(cheiePanou(K), "k:AUSDT:200"); assert.equal(cheiePanou("https://fapi.binance.com/fapi/v1/klines?symbol=AUSDT&interval=1d&limit=200&endTime=5"), null);
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /const binancePanou = cuPanouZilnic\(binanceDirect, \{ jurnal \}\);/);
  assert.match(C, /turaCaderiModul\(\{ binance: binancePanou,/); assert.match(C, /\.then\(\(\) => turaDirectieColector\(\)\)\.catch\(\(e\) => jurnal\("directie", e\.message\)\)\.then\(\(\) => binancePanou\.goleste\(\)\)\.then\(\(\) => turaProbeColector\(\)\)/); assert.match(C, /turaDirectieModul\(\{ binance: binancePanou,/);
  const TC = citeste("scripts", "lib", "tura-caderi.mjs"), TD = citeste("scripts", "lib", "tura-directie.mjs");
  assert.match(TC, /klines\?symbol=\$\{encodeURIComponent\(s\)\}&interval=1d&limit=\$\{r\.bare\}/); assert.match(TD, /klines\?symbol=\$\{encodeURIComponent\(s\)\}&interval=1d&limit=\$\{s === "BTCUSDT" \? r\.bareBtc : r\.bare\}/);
  assert.match(TC, /bare: 200,/); assert.match(TD, /bare: 200, bareBtc: 1000/);   /* aceeași adresă ⇒ același răspuns */
});
await test("🔑 I-845: proba de telefon servește corpurile reale din scripts/date/proba-telefon (căderi, direcție, caiet, proba A) cu ora mutată la acum, fără KV; Probe în garda convențiilor", () => {
  const T = citeste("scripts", "proba-ecran-telefon.mjs");
  assert.match(T, /for \(const f of \["caderi", "directie", "pareri", "probaA"\]\)/); assert.match(T, /process\.env\.PROBA_FARA_DATE/);
  assert.match(T, /u\.pathname === "\/api\/istoric-bot" && x\.params\.request\.method === "GET" \? corpProba\(u\.searchParams\.get\("action"\)\) : null/); assert.match(T, /method: "Fetch\.fulfillRequest"/);
  assert.match(citeste("scripts", "proba-ecran-telefon-conventii.mjs"), /PAGINI_CONVENTII = \[[^\]]*"probe"/);
  for (const f of ["caderi", "directie", "pareri", "probaA"]) { const x = PT(f); assert.ok(x._acum > 0 && x.raspuns && x._nota, f); }
  assert.equal(PT("caderi").raspuns.caderi.lista.length, 2); assert.equal(PT("directie").raspuns.directie.lista.length, 10);
});
await test("stadiul probei A: zilele, semnalele, mediile pe trade (ca rândul de duminică), ultima zi", () => {
  const z = Math.floor(Date.parse("2026-11-05T00:00:00Z") / ZI), l = [{ zi: z, simbol: "BTC", semnal: true, net: 0.004 }, { zi: z, simbol: "ETH", semnal: false, net: -0.002 }, { zi: z + 1, simbol: "BTC", semnal: true, net: -0.001 }, { zi: z + 1, simbol: "SOL", semnal: false, net: null }];
  assert.deepEqual(J(stadiuProbaA(l.map((x) => JSON.stringify(x)).join("\n"))), { din: "2026-11-04", verdictDupa: "2027-02-01", zile: 2, n: 4, nSemnal: 2, netSemnal: 0.0015, netRest: -0.002, ultima: "2026-11-06" });
  assert.deepEqual(J(stadiuProbaA("")), { din: "2026-11-04", verdictDupa: "2027-02-01", zile: 0, n: 0, nSemnal: 0, netSemnal: null, netRest: null, ultima: null });
});

// ── 5. legăturile ──
await test("🔑 legăturile paginii: meniul (Zilnic, după Sugestii) + meniul de pe telefon + panoul + scripturile + SW + app.js (navTo, lista albă, paleta, pagina nouă)", () => {
  const H = citeste("public", "index.html"), A = citeste("public", "app.js"), W = citeste("public", "sw.js");
  assert.match(H, /data-nav="sugestii"><span class="sideIcon">💡<\/span>Sugestii<\/button>\n<button class="sideBtn" data-action-click="navTo\('probe',true\)" data-nav="probe"><span class="sideIcon">🧪<\/span>Probe<\/button>/);
  assert.match(H, /<b>💡<\/b>Sugestii<\/button>\n<button class="moreBtn" data-action-click="moreNav\('probe',true\)"><b>🧪<\/b>Probe<\/button>/);
  assert.match(H, /<script src="\/lib\/sugestii-ecran\.js"><\/script><script src="\/lib\/caiet\.js"><\/script><script src="\/lib\/probe-ecran\.js"><\/script>/);
  assert.match(W, /"\/lib\/sugestii-ecran\.js","\/lib\/caiet\.js","\/lib\/probe-ecran\.js",/);
  assert.match(A, /else if\(id==="probe"\)\{if\(typeof prPorneste==="function"\)prPorneste\(false\)\}/);
  assert.match(A, /NAV_CU_LOAD=new Set\(\[[^\]]*"probe"/); assert.match(A, /PAGINI_ZILNICE=\["dash","tabloubot","sugestii","probe",/); assert.match(A, /"deriv","probe"\]\.includes\(id\)/);
  assert.match(A, /\["Probe \(căderi, direcție, caietul de păreri\)","probe"\]/);
  const lista = A.match(/var ACTIUNI_PERMISE=new Set\("([^"]+)"/)[1].split(" "); for (const f of ["prNoteaza", "prSterge", "prLaCaiet", "sugDesface", "sugAlege"]) assert.ok(lista.includes(f), f);
  const S = citeste("public", "lib", "sugestii-ecran.js");
  assert.match(S, /async function sugPorneste\(fortat\) \{\n  sugSchimbaVedere\("sugestii"\);/);   /* revizia 🔵10: alegerea ținută pe pagină */
  assert.match(S, /var vd = sugVedere\(sugStare\.vedere\), el = document\.getElementById\(SUG_VEDERI\[vd\]\.el\);/);
  assert.match(citeste("public", "lib", "probe-ecran.js"), /async function prPorneste\(fortat\) \{\n  if \(typeof sugSchimbaVedere === "function"\) sugSchimbaVedere\("probe"\); else sugStare\.vedere = "probe";/);
});
await test("CSS: pagina Probe înaintea @container-ului verdictelor (după v100.310), verdictele Sugestii pe 4 coloane, ultima regulă rămâne #topLive; telefonul la 44 px", () => {
  const C = citeste("public", "app.css");
  assert.match(C, /\.sugVerdicte\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);/);
  const i = C.indexOf("/* v100.312 (el, 07.11: „pune tot ce am făcut azi"), j = C.indexOf("@container (max-width:899px){.sugVerdicte{"), k = C.indexOf("/* v100.310 (el, 07.11");
  assert.ok(k > 0 && i > k && j > i);
  assert.match(C, /#prPagina,#prPagina \.sugLista2\{container-type:inline-size\}/); assert.match(C, /\.prDrumPlin\{fill:var\(--accent\)\}/);
  assert.match(C, /@media \(max-width:640px\)\{\.prCamp input,\.prCamp select,#prNoteaza,\.prDu,\.prSterge\{min-height:44px\}\}/);
  assert.match(C.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});
await test("colectorul v101.170: tura probelor după direcție (caietul o dată pe oră, stadiul probei A), Caiet încărcat, importurile", () => {
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /const VERSIUNE_COLECTOR = "v101\.(1[7-9]\d|[2-9]\d\d)"/);
  assert.match(C, /import \{ turaPareri \} from "\.\/lib\/tura-pareri\.mjs";/); assert.match(C, /import \{ cuPanouZilnic \} from "\.\/lib\/panou-binance\.mjs";/); assert.match(C, /import \{ liniiProbeRaport, zileLipsa \} from "\.\/lib\/probe-raport\.mjs";/);
  assert.match(C, /const Caiet = incarca\("caiet\.js", "Caiet"\);/);
  assert.match(C, /\.then\(\(\) => turaDirectieColector\(\)\)\.catch\(\(e\) => jurnal\("directie", e\.message\)\)\.then\(\(\) => binancePanou\.goleste\(\)\)\.then\(\(\) => turaProbeColector\(\)\)\.catch\(\(e\) => jurnal\("probe", e\.message\)\);/);
  assert.match(C, /await trimite\("\/api\/istoric-bot\?action=probaA", \{ la: acum, \.\.\.stadiuProbaA\(pa\) \}\);/);
  assert.match(C, /if \(process\.env\.COLECTOR_FARA_PROBE\) return;/);
});
await test("versiunile v100.312: index ×4, BUILD_INFO, sw, versiune.js, package.json (+ test:v100312 în lanț)", () => {
  const H = citeste("public", "index.html"), B = JSON.parse(citeste("BUILD_INFO.json")), P = JSON.parse(citeste("package.json"));
  assert.ok((H.match(/v100\.312/g) || []).length >= 4); assert.match(B.version, /^v100\.312/); assert.match(citeste("public", "sw.js"), /crypto-radar-v100-312/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /v100\.312/); assert.match(P.version, /^100\.312/);
  assert.equal(P.scripts["test:v100312"], "node scripts/proba-v100312.mjs"); assert.match(P.scripts.test, /npm run test:v100312/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? " — " + picate + " PICATE" : ""}\n`);
process.exit(picate ? 1 : 0);
