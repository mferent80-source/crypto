// Proba v100.69 - sfaturile concise, pachetul 4 (actiunile T212): semaforul pozitiei, poarta, portofoliul, situatiile, alertele
// planului si frana (Discord), raportul, consilierul (pozitia, botul), Consilierul pozitiei, randurile 🎲 si ecranul T212.
// Ce se verifica: actiunea la persoana I (dupa eticheta „Ce aș face eu:”), ≤ 110; titlurile ≤ 60; alertele pe 2 randuri; „(puține cazuri)”
// in locul avertizarii comune; preturile actiunilor ca pe pagina („$29.50”), sumele cu virgula - si ca nicio cifra nu se pierde.
//   node scripts/proba-v10069.mjs
import "./lib/text-ro-global.mjs";   // RF4 (v100.61): TextRo inaintea semnale-bot.js / consiliu.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { situatii, verifica, STRICT } from "./garda-texte.mjs";   // incarca si modulele paginii (ActiuniSemnale, Consilier, Probabilitati, Consiliu)

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const { ActiuniSemnale: AS, Consilier: CS, Probabilitati: PB, Consiliu: CO } = globalThis;

const ZI = 86400000, ORA = 3600000, T0 = Date.UTC(2026, 9, 1, 16, 0);
const zilnice = (n, f, de) => { const b = []; for (let i = 0; i < n; i++) { const c = f(i); b.push({ t: (de || T0 - n * ZI) + i * ZI, o: c, h: c * 1.01, l: c * 0.99, c }); } return b; };
const urca = zilnice(300, (i) => 20 * Math.pow(1.002, i) * (1 + 0.004 * Math.sin(i)));
const coboara = zilnice(300, (i) => 40 * Math.pow(0.998, i) * (1 + 0.004 * Math.sin(i)));
const lateral = zilnice(300, (i) => 30 * (1 + 0.01 * Math.sin(i / 3)));
const P = (o) => Object.assign({ simbol: "APLD", ticker: "APLD_US_EQ", qty: 40, pretMediu: 29.5, pret: 29, plan: {} }, o || {});
const PERS = /^(Aș|N-aș|L-aș|Le-aș|O-aș|M-aș|Nu m-aș)\s/;
const act = (s) => String(s || "").replace(/^👉\s*(Ce aș face eu:\s*)?/, "");
const persoana = (s, cine) => { assert.match(act(s), PERS, (cine || "") + ": acțiunea nu e la persoana I: " + s); assert.ok(act(s).length <= 110, (cine || "") + ": acțiunea are " + act(s).length + " > 110: " + s); };
const sem = (p, bare) => AS.semafor(p, bare ? AS.stare(bare, p.pret) : null);

console.log("Proba v100.69 · sfaturile concise, pachetul 4 (acțiunile T212)");

await test("semaforul: pe fiecare ramură, acțiunea de după „Ce aș face eu:” e la persoana I, ≤ 110, iar cifrele rămân", () => {
  const ram = [[P({ pret: 25.2, plan: { stop: 26 } }), urca, "stopul planului"], [P({ pret: 29, maxDupaCumparare: 35, plan: { trailPct: 15 } }), urca, "−15% din plan"],
    [P({ pret: 31.2, plan: { tinta: 31 } }), urca, "ținta"], [P({ pretMediu: 30, pret: 25 }), coboara, "trend jos, pe minus"], [P({ pretMediu: 28, pret: 29 }), coboara, "trend jos"],
    [P({ pretMediu: 22, pret: 36 }), urca, "trend sus, fără plan"], [P({ pretMediu: 22, pret: 36, plan: { trailPct: 15 } }), urca, "trend sus, cu plan"],
    [P({ pretMediu: 29, pret: 22 }), lateral, "−24% fără plan"], [P({ pretMediu: 29, pret: 28 }), zilnice(20, () => 28), "fără prețuri"], [P({ pret: 0 }), null, "fără preț"]];
  for (const [p, b, cine] of ram) { const r = sem(p, b); persoana(r.ceAsFace, cine); assert.match(r.ceAsFace, /^👉 Ce aș face eu: /, cine + ": eticheta (o taie consiliu.js și lista) lipsește"); }
  const t = sem(P({ pret: 31.2, plan: { tinta: 31 } }), urca);
  assert.match(t.ceAsFace, /\$29\.50/, "ținta: prețul de intrare (unde se mută stopul) s-a pierdut: " + t.ceAsFace);
  assert.match(t.motive[0], /\$31\.00/, "ținta: prețul țintei, ca pe pagină: " + t.motive[0]);
  assert.match(sem(P({ pret: 25.2, plan: { stop: 26 } }), urca).motive[0], /\$26\.00/);
  const tr = sem(P({ pret: 29, maxDupaCumparare: 35, plan: { trailPct: 15 } }), urca).motive[0];
  assert.match(tr, /17,1%/); assert.match(tr, /−15%/); assert.ok(tr.length <= 60, tr);
  const fp = sem(P({ pretMediu: 29, pret: 22 }), lateral);
  assert.match(fp.motive.join(" | "), /−24,1%/); assert.doesNotMatch(fp.motive.join(" | ") + fp.ceAsFace, /pe minus −|ACUM/, "„pe minus −24%” / „ACUM”: " + fp.motive.join(" | ") + " · " + fp.ceAsFace);
});

