// Sarcina 5 · functions/_shared/avertismente.js: textele avertismentelor scrise concis (conditiile raman). Blocurile vechi/noi stau in
// .txt (au backtick-uri si ${...}): bot-orders-bloc-vechi.txt (exact blocul mutat la sarcina 1) -> avertismente-bloc-nou.txt.
import fs from "node:fs";
const txt = (f) => fs.readFileSync(new URL("./" + f, import.meta.url), "utf8").replace(/\r\n/g, "\n");
export default [
  [`intr-o functie pura, ca garda textelor (scripts/garda-texte.mjs) sa le poata genera si verifica - aceleasi conditii, aceleasi texte.`, `intr-o functie pura, ca garda textelor (scripts/garda-texte.mjs) sa le poata genera si verifica - aceleasi conditii; textele, scrise concis la v100.62.`],
  [`const ban=v=>{const a=Math.abs(v);return a.toFixed(a>0&&a<0.01?4:2)};
const semn=v=>(v<0?"−":"+")+ban(v);
`, `const virgula=s=>String(s).replace(".",",");
// suma cu semn si virgula („+10,91”, „−0,0040”), ca TextRo.usdt (TextRo e doar in pagina si in colector)
const usdt=v=>{const a=Math.abs(v),s=a.toFixed(a>0&&a<0.01?4:2);return (Number(s)===0?"":v<0?"−":"+")+virgula(s)};
// pretul calculat (lichidarea estimata): ~5 cifre semnificative, ca preturile Pionex; peste 1000, 2 zecimale
const pretScurt=v=>v===null||v===undefined||!Number.isFinite(v)?"—":Math.abs(v)>=1000?v.toFixed(2):String(Number(v.toPrecision(5)));
`],
  [txt("bot-orders-bloc-vechi.txt"), txt("avertismente-bloc-nou.txt")],
];
