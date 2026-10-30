// Proba v100.272-a (auditul colectorului 29.10, felia 5 - constatările rămase):
//  1. data/alerte-stare.json (~500 KB) se rescria la fiecare scrieStare() - zeci pe minut, ~3–4 GB pe zi pe SSD ⇒ scrierea amânată (cel mult
//     o dată la 10 s, doar când s-a schimbat ceva), golită pe loc la ieșire (semnal, livrare, excepție); minutul simulat: câte scrieri înainte / acum;
//  2. Discord: 429 fără retry_after, dublura după un timeout în care Discord primise deja mesajul (bucla blocată) ⇒ retry_after respectat,
//     răbdare cu ceasul care sună întârziat, trimiterea nesigură marcată (webhook-ul n-are nonce și nu se poate verifica - docs.discord.com);
//  3. proba futures: excepția ⇒ reîncercare la fiecare minut (~21 de cereri) ⇒ abia peste 10 min; ștampila = momentul real (10:56, nu 10:00),
//     iar evaluarea (FuturesCitire.evalForward, protocolul scris înainte de date) primește aceleași rânduri ca până acum;
//  4. lichidarea judecată ÎNTÂI, înaintea îmbogățirii boților (Pionex lent ⇒ al k-lea bot aștepta) - aceleași mesaje, în aceeași tură;
//  5. antrenorii rețelei / arborilor opriți la ieșirea colectorului;
//  6. arhiva boților închiși păstrează motivul închiderii (reasonBy, curățat) - de el depinde verificarea riscului pe termen scurt.
// Fără rețea: bucățile colectorului se rulează într-o lume falsă (numele vin din obiectul probei) - colectorul NU pornește.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import "./lib/text-ro-global.mjs";
import * as S from "./lib/sanatate-colector.mjs";
import * as MC from "./lib/mesaje-colector.mjs";
import * as CD from "./lib/canal-discord.mjs";
import * as FP from "./lib/futures-proba.mjs";
import * as ARH from "../functions/_shared/boti-arhiva.js";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.272-a · COLECTORUL: scrierea stării, Discord, proba futures, lichidarea întâi, antrenorii, motivul în arhivă · proba\n");

