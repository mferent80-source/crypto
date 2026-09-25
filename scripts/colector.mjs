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
import { turaDimineata as turaDimineataModul } from "./lib/tura-dimineata.mjs";
import { turaIdei as turaIdeiModul } from "./lib/tura-idei.mjs";
import { faCopie } from "./lib/copie.mjs";
import os from "node:os";
import { turaT212 as turaT212Modul, turaPlanuri as turaPlanuriModul, turaCfActiuni as turaCfActiuniModul } from "./lib/tura-t212.mjs";

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
// In modul de proba (COLECTOR_DOAR_INCARCA) nu se atinge pornirea unica: nici nu iese pentru
// ca ruleaza deja unul, nici nu scrie / sterge colector.pid-ul colectorului adevarat.
const DOAR_INCARCA = !!process.env.COLECTOR_DOAR_INCARCA;
if (!DOAR_INCARCA) try {
  const [vechi, la] = fs.readFileSync(PID, "utf8").split(/\s+/).map(Number);
  if (vechi && vechi !== process.pid && Date.now() - (la || 0) < BATAIE_MS) {
    process.kill(vechi, 0);
    jurnal("mai rulează un colector (PID " + vechi + ") - ies"); process.exit(0);
  }
} catch {}
const bate = () => { if (DOAR_INCARCA) return; try { fs.writeFileSync(PID, process.pid + " " + Date.now()); } catch {} };
bate();
const curataPid = () => { if (DOAR_INCARCA) return; try { if (Number(fs.readFileSync(PID, "utf8").split(/\s+/)[0]) === process.pid) fs.unlinkSync(PID); } catch {} };
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
const T212 = incarca("t212.js", "T212");
const ActiuniSemnale = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public", "lib", "actiuni-semnale.js"), "utf8") + "; return ActiuniSemnale;")(GridCalcul);
const Consilier = new Function("ActiuniSemnale", fs.readFileSync(path.join(RAD, "public", "lib", "consilier.js"), "utf8") + "; return Consilier;")(ActiuniSemnale);
const Idei = new Function("ActiuniSemnale", fs.readFileSync(path.join(RAD, "public", "lib", "idei.js"), "utf8") + "; return Idei;")(ActiuniSemnale);
// Nasdaq-100 din aplicatie (o singura sursa: public/app.js, NDX_UNIVERSE)
const NDX = (() => { try { const m = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").match(/const NDX_UNIVERSE=(\[[^\]]*\])/); return m ? JSON.parse(m[1]) : []; } catch { return []; } })();
const Obiceiuri = new Function("GridCalcul", "GridProba", "JurnalTrade", fs.readFileSync(path.join(RAD, "public", "lib", "obiceiuri.js"), "utf8") + "; return Obiceiuri;")(GridCalcul, GridProba, JurnalTrade);

// Proba de incarcare (scripts/colector-v77.mjs): toate modulele s-au incarcat, fara retea.
if (process.env.COLECTOR_DOAR_INCARCA) { console.log("INCARCAT", [Alerte, Directie, TabloBot, GridCalcul, GridClasament, JurnalTrade, Contrafactual, SemnaleBot, TabloExtra, GridProba, GridLaborator, Obiceiuri, T212, ActiuniSemnale, Consilier, Idei].every(Boolean) && NDX.length > 90); process.exit(0); }
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
      if (pl && pl.plan && !pl.plan.proba) ctx.plan = TabloExtra.planStare(b, pl.plan, { afaraDe: st._afaraDe }, acum);   // v88: nu si planul unei probe
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

// v85: istoricul COMPLET Trading 212 in KV-ul de acasa - o data la 30 de minute, doar cu cheile T212 puse.
// T212 lasa 6 cereri de istoric pe minut => o pagina la 11 s, cel mult 12 pagini pe tura (~2 minute).
let t212La = Date.now() - 30 * 60000 + 2 * 60000, t212InLucru = false;
async function turaT212() {
  if (process.env.COLECTOR_FARA_T212 || t212InLucru || Date.now() - t212La < 5 * 60000) return;
  const v = citesteVarsSigur(); if (!(v.T212_API_KEY && v.T212_API_SECRET)) { t212La = Date.now(); return; }
  t212InLucru = true;
  try {
    await turaT212Modul({
      cereStare: async () => { const d = await cere("/api/t212?action=istoric"); return d && d.stare || {}; },
      cerePagina: (c) => cere("/api/t212?action=ordine" + (c ? "&cursor=" + encodeURIComponent(c) : "")),
      salveaza: (corp) => trimite("/api/t212?action=istoric", corp),
      umpleri: T212.umpleri, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), jurnal, max: 12 });
    // v87: la 5 minute (o pagina de cap pe tura), ca frana de "cumparat in jos" sa vina repede dupa cumparare
    t212La = Date.now();
  } catch (e) { jurnal("t212 ESEC", e.message); t212La = Date.now() + 5 * 60000; }
  t212InLucru = false;
}

// v85: alertele planurilor scrise de el pe pozitiile T212 (stop / tinta / -X% de la maxim) - la 5 minute,
// separat de clasament (acela poate tine 3 minute). O alerta o data pe prag pe zi (cheile raman 3 zile).
let planT212La = 0, planT212InLucru = false;
async function turaPlanuriT212() {
  if (process.env.COLECTOR_FARA_T212 || planT212InLucru || Date.now() - planT212La < 5 * 60000) return;
  const v = citesteVarsSigur(); if (!(v.T212_API_KEY && v.T212_API_SECRET)) { planT212La = Date.now(); return; }
  planT212InLucru = true; planT212La = Date.now();
  const m = meta(), st = m.t212Alerte || (m.t212Alerte = {}), prag = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  for (const k of Object.keys(st)) if (k.slice(-10) < prag) delete st[k];
  try {
    await turaPlanuriModul({
      cerePozitii: async () => { const d = await cere("/api/t212?action=pozitii"); return d && d.pozitii || []; },
      cerePlan: async (tk) => { const d = await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + tk)); return d && d.plan || null; },
      cereBare: async (tk) => { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk)); return GridCalcul.bare(d && d.randuri || []); },
      trimite: (msg, cheie) => trimiteAlerta(msg, null, cheie.replace(/[^A-Za-z0-9_-]/g, "")), stare: st, ActiuniSemnale, T212, jurnal });
  } catch (e) { jurnal("planuri t212 ESEC", e.message); }
  // v87: frana de "cumparat in jos" (NPA: 4 cumparari pe minus, -8.165 lei) + plafonul de 20% din cont
  try {
    const zi = new Date().toISOString().slice(0, 10), h = await cere("/api/t212?action=istoric");
    for (const x of ActiuniSemnale.cumparariInJos((h && h.umpleri) || []).filter((y) => Date.now() - y.t < 24 * 3600000)) {
      const k = "t212-injos-" + x.id + "-" + new Date(x.t).toISOString().slice(0, 10);
      if (st[k]) continue;
      if (await trimiteAlerta(ActiuniSemnale.alertaFrana(x, T212.simbol(x.ticker)), null, k.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60))) st[k] = true;
    }
    const c = await cere("/api/t212?action=cont"), pz = await cere("/api/t212?action=pozitii");
    const cash = c && c.cash || {}, poz = (pz && pz.pozitii || []).filter((x) => x && x.quantity > 0);
    let usd = 0; poz.forEach((x) => { usd += x.quantity * x.currentPrice; });
    const inv = cash.total > 0 && cash.free >= 0 ? cash.total - cash.free : null;
    if (inv !== null && usd > 0) for (const x of poz) {
      const pond = x.quantity * x.currentPrice / usd * inv / cash.total, k = "t212-conc-" + x.ticker + "-" + zi;
      if (pond <= 0.2 || st[k]) continue;
      const s = T212.simbol(x.ticker);
      if (await trimiteAlerta({ nivel: "atentie", titlu: s + " e " + Math.round(pond * 100) + "% din contul Trading 212", mesaj: "Peste plafonul de 20%: o zi proastă a ei e ziua proastă a contului. 👉 Ce aș face eu: n-aș mai adăuga la " + s + "; la următoarea creștere aș vinde o parte." }, null, k.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60))) st[k] = true;
    }
  } catch (e) { jurnal("frana t212", e.message); }
  planT212InLucru = false;
}

