// Probele auditului sever din 23.10.2026, felia LOGICA DE TRADING (public/lib: semnale, alerte, Monte Carlo, fișa, statistici, texte).
// Fiecare punct al listei are aici testul care pica înainte de reparație. Cifrele sunt construite (depozit public).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul;
globalThis.GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
const GP = globalThis.GridProba;
globalThis.MonteSimbol = new Function(`${lib("monte-simbol.js")}; return MonteSimbol;`)();
const M = globalThis.MonteSimbol;
globalThis.GridSim = new Function(`${lib("grid-sim.js")}; return GridSim;`)();
const GS = globalThis.GridSim;
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
globalThis.TabloExtra = TE;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
globalThis.SemnaleBot = SB;
const A = new Function(`${lib("alerte.js")}; return Alerte;`)();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); }); }
console.log("\naudit 23.10 · logica de trading · proba\n");

// ---------- (1) stopul „la zero” pe un bot pe PLUS cade în grid ----------
// long 3×, grid 90–110 aritmetic, 21 de linii (20 de intervale); prețul a urcat la 106, botul e pe plus (+7)
const BOT1 = (o) => ({ id: "X", baza: "XYZ.PERP", directie: "long", activ: true, investit: 100, levier: 3, pretCurent: 106, pretDeschidere: 101,
  pozitie: 0.6, profitNet: 4, profitTotal: 7, gridJos: 90, gridSus: 110, pnlNerealizatSigur: true, pornitLa: Date.now() - 3 * 86400000,
  brut: { buOrderData: { row: 21, gridType: "arithmetic", perVolume: "0.15" } }, ...o });
const cartela = (b) => SB.acumConcret({ bot: b, fisa: null, zero: TE.dacaInchizi(b), costuri: null, plan: null, acum: Date.now() }).find((x) => x.cod === "stop");
await test("(1) zero-ul pe plus cade în grid ⇒ cartela spune câte grile mor și nu-l mai dă ca reparație simplă", () => {
  const z = TE.dacaInchizi(BOT1());
  assert.ok(z.pretZero > 90 && z.pretZero < 110, "premisa: zero-ul e în grid (" + z.pretZero + ")");
  const c = cartela(BOT1());
  const tot = [c.act, c.deCe, c.text].join(" | ");
  assert.match(tot, /10 din 20 de grile/, tot);
  assert.match(c.deCe, /cade în grid/);
  assert.equal(c.tag.t, "zero în grid");
  assert.equal(c.tag.c, "warn");
  assert.match(c.act, /^Aș /);
  assert.ok(c.act.length <= 110 && c.deCe.length <= 160, c.act.length + " / " + c.deCe.length);
  assert.match(c.deCe, /sub gridul de jos \(90\)[^]*totalul e ≈ [−+]\d/, "alternativa: dincolo de margine, cu banii de acolo");
});
await test("(1) zero-ul pe plus SUB grid (dincolo de margine) ⇒ rămâne propunerea de azi, fără grile moarte", () => {
  // poziție mică, profit mare: zero-ul coboară sub 90
  const b = BOT1({ pozitie: 0.05, profitNet: 30, profitTotal: 30.8, pretCurent: 106 });
  const z = TE.dacaInchizi(b);
  if (!(z.pretZero < 90)) throw new Error("premisa: zero sub grid (" + z.pretZero + ")");
  const c = cartela(b);
  assert.match(c.tag.t, /la zero/);
  assert.doesNotMatch([c.act, c.deCe].join(" "), /din 20 de grile/);
});
await test("(1) „mișcarea e cu botul” (pasiCuBotul) spune și ea grilele tăiate de stopul la zero", () => {
  const b = BOT1(), z = TE.dacaInchizi(b);
  const pc = SB.pasiCuBotul(b, "long", z);
  assert.match(pc.faCe, /zero-ul botului \([\d.]+\), știind că taie 10 din 20 de grile\./);
  assert.ok(pc.faCe.length <= 110, pc.faCe);
});
await test("(1) ținta devine podea: podeaua din grid ⇒ semaforul și alerta spun grilele tăiate", () => {
  const b = BOT1();
  const plan = { atins: ["plus"], plus: { prag: 5, podea: 104, opritorPastreaza: null, urca: null } };
  const s = SB.semafor({ bot: b, fisa: { regim: { r4h: 1, r24h: 1, miscare: false } }, plan });
  assert.equal(s.cod, "podea");
  assert.match(s.deCe, /^Cade în grid, sub el 14 din 20 de grile nu lucrează; /, s.deCe);
  assert.ok(s.deCe.length <= 160, s.deCe.length);
  const al = A.reguli(b, { plan }, {}).plan;
  assert.match(al.mesaj, /👉 Aș muta stopul din Pionex la 104\.00: câștigul rămâne, dar sub el 14 din 20 de grile nu lucrează\./, al.mesaj);
});
await test("(1) „poți urca stopul” (perna de 1,5%) spune grilele tăiate", () => {
  const b = BOT1();
  const plan = { atins: ["plus"], plus: { prag: 2, urca: { pret: 104.41, pastrezi: 6, perna: 0.015, opritor: null, opritorPastreaza: null } } };
  const r = A.podeaUrca(b, plan, { regim: null }, null);
  assert.equal(r.mesaje.length, 1);
  assert.match(r.mesaje[0].mesaj, /👉 Aș muta stopul în Pionex la 104\.41; sub el 14 din 20 de grile nu mai lucrează\./, r.mesaje[0].mesaj);
});

