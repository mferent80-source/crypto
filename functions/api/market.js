const SPOT=[
  "https://data-api.binance.vision/api/v3",
  "https://api.binance.com/api/v3",
  "https://api1.binance.com/api/v3",
  "https://api2.binance.com/api/v3",
  "https://api3.binance.com/api/v3"
];
const FUT="https://fapi.binance.com";
const headers={"content-type":"application/json;charset=UTF-8","cache-control":"public,max-age=5"};
const ok=x=>new Response(JSON.stringify(x),{headers});
const bad=(m,s=502)=>new Response(JSON.stringify({error:m}),{status:s,headers});
async function fetchJSON(url){
  const r=await fetch(url,{headers:{"accept":"application/json"}});
  const txt=await r.text();
  if(!r.ok) throw Error("upstream "+r.status);
  try{return JSON.parse(txt)}catch{throw Error("upstream invalid JSON")}
}
async function spot(path){
  let errors=[];
  for(const b of SPOT){
    try{return await fetchJSON(b+path)}
    catch(e){errors.push(b.replace(/^https?:\/\//,"")+": "+e.message)}
  }
  throw Error(errors.join(" | "));
}
function syntheticTicker(k){
  if(!Array.isArray(k)||k.length<2) throw Error("ticker fallback unavailable");
  const last=+k[k.length-1][4], first=+k[0][1];
  let quoteVolume=0;
  for(const x of k) quoteVolume+=+(x[7]||0);
  return {priceChangePercent:first?((last/first-1)*100).toFixed(4):"0",quoteVolume:String(quoteVolume),lastPrice:String(last),source:"klines-fallback"};
}
export async function onRequestGet({request}){
 try{
  const u=new URL(request.url);
  const type=u.searchParams.get("type");
  const symbol=(u.searchParams.get("symbol")||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(!symbol.endsWith("USDT"))return bad("Pereche invalidă",400);

  if(type==="klines"){
    const interval=u.searchParams.get("interval")||"4h";
    const allowed=["15m","1h","4h","1d"];
    if(!allowed.includes(interval))return bad("Interval invalid",400);
    const limit=Math.min(1000,Math.max(50,Number(u.searchParams.get("limit")||300)));
    return ok(await spot(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`));
  }

  if(type==="ticker"){
    try{return ok(await spot(`/ticker/24hr?symbol=${symbol}`))}
    catch{
      const k=await spot(`/klines?symbol=${symbol}&interval=1h&limit=24`);
      return ok(syntheticTicker(k));
    }
  }

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
