/* tablou-kpi.js — cifrele mari, mișcarea, ferestrele de timp și calculul indicatorilor pe bot
   I-940 (auditul paginii botului, 24.11): mutat NESCHIMBAT din public/app.js (v100.389). Script clasic, încărcat ÎNAINTEA lui app.js:
   doar definiții (nimic nu rulează la încărcare), numele rămân globale ca înainte; ce folosește din app.js (tbStare, tbPlan, $ …)
   se citește abia la apel. Probele îl văd lipit de app.js prin scripts/lib/sursa-app.mjs (cuTablou). */
// v100.7: „Pretul in grid” pe pretul LIVE (Pionex) cand e viu - altfel pe citirea botului; pvArata() il redeseneaza la fiecare tranzactie.
/* v100.340: totalul la prețul viu, sub rândurile totalului - doar când prețul e viu și cifra rotunjită diferă de a citirii (altfel ar repeta-o) */
function tbKpiTotalViuDeseneaza(b0){
  var el=$("tbKpiTotalViu");if(!el)return;
  var pv=b0&&typeof pvPretViuAcum==="function"?pvPretViuAcum(b0):null,t=b0&&pv!==null&&typeof TabloExtra!=="undefined"&&TabloExtra.totalLaPretViu?TabloExtra.totalLaPretViu(b0,pv):null;
  var tx=t&&botiBan(t.total)!==botiBan(Number(b0.profitTotal))?"la prețul viu: ≈ "+botiBan(t.total):"";   /* botiBan pune el unitatea (revizia: ieșea „USDT USDT”) */
  if(el.hidden!==!tx)el.hidden=!tx;if(el.textContent!==tx)el.textContent=tx;
}
function tbKpiPretDeseneaza(b0){
  var pune=function(id,text,cls){var e=$(id);if(!e)return;if(e.textContent!==text)e.textContent=text;if(cls!=null){var c=(e.classList.contains("tbKpiVal")?"tbKpiVal ":"tbSub ")+cls;if(e.className!==c)e.className=c}};   /* audit 23.10: doar ce s-a schimbat (1.114 mutații / 20 s în repaus) */
  var b=pvBotLive(b0);
  var p=botiNr(b.pretCurent),jos=botiNr(b.gridJos),sus=botiNr(b.gridSus);
  pune("tbKpiPret",p===null?"—":tbPretScurt(p),"");
  var poz=(p!==null&&jos!==null&&sus!==null&&sus>jos)?(p-jos)/(sus-jos):null;
  var dg=typeof TabloExtra!=="undefined"?TabloExtra.distanteGrid(b):null;
  var pill=$("tbKpiPozPill");if(pill){var pT=dg?dg.pill:"",pC=dg?"tbPill tbPill-"+dg.ton:"tbPill";if(pill.hidden!==!dg)pill.hidden=!dg;if(pill.textContent!==pT)pill.textContent=pT;if(pill.className!==pC)pill.className=pC}/* v100.196: ascunsă = golită (păstra textul și culoarea citirii vechi) */
  pune("tbKpiPretSub",poz===null?"fără grid citit":(dg?dg.text:(poz<0?"sub grid":poz>1?"peste grid":Math.round(poz*100)+"% din interval"))+" · "+tbPretScurt(jos)+" - "+tbPretScurt(sus),poz!==null&&(poz<0||poz>1)?"bad":"");
  var punct=$("tbKpiGridPunct");
  if(punct){if(punct.hidden!==(poz===null))punct.hidden=poz===null;if(poz!==null){var pL=(Math.min(1,Math.max(0,poz))*100).toFixed(1)+"%",pC="tbGaugePunct"+(poz<0||poz>1?" bad":"");if(punct.style.left!==pL)punct.style.left=pL;if(punct.className!==pC)punct.className=pC}}   /* audit 23.10: doar când s-a schimbat */
  tbKpiLichDeseneaza(b0);tbKpiTotalViuDeseneaza(b0);
}
/* v100.272 (ideile auditului 29.10): KPI „Lichidare” pe prețul arătat lângă el (cel viu, prin pvBotLive), redesenat la fiecare tranzacție ca
   „Prețul în grid” - înainte distanța venea din citirea botului (8–60 s în urmă) lângă prețul viu */
