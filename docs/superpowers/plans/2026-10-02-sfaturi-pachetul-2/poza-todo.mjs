// Poza reala a listei „Ce ai de făcut acum” si a Consilierului pe Tablou (pagina locala :8788, datele lui reale).
// Tokenul se citeste din .dev.vars si nu se tipareste. Rulare: node poza-todo.mjs <dosarPoze> [latime...]
import { spawn, spawnSync } from "node:child_process";
import { rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const URL_T = "http://127.0.0.1:8788/";
const DOSAR = process.argv[2] || path.join(tmpdir(), "poza-todo");
const LATIMI = process.argv.slice(3).map(Number).filter(Boolean);
mkdirSync(DOSAR, { recursive: true });
const TOKEN = (() => { try { const m = readFileSync("C:/Users/Cimin/crypto/.dev.vars", "utf8").match(/^APP_API_TOKEN=(.*)$/m); return m ? m[1].trim().replace(/^"|"$/g, "") : ""; } catch { return ""; } })();
const BROWSER = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((c) => existsSync(c));
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));
const BOOT = `(() => { if (navigator.serviceWorker) { try { navigator.serviceWorker.register = () => Promise.reject(new Error("sw oprit")); } catch {} } })();`;

async function porneste(lat, inal, profil) {
  const port = 9300 + Math.floor(Math.random() * 300);
  const proc = spawn(BROWSER, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, `--window-size=${lat},${inal}`,
    "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
  let tinta;
  for (let i = 0; i < 80 && !tinta; i++) { try { tinta = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} if (!tinta) await asteapta(250); }
  if (!tinta) { try { proc.kill(); } catch {} throw new Error("browserul nu a pornit"); }
  const ws = new WebSocket(tinta.webSocketDebuggerUrl); let id = 0; const astept = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && astept.has(m.id)) { astept.get(m.id)(m.result); astept.delete(m.id); } };
  await new Promise((r) => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise((res) => { const n = ++id; astept.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: true }); await send("Network.setCacheDisabled", { cacheDisabled: true });
  try { await send("Storage.clearDataForOrigin", { origin: new URL(URL_T).origin, storageTypes: "all" }); } catch {}
  await send("Page.addScriptToEvaluateOnNewDocument", { source: BOOT });
  await send("Emulation.setDeviceMetricsOverride", { width: lat, height: inal, deviceScaleFactor: 1, mobile: lat < 600 });
  return {
    async ev(expr) { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r?.exceptionDetails) throw new Error(String(r.exceptionDetails?.exception?.description ?? r.exceptionDetails?.text).slice(0, 300)); return r?.result?.value; },
    async navigheaza(url) { await send("Page.navigate", { url }); },
    async pozaEl(sel, fisier) {
      const d = await this.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView();const r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height}})()`);
      if (!d) return false;
      const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: d.x, y: d.y, width: Math.max(1, d.w), height: Math.max(1, d.h), scale: 1 } });
      writeFileSync(fisier, Buffer.from(r.data, "base64")); return true;
    },
    inchide() { try { ws.close(); } catch {} if (proc.pid) { try { spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} } },
  };
}
for (const lat of LATIMI.length ? LATIMI : [1920, 390]) {
  const profil = path.join(tmpdir(), "poza-todo-" + lat + "-" + Date.now());
  const b = await porneste(lat, 1400, profil);
  try {
    await b.navigheaza(URL_T); await asteapta(2500);
    if (TOKEN) await b.ev(`try{localStorage.setItem("cryptoRadarApiTokenV54",${JSON.stringify(TOKEN)})}catch(e){}`);
    await b.navigheaza(URL_T); await asteapta(3000);
    await b.ev(`navTo('tabloubot',true)`);
    let gata = false;
    for (let i = 0; i < 90 && !gata; i++) { gata = await b.ev(`!!(document.querySelector("#tbTodoLista .tbTodoRand")&&document.querySelector("#tabloubot .tbCons"))`).catch(() => false); if (!gata) await asteapta(1000); }
    await asteapta(4000);
    const txt = await b.ev(`(()=>{const t=document.querySelector("#tbTodoLista");const c=document.querySelector("#tabloubot .tbCons");return {todo:t?t.innerText:"",cons:c?c.innerText:""}})()`);
    writeFileSync(path.join(DOSAR, "text-" + lat + ".txt"), "=== CE AI DE FACUT ===\n" + txt.todo + "\n\n=== CONSILIER ===\n" + txt.cons);
    const sel = await b.ev(`(()=>{const t=document.querySelector("#tbTodoLista");let p=t;while(p&&p.parentElement&&!/tbBloc|tbCard|tbPanou/.test(p.className))p=p.parentElement;return p&&p.id?"#"+p.id:"#tbTodoLista"})()`);
    console.log(lat, "todo:", await b.pozaEl(sel, path.join(DOSAR, "todo-" + lat + ".png")), "cons:", await b.pozaEl("#tabloubot .tbCons", path.join(DOSAR, "cons-" + lat + ".png")), "gata:", gata);
  } finally { b.inchide(); await asteapta(800); try { rmSync(profil, { recursive: true, force: true }); } catch {} }
}
