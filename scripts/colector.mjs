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
import * as MesajeColector from "./lib/mesaje-colector.mjs";
import { turaLaborator as turaLaboratorModul } from "./lib/tura-laborator.mjs";
import { turaContrafactual } from "./lib/tura-contrafactual.mjs";
import { turaDimineata as turaDimineataModul, liniiBecuri, etichetaIeri } from "./lib/tura-dimineata.mjs";
import { turaIdei as turaIdeiModul } from "./lib/tura-idei.mjs";
import { turaIngust as turaIngustModul } from "./lib/tura-ingust.mjs";
import { turaPiata as turaPiataModul } from "./lib/tura-piata.mjs";
import { turaScan as turaScanModul } from "./lib/tura-scan.mjs";
import { faCopie } from "./lib/copie.mjs";
import os from "node:os";
import { execFile, spawn } from "node:child_process";
import { adresaTailscale } from "./lib/adresa-radar.mjs";
import { turaT212 as turaT212Modul, turaPlanuri as turaPlanuriModul, turaCfActiuni as turaCfActiuniModul } from "./lib/tura-t212.mjs";
import { ziSesiune, construiestePoza, alerteSLTP, fxDinPozitii, costLeiDinLoturi, nivDinNiveluri, prevClose, prevSimbol, cadentaPoza, alerteSimboluri, alerteT212Pasi, alertaBotPas, bataieNecesara, pret30DinIstoric, pret24hDinIstoric, ziDinKlines } from "./lib/poza.mjs";
import { creeazaYahooExtra } from "./lib/yahoo-extra.mjs";
import { strangeBoti } from "./lib/tura-arhiva-boti.mjs";
import { avertizariPornire } from "./lib/tura-pornire.mjs";
import { turaProfil as turaProfilModul, eNoapte } from "./lib/tura-profil.mjs";   // v101.26 (pachetul 1)
import { turaArhivaOre as turaArhivaOreModul, planArhiva } from "./lib/tura-arhiva-ore.mjs";   // v101.69 (el: „fă 5”): barele de 1 h ale arhivei boților
import { turaProbabilitati as turaProbabilitatiModul } from "./lib/tura-probabilitati.mjs";   // v101.27 (pachetul 2a)
import { turaRetea as turaReteaModul } from "./lib/tura-retea.mjs";   // v101.56 (rețeaua neuronală, livrarea 1)
import { bilantDinBusola } from "./lib/din-busola.mjs";   // v101.65 (ideea 1): bilanțul Busolei despre predicțiile 🧠
import { unesteZile, randuriInchise } from "../retea/date-t212.mjs";   // v101.64 (L2, revizia 🟡6): barele zilnice se adună peste 2 ani
import { turaSugestii as turaSugestiiModul } from "./lib/tura-sugestii.mjs";   // v101.58 (reveniri + short)
import { pazaPas, notaVeche, pentruServer, cheiaBot } from "./lib/paza-boti.mjs";   // v101.59 (Busola 1.36, §2 „paza boților”); v101.60: + pentruServer (I-513); v101.62: + cheiaBot (I-523)
import { titluDimineata } from "./lib/dimineata-titlu.mjs";   // v101.62 (I-526): rândul-verdict din capul rezumatului de dimineață
import { alcatuieste as pentruBusola, intrariRetea } from "./lib/pentru-busola.mjs";   // v101.60 (I-515 + I-498): fișierul local pentru Busola
const VERSIUNE_COLECTOR = "v101.79";

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
  // v100.40: rotirea si scrierea separat - o rotire picata (fisier tinut deschis de `tail -f`) nu mai lasa jurnalul mut
  try { if (fs.existsSync(LOG) && fs.statSync(LOG).size > 1_000_000) fs.renameSync(LOG, LOG + ".vechi"); } catch {}
  try { fs.appendFileSync(LOG, linie); } catch {}
  if (process.env.COLECTOR_CONSOLA) process.stdout.write(linie);
}
// v101.55 (ideea 2): numărătorile din jurnal - „1 bot”, „25 de boți” (TextRo.cate; rezerva știe aceeași regulă)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }

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
incarca("text-ro.js", "TextRo");   // v101.41 (sfaturi concise): cifrele textelor (globalThis.TextRo), inaintea modulelor care scriu sfaturi
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
const Valoare = incarca("valoare.js", "Valoare");   // v101.30 (I-470): zona de valoare + pivotii (laboratorul)
const GridLaborator = new Function("GridCalcul", "GridProba", "Valoare", fs.readFileSync(path.join(RAD, "public", "lib", "grid-laborator.js"), "utf8") + "; return GridLaborator;")(GridCalcul, GridProba, Valoare);
const GridPlan = new Function("GridCalcul", "GridProba", fs.readFileSync(path.join(RAD, "public", "lib", "grid-plan.js"), "utf8") + "; return GridPlan;")(GridCalcul, GridProba);   // v101.9
const T212 = incarca("t212.js", "T212");
const ActiuniSemnale = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public", "lib", "actiuni-semnale.js"), "utf8") + "; return ActiuniSemnale;")(GridCalcul);
const Consilier = new Function("ActiuniSemnale", fs.readFileSync(path.join(RAD, "public", "lib", "consilier.js"), "utf8") + "; return Consilier;")(ActiuniSemnale);
const Idei = new Function("ActiuniSemnale", fs.readFileSync(path.join(RAD, "public", "lib", "idei.js"), "utf8") + "; return Idei;")(ActiuniSemnale);
const Reveniri = incarca("reveniri.js", "Reveniri");   // v101.58 (reveniri + short): regulile, istoricul, urmărirea
const Busola = incarca("busola.js", "Busola");   // v101.59 (§2 „paza boților”): rezumatul Busolei și starea pe 4h a monedei fiecărui bot
// Nasdaq-100 din aplicatie (o singura sursa: public/app.js, NDX_UNIVERSE)
const NDX = (() => { try { const m = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").match(/const NDX_UNIVERSE=(\[[^\]]*\])/); return m ? JSON.parse(m[1]) : []; } catch { return []; } })();
const ProfilMoneda = incarca("profil-moneda.js", "ProfilMoneda");
const Probabilitati = new Function("GridCalcul", "ActiuniSemnale", fs.readFileSync(path.join(RAD, "public", "lib", "probabilitati.js"), "utf8") + "; return Probabilitati;")(GridCalcul, ActiuniSemnale);   // v101.32: + starea actiunilor   // v101.27 (pachetul 2a)
const Obiceiuri = new Function("GridCalcul", "GridProba", "JurnalTrade", "Probabilitati", "SemnaleBot", fs.readFileSync(path.join(RAD, "public", "lib", "obiceiuri.js"), "utf8") + "; return Obiceiuri;")(GridCalcul, GridProba, JurnalTrade, Probabilitati, SemnaleBot);   // v101.30 (I-478): dupa Probabilitati - autopsia ia etichetele starilor
const GraficBot = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "grafic-bot.js"), "utf8") + "; return GraficBot;")();   // v101.28 (pachetul 2b): RSI/EMA/Bollinger pentru Dovada
const Dovada = new Function("GridCalcul", "GraficBot", "Probabilitati", fs.readFileSync(path.join(RAD, "public", "lib", "dovada.js"), "utf8") + "; return Dovada;")(GridCalcul, GraficBot, Probabilitati);   // v101.28 (I-471)
const Scenariu = incarca("scenariu.js", "Scenariu");   // revizia 01.10 (I2): sfaturile si in colector, din aceleasi intrari ca Tabloul
const Sfaturi = new Function("Alerte", "Scenariu", "TabloExtra", fs.readFileSync(path.join(RAD, "public", "lib", "sfaturi.js"), "utf8") + "; return Sfaturi;")(Alerte, Scenariu, TabloExtra);   // Alerte ca parametru: altfel „pericol” dispare tacut
const Perechi = new Function("GridCalcul", "GridProba", fs.readFileSync(path.join(RAD, "public", "lib", "perechi.js"), "utf8") + "; return Perechi;")(GridCalcul, GridProba);   // v101.30 (I-477)
const Consiliu = new Function("SemnaleBot", fs.readFileSync(path.join(RAD, "public", "lib", "consiliu.js"), "utf8") + "; return Consiliu;")(SemnaleBot);   // v101.29 (I-474): o singura voce
const Asemanatoare = new Function("Probabilitati", "GraficBot", fs.readFileSync(path.join(RAD, "public", "lib", "asemanatoare.js"), "utf8") + "; return Asemanatoare;")(Probabilitati, GraficBot);   // v101.68 (I-530): + GraficBot ⇒ ADX la pornire în fiecare caz   // v101.28 (I-469)   // v101.26 (pachetul 1): profilul monedei din barele de 1 h
const RiscLuna = incarca("risc-luna.js", "RiscLuna");   // v101.76: riscul boților și al acțiunilor + comportamentul (raportul de noapte)

const Retea = new Function("Probabilitati", fs.readFileSync(path.join(RAD, "public", "lib", "retea.js"), "utf8") + "; return Retea;")(Probabilitati);   // v101.56 (rețeaua neuronală, livrarea 1)
const Arbori = new Function("Retea", "Probabilitati", fs.readFileSync(path.join(RAD, "public", "lib", "arbori.js"), "utf8") + "; return Arbori;")(Retea, Probabilitati);   // v101.63: arborii (aceleași intrări ca rețeaua)

// Proba de incarcare (scripts/colector-v77.mjs): toate modulele s-au incarcat, fara retea.
if (process.env.COLECTOR_DOAR_INCARCA) { console.log("INCARCAT", [Alerte, IndicatoriBot, Acasa, Directie, Scan, TabloBot, GridCalcul, GridClasament, JurnalTrade, Contrafactual, SemnaleBot, TabloExtra, GridProba, GridLaborator, Obiceiuri, T212, ActiuniSemnale, Consilier, Idei, ProfilMoneda, Probabilitati, GraficBot, Dovada, Asemanatoare, Consiliu, Scenariu, Sfaturi, Valoare, Perechi, Retea, Busola].every(Boolean) && NDX.length > 90); process.exit(0); }
// v101.40 (el, 01.10: „rezolvă colectorul și limita”): colectorul se prezinta - dupa tokenul valid are galeata lui (pagina nu mai primeste
// RATE_LIMITED cand colectorul citeste mult, de ex. dupa o repornire)
const ANTET = { authorization: "Bearer " + TOKEN, accept: "application/json", "x-radar-client": "colector" };
// v91.11 (1): pe tura, cate cereri de PRETURI Pionex au mers / au picat (26.09: 1 ora de preturi moarte fara nicio alerta)
let preturiTura = { ok: 0, rau: 0, eroare: null };
// v101.72 (I-536): pragul lui de ieșire (% din sumă), din config - citit cel mult o dată la 10 min
let pragMemo = { la: 0, v: null };
async function pragDinConfig() {
  if (Date.now() - pragMemo.la < 10 * 60000) return pragMemo.v;
  try { const c = await cere("/api/istoric-bot?action=config"); pragMemo = { la: Date.now(), v: c && c.config && c.config.prag || null }; } catch (e) { pragMemo = { la: Date.now(), v: pragMemo.v }; }
  return pragMemo.v;
}
// v101.73 (I-538): ferestrele arătate de fișă, de pe server - citite cel mult o dată la 5 min
let ferestreMemo = { la: 0, v: [] };
// v101.78: raportul de risc (RiscLuna, scris de colector noaptea, citit de pe server) ținut o oră - pentru mesajele cu cifrele lui (I-563, I-565)
let riscMemo = { la: 0, r: null };
async function riscRaport() {
  if (Date.now() - riscMemo.la < 3600000) return riscMemo.r;
  riscMemo.la = Date.now();
  // revizia (I2): o citire ratată se reîncearcă în 5 minute (nu o oră), iar alerta de 24 h așteaptă cifrele până la 26 h
  try { const d = await cere("/api/istoric-bot?action=risc"); riscMemo.r = d && d.risc || null; riscMemo.eroare = false; } catch (e) { riscMemo.eroare = true; riscMemo.la = Date.now() - 3600000 + 300000; jurnal("risc (citire)", e.message); }
  return riscMemo.r;
}
async function ferestreServer() {
  if (Date.now() - ferestreMemo.la < 5 * 60000) return ferestreMemo.v;
  try { const d = await cere("/api/istoric-bot?action=ferestre"); ferestreMemo = { la: Date.now(), v: d && Array.isArray(d.ferestre) ? d.ferestre : [] }; } catch (e) { ferestreMemo = { la: Date.now(), v: ferestreMemo.v }; }
  return ferestreMemo.v;
}
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

// v100.40 (audit 30.09): Discord refuzat (429/5xx/fara retea) -> alerta intra in COADA pe disc (data/de-trimis.json) si se
// reincearca la fiecare tura, cel mult 12 ore; inainte se pierdea (era „trimisa” daca ajunsese doar in KV).
const COADA_FIS = path.join(DATA, "de-trimis.json");
let coadaDiscord = []; try { coadaDiscord = JSON.parse(fs.readFileSync(COADA_FIS, "utf8")); if (!Array.isArray(coadaDiscord)) coadaDiscord = []; } catch { coadaDiscord = []; }
function scrieAtomic(fis, obj) { const tmp = fis + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, fis); }
function salveazaCoada() { try { scrieAtomic(COADA_FIS, coadaDiscord.slice(-80)); } catch (e) { jurnal("coada discord nescrisa", e.message); } }
async function golesteCoada() {
  if (CANAL !== "discord" || !coadaDiscord.length) return;
  const acum = Date.now(), ramase = [];
  for (const x of coadaDiscord) {
    if (acum - x.t > 12 * 3600000) { jurnal("coada discord: renunt (peste 12 h)", x.m.titlu); continue; }
    if (ramase.length) { ramase.push(x); continue; }   // in ordine: dupa primul esec, restul asteapta tura urmatoare
    const ok = await trimiteDiscord({ ...x.m, titlu: MesajeColector.intarziat(x.m.titlu, Math.round((acum - x.t) / 60000)) }, { fetch, webhook: DISCORD_WEBHOOK, jurnal });
    if (!ok) ramase.push(x);
  }
  if (ramase.length !== coadaDiscord.length) { coadaDiscord = ramase; salveazaCoada(); }
}
// Alerta pleaca INTAI in KV (se vede in Radar, pe orice dispozitiv de acasa); apoi, daca e
// cerut, pe canalul extern. "Trimisa" = a ajuns macar in KV (v100.40: iar Discord refuzat -> coada, reincercata).
async function trimiteAlerta(m, bot, cheie) {
  let inKv = false;
  try { const r = await trimite("/api/istoric-bot?action=alerte", { alerta: { t: Date.now(), nivel: m.nivel, titlu: m.titlu, mesaj: m.mesaj || "", bot: bot || null, cheie: cheie || null } }); inKv = !!(r && r.ok); }
  catch (e) { jurnal("alerta in KV EȘEC", e.message); }
  // v97.9: unele alerte (grila atinsa) raman doar in Radar - pagina Alerts le arata, canalul extern nu le primeste
  if (m.doarRadar) { jurnal("alerta (doar în Radar)", m.nivel, m.titlu); return inKv; }
  if (CANAL === "ntfy") { const ok = await ntfy(m); return inKv || ok; }
  if (CANAL === "discord") {
    const ok = await trimiteDiscord(m, { fetch, webhook: DISCORD_WEBHOOK, jurnal });
    if (!ok) { coadaDiscord.push({ t: Date.now(), m: { nivel: m.nivel, titlu: m.titlu, mesaj: m.mesaj || "" } }); salveazaCoada(); }
    return inKv || ok;
  }
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
// v100.40: scris atomic (tmp + rename) - 5 ture scriu starea; un fisier taiat la jumatate retrimitea toate alertele
function scrieStare() { try { scrieAtomic(STARE_FIS, stareAlerte); } catch (e) { jurnal("starea alertelor nescrisa", e.message); } }
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
  const s = TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex;
  try {
    const k = await cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s) + "&interval=4H&limit=500");
    const a = Directie.analizeaza(k && k.data && k.data.klines, 6, b.directie);
    // v101.74 (I-541): și 1 zi, ca Tabloul - Consilierul de pe Discord primește același rezumat 4 h + 1 zi (Directie.rezumat), nu „rezumat: null”
    let a1 = null;
    try { const k1 = await cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s) + "&interval=1D&limit=400"); a1 = Directie.analizeaza(k1 && k1.data && k1.data.klines, 7, b.directie); } catch (e) { jurnal("direcție 1D", b.id, e.message); }
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
    // v101.8: cat se misca moneda intr-o zi obisnuita (din aceleasi lumanari de 4 h) - pentru „incape gridul in plan?”
    let ampZi = null;
    try { ampZi = TabloExtra.miscareZi(GridCalcul.bare(k && k.data && k.data.klines)); } catch (e) { jurnal("miscare pe zi", b.id, e.message); }
    const rez = [Object.assign({ tf: "4H", eticheta: "4 ore", orizontText: "o zi" }, a)].concat(a1 ? [Object.assign({ tf: "1D", eticheta: "1 zi", orizontText: "o săptămână" }, a1)] : []);
    directii[b.id] = { la: Date.now(), fata4h: a.dir ? a.fata.ton : null, dir4h: a.dir, regim, k4: k && k.data && k.data.klines, calculat: false, funding, btc, ampZi, rez: rez };
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
  const s = TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex;
  const r15 = await lumanari15M(s);
  const b4 = GridCalcul.bare(d.k4), b1 = GridCalcul.agrega(b4, 86400000);
  const fisa = GridProba.fisa({ simbol: s, pret: GridCalcul.pretCurent(r15), b15: GridCalcul.bare(r15), b4h: b4, b1d: b1.slice(0, -1), suma: Number(b.investit) || 100, H: 2, dir: null, levier: null, minNotional: null });
  const f = fisa && !fisa.eroare ? fisa : null;
  let regimBtc = null; try { regimBtc = GridCalcul.regim(GridCalcul.bare(await lumanari15M("BTC_USDT_PERP"))); } catch (e) { jurnal("regim BTC", e.message); }
  let fut = null; try { fut = await cere("/api/market?type=futures&symbol=" + encodeURIComponent(TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).binance)); } catch (e) { fut = null; }
  const st = stareAlerte[b.id] || {};
  const afaraOre = st._afaraDe ? (acum - st._afaraDe) / 3600000 : 0;
  const dir = String(b.directie || "").toLowerCase();
  const x = { bot: b, fisa: f, plan: ctx.plan || null, costuri: TabloExtra.grileVsCosturi(b, acum),
    btc: SemnaleBot.btcAvertizare(regimBtc, f && f.regim), aglomerare: SemnaleBot.aglomerare(fut, dir),
    muta: SemnaleBot.mutaGridul(b, f, afaraOre, ProfilMoneda.praguriMargine(profileMoneda.get(s) || null)), iaProfit: SemnaleBot.iaProfit(b, f),
    distInainte: SemnaleBot.distantaLaOra(st._distIst, acum, 3600000),   // v101.40: directia distantei pana la lichidare
    busola: Busola.pentruVerdict(Busola.rezumat(), cheiaBot(b), acum) };   // v101.62 (I-523): Busola, doar din rezumatul proaspăt
  x.semafor = SemnaleBot.semafor(x);
  // v101.29 (I-474): Consilierul alcatuit si aici, pe ce are colectorul (semaforul, „Acum, concret” cu lumanarile de 15M, socoteala,
  // banii la margine) - poza si Discord spun ce spune Tabloul. Revizia 01.10 (I2): si SFATURILE (aceleasi intrari, Sfaturi.intrare) si
  // OPRESTE de la Pionex. v101.74 (I-541): si directia pe 4 h + 1 zi (ca Tabloul); cand verdictele tot difera (tura la cateva minute), se spune pe fata.
  try {
    const prof = profileMoneda.get(s) || null, b15 = GridCalcul.bare(r15), dirC = String(b.directie || "").toLowerCase();
    x.concret = SemnaleBot.acumConcret({ bot: b, fisa: f, zero: TabloExtra.dacaInchizi(b), costuri: x.costuri, plan: ctx.plan || null, pragMargine: ProfilMoneda.praguriMargine(prof), pragStop: ProfilMoneda.pragStop(prof, dirC), acum,
      cifre: (pr) => TabloExtra.cifreActiuni(b, { protectie: pr, b15 }) });
    x.sfaturi = Sfaturi.sfaturi(Sfaturi.intrare({ bot: b, k4: d.k4, fata4h: d.fata4h, dir4h: d.dir4h, funding: fut && fut.funding != null ? Number(fut.funding) : null, fundingHist: fut && Array.isArray(fut.fundingHist) ? fut.fundingHist : null, fisa: f, rezumat: d.rez ? Directie.rezumat(d.rez, b.directie) : null, acum }));   // v101.74 (I-541)
    x.cons = Consiliu.alcatuieste({ sm: x.semafor, concret: x.concret, sfaturi: x.sfaturi, socoteala: socotealaUltima, busola: x.busola, regim: f && f.regim ? { miscare: !!f.regim.miscare } : null, laJos: TabloExtra.totalCuGridLa(b, Number(b.gridJos)),
      opritor: b.opritorPierdereActiv ? Number(b.opritorPierdere) : null, opreste: TabloBot.opreste(b.brut, acum, b.pretCurent), btc: x.btc && x.btc.text ? x.btc.text : null,
      perechi: Perechi.raport(b.ordinePerechi, b.pornitLa, acum, perechiEst && perechiEst[b.id] || null, { urme: perechiEst && perechiEst[b.id] && perechiEst[b.id].urme, factor: perechiCor[s] && perechiCor[s].factor, inGrid: Number(b.pretCurent) >= Number(b.gridJos) && Number(b.pretCurent) <= Number(b.gridSus) }) });   // v101.30 (I-477)
    const stA = stareAlerte[b.id] || (stareAlerte[b.id] = {});
    // revizia 01.10 (I1): starea alertelor botului (ce s-a anuntat deja imediat) si sfaturile tacute (I-466) - ca alerta Consilierului sa nu dubleze
    const activ = Object.fromEntries(Object.entries(stA).filter(([k, v]) => k.charAt(0) !== "_" && v && v.nivel).map(([k, v]) => [k, v.nivel]));
    if (stA._busola && stA._busola.stare === "miscare") activ["busola-miscare"] = "atentie";   // v101.62 (revizia Opus): paza a anunțat deja „mai agitată” - Consilierul nu trimite al doilea mesaj
    const ch = Consiliu.schimbare(stA._cons, x.cons, acum, String(b.baza || "").replace(/\.PERP$/, ""), { activ, taci: socotealaTaci || {} });
    stA._cons = ch.stare; scrieStare();
    if (ch.alerta) await trimiteAlerta(ch.alerta, b.id, "consilier");
    await trimite("/api/istoric-bot?action=cons", { bot: b.id, acum: ch.stare.acum, inainte: ch.stare.inainte || null, schimbatLa: ch.stare.schimbatLa || null, deCe: ch.stare.deCe || null });
  } catch (e) { jurnal("consilier", b.id, e.message); }
  // socoteala in KV
  let v = null; try { v = await cere("/api/istoric-bot?action=semnale&bot=" + encodeURIComponent(b.id)); } catch (e) { v = null; }
  let log = v && v.semnale && Array.isArray(v.semnale.log) ? v.semnale.log : [];
  // v101.30 (I-478): si starea pietei de atunci (regimul fisei x directia), pentru autopsia de duminica
  log = SemnaleBot.judeca(SemnaleBot.noteaza(log, x.semafor, b.profitTotal, acum, { stare: Probabilitati.stareDinRegim(f && f.regim) }), b.profitTotal, b.investit, acum);
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
// v100.66: mesajele colectorului vin gata din scripts/lib/mesaje-colector.mjs ({ nivel, titlu, mesaj })
function anuntaMesaj(x) { return anuntaColector(x.nivel, x.titlu, x.mesaj); }

