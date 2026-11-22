// Proba v100.375 (21.11.2026, el: „optimizează vizual pagina botului… design, layout” ⇒ „fa idei și tot restul”): restul paginii Tabloului.
//   A  rândurile pliate stau pe capitole (Decizia, Riscul, Banii, Piața, Jurnalul și dovada) - fiecare rând are capitolul lui, niciunul uitat;
//   B  cele 4 cifre: pe un rând când banda are toată lățimea; pe telefon registru (numele în stânga, cifra în dreapta);
//   C  telefonul: lista „Ce spune piața acum” o singură dată, în capitolul ei; pliurile vechi ca restul rândurilor;
//   D  doar așezare: nicio culoare nouă, literele pe scara casei, pagina „niciun bot” neatinsă; versiunea.
//   node scripts/proba-v100375.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.375 · Tabloul botului: rândurile pe capitole, banda celor 4 cifre, telefonul · proba\n");

const HTML = citeste("public", "index.html"), CSS = citeste("public", "app.css");
const A0 = "/* v100.375 design: început */", A1 = "/* v100.375 design: sfârșit */";
const BLOC = CSS.slice(CSS.indexOf(A0), CSS.indexOf(A1));
const faraComentarii = BLOC.replace(/\/\*[\s\S]*?\*\//g, "");
/* regulile blocului, cu @media desfăcut: [{ sel, decl, media }] */
function reguli(css) {
  const out = []; let media = "", i = 0;
  while (i < css.length) {
    const a = css.indexOf("{", i); if (a < 0) break;
    const cap = css.slice(i, a).trim();
    if (cap.startsWith("@media")) { media = cap; i = a + 1; continue; }
    if (cap.startsWith("}")) { media = ""; i = i + css.slice(i).indexOf("}") + 1; continue; }
    const b = css.indexOf("}", a); out.push({ sel: cap.replace(/\s+/g, " "), decl: css.slice(a + 1, b).trim(), media }); i = b + 1;
  }
  return out;
}
const R = reguli(faraComentarii);
const ordinea = (id) => { const r = R.filter((x) => new RegExp("(^|[ >])" + id.replace(/[.#-]/g, "\\$&") + "$").test(x.sel) && /^order:\d+!important$/.test(x.decl)); assert.equal(r.length, 1, id + ": " + r.length + " reguli de ordine"); return Number(/\d+/.exec(r[0].decl)[0]); };

/* capitolele, așa cum au fost hotărâte: titlul și rândurile lui, în ordine */
const CAPITOLE = [
  ["#tbCap-decizia", "Decizia", ["#tbTodo", "#tbSemaforCard", "#tbMotive", "#tbPl-sfaturi", "#tbPl-plan"]],
  ["#tbCap-risc", "Riscul", ["#tbConcret", "#tbScenariiCard", "#tbMcSus", "#tbPl-risc", "#tbPl-prob"]],
  ["#tbCap-bani", "Banii", ["#tbBaniCard", "#tbAcumCard", "#tbPl-sapt", "#tbPl-fisa", "#tbPl-port", ".contTot"]],
  /* v100.377 (el 22.11: „nici vremea monedei nu mai e sub chart”): „Trendul pe TF-uri” stă iar sub grafic, nu în capitolul Piața (proba v100.377, J3) */
  ["#tbCap-piata", "Piața", ["#tbCitireCard", ".piataAzi", "#tbIdei", "#tbGridNou"]],
  ["#tbCap-jurnal", "Jurnalul și dovada", ["#tbPl-alerte", "#tbPl-avert", "#tbPl-socoteala"]],
];

await test("A1 cele cinci titluri de capitol sunt în pagină, o dată fiecare, copii ai cadrului (lângă pliurile vechi), cu numele și rândul lor mic", () => {
  for (const [id, nume] of CAPITOLE) {
    const m = HTML.match(new RegExp('<h3 class="tbCap" id="' + id.slice(1) + '">([^<]+)<span>([^<]+)</span>(?:<em class="tbCapAzi" id="tbCapAzi-[a-z]+"></em>)?</h3>', "g")) || [];
    assert.equal(m.length, 1, id); assert.ok(m[0].includes(">" + nume + "<span>"), id + " se numește „" + nume + "”");
  }
  assert.match(HTML, /(<h3 class="tbCap" id="tbCap-[a-z]+">[^<]+<span>[^<]+<\/span>(?:<em class="tbCapAzi" id="tbCapAzi-[a-z]+"><\/em>)?<\/h3>){5}<details class="tbPl" id="tbPl-prob"/,   /* v100.376: și locul cifrei de azi */ "titlurile stau la rând, chiar înaintea unui copil direct al cadrului");
});

await test("A2 fiecare capitol: titlul întâi, apoi rândurile lui, în ordinea hotărâtă; capitolele nu se încalecă; Decizia, Riscul, Banii, Piața, Jurnalul", () => {
  let sfarsit = 0;
  for (const [id, nume, randuri] of CAPITOLE) {
    const t = ordinea(id); assert.ok(t > sfarsit, nume + " începe după capitolul dinainte (" + t + " > " + sfarsit + ")");
    let u = t; for (const r of randuri) { const o = ordinea(r); assert.ok(o > u, nume + ": " + r + " (" + o + ") vine după " + u); u = o; }
    sfarsit = u;
  }
  assert.ok(sfarsit < 990, "„Măsurile, dovada și cum se citesc” (ordinea 990) rămâne ultimul");
  assert.ok(ordinea("#tbCap-decizia") > 100, "capitolele vin după cifre, grafic și detaliile cifrelor (ordinile lor sunt sub 100)");
});

await test("A3 niciun rând uitat: fiecare pliu vechi (details.tbPl) din pagină are capitol; copia de telefon a listei stă pe locul rândului ei", () => {
  const toate = new Set(CAPITOLE.flatMap((c) => c[2]));
  const pliuri = [...HTML.matchAll(/<details class="tbPl" id="(tbPl-[a-z]+)"/g)].map((m) => "#" + m[1]);
  assert.ok(pliuri.length >= 10, "pliurile vechi: " + pliuri.length);
  for (const p of pliuri) assert.ok(toate.has(p), p + " n-are capitol - pune-l în CAPITOLE și dă-i ordine în foaia de stil");
  for (const id of ["tbTodo", "tbSemaforCard", "tbMotive", "tbConcret", "tbScenariiCard", "tbMcSus", "tbBaniCard", "tbAcumCard", "tbTrendCard", "tbCitireCard", "tbIdei", "tbGridNou"]) assert.ok(HTML.includes('id="' + id + '"'), id + " există în pagină");
  assert.equal(ordinea("#tbCitireMobil"), ordinea("#tbCitireCard"));
});

await test("A4 „Dacă prețul ajunge la…” și „Banii botului” merg fiecare la capitolul lui, pliate sau deschise: învelitoarea lor se dă la o parte mereu, cartelele țin toată lățimea", () => {
  const r = R.filter((x) => x.decl === "display:contents!important"); assert.equal(r.length, 1);
  const s = r[0].sel.split(/,\s*(?=html)/); assert.equal(s.length, 2); assert.match(s[0], /\.tbCadru>\.tbGrilaNoua$/); assert.match(s[1], /\.tbCadru>\.tbGrilaNoua>:is\(\.tbMain,\.tbSideNou\)$/);
  assert.equal(/:has\(|data-rand/.test(r[0].sel), false, "fără condiție pe pliat / deschis: rândul deschis nu sare la sfârșitul capitolului");
  const c = R.filter((x) => /:is\(#tbScenariiCard,#tbBaniCard\)$/.test(x.sel)); assert.equal(c.length, 1); assert.match(c[0].decl, /^grid-column:1 \/ -1!important;grid-row:auto!important/);
  assert.ok(ordinea("#tbScenariiCard") < ordinea("#tbCap-bani") && ordinea("#tbBaniCard") > ordinea("#tbCap-bani"));
});

await test("B1 cele 4 cifre pe un rând când banda are toată lățimea („Contează acum” n-are nimic de spus), la 1181–1699 px; a treia își recapătă linia din stânga", () => {
  const r = R.filter((x) => x.media === "@media (min-width:1181px) and (max-width:1699px)"); assert.equal(r.length, 2);
  assert.match(r[0].sel, /:has\(>#ctAcum:not\(\[hidden\]\) \.ctGol\)>\.tbSus>#tbKpi$/); assert.match(r[0].decl, /^grid-template-columns:minmax\(0,1\.6fr\) repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(r[1].sel, /\.ctGol\)>\.tbSus #tbKpi>\.tbKpiCel:nth-child\(3\)$/); assert.match(r[1].decl, /border-left:1px solid var\(--pzLi\)/);
});

await test("B2 telefonul (≤ 640 px): registrul cifrelor - o cifră pe rând, numele în stânga și cifra în dreapta pe același rând, rândurile ei dedesubt pe toată lățimea", () => {
  const T = R.filter((x) => x.media === "@media (max-width:640px)"), una = (re) => { const r = T.filter((x) => re.test(x.sel)); assert.equal(r.length, 1, String(re)); return r[0].decl; };
  assert.match(una(/>\.tbSus>#tbKpi$/), /^grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(una(/#tbKpi>\.tbKpiCel$/), /display:grid;grid-template-columns:minmax\(0,1fr\) auto;/);
  assert.equal(una(/#tbKpi>\.tbKpiCel>\*$/), "grid-column:1 / -1;min-width:0");
  assert.equal(una(/#tbKpi>\.tbKpiCel>\.tbEt2$/), "grid-column:1;grid-row:1");
  assert.match(una(/#tbKpi>\.tbKpiCel>:is\(\.tbKpiVal,\.tbKpiRand\)$/), /^grid-column:2;grid-row:1;justify-self:end/);
});

await test("C1 sub 1181 px lista „Ce spune piața acum” nu se mai arată de două ori: rămâne copia deschisă, în capitolul Piața; rândul pliat cu aceeași listă se ascunde", () => {
  const r = R.filter((x) => x.media === "@media (max-width:1180px)"); assert.equal(r.length, 1);
  assert.match(r[0].sel, /#tbCitireCard:not\(\[hidden\]\)$/); assert.equal(r[0].decl, "display:none!important");
  assert.match(CSS, /@media \(max-width:1180px\)\{#tabloubot #tbCitireCard\{display:none\}#tabloubot \.tbCitireMobil\{display:block;/, "regula veche (lista deschisă pe telefon) e la locul ei");
  const o = ordinea("#tbCitireMobil"); assert.ok(o > ordinea("#tbCap-piata") && o < ordinea("#tbCap-jurnal"));
});

await test("C2 pliurile vechi pe telefon: titlul sus, rezumatul dedesubt pe cel mult două rânduri; pe orice lățime rezumatul nu mai e îngroșat", () => {
  const T = R.filter((x) => x.media === "@media (max-width:640px)" && /details\.tbPl>summary/.test(x.sel)); assert.equal(T.length, 3);
  assert.match(T.find((x) => /summary>\.tbSub$/.test(x.sel)).decl, /flex:0 0 100%;.*-webkit-line-clamp:2/);
  assert.equal(R.find((x) => !x.media && /details\.tbPl>summary>\.tbSub$/.test(x.sel)).decl, "font-weight:400");
});

await test("D1 doar așezare: nicio culoare scrisă direct, literele pe scara casei (12 / 13,5 / 15 / 20 / 30), blocul stă înaintea celui v100.374", () => {
  assert.ok(BLOC.length > 2000 && CSS.indexOf(A0) > 0 && CSS.indexOf(A0) < CSS.indexOf("/* v100.374 design"), "blocul v100.375, înaintea celui v100.374");
  assert.equal(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(faraComentarii.replace(/#tb[A-Za-z][\w-]*|#ctAcum|#tabloubot/g, "")), false, "culoare directă");
  for (const m of faraComentarii.matchAll(/font-size:([\d.]+)px/g)) assert.ok([12, 13.5, 15, 20, 30].includes(Number(m[1])), "font-size " + m[1]);
  for (const m of faraComentarii.matchAll(/(?:color|border-top|border-left):[^;}]*var\((--[\w]+)\)/g)) assert.ok(/^--pz(T0|T1|T2|Li)$/.test(m[1]), m[1]);
});

await test("D2 pagina „niciun bot pornit” rămâne neatinsă: titlurile sunt ascunse de la bază și toate regulile de așezare cer bot pornit", () => {
  assert.ok(R.some((x) => x.sel === "#tabloubot .tbCap" && x.decl === "display:none"));
  for (const x of R) if (/order:|display:contents|display:flex/.test(x.decl) && /\.tbCadru/.test(x.sel)) assert.ok(x.sel.split(/,\s*(?=html)/).every((s) => s.includes(".on:not(.tbFaraBot) .tbCadru")), x.sel.slice(0, 120));   /* lista de selectori se desparte la „, html” - virgula din :is(.tbMain,.tbSideNou) nu e despărțitor */
});

await test("D3 versiunea v100.375 e pusă peste tot și proba e în lanț, după v100.374", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 375, "package.json: de la 100.375 încolo"); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 375); assert.ok(bi.tb375 && bi.tb375.length > 200, "BUILD_INFO.tb375");
  assert.equal((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 375).length >= 4, true, "index.html: v100.375 sau mai nou, de cel puțin 4 ori");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 375, "sw.js"); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 375, "versiune.js");
  assert.match(pk.scripts.test, /npm run test:v100374 && npm run test:v100375/); assert.equal(pk.scripts["test:v100375"], "node scripts/proba-v100375.mjs");
});

console.log(`\n${teste - picate} din ${teste} au trecut\n`);
process.exit(picate ? 1 : 0);
