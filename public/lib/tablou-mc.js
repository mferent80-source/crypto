/* tablou-mc.js — Monte Carlo pe botul tău (tbMc*: simularea, workerul, verdictul din KV, rândul de 24 h / 7 zile, scorul, istoricul) și clipa botului (tbInstantaneu)
   I-940 (auditul paginii botului, 24.11): mutat NESCHIMBAT din public/app.js (v100.388). Script clasic, încărcat ÎNAINTEA lui app.js:
   doar definiții (nimic nu rulează la încărcare), numele rămân globale ca înainte; ce folosește din app.js (tbStare, tbPlan, $ …)
   se citește abia la apel. Probele îl văd lipit de app.js prin scripts/lib/sursa-app.mjs (cuTablou). */
// v100.139 (el, 08.10: „tot acolo pune Monte Carlo cu un scan automat pe bot la 15 min să spună predicția” - a ales A, în pagină): primul rând
// din „Ce spune piața acum” = verdictul Simulatorului grid pe botul reluat cu pozițiile de acum (GridSim, 500 de drumuri pe 14 zile; pe 7 de la v100.271), socotit
// la 15 minute și la schimbarea botului; lumânările de 15 minute (~31 de zile) vin prin mcsAduCoin o dată pe monedă și se țin minte.
// Cuvântul e „șanse”, nu „predicție” (regula lui: clar și răspicat ce înseamnă cifra).
// v100.140 (ideea 1): simularea într-un Web Worker (lib/grid-sim-worker.js, aceleași module) - pagina nu îngheață; fără Worker, worker picat
// sau fără răspuns în TB_MC_WORKER_MS ⇒ pe fir, ca înainte (același rezultat, aceeași sămânță)
var tbMcWorker=null,tbMcWorkerId=0,tbMcWorkerCereri={},TB_MC_WORKER_MS=20000;
// v100.141 (ideea 3): pe telefon (ecran îngust) un worker care atârnă nu ține pagina 20 s - cad pe fir după 10 s
function tbMcWorkerAsteptare(){return typeof window!=="undefined"&&window.innerWidth<600?Math.min(TB_MC_WORKER_MS,10000):TB_MC_WORKER_MS}
function tbMcSimuleaza(b15,st,o){
  return new Promise(function(res,rej){
    var gata=false,fin=function(r){if(gata)return;gata=true;res(r)},cad=function(e){if(gata)return;gata=true;rej(e)};
    var peFir=function(){try{fin(GridSim.simuleaza(b15,st,o))}catch(e){fin({eroare:String(e&&e.message||e)})}};
    if(typeof Worker==="undefined")return peFir();
    try{
      if(!tbMcWorker){
        tbMcWorker=new Worker("/lib/grid-sim-worker.js");
        tbMcWorker.onmessage=function(ev){var d=ev&&ev.data||{},c=tbMcWorkerCereri[d.id];if(!c)return;delete tbMcWorkerCereri[d.id];clearTimeout(c.t);if(d.rez)c.fin(d.rez);else c.peFir()};
        tbMcWorker.onerror=function(){var l=tbMcWorkerCereri;tbMcWorkerCereri={};try{tbMcWorker.terminate()}catch(e){}tbMcWorker=null;Object.keys(l).forEach(function(k){clearTimeout(l[k].t);l[k].peFir()})};
      }
      var id=++tbMcWorkerId,ms=tbMcWorkerAsteptare();
      // revizia Opus (7): worker-ul care nu răspunde e OPRIT (terminate), nu dublat pe fir - pe telefon pagina îngheța cât socotea pe fir după un worker
      // atârnat; cererea pică ⇒ tbMcPorneste ține verdictul vechi pe ecran și reîncearcă în 2 minute, cu un worker nou
      tbMcWorkerCereri[id]={fin:fin,peFir:peFir,cad:cad,t:setTimeout(function(){if(!tbMcWorkerCereri[id])return;var l=tbMcWorkerCereri;tbMcWorkerCereri={};try{tbMcWorker.terminate()}catch(e){}tbMcWorker=null;var er=new Error("worker-ul n-a răspuns în "+Math.round(ms/1000)+" s");Object.keys(l).forEach(function(c){clearTimeout(l[c].t);l[c].cad(er)})},ms)};
      tbMcWorker.postMessage({id:id,b15:b15,st:st,o:o});
    }catch(e){peFir()}
  })}
