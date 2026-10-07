// Proba v100.124 (07.10, el: „fa idei” pe ideile de după v100.123):
// (1) pe telefon banda botului are la capăt „⋯” - semnul că apăsarea lungă arată tot rândul (altfel nu știi că există);
// (2) proba de telefon (proba-ecran-telefon.mjs) rulează singură înainte de fiecare push care atinge public/, cât serverul
//     8788 rulează ȘI servește versiunea din depozit (altfel ar verifica alt cod - ex. push dintr-un worktree).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.124 · „⋯” pe banda botului, proba de telefon înainte de push · proba\n");

const css = citeste("public", "app.css"), html = citeste("public", "index.html");
function reguli(text) {
  const out = []; let media = "", adanc = 0, i = 0, start = 0;
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");
  while (i < text.length) {
    const c = text[i];
    if (c === "{") {
      const sel = text.slice(start, i).trim();
      if (sel.startsWith("@media")) { media = sel; adanc = 1; start = i + 1; }
      else if (sel.startsWith("@")) { let a = 0, j = i; for (; j < text.length; j++) { if (text[j] === "{") a++; else if (text[j] === "}" && --a === 0) break; } i = j; start = j + 1; }
      else { const j = text.indexOf("}", i); out.push({ sel: sel.split(",").map((s) => s.trim()), corp: text.slice(i + 1, j), media }); i = j; start = j + 1; }
    } else if (c === "}") { if (adanc) { adanc = 0; media = ""; } start = i + 1; }
    i++;
  }
  return out;
}
const R = reguli(css);
const maxW = (r) => { const m = /max-width:\s*(\d+)px/.exec(r.media); return m ? +m[1] : null; };
const peTelefon = (selector, re) => R.some((r) => r.sel.includes(selector) && maxW(r) >= 390 && maxW(r) <= 980 && !/min-width/.test(r.media) && re.test(r.corp));

await test("(1) pe telefon banda botului are „⋯” la capăt (în locul „…” tăiat), pe PC nu", () => {
  assert.ok(peTelefon(".botStrip::after", /content\s*:\s*"⋯"/), "lipsește „⋯” pe telefon");
  assert.ok(peTelefon(".botStrip", /text-overflow\s*:\s*clip/), "„…” și „⋯” unul lângă altul");
  assert.ok(!R.some((r) => r.media === "" && r.sel.includes(".botStrip::after")), "pe PC banda încape - fără „⋯”");
  assert.match(citeste("scripts", "proba-ecran-telefon.mjs"), /::after/, "proba de ecran vede „⋯” pe telefon");
});

const { deVerificat, aceeasiVersiune } = await import(pathToFileURL(path.join(RAD, "scripts", "inainte-de-push.mjs")).href);
const Z = "0".repeat(40), A = "a".repeat(40), B = "b".repeat(40);
await test("(2a) ce intervale verifică: push normal ⇒ remote..local; ramură nouă ⇒ origin/main..local; ștergere ⇒ nimic", () => {
  assert.deepEqual(deVerificat(`refs/heads/main ${B} refs/heads/main ${A}\n`), [`${A}..${B}`]);
  assert.deepEqual(deVerificat(`refs/heads/x ${B} refs/heads/x ${Z}\n`), [`origin/main..${B}`]);
  assert.deepEqual(deVerificat(`(delete) ${Z} refs/heads/x ${A}\n`), []);
  assert.deepEqual(deVerificat(""), []);
});
await test("(2b) proba pornește doar când serverul servește versiunea din depozit", () => {
  assert.equal(aceeasiVersiune('<meta content="v100.124" name="app-version"/>', '<meta content="v100.124" name="app-version"/>'), true);
  assert.equal(aceeasiVersiune('<meta content="v100.124" name="app-version"/>', '<meta content="v100.123" name="app-version"/>'), false);
  assert.equal(aceeasiVersiune("", '<meta content="v100.124" name="app-version"/>'), false);
});
await test("(2c) scriptul: doar la schimbări în public/, serverul viu (/health), proba cu ieșirea ei; ocolire cu SARI_PROBA_TELEFON=1", () => {
  const s = citeste("scripts", "inainte-de-push.mjs");
  assert.match(s, /startsWith\("public\/"\)/); assert.match(s, /127\.0\.0\.1:8788\/health/); assert.match(s, /proba-ecran-telefon\.mjs/);
  assert.match(s, /SARI_PROBA_TELEFON/); assert.match(s, /process\.exit\(r\.status/);
  assert.match(citeste("scripts", "hooks", "pre-push"), /node scripts\/inainte-de-push\.mjs/);
  const pj = JSON.parse(citeste("package.json")).scripts; assert.match(pj["instaleaza-hook"], /scripts\/hooks\/pre-push/);
});

await test("(E) versiunea v100.124 (colectorul neatins, v101.82)", () => {
  assert.match(html, /content="v100\.124"/); assert.match(html, /id="antetVersiune">v100\.124 /); assert.match(html, /id="healthAppVersion">v100\.124</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.124.0"); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-124";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.124"/); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100.124");
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.82";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