let esecuri = 0;
// v98: ce a vazut ultima tura (pentru poza): botii si ultimele 30 de preturi ale fiecaruia (o poza pe tura, la un minut)
let ultimiiBoti = [], ultimiiBotiLa = 0; const pret30 = {}; let turaNr = 0;
async function tura() {
  const acum = Date.now();
  turaNr++;
  bate();
  let d;
  try { d = await cere("/api/bot-orders"); esecuri = 0; }
  catch (e) {
    // Serverul oprit = fereastra Radarului inchisa. Dupa 15 minute ne oprim.
    if (!e.status) { esecuri++; jurnal("serverul nu răspunde (" + esecuri + "/" + MAX_ESECURI + "):", e.message); if (esecuri >= MAX_ESECURI) { jurnal("ies: serverul nu mai răspunde");
      // v100.40 (audit 30.09): inainte iesea tacut - alertele se opreau fara niciun semn pana la paznic (~30-55 min)
      if (CANAL === "discord") await trimiteDiscord(MesajeColector.serverOprit(MAX_ESECURI), { fetch, webhook: DISCORD_WEBHOOK, jurnal });
      process.exit(0); } }
    else {
      jurnal("bot-orders", e.status, e.message);
      const m = meta(); m.citireRea = m.citireRea || acum;
      // 10 minute la rand fara citire -> o alerta; se repeta cel mult la 3 ore
      if (acum - m.citireRea >= 10 * 60000 && acum - (m.anuntatRau || 0) >= 3 * 3600000) {
        if (await anuntaMesaj(MesajeColector.citireRea(Math.round((acum - m.citireRea) / 60000), e.message))) m.anuntatRau = acum;
      }
      try { scrieStare(); } catch {}
    }
    return;
  }
  const m = meta();
  if (m.citireRea && m.anuntatRau) await anuntaMesaj(MesajeColector.citireDinNou());
  m.citireRea = 0; m.anuntatRau = 0;
  const boti = Array.isArray(d && d.bots) ? d.bots : [];
  ultimiiBoti = boti; ultimiiBotiLa = Date.now();   // v100.40: ora citirii - poza nu mai stampileaza boti vechi cu „acum”
  for (const b of boti) if (b && b.id && Number.isFinite(Number(b.pretCurent))) { const r = pret30[b.id] || (pret30[b.id] = []); r.push(Number(b.pretCurent)); if (r.length > 30) r.shift(); }
  // v101.67 (el, 05.10: „±1% la ce dețin”, B): fiecare bot activ - 1% fata de pretul ultimei alerte; referinta pe disc (rezista la repornire)
  {
    const ref = m.pasBoti || (m.pasBoti = {}), vii = {};
    for (const x of boti) {
      if (!x || !x.id || x.activ === false) continue;
      vii[x.id] = true;
      const r = alertaBotPas(x, ref[x.id], acum);
      if (!r.alerta) { ref[x.id] = r.ref; continue; }
      if (await trimiteAlerta(r.alerta, x.id, r.alerta.cheie)) ref[x.id] = r.ref;   // netrimisa -> referinta veche, se reincearca
    }
    if (boti.length) for (const id of Object.keys(ref)) if (!vii[id]) delete ref[id];   // lista goala (citire proasta) nu sterge referintele
  }
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
          // v100.32: botul a tinut sub o ora -> cifra din istoria lui (arhiva de acasa), pentru fisa
          let subOOra = null;
          if (Number(x.inchisLa) - Number(x.pornitLa) < 3600000) { try { const a = await cere("/api/istoric-bot?action=botiInchisi"); subOOra = Obiceiuri.subOOra(JurnalTrade.din(a && Array.isArray(a.boti) ? a.boti : [])); } catch {} }
          fisa = TabloExtra.fisaInchidere(x, { plan, atrPct, subOOra });
          await judecaLaInchidere(id, x);   // v100.43 (I-466)
        }
      } catch (e) { jurnal("fisa de inchidere", id, e.message); }
      const trimis = fisa ? await trimiteAlerta({ nivel: fisa.nivel, titlu: fisa.titlu, mesaj: fisa.mesaj }, id, "inchis") : await anuntaMesaj(MesajeColector.lipsaPionex(m.cunoscuti[id].nume));
      if (trimis) m.cunoscuti[id].activ = false;
    }
  }
  // v100.29: bot nou pornit din Pionex pe o moneda unde pierzi (pe toata istoria, din arhiva) -> o alerta, inainte sa intre la „cunoscuti”
  try {
    const av = await avertizariPornire({ boti, cunoscuti: m.cunoscuti, acum, Obiceiuri, adresa: adresaRadarului,   // v100.33: + linkul spre poarta
      trades: async () => { const a = await cere("/api/istoric-bot?action=botiInchisi"); return JurnalTrade.din(a && Array.isArray(a.boti) ? a.boti : []); } });
    for (const x of av) await trimiteAlerta({ nivel: x.nivel, titlu: x.titlu, mesaj: x.mesaj }, x.bot, "pornire-moneda");
  } catch (e) { jurnal("avertizare la pornire", e.message); }
  for (const b of boti) if (b && b.id) m.cunoscuti[b.id] = { activ: b.activ !== false, nume: String(b.baza || "").replace(/\.PERP$/, "") };
  // v101.59 (Busola 1.36, §2 „paza boților”): rezumatul Busolei o dată la 30 min (ca fișa); vechi ⇒ o notă doar în Radar, o dată pe rezumat
  try {
    await Busola.incarca(fetch, acum);
    const n = notaVeche({ Busola, rez: Busola.rezumat(), acum, anuntat: meta().busolaVeche });
    if (n && (await trimiteAlerta(n, null, n.cheie))) meta().busolaVeche = n.la;
  } catch (e) { jurnal("busola", e.message); }
  for (const b of boti) {
    if (!b || !b.id) continue;
    try {
      await trimite("/api/istoric-bot?action=adauga", { bot: b.id, intrare: { t: acum, perechi: b.ordinePerechi, pretPerp: b.pretCurent,
        profitNet: b.profitNet, comisioane: b.comisioane, gridProfitBrut: b.gridProfitBrut, investit: b.investit,
        profitTotal: b.profitTotal, distantaLichidarePct: b.distantaLichidarePct } });
    } catch (e) { jurnal("istoric", b.id, e.status || "", e.message); }
    if (b.activ === false && !(stareAlerte[b.id] && stareAlerte[b.id].activ && stareAlerte[b.id].activ.nivel === "ok")) continue;
    const ctx = Object.assign({}, await directiaBotului(b));
    // v101.40: istoricul distantei pana la lichidare (3 h, un punct la ~5 min), ca semaforul sa stie daca pretul se apropie sau se indeparteaza.
    // Revizia 01.10: inaintea citirii planului (o eroare acolo nu lasa gauri) si null-sigur (Number(null) = 0 dadea „era 0.0%”)
    { const st0 = stareAlerte[b.id] || (stareAlerte[b.id] = {}), dl = typeof b.distantaLichidarePct === "number" && Number.isFinite(b.distantaLichidarePct) ? b.distantaLichidarePct : null;
      const ist = (st0._distIst || []).filter((e) => acum - e.t < 3 * 3600000), u = ist[ist.length - 1];
      st0._distIst = dl !== null && (!u || acum - u.t >= 4.5 * 60000) ? ist.concat([{ t: acum, distantaLichidarePct: dl }]) : ist; }
    // v81: planul lui pentru bot (tinut pe server) + de cand e pretul in afara gridului
    try {
      const pl = await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(b.id));
      const st = stareAlerte[b.id] || (stareAlerte[b.id] = {});
      const p = Number(b.pretCurent), afara = Number.isFinite(p) && b.gridJos != null && b.gridSus != null && (p < Number(b.gridJos) || p > Number(b.gridSus));
      st._afaraDe = afara ? (st._afaraDe || acum) : null;
      if (pl && pl.plan && !pl.plan.proba) {   // v88: nu si planul unei probe
        ctx.plan = TabloExtra.planStare(b, pl.plan, { afaraDe: st._afaraDe, ampZi: ctx.ampZi, minusAtins: !!st._minusAtins }, acum);
        st._minusAtins = ctx.plan.atins.indexOf("minus") >= 0;   // v100.39: histerezis - atins ramane atins pana revine peste 80% din prag
      }
      // v97.6: botul nou fara plan -> o data pe Discord, cu propunerea (dupa planul lui cel mai nou), la 10 min dupa pornire
      if (pl && !pl.plan && !st._faraPlan && Number(b.pornitLa) > 0 && acum - Number(b.pornitLa) > 10 * 60000) {
        let ult = null;
        try { const u = await cere("/api/istoric-bot?action=ultimulPlan"); if (u && u.plan) { ult = { plus: u.plan.plus, minus: u.plan.minus, afaraOre: u.plan.afaraOre };
          try { const fb = await cere("/api/bot-orders?status=finished&limit=30"), fa = await cere("/api/bot-orders").catch(() => null); const x = (fb && fb.bots || []).concat(fa && fa.bots || []).find((y) => String(y.id) === String(u.bot)); if (x) { ult.investit = Number(x.investit) || null; ult.nume = String(x.baza || "").replace(/\.PERP$/, ""); } } catch {} } } catch {}
        const pragCfg = await pragDinConfig(), pp = TabloExtra.propunePlan(ult, b.investit, pragCfg), nume = String(b.baza || "botul").replace(/\.PERP$/, "");
        const m = MesajeColector.faraPlan(nume, pp);
        if (await trimiteAlerta(m, b.id, m.cheie)) st._faraPlan = true;
      }
      // v101.70 (05.10, el: „să nu se mai întâmple situația de azi”, TAKE −18% la 5×): botul NOU cu gridul prea larg pentru levier - o dată, în
      // primele 6 h, cu planul lui sau, fără plan, cu cel obișnuit (TabloExtra.propunePlan). Azi alerta „grid-plan” a venit după 3 ore (cere planul scris).
      if (pl && !st._gridLarg && acum - Number(b.pornitLa) < 6 * 3600000) {
        const pragCfg = await pragDinConfig(), planMinus = pl.plan && !pl.plan.proba && Number(pl.plan.minus) > 0 ? Number(pl.plan.minus) : (TabloExtra.propunePlan(null, b.investit, pragCfg) || {}).minus;
        const gv = TabloExtra.gridVsPlan(b, planMinus);
        if (gv && !gv.preaLarg) st._gridLarg = "ok";   // revizia 05.10: fără date (gv null) se reîncearcă, nu se declară „ok” pentru totdeauna
        else { const m = MesajeColector.gridPreaLarg(String(b.baza || "botul").replace(/\.PERP$/, ""), gv); if (await trimiteAlerta(m, b.id, m.cheie)) st._gridLarg = "trimis"; }
      }
      // v101.73 (I-538): botul nou, o dată în primele 6 h - seamănă cu ÎNGUST / LARG din fișa de DINAINTE de pornire? (ferestrele de pe server)
      if (!st._fereastra && acum - Number(b.pornitLa) < 6 * 3600000) {
        const fb = GridPlan.fereastraBotului(b, await ferestreServer());
        // revizia 05.10: fără ofertă (încă - lista de pe server e ținută 5 min) nu se marchează nimic: se reîncearcă în cele 6 h
        if (fb) { const m = MesajeColector.pornitCa(String(b.baza || "botul").replace(/\.PERP$/, ""), fb); if (await trimiteAlerta(m, b.id, m.cheie)) st._fereastra = { k: fb.k, oreTipic: fb.oreTipic || null }; }
      }
      // v101.73 (I-540): ceasul ferestrei LARG - o notă, o dată, când stă de peste 2× durata tipică din proba ferestrei
      if (st._fereastra && st._fereastra.k === "larg" && st._fereastra.oreTipic > 0 && !st._ceasLarg && acum - Number(b.pornitLa) > 2 * st._fereastra.oreTipic * 3600000) {
        const m = MesajeColector.ceasLarg(String(b.baza || "botul").replace(/\.PERP$/, ""), (acum - Number(b.pornitLa)) / 3600000, st._fereastra.oreTipic);
        if (await trimiteAlerta(m, b.id, m.cheie)) st._ceasLarg = true;
      }
      // v101.78 (I-563): botul stă de 24 h și e pe minus - o dată, cu cifrele lui (din boții tăi care au ajuns la 24 h; raportul de noapte)
      // revizia: fără ora pornirii nimic (M3); minusul contează de la 0,5% din investiție (M4)
      if (!st._minus24 && Number(b.pornitLa) > 0 && acum - Number(b.pornitLa) >= 24 * 3600000 && Number(b.profitTotal) < -0.005 * (Number(b.investit) > 0 ? Number(b.investit) : 0)) {
        const rp = await riscRaport(), ore = (acum - Number(b.pornitLa)) / 3600000;
        if (rp || !riscMemo.eroare || ore >= 26) {
          const pr = rp && rp.boti ? RiscLuna.pragulAtins(rp.boti.supravietuire, ore) : null, t = rp && rp.boti ? RiscLuna.textBot(rp.boti.supravietuire, ore) : null;
          const m = MesajeColector.minus24h(String(b.baza || "botul").replace(/\.PERP$/, ""), ore, Number(b.profitTotal), t, pr);
          if (await trimiteAlerta(m, b.id, m.cheie)) st._minus24 = true;
        }
      }
      // v101.39 (I-481): ceasul gridului ingust - botul pornit cu setarile variantei ingusta: un singur mesaj cand trece durata probata.
      // Potrivirea se tine minte (KV-ul ingust se rescrie la 6 h si poate sa nu mai propuna)
      try {
        // revizia 01.10: botii porniti de peste 18 h nu se mai pot potrivi - nu se mai cere nimic pentru ei; potrivirea se publica pentru banda Tabloului
        if (!st._ceas && acum - Number(b.pornitLa) < 18 * 3600000) { const gi = await ingustPentruBot(b); const p = gi ? GridProba.potrivireIngust({ jos: Number(b.gridJos), sus: Number(b.gridSus), directie: b.directie, pornitLa: Number(b.pornitLa) }, gi) : null; if (p) { st._ceas = p; scrieStare(); try { await trimite("/api/istoric-bot?action=ingustCeas", { bot: b.id, ceas: p }); } catch (e) { jurnal("ceas ingust publicat", e.message); } } }
        if (st._ceas && !st._ceasTrimis && acum >= st._ceas.inchideLa) {
          const nume = String(b.baza || "botul").replace(/\.PERP$/, "");
          const dc = new Date(st._ceas.inchideLa), hm = String(dc.getHours()).padStart(2, "0") + ":" + String(dc.getMinutes()).padStart(2, "0"), tarziu = acum - st._ceas.inchideLa > 30 * 60000;
          if (await trimiteAlerta(MesajeColector.ceasIngust(nume, st._ceas.ore, hm, tarziu), b.id, "ingust-ceas")) { st._ceasTrimis = true; scrieStare(); }
        }
      } catch (e) { jurnal("ceas ingust", b.id, e.message); }
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
    ctx.taci = socotealaTaci;   // v100.43 (I-466): sfaturile care nu bat hazardul raman doar in Radar
    const r = Alerte.evalueaza(b, ctx, inainte, acum);
    stareAlerte[b.id] = r.stare;
    // v91.11 (4): grila atinsa / pereche incheiata - contorii se muta abia dupa ce mesajul a plecat
    try {
      const g = Alerte.grila(b, stareAlerte[b.id]._grila || null);
      let plecat = true;
      for (const msg of g.mesaje) {
        // v100.40 (audit 30.09: 185 de mesaje pe 28.09, alerta critica se ineca printre „pereche încheiată”; cu gridul des vin zeci pe
        // zi): fiecare pereche ramane in Radar, pe Discord pleaca un REZUMAT pe ora (perechiOra), nu un mesaj pe pereche
        if (msg.perechi > 0 && CANAL === "discord") { const po = meta().perechiOra || (meta().perechiOra = {}), x = po[b.id] || (po[b.id] = { de: Date.now(), n: 0, usdt: 0, nume: String(b.baza || "").replace(/\.PERP$/, "") }); x.n += msg.perechi; x.usdt += msg.usdt || 0; msg.doarRadar = true; }
        if (!(await trimiteAlerta(msg, b.id, msg.cheie))) plecat = false;
      }
      if (plecat) stareAlerte[b.id]._grila = g.contori;
    } catch (e) { jurnal("grila", b.id, e.message); }
    // v96.5 opritorul care urca: dupa tinta, o data pe treapta; treapta se tine minte abia dupa ce mesajul a plecat
    try {
      const pu = Alerte.podeaUrca(b, ctx.plan || null, ctx, stareAlerte[b.id]._podea || null);
      let plecat = true;
      for (const msg of pu.mesaje) if (!(await trimiteAlerta(msg, b.id, msg.cheie))) plecat = false;
      if (plecat) { if (pu.stare) stareAlerte[b.id]._podea = pu.stare; else delete stareAlerte[b.id]._podea; }
    } catch (e) { jurnal("podea", b.id, e.message); }
    // v101.59 (§2 „paza boților”): moneda botului trece în „mai agitată ca de obicei” pe 4h (Busola) ⇒ un mesaj, nerepetat până iese.
    // După `stareAlerte[b.id] = r.stare`: _busola se scrie pe starea nouă (evalueaza o copiază la tura următoare)
    try { await pazaPas({ Busola, rez: Busola.rezumat(), bot: b, st: stareAlerte[b.id], acum, pret: Alerte.pret, trimite: (m) => trimiteAlerta(m, b.id, m.cheie), monede: meta().busolaMonede || (meta().busolaMonede = {}) }); } catch (e) { jurnal("paza busola", b.id, e.message); }
    // o alerta care n-a plecat (ntfy picat, fara internet) nu se trece ca trimisa:
    // starea ei revine la cea de dinainte, ca tura urmatoare s-o reincerce
    for (const msg of r.mesaje) if (!(await trimiteAlerta(msg, b.id, msg.cheie))) {
      if (inainte[msg.cheie]) stareAlerte[b.id][msg.cheie] = inainte[msg.cheie]; else delete stareAlerte[b.id][msg.cheie];
    }
  }
  // v101.60 (I-513): starea Busolei pe fiecare bot (cu „de când”) la server, ca Tabloul să scrie „de N h”
  try { await trimite("/api/istoric-bot?action=paza", pentruServer(boti, stareAlerte, acum)); } catch (e) { jurnal("paza server", e.message); }
  // v101.60 (I-515 + I-498): fișierul local pentru Busola - boții deschiși + închișii din 90 de zile, scris atomic la fiecare tură
  try { await scriePentruBusola(boti, acum); } catch (e) { jurnal("pentru-busola", e.message); }
  try { await turaPreturi(acum); } catch (e) { jurnal("preturi", e.message); }
  try { await turaMediu(acum); } catch (e) { jurnal("raport 3h", e.message); }
  try { await turaRaport(acum); } catch (e) { jurnal("raport", e.message); }
  try { scrieStare(); } catch {}
  try { await trimite("/api/istoric-bot?action=config", Object.assign({ colectorLa: acum, canal: CANAL === "ntfy" ? "ntfy" : CANAL === "discord" ? "discord" : "radar" }, NTFY.topic ? { ntfyTopic: NTFY.topic } : {})); } catch (e) { jurnal("config", e.message); }
}