const nowReal = Date.now;
const ceas = (f) => { Date.now = f; };
const ceasReal = () => { Date.now = nowReal; };
const SEC = 1000, MIN = 60000, ORA = 3600000, ZI = 86400000;
const lib = (f, n) => new Function(citeste("public", "lib", f) + "; return " + n + ";")();
const COL = citeste("scripts", "colector.mjs");
function fnCol(nume) {
  const cap = "\nasync function " + nume + "(", i = COL.indexOf(cap);
  assert.ok(i >= 0, "lipsește " + nume + " în colector.mjs"); assert.equal(COL.indexOf(cap, i + 1), -1, "două " + nume + " în colector.mjs");
  return COL.slice(i + 1, COL.indexOf("\n}\n", i + 1) + 2);
}
// funcția sincronă de la nivelul modulului: pe un rând (rândul următor nu e indentat) sau până la „}” de la începutul rândului
function fnSync(nume, optional) {
  const cap = "\nfunction " + nume + "(", i = COL.indexOf(cap);
  if (i < 0 && optional) return "";
  assert.ok(i >= 0, "lipsește function " + nume + " în colector.mjs"); assert.equal(COL.indexOf(cap, i + 1), -1, "două " + nume + " în colector.mjs");
  const sf = COL.indexOf("\n", i + 1), urm = COL.slice(sf + 1, sf + 2);
  return urm !== " " && urm !== "}" ? COL.slice(i + 1, sf + 1) : COL.slice(i + 1, COL.indexOf("\n}\n", i + 1) + 2);
}
const rand = (re, optional) => { const m = COL.match(re); if (!m && optional) return ""; assert.ok(m, "lipsește rândul " + re + " în colector.mjs"); return m[0] + "\n"; };
// numele colectorului: din `baza` (cele date de probă) sau un ciot async (orice altceva) - nu din globalThis
function inLume(baza, cod) {
  const ciot = async () => undefined;
  const M = new Proxy(baza, {
    has: (t, k) => typeof k === "string" && (k in t || !(k in globalThis)),
    get: (t, k) => (typeof k !== "string" ? undefined : k in t ? t[k] : ciot),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return new Function("M", "with (M) { return (async () => {\n" + cod + "\n})(); }")(M);
}
// ceasul simulat pentru scrierea amânată: now / setTimeout / clearTimeout + avanseaza(ms) rulează ceasurile ajunse, în ordine
function ceasFals(t0) {
  let t = t0, id = 0; const q = new Map();
  return {
    now: () => t,
    setTimeout: (f, ms) => { const i = ++id; q.set(i, { la: t + Math.max(0, Number(ms) || 0), f }); return i; },
    clearTimeout: (i) => { q.delete(i); },
    avanseaza(ms) {
      const tinta = t + ms;
      for (;;) { let u = null; for (const [i, x] of q) if (x.la <= tinta && (!u || x.la < u[1].la)) u = [i, x]; if (!u) break; q.delete(u[0]); t = u[1].la; u[1].f(); }
      t = tinta;
    },
    pana(la) { this.avanseaza(Math.max(0, la - t)); },
  };
}

// ---------------------------------------------------------------- 1. scrierea stării (alerte-stare.json)
// blocul stării din colector, fără citirea de pe disc și fără înregistrarea pe proces (proba nu-și leagă ieșirea de el)
function blocStare() {
  const i = COL.indexOf("\nconst STARE_FIS = "), j = COL.indexOf("\nconst ALERTE_ZI_FIS = ");
  assert.ok(i > 0 && j > i, "blocul stării în colector.mjs");
  return COL.slice(i + 1, j + 1).split("\n").filter((l) => !/^let stareAlerte\b/.test(l) && !/^process\.on\(/.test(l)).join("\n");
}
// scrieStare de dinainte (65bfc4f, v100.271): o scriere la fiecare apel - „înainte” în minutul simulat
const SCRIE_STARE_VECHI = 'const STARE_FIS = path.join(DATA, "alerte-stare.json");\nfunction scrieStare() { try { scrieAtomic(STARE_FIS, stareAlerte); } catch (e) { jurnal("starea alertelor nescrisa", e.message); } }\n';
function lumeStare(c, cod) {
  const b = { S: { ...S, scriereAmanata: (o) => S.scriereAmanata({ ...o, ceas: c }) }, path, DATA: "D", stareAlerte: { b1: { lich: { nivel: "ok", la: 0 } } }, scrieri: [], jurnale: [],
    jurnal: (...a) => { b.jurnale.push(a.join(" ")); }, scrieAtomic: (fis, obj) => { b.scrieri.push({ la: c.now(), fis, text: JSON.stringify(obj) }); } };
  const f = inLume(b, (cod || blocStare()) + '\nreturn { scrieStare, golesteStarea: typeof golesteStarea === "function" ? golesteStarea : null };');
  return { b, f };
}
const T0 = Date.parse("2026-10-30T14:00:00Z");   // 16:00 RO - poza la 30 s

await test("1a 30 de scrieStare() la rând ⇒ nicio scriere pe loc; UNA după 10 s, cu starea de la ultimul apel; ieșirea scrie pe loc ce n-a apucat; a doua golire nu mai scrie", async () => {
  const c = ceasFals(T0), L = lumeStare(c), A = await L.f;
  for (let i = 0; i < 30; i++) { L.b.stareAlerte.b1.n = i; A.scrieStare(); }
  assert.equal(L.b.scrieri.length, 0, "30 de apeluri ⇒ " + L.b.scrieri.length + " scrieri pe loc ale fișierului de ~500 KB");
  c.avanseaza(9999); assert.equal(L.b.scrieri.length, 0, "a scris înainte de 10 s");
  c.avanseaza(1); assert.equal(L.b.scrieri.length, 1, "după 10 s trebuia o scriere");
  assert.equal(JSON.parse(L.b.scrieri[0].text).b1.n, 29, "scrierea poartă starea de la ultimul apel");
  assert.match(L.b.scrieri[0].fis, /alerte-stare\.json$/);
  L.b.stareAlerte.b1.n = 30; A.scrieStare();
  assert.equal(typeof A.golesteStarea, "function", "lipsește golesteStarea (scrierea sigură la ieșire)");
  A.golesteStarea(); assert.equal(L.b.scrieri.length, 2, "ieșirea trebuia să scrie pe loc ce era marcat");
  assert.equal(JSON.parse(L.b.scrieri[1].text).b1.n, 30);
  A.golesteStarea(); c.avanseaza(30000); assert.equal(L.b.scrieri.length, 2, "fără nimic nou nu se mai scrie (nici la ieșire, nici din ceas)");
});

await test("1b starea NESCHIMBATĂ nu se rescrie: apelurile care n-au mutat nimic nu ating discul", async () => {
  const c = ceasFals(T0), L = lumeStare(c), A = await L.f;
  L.b.stareAlerte.b1.x = 1; A.scrieStare(); c.avanseaza(10000); assert.equal(L.b.scrieri.length, 1);
  for (let i = 0; i < 5; i++) { A.scrieStare(); c.avanseaza(10000); }
  A.golesteStarea && A.golesteStarea();
  assert.equal(L.b.scrieri.length, 1, "aceeași stare rescrisă de " + (L.b.scrieri.length - 1) + " ori");
});

// minutul simulat: 16:00–17:00 RO (poza la 30 s), 1 bot, 8 poziții T212 - de unde vin apelurile azi: tura (Consilierul botului, capătul turei),
// poza de două ori (Consilierul fiecărei poziții, capătul pozei). `s` = apelul a mutat ceva în stare
const MINUT = [[1000, 0], [4000, 1]]
  .concat([10, 11, 12, 13, 14, 15, 16, 17].map((s) => [s * 1000, 0]), [[18000, 1]])
  .concat([40, 41, 42, 43, 44, 45, 46, 47].map((s) => [s * 1000, 0]), [[48000, 1]]);
async function minutSimulat(cod) {
  const c = ceasFals(T0), L = lumeStare(c, cod), A = await L.f;
  let k = 0;
  for (const [dt, s] of MINUT) { c.pana(T0 + dt); if (s) L.b.stareAlerte.b1.k = ++k; A.scrieStare(); }
  c.pana(T0 + 60000);
  const inMinut = L.b.scrieri.length;
  if (A.golesteStarea) A.golesteStarea();
  c.avanseaza(60000);
  return { apeluri: MINUT.length, scrieri: inMinut, ultima: L.b.scrieri.length ? JSON.parse(L.b.scrieri[L.b.scrieri.length - 1].text).b1.k : null, k };
}
await test("1c minutul simulat (16:00–17:00, 1 bot, 8 poziții T212): scrierile înainte vs acum - și nimic pierdut la capăt", async () => {
  const inainte = await minutSimulat(SCRIE_STARE_VECHI), acum = await minutSimulat(null);
  console.log("       minutul simulat: " + TextRo.cate(inainte.apeluri, "apel", "apeluri") + " scrieStare ⇒ înainte " + TextRo.cate(inainte.scrieri, "scriere", "scrieri") + " × ~500 KB, acum " + TextRo.cate(acum.scrieri, "scriere", "scrieri") + " (cel mult o dată la 10 s, doar la schimbare)");
  assert.equal(inainte.scrieri, inainte.apeluri, "înainte: o scriere la fiecare apel");
  assert.ok(acum.scrieri <= 4, "acum " + acum.scrieri + " scrieri într-un minut (trebuia cel mult 4)");
  assert.ok(acum.scrieri * 5 <= inainte.scrieri, "reducerea trebuia măcar de 5 ori: " + inainte.scrieri + " → " + acum.scrieri);
  assert.equal(acum.ultima, acum.k, "pe disc trebuia să rămână ultima stare (" + acum.k + "), nu " + acum.ultima);
});

await test("1d scriereAmanata: ceas de tip „cel mult o dată la N”, nu „după ultima liniște” - starea veche pe disc ≤ 10 s chiar și cu apeluri continue; scrierea picată se reia", () => {
  assert.equal(typeof S.scriereAmanata, "function", "lipsește S.scriereAmanata");
  const c = ceasFals(T0), scrieri = []; let st = 0, pica = false;
  const w = S.scriereAmanata({ scrie: () => { if (pica) return false; scrieri.push({ la: c.now(), v: st }); return true; }, dupaMs: 10000, ceas: c });
  let maxVechime = 0, nescrisDe = null;
  for (let s = 0; s < 60; s++) { c.pana(T0 + s * 1000); st = s; if (nescrisDe === null) nescrisDe = c.now(); w.marcheaza(); const n = scrieri.length; c.avanseaza(999); if (scrieri.length > n) { maxVechime = Math.max(maxVechime, scrieri[scrieri.length - 1].la - nescrisDe); nescrisDe = null; } }
  assert.ok(scrieri.length >= 5 && scrieri.length <= 6, "apeluri la fiecare secundă, 60 s ⇒ 5–6 scrieri, nu " + scrieri.length);
  assert.ok(maxVechime <= 10000, "o schimbare a stat nescrisă " + maxVechime + " ms");
  pica = true; w.marcheaza(); c.avanseaza(10000); const n = scrieri.length; pica = false; c.avanseaza(10000);
  assert.equal(scrieri.length, n + 1, "scrierea picată trebuia reluată la următorul ceas");
  assert.equal(w.goleste(), false, "nimic nou ⇒ golirea nu scrie");
});

await test("1e colectorul: ieșirea (process.exit / SIGINT / SIGTERM / SIGHUP / excepție / semnalul livrării) golește starea; fără TDZ la pornire", () => {
  const iSt = COL.indexOf("\nlet stareAlerte = "), iFis = COL.indexOf("\nconst STARE_FIS = "), iMs = COL.indexOf("\nconst STARE_SCRIERE_MS = ");
  const iVar = COL.indexOf("\nvar stareScriere = S.scriereAmanata("), iExit = COL.indexOf('\nprocess.on("exit", golesteStarea);');
  assert.ok(iVar > 0 && iExit > 0, "lipsesc scrierea amânată / golirea la ieșire");
  assert.ok(iFis < iVar && iSt < iVar && iMs > 0 && iMs < iVar, "stareScriere folosește un let/const declarat mai jos (TDZ la pornire)");
  assert.ok(iExit > iVar, "golirea înregistrată înaintea scrierii amânate");
  /* v100.272 (revizia): și starea NEMARCATĂ (scrieStareAcum sare peste JSON identic), tot fără să arunce */
  assert.match(fnSync("golesteStarea"), /^function golesteStarea\(\) \{ try \{ if \(stareScriere\) stareScriere\.goleste\(\); \} catch \{\} try \{ scrieStareAcum\(\); \} catch \{\} \}/, "golirea de la ieșire nu are voie să arunce");
  assert.match(fnSync("iesiLaSemnal"), /golesteStarea\(\); process\.exit\(0\);/, "semnalul livrării scrie starea pe loc înainte de ieșire");
  assert.match(COL, /process\.on\("SIGTERM", \(\) => process\.exit\(0\)\);/); assert.match(COL, /process\.on\("SIGHUP", \(\) => process\.exit\(0\)\);/, "închiderea consolei (SIGHUP) ⇒ ieșire curată");
});

// ---------------------------------------------------------------- 2. Discord
const W = "https://discord.com/api/webhooks/1/abc";
const raspuns = (status, corp, antete = {}) => ({ ok: status >= 200 && status < 300, status, headers: new Headers(antete), text: async () => (typeof corp === "string" ? corp : JSON.stringify(corp)) });
const scurt = (ms) => { const o = AbortSignal.timeout; AbortSignal.timeout = () => o.call(AbortSignal, ms); return () => { AbortSignal.timeout = o; }; };   // codul vechi: AbortSignal.timeout(15000)

await test("2a 429 cu retry_after scurt (0,05 s) ⇒ așteaptă cât cere Discord și reia O dată ⇒ trimis", async () => {
  let n = 0; const j = [], t0 = nowReal();
  const ok = await CD.trimiteDiscord({ nivel: "critic", titlu: "T" }, { webhook: W, jurnal: (...a) => j.push(a.join(" ")),
    fetch: async () => (++n === 1 ? raspuns(429, { message: "You are being rate limited.", retry_after: 0.05, global: false }) : raspuns(200, { id: "1" })) });
  assert.equal(ok, true, "429 cu retry_after 0,05 s trebuia reîncercat: " + j.join(" | ")); assert.equal(n, 2);
  assert.ok(nowReal() - t0 >= 45, "a reluat fără să aștepte retry_after");
});

await test("2b 429 cu retry_after lung (30 s) ⇒ nu blochează bucla: întoarce pe loc, cu reiaDupaMs = 30000 (și din antetul Retry-After)", async () => {
  const r = [], t0 = nowReal(); let n = 0;
  const ok = await CD.trimiteDiscord({ nivel: "info", titlu: "T" }, { webhook: W, jurnal() {}, laRezultat: (x) => r.push(x), fetch: async () => { n++; return raspuns(429, { retry_after: 30, global: false }); } });
  assert.equal(ok, false); assert.equal(n, 1); assert.ok(nowReal() - t0 < 1000, "a așteptat pe loc " + (nowReal() - t0) + " ms");
  assert.equal(r.length, 1, "rezultatul pe larg (laRezultat) lipsește"); assert.equal(r[0].reiaDupaMs, 30000); assert.equal(r[0].status, 429);
  const r2 = [];
  await CD.trimiteDiscord({ nivel: "info", titlu: "T" }, { webhook: W, jurnal() {}, laRezultat: (x) => r2.push(x), fetch: async () => raspuns(429, "nu e JSON", { "retry-after": "7" }) });
  assert.equal(r2[0] && r2[0].reiaDupaMs, 7000, "fără corp JSON, antetul Retry-After");
});

await test("2c bucla BLOCATĂ (jurnal: 3 × „aborted due to timeout” în aceeași milisecundă cu alte cereri) - răspunsul deja sosit e primit, nu dat drept eșec ⇒ fără dublură", async () => {
  const pune = scurt(60);
  try {
    const fetchF = (u, o) => new Promise((rez, resp) => {
      const t = setTimeout(() => rez(raspuns(200, { id: "9" })), 100);
      if (o && o.signal) o.signal.addEventListener("abort", () => { clearTimeout(t); resp(o.signal.reason || new Error("aborted")); });
    });
    const j = [];
    const p = CD.trimiteDiscord({ nivel: "critic", titlu: "T" }, { webhook: W, jurnal: (...a) => j.push(a.join(" ")), fetch: fetchF, timeoutMs: 60, rabdareMs: 2000 });
    const t = nowReal(); while (nowReal() - t < 250) { /* bucla ținută 250 ms (Monte Carlo, pornirea) */ }
    assert.equal(await p, true, "răspunsul sosit cât bucla era blocată a fost dat drept eșec (⇒ coadă ⇒ dublură): " + j.join(" | "));
  } finally { pune(); }
});

await test("2d timeout ADEVĂRAT ⇒ eșec „nesigur” (poate a ajuns); eroare de conectare (ENOTFOUND) ⇒ sigur netrimis; ECONNRESET ⇒ nesigur", async () => {
  const pune = scurt(40), viu = setInterval(() => {}, 50);   // ceasul lui AbortSignal.timeout nu ține procesul viu
  try {
    const r = [], t0 = nowReal();
    const ok = await CD.trimiteDiscord({ nivel: "critic", titlu: "T" }, { webhook: W, jurnal() {}, laRezultat: (x) => r.push(x), timeoutMs: 40, rabdareMs: 40,
      fetch: (u, o) => new Promise((rez, resp) => { o.signal.addEventListener("abort", () => resp(o.signal.reason || new Error("aborted"))); }) });
    assert.equal(ok, false); assert.ok(nowReal() - t0 < 2000, "timeout-ul nu s-a oprit");
    assert.equal(r[0] && r[0].nesigur, true, "timeout ⇒ nesigur");
  } finally { pune(); clearInterval(viu); }
  const cu = async (cod) => { const r = []; await CD.trimiteDiscord({ nivel: "info", titlu: "T" }, { webhook: W, jurnal() {}, laRezultat: (x) => r.push(x), fetch: async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: cod } }); } }); return r[0]; };
  assert.equal((await cu("ENOTFOUND")).nesigur, false, "fără DNS mesajul n-a plecat");
  assert.equal((await cu("ECONNREFUSED")).nesigur, false);
  assert.equal((await cu("ECONNRESET")).nesigur, true, "conexiunea ruptă după trimitere ⇒ poate a ajuns");
});

