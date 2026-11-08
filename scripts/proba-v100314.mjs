// Proba v100.314 (08.11.2026, el: „ok” la „alte sume cu două zecimale + o gardă pe toată pagina”): REZULTATELE cu O zecimală peste tot
// (regula lui din 03.10), pe ce a găsit garda convențiilor pe Radarul REAL de pe VPS, cu boții lui (scratchpad poze-zec):
//   1. textele SALVATE (raportul de duminică, alertele vechi, rezumatul de dimineață) - TextRo.cifreNoi le arată cu o zecimală la
//      rezultate și cu virgulă la prețurile în $; prețurile fără semn, ratele mici sub 1% și sumele sub 0,1 rămân;
//   2. TextRo.zecMici: o sumă care se rotunjește la 0,1 iese „+0,1”, nu „+0,10”;
//   3. sursele care scriau încă două zecimale la un rezultat (pagina, colectorul, serverul).
// Rămân la ban, cu intenție: suma investită, minimul Pionex pe ordin, „pe fiecare ordin” (se tastează în Pionex), exportul T212 (Excel).
//   node scripts/proba-v100314.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("\nV100.314 · rezultatele cu o zecimală peste tot · proba\n");
const TR = globalThis.TextRo;

// ───────────── 1. textele salvate ─────────────
await test("cifreNoi: raportul de duminică SALVAT („net −574,13 USDT”, „Din grile +188,54”) iese cu o zecimală; rezumatul „💼 Tu: boți +1,31 USDT” la fel", () => {
  assert.equal(TR.cifreNoi("Săptămâna: 75 de boți închiși, net −574,13 USDT (înainte de comisioane și funding −454,31 USDT), 44 pe plus (59%)."),
    "Săptămâna: 75 de boți închiși, net −574,1 USDT (înainte de comisioane și funding −454,3 USDT), 44 pe plus (59%).");
  assert.equal(TR.cifreNoi("Din grile +188,54 USDT, din poziție −642,85 USDT, comisioane și funding −119,82 USDT."), "Din grile +188,5 USDT, din poziție −642,9 USDT, comisioane și funding −119,8 USDT.");
  assert.equal(TR.cifreNoi("Cel mai util sfat: Lichidarea aproape (+391,17 USDT dacă-l urmai)"), "Cel mai util sfat: Lichidarea aproape (+391,2 USDT dacă-l urmai)");
  assert.equal(TR.cifreNoi("ieri, 30.10 · 💼 Tu: boți +1,31 USDT · acțiuni deschise −9.201 lei"), "ieri, 30.10 · 💼 Tu: boți +1,3 USDT · acțiuni deschise −9.201 lei");
  assert.equal(TR.cifreNoi("„Ține gridul” — 26 de boți, −5.857,79 USDT."), "„Ține gridul” — 26 de boți, −5.857,8 USDT.", "cu punctul miilor");
  assert.equal(TR.cifreNoi("+57,25 lei"), "+57,3 lei");
});
await test("cifreNoi: alertele SALVATE — prețurile în $ cu virgulă („$55,86”, zecimalele rămân), „+0,10 USDT” ⇒ „+0,1”, procentele ≥ 1% cu o zecimală", () => {
  assert.equal(TR.cifreNoi("AAPL: a atins stopul sugerat ($55.86) · Prețul e $54.89; poziția n-are plan (ținta $219.19)."), "AAPL: a atins stopul sugerat ($55,86) · Prețul e $54,89; poziția n-are plan (ținta $219,19).");
  assert.equal(TR.cifreNoi("prețul a mers de la $1,924.48 la $983.23"), "prețul a mers de la $1,924.48 la $983,23", "un preț cu virgula miilor (englezesc) nu se ghicește");
  assert.equal(TR.cifreNoi("✅ STX: pereche încheiată +0,10 USDT"), "✅ STX: pereche încheiată +0,1 USDT");
  assert.equal(TR.cifreNoi("pe zilele nevăzute, media e pe minus (−1,73%): câștigă des puțin"), "pe zilele nevăzute, media e pe minus (−1,7%): câștigă des puțin");
  assert.equal(TR.cifreNoi("5× pe un interval de 16,46%: sigur ar fi fost 4×"), "5× pe un interval de 16,5%: sigur ar fi fost 4×");
  assert.equal(TR.cifreNoi("grid ±6,0 % pas 1,19 % · stop ≥ 6,8 %"), "grid ±6,0 % pas 1,2 % · stop ≥ 6,8 %");
});
await test("cifreNoi: ce NU e rezultat rămâne neatins (prețuri fără semn, rate sub 1%, sume sub 0,1, date, versiuni, coeficienți, intervale); forma veche cu punct se convertește", () => {
  for (const t of ["75.923,90 USDT", "+0,04 USDT", "−0,0040 USDT", "pasul 0,30%", "funding 0,0100%", "05.11.2026", "v100.306", "+1.052 lei", "0.3419", "Brier 0,077",
    "ar fi costat 24,74 USDT", "50,0% (1 din 2)", "0,00% (0 din 1)", "1-2,50%", "2026-11-05", "+3,49 → −21,3 USDT", "$4,22", "0,33420"]) assert.equal(TR.cifreNoi(t), t, t);
  assert.equal(TR.cifreNoi("−36.16 USDT"), "−36,2 USDT"); assert.equal(TR.cifreNoi("-8.17 USDT"), "−8,2 USDT"); assert.equal(TR.cifreNoi("33.3%"), "33,3%");
  assert.equal(TR.cifreNoi("−0,096 USDT"), "−0,1 USDT", "se rotunjește la 0,1 ⇒ o zecimală");
  assert.equal(TR.cifreNoi("−0,094 USDT"), "−0,094 USDT", "sub 0,095 rămâne (cu o zecimală ar ieși 0,1 dintr-un 0,09)");
});
await test("pagina: alertele (lista de pe Alerte) și jurnalul trec textul SALVAT prin TextRo.cifreNoi", () => {
  const AE = citeste("public", "lib", "alerte-ecran.js");
  assert.match(AE, /escapeHtml\(TextRo\.cifreNoi\(x\.titlu\)\)/, "titlul alertei"); assert.match(AE, /escapeHtml\(TextRo\.cifreNoi\(x\.mesaj\)\)/, "mesajul alertei");
  // Jurnalul: motivele SALVATE de colector la „Dacă ascultai de Radar” („media e pe minus (−1,73%)”, din codul vechi)
  assert.match(citeste("public", "app.js"), /escapeHtml\(TextRo\.cifreNoi\(cfm\[t\.id\]\.motive\.join\("; "\)\)\)/, "motivele contrafactualului");
});

