// PROBA DE ECRAN - Grid: ce setez acum? (v78), Chrome/Edge real prin CDP, pe
// DATE REALE de la Pionex (de acasa; pe Cloudflare Pionex refuza).
//
// Ce face: deschide Radarul local, intra in fereastra Grid, pune MET + 100,
// apasa "Calculeaza acum" si citeste DOM-ul REAL: verdict, tabelul probei,
// butoanele de copiat, fara NaN/undefined pe ecran, consola curata. Apoi
// apasa Short (fara o noua aducere de lumanari), 3 zile, o moneda inexistenta
// si o suma goala. Face poze la 1440 si 390 px.
//
// Rulare (server pe :8788 - PORNESTE-CRYPTO-RADAR.bat; NU intra in npm test):
//   node scripts/proba-ecran-grid.mjs [url] [dosarPoze]
// Tokenul API se citeste din .dev.vars (APP_API_TOKEN) si nu se tipareste.
import { spawn, spawnSync } from "node:child_process";
import { rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const URL_T = (process.argv[2] || "http://127.0.0.1:8788/").replace(/\/+$/, "") + "/";
const DOSAR_POZE = process.argv[3] || path.join(tmpdir(), "proba-ecran-grid");
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
  let vede = ""; try { vede = await b.ev(`(document.getElementById("grFisa")||{innerText:""}).innerText.slice(0,300)+" | stare: "+(document.getElementById("grStare")||{textContent:""}).textContent`); } catch {}
  throw new Error(`am asteptat ${ms} ms degeaba: ${ce} · pe ecran: ${vede}`);
}

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}

const FISA_TEXT = `document.getElementById("grFisa").innerText`;
const FARA_GUNOI = (t) => { for (const g of ["NaN", "undefined", "null", "Infinity", "[object"]) assert.ok(!t.includes(g), `pe ecran apare "${g}"`); };

