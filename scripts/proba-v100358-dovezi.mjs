// Proba v100.358 - dovezile Jurnalului de trade (JurnalDovezi), graficele (JurnalGrafice) și onestitatea din StatisticaTrade.
// Rulează: node scripts/proba-v100358-dovezi.mjs            (simulările H0 cu 300 de repetări)
//          node scripts/proba-v100358-dovezi.mjs --mare     (simulările H0 cu 2.000 de repetări - pentru documentul protocolului)
// Datele reale (arhiva boților, contrafactualul) se iau din scratchpad DACĂ există (variabila PROBA_DATE sau calea de mai jos); altfel se sar, spus.
// Aleatorul probei e tot mulberry32 cu sămânță fixă (niciodată Math.random): proba dă aceleași cifre la fiecare rulare.
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const LIB = new URL("../public/lib/", import.meta.url);
for (const f of ["text-ro.js", "grid-calcul.js", "jurnal-trade.js", "statistica-trade.js", "jurnal-dovezi.js", "jurnal-grafice.js", "obiceiuri.js"]) {
  vm.runInThisContext(fs.readFileSync(new URL(f, LIB), "utf8"), { filename: f });
}
const { JurnalDovezi: JD, JurnalGrafice: JG, StatisticaTrade: ST, JurnalTrade: JT, Obiceiuri: OB } = globalThis;
const MARE = process.argv.includes("--mare"), REP_H0 = MARE ? 2000 : 300;
const DATE = process.env.PROBA_DATE || "C:/Users/Cimin/AppData/Local/Temp/claude/4e861e315d503741/af6830ac-1b75-445f-b332-e878fafb4356/scratchpad/audit-stat/date/";

