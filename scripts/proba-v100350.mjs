// Proba v100.350 (16.11.2026, el: „da fă și continuă la fel cu simulator grid”):
//   A. cele 5 rămase pe pagina Grid după v100.349:
//      1. „se dovedește?” (rezumatul jurnalului) amesteca boții încă deschiși, cu profit nerealizat ⇒ doar cei închiși, cei deschiși numărați separat;
//      2. calibrarea nu vedea boții porniți pe ÎNGUST / LARG (mediana lor rămânea null) ⇒ mediana probei ferestrei (verdictul ei, v100.349);
//      3. (renunțat după revizie: lista paginii e aleasă pe rezultatul acelorași zile ⇒ laboratorul rămâne pe volum, vezi R5);
//      4. pe telefon tabelele late (jurnalul, planul: 8 coloane) ieșeau din ecran ⇒ rânduri-cartelă, cu numele coloanei pe fiecare celulă;
//      5. nota planului „luat de la botul tău HYPE” nu spunea de când e planul ⇒ data planului.
//   B. pagina „Simulator grid” (după audit) - testele ei vin în același fișier, pe valuri.
//   node scripts/proba-v100350.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GJ = new Function("GridCalcul", `${lib("grid-jurnal.js")}; return GridJurnal;`)(GridCalcul);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.350 · Grid (cele 5 rămase) + Simulator grid · proba\n");

