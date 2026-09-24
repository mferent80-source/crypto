// Probele pentru alertele botului (public/lib/alerte.js) si pentru istoricul
// de pe serverul de acasa (functions/api/istoric-bot.js).
import assert from "node:assert/strict";
import fs from "node:fs";

const SRC = fs.readFileSync(new URL("../public/lib/alerte.js", import.meta.url), "utf8");
const A = new Function(`${SRC}; return Alerte;`)();
const TOKEN = "token-de-proba-colector-77";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

const ORA = 3600000, T0 = 1_800_000_000_000;
const bot = (o = {}) => ({ id: "b1", baza: "ADA.PERP", directie: "long", activ: true, stareInterna: "running",
  distantaLichidarePct: 30, lichidareDepasita: false, pretLichidare: 0.5, stareMargine: "NORMAL", stareRisc: "TRADING",
  pretCurent: 1.0, gridJos: 0.9, gridSus: 1.1, opritorPierdere: null, opritorPierdereActiv: false, ...o });
const chei = (r) => r.mesaje.map((m) => m.cheie + ":" + m.nivel).sort().join(",");

console.log("\nV77 · alertele si istoricul de acasa · proba\n");

await test("totul in regula la prima rulare -> niciun mesaj (nu anunta 'a trecut' ce n-a fost)", () => {
  assert.equal(A.evalueaza(bot(), { fata4h: "bine" }, {}, T0).mesaje.length, 0);
});

await test("lichidarea: 12% -> atentie; tot 12% dupa o ora -> tacere; dupa 3 ore -> se repeta", () => {
  let r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, {}, T0);
  assert.equal(chei(r), "lich:atentie");
  r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, r.stare, T0 + ORA);
  assert.equal(r.mesaje.length, 0, "o alerta care persista nu se trimite in fiecare minut");
  r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, r.stare, T0 + 3 * ORA + 1);
  assert.equal(chei(r), "lich:atentie");
});

await test("lichidarea: se agraveaza la 5% -> critic imediat; revine la 30% -> 'info' abia dupa 10 minute stabile, o data", () => {
  let r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, {}, T0);
  r = A.evalueaza(bot({ distantaLichidarePct: 5 }), null, r.stare, T0 + 60000);
  assert.equal(chei(r), "lich:critic");
  r = A.evalueaza(bot({ distantaLichidarePct: 30 }), null, r.stare, T0 + 120000);
  assert.equal(r.mesaje.length, 0, "'a trecut' dupa un singur minut bun e prea devreme");
  r = A.evalueaza(bot({ distantaLichidarePct: 30 }), null, r.stare, T0 + 120000 + 10 * 60000);
  assert.equal(chei(r), "lich:info");
  r = A.evalueaza(bot({ distantaLichidarePct: 30 }), null, r.stare, T0 + 120000 + 11 * 60000);
  assert.equal(r.mesaje.length, 0, "'a trecut' se spune o singura data");
});

function oscileaza(a, b, minute) {
  let st = {}, n = 0;
  for (let i = 0; i < minute; i++) { const r = A.evalueaza(bot({ distantaLichidarePct: i % 2 ? a : b }), null, st, T0 + i * 60000); st = r.stare; n += r.mesaje.length; }
  return n;
}
await test("histerezis: o ora de oscilatie la pragul de 15% -> un singur mesaj, nu 59", () => {
  const n = oscileaza(14.9, 15.1, 60);
  assert.ok(n <= 1, `${n} mesaje intr-o ora`);
});
await test("histerezis: o ora de oscilatie la pragul critic de 8% -> cel mult doua mesaje, nu 31", () => {
  const n = oscileaza(7.9, 8.1, 60);
  assert.ok(n <= 2, `${n} mesaje intr-o ora`);
});
await test("lumanarile de 4h care pica din cand in cand nu retrimit alerta de directie", () => {
  let r = A.evalueaza(bot(), { fata4h: "rau", dir4h: "coboara" }, {}, T0), n = r.mesaje.length;
  for (let i = 1; i <= 12; i++) { r = A.evalueaza(bot(), i % 2 ? null : { fata4h: "rau", dir4h: "coboara" }, r.stare, T0 + i * 60000); n += r.mesaje.length; }
  assert.equal(n, 1, `${n} mesaje de directie in 12 ture`);
});

