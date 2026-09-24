// GARZILE v74.6 - ce nu prindea `npm test` la auditul sever din 24.09.
//
// Auditul a stricat intentionat codul in 36 de feluri; 15 au trecut neprinse.
// Fiecare sectiune de mai jos pazeste una din gaurile alea si a fost MASURATA
// PRIN STRICARE: s-a stricat codul pazit si s-a vazut ca sectiunea pica, cu
// mesajul de aici. Rulare:
//   node scripts/garzi-v746.mjs                  toate
//   node scripts/garzi-v746.mjs --doar=auth,sw   doar unele
//   node scripts/garzi-v746.mjs --fara=lansatoare-viu
//
// Sectiuni: auth, ecran-vm, sw, versiune, package, gate, headers, gitignore,
// lansatoare, lansatoare-viu (ultima ruleaza PowerShell-ul scos din .bat - doar pe Windows).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const RADACINA = path.dirname(fileURLToPath(new URL("../x", import.meta.url)));
const cale = (f) => path.join(RADACINA, f);
const citeste = (f) => fs.readFileSync(cale(f), "utf8");
const arg = (n) => (process.argv.find((x) => x.startsWith(`--${n}=`)) || "").slice(n.length + 3).split(",").filter(Boolean);
const DOAR = arg("doar"), FARA = arg("fara");

const rezultate = [];
function pica(garda, mesaj) { rezultate.push({ garda, ok: false, mesaj }); }
function trece(garda, mesaj) { rezultate.push({ garda, ok: true, mesaj }); }
const atentii = [];

// ─────────────────────────────────────────────────────────────────────────────
// 1. auth - fiecare ruta care nu e publica raspunde 401 fara token si cu token
//    GRESIT, si nu iese spre niciun furnizor. Pe fiecare handler se incearca:
//    fara actiune, o actiune INVENTATA, actiunile clasice (x==="..." pe
//    searchParams.get) care trebuie 401 exact, si orice text scurt din corpul
//    handlerului ca action=/type= (prinde switch/case, destructurare, .includes).
//    onRequest generic se probeaza cu GET/POST/PUT/DELETE/PATCH. Fara token,
//    niciun 2xx in afara formei de config a rutelor publice (runda 1, 24.09).
// ─────────────────────────────────────────────────────────────────────────────
// Rutele publice raspund fara token DOAR cu forma lor de config: cheile de mai jos,
// valori da/nu sau text scurt. Orice alta cheie (un pret, o lista, un sold) = date = PICA.
const CONFIG_PUBLIC = {
  market: ["ok", "service", "version"],                                                   // type=health
  push: ["configured", "publicKey", "subscriptionStore", "deliverySenderConfigured"],     // cheia publica VAPID
  intel: ["coingeckoKey", "twelveData", "btcNetwork", "news", "authRequired"],
  "external-intel": ["tradingEconomics", "coinMetrics", "whaleAlert", "coinglass", "deribit", "authRequired", "providers"],
  stocks: ["configured", "provider", "serverSideKey", "ndxSnapshotDate", "ndxCount", "authRequired"],
};
// Actiunile care TREBUIE sa raspunda fara token (si doar cu forma de mai sus).
const PUBLICE = new Set(["market GET type=health", "push GET action=config", "push GET action=status", "intel GET action=config", "external-intel GET action=config", "stocks GET action=config"]);
// NU e in lista: market type=futures (cere autentificare din v74.6).
const METODE = ["GET", "POST", "PUT", "DELETE", "PATCH"];

function formaDeConfig(modul, corp) {
  const chei = CONFIG_PUBLIC[modul];
  if (!chei) return `ruta ${modul} nu are voie la raspuns fara token`;
  let d; try { d = JSON.parse(corp); } catch { return "raspuns care nu e JSON"; }
  if (!d || typeof d !== "object" || Array.isArray(d)) return "raspuns care nu e obiect de config";
  const foaie = (v) => v === null || typeof v === "boolean" || (typeof v === "string" && v.length <= 100) || (typeof v === "number" && Number.isFinite(v));
  for (const [k, v] of Object.entries(d)) {
    if (!chei.includes(k)) return `cheie in plus "${k}" (date, nu config)`;
    if (v && typeof v === "object") {
      if (Array.isArray(v) || !Object.values(v).every((x) => typeof x === "string" && x.length <= 60)) return `"${k}" are date imbricate`;
    } else if (!foaie(v)) return `"${k}" nu e da/nu sau text scurt`;
  }
  return null;
}

function fisiereApi(dir) {
  const c = cale(dir);
  if (!fs.existsSync(c)) return [];
  return fs.readdirSync(c, { withFileTypes: true }).flatMap((x) =>
    x.isDirectory() ? fisiereApi(path.join(dir, x.name)) : x.name.endsWith(".js") ? [path.join(dir, x.name)] : []);
}

