/* tablou-consilier.js — probabilitățile din istoric, profilul botului, Consilierul și planul, fluxul pieței, săptămâna, semnalele, portofoliul, semaforul și starea Busolei
   I-940 (auditul paginii botului, 24.11): mutat NESCHIMBAT din public/app.js (v100.392). Script clasic, încărcat ÎNAINTEA lui app.js:
   doar definiții (nimic nu rulează la încărcare), numele rămân globale ca înainte; ce folosește din app.js (tbStare, tbPlan, $ …)
   se citește abia la apel. Probele îl văd lipit de app.js prin scripts/lib/sursa-app.mjs (cuTablou). */
function tbDeseneazaProb(b){
  var card=$("tbPl-prob"),el=$("tbProb"),sub=$("tbProbSub");if(!card||!el||!b)return;
  tbProb.rezumat=null;var rz1=$("tbRezumatModele"),rzVine=tbProb.botId===b.id&&tbProb.rez&&!tbProb.rez.gol;if(rz1&&!rzVine){rz1.hidden=true;rz1.textContent=""}   /* audit 23.10: se golește doar când urmează o ieșire timpurie (altfel ascuns-arătat la fiecare desen, 28 de mutații / 20 s); rândul îl pune mai jos, doar dacă s-a schimbat. revizia 🟡1: la schimbarea botului sau fără cifre, rândul de sub verdict nu rămâne cu cifrele altui bot */
  var t=tbProb.botId===b.id?tbProb:null,rez=t&&t.rez;
  if(!rez){card.hidden=true;return}
  reteaAdu(function(){if(tbStare.bot&&tbStare.bot.id===b.id)tbDeseneazaProb(tbStare.bot)});   /* v100.80 (rețeaua neuronală) */
  card.hidden=false;
  if(rez.gol){if(sub)sub.textContent="încă nu se pot socoti";el.innerHTML='<p class="tbSub">'+escapeHtml(rez.gol)+'.</p>';return}
  var l=Probabilitati.randuri(rez,t.cal),P=function(v){return Math.max(0,Math.min(100,Math.round(v*100)))};
  var vh=tbProbVechi(rez);
  tbProb.rezumat=null;try{tbProb.rezumat=typeof Retea!=="undefined"&&!vh?Retea.rezumat(reteaM.m,rez.retea||null,l,{acum:Date.now(),dir:b.directie},rez.arbori&&reteaM.a?{modele:reteaM.a,rt:rez.arbori}:null):null}catch(e){tbProb.rezumat=null}   /* v100.96: rezumatul de sub semafor */
  var rz0=$("tbRezumatModele");if(rz0){if(rz0.hidden!==!tbProb.rezumat)rz0.hidden=!tbProb.rezumat;if(rz0.textContent!==(tbProb.rezumat||""))rz0.textContent=tbProb.rezumat||""}   /* audit 23.10: doar când s-a schimbat */
  if(sub)sub.textContent=(vh?"⚠ cifre de acum "+vh+" h (colectorul nu le-a mai reînnoit) · stare: ":"acum: ")+(Probabilitati.ETICHETE[rez.stare]||rez.stare)+" · "+Math.round(rez.bare/24)+" de zile de bare de 1 h";
  var ht=(l.length?tbProbRanduriHtml(l):'<p class="tbSub">Nicio cifră de arătat: botul n-are margini sau plan pe care să le socotesc.</p>')
    +tbIndicatoriHtml(rez)+tbAsemanatoareHtml(b,rez)+'<p class="tbSub tbProbNota">Frecvențe din trecutul monedei (6 luni de bare de 1 h — nu neapărat un ciclu întreg de piață), nu predicții; „puține cazuri independente” înseamnă prea puține date: un semn, nu o regulă. Banda: zona e intervalul de încredere, semnul e cifra. „Independente” = ferestre care nu se suprapun; intervalul e socotit pe ele. Fiecare cifră se verifică după ce-i trece orizontul; de la 20 de verificări pe treaptă se arată cifra corectată (pragurile 20 și 15 puncte sunt ipoteze de urmărit).</p>'+reteaHtml(rez.retea,l,{acum:Date.now(),pornire:rez.retea&&rez.retea.pornire},rez.arbori);(typeof puneCuPliuri==="function"?puneCuPliuri(el,ht):(el.innerHTML=ht));   /* v100.80: 🧠 sub nota lui 🎲; v100.335: pliurile deschise rămân */
}
// v100.45 (pachetul 1): profilul monedei (colectorul il face noaptea din 6 luni de bare de 1 h) - pragurile sfaturilor pe moneda.
// Pe pagina publicata (fara KV) ruta da 503 -> null -> pragurile fixe de azi, spuse ca atare.
var tbProfil={simbol:null,la:0,p:null,inLucru:false,faraServer:false};   // faraServer: pagina publicata (fara KV) - nimic de promis
function tbProfilPt(b){
  var s=b?TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex:null;if(!s)return null;
  if(!tbProfil.inLucru&&(tbProfil.simbol!==s||Date.now()-tbProfil.la>30*60000)){tbProfil.inLucru=true;
    getJSON("/api/istoric-bot?action=profil&simbol="+encodeURIComponent(s)).then(function(d){tbProfil.p=d&&d.profil||null;tbProfil.faraServer=false}).catch(function(){tbProfil.p=null;tbProfil.faraServer=true}).then(function(){tbProfil.simbol=s;tbProfil.la=Date.now();tbProfil.inLucru=false})}
  return tbProfil.simbol===s?tbProfil.p:null;
}
function tbAduSocoteala(){if(tbSoc.inLucru||Date.now()-tbSoc.la<10*60000)return;tbSoc.inLucru=true;getJSON("/api/istoric-bot?action=socoteala").then(function(d){tbSoc.peCod=d&&d.socoteala&&d.socoteala.peCod||null;tbSoc.boti=d&&d.socoteala&&d.socoteala.boti||null}).catch(function(){}).then(function(){tbSoc.la=Date.now();tbSoc.inLucru=false})}
// v100.44 (I-465): desenul Consilierului (Consiliu.alcatuieste), ca in demo
// v100.50 (I-473 + I-472): verdictul colectorului (de ce s-a schimbat) + jurnalul deciziilor tale, adus la 2 min
var tbConsKv={botId:null,la:0,cons:null,decizii:[],soc:null,inLucru:false};
function tbConsKvPt(b){
  if(!b||!b.id)return null;
  if(!tbConsKv.inLucru&&(tbConsKv.botId!==b.id||Date.now()-tbConsKv.la>2*60000)){tbConsKv.inLucru=true;
    Promise.all([getJSON("/api/istoric-bot?action=cons&bot="+encodeURIComponent(b.id)).catch(function(){return null}),getJSON("/api/istoric-bot?action=decizie&bot="+encodeURIComponent(b.id)).catch(function(){return null}),getJSON("/api/istoric-bot?action=deciziiSocoteala").catch(function(){return null})])
      .then(function(r){tbConsKv.cons=r[0]&&r[0].cons||null;tbConsKv.decizii=r[1]&&r[1].decizii||[];tbConsKv.soc=r[2]&&r[2].socoteala||null})
      .then(function(){tbConsKv.botId=b.id;tbConsKv.la=Date.now();tbConsKv.inLucru=false})}
  return tbConsKv.botId===b.id?tbConsKv:null;
}
function tbConsCheie(c){return Consiliu.cheieDecizie(c)}   // revizia 01.10 (I3): nivelul + motivele, nu titlul cu cifre vii
async function tbDecizie(urmat){
  var b=tbStare.bot,c=tbStare.consUlt;if(!b||!c)return;
  var corp={bot:b.id,t:Date.now(),cheie:tbConsCheie(c),nivel:c.nivel,titlu:c.titlu,faCe:c.faCe||"",urmat:!!urmat,total:botiNr(b.profitTotal)};
  try{var r=await apiFetch("/api/istoric-bot?action=decizie",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(corp)});if(!r.ok)throw Object.assign(new Error("HTTP "+r.status),{status:r.status});
    tbConsKv.decizii=(tbConsKv.decizii||[]).filter(function(e){return e.cheie!==corp.cheie}).concat([corp]);var el=$("tbDecStare");if(el)el.textContent=tbDecStareText(c);
    toast(urmat?"Notat: ai făcut ce zice Consilierul — îl judec la 24 h":"Notat: n-ai făcut — îl judec la 24 h","good")}
  catch(e){toast("Nu am putut nota decizia: "+(e&&e.status===503?"doar pe Radarul de pe server":textEroare(e)),"bad")}
}
function tbDecStareText(c){var k=tbConsCheie(c),e=(tbConsKv.decizii||[]).filter(function(x){return x.cheie===k}).pop();
  return e?"notat: "+(e.urmat?"am făcut":"n-am făcut")+" ("+new Date(e.t).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"})+")"+(e.r!=null?" · după 24 h: "+TextRo.usdt(e.r,1):""):"ai făcut ce zice? notează — după 30 de decizii îți spun cum ți-a mers"}
