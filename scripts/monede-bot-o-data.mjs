// Radar v100.395: tura monedelor de bot direcțional, o singură dată, pe datele vii (Binance Futures + Pionex public), FĂRĂ server și fără Discord:
// corpul care ar pleca în KV se scrie în fișierul dat (implicit data/monede-bot-o-data.json), mesajele Discord doar se tipăresc.
//   node scripts/monede-bot-o-data.mjs [iesire.json] [--boti MMT:short,BNB:short]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { turaMonedeBot } from "./lib/tura-monede-bot.mjs";
import { cereBinance } from "./lib/tura-latime.mjs";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", "monede-bot.js"), "utf8"));
const MonedeBot = globalThis.MonedeBot;
const arg = process.argv.slice(2), iesire = arg.find((a) => a.endsWith(".json")) || path.join(RAD, "data", "monede-bot-o-data.json");
const bi = arg.indexOf("--boti"), boti = bi >= 0 ? String(arg[bi + 1] || "").split(",").filter(Boolean).map((x) => { const [s, dir] = x.split(":"); return { s: s.toUpperCase(), dir: (dir || "").toLowerCase() }; }) : [];
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
const binance = cereBinance({ fetch: globalThis.fetch, pauza, jurnal: (...a) => console.log(...a) });
let corp = null; const mesaje = [];
const cere = async (cale) => {
  if (!/pionex_symbols/.test(cale)) throw new Error("cale necunoscută " + cale);
  const r = await fetch("https://api.pionex.com/api/v1/common/symbols?type=PERP", { headers: { "user-agent": "crypto-radar/1.0" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error("Pionex HTTP " + r.status); return r.json();
};
const t0 = Date.now();
const r = await turaMonedeBot({ acum: Date.now(), binance, cere, trimite: async (cale, c) => { corp = c; return { ok: true }; }, trimiteAlerta: async (m) => { mesaje.push(m); return true; },
  jurnal: (...a) => console.log(...a), MonedeBot, boti: () => boti, citesteDisc: () => ({ pornit: true }), scrieDisc: () => {} }, {});
console.log(JSON.stringify(r), "·", Math.round((Date.now() - t0) / 1000) + " s");
if (corp) fs.writeFileSync(iesire, JSON.stringify(corp, null, 1));
for (const m of mesaje) console.log("\n[DISCORD " + m.nivel + "] " + m.titlu + "\n" + m.mesaj);