var TB_MC_MS=15*60000,TB_MC_REINCERCARE_MS=2*60000,TB_MC_KV_PROASPAT_MS=30*60000,tbMc={botId:null,cheie:null,cheieLa:0,la:0,randLa:0,urmatorul:0,inLucru:false,rez:null,rand:null,st:null,plan:null,eroare:null,b15:null,b15La:0,b15Sim:null,b15Intreg:false,funding:null,sursa:null,randSursa:null,kvUltima:0};
// v100.141 (ideea 2): verdictul socotit de COLECTOR (la 15 minute, același motor), din KV - citit o dată la 2 minute; proaspăt (sub 30 min) ⇒
// Tabloul îl arată ca atare și nu mai socotește pe telefon; vechi / lipsă (colectorul oprit) ⇒ pagina socotește singură, ca înainte
var tbMcKv={la:0,d:null,inLucru:null};
function tbMcDinKv(){
  if(Date.now()-tbMcKv.la<2*60000)return Promise.resolve(tbMcKv.d);
  if(tbMcKv.inLucru)return tbMcKv.inLucru;
  tbMcKv.inLucru=(async function(){try{var r=await getJSON("/api/istoric-bot?action=mcVerdict");try{if(r&&r.mcVerdict&&r.mcVerdict.nevazut&&typeof GridProba!=="undefined"&&GridProba.puneNevazut)GridProba.puneNevazut(r.mcVerdict.nevazut)}catch(e){}/* v100.356 (I-895) */tbMcKv.d=r&&r.mcVerdict&&r.mcVerdict.boti?r.mcVerdict:null}catch(e){tbMcKv.d=null}tbMcKv.la=Date.now();tbMcKv.inLucru=null;return tbMcKv.d})();
  return tbMcKv.inLucru}
// revizia (8): cheia = setarea botului (grid, stop, TP, levier, pornire, activ) + planul lui - schimbate ⇒ se socotește din nou, nu peste 15 minute
function tbMcCheie(b){try{var d=GridSim.setariDinBot(b),pl=tbPlan.botId===b.id&&tbPlan.plan&&!tbPlan.plan.proba?tbPlan.plan:null;return JSON.stringify([d.st,d.pornitLa,b.activ!==false,pl?{minus:pl.minus,plus:pl.plus}:null])}catch(e){return null}}
async function tbMcTick(){var b=tbStare.routeOk===false?null:tbStare.bot;if(!b||!b.id||!tbPanouVizibil()||tbMc.inLucru)return;
  var k=tbMcCheie(b),acelasi=String(tbMc.botId)===String(b.id);
  // revizia Opus (1): setările / planul schimbate cât verdictul din KV e proaspăt - colectorul l-a socotit pe setările VECHI ⇒ din KV iau doar un
  // verdict socotit DUPĂ schimbare (ultima ≥ cheieLa), până atunci socotesc local; la alt bot ceasul schimbării se șterge
  if(acelasi&&tbMc.cheie&&k!==tbMc.cheie)tbMc.cheieLa=Date.now();else if(!acelasi)tbMc.cheieLa=0;
  var kv=await tbMcDinKv();
  // revizia Opus (2): după await garda inLucru se verifică din nou - două tic-uri în zbor (schimbarea botului cheamă tura de două ori) porneau două socotiri
  if(tbMc.inLucru||!tbStare.bot||String(tbStare.bot.id)!==String(b.id))return;
  var v=kv&&kv.boti&&kv.boti[String(b.id)],ultima=v?Number(v.ultima)||0:0;
  if(v&&v.text&&Date.now()-ultima<TB_MC_KV_PROASPAT_MS&&ultima>=tbMc.cheieLa){
    var nou=!acelasi||tbMc.sursa!=="colector"||tbMc.kvUltima!==v.ultima;tbMc.botId=String(b.id);tbMc.cheie=k;tbMc.cheieLa=0;
    if(nou){tbMc.sursa="colector";tbMc.randSursa="colector";tbMc.kvUltima=v.ultima;tbMc.rand={stare:v.stare||"info",text:v.text,cat:v.cat||null,regim:v.regim||null,scurt:v.scurt||null,sapt:v.sapt||null,hot:v.hot||null};   /* v100.149 (I-579) */tbMc.eroare=null;tbMc.la=v.ultima;tbMc.randLa=v.ultima;tbMc.urmatorul=v.ultima+TB_MC_MS;tbMcDeseneaza()}
    return}
  if(acelasi&&tbMc.sursa!=="colector"&&k===tbMc.cheie&&Date.now()-tbMc.la<TB_MC_MS)return;
  return tbMcPorneste(b,k)}