// v79 F3: o data pe ora, "pe care monede pornesc grid acum?" pe top 100 PERP dupa volum,
// cu lumanari de 4h (o cerere pe moneda, cu pauza - serverul are si el poarta de ritm).
// Rezultatul merge in KV (istoric-bot?action=clasament); fereastra Grid il arata.
const CLASAMENT_MS = Number(process.env.COLECTOR_CLASAMENT_MS) || 3600000, CLASAMENT_TOP = 100;
// v100.40 (audit 30.09): ritmurile turelor scumpe (clasament, laborator) tinute minte peste reporniri - pe 30.09 laboratorul
// „o dată pe zi” a rulat de 5 ori (13 reporniri, ~44 de minute de cereri Pionex)
const RITM_FIS = path.join(DATA, "ritmuri.json");
let ritm = {}; try { ritm = JSON.parse(fs.readFileSync(RITM_FIS, "utf8")) || {}; } catch { ritm = {}; }
function tineRitm(k, v) { ritm[k] = v; try { scrieAtomic(RITM_FIS, ritm); } catch {} }
let clasamentLa = Number(ritm.clasament) || 0, clasamentInLucru = false;
async function turaClasament() {
  if (clasamentInLucru || Date.now() - clasamentLa < CLASAMENT_MS) return;
  clasamentInLucru = true;
  try {
    const r = await turaClasamentModul({ cere, trimite, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), GridCalcul, GridClasament, Reveniri, top: CLASAMENT_TOP });
    clasamentLa = r.urcat ? Date.now() : Date.now() - CLASAMENT_MS + 10 * 60000;   // neurcat -> reincearca in 10 min
    if (r.urcat) tineRitm("clasament", clasamentLa);
  } catch (e) { jurnal("clasament ESEC", e.message); clasamentLa = Date.now() - CLASAMENT_MS + 10 * 60000; }
  clasamentInLucru = false;
}

if (CANAL === "discord" && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(DISCORD_WEBHOOK)) jurnal("ATENTIE: ALERTE_CANAL=discord dar DISCORD_WEBHOOK lipseste/gresit in .dev.vars - alertele raman doar in Radar");
// v79.5: laboratorul de grid, o data pe zi (prima data la 30 de minute dupa pornire), niciodata
// peste clasament. ~20 monede x 6 pagini x 1,6 s ~ 4 minute; v101.11: 12 pagini (doua luni) ~ 7 minute.
const LABORATOR_MS = 24 * 3600000;
let laboratorLa = Math.max(Date.now() - LABORATOR_MS + 30 * 60000, Number(ritm.laborator) || 0), laboratorInLucru = false;
async function turaLaborator() {
  if (process.env.COLECTOR_FARA_LABORATOR || laboratorInLucru || clasamentInLucru || Date.now() - laboratorLa < LABORATOR_MS) return;
  laboratorInLucru = true;
  try {
    const cerePionex = (tip, simbol, end) => cere(tip === "tickers" ? "/api/market?type=pionex_tickers&market=PERP" : "/api/market?type=pionex_klines&symbol=" + encodeURIComponent(simbol) + "&interval=15M&limit=500" + (end ? "&endTime=" + end : ""));
    const pp = await planulPentruProbe();   // v101.9: „gridul dupa planul tau” pe monedele laboratorului
    // v101.10: si monedele botilor care ruleaza (tickerul real Pionex), chiar daca nu sunt in top - randul „botul tău”
    let extra = [];
    try { const act = await cere("/api/bot-orders"); extra = [...new Set((act && act.bots || []).filter((b) => b && b.activ !== false && b.simbolPionex).map((b) => String(b.simbolPionex)))]; } catch (e) { jurnal("laborator botii care ruleaza", e.message); }
    const r = await turaLaboratorModul({ cere: cerePionex, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), GridCalcul, GridLaborator, GridClasament, top: 20, H: 2, pagini: 12, zile: 60, GridPlan, plan: pp.plan, suma: pp.suma, levier: pp.levier, notaPlan: pp.nota, miscareZi: TabloExtra.miscareZi, extraSimboluri: extra });
    if (r.monede >= 10) { await trimite("/api/istoric-bot?action=laborator", r); laboratorLa = Date.now(); tineRitm("laborator", laboratorLa); }
    else { jurnal("laborator NEURCAT: doar", cate(r.monede, "monedă", "monede")); laboratorLa = Date.now() - LABORATOR_MS + 60 * 60000; }
  } catch (e) { jurnal("laborator ESEC", e.message); laboratorLa = Date.now() - LABORATOR_MS + 60 * 60000; }
  laboratorInLucru = false;
}

// v101.39 (I-481): rezultatul gridului ingust pe moneda unui bot, o data la 10 min pe moneda
const ingustBoti = {};
async function ingustPentruBot(b) {
  const s = TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex; if (!s) return null;
  const c = ingustBoti[s]; if (c && Date.now() - c.la < 10 * 60000) return c.v;
  let v = null; try { const d = await cere("/api/istoric-bot?action=ingust&simbol=" + encodeURIComponent(s)); v = d && d.ingust || null; } catch { v = c ? c.v : null; }
  ingustBoti[s] = { la: Date.now(), v }; return v;
}
// v101.38 (el, 01.10): gridul ingust pe <= 5 monede sugerate, cu 60 de zile de 15M - la 6 h, niciodata peste clasament/laborator
const INGUST_MS = 6 * 3600000;
let ingustLa = Number(ritm.ingust) || 0, ingustInLucru = false;
async function turaIngust() {
  if (process.env.COLECTOR_FARA_INGUST || ingustInLucru || clasamentInLucru || laboratorInLucru || Date.now() - ingustLa < INGUST_MS) return;
  ingustInLucru = true;
  try {
    const cl = await cere("/api/istoric-bot?action=clasament");
    // revizia 01.10 (C1): la o eroare de citire, null - tura nu scrie peste istoric
    let urm = null; try { const u = await cere("/api/istoric-bot?action=ingustUrmarire"); urm = u && Array.isArray(u.lista) ? u.lista : null; } catch (e) { jurnal("ingust urmarire", e.message); }   // v101.39 (I-480)
    // revizia 01.10: 0 monede (server oprit, fara clasament) = esec -> reincearca in 30 min, nu peste 6 h
    const r = await turaIngustModul({ urmarire: urm, clasament: cl && cl.clasament, Idei, GridProba, GridCalcul, jurnal, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)),
      cere: (simbol, end) => cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(simbol) + "&interval=15M&limit=500" + (end ? "&endTime=" + end : "")), trimite });
    if (!r || !r.monede) throw new Error("nicio monedă sugerată calculată");
    ingustLa = Date.now(); tineRitm("ingust", ingustLa);
  } catch (e) { jurnal("ingust ESEC", e.message); ingustLa = Date.now() - INGUST_MS + 30 * 60000; }
  ingustInLucru = false;
}

// v101.9: planul lui cel mai nou, cu suma si levierul botului de care tine, pentru proba „gridul dupa planul tau” din laborator;
// fara el, propunerea (+3% / −15%) pe 100 USDT la 5x
async function planulPentruProbe() {
  let ult = null, levier = null;
  try {
    const u = await cere("/api/istoric-bot?action=ultimulPlan");
    if (u && u.plan && u.plan.plus > 0 && u.plan.minus > 0) {
      ult = { plus: u.plan.plus, minus: u.plan.minus };
      try { const fb = await cere("/api/bot-orders?status=finished&limit=30"), fa = await cere("/api/bot-orders").catch(() => null); const x = (fb && fb.bots || []).concat(fa && fa.bots || []).find((y) => String(y.id) === String(u.bot)); if (x) { ult.investit = Number(x.investit) || null; ult.nume = String(x.baza || "").replace(/\.PERP$/, ""); levier = Number(x.levier) || null; } } catch {}
    }
  } catch (e) { jurnal("plan pentru laborator", e.message); }
  const suma = ult && ult.investit > 0 ? ult.investit : 100, p = TabloExtra.propunePlan(ult, suma);
  return { plan: { plus: p.plus, minus: p.minus }, suma, levier: levier || 5, nota: p.nota };
}

// v100.25 (30.09, el: „FA IDEILE”): arhiva botilor inchisi - Pionex da istoria pe pagini de cate 10; prima tura o strange
// pe toata (~226 de pagini, cu 2 s intre ele), apoi o data la 10 minute doar botii noi (scripts/lib/tura-arhiva-boti.mjs)
const ARHIVA_MS = 10 * 60000;
let arhivaLa = Date.now() - ARHIVA_MS + 60000, arhivaInLucru = false;
async function turaArhivaBoti() {
  if (arhivaInLucru || Date.now() - arhivaLa < ARHIVA_MS) return;
  arhivaInLucru = true;
  try {
    const r = await strangeBoti({ cere, trimite });
    arhivaLa = Date.now();
    if (r.noi || r.pagini > 1) jurnal("arhiva boti inchisi:", cate(r.noi, "bot nou", "boți noi") + ",", r.total, "in total,", cate(r.pagini, "pagină", "pagini") + ",", r.complet ? "completa" : "INCOMPLETA");
  } catch (e) { jurnal("arhiva boti inchisi", e.message); arhivaLa = Date.now() - ARHIVA_MS + 3 * 60000; }
  arhivaInLucru = false;
}

// v100.40 (audit 30.09, CRITIC): Pionex da istoria botilor pe PAGINI de 10 si ignora limit -> raportul de duminica si „Dacă ascultai”
// vedeau doar ultimii 10 boti (27.09: raportul a zis „10 boti, −18,39 USDT”; saptamana reala: 26 boti, +24,51 brut / +8,48 net).
// Toti botii inchisi = arhiva de acasa (action=botiInchisi, toata istoria) + prima pagina Pionex (cei inchisi dupa ultima tura
// de arhiva), unificati pe strategyId.
async function botiInchisiToti() {
  const out = new Map();
  try { const a = await cere("/api/istoric-bot?action=botiInchisi"); for (const x of (a && Array.isArray(a.boti) ? a.boti : [])) { const id = String(x && (x.strategyId || x.buOrderId) || ""); if (id) out.set(id, x); } } catch (e) { jurnal("arhiva botilor", e.message); }
  try { const d = await cere("/api/bot-orders?status=finished&limit=100"); for (const y of (d && Array.isArray(d.bots) ? d.bots : [])) { const x = y.brut || y, id = String(x && (x.strategyId || x.buOrderId) || y.id || ""); if (id && !out.has(id)) out.set(id, x); } } catch (e) { jurnal("botii inchisi (Pionex)", e.message); }
  return [...out.values()];
}
// v101.60 (I-515 + I-498, specul colaborării 2 §5): ce trimite Radarul Busolei - fișier LOCAL scris atomic la fiecare tură (Busola îl
// citește oricând; peste 24 h îl socotește vechi). Închișii (arhiva + prima pagină Pionex) se reîmprospătează la 10 minute; o citire
// goală nu șterge lista de dinainte. Deschișii vin din tura curentă.
const PENTRU_BUSOLA_FIS = path.join(DATA, "pentru-busola.json");
let pbInchisi = { la: 0, lista: [] };
async function scriePentruBusola(boti, acum) {
  const de90 = acum - 90 * 86400000;
  if (acum - pbInchisi.la > 10 * 60000) {
    try {
      await simbolPerp("BTC");   // încălzește lista Pionex (LIGHTER -> LIT_USDT_PERP) pentru cheile închișilor
      // revizia: doar ultimele 90 de zile intră în JurnalTrade.din (altfel trecerea greșelilor, pătratică, mergea pe toată arhiva la 10 min);
      // o citire parțială (arhiva picată, doar pagina Pionex) se UNEȘTE cu lista de dinainte, nu o înlocuiește
      const l = JurnalTrade.din((await botiInchisiToti()).filter((x) => Number(x && x.closeTime) >= de90));
      const m = new Map(pbInchisi.lista.map((t) => [t.id, t])); for (const t of l) m.set(t.id, t);
      pbInchisi = { la: acum, lista: [...m.values()].filter((t) => t.inchis >= de90) };
    } catch (e) { jurnal("pentru-busola inchisi", e.message); pbInchisi.la = acum - 7 * 60000; }
  }
  const cheiaBusola = (s) => (simboluriPerp && simboluriPerp[String(s || "").toUpperCase()]) || s;
  scrieAtomic(PENTRU_BUSOLA_FIS, pentruBusola({ la: acum, versiune: VERSIUNE_COLECTOR, deschisi: boti, inchisi: pbInchisi.lista, acum, Busola, cheia: cheiaBusola, retea: Object.values(reteaUltim).flat() }));
}

// v100.40: tickerul Pionex al monedei unui bot (LIGHTER -> LIT_USDT_PERP, PUMPFUN -> PUMP_USDT_PERP), din lista de simboluri

