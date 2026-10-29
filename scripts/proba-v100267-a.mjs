// Proba v100.267-a (auditul 29.10): lanțul tăcerii - Pionex blocat ⇒ boți necitiți ⇒ alertele de lichidare tac ⇒ paznicul nu observă.
// Ce ține:
//  1. lacătul Pionex se pune / prelungește DOAR din răspunsurile venite de la Pionex; refuzul NOSTRU (eroareLacat, 429 fără antete)
//     nu-l mai mută la acum + 75 s ⇒ lacătul expiră și cererea următoare pleacă (înainte: cu o cerere la ≤ 30 s, niciodată);
//  2. ora turei din poză (turaLa, pulsul citit de paznic) se mișcă DOAR după ce boții au fost citiți; serverul :8788 căzut se anunță
//     prin drumul obișnuit al alertelor (trimiteAlerta ⇒ KV / coada) și se repetă la 3 h cât ține căderea; revenirea la fel;
//  3. coada Discord veche pleacă ÎNAINTEA mesajelor noi (28.10: „citește din nou botul” la 20:04:37, apoi „nu mai poate citi botul
//     (întârziat 224 min)” la 20:04:39).
// Fără rețea: rutele și paznicul se importă cu fetch simulat; bucățile colectorului (tura, linia turei din bucla, coada, trimiteAlerta)
// se rulează într-o lume falsă (toate numele colectorului vin din obiectul probei) - colectorul NU pornește.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import * as S from "./lib/sanatate-colector.mjs";
import * as MC from "./lib/mesaje-colector.mjs";
import { construiestePoza } from "./lib/poza.mjs";

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
console.log("\nV100.267-a · LANȚUL TĂCERII (lacătul Pionex, pulsul paznicului, ordinea cozii) · proba\n");

// ceasul simulat (Date.now) - pus înapoi după fiecare test
const nowReal = Date.now;
const ceas = (f) => { Date.now = f; };
const ceasReal = () => { Date.now = nowReal; };
const fetchReal = globalThis.fetch;
const MIN = 60000, ORA = 3600000;

// ---------------------------------------------------------------- 1. lacătul Pionex
const TOKEN = "proba-token-1234567890", ENV = { APP_API_TOKEN: TOKEN };
const LAC = await import("../functions/_shared/lacat-pionex.js");
const marketNou = () => import("../functions/api/market.js?v100267=" + Math.random());   // fiecare test cu ritmul lui (pionexNextAt), lacătul e comun
const cerere = (cale) => new Request("http://127.0.0.1:8788" + cale, { headers: { authorization: "Bearer " + TOKEN, "x-forwarded-for": "10.26.7.1" } });
const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...h } });
const TICKERE = "/api/market?type=pionex_tickers&market=SPOT";

await test("1a lacătul cu 5 s rămase + o cerere la 30 s: refuzul nostru NU-l prelungește, la +30 s cererea pleacă spre Pionex", async () => {
  const { onRequestGet } = await marketNou();
  const cereri = []; globalThis.fetch = async (u) => { cereri.push(String(u)); return J({ result: true, data: { tickers: [] } }); };
  const T = nowReal(); let off = 0; ceas(() => T + off);
  try {
    LAC.reseteazaLacatPionex(); LAC.puneLacatPana(T + 5000);
    const r0 = await (await onRequestGet({ request: cerere(TICKERE), env: ENV })).json();
    assert.equal(r0.result, false, "în lacăt cererea e refuzată"); assert.equal(cereri.length, 0, "a plecat spre Pionex în lacăt");
    assert.ok(LAC.lacatRamasMs() <= 5000, "refuzul NOSTRU a mutat lacătul la +" + Math.round(LAC.lacatRamasMs() / 1000) + " s (se prelungește singur)");
    const rez = [];
    for (let i = 1; i <= 5; i++) { off = i * 30000; rez.push((await (await onRequestGet({ request: cerere(TICKERE), env: ENV })).json()).result); }
    assert.deepEqual(rez, [true, true, true, true, true], "după expirare cererile trebuiau să plece: " + JSON.stringify(rez) + ", cereri spre Pionex: " + cereri.length);
    assert.equal(cereri.length, 5); assert.ok(cereri.every((u) => /^https:\/\/api\.pionex\.com\/api\/v1\/market\/tickers\?type=SPOT$/.test(u)));
  } finally { ceasReal(); globalThis.fetch = fetchReal; LAC.reseteazaLacatPionex(); }
});