/* v100.274: memoria comună a lumânărilor de 15 min (grLum15, a fișei Grid și a paginii Monte Carlo, cheia monedă_USDT_PERP): barele întregi ținute
   minte intră ca „vechi” pe pagina botului (o pagină Pionex nouă în loc de 6), iar cele aduse întregi aici rămân celorlalte; acțiunile (cu punct) nu */
function tbMcBareTinute(sim){return sim&&String(sim).indexOf(".")<0&&typeof grBare15Tinute==="function"?grBare15Tinute(sim+"_USDT_PERP"):null}
function tbMcTineBare(sim,c){if(sim&&String(sim).indexOf(".")<0&&c&&c.intreg===true&&Array.isArray(c.b15)&&c.b15.length&&typeof grTine15==="function")grTine15(sim+"_USDT_PERP",c.b15)}
async function tbMcPorneste(b,k){
  if(typeof GridSim==="undefined"||typeof mcsAduCoin!=="function")return;
  tbMc.inLucru=true;tbMc.eroare=null;if(String(tbMc.botId)!==String(b.id)){tbMc.rand=null;tbMc.rez=null;tbMc.randLa=0}tbMc.botId=String(b.id);tbMc.cheie=k||tbMcCheie(b);tbMc.sursa="pagina";tbMcDeseneaza();
  var ok=false;
  try{
    if(!(Number(b.gridJos)>0&&Number(b.gridSus)>Number(b.gridJos)))throw new Error("botul n-are gridul citit (jos / sus)");
    var sim=mcsSimbolBot(b),s=TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex;
    /* v100.271 (ideile auditului 29.10): aceeași monedă cu barele aduse întregi ⇒ doar ultima pagină, lipită de ele (aceleași bare), și fără barele zilnice (aici nu se folosesc): ~2 cereri la 15 minute în loc de 8 */
    if(tbMc.b15Sim!==sim||Date.now()-tbMc.b15La>TB_MC_MS){var c=await mcsAduCoin(sim,{fara1D:true,vechi:tbMc.b15Sim===sim&&tbMc.b15Intreg?tbMc.b15:tbMcBareTinute(sim)});if(!c||!c.b15||!c.b15.length)throw new Error("Pionex n-a dat lumânările de 15 minute pentru "+sim);tbMc.b15=c.b15;tbMc.b15La=Date.now();tbMc.b15Sim=sim;tbMc.b15Intreg=c.intreg===true;tbMcTineBare(sim,c);tbMc.funding=c.fundingInfo||null}
    if(!tbStare.bot||String(tbStare.bot.id)!==String(b.id))return;   /* alt bot ales cât aduceam lumânările */
    var d=GridSim.setariDinBot(b),fi=tbMc.funding||(tbStare.funding&&tbStare.funding.sim===s?tbStare.funding.info:null)||null;   /* revizia (7): funding-ul MONEDEI botului */
    var st=Object.assign({},d.st,{suma:d.st.suma||50,fundingZi:fi?fi.rataZi:0.0003,fundingCost:!fi}),plan=tbPlan.botId===b.id&&tbPlan.plan&&!tbPlan.plan.proba?tbPlan.plan:null;   /* revizia (8): planul de probă nu intră */
    var oprit=b.activ===false,pornitLa=oprit?null:d.pornitLa,note=[];   /* revizia (1): botul OPRIT nu se reia „de aici încolo” */
    if(oprit)note.push("bot oprit - socotit ca bot nou cu setările lui");
    if(!(b.brut&&b.brut.buOrderData&&Number(b.brut.buOrderData.row)>1))note.push("număr de grile necunoscut, am pus 20");   /* revizia (10) */
    await new Promise(function(r){setTimeout(r,30)});   /* „socotesc…” apare înainte de calcul */
    /* v100.271 (ideile auditului 29.10): drumuri de 7 zile = cel mai lung orizont citit (era 14): aceleași cifre în limita tragerii, ~40% mai repede */
    /* v100.383 (el, 24.11: „monte Carlo bate câmpii grav”): și din BANII din Pionex (profitTotal) - stopul / ținta în procente cad la banii lui, nu la ai reluării */
    var totalPx=pornitLa&&b.profitTotal!==null&&b.profitTotal!==undefined&&b.profitTotal!==""&&isFinite(Number(b.profitTotal))?Number(b.profitTotal):null;
    var rez=await tbMcSimuleaza(tbMc.b15,st,{plan:plan,pornitLa:pornitLa,stPrefix:pornitLa?st:null,botRuleaza:!!pornitLa,pozitiePionex:pornitLa?d.pozitie:null,totalPionex:totalPx,n:500,seed:12,orizonturi:[1/24,4/24,1,7],zile:7});
    if(rez.praguriDeAici)note.push("stopul și ținta socotite de aici încolo (pe drumul real prețul le-a atins, dar botul rulează)");   /* v100.339 (I-868) */
    if(GridSim.notaAncorare){var naP=GridSim.notaAncorare(rez);if(naP)note.push(naP)}   /* v100.383 */
    if(rez.eroare&&pornitLa){var motiv=String(rez.eroare).split(/[.:]/)[0];rez=await tbMcSimuleaza(tbMc.b15,st,{plan:plan,pornitLa:null,n:500,seed:12,orizonturi:[1/24,4/24,1,7],zile:7});if(!rez.eroare)note.push("ca bot pornit acum ("+motiv+")")}   /* revizia (6): motivul adevărat */
    tbMc.rez=rez;tbMc.st=st;tbMc.plan=plan;tbMc.rand=GridSim.verdictScurt(rez,st,plan,b);tbMc.rand.scurt=GridSim.riscScurt?GridSim.riscScurt(rez):null;   /* v100.312 (I-842): ce poate face piața botului în 7 zile - gridul față de mișcarea obișnuită, ieșirea din grid, pierderea la stop */tbMc.rand.sapt=typeof tbMcSapt==="function"?tbMcSapt(rez,tbMc.b15,b):null;   /* v100.269 (auditul MC): riscul pe 1 h / 4 h / o zi */if(note.length)tbMc.rand.text=note.join(" · ")+": "+tbMc.rand.text;tbMc.randLa=Date.now();tbMc.randSursa="pagina";ok=true;
  }catch(e){tbMc.eroare=textEroare(e)}   /* revizia (9): verdictul vechi rămâne pe ecran, cu ora lui */
  finally{tbMc.inLucru=false;tbMc.la=ok?Date.now():Date.now()-TB_MC_MS+TB_MC_REINCERCARE_MS;tbMc.urmatorul=tbMc.la+TB_MC_MS}   /* picat ⇒ reîncercare în 2 minute */
  tbMcDeseneaza()}