async function gardaAuth() {
  const G = "auth";
  const TOKEN = "garda-v746-token-corect";
  const fetchOriginal = globalThis.fetch;
  let iesiri = [];
  globalThis.fetch = async (u) => { iesiri.push(String(u && u.url || u)); throw new TypeError("proba: reteaua e taiata"); };
  let ip = 0, verificate = 0;
  const module = fisiereApi("functions/api");
  if (module.length < 10) pica(G, `gasesc doar ${module.length} module in functions/api - proba nu mai vede rutele`);
  const vazutePublice = new Set();
  try {
    for (const f of module) {
      const nume = path.relative(cale("functions/api"), cale(f)).replace(/\\/g, "/").replace(/\.js$/, "");
      const src = citeste(f);
      const mod = await import(pathToFileURL(cale(f)).href);
      const handlere = Object.keys(mod).filter((k) => /^onRequest(Get|Post|Put|Patch|Delete)?$/.test(k));
      if (!handlere.length) continue;
      const exporturi = [...src.matchAll(/export\s+(?:async\s+)?function\s+(onRequest\w*)|export\s+const\s+(onRequest\w*)/g)].map((m) => ({ nume: m[1] || m[2], index: m.index }));
      const corp = (h) => { const i = exporturi.findIndex((m) => m.nume === h); return i < 0 ? src : src.slice(exporturi[i].index, i + 1 < exporturi.length ? exporturi[i + 1].index : undefined); };
      for (const h of handlere) {
        const metode = h === "onRequest" ? METODE : [h.slice(9).toUpperCase()];
        const c = corp(h);
        // (a) forma clasica: x=u.searchParams.get("action") si x==="..." -> actiune CUNOSCUTA, trebuie 401 exact.
        const cunoscute = new Set();
        for (const v of c.matchAll(/(\w+)\s*=\s*\w+\.searchParams\.get\(\s*["'](action|type)["']\s*\)/g))
          for (const m of c.matchAll(new RegExp(`\\b${v[1]}\\s*[!=]==?\\s*["']([A-Za-z0-9_-]+)["']`, "g"))) cunoscute.add(`${v[2]}=${m[1]}`);
        // (b) orice alta forma (switch/case, destructurare, .includes, obiect de rute): toate
        //     textele scurte din corp care arata a nume de actiune, incercate si ca action=, si ca type=.
        //     Pentru ele regula e: fara token, niciun 2xx in afara formei de config.
        // Din TOT fisierul, nu doar din corpul handlerului: o functie de rutare pusa
        // deasupra (function ruteaza(action){switch(action){case "sold":...}}) ar scapa.
        const texte = new Set([...src.matchAll(/["'`]([A-Za-z][A-Za-z0-9_-]{0,39})["'`]/g)].map((m) => m[1]));
        const cereri = new Set(["", "action=__garda_inventata__", "type=__garda_inventata__", ...cunoscute]);
        for (const t of texte) { cereri.add(`action=${t}`); cereri.add(`type=${t}`); }
        for (const metoda of metode) {
          for (const q of cereri) {
            const cheie = `${nume} ${metoda}${q ? " " + q : ""}`;
            const publica = PUBLICE.has(cheie);
            for (const token of [null, "token-GRESIT"]) {
              iesiri = [];
              const url = `https://garda.test/api/${nume}${q ? "?" + q : ""}`;
              const headers = { origin: "https://garda.test", "content-type": "application/json", "cf-connecting-ip": `10.74.${(++ip >> 8) % 250}.${ip % 250}-${ip}` };
              if (token) headers.authorization = `Bearer ${token}`;
              // Corpul poarta si el actiunea: un onRequestPost care citeste b.action ar scapa cu "{}".
              const [pq, vq] = q ? q.split("=") : [];
              const corpCerere = metoda === "GET" ? undefined : JSON.stringify(q ? { [pq]: vq } : {});
              const request = new Request(url, { method: metoda, headers, body: corpCerere });
              let st, text = "";
              try { const r = await mod[h]({ request, env: { APP_API_TOKEN: TOKEN }, params: {}, waitUntil() {}, next: async () => new Response("urmatorul", { status: 599 }) }); st = r.status; text = await r.text(); }
              catch (e) { st = `exceptie ${e.message}`; }
              verificate++;
              const cine = `${cheie} ${token ? "cu token gresit" : "fara token"}`;
              if (iesiri.length) pica(G, `${cine}: a iesit spre ${iesiri[0]} fara token valid`);
              if (publica) {
                vazutePublice.add(cheie);
                if (st !== 200) pica(G, `${cine}: status ${st} - ruta publica trebuie sa raspunda 200`);
                const rau = formaDeConfig(nume, text);
                if (rau) pica(G, `${cine}: ruta publica da mai mult decat config - ${rau}`);
                continue;
              }
              if (cunoscute.has(q) && st !== 401) { pica(G, `${cine}: status ${st} (astept 401) - ruta nu e incuiata`); continue; }
              if (typeof st !== "number") { pica(G, `${cine}: ${st}`); continue; }
              if (st >= 200 && st < 300) {
                const rau = formaDeConfig(nume, text);
                if (rau) pica(G, `${cine}: status ${st} fara token valid - ${rau}`);
              } else if (st >= 500 && st !== 599) pica(G, `${cine}: status ${st} fara token valid - codul a trecut de poarta (astept 401 sau 4xx)`);
            }
          }
        }
      }
    }
  } finally { globalThis.fetch = fetchOriginal; }
  for (const p of PUBLICE) if (!vazutePublice.has(p)) pica(G, `ruta publica "${p}" nu mai exista in cod - lista publica e in urma`);
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, `${verificate} cereri fara token / cu token gresit pe ${module.length} module (toate metodele la onRequest generic, actiuni inventate si scoase din cod)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ecran-vm - app.js se incarca pana la capat (cu tablou-bot.js inainte, ca in
//    index.html) intr-un DOM minimal. Un app.js care moare la incarcare lasa
//    ecranul gol; `node --check` nu vede asta (o eroare de RULARE nu e de sintaxa).
// ─────────────────────────────────────────────────────────────────────────────
function domMinimal(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]);
  const atr = (tag, n) => (tag.match(new RegExp(`\\b${n}="([^"]*)"`)) || [])[1];
  const canvas = () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : p === "measureText" ? () => ({ width: 0 }) : /^create(Linear|Radial)Gradient$/.test(p) ? () => ({ addColorStop() {} }) : () => {}), set: (t, p, v) => { t[p] = v; return true; } });
  // Selectori simpli (tag, #id, .clasa, [atr], [atr="v"], liste cu virgula; din
  // "a b" / "a>b" conteaza ultimul pas; :not(...) si pseudo-clasele se ignora).
  function potriveste(e, sel) {
    return String(sel).split(",").some((bucata) => {
      const pas = bucata.trim().replace(/:not\([^)]*\)|::?[\w-]+(\([^)]*\))?/g, "").split(/[\s>+~]+/).filter(Boolean).pop() || "";
      if (!pas) return false;
      const tag = (pas.match(/^[a-zA-Z][\w-]*/) || [])[0];
      if (tag && tag.toLowerCase() !== e.tagName.toLowerCase()) return false;
      for (const m of pas.matchAll(/#([\w-]+)/g)) if (e.id !== m[1]) return false;
      for (const m of pas.matchAll(/\.([\w-]+)/g)) if (!e.classList.contains(m[1])) return false;
      for (const m of pas.matchAll(/\[([\w-]+)(?:([~^$*|]?=)["']?([^"'\]]*)["']?)?\]/g)) {
        const v = e.getAttribute(m[1]);
        if (v === null) return false;
        if (m[2] === "=" && v !== m[3]) return false;
      }
      return true;
    });
  }
  const toate = [];
  function el(id, tag = "div", atribute = {}) {
    const a = new Map(Object.entries(atribute));
    const cls = new Set(String(atribute.class || "").split(/\s+/).filter(Boolean));
    const dataset = {};
    for (const [k, v] of a) if (k.startsWith("data-")) dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v;
    const e = {
      id, tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), textContent: "", innerHTML: "", innerText: "", value: atribute.value || "", checked: "checked" in atribute, disabled: "disabled" in atribute, hidden: "hidden" in atribute,
      type: atribute.type || "", name: atribute.name || "", href: atribute.href || "",
      style: new Proxy({}, { get: (t, p) => (p === "setProperty" || p === "removeProperty" ? () => {} : t[p] ?? "") }),
      dataset, get className() { return [...cls].join(" "); }, set className(v) { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => cls.add(x)); },
      children: [], childNodes: [], options: [], firstChild: null, lastChild: null, parentNode: null, parentElement: null, nextSibling: null,
      offsetWidth: 0, offsetHeight: 0, clientWidth: 0, clientHeight: 0, scrollTop: 0, scrollHeight: 0, width: 300, height: 150,
      classList: { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; on ? cls.add(c) : cls.delete(c); return on; }, contains: (c) => cls.has(c), replace() {} },
      setAttribute: (n, v) => a.set(n, String(v)), getAttribute: (n) => (a.has(n) ? a.get(n) : null), removeAttribute: (n) => a.delete(n), hasAttribute: (n) => a.has(n),
      addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
      appendChild: (c) => c, append() {}, prepend() {}, removeChild: (c) => c, remove() {}, insertBefore: (c) => c, insertAdjacentHTML() {}, replaceChildren() {}, before() {}, after() {},
      querySelector: (s) => cauta(s)[0] || null, querySelectorAll: (s) => cauta(s),
      getElementsByTagName: (t) => cauta(t), getElementsByClassName: (c) => cauta(String(c).split(/\s+/).map((x) => "." + x).join("")),
      closest: () => null, matches: (s) => potriveste(e, s), contains: () => false,
      focus() {}, blur() {}, click() {}, scrollIntoView() {}, scrollTo() {}, select() {},
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }),
      getContext: () => canvas(), cloneNode: () => el(null, tag, Object.fromEntries(a)),
    };
    return e;
  }
  // Elementele REALE ale paginii, cu clasele si atributele lor: querySelectorAll('.card')
  // intoarce cardurile din index.html, nu o lista goala care ascunde orice crash din forEach.
  const byIdMap = new Map();
  for (const m of html.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    const atribute = {};
    for (const x of m[2].matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)) atribute[x[1].toLowerCase()] = x[2] ?? "";
    const e = el(atribute.id || null, m[1].toLowerCase(), atribute);
    toate.push(e);
    if (atribute.id && !byIdMap.has(atribute.id)) byIdMap.set(atribute.id, e);
  }
  function cauta(s) { try { return toate.filter((e) => potriveste(e, s)); } catch { return []; } }
  const byId = (id) => byIdMap.get(id) || null;
  const meta = (sel) => {
    const m = String(sel).match(/meta\[name=["']?([^"'\]]+)["']?\]/);
    const t = m && metas.find((x) => atr(x, "name") === m[1]);
    if (!t) return null;
    const e = el(null, "meta", { name: m[1], content: atr(t, "content") }); e.content = atr(t, "content"); e.name = m[1]; return e;
  };
  const stocare = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
  const document = {
    readyState: "complete", visibilityState: "visible", hidden: false, title: "", cookie: "", body: el("body", "body"), head: el("head", "head"), documentElement: el("html", "html"),
    getElementById: byId, querySelector: (s) => meta(s) || cauta(s)[0] || null, querySelectorAll: (s) => cauta(s),
    getElementsByTagName: (t) => cauta(t), getElementsByClassName: (c) => cauta(String(c).split(/\s+/).map((x) => "." + x).join("")),
    createElement: (t) => el(null, t), createTextNode: () => el(null, "#text"), createDocumentFragment: () => el(null, "#fragment"),
    addEventListener: (tip, fn) => { if (/^(load|DOMContentLoaded|readystatechange)$/.test(tip) && typeof fn === "function") pornire.push([tip, fn]); }, removeEventListener() {}, dispatchEvent: () => true,
  };
  // Timerele se strang aici si proba le ruleaza dupa pornire (cele scurte, 0-100 ms).
  const timere = new Map();
  const pornire = []; // ascultatori load / DOMContentLoaded, declansati o data de proba
  let nrTimer = 0;
  const pune = (fn, ms, repeta) => { const id = ++nrTimer; if (typeof fn === "function") timere.set(id, { fn, ms: Number(ms) || 0, repeta }); return id; };
  const scoate = (id) => { timere.delete(id); };
  const ctx = {
    document, console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    localStorage: stocare(), sessionStorage: stocare(),
    location: new URL("http://127.0.0.1:18799/"), navigator: { onLine: true, userAgent: "garda-v746", language: "ro" },
    setTimeout: (fn, ms) => pune(fn, ms, false), clearTimeout: scoate, setInterval: (fn, ms) => pune(fn, ms, true), clearInterval: scoate,
    requestAnimationFrame: (fn) => pune(fn, 16, false), cancelAnimationFrame: scoate,
    addEventListener: (tip, fn) => { if (/^(load|DOMContentLoaded|pageshow)$/.test(tip) && typeof fn === "function") pornire.push([tip, fn]); },
    fetch: () => Promise.reject(new TypeError("Failed to fetch (garda vm)")),
    WebSocket: class { constructor() { this.readyState = 0; } close() {} send() {} addEventListener() {} },
    Worker: class { postMessage() {} terminate() {} addEventListener() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {} }),
    removeEventListener() {}, dispatchEvent: () => true,
    alert() {}, confirm: () => false, prompt: () => null, open: () => null, scrollTo() {},
    getComputedStyle: () => new Proxy({}, { get: () => "" }), innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    crypto: globalThis.crypto, TextEncoder, TextDecoder, URL, URLSearchParams, AbortController, AbortSignal, Headers, Request, Response, Blob, structuredClone, performance,
    history: { pushState() {}, replaceState() {}, state: null },
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  return { ctx, timere, pornire, nrElemente: toate.length };
}