await test("2e webhook-ul: doar câmpurile din documentație (Execute Webhook n-are nonce); trimiteDiscord rămâne true/false pentru cine îl cheamă", async () => {
  const DOC = ["content", "username", "avatar_url", "tts", "embeds", "allowed_mentions", "components", "files", "payload_json", "attachments", "flags", "thread_name", "applied_tags", "poll"];
  const m = CD.mesajDiscord({ nivel: "critic", titlu: "x", mesaj: "y" });
  for (const k of Object.keys(m)) assert.ok(DOC.includes(k), "câmp inventat în mesajul webhook-ului: " + k);
  assert.equal(await CD.trimiteDiscord({ nivel: "info", titlu: "T" }, { webhook: W, jurnal() {}, fetch: async () => raspuns(204, "") }), true);
  assert.equal(await CD.trimiteDiscord({ nivel: "info", titlu: "T" }, { webhook: W, jurnal() {}, fetch: async () => raspuns(500, "x") }), false);
});

// coada + trimiteAlerta din colector, într-o lume falsă
function lumeCoada() {
  const b = {
    S, MesajeColector: MC, CANAL: "discord", DISCORD_WEBHOOK: W, coadaDiscord: [], coadaKv: [], jurnale: [], cereri: [], sosite: [],
    jurnal: (...a) => { b.jurnale.push(a.join(" ")); }, salveazaCoada: () => {}, salveazaCoadaKv: () => {}, notezAlerta: () => {}, pretBot: () => null, simbolBot: () => null,
    trimite: async () => ({ ok: true }),
    discord: async () => true,
    trimiteDiscord: async (m, d) => { b.cereri.push(m.titlu); const ok = await b.discord(m, d); if (ok) b.sosite.push(m.titlu); return ok; },
  };
  const decl = COL.split("\n").filter((l) => /^let golireDiscord\b/.test(l));
  assert.equal(decl.length, 1, "declarația golireDiscord");
  return { b, f: inLume(b, decl[0] + "\n" + fnCol("golesteCoada") + "\n" + fnCol("trimiteAlerta") + "\nreturn { golesteCoada, trimiteAlerta };") };
}
await test("2f Discord cere pauză (429, retry_after 30 s) ⇒ până atunci nicio cerere: mesajele noi intră la coadă în ordine; după pauză pleacă în ordine", async () => {
  const L = lumeCoada(), A = await L.f, T = nowReal();
  L.b.discord = async (m, d) => { if (L.b.cereri.length === 1) { if (d && d.laRezultat) d.laRezultat({ ok: false, status: 429, reiaDupaMs: 30000 }); return false; } return true; };
  try {
    ceas(() => T);
    await A.trimiteAlerta({ nivel: "critic", titlu: "a", mesaj: "" }, null, "x");
    ceas(() => T + 5000); await A.trimiteAlerta({ nivel: "info", titlu: "b", mesaj: "" }, null, "y");
    ceas(() => T + 10000); await A.golesteCoada();
    assert.deepEqual(L.b.cereri, ["a"], "în pauza cerută de Discord colectorul a mai bătut la ușă: " + JSON.stringify(L.b.cereri));
    assert.deepEqual(L.b.coadaDiscord.map((x) => x.m.titlu), ["a", "b"], "coada: " + JSON.stringify(L.b.coadaDiscord.map((x) => x.m.titlu)));
    ceas(() => T + 31000); await A.golesteCoada();
    assert.deepEqual(L.b.sosite.map((t) => t.replace(/ \(întârziat.*\)$/, "")), ["a", "b"]); assert.equal(L.b.coadaDiscord.length, 0);
  } finally { ceasReal(); }
});
await test("2g trimiterea NESIGURĂ (timeout, conexiune ruptă) ⇒ reîncercată (o alertă pierdută e mai rea decât una dublă), cu „poate e o dublură” în titlu; cea sigur netrimisă - fără", async () => {
  const L = lumeCoada(), A = await L.f, T = nowReal();
  // 1: MET direct - timeout (nesigur); 2: MET din coadă, înaintea lui STX - fără DNS; 3: STX direct - fără DNS (sigur netrimis) ⇒ la coadă după MET
  L.b.discord = async (m, d) => { if (L.b.cereri.length <= 3) { if (d && d.laRezultat) d.laRezultat({ ok: false, nesigur: L.b.cereri.length === 1 }); return false; } return true; };
  try {
    ceas(() => T); await A.trimiteAlerta({ nivel: "critic", titlu: "MET: lichidarea la 7,5%", mesaj: "" }, null, "lich");
    ceas(() => T); await A.trimiteAlerta({ nivel: "info", titlu: "STX: −3% azi", mesaj: "" }, null, "pas");
    ceas(() => T + 2 * MIN); await A.golesteCoada();
    assert.deepEqual(L.b.sosite, ["MET: lichidarea la 7,5% (întârziat 2 min · poate e o dublură)", "STX: −3% azi (întârziat 2 min)"], JSON.stringify(L.b.sosite));
  } finally { ceasReal(); }
});

