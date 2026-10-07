// Proba v100.127 / colector v101.85 (07.10, el: „fa idei” după Salt lângă T212):
// (1) alertă „Salt: n-am prețuri de 3 h” - altfel alerta la stopul care urcă ar tăcea fără să știe; o dată, iar când revin, „au revenit”;
// (2) un rând Salt în rezumatul de dimineață de pe Discord, sus (mesajul se taie la coadă): valoarea, pe deschise, cine e de ieșit.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.127 · Salt: alerta „n-am prețuri”, rândul din rezumatul de dimineață · proba\n");
const TP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-salt-pozitii.mjs")).href);
const TD = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-dimineata.mjs")).href);
const H = 3600000, T0 = Date.UTC(2026, 9, 7, 8);
const REZ = { la: T0, n: 2, val: 1881.1, cost: 2563.56, rez: -682.46, eurRon: 5.35, iesi: ["RHM", "NFLX"], atentie: [], fara: 0 };

await test("(1) „n-am prețuri”: după 3 h fără prețuri (măcar o poziție) ⇒ o alertă (atenție), nu la fiecare tură; când revin ⇒ „au revenit” (info), o dată", () => {
  const st = {}, fara = Object.assign({}, REZ, { fara: 2 }), ok = REZ;
  assert.equal(TP.alertaFaraPreturi(st, ok, T0), null);
  assert.equal(TP.alertaFaraPreturi(st, fara, T0), null, "abia a început");
  assert.equal(TP.alertaFaraPreturi(st, fara, T0 + 2 * H), null, "sub 3 h");
  const m = TP.alertaFaraPreturi(st, fara, T0 + 3 * H + 60000);
  assert.equal(m.nivel, "atentie"); assert.match(m.titlu, /^Salt: n-am prețuri de 3 h/); assert.match(m.mesaj, /2 din 2/); assert.match(m.mesaj, /stopul care urcă/); assert.match(m.mesaj, /\n👉 /);
  assert.equal(TP.alertaFaraPreturi(st, fara, T0 + 5 * H), null, "o singură dată");
  const r = TP.alertaFaraPreturi(st, ok, T0 + 6 * H); assert.equal(r.nivel, "info"); assert.match(r.titlu, /Salt: prețurile au revenit/);
  assert.equal(TP.alertaFaraPreturi(st, ok, T0 + 7 * H), null); assert.equal(st.faraDe, undefined);
  assert.equal(TP.alertaFaraPreturi({}, Object.assign({}, REZ, { n: 0, fara: 0 }), T0), null, "fără poziții ⇒ nimic");
});
await test("(2a) rândul de dimineață: „🧂 Salt: 1.881,1 EUR · deschise −682,5 EUR (−26,6%) · de ieșit: RHM, NFLX”; nimic de ieșit; vechi; fără poziții ⇒ nimic", () => {
  assert.equal(TP.liniaDimineataSalt(REZ, T0 + 10 * 60000), "🧂 Salt: 1.881,1 EUR · deschise −682,5 EUR (−26,6%) · de ieșit: RHM, NFLX");
  assert.match(TP.liniaDimineataSalt(Object.assign({}, REZ, { iesi: [], rez: 12.3 }), T0 + 60000), /deschise \+12,3 EUR .* · nimic de ieșit$/);
  assert.match(TP.liniaDimineataSalt(REZ, T0 + 5 * H), /^🧂 Salt \(rezumat de acum 5 h\): /);
  assert.match(TP.liniaDimineataSalt(Object.assign({}, REZ, { fara: 1 }), T0 + 60000), /· 1 din 2 fără prețuri/);
  assert.equal(TP.liniaDimineataSalt(null, T0), null); assert.equal(TP.liniaDimineataSalt(Object.assign({}, REZ, { n: 0 }), T0), null);
  assert.match(TP.liniaDimineataSalt(Object.assign({}, REZ, { fara: 2, val: 0 }), T0 + 60000), /^🧂 Salt: n-am prețuri/);
});
await test("(2b) rezumatul de dimineață: rândul Salt sus, după becuri și înaintea rândurilor Consilierului (mesajul se taie la coadă)", async () => {
  let trimis = null;
  await TD.turaDimineata({ acum: Date.UTC(2026, 9, 7, 7), stare: {}, jurnal: () => {}, Consilier: { rezumatDimineata: () => ({ titlu: "Dimineața", linii: ["C1", "C2"] }) },
    date: async () => ({ liniiIntai: ["V"], liniiBecuri: ["B"], liniiSalt: ["🧂 Salt: x"], liniiExtra: ["E"] }), trimite: async (m) => { trimis = m; return true; } });
  assert.equal(trimis.mesaj, "V\nB\n🧂 Salt: x\nC1\nC2\nE");
});
await test("(3) colectorul: rezumatul Salt citit în dimineață (liniiSalt), alerta „n-am prețuri” în tura pozițiilor (cu starea scrisă pe loc)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /out\.liniiSalt = /); assert.match(c, /\/api\/t212\?action=saltRezumat/);
  assert.match(c, /alertaFaraPreturi\(st, r\.rezumat, Date\.now\(\)\)/); assert.match(c, /import \{ turaSaltPozitii as turaSaltPozitiiModul, alertaFaraPreturi, liniaDimineataSalt \} from/);
});
await test("(E) versiunea de la v100.127 în sus / colector de la v101.85 în sus", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(2[7-9]|[3-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(2[7-9]|[3-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(2[7-9]|[3-9]\d)</); /* v100.128: lărgit */
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(2[7-9]|[3-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(2[7-9]|[3-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(2[7-9]|[3-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(2[7-9]|[3-9]\d)$/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(8[5-9]|9\d)";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