await test("Consiliu: „Ce aș face eu” din semafor ajunge fără etichetă, la persoana I (consiliu.js taie eticheta)", () => {
  const p = P({ pretMediu: 22, pret: 36, plan: { trailPct: 15 } }), s = sem(p, urca);
  const c = CO.alcatuiesteActiune({ sem: s, niv: { nivel: "ok", stopAtins: false, stopPozitie: 30, tintaPozitie: 40 }, prob: [], sfaturi: [], plan: p.plan, pret: p.pret, pretMediu: p.pretMediu, qty: p.qty, simbol: p.simbol });
  assert.equal(c.nivel, "tine");
  assert.doesNotMatch(c.faCe, /Ce aș face eu|👉/); persoana(c.faCe, "ține");
});

await test("portofoliul: acțiunea ≤ 110 la persoana I; socul Nasdaq −10% trece în socText (cifra rămâne)", () => {
  const mare = AS.portofoliu([{ simbol: "NVDA", valoare: 9000, beta: 1.7 }, { simbol: "AMD", valoare: 3000, beta: 1.5 }], 8000);
  persoana(mare.ceAsFace, "peste 20%"); assert.match(mare.ceAsFace, /NVDA/); assert.match(mare.ceAsFace, /45%/); assert.match(mare.ceAsFace, /20%/);
  assert.match(String(mare.socText), /10%/); assert.match(String(mare.socText), /−1\.980 lei/);
  const bine = AS.portofoliu([{ simbol: "NVDA", valoare: 3000 }, { simbol: "AMD", valoare: 2500 }, { simbol: "MSFT", valoare: 2000 }], 9000);
  persoana(bine.ceAsFace, "împărțire ok"); assert.match(bine.ceAsFace, /18%/); assert.match(String(bine.socText), /−750 lei/);
  assert.doesNotMatch(AS.portofoliu([], 1000).ceAsFace, /👉/, "fără poziții e un fapt, nu o acțiune");
});

await test("alertele planului (Discord): titlul ≤ 60 cu prețul ca pe pagină, mesajul pe 2 rânduri (faptul · „👉 ” acțiunea), cheile la fel", () => {
  const [st, tr] = AS.alertePlan({ ticker: "APLD_US_EQ", simbol: "APLD", pret: 25.2, maxDupaCumparare: 31, plan: { stop: 26, trailPct: 15 } }, T0);
  const [ti] = AS.alertePlan({ ticker: "APLD_US_EQ", simbol: "APLD", pret: 31.4, plan: { tinta: 31 } }, T0);
  assert.equal(st.cheie, "t212-APLD_US_EQ-stop-2026-10-01"); assert.equal(tr.cheie, "t212-APLD_US_EQ-trail-2026-10-01"); assert.equal(ti.cheie, "t212-APLD_US_EQ-tinta-2026-10-01");
  for (const [a, pret, fac] of [[st, "$25.20", /^👉 Aș ieși/], [tr, "$31.00", /^👉 Aș ieși/], [ti, "$31.40", /^👉 Aș lua profit/]]) {
    assert.ok(a.titlu.length <= 60, a.titlu);
    const l = a.mesaj.split("\n"); assert.equal(l.length, 2, "2 rânduri: " + a.mesaj);
    assert.ok(l[0].includes(pret), "prețul " + pret + " pe rândul 1: " + l[0]); assert.match(l[1], fac); persoana(l[1].replace(/^👉 /, ""), a.cheie);
  }
  assert.match(st.titlu, /\$26\.00/); assert.match(ti.titlu, /\$31\.00/); assert.match(tr.mesaj.split("\n")[0], /18,7%/); assert.match(tr.titlu, /−15%/);
});

