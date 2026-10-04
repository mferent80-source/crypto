// Proba v100.92 / colector v101.62 (04.10, el: „fa tot” pe I-517…I-526, planul docs/superpowers/plans/2026-10-04-structura-si-verdict.md):
// lotul A - I-518 cartela Busola unică (un singur producător: starea, intervalul, rândul scurt), I-524 distanța propunerii față de intervalul
// Busolei, I-517 blocul „Pe zi, la închidere, ce știm” în 3 grupuri, I-519 fișa cu verdict lipicios și secțiuni pliate pe telefon.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { situatii, verifica, STRICT } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
const B = new Function(`${lib("busola.js")}; return Busola;`)();
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.92 · structură și verdict (I-517…I-526)");

const ORA = 3600000, ACUM = Date.UTC(2026, 9, 4, 6, 0), LA = ACUM - 2 * ORA;
const REZ = (o) => Object.assign({ la: LA, versiune: "1.41.0",
  monede: { AAVE: { grid4h: "miscare", fisa4h: { jos: 159.35, sus: 201.927, linii: 17 } }, LIT: { perp4h: "liniste", fisa4h: { jos: 3.009, sus: 4.224, linii: 17 } }, PUMP: { perp4h: "nu-stiu" }, SOL: { perp4h: "nemasurat" } },
  grid: { interval: "4h", canal: "±2×ATR", miscare: -0.011341049, liniste: -0.0081260081, oricand: -0.0094456786, dovedit: true, miscareDovedita: true, canal4h: "+4,2/−3,9 ATR", fisa4hLa: LA },
  perp: { la: LA, monede: 102, prag: 200000, bilant: { verdict: "prea puține" } } }, o || {});
const cuVerdict = (v) => REZ({ perp: { ...REZ().perp, bilant: { verdict: v } } });

