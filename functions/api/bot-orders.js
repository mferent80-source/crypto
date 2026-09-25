import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
import {PIONEX,TIMEOUT_MS,pionexPrivatGet} from "../_shared/pionex.js";

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
  if(d.data&&d.data.results===null)return [];
  if(!Array.isArray(d.data?.results))throw Object.assign(Error("Pionex bot API: data.results nu e o lista"),{status:502,motiv:"forma-necunoscuta"});
  return d.data.results;
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

// "XYZ.PERP" + "USDT" -> "XYZ_USDT_PERP", cum se cheama la tickere
function simbolTicker(base,quote){
  const b=String(base||"");
  return b.endsWith(".PERP")?`${b.slice(0,-5)}_${quote}_PERP`:`${b}_${quote}`;
}
const ban=v=>{const a=Math.abs(v);return a.toFixed(a>0&&a<0.01?4:2)};
const semn=v=>(v<0?"−":"+")+ban(v);

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

function normalizeaza(bot,preturi){
  const x=bot.buOrderData||{};
  const jos=nr(x.bottom),sus=nr(x.top);
  const pret=preturi[simbolTicker(bot.base,bot.quote)]??null;
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

  const opritorProfitActiv=!!x.stopProfitEnabled,opritorPierdereActiv=!!x.stopLossEnabled;
  const avertismente=[];
  if(nr(x.profitStop)&&!opritorProfitActiv)avertismente.push("Opritorul pe profit e setat dar STINS — nu se va declanșa.");
  if(nr(x.lossStop)&&!opritorPierdereActiv)avertismente.push("Opritorul pe pierdere e setat dar STINS — nu se va declanșa.");
  if(!nr(x.profitStop)&&!nr(x.lossStop))avertismente.push("Botul nu are niciun opritor configurat.");
  if(pret&&jos&&sus&&(pret<jos||pret>sus))
    avertismente.push(`Prețul ${pret} a ieșit din intervalul grid (${jos}…${sus}) — botul nu mai câștigă din oscilații.`);
  if(lich.lichidareDepasita)
    avertismente.push(`Lichidarea DEPĂȘITĂ: prețul ${pret} a trecut de lichidarea estimată ${lich.pretLichidare} (partea de ${lich.lichidarePartea}) — verifică botul în Pionex.`);
  else if(lich.distantaLichidarePct!==null&&lich.distantaLichidarePct<15)
    avertismente.push(`Până la lichidare (${lich.lichidarePartea}, la ${lich.pretLichidare}) mai sunt ${lich.distantaLichidarePct.toFixed(1)}%.`);
  // Comisioanele sunt de vina DOAR cand chiar depasesc castigul din grid.
  if(toate(comisioane,gridProfitBrut)&&comisioane!==0&&Math.abs(comisioane)>gridProfitBrut)
    avertismente.push(`Gridul a câștigat ${semn(gridProfitBrut)}, comisioanele au luat ${semn(comisioane)} — comisioanele mănâncă mai mult decât câștigă botul.`);
  else if(profitNet!==null&&profitNet<0&&gridProfitBrut!==null&&gridProfitBrut>0){
    const rest=comisioane!==null?profitNet-gridProfitBrut-comisioane:null;
    avertismente.push(`Profitul NET e negativ deși gridul câștigă: grid ${semn(gridProfitBrut)}, comisioane ${comisioane!==null?semn(comisioane):"necunoscute"}`+
      (rest!==null?`, restul ${semn(rest)} din poziție/finanțare.`:"."));
  }

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
    gridJos:jos,gridSus:sus,
    lichidareJos:lichJos,lichidareSus:lichSus,
    ...lich,
    stareRisc:x.riskStatus||null,
    stareMargine:x.marginStatus||null,
    opritorProfit:nr(x.profitStop),opritorProfitActiv,
    opritorPierdere:nr(x.lossStop),opritorPierdereActiv,

    avertismente,

    // Forma bruta de la Pionex, neatinsa - modulul pur TabloBot are nevoie
    // de buOrderData, createTime si strategyId asa cum le trimite exchange-ul,
    // nu de campurile renumite/rotunjite de mai sus.
    brut:bot,
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
  // Pionex vrea starea cu litere MICI pentru istoric (verificat 24.09: status=finished da botii inchisi;
  // CLOSED/FINISHED cu majuscule sunt ignorate tacut si vine doar botul care ruleaza).
  if(stare&&/^[A-Za-z_]{3,20}$/.test(stare))params.status=stare.toLowerCase();

  const probleme={};
  let brute;
  try{brute=await citesteBoti(env,params)}
  catch(e){
    const corp={error:e.message};
    if(e.motiv)corp.motiv=e.motiv;
    if(e.status===403)corp.deBifat="Bot reading";
    if(e.retryAfter)corp.retryAfter=e.retryAfter;
    return json(corp,e.status||502,e.retryAfter?{"retry-after":String(e.retryAfter)}:{});
  }

  let preturi={};
  try{preturi=await preturiPerp()}
  catch(e){probleme.preturi=String(e.message).slice(0,140)}

  const bots=brute.map(b=>normalizeaza(b,preturi));
  // Un total cu un termen lipsa e LIPSA, nu o suma mai mica: se spune ce lipseste.
  const incomplete=[];
  const suma=(camp,numeTotal)=>{
    if(bots.some(b=>b[camp]===null)){incomplete.push(numeTotal);return null}
    return bots.reduce((t,b)=>t+b[camp],0);
  };
  const raspuns={
    citit:Date.now(),
    bots,
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
