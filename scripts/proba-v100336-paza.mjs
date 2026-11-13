// Proba v100.336 · I-865 paza paginilor: judecata pură (scripts/lib/paza-pagini.mjs) și rulatorul (scripts/vps/paza-pagini.mjs).
//   1  pagina curată ⇒ nicio abatere;   2  panoul lipsă / altul;   3  excepții, derulare laterală, text stricat
//   4  stările de așteptare rămase (doar rândul care ÎNCEPE cu ele; „așteptarea a costat” și „AȘTEAPTĂ” nu); listele de azi înainte de 8:00 sunt firești
//   5  pe Discord doar ce se repetă la a doua deschidere; mesajul spune pagina, lățimea, abaterea
//   6  rulatorul: parola merge doar la serverul local, prioritate joasă, redeschidere după un minut, sarcina 07:50
//   node scripts/proba-v100336-paza.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { judeca, repetate, mesaj } from "./lib/paza-pagini.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.336 · paza paginilor · proba\n");
const curat = { pagina: "t212", latime: 412, panou: "t212", exceptii: [], latimeExtra: 0, frunze: ["Trading 212", "IEȘI", "Sub stopul calculat de 27 de ședințe (din 07.10) · așteptarea a costat −1.893 lei.", "AȘTEAPTĂ", "Aștept să închidă ședința? nu"] };

await test("1 pagina curată ⇒ nicio abatere", () => {
  const c = Object.assign({}, curat, { frunze: curat.frunze.slice(0, 4) });
  assert.deepEqual(judeca(c), []);
});
await test("2 panoul lipsă sau alt panou", () => {
  assert.equal(judeca(Object.assign({}, curat, { panou: null }))[0].cheie, "deschis");
  assert.equal(judeca(Object.assign({}, curat, { panou: "dash", frunze: [] }))[0].cheie, "panou");
  assert.equal(judeca(Object.assign({}, curat, { frunze: ["FĂRĂ PAROLĂ"] }))[0].cheie, "parola", "parola lipsă e abatere");
});
await test("3 excepții, derulare laterală, text stricat", () => {
  const a = judeca(Object.assign({}, curat, { exceptii: ["TypeError: x is undefined\n at f"], latimeExtra: 15, frunze: ["Țintă: undefined", "NaN%", "Navigare", "Contul [object Object]"] }));
  const t = a.map((x) => x.text).join(" | ");
  assert.match(t, /excepție: TypeError/); assert.match(t, /derulare laterală \(\+15 px\)/);
  assert.match(t, /„Țintă: undefined”/); assert.match(t, /„NaN%”/); assert.match(t, /object Object/);
  assert.doesNotMatch(t, /Navigare/, "„Navigare” conține „NaN”? nu: doar cuvântul întreg");
  assert.deepEqual(judeca(Object.assign({}, curat, { latimeExtra: 1 })).length, 1, "1 px nu e derulare (dar „Aștept…” rămâne)");
});
await test("4 stările de așteptare rămase", () => {
  const a = judeca(Object.assign({}, curat, { frunze: ["Socotesc fișa monedei…", "Se aduc prețurile zilnice", "Aștept listele de azi…", "N-aș aștepta să „își revină”", "așteptarea sub stop: −3.000 lei", "AȘTEAPTĂ"] }));
  assert.deepEqual(a.map((x) => x.text), ["a rămas „Socotesc fișa monedei…”", "a rămas „Se aduc prețurile zilnice”"]);
});
await test("5 Discord: doar ce se repetă; mesajul spune pagina, lățimea, abaterea", () => {
  const a = [{ cheie: "lateral", text: "derulare laterală (+15 px)" }, { cheie: "astept:x", text: "a rămas „x”" }], b = [{ cheie: "lateral", text: "derulare laterală (+16 px)" }];
  assert.deepEqual(repetate(a, b).map((x) => x.cheie), ["lateral"]);
  assert.equal(mesaj([], "dimineata"), null);
  assert.equal(mesaj([{ pagina: "dash", latime: 412, abateri: [] }], "x"), null);
  const m = mesaj([{ pagina: "dash", latime: 412, abateri: repetate(a, b) }], "după livrare");
  assert.equal(m.nivel, "atentie");
  assert.equal(m.titlu, "Radar: o abatere pe pagini (după livrare)");
  assert.match(m.mesaj, /^Piața azi · 412 px: derulare laterală \(\+15 px\)/);
});
await test("6 rulatorul și sarcina", () => {
  const r = fs.readFileSync(path.join(RAD, "scripts", "vps", "paza-pagini.mjs"), "utf8"), s = fs.readFileSync(path.join(RAD, "scripts", "vps", "paza-pagini-sarcina.ps1"), "utf8");
  assert.match(r, /if \(!eLocal\(URL_R\)\)/, "parola doar la serverul local"); assert.match(r, /\["127\.0\.0\.1", "localhost"\]\.includes\(x\.hostname\)/);
  assert.match(r, /taskkill/); assert.match(r, /Browser\.close/); assert.match(r, /TERMEN_MS/); assert.match(r, /browserul nu răspunde la/);
  assert.match(r, /PRIORITY_BELOW_NORMAL/); assert.match(r, /await asteapta\(60000\)/); assert.match(r, /repetate\(a, b\)/);
  assert.match(r, /esteWebhookDiscord\(WEBHOOK\)/);
  assert.match(s, /-At '07:50'/); assert.match(s, /MultipleInstances IgnoreNew/); assert.match(s, /Crypto Radar paza pagini/);
});

console.log(`\n${teste - picate} / ${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
