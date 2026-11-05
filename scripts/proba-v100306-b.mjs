// Proba v100.306-b (I-825, auditul final din 05.11.2026, 🔴 2 / 3 / 4: „Trade-ul zilei cinstit”):
//   1. P3 cu ziua deja făcută: până acum ≥ ieri ⇒ P3 = 1 și „deja mai mult ca ieri”; mișcarea așteptată = max(așteptat, până acum) pe fiecare
//      cuantilă; „cât mai rămâne” din ramaneAsteptat; la 00:00 UTC (proba A pre-înregistrată, tura-proba-a.mjs) P3 rămâne cel al modelului;
//   2. banda gridului pe ADEVĂR: pe bare REALE de 1 h din zile NEVĂZUTE la învățarea benzii (scripts/proba-date/tz-bare-1h.json, 8 monede,
//      24.08 … 02.11.2026), cât de des stă restul zilei UTC în „Grid azi” = frecvența scrisă în frază, pe fiecare oră UTC (garda veche din
//      proba-v100298 fixa fraza „trei din patru”, care era adevărată în 43–67 % din zile); pasul = lățimea / 10 ⇒ „cinci grile pe parte”;
//      stopul nu stă niciodată în interiorul benzii;
//   3. prețurile pe cifre semnificative, pe pagină și pe Discord: PEPE nu mai dă „0,000005 – 0,000005”;
//   4. mesajul de pe Discord: „>ieri deja” când ziua a trecut deja de ieri; rândurile ≤ 160.
//   node scripts/proba-v100306-b.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { liniiTradeZilei } from "./lib/tura-trade-zilei.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); });
}
console.log("\nV100.306-b · Trade-ul zilei cinstit (I-825) · proba\n");

const ctx = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout };
ctx.window = ctx; ctx.module = undefined;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js"), ctx);
vm.runInContext(citeste("public", "lib", "tablou-bot.js"), ctx);
vm.runInContext(citeste("public", "lib", "trade-zilei.js"), ctx);
vm.runInContext(citeste("public", "lib", "trade-zilei-ecran.js"), ctx);
const TZ = ctx.TradeZilei;
const ORA = 3600000, ZI = 86400000, T0 = Math.floor(1761955200000 / ZI) * ZI;
// zile întregi cu range-urile date (maximul la 12:00, minimul la 06:00) + `oreAzi` bare de azi la `pretAzi`, cu întinderea `rangeAzi` (max la 01:00, min la 02:00)
function bare(ranges, oreAzi, pretAzi, rangeAzi, t0) {
  const out = []; const p = 100, T = t0 == null ? T0 : t0;
  ranges.forEach((r, d) => { for (let h = 0; h < 24; h++) out.push({ t: T + d * ZI + h * ORA, o: p, h: h === 12 ? p * (1 + r / 2) : p * 1.001, l: h === 6 ? p * (1 - r / 2) : p * 0.999, c: p }); });
  for (let h = 0; h < oreAzi; h++) { const ra = rangeAzi || 0.002; out.push({ t: T + ranges.length * ZI + h * ORA, o: pretAzi, h: pretAzi * (1 + (h === 1 ? ra / 2 : 0.001)), l: pretAzi * (1 - (h === 2 ? ra / 2 : 0.001)), c: pretAzi }); }
  return out;
}
const r12 = Array(12).fill(0.04); r12[11] = 0.02; r12[10] = 0.025;   // ieri 2 %, alaltăieri 2,5 %

await test("1a. P3: până acum (6 %) ≥ ieri (2 %) ⇒ P3 = 1, „deja”, mișcarea așteptată ≥ până acum pe fiecare cuantilă, „cât mai rămâne” din ea", () => {
  const d = TZ.azi(bare(r12, 20, 100, 0.06), T0 + 12 * ZI + 20 * ORA + 300000);
  assert.ok(!d.eroare, d.eroare); assert.ok(Math.abs(d.panaAcum - 0.06) < 1e-9 && Math.abs(d.r1 - 0.02) < 1e-9, d.panaAcum + " / " + d.r1);
  assert.equal(d.dejaMaiMult, true); assert.equal(d.p3, 1); assert.ok(d.p3Model > 0 && d.p3Model < 1, "P3-ul modelului rămâne alături: " + d.p3Model);
  for (const q of ["p25", "med", "p75"]) { assert.ok(d.asteptat[q] >= d.panaAcum - 1e-12, q); assert.ok(Math.abs(d.asteptat[q] - Math.max(d.asteptatModel[q], d.panaAcum)) < 1e-12, q); }
  assert.ok(d.asteptatModel.med < d.panaAcum, "construcția: modelul aștepta mai puțin decât s-a făcut deja");
  assert.ok(Math.abs(d.ramaneAsteptat - d.asteptat.med * d.ramane) < 1e-12);
  const h = ctx.tzCartela({ simbol: "DOGE", pionex: "DOGE_USDT_PERP", fel: "piata", d });
  assert.match(h, /Azi se mișcă mai mult ca ieri<\/span><b class="tzCifra[^"]*">100 %<\/b><span class="tzMut tzMic">deja mai mult ca ieri: 6,0 % până acum, față de 2,0 % ieri/);
  assert.doesNotMatch(h, /calibrat: din 100 de zile ca azi/, "cu ziua deja făcută, calibrarea modelului nu mai e răspunsul");
});

