// Proba v101.6 (29.09, el: „pagina botului pe telefon nu poate sa ramana mereu o adresa?” -> „TAILSCALE” -> „DA”):
// colectorul pune in poza (butoanele de pe alerts) si in rezumatul de dimineata adresa FIXA prin Tailscale,
// iar tunelul trycloudflare ramane doar rezerva.
import assert from "node:assert/strict";
import fs from "node:fs";
import { adresaTailscale } from "./lib/adresa-radar.mjs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV101.6 · adresa fixa prin Tailscale · proba\n");

// forma reala din `tailscale serve status --json` pe PC-ul lui (29.09), cu gestiunea pe 443
const SERVE = {
  TCP: { 443: { HTTPS: true }, 8443: { HTTPS: true } },
  Web: {
    "pc.tailabc.ts.net:443": { Handlers: { "/": { Proxy: "https+insecure://127.0.0.1:8787" } } },
    "pc.tailabc.ts.net:8443": { Handlers: { "/": { Proxy: "http://127.0.0.1:8788" } } },
  },
};

await test("gaseste portul care duce la Radar (8788), nu gestiunea de pe 443", () => {
  assert.equal(adresaTailscale(SERVE, "http://127.0.0.1:8788"), "https://pc.tailabc.ts.net:8443");
});
await test("Radarul servit pe 443 -> adresa fara port", () => {
  assert.equal(adresaTailscale({ Web: { "pc.tailabc.ts.net:443": { Handlers: { "/": { Proxy: "http://localhost:8788/" } } } } }, "http://127.0.0.1:8788"), "https://pc.tailabc.ts.net");
});
await test("fara serve pentru Radar / tailscale lipsa / JSON stricat -> null (ramane tunelul)", () => {
  assert.strictEqual(adresaTailscale({ Web: { "pc.tailabc.ts.net:443": SERVE.Web["pc.tailabc.ts.net:443"] } }, "http://127.0.0.1:8788"), null);
  assert.strictEqual(adresaTailscale(null, "http://127.0.0.1:8788"), null);
  assert.strictEqual(adresaTailscale({}, "http://127.0.0.1:8788"), null);
  assert.strictEqual(adresaTailscale(SERVE, "nu-e-adresa"), null);
});
await test("nu confunda portul: 18788 nu e 8788; o gazda care nu e *.ts.net nu se ia", () => {
  assert.strictEqual(adresaTailscale({ Web: { "pc.tailabc.ts.net:8443": { Handlers: { "/": { Proxy: "http://127.0.0.1:18788" } } } } }, "http://127.0.0.1:8788"), null);
  assert.strictEqual(adresaTailscale({ Web: { "rau.example.com:8443": { Handlers: { "/": { Proxy: "http://127.0.0.1:8788" } } } } }, "http://127.0.0.1:8788"), null);
});

const COL = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
await test("colectorul: adresa fixa INAINTE de tunel, verificata ca Radar", () => {
  const f = COL.slice(COL.indexOf("async function adresaRadarului"), COL.indexOf("let pozaOkLa"));
  assert.ok(f.length > 50, "adresaRadarului lipseste");
  const iFix = f.indexOf("adresaTailscale("), iTunel = f.indexOf("adresaTunel(");
  assert.ok(iFix > 0 && iTunel > iFix, "Tailscale trebuie incercat inaintea tunelului");
  assert.match(f, /raspundeCaRadar\(fix/);
});
await test("rezumatul de dimineata ia linkul din aceeasi adresaRadarului (nu mai citeste jurnalul tunelului separat)", () => {
  assert.match(COL, /out\.link = await adresaRadarului\(\)|const u = await adresaRadarului\(\); if \(u\) out\.link = u;/);
  assert.equal((COL.match(/crypto-radar-tunel\.log/g) || []).length, 1, "jurnalul tunelului se citeste intr-un singur loc");
});

await test("calea spre tailscale.exe din colector e reala (fara \\t = TAB) si, pe PC-ul cu Tailscale, da adresa Radarului", async () => {
  const m = COL.match(/process\.env\.TAILSCALE_EXE \|\| "([^"]+)"/);
  assert.ok(m, "calea lipseste");
  assert.equal(m[1], "C:/Program Files/Tailscale/tailscale.exe");
  if (!fs.existsSync(m[1])) return console.log("       (fara Tailscale pe masina asta - doar forma caii)");
  const { execFileSync } = await import("node:child_process");
  const u = adresaTailscale(JSON.parse(execFileSync(m[1], ["serve", "status", "--json"], { encoding: "utf8", windowsHide: true })), "http://127.0.0.1:8788");
  console.log("       adresa gasita:", u ? u.replace(/^https:\/\/[^.]+\./, "https://…​.") : null);
  if (u) { const r = await fetch(u + "/api/market?type=health", { signal: AbortSignal.timeout(8000) }); assert.equal((await r.json()).service, "crypto-radar"); }
});

console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
