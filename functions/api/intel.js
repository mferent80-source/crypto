import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
const H={"content-type":"application/json","cache-control":"no-store"};
const TD="https://api.twelvedata.com";
const CG="https://api.coingecko.com/api/v3";
const MEMPOOL="https://mempool.space/api";
const GDELT="https://api.gdeltproject.org/api/v2/doc/doc";

const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
const safeSymbol=s=>String(s||"BTC").toUpperCase().replace(/[^A-Z0-9.\-]/g,"").slice(0,20)||"BTC";
const cleanText=(s,n=300)=>String(s||"").replace(/\s+/g," ").trim().slice(0,n);

async function getJson(url,opts={},ttl=60){
  const cache=globalThis.caches?.default||null,ck=new Request(url,{headers:opts.headers||{}});
  if(cache){
    const hit=await cache.match(ck);if(hit){try{return await hit.json()}catch{}}
  }
  const r=await fetch(url,{...opts,headers:{"accept":"application/json",...(opts.headers||{})}});
  const raw=await r.text();let d=null;try{d=JSON.parse(raw)}catch{}
  if(!r.ok||!d)throw Object.assign(Error(d?.message||d?.error||`HTTP ${r.status}`),{status:r.status});
  if(d.status==="error"||d.result===false)throw Object.assign(Error(d.message||d.error||"Provider error"),{status:Number(d.code)||502});
  if(cache){
    const res=new Response(JSON.stringify(d),{headers:{"content-type":"application/json","cache-control":`public,max-age=${ttl}`}});
    await cache.put(ck,res).catch(()=>{});
  }
  return d
}
function tdRows(node){
  return [...(node?.values||[])].map(x=>({date:x.datetime,close:Number(x.close),volume:Number(x.volume||0)})).filter(x=>Number.isFinite(x.close)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))
}
function ret(rows,n){
  if(!rows||rows.length<n+1)return null;const a=rows[rows.length-1-n]?.close,b=rows.at(-1)?.close;return a?100*(b/a-1):null
}
async function macroContext(env){
  if(!env.TWELVE_DATA_API_KEY)return {configured:false,provider:"TWELVE_DATA",error:"TWELVE_DATA_API_KEY not configured"};
  const symbols=["QQQ","SPY","IWM","TLT","GLD"],q=new URLSearchParams({symbol:symbols.join(","),interval:"1day",outputsize:"45",order:"asc",timezone:"UTC",prepost:"false"});
  const d=await getJson(`${TD}/time_series?${q}`,{headers:{"Authorization":`apikey ${env.TWELVE_DATA_API_KEY}`}},180);
  const series={};for(const sym of symbols){const node=d?.[sym]||d?.data?.[sym]||(symbols.length===1?d:null);series[sym]=tdRows(node)}
  const metrics={};for(const sym of symbols)metrics[sym]={r5:ret(series[sym],5),r20:ret(series[sym],20),last:series[sym].at(-1)?.close??null};
  const risk=[metrics.QQQ.r20,metrics.SPY.r20,metrics.IWM.r20].filter(Number.isFinite),def=[metrics.TLT.r20,metrics.GLD.r20].filter(Number.isFinite);
  const riskAvg=risk.length?risk.reduce((a,b)=>a+b,0)/risk.length:0,defAvg=def.length?def.reduce((a,b)=>a+b,0)/def.length:0,riskOnScore=Math.max(0,Math.min(100,50+riskAvg*4-defAvg*1.2));
  return {configured:true,provider:"TWELVE_DATA",metrics,riskOnScore,updatedAt:Date.now()}
}
async function cryptoGlobal(env){
  const headers={};if(env.COINGECKO_API_KEY)headers["x-cg-demo-api-key"]=env.COINGECKO_API_KEY;
  const d=await getJson(`${CG}/global`,{headers},90),g=d.data||{};
  return {provider:"COINGECKO",activeCryptocurrencies:g.active_cryptocurrencies??null,markets:g.markets??null,totalMarketCapUsd:g.total_market_cap?.usd??null,totalVolumeUsd:g.total_volume?.usd??null,btcDominance:g.market_cap_percentage?.btc??null,ethDominance:g.market_cap_percentage?.eth??null,marketCapChange24h:g.market_cap_change_percentage_24h_usd??null,volumeChange24h:g.volume_change_percentage_24h_usd??null,updatedAt:(g.updated_at||0)*1000||Date.now()}
}
async function btcNetwork(){
  const [mempool,fees,diff,hash]=await Promise.all([
    getJson(`${MEMPOOL}/mempool`,{},30),
    getJson(`${MEMPOOL}/v1/fees/recommended`,{},30),
    getJson(`${MEMPOOL}/v1/difficulty-adjustment`,{},120),
    getJson(`${MEMPOOL}/v1/mining/hashrate/1w`,{},300)
  ]);
  let currentHashrate=hash.currentHashrate??hash.current_hashrate??null;
  if(!Number.isFinite(Number(currentHashrate))&&Array.isArray(hash.hashrates)&&hash.hashrates.length)currentHashrate=hash.hashrates.at(-1)?.avgHashrate??hash.hashrates.at(-1)?.hashrate??null;
  return {provider:"MEMPOOL.SPACE",mempool:{count:mempool.count??null,vsize:mempool.vsize??null,totalFee:mempool.total_fee??null},fees,difficulty:{progressPercent:diff.progressPercent??diff.progress_percent??null,difficultyChange:diff.difficultyChange??diff.difficulty_change??null,estimatedRetargetDate:diff.estimatedRetargetDate??diff.estimated_retarget_date??null},hashrate:Number(currentHashrate)||null,updatedAt:Date.now()}
}
function cryptoQuery(symbol){
  const map={BTC:"bitcoin",ETH:"ethereum",SOL:"solana",XRP:"ripple",DOGE:"dogecoin",BNB:"binance coin",ADA:"cardano",AVAX:"avalanche",LINK:"chainlink",SUI:"sui"};
  const c=safeSymbol(symbol).replace(/USDT$/,"");return map[c]?`("${map[c]}" OR "${c}") cryptocurrency`:`"${c}" cryptocurrency`;
}
async function gdeltNews(query){
  const q=new URLSearchParams({query,mode:"ArtList",maxrecords:"12",format:"json",sort:"HybridRel",timespan:"3d"});
  const d=await getJson(`${GDELT}?${q}`,{},120),arts=d.articles||[];
  return arts.slice(0,12).map(x=>({title:cleanText(x.title,220),url:String(x.url||"").slice(0,1000),datetime:x.seendate||x.datetime||null,domain:x.domain||"",sourceCountry:x.sourcecountry||"",source:"GDELT"}))
}
async function stockNews(env,symbol){
  if(env.TWELVE_DATA_API_KEY){
    try{
      const q=new URLSearchParams({symbol:safeSymbol(symbol),outputsize:"10",page:"1",language:"en"});
      const d=await getJson(`${TD}/press_releases?${q}`,{headers:{"Authorization":`apikey ${env.TWELVE_DATA_API_KEY}`}},180);
      const rows=(d.press_releases||[]).slice(0,10).map(x=>({title:cleanText(x.title,220),url:"",datetime:x.datetime||null,domain:"Official release",source:"TWELVE_DATA_PRESS_RELEASES"}));
      if(rows.length)return {source:"TWELVE_DATA_PRESS_RELEASES",items:rows}
    }catch{}
  }
  const items=await gdeltNews(`"${safeSymbol(symbol)}" stock`);
  return {source:"GDELT",items}
}

export async function onRequestGet({request,env}){
  const u=new URL(request.url),action=u.searchParams.get("action")||"config";
  try{
    if(action==="config")return json({coingeckoKey:!!env.COINGECKO_API_KEY,twelveData:!!env.TWELVE_DATA_API_KEY,btcNetwork:true,news:true,authRequired:true});
    const auth=await requireApiAuth(request,env,"intel",60);if(!auth.ok)return authErrorResponse(auth,H);
    if(action==="crypto_global")return json(await cryptoGlobal(env));
    if(action==="btc_network")return json(await btcNetwork());
    if(action==="macro")return json(await macroContext(env));
    if(action==="news"){
      const market=(u.searchParams.get("market")||"CRYPTO").toUpperCase(),symbol=safeSymbol(u.searchParams.get("symbol")||"BTC");
      if(market==="STOCKS")return json(await stockNews(env,symbol));
      const items=await gdeltNews(cryptoQuery(symbol));return json({source:"GDELT",items});
    }
    return json({error:"Unsupported intel action"},400)
  }catch(e){return json({error:e.message},e.status&&e.status>=400?e.status:502)}
}