// v100.111 (I-550): ce fereastră a pornit (ofertele fișei de dinainte de pornire, de pe server) - în cartela verdictului, nu doar o dată pe Discord
var tbFer={la:0,inLucru:false};
function tbAduFerestre(){if(tbFer.inLucru||Date.now()-tbFer.la<5*60000)return;tbFer.inLucru=true;var nou=false;getJSON("/api/istoric-bot?action=ferestre").then(function(d){if(d&&Array.isArray(d.ferestre)){nou=JSON.stringify(d.ferestre)!==JSON.stringify(grFerestreSrv);grFerestreSrv=d.ferestre}}).catch(function(){}).then(function(){tbFer.la=Date.now();tbFer.inLucru=false;if(nou&&tbStare.bot&&$("tbSemafor"))tbDeseneazaSemafor(tbStare.bot)})}   /* revizia (R6): rândul 📒 apare când sosesc ofertele */
function tbPornitCaText(b){
  if(!b||typeof GridPlan==="undefined"||!/\.PERP$/i.test(String(b.baza||"")))return null;tbAduFerestre();   // revizia (R6): ofertele sunt doar pe futures
  var fb=null;try{fb=GridPlan.fereastraBotului(b,grFerestreCitite())}catch(e){fb=null}if(!fb)return null;
  var t=new Date(fb.t),p=function(n){return String(n).padStart(2,"0")},azi=t.toDateString()===new Date().toDateString();
  return GridPlan.textPornit(fb,(azi?"":t.getDate()+"."+p(t.getMonth()+1)+", ")+p(t.getHours())+":"+p(t.getMinutes()));
}
/* v100.333 (revizia Opus a v100.332): planul cu cererea picată - semaforul judecă fără el (fără „pragul tău e atins”), deci o spune */
function tbPlanNecitit(b){if(typeof tbPlanCitire!=="function"||tbPlanCitire(b)!=="eroare")return null;return "planul n-a putut fi citit, judec fără el"+(tbPlan.faraServer?" (se ține doar pe Radarul de pe server)":" · reîncerc singur")}
function tbConsHtml(c){
  var cip=function(x){return x?'<span class="tbConsCip '+escapeHtml(x.cls||"")+'" title="'+escapeHtml(x.titlu||"")+'">'+escapeHtml(x.t)+'</span>':''};
  return '<div class="tbConsGrid"><div class="tbConsSt"><span class="tbConsEt '+escapeHtml(c.nivel)+'">'+escapeHtml(c.eticheta)+'</span><h3>'+escapeHtml(c.titlu)+'</h3>'+tbRezumatHtml(c.rezumat)
    +(c.planNecitit?'<p class="tbConsDeCe tbSub tbWarn">⚠ '+escapeHtml(c.planNecitit)+'</p>':'')
    +(c.deCeText?'<p class="tbConsDeCe tbSub">🔁 '+escapeHtml(c.deCeText)+'</p>':'')+(c.altaVoce?'<p class="tbConsDeCe tbSub">📣 '+escapeHtml(c.altaVoce)+'</p>':'')+(c.busolaVsRadar?'<p class="tbConsDeCe tbSub">🧭 '+escapeHtml(c.busolaVsRadar)+'</p>':'')+(c.pornitCa?'<p class="tbConsDeCe tbSub">📒 '+escapeHtml(c.pornitCa)+'</p>':'')
    +'<div class="tbConsFac"><p class="tbEt2">Ce aș face eu</p><p>'+escapeHtml(c.faCe||"L-aș lăsa să lucreze.")+'</p>'+(c.explica?'<p class="tbSub tbConsExplica">'+escapeHtml(c.explica)+'</p>':'')+(c.bani?'<p class="tbConsBani">💰 '+escapeHtml(c.bani).replace(/([−+]\d+(?:,\d+)?)/g,'<b class="tbConsSuma">$1</b>')+'</p>':'')+(c.sansa?'<p class="tbConsSansa tbSub">'+escapeHtml(c.sansa)+'</p>':'')
    +(c.nivel&&c.nivel!=="asteapta"?'<div class="tbDecizii"><button type="button" class="actionGhost tbDecBtn" data-action-click="tbDecizie(true)" aria-label="Am făcut ce zice Consilierul">✅ am făcut</button><button type="button" class="actionGhost tbDecBtn" data-action-click="tbDecizie(false)" aria-label="N-am făcut ce zice Consilierul">✋ n-am făcut</button><span class="tbSub" id="tbDecStare">'+escapeHtml(tbDecStareText(c))+'</span></div>'+(c.decSoc?'<p class="tbSub tbDecSoc">'+escapeHtml(c.decSoc)+'</p>':''):'')+'</div>'
    +(c.incredere?'<p class="tbConsInc">'+escapeHtml(c.incredere)+'</p>':'')+'</div>'
    +'<div class="tbConsDr"><h4>'+(c.nivel==="asteapta"?'De ce':'De ce '+escapeHtml(c.eticheta)+(c.motive.length?': '+TextRo.cate(c.motive.length,"motiv","motive")+(c.motive.length>1?', cel mai important primul':''):''))+'</h4>'
    +(c.motive.length?c.motive.map(function(m){return '<div class="tbConsMotiv"><i class="'+escapeHtml(m.c)+'"></i><div><b>'+escapeHtml(m.titlu)+'</b>'+(m.text?'<p>'+escapeHtml(m.text)+'</p>':'')
      +((m.cip||m.extra)?'<div class="tbConsL">'+cip(m.cip)+(m.extra?'<span>'+escapeHtml(m.extra)+'</span>':'')+'</div>':'')+'</div></div>'}).join(""):'<p class="tbSub">Nimic nu cere o mișcare acum.</p>')
    +'</div></div>'
    +(c.rest.length?'<details class="tbConsRest"'+(tbConsRestDeschis?' open':'')+'><summary>Restul, pliat · <b>'+TextRo.cate(c.rest.length,"notă","note")+'</b> fără urgență</summary><ul>'
      +c.rest.map(function(r){return '<li>'+escapeHtml(r.titlu)+(r.text?' <span>— '+escapeHtml(r.text)+'</span>':'')+'</li>'}).join("")+'</ul></details>':'')
    +(Consiliu.LEGENDA?'<p class="tbSub tbConsLeg">'+escapeHtml(Consiliu.LEGENDA)+'</p>':'');   /* v100.61: avertizarile comune, o data */
}
var tbConsRestDeschis=false;
function tbIncredere(cod){tbAduSocoteala();if(!tbSoc.peCod||!cod||cod==="fara-fisa")return "";var x=tbSoc.peCod[cod];return '<p class="tbSub tbIncredere">🎯 '+escapeHtml((x&&x.nume?x.nume+": ":"")+SemnaleBot.textIncredere(x||null,cod))+(x&&x.stare==="ajuta"?' <b class="good">merită ascultat</b>':'')+'</p>'}   // v100.39: pragul de minus atins, pe bot (histerezis)
/* v100.332 (auditul 12.11, 🟡3): planul are stări, nu doar „e / nu e”. Înainte cererea picată era înghițită (catch gol) și pagina zicea 10 minute
   „Nu ai un plan pentru bot”, iar semaforul lucra fără „pragul tău e atins”. „neadus” = încă n-a venit · „eroare” = cererea a picat (se reia la 30 s;
   pe Radarul publicat, fără KV, nu) · „gol” = citit, n-are plan · „pus”. Un plan deja citit nu se aruncă la o reîmprospătare picată. */
