/* tablou-citire.js — citirea de sus, șansele stopului și ale TP-ului, costul, „Ce contează”, filele capitolelor, setările (indicatori, modul simplu) și lățimea pieței
   I-940 (auditul paginii botului, 24.11): mutat NESCHIMBAT din public/app.js (v100.390). Script clasic, încărcat ÎNAINTEA lui app.js:
   doar definiții (nimic nu rulează la încărcare), numele rămân globale ca înainte; ce folosește din app.js (tbStare, tbPlan, $ …)
   se citește abia la apel. Probele îl văd lipit de app.js prin scripts/lib/sursa-app.mjs (cuTablou). */
function tbPretScurt(v){if(v==null||!isFinite(v))return "—";var a=Math.abs(v);if(a<1&&typeof TextRo!=="undefined"&&TextRo.pret)return TextRo.pret(v);/* audit 23.10: sub 1 același formatator ca graficul și Drumul */return v.toFixed(a>=100?2:a>=1?4:a>=0.01?5:8)}
// v100 (demo-ul aprobat 28.09): graficul desenat de GraficBot (public/lib/grafic-bot.js, pur): lumanari + volum, planul, zero-ul,
// gridul, stopul, lichidarea, alertele DOAR ale botului (TabloExtra.alerteleBotului), Bollinger / EMA 20·50 / RSI / profil de volum.
var TB_IND_KEY="tbGraficInd",tbGrafRz=null;
function tbIndStare(){var d={bb:true,ema:true,rsi:true,vp:true,zi:true,val:true,adx:true};d.scara=true;try{var v=JSON.parse(localStorage.getItem(TB_IND_KEY)||"null");if(v&&typeof v==="object")for(var k in d)if(typeof v[k]==="boolean")d[k]=v[k]}catch(_){}return d}
function tbSincInd(){var s=tbIndStare();["bb","ema","rsi","vp","zi","val","adx","scara"].forEach(function(k){var e=$("tbInd-"+k);if(!e)return;e.setAttribute("aria-pressed",String(!!s[k]));if(k==="scara")e.textContent=s.scara?"Scara pornită":"Scara oprită"});tbSincMod()}
// v100.98 (05.10, demo aprobat): „Simplu” (implicit) = lumânările, marginile gridului, zero, planul, stopul, acum, EMA, RSI/ADX; „Complet” = tot, cu comutatoarele
var TB_MOD_KEY="tbGraficMod";
function tbModSimplu(){try{return localStorage.getItem(TB_MOD_KEY)!=="complet"}catch(_){return true}}
function tbSincMod(){var s=tbModSimplu(),a=$("tbMod-simplu"),c=$("tbMod-complet"),g=document.querySelector("#tabloubot .tbGrInd");if(a)a.setAttribute("aria-pressed",String(s));if(c)c.setAttribute("aria-pressed",String(!s));if(g)g.hidden=s}
function tbAlegeMod(m){if(m!=="simplu"&&m!=="complet")return;try{localStorage.setItem(TB_MOD_KEY,m)}catch(_){}tbSincMod();renderTabloGrafic()}
// v100.98: funding-ul pentru citire (rata + ora următoarei plăți, din istoria ratelor adusă de tbAduExtra; Binance, Pionex are rata lui, apropiată)
// v100.272 (ideile auditului 29.10): întâi ratele PIONEX ale monedei (ce plătește botul, ca KPI-ul și sfatul): ultima rată și plata următoare după ritmul
// Pionex; Binance doar când Pionex n-a dat ratele, cu sursa spusă - pe același ecran nu mai stau două rate de semne diferite
function tbFundingPt(){var e=tbStare.extra||{},b=tbStare.bot;if(!b)return null;
  var fu=tbStare.funding,inf=fu&&fu.info&&fu.sim===TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex?fu.info:null;
  if(inf&&inf.rata!=null&&isFinite(inf.rata)){var pas=(Number(inf.intervalOre)>0?Number(inf.intervalOre):8)*3600000,up=Number(inf.ultimaLa)>0?Number(inf.ultimaLa)+pas:null;if(up!==null)while(up<=Date.now())up+=pas;return {rata:Number(inf.rata),urmatoarea:up,acum:Date.now(),sursa:"Pionex",medieZi:inf.rataZi!=null&&isFinite(inf.rataZi)?Number(inf.rataZi):null}}   /* v100.339: + media pe 7 zile, după care se colorează rândul */
  if(e.bot!==b.id||e.funding==null||!isFinite(e.funding))return null;var h=Array.isArray(e.fundingHist)?e.fundingHist:[],u=null;
  if(h.length>1){var ult=Number(h[h.length-1].fundingTime),pas=ult-Number(h[h.length-2].fundingTime);if(ult>0&&pas>0){u=ult+pas;while(u<=Date.now())u+=pas}}
  return {rata:e.funding,urmatoarea:u,acum:Date.now(),sursa:"după Binance, ca reper: n-am aici ratele Pionex"}}
// v100.98: „dacă închizi la…” sub cursor - totalul botului închis la prețul de la înălțimea mouse-ului, cu gridul care umple pe drum
/* v100.396 (auditul 26.11, 🟡): o singură zecimală (TextRo.num) și „lichidat înainte” când prețul de sub cursor trece de lichidare (totalul e plafonat la −suma pusă) */
function tbLaPret(b){return function(px){var t=TabloExtra.totalCuGridLa(b,px);if(t==null||!isFinite(t))return null;var lq=TabloExtra.lichidatLa?TabloExtra.lichidatLa(b,px):null;return '<b>dacă închizi la '+escapeHtml(tbPretScurt(px))+':</b> <span class="'+(t>=0?"good":"bad")+'">'+(t>=0?"+":"−")+TextRo.num(Math.abs(t),1)+' USDT</span><div class="mutedInfo">'+(lq?"lichidat înainte, la "+escapeHtml(tbPretScurt(lq.pret))+": pierzi suma pusă":"cu ce cumpără / vinde gridul pe drum, după comision")+'</div>'}}
// v100.99 (I-528): șansele măsurate ale botului (Probabilitati.randuri) pentru liniile graficului; cifrele vechi de peste 3 h nu se pun pe grafic
function tbSansePt(b){var t=tbProbPt(b),rez=t&&t.rez;if(!rez||tbProbVechi(rez)||typeof Probabilitati==="undefined")return null;try{var l=Probabilitati.randuri(rez,t.cal),s=tbStopSansa(b);return s&&Array.isArray(l)?l.concat([{cod:"stop-24",p:s.p24,titlu:"Stopul atins într-o zi",text:"în 3 zile ~"+Math.max(1,Math.min(99,Math.round(s.p72*100)))+"% · curba pe "+(s.perechi>0?TextRo.cate(s.perechi,"monedă","monede"):"monedele mari")+", ultimele "+TextRo.cate(s.zile>0?s.zile:30,"zi","zile")+" (direcția nu se știe)"+(s.plafon?" · plafonat la șansa marginii de "+s.plafon:""),ic:null}]):l}catch(e){return null}}
// v100.313 (08.11.2026, el: „fă ideea cu curba în Radar” + „sfaturile care chiar contează evidențiază-le în Radar”, macheta aprobată): curba stopului
// (KV curbaStop, colectorul la 6 h, 21 de perechi, 30 de zile; CurbaStop) + „CONTEAZĂ ACUM” sub erou (Conteaza.alege: cel mult 3 rânduri, după banii în joc)
// + cifra pe rândul „stopul tău” (tbSansePt ⇒ stop-24), pe drumul botului (tbStopSansaDrum) și pe Acasă (Conteaza.acasa). Fără curbă / ATR / cifre vechi: nimic.
var tbCurba={la:0,c:null,inLucru:false};
function tbCurbaPt(){if(!tbCurba.inLucru&&Date.now()-tbCurba.la>30*60000){tbCurba.inLucru=true;getJSON("/api/istoric-bot?action=curbaStop").then(function(r){tbCurba.c=r&&r.curbaStop||null}).catch(function(){}).then(function(){tbCurba.la=Date.now();tbCurba.inLucru=false;if(tbStare.bot)tbRenderConteaza();if(typeof acasaPe==="function"&&acasaPe()&&typeof acasaDeseneaza==="function")acasaDeseneaza()})}return tbCurba.c}
/* v100.377 (el 22.11, „o singură propunere de stop”): prețul la care zgomotul atinge stopul într-o zi în ~20 din 100 de cazuri, de la prețul de ACUM
   (curba stopului + ATR-ul de o oră al monedei). Intră în socoteala cartelei „Stopul” (SemnaleBot.acumConcret: x.stopZgomot) */
function tbStopZgomot(b){try{if(!b||typeof CurbaStop==="undefined"||!CurbaStop.pretLa)return null;
  var c=tbCurbaPt(),alTabloului=!!(tbStare.bot&&tbStare.bot.id===b.id),t=alTabloului?tbProbPt(b):(tbProb.botId===b.id?tbProb:null),rez=t&&t.rez;   /* cifrele le cere doar botul din Tablou (ca tbStopSansa) */if(!c||!rez||tbProbVechi(rez))return null;
  var z=CurbaStop.pretLa({curba:c,atr:botiNr(rez.atr1h),pret:pvPretViuAcum(b)||botiNr(b.pretCurent),dir:b.directie,acum:Date.now()});
  return z?{pret:z.pret,sursa:(z.perechi>0?TextRo.cate(z.perechi,"monedă","monede"):"monedele mari")+(z.zile>0?", "+TextRo.cate(z.zile,"zi","zile"):"")}:null}catch(e){return null}}   /* auditul 22.11: lipsa rămâne lipsă */
