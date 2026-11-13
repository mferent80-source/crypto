// I-865 (v100.336): paza paginilor Radarului pe VPS - Piața azi, Tabloul botului, Trading 212, la 1920 și 412 px, una câte una.
// Rulează din sarcina programată „Crypto Radar paza pagini” (dimineața la 07:50 și la cerere după fiecare livrare: schtasks /Run).
// Deschide pagina în Chrome fără fereastră (prioritate joasă: pe același VPS e gestiunea), așteaptă să se liniștească, judecă (scripts/lib/paza-pagini.mjs).
// O pagină cu abateri se redeschide după un minut; pe Discord pleacă doar ce s-a găsit de ambele dăți. Jurnalul: data/paza-pagini.log.
// Parola aplicației (APP_API_TOKEN) se citește din .dev.vars și merge doar la serverul local (127.0.0.1 / localhost). Nu scrie date în Radar.
// Revizia v100.336: fiecare cerere către browser are limită (15 s); aplicația care nu pornește se spune pe loc (fără cele 45 s de liniștire); browserul se
// oprește cu tot arborele lui (taskkill /T); portul de depanare îl alege Chrome (fără ciocniri); tot rondul are un termen (15 min) - la depășire, mesajul pleacă.
//   node scripts/vps/paza-pagini.mjs [--url=http://127.0.0.1:8788/] [--latimi=1920,412] [--pagini=dash,tabloubot,t212] [--motiv=dimineata] [--fara-discord]
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, appendFileSync, mkdirSync, rmSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { judeca, repetate, mesaj, CITIRE } from "../lib/paza-pagini.mjs";
import { mesajDiscord, esteWebhookDiscord } from "../lib/canal-discord.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith("--" + n + "=")); return a ? a.slice(n.length + 3) : d; };
const URL_R = arg("url", "http://127.0.0.1:8788/"), LATIMI = arg("latimi", "1920,412").split(",").map(Number), PAGINI = arg("pagini", "dash,tabloubot,t212").split(",");
const MOTIV = arg("motiv", "verificare"), FARA_DISCORD = process.argv.includes("--fara-discord"), LINISTE_S = Number(arg("liniste", 45)), TERMEN_MS = Number(arg("termen", 15)) * 60000;
const VARS = {}; try { for (const l of readFileSync(path.join(RAD, ".dev.vars"), "utf8").split(/\r?\n/)) { const m = /^([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(l); if (m) VARS[m[1]] = m[2]; } } catch {}
const TOKEN = VARS.APP_API_TOKEN || "", WEBHOOK = process.env.DISCORD_WEBHOOK || VARS.DISCORD_WEBHOOK || "";
const BROWSER = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((c) => existsSync(c));
const JURNAL = path.join(RAD, "data", "paza-pagini.log"), T0 = Date.now();
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));
const scrie = (t) => { const r = new Date().toISOString() + " " + t; console.log(r); try { mkdirSync(path.dirname(JURNAL), { recursive: true }); appendFileSync(JURNAL, r + "\n"); } catch {} };
function eLocal(u) { try { const x = new URL(u); return x.protocol === "http:" && ["127.0.0.1", "localhost"].includes(x.hostname) && !x.username && !x.password; } catch { return false; } }
if (!eLocal(URL_R)) { scrie("refuz: parola merge doar la serverul local, nu la " + URL_R); process.exit(2); }
const opreste = (pid) => { try { if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" }); else process.kill(pid); } catch {} };

async function deschide(pagina, latime) {
  const profil = mkdtempSync(path.join(os.tmpdir(), "paza-pagini-"));
  const br = spawn(BROWSER, ["--headless=new", "--disable-sync", "--disable-extensions", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
  try { os.setPriority(br.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
  const exc = [], m = new Map(); let ws = null, id = 0;
  try {
    let port = null; for (let i = 0; i < 80 && !port; i++) { try { port = Number(readFileSync(path.join(profil, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]) || null; } catch {} if (!port) await asteapta(250); }
    let t; for (let i = 0; i < 40 && port && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) })).json()).find((x) => x.type === "page"); } catch {} if (!t) await asteapta(250); }
    if (!t) return { pagina, latime, panou: null, exceptii: ["browserul n-a pornit"] };
    ws = new WebSocket(t.webSocketDebuggerUrl);
    const respinge = (e) => { for (const [, f] of m) f.nu(e); m.clear(); };
    const tr = (method, params = {}) => new Promise((da, nu) => { const n = ++id, ceas = setTimeout(() => { m.delete(n); nu(new Error("browserul nu răspunde la " + method)); }, 15000); m.set(n, { da: (r) => { clearTimeout(ceas); da(r); }, nu: (e) => { clearTimeout(ceas); nu(e); } }); ws.send(JSON.stringify({ id: n, method, params })); });
    ws.onmessage = (e) => { const x = JSON.parse(e.data); if (x.id && m.has(x.id)) { m.get(x.id).da(x.result); m.delete(x.id); } if (x.method === "Runtime.exceptionThrown") exc.push(String(x.params.exceptionDetails.exception?.description ?? x.params.exceptionDetails.text).split("\n")[0].slice(0, 200)); };
    ws.onerror = () => respinge(new Error("legătura cu browserul a căzut")); ws.onclose = () => respinge(new Error("browserul s-a închis"));
    await new Promise((da, nu) => { ws.onopen = da; setTimeout(() => nu(new Error("browserul nu primește legătura")), 10000); });
    await tr("Runtime.enable"); await tr("Page.enable");
    await tr("Emulation.setDeviceMetricsOverride", { width: latime, height: latime < 600 ? 915 : 1080, deviceScaleFactor: 1, mobile: latime < 600 });
    await tr("Page.addScriptToEvaluateOnNewDocument", { source: `if (navigator.serviceWorker) { try { navigator.serviceWorker.register = () => Promise.reject(new Error("paza: fără sw")); } catch {} } try { localStorage.setItem("cryptoRadarApiTokenV54", ${JSON.stringify(TOKEN)}); } catch {}` });
    await tr("Page.navigate", { url: URL_R });
    const ev = async (x) => { const r = await tr("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); return r?.result?.value; };
    let gata = false; for (let i = 0; i < 60 && !gata; i++) { await asteapta(500); try { gata = (await ev(`typeof navTo === "function" && document.readyState === "complete"`)) === true; } catch {} }
    if (!gata) return { pagina, latime, panou: null, exceptii: exc.concat(["aplicația n-a pornit în 30 s (serverul nu răspunde sau pagina a crăpat)"]) };
    await asteapta(1500); await ev(`try { navTo(${JSON.stringify(pagina)}, true) } catch (e) {}`);
    await asteapta(LINISTE_S * 1000);
    const o = JSON.parse((await ev(CITIRE)) || "{}");
    try { await tr("Browser.close"); } catch {}
    return Object.assign({ pagina, latime, exceptii: exc }, o);
  } catch (e) { return { pagina, latime, panou: null, exceptii: exc.concat(["paza: " + String(e && e.message || e).slice(0, 160)]) }; }
  finally { try { ws && ws.close(); } catch {} opreste(br.pid); await asteapta(800); try { rmSync(profil, { recursive: true, force: true }); } catch {} }
}

if (!BROWSER) { scrie("fără Chrome / Edge pe mașina asta: paza nu rulează"); process.exit(2); }
if (!TOKEN) { scrie("fără APP_API_TOKEN în .dev.vars: paza nu rulează"); process.exit(2); }
const gasite = []; let peste = false;
for (const pagina of PAGINI) for (const latime of LATIMI) {
  if (Date.now() - T0 > TERMEN_MS) { peste = true; break; }
  const a = judeca(await deschide(pagina, latime));
  if (!a.length) { scrie(`ok ${pagina} ${latime}`); continue; }
  await asteapta(60000);
  const b = judeca(await deschide(pagina, latime)), r = repetate(a, b);
  scrie(`${r.length ? "ABATERE" : "trecătoare"} ${pagina} ${latime}: ${(r.length ? r : a).map((x) => x.text).join(" | ")}`);
  if (r.length) gasite.push({ pagina, latime, abateri: r });
}
if (peste) { gasite.push({ pagina: "paza", latime: 0, abateri: [{ cheie: "termen", text: "rondul n-a terminat în " + Math.round(TERMEN_MS / 60000) + " minute; paginile rămase n-au fost verificate" }] }); scrie("termen depășit"); }
const msg = mesaj(gasite, MOTIV);
if (msg && !FARA_DISCORD && esteWebhookDiscord(WEBHOOK)) {
  try { const r = await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mesajDiscord(msg)), signal: AbortSignal.timeout(15000) }); scrie("Discord: " + r.status); } catch (e) { scrie("Discord picat: " + String(e && e.message || e)); }
}
scrie(`gata (${MOTIV}): ${gasite.length === 1 ? "o pagină cu abateri" : gasite.length ? gasite.length + " pagini cu abateri" : "nicio abatere"}`);
process.exit(gasite.length ? 1 : 0);