// ---------------------------------------------------------------- 3. proba futures
function lumeFutures(tura) {
  const b = { turaFuturesProba: tura, FuturesCitire: { univers: () => [] }, ultimiiBoti: [], path, DATA: "D", ritm: { futuresProba: 0 }, tineRitm: (k, v) => { b.ritm[k] = v; },
    jurnale: [], jurnal: (...a) => { b.jurnale.push(a.join(" ")); }, cate: (n, a, p) => n + " " + (n === 1 ? a : p) };
  const cod = rand(/^const FUTURES_PROBA_MS\b.*$/m) + rand(/^let futuresProbaOra\b.*$/m) + fnCol("turaFuturesProbaColector") + "\nreturn turaFuturesProbaColector;";
  return { b, f: inLume(b, cod) };
}
await test("3a tura probei aruncă ⇒ în 60 de minute cel mult 6–7 încercări (o dată la 10 min), nu 60 × ~21 de cereri", async () => {
  let n = 0; const L = lumeFutures(async () => { n++; throw new Error("EPERM: rename futures-jurnal.jsonl"); }), f = await L.f, T = Date.parse("2026-10-30T10:00:30Z");
  try { for (let k = 0; k < 60; k++) { ceas(() => T + k * MIN); await f(); } } finally { ceasReal(); }
  assert.ok(n >= 2 && n <= 7, "încercări într-o oră după eșec: " + n);
  assert.ok(L.b.jurnale.some((l) => /futures proba ESEC/.test(l)));
});
await test("3b reușita rămâne o dată pe oră; eșec apoi reușită ⇒ ora notată, nimic până la ora următoare", async () => {
  let n = 0, pica = true; const L = lumeFutures(async () => { n++; if (pica) { pica = false; throw new Error("x"); } return { randuri: 1, total: 1 }; }), f = await L.f, T = Date.parse("2026-10-30T10:00:30Z");
  try { for (let k = 0; k < 60; k++) { ceas(() => T + k * MIN); await f(); } ceas(() => T + 60 * MIN); await f(); } finally { ceasReal(); }
  assert.equal(n, 3, "eșec 10:00, reușită 10:10, ora 11:00: " + n);
});