// ---------- (2) „botul a ajuns pe zero” doar la traversare ----------
const BOT2 = (p) => ({ id: "Z", baza: "ZZ.PERP", directie: "long", activ: true, investit: 100, levier: 3, pretCurent: p, gridJos: 90, gridSus: 110, pornitLa: Date.now() - 5 * 86400000 });
await test("(2) long pe plus departe de zero (106 față de zero 99,6) ⇒ nicio alertă „a ajuns pe zero”", () => {
  const r = A.reguli(BOT2(106), { pretZero: 99.6 }, {});
  assert.notEqual(r["p-zero"] && r["p-zero"].nivel, "atentie");
});
await test("(2) prețul abia a trecut de zero (+0,3%) ⇒ alerta pleacă; în alertă rămâne până la +1%, apoi tace", () => {
  assert.equal(A.reguli(BOT2(99.9), { pretZero: 99.6 }, {})["p-zero"].nivel, "atentie");
  const fost = { "p-zero": { nivel: "atentie", la: 1 } };
  assert.equal(A.reguli(BOT2(100.4), { pretZero: 99.6 }, fost)["p-zero"].nivel, "atentie", "în banda de ieșire (sub +1%)");
  assert.equal(A.reguli(BOT2(101), { pretZero: 99.6 }, fost)["p-zero"].nivel, "ok", "peste +1% iese");
  assert.equal(A.reguli(BOT2(99.4), { pretZero: 99.6 }, fost)["p-zero"].nivel, "atentie", "histerezisul de jos rămâne (−0,3%)");
});
await test("(2) short: oglinda (zero 100, prețul 99,8 ⇒ alertă; 97 ⇒ nu)", () => {
  const s = (p) => ({ ...BOT2(p), directie: "short" });
  assert.equal(A.reguli(s(99.8), { pretZero: 100 }, {})["p-zero"].nivel, "atentie");
  assert.notEqual(A.reguli(s(97), { pretZero: 100 }, {})["p-zero"].nivel, "atentie");
});

// ---------- (3) stopul în PROCENTE în Monte Carlo: „totalul ≤ r · investiție” pe drum, nu prețul serverului ----------
// bare sintetice de 15M: mers aleator cu mulberry32 (lecția: niciodată LCG)
function bareSint(n, seed, vol = 0.004, drift = 0, p0 = 100) {
  const rnd = M.generator(seed), out = []; let p = p0, t = Date.UTC(2026, 8, 1);
  for (let i = 0; i < n; i++) {
    const z = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const o = p, c = p * Math.exp(drift + vol * z);
    out.push({ t, o, h: Math.max(o, c) * (1 + Math.abs(vol * 0.5 * rnd())), l: Math.min(o, c) * (1 - Math.abs(vol * 0.5 * rnd())), c, v: 1 }); p = c; t += 900000;
  }
  return out;
}
const cadere = (de, la, n) => Array.from({ length: n }, (_, i) => { const o = de + (la - de) * i / n, c = de + (la - de) * (i + 1) / n; return { t: i * 9e5, o, h: o, l: c, c, v: 1 }; });
const ST3 = { dir: "long", jos: 80, sus: 110, grile: 30, levier: 3, tip: "aritmetic" };
await test("(3) GridProba.simuleaza: stopul în procente (−10%) iese când totalul CU grilele de pe drum ajunge la −10%", () => {
  const b = cadere(100, 70, 120);
  const r = GP.simuleaza(b, 0, b.length, { ...ST3, stopRaport: -0.1 });
  assert.equal(r.oprit, true); assert.equal(r.lichidat, false);
  assert.ok(r.net <= -0.099 && r.net >= -0.106, "net " + r.net);
  // prețul serverului (poziția de la pornire, fără grilele de pe drum) ⇒ ieșirea mult mai jos și pierderea peste −10%
  const r0 = GP.simuleaza(b, 0, 1, ST3), q = 3 / 30 * [...Array(30).keys()].filter((k) => 80 + k + 1 > 100).reduce((s, k) => s + 1 / (80 + k), 0);
  const pServer = 100 + (-0.1 - r0.net) / q, rf = GP.simuleaza(b, 0, b.length, { ...ST3, stop: { jos: pServer } });
  assert.ok(rf.net < -0.12, "la prețul serverului totalul e mult sub −10%: " + rf.net + " (preț " + pServer + ")");
});
await test("(3) fără stopRaport, simulatorul dă exact aceleași cifre ca înainte", () => {
  const b = bareSint(96 * 3, 5);
  const a = GP.simuleaza(b, 0, b.length, { ...ST3, stop: { jos: 78, sus: 113 } }), c = GP.simuleaza(b, 0, b.length, { ...ST3, stop: { jos: 78, sus: 113 }, stopRaport: null });
  assert.deepEqual(c, a);
});
const BOT3 = { id: "R", baza: "XYZ.PERP", directie: "long", activ: true, investit: 100, levier: 3, pretCurent: 100, gridJos: 80, gridSus: 110,
  opritorPierdereActiv: true, opritorPierdereTip: "raport", opritorPierdereRaport: -0.1, opritorPierdere: 91, brut: { buOrderData: { row: 31, gridType: "arithmetic" } } };
