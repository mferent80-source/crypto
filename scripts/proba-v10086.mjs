// Proba v100.86 (03.10, el: „da” pe designul §2 din specul Busolei - „paza boților”): colectorul anunță O DATĂ când moneda unui
// bot deschis trece în „mai agitată ca de obicei” pe 4h (perp4h ?? grid4h ?? 4h, cheia fără „1000”); tace la rezumat vechi (> 4,5 h),
// la „nemasurat” și la prima vedere a unui bot vechi; un bot NOU pe o monedă deja agitată primește mesajul; un mesaj picat nu mută
// starea (se reîncearcă). „Dovedit” doar din grid.miscareDovedita. Fișa: fraza pentru monedele pe care Busola nu le măsoară.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as MC from "./lib/mesaje-colector.mjs";
import { situatii, verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const B = new Function(`${lib("busola.js")}; return Busola;`)();
const A = new Function(`${lib("alerte.js")}; return Alerte;`)();
const P = await import("./lib/paza-boti.mjs").catch((e) => ({ lipsa: e.message }));
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.86 · paza boților (Busola §2): starea pe 4h, trecerea în „mai agitată”, tăcerile, mesajul, fișa, colectorul");

const ORA = 3600000, ACUM = Date.UTC(2026, 9, 3, 10, 0);
const REZ = (o) => Object.assign({ la: ACUM - 2 * ORA, versiune: "1.36.0",
  monede: { CRV: { grid4h: "miscare", perp4h: "liniste" }, JTO: { perp4h: "miscare" }, LIT: { perp4h: "nemasurat", grid4h: "liniste" }, NEAR: { "4h": "miscare" },
    SOL: { perp4h: "nemasurat", grid4h: "nemasurat", "4h": "nemasurat" }, PEPE: { perp4h: "miscare" }, ETH: { grid4h: "nu-stiu" } },
  grid: { interval: "4h", canal: "±2×ATR", liniste: -0.00074962531, oricand: -0.0014935975, miscare: -0.0021398053, dovedit: true, miscareDovedita: true },
  perp: { la: ACUM - 2 * ORA, monede: 209, prag: 200000, sursa: "Pionex PERP 4h", bareMediane: 1980 } }, o || {});
const bot = (o) => Object.assign({ id: "b1", baza: "CRV.PERP", directie: "long", levier: 5, gridJos: 0.3841, gridSus: 0.4331, pornitLa: ACUM - 5 * ORA }, o || {});
const lipsa = () => assert.ok(!P.lipsa, "lipsește scripts/lib/paza-boti.mjs: " + P.lipsa);

// ---- busola.js: starea de pază ----
await test("(1) starea pe 4h: perp4h întâi, apoi grid4h, apoi 4h; „nemasurat” se sare; cheia fără „1000” și fără „.PERP”; moneda lipsă ⇒ null", () => {
  assert.equal(typeof B.pazaStare, "function", "lipsește Busola.pazaStare");
  const s = (sim) => B.pazaStare(REZ(), sim, ACUM).stare;
  assert.equal(s("CRV"), "liniste", "perp4h bate grid4h"); assert.equal(s("JTO_USDT_PERP"), "miscare"); assert.equal(s("LIT"), "liniste", "perp4h nemăsurat ⇒ grid4h");
  assert.equal(s("NEAR"), "miscare", "doar harta (4h)"); assert.equal(s("ETH"), "nu-stiu"); assert.equal(s("SOL"), null, "nemăsurat peste tot"); assert.equal(s("DOGE"), null, "lipsă");
  assert.equal(s("1000PEPE"), "miscare", "1000PEPE ⇒ PEPE"); assert.equal(B.pazaStare(REZ(), "1000PEPE_USDT_PERP", ACUM).cheie, "PEPE");
  assert.equal(B.pazaStare(null, "CRV", ACUM), null); assert.equal(B.pazaStare({ monede: {} }, "CRV", ACUM), null, "fără grid ⇒ ca fișa, nimic");
});
await test("(1) rezumatul vechi: până la 4,5 h e proaspăt, peste e vechi; fără `la` ⇒ vechi (nicio alertă pe date fără vârstă)", () => {
  const v = (la) => B.pazaStare(REZ({ la }), "CRV", ACUM).vechi;
  assert.equal(v(ACUM - 4.5 * ORA), false); assert.equal(v(ACUM - 4.5 * ORA - 1), true); assert.equal(v(ACUM - 10 * 60000), false); assert.equal(v(undefined), true);
});
await test("(2) cifra din mesaj: „−0,214% pe episod, grid pe ±2×ATR, dovedit” - „dovedit” DOAR din grid.miscareDovedita (true / false / lipsă); fără cifră sau canal ⇒ se lasă afară", () => {
  assert.equal(typeof B.cifraMiscare, "function", "lipsește Busola.cifraMiscare");
  assert.equal(B.cifraMiscare(REZ()), "−0,214% pe episod, grid pe ±2×ATR, dovedit");
  assert.equal(B.cifraMiscare(REZ({ grid: { ...REZ().grid, miscareDovedita: false } })), "−0,214% pe episod, grid pe ±2×ATR, nedovedit");
  const g = { ...REZ().grid }; delete g.miscareDovedita; assert.equal(B.cifraMiscare(REZ({ grid: g })), "−0,214% pe episod, grid pe ±2×ATR", "câmpul lipsă (rezumat vechi) ⇒ nimic despre dovadă, nici din grid.dovedit (privește liniștea)");
  assert.equal(B.cifraMiscare(REZ({ grid: { miscare: "x", miscareDovedita: true } })), "dovedit"); assert.equal(B.cifraMiscare(REZ({ grid: {} })), "");
});
await test("(3) fișa: moneda pe care Busola n-o are ⇒ cu blocul `perp`: „Busola nu măsoară X: pe futures urmărește doar monedele cu peste 200.000 USDT pe zi.”; fără bloc ⇒ fraza de până acum", () => {
  assert.equal(B.randGrid(REZ(), "DOGE_USDT_PERP", ACUM).text, "Busola nu măsoară DOGE: pe futures urmărește doar monedele cu peste 200.000 USDT pe zi.");
  assert.equal(B.randGrid(REZ({ perp: { prag: 1500000 } }), "DOGE", ACUM).text, "Busola nu măsoară DOGE: pe futures urmărește doar monedele cu peste 1.500.000 USDT pe zi.");
  const fara = REZ(); delete fara.perp; assert.equal(B.randGrid(fara, "DOGE", ACUM).text, "Busola n-a măsurat DOGE: urmărește topul spot Pionex, nu futures.");
  assert.equal(B.randGrid(REZ(), "DOGE", ACUM).nivel, "nemasurat");
  assert.match(B.randGrid(REZ(), "SOL", ACUM).text, /^Busola n-a putut măsura SOL pe 4h acum/, "măsurată, dar fără verdict ⇒ fraza neschimbată");
});

// ---- mesajul ----
await test("(4) mesajul: titlul cu moneda, direcția, levierul; rândul 1 faptul cu cifra Busolei; rândul 2 „👉 Aș …” cu intervalul botului (prețurile cu zecimalele Pionex)", () => {
  assert.equal(typeof MC.busolaMiscare, "function", "lipsește MesajeColector.busolaMiscare"); assert.equal(typeof A.pret, "function", "Alerte.pret nu e exportat");
  const m = MC.busolaMiscare({ nume: "CRV", directie: "long", levier: 5, interval: A.pret(0.3841) + " – " + A.pret(0.4331), cifra: "−0,214% pe episod, grid pe ±2×ATR, dovedit" });
  assert.equal(m.nivel, "atentie"); assert.equal(m.cheie, "busola-miscare");
  assert.equal(m.titlu, "CRV long 5× · Busola: mai agitată ca de obicei");
  assert.equal(m.mesaj, "Pe 4h, CRV e mai agitată ca de obicei: după asta, gridurile măsurate de Busola au pierdut cel mai mult (−0,214% pe episod, grid pe ±2×ATR, dovedit).\n👉 Aș verifica stopul botului (gridul 0.38410 – 0.43310) și n-aș adăuga bani cât ține.");
  const n = MC.busolaMiscare({ nume: "LIGHTER", directie: "no_trend", levier: null, interval: null, cifra: "", nou: true });
  assert.equal(n.titlu, "LIGHTER neutru · Busola: bot nou pe monedă agitată");
  assert.equal(n.mesaj, "Pe 4h, LIGHTER e mai agitată ca de obicei: după asta, gridurile măsurate de Busola au pierdut cel mai mult.\n👉 Aș verifica stopul botului și n-aș adăuga bani cât ține.");
  assert.equal(MC.busolaMiscare({ nume: "PUMP", directie: "short", levier: 3, interval: "x", cifra: "y" }).titlu, "PUMP short 3× · Busola: mai agitată ca de obicei");
});

// ---- trecerile ----
const decide = (inainte, o) => P.pazaBot(Object.assign({ Busola: B, rez: REZ(), bot: bot(), inainte, acum: ACUM, pret: A.pret }, o || {}));
await test("(5) trecerea în „mai agitată”: din liniște / nimic neobișnuit / nemăsurat ⇒ UN mesaj; rămâne agitată ⇒ nimic; iese ⇒ nimic, dar starea se ține", () => {
  lipsa();
  const agit = { rez: REZ({ monede: { CRV: { perp4h: "miscare" } } }) }, linis = { rez: REZ({ monede: { CRV: { perp4h: "liniste" } } }) };
  for (const prev of ["liniste", "nu-stiu", null]) {
    const d = decide({ stare: prev, la: 1 }, agit);
    assert.ok(d.mesaj, "din „" + prev + "” ⇒ mesaj"); assert.equal(d.tine, true); assert.deepEqual(d.stare, { stare: "miscare", la: ACUM - 2 * ORA, de: ACUM - 2 * ORA });   /* v100.90: + de */
    assert.equal(d.mesaj.titlu, "CRV long 5× · Busola: mai agitată ca de obicei"); assert.match(d.mesaj.mesaj, /\(gridul 0\.38410 – 0\.43310\)/); assert.match(d.mesaj.mesaj, /\(−0,214% pe episod, grid pe ±2×ATR, dovedit\)/);
  }
  const r = decide({ stare: "miscare", la: 1 }, agit); assert.equal(r.mesaj, null, "rămâne agitată ⇒ nerepetat"); assert.equal(r.tine, true);
  const i = decide({ stare: "miscare", la: 1 }, linis); assert.equal(i.mesaj, null); assert.deepEqual(i.stare, { stare: "liniste", la: ACUM - 2 * ORA, de: ACUM - 2 * ORA }, "iese ⇒ starea nouă, ca reintrarea să sune");
  const n = decide({ stare: "liniste", la: 1 }, { rez: REZ({ monede: { CRV: { perp4h: "nemasurat" } } }) }); assert.equal(n.mesaj, null, "nemăsurat ⇒ nicio alertă"); assert.equal(n.stare.stare, null);
});
await test("(5) prima vedere: botul vechi (după o repornire) ⇒ doar ține minte; botul NOU (sub 30 min) pe o monedă deja agitată ⇒ mesajul „bot nou”; botul nou pe liniște ⇒ nimic", () => {
  lipsa();
  const agit = { rez: REZ({ monede: { CRV: { perp4h: "miscare" } } }) };
  const v = decide(undefined, agit); assert.equal(v.mesaj, null); assert.equal(v.tine, true); assert.equal(v.stare.stare, "miscare");
  const n = decide(undefined, { ...agit, bot: bot({ pornitLa: ACUM - 10 * 60000 }) }); assert.ok(n.mesaj); assert.equal(n.mesaj.titlu, "CRV long 5× · Busola: bot nou pe monedă agitată");
  assert.equal(decide(undefined, { ...agit, bot: bot({ pornitLa: ACUM - 31 * 60000 }) }).mesaj, null, "peste 30 min ⇒ bot vechi");
  assert.equal(decide(undefined, { bot: bot({ pornitLa: ACUM - 10 * 60000 }) }).mesaj, null, "CRV e pe liniște (perp4h) ⇒ nimic");
});
await test("(5) tăcerile: rezumat vechi (> 4,5 h) sau lipsă ⇒ nimic ȘI starea neatinsă (o trecere nu se pierde, nu se dublează); cheia „1000PEPE” ⇒ PEPE", () => {
  lipsa();
  const vechi = decide({ stare: "liniste", la: 1 }, { rez: REZ({ la: ACUM - 5 * ORA, monede: { CRV: { perp4h: "miscare" } } }) });
  assert.equal(vechi.mesaj, null); assert.equal(vechi.tine, false);
  const fara = decide({ stare: "liniste", la: 1 }, { rez: null }); assert.equal(fara.mesaj, null); assert.equal(fara.tine, false);
  const pepe = decide({ stare: "liniste", la: 1 }, { bot: bot({ baza: "1000PEPE.PERP", directie: "short", levier: 3, gridJos: 0.0000081, gridSus: 0.0000102 }) });
  assert.ok(pepe.mesaj); assert.equal(pepe.mesaj.titlu, "1000PEPE short 3× · Busola: mai agitată ca de obicei"); assert.match(pepe.mesaj.mesaj, /\(gridul 0\.0000081000 – 0\.000010200\)/);
});
await test("(6) pasul colectorului: mesajul picat ⇒ starea NU avansează (tura următoare reîncearcă); plecat ⇒ starea ținută; fără mesaj ⇒ ținută fără să trimită", async () => {
  lipsa();
  const st = { _busola: { stare: "liniste", la: 1 } }, trimise = [], agit = REZ({ monede: { CRV: { perp4h: "miscare" } } });
  const pas = (trimite, rez) => P.pazaPas({ Busola: B, rez: rez || agit, bot: bot(), st, acum: ACUM, pret: A.pret, trimite: async (m) => { trimise.push(m.titlu); return trimite; } });
  await pas(false); assert.deepEqual(st._busola, { stare: "liniste", la: 1 }, "n-a plecat ⇒ neatinsă"); assert.equal(trimise.length, 1);
  await pas(true); assert.deepEqual(st._busola, { stare: "miscare", la: ACUM - 2 * ORA, de: ACUM - 2 * ORA }); assert.equal(trimise.length, 2);
  await pas(true); assert.equal(trimise.length, 2, "rămâne agitată ⇒ nu mai trimite");
  await pas(true, REZ({ monede: { CRV: { perp4h: "liniste" } } })); assert.equal(st._busola.stare, "liniste"); assert.equal(trimise.length, 2);
});
await test("(7) nota de rezumat vechi: o dată pe rezumat, doar în Radar; proaspăt / lipsă / deja anunțat ⇒ nimic", () => {
  lipsa();
  const n = P.notaVeche({ Busola: B, rez: REZ({ la: ACUM - 6 * ORA }), acum: ACUM, anuntat: null });
  assert.ok(n); assert.equal(n.doarRadar, true); assert.equal(n.la, ACUM - 6 * ORA); assert.equal(n.cheie, "busola-veche"); assert.equal(n.nivel, "info");
  assert.equal(n.titlu, "Busola: rezumatul are 6 ore"); assert.equal(n.mesaj, "Paza boților tace până vine un rezumat nou: pe date vechi nu anunț mișcarea.");
  assert.equal(P.notaVeche({ Busola: B, rez: REZ({ la: ACUM - 25 * ORA }), acum: ACUM, anuntat: null }).titlu, "Busola: rezumatul are 25 de ore");
  assert.equal(P.notaVeche({ Busola: B, rez: REZ({ la: ACUM - 6 * ORA }), acum: ACUM, anuntat: ACUM - 6 * ORA }), null, "deja anunțat pentru rezumatul ăsta");
  assert.equal(P.notaVeche({ Busola: B, rez: REZ(), acum: ACUM, anuntat: null }), null); assert.equal(P.notaVeche({ Busola: B, rez: null, acum: ACUM, anuntat: null }), null);
});

// ---- garda + colectorul ----
await test("(8) garda: mesajele pazei (agitată, bot nou, short, prețuri mici, fără levier, nedovedit, fără cifră, nota) sunt în grupul STRICT „alerte” și n-au abateri", () => {
  const s = situatii().filter((x) => /^colector\.busola/.test(x.sursa)); assert.ok(s.length >= 14, "situații: " + s.length);
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.x.sit + ": " + q.ab.join("; ") + " ⇐ " + q.x.text).join("\n"));
  assert.ok(s.every((x) => x.mod === "alerte"));
});
await test("(9) colectorul: încarcă busola.js (proba de încărcare), aduce rezumatul o dată pe tură înaintea boților, păzește fiecare bot DUPĂ starea nouă a alertelor", () => {
  // 06.10 (v100.117): CRLF ⇒ LF - un checkout curat (autocrlf) dă „{\r\n” și căutarea „{\n” de mai jos pica (copia de lucru de acasă e LF)
  const c = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8").replace(/\r\n/g, "\n");
  assert.ok(/^const Busola = incarca\("busola\.js", "Busola"\);/m.test(c), "colectorul nu încarcă busola.js"); assert.ok(/import \{ pazaPas, notaVeche, pentruServer(, cheiaBot)? \} from "\.\/lib\/paza-boti\.mjs";/.test(c), "colectorul nu importă paza-boti.mjs");   /* v101.60: + pentruServer; v101.62: + cheiaBot */
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "colector.mjs")], { env: { ...process.env, COLECTOR_DOAR_INCARCA: "1" }, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, (r.stderr || "").slice(0, 400)); assert.match(r.stdout, /INCARCAT true/); assert.ok(/Retea, Busola\]\.every\(Boolean\)/.test(c), "Busola lipsește din proba de încărcare (INCARCAT)");
  const t = c.slice(c.indexOf("async function tura() {"), c.indexOf("\n// v79 F3"));
  const inc = t.indexOf("await Busola.incarca(fetch, acum);"), loop = t.indexOf("  for (const b of boti) {\n"), stare = t.indexOf("stareAlerte[b.id] = r.stare;"), paz = t.indexOf("await pazaPas({ Busola, rez: Busola.rezumat(), bot: b, st: stareAlerte[b.id], acum, pret: Alerte.pret, trimite: (m) => trimiteAlerta(m, b.id, m.cheie), monede: meta().busolaMonede || (meta().busolaMonede = {}),");   /* v101.60: + harta „de” pe monedă; v101.92: + vocile (apelul continuă pe rândul următor) */
  assert.ok(inc > 0 && loop > inc, "rezumatul se aduce înaintea buclei boților"); assert.ok(paz > stare && stare > loop, "paza după `stareAlerte[b.id] = r.stare` (altfel _busola s-ar scrie pe obiectul vechi)");
  assert.ok(/if \(n && \(await trimiteAlerta\(n, null, n\.cheie\)\)\) meta\(\)\.busolaVeche = n\.la;/.test(t), "nota se ține minte doar după ce a plecat");
});

console.log("\n" + (pica ? "V100.86 PICA · " + pica + " din " + (ok + pica) : "V100.86 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