await test("frâna (Discord): faptul cu toate sumele pe rândul 1 (≤ 160), lecția NPA pe rândul 2, la persoana I", () => {
  const a = AS.alertaFrana({ ticker: "NPA_US_EQ", pret: 4.12, mediu: 4.9, sub: -0.159, nr: 3, suma: 2100 }, "NPA"), l = a.mesaj.split("\n");
  assert.equal(a.titlu, "NPA: ai cumpărat în plus pe minus (a 3-a oară la rând)"); assert.equal(a.nivel, "critic");
  assert.equal(l.length, 2, a.mesaj); assert.ok(l[0].length <= 160, l[0]);
  for (const x of ["$4.12", "15,9%", "$4.90", "2.100 lei"]) assert.ok(l[0].includes(x), x + " lipsește: " + l[0]);
  assert.match(l[1], /^👉 N-aș mai adăuga pe minus/); for (const x of ["33.000", "8.165"]) assert.ok(l[1].includes(x), x + ": " + l[1]); persoana(l[1].replace(/^👉 /, ""), "frâna");
});

await test("raportul săptămânii: pierderea peste 20% cu cifrele ei, fără imperativ („pune stopul”)", () => {
  const t = (o) => Object.assign({ id: "x", ticker: "INTC_US_EQ", simbol: "INTC", cost: 1700, rezultat: -410, pct: -0.24, comisioane: 9, pornit: T0 - 9 * ZI, inchis: T0 - 2 * ZI }, o);
  const l = AS.raportSaptamana([t({}), t({ id: "y", simbol: "APLD", rezultat: 120, pct: 0.05, comisioane: 6 })], T0);
  assert.match(l[1], /INTC −410 lei \(−24,0%\)/); assert.match(l[1], /−20%/); assert.doesNotMatch(l[1], /pune stopul/);
});

await test("situații ca asta: „(puține cazuri)” în locul avertizării comune, „1 caz”, cifrele toate", () => {
  const tr = (i, o) => Object.assign({ id: "t" + i, ticker: "NVDA_US_EQ", cost: 1000, rezultat: i % 2 ? 40 : -25, pornit: T0 - (40 - i) * ZI }, o || {});
  const l = [tr(1), tr(2), tr(3), tr(4, { ticker: "APLD_US_EQ" })], cf = {}; l.forEach((t) => { cf[t.id] = { sit: "sus|calm|departe" }; });
  const s = AS.textSituatie(AS.situatiiCaAsta(l, cf, "sus|calm|departe", "APLD_US_EQ"));
  assert.doesNotMatch(s, /un semn, nu o regulă|prea puține,/, s); assert.match(s, /puține cazuri/); assert.match(s, /\b1 caz\b/);
  for (const x of ["4", "median", "pe plus", "cel mai rău", "APLD"]) assert.ok(s.includes(x), x + ": " + s);
});

await test("consilierul pe poziție: titlul ≤ 60, acțiunile la persoana I, „(puține cazuri)”, prețurile ca pe pagină", () => {
  const tr = (i, o) => Object.assign({ id: "t" + i, ticker: "APLD_US_EQ", simbol: "APLD", cost: 1000, rezultat: i % 2 ? -40 : 15, durataOre: 200, pornit: T0 - 90 * ZI, inchis: T0 - 80 * ZI }, o || {});
  const ctx = (n) => ({ inchise: Array.from({ length: n }, (_, i) => tr(i)), piata: { ton: "rau", text: "Nasdaq (QQQ): ↓ trend jos" }, stiri: [], acum: T0 });
  const pz = (o) => Object.assign({ ticker: "APLD_US_EQ", simbol: "APLD", pret: 27, pretMediu: 29.5, pctLei: -0.09, ppl: -300, de: T0 - 12 * ZI, niv: { tintaPozitie: 33 } }, o || {});
  const l = CS.sfaturiPozitie(pz(), ctx(60)), ist = l.find((x) => x.sursa === "istoric" && /60/.test(x.titlu));
  assert.ok(ist.titlu.length <= 60, ist.titlu); assert.match(ist.titlu, /60/); assert.match(ist.titlu, /30 pe plus/); assert.match(ist.titlu, /−750 lei/);
  for (const x of l) if (x.ceAsFace) persoana(x.ceAsFace, x.titlu);
  const mic = CS.sfaturiPozitie(pz(), ctx(6)).find((x) => x.sursa === "istoric");
  assert.match(mic.text, /^\(puține cazuri\)$/); assert.doesNotMatch(mic.text, /un semn/);
  const pr = CS.sfaturiPozitie(pz({ pret: 32.4, pctLei: 0.16 }), ctx(2)).find((x) => x.sursa === "pozitie");
  assert.match(pr.titlu, /\$33\.00/); assert.match(pr.ceAsFace, /\$33\.00/); assert.match(pr.ceAsFace, /\$29\.50/); persoana(pr.ceAsFace, "profit");
  // comisionul: un fapt, nu o actiune („Dacă ieși acum, ieși de fapt pe minus”) - „N-aș ieși” ar fi contrazis un IEȘI din trend; trece in explicatie
  const co = CS.sfaturiPozitie(pz({ pret: 29.55, pctLei: 0.001 }), ctx(0)).find((x) => /comisionul/.test(x.titlu));
  assert.equal(co.ceAsFace, null); assert.match(co.text, /ieși de fapt pe minus/); assert.deepEqual(verifica(co.text, "deCe"), [], co.text);
});

