// Proba v100.75 - ideile din raportul sfaturilor concise (el, 02.10: „fa ideile”): (1) banda contului din capul paginii cu virgulă și „−”;
// (2) pagina Alerts păstrează rândurile mesajelor; (3) „de” de la 20 și singularul la 1 în tot softul (Tablou, T212, scanner…), păzit pe sursă;
// (4) rândurile de raport ≤ 160 și pe datele lungi (autopsia, „Săptămâna asta”), iar rândul „moneda” din poartă ≤ 160 cu numele botului ca notă.
//   node scripts/proba-v10075.mjs
import "./lib/text-ro-global.mjs";   // RF4 (v100.61): TextRo inaintea modulelor
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { situatii, verifica } from "./garda-texte.mjs";   // incarca modulele (Acasa, Obiceiuri, JurnalTrade…)

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { Acasa: AC, Obiceiuri: OB, JurnalTrade: JT } = globalThis;
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const app = () => fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
const PV = new Function(`${lib("pret-viu.js")}; return PretViu;`)();
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const T0 = Date.UTC(2026, 9, 4, 18, 0), ZI = 86400000, ORA = 3600000;
const REALE = JT.din(JSON.parse(fs.readFileSync(path.join(RAD, "scripts", "fixturi", "boti-inchisi-2026-09-24.json"), "utf8"))), TPL = REALE[0];
let nId = 0;
const tr = (m, rez, o) => Object.assign({}, TPL, { id: "q" + (++nId), moneda: m, rezultat: rez, net: rez, inchis: T0 - 2 * ZI, pornit: T0 - 3 * ZI, durataOre: 30, comisioane: -0.2, funding: 0, dir: "long", greseli: [] }, o || {});
const randuri = (t) => String(t).split("\n");

console.log("Proba v100.75 · ideile: banda, alertele, „de” peste tot, rândurile lungi");

await test("(1) banda contului: „total −2,02 USDT”, „lichidare 20,4%”, „grid ↓3,1% ↑8,6%”, „azi −1,2%” (prețul rămâne cu zecimalele Pionex)", () => {
  const BOT = { baza: "CRV.PERP", directie: "long", levier: 5, profitTotal: -2.02, distantaLichidarePct: 20.44, pretCurent: 0.3793 };
  const r = PV.banda({ bot: BOT, pretViu: { pret: 0.3793, text: "0.3793", primitLa: T0 - 1000, dir: "jos" }, acum: T0, zi: { deschidere: 0.3840 }, distanteGrid: { inGrid: true, josPct: 0.031, susPct: 0.086 }, piata: { ton: "bine" } });
  const t = (k) => (r.parti.find((p) => p.k === k) || {}).t;
  assert.equal(t("total"), "total −2,02 USDT"); assert.equal(t("lich"), "lichidare 20,4%"); assert.equal(t("grid"), "grid ↓3,1% ↑8,6%"); assert.equal(t("zi"), "azi −1,2%");
  assert.equal(t("pret"), "0.3793 ▼", "prețul = forma Pionex");
  assert.equal(PV.banda({ bot: { ...BOT, profitTotal: 1.234 }, acum: T0 }).parti.find((p) => p.k === "total").t, "total +1,23 USDT");
  assert.equal(PV.textZi(1.5).t, "azi +1,5%"); assert.equal(PV.textZi(0).t, "azi 0,0%");
  assert.equal(typeof PV.textGrid, "function", "PretViu.textGrid lipsește (o singură formă pentru bandă și reîmprospătarea live)");
  assert.equal(PV.textGrid({ inGrid: true, josPct: 0.031, susPct: 0.086 }), "grid ↓3,1% ↑8,6%");
  const s = app(); assert.doesNotMatch(s, /"grid ↓"\+\(dg\.josPct\*100\)\.toFixed\(1\)/, "reîmprospătarea live din app.js încă scrie cu punct"); assert.match(s, /PretViu\.textGrid\(dg\)/);
});

await test("(2) pagina Alerts păstrează rândurile mesajelor (faptul pe un rând, „👉 Aș …” pe al doilea)", () => {
  const css = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8"), m = css.match(/#alerts \.alText p\{([^}]*)\}/);
  assert.ok(m, "regula #alerts .alText p lipsește"); assert.match(m[1], /white-space:\s*pre-line/, m[1]);
});

