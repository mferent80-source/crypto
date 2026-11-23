// Proba v100.377 (22.11.2026, el: „fa idei”, după livrarea v100.376):
//   A  pagina Futures: schimbarea OI e un REZULTAT ⇒ o zecimală, virgulă, minusul adevărat („OI 92,45 K BTC · +1,02%” a picat proba de telefon după publicare);
//   B  poarta de dinaintea împingerii întreabă o adresă de sănătate care EXISTĂ (`/health` dă 404 de la v100.211 ⇒ poarta sărea de o lună probele de ecran);
//   C  unealta de livrare: ce a spus poarta ajunge în jurnal; ultimul rând e „REZULTAT: …”; Functions ale copiei se reconstruiesc înaintea lanțului;
//      probele de după publicare nu se mai rulează a doua oară când ștampila copiei le acoperă; comanda `functions`.
//   node scripts/proba-v100377.mjs        (B2 cere serverul local pe 8788, ca ceilalți pași de rută din lanț)
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.377 · OI cu o zecimală, poarta de dinaintea împingerii, livrarea spusă limpede · proba\n");

const APP = citeste("public", "app.js");
const rand = (n) => { const m = new RegExp("^function " + n + "\\([^\\n]*$", "m").exec(APP); if (!m) throw new Error(n + "() lipsește"); return m[0]; };

/* ---------- A: schimbarea OI pe ecran ---------- */
await test("A1 schimbarea OI pe ecran: o zecimală, virgulă, minusul adevărat; sub 0,1% rămân zecimalele mărunte; fără cifră - liniuță; forma cu punct (citită înapoi) rămâne neatinsă", () => {
  const c = vm.createContext({ TextRo: globalThis.TextRo, Number, Math, parseFloat });
  vm.runInContext(rand("pctText") + "\n" + rand("pctTextRo") + "\n" + rand("oiTrendRo"), c);
  const P = (v) => vm.runInContext("pctTextRo(" + JSON.stringify(v) + ")", c);
  assert.equal(P(1.02), "+1,0%"); assert.equal(P(-5.62), "−5,6%"); assert.equal(P(12.345), "+12,3%"); assert.equal(P(0.96), "+1,0%"); assert.equal(P(-0.34), "−0,3%");
  assert.equal(P(0.04), "+0,04%", "sub 0,1%: zecimalele mărunte, nu „0,0”"); assert.equal(P(-0.004), "−0,004%"); assert.equal(P(0), "+0,0%");
  assert.equal(vm.runInContext("pctTextRo(NaN)", c), "—"); assert.equal(vm.runInContext("pctTextRo(undefined)", c), "—");
  assert.equal(vm.runInContext("pctText(1.02)", c), "+1.02%", "forma citită înapoi cu parseFloat (nivelurile de lichidare, alerta OI) rămâne cu două zecimale și punct");
  const O = (d) => { c.d = d; return vm.runInContext("oiTrendRo(d)", c); };
  /* 1,049% e „+1.05%” în textul cu două zecimale; rotunjit a doua oară ar ieși „+1,1%” - cifra de pe ecran vine din cifra întreagă */
  assert.equal(vm.runInContext("pctText(1.049)", c), "+1.05%"); assert.equal(O({ oiDeltas: { h1: 1.049 }, oiTrend: "+1.05%" }), "+1,0%", "din cifra întreagă, nu din textul deja rotunjit");
  assert.equal(O({ oiTrend: "-5.62%" }), "−5,6%", "fără cifre pe ferestre: din text"); assert.equal(O({ oiTrend: "N/A" }), "—"); assert.equal(O(null), "—");
  /* fără TextRo (cutiile de probă vechi): tot o zecimală */
  const c2 = vm.createContext({ Number, Math }); vm.runInContext(rand("pctTextRo"), c2); assert.equal(vm.runInContext("pctTextRo(1.02)", c2), "+1,0%");
});

await test("A2 cele trei locuri care arată schimbarea OI o scriu prin funcția asta; niciunul nu mai lipește textul cu două zecimale; convențiile probei de telefon nu mai găsesc abatere", async () => {
  assert.match(APP, /\$\("ofOi"\)\.textContent=deriv&&deriv\.oi\?compact\(deriv\.oi\)\+\(deriv\.oiTrend&&deriv\.oiTrend!=="N\/A"\?" · "\+oiTrendRo\(deriv\):""\):"N\/A";/);
  assert.match(APP, /\$\("flowOi"\)\.textContent=deriv\.oi\?compact\(deriv\.oi\)\+\(deriv\.oiTrend&&deriv\.oiTrend!=="N\/A"\?" · "\+oiTrendRo\(deriv\):""\):"N\/A";/);
  assert.match(APP, /\$\("oiContext"\)\.textContent=oi==null\?"N\/A":"OI "\+compact\(oi\)\+" "\+baza\+\(oiTrend!=="N\/A"\?" · "\+pctTextRo\(oiDeltas\.h1\):""\);/);
  assert.equal(/" · "\+deriv\.oiTrend:""|String\(deriv\.oiTrend\)\.replace|oiTrend\.replace\("\.",","\)/.test(APP), false, "textul cu două zecimale nu mai ajunge pe ecran");
  const { abateri } = await import(pathToFileURL(path.join(RAD, "scripts", "proba-ecran-telefon-conventii.mjs")).href);
  assert.equal(abateri("ul OI ¦ OI 92,45 K BTC · +1,02% ¦ Funding mediu ¦ 24 h:").filter((x) => x.tip === "zecimale").length, 1, "precheck: textul de la livrarea v100.376 e o abatere");
  assert.deepEqual(abateri("ul OI ¦ OI 92,45 K BTC · +1,0% ¦ Funding mediu ¦ 24 h:").filter((x) => x.tip === "zecimale"), []);
  assert.deepEqual(abateri("15 min +0,04% · 1 h −5,6% · 4 h +12,3% · 24 h +1,0%"), [], "nici minus ASCII, nici zecimale în plus");
});

/* ---------- B: poarta de dinaintea împingerii ---------- */
const P = await import(pathToFileURL(path.join(RAD, "scripts", "inainte-de-push.mjs")).href);
await test("B1 poarta întreabă adresa de sănătate a rutei market, nu `/health` (care nu mai există pe serverul local)", () => {
  assert.equal(P.ADRESA_SANATATE, "http://127.0.0.1:8788/api/market?type=health");
  const s = citeste("scripts", "inainte-de-push.mjs");
  assert.match(s, /const h = await fetch\(ADRESA_SANATATE, \{ signal: AbortSignal\.timeout\(3000\) \}\);/); assert.equal(/8788\/health"/.test(s), false);
  assert.equal(citeste("scripts", "copie-de-lucru.mjs").includes('const SANATATE = "http://127.0.0.1:8788/api/market?type=health";'), true, "aceeași adresă ca unealta de livrare");
});
await test("B2 pe serverul local de acum: adresa porții răspunde 200 cu versiunea; `/health` răspunde 404 (de asta poarta sărea probele)", async () => {
  let h; try { h = await fetch(P.ADRESA_SANATATE, { signal: AbortSignal.timeout(5000) }); } catch (e) { throw new Error("serverul local de pe 8788 nu răspunde (" + e.message + ") — pasul cere serverul pornit, ca ceilalți pași de rută din lanț"); }
  assert.equal(h.ok, true, "adresa porții: " + h.status); const j = await h.json(); assert.match(String(j.version), /^v100\.\d+$/);
  const v = await fetch("http://127.0.0.1:8788/health", { signal: AbortSignal.timeout(5000) }); assert.equal(v.status, 404, "`/health` pe serverul local");
});

/* ---------- C: unealta de livrare ---------- */
const L = await import(pathToFileURL(path.join(RAD, "scripts", "copie-de-lucru.mjs")).href);
await test("C1 din ieșirea lui `git push` se arată rândurile porții și bilanțurile probelor - nimic altceva", () => {
  const iesire = ["Enumerating objects: 5, done.", "[pre-push] proba de telefon pe v100.377 (toate paginile la 390 px; ~3 min)…", "  ok   acasa: 390 px", "59/59 trec · poze în C:\\Temp\\x", "ștampila probei de telefon: scrisă.",
    "[pre-push] proba de ecran a Tabloului pe v100.377 (stările Tabloului cu date de probă; ~30 s)…", "  ok   A1. ceva", "", "  77 ok · 0 pica", "remote: [pre-push] rând venit cu prefix", "To github.com:x/y.git", "   abc..def  HEAD -> main"].join("\r\n");
  assert.deepEqual(L.liniiPoarta(iesire), ["[pre-push] proba de telefon pe v100.377 (toate paginile la 390 px; ~3 min)…", "59/59 trec · poze în C:\\Temp\\x",
    "[pre-push] proba de ecran a Tabloului pe v100.377 (stările Tabloului cu date de probă; ~30 s)…", "  77 ok · 0 pica", "[pre-push] rând venit cu prefix"]);
  assert.deepEqual(L.liniiPoarta(""), []); assert.deepEqual(L.liniiPoarta(null), []); assert.deepEqual(L.liniiPoarta("Everything up-to-date"), []);
});
await test("C2 rândul de la capătul livrării: publicat sau nu, principalul adus sau nu, avertismentele numărate și numerotate", () => {
  const T = L.textRezultat;
  assert.equal(T({ publicat: "dab527ba", adus: true, avert: [] }), "REZULTAT: PUBLICAT dab527ba pe origin/main · principalul adus · fără avertismente.");
  assert.equal(T({ publicat: "dab527ba", adus: true, avert: ["proba de telefon a picat pe principal"] }), "REZULTAT: PUBLICAT dab527ba pe origin/main · principalul adus · 1 avertisment: (1) proba de telefon a picat pe principal.");
  assert.equal(T({ publicat: "dab527ba", adus: true, avert: ["proba de telefon a picat pe principal", "", "serverul 8788 nu răspunde cu Functions noi (health v100.375, aștept v100.376)"] }),
    "REZULTAT: PUBLICAT dab527ba pe origin/main · principalul adus · 2 avertismente: (1) proba de telefon a picat pe principal (2) serverul 8788 nu răspunde cu Functions noi (health v100.375, aștept v100.376).");
  assert.equal(T({ publicat: "dab527ba", adus: false }), "REZULTAT: PUBLICAT dab527ba pe origin/main · principalul NU a fost adus (motivul e mai sus) · fără avertismente.");
  assert.equal(T({ publicat: null, motiv: "npm test a picat" }), "REZULTAT: NIMIC publicat — npm test a picat."); assert.equal(T({}), "REZULTAT: NIMIC publicat."); assert.equal(T(null), "REZULTAT: NIMIC publicat.");
});
await test("C3 probele de după publicare se sar DOAR când ștampila copiei e la zi și principalul are exact aceleași fișiere de ecran", async () => {
  const A = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "amprenta-ecran.mjs")).href);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proba-acoperite-")), copie = path.join(tmp, "copie"), rad = path.join(tmp, "principal"), sterse = [];
  const pune = (d, f, t) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), t); };
  try {
    for (const d of [copie, rad]) { pune(d, "public/index.html", "<html>"); pune(d, "public/app.css", "a{}"); pune(d, "public/lib/x.js", "var x"); for (const p of A.PROBE_ECRAN) pune(d, "scripts/" + p.fisier, "// " + p.fisier); }
    assert.equal(L.probeAcoperite(copie, rad), false, "fără ștampilă: probele rulează pe principal, ca până acum");
    for (const p of A.PROBE_ECRAN) { A.scrieStampila(copie, p.fisier); sterse.push(A.caleStampila(copie, p.fisier)); }
    assert.equal(L.probeAcoperite(copie, rad), true, "ștampilele copiei la zi + aceleași fișiere în principal");
    pune(rad, "public/app.css", "a{color:red}"); assert.equal(L.probeAcoperite(copie, rad), false, "principalul are altă foaie (altă sesiune a urcat între timp)"); pune(rad, "public/app.css", "a{}");
    pune(copie, "public/lib/x.js", "var y"); assert.equal(L.probeAcoperite(copie, rad), false, "copia s-a schimbat după probă: ștampila ei e veche"); pune(copie, "public/lib/x.js", "var x");
    assert.equal(L.probeAcoperite(copie, rad), true);
    fs.rmSync(A.caleStampila(copie, A.PROBE_ECRAN[1].fisier), { force: true }); assert.equal(L.probeAcoperite(copie, rad), false, "una din probe nerulată");
    assert.equal(L.probeAcoperite(path.join(tmp, "lipsa"), rad), false, "dosar lipsă: fără excepție");
  } finally { for (const f of sterse) fs.rmSync(f, { force: true }); fs.rmSync(tmp, { recursive: true, force: true }); }
});
await test("C4 legăturile din unealtă: rezultatul se scrie pe orice drum; poarta se arată și oprește; Functions ale copiei înaintea lanțului; comanda `functions`; unealta merge și fără bibliotecă", () => {
  const c = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(c, /function livreaza\(nume\) \{\n  const s = \{ publicat: null, adus: false, avert: \[\], motiv: "" \}; let cod = 1;\n[^\n]*\n  try \{ cod = livreazaPasi\(nume, s\); \}\n  catch \(e\) \{[^\n]*\}\n  finally \{ scrie\(textRezultat\(s\)\); \}\n  return cod;\n\}/, "rândul REZULTAT apare și la o excepție");
  assert.match(c, /const p = git\(dest, "push", "origin", "HEAD:main"\), poarta = liniiPoarta\(p\.out \+ "\\n" \+ p\.err\);\n  for \(const l of poarta\) scrie\(l\);/);
  assert.match(c, /if \(poarta\.some\(\(l\) => \/a PICAT - push oprit\/\.test\(l\)\)\) \{[^\n]*s\.motiv = "o probă de ecran a picat la poarta de dinaintea împingerii"; return 1; \}/);
  assert.match(citeste("scripts", "inainte-de-push.mjs"), /a PICAT - push oprit\./, "textul pe care îl caută unealta e chiar cel scris de poartă");
  assert.match(c, /s\.publicat = git\(dest, "rev-parse", "--short", "HEAD"\)\.out \|\| "\(commitul nu s-a putut citi\)";/); assert.match(c, /\n  s\.adus = true;\n  scrie\(`Principalul adus la /);
  assert.equal((c.match(/s\.avert\.push\(/g) || []).length, 9, "avertismentele ajung în rezultat: poarta care a sărit probele (1), probele de ecran (2) + ștampila lor (1), Worker-ul principalului (2), colectorul rămas pe cod vechi (2), excepția de după publicare (1)");
  assert.match(c, /scrie\("Ai atins colectorul ⇒ repornește-l ca să ia codul nou\."\); s\.avert\.push\("colectorul n-a fost repornit de aici:/); assert.match(c, /if \(repornesteColectorul\(RAD\) === false\) s\.avert\.push\(/);
  /* Functions ale copiei: înaintea lanțului, doar dacă le-a atins și copia are deja un Worker construit */
  const i = c.indexOf('if (atinse.some((x) => x.startsWith("functions/")) && fs.existsSync(path.join(dest, "worker-local"))'), j = c.indexOf('if (!ruleaza(dest, "npm", ["test"]))');
  assert.ok(i > 0 && j > i, "reconstruirea vine înaintea lui npm test"); assert.match(c.slice(i, j), /if \(!construiesteWorkerulCopiei\(dest, nume\)\) \{[^\n]*return 1; \}/);
  assert.match(c, /"pages", "functions", "build", "functions", "--outdir", "worker-local", "--compatibility-date=2026-01-01"\]\)\) return false;/);
  assert.match(c, /\["porneste", "livreaza", "curata", "functions", "server"\]\.includes\(cmd\)/); assert.match(c, /cmd === "functions" \? functiiCopie\(nume\)/);
  assert.match(c, /if \(probeAcoperite\(dest, RAD\)\) scrie\([^\n]*\n    else \{\n      scrie\("Ai atins public\/ ⇒ proba de telefon/);
  assert.match(c, /let AE = null; try \{ AE = await import\("\.\/lib\/amprenta-ecran\.mjs"\); \} catch \{ AE = null; \}/); assert.equal(/^import [^\n]*amprenta-ecran/m.test(c), false, "fără import fix: proba uneltei o copiază singură");
  assert.equal(L.principal(["functions", "../x"]), 1, "nume greșit ⇒ refuz, și la comanda nouă");
});

/* ---------- E („FA IDEI”, 22.11): alerta OI în română, poarta spune de ce sare, serverul copiei ca o comandă ---------- */
await test("E1 alerta OI: în română, cu direcția (scria „OI expansion” și la −3%) și cu o zecimală; pragul de 3% rămâne, pe cifra citită înapoi", () => {
  const m = /\{const vOi=parseFloat\(deriv\.oiTrend\);[^\n]*?"warn"\)\}/.exec(APP); assert.ok(m, "blocul alertei OI");
  const c = vm.createContext({ TextRo: globalThis.TextRo, Number, Math, parseFloat }); vm.runInContext(rand("pctTextRo") + "\n" + rand("oiTrendRo"), c);
  const A = (deriv, pe = true) => { c.out = []; c.deriv = deriv; c.st = { alerts: { oi: pe } }; c.addAlert = (...a) => c.out.push(a); vm.runInContext(m[0], c); return JSON.parse(JSON.stringify(c.out)); };
  assert.deepEqual(A({ oiTrend: "+3.21%", oiDeltas: { h1: 3.2149 } }), [["oi", "OI în creștere", "OI +3,2% într-o oră", "warn"]]);
  assert.deepEqual(A({ oiTrend: "-4.07%", oiDeltas: { h1: -4.0651 } }), [["oi", "OI în scădere", "OI −4,1% într-o oră", "warn"]]);
  assert.deepEqual(A({ oiTrend: "+2.99%", oiDeltas: { h1: 2.99 } }), [], "sub prag: nimic"); assert.deepEqual(A({ oiTrend: "+3.00%", oiDeltas: { h1: 2.996 } }).length, 1, "pragul pe cifra citită înapoi, ca până acum");
  assert.deepEqual(A({ oiTrend: "N/A" }), []); assert.deepEqual(A({}), []); assert.deepEqual(A({ oiTrend: "+9.00%", oiDeltas: { h1: 9 } }, false), [], "alerta oprită din setări");
  assert.equal(/addAlert\("oi","OI expansion"|over recent samples/.test(APP), false, "textul vechi nu mai e în cod (rămâne doar pomenit în comentariu)");
});

await test("E2 poarta spune DE CE sare probele și ce e de făcut: serverul oprit, serverul care răspunde altceva decât 200 la adresa de sănătate, serverul cu alt cod; comanda e a copiei din care împingi", () => {
  assert.equal(P.comandaServer("C:\\Users\\Cimin\\crypto-lucru-idei377"), "node scripts/copie-de-lucru.mjs server idei377"); assert.equal(P.comandaServer("C:/Users/Cimin/crypto-lucru-tablou-2/"), "node scripts/copie-de-lucru.mjs server tablou-2");
  assert.equal(P.comandaServer("C:\\Users\\Cimin\\crypto"), "PORNESTE-CRYPTO-RADAR.bat"); assert.equal(P.comandaServer(""), "PORNESTE-CRYPTO-RADAR.bat");
  const coada = " ⇒ probele de ecran NU au rulat. Pornește serverul: node scripts/copie-de-lucru.mjs server idei377, apoi împinge din nou (sau rulează-le de mână: node scripts/proba-ecran-telefon.mjs, node scripts/proba-ecran-tablou.mjs).", rad = "C:\\Users\\Cimin\\crypto-lucru-idei377";
  assert.equal(P.textSarit("oprit", { rad }), "[pre-push] probele de ecran: sărite - serverul de pe 8788 nu răspunde" + coada);
  assert.equal(P.textSarit("stare", { stare: 404, rad }), "[pre-push] probele de ecran: sărite - serverul de pe 8788 răspunde HTTP 404 la http://127.0.0.1:8788/api/market?type=health" + coada, "cazul care a ținut poarta moartă o lună se vede acum");
  assert.equal(P.textSarit("alta-versiune", { servit: "v100.376", depozit: "v100.377", rad }), "[pre-push] probele de ecran: sărite - serverul de pe 8788 servește v100.376, iar depozitul din care împingi are v100.377 (probele ar măsura alt cod)" + coada);
  assert.match(P.textSarit("oprit", { rad: "C:\\Users\\Cimin\\crypto" }), /Pornește serverul: PORNESTE-CRYPTO-RADAR\.bat, apoi/);
  const s = citeste("scripts", "inainte-de-push.mjs");
  assert.match(s, /const h = await fetch\(ADRESA_SANATATE, \{ signal: AbortSignal\.timeout\(3000\) \}\); stare = h\.status;/);
  assert.match(s, /if \(!servit\) \{ console\.log\(textSarit\(stare !== null && stare !== 200 \? "stare" : "oprit", \{ stare, rad: RAD \}\)\); return 0; \}/);
  assert.match(s, /if \(!aceeasiVersiune\(servit, depozit\)\) \{ console\.log\(textSarit\("alta-versiune", \{ servit: versiunea\(servit\), depozit: versiunea\(depozit\), rad: RAD \}\)\); return 0; \}/);
  /* rândurile astea ajung în jurnalul livrării (încep cu marcajul porții) */
  for (const f of ["oprit", "stare", "alta-versiune"]) assert.deepEqual(L.liniiPoarta("x\n" + P.textSarit(f, { stare: 500, rad }) + "\ny").length, 1);
});

await test("E3 serverul copiei ca o comandă: procesele lui se recunosc după starea COPIEI din linia de comandă (nu orice wrangler), cel mult 12, numărate; `curata` îl oprește înainte de ștergere", () => {
  const dest = "C:\\Users\\Cimin\\crypto-lucru-idei377", E = L.eServerulCopiei;
  const linie = (d) => `"C:\\Program Files\\nodejs\\node.exe" C:\\Users\\Cimin\\AppData\\Local\\npm-cache\\_npx\\x\\node_modules\\wrangler\\bin\\wrangler.js dev --config radar-local.toml --no-bundle --port 8788 --persist-to "${d}\\.wrangler\\state" --compatibility-date=2026-01-01`;
  assert.equal(E(linie(dest), dest), true); assert.equal(E(linie("c:/users/cimin/CRYPTO-LUCRU-IDEI377").replace(/\\\.wrangler\\state/, "/.wrangler/state"), dest), true, "litere mari / bare înclinate");
  assert.equal(E(linie("C:\\Users\\Cimin\\crypto-lucru-idei3771"), dest), false, "altă copie cu nume care începe la fel"); assert.equal(E(linie("C:\\Users\\Cimin\\crypto"), dest), false, "serverul principalului nu e al copiei");
  assert.equal(E(linie("C:\\Users\\Cimin\\crypto-lucru-alta"), dest), false); assert.equal(E(`notepad "${dest}\\.wrangler\\state\\x.txt"`, dest), false, "fără wrangler / workerd în linie");
  assert.equal(E("node wrangler.js dev --port 8788", dest), false, "un wrangler fără starea copiei NU se atinge");
  assert.equal(E(`python kvdiag.py --persist-to "${dest}\\.wrangler\\state\\v3\\kv\\x.sqlite"`, dest), false, "„.wrangler” din calea stării nu ține loc de wrangler");
  assert.equal(E(`node wrangler.js dev "${dest}\\.wrangler\\state"`, dest), false, "fără --persist-to: nu e pornit de comanda asta"); assert.equal(E(linie(dest), ""), false); assert.equal(E("", dest), false); assert.equal(E(null, dest), false);
  assert.equal(L.comandaServerCopie(dest, "wrangler@4.137.0"), `npx wrangler@4.137.0 dev --config radar-local.toml --env-file .dev.vars --no-bundle --port 8788 --ip 127.0.0.1 --persist-to "${dest}\\.wrangler\\state" --compatibility-date=2026-01-01`);
  assert.equal(E(L.comandaServerCopie(dest, "wrangler@4.137.0"), dest), true, "comanda de pornire poartă chiar semnul după care se oprește");
  const c = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(c, /if \(p\.length > 12\) \{ scrie\(`⚠ \$\{p\.length\} procese par ale serverului copiei \$\{nume\} — prea multe, nu opresc nimic/);
  assert.match(c, /Get-CimInstance Win32_Process \| Where-Object \{ \$_\.ProcessId -ne \$PID \}/); assert.match(c, /return arboreServer\(toateProcesele\(\), dest, process\.pid\);/);
  const cu = c.slice(c.indexOf("function curata(")); assert.ok(cu.indexOf("opresteServerulCopiei(dest, nume) < 0") > 0 && cu.indexOf("opresteServerulCopiei(dest, nume) < 0") < cu.indexOf('git(RAD, "worktree", "remove"'), "oprit înainte de ștergerea copiei");
  assert.ok(cu.indexOf("opresteServerulCopiei(dest, nume) < 0") > cu.indexOf("merge-base"), "doar după ce s-a hotărât că se șterge (nu la un refuz)");
  assert.match(c, /\["porneste", "livreaza", "curata", "functions", "server"\]\.includes\(cmd\)/); assert.match(c, /cmd === "server" \? serverCopie\(nume, opt\)/);
  assert.match(c, /if \(opt === "--opreste"\) \{ const n = opresteServerulCopiei\(dest, nume\);/); assert.match(c, /Portul 8788 e deja ocupat de alt server/);
  assert.equal(L.principal(["server", "../x"]), 1, "nume greșit ⇒ refuz");
});

/* ---------- F (I-907, el 22.11: „idei care chiar să conteze”): plata boților lui, pe vârsta atinsă ---------- */
const RLc = (() => { const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", "risc-luna.js"), "utf8"), c); return c; })(), RL = RLc.RiscLuna, J = (x) => JSON.parse(JSON.stringify(x));
const B5 = [{ r: 0.02, inv: 100, ore: 0.1 }, { r: 0.04, inv: 100, ore: 2 }, { r: 0.06, inv: 100, ore: 30 }, { r: -0.10, inv: 200, ore: 5 }, { r: -0.30, inv: 200, ore: 50 }];
const aproape = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " față de " + b);

await test("F1 plata: câștigul mediu al boților pe plus, pierderea medie a celor pe minus (în % din suma fiecăruia), cât le trebuia pe plus ca media să fie zero, banii reali", () => {
  const p = J(RL.plata(B5)); assert.equal(p.n, 5); aproape(p.pePlus, 0.6); aproape(p.castig, 0.04); aproape(p.pierdere, 0.20); aproape(p.trebuie, 0.20 / 0.24, "trebuie = pierdere / (câștig + pierdere)"); aproape(p.net, 2 + 4 + 6 - 20 - 60);
  /* verificarea formulei: la rata „trebuie”, media e zero */
  aproape(p.trebuie * p.castig - (1 - p.trebuie) * p.pierdere, 0, "media la rata de echilibru");
  const z = J(RL.plata([{ r: 0, inv: 50, ore: 1 }, { r: 0.1, inv: 50, ore: 1 }])); assert.equal(z.n, 2); aproape(z.pePlus, 0.5, "zero nu e „pe plus”"); aproape(z.pierdere, 0);
  assert.equal(RL.plata([]), null); assert.equal(RL.plata(null), null); assert.equal(J(RL.plata([{ r: NaN, inv: 1 }, { r: 0.1, inv: 10 }])).n, 1, "un rezultat necitit nu intră");
  const doarPlus = J(RL.plata([{ r: 0.1, inv: 10 }])); assert.equal(doarPlus.pierdere, null); assert.equal(doarPlus.trebuie, null, "fără pierderi: nicio rată de echilibru inventată");
});

await test("F2 pe vârsta ATINSĂ (botul era încă pornit la vârsta aceea - se știa atunci), nu pe durata finală; pragurile fără boți rămân în tabel cu zero", () => {
  const p = J(RL.plataPeVarste(B5, [1, 4, 24, 100])); assert.equal(p.tot.n, 5);
  assert.deepEqual(p.varste.map((x) => [x.h, x.n]), [[1, 4], [4, 3], [24, 2], [100, 0]]);
  aproape(p.varste[1].castig, 0.06); aproape(p.varste[1].pierdere, 0.20); aproape(p.varste[1].net, 6 - 20 - 60); assert.equal(p.varste[3].trebuie, null);
  assert.equal(RL.plataPeVarste([], [1]), null);
});

const PL = { tot: { n: 1985, pePlus: 0.578, castig: 0.032, pierdere: 0.0696, trebuie: 0.685, net: -5938.5 }, varste: [
  { h: 0.25, n: 1251, pePlus: 0.622, castig: 0.0301, pierdere: 0.0866, trebuie: 0.742, net: -4427.6 }, { h: 1, n: 788, pePlus: 0.632, castig: 0.0308, pierdere: 0.1116, trebuie: 0.783, net: -4106.8 },
  { h: 4, n: 428, pePlus: 0.617, castig: 0.0311, pierdere: 0.1429, trebuie: 0.821, net: -3789.8 }, { h: 24, n: 85, pePlus: 0.529, castig: 0.0333, pierdere: 0.2681, trebuie: 0.89, net: -1893.1 },
  { h: 168, n: 15, pePlus: 0.267, castig: 0.049, pierdere: 0.351, trebuie: 0.878, net: -472.7 }] };
await test("F3 lângă botul pornit: rândul vârstei la care a ajuns (cel mai mare prag atins, cu cel puțin 20 de boți), în % din sumă și în banii botului de acum", () => {
  assert.equal(RL.textPlata(PL, 1.3, 83.52), "Din boții tăi care au ajuns la 1 h (788): cei pe plus au adus în medie +3,1% din sumă, cei pe minus au pierdut în medie −11,2%. Ca să iasă pe zero le trebuiau 78,3% pe plus; au fost 63,2%. La suma botului de acum (83,5 USDT): +2,6 față de −9,3 USDT.");
  assert.match(RL.textPlata(PL, 0.5, 100), /^Din boții tăi care au ajuns la 15 minute \(1251\): /); assert.match(RL.textPlata(PL, 30, 100), /^Din boții tăi care au ajuns la 24 h \(85\): /);
  assert.match(RL.textPlata(PL, 500, 100), /^Din boții tăi care au ajuns la 24 h \(85\): /, "la 168 h sunt doar 15 boți: prea puțini pentru o propoziție, rămâne rândul de 24 h");
  assert.match(RL.textPlata(PL, 0.1, 100), /^Din toți boții tăi închiși \(1985\): /, "sub primul prag: toți boții");
  assert.equal(/La suma botului/.test(RL.textPlata(PL, 1.3, null)), false, "fără suma botului: doar procentele"); assert.equal(/La suma botului/.test(RL.textPlata(PL, 1.3, 0)), false);
  assert.match(RL.textPlata({ tot: { n: 40, pePlus: 0.9, castig: 0.03, pierdere: 0.06, trebuie: 0.667, net: 5 }, varste: [] }, 2, 0), /au fost 90,0% \(destul\)\.$/);
  assert.equal(RL.textPlata({ tot: { n: 12, pePlus: 0.5, castig: 0.03, pierdere: 0.06, trebuie: 0.667, net: -1 }, varste: [] }, 2, 100), null, "sub 20 de boți în toată arhiva: nimic");
  assert.equal(RL.textPlata(null, 2, 100), null); assert.equal(RL.textPlata({ tot: { n: 50, pePlus: 1, castig: 0.03, pierdere: null, trebuie: null, net: 5 }, varste: [] }, 2, 100), "Din toți boții tăi închiși (50): toți au ieșit pe plus, în medie +3,0% din sumă.", "toți pe aceeași parte: se spune, fără „le trebuiau”");
  assert.equal(RL.PLATA_MIN, 20);
});

await test("F4 concluzia din „Riscul tău”: raportul câștig / pierdere, cât îți trebuie pe plus, cum crește pierderea medie cu vârsta și cât din pierdere fac boții ajunși la 4 h - descriere, cu sfat cinstit", () => {
  const rp = (plata) => ({ boti: { plata, desc: { durate: [], coada: null, bani: null }, comportament: [], ritm: { S: 200 } } }), c = J(RL.concluzii(rp(PL)).boti), x = c.find((q) => /^Pierderea medie e de /.test(q.titlu));
  assert.ok(x, "concluzia plății"); assert.equal(x.nivel, "atentie", "descriere: nu „rău” (nicio regulă de ieșire probată)"); assert.equal(x.titlu, "Pierderea medie e de 2,2 ori câștigul mediu"); assert.ok(x.titlu.length <= 60);
  assert.equal(x.text, "Un bot pe plus aduce în medie +3,2% din sumă, unul pe minus pierde −7,0%: ca să ieși pe zero îți trebuie 68,5% din boți pe plus, ai 57,8%. Câștigul mediu rămâne cam același oricât stă botul, iar pierderea medie crește: −11,2% la cei ajunși la 1 h, −14,3% la cei ajunși la 4 h, −26,8% la cei ajunși la 24 h. Boții ajunși la 4 h (22% din boți) au făcut 64% din toată pierderea.");
  assert.match(x.faCe, /^Aș hotărî la pornire pierderea la care închid botul și aș ține-o\. O regulă anume de ieșire n-am probat-o încă pe boții tăi/);
  /* fără afirmația „câștigul rămâne același” când nu e adevărată; fără concluzie când are destui pe plus sau prea puțini boți */
  const altfel = JSON.parse(JSON.stringify(PL)); altfel.varste[3].castig = 0.09; assert.match(J(RL.concluzii(rp(altfel)).boti).find((q) => /^Pierderea medie/.test(q.titlu)).text, /ai 57,8%\. Pierderea medie crește cu vârsta botului: −11,2%/);
  const bine = JSON.parse(JSON.stringify(PL)); bine.tot.pePlus = 0.75; assert.equal(J(RL.concluzii(rp(bine)).boti).some((q) => /^Pierderea medie/.test(q.titlu)), false);
  const putini = JSON.parse(JSON.stringify(PL)); putini.tot.n = 30; assert.equal(J(RL.concluzii(rp(putini)).boti).some((q) => /^Pierderea medie/.test(q.titlu)), false);
  assert.equal(J(RL.concluzii(rp(null)).boti).some((q) => /^Pierderea medie/.test(q.titlu)), false, "raport vechi, fără plată: nimic");
});

await test("F5 raportul de risc al colectorului duce plata (aceiași boți ca restul raportului: futures_grid închiși din 2026, rezultatul NET pe suma pusă)", () => {
  const T0 = Date.UTC(2026, 5, 1), ORA = 3600000, arh = [];
  for (let i = 0; i < 60; i++) { const plus = i % 5 !== 0, ore = [0.1, 2, 6, 30][i % 4], inv = 100 + (i % 3) * 50, real = plus ? 0.04 * inv : -0.15 * inv;
    arh.push({ buOrderType: "futures_grid", base: "X" + (i % 7) + ".PERP", createTime: T0 + i * 7 * ORA, closeTime: T0 + i * 7 * ORA + ore * ORA, buOrderData: { quoteInvestment: inv, totalRealizedProfit: real + 0.01 * inv, totalFee: -0.01 * inv, totalFundingFee: 0, leverage: 3, trend: "long", gridProfit: 1 } }); }
  arh.push({ buOrderType: "spot_grid", base: "Y", createTime: T0, closeTime: T0 + ORA, buOrderData: { quoteInvestment: 100, totalRealizedProfit: -90 } });   /* alt fel de bot: nu intră */
  const rp = J(RL.raport({ boti: arh, umpleri: [], acum: T0 + 90 * 24 * ORA, reps: 30, n: 300 }));
  assert.ok(rp.boti && rp.boti.plata, "raportul are plata"); assert.equal(rp.boti.plata.tot.n, 60); assert.equal(rp.boti.plata.tot.n, rp.boti.n, "aceiași boți ca restul raportului");
  aproape(rp.boti.plata.tot.pePlus, 48 / 60); aproape(rp.boti.plata.tot.castig, 0.04, "NETUL: realizatul plus comisionul"); aproape(rp.boti.plata.tot.pierdere, 0.15);
  assert.deepEqual(rp.boti.plata.varste.map((x) => x.h), [0.25, 1, 4, 12, 24, 48, 72, 168]); assert.deepEqual(rp.boti.plata.varste.map((x) => x.n), [45, 45, 30, 15, 15, 0, 0, 0]);
  assert.ok(JSON.stringify(rp).length < 100000, "raportul rămâne mic (KV)");
  /* v100.380: „de la v101.210 încolo” (colectorul merge mai departe); nota lui v101.210 rămâne în fișier */ assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(citeste("scripts", "colector.mjs")) || [])[1] >= 210, "colectorul de la v101.210 încolo"); assert.match(citeste("scripts", "colector.mjs"), /v101\.210 \(22\.11, Radar v100\.377\): raportul de risc duce și plata boților pe vârsta atinsă/);
});

await test("F6 pe pagină: tabelul plății în „Riscul tău” (boți, nu acțiuni), cu rândurile de sub 20 de boți estompate și cu nota „descriere, nu regulă probată”; lângă botul pornit, în Tablou", () => {
  const E = citeste("public", "lib", "risc-ecran.js"), cE = vm.createContext({ console, Math, JSON, Number, String, Array, Object, isFinite, TextRo: globalThis.TextRo, RiscLuna: RL }); vm.runInContext(E.replace(/^var rlStare[^\n]*$/m, "var rlStare = {};"), cE);
  const h = vm.runInContext("rlPlata", cE)(PL, "USDT");
  assert.match(h, /^<details class="rlPli" open><summary><h4>Plata: cât aduce un bot pe plus, cât pierde unul pe minus<\/h4><\/summary>/);
  assert.ok(h.includes('<tr><td>toți</td><td class="rlNr">1985</td><td class="rlNr">57,8%</td><td class="rlNr good">+3,2%</td><td class="rlNr bad">−7,0%</td><td class="rlNr bad">68,5%</td><td class="rlNr bad">−5.938,5 USDT</td></tr>'), h.slice(0, 900));   /* rândul „toți” nu-și mai spune „100%” din el însuși */
  assert.ok(h.includes('<tr><td>ajunși la 4 h</td><td class="rlNr">428</td><td class="rlNr">61,7%</td><td class="rlNr good">+3,1%</td><td class="rlNr bad">−14,3%</td><td class="rlNr bad">82,1%</td><td class="rlNr bad">−3.789,8 USDT · 64%</td></tr>'));
  assert.ok(h.includes('<tr class="rlPutini"><td>ajunși la 168 h</td><td class="rlNr">15</td>'), "sub 20 de boți: estompat"); assert.ok(h.includes("<td>ajunși la 15 min</td>"));
  assert.match(h, /Descriere din arhiva ta, nu o regulă probată: nu spune ce ar fi ieșit dacă închideai mai devreme\./);
  assert.equal(vm.runInContext("rlPlata", cE)(null, "USDT"), "", "raport vechi, fără plată: nimic"); assert.match(E, /\+ \(boti \? rlPlata\(P\.plata, unit\) : ""\)/);
  assert.match(citeste("public", "app.css"), /#montecarlo \.rlTab tr\.rlPutini td\{color:var\(--muted\)\}/);
  assert.match(APP, /var oreB=\(Date\.now\(\)-Number\(b\.pornitLa\)\)\/3600000,t=RiscLuna\.textBot\(rp\.boti\.supravietuire,oreB\);/);
  assert.match(APP, /if\(rp\.boti\.plata&&RiscLuna\.textPlata\)\{var tPl=RiscLuna\.textPlata\(rp\.boti\.plata,oreB,botiNr\(b\.investit\)\);if\(tPl\)r\.push\(tPl\)\}/);
});

/* ---------- G (el 22.11: „OK FA IDEI”, ideea 1): PROBA PIERDERII - „închid la −5% din sumă”, pre-înregistrată ---------- */
const PMg = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "proba-margine.mjs")).href);
const T0g = Date.UTC(2026, 10, 23, 10, 0, 0), MINg = 60000;
const botG = (o) => ({ strategyId: o.id || "b1", buOrderType: "futures_grid", base: "X.PERP", createTime: T0g, closeTime: T0g + (o.durMin || 300) * MINg,
  buOrderData: { quoteInvestment: 100, totalRealizedProfit: o.final !== undefined ? o.final : -12, totalFee: 0, totalFundingFee: 0, leverage: o.lev || 3, trend: o.dir || "long", bottom: 50, top: 60, lossStop: o.stop ? 49 : 0 } });