await test("(3) setariDinBot: stopul în procente ajunge în setări ca raport (prețul serverului rămâne doar de afișat)", () => {
  const d = GS.setariDinBot(BOT3);
  assert.equal(d.st.stopRaport, -0.1);
  assert.deepEqual(d.st.stop, { jos: 91 });
  const pret = GS.setariDinBot({ ...BOT3, opritorPierdereTip: "pret" });
  assert.equal(pret.st.stopRaport, undefined);
});
await test("(3) Simulatorul și Monte Carlo pe drumuri: cu raportul, cel mai rău drum oprit nu trece mult de −10 USDT; cu prețul serverului, da", () => {
  const b = bareSint(96 * 20, 7, 0.006);
  const P0 = b[b.length - 1].c, k = P0 / 100, st = { ...GS.setariDinBot(BOT3).st, jos: 80 * k, sus: 110 * k, suma: 100 };
  // prețul serverului pentru botul pornit acum: poziția de la pornire (grilele 100–110, câte 3/30 din marjă) fără grilele de pe drum
  let Ql = 0; for (let i = 20; i < 30; i++) Ql += 0.1 / ((80 + i) * k);
  st.stop = { jos: P0 + (-0.1 + 0.0005 * Ql * P0) / Ql };
  const cu = GS.simuleaza(b, st, { n: 200, seed: 3, zile: 7, orizonturi: [7] }).orizonturi[0];
  const fara = GS.simuleaza(b, { ...st, stopRaport: undefined }, { n: 200, seed: 3, zile: 7, orizonturi: [7] }).orizonturi[0];
  assert.ok(cu.pStop > fara.pStop, "raportul se atinge mai des decât prețul serverului: " + cu.pStop + " / " + fara.pStop);
  assert.ok(cu.p5 >= -11.5, "coada cu raportul ≈ −10: " + cu.p5);
  const mc = M.grid(b, { ...st }, { n: 200, seed: 3, zile: 7, GridProba: GP });
  const mc0 = M.grid(b, { ...st, stopRaport: undefined }, { n: 200, seed: 3, zile: 7, GridProba: GP });
  assert.ok(mc.pStop > mc0.pStop, "Monte Carlo: " + mc.pStop + " / " + mc0.pStop);
  assert.ok(mc.p5 >= -11.5, "Monte Carlo coada: " + mc.p5);
});

// ---------- (4) un singur prag de lichidări, în motor ----------
await test("(4) GridSim.LICHIDARI_ACCEPTATE = 0 și lichidareAcceptata: orice lichidare pe drumuri ⇒ nu", () => {
  assert.equal(GS.LICHIDARI_ACCEPTATE, 0);
  assert.equal(GS.lichidareAcceptata(0), true);
  assert.equal(GS.lichidareAcceptata(0.01), false);
  assert.equal(GS.lichidareAcceptata(null), false);
  assert.match(citeste("public", "lib", "grid-sim.js"), /else if \(!lichidareAcceptata\(o\.pLich\)\) faCe = /);
});

