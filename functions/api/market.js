const FUT="https://fapi.binance.com";
const PIONEX="https://api.pionex.com";
const H={"content-type":"application/json;charset=UTF-8","cache-control":"no-store"};
const ok=x=>new Response(JSON.stringify(x),{headers:H});
const softFail=(error,detail)=>ok({result:false,error,detail});
async function j(url){
  const r=await fetch(url,{headers:{
    "accept":"application/json,text/plain,*/*",
    "accept-language":"en-US,en;q=0.9",
    "cache-control":"no-cache",
    "user-agent":"Mozilla/5.0 CryptoRadar/32"
  }});
  const text=await r.text();let data=null;try{data=JSON.parse(text)}catch{}
  if(!r.ok)throw Error("upstream HTTP "+r.status+(data?.msg?" · "+data.msg:""));
  if(!data)throw Error("upstream invalid JSON");
  return data
}
export async function onRequestGet({request}){
  const u=new URL(request.url),type=u.searchParams.get("type");
  if(type==="health")return ok({ok:true,service:"crypto-radar",version:"v32"});
  if(type==="pionex_symbols"){
    try{return ok(await j(`${PIONEX}/api/v1/common/symbols?type=SPOT`))}catch(e){return softFail("Pionex symbols unavailable",e.message)}
  }
  if(type==="pionex_tickers"){
    try{return ok(await j(`${PIONEX}/api/v1/market/tickers?type=SPOT`))}catch(e){return softFail("Pionex tickers unavailable",e.message)}
  }
  if(type==="pionex_klines"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,"");
    const pi=(u.searchParams.get("interval")||"4H").toUpperCase();
    const allowed=new Set(["1M","5M","15M","30M","60M","4H","8H","12H","1D"]);
    const interval=allowed.has(pi)?pi:"4H",limit=Math.min(500,Math.max(1,Number(u.searchParams.get("limit")||300)));
    try{return ok(await j(`${PIONEX}/api/v1/market/klines?symbol=${encodeURIComponent(ps)}&interval=${encodeURIComponent(interval)}&limit=${limit}`))}catch(e){return softFail("Pionex klines unavailable",e.message)}
  }
  if(type==="pionex_trades"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,""),limit=Math.min(500,Math.max(10,Number(u.searchParams.get("limit")||500)));
    try{return ok(await j(`${PIONEX}/api/v1/market/trades?symbol=${encodeURIComponent(ps)}&limit=${limit}`))}catch(e){return softFail("Pionex trades unavailable",e.message)}
  }
  if(type==="pionex_depth"){
    const ps=(u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,""),limit=Math.min(1000,Math.max(1,Number(u.searchParams.get("limit")||100)));
    try{return ok(await j(`${PIONEX}/api/v1/market/depth?symbol=${encodeURIComponent(ps)}&limit=${limit}`))}catch(e){return softFail("Pionex depth unavailable",e.message)}
  }
  if(type!=="futures")return new Response(JSON.stringify({error:"Spot data is fetched directly by the browser"}),{status:400,headers:H});
  const symbol=(u.searchParams.get("symbol")||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
  let funding=null,openInterest=null,longShort=null,oiHist5m=null,fundingHist=null;
  try{const x=await j(`${FUT}/fapi/v1/premiumIndex?symbol=${symbol}`);funding=Number(x.lastFundingRate)}catch{}
  try{const x=await j(`${FUT}/fapi/v1/openInterest?symbol=${symbol}`);openInterest=Number(x.openInterest)}catch{}
  try{const x=await j(`${FUT}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`);if(x?.length)longShort=Number(x[0].longShortRatio)}catch{}
  try{oiHist5m=await j(`${FUT}/futures/data/openInterestHist?symbol=${symbol}&period=5m&limit=289`)}catch{}
  try{fundingHist=await j(`${FUT}/fapi/v1/fundingRate?symbol=${symbol}&limit=30`)}catch{}
  return ok({funding,openInterest,longShort,oiHist5m,fundingHist});
}