import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
const ENGINE_CONTRACT_VERSION="54.1";
const H={"content-type":"application/json","cache-control":"no-store"};
const TE="https://api.tradingeconomics.com";
const CM="https://community-api.coinmetrics.io/v4";
const CG="https://open-api-v4.coinglass.com";
const WA="https://leviathan.whale-alert.io";
const DERIBIT="https://www.deribit.com/api/v2";

const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const clean=(s,n=120)=>String(s??"").replace(/\s+/g," ").trim().slice(0,n);
const safeSymbol=s=>String(s||"BTC").toUpperCase().replace(/[^A-Z0-9._\-]/g,"").slice(0,24)||"BTC";
const baseCoin=s=>safeSymbol(s).replace(/[-_/]?(USDT|USDC|USD|PERP)$/,"")||"BTC";
const med=a=>{const x=a.filter(Number.isFinite).sort((a,b)=>a-b);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2};
const isoDate=t=>new Date(t).toISOString().slice(0,10);

async function getJson(url,opts={},ttl=60){
  const {cacheKey,...fetchOpts}=opts,cache=globalThis.caches?.default||null,headers={"accept":"application/json",...(fetchOpts.headers||{})},ck=new Request(cacheKey||url);
  if(cache){const hit=await cache.match(ck);if(hit){try{return await hit.json()}catch{}}}
  const r=await fetch(url,{...fetchOpts,headers,signal:AbortSignal.timeout(8000)});
  const raw=await r.text();let d=null;try{d=JSON.parse(raw)}catch{}
  if(!r.ok||d==null){
    const msg=d?.msg||d?.message||d?.error||raw.slice(0,180)||`HTTP ${r.status}`;
    throw Object.assign(Error(msg),{status:r.status})
  }
  if(cache&&r.ok){const res=new Response(JSON.stringify(d),{headers:{"content-type":"application/json","cache-control":`public,max-age=${ttl}`}});await cache.put(ck,res).catch(()=>{})}
  return d
}

// Paginarea: `next` vine de la furnizor. Se urmeaza DOAR pe gazda lui (cale relativa sau
// aceeasi origine). Altfel cheia (Whale Alert o pune in query) ar pleca la oricine.
function paginaUrmatoare(next,origine){
  if(!next||typeof next!=="string")return null;
  try{const u=new URL(next,origine);return u.origin===origine?u:null}catch{return null}
}

function teUtcMs(v){const s=String(v||"");if(!s)return NaN;return Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(s)?s:s+"Z")}
function teEvent(x){
  const ts=teUtcMs(x.Date||x.date||"");
  return {id:String(x.CalendarId||x.CalendarID||x.id||`${x.Country}|${x.Event}|${x.Date}`),ts:Number.isFinite(ts)?ts:null,country:clean(x.Country,50),category:clean(x.Category,90),event:clean(x.Event||x.Category,140),importance:+x.Importance||0,actual:clean(x.Actual,60),previous:clean(x.Previous,60),forecast:clean(x.Forecast,60),teForecast:clean(x.TEForecast,60),unit:clean(x.Unit,20),source:clean(x.Source,90),dateSpan:String(x.DateSpan??""),ticker:clean(x.Ticker||x.Symbol,40)}
}
async function economicCalendar(env,u){
  if(!env.TRADING_ECONOMICS_API_KEY)return {configured:false,available:false,provider:"TRADING_ECONOMICS",error:"TRADING_ECONOMICS_API_KEY not configured",items:[]};
  const days=clamp(+u.searchParams.get("days")||7,1,30),importance=clamp(+u.searchParams.get("importance")||2,1,3),country=clean(u.searchParams.get("country")||"united states",80)||"united states",now=Date.now(),start=isoDate(now-86400000),end=isoDate(now+days*86400000);
  try{
    const path=`${TE}/calendar/country/${encodeURIComponent(country)}/${start}/${end}`;
    const q=new URLSearchParams({c:env.TRADING_ECONOMICS_API_KEY,importance:String(importance),values:"true",f:"json"});
    const d=await getJson(`${path}?${q}`,{cacheKey:`${path}?importance=${importance}&values=true&f=json`},180),items=(Array.isArray(d)?d:[]).map(teEvent).filter(x=>x.ts).sort((a,b)=>a.ts-b.ts);
    return {configured:true,available:true,provider:"TRADING_ECONOMICS",country,start,end,importance,items,updatedAt:Date.now()}
  }catch(e){return {configured:true,available:false,provider:"TRADING_ECONOMICS",error:e.message,items:[],updatedAt:Date.now()}}
}