// v85: "daca ascultai de Radar" pe actiuni - o data pe ora, 40 de actiuni pe tura (cat timp mai sunt, la 10 min)
let cfActLa = Date.now() - 3600000 + 15 * 60000, cfActInLucru = false;
async function turaCfActiuni() {
  if (process.env.COLECTOR_FARA_T212 || cfActInLucru || t212InLucru || Date.now() - cfActLa < 3600000) return;
  const v = citesteVarsSigur(); if (!(v.T212_API_KEY && v.T212_API_SECRET)) { cfActLa = Date.now(); return; }
  cfActInLucru = true;
  try {
    const r = await turaCfActiuniModul({
      umpleri: async () => { const d = await cere("/api/t212?action=istoric"); return d && d.umpleri || []; },
      gata: async () => { const d = await cere("/api/t212?action=cf"); return d && d.cf || {}; },
      cereBare: async (tk, nm) => {
        try { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk) + (nm ? "&nume=" + encodeURIComponent(nm) : "")); return GridCalcul.bare(d && d.randuri || []); }
        catch (e) { if (e.status === 404) return null; throw e; }   // 404 = fara preturi (delistata); altceva se reincearca
      },
      salveaza: (m) => trimite("/api/t212?action=cf", { verdicte: m }),
      T212, ActiuniSemnale, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), jurnal, max: 40 });
    cfActLa = r.ramase ? Date.now() - 3600000 + 10 * 60000 : Date.now();
  } catch (e) { jurnal("cf actiuni ESEC", e.message); cfActLa = Date.now() - 3600000 + 20 * 60000; }
  cfActInLucru = false;
}

