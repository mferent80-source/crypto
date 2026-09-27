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
// v96.1: fara cheia Twelve Data, preturile vin de la Yahoo (aceeasi sursa ca Trading 212 / Scan): acelasi format de
// raspuns, ca analiza actiunilor sa mearga. 4h nu exista la Yahoo -> se face din barele de 1 ora (4 cate 4, pe zi).
const YCACHE=new Map();
function yDin(k){const x=YCACHE.get(k);if(x&&x.exp>Date.now())return x.v;YCACHE.delete(k);return null}
function yIn(k,v,ttl){if(YCACHE.size>400)YCACHE.clear();YCACHE.set(k,{v,exp:Date.now()+ttl*1000})}
async function yahooChart(symbol,interval,range){
  const k=symbol+"|"+interval+"|"+range,c=yDin(k);if(c)return c;
  const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,{headers:{"user-agent":"Mozilla/5.0",accept:"application/json"},signal:AbortSignal.timeout(10000)});
  if(r.status===429)throw Object.assign(new Error("Yahoo a limitat cererile de prețuri"),{status:429});
  let j=null;try{j=await r.json()}catch{}
  const res=j&&j.chart&&Array.isArray(j.chart.result)?j.chart.result[0]:null;
  if(!r.ok||!res)throw Object.assign(new Error((j&&j.chart&&j.chart.error&&j.chart.error.description)||"Yahoo: HTTP "+r.status),{status:r.status===404?404:502});
  yIn(k,res,interval==="1d"?600:60);return res
}
function nyZi(ms){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York"}).format(new Date(ms))}
async function yahooRows(symbol,tf,limit){
  const iv=tf==="15m"?"15m":tf==="1h"||tf==="4h"?"60m":"1d",range=tf==="15m"?"60d":tf==="1h"?(limit>700?"730d":"1y"):tf==="4h"?"730d":(limit>480?"5y":"2y");
  const res=await yahooChart(symbol,iv,range),q=(res.indicators&&res.indicators.quote&&res.indicators.quote[0])||{},ts=res.timestamp||[];
  let rows=[];
  ts.forEach((t,i)=>{const o=q.open&&q.open[i],h=q.high&&q.high[i],l=q.low&&q.low[i],c=q.close&&q.close[i],v=q.volume&&q.volume[i];
    if(![o,h,l,c].every(x=>typeof x==="number"&&x>0))return;
    const ms=iv==="1d"?nyCloseUtcMs(nyZi(t*1000)):t*1000,vol=typeof v==="number"?v:null;
    rows.push([ms,String(o),String(h),String(l),String(c),vol===null?null:String(vol),ms+1,vol===null?null:String(vol*c),new Date(ms).toISOString()])});
  if(tf==="4h"){
    const g=[];let cur=null,n=0,zi="";
    for(const r of rows){const z=nyZi(r[0]);if(!cur||z!==zi||n>=4){if(cur)g.push(cur);cur=r.slice();zi=z;n=1;continue}
      cur[2]=String(Math.max(+cur[2],+r[2]));cur[3]=String(Math.min(+cur[3],+r[3]));cur[4]=r[4];cur[5]=cur[5]===null||r[5]===null?null:String(+cur[5]+ +r[5]);cur[7]=cur[5]===null?null:String(+cur[5]*+cur[4]);n++}
    if(cur)g.push(cur);rows=g}
  // ultima bara de azi e in formare -> se pastreaza (ca la Twelve Data), analiza stie sa o trateze
  const norm=splitLikeDiscontinuity(rows.slice(-limit),tf);
  return {rows:norm.rows,meta:{symbol,interval:tf,exchange:res.meta&&res.meta.exchangeName||null,currency:res.meta&&res.meta.currency||"USD"},guard:{guarded:norm.guarded,breaks:norm.breaks,warning:norm.warning||null,method:tf==="1d"?"Yahoo daily":"intraday discontinuity guard"}}
}
async function yahooQuote(symbol){
  const res=await yahooChart(symbol,"1d","5d"),m=res.meta||{},q=(res.indicators&&res.indicators.quote&&res.indicators.quote[0])||{},n=(res.timestamp||[]).length-1;
  const pc=m.chartPreviousClose??m.previousClose,prev=n>=1&&q.close&&q.close[n-1]>0?q.close[n-1]:pc;
  return normalizeQuote({symbol,close:m.regularMarketPrice,previous_close:prev,volume:m.regularMarketVolume??(q.volume&&q.volume[n]),open:q.open&&q.open[n],high:m.regularMarketDayHigh??(q.high&&q.high[n]),low:m.regularMarketDayLow??(q.low&&q.low[n]),
    exchange:m.exchangeName,currency:m.currency||"USD",timestamp:m.regularMarketTime,is_market_open:m.currentTradingPeriod&&m.currentTradingPeriod.regular?Date.now()/1000>=m.currentTradingPeriod.regular.start&&Date.now()/1000<m.currentTradingPeriod.regular.end:null},symbol)
}
async function faraCheie(action,u){
  if(action==="quote"){const symbol=safeSymbol(u.searchParams.get("symbol"));return json({provider:"YAHOO",quote:await yahooQuote(symbol)})}
  if(action==="series"){
    const symbol=safeSymbol(u.searchParams.get("symbol")),tf=(u.searchParams.get("tf")||"1d").toLowerCase(),limit=Math.min(1000,Math.max(100,Number(u.searchParams.get("limit")||300)));
    const y=await yahooRows(symbol,tf,limit);return json({provider:"YAHOO",symbol,tf,meta:y.meta,rows:y.rows,corporateActionGuard:y.guard})
  }
  if(action==="batch_series"){
    const symbols=(u.searchParams.get("symbols")||"").split(",").map(safeSymbol).filter(Boolean).slice(0,20),tf=(u.searchParams.get("tf")||"1d").toLowerCase(),limit=Math.min(500,Math.max(60,Number(u.searchParams.get("limit")||260)));
    if(!symbols.length)return json({error:"No stock symbols supplied"},400);
    const data={};
    for(const symbol of symbols){try{const y=await yahooRows(symbol,tf,limit);data[symbol]={meta:y.meta,rows:y.rows,corporateActionGuard:y.guard}}catch(e){data[symbol]={error:e.message,rows:[]}}}
    return json({provider:"YAHOO",tf,data})
  }
  return json({error:"Pentru "+action+" trebuie cheia Twelve Data (TWELVE_DATA_API_KEY); fără ea merg doar prețurile și graficele (Yahoo)."},503)
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
    // v96.1: "configured" = are de unde lua preturi; fara cheie, Yahoo (provider spune care)
    return json({configured:true,provider:env.TWELVE_DATA_API_KEY?"TWELVE_DATA":"YAHOO",serverSideKey:true,ndxSnapshotDate:NDX_SNAPSHOT_DATE,ndxCount:NDX_COUNT,authRequired:true});
  }
  const auth=await requireApiAuth(request,env,"stocks",60);if(!auth.ok)return authErrorResponse(auth,H);
  if(!env.TWELVE_DATA_API_KEY){try{return await faraCheie(action,u)}catch(e){return json({error:e.message,provider:"YAHOO"},e.status===429?429:e.status===404?404:502)}}

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
