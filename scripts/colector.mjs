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
import { turaPiata as turaPiataModul } from "./lib/tura-piata.mjs";
import { turaScan as turaScanModul } from "./lib/tura-scan.mjs";
import { faCopie } from "./lib/copie.mjs";
import os from "node:os";
import { turaT212 as turaT212Modul, turaPlanuri as turaPlanuriModul, turaCfActiuni as turaCfActiuniModul } from "./lib/tura-t212.mjs";
import { construiestePoza, costLeiDinLoturi, nivDinNiveluri, prevClose, prevSimbol, cadentaPoza, alerteSimboluri, bataieNecesara, pret30DinIstoric, pret24hDinIstoric } from "./lib/poza.mjs";
import { creeazaYahooExtra } from "./lib/yahoo-extra.mjs";
const VERSIUNE_COLECTOR = "v99.6";

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
const IndicatoriBot = incarca("indicatori-bot.js", "IndicatoriBot");
const Acasa = incarca("acasa.js", "Acasa");   // v93: rezumatul zilnic al actiunilor Nasdaq 100 (Home)   // v91.11: "Mediul botului" (acelasi ca in Tablou)
const Directie = incarca("directie.js", "Directie");
const Scan = incarca("scan.js", "Scan");   // v96: rezumatul zilnic pentru pagina Scan
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
if (process.env.COLECTOR_DOAR_INCARCA) { console.log("INCARCAT", [Alerte, IndicatoriBot, Acasa, Directie, Scan, TabloBot, GridCalcul, GridClasament, JurnalTrade, Contrafactual, SemnaleBot, TabloExtra, GridProba, GridLaborator, Obiceiuri, T212, ActiuniSemnale, Consilier, Idei].every(Boolean) && NDX.length > 90); process.exit(0); }
const ANTET = { authorization: "Bearer " + TOKEN, accept: "application/json" };
// v91.11 (1): pe tura, cate cereri de PRETURI Pionex au mers / au picat (26.09: 1 ora de preturi moarte fara nicio alerta)
let preturiTura = { ok: 0, rau: 0, eroare: null };
async function cere(cale, opt = {}) {
  const ePret = cale.startsWith("/api/market?type=pionex_");
  try {
    const r = await fetch(BAZA + cale, { ...opt, headers: { ...ANTET, ...(opt.headers || {}) }, signal: AbortSignal.timeout(20000) });
    const text = await r.text(); let d = null; try { d = JSON.parse(text); } catch {}
    if (!r.ok) throw Object.assign(new Error((d && (d.error + (d.detail ? " · " + d.detail : ""))) || "HTTP " + r.status), { status: r.status });
    if (ePret) { if (d && d.result === false) { preturiTura.rau++; preturiTura.eroare = String((d.error || "Pionex") + (d.detail ? " · " + d.detail : "")); } else preturiTura.ok++; }
    return d;
  } catch (e) {
    if (ePret) { preturiTura.rau++; preturiTura.eroare = String(e && e.message || e); }
    throw e;
  }
}
const trimite = (cale, corp) => cere(cale, { method: "POST", body: JSON.stringify(corp), headers: { "content-type": "application/json", origin: BAZA } });

