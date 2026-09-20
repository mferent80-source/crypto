const FUT="https://fapi.binance.com";
const H={"content-type":"application/json;charset=UTF-8","cache-control":"no-store"};
const ok=x=>new Response(JSON.stringify(x),{headers:H});
async function j(url){const r=await fetch(url,{headers:{"accept":"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return r.json()}
export async function onRequestGet({request}){
  const u=new URL(request.url),type=u.searchParams.get("type");
  if(type==="health")return ok({ok:true,service:"crypto-radar",version:"v13"});
  if(type!=="futures")return new Response(JSON.stringify({error:"Spot data is fetched directly by the browser"}),{status:400,headers:H});
  const symbol=(u.searchParams.get("symbol")||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
  let funding=null,openInterest=null,longShort=null;
  try{const x=await j(`${FUT}/fapi/v1/premiumIndex?symbol=${symbol}`);funding=Number(x.lastFundingRate)}catch{}
  try{const x=await j(`${FUT}/fapi/v1/openInterest?symbol=${symbol}`);openInterest=Number(x.openInterest)}catch{}
  try{const x=await j(`${FUT}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`);if(x?.length)longShort=Number(x[0].longShortRatio)}catch{}
  return ok({funding,openInterest,longShort});
}