function tbKpiLichDeseneaza(b0){
  var pune=function(id,text,cls){var e=$(id);if(!e)return;if(e.textContent!==text)e.textContent=text;if(cls!=null){var c=(e.classList.contains("tbKpiVal")?"tbKpiVal ":"tbSub ")+cls;if(e.className!==c)e.className=c}};
  var b=typeof pvBotLive==="function"?pvBotLive(b0):b0;
  var dist=botiNr(b.distantaLichidarePct),dep=!!b.lichidareDepasita,parte=b.lichidarePartea==="sus"?"sus":b.lichidarePartea==="jos"?"jos":null;
  var nivel=dep||(dist!==null&&Math.abs(dist)<8)?"bad":dist!==null&&Math.abs(dist)<15?"tbWarn":dist===null?"mutedInfo":"good";
  pune("tbKpiLich",dep?"DEPĂȘITĂ":dist===null?"—":TextRo.pct(Math.abs(dist),1),nivel);
  var pl=botiNr(b.pretLichidare);
  pune("tbKpiLichSub",dist===null&&!dep?(b.motivFaraDistanta==="fara-pret"?"nu am prețul acum":"fără lichidare raportată"):
    (parte?"prețul trebuie să "+(parte==="jos"?"scadă":"crească")+" până la ":"lichidare la ")+(pl!==null?tbPretScurt(pl):"—"),"");
  var bara=$("tbKpiLichBara");
  if(bara){var f=dep?0:dist===null?0:Math.min(1,Math.abs(dist)/40);bara.style.width=(f*100).toFixed(1)+"%";bara.className="tbGaugeUmplut "+nivel}
}
// v100.322 (el, 11.11.2026: „sus compact, detaliile cifrelor sub grafic”): pe calculator (≥ 1181 px) proza fiecărei cifre + rândurile ei stau sub
// grafic, în #tbKpiDetalii (pe coloana cifrei); sub 1181 px, înapoi în celulă. Se mută PERECHEA (proza + rândurile, regula `:has(+.pzKvBloc)`
// le ține legate); codul le găsește după id oriunde ar sta (app.js scrie proza, asezare-paznic.js rândurile). Nimic scos, nimic dublat.
// v100.376 (I-920; el, 21.11.2026: „livrează și fă-le”): rândurile stau în #tbKpiDetalii la ORICE lățime - sub 1181 px stăteau în celulă, iar banda
// celor 4 cifre avea 450–600 px și venea, pe telefon, abia după grafic. Acum banda (doar cifrele) urcă sub verdict, rândurile ei rămân sub grafic,
// ca pe calculator. Sub 1181 px merge în bloc și rândul de cost (#tbKpiCost), după rândurile „din grid”; pe calculator rămâne în bandă.
var TB_KPI_DET=[["tbKpiGrid","tbKpiTotalSub","tbKpiTotalViu"],["tbKpiLichSub"],["tbKpiPretSub"],["tbKpiPiataSub"]];
function tbKpiAsezare(){
  var dest=$("tbKpiDetalii"),kpi=$("tbKpi");if(!dest||!kpi)return;
  if(!tbKpiAsezare.rz){tbKpiAsezare.rz=1;window.addEventListener("resize",function(){tbKpiAsezare()})}
  var lat=typeof matchMedia==="function"&&matchMedia("(min-width:1181px)").matches,cel=kpi.children;
  TB_KPI_DET.forEach(function(ids,i){var t=dest.children[i];if(!t)return;ids.forEach(function(id){var s=$(id);if(!s)return;var r=$(id+"Kv");if(s.parentNode!==t)t.appendChild(s);if(r&&r.previousElementSibling!==s)s.parentNode.insertBefore(r,s.nextSibling)})});
  var cost=$("tbKpiCost"),d0=dest.children[0];
  if(cost&&d0){if(lat){if(cel[0]&&cost.parentNode!==cel[0])cel[0].appendChild(cost)}else{var dupa=$("tbKpiGridKv")||$("tbKpiGrid");if(dupa&&dupa.parentNode===d0){if(dupa.nextSibling!==cost)d0.insertBefore(cost,dupa.nextSibling)}else if(cost.parentNode!==d0)d0.appendChild(cost)}}
  if(dest.hidden)dest.hidden=false;   /* revizia 11.11: atributul doar când se schimbă (altfel o mutație + recalculul :has() la fiecare desen); v100.376: blocul se arată la orice lățime */
  if(typeof tbAvertGazda==="function")tbAvertGazda();   /* v100.340: și rândul de avertismente își schimbă gazda cu lățimea */
}
// v100.378 (I-922, I-923, I-925; el, 23.11.2026: „în Radar, și la bot și la Trade 212, să fie vizibilă mișcarea live, cât a crescut astăzi sau scăzut,
// 3 zile, 5-7” ⇒ „fă toate, 24 de ore”): banda „Mișcarea”, deasupra graficului (#tbMiscare) - prețul pe 24 h / 3 zile / 7 zile / 30 de zile, cu locul
// lui între minimul și maximul ferestrei; aceeași fereastră față de BTC, în puncte; și cât a făcut BOTUL (USDT) pe 24 h / 3 / 7 zile, din grile și
// din rest. Zero cereri noi pentru bot: lumânările sunt ale „Direcției” (5 intervale, la 5 minute) sau ale graficului, istoria botului e cea de 7 zile
// adusă deja (tbSapt). Doar BTC se aduce în plus: 4 cereri la 5 minute. Calculul e în lib/miscare.js; aici doar desenul, care atinge numai ce s-a
// schimbat (cel mult o dată pe secundă la prețul viu). Sunt fapte, nu semnal: culoarea e doar semnul, după efectul pe bot (la short, prețul în sus e roșu).
var tbMi={raw:{},bare:{},btc:{sim:null,la:0,inLucru:false,pe:null,laPe:{}},desLa:0,botMemo:null};
var TB_MI_BTC_MS=5*60000,TB_MI_BTC_VECHI_MS=15*60000,TB_MI_BTC_LIM={"5M":300,"15M":300,"60M":180,"4H":190};
function tbMiLumPe(b){
  var s=TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex,d=tbStare.directie,dOk=!!(d&&d.randuriPe&&d.simbol===tbCheieDir(b)),pe={};
  Miscare.FERESTRE.forEach(function(f){
    var rd=dOk?d.randuriPe[f.tf]:null,c=tbStare.graficCache?tbStare.graficCache[s+"|"+f.tf]:null,r=Array.isArray(rd)&&rd.length?rd:c&&Array.isArray(c.randuri)&&c.randuri.length?c.randuri:null,k=s+"|"+f.tf;
    if(!r){pe[f.tf]=null;return}
    if(tbMi.raw[k]!==r){tbMi.raw[k]=r;tbMi.bare[k]=GridCalcul.bareToate(r)}   /* lumânările se citesc o dată pe aducere, nu la fiecare tranzacție */
    pe[f.tf]=tbMi.bare[k];
  });
  return pe;
}
function tbMiAduBtc(simBtc){
  var q=tbMi.btc;if(q.inLucru||(q.sim===simBtc&&Date.now()-q.la<TB_MI_BTC_MS))return;
  q.inLucru=true;
  (async function(){
    /* revizia: ora citirii pe FIECARE interval, pusă doar la reușită (laPe) - una picată ține ce avea, cu ora ei veche; peste 15 minute nu se mai
       folosește (altfel „față de BTC” compara moneda la zi cu BTC de acum trei ore, sub „BTC citit la <acum>”) */
    var pe={},laPe={},adu=tbAduTf(simBtc),vechi=q.sim===simBtc?q:null;
    for(var i=0;i<Miscare.FERESTRE.length;i++){var f=Miscare.FERESTRE[i];try{pe[f.tf]=GridCalcul.bareToate(await adu(f.tf,TB_MI_BTC_LIM[f.tf]));laPe[f.tf]=Date.now()}catch(e){pe[f.tf]=vechi&&vechi.pe?vechi.pe[f.tf]||null:null;laPe[f.tf]=vechi&&vechi.laPe?vechi.laPe[f.tf]||0:0}}
    tbMi.btc={sim:simBtc,la:Date.now(),inLucru:false,pe:pe,laPe:laPe};
    if(tbPanouVizibil()&&tbStare.bot)tbMiscareDeseneaza(tbStare.bot,true);
  })();
}
function tbMiVarsta(ms){var h=ms/3600000;return h<1?Math.max(1,Math.round(ms/60000))+" min":h<48?TextRo.oreN(Math.max(1,Math.round(h))):TextRo.num(h/24,1)+" zile"}   /* v100.380: sub o oră în minute (46 de minute ieșea „1 oră: prima cifră după o oră”) */
function tbMiscareSchelet(){
  var F=Miscare.FERESTRE,CAT={"24h":"24 de ore","3z":"3 zile","7z":"7 zile","30z":"30 de zile"};
  var cap='<div class="miRand miCap"><span class="miEt"></span>'+F.map(function(f){return '<button type="button" class="miFer" data-mi-tf="'+f.tf+'" data-action-click="tbAlegeInterval(\''+f.tf+'\')" title="arată graficul pe '+CAT[f.k]+'">'+f.et+'</button>'}).join("")+'</div>';
  var pret='<div class="miRand" id="miPretRand"><span class="miEt">Prețul</span>'+F.map(function(f){return '<span class="miCel"><b id="miP-'+f.k+'" class="miVal mutedInfo">—</b><span class="miRigla" aria-hidden="true"><i id="miL-'+f.k+'" hidden></i></span><span id="miS-'+f.k+'" class="tbSub"></span></span>'}).join("")+'</div>';
  var btc='<div class="miRand" id="miBtcRand"><span class="miEt">față de BTC</span>'+F.map(function(f){return '<span class="miCel"><b id="miB-'+f.k+'" class="miVal miMic mutedInfo">—</b><span id="miBs-'+f.k+'" class="tbSub"></span></span>'}).join("")+'</div>';
  /* rândul botului are ferestrele LUI (1 oră, 4 ore, 24 h, 3 zile, 7 zile), cu eticheta în celulă: boții lui trăiesc ore, nu zile */
  var bot='<div class="miRand miBot" id="miBotRand"><span class="miEt">Botul, USDT</span><span class="miBotCel">'+Miscare.FERESTRE_BOT.map(function(f){return '<span class="miCel" id="miC-'+f.k+'" hidden><span class="miFerEt">'+f.et+'</span><b id="miT-'+f.k+'" class="miVal mutedInfo">—</b><span id="miG-'+f.k+'" class="tbSub"></span></span>'}).join("")+'<span class="tbSub miBotNota" id="miBotNota"></span></span></div>';
  return '<div class="tbBlocCap"><h4>Mișcarea</h4><span class="tbSub" id="miNota">cât s-a mișcat până acum, nu ce urmează</span></div><div class="miGrila">'+cap+pret+btc+bot+'</div>';
}
function tbMiscareDeseneaza(b,forta){
  var el=$("tbMiscare");if(!el||typeof Miscare==="undefined")return;
  if(!b){if(!el.hidden)el.hidden=true;return}
  var acum=Date.now();if(!forta&&acum-tbMi.desLa<1000)return;tbMi.desLa=acum;
  if(!$("miP-24h"))el.innerHTML=tbMiscareSchelet();
  if(el.hidden)el.hidden=false;
  var pune=function(id,text,cls,titlu){var e=$(id);if(!e)return;if(e.textContent!==text)e.textContent=text;if(cls!=null&&e.className!==cls)e.className=cls;if(titlu!=null&&e.title!==titlu)e.title=titlu};
  var s=TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex,eBtc=/^BTC_/.test(s),simBtc=/_PERP$/.test(s)?"BTC_USDT_PERP":"BTC_USDT";
  var bl=typeof pvBotLive==="function"?pvBotLive(b):b,pret=botiNr(bl.pretCurent),pe=tbMiLumPe(b),fer=Miscare.ferestre(pe,pret,acum),zi=Miscare.ziObisnuita(pe["4H"]);
  var cl=function(r){return r>0?(bsTonEfect("sus",b.directie)==="sus"?"good":"bad"):r<0?(bsTonEfect("jos",b.directie)==="jos"?"bad":"good"):""},rot=function(v){return Math.round(v*10)/10};
  /* culoarea prețului e după EFECTUL pe bot (ca „azi” din banda de sus): la short, prețul în sus e roșu - spus lângă titlu, ca plusul roșu să nu mire */
  var eShort=String(b.directie||"").toLowerCase()==="short";pune("miNota","cât s-a mișcat până acum, nu ce urmează"+(eShort?" · bot short: prețul în sus e roșu":""),"tbSub");
  if(!eBtc)tbMiAduBtc(simBtc);
  var bp=!eBtc&&tbMi.btc.sim===simBtc?tbMi.btc.pe:null,ult=function(l){return l&&l.length?l[l.length-1].c:null};
  var rb=$("miBtcRand");if(rb&&rb.hidden!==eBtc)rb.hidden=eBtc;
  Miscare.FERESTRE.forEach(function(f){
    var w=fer[f.k];
    pune("miP-"+f.k,w?TextRo.pctSemn(w.pct,1):"—","miVal "+(w?cl(rot(w.pct)):"mutedInfo"),w?"de la "+tbPretScurt(w.ref)+" la "+tbPretScurt(pret)+" · în fereastră: minim "+tbPretScurt(w.min)+", maxim "+tbPretScurt(w.max):pe[f.tf]?"istoria monedei e mai scurtă decât fereastra":"aștept lumânările");
    var m=$("miL-"+f.k);if(m){var L=w?(Math.min(1,Math.max(0,w.loc))*100).toFixed(1)+"%":"";if(m.hidden!==!w)m.hidden=!w;if(w&&m.style.left!==L)m.style.left=L}
    var ori=f.k==="24h"&&w?Miscare.deCateOri(w.pct,zi):null,sub=ori!==null?TextRo.ori(ori,1)+" o zi obișnuită":"";
    pune("miS-"+f.k,sub,"tbSub",sub?"mișcarea pe 24 h față de mediana mișcării ei pe 24 h din ultimele 30 de zile ("+TextRo.pct(zi.mediana,1)+")":"");
    if(eBtc)return;
    var laB=bp&&tbMi.btc.laPe?tbMi.btc.laPe[f.tf]||0:0,proaspat=laB>0&&acum-laB<TB_MI_BTC_VECHI_MS,lb=bp&&proaspat?bp[f.tf]:null,wb=lb?Miscare.fereastra(lb,ult(lb),acum,f.ms,f.per):null,df=Miscare.fataDe(w,wb),oraB=laB?new Date(laB).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"}):"";
    /* el, 23.11.2026: „ce înseamnă 2.1p?” ⇒ în cuvinte, fără prescurtare: „2,1 peste” / „4,1 sub” / „la fel” */
    var rd=df===null?null:rot(df);
    pune("miB-"+f.k,df===null?"—":rd===0?"la fel":TextRo.num(Math.abs(rd),1)+(rd>0?" peste":" sub"),"miVal miMic "+(df===null?"mutedInfo":cl(rd)),df===null?(!bp?"aduc lumânările BTC":laB&&!proaspat?"BTC n-a mai putut fi citit de la "+oraB:""):"cu câte puncte procentuale a făcut moneda mai mult (peste) sau mai puțin (sub) decât BTC pe aceeași fereastră; BTC citit la "+oraB);
    pune("miBs-"+f.k,wb?"BTC "+TextRo.pctSemn(wb.pct,1):"","tbSub");
  });
  var ist=typeof tbSapt!=="undefined"&&tbSapt&&tbSapt.botId===b.id?tbSapt:null;
  /* revizia: istoria are ~10.000 de puncte ⇒ banii botului se socotesc o dată pe citire și pe minut (tbMi.botMemo), nu la fiecare secundă de preț viu */
  var cheieB=ist&&Array.isArray(ist.intrari)?[b.id,ist.la,ist.intrari.length,b.profitTotal,b.gridProfitBrut,b.gridJos,b.gridSus,Math.floor(acum/60000)].join("|"):null;
  if(cheieB&&!(tbMi.botMemo&&tbMi.botMemo.k===cheieB))tbMi.botMemo={k:cheieB,v:Miscare.botFerestre(ist.intrari,acum,{total:botiNr(b.profitTotal),grile:botiNr(b.gridProfitBrut),pornitLa:botiNr(b.pornitLa),gridJos:botiNr(b.gridJos),gridSus:botiNr(b.gridSus)})};
  var bf=cheieB?tbMi.botMemo.v:null;
  var s1=function(v){var x=TextRo.num(v,1);return v>0&&x!=="0,0"?"+"+x:x};
  /* se arată doar ferestrele pe care botul le-a trăit; cele mai lungi decât vârsta lui se spun o dată, într-o notă (nu câte un „—” pe fiecare) */
  var nVaz=0,varsta=null;
  Miscare.FERESTRE_BOT.forEach(function(f){
    var r=bf?bf[f.k]:null,cel=$("miC-"+f.k),arat=!!(r&&r.motiv!=="tanar"),tx="—",c="miVal mutedInfo",sb="";
    if(r&&r.motiv==="tanar"&&varsta===null)varsta=r.varsta;
    if(cel&&cel.hidden!==!arat)cel.hidden=!arat;
    if(!arat)return;nVaz++;
    if(r.motiv==="scurt")sb="fără istorie atât de veche";
    else if(r.motiv==="gol")sb="colectorul a stat atunci";
    else{var rt=rot(r.total);tx=s1(r.total);c="miVal "+(rt>0?"good":rt<0?"bad":"");sb=(r.grile===null?"":"grile "+s1(r.grile)+" · restul "+s1(r.rest))+(r.gridMutat?" · grid mutat":"")}
    pune("miT-"+f.k,tx,c,!r.motiv?"rezultatul total de acum minus cel de acum "+f.et+"; restul = poziția deschisă, finanțarea și celelalte costuri":"");pune("miG-"+f.k,sb,"tbSub");
  });
  pune("miBotNota",!ist?"aștept istoria botului":ist.eroare?"istoria botului: "+String(ist.eroare):!bf?"":varsta!==null?(nVaz?"botul are "+tbMiVarsta(varsta)+": ferestrele mai lungi apar pe măsură ce le trăiește":"botul are "+tbMiVarsta(varsta)+": prima cifră după o oră"):"","tbSub miBotNota");
}
function tbDeseneazaKpi(){if(typeof tbKpiAsezare==="function")tbKpiAsezare();if(typeof tbMiscareDeseneaza==="function")tbMiscareDeseneaza(tbStare.routeOk===false?null:tbStare.bot,true);   /* v100.378: banda mișcării, la fiecare citire a botului */
  
  var b=tbStare.routeOk===false?null:tbStare.bot;
  var pune=function(id,text,cls){var e=$(id);if(!e)return;if(e.textContent!==text)e.textContent=text;if(cls!=null){var c=(e.classList.contains("tbKpiVal")?"tbKpiVal ":"tbSub ")+cls;if(e.className!==c)e.className=c}};   /* audit 23.10: doar ce s-a schimbat (1.114 mutații / 20 s în repaus) */
  if(!b){tbKpiTotalViuDeseneaza(null);   /* revizia: fără bot, „la prețul viu” nu rămâne cu cifra veche */
    ["tbKpiTotal","tbKpiLich","tbKpiPret","tbKpiPiata"].forEach(function(id){pune(id,"—","")});pune("tbKpiGrid","—","tbKpiGrid");
    ["tbKpiTotalSub","tbKpiLichSub","tbKpiPretSub","tbKpiPiataSub"].forEach(function(id){pune(id,"—","")});pune("tbKpiTotalSub",tbTextFaraBot(),"");return}   /* v100.196: un îndemn, nu patru „—” */
  var tot=botiNr(b.profitTotal),inv=botiNr(b.investit);
  var s1=function(v){var x=TextRo.num(v,1);return v>0&&x!=="0,0"?"+"+x:x};   /* v100.196: o zecimală, virgula, „−” */
  pune("tbKpiTotal",tot===null?"—":s1(tot),botiClasa(b.profitTotal));
  // v87: ritmul de recuperare (grile - costuri pe zi) langa rezultat
  var gvc=typeof TabloExtra!=="undefined"?TabloExtra.grileVsCosturi(b,Date.now()):null,rr=gvc?TabloExtra.ritmRecuperare(tot,gvc.netZi):null;
  // v100.40: sub o zi de viata ritmul nu se socoteste (taxa de pornire nu e un cost zilnic) - se spune, nu dispare fara explicatie
  var nN=typeof TabloExtra!=="undefined"&&TabloExtra.notaTotal?TabloExtra.notaTotal(b):null;   /* v100.272 (ideile auditului 29.10): la neutru semnul poziției din total e nesigur - spus lângă cifră */
  pune("tbKpiTotalSub",(tot!==null&&inv!==null&&inv>0?TextRo.pctSemn(100*tot/inv,1)+" din "+TextRo.num(inv,1)+" investiți":"cu tot cu poziția deschisă")+(nN?" · "+nN:"")+(rr&&rr.zile!==0?" · "+rr.text.replace(/, dacă prețul stă pe loc$/," (preț pe loc)"):tot!==null&&tot<0&&gvc&&gvc.preaTanar?" · ritmul de recuperare se socotește după o zi de viață":"")+(typeof tbOraCitirii==="function"?tbOraCitirii():""),"");   /* v100.339: ora citirii botului (prețul de alături e viu, totalul e al citirii) */
  // v100.4 (el, 28.09: „lipsește profit per grilă, adică doar din grid”): ce a adus DOAR gridul (Pionex „Grid profit”) + cat aduce o grila
  var gp=botiNr(b.gridProfitBrut),pg=typeof TabloExtra!=="undefined"?TabloExtra.profitPeGrila(b):null;
  var fb=typeof TabloExtra!=="undefined"&&tbStare.funding&&tbStare.funding.info&&tbStare.funding.sim===TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex?TabloExtra.fundingBot(b,tbStare.funding.info):null;   /* v100.136: funding-ul monedei, langa grid; revizia (I3): doar al monedei botului de acum */
  pune("tbKpiGrid","din grid "+(gp===null?"—":s1(gp)+" USDT")+(pg?" · pe grilă "+GridCalcul.procent(pg.pct)+(pg.usdt!==null?" ≈ "+tbPeGrilaUsdt(pg.usdt)+" USDT":""):"")+(fb?" · "+fb.text:""),"tbKpiGrid "+botiClasa(b.gridProfitBrut));
  if(typeof tbCostDeseneaza==="function")tbCostDeseneaza(b);   /* v100.373: rândul de cost */
  tbKpiPretDeseneaza(b);   /* v100.272: și KPI-ul „Lichidare” (tbKpiLichDeseneaza), pe prețul viu */
  /* v100.267 (auditul 29.10): KPI „Piața” doar din direcția monedei botului de acum - la schimbarea botului arăta moneda veche */
  var d=tbStare.directie&&tbStare.directie.simbol===tbCheieDir(b)?tbStare.directie:null,z=d&&d.rez&&typeof Directie!=="undefined"?Directie.rezumat(d.rez,b.directie):null;
  if(!z||z.ton==="nu-se-poate"){pune("tbKpiPiata","—","mutedInfo");pune("tbKpiPiataSub",z?z.text:"aștept lumânările","");return}
  pune("tbKpiPiata",z.ton==="rau"?"Împotrivă":z.ton==="bine"?"Cu botul":z.ton==="lateral"?"Laterală":"Amestecat",tbTon(z.ton));   /* v100.340: piața laterală nu e „cu botul” */
  var mari=d.rez.filter(function(r){return r.dir&&(r.tf==="4H"||r.tf==="1D")});
  var nume={urca:"urcă",coboara:"coboară",lateral:"laterală"};
  var b4=d.rez.filter(function(r){return r.tf==="4H"})[0];
  pune("tbKpiPiataSub",mari.map(function(r){return r.eticheta+" "+nume[r.dir]}).join(", ")+
    (b4&&b4.formare&&isFinite(b4.formare.pct)?"; bara de 4 ore acum "+tbFormateazaSemn(b4.formare.pct,1)+"%":""),"");
}
// v75: Tabloul unic - directia pietei fata de bot, graficul pe 24h, dovada.
// Toate cifrele de aici trec prin modulele pure (Directie, TabloBot), probate
// fara browser; aici doar se aduc datele si se deseneaza. Lipsa ramane "—".
var TB_DIR_TF=[
  {tf:"15M",eticheta:"15 min",orizont:16,limit:500,orizontText:"4 ore"},
  {tf:"60M",eticheta:"1 oră",orizont:24,limit:500,orizontText:"o zi"},
  {tf:"4H",eticheta:"4 ore",orizont:6,limit:500,orizontText:"o zi"},
  {tf:"1D",eticheta:"1 zi",orizont:7,limit:400,orizontText:"o săptămână"}];
