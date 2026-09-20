const SPOT=["https://api.binance.com/api/v3","https://api1.binance.com/api/v3","https://api2.binance.com/api/v3","https://api3.binance.com/api/v3"];
const FUT="https://fapi.binance.com";
const ok=(x)=>new Response(JSON.stringify(x),{headers:{"content-type":"application/json;charset=UTF-8","cache-control":"public,max-age=5"}});
const bad=(m,s=502)=>new Response(JSON.stringify({error:m}),{status:s,headers:{"content-type":"application/json;charset=UTF-8"}});
async function fetchJSON(url){let r=await fetch(url,{headers:{"user-agent":"CryptoRadar/1.0"}});if(!r.ok)throw Error("upstream "+r.status);return r.json()}
async function spot(path){let last;for(const b of SPOT){try{return await fetchJSON(b+path)}catch(e){last=e}}throw last||Error("spot unavailable")}
export async function onRequestGet({request}){
 try{
  const u=new URL(request.url),type=u.searchParams.get("type"),symbol=(u.searchParams.get("symbol")||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(!symbol.endsWith("USDT"))return bad("Pereche invalidă",400);
  if(type==="klines"){const interval=u.searchParams.get("interval")||"4h",allowed=["15m","1h","4h","1d"];if(!allowed.includes(interval))return bad("Interval invalid",400);const limit=Math.min(1000,Math.max(50,Number(u.searchParams.get("limit")||300)));return ok(await spot(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`))}
  if(type==="ticker")return ok(await spot(`/ticker/24hr?symbol=${symbol}`));
  if(type==="futures"){
    let funding=null,openInterest=null,longShort=null;
    try{let x=await fetchJSON(`${FUT}/fapi/v1/premiumIndex?symbol=${symbol}`);funding=Number(x.lastFundingRate)}catch{}
    try{let x=await fetchJSON(`${FUT}/fapi/v1/openInterest?symbol=${symbol}`);openInterest=Number(x.openInterest)}catch{}
    try{let x=await fetchJSON(`${FUT}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`);if(x?.length)longShort=Number(x[0].longShortRatio)}catch{}
    return ok({funding,openInterest,longShort});
  }
  return bad("Tip necunoscut",400);
 }catch(e){return bad(e.message||"Eroare server")}
}