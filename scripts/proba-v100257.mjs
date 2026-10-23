// Proba v100.257 (23.10, el: „fa idei” + bugul de la short): la short, atenția e marginea de sus.
// Butonul copiază procentul. Pe grafic, ATR-ul își spune Wilder. Pe Discord, moneda instrumentului rămâne.
// Ziua deschisă nu intră în ATR-ul din Scan. Pragurile rămân. Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { alerteSLTP } from "./lib/poza.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["scenariu.js", "sfaturi.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js", "consiliu.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Sfaturi: SF, SemnaleBot: SB, Consiliu: C, TabloExtra: T } = globalThis;
const ACUM = Date.UTC(2026, 9, 23, 15, 0, 0);
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 800)}`);
  });
}
console.log("\nV100.257 · PARTE · proba\n");

const FA = "N-aș mări levierul și n-aș pune bani în plus în botul ăsta.";
const bot = (o) => ({ baza: "JTO.PERP", directie: "short", pretCurent: 1.8, gridJos: 1.7676, gridSus: 1.8324, profitTotal: -2, investit: 40, ...o });
const scen = { ok: true, grid: { poz: 12 }, randuri: [{ eticheta: "jos", pozitie: 0, total: 4 }, { eticheta: "sus", pozitie: 90, total: -20 }] };
const zile = (v) => ({ valoare: v, atinse: 29, cazuri: 50, stare: "destule" });
function lista(sanse, o) {
  return SF.sfaturi({ bot: bot(o), scen, sanse });
}
function cons(sf, extra) {
  return C.alcatuieste(Object.assign({
    sm: { nivel: "tine", cod: "tine", motiv: "nimic nu cere o mișcare", faCe: "L-aș lăsa să lucreze.", componente: [] },
    concret: [], sfaturi: sf, consilier: [], socoteala: null,
  }, extra || {}));
}

await test("short: jos la 58% nu dă atenție; sus la 58% spune marginea de sus", () => {
  const lin = lista({ josZi: zile(58), susZi: zile(4) });
  const m0 = lin.find((s) => s.cod === "margine");
  assert.equal(m0.parte, "sus");
  assert.equal(m0.ton, "info");
  assert.equal(m0.faCe, null);
  assert.doesNotMatch(m0.titlu, /jos/);
  assert.doesNotMatch(JSON.stringify(lin), /N-aș mări levierul/);
  const des = lista({ josZi: zile(58), susZi: zile(58) });
  const m = des.find((s) => s.cod === "margine");
  assert.equal(des.filter((s) => s.cod === "margine").length, 1);
  assert.equal(m.ton, "atentie");
  assert.equal(m.parte, "sus");
  assert.equal(m.titlu, "Marginea de sus (1.8324) e cu 1,8% peste preț");
  assert.match(m.text, /moneda urcă/);
  assert.doesNotMatch(m.text, /scade/);
  assert.equal(m.faCe, FA);
  const c = cons(des, { laJos: 4, jos: 1.7676, laSus: -20, sus: 1.8324 });
  assert.equal(c.nivel, "atentie");
  assert.equal(c.titlu, "Marginea de sus e la +1,8%, atinsă în 58% din zile");
  assert.ok(c.titlu.length <= 60, c.titlu);
  assert.match(c.faCe, /^N-aș mări levierul și n-aș pune bani în plus/);
  assert.match(c.bani, /^dacă prețul urcă la marginea de sus \(1\.8324\): total /);
  assert.doesNotMatch((c.titlu || "") + (c.faCe || "") + (c.bani || ""), /jos|coboară/);
  const fara = cons(des, { laJos: 4, jos: 1.7676 });
  assert.doesNotMatch(fara.bani || "", /coboară|jos|urcă/);
  const rar = cons(lin, { laJos: 4, jos: 1.7676, laSus: -20, sus: 1.8324 });
  assert.equal(rar.nivel, "tine");
  assert.doesNotMatch(rar.titlu, /Marginea/);
});

await test("long, neutru și direcția lipsă rămân pe jos; intrarea short cere sus", () => {
  const lung = lista({ josZi: zile(40) }, { directie: "long", pretCurent: 0.0676, gridJos: 0.06147, gridSus: 0.08 });
  const ml = lung.find((s) => s.cod === "margine");
  assert.match(ml.titlu, /^Marginea de jos \(0\.06147\) e cu .+ sub preț$/);
  assert.match(ml.text, /moneda scade/);
  assert.equal(ml.parte, undefined);
  const neu = lista({ josZi: zile(40) }, { directie: "neutru" });
  assert.match(neu.find((s) => s.cod === "margine").titlu, /Marginea de jos/);
  const lipsa = lista({ josZi: zile(40) }, { directie: "" });
  assert.match(lipsa.find((s) => s.cod === "margine").titlu, /Marginea de jos/);
  const k4 = [{ time: 1, high: 1, low: 1, close: 1 }];
  const innS = SF.intrare({ bot: bot(), k4 });
  assert.ok(innS.sanse.susZi);
  assert.equal(innS.sanse.josZi, undefined);
  const innL = SF.intrare({ bot: bot({ directie: "long" }), k4 });
  assert.ok(innL.sanse.josZi);
  assert.equal(innL.sanse.susZi, undefined);
  const vechi = { cod: "margine", ton: "atentie", pctJos: 9.1, zile: 40, titlu: "Marginea de jos (0.06147) e cu 9,1% sub preț", text: "moneda scade cu atât", faCe: FA };
  const cV = C.alcatuieste({
    sm: { nivel: "atentie", cod: "muta", motiv: "x", faCe: "Aș muta.", componente: [{ nivel: "atentie", cod: "muta", motiv: "Până la marginea de jos", faCe: "Aș muta.", deCe: "des" }] },
    concret: [], sfaturi: [vechi], consilier: [], socoteala: null, laJos: -6.3, jos: 0.06147,
  });
  assert.equal(cV.motive.filter((m) => m.cod === "margine").length, 1);
  assert.equal(cV.motive.filter((m) => m.cod === "muta").length, 0);
  assert.match(cV.motive[0].titlu, /Marginea de jos \(0\.06147\) e cu 9,1% sub preț/);
  assert.match(cV.bani, /dacă prețul coboară la marginea de jos \(0\.06147\): total/);
  const sus = lista({ susZi: zile(58) });
  const acelasi = C.alcatuieste({
    sm: { nivel: "atentie", cod: "muta", motiv: "mută", faCe: "Aș muta gridul.", componente: [{ nivel: "atentie", cod: "muta", motiv: "Prețul stă lângă marginea de sus", parte: "sus", faCe: "Aș muta gridul.", deCe: "aproape" }] },
    concret: [], sfaturi: sus, consilier: [], socoteala: null, laSus: -20, sus: 1.8324,
  });
  assert.equal(acelasi.motive.filter((m) => m.cod === "margine").length, 1);
  assert.equal(acelasi.motive.filter((m) => m.cod === "muta").length, 0);
  const alt = C.alcatuieste({
    sm: { nivel: "atentie", cod: "muta", motiv: "mută", faCe: "Aș muta gridul.", componente: [{ nivel: "atentie", cod: "muta", motiv: "Prețul stă lângă marginea de jos", parte: "jos", faCe: "Aș muta gridul.", deCe: "aproape" }] },
    concret: [], sfaturi: sus, consilier: [], socoteala: null, laSus: -20, sus: 1.8324, laJos: 4, jos: 1.7676,
  });
  assert.ok(alt.motive.some((m) => m.cod === "muta"));
  assert.ok(alt.motive.some((m) => m.cod === "margine"));
});

await test("stopul în procente are buton pe procent; prețul mare rămâne", () => {
  const b = { id: "7", baza: "ZRO.PERP", directie: "long", levier: 3, pretCurent: 0.46, gridJos: 0.40, gridSus: 0.50, profitNet: 1.2, pozitie: 60, pretDeschidere: 0.47,
    investit: 100, pretLichidare: 0.31, distantaLichidarePct: 32.6, opritorPierdereActiv: true, opritorPierdereTip: "raport", opritorPierdereRaport: -0.05, opritorPierdere: 0.4535,
    brut: { buOrderData: { row: 21, perVolume: 10 } } };
  const card = SB.acumConcret({ bot: b }).find((c) => c.cod === "stop");
  assert.equal(SB.etichetaStopProc(b), "stop −5%");
  assert.equal(card.copie, "−5%");
  assert.notEqual(card.mare, card.copie);
  assert.equal(card.mare, SB.acumConcret({ bot: { ...b, opritorPierdereTip: "pret", opritorPierdereRaport: null, opritorPierdere: T.pretStopLive(b) } }).find((c) => c.cod === "stop").mare);
  assert.match(card.mic, /^stop −5% · procentul se copiază · /);
  const pret = SB.acumConcret({ bot: { ...b, opritorPierdereTip: "pret", opritorPierdereRaport: null, opritorPierdere: 0.38 } }).find((c) => c.cod === "stop");
  assert.equal(pret.copie, undefined);
  const app = citeste("public", "app.js");
  assert.match(app, /x\.copie\?'<button type="button" class="actionGhost tbTvBtn"/);
  assert.match(app, /data-action-click="gridCopiaza\(this\.value\)"/);
  assert.match(app, /ATR \$\{num\(q\.atr\)\} · Wilder/);
  assert.match(app, /\(o\[i-1\]\*\(n-1\)\+tr\[i\]\)\/n/);
});

await test("Discord scrie moneda instrumentului; INTC rămâne $, Scan rămâne pe bare închise", () => {
  function intra(sim, moneda, pret) {
    return { simboluri: [{ s: sim, moneda, pret, sugestie: {
      intrare: { pret, motiv: "retragere" }, stop: pret * 0.85, tinta: pret * 1.3, trend: "sus",
      proba: { n: 40, pePlus: 0.5, medie: 0.02 },
      marime: { bucati: sim === "INTC" ? 3.6238 : 1.5, suma: 1870, risc: 289, plafonat: false },
    } }] };
  }
  const gbp = alerteSLTP(intra("ULVR.L", "GBp", 250), ACUM)[0];
  assert.match(gbp.titlu, /GBp250\.00/);
  assert.match(gbp.mesaj, /GBp250\.00/);
  assert.match(gbp.mesaj, /1,50 buc/);
  assert.doesNotMatch(gbp.titlu + gbp.mesaj, /\$/);
  const lira = alerteSLTP(intra("ULVR.L", "£", 250), ACUM)[0];
  assert.match(lira.titlu, /£250\.00/);
  assert.doesNotMatch(lira.mesaj, /\$/);
  const eur = alerteSLTP(intra("RHM.DE", "€", 800), ACUM)[0];
  assert.match(eur.titlu, /€800\.00/);
  assert.doesNotMatch(eur.mesaj, /\$/);
  const usd = alerteSLTP(intra("INTC", "$", 111.99), ACUM)[0];
  assert.match(usd.mesaj, /Aș lua cel mult 3,62 buc, dacă intru \(~1\.870 lei, risc ~289 lei = 1% din cont\); e un reper, decizia e a ta\./);
  assert.match(usd.titlu, /\$111\.99/);
  const gol = alerteSLTP(intra("INTC", "", 111.99), ACUM)[0];
  assert.match(gol.titlu, /\$111\.99/);
  const ecran = citeste("public", "lib", "scan-ecran.js");
  assert.doesNotMatch(ecran, /ziua deschisă|media simplă pe 14 zile/);
  assert.match(ecran, /media a 14 intervale adevărate/);
  assert.match(citeste("public", "lib", "scan.js"), /atrPct: r2\(tr \/ n \/ u \* 100\)/);
  assert.match(citeste("scripts", "lib", "tura-scan.mjs"), /const z = Scan\.rezumat\(inchise\)/);
  assert.match(citeste("public", "app.js"), /laSus:TabloExtra\.totalCuGridLa\(b,botiNr\(b\.gridSus\)\)/);
  assert.match(citeste("scripts", "colector.mjs"), /laSus: TabloExtra\.totalCuGridLa\(b, Number\(b\.gridSus\)\)/);
});

await test("versiunea e cel puțin v100.257, lanțul are proba o singură dată", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.ok(Number(P.version.split(".")[1]) >= 257, P.version);
  assert.equal(P.scripts["test:v100257"], "node scripts/proba-v100257.mjs");
  assert.equal((P.scripts.test.match(/test:v100257/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100256/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100257"], /npm run test:v100257/);
  assert.doesNotMatch(P.scripts["test:v100257"], /test:v100256/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/) || [0, 0])[1]) >= 139);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.ok(Number(String(info.version).replace(/^v/, "").split(".")[1]) >= 257, info.version);
  assert.equal(info.engineContract, "54.1");
  assert.match(info.features.parte257, /v101\.139/);
  assert.match(info.features.copie256, /procentul/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
