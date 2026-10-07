// PROBA DE ECRAN - TELEFON (v100.122; el 07.10: „aplicația crypto se vede aiurea pe telefon”, apoi „fă” pe ideea
// „o probă care pozează automat toate paginile din meniu la 390 px”). Chrome/Edge real prin CDP, la 390×844 mobil.
//
// Ce face: deschide Radarul local cu parola din .dev.vars, intră pe FIECARE pagină din meniu (lista citită din
// index.html, nu scrisă de mână - o pagină nouă intră singură) și pică dacă:
//   - pagina e mai lată decât ecranul (se mișcă în lateral);
//   - banda de sus (lipită) e mai înaltă de 100 px (pe telefon mânca o cincime din ecran);
//   - pagina aruncă o excepție.
// Poze: <dosar>/tel-<pagina>.png.
//
// Rulare (server pe :8788 - PORNESTE-CRYPTO-RADAR.bat; NU intră în npm test, ca test:ecran-grid):
//   node scripts/proba-ecran-telefon.mjs [url] [dosarPoze] [pagina1,pagina2]
import { spawn } from "node:child_process";
import { rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const URL_T = (process.argv[2] || "http://127.0.0.1:8788/").replace(/\/+$/, "") + "/";
const DOSAR_POZE = process.argv[3] || path.join(tmpdir(), "proba-ecran-telefon");
mkdirSync(DOSAR_POZE, { recursive: true });
const TOKEN = (() => {
  try { const m = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").match(/^APP_API_TOKEN\s*=\s*"?([^"\r\n]+)"?/m); return m ? m[1].trim() : ""; } catch { return ""; }
})();
const BROWSER = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((c) => existsSync(c));
const LAT = 390, INALT = 844, BANDA_MAX = 100;
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const meniu = html.slice(html.indexOf('<div class="sideMenu">'), html.indexOf('<div class="sideFooter">'));
const PAGINI = process.argv[4] ? process.argv[4].split(",") : [...new Set([...meniu.matchAll(/data-nav="([a-z0-9]+)"/g)].map((x) => x[1]))];
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));

if (!BROWSER) { console.log("PICA: nu găsesc Chrome sau Edge"); process.exit(1); }
if (!TOKEN) { console.log("PICA: lipsește APP_API_TOKEN din .dev.vars"); process.exit(1); }
const port = 9500 + Math.floor(Math.random() * 300);
const profil = path.join(tmpdir(), "proba-ecran-telefon-" + port);
const br = spawn(BROWSER, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, `--window-size=${LAT},${INALT}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let picate = 0;
try {
  let t; for (let i = 0; i < 80 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} if (!t) await asteapta(250); }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const m = new Map(); let exc = [];
  const tr = (method, params = {}) => new Promise((res) => { const n = ++id; m.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  ws.onmessage = (e) => { const x = JSON.parse(e.data); if (x.id && m.has(x.id)) { m.get(x.id)(x.result); m.delete(x.id); }
    if (x.method === "Runtime.exceptionThrown") { const d = x.params.exceptionDetails.exception?.description ?? x.params.exceptionDetails.text; exc.push(String(d).slice(0, 200)); } };
  await new Promise((r) => { ws.onopen = r; });
  await tr("Runtime.enable"); await tr("Page.enable");
  await tr("Emulation.setDeviceMetricsOverride", { width: LAT, height: INALT, deviceScaleFactor: 2, mobile: true });
  await tr("Emulation.setTouchEmulationEnabled", { enabled: true });
  const ev = async (x) => (await tr("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value;
  await tr("Page.navigate", { url: URL_T }); await asteapta(3000);
  await ev(`localStorage.setItem("cryptoRadarApiTokenV54", ${JSON.stringify(TOKEN)})`);
  await tr("Page.reload"); await asteapta(9000);
  const ver = await ev(`(document.getElementById("antetVersiune")||{}).textContent||""`);
  console.log(`\nPROBA DE ECRAN · TELEFON ${LAT} px · ${PAGINI.length} pagini · ${ver.split(" ·")[0]}\n`);
  for (const p of PAGINI) {
    exc = [];
    await ev(`navTo(${JSON.stringify(p)},true)`); await asteapta(p === "tabloubot" ? 6000 : 2500);
    const r = await ev(`(() => { scrollTo(0,0); const s = document.querySelector(".topStatus"); return { lat: document.documentElement.scrollWidth, banda: s ? Math.round(s.getBoundingClientRect().height) : 0 }; })()`);
    const poza = await tr("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(DOSAR_POZE, `tel-${p}.png`), Buffer.from(poza.data, "base64"));
    const rele = [];
    if (r.lat > LAT + 1) rele.push(`lată de ${r.lat} px pe ${LAT}`);
    if (r.banda > BANDA_MAX) rele.push(`banda de sus ${r.banda} px (max ${BANDA_MAX})`);
    if (exc.length) rele.push("excepție: " + exc[0]);
    if (rele.length) { picate++; console.log(`  PICA ${p}: ${rele.join(" · ")}`); } else console.log(`  ok   ${p} (banda ${r.banda} px)`);
  }
  ws.close();
} finally {
  br.kill(); await asteapta(1500);
  try { rmSync(profil, { recursive: true, force: true }); } catch {}
}
console.log(`\n${PAGINI.length - picate}/${PAGINI.length} trec · poze în ${DOSAR_POZE}`);
if (picate) process.exit(1);