let simboluriPerp = null, simboluriLa = 0;
async function simbolPerp(moneda) {
  if (!simboluriPerp || Date.now() - simboluriLa > 6 * 3600000) {
    try { const d = await cere("/api/market?type=pionex_symbols&market=PERP"), m = {}; for (const x of (d && d.data && d.data.symbols || [])) if (x && x.baseCurrency && /_USDT_PERP$/.test(x.symbol)) m[String(x.baseCurrency).toUpperCase()] = x.symbol; simboluriPerp = m; simboluriLa = Date.now(); } catch (e) { jurnal("simbolurile PERP", e.message); }
  }
  const b = String(moneda || "").toUpperCase();
  return (simboluriPerp && simboluriPerp[b]) || b + "_USDT_PERP";
}

// v83: "daca ascultai de Radar" pentru botii inchisi - o data pe ora, cel mult 5 boti noi pe tura
let cfLa = Date.now() - 3600000 + 10 * 60000, cfInLucru = false;
const cfEsuat = {};   // v100.40: botii la care n-au venit lumanarile - se reincearca abia dupa o zi (nu ocupa locurile turei din ora in ora)
async function turaCf() {
  if (process.env.COLECTOR_FARA_CLASAMENT || cfInLucru || clasamentInLucru || laboratorInLucru || Date.now() - cfLa < 3600000) return;
  cfInLucru = true;
  try {
    const v = await cere("/api/istoric-bot?action=contrafactual");
    const gata = {}; Object.keys((v && v.contrafactual) || {}).forEach((k) => { gata[k] = true; });
    for (const k of Object.keys(cfEsuat)) if (Date.now() - cfEsuat[k] < 86400000) gata[k] = true;
    const rez = await turaContrafactual({
      cereBoti: botiInchisiToti, simbol: simbolPerp, esuat: (id) => { cfEsuat[id] = Date.now(); },
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
// v100.40 (audit 30.09): Trading 212 nu mai raspunde (cheie revocata/expirata, 401/403, serverul fara chei) -> dupa 30 de minute
// o alerta critica (repetata cel mult la 6 ore), iar la revenire una de informare. Inainte: doar jurnal - alertele de stop pe
// pozitiile T212 se opreau in liniste. 429 (limita de ritm) nu e cadere.
async function t212Sanatate(e) {
  const m = meta(), acum = Date.now();
  if (!e) { if (m.t212AnuntatRau) await anuntaMesaj(MesajeColector.t212DinNou()); m.t212RauDe = 0; m.t212AnuntatRau = 0; return; }
  if (e.status === 429) return;
  m.t212RauDe = m.t212RauDe || acum;
  if (acum - m.t212RauDe >= 30 * 60000 && acum - (m.t212AnuntatRau || 0) >= 6 * 3600000) {
    if (await anuntaMesaj(MesajeColector.t212Rau(Math.round((acum - m.t212RauDe) / 60000), e.status, e.message))) m.t212AnuntatRau = acum;
  }
}
async function turaPlanuriT212() {
  if (process.env.COLECTOR_FARA_T212 || planT212InLucru || Date.now() - planT212La < 5 * 60000) return;
  const v = citesteVarsSigur(); if (!(v.T212_API_KEY && v.T212_API_SECRET)) { planT212La = Date.now(); return; }
  planT212InLucru = true; planT212La = Date.now();
  const m = meta(), st = m.t212Alerte || (m.t212Alerte = {}), prag = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  for (const k of Object.keys(st)) if (k.slice(-10) < prag) delete st[k];
  try {
    await turaPlanuriModul({
      cerePozitii: async () => {
        try { const d = await cere("/api/t212?action=pozitii"); await t212Sanatate(null); return d && d.pozitii || []; }
        catch (e) { await t212Sanatate(e); throw e; }
      },
      cerePlan: async (tk) => { const d = await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + tk)); return d && d.plan || null; },
      cereBare: async (tk) => { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk)); return GridCalcul.bareBursa(d && d.randuri || [], Date.now()); },
      trimite: (msg, cheie) => trimiteAlerta(msg, null, cheie.replace(/[^A-Za-z0-9_-]/g, "")), stare: st, ActiuniSemnale, T212, jurnal });
  } catch (e) { jurnal("planuri t212 ESEC", e.message); }
  // v87: frana de "cumparat in jos" (NPA: 4 cumparari pe minus, -8.165 lei) + plafonul de 20% din cont
  try {
    const zi = ziSesiune(Date.now()), h = await cere("/api/t212?action=istoric");   // v100.40: ziua sesiunii NY (plafonul de 20% o data pe sesiune)
    const rpA = await riscRaport(), a1 = rpA && rpA.actiuni ? (rpA.actiuni.comportament || []).find((y) => y.k === "A1") : null;   // v101.78 (I-565): cifra lui
    for (const x of ActiuniSemnale.cumparariInJos((h && h.umpleri) || []).filter((y) => Date.now() - y.t < 24 * 3600000)) {
      const k = "t212-injos-" + x.id + "-" + new Date(x.t).toISOString().slice(0, 10);
      if (st[k]) continue;
      if (await trimiteAlerta(ActiuniSemnale.alertaFrana(x, T212.simbol(x.ticker), a1), null, k.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60))) st[k] = true;
    }
    const c = await cere("/api/t212?action=cont"), pz = await cere("/api/t212?action=pozitii");
    const cash = c && c.cash || {}, poz = (pz && pz.pozitii || []).filter((x) => x && x.quantity > 0);
    let usd = 0; poz.forEach((x) => { usd += x.quantity * x.currentPrice; });
    const inv = cash.total > 0 && cash.free >= 0 ? cash.total - cash.free : null;
    if (inv !== null && usd > 0) for (const x of poz) {
      const pond = x.quantity * x.currentPrice / usd * inv / cash.total, k = "t212-conc-" + x.ticker + "-" + zi;
      if (pond <= 0.2 || st[k]) continue;
      const s = T212.simbol(x.ticker);
      if (await trimiteAlerta(MesajeColector.pondereT212(s, pond), null, k.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60))) st[k] = true;
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
      T212, ActiuniSemnale, ProfilMoneda, Probabilitati, pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)), jurnal, max: 40 });   // v101.31: + varianta „prof”
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
const yahooExtra = creeazaYahooExtra({ fisier: path.join(DATA, "poza-ext.json"), fisierBare: path.join(DATA, "poza-bare.json"), jurnal });
let pozaLa = 0, pozaInLucru = false, ultimeleT212 = { lista: [], la: null };   // T212 limiteaza cererile: la o citire picata raman pozitiile de la poza anterioara
function planReal(x) { return x && x.plan && !x.plan.proba ? x.plan : null; }
// v101.31 (actiunile T212, pachetul 1): stopul care urca ales pe trade-urile lui (varianta „prof” vs −15%, o data pe ora) si profilul
// actiunii (KV profil:<TICKER>, la 6 h) - acelasi calcul ca pagina T212
let trailAlesT212 = { la: 0, v: null }; const profilActCache = {}, stariActiuni = {}, consTrimis = {}, jurnaleAct = {}, planUltim = {}, rezultateAct = {};   // v101.33: starile zilelor pe ticker|ultima bara (probabilitatile)
async function trailAlesPt(inchise) {
  if (trailAlesT212.v && Date.now() - trailAlesT212.la < 3600000) return trailAlesT212.v;
  try { const c = await cere("/api/t212?action=cf"), v = ActiuniSemnale.alegeTrail(inchise, (c && c.cf) || {}); trailAlesT212 = { la: Date.now(), v };
    jurnal("stopul care urca:", v.cheie, "·", v.motiv); }   // revizia 01.10 (I3): alegerea si comparatia raman in jurnal
  catch (e) { jurnal("poza: stopul ales", e.message); }
  return trailAlesT212.v;
}
async function pragProfilActiune(tk) {
  const c = profilActCache[tk]; if (c && Date.now() - c.la < 6 * 3600000) return c.ps;
  let ps = null, prof = null; try { const d = await cere("/api/istoric-bot?action=profil&simbol=" + encodeURIComponent(tk)); prof = d && d.profil || null; ps = prof ? ProfilMoneda.pragStopActiune(prof) : null; } catch { ps = null; }
  profilActCache[tk] = { la: Date.now(), ps, ev: prof && prof.evenimente || null }; return ps;
}
// revizia 01.10 (I4): rezultatele in N zile (aceeasi ruta ca pagina, o data pe zi pe ticker) - colectorul si pagina spun acelasi lucru
async function rezultateZilePt(tk) {
  const zi = new Date().toISOString().slice(0, 10), c = rezultateAct[tk];
  if (!c || c.zi !== zi) { let data = null; try { const r = await cere("/api/t212?action=rezultate&ticker=" + encodeURIComponent(tk)); data = r && r.data || null; } catch { data = c ? c.data : null; } rezultateAct[tk] = { zi, data }; }
  const d = rezultateAct[tk].data; if (!d) return null;
  const zc = Math.ceil((Date.parse(d + "T12:00:00Z") - Date.now()) / 86400000); return zc >= 0 ? Math.round(zc * 5 / 7) : null;
}
async function pozitiiPentruPoza() {
  const v = citesteVarsSigur(); if (!(v.T212_API_KEY && v.T212_API_SECRET)) return [];
  const pz = await cere("/api/t212?action=pozitii"), poz = (pz && pz.pozitii || []).filter((x) => x && x.quantity > 0);
  let loturi = [], inchiseT = []; try { const h = await cere("/api/t212?action=istoric"), pp = T212.perechi((h && h.umpleri) || []); loturi = pp.deschise || []; inchiseT = pp.inchise || []; } catch (e) { jurnal("poza: loturi", e.message); }
  const alesT = await trailAlesPt(inchiseT);
  let cash = null; try { cash = (await cere("/api/t212?action=cont")).cash || null; } catch {}
  if (cash && cash.total > 0) contT212 = cash.total;   // v101.2: contul in lei, pentru „câte bucăți” la simbolurile urmarite
  let usd = 0; poz.forEach((x) => { usd += x.quantity * x.currentPrice; });
  const inv = cash && cash.total > 0 && cash.free >= 0 ? cash.total - cash.free : null;
  const out = [];
  for (const x of poz) {
    let bare = [], plan = null;
    try { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.ticker)); bare = GridCalcul.bareBursa(d && d.randuri || [], Date.now()); } catch (e) { jurnal("poza: bare", x.ticker, e.message); }
    // revizia 01.10 (I5): la o eroare (RATE_LIMITED) ramane ultimul plan cunoscut - altfel stop-plan disparea si verdictul pâlpâia pe Discord
    try { plan = planReal(await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + x.ticker))); planUltim[x.ticker] = plan; } catch { plan = planUltim[x.ticker] ?? null; }
    const mx = ActiuniSemnale.maxDupaCumparare(bare, x.initialFillDate, x.currentPrice);   // v100.40: de la ziua de dupa cumparare
    const p = { ticker: x.ticker, simbol: T212.simbol(x.ticker), qty: x.quantity, pretMediu: x.averagePrice, pret: x.currentPrice, plan, maxDupaCumparare: mx };
    // v100.8 (el, 28.09: „în alerts la Trading 212 de ce nu apar și aici insiderii”): aceeași sursă ca la simbolurile paginii
    // (Yahoo quoteSummary, cache 6 h în data/poza-ext.json); dublurile germane iau insiderii companiei din SUA
    const sursa = DUBLURI[p.simbol] || null; let extra = null;
    try { extra = await yahooExtra.extra(sursa || p.simbol); } catch (e) { jurnal("poza: extra t212", p.simbol, e.message); }
    const st = bare.length ? ActiuniSemnale.stare(bare, p.pret) : null, sem = ActiuniSemnale.semafor(p, st);
    // v101.74 (I-547): becul 1z, ca pe pagina T212 - doar listările din SUA (bareBursa scoate bara de azi în formare doar pe ora New York-ului)
    const semZi = /_US_EQ$/.test(x.ticker) && bare.length ? GraficBot.semZi(bare, "long") : null;
    const tp = ActiuniSemnale.trailPozitie(alesT, await pragProfilActiune(x.ticker));   // v101.31: stopul din profil doar daca a castigat
    const n = bare.length ? ActiuniSemnale.niveluri(bare, p.pret, { pretMediu: p.pretMediu, maxDupaCumparare: mx, minTrail: tp.minTrail, trailProfil: tp.trailProfil, sursaTrail: tp.sursaTrail }) : null;
    // v101.33 (actiunile T212, pachetul 3): O SINGURA VOCE pe pozitie - Consilierul din semafor + stopul care urca + probabilitati + sfaturi;
    // in poza forma semaforului (pagina alerts neschimbata), KV cons:t212-<TICKER>, alerta la schimbare fara dubluri cu alertele planului
    const costLei = costLeiDinLoturi(loturi, x.ticker, x.quantity), nOk = n && n.nivel === "ok" ? n : null;
    let semC = sem;
    try {
      const tinta = plan && plan.tinta > 0 ? plan.tinta : nOk ? nOk.tintaPozitie : null, ub = bare.length ? bare[bare.length - 1].t : 0;
      const sm = stariActiuni[x.ticker] && stariActiuni[x.ticker].ub === ub ? stariActiuni[x.ticker] : (stariActiuni[x.ticker] = { ub, m: {} });
      const rezZ = await rezultateZilePt(x.ticker), evAct = profilActCache[x.ticker] && profilActCache[x.ticker].ev || null;
      const prob = nOk && bare.length >= 120 ? Probabilitati.randActiune(Probabilitati.pentruActiune(bare, { pret: p.pret, stop: nOk.stopPozitie, tinta, acum: Date.now(), memo: sm.m }), {}, { rezultateZile: rezZ, evenimente: evAct }) : [];
      const sf = Consilier.sfaturiPozitie({ ...p, niv: nOk, pctLei: costLei ? x.ppl / costLei : null, de: Date.parse(x.initialFillDate || "") || null }, { inchise: inchiseT, acum: Date.now() });
      const cons = Consiliu.alcatuiesteActiune({ sem, niv: nOk, prob, sfaturi: sf, plan, pret: p.pret, pretMediu: p.pretMediu, qty: p.qty, costLei, simbol: p.simbol, socoteala: socotealaAct || {}, semZi });
      semC = Consiliu.pentruPozaActiune(cons);
      const k = "t212-" + x.ticker, stA = stareAlerte[k] || (stareAlerte[k] = {}), ziU = new Date().toISOString().slice(0, 10), pa = meta().t212Alerte || {};
      // revizia 01.10 (I1): din conditii (alerta planului / SL-ul pozei suna oricum), plus ce s-a trimis deja azi
      const activ = Consiliu.activPozitie(p, nOk); if (pa[k + "-stop-" + ziU]) activ["t212-stop"] = "critic"; if (pa[k + "-trail-" + ziU]) activ["t212-trail"] = "critic"; if (pa[k + "-tinta-" + ziU]) activ["t212-tinta"] = "info";
      const ch = Consiliu.schimbare(stA._cons, cons, Date.now(), p.simbol, { activ, taci: {} });
      stA._cons = ch.stare; scrieStare();
      if (ch.alerta) await trimiteAlerta(ch.alerta, null, "consilier-" + x.ticker.replace(/[^A-Za-z0-9_-]/g, ""));
      // v101.74 (I-547): becul 1z trece împotriva poziției (în jos) - o alertă pe schimbare; prima vedere doar ține minte (fără alertă la pornire)
      // revizia v101.74: cel mult o alertă pe zi; starea se scrie după trimiterea reușită (altfel o alertă picată se pierdea) și doar la schimbare
      if (semZi && stA._bec1z !== semZi.dir) {
        const v1 = stA._bec1z, ziB = new Date().toISOString().slice(0, 10);
        if (v1 && v1 !== "coboara" && semZi.dir === "coboara" && stA._bec1zZi !== ziB) {
          if (await trimiteAlerta(MesajeColector.bec1zContra(p.simbol, semZi.vechime, p.pret / p.pretMediu - 1), null, "bec1z-" + x.ticker.replace(/[^A-Za-z0-9_-]/g, ""))) { stA._bec1z = semZi.dir; stA._bec1zZi = ziB; scrieStare(); }
        } else { stA._bec1z = semZi.dir; scrieStare(); }
      }
      // v101.34: poza poate pleca la 30 s - verdictul se scrie doar cand se schimba (ruta de scriere lasa 30 pe minut)
      const corpCons = { bot: k, acum: ch.stare.acum || null, inainte: ch.stare.inainte || null, schimbatLa: ch.stare.schimbatLa || null, deCe: ch.stare.deCe || null };
      const semnCons = JSON.stringify({ ...corpCons, acum: corpCons.acum ? { ...corpCons.acum, la: 0 } : null });
      if (consTrimis[k] !== semnCons) { await trimite("/api/istoric-bot?action=cons", corpCons); consTrimis[k] = semnCons; }
      // socoteala pe motiv si lei: verdictul notat o data pe schimbare (judecat la 5 zile de turaSocotealaActiuni)
      const fx = costLei > 0 && p.qty > 0 && p.pretMediu > 0 ? costLei / (p.qty * p.pretMediu) : null;
      if (!(x.ticker in jurnaleAct)) { const jv = await cere("/api/istoric-bot?action=semneAct&bot=" + encodeURIComponent(x.ticker)).catch(() => null); jurnaleAct[x.ticker] = jv && Array.isArray(jv.log) ? jv.log : []; }
      // revizia 01.10 (I2): doar verdictul CONFIRMAT (ch.stare.acum - 2 ture la rand), nu fiecare pâlpâire a pozei
      const j0 = jurnaleAct[x.ticker], j1 = Consiliu.noteazaActiune(j0, ch.stare.acum, p.pret, p.qty, fx, Date.now(), { stare: ActiuniSemnale.cheieSituatie(st) });
      if (j1.length !== j0.length) { await trimite("/api/istoric-bot?action=semneAct", { bot: x.ticker, log: j1 }); jurnaleAct[x.ticker] = j1; }
    } catch (e) { jurnal("consilier actiune", x.ticker, e.message); }
    // v98.1: `la` = cand a fost citit pretul T212 (pagina il arata cu chip „T212" cat e proaspat); `prev` = inchiderea ultimei sesiuni incheiate (NY)
    out.push({ ...p, sursa, extra, niveluri: n, prev: prevClose(bare, Date.now()), la: Date.now(), ppl: x.ppl, costLei, bare, sem: semC,
      niv: nivDinNiveluri(n, plan),   // stopul POZITIEI (urca dupa maxim), ca in pagina T212 a Radarului - nu stopul de intrare
      pondere: inv !== null && usd > 0 && cash.total > 0 ? x.quantity * x.currentPrice / usd * inv / cash.total : null });
  }
  // pozitiile vandute: Consilierul lor nu mai alerteaza (nicio „schimbare” pe o pozitie inchisa)
  const tine = new Set(poz.map((x) => "t212-" + x.ticker));
  for (const k of Object.keys(stareAlerte)) if (/^t212-/.test(k) && !tine.has(k) && stareAlerte[k] && stareAlerte[k]._cons) { delete stareAlerte[k]._cons; scrieStare(); }
  return out;
}
// v100.3 (el, 28.09: „procentul LIVE, acelasi cu cel din TradingView”): deschiderea zilei (00:00 UTC) din lumanarea 1D Pionex a
// botului, o data la 10 min si din nou cand incepe ziua noua. Pagina alerts ia procentul live de la Binance; asta e rezerva ei.
const ziCache = {};
async function ziBot(b) {
  const acum = Date.now(), azi = Math.floor(acum / 86400000) * 86400000, c = ziCache[b.id];
  if (c && c.azi === azi && acum - c.la < 10 * 60000) return c.zi;
  const sim = TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex;   // v100.13: tickerul real (PUMPFUN.PERP -> PUMP_USDT_PERP)
  const k = await cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(sim) + "&interval=1D&limit=2");
  const zi = ziDinKlines(k && k.data && k.data.klines, acum);
  ziCache[b.id] = { la: acum, azi, zi };
  return zi;
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
    let ziPionex = null; try { ziPionex = await ziBot(b); } catch (e) { jurnal("poza: ziua botului", b.id, e.message); }
    let zero = null; try { const z = TabloExtra.dacaInchizi(b); zero = z && z.pretZero > 0 ? z.pretZero : null; } catch {}
    const x = semnaleUlt[b.id]; out.push({ ...b, plan, zero, pret30: pret30[b.id] || [], pret24h, ziPionex, grila: TabloExtra.profitPeGrila(b), semafor: x && x.cons ? Consiliu.pentruPoza(x.cons) : x && x.semafor ? x.semafor : null, la: ultimiiBotiLa || Date.now() });   // v100.40: cand a fost citit botul
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
    // v101 (SL/TP pe alerts): nivelurile Radarului din lumanarile simbolului LISTAT (la dublurile germane in €, nu ale companiei din SUA)
    let niveluri = null;
    try { const b = await yahooExtra.bare(s.s), pr = c && c.pret != null ? c.pret : (b && b.length ? b[b.length - 1].c : null); if (b && pr) niveluri = ActiuniSemnale.niveluri(b, pr, {}); } catch (err) { jurnal("poza: bare", s.s, err.message); }
    // v98.2: prev = ultima sesiune incheiata (ziua NY), ca la pozitii - nu penultima inchidere (duminica arata vineri drept "azi")
    out.push({ s: s.s, nota: s.nota, sursa, moneda: c ? c.moneda : (/\.(DE|MU|F|PA|AS|MI|SW)$/.test(s.s) ? "€" : "$"), pret: c ? c.pret : null, prev: prevSimbol(c, Date.now()), closes30: c ? c.closes30 : [], extra: e, niveluri });
  }
  return out;
}
// v98.1 (I-462): adresa tunelului (PORNESTE-SI-PE-TELEFON.bat scrie jurnalul in %TEMP%), doar daca raspunde ca Radar; o data la 5 minute
// v101.6: INTAI adresa fixa prin Tailscale (`tailscale serve` catre BAZA) - nu se schimba la pornire; tunelul ramane rezerva
let tunelLa = 0, tunelUrl = null;
function serveTailscale() {
  return new Promise((ok) => execFile(process.env.TAILSCALE_EXE || "C:/Program Files/Tailscale/tailscale.exe", ["serve", "status", "--json"], { timeout: 8000, windowsHide: true }, (e, out) => { try { ok(e ? null : JSON.parse(out)); } catch { ok(null); } }));
}
async function raspundeCaRadar(u, ms) {
  try { const r = await fetch(u + "/api/market?type=health", { signal: AbortSignal.timeout(ms) }); const j = r.ok ? await r.json() : null; return !!(j && j.service === "crypto-radar"); } catch { return false; }
}
async function adresaRadarului() {
  if (Date.now() - tunelLa < 5 * 60000) return tunelUrl;
  tunelLa = Date.now(); tunelUrl = null;
  const fix = adresaTailscale(await serveTailscale(), BAZA);
  if (fix && await raspundeCaRadar(fix, 6000)) return (tunelUrl = fix);
  try {
    const u = Consilier.adresaTunel(fs.readFileSync(path.join(os.tmpdir(), "crypto-radar-tunel.log"), "utf8"));
    if (u && await raspundeCaRadar(u, 6000)) tunelUrl = u;
  } catch {}
  return tunelUrl;
}
let pozaOkLa = 0, ultimeleSimboluri = {}, contT212 = null;
async function turaPoza() {
  const botiActivi = ultimiiBoti.filter((b) => b && b.id && b.activ !== false).length;
  const cad = cadentaPoza({ acum: Date.now(), botiActivi });   // v101.34 (el, 01.10): 08–16 la 3 min, 16–17 la 30 s, 17–23 la 1,5 min, noaptea nimic
  if (!PAZNIC_URL || !PAZNIC_TOKEN || pozaInLucru || cad === null || Date.now() - pozaLa < cad) return;
  pozaInLucru = true; pozaLa = Date.now();
  try {
    let t212Eroare = null;
    const [t212, boti, simboluri, radarUrl] = await Promise.all([
      pozitiiPentruPoza().then((l) => { ultimeleT212 = { lista: l, la: Date.now() }; return l; }).catch((e) => { t212Eroare = e.message; jurnal("poza: t212", e.message); return ultimeleT212.lista; }),
      botiPentruPoza(), simboluriPentruPoza().catch((e) => { jurnal("poza: simboluri", e.message); return []; }), adresaRadarului()]);
    // v101.2 (ideea 4 „câte bucăți”): la simbolurile urmarite in $ cu intrare sugerata - ActiuniSemnale.marime (1 % risc din contul T212,
    // plafon 20 %), cursul $/leu din pozitii; in € nu avem cursul euro din pozitii -> nimic, nu cifre inventate
    const fx = fxDinPozitii(t212);
    for (const s of simboluri) { const n = s.niveluri; if (n && n.nivel === "ok" && n.intrare && s.moneda === "$" && contT212 && fx) { try { s.marime = ActiuniSemnale.marime({ intrare: n.intrare.pret, stop: n.stop, cont: contT212, fx }); } catch (e) { jurnal("poza: marime", s.s, e.message); } } }
    const poza = construiestePoza({ acum: Date.now(), versiune: VERSIUNE_COLECTOR, pid: process.pid, tura: turaNr, radarUrl, t212, t212La: ultimeleT212.la, t212Eroare, boti, simboluri }), text = JSON.stringify(poza);
    const r = await fetch(PAZNIC_URL.replace(/\/+$/, "") + "/poza", { method: "POST", headers: { authorization: "Bearer " + PAZNIC_TOKEN, "content-type": "application/json" }, body: text, signal: AbortSignal.timeout(20000) });
    if (!r.ok) jurnal("poza: refuzata", r.status, (await r.text()).slice(0, 120));
    else { pozaOkLa = Date.now(); jurnal("poza: urcata", Math.round(text.length / 1024) + " KB", cate(t212.length, "poziție", "poziții"), cate(boti.length, "bot", "boți"), cate(simboluri.length, "simbol", "simboluri"), radarUrl ? "tunel" : ""); }
    // I-463: alertele pe simbolurile paginii (miscare > 2x ATR propriu, cumparare noua de insider) - o data pe zi per simbol
    const m = meta(), st = m.simAlerte || (m.simAlerte = {}), prag = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    for (const k of Object.keys(st)) if (k.slice(-10) < prag) delete st[k];
    // v101.1 (el, 28.09: „alerte discord fă”): + SL/TP (aproape de stop, SL/TP sugerat atins fara plan, intrarea sugerata atinsa)
    for (const a of alerteSimboluri(poza.simboluri, ultimeleSimboluri, Date.now()).concat(alerteSLTP(poza, Date.now()))) {
      if (st[a.cheie]) continue;
      if (await trimiteAlerta({ nivel: a.nivel, titlu: a.titlu, mesaj: a.mesaj }, null, a.cheie.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 60))) st[a.cheie] = true;
    }
    // v101.67 (el, 05.10: „±1% la ce dețin”, A): pozitiile T212 - fiecare treapta noua de 1% fata de ieri, o data; saltul marcheaza si treptele de sub el
    for (const a of alerteT212Pasi(poza, st, Date.now())) {
      if (await trimiteAlerta({ nivel: a.nivel, titlu: a.titlu, mesaj: a.mesaj }, null, a.cheie.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 60))) for (const k of a.marcheaza) st[k] = true;
    }
    if (poza.simboluri.length) { ultimeleSimboluri = {}; for (const s of poza.simboluri) ultimeleSimboluri[s.s] = s; }
    try { scrieStare(); } catch {}
  } catch (e) { jurnal("poza: n-a plecat", e.message); pozaLa = Date.now() - 4 * 60000; }
  pozaInLucru = false;
}