const CM_ASSET={BTC:"btc",ETH:"eth",SOL:"sol",XRP:"xrp",DOGE:"doge",ADA:"ada",LTC:"ltc",BCH:"bch",AVAX:"avax",LINK:"link",TRX:"trx"};
async function coinMetricsSeries(symbol,days=35){
  const asset=CM_ASSET[baseCoin(symbol)]||baseCoin(symbol).toLowerCase(),end=isoDate(Date.now()),start=isoDate(Date.now()-days*86400000);
  const sets=[
    ["PriceUSD","CapMrktCurUSD","AdrActCnt","TxCnt","FeeTotUSD","CapRealUSD","CapMVRVCur","HashRate"],
    ["PriceUSD","CapMrktCurUSD","AdrActCnt","TxCnt","FeeTotUSD"],
    ["PriceUSD","AdrActCnt","TxCnt"],
    ["PriceUSD","TxCnt"]
  ];
  let lastErr="";
  for(const metrics of sets){
    try{
      const base=new URL(`${CM}/timeseries/asset-metrics`);for(const [k,v] of Object.entries({assets:asset,metrics:metrics.join(","),start_time:start,end_time:end,frequency:"1d",page_size:"100"}))base.searchParams.set(k,v);
      let url=base.toString(),pages=0,all=[],complete=true,seen=new Set();
      while(url&&pages<12){
        const d=await getJson(url,{},300);pages++;for(const x of d.data||[]){const key=`${x.asset||asset}|${x.time||""}`;if(!seen.has(key)){seen.add(key);all.push(x)}}
        let next=d.next_page_url||d.nextPageUrl||d.next||null;
        if(!next){const token=d.next_page_token||d.nextPageToken||null;if(token){const u=new URL(base);u.searchParams.set("next_page_token",token);next=u.toString()}}
        const nu=paginaUrmatoare(next,"https://community-api.coinmetrics.io");if(nu)url=nu.toString();else{if(next)complete=false;url=""}
      }
      if(url)complete=false;
      const rows=all.map(x=>{const o={asset:x.asset,time:x.time};for(const m of metrics){const v=Number(x[m]);o[m]=Number.isFinite(v)?v:null}return o}).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
      if(rows.length)return {provider:"COIN_METRICS_COMMUNITY",asset,metrics,rows,pages,complete,requested:{start,end,days}}
    }catch(e){lastErr=e.message}
  }
  return {provider:"COIN_METRICS_COMMUNITY",asset,metrics:[],rows:[],complete:false,error:lastErr||"No community metrics returned"}
}
function change(rows,key,n=7){
  const a=rows.at(-1),b=rows[Math.max(0,rows.length-1-n)],x=a?.[key],y=b?.[key];return Number.isFinite(x)&&Number.isFinite(y)&&y!==0?100*(x/y-1):null
}
function ownerText(v){
  if(v==null)return "";if(typeof v==="string")return v.toLowerCase();if(Array.isArray(v))return v.map(ownerText).join(" ");if(typeof v==="object")return Object.values(v).map(ownerText).join(" ");return String(v).toLowerCase()
}
function exchangeish(v){const s=ownerText(v);return /exchange|binance|coinbase|kraken|okx|bybit|bitfinex|bitstamp|gemini|kucoin|gate\.?io|crypto\.com/.test(s)}
function waLegUsd(st,side,exchangeOnly=false){
  const px=Number(st.unit_price_usd||st.price_usd||0);if(!Number.isFinite(px)||px<=0)return 0;let total=0;
  for(const leg of st[side]||[]){if(exchangeOnly&&!exchangeish(leg))continue;const amount=Math.abs(Number(leg.amount||0));if(Number.isFinite(amount))total+=amount*px}return total
}
function waTxMetrics(tx){
  let totalIn=0,totalOut=0,inputExUsd=0,outputExUsd=0,inputEx=false,outputEx=false;
  for(const st of tx.sub_transactions||[]){const i=waLegUsd(st,"inputs"),o=waLegUsd(st,"outputs"),ie=waLegUsd(st,"inputs",true),oe=waLegUsd(st,"outputs",true);totalIn+=i;totalOut+=o;inputExUsd+=ie;outputExUsd+=oe;inputEx=inputEx||ie>0;outputEx=outputEx||oe>0}
  const valueUsd=Math.max(totalIn,totalOut),ambiguous=inputEx&&outputEx&&Math.abs(inputExUsd-outputExUsd)<Math.max(1,valueUsd*.05);let flow="WALLET_TRANSFER",exchangeFlowUsd=0;
  if(!inputEx&&outputEx){flow="EXCHANGE_INFLOW";exchangeFlowUsd=outputExUsd}else if(inputEx&&!outputEx){flow="EXCHANGE_OUTFLOW";exchangeFlowUsd=inputExUsd}else if(inputEx&&outputEx){flow=ambiguous?"EXCHANGE_TO_EXCHANGE":"EXCHANGE_TO_EXCHANGE";exchangeFlowUsd=Math.max(inputExUsd,outputExUsd)}
  if(!Number.isFinite(valueUsd)||valueUsd<=0)flow="UNKNOWN";
  return {valueUsd:Number.isFinite(valueUsd)?valueUsd:0,flow,exchangeFlowUsd,inputExchangeUsd:inputExUsd,outputExchangeUsd:outputExUsd,attributionAmbiguous:ambiguous}
}
async function whaleFlows(env,u){
  if(!env.WHALE_ALERT_API_KEY)return {configured:false,available:false,provider:"WHALE_ALERT",error:"WHALE_ALERT_API_KEY not configured",items:[]};
  const coin=baseCoin(u.searchParams.get("symbol")||"BTC"),map={BTC:"bitcoin",ETH:"ethereum",TRX:"tron",DOGE:"dogecoin",XRP:"ripple"},chain=map[coin];
  if(!chain)return {configured:true,available:false,provider:"WHALE_ALERT",error:`No Whale Alert chain mapping for ${coin}`,items:[]};
  const hours=clamp(+u.searchParams.get("hours")||24,1,72),minUsd=Math.max(100000,+u.searchParams.get("minUsd")||1000000),key=env.WHALE_ALERT_API_KEY,fromSec=Math.floor((Date.now()-hours*3600000)/1000);
  try{
    const hUrl=`${WA}/${chain}/height_at_time/${fromSec}?api_key=${encodeURIComponent(key)}`,h=await getJson(hUrl,{cacheKey:`${WA}/${chain}/height_at_time/${fromSec}`},60),startHeight=Number(h.height);if(!Number.isFinite(startHeight))throw Error("Whale Alert height lookup failed");
    const first=new URL(`${WA}/${chain}/transactions`);for(const [k,v] of Object.entries({start_height:String(startHeight),symbol:coin,limit:"100",order:"desc",api_key:key}))first.searchParams.set(k,v);
    let url=first.toString(),pages=0,complete=true,raw=[],seen=new Set();
    while(url&&pages<8){
      const cacheKey=url.replace(/([?&])api_key=[^&]*/,'$1api_key=REDACTED'),d=await getJson(url,{cacheKey},60);pages++;const batch=Array.isArray(d)?d:(d.transactions||d.data||[]);
      for(const tx of batch){const k=String(tx.hash||`${tx.height}|${tx.timestamp}|${raw.length}`);if(!seen.has(k)){seen.add(k);raw.push(tx)}}
      let next=!Array.isArray(d)?(d.next||d.next_url||d.nextUrl||null):null;const nu=paginaUrmatoare(next,"https://leviathan.whale-alert.io");if(nu){if(!nu.searchParams.has("api_key"))nu.searchParams.set("api_key",key);url=nu.toString()}else{if(next)complete=false;url=""}
    }
    if(url)complete=false;
    const items=raw.map(tx=>{const m=waTxMetrics(tx);return {hash:clean(tx.hash,100),height:+tx.height||null,ts:(+tx.timestamp||0)*1000,...m,text:clean(tx.text||"",220),transactionType:clean(tx.transaction_type||"",30)}}).filter(x=>x.ts>=fromSec*1000&&x.valueUsd>=minUsd).sort((a,b)=>b.ts-a.ts);
    const inflow=items.filter(x=>x.flow==="EXCHANGE_INFLOW").reduce((a,x)=>a+x.exchangeFlowUsd,0),outflow=items.filter(x=>x.flow==="EXCHANGE_OUTFLOW").reduce((a,x)=>a+x.exchangeFlowUsd,0),whaleTotal=items.reduce((a,x)=>a+x.valueUsd,0),ambiguous=items.filter(x=>x.attributionAmbiguous||x.flow==="UNKNOWN").length;
    return {configured:true,available:true,provider:"WHALE_ALERT",chain,coin,hours,minUsd,items:items.slice(0,120),pages,complete,rawTransactions:raw.length,ambiguous,inflowUsd:inflow,outflowUsd:outflow,netExchangeFlowUsd:inflow-outflow,totalUsd:whaleTotal,updatedAt:Date.now()}
  }catch(e){return {configured:true,available:false,provider:"WHALE_ALERT",error:e.message,items:[],complete:false,updatedAt:Date.now()}}
}
async function onchain(env,u){
  const cm=await coinMetricsSeries(u.searchParams.get("symbol")||"BTC",clamp(+u.searchParams.get("days")||35,14,120)),rows=cm.rows||[],latest=rows.at(-1)||null;
  const network={available:!!latest,provider:cm.provider,asset:cm.asset,metrics:cm.metrics,latest,change7d:{}};
  for(const k of cm.metrics||[])network.change7d[k]=change(rows,k,7);
  const whales=await whaleFlows(env,u);
  return {configured:true,available:network.available||whales.available,network,whales,updatedAt:Date.now()}
}

