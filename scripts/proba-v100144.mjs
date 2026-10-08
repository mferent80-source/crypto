// Proba v100.144 (08.10, el: „fa idei” după v100.143): (1) butonul „24 h” lângă intervale - toată fereastra, nu doar de la pornirea botului;
// (2) pe telefon semaforul de trend stă în banda lui deasupra graficului, nu peste lumânări; (3) săgețile ▲▼ colorate după soartă:
// verde = pereche închisă, gri = încă deschisă (forma rămâne cumpărare / vânzare).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const G = new Function(`${citeste("public", "lib", "grafic-bot.js")}; return GraficBot;`)();
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js"), CSS = citeste("public", "app.css");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.144 · butonul „24 h”, semaforul în banda lui pe telefon, săgețile după soartă · proba\n");
const ACUM = Date.UTC(2026, 9, 8, 9, 0, 0), M5 = 300000;
function bare(n, pas, p0, p1) { const l = []; for (let i = 0; i < n; i++) { const t = ACUM - (n - i) * pas, c = p0 + (p1 - p0) * i / (n - 1), o = i ? l[i - 1].c : c; l.push({ t, o, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998, c, v: 10 + (i % 7) }); } return l; }
const B5 = bare(288, M5, 0.50, 0.55);
const umpl = (ri, tip, p, pereche) => ({ t: B5[ri].t, ri, k: 0, p, tip, pereche: !!pereche });
const SEM = [{ tf: "5M", et: "5 min", sc: "5m", dir: "urca", ton: "bine", text: "urcă" }, { tf: "15M", et: "15 min", sc: "15m", dir: "lateral", ton: "gol", text: "lateral" }, { tf: "60M", et: "1 h", sc: "1h", dir: "coboara", ton: "rau", text: "coboară" }];