await test("consilierul pe bot: USDT cu virgulă, „(puține cazuri)”, „stopul” (nu „opritorul”), acțiunea la persoana I", () => {
  const l = CS.sfaturiBot({ baza: "CRV.PERP" }, { trades: Array.from({ length: 6 }, (_, i) => ({ moneda: "CRV", rezultat: i % 2 ? -2 : 1 })), fg: { valoare: 82, clasa: "Extreme Greed" }, stiri: [], acum: T0 });
  const ist = l.find((x) => x.sursa === "istoric"), fg = l.find((x) => x.sursa === "piata");
  assert.match(ist.titlu, /−3,00 USDT/); assert.ok(ist.titlu.length <= 60, ist.titlu); assert.equal(ist.text, "(puține cazuri)"); persoana(ist.ceAsFace, "istoric bot");
  assert.doesNotMatch(fg.ceAsFace, /[Oo]pritor/); assert.match(fg.ceAsFace, /stopul/); persoana(fg.ceAsFace, "frica/lăcomia");
});

await test("rândurile 🎲: fără „un semn, nu o regulă”; „puține cazuri independente” rămâne; rezultatele într-o frază ≤ 160 cu cifrele", () => {
  const x = (o) => Object.assign({ p: 0.31, k: 31, n: 100, nIndep: 24, ic: [0.22, 0.41], nivel: "exact", stare: "sus-liniste", conditionat: true }, o || {});
  const ra = PB.randActiune({ stop1: x({ p: 0.08, k: 8 }), sare1: x({ p: 0.03, k: 3, nIndep: 7 }), cursa5: { tinta: x({ p: 0.44, k: 44 }), stop: { p: 0.21 } }, niv: {} }, null, { rezultateZile: 2, evenimente: { mediana: 0.06, max: 0.18 } });
  const tot = ra.map((r) => r.titlu + " " + r.text).join(" | ");
  assert.doesNotMatch(tot, /un semn, nu o regulă/); assert.match(ra.find((r) => /Deschiderea sare/.test(r.titlu)).text, /puține cazuri independente/);
  const rz = ra.find((r) => /Rezultatele vin/.test(r.titlu)).text;
  assert.deepEqual(verifica(rz, "deCe"), [], rz); assert.match(rz, /~6%/); assert.match(rz, /18%/);
  const rb = PB.randuri({ niveluri: { tinta: 0.401, stop: 0.36 }, cursa: { tinta: x({ nIndep: 8 }) } }, null, {});
  assert.doesNotMatch(rb.map((r) => r.text).join(" | ") + PB.rand({ niveluri: { tinta: 0.401, stop: 0.36 }, cursa: { tinta: x({ nIndep: 8 }) } }, null, "long", {}), /un semn, nu o regulă/);
  assert.match(rb[0].text, /puține cazuri independente/);
});

await test("Consilierul poziției: titlul compus ≤ 60, acțiunile proprii la persoana I, prețul ca pe pagină, sumele cu virgulă", () => {
  const niv = (o) => Object.assign({ nivel: "ok", stopAtins: false, stopPozitie: 24.1, tintaPozitie: 33, sursaTrail: "−15% de la maxim (măsurat pe trade-urile tale)" }, o || {});
  const cu = (p, bare, o) => CO.alcatuiesteActiune(Object.assign({ sem: sem(p, bare), niv: niv(), prob: [], sfaturi: [], plan: p.plan, pret: p.pret, pretMediu: p.pretMediu, qty: p.qty, costLei: p.qty * p.pretMediu * 4.35, simbol: p.simbol }, o || {}));
  const su = cu(P({ pretMediu: 22, pret: 29 }), urca, { niv: niv({ stopAtins: true, stopPozitie: 30.12 }) });
  assert.equal(su.nivel, "iesi"); assert.match(su.motive[0].titlu, /\$30\.12/); persoana(su.faCe, "stopul care urcă");
  assert.match(su.bani, /[+−]\d+,\d{2} \$/, "suma în dolari cu virgulă: " + su.bani); assert.match(su.bani, /\$30\.12/);
  const x = (o) => Object.assign({ p: 0.31, k: 31, n: 100, nIndep: 24, ic: [0.22, 0.41], nivel: "exact", stare: "lateral-liniste" }, o || {});
  const prob = PB.randActiune({ stop1: x({ p: 0.28, k: 28 }), sare1: x({ p: 0.03, k: 3 }), niv: {} }, null, { rezultateZile: 2, evenimente: { mediana: 0.06, max: 0.18 } });
  const mi = cu(P({ pretMediu: 28, pret: 29 }), lateral, { prob });
  assert.ok(mi.titlu.length <= 60, mi.titlu); persoana(mi.faCe, "stopul mâine / rezultatele");
  const cj = cu(P({ pretMediu: 30, pret: 25 }), coboara, { prob });
  assert.ok(cj.titlu.length <= 60, cj.titlu);
});

