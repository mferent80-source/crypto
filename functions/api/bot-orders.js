import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";

// Cititul botilor de grid Pionex. STRICT READ-ONLY: singura ruta atinsa e
// GET /api/v1/bot/orders. Nimic din API-ul de boti care schimba ceva nu apare aici.
//
// De ce exista: jurnalul v71 citeste doar tranzactii spot. Banii pot sta intr-un
// bot de grid pe perpetue, invizibil si pentru spot, si pentru futures - si
// nici macar in soldul obisnuit, fiindca Pionex ii tine in bot.

const PIONEX="https://api.pionex.com";
const H={"content-type":"application/json","cache-control":"no-store"};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
const enc=new TextEncoder();

async function hmacHex(secret,mesaj){
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,enc.encode(mesaj));
  return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
const sortedQuery=p=>Object.keys(p).sort().map(k=>`${k}=${p[k]}`).join("&");
const nr=v=>{const x=Number(v);return Number.isFinite(x)?x:null};

async function citesteBoti(env,params={}){
  const all={...params,timestamp:Date.now()},query=sortedQuery(all);
  const semnatura=await hmacHex(env.PIONEX_API_SECRET,`GET/api/v1/bot/orders?${query}`);
  const r=await fetch(`${PIONEX}/api/v1/bot/orders?${query}`,{headers:{
    "accept":"application/json",
    "PIONEX-KEY":env.PIONEX_API_KEY,
    "PIONEX-SIGNATURE":semnatura
  }});
  const brut=await r.text();let d=null;try{d=JSON.parse(brut)}catch{}

  // 🔑 Pionex raspunde cu HTTP 200 chiar si cand refuza. Daca ne-am uita doar la
  // codul de stare, o cheie fara dreptul "Bot reading" ar arata ca "zero boti" -
  // exact esecul tacit pe care ruta asta il vaneaza.
  if(d&&d.result===false){
    const cod=String(d.code||"");
    if(/PERMISSION/i.test(cod))throw Object.assign(
      Error("Cheia Pionex nu are dreptul „Bot reading”. Bifează-l în Pionex › API Management (e doar citire) sau fă o cheie nouă cu el."),
      {status:403});
    throw Object.assign(Error(`Pionex bot API: ${d.message||cod||"refuz"}`),{status:502});
  }
  if(!r.ok)throw Object.assign(Error(`Pionex bot API: HTTP ${r.status}`),{status:r.status>=400?r.status:502});
  return d?.data?.results||[];
}

// Preturile perpetuelor, ca sa putem spune cat mai e pana la lichidare.
// Daca nu se poate, botii tot se intorc - lipsa se raporteaza, nu se ascunde.
async function preturiPerp(){
  const r=await fetch(`${PIONEX}/api/v1/market/tickers?type=PERP`,{headers:{accept:"application/json"}});
  if(!r.ok)throw Error(`tickere PERP: HTTP ${r.status}`);
  const d=await r.json();
  const harta={};
  for(const t of d?.data?.tickers||[])harta[t.symbol]=nr(t.close);
  return harta;
}

// "COTI.PERP" + "USDT" -> "COTI_USDT_PERP", cum se cheama la tickere
function simbolTicker(base,quote){
  const b=String(base||"");
  return b.endsWith(".PERP")?`${b.slice(0,-5)}_${quote}_PERP`:`${b}_${quote}`;
}