// v100.106 (revizia R2): 5 min și 30 min doar pentru semaforul trendului de pe grafic (2 cereri în plus la 5 min) - „Direcția pieței”
// și „Ce spun indicatorii” rămân pe cele 4 intervale de mai sus
var TB_SEM_EXTRA=[{tf:"5M",limit:500},{tf:"30M",limit:500}];
var TB_DIR_REINCERCARE_MS=30000;
var TB_DIR_MS=5*60000,TB_GRAFIC_MS=2*60000;
// v100.137 (el, 08.10: „să meargă ușor să schimb time frame-urile”, a ales intervale ca în TradingView): cheia e INTERVALUL lumânării
// (5M/15M/60M/4H/1D), fiecare cu perioada lui (l = câte lumânări) și eticheta axei (per: GraficBot pune ora pe „24h”, data în rest).
// Cheile vechi (24h/3z/7z) rămân primite (becurile vechi, preferințe). Lumânările stau în tbStare.graficCache pe simbol|interval ⇒
// schimbarea e instantă; după primul desen se aduc din spate și celelalte intervale (tbPreiaRestulTf), cu pauză între cereri.
var TB_PERIOADE={"5M":{i:"5M",l:288,per:"24h",gaura:12*60000,eticheta:"5m",cat:"24 de ore"},"15M":{i:"15M",l:288,per:"3z",gaura:40*60000,eticheta:"15m",cat:"3 zile"},"60M":{i:"60M",l:168,per:"7z",gaura:150*60000,eticheta:"1h",cat:"7 zile"},"4H":{i:"4H",l:180,per:"30z",gaura:10*3600000,eticheta:"4h",cat:"30 de zile"},"1D":{i:"1D",l:200,per:"200z",gaura:3*86400000,eticheta:"1z",cat:"200 de zile"}};
var TB_TF_VECHI={"24h":"5M","3z":"15M","7z":"60M"};
var TB_TF_CHEIE="tabloBotTf_v1",TB_FER_CHEIE="tabloBotFereastra_v2";
// revizia (10): intervalul ales se ține minte (ca în TradingView); o valoare veche (24h/3z/7z) sau stricată cade pe 5m
function tbTf(){
  if(!tbStare.graficInterval){var v=tbCiteste(TB_TF_CHEIE);v=TB_TF_VECHI[v]||v;tbStare.graficInterval=TB_PERIOADE[v]?v:"5M"}
  return TB_PERIOADE[tbStare.graficInterval]?tbStare.graficInterval:"5M"
}
function tbTfButoane(){var p=tbTf();Object.keys(TB_PERIOADE).forEach(function(k){var e=$("tbInt"+k);if(e)e.setAttribute("aria-pressed",String(k===p))})}
// v100.144 (el 08.10, „fa idei”): butonul „24 h” / „3 zile” de lângă intervale - toată fereastra intervalului, nu doar de la pornirea botului
// (GraficBot.fereastraBot); alegerea se ține în memoria paginii; butonul se vede doar când fereastra botului e posibilă (bot pornit în fereastră)
// v100.145 (el 08.10, „fa idei”): alegerea e PE BOT ({id: 1} în tabloBotFereastra_v2) - pe un bot vechi vrei ziua, pe unul nou fereastra lui
// v100.146 (revizia Opus): procentele din textele Busolei la o zecimală ROTUNJITĂ („−0,999%” ⇒ „−1,0%”), nu tăiată
function tbRotPct(t){return String(t).replace(/([−+-]?)(\d+),(\d+)%/g,function(m,s,a,b){return s+(Math.round(Number(a+"."+b)*10)/10).toFixed(1).replace(".",",")+"%"})}
function tbFereastraToataE(){var b=tbStare.bot,id=b&&b.id!=null?String(b.id):"";if(!tbStare.fereastraToataPe){var v=tbCiteste(TB_FER_CHEIE);tbStare.fereastraToataPe=v&&typeof v==="object"?v:{}}return !!(id&&tbStare.fereastraToataPe[id])}
function tbFereastraToata(){var b=tbStare.bot;if(!b||b.id==null)return;var id=String(b.id),era=tbFereastraToataE(),m=tbStare.fereastraToataPe;if(era)delete m[id];else m[id]=1;tbScrie(TB_FER_CHEIE,m);renderTabloGrafic()}
// audit 23.10: butonul „24 h” se atinge doar când i se schimbă ceva (era rescris la fiecare desen)
function tbFereastraButon(oG){var e=$("tbFerToata");if(!e)return;if(e.hidden!==!oG.fereastraPosibila)e.hidden=!oG.fereastraPosibila;var cat=TB_PERIOADE[tbTf()].cat||"",tx=cat==="24 de ore"?"24 h":cat,ap=String(!!oG.fereastraToata);if(e.textContent!==tx)e.textContent=tx;if(e.getAttribute("aria-pressed")!==ap)e.setAttribute("aria-pressed",ap);
  var ti=oG.fereastraToata?"toată fereastra ("+cat+") · apasă: doar de la pornirea botului, cu 2 ore înainte":"apasă: toată fereastra ("+cat+"), nu doar de la pornirea botului";if(e.title!==ti)e.title=ti}