// Alerta pleaca INTAI in KV (se vede in Radar, pe orice dispozitiv de acasa); apoi, daca e
// cerut, pe canalul extern. "Trimisa" = a ajuns macar in KV.
async function trimiteAlerta(m, bot, cheie) {
  let inKv = false;
  try { const r = await trimite("/api/istoric-bot?action=alerte", { alerta: { t: Date.now(), nivel: m.nivel, titlu: m.titlu, mesaj: m.mesaj || "", bot: bot || null, cheie: cheie || null } }); inKv = !!(r && r.ok); }
  catch (e) { jurnal("alerta in KV EȘEC", e.message); }
  // v97.9: unele alerte (grila atinsa) raman doar in Radar - pagina Alerts le arata, canalul extern nu le primeste
  if (m.doarRadar) { jurnal("alerta (doar în Radar)", m.nivel, m.titlu); return inKv; }
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
    // v91.11: "Mediul botului" - funding-ul monedei (Pionex, ultimele 100 de rate) si BTC pe 4h (directia + miscarea 15M)
    let funding = null, btc = null;
    try {
      const fr = await cere("/api/market?type=pionex_funding&symbol=" + encodeURIComponent(s)), l = (fr && fr.data && Array.isArray(fr.data.rates) ? fr.data.rates : []).slice().sort((x, y) => Number(y.fundingTime) - Number(x.fundingTime));
      if (l.length) { const iv = l.length > 1 ? Math.round((Number(l[0].fundingTime) - Number(l[1].fundingTime)) / 3600000) : 0; funding = { rate: Number(l[0].fundingRate), hist: l.map((x) => Number(x.fundingRate)), intervalOre: iv > 0 ? iv : 8 }; }
    } catch (e) { jurnal("funding", b.id, e.message); }
    try {
      const kb = await cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=4H&limit=200"), ab = Directie.analizeaza(kb && kb.data && kb.data.klines, 6, b.directie);
      let rb = null; try { rb = GridCalcul.regim(GridCalcul.bare(await lumanari15M("BTC_USDT_PERP"))); } catch (e) { rb = null; }
      btc = { dir: ab && ab.dir || null, regim: rb };
    } catch (e) { jurnal("BTC 4h", e.message); }
    directii[b.id] = { la: Date.now(), fata4h: a.dir ? a.fata.ton : null, dir4h: a.dir, regim, k4: k && k.data && k.data.klines, calculat: false, funding, btc };
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
// v98: ce a vazut ultima tura (pentru poza): botii si ultimele 30 de preturi ale fiecaruia (o poza pe tura, la un minut)
let ultimiiBoti = []; const pret30 = {}; let turaNr = 0;
async function tura() {
  const acum = Date.now();
  turaNr++;
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
  ultimiiBoti = boti;
  for (const b of boti) if (b && b.id && Number.isFinite(Number(b.pretCurent))) { const r = pret30[b.id] || (pret30[b.id] = []); r.push(Number(b.pretCurent)); if (r.length > 30) r.shift(); }
  // un bot care mergea si a disparut din lista
  const acumIds = {}; for (const b of boti) if (b && b.id) acumIds[b.id] = true;
  for (const id of Object.keys(m.cunoscuti)) {
    if (!acumIds[id] && m.cunoscuti[id].activ) {
      // v97.7: fisa de inchidere - botul cautat printre cei inchisi (motivul, rezultatul, planul, lectia); negasit -> mesajul vechi
      let fisa = null;
      try {
        const fb = await cere("/api/bot-orders?status=finished&limit=10"), x = (fb && fb.bots || []).find((y) => String(y.id) === String(id));
        if (x) {
          let plan = null, atrPct = null;
          try { const p = await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(id)); plan = p && p.plan && !p.plan.proba ? p.plan : null; } catch {}
          try { const sc = await cere("/api/istoric-bot?action=scan"), sim = String(x.baza || "").replace(/\.PERP$/, ""), r = (sc && sc.crypto && sc.crypto.randuri || []).find((q) => q.s === sim); atrPct = r ? r.atrPct : null; } catch {}
          fisa = TabloExtra.fisaInchidere(x, { plan, atrPct });
        }
      } catch (e) { jurnal("fisa de inchidere", id, e.message); }
      const trimis = fisa ? await trimiteAlerta({ nivel: fisa.nivel, titlu: fisa.titlu, mesaj: fisa.mesaj }, id, "inchis") : await anuntaColector("critic", (m.cunoscuti[id].nume || "Botul") + " nu mai apare în lista Pionex", "Poate a fost închis sau lichidat. Verifică în aplicația Pionex.");
      if (trimis) m.cunoscuti[id].activ = false;
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
      // v97.6: botul nou fara plan -> o data pe Discord, cu propunerea (dupa planul lui cel mai nou), la 10 min dupa pornire
      if (pl && !pl.plan && !st._faraPlan && Number(b.pornitLa) > 0 && acum - Number(b.pornitLa) > 10 * 60000) {
        let ult = null;
        try { const u = await cere("/api/istoric-bot?action=ultimulPlan"); if (u && u.plan) { ult = { plus: u.plan.plus, minus: u.plan.minus, afaraOre: u.plan.afaraOre };
          try { const fb = await cere("/api/bot-orders?status=finished&limit=30"), fa = await cere("/api/bot-orders").catch(() => null); const x = (fb && fb.bots || []).concat(fa && fa.bots || []).find((y) => String(y.id) === String(u.bot)); if (x) { ult.investit = Number(x.investit) || null; ult.nume = String(x.baza || "").replace(/\.PERP$/, ""); } } catch {} } } catch {}
        const pp = TabloExtra.propunePlan(ult, b.investit), nume = String(b.baza || "botul").replace(/\.PERP$/, "");
        const m = { nivel: "atentie", cheie: "fara-plan", titlu: nume + ": botul n-are plan", mesaj: "Fără țintă și prag scrise la rece nu te pot anunța când să încasezi sau să ieși." + (pp ? " Propun: plus +" + pp.plus + " USDT, minus −" + pp.minus + " USDT, " + pp.afaraOre + " h afară din grid (" + pp.nota + "). Îl pui din Tablou → „Pune planul propus”." : " Scrie-l în Tablou → „Planul tău”.") };
        if (await trimiteAlerta(m, b.id, m.cheie)) st._faraPlan = true;
      }
    } catch (e) { jurnal("plan", b.id, e.message); }
    // v82: semnalele (o data la ~5 min, cand vin lumanari noi) - notate si judecate dupa 24 h
    try { const sm = await semnaleBot(b, ctx, acum); if (sm) ctx.semnale = sm; } catch (e) { jurnal("semnale", b.id, e.message); }
    // v91.11: "Mediul botului" (miscarea, funding-ul, BTC) si pragul "iese pe zero"
    try {
      const cost = TabloExtra.grileVsCosturi(b, acum);
      ctx.mediu = IndicatoriBot.mediu({ regim: ctx.regim || null, funding: ctx.funding || null, fundingZi: cost && cost.fundingZi, btc: ctx.btc || null }, b.directie);
      mediuPe[b.id] = { b, mediu: ctx.mediu };
      const z = TabloExtra.dacaInchizi(b); if (z && z.pretZero > 0) ctx.pretZero = z.pretZero;
    } catch (e) { jurnal("mediu", b.id, e.message); }
    const inainte = stareAlerte[b.id] || {};
    const r = Alerte.evalueaza(b, ctx, inainte, acum);
    stareAlerte[b.id] = r.stare;
    // v91.11 (4): grila atinsa / pereche incheiata - contorii se muta abia dupa ce mesajul a plecat
    try {
      const g = Alerte.grila(b, stareAlerte[b.id]._grila || null);
      let plecat = true;
      for (const msg of g.mesaje) if (!(await trimiteAlerta(msg, b.id, msg.cheie))) plecat = false;
      if (plecat) stareAlerte[b.id]._grila = g.contori;
    } catch (e) { jurnal("grila", b.id, e.message); }
    // v96.5 opritorul care urca: dupa tinta, o data pe treapta; treapta se tine minte abia dupa ce mesajul a plecat
    try {
      const pu = Alerte.podeaUrca(b, ctx.plan || null, ctx, stareAlerte[b.id]._podea || null);
      let plecat = true;
      for (const msg of pu.mesaje) if (!(await trimiteAlerta(msg, b.id, msg.cheie))) plecat = false;
      if (plecat) { if (pu.stare) stareAlerte[b.id]._podea = pu.stare; else delete stareAlerte[b.id]._podea; }
    } catch (e) { jurnal("podea", b.id, e.message); }
    // o alerta care n-a plecat (ntfy picat, fara internet) nu se trece ca trimisa:
    // starea ei revine la cea de dinainte, ca tura urmatoare s-o reincerce
    for (const msg of r.mesaje) if (!(await trimiteAlerta(msg, b.id, msg.cheie))) {
      if (inainte[msg.cheie]) stareAlerte[b.id][msg.cheie] = inainte[msg.cheie]; else delete stareAlerte[b.id][msg.cheie];
    }
  }
  try { await turaPreturi(acum); } catch (e) { jurnal("preturi", e.message); }
  try { await turaMediu(acum); } catch (e) { jurnal("raport 3h", e.message); }
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
      cereBare: async (tk) => { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk)); return GridCalcul.bareBursa(d && d.randuri || [], Date.now()); },
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
        try { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk) + (nm ? "&nume=" + encodeURIComponent(nm) : "")); return GridCalcul.bareBursa(d && d.randuri || [], Date.now()); }
        catch (e) { if (e.status === 404) return null; throw e; }   // 404 = fara preturi (delistata); altceva se reincearca
      },
      salveaza: (m) => trimite("/api/t212?action=cf", { verdicte: m }),
      T212, ActiuniSemnale, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), jurnal, max: 40 });
    cfActLa = r.ramase ? Date.now() - 3600000 + 10 * 60000 : Date.now();
  } catch (e) { jurnal("cf actiuni ESEC", e.message); cfActLa = Date.now() - 3600000 + 20 * 60000; }
  cfActInLucru = false;
}