await test("1b un 429 ADEVĂRAT de la Pionex (fără antete) ține 75 s; cererile din lacăt nu-l mută; la +80 s pleacă din nou", async () => {
  const { onRequestGet } = await marketNou();
  let raspuns = () => J({ code: "TOO_MANY" }, 429), cereri = 0;
  globalThis.fetch = async () => { cereri++; return raspuns(); };
  const T = nowReal(); let off = 0; ceas(() => T + off);
  try {
    LAC.reseteazaLacatPionex();
    const r0 = await (await onRequestGet({ request: cerere(TICKERE), env: ENV })).json();
    assert.equal(r0.result, false); assert.equal(cereri, 1);
    const pana = LAC.lacatPanaLa(); assert.equal(pana, T + 75000, "429 de la Pionex ⇒ 75 s (ca înainte)");
    raspuns = () => J({ result: true, data: { tickers: [] } });
    off = 30000; const r1 = await (await onRequestGet({ request: cerere(TICKERE), env: ENV })).json();
    assert.equal(r1.result, false); assert.equal(cereri, 1, "a plecat în lacăt");
    assert.equal(LAC.lacatPanaLa(), pana, "refuzul nostru a mutat lacătul de la +75 s la +" + Math.round((LAC.lacatPanaLa() - T) / 1000) + " s");
    off = 80000; const r2 = await (await onRequestGet({ request: cerere(TICKERE), env: ENV })).json();
    assert.equal(r2.result, true, "la +80 s lacătul de 75 s trebuia să fi expirat: " + JSON.stringify(r2)); assert.equal(cereri, 2);
  } finally { ceasReal(); globalThis.fetch = fetchReal; LAC.reseteazaLacatPionex(); }
});

await test("1c `x-ratelimit-lock` de la Pionex ține tot ore (neschimbat), iar refuzurile din timpul lui nu-l lungesc", async () => {
  const { onRequestGet } = await marketNou();
  const T = nowReal(), lock = Math.floor((T + 3 * ORA) / 1000); let off = 0, cereri = 0; ceas(() => T + off);
  globalThis.fetch = async () => { cereri++; return J({}, 429, { "x-ratelimit-lock": String(lock) }); };
  try {
    LAC.reseteazaLacatPionex();
    await (await onRequestGet({ request: cerere(TICKERE), env: ENV })).json();
    assert.equal(LAC.lacatPanaLa(), lock * 1000);
    off = 2 * ORA + 59 * MIN; const r = await (await onRequestGet({ request: cerere(TICKERE), env: ENV })).json();
    assert.equal(r.result, false); assert.equal(cereri, 1); assert.equal(LAC.lacatPanaLa(), lock * 1000, "lacătul lung s-a lungit din refuzul nostru");
  } finally { ceasReal(); globalThis.fetch = fetchReal; LAC.reseteazaLacatPionex(); }
});