// v100.146 (el 08.10, ideea 2): lumânările de 1 MINUT ale ferestrei botului (de la pornire − 2 h), pentru umplerile deduse - cele de 5 min nu văd
// oscilațiile din interiorul lor (109 deduse față de 181 la Pionex). Pagini de 500 (Pionex dă cele mai noi întâi), cel mult 3 (25 h); mai vechi
// ⇒ nu se cer, rămân lumânările graficului. Se țin 2 minute; când vin date noi, graficul se redesenează o dată
var tbUm1m={sim:null,pornit:0,la:0,bare:null,inLucru:false};
var TB_UM1M_MS=2*60000,TB_UM1M_PAGINI=3;
function tbBare1m(b){if(!b||!(Number(b.pornitLa)>0)||!tbUm1m.bare)return null;var sim=TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex;return tbUm1m.sim===sim&&tbUm1m.pornit===Number(b.pornitLa)?tbUm1m.bare:null}
function tbAdu1m(b){
  if(!b||!(Number(b.pornitLa)>0)||typeof GridCalcul==="undefined")return;
  var sim=TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex,pornit=Number(b.pornitLa),deLa=pornit-2*3600000,acum=Date.now();
  if(acum-deLa>TB_UM1M_PAGINI*500*60000){if(tbUm1m.sim!==sim||tbUm1m.pornit!==pornit)tbUm1m={sim:sim,pornit:pornit,la:acum,bare:null,inLucru:false};return}
  if(tbUm1m.inLucru||(tbUm1m.sim===sim&&tbUm1m.pornit===pornit&&acum-tbUm1m.la<TB_UM1M_MS))return;
  tbUm1m.inLucru=true;
  (async function(){
    var baza="/api/market?type=pionex_klines&symbol="+encodeURIComponent(sim)+"&interval=1M&limit=500",r=[],end=null,ok=false;
    try{for(var p=0;p<TB_UM1M_PAGINI;p++){var k=await getJSON(baza+(end?"&endTime="+end:""));var l=k&&k.data&&Array.isArray(k.data.klines)?k.data.klines:null;if(!l||!l.length)break;r=r.concat(l);ok=true;var tMin=Math.min.apply(null,l.map(function(x){return Number(x.time)}).filter(isFinite));if(l.length<500||!(tMin>deLa))break;end=tMin-1}}catch(e){}
    var bare=ok?GridCalcul.bare(r).slice().sort(function(a,b){return a.t-b.t}):null;
    if(bare&&(!bare.length||bare[0].t>pornit))bare=null;   /* nu acoperă de la pornire ⇒ nu se folosesc */
    var vechi=tbUm1m.bare,acelasi=tbUm1m.sim===sim&&tbUm1m.pornit===pornit,nou=!!bare&&(!vechi||!acelasi||bare.length!==vechi.length||bare[bare.length-1].c!==vechi[vechi.length-1].c||bare[bare.length-1].t!==vechi[vechi.length-1].t);
    // revizia Opus: o aducere picată (503, pagina a 2-a căzută) NU aruncă lumânările bune ale aceluiași bot; reîncearcă în 30 s, nu în 2 minute
    if(!bare&&acelasi&&vechi){tbUm1m={sim:sim,pornit:pornit,la:Date.now()-TB_UM1M_MS+30000,bare:vechi,inLucru:false};return}
    tbUm1m={sim:sim,pornit:pornit,la:bare?Date.now():Date.now()-TB_UM1M_MS+30000,bare:bare,inLucru:false};
    if(nou&&tbPanouVizibil()&&tbStare.bot&&String(tbStare.bot.id)===String(b.id))renderTabloGrafic()
  })()}