// v91: copia de siguranta a datelor Radarului (KV-ul local al serverului), o data pe zi, ultimele 14 zile
// v97: bataia catre paznic (Cloudflare, paznic/worker.mjs) la 5 minute - daca tace 30 de minute, paznicul
// scrie pe Discord ca alertele botului nu mai vin (PC oprit, internet cazut, colector mort)
const PAZNIC_URL = process.env.PAZNIC_URL || VARS.PAZNIC_URL || "", PAZNIC_TOKEN = process.env.PAZNIC_TOKEN || VARS.PAZNIC_TOKEN || "";
let paznicLa = 0;
async function turaPaznic() {
  // v98.2: cat poza a urcat in ultimele 10 minute, poza E pulsul (worker-ul citeste `la` din ea si anunta singur revenirea) -
  // nicio bataie separata, deci nicio scriere KV in plus. Altfel (poza nu pleaca) bataia la 5 minute, ca in v97.
  if (!PAZNIC_URL || !PAZNIC_TOKEN || !bataieNecesara({ acum: Date.now(), pozaOkLa, paznicLa })) return;
  paznicLa = Date.now();
  try {
    const r = await fetch(PAZNIC_URL.replace(/\/+$/, "") + "/bataie", { method: "POST", headers: { authorization: "Bearer " + PAZNIC_TOKEN, "content-type": "application/json" }, body: JSON.stringify({ pid: process.pid, versiune: VERSIUNE_COLECTOR }), signal: AbortSignal.timeout(15000) });
    if (!r.ok) jurnal("paznic: bataia refuzata", r.status);
  } catch (e) { jurnal("paznic: bataia n-a plecat", e.message); paznicLa = Date.now() - 4 * 60000; }
}

