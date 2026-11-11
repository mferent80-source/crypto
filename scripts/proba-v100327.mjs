// Proba v100.327 (11.11.2026, el, cu poza riglei 1h / 4h / 1z și a istoriei pe 4h: „repară și fă mai explicit că nu prea înțeleg direcția la ce arată”):
//   rigla scorului și istoria pe 4h din rândul închis al „Detaliilor indicatorilor” își spun sensul în cuvinte, la vedere (nu doar în titlul de la mouse,
//   pe care pe telefon nu-l vezi): capetele riglei („0 · ↓ jos” … „sus ↑ · 100”), cuvântul lângă cifră (jos / neutru / sus), legenda culorilor față de
//   direcția botului, iar sub istorie: ce e, de unde până unde și încotro merge, ce sunt liniile punctate.
//   node scripts/proba-v100327.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.327 · rigla și istoria scorului spuse în cuvinte · proba\n");
const ctx = { console, Math, JSON, Number, String, Array, Object, isFinite, Date, RegExp, Intl, TextRo: globalThis.TextRo };
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "indicatori-bot.js") + "\nthis.IB = IndicatoriBot;", ctx);
const IB = ctx.IB, esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const Q = (score, ver, prag) => ({ ver, score, prag, ema: false, emaDir: "DOWN", e20Now: 1, e50Now: 2, e200Now: 3 });
const R = () => [{ eticheta: "1 oră", q: Q(50, "NEUTRAL", 64) }, { eticheta: "4 ore", q: Q(30, "BEARISH", 64) }, { eticheta: "1 zi", q: Q(72, "BULLISH", 66) }];