let teste = 0, trec = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); trec++; console.log("  ok   " + nume); } catch (e) { console.log("  PICĂ " + nume + "\n       " + String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")); }
}
const ZI = 86400000, H = 3600000;
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function normal(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function student3(r) { const z = normal(r), c = normal(r) ** 2 + normal(r) ** 2 + normal(r) ** 2; return z / Math.sqrt(c / 3); }
// un bot în forma JurnalTrade.din
let nid = 0;
function bot(o) {
  const net = o.net, rez = net + 0.3, grile = o.grile !== undefined ? o.grile : 1.5;
  const pornit = o.pornit, inchis = o.inchis !== undefined ? o.inchis : pornit + (o.ore !== undefined ? o.ore : 3) * H;
  return { id: o.id || "b" + (++nid), moneda: o.moneda || "BTC", dir: o.dir || "long", levier: o.levier !== undefined ? o.levier : 3, investit: 100, pus: 100,
    pornit, inchis, durataOre: (inchis - pornit) / H, jos: o.jos !== undefined ? o.jos : 90, sus: o.sus !== undefined ? o.sus : 110, grileN: 20, pretInit: 100,
    rezultat: rez, grile, pozitie: rez - grile, comisioane: -0.2, funding: -0.1, net, greseli: (o.greseli || []).map((cod) => ({ cod, titlu: cod, text: "", dataViitoare: "dv " + cod })) };
}
const T0 = Date.UTC(2026, 0, 5, 8);   // luni 5 ianuarie 2026, 10:00 ora României
// date sintetice FĂRĂ efect (H0): zile cu număr foarte diferit de boți, efect comun al zilei, cozi grele (Student 3), monede la modă pe perioade
function sintetic(seed, o = {}) {
  const r = rng(seed), D = o.zile || 150, L = [], monede = 25, faza = Array.from({ length: monede }, () => r() * 6.28), rho = o.rho || 0; let ef = 0;
  for (let d = 0; d < D; d++) {
    const k = Math.min(40, Math.floor(Math.exp(normal(r)) * (o.peZi || 4)) + 1), efZi = (ef = rho * ef + Math.sqrt(1 - rho * rho) * normal(r) * 3), pG = 0.05 + 0.6 * r();
    for (let j = 0; j < k; j++) {
      let c = 0, tot = 0; const w = []; for (let m = 0; m < monede; m++) { const v = (1 / (m + 1)) * (1.2 + Math.sin(faza[m] + d / 20)); w.push(v); tot += v; }
      let u = r() * tot; while (c < monede - 1 && u > w[c]) { u -= w[c]; c++; }
      const greseli = o.greseli ? ["reintrare", "grile-prea-dese", "levier-peste-sigur", "funding-platit"].filter(() => r() < pG) : [];
      L.push(bot({ pornit: T0 + d * ZI + Math.floor(r() * 24) * H + Math.floor(r() * 59) * 60000, ore: 0.2 + r() * 12, moneda: "M" + c, dir: ["long", "short", "neutru"][Math.floor(r() * 3)],
        net: efZi + 4 * student3(r), greseli }));
    }
  }
  return L;
}
function faraNaN(x, unde) { const s = JSON.stringify(x); assert.ok(!/NaN|Infinity|undefined/.test(s), unde + ": " + s.slice(0, 200)); }
// SVG: etichete echilibrate, fără NaN / undefined / Infinity, role + aria, culori doar prin clase
function verificaSvg(s, unde, lat) {
  assert.ok(typeof s === "string" && s.startsWith("<svg") && s.endsWith("</svg>"), unde + ": nu e svg");
  assert.ok(!/NaN|undefined|Infinity|null/.test(s), unde + ": NaN/undefined/Infinity/null în text: " + (s.match(/.{0,40}(NaN|undefined|Infinity|null).{0,40}/) || [""])[0]);
  assert.match(s, /role="img"/); assert.match(s, /aria-label="[^"]+"/);
  assert.doesNotMatch(s, /(fill|stroke)="(#|rgb|hsl|red|green|blue|black|white)/, unde + ": culoare scrisă direct");
  assert.doesNotMatch(s, /style="[^"]*(color|fill|stroke)/, unde + ": culoare în style");
  if (lat) assert.match(s, new RegExp('viewBox="0 0 ' + lat + ' '), unde + ": viewBox-ul nu are lățimea cerută");
  const st = [], re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g; let m;
  while ((m = re.exec(s))) {
    if (m[4] === "/") continue;
    if (m[1]) { const t = st.pop(); assert.equal(t, m[2], unde + ": etichetă închisă greșit </" + m[2] + "> după <" + t + ">"); } else st.push(m[2]);
  }
  assert.equal(st.length, 0, unde + ": etichete rămase deschise " + st.join(","));
  // fiecare marcaj de date (rect / circle cu clasă de date) are <title>
  const marc = s.match(/<(rect|circle) class="(?:jgBara|jgMarc|jgC|jgHit|jgPoz|jgNeg|jgNeutru)[^>]*>(?!<title>)/g) || [];
  const faraTitlu = marc.filter((x) => !/jgGrile|jgPozitie|jgCosturi|jgLinie/.test(x) || true).filter((x) => !/width="1[02]" height="1[02]"/.test(x));   // pătrățelele legendei n-au nevoie
  assert.equal(faraTitlu.length, 0, unde + ": marcaje fără <title>: " + faraTitlu.slice(0, 2).join(" "));
}

console.log("\nV100.358 · dovezile Jurnalului (JurnalDovezi + JurnalGrafice + StatisticaTrade) · proba" + (MARE ? " · MARE" : "") + "\n");

await test("ziRo / inceputZi: ziua României și la schimbarea orei (UTC+2 / UTC+3), miezul nopții exact", () => {
  assert.equal(JD.ziRo(Date.UTC(2026, 2, 28, 22, 30)), "2026-03-29");   // 00:30 iarna (UTC+2)
  assert.equal(JD.ziRo(Date.UTC(2026, 2, 28, 21, 59)), "2026-03-28");
  assert.equal(JD.ziRo(Date.UTC(2026, 6, 31, 21, 0)), "2026-08-01");    // 00:00 vara (UTC+3)
  assert.equal(JD.ziRo(Date.UTC(2026, 9, 24, 21, 30)), "2026-10-25");
  assert.equal(JD.ziRo(null), null);
  assert.equal(JD.inceputZi("2026-11-16"), Date.UTC(2026, 10, 15, 22));
  assert.equal(JD.inceputZi("2026-07-01"), Date.UTC(2026, 5, 30, 21));
  assert.equal(JD.inceputZi("2026-03-29"), Date.UTC(2026, 2, 28, 22));   // ziua schimbării: miezul nopții încă UTC+2
});

await test("intervalul: ± t(zile − 1) × SD bootstrap - cuantila t corectă (5 g.l. 2,571; 30 g.l. 2,042; ∞ 1,96)", () => {
  // tCrit nu e exportat: intervalul pe un caz simplu, apoi funcția citită din sursă
  const l = Array.from({ length: 12 }, (_, i) => bot({ pornit: T0 + i * ZI, net: i % 2 ? 1 : -1 }));
  const g = JD.peLevier(l)[0]; assert.equal(g.zile, 12); assert.ok(g.ic && g.ic[0] < 0 && g.ic[1] > 0);
  const src = fs.readFileSync(new URL("jurnal-dovezi.js", LIB), "utf8"), tC = new Function(src.match(/function tCrit\(df\) \{[\s\S]*?\n  \}/)[0] + "; return tCrit;")();
  assert.ok(Math.abs(tC(5) - 2.571) < 0.01, tC(5)); assert.ok(Math.abs(tC(30) - 2.042) < 0.003, tC(30)); assert.ok(Math.abs(tC(1e9) - 1.96) < 0.001); assert.equal(tC(0), Infinity);
});

await test("margini: 0 boți, 1 bot, o singură zi - fiecare funcție răspunde, fără NaN; graficele goale = „”, cu un bot = svg valid", () => {
  for (const [nume, l] of [["0", []], ["1", [bot({ pornit: T0, net: -5, greseli: ["reintrare"] })]], ["o zi", Array.from({ length: 12 }, (_, i) => bot({ pornit: T0 + i * 60000, net: i % 2 ? 3 : -4, greseli: i % 3 ? [] : ["reintrare"] }))], ["nu-listă", null]]) {
    const r = { g: JD.greseli(l), r: JD.reguli(l), m: JD.martor(l, (l || []).slice(0, 1).map((t) => t.id)), z: JD.peZile(l), b: JD.botiPeZi(l), p: JD.pareto(l), lu: JD.peLuna(l), la: JD.peLatime(l), le: JD.peLevier(l), ps: JD.perioade(l, "saptamana"), pl: JD.perioade(l, "luna"), ra: JD.raport(l, T0 - ZI, T0 + ZI) };
    faraNaN(r, "margine " + nume);
    for (const [g, s] of [["curba", JG.curbaZile(r.z)], ["calendar", JG.calendar(r.z)], ["bare", JG.bare(r.la)], ["pareto", JG.pareto(r.p)], ["luna", JG.stivuitLuna(r.lu)]]) {
      if (nume === "0" || nume === "nu-listă") { if (g !== "bare") assert.equal(s, "", nume + " " + g); } else if (s) verificaSvg(s, nume + " " + g);
    }
    if (nume === "1") { assert.equal(r.z.lista.length, 1); assert.equal(r.g.greseli[0].verdict, "putine"); assert.equal(r.r.reguli.length, 0); assert.equal(r.m.verdict, "putine"); }
    if (nume === "o zi") { assert.equal(r.z.rezumat.zile, 1); assert.ok(r.g.greseli.every((x) => x.verdict === "putine"), "o zi = puține zile, niciun verdict"); }
  }
  assert.equal(JD.raport([], 5, 1), null, "perioada întoarsă ⇒ null");
});

await test("greseli: efect construit pe ZILE ⇒ mai-rau / mai-bine; sub 10 boți sau 10 zile ⇒ putine; codurile prin rezultat ies doar ca descrieri", () => {
  const r = rng(7), l = [];
  for (let d = 0; d < 40; d++) for (let j = 0; j < 6; j++) { const g = j < 2; l.push(bot({ pornit: T0 + d * ZI + j * H, net: (g ? -8 : 1) + normal(r), greseli: g ? ["reintrare", "pozitia-a-mancat-grilele"] : j === 2 ? ["grile-prea-dese"] : [] })); }
  const x = JD.greseli(l), re = x.greseli.find((g) => g.cod === "reintrare"), gd = x.greseli.find((g) => g.cod === "grile-prea-dese"), fp = x.greseli.find((g) => g.cod === "funding-platit");
  assert.equal(x.n, 240); assert.equal(x.nBotiCuMacarUna, 120);
  assert.equal(re.verdict, "mai-rau", JSON.stringify(re)); assert.equal(re.n, 80); assert.equal(re.zile, 40); assert.ok(re.ic[1] < 0); assert.equal(re.dataViitoare, "dv reintrare");
  assert.equal(gd.verdict, "mai-bine", "grile-prea-dese are boți de +1 față de restul −2,7 ⇒ CU ea mai bine"); assert.match(gd.text, /nu e o greșeală care te costă/);
  assert.equal(fp, undefined, "revizia G4: funding-ul plătit se știe doar după ⇒ nu e greșeală de decizie");
  assert.deepEqual(x.greseli.map((g) => g.cod), ["reintrare", "grile-prea-dese", "levier-peste-sigur"]);
  assert.deepEqual(x.descrieri.map((g) => g.cod), ["pozitia-a-mancat-grilele", "stop-atins", "funding-platit"]); assert.ok(!("verdict" in x.descrieri[0]));
  assert.equal(x.descrieri[0].n, 80);
  // aceleași 80 de boți puși în 8 zile ⇒ puține zile
  const l2 = l.map((t, i) => ({ ...t, pornit: T0 + (i % 8) * ZI, inchis: T0 + (i % 8) * ZI + H }));
  assert.equal(JD.greseli(l2).greseli[0].verdict, "putine");
});

await test("reguli: o monedă care pierde clar (40 de boți în 20 de zile) iese regulă; durata NU intră în reguli, ci separat; textul cu n și zile", () => {
  const l = sintetic(11, { zile: 120 }), r = rng(3);
  for (let d = 0; d < 20; d++) for (let j = 0; j < 2; j++) l.push(bot({ pornit: T0 + d * 5 * ZI + j * H, moneda: "RAU", net: -25 + normal(r) }));
  const x = JD.reguli(l);
  assert.ok(x.prag > 2 && x.prag < 4.5, "pragul familiei " + x.prag);
  const rau = x.reguli.find((g) => g.grupa === "pe RAU");
  assert.ok(rau, JSON.stringify(x.reguli.map((g) => g.grupa))); assert.equal(rau.semn, -1); assert.equal(rau.n, 40); assert.equal(rau.zile, 20);
  assert.match(rau.text, /40 de boți în 20 de zile/); assert.match(rau.text, /aici pierzi/);
  assert.ok(x.reguli.every((g) => !/^ținuți/.test(g.grupa)), "durata nu e regulă");
  assert.deepEqual(x.laInchidere.map((g) => g.grupa), ["ținuți sub o oră", "ținuți 1–6 ore", "ținuți peste 6 ore"]); assert.match(x.notaInchidere, /nu un sfat/);
  assert.ok(x.toate.every((g) => g.n >= 10 && g.zile >= 10), "familia = doar grupele cu n ≥ 10 și ≥ 10 zile");
  assert.equal(typeof x.naiv.peDate, "number"); assert.ok(x.naiv.zgomotMediu >= 0);
});

await test("reguli.naiv.peDate = câte găsește vechea Obiceiuri.reguliPersonale (Wilson fără corecție, pe brut) pe aceleași date", () => {
  for (const s of [5, 6, 7]) { const l = sintetic(s, { zile: 100 }); assert.equal(JD.reguli(l).naiv.peDate, OB.reguliPersonale(l, "Europe/Bucharest").reguli.length, "sămânța " + s); }
});

await test("martor: blocând cei mai răi ⇒ mai bine decât întâmplarea; blocând la întâmplare ⇒ nedovedit; nimic blocat ⇒ putine", () => {
  const l = sintetic(21, { zile: 60 }), rai = l.slice().sort((a, b) => a.net - b.net).slice(0, 40).map((t) => t.id);
  const a = JD.martor(l, rai);
  assert.equal(a.blocati, 40); assert.ok(Math.abs(a.castig + rai.reduce((s, id) => s + l.find((t) => t.id === id).net, 0)) < 1e-9);
  assert.equal(a.verdict, "mai-bine-decat-intamplarea"); assert.ok(a.p < 0.01 && a.peZi.p < 0.01); assert.match(a.text, /mai bine decât întâmplarea/);
  const r = rng(4), oarecare = l.filter(() => r() < 0.1).map((t) => t.id), b = JD.martor(l, new Set(oarecare));
  assert.ok(b.p > 0.01, "p " + b.p); assert.equal(JD.martor(l, []).verdict, "putine");
});

await test("peZile: zilele calendaristice (și cele goale), cumulul, vârful, căderea cu SEMN NEGATIV, zilele sub vârf", () => {
  const l = [bot({ pornit: T0, net: 10 }), bot({ pornit: T0 + ZI, net: -18 }), bot({ pornit: T0 + ZI + H, net: -12 }), bot({ pornit: T0 + 3 * ZI, net: 5 })];
  const z = JD.peZile(l), L = z.lista, R = z.rezumat;
  assert.deepEqual(L.map((d) => d.zi), ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"]);
  assert.deepEqual(L.map((d) => d.n), [1, 2, 0, 1]); assert.deepEqual(L.map((d) => Math.round(d.cumul)), [10, -20, -20, -15]); assert.deepEqual(L.map((d) => Math.round(d.sub)), [0, -30, -30, -25]);
  assert.equal(Math.round(R.caderMax), -30); assert.equal(R.deLa, "2026-01-05"); assert.equal(R.panaLa, "2026-01-06"); assert.equal(R.dinStart, false);
  assert.equal(R.zile, 3); assert.equal(R.zilePePlus, 2); assert.equal(R.zileSubVarfAcum, 3); assert.deepEqual(R.celMaiLungSubApa, { zile: 3, de: "2026-01-06", pana: "2026-01-08", recuperat: false });
  const z2 = JD.peZile([bot({ pornit: T0, net: -4 }), bot({ pornit: T0 + ZI, net: 9 })]).rezumat;
  assert.equal(z2.dinStart, true); assert.equal(z2.deLa, null); assert.equal(Math.round(z2.caderMax), -4); assert.equal(z2.zileSubVarfAcum, 0); assert.equal(z2.celMaiLungSubApa.recuperat, true);
});

await test("botiPeZi / pareto / peLuna / peLatime / peLevier / raport / perioade pe date construite", () => {
  const l = [];
  for (let d = 0; d < 30; d++) for (let j = 0; j < (d % 3 === 0 ? 20 : 2); j++) l.push(bot({ pornit: T0 + d * ZI + j * 60000, net: d % 3 === 0 ? -1 : 2, jos: 100 - (j % 5) * 5, sus: 100 + (j % 5) * 5, levier: (j % 4) + 1 }));
  const b = JD.botiPeZi(l);
  assert.deepEqual(b.map((g) => [g.et, g.zile, g.boti]), [["1–3 boți pe zi", 20, 40], ["4–7 boți pe zi", 0, 0], ["8–15 boți pe zi", 0, 0], ["16+ boți pe zi", 10, 200]]);
  assert.equal(b[3].netPeBot, -1); assert.equal(b[3].zilePePlus, 0); assert.equal(b[1].putine, true); assert.equal(b[0].putine, false);
  const p = JD.pareto([1, -10, -5, -3, 2, -2].map((v, i) => bot({ pornit: T0 + i * ZI, net: v })));
  assert.equal(p.nPierderi, 4); assert.equal(p.totalPierderi, -20); assert.equal(p.praguri.length, 1); assert.equal(p.praguri[0].kEfectiv, 4); assert.equal(p.praguri[0].dinPierderi, 1);
  assert.equal(p.puncte[1].pondere, 0.5); assert.equal(p.puncte[p.puncte.length - 1].pondere, 1);
  const lu = JD.peLuna(l); assert.equal(lu.length, 2); lu.forEach((m) => assert.ok(Math.abs(m.grile + m.pozitie + m.costuri - m.net) < 1e-9, "grile + poziție + costuri = net"));
  const la = JD.peLatime(l); assert.deepEqual(la.map((g) => g.et), ["sub 5%", "5–10%", "10–20%", "20–40%", "peste 40%"]);
  assert.equal(la.reduce((s, g) => s + g.n, 0), l.length - l.filter((t) => t.sus === t.jos).length);
  assert.equal(la[0].n, 0); assert.equal(la[0].putine, true);
  const le = JD.peLevier(l); assert.deepEqual(le.map((g) => g.et), ["1×", "2×", "3×", "4–5×"]);
  // perioade: săptămâni luni–duminică, cele mai noi întâi, lipite; raportul față de perioada dinainte
  const ps = JD.perioade(l, "saptamana");
  assert.equal(ps[ps.length - 1].cheie, "2026-01-05"); ps.forEach((x, i) => { assert.equal(x.pana - x.de, 7 * ZI); assert.equal(x.panaFata, x.de); if (i) assert.equal(ps[i - 1].de, x.pana); });
  const ra = JD.raport(l, ps[1].de, ps[1].pana, ps[1]);
  const inP = l.filter((t) => t.inchis >= ps[1].de && t.inchis < ps[1].pana), inF = l.filter((t) => t.inchis >= ps[1].deFata && t.inchis < ps[1].panaFata);
  assert.equal(ra.n, inP.length); assert.equal(ra.fata.n, inF.length); assert.ok(Math.abs(ra.dif.net - (ra.net - ra.fata.net)) < 1e-9);
  assert.ok(ra.celMaiBun.net >= ra.celMaiRau.net); assert.ok(ra.bune.length <= 3 && ra.rele.length <= 3);
  const pl = JD.perioade(l, "luna"); assert.deepEqual(pl.map((x) => x.cheie), ["2026-02", "2026-01"]); assert.equal(pl[1].et, "ian 2026");
  assert.equal(pl[1].de, JD.inceputZi("2026-01-01")); assert.equal(pl[1].pana, JD.inceputZi("2026-02-01")); assert.equal(pl[0].deFata, pl[1].de);
});

await test("graficele: lățimea reală (o.lat) în viewBox, textul 11 px, înălțimi fixe, etichete echilibrate, <title> pe marcaje, culori doar prin clase", () => {
  const l = sintetic(31, { zile: 90 }), z = JD.peZile(l);
  for (const lat of [412, 640, 1200]) {
    const o = { lat };
    const c = JG.curbaZile(z, o); verificaSvg(c, "curba " + lat, lat); assert.match(c, /viewBox="0 0 \d+ 360"/); assert.match(c, /font-size="11"/); assert.match(c, /class="jgArie"/);
    verificaSvg(JG.calendar(z, o), "calendar " + lat, lat); assert.match(JG.calendar(z, o), /jgC-2|jgC2/);
    const br = JG.bare(JD.peLevier(l), o); verificaSvg(br, "bare " + lat, lat);
    verificaSvg(JG.pareto(JD.pareto(l), o), "pareto " + lat, lat); verificaSvg(JG.stivuitLuna(JD.peLuna(l), o), "luna " + lat, lat);
  }
  assert.match(JG.curbaZile(z), /viewBox="0 0 640 /, "fără o.lat ⇒ 640");
  // forma paginii: [{et, v, n, zile}] - bara divergentă, eticheta „et (n boți, z zile)”, valoarea cu o zecimală
  const b = JG.bare([{ et: "sub 5%", v: -4.83, n: 126, zile: 48 }, { et: "5–10%", v: 1.26, n: 270, zile: 95 }], { lat: 600 });
  // v100.360: la 600 eticheta lungă (32 de litere × ~6,8 px) nu încape în 216 px ⇒ TOATE trec pe forma scurtă; la 900 încap toate cu „(n boți, z zile)”
  verificaSvg(b, "bare {et,v}", 600); assert.match(b, />sub 5%</); assert.match(b, />5–10%</);
  assert.match(JG.bare([{ et: "sub 5%", v: -4.83, n: 126, zile: 48 }, { et: "5–10%", v: 1.26, n: 270, zile: 95 }], { lat: 900 }), />sub 5% \(126 de boți, 48 de zile\)</); assert.match(b, />−4,8</); assert.match(b, />\+1,3</); assert.match(b, /jgBara jgNeg/); assert.match(b, /jgBara jgPoz/);
  assert.match(b, /viewBox="0 0 600 70"/, "24 px pe rând: 6 + 2 × 24 + 16");
  assert.doesNotMatch(JG.calendar(z), /(\d)\.(\d) USDT/, "cifrele cu virgulă");
});

await test("statistica-trade: rata mare intră la „bine” doar cu factorul de profit ≥ 1; altfel „câștigi des, dar puțin” la greșit", () => {
  const tr = (rez) => rez.map((r, i) => ({ id: "s" + i, eticheta: "M" + (i % 2), pornit: T0 + i * ZI, inchis: T0 + i * ZI + H, rezultat: r, baza: 100, durataOre: 1 }));
  const a = ST.calc(tr([1, 1, 1, 1, 1, 1, 1, 1, -20, -20, 1, 1]), { moneda: "USDT" });
  assert.ok(a.rataCastig >= 0.5 && a.factorProfit < 1);
  assert.ok(!a.bine.some((x) => /Câștigi la/.test(x.text))); assert.ok(a.gresit.some((x) => /Câștigi des, dar puțin/.test(x.text) && /factorul de profit e 0,3/.test(x.text)));
  const b = ST.calc(tr([5, 5, 5, 5, 5, 5, 5, 5, -2, -2, 5, 5]), { moneda: "USDT" });
  assert.ok(b.bine.some((x) => /Câștigi la/.test(x.text)));
});

await test("statistica-trade: „constant” cere ≥ 10 trade-uri ȘI ≥ 5 zile și le spune; simetric și unde pierzi constant", () => {
  const tr = (n, et, rez, zile) => Array.from({ length: n }, (_, i) => ({ id: et + i, eticheta: et, pornit: T0 + (i % zile) * ZI + i * 60000, inchis: T0 + (i % zile) * ZI + i * 60000 + H, rezultat: rez(i), baza: 100, durataOre: 1 }));
  const l = tr(12, "BUN", () => 5, 6).concat(tr(12, "INGHESUIT", () => 5, 2), tr(12, "RAU", (i) => (i % 4 ? -5 : 2), 7), tr(5, "PUTIN", () => 50, 5));
  const s = ST.calc(l, { moneda: "USDT" }), bun = s.bine.find((x) => /câștigi constant/.test(x.text)), rau = s.gresit.find((x) => /pierzi constant/.test(x.text));
  assert.ok(bun && /BUN \(\+60,0 USDT din 12 trade-uri în 6 zile, 100,0% pe plus\)/.test(bun.text), JSON.stringify(bun));
  assert.ok(!/INGHESUIT|PUTIN/.test(bun.text), "2 zile sau 5 trade-uri nu sunt „constant”");
  assert.ok(rau && /RAU .*12 trade-uri în 7 zile/.test(rau.text), JSON.stringify(s.gresit));
  assert.ok(s.gresit.some((x) => /Unde ai pierdut cel mai mult: RAU .*în 7 zile/.test(x.text)), "descrierea rămâne, cu zilele");
  assert.ok(s.perEticheta.every((g) => typeof g.zile === "number"));
});

await test("statistica-trade: duratele judecate PE TRADE (media), nu pe total", () => {
  // „sub o oră”: 40 de trade-uri × −1 = −40 (cel mai mare total pe minus, dar −1 pe trade); „peste 3 zile”: 10 × −3 = −30 (−3 pe trade)
  const l = Array.from({ length: 40 }, (_, i) => ({ id: "a" + i, eticheta: "X", pornit: T0 + i * ZI, inchis: T0 + i * ZI + 0.5 * H, rezultat: -1, baza: 100, durataOre: 0.5 }))
    .concat(Array.from({ length: 10 }, (_, i) => ({ id: "b" + i, eticheta: "Y", pornit: T0 + i * ZI, inchis: T0 + i * ZI + 100 * H, rezultat: -3, baza: 100, durataOre: 100 })))
    .concat(Array.from({ length: 10 }, (_, i) => ({ id: "c" + i, eticheta: "Z", pornit: T0 + i * ZI, inchis: T0 + i * ZI + 3 * H, rezultat: 2, baza: 100, durataOre: 3 })));
  const s = ST.calc(l, { moneda: "USDT" });
  assert.ok(s.gresit.some((x) => /ținute peste 3 zile pierd cel mai mult pe trade: −3,0 USDT pe trade \(10 trade-uri, total −30,0 USDT\)/.test(x.text)), JSON.stringify(s.gresit));
  assert.ok(!s.gresit.some((x) => /ținute sub o oră pierd/.test(x.text)));
  assert.ok(s.bine.some((x) => /ținute 1–6 ore aduc cel mai mult pe trade: \+2,0 USDT/.test(x.text)), JSON.stringify(s.bine));
});

await test("statistica-trade: „Înainte / după” - săgeata doar cu IC95 pe zile care exclude 0 (≥ 10 zile de fiecare parte), altfel ≈ nedovedit", () => {
  const R = ST.REGULI_NOI.de, r = rng(9);
  const mk = (n, dela, f, zile) => Array.from({ length: n }, (_, i) => ({ id: dela + "-" + i, eticheta: "M", pornit: dela + (i % zile) * ZI + i * 60000, inchis: dela + (i % zile) * ZI + i * 60000 + H, rezultat: f(i), baza: 100, durataOre: 1 }));
  const a = mk(60, R - 40 * ZI, (i) => (i % 3 ? 4 : -30) + normal(r), 30), b = mk(60, R + H, (i) => (i % 6 ? 4 : -3) + normal(r), 30);
  const c = ST.compara(a.concat(b), R), v = Object.fromEntries(c.randuri.map((x) => [x.cheie, x.verdict]));
  assert.equal(c.zileA, 30); assert.equal(c.zileB, 30); assert.equal(v.peTrade, "mai-bine"); assert.equal(v.mariPondere, "mai-bine"); assert.equal(v.n, null);
  assert.equal(v.ceaMaiMarePct, null, "un singur trade extrem: fără săgeată");
  assert.ok(c.randuri.find((x) => x.cheie === "peTrade").ic[0] > 0);
  // aceleași trade-uri înghesuite în 2 zile de fiecare parte ⇒ nimic dovedit
  const c2 = ST.compara(mk(60, R - 40 * ZI, (i) => (i % 3 ? 4 : -30), 2).concat(mk(60, R + H, (i) => (i % 6 ? 4 : -3), 2)), R);
  assert.equal(c2.zileDestul, false); assert.ok(c2.randuri.every((x) => x.verdict === null || x.verdict === "nedovedit"));
  const h = ST.html(ST.calc(a.concat(b), { moneda: "USDT" }), { titlu: "x", piata: "crypto", comparatie: c2 });
  assert.match(h, /≈<span class="stVerdTxt"> nedovedit<\/span>/); assert.doesNotMatch(h.slice(h.indexOf("stCompara"), h.indexOf("Curba banilor")), /▲|▼/);
  assert.match(h, /prea puține zile/);
  // sub 10 trade-uri de o parte: ca înainte, fără verdict
  assert.ok(ST.compara(a.concat(b.slice(0, 9)), R).randuri.every((x) => x.verdict === null));
});

await test("statistica-trade: html(s, {faraToate:true}) fără blocul „Toate trade-urile”; implicit (T212) rămâne; exporturile neschimbate", () => {
  const l = Array.from({ length: 15 }, (_, i) => ({ id: "t" + i, eticheta: "M" + (i % 3), pornit: T0 + i * ZI, inchis: T0 + i * ZI + H, rezultat: i % 3 ? 2 : -3, baza: 100, durataOre: 1 }));
  const s = ST.calc(l, { moneda: "USDT" }), h = ST.html(s, { titlu: "x", actiuneCsv: "csvX", actiuneOrdine: "ordX" }), f = ST.html(s, { titlu: "x", actiuneCsv: "csvX", actiuneOrdine: "ordX", faraToate: true });
  assert.match(h, /stToate/); assert.match(h, /Toate trade-urile/); assert.match(h, /csvX/);
  assert.doesNotMatch(f, /stToate|Toate trade-urile|csvX|ordX/); assert.match(f, /Curba banilor/); assert.match(f, /Cele mai mari 5 pierderi/);
  assert.equal((f.match(/<div/g) || []).length, (f.match(/<\/div>/g) || []).length, "div-urile închise");
  assert.equal((h.match(/<div/g) || []).length, (h.match(/<\/div>/g) || []).length);
  for (const k of ["calc", "html", "dinPionexAlte", "compara", "REGULI_NOI", "dinPerioada", "PERIOADE", "svgCurba", "svgLuni", "svgDistributie", "csv", "dinPionex", "dinT212", "bani", "procent", "etInterval", "MIN"]) assert.ok(k in ST, "lipsește exportul " + k);
});

// ---------------- simulările de mărime sub H0 (regula: orice test nou, simulat ÎNAINTE) ----------------
// trei piețe fără niciun efect: zile independente; piață persistentă (efectul zilei AR 0,5); piață foarte persistentă (AR 0,8 = regimuri de
// săptămâni). Peste tot monedele sunt la modă pe perioade, cozile sunt grele (Student 3), iar ziua sintetică trece de miezul nopții românesc.
// Pe datele LUI piața nu e persistentă de la o zi la alta (autocorelația netului mediu pe zi: 0,00 la 1 zi, −0,03 la 7 zile; sarcinaA/autocor.mjs).
// Regulile și greșelile se compară ÎN ACEEAȘI ZI ⇒ trec în toate trei. „Înainte / după” compară perioade DIFERITE: la AR 0,8 niciun bootstrap
// nu desparte regula de regimul pieței (blocuri de 7 zile: ~15% săgeți false) ⇒ acolo doar se raportează, iar textul paginii spune deja
// „piața nu e aceeași în cele două perioade”.
const PIETE = [["zile independente", 0, true], ["piață persistentă (AR 0,5)", 0.5, true], ["piață foarte persistentă (AR 0,8)", 0.8, false]];
const V1 = (x) => (x * 100).toFixed(1).replace(".", ",");
for (const [numePiata, rho, strictCompara] of PIETE) {
  await test("H0 · reguli fără niciun efect, " + numePiata + ": ≤ ~5% din istorii scot măcar o „regulă” (" + REP_H0 + " de istorii)", () => {
    let cu = 0, naivTot = 0; const t0 = Date.now();
    for (let s = 0; s < REP_H0; s++) { const x = JD.reguli(sintetic(1000 + s, { zile: 120, rho })); if (x.reguli.length) cu++; naivTot += x.naiv.peDate; }
    const rata = cu / REP_H0, se = Math.sqrt(0.05 * 0.95 / REP_H0);
    console.log("       reguli (" + numePiata + "): " + V1(rata) + "% din istorii cu ≥ 1 regulă falsă (ținta 5%, ±" + V1(2 * se) + "); vechea regulă: " + (naivTot / REP_H0).toFixed(2).replace(".", ",") + " reguli false în medie · " + ((Date.now() - t0) / 1000).toFixed(1).replace(".", ",") + " s");
    assert.ok(rata <= 0.05 + 2.5 * se, "rata de fals " + rata);
  });
  await test("H0 · greșeli fără efect, " + numePiata + " (frecvența greșelii diferă de la o zi la alta): ~5% verdicte „mai-rau / mai-bine” (" + REP_H0 + " de istorii × 4 coduri)", () => {
    let jud = 0, fals = 0, rau = 0; const t0 = Date.now();
    for (let s = 0; s < REP_H0; s++) JD.greseli(sintetic(5000 + s, { zile: 120, greseli: true, rho })).greseli.forEach((g) => { if (g.verdict === "putine") return; jud++; if (g.verdict !== "nedovedit") fals++; if (g.verdict === "mai-rau") rau++; });
    const rata = fals / jud, se = Math.sqrt(0.05 * 0.95 / jud);
    console.log("       greșeli (" + numePiata + "): " + V1(rata) + "% verdicte false din " + jud + " (ținta 5%, ±" + V1(2 * se) + "; „mai-rau” " + V1(rau / jud) + "%) · " + ((Date.now() - t0) / 1000).toFixed(1).replace(".", ",") + " s");
    // ~5%: cel mult 6% (sau 5% + 2,5 erori standard la puține repetări) - cozile grele țin rata un pic peste nominal; nu sub 3,5% (n-ar avea putere)
    assert.ok(rata <= Math.max(0.06, 0.05 + 2.5 * se) && rata >= Math.min(0.035, 0.05 - 3 * se), "rata " + rata);
  });
  await test("H0 · „Înainte / după” fără nicio schimbare, " + numePiata + (strictCompara ? ": ≤ ~5% săgeți pe fiecare măsură" : ": doar raportat (stres)") + " (" + Math.round(REP_H0 / 2) + " de istorii)", () => {
    const R = ST.REGULI_NOI.de, rep = Math.round(REP_H0 / 2), sag = {};
    for (let s = 0; s < rep; s++) {
      const l = sintetic(9000 + s, { zile: 120, rho }).map((t) => ({ id: t.id, eticheta: t.moneda, pornit: t.pornit - T0 + R - 60 * ZI, inchis: t.inchis - T0 + R - 60 * ZI, rezultat: t.net, baza: 100, durataOre: t.durataOre }));
      ST.compara(l, R).randuri.forEach((x) => { if (x.verdict === null) return; sag[x.cheie] = sag[x.cheie] || [0, 0]; sag[x.cheie][1]++; if (x.verdict !== "nedovedit") sag[x.cheie][0]++; });
    }
    console.log("       înainte/după (" + numePiata + "): " + Object.entries(sag).map(([k, v]) => k + " " + V1(v[0] / v[1]) + "%").join(", "));
    const se = Math.sqrt(0.05 * 0.95 / rep);
    if (strictCompara) for (const [k, v] of Object.entries(sag)) assert.ok(v[0] / v[1] <= 0.05 + 2.5 * se, k + " " + v[0] / v[1]);
    assert.ok(!("ceaMaiMarePct" in sag), "cea mai mare pierdere nu primește verdict");
  });
}

// ---------------- determinism și timp ----------------
function toate(l, jud, bl) {
  const z = JD.peZile(l), ps = JD.perioade(l, "saptamana");
  return { g: JD.greseli(l), r: JD.reguli(l), m: JD.martor(jud || l, bl || l.slice(0, 50).map((t) => t.id)), z, b: JD.botiPeZi(l), p: JD.pareto(l), lu: JD.peLuna(l), la: JD.peLatime(l), le: JD.peLevier(l), ps, pl: JD.perioade(l, "luna"), ra: ps.length ? JD.raport(l, ps[0].de, ps[0].pana, ps[0]) : null };
}
await test("determinism: două rulări pe aceleași date = aceleași cifre (mulberry32 cu sămânță fixă)", () => {
  const l = sintetic(77, { zile: 200, greseli: true });
  assert.equal(JSON.stringify(toate(l)), JSON.stringify(toate(l.map((t) => ({ ...t })))));
});
await test("timpul: toate funcțiile pe ~2.500 de boți < 150 ms (rece și cald)", () => {
  const l = sintetic(88, { zile: 259, peZi: 7, greseli: true }).slice(0, 2500);
  const t0 = performance.now(); toate(l); const rece = performance.now() - t0;
  const m = []; for (let i = 0; i < 3; i++) { const a = performance.now(); toate(l); m.push(performance.now() - a); } m.sort((a, b) => a - b);
  console.log("       " + l.length + " de boți: rece " + rece.toFixed(0) + " ms, cald " + m[1].toFixed(0) + " ms");
  assert.ok(l.length >= 2400); assert.ok(m[1] < 150, "cald " + m[1]); assert.ok(rece < 150, "rece " + rece);
});

// ---------------- datele reale (dacă sunt) ----------------
const areDate = fs.existsSync(DATE + "boti.json");
if (!areDate) console.log("\n  (sar datele reale: nu găsesc " + DATE + "boti.json)\n");
else await test("datele reale: cifrele auditului (greșeli, reguli, martor, cădere, găleți) și timpul pe ele", () => {
  const A = JSON.parse(fs.readFileSync(DATE + "boti.json", "utf8")), l = JT.din(A.boti);
  const cf = fs.existsSync(DATE + "cf.json") ? JSON.parse(fs.readFileSync(DATE + "cf.json", "utf8")).contrafactual : {};
  const jud = l.filter((t) => cf[t.id] && cf[t.id].nivel !== "fara-date"), bl = jud.filter((t) => cf[t.id].nivel !== "porneste").map((t) => t.id);
  const t0 = performance.now(), x = toate(l, jud, bl), ms = performance.now() - t0;
  const svg = [JG.curbaZile(x.z, { lat: 412 }), JG.calendar(x.z, { lat: 412 }), JG.bare(x.la, { lat: 412 }), JG.bare(x.le, { lat: 412 }), JG.bare(x.b, { lat: 412 }), JG.pareto(x.p, { lat: 412 }), JG.stivuitLuna(x.lu, { lat: 412 })];
  svg.forEach((s, i) => verificaSvg(s, "real " + i, 412));
  const ms2 = performance.now() - t0;
  const U = (v) => globalThis.TextRo.usdt(v);
  console.log("       " + l.length + " de boți: calcul " + ms.toFixed(0) + " ms, cu graficele " + ms2.toFixed(0) + " ms");
  x.g.greseli.forEach((g) => console.log("       greșeala " + g.cod + ": " + g.verdict + " · " + g.text));
  x.g.descrieri.forEach((g) => console.log("       ce s-a întâmplat · " + g.titlu + ": " + g.n + " boți, " + U(g.net)));
  console.log("       reguli: " + x.r.grupeTestate + " grupe testate, prag |z| " + x.r.prag.toFixed(2).replace(".", ",") + ", găsite " + x.r.reguli.length + " · vechea regulă: " + x.r.naiv.peDate + " pe date, " + x.r.naiv.zgomotMediu.toFixed(2).replace(".", ",") + " din întâmplare");
  console.log("       martor: " + x.m.text + " · pe zi: " + U(x.m.peZi.medieIntamplare) + ", p " + (x.m.peZi.p * 100).toFixed(1).replace(".", ",") + "%");
  const R = x.z.rezumat; console.log("       zile: " + R.zile + " cu închideri (" + R.zilePePlus + " pe plus), cădere " + U(R.caderMax) + " " + (R.dinStart ? "de la început" : "din " + R.deLa) + " → " + R.panaLa + ", sub vârf acum " + globalThis.TextRo.cate(R.zileSubVarfAcum, "zi", "zile"));
  x.b.forEach((g) => console.log("       " + g.et + ": " + g.zile + " zile, " + g.boti + " boți, " + U(g.netPeBot) + " pe bot" + (g.ic ? " [" + g.ic.map((v) => globalThis.TextRo.num(v, 1)).join("; ") + "]" : "")));
  console.log("       pareto: " + x.p.praguri.map((p) => "cei mai răi " + p.k + " = " + (p.dinPierderi * 100).toFixed(1).replace(".", ",") + "%").join(", "));
  assert.ok(Math.abs(x.m.castig - 1738.9) < 1, "martorul: câștigul Radarului ca în audit");
  assert.ok(x.m.p > 0.05, "martorul nu e dovedit pe datele lui (auditul: p 0,23)");
  assert.equal(x.r.naiv.peDate, OB.reguliPersonale(l, "Europe/Bucharest").reguli.length);
  assert.ok(Math.abs(x.z.rezumat.net - l.reduce((s, t) => s + t.net, 0)) < 1e-6);
  assert.ok(ms < 150, "timpul pe datele reale " + ms);
});

console.log("\n" + trec + "/" + teste + (trec === teste ? " trec" : " — PICĂ " + (teste - trec)));
process.exit(trec === teste ? 0 : 1);
