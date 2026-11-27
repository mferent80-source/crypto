/* tablou-banii.js — banii botului, identitatea lui, extra (cifrele Pionex, citite la 5 min) și scenariile (lichidarea, ținta, TP-ul în procente, costurile pe zi)
   I-940 (auditul paginii botului, 24.11): mutat NESCHIMBAT din public/app.js (v100.394). Script clasic, încărcat ÎNAINTEA lui app.js:
   doar definiții (nimic nu rulează la încărcare), numele rămân globale ca înainte; ce folosește din app.js (tbStare, tbPlan, $ …)
   se citește abia la apel. Probele îl văd lipit de app.js prin scripts/lib/sursa-app.mjs (cuTablou). */
function tbDeseneazaExtra(b){
  var el=$("tbFisaBot"),el2=$("tbAcum"),P=(typeof grProc==="function"?grProc:GridCalcul.procent);if(!el||!el2)return;
  if(!b){el.innerHTML=el2.innerHTML='<p class="tbSub">Fără bot citit.</p>';return}
  var linie=function(et,val,cls,nota){return '<div class="tbLinie"><span>'+escapeHtml(et)+(nota?' <span class="tbSub">'+escapeHtml(nota)+'</span>':'')+'</span><b class="'+(cls||"")+'">'+escapeHtml(val)+'</b></div>'};
  // 1) botul vs fisa
  var f=tbFisa.botId===b.id?tbFisa.fisa:null;
  if(tbFisa.botId===b.id&&tbFisa.eroare)el.innerHTML='<p class="tbSub">Nu pot calcula fișa pentru moneda botului: '+escapeHtml(tbFisa.eroare)+'</p>';
  else if(!f){var g0=TabloExtra.geometrieBot(b);el.innerHTML=(g0?linie("Pas net pe grilă (botul)",P(g0.netPct),g0.preaDese?"bad":"",TextRo.cate(g0.grile,"grilă","grile")+" "+g0.mod):"")+'<p class="tbSub">calculez fișa de azi pentru moneda botului…</p>'}
  else{
    var c=TabloExtra.comparaCuFisa(b,f);
    el.innerHTML=(tbFisa.veche?'<p class="tbSub">pe fișa de la '+new Date(tbFisa.la).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"})+' · o refac acum…</p>':'')+'<table class="tbCmp"><thead><tr><th></th><th>botul tău</th><th>fișa de azi</th></tr></thead><tbody>'+c.randuri.map(function(r){return '<tr><th>'+escapeHtml(r.et)+'</th><td>'+escapeHtml(r.bot)+'</td><td>'+escapeHtml(r.et==="Verdictul de azi"?((GR_NIVEL[r.fisa]||[r.fisa])[0]):r.fisa)+'</td></tr>'}).join("")+'</tbody></table>'
      +(c.semnale.length?'<ul class="tbSemnale">'+c.semnale.map(function(x){return '<li>'+escapeHtml(x)+'</li>'}).join("")+'</ul>':'<p class="tbSub">Setările botului se potrivesc cu fișa de azi.</p>')
      +'<p class="tbSub">Nu schimba botul doar pentru că diferă: fișa e pentru un bot NOU pornit acum. Deschide fereastra Grid pentru toată proba.</p>'
      +(function(){var t=typeof mcsIstoricScurt==="function"&&tbFisa.istoric15?mcsIstoricScurt(tbFisa.istoric15,"fișa e pe atât"):"";return t?'<p class="tbWarn grIstoricScurt">⚠️ '+escapeHtml(t+(tbFisa.istoric15.motiv==="pagina"?" Reîncerc la următoarea reîmprospătare.":""))+'</p>':""})();   /* v100.274: ca fișa Grid */
    if($("tbFisaBotSub"))$("tbFisaBotSub").textContent="fișa calculată la "+new Date(tbFisa.la).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"})+" · suma botului";
  }
  // 2) pe zi  3) la inchidere  4) liniste + laborator  5) jurnal
  var z=TabloExtra.grileVsCosturi(b,Date.now()),q=TabloExtra.dacaInchizi(b),h="";
  // v100.92 (I-517): trei grupuri - Azi (grile și costuri), Dacă închizi acum (banii), Contextul (Busola, liniștea, laboratorul, long simplu, jurnalul)
  h+='<div class="tbGrupCard">'+tbGrup("Azi");
  h+=linie("Grile, ultimele 24 h",z.grile24h==null?"—":botiBan(z.grile24h),botiClasa(z.grile24h),z.umpleri24h!=null?TextRo.cate(z.umpleri24h,"pereche","perechi")+" · după comisionul lor":"");   /* v100.373: trx24h = perechi; gridProfit e după comisionul perechii */
  /* v100.272 (ideile auditului 29.10): taxa de intrare (o dată, la pornire) separat de comisionul pe zi - înainte era împărțită pe zile în el */
  var cz=tbCosturiZi(z,b);   /* v100.339 (auditul din 13.11): sub o zi nimic „pe zi”; comisionul pe fereastra grilelor */
  h+=linie("Comisioane pe zi",cz.comision.val,"tbSubVal",(cz.comision.nota?cz.comision.nota+" · ":"")+"deja scăzute din grile");
  if(z.taxaIntrare)h+=linie("Taxa de intrare (o dată)","≈ "+botiBan(z.taxaIntrare,TextRo.zecMici(z.taxaIntrare)),"tbSubVal","estimată: poziția cumpărată la pornire × comisionul la piață");
  h+=linie("Funding pe zi",cz.funding.val,z.fundingMananca&&!cz.tanar?"bad":"tbSubVal",cz.funding.nota);
  h+=linie("Grile − costuri, pe zi",z.netZi==null?"—":botiBan(z.netZi),botiClasa(z.netZi));
  h+='</div><div class="tbGrupCard">'+tbGrup("Dacă închizi acum");
  h+='<div class="tbLinie tbLinieTotal"><span>Dacă îl închizi acum, iei</span><b class="'+botiClasa(q.iei!=null&&botiNr(b.investit)!=null?q.iei-botiNr(b.investit):null)+'">'+escapeHtml(q.iei==null?"—":TextRo.num(q.iei,1)+" USDT")/* audit 19.10: o zecimală, virgula */+'</b></div>';
  h+=linie("Comisionul de închidere",q.comisionInchidere==null?"—":botiBan(-q.comisionInchidere),"tbSubVal");
  h+=linie("Prețul la care botul e pe zero",q.pretZero==null?(q.zeroNeatins?"din preț, în grid, nu mai ajunge pe zero":"—"):grPret(q.pretZero,null),"",q.distantaZeroPct==null?"":(q.distantaZeroPct>=0?"+":"")+P(q.distantaZeroPct)+" de aici");
  h+='</div><div class="tbGrupCard">'+tbGrup("Contextul");
  h+=tbBusolaLinie(b);
  if(f&&f.liniste){var L=f.liniste;h+=linie("Liniștea (fișa)",!L.linisteAcum?"acum e mișcare":!L.suficient?"prea puține perioade":L.k+" din "+L.n+" au mai ținut 2 zile ("+P(L.p)+")",!L.linisteAcum?"tbWarn":"","frecvență, nu promisiune")}
  var lab=grLaborator&&grLaborator.date,qm=lab&&Array.isArray(lab.intrebari)?lab.intrebari.find(function(x){return x.id==="miscare"}):null;
  /* v100.349 (auditul Grid): verdictul laboratorului = al blocurilor de 60 de zile înghețate, nu cel de zi cu zi */
  var bqm=qm&&typeof GridLaborator!=="undefined"&&GridLaborator.bilantBlocuri?GridLaborator.bilantBlocuri(lab.blocuri).miscare:null;
  if(qm)h+=linie("Laboratorul: după mișcare vs liniște",P(qm.A&&qm.A.pePlus)+" vs "+P(qm.B&&qm.B.pePlus)+" pe plus",bqm&&bqm.dovedit?"good":"tbSubVal",bqm&&bqm.n?"dovedit în "+bqm.dovedit+" din "+TextRo.cate(bqm.n,"bloc","blocuri"):"n-am aflat încă (neînghețat)");
  var vp=TabloExtra.vsPozitie(b);
  if(vp&&vp.pozitieSimpla!=null)h+=linie(b.directie==="long"||b.directie==="short"?"Un "+b.directie+" simplu, aceeași sumă și levier":"Fără bot (neutru)",botiBan(vp.pozitieSimpla),botiClasa(vp.pozitieSimpla),(vp.diferenta!=null?"gridul "+(vp.diferenta>=0?"a adus ":"a pierdut ")+TextRo.num(Math.abs(vp.diferenta),1)+" față de el":"")+(vp.pozitieLichidata?" · poziția simplă ar fi fost lichidată (marja izolată: −suma pusă)":""));   /* v100.396 (auditul 26.11) */
  var j=TabloExtra.legaturaJurnal(grJurnalCitit(),b);
  h+=j?linie("Din jurnal","pornit la "+((GR_NIVEL[j.verdict]||["?"])[0])+", proba zicea mediana "+P(j.mediana),"","acum "+(botiNr(b.profitTotal)!=null&&botiNr(b.investit)?P(botiNr(b.profitTotal)/botiNr(b.investit)):"—")):linie("Din jurnal","nelegat","tbSubVal","n-ai notat fișa la pornire");
  h+='</div>';
  el2.innerHTML=h;
}
/* v100.333 (revizia Opus a v100.332): cât aduce o grilă, în USDT - rezultat ⇒ O zecimală (regula lui); o sumă mică (sub 0,095) cu două, sub 0,0095 cu trei,
   ca să nu iasă „0,0” (TextRo.zecMici, ca sfaturile) */
function tbPeGrilaUsdt(v){return TextRo.num(v,TextRo.zecMici(v))}
/* v100.339 (I-874, auditul din 13.11): vârsta botului nu apărea nicăieri pe pagină (multe sfaturi depind de ea), iar poziția era rotunjită la
   întreg. Două rânduri în capul cartelei „Banii”: de când rulează (cu perechile și ritmul lor) și poziția de acum (cu unitate, valoare și
   levierul efectiv = valoarea poziției / banii puși). Fără date nu inventează nimic. */
function tbIdentitateBot(b,acum){
  var out=[],p=botiNr(b&&b.pornitLa),per=botiNr(b&&b.ordinePerechi),poz=botiNr(b&&b.pozitie),pr=botiNr(b&&b.pretCurent),inv=botiNr(b&&b.investit),lev=botiNr(b&&b.levier);
  if(p>0&&acum>p){var min=Math.floor((acum-p)/60000),ore=min/60,d=Math.floor(min/1440),h=Math.floor((min%1440)/60),mm=min%60;
    var cat=d>=1?TextRo.cate(d,"zi","zile")+(h?" "+h+" h":""):h>=1?h+" h"+(mm?" "+mm+" min":""):mm+" min";
    var dt=new Date(p),z=function(n){return (n<10?"0":"")+n};
    out.push({eticheta:"Rulează de",valoare:cat,nota:(per!==null?TextRo.cate(per,"pereche","perechi")+(ore>=1&&per>0?" · ≈ "+TextRo.num(per/ore,1)+" pe oră":"")+" · ":"")+"pornit "+z(dt.getDate())+"."+z(dt.getMonth()+1)+", "+z(dt.getHours())+":"+z(dt.getMinutes())})}
  if(poz!==null){var moneda=String(b.baza||"").replace(/\.PERP$/,""),a=Math.abs(poz),val=pr>0?a*pr:null;
    out.push({eticheta:"Poziția acum",valoare:a<1e-9?"fără poziție":TextRo.cant(a)+(moneda?" "+moneda:""),nota:a<1e-9?"":(poz<0?"short":"long")+(val!==null?" · ≈ "+TextRo.usdt(val,1).replace(/^\+/,""):"")+(val!==null&&inv>0?" · levier efectiv "+TextRo.num(val/inv,1)+"×"+(lev>0?" (setat "+TextRo.num(lev,0)+"×)":""):"")})}
  return out}
// Banii botului pe Tablou, dupa contractul rutei. Lipsa = "—", niciodata 0.
function tbDeseneazaBanii(b){
  var el=$("tbBani"),av=$("tbAvertismente");if(!el)return;
  if(!b){el.innerHTML='<div class="emptyState">—</div>';if(av)av.innerHTML='<p class="tbSub">Fără bot citit.</p>';tbDeseneazaSemafor(null);return}
  // Lista, nu cutii: eticheta la stanga, cifra la dreapta, aliniata pe coloana.
  var pg=typeof TabloExtra!=="undefined"?TabloExtra.profitPeGrila(b):null,per=botiNr(b.ordinePerechi);
  var rand=function(eticheta,valoare,cls,nota){return '<div class="tbLinie"><span>'+escapeHtml(eticheta)+(nota?' <span class="tbSub">'+escapeHtml(nota)+'</span>':'')+'</span><b class="'+(cls||"")+'">'+escapeHtml(valoare)+'</b></div>'};
  el.innerHTML=tbIdentitateBot(b,Date.now()).map(function(x){return rand(x.eticheta,x.valoare,"tbSubVal",x.nota)}).join("")+rand("Investit",botiBan(b.investit,2,false))+
    rand("Realizat, după comisioane",botiBan(b.profitNet),botiClasa(b.profitNet))+
    rand("Poziția deschisă",botiBan(b.pnlNerealizat)+(b.pnlNerealizatSigur===false?" (semn nesigur)":""),botiClasa(b.pnlNerealizat),"nerealizat")+
    '<div class="tbLinie tbLinieTotal"><span>Total'+(typeof TabloExtra!=="undefined"&&TabloExtra.notaTotal&&TabloExtra.notaTotal(b)?' <span class="tbSub">'+escapeHtml(TabloExtra.notaTotal(b))+'</span>':'')+'</span><b class="'+botiClasa(b.profitTotal)+'">'+escapeHtml(botiBan(b.profitTotal))+'</b></div>'+   /* v100.272: nota neutrului lângă total */
    // v100.4: profitul DOAR din grid (Pionex „Grid profit”) la vedere, colorat, si cat aduce o grila dupa comision (Pionex „Profit/grid”)
    rand("Profit doar din grid",botiBan(b.gridProfitBrut),botiClasa(b.gridProfitBrut),(per!==null?TextRo.cate(per,"pereche încheiată","perechi încheiate")+" · ":"")+"după comisionul perechilor")+
    (pg?rand("Pe grilă, după comision",GridCalcul.procent(pg.pct)+(pg.usdt!==null?" ≈ "+tbPeGrilaUsdt(pg.usdt)+" USDT":"")/* v100.332 (🔵9): virgula, ca KPI-ul de sus; v100.333: o zecimală */,"",TextRo.cate(pg.grile,"grilă","grile")+" "+pg.mod):"")+
    rand("Comisioane",botiBan(b.comisioane),"tbSubVal")+
    rand("Finanțare",botiBan(b.finantare),"tbSubVal")+
    tbRandUmpleri(b)+(typeof TabloExtra!=="undefined"&&TabloExtra.curbaBotHtml?TabloExtra.curbaBotHtml(typeof tbSapt!=="undefined"&&tbSapt&&tbSapt.botId===b.id?tbSapt.intrari:null,b,Date.now()):"");   /* v100.385 (I-930): drumul botului de la pornire */
  tbAduUmpleri(b);
  /* v100.332 (auditul 12.11, 🟡1): semaforul înaintea cartelei planului - cartela îi ia fraza, iar lista „Ce ai de făcut” vede verdictul de acum */
  tbFisaRestaureaza(b);tbDeseneazaExtra(b);tbAduFisaBot(b);tbDeseneazaSemafor(b);tbDeseneazaSaptPlan(b);tbAduSaptamana(b);if(typeof tbAduFlux==="function")tbAduFlux(b);tbAduSemnale(b);tbDeseneazaPortofoliu();if(typeof gridLaboratorAdu==="function")gridLaboratorAdu();
  var lista=Array.isArray(b.avertismente)?b.avertismente:[];
  if(av)av.innerHTML=lista.length?lista.map(function(a){return '<div class="tbAvert">'+escapeHtml(a)+'</div>'}).join(""):'<p class="tbSub">Niciun avertisment de la server.</p>';
  tbStare.avertLista=lista;tbRenderTodo();
}
// Banda cu cele patru cifre de sus: ce se citeste dintr-o privire. Doar din
// campurile rutei (aceleasi ca in lista de boti); lipsa ramane "—".
// v77: sfaturile, scenariile de pret, istoricul de pe serverul de acasa,
// alertele pe telefon (ntfy), marja din futures si finantarea. Cifrele vin din
// modulele pure (Scenariu, Sfaturi, Alerte, Directie), probate fara browser.
var TB_EXTRA_MS=5*60000;
async function tbAduExtra(){
  var b=tbStare.bot;if(!b||!b.id)return;
  var e=tbStare.extra||(tbStare.extra={la:0,bot:null,inLucru:false});
  if(e.inLucru||(e.bot===b.id&&Date.now()-e.la<TB_EXTRA_MS))return;
  e.inLucru=true;
  try{
    // Istoricul strans de colectorul de acasa (pe pagina publicata raspunde 503 - atunci ramane cel din browser).
    try{var ist=await getJSON("/api/istoric-bot?action=citeste&ore=24&bot="+encodeURIComponent(b.id));
      tbStare.istoricServer={bot:b.id,intrari:Array.isArray(ist.intrari)?ist.intrari:[],config:ist.config||null,adusLa:Date.now()};e.istoricEroare=null;   /* v100.194: când a sosit ora colectorului (alarma falsă „oprit”) */
      // v79.1: alertele colectorului stau in KV (fara ntfy) si se vad aici
      try{var al=await getJSON("/api/istoric-bot?action=alerte");tbStare.alerteServer=al&&Array.isArray(al.alerte)?al.alerte:[]}catch(x2){tbStare.alerteServer=null}
      try{var arg=await getJSON("/api/istoric-bot?action=alerteRegistru");tbStare.alerteRegistru=arg&&arg.registru||null}catch(x3){tbStare.alerteRegistru=null}}   /* v100.368: registrul alertelor */
    catch(x){e.istoricEroare=x.status===503?"doar-acasa":textEroare(x)}
    try{var f=await getJSON("/api/pionex-account?action=futures");e.futures=f&&f.usdt?f.usdt:null;e.futuresEroare=null}
    catch(x){e.futures=null;e.futuresEroare=textEroare(x)}
    try{var fu=await getJSON("/api/market?type=futures&symbol="+encodeURIComponent(TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).binance));e.funding=fu&&fu.funding!=null?Number(fu.funding):null;e.fundingHist=fu&&Array.isArray(fu.fundingHist)?fu.fundingHist:null}   /* v100.65: istoria ratelor -> intervalul funding-ului */
    catch(x){e.funding=null;e.fundingHist=null}
    e.bot=b.id;e.la=Date.now();
  }finally{e.inLucru=false}
  renderTabloSfaturi();renderTabloScenarii();renderTabloAlerte();
}
function tbTinteScenariu(b){
  /* v100.332 (🔵2): stopul în procente = prețul viu (pretStopLive), ca take-profit-ul de mai jos; cel pe preț rămâne prețul lui */
  var t=[],p=botiNr(b.pretCurent),jos=botiNr(b.gridJos),sus=botiNr(b.gridSus),opr=!b.opritorPierdereActiv?botiNr(b.opritorPierdere):typeof TabloExtra!=="undefined"&&TabloExtra.pretStopLive?TabloExtra.pretStopLive(b):botiNr(b.opritorPierdere);
  /* v100.339 (auditul din 13.11): țintele erau gândite pentru long (+5%, −5%, −10%); la short partea pierderii e SUS ⇒ −5%, +5%, +10% */
  if(p!==null){if(String(b.directie||"").toLowerCase()==="short"){t.push({eticheta:"−5%",pret:p*0.95});t.push({eticheta:"+5%",pret:p*1.05});t.push({eticheta:"+10%",pret:p*1.1})}else{t.push({eticheta:"+5%",pret:p*1.05});t.push({eticheta:"−5%",pret:p*0.95});t.push({eticheta:"−10%",pret:p*0.9})}}
  if(sus!==null)t.push({eticheta:"marginea de sus",pret:sus});
  if(jos!==null)t.push({eticheta:"jos",pret:jos});
  if(opr!==null&&opr!==jos)t.push({eticheta:"opritorul",pret:opr});
  var tpS=!b.opritorProfitActiv?null:typeof TabloExtra!=="undefined"&&TabloExtra.pretTpLive?TabloExtra.pretTpLive(b):botiNr(b.opritorProfit);if(tpS!==null&&tpS>0)t.push({eticheta:typeof TabloExtra!=="undefined"&&TabloExtra.tpDinPret&&TabloExtra.tpDinPret(b)===false?"take-profit, pe poziția de acum":"take-profit-ul",pret:tpS});   // v100.322: take-profit-ul pus (în procente: socotit live, ca stopul)
  var propriu=tbStare.scenariuPropriu;if(propriu>0)t.push({eticheta:"prețul tău",pret:propriu});
  return t;
}
/* v100.339 (auditul din 13.11): „pe zi” doar de la o zi de viață - o plată de +0,03 la 5 ore apărea „+0,1 pe zi”; sub o zi se arată suma de la
   pornire. De la o zi, comisionul e pe perechile ultimelor 24 h (aceeași fereastră ca grilele) când se poate, altfel media, spusă ca medie. */
