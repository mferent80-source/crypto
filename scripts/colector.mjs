// Colectorul de acasa: il porneste lansatorul (PORNESTE-*.bat), ascuns, dupa ce
// serverul raspunde. O data pe minut citeste botii de la serverul local si:
//   1) pune o intrare in istoricul de pe server (/api/istoric-bot), ca Tabloul
//      sa aiba ore de istoric oricand il deschizi, pe orice dispozitiv;
//   2) judeca alertele (public/lib/alerte.js) si le trimite pe telefon prin ntfy.
// Doar CITIRE de la Pionex (prin rutele serverului, care sunt read-only).
// Se opreste singur daca serverul nu mai raspunde 5 minute la rand, ca sa nu
// ramana agatat dupa ce omul inchide fereastra Radarului.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { turaClasament as turaClasamentModul } from "./lib/tura-clasament.mjs";
import { trimiteDiscord } from "./lib/canal-discord.mjs";
import { turaLaborator as turaLaboratorModul } from "./lib/tura-laborator.mjs";
import { turaContrafactual } from "./lib/tura-contrafactual.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(RAD, "data");
const BAZA = process.env.RADAR_URL || "http://127.0.0.1:8788";
const PAS_MS = Number(process.env.COLECTOR_PAS_MS) || 60000;
const DIRECTIE_MS = 5 * 60000;
const MAX_ESECURI = 15; // ~15 minute fara server -> iese
fs.mkdirSync(DATA, { recursive: true });

const LOG = path.join(DATA, "colector.log");
function jurnal(...a) {
  const linie = new Date().toISOString() + " " + a.join(" ") + "\n";
  try { if (fs.existsSync(LOG) && fs.statSync(LOG).size > 1_000_000) fs.renameSync(LOG, LOG + ".vechi"); fs.appendFileSync(LOG, linie); } catch {}
  if (process.env.COLECTOR_CONSOLA) process.stdout.write(linie);
}

// O singura instanta. Fisierul pid are si o "bataie de inima" (ora ultimei ture):
// un pid ramas dupa o oprire brusca a PC-ului poate fi refolosit de Windows pentru
// alt program, iar colectorul ar crede ca mai ruleaza unul si n-ar porni niciodata.
// Deci: alt colector conteaza ca viu doar daca procesul exista SI a batut recent.
const PID = path.join(DATA, "colector.pid");
const BATAIE_MS = 3 * PAS_MS;
try {
  const [vechi, la] = fs.readFileSync(PID, "utf8").split(/\s+/).map(Number);
  if (vechi && vechi !== process.pid && Date.now() - (la || 0) < BATAIE_MS) {
    process.kill(vechi, 0);
    jurnal("mai rulează un colector (PID " + vechi + ") - ies"); process.exit(0);
  }
} catch {}
const bate = () => { try { fs.writeFileSync(PID, process.pid + " " + Date.now()); } catch {} };
bate();
const curataPid = () => { try { if (Number(fs.readFileSync(PID, "utf8").split(/\s+/)[0]) === process.pid) fs.unlinkSync(PID); } catch {} };
process.on("exit", curataPid);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

function citesteVars() {
  const f = path.join(RAD, ".dev.vars");
  const o = {};
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const i = l.indexOf("="); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
  return o;
}
const TOKEN = citesteVars().APP_API_TOKEN;
if (!TOKEN) { jurnal("lipsește APP_API_TOKEN în .dev.vars - ies"); process.exit(1); }

