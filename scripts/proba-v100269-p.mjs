// Proba v100.269-p (ideile auditului 29.10, felia „praguri”) - două idei, fiecare cu testul care pica pe codul de dinainte.
//  1. Pragurile fixe judecate față de moneda și intervalul ei. Măsurat de auditor: pe bare de 5 min, Kaufman ER < 0,30 era adevărat
//     91–95% din timp (> 0,60 niciodată) și ATR/treaptă < 1 în 53–100% ⇒ rândurile Tabloului stăteau mereu aprinse. În Analiză, ATR% ≥ 3
//     (regimul VOLATILE RANGE și profilul „auto”) era peste prag 90% din bare pe 1d și 0% pe 15m/1h. Acum fiecare prag e o percentilă pe
//     istoricul monedei pe intervalul ei (ER „zigzag” sub percentila 20, „trend” peste 80; oscilația „a scăzut” = ATR sub percentila 20
//     și sub o treaptă; ATR% „mare” peste percentila 80 din ultimele 160 de bare), cu „istoric scurt” (nu un verdict) când istoricul nu ajunge.
//  2. „Mișcare mare” cu o singură definiție (GridCalcul.miscareMare): mișcarea pe o zi (24 h la crypto, ziua de bursă la acțiuni) peste
//     percentila 90 a mișcărilor pe o zi ale monedei ⇒ ~1 zi din 10. Înainte erau trei: 4 h SAU 24 h peste 1,5 × P75 (fișa, Tabloul,
//     colectorul), 1 zi SAU 5 zile peste 1,5 × P75 (acțiunile, 23% din zile) și 2 × / 1,5 × în alertă. Alertele nu sună mai des (măsurat aici).
// Bare sintetice deterministe (mulberry32), aceleași bare înainte și după; cifrele „înainte” se socotesc din valorile neschimbate
// (ER, ATR/treaptă, ATR%, r4h/r24h) cu pragurile vechi.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js");
/* de la „function nume(” la început de rând până la următorul „\nfunction ” (un comentariu cu același text nu păcălește) */
const fnApp = (nume) => { const i = APP.indexOf("\nfunction " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i + 1, j < 0 ? undefined : j); };
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "actiuni-semnale.js", "tablou-bot.js", "indicatori-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const G = globalThis.GridCalcul, TB = globalThis.TabloBot, AL = globalThis.Alerte, SB = globalThis.SemnaleBot, AS = globalThis.ActiuniSemnale, IB = globalThis.IndicatoriBot;