function tbStopSansa(b){if(!b||typeof CurbaStop==="undefined"||!b.opritorPierdereActiv)return null;var TE=typeof TabloExtra!=="undefined"?TabloExtra:null;
  if(TE&&TE.stopDincoloDeLichidare&&TE.stopDincoloDeLichidare(b))return null;   /* revizia (08.11): stopul dincolo de lichidare nu apucă să lucreze - lichidarea vine întâi */
  /* revizia 🔴 (08.11): cifrele (tbProbPt) le cere DOAR botul din Tablou; drumul altui bot (pe telefon se desenează toți, la 1,5 s) ia doar ce e deja adus - altfel cererile se călcau */
  var c=tbCurbaPt(),t=tbStare.bot&&tbStare.bot.id===b.id?tbProbPt(b):(tbProb.botId===b.id?tbProb:null),rez=t&&t.rez;if(!c||!rez||tbProbVechi(rez))return null;
  var stop=TE&&TE.pretStopLive?TE.pretStopLive(b):botiNr(b.opritorPierdere),s=CurbaStop.pentruStop({curba:c,atr:botiNr(rez.atr1h),pret:pvPretViuAcum(b)||botiNr(b.pretCurent),stop:stop,dir:b.directie,acum:Date.now()});if(!s)return null;
  /* revizia 🟡6: stopul dincolo de marginea de pe aceeași parte nu poate fi atins mai des decât ea (marginea: istoria monedei) - plafon, spus în bloc */
  var dir=String(b.directie||"").toLowerCase(),gj=botiNr(b.gridJos),gs=botiNr(b.gridSus),parte=dir==="long"&&gj>0&&s.stop<=gj?"jos":dir==="short"&&gs>0&&s.stop>=gs?"sus":null;   /* v100.374: și stopul pus CHIAR pe margine (același preț = aceeași cifră) */
  if(parte&&typeof Probabilitati!=="undefined"){try{var pm=null;(Probabilitati.randuri(rez,t.cal)||[]).forEach(function(r){if(r&&r.cod==="iese-"+parte+"-24"&&isFinite(r.p))pm=r.p});if(pm!==null&&s.p24>pm){s.p24=pm;s.plafon=parte}}catch(e){}}
  /* revizia 🟡4: stopul pus în PROCENTE din investiție (Pionex) - procentul lui și mutarea ca procent, cu grilele de pe drum (TabloExtra.totalCuGridLa) */
  /* v100.332 (auditul 12.11, 🔴1): propunerea „muți stopul la ~X” verificată - nu la / dincolo de lichidare, cu totalul de acolo și grilele tăiate dacă pică în grid */
  /* v100.377 (el 22.11, „o singură propunere de stop”): când cartela „Stopul” are un preț propus mai departe decât stopul de acum, rândul îl spune pe
     ACELA, cu șansa măsurată acolo pe curbă - nu un al doilea preț, socotit separat (la 12:30 pagina arăta 0.002703 în cartelă și 0.002655 în rând) */
  var clS=tbStare.consLinii&&tbStare.consLinii.bot===b.id?botiNr(tbStare.consLinii.stopPlan):null,atrS=botiNr(rez.atr1h);
  if(s.mut20!==null&&clS!==null&&clS>0&&atrS>0&&(s.sus?clS>s.stop:clS<s.stop)){s.dMut20=Math.abs(clS-s.pret)/atrS;s.mut20=clS;s.mutP24=CurbaStop.sansa(c,24,s.dMut20);if(s.mutP24!==null&&s.mutP24>s.p24)s.mutP24=s.p24;/* auditul 22.11: un stop mai departe nu e atins mai des decât cel de acum (a cărui cifră poate fi plafonată la șansa marginii) */s.mutDin="cartela"}
  if(TE&&TE.stopPropus)TE.stopPropus(b,s);
  var rp=botiNr(b.opritorPierdereRaport),inv=botiNr(b.investit);
  if(b.opritorPierdereTip==="raport"&&rp!==null&&inv>0){s.raport=rp;var tm=s.mut20!==null&&TE&&TE.totalCuGridLa?TE.totalCuGridLa(b,s.mut20):null;s.mutRaport=tm!==null&&isFinite(tm)?tm/inv:null}
  return s}
function tbStopSansaDrum(b){var s=tbStopSansa(b);if(!s)return null;var k=Math.round(s.p24*100);return "24 h: "+(k<1?"< 1%":k>99?"> 99%":"~"+k+"%")}   /* ca graficul (grafic-bot.js cuSanse) */
// v100.373 (20.11.2026, hotărârile lui după auditul Tabloului): capul = MARGINEA CONTRA BOTULUI (CapMargine), cu dovada de pe boții lui închiși
// (aceeași arhivă ca Acasă și Jurnalul: o singură cerere), și rândul de cost de lângă „Rezultat total”.
var tbDovB={la:null,d:null,incerc:0};
function tbDovadaBoti(){
  try{
    if(typeof CapMargine==="undefined"||typeof ARH_BOTI==="undefined")return null;
    if(!ARH_BOTI.boti){if(Date.now()-tbDovB.incerc>60000&&typeof arhivaBotiAdu==="function"){tbDovB.incerc=Date.now();arhivaBotiAdu(600000).catch(function(){})}return null}
    if(tbDovB.la!==ARH_BOTI.la||!tbDovB.d)tbDovB={la:ARH_BOTI.la,d:CapMargine.dinBoti(ARH_BOTI.boti),incerc:tbDovB.incerc};
    return tbDovB.d}catch(e){return null}
}
/* v100.373: „15 din 2.465 de boți închiși de-ai tăi au ajuns la 7 zile” - lângă cifrele pe orizonturi lungi */
function tbNotaDurata(ore){try{var d=tbDovadaBoti(),t=d&&typeof CapMargine!=="undefined"?CapMargine.textDurata(d,ore):"";return t?" · "+t:""}catch(e){return ""}}
function tbCapMargine(b){
  if(!b||typeof CapMargine==="undefined"||typeof TabloExtra==="undefined")return null;
  try{
    var jos=botiNr(b.gridJos),sus=botiNr(b.gridSus),stop=typeof SemnaleBot!=="undefined"?SemnaleBot.pretStopEcran(b):null,tp=tbProbPt(b),rz=tp&&tp.rez&&!tp.rez.gol&&!tbProbVechi(tp.rez)?tp.rez:null;
    /* șansele = rândurile cardului „Probabilități” (aceeași cifră sus și jos: corectată din calibrare, „sub N%” la capete, nimic sub 3 cazuri independente) */
    var R={};if(rz&&typeof Probabilitati!=="undefined")Probabilitati.randuri(rz,tp.cal).forEach(function(r){R[r.cod]=r});
    var c=tbStare.consUlt,m0=c&&Array.isArray(c.motive)?c.motive.filter(function(m){return m&&m.cod&&m.c!=="v"})[0]:null;
    var sf=(tbStare.sfaturiLista||[]).filter(function(s){return s&&s.cod==="margine"&&s.faCe})[0]||null;
    /* stopul scurt din Monte Carlo: nu când reluarea arată botul OPRIT / LICHIDAT (setările simulate nu sunt ale botului - garda rândului 🎰) și nu din tura care a picat */
    var mr=typeof tbMc!=="undefined"&&tbMc&&String(tbMc.botId)===String(b.id)&&tbMc.rand&&!tbMc.eroare?tbMc.rand:null,mc=mr&&Array.isArray(mr.scurt)&&!/Reluarea arată botul/.test(String(mr.text||"")+" "+String(mr.faCe||""))?mr.scurt:null;
    var la=rz&&Number(rz.la)>0?new Date(Number(rz.la)):null,ora=la?String(la.getHours()).padStart(2,"0")+":"+String(la.getMinutes()).padStart(2,"0"):"";
    var pl0=botiNr(b.pornitLa),fF=typeof tbFisa!=="undefined"&&tbFisa&&tbFisa.botId===b.id?tbFisa.fisa:null;   /* I-914: fișa de azi a monedei botului */
    var kvA=typeof tbSem!=="undefined"&&tbSem&&tbSem.botId===b.id&&tbSem.v?tbSem.v:null,acA=kvA&&kvA.acum&&kvA.acum.la&&Date.now()-kvA.acum.la<20*60000?kvA.acum:null,afO=acA&&botiNr(acA.afaraOre)>0?botiNr(acA.afaraOre)+(Date.now()-acA.la)/3600000:null;
    var sd0=null;try{sd0=tbStopSansa(typeof window!=="undefined"&&typeof window.pvBotLive==="function"?window.pvBotLive(b)||b:b)}catch(e){sd0=null}   /* ca Drumul (asezare-paznic.js botLive): la stopul în procente prețul lui ține de prețul viu */
    /* v100.376 (el: „pune și «atinge TP» la fel cum faci cu margine și cu stop”): prețul take-profit-ului (în procente: socotit live, ca pe Drum) */
    var tpP=null;try{tpP=b.opritorProfitActiv?(TabloExtra.pretTpLive?TabloExtra.pretTpLive(typeof window!=="undefined"&&typeof window.pvBotLive==="function"?window.pvBotLive(b)||b:b):botiNr(b.opritorProfit)):null}catch(e){tpP=null}if(!(tpP>0))tpP=null;
    return CapMargine.alcatuieste({dir:b.directie,pret:botiNr(b.pretCurent),jos:jos,sus:sus,stop:stop,stopActiv:!!b.opritorPierdereActiv,stopEticheta:typeof SemnaleBot!=="undefined"&&SemnaleBot.etichetaStopProc?SemnaleBot.etichetaStopProc(b):"",
      laMargine:function(parte){return TabloExtra.totalCuGridLa(b,parte==="jos"?jos:sus)},lichidLa:function(px){return TabloExtra.lichidatLa?TabloExtra.lichidatLa(b,px):null},laStop:stop!==null&&stop!==undefined?TabloExtra.totalCuGridLa(b,stop):null,
      tp:tpP,laTp:tpP!==null?TabloExtra.totalLaTinta(b):null,tpRaport:tpP!==null&&b.opritorProfitTip==="raport"?botiNr(b.opritorProfitRaport):null,tpDinPret:tpP!==null&&TabloExtra.tpDinPret?TabloExtra.tpDinPret(b):null,tpGrile:tpP!==null?tbTpGrile(b):null,tpVerif:typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv.d&&tbMcKv.d.calibrareScurt&&Array.isArray(tbMcKv.d.calibrareScurt.ore)?tbMcKv.d.calibrareScurt.ore:null,
      sanse:{jos:{1:R["iese-jos-1"],4:R["iese-jos-4"],24:R["iese-jos-24"]},sus:{1:R["iese-sus-1"],4:R["iese-sus-4"],24:R["iese-sus-24"]}},sansePret:rz?botiNr(rz.pret):null,sanseOra:ora,stopScurt:mc,sfat:sf,
      /* v100.374: expunerea (I-903), totalul de acum (I-897, afară din grid) și cifra de pe Drum pentru stopul pe 24 h (o singură cifră pe ecran) */
      mut:(function(){try{var q=TabloExtra.dacaInchizi(b);return q&&q.iei!=null?{iei:q.iei,investit:botiNr(b.investit),comInchidere:q.comisionInchidere,levier:botiNr(b.levier),pretZero:q.pretZero,grile:botiNr(b.gridProfitBrut),perechi:botiNr(b.ordinePerechi),oreInGrid:pl0>0?Math.max(0,(Date.now()-pl0)/3600000-(afO||0)):null,
        fisa:fF&&fF.setare?{jos:fF.setare.jos,sus:fF.setare.sus,grile:fF.setare.grile,levier:fF.setare.levier,profitGrila:fF.setare.profitGrila,treceriZi:fF.treceriZi,nu:!!(fF.verdict&&fF.verdict.nivel==="nu")}:null}:null}catch(e){return null}})(),acum:Date.now(),   /* „Dacă muți gridul acum” */
      zero:(function(){try{var q=TabloExtra.dacaInchizi(b);return q?{pret:q.pretZero,neatins:q.zeroNeatins===true,pretPoz:q.pretZeroPozitie,grile:tbZeroGrile(b)}:null}catch(e){return null}})(),   /* zero-ul botului, spus și când nu se mai atinge în grid; v100.376: atunci și prețul lui pe poziția de acum */
      pas:(function(){try{var g=typeof SemnaleBot!=="undefined"&&SemnaleBot.pasBot?SemnaleBot.pasBot(b):null;return g&&g.pas>0?g.pas:null}catch(e){return null}})(),   /* I-913 */
      mutare:(function(){try{var s=tbStare.istoricServer;return s&&String(s.bot)===String(b.id)?CapMargine.mutareDin(s.intrari,Date.now()):null}catch(e){return null}})(),   /* I-912 */
      afaraOre:afO,banda:tbBandaPt(),   /* I-911: de cât timp e afară (starea colectorului, la zi cu ceasul) și jurnalul benzii de pe boții lui */
      expunere:{pozitie:botiNr(b.pozitie),investit:botiNr(b.investit),grile:botiNr(b.gridProfitBrut),perechi:botiNr(b.ordinePerechi),varstaOre:pl0>0?(Date.now()-pl0)/3600000:null},total:botiNr(b.profitTotal),stopDrum:sd0&&isFinite(sd0.p24)?sd0.p24:null,
      cons:c&&c.nivel&&c.nivel!=="asteapta"&&c.titlu?{nivel:c.nivel,titlu:c.titlu,faCe:c.faCe,cod:m0?m0.cod:null,siguranta:!!(m0&&(m0.cod==="podea"||(Consiliu.FIX&&Consiliu.FIX[m0.cod]))),dovedit:!!(m0&&m0.cip&&m0.cip.cls==="ajuta")}:null,dovada:tbDovadaBoti()})
  }catch(e){return null}
}
/* v100.374: ajutoarele Consilierului - partea pe care prețul a trecut de marginea contra botului („jos” / „sus” / null), dovada boților fără stop
   și cifra din cap pentru marginea contra (doar cea de 24 h, doar cât nu e „de refăcut”) */