function tbPlanCitire(b){
  if(!b||tbPlan.botId!==b.id)return "neadus";
  if(tbPlan.eroare)return "eroare";
  if(!(tbPlan.la>0))return "neadus";
  return tbPlan.plan&&(tbPlan.plan.plus||tbPlan.plan.minus||tbPlan.plan.afaraOre)?"pus":"gol";
}
async function tbAduPlan(b){
  try{var p=await getJSON("/api/istoric-bot?action=plan&bot="+encodeURIComponent(b.id));tbPlan={botId:b.id,plan:p&&p.plan||null,la:Date.now()};tbPlanInForm()}
  catch(e){if(!(tbPlan.botId===b.id&&tbPlan.la>0))tbPlan={botId:b.id,plan:null,la:0,eroare:e&&e.status===503?"planul se ține doar pe Radarul de pe server":textEroare(e),eroareLa:Date.now(),faraServer:!!(e&&e.status===503)}}
}
/* v100.385 (I-931, el: „fă tot” după auditul paginii): fluxul monedei botului sub „Stopul, gridul, mișcarea” - OI, funding-ul Pionex în bani pe poziția lui,
   long/short (TabloExtra.fluxBot / textFlux); o dată la 5 minute pe monedă. Locul se face singur după #tbConcret (index.html neatins). */
var tbFlux={sim:null,la:0,inLucru:false,f:null,px:null};
async function tbAduFlux(b){
  if(!b||!b.baza||tbFlux.inLucru||typeof TabloExtra==="undefined"||!TabloExtra.fluxBot)return;
  var baza=String(b.baza).replace(/\.PERP$/,"").toUpperCase(),sim=simBinanceFut(baza+"USDT");
  if(tbFlux.sim===sim&&Date.now()-tbFlux.la<5*60000){tbDeseneazaFlux(b);return}
  tbFlux.inLucru=true;
  try{var px=TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex,rr=await Promise.all([getJSON("/api/market?type=futures&symbol="+encodeURIComponent(sim)).catch(function(){return null}),getJSON("/api/market?type=pionex_funding&symbol="+encodeURIComponent(px)).catch(function(){return null})]);
    var k1=await getJSON("/api/market?type=pionex_klines&symbol="+encodeURIComponent(px)+"&interval=1D&limit=500").catch(function(){return null});   /* v100.386 (I-938): vârsta contractului și volumul de azi */
    tbFlux={sim:sim,la:Date.now(),inLucru:false,f:rr[0]&&!rr[0].faraContract?rr[0]:null,px:rr[1]&&rr[1].data&&Array.isArray(rr[1].data.rates)?rr[1].data.rates:null,k1d:k1&&k1.data&&Array.isArray(k1.data.klines)?k1.data.klines:null}}
  catch(e){tbFlux={sim:sim,la:Date.now(),inLucru:false,f:null,px:null}}
  if(tbPanouVizibil()&&tbStare.bot&&tbStare.bot.id===b.id)tbDeseneazaFlux(tbStare.bot)}
function tbDeseneazaFlux(b){
  var cc=$("tbConcret");if(!cc||!cc.parentNode)return;var el=$("tbFlux");
  if(!el){el=document.createElement("p");el.id="tbFlux";el.className="tbSub tbFlux";cc.parentNode.insertBefore(el,cc.nextSibling)}
  tbFluxLoc(el);   /* v100.387: în capitolul Riscul, nu la capătul paginii (regula .tbCadru>*{order:900}) */
  var r=b&&tbFlux.f?TabloExtra.fluxBot(tbFlux.f,tbFlux.px,b):null;
  if(!r){el.hidden=true;return}
  el.hidden=false;el.className="tbSub tbFlux tbFlux-"+r.ton;el.textContent=(r.ton==="rau"?"⚠ ":"")+TabloExtra.textFlux(r,String(b.baza||"").replace(/\.PERP$/,""));
  /* v100.386 (I-938): riscul pieței monedei, pe rândul de sub flux */
  var er=$("tbRiscPiata");if(!er){er=document.createElement("p");er.id="tbRiscPiata";er.className="tbSub tbFlux";el.parentNode.insertBefore(er,el.nextSibling)}
  tbFluxLoc(er);
  var rp=TabloExtra.riscPiata?TabloExtra.riscPiata(tbFlux.k1d,b,tbFlux.f&&tbFlux.f.markPrice,TabloExtra.pretStopLive&&b.opritorPierdereActiv?TabloExtra.pretStopLive(b):null):null;
  if(!rp){er.hidden=true;return}er.hidden=false;er.className="tbSub tbFlux tbFlux-"+rp.ton;er.textContent=TabloExtra.textRiscPiata(rp)}
async function tbAduSaptamana(b){
  if(!b||!b.id||tbSapt.inLucru)return;
  if(tbSapt.botId===b.id&&Date.now()-tbSapt.la<10*60000){
    /* planul picat se cere din nou la 30 s, fără istoricul de 7 zile (acela are ritmul lui, 10 minute) */
    if(tbPlanCitire(b)!=="eroare"||tbPlan.faraServer||Date.now()-(tbPlan.eroareLa||0)<30000)return;
    tbSapt.inLucru=true;
    try{await tbAduPlan(b)}finally{tbSapt.inLucru=false}
    if(tbPanouVizibil()&&tbStare.bot&&tbStare.bot.id===b.id){tbDeseneazaSemafor(tbStare.bot);tbDeseneazaSaptPlan(tbStare.bot)}
    return;
  }
  tbSapt.inLucru=true;
  try{var d=await getJSON("/api/istoric-bot?action=citeste&ore=168&bot="+encodeURIComponent(b.id));tbSapt={botId:b.id,la:Date.now(),intrari:Array.isArray(d.intrari)?d.intrari:[],eroare:null,inLucru:true}}
  catch(e){tbSapt={botId:b.id,la:Date.now(),intrari:null,eroare:e&&e.status===503?"doar pe Radarul de pe server":textEroare(e),inLucru:true}}
  try{await tbAduPlan(b)}finally{tbSapt.inLucru=false}
  /* planul sosit schimbă și verdictul (pragul atins, podeaua): semaforul întâi, cartela planului îi ia fraza (🟡1) */
  if(tbPanouVizibil()&&tbStare.bot&&tbStare.bot.id===b.id){tbDeseneazaSemafor(tbStare.bot);tbDeseneazaSaptPlan(tbStare.bot);if(typeof tbDeseneazaBanii==="function")try{tbDeseneazaBanii(tbStare.bot)}catch(e){}}   /* v100.385 (I-930): curba din istoria sosită */
}
// v97.6 (27.09, ICP pornit fara plan): propunerea de plan pentru botul care n-are, dupa planul lui cel mai nou
var tbPropPlan={botId:null,p:null,inLucru:false};
async function tbAduPropunerePlan(b){
  if(!b||tbPropPlan.inLucru||tbPropPlan.botId===b.id)return;
  tbPropPlan={botId:b.id,p:null,inLucru:true};
  var ult=null;
  try{var u=await getJSON("/api/istoric-bot?action=ultimulPlan");
    if(u&&u.plan){ult={plus:u.plan.plus,minus:u.plan.minus,afaraOre:u.plan.afaraOre,la:u.plan.la};
      try{var fb=await getJSON("/api/bot-orders?status=finished&limit=30"),fa=await getJSON("/api/bot-orders").catch(function(){return null}),x=(fb&&fb.bots||[]).concat(fa&&fa.bots||[]).find(function(y){return y&&String(y.id)===String(u.bot)});if(x){ult.investit=botiNr(x.investit);ult.nume=String(x.baza||"").replace(/\.PERP$/,"")}}catch(e){}}}catch(e){}
  try{await grFranaAdu()}catch(e){}   // v100.103 (I-536)
  tbPropPlan={botId:b.id,p:TabloExtra.propunePlan(ult,b.investit,grFrana.prag),inLucru:false};
  if(tbPanouVizibil()&&tbStare.bot&&tbStare.bot.id===b.id)tbDeseneazaSemafor(tbStare.bot);
}
function tbPunePlanPropus(){
  var p=tbPropPlan.p;if(!p)return;
  [["tbPlanPlus","plus"],["tbPlanMinus","minus"],["tbPlanAfara","afaraOre"]].forEach(function(x){var e=$(x[0]);if(e&&p[x[1]]!=null)e.value=String(p[x[1]]).replace(".",",")});
  tbPlanSalveaza().then(function(){if(tbStare.bot)tbDeseneazaSemafor(tbStare.bot)});
}
/* v100.332 (auditul 12.11, 🟡2): formularul planului e al botului de pe ecran. Înainte câmpurile se umpleau doar când erau goale, deci la alt bot
   rămâneau cifrele celui dinainte, iar „Salvează planul” le scria pe botul nou. tbPlanFormSinc (chemată la fiecare desen al cartelei) rescrie
   câmpurile când s-a schimbat botul (goale dacă planul lui n-a venit sau n-are); pe același bot, ce tastezi rămâne. */
