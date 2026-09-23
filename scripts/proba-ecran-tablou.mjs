// PROBA DE ECRAN - Tabloul botului (Task 8), Chrome real prin CDP.
//
// De ce exista: un revizor a cautat cu grep dupa tbAduDate/tbPorneWs/tbStare/
// tbSchimbaModul in toate fisierele de proba - ZERO rezultate. Nicio reparatie
// din public/app.js nu era pazita de nimic. Proba veche din brief ("zero
// exceptii, 7 masuri, verdict nevid") ar fi trecut linistita peste toate cele
// 12 defecte gasite azi la revizii, fiindca nu asearteaza NICIO purtare
// anume - doar ca ecranul nu crapa.
//
// Ce face proba asta: deschide pagina intr-un Chrome adevarat, injecteaza
// (INAINTE de orice script al paginii) un fetch() si un WebSocket falsi, ca
// sa poata forta exact starile cerute de fiecare defect - un raspuns cu bots
// care nu e lista, o retea picata, un tick de pret, o schimbare de simbol -
// fara sa aiba nevoie de cont Pionex real sau de .dev.vars. Fiecare scenariu
// citeste DOM-ul REAL produs de functiile REPARATE (renderTabloBot, tbAduDate,
// tbSchimbaModul, tbPorneWs) - nu simuleaza logica lor separat.
//
// CAPCANA platita azi de un revizor: service worker-ul face clients.claim()
// si serveste /app.js si /index.html din CACHE, inaintea retelei. Fara
// Network.setBypassServiceWorker + o stocare curata la pornire, proba ar
// masura fisiere VECHI si ar trece degeaba. Vezi porneste() mai jos.
//
// Rulare (are nevoie de server pe :8788 - PORNESTE-CRYPTO-RADAR.bat - si de
// Chrome sau Edge instalat local; NU intra in `npm test`):
//   node scripts/proba-ecran-tablou.mjs [url] [token] [dosarProfil] [--doar=text]
//
// `token` nu e folosit de scenariile mocked (ele nu ating deloc reteaua reala
// de la Pionex) - e primit doar ca sa pastreze semnatura ceruta in brief; se
// scrie in sessionStorage pentru cazul in care cineva vrea sa il citeasca
// manual din consola browserului.

import { spawn } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const URL_T = (process.argv[2] || "http://127.0.0.1:8788/").replace(/\/+$/, "") + "/";
const TOKEN = process.argv[3] || "";
const DOSAR_CERUT = process.argv[4] && !process.argv[4].startsWith("--") ? process.argv[4] : null;
const DOAR = (process.argv.find((x) => x.startsWith("--doar=")) || "").slice(7).toLowerCase();

const CANDIDATI_BROWSER = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const BROWSER = CANDIDATI_BROWSER.find((c) => existsSync(c));

const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── scriptul injectat INAINTE de orice script al paginii ─────────────────
   fetch() fals pentru /api/bot-orders si /api/market (restul trece la reteaua
   adevarata), WebSocket fals (nu deschide nicio conexiune reala catre
   Binance - proba trebuie sa fie determinista, nu sa astepte piata) si un
   spion pe localStorage.setItem, ca sa se poata masura "zero scrieri". */
const BOOTSTRAP = `(() => {
  if (window.__proba) return;
  const fetchNativ = window.fetch.bind(window);
  window.__proba = {
    botOrders: null, market: null,
    calls: { botOrders: 0, market: 0 },
    wsInstante: [],
    setItemLog: [],
    blocheazaScriereaPentru: null,
  };
  window.fetch = function (intrare, optiuni) {
    const url = typeof intrare === "string" ? intrare : (intrare && intrare.url) || String(intrare);
    const potriveste = (nume) => new RegExp("/api/" + nume).test(url);
    for (const nume of ["bot-orders", "market"]) {
      if (!potriveste(nume)) continue;
      window.__proba.calls[nume === "bot-orders" ? "botOrders" : "market"]++;
      const cfg = window.__proba[nume === "bot-orders" ? "botOrders" : "market"];
      if (!cfg) break;
      if (cfg.reteaPicata) return Promise.reject(new TypeError("proba: reteaua a picat"));
      return Promise.resolve(new Response(JSON.stringify(cfg.corp), {
        status: cfg.stare || 200, headers: { "content-type": "application/json" },
      }));
    }
    return fetchNativ(intrare, optiuni);
  };
  // CAPCANA #2, gasita chiar de proba asta: app.js inregistreaza sw.js, care
  // face clients.claim() la activare - asta trage un "controllerchange" pe
  // pagina, iar app.js asculta acel eveniment cu location.reload(). Fara sa
  // oprim inregistrarea, la ~1s de la incarcare toata starea injectata aici
  // (mock-uri, tbStare) dispare intr-un reload spontan, in mijlocul probei.
  if (navigator.serviceWorker) {
    try { navigator.serviceWorker.register = () => Promise.reject(new Error("proba: sw dezactivat")); } catch {}
  }
  class FereastraFalsa {
    constructor(url) {
      this.url = url; this.readyState = 1;
      window.__proba.wsInstante.push(this);
      setTimeout(() => { if (this.onopen) this.onopen({}); }, 0);
    }
    send() {}
    close() { this.readyState = 3; if (this.onclose) this.onclose({}); }
  }
  window.WebSocket = FereastraFalsa;
  window.__probaTrimiteTick = (pret) => {
    const inst = window.__proba.wsInstante[window.__proba.wsInstante.length - 1];
    if (inst && inst.onmessage) { inst.onmessage({ data: JSON.stringify({ p: String(pret) }) }); return true; }
    return false;
  };
  const setItemNativ = Storage.prototype.setItem;
  Storage.prototype.setItem = function (cheie, val) {
    if (this === window.localStorage) {
      window.__proba.setItemLog.push(cheie);
      if (window.__proba.blocheazaScriereaPentru === cheie)
        throw new Error("proba: stocare blocata pentru " + cheie);
    }
    return setItemNativ.call(this, cheie, val);
  };
})();`;

