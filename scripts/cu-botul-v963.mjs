// Proba v96.3 (27.09, cererea lui: "daca miscarea e CU botul nu ar trebui sa ma sfatuiasca sa ies, ci cum continuam").
// Regimul spune sensul miscarii; semaforul, sfaturile, fereastra indicatorilor si alerta pe Discord tin cont de el.
// Masuratoarea care sta in spate: scripts/grid-directie-real.mjs (40 monede, 6480 ferestre: cu 59%, contra 50%, liniste 56%).
// Rulare: node scripts/cu-botul-v963.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

for (const f of ["grid-calcul.js", "alerte.js", "semnale-bot.js", "sfaturi.js", "indicatori-bot.js"]) vm.runInThisContext(fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8"));
const { GridCalcul: G, SemnaleBot: S, Sfaturi, IndicatoriBot: I, Alerte: A } = globalThis;
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
// 200 de bare de 15M linistite (+-0,1%), apoi un salt de +/-8% pe ultima zi
const bare = (salt) => Array.from({ length: 300 }, (_, i) => { const c = 100 * (1 + (i % 2 ? 0.001 : -0.001)) * (i >= 204 ? 1 + salt * (i - 203) / 96 : 1); return { t: i, o: c, h: c * 1.001, l: c * 0.999, c }; });
const SUS = G.regim(bare(0.08)), JOS = G.regim(bare(-0.08)), LIN = G.regim(bare(0));
const bot = (o) => ({ directie: "long", pretCurent: 30, gridJos: 25, gridSus: 33, profitTotal: 1, investit: 100, distantaLichidarePct: 30, ...o });

await test("regimul: saltul in sus = miscare cu sensul 'urca', in jos = 'coboara', linistea fara sens", async () => {
  assert.equal(SUS.miscare, true); assert.equal(SUS.sens, "urca"); assert.ok(SUS.s24h > 0.07);
  assert.equal(JOS.miscare, true); assert.equal(JOS.sens, "coboara");
  assert.equal(LIN.miscare, false); assert.equal(LIN.sens, null);
  assert.equal(S.sensFata(bot(), SUS), "cu"); assert.equal(S.sensFata(bot(), JOS), "contra"); assert.equal(S.sensFata(bot({ directie: "short" }), JOS), "cu");
  assert.equal(S.sensFata(bot({ directie: "neutru" }), SUS), null, "la botul neutru mișcarea n-are sens față de el"); assert.equal(S.sensFata(bot(), LIN), null);
});
await test("semafor: long + miscare in sus = 🟢 'lucreaza pentru tine' cu pasii (zero, marginea de sus); nu 'nu adauga' / 'incaseaza'", async () => {
  const r = S.semafor({ bot: bot(), fisa: { regim: SUS }, zero: { pretZero: 28.5 }, iaProfit: S.iaProfit(bot({ profitTotal: 5 }), { regim: SUS }) });
  assert.equal(r.nivel, "tine"); assert.equal(r.cod, "cu-botul"); assert.match(r.motiv, /^mișcarea e cu botul .*lucrează pentru tine$/);
  assert.match(r.faCe, /fără bani în plus/); assert.match(r.faCe, /opritorul de pierdere la prețul de zero \(28\.5000\)/); assert.match(r.faCe, /marginea de sus \(33\.0000\) mai sunt 10,0%/);
  assert.equal(S.iaProfit(bot({ profitTotal: 5 }), { regim: SUS }), null, "profitul nu se încasează doar pentru că piața merge cu botul");
});
await test("semafor: long + miscare in jos = 🟡 'miscare mare impotriva botului'; si 'ia profit' ramane pe miscarea contra", async () => {
  const r = S.semafor({ bot: bot(), fisa: { regim: JOS } });
  assert.equal(r.nivel, "atentie"); assert.equal(r.cod, "miscare"); assert.match(r.motiv, /împotriva botului/);
  assert.ok(S.iaProfit(bot({ profitTotal: 5 }), { regim: JOS }), "pe mișcarea contra, cu profit, sfatul de încasat rămâne");
  const n = S.semafor({ bot: bot({ directie: "neutru" }), fisa: { regim: SUS } }); assert.equal(n.cod, "miscare", "botul neutru: ca înainte"); assert.doesNotMatch(n.motiv, /împotriva/);
});
await test("semafor cu botul: opritorul deja peste zero e laudat; pretul trecut de margine -> incasezi sau grid nou; short oglindit", async () => {
  const a = S.semafor({ bot: bot({ opritorPierdereActiv: true, opritorPierdere: 29 }), fisa: { regim: SUS }, zero: { pretZero: 28.5 } });
  assert.match(a.faCe, /Opritorul tău \(29\.0000\) e deja dincolo de prețul de zero/);
  const b = S.semafor({ bot: bot({ pretCurent: 34 }), fisa: { regim: SUS }, zero: { pretZero: 28.5 } }); assert.match(b.faCe, /a trecut de marginea de sus/);
  const s = S.semafor({ bot: bot({ directie: "short", pretCurent: 30, gridJos: 27, gridSus: 35 }), fisa: { regim: JOS }, zero: { pretZero: 31 } });
  assert.equal(s.cod, "cu-botul"); assert.match(s.faCe, /grilele de jos/); assert.match(s.faCe, /marginea de jos \(27\.0000\) mai sunt 10,0%/);
  const pierdere = S.semafor({ bot: bot(), fisa: { regim: SUS }, zero: { pretZero: 31 } }); assert.doesNotMatch(pierdere.faCe, /prețul de zero/, "pe minus nu se propune opritor la zero");
});
await test("semafor: tinta LUI atinsa cu piata cu botul -> ramane 🔴 (planul lui), dar spune 'sau muti tinta, constient'", async () => {
  const r = S.semafor({ bot: bot(), fisa: { regim: SUS }, plan: { atins: ["plus"], plus: { prag: 5 } } });
  assert.equal(r.nivel, "iesi"); assert.match(r.faCe, /muți ținta mai sus/);
  assert.equal(S.semafor({ bot: bot(), fisa: { regim: JOS }, plan: { atins: ["plus"], plus: { prag: 5 } } }).faCe, "Încasează acum, cum ți-ai propus.");
});
await test("avertismentele reale bat 🟢: lichidare aproape + miscare cu botul = tot 🔴 lichidare", async () => {
  const r = S.semafor({ bot: bot({ distantaLichidarePct: 6 }), fisa: { regim: SUS } }); assert.equal(r.nivel, "iesi"); assert.equal(r.cod, "lichidare");
});
await test("sfaturile din Tablou: cu botul = ton 'bine' si ce faci; contra = 'atentie' cu 'impotriva botului'", async () => {
  const cu = Sfaturi.sfaturi({ bot: bot(), fisa: { regim: SUS } }).find((x) => /Mișcare mare/.test(x.titlu));
  assert.equal(cu.ton, "bine"); assert.match(cu.titlu, /CU botul/); assert.match(cu.faCe, /opritorul la prețul de zero/);
  const co = Sfaturi.sfaturi({ bot: bot(), fisa: { regim: JOS } }).find((x) => /Mișcare mare/.test(x.titlu));
  assert.equal(co.ton, "atentie"); assert.match(co.titlu, /împotriva botului/);
});
await test("fereastra indicatorilor: randul Miscarea e verde 'miscare cu botul', rosu 'contra botului'", async () => {
  const cu = I.mediu({ regim: SUS }, "long").find((x) => x.k === "miscare"), co = I.mediu({ regim: JOS }, "long").find((x) => x.k === "miscare");
  assert.equal(cu.ton, "bine"); assert.match(cu.text, /^mișcare cu botul/); assert.match(cu.titlu, /l-aș lăsa să lucreze/);
  assert.equal(co.ton, "rau"); assert.match(co.text, /^mișcare contra botului/);
});
await test("alerta pe Discord: miscarea cu botul pleaca 'info' (lasa-l sa lucreze), contra ramane 'atentie'", async () => {
  const b = { id: "1", baza: "VVV.PERP", directie: "long", activ: true, pretCurent: 30, gridJos: 25, gridSus: 33, distantaLichidarePct: 30 };
  const up = { regim: { ...SUS, r4h: 3, r24h: 3 } }, dn = { regim: { ...JOS, r4h: 3, r24h: 3 } };
  const cu = A.reguli(b, up).miscare, co = A.reguli(b, dn).miscare;
  assert.equal(cu.nivel, "info"); assert.match(cu.titlu, /CU botul — lasă-l să lucreze/); assert.doesNotMatch(cu.mesaj, /oprești/);
  assert.equal(co.nivel, "atentie"); assert.match(co.titlu, /împotriva botului/);
});

console.log(`CU_BOTUL_V963 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
