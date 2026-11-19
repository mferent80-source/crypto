// Proba v100.360 (18.11.2026, el: „Comportament ca Jurnalul”; hotărârile LUI: regulile rămân, spuse cinstit; evaluarea pe două axe; aspectul paginilor
// refăcute + grafice noi + proba „3 la rând”): PAGINA - fraza + „De unde știu”, regulile judecate (o singură listă cu corecțiile), graficele, evaluările
// pe axa „față de ziua ta”, raportul vechi spus vechi, tema și rândurile pliate, etichetele barelor la fel pe tot graficul, versiunile.
// (raportul colectorului: proba-v100360-comportament.mjs; proba „3 la rând”: proba-v100360-trei.mjs)
//   node scripts/proba-v100360.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("V100.360 · pagina Comportament cinstită\n");

const ACUM = Date.UTC(2026, 10, 18, 10, 0), MIN = 60000;
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ");
function cutie(cuGrafice) {
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, RegExp, TextRo: globalThis.TextRo });
  if (cuGrafice) vm.runInContext(lib("jurnal-grafice.js"), ctx);
  vm.runInContext(lib("comportament-ecran.js"), ctx, { filename: "comportament-ecran.js" });
  return ctx;
}
const regula = (cod, nume, stare, n, nFara, cu, fara, txt) => ({ cod, regula: nume, stare, peBotCu: cu, peBotFara: fara, n, nFara, zile: 60, text: txt || nume + ": −2,7 pe bot ⇒ " + stare + "." });
function raport(o) {
  o = o || {};
  const fr30 = Array.from({ length: 30 }, (_, i) => ({ zi: "2026-10-" + String(20 + i > 31 ? 20 + i - 31 : 20 + i).padStart(2, "0"), trasa: i % 4 === 0, boti: i % 7, net: -1.25, peste: 0, netPeste: 0 }));
  return {
    forma: 1, la: o.la != null ? o.la : ACUM - 5 * MIN, praguri: { zi: 20, sapt: 60, rand: 3, boti: 7 }, sfat: "Un singur lucru.",
    reguliDovezi: o.reguliDovezi || [regula("frana", "Frâna trasă = pauză", "nedovedita", 1971, 485, -2.68, -3.09), regula("prag", "Cel mult 7 boți pe zi", "nedovedita", 1276, 1180, -2.7, -2.8),
      regula("dupaProasta", "După o zi proastă", "nedovedita", 551, 1900, -2.7, -2.8), regula("treiLaRand", "3 pierderi la rând", "nedovedita", 851, 1600, -2.7, -2.8, "Porniți după 3 pierderi <script>x</script>"),
      regula("ore6", "Ținuți peste 6 h", "descriere", 351, 2100, -10.8, -1.4), regula("minute", "Închiși sub 15 minute", "descriere", 1083, 1370, -1.9, -3.5)],
    grafice: { notaDurata: "Durata se știe abia la închidere.", durata: [{ et: "sub 15 min", n: 1083, zile: 126, netPeBot: -1.86, ic: [-3.08, -0.83], putine: false }, { et: "peste 6 h", n: 351, zile: 210, netPeBot: -10.79, ic: [-19.7, -3.81], putine: false }],
      botiZi: [{ et: "1–3", boti: 178, zile: 106, netPeBot: -9.48, ic: [-24.98, 2.74], putine: false }, { et: "16+", boti: 1399, zile: 47, netPeBot: -2.49, ic: [-3.88, -1.28], putine: false }],
      proasta: [{ strat: "1–7", dupa: 3.63, altfel: 4, nDupa: 19, nAltfel: 143 }], frana30: fr30 },
    corectii: [{ cod: "frana", regula: "Frâna trasă = pauză, sau un prag nou în Poartă", stare: "liberă", ton: "bun", dece: "Azi +1,3 USDT din −20.", stareDovezi: "nedovedita" },
      { cod: "banda", regula: "Ieși când prețul stă peste 6 h în afara grilei", stare: "1 bot luna asta", ton: "rau", dece: "", recomandare: true }],
    evaluari: o.evaluari || [
      { id: "1", cand: "18.11 08:02", titlu: "PENDLE long: decizii bune +1,3 USDT", mesaj: "Ținut 14 h", verdict: "bune", net: 1.31, fataDeZi: null, nZi: 1, reguliAtinse: [], eticheta2: "Pe plus, +1,3; singurul bot al zilei." },
      { id: "2", cand: "17.11 10:00", titlu: "<b>ONDO</b> long: noroc", mesaj: "x", verdict: "noroc", net: 2.1, fataDeZi: 1.78, nZi: 2, reguliAtinse: [], eticheta2: "Pe plus, +2,1; față de ziua ta +1,8 <i>y</i>." },
      { id: "3", cand: "17.11 09:00", titlu: "SUI short: greșeala a costat", mesaj: "z", verdict: "cost", net: 0.3, fataDeZi: -1.78, nZi: 2, reguliAtinse: [], eticheta2: "Pe plus, +0,3; față de ziua ta −1,8." }],
    nEvaluari: 3, evaluariLegat: true, verdicte: { bune: { n: 1, net: 1.31 }, noroc: { n: 1, net: 2.1 }, cost: { n: 1, net: 0.3 } }
  };
}