// v79.1: canalul extern e OPRIT implicit (omul nu lucreaza cu ntfy). Alertele merg mereu
// in KV-ul de acasa (istoric-bot?action=alerte) si se vad in Radar; ALERTE_CANAL=ntfy le
// trimite si pe ntfy. Alt canal (telegram etc.) se leaga in trimiteAlerta(), o singura data.
// ALERTE_CANAL si DISCORD_WEBHOOK se citesc din .dev.vars (sau din mediu).
const VARS = citesteVarsSigur();
const CANAL = (process.env.ALERTE_CANAL || VARS.ALERTE_CANAL || (VARS.DISCORD_WEBHOOK ? "discord" : "radar")).toLowerCase();
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || VARS.DISCORD_WEBHOOK || "";
function citesteVarsSigur() { try { return citesteVars(); } catch { return {}; } }
// Canalul ntfy: nume secret, generat o data si pastrat in data/ntfy.json (doar cand e cerut).
const NTFY_FIS = path.join(DATA, "ntfy.json");
function canalNtfy() {
  try { const c = JSON.parse(fs.readFileSync(NTFY_FIS, "utf8")); if (/^[A-Za-z0-9_-]{8,64}$/.test(c.topic)) return { topic: c.topic, nou: false }; } catch {}
  const topic = "radar-" + crypto.randomBytes(12).toString("hex");
  fs.writeFileSync(NTFY_FIS, JSON.stringify({ topic, facut: new Date().toISOString() }, null, 2));
  return { topic, nou: true };
}
const NTFY = CANAL === "ntfy" ? canalNtfy() : { topic: null, nou: false };

function incarca(fisier, nume) {
  const src = fs.readFileSync(path.join(RAD, "public", "lib", fisier), "utf8");
  return new Function(src + "; return " + nume + ";")();
}
const Alerte = incarca("alerte.js", "Alerte");
const Directie = incarca("directie.js", "Directie");
const TabloBot = incarca("tablou-bot.js", "TabloBot");
const GridCalcul = incarca("grid-calcul.js", "GridCalcul");
const GridClasament = incarca("grid-clasament.js", "GridClasament");
const JurnalTrade = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public", "lib", "jurnal-trade.js"), "utf8") + "; return JurnalTrade;")(GridCalcul);
const Contrafactual = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "contrafactual.js"), "utf8") + "; return Contrafactual;")();
const SemnaleBot = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public", "lib", "semnale-bot.js"), "utf8") + "; return SemnaleBot;")(GridCalcul);
const TabloExtra = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public", "lib", "tablou-extra.js"), "utf8") + "; return TabloExtra;")(GridCalcul);
const GridProba = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public", "lib", "grid-proba.js"), "utf8") + "; return GridProba;")(GridCalcul);
const GridLaborator = new Function("GridCalcul", "GridProba", fs.readFileSync(path.join(RAD, "public", "lib", "grid-laborator.js"), "utf8") + "; return GridLaborator;")(GridCalcul, GridProba);
const Obiceiuri = new Function("GridCalcul", "GridProba", "JurnalTrade", fs.readFileSync(path.join(RAD, "public", "lib", "obiceiuri.js"), "utf8") + "; return Obiceiuri;")(GridCalcul, GridProba, JurnalTrade);

// Proba de incarcare (scripts/colector-v77.mjs): toate modulele s-au incarcat, fara retea.
if (process.env.COLECTOR_DOAR_INCARCA) { console.log("INCARCAT", [Alerte, Directie, TabloBot, GridCalcul, GridClasament, JurnalTrade, Contrafactual, SemnaleBot, TabloExtra, GridProba, GridLaborator, Obiceiuri].every(Boolean)); process.exit(0); }
const ANTET = { authorization: "Bearer " + TOKEN, accept: "application/json" };
async function cere(cale, opt = {}) {
  const r = await fetch(BAZA + cale, { ...opt, headers: { ...ANTET, ...(opt.headers || {}) }, signal: AbortSignal.timeout(20000) });
  const text = await r.text(); let d = null; try { d = JSON.parse(text); } catch {}
  if (!r.ok) throw Object.assign(new Error((d && (d.error + (d.detail ? " · " + d.detail : ""))) || "HTTP " + r.status), { status: r.status });
  return d;
}
const trimite = (cale, corp) => cere(cale, { method: "POST", body: JSON.stringify(corp), headers: { "content-type": "application/json", origin: BAZA } });

