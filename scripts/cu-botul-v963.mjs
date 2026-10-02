// Proba v96.3 (27.09, cererea lui: "daca miscarea e CU botul nu ar trebui sa ma sfatuiasca sa ies, ci cum continuam").
// Regimul spune sensul miscarii; semaforul, sfaturile, fereastra indicatorilor si alerta pe Discord tin cont de el.
// Masuratoarea care sta in spate: scripts/grid-directie-real.mjs (40 monede, 6480 ferestre: cu 59%, contra 50%, liniste 56%).
// Rulare: node scripts/cu-botul-v963.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "sfaturi.js", "indicatori-bot.js"]) vm.runInThisContext(fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8"));
const { GridCalcul: G, SemnaleBot: S, Sfaturi, IndicatoriBot: I, Alerte: A, TabloExtra: T } = globalThis;
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
  assert.equal(r.nivel, "tine"); assert.equal(r.cod, "cu-botul"); assert.match(r.motiv, /^mișcarea e cu botul: \d+,\d× față de obișnuit$/);   // v100.61: titlul = faptul cu cifra
  assert.match(r.faCe, /fără bani în plus/); assert.match(r.faCe, /stopul la zero-ul botului \(28\.5\)/); assert.match(r.deCe, /marginea de sus \(33\) mai sunt 10,0%/);   // v100.61: distanta in „de ce”
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
  assert.match(a.faCe, /stopul \(29\) e deja dincolo de zero/);
  const b = S.semafor({ bot: bot({ pretCurent: 34 }), fisa: { regim: SUS }, zero: { pretZero: 28.5 } }); assert.match(b.faCe, /a trecut de marginea de sus/);
  const s = S.semafor({ bot: bot({ directie: "short", pretCurent: 30, gridJos: 27, gridSus: 35 }), fisa: { regim: JOS }, zero: { pretZero: 31 } });
  assert.equal(s.cod, "cu-botul"); assert.match(s.deCe, /grilele de jos/); assert.match(s.deCe, /marginea de jos \(27\) mai sunt 10,0%/);
  const pierdere = S.semafor({ bot: bot(), fisa: { regim: SUS }, zero: { pretZero: 31 } }); assert.doesNotMatch(pierdere.faCe, /zero-ul botului/, "pe minus nu se propune stop la zero");
});
await test("semafor: tinta LUI atinsa cu piata cu botul -> ramane 🔴 (planul lui), dar spune 'sau muti tinta, constient'", async () => {
  const r = S.semafor({ bot: bot(), fisa: { regim: SUS }, plan: { atins: ["plus"], plus: { prag: 5 } } });
  assert.equal(r.nivel, "iesi"); assert.match(r.faCe, /aș muta ținta mai sus/);
  assert.equal(S.semafor({ bot: bot(), fisa: { regim: JOS }, plan: { atins: ["plus"], plus: { prag: 5 } } }).faCe, "Aș închide botul pe plus acum, cum ți-ai propus.");
});
await test("avertismentele reale bat 🟢: lichidare aproape + miscare cu botul = tot 🔴 lichidare", async () => {
  const r = S.semafor({ bot: bot({ distantaLichidarePct: 6 }), fisa: { regim: SUS } }); assert.equal(r.nivel, "iesi"); assert.equal(r.cod, "lichidare");
});
await test("sfaturile din Tablou: cu botul = ton 'bine' si ce faci; contra = 'atentie' cu 'impotriva botului'", async () => {
  const cu = Sfaturi.sfaturi({ bot: bot(), fisa: { regim: SUS } }).find((x) => /^Mișcare /.test(x.titlu));   /* v100.62: titlul cu cifra */
  assert.equal(cu.ton, "bine"); assert.match(cu.titlu, /^Mișcare cu botul: /); assert.match(cu.faCe, /stopul mutat la zero-ul botului/);
  const co = Sfaturi.sfaturi({ bot: bot(), fisa: { regim: JOS } }).find((x) => /^Mișcare /.test(x.titlu));
  assert.equal(co.ton, "atentie"); assert.match(co.titlu, /^Mișcare mare contra botului: /);
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

// ---- v96.4: "tinta devine podea" (alegerea lui, 27.09: tinta atinsa, conditii bune -> nu "ieși", ci pastreaz-o) ----
// VVV pe viu: pozitie 5,9 long la 30,291, net 1,535, pret 30,756 -> podeaua de +3 la ~30,555 (0,7% sub pret)
const vvv = (o) => ({ directie: "long", pozitie: 5.9, pretDeschidere: 30.291071485268713, profitNet: 1.535324366794896, pretCurent: 30.756, profitTotal: 4.28, investit: 91.9, gridJos: 28.464, gridSus: 33.346, distantaLichidarePct: 28.8, opritorPierdere: 26.633, opritorPierdereActiv: true, ...o });
await test("pretPentruTotal: T=0 = pretul de zero; la pretul gasit, totalul dupa comision e exact T; short oglindit; date nesigure -> null", async () => {
  const b = vvv(), com = G.C.COMISION, x = T.pretPentruTotal(b, 3);
  assert.ok(Math.abs(T.pretPentruTotal(b, 0) - T.dacaInchizi(b).pretZero) < 1e-9);
  assert.ok(Math.abs(b.profitNet + 5.9 * (x - b.pretDeschidere) - 5.9 * x * com - 3) < 1e-9, "totalul la podea"); assert.ok(x > 30.5 && x < 30.6, "podea " + x);
  const sh = { ...b, directie: "short", pozitie: -5.9 }, y = T.pretPentruTotal(sh, 3);
  assert.ok(Math.abs(sh.profitNet + 5.9 * (sh.pretDeschidere - y) - 5.9 * y * com - 3) < 1e-9);
  assert.equal(T.pretPentruTotal({ ...b, pnlNerealizatSigur: false }, 3), null); assert.equal(T.pretPentruTotal({ ...b, pozitie: 0 }, 3), null);
  assert.ok(Math.abs(T.planStare(b, { plus: 3 }, {}, 0).plus.podea - x) < 1e-12, "planStare poartă podeaua");
});
const plan = (b) => T.planStare(b, { plus: 3, minus: 14 }, {}, 0);
await test("semafor: tinta atinsa + conditii bune = 🟡 'pastreaz-o' cu pretul-podea, distanta si avertismentul ca e aproape (nu 🔴)", async () => {
  const b = vvv({ opritorPierdere: 26.633 }), r = S.semafor({ bot: b, fisa: { regim: LIN }, plan: plan(b) });
  assert.equal(r.nivel, "atentie"); assert.equal(r.cod, "podea"); assert.match(r.motiv, /ținta ta de \+3 USDT e atinsă — păstreaz-o/);
  assert.match(r.faCe, /stopul la 30\.55\d\d \(0,7% de preț\)/); assert.match(r.deCe, /E aproape/);
  assert.equal(r.componente.some((c) => c.nivel === "iesi"), false);
  const cu = S.semafor({ bot: b, fisa: { regim: SUS }, plan: plan(b) }); assert.equal(cu.cod, "podea", "și cu mișcarea cu botul");
});
await test("semafor: opritorul deja peste podea = 🟢 'la adapost'; miscare CONTRA, lichidare aproape sau minusul atins raman 🔴", async () => {
  const sus = vvv({ opritorPierdere: 30.6 }), r = S.semafor({ bot: sus, fisa: { regim: LIN }, plan: plan(sus) });
  assert.equal(r.nivel, "tine"); assert.equal(r.cod, "podea"); assert.match(r.motiv, /la adăpost/);
  const contra = S.semafor({ bot: vvv(), fisa: { regim: JOS }, plan: plan(vvv()) }); assert.equal(contra.nivel, "iesi"); assert.equal(contra.cod, "plan");
  const lich = S.semafor({ bot: vvv({ distantaLichidarePct: 6 }), fisa: { regim: LIN }, plan: plan(vvv()) }); assert.equal(lich.nivel, "iesi"); assert.notEqual(lich.cod, "podea");
  const faraDate = vvv({ pnlNerealizatSigur: false }); assert.equal(S.semafor({ bot: faraDate, fisa: { regim: LIN }, plan: plan(faraDate) }).cod, "plan", "fără preț-podea calculabil: ca înainte");
});
await test("alerta pe Discord: tinta atinsa + conditii bune -> 'pastreaz-o' cu pretul; la adapost -> info; contra -> 'ieși pe plus' ca inainte", async () => {
  const b = { ...vvv(), id: "2383", baza: "VVV.PERP", activ: true };
  const r = A.reguli(b, { plan: plan(b), regim: { ...LIN, r4h: 1, r24h: 1 } }).plan;
  assert.equal(r.nivel, "atentie"); assert.match(r.titlu, /păstreaz-o/); assert.match(r.mesaj, /0,7% de prețul de acum, aproape/);
  const ad = { ...b, opritorPierdere: 30.6 }; assert.equal(A.reguli(ad, { plan: plan(ad), regim: { ...LIN, r4h: 1, r24h: 1 } }).plan.nivel, "info");
  assert.match(A.reguli(b, { plan: plan(b), regim: { ...JOS, r4h: 3, r24h: 3 } }).plan.titlu, /ieși pe plus/);
});

// ---- v96.5: opritorul pus la podeaua ROTUNJITA la pasul Pionex (cazul lui, 27.09) + opritorul care urca ----
await test("opritorul la podeaua rotunjita in jos (30,511 vs 30,5111) = 🟢 'la adapost, iti pastreaza +3,00' - nu 'muta-l'", async () => {
  const b0 = vvv(), pod = T.pretPentruTotal(b0, 3), b = vvv({ opritorPierdere: Math.floor(pod * 1000) / 1000 });
  assert.ok(b.opritorPierdere < pod, "chiar e sub podea, la a 4-a zecimală");
  const r = S.semafor({ bot: b, fisa: { regim: LIN }, plan: plan(b) });
  assert.equal(r.nivel, "tine"); assert.equal(r.cod, "podea"); assert.match(r.motiv, /la adăpost/); assert.match(r.faCe, /stopul \(30\.5\d*\) păstrează \+3,00 USDT/);
  const departe = vvv({ opritorPierdere: pod * 0.99 }); assert.equal(S.semafor({ bot: departe, fisa: { regim: LIN }, plan: plan(departe) }).nivel, "atentie", "1% sub podea = nu e la adăpost");
  const a = { ...b, id: "2383", baza: "VVV.PERP", activ: true }; assert.equal(A.reguli(a, { plan: plan(a), regim: { ...LIN, r4h: 1, r24h: 1 } }).plan.nivel, "info", "și alerta îl vede la adăpost");
});
await test("totalLaPret e inversa lui pretPentruTotal; podeaUrca: la 1,5% sub pret cat pastrezi (doar peste tinta)", async () => {
  const b = vvv(); assert.ok(Math.abs(T.totalLaPret(b, T.pretPentruTotal(b, 3.7)) - 3.7) < 1e-9);
  assert.equal(T.podeaUrca(b, 3), null, "la VVV acum 1,5% sub preț păstrezi sub +3 -> nimic de urcat");
  const sus = vvv({ pretCurent: 31.5 }), u = T.podeaUrca(sus, 3);
  assert.ok(Math.abs(u.pret - 31.5 * 0.985) < 1e-9); assert.ok(u.pastrezi > 3); assert.ok(Math.abs(u.pastrezi - T.totalLaPret(sus, u.pret)) < 1e-12);
  const r = S.semafor({ bot: sus, fisa: { regim: LIN }, plan: plan(sus) }); assert.match(r.deCe, /Cu 1,5% loc de respirație, stopul la 31\.0275 ar păstra \+\d+,\d\d USDT \(cel de acum: −/);
});
await test("Discord 'poti urca opritorul': o data pe treapta (max 1 USDT, 1/4 din tinta), nu sub opritorul de acum, nu pe miscarea contra", async () => {
  const bb = (p, op) => ({ ...vvv({ pretCurent: p, opritorPierdere: op }), id: "2383", baza: "VVV.PERP", activ: true });
  const ev = (b, st, rg) => A.podeaUrca(b, plan(b), { regim: rg || { ...LIN, r4h: 1, r24h: 1 } }, st);
  let b = bb(31.5, 26.6), r = ev(b, null);
  assert.equal(r.mesaje.length, 1); assert.match(r.mesaje[0].titlu, /^🪜 VVV: poți urca opritorul — păstrezi \+\d+,\d\d USDT$/); assert.match(r.mesaje[0].mesaj, /1,5% de prețul de acum/);
  const st = r.stare; assert.equal(ev(bb(31.55, 26.6), st).mesaje.length, 0, "sub o treaptă în plus: tăcere");
  const x = T.podeaUrca(bb(31.5, 26.6), 3).pastrezi; let p = 31.5; while (T.podeaUrca(bb(p, 26.6), 3).pastrezi < x + 1) p += 0.01;
  assert.equal(ev(bb(p + 0.01, 26.6), st).mesaje.length, 1, "o treaptă (1 USDT) mai sus: din nou");
  const u = T.podeaUrca(bb(31.5, 26.6), 3); assert.equal(ev(bb(31.5, u.pret), null).mesaje.length, 0, "opritorul lui e deja acolo: nimic");
  assert.equal(ev(b, null, { ...JOS, r4h: 3, r24h: 3 }).mesaje.length, 0, "mișcare contra: nu se urcă opritorul");
  const sub = { ...bb(30.4, 26.6), profitTotal: 2 }; assert.equal(ev(sub, st).stare, null, "ținta nu mai e atinsă: treapta se uită, ciclu nou");
});

// ---- v97.1: socoteala pe bani + podeaua pe banii lui ----
await test("socoteala pe bani: 'tine' urmat = castigul de dupa; 'iesi' urmat = ce pastrai iesind; podeaua se judeca drept 'tine'", async () => {
  const ORA = 3600000, log = [
    { t: 0, cod: "tine", nivel: "tine", total: 1, dreptate: null }, { t: 0, cod: "plan", nivel: "iesi", motiv: "planul tău: ținta de +3 USDT e atinsă", total: 4, dreptate: null },
    { t: 0, cod: "podea", nivel: "atentie", motiv: "ținta ta de +3 USDT e atinsă — păstreaz-o", total: 4.5, dreptate: null }, { t: 30 * ORA, cod: "tine", nivel: "tine", total: 5, dreptate: null }];
  const j = S.judeca(log, 6, 100, 25 * ORA);
  assert.equal(j[2].dreptate, true, "podeaua 🟡 zice «ține»: totalul a urcat -> a avut dreptate"); assert.equal(j[1].dreptate, false); assert.equal(j[3].dreptate, null, "sub 24 h: încă nu");
  const s = S.socoteala(j);
  assert.equal(s.tine.bani, 5); assert.equal(s.plan.bani, -2, "ieșind la +4 pierdeai 2 față de +6"); assert.equal(s.podea.bani, 1.5); assert.equal(s.tine.baniN, 1);
  const pb = S.podeaPeBani(j, 5.05); assert.equal(pb.laIesire, 4); assert.ok(Math.abs(pb.dif - 1.05) < 1e-9, "prima «țintă atinsă» e cea de referință");
  assert.equal(S.podeaPeBani([{ cod: "tine", total: 1 }], 5), null);
});

// ---- v97.6: planul propus la botul nou fara plan ----
await test("propunePlan: planul lui de la VVV (+3/-14/12h pe 91,9) scalat la 96,63 USDT; fara plan: 3% / 15% / 12 h; fara nimic: null", async () => {
  const p = T.propunePlan({ plus: 3, minus: 14, afaraOre: 12, investit: 91.9, nume: "VVV" }, 96.63);
  assert.deepEqual([p.plus, p.minus, p.afaraOre], [3.2, 14.7, 12]); assert.match(p.nota, /după planul tău de la VVV \(\+3 \/ −14 USDT \/ 12 h, scalat de la 91,9 la 96,6 USDT\)/);
  const f = T.propunePlan({ plus: 3, minus: 14 }, 50); assert.deepEqual([f.plus, f.minus, f.afaraOre], [3, 14, 12], "fără suma botului vechi: aceleași sume");
  const d = T.propunePlan(null, 100); assert.deepEqual([d.plus, d.minus, d.afaraOre], [3, 15, 12]); assert.match(d.nota, /propunerea mea/);
  assert.equal(T.propunePlan(null, null), null);
});
await test("ruta ultimulPlan: cel mai nou plan pe un bot Pionex - sare peste T212, peste probe si peste planurile goale", async () => {
  const kv = new Map([["plan:2382", JSON.stringify({ plus: 2, minus: 10, la: 100 })], ["plan:2383", JSON.stringify({ plus: 3, minus: 14, afaraOre: 12, la: 200 })],
    ["plan:t212-APLD_US_EQ", JSON.stringify({ stop: 5, la: 900 })], ["plan:proba-1", JSON.stringify({ plus: 9, minus: 9, proba: true, la: 999 })], ["plan:2384", "null"], ["alte", "x"]]);
  const env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }) } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const r = JSON.parse(await (await m.onRequestGet({ request: new Request("https://x.test/api/istoric-bot?action=ultimulPlan", { headers: { authorization: "Bearer proba-token-1234567890", "cf-connecting-ip": "10.97.6.1" } }), env })).text());
  assert.equal(r.bot, "2383"); assert.equal(r.plan.plus, 3);
});