async function scenariu(lat, inal, nume) {
  const profil = path.join(tmpdir(), `proba-grid-${nume}-${Date.now()}`);
  const b = await porneste(lat, inal, profil);
  try {
    await b.navigheaza(URL_T);
    await panaCand(b, `document.readyState==="complete"&&typeof porneGrid==="function"&&typeof GridProba!=="undefined"`, 25000, "aplicatia sa se incarce");
    if (TOKEN) await b.ev(`try{localStorage.setItem("cryptoRadarApiTokenV54",${JSON.stringify(TOKEN)})}catch(e){}`);
    await b.ev(`navTo('gridset',true)`);

    await test(`${nume} · MET + 100 -> fisa apare, cu verdict, directie, 3 coloane, butoane de copiat, fara gunoi`, async () => {
      await b.ev(`document.getElementById("grMoneda").value="MET";document.getElementById("grSuma").value="100";gridCalculeaza('fortat')`);
      await panaCand(b, `!!document.querySelector("#grFisa .grVerdict")`, 90000, "verdictul (Pionex, 8 cereri cu pauze)");
      const t = await b.ev(FISA_TEXT);
      assert.match(t, /PORNEȘTE|AȘTEAPTĂ|NU PORNI|FĂRĂ DATE/);
      assert.match(t, /LONG|NEUTRU|SHORT/);
      assert.equal(await b.ev(`document.querySelectorAll("#grFisa .grTabel thead th").length`), 4);
      assert.equal(await b.ev(`document.querySelectorAll("#grFisa .grTabel tbody tr").length`), 7);
      assert.ok((await b.ev(`document.querySelectorAll("#grFisa .grCopy").length`)) >= 7, "butoane de copiat");
      assert.match(t, /Preț de jos/); assert.match(t, /Număr de grile/); assert.match(t, /De câte ori a lovit stopul/);
      FARA_GUNOI(t);
      assert.match(await b.ev(`document.getElementById("grStare").textContent`), /calculat la/);
    });

    await test(`${nume} · Short -> setarea devine Short, FARA alta aducere de lumanari`, async () => {
      const n0 = await b.ev(`window.__proba.apeluri.filter(a=>a.startsWith("market?type=pionex_klines")).length`);
      await b.ev(`gridDirectie('short')`);
      await panaCand(b, `/Direcție\\s*\\n?\\s*Short/.test(document.getElementById("grFisa").innerText)&&!grStare.inLucru`, 15000, "fisa pe short");
      const n1 = await b.ev(`window.__proba.apeluri.filter(a=>a.startsWith("market?type=pionex_klines")).length`);
      assert.equal(n1, n0, `lumanarile s-au adus din nou (${n0} -> ${n1})`);
      assert.match(await b.ev(FISA_TEXT), /aleasă de tine/);
      FARA_GUNOI(await b.ev(FISA_TEXT));
    });

    await test(`${nume} · 3 zile -> proba spune "ferestre de 3z"`, async () => {
      await b.ev(`gridDirectie('auto');gridOrizont(3)`);
      await panaCand(b, `/ferestre de 3z/.test(document.getElementById("grFisa").innerText)&&!grStare.inLucru`, 15000, "3z");
      FARA_GUNOI(await b.ev(FISA_TEXT));
    });

    await b.poza(path.join(DOSAR_POZE, `grid-${nume}.png`));

    await test(`${nume} · moneda inexistenta -> "nu există ca PERP"; suma goala -> "Scrie suma"`, async () => {
      await b.ev(`document.getElementById("grMoneda").value="NUEXISTA";gridCalculeaza('fortat')`);
      await panaCand(b, `/nu există ca PERP/.test(document.getElementById("grFisa").innerText)&&!grStare.inLucru`, 30000, "moneda inexistenta");
      const t = await b.ev(FISA_TEXT); assert.match(t, /NUEXISTA nu există ca PERP/);
      await b.ev(`document.getElementById("grMoneda").value="MET";document.getElementById("grSuma").value="";gridCalculeaza('fortat')`);
      assert.match(await b.ev(FISA_TEXT), /Scrie suma/);
    });

    await test(`${nume} · v79: "cat investesc?" din sold; jurnalul primeste intrarea la apasare; cutia de clasament exista`, async () => {
      await b.ev(`document.getElementById("grMoneda").value="MET";document.getElementById("grSuma").value="100";document.getElementById("grSold").value="486";gridSold();gridCalculeaza('fortat')`);
      await panaCand(b, `!!document.querySelector("#grFisa .grVerdict")&&!grStare.inLucru`, 90000, "fisa dupa sold");
      const t = await b.ev(FISA_TEXT);
      assert.match(t, /Cât investesc\?[\s\S]{0,40}cel mult \d+ USDT/, "randul 'cat investesc' cu suma maxima");
      assert.match(t, /Am pornit botul cu setarea asta/);
      const n0 = await b.ev(`(JSON.parse(localStorage.getItem("grJurnal")||"[]")).length`);
      await b.ev(`gridJurnalAdauga()`);
      await asteapta(1500);
      const n1 = await b.ev(`(JSON.parse(localStorage.getItem("grJurnal")||"[]")).length`);
      assert.equal(n1, n0 + 1, "jurnalul nu a primit intrarea");
      assert.match(await b.ev(`document.getElementById("grJurnal").innerText`), /MET/);
      assert.ok(await b.ev(`!!document.getElementById("grClasament")`), "cutia de clasament lipseste");
      FARA_GUNOI(await b.ev(`document.getElementById("grJurnal").innerText`));
      await b.ev(`localStorage.removeItem("grJurnal")`);
    });

    await test(`${nume} · v80 Tabloul botului: "botul vs fisa" cu tabel + "pe zi / la inchidere" cu cifre, fara gunoi`, async () => {
      await b.ev(`navTo('tabloubot',true)`);
      await panaCand(b, `!!document.querySelector("#tbFisaBot .tbCmp")`, 120000, "tabelul bot vs fisa");
      // v82: semaforul sus, cu nivel + motiv + "ce as face eu"
      await panaCand(b, `/ȚINE|ATENȚIE|IEȘI/.test(document.getElementById("tbSemafor").innerText)`, 30000, "semaforul");
      const ts = await b.ev(`document.getElementById("tbSemafor").innerText`);
      assert.match(ts, /Ce aș face eu/); FARA_GUNOI(ts);
      const t1 = await b.ev(`document.getElementById("tbFisaBot").innerText`), t2 = await b.ev(`document.getElementById("tbAcum").innerText`);
      assert.match(t1, /Pas net pe grilă/); assert.match(t1, /Verdictul de azi/);
      assert.match(t2, /Grile, ultimele 24 h/); assert.match(t2, /Dacă îl închizi acum, iei[\s\S]{0,10}\d/); assert.match(t2, /Prețul la care botul e pe zero/);
      FARA_GUNOI(t1); FARA_GUNOI(t2);
      // v80.1: sfaturile au "Ce as face eu" si nu mai vorbesc de opritor / USDT liberi
      await panaCand(b, `/Ce aș face eu/.test(document.getElementById("tbSfaturi").innerText)`, 30000, "sfaturile cu 'ce as face eu'");
      const t3 = await b.ev(`document.getElementById("tbSfaturi").innerText`);
      assert.ok(!/[Oo]pritorul|USDT liberi/.test(t3), "au ramas sfaturile scoase: " + t3.slice(0, 200)); FARA_GUNOI(t3);
      // v81: saptamana, planul (salvat pe server si citit inapoi), marja, vs pozitie
      await panaCand(b, `/Bara = cât au adus grilele|n-a strâns încă/.test(document.getElementById("tbSapt").innerText)`, 30000, "saptamana");
      assert.match(await b.ev(`document.getElementById("tbAcum").innerText`), /simplu, aceeași sumă și levier/);
      await b.ev(`document.getElementById("tbPlanPlus").value="5";document.getElementById("tbPlanMinus").value="10";tbPlanSalveaza()`);
      await panaCand(b, `/Țintă pe plus/.test(document.getElementById("tbPlanStare").innerText)`, 20000, "planul salvat");
      await b.ev(`tbMarjaCalc("20")`);
      assert.match(await b.ev(`document.getElementById("tbMarjaRez").innerText`), /Cu \+20 USDT marjă/);
      FARA_GUNOI(await b.ev(`document.getElementById("tbPlanCard").innerText + document.getElementById("tbSaptCard").innerText`));
      await b.poza(path.join(DOSAR_POZE, `tablou-${nume}.png`));
      // curata planul de proba de pe server
      await b.ev(`apiFetch("/api/istoric-bot?action=plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({bot:tbStare.bot.id,plan:null})})`);
      await b.ev(`navTo('gridset',true)`);
    });

    await test(`${nume} · v81 Jurnalul de trade: botii inchisi reali, greselile ordonate, notita se salveaza`, async () => {
      await b.ev(`navTo('jurnaltrade',true)`);
      await panaCand(b, `/COTI/.test(document.getElementById("jtLista").innerText)`, 60000, "lista de trade-uri");
      const t = await b.ev(`document.getElementById("jurnaltrade").innerText`);
      assert.match(t, /Rezultat total/); assert.match(t, /Greșelile care te-au costat/); assert.match(t, /Poziția a mâncat grilele/);
      assert.match(t, /Dacă ascultai de Radar/); assert.match(t, /Radarul ar fi zis/);
      FARA_GUNOI(t);
      await b.ev(`(function(){var e=document.querySelector(".jtNota");e.value="proba";e.dispatchEvent(new Event("change",{bubbles:true}))})()`);
      assert.match(await b.ev(`localStorage.getItem("jtNote")||""`), /proba/);
      await b.poza(path.join(DOSAR_POZE, `jurnal-${nume}.png`));
      await b.ev(`localStorage.removeItem("jtNote");navTo('gridset',true)`);
    });

    await test(`${nume} · consola curata, fara scroll orizontal`, async () => {
      assert.deepEqual(b.exceptii, []); assert.deepEqual(b.consola, []);
      const w = await b.ev(`document.documentElement.scrollWidth`);
      assert.ok(w <= lat, `scrollWidth ${w} > ${lat}`);
    });
  } finally {
    b.inchide(); await asteapta(800); await stergeProfilul(profil);
  }
}

console.log(`\nV78 · Grid: ce setez acum? · proba de ecran pe ${URL_T} (date reale Pionex)\n`);
if (!BROWSER) { console.log("  nu gasesc Chrome/Edge"); process.exit(2); }
if (!process.env.DOAR_TELEFON) {
  await scenariu(1440, 900, "pc");
  // un om nu deschide doua ferestre in acelasi minut: serverul are 45 de cereri Pionex/minut pe IP,
  // iar scenariul de PC singur face ~20. Fara pauza, telefonul ar masura limita, nu ecranul.
  await asteapta(65000);
}
await scenariu(390, 844, "telefon");
console.log(`\npoze in ${DOSAR_POZE}\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