const FC = () => lib("futures-citire.js", "FuturesCitire");
const RASP = { funding: -0.0002, fundingIntervalHours: 4, longShort: 1.29, lsIst: Array.from({ length: 100 }, (_, i) => [i, 1 + i / 100]), markPrice: 0.0101, simbol: "COTIUSDT" };
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fp272-")), "futures-jurnal.jsonl");
const linii = (f) => fs.readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
await test("3c ștampila = momentul REAL al citirii (10:56, nu 10:00); aceeași (monedă, oră) tot o singură dată - și lângă un rând vechi rotunjit", async () => {
  const fis = tmp(), acum = Date.UTC(2026, 9, 29, 10, 56), arg = { F: FC(), fisier: fis, univers: ["COTIUSDT"], jurnal() {}, cere: async () => RASP, trimite: async () => ({ ok: true }) };
  await FP.turaFuturesProba({ ...arg, acum });
  let l = linii(fis); assert.equal(l.length, 1);
  assert.ok(l[0][0] >= acum && l[0][0] < acum + MIN, "ștampila " + new Date(l[0][0]).toISOString() + " - trebuia momentul citirii (10:56)");
  await FP.turaFuturesProba({ ...arg, acum: acum + 2 * MIN });
  assert.equal(linii(fis).length, 1, "a doua tură în aceeași oră a dublat rândul");
  const fis2 = tmp(); fs.writeFileSync(fis2, JSON.stringify([Date.UTC(2026, 9, 29, 10), "COTIUSDT", 0.01, "B", 0, 50]) + "\n");
  await FP.turaFuturesProba({ ...arg, fisier: fis2, acum });
  assert.equal(linii(fis2).length, 1, "rândul vechi (ora rotunjită) + cel nou din aceeași oră = dublură");
});
// mulberry32 - prețurile probei (regula casei: niciodată LCG)
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
await test("3d evaluarea (evalForward, protocolul din 29.10: primul rând cu ora ≤ 3 UTC, întoarcerea la 24 h ± 1 h) primește aceleași rânduri ca pe ștampilele rotunjite - rezumatul identic", async () => {
  const F = FC(), r = mulberry32(272), z0 = Date.UTC(2026, 8, 20), reale = [], rotunjite = [], cod = ["C", "K", "B"];
  for (let d = 0; d < 40; d++) for (let h = 0; h < 24; h++) for (const [i, s] of ["AAAUSDT", "BBBUSDT", "CCCUSDT"].entries()) {
    const ora = z0 + d * ZI + h * ORA, min = (h * 7 + d * 13 + i * 5) % 60, rr = [ora + min * MIN + 17 * SEC, s, 1 + r(), cod[(d + i) % 3], 0.0001, 50];
    reale.push(rr); rotunjite.push([ora].concat(rr.slice(1)));
  }
  const acum = z0 + 40 * ZI + 5 * MIN, fis = tmp();
  fs.writeFileSync(fis, reale.map((x) => JSON.stringify(x)).join("\n") + "\n");
  let trimis = null;
  await FP.turaFuturesProba({ F, fisier: fis, acum, univers: [], jurnal() {}, cere: async () => null, trimite: async (c, corp) => { trimis = corp; return { ok: true }; } });
  const astept = F.evalForward(rotunjite, acum); delete astept.zileC; delete astept.zileK;
  assert.ok(astept.zile >= 35, "proba are nevoie de zile: " + astept.zile);
  assert.deepEqual(trimis && trimis.rezumat, astept, "rezumatul pe ștampilele reale diferă de cel al protocolului (zile: " + (trimis && trimis.rezumat && trimis.rezumat.zile) + " vs " + astept.zile + ")");
  assert.equal(linii(fis)[0][0], reale[0][0], "în fișier rămâne momentul real");
});

