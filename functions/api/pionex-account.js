import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
import {pionexPrivatGet} from "../_shared/pionex.js";
const H={"content-type":"application/json","cache-control":"no-store"};

const json=(x,status=200,antete={})=>new Response(JSON.stringify(x),{status,headers:{...H,...antete}});

function safeSymbol(u){
  return (u.searchParams.get("symbol")||"BTC_USDT").toUpperCase().replace(/[^A-Z0-9_]/g,"");
}
// v71: fereastra pe care o cere jurnalul din app.js (symbol, limit, startTime, endTime).
// startTime/endTime se trimit doar cand sunt date, altfel Pionex respinge fereastra goala.
function historyParams(u){
  const params={symbol:safeSymbol(u),limit:String(Math.min(100,Math.max(1,Number(u.searchParams.get("limit"))||100)))};
  for(const key of ["startTime","endTime"]){
    const v=Number(u.searchParams.get(key));
    if(Number.isFinite(v)&&v>0)params[key]=String(Math.floor(v));
  }
  return params;
}
// Ritmul si racirea la 429 stau in _shared/pionex.js: aceeasi cheie, aceeasi poarta
// pentru pionex-account, bot-orders si provider-health.
async function privateGet(env,path,params={}){
  const {r,data}=await pionexPrivatGet(env,path,params);
  if(!r.ok||!data?.result){
    const msg=data?.message||data?.code||`HTTP ${r.status}`;
    throw Object.assign(Error(`Pionex private API: ${msg}`),{status:r.status>=400?r.status:502});
  }
  return data;
}

export async function onRequestGet({request,env}){
  const auth=await requireApiAuth(request,env,"pionex-account",30);if(!auth.ok)return authErrorResponse(auth,H);
  const u=new URL(request.url),action=u.searchParams.get("action")||"status";
  const configured=!!(env.PIONEX_API_KEY&&env.PIONEX_API_SECRET);
  if(action==="status")return json({configured,readOnly:true,tradingExposed:false});
  if(!configured)return json({error:"Pionex read-only API is not configured. Add PIONEX_API_KEY and PIONEX_API_SECRET as Cloudflare secrets."},503);
  try{
    if(action==="balances")return json(await privateGet(env,"/api/v1/account/balances"));
    if(action==="openOrders")return json(await privateGet(env,"/api/v1/trade/openOrders",{symbol:safeSymbol(u)}));
    if(action==="fills")return json(await privateGet(env,"/api/v1/trade/fills",historyParams(u)));
    if(action==="orders")return json(await privateGet(env,"/api/v1/trade/allOrders",historyParams(u)));
    return json({error:"Unsupported read-only action"},400);
  }catch(e){
    const corp={error:e.message};
    if(e.retryAfter)corp.retryAfter=e.retryAfter;
    return json(corp,e.status||502,e.retryAfter?{"retry-after":String(e.retryAfter)}:{});
  }
}