function turaCopie() {
  try { const r = faCopie({ sursa: path.join(RAD, ".wrangler", "state", "v3", "kv"), dest: path.join(DATA, "copii"), zi: new Date().toISOString().slice(0, 10), pastreaza: 14 }); if (r.facut) jurnal("copie de siguranta: " + r.tinta); }
  catch (e) { jurnal("copie de siguranta ESEC", e.message); }
  // v100.40 (audit 30.09): si pe ALT disc (E:, discul de copii al PC-ului) - arhiva celor ~2.200 de boti, planurile si alertele
  // stateau doar pe C:; un disc mort le lua pe toate. Lipsa discului E: nu opreste nimic (doar jurnal).
  const DEST_E = process.env.COLECTOR_COPIE_E || "E:/crypto-radar-backup/kv-copii";
  try { if (fs.existsSync(path.parse(DEST_E).root)) { const r2 = faCopie({ sursa: path.join(RAD, ".wrangler", "state", "v3", "kv"), dest: DEST_E, zi: new Date().toISOString().slice(0, 10), pastreaza: 30 }); if (r2.facut) jurnal("copie de siguranta pe alt disc: " + r2.tinta); } }
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
    const bareIdei = new Map(), randuriIdei = new Map();   // v101.64 (L2): barele aduse pentru idei, refolosite la cifrele 🧠/🌳; v101.65 (ideea 2): și rândurile brute, scrise în data/retea/zile
    const r = await turaIdeiModul({ tickere, inchise, Idei, Reveniri, Probabilitati, ProfilMoneda, jurnal, simbol: (tk) => T212.simbol(tk), acum: Date.now(), pauza: (ms) => new Promise((rs) => setTimeout(rs, ms)),
      // v93: bareToate - la 8 dimineata ultima zi de bursa e INCHISA (bare() o arunca: ideile erau cu o zi in urma)
      cereBare: async (tk) => { const rd = (await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk))).randuri || []; randuriIdei.set(tk, rd); const b = GridCalcul.bareToate(rd); bareIdei.set(tk, b); return b; },
      ndx: new Set(NDX), rezumat: Acasa.rezumatActiune,
      cereRezultate: async (tk) => { const d = await cere("/api/t212?action=rezultate&ticker=" + encodeURIComponent(tk)); return d && d.data || null; } });
    const urm = Idei.urmarire(id && Array.isArray(id.istoric) ? id.istoric : [], r.preturi, Date.now());
    // v101.58 (reveniri): urmărirea acțiunilor pe revenire - pe ticker, de la 14 zile calendaristice (~10 de bursă), după comisionul de conversie
    const urmRev = Reveniri.urmarire(id && Array.isArray(id.istoricReveniri) ? id.istoricReveniri : [], r.preturi, Date.now(), { zile: 14, cost: 0.003, cheie: "ticker" });
    // v101.64 (L2): a doua (🧠) și a treia părere (🌳) pe idei - „un trade ca ăsta iese pe plus”, cu modelele de pe disc, pe barele aduse deja; fără modele T212 nimic
    try {
      const mR = modeleRetea(), mA = modeleArbori();
      if (mR || mA) {
        let qqq = bareIdei.get("QQQ_US_EQ") || null; if (!qqq) { try { qqq = GridCalcul.bareToate((await cere("/api/t212?action=preturi&interval=1d&ticker=QQQ_US_EQ")).randuri || []); } catch {} }
        const cif = (x) => { const b = x && bareIdei.get(x.ticker); if (!b || !qqq) return; const t = { ticker: x.ticker, pornit: Date.now(), cost: Retea.costTipic(inchise) };   /* revizia (🟡5): mărimea lui tipică, nu 100 de lei */
          const pz = mR ? Retea.pentruCumparare(mR, t, b, qqq, inchise) : null; if (pz) { const vd = Retea.verdict(mR["rezultat-t212"], Date.now()); x.retea = { p: pz.p, dovedita: !!(vd && vd.dovedita) }; }
          const pa = mA ? Arbori.pentruCumparare(mA, t, b, qqq, inchise) : null; if (pa) { const va = Arbori.verdict(mA["rezultat-t212"], Date.now()); x.arbori = { p: pa.p, dovedita: !!(va && va.dovedita) }; } };
        for (const x of [].concat(r.actiuni || [], r.restul || [])) cif(x);
      }
    } catch (e) { jurnal("idei: a doua părere", e.message); }
    await trimite("/api/t212?action=idei", { la: Date.now(), zi, actiuni: r.actiuni, restul: r.restul, reveniri: r.reveniri, dovadaReveniri: r.dovadaReveniri, urmarireReveniri: urmRev, judecate: r.judecate, trecute: r.trecute, urmarire: urm, ndx: r.ndx });
    m.ideiZi = zi;
    // v101.65 (ideea 2): universul zilnic întreg - barele aduse oricum pentru idei (Nasdaq-100 + ale lui, 2 ani) intră în data/retea/zile,
    // unite peste cele vechi; rotația de noapte (după vechimea fișierului) trece singură la ceilalți. După idei: o eroare aici nu lasă ziua fără ele
    try { let nz = 0; for (const [tk, rd] of randuriIdei) if (scrieZileTicker(tk, randuriInchise(rd, Date.now(), GridCalcul))) nz++;   /* v101.66 (revizia 🔵11): fără bara în curs */ jurnal("idei: bare zilnice scrise pentru rețea:", cate(nz, "ticker", "tickere"), "din", randuriIdei.size); } catch (e) { jurnal("idei: barele zilnice", e.message); }
  } catch (e) { jurnal("idei ESEC", e.message); }
  ideiInLucru = false;
}