// (3) „de” / singularul pe sursă: un număr întreg nu se lipește direct de un substantiv numărat - trece prin TextRo.cate / cate(...).
// Zecimalele („1,5 zile”) nu iau „de” și rămân (toFixed(…) / TextRo.num(…) / z(…) chiar înainte).
// revizia ideilor (I1): + substantivele gridului (grile, linii, perechi, umpleri, niveluri…), formele „n + (n === 1 ? …)”, regulile
// „>= 20 ? " de"” scrise de mână și textele colectorului (Discord); liniile de jurnal intern (d.jurnal / jurnal(…)) nu sunt texte pentru el
const NUMARATE = "boți|cazuri|monede|zile|ore|alerte|mișcări|porniri|trade-uri|ferestre|perioade|acțiuni|poziții|situații|minute|tranzacții|decizii|semnale|tickere|rânduri|grile|linii|perechi|umpleri|bare|niveluri|intrări|vânzări|ordine|lumânări|săptămâni|intervale";
// zecimalele nu iau „de”: toFixed(1+) [.replace(…)] / TextRo.num(…) / helperele cu o zecimală z(…), nz(…), T(…), T1(…), vg(…), z1(…)
const ZECIMAL = /(toFixed\([1-9]\)(\.replace\([^()]*\))?|TextRo\.num\((?:[^()]|\([^()]*\))*\)|\b(z|nz|T|T1|vg|z1)\((?:[^()]|\([^()]*\))*\))\s*\)?\s*$/;   // un nivel de paranteze în argument: vg(nr(x))
function lipite(src) {
  const out = [], re = new RegExp("\\+\\s*([\"'])\\s(" + NUMARATE + ")(?![\\p{L}\\-])", "gu"), linie = (i) => src.slice(src.lastIndexOf("\n", i) + 1, src.indexOf("\n", i) < 0 ? undefined : src.indexOf("\n", i));
  for (const m of src.matchAll(re)) {
    if (/\bjurnal\(/.test(linie(m.index))) continue;
    const inainte = src.slice(Math.max(0, m.index - 90), m.index);
    if (ZECIMAL.test(inainte)) continue;
    out.push(inainte.slice(-55).replace(/\s+/g, " ") + m[0]);
  }
  for (const m of src.matchAll(/([\w$.\[\]]+)\s*\+\s*\(\s*\1\s*===\s*1\s*\?/g)) if (!/\bjurnal\(/.test(linie(m.index))) out.push("ternar: " + linie(m.index).slice(Math.max(0, m.index - src.lastIndexOf("\n", m.index) - 50)).slice(0, 110));
  for (const m of src.matchAll(/>=\s*20\s*\?\s*["'] de/g)) out.push("„de” scris de mână: " + linie(m.index).trim().slice(0, 110));
  return out;
}
await test("(3) „de” de la 20 și singularul la 1 în tot softul: niciun număr întreg lipit de un substantiv numărat, nicio formă „n + (n === 1 ? …)”, niciun „>= 20 ? de” (pagina + colectorul)", () => {
  const fis = ["public/app.js"].concat(fs.readdirSync(path.join(RAD, "public", "lib")).filter((x) => x.endsWith(".js") && x !== "text-ro.js").map((x) => "public/lib/" + x),   // v100.77: text-ro.js = formatorul (oreN compune „N ore”)
    ["scripts/colector.mjs"], fs.readdirSync(path.join(RAD, "scripts", "lib")).filter((x) => x.endsWith(".mjs") && !/^garda-/.test(x)).map((x) => "scripts/lib/" + x));
  const rele = [];
  for (const f of fis) for (const l of lipite(fs.readFileSync(path.join(RAD, f), "utf8"))) rele.push(f + ": …" + l);
  assert.equal(rele.length, 0, rele.length + " locuri:\n" + rele.slice(0, 40).join("\n"));
});

await test("(3) pe textul real: alerta perechii „(1 pereche)” / „(105 perechi)” (101–119 fără „de”), pornirea pe Discord „25 de boți” ca pe fișă", async () => {
  const AL = globalThis.Alerte; assert.ok(AL && AL.grila, "Alerte.grila lipsește");
  const b = (per) => ({ baza: "CRV.PERP", brut: { buOrderData: { closedExchangeOrderCount: 10 } }, ordinePerechi: per, gridProfitBrut: 0.05, pretCurent: 0.38 });
  const m1 = AL.grila(b(1), { u: 9, per: 0, g: 0 }).mesaje.map((x) => x.mesaj).join(" "), m105 = AL.grila(b(105), { u: 9, per: 104, g: 0 }).mesaje.map((x) => x.mesaj).join(" ");
  assert.match(m1, /\(1 pereche\)/, m1); assert.match(m105, /\(105 perechi\)/, m105);
  const { mesajPornire } = await import("./lib/tura-pornire.mjs");
  const p = mesajPornire({ id: "1", baza: "LIGHTER.PERP" }, "LIGHTER", { n: 25, net: -40.5, plus: 6, rata: 0.24, text: "x" }, null, "LIT", "https://x");
  assert.match(JSON.stringify(p), /25 de boți/, JSON.stringify(p).slice(0, 300));
});

await test("(4a) autopsia pe datele lungi: fiecare rând ≤ 160 (motivul real de 60 pe MARSCOIN și cel vechi de 120), nimic pierdut", () => {
  const VECHI = "ținta ta de +4.6 USDT e atinsă și e la adăpost: opritorul tău (0.004961) îți păstrează +4,62 USDT dacă piața se întoarce";   // copia KV 01.10
  const NOU = "prețul stă la marginea de jos a gridului (9,6% din interval)";
  const log = (cod, motiv, total, dupa, stare) => ({ dreptate: false, cod, nivel: "atentie", motiv, t: T0 - 3 * ZI, judecatLa: T0 - 2 * ZI, total, totalDupa: dupa, stare });
  // „podea” e un sfat de stat: a costat când totalul a scăzut după (+4,60 → −1,10); „muta” a costat când totalul a urcat după
  const aut = OB.autopsie([{ moneda: "MARSCOIN", log: [log("muta", NOU, -6.4, 2.2, "liniste-jos")] }, { moneda: "1000BONK", log: [log("podea", VECHI, 4.6, -1.1, null)] }], T0);
  assert.equal(aut.scumpe.length, 2, JSON.stringify(aut.scumpe));
  const rd = OB.raportDuminica({ trades: [tr("CRV", -3)], acum: T0, autopsie: aut });
  const lung = rd.linii.flatMap(randuri).filter((l) => l.length > 160);
  assert.equal(lung.length, 0, lung.map((l) => l.length + ": " + l).join("\n"));
  const tot = rd.linii.join("\n");
  for (const x of [NOU, VECHI, "MARSCOIN", "1000BONK", "−6,40 → +2,20 USDT", "ar fi costat 8,60 USDT", "+4,60 → −1,10 USDT", "ar fi costat 5,70 USDT"]) assert.ok(tot.includes(x), "lipsește: " + x + "\n" + tot);
});

await test("(4b) poarta: rândul „moneda” ≤ 160 și la peste 100 de boți; numele botului („LIT = LIGHTER la boții Pionex”) e notă, arătată pe fișă", () => {
  const ist = Array.from({ length: 113 }, (_, i) => tr("LIGHTER", i % 3 ? -12.3456 : 4.2, { inchis: T0 - (i + 2) * 6 * ORA, pornit: T0 - (i + 3) * 6 * ORA }));
  const f = { simbol: "LIT_USDT_PERP", dir: "long", verdict: { nivel: "porneste", motive: [] }, setare: { levierSigur: 4 }, directie: { dir: "long", tarie: "mediu" } };
  const r = OB.poarta({ acum: T0, fisa: f, levier: 3, dir: "long", plan: { plus: 5, minus: 10 }, trades: ist, numeBot: "LIGHTER.PERP" }), m = r.reguli.find((x) => x.cod === "moneda");
  assert.ok(m && !m.ok, JSON.stringify(m)); assert.ok(m.text.length <= 160, m.text.length + ": " + m.text);
  assert.equal(m.nota, "LIT = LIGHTER la boții Pionex", "nota cu numele botului"); assert.doesNotMatch(m.text, /la boții Pionex/);
  const s = app(), i = s.indexOf("function grPoartaHtml("), corp = s.slice(i, s.indexOf("\nfunction ", i + 10));
  const ctx = { Obiceiuri: OB, $: () => null, grPlanDinScan: () => null, escapeHtml: (x) => String(x), grPoartaRez: { simbol: "LIT_USDT_PERP", rez: r } };
  vm.createContext(ctx); vm.runInContext(corp + ";this.f=grPoartaHtml;", ctx);
  assert.match(ctx.f({ simbol: "LIT_USDT_PERP" }), /<br><span class="tbSub">LIT = LIGHTER la boții Pionex<\/span>/, "fișa nu arată nota (v100.77: pe rândul ei)");
});

await test("(4c) raportul săptămânii pieței: „📅 Săptămâna asta” cu 5 evenimente mari - rânduri ≤ 160, toate evenimentele rămân", () => {
  const ev = [["mar 15:30", "Core PCE Price Index m/m"], ["mie 21:00", "Federal Funds Rate"], ["mie 21:00", "FOMC Statement"], ["vin 15:30", "Non-Farm Employment Change"], ["vin 15:30", "Average Hourly Earnings m/m"]];
  const r = AC.raportSaptamana({ btc7: 1.2, qqq5: 0.4, calendar: ev.map(([cand, titlu]) => ({ mare: true, cand, titlu })) });
  const lung = randuri(r.mesaj).filter((l) => l.length > 160); assert.equal(lung.length, 0, lung.join("\n"));
  for (const [cand, titlu] of ev) assert.ok(r.mesaj.includes(cand + " " + titlu), "lipsește: " + titlu);
});

await test("garda „acasa” are acum și datele lungi (autopsia pe MARSCOIN, poarta la 113 boți cu notă, săptămâna cu 5 evenimente) - fără abateri", () => {
  const s = situatii().filter((x) => x.mod === "acasa");
  for (const re of [/MARSCOIN/, /Pe LIGHTER pierzi: 113 boți/, /Non-Farm Employment Change/]) assert.ok(s.some((x) => re.test(x.text)), "garda nu generează: " + re);   // 113 → fără „de” (13 < 20)
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.slice(0, 6).map((q) => q.x.sit + ": " + q.ab.join("; ") + " — " + q.x.text.slice(0, 120)).join("\n"));
});

console.log("\n" + (pica ? "V100.75 PICA · " + pica + " din " + (ok + pica) : "V100.75 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