await test("1b. P3: până acum sub ieri ⇒ P3 = cel al modelului, mișcarea așteptată = a modelului (când e peste); la 00:00 UTC (proba A) neatins", () => {
  const d = TZ.azi(bare(r12, 5, 100, 0.01), T0 + 12 * ZI + 5 * ORA + 300000);
  assert.equal(d.dejaMaiMult, false); assert.equal(d.p3, d.p3Model);
  for (const q of ["p25", "med", "p75"]) assert.ok(Math.abs(d.asteptat[q] - Math.max(d.asteptatModel[q], d.panaAcum)) < 1e-12, q);
  assert.match(ctx.tzCartela({ simbol: "DOGE", pionex: "DOGE_USDT_PERP", fel: "piata", d }), /nu vede ziua de azi: din 100 de zile după un ieri ca ăsta, \d+ au ieșit așa/);   // revizia v100.306: cu bare de azi, P3 e al modelului (ieri și alaltăieri) - spus
  // tura-proba-a.mjs: TradeZilei.azi(bare, începutul zilei) - nicio bară de azi ⇒ nimic din ziua de azi, P3 = modelul
  const d0 = TZ.azi(bare(r12, 0, 100), T0 + 12 * ZI);
  assert.equal(d0.bareAzi, 0); assert.equal(d0.dejaMaiMult, false); assert.equal(d0.p3, d0.p3Model); assert.equal(d0.panaAcum, 0);
  assert.match(citeste("scripts", "lib", "tura-proba-a.mjs"), /semnal: d\.p3 >= PRAG_P3/, "proba A citește tot d.p3 (la 00:00 = modelul)");
});

// ---------------------------------------------------------------- 2. banda pe adevăr, pe barele reale ale fixture-ului
const FX = JSON.parse(citeste("scripts", "proba-date", "tz-bare-1h.json"));
function frecventaDinFraza(html) {
  const m = html.match(/cuprinde [^<·]*?în (\d+(?:,\d)?) %/); if (m) return Number(m[1].replace(",", ".")) / 100;
  if (/cuprinde [^<·]*trei din patru/.test(html)) return 0.75;   // fraza veche
  return NaN;
}
const masurat = Array.from({ length: 24 }, () => ({ n: 0, in: 0 })), spus = Array(24).fill(null);
let stopInauntru = 0, randuri = 0, pasuri = 0, zileFx = 0;
for (const m of FX.monede) {
  const b = []; let cp = m.b[0][2]; m.b.forEach(([h, l, c], i) => { b.push({ t: m.t0 + i * ORA, o: cp, h, l, c }); cp = c; });
  const z0 = Math.ceil(m.t0 / ZI) * ZI + 22 * ZI, zFin = m.t0 + b.length * ORA;
  for (let z = z0; z + ZI <= zFin; z += ZI) {
    const i0 = (z - m.t0) / ORA; zileFx++;
    for (let h = 0; h < 24; h++) {
      const i = i0 + h, acum = z + h * ORA + 300000;
      const d = TZ.azi(b.slice(Math.max(0, i - 600), i), acum); if (!d || d.eroare) continue;
      const g = TZ.grid(d); if (!g) continue;
      let hi = -Infinity, lo = Infinity; for (let q = i; q <= i0 + 23; q++) { if (b[q].h > hi) hi = b[q].h; if (b[q].l < lo) lo = b[q].l; }
      masurat[h].n++; if (hi <= g.sus && lo >= g.jos) masurat[h].in++;
      randuri++; if (g.stop < g.jumatate - 1e-12) stopInauntru++; if (Math.abs(g.pas * 10 - g.latime) > 1e-12) pasuri++;
      if (spus[h] === null) spus[h] = frecventaDinFraza(ctx.tzCartela({ simbol: m.s, pionex: m.s + "_USDT_PERP", fel: "piata", d }));
    }
  }
}
// toleranța: ~2 erori standard ale unei frecvențe de ~75 % pe ~70 de zile (monedele aceleiași zile se mișcă împreună ⇒ unitatea e ziua) ≈ ±10 pp
// pe oră; media pe cele 24 de ore e mai strânsă (±4 pp). Fraza veche („trei din patru”) pică la 00:05 UTC: 43 % pe tot depozitul.
const TOL_ORA = 0.10, TOL_MEDIE = 0.04;
await test("2a. banda pe adevăr: pe fiecare oră UTC, cât de des stă restul zilei în „Grid azi” = frecvența din frază (zile nevăzute, 8 monede)", () => {
  assert.equal(FX.monede.length, 8); assert.ok(zileFx >= 500, "zile-monedă în fixture: " + zileFx);
  const rand = masurat.map((x, h) => ({ h, n: x.n, mas: x.in / x.n, spus: spus[h] }));
  console.log("       ora UTC: măsurat / spus  " + rand.map((r) => r.h + ":" + Math.round(r.mas * 100) + "/" + (isFinite(r.spus) ? Math.round(r.spus * 100) : "?")).join(" "));
  for (const r of rand) { assert.ok(isFinite(r.spus), "ora " + r.h + ": fraza nu spune o frecvență"); assert.ok(r.n >= 400, "ora " + r.h + ": " + r.n + " rânduri"); }
  const rele = rand.filter((r) => Math.abs(r.mas - r.spus) > TOL_ORA);
  assert.equal(rele.length, 0, "ore cu fraza departe de adevăr: " + rele.map((r) => r.h + ":00 măsurat " + Math.round(r.mas * 100) + " %, spus " + Math.round(r.spus * 100) + " %").join("; "));
  const mm = rand.reduce((s, r) => s + r.mas, 0) / 24, ms = rand.reduce((s, r) => s + r.spus, 0) / 24;
  assert.ok(Math.abs(mm - ms) <= TOL_MEDIE, "media pe ore: măsurat " + (mm * 100).toFixed(1) + " %, spus " + (ms * 100).toFixed(1) + " %");
});

