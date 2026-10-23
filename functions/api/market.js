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
  const symbol=(u.searchParams.get("symbol")||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
  let funding=null,openInterest=null,longShort=null,oiHist5m=null,fundingHist=null;
  // Binance refuza cererile venite de pe Cloudflare (403 masurat 22.09). Pana acum
  // fiecare apel avea catch GOL, deci valorile se intorceau null in tacere si pe
  // ecran apareau casute goale. Acum motivul calatoreste cu raspunsul.
  const probleme={};
  const incearca=async(nume,fn)=>{try{await fn()}catch(e){probleme[nume]=String(e&&e.message||e).slice(0,140)}};
  await incearca("funding",async()=>{const x=await j(`${FUT}/fapi/v1/premiumIndex?symbol=${symbol}`);funding=Number(x.lastFundingRate)});
  await incearca("openInterest",async()=>{const x=await j(`${FUT}/fapi/v1/openInterest?symbol=${symbol}`);openInterest=Number(x.openInterest)});
  await incearca("longShort",async()=>{const x=await j(`${FUT}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`);if(x?.length)longShort=Number(x[0].longShortRatio)});
  await incearca("oiHist5m",async()=>{oiHist5m=await j(`${FUT}/futures/data/openInterestHist?symbol=${symbol}&period=5m&limit=289`)});
  await incearca("fundingHist",async()=>{fundingHist=await j(`${FUT}/fapi/v1/fundingRate?symbol=${symbol}&limit=30`)});
  const raspuns={funding,openInterest,longShort,oiHist5m,fundingHist};
  if(Object.keys(probleme).length)raspuns.probleme=probleme;
  return ok(raspuns);
}