function tbOraCitirii(){var t=tbStare&&Number(tbStare.botLa);if(!(t>0))return "";var d=new Date(t),z=function(n){return (n<10?"0":"")+n};return " · citit "+z(d.getHours())+":"+z(d.getMinutes())+":"+z(d.getSeconds())}
function tbCosturiZi(z,b){
  var tanar=z&&z.zile!=null&&z.zile<1,com=botiNr(b&&b.comisioane),fin=botiNr(b&&b.finantare),tx=z&&z.taxaIntrare?z.taxaIntrare:0;
  var faraTx=z&&z.taxaIntrare?", fără taxa de intrare":"";
  return {tanar:tanar,
    comision:tanar?{val:"—",nota:"sub o zi: de la pornire "+(com===null?"—":botiBan(com-tx))+faraTx}:{val:!z||z.comisionZi==null?"—":botiBan(z.comisionZi),nota:(z&&z.fereastra==="24h"?"pe perechile ultimelor 24 h":"medie de la pornire")+faraTx},
    funding:tanar?{val:"—",nota:"sub o zi: de la pornire "+(fin===null?"—":botiBan(fin))}:{val:!z||z.fundingZi==null?"—":botiBan(z.fundingZi),nota:z&&z.fundingMananca?"mănâncă tot câștigul din grile":"medie de la pornire"}}}
