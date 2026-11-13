// Proba v100.337 · ideile de după v100.336 (el, 13.11: „fa idei”):
//   1  paza paginilor la toate lățimile lui: 412, 768, 1920, 2560; termenul rondului sub limita sarcinii (30 min)
//   2  alerta pe Discord când o poziție T212 stă sub stopul calculat de prea multe ședințe: treptele 5 / 10 / 20 / 40, o alertă pe treaptă
//      și pe episod; episodul nou (altă zi de început) o ia de la capăt; cifra în lei ca pe pagina T212
//   3  colectorul leagă alerta: o socotește doar cu stopul atins, ține treapta în starea poziției, o uită când poziția iese de sub stop
//   node scripts/proba-v100337-idei.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const lib = async (f) => { try { return await import("./lib/" + f); } catch (e) { return {}; } };

await test("1 paza: lățimile lui (412, 768, 1920, 2560) și termenul sub limita sarcinii", async () => {
  const P = await lib("paza-pagini.mjs");
  assert.deepEqual(P.LATIMI_IMPLICIT, [412, 768, 1920, 2560]);
  const lim = Number((citeste("scripts", "vps", "paza-pagini-sarcina.ps1").match(/ExecutionTimeLimit \(New-TimeSpan -Minutes (\d+)\)/) || [])[1]);
  assert.ok(P.TERMEN_MIN > 0 && P.REDESCHIDE_MIN > 0, "termenul și capătul redeschiderii");
  // cel mai rău caz (revizia): ultima pagină pornită chiar la termen, deschidere lentă (~2 min), pauza de 1 min, încă o deschidere ⇒ sub limită cu rezervă
  assert.ok(P.TERMEN_MIN + 2 + 1 + 2 <= lim - 4, "pagina nouă la termen + redeschiderea încap sub limita sarcinii (" + lim + ")");
  assert.ok(P.REDESCHIDE_MIN <= P.TERMEN_MIN + 3, "nicio redeschidere după termen + 3 min");
  // 12 deschideri × ~55 s + redeschideri: încape în termen
  assert.ok(P.TERMEN_MIN * 60 >= 3 * P.LATIMI_IMPLICIT.length * 55 + 6 * 60, "termenul ține 12 deschideri și câteva redeschideri");
  const r = citeste("scripts", "vps", "paza-pagini.mjs");
  assert.match(r, /LATIMI_IMPLICIT\.join\(","\)/, "rulatorul ia lățimile din modul");
  assert.match(r, /TERMEN_MIN/, "rulatorul ia termenul din modul");
  assert.match(r, /if \(Date\.now\(\) - T0 > REDESCHIDE_MS\) \{ scrie\(`neconfirmată/, "fără timp de redeschidere ⇒ nu pleacă pe Discord, doar în jurnal");
  assert.doesNotMatch(citeste("scripts", "vps", "paza-pagini-sarcina.ps1"), /termenul lui de 15/);
  assert.doesNotMatch(r, /arg\("latimi", "1920,412"\)/);
});

await test("2 treptele: 5 / 10 / 20 / 40 de ședințe", async () => {
  const A = await lib("asteptare-alerta.mjs");
  assert.deepEqual(A.TREPTE, [5, 10, 20, 40]);
  assert.deepEqual([0, 4, 5, 9, 10, 19, 20, 27, 39, 40, 90].map(A.treapta), [0, 0, 5, 5, 10, 10, 20, 20, 20, 40, 40]);
});

await test("2 o alertă pe treaptă și pe episod; episodul nou o ia de la capăt", async () => {
  const A = await lib("asteptare-alerta.mjs"), de = Date.UTC(2026, 9, 7), de2 = Date.UTC(2026, 10, 10), ZI = 864e5, acum = Date.UTC(2026, 10, 13, 16);
  assert.equal(A.deAnuntat(null, null, acum), 0, "nu e sub stop");
  assert.equal(A.deAnuntat(null, { sedinte: 4, de }, acum), 0, "sub prag");
  assert.equal(A.deAnuntat(null, { sedinte: 27, de }, acum), 20, "prima vedere la 27 ⇒ treapta 20 (una, nu trei)");
  assert.equal(A.deAnuntat({ de, treapta: 20, la: acum - ZI }, { sedinte: 28, de }, acum), 0, "aceeași treaptă ⇒ tace");
  assert.equal(A.deAnuntat({ de, treapta: 20, la: acum - 30 * ZI }, { sedinte: 28, de }, acum), 0, "același episod ⇒ tace oricât ar trece");
  assert.equal(A.deAnuntat({ de, treapta: 20, la: acum - ZI }, { sedinte: 41, de }, acum), 40, "treapta următoare");
  assert.equal(A.deAnuntat({ de, treapta: 40, la: acum - 10 * ZI }, { sedinte: 5, de: de2 }, acum), 5, "episod nou după zile ⇒ de la capăt");
  assert.equal(A.deAnuntat({ de, treapta: 40, la: acum - 10 * ZI }, { sedinte: 3, de: de2 }, acum), 0);
  // revizia: stopul ales (profil / −15%) se schimbă și mută ziua de început ⇒ NU e episod nou, aceeași treaptă nu se repetă
  assert.equal(A.deAnuntat({ de, treapta: 20, la: acum - 3600000 }, { sedinte: 26, de: de + ZI }, acum), 0, "ziua de început mutată în aceeași zi ⇒ tace");
  assert.equal(A.deAnuntat({ de, treapta: 20, la: acum - 3600000 }, { sedinte: 40, de: de + ZI }, acum), 40, "dar treapta mai mare pleacă");
});

await test("2 cât a costat așteptarea, în lei, ca pe pagina T212", async () => {
  const A = await lib("asteptare-alerta.mjs");
  assert.equal(A.asteptareLei({ pretIesire: 100 }, 80, 10000), -2500);
  assert.equal(A.asteptareLei({ pretIesire: 70 }, 80, 8000), 1000, "a urcat după ieșire ⇒ plus");
  assert.equal(A.asteptareLei({ pretIesire: null }, 80, 8000), null);
  assert.equal(A.asteptareLei({ pretIesire: 100 }, 80, null), null);
  // aceeași formulă ca t212AsteptareLei (public/lib/t212-ecran.js)
  const s = citeste("public", "lib", "t212-ecran.js"), f = s.slice(s.indexOf("function t212AsteptareLei"), s.indexOf("function t212AsteptareSuma"));
  const pag = new Function(f + "; return t212AsteptareLei;")();
  for (const [pi, pr, v] of [[100, 80, 10000], [12.5, 9.3, 4321], [7, 9, 1500]]) assert.equal(A.asteptareLei({ pretIesire: pi }, pr, v), pag({ asteptare: { pretIesire: pi }, pret: pr }, v));
});

await test("2 mesajul: titlul cu ședințele, textul paginii, nivel atenție", async () => {
  const A = await lib("asteptare-alerta.mjs"), de = Date.UTC(2026, 9, 7);
  const m = A.mesajAsteptare({ simbol: "APLD", a: { sedinte: 27, de, pretIesire: 30 }, text: "Sub stopul calculat de 27 de ședințe (din 07.10) · așteptarea a costat −1.893 lei.", t: 5 });
  assert.equal(m.nivel, "atentie");
  assert.equal(m.titlu, "APLD: sub stopul calculat de 27 de ședințe");
  assert.match(m.mesaj, /^Sub stopul calculat de 27 de ședințe \(din 07\.10\) · așteptarea a costat −1\.893 lei\./);
  assert.match(m.mesaj, /IEȘI/);
  assert.doesNotMatch(m.mesaj + m.titlu, /undefined|NaN/);
  assert.equal(A.mesajAsteptare({ simbol: "X", a: { sedinte: 1, de }, text: "", t: 5 }).titlu, "X: sub stopul calculat de 1 ședință");
});

await test("3 colectorul: alerta doar cu stopul atins, treapta ținută, uitată la ieșirea de sub stop", async () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /import \* as AsteptareAlerta from "\.\/lib\/asteptare-alerta\.mjs"/);
  assert.match(c, /nOk && nOk\.stopAtins && vbA && vbA\.judec \? ActiuniSemnale\.asteptareSubStop\(bare, Date\.parse\(x\.initialFillDate \|\| ""\), nOk\.trailPct, p\.pret\) : null/, "doar pe barele pe care le acceptă și pagina");
  assert.match(c, /const vbA = bare\.length \? ActiuniSemnale\.verificaBare\(bare, p\.pret, x\.ticker, Date\.now\(\)\) : null/);
  assert.match(c, /AsteptareAlerta\.deAnuntat\(stA\._astept, aSub, Date\.now\(\)\)/);
  assert.match(c, /"astept-" \+ x\.ticker/);
  assert.match(c, /stA\._astept = \{ de: aSub\.de, treapta: tA, la: Date\.now\(\) \}/, "treapta (și ora) se scriu după trimiterea reușită");
  assert.doesNotMatch(c, /if \(!aSub && stA\._astept\) \{ delete stA\._astept;/, "revizia: prețul care trece peste stop în ședință nu mai șterge treapta");
  assert.match(c, /\/_US_EQ\$\/\.test\(x\.ticker\) && fxA > 0 \? p\.qty \* p\.pret \/ fxA/, "la SUA valoarea ca pagina (BNR)");
  assert.match(c, /delete stareAlerte\[k\]\._astept/, "poziția vândută își uită treapta");
});

await test("3 noaptea (23–07) alerta stă în Radar și intră în rezumatul de dimineață, ca treptele T212", async () => {
  const POL = await lib("politica-alerte.mjs");
  assert.equal(POL.deAmanatNoaptea({ nivel: "atentie", titlu: "APLD: sub stopul calculat de 27 de ședințe" }, "astept-APLD_US_EQ"), true);
  assert.equal(POL.deAmanatNoaptea({ nivel: "critic", titlu: "x" }, "astept-APLD_US_EQ"), false, "criticul pleacă oricând");
});

// 4  (ideea 3, după măsurătoarea pe viu 13.11: Tabloul = 130 de cereri, 26 la Pionex, cifrele la 15 s, ultima la 35 s; serverul trece Pionex
//    printr-o singură poartă, ≥ 1,1 s între cereri) - lumânările fără endTime se cer o singură dată pe monedă + interval, la 500, și se taie
//    la cât cere pagina; cererile identice venite deodată așteaptă aceeași cerere
const mk = async () => { try { return await import("../functions/api/market.js"); } catch (e) { return {}; } };
const bareP = (n, desc) => { const l = Array.from({ length: n }, (_, i) => ({ time: 1e12 + i * 60000, close: i })); return { result: true, data: { klines: desc ? l.reverse() : l }, timestamp: 1 }; };

await test("4 cererea spre Pionex: fără endTime ⇒ 500, oricât cere pagina; cu endTime ⇒ cât cere", async () => {
  const M = await mk(), q = (s) => M.klineCerere(new URL("http://x/api/market?type=pionex_klines&" + s));
  const a = q("symbol=hype_usdt_perp&interval=5M&limit=100"), b = q("symbol=HYPE_USDT_PERP&interval=5m&limit=288"), c = q("symbol=HYPE_USDT_PERP&interval=5M");
  assert.equal(a.url, b.url, "5M cu 100 și cu 288 ⇒ aceeași cerere spre Pionex");
  assert.equal(a.url, c.url);
  assert.match(a.url, /symbol=HYPE_USDT_PERP&interval=5M&limit=500$/);
  assert.deepEqual([a.limit, b.limit, c.limit], [100, 288, 300], "pagina primește cât a cerut (implicit 300, ca înainte)");
  const e = q("symbol=HYPE_USDT_PERP&interval=15M&limit=500&endTime=17941355999");
  assert.match(e.url, /limit=500&endTime=17941355999$/); assert.equal(e.limit, 500);
  const e2 = q("symbol=HYPE_USDT_PERP&interval=15M&limit=50&endTime=17941355999");
  assert.match(e2.url, /limit=50&endTime=17941355999$/, "paginarea în urmă rămâne neschimbată");
  assert.equal(q("symbol=X&interval=7M&limit=abc").url, q("symbol=X&interval=4H").url, "interval / limit greșite ⇒ ca înainte (4H, 300)");
  assert.equal(q("symbol=X&interval=4H&limit=abc").limit, 300, "limit=abc ⇒ pagina primește implicitul 300");
});

await test("4 tăierea: cele mai noi N, în orice ordine; obiectul din cache nu se atinge", async () => {
  const M = await mk();
  for (const desc of [false, true]) {
    const d = bareP(500, desc), inainte = JSON.stringify(d), t = M.taieLumanari(d, 100);
    assert.equal(t.data.klines.length, 100);
    const timp = t.data.klines.map((k) => k.time), maxT = 1e12 + 499 * 60000;
    assert.ok(timp.includes(maxT), "ultima lumânare e păstrată");
    assert.ok(!timp.includes(1e12 + 399 * 60000), "a 101-a de la capăt nu");
    assert.equal(t.data.klines[desc ? 0 : 99].time, maxT, "ordinea rămâne cea de la Pionex");
    assert.equal(JSON.stringify(d), inainte, "cache-ul neatins");
    assert.equal(t.timestamp, 1);
  }
  const r = { result: false, code: "X" }; assert.equal(M.taieLumanari(r, 5), r, "refuzul trece neschimbat");
  const s = bareP(50); assert.equal(M.taieLumanari(s, 100).data.klines.length, 50, "mai puține decât limita ⇒ toate");
  assert.equal(M.taieLumanari(bareP(500), 2).data.klines.length, 2, "limit=2 (ziua de azi și ieri)");
});

await test("4 cererile identice venite deodată: una singură spre Pionex; abandonul primei nu le strică pe celelalte", async () => {
  const M = await mk(); let n = 0;
  const f = (ms, v) => () => { n++; return new Promise((r) => setTimeout(() => r(v), ms)); };
  const [x, y] = await Promise.all([M.impartit("k1", f(30, "A")), M.impartit("k1", f(30, "B"))]);
  assert.deepEqual([x, y, n], ["A", "A", 1]);
  assert.equal(await M.impartit("k1", f(1, "C")), "C", "după ce s-a terminat, cererea nouă pleacă iar"); assert.equal(n, 2);
  const ab = () => { n++; return new Promise((_, rj) => setTimeout(() => rj(Object.assign(Error("abandonată"), { abandonata: true })), 20)); };
  const p1 = M.impartit("k2", ab).catch((e) => e.abandonata), p2 = M.impartit("k2", f(5, "D"));
  assert.deepEqual(await Promise.all([p1, p2]), [true, "D"], "a doua își face cererea ei");
  // revizia 🔴: Cloudflare poate lăsa o cerere abandonată fără răspuns pentru totdeauna ⇒ cine așteaptă are termen, apoi pleacă singur
  const agatat = () => { n++; return new Promise(() => {}); }, n0 = n;
  M.impartit("k4", agatat, 40).catch(() => {});
  assert.equal(await M.impartit("k4", f(1, "F"), 40), "F", "după termen, cererea pleacă singură");
  assert.equal(await M.impartit("k4", f(1, "G"), 40), "G", "intrarea agățată nu mai stă în hartă");
  assert.equal(n - n0, 3);
  // revizia 🔵: după abandon, cele trei care așteptau ⇒ o singură cerere nouă, nu trei
  const n1 = n, ab2 = () => { n++; return new Promise((_, rj) => setTimeout(() => rj(Object.assign(Error("ab"), { abandonata: true })), 15)); };
  const pr = [M.impartit("k5", ab2).catch(() => "ab"), M.impartit("k5", f(20, "H")), M.impartit("k5", f(20, "H2")), M.impartit("k5", f(20, "H3"))];
  const rz = await Promise.all(pr);
  assert.equal(rz[0], "ab"); assert.equal(new Set(rz.slice(1)).size, 1, "toate primesc același răspuns"); assert.equal(n - n1, 2, "abandonata + o singură reluare");
  const er = () => { n++; return Promise.reject(Object.assign(Error("429"), { status: 429 })); };
  await assert.rejects(Promise.all([M.impartit("k3", er), M.impartit("k3", f(1, "E"))]), /429/, "eroarea adevărată se împarte (nu bate de două ori)");
});

await test("4 ruta lumânărilor folosește cererea comună, împărțirea și tăierea", async () => {
  const s = citeste("functions", "api", "market.js");
  assert.match(s, /const kc=klineCerere\(u\)/);
  assert.match(s, /taieLumanari\(await impartit\(kc\.url,\(\)=>pionexCached\(kc\.url,ttlLumanari\(kc\.interval\),env,opt\)\),kc\.limit\)/);
});

console.log(`\n${teste - picate} / ${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