await test("garda: grupul „actiuni” e STRICT și fără abateri", () => {
  assert.ok(STRICT.has("actiuni"), "„actiuni” nu e în STRICT");
  const rele = situatii().filter((x) => x.mod === "actiuni").map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((r) => r.ab.length);
  assert.equal(rele.length, 0, rele.slice(0, 8).map((r) => r.x.sit + " · " + r.x.sursa + ": " + r.ab.join("; ") + " — " + r.x.text.slice(0, 120)).join("\n"));
});

await test("ecranul T212 (sursa): după „Ce aș face eu:” acțiunea începe cu majusculă la persoana I; legenda sub Consilier; fără „vezi … / un semn, nu o dovadă”", () => {
  const s = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.doesNotMatch(s, /Ce aș face eu:<\/b> [a-zăâîșț]/, "o acțiune lipită de etichetă începe cu literă mică");
  assert.doesNotMatch(s, /Ce aș face eu:<\/b> ' \+ \([^?]{0,80}\? ["'][a-zăâîșț]/, "prima ramură după etichetă începe cu literă mică");
  for (const m of s.matchAll(/Ce aș face eu:<\/b> ' \+ \(([^;]{0,900}?)\) \+ '<\/p>'/g)) for (const r of m[1].matchAll(/(?:\? |: )["']([^"']{12,})["']/g)) assert.match(r[1], PERS, "o ramură a acțiunii: " + r[1].slice(0, 80));
  assert.match(s, /function t212ConsHtml[\s\S]{0,4000}Consiliu\.LEGENDA_ACTIUNI/, "legenda (avertizările comune, o dată) lipsește sub Consilierul poziției");
  // legenda paginii T212 = partea comuna + trendul pe zilnice; fara frazele despre grid / bot (poza 02.10: „contra botului, gridul adaugă…” sub APLD)
  const LA = CO.LEGENDA_ACTIUNI;
  assert.equal(typeof LA, "string", "Consiliu.LEGENDA_ACTIUNI lipsește"); assert.match(LA, /un semn, nu o regulă/); assert.match(LA, /zilnice/); assert.doesNotMatch(LA, /grid|botului|zero-ul|podeaua/i);
  assert.ok(CO.LEGENDA.startsWith(LA.split(" Trendul")[0]), "partea comună e aceeași cu a Tabloului");
  assert.doesNotMatch(s, /vezi Jurnal|vezi „Cât te-ar fi salvat stopul”|E un semn, nu o dovadă/);
});

await test("prețul unei acțiuni: ActiuniSemnale.usd scrie ca t212Usd de pe pagină", () => {
  const s = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"), m = s.match(/function t212Usd\(v\) \{[^\n]*\}/);
  const t212Usd = new Function(m[0] + "; return t212Usd;")();
  assert.equal(typeof AS.usd, "function", "ActiuniSemnale.usd lipsește");
  for (const v of [0.0123, 0.5, 1, 1.2345, 9.999, 10, 29.5, 123.456, 1234.5, null, NaN]) assert.equal(AS.usd(v), t212Usd(v), "v = " + v);
  // peste 1 $: 2 zecimale („$4.90”, nu „$4.900” - langa „2.100 lei” se citea ca patru mii noua sute); sub 1 $: 3 cifre semnificative
  assert.equal(AS.usd(4.9), "$4.90"); assert.equal(AS.usd(4.1234), "$4.12"); assert.equal(AS.usd(0.012345), "$0.0123"); assert.equal(AS.usd(29.5), "$29.50");
});

console.log("\n" + (pica ? "PICA · " + pica + " din " + (ok + pica) : "PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
