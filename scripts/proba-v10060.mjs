// Proba v100.60 (01.10, el: „CE SFAT E ASTA, BOTUL E PE CREȘTERE DE MINUTE BUNE … PLUS REZOLVĂ COLECTORUL ȘI LIMITA”).
// CRV long, 16:50 -> 18:09 UTC: distanta pana la lichidare 11,2 % -> 12,4 % (pretul urca), iar Consilierul scria
// „Lichidarea s-a apropiat la 12.5%, iar lichidarea la 12.5%” + „N-aș mai lăsa poziția să crească”.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 400)}`); }); }
console.log("\nV100.60 · Sfatul de lichidare cu directia distantei + limita colectorului · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);
const lich = (sm) => (sm.componente || []).find((k) => k.cod === "lichidare");

await test("semaforul: distanta CRESTE (pretul se indeparteaza) -> „se îndepărtează”, nu „s-a apropiat”, si nimic de facut acum", () => {
  const k = lich(SB.semafor({ bot: { distantaLichidarePct: 12.41, directie: "long" }, distInainte: 11.18 }));
  are(k, "componenta lichidare"); assert.equal(k.nivel, "atentie");
  assert.ok(!/s-a apropiat/.test(k.motiv), k.motiv); assert.match(k.motiv, /se îndepărtează/); assert.match(k.motiv, /11[.,]2/);
  assert.match(k.faCeSlab, /nimic de făcut acum/); assert.ok(!/N-aș mai lăsa poziția să crească/.test(k.faCe + k.faCeSlab));   // revizia: textul linistitor e „slab”
});
await test("semaforul: distanta SCADE -> „s-a apropiat” (cu cat era) si sfatul vechi; fara istoric -> „lichidarea e la”", () => {
  const a = lich(SB.semafor({ bot: { distantaLichidarePct: 12.4, directie: "long" }, distInainte: 13.6 }));
  assert.match(a.motiv, /s-a apropiat/); assert.match(a.motiv, /13[.,]6/); assert.match(a.faCe, /N-aș mai lăsa poziția să crească/);
  const f = lich(SB.semafor({ bot: { distantaLichidarePct: 12.4, directie: "long" } }));
  assert.match(f.motiv, /^lichidarea e la 12/); assert.ok(!/s-a apropiat/.test(f.motiv));
});
await test("distantaLaOra: distanta de acum ~o ora din istoric (±20 min); fara date -> null", () => {
  are(SB.distantaLaOra, "SemnaleBot.distantaLaOra");
  const M = 60000, acum = 1000 * M, l = [{ t: acum - 70 * M, distantaLichidarePct: 11.2 }, { t: acum - 30 * M, distantaLichidarePct: 11.8 }, { t: acum - 2 * M, distantaLichidarePct: 12.4 }];
  assert.equal(SB.distantaLaOra(l, acum, 60 * M), 11.2);
  assert.equal(SB.distantaLaOra([{ t: acum - 5 * M, distantaLichidarePct: 12 }], acum, 60 * M), null);
  assert.equal(SB.distantaLaOra(null, acum, 60 * M), null);
});
await test("Consilierul: lichidarea apare O SINGURA DATA in titlu (semaforul + sfatul „pericol” al alertelor spuneau acelasi lucru)", () => {
  const sm = { nivel: "atentie", cod: "lichidare", motiv: "lichidarea e la 12.4%", componente: [{ cod: "lichidare", nivel: "atentie", motiv: "lichidarea e la 12.4%", faCe: "x" }] };
  const c = CS.alcatuieste({ sm, sfaturi: [{ cod: "pericol", tip: "lich", ton: "atentie", titlu: "lichidarea la 12.4%", text: "", faCe: "y" }] });
  assert.equal((c.titlu.match(/lichidarea/gi) || []).length, 1, c.titlu);
  assert.match(fs.readFileSync(path.join(RAD, "public", "lib", "sfaturi.js"), "utf8"), /cod: "pericol", tip: k,/);
});
await test("colectorul si pagina dau semaforului distanta de acum o ora", () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), a = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.ok(col.includes("distInainte: SemnaleBot.distantaLaOra(") && col.includes("st._distIst"), "colector");
  assert.ok(a.includes("distInainte:") && a.includes("SemnaleBot.distantaLaOra("), "pagina");
});
await test("limita: colectorul (antetul lui, DUPA token valid) are galeata lui - pagina nu mai primeste RATE_LIMITED din cauza lui; fara token antetul nu ajuta", async () => {
  const { requireApiAuth } = await import(pathToFileURL(path.join(RAD, "functions", "_shared", "auth.js")).href);
  const env = { APP_API_TOKEN: "t" }, cer = (cl, tok) => new Request("http://127.0.0.1:8788/api/istoric-bot?action=x", { headers: { authorization: "Bearer " + (tok || "t"), "x-forwarded-for": "10.9.9.9", ...(cl ? { "x-radar-client": "colector" } : {}) } });
  let ok = 0; for (let i = 0; i < 300; i++) if ((await requireApiAuth(cer(true), env, "proba-v10060", 120, 480)).ok) ok++;
  assert.equal(ok, 300, "colectorul: 300 de citiri intr-un minut trec (galeata lui, unde ruta o cere)");
  assert.equal((await requireApiAuth(cer(false), env, "proba-v10060", 120)).ok, true, "pagina, dupa 300 de cereri ale colectorului: tot trece");
  const r = await requireApiAuth(cer(true, "gresit"), env, "proba-v10060", 120); assert.equal(r.ok, false, "fara token valid antetul nu deschide nimic");
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), /"x-radar-client": "colector"/);
});

