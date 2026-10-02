import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
import {PIONEX,TIMEOUT_MS,pionexPrivatGet} from "../_shared/pionex.js";
import {avertismenteBot} from "../_shared/avertismente.js";

// Cititul botilor de grid Pionex. STRICT READ-ONLY: singura ruta atinsa e
// GET /api/v1/bot/orders. Nimic din API-ul de boti care schimba ceva nu apare aici.
//
// De ce exista: jurnalul v71 citeste doar tranzactii spot. Banii pot sta intr-un
// bot de grid pe perpetue, invizibil si pentru spot, si pentru futures - si
// nici macar in soldul obisnuit, fiindca Pionex ii tine in bot.
//
// v74.6: contractul din planul reparatiilor 24.09. Orice cifra de bani LIPSA iese
// null, niciodata 0 (Number(null)===0, Number("")===0 - capcana dovedita).

const H={"content-type":"application/json","cache-control":"no-store"};
const json=(x,status=200,antete={})=>new Response(JSON.stringify(x),{status,headers:{...H,...antete}});

// null/undefined/""/spatii/nenumeric -> null; "0" -> 0.
const nr=v=>{
  if(typeof v==="number")return Number.isFinite(v)?v:null;
  if(typeof v!=="string"||!v.trim())return null;
  const x=Number(v);return Number.isFinite(x)?x:null;
};
const toate=(...a)=>a.every(x=>x!==null);

async function citesteBoti(env,params={}){
  // Poarta de ritm e aceeasi cu pionex-account: aceeasi cheie, aceeasi limita.
  const {r,data:d}=await pionexPrivatGet(env,"/api/v1/bot/orders",params);

  // 🔑 Pionex raspunde cu HTTP 200 chiar si cand refuza. Daca ne-am uita doar la
  // codul de stare, o cheie fara dreptul "Bot reading" ar arata ca "zero boti" -
  // exact esecul tacit pe care ruta asta il vaneaza.
  if(d&&d.result===false){
    const cod=String(d.code||"");
    if(/PERMISSION/i.test(cod))throw Object.assign(
      Error("Cheia Pionex nu are dreptul „Bot reading”. Bifează-l în Pionex › API Management (e doar citire) sau fă o cheie nouă cu el."),
      {status:403});
    throw Object.assign(Error(`Pionex bot API: ${d.message||cod||"refuz"}`),{status:502,motiv:"refuz-pionex"});
  }
  if(!r.ok)throw Object.assign(Error(`Pionex bot API: HTTP ${r.status}`),{status:r.status>=400?r.status:502,motiv:`http-${r.status}`});
  // Forma: lista goala e valida DOAR la result:true + results:[]. Orice altceva
  // (corp ne-JSON, fara result:true, results care nu e lista) e eroare, nu "0 boti".
  if(!d)throw Object.assign(Error("Pionex bot API: raspuns care nu e JSON"),{status:502,motiv:"corp-ne-json"});
  if(d.result!==true)throw Object.assign(Error("Pionex bot API: raspuns fara result:true"),{status:502,motiv:"fara-result-true"});
  // v90: cand n-ai niciun bot pornit, Pionex raspunde result:true + results:null (vazut 25.09, dupa inchiderea lui
  // MET) - asta e "zero boti", nu o forma stricata. Orice alt ne-sir ramane eroare.
  // v100.25: Pionex da istoria pe PAGINI de cate 10 (limit e ignorat); cursorul paginii urmatoare vine in nextPageToken
  const next=d.data&&typeof d.data.nextPageToken==="string"&&/^[A-Za-z0-9]{1,64}$/.test(d.data.nextPageToken)?d.data.nextPageToken:null;
  if(d.data&&d.data.results===null)return {results:[],next};
  if(!Array.isArray(d.data?.results))throw Object.assign(Error("Pionex bot API: data.results nu e o lista"),{status:502,motiv:"forma-necunoscuta"});
  return {results:d.data.results,next};
}

// Preturile perpetuelor, ca sa putem spune cat mai e pana la lichidare.
// Daca nu se poate, botii tot se intorc - lipsa se raporteaza, nu se ascunde.
async function preturiPerp(){
  const r=await fetch(`${PIONEX}/api/v1/market/tickers?type=PERP`,{headers:{accept:"application/json"},signal:AbortSignal.timeout(TIMEOUT_MS)});
  if(!r.ok)throw Error(`tickere PERP: HTTP ${r.status}`);
  const d=await r.json();
  const harta={};
  // Forma necunoscuta nu e "fara preturi" in tacere: motivul ajunge in probleme.preturi.
  if(!Array.isArray(d?.data?.tickers))throw Error("tickere PERP: forma necunoscuta (data.tickers nu e o lista)");
  // Pretul <=0 e LIPSA peste tot (pnl, echitate, lichidare), nu un pret real de 0.
  for(const t of d.data.tickers){const p=nr(t.close);harta[t.symbol]=p!==null&&p>0?p:null}
  return harta;
}