async function gardaEcranVm() {
  const G = "ecran-vm";
  const html = citeste("public/index.html");
  // Ordinea din index.html: tablou-bot.js, apoi app.js. O citesc din pagina, nu o presupun.
  const scripturi = [...html.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"/g)].map((m) => "public/" + m[1]);
  if (!scripturi.includes("public/app.js")) { pica(G, "index.html nu mai incarca /app.js"); return; }
  const { ctx, timere, pornire, nrElemente } = domMinimal(html);
  vm.createContext(ctx);
  const respinse = [];
  const asculta = (e) => respinse.push(`${e && e.name || "Error"}: ${String(e && e.message || e).slice(0, 140)}`);
  process.on("unhandledRejection", asculta);
  let rulate = 0;
  try {
    for (const f of scripturi) {
      try { vm.runInContext(citeste(f), ctx, { filename: f }); }
      catch (e) {
        const linie = String(e && e.stack || e).split("\n").find((x) => x.includes(f)) || "";
        pica(G, `${f} moare la incarcare: ${e && e.name}: ${String(e && e.message).slice(0, 140)} ${linie.trim().slice(0, 80)} - pagina ar ramane goala`);
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 30));
    // DOMContentLoaded / load: in browser vin dupa scripturi; aici le declansez o data.
    for (const [tip, fn] of pornire.splice(0)) {
      try { await fn({ type: tip, target: ctx.document, currentTarget: ctx, preventDefault() {}, stopPropagation() {} }); }
      catch (e) {
        const linie = String(e && e.stack || e).split("\n").find((x) => /public\//.test(x)) || "";
        pica(G, `ascultatorul de "${tip}" crapa: ${e && e.name}: ${String(e && e.message).slice(0, 140)} ${linie.trim().slice(0, 80)}`);
      }
    }
    await new Promise((r) => setTimeout(r, 20));
    // Timerele scurte (0-100 ms) puse la pornire ruleaza o data, in 3 runde (un timer
    // poate pune altul). Un crash intr-un setTimeout(...,0) de la pornire omoara ecranul la fel.
    for (let runda = 0; runda < 3; runda++) {
      const acum = [...timere].filter(([, t]) => t.ms <= 100);
      if (!acum.length) break;
      for (const [id, t] of acum) {
        if (!t.repeta) timere.delete(id); else t.ms = Infinity;
        rulate++;
        try { t.fn(); }
        catch (e) {
          const linie = String(e && e.stack || e).split("\n").find((x) => /public\//.test(x)) || "";
          pica(G, `un timer de ${t.ms === Infinity ? "interval" : t.ms + " ms"} pus la pornire crapa: ${e && e.name}: ${String(e && e.message).slice(0, 140)} ${linie.trim().slice(0, 80)}`);
        }
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    await new Promise((r) => setTimeout(r, 30));
  } finally { process.off("unhandledRejection", asculta); }
  if (respinse.length) pica(G, `${respinse.length} promisiuni respinse netratate la pornire, prima: ${respinse[0]}`);
  const lipsa = ["navTo", "apiFetch", "TabloBot"].filter((n) => vm.runInContext(`typeof ${n}`, ctx) === "undefined");
  if (lipsa.length) pica(G, `dupa incarcare lipsesc: ${lipsa.join(", ")} - app.js nu a ajuns pana la capat`);
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, `${scripturi.join(" + ")} incarcate pana la capat; evenimentele de pornire declansate; ${rulate} timere scurte rulate; 0 promisiuni respinse; DOM cu ${nrElemente} elemente din index.html`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. sw - proba de PURTARE, nu de text: rulez sw.js cu un cache si o retea false.
//    /api/ = doar retea (niciun caches.* atins); app.js si lib/* = retea intai
//    (cache-ul VECHI nu castiga cand reteaua merge; cand reteaua pica, cache-ul).
// ─────────────────────────────────────────────────────────────────────────────
async function gardaSw() {
  const G = "sw";
  const src = citeste("public/sw.js");
  const shell = (src.match(/APP_SHELL\s*=\s*\[([^\]]*)\]/) || [])[1] || "";
  for (const u of ["/app.js", "/lib/tablou-bot.js", "/index.html"]) if (!new RegExp(`["']${u.replace(/[.*/]/g, "\\$&")}["']`).test(shell)) pica(G, `APP_SHELL nu contine ${u}`);
  const ORIGINE = "http://127.0.0.1:18799";
  function ruleaza(reteaMerge) {
    const ascultatori = {}, atinsCache = [];
    const cache = new Map([["/app.js", "VECHI app.js"], ["/lib/tablou-bot.js", "VECHI tablou-bot.js"], ["/index.html", "VECHI index"], ["/api/bot-orders", "VECHI api"]]);
    const cheie = (r) => new URL(typeof r === "string" ? r : r.url, ORIGINE).pathname;
    const deschis = { match: async (r) => { atinsCache.push("match " + cheie(r)); const v = cache.get(cheie(r)); return v ? new Response(v) : undefined; }, put: async (r) => { atinsCache.push("put " + cheie(r)); }, addAll: async () => {} };
    const caches = { open: async () => deschis, match: deschis.match, keys: async () => [], delete: async () => true };
    const fetch = async (r) => { if (!reteaMerge) throw new TypeError("Failed to fetch"); return new Response("NOU " + cheie(r), { status: 200 }); };
    const self = { addEventListener: (t, f) => { ascultatori[t] = f; }, location: new URL(ORIGINE), clients: { claim: async () => {}, matchAll: async () => [] }, skipWaiting: async () => {}, registration: {} };
    const ctx = { self, caches, fetch, Response, Request, Headers, URL, console: { log() {}, warn() {}, error() {} }, Promise, clients: self.clients };
    vm.createContext(ctx);
    vm.runInContext(src, ctx, { filename: "public/sw.js" });
    return {
      atinsCache,
      async cere(p, mode = "cors") {
        if (!ascultatori.fetch) throw Error("sw.js nu inregistreaza ascultatorul fetch");
        let raspuns = null;
        const ev = { request: { url: ORIGINE + p, method: "GET", mode, headers: new Headers() }, respondWith: (x) => { raspuns = x; }, waitUntil() {} };
        atinsCache.length = 0;
        ascultatori.fetch(ev);
        if (!raspuns) return { text: "(nu raspunde - browserul merge direct la retea)", cache: [...atinsCache] };
        let r;
        try { r = await raspuns; } catch (e) { return { text: `(eroare: ${e.message})`, cache: [...atinsCache] }; }
        await new Promise((z) => setTimeout(z, 5));
        return { text: r ? await r.text() : "(gol)", cache: [...atinsCache] };
      },
    };
  }
  try {
    const on = ruleaza(true), off = ruleaza(false);
    const api = await on.cere("/api/bot-orders");
    if (api.cache.length) pica(G, `/api/bot-orders atinge cache-ul (${api.cache.join(", ")}) - raspunsurile de bani trebuie sa fie doar din retea`);
    if (api.text.startsWith("VECHI")) pica(G, "/api/bot-orders vine din cache - omul ar vedea bani vechi");
    const apiOff = await off.cere("/api/bot-orders");
    if (apiOff.text.startsWith("VECHI")) pica(G, "/api/bot-orders fara retea vine din cache - trebuie sa pice, nu sa arate bani vechi");
    for (const p of ["/app.js", "/lib/tablou-bot.js"]) {
      const r = await on.cere(p);
      if (!r.text.startsWith("NOU")) pica(G, `${p} cu reteaua buna vine din CACHE ("${r.text}") - HTML nou peste JS vechi; trebuie retea intai`);
      const o = await off.cere(p);
      if (!o.text.startsWith("VECHI")) pica(G, `${p} fara retea nu cade pe cache ("${o.text}") - aplicatia nu mai porneste offline`);
    }
  } catch (e) { pica(G, `sw.js nu ruleaza in proba: ${e.message}`); }
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, "/api doar retea; app.js si lib/* retea intai, cache doar offline; APP_SHELL complet");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. versiune - o singura versiune peste tot. Badge-ul care minte a pacalit omul
//    de mai multe ori: HTML-ul spunea v71 cand codul era v74.5.
// ─────────────────────────────────────────────────────────────────────────────
const normalizeaza = (v) => { if (v == null) return null; let s = String(v).trim().replace(/^v/i, ""); if (!/^\d+(\.\d+)*$/.test(s)) return null; while (/\.0$/.test(s)) s = s.slice(0, -2); return s; };
function gardaVersiune() {
  const G = "versiune";
  const pkg = JSON.parse(citeste("package.json"));
  const bi = JSON.parse(citeste("BUILD_INFO.json"));
  const html = citeste("public/index.html");
  const sw = citeste("public/sw.js");
  const surse = {};
  surse["package.json version"] = normalizeaza(pkg.version);
  surse["BUILD_INFO.version"] = normalizeaza(bi.version);
  surse["BUILD_INFO.badge"] = normalizeaza((String(bi.badge || "").match(/^v[\d.]+/) || [])[0]);
  const c = (sw.match(/const\s+CACHE\s*=\s*["'`][^"'`]*?v(\d+)(?:-(\d+))?(?:-(\d+))?["'`]/) || []);
  surse["sw.js CACHE"] = c[1] ? normalizeaza([c[1], c[2], c[3]].filter(Boolean).join(".")) : null;
  const meta = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]).find((t) => /\bname="app-version"/.test(t));
  surse['index.html <meta name="app-version">'] = meta ? normalizeaza((meta.match(/\bcontent="([^"]*)"/) || [])[1]) : null;
  surse['index.html badge din antet (class="badge")'] = normalizeaza((html.match(/<span\b[^>]*\bclass="badge"[^>]*>\s*(v[\d.]+)/) || [])[1]);
  surse["index.html casuta Build"] = normalizeaza((html.match(/<div class="label">Build<\/div>\s*<div[^>]*>\s*(v[\d.]+)/) || [])[1]);
  surse['index.html #healthAppVersion'] = normalizeaza((html.match(/id="healthAppVersion"[^>]*>\s*(v[\d.]+)/) || [])[1]);
  const man = JSON.parse(citeste("public/manifest.webmanifest"));
  const vm_ = String(man.description || "").match(/\bv(\d+(?:\.\d+)*)/);
  if (vm_) surse["manifest description"] = normalizeaza(vm_[1]);
  const app = citeste("public/app.js");
  const hard = app.match(/\bAPP_VERSION\s*=\s*["'`](v[\d.]+)["'`]/);
  if (hard) surse["app.js APP_VERSION scris de mana"] = normalizeaza(hard[1]);
  const ref = surse["package.json version"];
  for (const [k, v] of Object.entries(surse)) {
    if (v == null) pica(G, `${k}: nu gasesc versiunea (lipseste sau nu mai are forma vNN.N)`);
    else if (v !== ref) pica(G, `${k} = v${v}, dar package.json = v${ref} - omul ar vedea alta versiune decat cea care ruleaza`);
  }
  // Nu pica (nu e al nimanui in planul de azi), dar se vede la fiecare rulare.
  for (const m of html.matchAll(/class="statusChip"[^>]*>\s*(v[\d.]+)\s*·/g)) if (normalizeaza(m[1]) !== ref) atentii.push(`index.html statusChip "${m[1]} · ..." nu e v${ref}`);
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, `${Object.keys(surse).length} locuri spun toate v${ref}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. package - deploy fara al doilea npm test, engines, wrangler fixat, npm test
//    cheama suitele de paza.
// ─────────────────────────────────────────────────────────────────────────────
const WRANGLER_RE = /wrangler@([\w.^~-]+)/g;
function gardaPackage() {
  const G = "package";
  const pkg = JSON.parse(citeste("package.json"));
  const s = pkg.scripts || {};
  if (s.predeploy !== "npm test") pica(G, `predeploy trebuie sa fie "npm test" (e ${JSON.stringify(s.predeploy)}) - npm il ruleaza singur inainte de deploy`);
  if (/npm (run )?(test|predeploy)|npm test/.test(s.deploy || "")) pica(G, `deploy cheama din nou testele ("${s.deploy}") - predeploy le ruleaza deja; asa rulau de doua ori`);
  if (!/pages deploy public\b/.test(s.deploy || "") || !/--project-name crypto\b/.test(s.deploy || "")) pica(G, `deploy trebuie sa fie "wrangler pages deploy public --project-name crypto" (e "${s.deploy}")`);
  if ((pkg.engines || {}).node !== ">=22") pica(G, `engines.node trebuie ">=22" (e ${JSON.stringify((pkg.engines || {}).node)})`);
  const test = String(s.test || "");
  for (const n of ["test:syntax", "test:garzi", "test:security", "test:server", "test:bots", "test:tablou", "test:fifo"]) {
    if (!new RegExp(`npm run ${n}(\\s|$)`).test(test)) pica(G, `npm test nu cheama ${n}`);
    if (!s[n]) pica(G, `lipseste scriptul ${n}`);
  }
  // Regula generala: ORICE test:* din scripts (in afara de test:ecran, care cere Chrome
  // + server) e in lantul npm test. O proba noua nelegata nu ruleaza niciodata la livrare.
  for (const n of Object.keys(s).filter((k) => /^test:/.test(k) && k !== "test:ecran")) {
    if (!new RegExp(`npm run ${n}(\\s|$)`).test(test)) pica(G, `scriptul ${n} exista dar npm test nu il cheama - proba nu ruleaza la livrare`);
  }
  if (!/security-v57\.mjs/.test(s["test:security"] || "")) pica(G, "test:security nu mai cheama scripts/security-v57.mjs (proba tokenului gresit)");
  if (!/garzi-v746\.mjs/.test(s["test:garzi"] || "")) pica(G, "test:garzi nu cheama scripts/garzi-v746.mjs");
  // wrangler fixat pe o versiune EXACTA, aceeasi in package.json si in ambele lansatoare
  const versiuni = new Map();
  const surse = [["package.json", JSON.stringify(s)], ...fs.readdirSync(RADACINA).filter((f) => /\.bat$/i.test(f)).map((f) => [f, citeste(f)])];
  for (const [f, t] of surse) {
    if (/npx[^\n"]*\bwrangler\b(?!@)/.test(t)) pica(G, `${f}: wrangler chemat prin npx fara versiune`);
    for (const m of t.matchAll(WRANGLER_RE)) {
      if (!/^\d+\.\d+\.\d+$/.test(m[1])) pica(G, `${f}: wrangler@${m[1]} nu e o versiune exacta - la fiecare pornire poate veni alt cod`);
      versiuni.set(m[1], [...(versiuni.get(m[1]) || []), f]);
    }
  }
  if (versiuni.size > 1) pica(G, `wrangler pe versiuni diferite: ${[...versiuni].map(([v, f]) => `${v} in ${[...new Set(f)].join("+")}`).join("; ")}`);
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, `deploy/predeploy/engines corecte; wrangler@${[...versiuni.keys()][0]} peste tot`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. gate - BUILD_INFO.gate nu mai poarta cifre scrise de mana ("191 de verificari")
//    care raman in urma la prima proba noua. Cifrele le da rularea.
// ─────────────────────────────────────────────────────────────────────────────
function gardaGate() {
  const G = "gate";
  const gate = JSON.parse(citeste("BUILD_INFO.json")).gate;
  if (typeof gate !== "string" || !gate.trim()) { pica(G, "BUILD_INFO.gate lipseste"); return; }
  const cifra = gate.match(/\d+\s*(de\s*)?(verificari|verificări|scenarii|suite|probe|checks|teste)/i);
  if (cifra) pica(G, `BUILD_INFO.gate scrie de mana "${cifra[0]}" - cifra ramane in urma; lasa rularea sa numere`);
  // O enumerare de suite scrisa de mana ramane in urma (lipsea "server" dupa Task 1).
  const lista = gate.match(/\(([^()]*,[^()]*,[^()]*)\)/);
  if (lista) pica(G, `BUILD_INFO.gate enumera de mana "(${lista[1].slice(0, 80)})" - lista se ia din package.json scripts.test, nu se copiaza`);
  const lant = new Set((String(JSON.parse(citeste("package.json")).scripts.test || "").match(/test:[\w-]+/g) || []));
  const numite = new Set((gate.match(/test:[\w-]+/g) || []).filter((x) => x !== "test:ecran"));
  if (numite.size) {
    const lipsa = [...lant].filter((x) => !numite.has(x)), inPlus = [...numite].filter((x) => !lant.has(x));
    if (lipsa.length || inPlus.length) pica(G, `BUILD_INFO.gate numeste alte suite decat npm test: lipsesc ${lipsa.join(", ") || "-"}, in plus ${inPlus.join(", ") || "-"}`);
  }
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, "fara cifre si fara lista de suite scrise de mana");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6b. bat - orice .bat din depozit: CRLF in arborele de lucru, .gitattributes il
//     tine CRLF la checkout, si niciun del/erase/rd/rmdir cu % (un del cu o
//     variabila goala a sters odata o radacina intreaga).
// ─────────────────────────────────────────────────────────────────────────────
function toateBat(dir = "") {
  return fs.readdirSync(cale(dir || "."), { withFileTypes: true }).flatMap((x) => {
    const r = dir ? path.join(dir, x.name) : x.name;
    if (x.isDirectory()) return /^(node_modules|\.git|\.wrangler)$/.test(x.name) ? [] : toateBat(r);
    return /\.(bat|cmd)$/i.test(x.name) ? [r] : [];
  });
}
function gardaBat() {
  const G = "bat";
  const bat = toateBat();
  if (!bat.length) { pica(G, "nu gasesc niciun .bat"); return; }
  const ga = fs.existsSync(cale(".gitattributes")) ? citeste(".gitattributes") : "";
  if (!/^\*\.bat\s+(?=.*\btext\b)(?=.*\beol=crlf\b).*$/m.test(ga)) pica(G, ".gitattributes nu are \"*.bat text eol=crlf\" - un clone cu core.autocrlf=false ar scoate .bat cu LF");
  for (const f of bat) {
    const o = fs.readFileSync(cale(f));
    let lf = 0, crlf = 0;
    for (let i = 0; i < o.length; i++) if (o[i] === 10) { lf++; if (o[i - 1] === 13) crlf++; }
    if (lf !== crlf) pica(G, `${f}: ${lf - crlf} randuri cu LF simplu in arborele de lucru - cmd.exe le toaca`);
    const linii = o.toString("latin1").split(/\r?\n/);
    linii.forEach((l, i) => {
      if (/^\s*(@?rem\b|::)/i.test(l)) return; // rem inghite tot randul, cu & cu tot
      // "echo curat & del /q "%X%\*"" - dupa & / && / || / | incepe alta comanda.
      // ^& (scapat) nu desparte; echo-ul insusi e doar text.
      const comenzi = l.replace(/\^[&|]/g, "").split(/&&|\|\||&|\|/);
      const rea = comenzi.find((c) => /^\s*[@(]*\s*(if\s+(not\s+)?exist\s+("[^"]*"|\S+)\s+)?(del|erase|rd|rmdir)\s[^\r\n]*%/i.test(c));
      if (rea) pica(G, `${f}:${i + 1}: stergere cu variabila - "${l.trim().slice(0, 70)}" (cai fixe sau PowerShell pe cale verificata)`);
    });
  }
  const r = spawnSync("git", ["check-attr", "eol", "--", ...bat], { cwd: RADACINA, encoding: "utf8" });
  if (!r.error && r.status === 0) {
    for (const l of r.stdout.split(/\r?\n/).filter(Boolean)) if (!/: eol: crlf$/.test(l)) pica(G, `git check-attr: ${l} (astept eol: crlf)`);
  } else atentii.push("bat: git check-attr SARIT (fara git)");
  if (!rezultate.some((x) => x.garda === G && !x.ok)) trece(G, `${bat.length} .bat: CRLF, eol=crlf in .gitattributes, fara del/rd cu variabila`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. headers - connect-src pe lista alba (exact domeniile chemate direct din
//    pagina), fara "https:" gol; HTML-ul nu mai poarta Access-Control-Allow-Origin: *.
// ─────────────────────────────────────────────────────────────────────────────
function gardaHeaders() {
  const G = "headers";
  const h = citeste("public/_headers");
  const csp = (h.match(/Content-Security-Policy:\s*([^\n]+)/) || [])[1] || "";
  const connect = ((csp.match(/connect-src([^;]*)/) || [])[1] || "").trim().split(/\s+/).filter(Boolean);
  if (!connect.length) pica(G, "nu gasesc connect-src in CSP");
  const goale = connect.filter((x) => /^(https?|wss?):?$/.test(x) || x === "*" || /\*/.test(x));
  if (goale.length) pica(G, `connect-src are surse generice (${goale.join(" ")}) - lasa pagina sa trimita date oriunde`);
  if (!connect.includes("'self'")) pica(G, "connect-src nu are 'self'");
  const fisiereClient = ["public/app.js", "public/research-worker.js", ...fs.readdirSync(cale("public/lib")).filter((f) => f.endsWith(".js")).map((f) => "public/lib/" + f)];
  const cerute = new Set();
  for (const f of fisiereClient) for (const m of citeste(f).matchAll(/\b(https|wss):\/\/([A-Za-z0-9.-]+(?::\d+)?)/g)) cerute.add(`${m[1]}://${m[2]}`);
  const lipsa = [...cerute].filter((u) => !connect.includes(u));
  if (lipsa.length) pica(G, `connect-src nu permite ce cheama pagina: ${lipsa.join(" ")} - ar pica tacut in browser`);
  const inPlus = connect.filter((x) => x !== "'self'" && !cerute.has(x));
  if (inPlus.length) pica(G, `connect-src permite domenii pe care pagina nu le mai cheama: ${inPlus.join(" ")}`);
  // Blocul care se aplica paginilor HTML (/* sau /index.html) trebuie sa scoata ACAO.
  const blocuri = h.split(/\r?\n(?=\S)/);
  const html = blocuri.find((b) => /^\/\*\s*$/m.test(b.split(/\r?\n/)[0]));
  if (!html) pica(G, "nu gasesc blocul /* in _headers");
  else {
    if (/^\s+Access-Control-Allow-Origin:\s*\*/mi.test(html)) pica(G, "blocul /* pune Access-Control-Allow-Origin: * pe HTML");
    if (!/^\s+!\s*Access-Control-Allow-Origin\s*$/mi.test(html)) pica(G, "blocul /* nu scoate Access-Control-Allow-Origin (Pages il pune implicit pe fisierele statice): lipseste \"! Access-Control-Allow-Origin\"");
  }
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, `connect-src = 'self' + ${cerute.size} adrese chemate direct; ACAO scos de pe HTML`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. gitignore - secretele si profilurile de proba nu ajung in repo (repo PUBLIC).
// ─────────────────────────────────────────────────────────────────────────────
function gardaGitignore() {
  const G = "gitignore";
  const trebuieIgnorate = [".dev.vars", ".dev.vars.bak", ".dev.vars-vechi", ".dev.vars2", ".dev.vars.local", "tablou-bot-proba-1727000000-42/Default/Cookies", "profil-proba/Default/Cookies", ".wrangler/state/v3/d1/x.sqlite"];
  const nuIgnorate = [".dev.vars.exemplu", "public/app.js", "scripts/garzi-v746.mjs"];
  const r = spawnSync("git", ["check-ignore", "--no-index", "-v", "-n", ...trebuieIgnorate, ...nuIgnorate], { cwd: RADACINA, encoding: "utf8" });
  if (r.error || (r.status !== 0 && r.status !== 1)) { atentii.push(`gitignore: SARIT - git nu raspunde (${r.error ? r.error.message : r.stderr.trim()})`); trece(G, "SARIT (fara git)"); return; }
  const linii = r.stdout.split(/\r?\n/).filter(Boolean);
  const ignorat = (f) => { const l = linii.find((x) => x.endsWith("\t" + f)); return !!l && !l.startsWith("::") && !/:!/.test(l); };
  for (const f of trebuieIgnorate) if (!ignorat(f)) pica(G, `${f} NU e ignorat - ar putea ajunge in repo-ul PUBLIC`);
  for (const f of nuIgnorate) if (ignorat(f)) pica(G, `${f} e ignorat, dar trebuie comis`);
  if (!rezultate.some((x) => x.garda === G && !x.ok)) trece(G, `${trebuieIgnorate.length} cai secrete/profiluri ignorate, ${nuIgnorate.length} cai bune comise`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. lansatoare - ce trebuie sa contina .bat-urile (static). Purtarea o masoara
//    lansatoare-viu, pe PowerShell-ul scos chiar din .bat.
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL = "PORNESTE-CRYPTO-RADAR.bat", TELEFON = "PORNESTE-SI-PE-TELEFON.bat";
function blocPs(text, nume) {
  const linii = text.split(/\r?\n/);
  const i = linii.findIndex((l) => l.trim().toLowerCase() === `rem [ps:${nume}]`);
  if (i < 0) return null;
  const l = linii[i + 1] || "";
  const a = l.indexOf('-Command "');
  const b = l.lastIndexOf('"');
  if (a < 0 || b <= a + 10) return null;
  return { linie: l, ps: l.slice(a + 10, b) };
}
function gardaLansatoare() {
  const G = "lansatoare";
  for (const f of [LOCAL, TELEFON]) {
    const t = citeste(f);
    const intarziat = /EnableDelayedExpansion/i.test(t);
    // Cu EnableDelayedExpansion, cmd mananca orice "!" care nu e !VARIABILA!:
    // "echo [!] Tunelul nu a dat o adresa" iesea "[" si restul taiat.
    if (intarziat) {
      const rele = t.split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => !/^\s*rem\b/i.test(l) && l.replace(/![A-Za-z_][\w]*!/g, "").includes("!"));
      if (rele.length) pica(G, `${f}: ${rele.length} randuri cu "!" sub EnableDelayedExpansion (cmd il mananca), primul la ${rele[0][0]}: ${rele[0][1].trim().slice(0, 70)}`);
    }
    for (const n of ["port", "sanatate", "chei", ...(f === TELEFON ? ["cloudflared"] : [])]) {
      const b = blocPs(t, n);
      if (!b) { pica(G, `${f}: lipseste blocul PowerShell [ps:${n}]`); continue; }
      if (b.ps.includes('"')) pica(G, `${f} [ps:${n}]: ghilimele duble in PowerShell - cmd.exe rupe comanda`);
      if (b.ps.includes("%")) pica(G, `${f} [ps:${n}]: % in PowerShell - cmd.exe il inlocuieste`);
      if (intarziat && b.ps.includes("!")) pica(G, `${f} [ps:${n}]: ! in PowerShell cu EnableDelayedExpansion - cmd.exe il mananca`);
    }
    const port = blocPs(t, "port");
    if (port && !/Get-NetTCPConnection/.test(port.ps)) pica(G, `${f}: [ps:port] nu verifica portul cu Get-NetTCPConnection`);
    const san = blocPs(t, "sanatate");
    if (san && !/\/api\/market\?type=health/.test(san.ps)) pica(G, `${f}: proba de pornire nu cere /api/market?type=health`);
    if (san && !/service -eq 'crypto-radar'/.test(san.ps)) pica(G, `${f}: proba de pornire nu verifica service='crypto-radar' - orice 200 de pe 8788 ar trece`);
    if (/Invoke-WebRequest -Uri 'http:\/\/127\.0\.0\.1:8788\/'/.test(t)) pica(G, `${f}: inca are proba veche "orice 200 pe /"`);
    const chei = blocPs(t, "chei");
    if (chei && !/Read-Host 'PIONEX_API_SECRET[^']*' -AsSecureString/.test(chei.ps)) pica(G, `${f}: secretul Pionex nu e citit cu Read-Host -AsSecureString - se vede pe ecran`);
    if (/Stop-Process/.test(t)) pica(G, `${f}: Stop-Process in lansator - poate omori procese straine (se opresc doar PID-urile proprii, cu taskkill)`);
    if (/ping -n \d+ 127\.0\.0\.1 >nul && start/.test(t)) pica(G, `${f}: browserul se deschide dupa un ceas, nu dupa proba de pornire`);
    if (!/--persist-to/.test(t)) pica(G, `${f}: wrangler pornit fara --persist-to <folder> - proba de port nu mai recunoaste serverul acestui folder`);
  }
  const loc = citeste(LOCAL);
  const cmdLocal = loc.split(/\r?\n/).find((l) => /wrangler@\S+ pages dev/.test(l)) || "";
  if (!/--ip 127\.0\.0\.1\b/.test(cmdLocal)) pica(G, `${LOCAL}: wrangler pages dev fara --ip 127.0.0.1 - serverul cu cheile Pionex asculta pe toata reteaua`);
  const sanLoc = blocPs(loc, "sanatate");
  if (sanLoc && !/Start-Process 'http:\/\/127\.0\.0\.1:8788\/'/.test(sanLoc.ps)) pica(G, `${LOCAL}: browserul nu e deschis de proba de pornire`);
  if (/start "" http/i.test(loc)) pica(G, `${LOCAL}: browser deschis in afara probei de pornire`);
  const tel = citeste(TELEFON);
  const cf = blocPs(tel, "cloudflared");
  if (!cf) pica(G, `${TELEFON}: lipseste blocul [ps:cloudflared]`);
  else {
    if (/releases\/latest/.test(cf.ps) || /releases\/latest/.test(tel)) pica(G, `${TELEFON}: cloudflared adus de la "latest" - nu se poate verifica amprenta`);
    if (!/\$sha = '[0-9a-f]{64}'/.test(cf.ps)) pica(G, `${TELEFON}: [ps:cloudflared] nu are amprenta sha256 fixata`);
    if (!/Get-FileHash -Algorithm SHA256/.test(cf.ps)) pica(G, `${TELEFON}: [ps:cloudflared] nu calculeaza sha256 pe fisierul descarcat`);
  }
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, "port, proba de pornire, secret ascuns, wrangler pe 127.0.0.1, cloudflared cu amprenta, fara Stop-Process");
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. lansatoare-viu - rulez PowerShell-ul SCOS din .bat (nu o copie scrisa aici)
//     pe un port de proba, cu un server fals. Doar pe Windows.
// ─────────────────────────────────────────────────────────────────────────────
// Porturi alese de sistem (liberi acum), niciodata cele ale serverelor reale ale omului.
const PORTURI_INTERZISE = new Set([8787, 8788, 8790, 8791, 8798]);
let PORT_PROBA = 0, PORT_CF = 0;
function portLiber() {
  return new Promise((rez, rej) => {
    const s = net.createServer();
    s.once("error", rej);
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => (PORTURI_INTERZISE.has(p) ? portLiber().then(rez, rej) : rez(p))); });
  });
}
function inlocuieste(text, vechi, nou, garda, ce) {
  if (!text.includes(vechi)) throw Error(`${garda}: nu gasesc "${vechi}" in ${ce} - proba nu poate izola blocul`);
  return text.split(vechi).join(nou);
}
// PowerShell-ul trece prin cmd.exe, dintr-un .bat temporar cu ACELASI setlocal ca
// lansatorul: asa se vede si ce strica cmd (%, ! cu EnableDelayedExpansion, ").
let nrBat = 0;
function ps(comanda, cwd, intarziat, env = {}, timeoutMs = 60000) {
  const bat = path.join(os.tmpdir(), `garda-v746-${process.pid}-${++nrBat}.bat`);
  fs.writeFileSync(bat, ["@echo off", `setlocal EnableExtensions${intarziat ? " EnableDelayedExpansion" : ""}`, `powershell -NoProfile -Command "${comanda}"`, "exit /b %ERRORLEVEL%", ""].join(String.fromCharCode(13, 10)), "ascii");
  return new Promise((rez) => {
    const p = spawn("cmd.exe", ["/d", "/c", bat], { cwd, windowsHide: true, env: { ...process.env, ...env } });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
    const t = setTimeout(() => { spawnSync("taskkill", ["/PID", String(p.pid), "/T", "/F"]); }, timeoutMs);
    p.on("close", (cod) => { clearTimeout(t); try { fs.rmSync(bat, { force: true }); } catch {} rez({ cod, out, err }); });
  });
}
function serverFals(port, raspuns, argumenteInPlus = []) {
  // proces separat, ca sa aiba propria linie de comanda (asa il recunoaste [ps:port])
  const cod = `require("http").createServer((q,s)=>{const r=${JSON.stringify(raspuns)};s.writeHead(r.status,{"content-type":r.type});s.end(r.body)}).listen(${port},"127.0.0.1",()=>console.log("gata"))`;
  const p = spawn(process.execPath, ["-e", cod, ...argumenteInPlus], { windowsHide: true });
  return new Promise((rez, rej) => { p.stdout.once("data", () => rez(p)); p.once("exit", (c) => rej(Error("serverul fals a iesit " + c))); });
}
const opreste = (p) => { try { spawnSync("taskkill", ["/PID", String(p.pid), "/T", "/F"]); } catch {} };

async function gardaLansatoareViu() {
  const G = "lansatoare-viu";
  if (process.platform !== "win32") { atentii.push("lansatoare-viu: SARIT - nu e Windows"); trece(G, "SARIT (nu e Windows)"); return; }
  PORT_PROBA = await portLiber();
  do PORT_CF = await portLiber(); while (PORT_CF === PORT_PROBA);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "garda-v746-"));
  const folder = path.join(tmp, "radar");
  fs.mkdirSync(folder);
  const procese = [];
  try {
    for (const f of [LOCAL, TELEFON]) {
      const t = citeste(f);
      const intarziat = /EnableDelayedExpansion/i.test(t);
      // --- [ps:port]: liber / al nostru / strain ---
      const bp = blocPs(t, "port");
      if (!bp) { pica(G, `${f}: fara [ps:port]`); continue; }
      const psPort = inlocuieste(bp.ps, "$port = 8788", `$port = ${PORT_PROBA}`, G, `${f} [ps:port]`);
      let r = await ps(psPort, folder, intarziat);
      if (r.cod !== 0) pica(G, `${f} [ps:port] port liber: iesire ${r.cod} (astept 0) ${r.out.trim()} ${r.err.trim().slice(0, 200)}`);
      const strain = await serverFals(PORT_PROBA, { status: 200, type: "text/html", body: "altceva" }); procese.push(strain);
      r = await ps(psPort, folder, intarziat);
      if (r.cod !== 4) pica(G, `${f} [ps:port] port ocupat de un program STRAIN: iesire ${r.cod} (astept 4 = mesaj si iesire)`);
      if (!/ocupat/i.test(r.out)) pica(G, `${f} [ps:port] strain: mesajul nu spune ca portul e ocupat: "${r.out.trim()}"`);
      let traieste = spawnSync("tasklist", ["/FI", `PID eq ${strain.pid}`], { encoding: "utf8" }).stdout.includes(String(strain.pid));
      if (!traieste) pica(G, `${f} [ps:port] a OMORAT procesul strain de pe port`);
      opreste(strain);
      const alNostru = await serverFals(PORT_PROBA, { status: 200, type: "text/html", body: "x" }, ["wrangler", "pages", "dev", "--persist-to", path.join(folder, ".wrangler", "state")]); procese.push(alNostru);
      r = await ps(psPort, folder, intarziat);
      if (r.cod !== 3) pica(G, `${f} [ps:port] port ocupat de wrangler-ul ACESTUI folder: iesire ${r.cod} (astept 3 = merge deja)`);
      const alt = path.join(tmp, "radar-alt"); fs.mkdirSync(alt, { recursive: true });
      r = await ps(psPort, alt, intarziat);
      if (r.cod !== 4) pica(G, `${f} [ps:port] wrangler din ALT folder: iesire ${r.cod} (astept 4 - nu e al nostru)`);
      opreste(alNostru);

      // --- [ps:sanatate]: orice 200 NU ajunge; doar JSON-ul aplicatiei ---
      const bs = blocPs(t, "sanatate");
      if (!bs) { pica(G, `${f}: fara [ps:sanatate]`); continue; }
      let psS = inlocuieste(bs.ps, "127.0.0.1:8788", `127.0.0.1:${PORT_PROBA}`, G, `${f} [ps:sanatate]`);
      psS = psS.replace(/\$i -lt \d+/, "$i -lt 2").replace(/Start-Sleep -Seconds \d+/, "Start-Sleep -Milliseconds 200");
      const marcaj = path.join(tmp, "browser-deschis.txt");
      // Browserul NU se deschide in proba: Start-Process e inlocuit cu un fisier-marcaj.
      psS = psS.replace(/Start-Process '(http:[^']+)'/g, `Set-Content -LiteralPath '${marcaj}' -Value '$1'`);
      // v77: nici colectorul nu porneste in proba - si el devine un fisier-marcaj.
      const marcajColector = path.join(tmp, "colector-pornit.txt");
      psS = psS.replace(/Start-Process -FilePath 'node' -ArgumentList '[^']*colector\.mjs' -WorkingDirectory \(Get-Location\)\.Path -WindowStyle Hidden( -ErrorAction Stop)?/g, `Set-Content -LiteralPath '${marcajColector}' -Value 'colector'`);
      if (/Start-Process/.test(psS)) throw Error(`${f} [ps:sanatate]: Start-Process ramas dupa inlocuire - opresc proba ca sa nu deschid un browser`);
      const cazuri = [
        ["nimic pe port", null, 1],
        ["HTML cu 200 (alt program sau ruta inexistenta)", { status: 200, type: "text/html", body: "<!doctype html><title>x</title>" }, 1],
        ["JSON strain cu 200", { status: 200, type: "application/json", body: '{"ok":true,"service":"altceva"}' }, 1],
        ["Crypto Radar", { status: 200, type: "application/json", body: '{"ok":true,"service":"crypto-radar","version":"v56"}' }, 0],
      ];
      for (const [nume, rasp, asteptat] of cazuri) {
        try { fs.rmSync(marcaj, { force: true }); fs.rmSync(marcajColector, { force: true }); } catch {}
        const srv = rasp ? await serverFals(PORT_PROBA, rasp) : null; if (srv) procese.push(srv);
        r = await ps(psS, folder, intarziat);
        if (srv) opreste(srv);
        const deschis = fs.existsSync(marcaj);
        // Colectorul (care citeste contul si trimite alerte) porneste DOAR cand raspunde chiar aplicatia.
        const colector = fs.existsSync(marcajColector);
        if (colector !== (asteptat === 0)) pica(G, `${f} [ps:sanatate] ${nume}: colector ${colector ? "PORNIT" : "nepornit"} (astept ${asteptat === 0 ? "pornit" : "nepornit"})`);
        if (r.cod !== asteptat) pica(G, `${f} [ps:sanatate] ${nume}: iesire ${r.cod} (astept ${asteptat})`);
        if (f === LOCAL && deschis !== (asteptat === 0)) pica(G, `${f} [ps:sanatate] ${nume}: browser ${deschis ? "DESCHIS" : "nedeschis"} (astept ${asteptat === 0 ? "deschis" : "nedeschis"})`);
      }

      // --- [ps:chei]: secretul citit ascuns si scris corect ca TEXT ---
      const bc = blocPs(t, "chei");
      if (!bc) { pica(G, `${f}: fara [ps:chei]`); continue; }
      const fisier = ".proba-vars"; // NU .dev.vars: proba nu atinge niciodata fisierul de secrete
      const psC = inlocuieste(bc.ps, "'.dev.vars'", `'${fisier}'`, G, `${f} [ps:chei]`);
      if (/\.dev\.vars/.test(psC)) throw Error(`${f} [ps:chei]: .dev.vars ramas dupa inlocuire - opresc proba`);
      // Secretul vine prin mediu, nu prin linia de comanda: in realitate il citeste
      // Read-Host, deci cmd nu-l vede niciodata. Are exact caracterele care rupeau bat-ul vechi.
      const secret = "s3cr&t%x!y 'q'^|";
      const stub = "function Read-Host { param([string]$Prompt, [switch]$AsSecureString) $v = @{ 'APP_API_TOKEN' = 'tok-proba'; 'PIONEX_API_KEY' = 'cheie-proba'; 'PIONEX_API_SECRET' = $env:GARDA_SECRET }[$Prompt.Trim()]; if ($AsSecureString) { $s = New-Object System.Security.SecureString; foreach ($c in $v.ToCharArray()) { $s.AppendChar($c) }; $s } else { if ($Prompt.Trim() -eq 'PIONEX_API_SECRET') { 'SECRET-CITIT-LA-VEDERE' } else { $v } } }; ";
      r = await ps(stub + psC, folder, intarziat, { GARDA_SECRET: secret });
      const scris = fs.existsSync(path.join(folder, fisier)) ? fs.readFileSync(path.join(folder, fisier), "utf8") : "";
      if (r.cod !== 0) pica(G, `${f} [ps:chei]: iesire ${r.cod} ${r.err.trim().slice(0, 200)}`);
      if (!scris.includes(`PIONEX_API_SECRET=${secret}\n`)) pica(G, `${f} [ps:chei]: secretul nu e scris ca text din SecureString (scris: ${JSON.stringify(scris.split("\n").find((l) => l.startsWith("PIONEX_API_SECRET")) || "")})`);
      if (!scris.includes("APP_API_TOKEN=tok-proba\n") || !scris.includes("PIONEX_API_KEY=cheie-proba\n")) pica(G, `${f} [ps:chei]: token/cheie nescrise corect`);
      fs.rmSync(path.join(folder, fisier), { force: true });
    }

    // --- [ps:cloudflared]: amprenta buna -> pastrat; gresita -> sters si iesire 2 ---
    const bcf = blocPs(citeste(TELEFON), "cloudflared");
    if (bcf) {
      const continut = crypto.randomBytes(4096);
      const bun = crypto.createHash("sha256").update(continut).digest("hex");
      let cereri = 0;
      const srv = http.createServer((q, s) => { cereri++; s.writeHead(200, { "content-type": "application/octet-stream" }); s.end(continut); });
      await new Promise((z) => srv.listen(PORT_CF, "127.0.0.1", z));
      try {
        const dirCf = path.join(tmp, "cf");
        const baza = inlocuieste(inlocuieste(bcf.ps, "Join-Path $env:LOCALAPPDATA 'cloudflared'", `'${dirCf}'`, G, "[ps:cloudflared]"), "https://github.com/cloudflare/cloudflared/releases/download/", `http://127.0.0.1:${PORT_CF}/`, G, "[ps:cloudflared]");
        const cuSha = (h) => baza.replace(/\$sha = '[0-9a-f]{64}'/, `$sha = '${h}'`);
        const exe = path.join(dirCf, "cloudflared.exe");
        let r = await ps(cuSha("0".repeat(64)), tmp, true);
        if (r.cod !== 2) pica(G, `[ps:cloudflared] amprenta GRESITA: iesire ${r.cod} (astept 2)`);
        if (fs.existsSync(exe) || fs.existsSync(exe + ".descarcat")) pica(G, "[ps:cloudflared] amprenta GRESITA: fisierul descarcat a ramas pe disc");
        if (!/amprenta/i.test(r.out)) pica(G, `[ps:cloudflared] amprenta gresita: mesajul nu spune de amprenta: "${r.out.trim()}"`);
        r = await ps(cuSha(bun), tmp, true);
        if (r.cod !== 0 || !fs.existsSync(exe)) pica(G, `[ps:cloudflared] amprenta BUNA: iesire ${r.cod}, exe ${fs.existsSync(exe) ? "pus" : "LIPSA"}`);
        const inainte = cereri;
        r = await ps(cuSha(bun), tmp, true);
        if (r.cod !== 0 || cereri !== inainte) pica(G, `[ps:cloudflared] exe deja bun: iesire ${r.cod}, a descarcat din nou (${cereri - inainte} cereri)`);
        fs.writeFileSync(exe, "alt continut");
        r = await ps(cuSha(bun), tmp, true);
        if (r.cod !== 0 || crypto.createHash("sha256").update(fs.readFileSync(exe)).digest("hex") !== bun) pica(G, "[ps:cloudflared] exe vechi/necunoscut pe disc nu e inlocuit cu cel verificat");
      } finally { srv.close(); }
    }
  } catch (e) { pica(G, e.message); }
  finally { for (const p of procese) opreste(p); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} }
  if (!rezultate.some((r) => r.garda === G && !r.ok)) trece(G, `PowerShell-ul din ambele .bat rulat pe :${PORT_PROBA}: port liber/al nostru/strain, proba de pornire, secret ascuns, cloudflared cu amprenta`);
}

// ─────────────────────────────────────────────────────────────────────────────
const GARZI = [
  ["auth", gardaAuth], ["ecran-vm", gardaEcranVm], ["sw", gardaSw], ["versiune", gardaVersiune],
  ["package", gardaPackage], ["gate", gardaGate], ["bat", gardaBat], ["headers", gardaHeaders], ["gitignore", gardaGitignore],
  ["lansatoare", gardaLansatoare], ["lansatoare-viu", gardaLansatoareViu],
];
for (const [nume, fn] of GARZI) {
  if (DOAR.length && !DOAR.includes(nume)) continue;
  if (FARA.includes(nume)) continue;
  try { await fn(); } catch (e) { pica(nume, `garda a crapat: ${e && e.stack ? e.stack.split("\n").slice(0, 2).join(" ") : e}`); }
}
console.log("\nV746 · garzi");
for (const r of rezultate) console.log(`  ${r.ok ? "ok  " : "PICA"} [${r.garda}] ${r.mesaj}`);
for (const a of atentii) console.log(`  ATENTIE ${a}`);
const picate = rezultate.filter((r) => !r.ok);
const garziPicate = new Set(picate.map((r) => r.garda));
const garziRulate = new Set(rezultate.map((r) => r.garda));
console.log(`\nV746_GARZI ${picate.length ? "FAIL" : "PASS"} · ${garziRulate.size - garziPicate.size}/${garziRulate.size} garzi\n`);
process.exit(picate.length ? 1 : 0);
