// Probele pentru scenariile de pret (public/lib/scenariu.js) si pentru
// sfaturile "ce ti-as spune eu" (public/lib/sfaturi.js).
import assert from "node:assert/strict";
import fs from "node:fs";

const inc = (f, n) => new Function(fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8") + `; return ${n};`)();
const Scenariu = inc("scenariu.js", "Scenariu");
globalThis.Scenariu = Scenariu;
globalThis.Alerte = inc("alerte.js", "Alerte");
const Sfaturi = inc("sfaturi.js", "Sfaturi");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

// Un grid long inventat: 0.8 - 1.2, 40 de niveluri (pas 0.01), 10 bucati pe nivel.
const brut = (o = {}) => ({ buOrderData: { bottom: "0.8", top: "1.2", row: 40, perVolume: "10", position: "100",
  positionOpenPrice: "1.00", marginBalance: "90", trend: "long", ...o } });
const bot = (o = {}) => ({ baza: "ADA.PERP", directie: "long", investit: 100, pretCurent: 1.0, gridJos: 0.8, gridSus: 1.2,
  distantaLichidarePct: 30, pretLichidare: 0.7, profitTotal: -10, finantare: -0.04, activ: true, stareMargine: "NORMAL", stareRisc: "TRADING", ...o });

console.log("\nV77 · scenarii si sfaturi · proba\n");

await test("la pretul de acum modelul da exact totalul de acum (marja + nerealizat - investit)", () => {
  const g = Scenariu.grid(brut(), bot());
  assert.deepEqual(g.lipsa, []);
  const r = Scenariu.la(g, 1.0);
  assert.ok(Math.abs(r.total - -10) < 1e-9, `total ${r.total}`);
});

await test("la coborare pozitia creste cu cate un nivel si pretul mediu scade", () => {
  const g = Scenariu.grid(brut(), bot());
  const r = Scenariu.la(g, 0.95); // niveluri 0.95..0.99 = 5 cumparari
  assert.equal(r.pozitie, 150);
  assert.ok(r.pretMediu < 1.0 && r.pretMediu > 0.95, `pret mediu ${r.pretMediu}`);
  assert.ok(r.total < -10, "pe scadere totalul unui long scade");
});

await test("sub marginea de jos nu mai cumpara; la urcare vinde si incaseaza", () => {
  const g = Scenariu.grid(brut(), bot());
  assert.equal(Scenariu.la(g, 0.7).pozitie, Scenariu.la(g, 0.8).pozitie, "sub grid nu se mai cumpara nimic");
  const sus = Scenariu.la(g, 1.05); // vinde la 1.01..1.05 = 5 x 10
  assert.equal(sus.pozitie, 50);
  assert.ok(sus.realizat > 0 && sus.total > -10);
});

await test("pretul de golire: echitatea trece prin zero acolo, iar deasupra e pozitiva", () => {
  const g = Scenariu.grid(brut(), bot());
  const pg = Scenariu.pretGolire(g);
  assert.ok(pg > 0 && pg < 1.0, `pret golire ${pg}`);
  assert.ok(Scenariu.la(g, pg * 1.01).echitate > 0 && Scenariu.la(g, pg * 0.99).echitate <= 0.5);
});

await test("date lipsa -> nu calculeaza, spune ce lipseste (nu cifre inventate)", () => {
  const r = Scenariu.scenarii(brut({ perVolume: null, positionOpenPrice: "" }), bot(), [{ eticheta: "jos", pret: 0.8 }]);
  assert.equal(r.ok, false);
  assert.match(r.motiv, /cantitatea pe nivel/); assert.match(r.motiv, /poziția/);
  assert.equal(Scenariu.scenarii(brut({ trend: "neutral" }), bot({ directie: "neutral" }), []).ok, false, "neutru nu se modeleaza");
});

// Lumanari de 4h: fiecare fereastra de 6 bare porneste la 1.0; in 3 din 12 ferestre coboara la 0.85.
function lumanari(ferestre, atinge) {
  const out = []; let t = 1_700_000_000_000;
  for (let f = 0; f < ferestre; f++) for (let k = 0; k < 6; k++) {
    const l = k === 3 && atinge.includes(f) ? 0.85 : 0.98;
    out.push({ time: t, open: "1", high: "1.01", low: String(l), close: "1.0" }); t += 4 * 3600000;
  }
  out.push({ time: t, open: "1", high: "9", low: "0.01", close: "1" }); // bara in formare, extrema - nu are voie sa conteze
  return out;
}

await test("sansa de atingere: ferestre nesuprapuse, bara in formare ignorata, cazurile numarate", () => {
  const s = Scenariu.sansaAtingere(lumanari(13, [1, 5, 9]), 1.0, 0.9, 6);
  assert.equal(s.cazuri, 12, `cazuri ${s.cazuri}`);
  assert.equal(s.atinse, 3);
  assert.ok(Math.abs(s.valoare - 25) < 1e-9);
  assert.ok(s.ic.jos < 25 && s.ic.sus > 25);
});

await test("sansa de atingere: sub 10 ferestre -> null cu motiv, nu 0%", () => {
  const s = Scenariu.sansaAtingere(lumanari(5, []), 1.0, 0.9, 6);
  assert.equal(s.valoare, null);
  assert.match(s.motiv, /10 ferestre/);
});

function sfaturiPentru(o = {}) {
  const b = bot(o.bot || {}), br = brut(o.brut || {});
  const scen = Scenariu.scenarii(br, b, [{ eticheta: "jos", pret: b.gridJos }]);
  return Sfaturi.sfaturi({ bot: b, scen, sanse: o.sanse || {}, rezumat: o.rezumat || null, futures: o.futures || null, funding: o.funding ?? null });
}

await test("opritorul stins: sfatul arata totalul LA opritor si lichidarea, cu cifre", () => {
  const s = sfaturiPentru({ bot: { opritorPierdere: 0.8, opritorPierdereActiv: false } });
  const c = s.find((x) => /Opritorul/.test(x.titlu));
  assert.ok(c, "lipseste sfatul despre opritor");
  assert.match(c.text, /totalul ar fi în jur de −\d+\.\d{2} USDT/);
  assert.match(c.text, /lichidare/);
});

await test("lichidare la 5% -> primul sfat e critic; totul in regula -> 'Nimic urgent'", () => {
  assert.equal(sfaturiPentru({ bot: { distantaLichidarePct: 5 } })[0].ton, "critic");
  const ok = sfaturiPentru({ bot: { distantaLichidarePct: 60 } });
  assert.ok(ok.some((x) => x.titlu === "Nimic urgent"), JSON.stringify(ok.map((x) => x.titlu)));
});

await test("frecventa de a ajunge la marginea de jos se spune cu numarul de cazuri", () => {
  const s = sfaturiPentru({ sanse: { josZi: { valoare: 3.6, atinse: 3, cazuri: 83, stare: "dovedit" }, josSapt: { valoare: 45, atinse: 5, cazuri: 11, stare: "putin" } } });
  const c = s.find((x) => /marginea de jos/.test(x.titlu));
  assert.match(c.text, /4% din zile \(3 din 83\)/);
  assert.match(c.text, /45% din săptămâni \(5 din 11, puține cazuri\)/);
});

await test("fara USDT liber in futures si lichidarea sub 15% -> spune de unde vin banii de marja", () => {
  const c = sfaturiPentru({ bot: { distantaLichidarePct: 12 }, futures: { disponibil: 0 } }).find((x) => /futures/.test(x.titlu));
  assert.equal(c.ton, "atentie");
});

await test("niciun sfat nu contine NaN, undefined sau null scris ca text", () => {
  const variante = [{}, { bot: { opritorPierdere: 0.8, opritorPierdereActiv: false, distantaLichidarePct: null, pretLichidare: null } },
    { bot: { profitTotal: null, finantare: null }, funding: 0.001 }, { brut: { perVolume: null } }];
  for (const v of variante) for (const s of sfaturiPentru(v)) {
    const t = s.titlu + " " + s.text + " " + (s.deCe || "");
    assert.ok(!/NaN|undefined|null/.test(t), `sfat stricat: ${t}`);
  }
});

const TabloBot = inc("tablou-bot.js", "TabloBot");
await test("istoric imbinat: un punct pe minut, browserul castiga pe acelasi minut, peste 24h se taie", () => {
  const acum = 1_800_000_000_000, M = 60000;
  const server = [{ t: acum - 25 * 3600000, perechi: 1 }, { t: acum - 10 * M, perechi: 5 }, { t: acum - 5 * M + 1000, perechi: 7, pretSpot: null }];
  const local = [{ t: acum - 5 * M + 20000, perechi: 7, pretSpot: 0.33 }, { t: acum - M, perechi: 9 }];
  const r = TabloBot.imbinaIstoric(local, server, acum);
  assert.deepEqual(r.map((x) => x.perechi), [5, 7, 9], JSON.stringify(r));
  assert.equal(r[1].pretSpot, 0.33, "pe acelasi minut trebuia sa ramana intrarea din browser");
});

await test("grafic: pragul de gaura vine din perioada (lumanari de 1h nu se rup la fiecare punct)", () => {
  const H = 3600000, t0 = 1_800_000_000_000;
  const ist = Array.from({ length: 30 }, (_, i) => ({ t: t0 + i * H, pretPerp: String(1 + i * 0.001) }));
  const b = { buOrderData: { bottom: "0.9", top: "1.1" } };
  assert.equal(TabloBot.geometrieGrafic(ist, b, t0 + 30 * H).segmente.length, 30, "fara prag, fiecare ora e o gaura (asa era)");
  assert.equal(TabloBot.geometrieGrafic(ist, b, t0 + 30 * H, 150 * 60000).segmente.length, 1, "cu pragul de 2,5 ore linia e una singura");
});

console.log(`\nV77_SCENARII ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
