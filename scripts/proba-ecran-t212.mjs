// PROBA DE ECRAN - Trading 212 in US Stocks + jurnalul de actiuni (v85), Chrome/Edge real prin CDP, pe
// DATE REALE de la Pionex (de acasa; pe Cloudflare Pionex refuza).
//
// Ce face: deschide Radarul local, US Stocks -> contul T212 (pozitii, plan, poarta) si Jurnal -> Actiuni.
// apasa "Calculeaza acum" si citeste DOM-ul REAL: verdict, tabelul probei,
// butoanele de copiat, fara NaN/undefined pe ecran, consola curata. Apoi
// apasa Short (fara o noua aducere de lumanari), 3 zile, o moneda inexistenta
// si o suma goala. Face poze la 1440 si 390 px.
//
// Rulare (server pe :8788 - PORNESTE-CRYPTO-RADAR.bat; NU intra in npm test):
//   node scripts/proba-ecran-t212.mjs [url] [dosarPoze]
// Tokenul API se citeste din .dev.vars (APP_API_TOKEN) si nu se tipareste.
import { spawn, spawnSync } from "node:child_process";
import { rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const URL_T = (process.argv[2] || "http://127.0.0.1:8788/").replace(/\/+$/, "") + "/";
const DOSAR_POZE = process.argv[3] || path.join(tmpdir(), "proba-ecran-t212");
mkdirSync(DOSAR_POZE, { recursive: true });
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

// Inainte de orice script al paginii: SW-ul oprit (altfel face reload in mijlocul
// probei), contor pe cererile /api/market, reteaua reala ramane reala.
const BOOTSTRAP = `(() => {
  if (window.__proba) return;
  window.__proba = { apeluri: [] };
  const fetchNativ = window.fetch.bind(window);
  window.fetch = function (intrare, optiuni) {
    const url = typeof intrare === "string" ? intrare : (intrare && intrare.url) || String(intrare);
    const m = url.match(/\\/api\\/([a-z0-9-]+)(\\?[^#]*)?/i);
    if (m) window.__proba.apeluri.push(m[1] + (m[2] || ""));
    return fetchNativ(intrare, optiuni);
  };
  if (navigator.serviceWorker) { try { navigator.serviceWorker.register = () => Promise.reject(new Error("proba: sw dezactivat")); } catch {} }
})();`;

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
  let id = 0; const astept = new Map(); const exceptii = [], consola = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && astept.has(m.id)) { astept.get(m.id)(m.result); astept.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") exceptii.push(String(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text ?? "?").slice(0, 300));
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consola.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  };
  await new Promise((r) => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise((res) => { const n = ++id; astept.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: true });
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  try { await send("Storage.clearDataForOrigin", { origin: new URL(URL_T).origin, storageTypes: "all" }); } catch {}
  await send("Page.addScriptToEvaluateOnNewDocument", { source: BOOTSTRAP });
  await send("Emulation.setDeviceMetricsOverride", { width: lat, height: inal, deviceScaleFactor: 1, mobile: lat < 600 });
  return {
    exceptii, consola,
    async ev(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r?.exceptionDetails) throw new Error("evaluare picata: " + String(r.exceptionDetails?.exception?.description ?? r.exceptionDetails?.text).slice(0, 300));
      return r?.result?.value;
    },
    async navigheaza(url) { await send("Page.navigate", { url }); },
    async poza(fisier) {
      const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      writeFileSync(fisier, Buffer.from(r.data, "base64"));
    },
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
    if (!existsSync(profil)) return true;
    await asteapta(700 * (i + 1));
  }
  console.error(`  ATENTIE: profilul de proba a RAMAS pe disc: ${profil}`);
  return false;
}
async function panaCand(b, expr, ms, ce) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { let ok = false; try { ok = await b.ev(expr); } catch {} if (ok) return; await asteapta(400); }
  let vede = ""; try { vede = await b.ev(`(document.getElementById("t212Continut")||{innerText:""}).innerText.slice(0,300)+" | stare: "+(document.getElementById("t212Stare")||{textContent:""}).textContent`); } catch {}
  throw new Error(`am asteptat ${ms} ms degeaba: ${ce} · pe ecran: ${vede}`);
}

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}

const FARA_GUNOI = (t) => { for (const g of ["NaN", "undefined", "null", "Infinity", "[object"]) assert.ok(!t.includes(g), `pe ecran apare "${g}"`); };
const CONT = `document.getElementById("t212Card").innerText`;