function tbAfaraContra(b){var d=String(b&&b.directie||"").toLowerCase(),p=botiNr(b&&b.pretCurent),j=botiNr(b&&b.gridJos),s=botiNr(b&&b.gridSus);if(!(p>0))return null;return d==="long"&&j>0&&p<j?"jos":d==="short"&&s>0&&p>s?"sus":null}
function tbDovadaFaraStop(){try{var d=tbDovadaBoti();return d&&typeof CapMargine!=="undefined"&&CapMargine.textFaraStop?CapMargine.textFaraStop(d):""}catch(e){return ""}}
function tbSanseMargine(b){try{var c=tbCapMargine(b),s=c&&Array.isArray(c.sanse)?c.sanse.filter(function(q){return q.ore===24&&!q.vechi})[0]:null,o={};if(s)o[c.parte]=s.text;return s?o:null}catch(e){return null}}
/* I-911: jurnalul benzii (KV disciplina:banda, de pe boții lui închiși) - același ca în „Grid: ce setez?”, adus cel mult o dată pe oră */
function tbBandaPt(){try{if(typeof grBandaR==="undefined")return null;if(!grBandaR.inLucru&&Date.now()-grBandaR.la>60*60000){grBandaR.inLucru=true;getJSON("/api/istoric-bot?action=disciplinaBanda").then(function(d){grBandaR.v=d&&d.banda||null}).catch(function(){}).then(function(){grBandaR.la=Date.now();grBandaR.inLucru=false})}return grBandaR.v&&Array.isArray(grBandaR.v.tabel)?grBandaR.v.tabel:null}catch(e){return null}}
function tbCostDeseneaza(b){
  var el=$("tbKpiCost");if(!el)return;var h="";
  try{if(b&&typeof CapMargine!=="undefined"&&typeof TabloExtra!=="undefined"){
    var q=TabloExtra.dacaInchizi(b),com=botiNr(b.comisioane),tx=TabloExtra.taxaIntrare?TabloExtra.taxaIntrare(b,com):null,pl=botiNr(b.pornitLa),pb=typeof SemnaleBot!=="undefined"?SemnaleBot.pasBot(b):null;
    var k=CapMargine.cost({grile:botiNr(b.gridProfitBrut),comisioane:com,pornire:tx,inchidere:q&&q.comisionInchidere!=null?-q.comisionInchidere:null,pas:pb?pb.pas:null,varstaMin:pl>0?(Date.now()-pl)/60000:null},tbDovadaBoti()),t=CapMargine.textCost(k);
    if(t)h='<div class="pzKv"><span title="Comisionul plătit la pornire plus cel de la închidere (estimat). Comisionul perechilor e deja scăzut din ce au adus grilele.">costul botului <small>pornire și închidere</small></span><b>'+escapeHtml(TextRo.usdt(k.cost,TextRo.zecMici(k.cost)))+'</b></div>'
      +'<div class="pzKv"><span>grilele îl acoperă?</span><b class="'+(t.ton==="bine"?"good":"tbWarn")+'">'+escapeHtml(t.stare)+'</b></div>'+(t.sub?'<p class="tbSub tbKpiCostSub">'+escapeHtml(t.sub)+'</p>':'')}
  }catch(e){h=""}
  if(el._h!==h){el.innerHTML=h;el._h=h}el.hidden=!h;
}
/* v100.373: marginile pe 3 zile coboară într-un pliu, cu nota câți boți de-ai lui ajung acolo; la vedere rămân 1 h / 4 h / 24 h, lichidarea și ținta planului (revizia: un rând cu ⚠ nu se ascunde) */
function tbProbRanduriHtml(l){
  var sc=l.filter(function(x){return !x.lung}),lg=l.filter(function(x){return x.lung}),d=tbDovadaBoti(),nota="";
  try{nota=d&&typeof CapMargine!=="undefined"?CapMargine.textDurata(d,72):""}catch(e){nota=""}
  return sc.map(tbProbRandHtml).join("")+(lg.length?'<details class="tbProbFara tbProbLung"><summary>Pe 3 zile · '+lg.length+'</summary>'+(nota?'<p class="tbSub">'+escapeHtml(nota.charAt(0).toUpperCase()+nota.slice(1))+'; cifrele de mai jos descriu un bot ținut atât.</p>':'')+lg.map(tbProbRandHtml).join("")+'</details>':'');
}
/* v100.381 („fa idei”): la botul cu take-profit, „Contează acum” primește lângă curba stopului și ce vine întâi după simularea botului (stopul / take-profit-ul
   pe 24 h, aceleași cifre ca bara din cap și Drumul); gărzile simulării ca la tbStopMcDrum */