// Alerta pleaca INTAI in KV (se vede in Radar, pe orice dispozitiv de acasa); apoi, daca e
// cerut, pe canalul extern. "Trimisa" = a ajuns macar in KV.
async function trimiteAlerta(m, bot, cheie) {
  let inKv = false;
  try { const r = await trimite("/api/istoric-bot?action=alerte", { alerta: { t: Date.now(), nivel: m.nivel, titlu: m.titlu, mesaj: m.mesaj || "", bot: bot || null, cheie: cheie || null } }); inKv = !!(r && r.ok); }
  catch (e) { jurnal("alerta in KV EȘEC", e.message); }
  if (CANAL === "ntfy") { const ok = await ntfy(m); return inKv || ok; }
  if (CANAL === "discord") { const ok = await trimiteDiscord(m, { fetch, webhook: DISCORD_WEBHOOK, jurnal }); return inKv || ok; }
  if (!inKv) jurnal("alerta NETRIMISA", m.nivel, m.titlu);
  else jurnal("alerta", m.nivel, m.titlu);
  return inKv;
}
async function ntfy(m) {
  if (process.env.COLECTOR_FARA_NTFY) { jurnal("ntfy (probă, netrimis)", m.nivel, m.titlu); return true; }
  try {
    const r = await fetch("https://ntfy.sh/", { method: "POST", signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ topic: NTFY.topic, title: m.titlu, message: m.mesaj || m.titlu,
        priority: m.nivel === "critic" ? 5 : m.nivel === "atentie" ? 4 : 2,
        tags: [m.nivel === "critic" ? "rotating_light" : m.nivel === "atentie" ? "warning" : "white_check_mark"] }) });
    jurnal("ntfy", m.nivel, r.status, m.titlu);
    return r.ok;
  } catch (e) { jurnal("ntfy EȘEC", e.message); return false; }
}

const STARE_FIS = path.join(DATA, "alerte-stare.json");
let stareAlerte = {}; try { stareAlerte = JSON.parse(fs.readFileSync(STARE_FIS, "utf8")); } catch {}
const directii = {}; // bot -> { la, fata4h, dir4h, regim }
// v79.1: regimul "miscare" pe ACELEASI lumanari ca fisa: 15M, ~30 de zile. La prima tura se
// aduc 6 pagini (cu pauza), apoi doar pagina cea mai noua se imbina peste cele vechi.
const lumanari15 = {}; // simbol -> { randuri, la }
async function lumanari15M(s) {
  const st = lumanari15[s];
  if (st && Date.now() - st.la < DIRECTIE_MS) return st.randuri;
  let randuri = st ? st.randuri : [], end = null;
  const pagini = st ? 1 : 6;
  for (let p = 0; p < pagini; p++) {
    const k = await cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s) + "&interval=15M&limit=500" + (end ? "&endTime=" + end : ""));
    const r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
    if (!r) throw new Error((k && (k.error || k.message)) || "fara lumanari 15M");
    randuri = GridCalcul.imbinaRanduri(randuri, r, 3000);
    const t = r.map((x) => Number(x && x.time)).filter(Number.isFinite);
    if (r.length < 500 || !t.length) break;
    end = Math.min(...t) - 1;
    if (p < pagini - 1) await new Promise((rs) => setTimeout(rs, 1600));
  }
  lumanari15[s] = { randuri, la: Date.now() };
  return randuri;
}

async function directiaBotului(b) {
  const d = directii[b.id];
  if (d && Date.now() - d.la < DIRECTIE_MS) return d;
  const s = TabloBot.simboluri(b.baza, b.quote).pionex;
  try {
    const k = await cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s) + "&interval=4H&limit=500");
    const a = Directie.analizeaza(k && k.data && k.data.klines, 6, b.directie);
    // v79.1: regimul "miscare" pe 15M / 30 de zile - identic cu fisa (nu pe 4h ca in v79.0)
    let regim = null;
    try { regim = GridCalcul.regim(GridCalcul.bare(await lumanari15M(s))); } catch (e) { jurnal("regim 15M", b.id, e.message); }
    directii[b.id] = { la: Date.now(), fata4h: a.dir ? a.fata.ton : null, dir4h: a.dir, regim, k4: k && k.data && k.data.klines, calculat: false };
  } catch (e) { jurnal("direcție", b.id, e.message); directii[b.id] = { la: Date.now(), fata4h: null, dir4h: null, regim: null }; }
  return directii[b.id];
}