// v91: copia de siguranta a datelor Radarului (KV-ul local al serverului), o data pe zi, ultimele 14 zile
function turaCopie() {
  try { const r = faCopie({ sursa: path.join(RAD, ".wrangler", "state", "v3", "kv"), dest: path.join(DATA, "copii"), zi: new Date().toISOString().slice(0, 10), pastreaza: 14 }); if (r.facut) jurnal("copie de siguranta: " + r.tinta); }
  catch (e) { jurnal("copie ESEC", e.message); }
}

// v90: ideile de cumparare pe actiuni - o data pe zi, de la 8:00 ora Romaniei (inainte de rezumatul de la 9)
let ideiInLucru = false;
async function turaIdeiZi() {
  if (process.env.COLECTOR_FARA_IDEI || ideiInLucru) return;
  const z = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const g = (k) => (z.find((x) => x.type === k) || {}).value, zi = g("year") + "-" + g("month") + "-" + g("day"), m = meta();
  if (Number(g("hour")) < 8 || m.ideiZi === zi) return;
  ideiInLucru = true;
  try {
    const h = await cere("/api/t212?action=istoric").catch(() => null), inchise = h && Array.isArray(h.umpleri) ? T212.perechi(h.umpleri).inchise : [];
    const id = await cere("/api/t212?action=idei").catch(() => null), lista = id && Array.isArray(id.lista) ? id.lista : [];
    // universul: Nasdaq-100 + actiunile americane pe care a castigat + lista lui
    const castig = {}; inchise.forEach((t) => { if (/_US_EQ$/.test(t.ticker)) castig[t.ticker] = (castig[t.ticker] || 0) + t.rezultat; });
    // ale lui intai (actiunile pe care a castigat + lista lui), apoi Nasdaq-100: la dubluri ramane varianta cu istoricul lui
    const tickere = [...new Set(Object.keys(castig).filter((k) => castig[k] > 0).concat(lista.map((x) => x.replace(/\./g, "-") + "_US_EQ"), NDX.map((x) => x + "_US_EQ")))];
    const r = await turaIdeiModul({ tickere, inchise, Idei, jurnal, simbol: (tk) => T212.simbol(tk), acum: Date.now(), pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)),
      cereBare: async (tk) => GridCalcul.bare((await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk))).randuri || []),
      cereRezultate: async (tk) => { const d = await cere("/api/t212?action=rezultate&ticker=" + encodeURIComponent(tk)); return d && d.data || null; } });
    const urm = Idei.urmarire(id && Array.isArray(id.istoric) ? id.istoric : [], r.preturi, Date.now());
    await trimite("/api/t212?action=idei", { la: Date.now(), zi, actiuni: r.actiuni, judecate: r.judecate, trecute: r.trecute, urmarire: urm });
    m.ideiZi = zi;
  } catch (e) { jurnal("idei ESEC", e.message); }
  ideiInLucru = false;
}