// v100.13 (el, 29.09: botul PUMPFUN fara preturi in Tablou): baza botului NU e mereu numele tickerului - Pionex numeste botul
// "PUMPFUN.PERP", tickerul e PUMP_USDT_PERP (17 monede asa: 1INCH<-INCH, 0G<-ZEROG, NEIRO<-NEIROCTO...). Legatura oficiala =
// baseCurrency din lista de simboluri PERP; tinuta 6 ore (lista se schimba rar). Picata -> regula veche, motivul in probleme.
const SIMBOLURI_TTL=6*3600*1000;
let simboluriTinute={la:0,harta:null};
async function hartaSimboluri(){
  if(simboluriTinute.harta&&Date.now()-simboluriTinute.la<SIMBOLURI_TTL)return simboluriTinute.harta;
  const r=await fetch(`${PIONEX}/api/v1/common/symbols?type=PERP`,{headers:{accept:"application/json"},signal:AbortSignal.timeout(TIMEOUT_MS)});
  if(!r.ok)throw Error(`simboluri PERP: HTTP ${r.status}`);
  const d=await r.json();
  if(!Array.isArray(d?.data?.symbols))throw Error("simboluri PERP: forma necunoscuta (data.symbols nu e o lista)");
  const harta={};
  for(const x of d.data.symbols)if(x&&x.symbol&&x.baseCurrency&&x.quoteCurrency)harta[`${x.baseCurrency}.PERP|${x.quoteCurrency}`]=String(x.symbol);
  simboluriTinute={la:Date.now(),harta};
  return harta;
}

// "XYZ.PERP" + "USDT" -> "XYZ_USDT_PERP", cum se cheama la tickere (daca lista Pionex nu spune altceva)
function simbolTicker(base,quote,harta){
  const b=String(base||""),real=harta&&harta[`${b}|${quote}`];
  if(real)return real;
  return b.endsWith(".PERP")?`${b.slice(0,-5)}_${quote}_PERP`:`${b}_${quote}`;
}

// Lichidarea relevanta: distanta SEMNATA cea mai mica dintre partile existente (>0).
// "0" de la Pionex inseamna "nu exista". Negativa = depasita.
function lichidare(pret,lichJos,lichSus,directie){
  const parti=[];
  if(lichJos!==null&&lichJos>0)parti.push({partea:"jos",pret:lichJos,dist:pret?100*(pret-lichJos)/pret:null});
  if(lichSus!==null&&lichSus>0)parti.push({partea:"sus",pret:lichSus,dist:pret?100*(lichSus-pret)/pret:null});
  if(!parti.length)return {pretLichidare:null,lichidarePartea:null,distantaLichidarePct:null,lichidareDepasita:false,
    ...(pret?{}:{motivFaraDistanta:"fara-pret"})};
  if(!pret){
    // Fara pret nu se poate spune care parte e mai aproape; se alege dupa directie.
    const p=parti.length===1?parti[0]:parti.find(x=>x.partea===(directie==="short"?"sus":directie==="long"?"jos":""))||null;
    return {pretLichidare:p?.pret??null,lichidarePartea:p?.partea??null,distantaLichidarePct:null,lichidareDepasita:false,motivFaraDistanta:"fara-pret"};
  }
  const p=parti.reduce((a,b)=>b.dist<a.dist?b:a);
  return {pretLichidare:p.pret,lichidarePartea:p.partea,distantaLichidarePct:Math.round(p.dist*100)/100,lichidareDepasita:p.dist<0};
}

