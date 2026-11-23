// Proba v100.379 (el, 23.11.2026, după demo-ul v100.378: „ok livrează, și trece azi pe 24 de ore”): cifra mică de lângă prețul viu al botului
// (banda de sus, pe toate paginile, și capul Tabloului) arăta mișcarea de la 00:00 UTC („azi +1,2%”); acum arată mișcarea pe ULTIMELE 24 DE ORE
// („24 h +1,2%”), din lumânările de 5 minute, cu aceeași socoteală ca fereastra de 24 h din banda „Mișcarea” (Miscare.fereastra) ⇒ o singură
// cifră pe ecran. Fără lumânări (monedă listată de mai puțin de o zi, citire picată) rămâne „azi”, ca înainte. Nimic scos: funcțiile și șirurile
// vechi (deschiderea zilei) rămân.
// Rulare: node scripts/proba-v100379.mjs
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const PVS = citeste("../public/lib/pret-viu.js"), MS = citeste("../public/lib/miscare.js"), APP = citeste("../public/app.js"), HTML = citeste("../public/index.html"), SW = citeste("../public/sw.js");
const PV = new Function(`${PVS}; return PretViu;`)(), M = new Function(`${MS}; return Miscare;`)();

let teste = 0, picate = 0;
function test(nume, fn) { teste++; try { fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }

const ACUM = Date.UTC(2026, 10, 23, 15, 2, 30), MIN = 60000, ZI = 86400000;
const BOT = { baza: "JTO.PERP", directie: "long", levier: 5, profitTotal: -12.04, distantaLichidarePct: 20.5, pretCurent: 0.57 };
const banda = (o) => PV.banda(Object.assign({ bot: BOT, pretViu: null, botLa: ACUM - 5000, acum: ACUM }, o));
const zi = (r) => r.parti.filter((p) => p.k === "zi")[0];

console.log("\nV100.379 · «azi» pe 24 de ore · proba\n");

test("textul: „24 h +1,2%”, cu virgulă și minusul adevărat; semnul și tonul după cifra rotunjită (fără „−0,0%”)", () => {
  assert.deepEqual(PV.text24(1.23), { t: "24 h +1,2%", ton: "sus" }); assert.deepEqual(PV.text24(-4.06), { t: "24 h −4,1%", ton: "jos" });
  assert.deepEqual(PV.text24(-0.03), { t: "24 h 0,0%", ton: "egal" }); assert.deepEqual(PV.text24(0), { t: "24 h 0,0%", ton: "egal" });
  assert.equal(PV.text24(null), null); assert.equal(PV.text24(undefined), null); assert.equal(PV.text24(NaN), null);
});
test("banda de sus: cu mișcarea pe 24 h dată, bucata «zi» spune „24 h …” și titlul ei spune ce e", () => {
  const p = zi(banda({ zi: { deschidere: 0.5, t: 0 }, pct24: (pret) => { assert.equal(pret, 0.57); return -3.21; } }));
  assert.equal(p.t, "24 h −3,2%"); assert.equal(p.ton, "jos"); assert.match(p.title, /ultimele 24 de ore/); assert.ok(!/00:00 UTC/.test(p.title));
});
test("fără lumânări pe 24 h (funcția dă null) rămâne «azi», de la deschiderea zilei, cu titlul ei - nu dispare", () => {
  const p = zi(banda({ zi: { deschidere: 0.5, t: 0 }, pct24: () => null }));
  assert.equal(p.t, "azi +14,0%"); assert.match(p.title, /00:00 UTC/);
});
test("cine nu dă mișcarea pe 24 h (probele vechi, colectorul) primește banda de dinainte, neschimbată", () => {
  const p = zi(banda({ zi: { deschidere: 0.5, t: 0 } })); assert.equal(p.t, "azi +14,0%"); assert.match(p.title, /Mișcarea de azi, față de deschiderea zilei \(00:00 UTC, lumânarea 1D Pionex\)/);
  assert.equal(zi(banda({})), undefined, "fără deschidere și fără 24 h: nicio bucată");
});
test("aceeași socoteală ca banda «Mișcarea»: cifra de sus = Miscare.fereastra pe lumânările de 5 minute, la același preț", () => {
  const per = 5 * MIN, tU = Math.floor(ACUM / per) * per, bare = Array.from({ length: 289 }, (_, i) => { const c = 100 + i * 0.05, o = i ? 100 + (i - 1) * 0.05 : c; return { t: tU - (288 - i) * per, o, h: Math.max(o, c), l: Math.min(o, c), c }; });
  const w = M.fereastra(bare, 118, ACUM, ZI, per); assert.ok(w && isFinite(w.pct));
  assert.equal(PV.text24(w.pct).t, "24 h " + (w.pct > 0 ? "+" : "−") + Math.abs(Math.round(w.pct * 10) / 10).toFixed(1).replace(".", ",") + "%");
});
test("pagina: lumânările de 5 minute ale botului se aduc o dată la 10 minute (289 = 24 h și puțin), iar cifra se socotește la fiecare preț", () => {
  assert.ok(/function pvAdu24\(simbol\)\{/.test(APP)); assert.ok(APP.includes('"&interval=5M&limit=289"')); assert.ok(/acum-h\.la<10\*60000/.test(APP));
  assert.ok(APP.includes("Miscare.fereastra(bare,pret,Date.now(),86400000,300000)"));
  assert.ok(APP.includes('pvAduZi(s.pionex);if(typeof pvAdu24==="function")pvAdu24(s.pionex)'), "se cer odată cu deschiderea zilei, pe orice pagină (tolerant: probele vechi rulează banda fără funcția nouă)");
  const a = APP.slice(APP.indexOf("function pvArata("), APP.indexOf("function pvArata(") + 1200); assert.ok(/PretViu\.text24\(/.test(a), "pvArata rescrie cifra la fiecare tranzacție");
  assert.ok(APP.includes('pct24:typeof pvPct24==="function"?function(p){return pvPct24(b,p)}:undefined,'), "banda de sus o primește la desen");
});
test("o citire picată ține lumânările de dinainte ale aceleiași monede și reîncearcă peste un minut; altă monedă nu le moștenește", () => {
  const f = APP.slice(APP.indexOf("function pvAdu24("), APP.indexOf("function pvAdu24(") + 1300);
  assert.ok(/\.catch\(function\(\)\{/.test(f) && /la:acum-9\*60000/.test(f) && /h&&h\.simbol===simbol\?h\.bare:null/.test(f));
  assert.ok(/h&&h\.simbol===s\.pionex/.test(APP.slice(APP.indexOf("function pv24Pentru("), APP.indexOf("function pv24Pentru(") + 300)));
});
test("nimic scos: deschiderea zilei (00:00 UTC) se aduce în continuare și funcțiile ei rămân", () => {
  assert.ok(APP.includes('"&interval=1D&limit=2"')); assert.ok(/PretViu\.ziDinKlines\(/.test(APP)); assert.ok(/PretViu\.textZi\(PretViu\.procentZi\(pa\.pret,pvZiPentru\(b\)\)\)/.test(APP));
  assert.ok(PVS.includes("var zt = pa ? textZi(procentZi(pa.pret, o.zi)) : null;")); assert.equal(typeof PV.textZi, "function"); assert.equal(typeof PV.procentZi, "function"); assert.equal(typeof PV.ziDinKlines, "function");
  assert.deepEqual(PV.textZi(1.23), { t: "azi +1,2%", ton: "sus" });
});
test("v100.379 e pusă peste tot și proba e în lanț, după v100.378", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json"));
  assert.equal(pk.version, "100.379.0"); assert.equal(bi.version, "v100.379"); assert.ok(bi.li379 && bi.li379.length > 200, "BUILD_INFO.li379");
  assert.equal((HTML.match(/v100\.379/g) || []).length >= 4, true, "index.html: v100.379 de cel puțin 4 ori");
  assert.match(SW, /crypto-radar-v100-379/); assert.match(citeste("../functions/_shared/versiune.js"), /"v100\.379"/);
  assert.match(pk.scripts.test, /npm run test:v100378 && npm run test:v100379 && node scripts\/mutatii\.mjs --doar-tiparele && node scripts\/stare-probe-ecran\.mjs$/); assert.equal(pk.scripts["test:v100379"], "node scripts/proba-v100379.mjs");
});

console.log(`\n${teste - picate} / ${teste} teste trec.\n`);
process.exit(picate ? 1 : 0);