const drumG = (totaluri, pasMin = 1, t0 = T0g) => totaluri.map((v, i) => ({ t: t0 + i * pasMin * MINg, pretPerp: 55, profitTotal: v }));

await test("G1 episodul: prima oară când totalul e la −5% din sumă sau sub; se ia totalul din punctul acela (nu −5% fix) minus comisionul de închidere; d sub zero = închiderea era mai bună", () => {
  const e = PMg.episodPierdere(botG({ final: -12 }), drumG([0, -1, -3, -4.9, -6.2, -8, -12]));
  assert.equal(e.t0, T0g + 4 * MINg, "punctul cu −6,2 (primul sub −5)"); assert.equal(e.laPrag, -6.2); assert.equal(e.inv, 100);
  aproape(e.comision, 100 * 3 * 0.0005); aproape(e.d, -12 - (-6.2 - 0.15)); aproape(e.dPct, e.d, "% din suma de 100"); assert.ok(e.d < 0, "a ieșit −12: închis la prag ieșea −6,35");
  const intors = PMg.episodPierdere(botG({ final: 3 }), drumG([0, -2, -5.5, -3, 1, 3])); aproape(intors.d, 3 - (-5.5 - 0.15)); assert.ok(intors.d > 0, "botul întors pe plus: lăsatul a fost mai bun");
  assert.equal(PMg.episodPierdere(botG({ final: -5 }), drumG([0, -1, -5])).laPrag, -5, "exact −5% e la prag");
  assert.equal(e.zi, "2026-11-23"); assert.equal(e.nou, true); assert.equal(PMg.episodPierdere(botG({}), drumG([0, -6], 1, Date.UTC(2026, 10, 21, 10))) === null, false);
  assert.equal(PMg.PRAG_PIERDERE, 0.05); assert.equal(PMg.COADA_PIERDERE, 0.0025, "99,5%: hotărât pe simularea pentru două reguli"); assert.equal(PMg.START_PIERDERE, Date.UTC(2026, 10, 22));
  /* pragul e cel de „pierdere mare” al casei, nu unul ales acum */
  assert.match(fs.readFileSync(path.join(RAD, "public", "lib", "risc-luna.js"), "utf8"), /MARE = -0\.05/);
});

await test("G2 ce NU intră: fără drum, drumul început târziu, gol chiar înaintea pragului, pornit sub prag, niciodată la prag; suma e cea din clipa punctului", () => {
  const F = (x, d) => PMg.episodPierdere(x, d).fara;
  assert.equal(F(botG({}), []), "fara-drum"); assert.equal(F(botG({}), drumG([0, -6], 1, T0g + 20 * MINg)), "drum-taiat", "drumul începe la 20 de minute după pornire");
  assert.equal(F(botG({}), drumG([-7, -8])), "pornit-sub"); assert.equal(F(botG({ final: 2 }), drumG([0, -1, -4.9, 2])), "peste-prag");
  assert.equal(F(botG({}), [{ t: T0g, pretPerp: 55, profitTotal: 0 }, { t: T0g + 9 * MINg, pretPerp: 55, profitTotal: -7 }]), "gol", "9 minute fără puncte chiar înaintea pragului");
  assert.equal(PMg.episodPierdere({ buOrderType: "spot_grid" }, drumG([0, -9])), null, "alt fel de bot");
  /* marja adăugată pe drum: pragul se socotește pe suma din clipa punctului */
  const cuMarja = [{ t: T0g, pretPerp: 55, profitTotal: 0, investit: 100 }, { t: T0g + MINg, pretPerp: 55, profitTotal: -6, investit: 200 }, { t: T0g + 2 * MINg, pretPerp: 55, profitTotal: -11, investit: 200 }];
  const e = PMg.episodPierdere(botG({ final: -11 }), cuMarja); assert.equal(e.laPrag, -11, "la suma de 200, pragul e −10"); assert.equal(e.inv, 200);
  /* neutru intră (pragul nu ține de direcție) */
  assert.ok(PMg.episodPierdere(botG({ dir: "neutral" }), drumG([0, -6])).t0 > 0);
});

await test("G3 „ce a urmat” și bilanțul: aceleași praguri ca proba marginii (60 de episoade pe 20 de zile), dar cu intervalul de 99%; sub prag niciun verdict", () => {
  const lung = [0, -6]; for (let i = 0; i < 70; i++) lung.push(i < 30 ? -7 : -2);
  const e = PMg.episodPierdere(botG({ final: -2, durMin: 71 }), drumG(lung)); assert.equal(e.dupa[1].inGrid, true, "după o oră era înapoi peste prag"); aproape(e.dupa[1].total, -2 - -6); assert.equal(e.dupa[4], null, "botul nu mai trăia la 4 h");
  const E = (n, zile, f) => { const out = []; for (let i = 0; i < n; i++) { const z = i % zile, v = f(i, z); out.push({ id: "e" + i, t0: PMg.START_PIERDERE + z * 86400000 + i, zi: new Date(PMg.START_PIERDERE + z * 86400000).toISOString().slice(0, 10), d: v, dPct: v, nou: true, stop: false, dupa: {} }); } return out; };
  assert.equal(PMg.bilant(E(59, 25, () => -8), { coada: PMg.COADA_PIERDERE }).verdict, null, "59 de episoade: sub prag"); assert.equal(PMg.bilant(E(80, 19, () => -8), { coada: PMg.COADA_PIERDERE }).verdict, null, "19 zile: sub prag");
  assert.equal(PMg.bilant(E(120, 30, (i) => -8 + (i % 5)), { coada: PMg.COADA_PIERDERE }).verdict, "inchiderea"); assert.equal(PMg.bilant(E(120, 30, (i) => 6 + (i % 5)), { coada: PMg.COADA_PIERDERE }).verdict, "lasatul");
  assert.equal(PMg.bilant(E(120, 30, (i, z) => (z % 2 ? 9 : -9) + (i % 3)), { coada: PMg.COADA_PIERDERE }).verdict, "n-am aflat");
  /* intervalul de 99% e mai lat decât cel de 95% pe aceleași date; fără `coada`, proba marginii rămâne cu 95% */
  const date = E(120, 30, (i, z) => ((z * 7 + i * 3) % 11) - 5), a = PMg.bilant(date, { coada: PMg.COADA_PIERDERE }).ic, b = PMg.bilant(date).ic, c95 = PMg.interval(date), c99 = PMg.interval(date, undefined, PMg.COADA_PIERDERE);
  assert.ok(a[1] - a[0] > b[1] - b[0], "99%: " + (a[1] - a[0]) + " față de 95%: " + (b[1] - b[0])); assert.deepEqual(b, c95, "proba marginii: neschimbată"); assert.deepEqual(a, c99);
});

await test("G4 tura: citește doar boții închiși de la pre-înregistrare încoace, o citire picată nu e „fără drum”, verdictul se îngheață o singură dată, bilanțul pleacă pe ruta lui", async () => {
  const { turaProbaPierdere, PE_TURA, VECHI_MS } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-proba-pierdere.mjs")).href); assert.equal(PE_TURA, 60); assert.equal(VECHI_MS, 2 * 86400000);
  const vechi = botG({ id: "v1" }); vechi.createTime = Date.UTC(2026, 10, 10); vechi.closeTime = Date.UTC(2026, 10, 11);
  const boti = [vechi, botG({ id: "a", final: -12 }), botG({ id: "b", final: 2 }), botG({ id: "c", final: -9 }), botG({ id: "d", final: -9 })];
  const drumuri = { a: drumG([0, -3, -6.2, -12]), b: drumG([0, -1, 2]), c: null, d: "picat" }, cerute = [], trimise = [], st = {};
  const d = { acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, jurnal: () => {}, trimite: async (cale, corp) => { trimise.push([cale, corp]); },
    cereDrum: async (id) => { cerute.push(id); if (drumuri[id] === "picat") throw new Error("rețea"); if (drumuri[id] === null) return { citit: false, brut: [] }; return { citit: true, brut: drumuri[id] }; } };
  const r = await turaProbaPierdere(d, st);
  assert.equal(cerute.includes("v1"), false, "botul închis cu mult înainte de pre-înregistrare nu se citește"); assert.equal(st.facute.v1, "vechi");
  assert.deepEqual({ a: st.facute.a, b: st.facute.b, c: st.facute.c, d: st.facute.d }, { a: "episod", b: "peste-prag", c: undefined, d: undefined }, "citirea picată și KV-ul necitit rămân de reluat");
  assert.deepEqual(r, { judecati: 2, episoadeNoi: 1, ramasi: 2 }); assert.equal(st.episoade.length, 1); assert.equal(st.episoade[0].id, "a");
  assert.equal(trimise.length, 1); assert.equal(trimise[0][0], "/api/istoric-bot?action=probaPierdere"); const c = trimise[0][1];
  assert.equal(c.forma, 1); assert.equal(c.n, 1); assert.equal(c.prag, 0.05); assert.equal(c.coada, 0.0025); assert.equal(c.verdict, null); assert.equal(c.inghetat, null);
  assert.deepEqual(c.boti, { total: 5, judecati: 2, necititi: 0, ramasi: 2, episoade: 1, pestePrag: 1, faraDrum: 0, drumTaiat: 0, gol: 0, pornitSub: 0, vechi: 1 });
  /* a doua tură: reia doar ce a rămas; fără arhivă nu trimite nimic */
  drumuri.c = drumG([0, -7]); drumuri.d = []; cerute.length = 0; await turaProbaPierdere(d, st); assert.deepEqual(cerute.sort(), ["c", "d"]); assert.equal(st.facute.d, "fara-drum");
  const n0 = trimise.length; assert.deepEqual(await turaProbaPierdere(Object.assign({}, d, { botiInchisi: async () => [] }), st), { judecati: 0, episoadeNoi: 0, ramasi: 0, faraArhiva: true }); assert.equal(trimise.length, n0);
  /* verdictul înghețat nu se mai schimbă */
  const st2 = { facute: {}, episoade: [], inghetat: { la: 5, n: 70, zile: 22, medie: -4, suma: -300, ic: [-6, -2], verdict: "inchiderea", seContrazic: false } }, tr2 = [];
  await turaProbaPierdere(Object.assign({}, d, { botiInchisi: async () => [botG({ id: "z", final: 5 })], cereDrum: async () => ({ citit: true, brut: drumG([0, -6, 5]) }), trimite: async (cale, corp) => { tr2.push(corp); } }), st2);
  assert.equal(tr2[0].verdict, "inchiderea"); assert.equal(st2.inghetat.n, 70, "episoadele noi se adună, verdictul rămâne");
  /* verdictul înghețat nu se reface nici când datele noi ar spune altceva: 120 de episoade limpede „lăsatul”, peste un verdict înghețat „închiderea” */
  const multe = (f) => { const out = []; for (let i = 0; i < 120; i++) { const z = i % 30; out.push({ id: "m" + i, t0: PMg.START_PIERDERE + z * 86400000 + i, zi: new Date(PMg.START_PIERDERE + z * 86400000).toISOString().slice(0, 10), d: f(i), dPct: f(i), nou: true, stop: false, dupa: {} }); } return out; };
  const st3 = { facute: {}, episoade: multe((i) => 6 + (i % 5)), inghetat: { la: 5, n: 70, zile: 22, medie: -4, suma: -300, ic: [-6, -2], verdict: "inchiderea", seContrazic: false } }, tr3 = [];
  await turaProbaPierdere(Object.assign({}, d, { botiInchisi: async () => [botG({ id: "y", final: 2 })], cereDrum: async () => ({ citit: true, brut: drumG([0, -1, 2]) }), trimite: async (cale, corp) => { tr3.push(corp); } }), st3);
  assert.equal(st3.inghetat.verdict, "inchiderea", "o singură privire: verdictul înghețat rămâne"); assert.equal(st3.inghetat.la, 5); assert.equal(tr3[0].verdict, "inchiderea");
  /* cu un bot încă necitit, verdictul NU se îngheață (ar fi o privire înainte de a avea toate datele); după ce e citit, se îngheață */
  const st4 = { facute: {}, episoade: multe((i) => -8 + (i % 5)) }, tr4 = []; let pica = true;
  const d4 = Object.assign({}, d, { botiInchisi: async () => [botG({ id: "u", final: 2 }), botG({ id: "w", final: 2 })], trimite: async (cale, corp) => { tr4.push(corp); },
    cereDrum: async (id) => { if (id === "w" && pica) throw new Error("rețea"); return { citit: true, brut: drumG([0, -1, 2]) }; } });
  await turaProbaPierdere(d4, st4); assert.equal(st4.inghetat, undefined, "un bot necitit: fără verdict"); assert.equal(tr4[0].verdict, null); assert.equal(tr4[0].boti.ramasi, 1);
  pica = false; await turaProbaPierdere(d4, st4); assert.equal(st4.inghetat.verdict, "inchiderea"); assert.equal(tr4[tr4.length - 1].verdict, "inchiderea");
});