await test("rigla: titlu „Scorul indicatorilor, 0–100”; lângă fiecare cifră cuvântul direcției (jos / neutru / sus), la vedere", () => {
  const h = IB.riglaHtml(IB.banda(R(), "short"), "short", esc);
  assert.match(h, /^<span class="ibRigle"><span class="ibRcap">Scorul indicatorilor, 0–100<\/span>/);
  assert.match(h, /<span class="ibRnr"><b>50<\/b><small>neutru<\/small><\/span>/);
  assert.match(h, /<span class="ibRnr"><b>30<\/b><small>↓ jos<\/small><\/span>/);
  assert.match(h, /<span class="ibRnr"><b>72<\/b><small>↑ sus<\/small><\/span>/);
});
await test("rigla: capetele scrise sub bare - „0 · ↓ jos”, „neutru”, „sus ↑ · 100” (aliniate cu bara)", () => {
  const h = IB.riglaHtml(IB.banda(R(), "short"), "short", esc);
  assert.ok(h.includes('<span class="ibRax" aria-hidden="true"><i></i><span class="ibRaxB"><span>0 · ↓ jos</span><span>neutru</span><span>sus ↑ · 100</span></span><i></i></span>'));
});
await test("rigla: legenda culorilor față de botul TĂU - short ⇒ verde = jos; long ⇒ verde = sus; fără direcție ⇒ fără culori, doar liniuța", () => {
  const s = IB.riglaHtml(IB.banda(R(), "short"), "short", esc), l = IB.riglaHtml(IB.banda(R(), "long"), "long", esc), n = IB.riglaHtml(IB.banda(R(), "neutral"), "neutral", esc);
  assert.ok(s.includes('<span class="ibRleg"><span><i class="ibLbun"></i>verde = cu botul tău (short: câștigă când coboară)</span><span><i class="ibLrau"></i>roșu = împotriva lui</span><span><i class="ibLsemn"></i>liniuța = scorul acum</span></span></span>'));
  assert.ok(l.includes("verde = cu botul tău (long: câștigă când urcă)"));
  assert.ok(n.includes('<span class="ibRleg"><span><i class="ibLsemn"></i>liniuța = scorul acum</span></span></span>') && !n.includes("ibLbun"));
});
await test("istoria pe 4h: sub desen, în cuvinte - ce e, câte bare (≈ zile), de unde până unde și încotro; ce sunt liniile punctate și zona verde", () => {
  const ist = Array.from({ length: 24 }, (_, i) => ({ s: 51 - Math.round(i / 3), prag: 64 }));
  const h = IB.sparkHtml(ist, "short", esc);
  assert.match(h, /^<span class="ibSpark" title="[^"]*"><span class="ibRcap">Scorul pe 4h, ultimele 24 de bare \(≈ 4 zile\)<\/span><span class="ibSpDes"><svg /, "încadrare: titlul sus, ca la riglă");
  assert.ok(h.includes('</svg></span><span class="ibSpEt"><b>51 → 43</b>, coboară</span><span class="ibSpEt"><i class="ibLbun"></i>verde = cu botul tău (short: ≤ 36)</span>'));
  const urca = IB.sparkHtml([{ s: 40, prag: 64 }, { s: 47, prag: 64 }], "long", esc), loc = IB.sparkHtml([{ s: 50, prag: 64 }, { s: 52, prag: 64 }], "neutral", esc);
  assert.match(urca, /ultimele 2 bare \(8 ore\)</, "sub o zi: orele (3 bare nu sunt „≈ 1 zi”)"); assert.match(urca, /<b>40 → 47<\/b>, urcă</); assert.match(loc, /<b>50 → 52<\/b>, stă pe loc</);
  assert.ok(!loc.includes("ibLbun") && loc.includes('stă pe loc</span></span>'), "fără direcție: fără zona verde și fără legenda ei");
  assert.match(urca, /verde = cu botul tău \(long: ≥ 64\)/);
  assert.ok(IB.sparkHtml([{ s: 50, prag: null }, { s: 40, prag: null }], "short", esc).includes("<b>50 → 40</b>, coboară</span></span>"), "fără prag: fără legenda zonei");
});
await test("graficul micuț la fel de explicit (el: „fă și graficul micuț la fel”) și CÂT CARTELA (el: „mărește scorul pe 4 h pe lățime cât e panoul”): liniile punctate scrise „≥ 64 sus” / „≤ 36 jos”, cifra de la început și cea de acum lângă punct, zona verde a botului", () => {
  const h = IB.sparkHtml([{ s: 50, prag: 64 }, { s: 40, prag: 64 }], "short", esc);
  assert.ok(h.includes('<span class="ibSpDes"><svg class="ibSpG" width="100%" height="56" aria-hidden="true">'), "desenul ia toată lățimea rămasă în cartelă (nu 260 px fix)");
  assert.ok(!/width="2[26]0"/.test(h), "fără lățimea fixă de dinainte");
  assert.ok(h.includes('<rect class="ibSpBun" x="0" y="34.16" width="100%" height="21.84"></rect>'), "short: sub 36 (coboară) e zona bună, pe toată lățimea");
  assert.ok(h.includes('<line class="ibSpPrag" x1="0" x2="100%" y1="21.84" y2="21.84"></line><line class="ibSpPrag" x1="0" x2="100%" y1="34.16" y2="34.16"></line>'));
  // linia se întinde pe lățime (viewBox 0..100, fără păstrarea proporției), grosimea rămâne 1,5 px; DOAR linia e în desenul întins
  assert.ok(h.includes('<svg viewBox="0 0 100 56" preserveAspectRatio="none" width="100%" height="56" overflow="visible"><polyline class="ibSpLinie" points="0,28 100,32.4" vector-effect="non-scaling-stroke"></polyline></svg>'));
  // punctul și cifrele în afara desenului întins: rămân rotunde / drepte la orice lățime
  assert.ok(h.includes('</svg><circle class="ibSpAcum" cx="100%" cy="32.4" r="3"></circle><text class="ibSpVal" x="0" y="22">50</text><text class="ibSpVal" x="100%" y="26.4" text-anchor="end">40</text></svg>'), "punctul de acum și cifrele");
  assert.ok(h.includes('<svg class="ibSpPr" width="56" height="56" aria-hidden="true"><text class="ibSpEtP" x="0" y="25.84">≥ 64 sus</text><text class="ibSpEtP" x="0" y="38.16">≤ 36 jos</text></svg></span>'), "liniile își spun pragul și sensul, în coloana lor din dreapta");
  const zile = IB.sparkHtml(Array.from({ length: 24 }, (_, i) => ({ s: 50, prag: 64 })), "short", esc);
  assert.match(zile, /points="0,28 4\.35,28 8\.7,28 /, "pașii pe lățime: 100 / 23");
  const sus = IB.sparkHtml([{ s: 90, prag: 64 }, { s: 99, prag: 64 }], "short", esc);
  assert.match(sus, /<text class="ibSpVal" x="100%" y="20\.44" text-anchor="end">99<\/text>/, "lângă marginea de sus: cifra sub punct, nu tăiată");
  const fara = IB.sparkHtml([{ s: 50, prag: null }, { s: 40, prag: null }], "short", esc);
  assert.ok(!fara.includes("ibSpPr") && fara.includes('aria-hidden="true">'), "fără prag: fără coloana etichetelor, desenul ia tot");
});
await test("stilul lățimii: desenul crește cât cartela (flex), coloana etichetelor 56 px, cel puțin 120 px de desen", () => {
  const C2 = citeste("public", "app.css"), i = C2.indexOf("/* v100.327 · rigla și istoria scorului spuse în cuvinte"), B = C2.slice(i, C2.indexOf("/* v100.327: sfârșitul riglei spuse în cuvinte */"));
  for (const r of [":is(#tabloubot,#t212) .ibSpDes{display:flex;gap:8px;align-items:flex-start;min-width:0}", ":is(#tabloubot,#t212) .ibSpG{flex:1 1 0;min-width:120px;height:56px}", ":is(#tabloubot,#t212) .ibSpPr{flex:0 0 56px}"])
    assert.ok(B.includes(r), "lipsește: " + r);
});
const CSS = citeste("public", "app.css");
await test("stilul: coloana cifrei încape cuvântul; capetele, legenda, titlul pe scara Tabloului (12 px), culorile legendei = culorile zonelor", () => {
  const i = CSS.indexOf("/* v100.327 · rigla și istoria scorului spuse în cuvinte"), B = CSS.slice(i, CSS.indexOf("/* v100.327: sfârșitul riglei spuse în cuvinte */"));
  assert.ok(i > 0);
  for (const r of [":is(#tabloubot,#t212) .ibRigla{grid-template-columns:22px minmax(0,1fr) 44px}", ":is(#tabloubot,#t212) .ibRnr{display:flex;flex-direction:column;align-items:flex-end;line-height:1.15}",
    ":is(#tabloubot,#t212) .ibRnr small{font-size:12px;font-weight:400;color:var(--pzT2);white-space:nowrap}", ":is(#tabloubot,#t212) .ibRcap{font-size:12px;color:var(--pzT2)}",
    ":is(#tabloubot,#t212) .ibRax{display:grid;grid-template-columns:22px minmax(0,1fr) 44px;gap:6px;font-size:12px;color:var(--pzT2);margin-top:-2px}", ":is(#tabloubot,#t212) .ibRaxB{display:flex;justify-content:space-between;gap:4px}",
    ":is(#tabloubot,#t212) .ibRleg{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:12px;color:var(--pzT2);line-height:1.4}",
    ":is(#tabloubot,#t212) .ibLbun{background:color-mix(in srgb,var(--pzSus) 45%,transparent)}", ":is(#tabloubot,#t212) .ibLrau{background:color-mix(in srgb,var(--pzJos) 35%,transparent)}",
    ":is(#tabloubot,#t212) .ibSpEtP{font-size:12px;fill:var(--pzT2)}", ":is(#tabloubot,#t212) .ibSpVal{font-size:12px;font-weight:600;fill:var(--pzT0)}", ":is(#tabloubot,#t212) .ibSpEt i{display:inline-block;width:10px;height:8px;border-radius:2px;margin-right:4px}"])
    assert.ok(B.includes(r), "lipsește: " + r);
  assert.deepEqual((B.match(/font-size:[\d.]+px/g) || []).filter((x) => !/font-size:(12|13\.5|15|20|30)px/.test(x)), [], "mărimi în afara scării");
  assert.doesNotMatch(B, /\.ibRleg>span\{white-space:nowrap\}/, "legenda se rupe pe rânduri (pe calculator rigla are ~210 px; pagina copiei: 280 px ieșeau din cutie, +12 px peste lățime la 1920)");
  // aceleași culori ca zonele riglei
  assert.ok(CSS.includes(":is(#tabloubot,#t212) .ibZbun{background:color-mix(in srgb,var(--pzSus) 45%,transparent)}") && CSS.includes(":is(#tabloubot,#t212) .ibZrau{background:color-mix(in srgb,var(--pzJos) 35%,transparent)}"));
});

const APP = citeste("public", "app.js");
await test("încadrare (el: „încadrează frumos”): rigla și istoria în DOUĂ cartele egale, pe rândul lor sub bandă (ibGrafice); înguste ⇒ una sub alta, după lățimea rândului (container), nu a ecranului", () => {
  assert.match(APP, /var gr=IndicatoriBot\.riglaHtml\(bd,b\.directie,escapeHtml\)\+\(ist\?IndicatoriBot\.sparkHtml\(ist,b\.directie,escapeHtml\):""\),hs=IndicatoriBot\.bandaHtml\(bd,tvb,sch,b\.directie,escapeHtml\)\+\(gr\?'<span class="ibGrafice">'\+gr\+'<\/span>':""\);/);
  const C2 = citeste("public", "app.css"), i = C2.indexOf("/* v100.327 · rigla și istoria scorului spuse în cuvinte"), B = C2.slice(i, C2.indexOf("/* v100.327: sfârșitul riglei spuse în cuvinte */"));
  for (const r of [":is(#tabloubot,#t212) .tbIndSumar{container-type:inline-size}", ":is(#tabloubot,#t212) .ibGrafice{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;flex:1 1 100%;max-width:760px;min-width:0}",
    "@container (min-width:620px){:is(#tabloubot,#t212) .ibGrafice{grid-template-columns:repeat(2,minmax(0,1fr))}}",
    ":is(#tabloubot,#t212) .ibGrafice>:is(.ibRigle,.ibSpark){display:flex;flex-direction:column;gap:6px;min-width:0;max-width:none;padding:8px 10px;border:1px solid var(--pzLi);border-radius:4px}"])
    assert.ok(B.includes(r), "lipsește: " + r);
});
await test("tabelul TradingView din fișa T212 rămâne TABEL și pe telefon (poza lui: notele cădeau una sub alta în „Rezumat”, „Medii” și „Oscilatoare” goale) - regulile tabelului pozițiilor nu-l mai prind", () => {
  const C2 = citeste("public", "app.css"), i = C2.indexOf("/* v100.327 · rigla și istoria scorului spuse în cuvinte"), B = C2.slice(i, C2.indexOf("/* v100.327: sfârșitul riglei spuse în cuvinte */"));
  assert.ok(B.includes("#t212 .t212Det .tvNoteTab :is(td,th){display:table-cell;padding:4px 3px;text-align:center;background:transparent;font-size:12px;white-space:nowrap}"));
  assert.ok(B.includes("#t212 .t212Det .tvNoteTab tbody th{text-align:left}"));
  // regula vechie care îl strica (sub 640 px) prinde orice td din fișă - de aceea regula de mai sus e mai tare (1 id + 2 clase + element)
  assert.ok(C2.includes(".t212Tab tr.t212Det td{display:block;padding:0 14px 14px}"));
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