/* v100.339: rândul din „Dacă prețul ajunge la…” e „lichidat” și când prețul lui trece de lichidarea estimată de Pionex (modelul golea contul mai departe) */
function tbScenLichidat(x,b){var lq=botiNr(b&&b.pretLichidare),d=String(b&&b.directie||"").toLowerCase();return !!(x&&(x.gol||(lq>0&&(d==="short"?x.pret>=lq:d==="long"?x.pret<=lq:false))))}
function tbScenariuPropriu(v){var x=Number(String(v||"").replace(",","."));tbStare.scenariuPropriu=x>0&&isFinite(x)?x:null;renderTabloScenarii()}
/* v100.376 („fa idei”, a patra oară): take-profit-ul în PROCENTE se declanșează la un total, nu la un preț. Când din preț, în grid, nu se atinge, rândul
   lui din scenarii e prețul socotit de Pionex pe poziția de acum (numit ca pe Drum și pe grafic), iar nota de sub rânduri o spune - rândul arăta
   „take-profit-ul · −9,0 USDT”, ca și cum take-profit-ul ar închide pe minus */
function tbScenNotaTp(b){try{if(typeof TabloExtra==="undefined"||!TabloExtra.tpDinPret||TabloExtra.tpDinPret(b)!==false)return "";var r=botiNr(b.opritorProfitRaport),t=TabloExtra.totalLaTinta(b);if(r===null||t===null)return "";
  return '<p class="tbSub tbScenNota tbScenTp">Take-profit-ul tău e în procente ('+escapeHtml(tbFormateazaSemn(r*100,1).replace(/^(?=\d)/,"+")+'% din investiție = '+botiBan(t,1))+'): se declanșează la un total, nu la un preț. Rândul „take-profit, pe poziția de acum” e prețul socotit de Pionex cu poziția ținută întreagă; gridul o închide pe drum, deci totalul din rând nu e take-profit-ul. Din preț, în gridul ăsta, nu se atinge: doar din grile, în timp.</p>'}catch(e){return ""}}