function tbMcIntai24(b){try{var mr=typeof tbMc!=="undefined"&&tbMc&&b&&String(tbMc.botId)===String(b.id)&&tbMc.rand&&!tbMc.eroare?tbMc.rand:null;if(!mr||!Array.isArray(mr.scurt)||/Reluarea arată botul/.test(String(mr.text||"")+" "+String(mr.faCe||"")))return null;var s=mr.scurt.filter(function(x){return x&&x.ore===24&&typeof x.pTp==="number"&&isFinite(x.pTp)&&typeof x.pStop==="number"&&isFinite(x.pStop)})[0];return s?{stop:s.pStop,tp:s.pTp}:null}catch(e){return null}}
function tbStopCuIntai(b){var s=tbStopSansa(b);if(!s||!b)return s;var i=tbMcIntai24(b);if(i&&!b.opritorProfitActiv)i=Object.assign({},i,{faraTp:true});return i?Object.assign({},s,{intai:i}):s}   /* v100.384 (I-933): și fără take-profit, cifra simulării sub cea a curbei */
function tbConteazaLista(b,inCap){if(!b||typeof Conteaza==="undefined")return [];try{return Conteaza.alege({stop:typeof tbStopCuIntai==="function"?tbStopCuIntai(b):tbStopSansa(b),sfaturi:tbStare.sfaturiLista||[],lista:tbStare.todoLista||[],sanse:tbSansePt(b)||[],acum:Date.now(),inCap:inCap||null})}catch(e){return []}}
/* v100.374 (I-902): partea marginii arătate ACUM în capul paginii (o pune stratul de așezare când desenează capul; fără el, nimic nu coboară) */
function tbCapParte(b){try{var c=typeof window!=="undefined"?window.pzCapMargine:null;return c&&b&&String(c.botId)===String(b.id)?c.parte:null}catch(e){return null}}
// v100.322 (el, 11.11.2026: „îmbunătățește Contează acum” ⇒ ales: banii în USDT pe rând, butonul potrivit, ce s-a schimbat de la ultima privire,
// gravitatea și „de când”). Pe o COPIE a rândurilor (Conteaza.alege rămâne neatins): banii la prețul rândului din ACEEAȘI socoteală ca
// „Dacă prețul ajunge la…” (Scenariu.scenarii), butonul potrivit, semnele. Ce ai văzut ultima oară se ține în browserul tău (ctVazut:<bot>);
// semnele se socotesc față de vizita de dinainte și rămân aceleași toată sesiunea (fără rescrieri la fiecare tură).
function tbCtOra(t){var d=new Date(t),z=function(n){return String(n).padStart(2,"0")};return (Date.now()-t>86400000?z(d.getDate())+"."+z(d.getMonth()+1)+" ":"")+z(d.getHours())+":"+z(d.getMinutes())}
function tbCtUsdt(v){if(typeof TextRo!=="undefined"&&TextRo.usdt&&TextRo.zecMici)return TextRo.usdt(v,TextRo.zecMici(v));return (v<0?"−":v>0?"+":"")+Math.abs(v).toFixed(1).replace(".",",")+" USDT"}   /* revizia 11.11: ca sfaturile (o zecimală, o sumă mică nu iese „0,0”, miile grupate) */
/* v100.333 (auditul 12.11, 🔵1): totalul la prețul X are UN model pe pagină - TabloExtra.totalCuGridLa (cu grilele de pe drum și comisionul de închidere,
   același cu zero-ul, stopul, Consilierul și Monte Carlo); „Dacă prețul ajunge la…” și „Contează acum” îl iau prin Scenariu.scenarii(…, totalLa) */
function tbPozitieLa(b){return typeof TabloExtra!=="undefined"&&TabloExtra.pozitieCuGridLa?function(x){return TabloExtra.pozitieCuGridLa(b,x)}:undefined}
function tbTotalLa(b){return typeof TabloExtra!=="undefined"&&TabloExtra.totalCuGridLa?function(x){return TabloExtra.totalCuGridLa(b,x)}:undefined}
function tbCtBani(b,px){try{if(!(px>0)||typeof Scenariu==="undefined")return null;var s=Scenariu.scenarii(tbStare.botBrut,b,[{pret:px,eticheta:""}],typeof tbTotalLa==="function"?tbTotalLa(b):undefined),r=s&&s.ok&&s.randuri&&s.randuri[0];return r&&isFinite(r.total)?r.total:null}catch(e){return null}}
function tbCtCheie(x){return x.cheie+"|"+String(x.titlu||"").toLowerCase().replace(/[0-9]+([.,][0-9]+)?/g,"#").replace(/\s+/g," ").trim()}
/* revizia 11.11: „de la ultima privire” = de la ultima ta privire, nu de la încărcarea paginii: după ≥ 30 min cu pagina ascunsă (alt tab, telefonul
   blocat) memoria se reia din browser (ce ai văzut ultima oară) și blocul se redesenează la tura următoare */
/* v100.324: același ascultător reia și memoria indicatorilor (I-860) */
function tbVazutAscultator(){if(tbVazutAscultator.pus||typeof document==="undefined"||!document.addEventListener)return;tbVazutAscultator.pus=1;document.addEventListener("visibilitychange",function(){if(document.hidden){tbStare.ctAscunsLa=Date.now();return}if(tbStare.ctAscunsLa&&Date.now()-tbStare.ctAscunsLa>=1800000){tbStare.ctMem=null;tbStare.ctHtml=null;tbStare.indMem=null;tbStare.indSumarHtml=null}tbStare.ctAscunsLa=0})}
function tbCtMemorie(b){if(typeof tbVazutAscultator==="function")tbVazutAscultator();
  var k="ctVazut:"+b.id,m=tbStare.ctMem||(tbStare.ctMem={});if(!m[k]){var v=null;try{v=JSON.parse(localStorage.getItem(k)||"null")}catch(e){}m[k]={prev:v&&v.r?v.r:null,acum:v&&v.r?v.r:{}}}return {k:k,o:m[k]}}
function tbConteazaImbogateste(b,l){
  var mem=null,g=null,acum=Date.now(),vazut={};try{mem=tbCtMemorie(b)}catch(e){}
  try{if(typeof Scenariu!=="undefined"){var s0=Scenariu.scenarii(tbStare.botBrut,b,[]);g=s0&&s0.ok?s0.grid:null}}catch(e){}
  var out=l.map(function(x0){var x=Object.assign({},x0),semne=[x.ton==="rosu"?{cls:"ctGrav ctGravRosu",text:"acționează azi"}:x.ton==="verde"?{cls:"ctGrav ctGravVerde",text:"pus"}:{cls:"ctGrav ctGravGalben",text:"urmărește"}],but=[],px=null,cand="";
    if(x.cheie==="stop"){var st=null;try{st=tbStopSansa(b)}catch(e){}if(st&&st.raport==null&&st.stop>0){px=st.stop;cand="dacă se atinge stopul"}if(st&&st.raport==null&&st.mut20>0)but.push({text:"copiază stopul propus "+Conteaza.pret(st.mut20),click:"gridCopiaza(this.value)",value:Conteaza.pret(st.mut20)})}
    else if(x.cheie==="margine"&&g){px=/de sus/i.test(x.titlu)?g.sus:g.jos;cand="dacă atinge marginea";but.push({text:"deschide în Simulator",click:"gsDeschideBot()"})}
    if(px){var t=tbCtBani(b,px);if(t!==null)x.bani=cand+": "+tbCtUsdt(t)+" în total, ca în „Dacă prețul ajunge la…”"}
    if(mem){var ck=tbCtCheie(x),p=mem.o.prev&&mem.o.prev[ck],a=mem.o.acum[ck],prima=a&&a.prima?a.prima:p&&p.prima?p.prima:acum;vazut[ck]={nr:x.nr,prima:prima};
      if(mem.o.prev&&!p)semne.push({cls:"ctNou",text:"nou"});else if(p&&String(p.nr)!==String(x.nr))semne.push({cls:"ctDelta",text:p.nr+" → "+x.nr});
      if(prima<acum-60000)semne.push({cls:"ctDeCand",text:"de la "+tbCtOra(prima)})}
    x.semne=semne;if(but.length)x.butoane=but;return x});
  if(mem){mem.o.acum=vazut;var sv=JSON.stringify(vazut);if(mem.o.scris!==sv&&(typeof tbVazAcum!=="function"||tbVazAcum())){mem.o.scris=sv;try{localStorage.setItem(mem.k,JSON.stringify({r:vazut,la:acum}))}catch(e){}}}   /* scrie doar ce s-a schimbat */
  return out;
}
/* v100.377 (el 22.11: „consilierul nu mai spune unde să mut stopul și alte sfaturi utile de genul, nu mai este sus”): cele trei sfaturi concrete ale
   Consilierului (stopul, gridul, mișcarea) stau și sus, în cutia „Contează acum” - aceleași rânduri ca în cartela „Stopul, gridul, mișcarea” din capitolul
   Riscul (aceeași socoteală: SemnaleBot.acumConcret, ținută în tbStare.concSus), cu aceeași copiere; amănuntele rămân în cartelă */
function tbConcretSusHtml(b){
  var c=tbStare.concSus;if(!b||!c||c.bot!==b.id||!Array.isArray(c.conc))return "";
  var r=c.conc.map(function(x){if(!x||!x.cod||!(x.act||x.text))return "";var tg=x.tag||{t:"",c:"mut"},mic=x.mic&&String(x.mic).length<=30?x.mic:"";
    return '<div class="ctCcRand ctCc-'+escapeHtml(x.cod)+'"><div class="ctCcCap"><b>'+escapeHtml(x.titlu)+'</b>'+(x.mare?'<span class="ctCcMare">'+escapeHtml(x.mare)+(mic?' <small>'+escapeHtml(mic)+'</small>':'')+'</span>':'')+(tg.t?'<span class="tbTag '+escapeHtml(tg.c)+'">'+escapeHtml(tg.t)+'</span>':'')+'</div>'
      +'<p class="ctCcAct">'+escapeHtml(x.act||x.text)+'</p>'+(x.bani?'<p class="ctCcBani">'+escapeHtml(x.bani)+'</p>':'')
      +(x.copie?'<button type="button" class="tbBtnLinie ctBtn" value="'+escapeHtml(x.copie)+'" data-action-click="gridCopiaza(this.value)" title="Copiază procentul în Pionex. Prețul mare se mută când se umplu grilele.">copiază '+escapeHtml(x.copie)+'</button>':'')+'</div>'}).join("");
  return r?'<div class="ctConcret"><div class="ctCcTitlu"><b>Consilierul, concret</b><button type="button" class="tbBtnLinie ctBtn" data-action-click="tbSariLa(\'risc\',\'tbConcret\')">amănuntele, în Riscul</button></div>'+r+'</div>':""}