/* ── browser prin CDP ──────────────────────────────────────────────────── */
async function porneste(lat, inal, profil) {
  const port = 9600 + Math.floor(Math.random() * 300);
  const proc = spawn(BROWSER, [
    "--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`,
    `--user-data-dir=${profil}`, `--window-size=${lat},${inal}`,
    "--no-first-run", "--no-default-browser-check", "--disable-features=Translate",
    "about:blank",
  ], { stdio: "ignore" });

  let tinta;
  for (let i = 0; i < 80 && !tinta; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      tinta = lista.find((x) => x.type === "page");
    } catch { /* inca nu a pornit */ }
    if (!tinta) await asteapta(250);
  }
  if (!tinta) { try { proc.kill(); } catch {} throw new Error("browserul nu a pornit"); }

  const ws = new WebSocket(tinta.webSocketDebuggerUrl);
  let id = 0;
  const astept = new Map();
  const exceptii = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && astept.has(m.id)) { astept.get(m.id)(m.result); astept.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      exceptii.push(String(d?.exception?.description ?? d?.text ?? "exceptie necunoscuta").slice(0, 300));
    }
  };
  await new Promise((r) => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise((res) => {
    const n = ++id; astept.set(n, res); ws.send(JSON.stringify({ id: n, method, params }));
  });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");
  // CAPCANA service worker-ului: fara asta, proba citeste app.js/index.html
  // vechi din cache si "reparatiile" par sa nu existe.
  await send("Network.setBypassServiceWorker", { bypass: true });
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  try {
    await send("Storage.clearDataForOrigin", { origin: new URL(URL_T).origin, storageTypes: "all" });
  } catch { /* originea inca nu exista in profilul asta - nu e fatal */ }
  await send("Page.addScriptToEvaluateOnNewDocument", { source: BOOTSTRAP });
  await send("Emulation.setDeviceMetricsOverride", { width: lat, height: inal, deviceScaleFactor: 1, mobile: false });

  return {
    exceptii,
    async ev(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r?.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error("evaluare picata: " + String(d?.exception?.description ?? d?.text ?? JSON.stringify(d)).slice(0, 300));
      }
      return r?.result?.value;
    },
    async navigheaza(url) { await send("Page.navigate", { url }); },
    inchide() { try { ws.close(); } catch {} try { proc.kill(); } catch {} },
  };
}

async function asteaptaAplicatia(b, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let gata = false;
    try {
      gata = await b.ev(
        `document.readyState==="complete"&&typeof navTo==="function"&&typeof tbAduDate==="function"&&typeof TabloBot!=="undefined"`
      );
    } catch { /* context inca nu e gata */ }
    if (gata) return true;
    await asteapta(300);
  }
  return false;
}

/* ── date de proba (boti si lumanari, nu conteaza contul real) ────────── */
function botBrut(over = {}) {
  const baza = over.baza || "ADA.PERP", quote = over.quote || "USDT";
  const strategyId = over.strategyId === undefined ? "8001" : over.strategyId;
  const createTime = over.createTime || (Date.now() - 5 * 3600000);
  return {
    strategyId, base: baza, quote, createTime,
    buOrderData: Object.assign({
      status: "running", bottom: "0.30", top: "0.34", row: 20,
      trend: "long", leverage: 3, position: "1000",
      gridProfit: "5.00", totalFee: "-0.40", totalRealizedProfit: "4.50",
      exchangeOrderPairedCount: 42,
      estimateLiquidationPriceDown: "0.20", estimateLiquidationPriceUp: "0",
      riskStatus: "TRADING", marginStatus: "NORMAL",
    }, over.buOrderData || {}),
  };
}
function botNormalizat(brut, over = {}) {
  const x = brut.buOrderData;
  return Object.assign({
    id: brut.strategyId != null ? String(brut.strategyId) : "",
    simbol: brut.base + "/" + brut.quote,
    baza: brut.base, quote: brut.quote,
    activ: String(x.status || "").toLowerCase() === "running",
    pornitLa: brut.createTime,
    gridJos: Number(x.bottom), gridSus: Number(x.top),
    distantaLichidarePct: 33,
    pretCurent: Number(x.bottom) + 0.02,
    profitNet: Number(x.totalRealizedProfit), gridProfitBrut: Number(x.gridProfit),
    comisioane: Number(x.totalFee),
    ordinePerechi: x.exchangeOrderPairedCount,
    brut,
  }, over);
}
// lumanari chiar reale in forma (mai putine cheltuieli de proba): urcare
// lina intre 0.30 si 0.32, ca ultimul pret sa cada in mijlocul intervalului
// grid-ului de mai sus.
function lumanariCorpMock(n = 60) {
  const chron = [];
  const t0 = Date.now() - n * 300000; // lumanari de 5 minute
  for (let i = 0; i < n; i++) {
    const c = 0.30 + i * 0.00035;
    chron.push({
      time: t0 + i * 300000,
      open: (c - 0.00005).toFixed(6), high: (c + 0.00005).toFixed(6), low: (c - 0.00005).toFixed(6),
      close: c.toFixed(6), volume: "100",
    });
  }
  // clientul sorteaza dupa `time` (Task 7 al revizei finale) - trimitem "cel
  // mai nou primul", cum vine de la o bursa reala, ca sa exercitam sortarea.
  return { data: { klines: chron.slice().reverse() } };
}

