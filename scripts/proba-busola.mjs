// Proba v100.64 (02.10, el: „FA TOT PLUS IDEI” - I-491 din backlog-ul suitei): Busola în fișa gridului.
// Singurul avantaj dovedit al Busolei e defensiv pe grid: după „mai agitat ca de obicei” gridul a pierdut cel mai mult,
// după „mai calm” cel mai puțin. Rândul AVERTIZEAZĂ, nu refuză (pragul botului e un privilegiu).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const B = new Function(`${fs.readFileSync(path.join(RAD, "public", "lib", "busola.js"), "utf8")}; return Busola;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.64 · Busola în fișa gridului (I-491) · proba\n");

const ACUM = Date.UTC(2026, 9, 2, 10, 0);
const REZ = {
  la: ACUM - 2 * 3600000, versiune: "1.27.0",
  monede: { BTC: { "4h": "miscare", grid4h: "miscare" }, NEAR: { "4h": "liniste" }, ETH: { grid4h: "nu-stiu" }, BONK: { grid4h: "liniste" } },
  grid: { interval: "4h", liniste: -0.00074962531, oricand: -0.0014935975, miscare: -0.0021398053 },
};
const REGULI = [[/\d\.\d/, "zecimală cu punct"], [/(^|[\s(·:])-\d/, "minus ASCII"], [/!/, "semn de exclamare"], [/NaN|undefined|null/, "gunoi"]];
const curat = (t) => { assert.ok(t.length <= 110, `prea lung (${t.length}): ${t}`); for (const [re, de] of REGULI) assert.ok(!re.test(t), `${de}: ${t}`); };

await test("simbolul Radarului → al Busolei: JTO_USDT_PERP → JTO, 1000BONK → BONK, ethusdt → ETH", () => {
  assert.equal(B.simbolBusola("JTO_USDT_PERP"), "JTO");
  assert.equal(B.simbolBusola("1000BONK_USDT_PERP"), "BONK");
  assert.equal(B.simbolBusola("ethusdt"), "ETH");
  assert.equal(B.simbolBusola("BTC"), "BTC");
});
await test("mai agitată ⇒ ATENȚIE, cu cifra gridului măsurat (−0,214%), fără „NU PORNI” (avertizează, nu refuză)", () => {
  const r = B.randGrid(REZ, "BTC_USDT_PERP", ACUM);
  assert.equal(r.nivel, "atentie");
  assert.match(r.text, /mai agitată ca de obicei/); assert.match(r.text, /−0,214%/); assert.match(r.text, /cel mai mult/);
  assert.doesNotMatch(r.text, /NU PORNI|nu porni/);
  curat(r.text);
});
await test("mai calmă ⇒ INFO, pierde cel mai puțin, dar spune că tot e pe minus (−0,075%)", () => {
  const r = B.randGrid(REZ, "NEAR_USDT_PERP", ACUM);
  assert.equal(r.nivel, "info"); assert.match(r.text, /mai calmă/); assert.match(r.text, /−0,075%/); assert.match(r.text, /pe minus/);
  curat(r.text);
});
await test("nimic neobișnuit ⇒ NEUTRU, cu gridul oarecare (−0,149%)", () => {
  const r = B.randGrid(REZ, "ETH_USDT_PERP", ACUM);
  assert.equal(r.nivel, "neutru"); assert.match(r.text, /nimic neobișnuit/); assert.match(r.text, /−0,149%/);
  curat(r.text);
});
await test("🔑 1000BONK (futures) găsește BONK (spot)", () => {
  assert.equal(B.randGrid(REZ, "1000BONK_USDT_PERP", ACUM).nivel, "info");
});
await test("moneda pe care Busola n-o măsoară ⇒ o spune, nu inventează", () => {
  const r = B.randGrid(REZ, "JTO_USDT_PERP", ACUM);
  assert.equal(r.nivel, "nemasurat"); assert.match(r.text, /n-a măsurat JTO/); curat(r.text);
});
await test("rezumatul vechi (> 6 h) ⇒ scrie vârsta; proaspăt ⇒ nu", () => {
  assert.equal(B.randGrid(REZ, "BTC", ACUM).varsta, null);
  assert.match(B.randGrid({ ...REZ, la: ACUM - 7 * 3600000 }, "BTC", ACUM).varsta, /acum 7 ore/);
});
await test("fără rezumat (încă neadus / Busola nu răspunde) ⇒ null, fișa nu desenează nimic", () => {
  assert.equal(B.randGrid(null, "BTC", ACUM), null);
  assert.equal(B.randGrid({ la: 1 }, "BTC", ACUM), null);
});
await test("HTML-ul: textul trece prin escape, ATENȚIE are clasa de avertisment", () => {
  const h = B.htmlRand({ nivel: "atentie", text: "<b>x</b>", varsta: null }, (s) => String(s).replace(/</g, "&lt;"));
  assert.match(h, /tbWarn/); assert.doesNotMatch(h, /<b>x/);
});
await test("încărcarea: adusă o dată, apoi din cache 30 min; după 31 min se readuce", async () => {
  B._reset();
  let cereri = 0;
  const f = async (url) => { cereri++; assert.equal(url, "https://busola.mferent80.workers.dev/api/rezumat.json"); return { ok: true, json: async () => REZ }; };
  assert.equal(await B.incarca(f, ACUM), true, "prima: date noi");
  assert.equal(await B.incarca(f, ACUM + 10 * 60000), false, "în cache: nimic nou");
  assert.equal(cereri, 1);
  assert.equal(await B.incarca(f, ACUM + 31 * 60000), true);
  assert.equal(cereri, 2);
  assert.equal(B.rezumat().versiune, "1.27.0");
});
await test("🔑 Busola cade ⇒ păstrează rezumatul vechi și NU reîncearcă la fiecare desen (fără buclă)", async () => {
  B._reset();
  let cereri = 0;
  await B.incarca(async () => ({ ok: true, json: async () => REZ }), ACUM);
  const cade = async () => { cereri++; throw new Error("rețea"); };
  assert.equal(await B.incarca(cade, ACUM + 31 * 60000), false);
  assert.equal(await B.incarca(cade, ACUM + 32 * 60000), false);
  assert.equal(cereri, 1, "a doua oară nu mai bate la ușă");
  assert.equal(B.rezumat().versiune, "1.27.0", "rezumatul vechi rămâne");
});
await test("două desene în același timp ⇒ o singură cerere", async () => {
  B._reset();
  let cereri = 0;
  const f = async () => { cereri++; await new Promise((r) => setTimeout(r, 20)); return { ok: true, json: async () => REZ }; };
  const [a, b] = await Promise.all([B.incarca(f, ACUM), B.incarca(f, ACUM)]);
  assert.equal(cereri, 1); assert.ok(a === true && b === true);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