await test("limita paginii la citire: 300/min (T212 citeste ~45 la o deschidere - PC + telefon in acelasi minut treceau de 120)", async () => {
  const src = fs.readFileSync(path.join(RAD, "functions", "api", "istoric-bot.js"), "utf8");
  assert.ok(src.includes('requireApiAuth(request,env,"istoric-read",300,'), "istoric-read 300");
  const { requireApiAuth } = await import(pathToFileURL(path.join(RAD, "functions", "_shared", "auth.js")).href);
  const env = { APP_API_TOKEN: "t" }, cer = () => new Request("http://127.0.0.1:8788/api/istoric-bot?action=x", { headers: { authorization: "Bearer t", "x-forwarded-for": "10.8.8.8" } });
  let ok = 0; for (let i = 0; i < 250; i++) if ((await requireApiAuth(cer(), env, "proba-v10060-pagina", 300)).ok) ok++;
  assert.equal(ok, 250);
});

// ---- revizia Opus 01.10 (v100.60) ----
await test("I1: distanta lipsa (pret mort, Pionex null) NU intra in istoric ca 0 % - altfel „se îndepărtează (era 0.0%)” linistea fals", () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.ok(col.includes('typeof b.distantaLichidarePct === "number" && Number.isFinite(b.distantaLichidarePct)'), "verificare null-sigura");
  assert.ok(!col.includes("st._distIst = (st._distIst || [])"), "vechea notare (Number(null) = 0) a disparut");
});
await test("I2: cand lichidarea se indeparteaza, „Ce aș face eu” vine de la urmatorul motiv (ex. pretul sub grid), nu „nimic de făcut”", () => {
  const sm = SB.semafor({ bot: { distantaLichidarePct: 12.4, directie: "long" }, distInainte: 11.2 }), k = lich(sm);
  assert.equal(k.faCe, "", "fara actiune proprie cand se indeparteaza");
  sm.componente.push({ cod: "muta", nivel: "atentie", motiv: "prețul e sub grid", faCe: "Aș opri botul și aș face unul nou din fișă." });
  const c = CS.alcatuieste({ sm, sfaturi: [] });
  assert.match(c.faCe, /opri botul/, c.faCe); assert.match(c.titlu, /se îndepărtează/);
  const singur = CS.alcatuieste({ sm: SB.semafor({ bot: { distantaLichidarePct: 12.4, directie: "long" }, distInainte: 11.2 }), sfaturi: [] });
  assert.match(singur.faCe, /nimic de făcut/i, "singur: tot spune ca n-ai nimic de facut");
});
await test("I3: galeata colectorului e x4 DOAR unde ruta o cere (citirile istoricului), in rest x1 - Pionex/T212/Binance raman franate", async () => {
  const { requireApiAuth } = await import(pathToFileURL(path.join(RAD, "functions", "_shared", "auth.js")).href);
  const env = { APP_API_TOKEN: "t" }, cer = () => new Request("http://127.0.0.1:8788/api/x", { headers: { authorization: "Bearer t", "x-forwarded-for": "10.7.7.7", "x-radar-client": "colector" } });
  let ok = 0; for (let i = 0; i < 40; i++) if ((await requireApiAuth(cer(), env, "proba-v10060-botorders", 30)).ok) ok++;
  assert.equal(ok, 30, "fara limita proprie a colectorului: tot 30");
  ok = 0; for (let i = 0; i < 300; i++) if ((await requireApiAuth(cer(), env, "proba-v10060-istoric", 300, 1200)).ok) ok++;
  assert.equal(ok, 300);
  assert.ok(fs.readFileSync(path.join(RAD, "functions", "api", "istoric-bot.js"), "utf8").includes('requireApiAuth(request,env,"istoric-read",300,1200)'));
});
await test("mici: semnul distantei (lichidarea depasita acum o ora nu e „era 13 %”); istoricul notat si cand planul pica; un punct la 5 min", () => {
  const k = lich(SB.semafor({ bot: { distantaLichidarePct: 12, directie: "long" }, distInainte: -13 }));
  assert.ok(!/era 13/.test(k.motiv), k.motiv);
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  const iIst = col.indexOf("st0._distIst"), iPlan = col.indexOf('const pl = await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(b.id));');
  assert.ok(iIst > 0 && iIst < iPlan, "istoricul inaintea citirii planului");
  assert.ok(col.includes("4.5 * 60000"), "un punct la ~5 min");
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