// ---- v97.7: fisa de inchidere, pe cei trei boti reali din 27.09 ----
const inchis = (o) => ({ baza: "ICP.PERP", investit: 96.63, profitTotal: -3.1136879999999962, gridProfitBrut: 0, ordinePerechi: 0, pornitLa: Date.UTC(2026, 8, 27, 11, 27, 58), inchisLa: Date.UTC(2026, 8, 27, 13, 4, 9), motivInchidere: "loss_stop", opritorPierdereTip: "raport", opritorPierdereRaport: -0.0295, levier: 3, ...o });
await test("fisa de inchidere ICP: opritorul -2,95% la levier 3x (~1% din pret) < ziua obisnuita 6,7%; sub 3 ore; fara plan", async () => {
  const f = T.fisaInchidere(inchis(), { plan: null, atrPct: 6.7 });
  assert.equal(f.nivel, "atentie"); assert.equal(f.titlu, "🔍 ICP închis: −3,11 USDT (−3,2%) după 1 h 36 min");
  assert.match(f.mesaj, /^De ce: opritorul de pierdere \(−2,95% din investiție\)\./); assert.match(f.mesaj, /Planul tău: n-avea plan scris\./);
  assert.match(f.mesaj, /~1,0% din preț la levier 3×\) era mai mic decât mișcarea unei zile obișnuite a ICP \(~6,7%\)/); assert.match(f.mesaj, /sub 3 ore/);
});
await test("fisa de inchidere VVV: inchis de el, peste tinta de +3 (tinerea a adus +1,73); MET: pozitia a mancat din grile; lichidat = critic", async () => {
  const v = T.fisaInchidere(inchis({ baza: "VVV.PERP", investit: 91.9, profitTotal: 4.73, gridProfitBrut: 1.45, ordinePerechi: 10, motivInchidere: "user_cancel", opritorPierdereTip: "pret", pornitLa: 1e12, inchisLa: 1e12 + 41.5 * 3600000 }), { plan: { plus: 3, minus: 14 }, atrPct: 5 });
  assert.equal(v.nivel, "info"); assert.match(v.mesaj, /De ce: l-ai închis tu\./); assert.match(v.mesaj, /ținta atinsă, ai ieșit peste ea/); assert.match(v.mesaj, /ținerea după țintă a adus \+1,73 USDT/);
  const m = T.fisaInchidere(inchis({ baza: "MET.PERP", investit: 88.98, profitTotal: 2.93, gridProfitBrut: 7.18, ordinePerechi: 564, motivInchidere: "user_cancel", opritorPierdereTip: "pret", pornitLa: 1e12, inchisLa: 1e12 + 48 * 3600000 }), {});
  assert.match(m.mesaj, /poziția a mâncat 4,25 USDT din ce au făcut grilele/); assert.match(m.titlu, /după 2,0 zile/);
  assert.equal(T.fisaInchidere(inchis({ motivInchidere: "liquidation" }), {}).nivel, "critic");
});