// ---------------------------------------------------------------- 4. lichidarea întâi
const AlerteR = lib("alerte.js", "Alerte");
const botL = (id, o = {}) => ({ id, baza: id.toUpperCase() + ".PERP", simbolPionex: id.toUpperCase() + "_USDT_PERP", directie: "long", activ: true, stareInterna: "running", pretCurent: 1, gridJos: 0.5, gridSus: 1.5,
  distantaLichidarePct: 40, lichidareDepasita: false, pretLichidare: 0.6, stareMargine: "NORMAL", stareRisc: "TRADING", pornitLa: Date.parse("2026-10-01T00:00:00Z"), investit: 100, profitTotal: 1, ...o });
function lumeLich(boti) {
  const b = {
    S, MesajeColector: MC, Alerte: AlerteR, MAX_ESECURI: 15, CANAL: "discord", esecuri: 0, turaNr: 5, turaGataLa: 0, ultimiiBoti: [], ultimiiBotiLa: 0, pret30: {}, pret30La: {},
    stareAlerte: {}, lumanari15: {}, mediuPe: {}, directii: {}, socotealaTaci: {}, ritm: {}, jurnale: [], ordine: [], alerte: [], stare: { citireRea: 0, anuntatRau: 0, cunoscuti: {} },
    alertaOk: () => true,
    jurnal: (...a) => { b.jurnale.push(a.join(" ")); }, bate: () => {}, scrieStare: () => {}, meta: () => b.stare,
    cere: async (cale) => { if (cale === "/api/bot-orders") return { bots: boti }; b.ordine.push("cere " + cale); return null; },
    trimite: async () => ({ ok: true }),
    directiaBotului: async (x) => { b.ordine.push("imbogatire " + x.id); await new Promise((r) => setTimeout(r, 3)); return {}; },
    semnaleBot: async (x) => { b.ordine.push("semnale " + x.id); return null; },
    trimiteAlerta: async (m, bot, cheie) => { b.ordine.push("alerta " + bot + " " + cheie); b.alerte.push({ bot, cheie, nivel: m.nivel, titlu: m.titlu }); return b.alertaOk(m, bot, cheie); },
    anuntaMesaj: async (x) => { b.ordine.push("anunt " + x.titlu); return true; },
  };
  const cod = fnCol("tura") + (COL.includes("\nasync function lichidareIntai(") ? "\n" + fnCol("lichidareIntai") : "") + "\nreturn tura();";
  return { b, tura: (la) => { ceas(() => la); return inLume(b, cod).finally(ceasReal); } };
}
const BOTI_L = () => [botL("b1"), botL("b2", { distantaLichidarePct: 5 }), botL("b3", { distantaLichidarePct: 12, opritorPierdere: 0.9, opritorPierdereActiv: false }), botL("b4", { stareMargine: "WARNING" })];
const cheiAl = (l) => l.map((a) => a.bot + "|" + a.cheie + "|" + a.nivel + "|" + a.titlu).sort();
await test("4a riscul de lichidare al TUTUROR boților e judecat înaintea îmbogățirii primului bot (direcția, funding, BTC, plan, semnale - Pionex lent)", async () => {
  const L = lumeLich(BOTI_L()), T = Date.parse("2026-10-30T12:00:00Z");
  assert.equal(await L.tura(T), true, "tura: " + L.b.jurnale.join(" | "));
  const prima = L.b.ordine.indexOf("imbogatire b1"), ultimaLich = Math.max(...["b2 lich", "b3 lich", "b3 opritor", "b4 status"].map((k) => L.b.ordine.indexOf("alerta " + k)));
  assert.ok(prima >= 0 && ultimaLich >= 0, "ordinea: " + L.b.ordine.join(", "));
  assert.ok(ultimaLich < prima, "lichidarea a așteptat îmbogățirea: " + L.b.ordine.filter((x) => /^(alerta|imbogatire)/.test(x)).join(", "));
});
await test("4b aceleași mesaje ca înainte (Alerte.evalueaza cu ctx-ul turei), fiecare O dată, și aceeași stare a alertelor", async () => {
  const boti = BOTI_L(), L = lumeLich(boti), T = Date.parse("2026-10-30T12:00:00Z");
  await L.tura(T);
  const astept = [], stare = {};
  for (const b of boti) { const r = AlerteR.evalueaza(b, { taci: {} }, {}, T); for (const m of r.mesaje) astept.push({ bot: b.id, cheie: m.cheie, nivel: m.nivel, titlu: m.titlu }); stare[b.id] = r.stare; }
  assert.ok(astept.length >= 4, "proba are nevoie de alerte: " + astept.length);
  assert.deepEqual(cheiAl(L.b.alerte), cheiAl(astept));
  for (const b of boti) for (const k of ["lich", "status", "opritor", "grid", "activ"]) assert.deepEqual(L.b.stareAlerte[b.id][k], stare[b.id][k], b.id + "." + k);
  L.b.alerte.length = 0; await L.tura(T + MIN);
  assert.deepEqual(L.b.alerte, [], "tura următoare a repetat: " + JSON.stringify(L.b.alerte));
});
await test("4c alerta de lichidare care n-a plecat ⇒ starea revine (tura următoare o reîncearcă), dar NU se încearcă de două ori în aceeași tură", async () => {
  const L = lumeLich(BOTI_L()), T = Date.parse("2026-10-30T12:00:00Z");
  L.b.alertaOk = (m, bot, cheie) => !(bot === "b2" && cheie === "lich");
  await L.tura(T);
  assert.equal(L.b.ordine.filter((x) => x === "alerta b2 lich").length, 1, "de câte ori s-a încercat în aceeași tură");
  assert.equal(L.b.stareAlerte.b2.lich, undefined, "alerta nepecată a rămas trecută drept anunțată");
  L.b.alertaOk = () => true; L.b.ordine.length = 0; await L.tura(T + MIN);
  assert.equal(L.b.ordine.filter((x) => x === "alerta b2 lich").length, 1, "tura următoare trebuia s-o reîncerce");
});