// v82: semnalele botului. Fisa pe moneda botului (15M/30 z din cache, 4H din directie, 1D agregat),
// regimul BTC (15M, cache), futures Binance (poate lipsi), planul si costurile -> SemnaleBot.
const semnaleUlt = {}; // bot -> ultimul rezultat (se refoloseste intre calcule)
async function semnaleBot(b, ctx, acum) {
  const d = directii[b.id];
  if (!d || d.calculat) return semnaleUlt[b.id] || null;
  d.calculat = true;
  const s = TabloBot.simboluri(b.baza, b.quote).pionex;
  const r15 = await lumanari15M(s);
  const b4 = GridCalcul.bare(d.k4), b1 = GridCalcul.agrega(b4, 86400000);
  const fisa = GridProba.fisa({ simbol: s, pret: GridCalcul.pretCurent(r15), b15: GridCalcul.bare(r15), b4h: b4, b1d: b1.slice(0, -1), suma: Number(b.investit) || 100, H: 2, dir: null, levier: null, minNotional: null });
  const f = fisa && !fisa.eroare ? fisa : null;
  let regimBtc = null; try { regimBtc = GridCalcul.regim(GridCalcul.bare(await lumanari15M("BTC_USDT_PERP"))); } catch (e) { jurnal("regim BTC", e.message); }
  let fut = null; try { fut = await cere("/api/market?type=futures&symbol=" + encodeURIComponent(String(b.baza || "").replace(/\.PERP$/, "") + "USDT")); } catch (e) { fut = null; }
  const st = stareAlerte[b.id] || {};
  const afaraOre = st._afaraDe ? (acum - st._afaraDe) / 3600000 : 0;
  const dir = String(b.directie || "").toLowerCase();
  const x = { bot: b, fisa: f, plan: ctx.plan || null, costuri: TabloExtra.grileVsCosturi(b, acum),
    btc: SemnaleBot.btcAvertizare(regimBtc, f && f.regim), aglomerare: SemnaleBot.aglomerare(fut, dir),
    muta: SemnaleBot.mutaGridul(b, f, afaraOre), iaProfit: SemnaleBot.iaProfit(b, f) };
  x.semafor = SemnaleBot.semafor(x);
  // socoteala in KV
  let v = null; try { v = await cere("/api/istoric-bot?action=semnale&bot=" + encodeURIComponent(b.id)); } catch (e) { v = null; }
  let log = v && v.semnale && Array.isArray(v.semnale.log) ? v.semnale.log : [];
  log = SemnaleBot.judeca(SemnaleBot.noteaza(log, x.semafor, b.profitTotal, acum), b.profitTotal, b.investit, acum);
  try { await trimite("/api/istoric-bot?action=semnale", { bot: b.id, log, acum: { la: acum, btc: x.btc, aglomerare: x.aglomerare, afaraOre, regimBtc } }); } catch (e) { jurnal("semnale KV", e.message); }
  semnaleUlt[b.id] = x;
  return x;
}

// Alerte despre colector insusi: daca nu mai poate citi botul, sau un bot care
// mergea dispare din lista (inchis sau lichidat), omul trebuie sa afle - altfel
// tacerea alertelor s-ar citi ca "totul e bine".
const META = "_colector";
function meta() { return stareAlerte[META] || (stareAlerte[META] = { citireRea: 0, anuntatRau: 0, cunoscuti: {} }); }
async function anuntaColector(nivel, titlu, mesaj) { return trimiteAlerta({ nivel, titlu, mesaj }, null, "colector"); }

