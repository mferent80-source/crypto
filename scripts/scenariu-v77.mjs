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
  return Sfaturi.sfaturi({ bot: b, scen, sanse: o.sanse || {}, rezumat: o.rezumat || null, futures: o.futures || null, funding: o.funding ?? null,
    fisa: o.fisa || null, costuri: o.costuri || null, zero: o.zero || null, geom: o.geom || null, ritm: o.ritm || null });
}

await test("v80.1: sfaturile despre OPRITOR si despre USDT LIBERI in futures NU mai apar (cerut de el, 24.09)", () => {
  const s = sfaturiPentru({ bot: { opritorPierdere: 0.8, opritorPierdereActiv: false, distantaLichidarePct: 12 }, futures: { disponibil: 0 } });
  assert.ok(!s.some((x) => /Opritorul|opritor/i.test(x.titlu + x.text)), s.map((x) => x.titlu).join(" | "));
  assert.ok(!s.some((x) => /futures/i.test(x.titlu)), s.map((x) => x.titlu).join(" | "));
});

const fisaF = (o) => Object.assign({ dir: "long", directie: { dir: "long", tarie: "tare", motive: ["4h: EMA20 peste EMA50, EMA50 urcă", "1z: EMA20 peste EMA50, EMA50 urcă"] },
  regim: { r4h: 0.9, r24h: 1.1, miscare: false }, liniste: { linisteAcum: true, zileLiniste: 0.4, n: 13, k: 3, p: 3 / 13, ic: [0.08, 0.5], suficient: true, H: 2 },
  verdict: { nivel: "porneste", motive: [] }, setare: { levierSigur: 4 } }, o || {});
await test("v80.1 trend: trendul contra botului long -> atentie, cu ce face gridul pe scadere; cu botul -> bine", () => {
  const contra = sfaturiPentru({ bot: { directie: "long" }, fisa: fisaF({ directie: { dir: "short", tarie: "tare", motive: ["4h: EMA20 sub EMA50, EMA50 coboară"] } }) }).find((x) => /[Tt]rendul/.test(x.titlu));
  assert.ok(contra, "lipseste sfatul de trend"); assert.equal(contra.ton, "atentie"); assert.match(contra.text, /cumpără la fiecare nivel/);
  const cu = sfaturiPentru({ bot: { directie: "long" }, fisa: fisaF() }).find((x) => /[Tt]rendul/.test(x.titlu));
  assert.equal(cu.ton, "bine");
});
await test("v80.1 regim: miscare mare -> atentie 'nu adauga bani acum'; liniste -> frecventa cu n", () => {
  const m = sfaturiPentru({ fisa: fisaF({ regim: { r4h: 2.4, r24h: 1.2, miscare: true }, liniste: { linisteAcum: false } }) }).find((x) => /[Mm]ișcare/.test(x.titlu));
  assert.ok(m); assert.equal(m.ton, "atentie"); assert.match(m.faCe, /nu adăuga/i, "indemnul sta in 'ce as face eu'");
  const l = sfaturiPentru({ fisa: fisaF() }).find((x) => /[Ll]iniște/.test(x.titlu));
  assert.ok(l); assert.match(l.text, /3 din 13/);
});
await test("v80.1 ritm: grile 24h mult sub media pe zi -> atentie 'ritmul a scazut'; mult peste -> info; apropiat -> nimic", () => {
  const jos = sfaturiPentru({ ritm: { grile24h: 0.5, medieZi: 3.0, tranz24h: 40, tranzMedieZi: 300, zile: 5 } }).find((x) => /[Rr]itmul/.test(x.titlu));
  assert.ok(jos); assert.equal(jos.ton, "atentie"); assert.match(jos.titlu, /scăzut/);
  const sus = sfaturiPentru({ ritm: { grile24h: 9, medieZi: 3.0, tranz24h: 900, tranzMedieZi: 300, zile: 5 } }).find((x) => /[Rr]itmul/.test(x.titlu));
  assert.ok(sus); assert.match(sus.titlu, /crescut/);
  assert.ok(!sfaturiPentru({ ritm: { grile24h: 3.1, medieZi: 3.0, tranz24h: 310, tranzMedieZi: 300, zile: 5 } }).some((x) => /[Rr]itmul/.test(x.titlu)));
  assert.ok(!sfaturiPentru({ ritm: { grile24h: 0.5, medieZi: 3.0, tranz24h: 40, tranzMedieZi: 300, zile: 0.5 } }).some((x) => /[Rr]itmul/.test(x.titlu)), "sub o zi de la pornire nu exista 'medie'");
});
await test("v80.1 costuri, setare, zero: funding care mananca grilele -> atentie; grile prea dese / levier peste sigur -> sfat 'Setarea'; pretul de zero cu distanta", () => {
  const s = sfaturiPentru({ costuri: { grile24h: 0.3, fundingZi: -0.5, comisionZi: -0.2, netZi: -0.4, fundingMananca: true },
    geom: { netPct: 0.0022, preaDese: true, grile: 93, mod: "aritmetic" }, bot: { levier: 5, directie: "long" }, fisa: fisaF(), zero: { pretZero: 0.3481, distantaZeroPct: 0.0234, iei: 83.3 } });
  const c = s.find((x) => /[Cc]osturile/.test(x.titlu)); assert.ok(c); assert.equal(c.ton, "atentie");
  const st = s.find((x) => /[Ss]etarea/.test(x.titlu)); assert.ok(st); assert.match(st.text, /0,22%/); assert.match(st.text, /5×/);
  const z = s.find((x) => /zero/.test(x.titlu)); assert.ok(z); assert.match(z.titlu, /0\.3481/); assert.match(z.text, /83\.30 USDT/);
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


await test("v80.1 fiecare sfat de atentie/critic are 'Ce as face eu' (faCe) nevid", () => {
  const s = sfaturiPentru({ bot: { distantaLichidarePct: 5, directie: "long" }, fisa: fisaF({ directie: { dir: "short", tarie: "tare", motive: ["x"] }, regim: { r4h: 2.4, r24h: 1, miscare: true } }),
    costuri: { grile24h: 0.3, fundingZi: -0.5, comisionZi: -0.2, netZi: -0.4, fundingMananca: true }, ritm: { grile24h: 0.5, medieZi: 3, zile: 4 } });
  const grave = s.filter((x) => x.ton === "critic" || x.ton === "atentie");
  assert.ok(grave.length >= 4, grave.map((x) => x.titlu).join(" | "));
  for (const x of grave) assert.ok(x.faCe && x.faCe.length > 20, "fara 'ce as face': " + x.titlu);
});

await test("niciun sfat nu contine NaN, undefined sau null scris ca text", () => {
  const variante = [{}, { bot: { opritorPierdere: 0.8, opritorPierdereActiv: false, distantaLichidarePct: null, pretLichidare: null } },
    { bot: { profitTotal: null, finantare: null }, funding: 0.001 }, { brut: { perVolume: null } },
    { fisa: { dir: null, directie: null, regim: null, liniste: null, verdict: null, setare: null }, costuri: { grile24h: null, fundingZi: null, comisionZi: null, netZi: null }, zero: { pretZero: null, iei: null }, geom: null, ritm: { grile24h: null, medieZi: null, zile: 3 } }];
  for (const v of variante) for (const s of sfaturiPentru(v)) {
    const t = s.titlu + " " + s.text + " " + (s.deCe || "") + " " + (s.faCe || "");
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