await test("🔑 A1 „se dovedește?”: doar boții ÎNCHIȘI intră în rezultat; cei deschiși se numără separat", () => {
  const l = [{ verdict: "nu", botId: "1", activ: false, rezultat: 2, suma: 100 }, { verdict: "nu", botId: "2", activ: true, rezultat: 9, suma: 100 }, { verdict: "nu", botId: "3", activ: false, rezultat: -1, suma: 100 }];
  const r = GJ.rezumat(l); assert.equal(r.nu.legate, 2); assert.equal(r.nu.pePlus, 1); assert.ok(Math.abs(r.nu.mediaPct - 0.005) < 1e-12); assert.equal(r.nu.deschise, 1);
});
await test("🔑 A2 calibrarea vede și boții pe ÎNGUST / LARG: mediana probei ferestrei (verdictul ei)", () => {
  const f = { simbol: "X_USDT_PERP", dir: "long", H: 2, pret: 1, verdict: { nivel: "asteapta" }, setare: { suma: 100 } };
  const fe = { eticheta: "ingust", setare: { dir: "long", jos: 0.9, sus: 1.1, grile: 20, levier: 3, suma: 100 }, stat: { antren: { mediana: 0.012, ceaMaiProasta: -0.05 }, test: { mediana: 0.004 } } };
  const e = GJ.adauga([], f, 1000, fe).pop(); assert.equal(e.mediana, 0.012); assert.equal(e.medianaNevazut, 0.004); assert.equal(e.fereastra, "ingust");
  const a = citeste("public", "app.js"), g = a.slice(a.indexOf("function grFereastraAleasa("), a.indexOf("function grRecomandatAcum("));
  assert.match(g, /stat:/);
});
// A3 (laboratorul pe lista paginii) a fost scos după revizia independentă: lista e aleasă pe rezultat ⇒ vezi R5
await test("🔑 A4 pe telefon tabelele late devin rânduri-cartelă (numele coloanei pe fiecare celulă)", () => {
  const a = citeste("public", "app.js"); assert.match(a, /function grTabelCartele\(/); assert.ok((a.match(/grTabelCartele\(/g) || []).length >= 3, "jurnalul + planul + definiția");
  assert.match(citeste("public", "app.css"), /@media \(max-width:600px\)\{#gridset \.grTabelCard thead\{display:none\}/);
});
await test("A5 nota planului spune de când e planul botului", () => {
  const TE = new Function(`${lib("tablou-extra.js")}; return TabloExtra;`)();
  const p = TE.propunePlan({ plus: 1.4, minus: 2.8, investit: 78.6, nume: "HYPE", la: Date.UTC(2026, 10, 10, 12) }, 100, null);
  assert.match(p.nota, /botul tău HYPE \(planul din 10\.11\)/);
  assert.match(citeste("public", "app.js"), /ult=\{plus:u\.plan\.plus,minus:u\.plan\.minus,afaraOre:u\.plan\.afaraOre,la:u\.plan\.la\}/);
});

// ---------------- B1: motorul și verdictul Simulatorului (alegerile LUI, 16.11) ----------------
const GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul);
const MonteSimbol = new Function(`${lib("monte-simbol.js")}; return MonteSimbol;`)();
const GS = new Function("GridCalcul", "GridProba", "MonteSimbol", "globalThis", `${lib("grid-sim.js")}; return GridSim;`)(GridCalcul, GridProba, MonteSimbol, {});
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// bare de 15 minute: mers aleator (±s pe bară), t de la T0; f(i, p) poate muta prețul (o săritură)
function bare(zile, P0, s, seed, f) { const r = mulberry(seed), out = [], T0 = Date.UTC(2026, 9, 1); let p = P0; for (let i = 0; i < zile * 96; i++) { const o = p; p = p * Math.exp(s * (r() * 2 - 1)); if (f) p = f(i, p); out.push({ t: T0 + i * 9e5, o, h: Math.max(o, p) * (1 + s / 3), l: Math.min(o, p) * (1 - s / 3), c: p, v: 1 }); } return out; }
const ST_SHORT = (P) => ({ jos: P * 0.93, sus: P * 1.02, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: null, stopRaport: -0.15, tp: P * 0.93, tip: "aritmetic", fundingZi: 0.0002, fundingCost: false });
const oriz = (x) => Object.assign({ zile: 7, pCastig: 0.66, pPierde: 0.34, pZero: 0, p5: -69.3, p50: 14.65, p95: 30.2, marja: 10, zileDistincte: 31, reluare: { media: 1.2, pPlus: 0.6, n: 24, independente: 4 }, pLich: 0, pStop: 0.12, pTp: 0.05, plan: null, media: 2.5, marjaMedie: 1.1, terminari: [{ fel: "ruleaza", p: 0.83, p25: 4, p50: 15, p75: 22 }, { fel: "stop", p: 0.12, p25: -70, p50: -69, p75: -68 }, { fel: "tp", p: 0.05, p25: 18, p50: 19, p75: 20 }] }, x);

await test("🔑 B1 media și intervalul ei pe zile + cum se termină drumurile, pe fiecare orizont (și de aici încolo)", () => {
  const b = bare(31, 1.42, 0.004, 7), P = b[b.length - 1].c, r = GS.simuleaza(b, ST_SHORT(P), { n: 300, seed: 12, orizonturi: [1, 7], zile: 7, peDrum: true });
  assert.ok(!r.eroare, r.eroare); const o = r.orizonturi[1];
  const m = o.drumuri.reduce((a, x) => a + x, 0) / o.drumuri.length; assert.ok(Math.abs(o.media - m) < 1e-9, "media = media drumurilor");
  assert.ok(o.marjaMedie > 0 && isFinite(o.marjaMedie));
  const sp = o.terminari.reduce((a, x) => a + x.p, 0); assert.ok(Math.abs(sp - 1) < 1e-9, "felurile acoperă toate drumurile");
  o.terminari.forEach((x) => { assert.ok(["ruleaza", "stop", "tp", "lich"].includes(x.fel)); assert.ok(x.p25 <= x.p50 && x.p50 <= x.p75); });
  const pS = (o.terminari.find((x) => x.fel === "stop") || { p: 0 }).p + (o.terminari.find((x) => x.fel === "lich") || { p: 0 }).p; assert.ok(Math.abs(pS - o.pStop - o.pLich) < 1e-9, "stopul = pStop");
});
await test("🔑 B2 culoarea verdictului urmează «Ce aș face eu» (lichidarea / planul / stopul în zgomot nu mai ies verzi)", () => {
  const v = GS.verdict({ orizonturi: [oriz({ pLich: 0.06 })], acum: null }, { dir: "short" }, null, 0, null);
  assert.match(v.faCe, /^N-aș porni așa/); assert.equal(v.culoare, "bad"); assert.equal(v.eticheta, "N-AȘ PORNI");
  const z = GS.verdict({ orizonturi: [oriz({ pStop: 0.6 })], acum: null }, { dir: "short" }, null, 0, null);
  assert.match(z.faCe, /^Stopul e în zgomot/); assert.equal(z.culoare, "mijl"); assert.equal(z.eticheta, "STOPUL E ÎN ZGOMOT");
});
await test("🔑 B3 «Aș porni / Aș ține» cere și media pe plus, cu marginea de jos a intervalului pe zile peste 0", () => {
  const bun = GS.verdict({ orizonturi: [oriz({})], acum: null }, { dir: "short" }, null, 0, null);
  assert.match(bun.faCe, /^Aș porni: câștigă în 66% din drumuri, în medie \+2,5 USDT/); assert.equal(bun.culoare, "good"); assert.equal(bun.eticheta, "AȘ PORNI"); assert.equal(bun.confirmat, true);
  const rau = GS.verdict({ orizonturi: [oriz({ media: -0.82, marjaMedie: 2.1 })], acum: null }, { dir: "short" }, null, 0, null);
  assert.match(rau.faCe, /^O aruncare de ban/); assert.match(rau.faCe, /media drumurilor e −0,8 USDT/); assert.match(rau.faCe, /câștigă des puțin și pierde rar mult/);
  assert.equal(rau.confirmat, false); assert.equal(rau.culoare, "mijl"); assert.equal(rau.eticheta, "ARUNCARE DE BAN");
  const lim = GS.verdict({ orizonturi: [oriz({ media: 0.9, marjaMedie: 1.4 })], acum: null }, { dir: "short" }, null, 0, null);
  assert.equal(lim.confirmat, false, "media pe plus, dar intervalul atinge 0 ⇒ nu"); assert.match(lim.faCe, /poate fi și pe minus/);
});
await test("🔑 B4 rezultatul spus pe cum se termină drumurile, cu media; mediana doar când nu e ruptă în două", () => {
  const t = [{ fel: "stop", p: 0.49, p25: -12.8, p50: -12.7, p75: -12.6 }, { fel: "tp", p: 0.44, p25: 12.1, p50: 14, p75: 16.2 }, { fel: "ruleaza", p: 0.07, p25: -3, p50: 2, p75: 9.1 }];
  const v = GS.verdict({ orizonturi: [oriz({ pStop: 0.49, pTp: 0.44, p50: 1.3, media: -0.1, marjaMedie: 1.2, terminari: t })], acum: null }, { dir: "short" }, null, 0, null);
  assert.match(v.sub, /^49% stop ≈ −12,7 · 44% TP \+12,1…\+16,2 · 7% încă rulează −3,0…\+9,1 · media −0,1 USDT \(±1,2 pe zile\)/); assert.doesNotMatch(v.sub, /de obicei/);
  const u = GS.verdict({ orizonturi: [oriz({ pStop: 0.02, pTp: 0.03, terminari: [{ fel: "ruleaza", p: 0.95, p25: 1, p50: 3, p75: 6 }, { fel: "stop", p: 0.02, p25: -9, p50: -9, p75: -9 }, { fel: "tp", p: 0.03, p25: 8, p50: 8, p75: 8 }] })], acum: null }, { dir: "short" }, null, 0, null);
  assert.match(u.sub, /^de obicei \+14,7 USDT · media \+2,5 USDT/);
});
await test("🔑 B5 la botul care rulează, ieșirile din grid și funding-ul se socotesc DE AICI ÎNCOLO (nu de la pornire)", () => {
  const n = 31 * 96, b = bare(31, 1.42, 0.0015, 11, (i, p) => i === n - 40 ? p * 1.06 : i === n - 36 ? p / 1.06 : p);   // o ieșire peste grid în ultimele ore (după pornire)
  const P = b[b.length - 1].c, st = { jos: P * 0.97, sus: P * 1.03, grile: 10, levier: 2, dir: "neutru", suma: 100, stop: null, tp: null, tip: "aritmetic", fundingZi: 0.001, fundingCost: false };
  const r = GS.simuleaza(b, st, { n: 200, seed: 12, orizonturi: [1 / 24], zile: 1, pornitLa: b[n - 60].t, stPrefix: st });
  assert.ok(!r.eroare, r.eroare); assert.ok(r.orizonturi[0].pIesire < 0.5, "pe o oră ieșea 100% (ieșirea din prefix): " + r.orizonturi[0].pIesire);
  const src = lib("grid-sim.js"); assert.match(src, /tr\.fund\[ix\] - \(pre \? tr\.fund\[/);
});
await test("🔑 B6 «de aici încolo» pornește din poziția Pionex: mărimea pe grilă se potrivește, reluarea rămâne ca verificare", () => {
  const b = bare(31, 1.42, 0.003, 5), P = b[b.length - 1].c, st = { jos: P * 0.94, sus: P * 1.06, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: null, tp: null, tip: "aritmetic", fundingZi: 0, fundingCost: false };
  const o = { n: 100, seed: 12, orizonturi: [7], zile: 7, pornitLa: b[31 * 96 - 100].t, stPrefix: st };
  const r0 = GS.simuleaza(b, st, o); assert.ok(r0.acum && r0.acum.poz < 0, "short ⇒ poziția negativă: " + (r0.acum && r0.acum.poz));
  const tinta = Math.abs(r0.acum.poz) * 0.85, r1 = GS.simuleaza(b, st, Object.assign({ pozitiePionex: -tinta }, o));
  assert.ok(Math.abs(Math.abs(r1.acum.poz) - tinta) / tinta < 0.01, "poziția reluată = cea din Pionex după potrivire: " + r1.acum.poz + " vs " + tinta);
  assert.ok(r1.pozitie && Math.abs(r1.pozitie.reluata - r0.acum.poz) < 1e-9 && r1.pozitie.avert === true && Math.abs(r1.pozitie.scala - 0.85) < 0.01);
  assert.equal(GS.setariDinBot({ directie: "short", gridJos: 1, gridSus: 2, investit: 50, levier: 3, pozitie: "-121.4", brut: { buOrderData: { row: 15 } } }).pozitie, -121.4);
  assert.ok(isFinite(r1.acum.inchidere) && r1.acum.inchidere > 0, "comisionul de închidere spus separat");
});

// ---------------- B3: ecranul Simulatorului (ca paginile refăcute) ----------------
const vm = await import("node:vm");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js", "monte-simbol-ecran.js", "grid-sim.js", "grid-sim-ecran.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const Gl = globalThis, STP = { jos: 1.325, sus: 1.45, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: { sus: 1.523041822505364 }, tp: 1.325, tip: "aritmetic" };
const TERM = [{ fel: "stop", p: 0.49, p25: -11.1, p50: -11, p75: -10.9 }, { fel: "tp", p: 0.43, p25: 9.6, p50: 11, p75: 12.9 }, { fel: "ruleaza", p: 0.08, p25: 3.5, p50: 8, p75: 13.3 }];
const HIST = { lo: -12, hi: 16, n: 2000, c: [980, 2, 1, 0, 0, 1, 2, 1, 0, 3, 5, 9, 40, 120, 150, 140, 120, 100, 80, 60, 50, 40, 30, 20] };
const REZS = () => ({ n: 2000, zile: 14, zileIstoric: 31, suma: 82.53, tpIgnorat: null, acum: null, orizonturi: [1, 3, 7, 14].map((z) => oriz({ zile: z, bare: z * 96, pStop: 0.49, pTp: 0.43, p50: 1.3, media: 0.1, marjaMedie: 4, terminari: TERM, hist: HIST, pIesire: 1, perechi: 65.5, maxJos: { p50: -12, p5: -12.6 }, funding: -0.1, p5: -11, p95: 15 })) });
const STARE = (o) => Object.assign({ mod: "nou", botIdx: 0, boti: ["PENDLE · short 3× · 1,33–1,45 · 82,53 USDT"], sim: "PENDLE", st: STP, plan: { minus: null, plus: null }, fundingZi: 0.000189, fundingSursa: "pionex", fundingInfo: { sim: "PENDLE", rataZi: 0.000189, zile: 7, intervalOre: 8 }, pornitLa: null, tpAprox: false, bot: null, rez: REZS(), oriz: 2, inLucru: false, eroare: null, cod: "", codEroare: null, pret: 1.43, dateLa: 0 }, o);

await test("🔑 B7 sus fraza: eticheta, cum se termină drumurile, media, 1 / 3 / 7 / 14 zile, «Ce aș face eu», „De unde știu”; apoi verdictul, riscurile, Setarea pliată, Pe durate, Botul meu, Alte setări", () => {
  const h = Gl.gsHtml(STARE({}));
  const ord = ["gsLista", "gsAlegeri", "gsFraza", "gsVerdictBloc", "gsRiscuri", "gsSetare", "gsDurateBloc", "gsAlteBloc"].map((k) => h.indexOf(k));
  ord.forEach((x, i) => assert.ok(x > 0 && (i === 0 || x > ord[i - 1]), "ordinea: " + ord.join(",")));
  assert.match(h, /<span class="gsEt mijl">ARUNCARE DE BAN<\/span>/); assert.match(h, /<p class="gsFrazaMare">49% stop ≈ −11,0 · 43% TP \+9,6…\+12,9 · 8% încă rulează \+3,5…\+13,3<\/p>/);
  assert.match(h, /<p class="gsFrazaMedia">media \+0,1 USDT \(±4,0 pe zile\)<\/p>/); assert.equal((h.match(/class="gsOrizBtn"/g) || []).length, 4); assert.match(h, /aria-pressed="true"[^>]*data-action-click="gsOriz\(2\)"><i class="gsPunct mijl"><\/i>7 zile/);
  assert.match(h, /<details class="gsSurse"><summary>De unde știu<\/summary>/); assert.match(h, /<details class="t212Panou gsSec gsSetare gsPli">/, "Setarea pliată când e un rezultat");
  assert.match(h, /<details class="t212Panou gsSec gsPli gsDurateBloc">/); assert.match(h, /<details class="t212Panou gsSec gsPli gsAlteBloc">/);
  assert.doesNotMatch(h, /date de acum 0 minute/); assert.doesNotMatch(h, /GRID-FISA/);
});
await test("🔑 B8 histograma pe semn: sub zero roșu, peste verde, prin zero gri; axa cu 0; grămezile numite (stop / TP); 5% / 95% / media", () => {
  const h = Gl.gsHistHtml(Object.assign({ hist: HIST, p5: -11, p95: 15, media: 0.1 }), TERM);
  assert.match(h, /class="gsBara n"/); assert.match(h, /class="gsBara p"/); assert.match(h, /class="gsBara z"/);
  assert.match(h, /class="gsZero"/); assert.match(h, />0<\/text>/); assert.match(h, />stop 49%<\/text>/); assert.match(h, />TP 43%<\/text>/); assert.doesNotMatch(h, />încă rulează/);
  assert.match(h, />5% −11,0<\/text>/); assert.match(h, />95% \+15,0<\/text>/); assert.match(h, />media \+0,1<\/text>/); assert.match(h, /<title>−12,0 … −10,8 USDT: 980 de drumuri<\/title>/);
  assert.equal(Gl.gsSemn1(-0.04), "0,0", "−0,04 nu se scrie „−0,0”");
});
await test("🔑 B9 câmpurile: prețurile după pasul gridului, cu virgulă („1,523”, nu „1.523041822505364”); citirea păstrează valoarea exactă cât textul nu s-a schimbat", () => {
  assert.equal(Gl.gsCampPret(1.523041822505364, STP), "1,523"); assert.equal(Gl.gsCampPret(1.325, STP), "1,325"); assert.equal(Gl.gsCampNr(0.0189, 4), "0,0189"); assert.equal(Gl.gsCampNr(82.53, 2), "82,53");
  const f = Gl.gsFormHtml(STARE({})); assert.match(f, /<input id="gsStop"[^>]*value="1,523"/); assert.match(f, /<input id="gsFunding"[^>]*value="0,0189"/); assert.match(f, /Încasez la \+/);
  const E = citeste("public", "lib", "grid-sim-ecran.js"); assert.match(E, /stop = cp\("gsStop", stopV0, fp\)/); assert.match(E, /t === fmt\(vechi\) \? vechi : n\(id\)/);
});
await test("🔑 B10 Pe durate: verdictul pe fiecare orizont, Câștigă colorat doar când e confirmat, media; fișe sub 1100 px; rândurile și cu tastatura; lichidarea cu pragul verdictului", () => {
  const d = Gl.gsDurateHtml(STARE({}));
  assert.equal((d.match(/tabindex="0"/g) || []).length, 4); assert.match(d, /<td data-et="Verdict" class="mijl">ARUNCARE DE BAN<\/td><td data-et="Câștigă">66%<\/td>/); assert.match(d, /<td data-et="De obicei" class="gsStins">în două grămezi<\/td>/);
  const r = REZS(); r.orizonturi[2].pLich = 0.004; assert.match(Gl.gsDurateHtml(STARE({ rez: r })), /<td data-et="Lichidare" class="bad">sub 1%<\/td>/); assert.match(Gl.gsRiscuriHtml(STARE({ rez: r })), /lichidare<\/span><b class="bad">sub 1%<\/b>/);
  assert.match(citeste("public", "app.css"), /@media \(max-width:1099px\)\{#gsPagina \.gsDurate thead\{display:none\}/); assert.match(citeste("public", "lib", "grid-sim-ecran.js"), /classList\.contains\("gsRand"\)/);
});
await test("🔑 B11 temă zi / noapte ca paginile refăcute: #gridsim în RADACINI, tema devreme, tbTemaAplica + butonul din antet; listele temei scrise de mână au și #gridsim", () => {
  assert.match(citeste("scripts", "face-tema-tablou.mjs"), /"gridset", "gridsim", "montecarlo", "jurnaltrade", "comportament"\]/); assert.match(citeste("public", "lib", "tema-devreme.js"), /"gridset", "gridsim", "montecarlo", "jurnaltrade", "comportament"\]/);
  const a = citeste("public", "app.js"); assert.match(a, /"probe","gridset","gridsim","montecarlo","jurnaltrade","comportament"\]\.forEach/); assert.match(a, /"grTemaBtn","gsTemaBtn","mcTemaBtn","jtTemaBtn","coTemaBtn"\]/);
  assert.match(citeste("public", "index.html"), /id="gridsim"><div class="sectionHead"><h3>🎰 Simulator grid<\/h3>[\s\S]{0,200}id="gsTemaBtn"/);
  const css = citeste("public", "app.css"); assert.equal((css.match(/:is\([^)]*#gridset[^)]*\)/g) || []).filter((x) => !x.includes("#gridsim")).length, 0); assert.match(css, /:is\(#gridsim,#montecarlo,#jurnaltrade,#comportament\)\.tbZi input/); assert.doesNotMatch(css, /\.pzDemo #gsPagina:has/);
});
await test("🔑 B12 „Compară” reia câștigătorul pe 2.000 de drumuri NOI (sămânța 13), ca Monte Carlo; comparaLa duce verificarea pe orizontul citit", () => {
  const E = citeste("public", "lib", "grid-sim-ecran.js"); assert.match(E, /function gsVerificaPeDrumuriNoi\(/); assert.match(E, /n: MCS_VERIF\.n, seed: MCS_VERIF\.seed/);
  assert.match(functie(E, "gsCompara"), /gsVerificaPeDrumuriNoi\(/); assert.match(functie(E, "gsComparaTp"), /gsVerificaPeDrumuriNoi\(/);
  const rows = [{ nume: "a", gOriz: { 7: { p50: 1 } }, drumOriz: { 7: null } }, { nume: "b", gOriz: { 7: { p50: 2 } }, drumOriz: { 7: null }, verifOriz: { 7: { n: 2000, seed: 13 } } }];
  assert.deepEqual(GS.comparaLa(rows, 7)[1].verif, { n: 2000, seed: 13 }); assert.equal(GS.comparaLa(rows, 7)[0].verif, undefined);
});
await test("🔑 B13 NIMIC PIERDUT față de inventarul de pe viu (16.11): toate faptele paginii vechi sunt pe pagina nouă", () => {
  const s = STARE({ mod: "meu", bot: { profitNet: -0.9, pozitie: -121, directie: "short", gridJos: 1.325, gridSus: 1.45 }, pornitLa: Date.UTC(2026, 10, 15, 8, 41) }), r = REZS();
  r.acum = { net: -0.008, usdt: -0.6, poz: -121, inchidere: 0.1, bare: 130, t: Date.UTC(2026, 10, 16, 16, 45), perechi: 25 }; r.pozitie = { reluata: -142, pionex: -121, scala: 0.852, avert: true, potrivit: true };
  r.orizonturi.forEach((o) => { o.deAici = { p5: -11, p50: 1.3, p95: 15, pCastig: 0.5, pPierde: 0.5, pZero: 0, marja: 15, media: 0.1, marjaMedie: 4, terminari: TERM, hist: HIST }; });
  const h = Gl.gsHtml(Object.assign(s, { rez: r }));
  for (const t of ["Bot nou", "Botul meu care rulează", "Codul din fișă", "Ia din cod", "Moneda", "Direcția", "Jos", "Sus", "Linii (ca în Pionex)", "= 14 intervale", "Levier", "Stop", "TP (take profit)", "Suma, USDT", "Tip", "Planul: ies la −", "Încasez la +", "Funding pe zi, %", "Pornit la", "Simulează", "funding-ul real Pionex (PENDLE)", "Codul pentru TradingView", "Copiază",
    "CÂȘTIGĂ în 50% din drumuri · PIERDE în 50%", "±15 puncte", "cele mai proaste 5%", "cele mai bune 5%", "5% −11,0", "95% +15,0", "Ce aș face eu", "istoria monedei reluată",
    "lichidare", "atinge stopul (1,523", "atinge TP-ul (1,325", "iese din grid măcar o dată", "grile încasate, în medie", "pierderea maximă pe drum", "funding (rata reală Pionex)",
    "Pe durate", "1 zi", "3 zile", "7 zile", "14 zile", "Câștigă", "De obicei", "Lichidare", "Botul meu, de la pornire", "reluat pe barele reale de la 15.11.2026", "Pionex spune", "25 de grile încasate", "poziția: Pionex 121 PENDLE, reluarea dădea 142 PENDLE",
    "Alte setări, pe aceleași drumuri", "Compară", "Trecutul reluat de 2.000 de ori"]) assert.ok(h.includes(t), "lipsește: " + t);
});

// ---------------- R: revizia independentă a diferenței (16.11) ----------------
await test("🔑 R1 prețul DEJA în afara gridului la ultima bară reală ⇒ „iese din grid” 100% (nu 0%) și spus pe nume", () => {
  const n = 31 * 96, b = bare(31, 1.42, 0.0015, 13), P = b[n - 1].c, st = { jos: P * 0.9, sus: P * 0.96, grile: 10, levier: 2, dir: "neutru", suma: 100, stop: null, tp: null, tip: "aritmetic", fundingZi: 0, fundingCost: false };
  const r = GS.simuleaza(b, st, { n: 200, seed: 12, orizonturi: [1, 7], zile: 7, pornitLa: b[n - 60].t, stPrefix: st });
  assert.ok(!r.eroare, r.eroare); assert.equal(r.acum.afara, true); assert.equal(r.orizonturi[0].pIesire, 1);
  assert.match(GS.textSaptamana(GS.riscSaptamana(r, b, { gridJos: st.jos, gridSus: st.sus })), /prețul e deja în afara gridului/);
});
await test("🔑 R2 potrivirea pe poziția Pionex NU dublează grilele: sub 3 grile ținute, diferență de grile întregi pe puține grile sau neutru ⇒ fără potrivire, cu motivul spus", () => {
  const b = bare(31, 1.42, 0.003, 5), P = b[b.length - 1].c, st = { jos: P * 0.94, sus: P * 1.06, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: null, tp: null, tip: "aritmetic", fundingZi: 0, fundingCost: false };
  const o = { n: 100, seed: 12, orizonturi: [7], zile: 7, pornitLa: b[31 * 96 - 100].t, stPrefix: st }, r0 = GS.simuleaza(b, st, o), qG = st.levier / st.grile * st.suma / P;
  const unaInPlus = GS.simuleaza(b, st, Object.assign({ pozitiePionex: r0.acum.poz - qG }, o));   // o grilă întreagă în plus (short ⇒ mai negativ)
  if (Math.abs(r0.acum.poz) / qG < 6) { assert.equal(unaInPlus.pozitie.potrivit, false); assert.match(unaInPlus.pozitie.motiv, /grilă|grile/); }
  const zero = GS.simuleaza(b, st, Object.assign({ pozitiePionex: 0 }, o)); assert.equal(zero.pozitie.potrivit, false);
  const nt = Object.assign({}, st, { dir: "neutru" }), rn = GS.simuleaza(b, nt, Object.assign({ pozitiePionex: 5 }, o, { stPrefix: nt })); assert.ok(!rn.pozitie || rn.pozitie.potrivit === false);
  const mic = GS.simuleaza(b, st, Object.assign({ pozitiePionex: 0.001 }, o)); assert.equal(mic.pozitie.potrivit, false);
});
await test("🔑 R3 „Compară” pornește rândul „așa cum e” tot din poziția Pionex (aceeași bază ca verdictul de sus)", () => {
  const E = citeste("public", "lib", "grid-sim-ecran.js"), S = citeste("public", "lib", "grid-sim.js");
  assert.match(S, /pozitiePionex: dinStare \? o\.pozitiePionex : null/); assert.match(functie(E, "gsCompara"), /pozitiePionex:/); assert.match(functie(E, "gsComparaTp"), /pozitiePionex:/);
  assert.match(functie(E, "gsVerificaPeDrumuriNoi"), /\[ref\]\.concat\(/, "referința socotită o singură dată, cu toți câștigătorii");
});
await test("🔑 R4 planul deja atins schimbă eticheta: pe minus IEȘI (roșu), pe plus ÎNCASEAZĂ (verde)", () => {
  const acum = { net: 0.01, usdt: 0.5, bare: 300, t: 0, perechi: 10 }, de = { p5: -4, p50: 1.2, p95: 6, pCastig: 0.62, pPierde: 0.38, pZero: 0, marja: 4, media: 1, marjaMedie: 0.4 };
  const m = GS.verdict({ orizonturi: [oriz({ plan: { p: 0.5, pRau: 0.2, zileMediana: 2, dejaAtins: "minus" }, deAici: de, p5: -2 })], acum }, { dir: "short" }, { minus: 3, plus: 2 }, 0, { profitNet: -3.2 });
  assert.equal(m.eticheta, "IEȘI: PLANUL ATINS"); assert.equal(m.culoare, "bad");
  const p = GS.verdict({ orizonturi: [oriz({ plan: { p: 0.5, pRau: 0.2, zileMediana: 2, dejaAtins: "plus" }, deAici: de, p5: -2 })], acum }, { dir: "short" }, { minus: 3, plus: 2 }, 0, { profitNet: 2.4 });
  assert.equal(p.eticheta, "ÎNCASEAZĂ: PLANUL ATINS"); assert.equal(p.culoare, "good");
});
await test("🔑 R5 laboratorul rămâne pe top 20 după volum: lista paginii e aleasă după cum a mers gridul în aceleași zile (dovada ar fi umflată)", () => {
  const t = citeste("scripts", "lib", "tura-laborator.mjs"); assert.doesNotMatch(t, /d\.propuse/); assert.match(t, /topDupaVolum\(/);
  assert.doesNotMatch(citeste("scripts", "colector.mjs"), /turaLaboratorModul\(\{ propuse/); assert.match(citeste("public", "app.js"), /top 20 după volum/);
});
await test("R6 mărunte: „sub 1%” și în fraza mare; numerele cu TextRo.cate în jurnal; planul păstrat exact cât textul nu s-a schimbat", () => {
  const v = GS.verdict({ orizonturi: [oriz({ pStop: 0.45, pTp: 0.5, pLich: 0.003, terminari: [{ fel: "stop", p: 0.45, p25: -9, p50: -9, p75: -9 }, { fel: "lich", p: 0.003, p25: -80, p50: -80, p75: -80 }, { fel: "tp", p: 0.5, p25: 8, p50: 9, p75: 10 }, { fel: "ruleaza", p: 0.047, p25: 1, p50: 2, p75: 3 }] })], acum: null }, { dir: "short" }, null, 0, null);
  assert.match(v.cum, /sub 1% lichidare/); assert.doesNotMatch(v.cum, /(^|· )0% /);
  const a = citeste("public", "app.js"); assert.match(a, /TextRo\.cate\(x\.legate,"bot închis","boți închiși"\)/); assert.match(a, /TextRo\.cate\(x\.deschise,"bot care încă rulează","boți care încă rulează"\)/);
  assert.match(citeste("public", "lib", "grid-sim-ecran.js"), /pm = cp\("gsPlanMinus", gsStare\.plan && gsStare\.plan\.minus, f2\)/);
});

// ---------------- MC: pagina Monte Carlo (el, 16.11: „repară și monte carlo … cu toate modificările, verificările și optimizările”) ----------------
await test("🔑 M1 variantele cu stopul / TP-ul de partea greșită a prețului NU intră (dădeau „pe plus în 100%”, câștig inventat)", () => {
  const st = { jos: 1.0, sus: 1.2, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.99 }, tp: null, tip: "aritmetic" };
  const l = Gl.mcsVariante(st, 1.02), ing = l.find((x) => /mai îngust/.test(x.nume)); assert.ok(ing.invalid && /stopul/.test(ing.invalid), JSON.stringify(ing.invalid));
  const s2 = { jos: 1.325, sus: 1.45, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: { sus: 1.5168 }, tp: 1.325, tip: "aritmetic" }, i2 = Gl.mcsVariante(s2, 1.35).find((x) => /mai îngust/.test(x.nume));
  assert.ok(i2.invalid && /TP/.test(i2.invalid)); assert.equal(Gl.mcsVariante(s2, 1.35)[0].invalid, undefined, "„așa cum e” rămâne");
  assert.match(citeste("public", "lib", "monte-simbol-ecran.js"), /v\.invalid \? \{ eroare: v\.invalid \}/); assert.match(functie(citeste("public", "lib", "grid-sim-ecran.js"), "gsCompara"), /mcsVariante\(st, gsStare\.pret\)\.filter/);
});
await test("🔑 M2 GridProba: bara care se DESCHIDE dincolo de stop iese la prețul de deschidere (gap), nu la nivelul stopului", () => {
  const b = [{ t: 0, o: 1, h: 1.001, l: 0.999, c: 1 }, { t: 1, o: 0.9, h: 0.91, l: 0.89, c: 0.9 }];
  const r = GridProba.simuleaza(b, 0, 2, { jos: 0.95, sus: 1.05, grile: 10, levier: 1, dir: "long", stop: { jos: 0.94 }, tip: "aritmetic" });
  const fara = GridProba.simuleaza(b, 0, 2, { jos: 0.95, sus: 1.05, grile: 10, levier: 1, dir: "long", stop: { jos: 0.94 }, tip: "aritmetic", faraGap: true });
  assert.ok(r.oprit && r.net < fara.net - 0.005, "ieșirea la 0,90 pierde mai mult decât la 0,94: " + r.net + " vs " + fara.net);
});
await test("🔑 M3 „Refă simularea” păstrează stopul tău în procente cât câmpul stopului nu s-a schimbat; neutru: partea stopului după preț; câmpuri greșite ⇒ eroare pe nume", () => {
  const vechi = { jos: 1.325, sus: 1.45, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: { sus: 1.51682732 }, stopRaport: -0.15, tp: 1.325, tpAprox: true, botulTau: true };
  const c = { jos: Gl.mcsCampPret(1.325), sus: Gl.mcsCampPret(1.45), grile: "14", levier: "3", dir: "short", suma: "82,53", stop: Gl.mcsCampPret(1.51682732), tp: Gl.mcsCampPret(1.325) };
  const a = Gl.mcsSetariDinCampuri(Object.assign({}, c, { suma: "60" }), vechi, 1.38); assert.equal(a.st.stopRaport, -0.15); assert.equal(a.st.stop.sus, 1.51682732); assert.equal(a.st.suma, 60);
  const b2 = Gl.mcsSetariDinCampuri(Object.assign({}, c, { stop: "1,55" }), vechi, 1.38); assert.equal(b2.st.stopRaport, undefined); assert.equal(b2.st.stop.sus, 1.55);
  const n = Gl.mcsSetariDinCampuri(Object.assign({}, c, { dir: "neutru", stop: "1,47" }), Object.assign({}, vechi, { dir: "neutru", stop: { sus: 1.47 }, stopRaport: undefined }), 1.38); assert.deepEqual(n.st.stop, { sus: 1.47 });
  assert.match(Gl.mcsSetariDinCampuri(Object.assign({}, c, { jos: "1,5" }), vechi, 1.38).eroare, /Sus trebuie să fie peste jos/);
});
await test("🔑 M4 prețurile între 1 și 10 cu 3 zecimale (1,325 nu „1,33”); „drum cu drum” colorat doar când trece pragul (mcsSigur, 70%)", () => {
  assert.equal(Gl.mcsPretTxt(1.325), "1,325"); assert.equal(Gl.mcsPretTxt(1.51682732), "1,517"); assert.equal(Gl.mcsPretTxt(0.3967), "0,3967"); assert.equal(Gl.mcsPretTxt(245.31), "245,31"); assert.equal(Gl.mcsPretTxt(1349.6), "1.349,60");
  const E = citeste("public", "lib", "monte-simbol-ecran.js"); assert.equal((E.match(/dd\.maiBun > dd\.maiRau \? "good"/g) || []).length, 0); assert.ok((E.match(/mcsCuloareDrum\(dd\)/g) || []).length >= 3);
  assert.equal(Gl.mcsCuloareDrum({ maiBun: 0.5, maiRau: 0.3 }), ""); assert.equal(Gl.mcsCuloareDrum({ maiBun: 0.8, maiRau: 0.1 }), "good"); assert.equal(Gl.mcsCuloareDrum({ maiBun: 0.1, maiRau: 0.8 }), "bad");
});
await test("🔑 M5 „Aș lua alt stop / altă țintă” doar dacă nivelul trece regula și pe FIECARE jumătate a istoriei (H0: fals 23–24% ⇒ 2–3%; puterea pe momentum 12–16%)", () => {
  const bun = { maiBun: 0.9, maiRau: 0.05, egal: 0.05 }, rows = (j1, j2) => [{ sp: 0.05, ref: false, media: 0.05, pStop: 0.4, p5: -0.05, drum: bun, jum: [{ media: j1, drum: bun }, { media: j2, drum: bun }] }, { sp: 0.1, ref: true, media: 0.01, pStop: 0.2, p5: -0.1, drum: null, jum: [{ media: 0, drum: null }, { media: 0, drum: null }] }];
  assert.match(Gl.mcsStopRecomandat(rows(0.04, 0.03), 30, 0.1, "z"), /^Aș lua −5,0%.*pe fiecare jumătate a istoriei/);
  assert.match(Gl.mcsStopRecomandat(rows(0.04, -0.01), 30, 0.1, "z"), /^Păstrează stopul de sus/, "pe a doua jumătate nu ține ⇒ nu recomand");
  const fara = rows(0.04, 0.03); delete fara[0].jum; assert.match(Gl.mcsStopRecomandat(fara, 30, 0.1, "z"), /^Păstrează/, "fără jumătăți ⇒ nu recomand");
  assert.match(citeste("public", "lib", "monte-simbol-ecran.js"), /mcsLegaJumatati\(MonteSimbol\.pret\(b, optS\)/);
});
await test("M6 „revine la intrare” spune și cât de des scade încă 10%", () => {
  const E = citeste("public", "lib", "monte-simbol-ecran.js"); assert.match(functie(E, "mcsSansaRevenire"), /pJos/); assert.match(functie(E, "mcsRevineButon"), /scade încă 10%/);
});
await test("🔑 M7 riscul tău: „1 din 100” spune din câte luni reale; nota despre repetare cinstită; lei cu o zecimală; „Banii reali” cu partea pe poziție; concluziile netestate nu mai sunt roșii", () => {
  const RE = citeste("public", "lib", "risc-ecran.js"), RL = citeste("public", "lib", "risc-luna.js");
  assert.match(RE, /din doar ~/); assert.match(RE, /un «dovedit» repetat a doua zi nu e o dovadă nouă/); assert.doesNotMatch(RE, /fără să se repete în rapoartele următoare/);
  assert.match(RE, /function rlBani\(x, unit\) \{ return unit === "lei" \? rlV1\(x\) \+ " lei"/); assert.match(RE, /pe poziție \(la stop \/ închidere\)/);
  assert.match(RL, /nivel: "atentie", titlu: "Boții ținuți peste o zi au pierdut"/); assert.match(RL, /durata o știi abia la închidere/); assert.match(RL, /nivel: "atentie", titlu: "Câțiva boți cu pierderi mari șterg câștigul celorlalți"/);
  assert.match(RL, /var v1 = function \(x\) \{ var p = Math\.abs\(Math\.round\(x \* 10\) \/ 10\)\.toFixed\(1\)/);
});
await test("M8 laboratorul vechi: în română, doar tranzacțiile închise cu risc cunoscut (aceeași unitate, R)", () => {
  const a = citeste("public", "app.js"), f = functie(a, "runMonteCarlo"), h = citeste("public", "index.html");
  assert.match(f, /paperTerminalStatus\(x\)\|\|x\.status==="CLOSED"/); assert.match(f, /\+x\.riskUsd>0/); assert.doesNotMatch(f, /\/100\)/); assert.doesNotMatch(f, /Need at least/);
  assert.doesNotMatch(h, /Median ending R|5th percentile|Signal Journal|Rulează simularea<\/button>\s*<\/div>\s*<div class="mcGrid"[^>]*>\s*<div class="mcBox"><span class="label">Median/);
});
await test("M9 acțiuni: zilele de bursă spuse ca atare; barele de bursă, fără ziua în formare", () => {
  const E = citeste("public", "lib", "monte-simbol-ecran.js"); assert.match(E, /"zile de bursă"\) \+ " de istoric"/); assert.match(functie(E, "mcsAduStock"), /bareBursa\(/);
});

await test("🔑 MS1 Monte Carlo ca paginile refăcute: ordinea din HTML (unealta, apoi riscul tău cu RISCUL TĂU deasupra raportului), tema, fraza sus cu „De unde știu”", () => {
  const css = citeste("public", "app.css"), az = citeste("public", "lib", "asezare-paznic.js"), E = citeste("public", "lib", "monte-simbol-ecran.js");
  assert.doesNotMatch(css, /#montecarlo>#rlPagina\{order:2\}/); assert.match(css, /#montecarlo>\*\{order:0\}/); assert.match(az, /antet\("pzV-mc", \$\("rlPagina"\), \{ verb: "RISCUL TĂU"/); assert.doesNotMatch(az, /mai jos, după Monte Carlo pe simbol/);
  assert.match(citeste("public", "index.html"), /id="montecarlo">\n?<div class="sectionHead"><h3>🎲 Monte Carlo<\/h3>[\s\S]{0,200}id="mcTemaBtn"/);
  assert.match(functie(E, "mcsFrazaHtml"), /De unde știu/); assert.match(functie(E, "mcsHtml"), /mcsFrazaHtml\(/); assert.match(E, /aria-label="Simbolul/);
});
await test("🔑 MS2 cardul botului spune ce spune Simulatorul (același motor GridSim: eticheta, cum se termină, media, histograma pe semn); „Linii” ca în Pionex; câmpuri cu virgulă", () => {
  const E = citeste("public", "lib", "monte-simbol-ecran.js"); assert.match(functie(E, "mcsCalculeaza"), /GridSim\.simuleaza\(d\.b15/); assert.match(functie(E, "mcsGridHtml"), /GridSim\.verdict\(r\.gsim/); assert.match(functie(E, "mcsGridHtml"), /gsHistHtml\(gz, gz\.terminari\)/);
  assert.match(functie(E, "mcsGridHtml"), /Linii \(ca în Pionex\)/); assert.doesNotMatch(functie(E, "mcsGridHtml"), /Intervale \(în Pionex scrii N\+1 linii\)/); assert.match(functie(E, "mcsGridHtml"), /mcsCampPret\(st\.jos\)/);
  const vechi = { jos: 1.325, sus: 1.45, grile: 14, levier: 3, dir: "short", suma: 82.53, stop: { sus: 1.51682732 }, stopRaport: -0.15, tp: 1.325 };
  const r = Gl.mcsSetariDinCampuri({ jos: "1,325", sus: "1,45", linii: "15", levier: "3", dir: "short", suma: "82,53", stop: Gl.mcsCampPret(1.51682732), tp: "1,325" }, vechi, 1.38); assert.equal(r.st.grile, 14); assert.equal(r.st.stopRaport, -0.15);
  assert.match(Gl.mcsSetariDinCampuri({ jos: "1,325", sus: "1,45", linii: "2", levier: "3", dir: "short", suma: "82,53" }, vechi, 1.38).eroare, /Liniile: cel puțin 3/);
});
await test("MS3 histograma pe semn; „mișcarea obișnuită” în locul mijlocului ~0; tabelele pliate și pe fișe sub 1100 px; riscul tău cu blocurile secundare pliate, „ian 2026”, minute sub o oră", () => {
  const h = Gl.mcsHist({ lo: -0.2, hi: 0.2, n: 100, c: [10, 20, 30, 20, 10, 10] }, [{ v: -0.1, t: "5%", c: "bad" }, { v: 0.1, t: "95%", c: "good" }], (v) => String(v));
  assert.match(h, /class="mcsBara n"/); assert.match(h, /class="mcsBara p"/);
  const E = citeste("public", "lib", "monte-simbol-ecran.js"), RE = citeste("public", "lib", "risc-ecran.js"), css = citeste("public", "app.css");
  assert.match(E, /mișcarea obișnuită \(5%–95%\)/); assert.match(functie(E, "mcsNiveluriHtml"), /<details class="mcsVarBloc mcsPli">/); assert.match(functie(E, "mcsDeseneaza"), /mcTabelCartele\(el\)/);
  assert.match(css, /@media \(max-width:1099px\)\{#montecarlo table\.mcCard thead\{display:none\}/); assert.match(RE, /<details class="rlPli" open><summary><h4>Obiceiurile tale<\/h4>/);
  const ctx = { TextRo: globalThis.TextRo, RiscLuna: globalThis.RiscLuna }; vm.createContext(ctx); vm.runInContext(RE, ctx);
  assert.equal(ctx.rlLuna("2026-01"), "ian 2026"); assert.equal(ctx.rlDurata({ de: 0, pana: 0.25 }), "0–15 min"); assert.equal(ctx.rlDurata({ de: 4, pana: 24 }), "4 h–24 h"); assert.equal(ctx.rlDurata({ de: 24, pana: null }), "peste 24 h");
});

await test("🔑 MR revizia MC: colspan în fișe; prețul acțiunii pe toate barele; eroarea botului ștearsă și nu blochează prețul; botul neschimbat nu se resimulează; TP ignorat păstrat; gap la TP; laboratorul doar umplute; lunile la acțiuni", () => {
  const E = citeste("public", "lib", "monte-simbol-ecran.js");
  assert.match(functie(E, "mcTabelCartele"), /td\.colSpan > 1/); assert.match(functie(E, "mcsAduStock"), /bToate: GridCalcul\.bareToate/); assert.match(functie(E, "mcsCalculeaza"), /bt = d\.bToate/);
  assert.match(functie(E, "mcsAlegeBot"), /eroareBot = null/); assert.match(functie(E, "mcsAnalizeaza"), /eroareBot = null/); assert.match(functie(E, "mcsResimuleaza"), /o\.setari = mcsStare\.rez && mcsStare\.rez\.setari \|\| null; \}/); assert.match(functie(E, "mcsResimuleaza"), /o\.prev = mcsStare\.rez/);
  assert.match(functie(E, "mcsCalculeaza"), /var gsim = pv \? pv\.gsim/);
  const vechi = { jos: 1, sus: 1.2, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.9 }, tp: null, tpIgnorat: 0.95, botulTau: true };
  const r = Gl.mcsSetariDinCampuri({ jos: "1", sus: "1,2", linii: "11", levier: "2", dir: "long", suma: "50", stop: "0,9", tp: Gl.mcsCampPret(0.95) }, vechi, 1.1); assert.equal(r.st, vechi, "neschimbat ⇒ același bot (nu „setări de probă”)");
  const b = [{ t: 0, o: 1, h: 1.001, l: 0.999, c: 1 }, { t: 1, o: 1.1, h: 1.11, l: 0.9, c: 0.95 }];
  const g = GridProba.simuleaza(b, 0, 2, { jos: 0.95, sus: 1.05, grile: 10, levier: 1, dir: "long", stop: { jos: 0.94, sus: 1.08 }, tip: "aritmetic" }); assert.equal(g.iesit, "sus", "deschisă peste TP ⇒ TP");
  assert.match(functie(citeste("public", "app.js"), "runMonteCarlo"), /\+x\.qtyFilled>0/); assert.match(citeste("public", "lib", "risc-ecran.js"), /rar, dar se întâmplă; din puține luni reale/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
