import { VERSIUNE } from "../_shared/versiune.js";
import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
import {dupaCelDinFata,abandonata,eroareAbandon} from "../_shared/poarta.js";
import {lacatRamasMs,lacatDinRaspuns,eroareLacat} from "../_shared/lacat-pionex.js";   // audit 19.10: lacatul comun cu poarta privata
const FUT="https://fapi.binance.com";
const PIONEX="https://api.pionex.com";
let pionexGate=Promise.resolve(),pionexNextAt=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function reservePionexGlobal(env,spacing){
  if(!env?.DB?.prepare)return 0;try{const now=Date.now(),stmt=env.DB.prepare(`INSERT INTO monitor_state(key,value,updated_ts) VALUES('pionex_pages_next_at',?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(MAX(CAST(monitor_state.value AS INTEGER), ?)+? AS TEXT), updated_ts=? RETURNING value`).bind(String(now+spacing),now,now,spacing,now),r=await stmt.first(),next=Number(r?.value);return Number.isFinite(next)?Math.max(0,(next-spacing)-now):0}catch{return 0}
}
async function pionexRateGate(weight,fn,env,semnal=null){
  const intrat=Date.now();   // v100.259 (punctul 9): cererea abandonată cât stă la rând nu mai pleacă
  // v91.7: cererea din fata e asteptata cel mult cat poate dura ea (pauza + 8 s de fetch + marja) - _shared/poarta.js
  const run=dupaCelDinFata(pionexGate,12000).then(async()=>{
    if(abandonata(semnal,intrat))throw eroareAbandon();
    // audit 19.10: lacatul comun (si cel pus de poarta privata, din X-RateLimit-Lock) - nimic nu pleaca pana la deblocare
    if(lacatRamasMs())throw eroareLacat("upstream cooldown");
    const spacing=Math.max(1100,Math.max(1,weight)*300),globalDelay=await reservePionexGlobal(env,spacing),delay=Math.max(globalDelay,Math.max(0,pionexNextAt-Date.now()));
    if(delay)await wait(delay);
    if(abandonata(semnal,intrat))throw eroareAbandon();   // abandonată în pauza de ritm: nu pleacă și nu împinge ritmul celor de după
    pionexNextAt=Date.now()+spacing;
    return fn()
  });
  pionexGate=run.catch(()=>{});
  return run
}

const H={"content-type":"application/json;charset=UTF-8","cache-control":"no-store"};
const ok=x=>new Response(JSON.stringify(x),{headers:H});
const softFail=(error,detail,retryAfter=null)=>ok({result:false,error,detail,retryAfter});
// v100.259 (punctul 5): refuzul probei de ecran = 503 (ca rutele private), cu forma obișnuită a eșecului; restul = softFail ca înainte
const esec=(error,e)=>e&&e.proba?new Response(JSON.stringify({result:false,error,detail:e.message,retryAfter:null,proba:true}),{status:503,headers:H}):softFail(error,e.message,e.status===429?(e.retryAfter||60):null);
// limit nenumeric ("abc") -> valoarea implicita; altfel Math.max(1,NaN) trimitea "limit=NaN".
const limita=(u,implicit,min,max)=>{const x=Math.floor(Number(u.searchParams.get("limit")));return Number.isFinite(x)&&u.searchParams.get("limit")?Math.min(max,Math.max(min,x)):implicit};
async function j(url){
  const r=await fetch(url,{headers:{
    "accept":"application/json,text/plain,*/*",
    "accept-language":"en-US,en;q=0.9",
    "cache-control":"no-cache",
    "user-agent":"Mozilla/5.0 CryptoRadar/43"
  },signal:AbortSignal.timeout(8000)});
  const text=await r.text();let data=null;try{data=JSON.parse(text)}catch{}
  if(!r.ok){
    const retry=r.headers.get("retry-after");
    const e=Error("upstream HTTP "+r.status+(retry?" · retry-after "+retry:"")+(data?.msg?" · "+data.msg:""));
    e.status=r.status;e.retryAfter=retry?Number(retry):null;e.antete=r.headers;throw e   // audit 19.10: antetele, pentru x-ratelimit-lock
  }
  if(!data)throw Error("upstream invalid JSON");
  return data
}