function tbMcDeseneaza(){if(tbStare.citireO&&tbStare.bot){try{tbDeseneazaCitire(tbStare.citireO,tbStare.bot)}catch(e){}}}
// v100.269 (29.10, el: „în pagina botului la Monte Carlo vreau să pui un contor care să numere de câte ori a avut dreptate sau nu, gen 1-0”):
// scorul verdictelor Monte Carlo pe TOȚI boții tăi (din jurnalul colectorului, din 15.10) + botul de acum. Regula: șansa peste 50% = „pe plus”,
// sub 50% = „pe minus”; dreptate când botul a ieșit așa (la 7 zile sau la închidere). Cuvintele de sub cifre vin din intervalul pe ZILE.
function tbMcScorHtml(s,botId){
  if(!s||typeof s!=="object")return "";
  var d=Number(s.d)||0,g=Number(s.g)||0,a=Number(s.a)||0;if(!d&&!g&&!a)return "";
  var C=function(n,sg,pl){return TextRo.cate(n,sg,pl)},z1=function(x){return (Math.round(x*1000)/10).toFixed(1).replace(".",",")};
  var par=[];
  var ori=function(n){return n===1?"o dată":"de "+C(n,"dată","ori")};
  if(d+g)par.push((d?"a avut dreptate "+ori(d):"încă n-a avut dreptate")+", "+(g?"s-a înșelat "+ori(g):"încă nu s-a înșelat")+" · "+z1(d/(d+g))+"%");
  var zile=Number(s.zile)||0;
  /* auditul Monte Carlo (29.10): etalonul e regula fixă „mereu pe plus” (pe datele lui ar fi nimerit mai bine decât Monte Carlo), nu banul; și unde s-a judecat */
  var arePlus=Number.isFinite(s.plus)&&d+g>0,areDif=Number.isFinite(s.difJos)&&Number.isFinite(s.difSus);
  if(arePlus)par.push("„mereu pe plus” ar fi nimerit "+s.plus+" – "+(d+g-s.plus));
  if(d+g&&Number.isFinite(s.laInchidere))par.push(s.laInchidere*2>d+g?"judecate la închiderea botului (mediana după "+(Number.isFinite(s.oreMediana)?String(Math.round(s.oreMediana*10)/10).replace(".",","):"?")+" h), nu la 7 zile: scorul nu confirmă și nu infirmă verdictul pe 7 zile":"judecate la 7 zile sau la închidere");
  if(d+g)par.push(zile<10?"încă puține zile ("+zile+") ca să trag o concluzie":areDif?(s.difJos>0?"pe zilele de până acum nimerește mai des decât „mereu pe plus”":s.difSus<0?"pe zilele de până acum nimerește mai rar decât „mereu pe plus”":"încă nu bate „mereu pe plus”"):Number.isFinite(s.icJos)&&s.icJos>0.5?"pe zilele de până acum nimerește mai des decât o aruncare de ban":Number.isFinite(s.icSus)&&s.icSus<0.5?"pe zilele de până acum nimerește mai rar decât o aruncare de ban":"încă nu se deosebește de o aruncare de ban");
  if(a)par.push(C(a,"verdict","verdicte")+" așteaptă");
  var pb=s.peBot&&botId!=null?s.peBot[String(botId)]:null;
  if(pb)par.push("pe botul ăsta: "+(Number(pb.d)||0)+" – "+(Number(pb.g)||0)+(pb.a?" ("+(Number(pb.a)||0)+" așteaptă)":""));
  return '<div class="tbMcScor" role="status" title="Monte Carlo: verdictul („pe plus” peste 50%, „pe minus” sub 50%) comparat cu ce a făcut botul la 7 zile sau la închidere"><span class="tbMcScorEt">Scorul Monte Carlo</span> <b class="tbMcScorCifre">'+d+' – '+g+'</b> <span class="tbSub tbMcScorTx">'+escapeHtml(par.join(" · "))+'</span></div>';
}
// v100.269 (auditul Monte Carlo 29.10, el: „să dea verdicte și pe perioade mai scurte”): boții lui trăiesc în mediană 0,5 h, iar pe 1 h / 4 h /
// o zi „pe plus X%” nu spune mai mult decât media - șansa stopului, a lichidării și pierderea din cele mai proaste 5% sunt calibrate în medie.
// Deci pe termen scurt rândul spune RISCUL, nu câștigul. sc = GridSim.riscScurt(rez) / din colector: [{ ore, pStop, pLich, p5 }].
// v100.312 (I-842): rândul „Pe 7 zile” sub riscul pe termen scurt - textul din GridSim.textSaptamana, pierderea la stop din TabloExtra (cu grilele de pe drum)
function tbMcSapt(rez,b15,b){try{if(typeof GridSim==="undefined"||!GridSim.riscSaptamana)return null;var x=GridSim.riscSaptamana(rez,b15,b),ls=b&&b.opritorPierdereActiv&&typeof TabloExtra!=="undefined"&&TabloExtra.totalLaOpritor?TabloExtra.totalLaOpritor(b):null;return GridSim.textSaptamana(x,ls)||null}catch(e){return null}}
function tbMcScurtHtml(sc,oprit,areCifra){   /* v100.313: oprit = reluarea arată botul OPRIT / LICHIDAT ⇒ fără cifrele ei (stop 100%, lichidare, cele 5%); areCifra = rândul „stopul tău” are cifra măsurată */
  if(!Array.isArray(sc)||!sc.length)return "";
  var z1=function(x){return (Math.round(x*1000)/10).toFixed(1).replace(".",",")},usd=function(x){return (x<0?"−":"")+Math.abs(x).toFixed(1).replace(".",",")+" USDT"};
  var et={1:"în 1 h",4:"în 4 h",24:"într-o zi"},st=sc.filter(function(x){return x&&et[x.ore]&&Number.isFinite(x.pStop)}).map(function(x){return et[x.ore]+": "+z1(x.pStop)+"%"});
  var zi=sc.filter(function(x){return x&&x.ore===24})[0],par=[];
  if(oprit)par.push("reluarea nu se potrivește cu Pionex (arată botul "+(oprit==="LICHIDAT"?"lichidat":"oprit")+"), deci fără cifrele ei"+(areCifra?" — șansa măsurată a stopului e pe rândul „stopul tău” din grafic":""));
  else{if(st.length)par.push("stopul atins "+st.join(" · "));
  if(zi&&Number.isFinite(zi.p5))par.push("cele mai proaste 5% într-o zi: "+usd(zi.p5));
  if(zi&&Number.isFinite(zi.pLich))par.push("lichidare într-o zi: "+z1(zi.pLich)+"%")}
  return par.length?'<span class="tbSub tbMcScurt">Pe termen scurt (riscul, nu câștigul): '+escapeHtml(par.join(" · "))+'</span>':"";
}
// v100.271 (ideile auditului 29.10): sub rândul riscului, verificarea lui pe boții tăi (jurnalul colectorului: 1 h / 4 h / 24 h, ferestre fără
// suprapunere, judecat pe ce a făcut botul). Se arată orizontul cu cele mai multe judecate; cuvintele vin DOAR din verdictul raportului (intervalul
// pe zile; sub 30 de judecate sau sub 10 zile ⇒ „strâng date”). r = raportScurt din KV (mcVerdict.calibrareScurt); sc = rândul riscului.
function tbMcScurtVerifHtml(sc,r){
  if(!Array.isArray(sc)||!sc.length||!r||!Array.isArray(r.ore))return "";
  var C=function(n,sg,pl){return TextRo.cate(n,sg,pl)},z1=function(x){return (Math.round(x*1000)/10).toFixed(1).replace(".",",")},N=function(x){return Number.isFinite(Number(x))?Number(x):0};
  var et={1:"în 1 h",4:"în 4 h",24:"într-o zi"},CUV={"prea-putin":"prezice prea puțin","prea-mult":"prezice prea mult","potrivit":"se potrivește"};
  var L=r.ore.filter(function(x){return x&&et[x.ore]});
  if(!L.reduce(function(s,x){return s+N(x.n)+N(x.tine)+N(x.necitit)+N(x.expirat)+N(x.deschise)},0))return "";
  var k=L.slice().sort(function(a,b){return N(b.n)-N(a.n)||a.ore-b.ore})[0],n=N(k.n),zile=N(k.zile),par=[],nz=C(n,"judecată","judecate")+" pe "+C(zile,"zi","zile");
  if(n<30||zile<10)par.push("strâng date ("+nz+", "+et[k.ore]+")");
  else{
    if(Number.isFinite(k.pStopMed)&&Number.isFinite(k.stopRata))par.push(et[k.ore]+" stopul prezis "+z1(k.pStopMed)+"%, atins "+z1(k.stopRata)+"% ("+nz+")"+(CUV[k.verdictStop]?" — "+CUV[k.verdictStop]:""));
    if(N(k.nSub5)&&Number.isFinite(k.sub5Rata))par.push("sub cele mai proaste 5%: "+z1(k.sub5Rata)+"% (ar trebui ~5%)"+(CUV[k.verdictP5]?" — "+CUV[k.verdictP5]:""));
  }
  if(N(k.tine))par.push(C(N(k.tine),"închisă de tine","închise de tine"));
  if(N(k.expirat))par.push(C(N(k.expirat),"expirată","expirate"));
  if(N(k.necitit))par.push(C(N(k.necitit),"închisă cu motiv necitit","închise cu motiv necitit"));
  if(!par.length)return "";
  return '<span class="tbSub tbMcScurt tbMcScurtVerif" title="Riscul pe termen scurt verificat pe ce au făcut boții tăi: stopul prezis față de cel atins și cât de des pierderea a trecut de cele mai proaste 5% (ar trebui ~5%). Verdictul abia de la 30 de judecate pe cel puțin 10 zile; boții închiși de tine înainte de orizont intră cu stopul neatins, pe cât au stat deschiși, iar boții fără stop nu intră la stop.">Verificat pe boții tăi: '+escapeHtml(par.join(" · "))+'</span>';
}
/* v100.384 (I-935, el: „fă tot” după auditul paginii): 24.11 cifrele din poza cartelei BULLA nu s-au putut reface - colectorul ținea doar ultima socotire.
   (1) ultimele socotiri ale colectorului pe botul ăsta (KV mcVerdict.boti[id].istoric): ora, prețul, totalul Pionex, stopul / take-profit-ul pe 24 h;
   (2) „salvează clipa asta”: un fișier JSON pe calculatorul lui cu botul (fără id-urile contului), lumânările de 15 minute și ce a socotit pagina. */
