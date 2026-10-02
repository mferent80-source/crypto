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

// ---- sarcina 2: sfaturi.js ----
await test("„margine”: titlul cu cifra întâi și virgulă; textul = o frază (ce ar fi la margine + cât de des coboară atât); sursa separat; niciun sfat cu „deCe”", () => {
  const l = sfaturi(CRV()), m = cod(l, "margine");
  assert.match(m.titlu, /^\d+,\d% până la marginea de jos \(0\.3841\)$/);
  assert.match(m.text, /^~\d+ CRV la margine \(acum \d+\), total ~[−+]?\d+,\d\d USDT; coboară atât în \d+% din zile \(\d+ din \d+(, puține cazuri)?\)/);
  assert.ok(m.text.length <= 160 && !/[.?]\s+[A-ZĂÂÎȘȚ]/.test(m.text), m.text);
  assert.match(m.sursa, /lumânările de 4 ore/);
  assert.ok(l.every((s) => !("deCe" in s)), "sfaturi cu „deCe”: " + l.filter((s) => "deCe" in s).map((s) => s.cod));
});
await test("o singură voce: acțiunea sfatului „pericol” (lichidarea) e a semaforului, sub 8% și între 8% și 15%; la trend contra la fel", () => {
  for (const d of [5, 12]) {
    const b = CRV({ distantaLichidarePct: d }), p = sfaturi(b).find((s) => s.cod === "pericol" && s.tip === "lich");
    assert.equal(p.faCe, S.semafor({ bot: b, fisa: FISA() }).componente.find((c) => c.cod === "lichidare").faCe, "la " + d + "%");
  }
  const motive = ["4h: EMA20 sub EMA50, EMA50 coboară", "1z: EMA20 sub EMA50, EMA50 coboară", "structura 4h: maxime și minime tot mai jos"], f = FISA({ directie: { dir: "short", tarie: "tare", motive } });
  const t = cod(sfaturi(CRV(), { fisa: f }), "trend");
  assert.equal(t.text, motive.join(" · ") + ".");
  assert.equal(t.faCe, S.semafor({ bot: CRV(), fisa: f }).componente.find((c) => c.cod === "trend").faCe);
  assert.equal(cod(sfaturi(CRV()), "trend").text, "", "fără motive, textul nu e un „.” singur");
});
await test("zero-ul botului: take-profit la persoana I, sub 110 caractere; long pe minus „deasupra prețului”, short „sub preț”", () => {
  const z = cod(sfaturi(CRV(), { peste: { zero: { pretZero: 0.4012, distantaZeroPct: 0.0399, iei: 46.4 } } }), "zero");
  assert.equal(z.titlu, "Botul iese pe zero la 0.4012 (+4,0% de aici)");
  assert.equal(z.text, "Închis acum, ai lua 46,40 USDT din 49,67 investiți.");
  assert.equal(z.faCe, "Aș pune take-profit-ul botului la 0.4012 ca să ies fără pierdere (nu stop: zero-ul e deasupra prețului).");
  const s = cod(sfaturi(CRV({ directie: "short" }), { peste: { zero: { pretZero: 0.37, distantaZeroPct: -0.04, iei: 46 } } }), "zero");
  assert.match(s.faCe, /\(nu stop: zero-ul e sub preț\)\.$/);
});
await test("funding-ul: titlul spune cât și cine plătește, cu virgulă; „până acum” la vedere; sursa Binance separat", () => {
  const p = cod(sfaturi(CRV({ finantare: -0.04 }), { funding: 0.0008 }), "funding"), i = cod(sfaturi(CRV({ finantare: null }), { funding: -0.0002 }), "funding");
  assert.equal(p.titlu, "Funding-ul: 0,080% la 8 ore, îl plătești"); assert.equal(i.titlu, "Funding-ul: −0,020% la 8 ore, îl încasezi");
  assert.equal(p.text, "Până acum botul a plătit 0,04 USDT; la rata asta plătești din câștigul grilelor.");
  assert.equal(i.text, "La rata asta încasezi peste câștigul grilelor.");
  assert.match(p.sursa, /Binance/); assert.equal(p.faCe, "N-aș ține botul mult pe direcția asta cu funding-ul atât de mare.");
});
await test("ritmul, costurile, setarea, mișcarea: cifrele cu virgulă; titlul ≤ 60 chiar la 10× obișnuitul", () => {
  const r = cod(sfaturi(CRV(), { peste: { ritm: { grile24h: 0.1, medieZi: 1.2, tranz24h: 2, tranzMedieZi: 14, zile: 4 } } }), "ritm");
  assert.equal(r.titlu, "Ritmul a scăzut: grilele 0,10 USDT în 24 h, media 1,20/zi");
  assert.equal(r.text, "2 tranzacții în 24 h față de 14 pe zi: de obicei prețul a ieșit din zona perechilor sau piața a înghețat.");
  const c = cod(sfaturi(CRV(), { peste: { costuri: { netZi: -0.004, grile24h: 0.01, comisionZi: 0.004, fundingZi: 0.01, fundingMananca: false } } }), "costuri");
  assert.equal(c.titlu, "Costurile mănâncă grilele: −0,004 USDT pe zi, net");
  const s = cod(sfaturi(CRV({ levier: 8 }), { peste: { geom: { netPct: 0.0012, preaDese: true, grile: 93, mod: "aritmetic" } } }), "setare");
  assert.equal(s.titlu, "Setarea botului: grile prea dese și levier prea mare");
  assert.equal(s.text, "Grilele (93, aritmetice) lasă 0,12% pe umplere după comision; levierul 8× e peste cel sigur azi (4×).");
  const m = cod(sfaturi(CRV(), { fisa: FISA({ regim: { r4h: 10.4, r24h: 10.2, miscare: true, sens: "coboara" }, liniste: { linisteAcum: false } }) }), "miscare");
  assert.equal(m.titlu, "Mișcare contra botului: 10,4× obișnuitul (4 h), 10,2× (24 h)"); assert.ok(m.titlu.length <= 60, m.titlu.length);
});
await test("direcția (directie.js): o frază, fără „ÎMPOTRIVA”, virgulă în nota barei de 4 ore; sfatul are concluzia în titlu și dovezile în text", () => {
  const D = globalThis.Directie, R = (d4, d1, formare) => [{ tf: "4H", eticheta: "4 ore", dir: d4, fata: { ton: d4 === "coboara" ? "rau" : "bine" }, formare: formare || null }, { tf: "1D", eticheta: "1 zi", dir: d1, fata: { ton: d1 === "coboara" ? "rau" : "bine" } }];
  const rau = D.rezumat(R("coboara", "coboara"), "long");
  assert.equal(rau.text, "Piața merge împotriva botului (4 ore coboară, 1 zi coboară)."); assert.equal(rau.dovezi, "4 ore coboară, 1 zi coboară.");
  assert.equal(D.rezumat(R("urca", "coboara"), "long").text, "Semnale amestecate (4 ore urcă, 1 zi coboară): o parte merge împotriva botului.");
  const f = D.rezumat(R("urca", "urca", { pct: -2.4 }), "long");
  assert.equal(f.text, "Piața merge cu botul (4 ore urcă, 1 zi urcă); dar în bara de 4 ore de acum prețul scade cu 2,4%."); assert.equal(f.ton, "atentie");
  const s = cod(sfaturi(CRV(), { rezumat: rau }), "directie");
  assert.equal(s.titlu, "Piața merge împotriva botului"); assert.equal(s.text, "4 ore coboară, 1 zi coboară."); assert.equal(s.faCe, "N-aș adăuga bani până nu se întoarce pe 4 h.");
});
await test("liniștea: câte cazuri și cât la sută, la vedere; intervalul de încredere în sursă", () => {
  const l = cod(sfaturi(CRV()), "liniste");
  assert.equal(l.text, "Pe moneda asta, liniștea care a ajuns aici a mai ținut 2 zile în 23% din cazuri (3 din 13).");
  assert.equal(l.sursa, "Ultimele 30 de zile; interval de încredere 8%–50%.");
});
await test("M7 (revizia pachetului 1): când primul motiv al Consilierului vine din sfaturi.js, titlul lui rămâne ≤ 60", () => {
  const b = CRV({ pretCurent: 0.41, finantare: -0.04 });
  const l = sfaturi(b, { funding: 0.0008, peste: { ritm: { grile24h: 0.1, medieZi: 1.2, tranz24h: 2, tranzMedieZi: 14, zile: 4 } } });
  const c = C.alcatuieste({ sm: S.semafor({ bot: b, fisa: FISA() }), concret: [], sfaturi: l });
  assert.ok(["ritm", "funding"].includes(c.motive[0] && c.motive[0].cod), "primul motiv: " + c.motive.map((x) => x.cod).join(","));
  assert.ok(c.titlu.length <= 60, c.titlu.length + ": " + c.titlu);
});
// probele care incarca un modul cu TextRo fara sa-l incarce pe el crapa la primul text (ReferenceError) - lista lor, pe tot dosarul
const faraTextRo = (re) => fs.readdirSync(path.join(RAD, "scripts")).filter((f) => f.endsWith(".mjs") && f !== "colector.mjs" && f !== "garda-texte.mjs")
  .filter((f) => { const s = citeste("scripts", f); return re.test(s) && !s.includes('import "./lib/text-ro-global.mjs";'); });
await test("fiecare probă care încarcă sfaturi.js încarcă întâi TextRo (altfel crapă la primul sfat)", () => {
  assert.deepEqual(faraTextRo(/sfaturi\.js/), [], "probe fără TextRo");
});
await test("cardul ascuns al sfaturilor (app.js) arată sursa, nu „deCe”; garda e strictă pe „sfaturi”", async () => {
  assert.ok(citeste("public", "app.js").includes(`(s.sursa?'<p class="tbSub">'+escapeHtml(s.sursa)+'</p>':'')`));
  assert.ok((await modul("scripts", "garda-texte.mjs")).STRICT.has("sfaturi"));
});

console.log(`\nV100.62 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
