// Proba v100.50 (01.10, el: „fă tot” - pachetul 3: o singura voce, docs/superpowers/plans/2026-10-01-pachetul-3-o-singura-voce.md).
// I-479 motivele de acelasi nivel dupa banii MASURATI; I-473 de ce s-a schimbat verdictul; I-474 Consilierul in colector (poza, alerta,
// KV cons); I-472 jurnalul deciziilor.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.50 · O singura voce: ordinea dupa bani, de ce s-a schimbat, Consilierul in colector, deciziile · proba\n");

const comp = (cod, nivel, motiv) => ({ cod, nivel, motiv, faCe: "fa ceva pentru " + cod });
const sm = (componente, nivel) => ({ nivel: nivel || "atentie", cod: componente[0].cod, motiv: componente[0].motiv, faCe: componente[0].faCe, componente });
const soc = (o) => Object.fromEntries(Object.entries(o).map(([k, [jud, bani]]) => [k, { n: jud, judecate: jud, corecte: Math.round(jud / 2), bani, baniN: jud, stare: "nesigur", nume: k }]));

await test("I-479: doua motive „atentie” - costuri (15 judecate, −20 USDT) si trend (12 judecate, +50) -> trend intai (dupa banii masurati)", () => {
  const c = CS.alcatuieste({ sm: sm([comp("costuri", "atentie", "costurile pe zi depășesc grilele"), comp("trend", "atentie", "trendul e împotriva botului")]), socoteala: soc({ costuri: [15, -20], trend: [12, 50] }) });
  assert.deepEqual(c.motive.map((m) => m.cod), ["trend", "costuri"]);
});
await test("I-479: sub 10 judecate -> ordinea fixa de azi (costuri inaintea trendului)", () => {
  const c = CS.alcatuieste({ sm: sm([comp("costuri", "atentie", "costurile"), comp("trend", "atentie", "trendul")]), socoteala: soc({ costuri: [15, -20], trend: [9, 50] }) });
  assert.deepEqual(c.motive.map((m) => m.cod), ["costuri", "trend"]);
});
await test("I-479: planul (siguranta) ramane inaintea unui motiv „atentie” care a adus mai multi bani", () => {
  const c = CS.alcatuieste({ sm: sm([comp("trend", "atentie", "trendul"), comp("plan", "atentie", "planul: afară peste prag")]), socoteala: soc({ plan: [20, -100], trend: [30, 200] }) });
  assert.deepEqual(c.motive.map((m) => m.cod), ["plan", "trend"]);
});
await test("I-473: deCe - din ce verdict in care, ce motive au aparut si ce au disparut; nimic schimbat -> null", () => {
  assert.ok(typeof CS.deCe === "function", "lipseste Consiliu.deCe");
  const a = { nivel: "tine", motive: [{ cod: "liniste", titlu: "Piața e liniștită" }] }, b = { nivel: "atentie", motive: [{ cod: "stop", titlu: "Stopul e peste plan" }, { cod: "liniste", titlu: "Piața e liniștită" }] };
  const d = CS.deCe(a, b);
  assert.match(d.text, /din 🟢 Ține în 🟡 Atenție/); assert.match(d.text, /\+ Stopul e peste plan/); assert.ok(!/− Piața/.test(d.text));
  assert.match(CS.deCe(b, a).text, /− Stopul e peste plan/);
  assert.equal(CS.deCe(b, b), null);
});

