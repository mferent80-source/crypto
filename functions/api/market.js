import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
const ENGINE_CONTRACT_VERSION="54.1";
const FUT="https://fapi.binance.com";
const PIONEX="https://api.pionex.com";
let pionexGate=Promise.resolve(),pionexNextAt=0,pionexBlockedUntil=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function reservePionexGlobal(env,spacing){
  if(!env?.DB?.prepare)return 0;try{const now=Date.now(),stmt=env.DB.prepare(`INSERT INTO monitor_state(key,value,updated_ts) VALUES('pionex_pages_next_at',?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(MAX(CAST(monitor_state.value AS INTEGER), ?)+? AS TEXT), updated_ts=? RETURNING value`).bind(String(now+spacing),now,now,spacing,now),r=await stmt.first(),next=Number(r?.value);return Number.isFinite(next)?Math.max(0,(next-spacing)-now):0}catch{return 0}
}
async function pionexRateGate(weight,fn,env){
  const run=pionexGate.then(async()=>{
    const blocked=Math.max(0,pionexBlockedUntil-Date.now());
    if(blocked){const e=Error("upstream cooldown "+Math.ceil(blocked/1000)+"s");e.status=429;e.retryAfter=Math.ceil(blocked/1000);throw e}
    const spacing=Math.max(1100,Math.max(1,weight)*300),globalDelay=await reservePionexGlobal(env,spacing),delay=Math.max(globalDelay,Math.max(0,pionexNextAt-Date.now()));
    if(delay)await wait(delay);
    pionexNextAt=Date.now()+spacing;
    return fn()
  });
  pionexGate=run.catch(()=>{});
  return run
}

const H={"content-type":"application/json;charset=UTF-8","cache-control":"no-store"};
const ok=x=>new Response(JSON.stringify(x),{headers:H});
const softFail=(error,detail,retryAfter=null)=>ok({result:false,error,detail,retryAfter});
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
    e.status=r.status;e.retryAfter=retry?Number(retry):null;throw e
  }
  if(!data)throw Error("upstream invalid JSON");
  return data
}

async function pionexCached(url,ttl=30,env=null){
  const cache=(globalThis.caches&&globalThis.caches.default)||null;
  const key=new Request(url,{method:"GET"});
  if(cache){
    const hit=await cache.match(key);
    if(hit){try{return await hit.json()}catch{}}
  }
  let data;
  try{data=await pionexRateGate(url.includes("/common/symbols")?5:1,()=>j(url),env)}
  catch(e){if(e.status===429){pionexBlockedUntil=Math.max(pionexBlockedUntil,Date.now()+Math.max(75000,(e.retryAfter||60)*1000))}throw e}
  if(cache){
    const res=new Response(JSON.stringify(data),{headers:{"content-type":"application/json","cache-control":`public, max-age=${ttl}`}});
    await cache.put(key,res).catch(()=>{})
  }
  return data
}
export async function onRequestGet({request,env}){
  const u=new URL(request.url),type=u.searchParams.get("type");
  if(type==="health")return ok({ok:true,service:"crypto-radar",version:"v56"});
  if(String(type||"").startsWith("pionex_")){const auth=await requireApiAuth(request,env,"pionex-public-proxy",45);if(!auth.ok)return authErrorResponse(auth,H)}
  if(type==="pionex_symbols"){
    const mk=String(u.searchParams.get("market")||"").toUpperCase()==="PERP"?"PERP":"SPOT";
    try{return ok(await pionexCached(`${PIONEX}/api/v1/common/symbols?type=${mk}`,3600,env))}catch(e){return softFail("Pionex symbols unavailable",e.message,e.status===429?(e.retryAfter||60):null)}
  }
  if(type==="pionex_tickers"){
    const mk=String(u.searchParams.get("market")||"").toUpperCase()==="PERP"?"PERP":"SPOT";
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/tickers?type=${mk}`,30,env))}catch(e){return softFail("Pionex tickers unavailable",e.message,e.status===429?(e.retryAfter||60):null)}
  }
  if(type==="pionex_klines"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,"");
    const pi=(u.searchParams.get("interval")||"4H").toUpperCase();
    const allowed=new Set(["1M","5M","15M","30M","60M","4H","8H","12H","1D"]);
    const interval=allowed.has(pi)?pi:"4H",limit=limita(u,300,1,500);
    // v78: endTime (ms) pentru paginarea in urma a lumanarilor; trimis doar cand e numar pozitiv.
    const etRaw=u.searchParams.get("endTime"),et=Math.floor(Number(etRaw));
    const endQ=etRaw&&Number.isFinite(et)&&et>0?`&endTime=${et}`:"";
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/klines?symbol=${encodeURIComponent(ps)}&interval=${encodeURIComponent(interval)}&limit=${limit}${endQ}`,interval==="15M"?45:interval==="60M"?90:interval==="4H"?180:300,env))}catch(e){return softFail("Pionex klines unavailable",e.message,e.status===429?(e.retryAfter||60):null)}
  }
  if(type==="pionex_trades"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,""),limit=limita(u,500,10,500);
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/trades?symbol=${encodeURIComponent(ps)}&limit=${limit}`,5,env))}catch(e){return softFail("Pionex trades unavailable",e.message,e.status===429?(e.retryAfter||60):null)}
  }
  if(type==="pionex_depth"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,""),limit=limita(u,100,1,1000);
    try{return ok(await pionexCached(`${PIONEX}/api/v1/market/depth?symbol=${encodeURIComponent(ps)}&limit=${limit}`,5,env))}catch(e){return softFail("Pionex depth unavailable",e.message,e.status===429?(e.retryAfter||60):null)}
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