// Injecteaza istoric "copt" (>=30 minute) direct in localStorage, cu cheia pe
// care tbAduDate() o citeste - unele verdicte (OPRESTE/PAZESTE/REGLEAZA) cer
// istoricMin>=30 si nu se poate astepta timp real intr-o proba determinista.
async function seedIstoricCopt(b, id, minute, pretPerp) {
  const cheie = "tabloBotIstoric_v1_" + String(id);
  await b.ev(`(() => {
    const acum = Date.now(), arr = [];
    for (let m = ${minute}; m >= 1; m--) arr.push({ t: acum - m * 60000, perechi: 0, pretPerp: ${pretPerp}, pretSpot: ${pretPerp} });
    localStorage.setItem(${JSON.stringify(cheie)}, JSON.stringify(arr));
  })()`);
}

async function seteazaMock(b, cheie, valoare) {
  await b.ev(`window.__proba.${cheie} = ${JSON.stringify(valoare)};`);
}

async function celula(b, i) {
  return b.ev(`(() => {
    const el = document.querySelectorAll('#tbMasuri .accountRow')[${i}];
    if (!el) return null;
    const c = el.querySelectorAll('.accountCell');
    return { nume: c[0]?.textContent.trim(), valoare: c[1]?.textContent.trim(), stare: c[2]?.textContent.trim() };
  })()`);
}
async function textEl(b, id) {
  return b.ev(`document.getElementById(${JSON.stringify(id)})?.textContent?.trim() ?? null`);
}
async function toasturi(b) {
  return b.ev(`[...document.querySelectorAll('#toastHost .toast')].map(x=>({t:x.textContent,c:x.className}))`);
}

/* ── harnasul de teste, in stilul scripts/tablou-bot-v73.mjs ─────────────── */
let ok = 0, picate = 0;
const raportate = [];
function test(nume, fn) {
  if (DOAR && !nume.toLowerCase().includes(DOAR)) return Promise.resolve();
  return Promise.resolve().then(fn).then(
    () => { ok++; raportate.push({ nume, stare: "ok" }); console.log(`  ok   ${nume}`); },
    (e) => { picate++; raportate.push({ nume, stare: "PICA", motiv: e.message });
      console.log(`  PICA ${nume}\n       ${e.message}`); }
  );
}