await test("lichidare DEPASITA -> critic, cu pretul de lichidare in mesaj", () => {
  const r = A.evalueaza(bot({ distantaLichidarePct: -2, lichidareDepasita: true, pretLichidare: 0.26 }), null, {}, T0);
  assert.equal(chei(r), "lich:critic");
  assert.match(r.mesaje[0].mesaj, /0\.26/);
});

await test("distanta LIPSA nu e siguranta: dupa o alerta, lipsa nu trimite 's-a indepartat' si pastreaza starea", () => {
  let r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, {}, T0);
  r = A.evalueaza(bot({ distantaLichidarePct: null }), null, r.stare, T0 + 60000);
  assert.equal(r.mesaje.length, 0, `lipsa a produs: ${chei(r)}`);
  assert.equal(r.stare.lich.nivel, "atentie", "starea alertei s-a pierdut pe o citire fara distanta");
});

await test("Pionex raporteaza LIQUIDATING / risc anormal -> critic", () => {
  assert.equal(chei(A.evalueaza(bot({ stareMargine: "LIQUIDATING" }), null, {}, T0)), "status:critic");
  assert.equal(chei(A.evalueaza(bot({ stareRisc: "PAUSED" }), null, {}, T0)), "status:critic");
});

await test("pretul iese din grid -> atentie; pret lipsa nu spune 'din nou in grid'", () => {
  let r = A.evalueaza(bot({ pretCurent: 0.85 }), null, {}, T0);
  assert.equal(chei(r), "grid:atentie");
  r = A.evalueaza(bot({ pretCurent: null }), null, r.stare, T0 + 60000);
  assert.equal(r.mesaje.length, 0);
});

await test("piata pe 4h trece impotriva botului -> atentie, o data", () => {
  let r = A.evalueaza(bot(), { fata4h: "bine", dir4h: "urca" }, {}, T0);
  r = A.evalueaza(bot(), { fata4h: "rau", dir4h: "coboara" }, r.stare, T0 + 60000);
  assert.equal(chei(r), "directie:atentie");
  assert.match(r.mesaje[0].mesaj, /nu o prognoză/);
});

await test("opritorul pe pierdere STINS cu lichidarea sub 20% -> atentie; peste 20% -> tacere", () => {
  assert.equal(chei(A.evalueaza(bot({ opritorPierdere: 0.3, distantaLichidarePct: 18 }), null, {}, T0)), "opritor:atentie");
  assert.equal(A.evalueaza(bot({ opritorPierdere: 0.3, distantaLichidarePct: 25 }), null, {}, T0).mesaje.length, 0);
});

// ── ruta istoric-bot, cu un KV fals ─────────────────────────────────────────
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const proaspat = () => `../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`;
let ip = 0;
async function cheama(metoda, qs, env, { corp = null, token = TOKEN, origin = "https://exemplu.test" } = {}) {
  const m = await import(proaspat());
  const h = { "cf-connecting-ip": "10.0.0." + (++ip % 250) };
  if (token) h.authorization = "Bearer " + token;
  if (corp !== null) { h["content-type"] = "application/json"; if (origin) h.origin = origin; }
  const req = new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: corp === null ? undefined : JSON.stringify(corp) });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}