// v98: poza pentru pagina alerts din Trading Tools - la 5 minute, prin paznic (POST /poza); lista de simboluri a paginii
// vine tot de acolo (GET /simboluri). Datele externe (Yahoo) au cache pe disc; o poza care nu pleaca se reincearca la tura urmatoare.
const DUBLURI = { "1QZ.DE": "COIN", "MIGA.MU": "MSTR", "NFC.F": "NFLX" };   // dublurile germane iau insiderii/rezultatele companiei din SUA
const yahooExtra = creeazaYahooExtra({ fisier: path.join(DATA, "poza-ext.json"), jurnal });
let pozaLa = 0, pozaInLucru = false, ultimeleT212 = { lista: [], la: null };   // T212 limiteaza cererile: la o citire picata raman pozitiile de la poza anterioara
function planReal(x) { return x && x.plan && !x.plan.proba ? x.plan : null; }
async function pozitiiPentruPoza() {
  const v = citesteVarsSigur(); if (!(v.T212_API_KEY && v.T212_API_SECRET)) return [];
  const pz = await cere("/api/t212?action=pozitii"), poz = (pz && pz.pozitii || []).filter((x) => x && x.quantity > 0);
  let loturi = []; try { const h = await cere("/api/t212?action=istoric"); loturi = T212.perechi((h && h.umpleri) || []).deschise || []; } catch (e) { jurnal("poza: loturi", e.message); }
  let cash = null; try { cash = (await cere("/api/t212?action=cont")).cash || null; } catch {}
  let usd = 0; poz.forEach((x) => { usd += x.quantity * x.currentPrice; });
  const inv = cash && cash.total > 0 && cash.free >= 0 ? cash.total - cash.free : null;
  const out = [];
  for (const x of poz) {
    let bare = [], plan = null;
    try { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.ticker)); bare = GridCalcul.bareBursa(d && d.randuri || [], Date.now()); } catch (e) { jurnal("poza: bare", x.ticker, e.message); }
    try { plan = planReal(await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + x.ticker))); } catch {}
    const de = Date.parse(x.initialFillDate || ""); let mx = null;
    if (Number.isFinite(de)) for (const b of bare) if (b.t + 86400000 > de) mx = mx === null ? b.h : Math.max(mx, b.h);
    if (mx !== null && x.currentPrice > mx) mx = x.currentPrice;
    const p = { ticker: x.ticker, simbol: T212.simbol(x.ticker), qty: x.quantity, pretMediu: x.averagePrice, pret: x.currentPrice, plan, maxDupaCumparare: mx };
    const st = bare.length ? ActiuniSemnale.stare(bare, p.pret) : null, sem = ActiuniSemnale.semafor(p, st);
    const n = bare.length ? ActiuniSemnale.niveluri(bare, p.pret, { pretMediu: p.pretMediu, maxDupaCumparare: mx, minTrail: 0.15 }) : null;
    // v98.1: `la` = cand a fost citit pretul T212 (pagina il arata cu chip „T212" cat e proaspat); `prev` = inchiderea ultimei sesiuni incheiate (NY)
    out.push({ ...p, prev: prevClose(bare, Date.now()), la: Date.now(), ppl: x.ppl, costLei: costLeiDinLoturi(loturi, x.ticker, x.quantity), bare, sem,
      niv: nivDinNiveluri(n, plan),   // stopul POZITIEI (urca dupa maxim), ca in pagina T212 a Radarului - nu stopul de intrare
      pondere: inv !== null && usd > 0 && cash.total > 0 ? x.quantity * x.currentPrice / usd * inv / cash.total : null });
  }
  return out;
}
async function botiPentruPoza() {
  const out = [];
  for (const b of ultimiiBoti) {
    if (!b || !b.id || b.activ === false) continue;
    // v99.5: dupa o repornire lista celor 30 de preturi e goala ~30 min (pagina alerts arata doar pretul) -> se umple din istoricul din KV
    // v99.6: din acelasi istoric (25 h) vine si pretul de acum ~24 h -> mișcarea pe 24 h, gros sub pret pe pagina alerts
    let pret24h = null;
    try {
      const h = await cere("/api/istoric-bot?action=citeste&bot=" + encodeURIComponent(b.id) + "&ore=25");
      if ((pret30[b.id] || []).length < 30) pret30[b.id] = pret30DinIstoric(h && h.intrari, pret30[b.id] || []);
      pret24h = pret24hDinIstoric(h && h.intrari, Date.now());
    } catch (e) { jurnal("poza: istoricul botului", b.id, e.message); }
    let plan = null; try { plan = planReal(await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(b.id))); } catch {}
    let zero = null; try { const z = TabloExtra.dacaInchizi(b); zero = z && z.pretZero > 0 ? z.pretZero : null; } catch {}
    const x = semnaleUlt[b.id]; out.push({ ...b, plan, zero, pret30: pret30[b.id] || [], pret24h, semafor: x && x.semafor ? x.semafor : null, la: Date.now() });
  }
  return out;
}
async function simboluriPentruPoza() {
  const r = await fetch(PAZNIC_URL.replace(/\/+$/, "") + "/simboluri", { headers: { authorization: "Bearer " + PAZNIC_TOKEN }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("paznic /simboluri " + r.status);
  const out = [];
  for (const s of ((await r.json()).simboluri || []).slice(0, 60)) {
    const sursa = DUBLURI[s.s] || null; let c = null, e = null;
    try { c = await yahooExtra.closes(s.s); } catch (err) { jurnal("poza: inchideri", s.s, err.message); }
    try { e = await yahooExtra.extra(sursa || s.s); } catch (err) { jurnal("poza: extra", s.s, err.message); }
    // v98.2: prev = ultima sesiune incheiata (ziua NY), ca la pozitii - nu penultima inchidere (duminica arata vineri drept "azi")
    out.push({ s: s.s, nota: s.nota, sursa, moneda: c ? c.moneda : (/\.(DE|MU|F|PA|AS|MI|SW)$/.test(s.s) ? "€" : "$"), pret: c ? c.pret : null, prev: prevSimbol(c, Date.now()), closes30: c ? c.closes30 : [], extra: e });
  }
  return out;
}
// v98.1 (I-462): adresa tunelului (PORNESTE-SI-PE-TELEFON.bat scrie jurnalul in %TEMP%), doar daca raspunde ca Radar; o data la 5 minute
let tunelLa = 0, tunelUrl = null;
async function adresaRadarului() {
  if (Date.now() - tunelLa < 5 * 60000) return tunelUrl;
  tunelLa = Date.now(); tunelUrl = null;
  try {
    const u = Consilier.adresaTunel(fs.readFileSync(path.join(os.tmpdir(), "crypto-radar-tunel.log"), "utf8"));
    if (u) { const r = await fetch(u + "/api/market?type=health", { signal: AbortSignal.timeout(6000) }); const j = r.ok ? await r.json() : null; if (j && j.service === "crypto-radar") tunelUrl = u; }
  } catch {}
  return tunelUrl;
}
let pozaOkLa = 0, ultimeleSimboluri = {};
async function turaPoza() {
  const botiActivi = ultimiiBoti.filter((b) => b && b.id && b.activ !== false).length;
  if (!PAZNIC_URL || !PAZNIC_TOKEN || pozaInLucru || Date.now() - pozaLa < cadentaPoza({ acum: Date.now(), botiActivi })) return;   // I-461: 2 min in piata / cu bot, 5 min in rest
  pozaInLucru = true; pozaLa = Date.now();
  try {
    let t212Eroare = null;
    const [t212, boti, simboluri, radarUrl] = await Promise.all([
      pozitiiPentruPoza().then((l) => { ultimeleT212 = { lista: l, la: Date.now() }; return l; }).catch((e) => { t212Eroare = e.message; jurnal("poza: t212", e.message); return ultimeleT212.lista; }),
      botiPentruPoza(), simboluriPentruPoza().catch((e) => { jurnal("poza: simboluri", e.message); return []; }), adresaRadarului()]);
    const poza = construiestePoza({ acum: Date.now(), versiune: VERSIUNE_COLECTOR, pid: process.pid, tura: turaNr, radarUrl, t212, t212La: ultimeleT212.la, t212Eroare, boti, simboluri }), text = JSON.stringify(poza);
    const r = await fetch(PAZNIC_URL.replace(/\/+$/, "") + "/poza", { method: "POST", headers: { authorization: "Bearer " + PAZNIC_TOKEN, "content-type": "application/json" }, body: text, signal: AbortSignal.timeout(20000) });
    if (!r.ok) jurnal("poza: refuzata", r.status, (await r.text()).slice(0, 120));
    else { pozaOkLa = Date.now(); jurnal("poza: urcata", Math.round(text.length / 1024) + " KB", t212.length + " poziții", boti.length + " boți", simboluri.length + " simboluri", radarUrl ? "tunel" : ""); }
    // I-463: alertele pe simbolurile paginii (miscare > 2x ATR propriu, cumparare noua de insider) - o data pe zi per simbol
    const m = meta(), st = m.simAlerte || (m.simAlerte = {}), prag = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    for (const k of Object.keys(st)) if (k.slice(-10) < prag) delete st[k];
    for (const a of alerteSimboluri(poza.simboluri, ultimeleSimboluri, Date.now())) {
      if (st[a.cheie]) continue;
      if (await trimiteAlerta({ nivel: a.nivel, titlu: a.titlu, mesaj: a.mesaj }, null, a.cheie.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 60))) st[a.cheie] = true;
    }
    if (poza.simboluri.length) { ultimeleSimboluri = {}; for (const s of poza.simboluri) ultimeleSimboluri[s.s] = s; }
    try { fs.writeFileSync(STARE_FIS, JSON.stringify(stareAlerte)); } catch {}
  } catch (e) { jurnal("poza: n-a plecat", e.message); pozaLa = Date.now() - 4 * 60000; }
  pozaInLucru = false;
}

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
      // v93: bareToate - la 8 dimineata ultima zi de bursa e INCHISA (bare() o arunca: ideile erau cu o zi in urma)
      cereBare: async (tk) => GridCalcul.bareToate((await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk))).randuri || []),
      ndx: new Set(NDX), rezumat: Acasa.rezumatActiune,
      cereRezultate: async (tk) => { const d = await cere("/api/t212?action=rezultate&ticker=" + encodeURIComponent(tk)); return d && d.data || null; } });
    const urm = Idei.urmarire(id && Array.isArray(id.istoric) ? id.istoric : [], r.preturi, Date.now());
    await trimite("/api/t212?action=idei", { la: Date.now(), zi, actiuni: r.actiuni, judecate: r.judecate, trecute: r.trecute, urmarire: urm, ndx: r.ndx });
    m.ideiZi = zi;
  } catch (e) { jurnal("idei ESEC", e.message); }
  ideiInLucru = false;
}

