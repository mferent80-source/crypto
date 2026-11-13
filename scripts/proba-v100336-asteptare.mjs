// Proba v100.336 · I-864 (T212): de când e depășit stopul care urcă și cât a costat așteptarea de atunci.
//   1  episodul de acum: prima ședință închisă sub stopul DE ATUNCI, numărul de ședințe, ieșirea la deschiderea ședinței următoare
//   2  doar episodul de acum (o coborâre mai veche, urmată de revenire peste stop, nu se numără)
//   3  ultima ședință închisă peste stop ⇒ nimic (verdictul de azi vine din prețul viu, nu din bare)
//   4  maximul se ia doar după cumpărare (un vârf de dinainte nu ridică stopul)
//   5  fără date din viitor: maximele de după începutul episodului nu schimbă stopul de atunci
//   6  episodul început în ultima ședință: fără ieșire de comparat
//   7  textul: ședințe, data, „a costat” / „a adus”, „de 20 de ședințe”
//   8  leii: valoarea poziției × (1 − ieșirea / prețul de acum); suma din bandă doar pe pozițiile cu cifră
//   9  legătura în pagină: poziția își ține așteptarea, „Ce ai de făcut” o spune, banda o adună
//   node scripts/proba-v100336-asteptare.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.336 · T212, de când e depășit stopul și cât a costat așteptarea · proba\n");

const ZI = 86400000;
const ctx = vm.createContext({ console, Math, Date, JSON, Intl, isFinite, isNaN, Number, String, Array, Object });
vm.runInContext(lib("grid-calcul.js"), ctx);
vm.runInContext(lib("actiuni-semnale.js") + "\n;globalThis.ActiuniSemnale = ActiuniSemnale;", ctx);
const AS = ctx.ActiuniSemnale;
// bare zilnice consecutive (zile de bursă) de la 01.09.2026, ora 14:30 UTC; c[i] = închiderea, h = c × 1,01
function bare(cl, hi) {
  const out = []; let t = Date.parse("2026-09-01T14:30:00Z");
  for (let i = 0; i < cl.length; i++) { while ([0, 6].includes(new Date(t).getUTCDay())) t += ZI; out.push({ t, o: cl[i] * 0.998, h: hi && hi[i] !== undefined ? hi[i] : cl[i] * 1.01, l: cl[i] * 0.99, c: cl[i] }); t += ZI; }
  return out;
}
const urca = (n, de, pas) => Array.from({ length: n }, (_, i) => de + i * pas);
const cumparat = (b, i) => b[i].t - 3600000;   // cumpărat în ziua barei i (bara i nu intră în maxim)

await test("1 episodul de acum: prima ședință sub stopul de atunci, ședințele, ieșirea la deschiderea următoare", () => {
  assert.equal(typeof AS.asteptareSubStop, "function", "lipsește ActiuniSemnale.asteptareSubStop");
  const cl = urca(30, 70, 1).concat([84, 83, 82, 81, 80, 80, 79, 80, 81, 80]), b = bare(cl);   // maximul 99 × 1,01 = 99,99 ⇒ stopul −15% = 84,99
  const a = AS.asteptareSubStop(b, cumparat(b, 0), 15, 80);
  assert.ok(a, "trebuia un episod");
  assert.equal(a.sedinte, 10);
  assert.equal(a.de, b[30].t);
  assert.ok(Math.abs(a.stopAtunci - 99.99 * 0.85) < 1e-6, "stopul de atunci " + a.stopAtunci);
  assert.ok(Math.abs(a.pretIesire - b[31].o) < 1e-9, "ieșirea = deschiderea ședinței de după");
});

await test("2 doar episodul de acum: o coborâre veche urmată de revenire nu se numără", () => {
  const cl = urca(30, 70, 1).concat([84, 83, 95, 96, 97, 80, 79]), b = bare(cl);
  const a = AS.asteptareSubStop(b, cumparat(b, 0), 15, 79);
  assert.equal(a.sedinte, 2);
  assert.equal(a.de, b[35].t);
});

await test("3 ultima ședință închisă peste stop ⇒ nimic", () => {
  const cl = urca(30, 70, 1).concat([84, 83, 95]), b = bare(cl);
  assert.equal(AS.asteptareSubStop(b, cumparat(b, 0), 15, 84), null);
  assert.equal(AS.asteptareSubStop([], cumparat(b, 0), 15, 84), null);
  assert.equal(AS.asteptareSubStop(b, cumparat(b, 0), 0, 84), null);
});