// ───────────── 2. zecMici ─────────────
await test("zecMici: o sumă care se rotunjește la 0,1 iese cu O zecimală („+0,1 USDT”, nu „+0,10”); 0,1 / 0,04 / 0,004 ca până acum", () => {
  for (const [x, z] of [[0.0999, 1], [-0.096, 1], [0.0951, 1], [0.094, 2], [0.00996, 2], [0.0094, 3], [0.1, 1], [0.04, 2], [0.004, 3], [0, 1]]) assert.equal(TR.zecMici(x), z, String(x));
  assert.equal(TR.usdt(0.0999, TR.zecMici(0.0999)), "+0,1 USDT"); assert.equal(TR.usdt(-0.0099, TR.zecMici(-0.0099)), "−0,01 USDT");
});

// ───────────── 3. sursele ─────────────
function modul(...fis) {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, TextRo: TR };
  vm.createContext(ctx); vm.runInContext(fis.map((f) => citeste("public", "lib", f)).join("\n"), ctx); return ctx;
}
await test("rezumatul de dimineață (Acasa.raportSaptamana): „💼 Tu: boți +1,3 USDT”, suma mică „+0,04 USDT”", () => {
  const A = modul("acasa.js").Acasa;
  const r = (bt) => A.raportSaptamana({ botiTotal: bt, t212Ppl: -9201 }).mesaj.split("\n").find((x) => /💼/.test(x));
  assert.equal(r(1.31), "💼 Tu: boți +1,3 USDT · acțiuni deschise −9.201 lei"); assert.equal(r(-574.13), "💼 Tu: boți −574,1 USDT · acțiuni deschise −9.201 lei");
  assert.equal(r(0.04), "💼 Tu: boți +0,04 USDT · acțiuni deschise −9.201 lei");
});
await test("serverul (avertismentele botului): „Grilele +2,5 USDT; poziția și funding-ul −7,3, comisioanele −0,4” — o zecimală; sub 0,1 zecimalele mici", async () => {
  const { avertismenteBot } = await import("../functions/_shared/avertismente.js");
  const a = avertismenteBot({ x: { profitStop: 1, lossStop: 1 }, pret: 1, jos: 0.5, sus: 2, lich: { distantaLichidarePct: null }, comisioane: -0.42, gridProfitBrut: 2.5, profitNet: -5.24 });
  assert.ok(a.includes("Grilele +2,5 USDT; poziția și funding-ul −7,3, comisioanele −0,4: botul e pe minus."), JSON.stringify(a));
  const b = avertismenteBot({ x: { profitStop: 1, lossStop: 1 }, pret: 1, jos: 0.5, sus: 2, lich: { distantaLichidarePct: null }, comisioane: -0.0412, gridProfitBrut: 0.031, profitNet: -0.2 });
  assert.ok(b.includes("Comisioanele (−0,04 USDT) depășesc câștigul grilelor (+0,03 USDT)."), JSON.stringify(b));
  const c = avertismenteBot({ x: { profitStop: 1, lossStop: 1 }, pret: 1, jos: 0.5, sus: 2, lich: { distantaLichidarePct: null }, comisioane: -0.004, gridProfitBrut: 0.0031, profitNet: -0.2 });
  assert.ok(c.includes("Comisioanele (−0,0040 USDT) depășesc câștigul grilelor (+0,0031 USDT)."), "sub un cent rămân 4 zecimale: " + JSON.stringify(c));
});
await test("alerta „pereche încheiată” (Alerte): 0,0999 USDT iese „+0,1”, nu „+0,10” (pragul pe cifra rotunjită)", () => {
  const AL = citeste("public", "lib", "alerte.js");
  assert.doesNotMatch(AL, /toFixed\(Math\.abs\(v\) < 0\.1 \? 2 : 1\)/); assert.doesNotMatch(AL, /toFixed\(Math\.abs\(v\) < 0\.095 && v !== 0 \? 2 : 1\)/);
  assert.equal((AL.match(/TextRo\.usdt\(v, TextRo\.zecMici\(v\)\)/g) || []).length, 2, "ambele U din alerte.js prin TextRo.zecMici");
});
await test("pagina: tabelul semnalelor („Pe bani, urmat” +2,95 ⇒ +3,0), profitul net pe zi, măsurile botului în % (14,08% ⇒ 14,1%; sub 1% rămân 2)", () => {
  const APP = citeste("public", "app.js");
  assert.doesNotMatch(APP, /U2=function\(v\)\{return \(v>=0\?"\+":"−"\)\+Math\.abs\(v\)\.toFixed\(2\)/); assert.match(APP, /U2=function\(v\)\{return TextRo\.usdt\(v,TextRo\.zecMici\(v\)\)\}/);
  assert.doesNotMatch(APP, /botiBan\(x\.valoare,2\)/); assert.match(APP, /botiBan\(x\.valoare,TextRo\.zecMici\(x\.valoare\)\)/);
  assert.match(APP, /tbFormateazaSemn\(\+r\[1\]\.valoare,Math\.abs\(\+r\[1\]\.valoare\)>=1\?1:2\)/, "măsurile: o zecimală de la 1 în sus");
});
await test("graficul botului: „pe minus −X USDT”, „la stop pierzi”, „stop de probă” cu o zecimală; „cu Y mai mult” la fel; investiția rămâne la ban", () => {
  const G = citeste("public", "lib", "grafic-bot.js");
  assert.doesNotMatch(G, /Math\.abs\(v\)\.toFixed\(2\)\.replace\("\.", ","\) \+ " USDT"/);
  assert.equal((G.match(/var u = function \(v\) \{ return TextRo\.usdt\(v, TextRo\.zecMici\(v\)\); \};/g) || []).length, 2);
  assert.match(G, /inv\.toFixed\(2\)\.replace\("\.", ","\) \+ " USDT investiți"/, "suma investită rămâne la ban");
  assert.match(G, /\(cu " \+ TextRo\.num\(peste, TextRo\.zecMici\(peste\)\) \+ " mai mult\)/);
  // stopul de probă: „cu 0,9 peste plan” / „cu 3,5 sub plan” (era „0,91” / „3,50”)
  assert.match(G, /", cu " \+ TextRo\.num\(peste, TextRo\.zecMici\(peste\)\) \+ " peste plan" : ", cu " \+ TextRo\.num\(-peste, TextRo\.zecMici\(peste\)\) \+ " sub plan"/);
});
await test("Tablou: funding-ul pe zi, grilele în 24 h, costul unui sfat neurmat, diferența perp–spot (cu virgulă), autopsia T212 — o zecimală (sub 0,1 zecimalele mici)", () => {
  const IB = citeste("public", "lib", "indicatori-bot.js"), SF = citeste("public", "lib", "sfaturi.js"), OB = citeste("public", "lib", "obiceiuri.js"), TB = citeste("public", "lib", "tablou-bot.js"), CS = citeste("public", "lib", "consiliu.js");
  assert.match(IB, /" · botul: " \+ TextRo\.usdt\(fz, TextRo\.zecMici\(fz\)\) \+ " pe zi"/);
  assert.doesNotMatch(SF, /TextRo\.num\(co\.grile24h, 2\)/); assert.match(SF, /TextRo\.num\(co\.grile24h, TextRo\.zecMici\(co\.grile24h\)\)/);
  assert.doesNotMatch(OB, /Math\.abs\(x\.cost\)\.toFixed\(2\)/);
  assert.doesNotMatch(TB, /m\.basis\.valoare\.toFixed\(2\) \+ "%\."/); assert.match(TB, /"Diferența e " \+ TextRo\.pct\(m\.basis\.valoare, Math\.abs\(m\.basis\.valoare\) >= 1 \? 1 : 2\) \+ "\."/);
  assert.match(CS, /var F2 = function \(v\) \{ return Math\.abs\(v\)\.toLocaleString\("ro-RO", \{ minimumFractionDigits: 1, maximumFractionDigits: 1 \}\); \};/);
});
await test("jurnalul: lecția „5× pe un interval de 16,5%” (era 16,46%); sub 1% rămân 2 zecimale", () => {
  const C = modul("grid-calcul.js", "jurnal-trade.js"), JT = citeste("public", "lib", "jurnal-trade.js");
  assert.match(JT, /var P = function \(v\) \{ return TextRo\.pct\(v \* 100, Math\.abs\(v \* 100\) >= 1 \? 1 : 2\); \};/);
  assert.ok(C.JurnalTrade, "modulul se încarcă");
});
await test("Trade-ul zilei (ecranul + linia de dimineață a colectorului): pasul ≥ 1% cu o zecimală („~1,1 %”), sub 1% rămân 2 („~0,45 %”)", () => {
  const TZ = citeste("public", "lib", "trade-zilei-ecran.js"), TT = citeste("scripts", "lib", "tura-trade-zilei.mjs");
  assert.match(TZ, /" · pas ~" \+ tzPct\(g\.pas, Math\.abs\(g\.pas\) >= 0\.01 \? 1 : 2\)/); assert.match(TT, /pas \$\{pct\(g\.pas, Math\.abs\(g\.pas\) >= 0\.01 \? 1 : 2\)\}/);
});
await test("colectorul: alertele T212 de stop / țintă scriu prețul în $ cu virgulă („$55,86”), zecimalele prețului rămân", async () => {
  const P = citeste("scripts", "lib", "poza.mjs");
  assert.doesNotMatch(P, /pr = \(v\) => \(v >= 1 \? v\.toFixed\(2\) : v\.toFixed\(4\)\);/); assert.match(P, /pr = \(v\) => \(v >= 1 \? v\.toFixed\(2\) : v\.toFixed\(4\)\)\.replace\("\.", ","\);   \/\/ v100\.40/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}\n`);
if (picate) process.exit(1);