function tbMcIstoricHtml(b){try{
  var v=typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv.d&&tbMcKv.d.boti&&b?tbMcKv.d.boti[String(b.id)]:null,l=v&&Array.isArray(v.istoric)?v.istoric.filter(function(e){return e&&Number.isFinite(e.la)}):[];
  if(l.length<2)return "";
  var hm=function(t){var d=new Date(t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")},pc=function(x){return Number.isFinite(x)?TextRo.num(x*100,1)+"%":"—"};
  var r=l.slice(-8).reverse().map(function(e){var z=(e.sc||[]).filter(function(q){return Array.isArray(q)&&q[0]===24})[0];return hm(e.la)+(Number.isFinite(e.pret)?" la "+e.pret:"")+(z?": stop "+pc(z[1])+(Number.isFinite(z[2])&&z[2]>0?" / TP "+pc(z[2]):""):"")+(Number.isFinite(e.total)?" (Pionex "+(e.total<0?"−":"+")+TextRo.num(Math.abs(e.total),1)+")":"")});
  return '<span class="tbSub tbMcScurt tbMcIstoric">Ultimele socotiri ale colectorului (pe 24 h): '+escapeHtml(r.join(" · "))+'</span>';
}catch(e){return ""}}
async function tbInstantaneu(){
  var b=tbStare&&tbStare.bot;if(!b)return;
  var chei=["id","simbol","baza","directie","gridJos","gridSus","levier","investit","pornitLa","pozitie","pretCurent","pretDeschidere","profitTotal","profitNet","pnlNerealizat","opritorProfit","opritorProfitActiv","opritorProfitTip","opritorProfitRaport","opritorPierdere","opritorPierdereActiv","opritorPierdereTip","opritorPierdereRaport","pretLichidare","lichidarePartea","activ"],bot={};
  chei.forEach(function(k){bot[k]=b[k]});var bu=b.brut&&b.brut.buOrderData||{};bot.brut={buOrderData:{row:bu.row,gridType:bu.gridType}};
  var b15=tbMc&&tbMc.b15&&tbMc.b15.length&&tbMc.botId===String(b.id)?tbMc.b15:null;
  if(!b15&&typeof mcsAduCoin==="function"){try{var c=await mcsAduCoin(mcsSimbolBot(b),{fara1D:true});b15=c&&c.b15||null}catch(e){b15=null}}
  var txt=function(sel){var e=document.querySelector(sel);return e?String(e.innerText||e.textContent||"").replace(/\s+\n/g,"\n").slice(0,6000):null};
  var kv=typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv.d&&tbMcKv.d.boti?tbMcKv.d.boti[String(b.id)]||null:null;
  var o={fel:"clipa Tabloului botului",versiune:txt("#antetVersiune"),la:Date.now(),ora:new Date().toString(),bot:bot,setari:typeof GridSim!=="undefined"?GridSim.setariDinBot(b):null,b15:b15,
    mc:{sursa:tbMc.randSursa||null,la:tbMc.la||null,rand:tbMc.rand||null,ancorat:tbMc.rez&&tbMc.rez.ancorat||null,acum:tbMc.rez&&tbMc.rez.acum||null,st:tbMc.st||null,colector:kv},
    ecran:{cap:txt("#pzVerdict"),conteaza:txt("#ctAcum"),drum:txt(".pzDrum")}};
  var nume="clipa-"+String(b.baza||"bot").replace(/\.PERP$/,"").replace(/[^A-Za-z0-9_-]/g,"")+"-"+new Date().toISOString().replace(/[:T]/g,"-").slice(0,16)+".json";
  var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:"application/json"}));a.download=nume;document.body.appendChild(a);a.click();
  setTimeout(function(){try{URL.revokeObjectURL(a.href);a.remove()}catch(e){}},1500);
  if(typeof toast==="function")try{toast("Am salvat clipa: "+nume)}catch(e){}
}
function tbMcRand(b){
  if(!b||String(tbMc.botId)!==String(b.id))return null;
  var hm=function(t){var d=new Date(t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
  var cand=tbMc.la?" — "+(tbMc.randSursa==="colector"?"socotit de colector ":"socotit ")+hm(tbMc.la)+" · următorul "+hm(tbMc.urmatorul):"";   /* revizia Opus: nota după sursa TEXTULUI de pe ecran (la trecerea pe local textul e încă al colectorului) */
  // v100.141 (ideea 4): reluarea nepotrivită („Reluarea arată botul OPRIT…”) ⇒ drumul e să-i verifici setările în Simulator
  var buton=tbMc.rand&&(/^Reluarea arată/.test(tbMc.rand.faCe||"")||/«Reluarea arată/.test(tbMc.rand.text||""))?"verifică setările în Simulator":"deschide în Simulator";   /* revizia Opus (3): după TEXTUL de pe ecran - din KV felul e cel confirmat, textul e al ultimei socotiri */
  if(tbMc.inLucru&&!tbMc.rand)return {ce:"Monte Carlo",stare:"info",text:"socotesc 500 de drumuri pe botul tău…",buton:buton};
  if(!tbMc.rand)return tbMc.eroare?{ce:"Monte Carlo",stare:"info",text:"n-a mers: "+tbMc.eroare,nota:cand.replace(/^ — /,""),buton:buton}:null;
  // v100.140 (ideea 3): verdictul în text, restul („șanse… · socotit”) în nota mai mică de sub el - pe telefon rândul nu mai are 6–8 rânduri
  /* v100.149 (I-579): regimul Busolei - doar validat (poarta din colector); nevalidat sau cu eroare ⇒ nimic */
  var RG_ST={miscare:"mai agitată",liniste:"mai calmă","nu-stiu":"nimic neobișnuit"},rgo=tbMc.rand.regim;
  var rg=rgo&&rgo.nevalidat===false&&!rgo.eroare&&rgo.text?" · în regimul de acum ("+(RG_ST[rgo.stare]||rgo.stare)+", "+TextRo.cate(rgo.zile,"zi de bare","zile de bare")+"): "+rgo.text:"";   /* revizia: starea pe înțeles */
  var cal=typeof GridSim!=="undefined"&&GridSim.textCalibrareMc&&typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv.d?GridSim.textCalibrareMc(tbMcKv.d.calibrare):"";   /* v100.201 (B1): verdictul verificat pe ce a urmat */
  /* v100.271 (ideile auditului 29.10): fraza veche (cu 14 zile) era falsă - drumurile se trag din toate barele de 15 minute aduse (3000 ≈ 31 de zile) */
  return {ce:"Monte Carlo",stare:tbMc.rand.stare,text:tbMc.rand.text+rg,buton:buton,nota:"șanse pe drumuri trase din ultima lună de prețuri, nu o predicție"+(typeof tbNotaDurata==="function"?tbNotaDurata(168):"")+(tbMc.eroare?" · din "+hm(tbMc.randLa||tbMc.la)+"; acum n-a mers: "+tbMc.eroare+" · reîncerc "+hm(tbMc.urmatorul):cand.replace(/^ — /," · "))+(tbMc.inLucru?" · socotesc din nou…":"")+(cal?" · "+cal:""),scurt:tbMc.rand.scurt||null,sapt:tbMc.rand.sapt||null,hot:tbMc.rand.hot||null,scor:typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv.d&&tbMcKv.d.calibrare?tbMcKv.d.calibrare.scor:null}}