await test("2b. pasul = lățimea / 10 ⇒ „cinci grile pe parte” (nu „zece”); stopul niciodată în interiorul benzii; textul spune „restul zilei”", () => {
  assert.equal(pasuri, 0, "pasul ≠ lățimea / 10 în " + pasuri + " rânduri"); assert.equal(stopInauntru, 0, "stopul în interiorul benzii în " + stopInauntru + " din " + randuri + " rânduri");
  const d = TZ.azi(bare(r12, 7, 100), T0 + 12 * ZI + 7 * ORA + 300000), h = ctx.tzCartela({ simbol: "DOGE", pionex: "DOGE_USDT_PERP", fel: "piata", d });
  assert.match(h, /pas ~\d+,\d\d % la cinci grile pe parte/); assert.doesNotMatch(h, /zece grile/); assert.match(h, /cuprinde restul zilei UTC în \d+ % din zile/);
  assert.doesNotMatch(h, /\d\.\d+ %/);
  const g = TZ.grid(d); assert.ok(g.jos < d.pret && g.sus > d.pret && Math.abs(g.sus - d.pret - (d.pret - g.jos)) < 1e-9, "banda e centrată pe prețul de acum");
});

// ---------------------------------------------------------------- 3. prețurile
await test("3a. prețurile pe cifre semnificative: PEPE 0,00000530, banda lui are capete diferite; BTC 104.523,46; 0,5432; 0,0123", () => {
  assert.equal(ctx.tzPret(0.0000053), "0,00000530"); assert.equal(ctx.tzPret(104523.456), "104.523,46"); assert.equal(ctx.tzPret(0.5432), "0,5432"); assert.equal(ctx.tzPret(0.012345), "0,0123");
  assert.equal(ctx.tzPret(0.0012345), "0,00123"); assert.notEqual(ctx.tzPret(0.0000053 * 0.97), ctx.tzPret(0.0000053 * 1.03));
  const B = bare(r12, 7, 100).map((x) => ({ t: x.t, o: x.o * 5.3e-8, h: x.h * 5.3e-8, l: x.l * 5.3e-8, c: x.c * 5.3e-8 }));
  const d = TZ.azi(B, T0 + 12 * ZI + 7 * ORA + 300000), h = ctx.tzCartela({ simbol: "PEPE", pionex: "PEPE_USDT_PERP", fel: "piata", d });
  const m = h.match(/<span class="tzMut tzMic">([\d.,]+) – ([\d.,]+) · pas/); assert.ok(m, "banda lipsește din cartelă"); assert.notEqual(m[1], m[2], "PEPE: " + m[0]);
  assert.doesNotMatch(h, /0,000005 – 0,000005/);
});

await test("3b. Discord: prețurile pe cifre semnificative (PEPE: maximul și minimul de ieri diferite); „>ieri deja” când ziua a trecut de ieri; ≤ 160", () => {
  const B = bare(r12, 7, 100).map((x) => ({ t: x.t, o: x.o * 5.3e-8, h: x.h * 5.3e-8, l: x.l * 5.3e-8, c: x.c * 5.3e-8 }));
  const dP = TZ.azi(B, T0 + 12 * ZI + 7 * ORA + 300000), dD = TZ.azi(bare(r12, 20, 100, 0.06), T0 + 12 * ZI + 20 * ORA + 300000);
  const l = liniiTradeZilei([{ simbol: "PEPE", fel: "piata", d: dP }, { simbol: "DOGE", fel: "bot", d: dD }], TZ);
  assert.ok(l.every((x) => x.length <= 160), l.map((x) => x.length).join(","));
  const mp = l[1].match(/^PEPE ([\d.,]+) · .* · max ([\d.,]+) .* · min ([\d.,]+) /); assert.ok(mp, l[1]);
  assert.equal(mp[1], "0,00000530"); assert.notEqual(mp[2], mp[3], "PEPE: max = min în mesaj: " + l[1]);
  assert.match(l[2], /^🤖 DOGE 100,00 · >ieri deja · azi ~\d+,\d %/); assert.match(l[1], /· >ieri \d+ % ·/);
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