/* auditul 22.11 (🟡): cu sfaturile Consilierului în cutie, starea „goală” a listei nu mai spune „Nimic nu pune bani în joc acum” deasupra unui sfat cu
   bani („L-aș muta la…, acolo pierzi cel mult…”): lista are pragul ei de alarmă, cartela pe al ei. Rândul spune doar ce e adevărat despre listă.
   Dacă marcajul stării goale s-ar schimba în Conteaza.gol, clasa .ctGol tot dispare (altfel cutia ar lua așezarea de „bandă subțire”). */
function tbCutieFaraAlarma(h){
  var m=/<p class="ctGol">([^<]*)<\/p>/.exec(h);if(!m)return String(h).replace(/class="ctGol"/g,'class="ctNimic"');
  var ora=/ · verificat la ([^<]*)$/.exec(m[1]);
  return h.replace(m[0],'<p class="ctNimic">Nicio alarmă în lista de azi'+(ora?" · verificat la "+ora[1]:"")+' · sfaturile Consilierului sunt mai jos</p>');
}
function tbRenderConteaza(dinTodo){var el=$("ctAcum");if(!el)return [];var b=tbStare.routeOk===false?null:tbStare.bot,l=b?tbConteazaLista(b,typeof tbCapParte==="function"?tbCapParte(b):null):[],h=typeof Conteaza!=="undefined"?(l.length?Conteaza.html(typeof tbConteazaImbogateste==="function"?tbConteazaImbogateste(b,l):l,escapeHtml):b&&Array.isArray(tbStare.sfaturiLista)&&typeof Conteaza.gol==="function"&&typeof tbCtOra==="function"?Conteaza.gol(tbCtOra(Date.now())):""):"";
  /* cu sfaturile Consilierului în ea, cutia nu mai e „goală”: rândul „nimic care pune bani în joc” rămâne, dar cutia își ține locul de lângă cap */
  var hc=b&&h&&typeof tbConcretSusHtml==="function"?tbConcretSusHtml(b):"";if(hc)h=tbCutieFaraAlarma(h)+hc;
  /* auditul 22.11: pliul rândului din cap (details.ctInCap) își ține starea peste redesenare - cu sfaturile în cutie, textul ei se schimbă mai des */
  var pliuD=!!(el.querySelector&&el.querySelector("details.ctInCap[open]"));
  var scris=tbStare.ctHtml!==h;if(tbStare.ctHtml!==h){el.innerHTML=h;tbStare.ctHtml=h}if(scris&&pliuD&&el.querySelector){var pl0=el.querySelector("details.ctInCap");if(pl0)pl0.open=true}if(el.hidden!==!h)el.hidden=!h;var sus=typeof Conteaza!=="undefined"?Conteaza.titluriSus(l).map(function(t){return String(t).toLowerCase()}):[],vechi=(tbStare.conteazaSus||[]).join("\n");tbStare.conteazaSus=sus;
  /* revizia 🟡7: blocul și-a schimbat rândurile după ce s-a desenat lista (curba / cifrele sosesc mai târziu) ⇒ lista o dată, ca „↑ e și sus” să fie la zi; din listă nu se cheamă înapoi */
  if(!dinTodo&&vechi!==sus.join("\n")&&typeof tbRenderTodo==="function")tbRenderTodo();return l}
function tbEsteSus(t){return (tbStare.conteazaSus||[]).indexOf(String(t||"").toLowerCase())>=0}
// audit 19.10: stopul de probă (v100.99) scos - butonul lui a ieșit din citire în v100.138, deci tbProbaComuta nu mai era chemată și
// starea lui rămânea mereu inactivă; GraficBot.stopProba (modulul pur, cu proba lui) rămâne
// v100.98: citirea graficului în coloana din dreapta - doar ce se vede pe grafic, în cuvinte (sfatul rămâne la semafor)
// v100.106: semaforul trendului pe 5m/15m/30m/1h/4h/1z din lumânările pe care le aduce deja „Direcția” (tbAduDirectie); null până sosesc
// revizia R1: doar lumânările monedei (și direcției) botului de acum - la schimbarea botului, până sosesc ale lui, nimic;
// v100.110 (I-548): cât se aduc, cele venite deja (d.peLucru, aceeași cheie) - becurile se aprind pe rând
function tbCheieDir(b){return TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex+"|"+(b.directie||"")}
function tbSemaforTf(b){var d=tbStare.directie;if(!d||!b||typeof TabloTrend==="undefined")return null;var x=TabloTrend.stareSemafor(d,tbCheieDir(b));return x?GraficBot.semafor(x.pe,b.directie,x.opt):null}   /* v100.112 (I-553) */
// v100.110 (I-548): reluarea TF-urilor care n-au venit (o dată, la 30 s după tură) - doar pentru botul de atunci
async function tbReiaLipsa(){
  var b=tbStare.bot,d=tbStare.directie;if(!b||!d||typeof TabloTrend==="undefined"||d.inLucru||!d.lipsa||!d.lipsa.length||d.simbol!==tbCheieDir(b)||!d.randuriPe){if(d)d.reiaProgramat=false;return}
  // v100.112 (I-553): o singură dată, doar lipsa; TF-urile „Direcției” își refac și rândul de acolo (revizia v100.110, R2) - în TabloTrend.reia
  await TabloTrend.reia(d,{dirTf:TB_DIR_TF,extraTf:TB_SEM_EXTRA,aduce:tbAduTf(TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex),analizeaza:function(rows,x){return Directie.analizeaza(rows,x.orizont,b.directie)}});
  if(d.randuriPe["4H"])d.randuri4h=d.randuriPe["4H"];
  tbCalculeazaIndicatorii(d);renderTabloDirectia();renderTabloIndicatori();if(typeof renderTabloSfaturi==="function")renderTabloSfaturi();if(typeof renderTabloGrafic==="function")renderTabloGrafic();
}
function tbTrendIstoric(b){var d=tbStare.directie,p=TB_PERIOADE[tbTf()];if(!d||!d.randuriPe||!p||!b||d.simbol!==tbCheieDir(b))return null;return d.randuriPe[p.i]||null}
// v100.138 (el, 08.10: „acolo mă interesează doar direcție, trend, indicatori diverși, ce zice Busola … și foarte important să fie LIVE”):
// citirea e despre PIAȚĂ (GraficBot.citire cu doarPiata) + Indicatorii pe intervalul graficului, Estimarea pe 16 ore și Busola pe 4h;
// fără banii botului și fără „Stop de probă” (el: „îl scot de tot”). tbStare.citireO ține intrarea pentru recitirea la fiecare tic (tbCitireLive).
function tbCitireSchelet(h){return String(h||"").replace(/<span class="tbCitTx">[^<]*<\/span>/g,"<span class=\"tbCitTx\"></span>").replace(/<p class="tbCitScurt">[^<]*<\/p>/g,"<p class=\"tbCitScurt\"></p>")}
function tbCitirePeLoc(el,h){
  if(!el)return false;
  var tmp=document.createElement("div");tmp.innerHTML=h;
  var ra=el.querySelectorAll(".tbCitR"),rb=tmp.querySelectorAll(".tbCitR");
  if(ra.length!==rb.length)return false;
  for(var i=0;i<ra.length;i++){
    // v100.289: și `randPlin` (rândul pliat rămas singur, întins pe tot rândul de lib/asezare-randuri.js) se ține, ca pzFold: altfel rândul
    // se rescria la fiecare secundă doar pentru marcaj, iar marcajul pleca
    var tine=(ra[i].classList.contains("pzFoldOk")?" pzFoldOk":"")+(ra[i].classList.contains("pzFold")?" pzFold":"")+(ra[i].classList.contains("randPlin")?" randPlin":"");
    var cur=ra[i].className.replace(/\s*pzFoldOk/g,"").replace(/\s*pzFold/g,"").replace(/\s*randPlin/g,"").replace(/\s+/g," ").trim();
    var vrea=String(rb[i].className||"").replace(/\s+/g," ").trim();
    if(cur!==vrea)ra[i].className=vrea+tine;
    var ia=ra[i].querySelector(".tbCitIc"),ib=rb[i].querySelector(".tbCitIc");
    if((ia?1:0)!==(ib?1:0))return false;
    if(ia&&ia.textContent!==ib.textContent)ia.textContent=ib.textContent;
    var ta=ra[i].querySelector(".tbCitTx"),tn=rb[i].querySelector(".tbCitTx");
    if((ta?1:0)!==(tn?1:0))return false;
    if(ta&&ta.textContent!==tn.textContent)ta.textContent=tn.textContent;
  }
  var ps=el.querySelector(".tbCitScurt"),pn=tmp.querySelector(".tbCitScurt");
  if((ps?1:0)!==(pn?1:0))return false;
  if(ps&&ps.textContent!==pn.textContent)ps.textContent=pn.textContent;
  return true;
}
/* v100.376 („fa idei”, a treia oară): șansa take-profit-ului pe 24 h lângă prețul lui pe Drum - aceeași cifră ca bara din cap (Monte Carlo pe botul lui,
   cu aceeași gardă: nu când reluarea arată botul oprit, nu din tura care a picat) */