// v89: rezumatul de dimineata - o data pe zi, dupa 9:00 ora Romaniei (Radar + Discord)
let dimineataInLucru = false;
async function dateDimineata() {
  const out = { deIesit: [], rezultate: [], plafon: [], stiri: [], boti: [] }, becuriBoti = [], becuriT212 = [];   // v101.75 (I-552)
  let t212Citit = false;   // v101.62 (revizia Opus): „de ieșit” se spune doar cu pozițiile T212 citite - altfel „nimic de ieșit” ar fi inventat
  // v92: barele zilnice de bursa CU ultima zi (bare() o scotea - "ultima zi" arata ziua de dinainte)
  try { const pz = await cere("/api/stiri?action=piata"); const zi = (r) => (Array.isArray(r) && r.length ? GridCalcul.bareToate(r) : null); out.piata = Consilier.piata({ qqq: zi(pz.qqq), spy: zi(pz.spy), vix: zi(pz.vix), fg: pz.fg }); } catch (e) { jurnal("dimineata piata", e.message); }
  const v = citesteVarsSigur();
  if (v.T212_API_KEY && v.T212_API_SECRET) {
    try {
      const c = await cere("/api/t212?action=cont"), pz = await cere("/api/t212?action=pozitii"), h = await cere("/api/t212?action=istoric");
      const poz = (pz && pz.pozitii || []).filter((x) => x && x.quantity > 0), des = T212.perechi((h && h.umpleri) || []).deschise, cash = c && c.cash || {};
      t212Citit = true;
      let usd = 0; poz.forEach((x) => { usd += x.quantity * x.currentPrice; });
      const inv = cash.total > 0 && cash.free >= 0 ? cash.total - cash.free : null;
      const zi = new Date().toISOString().slice(0, 10), intrari = [], barePe = {};
      for (const x of poz) {
        const s = T212.simbol(x.ticker);
        try {
          const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.ticker)), bare = GridCalcul.bareBursa(d && d.randuri || [], Date.now()), st = ActiuniSemnale.stare(bare, x.currentPrice);
          barePe[x.ticker] = bare;
          // v101.75 (I-552): becurile poziției pentru dimineață - 1z doar pe listările din SUA (ca I-546 / I-547), 4 h din prețurile de 4 h
          let h4 = null; try { const r4 = await cere("/api/t212?action=preturi&interval=4h&ticker=" + encodeURIComponent(x.ticker)), b4 = GraficBot.semafor({ "4H": r4 && r4.randuri || [] }, "long", { actiune: true, acum: Date.now() }).find((y) => y.tf === "4H"); h4 = b4 && b4.dir || null; } catch {}
          let z1 = null; try { z1 = /_US_EQ$/.test(x.ticker) && bare.length ? (GraficBot.semZi(barePe[x.ticker], "long") || {}).dir || null : null; } catch {}
          becuriT212.push({ cheie: "t212-" + x.ticker, nume: s, dir: "long", h4, z1, faraZ1: !/_US_EQ$/.test(x.ticker) });
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
  // v91: linkul spre Radar de pe telefon, doar daca raspunde; v101.6: acelasi drum ca poza (Tailscale fix, apoi tunelul)
  try { const u = await adresaRadarului(); if (u) out.link = u; } catch {}
  try { const id = await cere("/api/t212?action=idei"); out.idei = (id && id.idei && Array.isArray(id.idei.actiuni) ? id.idei.actiuni : []).slice(0, 5).map((x) => x.simbol);
    out.reveniriN = id && id.idei && Array.isArray(id.idei.reveniri) ? id.idei.reveniri.length : null; out.reveniriEt = id && id.idei && id.idei.dovadaReveniri && id.idei.dovadaReveniri.eticheta || null; } catch {}   // v101.62 (I-526)
  try { const cl = await cere("/api/istoric-bot?action=clasament"); out.ideiBoti = Idei.ideiBoti(cl && cl.clasament, [], 3).map((x) => x.moneda); } catch {}
  let lBoti = [], liniaVeche = "";
  try {
    const bo = await cere("/api/bot-orders"), boti = bo && bo.bots || [], acum = Date.now();
    out.boti = boti.filter((b) => b.activ && Number.isFinite(Number(b.distantaLichidarePct)) && Math.abs(Number(b.distantaLichidarePct)) < 15).map((b) => ({ nume: String(b.baza || "").replace(/\.PERP$/, ""), lich: Math.abs(Number(b.distantaLichidarePct)) }));
    // v101.60 (I-513): Busola pe boții deschiși, pe scurt (starea și „de când” le ține colectorul în alerte-stare); v101.61 (ideea 4): „🧭”,
    // vârsta rezumatului când e vechi (> 4,5 h), lungimea rezervată prefixului și cozii (raportul ține 160), aceeași cerere bot-orders
    let laMax = 0;
    const l = boti.filter((b) => b && b.id && b.activ !== false).map((b) => { const s = stareAlerte[b.id] && stareAlerte[b.id]._busola; if (s && Number(s.la) > laMax) laMax = Number(s.la); return { nume: String(b.baza || "").replace(/\.PERP$/, ""), stare: s ? s.stare : null, de: s ? s.de : null }; });
    const sufix = laMax > 0 && acum - laMax > Busola.PAZA_VECHI_MS ? " (rezumat de acum " + TextRo.ore(acum - laMax) + ")" : "";
    const t = Busola.liniaBoti(l, acum, 142 - sufix.length); out.liniiExtra = t ? ["🧭 Busola, pe 4h: " + t + sufix] : [];
    lBoti = l; liniaVeche = sufix;
    // v101.75 (I-552): becurile 4 h / 1 zi ale boților deschiși - aceeași regulă ca Tabloul (directiaBotului, ținută 5 min)
    for (const b of boti.filter((y) => y && y.id && y.activ !== false)) {
      try { const dr = await directiaBotului(b), dirTf = (tf) => { const r = (dr && dr.rez || []).find((y) => y.tf === tf); return r && r.dir || null; };
        becuriBoti.push({ cheie: "bot-" + b.id, nume: String(b.baza || "").replace(/\.PERP$/, ""), dir: String(b.directie || "").toLowerCase(), h4: dirTf("4H"), z1: dirTf("1D") }); } catch (e) { jurnal("dimineata becuri", b.id, e.message); }
    }
  } catch {}
  // v101.62 (I-526): rândul-verdict din capul rezumatului - din aceleași date (boții pe agitație/calm, bilanțul pazei, acțiunile pe revenire, de ieșit).
  // Revizia Opus: în afara try-ului bot-orders (revenirile și „de ieșit” sunt știute și când Pionex pică); boții DOAR din rezumat proaspăt
  // (rezumatul vechi ⇒ fără partea cu boții, nu „Azi: 1 bot pe agitație” de acum 10 h); „de ieșit” doar cu T212 citit
  const rz = Busola.rezumat(), tz = titluDimineata({ boti: liniaVeche ? [] : lBoti, bilant: rz && rz.perp && rz.perp.bilant ? rz.perp.bilant.verdict : null, reveniri: out.reveniriN, eticheta: out.reveniriEt, deIesit: t212Citit ? out.deIesit.length : null });
  out.liniiIntai = tz ? [tz] : [];
  // v101.75 (I-552): rândul becurilor (boții întâi, apoi pozițiile T212) + ce s-a schimbat față de rezumatul de ieri
  try { const becuri = becuriBoti.concat(becuriT212), ieri = meta().becuriIeri, lb = liniiBecuri(becuri, ieri && ieri.b || null, etichetaIeri(ieri && ieri.data, Date.now())); out.liniiBecuri = lb.linii; out.becuriAzi = lb.azi; } catch (e) { jurnal("dimineata becuri", e.message); }
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
    const trades = JurnalTrade.din(await botiInchisiToti());   // v100.40: toata saptamana, nu ultimii 10
    let soc = {};
    if (socotealaUltima) soc = socotealaUltima;   // v100.43: pe toti botii (turaSocoteala), nu doar pe cei cunoscuti acum
    else for (const id of Object.keys(m.cunoscuti || {})) {
      try { const v = await cere("/api/istoric-bot?action=semnale&bot=" + encodeURIComponent(id)); const s = SemnaleBot.socoteala((v && v.semnale && v.semnale.log) || []); for (const k of Object.keys(s)) { const x = soc[k] || (soc[k] = { judecate: 0, corecte: 0 }); x.judecate += s[k].judecate; x.corecte += s[k].corecte; } } catch (e) {}
    }
    let lab = null; try { const v = await cere("/api/istoric-bot?action=laborator"); lab = v && v.laborator; } catch (e) {}
    const rap = Obiceiuri.raportDuminica({ trades, acum, socoteala: soc, laborator: lab, autopsie: Obiceiuri.autopsie(socotealaLoguri, acum) });   // v101.30 (I-478)
    // revizia 01.10 (I3): dupa o repornire, jurnalele Consilierului pe actiuni se citesc INAINTE de raport (altfel autopsia ar fi zis „niciun sfat greșit”)
    if (socActZi === null) await turaSocotealaActiuni();
    let autAct = null;
    // v85: si actiunile (Trading 212), din istoricul strans acasa
    try { const h = await cere("/api/t212?action=istoric"); if (h && Array.isArray(h.umpleri) && h.umpleri.length) rap.linii = rap.linii.concat(ActiuniSemnale.raportSaptamana(T212.perechi(h.umpleri).inchise, acum)); autAct = Consiliu.autopsieActiuni(jurnaleActLoguri, acum);   /* v101.36; revizia 01.10 (I5): pe Discord separat - limita de 2000 de caractere */ } catch (e) { jurnal("raport t212", e.message); }
    await trimite("/api/istoric-bot?action=raport", { la: acum, linii: autAct ? rap.linii.concat(autAct.linii) : rap.linii, saptamana: r.data });
    if (await trimiteAlerta(MesajeColector.raport(r.data, rap.linii), null, "raport")) {
      m.raportTrimis = r.data;
      if (autAct) await trimiteAlerta(MesajeColector.autopsie(r.data, autAct.linii), null, "raport-actiuni");
    }
  } catch (e) { jurnal("raport ESEC", e.message); }
}

jurnal("pornit, PID " + process.pid + ", server " + BAZA + ", canal alerte: " + CANAL + (NTFY.topic ? " (" + NTFY.topic + (NTFY.nou ? ", NOU" : "") + ")" : ""));
if (NTFY.nou) await ntfy(MesajeColector.legat());
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
    try { scrieStare(); } catch {}
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
    try { scrieStare(); } catch {}
  } catch (e) { jurnal("scan ESEC", e.message); }
  scanInLucru = false;
}

// v100.40: rezumatul perechilor incheiate, o data pe ora pe bot (Discord); fiecare pereche ramane in Radar
async function turaPerechiOra() {
  const po = meta().perechiOra; if (!po) return;
  for (const id of Object.keys(po)) {
    const x = po[id]; if (!x || Date.now() - x.de < 3600000) continue;
    if (await trimiteAlerta(MesajeColector.perechiOra(x.nume, x.n, x.usdt), id, "perechi-ora")) delete po[id];
  }
  scrieStare();
}

// v100.43 (I-466, el: „judecata la închidere sau la 24 h”): la inchiderea unui bot, semnalele lui inca nejudecate se judeca pe
// rezultatul final (net = realizat + comisioane + funding; acelasi temei ca totalul notat la semnal: echitate − investit)
async function judecaLaInchidere(id, x) {
  try {
    const v = await cere("/api/istoric-bot?action=semnale&bot=" + encodeURIComponent(id)), s = v && v.semnale, log = s && Array.isArray(s.log) ? s.log : [];
    if (!log.length || !log.some((e) => e.dreptate === null || e.dreptate === undefined)) return;
    const t = JurnalTrade.din([x.brut || x])[0], final = t && t.net !== undefined && t.net !== null ? t.net : Number(x.profitTotal);
    if (!Number.isFinite(final)) return;
    const nou = SemnaleBot.judecaLaInchidere(log, final, Number(x.investit) || (t && t.investit) || 0, Number(x.inchisLa) || (t && t.inchis) || Date.now());
    await trimite("/api/istoric-bot?action=semnale", { bot: id, log: nou, acum: s.acum || null });
  } catch (e) { jurnal("judecata la inchidere", id, e.message); }
}
// I-466: o data pe ora - (a) botii inchisi in ultimele 30 de zile cu semnale inca nejudecate se judeca pe rezultatul lor (arhiva);
// (b) socoteala TUTUROR (inchisi + activi) -> KV „socoteala” (Tablou, raport) si lista sfaturilor TACUTE pentru Discord
let socotealaLa = Date.now() - 3600000 + 3 * 60000, socotealaInLucru = false, socotealaTaci = {}, socotealaUltima = null, socotealaLoguri = [];   // v101.30 (I-478): jurnalele pe moneda, pentru autopsie
async function turaSocoteala() {
  if (socotealaInLucru || Date.now() - socotealaLa < 3600000) return;
  socotealaInLucru = true;
  try {
    const inchisi = (await botiInchisiToti()).filter((x) => Number(x.closeTime) > Date.now() - 30 * 86400000);
    const act = await cere("/api/bot-orders"), activi = (act && Array.isArray(act.bots) ? act.bots : []).map((b) => String(b.id));
    const loguri = [], peMoneda = []; let judecati = 0;
    for (const x of inchisi) {
      const id = String(x.strategyId || x.buOrderId || ""); if (!id) continue;
      await new Promise((r) => setTimeout(r, 700));   // serverul lasa 120 de citiri pe minut (pe 30.09 prima tura a luat RATE_LIMITED)
      const v = await cere("/api/istoric-bot?action=semnale&bot=" + encodeURIComponent(id)), s = v && v.semnale; let log = s && Array.isArray(s.log) ? s.log : [];
      if (!log.length) continue;
      if (log.some((e) => e.dreptate === null || e.dreptate === undefined)) {
        const t = JurnalTrade.din([x])[0];
        if (t && Number.isFinite(t.net)) { const nou = SemnaleBot.judecaLaInchidere(log, t.net, t.investit || 0, t.inchis); if (JSON.stringify(nou) !== JSON.stringify(log)) { await trimite("/api/istoric-bot?action=semnale", { bot: id, log: nou, acum: s.acum || null }); log = nou; judecati++; } }
      }
      loguri.push(log); peMoneda.push({ id, moneda: JurnalTrade.moneda(x.base), log });
    }
    const monedaAct = {}; for (const b of (act && Array.isArray(act.bots) ? act.bots : [])) monedaAct[String(b.id)] = JurnalTrade.moneda(b.baza);
    for (const id of activi) { try { await new Promise((r) => setTimeout(r, 700)); const v = await cere("/api/istoric-bot?action=semnale&bot=" + encodeURIComponent(id)); const l = v && v.semnale && v.semnale.log; if (Array.isArray(l) && l.length) { loguri.push(l); peMoneda.push({ id, moneda: monedaAct[id] || "?", log: l }); } } catch {} }
    socotealaLoguri = peMoneda;
    const peCod = SemnaleBot.socotealaToti(loguri);
    socotealaTaci = SemnaleBot.tacute(peCod); socotealaUltima = peCod;
    await trimite("/api/istoric-bot?action=socoteala", { la: Date.now(), boti: loguri.length, peCod });
    jurnal("socoteala:", cate(loguri.length, "bot", "boți") + ",", cate(Object.keys(peCod).length, "sfat", "sfaturi") + ",", cate(judecati, "judecată", "judecăți"), "la inchidere, tacute:", Object.keys(socotealaTaci).join(",") || "niciunul");
    socotealaLa = Date.now();
  } catch (e) { jurnal("socoteala ESEC", e.message); socotealaLa = Date.now() - 3600000 + 10 * 60000; }
  socotealaInLucru = false;
}
// v100.43 (I-468): frana contului - la 5 minute; peste prag, o alerta critica O DATA pe zi (ziua Romaniei). Pragurile din configurare.
let franaLa = 0;
async function turaFrana() {
  if (Date.now() - franaLa < 5 * 60000) return;
  franaLa = Date.now();
  const cfg = await cere("/api/istoric-bot?action=config").catch(() => null), praguri = cfg && cfg.config && cfg.config.frana || null;
  const trades = JurnalTrade.din((await botiInchisiToti()).filter((x) => Number(x.closeTime) > Date.now() - 8 * 86400000));
  const act = await cere("/api/bot-orders"), f = Obiceiuri.frana({ trades, deschise: act && act.bots || [], acum: Date.now(), praguri });
  const m = meta(), zi = new Date(Obiceiuri.inceputZiRo(Date.now()) + 12 * 3600000).toISOString().slice(0, 10);
  if (f.activa && m.franaZi !== zi) {
    if (await trimiteAlerta(MesajeColector.frana(f), null, "frana")) { m.franaZi = zi; scrieStare(); }
  }
}