// v89: rezumatul de dimineata - o data pe zi, dupa 9:00 ora Romaniei (Radar + Discord)
let dimineataInLucru = false;
async function dateDimineata() {
  const out = { deIesit: [], rezultate: [], plafon: [], stiri: [], boti: [] };
  // v92: barele zilnice de bursa CU ultima zi (bare() o scotea - "ultima zi" arata ziua de dinainte)
  try { const pz = await cere("/api/stiri?action=piata"); const zi = (r) => (Array.isArray(r) && r.length ? GridCalcul.bareToate(r) : null); out.piata = Consilier.piata({ qqq: zi(pz.qqq), spy: zi(pz.spy), vix: zi(pz.vix), fg: pz.fg }); } catch (e) { jurnal("dimineata piata", e.message); }
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
          const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.ticker)), bare = GridCalcul.bareBursa(d && d.randuri || [], Date.now()), st = ActiuniSemnale.stare(bare, x.currentPrice);
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
        for (const tk of [...new Set(lista.map((y) => y.ticker))]) if (!barePe[tk]) { try { barePe[tk] = GridCalcul.bareBursa((await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk))).randuri || [], Date.now()); } catch {} }
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
// v91.11 (1): preturile moarte - judecate pe tura (doar daca tura a cerut preturi)
async function turaPreturi(acum) {
  const t = preturiTura; preturiTura = { ok: 0, rau: 0, eroare: null };
  if (!t.ok && !t.rau) return;
  const m = meta(), p = Alerte.preturi(m.preturi || null, t.ok ? { ok: true } : { ok: false, eroare: t.eroare }, acum);
  if (!p.mesaj) { m.preturi = p.stare; return; }
  const plecat = await trimiteAlerta(p.mesaj, null, "colector");
  m.preturi = p.mesaj.nivel === "critic" ? (plecat ? Alerte.anuntatPreturi(p.stare, acum) : p.stare) : (plecat ? p.stare : m.preturi);
}
// v91.11 (2): "Mediul botilor" la 9, 12, 15, 18, 21 (ora Romaniei) - o data pe interval
const mediuPe = {};
async function turaMediu(acum) {
  const slot = Alerte.slotRaport(acum), m = meta();
  if (!slot || m.raport3h === slot) return;
  // doar botii care inca merg (m.cunoscuti se actualizeaza la fiecare tura; un bot inchis iese din raport)
  const lista = Object.keys(mediuPe).filter((id) => m.cunoscuti && m.cunoscuti[id] && m.cunoscuti[id].activ).map((id) => mediuPe[id]).filter((x) => x && x.b && x.b.activ !== false);
  const r = Alerte.raportBoti(lista, acum);
  if (!r) return;
  if (await trimiteAlerta(r, null, "raport-3h")) m.raport3h = slot;
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
// v94: vremea pietei (alerta la schimbare), funding-ul pe piata, miscarea neobisnuita pe botii si actiunile lui,
// Nasdaq la zi cat e bursa deschisa, poza zilnica - modulul isi tine singur ritmul (scripts/lib/tura-piata.mjs)
let piataInLucru = false;
async function turaPiataColector() {
  if (piataInLucru || process.env.COLECTOR_FARA_CLASAMENT) return;
  piataInLucru = true;
  try {
    const m = meta(); m.piata = m.piata || {};
    await turaPiataModul({ cere, trimite, trimiteAlerta, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), Acasa, Alerte, GridCalcul, GridClasament, Directie, NDX }, m.piata, Date.now());
    try { fs.writeFileSync(STARE_FIS, JSON.stringify(stareAlerte)); } catch {}
  } catch (e) { jurnal("piata ESEC", e.message); }
  piataInLucru = false;
}

