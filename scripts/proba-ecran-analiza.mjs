// PROBA DE ECRAN - "Analizeaza piata" (v91.2), Chrome/Edge real prin CDP, pe DATE REALE.
//
// De ce: 25.09 "cand dau analizeaza piata imi da eroare binance" - VVV (botul lui) nu e
// pe Binance si nici pe Pionex spot, doar ca futures pe Pionex (VVV_USDT_PERP).
// Ce face: pune moneda + sursa, apasa "Analizeaza piata" ca el si citeste ecranul:
// pretul din antet, starea, eticheta sursei, consola.
//
// Rulare (server pe :8788 - PORNESTE-CRYPTO-RADAR.bat; NU intra in npm test):
//   node scripts/proba-ecran-analiza.mjs [url]
// Tokenul API se citeste din .dev.vars (APP_API_TOKEN) si nu se tipareste.
import { spawn, spawnSync } from "node:child_process";
import { rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const URL_T = (process.argv[2] || "http://127.0.0.1:8788/").replace(/\/+$/, "") + "/";
const TOKEN = (() => {
  try { const m = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").match(/^APP_API_TOKEN=(.*)$/m); return m ? m[1].trim().replace(/^"|"$/g, "") : ""; } catch { return ""; }
})();
const BROWSER = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((c) => existsSync(c));
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));
const BOOTSTRAP = `(() => { if (navigator.serviceWorker) { try { navigator.serviceWorker.register = () => Promise.reject(new Error("proba: sw dezactivat")); } catch {} } })();`;