/* v100.381 (el, 24.11.2026: „cum poate să atingă și stopul și TP în proporție de 72% ambele?”): lângă take-profit, pe Drum, stopul ia cifra din ACEEAȘI simulare
   (ce vine întâi), ca bara din cap; fără cifra take-profit-ului rămâne curba stopului (tbStopSansaDrum) */
function tbStopMcDrum(b){try{var mr=typeof tbMc!=="undefined"&&tbMc&&b&&String(tbMc.botId)===String(b.id)&&tbMc.rand&&!tbMc.eroare?tbMc.rand:null;if(!mr||!Array.isArray(mr.scurt)||/Reluarea arată botul/.test(String(mr.text||"")+" "+String(mr.faCe||"")))return null;var s=mr.scurt.filter(function(x){return x&&x.ore===24&&typeof x.pTp==="number"&&isFinite(x.pTp)&&typeof x.pStop==="number"&&isFinite(x.pStop)})[0];return s?"24 h: "+(s.pStop*100<0.05?"sub 0,1%":TextRo.num(s.pStop*100,1)+"%"):null}catch(e){return null}}
function tbTpSansaDrum(b){try{var mr=typeof tbMc!=="undefined"&&tbMc&&b&&String(tbMc.botId)===String(b.id)&&tbMc.rand&&!tbMc.eroare?tbMc.rand:null;if(!mr||!Array.isArray(mr.scurt)||/Reluarea arată botul/.test(String(mr.text||"")+" "+String(mr.faCe||"")))return null;var s=mr.scurt.filter(function(x){return x&&x.ore===24&&typeof x.pTp==="number"&&isFinite(x.pTp)})[0];return s?"24 h: "+(s.pTp*100<0.05?"sub 0,1%":TextRo.num(s.pTp*100,1)+"%"):null}catch(e){return null}}
/* v100.376 (el, 21.11.2026: „FA IDEI”, a doua oară): în cât timp ajunge botul pe zero DIN GRILE - aceeași socoteală ca „ritmul de recuperare” de sub
   „Rezultat total” (TabloExtra.grileVsCosturi + ritmRecuperare, o singură sursă), dată capului lângă zero-ul care din preț nu se mai atinge.
   null când botul nu e pe minus sau lipsesc datele; { tanar } sub o zi de viață (ritmul nu se socotește încă); zile = null când grilele nu acoperă costurile. */
/* v100.376 („fa idei”, a patra oară): take-profit-ul în procente care din preț nu se atinge ⇒ în câte zile de grile ajunge botul la totalul lui, la ritmul de azi
   (aceeași sursă ca „Pe zero, din grile”: TabloExtra.grileVsCosturi; ținta e totalul take-profit-ului în loc de zero) */
function tbTpGrile(b){try{if(typeof TabloExtra==="undefined"||!TabloExtra.tpDinPret||TabloExtra.tpDinPret(b)!==false)return null;var tot=botiNr(b.profitTotal),tinta=botiNr(TabloExtra.totalLaTinta(b));if(tot===null||tinta===null||!(tinta>tot))return null;var g=TabloExtra.grileVsCosturi(b,Date.now());if(!g)return null;if(g.preaTanar)return{tanar:true};var n=botiNr(g.netZi);if(n===null)return null;return n>0?{zile:(tinta-tot)/n,netZi:n}:{zile:null,netZi:n}}catch(e){return null}}
function tbZeroGrile(b){try{var tot=botiNr(b.profitTotal);if(tot===null||!(tot<0)||typeof TabloExtra==="undefined")return null;var g=TabloExtra.grileVsCosturi(b,Date.now());if(!g)return null;if(g.preaTanar)return{tanar:true};var r=TabloExtra.ritmRecuperare(tot,g.netZi);return r?{zile:r.zile,netZi:g.netZi}:null}catch(e){return null}}
/* v100.376 (I-916; el, 21.11.2026: „FA IDEI”): cuprinsul capitolelor - cele cinci legături duc pagina la titlul capitolului (fără animație când omul a cerut
   mișcare redusă). Butoane, nu ancore: aplicația își ține singură adresa în bară. */
/* v100.387: rândurile create din cod (fluxul, riscul pieței) iau locul din capitolul Riscul: imediat după „Stopul, gridul, mișcarea” (order 322), pe toată lățimea */
function tbFluxLoc(e){if(!e||!e.style)return;e.style.setProperty("order","323","important");e.style.setProperty("grid-column","1 / -1","important");e.style.minWidth="0";e.style.margin="4px 0"}
/* v100.387 (I-939, el: „fă tot” după auditul paginii): capitolele ca FILE. Rândul „Sari la” devine „Toate · Decizia · Riscul · Banii · Piața · Jurnalul”;
   implicit „Toate” = pagina exact ca până acum (nimic pierdut); o filă arată doar capitolul ei, capul, graficul și cifrele de sus rămân mereu. Membrii fiecărui
   capitol = rândurile din intervalul lui de `order` din app.css (decizia 300–318, riscul 320–338, banii 340–358, piața 360–378, jurnalul 380+). Alegerea se ține minte. */
var TB_FILE={decizia:["#tbCap-decizia","#tbTodo","#tbSemaforCard","#tbMotive","#tbPl-sfaturi","#tbPl-plan"],risc:["#tbCap-risc","#tbConcret","#tbFlux","#tbRiscPiata","#tbScenariiCard","#tbMcSus","#tbPl-risc","#tbPl-prob"],
  bani:["#tbCap-bani","#tbBaniCard","#tbAcumCard","#tbPl-sapt","#tbPl-fisa","#tbPl-port","#tabloubot .tbCadru>.contTot"],piata:["#tbCap-piata","#tbCitireCard","#tbCitireMobil","#tabloubot .tbCadru>.piataAzi","#tbIdei","#tbGridNou"],
  jurnal:["#tbCap-jurnal","#tbPl-alerte","#tbPl-avert","#tbPl-socoteala"]};
function tbFilaAcum(){var k=null;try{k=localStorage.getItem("tbFila")}catch(e){}return k&&TB_FILE[k]?k:"toate"}
/* v100.391 (scăparea din v100.387, găsită pe viu 25.11): pe botul de SEMNAL capitolele Decizia și Riscul nu există (app.css, regula v100.380
   „.tbSemnal”) ⇒ fila lor nu se arată, iar fila ținută minte (aleasă pe un bot de grid) se citește ca „Toate” — altfel pagina ieșea GOALĂ.
   Alegerea rămâne în localStorage: înapoi pe botul de grid, fila revine. */
function tbFilaLipsa(c){var p=$("tabloubot");return !!(p&&p.classList&&p.classList.contains("tbSemnal")&&(c==="decizia"||c==="risc"))}
function tbFilaAplica(){var k=tbFilaAcum(),nav=$("tbCuprins");if(k!=="toate"&&tbFilaLipsa(k))k="toate";
  if(!$("tbFilaStil")){var st=document.createElement("style");st.id="tbFilaStil";st.textContent='html #tabloubot#tabloubot#tabloubot#tabloubot#tabloubot#tabloubot [data-fila-ascuns="1"][data-fila-ascuns="1"]{display:none!important}';   /* peste regulile paginii (până la 4 id-uri, cu !important) */document.head.appendChild(st)}
  Object.keys(TB_FILE).forEach(function(c){TB_FILE[c].forEach(function(sel){[].forEach.call(document.querySelectorAll(sel),function(e){var asc=k!=="toate"&&c!==k;if(asc){if(e.getAttribute("data-fila-ascuns")!=="1")e.setAttribute("data-fila-ascuns","1")}else if(e.hasAttribute("data-fila-ascuns"))e.removeAttribute("data-fila-ascuns")})})});
  if(nav){if(!nav.querySelector(".tbFilaToate")){var bt=document.createElement("button");bt.type="button";bt.className="tbFilaToate";bt.textContent="Toate";bt.setAttribute("data-action-click","tbFilaAlege('toate')");var sp=nav.querySelector("span");nav.insertBefore(bt,sp?sp.nextSibling:nav.firstChild)}
    var sp2=nav.querySelector("span");if(sp2&&sp2.textContent!=="Arată")sp2.textContent="Arată";
    [].forEach.call(nav.querySelectorAll("button"),function(b){var a0=b.getAttribute("data-action-click")||"";if(/^tbSariLa\('\w+'\)$/.test(a0))b.setAttribute("data-action-click",a0.replace("tbSariLa","tbFilaAlege"));});   /* butoanele rândului = filele */
    [].forEach.call(nav.querySelectorAll("button"),function(b){var m=/tbSariLa\('(\w+)'\)|tbFilaAlege\('(\w+)'\)/.exec(b.getAttribute("data-action-click")||""),c=m?(m[1]||m[2]):null;if(c)b.setAttribute("aria-pressed",String(c===k))})}}
function tbFilaAlege(k){try{localStorage.setItem("tbFila",TB_FILE[k]?k:"toate")}catch(e){}tbFilaAplica();if(TB_FILE[k]){var e=$("tbCap-"+k);if(e)try{e.scrollIntoView({block:"start"})}catch(x){}}}
function tbSariLa(k,rand){if(typeof tbFilaAcum==="function"){var fa=tbFilaAcum();if(fa!=="toate"&&fa!==k&&TB_FILE[k]&&!tbFilaLipsa(k)){try{localStorage.setItem("tbFila",k)}catch(e){}tbFilaAplica()}}   /* v100.387 (I-939): pe o filă, legătura spre alt capitol îl arată; pe „Toate” rămân toate */
  /* v100.377 (auditul 22.11): cu al doilea argument, rândul acela al capitolului se deschide întâi (altfel butonul ducea la un rând pliat) */
  if(rand&&typeof TB_RANDURI!=="undefined"&&Object.prototype.hasOwnProperty.call(TB_RANDURI,rand)&&typeof tbRandComuta==="function"){try{tbRandComuta(rand,true)}catch(x){}}
  var e=$("tbCap-"+k);if(!e)return;var lin=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;try{e.scrollIntoView({behavior:lin?"auto":"smooth",block:"start"})}catch(x){e.scrollIntoView()}}
