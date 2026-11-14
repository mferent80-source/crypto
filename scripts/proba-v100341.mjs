// Proba v100.341 („FA IDEI”, 14.11.2026): ideile I-876..I-879 din backlog.
//   I-876  categoria scannerului „Bun pentru grid” își spune numele adevărat (candidați), fără lauda nedovedită
//   I-879  proba de ecran a Tabloului, reparată, rulează unde rulează și proba de telefon (înainte de push și după publicare)
//   I-878  bilanțul notei TradingView față de verdictul Radarului, pe pagină de la 30 de zile, ca fapt
//   I-877  reluarea efectului „benzi largi ⇒ drum mai lung” pe date noi: regulile scrise dinainte, scriptul refuză până sunt destule zile
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { incarcaLib, taie } from "./lib/motor-pagina.mjs";
import { probeDeEcran } from "./inainte-de-push.mjs";
import * as NTV from "./lib/tura-nota-tv.mjs";
import { judecaM5b, primaZiNoua, TAIETURA_M5, M5B } from "./lib/m5b-reluare.mjs";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.341 · ideile I-876..I-879 · proba\n");
const APP = citeste("public", "app.js"), taiePagina = (nume) => taie(APP, nume);

// ---------------- I-876: categoria scannerului ----------------
await test("(I-876) rețeta de grid a scannerului se numește „Candidați de grid”: spune ce sunt, nu că ar fi buni; explicația zice ce e măsurat și ce nu; filtrul e neschimbat", () => {
  const Scan = incarcaLib(["scan.js"], "Scan"), r = Scan.RETETE.find((x) => x.k === "grid");
  assert.equal(r.t, "🟦 Candidați de grid"); assert.equal(r.sub, "fără mișcare mare", "subtitlul spune ce verifică filtrul (era „liniștit, lateral”: „lateral” nu e verificat)");
  assert.doesNotMatch(r.e, /exact ce-i trebuie|s-a întors des/); assert.match(r.e, /nu e măsurat/); assert.match(r.e, /după o mișcare mare/, "singura regulă dovedită rămâne spusă"); assert.match(r.e, /primele 60 din clasamentul de grid/);
  assert.match(citeste("public", "lib", "grid-clasament.js"), /out\.stare = out\.regim\.miscare \? "evita" : "candidat";/, "premisa: „candidat” înseamnă doar „nu e în mișcare mare”");
  // filtrul: același ca înainte (candidat în clasamentul de grid, nu în mișcare, în primele 60)
  const m = (o) => Object.assign({ fel: "c", stare: "candidat", miscare: false, rang: 12 }, o);
  assert.equal(r.f(m({})), true); assert.equal(r.f(m({ miscare: true })), false); assert.equal(r.f(m({ rang: 61 })), false); assert.equal(r.f(m({ fel: "a" })), false); assert.equal(r.f(m({ stare: "evitat" })), false);
  assert.deepEqual(JSON.parse(JSON.stringify(Scan.RETETE.map((x) => x.k).slice(0, 3))), ["toate", "grid", "trend"], "cheile și ordinea rețetelor rămân");
  for (const f of [["public", "app.js"], ["public", "index.html"], ["public", "lib", "scan.js"], ["public", "lib", "scan-ecran.js"], ["public", "lib", "acasa-ecran.js"]]) assert.doesNotMatch(citeste(...f), /[Bb]un(e)? pentru grid/, f.join("/"));
  // cartela „fără bot” a Tabloului
  assert.match(APP, /'Candidați de grid, din Scan \(🟦\) · azi nu pornesc':'Pe ce aș porni \(🟦 candidații de grid, din Scan\)'/);
});