// ---- lotul A: I-524 comparația ----
await test("(A) I-524 comparaInterval: propunerea LIT 3.177–3.962 față de Busola 3.009–4.224 ⇒ „cu 35% mai îngust”; mai larg; ±10% ⇒ „cam la fel”; date lipsă ⇒ null", () => {
  assert.equal(typeof B.comparaInterval, "function", "lipsește Busola.comparaInterval");
  const c = B.comparaInterval({ jos: 3.009, sus: 4.224 }, 3.177, 3.962);
  assert.equal(Math.round(c.raport * 100), -35); assert.equal(c.text, "intervalul tău e cu 35% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot)");
  assert.equal(B.comparaInterval({ jos: 100, sus: 110 }, 95, 118).text, "intervalul tău e cu 130% mai larg decât al Busolei (al ei a pierdut cel mai puțin, pe spot)");
  assert.equal(B.comparaInterval({ jos: 100, sus: 120 }, 101, 122).text, "intervalul tău e cam la fel de larg ca al Busolei");
  assert.equal(B.comparaInterval({ jos: 100, sus: 120 }, 0, 122), null); assert.equal(B.comparaInterval(null, 1, 2), null);
});
await test("(A) I-524 randFisa cu propunerea: rândul din fișă capătă `comparatie`; fără propunere ⇒ fără", () => {
  const r = B.randFisa(REZ(), "LIT_USDT_PERP", ACUM, String, { jos: 3.177, sus: 3.962 });
  assert.equal(r.comparatie, "intervalul tău e cu 35% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot)"); assert.equal(r.scurt, "jos 3.009 · sus 4.224 · 17 linii");
  assert.equal(B.randFisa(REZ(), "LIT", ACUM, String).comparatie, null);
  assert.ok(fnApp("grBusolaFisaHtml").includes("{jos:st.jos,sus:st.sus}") && fnApp("grBusolaFisaHtml").includes("r.comparatie"), "fișa nu dă propunerea și nu arată comparația");
});
// ---- lotul A: I-518 cartela ----
await test("(A) I-518 Busola.cartela: un singur producător - eticheta (starea + nota), intervalul (cu comparația față de gridul botului), rândul scurt; fără rezumat ⇒ null", () => {
  assert.equal(typeof B.cartela, "function", "lipsește Busola.cartela");
  const c = B.cartela(REZ(), "AAVE.PERP", ACUM, { kv: { stare: "miscare", de: ACUM - 8 * ORA }, pret: String, prop: { jos: 170, sus: 190 } });
  assert.deepEqual(c.eticheta, { stare: "miscare", nivel: "atentie", text: "mai agitată ca de obicei", nota: "de 8 h · măsurat acum 2 h" });
  assert.ok(c.interval.text.endsWith("jos 159.35 · sus 201.927 · 17 linii"), c.interval.text); assert.equal(c.interval.scurt, "jos 159.35 · sus 201.927 · 17 linii"); assert.equal(c.interval.comparatie, "intervalul tău e cu 53% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot)");
  assert.equal(c.rand, "AAVE mai agitată de 8 h");
  const p = B.cartela(REZ(), "PUMP", ACUM, {}); assert.equal(p.eticheta.text, "nimic neobișnuit"); assert.equal(p.interval, null); assert.equal(p.rand, "PUMP nimic neobișnuit");
  assert.equal(B.cartela(null, "AAVE", ACUM, {}), null);
});
await test("(A) I-518 htmlCartela: rândurile în forma Tabloului (tbLinie) - starea cu nota și culoarea, intervalul cu comparația; fără interval ⇒ un singur rând", () => {
  assert.equal(typeof B.htmlCartela, "function", "lipsește Busola.htmlCartela");
  const h = B.htmlCartela(B.cartela(REZ(), "AAVE", ACUM, { kv: { stare: "miscare", de: ACUM - 8 * ORA }, pret: String, prop: { jos: 170, sus: 190 } }), esc);
  assert.equal(text(h), "Busola, pe 4h de 8 h · măsurat acum 2 h mai agitată ca de obicei Intervalul Busolei (4h) intervalul tău e cu 53% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot) jos 159.35 · sus 201.927 · 17 linii");
  assert.match(h, /<b class="tbWarn">mai agitată ca de obicei<\/b>/); assert.equal((h.match(/class="tbLinie"/g) || []).length, 2);
  assert.equal((B.htmlCartela(B.cartela(REZ(), "PUMP", ACUM, {}), esc).match(/class="tbLinie"/g) || []).length, 1);
  assert.equal(B.htmlCartela(null, esc), "");
});
// ---- lotul A: I-517 grupurile ----
await test("(A) I-517 Tabloul: blocul „Pe zi, la închidere, ce știm” în 3 grupuri - Azi / Dacă închizi acum / Contextul, Busola (cartela) în Contextul; tbGrup + CSS", () => {
  const ex = fnApp("tbDeseneazaExtra"), a = citeste("public", "app.js");
  const i1 = ex.indexOf('tbGrup("Azi")'), i2 = ex.indexOf('tbGrup("Dacă închizi acum")'), i3 = ex.indexOf('tbGrup("Contextul")'), ib = ex.indexOf("h+=tbBusolaLinie(b);"), ig = ex.indexOf('linie("Grile, ultimele 24 h"'), ii = ex.indexOf("Dacă îl închizi acum, iei");
  assert.ok(i1 >= 0 && i2 > i1 && i3 > i2, "cele 3 grupuri, în ordine"); assert.ok(i1 < ig && ig < i2 && i2 < ii && ii < i3 && i3 < ib, "grilele sub „Azi”, „iei” sub „Dacă închizi”, Busola sub „Contextul”");
  assert.ok(/^function tbGrup\(t\)\{/m.test(a) && /#tabloubot \.tbGrup\{/.test(citeste("public", "app.css")), "tbGrup + CSS");
  assert.ok(fnApp("tbBusolaLinie").includes("Busola.htmlCartela(Busola.cartela("), "cartela unică pe Tablou");
});
// ---- lotul A: I-519 fișa ----
await test("(A) I-519 fișa: grPliabil - toate secțiunile se pliază pe telefon în afară de „Setările de pus în Pionex”; grPliazaPeTelefon după desen; verdictul lipicios", () => {
  const a = citeste("public", "app.js"), ctx = {}; vm.createContext(ctx); vm.runInContext(fnApp("grPliabil") + "\n;this.f=grPliabil;", ctx);
  assert.equal(ctx.f("Setările de pus în Pionex"), false); assert.equal(ctx.f("Poarta de pornire"), false);   /* revizia Opus: Poarta e faptă, rămâne deschisă */ assert.equal(ctx.f("Ce spune istoricul tău"), true); assert.equal(ctx.f(""), false);
  assert.ok(/^function grPliazaPeTelefon\(box\)\{/m.test(a), "lipsește grPliazaPeTelefon");
  const rg = fnApp("renderGrid"); assert.ok(/box\.innerHTML=h;grPliazaPeTelefon\(box\)/.test(rg), "plierea nu se cheamă imediat după desen");
  /* poza de la 390 (04.10): dispatch-ul data-action-click nu acceptă `this` ca argument (v54ActionArg) ⇒ cheia secțiunii se dă ca text ('3'), iar funcția o caută după data-gr-sect */
  assert.ok(/^function grPliereComuta\(k\)\{/m.test(a), "grPliereComuta primește cheia secțiunii (text), nu elementul");
  const pl = fnApp("grPliazaPeTelefon"); assert.ok(pl.includes(`s.setAttribute("data-gr-sect",String(i))`) && pl.includes(`cap.setAttribute("data-action-click","grPliereComuta('"+i+"')")`), "secțiunea nu-și primește cheia / acțiunea cu text");
  assert.ok(!/grPliereComuta\(this\)/.test(a), "argumentul `this` nu e acceptat de dispatch (eroare în consolă pe telefon)");
  const css = citeste("public", "app.css"); assert.ok(/\.grVerdict\{[^}]*position:sticky/.test(css) && /@media \(max-width:600px\)\{[^\n]*#gridset \.grPliat>/.test(css), "CSS: verdict lipicios + pliere doar sub 600 px (pragul fișei)");   /* v100.93 (A1): regulile stau în același bloc @media */
});

// ======== lotul B: I-525 dunga după istoricul lui, I-520 Trading 212 pe file, I-521 Acasă pe 3 coloane ========
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)());
const REV = (o) => Object.assign({ cadere: 0.62, deLaMin: 0.28, zileDeLaMin: 6, revine: true }, o || {});
const IST = (n, pePlus, total) => ({ n: n, pePlus: pePlus, total: total });
function sugestii(rev, sh) {
  const ctx = { Reveniri: { textDovada: () => "dovada", textBoti: () => "", TEXT_SUPRAVIETUITORI: "" }, Idei: { reveniriBoti: () => rev, shortBoti: () => sh }, GridCalcul: { procent: (v) => (v * 100).toFixed(1).replace(".", ",") + "%" }, escapeHtml: esc, TextRo: globalThis.TextRo };
  vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "tbIstoricRosu") + "\n" + fnDin("t212-ecran.js", "tbIstoricBoti") + "\n" + fnDin("t212-ecran.js", "tbSugestiiCorp") + "\n;this.f=tbSugestiiCorp;", ctx);
  return ctx.f({ la: 1, monede: [{ revenire: REV() }] }, null, []);
}
await test("(B) I-525 listele de revenire/short: istoricul tău pe minus (≥ 3 boți, regula candidaților) ⇒ dunga roșie și istoricul pe roșu; altfel după piață (verde), istoricul gri", () => {
  const h = sugestii([{ moneda: "POWER", revenire: REV(), istoric: IST(17, 10, -173.55) }, { moneda: "AKE", revenire: REV(), istoric: IST(2, 0, -5) }], [{ moneda: "LIT", dir: "short", istoric: IST(5, 4, 12.3) }, { moneda: "Q", dir: "short", istoric: IST(3, 1, -0.5) }]);
  const rand = (m) => { const i = h.indexOf("<b>" + m + "</b>"); assert.ok(i >= 0, "lipsește rândul " + m); return h.slice(Math.max(0, i - 120), i + 320); };
  assert.match(rand("POWER"), /tbDunga r"/); assert.match(rand("POWER"), /<p class="bad">istoricul tău: 17 boți, 10 pe plus, −173,55 USDT<\/p>/);
  assert.match(rand("AKE"), /tbDunga v"/); assert.match(rand("AKE"), /<p>istoricul tău: 2 boți, 0 pe plus, −5,00 USDT<\/p>/);
  assert.match(rand("LIT"), /tbDunga v"/); assert.match(rand("LIT"), /<p>istoricul tău: 5 boți/);
  assert.match(rand("Q"), /tbDunga r"/); assert.match(rand("Q"), /<p class="bad">istoricul tău: 3 boți, 1 pe plus, −0,50 USDT<\/p>/);
});
await test("(B) I-520 Trading 212: t212File - 3 file cu numărul în titlu, fila aleasă apăsată și vizibilă, celelalte ascunse; t212FilaAleasa din localStorage (implicit „idei”)", () => {
  const ctx = { escapeHtml: esc, localStorage: { getItem: (k) => (k === "t212Fila" ? "revenire" : null), setItem() {} } }; vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "t212File") + "\n" + fnDin("t212-ecran.js", "t212FilaAleasa") + "\n;this.f=t212File;this.g=t212FilaAleasa;", ctx);
  const h = ctx.f([{ k: "idei", t: "Idei", n: 23, h: "<i>a</i>" }, { k: "revenire", t: "Pe revenire", n: 9, h: "<i>b</i>" }, { k: "socoteala", t: "Socoteala sfaturilor", n: null, h: "<i>c</i>" }], "revenire");
  assert.equal((h.match(/class="tbIntBtn"/g) || []).length, 3);
  assert.match(h, /<button type="button" class="tbIntBtn" aria-pressed="false" data-action-click="t212FilaAlege\('idei'\)">Idei · 23<\/button>/);
  assert.match(h, /aria-pressed="true" data-action-click="t212FilaAlege\('revenire'\)">Pe revenire · 9<\/button>/);
  assert.match(h, /aria-pressed="false" data-action-click="t212FilaAlege\('socoteala'\)">Socoteala sfaturilor<\/button>/);
  assert.match(h, /<div class="t212Fila" data-fila="idei" hidden><i>a<\/i><\/div>/); assert.match(h, /<div class="t212Fila" data-fila="revenire"><i>b<\/i><\/div>/); assert.match(h, /data-fila="socoteala" hidden>/);
  assert.equal(ctx.g(), "revenire");
  ctx.localStorage.getItem = () => "altceva"; assert.equal(ctx.g(), "idei");
});
await test("(B) I-520 pagina: t212IdeiRender pune ideile, revenirea și socoteala în file (notele la fila lor), lista „Urmăresc și” sub file; Acasă deschide fila potrivită (acasaMergiLa cu fila); CSS", () => {
  const s = lib("t212-ecran.js"), r = fnDin("t212-ecran.js", "t212IdeiRender");
  assert.ok(/h \+= t212File\(\[/.test(r) && r.includes('k: "idei"') && r.includes('k: "revenire"') && r.includes('k: "socoteala"'), "cele 3 file din t212IdeiRender");
  assert.ok(r.indexOf("t212File(") < r.indexOf('class="t212Lista"'), "lista „Urmăresc și” sub file");
  assert.ok(/^function t212FilaAlege\(k\)/m.test(s), "lipsește t212FilaAlege");
  const a = fnDin("acasa-ecran.js", "acasaMergiLa"); assert.ok(/^function acasaMergiLa\(ecran, id, fila\)/.test(a) && a.includes("t212FilaAlege(fila)"), "acasaMergiLa nu deschide fila");
  const css = citeste("public", "app.css"); assert.ok(/\.t212File\{/.test(css), "CSS .t212File");
  /* poza de la 1920 (04.10): butoanele ieșeau ca trei bare pe toată lățimea - .tbIntBtn e stilat doar sub #tabloubot / #gridset / .t212Graf */
  assert.ok(/\.t212File \.tbIntBtn\{[^}]*width:auto[^}]*flex:0 0 auto/.test(css) && /\.t212File \.tbIntBtn\[aria-pressed="true"\]\{/.test(css), "filele n-au stilul de buton de filă (width:auto, apăsat)");
});
const SH = (s, scor, o) => Object.assign({ simbol: s + "_USDT_PERP", volum: 10, stare: "candidat", dir: "short", tarie: "mediu", scor: scor, latime: 0.15, profitGrila: 0.0026, traversariZi: 20, revenire: REV({ revine: false }) }, o || {});
const CLB = { la: 5, monede: [{ simbol: "AKE_USDT_PERP", volum: 90, stare: "evita", dir: "long", scor: 9, revenire: REV({ cadere: 0.79 }) }, SH("Q", 5, { volum: 30, revenire: REV() }), SH("LIT", 7)] };
const IIB = { idei: { idei: { zi: "2026-10-04", judecate: 202, trecute: 2, actiuni: [{ simbol: "TE" }, { simbol: "LNKS" }], reveniri: [{ simbol: "LAES" }], dovadaReveniri: { eticheta: "cam la fel" } } } };
function acasa() {
  const ctx = { escapeHtml: esc, Idei: ID }; vm.createContext(ctx);
  vm.runInContext(["acClasamentSumar", "acasaCumpar", "acasaCumpar2", "acasaCumpar2Corp", "acasaCumpar2Parti"].map((f) => fnDin("acasa-ecran.js", f)).join("\n") + "\n;this.f=acasaCumpar;this.g=acasaCumpar2;", ctx);
  return ctx;
}
await test("(B) I-521 Acasă: „Ce aș cumpăra azi” pe 3 coloane - acțiuni / boți / revenire și short, fiecare cu butonul ei; nota „aș sări peste ea” doar sub a treia; rândul vechi (acasaCumpar2) neschimbat", () => {
  const c = acasa(), d = { ...IIB, clasament: CLB, sugestii: null }, h = c.f(d);
  assert.equal((h.match(/class="acCumparCol"/g) || []).length, 3, h);
  const col = h.split('<div class="acCumparCol">');
  assert.ok(text(col[1]).startsWith("Acțiuni") && col[1].includes("<b>TE, LNKS</b>") && col[1].includes("acasaMergiLa('t212','t212Idei','idei')"), text(col[1]));
  assert.ok(text(col[2]).startsWith("Boți") && col[2].includes("acasaMergiLa('tabloubot','tbIdei')"), text(col[2]));
  assert.ok(text(col[3]).startsWith("Revenire și short") && col[3].includes("<b>LAES</b>") && col[3].includes("<b>AKE, Q</b>") && col[3].includes("<b>LIT, Q</b>") && col[3].includes("acasaMergiLa('t212','t212Idei','revenire')"), text(col[3]));
  assert.match(col[3], /<p class="tbWarn">⚠ Q e și pe revenire, și la short: aș sări peste ea<\/p>/);
  assert.ok(!col[1].includes("⚠") && !col[2].includes("⚠"), "nota doar sub coloana ei");
  assert.equal(text(c.g(d)), "↩️ pe revenire: acțiunile LAES (cam la fel) · monedele AKE, Q · 📉 short: LIT, Q · ⚠ Q e și pe revenire, și la short: aș sări peste ea");
  assert.ok(/#dash \.acCumparCol3\{/.test(citeste("public", "app.css")), "CSS acCumparCol3");
});

// ======== lotul C: I-523 semaforul cu bilanțul pazei, I-522 Radar vs Busola în Consiliu; lotul D: I-526 verdict-titlu dimineața ========
globalThis.GridCalcul = globalThis.GridCalcul || new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const S = new Function(`${lib("semnale-bot.js")}; return SemnaleBot;`)(); globalThis.SemnaleBot = S;
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();
const BOT = { id: "1", baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, pretCurent: 0.3907, gridJos: 0.3841, gridSus: 0.4331, distantaLichidarePct: 30 };
const BZ = (stare, verdict, dif, monede) => ({ stare: stare, bilant: verdict ? { verdict: verdict, dif: dif === undefined ? -0.0017 : dif, monede: monede === undefined ? 24 : monede } : null });
await test("(C) I-523 semaforul: „mai agitată” + bilanț „dovedit” cu cifră ⇒ motiv de ATENȚIE (cod busola) cu cifra; „pe dos” / „prea puține” / fără cifră / calm / fără Busola ⇒ nimic; niciodată IEȘI", () => {
  const r = S.semafor({ bot: BOT, fisa: null, busola: BZ("miscare", "dovedit") });
  assert.equal(r.nivel, "atentie"); assert.equal(r.cod, "busola"); assert.equal(r.motiv, "Busola: după agitație gridul pierde −0,17 pp pe episod");   /* v100.93 (A2) */
  assert.equal(r.faCe, "N-aș adăuga bani cât ține agitația; aș verifica stopul botului în Pionex."); assert.equal(r.deCe, "Busola a măsurat pe date noi: după „mai agitat” gridul a pierdut mai mult decât oricând (24 de monede).");
  for (const bz of [BZ("miscare", "pe dos"), BZ("miscare", "prea puține"), BZ("miscare", "n-am aflat"), BZ("miscare", "dovedit", null), BZ("liniste", "dovedit"), BZ("nu-stiu", "dovedit"), null, { stare: "miscare", bilant: null }])
    assert.ok(!S.semafor({ bot: BOT, fisa: null, busola: bz }).componente.some((k) => k.cod === "busola"), JSON.stringify(bz));
  assert.ok(lib("semnale-bot.js").includes('busola: "Busola: după agitație gridul pierde mai mult"'), "NUME_SFAT fără busola (socoteala pe cod)");   /* v100.93 (A2): textul nou */
});
await test("(C) Busola.pentruVerdict: starea + bilanțul (verdict, dif, monede) din rezumatul proaspăt; rezumat vechi (> 4,5 h), lipsă sau monedă neurmărită ⇒ null; fără bilanț ⇒ bilant null", () => {
  const v = B.pentruVerdict(REZ({ perp: { la: LA, monede: 102, prag: 200000, bilant: { verdict: "dovedit", dif: -0.0017, monede: 24, judecate: 300 } } }), "AAVE.PERP", ACUM);
  assert.deepEqual(v, { stare: "miscare", bilant: { verdict: "dovedit", dif: -0.0017, monede: 24 } });
  assert.deepEqual(B.pentruVerdict(cuVerdict("prea puține"), "LIT_USDT_PERP", ACUM), { stare: "liniste", bilant: { verdict: "prea puține", dif: null, monede: 0 } });
  assert.equal(B.pentruVerdict(REZ(), "AAVE", ACUM + 5 * ORA), null); assert.equal(B.pentruVerdict(null, "AAVE", ACUM), null); assert.equal(B.pentruVerdict(REZ(), "ZZZ", ACUM), null);
  assert.equal(B.pentruVerdict(REZ({ perp: { la: LA, monede: 1, prag: 1 } }), "AAVE", ACUM).bilant, null);
});
await test("(C) I-522 Consiliul: un rând doar când Radarul (regimul fișei) și Busola se contrazic, ≤ 110; de acord sau fără una din ele ⇒ nimic; verdictul neatins", () => {
  const sm = S.semafor({ bot: BOT, fisa: null }), x = (busola, regim) => CS.alcatuieste({ sm: sm, concret: [], sfaturi: [], busola: busola, regim: regim });
  assert.equal(x({ stare: "miscare" }, { miscare: false }).busolaVsRadar, "Radarul: liniște (4h/24h față de obișnuit) · Busola: mai agitată (ATR 4h față de un an) — orizonturi diferite");
  assert.equal(x({ stare: "liniste" }, { miscare: true }).busolaVsRadar, "Radarul: mișcare (4h/24h față de obișnuit) · Busola: mai calmă (ATR 4h față de un an) — orizonturi diferite");
  assert.ok(x({ stare: "miscare" }, { miscare: false }).busolaVsRadar.length <= 110);
  for (const [b, r] of [[{ stare: "miscare" }, { miscare: true }], [{ stare: "liniste" }, { miscare: false }], [{ stare: "nu-stiu" }, { miscare: true }], [null, { miscare: true }], [{ stare: "miscare" }, null]]) assert.equal(x(b, r).busolaVsRadar, null, JSON.stringify([b, r]));
  assert.equal(x({ stare: "miscare" }, { miscare: false }).nivel, x(null, null).nivel, "verdictul neatins");
});
await test("(C) pagina + colectorul: semaforul și Consiliul primesc Busola (pentruVerdict) și regimul fișei; Consiliul desenează rândul 🧭; cheiaBot importată în colector", () => {
  const a = citeste("public", "app.js"), col = citeste("scripts", "colector.mjs");
  assert.ok(/^function tbBusolaVerdict\(b\)\{/m.test(a) && a.includes("Busola.pentruVerdict(Busola.rezumat(),tbCheieBusola(b),Date.now())"), "tbBusolaVerdict");
  assert.ok(/var sm=SemnaleBot\.semafor\(\{bot:b,fisa:f,[^\n]*busola:tbBusolaVerdict\(b\)/.test(a), "semaforul paginii fără Busola");
  assert.ok(/var cons=Consiliu\.alcatuieste\(\{sm:sm,concret:conc,[^\n]*busola:tbBusolaVerdict\(b\),regim:f&&f\.regim\?\{miscare:!!f\.regim\.miscare\}:null/.test(a), "Consiliul paginii fără Busola/regim");
  assert.ok(fnApp("tbConsHtml").includes("c.busolaVsRadar?'<p class=\"tbConsDeCe tbSub\">🧭 '"), "rândul 🧭 nedesenat");
  assert.ok(col.includes('import { pazaPas, notaVeche, pentruServer, cheiaBot } from "./lib/paza-boti.mjs"') && col.includes("busola: Busola.pentruVerdict(Busola.rezumat(), cheiaBot(b), acum)") && col.includes("busola: x.busola, regim: f && f.regim ? { miscare: !!f.regim.miscare } : null"), "colectorul: semafor/Consiliu fără Busola");
});
await test("(C) garda: situațiile noi (semafor.busola, consiliu.busolaVsRadar ×2) există și trec regulile STRICT", () => {
  const s = situatii().filter((x) => /^semafor\.busola\b/.test(x.sursa) || /^consiliu\.busolaVsRadar/.test(x.sursa));   /* sursa poartă sufixul câmpului */
  assert.ok(s.some((x) => /^semafor\.busola\b/.test(x.sursa)) && s.filter((x) => /^consiliu\.busolaVsRadar/.test(x.sursa)).length >= 2, "situații: " + s.map((x) => x.sursa).join(","));
  const rele = s.map((x) => ({ x: x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.x.sursa + ": " + q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
});
await test("(D) I-526 titluDimineata: „Azi: 1 bot pe agitație dovedită, 2 pe calm · 9 acțiuni pe revenire, istoricul cam la fel · nimic de ieșit”; fără dovadă ⇒ „pe agitație”; părțile lipsă se lasă afară; nimic ⇒ null; ≤ 160", async () => {
  const { titluDimineata: T } = await import("./lib/dimineata-titlu.mjs");
  const boti = [{ nume: "AAVE", stare: "miscare" }, { nume: "LIT", stare: "liniste" }, { nume: "PUMP", stare: "liniste" }];
  assert.equal(T({ boti: boti, bilant: "dovedit", reveniri: 9, eticheta: "cam la fel", deIesit: 0 }), "Azi: 1 bot pe agitație dovedită, 2 pe calm · 9 acțiuni pe revenire, istoricul cam la fel · nimic de ieșit");
  assert.equal(T({ boti: boti, bilant: "prea puține", reveniri: 1, eticheta: null, deIesit: 2 }), "Azi: 1 bot pe agitație, 2 pe calm · 1 acțiune pe revenire · 2 poziții de ieșit");
  assert.equal(T({ boti: [{ nume: "SOL", stare: "nemasurat" }], reveniri: 0, deIesit: 0 }), "Azi: niciun bot pe agitație · nicio acțiune pe revenire · nimic de ieșit");
  assert.equal(T({ boti: [], reveniri: null, deIesit: null }), null); assert.equal(T({}), null);
  const lung = T({ boti: Array.from({ length: 40 }, (_, i) => ({ nume: "M" + i, stare: i % 2 ? "miscare" : "liniste" })), bilant: "dovedit", reveniri: 123, eticheta: "mai slab", deIesit: 7 }); assert.ok(lung && lung.length <= 160, lung);
});
await test("(D) I-526 dimineața: rândul-verdict e PRIMUL (înaintea rândurilor Consilierului), colectorul îl alcătuiește (out.liniiIntai, v101.62) și garda îl ține ≤ 160 (sursa dimineata.titlu)", async () => {
  const TD = await import("./lib/tura-dimineata.mjs"); const trimise = [];
  const r = await TD.turaDimineata({ acum: Date.UTC(2026, 9, 4, 7, 0), stare: {}, jurnal: () => {}, Consilier: { rezumatDimineata: () => ({ titlu: "Dimineața", linii: ["📈 Piața: liniște"] }) },
    date: async () => ({ liniiIntai: ["Azi: nimic de ieșit"], liniiExtra: ["🧭 Busola, pe 4h: CRV mai agitată"] }), trimite: async (m) => { trimise.push(m); return true; } });
  assert.deepEqual(r.linii, ["Azi: nimic de ieșit", "📈 Piața: liniște", "🧭 Busola, pe 4h: CRV mai agitată"]); assert.equal(trimise[0].mesaj.split("\n")[0], "Azi: nimic de ieșit");
  const col = citeste("scripts", "colector.mjs"); assert.ok(col.includes('import { titluDimineata } from "./lib/dimineata-titlu.mjs"') && col.includes("out.liniiIntai = ") && /VERSIUNE_COLECTOR = "v101\.62"/.test(col), "colectorul");
  const s = situatii().filter((x) => /^dimineata\.titlu/.test(x.sursa)); assert.ok(s.length >= 2, "situații dimineata.titlu: " + s.length);
  const rele = s.map((x) => ({ x: x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length); assert.equal(rele.length, 0, rele.map((q) => q.ab.join("; ") + " [" + q.x.text + "]").join("\n"));
});

// ======== sarcina 10: versiunile ========
await test("(E) versiunile: pagina v100.92 (BUILD_INFO, versiune.js, sw, index ×4, package.json 100.92.0, lanțul cu v10092), colectorul v101.62", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, "v100.92"); assert.match(bi.badge, /^v100\.92 · /);
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "v100.92";'), "versiune.js");
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-v100-92";'), "sw.js");
  const ix = citeste("public", "index.html"); assert.equal((ix.match(/v100\.92/g) || []).length, 4, "index.html ×4"); assert.ok(!/v100\.91/.test(ix), "index.html mai are v100.91");
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, "100.92.0"); assert.ok(/npm run test:v10091 && npm run test:v10092"/.test(pk), "lanțul de teste");
  assert.ok(/VERSIUNE_COLECTOR = "v101\.62"/.test(citeste("scripts", "colector.mjs")), "colectorul v101.62");
});

// ======== revizia Opus (04.10): pasul de reparații - fiecare văzut ROȘU întâi ========
const FISA_REG = (sens) => ({ regim: { miscare: true, sens: sens, r4h: 2.1, r24h: 1 } });
await test("(F) I-523 nu calcă „mișcarea e cu botul”: Busola dovedită + mișcare CU botul ⇒ ȚINE / cu-botul, fără componenta busola; mișcare CONTRA ⇒ componenta busola rămâne, după cea a Radarului", () => {
  const cu = S.semafor({ bot: BOT, fisa: FISA_REG("urca"), busola: BZ("miscare", "dovedit") });
  assert.equal(cu.nivel + "/" + cu.cod, "tine/cu-botul"); assert.ok(!cu.componente.some((k) => k.cod === "busola"), "componenta busola a calcat „cu botul”");
  const contra = S.semafor({ bot: BOT, fisa: FISA_REG("coboara"), busola: BZ("miscare", "dovedit") }), coduri = contra.componente.map((k) => k.cod);
  assert.equal(contra.nivel, "atentie"); assert.ok(coduri.indexOf("miscare") >= 0 && coduri.indexOf("busola") > coduri.indexOf("miscare"), coduri.join(","));
});
await test("(F) Discord o singură dată: Consiliu.schimbare tace (doarRadar) când paza a anunțat deja „mai agitată” (activ busola-miscare); CHEI.busola; colectorul pune cheia din _busola", () => {
  const c = { nivel: "atentie", eticheta: "🟡 Atenție", titlu: "Busola: agitație dovedită", faCe: "N-aș adăuga bani.", motive: [{ cod: "busola", c: "g", titlu: "Busola: agitație dovedită, −0,17 pp pe episod pe date noi", scurt: "agitație dovedită" }] };
  const st = () => ({ acum: { nivel: "tine", eticheta: "🟢 Ține", titlu: "Nimic nu cere o mișcare", faCe: "", motive: [] }, nou: { nivel: "atentie" } });
  const cu = CS.schimbare(st(), c, ACUM, "CRV", { activ: { "busola-miscare": "atentie" } }), fara = CS.schimbare(st(), c, ACUM, "CRV", { activ: {} });
  assert.ok(cu.alerta && cu.alerta.doarRadar === true, "cu paza anunțată: doar în Radar"); assert.ok(fara.alerta && fara.alerta.doarRadar === false, "fără paza: pe Discord");
  assert.ok(/busola: \["busola-miscare"\]/.test(lib("consiliu.js")), "CHEI.busola");
  assert.ok(citeste("scripts", "colector.mjs").includes('if (stA._busola && stA._busola.stare === "miscare") activ["busola-miscare"] = "atentie";'), "colectorul: cheia pazei în activ");
});
await test("(F) I-525 în toate listele la fel: candidații (tbIdeiRender) cu istoricul lui pe minus (≥ 3 boți) ⇒ dunga roșie și istoricul pe roșu, prin același ajutor tbIstoricRosu", () => {
  const s = lib("t212-ecran.js"); assert.ok(/^function tbIstoricRosu\(x\)/m.test(s), "lipsește tbIstoricRosu");
  const r = fnDin("t212-ecran.js", "tbIdeiRender"), g = fnDin("t212-ecran.js", "tbSugestiiCorp");
  assert.ok(r.includes('(tbIstoricRosu(x) ? "r" : "v")') && r.includes(`(tbIstoricRosu(x) ? ' class="bad"' : '')`), "candidații nu folosesc ajutorul comun");
  assert.ok(g.includes("tbIstoricRosu(x)") && !/var rosu = function/.test(g), "listele nu folosesc ajutorul comun");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fnDin("t212-ecran.js", "tbIstoricRosu") + ";this.f=tbIstoricRosu;", ctx);
  assert.equal(ctx.f({ istoric: IST(17, 10, -173.55) }), true); assert.equal(ctx.f({ istoric: IST(2, 0, -5) }), false); assert.equal(ctx.f({ istoric: IST(5, 4, 12) }), false); assert.equal(ctx.f({}), false);
});
await test("(F) I-522 textul spune cum măsoară Radarul de fapt (percentila 75, 4h SAU 24h) - fără „mediana”", () => {
  assert.ok(!/mediana ei/.test(lib("consiliu.js")), "textul mai zice „mediana”");
  const sm = S.semafor({ bot: BOT, fisa: null }), t = CS.alcatuieste({ sm: sm, concret: [], sfaturi: [], busola: { stare: "miscare" }, regim: { miscare: false } }).busolaVsRadar;
  assert.equal(t, "Radarul: liniște (4h/24h față de obișnuit) · Busola: mai agitată (ATR 4h față de un an) — orizonturi diferite"); assert.ok(t.length <= 110, "lung: " + t.length);
});
await test("(F) I-526 fără inventat: „de ieșit” doar dacă T212 a fost citit (t212Citit), boții doar din rezumat proaspăt, rândul-verdict în afara try-ului bot-orders", () => {
  const col = citeste("scripts", "colector.mjs"), d = col.slice(col.indexOf("async function dateDimineata()"), col.indexOf("async function turaDimineata()"));
  assert.ok(/let t212Citit = false;/.test(d) && /t212Citit = true;/.test(d) && /deIesit: t212Citit \? out\.deIesit\.length : null/.test(d), "deIesit null când T212 nu e citit");
  assert.ok(/boti: liniaVeche \? \[\] : lBoti/.test(d), "boții doar din rezumat proaspăt");
  const dupa = d.slice(d.indexOf("titluDimineata({")), iR = dupa.indexOf("return out;"), iC = dupa.indexOf("} catch {}");
  assert.ok(iR > 0 && (iC < 0 || iR < iC), "titlul e înăuntrul try-ului bot-orders");
});
await test("(F) I-519 pe telefon: caseta lipicioasă ține doar eticheta și primul motiv (lista motivelor sub ea, nelipicioasă); Poarta de pornire (FAPTĂ) nu se pliază; secțiunea pliată cu avertisment poartă ⚠", () => {
  const rg = fnApp("renderGrid"), css = citeste("public", "app.css");
  assert.ok(rg.includes(`'<ul class="grLista grListaJos">'`), "lista motivelor sub casetă");
  assert.ok(/#gridset \.grListaJos\{display:none/.test(css) && /@media \(max-width:600px\)\{[^\n]*#gridset \.grPliat>:not\(\.tbBlocCap\):not\(\.grPoartaCap\)\{display:none\}#gridset \.grPliat>\.tbBlocCap,#gridset \.grPliat>\.grPoartaCap\{margin:0\}#gridset \.grVerdict \.grLista\{display:none\}#gridset \.grListaJos\{display:block\}/.test(css), "CSS: pe telefon lista iese din casetă");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fnApp("grPliabil") + "\n;this.f=grPliabil;", ctx);
  assert.equal(ctx.f("🚦 Poarta de pornire"), false); assert.equal(ctx.f("Setările de pus în Pionex"), false); assert.equal(ctx.f("Direcția"), true);
  assert.ok(fnApp("grPliazaPeTelefon").includes(`s.classList.toggle("grAvert",!!s.querySelector(".tbWarn,.bad"))`) && /#gridset \.grPliat\.grAvert>/.test(css), "⚠ pe secțiunea pliată cu avertisment");
});
await test("(F) I-524 la margine: o diferență care se rotunjește la 10% e „cam la fel” (nu „cu 10% mai îngust”)", () => {
  assert.equal(B.comparaInterval({ jos: 100, sus: 200 }, 100, 189.6).text, "intervalul tău e cam la fel de larg ca al Busolei");
  assert.match(B.comparaInterval({ jos: 100, sus: 200 }, 100, 189).text, /cu 11% mai îngust/);
});
await test("(F) igienă: importul paza-boti și-a păstrat comentariul pe rândul lui (nu lipit pe rândul dimineata-titlu)", () => {
  const l = citeste("scripts", "colector.mjs").split(/\r?\n/).find((x) => x.includes('from "./lib/dimineata-titlu.mjs"'));
  assert.ok(l && (l.match(/\/\//g) || []).length === 1, l);
});

console.log("\n" + (pica ? "V100.92 PICA · " + pica + " din " + (ok + pica) : "V100.92 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
