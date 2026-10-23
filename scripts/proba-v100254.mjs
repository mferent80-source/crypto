// Proba v100.254 (23.10, el: „fa tot”): poarta nu tipărește bucăți la revenire,
// gura spune 4% ca tripwire-ul, sub 10 netul tace, lista goală ține boții,
// prețul 0 și barele din viitor nu intră. Pragurile rămân. Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "macro.js"), ctx);
vm.runInContext(citeste("public", "lib", "grid-calcul.js"), ctx);
vm.runInContext(citeste("public", "lib", "actiuni-semnale.js"), ctx);
vm.runInContext(citeste("public", "lib", "acasa.js"), ctx);
vm.runInContext(citeste("public", "lib", "risc-luna.js"), ctx);
vm.runInContext(citeste("public", "lib", "scor-sezon.js"), ctx);
const AC = ctx.Acasa, AS = ctx.ActiuniSemnale, GC = ctx.GridCalcul, RL = ctx.RiscLuna, S = ctx.ScorSezon, M = ctx.Macro;

let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.254 · POARTĂ · proba\n");

const t212 = citeste("public", "lib", "t212-ecran.js");
const acasa = citeste("public", "lib", "acasa.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const scan = citeste("public", "lib", "scan-ecran.js");
const cont = citeste("public", "lib", "cont-ecran.js");
const sezon = citeste("public", "lib", "scor-sezon.js");
const app = citeste("public", "app.js");
const col = citeste("scripts", "colector.mjs");
const idx = citeste("public", "index.html");
const gc = citeste("public", "lib", "grid-calcul.js");
const risc = citeste("public", "lib", "risc-ecran.js");
const lin = () => AC.vreme({ clasament: { evita: 10, candidati: 90, dir: { long: 45, short: 45, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
const prefix = "N-aș porni boți noi și n-aș cumpăra chiar înainte de ";
const ORA = 3600000;
const START = Date.UTC(2026, 9, 18, 21, 0, 0);
const ACUM = START + 36 * ORA;
const tr = (id, inchis, rezultat) => ({ id: String(id), eticheta: "ZRO", inchis, pornit: inchis - 5 * ORA, rezultat });
const CFG = { start: START, obiectiv: { rata: 0.55, serie: 3, net: 50, pana: null } };

await test("tripwire-ul rămâne 4%; gura spune 4%; evenimentul lung se taie, nu se sare", () => {
  assert.equal(prefix.length, 53);
  assert.match(acasa, /va > 0\.04 \* tot/);
  assert.match(cont, /0\.04 \* tot/);
  assert.doesNotMatch(acasa, /sub 3%/);
  assert.doesNotMatch(cont, /sub 3%/);
  const sub = AC.franaVerb(lin(), { raportStare: "ok", raport: { valoare: { total: 100000 }, risc: { var95: 3900 } } });
  assert.match(sub.faCe, /^Aș porni/);
  const peste = AC.franaVerb(lin(), { raportStare: "ok", raport: { valoare: { total: 100000 }, risc: { var95: 4100 } } });
  assert.match(peste.faCe, /sub 4%/);
  assert.doesNotMatch(peste.faCe, /sub 3%/);
  assert.ok(peste.faCe.length <= 110);
  const scurt = AC.franaVerb(lin(), { eveniment: "CPI m/m." }).faCe;
  assert.equal(scurt, prefix + "CPI m/m.");
  assert.doesNotMatch(scurt, /…/);
  const lung = AC.franaVerb(lin(), { eveniment: "X".repeat(80), fundingAtentie: "long" }).faCe;
  assert.ok(lung.startsWith(prefix));
  assert.equal(lung.length, 110);
  assert.ok(lung.endsWith("…."));
  assert.doesNotMatch(lung, /funding/);
  assert.notEqual(lung, lin().faCe);
});

await test("banii puțini spun doar câți lei liberi; deja null refuză suma, marime() rămâne", () => {
  const g = AS.facPoarta("cumpara", { pesteLiber: true, liber: 120, suma: 5000, bucati: 10 });
  assert.equal(g, "N-aș deschide: ai doar 120 lei liberi.");
  assert.ok(g.length <= 110);
  assert.doesNotMatch(g, /5000|5\.000/);
  const m = AS.marime({ intrare: 100, stop: 90, cont: 50000, fx: 0.22, riscPct: 0.01, deja: null });
  assert.ok(m && m.bucati > 0);
  const refuz = AS.planulMeu({ intrare: 100, stop: 90, cont: 50000, fx: 0.22, riscPct: 1, deja: null, calc: { intrare: 100, stop: 90 } });
  assert.equal(refuz.eroare, "N-aș da o sumă: nu știu cât ai deja în acțiunea asta.");
  assert.equal(refuz.m, null);
  assert.ok(refuz.eroare.length <= 110);
  const las = AS.planulMeu({ intrare: 100, stop: 90, cont: 50000, fx: 0.22, riscPct: 2, deja: 0, calc: {} });
  assert.ok(las.m && las.m.bucati > 0);
  assert.ok(las.avert.some((a) => /Te las/.test(a)));
  assert.match(t212, /N-aș deschide: ai doar " \+ Math\.round\(mCash\.liber\) \+ " lei liberi/);
  assert.match(t212, /if \(deja === null\) return \{ dejaNecunoscut: true \}/);
  assert.match(t212, /dejaId === null/);
});

await test("fără reconciliere sau fără lei nu se dă o sumă; poarta care nu cumpără nu inventează un cod", () => {
  const box = { t212: { cont: { cash: { total: 50000 } } }, Date, Math };
  vm.createContext(box);
  vm.runInContext(`
    function t212FaraMarime(p) { return p && p.sursa && p.sursa.k === "trend12" && !p.sursa.probat ? "trend12" : null; }
    function t212MarimePoarta(p) {
      if (!p || !p.v || p.v.nivel !== "cumpara" || p.v.riscPct === 0) return null;
      if (p.deja === null) return null;
      return p._poarta ? { bucati: 1 } : null;
    }
    function t212RaportCont() { return t212.raportCont || null; }
    function t212CitireVeche() {
      var limita = 30 * 60000, bun = t212.cititBine;
      if (bun && Date.now() - bun < limita) return false;
      if (!bun && !t212.eroare) return false;
      return true;
    }
    function t212FaraSuma(p) {
      var wouldSize = p && p.v && p.v.nivel === "cumpara" && p.v.riscPct !== 0 && !t212FaraMarime(p);
      if (wouldSize && p.deja === null) return "deja";
      if (!t212MarimePoarta(p)) return null;
      var r = t212RaportCont();
      if (!r || !r.reconciliere || !r.reconciliere.t212) return "raport";
      if (Array.isArray(r.reconciliere.t212.abateri) && r.reconciliere.t212.abateri.length) return "reconciliere";
      if (t212CitireVeche()) return "necitit";
      return null;
    }
    function t212TextFaraSuma(fel) {
      if (fel === "reconciliere") return "N-aș da o sumă: jurnalul nu se potrivește cu cantitatea din cont.";
      if (fel === "necitit") return "N-aș da o sumă: brokerul n-a fost citit de 30 de minute.";
      if (fel === "raport") return "N-aș da o sumă: n-am o reconciliere pe tot contul.";
      if (fel === "deja") return "N-aș da o sumă: nu știu cât ai deja în acțiunea asta.";
      return "";
    }
    this.fara = t212FaraSuma; this.text = t212TextFaraSuma;
  `, box);
  const cumpara = { v: { nivel: "cumpara", riscPct: 0.01 }, _poarta: true, deja: 0 };
  assert.equal(box.fara(Object.assign({}, cumpara, { deja: null })), "deja");
  assert.equal(box.fara({ v: { nivel: "nu", riscPct: 0.01 }, deja: null, _poarta: false }), null);
  assert.equal(box.fara(Object.assign({}, cumpara, { v: { nivel: "cumpara", riscPct: 0 } })), null);
  assert.equal(box.fara(cumpara), "raport");
  box.t212.raportCont = { reconciliere: {} };
  assert.equal(box.fara(cumpara), "raport");
  box.t212.raportCont = { reconciliere: { t212: { abateri: [{ ticker: "A" }] } } };
  assert.equal(box.fara(cumpara), "reconciliere");
  box.t212.raportCont = { reconciliere: { t212: { abateri: [] } } };
  box.t212.cititBine = Date.now() - 31 * 60000;
  assert.equal(box.fara(cumpara), "necitit");
  box.t212.cititBine = Date.now();
  assert.equal(box.fara(cumpara), null);
  for (const k of ["raport", "deja", "reconciliere", "necitit"]) assert.ok(box.text(k).length > 0 && box.text(k).length <= 110, box.text(k));
  assert.equal((t212.match(/30 \* 60000/g) || []).length, 1);
  const felie = t212.slice(t212.indexOf("async function t212RegimAdu"), t212.indexOf("function t212RegimPt"));
  assert.doesNotMatch(felie, /10 \* 60000/);
  assert.ok((t212.match(/t212FaraSuma\(p\) \? null : t212MarimePoarta\(p\)/g) || []).length >= 3);
  assert.equal((t212.match(/t212Bucati\(m\.bucati/g) || []).length, 2);
  assert.match(t212, /poarta ar spune NU/);
  assert.match(t212, /Nu tipăresc bucăți sau lei/);
});

await test("A3 spune episoade scurte, legătură nu cauză, titlul încape; durata nu dă „Aș evita”", () => {
  const ob = { k: "A3", stare: "dovedit-rau", nume: "Episod scurt", cu: 20, fara: 20, medieCu: -0.02, medieFara: 0.01, mariCu: 0.2, mariFara: 0.05 };
  const rau = RL.concluzii({ actiuni: { desc: { comisioane: 0, rezultat: 1 }, comportament: [ob] } });
  assert.equal(rau.actiuni[0].titlu, "Episoadele scurte îți ies mai prost (legătură, nu cauză)");
  assert.ok(rau.actiuni[0].titlu.length <= 60);
  assert.equal(rau.actiuni[0].faCe, null);
  const bun = RL.concluzii({ actiuni: { desc: { comisioane: 0, rezultat: 1 }, comportament: [Object.assign({}, ob, { stare: "dovedit-bun" })] } });
  assert.equal(bun.actiuni[0].titlu, "Pozițiile scurte îți ies mai bine (legătură, nu cauză)");
  assert.ok(bun.actiuni[0].titlu.length <= 60);
  const lim = RL.concluzii({ actiuni: { desc: { comisioane: 0, rezultat: 1 }, comportament: [Object.assign({}, ob, { stare: "la-limita-rau" })] } });
  assert.match(lim.actiuni[0].titlu, /\(la limită\)$/);
  assert.doesNotMatch(lim.actiuni[0].titlu, /legătură/);
  assert.match(risc, /x\.k === "A3" \|\| x\.k === "O2"/);
  assert.match(risc, /legătură, nu cauză/);
  assert.match(risc, /K extrageri cu revenire din aceeași fereastră de 30 de zile/);
  assert.match(app, /!\/\^ținuți \/\.test/);
  assert.match(app, /Durata se știe abia la închidere: n-aș da un sfat din ea/);
  assert.match(app, /un semn, nu o dovadă/);
  assert.doesNotMatch(citeste("public", "lib", "obiceiuri.js"), /−0,99 în loc de −21,45/);
});

await test("sub 10 închideri netul nu se colorează și nu se anunță; de la 10 rămâne", () => {
  const s2 = S.calc([tr(1, START + ORA, 60), tr(2, START + 2 * ORA, 1)], CFG, ACUM);
  assert.equal(s2.suficient, false);
  assert.equal(S.alerte(s2, {}).mesaje.length, 0);
  const h2 = S.html(s2, {});
  assert.match(h2, /sub 10: încă nu înseamnă nimic/);
  assert.match(h2, /<span class="scEt">Net<\/span><b class="scVal scMare">/);
  assert.doesNotMatch(h2, /<span class="scEt">Net<\/span><b class="scVal (?:good|bad)/);
  const l = [];
  for (let i = 0; i < 12; i++) l.push(tr(10 + i, START + (i + 1) * ORA, i < 5 ? -2 : 9));
  const s12 = S.calc(l, CFG, ACUM);
  assert.equal(s12.suficient, true);
  assert.ok(S.alerte(s12, {}).mesaje.some((m) => m.fel === "net"));
  const h12 = S.html(s12, {});
  assert.match(h12, /<span class="scEt">Net<\/span><b class="scVal good scMare">/);
  assert.match(sezon, /!\s*s\.suficient \|\| s\.net === null/);
  assert.match(sezon, /!\(z\.n >= 10\)/);
  assert.match(sezon, /s\.suficient && s\.net !== null && s\.net >= s\.obiectiv\.net/);
});

await test("barele din viitor nu intră în regim sau în prețul de acum; lumânarea care scoate ultima rămâne", () => {
  const acum = 1700000000000;
  const secViitor = Math.floor(acum / 1000) + 86400;
  assert.ok(secViitor < acum);
  const bare = M.bare([
    { t: 1600000000, c: 1 },
    { t: secViitor, c: 2 },
    { t: acum + 300000, c: 3 },
    { t: acum + 60000, c: 4 }
  ], acum);
  assert.deepEqual(bare.map((x) => x.c), [1, 4]);
  assert.equal(bare[0].t, 1600000000);
  const bar = (t, c) => ({ time: t, open: c, high: c + 1, low: c, close: c });
  assert.equal(GC.pretCurent([bar(1600000000, 7), bar(secViitor, 99)], acum), 7);
  assert.equal(GC.pretCurent([bar(acum + 60000, 4), bar(acum + 300000, 3)], acum), 4);
  assert.equal(GC.pretCurent([bar(1600000000, 7)]), 7);
  assert.equal(GC.pretCurent([bar(Date.now() + 300000, 3)]), null);
  const corp = gc.slice(gc.indexOf("function bare(randuri)"), gc.indexOf("function timpMs"));
  assert.doesNotMatch(corp, /eViitor/);
  assert.match(corp, /v\.pop\(\)/);
});

await test("lista goală ține boții 10 minute, prețul 0 nu e în afara grilei, piața se recitește singură", () => {
  assert.match(app, /if\(k==='listaNula'\)return null/);
  assert.match(app, /Citirea a venit goală: țin boții de dinainte\./);
  assert.match(app, /10\*60000/);
  assert.match(ae, /Citirea a venit goală: țin boții de dinainte\./);
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /s\.citireGoala \? stare : \(fr \|\| stare\)/);
  assert.match(col, /Number\(b\.pretCurent\) > 0/);
  assert.match(col, /Number\.isFinite\(p\) && p > 0 && b\.gridJos/);
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.137"/);
  const piata = ae.slice(ae.indexOf("async function acasaPiataCol"), ae.indexOf("async function acasaPorneste"));
  assert.doesNotMatch(piata, /acasa\.inLucru = true/);
  assert.match(piata, /acasa\.piataInLucru = true/);
  assert.match(piata, /action=piata/);
  assert.match(piata, /< 60000/);
  assert.match(ae, /acasaPiataCol\(\); return/);
  assert.match(ae, /pr > 0 && isFinite\(pr\)/);
  assert.match(idx, /sau −X% de la prețul limită/);
  assert.match(t212, /de la maxim/);
  assert.match(t212, /ATR, media simplă pe 14 zile/);
  assert.match(t212, /1,5–3× ATR \(media simplă pe 14 zile\)/);
  assert.match(scan, /Mișcarea zilnică \(ATR\)/);
  assert.doesNotMatch(scan, /media simplă pe 14 zile/);
  assert.match(scan, /nu știu cât ai deja în acțiunea asta/);
});

await test("versiunea v100.254, insigna POARTĂ, colectorul pe disc v101.137", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.254.0");
  assert.equal(P.scripts["test:v100254"], "node scripts/proba-v100254.mjs");
  assert.equal((P.scripts.test.match(/test:v100254/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100253/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100254"], /npm run test:v100254/);
  assert.equal((idx.match(/v100\.254/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.254 · POARTĂ</);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-254/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.254"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.254");
  assert.equal(info.badge, "v100.254 · POARTĂ");
  assert.equal(info.engineContract, "54.1");
  assert.match(info.features.poarta254, /v101\.137/);
  assert.match(info.features.alaturi253, /unul lângă altul/);
  assert.match(info.features.clar252, /aproape/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