async function pionexCached(url,ttl=30,env=null,opt={}){
  const cache=(globalThis.caches&&globalThis.caches.default)||null;
  const key=new Request(url,{method:"GET"});
  if(cache){
    const hit=await cache.match(key);
    if(hit){try{return await hit.json()}catch{}}
  }
  // v100.259 (auditul 23.10, punctul 5): proba de ecran (`x-proba-ecran: 1`) nu cheamă Pionex nici pe rutele PUBLICE - doar cache-ul de mai sus
  if(opt.proba)throw Object.assign(Error("probă de ecran: fără cereri către Pionex"),{status:503,proba:true});
  let data;
  try{data=await pionexRateGate(url.includes("/common/symbols")?5:1,()=>j(url),env,opt.semnal||null)}
  catch(e){if(e.status&&!e.abandonata)lacatDinRaspuns(e.antete,e.status,Math.max(75,e.retryAfter||60));throw e}   // audit 19.10: 429 ⇒ cel putin 75 s; x-ratelimit-lock ⇒ pana la ora lui
  // v100.173 (auditul Opus): Pionex refuză cu HTTP 200 + result:false - refuzul NU se ține minte (lista de simboluri goală stătea o oră)
  if(cache&&!(data&&data.result===false)){
    const res=new Response(JSON.stringify(data),{headers:{"content-type":"application/json","cache-control":`public, max-age=${ttl}`}});
    await cache.put(key,res).catch(()=>{})
  }
  return data
}
export async function onRequestGet({request,env}){
  const u=new URL(request.url),type=u.searchParams.get("type");
  if(type==="health")return ok({ok:true,service:"crypto-radar",version:VERSIUNE});
  // v92: 45 -> 120/min. Limita se numara pe IP: acasa, colectorul (clasamentul: ~32/min, 3 min pe ora) si browserul
  // au ACELASI IP (127.0.0.1) - o pagina deschisa in timpul clasamentului primea RATE_LIMITED. Pionex e ferit oricum
  // de pionexGate (o cerere la 1,1 s) si de racirea la 429.
  if(String(type||"").startsWith("pionex_")){const auth=await requireApiAuth(request,env,"pionex-public-proxy",120);if(!auth.ok)return authErrorResponse(auth,H)}
  const opt={proba:request.headers.get("x-proba-ecran")==="1",semnal:request.signal||null};   // v100.259 (punctele 5 și 9)
  if(type==="pionex_symbols"){
    const mk=String(u.searchParams.get("market")||"").toUpperCase()==="PERP"?"PERP":"SPOT";
    try{return ok(await pionexCached(`${PIONEX}/api/v1/common/symbols?type=${mk}`,3600,env,opt))}catch(e){return esec("Pionex symbols unavailable",e)}
  }
  if(type==="pionex_tickers"){
    const mk=String(u.searchParams.get("market")||"").toUpperCase()==="PERP"?"PERP":"SPOT";
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/tickers?type=${mk}`,30,env,opt))}catch(e){return esec("Pionex tickers unavailable",e)}
  }
  if(type==="pionex_klines"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,"");
    const pi=(u.searchParams.get("interval")||"4H").toUpperCase();
    const allowed=new Set(["1M","5M","15M","30M","60M","4H","8H","12H","1D"]);
    const interval=allowed.has(pi)?pi:"4H",limit=limita(u,300,1,500);
    // v78: endTime (ms) pentru paginarea in urma a lumanarilor; trimis doar cand e numar pozitiv.
    const etRaw=u.searchParams.get("endTime"),et=Math.floor(Number(etRaw));
    const endQ=etRaw&&Number.isFinite(et)&&et>0?`&endTime=${et}`:"";
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/klines?symbol=${encodeURIComponent(ps)}&interval=${encodeURIComponent(interval)}&limit=${limit}${endQ}`,interval==="1M"?45:interval==="15M"?45:interval==="60M"?90:interval==="4H"?180:300,env,opt))}catch(e){return esec("Pionex klines unavailable",e)}
  }
  if(type==="pionex_funding"){
    // v91.9: ratele de funding (ultimele 100, la 4 h la Pionex = ~16 zile) pentru "Mediul botului" din Tablou
    const ps=(u.searchParams.get("symbol")||"BTC_USDT_PERP").toUpperCase().replace(/[^A-Z0-9_]/g,"");
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/fundingRates?symbol=${encodeURIComponent(ps)}&limit=100`,300,env,opt))}catch(e){return esec("Pionex funding unavailable",e)}
  }
  if(type==="pionex_trades"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,""),limit=limita(u,500,10,500);
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/trades?symbol=${encodeURIComponent(ps)}&limit=${limit}`,5,env,opt))}catch(e){return esec("Pionex trades unavailable",e)}
  }
  if(type==="pionex_depth"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,""),limit=limita(u,100,1,1000);
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/depth?symbol=${encodeURIComponent(ps)}&limit=${limit}`,5,env,opt))}catch(e){return esec("Pionex depth unavailable",e)}
  }
  if(type!=="futures")return new Response(JSON.stringify({error:"Spot data is fetched directly by the browser"}),{status:400,headers:H});
  // futures trage 5 cereri Binance pe fiecare apel: fara autentificare, oricine putea folosi serverul ca proxy.
  {const auth=await requireApiAuth(request,env,"market-futures",60);if(!auth.ok)return authErrorResponse(auth,H)}
  // revizia 29.10: tăiat la 30 de caractere (cel mai lung contract Binance are ~15), ca memoria „fără contract” să nu crească cu șiruri lungi
  const cerut=(u.searchParams.get("symbol")||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,30);
  // v100.264: moneda fără contract perpetuu pe Binance (ținută minte 6 h) nu mai bate Binance de 5 ori la fiecare analiză
  if((faraContractPana.get(cerut)||0)>Date.now())return ok({funding:null,openInterest:null,longShort:null,oiHist5m:null,fundingHist:null,simbol:simbolInMii(cerut),faraContract:true});
  let symbol=simbolInMii(cerut),r=await cereFutures(symbol);
  // v100.264: „Invalid symbol” ⇒ poate stă în mii pe Binance (o listare nouă, ca 1000PEPE) - se caută o dată în lista contractelor
  if(r.invalid){const alt=await gasesteInMii(cerut);if(alt&&alt!==symbol){symbol=alt;r=await cereFutures(alt)}}
  if(r.invalid){if(faraContractPana.size>500)for(const [k,t] of faraContractPana)if(t<=Date.now())faraContractPana.delete(k);faraContractPana.set(cerut,Date.now()+6*3600000);return ok({funding:null,openInterest:null,longShort:null,oiHist5m:null,fundingHist:null,simbol:symbol,faraContract:true,probleme:r.probleme})}
  const raspuns={funding:r.funding,openInterest:r.openInterest,longShort:r.longShort,oiHist5m:r.oiHist5m,fundingHist:r.fundingHist,
    simbol:symbol,markPrice:r.markPrice,indexPrice:r.indexPrice,nextFundingTime:r.nextFundingTime,
    // v100.265 (F2): intervalul OFICIAL (/fapi/v1/fundingInfo) bate cel din plăți - după o schimbare de interval, plățile vechi mint câteva ore
    fundingIntervalHours:r.oreOficial||intervalFunding(r.fundingHist),fundingIntervalSursa:r.oreOficial?"binance":intervalFunding(r.fundingHist)?"plati":null,
    oiUsd:r.openInterest!=null&&r.markPrice>0?r.openInterest*r.markPrice:null,lsIst:r.lsIst,
    topLs:r.topLs,topIst:r.topIst,takerIst:r.takerIst};   // v100.265 (F4): conturile mari pe poziții + cumpărătorii agresivi, ~500 h
  if(Object.keys(r.probleme).length)raspuns.probleme=r.probleme;
  return ok(raspuns);
}
// v100.264 (29.10): pe Binance unele monede stau în mii (1000PEPEUSDT) sau în milioane (1000000MOGUSDT, 1MBABYDOGEUSDT).
// Harta fixă acoperă ce era listat pe 29.10; o listare nouă se găsește din /fapi/v1/ticker/price (ținută minte 6 h).
const IN_MII={PEPE:"1000PEPE",SHIB:"1000SHIB",BONK:"1000BONK",FLOKI:"1000FLOKI",LUNC:"1000LUNC",XEC:"1000XEC",SATS:"1000SATS",RATS:"1000RATS",CAT:"1000CAT",CHEEMS:"1000CHEEMS",WHY:"1000WHY",MOG:"1000000MOG",BABYDOGE:"1MBABYDOGE"};
const faraContractPana=new Map();let listaFut=null,listaFutLa=0;
// v100.265 (F2): lista oficială a intervalelor de funding (simbol → ore), cerută o dată la 6 h; un refuz nu e o problemă a datelor
let infoFut=null,infoFutLa=0;
async function oreOficiale(symbol){
  if(!infoFut||Date.now()-infoFutLa>6*3600000){
    try{const x=await j(`${FUT}/fapi/v1/fundingInfo`);if(Array.isArray(x)){infoFut=new Map(x.map(t=>[String(t&&t.symbol||""),Number(t&&t.fundingIntervalHours)]));infoFutLa=Date.now()}}catch{return null}
  }
  const o=infoFut&&infoFut.get(symbol);return o>=1&&o<=24?o:null
}
function simbolInMii(s){const b=s.replace(/USDT$/,"");return s.endsWith("USDT")&&IN_MII[b]?IN_MII[b]+"USDT":s}
async function gasesteInMii(cerut){
  if(!cerut.endsWith("USDT"))return null;
  if(!listaFut||Date.now()-listaFutLa>6*3600000){try{const x=await j(`${FUT}/fapi/v1/ticker/price`);if(Array.isArray(x)){listaFut=new Set(x.map(t=>String(t&&t.symbol||"")));listaFutLa=Date.now()}}catch{return null}}
  if(!listaFut)return null;
  const b=cerut.replace(/USDT$/,"");return ["1000","1000000","1M","10000","100000"].map(p=>p+b+"USDT").find(s=>listaFut.has(s))||null
}
// intervalul de plată (ore) din orele ultimelor plăți - cel mai mic din ultimele 3 diferențe (ca FuturesCitire.interval din pagină)
function intervalFunding(h){
  if(!Array.isArray(h)||h.length<2)return null;let min=null;
  for(let i=h.length-1;i>0&&i>=h.length-3;i--){const a=Number(h[i-1]?.fundingTime),b=Number(h[i]?.fundingTime);if(Number.isFinite(a)&&Number.isFinite(b)&&b>a&&(min===null||b-a<min))min=b-a}
  const ore=min===null?null:Math.round(min/3600000);return ore>=1&&ore<=24?ore:null
}
// Binance refuza cererile venite de pe Cloudflare (403 masurat 22.09). Pana acum
// fiecare apel avea catch GOL, deci valorile se intorceau null in tacere si pe
// ecran apareau casute goale. Acum motivul calatoreste cu raspunsul.
// v100.264: cele cinci cereri pleacă DEODATĂ (înainte una după alta: de 5 ori așteptarea, până la 5 × 8 s);
// raportul long/short vine cu ~500 h de istoric (pagina îl judecă față de moneda lui); premiumIndex dă și markPrice / ora plății.
async function cereFutures(symbol){
  const r={funding:null,openInterest:null,longShort:null,oiHist5m:null,fundingHist:null,markPrice:null,indexPrice:null,nextFundingTime:null,lsIst:null,topLs:null,topIst:null,takerIst:null,oreOficial:null,probleme:{}};
  const incearca=async(nume,fn)=>{try{await fn()}catch(e){r.probleme[nume]=String(e&&e.message||e).slice(0,140)}};
  const numar=v=>{const x=Number(v);return v!=null&&v!==""&&Number.isFinite(x)?x:null};
  await Promise.all([
    incearca("funding",async()=>{const x=await j(`${FUT}/fapi/v1/premiumIndex?symbol=${symbol}`);r.funding=Number(x.lastFundingRate);r.markPrice=numar(x.markPrice);r.indexPrice=numar(x.indexPrice);r.nextFundingTime=numar(x.nextFundingTime)}),
    incearca("openInterest",async()=>{const x=await j(`${FUT}/fapi/v1/openInterest?symbol=${symbol}`);r.openInterest=Number(x.openInterest)}),
    incearca("longShort",async()=>{const x=await j(`${FUT}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=500`);if(Array.isArray(x)&&x.length){r.longShort=Number(x[x.length-1].longShortRatio);r.lsIst=x.map(t=>[numar(t&&t.timestamp),numar(t&&t.longShortRatio)]).filter(t=>t[1]!==null)}}),
    incearca("oiHist5m",async()=>{r.oiHist5m=await j(`${FUT}/futures/data/openInterestHist?symbol=${symbol}&period=5m&limit=289`)}),
    incearca("fundingHist",async()=>{r.fundingHist=await j(`${FUT}/fapi/v1/fundingRate?symbol=${symbol}&limit=30`)}),
    // v100.265 (F4): conturile mari pe POZIȚII și cumpărătorii agresivi (taker) - informație, nu intră în votul „înghesuit”
    incearca("topLs",async()=>{const x=await j(`${FUT}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=1h&limit=500`);if(Array.isArray(x)&&x.length){r.topLs=Number(x[x.length-1].longShortRatio);r.topIst=x.map(t=>[numar(t&&t.timestamp),numar(t&&t.longShortRatio)]).filter(t=>t[1]!==null)}}),
    incearca("taker",async()=>{const x=await j(`${FUT}/futures/data/takerlongshortRatio?symbol=${symbol}&period=1h&limit=500`);if(Array.isArray(x))r.takerIst=x.map(t=>[numar(t&&t.timestamp),numar(t&&t.buyVol),numar(t&&t.sellVol)]).filter(t=>t[1]!==null&&t[2]!==null)}),
    oreOficiale(symbol).then(o=>{r.oreOficial=o},()=>{})
  ]);
  const invalid=m=>/HTTP 400\b.*Invalid symbol/i.test(String(m||""));
  r.invalid=invalid(r.probleme.funding)&&invalid(r.probleme.openInterest);
  return r
}