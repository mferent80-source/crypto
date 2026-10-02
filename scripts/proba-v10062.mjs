// Proba v100.62 (02.10, el: „revizuiește toate sfaturile … mai concise, profesioniste și mai optimizate” -> pachetul 2: sfaturile botilor;
// „fă și ideile” -> garda cu sfaturile REALE, verdictul vechi al Tabloului in inventar). Specul docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md.
// Sectiunile („sarcina N”) intra in fisier pe rand, fiecare inaintea codului ei (planul 2026-10-02-sfaturi-pachetul-2-sfaturile-botilor.md).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const modul = (...p) => import(pathToFileURL(path.join(RAD, ...p)).href);
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Sfaturi: SF, SemnaleBot: S, Consiliu: C, TabloExtra: T } = globalThis;
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.62 · Sfaturile concise, pachetul 2: sfaturile botilor, „Ce ai de făcut acum”, avertismentele serverului · proba\n");

// botul CRV al lui (long, 0.3841–0.4331), langa marginea de jos, cu buOrderData Pionex si lumanari de 4 h care oscileaza ±6%
const T0 = Date.UTC(2026, 9, 2, 6, 0), ORA = 3600000;
const K4 = (p, amp) => Array.from({ length: 300 }, (_, i) => { const c = p * (1 + amp * Math.sin(i / 5)); return { time: T0 - (300 - i) * 4 * ORA, open: c, high: c * 1.01, low: c * 0.99, close: c }; });
const CRV = (o) => Object.assign({ id: "2394", baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, profitTotal: -3.2, pretCurent: 0.3858, gridJos: 0.3841, gridSus: 0.4331,
  distantaLichidarePct: 30, pretLichidare: 0.3383, gridProfitBrut: 3.2, pornitLa: T0 - 4 * 86400000,
  brut: { buOrderData: { bottom: "0.3841", top: "0.4331", row: 7, perVolume: "40", position: "160", positionOpenPrice: "0.3974", marginBalance: "44.7", trend: "long", gridProfit24h: "0.40", trx24h: 6, closedExchangeOrderCount: 120 } } }, o || {});
const FISA = (o) => Object.assign({ dir: "long", directie: { dir: "long", tarie: "mediu", motive: [] }, regim: { r4h: 0.6, r24h: 0.8, miscare: false },
  liniste: { linisteAcum: true, zileLiniste: 0.4, n: 13, k: 3, p: 3 / 13, ic: [0.08, 0.5], suficient: true, H: 2 },
  setare: { jos: 0.37, sus: 0.40, grile: 6, pas: 0.014, levier: 5, levierSigur: 4, dir: "long", stop: { jos: 0.36, sus: 0.41 } } }, o || {});
const sfaturi = (bot, o = {}) => {
  const x = SF.intrare({ bot, k4: o.k4 === undefined ? K4(bot.pretCurent, 0.06) : o.k4, funding: o.funding ?? null, fisa: o.fisa === undefined ? FISA() : o.fisa, rezumat: o.rezumat || null, acum: T0 });
  Object.assign(x, o.peste || {});
  return SF.sfaturi(x);
};
const cod = (l, c) => l.find((s) => s.cod === c);

// ---- sarcina 1: garda pe tot pachetul 2 (sfaturile reale, „Ce ai de făcut acum”, avertismentele serverului) ----
await test("avertismentele serverului: o funcție pură în functions/_shared/avertismente.js, folosită de bot-orders.js (nu mai sunt scrise pe loc)", async () => {
  const { avertismenteBot } = await modul("functions", "_shared", "avertismente.js");
  const l = avertismenteBot({ x: {}, pret: 0.3806, jos: 0.37, sus: 0.38, lich: { pretLichidare: 0.3383, lichidarePartea: "jos", distantaLichidarePct: 10.93, lichidareDepasita: false },
    comisioane: -1.21, gridProfitBrut: 10.91, profitNet: -1.6 });
  assert.equal(l.length, 4, l.join(" | "));
  const bo = citeste("functions", "api", "bot-orders.js");
  assert.match(bo, /import \{avertismenteBot\} from "\.\.\/_shared\/avertismente\.js";/);
  assert.ok(!/avertismente\.push\(/.test(bo), "bot-orders.js scrie încă avertismentele pe loc");
});
await test("garda generează sfaturile REALE (Sfaturi.sfaturi), Consilierul cu ele, „Ce ai de făcut acum” și avertismentele serverului", async () => {
  const G = await modul("scripts", "garda-texte.mjs"), l = G.situatii(), pe = (m) => l.filter((x) => x.mod === m);
  for (const [m, min] of [["sfaturi", 150], ["todo", 6], ["consiliu-2", 15], ["server", 6], ["alerte", 4]]) assert.ok(pe(m).length >= min, m + ": " + pe(m).length + " texte");
  for (const c of ["margine", "trend", "miscare", "miscare-cu", "liniste", "ritm", "costuri", "setare", "zero", "directie", "funding", "nimic", "pericol.lich", "pericol.grid"])
    assert.ok(pe("sfaturi").some((x) => x.sursa.startsWith("sfat." + c + ".")), "lipsește sfatul " + c);
  assert.ok(pe("consiliu-2").some((x) => x.sursa.startsWith("consiliu.motiv1.") && x.sit.startsWith("primul motiv vine din sfaturi")), "lipsește Consilierul cu primul motiv din sfaturi.js");
});
await test("garda: `--mod=` scrie în inventar doar grupurile cerute", () => {
  const f = path.join(os.tmpdir(), "inventar-proba-v10062-" + process.pid + ".md");
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "garda-texte.mjs"), "--inventar", f, "--mod=server"], { encoding: "utf8" });
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(-400));
  const randuri = fs.readFileSync(f, "utf8").split("## Discord")[0].split("\n").filter((x) => x.startsWith("| ") && !x.startsWith("| Situația"));
  fs.rmSync(f, { force: true });
  assert.ok(randuri.length >= 6 && randuri.every((x) => / \| avertisment\d+\.t \| /.test(x)), randuri.slice(0, 3).join("\n"));
});

console.log(`\nV100.62 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
