// Proba v100.360 (18.11.2026, el: „proba prospectivă «3 la rând»: regula scrisă ACUM, verdict pe zile NOI”): „✋ 3 pierderi la rând = gata ziua”
// - modulul scripts/lib/tura-trei-la-rand.mjs (regulile: docs/cercetare/2026-11-18-proba-trei-la-rand.md), tura din colector, ruta treiLaRand,
// rândul de pe Probe. Cazuri construite, mărimea testului sub H0 prin simulare, efectul construit, determinismul.
//   node scripts/proba-v100360-trei.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const M = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-trei-la-rand.mjs")).href);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("V100.360 · 3 pierderi la rând = gata ziua · proba");
const ORA = 3600000, ZI = 86400000;
// ora h:mm a zilei z la București
const la = (z, h, m = 0) => M.inceputZiRo(z) + h * ORA + m * 60000;
let nrId = 0;
const bot = (z, hp, hi, net, zi2) => ({ id: "b" + String(++nrId).padStart(5, "0"), pornit: la(z, hp), inchis: la(zi2 || z, hi), net });
const toateZilele = (boti, pana) => { const pz = new Map(); for (const b of boti) { const z = M.ziRo(b.pornit); if (!pz.has(z)) pz.set(z, []); pz.get(z).push(b.id); } const out = []; for (let z = M.REG.startZi; z <= pana; z = M.ziUrm(z)) out.push({ zi: z, ids: pz.get(z) || [] }); return out; };

