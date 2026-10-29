// Proba v100.268 (29.10, el: „Cele din macro.js”) - pragurile pieței de pe Acasă dintr-un singur loc.
// Auditul 29.10 (felia 3): pe aceeași pagină, VIX 18–20 era „liniște” (verde) pe cadran și „prudență” (−1) în scorul macro - 50 din 260 de zile;
// legătura BTC–bursă era „bursa nu-l trage” pe card (r < 0,5, QQQ) și „parțial legate” în macro (ρ > 0,2, SPY) - 171 din 260 de zile.
// Acum: VIX calm sub 18, prudență 18–25, frică 25–30, panică peste 30; BTC–bursă împreună peste 0,6, parțial 0,2–0,6, decuplate până la −0,2,
// în sens opus sub −0,2 - în macro.js (Macro.PRAGURI, vixTreapta, legaturaBtc); cadranul, cardul și alerta „vremii” le folosesc pe ele.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import "./lib/text-ro-global.mjs";

let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  try { await f(); console.log(`  ok   ${nume}`); }
  catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }
}
console.log("\nV100.268 · PRAGURILE PIEȚEI DINTR-UN SINGUR LOC (Acasă)\n");
const src = (f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8");
// fără macro.js întâi: acasa.js / alerte.js trebuie să meargă și singure (probele vechi le încarcă așa), cu ACELEAȘI praguri
vm.runInThisContext(src("acasa.js")); vm.runInThisContext(src("alerte.js"));
const faraMacro = { A: globalThis.Acasa, Al: globalThis.Alerte };
vm.runInThisContext(src("macro.js"));
const M = globalThis.Macro;

await test("1 Macro.PRAGURI + vixTreapta: calm sub 18, prudență 18–25, frică 25–30, panică peste 30 (sub 12: liniște prea mare)", () => {
  assert.equal(typeof M.vixTreapta, "function", "lipsește Macro.vixTreapta");
  const t = (v) => { const x = M.vixTreapta(v); return x.scor + " " + x.text.split(" (")[0]; };
  assert.deepEqual([11.9, 12, 17.9, 18, 24.9, 25, 29.9, 30, 45].map(t),
    ["1 liniște prea mare", "2 calm", "2 calm", "-1 prudență", "-1 prudență", "-2 frică", "-2 frică", "-3 panică", "-3 panică"]);
  assert.deepEqual(M.PRAGURI.vix, [12, 18, 25, 30]);
});
await test("2 Macro.legaturaBtc: împreună peste 0,6, parțial 0,2–0,6, decuplate până la −0,2, în sens opus sub", () => {
  assert.equal(typeof M.legaturaBtc, "function", "lipsește Macro.legaturaBtc");
  assert.deepEqual([0.61, 0.6, 0.47, 0.21, 0.2, 0, -0.19, -0.2, -0.5].map((r) => M.legaturaBtc(r).scor), [1, 0, 0, 0, -1, -1, -1, -2, -2]);
  assert.deepEqual(M.PRAGURI.btc, [0.6, 0.2, -0.2]);
});
await test("3 scorul macro e același ca înainte (aceleași trepte, aceleași texte în rândurile lui)", () => {
  const zile = (n, f) => Array.from({ length: n }, (_, i) => ({ t: Date.UTC(2026, 0, 1) + i * 86400000, c: f(i) }));
  for (const vix of [11, 15, 19, 27, 33]) {
    const r = M.scor({ vix: zile(40, () => vix) });
    const s = r.semne.find((x) => x.cod === "vix");
    assert.equal(s.scor, M.vixTreapta(vix).scor); assert.equal(s.text, M.vixTreapta(vix).text);
  }
});
await test("4 cardul Acasă (legătura BTC–Nasdaq) spune aceeași treaptă ca macro - r 0,47 nu mai e „bursa nu-l trage”", () => {
  const A = globalThis.Acasa;
  assert.equal(typeof A.textCorelatie, "function", "lipsește Acasa.textCorelatie");
  const cat = (t) => /urmează bursa/.test(t) ? 1 : /parțial legat/.test(t) ? 0 : /drumul lui/.test(t) ? -1 : /invers/.test(t) ? -2 : null;
  for (const r of [0.95, 0.61, 0.6, 0.47, 0.3, 0.2, 0.05, -0.19, -0.2, -0.6]) assert.equal(cat(A.textCorelatie(r)), M.legaturaBtc(r).scor, "r " + r + ": " + A.textCorelatie(r));
  /* fără macro.js încărcat (probele vechi): rezerva din acasa.js trebuie să aibă ACELEAȘI praguri */
  const Mg = globalThis.Macro; delete globalThis.Macro;
  try { for (const r of [0.61, 0.6, 0.47, 0.2, 0.05, -0.19, -0.2]) assert.equal(cat(faraMacro.A.textCorelatie(r)), Mg.legaturaBtc(r).scor, "fără macro.js, r " + r + ": " + faraMacro.A.textCorelatie(r)); }
  finally { globalThis.Macro = Mg; }
  /* corelatie() pe bare reale scrie textul treptei */
  const zile = (n, f) => Array.from({ length: n }, (_, i) => ({ t: Date.UTC(2026, 0, 5) + i * 86400000, c: f(i) }));
  const q = zile(60, (i) => 100 + 10 * Math.sin(i / 3) + (i % 7)), b = q.map((x, i) => ({ ...x, c: x.c * 800 * (1 + 0.03 * Math.cos(i * 1.7)) }));
  const c = A.corelatie(b, q, 30);
  assert.ok(c && Number.isFinite(c.r)); assert.equal(c.text, A.textCorelatie(c.r), "corelatie() nu folosește treptele comune");
});
await test("5 alerta „vremii”: «BTC urmează bursa» peste 0,6, «pe drumul lui» de la 0,2 în jos; între ele nimic (histerezis)", () => {
  const Al = globalThis.Alerte, T0 = Date.UTC(2026, 9, 29, 10), MIN = 60000;
  const V = (r) => ({ crypto: { nivel: "amestecat", eticheta: "🟡 AMESTECAT", titlu: "t", faCe: "f" }, bursa: { nivel: "larga", eticheta: "🟢 URCARE LARGĂ", titlu: "t", faCe: "f" }, corelatie: { r } });
  let s = Al.schimbareVreme(null, V(0.3), T0).stare;
  const pas = (r, k) => { let x = Al.schimbareVreme(s, V(r), T0 + k * MIN); x = Al.schimbareVreme(x.stare, V(r), T0 + (k + 1) * MIN); s = x.stare; return x.mesaje.map((m) => m.titlu).join(" | "); };
  assert.equal(pas(0.55, 10), "", "0,55 e „parțial”: nu e încă „urmează bursa”");
  assert.match(pas(0.62, 20), /BTC urmează bursa/);
  assert.equal(pas(0.3, 30), "", "0,3 e tot „parțial”: nu e încă „pe drumul lui”");
  assert.match(pas(0.15, 40), /pe drumul lui/);
});
await test("6 cadranul VIX de pe Acasă și verdictul bursei folosesc aceleași trepte (nu „sub 20 liniște”)", () => {
  const ec = src("acasa-ecran.js"), ac = src("acasa.js");
  assert.match(ec, /Macro\.vixTreapta\(vixU\)/, "cadranul nu ia treapta din Macro");
  assert.doesNotMatch(ec, /vixU < 20 \? "good"/, "a rămas pragul 20 pe cadran");
  assert.doesNotMatch(ec, /sub 20 bursa e liniștită/);
  assert.doesNotMatch(ac, /vix < 20 \? " liniștit"/, "verdictul bursei zice „liniștit” până la 20");
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