await test("G5 serverul: bilanțul probei pierderii se validează la scriere și se citește pe ruta lui; proba marginii rămâne pe cheia ei, neatinsă", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "g");
  const Hd = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  const post = (a, corp) => mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: Hd, body: JSON.stringify(corp) }), env });
  const get = async (a) => (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { headers: Hd }), env })).json();
  const bil = Object.assign(PMg.bilant([], { coada: 0.005 }), { la: Date.now() - 1000, prag: 0.05, coada: 0.005, verdict: null, inghetat: null, boti: { total: 9, judecati: 4, ramasi: 0, episoade: 1, pestePrag: 3, faraDrum: 0, drumTaiat: 0, gol: 0, pornitSub: 0, vechi: 5, altceva: 7 } });
  assert.equal((await post("probaPierdere", bil)).status, 200); const j = (await get("probaPierdere")).probaPierdere;
  assert.equal(j.forma, 1); assert.equal(j.prag, 0.05); assert.equal(j.coada, 0.005); assert.equal(j.minEpisoade, 60); assert.equal(j.minZile, 20); assert.equal(j.verdict, null);
  assert.deepEqual(j.boti, { total: 9, judecati: 4, necititi: 0, ramasi: 0, episoade: 1, pestePrag: 3, faraDrum: 0, drumTaiat: 0, gol: 0, pornitSub: 0, vechi: 5 }, "doar câmpurile cunoscute");
  assert.equal((await get("probaMargine")).probaMargine, null, "proba marginii are cheia ei"); assert.equal(kv.has("proba:pierdere"), true); assert.equal(kv.has("proba:margine"), false);
  assert.equal((await post("probaPierdere", Object.assign({}, bil, { verdict: "sigur da" }))).status, 400); assert.equal((await post("probaPierdere", Object.assign({}, bil, { n: -1 }))).status, 400);
  /* proba marginii: aceeași scriere ca până acum, fără câmpurile pierderii */
  assert.equal((await post("probaMargine", Object.assign({}, bil, { boti: { total: 3, judecati: 3, ramasi: 0, episoade: 0, inGrid: 3 } }))).status, 200); const m = (await get("probaMargine")).probaMargine;
  assert.equal("prag" in m, false); assert.equal(m.boti.inGrid, 3); assert.equal("pestePrag" in m.boti, false);
});

