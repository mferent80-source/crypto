import {dupaCelDinFata} from "../_shared/poarta.js";
import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
const TD="https://api.twelvedata.com";
const H={"content-type":"application/json","cache-control":"no-store"};
const NDX_SNAPSHOT_DATE="2026-09-18";
const NDX_COUNT=101;

const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
let tdGate=Promise.resolve(),tdNextAt=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function tdRateGate(fn){
  // v91.7: aceeasi coada globala ca la Pionex - nu astepta la nesfarsit dupa o cerere abandonata (_shared/poarta.js)
  const run=dupaCelDinFata(tdGate,15000).then(async()=>{
    const delay=Math.max(0,tdNextAt-Date.now());
    if(delay)await wait(delay);
    tdNextAt=Date.now()+300;
    return fn();
  });
  tdGate=run.catch(()=>{});
  return run;
}
const safeSymbol=s=>(s||"AAPL").toUpperCase().replace(/[^A-Z0-9.\-]/g,"").slice(0,15)||"AAPL";
const tfMap=tf=>({"15m":"15min","1h":"1h","4h":"4h","1d":"1day"})[tf]||"1day";

function nthSunday(year,month,n){const first=new Date(Date.UTC(year,month-1,1)),dow=first.getUTCDay(),day=1+((7-dow)%7)+(n-1)*7;return day}
function nyCloseUtcMs(dateOnly){
  const [y,m,d]=String(dateOnly).split("-").map(Number);if(!y||!m||!d)return 0;const key=y*10000+m*100+d,mar= y*10000+3*100+nthSunday(y,3,2),nov=y*10000+11*100+nthSunday(y,11,1),dst=key>=mar&&key<nov;return Date.UTC(y,m-1,d,dst?20:21,0,0)
}
function dateMs(v,tf){
  if(!v)return 0;
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return nyCloseUtcMs(v);
  const z=v.includes("T")?v:v.replace(" ","T");return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(z)?z:z+"Z")||0
}
function splitLikeDiscontinuity(rows,tf){
  if(tf==="1d"||!rows?.length)return {rows,guarded:false,breaks:[]};const breaks=[];
  for(let i=1;i<rows.length;i++){const pc=+rows[i-1][4],o=+rows[i][1],c=+rows[i][4];if(!(pc>0&&o>0&&c>0))continue;const gap=Math.abs(o/pc-1),inside=Math.abs(c/o-1);if(gap>=.28&&inside<=.18)breaks.push({index:i,ts:rows[i][0],previousClose:pc,open:o,gapPct:(o/pc-1)*100})}
  if(!breaks.length)return {rows,guarded:false,breaks:[]};const last=breaks.at(-1),trimmed=rows.slice(last.index);return {rows:trimmed,guarded:true,breaks,warning:`Potential split/corporate-action discontinuity detected; history truncated after ${new Date(last.ts).toISOString()}`}
}
function normalizeRows(node,tf){
  const values=node?.values||[],rows=[...values].map(x=>{const ts=dateMs(x.datetime,tf),o=Number(x.open),h=Number(x.high),l=Number(x.low),c=Number(x.close),v=x.volume===null||x.volume===undefined||String(x.volume).trim()===""||!Number.isFinite(Number(x.volume))?null:Number(x.volume);return [ts,String(o),String(h),String(l),String(c),v===null?null:String(v),ts+1,v===null?null:String(v*c),x.datetime||""]}).filter(x=>Number.isFinite(+x[1])&&Number.isFinite(+x[4])&&x[0]>0).sort((a,b)=>a[0]-b[0]);return splitLikeDiscontinuity(rows,tf)
}
function tdError(data,status=502){
  if(data?.status==="error"||data?.code>=400){
    const e=new Error(data?.message||`Twelve Data error ${data?.code||status}`);
    e.status=Number(data?.code)||status;throw e
  }
}
async function cachedTd(env,endpoint,params={},ttl=30){
  const key=env.TWELVE_DATA_API_KEY;
  if(!key)throw Object.assign(new Error("TWELVE_DATA_API_KEY is not configured"),{status:503});
  const q=new URLSearchParams(params),publicUrl=`${TD}${endpoint}?${q.toString()}`,cache=(globalThis.caches&&globalThis.caches.default)||null,ck=new Request(publicUrl);
  if(cache){
    const hit=await cache.match(ck);
    if(hit){try{return await hit.json()}catch{}}
  }
  const r=await tdRateGate(()=>fetch(publicUrl,{headers:{"accept":"application/json","Authorization":`apikey ${key}`},signal:AbortSignal.timeout(8000)}));
  const raw=await r.text();let data=null;try{data=JSON.parse(raw)}catch{}
  if(!r.ok){
    const e=Object.assign(new Error(data?.message||`Twelve Data HTTP ${r.status}`),{status:r.status});throw e
  }
  if(!data)throw Object.assign(new Error("Twelve Data returned invalid JSON"),{status:502});
  tdError(data,502);
  if(cache){
    const res=new Response(JSON.stringify(data),{headers:{"content-type":"application/json","cache-control":`public,max-age=${ttl}`}});
    await cache.put(ck,res).catch(()=>{})
  }
  return data
}
function normalizeQuote(d,symbol){
  // Pretul LIPSA ramane null: "0" ar arata ca un pret real (si ar da o variatie de -100%).
  const nr=v=>v===null||v===undefined||String(v).trim()===""||!Number.isFinite(Number(v))?null:Number(v);
  const close=nr(d.close)??nr(d.price),prev=nr(d.previous_close)??nr(d.previousClose),pct=nr(d.percent_change)??nr(d.change_percent)??(close!==null&&prev?((close/prev)-1)*100:null),volume=nr(d.volume);
  const rawTs=Number(d.timestamp||0),timestamp=rawTs>1e12?rawTs:rawTs>1e9?rawTs*1000:dateMs(d.datetime||"", "1d");
  return {
    symbol:safeSymbol(d.symbol||symbol),lastPrice:close===null?null:String(close),priceChangePercent:pct===null?null:String(pct),
    quoteVolume:close===null||volume===null?null:String(close*volume),volume:volume===null?null:String(volume),open:String(d.open??""),highPrice:String(d.high??""),lowPrice:String(d.low??""),
    previousClose:String(d.previous_close??""),exchange:d.exchange||d.mic_code||"",currency:d.currency||"USD",
    isMarketOpen:typeof d.is_market_open==="boolean"?d.is_market_open:null,datetime:d.datetime||"",timestamp
  }
}
function batchNodes(data,symbols){
  if(data?.values)return {[symbols[0]]:data};
  const out={};
  for(const s of symbols){
    const n=data?.[s]||data?.data?.[s]||data?.[s.toUpperCase()];
    if(n)out[s]=n
  }
  return out
}

