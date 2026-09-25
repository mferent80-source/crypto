// Trimite un mesaj de proba pe Discord cu webhook-ul din .dev.vars (DISCORD_WEBHOOK), ca omul sa vada pe
// telefon ca alertele ajung. Folosit de PUNE-DISCORD.bat. Iese cu 0 doar daca Discord a acceptat mesajul.
//   node scripts/proba-discord.mjs [calea spre .dev.vars]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { trimiteDiscord, esteWebhookDiscord } from "./lib/canal-discord.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = process.argv[2] || path.join(RAD, ".dev.vars");
let w = "";
try { for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const i = l.indexOf("="); if (i > 0 && l.slice(0, i).trim() === "DISCORD_WEBHOOK") w = l.slice(i + 1).trim(); } } catch {}
if (!esteWebhookDiscord(w)) { console.log("  DISCORD_WEBHOOK lipsește sau nu are forma unei adrese de webhook Discord."); process.exit(1); }
const ok = await trimiteDiscord({ nivel: "info", titlu: "Crypto Radar: alertele sunt legate", mesaj: "De aici vin alertele: frâna la cumpărări în jos, acțiunile peste 20% din cont, planurile tale, opritorul stins, lichidarea aproape, raportul de duminică." }, { fetch, webhook: w, jurnal: (...a) => console.log("  " + a.join(" ")) });
console.log(ok ? "  Mesajul de probă a plecat — uită-te pe Discord (și pe telefon)." : "  Discord n-a primit mesajul (vezi rândul de mai sus).");
process.exit(ok ? 0 : 1);