await test("(1) butonul „24 h”: intrareBot cu fereastraToata ⇒ toată fereastra (și spune că cea a botului era posibilă); pagina ține alegerea (tabloBotFereastra_v1), arată butonul doar când fereastra botului e posibilă, cu eticheta intervalului", () => {
  const bot = { id: "1", pornitLa: ACUM - 5 * 3600000, gridJos: 0.5, gridSus: 0.55, directie: "LONG" };
  const iT = G.intrareBot({ bot, bare: B5, acum: ACUM, W: 1000, fereastraToata: true }); assert.equal(iT.bare.length, 288); assert.equal(iT.fereastraBot, false); assert.equal(iT.fereastraPosibila, true);
  const iB = G.intrareBot({ bot, bare: B5, acum: ACUM, W: 1000 }); assert.equal(iB.bare.length, 84); assert.equal(iB.fereastraBot, true); assert.equal(iB.fereastraPosibila, true);
  const iN = G.intrareBot({ bot: { id: "1", gridJos: 0.5, gridSus: 0.55 }, bare: B5, acum: ACUM, W: 1000, fereastraToata: true }); assert.equal(iN.fereastraPosibila, false, "fără pornire nu e ce arăta");
  assert.match(HTML, /<div class="tbInterval tbTf"[^>]*>(<button[^>]*>[^<]*<\/button>){5}<button type="button" class="tbIntBtn tbFerBtn" id="tbFerToata" hidden aria-pressed="false" data-action-click="tbFereastraToata\(\)"[^>]*>24 h<\/button><\/div>/, "butonul al 6-lea, ascuns până e nevoie");
  const f = functie(APP, "tbFereastraToata"); assert.match(f, /tbScrie\(TB_FER_CHEIE,m\)/); assert.match(f, /renderTabloGrafic\(\)/);   // v100.145: pe bot
  assert.match(APP, /TB_FER_CHEIE="tabloBotFereastra_v2"/); assert.match(functie(APP, "tbFereastraToataE"), /tbStare\.fereastraToataPe=v&&typeof v==="object"\?v:\{\}/, "alegerea se citește (o dată) din memoria paginii, ca obiect pe bot");
  const r = functie(APP, "renderTabloGrafic"); assert.match(r, /fereastraToata:tbFereastraToataE\(\)/); assert.match(r, /tbFereastraButon\(oG\)/);
  const fb = functie(APP, "tbFereastraButon"); assert.match(fb, /\.hidden=!oG\.fereastraPosibila/); assert.match(fb, /aria-pressed/); assert.match(fb, /TB_PERIOADE\[tbTf\(\)\]\.cat/, "eticheta: „24 de ore” / „3 zile”, după interval");
});
await test("(2) pe telefon semaforul stă în banda lui deasupra graficului: restul desenului e mutat în jos cu `sus`, prețurile iau tot graficul (fără rezerva de 54 px), harta știe `sus`; pe ecran lat ca înainte", () => {
  const baza = { bare: B5, st: {}, niv: [], alerte: [], per: "24h", tfGrafic: "5M" };
  const t = G.desen(Object.assign({}, baza, { W: 390, ingust: true, semafor: SEM })), t0 = G.desen(Object.assign({}, baza, { W: 390, ingust: true }));
  assert.ok(t.harta.sus > 40, "banda semaforului: " + t.harta.sus); assert.equal(t.harta.hi, t0.harta.hi, "fără rezervă sus: aceeași scară ca fără semafor"); assert.equal(t.inaltime, t0.inaltime + t.harta.sus, "înălțimea crește cu banda");
  const iSem = t.svg.indexOf('class="gbSemFond"'), iG = t.svg.indexOf('<g class="gbTot" transform="translate(0,'); assert.ok(iSem > 0 && iG > iSem, "semaforul e ÎNAINTEA grupului mutat, în banda de sus"); assert.match(t.svg, /<g class="gbTot" transform="translate\(0,(\d+(\.\d+)?)\)">/);
  assert.equal(G.pretLaY(t.harta, t.harta.sus + t.harta.mainH / 2), G.pretLaY(t0.harta, t0.harta.mainH / 2), "pretLaY scade banda");
  assert.equal(G.pretLaY(t.harta, 10), null, "în bandă nu e preț");
  const d = G.desen(Object.assign({}, baza, { W: 1000, semafor: SEM })); assert.equal(d.harta.sus, 0); assert.doesNotMatch(d.svg, /gbTot/); assert.ok(d.harta.hi > G.desen(Object.assign({}, baza, { W: 1000 })).harta.hi, "pe ecran lat rezerva rămâne");
  assert.match(APP, /sy-\(d\.harta\.sus\|\|0\)/, "cursorul paginii scade banda la crucea orizontală");
});
await test("(3) săgețile după soartă: grupul cu pereche închisă e verde (și cu inel), cel fără e gri; amestecat ⇒ verde cu „1 din 2 perechi închise” în titlu; forma rămâne ▲/▼; legenda spune ce înseamnă culorile (și pe rândul scurt)", () => {
  const baza = { bare: B5, W: 1000, st: {}, niv: [], alerte: [], per: "24h", acum: ACUM }, C = G.COL;   // v100.145: `acum` al probei, altfel umplerile deschise ar fi „de peste o oră” (galbene)
  const s1 = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(200, "B", 0.531, true), umpl(200, "B", 0.533, true)], perechi: 2 } })).svg;
  assert.match(s1, /class="gbUmplere gbPereche"><title>[^<]*<\/title><polygon points="[^"]+" fill="#[0-9a-fA-F]{6}"/); assert.ok(s1.includes('fill="' + C.good + '" stroke="' + C.fond + '" stroke-width="1"/><circle'), "verde + inel");
  const s2 = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(286, "S", 0.539), umpl(286, "S", 0.537)], perechi: 0 } })).svg;   // v100.145: deschise DE CURÂND (bara 286) ⇒ gri; cele vechi de ore sunt galbene
  assert.ok(s2.includes('fill="' + C.mut + '" stroke="' + C.fond + '" stroke-width="1"/>'), "gri, fără inel"); assert.doesNotMatch(s2, /gbPereche/);
  const s3 = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(200, "B", 0.531, true), umpl(200, "B", 0.533)], perechi: 1 } })).svg;
  assert.ok(s3.includes('fill="' + C.good + '" stroke="' + C.fond + '"'), "amestecat ⇒ verde"); assert.match(s3, /<title>1 din 2 umpleri cu perechea închisă\n/);
  const d = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(200, "B", 0.531, true)], perechi: 1 } }));
  assert.match(d.legenda, /▲ cumpărare · ▼ vânzare pe grilă \(deduse din lumânări\) · verde = pereche închisă · gri = deschisă · galben = deschisă de peste o oră · perechi pe grafic: 1/);   // v100.145: + galben
  const ds = G.desen(Object.assign({}, baza, { simplu: true, umpleri: { umpleri: [umpl(200, "B", 0.531, true)], perechi: 1 } })); assert.match(ds.legenda, /▲▼ umpleri: verde = pereche închisă \(1\) · gri = deschisă · galben = de peste o oră/);
});
await test("(R1) revizia Opus 🔴: soarta pe umpleri REALE (GraficBot.umpleri, bot long): cumpărarea a cărei vânzare s-a făcut e „închisă” (verde), cumpărările rămase după ultima coborâre sunt deschise (gri); la short invers; titlul numără umplerile", () => {
  // prețul coboară de la 0.55 la 0.50 (cumpără pe linii), urcă înapoi (vinde = închide), apoi coboară iar până la 0.52 (cumpărări deschise)
  const drum = [0.55, 0.54, 0.53, 0.52, 0.51, 0.50, 0.51, 0.52, 0.53, 0.54, 0.55, 0.54, 0.53, 0.52], b = drum.map((c, i) => ({ t: ACUM - (drum.length - i) * M5, o: i ? drum[i - 1] : c, h: Math.max(i ? drum[i - 1] : c, c) + 0.0005, l: Math.min(i ? drum[i - 1] : c, c) - 0.0005, c, v: 1 }));
  const U = G.umpleri(b, { jos: 0.50, sus: 0.55, linii: 6, geo: false, p0: 0.55, pornit: b[0].t, dir: "long" });
  const cump = U.umpleri.filter((u) => u.tip === "B"), vanz = U.umpleri.filter((u) => u.tip === "S");
  assert.ok(cump.length >= 7 && vanz.length >= 4, "umpleri: " + cump.length + " cumpărări, " + vanz.length + " vânzări");
  assert.ok(vanz.every((u) => u.pereche), "la long fiecare vânzare închide o pereche");
  const inchise = cump.filter((u) => u.inchisa), deschise = cump.filter((u) => !u.inchisa);
  assert.ok(inchise.length >= 4 && deschise.length >= 2, "cumpărări închise " + inchise.length + ", deschise " + deschise.length);
  assert.ok(deschise.every((u) => u.t > inchise[inchise.length - 1].t), "cele deschise sunt ultimele (după ultima vânzare)");
  const s = G.desen({ bare: b, W: 1000, st: {}, niv: [], alerte: [], per: "24h", umpleri: U, acum: ACUM }).svg, C = G.COL;
  const grupuri = s.match(/<g class="gbUmplere[^"]*"><title>[^<]*<\/title><polygon points="[^"]+" fill="#[0-9a-fA-F]{6}"/g) || [];
  assert.ok(grupuri.some((x) => x.includes('fill="' + C.good + '"')) && grupuri.some((x) => x.includes('fill="' + C.mut + '"')), "și verzi, și gri");
  assert.match(s, /<title>\d+ din \d+ umpleri cu perechea închisă\n|<title>(cumpărare|vânzare)/);
  const S = G.umpleri(b.map((x) => ({ t: x.t, o: 1.1 - x.o, h: 1.1 - x.l, l: 1.1 - x.h, c: 1.1 - x.c, v: 1 })), { jos: 0.55, sus: 0.60, linii: 6, geo: false, p0: 0.55, pornit: b[0].t, dir: "short" });
  assert.ok(S.umpleri.filter((u) => u.tip === "S").some((u) => u.inchisa) && S.umpleri.filter((u) => u.tip === "B").every((u) => u.pereche), "la short vânzarea se închide prin cumpărare");
});
await test("(R2) revizia Opus 🟡: banda semaforului doar pe graficul botului (acțiunile T212 rămân ca înainte); butonul „24 h” se ascunde la începutul fiecărui desen și pe 1 h fereastra nu e posibilă; legenda spune când e toată fereastra; butonul nu se strânge pe telefon; o atingere în bandă nu arată fișa", () => {
  const baza = { bare: B5, st: {}, niv: [], alerte: [], per: "24h", tfGrafic: "5M" };
  assert.equal(G.desen(Object.assign({}, baza, { W: 390, ingust: true, semafor: SEM, actiune: true })).harta.sus, 0, "acțiune pe telefon: fără bandă");
  const B60 = bare(168, 3600000, 0.50, 0.55), i60 = G.intrareBot({ bot: { id: "1", pornitLa: ACUM - 5 * 3600000, gridJos: 0.5, gridSus: 0.55 }, bare: B60, acum: ACUM, W: 1000, fereastraToata: true });
  assert.equal(i60.fereastraPosibila, false, "pe 1 h nu se taie ⇒ butonul n-are rost"); assert.equal(i60.fereastraToata, true);
  const r = functie(APP, "renderTabloGrafic"); assert.match(r, /tbTfButoane\(\);[^\n]*\n\s*var fb=\$\("tbFerToata"\);if\(fb\)fb\.hidden=true;/, "ascuns la început, arătat doar pe drumul bun");
  const d = G.desen(Object.assign({}, baza, { W: 1000, fereastraToata: true, fereastraPosibila: true })); assert.match(d.legenda, /fereastra: toată \(24 de ore\), nu doar de la pornirea botului/);
  assert.doesNotMatch(G.desen(Object.assign({}, baza, { W: 1000, fereastraToata: true, fereastraPosibila: false })).legenda, /fereastra: toată/, "pe un bot vechi nu e nimic de spus");
  assert.match(CSS, /#tabloubot #tbGraficCard \.tbFerBtn\{[^}]*flex:0 0 auto;min-width:auto/, "pe telefon cele 5 butoane se împart egal; al 6-lea rămâne cât textul lui");
  assert.match(functie(APP, "renderTabloGrafic"), /if\(sy<\(d\.harta\.sus\|\|0\)\)\{ascunde\(\);return\}/, "atingerea în banda semaforului nu arată fișa lumânării");
  assert.match(functie(APP, "tbFereastraButon"), /^function tbFereastraButon\(oG\)\{/, "parametrul nefolosit a plecat");
});
await test("(E) versiunea de la v100.144 în sus", () => {
  assert.match(HTML, /content="v100\.1(4[4-9]|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4[4-9]|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4[4-9]|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4[4-9]|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(4[4-9]|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4[4-9]|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4[4-9]|[5-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