// ---- pasul 2: Consilierul in colector (I-474) ----
const consDe = (nivel, motive) => ({ nivel, eticheta: { tine: "🟢 Ține", atentie: "🟡 Atenție", iesi: "🔴 Ieși" }[nivel], titlu: motive[0] ? motive[0].titlu : "nimic", faCe: "fa " + nivel, bani: nivel === "iesi" ? "pierderea maximă: −10" : null, motive });
await test("pentruPoza: forma semaforului (nivel, motiv, faCe cu banii, componente) - pagina alerts o citeste fara schimbare; „asteapta” ramane asteapta", () => {
  assert.ok(typeof CS.pentruPoza === "function", "lipseste Consiliu.pentruPoza");
  const p = CS.pentruPoza(consDe("iesi", [{ cod: "lichidare", titlu: "Lichidarea e la 6%" }, { cod: "trend", titlu: "Trendul e contra" }]));
  assert.equal(p.nivel, "iesi"); assert.equal(p.motiv, "Lichidarea e la 6%"); assert.match(p.faCe, /fa iesi.*pierderea maximă/);
  assert.deepEqual(p.componente.map((c) => c.motiv), ["Lichidarea e la 6%", "Trendul e contra"]);
  assert.equal(CS.pentruPoza({ nivel: "asteapta", titlu: "încă socotesc" }).nivel, "asteapta");
});
await test("schimbare: prima vedere fara alerta; nivel nou confirmat la a doua tura -> alerta cu actiunea, banii si de ce; pâlpâirea -> nimic", () => {
  assert.ok(typeof CS.schimbare === "function", "lipseste Consiliu.schimbare");
  const T = consDe("tine", [{ cod: "liniste", titlu: "Piața e liniștită" }]), A = consDe("atentie", [{ cod: "stop", titlu: "Stopul e peste plan" }]);
  let r = CS.schimbare(null, T, 1, "CRV"); assert.equal(r.alerta, null);
  r = CS.schimbare(r.stare, A, 2, "CRV"); assert.equal(r.alerta, null, "prima tura cu nivel nou: doar asteapta confirmarea");
  r = CS.schimbare(r.stare, T, 3, "CRV"); assert.equal(r.alerta, null);
  r = CS.schimbare(r.stare, A, 4, "CRV"); assert.equal(r.alerta, null, "pâlpâire: confirmarea o ia de la capat");
  r = CS.schimbare(r.stare, A, 5, "CRV");
  assert.ok(r.alerta && r.alerta.nivel === "atentie" && !r.alerta.doarRadar); assert.match(r.alerta.titlu, /CRV: Consilierul — 🟡 Atenție/);
  assert.match(r.alerta.mesaj, /Ce aș face eu: fa atentie/); assert.match(r.alerta.mesaj, /De ce: din 🟢 Ține în 🟡 Atenție · \+ Stopul e peste plan/);
  assert.equal(r.stare.inainte.nivel, "tine"); assert.equal(r.stare.schimbatLa, 5);
  r = CS.schimbare(r.stare, T, 6, "CRV"); r = CS.schimbare(r.stare, T, 7, "CRV"); assert.ok(r.alerta && r.alerta.doarRadar, "inapoi la ȚINE: doar in Radar");
  assert.equal(CS.schimbare(r.stare, { nivel: "asteapta" }, 8, "CRV").alerta, null);
});
await test("colectorul: alcatuieste Consilierul, il pune in poza, trimite schimbarea si KV cons; „s-iesi” al semaforului doar in Radar (o singura voce pe Discord); ruta cons", async () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), al = fs.readFileSync(path.join(RAD, "public", "lib", "alerte.js"), "utf8");
  assert.match(col, /consiliu\.js/); assert.match(col, /Consiliu\.alcatuieste\(/); assert.match(col, /Consiliu\.pentruPoza\(x\.cons\)/); assert.match(col, /Consiliu\.schimbare\(/); assert.match(col, /action=cons"/);
  assert.match(al, /out\["s-iesi"\][^\n]*doarRadar: true/);
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const st = { acum: { nivel: "atentie", titlu: "x", motive: [] }, inainte: { nivel: "tine", motive: [] }, schimbatLa: 5, deCe: "din 🟢 Ține în 🟡 Atenție" };
  const r = await mod.onRequestPost({ request: cer("POST", "action=cons", { bot: "2394", ...st }), env }); assert.equal(r.status, 200, await r.clone().text());
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=cons&bot=2394"), env })).json(); assert.equal(g.cons.deCe, st.deCe); assert.equal(g.cons.acum.nivel, "atentie");
});

// ---- pasul 3: jurnalul deciziilor (I-472) + „de ce” pe Tablou (I-473) ----
const ORA = 3600000;
await test("judecaDecizii: la 24 h din istoricul botului; botul inchis inainte -> pe rezultatul final; ziua netrecuta -> nejudecat", () => {
  assert.ok(typeof CS.judecaDecizii === "function", "lipseste Consiliu.judecaDecizii");
  const ist = Array.from({ length: 30 }, (_, i) => ({ t: i * ORA, profitTotal: i * 0.1 }));
  const d = [{ t: 2 * ORA, total: 0.2, urmat: true }, { t: 20 * ORA, total: 2, urmat: false }];
  const r = CS.judecaDecizii(d, ist, null, 29 * ORA);
  assert.ok(Math.abs(r[0].r - 2.4) < 1e-9, String(r[0].r)); assert.equal(r[1].r, undefined, "ziua n-a trecut");
  const f = CS.judecaDecizii([{ t: 20 * ORA, total: 2, urmat: false }], ist, { total: -5, la: 25 * ORA }, 30 * ORA);
  assert.equal(f[0].r, -7, "botul inchis la 25 h: final − atunci");
});
await test("socotealaDecizii: urmat vs neurmat cu mediana; sub 30 judecate -> „încă N din 30”", () => {
  const l = Array.from({ length: 40 }, (_, i) => ({ urmat: i % 2 === 0, r: i % 2 === 0 ? 1 : -1 }));
  const s = CS.socotealaDecizii(l); assert.equal(s.urmat.n, 20); assert.equal(s.urmat.median, 1); assert.equal(s.neurmat.median, -1); assert.match(s.text, /Când ai urmat/);
  assert.match(CS.socotealaDecizii(l.slice(0, 10)).text, /10 din 30/);
});
await test("server: o decizie pe verdict (a doua o inlocuieste), socoteala deciziilor; Tabloul: „de ce” si butoanele", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const dec = (urmat) => ({ bot: "2394", t: Date.now(), cheie: "atentie|Stopul e peste plan", nivel: "atentie", titlu: "Stopul e peste plan", faCe: "mută stopul", urmat, total: -3.2 });
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=decizie", dec(true)), env })).status, 200);
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=decizie", dec(false)), env })).status, 200);
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=decizie&bot=2394"), env })).json();
  assert.equal(g.decizii.length, 1); assert.equal(g.decizii[0].urmat, false);
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=deciziiSocoteala", { la: 1, urmat: { n: 3, median: 1 }, neurmat: { n: 2, median: -1 }, text: "x" }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=deciziiSocoteala"), env })).json()).socoteala.urmat.n, 3);
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(app, /tbConsDeCe/); assert.match(app, /tbDecizie\(true\)/); assert.match(app, /tbDecizie\(false\)/); assert.match(app, /action=cons&bot=/);
  assert.match(col, /Consiliu\.judecaDecizii\(/); assert.match(col, /action=deciziiSocoteala/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