await test("🔑 T1 regulile fixate înainte (REG) și documentul pre-înregistrării le are pe toate", () => {
  assert.equal(M.REG.startZi, "2026-11-19"); assert.equal(M.REG.startMs, M.inceputZiRo("2026-11-19")); assert.equal(new Date(M.REG.startMs).toISOString(), "2026-11-18T22:00:00.000Z");
  assert.equal(M.REG.B, 2000); assert.equal(M.REG.samanta, 20261119); assert.equal(M.REG.alfa, 0.05); assert.equal(M.REG.asteptZile, 7); assert.equal(M.REG.pragImplicit, 3);
  assert.ok(Object.isFrozen(M.REG));
  const doc = citeste("docs", "cercetare", "2026-11-18-proba-trei-la-rand.md");
  for (const s of ["19.11.2026 00:00 Europe/Bucharest", "20261119", "B = 2.000", "α = 5% unilateral", "N = " + M.REG.N, M.REG.limita.split("-").reverse().join("."), "nu s-a dovedit", "ce NU se schimbă"]) assert.ok(doc.includes(s), "documentul: " + s);
  assert.match(doc, /## 9\. Puterea și orizontul[\s\S]*N = \d+/); assert.doesNotMatch(doc, /completat după simularea puterii — vezi mai jos/, "secțiunea 9 completată");
});

await test("🔑 T2 ziua cu declanșare: seria în ordinea ÎNCHIDERII, D = porniți după T, Î = până la T; S = diferența ponderată; ziua fără declanșare nu intră", () => {
  const z = "2026-11-20", z2 = "2026-11-21", B = [
    bot(z, 8, 11, -1), bot(z, 9, 11.5, -2), bot(z, 10, 12, -3),   // trei pierderi la rând ⇒ T = 12:00
    bot(z, 7, 20, 1),                                              // pornit înainte de T (închis după) ⇒ Î
    bot(z, 13, 15, -5),                                            // pornit după T ⇒ D
    bot(z2, 8, 9, -1), bot(z2, 8.5, 10, -1), bot(z2, 9, 11, 2), bot(z2, 10, 12, -1), bot(z2, 11, 13, -1), bot(z2, 14, 15, 4)];   // seria se rupe (−1, −1, +2, −1, −1, +4) ⇒ fără declanșare
  const C = M.construieste(B, toateZilele(B, z2)), e = M.evalueaza(C, C.v, 3);
  assert.equal(e.decl, 1); assert.equal(e.cont, 1); assert.equal(e.nD, 1); assert.equal(e.nI, 4);
  assert.equal(e.S, -5 - (-1 - 2 - 3 + 1) / 4, "−5 − (−1,25) = −3,75");
  const pz = []; M.evalueaza(C, C.v, 3, pz); assert.deepEqual(pz.map((x) => x.decl), [0, 1, 0]); assert.equal(pz[1].w, 1 * 4 / 5);
  assert.equal(M.evalueaza(C, C.v, 4).decl, 1, "pragul 4: −1, −2, −3, −5 ⇒ T la 15:00"); assert.equal(M.evalueaza(C, C.v, 4).cont, 0, "nimeni pornit după 15:00");
  assert.equal(M.evalueaza(C, C.v, 5).decl, 0, "pragul 5 ⇒ nicio declanșare");
});

await test("T3 ordinea închiderii, nu a pornirii; net 0 rupe seria; o zi cu declanșare fără boți „după” nu contează; două zile se ponderează nD·nÎ/(nD+nÎ)", () => {
  const z = "2026-11-22", y = "2026-11-23", w = "2026-11-24";
  const B = [bot(z, 8, 9, -1), bot(z, 9, 10, -1), bot(z, 10, 14, -1), bot(z, 11, 11.5, 3), bot(z, 15, 16, -4)];   // după pornire 3 pierderi la rând, după închidere: −1, −1, +3, −1 ⇒ nu
  const C = M.construieste(B, toateZilele(B, z)); assert.equal(M.evalueaza(C, C.v, 3).decl, 0);
  const B0 = [bot(y, 8, 9, -1), bot(y, 9, 10, -1), bot(y, 10, 11, 0), bot(y, 11, 12, -1), bot(y, 12, 13, -1), bot(y, 14, 16, 5)];
  const C0 = M.construieste(B0, toateZilele(B0, y).filter((x) => x.zi >= y)); assert.equal(M.evalueaza(C0, C0.v, 3).decl, 0, "net 0 rupe seria (−1, −1, 0, −1, −1)");
  C0.v[2] = -0.01; assert.equal(M.evalueaza(C0, C0.v, 3).decl, 1, "cu −0,01 în loc de 0 ⇒ declanșare");
  const Bf = [bot(w, 8, 9, -1), bot(w, 9, 10, -1), bot(w, 10, 11, -1)];
  const Cf = M.construieste(Bf, toateZilele(Bf, w).filter((x) => x.zi >= w)), ef = M.evalueaza(Cf, Cf.v, 3); assert.equal(ef.decl, 1); assert.equal(ef.cont, 0); assert.equal(ef.S, null);
  // două zile: (nD 1, nÎ 4, d −3,75) și (nD 2, nÎ 3, d +1)
  const a = "2026-11-25", b = "2026-11-26";
  const B2 = [bot(a, 8, 11, -1), bot(a, 9, 11.5, -2), bot(a, 10, 12, -3), bot(a, 7, 20, 1), bot(a, 13, 15, -5),
    bot(b, 6, 9, -2), bot(b, 7, 10, -2), bot(b, 8, 11, -2), bot(b, 12, 13, -1), bot(b, 13, 14, -1)];
  const C2 = M.construieste(B2, toateZilele(B2, b).filter((x) => x.zi >= a)), e2 = M.evalueaza(C2, C2.v, 3);
  const w1 = 4 / 5, w2 = 6 / 5; assert.equal(e2.cont, 2); assert.ok(Math.abs(e2.S - (w1 * -3.75 + w2 * (-1 - -2)) / (w1 + w2)) < 1e-12);
});

await test("🔑 T4 boții încă deschiși: ziua așteaptă (sau 7 zile); membrii se îngheață; cel închis târziu intră doar în seria zilei lui, cu netul nemișcat", () => {
  const z = "2026-11-19", st = {}, B = [bot(z, 8, 9, -1), bot(z, 9, 10, -1)], lung = { id: "lung", pornit: la(z, 10), inchis: la("2026-11-28", 9), net: -2 };
  const sf = M.sfarsitZiRo(z);
  assert.equal(M.judecaZile(st, B, [lung.pornit], sf + 2 * ORA), 0, "un bot deschis ⇒ ziua așteaptă"); assert.equal(st.zile[z], undefined);
  assert.equal(M.judecaZile({}, B, null, sf + 2 * ORA), 0, "lista deschișilor n-a venit ⇒ așteaptă (regula celor 7 zile)");
  const s2 = {}; assert.equal(M.judecaZile(s2, B, [], sf + 2 * ORA), 1, "toți închiși ⇒ judecată a doua zi"); assert.equal(s2.zile[z].cum, "inchise"); assert.deepEqual(s2.zile[z].ids, B.map((b) => b.id));
  // după 7 zile ziua se judecă fără botul încă deschis; la judecarea târzie a altor zile nu se mai atinge
  const t7 = sf + 7 * ZI; assert.ok(M.judecaZile(st, B, [lung.pornit], t7) >= 1); assert.equal(st.zile[z].cum, "7zile"); assert.deepEqual(st.zile[z].ids, B.map((b) => b.id));
  const inainte = JSON.stringify(st.zile[z]); M.judecaZile(st, B.concat([lung]), [], t7 + 3 * ZI); assert.equal(JSON.stringify(st.zile[z]), inainte, "ziua judecată nu se mai atinge");
  // botul lung, închis pe 28.11 după două pierderi ale zilei: intră în seria zilei de 28 cu netul fix
  const z28 = "2026-11-28", B28 = [bot(z28, 7, 8, -1), bot(z28, 7.5, 8.5, -1), bot(z28, 12, 13, -3), bot(z28, 6, 20, 2)], tot = B.concat([lung], B28);
  const s3 = { zile: {} }; for (let d = z; d <= z28; d = M.ziUrm(d)) s3.zile[d] = { ids: d === z ? B.map((b) => b.id) : d === z28 ? B28.map((b) => b.id) : [] };
  const C = M.construieste(tot, M.prefix(s3)); assert.equal(C.F.length, 1, "netul botului lung e fix (nu e membru)"); assert.equal(C.v.length, 6);
  const e = M.evalueaza(C, C.v, 3); assert.equal(e.decl, 1, "ziua 19: doar 2 pierderi; ziua 28: −1, −1, apoi −2 (botul lung, 09:00) ⇒ T");
  assert.equal(e.cont, 1); assert.equal(e.S, -3 - (-1 - 1 + 2) / 3);
});

await test("T5 prefixul continuu de la start; boții porniți înainte de start intră doar în serie (netul fix); pragul din configurare", () => {
  const st = { zile: { "2026-11-19": { ids: [] }, "2026-11-21": { ids: [] } } }; assert.deepEqual(M.prefix(st).map((x) => x.zi), ["2026-11-19"], "gaura din 20.11 oprește prefixul");
  const z = "2026-11-19", vechi = { id: "vechi", pornit: la("2026-11-17", 10), inchis: la(z, 9), net: -4 };
  const B = [vechi, bot(z, 6, 10, -1), bot(z, 7, 11, -1), bot(z, 12, 13, -2), bot(z, 5, 22, 3)];
  const C = M.construieste(B, toateZilele(B.slice(1), z)), e = M.evalueaza(C, C.v, 3);
  assert.equal(C.F.length, 1); assert.equal(e.decl, 1, "vechiul (−4 la 09:00) + −1 + −1 ⇒ T la 11:00"); assert.equal(e.nD, 1); assert.equal(e.nI, 3);
  assert.equal(M.judecaZile({}, [vechi], [], M.sfarsitZiRo(z) + ORA), 1);
  const s = {}; M.judecaZile(s, [vechi], [], M.sfarsitZiRo(z) + ORA); assert.deepEqual(s.zile[z].ids, [], "pornit înainte de start ⇒ nu e membru");
  assert.equal(M.pragDin({ config: { frana: { rand: 4 } } }), 4); assert.equal(M.pragDin({ config: { canal: "discord" } }), 3); assert.equal(M.pragDin({ config: null }), 3); assert.equal(M.pragDin({ config: { frana: { rand: "2.6" } } }), 3);
  assert.equal(M.deschiseDin({ bots: [{ pornitLa: 5 }], probleme: { trunchiat: true } }), null); assert.deepEqual(M.deschiseDin({ bots: [{ pornitLa: 5, activ: true }, { pornitLa: 7, activ: false }] }), [5]);
});

// lumi sintetice: zile de la start, 3–14 boți pe zi, ore și durate la întâmplare, netul independent de poziția în zi (fără efect)
function lume(zile, sam, delta = 0) {
  const r = M.mulberry32(sam), B = [], g = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  let z = M.REG.startZi;
  for (let i = 0; i < zile; i++, z = M.ziUrm(z)) {
    const n = 3 + Math.floor(r() * 12), t0 = M.inceputZiRo(z);
    for (let k = 0; k < n; k++) { const p = t0 + r() * 0.95 * ZI, d = -Math.log(1 - r()) * 4 * ORA + 60000; B.push({ id: i + "-" + k, pornit: p, inchis: p + d, net: g() * 3 - 0.3 }); }
  }
  const zl = toateZilele(B, M.ziRo(B[B.length - 1].pornit)), C = M.construieste(B, zl);
  if (delta) for (const Z of C.Z) { let rr = 0, T = null; for (let i = 0; i < Z.seq.length; i++) { const e = Z.seq[i], x = e >= 0 ? C.v[e] : C.F[-e - 1]; rr = x < 0 ? rr + 1 : 0; if (rr >= 3) { T = Z.tInch[i]; break; } } if (T === null) continue; for (let i = 0; i < Z.mem.length; i++) if (Z.mPornit[i] > T) C.v[Z.mem[i]] += delta; }
  return C;
}
await test("🔑 T6 mărimea testului sub H0 (simulare, 400 de lumi fără efect, 120 de zile): „ține” fals în ≤ ~5%; față de ZERO ar fi ieșit fals mult mai des (mecanica)", () => {
  let fals = 0, pozitiv = 0, mec = 0; const R = 400;
  for (let k = 0; k < R; k++) { const C = lume(120, 9000 + k), t = M.testH0(C, 3, 200, 31 + k); if (t.p != null && t.p <= 0.05) fals++; if (t.S > 0) pozitiv++; mec += t.mecanica; }
  const f = fals / R; console.log(`       fals „ține”: ${(f * 100).toFixed(1).replace(".", ",")}% · S > 0 în ${(pozitiv / R * 100).toFixed(0)}% din lumi · mecanica medie +${(mec / R).toFixed(1).replace(".", ",")} USDT pe bot`);
  assert.ok(f <= 0.075, "mărimea " + f); assert.ok(f >= 0.02, "nici prea strâmt " + f);
  assert.ok(mec / R > 0.3, "mecanica împinge „după” în sus (de aceea H0 în zi, nu zero)"); assert.ok(pozitiv / R > 0.6);
});
await test("🔑 T7 efectul construit (după −3 USDT pe bot, 120 de zile) ⇒ detectat în cele mai multe lumi; fără efect nu", () => {
  let det = 0; const R = 120;
  for (let k = 0; k < R; k++) { const t = M.testH0(lume(120, 5000 + k, -3), 3, 200, 7 + k); if (t.p != null && t.p <= 0.05) det++; }
  console.log(`       detectat: ${(det / R * 100).toFixed(0)}%`); assert.ok(det / R >= 0.8, "puterea " + det / R);
});
await test("T8 determinism: aceeași sămânță ⇒ aceleași amestecări și același p; altă sămânță ⇒ altele; mulberry32 (nu LCG)", () => {
  const C = lume(60, 42), a = M.amestecari(C, 3, 300), b = M.amestecari(C, 3, 300), c = M.amestecari(C, 3, 300, 1);
  assert.deepEqual(a, b); assert.notDeepEqual(a, c); assert.deepEqual(M.testH0(C, 3, 300), M.testH0(C, 3, 300));
  const src = citeste("scripts", "lib", "tura-trei-la-rand.mjs"); assert.match(src, /0x6D2B79F5/); assert.doesNotMatch(src, /1103515245/); assert.doesNotMatch(src, /Math\.random/);
  assert.equal(M.testH0(C, 3).B, 2000, "implicit B = 2.000");
});
await test("T9 orizontul: la a N-a zi care contează (prefixul se taie acolo), altfel la limită; înainte = null", () => {
  const pre = []; for (let z = M.REG.startZi; pre.length < 3 * M.REG.N; z = M.ziUrm(z)) pre.push({ zi: z });
  const per = pre.map((_, i) => ({ w: i % 2 ? 1 : 0 }));
  assert.equal(M.orizont(pre.slice(0, 2 * M.REG.N - 1), per), null, "cu N − 1 zile care contează ⇒ încă în curs");
  assert.deepEqual(M.orizont(pre, per), { pana: 2 * M.REG.N - 1, motiv: "N" }, "a N-a zi care contează e a 2N-a zi");
  const lim = [{ zi: "2027-11-17" }, { zi: M.REG.limita }, { zi: "2027-11-19" }]; assert.deepEqual(M.orizont(lim, [{ w: 1 }, { w: 0 }, { w: 1 }]), { pana: 1, motiv: "limita" });
});

// tura cu lumea simulată a colectorului
const JT = { din: (l) => l.map((x) => ({ id: x.strategyId, pornit: x.createTime, inchis: x.closeTime, net: x.n })) };
function colector(acum, boti, opt = {}) {
  const trimise = [], jur = [], lista = boti.map((b) => ({ strategyId: b.id, createTime: b.pornit, closeTime: b.inchis, n: b.net })); lista.complet = opt.complet !== false;
  return { trimise, jur, d: { acum, JurnalTrade: JT, botiInchisi: async () => lista, deschise: async () => opt.deschise || { bots: [] }, config: async () => opt.config || { config: { frana: { rand: 3 } } },
    trimite: async (u, c) => { trimise.push({ u, c }); return { ok: true }; }, jurnal: (...a) => jur.push(a.join(" ")) } };
}
await test("🔑 T10 tura: o dată pe zi după 00:30 UTC; pragul citit o dată și ÎNGHEȚAT; arhiva incompletă ⇒ aruncă; trimite starea; verdict null înainte de orizont", async () => {
  const z = "2026-11-20", B = [bot(z, 8, 11, -1), bot(z, 9, 11.5, -2), bot(z, 10, 12, -3), bot(z, 7, 20, 1), bot(z, 13, 15, -5)];
  const st = {}, t = Date.parse("2026-11-21T00:20:00Z");
  assert.equal(await M.turaTreiLaRand(colector(t, B).d, st), null, "înainte de 00:30 UTC");
  const L = colector(t + 20 * 60000, B, { config: { config: { frana: { rand: 3 } } } }), o = await M.turaTreiLaRand(L.d, st);
  assert.equal(st.prag, 3); assert.equal(L.trimise.length, 1); assert.equal(L.trimise[0].u, "/api/istoric-bot?action=treiLaRand");
  assert.equal(o.zileJudecate, 2, "19 și 20.11"); assert.equal(o.zileCuDeclansare, 1); assert.equal(o.zileConteaza, 1); assert.equal(o.statistica, -3.75); assert.equal(o.verdict, null); assert.ok(o.pH0 > 0 && o.pH0 <= 1);
  assert.equal(L.jur[0], "3 la rând: 2 zile noi judecate, în total 2 zile; care contează: 1 din " + M.REG.N);
  assert.equal(await M.turaTreiLaRand(L.d, st), null, "a doua oară în aceeași zi UTC");
  const L2 = colector(t + ZI + 20 * 60000, B, { config: { config: { frana: { rand: 5 } } } }); const o2 = await M.turaTreiLaRand(L2.d, st);
  assert.equal(st.prag, 3, "pragul rămâne cel de la start"); assert.equal(o2.prag, 3); assert.equal(o2.zileCuDeclansare, 1); assert.equal(o2.zileJudecate, 3);
  await assert.rejects(M.turaTreiLaRand(colector(t + 2 * ZI + 20 * 60000, B, { complet: false }).d, st), /arhiva/);
  await assert.rejects(M.turaTreiLaRand(colector(t + 20 * 60000, B, { config: { error: "x" } }).d, {}), /configurarea/);
  assert.equal(Object.keys(o).sort().join(","), "B,N,alfa,asteapta,forma,inghetat,la,limita,mecanica,nD,nI,pH0,peste,prag,start,statistica,ultimaZi,verdict,verdictLa,zileConteaza,zileCuDeclansare,zileJudecate");
});
await test("T11 verdictul: la a N-a zi care contează se calculează O dată și se îngheață (zilele de după nu-l mai mută)", async () => {
  const boti = [], r = M.mulberry32(77); let z = M.REG.startZi; for (let i = 0; i < 400; i++, z = M.ziUrm(z)) { const n = 4 + Math.floor(r() * 10), t0 = M.inceputZiRo(z); for (let k = 0; k < n; k++) { const p = t0 + r() * 0.9 * ZI; boti.push({ id: i + "/" + k, pornit: p, inchis: p + r() * 3 * ORA + 60000, net: (r() - 0.55) * 6 }); } }
  const st = { prag: 3, zile: {} }, acum = M.sfarsitZiRo(z) + ORA; M.judecaZile(st, boti, [], acum);
  const o = M.socoteste(boti, st, acum); assert.ok(o.zileConteaza >= M.REG.N, "destule zile: " + o.zileConteaza);
  assert.ok(o.verdict === "tine" || o.verdict === "nu-tine"); assert.equal(o.inghetat.zileConteaza, M.REG.N); assert.equal(o.inghetat.motiv, "N");
  const v1 = JSON.stringify(st.verdict); boti.forEach((b) => { b.net = -b.net; }); const o2 = M.socoteste(boti, st, acum + ZI);
  assert.equal(JSON.stringify(st.verdict), v1, "înghețat"); assert.equal(o2.verdict, o.verdict);
});

// pagina în vm
function pagina() {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(["text-ro.js", "caiet.js", "sugestii-ecran.js", "probe-ecran.js"].map((f) => lib(f)).join("\n") + "\nthis.prProbe = prProbe; this.prStadiuHtml = prStadiuHtml;", ctx);
  return ctx;
}
const ACUM = Date.parse("2027-01-10T10:00:00Z");
const TR = { forma: 1, la: ACUM - 8 * ORA, start: "2026-11-19", limita: M.REG.limita, prag: 3, N: M.REG.N, B: 2000, alfa: 0.05, zileJudecate: 52, ultimaZi: "2027-01-09", asteapta: 1,
  zileCuDeclansare: 9, zileConteaza: 8, nD: 31, nI: 22, statistica: -1.2345, mecanica: 3.6789, peste: -4.9134, pH0: 0.0312, verdict: null, verdictLa: null, inghetat: null };
const vizibil = (s) => String(s).replace(/<[^>]+>/g, " ");
await test("🔑 T12 Probe: rândul „✋ 3 pierderi la rând” la CAPĂT (după Oscilo), de când / judecate / cum stă fără p înainte de orizont / drumul până la N", () => {
  const P = pagina(), R = JSON.parse(JSON.stringify(P.prProbe({ treiLaRand: TR }, ACUM))), o = R[R.length - 1];
  assert.equal(o.k, "trei"); assert.equal(R[R.length - 2].k, "osc", "Oscilo rămâne înainte"); assert.match(o.nume, /^✋ 3 pierderi la rând = gata ziua/);
  assert.equal(o.de, "19.11.2026"); assert.equal(o.jud, "52 de zile judecate, 9 cu declanșare, 8 din " + M.REG.N + " care contează (cu boți și înainte, și după)");
  assert.equal(o.sta, "după − înainte: −1,2 USDT pe bot; doar mecanica ar da +3,7; sub " + M.REG.N + (M.REG.N >= 20 ? " de" : "") + " zile care contează, cifrele sunt zgomot");
  assert.doesNotMatch(o.sta, /\bp\b|VERDICT|ține:/, "fără p și fără verdict înainte de orizont");
  assert.match(o.ultima, /^ultima tură: 10\.01 0[24]:00 · 1 zi așteaptă închiderea boților$/);
  assert.match(o.drum.svg, new RegExp('aria-label="3 la rând: 8 din cele ' + M.REG.N + (M.REG.N >= 20 ? " de" : "") + ' zile care contează ale verdictului"'));  assert.match(o.drum.text, new RegExp("^fără dată fixă: verdictul la a " + M.REG.N + "-a zi care contează, cel târziu la " + M.REG.limita.split("-").reverse().join("\\.") + "; puterea"));
  const g = JSON.parse(JSON.stringify(P.prProbe({}, ACUM))).pop(); assert.equal(g.k, "trei"); assert.match(g.jud, /^nicio zi judecată încă/); assert.match(g.sta, /^pe istoric: după − înainte −0,5 USDT pe bot, iar doar mecanica ar da \+3,8/); assert.equal(g.ultima, "aștept tura de după 00:30 UTC");
  const V = Object.assign({}, TR, { zileConteaza: M.REG.N, verdict: "nu-tine", inghetat: { la: ACUM, verdict: "nu-tine", motiv: "N", pana: "2027-06-01", zileConteaza: M.REG.N, statistica: 0.512, mecanica: 3.71, peste: -3.2, pH0: 0.1734 } });
  const v = JSON.parse(JSON.stringify(P.prProbe({ treiLaRand: V }, ACUM))).pop(); assert.match(v.sta, /^VERDICT pe \d+ (de )?zile \(până la 01\.06\.2027\): nedovedit pe zilele noi \(nu înseamnă că regula e greșită\) · după − înainte \+0,5 USDT pe bot, mecanica singură \+3,7, p 0,17$/);
  const vt = JSON.parse(JSON.stringify(P.prProbe({ treiLaRand: Object.assign({}, V, { verdict: "tine", inghetat: Object.assign({}, V.inghetat, { verdict: "tine", pH0: 0.021 }) }) }, ACUM))).pop(); assert.match(vt.sta, /: ține: boții porniți după 3 pierderi la rând au ieșit mai prost decât dă mecanica · .* p 0,02$/);
  const vechi = JSON.parse(JSON.stringify(P.prProbe({ treiLaRand: Object.assign({}, TR, { la: ACUM - 40 * ORA }) }, ACUM))).pop(); assert.match(vechi.ultima, / · VECHE/);
  // convențiile: virgula zecimală, minusul tipografic, fără engleză / null
  const tot = [o, g, v].map((x) => (({ drum, ...y }) => JSON.stringify(y) + " " + drum.text)(x)).join(" ");
  assert.doesNotMatch(vizibil(tot).replace(/\b\d{1,2}\.\d{2}(\.\d{4})?\b/g, "DATA"), /\d\.\d/); assert.doesNotMatch(tot, /(^|[\s(])-\d/); assert.doesNotMatch(tot, /\b(NaN|undefined|null|trigger|bots)\b/i);
  assert.match(P.prStadiuHtml({ treiLaRand: TR }, ACUM), /data-proba="trei"/);
});

await test("🔑 T13 ruta: GET gol ⇒ null; POST bun ⇒ 200 și doar câmpurile știute; forme greșite ⇒ 400; starea reală a turei trece", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=treiLaRand", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.3", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=treiLaRand", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.3" } }), env: ENV });
  let j = await (await get()).json(); assert.equal(j.treiLaRand, null);
  const bun = Object.assign({}, TR, { la: Date.now() - 60000, extra: "x" }); assert.equal((await post(bun)).status, 200);
  j = await (await get()).json(); assert.equal(j.treiLaRand.zileConteaza, 8); assert.equal(j.treiLaRand.statistica, -1.2345); assert.equal("extra" in j.treiLaRand, false); assert.equal(j.treiLaRand.verdict, null);
  const rele = [{ forma: 2 }, { verdict: "da" }, { verdict: "tine" }, { pH0: 2 }, { zileConteaza: -1 }, { zileJudecate: 1.5 }, { start: "19.11.2026" }, { prag: 0 }, { statistica: "1" }, { la: Date.now() + 3600000 }, { ultimaZi: "ieri" }];
  for (const r of rele) assert.equal((await post(Object.assign({}, bun, r))).status, 400, JSON.stringify(r));
  assert.equal((await post([])).status, 400); assert.equal((await post(null)).status, 400);
  const cuVerdict = Object.assign({}, bun, { verdict: "tine", verdictLa: Date.now(), inghetat: { la: Date.now(), verdict: "tine", motiv: "N", pana: "2027-05-01", zile: 160, zileConteaza: 30, zileCuDeclansare: 33, nD: 100, nI: 70, statistica: -1, mecanica: 3, peste: -4, pH0: 0.01, rau: 1 } });
  assert.equal((await post(cuVerdict)).status, 200); j = await (await get()).json(); assert.equal(j.treiLaRand.inghetat.motiv, "N"); assert.equal("rau" in j.treiLaRand.inghetat, false);
  // starea reală a turei (T10) trece de rută
  const z = "2026-11-20", B = [bot(z, 8, 11, -1), bot(z, 9, 11.5, -2), bot(z, 10, 12, -3), bot(z, 7, 20, 1), bot(z, 13, 15, -5)], L = colector(Date.parse("2026-11-21T01:00:00Z"), B);
  const o = await M.turaTreiLaRand(L.d, {}); o.la = Date.now(); assert.equal((await post(o)).status, 200);
  assert.equal(citeste("functions", "_shared", "plafon-corp.js").includes("treiLaRand"), false, "plafonul implicit (64 KB) ajunge"); assert.ok(JSON.stringify(o).length < 4000);
});

await test("T14 colectorul: tura legată o dată pe zi (2 h după un eșec), starea pe disc, arhiva + deschișii + configurarea; pagina o cere", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /import \{ turaTreiLaRand as turaTreiLaRandModul \} from "\.\/lib\/tura-trei-la-rand\.mjs";/);
  assert.match(c, /const treiStare = stareDeDisc\("trei-la-rand-stare\.json"\);/);
  assert.match(c, /treiStare\.esecLa \|\| 0\) < 2 \* 3600000/);
  assert.match(c, /turaTreiLaRandModul\(\{ botiInchisi: botiInchisiToti, deschise: cereBotiPorniti, config: \(\) => cere\("\/api\/istoric-bot\?action=config"\), JurnalTrade, trimite, jurnal \}, treiStare\)/);
  assert.match(c, /if \(val\.medii\) turaTreiLaRandColector\(\)\.catch/);
  assert.match(c, /finally \{ treiStare\.inLucru = false; scrieStareDisc\("trei-la-rand-stare\.json", treiStare\); \}/);
  assert.match(citeste("public", "lib", "probe-ecran.js"), /pas\("treiLaRand", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=treiLaRand"\)/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