await test("G6 pagina Probe și colectorul: rândul probei („✂️ Închid la −5% din sumă sau las?”) înaintea celui al marginii, sub prag doar numărătoarea; tura rulează o dată pe oră; regulile sunt scrise", () => {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, Intl, sugStare: { d: {} }, sugCate: (n, s, p) => globalThis.TextRo.cate(n, s, p), sugEsc: (s) => String(s), sugP1: (v) => String(v), sugPc: (v) => String(v), sugZec: (v) => String(v), sugCadZi: (z) => String(z), Caiet: undefined });
  vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", "probe-ecran.js"), "utf8"), c);
  const R0 = c.prProbe({}, Date.UTC(2026, 10, 23)), chei = R0.map((q) => q.k); assert.equal(chei[chei.length - 1], "margine", "proba marginii rămâne la capăt (proba v100.374 o ia de acolo)"); assert.equal(chei[chei.length - 2], "timp"); assert.equal(chei[chei.length - 3], "pierdere");   /* a doua regulă pe bani stă între ele */
  const gol = R0[R0.length - 3]; assert.match(gol.nume, /^✂️ Închid la −5% din sumă sau las\? · boții tăi, din clipa în care totalul ajunge acolo$/); assert.match(gol.jud, /aștept colectorul/); assert.match(gol.sta, /câștigul mediu rămâne ~3% din sumă/);
  const subPrag = c.prProbe({ probaPierdere: { forma: 1, la: Date.UTC(2026, 10, 23) - 1000, n: 12, zile: 5, medie: -4.2, suma: -90, ic: null, verdict: null, inghetat: null, minEpisoade: 60, minZile: 20, boti: { total: 40, judecati: 30, ramasi: 3, episoade: 12, pestePrag: 16, faraDrum: 1, drumTaiat: 1, gol: 0, pornitSub: 0, vechi: 7 } } }, Date.UTC(2026, 10, 23)).find((q) => q.k === "pierdere");
  assert.match(subPrag.jud, /^12 episoade în 5 zile · citiți 30 de boți închiși: 16 n-au ajuns la prag, 1 fără drum, 1 cu drumul tăiat sau cu goluri/); assert.match(subPrag.sta, /^doar numărătoarea până la prag/); assert.equal(/4,2|−90/.test(subPrag.sta + subPrag.jud), false, "media nu se arată pe parcurs");
  const ver = c.prProbe({ probaPierdere: { forma: 1, la: Date.UTC(2026, 10, 23) - 1000, n: 75, zile: 24, medie: -4.2, suma: -310, ic: [-7, -1.5], verdict: "inchiderea", inghetat: { la: Date.UTC(2026, 10, 22, 12), n: 70, zile: 22, medie: -4, suma: -300, ic: [-6.5, -1.2], verdict: "inchiderea" }, minEpisoade: 60, minZile: 20, boti: null } }, Date.UTC(2026, 10, 23)).find((q) => q.k === "pierdere");
  assert.match(ver.sta, /^VERDICT \(înghețat la [^)]*, pe 70 de episoade în 22 de zile\): închiderea la −5% ar fi fost mai bună · lăsat − închis la prag: −4,0% din suma pusă, în medie pe bot \(interval 99,5% pe zile: −6,5% … −1,2%\)/); assert.match(ver.sta, /de atunci s-au mai adunat 5 episoade \(verdictul nu se schimbă\)$/);
  assert.match(citeste("public", "lib", "probe-ecran.js"), /pas\("probaPierdere", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=probaPierdere"\)\.then\(function \(r\) \{ return r && r\.probaPierdere \|\| null; \}\); \}\),/, "pagina aduce bilanțul probei");
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /if \(val\.medii\) turaProbaPierdereColector\(\)\.catch\(/); assert.match(col, /Date\.now\(\) - \(pierdereStare\.la \|\| 0\) < 3600000/, "frâna de o oră"); assert.match(col, /stareDeDisc\("proba-pierdere-stare\.json"\)/);
  const doc = citeste("docs", "cercetare", "2026-11-22-v100377-proba-pierderii.md"); for (const k of ["Ipoteza", "Regula pusă la probă (una singură)", "Unitatea și măsura", "Pragurile și verdictul", "Ce nu intră", "Ce nu poate spune", "Simularea sub H0 (înainte de date)", "Ce NU se face"]) assert.ok(doc.includes("## " + k), "pre-înregistrarea: " + k);
  assert.match(doc, /Prima variantă, schimbată înainte de date \(22\.11\.2026\)/); assert.match(citeste("scripts", "sim-h0-v100377-pierdere.mjs"), /REZULTATELE \(22\.11\.2026, 300 de seturi pe rând/);
});

/* ---------- H (el 22.11: „OK FA IDEI”, ideea 3): alerta „botul a trecut de 4 ore și e pe minus” ---------- */
const MCh = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
await test("H1 alerta de 4 ore pe minus: titlul cu vârsta și banii, faptul într-o frază (plata boților lui ajunși la vârsta asta), sfatul la persoana I; fără raport, doar faptul", () => {
  const fapt = RL.textPlataScurt(PL, 4.2); assert.equal(fapt, "Din boții tăi ajunși la 4 h (428), cei pe plus au adus în medie +3,1% din sumă, cei pe minus au pierdut −14,3%.");
  assert.ok(fapt.length <= 160 && (fapt.match(/\. /g) || []).length === 0, "un rând, o frază: " + fapt.length);
  assert.equal(RL.textPlataScurt(PL, 0.5), "Din boții tăi ajunși la 15 minute (1251), cei pe plus au adus în medie +3,0% din sumă, cei pe minus au pierdut −8,7%."); assert.equal(RL.textPlataScurt(null, 5), null);
  const m = MCh.minus4h("PUMPFUN", 4.2, -3.21, fapt, true);
  /* auditul 22.11: „pierderea crește cu vârsta, câștigul nu” pleacă DOAR când raportul de acum o arată */
  assert.equal(MCh.minus4h("PUMPFUN", 4.2, -3.21, fapt, false).mesaj.split("\n")[1], "👉 Aș hotărî acum pierderea la care îl închid."); assert.equal(MCh.minus4h("PUMPFUN", 4.2, -3.21, fapt).mesaj.split("\n")[1], "👉 Aș hotărî acum pierderea la care îl închid.");
  assert.equal(m.titlu, "PUMPFUN: 4 h și e pe minus (−3,2 USDT)"); assert.ok(m.titlu.length <= 60); assert.equal(m.nivel, "atentie"); assert.equal(m.cheie, "minus-4h");
  const r = m.mesaj.split("\n"); assert.equal(r.length, 2); assert.equal(r[0], fapt); assert.equal(r[1], "👉 Aș hotărî acum pierderea la care îl închid: la tine pierderea crește cu vârsta botului, câștigul nu."); assert.ok(r[1].length <= 110, "sfatul: " + r[1].length);
  const f = MCh.minus4h("CRV", 5.4, -1.234, null).mesaj.split("\n");
  assert.equal(f[0], "Botul a trecut de 4 ore și e pe −1,2 USDT; încă n-am raportul de risc cu plata boților tăi."); assert.equal(f[1], "👉 Aș hotărî acum pierderea la care îl închid.", "fără raport, sfatul nu pomenește cifre pe care nu le are");
});
await test("H2 colectorul: o dată pe bot, între 4 și 24 de ore, de la 0,5% din investiție pe minus, marcat după trimiterea reușită; după blocul de 24 h; cheia are nume în registrul alertelor", () => {
  const col = citeste("scripts", "colector.mjs"), i24 = col.indexOf("if (await trimiteAlerta(m, b.id, m.cheie)) st._minus24 = true;"), i4 = col.indexOf("if (!st._minus4 && Number(b.pornitLa) > 0");
  assert.ok(i24 > 0 && i4 > i24, "blocul de 4 h vine după cel de 24 h (proba v100.115 taie sursa de la primul `_minus24`)");
  const b4 = col.slice(i4, col.indexOf("st._minus4 = true;", i4) + 20);
  assert.match(b4, /^if \(!st\._minus4 && Number\(b\.pornitLa\) > 0 && acum - Number\(b\.pornitLa\) >= 4 \* 3600000 && acum - Number\(b\.pornitLa\) < 24 \* 3600000 && Number\(b\.profitTotal\) < -0\.005 \* \(Number\(b\.investit\) > 0 \? Number\(b\.investit\) : 0\) && Number\(b\.investit\) > 0 \/\*[^*]*\*\/\) \{/, "fără investiția citită nu pleacă");
  assert.match(b4, /const t4 = rp4 && rp4\.boti && rp4\.boti\.plata && RiscLuna\.textPlataScurt \? RiscLuna\.textPlataScurt\(rp4\.boti\.plata, ore4\) : null;/);
  assert.match(b4, /const m4 = MesajeColector\.minus4h\([^;]*, ore4, Number\(b\.profitTotal\), t4, !!\(pc4 && pc4\.creste && pc4\.peLoc\)\);\s*if \(await trimiteAlerta\(m4, b\.id, m4\.cheie\)\) st\._minus4 = true;/);
  assert.equal(/_minus24/.test(b4), false);
  assert.match(citeste("public", "lib", "tablou-extra.js"), /"minus-4h": "pe minus 4 h", "minus-24h": "pe minus 24 h"/);
  const g = citeste("scripts", "lib", "garda-alerte.mjs"); assert.match(g, /co\("4 h pe minus, cu plata", "minus4h", MC\.minus4h\(/); assert.match(g, /co\("4 h pe minus, fără raport", "minus4h", MC\.minus4h\("CRV", 5, -1\.2, null\)\);/);
});

/* ---------- I (el 22.11: „OK FA IDEI”, ideea 2 = I-906): costul dus-întors ÎNAINTE de pornire, pe fereastra de grid ---------- */
const LIBF = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const functie = (src, n) => { const i = src.search(new RegExp("function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
await test("I1 costul dus-întors al unei ferestre: taxa de intrare pe ce se cumpără la pornire (suma × levierul × partea gridului dinspre câștig × comisionul de piață), de două ori; în % din sumă și în perechi de grile", () => {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js"]) vm.runInContext(LIBF(f), c, { filename: f });
  const D = (x) => J(c.GridPlan.dusIntors(x)), baza = { dir: "long", pret: 100, jos: 90, sus: 110, suma: 100, levier: 3, perOrdin: 15, profitGrila: 0.006 };
  const a = D(baza); aproape(a.intrare, 100 * 3 * 0.5 * 0.0005); aproape(a.cost, 2 * a.intrare); aproape(a.dinSuma, a.cost / 100); aproape(a.perechi, a.cost / (15 * 0.006));
  const l20 = D(Object.assign({}, baza, { levier: 20 })); aproape(l20.dinSuma, 0.01, "la 20×, cu jumătate de grid cumpărat: 1% din sumă dus-întors"); aproape(l20.cost / a.cost, 20 / 3, "costul crește cu levierul");
  aproape(D(Object.assign({}, baza, { pret: 92 })).intrare, 100 * 3 * 0.9 * 0.0005, "long pornit jos în grid: aproape tot gridul e cumpărat la pornire");
  aproape(D(Object.assign({}, baza, { dir: "short", pret: 92 })).intrare, 100 * 3 * 0.1 * 0.0005, "short: partea de sub preț");
  aproape(D(Object.assign({}, baza, { pret: 120 })).intrare, 0, "prețul peste grid la long: nimic de cumpărat"); assert.equal(D(Object.assign({}, baza, { profitGrila: -0.0001 })).perechi, null, "grila care nu acoperă comisionul: fără „perechi”");
  assert.equal(c.GridPlan.dusIntors(null), null); assert.equal(c.GridPlan.dusIntors(Object.assign({}, baza, { suma: 0 })), null); assert.equal(c.GridPlan.dusIntors(Object.assign({}, baza, { sus: 80 })), null);
  /* același comision și aceeași „parte” ca taxa de intrare a botului pornit (TabloExtra.taxaIntrare) */
  assert.match(LIBF("grid-plan.js"), /var intrare = x\.suma \* x\.levier \* parte \* C\.COMISION, cost = 2 \* intrare/); assert.match(LIBF("tablou-extra.js"), /var t = -inv \* lev \* parte \* C\.COMISION;/);
});

await test("I2 pe fereastra de grid, sub levier: costul în USDT, în % din sumă și în perechi; dedesubt, ce au făcut boții lui ținuți sub 15 minute (din raportul de risc), fără raport - nimic", () => {
  const c = vm.createContext({ console, Math, JSON, Number, String, Array, Object, isFinite, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s), rlStare: { raport: null } });
  vm.runInContext(functie(APP, "grDusIntorsText") + "\n" + functie(APP, "grDovadaScurti"), c);
  const T = (d) => { c.d = d; return vm.runInContext("grDusIntorsText(d)", c); };
  assert.equal(T({ intrare: 0.075, cost: 0.15, dinSuma: 0.0015, perechi: 1.67 }), "≈ −0,2 USDT · 0,15% din sumă · ~2 perechi de grile îl acoperă");
  assert.equal(T({ intrare: 0.5, cost: 1.0, dinSuma: 0.01, perechi: 24.4 }), "≈ −1,0 USDT · 1,0% din sumă · ~24 de perechi de grile îl acoperă", "de la 20, cu „de”");
  assert.equal(T({ intrare: 0.5, cost: 1.0, dinSuma: 0.01, perechi: null }), "≈ −1,0 USDT · 1,0% din sumă"); assert.equal(T({ intrare: 0.01, cost: 0.02, dinSuma: 0.0002, perechi: 0.4 }), "≈ −0,02 USDT · 0,02% din sumă · sub o pereche de grile îl acoperă"); assert.equal(T(null), "");
  const Dv = (rp) => { c.rlStare.raport = rp; return vm.runInContext("grDovadaScurti()", c); };
  assert.equal(Dv(null), ""); assert.equal(Dv({ boti: { desc: { durate: [{ de: 0, pana: 0.25, n: 12, laS: -5, comisionLaS: -4, pePlus: 0.5 }] } } }), "", "sub 20 de boți: fără propoziție");
  assert.equal(Dv({ boti: { desc: { durate: [{ de: 0, pana: 0.25, n: 734, laS: -731.4, comisionLaS: -402.6, pePlus: 0.504 }, { de: 0.25, pana: 1, n: 463, laS: 10, comisionLaS: -5, pePlus: 0.6 }] } } }),
    "Boții tăi ținuți sub 15 minute (734): 50% pe plus, la suma ta obișnuită −731,4 USDT în total, din care comisioane −402,6.");
  assert.equal(Dv({ boti: { desc: { durate: [{ de: 0, pana: 0.25, n: 80, laS: 12, comisionLaS: -30, pePlus: 0.7 }] } } }), "", "când cei scurți au ieșit pe plus, nu e o dovadă împotrivă: nimic");
  const h = functie(APP, "grPlanVarHtml");
  assert.match(h, /\+grRand\("Levier",x\.levier\+"×",String\(x\.levier\)\)\s*\+\(function\(\)\{var di=typeof GridPlan!=="undefined"&&GridPlan\.dusIntors\?GridPlan\.dusIntors\(x\):null;var tx=di&&typeof grDusIntorsText==="function"\?grDusIntorsText\(di\):"";return tx\?grRand\("Cost dus-întors",tx,null\):""\}\)\(\)/);
  assert.match(h, /grDovadaScurti\(\)/);
});

/* ---------- J (el 22.11 ~12:35: „consilierul nu mai spune unde să mut stopul și alte sfaturi utile de genul, nu mai este sus și nici vremea monedei nu mai
   e sub chart … verifică că nu s-a pierdut nimic … plus fă ideile astea”) ---------- */
const CSSJ = citeste("public", "app.css"), HTMLJ = citeste("public", "index.html");
await test("J1 sfaturile concrete ale Consilierului (stopul, gridul, mișcarea) stau și sus, în cutia „Contează acum”: eticheta, cifra, sfatul, banii, copierea - doar pentru botul lor", () => {
  const c = vm.createContext({ console, Math, JSON, String, Array, Object, escapeHtml: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"), tbStare: { concSus: null } });
  vm.runInContext(functie(APP, "tbConcretSusHtml"), c);
  const H = (b) => { c.b = b; return vm.runInContext("tbConcretSusHtml(b)", c); };
  assert.equal(H({ id: "b1" }), "", "fără sfaturi socotite: nimic");
  c.tbStare.concSus = { bot: "b1", conc: [
    { cod: "stop", titlu: "Stopul", tag: { t: "stop în grid", c: "bad" }, mare: "0.002499", mic: "stop −10% · procentul se copiază · activ · +1,5% de preț", act: "L-aș muta la 0.002703 (peste gridul de sus).", bani: "💰 Acolo pierzi cel mult 25,9 USDT.", copie: "−28%" },
    { cod: "grid", titlu: "Gridul", tag: { t: "în grid", c: "good" }, mare: "89%", mic: "din interval", act: "41 de grile la 0,3% pas · propus: 7 grile la 2,9% pas." },
    { cod: "miscare", titlu: "Mișcarea", mare: "1,1×", text: "N-aș schimba nimic pe <zgomot>." }] };
  const h = H({ id: "b1" });
  assert.match(h, /^<div class="ctConcret"><div class="ctCcTitlu"><b>Consilierul, concret<\/b><button type="button" class="tbBtnLinie ctBtn" data-action-click="tbSariLa\('risc','tbConcret'\)">amănuntele, în Riscul<\/button><\/div>/);
  assert.match(h, /<div class="ctCcRand ctCc-stop"><div class="ctCcCap"><b>Stopul<\/b><span class="ctCcMare">0\.002499<\/span><span class="tbTag bad">stop în grid<\/span><\/div><p class="ctCcAct">L-aș muta la 0\.002703 \(peste gridul de sus\)\.<\/p><p class="ctCcBani">💰 Acolo pierzi cel mult 25,9 USDT\.<\/p><button type="button" class="tbBtnLinie ctBtn" value="−28%" data-action-click="gridCopiaza\(this\.value\)"[^>]*>copiază −28%<\/button><\/div>/, "rândul stopului: sfatul, banii și copierea; rândul lung de sub cifră rămâne în cartelă");
  assert.match(h, /<b>Gridul<\/b><span class="ctCcMare">89% <small>din interval<\/small><\/span><span class="tbTag good">în grid<\/span>/); assert.match(h, /<b>Mișcarea<\/b><span class="ctCcMare">1,1×<\/span><\/div><p class="ctCcAct">N-aș schimba nimic pe &lt;zgomot>\.<\/p><\/div><\/div>$/, "fără etichetă, fără bani, fără copiere: doar sfatul (scăpat)");
  assert.equal(H({ id: "alt" }), "", "sfaturile altui bot nu se arată"); assert.equal(H(null), "");
  c.tbStare.concSus = { bot: "b1", conc: [{ cod: "stop", titlu: "Stopul" }, null] }; assert.equal(H({ id: "b1" }), "", "cartelă fără sfat: nimic");
});

await test("J2 cutia „Contează acum” ia sfaturile din ACEEAȘI socoteală ca cartela (SemnaleBot.acumConcret), se reface când ele se schimbă și nu mai e „goală” cât le are", () => {
  const sem = functie(APP, "tbDeseneazaSemafor"), ren = functie(APP, "tbRenderConteaza");
  assert.match(sem, /var conc=SemnaleBot\.acumConcret\(\{[^\n]*\n  tbStare\.concSus=\{bot:b\.id,conc:conc\};/); assert.match(sem, /if\(!b\)\{tbStare\.concSus=null;/, "fără bot: sfaturile botului de dinainte nu rămân sus");
  assert.match(sem, /if\(typeof tbRenderConteaza==="function"\)tbRenderConteaza\(true\);/);
  assert.match(ren, /var hc=b&&h&&typeof tbConcretSusHtml==="function"\?tbConcretSusHtml\(b\):"";if\(hc\)h=tbCutieFaraAlarma\(h\)\+hc;\n/);
  /* regulile de lățime care țineau de „cutia are rânduri” țin acum și de sfaturile Consilierului */
  assert.equal(CSSJ.split(":has(>#ctAcum:not([hidden]) :is(.ctRand,.ctConcret))").length - 1, 6); assert.ok(!CSSJ.includes(":has(>#ctAcum:not([hidden]) .ctRand)"));
  assert.match(CSSJ, /#tabloubot \.ctNimic\{[^}]*color:var\(--pzT2/); assert.match(CSSJ, /@media \(min-width:700px\) and \(max-width:1180px\)\{\n#tabloubot \.ctConcret\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  /* blocul nou nu aduce culori directe și nici stiluri în linie */
  const bloc = CSSJ.slice(CSSJ.indexOf("/* v100.377: „Consilierul, concret”"), CSSJ.indexOf("/* v100.374 design")); assert.ok(bloc.length > 400 && !/#[0-9a-f]{3,8}\b|rgba?\(/i.test(bloc), "doar variabilele casei");
  assert.ok(!/style="/.test(functie(APP, "tbConcretSusHtml")));
});

await test("J3 „Trendul pe TF-uri” (cu rândul „Vremea monedei”) stă iar sub grafic la orice lățime; capitolul Piața spune unde e", () => {
  assert.ok(!/#tbTrendCard\{order:362/.test(CSSJ), "nu mai pleacă în capitolul Piața");
  assert.match(CSSJ, /html\.pzDemo #tabloubot#tabloubot#tabloubot\.on:not\(\.tbFaraBot\) \.tbCadru #tbTrendCard\{order:19!important\}\n@media \(max-width:1180px\)\{\nhtml\.pzDemo #tabloubot#tabloubot#tabloubot\.on:not\(\.tbFaraBot\) \.tbCadru #tbTrendCard\{order:13!important;grid-column:1 \/ -1!important;grid-row:auto!important;min-width:0\}\n\}/);
  /* pe calculator: după grafic (rândurile fixe 6–12) și ÎNAINTEA detaliilor cifrelor (order 20); sub 1181 px: după grafic (11–13), înaintea detaliilor (14) și a capitolelor (300+) */
  assert.match(CSSJ, /\.tbCadru>#tbKpiDetalii:not\(\[hidden\]\)\{grid-column:1 \/ -1;grid-row:auto;order:20;/); assert.match(CSSJ, /\.tbCadru>#tbKpiDetalii:not\(\[hidden\]\)\{order:14!important;/); assert.match(CSSJ, /#tbGraficCard>#pzUltimii\{order:13!important\}/); assert.match(CSSJ, /#tbCap-decizia\{order:300!important\}/);
  assert.match(HTMLJ, /<h3 class="tbCap" id="tbCap-piata">Piața<span>ce spune piața și candidatele · trendul pe intervale e sub grafic<\/span>/);
  assert.ok(HTMLJ.indexOf('id="tbVremea"') > HTMLJ.indexOf('id="tbTrendCard"') && HTMLJ.indexOf('id="tbVremeaLarg"') > HTMLJ.indexOf('id="tbVremea"'), "Vremea monedei e în cartela Trendului");
});

await test("J4 fișa de grid pe moneda botului pornit: numele botului (PUMPFUN) ⇒ tickerul lui din Pionex (PUMP), și când e scris de mână; un ticker care există nu se schimbă", () => {
  const c = vm.createContext({ console, Math, JSON, String, Array, Object, Number, isFinite, RegExp, tbStare: { bot: null, boti: [] }, grStare: { monede: null }, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  vm.runInContext(LIBF("tablou-bot.js") + "\n" + functie(APP, "grSimbol") + "\n" + functie(APP, "grMonedaBot") + "\n" + functie(APP, "grAliasBot"), c);
  const M = (b) => { c.b = b; return vm.runInContext("grMonedaBot(b)", c); }, A = (t) => { c.t = t; return vm.runInContext("grAliasBot(t)", c); };
  const pump = { id: "1", baza: "PUMPFUN.PERP", quote: "USDT", simbolPionex: "PUMP_USDT_PERP" }, hype = { id: "2", baza: "HYPE.PERP", quote: "USDT", simbolPionex: "HYPE_USDT_PERP" };
  assert.equal(M(pump), "PUMP"); assert.equal(M(hype), "HYPE"); assert.equal(M({ baza: "PUMPFUN.PERP", quote: "USDT" }), "PUMPFUN", "fără tickerul de la server: numele, ca până acum"); assert.equal(M(null), ""); assert.equal(M({ baza: "X.PERP", simbolPionex: "ceva ciudat" }), "X");
  c.tbStare.bot = pump; c.tbStare.boti = [pump, hype];
  assert.equal(A("pumpfun"), "PUMP"); assert.equal(A("PUMPFUN.PERP"), "PUMP"); assert.equal(A("HYPE"), "", "numele e chiar tickerul"); assert.equal(A("BTC"), ""); assert.equal(A(""), "");
  /* fără bot pornit pe ea: numele de bot din lista oficială (baseCurrency) */
  c.tbStare.bot = null; c.tbStare.boti = []; c.grStare.monede = { LIT_USDT_PERP: { baseCurrency: "LIGHTER.PERP" }, BTC_USDT_PERP: { baseCurrency: "BTC.PERP" }, LIT_USDT: { baseCurrency: "LIGHTER" } };
  assert.equal(A("lighter"), "LIT"); assert.equal(A("LIT"), "", "tickerul există: rămâne"); assert.equal(A("NIMIC"), "");
  c.grStare.monede.PUMPFUN_USDT_PERP = { baseCurrency: "PUMPFUN.PERP" }; c.tbStare.bot = pump; assert.equal(A("PUMPFUN"), "", "dacă numele ar fi și ticker, nu se ghicește");
  assert.match(functie(APP, "porneGrid"), /gm\.value=grMonedaBot\(tbStare\.bot\);/); assert.match(functie(APP, "gridCalculeaza"), /^function gridCalculeaza\(fortat\)\{\n  var gm0=\$\("grMoneda"\),al0=gm0&&typeof grAliasBot==="function"\?grAliasBot\(gm0\.value\):"";if\(al0\)gm0\.value=al0;/);
});

await test("J5 boții porniți AZI, lângă costul dus-întors: câți (ca frâna zilei), ce comisioane au plătit cei închiși și cu cât au ieșit; de la a doua pornire", () => {
  const G = new Function(LIBF("grid-calcul.js") + "; return GridCalcul;")(), GPr = new Function("GridCalcul", LIBF("grid-proba.js") + "; return GridProba;")(G), JT = new Function("GridCalcul", LIBF("jurnal-trade.js") + "; return JurnalTrade;")(G);
  const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", "TextRo", LIBF("obiceiuri.js") + "; return Obiceiuri;")(G, GPr, JT, globalThis.TextRo);
  const acum = Date.UTC(2026, 10, 22, 11, 0, 0), z0 = OB.inceputZiRo(acum), ORA = 3600000;
  const t = (o) => Object.assign({ pornit: z0 + ORA, inchis: z0 + 2 * ORA, rezultat: 0, comisioane: -0.1, funding: 0, net: -0.1 }, o);
  const trades = [t({ comisioane: -0.0789, net: 0.0045 }), t({ comisioane: -0.2205, net: -7.7589 }), t({ pornit: z0 - 5 * ORA, inchis: z0 + ORA, net: -3 }), t({ pornit: z0 - 30 * ORA, inchis: z0 - 20 * ORA, net: 9 })];
  const deschise = [{ activ: true, pornitLa: z0 + 3 * ORA, profitTotal: -1 }, { activ: true, pornitLa: z0 - 2 * ORA, profitTotal: 1 }, { activ: false, pornitLa: z0 + ORA }];
  const p = OB.porniriAzi({ trades, deschise, acum });
  assert.equal(p.n, 3); assert.equal(p.inchisi, 2); aproape(p.comisioane, -0.2994); aproape(p.net, -7.7544); assert.equal(p.prag, 7); assert.equal(p.celPutin, false);
  assert.equal(p.n, OB.frana({ trades, deschise, acum }).pornitiAzi, "aceeași numărătoare ca frâna zilei");
  assert.equal(OB.textPorniriAzi(p), "Azi ai pornit deja 3 boți (pragul tău: 7) · cei 2 închiși: comisioane −0,3 USDT, net −7,8 USDT.");
  assert.equal(OB.textPorniriAzi(OB.porniriAzi({ trades: trades.slice(0, 1), deschise: [], acum })), "", "o singură pornire nu e „repetată”");
  assert.equal(OB.textPorniriAzi(OB.porniriAzi({ trades: trades.slice(0, 2), deschise: [], acum })), "Azi ai pornit deja 2 boți (pragul tău: 7) · toți închiși: comisioane −0,3 USDT, net −7,8 USDT.");
  assert.equal(OB.textPorniriAzi(OB.porniriAzi({ trades: trades.slice(0, 1), deschise: deschise.slice(0, 1), acum })), "Azi ai pornit deja 2 boți (pragul tău: 7) · unul închis: comisioane −0,08 USDT, net +0,00 USDT.");
  assert.equal(OB.textPorniriAzi(OB.porniriAzi({ trades: [], deschise: [deschise[0], deschise[0]], acum })), "Azi ai pornit deja 2 boți (pragul tău: 7).", "niciunul închis: doar numărul");
  assert.equal(OB.textPorniriAzi(OB.porniriAzi({ trades: [trades[0], t({ comisioane: null, net: -2 })], deschise: [], acum, praguri: { boti: 4 } })), "Azi ai pornit deja 2 boți (pragul tău: 4) · toți închiși: net −2,0 USDT.", "un bot fără comision citit: comisioanele nu se spun pe jumătate");
  const multi = []; for (let i = 0; i < 21; i++) multi.push(t({})); const pm = OB.porniriAzi({ trades: multi, deschise: [], acum });
  assert.equal(pm.celPutin, true); assert.match(OB.textPorniriAzi(pm), /^Azi ai pornit deja cel puțin 21 de boți \(pragul tău: 7\) · toți închiși: comisioane −2,1 USDT, net −2,1 USDT\.$/, "lista poate fi doar „ultimii N”; de la 20, cu „de”");
  assert.equal(OB.textPorniriAzi(null), ""); assert.equal(OB.porniriAzi({}).n, 0);
  /* pagina: sursa frânei de pe Acasă (contTot.inchise, doar când citirea a reușit), fără butonul porții; rândul stă sub costul dus-întors */
  const g = functie(APP, "grPorniriAzi");
  assert.match(g, /inchise=ct&&ct\.inchiseOk&&Array\.isArray\(ct\.inchise\)\?ct\.inchise:null/); assert.match(g, /if\(!inchise\)return g&&g\.p&&Date\.now\(\)-g\.la<=30\*60000\?Obiceiuri\.textPorniriAzi\(g\.p\):"";/);
  assert.match(functie(APP, "grPlanVarHtml"), /grDovadaScurti\(\):"";[^\n]*\n\s*\+\(function\(\)\{var pa=typeof grPorniriAzi==="function"\?grPorniriAzi\(\):"";return pa\?'<p class="tbSub grPlanAzi">'\+escapeHtml\(pa\)\+'<\/p>':""\}\)\(\)/);
});

/* ---------- K (el 22.11: „… plus fă ideile astea”, ideea 3): a doua regulă de ieșire pe bani la probă, pe TIMP - „închid după 4 ore pe minus” ---------- */
await test("K1 episodul timpului: primul punct între 4 și 24 de ore de la pornire cu totalul sub −0,5% din suma de atunci; diferența = cum a ieșit − (totalul de acolo − comisionul de închidere)", () => {
  const ORAg = 60, bot = (o) => botG(Object.assign({ durMin: 600 }, o)), pas5 = (v) => drumG(v, 5);   /* un punct la 5 minute */
  /* 0 … 3 h 55 pe plus, la 4 h pe minus mic (sub prag), la 4 h 05 la −1 (prag: 0,5% din 100 = −0,5) */
  const v = []; for (let i = 0; i < 48; i++) v.push(1); v.push(-0.2); v.push(-1); for (let i = 0; i < 40; i++) v.push(-3);
  const e = PMg.episodTimp(bot({ id: "t1", final: -6 }), pas5(v));
  assert.equal(e.t0, T0g + 49 * 5 * MINg, "nu punctul de la 4 ore fix (acolo era peste prag), ci primul sub prag"); aproape(e.laPrag, -1); aproape(e.comision, 100 * 3 * 0.0005); aproape(e.d, -6 - (-1 - 0.15)); aproape(e.dPct, e.d);
  assert.equal(e.nou, true); assert.equal(e.zi, new Date(e.t0).toISOString().slice(0, 10));
  /* pe minus mare ÎNAINTE de 4 ore nu contează: regula se uită abia de la 4 ore */
  const v2 = []; for (let i = 0; i < 48; i++) v2.push(-8); for (let i = 0; i < 30; i++) v2.push(2);
  assert.deepEqual(J(PMg.episodTimp(bot({ id: "t2", final: 2 }), pas5(v2))), { id: "t2", fara: "pe-plus" });
  /* botul închis înainte de 4 ore: „scurt”; fără drum; drum început târziu; gol chiar înaintea punctului */
  assert.deepEqual(J(PMg.episodTimp(bot({ id: "t3", final: -4, durMin: 100 }), pas5([0, -1, -2, -3]))), { id: "t3", fara: "scurt" });
  assert.deepEqual(J(PMg.episodTimp(bot({ id: "t4", final: 1 }), [])), { id: "t4", fara: "fara-drum" });
  assert.deepEqual(J(PMg.episodTimp(bot({ id: "t5", final: 1 }), drumG(v, 5, T0g + 30 * MINg))), { id: "t5", fara: "drum-taiat" });
  const cuGol = pas5(v).filter((q, i) => i < 46 || i > 48); assert.deepEqual(J(PMg.episodTimp(bot({ id: "t6", final: -6 }), cuGol)), { id: "t6", fara: "gol" });
  /* după 24 de ore regula nu mai are ce spune (alerta de 24 h e alta): pe minus abia la 25 h ⇒ fără episod */
  const lung = []; for (let i = 0; i < 300; i++) lung.push(1); for (let i = 0; i < 20; i++) lung.push(-5);
  assert.deepEqual(J(PMg.episodTimp(bot({ id: "t7", final: -5, durMin: 1700 }), pas5(lung))), { id: "t7", fara: "pe-plus" });
  /* pragul e pe suma din PUNCT (marja adăugată pe drum): −0,8 la suma 200 nu trece de 0,5% */
  const marja = pas5(v).map((q, i) => (i >= 48 ? Object.assign({}, q, { investit: 200, profitTotal: -0.8 }) : q));
  assert.deepEqual(J(PMg.episodTimp(bot({ id: "t8", final: -1 }), marja)), { id: "t8", fara: "pe-plus" });
  assert.equal(PMg.ORE_TIMP, 4); assert.equal(PMg.ORE_TIMP_MAX, 24); assert.equal(PMg.PRAG_TIMP, 0.005); assert.equal(PMg.COADA_TIMP, 0.0025); assert.equal(PMg.START_TIMP, Date.UTC(2026, 10, 22));
  /* aceleași praguri ca alerta de 4 ore a colectorului */
  assert.match(citeste("scripts", "colector.mjs"), /acum - Number\(b\.pornitLa\) >= 4 \* 3600000 && acum - Number\(b\.pornitLa\) < 24 \* 3600000 && Number\(b\.profitTotal\) < -0\.005 \* /);
});

await test("K2 tura: aceeași ca a pierderii, cu regula timpului - cheia ei, numărătoarea ei (închiși înainte de 4 ore, fără minus), verdictul înghețat o dată; regula pierderii rămâne neschimbată", async () => {
  const TT = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-proba-pierdere.mjs")).href);
  const v = []; for (let i = 0; i < 48; i++) v.push(1); for (let i = 0; i < 40; i++) v.push(-3);
  const boti = [botG({ id: "a", final: -6, durMin: 600 }), botG({ id: "b", final: 2, durMin: 100 }), botG({ id: "c", final: 3, durMin: 600 })], drumuri = { a: drumG(v, 5), b: drumG([0, 1, 2], 5), c: drumG(v.map(() => 2), 5) };
  const tr = [], st = {}, d = { acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: async (id) => ({ citit: true, brut: drumuri[id] }), trimite: async (cale, corp) => { tr.push({ cale, corp }); } };
  const r = await TT.turaProbaTimp(d, st);
  assert.equal(r.judecati, 3); assert.equal(r.episoadeNoi, 1); assert.equal(tr[0].cale, "/api/istoric-bot?action=probaTimp");
  assert.deepEqual(J(tr[0].corp.boti), { total: 3, judecati: 3, necititi: 0, ramasi: 0, episoade: 1, faraDrum: 0, drumTaiat: 0, gol: 0, vechi: 0, scurt: 1, pePlus: 1 });
  assert.equal(tr[0].corp.prag, 0.005); assert.equal(tr[0].corp.ore, 4); assert.equal(tr[0].corp.coada, 0.0025); assert.equal(tr[0].corp.verdict, null, "sub prag: fără verdict");
  assert.deepEqual(J(st.facute), { a: "episod", b: "scurt", c: "pe-plus" });
  /* aceeași arhivă, regula pierderii (implicită): altă cheie, alți boți fără episod; stările celor două probe nu se amestecă */
  const tr2 = [], st2 = {}; await TT.turaProbaPierdere(Object.assign({}, d, { trimite: async (cale, corp) => { tr2.push({ cale, corp }); } }), st2);
  assert.equal(tr2[0].cale, "/api/istoric-bot?action=probaPierdere"); assert.equal(tr2[0].corp.prag, 0.05); assert.equal(tr2[0].corp.ore, undefined); assert.ok("pestePrag" in tr2[0].corp.boti && !("scurt" in tr2[0].corp.boti));
  assert.equal(TT.REGULA_TIMP.cale, "probaTimp"); assert.equal(TT.REGULA_PIERDERE.cale, "probaPierdere"); assert.equal(TT.REGULA_TIMP.episod, PMg.episodTimp);
});

await test("K3 ruta, colectorul și pagina Probe: `proba:timp` are cheia ei, tura rulează o dată pe oră, rândul „⏱️ Închid după 4 ore pe minus sau las?” stă între cel al pierderii și cel al marginii; sub prag doar numărătoarea", () => {
  const ruta = citeste("functions", "api", "istoric-bot.js"), col = citeste("scripts", "colector.mjs");
  assert.match(ruta, /if\(action==="probaTimp"\)\{let v=null,citit=true,t=null;try\{t=await env\.ISTORIC\.get\("proba:timp"\)\}catch\{citit=false\}try\{v=JSON\.parse\(t\|\|"null"\)\}catch\{v=null\}return json\(\{probaTimp:v,citit\}\)\}/);
  assert.match(ruta, /if\(action==="probaMargine"\|\|action==="probaPierdere"\|\|action==="probaTimp"\)\{const eP=action==="probaPierdere",eT=action==="probaTimp",/);
  assert.match(ruta, /\(eT\?\["total","judecati","ramasi","episoade","scurt","pePlus","faraDrum","drumTaiat","gol","vechi","necititi"\]:eP\?/);
  assert.match(ruta, /if\(eT\)\{await env\.ISTORIC\.put\("proba:timp",JSON\.stringify\(Object\.assign\(\{prag:nr\(c\.prag\),coada:nr\(c\.coada\),ore:nr\(c\.ore\)\},ob\)\)\);return json\(\{ok:true\}\)\}/);
  assert.ok(ruta.indexOf('if(eT){await env.ISTORIC.put("proba:timp"') < ruta.indexOf('if(eP){await env.ISTORIC.put("proba:pierdere"') && ruta.indexOf('if(eP){await env.ISTORIC.put("proba:pierdere"') < ruta.indexOf('await env.ISTORIC.put("proba:margine",JSON.stringify(ob))'), "fiecare probă scrie doar în cheia ei");
  assert.match(col, /if \(process\.env\.COLECTOR_FARA_TIMP \|\| timpStare\.inLucru \|\| Date\.now\(\) - \(timpStare\.la \|\| 0\) < 3600000 \|\| Date\.now\(\) - \(timpStare\.esecLa \|\| 0\) < 2 \* 3600000\) return;/);
  assert.match(col, /const timpStare = stareDeDisc\("proba-timp-stare\.json"\);/); assert.match(col, /finally \{ timpStare\.inLucru = false; scrieStareDisc\("proba-timp-stare\.json", timpStare\); \}/);
  assert.match(col, /if \(val\.medii\) turaProbaTimpColector\(\)\.catch\(/);
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, Intl, sugStare: { d: {} }, sugCate: (n, s, p) => globalThis.TextRo.cate(n, s, p), sugEsc: (s) => String(s), sugP1: (v) => String(v), sugPc: (v) => String(v), sugZec: (v) => String(v), sugCadZi: (z) => String(z), Caiet: undefined });
  vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", "probe-ecran.js"), "utf8"), c);
  const src = citeste("public", "lib", "probe-ecran.js"); assert.match(src, /pas\("probaTimp", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=probaTimp"\)\.then\(function \(r\) \{ return r && r\.probaTimp \|\| null; \}\); \}\),/);
  assert.match(src, /var PR_TIMP = \{ n: 60, zile: 20, start: "2026-11-22", ore: 4 \};/);
  const iT = src.indexOf('R.push({ k: "timp"'), iP = src.indexOf('R.push({ k: "pierdere"'), iM = src.indexOf('R.push({ k: "margine"'); assert.ok(iP > 0 && iP < iT && iT < iM, "pierderea, timpul, marginea");
  const rand = src.slice(src.indexOf("var tg = d.probaTimp"), iM); assert.ok(src.indexOf("var tg = d.probaTimp") > iP);
  /* rândul desenat: fără date așteaptă colectorul; sub prag doar numărătoarea, fără medie; cu verdict înghețat îl spune o dată */
  const fara = c.prProbe({}, Date.UTC(2026, 10, 23)).find((q) => q.k === "timp"); assert.match(fara.jud, /aștept colectorul/); assert.match(fara.sta, /^din arhiva ta, la 22\.11\.2026: boții ajunși la 4 ore erau 22% din boți și făcuseră 64% din pierdere/, "cifrele scrise își poartă data");
  const sub = c.prProbe({ probaTimp: { forma: 1, la: Date.UTC(2026, 10, 23) - 1000, n: 9, zile: 6, medie: -3.1, suma: -40, ic: null, verdict: null, inghetat: null, minEpisoade: 60, minZile: 20, boti: { total: 40, judecati: 21, ramasi: 2, episoade: 9, scurt: 8, pePlus: 3, faraDrum: 1, drumTaiat: 0, gol: 0, vechi: 17 } } }, Date.UTC(2026, 10, 23)).find((q) => q.k === "timp");
  assert.match(sub.jud, /^9 episoade în 6 zile · citiți 21 de boți închiși: 8 închiși înainte de 4 ore, 3 n-au fost pe minus între 4 și 24 de ore, 1 fără drum, 0 cu drumul tăiat sau cu goluri/); assert.match(sub.sta, /^doar numărătoarea până la prag/); assert.ok(!/3,1/.test(sub.sta + sub.jud), "media nu se arată sub prag");
  const ver = c.prProbe({ probaTimp: { forma: 1, la: Date.UTC(2026, 10, 23) - 1000, n: 66, zile: 40, medie: -2, suma: -90, ic: [-4, -0.5], verdict: "inchiderea", inghetat: { la: Date.UTC(2026, 10, 22, 12), n: 60, zile: 38, medie: -2.2, suma: -88, ic: [-4.1, -0.4], verdict: "inchiderea" }, minEpisoade: 60, minZile: 20, boti: null } }, Date.UTC(2026, 10, 23)).find((q) => q.k === "timp");
  assert.match(ver.sta, /^VERDICT \(înghețat la [^)]*, pe 60 de episoade în 38 de zile\): închiderea la 4 ore ar fi fost mai bună · lăsat − închis atunci: −2,2% din suma pusă, în medie pe bot \(interval 99,5% pe zile: −4,1% … −0,4%\) · în total −88,0 USDT · de atunci s-au mai adunat 6 episoade \(verdictul nu se schimbă\)$/);
  assert.match(rand, /nume: "⏱️ Închid după " \+ tOre \+ " pe minus sau las\? · boții tăi, din clipa alertei „a trecut de " \+ tOre \+ " și e pe minus”"/);
  assert.match(rand, /: tg \? "doar numărătoarea până la prag: diferența dintre „lăsat” și „închis la " \+ tOre \+ "” se arată o singură dată, la verdict"/, "sub prag nu se arată media");
  assert.match(rand, /var tOre = sugCate\(PR_TIMP\.ore, "oră", "ore"\);/); assert.equal(fara.nume, "⏱️ Închid după 4 ore pe minus sau las? · boții tăi, din clipa alertei „a trecut de 4 ore și e pe minus”"); assert.match(rand, /interval 99,5% pe zile/); assert.match(rand, /două reguli de ieșire sunt la probă deodată \(și cea de −5%\)/); assert.match(rand, /sugCate\(tB\.judecati, "bot închis", "boți închiși"\)/);
  /* regulile sunt scrise: pre-înregistrarea și simularea pentru două reguli */
  const doc = citeste("docs", "cercetare", "2026-11-22-v100377-proba-timpului.md");
  for (const t of ["între 4 și 24 de ore", "0,5% din suma", "60 de episoade", "20 de zile", "99,5%", "o singură dată", "Două reguli deodată", "Amendamentul din 22.11.2026, 16:32", "Greșit, îndreptat în amendamentul", "COADA_PIERDERE = COADA_TIMP = 0,0025", "împinsă spre „lăsatul a fost mai bun”", "Ce NU poate spune"]) assert.ok(doc.includes(t), "pre-înregistrarea spune: " + t);
  assert.match(citeste("scripts", "sim-h0-v100377-doua-reguli.mjs"), /\/\/ REZULTATELE \(22\.11\.2026/);
});

/* ---------- L (el 22.11 ~14:35: „fa idei”): o singură propunere de stop pe pagină; stopul chiar pe margine își spune faptul; alerta lui ---------- */
const { botDeProba: botL } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "bot-de-proba.mjs")).href);
const CL = (() => { const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, RegExp, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
  for (const f of ["grid-calcul.js", "tablou-extra.js", "semnale-bot.js", "curba-stop.js", "conteaza.js", "cap-margine.js"]) vm.runInContext(LIBF(f), c, { filename: f });
  return { c, SB: vm.runInContext("SemnaleBot", c), TE: vm.runInContext("TabloExtra", c), CS: vm.runInContext("CurbaStop", c), CT: vm.runInContext("Conteaza", c), CM: vm.runInContext("CapMargine", c) }; })();
const ACUML = Date.UTC(2026, 10, 13, 12);
const stopL = (b, o) => { o = o || {}; const conc = CL.SB.acumConcret({ bot: b, fisa: null, zero: CL.TE.dacaInchizi(b), costuri: CL.TE.grileVsCosturi(b, ACUML), plan: null, acum: ACUML, stopZgomot: o.zgomot || null, cifre: o.cifre ? (pr) => CL.TE.cifreActiuni(b, { protectie: pr }) : undefined }); return J(conc.filter((q) => q.cod === "stop")[0]); };
const CURBA = { la: ACUML - 3600000, d: [0.5, 1, 2, 3, 4, 5, 6], p24: [0.95, 0.8, 0.5, 0.3, 0.2, 0.1, 0.05], p72: [0.99, 0.9, 0.7, 0.5, 0.4, 0.25, 0.15], n24: 500, n72: 400, perechi: 21, zile: 30 };

await test("L1 prețul la care zgomotul atinge stopul într-o zi în ~20 din 100 de cazuri, de la prețul de ACUM: short deasupra, long dedesubt; fără curbă bună sau fără ATR - nimic", () => {
  const z = J(CL.CS.pretLa({ curba: CURBA, atr: 0.5, pret: 74.5, dir: "short", acum: ACUML }));
  aproape(z.d, 4); aproape(z.pret, 74.5 + 4 * 0.5); assert.equal(z.perechi, 21); assert.equal(z.zile, 30); aproape(z.tinta, 0.2);
  aproape(CL.CS.pretLa({ curba: CURBA, atr: 0.5, pret: 74.5, dir: "long", acum: ACUML }).pret, 74.5 - 2);
  aproape(CL.CS.pretLa({ curba: CURBA, atr: 0.5, pret: 74.5, dir: "short", acum: ACUML, tinta: 0.4 }).d, 2.5, "între puncte: interpolat");
  aproape(CL.CS.sansa(CURBA, 24, z.d), 0.2, "aceeași curbă, citită invers");
  /* stopul de acum aflat mai aproape: propunerea veche (pentruStop.mut20) cade pe același preț */
  aproape(CL.CS.pentruStop({ curba: CURBA, atr: 0.5, pret: 74.5, stop: 75, dir: "short", acum: ACUML }).mut20, z.pret);
  for (const o of [{ atr: 0 }, { pret: 0 }, { dir: "neutru" }, { acum: ACUML + 40 * 3600000 }, { curba: null }, { curba: Object.assign({}, CURBA, { n24: 0 }) }, { tinta: 0.01 }])
    assert.equal(CL.CS.pretLa(Object.assign({ curba: CURBA, atr: 0.5, pret: 74.5, dir: "short", acum: ACUML }, o)), null, JSON.stringify(Object.keys(o)));
  assert.equal(CL.CS.pretLa({ curba: CURBA, atr: 30, pret: 74.5, dir: "long", acum: ACUML }), null, "la un ATR uriaș prețul ar cădea sub zero");
});

await test("L2 cartela „Stopul”: curba împinge protecția până la prețul zgomotului - doar mai departe decât ce era propus, doar dincolo de margine, nu la / dincolo de lichidare; sursa e scrisă", () => {
  const b = botL("short", 74, 74.5, { x: { lossStop: "78", lossStopType: "price" } });   /* grid 65–76, lichidare 95,2 */
  assert.equal(b.gridSus, 76); assert.ok(b.profitTotal < 0, "premisa: pe minus");
  const fara = stopL(b); aproape(fara.pretPropus, 76.5, "fără curbă: o grilă peste margine, ca până acum"); assert.equal(fara.sursa, undefined);
  const cu = stopL(b, { zgomot: { pret: 78.2, sursa: "21 de monede, 30 de zile" } });
  aproape(cu.pretPropus, 78.2); assert.equal(cu.sursa, "Stopul propus: acolo zgomotul îl atinge într-o zi în ~20 din 100 de cazuri (curba stopului, 21 de monede, 30 de zile)."); assert.ok(cu.text.endsWith(cu.sursa));
  aproape(stopL(b, { zgomot: { pret: 76.2 } }).pretPropus, 76.5, "mai aproape decât protecția de până acum: rămâne aceea");
  aproape(stopL(b, { zgomot: { pret: 75.5 } }).pretPropus, 76.5, "în grid: nu se propune");
  aproape(stopL(b, { zgomot: { pret: 74 } }).pretPropus, 76.5, "de partea greșită a prețului: nu");
  /* fără geometria gridului citită cartela n-are nicio protecție proprie: prețul zgomotului tot nu se propune ÎN grid, doar dincolo de margine */
  const bFara = JSON.parse(JSON.stringify(b)); bFara.brut.buOrderData.row = null;
  assert.equal(stopL(bFara).pretPropus == null, true, "premisa: fără geometrie, nimic propus"); assert.equal(stopL(bFara, { zgomot: { pret: 75.5 } }).pretPropus == null, true, "în grid: nu"); aproape(stopL(bFara, { zgomot: { pret: 77.1 } }).pretPropus, 77.1, "dincolo de margine: da");
  aproape(stopL(b, { zgomot: { pret: 95.2 } }).pretPropus, 76.5, "la lichidare: nu"); aproape(stopL(b, { zgomot: { pret: 99 } }).pretPropus, 76.5, "dincolo de lichidare: nu");
  aproape(stopL(b, { zgomot: { pret: 80 } }).pretPropus, 80, "fără sursa scrisă, tot se ia"); assert.match(stopL(b, { zgomot: { pret: 80 } }).sursa, /\(curba stopului\)\.$/);
  const bl = botL("long", 67, 66.5, { x: { lossStop: "63", lossStopType: "price" } });
  aproape(stopL(bl).pretPropus, 64.5); aproape(stopL(bl, { zgomot: { pret: 62.8 } }).pretPropus, 62.8, "oglinda la long: sub marginea de jos"); aproape(stopL(bl, { zgomot: { pret: 64.8 } }).pretPropus, 64.5); aproape(stopL(bl, { zgomot: { pret: 48 } }).pretPropus, 64.5, "sub lichidarea de 48,1: nu");
  /* pagina și colectorul îi dau cartelei același preț al zgomotului */
  assert.match(functie(APP, "tbDeseneazaSemafor"), /pragStop:psT,stopZgomot:typeof tbStopZgomot==="function"\?tbStopZgomot\(b\):null,acum:Date\.now\(\),cifre:/);
  assert.match(functie(APP, "tbStopZgomot"), /var z=CurbaStop\.pretLa\(\{curba:c,atr:botiNr\(rez\.atr1h\),pret:pvPretViuAcum\(b\)\|\|botiNr\(b\.pretCurent\),dir:b\.directie,acum:Date\.now\(\)\}\);/);
  assert.match(functie(APP, "tbStopZgomot"), /if\(!c\|\|!rez\|\|tbProbVechi\(rez\)\)return null;/, "cifrele vechi nu propun nimic"); assert.match(functie(APP, "tbStopZgomot"), /alTabloului=!!\(tbStare\.bot&&tbStare\.bot\.id===b\.id\),t=alTabloului\?tbProbPt\(b\):\(tbProb\.botId===b\.id\?tbProb:null\)/, "alt bot nu cere iar cifrele (cererile s-ar călca)");
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /pragStop: ProfilMoneda\.pragStop\(prof, dirC\), stopZgomot: stopZgomotColector\(b, b1h, dirC, acum\), acum,/);
  assert.match(col, /z = CurbaStop\.pretLa\(\{ curba: c, atr: CurbaStop\.atr14\(b1h\), pret: Number\(b\.pretCurent\), dir, acum \}\);/);
});

await test("L3 un singur preț: rândul din „Contează acum” spune prețul cartelei (când e mai departe decât stopul de acum), cu șansa măsurată ACOLO pe curbă", () => {
  const s = functie(APP, "tbStopSansa");
  assert.match(s, /var clS=tbStare\.consLinii&&tbStare\.consLinii\.bot===b\.id\?botiNr\(tbStare\.consLinii\.stopPlan\):null,atrS=botiNr\(rez\.atr1h\);/);
  assert.match(s, /if\(s\.mut20!==null&&clS!==null&&clS>0&&atrS>0&&\(s\.sus\?clS>s\.stop:clS<s\.stop\)\)\{s\.dMut20=Math\.abs\(clS-s\.pret\)\/atrS;s\.mut20=clS;s\.mutP24=CurbaStop\.sansa\(c,24,s\.dMut20\);if\(s\.mutP24!==null&&s\.mutP24>s\.p24\)s\.mutP24=s\.p24;\/\*[^*]*\*\/s\.mutDin="cartela"\}\n  if\(TE&&TE\.stopPropus\)TE\.stopPropus\(b,s\);/, "înaintea verificării propunerii (lichidare, totalul de acolo, grilele tăiate)");
  /* aceeași socoteală, rulată: stopul la 75 (1 ATR, ~80 din 100), cartela propune 78,2 ⇒ rândul spune 78,2 și ~10 din 100 */
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, CurbaStop: CL.CS, TabloExtra: null, Probabilitati: undefined,
    botiNr: (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v)), tbCurbaPt: () => Object.assign({}, CURBA, { la: Date.now() - 3600000 }) /* funcția socotește cu ceasul de acum */, tbProbVechi: () => null, pvPretViuAcum: () => 74.5,
    tbProb: { botId: "b1", rez: { atr1h: 0.5 } }, tbProbPt: () => ({ rez: { atr1h: 0.5 }, cal: null }), tbStare: { bot: { id: "b1" }, consLinii: { bot: "b1", stopPlan: 78.2 } } });
  vm.runInContext(s, c);
  const R = (b) => { c.b = b; return J(vm.runInContext("tbStopSansa(b)", c)); }, bot = { id: "b1", opritorPierdereActiv: true, opritorPierdere: 75, directie: "short", pretCurent: 74.5, gridJos: 65, gridSus: 76 };
  const r = R(bot); aproape(r.p24, 0.8); aproape(r.mut20, 78.2); aproape(r.dMut20, 7.4); aproape(r.mutP24, 0.05); assert.equal(r.mutDin, "cartela");
  c.tbStare.consLinii = { bot: "b1", stopPlan: 74.9 }; aproape(R(bot).mut20, 76.5, "cartela nu propune mai departe decât stopul de acum: rămâne prețul curbei"); assert.equal(R(bot).mutP24, undefined);
  c.tbStare.consLinii = { bot: "altul", stopPlan: 78.2 }; aproape(R(bot).mut20, 76.5, "prețul cartelei altui bot nu se ia");
  c.tbStare.consLinii = { bot: "b1", stopPlan: null }; aproape(R(bot).mut20, 76.5);
  /* textul rândului: șansa de la prețul spus, nu „~20” din oficiu */
  const rand = (st) => CL.CT.alege({ stop: st, sfaturi: [], lista: [], sanse: [] })[0];
  const baza = { d: 1, p24: 0.8, p72: 0.9, stop: 75, pret: 74.5, sus: true, perechi: 21, zile: 30, mut20: 78.2, dMut20: 7.4 };
  assert.match(rand(Object.assign({}, baza, { mutP24: 0.13 })).faCe, /^Hotărăște acum: ori accepți ieșirea la 75(\.0+)?, ori muți stopul la ~78\.2(0+)? \(acolo ~13 din 100 într-o zi\)\.$/);
  assert.match(rand(baza).faCe, /\(acolo ~20 din 100 într-o zi\)\.$/, "fără șansa măsurată (prețul curbei): ca până acum");
  assert.match(rand(Object.assign({}, baza, { mutP24: 0.004 })).faCe, /acolo ~1 din 100 într-o zi/, "niciodată „0 din 100”");
  assert.match(rand(Object.assign({}, baza, { raport: -0.1, mutRaport: -0.351, mutP24: 0.13 })).faCe, /ori muți stopul la ~−35,1% din investiție \(acum pe la ~78\.2(0+)?; acolo ~13 din 100 într-o zi\)\.$/);
});

await test("L4 stopul CHIAR pe margine (≤ 0,2% de ea, prețul în grid): cartela nu mai zice „l-aș lăsa” (un fir de păr dincolo) și nici „stă în grid” (un fir de păr dincoace) - spune faptul, prețul propus și cele două sume", () => {
  assert.equal(CL.SB.PRAG_PE_MARGINE, CL.CM.PRAG_STOP_FARA_PAS, "același prag ca în capul paginii"); assert.equal(CL.SB.PRAG_PE_MARGINE, 0.002);
  assert.equal(CL.CM.stopPeMargine(76.05, 76), true); assert.equal(CL.CM.stopPeMargine(75.9, 76), true); assert.equal(CL.CM.stopPeMargine(76.2, 76), false); assert.equal(CL.CM.stopPeMargine(null, 76), false); assert.equal(CL.CM.stopPeMargine(76, 0), false);
  const cu = (stop, pG, p, o) => stopL(botL("short", pG || 74, p || 74.5, { x: { lossStop: String(stop), lossStopType: "price" } }), o);
  const peste = cu(76.05, 74, 74.5, { cifre: true });
  assert.equal(peste.tag.t, "pe margine"); assert.equal(peste.tag.c, "warn"); assert.equal(peste.act, "Stopul e chiar pe marginea de sus: marginea atinsă închide botul; dincolo de ea, prețul propus e 76.5.");
  assert.match(peste.bani, /^💰 Atins pe margine: −\d+,\d USDT; la prețul propus: −\d+,\d USDT, dar acolo marginea atinsă nu mai închide botul\.$/); assert.ok(!/l-aș lăsa/i.test(peste.act + peste.bani));
  const sub = cu(75.9); assert.equal(sub.tag.t, "pe margine"); assert.match(sub.act, /^Stopul e chiar pe marginea de sus: marginea atinsă închide botul/);
  const cuZg = cu(76.05, 74, 74.5, { zgomot: { pret: 78.2, sursa: "21 de monede, 30 de zile" } }); assert.match(cuZg.act, /prețul propus e 78\.2\.$/, "același preț ca rândul din „Contează acum”");
  /* departe de margine rămâne ca înainte */
  const departe = cu(78); assert.equal(departe.tag.t, "pus"); assert.equal(departe.act, "L-aș lăsa: stopul stă peste gridul de sus."); assert.equal(departe.peMargine, undefined);
  const inGrid = cu(75); assert.equal(inGrid.tag.t, "stop în grid"); assert.match(inGrid.act, /stă în grid/);
  /* prețul deja dincolo de margine: nu mai e „prima atingere a marginii” */
  const afara = stopL(botL("short", 76, 76.3, { x: { lossStop: "76.12", lossStopType: "price" } })); assert.notEqual(afara.tag && afara.tag.t, "pe margine");
  const lung = stopL(botL("long", 67, 66.5, { x: { lossStop: "64.95", lossStopType: "price" } })); assert.equal(lung.tag.t, "pe margine"); assert.match(lung.act, /^Stopul e chiar pe marginea de jos: marginea atinsă închide botul; dincolo de ea, prețul propus e 64\.5\.$/);
  assert.ok(peste.act.length <= 110 && cuZg.act.length <= 110, "sfatul rămâne pe un rând");
  /* capul paginii folosește aceeași funcție */
  assert.match(LIBF("cap-margine.js"), /if \(stop !== null && !afara && stopPeMargine\(stop, niv\)\) \{/);
});

await test("L5 alerta „stopul e pe margine”: faptul (marginea atinsă închide botul) cu dovada scurtă din boții lui, fără judecată; o dată cât stă acolo; numele ei în registru", () => {
  const d = { stop: { cu: { afara: { n: 143, net: -5000, max: -200 }, rest: { n: 400, net: 900 }, laMargine: { n: 86, net: -3380.8 } }, fara: { afara: { n: 33, net: -100, max: -50 }, rest: { n: 300, net: 10 }, laMargine: { n: 0, net: 0 } } } };
  assert.equal(CL.CM.textDovadaStopMargineScurt(d), "din 143 de boți ai tăi cu stop închiși dincolo de margine, 86 îl aveau la cel mult 0,5% de ea", "spune exact ce numără: boții CU stop, pragul numărătorii, fără sumă");
  assert.equal(CL.CM.textDovadaStopMargineScurt({ stop: { cu: { afara: { n: 143 }, laMargine: { n: 4, net: -1 } } } }), "", "sub 5 boți pe margine: fără dovadă"); assert.equal(CL.CM.textDovadaStopMargineScurt(null), "");
  const m = MCh.stopPeMargine("PUMPFUN", "sus", "0.002499", -7.63, CL.CM.textDovadaStopMargineScurt(d));
  assert.equal(m.cheie, "stop-pe-margine"); assert.equal(m.nivel, "atentie"); assert.equal(m.titlu, "PUMPFUN: stopul e pe marginea de sus (la margine: −7,6 USDT)"); assert.ok(m.titlu.length <= 60);
  assert.equal(m.mesaj, "Prima atingere a marginii închide botul; din 143 de boți ai tăi cu stop închiși dincolo de margine, 86 îl aveau la cel mult 0,5% de ea.\n👉 Aș hotărî dacă îl las acolo sau îl mut dincolo de margine.");
  const [r1, r2] = m.mesaj.split("\n"); assert.ok(r1.length <= 160 && r2.length <= 110, r1.length + " / " + r2.length);
  const f = MCh.stopPeMargine("MARSCOINLUNG", "jos", "54.0000", null, "");
  assert.equal(f.titlu, "MARSCOINLUNG: stopul e pe marginea de jos"); assert.equal(f.mesaj.split("\n")[0], "Stopul (54.0000) e chiar pe marginea de jos: prima atingere a marginii închide botul.");
  assert.ok(MCh.stopPeMargine("UNNUMEFOARTELUNGDEMONEDA", "sus", "1.2", -123.4, "").titlu.length <= 60, "titlul lung renunță la sumă");
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /const CapMargine = incarca\("cap-margine\.js", "CapMargine"\);/);
  assert.match(col, /if \(stS > 0 && inGridS && CapMargine\.stopPeMargine\(stS, nivS\)\) \{\n          if \(!st\._stopMg\) \{/); assert.match(col, /if \(await trimiteAlerta\(mS, b\.id, mS\.cheie\)\) st\._stopMg = true;/, "marcat doar după trimiterea reușită");
  assert.match(col, /\} else if \(st\._stopMg && \(!\(stS > 0\) \|\| \(nivS > 0 && Math\.abs\(stS - nivS\) \/ nivS > 2 \* CapMargine\.PRAG_STOP_FARA_PAS\)\)\) st\._stopMg = false;/, "rearmată doar când stopul chiar pleacă de pe margine (sau e scos), nu când prețul iese din grid");
  assert.match(col, /inGridS = nivS > 0 && pS > 0 && \(parteS === "jos" \? pS > nivS : pS < nivS\)/, "doar cu prețul încă în grid");
  assert.match(col, /const stS = parteS && b\.opritorPierdereActiv \? Number\(TabloExtra\.pretStopLive\(b\)\) : null/, "prețul viu al stopului (și la cel pus în procente)");
  assert.match(LIBF("tablou-extra.js"), /"stop-pe-margine": "stopul pe margine"/);
  assert.match(citeste("scripts", "lib", "garda-alerte.mjs"), /co\("stop pe margine, cu dovada", "stopPeMargine", MC\.stopPeMargine\(/);
});

/* ---------- M (el 22.11: „repara tot”, după auditul independent al v100.377: 2 critice, 13 serioase, 19 sugestii) ---------- */
const TTm = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-proba-pierdere.mjs")).href);
const TMm = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-proba-margine.mjs")).href);
/* 70 de episoade limpezi pe 30 de zile (toate la fel de semn) - destule pentru un verdict */
const epM = (f) => { const out = []; for (let i = 0; i < 90; i++) { const z = i % 30; out.push({ id: "m" + i, t0: PMg.START_PIERDERE + z * 86400000 + i, zi: new Date(PMg.START_PIERDERE + z * 86400000).toISOString().slice(0, 10), d: f(i), dPct: f(i), nou: true, stop: false, dupa: {} }); } return out; };

await test("M1 🔴 verdictul NU se îngheață pe o arhivă venită pe jumătate; verdictul înghețat se ia din KV când starea s-a pierdut, iar fără KV citit tura nu îngheață", async () => {
  const boti = [botG({ id: "y", final: 2 })], drum = async () => ({ citit: true, brut: drumG([0, -1, 2]) });
  for (const [nume, tura] of [["pierdere", TTm.turaProbaPierdere], ["timp", TTm.turaProbaTimp], ["margine", TMm.turaProbaMargine]]) {
    /* arhiva pe jumătate (botiInchisiToti când arhiva pică: doar pagina Pionex, cu `complet = false`) */
    const lista = boti.slice(); lista.complet = false; const tr = [], st = { facute: {}, episoade: epM((i) => -8 + (i % 5)) };
    const r = await tura({ acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => lista, cereDrum: drum, trimite: async (c, x) => { tr.push(x); } }, st);
    assert.equal(r.partiala, true, nume); assert.equal(st.inghetat, undefined, nume + ": nimic înghețat pe lista scurtă"); assert.equal(tr.length, 0, nume + ": niciun bilanț trimis cu „rămași 0”"); assert.deepEqual(J(st.facute), {}, nume + ": niciun bot marcat");
    /* aceeași stare, arhiva întreagă: acum se îngheață */
    const st2 = { facute: {}, episoade: epM((i) => -8 + (i % 5)) }; await tura({ acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: drum, trimite: async () => {} }, st2);
    assert.equal(st2.inghetat && st2.inghetat.verdict, "inchiderea", nume + ": cu arhiva întreagă îngheață");
    /* starea de pe disc pierdută, dar KV-ul are verdictul înghețat (altul decât ar ieși acum) ⇒ rămâne cel din KV */
    const vechi = { la: 5, n: 70, zile: 22, medie: 4, suma: 300, ic: [2, 6], verdict: "lasatul", seContrazic: false }, tr3 = [], st3 = { facute: {}, episoade: epM((i) => -8 + (i % 5)) };
    await tura({ acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: drum, citesteInghetat: async () => vechi, trimite: async (c, x) => { if (/action=proba/.test(c)) tr3.push(x); } }, st3);
    assert.equal(st3.inghetat.verdict, "lasatul", nume + ": a doua privire nu înlocuiește verdictul"); assert.equal(st3.inghetat.la, 5); assert.equal(tr3[tr3.length - 1].verdict, "lasatul");
    /* KV-ul nu poate fi citit: tura asta nu îngheață nimic (nu știe dacă există deja un verdict) */
    const st4 = { facute: {}, episoade: epM((i) => -8 + (i % 5)) }; await tura({ acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: drum, citesteInghetat: async () => { throw new Error("rețea"); }, trimite: async () => {} }, st4);
    assert.equal(st4.inghetat, undefined, nume + ": fără KV citit, fără înghețare");
    /* KV-ul citit și gol: îngheață ca de obicei */
    const st5 = { facute: {}, episoade: epM((i) => -8 + (i % 5)) }; await tura({ acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: drum, citesteInghetat: async () => null, trimite: async () => {} }, st5);
    assert.equal(st5.inghetat.verdict, "inchiderea", nume);
  }
  /* colectorul dă celor trei ture arhiva COMPLETĂ (aruncă dacă n-a venit), drumul citit o dată și verdictul din KV */
  const col = citeste("scripts", "colector.mjs");
  for (const [m, a] of [["turaProbaMargineModul", "probaMargine"], ["turaProbaPierdereModul", "probaPierdere"], ["turaProbaTimpModul", "probaTimp"]])
    assert.ok(col.includes(`${m}({ acum: Date.now(), botiInchisi: botiInchisiCompleti, cereDrum: cereDrumInchis, citesteInghetat: () => inghetatDinKv("${a}"), trimite, jurnal }`), m);
  assert.ok(!/turaProba(Margine|Pierdere|Timp)Modul\(\{[^}]*botiInchisiToti/.test(col), "nicio probă pe drumuri nu mai primește lista care poate fi pe jumătate");
  assert.match(col, /\.then\(\(r\) => \{ if \(!\(r && r\.citit !== false && Array\.isArray\(r\.brut\)\)\) scoate\(\); return r; \}/, "se țin doar drumurile citite cu adevărat"); assert.match(col, /if \(drumuriInchise\.size >= 40\) drumuriInchise\.clear\(\);/);
});

await test("M2 🟡 serverul nu înlocuiește un verdict deja înghețat (a doua privire), la niciuna din cele trei probe", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "m2");
  const Hd = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  const post = (a, corp) => mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: Hd, body: JSON.stringify(corp) }), env });
  const get = async (a) => (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { headers: Hd }), env })).json();
  const ing = (v, la, n) => ({ la, n, zile: 25, medie: -4, suma: -300, ic: [-6, -2], verdict: v, seContrazic: false });
  const bil = (g, n) => Object.assign(PMg.bilant([], { coada: 0.0025 }), { la: Date.now() - 1000, n, zile: 30, medie: -4, suma: -300, ic: [-6, -2], prag: 0.05, coada: 0.0025, ore: 4, verdict: g ? g.verdict : null, inghetat: g, boti: { total: 9, judecati: 9, ramasi: 0, episoade: n } });
  for (const a of ["probaMargine", "probaPierdere", "probaTimp"]) {
    assert.equal((await post(a, bil(null, 40))).status, 200); assert.equal((await get(a))[a].inghetat, null);
    assert.equal((await post(a, bil(ing("inchiderea", 1000, 70), 70))).status, 200); assert.equal((await get(a))[a].verdict, "inchiderea");
    /* tura și-a pierdut starea și trimite ALT verdict, înghețat mai târziu */
    assert.equal((await post(a, bil(ing("lasatul", 9000, 130), 130))).status, 200);
    const j = (await get(a))[a]; assert.equal(j.verdict, "inchiderea", a + ": rămâne primul"); assert.equal(j.inghetat.la, 1000); assert.equal(j.inghetat.n, 70); assert.equal(j.n, 130, "numărătoarea merge mai departe");
    /* nici un bilanț fără verdict nu-l șterge */
    assert.equal((await post(a, bil(null, 131))).status, 200); assert.equal((await get(a))[a].verdict, "inchiderea");
  }
});

await test("M3 🟡 botul închis chiar la clipa regulii e aceeași faptă: diferența e zero (nu comisionul pe poziția maximă); 🔵 drumul întrerupt e „cu goluri”, nu „scurt” / „fără minus”", () => {
  assert.equal(PMg.LA_REGULA_MIN, 5);
  /* pierderea: pragul la minutul 2 (−6 la suma 100); botul închis la minutul 5 (3 minute după) ⇒ aceeași faptă */
  const laR = PMg.episodPierdere(botG({ id: "r1", final: -6.1, durMin: 5 }), drumG([0, -2, -6, -6.05, -6.1]));
  assert.equal(laR.laRegula, true); assert.equal(laR.d, 0); assert.equal(laR.dPct, 0); aproape(laR.laPrag, -6);
  const dupa = PMg.episodPierdere(botG({ id: "r2", final: -6.2, durMin: 9 }), drumG([0, -2, -6, -6.1, -6.2, -6.2, -6.2, -6.2, -6.2]));
  assert.equal(dupa.laRegula, false); aproape(dupa.d, -6.2 - (-6 - 100 * 3 * 0.0005), "la 7 minute după prag e altă faptă: diferența obișnuită");
  /* timpul: punctul regulii la 4 h 05; botul închis la 4 h 08 ⇒ zero */
  const v = []; for (let i = 0; i < 49; i++) v.push(1); v.push(-1); v.push(-1.2);
  const tR = PMg.episodTimp(botG({ id: "r3", final: -1.1, durMin: 248 }), drumG(v, 5)); assert.equal(tR.laRegula, true); assert.equal(tR.d, 0);
  const tD = PMg.episodTimp(botG({ id: "r4", final: -9, durMin: 600 }), drumG(v.concat(new Array(60).fill(-5)), 5)); assert.equal(tD.laRegula, false); aproape(tD.d, -9 - (-1 - 0.15));
  /* ascultând regula de fiecare dată, proba nu mai scoate „lăsatul a fost mai bun” din comision */
  const E66 = []; for (let i = 0; i < 66; i++) { const e = PMg.episodTimp(botG({ id: "a" + i, final: -1.1, durMin: 248 }), drumG(v, 5)); E66.push(Object.assign({}, e, { id: "a" + i, t0: PMg.START_TIMP + (i % 22) * 86400000 + i, zi: new Date(PMg.START_TIMP + (i % 22) * 86400000).toISOString().slice(0, 10), nou: true, stop: false })); }
  const b66 = PMg.bilant(E66, { coada: PMg.COADA_TIMP }); assert.equal(b66.medie, 0); assert.notEqual(b66.verdict, "lasatul"); assert.notEqual(b66.verdict, "inchiderea");
  /* tura ține semnul pe episod */
  assert.match(citeste("scripts", "lib", "tura-proba-pierdere.mjs"), /nou: e\.nou, laRegula: e\.laRegula === true, dupa: e\.dupa/);
  /* etichete: botul a trăit 30 de ore, dar drumul lui se oprește la 3 ore ⇒ nu se știe ce a fost */
  assert.deepEqual(J(PMg.episodTimp(botG({ id: "g1", final: -4, durMin: 1800 }), drumG(new Array(36).fill(1), 5))), { id: "g1", fara: "gol" });
  assert.deepEqual(J(PMg.episodTimp(botG({ id: "g2", final: -4, durMin: 100 }), drumG(new Array(20).fill(1), 5))), { id: "g2", fara: "scurt" }, "închis cu adevărat înainte de 4 ore");
  /* niciun punct între 4 și 24 de ore (un gol cât toată fereastra), apoi puncte după 24 de ore */
  const cuGolMare = drumG(new Array(40).fill(1), 5).concat(drumG(new Array(10).fill(-3), 5, T0g + 25 * 3600000));
  assert.deepEqual(J(PMg.episodTimp(botG({ id: "g3", final: -3, durMin: 1600 }), cuGolMare)), { id: "g3", fara: "gol" }, "fără puncte în fereastră nu se poate spune „n-a fost pe minus”");
});

await test("M4 🔵 citirile picate: pauză și după eșec, iar după trei la rând tura se oprește (60 de cereri plecau una după alta spre un server bolnav)", async () => {
  assert.equal(TTm.MAX_ESECURI, 3);
  const boti = []; for (let i = 0; i < 10; i++) boti.push(botG({ id: "e" + i, final: 1 }));
  let cereri = 0; const jr = [], st = {};
  const r = await TTm.turaProbaPierdere({ acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: async () => { cereri++; throw new Error("429"); }, trimite: async () => {}, jurnal: (...a) => jr.push(a.join(" ")) }, st);
  assert.equal(cereri, 3, "se oprește după trei"); assert.equal(r.judecati, 0); assert.deepEqual(J(st.facute), {}, "niciun bot marcat „făcut”"); assert.ok(jr.some((x) => /3 citiri picate la rând/.test(x)));
  /* un eșec între reușite nu oprește tura */
  let k = 0; const st2 = {}; const r2 = await TTm.turaProbaPierdere({ acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: async () => { k++; if (k % 3 === 0) return { citit: false }; return { citit: true, brut: drumG([0, 1, 2]) }; }, trimite: async () => {} }, st2);
  assert.equal(k, 10); assert.equal(r2.judecati, 7); assert.equal(r2.ramasi, 3);
  const src = citeste("scripts", "lib", "tura-proba-pierdere.mjs"); assert.match(src, /if \(\+\+esecuri >= MAX_ESECURI\) \{[^}]*break; \} await asteapta\(\); continue; \}\n    esecuri = 0;/);
});

await test("M5 🟡 alerta de 4 ore spune „pierderea crește cu vârsta, câștigul nu” doar când raportul o arată; plata: zero nu e pierdere, lipsa nu e număr, rândul vârstei atinse și când toți au ieșit pe aceeași parte", () => {
  const rand = (h, n, c, p) => ({ h, n, pePlus: 0.6, castig: c, pierdere: p, trebuie: c !== null && p !== null ? p / (c + p) : null, net: -10 });
  const creste = { tot: rand(0, 2000, 0.032, 0.07), varste: [rand(1, 800, 0.031, 0.112), rand(4, 430, 0.031, 0.143), rand(24, 90, 0.033, 0.268)] };
  const pc = J(RL.plataCreste(creste)); assert.equal(pc.creste, true); assert.equal(pc.peLoc, true);
  const invers = { tot: rand(0, 2000, 0.06, 0.125), varste: [rand(1, 800, 0.07, 0.10), rand(4, 200, 0.09, 0.05), rand(24, 90, 0.10, 0.04)] };
  assert.equal(RL.plataCreste(invers).creste, false, "pierderea scade cu vârsta: fraza nu se spune");
  const zigzag = { tot: rand(0, 2000, 0.03, 0.07), varste: [rand(1, 800, 0.03, 0.15), rand(4, 200, 0.03, 0.09), rand(24, 90, 0.03, 0.20)] };
  assert.equal(RL.plataCreste(zigzag).creste, false, "−15% / −9% / −20% nu e „crește cu vârsta”");
  assert.equal(RL.plataCreste(null), null); assert.equal(RL.plataCreste({ tot: rand(0, 50, 0.03, null), varste: [] }), null);
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /const pc4 = t4 && RiscLuna\.plataCreste \? RiscLuna\.plataCreste\(rp4\.boti\.plata\) : null;/);
  /* plata: un bot pe zero și unul fără rezultat */
  const p = RL.plata([{ r: 0.02, inv: 100 }, { r: -0.04, inv: 100 }, { r: 0, inv: 100 }, { r: null, inv: 100 }, { r: NaN, inv: 100 }]);
  assert.equal(p.n, 3, "zero se numără, null și NaN nu"); aproape(p.pePlus, 1 / 3); aproape(p.castig, 0.02); aproape(p.pierdere, 0.04, "zero nu trage pierderea medie în jos"); aproape(p.net, -2);
  /* rândul vârstei atinse, cu toți pe minus (24 de boți): nu se mai coboară la o vârstă mai mică */
  const toti = { tot: rand(0, 2000, 0.03, 0.07), varste: [rand(0.25, 1200, 0.03, 0.087), Object.assign(rand(4, 24, null, 0.3), { pePlus: 0 })] };
  assert.equal(RL.textPlataScurt(toti, 5), "Din boții tăi ajunși la 4 h (24), niciunul n-a ieșit pe plus; au pierdut în medie −30,0% din sumă.");
  assert.equal(RL.textPlata(toti, 5, 80), "Din boții tăi care au ajuns la 4 h (24): niciunul n-a ieșit pe plus; au pierdut în medie −30,0% din sumă.");
  /* concluzia: boții de la 4 h au pierdut mai mult decât toată pierderea (ceilalți au ieșit pe plus) */
  const PL2 = JSON.parse(JSON.stringify(PL)); PL2.varste.find((x) => x.h === 4).net = PL2.tot.net * 1.3;
  const cz = J(RL.concluzii({ boti: { n: 1985, plata: PL2, desc: { durate: [] }, ritm: { S: 80 } } }).boti).find((q) => /^Pierderea medie/.test(q.titlu));
  if (cz) { assert.match(cz.text, /au făcut mai mult decât toată pierderea \(ceilalți, la un loc, au ieșit pe plus\)\./); assert.ok(!/130%/.test(cz.text)); }
  /* tabelul paginii: „peste 100%”, nu „130%” */
  const cE = vm.createContext({ console, Math, JSON, Number, String, Array, Object, isFinite, TextRo: globalThis.TextRo }); vm.runInContext(LIBF("risc-ecran.js"), cE);
  const h = vm.runInContext("rlPlata", cE)(PL2, "USDT"); assert.ok(h.includes("· peste 100%</td>")); assert.ok(!/· 13\d%</.test(h)); assert.ok(h.includes("„peste 100%” = ceilalți boți, la un loc, au ieșit pe plus"));
});

await test("M6 🟡 cartela nu mai propune un stop ÎN gridul botului (stopul fișei ține de gridul ei); fără lichidarea citită curba nu împinge nimic; rândul nu arată o șansă mai mare la stopul mai departe; sursa curbei nu se inventează", () => {
  const b = botL("short", 74, 74.5, { x: { lossStop: "76.05", lossStopType: "price" } });   /* grid 65–76, stopul pe margine */
  const cuFisa = (stopSus) => { const conc = CL.SB.acumConcret({ bot: b, fisa: { setare: { jos: 70, sus: 74.6, grile: 10, pas: 0.005, stop: { sus: stopSus, jos: 69 } } }, zero: CL.TE.dacaInchizi(b), costuri: CL.TE.grileVsCosturi(b, ACUML), plan: null, acum: ACUML }); return J(conc.filter((q) => q.cod === "stop")[0]); };
  const inGrid = cuFisa(74.8); aproape(inGrid.pretPropus, 76.5, "stopul fișei (74,8) e în gridul botului ⇒ o grilă peste margine, ca fără fișă"); assert.ok(!/74\.8/.test(inGrid.act + " " + inGrid.text), "prețul din grid nu apare nicăieri: " + inGrid.act);
  assert.match(inGrid.act, /dincolo de ea, prețul propus e 76\.5\.$/);
  aproape(cuFisa(77.4).pretPropus, 77.4, "stopul fișei dincolo de marginea botului se ia, ca până acum");
  const bl = botL("long", 67, 66.5, { x: { lossStop: "64.95", lossStopType: "price" } });
  const lung = J(CL.SB.acumConcret({ bot: bl, fisa: { setare: { jos: 66, sus: 70, grile: 8, pas: 0.005, stop: { sus: 71, jos: 65.6 } } }, zero: CL.TE.dacaInchizi(bl), costuri: CL.TE.grileVsCosturi(bl, ACUML), plan: null, acum: ACUML }).filter((q) => q.cod === "stop")[0]);
  aproape(lung.pretPropus, 64.5, "oglinda la long: 65,6 e în gridul 65–76");
  /* lichidarea necitită: prețul zgomotului nu se ia (nu se poate verifica) */
  const faraLich = JSON.parse(JSON.stringify(botL("short", 74, 74.5, { x: { lossStop: "78", lossStopType: "price" } }))); faraLich.pretLichidare = null;
  aproape(stopL(faraLich, { zgomot: { pret: 99 } }).pretPropus, 76.5, "fără lichidare citită: rămâne protecția de până acum");
  /* șansa de la stopul mutat mai departe nu poate fi mai mare decât a celui de acum (a cărui cifră poate fi plafonată la șansa marginii) */
  const s = functie(APP, "tbStopSansa");
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, CurbaStop: CL.CS, TabloExtra: null,
    Probabilitati: { randuri: () => [{ cod: "iese-sus-24", p: 0.3 }] }, botiNr: (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v)),
    tbCurbaPt: () => Object.assign({}, CURBA, { la: Date.now() - 3600000 }), tbProbVechi: () => null, pvPretViuAcum: () => 74.5, tbProb: { botId: "b1" }, tbProbPt: () => ({ rez: { atr1h: 1 }, cal: null }),   /* ATR 1: stopul la 1,6 ATR (curba ~62%), prețul cartelei la 2,1 ATR (curba ~49%) */
    tbStare: { bot: { id: "b1" }, consLinii: { bot: "b1", stopPlan: 76.6 } } });
  vm.runInContext(s, c); c.b = { id: "b1", opritorPierdereActiv: true, opritorPierdere: 76.1, directie: "short", pretCurent: 74.5, gridJos: 65, gridSus: 76 };
  const r = J(vm.runInContext("tbStopSansa(b)", c));
  aproape(r.p24, 0.3, "stopul de acum, dincolo de margine: plafonat la șansa marginii"); assert.equal(r.plafon, "sus"); aproape(r.mut20, 76.6); aproape(r.mutP24, 0.3, "curba dădea ~49% la prețul cartelei, peste cifra (plafonată) a stopului de acum: se plafonează și ea");
  /* sursa: lipsa rămâne lipsă */
  const zg = functie(APP, "tbStopZgomot"); assert.match(zg, /sursa:\(z\.perechi>0\?TextRo\.cate\(z\.perechi,"monedă","monede"\):"monedele mari"\)\+\(z\.zile>0\?", "\+TextRo\.cate\(z\.zile,"zi","zile"\):""\)/); assert.ok(!/:21,|:30,/.test(zg));
  assert.match(citeste("scripts", "colector.mjs"), /sursa: \(z\.perechi > 0 \? cate\(z\.perechi, "monedă", "monede"\) : "monedele mari"\) \+ \(z\.zile > 0 \? ", " \+ cate\(z\.zile, "zi", "zile"\) : ""\)/);
});

await test("M7 🔴 oprirea serverului copiei: procesele = cele cu starea copiei în linie + URMAȘII lor (cele două workerd n-au `--persist-to`); un PID refolosit sau alt program nu trece drept copil; „oprit” doar când chiar nu mai sunt", () => {
  const dest = "C:\\Users\\Cimin\\crypto-lucru-idei377", st = dest + "\\.wrangler\\state";
  /* liniile de comandă adevărate ale serverului copiei, citite pe 22.11 (PID-uri și ordinea pornirii păstrate) */
  const P = [
    { pid: 1668, ppid: 14584, creat: 100, nume: "cmd.exe", linie: `C:\\WINDOWS\\system32\\cmd.exe /d /s /c "npx wrangler@4.137.0 dev --config radar-local.toml --env-file .dev.vars --no-bundle --port 8788 --ip 127.0.0.1 --persist-to "${st}" --compatibility-date=2026-01-01 > "${dest}\\.wrangler\\server-copie.log" 2>&1"` },
    { pid: 16664, ppid: 1668, creat: 101, nume: "node.exe", linie: `"C:\\Program Files\\nodejs\\node.exe" "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js" wrangler@4.137.0 dev --config radar-local.toml --env-file .dev.vars --no-bundle --port 8788 --ip 127.0.0.1 --persist-to ${st} --compatibility-date=2026-01-01` },
    { pid: 18320, ppid: 16664, creat: 102, nume: "cmd.exe", linie: `C:\\WINDOWS\\system32\\cmd.exe /d /s /c wrangler dev --config radar-local.toml --env-file .dev.vars --no-bundle --port 8788 --ip 127.0.0.1 --persist-to ${st} --compatibility-date=2026-01-01` },
    { pid: 15316, ppid: 18320, creat: 103, nume: "node.exe", linie: `"node" "C:\\Users\\Cimin\\AppData\\Local\\npm-cache\\_npx\\23be\\node_modules\\.bin\\..\\wrangler\\bin\\wrangler.js" dev --config radar-local.toml --no-bundle --port 8788 --persist-to ${st}` },
    { pid: 17228, ppid: 15316, creat: 104, nume: "node.exe", linie: `"C:\\Program Files\\nodejs\\node.exe" --no-warnings C:\\Users\\Cimin\\AppData\\Local\\npm-cache\\_npx\\23be\\node_modules\\wrangler\\wrangler-dist\\cli.js dev --config radar-local.toml --port 8788 --persist-to ${st}` },
    { pid: 14776, ppid: 17228, creat: 105, nume: "workerd.exe", linie: "C:\\Users\\Cimin\\AppData\\Local\\npm-cache\\_npx\\23be\\node_modules\\@cloudflare\\workerd-windows-64\\bin\\workerd.exe serve --binary --experimental --socket-addr=entry=127.0.0.1:8788 --external-addr=loopback=127.0.0.1:9574 --control-fd=3 -" },
    { pid: 5272, ppid: 17228, creat: 106, nume: "workerd.exe", linie: "C:\\Users\\Cimin\\AppData\\Local\\npm-cache\\_npx\\23be\\node_modules\\@cloudflare\\workerd-windows-64\\bin\\workerd.exe serve --binary --experimental --socket-addr=entry=127.0.0.1:0 --inspector-addr=127.0.0.1:9580" },
    /* ce NU e al copiei */
    { pid: 9001, ppid: 9000, creat: 50, nume: "workerd.exe", linie: "C:\\x\\workerd.exe serve --binary --socket-addr=entry=127.0.0.1:8789" },                 /* workerd-ul altui server */
    { pid: 9002, ppid: 17228, creat: 90, nume: "workerd.exe", linie: "C:\\x\\workerd.exe serve" },                                                       /* PID-ul părintelui refolosit: „copilul” e mai VECHI decât părintele */
    { pid: 9003, ppid: 17228, creat: 110, nume: "powershell.exe", linie: "powershell -NoProfile -Command Get-Content jurnal.log -Wait" },                 /* alt program pornit de server: nu se oprește */
    { pid: 9004, ppid: 1, creat: 60, nume: "node.exe", linie: `node wrangler.js dev --port 8788 --persist-to C:\\Users\\Cimin\\crypto\\.wrangler\\state` }, /* serverul principalului */
  ];
  const a = L.arboreServer(P, dest).map((x) => x.pid).sort((x, y) => x - y);
  assert.deepEqual(a, [1668, 5272, 14776, 15316, 16664, 17228, 18320], "cele 5 cu starea copiei + cele 2 workerd");
  assert.equal(L.eServerulCopiei(P[5].linie, dest), false, "premisa găurii: workerd-ul de pe 8788 nu poartă semnul în linie");
  assert.deepEqual(L.arboreServer(P, "C:\\Users\\Cimin\\crypto-lucru-alta"), [], "altă copie: nimic"); assert.deepEqual(L.arboreServer([], dest), []); assert.deepEqual(L.arboreServer(null, dest), []);
  /* orfanul: workerd care ascultă pe 8788 și nu mai are părinte - se arată, nu se oprește */
  assert.deepEqual(L.orfanPe8788(P), [], "cu părinții în viață nu e niciun orfan"); assert.deepEqual(L.orfanPe8788(P.filter((x) => x.pid !== 17228)), [14776], "doar cel de pe 8788, nu și cel cu baza KV sau cel de pe 8789");
  const c = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(c, /const vii = viiDin\(pids\);\n  if \(vii\.length\) \{ scrie\(`⚠ au rămas \$\{vii\.length\} procese ale serverului copiei[^\n]*return -1; \}/, "„oprit” se spune doar după ce procesele adunate ÎNAINTE nu mai sunt");
  assert.ok(c.indexOf("const vii = viiDin(pids);") < c.indexOf('scrie("Serverul copiei e oprit."'));
  assert.match(c, /if \(opresteServerulCopiei\(dest, nume\) < 0\) \{ scrie\(`Serverul copiei \$\{nume\} nu s-a oprit — nu șterg copia\./, "curățarea nu atinge copia cu serverul neoprit");
  assert.match(c, /if \(process\.platform !== "win32" \|\| process\.env\.COPIE_FARA_SERVER\) return \[\];\n  return arboreServer\(toateProcesele\(\), dest, process\.pid\);/, "probele uneltei nu caută procese adevărate");
});

await test("M8 🟡 rândul „REZULTAT” avertizează când colectorul a rămas pe codul vechi; poarta compară și FIȘIERELE servite, nu doar numărul versiunii; proba uneltei e în lanț", async () => {
  assert.equal(L.textRezultat({ publicat: "abc1234", adus: true, avert: ["colectorul n-a fost repornit de aici: rulează pe codul vechi până la livrarea de pe VPS (sau până îl repornești)"] }),
    "REZULTAT: PUBLICAT abc1234 pe origin/main · principalul adus · 1 avertisment: (1) colectorul n-a fost repornit de aici: rulează pe codul vechi până la livrarea de pe VPS (sau până îl repornești).");
  assert.equal(L.textRezultat({ publicat: "(commitul nu s-a putut citi)", adus: false, avert: [] }).startsWith("REZULTAT: PUBLICAT (commitul nu s-a putut citi)"), true, "push reușit cu rev-parse gol nu mai iese „NIMIC publicat”");
  /* poarta: serverul cu aceeași versiune, dar alte fișiere */
  const fals = async (u) => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode("alt cod " + u).buffer });
  const adevarat = async (u) => { const n = String(u).replace(/^https?:\/\/[^/]+\//, ""); return { ok: true, arrayBuffer: async () => { const b = fs.readFileSync(path.join(RAD, "public", n)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } }; };
  assert.equal(await P.servesteAcestDepozit(RAD, "http://exemplu.test", fals), false); assert.equal(await P.servesteAcestDepozit(RAD, "http://exemplu.test", adevarat), true);
  assert.equal(await P.servesteAcestDepozit(RAD, "http://exemplu.test", async () => { throw new Error("oprit"); }), false);
  assert.match(P.textSarit("alte-fisiere", { depozit: "v100.377", rad: "C:\\x\\crypto-lucru-idei377" }), /^\[pre-push\] probele de ecran: sărite - serverul de pe 8788 are aceeași versiune \(v100\.377\), dar servește ALTE fișiere decât depozitul din care împingi \(altă copie\?\) ⇒ probele de ecran NU au rulat\. Pornește serverul: node scripts\/copie-de-lucru\.mjs server idei377/);
  const g = citeste("scripts", "inainte-de-push.mjs"), iV = g.indexOf('textSarit("alta-versiune"'), iF = g.indexOf('if (!(await servesteAcestDepozit(RAD))) { console.log(textSarit("alte-fisiere"'), iP = g.indexOf("for (const p of probeDeEcran(process.env)) {");
  assert.ok(iV > 0 && iF > iV && iP > iF, "întâi versiunea, apoi fișierele, abia apoi probele");
  const pk = JSON.parse(citeste("package.json")); assert.equal(pk.scripts["test:copie"], "node scripts/proba-copie-de-lucru.mjs"); assert.ok(pk.scripts.test.startsWith("npm run test:copie && npm run test:lant-01 && "), "prima în lanț: probele v100.313 și v100.376 țin forma sfârșitului (versiunile, tiparele, rândul de stare)");
});

await test("M9 🟡 cutia: „nicio alarmă” nu mai stă ca „nimic nu pune bani în joc” deasupra unui sfat cu bani; 🔵 butonul deschide rândul, pliul își ține starea, costul 0 nu se scrie, miile au punct, suma obișnuită e spusă", () => {
  const c = vm.createContext({ console, Math, JSON, String, Array, Object, RegExp }); vm.runInContext(functie(APP, "tbCutieFaraAlarma"), c);
  const F = (h) => { c.h = h; return vm.runInContext("tbCutieFaraAlarma(h)", c); };
  const gol = CL.CT.gol("16:09"); assert.match(gol, /<p class="ctGol">Nimic nu pune bani în joc acum · verificat la 16:09<\/p>$/, "premisa: marcajul stării goale");
  const nou = F(gol); assert.ok(!/ctGol/.test(nou)); assert.ok(!/Nimic nu pune bani în joc/.test(nou)); assert.match(nou, /<p class="ctNimic">Nicio alarmă în lista de azi · verificat la 16:09 · sfaturile Consilierului sunt mai jos<\/p>$/);
  assert.match(F(CL.CT.gol("")), /<p class="ctNimic">Nicio alarmă în lista de azi · sfaturile Consilierului sunt mai jos<\/p>$/);
  assert.equal(F('<div class="ctCap"></div><div class="ctRand">x</div>'), '<div class="ctCap"></div><div class="ctRand">x</div>', "cu rânduri în listă: neatinsă");
  assert.ok(!/ctGol/.test(F('<p class="ctGol"><b>altă formă</b></p>')), "și dacă marcajul se schimbă, clasa stării goale dispare (altfel cutia ar lua așezarea de bandă subțire)");
  const ren = functie(APP, "tbRenderConteaza"); assert.match(ren, /var pliuD=!!\(el\.querySelector&&el\.querySelector\("details\.ctInCap\[open\]"\)\);/); assert.match(ren, /var scris=tbStare\.ctHtml!==h;if\(tbStare\.ctHtml!==h\)\{el\.innerHTML=h;tbStare\.ctHtml=h\}if\(scris&&pliuD&&el\.querySelector\)\{var pl0=el\.querySelector\("details\.ctInCap"\);if\(pl0\)pl0\.open=true\}/);
  /* butonul „amănuntele, în Riscul” deschide rândul */
  const deschise = [], cs = vm.createContext({ console, Object, TB_RANDURI: { tbConcret: "x", tbTodo: "y" }, tbRandComuta: (id, d) => deschise.push([id, d]), matchMedia: () => ({ matches: true }), $: () => ({ scrollIntoView: () => deschise.push("sarit") }) });
  vm.runInContext(functie(APP, "tbSariLa"), cs);
  vm.runInContext("tbSariLa('risc','tbConcret')", cs); assert.deepEqual(J(deschise), [["tbConcret", true], "sarit"]);
  deschise.length = 0; vm.runInContext("tbSariLa('risc')", cs); assert.deepEqual(J(deschise), ["sarit"], "fără al doilea argument: ca până acum");
  deschise.length = 0; vm.runInContext("tbSariLa('risc','altceva')", cs); assert.deepEqual(J(deschise), ["sarit"], "un rând necunoscut nu se deschide");
  /* costul dus-întors */
  const cg = vm.createContext({ console, Math, JSON, Number, String, Array, Object, isFinite, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s), rlStare: { raport: null } });
  vm.runInContext(functie(APP, "grDusIntorsText") + "\n" + functie(APP, "grDovadaScurti"), cg);
  const T = (d) => { cg.d = d; return vm.runInContext("grDusIntorsText(d)", cg); };
  assert.equal(T({ intrare: 0, cost: 0, dinSuma: 0, perechi: 0 }), "", "fără cost: rândul lipsește, nu „≈ −0,0 USDT”");
  assert.equal(T({ intrare: 617.3, cost: 1234.56, dinSuma: 0.0123, perechi: 300 }), "≈ −1.234,6 USDT · 1,2% din sumă · ~300 de perechi de grile îl acoperă");
  assert.match(functie(APP, "grPlanVarHtml"), /var tx=di&&typeof grDusIntorsText==="function"\?grDusIntorsText\(di\):"";return tx\?grRand\("Cost dus-întors",tx,null\):""/);
  cg.rlStare.raport = { boti: { ritm: { S: 201.94 }, desc: { durate: [{ de: 0, pana: 0.25, n: 734, laS: -799.6, comisionLaS: -821.1, pePlus: 0.504 }] } } };
  assert.equal(vm.runInContext("grDovadaScurti()", cg), "Boții tăi ținuți sub 15 minute (734): 50% pe plus, la suma ta obișnuită (~201,9 USDT pe bot) −799,6 USDT în total, din care comisioane −821,1.");
  assert.equal(c.GridPlanAbsent, undefined);
  const cgp = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, TextRo: globalThis.TextRo }); cgp.globalThis = cgp; cgp.window = cgp;
  for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js"]) vm.runInContext(LIBF(f), cgp, { filename: f });
  cgp.x = { dir: "neutru", pret: 100, jos: 90, sus: 110, suma: 100, levier: 3, perOrdin: 15, profitGrila: 0.006 }; assert.equal(vm.runInContext("GridPlan.dusIntors(x)", cgp), null, "direcție necunoscută = lipsă, nu „cost 0”");
  /* procentul minuscul */
  const cp = vm.createContext({ console, Math, Number, String, TextRo: globalThis.TextRo }); vm.runInContext(functie(APP, "pctTextRo"), cp);
  assert.equal(vm.runInContext("pctTextRo(0.0002)", cp), "sub 0,001%"); assert.equal(vm.runInContext("pctTextRo(-0.0002)", cp), "sub 0,001%"); assert.equal(vm.runInContext("pctTextRo(1.04)", cp), "+1,0%"); assert.equal(vm.runInContext("pctTextRo(0)", cp), "+0,0%");
  assert.ok(!citeste("public", "app.css").includes(".ctCap+.ctConcret"), "regula care nu se potrivea niciodată e scoasă");
});

await test("M10 🟡 alerta „stopul e pe margine”: prețul fără notație științifică, rearmată doar când stopul pleacă de pe margine; proba cu browserul măsoară cerințele lui; simularea pentru două reguli își poartă rezultatele și hotărârea", () => {
  const col = citeste("scripts", "colector.mjs");
  const cv = vm.createContext({ console, Math, Number, String }); vm.runInContext(functie(col, "pretAlerta"), cv);
  const PA = (v) => { cv.v = v; return vm.runInContext("pretAlerta(v)", cv); };
  assert.equal(PA(0.000000812346), "0.000000812346"); assert.ok(!/e-/.test(PA(0.0000000000812346))); assert.equal(PA(0.002499), "0.002499"); assert.equal(PA(54), "54"); assert.equal(PA(76.05), "76.05"); assert.equal(PA(61234.5678), "61234.6"); assert.equal(PA(0), "?"); assert.equal(PA(null), "?");
  assert.match(col, /pretAlerta\(stS\), Number\.isFinite\(laS\) \? laS : null, dvS\);/);
  /* proba cu browserul: pasul D12i există și se uită la cele trei sfaturi și la locul Trendului, la șase lățimi */
  const pe = citeste("scripts", "proba-ecran-tablou.mjs"), i = pe.indexOf('await test("D12i.'); assert.ok(i > 0);
  const pas = pe.slice(i, pe.indexOf("\n    });", i));
  assert.match(pas, /for \(const lat of \[390, 768, 1280, 1440, 1920, 2560\]\)/); assert.match(pas, /assert\.deepEqual\(r\.sfaturi\.map\(\(x\) => x\.cod\), \["stop", "grid", "miscare"\]/);
  assert.match(pas, /assert\.ok\(r\.trend\.sus >= r\.grafic\.jos - 2,/); assert.match(pas, /assert\.ok\(r\.decizia && r\.trend\.jos <= r\.decizia\.sus \+ 2,/); assert.match(pas, /assert\.equal\(r\.gol, false,/);
  assert.match(pe, /Conteaza\.html\(\$\{JSON\.stringify\(RANDURI\)\}, escapeHtml\) \+ \(typeof tbConcretSusHtml === "function" && tbStare\.bot \? tbConcretSusHtml\(tbStare\.bot\) : ""\)/, "pasul D12g măsoară cutia cu sfaturile în ea, ca pe pagină");
  /* simularea: a doua variantă, cu oprirea la primul prag, cu rezultatele și hotărârea scrise */
  const sim = citeste("scripts", "sim-h0-v100377-doua-reguli.mjs");
  assert.match(sim, /if \(E\[k\]\.length >= MIN_EPISOADE && zile\[k\]\.size >= MIN_ZILE\) V\[k\] = \{ v: bilant\(E\[k\], \{ coada,/, "fiecare regulă e oprită la primul prag, ca tura");
  assert.match(sim, /u = o\.ar \? o\.ar \* u \+ Math\.sqrt\(1 - o\.ar \* o\.ar\) \* g\(\) : g\(\);/, "și cu zile legate");
  assert.match(sim, /\/\/ REZULTATELE \(22\.11\.2026, a doua variantă/); assert.match(sim, /HOTĂRÂREA[^\n]*99,5%/); assert.match(sim, /Prima variantă[^\n]*„0,3–3,7%”/);
  for (const d of ["2026-11-22-v100377-proba-pierderii.md", "2026-11-22-v100377-proba-timpului.md"]) { const t = citeste("docs", "cercetare", d);
    for (const x of ["Amendamentul din 22.11.2026, 16:32", "99,5%", "COADA_PIERDERE = COADA_TIMP = 0,0025", "pe jumătate", "aceeași faptă", "DOAR la\n   numărătoare", "împinsă spre „lăsatul a fost mai bun”"]) assert.ok(t.includes(x), d + " spune: " + x); }
});

/* ---------- N (22.11, revizia independentă a REPARAȚIILOR: 1 critică, 3 serioase, 9 sugestii) ---------- */
await test("N1 🔴 arhiva „venită” = listă nevidă, cu data ei, citită și întreagă: răspunsul 200 cu lista goală (cheia necitită sau lipsă) nu mai trece drept arhivă", async () => {
  const col = citeste("scripts", "colector.mjs");
  const pionex = { bots: Array.from({ length: 10 }, (_, i) => ({ id: "p" + i, brut: { strategyId: "p" + i } })) }, lista = (n) => Array.from({ length: n }, (_, i) => ({ strategyId: "a" + i }));
  const rul = async (arh, pica) => { const jr = [], c = vm.createContext({ console, Map, Array, Number, String, JSON, cere: async (u) => { if (/action=botiInchisi/.test(u)) { if (pica) throw new Error("HTTP 503"); return arh; } return pionex; }, jurnal: (...a) => jr.push(a.join(" ")) });
    vm.runInContext("async " + functie(col, "botiInchisiTotiCorp"), c); const l = await vm.runInContext("botiInchisiTotiCorp()", c); return { n: l.length, complet: l.complet, jr }; };
  assert.deepEqual(J(await rul({ la: 5, complet: true, forma: 3, n: 100, boti: lista(100), citit: true })), { n: 110, complet: true, jr: [] });
  assert.equal((await rul({ la: 5, complet: true, forma: 3, n: 100, boti: lista(100) })).complet, true, "un server mai vechi, fără câmpul `citit`: ca până acum");
  for (const [nume, arh] of [["cheia necitită: 200 cu lista goală", { la: null, complet: false, forma: 1, n: 0, boti: [], citit: false }], ["cheia lipsește", { la: null, complet: false, forma: 1, n: 0, boti: [] }], ["lista goală cu dată", { la: 5, complet: true, boti: [] }],
    ["arhiva încă se strânge", { la: 5, complet: false, boti: lista(40) }], ["listă, dar citirea a picat", { la: 5, complet: true, boti: lista(40), citit: false }], ["fără dată", { la: 0, complet: true, boti: lista(40) }], ["fără `boti`", { la: 5, complet: true }]]) {
    const r = await rul(arh); assert.equal(r.complet, false, nume); assert.ok(r.jr.some((x) => /o socotesc nevenită/.test(x)), nume + ": se scrie în jurnal");
  }
  assert.equal((await rul(null, true)).complet, false, "cererea picată");
  /* ruta spune dacă a putut citi cheia */
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "n1"), Hd = { authorization: "Bearer proba-token-1234567890", origin: "https://exemplu.test" };
  const get = async (ist) => (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=botiInchisi", { headers: Hd }), env: { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: ist } })).json();
  const bun = await get({ get: async () => JSON.stringify({ la: 7, forma: 3, complet: true, boti: [{ strategyId: "a" }] }) }); assert.equal(bun.citit, true); assert.equal(bun.boti.length, 1); assert.equal(bun.complet, true);
  const necitit = await get({ get: async () => { throw new Error("SQLITE_CORRUPT"); } }); assert.equal(necitit.citit, false); assert.deepEqual(necitit.boti, []);
  const stricat = await get({ get: async () => "{nu e json" }); assert.equal(stricat.citit, false); assert.deepEqual(stricat.boti, []);
  const lipsa = await get({ get: async () => null }); assert.equal(lipsa.citit, true, "cheia care lipsește a fost citită; colectorul o respinge pe lista goală"); assert.equal(lipsa.la, null);
});

await test("N2 🟡 „aceeași faptă” = același timp ȘI aceiași bani: botul atins de stop sau lichidat la câteva minute după prag își ține diferența adevărată", () => {
  /* pragul la minutul 2 (−5,5 la suma 100, levier 3 ⇒ comision 0,15); botul închis la minutul 5 */
  const stop = PMg.episodPierdere(botG({ id: "s1", final: -9, durMin: 5 }), drumG([0, -2, -5.5, -7, -8.5]));
  assert.equal(stop.laRegula, false, "3 minute după prag, dar cu 3,5 mai jos: altă faptă"); aproape(stop.d, -9 - (-5.5 - 0.15));
  const lich = PMg.episodPierdere(botG({ id: "s2", final: -40, durMin: 6 }), drumG([0, -2, -5.5, -20, -35, -39])); assert.equal(lich.laRegula, false); aproape(lich.d, -40 - (-5.5 - 0.15));
  const acolo = PMg.episodPierdere(botG({ id: "s3", final: -5.6, durMin: 5 }), drumG([0, -2, -5.5, -5.55, -5.6])); assert.equal(acolo.laRegula, true, "închis la 3 minute, la 0,1 de totalul din prag (sub un comision)"); assert.equal(acolo.d, 0);
  const peste = PMg.episodPierdere(botG({ id: "s5", final: -5.7, durMin: 5 }), drumG([0, -2, -5.5, -5.6, -5.7])); assert.equal(peste.laRegula, false); aproape(peste.d, -5.7 - (-5.5 - 0.15));
  assert.equal(PMg.episodPierdere(botG({ id: "s6", final: -5.3, durMin: 5 }), drumG([0, -2, -5.5, -5.4, -5.3])).laRegula, false, "și în sus: 0,2 mai bine decât la prag nu e aceeași faptă");
  /* timpul: punctul regulii la 4 h 05 (−10,2); lichidat 3 minute mai târziu pe −40 */
  const v = []; for (let i = 0; i < 49; i++) v.push(1); v.push(-10.2); v.push(-30);
  const tl = PMg.episodTimp(botG({ id: "t1", final: -40, durMin: 248 }), drumG(v, 5)); assert.equal(tl.laRegula, false); aproape(tl.d, -40 - (-10.2 - 0.15));
  const ta = PMg.episodTimp(botG({ id: "t2", final: -10.3, durMin: 248 }), drumG(v, 5)); assert.equal(ta.laRegula, true); assert.equal(ta.d, 0);
  for (const d of ["2026-11-22-v100377-proba-pierderii.md", "2026-11-22-v100377-proba-timpului.md"]) { const t = citeste("docs", "cercetare", d); assert.ok(t.includes("Amendamentul al doilea"), d); assert.ok(t.includes("același timp și aceiași bani"), d); assert.ok(t.includes("MAX_CITIRI"), d); }
  assert.ok(citeste("docs", "cercetare", "2026-11-21-v100374-proba-marginii.md").includes("Amendament (22.11.2026"), "și pre-înregistrarea marginii poartă regula boților necitiți");
});

await test("N3 🟡 un drum care nu se poate citi niciodată nu mai ține verdictul pe loc: după 24 de ture botul trece „necitit”, numărat; cei picați merg la coada rândului; cu mai mult de 3 necitiți verdictul nu se îngheață", async () => {
  const drum = { citit: true, brut: drumG([0, -1, 2]) };
  for (const [nume, tura, MOD] of [["pierdere", TTm.turaProbaPierdere, TTm], ["timp", TTm.turaProbaTimp, TTm], ["margine", TMm.turaProbaMargine, TMm]]) {
    assert.equal(MOD.MAX_CITIRI, 24, nume); assert.equal(MOD.MAX_NECITITI, 3, nume); assert.equal(MOD.MAX_ESECURI, 3, nume);
    const boti = [0, 1, 2, 3, 4].map((i) => botG({ id: "n" + i, final: 2, durMin: 300 + i })), st = {}, tr = []; let ordine = [];
    const d = { acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: async (id) => { ordine.push(id); return id === "n4" ? { citit: false } : drum; }, trimite: async (c, x) => { if (/action=proba/.test(c)) tr.push(x); } };
    const r1 = await tura(d, st); assert.deepEqual(ordine, ["n4", "n3", "n2", "n1", "n0"], nume + ": cei mai noi întâi"); assert.equal(r1.judecati, 4, nume + ": un drum necitit NU oprește tura"); assert.equal(r1.ramasi, 1); assert.equal(st.citiri.n4, 1); assert.equal(st.facute.n4, undefined);
    for (let k = 2; k < 24; k++) { const r = await tura(d, st); assert.equal(r.ramasi, 1, nume + ": încă ține proba deschisă, tura " + k); }
    assert.equal(st.citiri.n4, 23); const trInainte = tr.length;
    const r24 = await tura(d, st); assert.equal(st.facute.n4, "necitit", nume + ": a 24-a tură"); assert.equal(st.citiri.n4, undefined); assert.equal(r24.ramasi, 0);
    assert.equal(tr.length, trInainte + 1, nume + ": bilanțul pleacă în tura în care botul iese din probă"); const b = tr[tr.length - 1].boti; assert.equal(b.necititi, 1, nume); assert.equal(b.ramasi, 0); assert.equal(b.judecati, nume === "margine" ? 4 : 4, nume + ": necititul nu e „judecat”");
    /* un drum care se citește până la urmă își pierde numărătoarea */
    const st2 = { citiri: { n4: 7 } }; await tura(Object.assign({}, d, { cereDrum: async () => drum }), st2); assert.equal(st2.citiri.n4, undefined, nume); assert.notEqual(st2.facute.n4, "necitit");
    /* coada rândului: cei cu citiri picate vin după cei neîncercați */
    ordine = []; const st3 = { citiri: { n4: 2, n3: 1 } }; await tura(d, st3); assert.deepEqual(ordine, ["n2", "n1", "n0", "n3", "n4"], nume + ": picații la coadă, cel cu mai puține încercări întâi");
    /* cererile care ARUNCĂ (serverul nu răspunde) opresc tura după trei și NU scot boții din probă */
    let cereri = 0; const st4 = {}; for (let k = 0; k < 30; k++) await tura(Object.assign({}, d, { cereDrum: async () => { cereri++; throw new Error("ECONNREFUSED"); } }), st4);
    assert.equal(cereri, 90, nume + ": trei pe tură"); assert.deepEqual(J(st4.facute), nume === "margine" ? {} : {}, nume + ": niciun bot „necitit” din cauza serverului oprit o zi"); assert.deepEqual(J(st4.citiri), {});
    /* înghețarea: 3 necitiți nu o țin, 4 da */
    const cuNecititi = (k) => { const f = {}; for (let i = 0; i < k; i++) f["x" + i] = "necitit"; return { facute: f, episoade: epM((i) => -8 + (i % 5)) }; };
    const y = [botG({ id: "y", final: 2 })], dy = { acum: T0g + 86400000, pauzaMs: 0, botiInchisi: async () => y, cereDrum: async () => drum, trimite: async () => {} };
    const s3 = cuNecititi(3); await tura(dy, s3); assert.equal(s3.inghetat && s3.inghetat.verdict, "inchiderea", nume + ": trei necitiți nu țin verdictul");
    const s4 = cuNecititi(4); const r4 = await tura(dy, s4); assert.equal(s4.inghetat, undefined, nume + ": cu patru necitiți (KV bolnav?) nu se îngheață"); assert.equal(r4.ramasi, 0);
  }
  /* ruta ține câmpul, pagina îl arată */
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "n3"), Hd = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  for (const a of ["probaMargine", "probaPierdere", "probaTimp"]) {
    const corp = Object.assign(PMg.bilant([], { coada: 0.0025 }), { la: Date.now() - 1000, prag: 0.05, coada: 0.0025, ore: 4, verdict: null, inghetat: null, boti: { total: 9, judecati: 7, ramasi: 0, episoade: 1, necititi: 2 } });
    assert.equal((await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: Hd, body: JSON.stringify(corp) }), env })).status, 200, a);
    const j = await (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { headers: Hd }), env })).json(); assert.equal(j[a].boti.necititi, 2, a); assert.equal(j.citit, true);
  }
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, Intl, sugStare: { d: {} }, sugCate: (n, s, p) => globalThis.TextRo.cate(n, s, p), sugEsc: (s) => String(s), sugP1: (v) => String(v), sugPc: (v) => String(v), sugZec: (v) => String(v), sugCadZi: (z) => String(z), Caiet: undefined });
  vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", "probe-ecran.js"), "utf8"), c);
  const baza = { forma: 1, la: Date.UTC(2026, 10, 23) - 1000, n: 12, zile: 5, medie: -4.2, suma: -90, ic: null, verdict: null, inghetat: null, minEpisoade: 60, minZile: 20 }, acumP = Date.UTC(2026, 10, 23);
  const R2 = c.prProbe({ probaPierdere: Object.assign({}, baza, { boti: { total: 40, judecati: 28, ramasi: 0, episoade: 12, pestePrag: 16, faraDrum: 0, drumTaiat: 0, gol: 0, pornitSub: 0, vechi: 10, necititi: 2 } }),
    probaTimp: Object.assign({}, baza, { boti: { total: 40, judecati: 29, ramasi: 0, episoade: 12, scurt: 9, pePlus: 8, faraDrum: 0, drumTaiat: 0, gol: 0, vechi: 10, necititi: 1 } }),
    probaMargine: Object.assign({}, baza, { boti: { total: 40, judecati: 37, ramasi: 0, episoade: 12, inGrid: 20, faraDrum: 5, drumTaiat: 0, gol: 0, mutat: 0, pornitAfara: 0, neutri: 0, necititi: 3 } }) }, acumP);
  assert.match(R2.find((q) => q.k === "pierdere").jud, / · 2 boți cu drumul necitit \(se reîncearcă o dată pe zi\)$/); assert.match(R2.find((q) => q.k === "timp").jud, / · 1 bot cu drumul necitit \(se reîncearcă o dată pe zi\)$/); assert.match(R2.find((q) => q.k === "margine").jud, / · 3 boți cu drumul necitit \(se reîncearcă o dată pe zi\)$/);
  const R3 = c.prProbe({ probaPierdere: Object.assign({}, baza, { boti: { total: 40, judecati: 30, ramasi: 0, episoade: 12, pestePrag: 16, faraDrum: 1, drumTaiat: 1, gol: 0, pornitSub: 0, vechi: 7 } }) }, acumP);
  assert.equal(/necitit/.test(R3.find((q) => q.k === "pierdere").jud), false, "fără boți necitiți: nimic în plus");
});

await test("N4 🟡 unealta copiei: poarta care a sărit probele = avertisment în „REZULTAT”; probele de după publicare trebuie să fi măsurat codul publicat (ștampila lor la zi pe principal)", () => {
  const c = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(c, /for \(const l of poarta\) scrie\(l\);\n[^\n]*\n[^\n]*\n  if \(poarta\.some\(\(l\) => \/probele de ecran: sărite - \/\.test\(l\)\)\) s\.avert\.push\("poarta de dinaintea împingerii a SĂRIT probele de ecran \(motivul e mai sus\)"\);/);
  const TIPAR_SARIT = new RegExp(c.match(/poarta\.some\(\(l\) => \/([^/]+)\/\.test\(l\)\)/)[1]);
  assert.equal(TIPAR_SARIT.test(P.textSarit("alte-fisiere", { depozit: "v100.377", rad: "C:\\x\\crypto-lucru-idei377" })), true, "poarta chiar scrie cuvintele pe care le caută unealta");
  /* a doua trecere (D2): rândurile obișnuite ale porții NU sunt avertisment (altfel orice livrare fără public/ ieșea cu „1 avertisment”) */
  const g0 = citeste("scripts", "inainte-de-push.mjs"); assert.ok(g0.includes("probele de ecran: sărite (nicio schimbare în public/)"), "premisa: poarta are și rânduri „sărite” nevinovate");
  assert.equal(TIPAR_SARIT.test("[pre-push] probele de ecran: sărite (nicio schimbare în public/)"), false); assert.equal(TIPAR_SARIT.test("[pre-push] probele de ecran: sărite (SARI_PROBA_ECRAN=1)"), false);
  for (const m of g0.match(/probele de ecran: sărite - [^`"]{6,40}/g)) assert.equal(TIPAR_SARIT.test("[pre-push] " + m), true, m);
  assert.ok(g0.match(/probele de ecran: sărite - /g).length >= 4, "cele patru cazuri cu motiv");
  assert.deepEqual(L.liniiPoarta("remote: [pre-push] probele de ecran: sărite - serverul nu răspunde\nalt rând").length, 1, "rândul trece prin filtrul uneltei");
  const iT = c.indexOf('s.avert.push("proba de ecran a Tabloului a picat pe principal"); }'), iL = c.indexOf("if (!probeLaZi(RAD)) {"), iF = c.indexOf("// v100.211: serverul 8788 rulează Worker-ul PRE-CONSTRUIT");
  assert.ok(iT > 0 && iL > iT && iF > iL, "verificarea ștampilei stă după cele două probe, înaintea Functions");
  assert.match(c, /s\.avert\.push\("probele de ecran de după publicare n-au măsurat codul publicat \(ștampila lor nu e la zi pe principal\)"\);/);
  assert.equal(typeof L.probeLaZi, "function"); assert.equal(L.probeLaZi(path.join(RAD, "nu-exista-" + Date.now())), false, "fără ștampilă: nu e la zi");
  assert.equal(L.textRezultat({ publicat: "abc1234", adus: true, avert: ["poarta de dinaintea împingerii a SĂRIT probele de ecran (motivul e mai sus)", "probele de ecran de după publicare n-au măsurat codul publicat (ștampila lor nu e la zi pe principal)"] }).includes("2 avertismente: (1) poarta de dinaintea împingerii a SĂRIT"), true);
});

await test("N5 🔵 colectorul: drumul unui bot închis se cere O dată și când cele trei ture îl cer în aceeași clipă; o cerere picată sau un drum necitit nu rămân în cache; verdictul „necitit” din KV nu e „lipsă”", async () => {
  const col = citeste("scripts", "colector.mjs");
  const c = vm.createContext({ console, Map, Date, Array, Promise, Error, encodeURIComponent, cereri: [], raspuns: { citit: true, brut: [1, 2] }, pica: false });
  vm.runInContext("const drumuriInchise = new Map(); var cere = async (u) => { cereri.push(u); await null; if (pica) throw new Error('HTTP 502'); return raspuns; };\n" + functie(col, "cereDrumInchis") + "\nglobalThis.cereDrumInchis = cereDrumInchis; globalThis.marime = () => drumuriInchise.size;", c);
  const [a, b, d3] = await Promise.all([c.cereDrumInchis("b1"), c.cereDrumInchis("b1"), c.cereDrumInchis("b1")]);
  assert.equal(c.cereri.length, 1, "trei cereri deodată = o singură citire"); assert.equal(a, b); assert.equal(b, d3); assert.deepEqual(J(a), { citit: true, brut: [1, 2] });
  await c.cereDrumInchis("b1"); assert.equal(c.cereri.length, 1, "și după: din cache"); await c.cereDrumInchis("b2"); assert.equal(c.cereri.length, 2); assert.equal(c.marime(), 2);
  c.raspuns = { citit: false, brut: null }; const n1 = await c.cereDrumInchis("b3"); assert.equal(n1.citit, false); assert.equal(c.marime(), 2, "drumul necitit nu se ține"); await c.cereDrumInchis("b3"); assert.equal(c.cereri.length, 4, "se cere din nou");
  c.pica = true; await assert.rejects(c.cereDrumInchis("b4"), /HTTP 502/); assert.equal(c.marime(), 2, "cererea picată nu se ține"); c.pica = false; c.raspuns = { citit: true, brut: [] }; assert.deepEqual(J(await c.cereDrumInchis("b4")), { citit: true, brut: [] });
  /* verdictul din KV */
  const k = vm.createContext({ console, Error, r: null }); vm.runInContext("var cere = async () => r;\nasync " + functie(col, "inghetatDinKv") + "\nglobalThis.inghetatDinKv = inghetatDinKv;", k);
  const g = { la: 9, n: 70, zile: 22, verdict: "lasatul" };
  k.r = { probaTimp: { inghetat: g }, citit: true }; assert.deepEqual(J(await k.inghetatDinKv("probaTimp")), g);
  k.r = { probaTimp: null, citit: true }; assert.equal(await k.inghetatDinKv("probaTimp"), null); k.r = { probaTimp: null }; assert.equal(await k.inghetatDinKv("probaTimp"), null, "server mai vechi, fără `citit`");
  k.r = { probaTimp: null, citit: false }; await assert.rejects(k.inghetatDinKv("probaTimp"), /n-a putut fi citit/); k.r = null; await assert.rejects(k.inghetatDinKv("probaTimp"), /n-a putut fi citit/);
  /* ruta: cheia necitită ⇒ GET spune `citit:false`, POST nu scrie peste ea (503); o valoare stricată se rescrie */
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "n5"), Hd = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  const corp = Object.assign(PMg.bilant([], { coada: 0.0025 }), { la: Date.now() - 1000, prag: 0.05, coada: 0.0025, ore: 4, n: 70, zile: 25, medie: -4, suma: -300, ic: [-6, -2], verdict: "inchiderea", inghetat: { la: 1000, n: 70, zile: 25, medie: -4, suma: -300, ic: [-6, -2], verdict: "inchiderea", seContrazic: false }, boti: { total: 9, judecati: 9, ramasi: 0, episoade: 70 } });
  for (const a of ["probaMargine", "probaPierdere", "probaTimp"]) {
    const scrise = [], bolnav = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async () => { throw new Error("SQLITE_CORRUPT"); }, put: async (kk, v) => { scrise.push(kk); } } };
    const g1 = await (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { headers: Hd }), env: bolnav })).json(); assert.equal(g1.citit, false, a); assert.equal(g1[a], null);
    const p1 = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: Hd, body: JSON.stringify(corp) }), env: bolnav }); assert.equal(p1.status, 503, a + ": nu scrie peste un bilanț pe care nu-l poate citi"); assert.deepEqual(scrise, []);
    const kv = new Map([[a === "probaTimp" ? "proba:timp" : a === "probaPierdere" ? "proba:pierdere" : "proba:margine", "{stricat"]]), env2 = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (kk) => kv.get(kk) ?? null, put: async (kk, v) => { kv.set(kk, v); } } };
    assert.equal((await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: Hd, body: JSON.stringify(corp) }), env: env2 })).status, 200, a + ": valoarea stricată se rescrie");
    assert.equal((await (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { headers: Hd }), env: env2 })).json())[a].verdict, "inchiderea");
  }
  /* nota boților porniți nu mai depinde de arhiva celor închiși */
  const tc = functie(col, "turaProbaMargineColector"), iE = tc.indexOf("} catch (e) { eroareTura = e; }"), iV = tc.indexOf("await pastreazaViiModul("), iA = tc.indexOf("if (eroareTura) throw eroareTura;"); assert.ok(iE > 0 && iV > iE && iA > iV, "tura, apoi nota boților porniți, abia apoi eroarea turei");
});

await test("N6 🔵 oprirea serverului copiei: rădăcină = doar cmd / node cu „wrangler … dev” într-o linie obișnuită; unealta și strămoșii ei nu se opresc; un workerd fără părinte pe 8788 = oprire nereușită", () => {
  const dest = "C:\\Users\\Cimin\\crypto-lucru-idei377", st = dest + "\\.wrangler\\state";
  const P2 = [
    { pid: 100, ppid: 1, creat: 10, nume: "cmd.exe", linie: `C:\\WINDOWS\\system32\\cmd.exe /d /s /c "npx wrangler@4.137.0 dev --port 8788 --persist-to "${st}""` },
    { pid: 101, ppid: 100, creat: 11, nume: "node.exe", linie: `"node" wrangler.js dev --port 8788 --persist-to ${st}` },
    { pid: 102, ppid: 101, creat: 12, nume: "workerd.exe", linie: "workerd.exe serve --binary --socket-addr=entry=127.0.0.1:8788 --control-fd=3 -" },
    /* un shell care urmărește jurnalul și pomenește comanda: nu e server, iar copilul lui node nu e al serverului */
    { pid: 200, ppid: 1, creat: 20, nume: "powershell.exe", linie: `powershell -Command "Get-Content server-copie.log -Wait; # wrangler dev --persist-to ${st}"` },
    { pid: 201, ppid: 200, creat: 21, nume: "node.exe", linie: "node alt-script.mjs" },
    /* un program care doar CITEAZĂ comanda într-un text lung */
    { pid: 300, ppid: 1, creat: 30, nume: "node.exe", linie: "node agent.js --prompt " + "x".repeat(2000) + ` wrangler dev --persist-to ${st}` },
    { pid: 301, ppid: 300, creat: 31, nume: "cmd.exe", linie: "cmd /c dir" },
    /* un proces cu starea copiei, dar fără „dev” (de pildă `wrangler kv … --persist-to`) */
    { pid: 400, ppid: 1, creat: 40, nume: "node.exe", linie: `node wrangler.js kv key list --local --env-file .dev.vars --persist-to ${st}` },   /* D5: „.dev.vars” nu e comanda „dev” */
    /* „oprește; pornește” într-un singur shell: unealta (501) e copilul shell-ului (500) care poartă și comanda serverului */
    { pid: 500, ppid: 1, creat: 50, nume: "cmd.exe", linie: `cmd /c "node scripts\\copie-de-lucru.mjs server idei377 --opreste & npx wrangler dev --persist-to "${st}""` },
    { pid: 501, ppid: 500, creat: 51, nume: "node.exe", linie: "node scripts\\copie-de-lucru.mjs server idei377 --opreste" },
  ];
  const pids = (l) => l.map((x) => x.pid).sort((a, b) => a - b);
  assert.deepEqual(pids(L.arboreServer(P2, dest, 501)), [100, 101, 102], "doar serverul adevărat; nici shell-ul din care rulează unealta, nici ea");
  assert.deepEqual(pids(L.arboreServer(P2, dest)), [100, 101, 102, 500, 501], "fără „eu” (probele vechi): shell-ul compus arată ca o rădăcină - de aceea unealta își dă PID-ul");
  assert.deepEqual(pids(L.arboreServer(P2, dest, 999999)), [100, 101, 102, 500, 501], "un PID necunoscut nu scoate nimic");
  /* D6: un PID refolosit nu e strămoș - „părintele” (101, pornit la 11) e mai NOU decât unealta (601, pornită la 5) ⇒ serverul rămâne în listă */
  const P3 = P2.concat([{ pid: 601, ppid: 101, creat: 5, nume: "node.exe", linie: "node scripts\\copie-de-lucru.mjs server idei377 --opreste" }]);
  assert.deepEqual(pids(L.arboreServer(P3, dest, 601)), [100, 101, 102, 500, 501], "rădăcina serverului nu iese din listă pe un PID refolosit");
  assert.deepEqual(pids(L.arboreServer(P2.concat([{ pid: 602, ppid: 101, creat: 60, nume: "node.exe", linie: "node unealta.mjs" }]), dest, 602)), [500, 501], "strămoșii adevărați (porniți înaintea ei) ies cu tot cu ea: 602 ← 101 ← 100; 102 rămâne fără părinte ales");
  const c = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(c, /return arboreServer\(toateProcesele\(\), dest, process\.pid\);/);
  assert.match(c, /if \(!p\.length\) \{ const o0 = orfaniVii\(\); if \(o0\.length\) \{ spuneOrfani\(nume, o0\); return -1; \} return 0; \}/, "fără procese ale copiei, dar cu un workerd orfan pe 8788: nu „nu rula”");
  assert.match(c, /const orf = orfaniVii\(\); if \(orf\.length\) \{ spuneOrfani\(nume, orf\); return -1; \}\n  const dupa = versiuneaServerului\(SANATATE\);/, "și după oprire: orfanul = oprire nereușită (curățarea nu șterge copia)");
  assert.match(c, /function orfaniVii\(\) \{ if \(process\.platform !== "win32" \|\| process\.env\.COPIE_FARA_SERVER\) return \[\];/, "probele uneltei nu caută procese adevărate");
});

await test("N7 🔵 texte: cu un bot pe zero nu sunt „toți pe plus”; un cost minuscul nu scrie „0,00% din sumă”", () => {
  const rand = (pePlus) => ({ tot: { n: 2000, pePlus: 0.6, castig: 0.03, pierdere: 0.07, trebuie: 0.7, net: -10 }, varste: [{ h: 4, n: 24, pePlus, castig: 0.031, pierdere: null, trebuie: null, net: 12 }] });
  assert.equal(RL.textPlataScurt(rand(1), 5).includes("niciunul n-a ieșit pe minus"), false); assert.match(RL.textPlata(rand(1), 5, 0), /: toți au ieșit pe plus, în medie \+3,1% din sumă\.$/);
  assert.match(RL.textPlata(rand(0.95), 5, 0), /: niciunul n-a ieșit pe minus; cei pe plus au adus în medie \+3,1% din sumă\.$/);
  const cg = vm.createContext({ console, Math, JSON, Number, String, Array, Object, isFinite, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s) }); vm.runInContext(functie(APP, "grDusIntorsText"), cg);
  cg.d = { intrare: 0.002, cost: 0.004, dinSuma: 0.00002, perechi: 1 }; const t = vm.runInContext("grDusIntorsText(d)", cg); assert.ok(t.includes("sub 0,01% din sumă"), t); assert.equal(/0,00% din sumă/.test(t), false);
  cg.d = { intrare: 617.3, cost: 1234.56, dinSuma: 0.0123, perechi: 300 }; assert.ok(vm.runInContext("grDusIntorsText(d)", cg).startsWith("≈ −1.234,6 USDT · 1,2% din sumă"));
});

await test("N8 (el 22.11: „când deschid Busola nu îmi deschide pe moneda botului”) butonul „Busola ↗” din meniu, din sertarul „Mai mult” și din paletă ia moneda botului de pe ORICE pagină; fără bot citit, moneda din Radar", () => {
  const f = functie(APP, "deschideBusola"), deschise = [], el = { symbol: { value: "ETH" }, tf: { value: "1h" } };
  /* fără `document` în context: funcția nu mai întreabă pe ce pagină e (dacă ar face-o, ar arunca aici) */
  const c = vm.createContext({ JSON, Busola: { adresaBusola: (o) => JSON.stringify(o) }, tbStare: { bot: { id: "b1", simbolPionex: "PUMP_USDT_PERP" } }, tbTf: () => "5M", tbCheieBusola: (b) => b.simbolPionex, assetClass: () => "CRYPTO", $: (id) => el[id] || null,
    window: { open: (u, t, o) => { deschise.push([JSON.parse(u), t, o]); return {}; } } });
  vm.runInContext(f, c);
  c.deschideBusola(); assert.deepEqual(J(deschise.pop()), [{ bot: "PUMP_USDT_PERP", tfBot: "5M", simbol: "ETH", tf: "1h", actiuni: false }, "_blank", "noopener"], "cu bot: moneda botului, pe intervalul graficului lui");
  c.assetClass = () => "STOCKS"; c.deschideBusola(); assert.equal(J(deschise.pop())[0].bot, "PUMP_USDT_PERP", "și cu Radarul pe acțiuni"); c.assetClass = () => "CRYPTO";
  c.tbStare.bot = null; c.deschideBusola(); assert.deepEqual(J(deschise.pop())[0], { bot: null, tfBot: null, simbol: "ETH", tf: "1h", actiuni: false }, "fără bot citit: moneda și intervalul din Radar");
  /* a doua trecere (D3): un bot ÎNCHIS nu duce Busola pe o monedă pe care n-o mai are - decât de pe pagina Tabloului, unde el e cel arătat */
  let pag = "dash"; c.document = { querySelector: () => ({ dataset: { nav: pag } }) }; c.tbStare.bot = { id: "b2", simbolPionex: "VECHI_USDT_PERP", activ: false };
  c.deschideBusola(); assert.equal(J(deschise.pop())[0].bot, null, "bot închis, altă pagină: moneda din Radar");
  pag = "tabloubot"; c.deschideBusola(); assert.equal(J(deschise.pop())[0].bot, "VECHI_USDT_PERP", "bot închis, pe Tablou: ca până acum");
  c.tbStare.bot = { id: "b1", simbolPionex: "PUMP_USDT_PERP", activ: true }; pag = "dash"; c.deschideBusola(); assert.equal(J(deschise.pop())[0].bot, "PUMP_USDT_PERP");
  const html = citeste("public", "index.html");
  assert.match(html, /<button class="sideBtn" data-action-click="deschideBusola\(\)" title="Busola în fereastra ei, pe moneda botului tău \(fără bot pornit: pe moneda din Radar\)">/);
  assert.match(html, /<button class="moreBtn" data-action-click="closeMoreDrawer\(\);deschideBusola\(\)"><b>🧭<\/b>Busola ↗<\/button>/, "sertarul de pe telefon cheamă aceeași funcție");
  assert.match(APP, /\["🧭 Busola ↗ \(moneda ta\)","busola","deschideBusola\(\)"\]/, "și paleta");
});

await test("N9 (a doua trecere a reviziei) 🟡 boții „necitiți” se reîncearcă o dată pe zi și revin în probă când drumul lor se citește; 🔵 bilanțul netrimis pleacă la tura următoare; ruta nu rescrie arhiva pe care n-a putut-o citi", async () => {
  const drum = { citit: true, brut: drumG([0, -1, 2]) }, ZI = 86400000, ORA = 3600000;
  for (const [nume, tura, MOD] of [["pierdere", TTm.turaProbaPierdere, TTm], ["timp", TTm.turaProbaTimp, TTm], ["margine", TMm.turaProbaMargine, TMm]]) {
    assert.equal(MOD.REINCEARCA_NECITIT_MS, ZI, nume);
    /* șase boți: doi se citesc, patru nu (KV bolnav pe drumurile lor) */
    const boti = [0, 1, 2, 3, 4, 5].map((i) => botG({ id: "q" + i, final: 2, durMin: 300 + i })), st = { episoade: epM((i) => -8 + (i % 5)) }; let bolnav = true, cereri = [];
    const d = (acum) => ({ acum, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: async (id) => { cereri.push(id); return bolnav && id !== "q0" && id !== "q1" ? { citit: false } : drum; }, trimite: async () => {} });
    const t0 = T0g + ZI; for (let k = 0; k < 24; k++) await tura(d(t0 + k * ORA), st);
    assert.deepEqual(["q2", "q3", "q4", "q5"].map((id) => st.facute[id]), ["necitit", "necitit", "necitit", "necitit"], nume); assert.equal(st.inghetat, undefined, nume + ": patru necitiți țin verdictul");
    assert.equal(st.necititLa.q2, t0 + 23 * ORA, nume + ": clipa în care a ieșit din probă");
    /* KV-ul e reparat, dar n-a trecut o zi: nu se cere nimic */
    bolnav = false; cereri = []; await tura(d(t0 + 24 * ORA), st); assert.deepEqual(cereri, [], nume + ": reîncercarea e rară, nu la fiecare tură"); assert.equal(st.inghetat, undefined);
    /* după o zi: cei patru se cer din nou, se citesc și revin în probă ⇒ verdictul se poate da (înainte: 0 cereri, 4 necitiți, niciun verdict, pentru totdeauna) */
    const trimise = []; await tura(Object.assign(d(t0 + 47 * ORA), { trimite: async (c, x) => { if (/action=proba/.test(c)) trimise.push(x); } }), st);
    assert.deepEqual(cereri.slice().sort(), ["q2", "q3", "q4", "q5"], nume); assert.equal(Object.values(st.facute).filter((v) => v === "necitit").length, 0, nume); assert.deepEqual(J(st.necititLa), {}, nume);
    assert.equal(st.inghetat && st.inghetat.verdict, "inchiderea", nume + ": verdictul nu mai rămâne blocat"); assert.equal(trimise[trimise.length - 1].boti.necititi, 0); assert.equal(trimise[trimise.length - 1].boti.ramasi, 0);
    /* reîncercarea care pică din nou: botul rămâne „necitit”, cu clipa nouă, fără să intre iar la numărătoarea de 24 */
    const st2 = { facute: { q5: "necitit" }, necititLa: { q5: t0 }, episoade: [] }; bolnav = true; cereri = [];
    await tura(d(t0 + ZI), st2); assert.ok(cereri.includes("q5"), nume); assert.equal(st2.facute.q5, "necitit"); assert.equal(st2.necititLa.q5, t0 + ZI, nume); assert.equal(st2.citiri.q5, undefined, nume);
    /* o stare veche, fără `necititLa`: botul necitit se reîncearcă la prima tură */
    const st3 = { facute: { q5: "necitit" }, episoade: [] }; bolnav = false; cereri = []; await tura(d(t0), st3); assert.ok(cereri.includes("q5"), nume + ": stare veche"); assert.notEqual(st3.facute.q5, "necitit");
    /* D4: trimiterea bilanțului pică (503) ⇒ tura următoare trimite din nou, deși n-are nimic nou și bilanțul „a plecat” de curând */
    const y = [botG({ id: "y", final: 2 })], st4 = { trimisLa: t0 - 1000, episoade: [] }, plecate = []; let pica = true;
    const dy = { acum: t0, pauzaMs: 0, botiInchisi: async () => y, cereDrum: async () => drum, trimite: async (c, x) => { if (!/action=proba/.test(c)) return; if (pica) throw new Error("HTTP 503"); plecate.push(x); } };
    await assert.rejects(tura(dy, st4), /503/); assert.equal(st4.netrimis, true, nume); assert.equal(st4.trimisLa, t0 - 1000);
    pica = false; const r = await tura(dy, st4); assert.equal(r.judecati, 0, nume + ": nimic nou de judecat"); assert.equal(plecate.length, 1, nume + ": bilanțul netrimis pleacă acum, nu peste 6 ore"); assert.equal(st4.netrimis, false);
    await tura(dy, st4); assert.equal(plecate.length, 1, nume + ": și apoi nu se mai trimite degeaba");
  }
  /* pagina spune că se reîncearcă și când țin verdictul */
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, Intl, sugStare: { d: {} }, sugCate: (n, s, p) => globalThis.TextRo.cate(n, s, p), sugEsc: (s) => String(s), sugP1: (v) => String(v), sugPc: (v) => String(v), sugZec: (v) => String(v), sugCadZi: (z) => String(z), Caiet: undefined });
  vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", "probe-ecran.js"), "utf8"), c);
  const R4 = c.prProbe({ probaPierdere: { forma: 1, la: Date.UTC(2026, 10, 23) - 1000, n: 70, zile: 25, medie: -4.2, suma: -90, ic: null, verdict: null, inghetat: null, minEpisoade: 60, minZile: 20, boti: { total: 40, judecati: 26, ramasi: 0, episoade: 12, pestePrag: 14, faraDrum: 0, drumTaiat: 0, gol: 0, pornitSub: 0, vechi: 10, necititi: 4 } } }, Date.UTC(2026, 10, 23));
  assert.match(R4.find((q) => q.k === "pierdere").jud, / · 4 boți cu drumul necitit \(se reîncearcă o dată pe zi; cât sunt mai mult de 3, verdictul nu se dă\)$/);
  /* D7: ruta care SCRIE arhiva boților */
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "n9"), Hd = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  const post = (ist) => mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=botiInchisi", { method: "POST", headers: Hd, body: JSON.stringify({ boti: [{ strategyId: "nou1", createTime: 1795290000000, closeTime: 1795300000000 }] }) }), env: { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: ist } });
  const scrise = []; assert.equal((await post({ get: async () => { throw new Error("SQLITE_CORRUPT"); }, put: async (k, v) => { scrise.push(k); } })).status, 503, "nu scrie peste o arhivă pe care n-a putut-o citi"); assert.deepEqual(scrise, []);
  const kv = new Map([["botiInchisi", JSON.stringify({ la: 5, forma: 3, complet: true, boti: [{ strategyId: "vechi1", createTime: 1795190000000, closeTime: 1795200000000 }] })]]), bun = { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
  assert.equal((await post(bun)).status, 200); const a2 = JSON.parse(kv.get("botiInchisi")); assert.equal(a2.boti.length, 2, "bucata nouă se UNEȘTE cu arhiva, nu o înlocuiește");
  const kv2 = new Map([["botiInchisi", "{stricat"]]); assert.equal((await post({ get: async (k) => kv2.get(k) ?? null, put: async (k, v) => { kv2.set(k, v); } })).status, 200, "o valoare stricată se reface"); assert.equal(JSON.parse(kv2.get("botiInchisi")).boti.length, 1);
});

await test("N10 (el 22.11: „fa idei”) pagina Probe: lângă regulile „−5% din sumă” și „4 ore pe minus”, câți boți PORNIȚI sunt chiar acum în clipa judecată și câți bani înseamnă - un fapt, fără sfat; fără lista boților nu se scrie nimic", () => {
  const acum = Date.UTC(2026, 10, 22, 18, 30), ORA = 3600000;
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, Intl, sugStare: { d: {} }, sugCate: (n, s, p) => globalThis.TextRo.cate(n, s, p), sugEsc: (s) => String(s), sugP1: (v) => String(v), sugPc: (v) => String(v), sugZec: (v) => String(v), sugCadZi: (z) => String(z), Caiet: undefined });
  vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", "probe-ecran.js"), "utf8"), c);
  /* botul lui de azi: 75,77 USDT puși, total −10,9, pornit la 10:42 (ora României) */
  const pump = { id: "p", baza: "PUMPFUN.PERP", activ: true, investit: 75.77, profitTotal: -10.9, pornitLa: Date.UTC(2026, 10, 22, 8, 42) };
  const P = (l, t) => J(c.prPorniti(l, t === undefined ? acum : t));
  assert.equal(c.prPorniti(null, acum), null, "lista necunoscută ≠ „niciun bot”"); assert.equal(c.prPorniti(undefined, acum), null);
  assert.deepEqual(P([]), { activi: 0, n: 0, pierdere: { n: 0, total: 0, suma: 0 }, timp: { n: 0, total: 0, suma: 0 } });
  const r = P([pump]); assert.equal(r.activi, 1); assert.equal(r.n, 1); assert.equal(r.pierdere.n, 1); aproape(r.pierdere.total, -10.9); aproape(r.pierdere.suma, 75.77); assert.equal(r.timp.n, 1);
  /* pragurile: aceleași ca episodul probei și ca alerta */
  const b = (o) => Object.assign({ activ: true, investit: 100, profitTotal: 0, pornitLa: acum - 6 * ORA }, o);
  assert.equal(P([b({ profitTotal: -5 })]).pierdere.n, 1, "exact −5% e la prag"); assert.equal(P([b({ profitTotal: -4.99 })]).pierdere.n, 0);
  assert.equal(P([b({ profitTotal: -0.5 })]).timp.n, 1, "exact −0,5% după 6 ore"); assert.equal(P([b({ profitTotal: -0.49 })]).timp.n, 0); assert.equal(P([b({ profitTotal: 3 })]).timp.n, 0, "pe plus");
  assert.equal(P([b({ profitTotal: -2, pornitLa: acum - 4 * ORA })]).timp.n, 1, "exact 4 ore"); assert.equal(P([b({ profitTotal: -2, pornitLa: acum - 4 * ORA + 60000 })]).timp.n, 0, "încă n-a trecut de 4 ore");
  assert.equal(P([b({ profitTotal: -2, pornitLa: acum - 24 * ORA })]).timp.n, 0, "regula timpului se uită doar între 4 și 24 de ore"); assert.equal(P([b({ profitTotal: -2, pornitLa: acum - 24 * ORA + 60000 })]).timp.n, 1);
  assert.equal(P([b({ profitTotal: -2, pornitLa: null })]).timp.n, 0, "fără ora pornirii: nu se numără la timp"); assert.equal(P([b({ profitTotal: -9, pornitLa: null })]).pierdere.n, 1, "dar la pierdere da");
  /* boții închiși și cei fără cifre nu intră; cei fără cifre se numără separat */
  const amestec = P([b({ profitTotal: -9 }), b({ activ: false, profitTotal: -50 }), b({ investit: null, profitTotal: -50 }), b({ investit: 0, profitTotal: -50 }), b({ profitTotal: null }), b({ profitTotal: "x" }), null, b({ profitTotal: -7, investit: 200 })]);
  assert.equal(amestec.activi, 6, "toți cei porniți"); assert.equal(amestec.n, 2, "cei cu suma și totalul citite"); assert.equal(amestec.pierdere.n, 1, "−7 din 200 = −3,5%: nu e la prag"); aproape(amestec.pierdere.total, -9); assert.equal(amestec.timp.n, 2); aproape(amestec.timp.total, -16); aproape(amestec.timp.suma, 300);
  /* rândurile paginii */
  const R = c.prProbe({ botiPorniti: [pump] }, acum), pr = R.find((q) => q.k === "pierdere"), ti = R.find((q) => q.k === "timp"), mg = R.find((q) => q.k === "margine");
  assert.equal(pr.acum, "1 bot pornit e acum la −5% din sumă sau sub: total −10,9 USDT din 75,8 USDT puși (−14,4%) · proba încă n-are verdict");
  assert.equal(ti.acum, "1 bot pornit a trecut de 4 ore și e pe minus cu cel puțin 0,5% din sumă: total −10,9 USDT din 75,8 USDT puși (−14,4%) · proba încă n-are verdict");
  assert.equal(mg.acum, undefined, "proba marginii n-are rândul (stopul și marginea sunt pe Tablou)");
  const R1 = c.prProbe({ botiPorniti: [b({ profitTotal: 2 }), b({ profitTotal: 1 })] }, acum);
  assert.equal(R1.find((q) => q.k === "pierdere").acum, "niciunul din cei 2 boți porniți nu e acum la −5% din sumă"); assert.equal(R1.find((q) => q.k === "timp").acum, "niciunul din cei 2 boți porniți nu e, între 4 și 24 de ore de la pornire, pe minus cu 0,5% din sumă");
  assert.equal(c.prProbe({ botiPorniti: [b({ profitTotal: 2 })] }, acum).find((q) => q.k === "pierdere").acum, "botul pornit nu e acum la −5% din sumă");
  assert.equal(c.prProbe({ botiPorniti: [] }, acum).find((q) => q.k === "pierdere").acum, "niciun bot pornit acum");
  const R2 = c.prProbe({ botiPorniti: [b({ profitTotal: -9 }), b({ profitTotal: -30, investit: 200 }), b({ investit: null, profitTotal: -1 })] }, acum);
  assert.equal(R2.find((q) => q.k === "pierdere").acum, "2 boți porniți sunt acum la −5% din sumă sau sub: total −39,0 USDT din 300,0 USDT puși (−13,0%) · proba încă n-are verdict · 1 bot pornit fără suma citită, nenumărat");
  /* cu verdictul dat, rândul nu mai spune „încă n-are verdict” (verdictul e în „Cum stă”) */
  const cuV = c.prProbe({ botiPorniti: [pump], probaPierdere: { forma: 1, la: acum - 1000, n: 70, zile: 25, medie: -4, suma: -300, ic: [-6, -2], verdict: "inchiderea", inghetat: { la: acum - 5000, n: 70, zile: 25, medie: -4, suma: -300, ic: [-6, -2], verdict: "inchiderea" }, minEpisoade: 60, minZile: 20, boti: { total: 9, judecati: 9, ramasi: 0, episoade: 70 } } }, acum).find((q) => q.k === "pierdere");
  assert.equal(cuV.acum, "1 bot pornit e acum la −5% din sumă sau sub: total −10,9 USDT din 75,8 USDT puși (−14,4%)");
  /* fără listă: nimic (nici în date, nici pe ecran); cu Tabloul încărcat, lista vine de acolo fără altă cerere */
  assert.equal(c.prProbe({}, acum).find((q) => q.k === "pierdere").acum, undefined); assert.equal(/prAcum/.test(c.prStadiuHtml({}, acum)), false);
  c.tbStare = { boti: [pump] }; assert.match(c.prProbe({}, acum).find((q) => q.k === "timp").acum, /^1 bot pornit a trecut de 4 ore/); c.tbStare = undefined;
  const h = c.prStadiuHtml({ botiPorniti: [pump] }, acum);
  assert.equal((h.match(/<div class="prAcum"><dt>La boții porniți acum<\/dt><dd>/g) || []).length, 2, "doar pe cele două reguli pe bani");
  assert.ok(h.indexOf('<div class="prAcum">') > h.indexOf('<div class="prSta">'), "după „Cum stă, fără verdict”");
  assert.match(citeste("public", "app.css"), /\.prFapte \.prAcum\{grid-column:1\/-1\}/, "pe toată lățimea rândului, la orice lățime");
  for (const d of ["2026-11-22-v100377-proba-pierderii.md", "2026-11-22-v100377-proba-timpului.md"]) assert.ok(citeste("docs", "cercetare", d).includes("boți porniți sunt chiar acum în clipa regulii"), d + " notează că pagina arată faptul");
});

await test("D1 versiunea v100.377 e pusă peste tot și proba e în lanț, după v100.376", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json")), HTML = citeste("public", "index.html");
  /* v100.378: „de la 377 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.378) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 377, "package.json: de la 100.377 încolo"); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 377); assert.ok(bi.li377 && bi.li377.length > 200, "BUILD_INFO.li377");
  assert.equal((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 377).length >= 4, true, "index.html: v100.377 sau mai nou, de cel puțin 4 ori");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 377, "sw.js"); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 377, "versiune.js");
  assert.match(pk.scripts.test, /npm run test:v100376 && npm run test:v100377/); assert.match(pk.scripts.test, /node scripts\/mutatii\.mjs --doar-tiparele && node scripts\/stare-probe-ecran\.mjs$/); assert.equal(pk.scripts["test:v100377"], "node scripts/proba-v100377.mjs");
});

console.log(`\n${teste - picate} din ${teste} au trecut\n`);
process.exit(picate ? 1 : 0);