// v101.26 (pachetul 1): profilul monedei - barele de 1 h pe disc (data/istoric-1h), profilul in KV; profileMoneda il tin si aici
// (mutaGridul din tura il cere). Monedele: botii activi + inchisii din ultimele 60 de zile.
const ORE_DIR = path.join(DATA, "istoric-1h"); fs.mkdirSync(ORE_DIR, { recursive: true });
const PROFIL_STARE = path.join(DATA, "profil-stare.json");
let profilStare = {}; try { profilStare = JSON.parse(fs.readFileSync(PROFIL_STARE, "utf8")) || {}; } catch { profilStare = {}; }
const profileMoneda = new Map();
// revizia 01.10: la pornire, profilele de ieri (din profil-stare.json) - primele ture nu mai cad pe pragul fix
for (const [s, f] of Object.entries(profilStare.facute || {})) if (f && f.profil) profileMoneda.set(s, f.profil);
const fisOre = (s) => path.join(ORE_DIR, String(s).replace(/[^A-Z0-9_]/gi, "") + ".json");
async function simboluriProfil() {
  const act = await cere("/api/bot-orders"), m = new Map();
  for (const b of (act && act.bots) || []) { const s = TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex; if (s && /_PERP$/.test(s)) m.set(s, JurnalTrade.moneda(b.baza)); }
  for (const x of (await botiInchisiToti()).filter((x) => Number(x.closeTime) > Date.now() - 60 * 86400000)) {
    const mo = JurnalTrade.moneda(x.base), s = await simbolPerp(mo); if (s && !m.has(s)) m.set(s, mo);
  }
  return [...m].map(([simbol, moneda]) => ({ simbol, moneda }));
}
// v101.33 (actiunile T212, pachetul 3): socoteala Consilierului pe actiuni - o data pe zi (ora Romaniei): jurnalele tickerelor, judecate la 5
// zile de bursa pe barele zilnice, scrise inapoi, adunate pe motiv si lei -> KV socoteala-actiuni (Consilierul ordoneaza motivele dupa ea)
let socActZi = null, socActInLucru = false, socotealaAct = null;
let jurnaleActLoguri = [];   // v101.36: jurnalele Consilierului pe actiuni, pentru autopsia din raportul de duminica
async function turaSocotealaActiuni() {
  const zi = saptamanaRo(Date.now()).data;
  if (process.env.COLECTOR_FARA_T212 || socActInLucru || socActZi === zi) return;
  socActInLucru = true;
  try {
    const l = await cere("/api/istoric-bot?action=semneActLista"), jurnale = [], logActNou = [];
    for (const tk of (l && l.tickere) || []) {
      await new Promise((r) => setTimeout(r, 700));
      const v = await cere("/api/istoric-bot?action=semneAct&bot=" + encodeURIComponent(tk)).catch(() => null); let j = v && Array.isArray(v.log) ? v.log : [];
      if (j.some((e) => e && e.r !== 0 && e.r !== 1)) {
        try { const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk)), nou = Consiliu.judecaActiune(j, GridCalcul.bareBursa(d && d.randuri || [], Date.now()), Date.now());
          if (JSON.stringify(nou) !== JSON.stringify(j)) { await trimite("/api/istoric-bot?action=semneAct", { bot: tk, log: nou }); j = nou; if (tk in jurnaleAct) jurnaleAct[tk] = nou; } } catch (e) { jurnal("socoteala actiuni", tk, e.message); }   // memoria pozei ia judecatile (altfel urmatoarea notare le-ar suprascrie)
      }
      jurnale.push(j); logActNou.push({ ticker: tk, log: j });
    }
    socotealaAct = Consiliu.socotealaActiuni(jurnale); jurnaleActLoguri = logActNou;
    await trimite("/api/istoric-bot?action=socotealaAct", { la: Date.now(), peCod: socotealaAct });
    socActZi = zi; jurnal("socoteala actiuni:", cate(jurnale.length, "ticker", "tickere") + ",", cate(Object.keys(socotealaAct).length, "motiv", "motive"));
  } catch (e) { jurnal("socoteala actiuni ESEC", e.message); }
  socActInLucru = false;
}
// v101.31 (actiunile T212, pachetul 1): profilul actiunii - noaptea (23:00-07:00 ora Romaniei, dupa inchiderea bursei SUA), o data pe zi pe
// ticker, doar pozitiile deschise + actiunile din idei (Yahoo limiteaza cererile); 2 ani de bare zilnice -> KV profil:<TICKER>
let profilActInLucru = false, profilActLa = 0;
async function turaProfilActiuni() {
  if (process.env.COLECTOR_FARA_T212 || profilActInLucru || Date.now() - profilActLa < 30 * 60000) return;
  const r = saptamanaRo(Date.now()); if (!(r.ora >= 23 || r.ora < 7)) return;
  profilActInLucru = true; profilActLa = Date.now();
  try {
    const tk = new Set();
    try { const p = await cere("/api/t212?action=pozitii"); for (const x of (p && p.pozitii) || []) if (x && x.ticker) tk.add(String(x.ticker)); } catch (e) { jurnal("profil actiuni: pozitii", e.message); }
    try { const i = await cere("/api/t212?action=idei"); for (const x of (i && i.idei && Array.isArray(i.idei.actiuni) ? i.idei.actiuni : [])) if (x && x.ticker) tk.add(String(x.ticker)); } catch (e) { jurnal("profil actiuni: idei", e.message); }
    const st = profilStare.actiuni || (profilStare.actiuni = {});
    let facute = 0;
    for (const t of tk) {
      if (st[t] === r.data) continue;
      await new Promise((rs) => setTimeout(rs, 1200));
      try {
        const d = await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(t));
        const p = ProfilMoneda.calculeaza(GridCalcul.bareBursa(d && d.randuri || [], Date.now()), { piata: "actiuni", simbol: t, acum: Date.now() });
        if (p) { await trimite("/api/istoric-bot?action=profil", { simbol: t, profil: p }); facute++; }
        st[t] = r.data;
      } catch (e) { jurnal("profil actiuni", t, e.status === 404 ? "fara preturi (404)" : e.message); if (e.status === 404) st[t] = r.data; }
    }
    try { scrieAtomic(PROFIL_STARE, profilStare); } catch (e) { jurnal("profil-stare nescris", e.message); }
    if (facute) jurnal("profil actiuni:", facute, "din", tk.size);
  } catch (e) { jurnal("profil actiuni ESEC", e.message); }
  profilActInLucru = false;
}
let profilInLucru = false, profilLa = 0;
async function turaProfil() {
  if (profilInLucru || Date.now() - profilLa < 10 * 60000) return;
  profilInLucru = true; profilLa = Date.now();
  try {
    await turaProfilModul({ GridCalcul, ProfilMoneda, acum: Date.now(), cere, trimite, jurnal, profile: profileMoneda, stare: profilStare,
      pauza: (ms) => new Promise((r) => setTimeout(r, ms)), simboluri: simboluriProfil,
      trades: async () => JurnalTrade.din(await botiInchisiToti()),
      citesteBare: (s) => { try { return JSON.parse(fs.readFileSync(fisOre(s), "utf8")); } catch { return []; } },
      scrieBare: (s, r) => { try { scrieAtomic(fisOre(s), r); } catch (e) { jurnal("bare 1h nescrise", s, e.message); } },
      // v101.28 (pachetul 2b): barele si in KV (ore:<SIMBOL>), compacte, pentru probabilitatile din fisa Grid
      trimiteOre: (s, r) => trimite("/api/istoric-bot?action=ore", { simbol: s, b: GridCalcul.bare(r).map((x) => [x.t, +x.o.toPrecision(6), +x.h.toPrecision(6), +x.l.toPrecision(6), +x.c.toPrecision(6)]) }),
      scrieStare: (st) => { try { scrieAtomic(PROFIL_STARE, st); } catch (e) { jurnal("profil-stare nescris", e.message); } } });
  } catch (e) { jurnal("profil ESEC", e.message); }
  profilInLucru = false;
}
// v101.27 (pachetul 2a): probabilitatile botilor activi, o data pe ora pe bot; jurnalul pe disc, calibrarea in KV
const PROB_FIS = path.join(DATA, "prob-jurnal.json");
let probStare = {}; try { probStare = JSON.parse(fs.readFileSync(PROB_FIS, "utf8")) || {}; } catch { probStare = {}; }
let probInLucru = false, probLa = 0;
const reteaUltim = {};   // v101.63 (A3): ultima cifră a rețelei pe bot (ieșirea în jos în 24 h), pentru fișierul Busolei
async function turaProbabilitati() {
  if (probInLucru || Date.now() - probLa < 5 * 60000) return;
  probInLucru = true; probLa = Date.now();
  try {
    const act = await cere("/api/bot-orders");
    const modele = modeleRetea(), mA = modeleArbori(), btc = modele || mA ? await bareBtc() : null;   // v101.56 (rețeaua neuronală); v101.63 (arborii)
    await turaProbabilitatiModul({ acum: Date.now(), boti: ((act && act.bots) || []).filter((b) => b && b.activ !== false), GridCalcul, Probabilitati, Dovada, TabloExtra, cere, trimite, jurnal, stare: probStare, Retea, modele, btc, pornireDe: modele ? pornireDe(modele, btc) : null,
      Arbori, modeleArbori: mA, pornireArboriDe: mA ? pornireArboriDe(mA, btc) : null,
      // revizia 04.10 (🔴1/🟡2): forma §5 din funcția pură (cheiaBusola era un const din scriePentruBusola ⇒ ReferenceError, prins de catch-ul rețelei)
      noteazaRetea: (b, rt) => { const m = modele && modele["atinge-24"], vd = m && Retea.verdict(m, Date.now()); const l = intrariRetea({ Busola, b, rt, dovedita: !!(vd && vd.dovedita), acum: Date.now() }); if (l.length) reteaUltim[b.id] = l; else delete reteaUltim[b.id]; },
      simbolDe: (b) => TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex,
      planDe: async (id) => { try { const p = await cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(id)); return p && p.plan && !p.plan.proba ? p.plan : null; } catch { return null; } },
      citesteBare: (s) => { try { return JSON.parse(fs.readFileSync(fisOre(s), "utf8")); } catch { return []; } },
      scrieBare: (s, r) => { try { scrieAtomic(fisOre(s), r); } catch (e) { jurnal("bare 1h nescrise", s, e.message); } },
      scrieStare: (st) => { try { scrieAtomic(PROB_FIS, st); } catch (e) { jurnal("prob-jurnal nescris", e.message); } },
      pauza: (ms) => new Promise((r) => setTimeout(r, ms)) });
  } catch (e) { jurnal("probabilitati ESEC", e.message); }
  probInLucru = false;
}
// v101.56 (rețeaua neuronală, livrarea 1): antrenorul de noapte (retea/antreneaza.mjs, proces separat), modelele de pe disc pentru 🧠,
// BTC pentru „acum” (pagina nouă din Pionex + depozitul de 400 de zile), rezultatul tău la pornire (o dată pe bot și pe model)
const RETEA_DIR = path.join(DATA, "retea"), RETEA_ORE = path.join(RETEA_DIR, "ore"), RETEA_STARE = path.join(RETEA_DIR, "stare.json"), RETEA_ACUM = path.join(RETEA_DIR, "porneste-acum");
fs.mkdirSync(RETEA_ORE, { recursive: true });
const RETEA_ZILE = path.join(RETEA_DIR, "zile"); fs.mkdirSync(RETEA_ZILE, { recursive: true });   // v101.64 (L2): barele zilnice ale acțiunilor
// v101.65 (ideea 2): barele zilnice ale unui ticker pe disc, unite peste cele vechi (pe „time”, 2 ani) - noaptea (tura rețelei) și dimineața
// (tura ideilor, ~100 de tickere aduse oricum pentru idei); rânduri goale = nimic de scris (un ticker picat nu golește fișierul); true dacă a scris
function scrieZileTicker(tk, randuri) {
  if (!Array.isArray(randuri) || !randuri.length) return false;
  try { const f = path.join(RETEA_ZILE, String(tk).replace(/[^A-Z0-9_.-]/gi, "") + ".json"); scrieAtomic(f, { la: Date.now(), randuri: unesteZile(citesteJson(f, null), randuri) }); return true; }
  catch (e) { jurnal("zile: nescrise", tk, e.message); return false; }
}
let reteaStare = {}; try { reteaStare = JSON.parse(fs.readFileSync(RETEA_STARE, "utf8")) || {}; } catch { reteaStare = {}; }
reteaStare.inLucru = false;
const reteaFis = (s) => path.join(RETEA_ORE, String(s).replace(/[^A-Z0-9_]/gi, "") + ".json");
const citesteJson = (f, impl) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return impl; } };
const peDisc = {};
function dinDisc(f) { try { const m = fs.statSync(f).mtimeMs; if (!peDisc[f] || peDisc[f].m !== m) peDisc[f] = { m, v: JSON.parse(fs.readFileSync(f, "utf8")) }; return peDisc[f].v; } catch { return null; } }
function modeleRetea() { const x = dinDisc(path.join(RETEA_DIR, "modele.json")); return x && x.versiune === Retea.VERSIUNE && x.modele && Object.keys(x.modele).length ? x.modele : null; }
function modeleArbori() { const x = dinDisc(path.join(RETEA_DIR, "modele-arbori.json")); return x && x.versiune === Arbori.VERSIUNE && x.modele && Object.keys(x.modele).length ? x.modele : null; }   // v101.63
let btcViu = { la: 0, b: null };
async function bareBtc() {
  if (btcViu.b && Date.now() - btcViu.la < 50 * 60000) return btcViu.b;
  let viu = []; try { const k = await cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=60M&limit=500"); viu = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : []; } catch {}
  btcViu = { la: Date.now(), b: GridCalcul.bare(viu.concat(citesteJson(reteaFis("BTC_USDT_PERP"), []))) };   // pagina vie întâi: bara ei închisă bate bara în curs din depozit
  return btcViu.b;
}
// revizia finală (I7): rezultatul „la pornire” se socotește doar cu un model antrenat ÎNAINTE de pornire și rămâne înghețat pe bot (modelele
// de mai târziu au văzut ce a urmat); (C1) cu suma de PORNIRE (investit), nu cu cea de la închidere
function pornireDe(modele, btc) {
  return (b, bare) => {
    const cache = reteaStare.pornire || (reteaStare.pornire = {}); if (cache[b.id] && typeof cache[b.id].p === "number") return cache[b.id];
    const g = TabloExtra.geometrieBot(b), r = Retea.pentruPornire(modele, { moneda: JurnalTrade.moneda(b.baza), dir: String(b.directie || "").toLowerCase(), levier: b.levier, jos: b.gridJos, sus: b.gridSus, pasNet: g ? g.netPct : null, investit: b.investit, pornit: b.pornitLa }, bare, btc, dinDisc(path.join(RETEA_DIR, "boti.json")) || []);
    if (r) { cache[b.id] = r; try { scrieAtomic(RETEA_STARE, reteaStare); } catch {} }
    return r;
  };
}
// v101.63 (arborii): rezultatul „la pornire” cu arborii - aceeași regulă (doar modelul antrenat ÎNAINTE de pornire, înghețat pe bot)
function pornireArboriDe(modele, btc) {
  return (b, bare) => {
    const cache = reteaStare.pornireArbori || (reteaStare.pornireArbori = {}); if (cache[b.id] && typeof cache[b.id].p === "number") return cache[b.id];
    const g = TabloExtra.geometrieBot(b), r = Arbori.pentruPornire(modele, { moneda: JurnalTrade.moneda(b.baza), dir: String(b.directie || "").toLowerCase(), levier: b.levier, jos: b.gridJos, sus: b.gridSus, pasNet: g ? g.netPct : null, investit: b.investit, pornit: b.pornitLa }, bare, btc, dinDisc(path.join(RETEA_DIR, "boti.json")) || []);
    if (r) { cache[b.id] = r; try { scrieAtomic(RETEA_STARE, reteaStare); } catch {} }
    return r;
  };
}
function pornesteAntrenorul() {
  return new Promise((gata) => {
    const t0 = Date.now(), c = spawn(process.execPath, [path.join(RAD, "retea", "antreneaza.mjs"), "--buget-min", "45"], { cwd: RAD, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    try { os.setPriority(c.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
    const rand = (x) => String(x).split(/\r?\n/).filter(Boolean).forEach((l) => jurnal("retea:", l.slice(0, 300)));
    c.stdout.on("data", rand); c.stderr.on("data", rand);
    const ceas = setTimeout(() => { jurnal("retea: antrenorul oprit după 50 de minute"); try { c.kill(); } catch {} }, 50 * 60000);   /* v101.64 (ideea 2): 45 de minute buget - țintele T212 în plus, iar lunile rejudecate încăpeau greu în 30 */
    c.on("error", (e) => { clearTimeout(ceas); jurnal("retea: antrenorul nu pornește", e.message); gata({ cod: -1, minute: 0 }); });
    c.on("exit", (cod) => { clearTimeout(ceas); gata({ cod: cod === null ? -1 : cod, minute: Math.round((Date.now() - t0) / 60000) }); });
  });
}
// v101.63: antrenorul arborilor (retea/antreneaza-arbori.mjs, JS curat) - proces separat, prioritate scăzută, oprit la 35 de minute, ca al rețelei
function pornesteAntrenorArbori() {
  return new Promise((gata) => {
    const t0 = Date.now(), c = spawn(process.execPath, [path.join(RAD, "retea", "antreneaza-arbori.mjs"), "--buget-min", "30"], { cwd: RAD, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    try { os.setPriority(c.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
    const rand = (x) => String(x).split(/\r?\n/).filter(Boolean).forEach((l) => jurnal("arbori:", l.slice(0, 300)));
    c.stdout.on("data", rand); c.stderr.on("data", rand);
    const ceas = setTimeout(() => { jurnal("arbori: antrenorul oprit după 35 de minute"); try { c.kill(); } catch {} }, 35 * 60000);
    c.on("error", (e) => { clearTimeout(ceas); jurnal("arbori: antrenorul nu pornește", e.message); gata({ cod: -1, minute: 0 }); });
    c.on("exit", (cod) => { clearTimeout(ceas); gata({ cod: cod === null ? -1 : cod, minute: Math.round((Date.now() - t0) / 60000) }); });
  });
}
async function turaReteaColector() {
  const forta = fs.existsSync(RETEA_ACUM); if (forta) { try { fs.unlinkSync(RETEA_ACUM); } catch {} }
  await turaReteaModul({ acum: Date.now(), stare: reteaStare, forta, eNoapte, ziRo: (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t)),
    simboluri: [...new Set(Object.values(simbolPeMoneda()).concat(["BTC_USDT_PERP"]))],
    cereKlines: (s, end) => cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s) + "&interval=60M&limit=500" + (end ? "&endTime=" + end : "")),
    pauza: (ms) => new Promise((r) => setTimeout(r, ms)),
    citesteOre: (s) => citesteJson(reteaFis(s), []).concat(citesteJson(fisOre(s), [])),
    scrieOre: (s, r) => { try { scrieAtomic(reteaFis(s), r); } catch (e) { jurnal("retea: ore nescrise", s, e.message); } },
    boti: async () => { const h = simbolPeMoneda(); return JurnalTrade.din(await botiInchisiToti()).map((t) => ({ id: t.id, moneda: t.moneda, simbol: h[t.moneda] || null, dir: t.dir, levier: t.levier, jos: t.jos, sus: t.sus, pasNet: t.pasNet, pus: t.pus, investit: t.investit, net: t.net, pornit: t.pornit, inchis: t.inchis })); },   // revizia finală (I6): toți boții (rata ta e pe toți)
    scrieBoti: (l) => scrieAtomic(path.join(RETEA_DIR, "boti.json"), l),
    // v101.64 (L2): barele zilnice ale acțiunilor - universul: pozițiile deschise, ideile de azi (și restul, și revenirile), lista lui, acțiunile tranzacționate în ultimii 2 ani; + perechile închise
    tickereZile: async () => {
      const t = new Set();
      try { const p = await cere("/api/t212?action=pozitii"); for (const x of (p && Array.isArray(p.pozitii) ? p.pozitii : [])) if (x && x.ticker) t.add(String(x.ticker)); } catch {}
      try { const i = await cere("/api/t212?action=idei"); const id = i && i.idei; for (const x of [].concat((id && id.actiuni) || [], (id && id.restul) || [], (id && id.reveniri) || [])) if (x && x.ticker) t.add(String(x.ticker)); for (const s of (i && Array.isArray(i.lista) ? i.lista : [])) t.add(String(s).replace(/\./g, "-") + "_US_EQ"); } catch {}
      try { const h = await cere("/api/t212?action=istoric"); const de = Date.now() - 2 * 365 * 864e5; for (const x of T212.perechi((h && h.umpleri) || []).inchise) if (x && x.ticker && x.inchis >= de) t.add(String(x.ticker)); } catch {}
      return [...t].filter((x) => /_US_EQ$/.test(x));
    },
    cereZile: (tk) => cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk)),
    scrieZile: scrieZileTicker,   // v101.65 (ideea 2): aceeași funcție ca în tura ideilor
    vechimeZile: (tk) => { const j = citesteJson(path.join(RETEA_ZILE, String(tk).replace(/[^A-Z0-9_.-]/gi, "") + ".json"), null); return (j && Number(j.la)) || 0; },   // revizia (🟡3): rotația tickerelor
    tradeuri: async () => { const h = await cere("/api/t212?action=istoric"); return T212.perechi((h && h.umpleri) || []).inchise; },
    scrieTradeuri: (l) => scrieAtomic(path.join(RETEA_DIR, "trade-uri.json"), l),
    porneste: pornesteAntrenorul, citesteModele: () => citesteJson(path.join(RETEA_DIR, "modele.json"), null), trimite, jurnal,
    pornesteArbori: pornesteAntrenorArbori, citesteModeleArbori: () => citesteJson(path.join(RETEA_DIR, "modele-arbori.json"), null),   // v101.63
    scrieStare: (st) => { try { scrieAtomic(RETEA_STARE, st); } catch {} } });
}
// v101.58 (reveniri + short, 03.10): o dată pe zi, de la 8:00 ora României - istoricul listelor de monede (depozitul de 1 h + boții lui)
// și urmărirea lor; starea (ziua făcută) în data/sugestii-stare.json
const SUG_STARE = path.join(DATA, "sugestii-stare.json");
let sugStare = {}; try { sugStare = JSON.parse(fs.readFileSync(SUG_STARE, "utf8")) || {}; } catch { sugStare = {}; }
let sugInLucru = false;
async function turaSugestiiColector() {
  if (sugInLucru) return;
  sugInLucru = true;
  try {
    const z = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const g = (k) => (z.find((x) => x.type === k) || {}).value;
    await turaSugestiiModul({ acum: Date.now(), zi: g("year") + "-" + g("month") + "-" + g("day"), ora: Number(g("hour")), stare: sugStare, Reveniri, Idei, G: GridCalcul,
      simboluriDepozit: () => { try { return [...new Set(fs.readdirSync(RETEA_ORE).concat(fs.readdirSync(ORE_DIR)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")))].filter((s) => s !== "BTC_USDT_PERP"); } catch { return []; } },
      bare1h: (s) => { const m = new Map(); for (const r of citesteJson(reteaFis(s), []).concat(citesteJson(fisOre(s), []))) { const t = Number(r && r.time); if (Number.isFinite(t)) m.set(t, { t, o: +r.open, h: +r.high, l: +r.low, c: +r.close }); } return [...m.values()].sort((a, b) => a.t - b.t); },
      boti: async () => citesteJson(path.join(RETEA_DIR, "boti.json"), []), cere, trimite, jurnal, scrieStare: (st) => { try { scrieAtomic(SUG_STARE, st); } catch {} } });
  } catch (e) { jurnal("sugestii ESEC", e.message); }
  sugInLucru = false;
}
// v101.28 (I-469): cazurile din arhiva (ce se stia la pornire + cum s-a terminat) -> KV cazuri, o data pe zi (ziua Romaniei).
// Starea de la pornire din barele de 1 h de pe disc (doar monedele cu profil; LIT->LIGHTER si alti tickeri redenumiti raman fara stare).
// moneda -> simbolul Pionex, din profilurile facute (v101.30: comun cazurilor si perechilor)
function simbolPeMoneda() {
  const harta = {};
  for (const s of Object.keys(profilStare.facute || {})) harta[JurnalTrade.moneda(s.replace(/_USDT_PERP$/, ""))] = s;
  // perechea reala simbol -> moneda din lista profilului (LIT_USDT_PERP = LIGHTER, PUMP = PUMPFUN) bate numele fisierului
  for (const x of (profilStare.lista && profilStare.lista.v) || []) if (x && x.simbol && x.moneda) harta[x.moneda] = x.simbol;
  return harta;
}
// v101.30 (I-477): perechile reale vs estimarea fisei - o data pe ora: fiecare bot activ fara estimare (15M de dinaintea pornirii), cel mult 15
// boti inchisi din ultimele 24 de zile (au 7 zile de 15M inainte de pornire in cele ~31 aduse), apoi factorul pe moneda din botii inchisi
// tinuti cel putin 6 h -> KV perechi-est (pe bot) si perechi-corectie (pe moneda, de la 10 boti)
let perechiLa = 0, perechiInLucru = false, perechiEst = null, perechiCor = {};
async function turaPerechi() {
  if (perechiInLucru || Date.now() - perechiLa < 3600000) return;
  perechiInLucru = true; perechiLa = Date.now();
  try {
    // revizia 01.10 (I2): o citire picata NU porneste de la {} - altfel primul POST ar sterge estimarile adunate in saptamani
    if (!perechiEst) { const v = await cere("/api/istoric-bot?action=perechiEst"); if (!v || !v.est || typeof v.est !== "object") throw new Error("perechi-est necitit - nu pornesc de la zero"); perechiEst = v.est; }
    let noi = 0;
    const estDe = async (id, simbol, o) => { const e = Perechi.estimare(GridCalcul.bare(await lumanari15M(simbol)), o); perechiEst[id] = { simbol, peZi: e.peZi ?? null, zile: e.zile ?? null, eroare: e.eroare || null, la: Date.now(), pornit: Number(o.pornit) || null }; noi++; };
    const act = await cere("/api/bot-orders");
    for (const b of (act && act.bots) || []) {
      if (perechiEst[b.id]) continue;
      const x = (b.brut && b.brut.buOrderData) || {};
      try { await estDe(String(b.id), TabloBot.simboluri(b.baza, b.quote, b.simbolPionex).pionex, { pornit: Number(b.pornitLa), jos: Number(x.bottom ?? b.gridJos), sus: Number(x.top ?? b.gridSus), linii: Number(x.row), dir: String(b.directie || "").toLowerCase(), levier: Number(b.levier) || 1, pretPornire: Number(x.initPrice) }); }
      catch (e) { jurnal("perechi", b.id, e.message); }
    }
    // constatarea de pe viu: arhiva botilor inchisi n-are numarul de perechi -> il notam la fiecare vedere a botului activ; la inchidere
    // ramane ultima vedere. Factorul pe moneda se face din botii care nu mai sunt activi (estimarile pe inchisii vechi n-ar avea perechi).
    const activi = ((act && act.bots) || []).map((b) => ({ id: String(b.id), perechi: Number(b.ordinePerechi), pornit: Number(b.pornitLa) }));
    Perechi.noteaza(perechiEst, activi, Date.now());
    const ids = Object.keys(perechiEst); if (ids.length > 6000) ids.sort((a, b) => perechiEst[a].la - perechiEst[b].la).slice(0, ids.length - 6000).forEach((k) => delete perechiEst[k]);
    const corectie = {}, fct = Perechi.factori(perechiEst, new Set(activi.map((a) => a.id)));
    for (const s of Object.keys(fct)) corectie[s] = { ...fct[s], la: Date.now() };
    perechiCor = corectie;
    await trimite("/api/istoric-bot?action=perechiEst", { est: perechiEst });
    await trimite("/api/istoric-bot?action=perechiCorectie", { corectie });
    jurnal("perechi:", cate(noi, "estimare nouă", "estimări noi") + ",", cate(Object.keys(corectie).filter((s) => corectie[s].factor).length, "monedă", "monede"), "cu factor din", Object.keys(corectie).length);
  } catch (e) { jurnal("perechi ESEC", e.message); perechiLa = Date.now() - 50 * 60000; }   // reincerc peste ~10 min
  perechiInLucru = false;
}
// v101.69 (el: „fă 5”): barele de 1 h pentru ARHIVA boților - toate monedele, de la cel mai vechi bot (măsurătorile pe arhivă prindeau doar 528
// din 2.214 boți). Noaptea, 400 de cereri pe tură, reluat; fișiere separate (profilul monedei rămâne pe istoric-1h, 6 luni). Planul: planArhiva.
const ORE_ARHIVA_DIR = path.join(DATA, "istoric-1h-arhiva"); fs.mkdirSync(ORE_ARHIVA_DIR, { recursive: true });
const ARHIVA_ORE_STARE = path.join(DATA, "arhiva-ore-stare.json");
const fisArhiva = (m) => path.join(ORE_ARHIVA_DIR, String(m).replace(/[^A-Z0-9_]/gi, "") + ".json");
const citesteArhiva = (m) => citesteJson(fisArhiva(m), []);
let arhivaOreInLucru = false;
async function turaArhivaOre() {
  if (!eNoapte(Date.now())) return;
  if (arhivaOreInLucru) return;
  arhivaOreInLucru = true;
  try {
    const st = citesteJson(ARHIVA_ORE_STARE, {}), harta = simbolPeMoneda();
    const r = await turaArhivaOreModul({ acum: Date.now(), trades: async () => JurnalTrade.din(await botiInchisiToti()),
      primaBaraAcum: (m) => { if (!harta[m]) return null; const o = citesteJson(fisOre(harta[m]), []), t = Number(o[0] && o[0].time); return Number.isFinite(t) ? t : null; },
      simbolPentru: async (m) => harta[m] || simbolPerp(m), citeste: citesteArhiva,
      scrie: (m, rr) => { try { scrieAtomic(fisArhiva(m), rr); } catch (e) { jurnal("arhiva 1h nescrisa", m, e.message); } },
      cere, pauza: (ms) => new Promise((res) => setTimeout(res, ms)), jurnal, stare: st,
      scrieStare: (s) => { try { scrieAtomic(ARHIVA_ORE_STARE, s); } catch (e) { jurnal("arhiva 1h: starea nescrisa", e.message); } }, buget: 400, GridCalcul });
    jurnal("arhiva 1h: " + TextRo.cate(r.cereri, "cerere", "cereri") + " · gata " + r.gata + " din " + TextRo.cate(r.plan, "monedă", "monede"));
    if (r.cereri > 0) profilStare.cazuriZi = null;   // bare noi ⇒ cazurile se refac chiar în noaptea asta, nu abia mâine
  } catch (e) { jurnal("arhiva 1h ESEC", e.message); }
  arhivaOreInLucru = false;
}
// revizia 01.10: dupa un esec (413, server oprit) se asteapta o ora, nu se reia la fiecare minut; cele mai noi 6.000 de cazuri
// v101.76 (el, 06.10: „în Tablou probabilități despre bot sau stock, în pagina din meniu tot ce poate · fă explicit comportamentul”):
// RiscLuna.raport o dată pe zi, după cazuri - arhiva boților + istoricul T212 (doar cu cheile T212); paginile îl citesc din KV
let riscInLucru = false, riscEsec = 0;
async function turaRisc() {
  const zi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
  if (riscInLucru || profilStare.riscZi === zi || Date.now() - riscEsec < 3600000) return;
  riscInLucru = true;
  try {
    // revizia (R8): arhiva sau istoricul T212 picate ⇒ nu trimit un raport ciuntit peste cel bun; reîncerc peste o oră (ziua rămâne nemarcată)
    const a = await cere("/api/istoric-bot?action=botiInchisi"); if (!a || !Array.isArray(a.boti) || !a.boti.length) throw new Error("arhiva boților n-a venit");
    const boti = await botiInchisiToti(), v = citesteVarsSigur();
    let umpleri = [];
    if (v.T212_API_KEY && v.T212_API_SECRET) { let h = null; try { h = await cere("/api/t212?action=istoric"); } catch (e) { h = null; } if (!h || !Array.isArray(h.umpleri)) throw new Error("istoricul T212 n-a venit"); umpleri = h.umpleri; }
    const risc = RiscLuna.raport({ boti, umpleri, perechi: T212.perechi(umpleri), acum: Date.now() });
    await trimite("/api/istoric-bot?action=risc", { risc });
    profilStare.riscZi = zi; try { scrieAtomic(PROFIL_STARE, profilStare); } catch {}
    jurnal("risc:", risc.boti ? cate(risc.boti.n, "bot", "boți") + ", ritmul " + risc.boti.ritm.K : "fără boți", "·", risc.actiuni ? cate(risc.actiuni.n, "episod", "episoade") + " T212" : "fără T212");
  } catch (e) { riscEsec = Date.now(); jurnal("risc ESEC (reîncerc peste o oră)", e.message); }
  riscInLucru = false;
}
let cazuriInLucru = false, cazuriEsec = 0;
async function turaCazuri() {
  const zi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
  if (cazuriInLucru || profilStare.cazuriZi === zi || Date.now() - cazuriEsec < 3600000) return;
  cazuriInLucru = true;
  try {
    const tr = JurnalTrade.din(await botiInchisiToti()).sort((a, b) => (b.pornit || 0) - (a.pornit || 0)).slice(0, 6000), harta = simbolPeMoneda();
    // v101.69: barele arhivei (de la cel mai vechi bot) + cele de acum, unite (o bară o singură dată)
    const bareDe = (m) => { const ore = harta[m] ? citesteJson(fisOre(harta[m]), []) : [], u = GridCalcul.imbinaRanduri(citesteArhiva(m), ore, 0); return u.length ? GridCalcul.bare(u) : null; };
    const cz = Asemanatoare.cazuri(tr, bareDe);
    // v101.74 (revizia R4): bilanțurile ADX și becuri socotite aici, o dată pe noapte (pe pagină țineau firul 1–2 s) - stau lângă cazuri
    let bilant = null;
    try { bilant = { adx: Asemanatoare.textAdx(Asemanatoare.bilantAdx(cz)), sem: Asemanatoare.textSemafor(Asemanatoare.bilantSemafor(cz)) }; } catch (e) { jurnal("cazuri: bilanț ESEC", e.message); }
    await trimite("/api/istoric-bot?action=cazuri", { la: Date.now(), cazuri: cz, bilant });
    profilStare.cazuriZi = zi; try { scrieAtomic(PROFIL_STARE, profilStare); } catch {}
    jurnal("cazuri:", cz.length, "cu starea de la pornire:", cz.filter((c) => c.stare).length, "cu ADX:", cz.filter((c) => c.adx != null).length);
  } catch (e) { cazuriEsec = Date.now(); jurnal("cazuri ESEC (reincerc peste o ora)", e.message); }
  cazuriInLucru = false;
}
// v101.29 (I-472): jurnalul deciziilor - o data pe ora: botii activi + inchisii din ultimele 7 zile cu decizii; fiecare decizie se judeca
// la 24 h pe totalul din istoricul botului (sau pe rezultatul final, daca s-a inchis inainte); toate -> KV decizii-socoteala
let deciziiLa = 0, deciziiInLucru = false;
async function turaDecizii() {
  if (deciziiInLucru || Date.now() - deciziiLa < 3600000) return;
  deciziiInLucru = true; deciziiLa = Date.now();
  try {
    const act = await cere("/api/bot-orders"), ids = new Set(((act && act.bots) || []).map((b) => String(b.id)));
    const inchisi = JurnalTrade.din((await botiInchisiToti()).filter((x) => Number(x.closeTime) > Date.now() - 7 * 86400000));
    const finale = {}; for (const t of inchisi) { ids.add(String(t.id)); finale[String(t.id)] = { total: Number.isFinite(t.net) ? t.net : t.rezultat, la: t.inchis }; }
    // revizia 01.10 (I5): si botii inchisi de mult - deciziile lor raman in socoteala (altfel „încă N din 30” scadea)
    try { const kb = await cere("/api/istoric-bot?action=deciziiBoti"); for (const id of (kb && kb.boti) || []) ids.add(String(id)); } catch (e) { jurnal("decizii: lista botilor", e.message); }
    const toate = [];
    for (const id of ids) {
      await new Promise((r) => setTimeout(r, 700));
      const v = await cere("/api/istoric-bot?action=decizie&bot=" + encodeURIComponent(id)).catch(() => null), l = v && Array.isArray(v.decizii) ? v.decizii : [];
      if (!l.length) continue;
      let nou;
      if (/^t212-/.test(id)) {   // v101.33: deciziile pe actiuni - la 5 zile de bursa pe pretul actiunii
        const d = l.some((e) => e.r === undefined || e.r === null) ? await cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(id.slice(5))).catch(() => null) : null;
        nou = Consiliu.judecaDecizieActiune(l, d ? GridCalcul.bareBursa(d.randuri || [], Date.now()) : [], Date.now());
      } else {
        const ist = l.some((e) => e.r === undefined || e.r === null) ? ((await cere("/api/istoric-bot?bot=" + encodeURIComponent(id) + "&ore=168").catch(() => null)) || {}).intrari || [] : [];
        nou = Consiliu.judecaDecizii(l, ist, finale[id] || null, Date.now());
      }
      if (JSON.stringify(nou) !== JSON.stringify(l)) await trimite("/api/istoric-bot?action=decizie", { bot: id, lista: nou });
      if (!/^t212-/.test(id)) toate.push(...nou);   // revizia 01.10 (I3): deciziile pe actiuni (lei, la 5 zile) nu intra in socoteala botilor (USDT, la 24 h)
    }
    const s = Consiliu.socotealaDecizii(toate);
    await trimite("/api/istoric-bot?action=deciziiSocoteala", { la: Date.now(), ...s });
  } catch (e) { jurnal("decizii ESEC", e.message); }
  deciziiInLucru = false;
}

// v101.65 (ideea 1): bilanțul Busolei despre predicțiile 🧠 ale Radarului - fișierul ei de pe același PC (cron-ul Busolei îl scrie; pe pagina ei
// nu apare), urcat în KV când `la` se schimbă; se uită cel mult o dată la 10 minute; fișier lipsă/stricat = nimic (fără jurnal la fiecare minut)
const BUSOLA_BILANT = process.env.BUSOLA_BILANT || "C:/Users/Cimin/busola/cron/stare/din-radar-bilant.json";
let bilantLa = 0, bilantTrimise = null, bilantVazutLa = 0, bilantInLucru = false;
async function turaBilantBusola() {
  if (bilantInLucru || Date.now() - bilantVazutLa < 10 * 60000) return;
  bilantVazutLa = Date.now();
  // revizia 🟡5: și câte predicții îi trimite Radarul acum (ce pleacă în pentru-busola.json din reteaUltim) - cu 0 judecate, rândul de pe
  // pagină arată dacă legătura e vie; se retrimite doar când s-a schimbat `la` (Busola a remăsurat) sau numărul trimis
  const trimise = Object.values(reteaUltim).reduce((s, l) => s + (Array.isArray(l) ? l.length : 0), 0);
  const b = bilantDinBusola(citesteJson(BUSOLA_BILANT, null), trimise); if (!b || (b.la === bilantLa && b.trimise === bilantTrimise)) return;
  bilantInLucru = true;
  try { await trimite("/api/istoric-bot?action=busolaRetea", b); bilantLa = b.la; bilantTrimise = b.trimise; jurnal("busola: bilanțul 🧠 urcat -", cate(b.retea.judecate, "predicție judecată", "predicții judecate") + " ·", b.retea.verdict, "· Radarul îi trimite", cate(trimise, "predicție", "predicții")); }
  catch (e) { jurnal("busola: bilanțul ESEC", e.message); }
  bilantInLucru = false;
}

async function bucla() {
  try { await tura(); } catch (e) { jurnal("tură", e.message); }
  // v98.2 (audit 28.09, #1): planurile si poza cer amandoua pozitiile T212 - una dupa alta, nu deodata (serverul leaga oricum
  // cererile identice in zbor; asa nici cele diferite nu se calca in aceeasi secunda)
  turaPlanuriT212().catch((e) => jurnal("planuri t212", e.message)).then(() => turaPoza()).catch((e) => jurnal("poza", e.message));
  turaCopie();
  golesteCoada().catch((e) => jurnal("coada discord", e.message));   // v100.40
  turaPerechiOra().catch((e) => jurnal("perechi pe ora", e.message));   // v100.40
  turaSocoteala().catch((e) => jurnal("socoteala", e.message));   // v100.43 (I-466)
  turaFrana().catch((e) => jurnal("frana", e.message));   // v100.43 (I-468)
  turaProfil().then(() => turaArhivaOre()).then(() => turaCazuri()).then(() => turaRisc()).then(() => turaProfilActiuni()).catch((e) => jurnal("profil/cazuri", e.message));   // v101.31: + profilurile actiunilor   // v101.26 (pachetul 1) + v101.28 (I-469)
  turaProbabilitati().catch((e) => jurnal("probabilitati", e.message));   // v101.27 (pachetul 2a)
  turaReteaColector().catch((e) => jurnal("retea", e.message));   // v101.56 (rețeaua neuronală, livrarea 1): noaptea, o dată pe zi
  turaSugestiiColector().catch((e) => jurnal("sugestii", e.message));   // v101.58 (reveniri + short): o dată pe zi, de la 8:00
  turaDecizii().catch((e) => jurnal("decizii", e.message));   // v101.29 (I-472)
  turaPerechi().catch((e) => jurnal("perechi", e.message));   // v101.30 (I-477)
  turaSocotealaActiuni().catch((e) => jurnal("socoteala actiuni", e.message));   // v101.33
  turaArhivaBoti().catch((e) => jurnal("arhiva boti inchisi", e.message));
  turaPaznic().catch(() => {});
  turaBilantBusola().catch((e) => jurnal("busola bilanț", e.message));   // v101.65 (ideea 1): bilanțul Busolei despre predicțiile 🧠, în KV
  turaPiataColector().catch((e) => jurnal("piata", e.message));
  turaIdeiZi().then(() => turaDimineata()).catch((e) => jurnal("idei/dimineata", e.message));
  if (!process.env.COLECTOR_FARA_CLASAMENT) turaClasament().then(() => turaLaborator()).then(() => turaIngust()).then(() => turaCf()).then(() => turaT212()).then(() => turaCfActiuni()).then(() => turaScanColector()).catch((e) => jurnal("clasament/laborator", e.message));   // nu blocheaza tura de un minut
  if (process.env.COLECTOR_O_TURA) process.exit(0);
  setTimeout(bucla, PAS_MS);
  // v101.34: bucla e la 60 s - poza are ceasul ei (16–17 la 30 s); turaPoza se pazeste singura (ritmul, pozaInLucru)
  if (!globalThis.__ceasPoza) globalThis.__ceasPoza = setInterval(() => { turaPoza().catch((e) => jurnal("poza", e.message)); }, 10000);
}
bucla();
