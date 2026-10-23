// Proba v100.256 (23.10, el: „fa idei”): Discord sub prețul 10 scrie bucăți întregi;
// ATR-ul de pe Scan își spune media; la stopul în procente se copiază procentul.
// Pragurile și cifrele rămân. Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { alerteSLTP } from "./lib/poza.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ACUM = Date.UTC(2026, 9, 23, 15, 0, 0);
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`);
  });
}
console.log("\nV100.256 · COPIE · proba\n");

function intrare(sim, pret, buc, extra) {
  return { simboluri: [{ s: sim, moneda: "$", pret, sugestie: {
    intrare: { pret, motiv: "retragere" }, stop: pret * 0.85, tinta: pret * 1.3, trend: "sus",
    proba: { n: 40, pePlus: 0.5, medie: 0.02 },
    marime: extra === null ? undefined : Object.assign({ bucati: buc, suma: 1870, risc: 289, plafonat: false }, extra || {}),
  } }] };
}
function mesaj(p) {
  const a = alerteSLTP(p, ACUM);
  assert.equal(a.length, 1, JSON.stringify(a));
  return a[0].mesaj;
}

await test("Discord: sub 10 bucăți întregi; de la 10 rămân două zecimale, iar INTC rămâne 3,62", () => {
  const mic = mesaj(intrare("PENNY", 4.2, 144.118));
  assert.match(mic, /Aș lua cel mult 144 buc, dacă intru \(~1\.870 lei, risc ~289 lei = 1% din cont\)/);
  assert.doesNotMatch(mic, /144,11|144,118/);
  const intc = mesaj(intrare("INTC", 111.99, 3.6238));
  assert.match(intc, /Aș lua cel mult 3,62 buc, dacă intru \(~1\.870 lei, risc ~289 lei = 1% din cont\); e un reper, decizia e a ta\./);
  assert.match(mesaj(intrare("INTC", 111.99, 3.6238, { plafonat: true })), /plafon 20% din cont/);
  assert.match(mesaj(intrare("ZECE", 10, 3.6238)), /Aș lua cel mult 3,62 buc/);
  assert.match(mesaj(intrare("NOUA", 9.99, 3.6238)), /Aș lua cel mult 4 buc/);
  assert.match(mesaj(intrare("PENCE", 250, 1.5)), /Aș lua cel mult 1,50 buc/);
  assert.doesNotMatch(mesaj(intrare("PENCE", 250, 1.5)), /2 buc/);
  const fara = mesaj(intrare("GOL", 4.2, 0, null));
  assert.doesNotMatch(fara, /Aș lua cel mult|buc/);
});

await test("Scan își numește media; formula, stopul de acțiuni și Wilder rămân", () => {
  const ecran = citeste("public", "lib", "scan-ecran.js");
  const scan = citeste("public", "lib", "scan.js");
  assert.match(ecran, /Mișcarea zilnică \(ATR\)/);
  assert.match(ecran, /media a 14 intervale adevărate/);
  assert.doesNotMatch(ecran, /media simplă pe 14 zile/);
  assert.match(scan, /atrPct: r2\(tr \/ n \/ u \* 100\)/);
  assert.doesNotMatch(scan.slice(scan.indexOf("function rezumat"), scan.indexOf("function fata")), /\(o\[i - 1\] \* \(n - 1\)/);
  assert.match(citeste("public", "lib", "t212-ecran.js"), /ATR, media simplă pe 14 zile/);
  assert.match(citeste("public", "app.js"), /\(o\[i-1\]\*\(n-1\)\+tr\[i\]\)\/n/);
});

await test("stopul în procente: se copiază procentul, prețul mare rămâne cifra vie", () => {
  vm.runInThisContext(citeste("public", "lib", "grid-calcul.js"));
  vm.runInThisContext(citeste("public", "lib", "tablou-extra.js"));
  vm.runInThisContext(citeste("public", "lib", "semnale-bot.js"));
  const T = globalThis.TabloExtra, SB = globalThis.SemnaleBot;
  const bot = (o) => ({ id: "7", baza: "ZRO.PERP", directie: "long", levier: 3, pretCurent: 0.46, gridJos: 0.40, gridSus: 0.50, profitNet: 1.2, pozitie: 60, pretDeschidere: 0.47,
    investit: 100, pretLichidare: 0.31, distantaLichidarePct: 32.6, opritorPierdereActiv: true, opritorPierdereTip: "raport", opritorPierdereRaport: -0.05, opritorPierdere: 0.4535,
    brut: { buOrderData: { row: 21, perVolume: 10 } }, ...o });
  const b = bot(), card = SB.acumConcret({ bot: b }).find((c) => c.cod === "stop");
  assert.equal(SB.etichetaStopProc(b), "stop −5%");
  assert.equal(SB.pretStopEcran(b), T.pretStopLive(b));
  assert.match(card.mic, /^stop −5% · procentul se copiază · /);
  assert.match(card.mic, /prețul mare se mută/);
  assert.equal(card.mare, SB.acumConcret({ bot: bot({ opritorPierdereTip: "pret", opritorPierdereRaport: null, opritorPierdere: T.pretStopLive(b) }) }).find((c) => c.cod === "stop").mare);
  const pret = SB.acumConcret({ bot: bot({ opritorPierdereTip: "pret", opritorPierdereRaport: null, opritorPierdere: 0.38 }) }).find((c) => c.cod === "stop");
  assert.doesNotMatch(pret.mic, /procentul se copiază|prețul mare se mută/);
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /procentul se copiază/);
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /prețul de pe bară e doar acum/);
});

await test("versiunea e cel puțin v100.256, lanțul are proba o singură dată", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.ok(Number(P.version.split(".")[1]) >= 256, P.version);
  assert.equal(P.scripts["test:v100256"], "node scripts/proba-v100256.mjs");
  assert.equal((P.scripts.test.match(/test:v100256/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100255/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100256"], /npm run test:v100256/);
  assert.doesNotMatch(P.scripts["test:v100256"], /test:v100255/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/) || [0, 0])[1]) >= 138);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.ok(Number(String(info.version).replace(/^v/, "").split(".")[1]) >= 256, info.version);
  assert.equal(info.engineContract, "54.1");
  assert.match(info.features.copie256, /procentul/);
  assert.match(info.features.scala255, /v101\.137/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
