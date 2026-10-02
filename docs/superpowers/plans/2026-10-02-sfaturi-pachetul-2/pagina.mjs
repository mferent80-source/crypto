// Listele de inlocuiri pentru package.json, app.js, app.css si garda (STRICT), pe sarcini. Se aplica cu:
//   node ed.mjs <fisier> pagina.mjs <lista>
// sarcina 1: proba v100.62 intra in `npm test` (dupa garda comentariilor)
export const s1_pkg = [
  [`npm run test:v10061 && npm run test:garda-comentarii"`, `npm run test:v10061 && npm run test:garda-comentarii && npm run test:v10062"`],
  [`    "test:garda-comentarii": "node scripts/garda-comentarii.mjs"
`, `    "test:garda-comentarii": "node scripts/garda-comentarii.mjs",
    "test:v10062": "node scripts/proba-v10062.mjs"
`],
];
// sarcina 2: cardul ascuns al sfaturilor arata „sursa” (fostul „deCe” al sfaturilor) + garda stricta pe „sfaturi”
export const s2_app = [
  [`(s.deCe?'<p class="tbSub">'+escapeHtml(s.deCe)+'</p>':'')`, `(s.sursa?'<p class="tbSub">'+escapeHtml(s.sursa)+'</p>':'')`],
];
// + „tot mai jos” (motivul trendului: „maxime și minime tot mai jos”) nu e o trimitere „vezi mai jos”
export const s2_garda = [
  [`export const STRICT = new Set(["semafor", "cartele", "consiliu"]);`, `export const STRICT = new Set(["semafor", "cartele", "consiliu", "sfaturi"]);`],
  [String.raw`[/\bvezi\b|mai jos/i, "trimitere „vezi … / mai jos”"],`, String.raw`[/\bvezi\b|(?<!\btot )\bmai jos\b/i, "trimitere „vezi … / mai jos”"],`],
];
// sarcina 3: garda stricta pe „consiliu-2”; fixtura scrisa de mana a sfatului „margine” trece la titlul nou (cifra intai - titluMargine nu mai exista)
export const s3_garda = [
  [`export const STRICT = new Set(["semafor", "cartele", "consiliu", "sfaturi"]);`, `export const STRICT = new Set(["semafor", "cartele", "consiliu", "sfaturi", "consiliu-2"]);`],
  [`titlu: "Până la marginea de jos (0.5722) sunt 0.5%", text: "Acolo totalul ar fi în jur de −7,34 USDT."`,
   `titlu: "0,5% până la marginea de jos (0.5722)", text: "~170 JTO la margine (acum 160), total ~−7,34 USDT; coboară atât în 64% din zile (31 din 49)."`],
];
// sarcina 4: panoul planului, portofoliul (app.js), randurile pe doua randuri in „Ce ai de făcut acum” (app.css) + garda stricta pe „todo”
export const s4_app = [
  [`if(!st||(!st.plus&&!st.minus&&!st.afara)){ps.innerHTML='<p class="tbSub">Niciun plan încă. Scrie-l acum, la rece: e mai ușor decât să hotărăști când prețul fuge.</p>';return}`,
   `if(!st||(!st.plus&&!st.minus&&!st.afara)){ps.innerHTML='<p class="tbSub">Niciun plan încă: scrie-l acum, la rece, nu când prețul fuge.</p>';return}`],
  [`var U=function(v){return (v>=0?"+":"−")+Math.abs(v).toFixed(2)+" USDT"},h="";
  if(st.plus)h+='<div class="tbLinie"><span>Țintă pe plus: '+U(st.plus.prag)+'</span><b class="'+(st.plus.lipsa<=0?"good":"")+'">'+(st.plus.lipsa<=0?"ATINSĂ — ieși":"mai sunt "+st.plus.lipsa.toFixed(2)+" USDT")+'</b></div>';
  if(st.minus)h+='<div class="tbLinie"><span>Ies dacă pierd '+st.minus.prag.toFixed(2)+' USDT</span><b class="'+(st.minus.lipsa<=0?"bad":st.minus.lipsa<st.minus.prag*0.25?"tbWarn":"")+'">'+(st.minus.lipsa<=0?"ATINS — ieși":"mai sunt "+st.minus.lipsa.toFixed(2)+" USDT")+'</b></div>';`,
   `var U=function(v){return TextRo.usdt(v)},h="";   // v100.62: cifrele cu virgula, „închide botul” (vocabularul unic)
  if(st.plus)h+='<div class="tbLinie"><span>Țintă pe plus: '+U(st.plus.prag)+'</span><b class="'+(st.plus.lipsa<=0?"good":"")+'">'+(st.plus.lipsa<=0?"atinsă: închide botul":"mai sunt "+TextRo.num(st.plus.lipsa,2)+" USDT")+'</b></div>';
  if(st.minus)h+='<div class="tbLinie"><span>Ies dacă pierd '+TextRo.num(st.minus.prag,2)+' USDT</span><b class="'+(st.minus.lipsa<=0?"bad":st.minus.lipsa<st.minus.prag*0.25?"tbWarn":"")+'">'+(st.minus.lipsa<=0?"atins: închide botul":"mai sunt "+TextRo.num(st.minus.lipsa,2)+" USDT")+'</b></div>';`],
  [`ps.innerHTML=h+(st.atins.length?'<p class="tbFac">👉 <b>Ce aș face eu:</b> exact ce ți-ai propus — ieși acum, fără să renegociezi.</p>':'');`,
   `ps.innerHTML=h+(st.atins.length?'<p class="tbFac">👉 <b>Ce aș face eu:</b> Aș închide botul acum, cum ai hotărât la rece.</p>':'');`],
  [`+(p.acelasiPariu?'<p class="tbFac">👉 <b>Ce aș face eu:</b> '+Math.max(p.peParte.long,p.peParte.short)+' boți pe aceeași parte sunt un singur pariu, nu mai multe. N-aș mai porni unul pe partea asta; aș lua următorul neutru sau pe partea cealaltă.</p>':'');`,
   `+(p.acelasiPariu?'<p class="tbSub">'+Math.max(p.peParte.long,p.peParte.short)+' boți pe aceeași parte sunt un singur pariu, nu mai multe.</p><p class="tbFac">👉 <b>Ce aș face eu:</b> N-aș mai porni unul pe partea asta, ci unul neutru sau pe partea cealaltă.</p>':'');`],
];
export const s4_css = [
  [`#tabloubot .tbTodoRand p{margin:1px 0 0;color:var(--muted);font-size:12px}`, `#tabloubot .tbTodoRand p{margin:1px 0 0;color:var(--muted);font-size:12px;white-space:pre-line}`],
];
export const s4_extra = [
  [`text: "Scrie-l la rece. Colectorul te anunță când se atinge un prag.", n: 0, actiune: "plan"`, `text: "Cu planul scris la rece, colectorul te anunță când se atinge un prag.", n: 0, actiune: "plan"`],
  [`" zile până pe zero, la ritmul de azi (" + (netZi >= 0 ? "+" : "") + netZi.toFixed(2) + " USDT/zi), dacă prețul stă pe loc" };`,
   `" zile până pe zero la ritmul de azi (" + TextRo.usdt(netZi) + "/zi), dacă prețul stă pe loc" };   // v100.62: virgula prin TextRo`],
];
export const s4_garda = [[`export const STRICT = new Set(["semafor", "cartele", "consiliu", "sfaturi", "consiliu-2"]);`, `export const STRICT = new Set(["semafor", "cartele", "consiliu", "sfaturi", "consiliu-2", "todo"]);`]];
// sarcina 5: garda stricta pe „server”
export const s5_garda = [[`export const STRICT = new Set(["semafor", "cartele", "consiliu", "sfaturi", "consiliu-2", "todo"]);`, `export const STRICT = new Set(["semafor", "cartele", "consiliu", "sfaturi", "consiliu-2", "todo", "server"]);`]];