function normalizeaza(bot,preturi,harta){
  const x=bot.buOrderData||{};
  const jos=nr(x.bottom),sus=nr(x.top);
  const simbolPionex=simbolTicker(bot.base,bot.quote,harta);
  const pret=preturi[simbolPionex]??null;
  const lichJos=nr(x.estimateLiquidationPriceDown),lichSus=nr(x.estimateLiquidationPriceUp);
  const directie=x.trend||x.gridType||null,dir=String(directie||"").toLowerCase();

  // BANI (contractul): profitRealizatBrut e fara comisioane/finantare; profitNet e
  // cel realizat NET. Identitatea dovedita pe contul real:
  //   usdtInvestment + totalRealizedProfit + totalFee + totalFundingFee = marginBalance
  const investit=nr(x.usdtInvestment)??nr(x.initUsdtInvestment);
  const margine=nr(x.marginBalance);
  const profitRealizatBrut=nr(x.totalRealizedProfit),comisioane=nr(x.totalFee),finantare=nr(x.totalFundingFee);
  const gridProfitBrut=nr(x.gridProfit);
  const profitNet=toate(margine,investit)?margine-investit
    :toate(profitRealizatBrut,comisioane,finantare)?profitRealizatBrut+comisioane+finantare:null;
  const pozitie=nr(x.position),pretDeschidere=nr(x.positionOpenPrice);
  const esteLong=dir==="long",esteShort=dir==="short";
  let pnlNerealizat=null;
  if(toate(pozitie,pretDeschidere,pret)){
    pnlNerealizat=esteLong||esteShort?Math.abs(pozitie)*(pret-pretDeschidere)*(esteLong?1:-1):pozitie*(pret-pretDeschidere);
  }
  const echitate=toate(margine,pnlNerealizat)?margine+pnlNerealizat:null;
  const profitTotal=toate(echitate,investit)?echitate-investit:null;
  const lich=lichidare(pret,lichJos,lichSus,dir);

  // v91.1: stopLossEnabled/stopProfitEnabled vin false si cand SL/TP sunt puse si active in Pionex (botul VVV, 25.09):
  // pretul pus = opritor pus. "STINS" era o citire gresita a campului.
  const opritorProfitActiv=!!x.stopProfitEnabled||!!nr(x.profitStop),opritorPierdereActiv=!!x.stopLossEnabled||!!nr(x.lossStop);
  // v97.5 (27.09, botul ICP): opritorul poate veni ca RAPORT din investitie (lossStopType/profitStopType="profit_ratio",
  // ex. lossStop=-0.0295 = -2,95%), nu ca pret. Se transforma in pretul la care totalul atinge raportul
  // (total(X) = profitNet + pnl(X) = r * investit), ca restul aplicatiei sa lucreze tot cu preturi; raportul ramane alaturi.
  const pretDinRaport=r=>{if(r===null||!toate(investit,profitNet,pozitie,pretDeschidere)||!(Math.abs(pozitie)>0)||!(esteLong||esteShort))return null;
    const X=pretDeschidere+(esteLong?1:-1)*(r*investit-profitNet)/Math.abs(pozitie);return X>0?X:null};
  const tipPierdere=x.lossStopType==="profit_ratio"?"raport":x.lossStopType==="price"?"pret":null,tipProfit=x.profitStopType==="profit_ratio"?"raport":x.profitStopType==="price"?"pret":null;
  const opPierdere=tipPierdere==="raport"?pretDinRaport(nr(x.lossStop)):nr(x.lossStop),opProfit=tipProfit==="raport"?pretDinRaport(nr(x.profitStop)):nr(x.profitStop);
  // v100.62: avertismentele intr-o functie pura (functions/_shared/avertismente.js) - le verifica garda textelor
  const avertismente=avertismenteBot({x,pret,jos,sus,lich,comisioane,gridProfitBrut,profitNet});

  return {
    id:String(bot.strategyId??bot.buOrderId??""),
    simbol:`${bot.base}/${bot.quote}`,
    baza:bot.base,quote:bot.quote,
    stare:bot.status,stareInterna:x.status||null,
    activ:String(x.status||bot.status||"").toLowerCase()==="running",
    pornitLa:nr(bot.createTime),
    inchisLa:nr(bot.closeTime),

    // BANI. gridProfitBrut e cifra de titlu pe care o arata Pionex si care
    // induce in eroare singura.
    investit,
    margine,
    profitNet,
    profitRealizatBrut,
    gridProfitBrut,
    comisioane,
    finantare,
    pnlNerealizat,
    // false DOAR la neutru (semnul pozitiei e luat asa cum vine); fara pnl nu se spune nimic.
    pnlNerealizatSigur:esteLong||esteShort?(pnlNerealizat!==null?true:null):false,
    echitate,
    profitTotal,
    volum:nr(x.totalVolume),
    ordinePlasate:nr(x.placedExchangeOrderCount),
    ordinePerechi:nr(x.exchangeOrderPairedCount),

    // RISC
    levier:nr(x.leverage),
    directie,
    pozitie,
    pretDeschidere,
    pretCurent:pret,
    // v100.13: tickerul real (PUMP_USDT_PERP pentru baza PUMPFUN.PERP) - dupa el cer paginile lumanarile si pretul live
    simbolPionex,
    gridJos:jos,gridSus:sus,
    lichidareJos:lichJos,lichidareSus:lichSus,
    ...lich,
    stareRisc:x.riskStatus||null,
    stareMargine:x.marginStatus||null,
    opritorProfit:opProfit,opritorProfitActiv,opritorProfitTip:tipProfit,opritorProfitRaport:tipProfit==="raport"?nr(x.profitStop):null,
    opritorPierdere:opPierdere,opritorPierdereActiv,opritorPierdereTip:tipPierdere,opritorPierdereRaport:tipPierdere==="raport"?nr(x.lossStop):null,
    // v97.5: de ce s-a inchis (user_cancel / loss_stop / profit_stop / ...) - pentru fisa de inchidere
    motivInchidere:typeof x.reasonBy==="string"?x.reasonBy.replace(/[^a-z_]/gi,"").slice(0,30):null,

    avertismente,

    // Forma bruta de la Pionex, neatinsa - modulul pur TabloBot are nevoie
    // de buOrderData, createTime si strategyId asa cum le trimite exchange-ul,
    // nu de campurile renumite/rotunjite de mai sus.
    brut:bot,
  };
}