let esecuri = 0;
async function tura() {
  const acum = Date.now();
  bate();
  let d;
  try { d = await cere("/api/bot-orders"); esecuri = 0; }
  catch (e) {
    // Serverul oprit = fereastra Radarului inchisa. Dupa 15 minute ne oprim.
    if (!e.status) { esecuri++; jurnal("serverul nu răspunde (" + esecuri + "/" + MAX_ESECURI + "):", e.message); if (esecuri >= MAX_ESECURI) { jurnal("ies: serverul nu mai răspunde"); process.exit(0); } }
    else {
      jurnal("bot-orders", e.status, e.message);
      const m = meta(); m.citireRea = m.citireRea || acum;
      // 10 minute la rand fara citire -> o alerta; se repeta cel mult la 3 ore
      if (acum - m.citireRea >= 10 * 60000 && acum - (m.anuntatRau || 0) >= 3 * 3600000) {
        if (await anuntaColector("critic", "Crypto Radar nu mai poate citi botul", "De " + Math.round((acum - m.citireRea) / 60000) + " minute: " + e.message + ". Alertele nu mai sunt de încredere până se rezolvă.")) m.anuntatRau = acum;
      }
      try { fs.writeFileSync(STARE_FIS, JSON.stringify(stareAlerte)); } catch {}
    }
    return;
  }
  const m = meta();
  if (m.citireRea && m.anuntatRau) await anuntaColector("info", "Crypto Radar citește din nou botul", "Alertele merg din nou.");
  m.citireRea = 0; m.anuntatRau = 0;
  const boti = Array.isArray(d && d.bots) ? d.bots : [];
  // un bot care mergea si a disparut din lista
  const acumIds = {}; for (const b of boti) if (b && b.id) acumIds[b.id] = true;
  for (const id of Object.keys(m.cunoscuti)) {
    if (!acumIds[id] && m.cunoscuti[id].activ) {
      if (await anuntaColector("critic", (m.cunoscuti[id].nume || "Botul") + " nu mai apare în lista Pionex", "Poate a fost închis sau lichidat. Verifică în aplicația Pionex.")) m.cunoscuti[id].activ = false;
    }
  }
  for (const b of boti) if (b && b.id) m.cunoscuti[b.id] = { activ: b.activ !== false, nume: String(b.baza || "").replace(/\.PERP$/, "") };
  for (const b of boti) {
    if (!b || !b.id) continue;
    try {
      await trimite("/api/istoric-bot?action=adauga", { bot: b.id, intrare: { t: acum, perechi: b.ordinePerechi, pretPerp: b.pretCurent,
        profitNet: b.profitNet, comisioane: b.comisioane, gridProfitBrut: b.gridProfitBrut, investit: b.investit,
        profitTotal: b.profitTotal, distantaLichidarePct: b.distantaLichidarePct } });
    } catch (e) { jurnal("istoric", b.id, e.status || "", e.message); }
    if (b.activ === false && !(stareAlerte[b.id] && stareAlerte[b.id].activ && stareAlerte[b.id].activ.nivel === "ok")) continue;
    const ctx = Object.assign({}, await directiaBotului(b));
    // v81: planul lui pentru bot (tinut pe server) + de cand e pretul in afara gridului
    try {
      const pl = await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(b.id));
      const st = stareAlerte[b.id] || (stareAlerte[b.id] = {});
      const p = Number(b.pretCurent), afara = Number.isFinite(p) && b.gridJos != null && b.gridSus != null && (p < Number(b.gridJos) || p > Number(b.gridSus));
      st._afaraDe = afara ? (st._afaraDe || acum) : null;
      if (pl && pl.plan) ctx.plan = TabloExtra.planStare(b, pl.plan, { afaraDe: st._afaraDe }, acum);
    } catch (e) { jurnal("plan", b.id, e.message); }
    // v82: semnalele (o data la ~5 min, cand vin lumanari noi) - notate si judecate dupa 24 h
    try { const sm = await semnaleBot(b, ctx, acum); if (sm) ctx.semnale = sm; } catch (e) { jurnal("semnale", b.id, e.message); }
    const inainte = stareAlerte[b.id] || {};
    const r = Alerte.evalueaza(b, ctx, inainte, acum);
    stareAlerte[b.id] = r.stare;
    // o alerta care n-a plecat (ntfy picat, fara internet) nu se trece ca trimisa:
    // starea ei revine la cea de dinainte, ca tura urmatoare s-o reincerce
    for (const msg of r.mesaje) if (!(await trimiteAlerta(msg, b.id, msg.cheie))) {
      if (inainte[msg.cheie]) stareAlerte[b.id][msg.cheie] = inainte[msg.cheie]; else delete stareAlerte[b.id][msg.cheie];
    }
  }
  try { await turaRaport(acum); } catch (e) { jurnal("raport", e.message); }
  try { fs.writeFileSync(STARE_FIS, JSON.stringify(stareAlerte)); } catch {}
  try { await trimite("/api/istoric-bot?action=config", Object.assign({ colectorLa: acum, canal: CANAL === "ntfy" ? "ntfy" : CANAL === "discord" ? "discord" : "radar" }, NTFY.topic ? { ntfyTopic: NTFY.topic } : {})); } catch (e) { jurnal("config", e.message); }
}