// v89: rezumatul de dimineata - o data pe zi, dupa 9:00 ora Romaniei (Radar + Discord)
let dimineataInLucru = false;
async function dateDimineata() {
  const out = { deIesit: [], rezultate: [], plafon: [], stiri: [], boti: [] };
  const bare = (r) => (Array.isArray(r) && r.length ? GridCalcul.bare(r.concat([r[r.length - 1]])) : null);   // bare() scoate ultima (in formare): o dublez
  try { const pz = await cere("/api/stiri?action=piata"); out.piata = Consilier.piata({ qqq: bare(pz.qqq), spy: bare(pz.spy), vix: bare(pz.vix), fg: pz.fg }); } catch (e) { jurnal("dimineata piata", e.message); }
  const v = citesteVarsSigur();
  if (v.T212_API_KEY && v.T212_API_SECRET) {
    try {
      const c = await cere("/api/t212?action=cont"), pz = await cere("/api/t212?action=pozitii"), h = await cere("/api/t212?action=istoric");
      const poz = (pz && pz.pozitii || []).filter((x) => x && x.quantity > 0), des = T212.perechi((h && h.umpleri) || []).deschise, cash = c && c.cash || {};
      let usd = 0; poz.forEach((x) => { usd += x.quantity * x.currentPrice; });
      const inv = cash.total > 0 && cash.free >= 0 ? cash.total - cash.free : null;
      const zi = new Date().toISOString().slice(0, 10), intrari = [], barePe = {};
      for (const x of poz) {
        const s = T212.simbol(x.ticker);
        try {
          const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.ticker)), bare = GridCalcul.bare(d && d.randuri || []), st = ActiuniSemnale.stare(bare, x.currentPrice);
          barePe[x.ticker] = bare;
          const niv = ActiuniSemnale.semafor({ ticker: x.ticker, simbol: s, qty: x.quantity, pretMediu: x.averagePrice, pret: x.currentPrice, plan: null }, st).nivel;
          if (niv !== "fara-date") intrari.push({ zi, ticker: x.ticker, nivel: niv, pret: x.currentPrice });   // v91: socoteala sfaturilor
          if (niv === "iesi") {
            let q = 0, cost = 0; des.forEach((l) => { if (l.ticker === x.ticker) { q += l.qty; cost += l.qty * l.costBuc; } });
            out.deIesit.push({ simbol: s, pctLei: q > 0 && Math.abs(q - x.quantity) / x.quantity < 0.02 ? x.ppl / (cost * x.quantity / q) : null });
          }
        } catch (e) { jurnal("dimineata", s, e.message); }
        try { const r = await cere("/api/t212?action=rezultate&ticker=" + encodeURIComponent(x.ticker)); if (r && r.data) out.rezultate.push({ simbol: s, data: r.data }); } catch {}
        if (inv !== null && usd > 0) { const pond = x.quantity * x.currentPrice / usd * inv / cash.total; if (pond > 0.2) out.plafon.push({ simbol: s, pond }); }
        try { const sn = await cere("/api/stiri?action=actiune&ticker=" + encodeURIComponent(x.ticker)); const t = (sn && sn.stiri || []).find((y) => y.la && Date.now() - y.la < 24 * 3600000); if (t) out.stiri.push({ simbol: s, titlu: t.titlu }); } catch {}
      }
      // v91: socoteala sfaturilor - semaforul de azi + preturile dupa 5/10/20 zile pentru sfaturile vechi
      try {
        const sf = await cere("/api/t212?action=sfaturi"), lista = (sf && sf.sfaturi) || [];
        for (const tk of [...new Set(lista.map((y) => y.ticker))]) if (!barePe[tk]) { try { barePe[tk] = GridCalcul.bare((await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk))).randuri || []); } catch {} }
        await trimite("/api/t212?action=sfaturi", { intrari, evaluari: Consilier.deEvaluat(lista, barePe, Date.now()) });
      } catch (e) { jurnal("socoteala sfaturi", e.message); }
    } catch (e) { jurnal("dimineata t212", e.message); }
  }
  // v91: linkul spre Radar de pe telefon (tunelul lui PORNESTE-SI-PE-TELEFON.bat), doar daca raspunde
  try {
    const u = Consilier.adresaTunel(fs.readFileSync(path.join(os.tmpdir(), "crypto-radar-tunel.log"), "latin1"));
    if (u) { const r = await fetch(u + "/api/market?type=health", { signal: AbortSignal.timeout(8000) }); if (r.ok) out.link = u; }
  } catch {}
  try { const id = await cere("/api/t212?action=idei"); out.idei = (id && id.idei && Array.isArray(id.idei.actiuni) ? id.idei.actiuni : []).slice(0, 5).map((x) => x.simbol); } catch {}
  try { const cl = await cere("/api/istoric-bot?action=clasament"); out.ideiBoti = Idei.ideiBoti(cl && cl.clasament, [], 3).map((x) => x.moneda); } catch {}
  try { const bo = await cere("/api/bot-orders"); out.boti = (bo && bo.bots || []).filter((b) => b.activ && Number.isFinite(Number(b.distantaLichidarePct)) && Math.abs(Number(b.distantaLichidarePct)) < 15).map((b) => ({ nume: String(b.baza || "").replace(/\.PERP$/, ""), lich: Math.abs(Number(b.distantaLichidarePct)) })); } catch {}
  return out;
}
async function turaDimineata() {
  if (process.env.COLECTOR_FARA_DIMINEATA || dimineataInLucru) return;
  dimineataInLucru = true;
  try { const r = await turaDimineataModul({ date: dateDimineata, Consilier, trimite: (m) => trimiteAlerta(m, null, "dimineata"), stare: meta(), jurnal }); if (r.trimis) jurnal("rezumatul de dimineata trimis"); }
  catch (e) { jurnal("dimineata ESEC", e.message); }
  dimineataInLucru = false;
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
    // v85: si actiunile (Trading 212), din istoricul strans acasa
    try { const h = await cere("/api/t212?action=istoric"); if (h && Array.isArray(h.umpleri) && h.umpleri.length) rap.linii = rap.linii.concat(ActiuniSemnale.raportSaptamana(T212.perechi(h.umpleri).inchise, acum)); } catch (e) { jurnal("raport t212", e.message); }
    await trimite("/api/istoric-bot?action=raport", { la: acum, linii: rap.linii, saptamana: r.data });
    if (await trimiteAlerta({ nivel: "info", titlu: "Raportul de duminică (" + r.data + ")", mesaj: rap.linii.join("\n") }, null, "raport")) m.raportTrimis = r.data;
  } catch (e) { jurnal("raport ESEC", e.message); }
}