// ---------------- I-879: proba de ecran a Tabloului ----------------
await test("(I-879) proba de ecran a Tabloului rulează unde rulează și proba de telefon: înainte de push (oprește push-ul) și după publicare; fiecare are ocolirea ei", () => {
  const toate = probeDeEcran({});
  assert.deepEqual(toate.map((p) => p.fisier), ["proba-ecran-telefon.mjs", "proba-ecran-tablou.mjs"]); assert.ok(toate.every((p) => p.sari === false && p.nume && p.cat));
  assert.deepEqual(toate.map((p) => p.ocolire), ["SARI_PROBA_TELEFON", "SARI_PROBA_ECRAN"]);
  assert.deepEqual(probeDeEcran({ SARI_PROBA_TELEFON: "1" }).map((p) => p.sari), [true, false], "ocolirea probei de telefon nu o sare și pe cea de ecran");
  assert.deepEqual(probeDeEcran({ SARI_PROBA_ECRAN: "1" }).map((p) => p.sari), [false, true]); assert.deepEqual(probeDeEcran({ SARI_PROBA_TELEFON: "0" }).map((p) => p.sari), [false, false]);
  for (const p of toate) assert.ok(fs.existsSync(path.join(RAD, "scripts", p.fisier)), p.fisier);
  const s = citeste("scripts", "inainte-de-push.mjs");
  assert.match(s, /for \(const p of probeDeEcran\(process\.env\)\)/); assert.match(s, /process\.exit\(r\.status === null \? 1 : r\.status\)/, "prima probă picată oprește push-ul");
  assert.match(citeste("scripts", "copie-de-lucru.mjs"), /proba-ecran-telefon\.mjs[\s\S]{0,700}proba-ecran-tablou\.mjs/, "după publicare: întâi telefonul, apoi ecranul Tabloului");
  // reparația de fond a probei: datele false ajung la pagină (plasa de 3 s a cererilor identice se golește la fiecare schimbare de date)
  const pe = citeste("scripts", "proba-ecran-tablou.mjs");
  assert.match(pe, /apiTokenRespins = null; if \(typeof getJsonGoleste === "function"\) getJsonGoleste\(\);/); assert.match(pe, /x => \/\^market\\\\\?\.\*klines\/\.test\(x\)/, "pana de rută numără doar lumânările");
  assert.match(citeste("package.json"), /"test:ecran": "node scripts\/proba-ecran-tablou\.mjs"/);
});

// ---------------- I-878: bilanțul notei TradingView față de verdictul Radarului („N1”) ----------------
const ORA = 3600000, ZI = 86400000, Z0 = Date.UTC(2026, 10, 15), ziN = (k) => new Date(Date.UTC(2026, 10, 14) + k * ZI).toISOString().slice(0, 10);
// o zi cu `n` note pe 4 ore, judecate la timp: nota TradingView „sus” (+0,4), verdictul Radarului dat; `kTv` / `kRd` = câte nimeresc
const ziDeNote = (zi, n, kTv, kRd, o = {}) => Array.from({ length: n }, (_, i) => { const t = Z0 + zi * ZI + i * 4 * ORA; return { t, s: "ABC_USDT_PERP", p: 10, tv4h: 0.4, d4: i < kTv ? 11 : 9, t4: t + 16 * ORA,
  rv4: o.faraRadar ? null : (i < kRd) === (i < kTv) ? "BULLISH" : "BEARISH", tvZ: null, dZ: null }; });