// ---- v97.9: "grila atinsa" doar in Radar, "pereche incheiata" si pe Discord ----
await test("grila atinsa (cumparare simpla) = doarRadar; pereche incheiata = pleaca si pe Discord", async () => {
  const bu = (n) => ({ brut: { buOrderData: { closedExchangeOrderCount: n } } }), b0 = { baza: "PENDLE.PERP", directie: "long", pretCurent: 2.6, ordinePerechi: 3, gridProfitBrut: 0.5, pozitie: 5, ...bu(10) };
  const st = A.grila(b0, null).contori;
  const cump = A.grila({ ...b0, ...bu(11), pozitie: 6 }, st).mesaje; assert.equal(cump.length, 1); assert.match(cump[0].titlu, /grilă atinsă — a cumpărat/); assert.equal(cump[0].doarRadar, true);
  const per = A.grila({ ...b0, ...bu(12), ordinePerechi: 4, gridProfitBrut: 0.62, pozitie: 5 }, st).mesaje; assert.equal(per.length, 1); assert.match(per[0].titlu, /pereche încheiată/); assert.equal(per[0].doarRadar, undefined);
  const src = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8"); assert.match(src, /if \(m\.doarRadar\) \{ jurnal\("alerta \(doar în Radar\)"/, "colectorul nu ține cont de doarRadar");
});

console.log(`CU_BOTUL_V963 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
