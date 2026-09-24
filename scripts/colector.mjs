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

// Canalul ntfy: nume secret, generat o data si pastrat in data/ntfy.json.
const NTFY_FIS = path.join(DATA, "ntfy.json");
function canalNtfy() {
  try { const c = JSON.parse(fs.readFileSync(NTFY_FIS, "utf8")); if (/^[A-Za-z0-9_-]{8,64}$/.test(c.topic)) return { topic: c.topic, nou: false }; } catch {}
  const topic = "radar-" + crypto.randomBytes(12).toString("hex");
  fs.writeFileSync(NTFY_FIS, JSON.stringify({ topic, facut: new Date().toISOString() }, null, 2));
  return { topic, nou: true };
}
const NTFY = canalNtfy();

function incarca(fisier, nume) {
  const src = fs.readFileSync(path.join(RAD, "public", "lib", fisier), "utf8");
  return new Function(src + "; return " + nume + ";")();
}
const Alerte = incarca("alerte.js", "Alerte");
const Directie = incarca("directie.js", "Directie");
const TabloBot = incarca("tablou-bot.js", "TabloBot");
const GridCalcul = incarca("grid-calcul.js", "GridCalcul");

const ANTET = { authorization: "Bearer " + TOKEN, accept: "application/json" };
async function cere(cale, opt = {}) {
  const r = await fetch(BAZA + cale, { ...opt, headers: { ...ANTET, ...(opt.headers || {}) }, signal: AbortSignal.timeout(20000) });
  const text = await r.text(); let d = null; try { d = JSON.parse(text); } catch {}
  if (!r.ok) throw Object.assign(new Error((d && (d.error + (d.detail ? " · " + d.detail : ""))) || "HTTP " + r.status), { status: r.status });
  return d;
}
const trimite = (cale, corp) => cere(cale, { method: "POST", body: JSON.stringify(corp), headers: { "content-type": "application/json", origin: BAZA } });

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
const directii = {}; // bot -> { la, fata4h, dir4h }

async function directiaBotului(b) {
  const d = directii[b.id];
  if (d && Date.now() - d.la < DIRECTIE_MS) return d;
  const s = TabloBot.simboluri(b.baza, b.quote).pionex;
  try {
    const k = await cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s) + "&interval=4H&limit=500");
    const a = Directie.analizeaza(k && k.data && k.data.klines, 6, b.directie);
    // v79 F1: regimul "miscare" pe aceleasi lumanari de 4h (1 bara = 4h, 6 bare = 24h)
    const regim = GridCalcul.regimPeBare(GridCalcul.bare(k && k.data && k.data.klines), 1, 6);
    directii[b.id] = { la: Date.now(), fata4h: a.dir ? a.fata.ton : null, dir4h: a.dir, regim };
  } catch (e) { jurnal("direcție", b.id, e.message); directii[b.id] = { la: Date.now(), fata4h: null, dir4h: null, regim: null }; }
  return directii[b.id];
}

// Alerte despre colector insusi: daca nu mai poate citi botul, sau un bot care
// mergea dispare din lista (inchis sau lichidat), omul trebuie sa afle - altfel
// tacerea alertelor s-ar citi ca "totul e bine".
const META = "_colector";
function meta() { return stareAlerte[META] || (stareAlerte[META] = { citireRea: 0, anuntatRau: 0, cunoscuti: {} }); }
async function anuntaColector(nivel, titlu, mesaj) { return ntfy({ nivel, titlu, mesaj }); }

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
    const ctx = await directiaBotului(b);
    const inainte = stareAlerte[b.id] || {};
    const r = Alerte.evalueaza(b, ctx, inainte, acum);
    stareAlerte[b.id] = r.stare;
    // o alerta care n-a plecat (ntfy picat, fara internet) nu se trece ca trimisa:
    // starea ei revine la cea de dinainte, ca tura urmatoare s-o reincerce
    for (const msg of r.mesaje) if (!(await ntfy(msg))) {
      if (inainte[msg.cheie]) stareAlerte[b.id][msg.cheie] = inainte[msg.cheie]; else delete stareAlerte[b.id][msg.cheie];
    }
  }
  try { fs.writeFileSync(STARE_FIS, JSON.stringify(stareAlerte)); } catch {}
  try { await trimite("/api/istoric-bot?action=config", { ntfyTopic: NTFY.topic, colectorLa: acum }); } catch (e) { jurnal("config", e.message); }
}

jurnal("pornit, PID " + process.pid + ", server " + BAZA + ", canal ntfy " + NTFY.topic + (NTFY.nou ? " (NOU)" : ""));
if (NTFY.nou) await ntfy({ nivel: "info", titlu: "Crypto Radar: alertele sunt legate", mesaj: "De aici vin alertele botului: lichidare aproape, Pionex în stare anormală, prețul ieșit din grid, piața pe 4 ore împotriva botului, gata liniștea (oprește gridul)." });
// Turele nu se suprapun: urmatoarea porneste abia dupa ce s-a terminat asta.
async function bucla() {
  try { await tura(); } catch (e) { jurnal("tură", e.message); }
  if (process.env.COLECTOR_O_TURA) process.exit(0);
  setTimeout(bucla, PAS_MS);
}
bucla();