async function porneste(lat, inal, profil) {
  const port = 9600 + Math.floor(Math.random() * 300);
  const proc = spawn(BROWSER, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`,
    `--window-size=${lat},${inal}`, "--no-first-run", "--no-default-browser-check", "--disable-features=Translate", "about:blank"], { stdio: "ignore" });
  let tinta;
  for (let i = 0; i < 80 && !tinta; i++) {
    try { tinta = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {}
    if (!tinta) await asteapta(250);
  }
  if (!tinta) { try { proc.kill(); } catch {} throw new Error("browserul nu a pornit"); }
  const ws = new WebSocket(tinta.webSocketDebuggerUrl);
  let id = 0; const astept = new Map(); const exceptii = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && astept.has(m.id)) { astept.get(m.id)(m.result); astept.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") exceptii.push(String(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text ?? "?").slice(0, 300));
  };
  await new Promise((r) => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise((res) => { const n = ++id; astept.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: true });
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  try { await send("Storage.clearDataForOrigin", { origin: new URL(URL_T).origin, storageTypes: "all" }); } catch {}
  await send("Page.addScriptToEvaluateOnNewDocument", { source: BOOTSTRAP });
  await send("Emulation.setDeviceMetricsOverride", { width: lat, height: inal, deviceScaleFactor: 1, mobile: false });
  return {
    exceptii,
    async ev(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r?.exceptionDetails) throw new Error("evaluare picata: " + String(r.exceptionDetails?.exception?.description ?? r.exceptionDetails?.text).slice(0, 300));
      return r?.result?.value;
    },
    async navigheaza(url) { await send("Page.navigate", { url }); },
    inchide() {
      try { ws.close(); } catch {}
      if (process.platform === "win32" && proc.pid) { try { spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
      try { proc.kill(); } catch {}
    },
  };
}
async function stergeProfilul(profil) {
  for (let i = 0; i < 6; i++) {
    try { rmSync(profil, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch {}
    if (!existsSync(profil)) return;
    await asteapta(700 * (i + 1));
  }
  console.error(`  ATENTIE: profilul de proba a RAMAS pe disc: ${profil}`);
}
async function panaCand(b, expr, ms, ce) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { let ok = false; try { ok = await b.ev(expr); } catch {} if (ok) return; await asteapta(400); }
  throw new Error(`am asteptat ${ms} ms degeaba: ${ce} · stare: ${await b.ev(`(document.getElementById("status")||{}).textContent`).catch(() => "?")}`);
}

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}

// apasa "Analizeaza piata" ca el: moneda in camp, sursa aleasa, click pe buton; asteapta sa se termine
async function analizeaza(b, moneda, sursa) {
  // sursa aleasa ca din selectorul lui (setAnalysisSource), moneda in camp, apoi click pe buton
  await b.ev(`setAnalysisSource(${JSON.stringify(sursa)});document.getElementById("symbol").value=${JSON.stringify(moneda)};window.__radarState=null;true`);
  await b.ev(`document.getElementById("analyzeBtn").click();true`);
  await asteapta(600);
  await panaCand(b, `!document.getElementById("analyzeBtn").disabled`, 90000, `analiza ${moneda} pe ${sursa} sa se termine`);
  await asteapta(800);
  return b.ev(`({pret:window.__radarState&&window.__radarState.symbol===norm(${JSON.stringify(moneda)})?window.__radarState.q.price:null,sursaDate:window.__radarState&&window.__radarState.source,stare:document.getElementById("status").textContent,live:document.getElementById("topLive").textContent,sursa:document.getElementById("topSource").textContent})`);
}
const numar = (v) => (typeof v === "number" ? v : NaN);

const profil = path.join(tmpdir(), `proba-analiza-${Date.now()}`);
const b = await porneste(1440, 1000, profil);
try {
  await b.navigheaza(URL_T);
  await panaCand(b, `document.readyState==="complete"&&typeof analyze==="function"&&!!document.getElementById("analyzeBtn")`, 25000, "aplicatia sa se incarce");
  if (TOKEN) await b.ev(`try{localStorage.setItem("cryptoRadarApiTokenV54",${JSON.stringify(TOKEN)})}catch(e){}`);

  await test("BTC pe Binance (martor) -> pretul BTC, fara eroare", async () => {
    const r = await analizeaza(b, "BTC", "BINANCE");
    assert.doesNotMatch(r.stare, /^Eroare/, `stare: ${r.stare}`);
    assert.ok(numar(r.pret) > 10000, `pret BTC: ${r.pret}`);
  });
  await test("VVV cu sursa Binance (cum a apasat el) -> nu e pe Binance, ia singur de la Pionex futures, pretul apare", async () => {
    const r = await analizeaza(b, "VVV", "BINANCE");
    assert.doesNotMatch(r.stare, /^Eroare/, `stare: ${r.stare} · live: ${r.live}`);
    assert.notEqual(r.live, "DATA ERROR");
    const p = numar(r.pret); assert.ok(p > 5 && p < 200, `pret VVV: ${r.pret}`);
    assert.equal(r.sursaDate, "PIONEX", `datele au venit de la: ${r.sursaDate}`);
    assert.match(r.sursa, /PIONEX/, `sursa afisata: ${r.sursa}`);
  });
  await test("VVV cu sursa Pionex -> VVV_USDT nu exista, ia VVV_USDT_PERP, pretul apare", async () => {
    const r = await analizeaza(b, "VVV", "PIONEX");
    assert.doesNotMatch(r.stare, /^Eroare/, `stare: ${r.stare}`);
    const p = numar(r.pret); assert.ok(p > 5 && p < 200, `pret VVV: ${r.pret}`);
  });
  await test("BTC dupa VVV -> sursa aleasa de el (Binance) NU a ramas schimbata pe Pionex", async () => {
    await b.ev(`localStorage.setItem("analysisProvider","BINANCE");true`);
    const r1 = await analizeaza(b, "VVV", "BINANCE");
    assert.ok(numar(r1.pret) > 5, `VVV: ${r1.pret}`);
    assert.equal(await b.ev(`localStorage.getItem("analysisProvider")`), "BINANCE", "sursa lui a fost suprascrisa permanent");
  });
  // v91.3: fluxul (tranzactiile ultimelor 15 min) cerea MEREU de la Binance -> pe VVV gol, fara eroare
  const flux = (moneda) => b.ev(`(async()=>{document.getElementById("symbol").value=${JSON.stringify(moneda)};await loadTrueTradeFlow(true);const f=trueFlowState||{};return {n:f.n,err:f.error||null,bursa:f.bursa||null,ecran:document.getElementById("trueFlowN").textContent}})()`);
  await test("fluxul pe BTC ramane de la Binance (neschimbat)", async () => {
    const f = await flux("BTC");
    assert.equal(f.err, null, `eroare: ${f.err}`); assert.ok(f.n > 0, `n: ${f.n}`); assert.equal(f.bursa, "BINANCE");
  });
  await test("fluxul pe VVV (nu e pe Binance) -> tranzactiile de la Pionex futures, scris pe ecran", async () => {
    const f = await flux("VVV");
    assert.equal(f.err, null, `eroare: ${f.err}`); assert.ok(f.n > 0, `n: ${f.n}`); assert.equal(f.bursa, "PIONEX");
    assert.match(f.ecran, /Pionex/, `pe ecran: ${f.ecran}`);
  });
  await test("moneda inexistenta -> mesaj limpede in romana, nu 'Invalid symbol'", async () => {
    const r = await analizeaza(b, "ZQXWV", "BINANCE");
    assert.match(r.stare, /nu există nici pe Binance, nici pe Pionex/i, `stare: ${r.stare}`);
  });
  // v91.6: 26.09 "fa in asa fel ca la actualizare pagina sau app sa ramana in pagina in care se afla"
  const reincarca = async (url = URL_T) => {
    await b.navigheaza(url);
    await asteapta(1500);
    await panaCand(b, `document.readyState==="complete"&&typeof navTo==="function"`, 25000, "aplicatia sa se reincarce");
    await asteapta(2500);   // deep link-ul ruleaza la ~0,9 s dupa incarcare
    return b.ev(`(document.querySelector(".panel.on")||{}).id`);
  };
  await test("pe Tabloul botului + reincarcare -> ramane pe Tabloul botului, cu datele incarcate", async () => {
    await b.ev(`navTo("tabloubot",true);true`);
    assert.equal(await reincarca(), "tabloubot");
    await panaCand(b, `/PERP/.test((document.getElementById("tbSimbol")||{}).textContent||"")`, 30000, "Tabloul sa-si aduca botul dupa reincarcare");
  });
  await test("pe Trading 212 + reincarcare -> ramane pe Trading 212", async () => {
    await b.ev(`navTo("t212",true);true`);
    assert.equal(await reincarca(), "t212");
  });
  await test("inapoi pe Home + reincarcare -> Home (nu ultima pagina de dinainte)", async () => {
    await b.ev(`navTo("dash");true`);
    assert.equal(await reincarca(), "dash");
  });
  await test("linkul cu ?panel= are intaietate fata de pagina tinuta minte", async () => {
    await b.ev(`navTo("tabloubot",true);true`);
    assert.equal(await reincarca(URL_T + "?panel=gridset"), "gridset");
  });

  await test("fara exceptii neprinse in pagina", async () => {
    assert.deepEqual(b.exceptii, []);
  });
} finally {
  b.inchide();
  await stergeProfilul(profil);
}
console.log(`PROBA_ANALIZA ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
