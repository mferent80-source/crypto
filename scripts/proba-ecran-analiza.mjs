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
// v97.4: testele care cer un bot pornit se sar (cu mesaj) cand la Pionex nu e niciunul - nu e o greseala de cod
let areBot = null;
async function test(nume, fn) {
  if (/^(pe Tabloul botului|Tabloul:)/.test(nume) && areBot === false) { console.log(`  SARIT ${nume}
       fără bot activ la Pionex acum`); return; }
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
  areBot = await b.ev(`(async()=>{try{const d=await getJSON("/api/bot-orders");return (d.bots||[]).some(x=>x&&x.activ)}catch(e){return null}})()`);
  if (areBot === false) console.log("  (fără bot activ la Pionex: testele Tabloului care au nevoie de un bot se sar)");
  await test("pe Tabloul botului + reincarcare -> ramane pe Tabloul botului, cu datele incarcate", async () => {
    await b.ev(`navTo("tabloubot",true);true`);
    assert.equal(await reincarca(), "tabloubot");
    await panaCand(b, `/PERP/.test((document.getElementById("tbSimbol")||{}).textContent||"")`, 30000, "Tabloul sa-si aduca botul dupa reincarcare");
  });
  // v91.8: "pune in tablou bot fereastra cu ce spun indicatorii, pe langa grafic" + "poate sa arate si o predictie"
  await test("Tabloul: fereastra 'Ce spun indicatorii' STA LANGA grafic, cu 10 randuri x 4 intervale, verdicte calculate si predictia cu eticheta onesta", async () => {
    await panaCand(b, `document.querySelectorAll("#tbIndicatori .tbIndTab tbody tr").length===10`, 60000, "tabelul de indicatori");
    const r = await b.ev(`(()=>{const g=document.getElementById("tbGraficCard").getBoundingClientRect(),i=document.getElementById("tbIndicatoriCard").getBoundingClientRect();
      const v=[...document.querySelectorAll("#tbIndicatori .tbIndTab tbody tr:first-child td")].slice(1).map(td=>td.textContent);
      return {langa:Math.abs(g.top-i.top)<2&&i.left>g.right-1, coloane:document.querySelectorAll("#tbIndicatori .tbIndTab thead th").length, v,
        pred:(document.querySelector("#tbIndicatori .tbIndPred")||{}).textContent||"", rez:document.getElementById("tbIndicatoriRezumat").textContent, gunoi:/NaN|undefined|null/.test(document.getElementById("tbIndicatoriCard").textContent)}})()`);
    assert.ok(r.langa, "fereastra nu sta langa grafic (la 1440 px)");
    assert.equal(r.coloane, 5); assert.ok(r.v.some((t) => /[↑↓↔] \d+/.test(t)), `niciun verdict calculat: ${r.v}`);
    assert.match(r.pred, /48,8%/); assert.match(r.rez, /Cu botul|Urcă pe/); assert.equal(r.gunoi, false);
  });
  // v91.9: "fa toate 3 si lasa tabelul cum e" - Mediul botului cu date REALE (nu "n-am ..."), tabelul neatins
  await test("Tabloul: 'Mediul botului' are cele 3 randuri cu date reale (miscarea, funding-ul, BTC) si tabelul a ramas cu 10 randuri", async () => {
    await panaCand(b, `document.querySelectorAll("#tbIndicatori .tbMediuR").length===3`, 60000, "Mediul botului");
    const r = await b.ev(`({randuri:[...document.querySelectorAll("#tbIndicatori .tbMediuR")].map(x=>x.textContent), tabel:document.querySelectorAll("#tbIndicatori .tbIndTab tbody tr").length})`);
    assert.equal(r.randuri.length, 3);
    assert.match(r.randuri[0], /^Mișcarea(liniște|mișcare) · 4h \d/); assert.match(r.randuri[1], /^Funding-?\d|^Funding\d/); assert.match(r.randuri[2], /^BTC[↑↓↔]/);
    for (const t of r.randuri) assert.doesNotMatch(t, /n-am/, `rand fara date: ${t}`);
    assert.equal(r.tabel, 10);
  });
  // v91.10: "partea de grafic si tabel vreau sa o urci in pagina si dupa sa apara sugestiile de coinuri"
  await test("Tabloul: ordinea pe ecran = starea botului, grafic + indicatori, sugestiile de monede, ce ai de facut; graficul pe toata latimea", async () => {
    const r = await b.ev(`(()=>{const y=(id)=>{const e=document.getElementById(id);return e?Math.round(e.getBoundingClientRect().top):null};
      const c=document.querySelector("#tabloubot .tbCadru").getBoundingClientRect(),g=document.querySelector("#tabloubot .tbGraficRand").getBoundingClientRect();
      return {sus:y("tbSemaforCard"),grafic:y("tbGraficCard"),idei:y("tbIdei"),todo:y("tbTodo"),directie:y("tbDirectieCard"),lat:Math.round(g.width),cadru:Math.round(c.width)}})()`);
    assert.ok(r.sus < r.grafic && r.grafic < r.idei && r.idei < r.todo, `ordinea: ${JSON.stringify(r)}`);
    assert.ok(r.todo < r.directie, `Directia pietei trebuie sa ramana dupa: ${JSON.stringify(r)}`);
    assert.ok(r.lat >= r.cadru - 2, `graficul + indicatorii nu ocupa toata latimea: ${r.lat} din ${r.cadru}`);
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

  // v92: Home "Piata azi" (demo aprobat 26.09) - contextul general, nu dublura Tabloului
  await test("Home: vremea pietei are verdict, cele 8 carduri au date reale, rezumatele pliate sunt pline, banda de sus e ascunsa", async () => {
    await b.ev(`navTo("dash",true);true`);
    await panaCand(b, `!/Aștept|Aduc|Calculez/.test(document.getElementById("acasa").innerText)&&/AMESTECAT|LINIȘTE|MIȘCARE/.test(document.getElementById("acVremeCrypto").innerText)&&/URCARE|LATERAL|SCADE|FRICĂ/.test(document.getElementById("acVremeBursa").innerText)`, 90000, "Home sa-si aduca datele");
    const r = await b.ev(`({ ids: ["acVremeCrypto","acVremeBursa","acBtc","acFg","acLarg","acNasdaq","acVix","acLargNdx","acMisca","acMiscaNdx","acCalendar","acStiri","acBoti","acT212","acIdei","acMacro","acSectoare","acHarta"].map(id=>[id,(document.getElementById(id).innerText||"").length]),
      sub: [...document.querySelectorAll("#dash .acPlSub")].map(x=>x.textContent), gunoi: /NaN|undefined|null|AUTH_/.test(document.getElementById("acasa").innerText),
      hero: getComputedStyle(document.querySelector(".heroStrip")).display, bara: getComputedStyle(document.querySelector(".toolbar")).display })`);
    for (const [id, n] of r.ids) assert.ok(n > 40, `cardul ${id} e aproape gol (${n} semne)`);
    assert.match(await b.ev(`document.getElementById("acLegatura").innerText`), /BTC și bursa/, "lipseste corelatia BTC - Nasdaq");
    assert.match(await b.ev(`document.getElementById("acNasdaq").innerText`), /Cele 7 mari/, "lipsesc cele 7 mari");
    assert.equal(r.sub.length, 7); for (const x of r.sub) assert.ok(x && x !== "—", `rezumat gol: ${JSON.stringify(r.sub)}`);
    assert.equal(r.gunoi, false); assert.equal(r.hero, "none"); assert.equal(r.bara, "none");
  });
  await test("Home: 'Analiza unei monede' deschisa -> apare bara cu moneda + Analizeaza si graficul; pe alta pagina banda de sus revine", async () => {
    const r = await b.ev(`(()=>{const d=document.getElementById("acPl-moneda");d.open=true;d.dispatchEvent(new Event("toggle"));return new Promise(ok=>setTimeout(()=>ok({bara:getComputedStyle(document.querySelector(".toolbar")).display,
      graf:document.getElementById("chart").getBoundingClientRect().width})),300)})()`);
    assert.notEqual(r.bara, "none", "bara cu Analizeaza nu apare"); assert.ok(r.graf > 200, `graficul are ${r.graf}px`);
    await b.ev(`document.getElementById("acPl-moneda").open=false;navTo("mtf");true`);
    assert.notEqual(await b.ev(`getComputedStyle(document.querySelector(".heroStrip")).display`), "none", "banda de sus a disparut si de pe alte pagini");
  });

  // v95.1: 27.09 "analiza unei monede in pagina home nu are search bar" - bara era afisata, dar SUS in pagina,
  // departe de grupul deschis (proba de mai sus vedea doar display != none). Acum: butonul din antet si bara IN grup, pe ecran.
  await test("Home: butonul 'Analizeaza o moneda' deschide grupul, bara de cautare e IN grup si pe ecran, ETH se analizeaza", async () => {
    await b.ev(`navTo("dash");window.scrollTo(0,0);true`); await asteapta(500);
    await b.ev(`[...document.querySelectorAll("#acasa .acBtn")].find(x=>/Analizează o monedă/.test(x.textContent)).click();true`);
    await asteapta(1200);
    const r = await b.ev(`(()=>{const bar=document.querySelector(".toolbar"),s=document.getElementById("symbol").getBoundingClientRect(),bt=document.getElementById("analyzeBtn").getBoundingClientRect();
      return {inGrup:!!bar.closest("#acPl-moneda"),deschis:document.getElementById("acPl-moneda").open,disp:getComputedStyle(bar).display,
        sTop:s.top,sH:s.height,btTop:bt.top,vh:innerHeight,focus:document.activeElement&&document.activeElement.id}})()`);
    assert.ok(r.deschis, "grupul nu s-a deschis"); assert.ok(r.inGrup, "bara nu e in grupul 'Analiza unei monede'");
    assert.notEqual(r.disp, "none"); assert.ok(r.sH > 10 && r.sTop >= 0 && r.sTop < r.vh, `campul monedei nu e pe ecran: top ${r.sTop}, h ${r.sH}`);
    assert.ok(r.btTop >= 0 && r.btTop < r.vh, `butonul Analizeaza nu e pe ecran: ${r.btTop}`);
    assert.equal(r.focus, "symbol", "cursorul nu e in campul monedei");
    const e = await analizeaza(b, "ETH", "BINANCE");
    assert.doesNotMatch(e.stare, /^Eroare/, `stare: ${e.stare}`); assert.ok(numar(e.pret) > 100, `pret ETH: ${e.pret}`);
  });
  await test("bara se intoarce sus pe celelalte pagini (Scanner/MTF) si revine in grup la intoarcerea pe Home", async () => {
    await b.ev(`navTo("mtf");true`); await asteapta(400);
    const r = await b.ev(`(()=>{const bar=document.querySelector(".toolbar");return {inDash:!!bar.closest("#dash"),disp:getComputedStyle(bar).display}})()`);
    assert.ok(!r.inDash, "bara a ramas prinsa in Home"); assert.notEqual(r.disp, "none", "bara lipseste de pe MTF");
    await b.ev(`navTo("dash");true`); await asteapta(400);
    assert.ok(await b.ev(`!!document.querySelector(".toolbar").closest("#acPl-moneda")`), "la intoarcere bara nu mai e in grup");
    await b.ev(`document.getElementById("acPl-moneda").open=false;true`); await asteapta(300);
    const z = await b.ev(`(()=>{const bar=document.querySelector(".toolbar");return {inDash:!!bar.closest("#dash"),disp:getComputedStyle(bar).display}})()`);
    assert.ok(!z.inDash && z.disp === "none", `grup inchis: bara ${JSON.stringify(z)}`);
  });

  // v96: pagina Scan mixta (crypto + actiuni), demo aprobat 27.09 - pe datele reale ale colectorului
  await test("Scan: lista noua cu Crypto si Actiuni, retetele cu numar, contextul; banda de sus ascunsa; scannerul vechi pliat, cu toate butoanele", async () => {
    await b.ev(`navTo("scan",true);true`);
    await panaCand(b, `document.querySelectorAll("#scLista .scRand").length>=20`, 40000, "randurile scanului");
    const r = await b.ev(`(()=>{const sec=[...document.querySelectorAll("#scLista .scSecL b")].map(x=>x.textContent),rand=[...document.querySelectorAll("#scLista .scRand")],ret=[...document.querySelectorAll("#scRetete .scRet")].map(x=>[x.dataset.scr,+x.querySelector(".n").textContent]);
      return {sec,c:rand.filter(x=>x.dataset.scid[0]==="c").length,a:rand.filter(x=>x.dataset.scid[0]==="a").length,ret,ctx:document.getElementById("scContext").innerText,
        bara:getComputedStyle(document.querySelector(".toolbar")).display,hero:getComputedStyle(document.querySelector(".heroStrip")).display,
        vechi:document.getElementById("scVechi").open,btn:!!document.querySelector("#scVechi #scanActionBtn"),out:!!document.querySelector("#scVechi #scanout")}})()`);
    assert.deepEqual(r.sec, ["Crypto", "Acțiuni"]); assert.equal(r.c, 15); assert.equal(r.a, 15);
    assert.equal(r.ret.length, 6); assert.ok(r.ret[0][1] >= 150, "Toate: " + r.ret[0][1]); assert.ok(r.ret.find((x) => x[0] === "grid")[1] > 0, "rețeta de grid e goală");
    assert.match(r.ctx, /CRYPTO/i); assert.match(r.ctx, /NASDAQ/i); assert.match(r.ctx, /Ce aș face eu/);
    assert.equal(r.bara, "none"); assert.equal(r.hero, "none");
    assert.equal(r.vechi, false); assert.ok(r.btn && r.out, "scannerul vechi a pierdut butonul sau tabelul");
  });
  await test("Scan: reteta 'Bun pentru grid' lasa doar monede; fila Actiuni la grid spune de ce e goala; cautarea gaseste NVDA", async () => {
    await b.ev(`document.querySelector('#scRetete [data-scr="grid"]').click();true`); await asteapta(200);
    const g = await b.ev(`[...document.querySelectorAll("#scLista .scRand")].map(x=>x.dataset.scid[0]).join("")`);
    assert.ok(g.length > 0 && /^c+$/.test(g), "la grid au apărut și acțiuni: " + g);
    await b.ev(`document.querySelector('#scFile [data-scf="a"]').click();true`); await asteapta(200);
    assert.match(await b.ev(`document.getElementById("scExplic").innerText`), /doar pentru monede/);
    await b.ev(`document.querySelector('#scRetete [data-scr="toate"]').click();document.querySelector('#scFile [data-scf="toate"]').click();{const c=document.getElementById("scCaut");c.value="NVDA";c.dispatchEvent(new Event("input",{bubbles:true}))}true`); await asteapta(200);
    assert.deepEqual(await b.ev(`[...document.querySelectorAll("#scLista .scRand")].map(x=>x.dataset.scid)`), ["aNVDA"]);
    await b.ev(`{const c=document.getElementById("scCaut");c.value="";c.dispatchEvent(new Event("input",{bubbles:true}))}true`);
  });
  await test("Scan: click pe o moneda si pe o actiune -> nume, 'Acum', graficul, tabelul pe 7 perioade; 1A schimba graficul; cursorul arata pretul", async () => {
    for (const id of ["cBTC", "aNVDA"]) {
      await b.ev(`{const c=document.getElementById("scCaut");c.value="${id.slice(1)}";c.dispatchEvent(new Event("input",{bubbles:true}))}scanSt.deschis=null;scanDeseneaza();document.querySelector('.scRand[data-scid="${id}"]').click();true`);
      await panaCand(b, `!!document.getElementById("scGrafSvg")&&document.querySelectorAll(".scStari tbody tr").length===7`, 60000, "graficul " + id);   // 60 s: dupa multe cereri Pionex la rand, coada serverului le intarzie
      const r = await b.ev(`(()=>({cine:document.querySelector(".scCine").innerText,acum:document.querySelector(".scAcum").innerText,eti:document.getElementById("scGrafEti").innerText,plan:document.querySelector(".scDetDr").innerText}))()`);
      assert.match(r.cine, id === "cBTC" ? /Bitcoin/ : /NVIDIA/i, "numele: " + r.cine); assert.match(r.acum, /^Acum: pe o săptămână/); assert.match(r.eti, /în 1 lună/);
      assert.match(r.plan, /Stop/); if (id === "cBTC") assert.match(r.plan, /Funding/);
      await b.ev(`document.querySelector('.scPer [data-scper="1A"]').click();true`); await asteapta(200);
      assert.match(await b.ev(`document.getElementById("scGrafEti").innerText`), /în 1 an/);
      const cur = await b.ev(`(()=>{const s=document.getElementById("scGrafSvg"),r=s.getBoundingClientRect();s.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,clientX:r.left+r.width*0.3,clientY:r.top+40}));return {e:document.getElementById("scGrafEti").innerText,v:document.getElementById("scGrafCur").getAttribute("visibility")}})()`);
      assert.equal(cur.v, "visible"); assert.doesNotMatch(cur.e, /în 1 an/, "eticheta cursorului n-a arătat data");
      await b.ev(`scanSt.per="1L";true`);
    }
  });
  // v96.1: fara cheia Twelve Data, analiza actiunilor ia preturile de la Yahoo (inainte: "TWELVE_DATA_API_KEY is not configured")
  for (const [id, cls] of [["aNVDA", "STOCKS"], ["cETH", "CRYPTO"]]) await test(`Scan: 'Analiza completa' pe ${id.slice(1)} duce la analiza ei pe Home (${cls}), cu pretul, fara eroare`, async () => {
    await b.ev(`{const c=document.getElementById("scCaut");c.value="${id.slice(1)}";c.dispatchEvent(new Event("input",{bubbles:true}))}scanSt.deschis="${id}";scanDeseneaza();window.__radarState=null;document.querySelector('[data-scanaliza="${id}"]').click();true`); await asteapta(600);
    await panaCand(b, `!document.getElementById("analyzeBtn").disabled&&!!window.__radarState`, 90000, "analiza " + id);
    const r = await b.ev(`({pag:document.getElementById("dash").classList.contains("on"),sim:document.getElementById("symbol").value,cls:document.getElementById("assetClass").value,deschis:document.getElementById("acPl-moneda").open,st:document.getElementById("status").textContent,sym:window.__radarState.symbol,pret:window.__radarState.q&&window.__radarState.q.price})`);
    assert.ok(r.pag, "nu e pe Home"); assert.equal(r.sim, id.slice(1)); assert.equal(r.cls, cls); assert.ok(r.deschis, "grupul analizei nu s-a deschis");
    assert.doesNotMatch(r.st, /^Eroare/, r.st); assert.match(r.sym, new RegExp(id.slice(1))); assert.ok(Number(r.pret) > 10, "pret: " + r.pret);
    await b.ev(`document.getElementById("acPl-moneda").open=false;setAssetClass("CRYPTO");document.getElementById("symbol").value="BTC";navTo("scan");{const c=document.getElementById("scCaut");c.value="";c.dispatchEvent(new Event("input",{bubbles:true}))}true`);
  });
  // v96.2: cat a mers reteta in trecut (colectorul) + "Anunta-ma" (lista pe server; proba o lasa cum a gasit-o)
  await test("Scan: reteta 'Trend confirmat' arata istoricul pe Crypto si pe Actiuni, cu 'orice zi' alaturi; la grid spune de ce nu se poate", async () => {
    await b.ev(`navTo("scan");scanPorneste(true);true`);
    await panaCand(b, `!!(scanSt.d.scan&&scanSt.d.scan.istoric&&scanSt.d.scan.istoric.c&&scanSt.d.scan.istoric.a)`, 30000, "istoricul retetelor");
    await b.ev(`document.querySelector('#scRetete [data-scr="trend"]').click();true`); await asteapta(200);
    const t = await b.ev(`document.getElementById("scExplic").innerText`);
    assert.match(t, /În trecut/); assert.match(t, /Crypto · \d+ intrări/); assert.match(t, /Acțiuni · \d+ intrări/); assert.match(t, /după o săptămână \d+% pe plus/); assert.match(t, /orice zi: \d+%/);
    await b.ev(`document.querySelector('#scRetete [data-scr="grid"]').click();true`); await asteapta(200);
    assert.match(await b.ev(`document.getElementById("scExplic").innerText`), /nu se poate măsura în urmă/);
    await b.ev(`document.querySelector('#scRetete [data-scr="toate"]').click();true`);
  });
  await test("Scan: 'Anunta-ma' pe NVDA pune 🔔 pe rand, lista se salveaza pe server; 'Nu mai anunta' o scoate (proba nu lasa nimic)", async () => {
    const aveam = await b.ev(`(scanSt.d.scan.urmarite||[]).indexOf("aNVDA")>=0`);
    const apasa = () => b.ev(`{const c=document.getElementById("scCaut");c.value="NVDA";c.dispatchEvent(new Event("input",{bubbles:true}))}scanSt.deschis="aNVDA";scanDeseneaza();document.querySelector('[data-scurm="aNVDA"]').click();true`);
    const stare = () => b.ev(`(async()=>{const g=await getJSON("/api/istoric-bot?action=scan&doar=urmarite");return {srv:g.urmarite.indexOf("aNVDA")>=0,mk:/🔔/.test(document.querySelector('.scRand[data-scid="aNVDA"]').innerText),btn:document.querySelector('[data-scurm="aNVDA"]').innerText}})()`);
    await apasa(); await asteapta(1500);
    const s1 = await stare(); assert.equal(s1.srv, !aveam); assert.equal(s1.mk, !aveam); assert.match(s1.btn, aveam ? /Anunță-mă/ : /Nu mai anunța/);
    await apasa(); await asteapta(1500);
    const s2 = await stare(); assert.equal(s2.srv, aveam, "proba a lăsat lista schimbată"); assert.equal(s2.mk, aveam);
    await b.ev(`{const c=document.getElementById("scCaut");c.value="";c.dispatchEvent(new Event("input",{bubbles:true}))}scanSt.deschis=null;true`);
  });

  // v97.2 (ideea 4): din Scan, "Grid: ce setez?" pe o moneda buna de grid -> fisa cu planul completat dupa planul lui
  await test("Scan -> 'Grid: ce setez?' pe o moneda de grid: fisa ei, cu planul (plus / minus / ore) completat si nota 'Venit din Scan'", async () => {
    await b.ev(`navTo("scan");document.querySelector('#scRetete [data-scr="grid"]').click();true`); await asteapta(300);
    const id = await b.ev(`document.querySelector("#scLista .scRand").dataset.scid`); assert.match(id, /^c/);
    await b.ev(`scanSt.deschis="${id}";scanDeseneaza();document.querySelector('[data-scgrid]').click();true`);
    await panaCand(b, `document.getElementById("gridset").classList.contains("on")&&!!document.querySelector(".grDinScan")&&!!document.getElementById("grPlanPlus")`, 90000, "fisa de grid cu planul");
    const r = await b.ev(`({mon:document.getElementById("grMoneda").value,plus:document.getElementById("grPlanPlus").value,minus:document.getElementById("grPlanMinus").value,ore:document.getElementById("grPlanAfara").value,nota:document.querySelector(".grDinScan").innerText})`);
    assert.equal(r.mon.toUpperCase(), id.slice(1)); assert.ok(Number(r.plus.replace(",", ".")) > 0, "plus: " + r.plus); assert.ok(Number(r.minus.replace(",", ".")) > 0, "minus: " + r.minus);
    assert.match(r.nota, /Venit din Scan/); assert.match(r.nota, /ținta devine podea/);
    // ce scrie el ramane la redesenare
    await b.ev(`document.getElementById("grPlanPlus").value="7";renderGrid();true`); await asteapta(300);
    assert.equal(await b.ev(`document.getElementById("grPlanPlus").value`), "7", "redesenarea i-a șters cifra");
    await b.ev(`window.grDinScan=null;navTo("scan");document.querySelector('#scRetete [data-scr="toate"]').click();scanSt.deschis=null;true`);
  });

  // v97.3 (27.09: "apăs pe Fișa și mă duce aiurea, fără nimic legat de moneda respectivă"): butonul Fișa din Tablou
  // ("Pe ce aș porni un bot acum") -> fisa ACELEI monede, pe ecran; niciodata fisa altei monede sub numele ei
  await test("Tablou -> 'Fisa' pe o moneda propusa: pagina de grid cu fisa EI (nu a botului), verdictul pe ecran", async () => {
    await b.ev(`navTo("tabloubot",true);true`);
    await panaCand(b, `[...document.querySelectorAll("#tbIdei button")].some(x=>/^Fi[șs]a$/.test(x.textContent.trim()))`, 60000, "ideile de boti cu butonul Fisa");
    const m = await b.ev(`(()=>{const x=[...document.querySelectorAll("#tbIdei button")].find(x=>/^Fi[șs]a$/.test(x.textContent.trim()));x.click();return /'([^']+)'/.exec(x.dataset.actionClick)[1]})()`);
    await asteapta(400);
    const intai = await b.ev(`({f:grStare.fisa&&grStare.fisa.simbol,txt:document.getElementById("grFisa").innerText.slice(0,120)})`);
    if (intai.f && intai.f !== m + "_USDT_PERP") assert.match(intai.txt, new RegExp("Calculez fișa pentru " + m), "a arătat fișa altei monede: " + intai.f);
    await panaCand(b, `grStare.fisa&&grStare.fisa.simbol===${JSON.stringify(m + "_USDT_PERP")}&&!grStare.inLucru`, 90000, "fisa monedei " + m);
    await asteapta(900);
    const r = await b.ev(`(()=>{const v=document.querySelector("#grFisa .grVerdict"),q=v.getBoundingClientRect();return {pag:document.getElementById("gridset").classList.contains("on"),mon:document.getElementById("grMoneda").value,top:q.top,h:innerHeight}})()`);
    assert.ok(r.pag); assert.equal(r.mon, m); assert.ok(r.top >= 0 && r.top < r.h * 0.8, "verdictul fișei nu e pe ecran: top " + r.top);
  });

  // v97.4 (27.09: "leagă pagina Alerts cu boții și stocks, să apară și acolo automat")
  await test("Alerts: alertele de acasa apar singure (boti, actiuni, piata), filtrele si 'Doar importante' merg, butonul duce la pagina lor", async () => {
    await b.ev(`try{localStorage.setItem("alCentruVazutLa","0")}catch(e){};alCentruPorneste(true);true`); await asteapta(1500);
    const nou = await b.ev(`alCentruNecitite()`); assert.ok(nou > 0, "nicio alertă necitită"); 
    assert.ok((await b.ev(`Number(document.getElementById("sideAlertCount").textContent)`)) >= nou, "insigna din meniu nu le numără");
    await b.ev(`navTo("alerts");true`);
    await panaCand(b, `document.querySelectorAll("#alCentru .alRand").length>0`, 20000, "alertele de acasa pe pagina");
    const r = await b.ev(`(()=>{const f=[...document.querySelectorAll("#alCentru .alFila")].map(x=>x.innerText),n=document.querySelectorAll("#alCentru .alRand").length;return {f,n,zi:document.querySelector("#alCentru .alZi").innerText,vechi:!!document.getElementById("alertList")}})()`);
    assert.equal(r.f.length, 4); assert.match(r.f[1], /Boți și crypto \d+/); assert.match(r.f[2], /Acțiuni \d+/); assert.ok(r.vechi, "lista veche a dispărut");
    await b.ev(`document.querySelector('#alCentru [data-alf="actiuni"]').click();true`); await asteapta(200);
    const act = await b.ev(`[...document.querySelectorAll("#alCentru .alRand .alMeta")].map(x=>x.innerText)`);
    assert.ok(act.every((t) => /Acțiuni/.test(t)), "la Acțiuni au apărut și altele: " + act.join(" | "));
    await b.ev(`document.getElementById("alImp").click();true`); await asteapta(200);
    assert.ok(await b.ev(`[...document.querySelectorAll("#alCentru .alRand")].every(x=>/atentie|critic/.test(x.className))`), "«doar importante» lasă și info");
    await b.ev(`document.getElementById("alImp").click();document.querySelector('#alCentru [data-alf="boti"]').click();true`); await asteapta(200);
    await b.ev(`document.querySelector('#alCentru .alRand [data-alpag]').click();true`); await asteapta(600);
    assert.ok(await b.ev(`document.getElementById("tabloubot").classList.contains("on")`), "alerta de bot nu duce la Tablou");
    assert.equal(await b.ev(`alCentruNecitite()`), 0, "după ce le-a văzut, rămân necitite");
    await b.ev(`document.querySelector('#alCentru [data-alf="toate"]').click();true`);
  });

  // v97.6 (27.09, ICP pornit fara plan): botul fara plan -> banner sus in Tablou, cu propunerea dupa planul lui cel mai nou;
  // "Pune planul propus" completeaza campurile si salveaza (aici salvarea e prinsa, nu ajunge pe server)
  await test("Tablou: botul fara plan -> banner cu propunerea (planul lui cel mai nou, scalat) si 'Pune planul propus' completeaza + salveaza", async () => {
    await b.ev(`navTo("tabloubot");window.__salvat=null;window.__tbPS=tbPlanSalveaza;tbPlanSalveaza=async function(){window.__salvat={plus:document.getElementById("tbPlanPlus").value,minus:document.getElementById("tbPlanMinus").value,ore:document.getElementById("tbPlanAfara").value}};
      window.__botProba={id:"proba-976",baza:"ICP.PERP",quote:"USDT",investit:96.63,directie:"long",pretCurent:3.2,gridJos:3.0,gridSus:3.4,distantaLichidarePct:36,profitTotal:-0.3,activ:true};
      tbPlan={botId:"proba-976",plan:null,la:Date.now()};tbPropPlan={botId:null,p:null,inLucru:false};["tbPlanPlus","tbPlanMinus","tbPlanAfara"].forEach(function(i){document.getElementById(i).value=""});
      tbDeseneazaSemafor(window.__botProba);true`);
    await panaCand(b, `(()=>{tbDeseneazaSemafor(window.__botProba);const e=document.querySelector("#tbSemafor .tbFaraPlan");return !!e&&/Propun/.test(e.innerText)})()`, 20000, "bannerul cu propunerea");
    // propunerea asteptata = planul lui cel mai nou (de pe server), scalat la 96,63 USDT - calculata aici la fel
    const ast = await b.ev(`(async()=>{const u=await getJSON("/api/istoric-bot?action=ultimulPlan");if(!u.plan)return TabloExtra.propunePlan(null,96.63);const f=await getJSON("/api/bot-orders?status=finished&limit=30"),a=await getJSON("/api/bot-orders"),x=(f.bots||[]).concat(a.bots||[]).find(y=>String(y.id)===String(u.bot));return TabloExtra.propunePlan({plus:u.plan.plus,minus:u.plan.minus,afaraOre:u.plan.afaraOre,investit:x?x.investit:null,nume:x?String(x.baza).replace(/\.PERP$/,""):null},96.63)})()`);
    const v = (n) => String(n).replace(".", ","), t = await b.ev(`document.querySelector("#tbSemafor .tbFaraPlan").innerText`);
    assert.match(t, /ICP n-are plan/); assert.ok(t.includes("+" + v(ast.plus) + " USDT") && t.includes("−" + v(ast.minus) + " USDT") && t.includes(ast.afaraOre + " h"), "propunerea: " + t);
    assert.doesNotMatch(t, /botul de dinainte/, "numele botului cu planul n-a fost găsit");
    await b.ev(`document.querySelector("#tbSemafor .tbFaraPlan button").click();true`); await asteapta(300);
    assert.deepEqual(await b.ev(`window.__salvat`), { plus: v(ast.plus), minus: v(ast.minus), ore: String(ast.afaraOre) });
    await b.ev(`tbPlanSalveaza=window.__tbPS;tbPlan={botId:null,plan:null,la:0};["tbPlanPlus","tbPlanMinus","tbPlanAfara"].forEach(function(i){document.getElementById(i).value=""});true`);
  });

  // v97.8: Tabloul fara bot -> pregatirea urmatorului (ultimul bot inchis cu fisa lui, vremea, 3 monede de grid cu Fisa)
  await test("Tablou fara bot: pregatirea urmatorului - fisa de inchidere a ultimului bot, vremea, 3 monede 'Bun pentru grid' cu Fisa", async () => {
    await b.ev(`navTo("tabloubot");tbPreg={la:0,inLucru:false,fisa:null,vreme:null,grid:null};tbPregatire(document.getElementById("tbSemafor"));true`);
    await panaCand(b, `!tbPreg.inLucru&&tbPreg.la>0`, 60000, "datele pregatirii");
    await b.ev(`tbPregatire(document.getElementById("tbSemafor"));true`);
    const r = await b.ev(`(()=>{const e=document.querySelector("#tbSemafor .tbPreg");return {t:e.innerText,fise:e.querySelectorAll("button[data-action-click^='gridDeschideMoneda']").length}})()`);
    assert.match(r.t, /FĂRĂ BOT/); assert.match(r.t, /Ultimul bot închis/i); assert.match(r.t, /De ce: /); assert.match(r.t, /Vremea pieței/i);
    assert.ok(r.fise >= 1 && r.fise <= 3, "butoane Fișa: " + r.fise);
    await b.ev(`if(tbStare.bot)tbDeseneazaSemafor(tbStare.bot);true`);
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