/* v100.376 (I-919): titlul fiecărui capitol poartă starea de azi, citită de pe ECRAN - din cifra sau rândul care o arată deja (o singură sursă, nimic
   socotit a doua oară). Fără sursă nu scrie nimic (nici zero, nici liniuță). Se reface odată cu rezumatele rândurilor (tbRandAplica, la 4 secunde). */
function tbCapAzi(){var p=$("tabloubot");if(!p)return;if(typeof tbFilaAplica==="function")try{tbFilaAplica()}catch(e){}   /* v100.387 (I-939) */
  var txt=function(e){return e&&!e.hidden?String(e.textContent||"").replace(/\s+/g," ").trim():""};
  var todo=p.querySelectorAll("#tbTodo .tbTodoRand").length,stop="";
  [].forEach.call(p.querySelectorAll('#pzVerdict .pzMetru[aria-label="Atinge stopul"] .pzBara'),function(x){if(txt(x.querySelector("span"))==="24 h")stop=txt(x.querySelector("b"))});
  var lich=txt($("tbKpiLich")),tot=txt($("tbKpiTotal")),kv=p.querySelector("#tbKpiGridKv .pzKv"),grid=kv&&/^din grid/.test(txt(kv))?txt(kv.querySelector("b")):"";
  var vr=txt($("tbVremea")).replace(/^Vremea monedei:\s*/,"").split(" · ")[0],al=txt($("tbPlSub-alerte"));
  var S={decizia:todo?TextRo.cate(todo,"lucru pe listă","lucruri pe listă"):"",
    risc:stop?"stop atins în 24 h: "+stop:(lich&&lich!=="—"?"până la lichidare "+lich:""),
    bani:tot&&tot!=="—"?tot+" USDT"+(grid?", din grid "+grid:""):"",
    piata:/intervale/.test(vr)?vr:"",
    jurnal:/în ultimele 24 h/.test(al)?"alerte: "+al:""};
  Object.keys(S).forEach(function(k){var e=$("tbCapAzi-"+k);if(e&&e.textContent!==S[k])e.textContent=S[k]})}
/* v100.376 (I-918; el, 21.11.2026: „livrează și fă-le”): sub 1181 px lista „Ce spune piața acum” stă deschisă (copia ei de telefon, în jur de 25 de
   rânduri). Rândurile fără semn (gri, „info”) se strâng sub un buton numărat; cele roșii, galbene și verzi rămân la vedere. Rândurile le ascunde foaia
   de stil (clasa de pe #tbCitireMobil) - aici doar numărul și starea, ținută în localStorage; „Deschide tot” / „Strânge tot” o schimbă și pe ea. */
var TB_CIT_GRI_KEY="tbCitGriDeschisV1";
function tbCitGriStare(){if(tbCitGriStare.v===undefined){tbCitGriStare.v=false;try{tbCitGriStare.v=localStorage.getItem(TB_CIT_GRI_KEY)==="1"}catch(e){}}return tbCitGriStare.v}
function tbCitGriPune(d){tbCitGriStare.v=!!d;try{localStorage.setItem(TB_CIT_GRI_KEY,d?"1":"0")}catch(e){}tbCitGri()}
function tbCitGriComuta(){tbCitGriPune(!tbCitGriStare())}
function tbCitGri(){var m=$("tbCitireMobil"),b=$("tbCitGri");if(!m||!b)return;
  /* rândul Monte Carlo din copie tace cât cardul lui de sus e vizibil (regula v100.240) - atunci nu se numără */
  var sus=$("tbMcSus"),d=tbCitGriStare(),n=[].filter.call(m.querySelectorAll(".tbCitR.info"),function(x){return !(x.classList.contains("tbCitMc")&&sus&&!sus.hidden)}).length;
  if(m.classList.contains("tbCitGriDeschis")!==d)m.classList.toggle("tbCitGriDeschis",d);
  var cate=TextRo.cate(n,"informație","informații"),t=n?(d?"▾ fără semn: "+cate+" · strânge":"▸ încă "+cate+" fără semn"):"";
  if(b.hidden!==!n)b.hidden=!n;if(b.textContent!==t)b.textContent=t;var ae=d?"true":"false";if(b.getAttribute("aria-expanded")!==ae)b.setAttribute("aria-expanded",ae)}