export async function onRequestGet({request,env}){
  // v100.25: brut=1 (colectorul, pagina cu pagina prin istorie) are limita lui, ca sa nu manance din cea a paginii
  const brutCerut=new URL(request.url).searchParams.get("brut")==="1";
  const auth=await requireApiAuth(request,env,brutCerut?"bot-orders-arhiva":"bot-orders",brutCerut?40:30);
  if(!auth.ok)return authErrorResponse(auth,H);
  if(!(env.PIONEX_API_KEY&&env.PIONEX_API_SECRET))
    return json({error:"Cheile PIONEX_API_KEY / PIONEX_API_SECRET nu sunt configurate."},503);

  const u=new URL(request.url);
  const stare=u.searchParams.get("status");
  const params={limit:Math.min(100,Math.max(1,Number(u.searchParams.get("limit"))||100))};
  // Pionex vrea starea cu litere MICI pentru istoric (verificat 24.09: status=finished da botii inchisi;
  // CLOSED/FINISHED cu majuscule sunt ignorate tacut si vine doar botul care ruleaza).
  if(stare&&/^[A-Za-z_]{3,20}$/.test(stare))params.status=stare.toLowerCase();
  const tok=u.searchParams.get("pageToken");if(tok&&/^[A-Za-z0-9]{1,64}$/.test(tok))params.pageToken=tok;

  const probleme={};
  let brute,next=null;
  try{({results:brute,next}=await citesteBoti(env,params))}
  catch(e){
    const corp={error:e.message};
    if(e.motiv)corp.motiv=e.motiv;
    if(e.status===403)corp.deBifat="Bot reading";
    if(e.retryAfter)corp.retryAfter=e.retryAfter;
    return json(corp,e.status||502,e.retryAfter?{"retry-after":String(e.retryAfter)}:{});
  }

  if(brutCerut)return json({citit:Date.now(),bots:brute,nextPageToken:next});

  let preturi={},harta=null;
  await Promise.all([
    preturiPerp().then(p=>{preturi=p}).catch(e=>{probleme.preturi=String(e.message).slice(0,140)}),
    hartaSimboluri().then(h=>{harta=h}).catch(e=>{probleme.simboluri=String(e.message).slice(0,140)}),
  ]);

  const bots=brute.map(b=>normalizeaza(b,preturi,harta));
  // Un total cu un termen lipsa e LIPSA, nu o suma mai mica: se spune ce lipseste.
  const incomplete=[];
  const suma=(camp,numeTotal)=>{
    if(bots.some(b=>b[camp]===null)){incomplete.push(numeTotal);return null}
    return bots.reduce((t,b)=>t+b[camp],0);
  };
  const raspuns={
    citit:Date.now(),
    bots,
    nextPageToken:next,
    sumar:{
      numar:bots.length,
      active:bots.filter(b=>b.activ).length,
      investitTotal:suma("investit","investitTotal"),
      profitNetTotal:suma("profitNet","profitNetTotal"),
      gridProfitBrutTotal:suma("gridProfitBrut","gridProfitBrutTotal"),
      comisioaneTotal:suma("comisioane","comisioaneTotal"),
      avertismente:bots.reduce((t,b)=>t+b.avertismente.length,0),
    },
  };
  if(incomplete.length)probleme.sumarIncomplet=incomplete;
  if(Object.keys(probleme).length)raspuns.probleme=probleme;
  return json(raspuns);
}