function tbAlegeInterval(p){
  p=TB_TF_VECHI[p]||p;if(!TB_PERIOADE[p])return;
  tbStare.graficInterval=p;tbScrie(TB_TF_CHEIE,p);tbTfButoane();
  // lumânările deja aduse pentru intervalul ăsta se arată PE LOC (chiar dacă-s mai vechi de 2 minute); tbAduGraficul le împrospătează din spate
  var b=tbStare.bot,c=b?tbStare.graficCache[TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex+"|"+p]:null;
  if(c&&c.randuri){tbStare.grafic={la:c.la,simbol:c.cheie,randuri:c.randuri,eroare:null,inLucru:false};renderTabloGrafic()}
  else renderTabloGrafic();
  tbAduGraficul()
}
// v100.137 (revizia 4): celelalte intervale NU se mai cer de la Pionex - „Direcția pieței” aduce deja toate cele 5 intervale (tbAduDirectie,
// la 5 minute, 400–500 de lumânări); de acolo se taie ultimele l și intră în cache, cu ora aducerii lor. Zero cereri în plus, zero reîncercări.
// Dacă intervalul ALES tocmai a sosit așa cât ecranul spunea „Aștept prețurile…”, se arată pe loc (revizia 1).
function tbPreiaRestulTf(s){
  var b=tbStare.bot,d=tbStare.directie;if(!b||!d||!d.randuriPe||d.simbol!==tbCheieDir(b))return;
  if(TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex!==s)return;
  var curent=s+"|"+tbTf();
  Object.keys(TB_PERIOADE).forEach(function(tf){
    var cheie=s+"|"+tf,per=TB_PERIOADE[tf],rd=d.randuriPe[per.i];
    if(tbStare.graficCache[cheie]||!Array.isArray(rd)||!rd.length)return;
    // revizia 08.10 (poza: axa de 42 h pe 5m, RSI 92): Pionex dă lumânările cu cea mai NOUĂ întâi - sortez crescător ÎNAINTE să tai ultimele l
    var tt=function(r){return Number(Array.isArray(r)?r[0]:r&&r.time)};
    tbStare.graficCache[cheie]={cheie:cheie,randuri:rd.slice().sort(function(a,b){return tt(a)-tt(b)}).slice(-per.l),la:d.la||Date.now()};
    if(cheie===curent&&(!tbStare.grafic||tbStare.grafic.simbol!==cheie)&&!(tbStare.grafic&&tbStare.grafic.inLucru)){tbStare.grafic={la:d.la||Date.now(),simbol:cheie,randuri:tbStare.graficCache[cheie].randuri,eroare:null,inLucru:false};renderTabloGrafic()}
  });
}
// v100.112 (I-553): lumânările unui TF din Pionex (eroare când nu vin) - rețeaua pentru TabloTrend.tura / reia
function tbAduTf(s){return async function(tf,lim){var k=await getJSON("/api/market?type=pionex_klines&symbol="+encodeURIComponent(s)+"&interval="+tf+"&limit="+lim),r=k&&k.data&&Array.isArray(k.data.klines)?k.data.klines:null;if(!Array.isArray(r))throw new Error((k&&k.error)||"Pionex nu a dat lumânări");return r}}   /* revizia: lista goală rămâne date (ca în v100.111) */
async function tbAduDirectie(){
  var b=tbStare.bot;if(!b||typeof Directie==="undefined"||typeof TabloTrend==="undefined")return;
  var s=TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex;
  var d=tbStare.directie||(tbStare.directie={la:0,simbol:null,rez:null,inLucru:false});
  var cheie=s+"|"+(b.directie||"");
  if(d.inLucru||(d.simbol===cheie&&Date.now()-d.la<(d.eroare?TB_DIR_REINCERCARE_MS:TB_DIR_MS)))return;
  d.inLucru=true;
  try{
    // v100.112 (I-553): tura (pe rând - Pionex numără cererile), „Direcția” cu motivul erorii, lipsa și reluarea ei - în TabloTrend (pur, probat
    // pe secvențe de răspunsuri); lumânările pe interval intră în d.randuriPe o dată, la final (v100.106, revizia R1)
    var t=await TabloTrend.tura({dirTf:TB_DIR_TF,extraTf:TB_SEM_EXTRA,aduce:tbAduTf(s),analizeaza:function(rows,x){return Directie.analizeaza(rows,x.orizont,b.directie)},motiv:textEroare,
      pas:function(pe){if(d.simbol!==cheie){d.peLucru={cheie:cheie,pe:pe};if(typeof renderTabloGrafic==="function"){renderTabloGrafic();renderTabloTrend()}}}});   /* v100.110 (I-548): becurile pe rând - la prima încărcare / altă monedă */
    d.randuri4h=t.pe["4H"]||(d.simbol===cheie?d.randuri4h:null);   // revizia: 4 h picat la altă monedă - nu lumânările monedei de dinainte
    // v91.9: "Mediul botului" - rata de funding a monedei si lumanarile de 4h ale BTC (2 cereri in plus la 5 min)
    try{var fr=await getJSON("/api/market?type=pionex_funding&symbol="+encodeURIComponent(s));d.fundingRates=fr&&fr.data&&Array.isArray(fr.data.rates)?fr.data.rates:null}catch(e){d.fundingRates=null}
    try{var kb=await getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=4H&limit=200");d.btc4h=kb&&kb.data&&Array.isArray(kb.data.klines)?kb.data.klines:null}catch(e){d.btc4h=null}
    // v100.320 (el, 11.11.2026): notele TradingView (Technicals / Technical Ratings) pe moneda botului - o cerere la server (scannerul TradingView,
    // nu Pionex), în același ritm cu lumânările direcției; desenate de renderTabloTv în cardul „Trendul pe TF-uri”. Nu intră în verdict.
    /* v100.339 (auditul din 13.11): cererea pleacă FĂRĂ await - cu TradingView lent (2 cereri × 8 s) direcția și indicatorii întârziau până la
       16 s la fiecare tură; nota se desenează când sosește (tbAduTv), cu ora serverului și cheia monedei ei (nu apare sub altă monedă) */
    tbAduTv(d,s,cheie);
    d.rez=t.rez;d.randuriPe=t.pe;d.simbol=cheie;d.la=Date.now();d.eroare=t.eroare;
    // revizia v100.110 (R2): reluarea se programează abia acum (după d.randuriPe), și doar dacă n-au căzut toate (atunci se reia toată tura la 30 s)
    d.lipsa=t.lipsa;d.reiaProgramat=t.reiaProgramat;d.aDouaOara=false;if(d.reiaProgramat)setTimeout(tbReiaLipsa,30000);
    tbCalculeazaIndicatorii(d);
  }finally{d.inLucru=false}
  renderTabloDirectia();renderTabloIndicatori();
  if(typeof renderTabloGrafic==="function")renderTabloGrafic();   /* v100.106 (revizia): semaforul apare cum sosesc lumânările */
}
// v91.8: "Ce spun indicatorii" langa grafic - aceleasi calcule ca "Analizeaza piata" (calc), pe barele INCHISE
// ale celor 4 intervale pe care Tabloul le aduce deja pentru directie (zero cereri in plus catre Pionex).
var TB_TF_CALC={"15M":"15m","60M":"1h","4H":"4h","1D":"1d"};
/* v100.339 (I-873; măsurat în docs/cercetare/2026-11-13-tablou-acuratete.md, M2): verdictul ARĂTAT se schimbă abia când două bare închise la
   rând zic la fel (episoadele de cel mult două bare: de la ~49% la ~20%). Verdictele celor două bare dinainte se socotesc o singură dată pe bară
   închisă și pe interval, după desen (2 × ~18 ms), apoi cartela se redesenează; până atunci se arată verdictul barei. q.ver devine cel confirmat,
   q.verBrut al barei, q.neconfirmat ce așteaptă a doua bară, q.miscatDe componenta care a mișcat scorul, q.tineDe (doar pe 4 ore, din istoria scorului). */
/* „ține de N bare” (I-873): pe 4 ore, câte bare închise la rând au același verdict ca ultima - din istoria scorului (tbIstoric4h), unde fiecare
   bară își ține verdictul de atunci. Se pune doar când istoria e gata și ultima ei bară zice ce zice bara de acum. */
function tbTineDe(d){var l=d&&Array.isArray(d.indicatori)?d.indicatori:null,x=l?l.filter(function(y){return y.tf==="4H"&&y.q})[0]:null,ist=x&&typeof tbIstoric4hGata==="function"?tbIstoric4hGata(d.simbol):null;if(!x||!ist||!ist.length)return;var u=ist[ist.length-1].ver,n=0;for(var i=ist.length-1;i>=0&&ist[i].ver===u;i--)n++;if(u===(x.q.verBrut||x.q.ver))x.q.tineDe=n}
/* v100.339 (nimic pierdut): rândul „drumul prețului, în trepte” a luat locul „amplitudinii vs treaptă”; cifra amplitudinii (ATR față de
   treaptă) și percentila ei rămân pe același rând, ca fapt - fără starea ei „rău”, care se aprindea cât botul lucra. */
function tbRandTrepte(m){var t=m?m.trepte:undefined,a=m?m.amplitudine:null;if(!t||!a||a.valoare==null||!isFinite(+a.valoare))return t;
  var ea="amplitudinea (ATR) "+TextRo.num(+a.valoare,Math.abs(+a.valoare)>=1?1:2)+"× treapta"+(typeof a.eticheta==="string"&&a.eticheta?" · "+a.eticheta:""),o={},k;
  for(k in t)o[k]=t[k];o.eticheta=(typeof t.eticheta==="string"&&t.eticheta?t.eticheta+" · ":"")+ea;return o}
var tbVerAnt={simbol:null,pe:{}};
function tbVerdictConfirmat(tf,j,q,simbol){
  if(tbVerAnt.simbol!==simbol)tbVerAnt={simbol:simbol,pe:{}};
  var t=j.length?+j[j.length-1][0]:0,e=tbVerAnt.pe[tf];
  var aplica=function(qq,x){if(qq.verBrut!==undefined)return;var c=IndicatoriBot.confirma(qq.ver,x.v1,x.v2);qq.verBrut=qq.ver;qq.ver=c.ver;qq.neconfirmat=c.neconfirmat;
    if(x.comp&&qq.verBrut!==x.v1){var N={trendScore:"trendul",momScore:"impulsul",volScore:"volumul",structureScore:"structura"},cel=null;Object.keys(N).forEach(function(k){var a=Number(qq[k]),b=Number(x.comp[k]);if(isFinite(a)&&isFinite(b)&&(!cel||Math.abs(a-b)>Math.abs(cel.d)))cel={nume:N[k],d:a-b}});if(cel&&cel.d)qq.miscatDe=cel}};
  if(e&&e.t===t&&e.v1){aplica(q,e);return}
  if(e&&e.t===t&&e.inLucru)return;
  if(j.length<62)return;
  tbVerAnt.pe[tf]={t:t,inLucru:true};
  setTimeout(function(){
    if(tbVerAnt.simbol!==simbol)return;
    try{var q1=calc(j.slice(0,-1),"auto"),q2=calc(j.slice(0,-2),"auto");tbVerAnt.pe[tf]={t:t,v1:q1.ver,v2:q2.ver,comp:{trendScore:q1.trendScore,momScore:q1.momScore,volScore:q1.volScore,structureScore:q1.structureScore}}}catch(er){tbVerAnt.pe[tf]=null;return}
    var d=tbStare.directie,l=d&&d.simbol===simbol&&Array.isArray(d.indicatori)?d.indicatori:null,x=l?l.filter(function(y){return y.tf===tf&&y.q})[0]:null;
    if(x){aplica(x.q,tbVerAnt.pe[tf]);if(typeof renderTabloDirectia==="function")renderTabloDirectia();if(typeof renderTabloIndicatori==="function")renderTabloIndicatori()}
  },0);
}
function tbCalculeazaIndicatorii(d){
  if(typeof IndicatoriBot==="undefined"||!d)return;
  // v91.9: Mediul botului - miscarea monedei (1h: 4h si 24h fata de obisnuit), funding-ul, BTC pe 4h
  var G=typeof GridCalcul!=="undefined"?GridCalcul:null,bot=tbStare.bot,regim=null,btc=null,fund=null;
  try{if(G&&d.randuriPe&&d.randuriPe["60M"])regim=G.regimPeBare(G.bare(d.randuriPe["60M"]),4,24)}catch(e){regim=null}
  try{if(G&&d.btc4h&&typeof Directie!=="undefined"){var an=Directie.analizeaza(d.btc4h,6,bot&&bot.directie);btc={dir:an&&an.dir||null,regim:G.regimPeBare(G.bare(d.btc4h),1,6)}}}catch(e){btc=null}
  if(Array.isArray(d.fundingRates)&&d.fundingRates.length){
    var fr=d.fundingRates.slice().sort(function(a,b){return Number(b.fundingTime)-Number(a.fundingTime)});
    var iv=fr.length>1?Math.round((Number(fr[0].fundingTime)-Number(fr[1].fundingTime))/3600000):0;
    fund={rate:Number(fr[0].fundingRate),hist:fr.map(function(x){return Number(x.fundingRate)}),intervalOre:iv>0?iv:8};
  }
  d.mediu={regim:regim,btc:btc,funding:fund};
  d.indicatori=TB_DIR_TF.map(function(x){
    var rows=d.randuriPe&&d.randuriPe[x.tf],q=null,hp=null,eroare=null;
    try{var j=bareInchise(IndicatoriBot.dinPionex(rows),TB_TF_CALC[x.tf],Date.now());if(j.length>=60){q=calc(j,"auto");if(q&&(x.tf==="60M"||x.tf==="4H")&&typeof RegimGrid!=="undefined")q.regimGrid=RegimGrid.clasifica(j.map(function(y){return +y[4]}),j.length-1,q.adx)}else eroare="doar "+TextRo.cate(j.length,"bară închisă","bare închise");
      hp=j.length>=260?historicalProbability(j,4):null;
      /* v100.324 (I-861; revizia: nu pe loc - 24 × ~16 ms blocau pagina la fiecare încărcare): istoria scorului pe 4 ore, doar barele noi, după desen */
      if(x.tf==="4H"&&q){try{tbIstoric4h(j,d.simbol)}catch(e2){}}
      if(q){try{tbVerdictConfirmat(x.tf,j,q,d.simbol)}catch(e3){}}}catch(e){q=null;eroare=String(e&&e.message||e)}   /* v100.339 (I-873): verdictul confirmat pe două bare închise */
    return {tf:x.tf,eticheta:x.eticheta,q:q,hp:hp,eroare:eroare};
  });
}
/* v100.328 (el, 11.11.2026: „detaliile indicatorilor și în Trading 212, la fel ca la bot” ⇒ „da, fă așa”): tabelul „Detaliilor indicatorilor” (rândurile
   indicatorilor, estimarea, predicția, nota), scos din renderTabloIndicatori ca să-l folosească și fișa T212. Tabloul îl cheamă fără opt ⇒ exact ca înainte;
   fișa cu opt.vorbe (IndicatoriBot.VORBE_POZITIE: „poziția”, istoricul acțiunii) și opt.orizont (4 bare de 4 ore la bursă = 2 ședințe) */
function tbIndTabelHtml(l,dir,opt){
  opt=opt||{};var cel=l.map(function(x){return IndicatoriBot.celule(x.q)}),OR=opt.orizont||IndicatoriBot.ORIZONT;
  /* v100.339 (auditul din 13.11): O convenție pe cartelă - culoarea e FAȚĂ DE BOT (ca banda, rigla și becul): la un short „↓” e verde. Săgeata
     rămâne a pieței. Fără direcție (neutru / fără bot): verde = sus, ca înainte. */
  var dirB=String(dir||"").toLowerCase(),tonF=function(c){return c==="lipsa"||c==="neutral"?"mutedInfo":dirB==="short"&&c==="good"?"bad":dirB==="short"&&c==="bad"?"good":c};
  var cuCe=opt.vorbe&&opt.vorbe.cu?opt.vorbe.cu:"cu botul";
  return '<div class="tbIndWrap"><table class="tbIndTab"><thead><tr><th></th>'+l.map(function(x){return '<th>'+escapeHtml(x.eticheta.replace(" min","m").replace(" oră","h").replace(" ore","h").replace(" zi","z"))+'</th>'}).join("")+'</tr></thead><tbody>'+
    IndicatoriBot.RANDURI.map(function(r){
      return '<tr><td title="'+escapeHtml(r.titlu)+'">'+escapeHtml(r.eticheta)+'</td>'+cel.map(function(c,i){
        var v=c&&c[r.k];if(!v)return '<td class="mutedInfo" title="prea puține bare închise">—</td>';
        return '<td class="'+tonF(v.c)+'" title="'+escapeHtml(r.eticheta+" · "+l[i].eticheta+": "+(v.titlu||v.t))+'">'+escapeHtml(v.t)+'</td>'}).join("")+'</tr>'}).join("")+
    '<tr class="tbIndEst"><td title="Estimarea din istoric: situații asemănătoare cu acum și ce a făcut prețul după 4 bare. Nedovedită.">Estimare</td>'+l.map(function(x){
      var e=IndicatoriBot.estimare(x.hp,OR[x.eticheta]||"4 bare",opt.vorbe);
      return '<td class="'+tonF(e.c)+'" title="'+escapeHtml("Estimare · "+x.eticheta+": "+e.titlu)+'">'+escapeHtml(e.t)+'</td>'}).join("")+'</tr>'+
    '</tbody></table></div><p class="tbIndPred">🔮 '+escapeHtml(IndicatoriBot.predictie(l,dir,opt.vorbe).text)+'</p><p class="tbSub tbIndNota">Indicatorii arată ce e acum pe grafic; doar rândul „Estimare” privește înainte. '+escapeHtml((opt.vorbe?IndicatoriBot.MASURAT_DIRECTIE_ACT:IndicatoriBot.MASURAT_DIRECTIE)||"")+' '+(dirB==="short"||dirB==="long"?'Culoarea: verde = '+escapeHtml(cuCe)+' ('+dirB+'), roșu = împotrivă; săgeata arată piața. ':'')+'Atinge o celulă (sau ține mouse-ul pe ea) ca să vezi ce înseamnă.</p><p class="tbSub tbIndExplic" hidden></p>';
}
/* v100.339 (auditul din 13.11): pe telefon explicațiile din `title` nu se pot citi ⇒ atingerea unei celule o scrie sub tabel */
if(typeof document!=="undefined"&&document.addEventListener)document.addEventListener("click",function(ev){
  var td=ev.target&&ev.target.closest?ev.target.closest(".tbIndTab td[title],.tbIndTab th[title]"):null;if(!td)return;
  var w=td.closest(".tbIndWrap"),ex=w&&w.parentElement?w.parentElement.querySelector(".tbIndExplic"):null;if(!ex)return;
  ex.textContent=td.getAttribute("title");ex.hidden=false});
/* v100.333 (auditul 12.11, 🔵5): rândul „Funding” din „Mediul botului” judecă după ULTIMA rată, KPI-ul de sus și sfatul după media pe 7 zile - cu semne
   diferite stăteau „tu încasezi” și „plătești” pe același ecran. Rândul spune acum „ultima rată”, iar când media zice altceva o adaugă; dacă media
   zice că plătești, rândul e de atenție (avertizează, nu schimbă verdictul). info = TabloExtra/GridSim.rataFunding ({rataZi}), dir = long / short */
function tbFundingMediu(med,info,dir){
  return (Array.isArray(med)?med:[]).map(function(m){
    if(!m||m.k!=="funding"||/^n-am/.test(String(m.text||"")))return m;
    var x=Object.assign({},m);x.text="ultima rată "+String(m.text||"");
    var rz=info&&typeof info.rataZi==="number"&&isFinite(info.rataZi)?info.rataZi:null;
    if(rz===null||rz===0||(info&&info.veche)||(dir!=="long"&&dir!=="short"))return x;   /* revizia Opus v100.333 (🔵5): cu rata veche, KPI-ul scrie „rată veche” - nici aici media */
    var platesteMedie=dir==="long"?rz>0:rz<0;
    if(platesteMedie===!!m.botPlateste)return x;
    x.text+=" · media pe 7 zile "+(typeof TabloExtra!=="undefined"&&TabloExtra.fundingPct?TabloExtra.fundingPct(rz):TextRo.pct(rz*100,3))+" pe zi: "+(platesteMedie?"plătești":"încasezi");
    if(platesteMedie)x.ton="atentie";
    return x;
  });
}
/* v100.340 (I-872): textele de sub „Cele șapte măsuri”. Perechile din drum: m.trepte.perechiDinDrum (TabloBot.masoara) lângă ritmul botului.
   Regimul pentru grid: RegimGrid pe barele închise de 1 oră și de 4 ore (intervalele măsurate în M5); „ce urmează” doar unde M5 l-a dovedit. */
function tbPerechiDinDrumText(m,varstaOre){var x=m&&m.trepte?Number(m.trepte.perechiDinDrum):NaN;if(!m||!m.trepte||m.trepte.perechiDinDrum==null||!isFinite(x))return "";
  var z=function(v){return TextRo.num(v,TextRo.zecMici?TextRo.zecMici(v):1)},r=m.ritmPerechi,y=r&&r.valoare!=null&&isFinite(Number(r.valoare))?Number(r.valoare):null,v=varstaOre!=null&&isFinite(Number(varstaOre))?Number(varstaOre):null;
  /* revizia a doua: comparația cu botul DOAR pe aceeași fereastră - ultima oră a botului (ritmul din istoric: are „baza”) lângă perechile
     drumului din ULTIMA ORĂ (m.trepte.perechiUltimaOra), nu lângă media pe 8 ore; media botului pe 24 h (botul de cel puțin 24 h, fără
     istoric) se spune ca altă fereastră, nu ca o comparație */
  var u=m.trepte.perechiUltimaOra!=null&&isFinite(Number(m.trepte.perechiUltimaOra))?Number(m.trepte.perechiUltimaOra):null;
  var bot=y===null?"":r.baza!=null?(u!==null?" În ultima oră ar fi dat "+TextRo.num(u,0)+", iar botul a făcut "+z(y)+".":""):v!==null&&v>=24?" Pe ultimele 24 h (altă fereastră) botul a făcut în medie "+z(y)+" pe oră.":"";
  var ore=m.trepte.oreDrum!=null&&isFinite(Number(m.trepte.oreDrum))?" din ultimele "+TextRo.num(Number(m.trepte.oreDrum),1)+" h":"";
  return "Pe liniile gridului, închiderile la 5 minute"+ore+" ar fi dat cam "+z(x)+" perechi pe oră."+bot+" Între închideri prețul mai atinge linii, deci numărul adevărat poate fi mai mare."}
function tbRegimGridText(d){var l=d&&Array.isArray(d.indicatori)?d.indicatori:[],rez=d&&Array.isArray(d.rez)?d.rez:[],TF=[["60M","1 oră","1h"],["4H","4 ore","4h"]],p=[];
  TF.forEach(function(t){var x=l.filter(function(y){return y&&y.tf===t[0]&&y.q&&y.q.regimGrid})[0];if(!x)return;
    /* „trend” după ADX lângă becul „lateral” al aceluiași interval (văzut pe viu: ADX 52 și bec lateral pe 4 ore): se spune de ce, ca în tabelul trendului */
    var bec=rez.filter(function(r){return r&&r.tf===t[0]})[0],nota=x.q.regimGrid.trend==="trend"&&bec&&bec.dir==="lateral"?"becul zice lateral: ADX-ul ține minte o mișcare mai veche":"";
    var s=RegimGrid.text(x.q.regimGrid,{tf:t[1],masurat:RegimGrid.MASURAT?RegimGrid.MASURAT[t[2]]:null,nota:nota});if(s)p.push(s)});
  return p.length?"Regimul pentru grid\n"+p.join("\n"):""}   /* câte un rând pe interval (#tbRegimGrid: white-space pre-line) */