let teste = 0, picate = 0;
/* PROBA_DOAR=1,3 rulează doar testele 1 și 3 (pentru mutații) */
const DOAR = String(process.env.PROBA_DOAR || "").split(",").filter(Boolean);
async function test(nume, f) {
  if (DOAR.length && !DOAR.includes(nume.split(" ")[0])) return;
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.269-p · PRAGURILE FAȚĂ DE MONEDĂ + „MIȘCARE MARE” CU O SINGURĂ DEFINIȚIE\n");

// ───────────── bare sintetice ─────────────
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const T0 = Date.UTC(2026, 6, 1);
/* o: sig (abaterea pe bară), garch (agitație în valuri), regimuri (o schimbare de drift la ~atâtea bare: trend sus/jos sau pe loc), drift (× sig, 0,35 implicit), pas (ms) */
function bare(n, o) {
  const r = mulberry32(o.seed), g = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const s2 = o.sig * o.sig, A = o.garch ? 0.08 : 0, B = o.garch ? 0.90 : 0;
  let p = 100, v = s2, mu = 0; const out = [];
  for (let i = 0; i < n; i++) {
    if (o.regimuri && r() < 1 / o.regimuri) { const u = r(); mu = u < 0.4 ? 0 : (u < 0.7 ? 1 : -1) * (o.drift || 0.35) * o.sig; }
    const s = Math.sqrt(v), ret = mu + s * g();
    if (o.garch) v = s2 * (1 - A - B) + A * ret * ret + B * v;
    const op = p, c = p * Math.exp(ret), h = Math.max(op, c) * (1 + Math.abs(g()) * s * 0.4), l = Math.min(op, c) * (1 - Math.abs(g()) * s * 0.4);
    out.push({ time: T0 + i * o.pas, open: op, high: h, low: l, close: c }); p = c;
  }
  return out;
}
const gc = (rows) => rows.map((x) => ({ t: x.time, o: x.open, h: x.high, l: x.low, c: x.close }));
const pc = (k, n) => n ? (Math.round(1000 * k / n) / 10).toFixed(1).replace(".", ",") + "%" : "—";
const intre = (k, n, lo, hi, ce) => { const v = 100 * k / n; assert.ok(v >= lo && v <= hi, `${ce}: ${pc(k, n)}, aștept între ${lo}% și ${hi}%`); };

// ═════════════ IDEEA 1a · Tabloul botului (bare de 5 min, 100 de lumânări ca în aplicație) ═════════════
const FORME5 = [
  { nume: "5 min · mers aleator calm", sig: 0.0025, seed: 11 },
  { nume: "5 min · agitație în valuri", sig: 0.0025, garch: true, seed: 12 },
  { nume: "5 min · trend și zigzag pe rând", sig: 0.0025, garch: true, regimuri: 300, seed: 13 },
];
function botPe(p, pasProc) {
  const jos = 0.8 * p, sus = 1.2 * p;
  return { status: "running", createTime: 1, buOrderData: { status: "running", bottom: String(jos), top: String(sus), row: String(Math.round((sus - jos) / (p * pasProc)) + 1), trend: "long" } };
}
/* restul măsurilor sănătoase: verdictul ajunge la treapta eficienței (REGLEAZA „Piața nu merge nicăieri” / PAZESTE „Trendul s-a întors”) */
const sanatos = (m, ef) => ({ ...m, eficienta: ef, varstaBotMin: 600, lumanari: Math.max(48, m.lumanari), istoricMin: 600, directieBot: 1,
  lichidare: { valoare: 50, stare: "bine", prag: { grav: 8, atentie: 15 } }, pozitieInterval: { valoare: 50, stare: "bine", minuteLaMargine: 0, prag: { margine: 15, afara: 0 } },
  comision: { valoare: 10, stare: "bine", prag: 50 }, ritmPerechi: { valoare: 3, baza: 3, stare: "bine", prag: 0.4 }, basis: { valoare: 0.1, stare: "bine", prag: 1 },
  amplitudine: { valoare: 2, stare: "bine", prag: 1 }, marginStatus: { valoare: null, stare: "nu-se-poate" }, riskStatus: { valoare: null, stare: "nu-se-poate" },
  stareBot: { valoare: "running", stare: "bine" } });
const dinEf = (v) => v.declansator && v.declansator.masura === "eficienta" ? v.nivel : null;
function rateTablou(forma) {
  const r = bare(4000, { ...forma, pas: 300000 }), c = { n: 0, zigV: 0, zigN: 0, trV: 0, trN: 0, regV: 0, regN: 0, pazV: 0, pazN: 0, scurt: 0, a4V: 0, a4N: 0, a10V: 0, a10N: 0 };
  for (let e = 100; e <= r.length; e += 5) {
    const k = r.slice(e - 100, e), p = k[k.length - 1].close, acum = k[k.length - 1].time + 60000;
    const m = TB.masoara({ bot: botPe(p, 0.004), klinePerp: k, pretSpot: null, istoric: [], acum });
    const m10 = TB.masoara({ bot: botPe(p, 0.010), klinePerp: k, pretSpot: null, istoric: [], acum });
    const ef = m.eficienta.valoare; c.n++;
    if (ef < 0.30) c.zigV++; if (ef > 0.60) c.trV++;
    if (m.eficienta.stare === "zigzag") c.zigN++; if (m.eficienta.stare === "trend") c.trN++;
    if (m.eficienta.stare === "istoric-scurt" || m.amplitudine.stare === "istoric-scurt") c.scurt++;
    if (m.amplitudine.valoare < 1) c.a4V++; if (m.amplitudine.stare === "rau") c.a4N++;
    if (m.amplitudine.stare === "rau") {
      const vA = TB.verdict({ ...sanatos(m, { valoare: 0.4, semn: 1, stare: "bine", prag: {} }), amplitudine: m.amplitudine }, "GRID", {});
      assert.equal(vA.declansator && vA.declansator.masura, "amplitudine"); assert.equal(vA.declansator.prag, m.amplitudine.prag);
      assert.ok(m.amplitudine.prag <= 1, "pragul oscilației e cel mult o treaptă: " + m.amplitudine.prag);
    }
    if (m10.amplitudine.valoare < 1) c.a10V++; if (m10.amplitudine.stare === "rau") c.a10N++;
    const vechi = { ...m.eficienta, stare: ef < 0.30 ? "zigzag" : ef > 0.60 ? "trend" : "bine", prag: 0.30 };
    const vNou = TB.verdict(sanatos(m, m.eficienta), "DIRECTIONAL", {}), vV = dinEf(TB.verdict(sanatos(m, vechi), "DIRECTIONAL", {})), vN = dinEf(vNou);
    /* declanșatorul arată pragul cu care s-a judecat moneda (percentila ei), nu 0,60 / 0,30 */
    if (vN) assert.equal(vNou.declansator.prag, vN === "PAZESTE" ? m.eficienta.prag.trend : m.eficienta.prag.zigzag, "pragul din declanșator");
    if (vV === "REGLEAZA") c.regV++; if (vN === "REGLEAZA") c.regN++; if (vV === "PAZESTE") c.pazV++; if (vN === "PAZESTE") c.pazN++;
  }
  return c;
}
await test("1 Tabloul (5 min, 100 de lumânări): „zigzag”, „trend” și „oscilația a scăzut sub o treaptă” se aprind ~20% din timp, nu 90%+ / 0%", () => {
  for (const f of FORME5) {
    const c = rateTablou(f);
    console.log(`       ${f.nume}: zigzag ${pc(c.zigV, c.n)} → ${pc(c.zigN, c.n)} · trend ${pc(c.trV, c.n)} → ${pc(c.trN, c.n)} · sub o treaptă (pas 0,4%) ${pc(c.a4V, c.n)} → ${pc(c.a4N, c.n)}`
      + ` · (pas 1%) ${pc(c.a10V, c.n)} → ${pc(c.a10N, c.n)} · REGLEAZA „nu merge nicăieri” ${pc(c.regV, c.n)} → ${pc(c.regN, c.n)} · PAZESTE „trendul s-a întors” ${pc(c.pazV, c.n)} → ${pc(c.pazN, c.n)}`);
    /* problema auditului se vede și pe barele astea (cu pragurile fixe) */
    assert.ok(100 * c.zigV / c.n >= 70, f.nume + ": înainte zigzag doar " + pc(c.zigV, c.n));
    assert.ok(100 * c.a10V / c.n >= 80 && 100 * c.a4V / c.n >= 40, f.nume + ": înainte sub o treaptă " + pc(c.a4V, c.n) + " / " + pc(c.a10V, c.n));
    intre(c.zigN, c.n, 10, 32, f.nume + " zigzag");
    intre(c.trN, c.n, 10, 32, f.nume + " trend");
    intre(c.a4N, c.n, 8, 32, f.nume + " sub o treaptă (pas 0,4%)");
    intre(c.a10N, c.n, 8, 32, f.nume + " sub o treaptă (pas 1%)");
    intre(c.regN, c.n, 5, 32, f.nume + " REGLEAZA din eficiență");
    assert.equal(c.scurt, 0, f.nume + ": cu 100 de lumânări istoricul ajunge");
  }
});
await test("2 Tabloul: istoric scurt (60 / 40 de lumânări) ⇒ „istoric-scurt”, nu un verdict (fără REGLEAZA din eficiență sau din oscilație)", () => {
  const r = bare(400, { sig: 0.0025, seed: 21, pas: 300000 });
  const k60 = r.slice(0, 60), p60 = k60[59].close, m = TB.masoara({ bot: botPe(p60, 0.01), klinePerp: k60, pretSpot: null, istoric: [], acum: k60[59].time + 60000 });
  assert.ok(Number.isFinite(m.eficienta.valoare), "valoarea ER se socotește în continuare");
  assert.equal(m.eficienta.stare, "istoric-scurt", "60 de lumânări = 13 ferestre de 48: prea puțin pentru o percentilă");
  assert.match(String(m.eficienta.eticheta || ""), /^13 ferestre din 30$/, "eticheta spune cât istoric are");
  assert.equal(dinEf(TB.verdict(sanatos(m, m.eficienta), "DIRECTIONAL", {})), null, "istoricul scurt nu dă verdict din eficiență");
  const k40 = r.slice(0, 40), p40 = k40[39].close, m40 = TB.masoara({ bot: botPe(p40, 0.01), klinePerp: k40, pretSpot: null, istoric: [], acum: k40[39].time + 60000 });
  assert.ok(m40.amplitudine.valoare < 1, "pasul de 1% e peste ATR-ul de 5 min");
  assert.equal(m40.amplitudine.stare, "istoric-scurt", "40 de lumânări = 26 de ATR-uri: prea puțin");
  assert.match(String(m40.amplitudine.eticheta || ""), /^26 de ATR-uri din 30$/);
  const v = TB.verdict({ ...sanatos(m40, { valoare: 0.4, semn: 1, stare: "bine", prag: {} }), amplitudine: m40.amplitudine }, "GRID", {});
  assert.notEqual(v.declansator && v.declansator.masura, "amplitudine", "istoricul scurt nu dă REGLEAZA din oscilație");
});
await test("3 Tabloul: pragurile fixe rămân margini - un trend curat (ER > 0,60) e „trend” oricum; „zigzag” cere și ER sub 0,30", () => {
  const lin = Array.from({ length: 100 }, (_, i) => { const c = 100 * Math.pow(1.001, i); return { time: T0 + i * 300000, open: c / 1.001, high: c * 1.0005, low: c / 1.0015, close: c }; });
  const mT = TB.masoara({ bot: botPe(lin[99].close, 0.004), klinePerp: lin, pretSpot: null, istoric: [], acum: lin[99].time + 60000 });
  assert.ok(mT.eficienta.valoare > 0.99); assert.equal(mT.eficienta.stare, "trend", "ER 1 în toate ferestrele: percentila e la mijloc, dar e trend");
  /* 90 de bare în urcare curată, apoi 10 bare de zigzag mare: ER-ul de acum (~0,4) e cel mai mic din istoric, dar nu e zigzag */
  const z = []; let p = 100;
  for (let i = 0; i < 100; i++) { const op = p; p = i < 90 ? p * 1.01 : p * (i % 2 ? 1.05 : 1 / 1.05); z.push({ time: T0 + i * 300000, open: op, high: Math.max(op, p) * 1.001, low: Math.min(op, p) * 0.999, close: p }); }
  const mZ = TB.masoara({ bot: botPe(p, 0.004), klinePerp: z, pretSpot: null, istoric: [], acum: z[99].time + 60000 });
  assert.ok(mZ.eficienta.valoare >= 0.30 && mZ.eficienta.valoare < 0.60, "ER " + mZ.eficienta.valoare);
  assert.ok(mZ.eficienta.percentila <= 20, "percentila " + mZ.eficienta.percentila);
  assert.notEqual(mZ.eficienta.stare, "zigzag", "sub percentila 20, dar ER peste 0,30: nu e zigzag");
  /* declanșatorul arată pragul cu care s-a judecat (un număr, nu un obiect) */
  const vT = TB.verdict({ ...sanatos(mT, mT.eficienta), directieBot: -1 }, "DIRECTIONAL", {});
  assert.equal(vT.nivel, "PAZESTE"); assert.equal(typeof vT.declansator.prag, "number");
});

// ═════════════ IDEEA 1b · Analiza: ATR% ≥ 3 (regimul VOLATILE RANGE, profilul „auto”) ═════════════
/* extrase din app.js o singură dată, la primul test care le cere (pe codul vechi lipsește atrPctMare: testul pică, proba nu crapă) */
let A1 = null;
const app1 = () => { if (A1) return A1; const box = {}; vm.createContext(box); vm.runInContext(["ATR", "pctRank", "atrPctMare", "profileParams"].map(fnApp).join("\n"), box, { filename: "app-extras.js" }); return (A1 = box); };
const FORME_TF = [
  { nume: "5m", sig: 0.0025, seed: 31 }, { nume: "15m", sig: 0.0045, seed: 32 }, { nume: "1h", sig: 0.009, seed: 33 },
  { nume: "4h", sig: 0.018, seed: 34 }, { nume: "1d", sig: 0.045, seed: 35 },
];
await test("4 Analiza: ATR% „mare” = peste percentila 80 din ultimele 160 de bare ⇒ ~20% pe orice interval (înainte: 0% pe 15m/1h, ~90%+ pe 1d)", () => {
  const A1 = app1();
  for (const f of FORME_TF) {
    const r = bare(2000, { ...f, garch: true, pas: 3600000 }); let n = 0, v = 0, nn = 0;
    for (let e = 300; e <= r.length; e += 5) {
      const w = r.slice(e - 300, e), h = w.map((x) => x.high), l = w.map((x) => x.low), c = w.map((x) => x.close), atr = A1.ATR(h, l, c, 14), i = c.length - 1;
      const x = A1.atrPctMare(atr, c, i); n++;
      if (atr[i] / c[i] * 100 >= 3) v++; if (x.mare) nn++;
      assert.equal(x.istoricScurt, false);
    }
    console.log(`       ${f.nume}: ATR% ≥ 3 ${pc(v, n)} → peste percentila 80 ${pc(nn, n)}`);
    intre(nn, n, 10, 32, f.nume);
    if (f.nume === "15m" || f.nume === "1h") assert.equal(v, 0, "înainte, pe " + f.nume + " pragul fix nu se atingea");
    if (f.nume === "1d") assert.ok(100 * v / n >= 80, "înainte, pe 1d pragul fix era aproape mereu atins: " + pc(v, n));
  }
  const r = bare(100, { sig: 0.009, seed: 36, pas: 3600000 }), atr = A1.ATR(r.map((x) => x.high), r.map((x) => x.low), r.map((x) => x.close), 14);
  const s = A1.atrPctMare(atr, r.map((x) => x.close), 40);
  assert.equal(s.istoricScurt, true, "41 de bare: istoric scurt"); assert.equal(s.mare, false); assert.equal(s.percentila, null);
});
await test("5 Analiza: regimul și profilul „auto” folosesc ATR% față de istoricul monedei (nu „atrPct>=3”), și calc spune percentila", () => {
  const A1 = app1();
  assert.equal(A1.profileParams("auto", true, 10).st, 3.0, "ATR% mare ⇒ profilul volatil");
  assert.equal(A1.profileParams("auto", false, 10).st, 2.4);
  assert.equal(A1.profileParams("auto", true, 30).st, 2.8, "ADX ≥ 27 rămâne înainte");
  const calc = fnApp("calc");
  assert.doesNotMatch(calc, /atrPct\s*>=\s*3/, "calc mai judecă ATR% cu pragul fix");
  assert.doesNotMatch(fnApp("profileParams"), /atrPct\s*>=\s*3/);
  assert.match(calc, /atrPctMare\(atr,c,i\)/);
  assert.match(calc, /profileParams\(mode,atrRang\.mare,/);
  assert.match(calc, /atrRang\.mare\?"VOLATILE RANGE":"RANGE"/);
  assert.match(calc, /atrPctPercentila:atrRang\.percentila/);
});

// ═════════════ IDEEA 2 · „mișcare mare” cu o singură definiție ═════════════
await test("6 GridCalcul.miscareMare: mișcarea pe o zi peste percentila 90 a mișcărilor pe o zi ale monedei; textul spune „~1 zi din 10”", () => {
  assert.equal(typeof G.miscareMare, "function", "lipsește GridCalcul.miscareMare");
  const b = gc(bare(1000, { sig: 0.0045, seed: 41, pas: 900000 }));
  const sare = b.slice(0, 999).concat([{ ...b[998], t: b[998].t + 900000, c: b[998 - 95].c * 1.25, h: b[998 - 95].c * 1.25 }]);
  const x = G.miscareMare(sare, { k: 96 });
  assert.equal(x.mare, true); assert.ok(x.r > 1 && x.pct > 90 && x.sens === "urca", JSON.stringify(x));
  assert.equal(x.k, 96); assert.equal(x.p, 0.9); assert.equal(x.istoricScurt, false);
  assert.match(x.rata, /^~1 zi din 10$/);
  const y = G.miscareMare(b, { k: 96 }); assert.equal(y.mare, y.azi > y.prag);
  const s = G.miscareMare(b.slice(0, 120), { k: 96 });
  assert.equal(s.istoricScurt, true, "24 de mișcări pe o zi: istoric scurt"); assert.equal(s.mare, null);
});
/* „înainte”: 4 h SAU 24 h peste 1,5 × P75 (r4h/r24h nu s-au schimbat) */
const vechiRegim = (rg) => rg.r4h > 1.5 || rg.r24h > 1.5;
await test("7 regimPeBare (fișa 15m, Tabloul 1h, BTC/clasament 4h) cheamă miscareMare: aceeași decizie, ~1 zi din 10 (înainte 4 h SAU 24 h)", () => {
  for (const [nume, sig, pas, ist, k4, k24, seed, cate, pasE] of [["15m (fișa, colectorul)", 0.0045, 900000, 3000, 16, 96, 51, 5760, 8], ["1h (Tabloul: Mediul botului)", 0.009, 3600000, 500, 4, 24, 52, 4000, 4], ["4h (BTC, clasamentul)", 0.018, 14400000, 200, 1, 6, 53, 3000, 2]]) {
    const b = gc(bare(ist + cate, { sig, garch: true, regimuri: 200, drift: 0.05, pas, seed })); let n = 0, v = 0, nn = 0;
    for (let e = ist; e <= b.length; e += pasE) {
      const w = b.slice(e - ist, e), rg = G.regimPeBare(w, k4, k24), mm = G.miscareMare(w, { k: k24 }); n++;
      assert.equal(rg.miscare, mm.mare === true, nume + ": regimPeBare și miscareMare spun altceva");
      assert.ok(rg.mare && rg.mare.pct === mm.pct, "regimul poartă definiția (pentru alertă și texte)");
      if (vechiRegim(rg)) v++; if (rg.miscare) nn++;
    }
    console.log(`       ${nume}: mișcare ${pc(v, n)} → ${pc(nn, n)}`);
    intre(nn, n, 4, 17, nume);
  }
});
await test("8 acțiunile (bare zilnice): „mișcare mare” = ziua de azi peste percentila 90 a zilelor ei (înainte 1 zi SAU 5 zile peste 1,5 × P75)", () => {
  const b = gc(bare(1800, { sig: 0.02, garch: true, regimuri: 120, pas: 86400000, seed: 61 })); let n = 0, v = 0, nn = 0;
  for (let e = 300; e <= b.length; e += 2) {
    const w = b.slice(e - 300, e), s = AS.stare(w), mm = G.miscareMare(w, { k: 1 }); n++;
    assert.equal(s.miscare.mare, mm.mare === true, "acțiunile nu cheamă definiția comună");
    if (s.miscare.r1z > 1.5 || s.miscare.r5z > 1.5) v++; if (s.miscare.mare) nn++;
  }
  console.log(`       acțiuni 1d: mișcare mare ${pc(v, n)} → ${pc(nn, n)}`);
  intre(nn, n, 4, 17, "acțiuni");
  assert.ok(nn < v, "trebuia să se aprindă mai rar decât înainte");
  const st = { trend: { dir: "sus", tarie: "mediu" }, miscare: { mare: true, sens: "sus" }, distMax7z: -0.1, ultima: Date.now() };
  const pr = AS.poarta({ stare: st, plan: { stop: 1 } });
  assert.ok(pr.motive.some((m) => /~1 zi din 10/.test(m)), pr.motive.join(" | "));
});
await test("9 alerta „mișcare mare” (colectorul, 15m / 30 de zile): aceeași definiție, iese sub percentila 75 - și nu sună mai des decât înainte", () => {
  const bot = { baza: "TEST.PERP", directie: "neutru" };
  let totV = 0, totN = 0, intrV = 0, intrN = 0, zile = 0;
  for (const [seed, regimuri] of [[71, 0], [72, 300], [73, 150]]) {
    const b = gc(bare(3000 + 2880, { sig: 0.0045, garch: true, regimuri, pas: 900000, seed })); let stV = {}, stN = {};
    for (let e = 3000; e <= b.length; e++) {
      const w = b.slice(e - 3000, e), rg = G.regim(w), acum = w[w.length - 1].t + 900000;
      /* înainte: intra peste 2 ×, ieșea sub 1,5 × (maximul dintre 4 h și 24 h) - aceeași mașină de stări (Alerte.evalueaza) */
      const inV = ((stV.miscare && stV.miscare.nivel) || "ok") !== "ok", rmax = Math.max(rg.r4h, rg.r24h);
      const dV = inV ? rmax >= 1.5 : rmax > 2.0, sV = rg.r24h > 1.5 ? rg.s24h : rg.r4h > 1.5 ? rg.s4h : 0;
      const rV = AL.evalueaza(bot, { regim: { r4h: rg.r4h, r24h: rg.r24h, s4h: rg.s4h, s24h: rg.s24h, miscare: dV, sens: sV > 0 ? "urca" : sV < 0 ? "coboara" : null, mare: null } }, stV, acum);
      const rN = AL.evalueaza(bot, { regim: rg }, stN, acum);
      for (const m of rV.mesaje) if (m.cheie === "miscare") { totV++; if (m.nivel !== "info") intrV++; }
      for (const m of rN.mesaje) if (m.cheie === "miscare") { totN++; if (m.nivel !== "info") intrN++; if (m.nivel === "atentie") assert.match(m.mesaj, /~1 zi din 10/, m.mesaj); }
      stV = rV.stare; stN = rN.stare;
    }
    zile += 30;
  }
  console.log(`       alerta „mișcare mare” pe ${TextRo.cate(zile, "zi", "zile")} de bare de 15 min: ${totV} → ${totN} mesaje (din care anunțuri ${intrV} → ${intrN})`);
  assert.ok(totN <= totV, `alerta sună mai des: ${totV} → ${totN}`);
  assert.ok(intrN > 0, "alerta nu mai sună deloc");
  /* histerezis: în alertă rămâne cât mișcarea e peste percentila 75, chiar dacă nu mai e peste 90 */
  const rg = { r4h: 1.1, r24h: 1.3, miscare: false, sens: null, mare: { pct: 80, mare: false } };
  assert.equal(AL.reguli({ baza: "X", directie: "neutru" }, { regim: rg }, { miscare: { nivel: "atentie", la: 0 } }).miscare.nivel, "atentie");
  assert.equal(AL.reguli({ baza: "X", directie: "neutru" }, { regim: { ...rg, mare: { pct: 70, mare: false } } }, { miscare: { nivel: "atentie", la: 0 } }).miscare.nivel, "ok");
  assert.equal(AL.reguli({ baza: "X", directie: "neutru" }, { regim: rg }, {}).miscare.nivel, "ok", "nu intră sub percentila 90");
  /* înainte intra pe 4 h peste 2 × chiar fără mișcare pe 24 h; acum decide definiția comună (24 h) */
  assert.equal(AL.reguli({ baza: "X", directie: "neutru" }, { regim: { r4h: 2.6, r24h: 1.0, miscare: false, sens: null } }, {}).miscare.nivel, "ok");
});
await test("10 sfatul și cartela „Mișcarea” spun cât de des se aprinde (~1 zi din 10) și cifra pe 24 h", () => {
  const rg = { r4h: 2.6, r24h: 1.8, s4h: -0.05, s24h: -0.07, miscare: true, sens: "coboara", mare: { pct: 95, mare: true, rata: "~1 zi din 10" } };
  const bot = { directie: "long", pretCurent: 1, gridJos: 0.9, gridSus: 1.1, distantaLichidarePct: 40 };
  const sm = SB.semafor({ bot, fisa: { regim: rg } });
  const c = sm.componente.find((x) => x.cod === "miscare");
  assert.ok(c, "lipsește sfatul „mișcare”");
  assert.match(c.motiv, /1,8×/, "cifra din motiv e pe 24 h (definiția), nu maximul cu 4 h: " + c.motiv);
  assert.ok(c.motiv.length <= 60, "motivul ≤ 60: " + c.motiv);
  assert.match(c.deCe || "", /~1 zi din 10/, c.deCe);
  const k = SB.acumConcret({ bot, fisa: { regim: rg } }).find((x) => x.cod === "miscare");
  assert.match(k.text, /~1 zi din 10/, k.text);
  /* Tabloul, „Mediul botului”: explicația nu mai spune „pragul e 1,5×” */
  const md = IB.mediu({ regim: rg }, "long").find((x) => x.k === "miscare");
  assert.match(md.titlu, /~1 zi din 10/); assert.doesNotMatch(md.titlu, /1,5×/);
});

console.log(picate ? `\n${picate} PICA din ${teste}` : `\ntoate ${teste} ok`);
if (picate) process.exit(1);
