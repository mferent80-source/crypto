// Probele v100.198 (15.10.2026, el: „SCOATE” — tunelul public trycloudflare). Telefonul intră doar prin Tailscale
// (adresa fixă din `tailscale serve status`, doar pentru aparatele lui); tunelul public era doar o rezervă, o ușă în plus spre internet.
//  1. PORNESTE-SI-PE-TELEFON.bat (singura lui treabă: tunelul) nu mai există; nicio gardă / probă nu-l mai cere
//  2. colectorul ia adresa Radarului DOAR de la Tailscale (fără rezerva din jurnalul tunelului); Consilier.adresaTunel scos
//  3. mesajul „serverul oprit” nu mai trimite la lansatorul de telefon
//  4. serverul recunoaște adresa Tailscale (*.ts.net) ca „acasă” (înainte doar *.trycloudflare.com ⇒ Health vedea telefonul ca pe Cloudflare)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.198 · tunelul public scos · proba\n");

await test("lansatorul de telefon (tunelul public) nu mai există; gărzile și probele lansatoarelor nu-l mai cer", () => {
  assert.ok(!fs.existsSync(path.join(RAD, "PORNESTE-SI-PE-TELEFON.bat")), "PORNESTE-SI-PE-TELEFON.bat trebuie scos");
  for (const f of ["garzi-v746.mjs", "proba-v992.mjs", "colector-v77.mjs"]) assert.ok(!/for \(const f of \[[^\]]*TELEFON|"PORNESTE-SI-PE-TELEFON\.bat"\]/.test(citeste("scripts", f)), f + " încă trece prin lansatorul de telefon");
  assert.match(citeste("scripts", "garzi-v746.mjs"), /existsSync\(cale\(TELEFON\)\)/, "garda cere ca tunelul public să NU revină");
});
await test("colectorul: adresa Radarului doar de la Tailscale, fără rezerva din jurnalul tunelului", () => {
  const col = citeste("scripts", "colector.mjs"), f = col.slice(col.indexOf("async function adresaRadarului"), col.indexOf("let pozaOkLa"));
  assert.ok(f.length > 50); assert.match(f, /adresaTailscale\(/); assert.match(f, /raspundeCaRadar\(fix/);
  assert.ok(!/adresaTunel|crypto-radar-tunel|trycloudflare/.test(f), "fără rezerva tunelului");
  assert.ok(!/crypto-radar-tunel\.log/.test(col));
});
await test("Consilier.adresaTunel scos (nu mai e nimic de citit); rezumatul de dimineață pune tot linkul primit (acum Tailscale)", () => {
  const c = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl }; c.window = c; vm.createContext(c); vm.runInContext(citeste("public", "lib", "consilier.js"), c);
  assert.equal(c.Consilier.adresaTunel, undefined);
  const r = c.Consilier.rezumatDimineata({ acum: Date.parse("2026-10-15T06:00:00Z"), link: "https://mau.exemplu.ts.net:8443" });
  assert.match(r.linii.join(" | "), /🔗 Radarul pe telefon: https:\/\/mau\.exemplu\.ts\.net:8443/);
});
await test("mesajul „serverul oprit”: doar PORNESTE-CRYPTO-RADAR.bat", async () => {
  const M = await import("./lib/mesaje-colector.mjs"), m = M.serverOprit(12);
  assert.match(m.mesaj, /PORNESTE-CRYPTO-RADAR\.bat/); assert.ok(!/PORNESTE-SI-PE-TELEFON/.test(m.mesaj));
});
await test("serverul: adresa Tailscale (*.ts.net) e „acasă”, ca 127.0.0.1; trycloudflare nu mai e recunoscut", () => {
  const ph = citeste("functions", "api", "provider-health.js");
  assert.match(ph, /\\\.ts\\\.net\$\/\.test\(u\.hostname\)/); assert.ok(!/trycloudflare/.test(ph));
});
await test("versiunile: v100.198 (versiunea colectorului o ridică sesiunea Busolei, care lucrează acum în colector), proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 198);   /* v100.199: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4);
  assert.match(citeste("package.json"), /npm run test:v100197 && npm run test:v100198/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