// v79 F3: o data pe ora, "pe care monede pornesc grid acum?" pe top 100 PERP dupa volum,
// cu lumanari de 4h (o cerere pe moneda, cu pauza - serverul are si el poarta de ritm).
// Rezultatul merge in KV (istoric-bot?action=clasament); fereastra Grid il arata.
const CLASAMENT_MS = Number(process.env.COLECTOR_CLASAMENT_MS) || 3600000, CLASAMENT_TOP = 100;
let clasamentLa = 0, clasamentInLucru = false;
async function turaClasament() {
  if (clasamentInLucru || Date.now() - clasamentLa < CLASAMENT_MS) return;
  clasamentInLucru = true;
  try {
    const r = await turaClasamentModul({ cere, trimite, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), GridCalcul, GridClasament, top: CLASAMENT_TOP });
    clasamentLa = r.urcat ? Date.now() : Date.now() - CLASAMENT_MS + 10 * 60000;   // neurcat -> reincearca in 10 min
  } catch (e) { jurnal("clasament ESEC", e.message); clasamentLa = Date.now() - CLASAMENT_MS + 10 * 60000; }
  clasamentInLucru = false;
}

if (CANAL === "discord" && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(DISCORD_WEBHOOK)) jurnal("ATENTIE: ALERTE_CANAL=discord dar DISCORD_WEBHOOK lipseste/gresit in .dev.vars - alertele raman doar in Radar");
// v79.5: laboratorul de grid, o data pe zi (prima data la 30 de minute dupa pornire), niciodata
// peste clasament. ~20 monede x 6 pagini x 1,6 s ~ 4 minute.
const LABORATOR_MS = 24 * 3600000;
let laboratorLa = Date.now() - LABORATOR_MS + 30 * 60000, laboratorInLucru = false;
async function turaLaborator() {
  if (process.env.COLECTOR_FARA_LABORATOR || laboratorInLucru || clasamentInLucru || Date.now() - laboratorLa < LABORATOR_MS) return;
  laboratorInLucru = true;
  try {
    const cerePionex = (tip, simbol, end) => cere(tip === "tickers" ? "/api/market?type=pionex_tickers&market=PERP" : "/api/market?type=pionex_klines&symbol=" + encodeURIComponent(simbol) + "&interval=15M&limit=500" + (end ? "&endTime=" + end : ""));
    const r = await turaLaboratorModul({ cere: cerePionex, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), GridCalcul, GridLaborator, GridClasament, top: 20, H: 2 });
    if (r.monede >= 10) { await trimite("/api/istoric-bot?action=laborator", r); laboratorLa = Date.now(); }
    else { jurnal("laborator NEURCAT: doar", r.monede, "monede"); laboratorLa = Date.now() - LABORATOR_MS + 60 * 60000; }
  } catch (e) { jurnal("laborator ESEC", e.message); laboratorLa = Date.now() - LABORATOR_MS + 60 * 60000; }
  laboratorInLucru = false;
}