await test("4 maximul se ia doar după cumpărare", () => {
  const cl = [200].concat(urca(20, 100, 0.2)), b = bare(cl);   // vârful 200 e înainte de cumpărare (bara 1)
  assert.equal(AS.asteptareSubStop(b, cumparat(b, 1), 15, 103.8), null);
});

await test("5 fără date din viitor: vârfurile de după începutul episodului nu schimbă stopul de atunci", () => {
  const cl = urca(30, 70, 1).concat([84, 83, 82, 81]);
  const b1 = bare(cl), hi = cl.map((c, i) => i > 30 ? c * 1.12 : c * 1.01), b2 = bare(cl, hi);   // vârfuri intraday mari DUPĂ ziua 30, închiderile tot sub
  const a1 = AS.asteptareSubStop(b1, cumparat(b1, 0), 15, 81), a2 = AS.asteptareSubStop(b2, cumparat(b2, 0), 15, 81);
  assert.ok(a1 && a2);
  assert.equal(a2.de, a1.de);
  assert.ok(Math.abs(a2.stopAtunci - a1.stopAtunci) < 1e-9);
});

await test("6 episodul început în ultima ședință: fără ieșire de comparat", () => {
  const cl = urca(30, 70, 1).concat([84]), b = bare(cl);
  const a = AS.asteptareSubStop(b, cumparat(b, 0), 15, 84);
  assert.equal(a.sedinte, 1);
  assert.equal(a.pretIesire, null);
});

await test("7 textul: ședințe, data, a costat / a adus, „de 20 de ședințe”", () => {
  assert.equal(typeof AS.textAsteptare, "function", "lipsește ActiuniSemnale.textAsteptare");
  const de = Date.parse("2026-10-24T14:30:00Z");
  assert.equal(AS.textAsteptare({ sedinte: 14, de, pretIesire: 20 }, -1120.4), "Sub stopul calculat de 14 ședințe (din 24.10) · așteptarea a costat −1.120 lei.");
  assert.equal(AS.textAsteptare({ sedinte: 1, de, pretIesire: 20 }, 35), "Sub stopul calculat de o ședință (din 24.10) · de atunci prețul a revenit: așteptarea a adus +35 lei.");
  assert.match(AS.textAsteptare({ sedinte: 20, de, pretIesire: 20 }, -5), /de 20 de ședințe/);
  assert.equal(AS.textAsteptare({ sedinte: 1, de, pretIesire: null }, null), "A închis sub stopul calculat în ultima ședință (24.10).");
  assert.equal(AS.textAsteptare({ sedinte: 3, de, pretIesire: 20 }, null), "Sub stopul calculat de 3 ședințe (din 24.10).");
  assert.equal(AS.textAsteptare(null, 5), "");
});

const T212 = lib("t212-ecran.js");
await test("8 leii: valoarea × (1 − ieșirea / prețul de acum); suma doar pe pozițiile cu cifră", () => {
  const f = new Function(fnDin(T212, "t212AsteptareLei") + "\n" + fnDin(T212, "t212AsteptareSuma") + "\nreturn { lei: t212AsteptareLei, suma: t212AsteptareSuma };")();
  assert.equal(Math.round(f.lei({ pret: 17, asteptare: { pretIesire: 25 } }, 1700)), -800);
  assert.equal(Math.round(f.lei({ pret: 30, asteptare: { pretIesire: 25 } }, 3000)), 500);
  assert.equal(f.lei({ pret: 17, asteptare: { pretIesire: null } }, 1700), null);
  assert.equal(f.lei({ pret: 17, asteptare: { pretIesire: 25 } }, null), null);
  assert.equal(f.lei({ pret: 17, asteptare: null }, 1700), null);
  const s = f.suma([{ asteptareLei: -800 }, { asteptareLei: null }, { asteptareLei: 120 }, {}]);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), { lei: -680, n: 2 });
  assert.equal(f.suma([{}, { asteptareLei: null }]), null);
});

await test("9 legătura în pagină: poziția își ține așteptarea, „Ce ai de făcut” o spune, banda o adună", () => {
  const preg = fnDin(T212, "t212PregatesteP");
  assert.match(preg, /ActiuniSemnale\.asteptareSubStop\(/, "t212PregatesteP nu socotește așteptarea");
  assert.match(preg, /stopAtins/, "așteptarea se socotește doar cu stopul depășit");
  assert.match(T212, /ActiuniSemnale\.textAsteptare\(p\.asteptare, p\.asteptareLei\)/, "rândul din „Ce ai de făcut” nu spune așteptarea");
  assert.match(T212, /t212AsteptareSuma\(poz\)/, "banda nu adună așteptarea");
  assert.match(T212, /așteptarea sub stop/, "banda nu are textul sumei");
});

console.log(`\n${teste - picate} / ${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
