// O singură tură de lățime, pe viu (Binance real), publicată în KV-ul local (:8788). Pentru poze, comparația cu PAZNIC și ca să vezi
// cifrele fără să aștepți repornirea colectorului:  node scripts/tura-latime-o-data.mjs [url]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { turaLatime, cereBinance } from "./lib/tura-latime.mjs";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), BAZA = (process.argv[2] || "http://127.0.0.1:8788").replace(/\/+$/, "");
for (const f of ["text-ro.js", "latime.js"]) vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"));
const jeton = (fs.readFileSync(path.join(RAD, ".dev.vars"), "utf8").split(/\r?\n/).find((l) => l.startsWith("APP_API_TOKEN=")) || "").slice("APP_API_TOKEN=".length).trim();
if (!jeton) { console.error("fără APP_API_TOKEN în .dev.vars"); process.exit(1); }
const pauza = (ms) => new Promise((r) => setTimeout(r, ms)), jurnal = (...a) => console.log(new Date().toLocaleTimeString("ro-RO"), ...a);
const trimite = async (cale, corp) => { const r = await fetch(BAZA + cale, { method: "POST", body: JSON.stringify(corp), headers: { "content-type": "application/json", origin: BAZA, authorization: "Bearer " + jeton, "x-radar-client": "colector" } }); if (!r.ok) throw new Error("KV " + r.status + " " + (await r.text()).slice(0, 200)); return r.json(); };
const t0 = Date.now(), st = {};
await turaLatime({ binance: cereBinance({ pauza, jurnal }), trimite, jurnal, pauza, Latime: globalThis.Latime, botiSimboluri: () => [] }, st, Date.now());
console.log("gata în", Math.round((Date.now() - t0) / 1000), "s ·", JSON.stringify(st.ultima));