// zilele direct (fără jurnal): `nZile` zile de la 14.11.2026, câte 6 note pe zi; kTv(z) / kRd(z) = câte nimeresc în ziua z
const zileLume = (nZile, kTv, kRd, start = 0) => { const z = {}; for (let d = start; d < start + nZile; d++) z[ziN(d)] = { tv4h: { n: 6, k: kTv(d) }, radar4h: kRd ? { n: 6, k: kRd(d) } : { n: 0, k: 0 }, tv1D: { n: 0, k: 0 }, radar1D: { n: 0, k: 0 }, asteapta: false }; return z; };
await test("(I-878a) zilele jurnalului: pe fiecare zi câte note au nimerit; neutrul, nejudecatul, expiratul, nota judecată târziu, cea dinaintea începutului și ora stricată nu se numără; ziua cu note în așteptare e însemnată; zilele se țin separat de jurnal", async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(NTV.N1)), { deLa: Date.UTC(2026, 10, 14, 10, 45), zileArata: 30, blocuri: 36, zilePeBloc: 5, minNoteBloc: 12, prag: 0.55, alfa: 0.05 / 70, tarziu: 20 * ORA });
  const t2 = Z0 + 2 * ZI, bune = ziDeNote(0, 6, 3, 6).concat(ziDeNote(1, 2, 2, 0));
  const J = bune.concat([{ t: t2, s: "A", p: 10, tv4h: 0.05, d4: 11, t4: t2 + 16 * ORA, rv4: "NEUTRAL" }, { t: t2, s: "A", p: 10, tv4h: 0.4, d4: null, rv4: "BULLISH" }, { t: t2 + ORA, s: "A", p: 10, tv4h: 0.4, d4: null, x4: 1, rv4: null },
    { t: t2 + 2 * ORA, s: "A", p: 10, tv4h: 0.4, d4: 11, t4: t2 + 32 * ORA, rv4: "BULLISH" }, { t: Date.UTC(2026, 10, 14, 9), s: "A", p: 10, tv4h: 0.4, d4: 11, t4: Date.UTC(2026, 10, 15, 1), rv4: "BULLISH" }, { t: "x", s: "A", p: 10, tv4h: 0.4, d4: 11, rv4: "BULLISH" }]);
  const z = NTV.zileDinJurnal(J);
  assert.deepEqual(Object.keys(z).sort(), ["2026-11-15", "2026-11-16", "2026-11-17"], "nota de pe 14.11 la 09:00 UTC e dinaintea începutului"); assert.deepEqual(z["2026-11-15"].tv4h, { n: 6, k: 3 }); assert.deepEqual(z["2026-11-15"].radar4h, { n: 6, k: 6 }); assert.equal(z["2026-11-15"].asteapta, false);
  assert.deepEqual(z["2026-11-17"].tv4h, { n: 0, k: 0 }, "neutrul, nejudecatul, expiratul și judecatul târziu nu se numără"); assert.equal(z["2026-11-17"].asteapta, true, "o notă cu direcție, nejudecată și neexpirată");
  const b = NTV.bilantDinZile(z); assert.deepEqual(b.serii.tv4h, { n: 8, k: 5, zile: 2 }); assert.deepEqual(b.serii.radar4h, { n: 8, k: 6, zile: 2 }); assert.equal(b.zile, 2); assert.deepEqual(b.serii.tv1D, { n: 0, k: 0, zile: 0 });
  assert.deepEqual(NTV.bilantNotaTv(J), b); assert.deepEqual(NTV.bilantNotaTv([]).serii.tv4h, { n: 0, k: 0, zile: 0 }); assert.equal(NTV.bilantNotaTv(null).zile, 0);
  const r = NTV.raportNotaTv(bune); assert.deepEqual(r["4h"], { n: 8, k: 5 }); assert.deepEqual(r.radar4h, { n: 8, k: 6 }, "numărătoarea veche, pe note, rămâne");
  // zilele ținute: ziua din jurnal o înlocuiește pe cea ținută; ziua ieșită din jurnal rămâne cum era
  const tinute = { "2026-11-10": { tv4h: { n: 6, k: 4 } }, "2026-11-15": { tv4h: { n: 1, k: 1 } } }, im = NTV.imbinaZile(tinute, z); assert.deepEqual(im["2026-11-10"], { tv4h: { n: 6, k: 4 } }); assert.deepEqual(im["2026-11-15"].tv4h, { n: 6, k: 3 }); assert.deepEqual(NTV.imbinaZile(null, null), {});
  // jurnalul se taie pe ZILE ÎNTREGI, cele mai vechi; tura spune ce zile au ieșit, ca să ajungă în cele ținute
  const trei = ziDeNote(0, 6, 3, 3).concat(ziDeNote(1, 6, 3, 3), ziDeNote(2, 6, 3, 3)), tj = NTV.taieJurnalPeZile(trei, 15);   /* 6 note pe zi: o zi întreagă, fără revărsare în următoarea */
  assert.equal(tj.jurnal.length, 12); assert.equal(tj.scoase.length, 6); assert.ok(tj.scoase.every((e) => e.t < Z0 + ZI), "a ieșit toată ziua cea mai veche, nu bucăți"); assert.deepEqual(NTV.taieJurnalPeZile(trei, 100), { jurnal: trei, scoase: [] });
  const tura = await NTV.turaNotaTv({ acum: Z0 + 3 * ZI, simboluri: [], stare: { felia: null, incercat: null, jurnal: trei }, cere: async () => ({ data: [] }) }); assert.deepEqual(tura.zileIesite, {}, "nimic tăiat ⇒ nicio zi ieșită");
});
await test("(I-878b) judecata: o singură dată pe serie, pe primele 36 de blocuri de 5 zile ÎNCHEIATE și valide; un bloc neîncheiat sau cu note în așteptare oprește numărătoarea; pragul 0,05 ÷ 70, minim 55%", () => {
  const tare = (d) => (d % 5 === 0 ? 3 : 5), jumate = () => 3;
  // 180 de zile = 36 de blocuri, dar ultimul nu e încheiat cât nu există o zi de după el
  const j180 = NTV.judecataDinZile(zileLume(180, tare, jumate)); assert.deepEqual(j180.tv4h, { gata: false, blocuri: 35, trebuie: 36 }); assert.deepEqual(j180.radar4h, { gata: false, blocuri: 35, trebuie: 36 });
  const j = NTV.judecataDinZile(zileLume(181, tare, jumate));
  assert.equal(j.tv4h.gata, true); assert.equal(j.tv4h.blocuri, 36); assert.equal(j.tv4h.deLa, "2026-11-14"); assert.equal(j.tv4h.panaLa, ziN(179)); assert.equal(j.tv4h.verdict, "DOVEDIT"); assert.ok(j.tv4h.medie > 0.7 && j.tv4h.p < NTV.N1.alfa, JSON.stringify(j.tv4h));
  assert.equal(j.radar4h.verdict, "NEDOVEDIT"); assert.ok(Math.abs(j.radar4h.medie - 0.5) < 1e-9);
  // zilele de DUPĂ primele 36 de blocuri nu mai schimbă nimic (altfel fiecare privire ar fi încă o încercare)
  assert.deepEqual(NTV.judecataDinZile(Object.assign(zileLume(181, tare, jumate), zileLume(60, () => 0, () => 6, 181))).tv4h, j.tv4h);
  // o notă în așteptare în blocul al 11-lea: numărătoarea se oprește acolo, chiar dacă blocurile de după sunt întregi
  const cuAsteptare = zileLume(181, tare, jumate); cuAsteptare[ziN(52)].asteapta = true; assert.deepEqual(NTV.judecataDinZile(cuAsteptare).tv4h, { gata: false, blocuri: 10, trebuie: 36 });
  // un bloc încheiat cu prea puține note se sare: mai trebuie unul
  const cuGol = zileLume(181, tare, jumate); for (let d = 20; d < 25; d++) cuGol[ziN(d)].tv4h = { n: 1, k: 1 }; assert.deepEqual(NTV.judecataDinZile(cuGol).tv4h, { gata: false, blocuri: 35, trebuie: 36 });
  assert.equal(NTV.judecataDinZile(Object.assign(cuGol, zileLume(5, tare, jumate, 181), zileLume(1, tare, jumate, 186))).tv4h.gata, true);
  // efect sigur, dar mic (52% în fiecare bloc): sub minimul de 55% ⇒ nedovedit
  const mic = NTV.judecataDinZile(zileLume(181, (d) => (d % 5 === 0 ? 4 : 3), jumate)); assert.equal(mic.tv4h.gata, true); assert.ok(mic.tv4h.medie < 0.55, String(mic.tv4h.medie)); assert.equal(mic.tv4h.verdict, "NEDOVEDIT");
  // fără verdictul Radarului: seria lui nu are blocuri, nu iese „nedovedit” din nimic
  assert.deepEqual(NTV.judecataDinZile(zileLume(181, tare, null)).radar4h, { gata: false, blocuri: 0, trebuie: 36 }); assert.deepEqual(NTV.judecataDinZile({}).tv4h, { gata: false, blocuri: 0, trebuie: 36 });
  // eșantion chiar fix: jurnalul scurtat de zilele vechi + zilele ținute = aceeași judecată ca jurnalul întreg
  const J = Array.from({ length: 181 }, (_, z) => ziDeNote(z - 1, 6, tare(z), 3)).flat(), intreg = NTV.judecataNotaTv(J), taiat = NTV.taieJurnalPeZile(J, 600);
  assert.equal(intreg.tv4h.gata, true); assert.ok(taiat.scoase.length > 0); assert.deepEqual(NTV.judecataDinZile(NTV.imbinaZile(NTV.zileDinJurnal(taiat.scoase), NTV.zileDinJurnal(taiat.jurnal))), intreg);
  assert.equal(NTV.judecataNotaTv(taiat.jurnal).tv4h.gata, false, "premisa: doar din jurnalul scurtat judecata n-ar mai ieși");
  // regulile sunt scrise în jurnalul de cercetare, cu aceleași cifre
  const D = citeste("docs", "cercetare", "2026-11-13-tablou-acuratete.md");
  assert.match(D, /## Jurnalul notei pe viu — regulile judecății \(scrise 14\.11\.2026, înaintea primei cifre\)/); assert.match(D, /\*\*primele\n?36 de blocuri\*\*/); assert.match(D, /p ≤ 0,05 ÷\n?\s?70/); assert.match(D, /cel puțin 55%/); assert.match(D, /cel mult 20 de ore/); assert.match(D, /sub 12 note/); assert.match(D, /14\.11\.2026 10:45 UTC/);
});
await test("(I-878c) pagina: fiecare serie apare abia de la 30 de zile ALE EI, ca fapt (procentul din note, câte note, în câte zile), fără culoare; după judecată spune rezultatul ei, cu o zecimală", () => {
  const TvNote = incarcaLib(["text-ro.js", "tv-note.js"], "TvNote"), S = (zTv, zRd) => ({ tv4h: { n: 172, k: 85, zile: zTv }, radar4h: { n: 150, k: 77, zile: zRd }, tv1D: { n: 0, k: 0, zile: 0 }, radar1D: { n: 0, k: 0, zile: 0 } });
  const fara = { tv4h: { gata: false, blocuri: 6, trebuie: 36 }, radar4h: { gata: false, blocuri: 6, trebuie: 36 } };
  assert.equal(TvNote.bilantText({ zile: 29, serii: S(29, 29), judecata: fara }), "", "sub 30 de zile nu se arată nimic"); assert.equal(TvNote.bilantText(null), ""); assert.equal(TvNote.bilantText({ zile: 40 }), "");
  assert.equal(TvNote.bilantText({ zile: 34, serii: S(34, 31), judecata: fara }),
    "Pe viu, din jurnalul colectorului, pe monedele boților tăi: nota TradingView pe 4 ore a nimerit direcția în 49% din note (172 de note judecate în 34 de zile); verdictul Radarului pe 4 ore în 51% (150 de note judecate în 31 de zile). Numărătoare, nu dovadă: judecata se face o singură dată, pe primele 36 de blocuri de 5 zile.");
  // revizia: seria cu doar 2 zile nu apare lângă cea de 30 („în 100% (2 note judecate)”)
  const unu = TvNote.bilantText({ zile: 30, serii: Object.assign(S(30, 2), { radar4h: { n: 2, k: 2, zile: 2 } }), judecata: null }); assert.match(unu, /^Pe viu, din jurnalul colectorului, pe monedele boților tăi: nota TradingView pe 4 ore a nimerit direcția în 49% din note \(172 de note judecate în 30 de zile\)\. Numărătoare/); assert.doesNotMatch(unu, /Radarului/);
  assert.match(TvNote.bilantText({ zile: 30, serii: S(2, 30), judecata: null }), /^Pe viu, din jurnalul colectorului, pe monedele boților tăi: verdictul Radarului pe 4 ore a nimerit direcția în 51% din note \(150 de note judecate în 30 de zile\)\. /);
  const tj = TvNote.bilantText({ zile: 200, serii: S(200, 200), judecata: { tv4h: { gata: true, blocuri: 36, verdict: "NEDOVEDIT", medie: 0.546, p: 0.2 }, radar4h: { gata: true, blocuri: 36, verdict: "DOVEDIT", medie: 0.551, p: 0.0001 } } });
  assert.match(tj, /Judecat o singură dată, pe primele 36 de blocuri de 5 zile: nota TradingView — nedovedit \(54,6% în medie pe bloc\); verdictul Radarului — nimerește direcția \(55,1% în medie pe bloc\)\.$/, tj);
  assert.match(TvNote.bilantText({ zile: 200, serii: S(200, 200), judecata: { tv4h: { gata: true, blocuri: 36, verdict: "NEDOVEDIT", medie: 0.5, p: 0.5 }, radar4h: { gata: false, blocuri: 30, trebuie: 36 } } }), /blocuri de 5 zile: nota TradingView — nedovedit \(50,0% în medie pe bloc\)\.$/);
  // pagina: îl aduce o dată pe oră (la eroare reîncearcă peste 5 minute) și îl pune sub tabelul notei, scăpat, în text simplu
  assert.match(taiePagina("renderTabloTv"), /TvNote\.bilantText\(tbStare\.notaBilant&&tbStare\.notaBilant\.b\)/); assert.match(taiePagina("renderTabloTv"), /<p class="tbSub" id="tbTvBilant">'\+escapeHtml\(bil\)\+'<\/p>/);
  assert.match(taiePagina("tbAduBilantNota"), /\/api\/istoric-bot\?action=notaTv/); assert.match(taiePagina("tbAduBilantNota"), /Date\.now\(\)-s\.la<3600000/); assert.match(taiePagina("tbAduBilantNota"), /s\.la=Date\.now\(\)-3600000\+300000/);
});
await test("(I-878d) serverul ține bilanțul trimis de colector (action=notaTv): cere forma întreagă, păstrează doar câmpurile știute, nu primește „la” din viitor; colectorul - RULAT - ține zilele pe disc, îngheață judecata pe serie și reîncearcă trimiterea picată", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js?t=" + Math.random()); let ip = 0;
  const h = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://ex.test", "cf-connecting-ip": "10.341.1." + (++ip) });
  const post = async (c) => (await m.onRequestPost({ request: new Request("https://ex.test/api/istoric-bot?action=notaTv", { method: "POST", headers: h(), body: JSON.stringify(c) }), env })).status;
  const get = async () => JSON.parse(await (await m.onRequestGet({ request: new Request("https://ex.test/api/istoric-bot?action=notaTv", { headers: h() }), env })).text());
  assert.deepEqual(await get(), { bilant: null });
  const zile = NTV.zileDinJurnal(ziDeNote(0, 6, 3, 6)), acum = Date.now(), b = Object.assign({ la: acum }, NTV.bilantDinZile(zile), { judecata: NTV.judecataDinZile(zile) });
  assert.equal(await post({ zile: 1 }), 400, "fără „la” și fără serii"); assert.equal(await post(Object.assign({}, b, { serii: { tv4h: { n: "x" } } })), 400); assert.equal(await post(Object.assign({}, b, { la: acum + 3600000 })), 400, "„la” din viitor");
  assert.equal(await post(Object.assign({}, b, { judecata: { tv4h: { gata: "da" } } })), 400); assert.equal(await post(Object.assign({}, b, { serii: Object.assign({}, b.serii, { tv4h: { n: 1, k: 2, zile: 1 } }) })), 400, "mai multe nimerite decât note");
  assert.equal(await post(Object.assign({}, b, { altceva: "<script>", judecata: Object.assign({}, b.judecata, { strain: 1 }) })), 200); assert.deepEqual((await get()).bilant, b, "câmpurile necunoscute nu se țin");
  assert.equal(await post(Object.assign({}, b, { judecata: null })), 200); assert.equal((await get()).bilant.judecata, null);
  const gataJ = { tv4h: { gata: true, blocuri: 36, deLa: "2026-11-14", panaLa: "2027-05-12", medie: 0.6, t: 5, p: 0.0001, verdict: "DOVEDIT" }, radar4h: { gata: false, blocuri: 3, trebuie: 36 } };
  assert.equal(await post(Object.assign({}, b, { judecata: gataJ })), 200); assert.deepEqual((await get()).bilant.judecata.tv4h, { gata: true, blocuri: 36, deLa: "2026-11-14", panaLa: "2027-05-12", medie: 0.6, p: 0.0001, verdict: "DOVEDIT" });
  // colectorul, rulat: funcțiile lui tăiate din fișier, cu discul, trimiterea și jurnalul de probă
  const C = citeste("scripts", "colector.mjs"), i0 = C.indexOf("let notaTvBilantTrimis = false, notaTvBilantIncercat = 0;"), i1 = C.indexOf("function notaTvCiteste() {", i0); assert.ok(i0 > 0 && i1 > i0);
  const lume = (o = {}) => { const L = { disc: new Map(Object.entries(o.disc || {})), log: [], trimise: [], jurnal: o.jurnal || [], pica: !!o.pica };
    L.f = new Function("fs", "scrieAtomic", "jurnal", "trimite", "notaTvCiteste", "NOTA_TV_JUDECATA_FIS", "NOTA_TV_ZILE_FIS", "zileDinJurnal", "imbinaZile", "bilantDinZile", "judecataDinZile",
      C.slice(i0, i1) + "; return { notaTvJudecata, notaTvZile, notaTvTrimiteBilant, stare: () => ({ trimis: notaTvBilantTrimis, incercat: notaTvBilantIncercat }) };")(
      { readFileSync: (f) => { if (!L.disc.has(f)) throw new Error("ENOENT"); return L.disc.get(f); } }, (f, obj) => L.disc.set(f, JSON.stringify(obj)), (...x) => L.log.push(x.join(" ")),
      async (cale, corp) => { if (L.pica) throw new Error("HTTP 400"); L.trimise.push([cale, corp]); }, () => L.jurnal, "J", "Z", NTV.zileDinJurnal, NTV.imbinaZile, NTV.bilantDinZile, NTV.judecataDinZile); return L; };
  // zilele: cele ținute + cele ieșite din jurnal + cele din jurnal, scrise pe disc
  const L1 = lume({ disc: { Z: JSON.stringify({ "2026-11-10": { tv4h: { n: 6, k: 4 }, radar4h: { n: 0, k: 0 } } }) }, jurnal: ziDeNote(1, 6, 3, 6) }), z1 = L1.f.notaTvZile({ zileIesite: NTV.zileDinJurnal(ziDeNote(0, 6, 6, 6)) });
  assert.deepEqual(Object.keys(z1).sort(), ["2026-11-10", "2026-11-15", "2026-11-16"]); assert.deepEqual(JSON.parse(L1.disc.get("Z")), z1, "scrise pe disc");
  // judecata: seria înghețată rămâne cea de pe disc, orice ar zice zilele; cea care se împlinește acum se îngheață o dată
  const zGata = zileLume(181, (d) => (d % 5 === 0 ? 3 : 5), () => 3), L2 = lume({ disc: { J: JSON.stringify({ tv4h: { gata: true, blocuri: 36, verdict: "NEDOVEDIT", medie: 0.5, p: 0.5, deLa: "x", panaLa: "y" } }) } }), j2 = L2.f.notaTvJudecata(zGata);
  assert.equal(j2.tv4h.verdict, "NEDOVEDIT", "judecata înghețată nu se reface, deși zilele de acum ar da DOVEDIT"); assert.equal(j2.radar4h.gata, true); assert.equal(j2.radar4h.verdict, "NEDOVEDIT");
  assert.deepEqual(Object.keys(JSON.parse(L2.disc.get("J"))).sort(), ["radar4h", "tv4h"], "seria împlinită acum s-a înghețat lângă cea veche"); assert.equal(L2.log.filter((x) => /judecata seriei radar4h/.test(x)).length, 1);
  const inainte = L2.disc.get("J"); L2.f.notaTvJudecata(zileLume(181, () => 6, () => 6)); assert.equal(L2.disc.get("J"), inainte, "a doua oară nu se mai scrie nimic");
  const L3 = lume({}); assert.deepEqual(L3.f.notaTvJudecata(zileLume(40, () => 3, () => 3)).tv4h, { gata: false, blocuri: 7, trebuie: 36 }); assert.equal(L3.disc.has("J"), false, "cât nu e gata, nu se îngheață nimic");
  // trimiterea: reușită ⇒ ținută minte; picată ⇒ se reîncearcă (însemnată ca netrimisă), fără alt canal
  const L4 = lume({ jurnal: ziDeNote(0, 6, 3, 6) }); await L4.f.notaTvTrimiteBilant(L4.f.notaTvZile(null)); assert.equal(L4.trimise.length, 1); assert.equal(L4.trimise[0][0], "/api/istoric-bot?action=notaTv"); assert.equal(L4.f.stare().trimis, true);
  assert.equal(await post(L4.trimise[0][1]), 200, "ruta primește exact ce trimite colectorul");
  const L5 = lume({ pica: true }); await L5.f.notaTvTrimiteBilant({}); assert.equal(L5.f.stare().trimis, false); assert.ok(L5.f.stare().incercat > 0); assert.ok(L5.log.some((x) => /nota tv bilant HTTP 400/.test(x)));
  assert.equal(await post(Object.assign({ la: Date.now() }, NTV.bilantDinZile({}), { judecata: NTV.judecataDinZile({}) })), 200, "și jurnalul gol trece");
  assert.doesNotMatch(C.slice(i0, i1).split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n"), /trimiteAlerta|discord/i, "bilanțul nu pleacă pe Discord (în cod, nu în comentarii)"); assert.match(C, /Date\.now\(\) - notaTvBilantIncercat >= 3600000/, "reîncercarea, cel mult o dată pe oră");
  assert.match(C, /const VERSIUNE_COLECTOR = "v101\.(18\d|19\d|[2-9]\d\d)"/); assert.doesNotMatch(citeste("functions", "_shared", "plafon-corp.js"), /notaTv/, "bilanțul e mic: rămâne pe plafonul implicit al rutei (64 KB)");
});

// ---------------- I-877: reluarea efectului „benzi largi ⇒ drum mai lung” pe date noi („M5b”) ----------------
await test("(I-877) reluarea pe date noi: doar zilele de după tăietura M5, primele 30 de blocuri de 5 zile ÎNCHEIATE și valide, un singur test (1h), pragul 0,05 ÷ 70, raportul pe bloc cel puțin 1,2; până atunci refuză; regulile sunt în jurnal", () => {
  assert.equal(TAIETURA_M5, 1794596400000, "capătul datelor din M5"); assert.equal(primaZiNoua(), "2026-11-14"); assert.deepEqual(M5B, { blocuri: 30, zilePeBloc: 5, alfa: 0.05 / 70, minim: 1.2, minClasa: 20 });
  // zile noi: drumul după benzi largi = raport × drumul după benzi strânse, cu puțin zgomot pe bloc
  const lume = (nZile, raport, zgomot = 0.05, start = 0) => { const z = {}; for (let k = start; k < start + nZile; k++) { const bl = Math.floor(k / 5), f = 1 + zgomot * Math.sin(bl * 1.7); z[ziN(k)] = { rid: { n: 30, s: 30 * 10 * raport * f }, joasa: { n: 30, s: 30 * 10 } }; } return z; };
  // revizia: blocul al 30-lea neterminat NU se numără - cu 146 de zile (29 de blocuri + o zi) și cu 150 (ultimul bloc fără ziua de după el) refuză
  assert.deepEqual(judecaM5b(lume(146, 1.4)), { gata: false, blocuri: 29, trebuie: 30, primaZi: "2026-11-14" }); assert.deepEqual(judecaM5b(lume(150, 1.4)), { gata: false, blocuri: 29, trebuie: 30, primaZi: "2026-11-14" });
  assert.deepEqual(judecaM5b({}), { gata: false, blocuri: 0, trebuie: 30, primaZi: "2026-11-14" });
  // de la 151 de zile judecă, și dă același lucru oricând s-ar rula după aceea (eșantion fix)
  const mare = judecaM5b(lume(151, 1.4)); assert.equal(mare.gata, true); assert.equal(mare.blocuri, 30); assert.equal(mare.panaLa, ziN(149)); assert.equal(mare.verdict, "DOVEDIT"); assert.ok(Math.abs(mare.raport - 1.4) < 0.03 && mare.p < M5B.alfa, JSON.stringify(mare));
  for (const n of [152, 155, 300]) assert.deepEqual(judecaM5b(lume(n, 1.4)), mare, n + " de zile");
  assert.deepEqual(judecaM5b(Object.assign(lume(151, 1.4), lume(200, 0.5, 0.05, 151))), mare, "blocurile de după primele 30 nu mai schimbă judecata");
  // efect sigur, dar mic (1,1) ⇒ NEDOVEDIT (sub minimul de 1,2); fără efect ⇒ NEDOVEDIT
  const mic = judecaM5b(lume(151, 1.1)); assert.ok(mic.p < M5B.alfa && mic.raport < 1.2, JSON.stringify(mic)); assert.equal(mic.verdict, "NEDOVEDIT"); assert.equal(judecaM5b(lume(151, 1.0, 0.2)).verdict, "NEDOVEDIT");
  // zilele dinaintea tăieturii nu intră, oricât de bine ar arăta (datele vechi au fost deja folosite)
  const vechi = lume(400, 3, 0.05, -400); assert.equal(judecaM5b(vechi).gata, false); assert.equal(judecaM5b(vechi).blocuri, 0); assert.deepEqual(judecaM5b(Object.assign({}, vechi, lume(151, 1.4))), mare);
  // un bloc încheiat cu prea puține eșantioane într-o clasă se sare, deci nu se numără printre cele 30
  const cuGol = lume(151, 1.4); for (let k = 10; k < 15; k++) cuGol[ziN(k)].joasa = { n: 1, s: 10 }; assert.deepEqual(judecaM5b(cuGol), { gata: false, blocuri: 29, trebuie: 30, primaZi: "2026-11-14" });
  // scriptul: modul lui, doar pe 1h, fără cache care să înghețe o rulare de probă, oprire la răspuns stricat
  const S = citeste("scripts", "cercetare-v100339-acuratete.mjs"); assert.match(S, /CE === "m5b"/); assert.match(S, /judecaM5b\(/); assert.match(S, /PREA DEVREME/); assert.match(S, /if \(tf !== "1h"\) \{ console\.log\(`\\n⇒ M5b · \$\{tf\}: nu se judecă/);
  assert.match(S, /const f = PANA \? path\.join\(CACHE, sym \+ "-" \+ tf \+ "-dupa-" \+ PANA \+ "\.json"\) : null;/); assert.match(S, /if \(!Array\.isArray\(k\)\) throw new Error\("M5b: Binance n-a dat lumânări/);
  // jurnalul are regulile, scrise dinainte, cu aceleași cifre și cu șansele spuse pe față
  const D = citeste("docs", "cercetare", "2026-11-13-tablou-acuratete.md");
  assert.match(D, /## M5b — reluarea efectului B pe date noi \(regulile scrise 14\.11\.2026, înaintea oricărei bare noi\)/); assert.match(D, /30 de blocuri încheiate/); assert.match(D, /p ≤ 0,05 ÷ 70/); assert.match(D, /cel puțin ×1,2/); assert.match(D, /×1,18 și ×1,13/); assert.match(D, /7–34%/); assert.match(D, /Un singur test, pe 1h/);
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