// v96: pagina Scan - rezumatul zilnic al top 100 PERP (o data pe ora) si al actiunilor (Nasdaq 100 + ale lui),
// cu ritmul lui in scripts/lib/tura-scan.mjs; porneste dupa clasament (monedele vin din el)
let scanInLucru = false;
async function turaScanColector() {
  if (scanInLucru || process.env.COLECTOR_FARA_CLASAMENT) return;
  scanInLucru = true;
  try {
    const m = meta(); m.scan = m.scan || {};
    const afara = async (u) => { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); };
    await turaScanModul({ cere, trimite, trimiteAlerta, afara, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), Scan, GridCalcul, NDX }, m.scan, Date.now());
    try { fs.writeFileSync(STARE_FIS, JSON.stringify(stareAlerte)); } catch {}
  } catch (e) { jurnal("scan ESEC", e.message); }
  scanInLucru = false;
}

async function bucla() {
  try { await tura(); } catch (e) { jurnal("tură", e.message); }
  // v98.2 (audit 28.09, #1): planurile si poza cer amandoua pozitiile T212 - una dupa alta, nu deodata (serverul leaga oricum
  // cererile identice in zbor; asa nici cele diferite nu se calca in aceeasi secunda)
  turaPlanuriT212().catch((e) => jurnal("planuri t212", e.message)).then(() => turaPoza()).catch((e) => jurnal("poza", e.message));
  turaCopie();
  turaPaznic().catch(() => {});
  turaPiataColector().catch((e) => jurnal("piata", e.message));
  turaIdeiZi().then(() => turaDimineata()).catch((e) => jurnal("idei/dimineata", e.message));
  if (!process.env.COLECTOR_FARA_CLASAMENT) turaClasament().then(() => turaLaborator()).then(() => turaCf()).then(() => turaT212()).then(() => turaCfActiuni()).then(() => turaScanColector()).catch((e) => jurnal("clasament/laborator", e.message));   // nu blocheaza tura de un minut
  if (process.env.COLECTOR_O_TURA) process.exit(0);
  setTimeout(bucla, PAS_MS);
}
bucla();
