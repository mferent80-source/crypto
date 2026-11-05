// Proba v100.305 / colector v101.165 (05.11.2026, el: „fă toate” după auditul sever al Busolei):
//   1. 🔴 2 / I-812 — vârsta rezumatului după programul REAL de pe VPS (07:05–21:05 din oră în oră, 23:05, 03:05), luat din rezumat
//      (`program`, Busola 1.88) sau din lista de rezervă (aceeași). Pragul vechi (08–23 orar) dădea „Busola n-a mai măsurat” FALS în
//      fiecare seară la 23:02 (colector.log: 9 seri), iar după 07:05 aștepta 4 h.
//   2. I-814 — Tabloul botului arată starea PAGINII Busolei, cu opțiunile (`miscare4h`): pe 04.11 scria „nimic neobișnuit” pe 24 din 30
//      de monede, iar Busola „mai calmă (din opțiuni)”. Paza (alertele) rămâne pe celula măsurată — hotărârea pentru alerte e a LUI.
//   3. I-814 — unde cifra tace din cauza opțiunilor, rândul spune de ce (nu dispare fără explicație).
//   4. I-823 — mesajul „n-a mai măsurat” trimite la VPS, fără „pornește PC-ul / MASOARA-SI-URCA.bat” și fără să ceară wrangler login acasă.
//   5. versiunile v100.305 / colector v101.165, proba în lanțul npm test.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as P from "./lib/paza-boti.mjs";
import * as MC from "./lib/mesaje-colector.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\nv100.305 · Busola: programul real, opțiunile în Tablou, mesajul spre VPS · proba\n");
const ctx = Object.assign({ console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo }); vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx);
const B = ctx.Busola, H = 3600000, MIN = 60000;
// 05.11 e iarnă (UTC+2): 21:17 RO = 19:17 UTC
const SEARA = Date.UTC(2026, 10, 4, 19, 17), DIMINEATA = Date.UTC(2026, 10, 5, 5, 17);
const REZ = (la, extra) => Object.assign({ la, monede: {}, grid: {}, perp: {} }, extra || {});
const PROGRAM = ["03:05", "07:05", "08:05", "09:05", "10:05", "11:05", "12:05", "13:05", "14:05", "15:05", "16:05", "17:05", "18:05", "19:05", "20:05", "21:05", "23:05"];

await test("1a. lista de rezervă = programul Busolei (aceeași ca src/motor/vechime.ts)", () => {
  assert.deepEqual(Array.from(B.PROGRAM_MASURARE), PROGRAM);
  const cv = path.join(RAD, "..", "busola", "src", "motor", "vechime.ts");
  if (!fs.existsSync(cv)) { console.log("       (fără dosarul busola alături: compar doar lista; contractul Busolei o compară și el)"); return; }
  const v = fs.readFileSync(cv, "utf8");
  for (const o of PROGRAM) assert.ok(v.includes("'" + o + "'"), "lipsește " + o + " din vechime.ts");
});
await test("1b. 🔑 după 21:17 pragul e 2 h 50 min: la 23:02 NU e alarmă (cea falsă de seară), la 00:10 e — „trebuia la 23:05”", () => {
  assert.equal(B.pragVechime(SEARA), 2 * H + 50 * MIN);
  assert.equal(P.notaVeche({ Busola: B, rez: REZ(SEARA), acum: Date.UTC(2026, 10, 4, 21, 2), anuntat: null }), null);
  const n = P.notaVeche({ Busola: B, rez: REZ(SEARA), acum: Date.UTC(2026, 10, 4, 22, 10), anuntat: null });
  assert.ok(n); assert.match(n.titlu, /\(trebuia la 23:05\)$/);
});
await test("1c. 🔑 după 07:17 pragul e 1 h 50 min (înainte 4 h 50: o pană la 08:05 se vedea pe la 12)", () => {
  assert.equal(B.pragVechime(DIMINEATA), H + 50 * MIN);
  assert.ok(P.notaVeche({ Busola: B, rez: REZ(DIMINEATA), acum: DIMINEATA + 2 * H, anuntat: null }));
});
await test("1d. programul din rezumat bate lista de rezervă (Busola îl poate schimba fără Radar nou)", () => {
  assert.equal(B.pragVechime(SEARA, ["12:00"]), 24 * H + 50 * MIN);
  assert.equal(B.pazaStare(REZ(SEARA, { program: ["12:00"] }), "BTCUSDT", SEARA + 5 * H).vechi, false);
  assert.equal(B.pazaStare(REZ(SEARA), "BTCUSDT", SEARA + 5 * H).vechi, true);
});

