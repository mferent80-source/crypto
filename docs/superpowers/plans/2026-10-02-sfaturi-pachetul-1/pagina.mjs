// pachetul 1 (sfaturi concise) - pagina, service worker-ul si colectorul. Listele au numele sarcinii din plan (s1 = sarcina 1 etc.)
// sarcina 1: TextRo se incarca inaintea modulelor care scriu sfaturi (pagina, cache-ul offline, colectorul)
export const s1_html = [[`<script src="/lib/grid-calcul.js"></script>`, `<script src="/lib/text-ro.js"></script><script src="/lib/grid-calcul.js"></script>`]];
export const s1_sw = [[`"/lib/semnale-bot.js"`, `"/lib/text-ro.js","/lib/semnale-bot.js"`]];
export const s1_colector = [[`const Alerte = incarca("alerte.js", "Alerte");`,
  `incarca("text-ro.js", "TextRo");   // v101.41 (sfaturi concise): cifrele textelor (globalThis.TextRo), inaintea modulelor care scriu sfaturi
const Alerte = incarca("alerte.js", "Alerte");`]];
// sarcina 4: cartela Stopul arata „de ce” si de unde vine stopul propus, fiecare pe randul lui
export const s4_app = [[`<p class="tbCcAct">'+escapeHtml(x.act||x.text)+'</p>'`,
  `<p class="tbCcAct">'+escapeHtml(x.act||x.text)+'</p>'+(x.deCe?'<p class="tbSub tbCcDeCe">'+escapeHtml(x.deCe)+'</p>':'')+(x.sursa?'<p class="tbSub tbCcSursa">'+escapeHtml(x.sursa)+'</p>':'')`]];
export const s4_css = [[`.tbCcBani{margin:6px 0 0;font-size:12.5px;font-weight:600;color:var(--text)}`,
  `.tbCcBani{margin:6px 0 0;font-size:12.5px;font-weight:600;color:var(--text)}
.tbCcDeCe,.tbCcSursa{margin:4px 0 0;font-size:12.5px}`]];
// sarcina 5: „de ce” sub „Ce aș face eu” si legenda comuna (avertizarile, o data) sub Consilier
export const s5_app = [
  [`+'<div class="tbConsFac"><p class="tbEt2">Ce aș face eu</p><p>'+escapeHtml(c.faCe||"L-aș lăsa să lucreze.")+'</p>'`,
   `+'<div class="tbConsFac"><p class="tbEt2">Ce aș face eu</p><p>'+escapeHtml(c.faCe||"L-aș lăsa să lucreze.")+'</p>'+(c.explica?'<p class="tbSub tbConsExplica">'+escapeHtml(c.explica)+'</p>':'')`],
  [`c.rest.map(function(r){return '<li>'+escapeHtml(r.titlu)+(r.text?' <span>— '+escapeHtml(r.text)+'</span>':'')+'</li>'}).join("")+'</ul></details>':'');`,
   `c.rest.map(function(r){return '<li>'+escapeHtml(r.titlu)+(r.text?' <span>— '+escapeHtml(r.text)+'</span>':'')+'</li>'}).join("")+'</ul></details>':'')
    +(Consiliu.LEGENDA?'<p class="tbSub tbConsLeg">'+escapeHtml(Consiliu.LEGENDA)+'</p>':'');   /* v100.61: avertizarile comune, o data */`],
];
export const s5_css = [[`.tbConsFac p{margin:0}`, `.tbConsFac p{margin:0}
.tbConsExplica{font-size:13px}
.tbConsLeg{margin:10px 2px 0;font-size:12px;line-height:1.45}`]];
// sarcina 2: garda si proba v100.61 intra in `npm test`
export const s2_pkg = [
  [`&& npm run test:v10060"`, `&& npm run test:v10060 && npm run test:garda-texte && npm run test:v10061"`],
  [`    "test:v10060": "node scripts/proba-v10060.mjs"`, `    "test:v10060": "node scripts/proba-v10060.mjs",
    "test:garda-texte": "node scripts/garda-texte.mjs",
    "test:v10061": "node scripts/proba-v10061.mjs"`],
];
