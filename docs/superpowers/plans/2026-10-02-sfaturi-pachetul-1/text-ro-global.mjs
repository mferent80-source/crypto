// TextRo (public/lib/text-ro.js) ca global, pentru probele care evalueaza modulele paginii in Node (semnale-bot.js, consiliu.js
// il folosesc la fiecare text). Se importa primul: `import "./lib/text-ro-global.mjs";` - ESM il ruleaza inaintea corpului probei.
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
globalThis.TextRo = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "text-ro.js"), "utf8") + "; return TextRo;")();
export default globalThis.TextRo;