export async function onRequestGet({request,env}){
  const u=new URL(request.url),action=u.searchParams.get("action")||"config";
  if(action==="config"){
    return json({configured:!!env.TWELVE_DATA_API_KEY,provider:"TWELVE_DATA",serverSideKey:true,ndxSnapshotDate:NDX_SNAPSHOT_DATE,ndxCount:NDX_COUNT,authRequired:true});
  }
  const auth=await requireApiAuth(request,env,"stocks",60);if(!auth.ok)return authErrorResponse(auth,H);
  if(!env.TWELVE_DATA_API_KEY)return json({error:"TWELVE_DATA_API_KEY is not configured in Cloudflare"},503);

  try{
    if(action==="quote"){
      const symbol=safeSymbol(u.searchParams.get("symbol"));
      const d=await cachedTd(env,"/quote",{symbol,interval:"1day",prepost:"false"},15);
      return json({provider:"TWELVE_DATA",quote:normalizeQuote(d,symbol)});
    }

    if(action==="series"){
      const symbol=safeSymbol(u.searchParams.get("symbol")),tf=(u.searchParams.get("tf")||"1d").toLowerCase(),interval=tfMap(tf),limit=Math.min(1000,Math.max(100,Number(u.searchParams.get("limit")||300)));
      const params={symbol,interval,outputsize:String(limit),order:"asc",timezone:"UTC",prepost:"false"};if(tf==="1d")params.adjust="splits";
      const d=await cachedTd(env,"/time_series",params,tf==="15m"?20:tf==="1h"?40:tf==="4h"?90:180),norm=normalizeRows(d,tf);
      return json({provider:"TWELVE_DATA",symbol,tf,meta:d.meta||null,rows:norm.rows,corporateActionGuard:{guarded:norm.guarded,breaks:norm.breaks,warning:norm.warning||null,method:tf==="1d"?"provider split-adjusted daily":"intraday discontinuity guard"}});
    }

    if(action==="batch_series"){
      const symbols=(u.searchParams.get("symbols")||"").split(",").map(safeSymbol).filter(Boolean).slice(0,20),tf=(u.searchParams.get("tf")||"1d").toLowerCase(),interval=tfMap(tf),limit=Math.min(500,Math.max(60,Number(u.searchParams.get("limit")||260)));
      if(!symbols.length)return json({error:"No stock symbols supplied"},400);
      const params={symbol:symbols.join(","),interval,outputsize:String(limit),order:"asc",timezone:"UTC",prepost:"false"};if(tf==="1d")params.adjust="splits";
      const d=await cachedTd(env,"/time_series",params,180),nodes=batchNodes(d,symbols),data={};
      for(const symbol of symbols){
        const n=nodes[symbol];if(n?.status==="error"||n?.code>=400){data[symbol]={error:n.message||"Provider error",rows:[]};continue}
        const norm=normalizeRows(n,tf);data[symbol]={meta:n?.meta||null,rows:norm.rows,corporateActionGuard:{guarded:norm.guarded,breaks:norm.breaks,warning:norm.warning||null,method:tf==="1d"?"provider split-adjusted daily":"intraday discontinuity guard"}}
      }
      return json({provider:"TWELVE_DATA",tf,data});
    }

    if(action==="earnings"){
      const symbol=safeSymbol(u.searchParams.get("symbol")),now=new Date(),start=now.toISOString().slice(0,10),endDate=new Date(now.getTime()+30*86400000),end=endDate.toISOString().slice(0,10);
      const q=await cachedTd(env,"/quote",{symbol,interval:"1day",prepost:"false"},300),exchange=q.exchange||undefined;
      const params={start_date:start,end_date:end,country:"United States"};if(exchange)params.exchange=exchange;
      const d=await cachedTd(env,"/earnings_calendar",params,21600),emap=d.earnings||{},dates=Object.keys(emap).sort();let next=null;
      for(const date of dates){const row=(emap[date]||[]).find(x=>safeSymbol(x.symbol)===symbol);if(row){next={date,...row};break}}
      return json({provider:"TWELVE_DATA",symbol,exchange:exchange||null,window:{start,end},next,note:next?null:"No earnings event for this symbol was returned in the next 30-day calendar window."});
    }

    if(action==="search"){
      const symbol=safeSymbol(u.searchParams.get("symbol"));
      const d=await cachedTd(env,"/symbol_search",{symbol,outputsize:"20",show_plan:"true"},3600);
      return json({provider:"TWELVE_DATA",data:d.data||[]});
    }

    return json({error:"Unsupported stocks action"},400);
  }catch(e){
    const status=e.status===429?429:e.status===401||e.status===403?e.status:502;
    return json({error:e.message,provider:"TWELVE_DATA"},status);
  }
}