function tbPlanFormSinc(b){
  var id=b&&b.id!=null?String(b.id):null;if(tbStare.planFormBot===id)return;
  tbStare.planFormBot=id;
  var p=id&&String(tbPlan.botId)===id&&tbPlan.plan?tbPlan.plan:{};
  [["tbPlanPlus","plus"],["tbPlanMinus","minus"],["tbPlanAfara","afaraOre"]].forEach(function(x){var e=$(x[0]);if(e)e.value=p[x[1]]!=null?String(p[x[1]]):""});
}
function tbPlanInForm(){if(tbStare.planFormBot!=null&&String(tbPlan.botId)!==tbStare.planFormBot)return;var p=tbPlan.plan||{};[["tbPlanPlus","plus"],["tbPlanMinus","minus"],["tbPlanAfara","afaraOre"]].forEach(function(x){var e=$(x[0]);if(e&&!e.value&&p[x[1]]!=null)e.value=String(p[x[1]])})}
async function tbPlanSalveaza(){
  var b=tbStare.bot;if(!b)return;
  var plan={plus:grNumar($("tbPlanPlus")&&$("tbPlanPlus").value),minus:grNumar($("tbPlanMinus")&&$("tbPlanMinus").value),afaraOre:grNumar($("tbPlanAfara")&&$("tbPlanAfara").value)};
  try{var r=await apiFetch("/api/istoric-bot?action=plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({bot:b.id,plan:window.__proba?Object.assign({proba:true},plan):plan})});var d=await r.json();
    if(!r.ok)throw Object.assign(new Error(d&&d.error||("HTTP "+r.status)),{status:r.status});
    tbPlan={botId:b.id,plan:d.plan,la:Date.now()};toast("Planul e salvat; colectorul te anunță când atingi un prag","good")}
  catch(e){toast("Nu am putut salva planul: "+(e&&e.status===503?"doar pe Radarul de pe server":textEroare(e)),"bad")}
  if(tbStare.bot&&tbStare.bot.id===b.id)tbDeseneazaSemafor(b);   /* v100.332 (🟡1): planul nou schimbă verdictul; cartela îi ia fraza */
  tbDeseneazaSaptPlan(b);
}
function tbMarjaCalc(v){
  var b=tbStare.bot,el=$("tbMarjaRez");if(!el)return;var P=(typeof grProc==="function"?grProc:GridCalcul.procent);
  var r=b?TabloExtra.marjaNoua(b,grNumar(v)):null;
  if(!r){el.innerHTML='<p class="tbSub">'+(b&&b.directie!=="long"&&b.directie!=="short"?"La grid neutru lichidarea are două părți; nu socotesc.":!(grNumar(v)>0)?"Scrie o sumă mai mare ca 0.":"Acum botul n-are poziție (sau Pionex n-a dat prețul de lichidare): marja nu are ce muta.")+'</p>';return}
  el.innerHTML='<div class="tbLinie"><span>Lichidarea acum</span><b>'+escapeHtml(grPret(r.inainte,null))+'</b></div><div class="tbLinie"><span>Cu +'+escapeHtml(String(grNumar(v)))+' USDT marjă</span><b class="good">'+escapeHtml(grPret(r.lichidare,null))+(r.distantaPct!=null?' <span class="tbSub">('+P(r.distantaPct)+' de preț)</span>':'')+'</b></div><p class="tbSub">Aproximare: marja izolată în plus împinge lichidarea cu suma / poziție. Pionex poate rotunji puțin altfel.</p>';
}
function tbDeseneazaSaptPlan(b){
  var el=$("tbSapt"),ps=$("tbPlanStare"),P=(typeof grProc==="function"?grProc:GridCalcul.procent);if(!el||!ps)return;
  if(typeof tbPlanFormSinc==="function")tbPlanFormSinc(b);   /* v100.332 (🟡2): formularul e al botului de pe ecran */
  tbRenderTodo();
  if(!b){el.innerHTML=ps.innerHTML='<p class="tbSub">Fără bot citit.</p>';return}
  // (1) saptamana
  if(tbSapt.botId!==b.id)el.innerHTML='<p class="tbSub">aduc istoricul de 7 zile…</p>';
  else if(tbSapt.eroare)el.innerHTML='<p class="tbSub">'+escapeHtml(tbSapt.eroare)+'</p>';
  else{
    var z=TabloExtra.peZile(tbSapt.intrari||[],"Europe/Bucharest");
    if(!z.length)el.innerHTML='<p class="tbSub">Colectorul n-a strâns încă istoric pentru botul ăsta.</p>';
    else{var mx=Math.max.apply(null,z.map(function(x){return Math.abs(x.grile||0)}).concat([0.01]));
      el.innerHTML='<div class="tbZile">'+z.map(function(x){var h=x.grile==null?0:Math.round(Math.abs(x.grile)/mx*100);return '<div class="tbZi" title="'+escapeHtml(x.zi)+'"><span class="tbSub">'+(x.grile==null?"—":(x.grile>=0?"+":"−")+Math.abs(x.grile).toFixed(1).replace(".",","))+'</span><i class="'+(x.grile!=null&&x.grile<0?"neg":"poz")+'" style="height:'+h+'%"></i><span class="tbEt2">'+escapeHtml(x.zi.slice(8,10)+"."+x.zi.slice(5,7))+'</span><span class="tbSub '+(x.total==null?"":x.total>=0?"good":"bad")+'">'+(x.total==null?"—":(x.total>=0?"+":"−")+Math.abs(x.total).toFixed(1).replace(".",","))+'</span></div>'}).join("")+'</div><p class="tbSub">Bara = cât au adus grilele în ziua aceea; dedesubt, totalul botului seara. Din istoricul strâns de colectorul de pe VPS (7 zile).</p>';}
  }
  // (3) planul
  /* v100.332 (auditul 12.11, 🟡3): planul încă neadus sau cu cererea picată nu e „Niciun plan încă” */
  var stCit=typeof tbPlanCitire==="function"?tbPlanCitire(b):"pus";
  if(stCit==="neadus"){ps.innerHTML='<p class="tbSub">aduc planul botului…</p>';return}
  if(stCit==="eroare"){ps.innerHTML='<p class="tbSub">Nu pot citi planul acum: '+escapeHtml(tbPlan.eroare)+(tbPlan.faraServer?"":". Reîncerc singur.")+'</p>';return}
  var st=TabloExtra.planStare(b,tbPlan.botId===b.id?tbPlan.plan:null,{afaraDe:null},Date.now());
  if(!st||(!st.plus&&!st.minus&&!st.afara)){ps.innerHTML='<p class="tbSub">Niciun plan încă: scrie-l acum, la rece, nu când prețul fuge.</p>';return}
  /* v100.332 (auditul 12.11, 🟡1): fraza cartelei = a semaforului desenat pe ACELAȘI plan (tbStare.semUlt), nu una fixă - o singură voce */
  var suP=tbStare.semUlt,smP=suP&&suP.bot===b.id&&suP.planLa===(tbPlan.botId===b.id?tbPlan.la:0)?suP.sm:null,pcP=typeof SemnaleBot!=="undefined"&&SemnaleBot.planPeCartela?SemnaleBot.planPeCartela(st,smP):{plus:null,faCe:null};
  var U=function(v){return TextRo.usdt(v)},h="";   // v100.62: cifrele cu virgula, „închide botul” (vocabularul unic)
  if(st.plus)h+='<div class="tbLinie"><span>Țintă pe plus: '+U(st.plus.prag)+'</span><b class="'+(st.plus.lipsa<=0?"good":"")+'">'+(st.plus.lipsa<=0?escapeHtml(pcP.plus||"atinsă"):"mai sunt "+TextRo.num(st.plus.lipsa,2)+" USDT")+'</b></div>';
  if(st.minus)h+='<div class="tbLinie"><span>Ies dacă pierd '+TextRo.num(st.minus.prag,2)+' USDT</span><b class="'+(st.minus.lipsa<=0?"bad":st.minus.lipsa<st.minus.prag*0.25?"tbWarn":"")+'">'+(st.minus.lipsa<=0?"atins: închide botul":"mai sunt "+TextRo.num(st.minus.lipsa,2)+" USDT")+'</b></div>';
  // v100.45 (I-475): cat de des o zi obisnuita a monedei ajunge la planul pe minus, si pragul atins in cel mult 1 zi din 4
  var prP=tbProfilPt(b),dP=String(b.directie||"").toLowerCase(),pP=botiNr(b.pretCurent);
  if(st.minus&&st.minus.opritorPlan!=null&&pP>0){var pmP=ProfilMoneda.planPeMoneda({profil:prP,dir:dP,dist:Math.abs(st.minus.opritorPlan/pP-1),laDist:function(dd){return TabloExtra.totalCuGridLa(b,dP==="short"?pP*(1+dd):pP*(1-dd))}});
    h+=pmP?'<p class="'+(pmP.avertizare?"tbFac tbWarn":"tbSub")+'">📏 '+escapeHtml(pmP.text)+'</p>':tbProfil.faraServer?'':'<p class="tbSub">📏 Cât de des e atins planul pe moneda asta: profilul monedei vine de la colector (noaptea).</p>'}
  if(st.afara)h+='<div class="tbLinie"><span>Afară din grid peste '+TextRo.oreN(st.afara.prag)+'</span><b>colectorul numără orele</b></div>';
  ps.innerHTML=h+(pcP.faCe?'<p class="tbFac">👉 <b>Ce aș face eu:</b> '+escapeHtml(pcP.faCe)+'</p>':st.atins.length?'<p class="tbSub">Ce aș face eu e în Consilier, mai sus.</p>':'');
}
// ===== v82: semaforul botului + muta gridul + socoteala semnalelor =====
var tbSem={botId:null,la:0,v:null,inLucru:false};
async function tbAduSemnale(b){
  if(!b||!b.id||tbSem.inLucru||(tbSem.botId===b.id&&Date.now()-tbSem.la<2*60000))return;
  tbSem.inLucru=true;
  try{var d=await getJSON("/api/istoric-bot?action=semnale&bot="+encodeURIComponent(b.id));tbSem={botId:b.id,la:Date.now(),v:d&&d.semnale||null,inLucru:false}}
  catch(e){tbSem={botId:b.id,la:Date.now(),v:null,inLucru:false}}
  if(tbPanouVizibil()&&tbStare.bot&&tbStare.bot.id===b.id)tbDeseneazaSemafor(tbStare.bot);
}
function tbDeseneazaPortofoliu(){
  var card=$("tbPortCard"),el=$("tbPort"),sub=$("tbPortSub");if(!card||!el)return;
  var boti=(tbStare.boti||[]).filter(function(b){return b&&b.activ!==false});
  if(boti.length<2){card.hidden=true;return}
  card.hidden=false;
  var e=tbStare.extra||{},sold=grSoldCitit().sold||(e.futures&&e.futures.total>0?e.futures.total:null),p=Obiceiuri.portofoliu(boti,sold);
  if(sub)sub.textContent=TextRo.cate(p.n,"bot activ","boți activi")+(sold?" · sold "+sold+" USDT":"");
  var U=function(v){return TextRo.usdt(v,1)};   /* v100.196: o zecimală, virgula */
  el.innerHTML='<div class="tbLinie"><span>Pe fiecare parte</span><b>'+p.peParte.long+' long · '+p.peParte.short+' short · '+p.peParte.neutru+' neutru</b></div>'
    +'<div class="tbLinie"><span>Expunerea (sumă × levier)</span><b>'+p.expunere.toFixed(0)+' USDT'+(p.expunerePeSold!=null?' · '+p.expunerePeSold.toFixed(1).replace(".",",")+'× soldul':'')+'</b></div>'
    +'<div class="tbLinie"><span>Dacă toată piața scade 10%</span><b class="'+(p.soc10<0?"bad":"good")+'">'+U(p.soc10)+'</b></div>'
    +'<p class="tbSub">Cu ce mai cumpără botul pe drum. Fundingul viitor nu e în cifră.</p>'   /* v100.222 (I-726) */
    +(p.lichidatiLaSoc.length?'<div class="tbLinie"><span>S-ar lichida la −10%</span><b class="bad">'+escapeHtml(p.lichidatiLaSoc.join(", "))+'</b></div>':'')
    +tbBusolaPortofoliu(boti)
    +tbBtcPortofoliu(boti)
    +(p.acelasiPariu?'<p class="tbSub">'+TextRo.cate(Math.max(p.peParte.long,p.peParte.short),"bot","boți")+' pe aceeași parte sunt un singur pariu, nu mai multe.</p><p class="tbFac">👉 <b>Ce aș face eu:</b> N-aș mai porni unul pe partea asta, ci unul neutru sau pe partea cealaltă.</p>':'');
}
// v100.148 (I-575, revizia Opus: pe cartela portofoliului, nu în „Contextul” botului - citirea îl are deja): boții deschiși față de BTC
function tbBtcPortofoliu(boti){if(typeof Busola==="undefined"||!Busola.rezumat())return "";var t=Busola.liniaBtc(Busola.rezumat(),boti.map(function(b){return {nume:String(b.baza||"").replace(/\.PERP$/,""),cheie:tbCheieBusola(b),directie:b.directie}}),Date.now(),220);
  return t?'<div class="tbLinie"><span>BTC și boții tăi</span><b class="'+(/ CONTRA/.test(t)?"tbWarn":"tbSubVal")+'">'+escapeHtml(t)+'</b></div>':""}
// v100.90 (I-513): Busola pe toți boții deschiși, pe un rând („AAVE mai agitată de 8 h · LIT mai calmă de 2,5 h”); fără rezumat ⇒ nimic
function tbBusolaPortofoliu(boti){if(typeof Busola==="undefined"||!Busola.rezumat())return "";var acum=Date.now(),t=Busola.liniaBoti(boti.map(function(b){var k=tbPazaKv.boti[b.id],s=Busola.pazaStare(Busola.rezumat(),tbCheieBusola(b),acum);return {nume:String(b.baza||"").replace(/\.PERP$/,""),stare:s?s.stare:null,de:k&&s&&k.stare===s.stare?k.de:null}}),acum);return t?'<div class="tbLinie"><span>Busola, pe 4h</span><b>'+escapeHtml(t)+'</b></div>':""}
// v97.8 (27.09, fara niciun bot pornit): in locul semaforului, pregatirea urmatorului bot - fisa de inchidere a ultimului,
// vremea pietei (ca pe Home) si primele 3 monede din reteta de grid a Scanului („Candidați de grid”), fiecare cu fisa ei
var tbPreg={la:0,inLucru:false,fisa:null,vreme:null,grid:null};
async function tbPregatireAdu(){
  if(tbPreg.inLucru||Date.now()-tbPreg.la<5*60000)return;
  tbPreg.inLucru=true;
  try{
    var fb=await getJSON("/api/bot-orders?status=finished&limit=1"),x=fb&&fb.bots&&fb.bots[0],sc=null;
    try{sc=await getJSON("/api/istoric-bot?action=scan")}catch(e){}
    if(x){var pl=null;try{var p=await getJSON("/api/istoric-bot?action=plan&bot="+encodeURIComponent(x.id));pl=p&&p.plan&&!p.plan.proba?p.plan:null}catch(e){}
      var sim=String(x.baza||"").replace(/\.PERP$/,""),r=sc&&sc.crypto?(sc.crypto.randuri||[]).find(function(q){return q.s===sim}):null;
      tbPreg.fisa=TabloExtra.fisaInchidere(x,{plan:pl,atrPct:r?r.atrPct:null})}
    /* v100.329 (el: verdictele „la fel la crypto și la nasdaq”): vremea din funcțiile comune ale paginii Piața azi - aceleași date, același BTC,
       ACEEAȘI frână (înainte: socotită aici, fără frână și fără frica / lăcomia; 12.11 „Aș porni boți…” lângă frâna paginii) */
    if(sc&&sc.crypto&&typeof Scan!=="undefined"){var g=Scan.RETETE.find(function(q){return q.k==="grid"});
      tbPreg.grid=(sc.crypto.randuri||[]).map(function(q){return Object.assign({fel:"c"},q)}).filter(g.f).sort(function(a,b2){return (b2.gs||0)-(a.gs||0)}).slice(0,3);
      /* v100.343 (I-884): mișcarea pe 7 zile a fiecărei monede din Scan - banda „Pe ce aș porni” o arată pe rândurile ei */
      tbPreg.ch7={};(sc.crypto.randuri||[]).forEach(function(q){if(q&&q.s&&isFinite(q.ch7))tbPreg.ch7[q.s]=q.ch7});if(typeof tbIdeiRender==="function")tbIdeiRender()}
    /* revizia Opus: vremea după candidații grid (nu-i mai ține pe loc) */
    try{if(typeof acVremeAsigura==="function"&&typeof acVremeCrypto==="function"){await acVremeAsigura();tbPreg.vreme=acVremeCrypto(acasa.d)}}catch(e){}
    tbPreg.la=Date.now();
  }catch(e){tbPreg.la=Date.now()-4*60000}
  finally{tbPreg.inLucru=false}
  var el=$("tbSemafor");if(el&&!(tbStare.bot))tbPregatire(el);
}
function tbPregatire(el){
  if(tbStare.citireGoala){el.innerHTML='<div class="tbPreg"><p class="tbWarn">Citirea a venit goală: țin boții de dinainte.</p></div>';return}
  if(Date.now()-tbPreg.la>=5*60000&&!tbPreg.inLucru)tbPregatireAdu();
  var h='<div class="tbPreg"><div class="tbSemCap"><span class="tbSemNivel">🅿️ FĂRĂ BOT</span><div><b>Niciun bot pornit acum — pregătirea următorului</b><p class="tbSub">ce a fost, cum e piața, pe ce aș porni</p></div></div>';
  var f=tbPreg.fisa,v=typeof acVremeCrypto==="function"&&typeof acasa!=="undefined"&&acasa.d&&acasa.d.clasament?acVremeCrypto(acasa.d):tbPreg.vreme,g=tbPreg.grid,an=typeof acAziNu==="function"?acAziNu():null,nu=!!(an&&an.nu);   /* v100.306 (I-824): regula comună „azi nu” · v100.329: vremea comună, cu frâna de acum */
  if(!f&&!v&&!g)return el.innerHTML=h+'<p class="tbSub">'+(tbPreg.inLucru?"aduc ultimul bot închis, vremea și candidații…":"—")+'</p></div>';
  if(f)h+='<div class="tbPregBloc"><h5>Ultimul bot închis</h5><p class="tbPregTitlu '+(f.nivel==="info"?"good":f.nivel==="critic"?"bad":"tbWarn")+'">'+escapeHtml(f.titlu.replace(/^🔍 /,""))+'</p>'+f.mesaj.split("\n").map(function(t){return '<p class="tbPregRand">'+escapeHtml(t)+'</p>'}).join("")+'</div>';
  var fcT=typeof acFranaContText==="function"?acFranaContText():"";   /* v100.330: frâna contului separat de vremea crypto (ca pe Piața azi) */
  /* v100.332 (12.11, pe pagina vie): raportul contului sau calendarul încă nevenite ⇒ frâna e NECUNOSCUTĂ, nu netrasă - se spune „încă verific” */
  var fcStiut=typeof acFranaContStiut==="function"?acFranaContStiut():true;
  if(v)h+='<div class="tbPregBloc"><h5>Vremea pieței</h5><p class="tbPregTitlu">'+escapeHtml(v.eticheta)+' — '+escapeHtml(v.titlu)+'</p>'+(v.faCe?'<p class="tbFac">👉 <b>Ce aș face eu:</b> '+escapeHtml(v.faCe)+'</p>':'')+(fcT?'<p class="tbWarn">⛔ <b>Frâna contului azi:</b> '+escapeHtml(fcT)+'</p>':!fcStiut?'<p class="tbSub">⏳ Frâna contului: încă verific raportul contului și calendarul zilei.</p>':'')+'</div>';
  /* v100.343 (I-884): candidații nu se mai repetă aici (erau 3 din Scan aici și 5 în banda „Pe ce aș porni”, uneori alte monede) - lista e o singură
     dată, în bandă (#tbIdei), care poartă acum și grilele, pasul și mișcarea pe 7 zile; toți candidații rămân la un clic, în Scan */
  if(g&&g.length)h+='<div class="tbPregBloc"><h5>'+(nu?'Candidați de grid · azi nu pornesc':'Pe ce aș porni')+'</h5><p class="tbPregRand">Lista e o singură dată, în „'+(nu?'Candidatele pentru un bot':'Pe ce aș porni un bot acum')+'”, mai sus pe pagină'+(nu?'':' (pliată, banda se numește „Candidatele pentru un bot”)')+': cu istoricul tău pe fiecare monedă și cu Fișa (și cei din Scan pe care îi vedeai aici). Toți candidații sunt în Scan, la rețeta 🟦.</p><button type="button" class="tbBtnLinie" data-action-click="navTo(\'scan\',true)">Scan →</button></div>';
  el.innerHTML=h+'</div>';
}
// v100 (demo-ul aprobat 28.09): verdictul SCURT (nivel + motivul principal + "ce as face" + "si inca N motive"), celelalte motive pe
// randul lor (#tbMotive), "Acum, concret" in 3 cartele (#tbConcret), socoteala si podeaua pe bani in sectiunea pliata (#tbSocoteala).
var tbMotiveDeschis=false;
function tbMotiveComuta(){tbMotiveDeschis=!tbMotiveDeschis;if(tbStare.bot)tbDeseneazaSemafor(tbStare.bot)}
function tbDeseneazaSemafor(b){
  var el=$("tbSemafor");if(!el)return;
  var mot=$("tbMotive"),cc=$("tbConcret");
  // fara bot (sau ruta picata): cartelele, motivele si socoteala NU raman cu cifrele botului de dinainte (revizia v100)
  if(!b){tbStare.concSus=null;if(mot)mot.hidden=true;if(cc)cc.hidden=true;if($("tbPl-prob"))$("tbPl-prob").hidden=true;var s0=$("tbSocoteala");if(s0)s0.innerHTML='<p class="tbSub">Fără bot citit.</p>';if(tbStare.routeOk!==false)tbPregatire(el);return}
  var f=tbFisa.botId===b.id?tbFisa.fisa:null,kv=tbSem.botId===b.id&&tbSem.v?tbSem.v:null,ac=kv&&kv.acum&&kv.acum.la&&Date.now()-kv.acum.la<20*60000?kv.acum:null;
  var plan=TabloExtra.planStare(b,tbPlan.botId===b.id?tbPlan.plan:null,{afaraDe:ac&&ac.afaraOre?Date.now()-ac.afaraOre*3600000:null,minusAtins:tbMinusAtins[b.id]===true},Date.now());
  if(plan)tbMinusAtins[b.id]=plan.atins.indexOf("minus")>=0;   // v100.39: histerezis pe pragul de minus (ca in colector)
  var prT=tbProfilPt(b),pmT=ProfilMoneda.praguriMargine(prT),psT=ProfilMoneda.pragStop(prT,String(b.directie||"").toLowerCase());   // v100.45 (pachetul 1)
  var muta=SemnaleBot.mutaGridul(b,f,ac?ac.afaraOre:0,pmT),iap=SemnaleBot.iaProfit(b,f),zero=TabloExtra.dacaInchizi(b),costuri=TabloExtra.grileVsCosturi(b,Date.now());
  var sm=SemnaleBot.semafor({bot:b,fisa:f,zero:zero,plan:plan,costuri:costuri,btc:ac&&ac.btc&&ac.btc.text?ac.btc:null,aglomerare:ac&&ac.aglomerare&&ac.aglomerare.text?ac.aglomerare:null,muta:muta,iaProfit:iap,distInainte:SemnaleBot.distantaLaOra(tbSapt.botId===b.id?tbSapt.intrari:null,Date.now(),3600000),busola:tbBusolaVerdict(b)});   /* v100.60: lichidarea se apropie sau se indeparteaza; v100.92 (I-523): Busola */
  tbStare.semUlt={bot:b.id,planLa:tbPlan.botId===b.id?tbPlan.la:0,sm:sm};   /* v100.332 (🟡1): cartela planului ia fraza de aici */
  var N={tine:["🟢 ȚINE","good"],atentie:["🟡 ATENȚIE","tbWarn"],iesi:["🔴 IEȘI","bad"],asteapta:["⏳ SOCOTESC","neutral"]},n=N[sm.nivel]||N.asteapta;
  var CUL={iesi:"var(--bad)",atentie:"var(--warn)",podea:"var(--good)"},mare=function(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1)};
  // v97.6: botul n-are plan -> sus, inaintea semaforului: propunerea si un singur buton
  var faraPlan=tbPlan.botId===b.id&&tbPlan.la&&!(tbPlan.plan&&(tbPlan.plan.plus||tbPlan.plan.minus||tbPlan.plan.afaraOre));
  if(faraPlan&&tbPropPlan.botId!==b.id)tbAduPropunerePlan(b);
  var pp=faraPlan&&tbPropPlan.botId===b.id?tbPropPlan.p:null;
  var conc=SemnaleBot.acumConcret({bot:b,fisa:f,zero:zero,costuri:costuri,plan:plan,pragMargine:pmT,pragStop:psT,stopZgomot:typeof tbStopZgomot==="function"?tbStopZgomot(b):null,acum:Date.now(),cifre:function(pr){return TabloExtra.cifreActiuni(b,{protectie:pr,b15:tbFisa.botId===b.id?tbFisa.b15:null})}});
  tbStare.concSus={bot:b.id,conc:conc};   /* v100.377: aceleași trei sfaturi, arătate și sus, în cutia „Contează acum” (tbConcretSusHtml) */
  // v100.51 (I-476): liniile Consilierului pe grafic - stopul tau de acum si stopul planului (din cartela Stopul)
  var csG=conc.filter(function(c){return c&&c.cod==="stop"})[0],cfG=csG&&csG.cifre;
  tbStare.consLinii={bot:b.id,stopAcum:SemnaleBot.pretStopEcran(b),stopPlan:cfG&&botiNr(cfG.pretPropus)!==null?botiNr(cfG.pretPropus):null};   /* v100.222 (I-721) */
  var h=faraPlan?'<div class="tbFaraPlan">📝 <b>'+escapeHtml(String(b.baza||"Botul").replace(/\.PERP$/,""))+' n-are plan.</b> Fără țintă și prag scrise la rece, panoul nu-ți poate spune când să încasezi sau să ieși (nici podeaua).'
    +(pp?'<span class="tbSub"> Propun: ieși pe plus la <b>+'+String(pp.plus).replace(".",",")+' USDT</b>, pe minus la <b>−'+String(pp.minus).replace(".",",")+' USDT</b>, după <b>'+pp.afaraOre+' h</b> afară din grid — '+escapeHtml(pp.nota)+'.</span> <button type="button" class="actionGhost" data-action-click="tbPunePlanPropus()">Pune planul propus</button>':' <span class="tbSub">calculez propunerea…</span>')+'</div>':'';
  // celelalte motive + notele (ia profit, aglomerarea "info") - pe randul lor, nu in cartela
  // "ia profit" e deja o componenta a verdictului: textul lui explicativ intra in randul lui, nu intr-un rand separat (revizia v100)
  var alte=SemnaleBot.celelalteMotive(sm).map(function(x){return {c:CUL[x.nivel]||"var(--muted)",m:x.motiv,k:x.cod,f:x.cod==="ia-profit"&&iap?iap.text+" "+x.faCe:x.faCe}});
  if(ac&&ac.aglomerare&&ac.aglomerare.text&&ac.aglomerare.nivel==="info")alte.push({c:"var(--muted)",m:ac.aglomerare.text,f:""});
  // v100.44 (I-465, demo aprobat 01.10): UN singur Consilier - toate sursele intr-un verdict, o actiune cu bani, 3 motive, restul pliat
  var vv=tbStare.verdictVechi,ind=$("tbIndicatoriRezumat");
  var cons=Consiliu.alcatuieste({sm:sm,concret:conc,busola:tbBusolaVerdict(b),regim:f&&f.regim?{miscare:!!f.regim.miscare}:null,sfaturi:tbStare.sfaturiLista||[],consilier:typeof consilierBot==="function"?consilierBot(b):[],socoteala:(tbAduSocoteala(),tbSoc.peCod),
    laJos:TabloExtra.totalCuGridLa(b,botiNr(b.gridJos)),jos:botiNr(b.gridJos),laSus:TabloExtra.totalCuGridLa(b,botiNr(b.gridSus)),sus:botiNr(b.gridSus),opritor:SemnaleBot.pretStopEcran(b),opritorProc:SemnaleBot.etichetaStopProc(b),opreste:vv&&vv.nivel==="OPRESTE"?{titlu:vv.titlu,ceFac:vv.ceFac}:null,perechi:tbPerechiPt(b),   /* v100.222 (I-721) */
    afaraContra:tbAfaraContra(b),total:botiNr(b.profitTotal),dovadaFaraStop:tbDovadaFaraStop(),sanseMargine:tbSanseMargine(b),   /* v100.374 (I-904, I-902) */
    indicatori:ind&&ind.textContent.trim()&&ind.textContent.trim()!=="—"?"Indicatorii: "+ind.textContent.trim():null,btc:ac&&ac.btc&&ac.btc.text?ac.btc.text:null,
    note:alte.filter(function(x){return !x.k}).map(function(x){return x.m})});
  // v100.50 (I-473/I-472): „de ce s-a schimbat” (din verdictul colectorului, daca e acelasi nivel) + socoteala deciziilor
  var ck=tbConsKvPt(b);tbStare.consUlt=cons;
  if(ck&&ck.cons&&ck.cons.deCe&&ck.cons.acum&&ck.cons.acum.nivel===cons.nivel&&ck.cons.schimbatLa){var mn=Math.round((Date.now()-ck.cons.schimbatLa)/60000);cons.deCeText=Consiliu.deCeAfisat(ck.cons.deCe,mn)}   /* v100.106: cu „a apărut / a dispărut” și „cifrele de atunci” */
  cons.decSoc=ck&&ck.soc&&ck.soc.text?ck.soc.text:null;
  cons.altaVoce=Consiliu.altaVoce(ck&&ck.cons,cons);   // revizia 01.10 (I2): cand Discord / pagina alerts spun altceva, se vede aici
  var tp=tbProbPt(b);cons.sansa=tp&&tp.rez&&!tp.rez.gol&&!tbProbVechi(tp.rez)?Probabilitati.rand(tp.rez,tp.cal,String(b.directie||"").toLowerCase()):null;tbDeseneazaProb(b);   // v100.46 (pachetul 2a)
  var r0=el.querySelector(".tbConsRest");if(r0)tbConsRestDeschis=!!r0.open;   // „Restul” ramane deschis la reimprospatare
  cons.pornitCa=tbPornitCaText(b);   /* v100.111 (I-550) */
  cons.planNecitit=tbPlanNecitit(b);   /* v100.333 (revizia Opus): planul necitit se spune lângă verdict */
  cons.rezumat=tbProb&&tbProb.rezumat||null;   /* v100.96: rândul modelelor stă sub eticheta verdictului (tbConsHtml), ca pe fișă */
  el.innerHTML=h+tbConsHtml(cons);$("tbSemaforCard").className="tbCons tbCons-"+cons.nivel;
  if(mot)mot.hidden=true;
  // "Acum, concret": cifra mare + eticheta + actiunea; detaliile (si setarile de copiat ale gridului propus) sub "detalii"
  var gmd=muta?null:SemnaleBot.gridMaiDes(b,f),T1=function(v){return v==null?"?":(Math.round(v*10)/10).toFixed(1).replace(".",",")};
  var prop=muta&&muta.setare?{setare:muta.setare,titlu:"Gridul propus acum (din fișa de azi"+(muta.des?", grid des 0,3%":"")+")",sub:muta.treceriZi!=null?"~"+T1(muta.treceriZi)+" perechi încheiate pe zi pe ultimele 30 de zile":""}
    :gmd?{setare:gmd.setare,titlu:"Grid mai des (0,3%)",sub:gmd.motiv+". Nu e o dovadă, e regula ta (0,30%); proba pe 30 z n-a respins-o."}:null;
  var propHtml="";
  if(prop){var s=prop.setare,i=grStare.monede&&grStare.monede[TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex];
    propHtml='<div class="tbMuta"><h5>'+escapeHtml(prop.titlu)+'</h5>'+(prop.sub?'<p class="tbSub">'+escapeHtml(prop.sub)+'</p>':'')+grRand("Direcție",GR_DIR_PIONEX[s.dir]||s.dir,GR_DIR_PIONEX[s.dir]||s.dir)+grRand("Preț de jos",grPret(s.jos,i),grPret(s.jos,i))+grRand("Preț de sus",grPret(s.sus,i),grPret(s.sus,i))+grRand("Număr de grile",(s.grile+1)+" geometric",String(s.grile+1))   /* v100.38: in Pionex = linii */+grRand("Levier",s.levier+"×",String(s.levier))+(s.stop&&s.dir!=="short"?grRand("Stop-loss jos",grPret(s.stop.jos,i),grPret(s.stop.jos,i)):"")+(s.stop&&s.dir!=="long"?grRand("Stop-loss sus",grPret(s.stop.sus,i),grPret(s.stop.sus,i)):"")   /* v100.39: short-ul n-avea niciun stop de copiat */+'</div>'}
  propHtml+=tbPlanVarHtml(b);   // v100.16: gridul dupa planul tau (al botului; fara el, propunerea)
  if(cc){
    cc.hidden=false;
    conc.forEach(function(x){
      var e=$("tbCc-"+x.cod);if(!e)return;var d0=e.querySelector("details"),deschis=!!(d0&&d0.open),tg=x.tag||{t:"",c:"mut"};
      e.innerHTML='<div class="tbCcCap"><h5>'+escapeHtml(x.titlu)+'</h5>'+(tg.t?'<span class="tbTag '+tg.c+'">'+escapeHtml(tg.t)+'</span>':'')+'</div>'
        +'<div class="tbCcMare">'+escapeHtml(x.mare||"—")+(x.mic?'<small>'+escapeHtml(x.mic)+'</small>':'')+'</div><p class="tbCcAct">'+escapeHtml(x.act||x.text)+'</p>'+(x.deCe?'<p class="tbSub tbCcDeCe">'+escapeHtml(x.deCe)+'</p>':'')+(x.sursa?'<p class="tbSub tbCcSursa">'+escapeHtml(x.sursa)+'</p>':'')+(x.bani?'<p class="tbCcBani">'+escapeHtml(x.bani)+'</p>':'')   /* v100.43 (I-467) */
        +(x.cod==="grid"&&tbTvCod()?'<button type="button" class="actionGhost tbTvBtn" value="'+escapeHtml(tbTvCod().cod)+'" data-action-click="gridCopiaza(this.value)" title="Rândul pentru indicatorul GRID-FISA din TradingView, cu gridul de acum al botului">📺 Codul pentru TradingView · copiază</button>':'')
        +(x.copie?'<button type="button" class="actionGhost tbTvBtn" value="'+escapeHtml(x.copie)+'" data-action-click="gridCopiaza(this.value)" title="Copiază procentul în Pionex. Prețul mare se mută când se umplu grilele.">copiază '+escapeHtml(x.copie)+'</button>':'')
        +'<details class="tbCcDet"'+(deschis?' open':'')+'><summary>'+(x.cod==="grid"&&propHtml?"setările de copiat și detalii":"detalii")+'</summary><p>'+escapeHtml(x.text)+'</p>'+(x.cod==="grid"?propHtml:"")+'</details>';
    });
  }
  if(typeof tbRenderConteaza==="function")tbRenderConteaza(true);   /* v100.377: cutia de sus ia sfaturile de acum (din listă nu se cheamă înapoi) */
  // socoteala semnalelor + "tinta devine podea, pe banii tai" + de unde vin BTC/aglomerarea -> sectiunea pliata de jos
  var socEl=$("tbSocoteala");
  if(socEl){
    var soc=kv?SemnaleBot.socoteala(kv.log||[]):null,E={tine:"ține",lichidare:"lichidare",plan:"planul tău",trend:"trend contra",miscare:"mișcare mare","ia-profit":"ia profit",muta:"mută gridul",costuri:"costuri",btc:"BTC în mișcare",aglomerare:"aglomerare",podea:"ținta devine podea","cu-botul":"mișcare cu botul"};
    // v97.1: podeaua pe banii lui - daca iesea la prima "tinta atinsa" fata de ce are acum (nerealizat pana inchide)
    var pb=kv?SemnaleBot.podeaPeBani(kv.log||[],b.profitTotal):null,U2=function(v){return TextRo.usdt(v,TextRo.zecMici(v))},sh="";
    if(pb)sh+='<p class="tbPodeaBani">🪜 <b>Ținta devine podea, pe banii tăi:</b> dacă ieșeai la prima „țintă atinsă” ('+escapeHtml(new Date(pb.la).toLocaleString("ro-RO",{weekday:"short",hour:"2-digit",minute:"2-digit"}))+') aveai <b>'+U2(pb.laIesire)+'</b>; acum botul are <b>'+U2(pb.acum)+'</b> — ținerea a adus <b class="'+(pb.dif>=0?"good":"bad")+'">'+U2(pb.dif)+'</b> până acum (nerealizat până închizi; opritorul hotărăște cât rămâne sigur).</p>';
    if(soc&&Object.keys(soc).length)sh+='<div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Semnal</th><th>Date</th><th>Judecate</th><th>Au avut dreptate</th><th>Pe bani, urmat</th></tr></thead><tbody>'+Object.keys(soc).map(function(k){var x=soc[k];return '<tr><td>'+escapeHtml(E[k]||k)+'</td><td>'+x.n+'</td><td>'+x.judecate+'</td><td>'+(x.rata==null?"încă nu":GridCalcul.procent(x.rata)+" ("+x.corecte+" din "+x.judecate+")")+'</td><td class="'+(x.baniN?(x.bani>=0?"good":"bad"):"")+'">'+(x.baniN?U2(x.bani):"încă nu")+'</td></tr>'}).join("")+'</tbody></table></div><p class="tbSub">„Pe bani, urmat” = câți USDT ar fi adus semnalul dacă îl urmai, în 24 h (plus = a ajutat, minus = te-ar fi costat). „Ieși/atenție” au avut dreptate dacă în 24 h totalul botului a scăzut (ieșirea ar fi salvat bani); „ține” dacă n-a scăzut. Sub 10 judecate, e doar începutul.</p>';
    if(!ac)sh+='<p class="tbSub">BTC și aglomerarea vin de la colectorul de pe VPS (la 5 min); '+(kv?"ultima lui socoteală e mai veche de 20 de minute.":"n-a trimis încă nimic pentru botul ăsta.")+'</p>';
    socEl.innerHTML=sh||'<p class="tbSub">Încă nimic de socotit pentru botul ăsta.</p>';
    var ps=$("tbPlSub-socoteala");if(ps)ps.textContent=soc&&Object.keys(soc).length?TextRo.cate(Object.keys(soc).length,"semnal urmărit","semnale urmărite")+" · au avut dreptate după 24 h?":"au avut dreptate după 24 h?";
  }
}
// v100.90 (I-513): starea Busolei pe moneda botului („mai agitată ca de obicei · de 8 h · măsurat acum 1 h”) - starea din rezumatul public
// (perp4h ?? grid4h ?? 4h, ca în fișă și în colector), „de când” din ruta `paza` (colectorul o ține în alerte-stare), adusă la 5 min
// revizia: cheia Busolei din TICKERUL Pionex (LIGHTER.PERP ⇒ LIT_USDT_PERP ⇒ LIT), nu din numele botului - 17 monede au baza altfel
function tbCheieBusola(b){return b.simbolPionex||TabloBot.simboluri(b.baza,b.quote).pionex}
var tbPazaKv={la:0,inLucru:false,boti:{}};
