// Probele auditului sever din 23.10.2026, felia ECRANULUI (layout, UX, texte, formatare, accesibilitate).
// Fiecare test numește punctul din listă (1..26). Gărzile sunt pe desen (modulele pure) unde se poate, textuale unde nu.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js"), IDX = citeste("public", "index.html"), CSS = citeste("public", "app.css");
const LIB = (f) => citeste("public", "lib", f);
const fnApp = (nume) => { const i = APP.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i, j < 0 ? undefined : j); };
const TR = globalThis.TextRo;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\naudit 23.10 · ecranul · proba\n");

// ---------------------------------------------------------------- 1. scara de preț crește cu textul
const SRC_GB = ["public/lib/grid-calcul.js", "public/lib/tablou-extra.js", "public/lib/semnale-bot.js", "public/lib/grafic-bot.js"].map((f) => citeste(f)).join("\n");
const GB = new Function(`${SRC_GB}; return typeof GraficBot !== "undefined" ? GraficBot : null;`)();
const T0 = 1_790_500_000_000, M5 = 5 * 60000;
function klines(baza, n = 288) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = baza * (1 - 0.087 * (i / (n - 1)) + 0.0065 * Math.sin(i / 5)), o = i ? Number(out[i - 1].close) : c;
    out.push({ time: T0 + i * M5, open: String(o), close: String(c), high: String(Math.max(o, c) * 1.002), low: String(Math.min(o, c) * 0.998), volume: String(1000 + 500 * Math.abs(Math.sin(i / 7))) });
  }
  return out.reverse();
}
const latText = (s) => Math.round(s.length * 6.3);   // 11 px, cifre ≈ 6,3 px
await test("1a PEPE (0,0000049…): scara crește cu textul — eticheta gbAxa nu intră peste lumânări, cutia gbAxaAcum își cuprinde textul", () => {
  const d = GB.desen({ bare: GB.bare(klines(0.0000052)), W: 1000, ingust: false, st: {}, niv: [], grila: {}, per: "24h", pretViu: 0.0000049623 });
  const gut = d.harta.W - d.harta.plotW;
  const axe = [...d.svg.matchAll(/<text class="gbAxa" x="([\d.]+)"[^>]*>([^<]+)</g)].map((m) => ({ x: Number(m[1]), t: m[2] }));
  assert.equal(axe.length, 3, "trei prețuri");
  for (const a of axe) assert.ok(a.x - latText(a.t) >= d.harta.plotW + 2, `„${a.t}” începe la ${a.x - latText(a.t)}, plotul se termină la ${d.harta.plotW} (scara ${gut})`);
  const m = d.svg.match(/<g class="gbAxaAcum"><rect x="([\d.]+)" y="[\d.]+" width="(\d+)"[^>]*\/><text x="([\d.]+)"[^>]*>([^<]+)</);
  assert.ok(m, "lipsește gbAxaAcum");
  assert.ok(Number(m[2]) >= latText(m[4]) + 6, `cutia ${m[2]} px, textul „${m[4]}” ≈ ${latText(m[4])} px`);
  assert.ok(Number(m[1]) >= d.harta.plotW, "cutia prețului de acum intră peste lumânări");
});
await test("1b JTO (0,5…): scara rămâne 52 px (minimul), plotW 948 la 1000 px; scara oprită ⇒ 0", () => {
  const d = GB.desen({ bare: GB.bare(klines(0.62)), W: 1000, ingust: false, st: {}, niv: [], grila: {}, per: "24h" });
  assert.equal(d.harta.plotW, 948);
  const off = GB.desen({ bare: GB.bare(klines(0.0000052)), W: 1000, ingust: false, st: {}, niv: [], grila: {}, per: "24h", scara: false });
  assert.equal(off.harta.plotW, 1000);
  const tel = GB.desen({ bare: GB.bare(klines(0.0000052)), W: 390, ingust: true, st: {}, niv: [], grila: {}, per: "24h" });
  assert.equal(tel.harta.plotW, 390, "telefonul nu are scară");
});

console.log(`\n${teste - picate}/${teste} trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
process.exit(picate ? 1 : 0);