jurnal("pornit, PID " + process.pid + ", server " + BAZA + ", canal alerte: " + CANAL + (NTFY.topic ? " (" + NTFY.topic + (NTFY.nou ? ", NOU" : "") + ")" : ""));
if (NTFY.nou) await ntfy({ nivel: "info", titlu: "Crypto Radar: alertele sunt legate", mesaj: "De aici vin alertele botului: lichidare aproape, Pionex în stare anormală, prețul ieșit din grid, piața pe 4 ore împotriva botului, gata liniștea (oprește gridul)." });
// Turele nu se suprapun: urmatoarea porneste abia dupa ce s-a terminat asta.
async function bucla() {
  try { await tura(); } catch (e) { jurnal("tură", e.message); }
  turaPlanuriT212().catch((e) => jurnal("planuri t212", e.message));
  turaCopie();
  turaIdeiZi().then(() => turaDimineata()).catch((e) => jurnal("idei/dimineata", e.message));
  if (!process.env.COLECTOR_FARA_CLASAMENT) turaClasament().then(() => turaLaborator()).then(() => turaCf()).then(() => turaT212()).then(() => turaCfActiuni()).catch((e) => jurnal("clasament/laborator", e.message));   // nu blocheaza tura de un minut
  if (process.env.COLECTOR_O_TURA) process.exit(0);
  setTimeout(bucla, PAS_MS);
}
bucla();