// ---------------------------------------------------------------- 5. antrenorii
const asteapta = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("n-a ieșit în " + ms + " ms")), ms))]);
await test("5a registrul copiilor: copilul viu e oprit la ieșire (numărat), cel ieșit singur pleacă din registru", async () => {
  assert.equal(typeof S.registruCopii, "function", "lipsește S.registruCopii");
  const R = S.registruCopii();
  const c = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { stdio: "ignore", windowsHide: true }), iesit = new Promise((r) => c.on("exit", r));
  const c2 = spawn(process.execPath, ["-e", "0"], { stdio: "ignore", windowsHide: true }), iesit2 = new Promise((r) => c2.on("exit", r));
  R.adauga(c, "retea"); R.adauga(c2, "arbori");
  await asteapta(iesit2, 10000); await new Promise((r) => setImmediate(r));
  assert.deepEqual(R.vii(), ["retea"], "copilul ieșit singur a rămas în registru");
  assert.deepEqual(R.opresteToti(), ["retea"]);
  await asteapta(iesit, 10000);
  assert.deepEqual(R.vii(), []);
});
await test("5b colectorul: antrenorul rețelei și al arborilor trec prin registru; ieșirea colectorului îi oprește și o spune în jurnal", async () => {
  const copii = [];
  const fals = () => { const ev = {}; const c = { pid: 4242 + copii.length, ucis: 0, stdout: { on() {} }, stderr: { on() {} }, on: (e, f) => { (ev[e] = ev[e] || []).push(f); return c; },
    kill: () => { c.ucis++; (ev.exit || []).forEach((f) => f(null, "SIGTERM")); return true; } }; copii.push(c); return c; };
  const b = { S, spawn: fals, os: { setPriority() {}, constants: os.constants }, path, RAD: "R", jurnale: [], jurnal: (...a) => { b.jurnale.push(a.join(" ")); } };
  const cod = rand(/^const antrenori = S\.registruCopii\(\);.*$/m, true) + fnSync("pornesteAntrenorul") + fnSync("pornesteAntrenorArbori") + fnSync("opresteAntrenorii", true) +
    '\nreturn { pornesteAntrenorul, pornesteAntrenorArbori, opreste: typeof opresteAntrenorii === "function" ? opresteAntrenorii : () => {} };';
  const A = await inLume(b, cod);
  const p1 = A.pornesteAntrenorul(), p2 = A.pornesteAntrenorArbori();
  A.opreste();
  assert.deepEqual(copii.map((c) => c.ucis), [1, 1], "antrenorii rămân orfani la ieșire: " + JSON.stringify(copii.map((c) => c.ucis)));
  await asteapta(Promise.all([p1, p2]), 1000);
  assert.ok(b.jurnale.some((l) => /opri[tț].*ieșire/.test(l)), "jurnalul: " + b.jurnale.join(" | "));
  assert.match(COL, /\nprocess\.on\("exit", opresteAntrenorii\);/);
  assert.ok(COL.indexOf("\nconst antrenori = S.registruCopii();") < COL.indexOf('\nprocess.on("exit", opresteAntrenorii);'), "ordinea (TDZ)");
});