async function main() {
  if (!BROWSER) {
    console.error("Nu gasesc Chrome sau Edge instalat - proba nu poate porni.");
    process.exit(2);
  }
  try {
    await fetch(URL_T, { signal: AbortSignal.timeout(4000) });
  } catch {
    console.error(`Serverul nu raspunde pe ${URL_T}. Porneste PORNESTE-CRYPTO-RADAR.bat si reia.`);
    process.exit(2);
  }

  const profil = DOSAR_CERUT || `${process.env.TEMP || "."}/tablou-bot-proba-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const b = await porneste(390, 900, profil);

  try {
    console.log(`\nPROBA DE ECRAN - Tabloul botului · ${URL_T}\n`);
    await b.navigheaza(URL_T);
    if (!(await asteaptaAplicatia(b))) throw new Error("aplicatia nu s-a incarcat in timp util");
    if (TOKEN) await b.ev(`try{sessionStorage.setItem("cryptoRadarApiTokenV54",${JSON.stringify(TOKEN)})}catch(e){}`);

    /* ═══ bot sanatos, folosit ca stare de start pentru mai multe scenarii ═══ */
    async function incarcaBotSanatos(over = {}) {
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut(Object.assign({ strategyId: "8001", baza: "ADA.PERP", quote: "USDT" }, over)))] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
    }

    await test("incarcarea initiala: zero exceptii, sapte masuri, verdict nevid, badge v74.5", async () => {
      await incarcaBotSanatos();
      await b.ev(`navTo('tabloubot', true)`);
      await asteapta(600);
      await b.ev(`opresteTabloBot()`); // oprim ceasul de 8s - de-acum controlam noi fiecare apel
      const NIVELE = ["FARA_BOT", "NEDOVEDIT", "OPRESTE", "PAZESTE", "REGLEAZA", "OPORTUNITATE", "LINISTE", "EROARE"];
      const nivel = await textEl(b, "tbNivel");
      const titlu = await textEl(b, "tbTitlu");
      const rigla = await textEl(b, "tbRigla");
      const mod = await textEl(b, "tbMod");
      const masuri = await b.ev(`document.querySelectorAll('#tbMasuri .accountRow').length`);
      assert.deepEqual(b.exceptii, [], `exceptii in pagina: ${b.exceptii.join(" | ")}`);
      assert.ok(NIVELE.includes(nivel), `nivel necunoscut sau gol: ${nivel}`);
      assert.equal(masuri, 7, `asteptam 7 masuri, am ${masuri}`);
      assert.match(String(mod), /GRID|DIRECTIONAL/, `mod: ${mod}`);
      assert.ok(titlu && titlu !== "—", "titlul verdictului e gol");
      assert.ok(rigla, "rigla intervalului nu a randat nimic");
      // textContent, nu innerText: badge-ul de build sta in sidebar-ul care e
      // ascuns la 390px (latimea de telefon folosita de proba) - innerText
      // sare peste text ascuns, textContent nu.
      const areBadge = await b.ev(`document.body.textContent.includes('v74.5 · TABLOUL BOTULUI')`);
      assert.ok(areBadge, "badge-ul v74.5 · TABLOUL BOTULUI nu apare pe pagina");
    });

    await test("fara bot in cont: FARA_BOT, tot 7 masuri, rigla spune asta", async () => {
      await seteazaMock(b, "botOrders", { corp: { bots: [] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      const nivel = await textEl(b, "tbNivel");
      const masuri = await b.ev(`document.querySelectorAll('#tbMasuri .accountRow').length`);
      const rigla = await textEl(b, "tbRigla");
      assert.equal(nivel, "FARA_BOT");
      assert.equal(masuri, 7);
      assert.match(String(rigla), /f[ăa]r[ăa] bot/i, `rigla nu spune "fara bot": ${rigla}`);
    });

    /* ═══ 1. Pretul invechit ══════════════════════════════════════════════
       Defect pazit: pretul putea ingheta pe veci si era aratat ca viu. */
    await test("1. pretul vechi de peste un minut se marcheaza (invechit) si basis-ul devine nu-se-poate", async () => {
      await incarcaBotSanatos({ strategyId: "8101", baza: "ADA.PERP" });
      const primit = await b.ev(`window.__probaTrimiteTick("0.321")`);
      assert.ok(primit, "nu am gasit niciun WebSocket fals ca sa trimit un tick");
      await b.ev(`renderTabloBot()`);
      const pretProaspat = await textEl(b, "tbPret");
      assert.ok(!/înv|inv/i.test(String(pretProaspat)), `pretul proaspat n-ar trebui sa fie marcat vechi: ${pretProaspat}`);
      const basisProaspat = await celula(b, 5);
      assert.notEqual(basisProaspat?.valoare, "—", "basis-ul cu tick proaspat ar trebui sa aiba o cifra");

      // trecem timpul inapoi FARA niciun tick nou - exact defectul reparat.
      await b.ev(`tbStare.pretSpotLa = Date.now() - 61000; renderTabloBot();`);
      const pretVechi = await textEl(b, "tbPret");
      assert.match(String(pretVechi), /\(înv|\(inv/i, `pretul invechit ar trebui sa scrie "(învechit)": ${pretVechi}`);
      const basisVechi = await celula(b, 5);
      assert.equal(basisVechi?.valoare, "—", `basis pe pret invechit ar trebui sa fie "—", nu ${basisVechi?.valoare}`);
      assert.equal(basisVechi?.stare, "nu-se-poate", `starea basis ar trebui "nu-se-poate", nu ${basisVechi?.stare}`);
    });

    /* ═══ 2. Basis gol dupa schimbarea botului ═══════════════════════════
       Defect pazit: 406.451.512% marcat verde + OPORTUNITATE fabricat. */
    await test("2. la schimbarea simbolului, basis-ul e gol pana la primul tick nou, nu o cifra veche", async () => {
      await incarcaBotSanatos({ strategyId: "8201", baza: "ADA.PERP" });
      await b.ev(`window.__probaTrimiteTick("0.321")`);
      await b.ev(`renderTabloBot()`);
      const basisInainte = await celula(b, 5);
      assert.notEqual(basisInainte?.valoare, "—", "precheck: basis-ul cu tick ar trebui sa aiba o cifra");

      // acum trece pe alt bot / alt simbol - inainte de orice tick nou.
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut({ strategyId: "8202", baza: "SOL.PERP", quote: "USDT" }))] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      const basisDupa = await celula(b, 5);
      assert.equal(basisDupa?.valoare, "—", `basis dupa schimbarea de bot ar trebui sa fie "—", nu ${basisDupa?.valoare} (pret vechi refolosit)`);
      assert.equal(basisDupa?.stare, "nu-se-poate");
    });

    /* ═══ 3. Zero scrieri in istoric in timpul unei pene de ruta ═════════
       Defect pazit: o pana de 90 de minute transforma "Ritmul a cazut" in "Merge". */
    await test("3. cand /api/bot-orders da eroare, nu se scrie in istoric si nu se cer lumanari", async () => {
      const id = "8301";
      await b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('tabloBotIstoric_v1_')).forEach(k=>localStorage.removeItem(k))`);
      await incarcaBotSanatos({ strategyId: id, baza: "ADA.PERP" });
      const scrisLaInceput = await b.ev(`window.__proba.setItemLog.some(k=>k==='tabloBotIstoric_v1_${id}')`);
      assert.ok(scrisLaInceput, "precheck: primul apel reusit ar trebui sa scrie un istoric");

      await b.ev(`window.__proba.setItemLog = []`);
      const apeluriMarketInainte = await b.ev(`window.__proba.calls.market`);
      await seteazaMock(b, "botOrders", { reteaPicata: true });
      await b.ev(`tbAduDate()`);
      const scrieriInTimpulPenei = await b.ev(`window.__proba.setItemLog.filter(k=>k.startsWith('tabloBotIstoric_v1_')).length`);
      const apeluriMarketDupa = await b.ev(`window.__proba.calls.market`);
      assert.equal(scrieriInTimpulPenei, 0, `n-ar trebui nicio scriere in istoric in timpul penei, au fost ${scrieriInTimpulPenei}`);
      assert.equal(apeluriMarketDupa, apeluriMarketInainte, "n-ar trebui cerute lumanari in timpul penei de ruta");
    });

    /* ═══ 4. Badge-uri neutre la eroare ═══════════════════════════════════ */
    await test("4. pe eroare de ruta, tbSimbol si tbMod arata em-dash, nu simbol vechi sau mod inventat", async () => {
      await incarcaBotSanatos({ strategyId: "8401", baza: "ADA.PERP" }); // stare anterioara, cu simbol afisat
      const simbolInainte = await textEl(b, "tbSimbol");
      assert.notEqual(simbolInainte, "—", "precheck: cu bot sanatos ar trebui sa avem un simbol pe ecran");

      await seteazaMock(b, "botOrders", { reteaPicata: true });
      await b.ev(`tbAduDate()`);
      const simbol = await textEl(b, "tbSimbol");
      const mod = await textEl(b, "tbMod");
      assert.equal(simbol, "—", `tbSimbol pe eroare ar trebui "—", nu "${simbol}"`);
      assert.equal(mod, "—", `tbMod pe eroare ar trebui "—", nu "${mod}"`);
    });

    /* ═══ 5. Butonul de mod ═══════════════════════════════════════════════ */
    await test("5a. butonul de schimbat modul e dezactivat cand botul n-are strategyId", async () => {
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut({ strategyId: null, baza: "ADA.PERP" }))] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      const dezactivat = await b.ev(`document.getElementById('tbSchimbaModulBtn')?.disabled`);
      assert.equal(dezactivat, true, "butonul ar trebui dezactivat fara strategyId");
    });

    await test("5b. la esec de scriere a modului, nu apare toast de succes - doar unul de eroare", async () => {
      await incarcaBotSanatos({ strategyId: "8501", baza: "ADA.PERP" });
      await b.ev(`document.getElementById('toastHost').innerHTML=''`);
      await b.ev(`window.__proba.blocheazaScriereaPentru = 'tabloBotMod_v1'`);
      await b.ev(`tbSchimbaModul()`);
      await b.ev(`window.__proba.blocheazaScriereaPentru = null`);
      const t = await toasturi(b);
      const areSucces = t.some((x) => x.c.includes("good") && /^Mod:/.test(x.t));
      const areEroare = t.some((x) => x.c.includes("bad") && /stocarea local[aă]/i.test(x.t));
      assert.ok(!areSucces, `n-ar trebui toast de succes cand scrierea a picat: ${JSON.stringify(t)}`);
      assert.ok(areEroare, `ar trebui un toast de eroare despre stocarea locala: ${JSON.stringify(t)}`);
    });

    /* ═══ 6. bots care nu e lista ══════════════════════════════════════════ */
    await test("6. un raspuns cu bots care nu e lista da EROARE, nu FARA_BOT", async () => {
      await seteazaMock(b, "botOrders", { corp: { bots: "nu-e-o-lista" }, stare: 200 });
      await b.ev(`tbAduDate()`);
      const nivel = await textEl(b, "tbNivel");
      const titlu = await textEl(b, "tbTitlu");
      assert.equal(nivel, "EROARE", `bots nevalid ar trebui sa dea EROARE, nu ${nivel}`);
      assert.equal(titlu, "Nu am putut citi boții");
    });

    /* ═══ 7. Eticheta "activ" ══════════════════════════════════════════════ */
    await test("7. eticheta arata oprit cand botul ales chiar e oprit", async () => {
      const brutOprit = botBrut({ strategyId: "8701", baza: "ADA.PERP", buOrderData: { status: "closed" } });
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(brutOprit, { activ: false })] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      const simbol = await textEl(b, "tbSimbol");
      assert.match(String(simbol), /· oprit$/, `botul oprit ar trebui sa scrie "· oprit": ${simbol}`);
    });

    await test("7b. eticheta arata activ (din N boți) cand botul ales chiar e activ, printre mai multi", async () => {
      const activ = botBrut({ strategyId: "8702", baza: "ADA.PERP" });
      const altul = botBrut({ strategyId: "8703", baza: "SOL.PERP", buOrderData: { status: "closed" } });
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(activ), botNormalizat(altul, { activ: false })] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      const simbol = await textEl(b, "tbSimbol");
      assert.match(String(simbol), /· activ, din 2 boți$/, `botul activ din mai multi ar trebui sa spuna "activ, din 2 boți": ${simbol}`);
    });

    /* ═══ Revizia finala 2026-09-22: 9 defecte, masurate mai jos ═══════════ */

    /* --- 1. marginStatus/riskStatus nu erau citite deloc --- */
    await test("8. marginStatus anormal (MARGIN_CALL) da OPRESTE pe ecran, nu LINISTE", async () => {
      const id = "8801";
      await seedIstoricCopt(b, id, 35, 0.32); // istoricMin>=30 cerut de NEDOVEDIT (treapta 1, inaintea lui OPRESTE)
      const brut = botBrut({ strategyId: id, baza: "ADA.PERP", buOrderData: { marginStatus: "MARGIN_CALL" } });
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(brut)] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      const nivel = await textEl(b, "tbNivel");
      const deCe = await textEl(b, "tbDeCe");
      assert.equal(nivel, "OPRESTE", `marginStatus MARGIN_CALL ar trebui OPRESTE, a dat ${nivel}`);
      assert.match(String(deCe), /marginStatus/, `declansatorul ar trebui sa mentioneze marginStatus: ${deCe}`);
    });

    await test("8b. riskStatus anormal (LIQUIDATION) da OPRESTE pe ecran, nu LINISTE", async () => {
      const id = "8802";
      await seedIstoricCopt(b, id, 35, 0.32);
      const brut = botBrut({ strategyId: id, baza: "ADA.PERP", buOrderData: { riskStatus: "LIQUIDATION" } });
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(brut)] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      const nivel = await textEl(b, "tbNivel");
      assert.equal(nivel, "OPRESTE", `riskStatus LIQUIDATION ar trebui OPRESTE, a dat ${nivel}`);
    });

    /* --- 2. ecranul nu se putea deschide de pe telefon (390px) --- */
    await test("9. pe telefon (390px), Tabloul botului e accesibil din sertarul More", async () => {
      const ascunsSideNav = await b.ev(`getComputedStyle(document.querySelector('.sideNav')).display`);
      assert.equal(ascunsSideNav, "none", "precheck: sideNav trebuie ascuns sub 980px (proba ruleaza la 390px)");
      await b.ev(`openMoreDrawer()`);
      const gasit = await b.ev(`[...document.querySelectorAll('.moreBtn')].some(x=>/Tablou bot/i.test(x.textContent))`);
      assert.ok(gasit, "butonul Tablou bot nu apare in sertarul More");
      await b.ev(`[...document.querySelectorAll('.moreBtn')].find(x=>/Tablou bot/i.test(x.textContent)).click()`);
      await asteapta(400);
      const activ = await b.ev(`document.getElementById('tabloubot')?.classList.contains('on')`);
      assert.ok(activ, "click pe Tablou bot in sertarul More ar trebui sa deschida panoul");
      await b.ev(`opresteTabloBot()`);
    });

    /* --- 3. iesirea prin bara de tab-uri (.tabs, show() direct) lasa WS/ceas pornite --- */
    await test("10. iesirea prin .tabs (show() direct, nu navTo) inchide WS-ul si scade cadenta colectorului la 60 s", async () => {
      await incarcaBotSanatos({ strategyId: "8103", baza: "ADA.PERP" });
      await b.ev(`navTo('tabloubot', true)`);
      await asteapta(300);
      const cadentaInainte = await b.ev(`tbCadentaMs()`);
      const wsInainte = await b.ev(`tbStare.ws !== null`);
      assert.equal(cadentaInainte, 8000, "precheck: cadenta colectorului ar trebui 8000 cat esti pe tablou");
      assert.ok(wsInainte, "precheck: WebSocket-ul ar trebui deschis dupa navTo('tabloubot', true)");
      // butonul din .tabs cheama show('dash') DIRECT, nu navTo() - exact drumul care scurgea inainte
      await b.ev(`document.querySelector('.tabs .tab')?.click()`);
      await asteapta(200);
      const cadentaDupa = await b.ev(`tbCadentaMs()`);
      const wsDupa = await b.ev(`tbStare.ws === null`);
      assert.equal(cadentaDupa, 60000, "cadenta colectorului trebuie sa scada la 60 s si la iesirea prin bara de tab-uri, nu doar prin navTo");
      assert.ok(wsDupa, "WebSocket-ul trebuie inchis si la iesirea prin bara de tab-uri, nu doar prin navTo");
    });

    /* --- 5. pretul folosit de verdict era vechi de pana la ~10 minute --- */
    await test("11. verdictul foloseste pretul VIU (pretCurent), nu inchiderea vechii lumanari de 5m", async () => {
      const brut = botBrut({ strategyId: "8111", baza: "ADA.PERP", buOrderData: { bottom: "0.30", top: "0.40" } });
      // pretCurent (live, din tickere) diferit de ultima inchidere de lumanare (~0.30..0.32)
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(brut, { pretCurent: 0.38 })] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      const poz = await celula(b, 0); // "poziția în interval"
      const val = parseFloat(poz?.valoare);
      // (0.38-0.30)/(0.40-0.30)*100 = 80% cu pretul viu; cu inchiderea lumanarii (~0.32) ar fi ~20%
      assert.ok(val > 70 && val < 90, `pozitia ar trebui ~80% (pret viu 0.38), nu bazata pe inchiderea lumanarii: ${poz?.valoare}`);
    });

    /* --- 6. istoricul inghitea pretul spot inghetat in timpul unei pene de WS --- */
    await test("12. pretul spot inghetat NU intra in istoric - se scrie null, nu pretul mort", async () => {
      await incarcaBotSanatos({ strategyId: "8112", baza: "ADA.PERP" });
      await b.ev(`window.__probaTrimiteTick("0.321")`);
      await b.ev(`renderTabloBot()`);
      // simulam pana de WS: pretul devine "invechit" (>60s) FARA tick nou, ca la proba 1
      await b.ev(`tbStare.pretSpotLa = Date.now() - 61000;`);
      await b.ev(`tbAduDate()`); // scrie un rand nou in istoric
      const ultimulPretSpot = await b.ev(`tbStare.istoric[tbStare.istoric.length-1]?.pretSpot`);
      assert.strictEqual(ultimulPretSpot, null, `pretul spot inghetat nu are voie sa intre in istoric ca fiind viu: ${ultimulPretSpot}`);
    });

    /* --- 7. .slice().reverse() presupunea ordinea lumanarilor --- */
    /* ═══ v74.2: selectorul de boti (I9) si eroarea care spune CE SA FACI ═══ */

    await test("14. cu un singur bot, selectorul NU apare - n-ar fi nimic de ales", async () => {
      await incarcaBotSanatos({ strategyId: "9101", baza: "ADA.PERP" });
      const ascuns = await b.ev(`document.getElementById('tbBotAles').hidden`);
      assert.equal(ascuns, true, "cu un singur bot selectorul ar trebui ascuns");
    });

    await test("15. cu doi boti, selectorul apare si APASAREA lui schimba botul judecat", async () => {
      const unu = botBrut({ strategyId: "9201", baza: "ADA.PERP" });
      const doi = botBrut({ strategyId: "9202", baza: "SOL.PERP" });
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(unu), botNormalizat(doi)] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`localStorage.removeItem('tabloBotAles_v1')`);
      await b.ev(`tbAduDate()`);
      await b.ev(`renderTabloBot()`);

      const vizibil = await b.ev(`document.getElementById('tbBotAles').hidden === false`);
      assert.ok(vizibil, "cu doi boti selectorul trebuie sa fie la vedere");
      const optiuni = await b.ev(`document.getElementById('tbBotAles').options.length`);
      assert.equal(optiuni, 2, `ar trebui doua optiuni, sunt ${optiuni}`);

      const inainte = await textEl(b, "tbSimbol");
      // Apasam CHIAR pe el, cu evenimentul real - nu chemam functia pe scurtatura.
      await b.ev(`(() => { const s = document.getElementById('tbBotAles');
        s.value = '9202'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await asteapta(600);
      const dupa = await textEl(b, "tbSimbol");
      assert.notEqual(String(dupa), String(inainte), "alegerea din selector trebuie sa schimbe botul judecat");
      assert.match(String(dupa), /SOL/, `dupa alegere ar trebui SOL, arata: ${dupa}`);
      const pastrat = await b.ev(`JSON.parse(localStorage.getItem('tabloBotAles_v1')||'null')`);
      assert.equal(String(pastrat), "9202", "alegerea trebuie tinuta pe disc, ca sa treaca de un refresh");
    });

    await test("16. botul ales de om care DISPARE nu se inlocuieste tacut", async () => {
      await b.ev(`localStorage.setItem('tabloBotAles_v1', JSON.stringify('fantoma'))`);
      const unu = botBrut({ strategyId: "9301", baza: "ADA.PERP" });
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(unu)] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      await b.ev(`renderTabloBot()`);
      const text = await b.ev(`document.getElementById('tabloubot').textContent`);
      assert.match(String(text), /nu mai e în listă/,
        "cand botul ales a disparut, ecranul trebuie sa SPUNA - altfel omul crede ca se uita la al lui");
      await b.ev(`localStorage.removeItem('tabloBotAles_v1')`);
    });

    await test("17. eroarea de autentificare spune CE SA FACA, nu codul AUTH_REQUIRED", async () => {
      await seteazaMock(b, "botOrders", { corp: { error: "AUTH_REQUIRED", authenticated: false }, stare: 401 });
      await b.ev(`tbAduDate()`);
      await b.ev(`renderTabloBot()`);
      // ceFac se scrie in #tbCeFac; #tbDeCe tine DECLANSATORUL, care la eroare e gol.
      const titlu = await textEl(b, "tbTitlu");
      const ceFac = await textEl(b, "tbCeFac");
      assert.ok(!/AUTH_REQUIRED/.test(String(titlu) + String(ceFac)),
        `omul nu are ce face cu "AUTH_REQUIRED": titlu="${titlu}" ceFac="${ceFac}"`);
      assert.match(String(ceFac), /PORNESTE-CRYPTO-RADAR/,
        `trebuie sa-i spuna cu ce sa porneasca: "${ceFac}"`);
    });

    await test("13. lumanarile se sorteaza dupa timp, nu se presupune ordinea de la ruta", async () => {
      await incarcaBotSanatos({ strategyId: "8113", baza: "ADA.PERP" });
      const mock = lumanariCorpMock(60);
      mock.data.klines = mock.data.klines.slice().reverse(); // acum crescator - opusul a ce trimite Pionex normal
      await seteazaMock(b, "market", { corp: mock, stare: 200 });
      await b.ev(`tbAduDate()`);
      const ordonatCrescator = await b.ev(`(() => {
        const k = tbStare.klinePerp;
        if (!k || k.length < 2) return false;
        for (let i = 1; i < k.length; i++) if (Number(k[i].time) < Number(k[i-1].time)) return false;
        return true;
      })()`);
      assert.ok(ordonatCrescator, "klinePerp trebuie sa fie crescator dupa timp indiferent de ordinea primita de la ruta");
    });

    /* ═══ v74.4: parola nu se mai cere la fiecare repornire ═══════════════
       Pana acum statea in sessionStorage: se stergea la inchiderea tabului, deci
       pe telefon o cerea de fiecare data. Probele astea REINCARCA pagina - adica
       fac exact ce face el cand redeschide - si sunt ultimele, ca sa nu strice
       starea celorlalte scenarii. */

    await test("18. parola pusa o data se tine si intr-un TAB NOU (nu doar la reload)", async () => {
      const parola = "parola-de-proba-" + Date.now();
      await b.ev(`(() => { document.getElementById('apiSessionToken').value = ${JSON.stringify(parola)};
        saveApiSessionToken(); })()`);

      // ATENTIE: o simpla reincarcare NU masoara nimic - sessionStorage
      // supravietuieste unui reload, se pierde abia cand se inchide TABUL.
      // Golirea lui e exact ce vede pagina intr-un tab nou.
      await b.ev(`try{sessionStorage.clear()}catch(e){}`);
      await b.navigheaza(URL_T);
      if (!(await asteaptaAplicatia(b))) throw new Error("aplicatia nu s-a reincarcat");

      const dupa = await b.ev(`apiSessionToken()`);
      assert.equal(dupa, parola, "intr-un tab nou parola trebuie sa fie tot acolo - asta e ce pateste el");
      const stare = await textEl(b, "apiAuthStatus");
      assert.ok(!/^NO /i.test(String(stare)), `starea zice ca n-are parola: "${stare}"`);
    });

    await test("19. campul ARATA ca parola e tinuta minte, nu pare gol", async () => {
      // Un camp gol peste o parola salvata l-ar face sa creada ca trebuie s-o puna
      // din nou - adica exact ce ne-am propus sa nu mai faca.
      const inCamp = await b.ev(`document.getElementById('apiSessionToken').value`);
      assert.ok(String(inCamp).length > 0, "campul nu are voie sa para gol cand parola e salvata");
    });

    await test("20. butonul Clear chiar UITA, si intr-un tab nou", async () => {
      await b.ev(`clearApiSessionToken()`);
      await b.ev(`try{sessionStorage.clear()}catch(e){}`);
      await b.navigheaza(URL_T);
      if (!(await asteaptaAplicatia(b))) throw new Error("aplicatia nu s-a reincarcat");
      const dupa = await b.ev(`apiSessionToken()`);
      assert.equal(dupa, "", "dupa Clear parola nu are voie sa reapara intr-un tab nou");
    });

    await test("21. textele din Settings nu mai mint despre cat tine parola", async () => {
      const zona = await b.ev(`(() => {
        const el = document.getElementById('apiSessionToken');
        const card = el && el.closest('.settingsCard');
        return card ? card.textContent + ' || ' + (el.getAttribute('placeholder') || '') : '';
      })()`);
      assert.ok(String(zona).length > 0, "n-am gasit cardul de parola");
      assert.ok(!/sessionStorage|browser session ends|this session|session only/i.test(String(zona)),
        `textul inca promite ca se sterge la inchiderea sesiunii: "${String(zona).slice(0, 220)}"`);
    });

    await test("22. colectorul scrie in istoric si de pe ALT ecran", async () => {
      const id = "9401";
      await b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('tabloBotIstoric_v1_')).forEach(k=>localStorage.removeItem(k))`);
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut({ strategyId: id, baza: "ADA.PERP" }))] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`navTo('dash', true)`);                 // plecam de pe tablou
      await b.ev(`window.__proba.setItemLog = []`);
      await b.ev(`tbColectorTick()`);                     // un tic, fara sa asteptam 60 s
      await asteapta(800);
      const scris = await b.ev(`window.__proba.setItemLog.some(k=>k==='tabloBotIstoric_v1_${id}')`);
      assert.ok(scris, "colectorul trebuie sa adune istoric si cand esti pe alt ecran");
    });

    await test("23. colectorul NU scrie in timpul unei pene de ruta", async () => {
      await b.ev(`window.__proba.setItemLog = []`);
      await seteazaMock(b, "botOrders", { reteaPicata: true });
      await b.ev(`tbColectorTick()`);
      await asteapta(800);
      const scrieri = await b.ev(`window.__proba.setItemLog.filter(k=>k.startsWith('tabloBotIstoric_v1_')).length`);
      assert.equal(scrieri, 0, "o pana de retea nu are voie sa devina dovada in istoric");
    });

    await test("24. in fundal NU se deschide WebSocket - doar cand esti pe tablou", async () => {
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut({ strategyId: "9402", baza: "ADA.PERP" }))] }, stare: 200 });
      await b.ev(`navTo('dash', true)`);
      await b.ev(`tbColectorTick()`);
      await asteapta(800);
      const wsInFundal = await b.ev(`!!(tbStare.ws && tbStare.ws.readyState !== 3)`);
      assert.equal(wsInFundal, false, "un WebSocket deschis pe toate ecranele e risipa si tine socketul ocupat");
    });

    await test("25. istoricul retine si banii, nu doar perechile", async () => {
      const id = "9501";
      await b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('tabloBotIstoric_v1_')).forEach(k=>localStorage.removeItem(k))`);
      await seteazaMock(b, "botOrders", { corp: { bots: [botNormalizat(botBrut({ strategyId: id, baza: "ADA.PERP" }))] }, stare: 200 });
      await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
      await b.ev(`tbAduDate()`);
      await asteapta(500);
      const ultima = await b.ev(`(() => {
        const l = JSON.parse(localStorage.getItem('tabloBotIstoric_v1_${id}') || '[]');
        return l.length ? l[l.length - 1] : null;
      })()`);
      assert.ok(ultima, "ar trebui sa existe o intrare de istoric");
      for (const camp of ["profitNet", "comisioane", "gridProfitBrut", "investit"]) {
        assert.ok(camp in ultima, `istoricul trebuie sa retina ${camp} - fara el nu se pot socoti banii in timp`);
      }

      // Fiecare camp de bani, PE RAND: lipsa la SURSA (Pionex nu-l trimite) nu
      // are voie sa minta cu 0 in istoric - Number(x)||0 ar fi trecut cu 0 in loc
      // de null. Verificam toate patru campurile, nu doar profitNet - un singur
      // camp pazit lasa celelalte trei libere sa minta (asa a picat revizia).
      let idBaniProba = 9502;
      for (const camp of ["profitNet", "comisioane", "gridProfitBrut", "investit"]) {
        const idCamp = String(idBaniProba++);
        const botFaraCamp = botNormalizat(botBrut({ strategyId: idCamp, baza: "ADA.PERP" }));
        delete botFaraCamp[camp];
        await seteazaMock(b, "botOrders", { corp: { bots: [botFaraCamp] }, stare: 200 });
        await seteazaMock(b, "market", { corp: lumanariCorpMock(60), stare: 200 });
        await b.ev(`tbAduDate()`);
        await asteapta(500);
        const ultimaFaraCamp = await b.ev(`(() => {
          const l = JSON.parse(localStorage.getItem('tabloBotIstoric_v1_${idCamp}') || '[]');
          return l.length ? l[l.length - 1] : null;
        })()`);
        assert.ok(ultimaFaraCamp, `ar trebui sa existe o intrare de istoric pentru botul fara ${camp}`);
        assert.equal(ultimaFaraCamp[camp], null, `${camp} lipsa la sursa trebuie sa ramana null, nu 0 (Number(x)||0 ar minti aici)`);
      }
    });

  } finally {
    b.inchide();
    // Windows tine profilul incuiat cateva secunde dupa ce Chrome primeste
    // kill - probele lasate azi cu 400ms/3 incercari chiar au ramas pe disc
    // (65 MB in cateva rulari). Asteptam mai mult si incercam mai des.
    await asteapta(1500);
    try { rmSync(profil, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 }); } catch { /* nu e fatal */ }
  }

  console.log(`\n  ${ok} ok · ${picate} pica\n`);
  if (picate) process.exit(1);
  console.log("  ecranul pastreaza purtarile reparate.\n");
  process.exit(0);
}

main().catch((e) => { console.error("PROBA A CAZUT: " + e.message); process.exit(1); });