const M_OPT = { "4h": "nu-stiu", miscare4h: { semn: "liniste", sursa: "optiuni" }, optiuni4h: { semn: 1, inVerdict: true, sfert: "Q1", din: "BTC" } };
const REZ_OPT = () => REZ(SEARA, { monede: { SOL: M_OPT, ETH: { "4h": "liniste", verdict4h: { cate: 41, ce: "stau în canal", deObicei: 44 } } }, grid: { liniste: -0.00257, oricand: -0.00315, miscare: -0.00359 } });
await test("2a. 🔑 Tabloul: starea paginii Busolei, cu opțiunile — „mai calmă … după piața de opțiuni pe BTC”, fără cifra gridului (nemăsurată acolo)", () => {
  const e = B.eticheta(REZ_OPT(), "SOL_USDT_PERP", SEARA + 10 * MIN, null);
  assert.equal(e.stare, "liniste"); assert.equal(e.sursa, "optiuni");
  assert.match(e.text, /mai calmă ca de obicei — după piața de opțiuni pe BTC; Busola tace aici/); assert.doesNotMatch(e.text, /%/);
});
await test("2b. paza (alertele) rămâne pe celula măsurată: SOL tot „nu-stiu” pentru colector", () => {
  assert.equal(B.pazaStare(REZ_OPT(), "SOL_USDT_PERP", SEARA + 10 * MIN).stare, "nu-stiu");
});
await test("2e. 🔑 revizia: starea paginii (miscare4h) NU suprascrie celula când vorbește Busola — doar opțiunile; altfel eticheta ar contrazice alerta pazei", () => {
  const r = REZ(SEARA, { monede: { AAVE: { perp4h: "miscare", miscare4h: { semn: "liniste", sursa: "busola" } } }, grid: { liniste: -0.00257, oricand: -0.00315, miscare: -0.00359 } });
  const e = B.eticheta(r, "AAVE_USDT_PERP", SEARA + 10 * MIN, null);
  assert.equal(e.stare, "miscare"); assert.equal(B.pazaStare(r, "AAVE_USDT_PERP", SEARA + 10 * MIN).stare, "miscare"); assert.equal(e.sursa, undefined);
});
await test("2c. rezumat vechi (fără miscare4h) ⇒ ca înainte: starea din celulă", () => {
  const e = B.eticheta(REZ(SEARA, { monede: { SOL: { "4h": "nu-stiu" } } }), "SOL_USDT_PERP", SEARA + 10 * MIN, null);
  assert.equal(e.stare, "nu-stiu"); assert.equal(e.sursa, undefined, "forma veche, fără câmpuri noi"); assert.equal(e.text, "nimic neobișnuit");
});
await test("2d. „de N h” de la colector doar când starea afișată e chiar cea a pazei (altfel ar minți durata)", () => {
  const e = B.eticheta(REZ_OPT(), "SOL_USDT_PERP", SEARA + 10 * MIN, { stare: "nu-stiu", de: SEARA - 5 * H });
  assert.doesNotMatch(e.nota, /^de /);
});
await test("3. 🔑 cifra tace din cauza opțiunilor ⇒ rândul spune de ce; fără opțiuni și fără cifră ⇒ nimic, ca înainte", () => {
  const r = B.randVerdict(REZ_OPT(), "SOL_USDT_PERP", SEARA + 10 * MIN);
  assert.ok(r); assert.match(r.text, /^cifra tace: verdictul de mișcare vine din piața de opțiuni pe BTC/);
  assert.equal(B.randVerdict(REZ(SEARA, { monede: { SOL: { "4h": "nu-stiu", miscare4h: { semn: "nu-stiu", sursa: "niciuna" } } } }), "SOL_USDT_PERP", SEARA), null);
  assert.equal(B.randVerdict(REZ_OPT(), "SOL_USDT_PERP", SEARA, { interval: "1h" }), null, "pe 1h rămâne ca înainte");
  assert.match(B.randVerdict(REZ_OPT(), "ETHUSDT", SEARA).text, /^41 din 100/);
});
await test("4. mesajul trimite la VPS: fără „Aș porni PC-ul”, fără MASOARA-SI-URCA.bat, fără să ceară wrangler login acasă", () => {
  const m = MC.busolaVeche(3, 1.83, Date.UTC(2026, 10, 5, 7, 5));
  assert.match(m.titlu, /\(trebuia la 09:05\)$/); assert.ok(m.titlu.length <= 60);
  assert.match(m.mesaj, /VPS/); assert.match(m.mesaj, /fără wrangler login pe PC-ul de acasă/);
  assert.doesNotMatch(m.mesaj, /porni PC-ul|MASOARA-SI-URCA|aș rula npx wrangler login/i);
  // revizia 05.11 (🟠2): Radarul tace pe Discord DOAR când rezumatul spune că paznicul din Worker chiar poate anunța (webhook pus);
  // altfel (Busola dinainte de 1.88, secret lipsă) rămâne vocea pe Discord — o pană nu trebuie să rămână fără nicio voce
  assert.equal(m.doarRadar, false, "fără dovada paznicului ⇒ tot pe Discord");
  assert.equal(MC.busolaVeche(3, 1.83, Date.UTC(2026, 10, 5, 7, 5), true).doarRadar, true, "paznicul din Worker poate anunța ⇒ doar în Radar");
  const veche = (paznic) => P.notaVeche({ Busola: B, rez: REZ(SEARA, paznic === undefined ? {} : { paznic }), acum: Date.UTC(2026, 10, 4, 22, 10), anuntat: null });
  assert.equal(veche(undefined).doarRadar, false); assert.equal(veche({ discord: false }).doarRadar, false); assert.equal(veche({ discord: true }).doarRadar, true);
});
await test("5. versiunile v100.305 / colector v101.165, proba în lanțul npm test", () => {
  const Hh = citeste("public", "index.html");
  assert.ok((Hh.match(/v100\.(30[5-9]|3[1-9]\d)/g) || []).length >= 3); assert.doesNotMatch(Hh, /v100\.304 · /);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-(30[5-9]|3[1-9]\d)"/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(30[5-9]|3[1-9]\d)"/);
  const BI = JSON.parse(citeste("BUILD_INFO.json")); assert.match(BI.version, /^v100\.(30[5-9]|3[1-9]\d)$/); assert.ok(BI.features.busolaAudit305);
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 305);
  assert.match(citeste("package.json"), /npm run test:v100304 && npm run test:v100305/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(16[5-9]|1[7-9]\d)"/);
});

console.log(`\n${teste - picate}/${teste} ok`);
process.exitCode = picate ? 1 : 0;