async function cgGet(env,path,params={},ttl=60){
  if(!env.COINGLASS_API_KEY)return {configured:false,available:false,provider:"COINGLASS",error:"COINGLASS_API_KEY not configured"};
  try{
    const q=new URLSearchParams(params),url=`${CG}${path}?${q}`,d=await getJson(url,{headers:{"CG-API-KEY":env.COINGLASS_API_KEY},cacheKey:url},ttl);
    if(String(d.code)!=="0"&&d.code!==0)throw Error(d.msg||`CoinGlass code ${d.code}`);
    return {configured:true,available:true,provider:"COINGLASS",data:d.data,updatedAt:Date.now()}
  }catch(e){return {configured:true,available:false,provider:"COINGLASS",error:e.message,updatedAt:Date.now()}}
}
async function liquidationMap(env,u){
  const symbol=safeSymbol(u.searchParams.get("symbol")||"BTCUSDT"),range=clean(u.searchParams.get("range")||"3d",8),x=await cgGet(env,"/api/futures/liquidation/heatmap/model2",{exchange:"Binance",symbol,range},45);
  if(!x.available)return {...x,symbol,range,planNote:"CoinGlass liquidation heatmap requires a Professional-or-higher plan"};
  const d=x.data||{},y=(d.y_axis||[]).map(Number),cells=(d.liquidation_leverage_data||[]).map(r=>({x:+r[0],y:+r[1],value:+r[2]})).filter(r=>Number.isFinite(r.y)&&Number.isFinite(r.value)&&y[r.y]!=null),prices=(d.price_candlesticks||[]).slice(-400);
  return {...x,symbol,range,yAxis:y,cells,priceCandlesticks:prices,model:"COINGLASS_HEATMAP_MODEL2"}
}
async function historicalCvd(env,u){
  const symbol=safeSymbol(u.searchParams.get("symbol")||"BTCUSDT"),days=clamp(+u.searchParams.get("days")||7,1,30),end=Date.now(),start=end-days*86400000,requested=clean(u.searchParams.get("interval")||"1h",8),ladder=[requested,"30m","4h"].filter((x,i,a)=>a.indexOf(x)===i);
  let x=null,interval=requested,attempts=[];
  for(const candidate of ladder){interval=candidate;x=await cgGet(env,"/api/spot/taker-buy-sell-volume/history",{exchange:"Binance",symbol,interval,limit:"1000",start_time:String(start),end_time:String(end)},120);attempts.push({interval,available:!!x.available,error:x.error||null});if(x.available)break}
  if(!x?.available)return {...(x||{}),symbol,days,interval,attempts};
  const raw=(Array.isArray(x.data)?x.data:[]).map(r=>({ts:+r.time,buy:Number(r.taker_buy_volume_usd)||0,sell:Number(r.taker_sell_volume_usd)||0})).filter(r=>Number.isFinite(r.ts)).sort((a,b)=>a.ts-b.ts),byTs=new Map();
  for(const r of raw){const prior=byTs.get(r.ts)||{ts:r.ts,buy:0,sell:0};prior.buy+=r.buy;prior.sell+=r.sell;byTs.set(r.ts,prior)}
  let cvd=0;const rows=[...byTs.values()].sort((a,b)=>a.ts-b.ts).map(r=>{const delta=r.buy-r.sell;cvd+=delta;return {...r,delta,cvd}});
  const hours={"1m":1/60,"3m":.05,"5m":1/12,"15m":.25,"30m":.5,"1h":1,"4h":4,"6h":6,"8h":8,"12h":12,"1d":24,"1w":168},barH=hours[interval]||1,barMs=barH*3600000,expected=Math.max(1,Math.floor((end-start)/barMs)),unique=rows.length,missingInternal=rows.slice(1).reduce((n,r,i)=>n+Math.max(0,Math.round((r.ts-rows[i].ts)/barMs)-1),0),startOk=!!rows.length&&rows[0].ts<=start+barMs*1.75,endOk=!!rows.length&&rows.at(-1).ts>=end-barMs*1.75,rowCoverage=Math.min(1,unique/expected),continuity=unique?Math.max(0,1-missingInternal/Math.max(1,unique+missingInternal)):0,coverage=Math.min(rowCoverage,continuity,startOk?1:.75,endOk?1:.75),buy=rows.reduce((a,r)=>a+r.buy,0),sell=rows.reduce((a,r)=>a+r.sell,0),windowState=coverage>=.95&&startOk&&endOk&&missingInternal<=Math.max(1,Math.floor(expected*.05))?"COMPLETE_WINDOW":coverage>=.75?"PARTIAL_WINDOW":"LOW_COVERAGE";
  return {...x,symbol,days,interval,requestedInterval:requested,attempts,rows,coverage,rowCoverage,continuity,expectedBars:expected,uniqueBars:unique,duplicateRows:Math.max(0,raw.length-unique),missingIntervals:missingInternal,startCovered:startOk,endCovered:endOk,totalBuyUsd:buy,totalSellUsd:sell,finalCvd:rows.at(-1)?.cvd??0,windowState}
}