function normalizeaza(bot,preturi){
  const x=bot.buOrderData||{};
  const jos=nr(x.bottom),sus=nr(x.top);
  const pret=preturi[simbolTicker(bot.base,bot.quote)]??null;
  const lichJos=nr(x.estimateLiquidationPriceDown),lichSus=nr(x.estimateLiquidationPriceUp);

  let distanta=null;
  if(pret&&lichJos&&lichJos>0&&pret>lichJos)distanta=100*(pret-lichJos)/pret;
  else if(pret&&lichSus&&lichSus>0&&lichSus>pret)distanta=100*(lichSus-pret)/pret;

  const opritorProfitActiv=!!x.stopProfitEnabled,opritorPierdereActiv=!!x.stopLossEnabled;
  const avertismente=[];
  if(nr(x.profitStop)&&!opritorProfitActiv)avertismente.push("Opritorul pe profit e setat dar STINS — nu se va declanșa.");
  if(nr(x.lossStop)&&!opritorPierdereActiv)avertismente.push("Opritorul pe pierdere e setat dar STINS — nu se va declanșa.");
  if(!nr(x.profitStop)&&!nr(x.lossStop))avertismente.push("Botul nu are niciun opritor configurat.");
  if(pret&&jos&&sus&&(pret<jos||pret>sus))
    avertismente.push(`Prețul ${pret} a ieșit din intervalul grid (${jos}…${sus}) — botul nu mai câștigă din oscilații.`);
  if(distanta!==null&&distanta<15)
    avertismente.push(`Până la lichidare mai sunt ${distanta.toFixed(1)}%.`);
  const net=nr(x.totalRealizedProfit),brut=nr(x.gridProfit);
  if(net!==null&&brut!==null&&brut>0&&net<0)
    avertismente.push("Profitul din grid e pozitiv, dar cel NET e negativ — comisioanele mănâncă mai mult decât câștigă botul.");

  return {
    id:String(bot.strategyId??bot.buOrderId??""),
    simbol:`${bot.base}/${bot.quote}`,
    baza:bot.base,quote:bot.quote,
    stare:bot.status,stareInterna:x.status||null,
    activ:String(x.status||bot.status||"").toLowerCase()==="running",
    pornitLa:nr(bot.createTime)||0,
    inchisLa:nr(bot.closeTime),

    // BANI. profitNet e cel REAL (dupa comisioane); gridProfitBrut e cifra de
    // titlu pe care o arata Pionex si care induce in eroare singura.
    investit:nr(x.usdtInvestment)??nr(x.initUsdtInvestment),
    margine:nr(x.marginBalance),
    profitNet:net,
    gridProfitBrut:brut,
    comisioane:nr(x.totalFee),
    finantare:nr(x.totalFundingFee),
    volum:nr(x.totalVolume),
    ordinePlasate:nr(x.placedExchangeOrderCount),
    ordinePerechi:nr(x.exchangeOrderPairedCount),

    // RISC
    levier:nr(x.leverage),
    directie:x.trend||x.gridType||null,
    pozitie:nr(x.position),
    pretDeschidere:nr(x.positionOpenPrice),
    pretCurent:pret,
    gridJos:jos,gridSus:sus,
    lichidareJos:lichJos,lichidareSus:lichSus,
    distantaLichidarePct:distanta===null?null:Math.round(distanta*100)/100,
    stareRisc:x.riskStatus||null,
    stareMargine:x.marginStatus||null,
    opritorProfit:nr(x.profitStop),opritorProfitActiv,
    opritorPierdere:nr(x.lossStop),opritorPierdereActiv,

    avertismente,
  };
}

export async function onRequestGet({request,env}){
  const auth=await requireApiAuth(request,env,"bot-orders",30);
  if(!auth.ok)return authErrorResponse(auth,H);
  if(!(env.PIONEX_API_KEY&&env.PIONEX_API_SECRET))
    return json({error:"Cheile PIONEX_API_KEY / PIONEX_API_SECRET nu sunt configurate."},503);

  const u=new URL(request.url);
  const stare=u.searchParams.get("status");
  const params={limit:Math.min(100,Math.max(1,Number(u.searchParams.get("limit"))||100))};
  if(stare&&/^[A-Z_]{3,20}$/.test(stare))params.status=stare;

  const probleme={};
  let brute;
  try{brute=await citesteBoti(env,params)}
  catch(e){
    const corp={error:e.message};
    if(e.status===403)corp.deBifat="Bot reading";
    return json(corp,e.status||502);
  }

  let preturi={};
  try{preturi=await preturiPerp()}
  catch(e){probleme.preturi=String(e.message).slice(0,140)}

  const bots=brute.map(b=>normalizeaza(b,preturi));
  const suma=(camp)=>bots.reduce((t,b)=>t+(b[camp]||0),0);
  const raspuns={
    citit:Date.now(),
    bots,
    sumar:{
      numar:bots.length,
      active:bots.filter(b=>b.activ).length,
      investitTotal:suma("investit"),
      profitNetTotal:suma("profitNet"),
      gridProfitBrutTotal:suma("gridProfitBrut"),
      comisioaneTotal:suma("comisioane"),
      avertismente:bots.reduce((t,b)=>t+b.avertismente.length,0),
    },
  };
  if(Object.keys(probleme).length)raspuns.probleme=probleme;
  return json(raspuns);
}
