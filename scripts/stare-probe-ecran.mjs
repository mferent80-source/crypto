// v100.376: ultimul rând al lanțului `npm test` - au fost rulate probele de ecran (cu browser, din afara lanțului) pe fișierele de acum?
// Doar SPUNE (iese mereu cu 0): poarta de dinaintea împingerii (scripts/inainte-de-push.mjs) e cea care le rulează și oprește.
// De ce: scripts/lib/amprenta-ecran.mjs.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { textStare } from "./lib/amprenta-ecran.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let t; try { t = textStare(RAD); } catch (e) { t = { ok: false, text: "⚠ starea probelor de ecran nu se poate citi: " + e.message }; }
console.log("\n" + t.text + "\n");
process.exit(0);