// ---------------------------------------------------------------- 6. motivul închiderii în arhivă
const brut = (id, motiv, o = {}) => ({ strategyId: id, base: "MET", buOrderType: "futures_grid", createTime: 1790000000000, closeTime: 1790003600000, buOrderData: { totalRealizedProfit: "-2.5", reasonBy: motiv, ...o } });
await test("6a compactBot păstrează motivul închiderii (reasonBy) curățat: doar litere și _, cel mult 30; lipsă / nu e text ⇒ fără câmp", () => {
  assert.equal(ARH.compactBot(brut("a1", "loss_stop")).buOrderData.reasonBy, "loss_stop", "motivul închiderii aruncat din arhivă");
  assert.equal(ARH.compactBot(brut("a2", "user_cancel<script>é1")).buOrderData.reasonBy, "user_cancelscript");
  assert.equal(ARH.compactBot(brut("a3", "x".repeat(50))).buOrderData.reasonBy.length, 30);
  assert.equal("reasonBy" in ARH.compactBot(brut("a4", 5)).buOrderData, false);
  assert.equal("reasonBy" in ARH.compactBot(brut("a5", "123 !!")).buOrderData, false);
  assert.equal("reasonBy" in ARH.compactBot(brut("a6", undefined)).buOrderData, false);
  assert.equal(ARH.uneste([ARH.compactBot(brut("a1", "loss_stop"))], [])[0].buOrderData.reasonBy, "loss_stop", "unirea (bot vechi recompactat) l-a pierdut");
});
await test("6b serverul (istoric-bot?action=botiInchisi): motivul ajunge curățat în KV și rămâne după unirea cu bucata următoare", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + nowReal());
  const H = { authorization: "Bearer proba-token-1234567890", origin: "https://exemplu.test", "content-type": "application/json" };
  const post = (boti) => mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=botiInchisi", { method: "POST", headers: H, body: JSON.stringify({ boti }) }), env });
  assert.equal((await post([brut("s1", "loss_stop\"><img>")])).status, 200);
  assert.equal((await post([brut("s2", "user_cancel")])).status, 200);
  const g = await (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=botiInchisi", { headers: H }), env })).json();
  const pe = Object.fromEntries((g.boti || []).map((x) => [x.strategyId, x.buOrderData && x.buOrderData.reasonBy]));
  assert.deepEqual(pe, { s1: "loss_stopimg", s2: "user_cancel" });
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