// v83: "daca ascultai de Radar" pentru botii inchisi - o data pe ora, cel mult 5 boti noi pe tura
let cfLa = Date.now() - 3600000 + 10 * 60000, cfInLucru = false;
async function turaCf() {
  if (process.env.COLECTOR_FARA_CLASAMENT || cfInLucru || clasamentInLucru || laboratorInLucru || Date.now() - cfLa < 3600000) return;
  cfInLucru = true;
  try {
    const v = await cere("/api/istoric-bot?action=contrafactual");
    const gata = {}; Object.keys((v && v.contrafactual) || {}).forEach((k) => { gata[k] = true; });
    const rez = await turaContrafactual({
      cereBoti: async () => { const d = await cere("/api/bot-orders?status=finished&limit=100"); return (d && Array.isArray(d.bots) ? d.bots : []).map((x) => x.brut || x); },
      cereKlines: async (s, iv, lim, end) => { const k = await cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s) + "&interval=" + iv + "&limit=" + lim + "&endTime=" + end); await new Promise((r) => setTimeout(r, 1600)); if (!k || !k.data || !Array.isArray(k.data.klines)) throw new Error((k && (k.error || k.message)) || "fara lumanari"); return k.data.klines; },
      gata, GridCalcul, GridProba, JurnalTrade, Contrafactual, jurnal, max: 5 });
    if (rez.length) await trimite("/api/istoric-bot?action=contrafactual", { boti: rez });
  } catch (e) { jurnal("contrafactual ESEC", e.message); }
  cfLa = Date.now(); cfInLucru = false;
}

// v84: raportul de duminica - o data pe saptamana, duminica dupa ora 20 (ora Romaniei)
function saptamanaRo(t) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t));
  const g = (k) => (p.find((x) => x.type === k) || {}).value;
  return { zi: g("weekday"), ora: Number(g("hour")), data: g("year") + "-" + g("month") + "-" + g("day") };
}
async function turaRaport(acum) {
  const r = saptamanaRo(acum);
  if (r.zi !== "Sun" || r.ora < 20) return;
  const m = meta();
  if (m.raportTrimis === r.data) return;
  try {
    const d = await cere("/api/bot-orders?status=finished&limit=100");
    const trades = JurnalTrade.din((d && Array.isArray(d.bots) ? d.bots : []).map((x) => x.brut || x));
    let soc = {};
    for (const id of Object.keys(m.cunoscuti || {})) {
      try { const v = await cere("/api/istoric-bot?action=semnale&bot=" + encodeURIComponent(id)); const s = SemnaleBot.socoteala((v && v.semnale && v.semnale.log) || []); for (const k of Object.keys(s)) { const x = soc[k] || (soc[k] = { judecate: 0, corecte: 0 }); x.judecate += s[k].judecate; x.corecte += s[k].corecte; } } catch (e) {}
    }
    let lab = null; try { const v = await cere("/api/istoric-bot?action=laborator"); lab = v && v.laborator; } catch (e) {}
    const rap = Obiceiuri.raportDuminica({ trades, acum, socoteala: soc, laborator: lab });
    await trimite("/api/istoric-bot?action=raport", { la: acum, linii: rap.linii, saptamana: r.data });
    if (await trimiteAlerta({ nivel: "info", titlu: "Raportul de duminică (" + r.data + ")", mesaj: rap.linii.join("\n") }, null, "raport")) m.raportTrimis = r.data;
  } catch (e) { jurnal("raport ESEC", e.message); }
}

jurnal("pornit, PID " + process.pid + ", server " + BAZA + ", canal alerte: " + CANAL + (NTFY.topic ? " (" + NTFY.topic + (NTFY.nou ? ", NOU" : "") + ")" : ""));
if (NTFY.nou) await ntfy({ nivel: "info", titlu: "Crypto Radar: alertele sunt legate", mesaj: "De aici vin alertele botului: lichidare aproape, Pionex în stare anormală, prețul ieșit din grid, piața pe 4 ore împotriva botului, gata liniștea (oprește gridul)." });
// Turele nu se suprapun: urmatoarea porneste abia dupa ce s-a terminat asta.
async function bucla() {
  try { await tura(); } catch (e) { jurnal("tură", e.message); }
  if (!process.env.COLECTOR_FARA_CLASAMENT) turaClasament().then(() => turaLaborator()).then(() => turaCf()).catch((e) => jurnal("clasament/laborator", e.message));   // nu blocheaza tura de un minut
  if (process.env.COLECTOR_O_TURA) process.exit(0);
  setTimeout(bucla, PAS_MS);
}
bucla();
