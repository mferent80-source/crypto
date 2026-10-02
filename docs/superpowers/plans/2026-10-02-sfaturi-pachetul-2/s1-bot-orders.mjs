// Sarcina 1 · functions/api/bot-orders.js: avertismentele se muta NESCHIMBATE in functions/_shared/avertismente.js (avertismente-v1.js
// din anexa) - aceleasi conditii, aceleasi texte; bot-orders-v72 ramane verde (dovada ca e doar o mutare). Blocul vechi se citeste din
// bot-orders-bloc-vechi.txt (are backtick-uri si ${...}, nu incape intr-un template literal).
import fs from "node:fs";
const txt = (f) => fs.readFileSync(new URL("./" + f, import.meta.url), "utf8").replace(/\r\n/g, "\n");
export default [
  [`import {PIONEX,TIMEOUT_MS,pionexPrivatGet} from "../_shared/pionex.js";
`, `import {PIONEX,TIMEOUT_MS,pionexPrivatGet} from "../_shared/pionex.js";
import {avertismenteBot} from "../_shared/avertismente.js";
`],
  [txt("bot-orders-ban-semn.txt"), ``],
  [txt("bot-orders-bloc-vechi.txt"), `  // v100.62: avertismentele intr-o functie pura (functions/_shared/avertismente.js) - le verifica garda textelor
  const avertismente=avertismenteBot({x,pret,jos,sus,lich,comisioane,gridProfitBrut,profitNet});
`],
];