// ---------- modulele de text ----------
const AC = new Function("GridCalcul", `${lib("acasa.js")}; return Acasa;`)(G);
globalThis.Alerte = A;
globalThis.Scenariu = new Function(`${lib("scenariu.js")}; return Scenariu;`)();
const SF = new Function(`${lib("sfaturi.js")}; return Sfaturi;`)();
const SS = new Function(`${lib("scor-sezon.js")}; return ScorSezon;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
globalThis.ActiuniSemnale = AS;
const CO = new Function(`${lib("consilier.js")}; return Consilier;`)();

// ---------- (6) textele de piață fără promisiune ----------
const CL = (ev, ca) => ({ evita: ev, candidati: ca, dir: { long: 10, neutru: 70, short: 20 } });
await test("(6) Acasă, liniște: fără „mediul bun pentru grid” / „moment bun”; faptul și ce e dovedit", () => {
  const v = AC.vreme({ clasament: CL(10, 90), btc: { miscare: false }, fg: 50 });
  assert.equal(v.nivel, "liniste");
  const tot = v.titlu + " | " + v.faCe + " | " + v.text;
  assert.doesNotMatch(tot, /mediul bun|moment bun/);
  assert.match(v.titlu, /^Piața e liniștită: /);
  assert.match(v.faCe, /fișa/);
  assert.match(v.text, /după mișcare gridul iese mai rău|regimul în care gridul iese cel mai rău/);
});
await test("(6) Acasă, frică mare: fără „de la care piața a revenit des”; fg(): fără „urcările țin mai greu” / „a revenit des”", () => {
  const v = AC.vreme({ clasament: CL(60, 40), btc: { miscare: false }, fg: 20 });
  assert.doesNotMatch(v.text + v.faCe, /a revenit des/);
  const sus = AC.fg([40, 60, 80]), jos = AC.fg([60, 40, 20]);
  assert.doesNotMatch(sus.text + jos.text, /țin mai greu|a revenit des/);
  assert.match(sus.text, /Peste 75 e lăcomie extremă/); assert.match(jos.text, /Sub 25 e frică extremă/);
  assert.doesNotMatch(AC.fg([40, 60, 72]).text, /Peste 75/, "72 nu e peste 75");
});

// ---------- (7) observația pe 40 de monede nu mai e dovadă ----------
await test("(7) „mișcare cu botul”: sursa spune observație nedovedită, fără „59% … (contra 50%)” ca dovadă", () => {
  const b = { baza: "XYZ.PERP", directie: "long", pretCurent: 100, gridJos: 90, gridSus: 110, profitTotal: 1, investit: 100 };
  const s = SF.sfaturi({ bot: b, fisa: { regim: { r4h: 2, r24h: 2.1, miscare: true, sens: "urca" } } }).find((x) => x.cod === "miscare-cu");
  assert.ok(s, "sfatul există");
  assert.doesNotMatch(s.sursa, /59%|contra 50%/);
  assert.match(s.sursa, /nedovedit/);
});

// ---------- (8) scorul sezonului: „bate / sub trecut” doar când intervalul o spune ----------
const tr = (n, win, de) => Array.from({ length: n }, (_, i) => ({ id: de + i, inchis: Date.UTC(2026, 9, de === 0 ? 1 : 20) + i * 3600000, rezultat: i < win ? 2 : -1 }));
await test("(8) 7 din 10 față de 56% istoric ⇒ „încă nu se poate spune”, cu intervalul Wilson", () => {
  const lista = tr(100, 56, 0).concat(tr(10, 7, 1000)), cfg = { start: Date.UTC(2026, 9, 15), obiectiv: { rata: 0.55, serie: 3, net: 10 } };
  const s = SS.calc(lista, cfg, Date.UTC(2026, 9, 23), "pionex"), h = SS.html(s, {});
  assert.doesNotMatch(h, /Sezonul nou bate trecutul|Sezonul nou e sub trecut/);
  /* v100.272: procentele cu o zecimală, lipite (erau „70 %”, „40 %–89 %”, „56 %”) */
  assert.match(h, /Încă nu se poate spune dacă sezonul nou e mai bun: rata 70,0% pe 10 boți are intervalul 39,7%–89,2%, iar trecutul \(56,0%\) e înăuntru\./, h.match(/Înainte de[^]*?<\/div>/) + "");
});
await test("(8) 28 din 30 față de 56% ⇒ „bate trecutul” (marginea de jos peste trecut); 3 din 30 ⇒ „sub trecut”", () => {
  const cfg = { start: Date.UTC(2026, 9, 15), obiectiv: { rata: 0.55, serie: 3, net: 10 } };
  const sus = SS.html(SS.calc(tr(100, 56, 0).concat(tr(30, 28, 1000)), cfg, Date.UTC(2026, 9, 23), "pionex"), {});
  assert.match(sus, /Sezonul nou bate trecutul: și marginea de jos a ratei \(\d+,\d%\) e peste 56,0%\./);   // v100.272: „56,0%” (era „56 %”)
  const jos = SS.html(SS.calc(tr(100, 56, 0).concat(tr(30, 3, 1000)), cfg, Date.UTC(2026, 9, 23), "pionex"), {});
  assert.match(jos, /Sezonul nou e sub trecut: și marginea de sus a ratei \(\d+,\d%\) e sub 56,0%\./);   // v100.272: idem
});

// ---------- (10) boții neutri: ambele margini ----------
await test("(10) bot neutru: sfat pe marginea de jos ȘI pe cea de sus, cu frecvența fiecăreia", () => {
  const b = { baza: "XYZ.PERP", directie: "neutral", pretCurent: 100, gridJos: 90, gridSus: 112, profitTotal: 1, investit: 100 };
  const fr = (v) => ({ valoare: v, atinse: Math.round(v / 2), cazuri: 50, stare: "destule" });
  const l = SF.sfaturi({ bot: b, sanse: { josZi: fr(10), josSapt: fr(30), susZi: fr(24), susSapt: fr(40) } }).filter((x) => x.cod === "margine");
  assert.equal(l.length, 2, JSON.stringify(l));
  const sus = l.find((x) => x.parte === "sus"), jos = l.find((x) => x.parte === "jos");
  assert.match(sus.titlu, /^Marginea de sus \(112\.00\) e cu 12,0% peste preț$/);
  assert.match(sus.text, /short/); assert.match(sus.text, /urcă cu atât în 24% din zile/);
  assert.equal(sus.ton, "atentie"); assert.equal(jos.ton, "info");
  assert.match(jos.text, /long/); assert.match(jos.text, /scade cu atât în 10% din zile/);
});
await test("(10) intrare(): la neutru cere frecvența la ambele margini", () => {
  globalThis.TabloExtra = TE;
  const k4 = Array.from({ length: 400 }, (_, i) => ({ time: Date.UTC(2026, 6, 1) + i * 4 * 3600000, open: 100, high: 100 + (i % 7), low: 100 - (i % 9), close: 100 }));
  const x = SF.intrare({ bot: { baza: "XYZ.PERP", directie: "neutral", pretCurent: 100, gridJos: 90, gridSus: 112 }, k4, acum: Date.UTC(2026, 9, 23) });
  assert.ok(x.sanse.josZi && x.sanse.susZi && x.sanse.josSapt && x.sanse.susSapt, Object.keys(x.sanse).join(","));
});

// ---------- (11) frica / lăcomia validată 0–100 peste tot ----------
await test("(11) o valoare stricată (150) nu devine „lăcomie extremă” nici pe Acasă, nici în Consilier", () => {
  assert.equal(AC.fg([40, 150]).acum, null);
  assert.equal(AC.fg([40, 150]).max, 40);
  const v = AC.vreme({ clasament: CL(10, 90), btc: { miscare: false }, fg: 150 });
  assert.doesNotMatch(v.text + v.faCe, /lăcomi/);
  const p = CO.piata({ fg: { valoare: 150, clasa: "Extreme Greed" } });
  assert.doesNotMatch(p.text, /Frica\/lăcomia/);
  const sb = CO.sfaturiBot({ baza: "XYZ.PERP" }, { fg: { valoare: 150, clasa: "Extreme Greed" } });
  assert.ok(!sb.some((x) => /Frica\/lăcomia/.test(x.titlu)));
  assert.ok(CO.sfaturiBot({ baza: "XYZ.PERP" }, { fg: { valoare: 80, clasa: "Extreme Greed" } }).some((x) => /Frica\/lăcomia/.test(x.titlu)), "80 rămâne valid");
});

// ---------- (14) riscul T212 cu conversia dus-întors ----------
await test("(14) stop la 6% (sub plafonul de 20%): riscul de 1% include conversia (0,15% la intrare + 0,15% la ieșire)", () => {
  const m = AS.marime({ cont: 10000, intrare: 100, stop: 94, fx: 4.5, riscPct: 0.01 });
  assert.equal(m.plafonat, false);
  const perBuc = (6 + 0.0015 * 100 + 0.0015 * 94) / 4.5;
  assert.ok(Math.abs(m.bucati * perBuc - 100) < 0.05, "riscul cu conversia = 100 lei: " + m.bucati * perBuc);
  assert.ok(Math.abs(m.riscPctReal - 0.01) < 1e-4, String(m.riscPctReal));
  assert.ok(Math.abs(m.risc - 100) < 0.05, "risc " + m.risc);
});

// ---------- (15) MMR: eticheta cinstită ----------
await test("(15) MMR 0,01 nu mai e numit „prudent” (la monedele mici Pionex poate cere mai mult)", () => {
  const s = citeste("public", "lib", "grid-calcul.js");
  const r = s.split("\n").find((l) => /MMR: 0\.01/.test(l));
  assert.doesNotMatch(r, /intretinere, prudent/);
  assert.match(r, /MAI DEVREME|mai devreme/);
});

// ---------- (12) BH: p-ul nu mai are podeaua 1/1001 ----------
const V = new Function("TextRo", `${lib("verdicte.js")}; return Verdicte;`)(globalThis.TextRo);
const ZI = 86400000, T0 = Date.parse("2026-01-05T15:00:00Z");
const efectClar = () => { const ev = [], r = M.generator(1); for (let i = 0; i < 400; i++) ev.push({ s: "poarta-t212", k: "S" + (i % 60), n: i % 2 ? "cumpara" : "nu", t: T0 + Math.floor(i / 20) * 30 * ZI + i * 1000, h: 20, r: 0, val: (i % 2 ? 0.03 : -0.01) + (r() - 0.5) * 0.04 }); return ev; };
await test("(12) un efect clar dă p sub 1/1001 (repetițiile urcă la 10.000) și poartă rezoluția lui (pMin)", () => {
  const t0 = Date.now(), c = V.calibrare(efectClar()), ms = Date.now() - t0;
  assert.equal(c[0].test.stare, "testat");
  assert.ok(c[0].test.p < 0.0002, "p " + c[0].test.p);
  assert.ok(c[0].test.pMin > 0 && c[0].test.pMin <= 1 / 10001 + 1e-12, "pMin " + c[0].test.pMin);
  assert.ok(ms < 5000, "calibrarea durează " + ms + " ms");
});
await test("(12) registrul cu 60 de teste: efectul clar trece BH (cu 1.000 de repetiții nu putea: 1/1001 > 0,05/60)", () => {
  const cal = V.calibrare(efectClar());
  const alte = Array.from({ length: 59 }, (_, i) => ({ sursa: "zgomot " + i, afirmatie: "x", p: 0.5, dif: 0, felul: "alt", regula: true }));
  const reg = V.registru({ calibrare: cal, alte });
  assert.equal(reg.length, 60);
  const v = reg.find((x) => x.felul === "verdict");
  assert.equal(v.treceBh, true, "p " + v.p + " · prag " + 0.05 / 60);
  assert.equal(v.poateTrece, true);
});
await test("(12) registrul spune când un test N-AR PUTEA trece oricât de puternic ar fi (rezoluția p-ului peste pragul BH)", () => {
  const reg = V.registru({ calibrare: [], alte: [{ sursa: "a", afirmatie: "x", p: 0.001, pMin: 0.001, dif: 1, felul: "alt", regula: true }].concat(Array.from({ length: 99 }, (_, i) => ({ sursa: "z" + i, afirmatie: "x", p: 0.6, felul: "alt", regula: true }))) });
  const a = reg.find((x) => x.sursa === "a");
  assert.equal(a.poateTrece, false);
});

// ---------- (13) laboratorul: „dovedit” pe net, pe zile, în registru ----------
const GL = new Function("GridCalcul", "GridProba", "Valoare", `${lib("grid-laborator.js")}; return GridLaborator;`)(G, GP, undefined);
// A: des pe plus puțin, rar pe minus mult (media pe minus); B: jumătate-jumătate, media pe plus ⇒ procentul zice A, banii zic B
function randuriLab(seed) {
  const r = M.generator(seed), out = [];
  for (let k = 0; k < 20; k++) for (let s = 0; s < 240; s++) {
    const A = (k + Math.floor(s / 8)) % 2 === 0, u = r(), net = A ? (u < 0.9 ? 0.002 : -0.05) : (u < 0.5 ? 0.01 : -0.008);
    out.push({ simbol: "C" + k, s: s * 24, t: Date.UTC(2026, 6, 1) + s * 6 * 3600000, parte: s < 150 ? "a" : s >= 170 ? "t" : null, net, miscare: A });
  }
  return out.filter((x) => x.parte);
}
await test("(13) procentul pe plus mai mare, banii mai puțini ⇒ verdictul urmează BANII (A iese mai rău pe net)", () => {
  const c = GL.compara(randuriLab(3), (x) => x.miscare, (x) => !x.miscare, 2);
  assert.ok(c.A.pePlus > c.B.pePlus, "premisa: A e mai des pe plus");
  assert.equal(c.net.stare, "testat");
  assert.ok(c.net.dif < 0, "dif pe net " + c.net.dif);
  assert.equal(c.verdict, "dovedit");
  assert.ok(c.net.p < 0.05 && c.net.ic[1] < 0, JSON.stringify(c.net));
  assert.ok(typeof c.A.medie === "number");
});
await test("(13) întrebările intră în registrul BH (pentruRegistru) cu p, pMin și direcția pe net", () => {
  const q = GL.intrebari(randuriLab(4), 2), l = GL.pentruRegistru(q);
  assert.ok(l.length >= 1);
  const m = l.find((x) => /mișcare/.test(x.afirmatie));
  assert.equal(m.felul, "laborator"); assert.ok(m.p > 0 && m.p < 0.05); assert.ok(m.pMin > 0); assert.match(m.directie, /pe net/);
  const reg = V.registru({ calibrare: [], alte: l });
  assert.ok(reg.some((x) => x.felul === "laborator"));
});
await test("(13) raportul de duminică nu mai zice „Laboratorul a dovedit” fără corecție", () => {
  const OB = new Function("JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)({ rezumat: () => ({ n: 1, total: 1, net: 1, pePlusNet: 1, grile: 1, pozitie: 0, comisioane: 0, funding: 0, greseli: [] }) });
  const ac = Date.UTC(2026, 9, 25), o = { acum: ac, trades: [{ inchis: ac - 1000 }], laborator: { intrebari: [{ titlu: "Pornit după mișcare vs pornit în liniște", verdict: "dovedit" }] } };
  const r = OB.raportDuminica(o).linii.join("\n");
  assert.doesNotMatch(r, /Laboratorul a dovedit:/);
  assert.match(r, /Laboratorul, pe net, fără corecția pe toate testele: Pornit după mișcare/);
  o.laborator.intrebari[0].dupaCorectie = true;
  assert.match(OB.raportDuminica(o).linii.join("\n"), /Laboratorul a dovedit pe net, și după corecția pe toate testele/);
});

// ---------- (17) poarta gridului judecată și pe bani ----------
await test("(17) jurnalul păstrează setarea porții (direcția, grilele, levierul)", () => {
  const j = V.adauga([], [{ s: "poarta-grid", k: "SOL_USDT_PERP", n: "nu", p: 100, t: T0, j: 95, u: 105, d: "long", g: 33, l: 3 }]);
  assert.deepEqual([j[0].d, j[0].g, j[0].l], ["long", 33, 3]);
});
await test("(17) evaluarea pune lângă „în bandă” și netul simulat al setării pe h zile (cu comisioane); fără bare de 15 minute, doar măsura veche", () => {
  const b15 = bareSint(96 * 6, 21, 0.003).map((x, i) => ({ ...x, t: T0 + i * 900000 }));
  const zile = [1, 2, 3, 4, 5, 6].map((i) => ({ t: T0 + i * ZI - 3600000, c: 100, h: 101, l: 99 }));
  const v = { s: "poarta-grid", k: "S", n: "nu", p: b15[0].o, t: T0, j: b15[0].o * 0.97, u: b15[0].o * 1.03, d: "neutru", g: 20, l: 2 };
  const ev = V.evalueaza([v], { S: zile }, {}, { bare15: { S: b15 }, GridProba: GP });
  const n1 = ev.find((x) => x.s === "poarta-grid-net" && x.h === 1), l1 = ev.find((x) => x.s === "poarta-grid" && x.h === 1);
  assert.ok(l1, "măsura veche rămâne");
  const asteptat = GP.simuleaza(b15, 0, 96, { dir: "neutru", jos: v.j, sus: v.u, grile: 20, levier: 2, fundingZi: 0.0003, fundingCost: true }).net;
  assert.ok(n1 && Math.abs(n1.val - asteptat) < 1e-12, JSON.stringify(n1));
  assert.equal(V.evalueaza([v], { S: zile }, {}).filter((x) => x.s === "poarta-grid-net").length, 0);
});
await test("(17) calibrarea are rândul „Poarta gridului · banii”: pornește / așteaptă față de „nu”, pe zile", () => {
  const ev = [], r = M.generator(5);
  for (let d = 0; d < 40; d++) for (let k = 0; k < 10; k++) for (const h of [1, 3]) { const nu = (k + d) % 3 === 0; ev.push({ s: "poarta-grid-net", k: "M" + k, n: nu ? "nu" : "asteapta", t: T0 + d * 3 * ZI, h, val: (nu ? -0.004 : 0.001) + (r() - 0.5) * 0.004 }); }
  const c = V.calibrare(ev, { repsP: 2000 }).find((x) => x.sursa === "poarta-grid-net" && x.h === 1);
  assert.equal(c.masura, "net"); assert.equal(c.unitate, "zi"); assert.equal(c.test.stare, "testat");
  assert.ok(c.test.dif > 0 && c.test.p < 0.01, JSON.stringify(c.test));
  assert.ok(c.niveluri.some((x) => x.nivel === "nu") && c.niveluri.some((x) => x.nivel === "asteapta"));
});

// ---------- (5) fișa poartă verdictul Monte Carlo pe 7 zile al setării propuse ----------
const B5 = bareSint(30 * 96, 1023, 0.006), P5 = B5[B5.length - 1].c;
const fisa5 = (o) => GP.fisa({ simbol: "S", pret: P5, H: 1, b15: B5, b4h: G.agrega(B5, 4 * 3600000).slice(0, -1), b1d: G.agrega(B5, 86400000).slice(0, -1), suma: 100, ...o });
await test("(5) fără Monte Carlo (faraMc) fișa zice PORNEȘTE pe moneda asta (premisa)", () => {
  assert.equal(fisa5({ faraMc: true }).verdict.nivel, "porneste");
  assert.equal(fisa5({ faraMc: true }).mc, undefined);
});
await test("(5) cu Monte Carlo pe aceeași setare: stopul atins în > 50% / pierde în > 50% ⇒ AȘTEAPTĂ, cu cifrele în motiv", () => {
  // v100.267 (auditul 29.10): MC rulează pe orizontul fișei (H = 1 aici), nu pe 7 zile; pe barele astea MC pe o zi e de acord, deci
  // contrazicerea se probează cu un Simulator care dă stopul în zgomot pe H zile (pierderea neconfirmată nu mai contrazice: proba v100.267-c)
  const g = fisa5({ mc: GS });
  assert.ok(g.mc && g.mc.n === 300 && g.mc.zile === 1, JSON.stringify(g.mc));
  const MOCK = { simuleaza: (b, st, o) => ({ orizonturi: [{ zile: o.zile, pStop: 0.6, pPierde: 0.4, pCastig: 0.6, pLich: 0, p50: 0.5 }] }), verdict: () => ({ faCe: "Stopul e în zgomot: atins în 60% din drumuri în 1 zi.", rauConfirmat: false }) };
  const f = fisa5({ mc: MOCK });
  assert.ok(f.mc && f.mc.n === 300 && f.mc.zile === 1, JSON.stringify(f.mc));
  assert.ok(f.mc.pStop > 0.5 || f.mc.pPierde > 0.5, "premisa: MC contrazice (" + f.mc.pStop + " / " + f.mc.pPierde + ")");
  assert.equal(f.verdict.nivel, "asteapta");
  assert.match(f.verdict.motive[0], /^Monte Carlo pe 1 zi, aceeași setare: /);
  assert.ok(f.verdict.motive[0].length <= 160, f.verdict.motive[0]);
});
await test("(5) Monte Carlo de acord ⇒ PORNEȘTE rămâne; stopul pe partea pierderii, ieșirea pe partea câștigului e ținta", () => {
  let vazut = null;
  const MOCK = { simuleaza: (b, st) => { vazut = st; return { orizonturi: [{ zile: 7, pStop: 0.2, pPierde: 0.3, pCastig: 0.7, pLich: 0, p50: 1 }] }; }, verdict: () => ({ faCe: "Aș porni: câștigă în 70% din drumuri." }) };
  const f = fisa5({ mc: MOCK });
  assert.equal(f.verdict.nivel, "porneste");
  assert.equal(f.mc.contrazice, false);
  if (vazut.dir === "long") { assert.ok(vazut.stop.jos > 0 && !vazut.stop.sus); assert.ok(vazut.tp > vazut.sus); }
  else if (vazut.dir === "short") { assert.ok(vazut.stop.sus > 0 && !vazut.stop.jos); assert.ok(vazut.tp < vazut.jos); }
});
await test("(5) MC zice „N-aș porni” ⇒ AȘTEAPTĂ chiar cu stopul rar atins", () => {
  const MOCK = { simuleaza: () => ({ orizonturi: [{ zile: 7, pStop: 0.1, pPierde: 0.4, pCastig: 0.6, pLich: 0.01 }] }), verdict: () => ({ faCe: "N-aș porni așa: lichidare în 1% din drumuri." }) };
  const f = fisa5({ mc: MOCK });
  assert.equal(f.verdict.nivel, "asteapta");
  assert.match(f.verdict.motive[0], /N-aș porni așa/);
});

// ---------- (16) un singur filtru de regim: tot ce pornește un grid nou ascultă „după mișcare nu” ----------
const MIS = { verdict: { nivel: "nu", motive: ["prețul abia a făcut o mișcare de 4,0× față de obișnuit — după mișcare gridul iese cel mai rău"] }, regim: { r4h: 4, r24h: 2, miscare: true, sens: "coboara" } };
const LIN = { verdict: { nivel: "porneste", motive: [] }, regim: { r4h: 1, r24h: 1, miscare: false } };
const B16 = { id: "Q", baza: "XYZ.PERP", directie: "long", activ: true, investit: 100, levier: 3, pretCurent: 85, gridJos: 90, gridSus: 110, profitTotal: -5, distantaLichidarePct: 40 };
await test("(16) planul „afară din grid”: în mișcare nu propune botul nou acum (semafor și alertă); în liniște da", () => {
  const plan = { atins: ["afara"], afara: { prag: 12 } };
  const sm = SB.semafor({ bot: B16, fisa: MIS, plan }).componente.find((c) => c.cod === "plan");
  assert.doesNotMatch(sm.faCe, /aș porni unul nou din fișă, pe unde e prețul/);
  assert.match(sm.faCe, /abia după liniște/);
  assert.match(SB.semafor({ bot: B16, fisa: LIN, plan }).componente.find((c) => c.cod === "plan").faCe, /aș porni unul nou din fișă, pe unde e prețul/);
  const al = A.reguli(B16, { plan, regim: MIS.regim }, {}).plan;
  assert.match(al.mesaj, /abia după liniște/);
  assert.match(A.reguli(B16, { plan, regim: LIN.regim }, {}).plan.mesaj, /aș porni din fișă unul nou, pe unde e prețul/);
});
await test("(16) trendul contra și „după margine” (cu botul): botul nou din fișă abia după liniște", () => {
  const f = { ...MIS, directie: { dir: "short", tarie: "tare" } };
  const tr = SB.semafor({ bot: B16, fisa: f }).componente.find((c) => c.cod === "trend");
  assert.match(tr.faCe, /abia după liniște/); assert.ok(tr.faCe.length <= 110, tr.faCe);
  const sus = { ...B16, pretCurent: 115, profitTotal: 4 };
  const pc = SB.pasiCuBotul(sus, "long", null, { regim: { miscare: true, sens: "urca" } });
  assert.match(pc.faCe, /abia după liniște/); assert.ok(pc.faCe.length <= 110, pc.faCe);
  assert.match(SB.pasiCuBotul(sus, "long", null, LIN).faCe, /aș porni unul nou din fișă/);
});
await test("(16) sfaturile (grid afară, trend contra, ritm scăzut) nu cer un grid nou cât fișa zice NU / mișcare", () => {
  const b = { ...B16, brut: null };
  const l = SF.sfaturi({ bot: b, fisa: { ...MIS, directie: { dir: "short", tarie: "tare", motive: [] } }, ritm: { zile: 5, medieZi: 2, grile24h: 0.2 } });
  const toate = l.map((s) => s.faCe || "").join(" | ");
  assert.doesNotMatch(toate, /aș porni din fișă unul la prețul de acum|aș porni din fișă unul pe trend/, toate);
  assert.match(toate, /abia după liniște/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exitCode = picate ? 1 : 0;