// ---------------------------------------------------------------- bucățile colectorului, într-o lume falsă
const COL = citeste("scripts", "colector.mjs");
function fnCol(nume) {
  const cap = "\nasync function " + nume + "(", i = COL.indexOf(cap);
  assert.ok(i >= 0, "lipsește " + nume + " în colector.mjs"); assert.equal(COL.indexOf(cap, i + 1), -1, "două " + nume + " în colector.mjs");
  return COL.slice(i + 1, COL.indexOf("\n}\n", i + 1) + 2);
}
// linia turei din bucla (cea care hotărăște turaGataLa)
function linieTura() { const l = fnCol("bucla").split("\n").filter((x) => /await tura\(\)/.test(x)); assert.equal(l.length, 1, "linia turei din bucla"); return l[0]; }
// numele colectorului: din `baza` (cele date de probă) sau un ciot async (orice altceva: turele de după, jurnalele) - nu din globalThis
function inLume(baza, cod) {
  const ciot = async () => undefined;
  const M = new Proxy(baza, {
    has: (t, k) => typeof k === "string" && (k in t || !(k in globalThis)),
    get: (t, k) => (typeof k !== "string" ? undefined : k in t ? t[k] : ciot),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return new Function("M", "with (M) { return (async () => {\n" + cod + "\n})(); }")(M);
}
const RECONECTARE = () => Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
function lumeTura(cere) {
  const b = {
    S, MesajeColector: MC, MAX_ESECURI: 15, CANAL: "discord", DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1/abc",
    esecuri: 0, turaNr: 4, turaGataLa: 0, ultimiiBoti: [], ultimiiBotiLa: 0, pret30: {}, pret30La: {}, stareAlerte: {}, lumanari15: {}, mediuPe: {},
    jurnale: [], directe: [], anunturi: [], anuntOk: true, stare: { citireRea: 0, anuntatRau: 0, cunoscuti: {} },
    jurnal: (...a) => { b.jurnale.push(a.join(" ")); }, bate: () => {}, scrieStare: () => {}, meta: () => b.stare, cere,
    trimiteDiscord: async (m) => { b.directe.push(m.titlu); return true; },
    anuntaMesaj: async (x) => { b.anunturi.push(x); return b.anuntOk; },
    anuntaColector: async (nivel, titlu, mesaj) => { b.anunturi.push({ nivel, titlu, mesaj }); return b.anuntOk; },
    trimiteAlerta: async (m) => { b.anunturi.push(m); return b.anuntOk; },
  };
  const cod = fnCol("tura") + "\n" + linieTura();
  return { b, tura: (la) => { ceas(() => la); return inLume(b, cod).finally(ceasReal); } };
}
const TITLU_OPRIT = MC.serverOprit(15).titlu, TITLU_REVENIT = MC.serverRevenit().titlu;
const oprite = (b) => b.anunturi.filter((x) => x.titlu === TITLU_OPRIT);

await test("2a server :8788 căzut (conexiune refuzată) ⇒ turaGataLa NU se mișcă (pulsul pozei rămâne la ultima tură cu boții citiți)", async () => {
  const T0 = Date.parse("2026-10-28T16:00:00Z"), L = lumeTura(async () => { throw RECONECTARE(); });
  L.b.turaGataLa = T0 - MIN;
  await L.tura(T0);
  assert.equal(L.b.esecuri, 1, "eșecul trebuia numărat");
  assert.equal(L.b.turaGataLa, T0 - MIN, "turaGataLa s-a mutat la " + new Date(L.b.turaGataLa).toISOString() + " deși boții n-au fost citiți");
});

await test("2b nici bot-orders refuzat (lacătul Pionex 429 / parola) nu mișcă turaGataLa; boții citiți îl mișcă", async () => {
  const T0 = Date.parse("2026-10-28T16:00:00Z");
  for (const e of [Object.assign(new Error("Pionex rate limit: retry in 75s"), { status: 429 }), Object.assign(new Error("AUTH_INVALID"), { status: 401, cod: "AUTH_INVALID" })]) {
    const L = lumeTura(async () => { throw e; }); L.b.turaGataLa = T0 - MIN;
    await L.tura(T0); assert.equal(L.b.turaGataLa, T0 - MIN, "turaGataLa mutat pe „" + e.message + "”");
  }
  const L = lumeTura(async (cale) => (cale === "/api/bot-orders" ? { bots: [] } : null)); L.b.turaGataLa = T0 - MIN;
  await L.tura(T0); assert.equal(L.b.turaGataLa, T0, "boții citiți ⇒ turaGataLa = acum");
});

/* revizia 29.10: refuzat de Discord, anunțul e DEJA în coada de pe disc (trimiteAlerta) - o reîncercare la fiecare tură punea câte o dublură */
await test("2c după 15 ture fără server: anunțul trece prin trimiteAlerta (nu direct pe Discord), refuzat ⇒ fără dubluri pe tură, repetat la 3 h", async () => {
  const T0 = Date.parse("2026-10-28T16:00:00Z"), L = lumeTura(async () => { throw RECONECTARE(); });
  for (let i = 0; i < 14; i++) await L.tura(T0 + i * MIN);
  assert.equal(oprite(L.b).length, 0, "anunț înainte de 15 eșecuri");
  L.b.anuntOk = false; await L.tura(T0 + 14 * MIN);
  assert.deepEqual(L.b.directe, [], "anunțul „serverul nu mai răspunde” a plecat DIRECT pe Discord (fără coadă, fără KV, rezultatul ignorat)");
  assert.equal(oprite(L.b).length, 1, "la a 15-a tură trebuia anunțul prin drumul alertelor");
  await L.tura(T0 + 16 * MIN); await L.tura(T0 + 20 * MIN);
  assert.equal(oprite(L.b).length, 1, "refuzat la a 15-a ⇒ e deja în coada de pe disc; reîncercat la fiecare tură s-ar fi dublat în coadă");
  L.b.anuntOk = true; await L.tura(T0 + 2 * ORA);
  assert.equal(oprite(L.b).length, 1, "repetat înainte de 3 h");
  await L.tura(T0 + 14 * MIN + 3 * ORA);
  assert.equal(oprite(L.b).length, 2, "cât ține căderea anunțul se repetă la 3 h");
  const min = Number((oprite(L.b)[1].mesaj.match(/~(\d+)/) || [])[1]);
  assert.ok(min >= 180, "al doilea anunț spune de cât timp tace serverul (~" + min + " min)");
  assert.deepEqual(L.b.directe, []);
});

await test("2d revenirea serverului: „răspunde din nou” prin trimiteAlerta (o dată), turaGataLa = acum, numărătoarea de la zero", async () => {
  const T0 = Date.parse("2026-10-28T16:00:00Z");
  let jos = true; const L = lumeTura(async (cale) => { if (jos) throw RECONECTARE(); return cale === "/api/bot-orders" ? { bots: [] } : null; });
  L.b.turaGataLa = T0 - MIN;
  for (let i = 0; i < 15; i++) await L.tura(T0 + i * MIN);
  jos = false; await L.tura(T0 + 20 * MIN);
  assert.deepEqual(L.b.directe, [], "revenirea a plecat direct pe Discord, înaintea cozii");
  assert.equal(L.b.anunturi.filter((x) => x.titlu === TITLU_REVENIT).length, 1, "revenirea trebuia spusă prin drumul alertelor");
  assert.equal(L.b.turaGataLa, T0 + 20 * MIN); assert.equal(L.b.esecuri, 0);
  await L.tura(T0 + 21 * MIN);
  assert.equal(L.b.anunturi.filter((x) => x.titlu === TITLU_REVENIT).length, 1, "revenirea spusă de două ori");
});

await test("2g revenirea refuzată de Discord (deja în coadă) nu se mai spune la tura următoare - fără dubluri", async () => {
  const T0 = Date.parse("2026-10-28T16:00:00Z");
  let jos = true; const L = lumeTura(async (cale) => { if (jos) throw RECONECTARE(); return cale === "/api/bot-orders" ? { bots: [] } : null; });
  for (let i = 0; i < 15; i++) await L.tura(T0 + i * MIN);
  jos = false; L.b.anuntOk = false; await L.tura(T0 + 20 * MIN); await L.tura(T0 + 21 * MIN); await L.tura(T0 + 22 * MIN);
  assert.equal(L.b.anunturi.filter((x) => x.titlu === TITLU_REVENIT).length, 1, "revenirea refuzată s-a pus din nou în coadă la fiecare tură");
});

await test("2e lanțul până la paznic: 40 min fără server ⇒ poza poartă turaLa vechi ⇒ paznicul spune „alertele botului stau”", async () => {
  const W = await import("../paznic/worker.mjs");
  const kv = new Map(), discord = [];
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1/abc", PAZNIC_TOKEN: "t".repeat(32) };
  const f = async (u, o) => { discord.push(JSON.parse(o.body)); return { ok: true }; };
  const T0 = Date.parse("2026-10-28T16:00:00Z");
  let jos = false; const L = lumeTura(async (cale) => { if (jos) throw RECONECTARE(); return cale === "/api/bot-orders" ? { bots: [] } : null; });
  await L.tura(T0); assert.equal(L.b.turaGataLa, T0);
  await W.bataie(env, { pid: 1 }, T0, f);
  jos = true; for (let i = 1; i <= 40; i++) await L.tura(T0 + i * MIN);
  const acum = T0 + 40 * MIN;
  const poza = construiestePoza({ acum, turaLa: L.b.turaGataLa || null, versiune: "v101.x", pid: 1, tura: 41, boti: [], simboluri: [], t212: [] });
  assert.equal((await W.pozaScrie(env, JSON.stringify(poza), acum)).status, 200);
  const v = await W.verifica(env, acum + MIN, f);
  assert.equal(v.stare, "anuntat", "paznicul n-a observat serverul mort (stare " + v.stare + ", turaLa " + new Date(poza.turaLa).toISOString() + ")");
  assert.match(JSON.stringify(discord), /alertele botului stau/);
});

await test("2f colectorul: poza poartă turaLa și înainte de prima tură cu boții citiți (ora pornirii), nu null - altfel paznicul ia `la` drept puls", () => {
  assert.match(COL, /construiestePoza\(\{ acum: Date\.now\(\), turaLa: turaGataLa \|\| PORNIT_LA,/);
  assert.match(COL, /if \(Date\.now\(\) - turaGataLa > 5 \* 60000\) return;/, "bătaia separată tot cere bucla mersă în ultimele 5 min");
});

// ---------------------------------------------------------------- 3. ordinea cozii Discord
function lumeCoada() {
  const b = {
    S, MesajeColector: MC, CANAL: "discord", DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1/abc",
    coadaDiscord: [], coadaKv: [], jurnale: [], sosite: [], discordOk: true, discordMs: 0, kv: [],
    jurnal: (...a) => { b.jurnale.push(a.join(" ")); }, salveazaCoada: () => {}, salveazaCoadaKv: () => {}, notezAlerta: () => {}, pretBot: () => null, simbolBot: () => null,
    trimite: async (cale, corp) => { b.kv.push(corp && corp.alerta && corp.alerta.titlu); return { ok: true }; },
    trimiteDiscord: async (m) => { if (b.discordMs) await new Promise((r) => setTimeout(r, b.discordMs)); if (!b.discordOk) return false; b.sosite.push(m.titlu); return true; },
  };
  const decl = COL.split("\n").filter((l) => /^let golireDiscord\b/.test(l));
  assert.equal(decl.length, 1, "declarația golireDiscord");
  const cod = decl[0] + "\n" + fnCol("golesteCoada") + "\n" + fnCol("trimiteAlerta") + "\nreturn { golesteCoada, trimiteAlerta };";
  return { b, f: inLume(b, cod) };
}
const VECHI = MC.citireRea(10, "Pionex rate limit"), NOU = MC.citireDinNou();

await test("3a după o cădere: mesajul vechi din coadă pleacă ÎNAINTEA celui nou din aceeași tură (28.10, 20:04)", async () => {
  const L = lumeCoada(), A = await L.f, T = nowReal();
  L.b.coadaDiscord.push({ t: T - 224 * MIN, m: { nivel: VECHI.nivel, titlu: VECHI.titlu, mesaj: VECHI.mesaj } });
  await A.trimiteAlerta(NOU, null, "colector");   // tura: „citește din nou botul”
  await A.golesteCoada();                          // bucla: coada, după tură
  assert.deepEqual(L.b.sosite, [VECHI.titlu + " (întârziat 224 min)", NOU.titlu], "ordinea pe Discord: " + JSON.stringify(L.b.sosite));
  assert.equal(L.b.coadaDiscord.length, 0);
});

await test("3b o golire în curs (pornită de bucla) e AȘTEPTATĂ: mesajul nou nu se strecoară între mesajele cozii", async () => {
  const L = lumeCoada(), A = await L.f, T = nowReal();
  L.b.discordMs = 20;
  L.b.coadaDiscord.push({ t: T - 30 * MIN, m: { nivel: "critic", titlu: "q1", mesaj: "" } }, { t: T - 29 * MIN, m: { nivel: "critic", titlu: "q2", mesaj: "" } });
  const p = A.golesteCoada();   // bucla n-o așteaptă
  await A.trimiteAlerta({ nivel: "info", titlu: "nou", mesaj: "" }, null, "x");
  await p;
  assert.deepEqual(L.b.sosite.map((t) => t.replace(/ \(întârziat \d+ min\)$/, "")), ["q1", "q2", "nou"], "ordinea pe Discord: " + JSON.stringify(L.b.sosite));
});

await test("3c Discord căzut: nimic pierdut, coada păstrează ordinea (vechi, nou); la revenire pleacă în ordine", async () => {
  const L = lumeCoada(), A = await L.f, T = nowReal();
  L.b.coadaDiscord.push({ t: T - 60 * MIN, m: { nivel: "critic", titlu: "vechi", mesaj: "" } });
  L.b.discordOk = false;
  assert.equal(await A.trimiteAlerta({ nivel: "info", titlu: "nou", mesaj: "" }, null, "x"), true, "în KV a ajuns ⇒ „trimisă”");
  assert.deepEqual(L.b.coadaDiscord.map((x) => x.m.titlu), ["vechi", "nou"]);
  L.b.discordOk = true; await A.golesteCoada();
  assert.deepEqual(L.b.sosite.map((t) => t.replace(/ \(întârziat \d+ min\)$/, "")), ["vechi", "nou"]);
});

await test("3d coada goală: mesajul nou pleacă direct, o singură trimitere (nimic în plus pe drumul obișnuit)", async () => {
  const L = lumeCoada(), A = await L.f;
  assert.equal(await A.trimiteAlerta({ nivel: "critic", titlu: "lichidare", mesaj: "" }, "b1", "lichidare"), true);
  assert.deepEqual(L.b.sosite, ["lichidare"]); assert.deepEqual(L.b.kv, ["lichidare"]); assert.equal(L.b.coadaDiscord.length, 0);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