async function scenariu(lat, inal, nume) {
  const profil = path.join(tmpdir(), `proba-t212-${nume}-${Date.now()}`);
  const b = await porneste(lat, inal, profil);
  try {
    await b.navigheaza(URL_T);
    await panaCand(b, `document.readyState==="complete"&&typeof t212Porneste==="function"&&typeof ActiuniSemnale!=="undefined"&&typeof T212!=="undefined"`, 25000, "aplicatia sa se incarce");
    if (TOKEN) await b.ev(`try{localStorage.setItem("cryptoRadarApiTokenV54",${JSON.stringify(TOKEN)})}catch(e){}`);
    // DRUMUL LUI (v85.1): din modul Crypto, prin meniu - nu cu openStocksDesk() chemat din cod
    await b.ev(`setAssetClass("CRYPTO")`);
    await test(`${nume} · din modul Crypto, butonul "Trading 212" se VEDE in meniu si duce la card`, async () => {
      const sel = lat < 600 ? `#moreDrawer .moreBtn` : `.sideBtn[data-nav="t212"]`;
      if (lat < 600) { await b.ev(`document.querySelector('.mobileBottom [data-action-click="openMoreDrawer()"]').click()`); }
      const buton = `[...document.querySelectorAll('${sel}')].find(x=>/Trading 212/.test(x.textContent))`;
      assert.ok(await b.ev(`(()=>{const e=${buton};if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).display!=="none"})()`), "butonul Trading 212 nu se vede in modul Crypto");
      await b.ev(`${buton}.click()`);
      await panaCand(b, `(()=>{const c=document.getElementById("t212Card");if(!c)return false;const r=c.getBoundingClientRect();return r.width>0&&r.height>0})()`, 15000, "cardul T212 vizibil dupa clic");
    });

    await test(`${nume} · US Stocks -> contul T212: cifrele, fiecare pozitie cu semafor, sfat si plan; portofoliul; fara gunoi`, async () => {
      await panaCand(b, `!!document.querySelector("#t212Sus .t212Kpi")`, 40000, "cifrele contului");
      await panaCand(b, `!t212.inLucru`, 120000, "preturile zilnice pentru fiecare pozitie");
      const t = await b.ev(CONT), n = await b.ev(`(t212.poz||[]).length`);
      assert.ok(n > 0, "contul are pozitii (7 pe 25.09)");
      assert.equal(await b.ev(`document.querySelectorAll("#t212Continut tr.t212Rand").length`), n, "un rand pe actiune");
      assert.equal(await b.ev(`document.querySelectorAll("#t212Continut tr.t212Rand .t212Pill").length`), n, "un semafor pe fiecare pozitie");
      assert.equal(await b.ev(`[...document.querySelectorAll("#t212Continut .t212Det .t212Plan button")].filter(x=>/Salvează planul/.test(x.textContent)).length`), n, "planul pe fiecare pozitie");
      assert.equal(await b.ev(`document.querySelectorAll("#t212Continut tr.t212Det:not([hidden])").length`), 0, "detaliile inchise la deschidere (compact)");
      assert.match(t, /Câștigat real/i); assert.match(t, /T212 arată/i); assert.match(t, /Portofoliul/i); assert.match(t, /Ce ai de făcut acum/i);
      // v87: tot contul pe un rand + data rezultatelor la macar o pozitie (Nasdaq)
      await panaCand(b, `/Pionex/.test(document.querySelector("#t212Card [data-cont-tot]").innerText)&&/Trading 212/.test(document.querySelector("#t212Card [data-cont-tot]").innerText)`, 30000, "randul cu tot contul");
      assert.ok((await b.ev(`[...document.querySelectorAll("#t212Continut .t212Sim .t212Mic")].filter(x=>/rezultate [0-9]{2}[.][0-9]{2}/.test(x.textContent)).length`)) > 0, "nicio data de rezultate");
      // procentul principal e in LEI, ca in Trading 212; pretul in dolari sta langa el
      assert.match(await b.ev(`document.querySelector("#t212Continut tr.t212Rand .c-rez").innerText`), /preț/);
      // ordinea: IESI inaintea ATENTIE inaintea TINE
      const ord = await b.ev(`[...document.querySelectorAll("#t212Continut tr.t212Rand .t212Pill")].map(x=>({"IEȘI":0,"ATENȚIE":1,"FĂRĂ DATE":2,"ȚINE":3})[x.textContent.trim()])`);
      assert.deepEqual(ord, ord.slice().sort((a, c) => a - c), "pozitiile in ordinea urgentei: " + ord);
      assert.ok((await b.ev(`document.querySelectorAll("#t212Continut .t212Pill-fara").length`)) < n, "macar o pozitie cu preturi (Yahoo)");
      FARA_GUNOI(t);
      await b.poza(path.join(DOSAR_POZE, `t212-${nume}.png`));
    });

    await test(`${nume} · planul: salvat pe o pozitie, citit inapoi de pe server, apoi sters (contul lui ramane cum era)`, async () => {
      const tk = await b.ev(`t212.poz[0].ticker`), inainte = await b.ev(`JSON.stringify(t212.planuri[t212.poz[0].ticker]||null)`);
      if (inainte !== "null") return; // are deja un plan pus de el: nu-l ating
      await b.ev(`document.getElementById("t212Trail-${tk}").value="55";t212PlanSalveaza("${tk}")`);
      await panaCand(b, `!!(t212.planuri["${tk}"]&&t212.planuri["${tk}"].trailPct===55)`, 15000, "planul salvat");
      const citit = await b.ev(`getJSON("/api/istoric-bot?action=plan&bot="+encodeURIComponent("t212-${tk}")).then(d=>d.plan&&d.plan.trailPct)`);
      assert.equal(citit, 55);
      await b.ev(`["Stop","Tinta","Trail"].forEach(k=>{document.getElementById("t212"+k+"-${tk}").value=""});t212PlanSalveaza("${tk}")`);
      await panaCand(b, `t212.planuri["${tk}"]===null`, 15000, "planul sters");
      assert.equal(await b.ev(`getJSON("/api/istoric-bot?action=plan&bot="+encodeURIComponent("t212-${tk}")).then(d=>d.plan)`), null);
    });

    await test(`${nume} · preturile calculate: pe fiecare pozitie cu preturi - stop care urca, tinta, proba; "Pune ca plan" scrie planul (apoi il sterg)`, async () => {
      const cuBare = await b.ev(`t212.poz.filter(p=>(t212.bare[p.ticker]||[]).length>=120).length`);
      assert.ok(cuBare > 0);
      // drumul lui: clic pe rand -> detaliile se deschid (cu preturile si planul)
      const tk0 = await b.ev(`t212.poz.find(p=>t212.niveluri[p.ticker]).ticker`);
      await b.ev(`document.getElementById("t212R-${tk0}").click()`);
      assert.equal(await b.ev(`document.getElementById("t212Det-${tk0}").hidden`), false, "clic pe rand deschide detaliile");
      const t = await b.ev(`document.querySelector("#t212Det-${tk0} .t212Preturi").innerText`);
      assert.match(t, /Stop care urcă după maxim/); assert.match(t, /Țintă/); assert.match(t, /probat pe \d+ zile/); FARA_GUNOI(t);
      await b.poza(path.join(DOSAR_POZE, `t212-deschis-${nume}.png`));
      await b.ev(`document.getElementById("t212R-${tk0}").click()`);
      assert.equal(await b.ev(`document.getElementById("t212Det-${tk0}").hidden`), true, "al doilea clic il inchide");
      const tk = await b.ev(`t212.poz.find(p=>t212.niveluri[p.ticker]&&!t212.planuri[p.ticker])?.ticker||""`);
      if (!tk) return;
      const astept = await b.ev(`+t212.niveluri["${tk}"].trailPct.toFixed(1)`);
      await b.ev(`t212PuneNiveluri("${tk}")`);
      await panaCand(b, `!!(t212.planuri["${tk}"]&&t212.planuri["${tk}"].trailPct)`, 15000, "planul din preturile calculate");
      assert.equal(await b.ev(`t212.planuri["${tk}"].trailPct`), astept);
      assert.ok((await b.ev(`t212.planuri["${tk}"].tinta`)) > 0);
      await b.ev(`["Stop","Tinta","Trail"].forEach(k=>{const e=document.getElementById("t212"+k+"-${tk}");if(e)e.value=""});t212PlanSalveaza("${tk}")`);
      await panaCand(b, `t212.planuri["${tk}"]===null`, 15000, "planul sters");
    });

    await test(`${nume} · poarta: ASTS -> verdict cu motive si "ce as face eu"; simbol gol -> cere simbolul`, async () => {
      await b.ev(`document.getElementById("t212PSimbol").value="";t212Poarta()`);
      assert.match(await b.ev(`document.getElementById("t212PoartaRez").innerText`), /Scrie simbolul/);
      await b.ev(`document.getElementById("t212PSimbol").value="asts";t212Poarta()`);
      await panaCand(b, `!!document.querySelector("#t212PoartaRez .t212Verdict")`, 30000, "verdictul portii");
      const t = await b.ev(`document.getElementById("t212PoartaRez").innerText`);
      assert.match(t, /CUMPĂR|AȘTEAPTĂ|NU ACUM|FĂRĂ DATE/); assert.match(t, /ASTS/); assert.match(t, /Ce aș face eu/); FARA_GUNOI(t);
      assert.match(t, /Prețurile calculate pentru ASTS/); assert.match(t, /Cât cumperi/);
      if (!/NU ACUM/.test(t)) assert.match(t, /comision dus-întors/);
      // verdictul si marimea nu se contrazic: pe "NU ACUM" nu se da un numar de bucati
      if (/NU ACUM/.test(t)) assert.match(t, /nu cumpăr acum — vezi verdictul/); else assert.match(t, /1% din cont|citește întâi contul/);
      await b.ev(`document.getElementById("t212PoartaRez").scrollIntoView()`); await b.poza(path.join(DOSAR_POZE, `poarta-${nume}.png`));
    });

    await test(`${nume} · Jurnal: filtrul Actiuni arata jurnalul T212 (real vs T212, pe durata, greseli, trade-uri); Crypto il ascunde; Tot le arata pe amandoua`, async () => {
      await b.ev(`navTo('jurnaltrade',true);jtAlegeFiltru('actiuni')`);
      await panaCand(b, `/Câștigat REAL/.test(document.getElementById("jtActiuni").innerText)`, 30000, "jurnalul de actiuni");
      const t = await b.ev(`document.getElementById("jtActiuni").innerText`);
      assert.match(t, /Cât ai ținut/); assert.match(t, /Dacă ascultai de Radar/);
      assert.match(t, /Cât te-ar fi salvat stopul/); assert.match(t, /Regulile tale/); assert.match(t, /Greșelile care te-au costat/); assert.match(t, /Cele mai mari 5 pierderi/);
      assert.ok((await b.ev(`document.querySelectorAll("#jtActiuni .jtTrade").length`)) > 100);
      assert.equal(await b.ev(`document.getElementById("jtCrypto").hidden`), true);
      FARA_GUNOI(t);
      await b.poza(path.join(DOSAR_POZE, `jurnal-actiuni-${nume}.png`));
      await b.ev(`jtAlegeFiltru('tot')`);
      assert.equal(await b.ev(`document.getElementById("jtCrypto").hidden||document.getElementById("jtActiuni").hidden`), false);
      await b.ev(`jtAlegeFiltru('crypto')`);
      assert.equal(await b.ev(`document.getElementById("jtActiuni").hidden`), true);
    });

    await test(`${nume} · pozitiile si coloana cu poarta/portofoliul NU se suprapun (pe telefon: una sub alta)`, async () => {
      await b.ev(`deschideT212()`); await asteapta(400);
      const r = await b.ev(`(()=>{const a=document.querySelector(".t212Grila>.t212Panou").getBoundingClientRect(),c=document.querySelector(".t212Side").getBoundingClientRect();return {suprapus:!(a.right<=c.left+1||c.right<=a.left+1||a.bottom<=c.top+1||c.bottom<=a.top+1),subAlta:c.top>=a.bottom-1}})()`);
      assert.equal(r.suprapus, false, "coloana din dreapta acopera tabelul");
      if (lat < 600) assert.equal(r.subAlta, true, "pe telefon poarta si portofoliul vin SUB pozitii");
    });

    await test(`${nume} · consola curata si fara defilare orizontala`, async () => {
      assert.deepEqual(b.exceptii, []); assert.deepEqual(b.consola, []);
      await b.ev(`openStocksDesk()`);
      const w = await b.ev(`document.documentElement.scrollWidth`);
      assert.ok(w <= lat, `scrollWidth ${w} > ${lat}`);
    });
  } finally {
    b.inchide(); await asteapta(800); await stergeProfilul(profil);
  }
}