function tbDeseneazaCitire(o,b){var loc=[$("tbCitire"),$("tbCitireMobil")].filter(Boolean);if(!loc.length)return;
  // revizia (1): intrarea e a botului și intervalului de ACUM - tbCitireLive recitește doar cu cheia asta (altfel, după schimbarea botului, citirea
  // monedei vechi lua prețul celei noi); revizia (3): copia de pe telefon primește antetul cu ceasul (cardul cu #tbCitireLive e ascuns sub 1180 px)
  tbStare.citireO=o;tbStare.citireCheie=TabloBot.simboluri(b.baza,b.quote,b.simbolPionex).pionex+"|"+tbTf()+"|"+b.id;
  var cap='<p class="tbCitCap"><b>Ce spune piața acum</b> <span class="tbSub tbCitLive'+(tbStare.citireStamp?" "+tbStare.citireStamp.cls:"")+'" data-cit-live>'+escapeHtml(tbStare.citireStamp?tbStare.citireStamp.text:"live")+'</span></p>';
  var scrie=function(h){scrie0(h);tbCitGri()},scrie0=function(h){if(tbStare.citireH===h)return;if(tbStare.citireH&&tbCitireSchelet(tbStare.citireH)===tbCitireSchelet(h)){var ok=true;loc.forEach(function(el){if(!tbCitirePeLoc(el,h))ok=false});var sus0=$("tbMcSus");if(ok&&sus0&&!sus0.hidden){var j=h.indexOf(" tbCitMc");if(j>=0){var a0=h.lastIndexOf("<div",j),b0=h.indexOf("</div></div>",j),frag0=a0>=0&&b0>a0?h.slice(a0,b0+12):"";if(frag0)tbCitirePeLoc(sus0,frag0)}}if(ok){tbStare.citireH=h;return}}tbStare.citireH=h;loc.forEach(function(el){el.innerHTML=(el.id==="tbCitireMobil"?cap:"")+h});var sus=$("tbMcSus");if(sus){var i=h.indexOf(" tbCitMc");if(i<0){sus.innerHTML="";sus.hidden=true}else{var a=h.lastIndexOf("<div",i),b=h.indexOf("</div></div>",i),frag=a>=0&&b>a?h.slice(a,b+12):"";sus.innerHTML=frag;sus.hidden=!frag}}if(typeof window!=="undefined"&&window.AsezarePaznic&&typeof AsezarePaznic.pliaza==="function")AsezarePaznic.pliaza()};   /* revizia: DOM-ul se rescrie doar când textul s-a schimbat; v100.240: Monte Carlo copiat sus; v100.241: plierea în aceeași clipă; v100.242: la același schelet se schimbă cifrele, nu nodurile (și pe telefon) */
  var c=GraficBot.citire(Object.assign({},o,{doarPiata:true}),b,botiNr(b.pretCurent));
  if(!c){scrie('<p class="tbSub">Prea puține prețuri pentru citire.</p>');return}
  var IC={bine:"✓",atentie:"!",rau:"✕",info:"·"};
  var rd=function(x){return '<div class="tbCitR '+x.stare+(x.vechi?" vechi":"")+'"><span class="tbCitIc" aria-hidden="true">'+IC[x.stare]+'</span><div><b>'+escapeHtml(x.ce)+':</b> <span class="tbCitTx">'+escapeHtml(x.text)+'</span>'+(x.link?'<a class="tbMcBtn tbCitLink" href="'+escapeHtml(x.link)+'" target="_blank" rel="noopener">deschide în Busolă</a>':'')+(x.actiune?'<button type="button" class="tbMcBtn tbCitLink" data-action-click="'+escapeHtml(x.actiune)+'">'+escapeHtml(x.linkText||"deschide")+'</button>':'')+'</div></div>'};   /* v100.149 (I-582): butonul spre Busolă · v100.150 (I-583): buton cu acțiune în aplicație (pânda ›, revizia: nu <a href="#">) + clasa vechi */
  // v100.111 (I-542): în locul celor 6 rânduri ale semaforului, unul singur - tabelul „Trendul pe TF-uri” de sub grafic le arată pe toate
  var su=GraficBot.trendSumar(tbSemaforTf(b)),bloc=rd({stare:su.stare,ce:"Trendul pe TF-uri",text:su.text}),pus=false,ind=false,ex=tbCitireExtra(b,o),out=[],fund=false;
  /* v100.147: rândurile Busolei, în ordinea ei (starea, direcția, cifra, gridul, intervalul, BTC) - un singur loc pentru amândouă chemările */
  var busolaRanduri=function(){[ex.busola,ex.busolaDirectie1h,ex.busolaVerdict1h,ex.busolaDirectie,ex.busolaVerdict,ex.busolaGrid,ex.busolaInterval,ex.busolaBtc].forEach(function(x){if(x)out.push(rd(x))})};   /* v100.149 (I-580): 1h înaintea celor pe 4h */
  /* v100.148 (I-571): fraza vocilor în capul citirii - graficul pe 4h (semaforul), direcția Busolei, felul Monte Carlo; galben doar ca avertizare */
  var vSem=typeof tbSemaforTf==="function"?tbSemaforTf(b):null,v4H=Array.isArray(vSem)?vSem.filter(function(x){return x&&x.tf==="4H"&&x.dir})[0]:null;
  /* revizia Opus: vocea Busolei doar din rezumat proaspăt (sub 4,5 h; pazaStare.vechi), altfel fraza ar judeca pe o direcție de acum 10 h */
  var vP=typeof Busola!=="undefined"&&Busola.rezumat()?Busola.pazaStare(Busola.rezumat(),tbCheieBusola(b),Date.now()):null;
  var vB=vP&&!vP.vechi?Busola.randDirectie(Busola.rezumat(),tbCheieBusola(b),Date.now(),{bot:b.directie}):null,vM=tbMcRand(b);
  var voci=typeof Busola!=="undefined"?Busola.concluzie({bot:b.directie,grafic:v4H?v4H.dir:null,busola:vB?vB.semn:null,mc:vM?vM.stare:null,mcAtins:!!(vM&&/planul atins/i.test(String(vM.text||"")))}):null;
  c.randuri.forEach(function(x){
    if(x.tf){if(pus)return;pus=true;out.push(bloc);if(ex.latime)out.push(rd(ex.latime));if(ex.latimeMoneda)out.push(rd(ex.latimeMoneda));if(ex.monedeBot)out.push(rd(ex.monedeBot));if(ex.bilant)ex.bilant.forEach(function(x){out.push(rd(x))});if(ex.latimeUs)out.push(rd(ex.latimeUs));if(ex.sectoare)out.push(rd(ex.sectoare));if(ex.macro)out.push(rd(ex.macro));if(ex.rangeFilter)out.push(rd(ex.rangeFilter));if(ex.indicatori&&!ind){ind=true;out.push(rd(ex.indicatori))}return}   /* v100.150 (I-583): lățimea pieței după trendul pe TF-uri, înaintea Indicatorilor */
    if(x.ce==="Funding"){fund=true;if(ex.estimare)out.push(rd(ex.estimare));busolaRanduri()}
    out.push(rd(x));
    if(x.ce==="Direcția"&&ex.indicatori&&!ind){ind=true;out.push(rd(ex.indicatori))}});   /* revizia: fără semafor, Indicatorii stau după Direcția */
  if(!ind&&ex.indicatori)out.push(rd(ex.indicatori));
  if(!fund){if(ex.estimare)out.push(rd(ex.estimare));busolaRanduri()}
  // v100.139: Monte Carlo pe botul tău, primul rând - cu drumul spre Simulatorul grid (botul deja ales acolo)
  /* v100.269 (29.10, el: „un contor … gen 1-0, să fie vizibil”): scorul Monte Carlo (dreptate – greșit) stă primul în rând */
  var mc=vM;if(mc)out.unshift('<div class="tbCitR '+mc.stare+' tbCitMc"><span class="tbCitIc" aria-hidden="true">🎰</span><div>'+tbMcScorHtml(mc.scor,b.id)+'<b>'+escapeHtml(mc.ce)+':</b> <span class="tbCitTx">'+escapeHtml(mc.text)+'</span>'+(mc.nota?'<span class="tbSub tbMcNota">'+escapeHtml(mc.nota)+'</span>':'')+tbMcScurtHtml(mc.scurt,(/Reluarea arată botul (OPRIT|LICHIDAT)/.exec(String(mc.text||""))||[])[1],!!(typeof tbStopSansa==="function"&&tbStopSansa(b)))+tbMcScurtVerifHtml(mc.scurt,typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv.d?tbMcKv.d.calibrareScurt:null)+(mc.sapt?'<span class="tbSub tbMcScurt tbMcSapt">'+escapeHtml(mc.sapt)+'</span>':'')+tbHotHtml(mc.hot)+(typeof tbMcIstoricHtml==="function"?tbMcIstoricHtml(b):"")+' <button type="button" class="tbIntBtn tbMcBtn" data-action-click="gsDeschideBot()">'+escapeHtml(mc.buton)+'</button> <button type="button" class="tbIntBtn tbMcBtn" data-action-click="tbInstantaneu()" title="un fișier pe calculatorul tău cu botul, lumânările și ce a socotit pagina acum - ca o cifră suspectă să se poată reface exact">salvează clipa asta</button></div></div>');
  /* v100.149 (I-577): bilanțul jurnalului vocilor (KV, adus o dată la 10 min) sub frază - cine a avut dreptate în ultimele 30 de zile */
  var vb=voci?tbVociBilant():null;
  scrie('<p class="tbCitScurt">'+escapeHtml(c.peScurt.charAt(0).toUpperCase()+c.peScurt.slice(1))+'</p>'+(voci?'<p class="tbCitVoci '+voci.nivel+'">'+escapeHtml(voci.text)+(vb?'<span class="tbSub tbMcNota">'+escapeHtml(vb)+'</span>':'')+'</p>':'')+out.join(""))}
// v100.351 (el: „dezvoltă mai mult ideea nr 2”): ce aș face cu botul (colectorul, la 30 de minute; altceva decât „îl țin” doar cu dovadă) - tabelul întreg în Simulator
// v100.352 (auditul): cu ora de la care ține recomandarea, cu schimbarea care așteaptă confirmarea (a doua socotire) și cu ce înseamnă „îl țin”
function tbHotHtml(h){if(!h||!h.cheie||h.eroare||!(Date.now()-(Number(h.ultima)||0)<90*60000))return "";var alt=h.cheie!=="tine",ora=Number(h.la)>0?new Date(Number(h.la)).toLocaleString("ro-RO",Date.now()-Number(h.la)<18*3600000?{timeZone:"Europe/Bucharest",hour:"2-digit",minute:"2-digit"}:{timeZone:"Europe/Bucharest",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):null,cand=h.candidat&&h.candidat!==h.cheie?(h.candNume||h.candidat):null;return '<span class="tbSub tbMcScurt tbMcHot'+(alt?" tbWarn":"")+'">🧭 <b>Ce aș face cu botul:</b> '+escapeHtml(alt?h.nume:"îl țin așa")+(ora?" (de la "+escapeHtml(ora)+")":"")+(alt&&h.motiv?" - "+escapeHtml(h.motiv):"")+(!alt?" - "+(h.motiv?escapeHtml(h.motiv):"nicio schimbare nu iese sigur mai bună pe bani")+" (nu înseamnă că stopul e bine pus)":"")+(cand?" · se poate schimba în «"+escapeHtml(cand)+"» (aștept a doua socotire)":"")+' · tabelul întreg: Simulatorul grid</span>'}
// v100.149 (I-577): jurnalul vocilor din KV (action=voci), o dată la 10 minute; sosirea redesenează citirea o dată
var tbVociKv={la:0,d:null,inLucru:null};
function tbVociBilant(){
  if(Date.now()-tbVociKv.la>=10*60000&&!tbVociKv.inLucru){tbVociKv.inLucru=getJSON("/api/istoric-bot?action=voci").then(function(r){tbVociKv.d=r&&Array.isArray(r.voci)?r.voci:null},function(){tbVociKv.d=tbVociKv.d||null}).then(function(){tbVociKv.la=Date.now();tbVociKv.inLucru=null;if(tbPanouVizibil()&&tbStare.bot&&tbStare.citireO)tbDeseneazaCitire(tbStare.citireO,tbStare.bot)})}
  var b=typeof Busola!=="undefined"&&tbVociKv.d?Busola.bilantVoci(tbVociKv.d,Date.now()):null;return b?b.text:null}
// v100.395: monedele de bot direcțional din KV (action=monedeBot), o dată la 10 minute; sosirea redesenează citirea o dată
var tbMonedeBotKv={la:0,d:null,inLucru:null};
function tbMonedeBotDinKv(){
  if(Date.now()-tbMonedeBotKv.la<10*60000||tbMonedeBotKv.inLucru)return;
  tbMonedeBotKv.inLucru=getJSON("/api/istoric-bot?action=monedeBot").then(function(r){tbMonedeBotKv.d=r&&r.monedeBot&&Array.isArray(r.monedeBot.monede)?r.monedeBot:null},function(){tbMonedeBotKv.d=tbMonedeBotKv.d||null}).then(function(){tbMonedeBotKv.la=Date.now();tbMonedeBotKv.inLucru=null;if(tbPanouVizibil()&&tbStare.bot&&tbStare.citireO)tbDeseneazaCitire(tbStare.citireO,tbStare.bot)})}
// v100.150 (I-583): lățimea pieței din KV (action=latime), o dată la 10 minute; sosirea redesenează citirea o dată
var tbLatimeKv={la:0,d:null,inLucru:null};
function tbLatimeDinKv(){
  if(Date.now()-tbLatimeKv.la<10*60000||tbLatimeKv.inLucru)return;
  tbLatimeKv.inLucru=getJSON("/api/istoric-bot?action=latime").then(function(r){tbLatimeKv.d=r&&r.latime&&r.latime.acum?r.latime:null},function(){tbLatimeKv.d=tbLatimeKv.d||null}).then(function(){tbLatimeKv.la=Date.now();tbLatimeKv.inLucru=null;if(tbPanouVizibil()&&tbStare.bot&&tbStare.citireO)tbDeseneazaCitire(tbStare.citireO,tbStare.bot);var ac=$("dash");if(ac&&ac.classList.contains("on")&&typeof acasaDeseneaza==="function")acasaDeseneaza()})}   /* v100.186: și Acasă (rândul „În pândă” pe fiecare bot) */