function parseOptionName(name){
  const a=String(name||"").split("-"),type=a.at(-1),strike=Number(a.at(-2));return {type:type==="C"?"call":type==="P"?"put":null,strike:Number.isFinite(strike)?strike:null}
}
async function deribitOptions(u){
  const currency=baseCoin(u.searchParams.get("symbol")||"BTC"),allowed=["BTC","ETH","SOL","XRP","AVAX","TRX","HYPE"];
  if(!allowed.includes(currency))return {configured:true,available:false,provider:"DERIBIT_PUBLIC",currency,error:`No Deribit options integration for ${currency}`,updatedAt:Date.now()};
  const cur=currency;
  try{
    const [summ,inst]=await Promise.all([
      getJson(`${DERIBIT}/public/get_book_summary_by_currency?currency=${encodeURIComponent(cur)}&kind=option`,{},45),
      getJson(`${DERIBIT}/public/get_instruments?currency=${encodeURIComponent(cur)}&kind=option&expired=false`,{},300)
    ]);
    const instruments=inst.result||[],meta=new Map(instruments.map(x=>[x.instrument_name,x])),rows=(summ.result||[]).map(x=>{const m=meta.get(x.instrument_name)||{},p=parseOptionName(x.instrument_name);return {name:x.instrument_name,expiry:+m.expiration_timestamp||null,strike:Number(m.strike)||p.strike,type:m.option_type||p.type,oi:Number(x.open_interest)||0,markIv:Number(x.mark_iv),volumeUsd:Number(x.volume_usd)||0,underlying:Number(x.underlying_price)||Number(x.index_price)||null,markPrice:Number(x.mark_price)||null}}).filter(x=>x.expiry&&x.strike&&x.type);
    const underlying=med(rows.map(x=>x.underlying).filter(Number.isFinite)),groups={};for(const r of rows)(groups[r.expiry]??=[]).push(r);
    const expiries=Object.entries(groups).map(([k,a])=>{const exp=+k,atm=a.filter(x=>underlying&&Math.abs(x.strike/underlying-1)<=.05),putWing=a.filter(x=>underlying&&x.type==="put"&&x.strike/underlying>=.88&&x.strike/underlying<=.97),callWing=a.filter(x=>underlying&&x.type==="call"&&x.strike/underlying>=1.03&&x.strike/underlying<=1.12);return {expiry:exp,days:(exp-Date.now())/86400000,atmIv:med(atm.map(x=>x.markIv)),putWingIv:med(putWing.map(x=>x.markIv)),callWingIv:med(callWing.map(x=>x.markIv)),skewProxy:(()=>{const p=med(putWing.map(x=>x.markIv)),c=med(callWing.map(x=>x.markIv));return Number.isFinite(p)&&Number.isFinite(c)?p-c:null})(),callOi:a.filter(x=>x.type==="call").reduce((z,x)=>z+x.oi,0),putOi:a.filter(x=>x.type==="put").reduce((z,x)=>z+x.oi,0)}}).filter(x=>x.days>0).sort((a,b)=>a.expiry-b.expiry);
    const nearExp=expiries[0]?.expiry,near=nearExp?groups[nearExp]:[],strikes=[...new Set(near.map(x=>x.strike))].sort((a,b)=>a-b),payoffs=strikes.map(K=>{let loss=0;for(const o of near)loss+=o.oi*(o.type==="call"?Math.max(0,K-o.strike):Math.max(0,o.strike-K));return {strike:K,pain:loss}}).sort((a,b)=>a.pain-b.pain),maxPainProxy=payoffs[0]?.strike??null;
    const callOi=rows.filter(x=>x.type==="call").reduce((a,x)=>a+x.oi,0),putOi=rows.filter(x=>x.type==="put").reduce((a,x)=>a+x.oi,0),topStrikes=strikes.map(K=>({strike:K,oi:near.filter(x=>x.strike===K).reduce((a,x)=>a+x.oi,0)})).sort((a,b)=>b.oi-a.oi).slice(0,8);
    return {configured:true,available:true,provider:"DERIBIT_PUBLIC",currency:cur,underlying,contracts:rows.length,totalCallOi:callOi,totalPutOi:putOi,putCallOiRatio:callOi?putOi/callOi:null,nearestExpiry:nearExp||null,maxPainProxy,termStructure:expiries.slice(0,10),topStrikes,updatedAt:Date.now()}
  }catch(e){return {configured:true,available:false,provider:"DERIBIT_PUBLIC",currency:cur,error:e.message,updatedAt:Date.now()}}
}

export async function onRequestGet({request,env}){
  const u=new URL(request.url),action=u.searchParams.get("action")||"config";
  try{
    if(action==="config")return json({tradingEconomics:!!env.TRADING_ECONOMICS_API_KEY,coinMetrics:true,whaleAlert:!!env.WHALE_ALERT_API_KEY,coinglass:!!env.COINGLASS_API_KEY,deribit:true,authRequired:true,providers:{calendar:"TRADING_ECONOMICS",network:"COIN_METRICS_COMMUNITY",whales:"WHALE_ALERT",liquidationMap:"COINGLASS",options:"DERIBIT_PUBLIC",historicalCvd:"COINGLASS"}});
    const auth=await requireApiAuth(request,env,"external-intel",60);if(!auth.ok)return authErrorResponse(auth,H);
    if(action==="calendar")return json(await economicCalendar(env,u));
    if(action==="onchain")return json(await onchain(env,u));
    if(action==="liquidation_map")return json(await liquidationMap(env,u));
    if(action==="options")return json(await deribitOptions(u));
    if(action==="cvd")return json(await historicalCvd(env,u));
    return json({error:"Unsupported external-intel action"},400)
  }catch(e){return json({error:e.message},e.status&&e.status>=400?e.status:502)}
}
