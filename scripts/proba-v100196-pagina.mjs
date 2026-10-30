// Probele v100.196 · zona „pagina” (învelișul + interfața), după auditul sever din 14.10.2026 seara (el: „repară și fă tot”).
// Rapoartele: raport_app.md (🟡1–6, 🔵1–15) și raport_ui.md (🟡2–13, 🔵1–9, partea din app.js / index.html / app.css / lib-urile zonei).
// Node pur: citește app.js / index.html / app.css / lib-urile ca text și rulează în vm bucățile care se pot rula singure.
//   node scripts/proba-v100196-pagina.mjs   -> exit 1 la orice picare
import "./lib/text-ro-global.mjs";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brut = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const citeste = (...p) => brut(...p).replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message).slice(0, 1500)}`); }); }
console.log("\nv100.196 · zona pagina (învelișul + interfața) · proba\n");

const APP = citeste("public", "app.js"), IDX = citeste("public", "index.html"), CSS = citeste("public", "app.css");
// sursa unei funcții de nivel 1 din app.js: de la „function nume(” rând cu rând, până se compilează
function fnSursa(text, nume) {
  const re = new RegExp("(^|\\n|[;}])((?:async )?function " + nume.replace(/\$/g, "\\$") + "\\()");
  const m = re.exec(text); if (!m) throw new Error("nu găsesc function " + nume);
  const start = m.index + m[1].length, randuri = text.slice(start).split("\n");
  let s = "";
  for (let i = 0; i < Math.min(randuri.length, 400); i++) { s += (i ? "\n" : "") + randuri[i]; try { new vm.Script(s); return s; } catch (e) { /* încă nu s-a închis */ } }
  throw new Error("function " + nume + " nu se închide");
}
const ctx = (extra) => { const c = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, Promise, Error, TypeError, RegExp, Set, Map, ...extra }; c.window = c; c.globalThis = c; vm.createContext(c); return c; };

// ---------------------------------------------------------------------------------------------------------------------------
// GARDA: un `//` lipit DUPĂ cod, la mijlocul rândului, care înghite cod (paleta Ctrl+K, v100.181 - a 7-a oară).
// Garda veche (garda-comentarii.mjs) cere un apel cu punct sau două `…);` - n-a văzut intrările de tablou `["Alerte","alerts"],`.
// Aici: orice bucată a comentariului care începe ca o expresie ([ { ( " ' sau un nume) și se compilează în tablou / obiect / instrucțiuni,
// cu cel puțin un semn de cod (`",` `"]` `);` `=>` `],[`). Proza românească din comentarii nu se compilează așa.
function inceputComentariu(l) {
  let q = null, esc = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "/" && l[i + 1] === "*") { const j = l.indexOf("*/", i + 2); if (j < 0) return -1; i = j + 1; continue; }
    if (c === "/" && l[i + 1] === "/") return i;
    if (c === "/") {
      const inainte = l.slice(0, i).trimEnd(), p = inainte.slice(-1);
      if (!p || "(,=:[!&|?{};+".includes(p) || /\b(return|typeof)$/.test(inainte)) {
        let j = i + 1, cls = false;
        for (; j < l.length; j++) { const d = l[j]; if (d === "\\") { j++; continue; } if (d === "[") cls = true; else if (d === "]") cls = false; else if (d === "/" && !cls) break; }
        i = j; continue;
      }
    }
  }
  return -1;
}
const SEMN_COD = /["'`]\s*[,\]]|=>|\]\s*,\s*\[|[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\s*\(/;   /* sau cel puțin două `…);` (vezi mai jos) */
const compilaCa = (s) => [s, "[" + s + "\n]", "({" + s + "\n})", "(" + s + "\n)"].some((w) => { try { new vm.Script(w); return true; } catch { return false; } });
export function codInghitit(t) {
  if (/garda-comentarii:\s*ok/.test(t)) return null;
  const re = /(?:^|[\s:;,])(\[|\{|\(|"|'|[A-Za-z_$][\w$]*(?:\.[\w$]+)*\s*[(\[=])/g;
  let m;
  while ((m = re.exec(t))) {
    const s = t.slice(m.index + (m[0].length - m[1].length)).trim();
    if (s.length < 15 || (!SEMN_COD.test(s) && (s.match(/\)\s*;/g) || []).length < 2)) continue;
    if (compilaCa(s)) return s;
  }
  return null;
}
export function comentariiCareInghitCod(text) {
  const out = [];
  text.split("\n").forEach((l, i) => {
    const k = inceputComentariu(l); if (k <= 0 || !l.slice(0, k).trim()) return;   // doar comentariile lipite DUPĂ cod
    const s = codInghitit(l.slice(k + 2)); if (s) out.push({ rand: i + 1, cod: s.slice(0, 120) });
  });
  return out;
}
const FISIERE_ZONA = ["public/app.js", "public/sw.js", "public/research-worker.js", "public/lib/pret-viu.js", "public/lib/alerte-ecran.js", "public/lib/text-ro.js", "public/lib/asezare-paznic.js"];

await test("garda `//` (auto-proba): prinde rândul real al paletei din v100.181 și NU sună pe proza comentariilor", () => {
  const rau = '  ["Tabloul botului","tabloubot"],["Grid: ce setez acum?","gridset"],   // v100.181: al treilea câmp = acțiunea, în locul lui navTo["Jurnal de trade","jurnaltrade"],["Trading 212","t212"],["Alerte","alerts"],   // v100.40: ecranele zilnice';
  assert.equal(comentariiCareInghitCod(rau).length, 1, "nu prinde paleta");
  const vechi = '  assert.match(t, /sub gridul de jos cu 0,2%/);   // v100.61: fara majuscule de strigat assert.doesNotMatch(t, /-\\d,\\d% din interval/);';
  assert.equal(comentariiCareInghitCod(vechi).length, 1, "nu prinde cazul vechi din proba-v99");
  for (const l of ["x = 1;   // v100.38: cu [,}] - `linii:botiNr(xo.row)-1` nu mai trece", "y();   // un rând pregătit (ticker, simbol, preț, de); ctx: {inchise, piata, stiri, acum}",
    "z=2;   // v100.40: fără antetul vechi gol („WAIT”, „—”) deasupra ferestrei Grid", "a=[1];   // [ce] = lista monedelor, (vezi mai jos)"])
    assert.equal(comentariiCareInghitCod(l).length, 0, "alarmă falsă pe: " + l);
});
await test("garda `//`: niciun comentariu lipit după cod nu mai înghite cod în fișierele zonei", () => {
  const g = [];
  for (const f of FISIERE_ZONA) for (const x of comentariiCareInghitCod(citeste(...f.split("/")))) g.push(f + ":" + x.rand + " · " + x.cod);
  assert.equal(g.length, 0, "\n         " + g.join("\n         "));
});

// ---------------------------------------------------------------------------------------------------------------------------
await test("P1 paleta Ctrl+K: cele 3 ecrane pierdute sunt înapoi (Jurnal de trade, Trading 212, Alerte) și etichetele sunt în română", () => {
  const i = APP.indexOf("const COMMANDS=["), j = APP.indexOf("\n];", i); assert.ok(i > 0 && j > i);
  const c = ctx({}); const L = vm.runInContext("(" + APP.slice(i + "const COMMANDS=".length, j + 2) + ")", c);
  const id = L.map((x) => x[1]);
  for (const k of ["tabloubot", "busola", "gridset", "jurnaltrade", "t212", "alerts", "dash", "health", "settings"]) assert.ok(id.includes(k), "lipsește " + k);
  assert.equal(L.length, 22, "19 rămăseseră + 3 întoarse");
  const nume = Object.fromEntries(L.map((x) => [x[1], x[0]]));
  assert.equal(nume.dash, "Piața azi"); assert.equal(nume.alerts, "Alerte"); assert.equal(nume.settings, "Setări"); assert.equal(nume.health, "Starea aplicației");
});

await test("P2 „Add shadow setup”: `slip` nu mai e `const` reasignat - fără Binance (execuția = null) adaugă rândul cu alunecarea din setări", async () => {
  const src = fnSursa(APP, "addShadowSetup");
  let pus = null, toasturi = [];
  const c = ctx({ performance: { now: () => 0 }, toast: (t, k) => toasturi.push(k + ":" + t), v67EntryAllowed: () => true, v67CurrentFingerprint: () => "fp", shadowTradesV60: () => [],
    refreshExecutionPro: async () => null, analysisTicker: async () => ({ lastPrice: 100 }), analysisSource: () => "BINANCE", appSettings: () => ({ slippageBps: 7 }),
    paperAdversePrice: (p, s, b) => p * (1 + b / 10000), assetClass: () => "CRYPTO", signalOutcomeHorizonBars: () => 6, v63CostInputSnapshot: () => ({}),
    setShadowTradesV60: (a) => { pus = a; }, v67MarkSignal: () => {}, v67RecoverySnapshot: () => {}, localDbPutRecord: async () => {} });
  c.__radarState = { source: "BINANCE", symbol: "SOLUSDT", tf: "4h", mode: "swing", j: [[1000, 1, 1, 1, 1]], q: { price: 100 } };
  c.__signalState = { tm: { direction: "LONG", stop: 95, entryLow: 99, entryHigh: 101, tp1: 105, tp2: 110, tp3: 115 }, sm: { long: 70, short: 20 } };
  vm.runInContext(src, c);
  const row = await vm.runInContext("addShadowSetup()", c);
  assert.ok(row && pus && pus.length === 1, "rândul nu s-a adăugat: " + toasturi.join(" | "));
  assert.equal(row.entrySlipBps, 7);
});

await test("P6 „Risk of ruin”: generatorul e mulberry32 (aceeași serie ca mcMulberry), nu LCG-ul 1664525", () => {
  const c = ctx({}); vm.runInContext(fnSursa(APP, "mcMulberry") + "\n" + fnSursa(APP, "v60Rng"), c);
  const a = vm.runInContext("const r=v60Rng(4242);[r(),r(),r(),r()]", c), b = vm.runInContext("const m=mcMulberry(4242);[m(),m(),m(),m()]", c);
  assert.deepEqual(a, b);
  for (const f of FISIERE_ZONA) assert.ok(!/1664525|1103515245/.test(citeste(...f.split("/"))), "LCG în " + f);
});
await test("🔵11 IC95 din Profit Readiness: `deterministicRng` = mulberry32 cu aceeași sămânță ca worker-ul (intervalele nu mai depind de Worker)", () => {
  const c = ctx({}); vm.runInContext(fnSursa(APP, "mcMulberry") + "\n" + fnSursa(APP, "deterministicRng"), c);
  const w = ctx({}); vm.runInContext(citeste("public", "research-worker.js").split("\n").filter((l) => /^function mulberry32\(/.test(l)).join("\n"), w);
  assert.equal(vm.runInContext("const r=deterministicRng(9173);JSON.stringify([r(),r(),r()])", c), vm.runInContext("const r=mulberry32(9173);JSON.stringify([r(),r(),r()])", w));
});

// ---------------------------------------------------------------------------------------------------------------------------
await test("P3 cipul din bara de sus: pornește neutru („fără analiză” de la v100.202; înainte „date: —”), nu „LIVE DATA” verde fix", () => {
  const m = IDX.match(/<span class="([^"]*)" id="topLive"[^>]*>([^<]*)<\/span>/); assert.ok(m, "nu găsesc #topLive");
  assert.equal(m[1], "statusChip"); assert.equal(m[2], "fără analiză");
  assert.ok(!/LIVE DATA/.test(IDX));
});
await test("P3 cipul spune sursa și VÂRSTA analizei: verde până la 5 min, galben după, „eroare” la date picate", () => {
  const el = { textContent: "", className: "", title: "" };
  const c = ctx({ document: { getElementById: (id) => (id === "topLive" ? el : null) } });   /* fără `$`: e un const de modul, iar intervalul de sus îl poate prinde în TDZ */
  vm.runInContext("var __topLive=null;" + fnSursa(APP, "topLiveDeseneaza"), c);
  const T = 1_800_000_000_000;
  vm.runInContext("topLiveDeseneaza(" + T + ")", c); assert.equal(el.textContent, "fără analiză"); assert.equal(el.className, "statusChip"); assert.match(el.title, /analizată încă/);
  c.__topLive = { src: "BINANCE", la: T - 30_000, stare: "ok" }; vm.runInContext("topLiveDeseneaza(" + T + ")", c);
  assert.equal(el.textContent, "BINANCE · chiar acum"); assert.equal(el.className, "statusChip live");
  c.__topLive.la = T - 4 * 60_000; vm.runInContext("topLiveDeseneaza(" + T + ")", c); assert.equal(el.textContent, "BINANCE · acum 4 min"); assert.equal(el.className, "statusChip live");
  c.__topLive.la = T - 20 * 60_000; vm.runInContext("topLiveDeseneaza(" + T + ")", c); assert.equal(el.textContent, "BINANCE · acum 20 min"); assert.equal(el.className, "statusChip warn");
  c.__topLive.la = T - 130 * 60_000; vm.runInContext("topLiveDeseneaza(" + T + ")", c); assert.equal(el.textContent, "BINANCE · acum 2 h");
  c.__topLive = { src: "PIONEX → BINANCE", la: T, stare: "rezerva" }; vm.runInContext("topLiveDeseneaza(" + T + ")", c); assert.equal(el.className, "statusChip warn"); assert.match(el.textContent, /^PIONEX → BINANCE · /);
  c.__topLive = { src: "BINANCE", la: T, stare: "eroare" }; vm.runInContext("topLiveDeseneaza(" + T + ")", c); assert.equal(el.textContent, "date: eroare"); assert.equal(el.className, "statusChip warn");
  assert.ok(!/\$\("topLive"\)\.textContent=/.test(APP), "analiza nu mai scrie direct în cip, doar prin topLiveDeseneaza");
  assert.match(APP, /lastWsTick&&Date\.now\(\)-lastWsTick>45000[\s\S]{0,400}topLiveDeseneaza\(\)/, "se reîmprospătează în intervalul de 15 s care există deja (fără interval nou)");
});
await test("🟡7 Health: fără analiză, starea furnizorilor vine din furnizori (OK), nu „NEÎNCERCAT” deasupra pastilelor OK", () => {
  const c = ctx({}); vm.runInContext(fnSursa(APP, "v62StareGenerala"), c);
  const s = (o) => vm.runInContext("v62StareGenerala(" + JSON.stringify(o) + ")", c);
  assert.deepEqual(JSON.parse(JSON.stringify(s({ error: null, neincercat: true, cerute: 4, providerScore: 100, combined: 100 }))), { state: "OK", score: 100 });
  assert.deepEqual(JSON.parse(JSON.stringify(s({ error: null, neincercat: true, cerute: 4, providerScore: 50, combined: 50 }))), { state: "FAIL", score: 50 });
  assert.equal(s({ error: null, neincercat: true, cerute: 0, providerScore: 0, combined: 0 }).state, "NEÎNCERCAT");
  assert.equal(s({ error: "x", neincercat: false, cerute: 4, providerScore: 100, combined: 100 }).state, "DEGRADED");
  assert.equal(s({ error: null, neincercat: false, cerute: 4, providerScore: 100, combined: 70 }).state, "DEGRADED");
  assert.match(fnSursa(APP, "runProviderHealthV62"), /v62StareGenerala\(/);
});

// ---------------------------------------------------------------------------------------------------------------------------
await test("P4 banda roșie goală din Tablou: `hidden` bate `display:grid` (și pastila distanțelor), iar pastila ascunsă se golește", () => {
  assert.match(CSS, /#tbGridLarg\[hidden\][^{]*\{display:none!important\}/);
  assert.match(CSS, /#tabloubot \.tbPill\[hidden\][^{]*\{display:none!important\}|#tabloubot \.tbPill\[hidden\]\s*,[^{]*\{display:none!important\}/);
  // v100.259 (audit 23.10, punctul 13): pastila se atinge doar când diferă; ascunsă = golită rămâne (fără dg: hidden și text ""). Era: /pill\.hidden=true;pill\.textContent=""/
  assert.match(fnSursa(APP, "tbKpiPretDeseneaza"), /var pT=dg\?dg\.pill:"",pC=dg\?"tbPill tbPill-"\+dg\.ton:"tbPill";if\(pill\.hidden!==!dg\)pill\.hidden=!dg;if\(pill\.textContent!==pT\)pill\.textContent=pT;/);
});

await test("P5 laboratorul vechi (v67) nu mai bagă „Operations SAFE MODE” în centrul de alerte și nici notificări", () => {
  const f = fnSursa(APP, "refreshV67Operations");
  assert.ok(!/addAlert\(/.test(f), "refreshV67Operations cheamă încă addAlert");
  assert.match(f, /v67Incident\(sev,"OPS_STATE_CHANGE"/, "incidentul rămâne în panoul lui");
  const ls = { radarAlerts: JSON.stringify([{ kind: "ops-v67", title: "Operations SAFE MODE", read: false }, { kind: "sr", title: "Price near S1", read: false }]) };
  const c = ctx({ localStorage: { getItem: (k) => ls[k] ?? null, setItem: (k, v) => { ls[k] = String(v); } }, updateAlertBadges() {} });
  vm.runInContext([fnSursa(APP, "appAlerts"), fnSursa(APP, "putAlerts"), fnSursa(APP, "alerteV67Curata")].join("\n"), c); vm.runInContext("alerteV67Curata()", c);
  assert.deepEqual(JSON.parse(ls.radarAlerts).map((x) => x.kind), ["sr"], "alertele v67 deja intrate ies la pornire");
  assert.match(APP, /try\{alerteV67Curata\(\)\}catch\(_\)\{\}renderAlerts\(\)/);
});
await test("P5 insigna „necitite”: deschiderea paginii Alerte marchează citite alertele din browser", () => {
  const ls = { radarAlerts: JSON.stringify([{ key: "a", title: "x", msg: "", ts: 1, read: false }, { key: "b", title: "y", msg: "", ts: 2, read: false }]) };
  const badge = { textContent: "", style: {} };
  const c = ctx({ localStorage: { getItem: (k) => ls[k] ?? null, setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } }, $: (id) => (id === "topAlertCount" || id === "sideAlertCount" ? badge : null) });
  vm.runInContext([fnSursa(APP, "appAlerts"), fnSursa(APP, "putAlerts"), fnSursa(APP, "updateAlertBadges"), fnSursa(APP, "alerteLocaleCitite")].join("\n"), c);
  vm.runInContext("updateAlertBadges()", c); assert.equal(badge.textContent, 2);
  vm.runInContext("alerteLocaleCitite()", c); assert.equal(badge.textContent, 0); assert.equal(badge.style.display, "none");
  assert.ok(JSON.parse(ls.radarAlerts).every((x) => x.read === true));
  assert.match(fnSursa(APP, "navTo"), /if\(id==="alerts"\)alerteLocaleCitite\(\)/);
  // 🟡10: insigna nu dă o cifră exactă dintr-o listă tăiată la 100
  ls.radarAlerts = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ key: "k" + i, title: "t", msg: "", ts: i, read: false })));
  vm.runInContext("updateAlertBadges()", c); assert.equal(badge.textContent, "99+");
  const A = paznic().AsezarePaznic; assert.equal(typeof A.alerteNrDin, "function");
  assert.deepEqual(JSON.parse(JSON.stringify(A.alerteNrDin("! Alerte 99+"))), { n: 99, t: "99+" }); assert.deepEqual(JSON.parse(JSON.stringify(A.alerteNrDin("! Alerte"))), { n: 0, t: "0" });
});

// ---------------------------------------------------------------------------------------------------------------------------
await test("🟡2/3 rezultatele din Tablou: o zecimală și virgula (KPI total, % din investiți, din grid, lichidarea, săptămâna, portofoliul)", () => {
  const k = fnSursa(APP, "tbDeseneazaKpi");
  const kl = fnSursa(APP, "tbKpiLichDeseneaza");   /* v100.272: KPI-ul „Lichidare” s-a mutat aici (pe prețul viu, la fiecare tranzacție) */
  assert.ok(!/tot\.toFixed\(2\)|inv\.toFixed\(2\)|gp\.toFixed\(2\)|tbFormateazaSemn\(100\*tot\/inv,2\)/.test(k), "KPI-ul are încă 2 zecimale");
  assert.ok(!/Math\.abs\(dist\)\.toFixed\(1\)\+"%"/.test(kl), "lichidarea KPI cu punct");
  assert.match(k, /var s1=function\(v\)\{var x=TextRo\.num\(v,1\);return v>0&&x!=="0,0"\?"\+"\+x:x\}/); assert.match(k, /pune\("tbKpiTotal",tot===null\?"—":s1\(tot\)/);
  const c = ctx({}); vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + fnSursa(APP, "botiBan").replace(/^/, "function botiNr(v){const n=Number(v);return v==null||v===''||!isFinite(n)?null:n}\n"), c);
  assert.equal(vm.runInContext("botiBan(12.345)", c), "+12,3 USDT"); assert.equal(vm.runInContext("botiBan(-0.04)", c), "0,0 USDT"); assert.equal(vm.runInContext("botiBan(-21.31)", c), "−21,3 USDT");
  assert.equal(vm.runInContext("botiBan(100,2,false)", c), "100,00 USDT", "suma investită (o valoare, nu un rezultat) rămâne la ban");
  assert.match(kl, /TextRo\.pct\(Math\.abs\(dist\),1\)/);
  assert.ok(!/Math\.abs\(x\.grile\)\.toFixed\(2\)/.test(APP), "săptămâna (grilele pe zi) cu 2 zecimale");
  assert.ok(!/var U=function\(v\)\{return \(v>=0\?"\+":"−"\)\+Math\.abs\(v\)\.toFixed\(2\)\+" USDT"\}/.test(APP), "portofoliul cu punct și 2 zecimale");
});
await test("🟡2/3 Jurnalul și Grid-ul: rezultatele cu o zecimală; Market Overview și lățimea pe 24 h cu virgulă și „−”", () => {
  assert.ok(!/Math\.abs\(v\)\.toFixed\(2\)\.replace\("\.",","\)\+" USDT"\},cls=/.test(APP), "jurnalul (U) cu 2 zecimale");
  assert.match(APP, /var real=e\.botId\?\(e\.rezultat!=null\?TextRo\.usdt\(e\.rezultat,1\)/);
  assert.ok(!/\$\{x\.ch>=0\?"\+":""\}\$\{x\.ch\.toFixed\(2\)\}%/.test(APP), "Market Overview: -1.58%");
  assert.match(APP, /\$\("breadth24"\)\.textContent=TextRo\.pctSemn\(avg,1\)/);
});
await test("🟡2/3 banda de sus (pret-viu.js): totalul cu o zecimală și virgulă", () => {
  const c = ctx({}); vm.runInContext(citeste("public", "lib", "pret-viu.js"), c);
  const PV = c.PretViu; assert.ok(PV && PV.banda, "PretViu.banda");
  const p = PV.banda({ bot: { baza: "SOL.PERP", directie: "long", levier: 3, profitTotal: 12.345, distantaLichidarePct: 18.24 }, acum: Date.now() });
  const tot = p.parti.find((x) => x.k === "total"); assert.equal(tot.t, "total +12,3 USDT");
  const neg = PV.banda({ bot: { baza: "SOL.PERP", profitTotal: -0.04 }, acum: Date.now() }).parti.find((x) => x.k === "total"); assert.equal(neg.t, "total 0,0 USDT", "un zero rotunjit nu poartă semn");
});
await test("🟡2 fâșia „ultimii boți închiși” (asezare-paznic.js): rezultatele cu o zecimală", () => {
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /var semn = function \(v, z\) \{ return v == null \? "—" : \(v > 0 \? "\+" : v < 0 \? "−" : ""\) \+ Math\.abs\(v\)\.toFixed\(z == null \? 1 : z\)/);
});

await test("🟡6 UI: pe Simulator grid, Contul întreg, Monte Carlo și Rezultate nu mai stă banda veche „Selected market / Engine bias WAIT”", () => {
  const f = fnSursa(APP, "show");
  const m = f.match(/toggle\("pePaginaNoua",(\[[^\]]*\])\.includes\(id\)\)/); assert.ok(m, "lista paginilor fără bandă");
  assert.deepEqual(JSON.parse(m[1]), ["salt", "sugestii", "carnet", "gridsim", "contintreg", "montecarlo", "rezultate"]);
  assert.match(CSS, /body\.pePaginaNoua \.toolbar,body\.pePaginaNoua \.heroStrip,body\.pePaginaNoua \.tabs\{display:none\}/);
});

// ---------------------------------------------------------------------------------------------------------------------------
// asezare-paznic.js în vm (fără DOM real)
function paznic(extra) {
  const el = () => ({ classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, setAttribute() {}, appendChild() {}, insertBefore() {}, querySelector: () => null, querySelectorAll: () => [], style: {}, textContent: "" });
  const c = ctx({ document: { documentElement: el(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: el, body: el() },
    addEventListener() {}, setInterval() {}, setTimeout() {}, clearTimeout() {}, innerWidth: 1440, localStorage: { getItem: () => null, setItem() {} }, ...extra });
  vm.runInContext(citeste("public", "lib", "text-ro.js"), c); vm.runInContext(citeste("public", "lib", "asezare-paznic.js"), c);
  return c;
}
await test("🟡10 alerte: lista adusă e plină (100) și toată în 24 h ⇒ „cel puțin 100 de alerte”, „cel puțin N critice” (nu cifre exacte)", () => {
  const A = paznic().AsezarePaznic, acum = Date.parse("2026-10-14T18:00:00Z");
  const l = Array.from({ length: 100 }, (_, i) => ({ t: acum - i * 60_000, nivel: i < 16 ? "critic" : i < 46 ? "atentie" : "info", titlu: "a" + i }));
  const c = A.verdictAlerte(l, acum, null), v = c.voci.map((x) => x.n).join(" | ");
  assert.match(v, /cel puțin 100 de alerte în 24 h/); assert.match(v, /cel puțin 16 critice/); assert.match(c.verb, /CRITICE: 16\+/);
  const l2 = l.slice(0, 60); const c2 = A.verdictAlerte(l2, acum, null);
  assert.match(c2.voci.map((x) => x.n).join(" | "), /^16 critice \| 30 de atenție \| 60 de alerte în 24 h$/, "lista neplină: cifre exacte");
});
await test("🟡8 „Colectorul de acasă”: fără bot, starea vine din config-ul adus separat (/api/istoric-bot?action=config), nu „—”", () => {
  const A = paznic().AsezarePaznic, acum = Date.now();
  assert.equal(typeof A.colectorSursa, "function");
  const cuBot = A.colectorSursa({ istoricServer: { config: { colectorLa: acum - 60000 }, adusLa: acum } }, { cfg: { colectorLa: 1 }, la: 1 });
  assert.equal(cuBot.cfg.colectorLa, acum - 60000, "cu bot: istoricul Tabloului");
  const faraBot = A.colectorSursa({}, { cfg: { colectorLa: acum - 120000 }, la: acum - 1000 });
  assert.equal(faraBot.cfg.colectorLa, acum - 120000); assert.equal(faraBot.adusLa, acum - 1000);
  const d = A.colectorDin(faraBot.cfg, acum, faraBot.adusLa); assert.equal(d.viu, true);
  assert.match(citeste("public", "lib", "asezare-paznic.js"), /getJSON\("\/api\/istoric-bot\?action=config"\)/);
});
await test("🟡9 Tablou fără bot: stările goale spun adevărul („Niciun bot activ…”), nu „Aștept botul…” la nesfârșit", () => {
  const c = ctx({}); vm.runInContext("var tbStare={routeOk:null,bot:null,eroare:null};" + fnSursa(APP, "tbTextFaraBot"), c);
  assert.equal(vm.runInContext("tbTextFaraBot()", c), "Aștept botul…");
  vm.runInContext("tbStare.routeOk=true", c); assert.match(vm.runInContext("tbTextFaraBot()", c), /^Niciun bot activ în Pionex/);
  vm.runInContext("tbStare.routeOk=false;tbStare.eroare='HTTP 502'", c); assert.match(vm.runInContext("tbTextFaraBot()", c), /^Nu pot citi boții: HTTP 502/);
  for (const f of ["renderTabloSfaturi", "tbRenderTodo"]) assert.match(fnSursa(APP, f), /tbTextFaraBot\(\)/, f);
  assert.match(fnSursa(APP, "tbDeseneazaKpi"), /tbTextFaraBot\(\)/, "cartelele KPI fără bot au un îndemn, nu doar „—”");
  assert.match(IDX, /data-cit-live>—<\/span>/, "„live” nu apare cât nu sunt date");
  assert.match(fnSursa(APP, "tbCitireGol"), /data-cit-live/);
});

// ---------------------------------------------------------------------------------------------------------------------------
await test("🟡11 engleza din meniul zilnic, bara de jos, Alerte și Contul Pionex e tradusă", () => {
  const nav = (id) => { const m = IDX.match(new RegExp('<button class="sideBtn[^"]*"[^>]*data-nav="' + id + '"[^>]*><span class="sideIcon">[^<]*</span>([^<]*)')); return m && m[1].trim(); };
  assert.equal(nav("dash"), "Piața azi"); assert.equal(nav("alerts"), "Alerte"); assert.equal(nav("market"), "Piața, pe monede"); assert.equal(nav("account"), "Contul Pionex");
  assert.equal(nav("cloud"), "Monitorul din cloud"); assert.equal(nav("settings"), "Setări"); assert.equal(nav("health"), "Starea aplicației"); assert.equal(nav("deriv"), "Futures · funding și OI");
  assert.match(IDX, /data-action-click="openMoreDrawer\(\)"><b>⋯<\/b>Mai mult<\/button>/);
  assert.match(IDX, /<h3>Centrul de alerte<\/h3>/); assert.ok(!/Alert Center|Active rule set|Recent alerts|Near S1 \/ R1/.test(IDX));
  assert.match(IDX, /navTo\('alerts'\)" style="width:auto" type="button">Alerte <span/);
  assert.ok(!/No alerts yet\.|"Alerts cleared"/.test(APP));
  assert.match(citeste("public", "lib", "alerte-ecran.js"), /et: "Deschide Piața azi"/);
  assert.ok(!/API keys are never entered|Refresh balances|Open orders for current coin|Pionex Account · Read Only/.test(IDX));
  assert.match(IDX, /<h3>Contul Pionex · doar citire<\/h3>/);
});
await test("🟡11 regulile alertelor vechi arată starea REALĂ din setări (Pornită / Oprită), nu „ON” scris de mână", () => {
  const el = {}; const $ = (id) => (el[id] = el[id] || { textContent: "", className: "", innerHTML: "", style: {} });
  const c = ctx({ $, appAlerts: () => [], escapeHtml: (s) => String(s), updateAlertBadges() {}, appSettings: () => ({ alerts: { sr: true, ls: false, funding: true, oi: false, signal: true } }) });
  vm.runInContext(fnSursa(APP, "renderAlerts"), c); vm.runInContext("renderAlerts()", c);
  assert.equal(el.alertSrRule.textContent, "Pornită"); assert.equal(el.alertLsRule.textContent, "Oprită"); assert.equal(el.alertOiRule.textContent, "Oprită");
  assert.match(el.alertList.innerHTML, /Nicio alertă în browser/);
});
await test("🔵UI4 „Șterge alertele din browser” cere confirmare și nu mai arată ca o navigare", () => {
  assert.match(fnSursa(APP, "clearAlerts"), /confirm\(/);
  assert.match(IDX, /class="actionGhost alSterge" data-action-click="clearAlerts\(\)"/);
});
await test("🟡13 ținte de apăsare ≥ 44 px pe telefon (Alerte, Setări, Simulator, Biletul, „am deja un plan”, „Cum am socotit”, ✕, „vezi toate ↗”)", () => {
  const i = CSS.indexOf("/* v100.196 · ținte de apăsare"); assert.ok(i > 0, "blocul țintelor");
  const b = CSS.slice(i, CSS.indexOf("}}", i) + 2);
  for (const s of ["#alerts .alBtn", "#alerts .alFila", "#alerts .alComut", "#settings button", "#gsPagina button", ".t212BtnLinie", ".t212StopulMeu>summary", ".ciMetoda>summary", ".rlMetoda>summary", ".grCopy", ".pzLink"]) assert.ok(b.includes(s), "lipsește " + s);
  assert.match(b, /min-height:44px/); assert.match(b, /#alerts \.alComut input\{width:22px;height:22px\}/);
});

// ---------------------------------------------------------------------------------------------------------------------------
await test("🔵1 pagina offline: „Reîncearcă” merge sub CSP (link, fără onclick); SW ține „/” și „/offline”, nu adresele redirecționate", () => {
  const o = citeste("public", "offline.html"); assert.ok(!/\son\w+=/.test(o), "handler inline"); assert.match(o, /<a class="buton" href="\/">Reîncearcă<\/a>/);
  const sw = citeste("public", "sw.js"), shell = JSON.parse(sw.match(/const APP_SHELL=(\[[^\]]*\]);/)[1]);
  assert.ok(!shell.includes("/index.html") && !shell.includes("/offline.html")); assert.ok(shell.includes("/") && shell.includes("/offline"));
  assert.match(sw, /caches\.match\("\/"\)\)\|\|\(await caches\.match\("\/offline"\)\)/); assert.match(sw, /cache\.put\("\/",copy\)/);
  assert.match(sw, /^const CACHE="crypto-radar-v100-(19[6-9]|[2-9]\d\d)";/, "CACHE ridicat la unire (v100.196 sau mai nou)");
});
await test("🔵14 SW: `controllerchange` reîncarcă doar la o ACTUALIZARE, nu la prima instalare", () => {
  assert.match(APP, /var swAveaControlor=!!\(typeof navigator!=="undefined"&&navigator\.serviceWorker&&navigator\.serviceWorker\.controller\);/);
  assert.match(APP, /addEventListener\("controllerchange",\(\)=>\{if\(!swAveaControlor\)\{swAveaControlor=true;return\}location\.reload\(\)\}\)/);
});
await test("🔵2 texte externe scăpate în laboratorul vechi (Opportunity, Scanner, Whale, verdicte, favorite, jurnal)", () => {
  const c = ctx({}); vm.runInContext(fnSursa(APP, "simbolSigur"), c);
  assert.equal(vm.runInContext("simbolSigur('BTC')", c), "BTC"); assert.equal(vm.runInContext("simbolSigur('1000PEPE_USDT.P')", c), "1000PEPE_USDT.P");
  assert.equal(vm.runInContext("simbolSigur(\"x');alert(1)//\")", c), ""); assert.equal(vm.runInContext("simbolSigur('<img>')", c), "");
  assert.match(APP, /data-action-click="selectOpportunity\(&#x27;\$\{simbolSigur\(x\.c\)\}&#x27;,&#x27;\$\{simbolSigur\(x\.source\|\|"PIONEX"\)\}&#x27;\)">\$\{escapeHtml\(x\.c\)\}<\/div>/);
  assert.match(APP, /\('\$\{simbolSigur\(x\.c\)\}'\)"><b>\$\{escapeHtml\(x\.c\)\}<\/b>/);
  assert.match(APP, /">\$\{escapeHtml\(x\.flow\)\}<\/div><div class="extCell">\$\{extMoney\(x\.valueUsd\)\}<\/div><div class="extCell">\$\{escapeHtml\(x\.height\|\|"—"\)\}/);
  assert.match(fnSursa(APP, "verdictChip"), /\$\{escapeHtml\(text\)\}/);
  const rl = fnSursa(APP, "renderLists"); assert.ok(!/\$\{x\}/.test(rl), "favorite/recente nescăpate"); assert.match(rl, /simbolSigur\(x\)/);
  assert.match(APP, /<b>\$\{escapeHtml\(coin\(x\.symbol\)\)\} <small>\$\{escapeHtml\(x\.source\|\|"BINANCE"\)\}<\/small><\/b>/);
  assert.match(APP, /<b class="\$\{signalStatusClass\(x\.status\)\}">\$\{escapeHtml\(x\.status\)\}<\/b>/);
});
await test("🔵3 (vezi 🟡2/3) și 🔵7: istoricul pe server întoarce `false` când trimiterea pică; nota pre-trade nu e dublu-escapată", () => {
  assert.match(fnSursa(APP, "persistScannerHistory"), /return true\}catch\{return false\}/); assert.match(fnSursa(APP, "persistSignalHistory"), /return true\}catch\{return false\}/);
  assert.ok(!/\$\("preTradeNote"\)\.textContent=`[^`]*escapeHtml\(e\.message\)/.test(APP));
});
await test("🔵4 tastele `a` / `s` merg doar pe paginile laboratorului vechi (nu pe Piața azi, Tablou, Grid, Sugestii…)", () => {
  assert.match(APP, /function peLaboratorVechi\(\)/);
  const c = ctx({ document: { querySelector: () => ({ id: "dash" }) } }); vm.runInContext(APP.match(/(?:const|var) PAGINI_ZILNICE=[^\n]*/)[0]   /* v100.214: var */ + "\n" + fnSursa(APP, "peLaboratorVechi"), c);
  assert.equal(vm.runInContext("peLaboratorVechi()", c), false);
  c.document.querySelector = () => ({ id: "tabloubot" }); assert.equal(vm.runInContext("peLaboratorVechi()", c), false);
  c.document.querySelector = () => ({ id: "engine" }); assert.equal(vm.runInContext("peLaboratorVechi()", c), true);
  assert.match(APP, /else if\(e\.key\.toLowerCase\(\)==="a"&&peLaboratorVechi\(\)\)analyze\(true\)/); assert.match(APP, /else if\(e\.key\.toLowerCase\(\)==="s"&&peLaboratorVechi\(\)\)navTo\("scan",true\)/);
});
await test("🔵5 fila veche „Scanner” deschide lista nouă (navTo), nu scannerul vechi de 100 de monede", () => {
  assert.match(IDX, /<button class="tab" data-action-click="navTo\('scan',true\)">Scanner<\/button>/);
});
await test("🔵6 listele tăiate spun „din N” (semnale 80, experimente 40, versiuni 20, alertele colectorului 12, alertele din browser 100)", () => {
  for (const re of [/visible\.slice\(0,80\)[\s\S]{0,900}?\.join\(""\)\+dinN\(80,visible\.length\)/, /\.join\(""\)\+dinN\(40,a\.length\):'<div class="emptyState">Niciun experiment înregistrat\.<\/div>'/,
    /\.join\(""\)\+dinN\(20,a\.length\):'<div class="emptyState">Nicio versiune de model salvată\.<\/div>'/, /\.join\(""\)\+'<\/div>'\+dinN\(12,tbStare\.alerteServer\.length\)\}/, /a\.length>=100\?'<p class="tbSub">se țin doar ultimele 100<\/p>'/]) assert.match(APP, re);
  assert.match(APP, /function dinN\(/);
  const c = ctx({}); vm.runInContext(fnSursa(APP, "dinN"), c);
  assert.equal(vm.runInContext("dinN(80,80)", c), ""); assert.equal(vm.runInContext("dinN(80,120)", c), '<p class="tbSub">primele 80 din 120</p>');
  assert.ok((APP.match(/dinN\(/g) || []).length >= 5, "dinN folosit în listele tăiate");
});
await test("🔵9 manifestul: un singur nume („Crypto Radar”) și scurtăturile duc la ecranele zilnice", () => {
  const m = JSON.parse(citeste("public", "manifest.webmanifest"));
  assert.equal(m.name, "Crypto Radar"); assert.equal(m.short_name, "Crypto Radar");
  assert.deepEqual(m.shortcuts.map((x) => x.url), ["/?panel=tabloubot", "/?panel=gridset", "/?panel=dash", "/?panel=t212"]);
  assert.match(IDX, /<title>Crypto Radar<\/title>/);
});
await test("🔵UI7 Nasdaq / US Stocks deschis direct (link) în modul crypto trece pe acțiuni, nu rămâne gol", () => {
  assert.match(fnSursa(APP, "navTo"), /else if\(id==="stocks"\)\{if\(assetClass\(\)!=="STOCKS"\)setAssetClass\("STOCKS"\);loadStockContext\(\)/);
});
await test("🟡12 UI (partea de CSS): pe telefon „Ce aș cumpăra azi” urcă deasupra „Ce înseamnă pentru tine”", () => {
  assert.match(CSS, /@media \(max-width:640px\)\{\.pzDemo #acasa>#acCumpar\{order:15\}\.pzDemo #acasa>#acTrendZi\{order:16\}\}/);
});
await test("🔵UI1 daltonism: segmentul roșu din barele de pe Piața azi are textură (nu doar culoare); 🔵UI3 textul de 10,5 px urcă la 11,5 px", () => {
  assert.match(CSS, /\.acBar>i\[style\*="--bad"\]\{background-image:repeating-linear-gradient\(135deg/);
  assert.ok(!/#dash \.acHp\{font-size:10\.5px/.test(CSS)); assert.match(CSS, /#dash \.acHp\{font-size:11\.5px/);
  assert.match(CSS, /\.pzRangeAx\{display:flex;justify-content:space-between;font-family:var\(--pzMono\);font-size:11\.5px/);
  assert.match(CSS, /#alerts \.alSterge\{[^}]*color:var\(--bad\)/, "butonul de ștergere arată ca o ștergere");
});

await test("🔵12 pornirea pe telefon: desenele laboratorului vechi (pliat) se fac după primul ecran, când browserul e liber", () => {
  const f = fnSursa(APP, "pornesteLaboratorulVechi");
  for (const x of ["renderPaper()", "renderValidation()", "renderForwardLab()", "renderProfitReadiness(false)", "renderReplayLab()", "renderEdgePro()", "renderV65DecisionOS(false)", "renderV66EdgeValidation(false)", "renderDailyDesk()", "renderModelVersions()", "renderObservedLiquidationHeatmap()"]) assert.ok(f.includes(x), x);
  const boot = APP.slice(APP.indexOf("// Boot only after every versioned module"), APP.indexOf("// Boot only after every versioned module") + 1500);
  assert.match(boot, /\(window\.requestIdleCallback\|\|function\(f\)\{return setTimeout\(f,1200\)\}\)\(function\(\)\{try\{pornesteLaboratorulVechi\(\)\}catch\(e\)\{console\.error\(e\)\}\},\{timeout:4000\}\)/);
  for (const x of ["renderEdgePro();", "renderV65DecisionOS(false);", "renderV66EdgeValidation(false);", "renderReplayLab();"]) assert.ok(!boot.split("\n")[1].includes(x), "încă la pornire: " + x);
  for (const x of ["renderSettings();", "renderAlerts();", "initV67Operations();", "renderFreshness();", "initLocalDataLayer()"]) assert.ok(boot.split("\n")[1].includes(x), "trebuie să rămână la pornire: " + x);
  assert.match(IDX, /id="topVersiune">v100\.38 · doar citire<\/span>/, "„READ ONLY” în română");
});
await test("🔵10 CSS: verdictul Lățimii SUA / al sectoarelor chiar se colorează (clasa e `luS`+stare, CSS-ul scria `.lusbine`)", () => {
  assert.match(citeste("public", "lib", "latime-us.js"), /luVerdict luS' \+ esc\(n\.stare\)/);
  assert.match(CSS, /\.luVerdict\.luSatentie b,\.luVerdict\.luSrau b\{color:var\(--bad\)\}/); assert.match(CSS, /\.luVerdict\.luSbine b\{color:var\(--good\)\}/);
  assert.ok(!/\.lus(bine|rau|atentie)\b/.test(CSS));
});
await test("🔵10 CSS: clasele dovedite nefolosite (nicăieri în html / app.js / lib / functions / scripts, nici construite) au ieșit; duplicatele identice la fel", () => {
  for (const c of ["tbEv-alerta", "tbErouCifra", "modalShade", "skeleton", "tbDirSch", "kbd", "zoneNeutral", "pzProzaAscunsa"]) assert.ok(!new RegExp("\\." + c.replace(/-/g, "\\-") + "(?![\\w-])").test(CSS), "încă în CSS: ." + c);
  for (const c of ["acVreme", "tbGraficSvg", "t212Chev", "acNiv-frica", "tbPill-bine", "luZHealthy"]) assert.ok(new RegExp("\\." + c.replace(/-/g, "\\-") + "(?![\\w-])").test(CSS), "la dubiu rămâne: ." + c);
  assert.equal((CSS.match(/(^|\n|\})\.volBox\{/g) || []).length, 1, ".volBox o singură dată");
});

// ---------------------------------------------------------------------------------------------------------------------------
await test("app.css: blocul gol pentru regulile cerute de alte zone stă chiar înaintea ultimei reguli a pândei, care rămâne ULTIMA", () => {
  const iBloc = CSS.lastIndexOf("/* v100.196 · reguli cerute de alte zone */"), iPanda = CSS.lastIndexOf("@media (max-width:640px){.sugPandaTab thead");
  assert.ok(iBloc > 0 && iPanda > iBloc, "blocul înaintea pândei");
  assert.ok(!/@media \(max-width:640px\)\{\.sugPandaTab thead/.test(CSS.slice(iBloc, iPanda)), "în bloc stau doar regulile altor zone, nu pânda");   /* la unire: regulile cerute (data-et) au intrat aici */
  assert.equal(pandaInainteaCozii(CSS), "", "pânda e ultima regulă de tabel");   // v100.258: înaintea blocului v100.224 (#topLive), care rămâne ultimul
});
await test("capcanele casei: app.js rămâne tot CRLF, fără accent grav în comentariile HTML, `let` de modul nou nu e citit la pornire", () => {
  const a = brut("public", "app.js"); assert.equal((a.match(/(?<!\r)\n/g) || []).length, 0, "app.js are rânduri LF");
  for (const f of ["index.html", "offline.html"]) for (const m of citeste("public", f).matchAll(/<!--([\s\S]*?)-->/g)) assert.ok(!m[1].includes("`"), "accent grav în comentariu HTML: " + f);
  assert.ok(!/^let (topLiveStare|swAveaControlor|colCache)\b/m.test(APP));
});
await test("versiunile: ridicate o singură dată, la unire (v100.196 sau mai nou, toate 4 locurile din index.html)", () => {
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 196); assert.equal((IDX.match(new RegExp("v100\\." + ver, "g")) || []).length, 4);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
