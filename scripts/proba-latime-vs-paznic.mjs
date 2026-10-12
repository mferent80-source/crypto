// Comparația lățimii Radarului cu PAZNIC (I-587): citește C:\Users\Cimin\PAZNIC-CRYPTO\stare.json și KV-ul local `latime`, la ture
// apropiate (≤ 15 min), și scrie Δ pe agregate + acordul pe direcții. Criteriul, scris ÎNAINTE (spec §3): |Δ| ≤ 3 pe sus / jos /
// mariLong / volExtrem / oiExtrem și acord ≥ 95 % pe direcțiile monedelor comune, 3 zile la rând ⇒ EL oprește Paznic Robot / Paza /
// Panou / Publica. Rulare: node scripts/proba-latime-vs-paznic.mjs   (adaugă un rând în data/latime-vs-paznic.jsonl)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), BAZA = (process.argv[2] || "http://127.0.0.1:8788").replace(/\/+$/, "");
const jeton = (fs.readFileSync(path.join(RAD, ".dev.vars"), "utf8").split(/\r?\n/).find((l) => l.startsWith("APP_API_TOKEN=")) || "").slice("APP_API_TOKEN=".length).trim();
const paznic = JSON.parse(fs.readFileSync("C:/Users/Cimin/PAZNIC-CRYPTO/stare.json", "utf8"));
const r = await (await fetch(BAZA + "/api/istoric-bot?action=latime", { headers: { authorization: "Bearer " + jeton } })).json();
const a = r && r.latime && r.latime.acum; if (!a) { console.log("KV fără lățime - rulează node scripts/tura-latime-o-data.mjs"); process.exit(1); }
const dt = Math.abs(a.la - Date.parse(paznic.cand)) / 60000;
const L = paznic.latime, dTotal = { sus: a.lat.sus - L.sus, jos: a.lat.jos - L.jos, mariLong: a.lat.mariLong - L.mariLong, volExtrem: a.lat.volExtrem - L.volExtrem, oiExtrem: a.lat.oiExtrem - L.oiExtrem };
const dirRadar = new Map(a.monede.map((m) => [m.sym, m.dir])), comune = Object.keys(paznic.dir).filter((s) => dirRadar.has(s));
// 12.10.2026: totalurile se calculau pe liste DIFERITE (129 de monede comune din 150; restul de ~20 diferă, multe listate de curând
// și foarte volatile) ⇒ Δ volExtrem 9 venea doar din cele 20, pe comune era 0 (27 = 27). Acum Δ = pe monedele COMUNE, aceeași formulă
// (volPctl ≥ 90, oiPctl ≥ 95, direcția); mariLong rămâne pe totaluri (PAZNIC nu-l dă pe monedă). dTotal rămâne în jurnal, la vedere.
// revizia Opus v100.171: fără lista pe monede din PAZNIC, Δ pe comune ar ieși 0 și criteriul ar „trece” fără date
if (!Array.isArray(paznic.simboluri) || !paznic.simboluri.length) { console.log("stare.json din PAZNIC n-are lista pe monede (simboluri) — comparația nu se poate face azi, nu scriu nimic"); process.exit(1); }
const RM = new Map(a.monede.map((m) => [m.sym, m])), PM = new Map((paznic.simboluri || []).map((x) => [x.sym, x]));
const peComune = (f) => comune.filter((s) => PM.has(s) && f(RM.get(s), "R")).length - comune.filter((s) => PM.has(s) && f(PM.get(s), "P")).length;
const dirDe = (m, cine, s) => (cine === "R" ? m.dir : (paznic.dir[m.sym] || m.dir));
const d = { sus: peComune((m, c) => dirDe(m, c) === "SUS"), jos: peComune((m, c) => dirDe(m, c) === "JOS"), mariLong: dTotal.mariLong,
  volExtrem: peComune((m) => m.volPctl != null && m.volPctl >= 90), oiExtrem: peComune((m) => m.oiPctl != null && m.oiPctl >= 95) };
const acord = comune.filter((s) => paznic.dir[s] === dirRadar.get(s)).length;
const rand = { la: a.la, paznicLa: paznic.cand, minuteIntre: Math.round(dt), regimRadar: a.regim.cod, regimPaznic: paznic.regim.cod, delta: d, deltaTotal: dTotal, comune: comune.length, acordPct: comune.length ? Math.round(1000 * acord / comune.length) / 10 : null };
rand.trece = dt <= 15 && Object.values(d).every((x) => Math.abs(x) <= 3) && rand.acordPct !== null && rand.acordPct >= 95;
console.log(JSON.stringify(rand, null, 1));
const FIS = path.join(RAD, "data", "latime-vs-paznic.jsonl");
fs.mkdirSync(path.dirname(FIS), { recursive: true }); fs.appendFileSync(FIS, JSON.stringify(rand) + "\n");
const toate = fs.readFileSync(FIS, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const zile = new Set(toate.filter((x) => x.trece).map((x) => new Date(x.la).toISOString().slice(0, 10)));
console.log(zile.size >= 3 ? "\nCRITERIUL TRECE pe " + zile.size + " zile: EL poate opri sarcinile Paznic Robot / Paznic Paza / Paznic Panou / Paznic Publica (PowerShell: Get-ScheduledTask -TaskName 'Paznic Robot','Paznic Paza','Paznic Panou','Paznic Publica' | Disable-ScheduledTask)." : "\nîncă " + (3 - zile.size) + " zile cu criteriul trecut (azi: " + (rand.trece ? "trece" : "NU trece - minute între ture " + Math.round(dt) + ", Δ " + JSON.stringify(d) + ", acord " + rand.acordPct + " %") + ")");