await test("istoric: fara token -> 401; fara KV (pagina publicata) -> 503 cu motiv", async () => {
  assert.equal((await cheama("GET", "action=citeste&bot=b1", { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, { token: null })).status, 401);
  const r = await cheama("GET", "action=citeste&bot=b1", { APP_API_TOKEN: TOKEN });
  assert.equal(r.status, 503); assert.equal(r.d.error, "ISTORIC_DOAR_ACASA");
});

await test("istoric: POST din alta origine -> 403 (doar serverul de acasa scrie)", async () => {
  const r = await cheama("POST", "action=adauga", { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, { corp: { bot: "b1", intrare: { t: Date.now() } }, origin: "https://rau.test" });
  assert.equal(r.status, 403);
});

await test("istoric: o intrare pe minut, lipsa ramane null (nu 0), se citeste inapoi", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t = Math.floor(Date.now() / 60000) * 60000 - 5 * 60000 + 10000;
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t, perechi: 10, profitNet: null, pretPerp: "0.33" } } });
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: t + 5000, perechi: 11, profitNet: "", pretPerp: 0.34 } } });
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: t + 60000, perechi: 12, pretPerp: 0.35 } } });
  const r = await cheama("GET", "action=citeste&bot=b1&ore=1", env);
  assert.equal(r.status, 200);
  assert.equal(r.d.intrari.length, 2, `acelasi minut trebuia sa se inlocuiasca: ${JSON.stringify(r.d.intrari)}`);
  assert.equal(r.d.intrari[0].perechi, 11);
  assert.strictEqual(r.d.intrari[0].profitNet, null, "un profit lipsa a devenit altceva decat null");
  assert.strictEqual(r.d.intrari[1].investit, null);
});

await test("istoric: intrarile mai vechi de 7 zile se taie; 'ore' limiteaza citirea", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, acum = Date.now();
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: acum - 8 * 24 * ORA, perechi: 1 } } });
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: acum - 30 * ORA, perechi: 2 } } });
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: acum - 60000, perechi: 3 } } });
  const toate = JSON.parse(env.ISTORIC.m.get("ist:b1"));
  assert.deepEqual(toate.map((x) => x.perechi), [2, 3], "intrarea de acum 8 zile trebuia taiata");
  assert.deepEqual((await cheama("GET", "action=citeste&bot=b1&ore=24", env)).d.intrari.map((x) => x.perechi), [3]);
});

await test("istoric: config pastreaza canalul ntfy (validat) si ultima tura a colectorului", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.equal((await cheama("POST", "action=config", env, { corp: { ntfyTopic: "a b" } })).status, 400);
  await cheama("POST", "action=config", env, { corp: { ntfyTopic: "radar-abc123def456", colectorLa: 1234 } });
  const r = await cheama("GET", "action=config", env);
  assert.deepEqual(r.d.config, { ntfyTopic: "radar-abc123def456", colectorLa: 1234 });
});

// ── pionex-account?action=futures: marja libera din contul futures manual ──
const { reseteazaRitmPionex } = await import("../functions/_shared/pionex.js");
async function contFutures(raspuns) {
  reseteazaRitmPionex();
  const fetchVechi = globalThis.fetch;
  const cai = [];
  globalThis.fetch = async (url, opt = {}) => { cai.push({ url: String(url), metoda: opt.method || "GET" });
    return new Response(typeof raspuns === "string" ? raspuns : JSON.stringify(raspuns), { status: 200, headers: { "content-type": "application/json" } }); };
  try {
    const m = await import(`../functions/api/pionex-account.js?t=${Date.now()}_${Math.random()}`);
    const res = await m.onRequestGet({ request: new Request("https://exemplu.test/api/pionex-account?action=futures",
      { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.9.9." + (++ip % 250) } }),
      env: { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" } });
    return { status: res.status, d: await res.json(), cai };
  } finally { globalThis.fetch = fetchVechi; }
}

await test("futures: citeste /uapi/v1/account/detail cu GET si da USDT-ul liber; lipsa ramane null", async () => {
  const r = await contFutures({ result: true, data: { balances: [{ coin: "ADA", available: "5" }, { coin: "USDT", available: "12.5", assets: "20", unrealizedPnL: "", totalInitialMargin: "7.5" }] } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.d.usdt, { disponibil: 12.5, total: 20, nerealizat: null, marjaFolosita: 7.5 });
  assert.ok(r.cai.length === 1 && r.cai[0].metoda === "GET" && /\/uapi\/v1\/account\/detail\?/.test(r.cai[0].url), JSON.stringify(r.cai));
});

await test("futures: forma necunoscuta -> 502, nu 'sold zero'", async () => {
  const r = await contFutures({ result: true, data: {} });
  assert.equal(r.status, 502);
  assert.equal(r.d.motiv, "forma-necunoscuta");
});

console.log(`\nV77_COLECTOR ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