console.log(`\nV85 · proba de ecran · Trading 212 · ${URL_T} · poze in ${DOSAR_POZE}\n`);
if (!BROWSER) { console.log("  nu gasesc Chrome/Edge"); process.exit(2); }
await scenariu(1440, 900, "pc");
await scenariu(390, 844, "telefon");
// v85.6: pe monitorul lat cardul are latimea demo-ului (nu 1.700 px) si bara de sus nu acopera cifrele dupa "Trading 212"
{
  const pr = path.join(tmpdir(), `proba-t212-lat-${Date.now()}`), b = await porneste(1920, 1000, pr);
  try {
    await b.navigheaza(URL_T);
    await panaCand(b, `typeof deschideT212==="function"`, 25000, "aplicatia");
    if (TOKEN) await b.ev(`try{localStorage.setItem("cryptoRadarApiTokenV54",${JSON.stringify(TOKEN)})}catch(e){}`);
    await b.ev(`setAssetClass("CRYPTO");document.querySelector('.sideBtn[data-nav="t212"]').click()`);
    await panaCand(b, `!!document.querySelector("#t212Sus .t212Kpi")`, 40000, "cifrele contului");
    await asteapta(1500);
    await test("monitor 1920 · cardul T212 are cel mult 1.180 px (ca demo-ul), nu tot ecranul", async () => {
      assert.ok((await b.ev(`document.getElementById("t212Card").getBoundingClientRect().width`)) <= 1181);
    });
    await test("monitor 1920 · Trading 212 e pagina lui: fara bara de cautare / blocul pietei / file deasupra", async () => {
      assert.equal(await b.ev(`getComputedStyle(document.querySelector(".heroStrip")).display`), "none");
      assert.equal(await b.ev(`document.getElementById("t212").classList.contains("on")`), true);
    });
    await test("monitor 1920 · Tabloul botului (v86): latimea demo-ului, 'Ce ai de facut acum' fara dubluri, coloanele nu se suprapun", async () => {
      await b.ev(`navTo('tabloubot',true)`);
      await panaCand(b, `document.querySelectorAll("#tbTodoLista .tbTodoRand").length>0`, 60000, "lista 'ce ai de facut'");
      await asteapta(4000);
      assert.ok((await b.ev(`document.querySelector("#tabloubot .tbCadru").getBoundingClientRect().width`)) <= 1181);
      assert.equal(await b.ev(`getComputedStyle(document.querySelector(".heroStrip")).display`), "none");
      const titluri = await b.ev(`[...document.querySelectorAll("#tbTodoLista .tbTodoRand b")].map(x=>x.textContent.toLowerCase())`);
      assert.equal(new Set(titluri).size, titluri.length, "randuri dublate: " + titluri.join(" | "));
      const r = await b.ev(`(()=>{const a=document.querySelector("#tabloubot .tbMain").getBoundingClientRect(),c=document.querySelector("#tabloubot .tbSideNou").getBoundingClientRect();return a.right<=c.left+1||c.right<=a.left+1||a.bottom<=c.top+1||c.bottom<=a.top+1})()`);
      assert.equal(r, true, "graficul si coloana din dreapta se suprapun");
      for (const id of ["tbKpiPozPill", "tbGrafic", "tbScenarii", "tbDirectie", "tbBani", "tbAcum", "tbSfaturi", "tbFisaBot", "tbSapt", "tbPlanStare", "tbAlerteStare", "tbPort", "tbMasuri"]) assert.ok(await b.ev(`!!document.getElementById("${id}")`), "lipseste #" + id);
      await b.ev(`tbDeschidePlan()`); assert.equal(await b.ev(`document.getElementById("tbPl-plan").open`), true, "'Scrie planul' deschide planul");
      // v87: randul cu tot contul si pe Tablou; ritmul de recuperare langa rezultat (cand botul e pe minus)
      await panaCand(b, `/Trading 212/.test(document.querySelector("#tabloubot [data-cont-tot]").innerText)`, 30000, "randul contului pe Tablou");
      const sub = await b.ev(`document.getElementById("tbKpiTotalSub").textContent`), tot = await b.ev(`tbStare.bot&&+tbStare.bot.profitTotal`);
      if (tot < 0) assert.match(sub, /zile până pe zero|nu se recuperează/, "ritmul de recuperare: " + sub);
    });
    await test("monitor 1920 · dupa clic pe Trading 212, cifrele contului se vad (nu sunt sub bara de sus)", async () => {
      await b.ev(`document.querySelector('.sideBtn[data-nav="t212"]').click()`); await asteapta(1500);
      const r = await b.ev(`(()=>{const k=document.querySelector("#t212Sus .t212Kpi").getBoundingClientRect();const x=k.left+30,y=k.top+12;const e=document.elementFromPoint(x,y);return {top:Math.round(k.top),pe:!!(e&&e.closest("#t212Card"))}})()`);
      assert.equal(r.pe, true, "la y=" + r.top + " peste cifre e alt element (bara de sus)");
    });
  } finally { b.inchide(); await asteapta(800); await stergeProfilul(pr); }
}
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