await test("P1 fraza mare: „niciuna nu iese dovedită” cu netul mediu pe bot (din frâna cu + fără); cu una dovedită o numește; „De unde știu” rămâne deschis la cerere", () => {
  const c = cutie(true), h = c.coHtml(raport(), { acum: ACUM }), t = text(h);
  assert.match(t, /Din cele 4 reguli ale tale, niciuna nu iese dovedită pe istoria ta \(2\.456 de boți\): fiecare bot pierde în medie 2,8 USDT, deci mai puțini boți înseamnă mai puțină pierdere/);
  assert.match(h, /<details class="grSurse"><summary>De unde știu<\/summary>/); assert.match(c.coHtml(raport(), { acum: ACUM, surseDeschise: true }), /<details class="grSurse" open>/);
  const r = raport(); r.reguliDovezi[1].stare = "dovedita";
  assert.match(text(c.coHtml(r, { acum: ACUM })), /Pe istoria ta se dovedesc 1 din cele 4 reguli: Cel mult 7 boți pe zi\./);
  const k = raport(); k.reguliDovezi[0].stare = "contrazisa"; assert.match(text(c.coHtml(k, { acum: ACUM })), /Contrazise de date: Frâna trasă = pauză\./);
});
await test("P2 regulile judecate: o singură listă - starea de AZI (corecția) lângă starea pe ISTORIE; în Evaluare corecțiile nu se mai repetă; „3 la rând” duce la Probe; textul scăpat", () => {
  const h = cutie(true).coHtml(raport(), { acum: ACUM });
  assert.equal((h.match(/id="coSDovezi"/g) || []).length, 1); assert.doesNotMatch(h, /<h4>Corecțiile: regulile tale/);
  const s = h.slice(h.indexOf('id="coSDovezi"'), h.indexOf('id="coSGrafice"'));
  assert.match(s, /Frâna trasă = pauză, sau un prag nou în Poartă <span class="coChip coBun" title="azi">liberă<\/span><\/b><span class="coDovChip coDov-nedovedita" title="pe istoria ta">nedovedită<\/span>/);
  assert.match(s, /Ieși când prețul stă peste 6 h în afara grilei <span class="coRec"[^>]*>recomandare<\/span> <span class="coChip coRau" title="azi">1 bot luna asta<\/span>/, "banda = rândul „ore6”");
  assert.equal((s.match(/coDov-descriere/g) || []).length, 2); assert.match(s, /ce s-a întâmplat/);
  assert.match(s, /data-action-click="navTo\('probe',true\)">Vezi proba ›/); assert.ok(s.includes("&lt;script&gt;x&lt;/script&gt;") && !s.includes("<script>x"));
  assert.match(text(s), /„Nedovedită” nu înseamnă că regula e greșită/);
});
await test("P3 graficele: barele pe durată și pe boți/zi (SVG, cu IC), tabelul zilei proaste pe o zecimală, frâna pe 30 de zile (30 de bare, galbenele = zilele trase); fără JurnalGrafice nu cade", () => {
  const h = cutie(true).coHtml(raport(), { acum: ACUM }), s = h.slice(h.indexOf('id="coSGrafice"'));
  assert.ok((s.match(/<svg/g) || []).length >= 2, "două grafice cu bare");
  assert.match(s, /<td>1–7<\/td><td>3,6 <span class="coMut">\(19 z\)<\/span><\/td><td>4,0 <span class="coMut">\(143 z\)<\/span><\/td>/);
  const f = s.slice(s.indexOf('class="coFr30"'), s.indexOf("</div>", s.indexOf('class="coFr30"')));
  assert.equal((f.match(/<span /g) || []).length, 30); assert.equal((f.match(/class="coFrTrasa"/g) || []).length, 8); assert.match(s, /galben = zi cu frâna trasă \(8 din 30\)/);
  assert.match(f, /title="[^"]*net −1,3 USDT"/, "netul pe o zecimală");
  const g = cutie(false).coHtml(raport(), { acum: ACUM }); assert.match(g, /id="coSGrafice"/); assert.match(g, /class="coFr30"/);
  for (const bloc of ["coSDovezi", "coSGrafice"]) { const b = text(h.slice(h.indexOf('id="' + bloc + '"'), h.indexOf("</section>", h.indexOf('id="' + bloc + '"')))); assert.doesNotMatch(b, /\d,\d\d/, bloc + ": o singură zecimală"); }
});
await test("P4 evaluările pe două axe: căsuțele „Peste / Sub ziua ta / Singur în zi” (nu Noroc / Greșeala a costat), filtrul pe axă, rândul = moneda + eticheta nouă scăpată; textul de pe Discord la clic", () => {
  const c = cutie(true), h = c.coHtml(raport(), { acum: ACUM, deschis: "2" }), t = text(h);
  for (const k of ["peste", "sub", "singur"]) assert.match(h, new RegExp("data-action-click=\"coFiltru\\('" + k + "'\\)\""));
  assert.doesNotMatch(h, /coFiltru\('noroc'\)|coFiltru\('cost'\)/); assert.match(t, /Peste ziua ta 1 · \+2,1/); assert.match(t, /Sub ziua ta 1 · \+0,3/); assert.match(t, /Singur în zi 1 · \+1,3/);
  assert.match(t, /„Noroc” \/ „Greșeala a costat” apar doar când regula atinsă e dovedită/);
  assert.ok(h.includes("&lt;b&gt;ONDO&lt;/b&gt; long — Pe plus, +2,1; față de ziua ta +1,8 &lt;i&gt;y&lt;/i&gt;.") && !/<[bi]>(ONDO|y)</.test(h));
  assert.match(h, /Textul trimis atunci pe Discord:/);
  const f = text(c.coHtml(raport(), { acum: ACUM, filtru: "sub" })); assert.match(f, /Arăt doar „Sub ziua ta”: 1 din 3\./); assert.match(f, /SUI short — /); assert.doesNotMatch(f, /PENDLE long — /);
  assert.doesNotMatch(text(c.coHtml(raport(), { acum: ACUM, filtru: "noroc" })), /Arăt doar/, "filtrul vechi nu se aplică pe axe");
});
await test("P5 raportul vechi: peste 30 de minute ⇒ „colectorul n-a mai scris”, cu sau fără boți; proaspăt și fără boți ⇒ „Niciun bot pornit acum” + ultimul închis din raport", () => {
  const c = cutie(true);
  assert.match(text(c.coHtml(raport({ la: ACUM - 31 * MIN }), { acum: ACUM, botiActivi: 0 })), /Raportul are peste 30 de minute: colectorul n-a mai scris/);
  const r = raport(); r.botiActivi = 0; r.ultimInchis = ACUM - 2 * 3600000; const t = text(c.coHtml(r, { acum: ACUM }));
  assert.match(t, /Niciun bot pornit acum; ultimul închis: /); assert.doesNotMatch(t, /colectorul n-a mai scris/);
});
await test("P6 tema și rândurile: comportament în generator, în tema devreme, în tbTemaAplica + butonul; rândurile pliate au cheie, titlu, cele două deschise implicit; tbRandComuta le dă paginii", () => {
  assert.match(citeste("scripts", "face-tema-tablou.mjs"), /"jurnaltrade", "comportament", "tradezilei", "carnet", "scan", "salt", "alerts"\]/);
  assert.match(lib("tema-devreme.js"), /"comportament"/); const A = citeste("public", "app.js");
  assert.match(A, /"coTemaBtn"/); assert.match(A, /return coRandComuta\(id,deschis\)/);
  const E = lib("comportament-ecran.js");
  for (const id of ["coSDovezi", "coSGrafice", "coSEv", "coSReg", "coSSapt", "coSOg", "coSProfit"]) { assert.match(E, new RegExp(id + ': "')); assert.match(E, new RegExp('id="' + id + '"|id=\\\\"' + id)); }
  assert.match(E, /CO_RAND_DESCHIS = \{ coSDovezi: 1, coSGrafice: 1 \}|CO_RAND_DESCHIS=\{coSDovezi:1,coSGrafice:1\}|CO_RAND_DESCHIS = \{coSDovezi:1,coSGrafice:1\}/);
  assert.match(E, /id="coTemaBtn"[^\n]*data-action-click="tbTemaComuta\(\)"/);
  execFileSync(process.execPath, [path.join(RAD, "scripts", "face-tema-tablou.mjs"), "--check"], { stdio: "pipe" });
  const C = citeste("public", "app.css"); for (const k of [".coDovChip", ".coDov-nedovedita", ".coFr30", ".coFrTrasa", ".coGrGrila", ".coTabMic"]) assert.ok(C.includes(k), k);
});
await test("P7 barele (JurnalGrafice.bare): dacă o etichetă nu încape, TOATE trec pe forma scurtă; când încap, toate au „(n boți, z zile)”", () => {
  const c = cutie(true), R = [{ et: "1–3", v: -9.5, n: 178, zile: 106 }, { et: "8–15", v: -3.3, n: 577, zile: 53 }, { et: "16+", v: -2.5, n: 1399, zile: 47 }];
  const et = (svg) => [...svg.matchAll(/<text[^>]*text-anchor="end"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).filter((x) => /^(1–3|8–15|16\+)/.test(x));
  const ingust = et(c.JurnalGrafice.bare(R, { lat: 360, moneda: "USDT", unitate: "USDT" })), lat = et(c.JurnalGrafice.bare(R, { lat: 1400, moneda: "USDT", unitate: "USDT" }));
  assert.equal(ingust.length, 3); assert.equal(lat.length, 3);
  assert.ok(ingust.every((x) => !x.includes("(")), "îngust: toate scurte " + ingust); assert.ok(lat.every((x) => x.includes("(")), "lat: toate lungi " + lat);
});
await test("P8 sfatul săptămânii nu pretinde dovadă: adaosul „Regula ta, nu una dovedită” cu netul mediu pe bot; raportul îl trimite", () => {
  const P = citeste("scripts", "lib", "pagina-comportament.mjs");
  assert.match(P, /const sfatTot = \/\^Nimic urgent\/\.test\(sfat\)/); assert.match(P, /" Regula ta, nu una dovedită: pe istoria ta fiecare bot "/); assert.match(P, /sfat: sfatTot, disciplina/);
});
await test("V versiunile de la v100.360 încolo (v100.361: versiunea curentă o verifică proba ei); colectorul ≥ v101.197", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 360 && nr(citeste("public", "sw.js")) >= 360 && nr(JSON.parse(citeste("BUILD_INFO.json")).badge) >= 360);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 360); assert.match(p.scripts.test, /npm run test:v100359 && npm run test:v100360/);
  assert.match(p.scripts["test:v100360"], /proba-v100360-comportament\.mjs && node scripts\/proba-v100360-trei\.mjs && node scripts\/proba-v100360\.mjs/);
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(bi.comport360 && bi.raport359);
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 197);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
